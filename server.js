/* ============================================================
   EcoPro — serwer aplikacji „Ewidencja Czasu Pracy”
   Zero zewnętrznych zależności — tylko wbudowane moduły Node.js.
   Uruchomienie:  node server.js
   (opcjonalnie z inną wartością portu:  PORT=8080 node server.js)

   Jak to działa:
   - Serwuje pliki strony z folderu ./public
   - Udostępnia proste API pod /api/data/<klucz>, które zapisuje
     i odczytuje dane jako pliki JSON w folderze ./data
   - Klucz z dwukropkami (np. "app:month:2026-09") zamieniany jest
     na ścieżkę folderów, więc dane miesięczne trafiają do osobnych
     plików: data/app/month/2026-09.json, data/app/month/2026-10.json itd.
   - Nic nigdy nie jest automatycznie usuwane ani nadpisywane poza
     tym, o co poprosi aplikacja (czyli dane pracowników, godzin i
     kont zostają na zawsze — jedynie dziennik zdarzeń jest z góry
     ograniczany przez samą aplikację do 500 najnowszych wpisów).
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

/* Zamienia klucz logiczny (np. "app:month:2026-09") na ścieżkę pliku
   na dysku: data/app/month/2026-09.json. Każdy segment jest
   oczyszczany, żeby nie dało się wyjść poza folder data/. */
function keyToFilePath(key) {
  const parts = String(key)
    .split(':')
    .map(p => p.replace(/[^a-zA-Z0-9_-]/g, '_'))
    .filter(Boolean);
  if (parts.length === 0) parts.push('_');
  const fileName = parts[parts.length - 1] + '.json';
  const dir = path.join(DATA_DIR, ...parts.slice(0, -1));
  return { dir, filePath: path.join(dir, fileName) };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  const safePathname = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePathname);

  // Zabezpieczenie przed wyjściem poza folder public/
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // nieznana ścieżka -> zwróć index.html (prosta obsługa SPA)
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data2);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsed.pathname || '/');

  /* ---------------- API danych ---------------- */
  if (pathname.startsWith('/api/data/')) {
    const key = pathname.slice('/api/data/'.length);
    if (!key) return sendJson(res, 400, { error: 'missing_key' });
    const { dir, filePath } = keyToFilePath(key);

    if (req.method === 'GET') {
      fs.readFile(filePath, 'utf8', (err, raw) => {
        if (err) {
          if (err.code === 'ENOENT') return sendJson(res, 404, { error: 'not_found' });
          console.error(err);
          return sendJson(res, 500, { error: 'read_failed' });
        }
        try {
          const value = JSON.parse(raw);
          sendJson(res, 200, { key, value });
        } catch (e) {
          sendJson(res, 500, { error: 'corrupt_file' });
        }
      });
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      let tooBig = false;
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) { // limit 10MB na wpis
          tooBig = true;
          req.destroy();
        }
      });
      req.on('end', () => {
        if (tooBig) return;
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          return sendJson(res, 400, { error: 'invalid_json' });
        }
        if (!parsedBody || parsedBody.value === undefined) {
          return sendJson(res, 400, { error: 'missing_value' });
        }
        fs.mkdir(dir, { recursive: true }, err => {
          if (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'mkdir_failed' });
          }
          // zapis do pliku tymczasowego i podmiana — bezpieczniejsze niż
          // zapis bezpośredni, na wypadek przerwania procesu w trakcie
          const tmpPath = filePath + '.tmp';
          fs.writeFile(tmpPath, JSON.stringify(parsedBody.value, null, 2), 'utf8', err2 => {
            if (err2) {
              console.error(err2);
              return sendJson(res, 500, { error: 'write_failed' });
            }
            fs.rename(tmpPath, filePath, err3 => {
              if (err3) {
                console.error(err3);
                return sendJson(res, 500, { error: 'write_failed' });
              }
              sendJson(res, 200, { ok: true, key });
            });
          });
        });
      });
      return;
    }

    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  /* ---------------- pliki statyczne strony ---------------- */
  if (req.method === 'GET') {
    serveStatic(req, res, pathname);
  } else {
    res.writeHead(405);
    res.end('Method not allowed');
  }
});

fs.mkdirSync(DATA_DIR, { recursive: true });

server.listen(PORT, () => {
  console.log(`EcoPro RCP działa pod adresem: http://localhost:${PORT}`);
  console.log(`Dane zapisywane są w folderze: ${DATA_DIR}`);
});
