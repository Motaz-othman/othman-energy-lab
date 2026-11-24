// ---------- site header and footer, shared by every page ----------
// A page adds <header class="sitebar" data-root="../../" data-page="data-centers"></header>
// and <footer class="sitefoot" data-root="../../"></footer>; data-root is the path back to the project root.
// formEndpoint: where the contact form posts. FormSubmit (formsubmit.co) needs no account: the first message sends a
// one-time confirmation email to SITE.email; click its link once and later messages are delivered. Empty = open the
// visitor's email app instead.
const SITE={name:'Othman Energy Lab', tagline:'Code-based. Beyond the minimum.', email:'Mutaz.othman@outlook.com', formEndpoint:'https://formsubmit.co/ajax/Mutaz.othman@outlook.com',
  slogan:['Less energy.','Lower cost.','A cleaner planet.']};
const NAV=[
  {id:'about',l:'About',href:'about/index.html'},
  {id:'data-centers',l:'Data Centers',href:'data-centers/index.html'},
  {id:'articles',l:'Articles',href:'articles/index.html'},
  {id:'contact',l:'Contact',href:'contact/index.html'},
];
// mark: the Othman Energy Lab logo (metal ring, glass core cool blue to warm orange, silver flame), vector
const MARK=`<svg viewBox="440 40 480 640" aria-hidden="true"><defs><linearGradient id="oR" x1="500" y1="250" x2="860" y2="640" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#eceef0"/><stop offset=".8" stop-color="#c3c7cc"/><stop offset="1" stop-color="#9ea3a9"/></linearGradient><linearGradient id="oI" x1="560" y1="260" x2="820" y2="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f7f8f9"/><stop offset=".55" stop-color="#dfe2e5"/><stop offset="1" stop-color="#a9aeb4"/></linearGradient><linearGradient id="oC" x1="590" y1="320" x2="810" y2="545" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#22f0ff"/><stop offset=".36" stop-color="#14c8f2"/><stop offset=".56" stop-color="#5e9fb8"/><stop offset=".74" stop-color="#f0954a"/><stop offset="1" stop-color="#ff8a1a"/></linearGradient><radialGradient id="oS" cx="720" cy="395" r="170" gradientUnits="userSpaceOnUse"><stop offset=".68" stop-color="#0b1621" stop-opacity="0"/><stop offset="1" stop-color="#0b1621" stop-opacity=".5"/></radialGradient><linearGradient id="oG" x1="580" y1="320" x2="800" y2="540" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5ff4ff"/><stop offset=".5" stop-color="#7fd6ff"/><stop offset="1" stop-color="#ffab5c"/></linearGradient><linearGradient id="oF" x1="860" y1="60" x2="735" y2="470" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d3d6da"/><stop offset=".55" stop-color="#f4f5f6"/><stop offset=".8" stop-color="#c2c6cb"/><stop offset="1" stop-color="#8e949b"/></linearGradient><linearGradient id="oD" x1="800" y1="245" x2="725" y2="345" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#121c26"/><stop offset="1" stop-color="#121c26" stop-opacity="0"/></linearGradient><filter id="oBl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter><filter id="oSh" x="-15%" y="-10%" width="130%" height="125%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity=".28"/></filter></defs><g filter="url(#oSh)"><circle cx="680" cy="441" r="225" fill="url(#oR)"/><circle cx="688" cy="437" r="203" fill="url(#oI)" stroke="#151b21" stroke-width="12"/><circle cx="688" cy="431" r="146" fill="none" stroke="url(#oG)" stroke-width="9" filter="url(#oBl)" opacity=".9"/><circle cx="688" cy="431" r="142" fill="url(#oC)"/><circle cx="688" cy="431" r="142" fill="url(#oS)"/><ellipse cx="650" cy="372" rx="70" ry="40" fill="#fff" opacity=".16" transform="rotate(-28 650 372)"/><path d="M736 233 C760 229 790 230 806 238 C818 262 815 292 800 312 C784 332 764 344 746 350 C738 320 730 296 722 280 C724 262 728 246 736 233Z" fill="url(#oD)"/><path d="M730 480 C752 430 790 390 830 352 C862 320 885 290 885 245 C886 228 883 214 880 205 C872 228 862 250 845 256 C832 260 826 240 828 222 C830 190 850 160 852 130 C855 105 852 80 845 60 C840 95 828 120 806 145 C786 165 765 185 760 205 C757 215 756 225 758 230 C778 222 800 220 810 238 C820 256 818 280 800 302 C775 330 748 365 737 400 C728 430 728 455 730 480Z" fill="url(#oF)" stroke="#6f757c" stroke-opacity=".55" stroke-width="2" stroke-linejoin="round"/><path d="M733 468 C733 435 742 400 760 372 C778 345 795 325 806 300" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g></svg>`;
(function(){
  const bar=document.querySelector('header.sitebar');
  if(bar){ const r=bar.dataset.root||'';
    // top bar: logo, the Lab's message and the main pages (also in the footer)
    const TOP=[['home','Home','index.html'],['data-centers','Data Centers','data-centers/index.html'],['articles','Articles','articles/index.html'],['about','About','about/index.html'],['contact','Contact','contact/index.html']], cur=bar.dataset.page;
    bar.innerHTML=`<div class="sitebar-in"><a class="brand" href="${r}index.html" aria-label="${SITE.name} home">${MARK}<span class="bn">Othman Energy <b>Lab</b></span></a>
      <nav class="topnav" aria-label="Main">${TOP.map(([id,l,h])=>`<a href="${r}${h}"${id===cur?' aria-current="page"':''}>${l}</a>`).join('')}</nav></div>`;
    // soft shadow under the bar once the page has scrolled
    const shade=()=>bar.classList.toggle('scrolled',window.scrollY>4);
    addEventListener('scroll',shade,{passive:true}); shade(); }
  const foot=document.querySelector('footer.sitefoot');
  if(foot){ const r=foot.dataset.root||'';
    foot.innerHTML=`<div class="sitefoot-in">
      <div><div class="fb">${MARK}<span>${SITE.name}</span></div><div class="ft">${SITE.tagline}</div><div class="ft">Founded by <a href="${r}about/index.html#founder">Eng. Mutaz Othman</a></div><div class="ft"><a href="mailto:${SITE.email}">${SITE.email}</a></div></div>
      <nav aria-label="Footer">${NAV.map(n=>`<a href="${r}${n.href}">${n.l}</a>`).join('')}</nav>
      <div class="fn">© ${new Date().getFullYear()} ${SITE.name}. Guiding engineers and clients to the right system for critical and high-demand buildings.</div></div>`; }
})();

// Vercel Web Analytics (visitors and page views; no cookies). Loads only on the live site, not on local files.
(function(){
  if(!/(^|\.)oenergylab\.com$|\.vercel\.app$/.test(location.hostname)) return;
  window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};
  const s=document.createElement('script'); s.defer=true; s.src='/_vercel/insights/script.js'; document.head.appendChild(s);
})();

// tool pages on phones and tablets: one button jumps between the inputs and the results of the visible tool
(function(){
  const layouts=[...document.querySelectorAll('main.layout')]; if(!layouts.length) return;
  const b=document.createElement('button'); b.className='fab'; b.type='button'; document.body.appendChild(b);
  const cur=()=>layouts.find(l=>!l.hidden)||layouts[0], res=()=>cur().querySelector('.results'), inp=()=>cur().querySelector('.incol')||cur();
  const inView=el=>{ const r=el.getBoundingClientRect(); return r.top<innerHeight*0.6&&r.bottom>innerHeight*0.2; };
  const label=()=>{ const r=res(); b.textContent=r&&(inView(r)||r.getBoundingClientRect().top<0)?'Inputs ↑':'Results ↓'; };
  b.onclick=()=>{ const r=res(); const toRes=b.textContent.startsWith('Results'); (toRes?r:inp()).scrollIntoView({behavior:'smooth',block:'start'}); };
  addEventListener('scroll',label,{passive:true}); addEventListener('resize',label); label();
})();
