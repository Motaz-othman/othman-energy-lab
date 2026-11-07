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
function loadPlatform(){ const p=plat(); $('rTs').value=p.TsMax; $('rIdle').value=Math.round(p.idle*100); $('rVrack').value=p.Vrack;
  $('rPnote').textContent=`${fmt(p.P)} kW per rack${p.Ppeak>p.P?` (up to ${fmt(p.Ppeak)} kW peak)`:''} · ${fmt(p.liq*100)}% to liquid · ASHRAE ${p.cls}`; }
function loadReset(){ $('rResetMin').value=RESETS.find(x=>x.id===$('rReset').value).min; }

function run(){
  const p=plat();
  const i={fluid:$('rFluid').value,Ts:lim(num('rTs',p.TsMax),5,p.TsMax),margin:lim(num('rMargin',20),0,100)/100,idle:lim(num('rIdle',30),5,100)/100,
    tCDU:Math.max(0,num('rCDU',10)),pipeL:Math.max(5,num('rPipe',150)),vel:lim(num('rVel',2),0.5,4),Vrack:Math.max(5,num('rVrack',p.Vrack)),
    Vcdu:Math.max(0,num('rVcdu',40)),dTair:lim(num('rAir',12),5,25),resetMin:Math.max(0.5,num('rResetMin',3))};
  if(num('rTs',p.TsMax)>p.TsMax) $('rTs').value=p.TsMax;
  R=rackStudy(p,i); R.i=i;
  const r=R, okReset=r.tSafeReset>=r.tReset;
  $('rStatus').textContent=`Per rack · ${p.name}`;
  $('rRes').innerHTML=`
    <div class="big4">
      <div class="bn"><div class="v good">${fmt(p.TsMax)} <small>°C</small></div><div class="l">Max coolant supply (ASHRAE ${p.cls}) · return limit ${fmt(r.Tr)} °C</div></div>
      <div class="bn"><div class="v">${fmt(r.Fop)} <small>L/min</small></div><div class="l">${fmt(r.Ql,1)} kW to liquid at ${fmt(r.Ts)} °C supply${r.Qa>0.05?` · ${fmt(r.Qa,1)} kW to air, ${fmt(r.air)} m³/h`:''}</div></div>
      <div class="bn"><div class="v">${fmt(r.fSafe*100)}<small>%</small></div><div class="l">Safe minimum flow, ${fmt(r.FSafe)} L/min: survives a jump from idle to full load</div></div>
      <div class="bn"><div class="v${okReset?' good':' bad'}">${secs(r.tSafeReset)}</div><div class="l">Safe with no plant cooling (plant reset ${fmt(i.resetMin,1)} min)</div></div>
    </div>
    <div class="verdict${okReset?'':' warn'}">
      <b>Variable flow</b> can go down to ${fmt(r.fSafe*100)}% (${fmt(r.FSafe)} L/min per rack). Below that, a jump to full load heats the coolant past ${fmt(r.Tr)} °C before the CDU catches up in ${fmt(i.tCDU)} s.<br>
      ${okReset?`<b>Plant reset:</b> the loop water alone covers a ${fmt(i.resetMin,1)}-min reset.`
        :`<b>Plant reset:</b> the loop water lasts only ${secs(r.tSafeReset)}, short of the ${fmt(i.resetMin,1)}-min reset. Add about <b>${fmt(r.bufL/1000,2)} m³ of buffer per rack</b> on the CDU loop${r.TsRide>15?`, or run the supply at <b>${fmt(r.TsRide,1)} °C</b> or lower`:''}.`}<br>
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
    title=`Idle (${fmt(i.idle*100)}%) → full load at once; the CDU ramps the flow back in ${fmt(i.tCDU)} s`;
    note=`If the flow simply followed the idle heat (${fmt(r.fFollow*100)}%), the coolant would pass ${fmt(r.Tr)} °C ${secs(r.tNoResp)} after the jump${r.jumpFollow.peak>r.Tr+1e-3?`, before the CDU responds (peak ${fmt(r.jumpFollow.peak,1)} °C)`:''}.`;
  }else if(SCEN==='reset'){
    o.scales.x.title.text='Minutes with no plant cooling';
    ds=[line('Return temperature',r.resetTrace.map(x=>({x:x.t,y:x.T})),css('--brand'),{borderWidth:2.5}),
      line('Return limit',[{x:0,y:r.Tr},{x:r.resetTrace.at(-1).t,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1}),
      line('End of plant reset',[{x:i.resetMin,y:r.TrOp},{x:i.resetMin,y:r.resetTrace.at(-1).T}],css('--grey2'),{borderDash:[2,3],borderWidth:1})];
    title=`Chiller plant resets: no cooling for ${fmt(i.resetMin,1)} min, flow kept at ${fmt(r.Fop)} L/min`;
    note=`The water in the pipes (${fmt(i.pipeL)} m each way, round trip ${secs(r.tRT)}), the CDU and the rack absorbs the heat: about ${fmt(r.Mloop/r.f.rho,2)} m³ per rack, rising ${fmt(r.rise*60,1)} K per minute.`;
  }else{
    o.scales.x.title.text='Seconds after the CDU pump trips';
    ds=[line('Return temperature',r.pumpTrace.map(x=>({x:x.t,y:x.T})),css('--brand'),{borderWidth:2.5}),
      line('Return limit',[{x:0,y:r.Tr},{x:r.pumpTrace.at(-1).t,y:r.Tr}],limC,{borderDash:[6,4],borderWidth:1})];
    title='CDU pump trips at full load: no flow until the standby pump takes over';
    note=`Only the ${fmt(i.Vrack)} L of coolant in the rack absorbs the heat, starting ${fmt(r.head,1)} K below the limit.`;
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
      `<tr><td>Coolant in the rack</td><td>${fmt(p.Vrack)} L</td><td>${q('Vrack')}</td></tr>`,
      p.minLpm?`<tr><td>Vendor minimum flow</td><td>${fmt(p.minLpm)} L/min per rack</td><td><span class="tag ok">Published</span></td></tr>`:''])}
    <p class="note">${esc(p.note)} Sources: ${p.src.map(s=>`<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(', ')}.</p>
    <h3>Flow per rack</h3>
    ${table(['Flow','L/min','Note'],[
      `<tr><td>Minimum to hold the return at ${fmt(r.Tr)} °C</td><td>${fmt(r.Freq)}</td><td>at ${fmt(r.Ts)} °C supply, full load</td></tr>`,
      `<tr><td>Operating flow (+${fmt(i.margin*100)}%)</td><td>${fmt(r.Fop)}</td><td>return ${fmt(r.TrOp,1)} °C, ${fmt(r.head,1)} K below the limit</td></tr>`,
      `<tr><td>Safe minimum (variable flow)</td><td>${fmt(r.FSafe)}</td><td>${fmt(r.fSafe*100)}% of the operating flow</td></tr>`])}
    <h3>Response chain</h3>
    ${table(['Stage','What sets it','Time'],r.chain.map(c=>`<tr><td>${c.k}</td><td>${c.d}</td><td>${secs(c.t)}</td></tr>`))}
    <ul class="method">
      <li><b>Flow:</b> liquid heat ÷ (ρ·cp·(return limit − supply)), with ${esc(r.f.name)} (ρ ${fmt(r.f.rho)} kg/m³, cp ${fmt(r.f.cp,2)} kJ/kg·K). This reproduces the Lenovo GB300 table (59 L/min at 25 °C … 177 L/min at 45 °C).</li>
      <li><b>Load jump:</b> the rack coolant is one well-mixed volume; the rack goes from idle to full heat at once and the CDU ramps the flow linearly back to the operating flow over the response time. The safe minimum is the lowest idle flow whose peak return stays at or below the limit${p.minLpm?', and not below the vendor minimum':''}. The chips' own thermal mass is ignored (on the safe side).</li>
      <li><b>Plant reset:</b> no cooling at all for the whole reset; the flow stays at the operating value and the water in the facility pipes (operating flow × round trip), the CDU and the rack absorbs the heat. Rapid-restart chillers restart in about 26–43 s and reach about 80% capacity 75–120 s later (about 2–2.5 min in total); the 3-min default adds a margin. Standard chillers take 10–15 min. Sources: ${RESET_SRC.map(s=>`<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(', ')}.</li>
      <li><b>Pump trip:</b> no flow; only the coolant in the rack absorbs the heat, from the operating return up to the limit.</li>
      <li><b>Air:</b> the air share at a ${fmt(i.dTair)} K air temperature rise.</li>
      <li>Screening estimate: confirm with the platform vendor's site planning guide and the CDU data.</li>
    </ul>`;
}

$('rP').onchange=()=>{ loadPlatform(); run(); };
$('rReset').onchange=()=>{ loadReset(); run(); };
document.querySelectorAll('#inRack input, #rFluid').forEach(el=>el.addEventListener('input',run));
document.querySelectorAll('#rScen button').forEach(b=>b.onclick=()=>{ SCEN=b.dataset.s; document.querySelectorAll('#rScen button').forEach(x=>x.classList.toggle('on',x===b)); chart(); });
loadPlatform(); loadReset(); run();
