/* Hidden North — payment settings (public values only).
   provider: 'demo'   → test checkout, no real charge (default)
             'square' → Square Web Payments SDK + /api/create-payment
   The Application ID and Location ID are public identifiers and safe here.
   The ACCESS TOKEN is secret: set it only as a Vercel environment variable
   (SQUARE_ACCESS_TOKEN), never in this file. See README → 「串接 Square」. */
window.HN_PAYMENT = {
  provider: 'demo',
  environment: 'sandbox',        // 'sandbox' | 'production' (must match SQUARE_ENVIRONMENT on Vercel)
  squareApplicationId: '',       // e.g. 'sandbox-sq0idb-…'
  squareLocationId: ''           // e.g. 'L…'
};
