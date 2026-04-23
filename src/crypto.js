/**
 * HMAC-SHA256 cookie signing and verification.
 * Uses Web Crypto API (native to Cloudflare Workers).
 * Cookies are stateless and self-verifying.
 */

export async function generateCookie(secret, request, fingerprint) {
  const timestamp = Math.floor(Date.now() / 1000);
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';

  const binding = `${ua}|${lang}|${fingerprint}`;
  const bindingHash = await sha256(binding);

  const payload = `${timestamp}:${bindingHash}`;
  const signature = await hmacSign(secret, payload);

  return btoa(`${payload}:${signature}`);
}

export async function verifyCookie(cookie, secret, ttl) {
  try {
    const decoded = atob(cookie);
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const [timestamp, bindingHash, signature] = parts;
    const payload = `${timestamp}:${bindingHash}`;

    const expectedSig = await hmacSign(secret, payload);
    if (!timingSafeEqual(signature, expectedSig)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(timestamp) > ttl) return false;

    return true;
  } catch {
    return false;
  }
}

async function hmacSign(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return bufferToHex(sig);
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(message));
  return bufferToHex(hash);
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
