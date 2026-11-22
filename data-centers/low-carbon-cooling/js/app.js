// ---------- Low-Carbon Cooling Selector: page logic ----------
// Compare systems: 8,760-hour model (shared/js/cooling-model.js), carbon = electricity + water supply + refrigerant leakage.
// My own numbers: the same three terms from the user's annual figures.
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const lim=(v,a,b)=>Math.min(b,Math.max(a,v));
const CAR=4.6;   // t CO2 per typical passenger car per year (US EPA, Greenhouse Gas Emissions from a Typical Passenger Vehicle)

let WX=null, RES=null, DES=null, P=null, MODE='est', timer=null, req=0;
[...new Set(CITIES.map(c=>c.g))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  CITIES.filter(c=>c.g===g).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o); }); $('cCity').appendChild(og); });
Object.entries(REFRIGERANTS).forEach(([k,r])=>{ const o=document.createElement('option'); o.value=k; o.textContent=`${r.name} (GWP ${fmt(r.gwp)})`; $('cRef').appendChild(o); });
[...OPTIONS.map(o=>[o.id,o.name]),['other','Other cooling system']].forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.textContent=t; $('oSys').appendChild(o); });

// ---------- location factors ----------
const city=()=>CITIES.find(c=>c.id===$('cCity').value);
const efSrc=id=>{ const c=CITIES.find(x=>x.id===id);
  if(id==='sydney') return 'Australian National Greenhouse Accounts factors, NSW 2025–26';
  if(c&&c.g==='Americas'&&id!=='saopaulo') return 'US EPA eGRID2023 subregion rate';
  return 'Our World in Data / Ember, latest year'; };
function factors(){
  const id=$('cCity').value, ef0=GRID_EF[id]??0.45, w0=waterKwh(id);
  const efIn=parseFloat($('cEF').value), wIn=parseFloat($('cWk').value);
  $('cEF').placeholder=ef0.toFixed(3); $('cWk').placeholder=fmt(w0,1);
  return {ef:isNaN(efIn)?ef0:Math.max(0,efIn), wkwh:isNaN(wIn)?w0:Math.max(0,wIn), efOwn:!isNaN(efIn), wOwn:!isNaN(wIn), src:efSrc(id)};
}
function refr(){ return {k:$('cRef').value, r:REFRIGERANTS[$('cRef').value], leak:Math.max(0,num('cLeak',2))/100}; }

// ---------- weather (Compare systems) ----------
function loadCity(){ const c=city(), n=++req; if(MODE==='est'){ $('cStatus').textContent='Loading weather…'; }
  stationYear(c).catch(()=>synthYear(c)).then(w=>{ if(n===req){ WX=w; schedule(0); } }); }
$('cCity').onchange=()=>{ WX=null; loadCity(); if(MODE==='own') schedule(0); };

function params(){
  const f=factors(), R=refr(), Qd=Math.max(0.1,num('cQ',20))*1000, lf=lim(num('cLf',80),10,100)/100, lcp=lim(num('cLcp',80),0,100)/100;
  const ls=num('cLs',30), as=num('cAs',20);
  const loops=[
    {name:'LC',Ts:ls,Tr:Math.max(num('cLr',40),ls+1),Qd:Qd*lcp,Q:Qd*lcp*lf},
    {name:'Air',Ts:as,Tr:Math.max(num('cAr',30),as+1),Qd:Qd*(1-lcp),Q:Qd*(1-lcp)*lf}];
  const rates={}; RATES.forEach(r=>rates[r.id]={lo:r.lo,hi:r.hi});
  return {...BASIS,Qd,lf,loops,water:'plenty',dbIn:NaN,wbIn:NaN,ef:f.ef,wkwh:f.wkwh,refr:R.k,leak:R.leak,
    chW:Math.max(0,num('cChW',0.3)),chA:Math.max(0,num('cChA',0.4)),tE:0.1,tW:2.5,tD:0,red:0.25,ups:0.96,dloss:0.02,rates,
    ...Object.fromEntries(WEIGHTS.map(w=>[w.id,w.v]))};
}

// ---------- run ----------
function schedule(ms){ clearTimeout(timer); timer=setTimeout(run,ms??300); }
function run(){
  const f=factors();
  $('cEFNote').innerHTML=`${f.efOwn?'Your grid factor':`Grid factor ${f.ef.toFixed(3)} kg CO₂/kWh: ${f.src}`}. ${f.wOwn?'Your water supply energy':`Water supply ${fmt(f.wkwh,1)} kWh/m³: ${f.wkwh>=3?'Gulf seawater desalination':'conventional treated supply'} (IEA WEO 2016)`}. Leave blank for the city's value.`;
  if(MODE==='own') return renderOwn(f);
  if(!WX){ $('cStatus').textContent='Loading weather…'; return; }
  P=params(); P.cases=designCases(WX,WX.station&&WX.station.ashrae,P.dbIn,P.wbIn); P.dbA=P.cases.A.db; P.dbD=P.cases.A.db; P.wbD=P.cases.B.wb;
  DES=designCheck(P); RES=simulate(WX,P,DES);
  renderEst(f);
}

// ---------- results: Compare systems ----------
const yrs=()=>lim(Math.round(num('cYrs',15)),1,40);
const t=v=>fmt(v,v<10?1:0);
function renderEst(f){
  const R=refr(), Y=yrs();
  const all=OPTIONS.map(o=>RES[o.id]), ok=all.filter(r=>DES[r.o.id].ok);
  const ids=[...ok.sort((a,b)=>a.co2-b.co2),...all.filter(r=>!DES[r.o.id].ok)].map(r=>r.o.id);
  const best=RES[ids[0]], base=RES.acc, save=base.co2-best.co2;
  $('cStatus').textContent=`${WX.name} · ${fmt(P.Qd/1000,1)} MW at ${fmt(P.lf*100)}% load`;
  $('cRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${t(best.co2)} <small>t CO₂e/yr</small></div><div class="l">Lowest: ${best.o.short}</div></div>
      <div class="bn"><div class="v">${t(base.co2)} <small>t CO₂e/yr</small></div><div class="l">Air-cooled chillers (baseline)</div></div>
      <div class="bn"><div class="v good">${t(Math.max(0,save))} <small>t/yr</small></div><div class="l">Saved by the lowest system against air-cooled · ${fmt(save*Y)} t over ${Y} years</div></div>
      <div class="bn"><div class="v">${fmt(best.co2IT,1)} <small>kg/MWh</small></div><div class="l">CO₂e per MWh of IT energy (lowest system)</div></div>
    </div>
    <div class="verdict">Lowest carbon here: <b>${best.o.name}</b>, ${t(best.co2)} t CO₂e per year. ${save>0.5?`Against air-cooled chillers it saves <b>${t(save)} t a year</b>, about the yearly emissions of <b>${fmt(save/CAR)} passenger cars</b>.`:'It is close to air-cooled chillers in this climate.'} Electricity is ${fmt(100*best.co2E/best.co2)}% of its total.</div>`;
  chart(ids.map(id=>RES[id].o.short),ids.map(id=>RES[id]));
  $('cTabCard').hidden=true;
  details(f,R,true);
}

// ---------- results: My own numbers ----------
function renderOwn(f){
  const R=refr(), Y=yrs(), E=Math.max(0,num('oE',0)), W=Math.max(0,num('oW',0)), ch=Math.max(0,num('oCh',0)), IT=num('oIT',NaN);
  const cE=E*f.ef, cW=W*f.wkwh/1000*f.ef, cR=ch*R.leak*R.r.gwp/1000, tot=cE+cW+cR;
  const name=$('oSys').selectedOptions[0].textContent, sh=v=>tot>0?fmt(100*v/tot):'0';
  $('cStatus').textContent=`${city().name} · ${name}`;
  $('cRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${t(tot)} <small>t CO₂e/yr</small></div><div class="l">Total, cooling system</div></div>
      <div class="bn"><div class="v">${fmt(tot*Y)} <small>t</small></div><div class="l">Over ${Y} years</div></div>
      <div class="bn"><div class="v">${fmt(tot/CAR)}</div><div class="l">Passenger cars a year, same CO₂</div></div>
      <div class="bn"><div class="v">${IT>0?`${fmt(tot*1000/IT,1)} <small>kg/MWh</small>`:'–'}</div><div class="l">${IT>0?'CO₂e per MWh of IT energy':'Enter the IT energy for kg per MWh IT'}</div></div>
    </div>
    <div class="verdict">Electricity <b>${sh(cE)}%</b>, water supply <b>${sh(cW)}%</b>, refrigerant leakage <b>${sh(cR)}%</b> of the total.${cR>0.1*tot&&R.r.gwp>100?` Refrigerant is a large share: a low-GWP refrigerant such as R-1234ze(E) (GWP 1) would remove most of it.`:''}</div>`;
  chart([name],[{co2E:cE,co2W:cW,co2R:cR}]);
  $('cTabCard').hidden=false; $('cTabTitle').textContent='How it is calculated';
  $('cTab').innerHTML=`<div class="eqs">
    <div><span>Electricity</span><span class="f">${fmt(E)} MWh × ${f.ef.toFixed(3)} t/MWh</span><b>${t(cE)} t</b></div>
    <div><span>Water supply</span><span class="f">${fmt(W)} m³ × ${fmt(f.wkwh,1)} kWh/m³ ÷ 1,000 × ${f.ef.toFixed(3)} t/MWh</span><b>${t(cW)} t</b></div>
    <div><span>Refrigerant</span><span class="f">${fmt(ch)} kg × ${fmt(R.leak*100,1)}% × GWP ${fmt(R.r.gwp)} ÷ 1,000</span><b>${t(cR)} t</b></div>
    <div class="tot"><span><b>Total per year</b></span><span class="f">CO₂ equivalent</span><b>${t(tot)} t</b></div></div>`;
  details(f,R,false);
}

// ---------- chart: stacked bars by source ----------
function chart(labels,rs){
  $('cBox').style.height=`${Math.max(110,labels.length*46+60)}px`;
  $('cChartTitle').textContent='Annual CO₂ by source, t CO₂e per year';
  const o=baseOpts(); o.indexAxis='y';
  o.scales.x={stacked:true,grid:{color:css('--border')},border:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'t CO₂e/yr',color:css('--text2')},beginAtZero:true};
  o.scales.y={stacked:true,grid:{display:false},ticks:{color:css('--text')}};
  o.plugins.tooltip={mode:'index',intersect:false,callbacks:{label:c=>`${c.dataset.label}: ${t(c.raw)} t`}};
  const ds=(lab,k,col,last)=>({label:lab,data:rs.map(r=>r[k]),backgroundColor:col,borderColor:css('--surface'),borderWidth:{right:2},barThickness:20,borderRadius:last?{topRight:4,bottomRight:4}:0});
  mk('cChart',{type:'bar',data:{labels,datasets:[ds('Electricity','co2E',css('--s1')),ds('Water supply','co2W',css('--s3')),ds('Refrigerant leakage','co2R',css('--s2'),true)]},options:o});
}

function details(f,R,est){
  const st=WX&&WX.station;
  $('cDet').innerHTML=`<ul class="method">
    <li><b>Grid factor:</b> ${f.ef.toFixed(3)} kg CO₂ per kWh (= t per MWh), ${f.efOwn?'your value':f.src}. Location-based: the average of the local grid.</li>
    <li><b>Water supply energy:</b> ${fmt(f.wkwh,1)} kWh per m³, ${f.wOwn?'your value':'IEA World Energy Outlook 2016 (Water-Energy Nexus): about 3.5 kWh/m³ for Gulf seawater desalination, 0.5 for conventional treated water'}.</li>
    <li><b>Refrigerant:</b> ${R.r.name}, GWP ${fmt(R.r.gwp)} (100-year, IPCC AR4, as used by the EU F-gas Regulation); leak ${fmt(R.leak*100,1)}% of the charge per year.${est?` Charge ${fmt(num('cChW',0.3),2)} kg/kW for water-cooled and ${fmt(num('cChA',0.4),2)} kg/kW for air-cooled chillers, on the duty chillers + 1 standby per loop. Charge and leak rate are assumptions: use the chiller data where known.`:''}</li>
    ${est?`<li><b>Energy and water:</b> 8,760-hour simulation, ${st?`${esc(st.station)}, measured typical year TMYx ${esc(st.period)}`:'generated typical year'}; ASHRAE 90.1-2025 chillers, heat-rejection approaches, pump and fan power, free cooling. Same model as the <a href="../cooling-plant/index.html">Cooling Plant Selector</a>, which also gives cost and peak power. A system that cannot meet the design day is listed last.</li>`:''}
    <li><b>Cars:</b> ${CAR} t CO₂ per typical passenger car per year (US EPA).</li>
    <li>Cooling system only: IT electricity and UPS losses are not included. Screening-level estimate.</li></ul>`;
}

// ---------- mode tabs and inputs ----------
function setMode(m){ MODE=m; $('mEst').classList.toggle('on',m==='est'); $('mOwn').classList.toggle('on',m==='own');
  $('estPane').hidden=m!=='est'; $('ownPane').hidden=m!=='own'; $('chRow').hidden=m!=='est'; schedule(0); }
$('mEst').onclick=()=>setMode('est'); $('mOwn').onclick=()=>setMode('own');
document.querySelectorAll('#inGrid input, #inGrid select:not(#cCity)').forEach(el=>el.addEventListener('input',()=>schedule()));
loadCity();
