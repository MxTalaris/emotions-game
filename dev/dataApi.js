const fs = require('fs');
const path = require('path');

const ALLOWED = {
  'event-templates': 'event-templates.json',
  'emotions-catalog': 'emotions-catalog.json',
  'personalities-catalog': 'personalities-catalog.json',
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

/**
 * Mounts GET/PUT /api/data/:name for whitelisted JSON files under src/data/.
 * @param {import('express').Application} app
 */
function mountDataApi(app) {
  const dataDir = path.join(__dirname, '..', 'src', 'data');

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
      const body = await readRequestBody(req);
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
}

module.exports = { mountDataApi, ALLOWED };
