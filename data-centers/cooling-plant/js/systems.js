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
 wcc:{how:'Open cooling towers cool condenser water close to the outdoor wet-bulb by evaporation. That water pre-cools the return through a plate heat exchanger and serves the condensers of water-cooled chillers, which trim the rest.',
  pre:'Plate heat exchanger', ch:'Water-cooled chillers', shared:'Cooling towers',
  pros:['Lowest energy of the chiller options in most climates','Lowest condensing temperature, so the most efficient chillers','Compact heat rejection'],
  cons:['Highest water use (evaporation plus blowdown)','Needs water treatment, legionella control and a reliable make-up supply','Visible plume and drift']},
};
const ROLE={
 acch:o=>o.id==='acc'?'HT and LT chillers cool each loop; reject heat through built-in condenser fans':'HT and LT chillers trim each loop to setpoint when free cooling is not enough',
 wcch:()=>'HT and LT chillers trim each loop to setpoint; reject heat to condenser water',
 dc:()=>'Pre-cools the return water with outdoor air',
 adc:()=>'Cools the condenser water; pads wetted on hot hours',
 ct:()=>'Cools the condenser water by evaporation',
 hx:()=>'Pre-cools the return water with condenser water (economiser)',
};

// ---------- schematic: one panel per loop (HT liquid cooling, LT air cooling), as in the energy model ----------
// each panel: IT terminals -> return -> pre-cooling -> HT/LT chillers -> buffer/TES tank -> pumps -> supply; heat to outdoors
function schematic(id){
  const s=SYS[id], r=RES[id], ac=id==='acc'||id==='accfc', W=430, G=24, H=396;
  const loops=P.loops.map((L,i)=>({L,i})).filter(x=>x.L.Q>0);
  const hot=P.loops[0].Ts===P.loops[1].Ts?null:(P.loops[0].Ts>P.loops[1].Ts?0:1);   // warmer supply = HT loop
  const t=(x,y,txt,c='',a='middle')=>`<text class="${c}" x="${x}" y="${y}" text-anchor="${a}">${txt}</text>`;
  const box=(x,y,w,h,lines,c='bx')=>`<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`
    +lines.map((l,k)=>t(x+w/2,y+(h-(lines.length-1)*15)/2+4+k*15,l,k?'t2':'')).join('');
  const pipe=d=>`<path class="pipe" d="${d}" marker-end="url(#ar)"/>`;
  const up=(x,lab)=>`<path class="heat" d="M${x} 148V116" marker-end="url(#ah)"/>${t(x+6,136,lab,'t2','start')}`;
  const panel=({L,i},k)=>{
    const tag=hot===null?'':(i===hot?'HT':'LT'), liquid=i===0;
    let g=t(0,16,(tag?tag+' loop · ':'')+(liquid?'liquid cooling':'air cooling'),'h','start')
      +t(0,34,`${fmt(L.Qd/1000,1)} MW · supply ${L.Ts} °C / return ${L.Tr} °C`,'t2','start');
    // outdoors
    g+=`<rect class="zone" x="0" y="46" width="${W}" height="72" rx="8"/>`+t(10,62,'Outdoors','t2','start');
    if(s.shared){
      g+=box(20,68,390,44,[s.shared+(loops.length>1?' (shared by both loops)':''),id==='wcc'?`approach ${P.aCT} K to wet-bulb · ${P.coc} cycles`:`wet above ${P.swAD} °C · effectiveness ${P.eAD}`]);
      g+=up(105,'condenser water')+up(325,'condenser water');
    } else {
      if(s.pre){ g+=box(20,68,170,44,['Outdoor air','dry-cooler fans']); g+=up(105,'heat'); }
      g+=box(240,68,170,44,['Outdoor air','chiller condenser fans']); g+=up(325,'heat');
    }
    // water loop: pre-cooling and chillers
    if(s.pre) g+=box(20,150,170,62,[s.pre,id==='accfc'?`approach ${P.aDC} K`:`HX approach ${P.aHX} K`,`free cooling ${fmt(r.free[i])} h/yr`]);
    g+=box(240,150,170,62,[(tag?tag+' ':'')+'chillers',`${P.nCh} × ${fmt(L.Qd/P.nCh/1000,1)} MW, ${ac?'air':'water'}-cooled`,`rated COP ${(ac?P.copA:P.copW).toFixed(2)} · on ${fmt(r.part[i]+r.mech[i])} h/yr`]);
    g+=box(240,244,170,46,['Buffer / TES tank','ride-through; not in energy calc'],'bx tes');
    g+=box(20,328,390,56,[liquid?'Liquid-cooled IT (CDUs)':'Air-cooled IT (CRAHs / fan walls)',`${fmt(L.Qd/1000,1)} MW at full load · ${fmt(L.Q/1000,1)} MW typical`,`${liquid?'CDU pumps':'CRAH / FWU fans'} ${fmt(L.Qd*(liquid?P.cduP:P.fanT))} kW at full load, heat added to loop`],'bx it');
    g+=s.pre?pipe('M105 326V214')+pipe('M190 181H238'):pipe('M105 326V181H238');
    g+=t(112,272,`Return ${L.Tr} °C`,'t2','start');
    g+=pipe('M325 212V242')+pipe('M325 290V326');
    g+=`<circle class="pump" cx="325" cy="308" r="8"/><path class="pumpv" d="M321 303L331 308L321 313z"/>`+t(338,312,'pumps','t2','start');
    g+=t(310,312,`Supply ${L.Ts} °C`,'t2','end');
    return `<g transform="translate(${k*(W+G)},0)">${g}</g>`;
  };
  const vw=loops.length*W+(loops.length-1)*G;
  return `<svg class="schem" viewBox="-2 0 ${vw+4} ${H}" style="--vw:${vw}" role="img" aria-label="Schematic of ${r.o.name}, one panel per cooling loop">
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--text2)"/></marker>
<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--grey2)"/></marker></defs>${loops.map(panel).join('')}</svg>
<div class="note">Each loop has its own ${s.pre?'pre-cooling, ':''}chillers and pumps, as in the energy model.${s.shared?` The ${s.shared.toLowerCase()} are one shared plant.`:''} The buffer / TES tank is shown for chiller ride-through and is not part of the energy calculation.</div>`;
}
