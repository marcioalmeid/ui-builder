import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalogDir = join(__dirname, '..', 'public', 'catalog');
const port = Number(process.env.MOCK_API_PORT ?? 3001);

/** REST routes backed by static JSON in public/catalog */
const routes = {
  '/api/health': null,
  '/api/users': 'users.json',
  '/api/task-types': 'task-types.json',
  '/api/platforms': 'platforms.json',
  '/api/request-types': 'request-types.json',
  '/api/vendors': 'vendors.json',
  '/api/budget-line-items': 'budget-line-items.json',
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, '');
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const path = req.url?.split('?')[0] ?? '';

  if (path === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'ui-builder-mock-api' });
    return;
  }

  const fileName = routes[path];
  if (!fileName) {
    sendJson(res, 404, {
      error: 'Not found',
      hint: 'Available: ' + Object.keys(routes).filter((k) => k !== '/api/health').join(', '),
    });
    return;
  }

  try {
    const data = await readFile(join(catalogDir, fileName), 'utf8');
    sendJson(res, 200, data);
  } catch (err) {
    sendJson(res, 500, {
      error: 'Failed to read catalog file',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${port} is already in use.`);
    console.log('If mock-api is already running, you can ignore this and use ng serve.');
    console.log(`Check: curl http://localhost:${port}/api/health`);
    process.exit(0);
  }

  console.error(err);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Mock API running at http://localhost:${port}`);
  console.log('Example: GET /api/request-types');
});
