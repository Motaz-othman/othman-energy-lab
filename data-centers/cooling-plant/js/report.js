// ---------- PDF report: a print-ready A4 page built from the current results; saved with the browser's "Save as PDF" ----------
const RPT_C={s1:'#2a78d6',s2:'#eb6834',s3:'#1baf7a',s4:'#eda100',grey:'#c9c8c3',grey2:'#9f9e99',brand:'#a8326e',text:'#0b0b0b',text2:'#52514e',border:'#e3e2de'};
const RPT_CSS=`
:root{--bg:#f6f6f4;--surface:#fff;--border:#e3e2de;--text:#0b0b0b;--text2:#52514e;--muted:#6f6e69;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--grey:#c9c8c3;--grey2:#9f9e99;--good:#1a7f37;--warn:#b26b00;--bad:#c62828;--brand:#a8326e;--brand-ink:#8e2a5d}
@page{size:A4;margin:14mm 13mm 16mm}
@page{@bottom-left{content:"Othman Energy Lab · Cooling Plant Selector";font:8pt system-ui,sans-serif;color:#6f6e69}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:8pt system-ui,sans-serif;color:#6f6e69}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e9e9e6;color:var(--text);font:9.5pt/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text","Inter","Helvetica Neue","Segoe UI",Roboto,sans-serif}
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
const RPT_LOGO='<img src="data:image/png;base64,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" alt="" style="width:26px;height:26px">';

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
