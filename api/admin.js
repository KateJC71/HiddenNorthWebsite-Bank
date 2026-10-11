/* Hidden North — back-office API (Vercel Function).
   GET  /api/admin?action=load      → current data/tours.json from GitHub (+ its sha)
   POST /api/admin?action=publish   → { data, baseSha, images:[{ path, base64 }] }
        writes tours.json and any new photos to GitHub in ONE commit; Vercel
        then redeploys the site automatically (about a minute).
   Every request needs the header  x-admin-key: <ADMIN_PASSWORD>.

   Vercel environment variables:
     ADMIN_PASSWORD   back-office password (share only with staff)
     GITHUB_TOKEN     fine-grained token, this repo only, "Contents: Read and write"
     GITHUB_REPO      e.g. KateJC71/HiddenNorthWebsite-Bank
     GITHUB_BRANCH    branch the live site deploys from (default: main) */
'use strict';

const crypto = require('crypto');
const S = require('../tour-schema.js');

const TOURS_PATH = 'data/tours.json';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest(); }
function authorized(req) {
  const pass = process.env.ADMIN_PASSWORD || '';
  const given = req.headers['x-admin-key'] || '';
  return pass.length >= 8 && crypto.timingSafeEqual(sha256(pass), sha256(given));
}

function gh(path, opts) {
  opts = opts || {};
  return fetch('https://api.github.com/repos/' + process.env.GITHUB_REPO + path, {
    method: opts.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'hidden-north-admin',
      'Content-Type': 'application/json'
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async function (r) {
    const j = await r.json().catch(function () { return {}; });
    if (!r.ok) { const e = new Error('GitHub ' + r.status + ' ' + (j.message || '')); e.status = r.status; throw e; }
    return j;
  });
}

function branch() { return process.env.GITHUB_BRANCH || 'main'; }

async function loadTours() {
  const f = await gh('/contents/' + TOURS_PATH + '?ref=' + encodeURIComponent(branch()));
  return { sha: f.sha, data: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')) };
}

function imageKind(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.slice(0, 4).toString('hex') === '89504e47') return 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return '';
}

async function publish(body) {
  const data = body.data;
  const errs = S.validateData(data);
  if (errs.length) return { status: 400, json: { error: 'invalid', details: errs.slice(0, 20) } };

  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > 20) return { status: 400, json: { error: 'invalid', details: ['一次最多上傳 20 張照片'] } };
  const blobs = [];
  for (const img of images) {
    if (!img || !S.UPLOAD_RE.test(img.path || '') || img.path.indexOf('..') >= 0) {
      return { status: 400, json: { error: 'invalid', details: ['照片路徑不正確'] } };
    }
    const buf = Buffer.from(String(img.base64 || ''), 'base64');
    if (!buf.length || buf.length > MAX_IMAGE_BYTES || !imageKind(buf)) {
      return { status: 400, json: { error: 'invalid', details: ['照片格式或大小不正確：' + img.path] } };
    }
    blobs.push({ path: img.path, base64: buf.toString('base64') });
  }

  // Refuse to overwrite edits someone else published after this editor loaded.
  const current = await loadTours();
  if (body.baseSha && body.baseSha !== current.sha) return { status: 409, json: { error: 'conflict' } };

  const ref = await gh('/git/ref/heads/' + encodeURIComponent(branch()));
  const head = ref.object.sha;
  const headCommit = await gh('/git/commits/' + head);

  const tree = [];
  for (const b of blobs) {
    const blob = await gh('/git/blobs', { method: 'POST', body: { content: b.base64, encoding: 'base64' } });
    tree.push({ path: b.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const json = JSON.stringify(data, null, 2) + '\n';
  const toursBlob = await gh('/git/blobs', { method: 'POST', body: { content: Buffer.from(json).toString('base64'), encoding: 'base64' } });
  tree.push({ path: TOURS_PATH, mode: '100644', type: 'blob', sha: toursBlob.sha });

  const newTree = await gh('/git/trees', { method: 'POST', body: { base_tree: headCommit.tree.sha, tree: tree } });
  const summary = String(body.message || '').replace(/[\r\n]+/g, ' ').slice(0, 120);
  const commit = await gh('/git/commits', {
    method: 'POST',
    body: { message: 'Update tours via admin' + (summary ? ': ' + summary : ''), tree: newTree.sha, parents: [head] }
  });
  try {
    await gh('/git/refs/heads/' + encodeURIComponent(branch()), { method: 'PATCH', body: { sha: commit.sha, force: false } });
  } catch (e) {
    if (e.status === 422) return { status: 409, json: { error: 'conflict' } };
    throw e;
  }
  return { status: 200, json: { ok: true, commit: commit.sha, sha: toursBlob.sha } };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    return res.status(503).json({ error: 'not_configured' });
  }
  if (!authorized(req)) {
    await new Promise(function (r) { setTimeout(r, 600); });   // slow down password guessing
    return res.status(401).json({ error: 'unauthorized' });
  }
  const action = (req.query && req.query.action) || new URL(req.url, 'http://x').searchParams.get('action');
  try {
    if (req.method === 'GET' && action === 'load') {
      const t = await loadTours();
      return res.status(200).json({ ok: true, sha: t.sha, data: t.data, branch: branch() });
    }
    if (req.method === 'POST' && action === 'publish') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
      if (!body) return res.status(400).json({ error: 'invalid' });
      const r = await publish(body);
      return res.status(r.status).json(r.json);
    }
    return res.status(404).json({ error: 'unknown_action' });
  } catch (e) {
    console.error('admin api error', e);
    return res.status(502).json({ error: 'github', message: String(e.message || e) });
  }
};
