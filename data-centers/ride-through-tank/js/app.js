// ---------- Ride-Through Tank: sizing and page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const money=v=>Math.abs(v)>=1e6?`$${fmt(v/1e6,2)}M`:`$${fmt(v/1e3)}k`;

// cooling energy for the ride-through time, stored at the supply/return difference, plus the safety margin
function rideThroughTank(i){
  const dT=Math.max(1,i.Tr-i.Ts), E=i.Q*i.min/60, Vnet=tankVolume(E,dT,i.eff), V=Vnet*(1+i.margin);
  return {dT,E,Vnet,V,...tankShape(V,i.Hmax),cost:V*i.costV};
}

function run(){
  const lim=(v,a,b)=>Math.min(b,Math.max(a,v));   // typed values are not held to the min / max of the fields
  const i={Q:Math.max(0.1,num('eQ',20))*1000,min:Math.max(0.5,num('eMin',10)),Ts:num('eTs',30),Tr:num('eTr',40),eff:lim(num('eEff',85),50,100)/100,margin:Math.max(0,num('eMar',20))/100,Hmax:Math.max(3,num('eH',15)),costV:Math.max(0,num('eCost',500))};
  const r=rideThroughTank(i);
  $('eRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${fmt(r.V)} <small>m³</small></div><div class="l">Tank volume, with ${fmt(i.margin*100)}% margin</div></div>
      <div class="bn"><div class="v">${r.n>1?r.n+' × ':''}Ø ${fmt(r.D,1)} × ${fmt(r.H,1)} <small>m</small></div><div class="l">${r.n>1?r.n+' tanks: diameter':'Diameter'} × height · ${fmt(r.area)} m² footprint</div></div>
      <div class="bn"><div class="v">${fmt(i.min/0.75,1)} <small>min</small></div><div class="l">At 75% load</div></div>
      <div class="bn"><div class="v">${money(r.cost)}</div><div class="l">Indicative tank cost</div></div>
    </div>
    <div class="tankrow">${tankSvg(r.D,r.H)}</div>`;

}
document.querySelectorAll('#inEmg input').forEach(el=>el.addEventListener('input',run));
run();
