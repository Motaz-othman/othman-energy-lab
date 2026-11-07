// ---------- Liquid Rack Cooling: page logic ----------
const num=(id,d)=>{ const v=parseFloat($(id).value); return isNaN(v)?d:v; };
const lim=(v,a,b)=>Math.min(b,Math.max(a,v));   // typed values are not held to the min / max of the fields
const secs=s=>!isFinite(s)?'no limit':s<90?`${fmt(s,s<10?1:0)} s`:`${fmt(s/60,1)} min`;
const QUAL={vendor:'Published',reported:'Reported',est:'Estimate'};
let SCEN='jump', R=null;

[...new Set(PLATFORMS.map(p=>p.group))].forEach(g=>{ const og=document.createElement('optgroup'); og.label=g;
  PLATFORMS.filter(p=>p.group===g).forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; og.appendChild(o); }); $('rP').appendChild(og); });
RESETS.forEach(x=>{ const o=document.createElement('option'); o.value=x.id; o.textContent=`${x.name} (${x.min} min reset)`; $('rReset').appendChild(o); });
const plat=()=>PLATFORMS.find(p=>p.id===$('rP').value);

// platform defaults go into the fields; the user can still change them
function loadPlatform(){ const p=plat(); $('rIdle').value=Math.round(p.idle*100); $('rVrack').value=p.Vrack;
  $('rPnote').textContent=`${fmt(p.P)} kW per rack${p.Ppeak>p.P?` (up to ${fmt(p.Ppeak)} kW peak)`:''} · ${fmt(p.liq*100)}% to liquid · ASHRAE ${p.cls}`; }
function loadReset(){ $('rResetMin').value=RESETS.find(x=>x.id===$('rReset').value).min; }

function run(){
  const p=plat();
  const i={fluid:$('rFluid').value,Ts:p.TsMax,margin:lim(num('rMargin',20),0,100)/100,idle:lim(num('rIdle',30),5,100)/100,
    tDet:Math.max(0,num('rDet',3)),tRamp:Math.max(0,num('rRamp',7)),pipeL:Math.max(5,num('rPipe',150)),vel:lim(num('rVel',2),0.5,4),Vrack:Math.max(1,num('rVrack',p.Vrack)),
    Vcdu:Math.max(0,num('rVcdu',40)),dTair:lim(num('rAir',12),5,25),Vbuf:Math.max(0,num('rVbuf',100)),tcsL:Math.max(1,num('rTcsL',20)),tcsV:lim(num('rTcsV',0.8),0.3,3),sensAt:$('rSens').value,resetMin:Math.max(0.5,num('rResetMin',3))};
  R=rackStudy(p,i); R.i=i;
  const r=R, okBuf=r.FresetBuf<=r.Fop+0.5;
  // flow the CDU must deliver through a plant reset: covered by the operating flow, a higher flow, or not possible
  const ride=(F,lab)=>`<div><span class="v${!isFinite(F)?' bad':F<=r.Fop+0.5?' good':''}">${isFinite(F)?`${fmt(F)} <small>L/min</small>`:'none'}</span><span class="l">${lab}</span></div>`;
  $('rStatus').textContent=`Per rack · ${p.name}`;
  $('rRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${fmt(p.TsMax)} <small>°C</small></div><div class="l">Max coolant supply (ASHRAE ${p.cls}) · return limit ${fmt(r.Tr)} °C</div></div>
      <div class="bn"><div class="v">${fmt(r.Fop)} <small>L/min</small></div><div class="l">${fmt(r.Ql,1)} kW to liquid · return ${fmt(r.TrOp,1)} °C at ${fmt(r.Ts,r.Ts%1?1:0)} °C supply${r.Qa>0.05?` · ${fmt(r.Qa,1)} kW to air, ${fmt(r.air)} m³/h`:''}</div></div>
      <div class="bn"><div class="v">${fmt(r.FSafe)} <small>L/min</small></div><div class="l">${r.peakOK?`Safe minimum flow · ${fmt(r.fSafe*100)}% of operating. Survives a jump from idle to peak load`:`No turndown: even full flow does not hold a jump to the ${fmt(r.p.Ppeak)} kW peak`}</div></div>
      <div class="bn"><div class="l">Flow to ride through a ${fmt(i.resetMin,1)}-min plant reset</div><div class="pair">${ride(r.FresetBuf,`with ${fmt(i.Vbuf)} L/rack tank`)}${ride(r.FresetNo,'no tank')}</div></div>
    </div>
    <div class="verdict${okBuf?'':' warn'}">
      ${r.peakOK?`<b>Variable flow</b> can go down to ${fmt(r.fSafe*100)}% of the operating flow (${fmt(r.FSafe)} L/min per rack). Below that, a jump from idle to the ${fmt(r.p.Ppeak)} kW peak heats the coolant past ${fmt(r.Tr)} °C before the CDU responds (${fmt(r.tResp)} s).`:`<b>Variable flow:</b> no turndown. A jump to the ${fmt(r.p.Ppeak)} kW peak passes ${fmt(r.Tr)} °C even at full flow: raise the flow margin.`}<br>
      <b>Plant reset:</b> ${okBuf?`the ${fmt(i.Vbuf)} L/rack tank covers a ${fmt(i.resetMin,1)}-min reset at the operating flow.`:isFinite(r.FresetBuf)?`to ride through a ${fmt(i.resetMin,1)}-min reset at ${fmt(r.Ts)} °C supply, the CDU must deliver <b>${fmt(r.FresetBuf)} L/min per rack</b> with the ${fmt(i.Vbuf)} L/rack tank${isFinite(r.FresetNo)?` (${fmt(r.FresetNo)} L/min without a tank)`:''}. Size the CDU pumps and the TCS pipes for it, or use a ${fmt(r.bufL)} L/rack tank to stay at the operating flow.`:`no flow is enough with a ${fmt(i.Vbuf)} L/rack tank: the loop warms past the limit within the reset. Use at least ${fmt(r.bufL)} L/rack at the operating flow.`}<br>
      <b>Pump trip:</b> the rack reaches its limit in about ${secs(r.tPump)}. Run the standby CDU pump in parallel (hot standby) with automatic changeover.
    </div>`;
  chart(); details();
}

function chart(){
  const r=R, i=r.i, limC=css('--bad'), o=baseOpts();
  o.scales.x={type:'linear',grid:{display:false},ticks:{color:css('--text2')},title:{display:true,color:css('--text2')}};
  o.scales.y.title={display:true,text:'Coolant return, °C',color:css('--text2')};
  o.plugins.tooltip={mode:'nearest',intersect:false,callbacks:{label:x=>`${x.dataset.label}: ${fmt(x.raw.y,1)}${x.dataset.yAxisID==='y1'?' %':' °C'}`}};
  const line=(label,data,color,extra={})=>({label,data,borderColor:color,backgroundColor:color,borderWidth:2,pointRadius:0,tension:.2,...extra});
  let ds, title, note, leg;
  if(SCEN==='jump'){
    const T=(tr)=>tr.map(x=>({x:x.t,y:x.T}));
    o.scales.x.title.text='Seconds after the load jump'; o.scales.y1={position:'right',min:0,max:120,grid:{display:false},ticks:{color:css('--text2')},title:{display:true,text:'Flow, % of operating',color:css('--text2')}};
    ds=[line('Return at idle-following flow',T(r.jumpFollow.tr),css('--grey2')),line('Return at the safe minimum flow',T(r.jumpSafe.tr),css('--brand'),{borderWidth:2.5}),
      line('Flow (safe minimum case)',r.jumpSafe.tr.map(x=>({x:x.t,y:x.f*100})),css('--s1'),{borderDash:[5,4],borderWidth:1.5,yAxisID:'y1'}),
      line('Return limit',[{x:0,y:r.Tr},{x:r.jumpSafe.tr.at(-1).t,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1})];
    title=`Idle (${fmt(i.idle*100)}%) → ${fmt(r.p.Ppeak)} kW peak at once; the CDU responds in ${fmt(r.tSense)} s and ramps the flow over ${fmt(i.tRamp)} s`;
    note=isFinite(r.tNoResp)?`If the flow simply followed the idle heat (${fmt(r.fFollow*100)}%) and never rose, the coolant would pass ${fmt(r.Tr)} °C ${secs(r.tNoResp)} after the jump. The CDU needs ${fmt(r.tResp)} s to bring the flow back.`:`Even if the flow stayed at the idle-following value (${fmt(r.fFollow*100)}%), the coolant would stay below ${fmt(r.Tr)} °C.`;
  }else if(SCEN==='reset'){
    o.scales.x.title.text='Minutes with no plant cooling';
    ds=[line('Return temperature',r.resetTrace.map(x=>({x:x.t,y:x.T})),css('--brand'),{borderWidth:2.5}),
      line('Return limit',[{x:0,y:r.Tr},{x:r.resetTrace.at(-1).t,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1}),
      line('End of plant reset',[{x:i.resetMin,y:r.TrOp},{x:i.resetMin,y:r.resetTrace.at(-1).T}],css('--grey2'),{borderDash:[2,3],borderWidth:1})];
    title=`Chiller plant resets: no cooling for ${fmt(i.resetMin,1)} min, flow kept at ${fmt(r.Fop)} L/min`;
    note=`The water in the facility pipes (${fmt(i.pipeL)} m each way, round trip ${secs(r.tRT)}), the TCS pipes (${fmt(i.tcsL)} m at ${fmt(i.tcsV,1)} m/s), the CDU and the rack absorbs the heat: about ${fmt(r.Mloop/r.f.rho,2)} m³ per rack, rising ${fmt(r.rise*60,1)} K per minute.`;
  }else{
    o.scales.x.title.text='Seconds after the CDU pump trips';
    ds=[line('Return temperature',r.pumpTrace.map(x=>({x:x.t,y:x.T})),css('--brand'),{borderWidth:2.5}),
      line('Return limit',[{x:0,y:r.Tr},{x:r.pumpTrace.at(-1).t,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1})];
    title='CDU pump trips at full load: no flow until the standby pump takes over';
    note=`Only the buffer at the chips (${fmt(i.Vrack)} L water-equivalent: cold-plate coolant and metal) absorbs the heat, starting ${fmt(r.head,1)} K below the limit. In practice the GPUs throttle soon after.`;
  }
  $('rChartTitle').textContent=title; $('rChartNote').textContent=note;
  $('rLegend').innerHTML=ds.map(d=>`<span><i style="background:${d.borderColor}"></i>${d.label}</span>`).join('');
  mk('rChart',{type:'line',data:{datasets:ds},options:o});
}

function details(){
  const r=R, p=r.p, i=r.i, q=k=>`<span class="tag${p.q[k]==='vendor'?' ok':''}">${QUAL[p.q[k]]}</span>`;
  $('rDet').innerHTML=`<h3>Platform data</h3>
    ${table(['Item','Value','Basis'],[
      `<tr><td>Rack power</td><td>${fmt(p.P)} kW${p.Ppeak>p.P?` (peak ${fmt(p.Ppeak)} kW)`:''}</td><td>${q('P')}</td></tr>`,
      `<tr><td>Heat to liquid</td><td>${fmt(p.liq*100)}%</td><td>${q('liq')}</td></tr>`,
      `<tr><td>Max coolant supply</td><td>${fmt(p.TsMax)} °C (ASHRAE ${p.cls})</td><td>${q('TsMax')}</td></tr>`,
      `<tr><td>Max coolant return</td><td>${fmt(p.TrMax)} °C</td><td>${q('TrMax')}</td></tr>`,
      `<tr><td>Idle heat</td><td>${fmt(p.idle*100)}% of rack power</td><td>${q('idle')}</td></tr>`,
      `<tr><td>Buffer at the chips (cold-plate coolant + metal)</td><td>${fmt(p.Vrack)} L water-eq.</td><td>${q('Vrack')}</td></tr>`,
      p.minLpm?`<tr><td>Vendor minimum flow</td><td>${fmt(p.minLpm)} L/min per rack</td><td><span class="tag ok">Published</span></td></tr>`:''])}
    <p class="note">${esc(p.note)} Sources: ${p.src.map(s=>`<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(', ')}.</p>
    <h3>Flow per rack</h3>
    ${table(['Flow','L/min','Note'],[
      `<tr><td>Minimum to hold the return at ${fmt(r.Tr)} °C</td><td>${fmt(r.Freq)}</td><td>at ${fmt(r.Ts,r.Ts%1?1:0)} °C supply, full load</td></tr>`,
      `<tr><td>Operating flow (sized at ${fmt(p.TsMax)} °C, +${fmt(i.margin*100)}%)</td><td>${fmt(r.Fop)}</td><td>return ${fmt(r.TrOp,1)} °C, ${fmt(r.head,1)} K below the limit</td></tr>`,
      `<tr><td>Safe minimum (variable flow)</td><td>${fmt(r.FSafe)}</td><td>${fmt(r.fSafe*100)}% of the operating flow</td></tr>`])}
    <h3>Plant reset (${fmt(i.resetMin,1)} min, no cooling)</h3>
    <p class="note">Supply fixed at ${fmt(r.Ts)} °C. Loop water already in the pipes, CDU and rack: ${fmt(r.Mloop/r.f.rho,2)} m³ per rack (safe for ${secs(r.tSafeReset)} at the operating flow).</p>
    ${table(['TCS tank per rack','Flow needed through the reset'],[...r.tankTable.map(x=>`<tr><td>${fmt(x.V)} L</td><td>${isFinite(x.F)?fmt(x.F)+' L/min'+(x.F<=r.Fop+0.5?' (operating flow)':' ('+fmt(x.F/r.Fop,1)+'× operating)'):'not possible'}</td></tr>`),
      `<tr><td>${fmt(r.bufL)} L</td><td>${fmt(r.Fop)} L/min (operating flow)</td></tr>`])}
    <h3>Response chain</h3>
    ${table(['Stage','What sets it','Time'],r.chain.map(c=>`<tr><td>${c.k}</td><td>${c.d}</td><td>${secs(c.t)}</td></tr>`))}
    <ul class="method">
      <li><b>Flow:</b> liquid heat ÷ (ρ·cp·(return limit − supply)), with ${esc(r.f.name)} (ρ ${fmt(r.f.rho)} kg/m³, cp ${fmt(r.f.cp,2)} kJ/kg·K). This reproduces the Lenovo GB300 table (59 L/min at 25 °C … 177 L/min at 45 °C).</li>
      <li><b>Load jump:</b> the rack goes from idle to its ${fmt(p.Ppeak)} kW peak at once. The buffer at the chips (cold-plate coolant and metal) is one well-mixed volume; the manifolds do not count. The CDU holds the flow while it senses and reacts, then ramps it linearly to the operating flow. The safe minimum is the lowest idle flow whose peak return stays at or below the limit${p.minLpm?', and not below the vendor minimum':''}.</li>
      <li><b>Plant reset:</b> no cooling at all for the whole reset; the flow stays at the operating value and the water in the facility pipes (operating flow × round trip), the CDU and the rack absorbs the heat. Rapid-restart chillers restart in about 26–43 s and reach about 80% capacity 75–120 s later (about 2–2.5 min in total); the 3-min default adds a margin. Standard chillers take 10–15 min. Sources: ${RESET_SRC.map(s=>`<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(', ')}.</li>
      <li><b>Pump trip:</b> no flow at rated power; only the buffer at the chips absorbs the heat, from the operating return up to the limit.</li>
      <li><b>Return limit as the safety line:</b> it is the platform design rating; the chips throttle at their own junction limit, somewhat later. The CDU is assumed to raise the flow when the return temperature rises (temperature or ΔT control); with fixed differential-pressure control the rack flow does not follow the load at all.</li>
      <li><b>Air:</b> the air share at a ${fmt(i.dTair)} K air temperature rise.</li>
      <li>Screening estimate: confirm with the platform vendor's site planning guide and the CDU data.</li>
    </ul>`;
}

$('rP').onchange=()=>{ loadPlatform(); run(); };
$('rReset').onchange=()=>{ loadReset(); run(); };
document.querySelectorAll('#inRack input, #rFluid, #rSens').forEach(el=>el.addEventListener('input',run));
document.querySelectorAll('#rScen button').forEach(b=>b.onclick=()=>{ SCEN=b.dataset.s; document.querySelectorAll('#rScen button').forEach(x=>x.classList.toggle('on',x===b)); chart(); });
loadPlatform(); loadReset(); run();
