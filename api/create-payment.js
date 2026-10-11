/* Hidden North — create a Square payment for a tour booking (Vercel Function).
   POST { sourceId, idempotencyKey, order }
   The amount is recomputed here from data/tours.json via pricing.js — the
   client's total is never trusted.

   Vercel environment variables:
     SQUARE_ACCESS_TOKEN   secret access token (sandbox or production)
     SQUARE_LOCATION_ID    location to charge
     SQUARE_ENVIRONMENT    'sandbox' (default) | 'production' */
'use strict';

const P = require('../pricing.js');
const data = require('../data/tours.json');

const SQUARE_VERSION = '2024-10-17';

function todayJST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) return res.status(503).json({ error: 'server', message: 'Square is not configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (e) { return res.status(400).json({ error: 'invalid' }); }
  const order = body.order || {};
  const customer = order.customer || {};
  if (!body.sourceId || !body.idempotencyKey) return res.status(400).json({ error: 'invalid' });

  const tour = (data.tours || []).find(function (t) { return t.id === order.tourId && t.status !== 'draft'; });
  if (!tour) return res.status(400).json({ error: 'booking' });
  // The client checks the date against the guest's local "today"; allow one day of timezone slack.
  if (P.validate(tour, order, P.addDays(todayJST(), -1)).length) return res.status(400).json({ error: 'booking' });
  if (Array.isArray(tour.confirmations) && tour.confirmations.length && order.confirmed !== true) {
    return res.status(400).json({ error: 'booking' });
  }
  if (!str(customer.name, 100) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(customer.email, 254))) {
    return res.status(400).json({ error: 'invalid' });
  }

  const q = P.quote(tour, order);
  const ref = str(order.ref, 40) || 'HN-' + Date.now();
  const title = (tour.title && (tour.title.ja || tour.title.en)) || tour.id;
  const party = q.children ? ('大人' + q.adults + ' 子ども' + q.children) : (q.pax + '名');
  const note = [
    ref, title, order.date, party,
    customer.name, customer.phone, customer.country,
    customer.hotel ? 'Hotel: ' + customer.hotel : '',
    customer.note ? 'Note: ' + customer.note : ''
  ].map(function (s) { return str(s, 200); }).filter(Boolean).join(' / ').slice(0, 500);

  const payload = {
    source_id: str(body.sourceId, 192),
    idempotency_key: str(body.idempotencyKey, 45),
    amount_money: { amount: q.total, currency: 'JPY' },   // JPY has no minor unit
    location_id: locationId,
    reference_id: ref,
    note: note,
    buyer_email_address: str(customer.email, 254),
    autocomplete: true
  };

  const base = process.env.SQUARE_ENVIRONMENT === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
  try {
    const r = await fetch(base + '/v2/payments', {
      method: 'POST',
      headers: { 'Square-Version': SQUARE_VERSION, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(function () { return {}; });
    if (!r.ok || !j.payment) {
      const code = (j.errors && j.errors[0] && j.errors[0].category) === 'PAYMENT_METHOD_ERROR' ? 'declined' : 'server';
      console.error('Square payment failed', r.status, JSON.stringify(j.errors || j));
      return res.status(code === 'declined' ? 402 : 502).json({ error: code });
    }
    return res.status(200).json({
      ok: true, paymentId: j.payment.id, status: j.payment.status,
      receiptUrl: j.payment.receipt_url || '', total: q.total, ref: ref
    });
  } catch (e) {
    console.error('Square request error', e);
    return res.status(502).json({ error: 'server' });
  }
};
