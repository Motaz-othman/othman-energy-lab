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
  $('rVbufNote').innerHTML=!isFinite(R.Vmin)?'No practical tank covers the response: use a faster MCV or VFD pump.':R.Vmin===0?'No tank needed: the loop water covers the response. A tank only lowers the supply rise.':userTank?`Minimum to cover the response: ${fmt(R.Vmin)} L/rack · <a href="#" id="rVbufReset">use it</a>`:`Filled with the minimum that covers the response. More only lowers the supply rise.`;
  if($('rVbufReset')) $('rVbufReset').onclick=e=>{ e.preventDefault(); userTank=false; run(); };
  const r=R, a=r.noTank, b=r.tank, tk=`${fmt(i.Vbuf)} L/rack tank${isFinite(r.Vmin)&&i.Vbuf===r.Vmin?' (minimum)':''}`, withTank=i.Vbuf>0;
  // one value of a pair: safe minimum flow, or TCS supply rise
  const flowV=(s,lab)=>`<div><span class="v${s.ok?'':' bad'}">${fmt(s.ok?s.F:r.Fop)} <small>L/min</small></span><span class="l">${s.ok?`${fmt(s.fSafe*100)}% · `:'100% · no turndown · '}${lab}</span></div>`;
  const riseV=(s,lab)=>`<div><span class="v${s.ok?'':' bad'}">+${fmt(s.rise,1)} <small>K</small></span><span class="l">${lab}</span></div>`;
  const pair=(fn)=>withTank?fn(a,'no tank')+fn(b,`with ${tk}`):fn(a,'no tank');
  const over=r.Ts>p.TsMax+1e-9;
  $('rTsNote').innerHTML=over?`<span style="color:var(--bad)"><b>Above the ${fmt(p.TsMax)} °C maximum (ASHRAE ${p.cls}):</b> risky unless confirmed by the manufacturer.</span>`:`Default 40 °C. Maximum ${fmt(p.TsMax)} °C as per ASHRAE ${p.cls}; a higher supply saves more on the facility water. The flow follows the platform rule at the supply chosen.`;
  $('rStatus').textContent=`Per rack · ${p.name}`;
  $('rRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v">${fmt(r.Fop)} <small>L/min</small></div><div class="l">Operating flow · ${fmt(r.Ql,1)} kW to liquid, return ${fmt(r.TrOp,1)} °C (limit ${fmt(r.Tr)} °C) at ${fmt(r.Ts,r.Ts%1?1:0)} °C supply${r.Qa>0.05?` · ${fmt(r.Qa,1)} kW to air, ${fmt(r.air)} m³/h`:''}</div></div>
      <div class="bn"><div class="l">Safe minimum flow at idle</div><div class="pair">${pair(flowV)}</div></div>
      <div class="bn"><div class="l">TCS supply rise while the MCV opens</div><div class="pair">${pair(riseV)}</div></div>
    </div>
    <div class="verdict${(a.ok||b.ok&&withTank)&&!over?'':' warn'}">
      ${over?`<b>Supply above the platform maximum:</b> ${fmt(r.Ts,r.Ts%1?1:0)} °C is above the ${fmt(p.TsMax)} °C maximum (ASHRAE ${p.cls}). This is risky unless confirmed in writing by the manufacturer for this platform.<br>`:''}
      ${a.ok?`<b>Variable flow</b> can go down to ${fmt(a.F)} L/min per rack at idle (${fmt(a.fSafe*100)}% of the operating flow)${withTank&&b.ok?`, or ${fmt(b.F)} L/min with the ${tk}`:''}. Below that, a jump from idle to the ${fmt(r.P)} kW rated load heats the coolant past ${fmt(r.Tr)} °C before the VFD pump ramps up (${fmt(r.tSense)} s to react + ${fmt(i.tRamp)} s ramp).`
        :withTank&&b.ok?`<b>Without a tank</b> the coolant passes ${fmt(r.Tr)} °C after a load jump even at full flow: the MCV (${fmt(i.tMCV)} s) is too slow for the loop water alone. With the ${tk}, variable flow can go down to ${fmt(b.F)} L/min per rack at idle (${fmt(b.fSafe*100)}%).`
        :`<b>No safe turndown:</b> after a load jump the coolant passes ${fmt(r.Tr)} °C even at full flow. Use a faster MCV or pump${withTank?', or a larger TCS tank':', or add a TCS buffer tank'}${i.sensAt==='cdu'?', or sense the return at the rack manifold':''}.`}<br>
      <b>Minimum TCS tank:</b> ${!isFinite(r.Vmin)?`no practical tank covers the response; use a faster MCV or VFD pump`:r.Vmin===0?'none needed; the water in the CDU and the TCS pipes covers the response':`${fmt(r.Vmin)} L per rack covers the response gap. Extra volume only lowers the supply rise; a faster VFD pump, not a bigger tank, lowers the minimum flow further`}.<br>
      <b>Control valve:</b> while the MCV opens (${fmt(i.tMCV)} s) the TCS supply rises by up to ${fmt(a.rise,1)} K${withTank?`; ${fmt(b.rise,1)} K with the ${tk}`:''}.<br>
      <b>Pump trip:</b> the rack reaches its limit in about ${secs(r.tPump)}. Run the standby CDU pump in parallel (hot standby) with automatic changeover.<br>
      <span class="note">Chiller plant resets are handled on the facility water side, for example with a tank on the facility loop: see the <a href="../ride-through-tank/index.html">Ride-Through Tank</a>.</span>
    </div>`;
  chart(); details();
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
  $('rChartTitle').textContent=title; $('rChartNote').textContent=note;
  $('rLegend').innerHTML=ds.map(d=>`<span><i style="background:${d.borderColor}"></i>${d.label}</span>`).join('');
  mk('rChart',{type:'line',data:{datasets:ds},options:o});
}

function details(){
  const r=R, p=r.p, i=r.i, a=r.noTank, b=r.tank, q=k=>`<span class="tag${p.q[k]==='vendor'?' ok':''}">${QUAL[p.q[k]]}</span>`;
  const fl=s=>s.ok?`${fmt(s.F)} L/min (${fmt(s.fSafe*100)}%)`:`${fmt(r.Fop)} L/min (100%, no turndown)`;
  $('rDet').innerHTML=`<h3>Platform data</h3>
    ${table(['Item','Value','Basis'],[
      `<tr><td>Rack power</td><td>${fmt(r.P)} kW${Math.abs(r.P-p.P)>1e-6?` (platform ${fmt(p.P)} kW)`:''}${p.Ppeak>p.P?` (short peaks to ${fmt(p.Ppeak)} kW)`:''}</td><td>${q('P')}</td></tr>`,
      `<tr><td>Heat to liquid</td><td>${fmt(p.liq*100)}%</td><td>${q('liq')}</td></tr>`,
      `<tr><td>Max coolant supply</td><td>${fmt(p.TsMax)} °C (ASHRAE ${p.cls})</td><td>${q('TsMax')}</td></tr>`,
      `<tr><td>Max coolant return</td><td>${fmt(p.TrMax)} °C</td><td>${q('TrMax')}</td></tr>`,
      `<tr><td>Idle heat</td><td>${fmt(p.idle*100)}% of rack power</td><td>${q('idle')}</td></tr>`,
      `<tr><td>Buffer at the chips (cold-plate coolant + metal)</td><td>${fmt(p.Vrack)} L water-eq.</td><td>${q('Vrack')}</td></tr>`,
      p.minLpm?`<tr><td>Vendor minimum flow</td><td>${fmt(p.minLpm)} L/min per rack</td><td><span class="tag ok">Published</span></td></tr>`:''])}
    <p class="note">${esc(p.note)} Sources: ${p.src.map(s=>`<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(', ')}.</p>
    <h3>Flow per rack</h3>
    ${table(['Flow','L/min','Note'],[
      `<tr><td>Minimum at rated load</td><td>${fmt(r.Freq)}</td><td>holds the return at ${fmt(r.Tr)} °C at ${fmt(r.Ts)} °C supply</td></tr>`,
      `<tr><td>Operating flow (+${fmt(i.margin*100)}%)</td><td>${fmt(r.Fop)}</td><td>return ${fmt(r.TrOp,1)} °C, ${fmt(r.head,1)} K below the limit</td></tr>`,
      `<tr><td>Safe minimum at idle, no tank</td><td colspan="2">${fl(a)} · TCS loop water ${fmt(a.Mt/r.f.rho*1000)} L per rack (pipes ${fmt(r.Mpipe/r.f.rho*1000)} L, CDU ${fmt(i.Vcdu)} L)</td></tr>`,
      i.Vbuf>0?`<tr><td>Safe minimum at idle, with ${fmt(i.Vbuf)} L/rack tank</td><td colspan="2">${fl(b)} · TCS loop water ${fmt(b.Mt/r.f.rho*1000)} L per rack</td></tr>`:''])}
    <h3>Response chain</h3>
    ${table(['Stage','What sets it','Time'],r.chain.map(c=>`<tr><td>${c.k}</td><td>${c.d}</td><td>${secs(c.t)}</td></tr>`))}
    <ul class="method">
      <li><b>Flow:</b> liquid heat ÷ (ρ·cp·(return limit − supply)), with ${esc(r.f.name)} (ρ ${fmt(r.f.rho)} kg/m³, cp ${fmt(r.f.cp,2)} kJ/kg·K). This reproduces the Lenovo GB300 table (59 L/min at 25 °C … 177 L/min at 45 °C). The supply is the value entered, at most the platform maximum.</li>
      <li><b>Load jump:</b> the rack goes from idle to its ${fmt(r.P)} kW rated load at once. Short electrical peaks${p.Ppeak>p.P?` (to ${fmt(p.Ppeak)} kW)`:''} last milliseconds to seconds and are smoothed by the thermal mass. Two water masses: the buffer at the chips, and the TCS loop (CDU, TCS pipes${i.Vbuf>0?', buffer tank':''}) at the supply temperature. The CDU reacts after the sensing time; then the VFD pump ramps the rack flow to the operating flow and the MCV opens the facility water to the heat exchanger (taken with the same ${fmt(i.margin*100)}% margin). The safe minimum is the lowest idle flow whose return stays at or below the limit${p.minLpm?', and not below the vendor minimum':''}.</li>
      <li><b>Load drop:</b> going from full load to idle is not a thermal risk for the chips; the flow and the valve follow at their own pace, and the ΔT is low for a short time.</li>
      <li><b>Pump trip:</b> no flow at rated load; only the buffer at the chips absorbs the heat, from the operating return up to the limit.</li>
      <li><b>Return limit as the safety line:</b> it is the platform design rating; the chips throttle at their own junction limit, somewhat later. The CDU is assumed to raise the flow when the return temperature rises (temperature or ΔT control); with fixed differential-pressure control the rack flow does not follow the load at all.</li>
      <li><b>Chiller plant resets</b> are covered on the facility water side and are not part of this check.</li>
      <li>Screening estimate: confirm with the platform vendor's site planning guide and the CDU data (pump ramp, valve stroke).</li>
    </ul>`;
}

$('rP').onchange=()=>{ loadPlatform(); run(); };
$('rVbuf').addEventListener('blur',()=>{ if($('rVbuf').value===''){ userTank=false; run(); } });   // left empty: back to the minimum
document.querySelectorAll('#inRack input, #rFluid, #rSens').forEach(el=>el.addEventListener('input',()=>{ if(el.id==='rVbuf') userTank=$('rVbuf').value!==''; run(); }));
document.querySelectorAll('#rScen button').forEach(b=>b.onclick=()=>{ SCEN=b.dataset.s; document.querySelectorAll('#rScen button').forEach(x=>x.classList.toggle('on',x===b)); chart(); });
loadPlatform(); run();
