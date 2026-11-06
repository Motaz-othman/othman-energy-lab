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
  {id:'contact',l:'Contact',href:'contact/index.html'},
];
// mark: three bars stepping down (code minimum → beyond), the last in brand green
const MARK=`<svg viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="6" style="fill:var(--text)"/>
<rect x="6" y="6" width="3.6" height="14" rx="1" style="fill:var(--surface)"/><rect x="11.2" y="10" width="3.6" height="10" rx="1" style="fill:var(--surface)"/><rect x="16.4" y="14" width="3.6" height="6" rx="1" style="fill:var(--brand-ink)"/></svg>`;
(function(){
  const bar=document.querySelector('header.sitebar');
  if(bar){ const r=bar.dataset.root||'';
    // top bar: logo and the Lab's message; page links live in the footer
    bar.innerHTML=`<div class="sitebar-in"><a class="brand" href="${r}index.html" aria-label="${SITE.name} home">${MARK}<span class="bn">Othman Energy <b>Lab</b></span></a>
      <p class="slogan">${SITE.slogan.map(s=>`<span>${s}</span>`).join('')}</p></div>`;
    // soft shadow under the bar once the page has scrolled
    const shade=()=>bar.classList.toggle('scrolled',window.scrollY>4);
    addEventListener('scroll',shade,{passive:true}); shade(); }
  const foot=document.querySelector('footer.sitefoot');
  if(foot){ const r=foot.dataset.root||'';
    foot.innerHTML=`<div class="sitefoot-in">
      <div><div class="fb">${MARK}<span>${SITE.name}</span></div><div class="ft">${SITE.tagline}</div><div class="ft"><a href="mailto:${SITE.email}">${SITE.email}</a></div></div>
      <nav aria-label="Footer">${NAV.map(n=>`<a href="${r}${n.href}">${n.l}</a>`).join('')}</nav>
      <div class="fn">© ${new Date().getFullYear()} ${SITE.name}. Guiding engineers and clients to the right system for critical and high-demand buildings.</div></div>`; }
})();

// Vercel Web Analytics (visitors and page views; no cookies). Loads only on the live site, not on local files.
(function(){
  if(!/(^|\.)oenergylab\.com$|\.vercel\.app$/.test(location.hostname)) return;
  window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};
  const s=document.createElement('script'); s.defer=true; s.src='/_vercel/insights/script.js'; document.head.appendChild(s);
})();
