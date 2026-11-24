// ---------- Cooling Plant Selector: page logic ----------
let SCEN={},WX=null,RES=null,DES=null,RANK=null,P=null,LOOP=0,PICK=null;

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
  // the pick for each water case: TSE available, water limited, no water
  SCEN={}; ['plenty','limited','none'].forEach(w=>{ const c=Object.fromEntries(Object.entries(RES).map(([k,v])=>[k,{...v}])); SCEN[w]=score(c,{...P,water:w},DES)[0]||null; });
  renderReco(); renderSystem(); renderEff(); renderCarbon(); renderCons(); renderRun(); renderClimate();
}
const order=()=>[...RANK,...OPTIONS.map(o=>o.id).filter(id=>!RANK.includes(id))];
const sel=()=>PICK||RANK[0]||OPTIONS[0].id;   // system shown in the Systems tab: user's pick, else the recommendation
const tag=(id,i)=>RES[id].excluded?`<span class="tag x">${RES[id].excluded}</span>`:'';
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
  const key=[['Electricity',r=>r.E,r=>`${fmt(r.E/1000,1)}`,'GWh/yr'],['Peak power',r=>r.peak,r=>`${fmt(r.peak/1000,1)}`,'MW'],['Water',r=>r.W,r=>r.W<1?'0':fmt(r.W/1000,0),'k m³/yr'],['CO₂',r=>r.co2,r=>fmt(r.co2/1000,1),'kt/yr']];
  const bestV=key.map(([,v])=>RANK.length?Math.min(...RANK.map(i=>v(RES[i]))):null);
  const WL={plenty:'If TSE is available',limited:'If water is limited',none:'If there is no water'};
  const D='<path d="M12 2.7s-6 6.4-6 11.3a6 6 0 0 0 12 0c0-4.9-6-11.3-6-11.3z"/>', sv=p=>`<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const WI={plenty:sv(D+'<path d="M9 14.5h6"/><path d="M12 11.5v6"/>'),limited:sv(D+'<path d="M6.2 14h11.6"/>'),none:sv(D+'<path d="M3 3l18 18"/>')};
  const recs=id=>Object.keys(WL).filter(w=>SCEN[w]===id);
  const cOrder=[...new Set([...Object.keys(WL).map(w=>SCEN[w]).filter(Boolean),...order()])];
  const cards=cOrder.map(id=>{ const r=RES[id], k=RANK.indexOf(id), d=DES[id], rw=recs(id);
    const status=r.excluded?`<span class="tag x">${r.excluded}</span>`:rw.map(w=>`<span class="wrec w-${w}"><i>${WI[w]}</i><span><small>Recommended</small>${WL[w]}</span></span>`).join('');
    const warn=d.warns.length?`Condenser water above ${P.wcMax} °C at design`:(mlcLim()!=null&&r.mlc>mlcLim()?'Exceeds ASHRAE 90.4 MLC':'');
    return `<div class="scard${rw.length?' rec':''}${r.excluded?' off':''}">
      <div class="stop">${status}</div>
      <div class="sname" title="${esc(r.o.name)}">${r.o.short}</div>
      <div class="kn">${key.map(([l,v,t,u],j)=>{ const hi=!r.excluded&&v(r)<=bestV[j]*(1+1e-6)+1e-9; return `<div class="m-${MK[j]}${hi?' hi':''}"><span class="kl"><i>${ic(MK[j])}</i>${l}${hi?'<b class="best" title="Best value">Best</b>':''}</span><span class="kvr"><span class="kv">${t(r)}</span><span class="ku">${u}</span></span></div>`; }).join('')}</div>
      ${warn?`<div class="cwarn">${warn}</div>`:''}
      <button class="link" data-sys="${id}">See system →</button></div>`; });
  $('reco').innerHTML=`${banners}${verdict}<div class="scards">${cards.join('')}</div>`;
}



function renderSystem(){
  const id=sel(), r=RES[id];
  $('sysSeg').innerHTML=OPTIONS.map(o=>`<button data-sys="${o.id}" class="${o.id===id?'on':''}">${RES[o.id].excluded?'<span class="rk">✕</span>':''}${o.short}</button>`).join('');
  const WLs={plenty:'if TSE is available',limited:'if water is limited',none:'if there is no water'};
  const status=r.excluded?`<span class="tag x">${r.excluded}</span>`:Object.keys(WLs).filter(w=>SCEN[w]===id).map(w=>`<span class="tag ok">Recommended ${WLs[w]}</span>`).join('');
  $('sysHead').innerHTML=`<h2>${r.o.name}</h2>${status}`;
  $('sysSvg').innerHTML=schematic(id);
  renderMonthly();
}

function renderEff(){
  const m=mlcLim();
  const res=r=>m==null?'':(r.mlc<=m?' <span class="tag ok">Meets 90.4</span>':' <span class="tag x">Exceeds 90.4</span>');
  const rows=order().map(id=>{ const r=RES[id]; return `<tr><td>${r.o.name}${tag(id)}</td><td>${r.pue.toFixed(3)}</td><td>${r.mlc.toFixed(3)}${res(r)}</td><td>${fmt(r.facPeak/1000,1)}</td></tr>`; });
  $('tEff').innerHTML=table(['Option','Annual PUE',`Annual MLC${m!=null?' (90.4 max '+m.toFixed(2)+')':''}`,'Facility peak MW (grid)'],rows);
}

function renderCarbon(){
  const rf=REFRIGERANTS[P.refr];
  $('co2Note').textContent=`Grid ${P.ef.toFixed(3)} kg CO₂/kWh · water ${P.wco2?`${fmt(P.wco2[1],2)} kg CO₂e/m³`:`${fmt(P.wkwh,1)} kWh/m³`} · ${rf.name} GWP ${fmt(rf.gwp,rf.gwp<10?2:0)}, leak ${fmt(P.leak*100,1)}%/yr.`;
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'t CO₂e/yr',color:css('--text2')},beginAtZero:true};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} t`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cCO2',{type:'bar',data:{labels,datasets:[ds('Electricity','co2E',css('--s1')),ds('Water supply','co2W',css('--s3')),ds('Refrigerant leakage','co2R',css('--s2'),true)]},options:o});
}

function renderCons(){
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'MWh/yr',color:css('--text2')}};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} MWh`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cEl',{type:'bar',data:{labels,datasets:[ds('Chiller compressors','Ec',css('--s1')),ds('Heat-rejection fans','Ef',css('--s4')),ds('Pumps','Ep',css('--grey2')),ds('CRAH / FWU fans + CDU pumps','Et',css('--s2'),true)]},options:o});
}

function renderRun(){
  const rows=order().map(id=>{ const r=RES[id]; return `<tr><td>${r.o.name}${tag(id)}</td><td>${fmt(r.run/1e3)}</td><td>${costTxt(r)}</td><td>${payback(r).txt}</td></tr>`; });
  $('tRun').innerHTML=table(['Option','Running cost k$/yr','Initial cost (estimate)','Payback vs air-cooled'],rows);
  $('runNote').textContent=`Electricity ${P.tE} $/kWh · water ${P.tW} $/m³ · demand ${P.tD} $/kW-month. Initial cost excludes building works, electrical and controls.`;
  const ids=RANK, labels=ids.map(id=>RES[id].o.short);
  const o=baseOpts(); o.indexAxis='y'; o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'k$/yr',color:css('--text2')},beginAtZero:true};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} k$/yr`}};
  const ds=(lab,k,col,last)=>({label:lab,data:ids.map(id=>RES[id][k]/1e3),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:18,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cRun',{type:'bar',data:{labels,datasets:[ds('Electricity','costE',css('--s1')),ds('Water','costW',css('--s3')),ds('Demand charge','costD',css('--s4'),true)]},options:o});
}


function renderMonthly(){
  const id=sel(), r=RES[id], M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], sc=8760/WX.T.length, L=P.loops[LOOP];
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
    $('clTitle'+i).textContent=`${i?'Air':'Liquid'} cooling loop, ${L.Ts}/${L.Tr} °C`;
    const o=baseOpts(); o.scales.x.stacked=true; o.scales.y.stacked=true; o.scales.y.max=750; o.scales.y.title={display:true,text:'hours',color:css('--text2')};
    o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${fmt(c.raw)} h`,footer:c=>tip(c[0].dataIndex)}};
    mk('cCl'+i,{type:'bar',data:{labels:M,datasets:[
      {label:'Free cooling',data:free,backgroundColor:css('--s3'),borderColor:css('--surface'),borderWidth:{top:2}},
      {label:'Partial',data:part,backgroundColor:css('--s1'),borderColor:css('--surface'),borderWidth:{top:2}},
      {label:'Chiller only',data:none,backgroundColor:css('--s2'),borderColor:css('--surface'),borderWidth:{top:2},borderRadius:{topLeft:4,topRight:4}}]},options:o});
  });
  $('clNote').textContent='Hover over a month for its temperatures.';
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
showPane('sys');
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
  const WLx={plenty:'If TSE is available',limited:'If water is limited',none:'If there is no water'}, rank=Object.keys(WLx).map(w=>[WLx[w],SCEN[w]?RES[SCEN[w]].o.name:'–']);
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
    [B('Recommended')],...rank,
    ...order().filter(id=>RES[id].excluded).map(id=>['–',RES[id].o.name,'Excluded: '+RES[id].excluded]),
    [],
    [B('Inputs')],[B('Input'),B('Value')],...inputRows(document.querySelector('aside.inputs')||document,INPUT_NAMES)];
  // operating hours by month: free cooling / partial / chiller only, per option and loop
  const hrs=[['Option','Loop','Mode',...M,'Total h/yr']];
  order().forEach(id=>{ const r=RES[id]; P.loops.forEach((L,i)=>{ if(L.Q<=0) return;
    [['Free cooling',r.mFree],['Partial',r.mPart],['Chiller only',r.mMech]].forEach(([m,a])=>{ const v=a[i].map(x=>Math.round(x*sc)); hrs.push([r.o.name,`${loopName(i)} ${L.Ts}/${L.Tr} °C`,m,...v,v.reduce((s,x)=>s+x,0)]); }); }); });
  const sheets=[
    {name:'Summary',rows:summary,widths:[46,48,20]},
    {name:'Results',rows:[['Option','Electricity MWh/yr','Peak power MW','Facility peak MW','Annual PUE','Annual MLC','Water m³/yr','CO₂ t/yr','Running cost k$/yr','Initial cost low M$','Initial cost high M$'],...order().map(id=>{ const r=RES[id]; return [r.o.name,Math.round(r.E),+(r.peak/1000).toFixed(2),+(r.facPeak/1000).toFixed(1),+r.pue.toFixed(3),+r.mlc.toFixed(3),Math.round(r.W),Math.round(r.co2),Math.round(r.run/1e3),+(r.capLo/1e6).toFixed(1),+(r.capHi/1e6).toFixed(1)]; })],head:[0]},
    {name:'Operating hours',rows:hrs,head:[0]}];
  const slug=String(WX.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'site';
  downloadBlob(xlsxBlob(sheets),`cooling-plant-report-${slug}-${new Date().toISOString().slice(0,10)}.xlsx`);
}
$('xport').onclick=exportReport;
