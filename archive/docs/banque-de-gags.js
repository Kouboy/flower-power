// Banque de gags v3.40, à réutiliser pour les futurs PNG. Non chargé par le jeu.
// Extrait de archive/v3.43.16/index.html (lignes 172-317).
const OBSTACLE_VARIANTS={
  cone:[
    {id:'travaux_verts',label:'VERT',sub:'TRAVAUX',accent:'#d9ed71',paper:'#f2e6b0',mirrorSafe:false},
    {id:'provisoire',label:'2050',sub:'PROV.',accent:'#f1cf63',paper:'#f4e1a0',mirrorSafe:false},
    {id:'zero_risque',label:'0 RISQUE',sub:'CERT.',accent:'#9de0bd',paper:'#dce9b9',mirrorSafe:false},
    {id:'chantier_plus',label:'CHANTIER+',sub:'RSE',accent:'#a8d7ee',paper:'#e8e1ad',mirrorSafe:false}
  ],
  extinguisher:[
    {id:'plan_b',label:'PLAN B',sub:'VIDE',accent:'#f1cf63',paper:'#f1e2b1',mirrorSafe:false},
    {id:'resilience',label:'RÉSIL.',sub:'2030',accent:'#b7dd78',paper:'#e5e4a8',mirrorSafe:false},
    {id:'anti_feu',label:'ANTI-FEU',sub:'OPTI.',accent:'#f08b73',paper:'#f1d4a5',mirrorSafe:false},
    {id:'secours',label:'SECOURS',sub:'LIGHT',accent:'#8fd5dc',paper:'#d9e8b7',mirrorSafe:false}
  ],
  sign:[
    {id:'zone_verte',label:'ZONE VERTE',sub:'SAUF ICI',accent:'#a7d772',paper:'#efe2ab',mirrorSafe:false},
    {id:'compense',label:'COMPENSÉ',sub:'AILLEURS',accent:'#8bd2bd',paper:'#e9dfac',mirrorSafe:false},
    {id:'nature_plus',label:'NATURE+',sub:'CERTIFIÉ',accent:'#c8df76',paper:'#ede4b0',mirrorSafe:false},
    {id:'biodiv',label:'BIODIV.',sub:'EN COURS',accent:'#86c8e2',paper:'#eee0a8',mirrorSafe:false}
  ],
  solar:[
    {id:'net_zero',label:'NET ZÉRO',sub:'2050',accent:'#9fda83',paper:'#dfe9b2',mirrorSafe:false},
    {id:'green_roi',label:'GREEN ROI',sub:'+12%',accent:'#ebd06d',paper:'#e8e4b0',mirrorSafe:false},
    {id:'a_plus',label:'A+++',sub:'CASSÉ',accent:'#83d5c0',paper:'#e5e2ab',mirrorSafe:false},
    {id:'saas',label:'SOLEIL',sub:'AS A SERVICE',accent:'#eebd6c',paper:'#efe0a8',mirrorSafe:false}
  ],
  drone:[
    {id:'eco_scan',label:'ECO SCAN',sub:'OK',accent:'#a6dc78',paper:'#dde5b1',mirrorSafe:false},
    {id:'smart_nature',label:'SMART',sub:'NATURE v5',accent:'#7ed5d7',paper:'#e0e5ad',mirrorSafe:false},
    {id:'planet_ai',label:'PLANÈTE IA',sub:'BETA',accent:'#d6c07e',paper:'#ebe0af',mirrorSafe:false},
    {id:'biodiv_auto',label:'BIODIV.',sub:'AUTO',accent:'#8dd1a7',paper:'#e6dfaa',mirrorSafe:false}
  ],
  scooter:[
    {id:'zfe',label:'ZFE',sub:'READY',accent:'#9bd878',paper:'#e8e2ae',mirrorSafe:false},
    {id:'free_float',label:'FREE',sub:'FLOAT',accent:'#7ecbd6',paper:'#e9dfaa',mirrorSafe:false},
    {id:'mobility',label:'MOBILITÉ+',sub:'2%',accent:'#e6c66b',paper:'#eadfa7',mirrorSafe:false},
    {id:'climate_pass',label:'CLIMAT',sub:'PASS',accent:'#9fd38a',paper:'#e6e3ac',mirrorSafe:false}
  ],
  trashbag:[
    {id:'bio',label:'BIO',sub:'90 J',accent:'#b8dc71',paper:'#e5e4ab',mirrorSafe:false},
    {id:'tri',label:'TRI',sub:'PRESQUE',accent:'#89d3dd',paper:'#e4e1a9',mirrorSafe:false},
    {id:'compost',label:'COMPOST',sub:'THÉORIQUE',accent:'#d8ca76',paper:'#ebe0a7',mirrorSafe:false},
    {id:'zero_waste',label:'0 DÉCHET',sub:'SAC 48',accent:'#a5d087',paper:'#e4e2a9',mirrorSafe:false}
  ],
  battery:[
    {id:'green100',label:'100%',sub:'GREEN',accent:'#bddd78',paper:'#e8e2aa',mirrorSafe:false},
    {id:'recy',label:'RECY',sub:'À VOIR',accent:'#91d7b2',paper:'#e3e5ad',mirrorSafe:false},
    {id:'eco_plus',label:'ECO+',sub:'LITHIUM',accent:'#e7ce70',paper:'#ebe0a5',mirrorSafe:false},
    {id:'second_life',label:'2e VIE',sub:'FIN',accent:'#87cedc',paper:'#e2e1aa',mirrorSafe:false}
  ],
  phone:[
    {id:'eco_app',label:'ECO APP',sub:'99+',accent:'#8bdd72',paper:'#dfe5ac',mirrorSafe:false},
    {id:'co2_app',label:'CO₂',sub:'-0.2%',accent:'#7ad4df',paper:'#e0e3ad',mirrorSafe:false},
    {id:'green_streak',label:'GREEN',sub:'365 J',accent:'#d4dc72',paper:'#e9e0a9',mirrorSafe:false},
    {id:'offset_active',label:'OFFSET',sub:'ACTIF',accent:'#9bd09a',paper:'#e3e3ad',mirrorSafe:false}
  ],
  plastic:[
    {id:'recycled',label:'100%',sub:'RECYCLÉ*',accent:'#8ed6cf',paper:'#e1e5ad',mirrorSafe:false},
    {id:'ocean',label:'OCÉAN',sub:'FRIENDLY',accent:'#75cde1',paper:'#e4e2aa',mirrorSafe:false},
    {id:'bioplastic',label:'BIO',sub:'PLASTIC',accent:'#bdd978',paper:'#e9dfa5',mirrorSafe:false},
    {id:'circular',label:'CIRCULAIRE',sub:'1 FOIS',accent:'#d9c772',paper:'#e7e2aa',mirrorSafe:false}
  ],
  canister:[
    {id:'biofuel',label:'BIOFUEL',sub:'PREMIUM',accent:'#add277',paper:'#e7e1a8',mirrorSafe:false},
    {id:'pure_water',label:'EAU PURE',sub:'TECH',accent:'#7fd3dc',paper:'#e0e5af',mirrorSafe:false},
    {id:'green_solvent',label:'SOLVANT',sub:'VERT',accent:'#c8d773',paper:'#e7dfa6',mirrorSafe:false},
    {id:'neutral',label:'NEUTRE',sub:'CERT.',accent:'#9ccf9b',paper:'#e2e5ad',mirrorSafe:false}
  ],
  concrete:[
    {id:'low_c',label:'BAS C',sub:'BÉTON',accent:'#9fd18e',paper:'#dfdfb1',mirrorSafe:false},
    {id:'hqe',label:'HQE',sub:'MASSIF',accent:'#89cfd4',paper:'#e4e0aa',mirrorSafe:false},
    {id:'durable',label:'DURABLE',sub:'80 ANS',accent:'#d8c576',paper:'#e7dfa6',mirrorSafe:false},
    {id:'green_rc',label:'VERT',sub:'ARMÉ',accent:'#a8d37a',paper:'#e5e2aa',mirrorSafe:false}
  ],
  pipe:[
    {id:'potable',label:'EAU',sub:'POTABLE ?',accent:'#83d1de',paper:'#e1e5ad',mirrorSafe:false},
    {id:'reuse',label:'RÉUSE',sub:'2040',accent:'#9bd291',paper:'#e6e1aa',mirrorSafe:false},
    {id:'smart_network',label:'RÉSEAU',sub:'SMART',accent:'#7fc8dd',paper:'#e0e3ab',mirrorSafe:false},
    {id:'optimized_leak',label:'FUITE',sub:'OPTI.',accent:'#dec36c',paper:'#e9dfa7',mirrorSafe:false}
  ],
  microwave:[
    {id:'eco_mode',label:'ECO MODE',sub:'ON',accent:'#a7d97d',paper:'#e3e4ad',mirrorSafe:false},
    {id:'aplus',label:'A+++',sub:'2009',accent:'#dbd173',paper:'#e9dfa5',mirrorSafe:false},
    {id:'low_power',label:'LOW POWER',sub:'1800 W',accent:'#83ced9',paper:'#e1e2aa',mirrorSafe:false},
    {id:'green_ready',label:'GREEN',sub:'READY',accent:'#9bd18a',paper:'#e4e2a9',mirrorSafe:false}
  ],
  server:[
    {id:'green_cloud',label:'GREEN',sub:'CLOUD',accent:'#99da7b',paper:'#dfe3ad',mirrorSafe:false},
    {id:'green_ai',label:'IA',sub:'VERTE',accent:'#7dd0da',paper:'#e2e2aa',mirrorSafe:false},
    {id:'netzero_dc',label:'NET ZERO',sub:'DC',accent:'#c8d36f',paper:'#e7dfa7',mirrorSafe:false},
    {id:'carbon_api',label:'CARBONE',sub:'API',accent:'#d6bd70',paper:'#e8dfa8',mirrorSafe:false}
  ],
  tire:[
    {id:'eco_tyre',label:'ECO TYRE',sub:'SUV',accent:'#a8d27b',paper:'#e4e1aa',mirrorSafe:false},
    {id:'low_co2',label:'LOW CO₂',sub:'XL',accent:'#83ceda',paper:'#e0e4ac',mirrorSafe:false},
    {id:'recy18',label:'RECY',sub:'18%',accent:'#d5ce70',paper:'#e7e0a8',mirrorSafe:false},
    {id:'green_grip',label:'GREEN',sub:'GRIP PRO',accent:'#9bd38e',paper:'#e4e2ab',mirrorSafe:false}
  ],
  arcade:[
    {id:'save_earth',label:'SAVE EARTH',sub:'GAME OVER',accent:'#a6dc73',paper:'#e3e2a9',mirrorSafe:false},
    {id:'climate_hero',label:'CLIMATE',sub:'HERO',accent:'#7fd0db',paper:'#e1e3aa',mirrorSafe:false},
    {id:'eco_run',label:'ECO RUN',sub:'INSERT Ɇ',accent:'#dec46c',paper:'#e9dfa8',mirrorSafe:false},
    {id:'oneup',label:'1UP',sub:'PLANÈTE',accent:'#9fd28c',paper:'#e3e1aa',mirrorSafe:false}
  ],
  sarcophagus:[
    {id:'zero_waste',label:'0 DÉCHET',sub:'ÉTERNEL',accent:'#aed477',paper:'#e8dfa6',mirrorSafe:false},
    {id:'climate_plan',label:'PLAN CLIMAT',sub:'RIP',accent:'#7fcbd5',paper:'#e2e1a9',mirrorSafe:false},
    {id:'future2050',label:'FUTUR',sub:'2050',accent:'#d7c672',paper:'#e9dfa6',mirrorSafe:false},
    {id:'durable_life',label:'DURABLE',sub:'À VIE',accent:'#98d08d',paper:'#e4e2aa',mirrorSafe:false}
  ],
  nuclear:[
    {id:'neutral',label:'NEUTRE',sub:'VALIDÉ',accent:'#b6d879',paper:'#e7e0a6',mirrorSafe:false},
    {id:'offset',label:'OFFSET',sub:'x100',accent:'#84ceda',paper:'#e0e3aa',mirrorSafe:false},
    {id:'greenplus',label:'VERT+',sub:'ISO',accent:'#d9ca72',paper:'#e7e1a9',mirrorSafe:false},
    {id:'transition',label:'TRANSITION',sub:'LOT 7',accent:'#9bd08b',paper:'#e4e1a8',mirrorSafe:false}
  ],
  trex:[
    {id:'anti_nuke',label:'NON NUCL.',sub:'MERCI',accent:'#cfda76',paper:'#efe1a9',mirrorSafe:false},
    {id:'never_again',label:'PLUS ÇA',sub:'-65 Ma',accent:'#7fcfd7',paper:'#e4e2aa',mirrorSafe:false},
    {id:'protected',label:'SITE PROT.',sub:'ENFIN',accent:'#9dd188',paper:'#e7e1a7',mirrorSafe:false},
    {id:'not_fossil',label:'PAS FOSSILE',sub:'JURÉ',accent:'#dfc36d',paper:'#e9dea5',mirrorSafe:false}
  ],
  fossil:[
    {id:'local',label:'LOCAL',sub:'-65 Ma',accent:'#d6c46f',paper:'#e9dfa8',mirrorSafe:false},
    {id:'heritage',label:'HÉRITAGE',sub:'CARBONE',accent:'#9bcf8d',paper:'#e4e2aa',mirrorSafe:false},
    {id:'biofossil',label:'FOSSILE',sub:'BIO',accent:'#abd478',paper:'#e6e0a8',mirrorSafe:false},
    {id:'scope3',label:'TRACE',sub:'SCOPE 3',accent:'#83ced9',paper:'#e1e3aa',mirrorSafe:false}
  ],
  mascot:[
    {id:'eco_kid',label:'ECO KID',sub:'2024',accent:'#aad67a',paper:'#e5e0a8',mirrorSafe:false},
    {id:'green_buddy',label:'GREEN',sub:'BUDDY',accent:'#7fced8',paper:'#e1e3aa',mirrorSafe:false},
    {id:'planet_club',label:'PLANÈTE',sub:'CLUB',accent:'#d9c56f',paper:'#e8dfa6',mirrorSafe:false},
    {id:'junior_rse',label:'JUNIOR',sub:'RSE',accent:'#9cd08b',paper:'#e5e1a9',mirrorSafe:false}
  ],
  rock:[
    {id:'protected_zone',label:'ZONE',sub:'PROT.',accent:'#a9d37a',paper:'#e5e2aa',mirrorSafe:false},
    {id:'natura',label:'NATURA ?',sub:'2000',accent:'#7fcdd7',paper:'#e1e3a9',mirrorSafe:false},
    {id:'compensated',label:'COMPENSÉ',sub:'m²',accent:'#d8c46f',paper:'#e8dfa6',mirrorSafe:false},
    {id:'biotope',label:'BIOTOPE',sub:'DÉPLACÉ',accent:'#9ccf8b',paper:'#e5e1a9',mirrorSafe:false}
  ],
  treasure:[
    {id:'green_fund',label:'FONDS',sub:'VERT',accent:'#a4d47c',paper:'#e5e1a8',mirrorSafe:false},
    {id:'climate_credit',label:'CRÉDIT',sub:'CLIMAT',accent:'#7fcdd7',paper:'#e1e3aa',mirrorSafe:false},
    {id:'subvention',label:'SUBV.',sub:'PILOTE',accent:'#dac46d',paper:'#e9dfa6',mirrorSafe:false},
    {id:'eco_budget',label:'BUDGET',sub:'ÉCO',accent:'#9bcf8d',paper:'#e4e2aa',mirrorSafe:false}
  ]
};
