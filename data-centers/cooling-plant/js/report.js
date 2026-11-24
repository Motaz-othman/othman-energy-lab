// ---------- PDF report: a print-ready A4 page built from the current results; saved with the browser's "Save as PDF" ----------
const RPT_C={s1:'#2a78d6',s2:'#eb6834',s3:'#1baf7a',s4:'#eda100',grey:'#c9c8c3',grey2:'#9f9e99',brand:'#0e7c57',text:'#0b0b0b',text2:'#52514e',border:'#e3e2de'};
const RPT_CSS=`
:root{--bg:#f6f6f4;--surface:#fff;--border:#e3e2de;--text:#0b0b0b;--text2:#52514e;--muted:#6f6e69;--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--grey:#c9c8c3;--grey2:#9f9e99;--good:#1a7f37;--warn:#b26b00;--bad:#c62828;--brand:#0e7c57;--brand-ink:#0b6b4a}
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
.rec{border:1.5px solid var(--brand);background:#f1f8f4;border-radius:10px;padding:12px 14px;margin:12px 0;break-inside:avoid}
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
.tag{display:inline-block;font-size:7pt;font-weight:700;border-radius:9px;padding:0 6px;margin-left:5px;background:#e7f3ec;color:var(--brand-ink);white-space:nowrap}.tag.x{background:#fbeaea;color:var(--bad)}.tag.ok{background:#e7f3ec;color:var(--good)}
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
const RPT_LOGO='<svg viewBox="0 0 26 26"><rect width="26" height="26" rx="6" fill="#0b0b0b"/><ellipse cx="12.4" cy="13.4" rx="6.6" ry="7" fill="none" stroke="#fcfcfb" stroke-width="2.6"/><path d="M19.4 3 L11.4 13.6 H15.4 L9.6 22.8 L22 10.6 H18.6 L22.6 3 Z" fill="#4cc99a" stroke="#0b0b0b" stroke-width="1.3" stroke-linejoin="round"/></svg>';

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
  if(rec){
    const pb=payback(rec), acc=RES.acc;
    h+=`<div class="rec"><div class="tl">Recommended if TSE is available · score ${fmt(rec.score)} of 100</div><div class="nm">${rec.o.name}</div><p class="why">If water is limited: <b>${SCEN.limited?RES[SCEN.limited].o.name:'–'}</b>. If there is no water: <b>${SCEN.none?RES[SCEN.none].o.name:'none meets the constraints'}</b>.</p>
      <div class="kpis">
        <div class="kpi"><div class="v">${fmt(rec.E/1000,1)} GWh/yr</div><div class="l">Cooling electricity</div></div>
        <div class="kpi"><div class="v">${rec.pue.toFixed(3)}</div><div class="l">Annual PUE</div></div>
        <div class="kpi"><div class="v">${fmt(rec.peak/1000,2)} MW</div><div class="l">Electrical peak, cooling (100% load)</div></div>
        <div class="kpi"><div class="v">${fmt(rec.W)} m³/yr</div><div class="l">Water</div></div>
        <div class="kpi"><div class="v">${fmt(rec.run/1e6,2)} M$/yr</div><div class="l">Running cost, cooling</div></div>
        <div class="kpi"><div class="v">${fmt(rec.capLo/1e6,1)}–${fmt(rec.capHi/1e6,1)} M$</div><div class="l">Initial cost (estimate)</div></div>
        <div class="kpi"><div class="v">${pb.txt}</div><div class="l">Payback vs air-cooled chillers</div></div>
        <div class="kpi"><div class="v">${fmt(rec.mlc,3)}</div><div class="l">Annual MLC, kW/kW${mlcLim()!=null?` · ASHRAE 90.4 max ${mlcLim().toFixed(2)}: ${rec.mlc<=mlcLim()?'meets':'<b style="color:#c62828">exceeds</b>'}`:' (ASHRAE 90.4)'}</div></div>
      </div>
      <p class="why">${rec.o.id==='acc'?'':`Against air-cooled chillers it saves <b>${fmt(Math.max(0,acc.E-rec.E)/1000,1)} GWh/yr</b> of electricity and <b>${fmt(Math.max(0,acc.peak-rec.peak)/1000,2)} MW</b> of peak cooling power. `}Free cooling covers ${fmt(rec.free[0])} h/yr on the liquid loop and ${fmt(rec.free[1])} h/yr on the air loop. ${DES[rec.o.id].ok?`It holds the supply temperatures at the design condition (${fmt(P.dbD,1)} °C dry-bulb / ${fmt(P.wbD,1)} °C wet-bulb).`:''}</p></div>`;
  } else h+=`<div class="rec"><div class="nm">No system meets every constraint</div><p class="why">Allow water, raise the loop supply temperatures, or check the design conditions and chiller limits.</p></div>`;
  h+=`<h2>Ranking</h2><table><thead><tr><th>#</th><th class="l">System</th><th>Score</th><th>Electricity GWh/yr</th><th>Peak MW</th><th>Water m³/yr</th><th>Carbon t CO₂/yr</th><th>Running M$/yr</th><th>Initial M$</th></tr></thead><tbody>${ids.map(id=>{ const r=RES[id], k=RANK.indexOf(id);
    return `<tr class="${k===0?'best':''}"><td>${k>=0?k+1:'–'}</td><td class="l">${r.o.name}${r.excluded?`<span class="tag x">${r.excluded}</span>`:k===0?'<span class="tag ok">Recommended</span>':''}</td><td>${r.excluded?'–':fmt(r.score)}</td><td>${fmt(r.E/1000,1)}</td><td>${fmt(r.peak/1000,2)}</td><td>${fmt(r.W)}</td><td>${fmt(r.co2)}</td><td>${fmt(r.run/1e6,2)}</td><td>${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)}</td></tr>`; }).join('')}</tbody></table>
  <div class="note">Score: energy, water, peak power, initial cost and carbon normalised across the feasible options and weighted 4 / 3 / 3 / 2 / 3 (water doubled when limited). Annual figures at the frequent load; peaks at 100% load on the worst hour of the year.</div>`;
  // ---- page 2: comparison charts
  const lab=id=>({label:RES[id].o.short,bold:id===RANK[0]});
  h+=`<section class="sec"><h2>Comparison</h2>
   <div class="chart"><div class="ct">Annual cooling electricity, MWh/yr</div>${rptLegend([['Chiller compressors',RPT_C.s1],['Heat-rejection fans',RPT_C.s4],['Pumps',RPT_C.grey2],['CRAH / FWU fans + CDU pumps',RPT_C.s2]])}
    ${rptBars(ids.map(id=>({...lab(id),segs:[[RES[id].Ec,RPT_C.s1],[RES[id].Ef,RPT_C.s4],[RES[id].Ep,RPT_C.grey2],[RES[id].Et,RPT_C.s2]]})),'MWh',0)}</div>
   <div class="chart"><div class="ct">Electrical peak of the cooling plant, MW (100% load, worst hour)</div>${rptBars(ids.map(id=>({...lab(id),segs:[[RES[id].peak/1000,RPT_C.s2]]})),'MW',2)}</div>
   <div class="chart"><div class="ct">Annual water, m³/yr</div>${rptBars(ids.map(id=>({...lab(id),segs:[[RES[id].W,RPT_C.s1]]})),'m³',0)}</div>
   <div class="chart"><div class="ct">Annual running cost of cooling, k$/yr</div>${rptLegend([['Electricity',RPT_C.s1],['Water',RPT_C.s3],['Demand charge',RPT_C.s4]])}
    ${rptBars(ids.map(id=>({...lab(id),segs:[[RES[id].costE/1e3,RPT_C.s1],[RES[id].costW/1e3,RPT_C.s3],[RES[id].costD/1e3,RPT_C.s4]]})),'k$',0)}</div>
   <div class="chart"><div class="ct">Estimated initial cost, M$ (low – high)</div>${rptBars(ids.map(id=>({...lab(id),lo:RES[id].capLo/1e6,hi:RES[id].capHi/1e6})),'M$',1,true)}</div>
  </section>`;
  // ---- recommended system (and the one picked in the Systems tab, if different)
  const shown=[...new Set([RANK[0],PICK].filter(Boolean))];
  shown.forEach(id=>{ const r=RES[id], s=SYS[id], d=DES[id], k=RANK.indexOf(id), cap=P.Qd*(1+P.red);
    h+=`<section class="sec"><h2>${k===0?'Recommended system':'Selected system'}: ${r.o.name}</h2><p>${s.how}</p>${schematic(id).replace(/<div class="note">/,'<div class="note">')}
     <h3>Equipment and cost</h3><table><thead><tr><th class="l">Component</th><th class="l">Role</th><th>Sized MW</th><th>Cost M$</th></tr></thead><tbody>${r.o.comp.map(c=>{ const rt=P.rates[c];
       return `<tr><td class="l">${RATES.find(x=>x.id===c).l}</td><td class="l">${ROLE[c](r.o)}</td><td>${fmt(cap/1000,1)}</td><td>${fmt(cap*rt.lo/1e6,1)}–${fmt(cap*rt.hi/1e6,1)}</td></tr>`; }).join('')}</tbody></table>
     <div class="note">Each component sized for ${fmt(P.Qd/1000,1)} MW + ${fmt(P.red*100)}% redundancy. Pumps, CDUs, piping and controls not included.</div>
     <div class="cols2"><div><h3>Strengths</h3><ul>${s.pros.map(x=>`<li>${x}</li>`).join('')}</ul></div><div><h3>Watch-outs</h3><ul>${s.cons.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>
     <h3>Design cases</h3><p>${d.ok?`At 100% load: Case A (db ${fmt(P.cases.A.db,1)} °C / wb ${fmt(P.cases.A.wb,1)} °C) ${fmt(d.cases.A.P/1000,2)} MW; Case B (wb ${fmt(P.cases.B.wb,1)} °C / db ${fmt(P.cases.B.db,1)} °C) ${fmt(d.cases.B.P/1000,2)} MW. Design peak ${fmt(d.P/1000,2)} MW (Case ${d.worst}), heat rejection ${fmt(d.Qr/1000,1)} MW. Duty chillers ${d.units.map(u=>u.N+" × "+fmt(u.unit/1000,1)+" MW").join(" / ")}, plus 1 standby per loop.${d.warns.length?" Warning: "+d.warns[0]+".":""}`:`<span class="tag x">Fails design day</span> ${d.issues.join("; ")}`}</p>
     <h3>Operating modes over the year</h3>${rptLegend([['Free cooling (chillers off)',RPT_C.s3],['Partial free cooling',RPT_C.s1],['Chillers only',RPT_C.s2]])}
     ${P.loops.map((L,i)=>L.Q>0?`<div class="chart"><div class="ct">${i?'Air':'Liquid'} loop ${L.Ts}/${L.Tr} °C: free ${fmt(r.free[i])} h · partial ${fmt(r.part[i])} h · chillers only ${fmt(r.mech[i])} h per year</div>${rptMonthly(r,i)}</div>`:'').join('')}
    </section>`; });
  // ---- detailed tables
  h+=`<section class="sec"><h2>Detailed results</h2>
   <h3>Design-day check</h3>${rptTable('tDes')}<div class="note">${esc($('desNote').textContent)}</div>
   <h3>Efficiency</h3>${rptTable('tEff')}
   <h3>Energy and water</h3>${rptTable('tCons')}
   <h3>Carbon emissions</h3>${rptTable('tCO2')}<div class="note">${esc($('co2Note').textContent)}</div>
   <h3>Running cost</h3>${rptTable('tRun')}<div class="note">${esc($('runNote').textContent)}</div>
   <h3>Initial cost</h3>${rptTable('tCap')}<div class="note">Rate-based estimate, not a quotation: capacity × redundancy × low/high rate for each component. Excludes building works, electrical and controls.</div></section>`;
  // ---- inputs and method
  const inp=inputRows(document.querySelector('aside.inputs')||document,INPUT_NAMES), half=Math.ceil(inp.length/2);
  const it=a=>`<table><thead><tr><th class="l">Input</th><th>Value</th></tr></thead><tbody>${a.map(([l,v])=>`<tr><td class="l">${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
  const meth=$('p-meth')?$('p-meth').querySelector('ul.method'):null;
  h+=`<section class="sec"><h2>Inputs</h2><div class="cols2"><div>${it(inp.slice(0,half))}</div><div>${it(inp.slice(half))}</div></div>
   ${meth?`<h2>Method and assumptions</h2><ul class="method">${meth.innerHTML}</ul>`:''}
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
