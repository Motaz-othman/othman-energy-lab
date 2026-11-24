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
