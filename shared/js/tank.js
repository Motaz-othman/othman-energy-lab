// ---------- shared chilled-water tank sizing (Ride-Through Tank, Peak Shaving Tank); load after ui.js ----------
const RHO_CP=4180;   // water, kJ per m³ per K

// m³ of chilled water to store E kWh of cooling at a supply/return difference dT, with stratification efficiency eff
const tankVolume=(E,dT,eff)=>E*3600/(RHO_CP*dT*eff);
// vertical stratified tanks: height up to Hmax, keeping height / diameter between 1 and 4;
// when one tank at the height limit would be wider than tall, the volume is split into n equal tanks
function tankShape(V,Hmax){
  let n=0, D, H;
  do{ n++; const v=V/n; D=Math.pow(v/Math.PI,1/3); H=4*D;   // tallest useful shape (H = 4 D)
      if(H>Hmax){ H=Hmax; D=Math.sqrt(4*v/(Math.PI*H)); }    // limited by the allowed height
  }while(H<D-1e-9&&n<20);
  return {n,D,H,area:n*Math.PI*D*D/4};
}
const tankText=t=>`${t.n>1?t.n+' tanks, each ':''}Ø ${fmt(t.D,1)} × ${fmt(t.H,1)} m`;

// drawing of the stratified tank with its diameter and height
function tankSvg(D,H){
  const rgba=(hex,a)=>{ const h=hex.replace('#',''), n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
  const s=Math.min(110/Math.max(D,1),150/Math.max(H,1)), w=Math.max(30,D*s), h=Math.max(24,H*s), x=(150-w)/2, y=12, ry=Math.max(5,w*0.12);
  return `<svg class="tanksvg" viewBox="0 0 170 ${y+h+ry+34}" role="img" aria-label="Tank ${fmt(D,1)} m diameter by ${fmt(H,1)} m high">
  <defs><linearGradient id="strat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${rgba(css('--s2'),.55)}"/><stop offset=".48" style="stop-color:${rgba(css('--s2'),.25)}"/><stop offset=".52" style="stop-color:${rgba(css('--s1'),.25)}"/><stop offset="1" style="stop-color:${rgba(css('--s1'),.6)}"/></linearGradient></defs>
  <path class="shell" d="M${x} ${y} V${y+h} A${w/2} ${ry} 0 0 0 ${x+w} ${y+h} V${y} Z" style="fill:url(#strat)"/>
  <ellipse class="shell" cx="${x+w/2}" cy="${y}" rx="${w/2}" ry="${ry}"/>
  <path class="dim" d="M${x} ${y+h+ry+12}H${x+w}M${x} ${y+h+ry+8}v8M${x+w} ${y+h+ry+8}v8"/>
  <text x="${x+w/2}" y="${y+h+ry+28}" text-anchor="middle">Ø ${fmt(D,1)} m</text>
  <path class="dim" d="M${x+w+10} ${y}V${y+h}M${x+w+6} ${y}h8M${x+w+6} ${y+h}h8"/>
  <text x="${x+w+16}" y="${y+h/2+4}">${fmt(H,1)} m</text></svg>`;
}
