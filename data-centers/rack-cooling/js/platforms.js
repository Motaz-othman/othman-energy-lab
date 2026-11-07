// ---------- Liquid Rack Cooling: platform data (per rack) ----------
// P: rack design power kW · liq: share of heat to liquid · TsMax: max coolant supply °C · TrMax: max coolant return °C
// idle: idle heat as a share of P · Vrack: thermal buffer at the chips, L of water-equivalent (cold-plate coolant + cold-plate metal; manifolds excluded) · minLpm: vendor minimum flow per rack
// q: data quality per value ('vendor' published by the maker or an OEM, 'reported' secondary sources, 'est' engineering estimate)
const PLATFORMS=[
 {id:'gb300',group:'NVIDIA',name:'NVIDIA GB300 NVL72',P:135,Ppeak:155,liq:.90,TsMax:45,TrMax:55,cls:'W45',idle:.30,Vrack:10,minLpm:null,
  q:{P:'vendor',liq:'vendor',TsMax:'vendor',TrMax:'vendor',idle:'est',Vrack:'est'},
  note:'135 kW TDP, up to 155 kW peak. About 90% of the heat to liquid. Supply 25–45 °C; the required rack flow (59 L/min at 25 °C … 177 L/min at 45 °C) holds the return at about 55 °C.',
  src:[['Lenovo GB300 NVL72 product guide','https://lenovopress.lenovo.com/lp2357-lenovo-nvidia-gb300-nvl72-rack-scale-ai']]},
 {id:'gb200',group:'NVIDIA',name:'NVIDIA GB200 NVL72',P:132,Ppeak:132,liq:.87,TsMax:45,TrMax:55,cls:'W45',idle:.30,Vrack:10,minLpm:null,
  q:{P:'reported',liq:'reported',TsMax:'vendor',TrMax:'est',idle:'est',Vrack:'est'},
  note:'About 120 kW nominal, up to 132 kW measured; about 115 kW to liquid and 17 kW to air. Max inlet 45 °C (QCT lists 65 °C as the absolute return maximum); the design return is taken at 55 °C like the GB300 rack.',
  src:[['QCT Qoolrack GB200 NVL72 paper','https://blog.qct.io/wp-content/uploads/2025/04/QCT-Qoolrack-Stand-Alone_Advanced-Liquid-Cooling-for-NVIDIA-GB200-NVL72-Systems.pdf'],
       ['Introl GB200 NVL72 deployment','https://introl.com/blog/gb200-nvl72-deployment-72-gpu-liquid-cooled']]},
 {id:'vr200',group:'NVIDIA',name:'NVIDIA Vera Rubin NVL144 (preliminary)',P:230,Ppeak:230,liq:1,TsMax:45,TrMax:65,cls:'W45',idle:.30,Vrack:14,minLpm:null,
  q:{P:'reported',liq:'reported',TsMax:'reported',TrMax:'reported',idle:'est',Vrack:'est'},
  note:'Preliminary: NVIDIA has not published full cooling specifications. Reported about 190 kW (Max-Q) to 230 kW (Max-P); fanless, fully liquid-cooled; 45 °C supply with a return of about 65 °C.',
  src:[['DCD: NVIDIA prepares for 1 MW racks','https://www.datacenterdynamics.com/en/news/nvidia-prepares-data-center-industry-for-1mw-racks-and-800-volt-dc-power-architectures/'],
       ['SemiAnalysis: Vera Rubin','https://newsletter.semianalysis.com/p/vera-rubin-extreme-co-design-an-evolution'],
       ['Baike: VR200 NVL144 rack','https://baike.baidu.com/en/item/VR200%20NVL144%20rack/5431697']]},
 {id:'b200',group:'NVIDIA',name:'NVIDIA HGX B200, 8 × 4U liquid-cooled servers',P:115,Ppeak:115,liq:.92,TsMax:45,TrMax:55,cls:'W45',idle:.30,Vrack:8,minLpm:null,
  q:{P:'est',liq:'vendor',TsMax:'vendor',TrMax:'est',idle:'est',Vrack:'est'},
  note:'Rack of eight 4U direct-liquid-cooled HGX B200 servers (about 14.3 kW each). Inlet up to 45 °C; up to 92% of the heat to liquid.',
  src:[['Supermicro DLC-2 press release','https://www.supermicro.com/en/pressreleases/supermicro-expands-its-nvidia-blackwell-system-portfolio-new-direct-liquid-cooled-dlc'],
       ['Supermicro B200 Front I/O datasheet','https://www.supermicro.com/datasheet/datasheet_SuperCluster_B200_Front_IO.pdf']]},
 {id:'mi355x',group:'AMD',name:'AMD Instinct MI355X, 64-GPU liquid-cooled rack',P:120,Ppeak:120,liq:.85,TsMax:40,TrMax:55,cls:'W40',idle:.30,Vrack:8,minLpm:null,
  q:{P:'vendor',liq:'est',TsMax:'est',TrMax:'est',idle:'est',Vrack:'est'},
  note:'GIGABYTE rack: 64 MI355X GPUs (1.4 kW each), up to 120 kW, with an in-rack 100 kW liquid-to-liquid CDU. Coolant temperatures are not published: W40 assumed.',
  src:[['GIGABYTE MI355X DLC rack','https://www.gigabyte.com/Enterprise/GIGAPOD-Rack-Scale/AI-DLC-Rack_AMD-Instinct-MI355X'],
       ['The Register: MI355X','https://www.theregister.com/2025/06/12/amd_mi355x/']]},
 {id:'sd650v3',group:'CPU / HPC',name:'Lenovo ThinkSystem SD650 V3 (Neptune), CPU',P:80,Ppeak:80,liq:.90,TsMax:45,TrMax:60,cls:'W45',idle:.35,Vrack:7,minLpm:36,
  q:{P:'est',liq:'vendor',TsMax:'vendor',TrMax:'est',idle:'est',Vrack:'est'},
  note:'Rack of six 6U enclosures (36 trays, 72 dual-socket nodes). Inlet up to 45 °C; over 90% of the heat to water at 45 °C. Lenovo minimum flow 1.0 L/min per tray (36 L/min per rack).',
  src:[['Lenovo SD650 V3 environmental specifications','https://pubs.lenovo.com/sd650-v3/sd650v3_server_specifications_environmental'],
       ['Intel / Lenovo Neptune deck','https://www.intel.com.tw/content/dam/www/central-libraries/us/en/documents/2023-03/05-lenovo-neptune-e2c-ai.pdf']]}
];
const FLUIDS={water:{name:'Water',rho:990,cp:4.18},pg25:{name:'PG25 (25% propylene glycol)',rho:1015,cp:3.90}};
