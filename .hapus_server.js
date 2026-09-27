// Temp helper: serves the hapus-ai payload for clipboard transfer.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PAYLOAD = path.join(__dirname, '.hapus_payload.json');

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

const server = http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  const url = req.url.split('?')[0];
  if (url === '/editor.html') {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>HB paste helper</title></head>
<body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:30px">
<h2>Hapus Doctor — code transfer helper</h2>
<p>Click the button to copy the edge-function code to your clipboard.</p>
<button id="go" style="font-size:22px;padding:14px 30px;background:#16a34a;color:white;border:none;border-radius:10px;cursor:pointer">📋 Copy code to clipboard</button>
<pre id="status" style="margin-top:20px;color:#94a3b8">loading…</pre>
<script>
let b64 = null, meta = null;
function djb2(s){let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h;}
// Decode base64 -> TypeScript source, verify against server-computed src hash
function decodeSrc(){
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const txt = new TextDecoder().decode(bytes);
  return txt;
}
fetch('/payload').then(r => r.json()).then(j => {
  b64 = j.b64; meta = j;
  const src = decodeSrc();
  const ok = (src.length === j.src_len && djb2(src) === j.src_hash);
  document.getElementById('status').textContent = 'payload loaded; decoded src len=' + src.length + ' hash=' + djb2(src) + ' expected ' + j.src_len + '/' + j.src_hash + ' => ' + (ok ? 'MATCH ✓' : 'MISMATCH ✗ DO NOT COPY');
}).catch(e => document.getElementById('status').textContent = 'payload load FAILED: ' + e);
document.getElementById('go').onclick = async () => {
  const st = document.getElementById('status');
  try {
    const src = decodeSrc();
    if (src.length !== meta.src_len || djb2(src) !== meta.src_hash) { st.textContent = 'ABORT: decoded src mismatch'; return; }
    let ok = false, how = '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(src); ok = true; how = 'clipboard-api'; } catch (e) { how = 'api-failed:' + e; }
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = src; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      ok = document.execCommand('copy'); how = 'execcommand'; ta.remove();
    }
    st.textContent = JSON.stringify({ copied: ok, how, srcLen: src.length, srcHash: djb2(src) });
  } catch (e) { st.textContent = 'copy FAILED: ' + e; }
};
// Keyboard trigger: trusted clicks may not be delivered; keys are.
document.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C' || e.key === 'Enter') { e.preventDefault(); document.getElementById('go').onclick(); }
});
</script></body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...cors });
    return res.end(html);
  }
  if (url === '/photo') {
    // Rehearsal helper: serve a verified demo photo for the e2e scan test.
    try {
      const img = fs.readFileSync(path.join(__dirname, 'demo-photos/02-powdery-mildew-leaf-blight.jpg'));
      res.writeHead(200, { 'Content-Type': 'image/jpeg', ...cors });
      return res.end(img);
    } catch (e) {
      res.writeHead(404, cors);
      return res.end('photo not found');
    }
  }
  if (url === '/payload') {
    try {
      const src = fs.readFileSync(path.join(__dirname, 'supabase/functions/hapus-ai/index.ts'), 'utf8');
      const b64 = Buffer.from(src, 'utf8').toString('base64');
      res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
      return res.end(JSON.stringify({ b64, len: b64.length, hash: djb2(b64), src_len: src.length, src_hash: djb2(src) }));
    } catch (e) {
      res.writeHead(404, cors);
      return res.end(JSON.stringify({ error: String(e) }));
    }
  }
  res.writeHead(404, cors);
  res.end('not found');
});

server.listen(8791, '127.0.0.1', () => console.log('hapus helper on http://127.0.0.1:8791/editor.html'));
