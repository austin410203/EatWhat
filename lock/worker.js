// Password gate for games still in internal testing (Empty Office "Lab").
// Every request runs through here first; with the right cookie the static files are served as usual.
// The cookie is set on emptyoffice.app itself, so one unlock opens every locked *.emptyoffice.app game.
// To make a game public: drop "main", "binding", "run_worker_first" and "vars" from wrangler.jsonc.
const PASSWORD = '0422';
const COOKIE = 'eo_lab';
const TOKEN = 'v1-45bfe08d5a52588266dcb947';
const MAX_AGE = 60 * 60 * 24 * 30;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cookies = (req.headers.get('Cookie') || '').split(/;\s*/);
    if (cookies.includes(`${COOKIE}=${TOKEN}`)) return env.ASSETS.fetch(req);

    if (req.method === 'POST' && url.pathname === '/__unlock') {
      const form = await req.formData();
      const next = String(form.get('next') || '/');
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      if (String(form.get('pw') || '').trim() === PASSWORD) {
        const domain = url.hostname.endsWith('emptyoffice.app') ? '; Domain=emptyoffice.app' : '';
        return new Response(null, { status: 303, headers: {
          Location: safeNext,
          'Set-Cookie': `${COOKIE}=${TOKEN}; Path=/; Max-Age=${MAX_AGE}; Secure; HttpOnly; SameSite=Lax${domain}`,
        } });
      }
      return gate(env, safeNext, true);
    }
    return gate(env, url.pathname + url.search, false);
  },
};

function gate(env, next, wrong) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const name = esc(env.LAB_NAME || 'Empty Office Lab');
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${name}｜內部測試</title><link rel="icon" href="https://emptyoffice.app/img/favicon.png">
<style>
:root{--navy:#0e1528;--navy2:#18213b;--amber:#ffb547;--teal:#3cddb4;--paper:#f4f1ea;--dim:#a9b0c4}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at 50% 30%,#22305a,var(--navy) 70%);color:var(--paper);font:16px/1.6 system-ui,-apple-system,"Segoe UI","Noto Sans TC",sans-serif}
form{width:100%;max-width:360px;background:var(--navy2);border:1px solid #2a3560;border-radius:20px;padding:28px 24px;text-align:center}
img{width:64px;height:64px}
h1{font-size:21px;margin:10px 0 2px}
p{color:var(--dim);font-size:14px;margin:0 0 18px}
input{width:100%;font:inherit;font-size:22px;letter-spacing:.4em;text-align:center;padding:10px;border-radius:12px;border:1px solid #3a4670;background:var(--navy);color:var(--paper)}
input:focus{outline:2px solid var(--teal);border-color:transparent}
button{margin-top:14px;width:100%;font:inherit;font-weight:700;border:0;border-radius:999px;padding:10px;background:var(--amber);color:var(--navy);cursor:pointer}
.err{color:#ff8a8a;margin:10px 0 0}
a{color:var(--dim);font-size:13px}
</style></head><body>
<form method="post" action="/__unlock">
<img src="https://emptyoffice.app/img/logo-mark.png" alt="">
<h1>🔒 ${name}</h1>
<p>這款遊戲還在內部測試中，請輸入密碼。<br>Internal preview — password required.</p>
<input type="hidden" name="next" value="${esc(next)}">
<input name="pw" type="password" inputmode="numeric" autocomplete="current-password" autofocus required aria-label="密碼 Password">
<button type="submit">進入 Enter</button>
${wrong ? '<p class="err">密碼不對，再試一次。Wrong password.</p>' : ''}
<p style="margin:16px 0 0"><a href="https://emptyoffice.app/">← emptyoffice.app</a></p>
</form></body></html>`;
  return new Response(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
