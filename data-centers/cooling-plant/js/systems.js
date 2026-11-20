// ---------- system descriptions: how each option works, strengths, watch-outs ----------
const SYS={
 acc:{how:'Separate HT and LT air-cooled chillers cool each loop every hour of the year. Each chiller rejects its heat straight to outdoor air through its own condenser fans. There is no free cooling and no water.',
  pre:null, ch:'Air-cooled chillers', rej:[null,'Outdoor air','via condenser fans'],
  pros:['Simplest plant: one equipment type, no condenser water loop','No water use','Packaged, widely available equipment'],
  cons:['Highest energy: compressors run all year','Chiller capacity and efficiency drop on the hottest days','Highest peak electrical demand']},
 accfc:{how:'Dry coolers pre-cool the return water whenever the outdoor air is cooler than the return. Air-cooled chillers then trim the water down to the supply setpoint. In cool weather the chillers switch off entirely.',
  pre:'Free-cooling dry coolers', ch:'Air-cooled chillers', rej:['Outdoor air','Outdoor air','via condenser fans'],
  pros:['No water use','Large free-cooling savings in cool and mild climates','Chillers stay available for the hot hours'],
  cons:['Two sets of outdoor equipment: more yard or roof space','Free cooling is limited in hot climates','Air-cooled chillers still set the peak demand']},
 adia:{how:'Adiabatic coolers run dry most of the year. Above the switch temperature they wet their pads, cooling the air towards the wet-bulb. Their water pre-cools the return through a plate heat exchanger and is also the condenser water for water-cooled chillers, which trim the rest.',
  pre:'Plate heat exchanger', ch:'Water-cooled chillers', shared:'Adiabatic coolers',
  pros:['Far less water than cooling towers (wet only in hot hours)','Efficient water-cooled chillers','Closed circuit: little water treatment'],
  cons:['Uses some water on hot days','Larger footprint than cooling towers','Pads or sprays need maintenance and legionella control']},
 hyb:{how:'Dry coolers and cooling towers serve the same condenser water, in series. In cool weather the dry coolers alone cool the water, with no water use. Above the switch temperature the towers start and cool the water close to the wet-bulb, while the dry coolers keep pre-cooling it ahead of them whenever the air is cooler than the water. The condenser water pre-cools the return through a plate heat exchanger and serves water-cooled chillers, which trim the rest.',
  pre:'Plate heat exchanger', ch:'Water-cooled chillers', shared:'Dry coolers + cooling towers',
  pros:['Tower-level energy and peak power on the hottest days','Water used only in hot hours, and less of it','Either set keeps running if the other is out of service'],
  cons:['Highest initial cost: two sets of heat rejection','Most yard or roof space','Towers still need water treatment and legionella control']},
 wcc:{how:'Open cooling towers cool condenser water close to the outdoor wet-bulb by evaporation. That water pre-cools the return through a plate heat exchanger and serves the condensers of water-cooled chillers, which trim the rest.',
  pre:'Plate heat exchanger', ch:'Water-cooled chillers', shared:'Cooling towers',
  pros:['Lowest energy of the chiller options in most climates','Lowest condensing temperature, so the most efficient chillers','Compact heat rejection'],
  cons:['Highest water use (evaporation plus blowdown)','Needs water treatment, legionella control and a reliable make-up supply','Visible plume and drift']},
};
const ROLE={
 acch:o=>o.id==='acc'?'HT and LT chillers cool each loop; reject heat through built-in condenser fans':'HT and LT chillers trim each loop to setpoint when free cooling is not enough',
 wcch:()=>'HT and LT chillers trim each loop to setpoint; reject heat to condenser water',
 dc:o=>o.id==='hyb'?`Cools the condenser water dry up to ${P.swHY} °C; pre-cools it ahead of the towers above`:'Pre-cools the return water with outdoor air',
 adc:()=>'Cools the condenser water; pads wetted on hot hours',
 ct:o=>o.id==='hyb'?`Cools the condenser water by evaporation above ${P.swHY} °C`:'Cools the condenser water by evaporation',
 hx:()=>'Pre-cools the return water with condenser water (economiser)',
};

// ---------- schematic: one panel per loop (liquid / air cooling), piping as in the energy model ----------
// water-cooled: outdoor heat rejection -> condenser water, in parallel to the plate HX and the chiller condensers, common return;
//   loop: IT return -> plate HX (free cooling) -> chiller evaporators -> buffer tank -> pumps -> supply to IT
// air-cooled: loop return -> (dry coolers, direct) -> chiller evaporators -> tank -> pumps -> supply; condenser fans reject to outdoor air
function schematic(id){
  const s=SYS[id], r=RES[id], d=DES[id], ac=id==='acc'||id==='accfc', W=430, G=24, H=420;
  const loops=P.loops.map((L,i)=>({L,i})).filter(x=>x.L.Q>0);
  const t=(x,y,txt,c='',a='middle')=>`<text class="${c}" x="${x}" y="${y}" text-anchor="${a}">${txt}</text>`;
  const box=(x,y,w,h,lines,c='bx')=>`<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`
    +lines.map((l,k)=>t(x+w/2,y+(h-(lines.length-1)*15)/2+4+k*15,l,k?'t2':'')).join('');
  const pipe=(d,c)=>`<path class="pipe ${c}" d="${d}" marker-end="url(#ar-${c})"/>`;
  const line=(d,c)=>`<path class="pipe ${c}" d="${d}"/>`;
  const hx=P.aHX, cw=v=>`${fmt(v,0)}`;
  const heatRej={
    wcc:['Cooling towers (shared by both loops)',`water out = wb + ${P.aCT} K · ${P.coc} cycles`],
    adia:['Adiabatic coolers (shared by both loops)',`pads on above ${P.swAD} °C: wb + ${P.aAD} K · dry: db + ${P.aDC} K`],
  };
  const panel=({L,i},k)=>{
    const liquid=L.name==='LC', u=d.units.find(x=>x.loop===L.name)||{N:0,unit:0};
    let g=t(0,16,liquid?'Liquid cooling loop':'Air cooling loop','h','start')
      +t(0,32,`${fmt(L.Qd/1000,1)} MW · supply ${L.Ts} °C / return ${L.Tr} °C`,'t2','start');
    g+=`<rect class="zone" x="0" y="40" width="${W}" height="80" rx="8"/>`+t(10,115,'Outdoors','t2','start');
    // loop end: chiller evaporators -> tank -> pumps -> supply to IT; IT return
    const chil=ac?box(240,150,170,82,['Air-cooled chillers',`${u.N} × ${fmt(u.unit/1000,1)} MW + 1 standby`,`rated COP ${P.copA.toFixed(2)} · on ${fmt(r.part[i]+r.mech[i])} h/yr`])
      :box(240,140,170,36,['Chiller condensers','Tc = condenser water + 7 K'])+box(240,192,170,50,['Chiller evaporators',`${u.N} × ${fmt(u.unit/1000,1)} MW + 1 · COP ${P.copW.toFixed(2)}`]);
    g+=chil;
    if(!ac) g+=`<path class="refr" d="M325 176V192"/>`+t(332,188,'compressors','t2','start');
    const evapY=ac?191:217, evapB=ac?232:242;
    g+=box(260,264,130,34,['Buffer / TES tank','not in energy calc'],'bx tes');
    g+=pipe(`M325 ${evapB}V262`,'sup')+line('M325 298V318','sup');
    g+=`<circle class="pump" cx="325" cy="326" r="8"/><path class="pumpv" d="M321 321L331 326L321 331z"/>`+t(338,330,'pumps','t2','start');
    g+=pipe('M325 334V376H312','sup')+t(333,360,`Supply ${L.Ts} °C`,'t2','start');
    g+=box(120,352,190,50,[liquid?'Liquid-cooled IT (CDUs)':'Air-cooled IT (fan wall units)',`${fmt(L.Qd/1000,1)} MW · ${liquid?'CDU pumps':'FWU fans'} ${fmt(L.Qd*termShare(L,P))} kW`],'bx it');
    if(ac){
      g+=box(240,58,170,48,['Air-cooled condensers','Tc = db + 15 K'])+`<path class="heat" d="M325 150V108" marker-end="url(#ar-heat)"/>`+t(332,132,'heat to air','t2','start');
      if(id==='accfc'){
        g+=box(20,58,170,48,['Dry coolers (on the loop)',`water out = db + ${P.aDC} K`]);
        g+=pipe('M120 377H105V108','ret')+t(112,300,`Return ${L.Tr} °C`,'t2','start');
        g+=pipe(`M190 92H215V${evapY}H238`,'ret')+t(222,140,`free cooling ${fmt(r.free[i])} h/yr`,'t2','start');
      } else {
        g+=pipe(`M120 377H105V${evapY}H238`,'ret')+t(112,300,`Return ${L.Tr} °C`,'t2','start');
      }
    } else {
      // outdoor heat rejection (hybrid: dry coolers then towers, in series)
      if(id==='hyb'){
        g+=box(20,58,180,48,['Dry coolers',`dry only up to ${P.swHY} °C`])+box(230,58,180,48,['Cooling towers',`wb + ${P.aCT} K above ${P.swHY} °C`]);
        g+=pipe('M200 82H228','cw')+line('M8 50H422','cwr')+pipe('M110 50V56','cwr')+line('M320 106V128','cw');
      } else {
        const hr=heatRej[id]; g+=box(20,58,390,48,hr);
        g+=line('M8 50H422','cwr')+pipe('M215 50V56','cwr')+line('M215 106V128','cw');
      }
      // condenser water supply in parallel to the plate HX and the condensers; returns to the common header
      g+=line('M105 128H325','cw')+pipe('M105 128V148','cw')+pipe('M325 128V138','cw');
      g+=t(id==='hyb'?232:224,124,'condenser water supply','t2','start');
      g+=line('M20 180H8V50','cwr')+line('M410 158H422V50','cwr');
      g+=box(20,150,170,62,['Plate heat exchanger',`approach ${hx} K`,`free cooling ${fmt(r.free[i])} h/yr`]);
      // loop: return -> plate HX -> evaporators
      g+=pipe('M120 377H105V214','ret')+t(112,300,`Return ${L.Tr} °C`,'t2','start');
      g+=pipe(`M190 196H215V${evapY}H238`,'ret')+t(196,246,'pre-cooled','t2','start');
    }
    return `<g transform="translate(${k*(W+G)},0)">${g}</g>`;
  };
  const vw=loops.length*W+(loops.length-1)*G;
  const mk=(n,c)=>`<marker id="ar-${n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(${c})"/></marker>`;
  return `<div class="legend"><span><i style="background:var(--s2)"></i>Loop return (warm)</span><span><i style="background:var(--s1)"></i>Loop supply (cooled)</span>${ac?'':'<span><i style="background:var(--s3)"></i>Condenser water (dashed: return to outdoors)</span>'}<span><i style="background:var(--grey2)"></i>Heat to outdoor air</span></div>
<svg class="schem" viewBox="-2 0 ${vw+4} ${H}" style="--vw:${vw}" role="img" aria-label="Schematic of ${r.o.name}, one panel per cooling loop">
<defs>${mk('sup','--s1')}${mk('ret','--s2')}${mk('cw','--s3')}${mk('cwr','--s3')}${mk('heat','--grey2')}</defs>${loops.map(panel).join('')}</svg>
<div class="note">${ac?'Loop water goes straight to the chiller evaporators'+(id==='accfc'?' through the dry coolers when the air is cooler than the return':'')+'; each chiller rejects its heat through its own condenser fans.':`${id==='hyb'?'The dry coolers and the cooling towers are in series on one shared condenser-water circuit.':`The ${s.shared.toLowerCase()} are one shared plant.`} Condenser water feeds the plate heat exchangers and the chiller condensers in parallel and returns through one common header. The loop water is pre-cooled in the plate HX, then the chillers cool it to the supply temperature.`} Duty chillers + 1 standby per loop. The buffer / TES tank is shown for ride-through and is not part of the energy calculation.</div>`;
}
