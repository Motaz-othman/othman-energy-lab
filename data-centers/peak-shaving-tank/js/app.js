// ---------- Peak Shaving Tank: page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const rgba=(hex,a)=>{ const h=hex.replace('#',''), n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
const MW=kw=>fmt(kw/1000,2);

let WX=null, ST=null, I=null, timer=null, req=0;
[...new Set(CITIES.map(c=>c.g))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  CITIES.filter(c=>c.g===g).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o); }); $('gCity').appendChild(og); });
OPTIONS.forEach(o=>{ const e=document.createElement('option'); e.value=o.id; e.textContent=o.name; $('gSys').appendChild(e); });

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
  return {Q:num('gQ',20000),night:Math.min(1,num('gNight',80)/100),sys:$('gSys').value,Ts:num('gTs',30),Tr:Math.max(num('gTr',40),num('gTs',30)+1),
    reserve:Math.min(.8,num('gReserve',20)/100),margin:num('gMar',20)/100,days:Math.round(num('gDays',3)),rechMax:Math.min(12,num('gRechMax',10)),
    eff:num('gEff',85)/100,Hmax:num('gH',15),safety:num('gSafe',2)};
}
// the study takes a moment: run it shortly after the last change
function schedule(ms){ clearTimeout(timer); $('gStatus').textContent='Calculating…'; timer=setTimeout(run,ms??400); }
function run(){
  if(!WX) return;
  I=inputs(); ST=peakStudy(I,WX,{a:num('gKa',1.2)/100,w:num('gKw',.7)/100});
  const keep=$('gTd').value;
  $('gTd').innerHTML='<option value="">Recommended (safe)</option>'+ST.cases.map(c=>`<option value="${c.Td}">${fmt(c.Td,1)} °C</option>`).join('');
  $('gTd').value=ST.cases.some(c=>String(c.Td)===keep)?keep:'';
  render();
}

// ---------- results ----------
function render(){
  if(!ST) return;
  const td=$('gTd').value===''?null:parseFloat($('gTd').value), {rec:c,why,low}=pickCase(ST,td,I.safety), b=ST.base;
  $('gStatus').textContent=`${WX.name} · ${ST.sys.name}`;
  const chCut=Math.max(0,c.cap0-c.capT), night=`${fmt(I.night*100)}% IT load`;
  const rech=isFinite(c.rechH)?{v:`${fmt(c.rechH)} <small>h</small>`,l:`to recharge at ${night} over the 12-hour night`}:{v:'No',l:`full recharge within ${fmt(I.rechMax)} h at ${night}`};
  const msg={
    safe:`Rate the cooling plant for <b>${fmt(c.Td,1)} °C</b> instead of the extreme <b>${fmt(b.extDB,1)} °C</b>. On the hottest afternoons the tank covers the peak, and at ${night} it is full again ${fmt(c.rechH)} h after the peak. This saves <b>${MW(c.cut)} MW</b> of electrical supply (transformer, generator, grid connection) and <b>${MW(chCut)} MW</b> of chiller capacity.`,
    chosen:`Rating the cooling plant for <b>${fmt(c.Td,1)} °C</b> instead of <b>${fmt(b.extDB,1)} °C</b> saves <b>${MW(c.cut)} MW</b> of electrical supply and <b>${MW(chCut)} MW</b> of chiller capacity.${c.ok?'':` <b>But at ${night} the tank does not recharge in time</b> during a heatwave: choose a higher temperature or the recommendation.`}`,
    norecharge:`At ${night} over the night, no design temperature lets the tank recharge in time during a ${I.days}-day heatwave. Lower the night IT load or allow more recharge hours.`}[why];
  const safeNote=why==='safe'?`<div class="note">Safe choice: the lowest temperature that still recharges in time is ${fmt(low.Td,1)} °C; the recommendation adds a ${fmt(I.safety,1)} K margin and stays at or above the ASHRAE 0.4% level of ${fmt(b.db04,1)} °C.</div>`:'';
  $('gRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">−${MW(c.cut)} <small>MW</small></div><div class="l">Rated power ${MW(c.Prated0)} → ${MW(c.Prated)} MW (−${fmt(100*c.cut/c.Prated0,1)}%)</div></div>
      <div class="bn"><div class="v">${fmt(c.V)} <small>m³</small></div><div class="l">Tank · Ø ${fmt(c.D,1)} × ${fmt(c.H,1)} m high</div></div>
      <div class="bn"><div class="v">${rech.v}</div><div class="l">${rech.l}</div></div>
      <div class="bn"><div class="v">~${fmt(c.above)} <small>h/yr</small></div><div class="l">Hours the tank works (above ${fmt(c.Td,1)} °C at full IT load)</div></div>
    </div>
    <div class="verdict${why==='norecharge'||!c.ok?' warn':''}">${msg}</div>${safeNote}`;
  charts_(c);
  details(c,b);
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
function details(c,b){
  const st=WX.station;
  const rows=ST.cases.map(x=>`<tr class="${x===c?'rec':''}"><td>${fmt(x.Td,1)} °C</td><td>${MW(x.Prated)}</td><td>−${fmt(x.cut)}</td><td>${fmt(x.capT/1000,1)}</td><td>${fmt(x.V)}</td><td>${fmt(x.above)}</td>
    <td>${x.ok?`<span class="ok">${fmt(x.rechH)} h</span>`:'<span class="no">Not in time</span>'}</td></tr>`);
  $('gDet').innerHTML=`<h3>Every design temperature studied</h3>
    ${table(['Design temp','Rated MW','Cut kW','Chillers MW','Tank m³','Hours/yr','Recharge'],rows)}
    <h3>Basis</h3>
    <ul class="method">
      <li><b>Weather:</b> ${st?`${esc(st.station)} (WMO ${esc(st.wmo)}), measured hourly year TMYx ${esc(st.period)}; ASHRAE 2025 extreme ${fmt(b.extDB,1)} °C dry-bulb / ${fmt(b.extWB,1)} °C wet-bulb, 0.4% ${fmt(b.db04,1)} °C.`:`uploaded file; extreme and 0.4% values taken from its hours.`} Hot-day temperature range ${fmt(ST.DR,1)} K.</li>
      <li><b>Without a tank</b> the plant is rated for full IT load at ${fmt(b.extDB,1)} °C: chillers ${fmt(c.cap0/1000,1)} MW of cooling, ${MW(c.Prated0)} MW electrical.</li>
      <li><b>With the tank</b> the plant is rated for full IT load at ${fmt(c.Td,1)} °C: chillers ${fmt(c.capT/1000,1)} MW, and its power never exceeds ${MW(c.Prated)} MW. Above that, the tank covers the difference.</li>
      <li><b>Heatwave:</b> ${I.days} hottest days in a row; IT at 100% from 07:00 to 19:00 and ${fmt(I.night*100)}% over the 12-hour night. Each night the tank must be full again within ${fmt(I.rechMax)} h of 19:00, using only the chiller capacity the IT load leaves free and without passing the new rated power.</li>
      <li><b>Tank:</b> ${fmt(c.E)} kWh usable at ΔT ${fmt(I.Tr-I.Ts)} K and ${fmt(I.eff*100)}% efficiency, + ${fmt(I.margin*100)}% sizing margin, + ${fmt(I.reserve*100)}% reserve kept full.</li>
      <li><b>Chiller capacity</b> falls ${fmt(num('gKa',1.2),1)}%/K above 35 °C ambient (air-cooled) or ${fmt(num('gKw',.7),1)}%/K above 29.4 °C condenser water (water-cooled). Screening estimate: confirm with chiller selections and a detailed design.</li>
    </ul>`;
}
document.querySelectorAll('#inGrid input:not([type=file]), #inGrid select:not(#gCity):not(#gTd)').forEach(el=>el.addEventListener('input',()=>schedule()));
$('gTd').onchange=render;
loadCity();
