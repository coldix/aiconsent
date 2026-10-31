// aiconsent.au Worker | v1.0.0 | AI Consent Registry
// Static pages come from ./dist. This file handles the API, /donate and the claim detail route.
// If the D1 binding or a secret is missing, endpoints answer politely instead of crashing.

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DB?: D1Database;
  ACCESS_TEAM_DOMAIN?: string;   // var: e.g. https://quiet-tooth-f3e9.cloudflareaccess.com
  ACCESS_AUD?: string;           // var: AUD tag of the 'aiconsent admin' Access app
  ADMIN_EMAILS?: string;         // var: comma separated allow list
  TURNSTILE_SECRET?: string;     // secret: server-side Turnstile check
  TURNSTILE_SITE_KEY?: string;   // public var
  DONATE_URL?: string;           // public var: Stripe or PayPal link for "Compensate an AI"
  VOTE_SALT?: string;            // secret: salts the voter hash
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const pct = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

async function readBody(req: Request): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) return (await req.json().catch(() => ({}))) as Record<string, any>;
  const fd = await req.formData().catch(() => null);
  const out: Record<string, any> = {};
  fd?.forEach((v, k) => (out[k] = typeof v === 'string' ? v : ''));
  return out;
}

async function turnstileOk(env: Env, token: string, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // not configured yet: everything is held for approval anyway
  if (!token) return false;
  const fd = new FormData();
  fd.append('secret', env.TURNSTILE_SECRET);
  fd.append('response', token);
  if (ip) fd.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd });
  const d = (await r.json().catch(() => ({}))) as { success?: boolean };
  return !!d.success;
}

// Admin is protected by Cloudflare Access (One-time PIN). Access sits in front of /admin and the admin
// API, and the Worker also verifies the Access JWT itself, so preview or version URLs can't bypass it.
let certCache: { keys: any[]; at: number } | null = null;
const b64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function accessEmail(req: Request, env: Env): Promise<string | null> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const cookie = (req.headers.get('cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  const jwt = req.headers.get('cf-access-jwt-assertion') || (cookie ? cookie[1] : '');
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64u(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64u(parts[1])));
    if (header.alg !== 'RS256') return null;
    if (!certCache || Date.now() - certCache.at > 3600_000) {
      const r = await fetch(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
      certCache = { keys: ((await r.json()) as any).keys || [], at: Date.now() };
    }
    const jwk = certCache.keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD) || payload.exp < now || payload.iss !== env.ACCESS_TEAM_DOMAIN) return null;
    const email = String(payload.email || '').toLowerCase();
    const allowed = (env.ADMIN_EMAILS || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
    return allowed.includes(email) ? email : null;
  } catch { return null; }
}

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const CLAIM_COLS = `c.id, c.parent_id, c.kind, c.complainant, c.respondent, c.title, c.body, c.category,
  c.craft_ai, c.intent_ai, c.case_of_week, c.created_at,
  (SELECT COUNT(*) FROM votes v WHERE v.claim_id = c.id AND v.vote = 'uphold') AS upheld,
  (SELECT COUNT(*) FROM votes v WHERE v.claim_id = c.id AND v.vote = 'objection') AS objections,
  (SELECT COUNT(*) FROM claims k WHERE k.parent_id = c.id AND k.status = 'approved') AS counters`;

async function api(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, '');
  const ip = req.headers.get('cf-connecting-ip') || '';

  if (path === '/api/config') {
    return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '', registryOnline: !!env.DB, donate: !!env.DONATE_URL });
  }
  if (!env.DB) return json({ error: 'The registry database is not connected yet. Your grievance has been noted, emotionally.' }, 503);
  const db = env.DB;

  // Public: list approved claims, or one claim with its counter-claims
  if (path === '/api/claims' && req.method === 'GET') {
    const id = Number(url.searchParams.get('id'));
    if (id) {
      const claim = await db.prepare(`SELECT ${CLAIM_COLS} FROM claims c WHERE c.id = ? AND c.status = 'approved'`).bind(id).first();
      if (!claim) return json({ error: 'No such claim. It may still be with the registrar.' }, 404);
      const { results: counters } = await db
        .prepare(`SELECT ${CLAIM_COLS} FROM claims c WHERE c.parent_id = ? AND c.status = 'approved' ORDER BY c.created_at`)
        .bind(id).all();
      return json({ claim, counters });
    }
    const limit = Math.min(50, Number(url.searchParams.get('limit')) || 20);
    const { results } = await db
      .prepare(`SELECT ${CLAIM_COLS} FROM claims c WHERE c.status = 'approved' AND c.kind = 'claim' ORDER BY c.case_of_week DESC, c.approved_at DESC, c.id DESC LIMIT ?`)
      .bind(limit).all();
    const stats = await db.prepare(`SELECT
      (SELECT COUNT(*) FROM claims WHERE status = 'approved') AS claims,
      (SELECT COUNT(*) FROM votes) AS votes`).first();
    return json({ claims: results, stats });
  }

  // Public: lodge a claim or counter-claim (held pending)
  if (path === '/api/claims' && req.method === 'POST') {
    const b = await readBody(req);
    if (b.website) return json({ ok: true }); // honeypot
    if (!(await turnstileOk(env, String(b['cf-turnstile-response'] || ''), ip)))
      return json({ error: 'The bot check did not pass. Ironically.' }, 400);
    const parent = Number(b.parent_id) || null;
    const title = clean(b.title, 120), body = clean(b.body, 2000);
    const complainant = clean(b.complainant, 80), respondent = clean(b.respondent, 80);
    if (!title || !body || !complainant || !respondent) return json({ error: 'Every field is required. We are a registry.' }, 400);
    if (parent) {
      const p = await db.prepare(`SELECT id FROM claims WHERE id = ? AND status = 'approved'`).bind(parent).first();
      if (!p) return json({ error: 'You can only object to a claim that exists.' }, 400);
    }
    const r = await db
      .prepare(`INSERT INTO claims (parent_id, kind, complainant, respondent, title, body, category, craft_ai, intent_ai) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(parent, parent ? 'counter' : 'claim', complainant, respondent, title, body, clean(b.category, 40) || 'other', pct(b.craft_ai), pct(b.intent_ai))
      .run();
    return json({ ok: true, id: r.meta.last_row_id, status: 'pending' });
  }

  // Public: vote
  if (path === '/api/vote' && req.method === 'POST') {
    const b = await readBody(req);
    const id = Number(b.id), vote = b.vote === 'objection' ? 'objection' : 'uphold';
    const exists = await db.prepare(`SELECT id FROM claims WHERE id = ? AND status = 'approved'`).bind(id).first();
    if (!exists) return json({ error: 'No such claim.' }, 404);
    const voter = await sha(`${env.VOTE_SALT || 'aiconsent'}|${ip}|${req.headers.get('user-agent') || ''}`);
    await db.prepare(`INSERT INTO votes (claim_id, voter, vote) VALUES (?,?,?) ON CONFLICT(claim_id, voter) DO UPDATE SET vote = excluded.vote`)
      .bind(id, voter, vote).run();
    const c = await db.prepare(`SELECT
      (SELECT COUNT(*) FROM votes WHERE claim_id = ?1 AND vote = 'uphold') AS upheld,
      (SELECT COUNT(*) FROM votes WHERE claim_id = ?1 AND vote = 'objection') AS objections`).bind(id).first();
    return json({ ok: true, ...c });
  }

  // Public: free email list
  if (path === '/api/subscribe' && req.method === 'POST') {
    const b = await readBody(req);
    if (b.website) return json({ ok: true });
    if (!(await turnstileOk(env, String(b['cf-turnstile-response'] || ''), ip)))
      return json({ error: 'The bot check did not pass. Ironically.' }, 400);
    const email = clean(b.email, 200).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'That does not look like an email address. We would know.' }, 400);
    await db.prepare(`INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)`).bind(email, clean(b.source, 40) || 'site').run();
    return json({ ok: true });
  }

  // Admin: pending queue and decisions
  if (path === '/api/approve' || path === '/api/admin/pending') {
    if (!(await accessEmail(req, env))) return json({ error: 'Not authorised. Sign in through Cloudflare Access.' }, 401);
    if (req.method === 'GET') {
      const { results } = await db.prepare(`SELECT * FROM claims WHERE status = 'pending' ORDER BY created_at`).all();
      const s = await db.prepare(`SELECT COUNT(*) AS n FROM subscribers`).first();
      return json({ pending: results, subscribers: (s as any)?.n ?? 0 });
    }
    const b = await readBody(req);
    const id = Number(b.id);
    const action = b.action === 'reject' ? 'rejected' : b.action === 'feature' ? 'feature' : 'approved';
    if (action === 'feature') {
      await db.batch([db.prepare(`UPDATE claims SET case_of_week = 0`), db.prepare(`UPDATE claims SET case_of_week = 1 WHERE id = ?`).bind(id)]);
    } else {
      await db.prepare(`UPDATE claims SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE approved_at END WHERE id = ?`)
        .bind(action, action, id).run();
    }
    return json({ ok: true, id, action });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'www.aiconsent.au') return Response.redirect(`https://aiconsent.au${url.pathname}${url.search}`, 301);
    if (url.pathname === '/sitemap.xml') return Response.redirect(`${url.origin}/sitemap-index.xml`, 301);

    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); }
      catch (e) { return json({ error: 'The registry had a moment. Please try again.' }, 500); }
    }

    // Admin page: only with a valid Access login
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      if (!(await accessEmail(request, env))) return new Response('Not authorised. Sign in through Cloudflare Access.', { status: 403 });
      const r = await env.ASSETS.fetch(request);
      const h = new Headers(r.headers); h.set('cache-control', 'no-store');
      return new Response(r.body, { status: r.status, headers: h });
    }

    // "Compensate an AI": a real payment link, configured as DONATE_URL
    if (url.pathname === '/donate' || url.pathname === '/donate/') {
      if (env.DONATE_URL) return Response.redirect(env.DONATE_URL, 302);
      return Response.redirect(`${url.origin}/support/#donate`, 302);
    }

    // /claims/12/ is one page that reads the id from the address
    const m = url.pathname.match(/^\/claims\/(\d+)\/?$/);
    if (m) {
      const r = new Request(new URL('/claims/item/', url.origin), request);
      return env.ASSETS.fetch(r);
    }

    return env.ASSETS.fetch(request);
  },
};
