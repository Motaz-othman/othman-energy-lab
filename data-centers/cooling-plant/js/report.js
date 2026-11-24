// ---------- PDF report: a print-ready A4 page built from the current results; saved with the browser's "Save as PDF" ----------
const RPT_C={s1:'#2a78d6',s2:'#eb6834',s3:'#1baf7a',s4:'#eda100',grey:'#c9c8c3',grey2:'#9f9e99',brand:'#a8326e',text:'#0b0b0b',text2:'#52514e',border:'#e3e2de'};
const RPT_CSS=`
:root{--bg:#f6f6f4;--surface:#fff;--border:#e3e2de;--text:#0b0b0b;--text2:#52514e;--muted:#6f6e69;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--grey:#c9c8c3;--grey2:#9f9e99;--good:#1a7f37;--warn:#b26b00;--bad:#c62828;--brand:#a8326e;--brand-ink:#8e2a5d}
@page{size:A4;margin:14mm 13mm 16mm}
@page{@bottom-left{content:"Othman Energy Lab · Cooling Plant Selector";font:8pt system-ui,sans-serif;color:#6f6e69}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:8pt system-ui,sans-serif;color:#6f6e69}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e9e9e6;color:var(--text);font:9.5pt/1.45 "Segoe UI",system-ui,-apple-system,Roboto,sans-serif}
.doc{max-width:186mm;margin:0 auto;background:#fff;padding:0}
@media screen{.doc{margin:16px auto 40px;padding:14mm 13mm;box-shadow:0 2px 16px rgba(0,0,0,.12)}}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;justify-content:center;padding:10px;background:#0b0b0b;color:#fff;font-size:13px}
.bar button{font:inherit;font-weight:600;border:0;border-radius:6px;padding:7px 14px;background:var(--brand);color:#fff;cursor:pointer}
.bar span{opacity:.75}
@media print{.bar{display:none}body{background:#fff}}
header.top{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--brand);padding-bottom:8px;margin-bottom:14px}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:11pt}.logo svg{width:26px;height:26px}.logo b{color:var(--brand)}
.meta{text-align:right;font-size:8.5pt;color:var(--text2)}
h1{font-size:19pt;line-height:1.15;margin:0 0 4px;letter-spacing:-.01em}
.lead{color:var(--text2);margin:0 0 12px}
h2{font-size:12.5pt;margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border);break-after:avoid}
h3{font-size:10pt;margin:12px 0 6px;break-after:avoid}
.sec{break-before:page}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
.box{border:1px solid var(--border);border-radius:8px;padding:10px 12px;break-inside:avoid}
.box h3{margin-top:0}
dl.kv{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:0}dl.kv dt{color:var(--text2)}dl.kv dd{margin:0;font-weight:600}
.rec{border:1.5px solid var(--brand);background:#fcf0f5;border-radius:10px;padding:12px 14px;margin:12px 0;break-inside:avoid}
.rec .tl{font-size:8pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-ink)}
.rec .nm{font-size:14pt;font-weight:700;margin:2px 0 8px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kpi{background:#fff;border:1px solid var(--border);border-radius:7px;padding:6px 8px}.kpi .v{font-size:12pt;font-weight:700}.kpi .l{font-size:7.5pt;color:var(--text2);line-height:1.25}
p.why{margin:8px 0 0}
table{width:100%;border-collapse:collapse;font-size:8pt;margin:4px 0 2px;break-inside:auto}
thead{display:table-header-group}tr{break-inside:avoid}
th{text-align:left;font-weight:700;background:#f2f2ef;border-bottom:1px solid var(--grey);padding:4px 5px;vertical-align:bottom}
td{border-bottom:1px solid var(--border);padding:3.5px 5px;vertical-align:top}
th:not(:first-child),td:not(:first-child){text-align:right}td.l,th.l{text-align:left!important}
tr.best td{background:#eef7f2;font-weight:600}td.hi{color:var(--brand-ink);font-weight:700}
.tag{display:inline-block;font-size:7pt;font-weight:700;border-radius:9px;padding:0 6px;margin-left:5px;background:#fbe7f0;color:var(--brand-ink);white-space:nowrap}.tag.x{background:#fbeaea;color:var(--bad)}.tag.ok{background:#fbe7f0;color:var(--good)}
.sbar{display:none}
.note{font-size:7.8pt;color:var(--muted);margin:3px 0 0}
.chart{break-inside:avoid;margin:6px 0 10px}.chart .ct{font-weight:700;font-size:9pt;margin-bottom:2px}
.legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:7.5pt;color:var(--text2);margin:2px 0 4px}.legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
ul{margin:4px 0;padding-left:16px}li{margin:2px 0}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.schem{display:block;width:100%;height:auto;margin:4px 0}
.schem text.h{font-size:14px;font-weight:700}.schem .bx.tes{stroke-dasharray:5 3}.schem .bx.it{fill:#eef6f2}
.schem .pump{fill:#fff;stroke:var(--text2);stroke-width:1.5}.schem .pumpv{fill:var(--text2)}
.schem text{fill:var(--text);font-size:12.5px;font-weight:600}.schem text.t2{fill:var(--text2);font-size:11px;font-weight:400}
.schem .bx{fill:#fafaf8;stroke:var(--grey2);stroke-width:1.2}.schem .zone{fill:#f3f7fc;stroke:var(--border);stroke-dasharray:4 3}
.schem .pipe{fill:none;stroke:var(--text2);stroke-width:2}.schem .pipe.sup{stroke:var(--s1)}.schem .pipe.ret{stroke:var(--s2)}.schem .pipe.cw{stroke:var(--s3)}.schem .pipe.cwr{stroke:var(--s3);stroke-dasharray:5 3}.schem .refr{fill:none;stroke:var(--grey2);stroke-width:2;stroke-dasharray:2 2}.schem .heat{fill:none;stroke:var(--grey2);stroke-width:1.5;stroke-dasharray:4 3}
.modes .mbar{display:flex;height:12px;border-radius:3px;overflow:hidden;margin:3px 0}.modes .mode{margin:6px 0}.modes .mv{font-size:7.8pt;color:var(--text2)}
.method{font-size:8pt}.method li{margin:3px 0}code{font-size:7.6pt}
.disc{font-size:7.8pt;color:var(--muted);border-top:1px solid var(--border);margin-top:16px;padding-top:8px}
`;
const RPT_LOGO='<svg viewBox="440 40 480 640" aria-hidden="true"><defs><linearGradient id="oR" x1="500" y1="250" x2="860" y2="640" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#eceef0"/><stop offset=".8" stop-color="#c3c7cc"/><stop offset="1" stop-color="#9ea3a9"/></linearGradient><linearGradient id="oI" x1="560" y1="260" x2="820" y2="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f7f8f9"/><stop offset=".55" stop-color="#dfe2e5"/><stop offset="1" stop-color="#a9aeb4"/></linearGradient><linearGradient id="oC" x1="590" y1="320" x2="810" y2="545" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#22f0ff"/><stop offset=".36" stop-color="#14c8f2"/><stop offset=".56" stop-color="#5e9fb8"/><stop offset=".74" stop-color="#f0954a"/><stop offset="1" stop-color="#ff8a1a"/></linearGradient><radialGradient id="oS" cx="720" cy="395" r="170" gradientUnits="userSpaceOnUse"><stop offset=".68" stop-color="#0b1621" stop-opacity="0"/><stop offset="1" stop-color="#0b1621" stop-opacity=".5"/></radialGradient><linearGradient id="oG" x1="580" y1="320" x2="800" y2="540" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5ff4ff"/><stop offset=".5" stop-color="#7fd6ff"/><stop offset="1" stop-color="#ffab5c"/></linearGradient><linearGradient id="oF" x1="860" y1="60" x2="735" y2="470" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#d3d6da"/><stop offset=".55" stop-color="#f4f5f6"/><stop offset=".8" stop-color="#c2c6cb"/><stop offset="1" stop-color="#8e949b"/></linearGradient><linearGradient id="oD" x1="800" y1="245" x2="725" y2="345" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#121c26"/><stop offset="1" stop-color="#121c26" stop-opacity="0"/></linearGradient><filter id="oBl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter><filter id="oSh" x="-15%" y="-10%" width="130%" height="125%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity=".28"/></filter></defs><g filter="url(#oSh)"><circle cx="680" cy="441" r="225" fill="url(#oR)"/><circle cx="688" cy="437" r="203" fill="url(#oI)" stroke="#151b21" stroke-width="12"/><circle cx="688" cy="431" r="146" fill="none" stroke="url(#oG)" stroke-width="9" filter="url(#oBl)" opacity=".9"/><circle cx="688" cy="431" r="142" fill="url(#oC)"/><circle cx="688" cy="431" r="142" fill="url(#oS)"/><ellipse cx="650" cy="372" rx="70" ry="40" fill="#fff" opacity=".16" transform="rotate(-28 650 372)"/><path d="M736 233 C760 229 790 230 806 238 C818 262 815 292 800 312 C784 332 764 344 746 350 C738 320 730 296 722 280 C724 262 728 246 736 233Z" fill="url(#oD)"/><path d="M730 480 C752 430 790 390 830 352 C862 320 885 290 885 245 C886 228 883 214 880 205 C872 228 862 250 845 256 C832 260 826 240 828 222 C830 190 850 160 852 130 C855 105 852 80 845 60 C840 95 828 120 806 145 C786 165 765 185 760 205 C757 215 756 225 758 230 C778 222 800 220 810 238 C820 256 818 280 800 302 C775 330 748 365 737 400 C728 430 728 455 730 480Z" fill="url(#oF)" stroke="#6f757c" stroke-opacity=".55" stroke-width="2" stroke-linejoin="round"/><path d="M733 468 C733 435 742 400 760 372 C778 345 795 325 806 300" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g></svg>';

// round axis step: 1, 2, 2.5 or 5 × 10^n
function rptStep(x){ const p=Math.pow(10,Math.floor(Math.log10(x))), m=x/p; return p*(m<=1?1:m<=2?2:m<=2.5?2.5:m<=5?5:10); }
// horizontal bar chart as SVG: rows [{label, segs:[[value,color]] }] or a range [lo,hi]; value text at the bar end
function rptBars(rows,unit,dec,range){
  const W=680, L=190, R=78, rh=22, H=rows.length*rh+22, top=Math.max(1e-9,...rows.map(r=>range?r.hi:r.segs.reduce((s,x)=>s+x[0],0)));
  const st=rptStep(top/4), max=Math.ceil(top/st-1e-9)*st, ticks=[]; for(let t=0;t<=max+st/2;t+=st) ticks.push(t);
  const sx=v=>L+(W-L-R)*v/max, dt=st<1?(st<0.1?2:1):0;
  let g=ticks.map(t=>`<line x1="${sx(t)}" x2="${sx(t)}" y1="0" y2="${rows.length*rh}" stroke="${RPT_C.border}"/><text x="${sx(t)}" y="${rows.length*rh+13}" font-size="9" fill="${RPT_C.text2}" text-anchor="middle">${fmt(t,dt)}</text>`).join('');
  rows.forEach((r,k)=>{ const y=k*rh+4;
    g+=`<text x="${L-8}" y="${y+11}" font-size="10" fill="${RPT_C.text}" text-anchor="end"${r.bold?' font-weight="700"':''}>${esc(r.label)}</text>`;
    if(range){ g+=`<rect x="${sx(r.lo)}" y="${y}" width="${Math.max(1,sx(r.hi)-sx(r.lo))}" height="14" rx="3" fill="${r.bold?RPT_C.s1:RPT_C.grey}"/><text x="${sx(r.hi)+5}" y="${y+11}" font-size="9.5" fill="${RPT_C.text2}">${fmt(r.lo,dec)}–${fmt(r.hi,dec)} ${unit}</text>`; return; }
    let x0=0; r.segs.forEach(([v,c])=>{ if(v>0) g+=`<rect x="${sx(x0)}" y="${y}" width="${Math.max(.5,sx(x0+v)-sx(x0))}" height="14" fill="${c}"/>`; x0+=v; });
    g+=`<text x="${sx(x0)+5}" y="${y+11}" font-size="9.5" fill="${RPT_C.text2}">${fmt(x0,dec)} ${unit}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${g}</svg>`;
}
// monthly operating hours, stacked columns
function rptMonthly(r,i){
  const M=['J','F','M','A','M','J','J','A','S','O','N','D'], sc=8760/WX.T.length, W=680, H=158, L=34, B=18, T=8, cw=(W-L)/12;
  const sets=[[r.mFree[i],RPT_C.s3],[r.mPart[i],RPT_C.s1],[r.mMech[i],RPT_C.s2]], y=v=>T+(H-B-T)*(1-v/744);
  let g=[0,186,372,558,744].map(t=>`<line x1="${L}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="${RPT_C.border}"/><text x="${L-5}" y="${y(t)+3}" font-size="9" fill="${RPT_C.text2}" text-anchor="end">${t}</text>`).join('');
  M.forEach((m,k)=>{ let acc=0; const x=L+k*cw+cw*.18, w=cw*.64;
    sets.forEach(([a,c])=>{ const v=a[k]*sc; if(v>0) g+=`<rect x="${x}" y="${y(acc+v)}" width="${w}" height="${y(acc)-y(acc+v)}" fill="${c}"/>`; acc+=v; });
    g+=`<text x="${x+w/2}" y="${H-5}" font-size="9" fill="${RPT_C.text2}" text-anchor="middle">${m}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">${g}</svg>`;
}
const rptLegend=items=>`<div class="legend">${items.map(([l,c])=>`<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
const rptTable=id=>{ const h=$(id)?$(id).innerHTML:''; return h.replace(/class="click( best)?"/g,(m,b)=>b?'class="best"':'').replace(/ data-sys="[^"]*"/g,''); };

function buildReport(){
  const ids=order(), rec=RANK[0]?RES[RANK[0]]:null, st=WX.station, now=new Date();
  const date=now.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const loopTxt2=i=>`${i?'Air':'Liquid'} loop: ${fmt(P.loops[i].Qd/1000,1)} MW, supply ${P.loops[i].Ts} °C / return ${P.loops[i].Tr} °C`;
  const desSrc=isNaN(P.dbIn)||isNaN(P.wbIn)?(ashrae()?'ASHRAE 2025 extreme annual values':'hottest hours in the weather data'):'entered design values';
  const waterTxt='Compared for three cases: TSE available, water limited, no water';
  // ---- page 1: basis and recommendation
  let h=`<header class="top"><div class="logo">${RPT_LOGO}<span>Othman Energy <b>Lab</b></span></div><div class="meta">Cooling plant selection report<br>${date}</div></header>
  <h1>Cooling plant selection: ${esc(WX.name)}</h1>
  <p class="lead">Hour-by-hour comparison of ${OPTIONS.length} cooling plants for a ${fmt(P.Qd/1000,1)} MW data hall with liquid and air cooling loops, over a full weather year (8,760 h).</p>
  <div class="grid2">
    <div class="box"><h3>Site and climate</h3><dl class="kv">
      <dt>Location</dt><dd>${esc(WX.name)}</dd>
      ${st?`<dt>Weather station</dt><dd>${esc(st.station)} (WMO ${esc(st.wmo)})</dd><dt>Weather year</dt><dd>TMYx ${esc(st.period)}</dd><dt>ASHRAE climate zone</dt><dd>${esc((typeof cityId==='function'&&cityId()&&countyZone(cityId()))?`${countyZone(cityId())[0]} county (90.4 check), ${st.zone} station`:st.zone)}</dd>`:`<dt>Weather</dt><dd>${WX.synthetic?'Generated from monthly normals':'Uploaded weather file'}</dd>`}
      <dt>Case A</dt><dd>db ${fmt(P.cases.A.db,1)} °C / wb ${fmt(P.cases.A.wb,1)} °C</dd><dt>Case B</dt><dd>wb ${fmt(P.cases.B.wb,1)} °C / db ${fmt(P.cases.B.db,1)} °C</dd><dt>Design basis</dt><dd>${desSrc}</dd></dl></div>
    <div class="box"><h3>Load and site conditions</h3><dl class="kv">
      <dt>Cooling load</dt><dd>${fmt(P.Qd/1000,1)} MW at full IT load</dd><dt>Frequent load</dt><dd>${fmt(P.lf*100)}%</dd>
      <dt>Liquid loop</dt><dd>${fmt(P.loops[0].Qd/1000,1)} MW · ${P.loops[0].Ts}/${P.loops[0].Tr} °C</dd>
      <dt>Air loop</dt><dd>${fmt(P.loops[1].Qd/1000,1)} MW · ${P.loops[1].Ts}/${P.loops[1].Tr} °C</dd>
      <dt>Water</dt><dd>${esc(waterTxt)}</dd><dt>Tariffs</dt><dd>${P.tE} $/kWh · ${P.tW} $/m³ · ${P.tD} $/kW-month</dd></dl></div>
  </div>`;
  const WLr={plenty:'If TSE is available',limited:'If water is limited',none:'If there is no water'};
  h+=`<div class="rec"><div class="tl">Recommended</div><dl class="kv">${Object.keys(WLr).map(w=>`<dt>${WLr[w]}</dt><dd><b>${SCEN[w]?RES[SCEN[w]].o.name:'No system meets the constraints'}</b></dd>`).join('')}</dl></div>`;
  h+=`<h2>Results</h2><table><thead><tr><th class="l">System</th><th>Electricity GWh/yr</th><th>Peak MW</th><th>PUE</th><th>Water m³/yr</th><th>CO₂ t/yr</th><th>Running k$/yr</th><th>Initial M$</th></tr></thead><tbody>${ids.map(id=>{ const r=RES[id]; return `<tr><td class="l">${r.o.name}${r.excluded?`<span class="tag x">${r.excluded}</span>`:''}</td><td>${fmt(r.E/1000,1)}</td><td>${fmt(r.peak/1000,2)}</td><td>${r.pue.toFixed(3)}</td><td>${fmt(r.W)}</td><td>${fmt(r.co2)}</td><td>${fmt(r.run/1e3)}</td><td>${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)}</td></tr>`; }).join('')}</tbody></table>`;
  // ---- page 2: comparison charts
  const lab=id=>({label:RES[id].o.short});
  h+=`<section class="sec"><h2>Comparison</h2>
   <div class="chart"><div class="ct">Annual cooling electricity, MWh/yr</div>${rptLegend([['Chiller compressors',RPT_C.s1],['Heat-rejection fans',RPT_C.s4],['Pumps',RPT_C.grey2],['CRAH / FWU fans + CDU pumps',RPT_C.s2]])}
    ${rptBars(ids.map(id=>({...lab(id),segs:[[RES[id].Ec,RPT_C.s1],[RES[id].Ef,RPT_C.s4],[RES[id].Ep,RPT_C.grey2],[RES[id].Et,RPT_C.s2]]})),'MWh',0)}</div>
   <div class="chart"><div class="ct">Annual running cost of cooling, k$/yr</div>${rptLegend([['Electricity',RPT_C.s1],['Water',RPT_C.s3],['Demand charge',RPT_C.s4]])}
    ${rptBars(ids.map(id=>({...lab(id),segs:[[RES[id].costE/1e3,RPT_C.s1],[RES[id].costW/1e3,RPT_C.s3],[RES[id].costD/1e3,RPT_C.s4]]})),'k$',0)}</div>
  </section>`;
  // ---- recommended system (and the one picked in the Systems tab, if different)
  const shown=[...new Set([SCEN.plenty,SCEN.limited,SCEN.none,PICK].filter(Boolean))];
  shown.forEach(id=>{ const r=RES[id];
    h+=`<section class="sec"><h2>${r.o.name}</h2>${schematic(id)}
     <h3>Operation by month</h3>${rptLegend([['Free cooling',RPT_C.s3],['Partial',RPT_C.s1],['Chiller only',RPT_C.s2]])}
     ${P.loops.map((L,i)=>L.Q>0?`<div class="chart"><div class="ct">${i?'Air':'Liquid'} loop</div>${rptMonthly(r,i)}</div>`:'').join('')}
    </section>`; });
  // ---- inputs and method
  const inp=inputRows(document.querySelector('aside.inputs')||document,INPUT_NAMES), half=Math.ceil(inp.length/2);
  const it=a=>`<table><thead><tr><th class="l">Input</th><th>Value</th></tr></thead><tbody>${a.map(([l,v])=>`<tr><td class="l">${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
  h+=`<section class="sec"><h2>Inputs</h2><div class="cols2"><div>${it(inp.slice(0,half))}</div><div>${it(inp.slice(half))}</div></div>
   <div class="disc">Screening-level study made with the Othman Energy Lab Cooling Plant Selector (oenergylab.com). Results depend on the inputs listed and on typical equipment performance; confirm with vendor selections and a detailed design before procurement.</div></section>`;
  const title=`Cooling plant report – ${WX.name} – ${now.toISOString().slice(0,10)}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${RPT_CSS}</style></head>
<body><div class="bar"><button onclick="print()">Save as PDF / Print</button><span>In the print dialog choose “Save as PDF”.</span></div><div class="doc">${h}</div>
<script>addEventListener('load',()=>setTimeout(()=>print(),400));<\/script></body></html>`;
}
function openReport(){
  if(!RES) return;
  const w=window.open('','_blank');
  if(!w){ alert('Allow pop-ups for this site to open the PDF report.'); return; }
  w.document.open(); w.document.write(buildReport()); w.document.close();
}
$('xpdf').onclick=openReport;
