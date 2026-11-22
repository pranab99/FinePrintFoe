import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { ruleset } from '../engine/scoreContract.ts';
import type { GeminiContractAnalysis, UserRole } from '../types/contract.ts';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detected_doc_type: {
      type: Type.STRING,
      enum: [
        'saas_terms',
        'lease_agreement',
        'freelance_contract',
        'insurance_policy',
        'general_terms',
      ],
    },
    plain_summary: {
      type: Type.STRING,
      description:
        '3-sentence plain-English summary of what the user is actually agreeing to.',
    },
    evaluations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rule_id: {
            type: Type.STRING,
            enum: [
              'R01_AUTO_RENEW_LOCK',
              'R02_ONE_SIDED_PRICE_HIKE',
              'R03_NO_REFUND_LOCKIN',
              'R04_ASYMMETRIC_LIABILITY',
              'R05_SWEEPING_IP_GRAB',
              'R06_SOLE_DISCRETION',
              'R07_FORCED_ARBITRATION_VENUE',
              'R08_MISSING_EXIT_OR_PAYMENT',
            ],
          },
          triggered: { type: Type.BOOLEAN },
          confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
          },
          extracted_metrics: {
            type: Type.STRING,
            description:
              "Concrete numbers or terms extracted, e.g., '60-day notice, 12-month renewal' or 'None'.",
          },
          exact_quote: {
            type: Type.STRING,
            description:
              "Verbatim quote from the text proving the trigger, or 'MISSING_CLAUSE' for R08.",
          },
          deviation_explanation: {
            type: Type.STRING,
            description:
              "One concise sentence comparing the document clause against the rule's fair_baseline.",
          },
          pushback_question: {
            type: Type.STRING,
            description:
              'Actionable negotiation question or redline request to send before signing.',
          },
        },
        required: [
          'rule_id',
          'triggered',
          'confidence',
          'extracted_metrics',
          'exact_quote',
          'deviation_explanation',
          'pushback_question',
        ],
      },
    },
  },
  required: ['detected_doc_type', 'plain_summary', 'evaluations'],
};

const SYSTEM_INSTRUCTION = `You are a strict contract auditor. Compare the submitted document ONLY against the provided ruleset definitions. Do NOT invent scores. For each rule, return triggered (boolean), confidence (high/medium/low), extracted_metrics, verbatim exact_quote from the text (or 'MISSING_CLAUSE' for R08), deviation_explanation, and an actionable pushback_question.

Audit discipline:
1. Evaluate all 8 rules (R01 through R08) and return one evaluation entry per rule_id.
2. Only set triggered=true if the document text actually violates the flaw_trigger (or omits required exit/payment terms for R08). If the document is silent on an irrelevant topic (e.g., an apartment lease has no software IP clause), set triggered=false for R05.
3. For exact_quote when triggered=true, copy an exact verbatim substring from the submitted document (or 'MISSING_CLAUSE' if R08 is triggered due to omission). When triggered=false, set exact_quote to "" and extracted_metrics to "None".
4. Keep plain_summary to 3 clear, plain-English sentences explaining what the user is actually agreeing to.
5. Keep deviation_explanation to one concise sentence comparing the document clause against the rule's fair_baseline.
6. Write pushback_question as a polite, specific redline request or question the user can send before signing.`;

export class AnalyzerError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AnalyzerError';
    this.statusCode = statusCode;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AnalyzerError(
      'GEMINI_API_KEY is not configured. Please set a valid Gemini API key in Settings > Secrets.',
      503
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('429') ||
    message.includes('503') ||
    message.includes('500') ||
    message.includes('UNAVAILABLE') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function extractReadableErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Not raw JSON
  }
  return raw;
}

export async function analyzeContractWithGemini(
  documentText: string,
  role: UserRole
): Promise<GeminiContractAnalysis> {
  const ai = getGeminiClient();

  const rulesSummary = ruleset.rules.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    fair_baseline: r.fair_baseline,
    flaw_trigger: r.flaw_trigger,
  }));

  const userPrompt = `User Perspective / Role: ${role}

Baseline Ruleset (${ruleset.name} v${ruleset.version}):
${JSON.stringify(rulesSummary, null, 2)}

Submitted Contract / Terms Text:
"""
${documentText}
"""`;

  const modelAttempts: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: PRIMARY_MODEL, thinkingLevel: ThinkingLevel.LOW },
    { model: FALLBACK_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastError: unknown;

  for (let idx = 0; idx < modelAttempts.length; idx++) {
    const { model, thinkingLevel } = modelAttempts[idx];
    const startedAt = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel,
          },
          abortSignal: AbortSignal.timeout(60000),
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new AnalyzerError(
          'Gemini returned an empty response while analyzing the document.',
          502
        );
      }

      const parsed = JSON.parse(rawText) as GeminiContractAnalysis;
      if (
        !parsed ||
        !parsed.detected_doc_type ||
        !parsed.plain_summary ||
        !Array.isArray(parsed.evaluations)
      ) {
        throw new AnalyzerError(
          'Structured contract evaluation response was malformed.',
          502
        );
      }

      return parsed;
    } catch (err) {
      lastError = err;
      const elapsed = Date.now() - startedAt;
      const readable = extractReadableErrorMessage(err);

      if (err instanceof AnalyzerError) {
        throw err;
      }

      if (
        readable.includes('API_KEY_INVALID') ||
        readable.includes('PERMISSION_DENIED') ||
        readable.includes('403') ||
        readable.includes('401')
      ) {
        throw new AnalyzerError(
          'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.',
          403
        );
      }

      const isTimeout =
        (err instanceof Error &&
          (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
        readable.toLowerCase().includes('aborted') ||
        readable.toLowerCase().includes('timed out');

      if (idx < modelAttempts.length - 1 && (isRetryableError(err) || isTimeout)) {
        console.warn(
          `[FinePrintFoe] Model ${model} unavailable after ${elapsed}ms (${readable}); falling back to ${modelAttempts[idx + 1].model}.`
        );
        continue;
      }

      console.error(
        `[FinePrintFoe] Model ${model} failed after ${elapsed}ms:`,
        readable
      );

      if (isTimeout) {
        throw new AnalyzerError(
          'The contract analysis request timed out. Please try again in a moment.',
          504
        );
      }

      break;
    }
  }

  throw new AnalyzerError(
    `Contract analysis unavailable: ${extractReadableErrorMessage(lastError)}`,
    502
  );
}
