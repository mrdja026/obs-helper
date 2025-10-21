// dev-https-proxy.js
const fs = require('fs');
const https = require('https');
const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');

// Adjust if your Expo Web port is different:
const TARGET = 'http://localhost:8081';
// Backend API target (proxy will route /api/* here)
// Prefer explicit IPv4 to avoid localhost (::1) vs 127.0.0.1 mismatches
const BACKEND = process.env.BACKEND || 'http://127.0.0.1:3001';
const HTTPS_PORT = 8443;
const OAUTH_REDIRECT_PATH = '/oauthredirect';

// Resolve cert/key paths flexibly: supports CERT_DIR env, local and parent dirs, and "@dev-certs"
const CERT_DIR = process.env.CERT_DIR || '';
const candidateDirs = [
  CERT_DIR && path.isAbsolute(CERT_DIR) ? CERT_DIR : null,
  CERT_DIR && !path.isAbsolute(CERT_DIR)
    ? path.join(__dirname, CERT_DIR)
    : null,
  path.join(__dirname, 'dev-certs'),
  path.join(__dirname, '@dev-certs'),
  path.join(__dirname, '..', 'dev-certs'),
  path.join(__dirname, '..', '@dev-certs'),
].filter(Boolean);

function resolveCertPath(fileName) {
  for (const dir of candidateDirs) {
    const full = path.join(dir, fileName);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const CERT_FILE_ENV = process.env.CERT_CERT_FILE; // e.g. 'localhost+2.pem'
const KEY_FILE_ENV = process.env.CERT_KEY_FILE; // e.g. 'localhost+2-key.pem'

function findFirstByPredicate(predicate) {
  for (const dir of candidateDirs) {
    try {
      const entries = fs.readdirSync(dir);
      const match = entries.find((name) => predicate(name));
      if (match) return path.join(dir, match);
    } catch {}
  }
  return null;
}

let certPath = CERT_FILE_ENV
  ? resolveCertPath(CERT_FILE_ENV)
  : resolveCertPath('127.0.0.1.pem');
let keyPath = KEY_FILE_ENV
  ? resolveCertPath(KEY_FILE_ENV)
  : resolveCertPath('127.0.0.1-key.pem');

// Fallback: scan for a likely mkcert pair
if (!certPath) {
  certPath = findFirstByPredicate(
    (n) => n.endsWith('.pem') && !n.includes('-key')
  );
}
if (!keyPath) {
  keyPath = findFirstByPredicate((n) => n.endsWith('-key.pem'));
}

if (!certPath || !keyPath) {
  console.error(
    'Could not find cert or key. Tried directories:',
    candidateDirs
  );
  throw new Error('Missing TLS cert files (127.0.0.1.pem / 127.0.0.1-key.pem)');
}

const cert = fs.readFileSync(certPath);
const key = fs.readFileSync(keyPath);

const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: true,
});

https
  .createServer({ key, cert }, (req, res) => {
    // Serve a lightweight /oauthredirect handler to post the code back to opener
    if (req.url && req.url.startsWith(OAUTH_REDIRECT_PATH)) {
      const backendBase = process.env.PROXY_BASE_URL || BACKEND;
      const html = [
        '<!doctype html><html><body style="background:#121212;color:#eee;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;">',
        '<script>(function(){',
        // Post to same-origin /api so we avoid mixed-content/CORS
        'try{',
        'var params=new URLSearchParams(window.location.search);',
        'var code=params.get("code");',
        'var v=null;try{v=sessionStorage.getItem("spotify_pkce_verifier")||localStorage.getItem("spotify_pkce_verifier");}catch(e){}',
        'var r=null;try{r=sessionStorage.getItem("spotify_redirect_uri")||localStorage.getItem("spotify_redirect_uri");}catch(e){}',
        'var ru=r || (window.location.origin+window.location.pathname);',
        'if(code&&v){',
        'fetch("/api/spotify/auth/exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:code,codeVerifier:v,redirectUri:ru})}).then(async function(r){',
        ' if(r && r.ok){',
        '   document.body.innerHTML="<div style=\\"color:#8BC34A;font-family:system-ui;\\">Spotify connected. You can close this tab.</div>";',
        '   try{sessionStorage.removeItem("spotify_pkce_verifier");sessionStorage.removeItem("spotify_redirect_uri");}catch(e){}',
        ' }else{',
        '   var t="";try{t=await r.text()}catch(e){}',
        '   document.body.innerHTML="<pre style=\\"white-space:pre-wrap;color:#FF6B6B;font-family:system-ui;\\">Exchange failed\\n"+t+"</pre>";',
        ' }',
        '}).catch(function(e){document.body.innerHTML="<pre style=\\"white-space:pre-wrap;color:#FF6B6B;font-family:system-ui;\\">Exchange error: "+(e&&e.message?e.message:"unknown")+"</pre>";});',
        '}else{document.body.innerHTML="<div style=\\"color:#FF6B6B;\\">Missing code or verifier.</div>";}',
        '}catch(e){document.body.textContent="Unexpected error";}',
        '}());</script></body></html>',
      ].join('');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    // Route /api/* to backend; everything else to Expo web target
    if (req.url && req.url.startsWith('/api/')) {
      proxy.web(req, res, { target: BACKEND, changeOrigin: true }, (err) => {
        try {
          const targetInfo = (() => {
            try {
              const u = new URL(BACKEND);
              return `${u.protocol}//${u.hostname}:${u.port}`;
            } catch {
              return BACKEND;
            }
          })();
          console.error('API proxy error', {
            target: targetInfo,
            code: err && err.code,
            message: err && err.message,
          });
        } catch {}
        res.writeHead(502);
        res.end('Proxy error to backend');
      });
    } else {
      proxy.web(req, res, { target: TARGET, changeOrigin: true }, (err) => {
        try {
          console.error('Web proxy error', {
            target: TARGET,
            code: err && err.code,
            message: err && err.message,
          });
        } catch {}
        res.writeHead(502);
        res.end('Proxy error to web target');
      });
    }
  })
  .listen(HTTPS_PORT, '127.0.0.1', () => {
    console.log(
      `HTTPS proxy on https://127.0.0.1:${HTTPS_PORT} -> TARGET=${TARGET} BACKEND=${BACKEND}`
    );
  });
