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
// mark: a brushed-metal "O" for Othman around a glass core (cool blue to warm orange), with a metal energy bolt breaking through it
const MARK=`<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="oelM" x1="8" y1="10" x2="54" y2="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fbfbfb"/><stop offset=".28" stop-color="#b9bcc0"/><stop offset=".5" stop-color="#eef0f2"/><stop offset=".72" stop-color="#8d9095"/><stop offset="1" stop-color="#d9dbde"/></linearGradient><linearGradient id="oelB" x1="36" y1="2" x2="52" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#c3c6ca"/><stop offset=".6" stop-color="#f1f2f4"/><stop offset="1" stop-color="#7f8388"/></linearGradient><radialGradient id="oelG" cx="24" cy="27" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c9ecff"/><stop offset=".35" stop-color="#5bb8f2"/><stop offset=".72" stop-color="#c7a7c9"/><stop offset="1" stop-color="#ff9e62"/></radialGradient><filter id="oelS" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".35"/></filter></defs><g filter="url(#oelS)"><circle cx="29" cy="35" r="16.6" fill="url(#oelG)"/><ellipse cx="23.5" cy="28" rx="8.5" ry="4.6" fill="#fff" opacity=".38" transform="rotate(-25 23.5 28)"/><circle cx="29" cy="35" r="20.6" fill="none" stroke="url(#oelM)" stroke-width="7.4" stroke-linecap="round" stroke-dasharray="104 25.4" transform="rotate(-38 29 35)"/><circle cx="29" cy="35" r="24.2" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".6" stroke-dasharray="122 30" transform="rotate(-38 29 35)"/><circle cx="29" cy="35" r="16.9" fill="none" stroke="#5f6368" stroke-opacity=".45" stroke-width=".8" stroke-dasharray="85 21" transform="rotate(-38 29 35)"/><path d="M46 3 C41 12 35 22 31 31 H38.8 C35.5 38 31.5 45 28.5 52 C37 43 45.5 32.5 53 22 H45.6 C47.5 15.5 49.5 9 51.5 3 Z" fill="url(#oelB)" stroke="#8a8d92" stroke-width=".6" stroke-linejoin="round"/><path d="M46.2 5 L33.5 29.5" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".8"/></g></svg>`;
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
