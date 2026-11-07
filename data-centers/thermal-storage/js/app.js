// ---------- Thermal Storage Tank: page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const money=v=>Math.abs(v)>=1e6?`$${fmt(v/1e6,2)}M`:`$${fmt(v/1e3)}k`;
const rgba=(hex,a)=>{ const h=hex.replace('#',''), n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };

// stratified tank drawing with its diameter and height
function tankSvg(D,H){
  const s=Math.min(110/Math.max(D,1),150/Math.max(H,1)), w=Math.max(30,D*s), h=Math.max(24,H*s), x=(150-w)/2, y=24, ry=Math.max(5,w*0.12);
  return `<svg class="tanksvg" viewBox="0 0 170 ${y+h+ry+34}" role="img" aria-label="Tank ${fmt(D,1)} m diameter by ${fmt(H,1)} m high">
  <defs><linearGradient id="strat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${rgba(css('--s2'),.55)}"/><stop offset=".48" style="stop-color:${rgba(css('--s2'),.25)}"/><stop offset=".52" style="stop-color:${rgba(css('--s1'),.25)}"/><stop offset="1" style="stop-color:${rgba(css('--s1'),.6)}"/></linearGradient></defs>
  <path class="shell" d="M${x} ${y} V${y+h} A${w/2} ${ry} 0 0 0 ${x+w} ${y+h} V${y} Z" style="fill:url(#strat)"/>
  <ellipse class="shell" cx="${x+w/2}" cy="${y}" rx="${w/2}" ry="${ry}"/>
  <path class="dim" d="M${x} ${y+h+ry+12}H${x+w}M${x} ${y+h+ry+8}v8M${x+w} ${y+h+ry+8}v8"/>
  <text x="${x+w/2}" y="${y+h+ry+28}" text-anchor="middle">Ø ${fmt(D,1)} m</text>
  <path class="dim" d="M${x+w+10} ${y}V${y+h}M${x+w+6} ${y}h8M${x+w+6} ${y+h}h8"/>
  <text x="${x+w+16}" y="${y+h/2+4}">${fmt(H,1)} m</text></svg>`;
}

// ---------- purpose cards ----------
function setMode(m){
  document.querySelectorAll('.mode').forEach(b=>{ const on=b.dataset.m===m; b.classList.toggle('on',on); b.setAttribute('aria-selected',on); });
  $('pEmg').hidden=m!=='emg'; $('pGrid').hidden=m!=='grid';
  history.replaceState(null,'',m==='grid'?'#grid':'#emergency');
  if(m==='grid'){ if(!GWX) gLoadCity(); else Object.values(charts).forEach(c=>c.resize()); }
}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.m));

// ---------- card 1: emergency ride-through ----------
function runEmg(){
  const i={Q:num('eQ',20000),min:num('eMin',10),Ts:num('eTs',20),Tr:num('eTr',30),eff:num('eEff',85)/100,margin:num('eMar',20)/100,Hmax:num('eH',15),costV:num('eCost',500)};
  const r=emergencyTank(i);
  $('eRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${fmt(r.V)} <small>m³</small></div><div class="l">Tank volume, with ${fmt(i.margin*100)}% margin</div></div>
      <div class="bn"><div class="v">Ø ${fmt(r.D,1)} × ${fmt(r.H,1)} <small>m</small></div><div class="l">Diameter × height · ${fmt(r.area)} m² footprint</div></div>
      <div class="bn"><div class="v">${fmt(i.min,1)} <small>min</small></div><div class="l">Full cooling at ${fmt(i.Q/1000,1)} MW without chillers</div></div>
      <div class="bn"><div class="v">${money(r.cost)}</div><div class="l">Indicative tank cost</div></div>
    </div>
    <div class="tankrow">${tankSvg(r.D,r.H)}
      <div class="verdict">A <b>${fmt(r.V)} m³</b> chilled-water tank keeps <b>${fmt(i.Q/1000,1)} MW</b> of cooling running for <b>${fmt(i.min,1)} minutes</b> while the generators start and the chillers restart. At 75% load the same tank lasts about <b>${fmt(i.min/0.75,1)} minutes</b>.</div></div>`;
  $('eDet').innerHTML=`${table(['Item','Value'],[
      `<tr><td>Cooling to store</td><td>${fmt(r.E)} kWh</td></tr>`,
      `<tr><td>Supply / return difference</td><td>${fmt(r.dT)} K</td></tr>`,
      `<tr><td>Net volume (before margin)</td><td>${fmt(r.Vnet)} m³</td></tr>`,
      `<tr><td>Volume with ${fmt(i.margin*100)}% margin</td><td>${fmt(r.V)} m³</td></tr>`,
      `<tr><td>Water mass</td><td>${fmt(r.V)} t</td></tr>`])}
    <ul class="method"><li>Volume = load × time ÷ (4,180 kJ/m³K × ΔT × tank efficiency), plus the safety margin.</li>
    <li>The tank pumps and controls must run on UPS power during the gap. The tank is shaped up to the height limit, with height between 1 and 4 times the diameter for good stratification.</li></ul>`;
}
document.querySelectorAll('#inEmg input').forEach(el=>el.addEventListener('input',runEmg));

// ---------- card 2: grid power saving ----------
let GWX=null, GST=null, GI=null, PAYMODE='utility', gTimer=null, gReq=0;
[...new Set(CITIES.map(c=>c.g))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  CITIES.filter(c=>c.g===g).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o); }); $('gCity').appendChild(og); });
OPTIONS.forEach(o=>{ const e=document.createElement('option'); e.value=o.id; e.textContent=o.name; $('gSys').appendChild(e); });
function gLoadCity(){ const c=CITIES.find(x=>x.id===$('gCity').value), n=++gReq; $('gStatus').textContent='Loading weather…';
  stationYear(c).catch(()=>synthYear(c)).then(w=>{ if(n===gReq){ GWX=w; gSchedule(0); } }); }
$('gCity').onchange=gLoadCity;
$('gTabCity').onclick=()=>{ $('gTabCity').classList.add('on'); $('gTabFile').classList.remove('on'); $('gCityPane').hidden=false; $('gFilePane').hidden=true; gLoadCity(); };
$('gTabFile').onclick=()=>{ $('gTabFile').classList.add('on'); $('gTabCity').classList.remove('on'); $('gCityPane').hidden=true; $('gFilePane').hidden=false; };
$('gFile').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=()=>{ try{ const t=rd.result, epw=/\.epw$/i.test(f.name)||/^LOCATION,/.test(t); GWX=epw?parseEPW(t):parseCSV(t); if(!epw) GWX.name=f.name.replace(/\.[^.]+$/,'');
    $('gFileInfo').innerHTML=`Loaded <b>${esc(GWX.name)}</b>: ${fmt(GWX.T.length)} hours.`; gSchedule(0); }
    catch(err){ $('gFileInfo').innerHTML=`<div class="err">${esc(err.message)}</div>`; } };
  rd.readAsText(f); };

function gInputs(){
  const pp=parseFloat($('gPp').value);
  return {Q:num('gQ',20000),lf:num('gLf',80)/100,night:num('gNight',80)/100,sys:$('gSys').value,Ts:num('gTs',20),Tr:Math.max(num('gTr',30),num('gTs',20)+1),
    pBase:num('gPb',.1),pPeak:isNaN(pp)?null:pp,pk0:num('gPk0',12),pk1:num('gPk1',18),tD:num('gDc',0),
    costV:num('gCost',500),life:num('gLife',20),infraKW:num('gInfra',700),chKW:num('gChk',230),
    reserve:Math.min(.8,num('gReserve',20)/100),margin:num('gMar',20)/100,days:Math.round(num('gDays',3)),window:num('gWin',80)/100,
    eff:num('gEff',85)/100,Hmax:num('gH',15),mode:PAYMODE};
}
// the study takes a moment: run it shortly after the last change
function gSchedule(ms){ clearTimeout(gTimer); $('gStatus').textContent='Calculating…'; gTimer=setTimeout(gRun,ms??400); }
function gRun(){
  if(!GWX) return;
  GI=gInputs(); GST=peakStudy(GI,GWX,{a:num('gKa',1.2)/100,w:num('gKw',.7)/100});
  const keep=$('gTd').value;
  $('gTd').innerHTML='<option value="">Recommended (balanced)</option>'+GST.cases.map(c=>`<option value="${c.Td}">${fmt(c.Td,1)} °C</option>`).join('');
  $('gTd').value=GST.cases.some(c=>String(c.Td)===keep)?keep:'';
  gRender();
}
function gRender(){
  if(!GST) return;
  const td=$('gTd').value===''?null:parseFloat($('gTd').value), {rec:c,why}=pickCase(GST,PAYMODE,td), b=GST.base;
  const st=GWX.station;
  $('gStatus').textContent=`${GWX.name} · ${GST.sys.name}`;
  const pay= PAYMODE==='infra'
    ? (c.payI===0?{v:'Immediate',l:`saves ${money(c.upfront)} upfront vs a plant sized for ${fmt(b.extDB,1)} °C`}:isFinite(c.payI)?{v:`${fmt(c.payI,1)} <small>yrs</small>`,l:'payback incl. infrastructure saving'}:{v:'No payback',l:'on these costs'})
    : (isFinite(c.payU)?{v:`${fmt(c.payU,1)} <small>yrs</small>`,l:'payback from utility costs'}:{v:'No payback',l:'from utility costs alone'});
  const msg={
    best:`Size the cooling plant for <b>${fmt(c.Td,1)} °C</b> instead of <b>${fmt(b.extDB,1)} °C</b>. The tank covers the hottest hours, with ${fmt(GI.reserve*100)}% kept in reserve and a ${fmt(GI.margin*100)}% sizing margin.`,
    chosen:`Sizing the cooling plant for <b>${fmt(c.Td,1)} °C</b> instead of <b>${fmt(b.extDB,1)} °C</b>${c.normalOK?'':', but the tank <b>does not recharge</b> in time during a heatwave at this setting'}.`,
    nopay:`With these utility costs the tank doesn’t pay back: the energy is the same, only moved in time. A <b>peak-hour price</b> or <b>demand charge</b> makes it pay, or switch to <b>Including infrastructure</b>. Shown: the plant sized for the ASHRAE 0.4% level, <b>${fmt(c.Td,1)} °C</b>.`,
    norecharge:`No tank size recharges in time during a ${GI.days}-day heatwave with these inputs. Try a lower night IT load or fewer heatwave days.`}[why];
  const flag=c.normalOK&&!c.worstOK?` <span class="note">Recharge relies on IT at ${fmt(GI.night*100)}% at night; at full IT load all night, the tank would not refill during a heatwave.</span>`:'';
  $('gRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">−${fmt(c.cut/1000,2)} <small>MW</small></div><div class="l">Rated cooling power ${fmt(c.Prated0/1000,1)} → ${fmt(c.Prated/1000,1)} MW (−${fmt(100*c.cut/c.Prated0,1)}%)</div></div>
      <div class="bn"><div class="v">${fmt(c.V)} <small>m³</small></div><div class="l">Tank · Ø ${fmt(c.D,1)} × ${fmt(c.H,1)} m high</div></div>
      <div class="bn"><div class="v">~${fmt(c.above)} <small>h/yr</small></div><div class="l">Hours the tank works (above ${fmt(c.Td,1)} °C at full IT load)</div></div>
      <div class="bn"><div class="v${isFinite(PAYMODE==='infra'?c.payI:c.payU)?' good':''}">${pay.v}</div><div class="l">${pay.l}</div></div>
    </div>
    <div class="verdict${why==='nopay'||why==='norecharge'||(why==='chosen'&&!c.normalOK)?' warn':''}">${msg}${flag}</div>
    <div class="payrow">Payback based on
      <div class="seg" id="paySeg"><button data-p="utility" class="${PAYMODE==='utility'?'on':''}">Utility costs only</button><button data-p="infra" class="${PAYMODE==='infra'?'on':''}">Including infrastructure</button></div></div>`;
  document.querySelectorAll('#paySeg button').forEach(x=>x.onclick=()=>{ PAYMODE=x.dataset.p; gRender(); });
  gCharts(c);
  gDetails(c,b,st);
}
function gCharts(c){
  const lab=Array.from({length:24},(_,j)=>`${String((6+j)%24).padStart(2,'0')}:00`);
  const orig=c.graph.orig.map(x=>x.P/1000), tank=c.graph.tank.map(x=>x.P/1000), cap=Array(24).fill(c.Prated/1000);
  $('gChartTitle').textContent=`Hottest day at full IT load (ASHRAE extreme ${fmt(GST.base.extDB,1)} °C): cooling plant power, MW`;
  const o=baseOpts(); o.scales.y.title={display:true,text:'MW',color:css('--text2')};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:x=>`${x.dataset.label}: ${fmt(x.raw,2)} MW`}};
  mk('gChart',{type:'line',data:{labels:lab,datasets:[
    {label:'Without tank',data:orig,borderColor:css('--grey2'),borderWidth:2,pointRadius:0,tension:.3},
    {label:'With tank',data:tank,borderColor:css('--brand'),borderWidth:2.5,pointRadius:0,tension:.3,
     fill:{target:0,above:rgba(css('--s1'),.18),below:rgba(css('--s2'),.3)}},
    {label:'New rated power',data:cap,borderColor:css('--brand'),borderWidth:1,borderDash:[5,4],pointRadius:0}]},options:o});
  const so=baseOpts(); so.scales.y.min=0; so.scales.y.max=100; so.scales.y.title={display:true,text:'% full',color:css('--text2')};
  so.plugins.tooltip={callbacks:{label:x=>`Tank: ${fmt(x.raw)}% full`}};
  const E=c.graph.E||1;
  mk('gSoc',{type:'line',data:{labels:lab,datasets:[{label:'Tank level',data:c.graph.tank.map(x=>Math.max(0,Math.min(100,100*x.soc/E))),borderColor:css('--s1'),backgroundColor:rgba(css('--s1'),.15),fill:true,borderWidth:2,pointRadius:0,tension:.3}]},options:so});
}
function gDetails(c,b,st){
  const payTxt=x=>PAYMODE==='infra'?(x.payI===0?'immediate':isFinite(x.payI)?fmt(x.payI,1)+' yrs':'–'):(isFinite(x.payU)?fmt(x.payU,1)+' yrs':'–');
  const rows=GST.cases.map(x=>`<tr class="${x===c?'rec':''}"><td>${fmt(x.Td,1)} °C</td><td>${fmt(x.Prated/1000,2)}</td><td>−${fmt(x.cut)}</td><td>${fmt(x.capT/1000,1)}</td><td>${fmt(x.V)}</td><td>${fmt(x.above)}</td>
    <td>${x.normalOK?'<span class="ok">OK</span>':'<span class="no">No</span>'} / ${x.worstOK?'<span class="ok">OK</span>':'<span class="no">No</span>'}</td><td>${payTxt(x)}</td></tr>`);
  $('gDet').innerHTML=`<h3>Every design temperature studied</h3>
    ${table(['Design temp','Rated MW','Cut kW','Chillers MW','Tank m³','Hours/yr','Recharge (night IT / full IT)','Payback'],rows)}
    <h3>Basis</h3>
    <ul class="method">
      <li><b>Weather:</b> ${st?`${esc(st.station)} (WMO ${esc(st.wmo)}), measured hourly year TMYx ${esc(st.period)}; ASHRAE 2025 extreme ${fmt(b.extDB,1)} °C dry-bulb / ${fmt(b.extWB,1)} °C wet-bulb, 0.4% ${fmt(b.db04,1)} °C.`:`uploaded file; extreme and 0.4% values taken from its hours.`} Hot-day temperature range ${fmt(GST.DR,1)} K.</li>
      <li><b>Without a tank</b> the plant is sized for full IT load at ${fmt(b.extDB,1)} °C: chillers ${fmt(c.cap0/1000,1)} MW of cooling, ${fmt(c.Prated0/1000,2)} MW electrical.</li>
      <li><b>With the tank</b> the plant is sized for full IT load at ${fmt(c.Td,1)} °C: chillers ${fmt(c.capT/1000,1)} MW, and its power never exceeds ${fmt(c.Prated/1000,2)} MW. Above that, the tank covers the difference.</li>
      <li><b>Heatwave check:</b> ${GI.days} hottest days in a row at full IT load by day; the tank must refill overnight within ${fmt(GI.window*100)}% of the night, with IT at ${fmt(GI.night*100)}% (and flagged at full IT load).</li>
      <li><b>Tank:</b> ${fmt(c.E)} kWh usable at ΔT ${fmt(GI.Tr-GI.Ts)} K and ${fmt(GI.eff*100)}% efficiency, + ${fmt(GI.margin*100)}% margin, + ${fmt(GI.reserve*100)}% reserve kept full.</li>
      <li><b>Savings:</b> demand charge ${money(c.demand)}/yr, energy cost ${money(c.energySave)}/yr${PAYMODE==='infra'?`; infrastructure ${money(c.infra)} (electrical ${fmt(c.cut)} kW × $${fmt(GI.infraKW)}/kW, chillers ${fmt(Math.max(0,c.cap0-c.capT))} kW × $${fmt(GI.chKW)}/kW) against tank ${money(c.tankCost)}`:`; tank ${money(c.tankCost)}`}. Recommended = best net saving over ${fmt(GI.life)} years among cases that recharge in time.</li>
      <li><b>Chiller capacity</b> falls ${fmt(num('gKa',1.2),1)}%/K above 35 °C ambient (air-cooled) or ${fmt(num('gKw',.7),1)}%/K above 29.4 °C condenser water (water-cooled). Screening estimate: confirm with chiller selections and a detailed design.</li>
    </ul>`;
}
document.querySelectorAll('#inGrid input:not([type=file]), #inGrid select:not(#gCity):not(#gTd)').forEach(el=>el.addEventListener('input',()=>gSchedule()));
$('gTd').onchange=gRender;

// start: emergency card, or grid from the link
runEmg();
setMode(location.hash==='#grid'?'grid':'emg');
