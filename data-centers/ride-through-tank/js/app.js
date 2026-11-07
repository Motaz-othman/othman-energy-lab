// ---------- Ride-Through Tank: sizing and page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const money=v=>Math.abs(v)>=1e6?`$${fmt(v/1e6,2)}M`:`$${fmt(v/1e3)}k`;

// cooling energy for the ride-through time, stored at the supply/return difference, plus the safety margin
function rideThroughTank(i){
  const dT=Math.max(1,i.Tr-i.Ts), E=i.Q*i.min/60, Vnet=tankVolume(E,dT,i.eff), V=Vnet*(1+i.margin);
  return {dT,E,Vnet,V,...tankShape(V,i.Hmax),cost:V*i.costV};
}

function run(){
  const i={Q:num('eQ',20000),min:num('eMin',10),Ts:num('eTs',30),Tr:num('eTr',40),eff:num('eEff',85)/100,margin:num('eMar',20)/100,Hmax:num('eH',15),costV:num('eCost',500)};
  const r=rideThroughTank(i);
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
    <li>The tank pumps and controls must run on UPS power during the gap. The tank is shaped up to the height limit, with height between 1 and 4 times the diameter for good stratification.</li></ul>
    <h3>Ride-through time: assumptions</h3>
    ${table(['Step','Typical time'],[
      `<tr><td>Generator start and transfer (NFPA 110 Level 1: power within 10 s)</td><td>10–30 s</td></tr>`,
      `<tr><td>Loads restored in stages: pumps first, then chillers</td><td>30–60 s</td></tr>`,
      `<tr><td>Chiller restart to full capacity, quick-restart chillers</td><td>3–5 min</td></tr>`,
      `<tr><td>Chiller restart to full capacity, standard chillers (anti-recycle timers, oil checks)</td><td>10–15 min</td></tr>`])}
    ${table(['Case','Minimum','Recommended design'],[
      `<tr><td>Quick-restart chillers (typical data center specification)</td><td>~5 min</td><td><b>10 min</b></td></tr>`,
      `<tr><td>Standard chillers</td><td>~12–15 min</td><td><b>15–20 min</b></td></tr>`,
      `<tr><td>Tier IV / continuous cooling, or liquid cooling with little thermal mass</td><td>–</td><td><b>15 min</b>, covering a failed first generator start</td></tr>`])}
    <ul class="method">
      <li>The margin over the minimum covers a generator that does not sync at the first attempt, a chiller tripping on restart at high ambient, and chillers restarted one after another.</li>
      <li>Chilled-water pumps and the CRAH fans or CDUs must run on UPS, or the tank cannot deliver its cooling.</li>
      <li>With liquid cooling the racks hold very little heat: even 30–60 s without flow can trip the IT, so continuous circulation matters as much as the tank volume.</li>
      <li>Typical values; confirm the generator and chiller restart times with the selected equipment.</li>
    </ul>`;
}
document.querySelectorAll('#inEmg input').forEach(el=>el.addEventListener('input',run));
run();
