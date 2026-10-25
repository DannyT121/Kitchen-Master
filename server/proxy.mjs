// Minimal Kitchen Master AI proxy. Keeps your Anthropic API key on the server.
// Run:  ANTHROPIC_API_KEY=sk-ant-... node server/proxy.mjs   (Node 18+)
// Then set EXPO_PUBLIC_PROXY_URL=http://<your-computer-LAN-IP>:8787 in the app's .env
import http from 'node:http';

const PORT = process.env.PORT || 8787;
const KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_MODELS = (process.env.ALLOWED_MODELS || 'claude-sonnet-5-5,claude-haiku-5-5').split(',');
const MAX_BODY = 8 * 1024 * 1024; // 8 MB, enough for one compressed photo

if (!KEY) {
  console.error('Set ANTHROPIC_API_KEY before starting the proxy.');
  process.exit(1);
}

const send = (res, status, obj) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(obj));
};

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'POST' || req.url !== '/v1/messages') return send(res, 404, { error: 'Not found' });

    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) return send(res, 413, { error: 'Request too large' });
      chunks.push(chunk);
    }

    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(res, 400, { error: 'Invalid JSON' });
    }
    if (!ALLOWED_MODELS.includes(body.model)) return send(res, 400, { error: 'Model not allowed' });
    body.max_tokens = Math.min(Number(body.max_tokens) || 4096, 4096);

    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
      });
      send(res, upstream.status, await upstream.json());
    } catch (e) {
      send(res, 502, { error: 'Upstream request failed' });
    }
  })
  .listen(PORT, () => console.log(`Kitchen Master proxy listening on http://0.0.0.0:${PORT}`));
