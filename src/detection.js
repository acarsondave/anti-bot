/**
 * Bot detection scoring system.
 *
 * Design principle: Use a SCORING model, not binary pass/fail.
 * Each signal adds points. Only reject if cumulative score exceeds threshold.
 * This prevents false positives against real humans with VPNs, privacy
 * browsers, or unusual configurations.
 *
 * Score >= 100: Instant kill (hard bot signal)
 * Score >= threshold (default 50): Likely bot, serve decoy
 * Score < threshold: Likely human, allow through
 *
 * False positive safety margins:
 *   - Normal desktop user:     ~0  (always passes)
 *   - VPN user (datacenter):   ~30 (passes, below 50)
 *   - Privacy browser (Brave): ~15 (passes)
 *   - Mobile user (touch):     ~0  (passes)
 */

// Known email security scanner ASNs. These are HARD KILLS (score 100).
// These companies run dedicated scanning infrastructure at these ASNs.
const SCANNER_ASNS = new Set([
  8075,    // Microsoft Corporation (Safe Links / ATP)
  13916,   // Proofpoint / IBOSS
  60067,   // Mimecast
  19740,   // Barracuda Networks
  15169,   // Google (Safe Browsing detonation)
  21345,   // Cisco IronPort / Talos
  395747,  // Abnormal Security
  16509,   // Amazon AWS (used by multiple scanner services)
]);

// General datacenter ASNs. Could be VPN users, so we only add 30 points.
const DATACENTER_ASNS = new Set([
  14618,   // Amazon (secondary)
  396982,  // Google Cloud
  14061,   // DigitalOcean
  16276,   // OVH
  24940,   // Hetzner
  63949,   // Akamai/Linode
  20473,   // Vultr
  46606,   // Unified Layer
  13335,   // Cloudflare (could be Workers-on-Workers)
  8560,    // IONOS / 1&1
  36352,   // ColoCrossing
  62567,   // DigitalOcean (secondary)
]);

// Known bot User-Agent substrings
const BOT_UA_PATTERNS = [
  'bot', 'crawler', 'spider', 'phantomjs', 'headlesschrome',
  'wget', 'curl', 'python-requests', 'go-http-client', 'java/',
  'apache-httpclient', 'okhttp', 'node-fetch', 'axios',
  'microsoft office', 'ms-office', 'safelinks',
  'proofpoint', 'barracuda', 'mimecast',
];

export function scoreRequest(request) {
  let score = 0;
  const cf = request.cf || {};
  const headers = request.headers;

  const asn = cf.asn;
  if (SCANNER_ASNS.has(asn)) {
    return 100;
  }
  if (DATACENTER_ASNS.has(asn)) {
    score += 30;
  }

  const acceptLang = headers.get('Accept-Language');
  if (!acceptLang) {
    score += 15;
  }

  const secFetchDest = headers.get('Sec-Fetch-Dest');
  if (!secFetchDest) {
    score += 15;
  }

  const secFetchMode = headers.get('Sec-Fetch-Mode');
  if (!secFetchMode) {
    score += 10;
  }

  const ua = (headers.get('User-Agent') || '').toLowerCase();
  if (!ua) {
    score += 25;
  } else {
    for (const pattern of BOT_UA_PATTERNS) {
      if (ua.includes(pattern)) {
        score += 30;
        break;
      }
    }
  }

  return score;
}

export function scoreClientTelemetry(data) {
  let score = 0;

  // Hard kills: these cannot be faked by any bot framework
  if (data.isTrusted === false) return 100;
  if (data.webdriver === true) return 100;

  // Timing analysis
  const clickDelay = data.clickDelay || 0;
  if (clickDelay < 100) {
    score += 40;
  } else if (clickDelay < 300) {
    score += 20;
  }

  // Interaction events (mouse or touch)
  const interactionCount = data.interactionCount || 0;
  const isTouchDevice = data.touchCapable === true;

  // On touch devices, users might tap instantly without prior movement.
  // Only penalize lack of interaction on non-touch devices.
  if (!isTouchDevice && interactionCount === 0) {
    score += 15;
  }

  // Screen dimensions
  const sw = data.screenWidth || 0;
  const sh = data.screenHeight || 0;
  if (sw === 0 || sh === 0) {
    score += 25;
  } else if (sw === 800 && sh === 600) {
    score += 25;
  }

  // Window filling entire screen is a slight headless signal.
  // But on mobile, window always equals screen, so skip this check
  // if the device reports touch capability.
  if (!isTouchDevice) {
    if (data.windowWidth === sw && data.windowHeight === sh) {
      score += 10;
    }
  }

  return score;
}
