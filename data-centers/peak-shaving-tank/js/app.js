// ---------- Peak Shaving Tank: page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const rgba=(hex,a)=>{ const h=hex.replace('#',''), n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
const MW=kw=>fmt(kw/1000,2);

let WX=null, ST=null, I=null, YC=null, timer=null, req=0;
[...new Set(CITIES.map(c=>c.g))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  CITIES.filter(c=>c.g===g).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o); }); $('gCity').appendChild(og); });
// the method's heatwave is built from dry-bulb, so it applies to air-cooled systems; wet systems peak in humid hours
OPTIONS.filter(o=>o.id==='acc'||o.id==='accfc').forEach(o=>{ const e=document.createElement('option'); e.value=o.id; e.textContent=o.name; $('gSys').appendChild(e); });

// ---------- weather ----------
function loadCity(){ const c=CITIES.find(x=>x.id===$('gCity').value), n=++req; $('gStatus').textContent='Loading weather…';
  stationYear(c).catch(()=>synthYear(c)).then(w=>{ if(n===req){ WX=w; schedule(0); } }); }
$('gCity').onchange=loadCity;
$('gTabCity').onclick=()=>{ $('gTabCity').classList.add('on'); $('gTabFile').classList.remove('on'); $('gCityPane').hidden=false; $('gFilePane').hidden=true; loadCity(); };
$('gTabFile').onclick=()=>{ $('gTabFile').classList.add('on'); $('gTabCity').classList.remove('on'); $('gCityPane').hidden=true; $('gFilePane').hidden=false; };
$('gFile').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=()=>{ try{ const t=rd.result, epw=/\.epw$/i.test(f.name)||/^LOCATION,/.test(t); WX=epw?parseEPW(t):parseCSV(t); if(!epw) WX.name=f.name.replace(/\.[^.]+$/,'');
    $('gFileInfo').innerHTML=`Loaded <b>${esc(WX.name)}</b>: ${fmt(WX.T.length)} hours.`; schedule(0); }
    catch(err){ $('gFileInfo').innerHTML=`<div class="err">${esc(err.message)}</div>`; } };
  rd.readAsText(f); };

// ---------- study ----------
function inputs(){
  const lim=(v,a,b)=>Math.min(b,Math.max(a,v));   // typed values are not held to the min / max of the fields
  return {Q:Math.max(0.1,num('gQ',20))*1000,night:lim(num('gNight',80),10,100)/100,day0:lim(Math.round(num('gDay0',7)),0,23),night0:lim(Math.round(num('gNight0',19)),0,23),sys:$('gSys').value,Ts:num('gTs',30),Tr:Math.max(num('gTr',40),num('gTs',30)+1),
    reserve:lim(num('gReserve',20),0,80)/100,margin:Math.max(0,num('gMar',20))/100,days:lim(Math.round(num('gDays',3)),1,7),rechMax:lim(num('gRechMax',4),1,12),
    eff:lim(num('gEff',85),50,100)/100,Hmax:Math.max(3,num('gH',15)),safety:Math.max(0,num('gSafe',0))};
}
// the study takes a moment: run it shortly after the last change
function schedule(ms){ clearTimeout(timer); $('gStatus').textContent='Calculating…'; timer=setTimeout(run,ms??400); }
let userTd=null;   // design temperature typed by the user; null = use the recommendation
function run(){
  if(!WX) return;
  I=inputs(); ST=peakStudy(I,WX,{a:num('gKa',1.35)/100,w:num('gKw',0)/100});
  render();
}

// ---------- results ----------
function render(){
  if(!ST) return;
  const b=ST.base, rec=ST.recTd, lo=ST.cases[ST.cases.length-1].Td, hi=ST.cases[0].Td;
  const Td=userTd==null?rec:Math.round(Math.min(hi,Math.max(lo-5,userTd))*2)/2, c=ST.at(Td);
  if(userTd!=null&&Td!==userTd) $('gTd').value=Td;   // show the value actually studied (0.5 K steps, within the range)
  if(userTd==null) $('gTd').value=rec;
  $('gTdNote').innerHTML=userTd==null
    ? `Recommended: <b>${fmt(rec,1)} °C</b>. Type your own temperature to test it.`
    : `Recommended: <b>${fmt(rec,1)} °C</b> · <a href="#" id="gTdReset">use it</a>`;
  if($('gTdReset')) $('gTdReset').onclick=e=>{ e.preventDefault(); userTd=null; render(); };
  $('gStatus').textContent='';
  const hh=h=>String(h).padStart(2,'0')+':00', nh=nightHours(I), win=`${hh(I.night0)}–${hh(I.day0)}`;
  const chCut=Math.max(0,c.cap0-c.capT), night=`${fmt(I.night*100)}% IT load`, lim=`${fmt(I.rechMax,1)} h`;
  const rech=isFinite(c.rechH)?{v:`${fmt(c.rechH)} <small>h</small>`,l:`to recharge at ${night} over the ${nh}-hour night (${win})`}:{v:'No',l:`full recharge before morning at ${night}`};
  const save=`Chiller capacity −${MW(chCut)} MW.`;
  // the reserve kept full (net of the sizing margin) also covers a power changeover at full load
  const rideMin=c.V*I.reserve*RHO_CP*(I.Tr-I.Ts)*I.eff/3600/I.Q*60;
  const uses=c.cut>0?`<div class="uses">
      <div><b>${fmt(I.reserve*100)}% reserve kept full · ${fmt(c.V*I.reserve)} m³</b><span>About ${fmt(rideMin)} min of full cooling for a power changeover, and cover for hotter-than-design weather.</span></div>
    </div>`:'';
  const msg=c.safe
    ? `Rate the plant for <b>${fmt(c.Td,1)} °C</b> instead of the extreme <b>${fmt(b.extDB,1)} °C</b>. ${save}`
    : `<b>Recharging may not be safe during a heatwave.</b> At ${fmt(c.Td,1)} °C the tank ${isFinite(c.rechH)?`needs ${fmt(c.rechH)} h to recharge at ${night}, more than the safe ${lim}`:`does not refill before morning at ${night}`}. Either raise the design temperature toward the extreme (a smaller cut${ST.low?`, e.g. the recommended ${fmt(rec,1)} °C`:''}), or include a <b>standby chiller</b> to cover the shortage on those days.`;
  const safeNote='';
  $('gRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">−${MW(c.cut)} <small>MW</small></div><div class="l">Rated power ${MW(c.Prated0)} → ${MW(c.Prated)} MW (−${fmt(100*c.cut/c.Prated0,1)}%)</div></div>
      <div class="bn"><div class="v">${fmt(c.V)} <small>m³</small></div><div class="l">Tank · ${tankText(c)} high</div></div>
      <div class="bn"><div class="v${c.safe?'':' bad'}">${rech.v}</div><div class="l">${rech.l}</div></div>
      <div class="bn"><div class="v">~${fmt(c.above)} <small>h/yr</small></div><div class="l">Hours the tank works (above ${fmt(c.Td,1)} °C at full IT load)</div></div>
    </div>
    <div class="verdict${c.safe?'':' warn'}">${msg}${c.cut<0.03*c.Prated0?` <span class="note">The cut is small: a tank adds little here.</span>`:''}</div>${uses}${safeNote}`;
  charts_(c);
  const yc=yearCheck(ST,I,WX,{a:num('gKa',1.35)/100,w:num('gKw',0)/100},c); YC=yc;
  if(c.cut>0) $('gRes').insertAdjacentHTML('beforeend',`<div class="note">Typical-year check: ${yc.ok?`covered, ${fmt(yc.hours)} h/yr, deepest draw ${fmt(yc.share*100)}% of the storage`:`<b>not covered</b>: deepest draw ${fmt(yc.share*100)}% of the storage`}.</div>`);
}
function charts_(c){
  const lab=Array.from({length:24},(_,j)=>`${String((6+j)%24).padStart(2,'0')}:00`);
  const orig=c.graph.orig.map(x=>x.P/1000), tank=c.graph.tank.map(x=>x.P/1000), cap=Array(24).fill(c.Prated/1000);
  $('gChartTitle').textContent=`Hottest day (ASHRAE extreme ${fmt(ST.base.extDB,1)} °C), full IT load by day: cooling plant power, MW`;
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
document.querySelectorAll('#inGrid input:not([type=file]):not(#gTd), #inGrid select:not(#gCity):not(#gTd)').forEach(el=>el.addEventListener('input',()=>schedule()));
$('gTd').addEventListener('change',()=>{ const v=parseFloat($('gTd').value); userTd=isNaN(v)?null:v; render(); });
loadCity();
