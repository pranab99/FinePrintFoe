import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText } from 'unpdf';
import { calculateRiskReport } from './src/engine/scoreContract.ts';
import {
  analyzeContractWithGemini,
  AnalyzerError,
} from './src/server/geminiAnalyzer.ts';
import type { UserRole } from './src/types/contract.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const VALID_ROLES = new Set<UserRole>([
  'consumer',
  'freelancer',
  'tenant',
  'business',
]);

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/extract-pdf', async (req, res) => {
    try {
      const { dataBase64, filename } = req.body ?? {};
      if (typeof dataBase64 !== 'string' || dataBase64.length === 0) {
        res.status(400).json({ error: 'Missing PDF file payload.' });
        return;
      }

      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.byteLength === 0 || buffer.byteLength > 10 * 1024 * 1024) {
        res.status(400).json({
          error: 'PDF file must be non-empty and under 10 MB.',
        });
        return;
      }

      const result = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });

      const extracted = (result.text ?? '').trim();
      if (!extracted) {
        res.status(422).json({
          error: `No selectable text could be extracted from "${filename || 'PDF'}". If it is a scanned image PDF, please paste the text directly.`,
        });
        return;
      }

      res.json({
        text: extracted,
        totalPages: result.totalPages ?? 1,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to parse PDF file.';
      res.status(422).json({
        error: `Could not extract text from PDF: ${message}`,
      });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const { text, role } = req.body ?? {};
      if (typeof text !== 'string') {
        res.status(400).json({ error: 'Contract text is required.' });
        return;
      }

      const trimmedText = text.trim();
      if (trimmedText.length < 30) {
        res.status(400).json({
          error:
            'Please provide at least 30 characters of contract or terms text to analyze.',
        });
        return;
      }

      if (trimmedText.length > 120000) {
        res.status(400).json({
          error:
            'Document exceeds the 120,000-character limit. Please paste the relevant agreement sections.',
        });
        return;
      }

      const selectedRole: UserRole = VALID_ROLES.has(role) ? role : 'consumer';

      const analysis = await analyzeContractWithGemini(
        trimmedText,
        selectedRole
      );
      const report = calculateRiskReport(analysis.evaluations, selectedRole);

      res.json({ analysis, report });
    } catch (err) {
      if (err instanceof AnalyzerError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Unexpected server error.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinePrintFoe server listening on http://localhost:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start FinePrintFoe server:', err);
  process.exit(1);
});
