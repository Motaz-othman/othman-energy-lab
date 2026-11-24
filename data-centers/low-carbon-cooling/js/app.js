// ---------- Low-Carbon Cooling Selector: page logic ----------
// Compare systems: 8,760-hour model (shared/js/cooling-model.js), carbon = electricity + water supply + refrigerant leakage.
// My own numbers: the same three terms from the user's annual figures.
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const lim=(v,a,b)=>Math.min(b,Math.max(a,v));
const CAR=4.6;   // t CO2 per typical passenger car per year (US EPA, Greenhouse Gas Emissions from a Typical Passenger Vehicle)

let WX=null, RES=null, DES=null, P=null, MODE='est', timer=null, req=0;
[...new Set(CITIES.map(c=>c.g))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  CITIES.filter(c=>c.g===g).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; og.appendChild(o); }); $('cCity').appendChild(og); });
Object.entries(REFRIGERANTS).forEach(([k,r])=>{ const o=document.createElement('option'); o.value=k; o.textContent=`${r.name} (GWP ${fmt(r.gwp,r.gwp<10?2:0)})`; $('cRef').appendChild(o); });
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
  return {ef:isNaN(efIn)?ef0:Math.max(0,efIn), wkwh:isNaN(wIn)?w0:Math.max(0,wIn), efOwn:!isNaN(efIn), wOwn:!isNaN(wIn), src:efSrc(id), wco2:isNaN(wIn)?waterCo2(id):null};
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
  return {...BASIS,Qd,lf,loops,water:'plenty',dbIn:NaN,wbIn:NaN,ef:f.ef,wkwh:f.wkwh,wco2:f.wco2,refr:R.k,leak:R.leak,
    chW:Math.max(0,num('cChW',0.3)),chA:Math.max(0,num('cChA',0.4)),tE:0.1,tW:2.5,tD:0,red:0.25,ups:0.96,dloss:0.02,rates,
    ...Object.fromEntries(WEIGHTS.map(w=>[w.id,w.v]))};
}

// ---------- run ----------
function schedule(ms){ clearTimeout(timer); timer=setTimeout(run,ms??300); }
function run(){
  const f=factors();
  $('cEFNote').innerHTML=`${f.efOwn?'Your grid factor':`Grid ${f.ef.toFixed(3)} kg CO₂/kWh`} · ${f.wOwn?'your water energy':(f.wco2?`water ${fmt(f.wco2[1],2)} kg CO₂e/m³`:`water ${fmt(f.wkwh,1)} kWh/m³`)}. Blank = the city's values.`;
  if(MODE==='own') return renderOwn(f);
  if(!WX){ $('cStatus').textContent='Loading weather…'; return; }
  P=params(); P.cases=designCases(WX,WX.station&&WX.station.ashrae,P.dbIn,P.wbIn); P.dbA=P.cases.A.db; P.dbD=P.cases.A.db; P.wbD=P.cases.B.wb;
  DES=designCheck(P); RES=simulate(WX,P,DES);
  renderEst(f);
}

// ---------- results: Compare systems ----------
const yrs=()=>lim(Math.round(num('cYrs',15)),1,40);
const t=v=>v<0.05?"0":fmt(v,v<10?1:0);
function renderEst(f){
  const R=refr(), Y=yrs();
  const all=OPTIONS.map(o=>RES[o.id]), ok=all.filter(r=>DES[r.o.id].ok);
  const ids=[...ok.sort((a,b)=>a.co2-b.co2),...all.filter(r=>!DES[r.o.id].ok)].map(r=>r.o.id);
  const best=RES[ids[0]], base=RES.acc, save=base.co2-best.co2;
  $('cStatus').textContent='';
  $('cRes').hidden=true; $('cRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${t(best.co2)} <small>t CO₂e/yr</small></div><div class="l">Lowest: ${best.o.short}</div></div>
      <div class="bn"><div class="v">${t(base.co2)} <small>t CO₂e/yr</small></div><div class="l">Air-cooled chillers (baseline)</div></div>
      <div class="bn"><div class="v good">${t(Math.max(0,save))} <small>t/yr</small></div><div class="l">Saved by the lowest system against air-cooled · ${fmt(save*Y)} t over ${Y} years</div></div>
      <div class="bn"><div class="v">${fmt(best.co2IT,1)} <small>kg/MWh</small></div><div class="l">CO₂e per MWh of IT energy (lowest system)</div></div>
    </div>
    <div class="verdict">Lowest carbon here: <b>${best.o.name}</b>, ${t(best.co2)} t CO₂e per year. ${save>0.5?`Against air-cooled chillers it saves <b>${t(save)} t a year</b>, about the yearly emissions of <b>${fmt(save/CAR)} passenger cars</b>.`:'It is close to air-cooled chillers in this climate.'} Electricity is ${fmt(100*best.co2E/best.co2)}% of its total.</div>`;
  chart(ids.map(id=>RES[id].o.short),ids.map(id=>RES[id]));
  // one brief card per system: CO2 only (energy, water and cost are in the Cooling Plant Selector)
  const cards=ids.map((id,i)=>{ const r=RES[id], bad=!DES[id].ok, low=i===0&&!bad, d=base.co2-r.co2, w=v=>`${(100*v/r.co2).toFixed(2)}%`;
    return `<div class="sc${low?' low':''}">
      <div class="sn">${r.o.short}${low?'<span class="tag ok">Lowest</span>':''}${bad?'<span class="tag">Fails design day</span>':''}</div>
      <div class="sv">${t(r.co2)} <small>t CO₂e/yr</small></div>
      <div class="sbar"><i style="width:${w(r.co2E)};background:var(--s1)"></i><i style="width:${w(r.co2W)};background:var(--s3)"></i><i style="width:${w(r.co2R)};background:var(--s2)"></i></div>
    </div>`; });
  $('cTabCard').hidden=false; $('cTabTitle').textContent='Each system, CO₂ only';
  $('cTab').innerHTML=`<div class="sgrid">${cards.join('')}</div>`;
  const rows=ids.map((id,i)=>{ const r=RES[id], bad=!DES[id].ok;
    return `<tr class="${i===0&&!bad?'best':''}"><td class="sys">${r.o.short}${i===0&&!bad?'<span class="tag ok">Lowest</span>':''}${bad?'<span class="tag">Fails design day</span>':''}</td><td>${fmt(r.E)}</td><td>${fmt(r.W)}${r.Whi>r.W*1.001?` (${fmt(r.Wlo)}–${fmt(r.Whi)})`:''}</td><td>${fmt(r.charge)}</td><td>${t(r.co2E)}</td><td>${t(r.co2W)}</td><td>${t(r.co2R)}</td><td><b>${t(r.co2)}</b></td><td>${fmt(r.co2IT,1)}</td><td>${fmt(r.co2*Y)}</td></tr>`; });
  $('cAllCard').hidden=false;
  $('cAll').innerHTML=table(['System','Electricity MWh/yr','Water m³/yr','Charge kg','Electricity t/yr','Water t/yr','Refrigerant t/yr','Total t CO₂e/yr','kg per MWh IT',`Total over ${Y} yr (t)`],rows);
}

// ---------- results: My own numbers ----------
function renderOwn(f){
  const R=refr(), Y=yrs(), E=Math.max(0,num('oE',0)), W=Math.max(0,num('oW',0)), ch=Math.max(0,num('oCh',0)), IT=num('oIT',NaN);
  const wkg=f.wco2?f.wco2[1]:f.wkwh*f.ef, cE=E*f.ef, cW=W*wkg/1000, cR=ch*R.leak*R.r.gwp/1000, tot=cE+cW+cR;
  const name=$('oSys').selectedOptions[0].textContent, sh=v=>tot>0?fmt(100*v/tot):'0';
  $('cStatus').textContent='';
  $('cRes').hidden=false; $('cRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${t(tot)} <small>t CO₂e/yr</small></div><div class="l">Total, cooling system</div></div>
      <div class="bn"><div class="v">${fmt(tot*Y)} <small>t</small></div><div class="l">Over ${Y} years</div></div>
      <div class="bn"><div class="v">${fmt(tot/CAR)}</div><div class="l">Passenger cars a year, same CO₂</div></div>
      <div class="bn"><div class="v">${IT>0?`${fmt(tot*1000/IT,1)} <small>kg/MWh</small>`:'–'}</div><div class="l">${IT>0?'CO₂e per MWh of IT energy':'Enter the IT energy for kg per MWh IT'}</div></div>
    </div>
    <div class="verdict">Electricity <b>${sh(cE)}%</b>, water supply <b>${sh(cW)}%</b>, refrigerant leakage <b>${sh(cR)}%</b> of the total.${cR>0.1*tot&&R.r.gwp>100?` Refrigerant is a large share: a low-GWP refrigerant such as R-1234ze(E) (GWP 1.37) would remove most of it.`:''}</div>`;
  chart([name],[{co2E:cE,co2W:cW,co2R:cR}]);
  $('cAllCard').hidden=true; $('cTabCard').hidden=true;
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


// ---------- mode tabs and inputs ----------
function setMode(m){ MODE=m; $('mEst').classList.toggle('on',m==='est'); $('mOwn').classList.toggle('on',m==='own');
  $('estPane').hidden=m!=='est'; $('ownPane').hidden=m!=='own'; $('chRow').hidden=m!=='est'; schedule(0); }
$('mEst').onclick=()=>setMode('est'); $('mOwn').onclick=()=>setMode('own');
document.querySelectorAll('#inGrid input, #inGrid select:not(#cCity)').forEach(el=>el.addEventListener('input',()=>schedule()));
loadCity();
