// ---------- Liquid Rack Cooling: page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const lim=(v,a,b)=>Math.min(b,Math.max(a,v));   // typed values are not held to the min / max of the fields
const secs=s=>!isFinite(s)?'no limit':s<90?`${fmt(s,s<10?1:0)} s`:`${fmt(s/60,1)} min`;
const QUAL={vendor:'Published',reported:'Reported',est:'Estimate'};
let SCEN='jump', R=null, userTank=false;   // userTank: the tank was typed in; otherwise it follows the minimum

[...new Set(PLATFORMS.map(p=>p.group))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  PLATFORMS.filter(p=>p.group===g).forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; og.appendChild(o); }); $('rP').appendChild(og); });
const plat=()=>PLATFORMS.find(p=>p.id===$('rP').value);

// platform defaults go into the fields; the user can still change them
function loadPlatform(){ const p=plat(); $('rPkw').value=p.P; $('rTs').value=Math.min(40,p.TsMax); $('rIdle').value=Math.round(p.idle*100); $('rVrack').value=p.Vrack;
  $('rPnote').textContent=`${fmt(p.P)} kW per rack${p.Ppeak>p.P?` (short peaks to ${fmt(p.Ppeak)} kW)`:''} · ${fmt(p.liq*100)}% to liquid · ASHRAE ${p.cls}`; }

function run(){
  const p=plat();
    const i={fluid:$('rFluid').value,P:Math.max(1,num('rPkw',p.P)),Ts:lim(num('rTs',Math.min(40,p.TsMax)),5,p.TrMax-2),margin:lim(num('rMargin',20),0,100)/100,idle:lim(num('rIdle',30),5,100)/100,
    tDet:Math.max(0,num('rDet',5)),tRamp:Math.max(0,num('rRamp',15)),tMCV:Math.max(0,num('rMCV',60)),
    Vrack:Math.max(1,num('rVrack',p.Vrack)),Vcdu:Math.max(0,num('rVcdu',40)),Vbuf:userTank?Math.max(0,num('rVbuf',0)):null,
    tcsL:Math.max(1,num('rTcsL',20)),tcsV:lim(num('rTcsV',0.8),0.3,3),sensAt:$('rSens').value,dTair:lim(num('rAir',12),5,25)};
  R=rackStudy(p,i); i.Vbuf=R.Vbuf; R.i=i; if(!userTank&&document.activeElement!==$('rVbuf')) $('rVbuf').value=R.Vbuf;   // never rewrite the field while it is being typed in
  $('rVbufNote').innerHTML=!isFinite(R.Vmin)?'No practical tank covers the response: use a faster MCV or VFD pump.':R.Vmin===0?'No tank needed.':userTank?`Minimum to cover the response: ${fmt(R.Vmin)} L/rack · <a href="#" id="rVbufReset">use it</a>`:`The minimum that covers the response.`;
  if($('rVbufReset')) $('rVbufReset').onclick=e=>{ e.preventDefault(); userTank=false; run(); };
  const r=R, a=r.noTank, b=r.tank, tk=`${fmt(i.Vbuf)} L/rack tank${isFinite(r.Vmin)&&i.Vbuf===r.Vmin?' (minimum)':''}`, withTank=i.Vbuf>0;
  // one value of a pair: safe minimum flow, or TCS supply rise
  // vendor floor: the published minimum flow, not the load jump, sets the safe minimum
  const atV=s=>p.minLpm&&s.ok&&s.F<=p.minLpm*(1+1e-4), floored=atV(a)||(withTank&&atV(b));
  const th=floored?rackStudy({...p,minLpm:null},i):null;   // thermal minimum without the vendor floor
  const flowV=(s,lab)=>`<div><span class="v${s.ok?'':' bad'}">${fmt(s.ok?s.F:r.Fop)} <small>L/min</small></span><span class="l">${s.ok?`${fmt(s.fSafe*100)}% · `:'100% · no turndown · '}${atV(s)?'vendor minimum · ':''}${lab}</span></div>`;
  const riseV=(s,lab)=>`<div><span class="v${s.ok?'':' bad'}">+${fmt(s.rise,1)} <small>K</small></span><span class="l">${lab}</span></div>`;
  const pair=(fn)=>withTank?fn(a,'no tank')+fn(b,`with ${tk}`):fn(a,'no tank');
  const over=r.Ts>p.TsMax+1e-9;
  $('rTsNote').innerHTML=over?`<span style="color:var(--bad)"><b>Above the ${fmt(p.TsMax)} °C maximum (ASHRAE ${p.cls}):</b> risky unless confirmed by the manufacturer.</span>`:`Maximum ${fmt(p.TsMax)} °C (ASHRAE ${p.cls}).`;
  $('rStatus').textContent='';
  $('rRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v">${fmt(r.Fop)} <small>L/min</small></div><div class="l">Operating flow per rack · ${fmt(r.Ql,1)} kW to liquid</div></div>
      <div class="bn"><div class="l">Safe minimum flow at idle</div><div class="pair">${pair(flowV)}</div></div>
      <div class="bn"><div class="l">TCS supply rise while the MCV opens</div><div class="pair">${pair(riseV)}</div></div>
    </div>
    <div class="verdict${(a.ok||b.ok&&withTank)&&!over?'':' warn'}">
      ${over?`<b>Supply above the platform maximum:</b> ${fmt(r.Ts,r.Ts%1?1:0)} °C is above the ${fmt(p.TsMax)} °C maximum (ASHRAE ${p.cls}). This is risky unless confirmed in writing by the manufacturer for this platform.<br>`:''}
      ${a.ok?`<b>Variable flow</b> can go down to ${fmt(a.F)} L/min per rack at idle (${fmt(a.fSafe*100)}% of the operating flow)${withTank&&b.ok?`, or ${fmt(b.F)} L/min with the ${tk}`:''}${atV(a)?` (the vendor minimum)`:''}.`
        :withTank&&b.ok?`<b>Without a tank</b> the coolant passes ${fmt(r.Tr)} °C after a load jump even at full flow: the MCV (${fmt(i.tMCV)} s) is too slow for the loop water alone. With the ${tk}, variable flow can go down to ${fmt(b.F)} L/min per rack at idle (${fmt(b.fSafe*100)}%).`
        :`<b>No safe turndown:</b> after a load jump the coolant passes ${fmt(r.Tr)} °C even at full flow. Use a faster MCV or pump${withTank?', or a larger TCS tank':', or add a TCS buffer tank'}${i.sensAt==='cdu'?', or sense the return at the rack manifold':''}.`}<br>
      ${floored?`<b>Vendor minimum flow:</b> the manufacturer requires at least ${fmt(p.minLpm)} L/min per rack for even flow through every cold plate, so the minimum stops there${withTank?', with or without a tank':''}. The load jump alone would allow ${fmt(th.noTank.F,1)} L/min${withTank&&th.tank.ok?` (${fmt(th.tank.F,1)} L/min with the ${tk})`:''}; a tank cannot take the flow below the vendor minimum.<br>`:''}
      <b>Minimum TCS tank:</b> ${!isFinite(r.Vmin)?`no practical tank covers the response; use a faster MCV or VFD pump`:r.Vmin===0?'none needed; the water in the CDU and the TCS pipes covers the response':`${fmt(r.Vmin)} L per rack covers the response gap. Extra volume only lowers the supply rise; a faster VFD pump, not a bigger tank, lowers the minimum flow further`}.<br>
      <b>Pump trip:</b> the rack reaches its limit in about ${secs(r.tPump)}. Run the standby CDU pump in hot standby.<br>
    </div>`;
  chart();
}

function chart(){
  const r=R, i=r.i, limC=css('--bad'), o=baseOpts(), a=r.noTank, b=r.tank, withTank=i.Vbuf>0;
  o.scales.x={type:'linear',grid:{display:false},ticks:{color:css('--text2')},title:{display:true,color:css('--text2')}};
  o.scales.y.title={display:true,text:'Coolant, °C',color:css('--text2')};
  o.plugins.tooltip={mode:'nearest',intersect:false,callbacks:{label:x=>`${x.dataset.label}: ${fmt(x.raw.y,1)}${x.dataset.yAxisID==='y1'?' %':' °C'}`}};
  const line=(label,data,color,extra={})=>({label,data,borderColor:color,backgroundColor:color,borderWidth:2,pointRadius:0,tension:.2,...extra});
  const at=s=>s.ok?`${fmt(s.F)} L/min`:'full flow';
  let ds, title, note;
  if(SCEN==='jump'){
    const end=a.tr.at(-1).t;
    o.scales.x.title.text='Seconds after the load jump';
    o.scales.y1={position:'right',min:0,max:120,grid:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'Rack flow, % of operating',color:css('--text2')}};
    ds=[line(`Return, no tank (${at(a)})`,a.tr.map(x=>({x:x.t,y:x.T})),css('--grey2')),
      line('TCS supply, no tank',a.tr.map(x=>({x:x.t,y:x.Ts})),css('--grey2'),{borderDash:[5,4],borderWidth:1.5})];
    if(withTank) ds.push(line(`Return, with tank (${at(b)})`,b.tr.map(x=>({x:x.t,y:x.T})),css('--brand'),{borderWidth:2.5}),
      line('TCS supply, with tank',b.tr.map(x=>({x:x.t,y:x.Ts})),css('--brand'),{borderDash:[5,4],borderWidth:1.5}));
    const s=withTank?b:a;
    ds.push(line('Rack flow',s.tr.map(x=>({x:x.t,y:x.f*100})),css('--s1'),{borderDash:[2,3],borderWidth:1.5,yAxisID:'y1'}),
      line('Return limit',[{x:0,y:r.Tr},{x:end,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1}));
    title=`Idle (${fmt(i.idle*100)}%) → ${fmt(r.P)} kW at once, from the safe minimum flow; VFD pump ${fmt(i.tRamp)} s, MCV ${fmt(i.tMCV)} s`;
    note=`The CDU reacts after ${fmt(r.tSense)} s. Until the MCV is open, the heat exchanger removes only the idle heat, so the TCS supply warms; the loop water${withTank?' and the tank':''} slow that rise.`;
  }else{
    o.scales.x.title.text='Seconds after the CDU pump trips';
    ds=[line('Return temperature',r.pumpTrace.map(x=>({x:x.t,y:x.T})),css('--brand'),{borderWidth:2.5}),
      line('Return limit',[{x:0,y:r.Tr},{x:r.pumpTrace.at(-1).t,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1})];
    title='CDU pump trips at rated load: no flow until the standby pump takes over';
    note=`Only the buffer at the chips (${fmt(i.Vrack)} L water-equivalent: cold-plate coolant and metal) absorbs the heat, starting ${fmt(r.head,1)} K below the limit. In practice the GPUs throttle soon after.`;
  }
  $('rChartTitle').textContent=title; $('rChartNote').textContent='';
  $('rLegend').innerHTML=ds.map(d=>`<span><i style="background:${d.borderColor}"></i>${d.label}</span>`).join('');
  mk('rChart',{type:'line',data:{datasets:ds},options:o});
}


$('rP').onchange=()=>{ userTank=false; loadPlatform(); run(); };   // a new platform starts from its own minimum tank
$('rVbuf').addEventListener('blur',()=>{ if($('rVbuf').value===''){ userTank=false; run(); } });   // left empty: back to the minimum
document.querySelectorAll('#inRack input, #rFluid, #rSens').forEach(el=>el.addEventListener('input',()=>{ if(el.id==='rVbuf') userTank=$('rVbuf').value!==''; run(); }));
document.querySelectorAll('#rScen button').forEach(b=>b.onclick=()=>{ SCEN=b.dataset.s; document.querySelectorAll('#rScen button').forEach(x=>x.classList.toggle('on',x===b)); chart(); });
loadPlatform(); run();
