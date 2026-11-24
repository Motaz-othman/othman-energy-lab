// ---------- Cooling Plant Selector: page logic ----------
let WX=null,RES=null,DES=null,RANK=null,P=null,LOOP=0,PICK=null;

const groups=[...new Set(CITIES.map(c=>c.g))];
groups.forEach(g=>{ const og=document.createElement('optgroup'); og.label=g; CITIES.filter(c=>c.g===g).forEach(c=>{const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o);}); $('city').appendChild(og); });
RATES.forEach(r=>{ const d=document.createElement('div'); d.innerHTML=`<label>${r.l}</label><div class="row"><input type="number" id="rl_${r.id}" value="${r.lo}" step="5" min="0" aria-label="${r.l} low"><input type="number" id="rh_${r.id}" value="${r.hi}" step="5" min="0" aria-label="${r.l} high"></div>`; $('rates').appendChild(d); });

// built-in city id when the City tab is in use (none for an uploaded weather file); grid factor: city default or a world-average 0.45
const cityId=()=>$('tabFile').classList.contains('on')?null:$('city').value;
const cityEF=()=>GRID_EF[cityId()]??0.45;
function params(){
  // blank field falls back to its default; design dry-bulb / wet-bulb default is blank = auto
  const g=id=>{ const v=parseFloat($(id).value); return isNaN(v)?parseFloat($(id).defaultValue):v; };
  const Qd=g('it')*1000, lf=Math.min(1,Math.max(0.1,g('lf')/100)), lcp=Math.min(100,Math.max(0,g('lcp')))/100;
  $('airShare').textContent=`(${fmt((1-lcp)*100)}% of load)`;
  const loops=[
    {name:'LC',Ts:g('lcs'),Tr:Math.max(g('lcr'),g('lcs')+1),Qd:Qd*lcp,Q:Qd*lcp*lf},
    {name:'Air',Ts:g('acs'),Tr:Math.max(g('acr'),g('acs')+1),Qd:Qd*(1-lcp),Q:Qd*(1-lcp)*lf}];
  const rates={}; RATES.forEach(r=>rates[r.id]={lo:g('rl_'+r.id),hi:g('rh_'+r.id)});
  return {...BASIS,Qd,lf,loops,water:$('water').value,dbIn:g('dbD'),wbIn:g('wbD'),
    copA:g('copA'),copW:g('copW'),copMax:g('copMax'),unitWL:Math.max(100,g('unitWL')),unitWA:Math.max(100,g('unitWA')),unitA:Math.max(50,g('unitA')),derA:Math.max(0,g('derA'))/100,
    acMax:g('acMax'),wcMax:g('wcMax'),aCT:g('aCT'),aDC:g('aDC'),aAD:g('aAD'),aHX:g('aHX'),swAD:g('swAD'),cwSet:g('cwSet'),eAD:g('eAD'),coc:Math.max(1.5,g('coc')),
    kCT:g('kCT')/100,kDC:g('kDC')/100,kAD:g('kAD')/100,dpCDU:g('dpCDU'),dpPri:g('dpPri'),dpSec:g('dpSec'),dpCW:g('dpCW'),etaP:Math.min(1,Math.max(0.2,g('etaP')/100)),
    ef:isNaN(g('envEF'))?cityEF():g('envEF'),wkwh:isNaN(g('envW'))?waterKwh(cityId()):g('envW'),wco2:isNaN(g('envW'))&&cityId()?waterCo2(cityId()):null,refr:$('refr').value,chW:Math.max(0,g('chW')),chA:Math.max(0,g('chA')),leak:Math.max(0,g('leak'))/100,
    dpFWU:g('dpFWU')/1000,dtAir:Math.max(2,g('dtAir')),etaF:Math.min(1,Math.max(0.2,g('etaF')/100)),
    tE:g('tE'),tW:g('tW'),tD:g('tD'),
    red:g('red')/100,ups:Math.min(1,Math.max(0.5,g('ups')/100)),dloss:Math.min(0.3,Math.max(0,g('dloss')/100)),rates,...Object.fromEntries(WEIGHTS.map(w=>[w.id,w.v]))};
}
// built-in city: measured station year + ASHRAE design conditions; generated year if that cannot load
let cityReq=0;
function loadCity(){
  const c=CITIES.find(x=>x.id===$('city').value), n=++cityReq;
  stationYear(c).catch(()=>synthYear(c)).then(w=>{ if(n===cityReq){ WX=w; run(); } });
}
const ashrae=()=>WX&&WX.station&&WX.station.ashrae;
// ASHRAE 90.4 maximum annualized MLC: U.S. cities use the county climate zone (code compliance), others the station zone; none for an uploaded file
const mlcZone=()=>WX&&WX.station?((cityId()&&countyZone(cityId()))?countyZone(cityId())[0]:WX.station.zone):null;
const mlcLim=()=>mlcZone()?mlcMax(mlcZone(),P.Qd):null;
const mlcTxt=r=>{ const m=mlcLim(); return m==null?'':(r.mlc<=m?`Meets ASHRAE 90.4 MLC (${r.mlc.toFixed(3)} ≤ ${m.toFixed(2)})`:`Exceeds ASHRAE 90.4 MLC (${r.mlc.toFixed(3)} > ${m.toFixed(2)})`); };

function run(){
  if(!WX) return;
  // two coincident design cases: A = extreme dry-bulb + wet-bulb of the hottest hour; B = extreme wet-bulb + dry-bulb of the most humid hour
  const A=ashrae();
  P=params(); P.cases=designCases(WX,A,P.dbIn,P.wbIn); P.dbA=P.cases.A.db; P.dbD=P.cases.A.db; P.wbD=P.cases.B.wb;
  DES=designCheck(P); RES=simulate(WX,P,DES); RANK=score(RES,P,DES);
  renderReco(); renderOverview(); renderDes(); renderSystem(); renderEff(); renderCarbon(); renderCons(); renderRun(); renderCap(); renderClimate();
}
const order=()=>[...RANK,...OPTIONS.map(o=>o.id).filter(id=>!RANK.includes(id))];
const sel=()=>PICK||RANK[0]||OPTIONS[0].id;   // system shown in the Systems tab: user's pick, else the recommendation
const tag=(id,i)=>RES[id].excluded?`<span class="tag x">${RES[id].excluded}</span>`:(i===0?'<span class="tag ok">Recommended</span>':'');
const loopTxt=(arr)=>P.loops.map((L,i)=>L.Q>0?fmt(arr[i]):'–').join(' / ');
// basis label for peaks (annual figures are at the frequent load, stated in the notes)
const atPk='design case';
// annual water with the tower evaporation band (0.15–0.27 %/K) where it applies
const band=(c,lo,hi,d=0)=>hi>c*1.001?` (${fmt(lo,d)}–${fmt(hi,d)})`:'';
const wTxt=r=>`${fmt(r.W)} m³/yr${band(r.W,r.Wlo,r.Whi)}`;
const costTxt=r=>`${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)} M$`;
const runTxt=r=>`${fmt(r.run/1e6,2)} M$/yr`;
// simple payback of extra initial cost against air-cooled chillers, from the running cost saved
function payback(r){
  const b=RES.acc, save=b.run-r.run, extra=r.capMid-b.capMid;
  if(r.o.id==='acc') return {txt:'baseline',save:0};
  if(save<=0) return {txt:'no saving',save};
  if(extra<=0) return {txt:'immediate',save};
  return {txt:`${fmt(extra/save,1)} years`,save};
}

function renderReco(){
  const banners=(WX.synthetic?'<div class="banner">Approximate weather generated from monthly normals (station data could not load). Upload an EPW file for design-grade results.</div>':'')
    +(window.Chart?'':'<div class="banner">Charts could not load (no internet connection). Tables and results below are complete.</div>');
  const st=WX.station, C=P.cases, best=RANK.length?RES[RANK[0]]:null, acc=RES.acc;
  // the answer first, in one sentence; the context in one quiet line
  const verdict=best?''
    :'<div class="verdict-line"><b>No system meets every constraint.</b> Try allowing water, raising the loop supply temperatures, or checking the design conditions and chiller limits.</div>';
  // one card per system: four numbers that matter, the rest behind "More"
  const IC={el:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',pk:'<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',w:'<path d="M12 2.7s-6 6.4-6 11.3a6 6 0 0 0 12 0c0-4.9-6-11.3-6-11.3z"/>',co:'<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>'};
  const ic=k=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const MK=['el','pk','w','co'];
  const key=[['Electricity',r=>r.E,r=>`${fmt(r.E/1000,1)}`,'GWh/yr'],['Peak',r=>r.peak,r=>`${fmt(r.peak/1000,1)}`,'MW'],['Water',r=>r.W,r=>r.W<1?'0':fmt(r.W/1000,0),'thousand m³/yr'],['CO₂',r=>r.co2,r=>fmt(r.co2/1000,1),'kt/yr']];
  const bestV=key.map(([,v])=>RANK.length?Math.min(...RANK.map(i=>v(RES[i]))):null);
  const cards=order().map(id=>{ const r=RES[id], k=RANK.indexOf(id), d=DES[id];
    const status=r.excluded?`<span class="tag x">${r.excluded}</span>`:k===0?'<span class="recb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>Recommended</span>':`<span class="rank">${k+1}</span>`;
    const notes=[id==='acc'?'No free cooling':`Free cooling ${loopTxt(r.free)} h/yr (liquid / air)`];
    if(d.warns.length) notes.push(`<b style="color:var(--warn)">Condenser water above ${P.wcMax} °C at design: needs a chiller rated above ${P.wcMax} °C</b>`); else if(r.hotCW>0) notes.push(`Condenser water above ${P.wcMax} °C for ${fmt(r.hotCW)} h/yr`);
    if(mlcTxt(r)) notes.push(r.mlc<=mlcLim()?mlcTxt(r):`<b style="color:var(--bad)">${mlcTxt(r)}</b>`);
    const more=[['Annual PUE',r.pue.toFixed(3)],['Water',wTxt(r)],[`Water peak (${atPk})`,`${fmt(r.Wpeak,1)} m³/h`],['Facility peak (grid)',`${fmt(r.facPeak/1000,1)} MW`],['Running cost',runTxt(r)],['Initial cost',costTxt(r)],['Score',r.excluded?'–':`${fmt(r.score)} / 100`]];
    return `<div class="scard${k===0?' rec':''}${r.excluded?' off':''}">
      <div class="stop">${status}</div>
      <div class="sname" title="${esc(r.o.name)}">${r.o.short}</div>
      <div class="kn">${key.map(([l,v,t,u],j)=>{ const hi=!r.excluded&&v(r)<=bestV[j]*(1+1e-6)+1e-9; return `<div class="m-${MK[j]}${hi?' hi':''}"><span class="kl"><i>${ic(MK[j])}</i>${l}${hi?'<b class="best" title="Best value">✓</b>':''}</span><span class="kv">${t(r)}</span><span class="ku">${u}</span></div>`; }).join('')}</div>
      <details class="cmore"><summary>More</summary>
        <dl>${more.map(([l,v])=>`<div><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <ul>${notes.map(n=>`<li>${n}</li>`).join('')}</ul>
      </details>
      <button class="link" data-sys="${id}">See system →</button></div>`; });
  $('reco').innerHTML=`${banners}${verdict}<div class="scards">${cards.join('')}</div>`;
}

function renderOverview(){
  const sumF=r=>r.free.reduce((a,b)=>a+b,0);
  const cols=[
    {h:'Electricity GWh/yr',v:r=>r.E/1000,d:1,lo:true},
    {h:'Annual MLC',v:r=>r.mlc,d:3,lo:true},
    {h:'Annual PUE',v:r=>r.pue,d:3,lo:true},
    {h:`Electrical peak MW (cooling, ${atPk})`,v:r=>r.peak/1000,d:2,lo:true},
    {h:'Water m³/yr',v:r=>r.W,d:0,lo:true},
    {h:`Water peak m³/h (${atPk})`,v:r=>r.Wpeak,d:1,lo:true},
    {h:'Carbon t CO₂/yr',v:r=>r.co2,d:0,lo:true},
    {h:'Running cost M$/yr',v:r=>r.run/1e6,d:2,lo:true},
    {h:'Initial cost M$',v:r=>r.capMid,lo:true,txt:r=>`${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)}`},
    {h:'Free-cooling h (LC / air)',v:sumF,lo:false,txt:r=>loopTxt(r.free)}];
  const bestV=cols.map(c=>RANK.length?(c.lo?Math.min:Math.max)(...RANK.map(i=>c.v(RES[i]))):null);
  const rows=order().map(id=>{ const r=RES[id], k=RANK.indexOf(id);
    return `<tr class="click${k===0?' best':''}" data-sys="${id}"><td>${k>=0?k+1:'–'}</td><td>${r.o.name}${tag(id,k)}</td>
      <td>${r.excluded?'–':`<span class="sbar" style="width:${Math.max(2,r.score*0.5)}px"></span>${fmt(r.score)}`}</td>
      ${cols.map((c,j)=>{ const v=c.v(r), hi=!r.excluded&&Math.abs(v-bestV[j])<=Math.abs(bestV[j])*1e-6+1e-9;
        return `<td class="${hi?'hi':''}">${c.txt?c.txt(r):fmt(v,c.d)}</td>`; }).join('')}</tr>`; });
  $('tOv').innerHTML=table(['#','Option','Score (0–100)',...cols.map(c=>c.h)],rows);
}

function renderDes(){
  const rows=order().map(id=>{ const r=RES[id], d=DES[id];
    const res=!d.ok?'<span class="tag x">Fails</span>':d.warns.length?'<span class="tag">Warning</span>':'<span class="tag ok">Holds supply</span>';
    return `<tr><td>${r.o.name}</td><td>${res}</td><td>${fmt(d.cases.A.P/1000,2)}</td><td>${fmt(d.cases.B.P/1000,2)}</td><td>${fmt(d.P/1000,2)} (${d.worst})</td><td>${d.ratio.toFixed(3)}</td><td>${fmt(d.W,1)}</td><td>${fmt(d.Qr/1000,1)}</td><td class="l">${d.units.map(u=>`${u.N} × ${fmt(u.unit/1000,1)} MW`).join(' / ')}</td><td class="l">${[...d.issues,...d.warns].join('; ')||'–'}</td></tr>`; });
  $('tDes').innerHTML=table(['Option','Result','Case A MW','Case B MW','Design peak MW','kW/kW','Water m³/h','Heat rejection MW','Duty chillers (liquid / air loop)','Notes'],rows);
  const auto=isNaN(P.dbIn)||isNaN(P.wbIn);
  $('desNote').textContent=`Checked at 100% load at Case A (${fmt(P.cases.A.db,1)} °C db / ${fmt(P.cases.A.wb,1)} °C wb) and Case B (${fmt(P.cases.B.db,1)} °C db / ${fmt(P.cases.B.wb,1)} °C wb)${auto?(ashrae()?', from the ASHRAE extreme annual values with coincident values from the hourly weather':', from the hottest and most humid hours in the weather data'):''}. Design peak = the higher of the two. Heat rejection = loop load + compressor power. Air-cooled chillers above ${P.acMax} °C fail and are excluded; condenser water above ${P.wcMax} °C gives a warning.`;
}

function renderSystem(){
  const id=sel(), r=RES[id], d=DES[id], s=SYS[id], k=RANK.indexOf(id);
  $('sysSeg').innerHTML=OPTIONS.map(o=>{ const j=RANK.indexOf(o.id);
    return `<button data-sys="${o.id}" class="${o.id===id?'on':''}"><span class="rk">${j>=0?j+1:'✕'}</span>${o.short}</button>`; }).join('');
  const status=r.excluded?`<span class="tag x">${r.excluded}</span>`:k===0?'<span class="tag ok">Recommended</span>':`<span class="tag">Rank ${k+1} of ${RANK.length}</span>`;
  $('sysHead').innerHTML=`<h2>${r.o.name}</h2>${status}${r.excluded?'':`<span class="note">score ${fmt(r.score)}</span>`}`;
  $('sysHow').textContent=s.how;
  $('sysSvg').innerHTML=schematic(id);
  $('sysKpi').innerHTML=kpis([[`${fmt(r.E/1000,1)} GWh`,'Cooling electricity per year'],[r.mlc.toFixed(3),'Annual MLC (kW/kW)'],[r.pue.toFixed(3),'Annual PUE (incl. losses)'],
    [`${fmt(r.peak/1000,2)} MW`,`Electrical peak, cooling plant (${atPk})`],[`${fmt(r.facPeak/1000,1)} MW`,`Facility peak, grid connection (cooling ${fmt(r.coolShare*100)}%)`],[`${fmt(r.Wpeak,1)} m³/h`,`Water peak, make-up (${atPk})`],
    [wTxt(r),'Water per year (evaporation band)'],[runTxt(r),'Running cost, cooling'],[costTxt(r),'Initial cost (estimate)'],[payback(r).txt,'Payback vs air-cooled chillers'],[`${fmt(d.Qr/1000,1)} MW`,'Heat rejection at design']]);
  $('sysDes').innerHTML=(d.ok?`Design cases: Case A ${fmt(d.cases.A.P/1000,2)} MW, Case B ${fmt(d.cases.B.P/1000,2)} MW; typical-year maximum ${fmt(r.yMax/1000,2)} MW${r.yAbove?` (${fmt(r.yAbove)} h above Cases A/B, up to +${fmt(r.yExcess/1000,2)} MW)`:''}; design peak ${fmt(r.peak/1000,2)} MW (${r.peakCase==='year'?'typical-year hour':'Case '+r.peakCase}). Duty chillers ${d.units.map(u=>`${u.N} × ${fmt(u.unit/1000,1)} MW`).join(' (liquid) / ')} (air), plus 1 standby each.`
    :`<span class="tag x">Fails design day</span> ${d.issues.join('; ')}`)+(d.warns.length?` <span class="tag">Warning</span> ${d.warns[0]}.`:'');
  // annual operating mode per loop
  $('sysModes').innerHTML=P.loops.map((L,i)=>{ if(L.Q<=0) return '';
    const seg=[['Free cooling',r.free[i],'--s3'],['Partial',r.part[i],'--s1'],['Chiller only',r.mech[i],'--s2']].filter(x=>x[1]>0);
    return `<div class="mode"><div class="ml"><b>${i?'Air':'Liquid'} loop</b> ${L.Ts}/${L.Tr} °C</div>
      <div class="mbar">${seg.map(([l,v,c])=>`<span style="flex:${v};background:var(${c})" title="${l}: ${fmt(v)} h/yr"></span>`).join('')}</div>
      <div class="mv">${seg.map(([l,v])=>`${l} <b>${fmt(v)} h</b> (${fmt(v/87.6)}%)`).join(' · ')}</div></div>`; }).join('');
  // equipment and cost
  const cap=P.Qd*(1+P.red);
  $('sysComp').innerHTML=table(['Component','Role','Sized MW','Cost M$'],r.o.comp.map(c=>{ const rt=P.rates[c];
    return `<tr><td>${RATES.find(x=>x.id===c).l}</td><td class="l">${ROLE[c](r.o)}</td><td>${fmt(cap/1000,1)}</td><td>${fmt(cap*rt.lo/1e6,1)}–${fmt(cap*rt.hi/1e6,1)}</td></tr>`; }));
  $('compNote').textContent=`Each component sized for ${fmt(P.Qd/1000,1)} MW load + ${fmt(P.red*100)}% redundancy. Pumps, CDUs, piping and controls are not included.`;
  $('sysPros').innerHTML=`<h3>Strengths</h3><ul>${s.pros.map(x=>`<li>${x}</li>`).join('')}</ul><h3>Watch-outs</h3><ul>${s.cons.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  renderMonthly();
}

function renderEff(){
  const m=mlcLim(), zone=mlcZone();
  const res=r=>m==null?'–':(r.mlc<=m?'<span class="tag ok">Meets</span>':'<span class="tag x">Exceeds</span>');
  const rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${r.mlc.toFixed(3)}</td><td>${m==null?'–':m.toFixed(2)}</td><td>${res(r)}</td><td>${r.peakRatio.toFixed(3)}</td><td>${r.cop?r.cop.toFixed(1):'–'}</td><td>${loopTxt(r.free)}</td><td>${loopTxt(r.mech)}</td></tr>`; });
  $('tEff').innerHTML=table(['Option','Annual MLC',`ASHRAE 90.4 max MLC${zone?' (zone '+esc(zone)+')':''}`,'90.4 result','Peak kW/kW','Avg chiller COP','Free-cooling h (LC / air)','Chiller-only h (LC / air)'],rows);
  const ids=RANK;
  $('effTitle').textContent=ids.length?`Annual MLC: ${RES[ids[0]].o.short} ${RES[ids[0]].mlc.toFixed(3)} kW/kW`:'Annual MLC';
  hbar('cEff',ids.map(id=>RES[id].o.short),ids.map(id=>RES[id].mlc),'kW per kW of cooling',3);
}

function renderCarbon(){
  const b=RES.acc, rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${fmt(r.co2E)}</td><td>${fmt(r.co2W)}${band(r.co2W,r.co2Wlo,r.co2Whi)}</td><td>${fmt(r.co2R)}</td><td>${fmt(r.co2)}${band(r.co2,r.co2Lo,r.co2Hi)}</td><td>${fmt(r.co2IT,1)}</td><td>${id==='acc'?'–':fmt(b.co2-r.co2)}</td></tr>`; });
  $('tCO2').innerHTML=table(['Option','Electricity t CO₂/yr','Water supply t CO₂/yr','Refrigerant t CO₂e/yr','Total t CO₂e/yr','kg CO₂e per MWh IT','Saving vs air-cooled t/yr'],rows);
  const rf=REFRIGERANTS[P.refr];
  $('co2Note').textContent=`Grid factor ${P.ef.toFixed(3)} kg CO₂/kWh${isNaN(parseFloat($('envEF').value))?(cityId()?((CITIES.find(c=>c.id===cityId())||{}).g==='Americas'&&cityId()!=='saopaulo'?' (EPA eGRID2023 rev 2 subregion)':cityId()==='sydney'?' (Australian NGA factors, NSW 2025–26)':' (Our World in Data / Ember, latest year)'):' (world average; enter the local grid)'):''}; ${P.wco2?`water supply ${fmt(P.wco2[1],2)} kg CO₂e/m³ (band ${fmt(P.wco2[0],2)}–${fmt(P.wco2[2],2)}: City of Phoenix 2022 GHG inventory, plus Central Arizona Project conveyance at the top)`:`water supply ${fmt(P.wkwh,1)} kWh/m³`}; tower water band 0.15–0.27 %/K evaporation; ${rf.name} GWP ${fmt(rf.gwp,rf.gwp<10?2:0)}, charge ${P.chW} / ${P.chA} kg/kW (water / air-cooled), leak ${fmt(P.leak*100,1)}%/yr on duty + 1 standby chillers. Cooling plant only; IT electricity not included.`;
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'t CO₂e/yr',color:css('--text2')},beginAtZero:true};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} t`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cCO2',{type:'bar',data:{labels,datasets:[ds('Electricity','co2E',css('--s1')),ds('Water supply','co2W',css('--s3')),ds('Refrigerant leakage','co2R',css('--s2'),true)]},options:o});
  $('co2Title').textContent=ids.length?`Annual carbon: lowest ${fmt(Math.min(...ids.map(i=>RES[i].co2)))} t CO₂e/yr`:'Annual carbon by source';
}

function renderCons(){
  const rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${fmt(r.E)}</td><td>${fmt(r.Ec)}</td><td>${fmt(r.Ef)}</td><td>${fmt(r.Ep)}</td><td>${fmt(r.Et)}</td><td>${fmt(r.Eloss)}</td><td>${r.pue.toFixed(3)}</td><td>${fmt(r.peak/1000,2)}</td><td>${fmt(r.facPeak/1000,1)}</td><td>${fmt(r.coolShare*100)}%</td><td>${fmt(r.W)}${band(r.W,r.Wlo,r.Whi)}</td><td>${fmt(r.Wpeak,1)}${band(r.Wpeak,r.WpeakLo,r.WpeakHi,1)}</td></tr>`; });
  $('tCons').innerHTML=table(['Option','Cooling MWh/yr','Chillers','Heat-rejection fans','Pumps','CRAH / FWU / CDU','Electrical losses MWh/yr','Annual PUE',`Electrical peak MW (cooling, ${atPk})`,'Facility peak MW (grid)','Cooling share of facility peak','Water m³/yr',`Water peak m³/h (${atPk})`],rows);
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'MWh/yr',color:css('--text2')}};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} MWh`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cEl',{type:'bar',data:{labels,datasets:[ds('Chiller compressors','Ec',css('--s1')),ds('Heat-rejection fans','Ef',css('--s4')),ds('Pumps','Ep',css('--grey2')),ds('CRAH / FWU fans + CDU pumps','Et',css('--s2'),true)]},options:o});
  $('elTitle').textContent=ids.length?`Annual electricity: lowest ${fmt(Math.min(...ids.map(i=>RES[i].E))/1000,1)} GWh/yr`:'Annual electricity';
  const zeroW=ids.filter(i=>RES[i].W<1).length;
  $('wTitle').textContent=zeroW?`Annual water: ${zeroW} option${zeroW>1?'s':''} use none`:'Annual water';
  hbar('cW',labels,ids.map(id=>RES[id].W),'m³/yr',0);
}

function renderRun(){
  const rows=order().map((id,i)=>{ const r=RES[id], pb=payback(r);
    return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td>${fmt(r.costE/1e3)}</td><td>${fmt(r.costW/1e3)}</td><td>${fmt(r.costD/1e3)}</td><td>${fmt(r.run/1e3)}</td><td>${id==='acc'?'–':fmt(pb.save/1e3)}</td><td>${pb.txt}</td></tr>`; });
  $('tRun').innerHTML=table(['Option','Electricity k$/yr','Water k$/yr','Demand k$/yr','Total k$/yr','Saving vs air-cooled k$/yr','Simple payback'],rows);
  $('runNote').textContent=`Cooling only (not IT electricity), at the frequent load. Tariffs: electricity ${P.tE} $/kWh, water ${P.tW} $/m³, demand ${P.tD} $/kW per month on the cooling peak. Simple payback = extra initial cost (mid estimate) over air-cooled chillers ÷ running cost saved; no discounting, maintenance or tariff escalation.`;
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'k$/yr',color:css('--text2')},beginAtZero:true};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} k$/yr`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]/1e3),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cRun',{type:'bar',data:{labels,datasets:[ds('Electricity','costE',css('--s1')),ds('Water','costW',css('--s3')),ds('Demand charge','costD',css('--s4'),true)]},options:o});
  $('runTitle').textContent=ids.length?`Annual running cost: lowest ${fmt(Math.min(...ids.map(i=>RES[i].run))/1e6,2)} M$/yr`:'Annual running cost';
}

function renderCap(){
  const rows=order().map((id,i)=>{ const r=RES[id]; return `<tr class="${i===0&&!r.excluded?'best':''}"><td>${r.o.name}${tag(id,i)}</td><td class="l">${r.capParts.map(c=>RATES.find(x=>x.id===c).l).join(' + ')}</td><td>${fmt(r.capLo/1e6,1)}–${fmt(r.capHi/1e6,1)}</td><td>${fmt(r.capLo/P.Qd)}–${fmt(r.capHi/P.Qd)}</td></tr>`; });
  $('tCap').innerHTML=table(['Option','Components','Estimate M$','$ per kW of load'],rows);
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y';
  o.scales.x={grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'M$ (low – high)',color:css('--text2')},beginAtZero:true};
  o.scales.y={grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={callbacks:{label:c=>`${fmt(c.raw[0],1)} – ${fmt(c.raw[1],1)} M$`}};
  mk('cCap',{type:'bar',data:{labels,datasets:[{data:ids.map(id=>[RES[id].capLo/1e6,RES[id].capHi/1e6]),backgroundColor:ids.map((id,i)=>i===0?css('--s1'):css('--grey')),borderRadius:4,borderSkipped:false,barThickness:16}]},options:o});
  $('capTitle').textContent=ids.length?`Estimated initial cost: ${costTxt(RES[ids[0]])} for the recommended option`:'Estimated initial cost range';
}

function renderMonthly(){
  const id=sel(), r=RES[id], M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], sc=8760/WX.T.length, L=P.loops[LOOP];
  $('mTitle').textContent=`Monthly operating hours, ${LOOP===0?'liquid':'air'} loop (${L.Ts}/${L.Tr} °C)`;
  const o=baseOpts(); o.scales.x.stacked=true; o.scales.y.stacked=true; o.scales.y.title={display:true,text:'hours',color:css('--text2')};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} h`}};
  mk('cM',{type:'bar',data:{labels:M,datasets:[
    {label:'Free cooling',data:r.mFree[LOOP].map(v=>v*sc),backgroundColor:css('--s3'),borderColor:css('--surface'),borderWidth:{top:2}},
    {label:'Partial',data:r.mPart[LOOP].map(v=>v*sc),backgroundColor:css('--s1'),borderColor:css('--surface'),borderWidth:{top:2}},
    {label:'Chiller only',data:r.mMech[LOOP].map(v=>v*sc),backgroundColor:css('--s2'),borderColor:css('--surface'),borderWidth:{top:2},borderRadius:{topLeft:4,topRight:4}}]},options:o});
}

let CLDEV='dc';   // basis for the climate charts: dry coolers (dry-bulb) or cooling towers (wet-bulb)
function renderClimate(){
  const A=ashrae();
  $('clKpi').innerHTML=kpis(A?[[`${fmt(A.db04,1)} °C`,'Dry-bulb, 0.4% (ASHRAE)'],[`${fmt(P.dbD,1)} °C`,'Design dry-bulb'],[`${fmt(A.wb04,1)} °C`,'Wet-bulb, 0.4% evaporation (ASHRAE)'],[`${fmt(P.wbD,1)} °C`,'Design wet-bulb']]
    :[[`${fmt(pct(WX.T,0.996),1)} °C`,'Dry-bulb, 0.4% exceeded'],[`${fmt(P.dbD,1)} °C`,'Design dry-bulb'],[`${fmt(pct(WX.Twb,0.996),1)} °C`,'Wet-bulb, 0.4% exceeded'],[`${fmt(P.wbD,1)} °C`,'Design wet-bulb']]);
  const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], sc=8760/WX.T.length, dc=CLDEV==='dc';
  const appr=dc?P.aDC:P.aCT+P.aHX;                         // water leaves the outdoor device at outdoor temp + approach
  const outT=h=>(dc?WX.T[h]:WX.Twb[h])+appr;
  // monthly temperature summary for the tooltips
  const ms=M.map(()=>({n:0,db:0,wb:0,dbx:-99,wbx:-99}));
  WX.T.forEach((t,h)=>{ const m=ms[WX.mon[h]]; m.n++; m.db+=t; m.wb+=WX.Twb[h]; m.dbx=Math.max(m.dbx,t); m.wbx=Math.max(m.wbx,WX.Twb[h]); });
  const tip=i=>{ const m=ms[i]; return m.n?[`Dry-bulb mean ${fmt(m.db/m.n,1)} °C, max ${fmt(m.dbx,1)} °C`,`Wet-bulb mean ${fmt(m.wb/m.n,1)} °C, max ${fmt(m.wbx,1)} °C`]:[]; };
  P.loops.forEach((L,i)=>{
    const free=Array(12).fill(0), part=Array(12).fill(0), none=Array(12).fill(0);
    WX.T.forEach((t,h)=>{ const o=outT(h), m=WX.mon[h]; if(o<=L.Ts) free[m]+=sc; else if(o<L.Tr) part[m]+=sc; else none[m]+=sc; });
    const tot=a=>a.reduce((x,y)=>x+y,0);
    $('clTitle'+i).textContent=`${i?'Air cooling loop (AC)':'Liquid cooling loop (LC)'}, ${L.Ts}/${L.Tr} °C`;
    $('clSub'+i).textContent=`Free cooling ${fmt(tot(free))} h/yr · partial ${fmt(tot(part))} h · chiller only ${fmt(tot(none))} h. Free below ${fmt(L.Ts-appr,1)} °C ${dc?'dry-bulb':'wet-bulb'}, partial below ${fmt(L.Tr-appr,1)} °C.`;
    const o=baseOpts(); o.scales.x.stacked=true; o.scales.y.stacked=true; o.scales.y.max=750; o.scales.y.title={display:true,text:'hours',color:css('--text2')};
    o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} h`,footer:c=>tip(c[0].dataIndex)}};
    mk('cCl'+i,{type:'bar',data:{labels:M,datasets:[
      {label:'Free cooling',data:free,backgroundColor:css('--s3'),borderColor:css('--surface'),borderWidth:{top:2}},
      {label:'Partial',data:part,backgroundColor:css('--s1'),borderColor:css('--surface'),borderWidth:{top:2}},
      {label:'Chiller only',data:none,backgroundColor:css('--s2'),borderColor:css('--surface'),borderWidth:{top:2},borderRadius:{topLeft:4,topRight:4}}]},options:o});
  });
  $('clNote').textContent=`Climate only, before choosing a system: hours each month when the outdoor ${dc?'dry-bulb':'wet-bulb'} + ${fmt(appr,1)} K approach (${dc?'dry cooler':'tower + plate HX'}) is below the loop supply temperature (free cooling) or below its return temperature (partial). Hover over a month for its temperatures. The Systems tab shows how each complete system actually runs.`;
}
document.querySelectorAll('#climSeg button').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#climSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); CLDEV=b.dataset.dev; renderClimate(); });

// result tabs
function showPane(p){
  document.querySelectorAll('#rtabs button').forEach(b=>{ const on=b.dataset.p===p; b.classList.toggle('on',on); b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1; });
  document.querySelectorAll('.pane').forEach(el=>el.hidden=el.id!=='p-'+p);
  Object.values(charts).forEach(c=>c.resize());
}
function openSystem(id){ PICK=id; renderSystem(); showPane('sys'); }
$('rtabs').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) showPane(b.dataset.p); });
$('rtabs').addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
  const bs=[...document.querySelectorAll('#rtabs button')], i=bs.indexOf(document.activeElement); if(i<0) return;
  const b=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length]; b.focus(); showPane(b.dataset.p); });
$('results').addEventListener('click',e=>{ const el=e.target.closest('[data-sys]'); if(el) openSystem(el.dataset.sys); });

// events
$('tabCity').onclick=()=>{ $('tabCity').classList.add('on'); $('tabFile').classList.remove('on'); $('cityPane').hidden=false; $('filePane').hidden=true; loadCity(); };
$('tabFile').onclick=()=>{ $('tabFile').classList.add('on'); $('tabCity').classList.remove('on'); $('cityPane').hidden=true; $('filePane').hidden=false; };
$('city').onchange=loadCity;
$('drop').onclick=()=>$('file').click();
['dragover','dragenter'].forEach(e=>$('drop').addEventListener(e,ev=>{ev.preventDefault();$('drop').style.borderColor=css('--brand');}));
$('drop').addEventListener('dragleave',()=>$('drop').style.borderColor='');
$('drop').addEventListener('drop',ev=>{ev.preventDefault();$('drop').style.borderColor=''; if(ev.dataTransfer.files[0]) readFile(ev.dataTransfer.files[0]);});
$('file').onchange=e=>{ if(e.target.files[0]) readFile(e.target.files[0]); };
function readFile(f){ const rd=new FileReader();
  rd.onload=()=>{ try{ const t=rd.result, epw=/\.epw$/i.test(f.name)||/^LOCATION,/.test(t);
    WX=epw?parseEPW(t):parseCSV(t); if(!epw) WX.name=f.name.replace(/\.[^.]+$/,'');
    $('fileInfo').innerHTML=`Loaded <b>${esc(WX.name)}</b>: ${fmt(WX.T.length)} hours.`; run(); } catch(err){ $('fileInfo').innerHTML=`<div class="err">${esc(err.message)}</div>`; } };
  rd.readAsText(f); }
// sample weather CSV in the upload format, generated from the city selected in the City tab
const sampleCity=()=>CITIES.find(c=>c.id===$('city').value);
const showSampleNote=()=>{ $('csvSampleNote').textContent=`8,760 hours for ${sampleCity().name} (the city selected in the City tab).`; };
$('csvSample').onclick=()=>{ const c=sampleCity(), y=WX&&WX.station&&WX.name===c.name?WX:null, url=URL.createObjectURL(new Blob([sampleCSV(c,y)],{type:'text/csv'}));
  const a=document.createElement('a'); a.href=url; a.download=`weather-sample-${c.id}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000); };
$('city').addEventListener('change',showSampleNote); showSampleNote();
document.querySelectorAll('#inputs input:not([type=file]), #inputs select:not(#city)').forEach(el=>el.addEventListener('input',run));
document.querySelectorAll('#loopSeg button').forEach(b=>b.onclick=()=>{ document.querySelectorAll('#loopSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); LOOP=+b.dataset.l; renderMonthly(); });
if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',run);
showPane('ov');
loadCity();

// input labels that repeat between the two loops
const INPUT_NAMES={lcp:'Liquid loop share (%)',lcs:'Liquid loop supply (°C)',lcr:'Liquid loop return (°C)',acs:'Air loop supply (°C)',acr:'Air loop return (°C)'};
// ---------- export: every results table as an Excel workbook, one sheet each ----------
function exportReport(){
  if(!RES) return;
  const st=WX.station, M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], sc=8760/WX.T.length;
  const loopName=i=>i?'Air loop':'Liquid loop', B=v=>({v,b:true});
  const withNote=(rows,id)=>{ const n=id&&$(id)&&$(id).textContent.trim(); return n?[...rows,[],['Note: '+n]]:rows; };
  const sheet=(name,id,note,extra)=>({name,rows:withNote(tableRows($(id)),note),head:[0],...extra});
  const rank=RANK.map((id,k)=>[k+1,RES[id].o.name,Math.round(RES[id].score)]);
  const summary=[
    [B('Othman Energy Lab · Cooling Plant Selector report')],
    ['Exported',new Date().toLocaleString('en-GB')],
    ['Source','https://www.oenergylab.com/data-centers/cooling-plant/'],
    [],
    [B('Site and weather')],
    ['Location',WX.name],
    ...(st?[['Station',`${st.station} (WMO ${st.wmo})`],['Weather year',`TMYx ${st.period}, climate.onebuilding.org`],['ASHRAE climate zone',(cityId()&&countyZone(cityId())?`county zone ${countyZone(cityId())[0]} (${countyZone(cityId())[1]}, IECC 2021 / ASHRAE 169) for the 90.4 check; station zone ${st.zone}`:`ASHRAE climate zone ${st.zone}`)]]:[['Weather',WX.synthetic?'generated from monthly normals':'uploaded file']]),
    ['Case A: dry-bulb / coincident wet-bulb (°C)',+P.cases.A.db.toFixed(1),+P.cases.A.wb.toFixed(1)],['Case B: wet-bulb / coincident dry-bulb (°C)',+P.cases.B.wb.toFixed(1),+P.cases.B.db.toFixed(1)],
    [],
    [B('Load')],
    ['Cooling load (MW)',P.Qd/1000],
    ...P.loops.map((L,i)=>[`${loopName(i)}: load MW, supply / return °C`,L.Qd/1000,`${L.Ts} / ${L.Tr}`]),
    [],
    [B('Ranking')],[B('#'),B('Option'),B('Score (0–100)')],...rank,
    ...order().filter(id=>RES[id].excluded).map(id=>['–',RES[id].o.name,'Excluded: '+RES[id].excluded]),
    [],
    [B('Inputs')],[B('Input'),B('Value')],...inputRows(document.querySelector('aside.inputs')||document,INPUT_NAMES)];
  // equipment of every option
  const cap=P.Qd*(1+P.red), equip=[['Option','Component','Role','Sized MW','Cost low M$','Cost high M$']];
  order().forEach(id=>{ const r=RES[id]; r.o.comp.forEach(c=>{ const rt=P.rates[c]; equip.push([r.o.name,RATES.find(x=>x.id===c).l,ROLE[c](r.o),+(cap/1000).toFixed(2),+(cap*rt.lo/1e6).toFixed(2),+(cap*rt.hi/1e6).toFixed(2)]); }); });
  // operating hours by month: free cooling / partial / chiller only, per option and loop
  const hrs=[['Option','Loop','Mode',...M,'Total h/yr']];
  order().forEach(id=>{ const r=RES[id]; P.loops.forEach((L,i)=>{ if(L.Q<=0) return;
    [['Free cooling',r.mFree],['Partial',r.mPart],['Chiller only',r.mMech]].forEach(([m,a])=>{ const v=a[i].map(x=>Math.round(x*sc)); hrs.push([r.o.name,`${loopName(i)} ${L.Ts}/${L.Tr} °C`,m,...v,v.reduce((s,x)=>s+x,0)]); }); }); });
  const sheets=[
    {name:'Summary',rows:summary,widths:[46,48,20]},
    sheet('Overview','tOv'),
    sheet('Design day','tDes','desNote'),
    sheet('Efficiency','tEff'),
    sheet('Carbon','tCO2','co2Note'),
    sheet('Energy and water','tCons'),
    sheet('Running cost','tRun','runNote'),
    sheet('Initial cost','tCap'),
    {name:'Equipment',rows:withNote(equip,'compNote'),head:[0]},
    {name:'Operating hours',rows:hrs,head:[0]}];
  const slug=String(WX.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'site';
  downloadBlob(xlsxBlob(sheets),`cooling-plant-report-${slug}-${new Date().toISOString().slice(0,10)}.xlsx`);
}
$('xport').onclick=exportReport;
