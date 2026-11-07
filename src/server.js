// HTTP server: JSON API plus the static browser page. Built-in modules only.
//   GET  /api/plan      the current plan
//   POST /api/adjust    {partnerId, item, kg}  (kg null clears the adjustment)
//   POST /api/settings  {type:"conversion", item, unit, factor} or {type:"expiry", recordId, date}

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRepository } from './repository.js';
import { buildPlan } from './allocate.js';
import { ValidationError } from './model.js';

const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MAX_BODY_BYTES = 64 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

function sendJson(res, status, body, headers = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-store', ...headers });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'request body is too large');
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'request body must be valid JSON');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'request body must be a JSON object');
  return body;
}

function requireMethod(req, method) {
  if (req.method !== method) throw new HttpError(405, `use ${method} for this path`, { Allow: method });
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'use GET for this path', { Allow: 'GET, HEAD' });
  let relative;
  try {
    relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    throw new HttpError(400, 'bad path');
  }
  const file = path.join(PUBLIC_DIR, relative);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) throw new HttpError(404, 'not found');
  let content;
  try {
    content = await readFile(file);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EISDIR') throw new HttpError(404, 'not found');
    throw err;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': content.length });
  res.end(req.method === 'HEAD' ? undefined : content);
}

export function createServer(repo = createRepository()) {
  const currentPlan = () => buildPlan(repo.snapshot());

  async function route(req, res) {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname === '/api/plan') {
      requireMethod(req, 'GET');
      return sendJson(res, 200, currentPlan());
    }
    if (pathname === '/api/adjust') {
      requireMethod(req, 'POST');
      const { partnerId, item, kg } = await readJson(req);
      if (typeof partnerId !== 'string' || typeof item !== 'string') throw new ValidationError('partnerId and item must be text');
      if (kg !== null && typeof kg !== 'number') throw new ValidationError('kg must be a number, or null to clear the adjustment');
      repo.setAdjustment(partnerId, item, kg);
      return sendJson(res, 200, currentPlan());
    }
    if (pathname === '/api/settings') {
      requireMethod(req, 'POST');
      const body = await readJson(req);
      if (body.type === 'conversion') repo.setConversion(body.item, body.unit, body.factor);
      else if (body.type === 'expiry') repo.setExpiry(body.recordId, body.date);
      else throw new ValidationError('type must be "conversion" or "expiry"');
      return sendJson(res, 200, currentPlan());
    }
    if (pathname.startsWith('/api/')) throw new HttpError(404, 'unknown API path');
    return serveStatic(req, res, pathname);
  }

  return http.createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (err) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message }, err.headers);
      if (err instanceof ValidationError) return sendJson(res, 400, { error: err.message });
      console.error('Unexpected error:', err);
      return sendJson(res, 500, { error: 'internal error' });
    }
  });
}

function startFromEnvironment() {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`PORT must be a whole number from 0 to 65535, got "${process.env.PORT}"`);
    process.exit(1);
  }
  const server = createServer();
  server.on('error', (err) => {
    console.error(`Could not start the server: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, () => console.log(`PantryShare running at http://localhost:${server.address().port}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startFromEnvironment();
