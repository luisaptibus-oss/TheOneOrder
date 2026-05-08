import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());

  // --- BLINDAGEM MIDDLEWARE ---
  app.use((req, res, next) => {
    // Forçar cabeçalhos de segurança e bloqueio de robots
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    // res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // --- API IOT & LOGÍSTICA ---
  
  // Endpoint para IoT Sensors (HTTP Hook)
  app.post('/api/iot/sensor-data', (req, res) => {
    const { mac, value, type, assetId } = req.body;
    console.log(`[IOT] Leitura recebida de ${mac} (${type}): ${value} para Asset: ${assetId}`);
    // Em produção aqui usaríamos firebase-admin para gravar em /assets/{assetId}/sensors/{mac}/readings
    res.status(202).json({ status: 'ACCEPTED', timestamp: new Date().toISOString() });
  });

  // Endpoint para Scanner de Barras (Receção MP)
  app.post('/api/scan', (req, res) => {
    const { barcode, assetId, userId } = req.body;
    console.log(`[SCAN] Recebido: ${barcode} por ${userId} em ${assetId}`);
    res.json({ status: 'LOGGED', lot: `LOT-${Math.random().toString(36).substring(7).toUpperCase()}` });
  });

  // --- INTEGRAÇÃO VITE (Frontend) ---
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const fs = await import('fs');
      const templatePath = path.resolve(__dirname, 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.listen(port, () => {
    console.log(`🚀 THE ONE ORDER :: Command Center a correr em http://localhost:${port}`);
  });
}

startServer();
