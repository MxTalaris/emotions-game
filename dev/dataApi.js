const fs = require('fs');
const path = require('path');

const ALLOWED = {
  'event-templates': 'event-templates.json',
  'emotions-catalog': 'emotions-catalog.json',
  'personalities-catalog': 'personalities-catalog.json',
  'sounds-catalog': 'sounds-catalog.json',
  'themes-catalog': 'themes-catalog.json',
};

const ALLOWED_IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const ALLOWED_AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a']);

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function safeId(value, fallback = 'file') {
  return String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Mounts GET/PUT /api/data/:name, POST /api/upload/card, POST /api/upload/audio.
 * Also serves /storage/* from the project storage folder.
 * @param {import('express').Application} app
 */
function mountDataApi(app) {
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const storageDir = path.join(__dirname, '..', 'storage');
  const cardsDir = path.join(storageDir, 'cards');
  const audioDir = path.join(storageDir, 'audio');
  const themesDir = path.join(storageDir, 'themes');

  fs.mkdirSync(cardsDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });
  fs.mkdirSync(themesDir, { recursive: true });

  app.use('/storage', (req, res, next) => {
    const rel = decodeURIComponent(req.path).replace(/^\/+/, '');
    if (!rel || rel.includes('..')) {
      res.statusCode = 400;
      res.end('Bad path');
      return;
    }
    const filePath = path.join(storageDir, rel);
    if (!filePath.startsWith(storageDir)) {
      res.statusCode = 400;
      res.end('Bad path');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
      };
      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(data);
    });
  });

  app.get('/api/data/:name', (req, res) => {
    const fileName = ALLOWED[req.params.name];
    if (!fileName) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Unknown resource: ${req.params.name}` }));
      return;
    }

    const filePath = path.join(dataDir, fileName);
    fs.readFile(filePath, 'utf8', (err, raw) => {
      if (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(raw);
    });
  });

  app.put('/api/data/:name', async (req, res) => {
    const fileName = ALLOWED[req.params.name];
    if (!fileName) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Unknown resource: ${req.params.name}` }));
      return;
    }

    try {
      const body = (await readRequestBody(req)).toString('utf8');
      const parsed = JSON.parse(body);
      const pretty = `${JSON.stringify(parsed, null, 2)}\n`;
      const filePath = path.join(dataDir, fileName);
      fs.writeFileSync(filePath, pretty, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  });

  app.post('/api/upload/card', async (req, res) => {
    try {
      const body = JSON.parse((await readRequestBody(req)).toString('utf8'));
      const cardId = safeId(body.cardId, 'card');
      const filename = String(body.filename || 'image.png');
      const ext = path.extname(filename).toLowerCase() || '.png';
      if (!ALLOWED_IMAGE_EXT.has(ext)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Unsupported image type: ${ext}` }));
        return;
      }
      const base64 = String(body.contentBase64 || '');
      const raw = base64.includes(',')
        ? base64.slice(base64.indexOf(',') + 1)
        : base64;
      const buffer = Buffer.from(raw, 'base64');
      if (!buffer.length) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Empty image data' }));
        return;
      }

      const outName = `${cardId}-${Date.now()}${ext}`;
      const outPath = path.join(cardsDir, outName);
      fs.writeFileSync(outPath, buffer);
      const urlPath = `/storage/cards/${outName}`;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, path: urlPath }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  });

  app.post('/api/upload/audio', async (req, res) => {
    try {
      const body = JSON.parse((await readRequestBody(req)).toString('utf8'));
      const actionId = safeId(body.actionId, 'sfx');
      const filename = String(body.filename || 'sound.mp3');
      const ext = path.extname(filename).toLowerCase() || '.mp3';
      if (!ALLOWED_AUDIO_EXT.has(ext)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Unsupported audio type: ${ext}` }));
        return;
      }
      const base64 = String(body.contentBase64 || '');
      const raw = base64.includes(',')
        ? base64.slice(base64.indexOf(',') + 1)
        : base64;
      const buffer = Buffer.from(raw, 'base64');
      if (!buffer.length) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Empty audio data' }));
        return;
      }

      const outName = `${actionId}-${Date.now()}${ext}`;
      const outPath = path.join(audioDir, outName);
      fs.writeFileSync(outPath, buffer);
      const urlPath = `/storage/audio/${outName}`;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, path: urlPath }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  });

  app.post('/api/upload/theme-bg', async (req, res) => {
    try {
      const body = JSON.parse((await readRequestBody(req)).toString('utf8'));
      const themeAlias = safeId(body.themeAlias, 'theme');
      const filename = String(body.filename || 'background.png');
      const ext = path.extname(filename).toLowerCase() || '.png';
      if (!ALLOWED_IMAGE_EXT.has(ext)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: `Unsupported image type: ${ext}` }));
        return;
      }
      const base64 = String(body.contentBase64 || '');
      const raw = base64.includes(',')
        ? base64.slice(base64.indexOf(',') + 1)
        : base64;
      const buffer = Buffer.from(raw, 'base64');
      if (!buffer.length) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Empty image data' }));
        return;
      }

      const outName = `${themeAlias}-${Date.now()}${ext}`;
      const outPath = path.join(themesDir, outName);
      fs.writeFileSync(outPath, buffer);
      const urlPath = `/storage/themes/${outName}`;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, path: urlPath }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  });
}

module.exports = { mountDataApi, ALLOWED };
