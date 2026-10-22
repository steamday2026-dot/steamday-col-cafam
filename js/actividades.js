/* =====================================================================
   STEM Day Cafam · Actividades del Excel (columnas F y G)
   - completarProgramacion: completa título, frase y área cuando una fila
     del Excel las trae vacías pero otra fila de la misma actividad sí.
   - tituloA: muestra el título del Excel con mayúsculas legibles.
   - ActSTEM.animar(r): animación de llegada según la actividad y su frase
     (Matemáticas y Ciencias tienen una animación por actividad).
   ===================================================================== */
(function(){
const sinTildes=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const limpiar=t=>String(t||'').replace(/\s+/g,' ').replace(/^["“”\s]+|["“”\s]+$/g,'').trim();

/* título legible: si viene TODO EN MAYÚSCULAS se pasa a tipo oración (siglas con números se conservan) */
function tituloA(t){
  t=limpiar(t); if(!t) return '';
  const letras=t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòù]/g,'');
  if(!letras || letras!==letras.toUpperCase()) return t;
  let s=t.toLowerCase().replace(/(^|[:.!?¡¿]\s*)([a-záéíóúüñàèìòù])/g,(m,a,b)=>a+b.toUpperCase());
  s=s.split(' ').map(w=>/\d/.test(w)?w.toUpperCase():w).join(' ');
  return s;
}

/* completa las filas del Excel que vienen sin título, frase o área */
function completarProgramacion(rows){
  const act=(rows||[]).filter(r=>r.tipo==='actividad');
  act.forEach(r=>{ r.titulo=limpiar(r.titulo); r.frase=limpiar(r.frase); });
  const porTitulo={}, porFrase={};
  act.forEach(r=>{ if(r.titulo && r.categoria && r.categoria!=='gen'){ porTitulo[sinTildes(r.titulo)]=r; }
                   if(r.frase && r.titulo){ porFrase[sinTildes(r.frase)]=r; } });
  act.forEach(r=>{
    if(!r.titulo && r.frase && porFrase[sinTildes(r.frase)]) r.titulo=porFrase[sinTildes(r.frase)].titulo;
    const m=r.titulo&&porTitulo[sinTildes(r.titulo)];
    if(m){ if(!r.categoria||r.categoria==='gen'){ r.categoria=m.categoria; } if(!r.area) r.area=m.area; if(!r.frase) r.frase=m.frase; }
  });
  return rows;
}

/* ---------- qué actividad es (por título y frase) ---------- */
const REG=[
  // v34 · actividades nuevas del Excel del 18 de octubre (Ciencias) y espacios generales
  ['estanque','pasando en el estanque|pistas de la naturaleza|pistas biologicas'],
  ['extremos','extremos|hielo y el fuego|dos temperaturas'],
  ['ficcion','ficcion y la realidad|mecanica, cuantica|biofisica'],
  ['comes','lo que comes|lo que comemos|tienes lo que se necesita|nutricion y habitos'],
  ['microbios','microbios a manjares|fermentacion'],
  ['visible','mas alla de lo visible|fisica detras del vuelo'],
  ['solucion','solucion para el planeta|combinan creatividad'],
  ['lista','pasando lista por el futuro|direccion de grupo|direccion de curso'],
  ['rompe','cada pieza encaja|rompecabezas'],
  ['hacer','la ciencia nos inspira|actividad del hacer'],
  // v30 · Tecnología: un desastre por espacio del Coliseo
  ['d_avalancha','avalancha'],['d_volcan','erupcion volcanica|erupcion'],['d_incendio','incendios forestales|incendio'],['d_inundacion','inundacion'],
  ['d_terremoto','terremoto|sismo'],['d_tormenta','tormenta electrica'],['d_tsunami','tsunami'],['d_huracan','huracan'],
  ['salvando','salvando especies|corre, piensa y resuelve|pista de obstaculos'],
  ['especie','una especie nos necesita|el tiempo corre'],
  ['notodo','no todo es lo que parece|equilibrio nunca miente'],
  ['scan','scanimation|desliza, observa'],
  ['museo','deconstruir|observa y pinta'],
  ['derivada','derivada|analiza el origen'],
  ['cop','cop-26|cop 26|acuerdos internacionales'],
  ['cinematica','cinematica|inercia'],
  ['escape','escape room|scape room|resuelve el misterio'],
  ['hidrosfera','hidrosfera'],
  ['magnitud','mision magnitud|operacion planeta'],
  ['forense','forense|huellas quimicas'],
  ['trazo','trazo verde|estampado|trazos que clasifican'],
  ['comer','huella dejas al comer|alimentos que nutren'],
  ['alquimia','alquimia|desechos del cafe'],
  ['esquejes','esquejes|enraizar'],
  ['huerta','huerta|biodiversidad en raices'],
  ['ecolab','eco-laboratorio|ingenieria circular'],
  ['lanzamiento','lanzamiento limpio|presion, agua'],
  ['fisica','fisica analitica|prototipos'],
  ['induccion','induccion|maletas cientificas|electromagnetismo'],
  ['insectos','micro-mundo|insectos|bichos bajo la lupa']
];
function claveDe(r){ const t=sinTildes((r.titulo||r.nombre||'')+' | '+(r.frase||''));
  for(const [k,p] of REG) if(p.split('|').some(x=>t.includes(x))) return k; return null; }

/* ---------- animaciones (viewBox 0 0 240 165) ---------- */
const piso='<rect x="0" y="150" width="240" height="15" fill="#e8eef7"/>';
const tag=(x,y,txt,col,d)=>`<g class="x-pop" style="--d:${d}s"><rect x="${x-txt.length*3.2-8}" y="${y-11}" width="${txt.length*6.4+16}" height="18" rx="9" fill="${col}"/><text x="${x}" y="${y+2}" text-anchor="middle" style="font-size:9.5px;font-weight:800;fill:#fff">${txt}</text></g>`;
const mariposa=(x,y,c)=>`<g transform="translate(${x} ${y})"><g class="x-bob"><path class="x-wl" d="M0,0 C-14,-20 -26,-12 -20,2 C-26,14 -10,18 0,4Z" fill="${c}"/><path class="x-wr" d="M0,0 C14,-20 26,-12 20,2 C26,14 10,18 0,4Z" fill="${c}"/><rect x="-1.5" y="-8" width="3" height="16" rx="1.5" fill="#1b2333"/></g></g>`;
const SV={
/* ---------- v34 · CIENCIAS · actividades nuevas (Excel del 18 de octubre) ---------- */
estanque:()=>`${piso}<ellipse cx="120" cy="128" rx="96" ry="24" fill="#4fa3d1"/><ellipse cx="120" cy="124" rx="80" ry="16" fill="#7cc3ea"/>
  <ellipse class="x-ring2" style="--d:.2s" cx="96" cy="124" rx="16" ry="5" fill="none" stroke="#fff" stroke-width="1.5"/><ellipse class="x-ring2" style="--d:.8s" cx="150" cy="128" rx="14" ry="4" fill="none" stroke="#fff" stroke-width="1.5"/>
  ${[30,40,204,214].map((x,i)=>`<path d="M${x},140 q-4,-30 ${i%2?4:-2},-52" stroke="#3f9b52" stroke-width="3" fill="none"/><ellipse cx="${x+(i%2?4:-2)}" cy="88" rx="3" ry="9" fill="#8d5a2b"/>`).join('')}
  <ellipse cx="160" cy="122" rx="16" ry="5" fill="#4caf50"/><g class="x-pop" style="--d:.5s"><ellipse cx="160" cy="114" rx="10" ry="7" fill="#5cb85c"/><circle cx="155" cy="108" r="3" fill="#fff"/><circle cx="165" cy="108" r="3" fill="#fff"/><circle cx="155" cy="108" r="1.4" fill="#1b2333"/><circle cx="165" cy="108" r="1.4" fill="#1b2333"/></g>
  <g class="x-mv" style="--x0:-70px;--y0:-20px;--x1:10px;--y1:0px;--t:2.4s;--d:.4s"><circle cx="100" cy="96" r="18" fill="rgba(255,255,255,.35)" stroke="#3a4253" stroke-width="5"/><line x1="113" y1="109" x2="130" y2="126" stroke="#3a4253" stroke-width="7" stroke-linecap="round"/></g>
  ${tag(58,28,'Biología','#1f9d6b',1.2)}${tag(120,22,'Química','#2f6fde',1.6)}${tag(184,28,'Física','#7b4bd6',2)}
  <g class="x-pop" style="--d:2.4s"><rect x="212" y="40" width="10" height="44" rx="5" fill="#fff" stroke="#9aa3b5" stroke-width="2"/><rect x="214" y="58" width="6" height="24" rx="3" fill="#e5484d"/><circle cx="217" cy="86" r="7" fill="#e5484d"/></g>`,
extremos:()=>`${piso}<rect x="0" y="0" width="120" height="150" fill="#dff1ff"/><rect x="120" y="0" width="120" height="150" fill="#ffe7d6"/>
  <path d="M10,150 L40,92 L62,118 L86,80 L114,150Z" fill="#fff" stroke="#9cc9ee" stroke-width="2"/><path d="M40,92 L48,104 L34,104Z M86,80 L96,98 L78,98Z" fill="#bfe4ff"/>
  ${[[24,30,0],[70,22,.6],[100,46,1.2],[52,56,.9]].map(([x,y,d])=>`<g class="x-mv" style="--x0:0px;--y0:0px;--x1:0px;--y1:40px;--t:2.6s;--d:${d}s"><text x="${x}" y="${y}" style="font-size:13px;fill:#5fa8ff">❄</text></g>`).join('')}
  ${[[150,0],[176,.3],[202,.15]].map(([x,d])=>`<g class="x-glow" style="animation-delay:${d}s"><path d="M${x},150 q-14,-26 0,-52 q6,18 14,8 q12,26 -4,44z" fill="#ff7a1a"/><path d="M${x+2},150 q-6,-16 2,-30 q4,12 8,6 q4,14 -4,24z" fill="#ffd166"/></g>`).join('')}
  <circle cx="120" cy="84" r="26" fill="#4fa3d1" stroke="#fff" stroke-width="3"/><path d="M104,74 q8,-8 16,0 q6,8 -2,14 q-8,4 -4,12 q-10,-4 -12,-14z M126,86 q10,-4 14,4 q2,10 -6,14 q-8,0 -10,-8z" fill="#5cb85c"/>
  ${tag(52,22,'-20 °C','#2f6fde',.6)}${tag(190,22,'45 °C','#e5484d',1)}${tag(120,138,'Un planeta','#1f9d6b',1.6)}`,
ficcion:()=>`${piso}<g transform="translate(64 78)"><g class="x-spin" style="--t:3s"><ellipse rx="40" ry="14" fill="none" stroke="#7b4bd6" stroke-width="2.5"/></g><g class="x-spin" style="--t:4s"><ellipse rx="40" ry="14" fill="none" stroke="#2f6fde" stroke-width="2.5" transform="rotate(60)"/></g><g class="x-spin" style="--t:5s"><ellipse rx="40" ry="14" fill="none" stroke="#1f9d6b" stroke-width="2.5" transform="rotate(-60)"/></g><circle r="8" fill="#e5484d"/></g>
  <line x1="150" y1="34" x2="210" y2="34" stroke="#5b6577" stroke-width="4"/><g class="x-bal" style="transform-origin:180px 34px"><line x1="180" y1="34" x2="180" y2="92" stroke="#5b6577" stroke-width="2"/><circle cx="180" cy="98" r="10" fill="#f2a900"/></g>
  ${Array.from({length:7},(_,i)=>`<g class="x-pop" style="--d:${.3+i*.12}s"><circle cx="${150+i*10}" cy="${132+Math.sin(i)*8}" r="3" fill="#2f6fde"/><circle cx="${150+i*10}" cy="${132-Math.sin(i)*8}" r="3" fill="#e5484d"/><line x1="${150+i*10}" y1="${132+Math.sin(i)*8}" x2="${150+i*10}" y2="${132-Math.sin(i)*8}" stroke="#9aa3b5"/></g>`).join('')}
  ${tag(64,22,'Cuántica','#7b4bd6',.8)}${tag(180,118,'Biofísica','#1f9d6b',1.4)}${tag(180,16,'Mecánica','#2f6fde',2)}`,
comes:()=>`${piso}<ellipse cx="100" cy="128" rx="62" ry="14" fill="#fff" stroke="#c8d0dc" stroke-width="3"/><ellipse cx="100" cy="124" rx="44" ry="8" fill="#eef2f7"/>
  <g class="x-pop" style="--d:.3s"><circle cx="82" cy="110" r="14" fill="#e5484d"/><path d="M82,96 q4,-8 10,-8" stroke="#3f9b52" stroke-width="3" fill="none"/></g>
  <g class="x-pop" style="--d:.5s"><path d="M100,118 q0,-22 20,-22 q20,0 20,22z" fill="#e0a85c"/><path d="M106,108 l6,-6 M116,106 l6,-6 M126,108 l6,-6" stroke="#b07a3a" stroke-width="2"/></g>
  <g class="x-pop" style="--d:.7s"><rect x="62" y="96" width="10" height="22" rx="3" fill="#ff9f43"/><path d="M64,96 l3,-8 l3,8" fill="#3f9b52"/></g>
  <g class="x-pop" style="--d:1s"><path d="M186,60 h18 v28 l14,36 q2,8 -6,8 h-34 q-8,0 -6,-8 l14,-36z" fill="rgba(191,230,251,.7)" stroke="#9aa3b5" stroke-width="2.5"/><path d="M176,112 l8,-20 h22 l8,20 q2,6 -4,6 h-30 q-6,0 -4,-6z" fill="#7b4bd6" opacity=".7"/></g>
  ${[0,1,2].map(i=>`<g class="x-pop" style="--d:${1.6+i*.4}s"><rect x="20" y="${26+i*20}" width="14" height="14" rx="3" fill="#fff" stroke="#1f9d6b" stroke-width="2"/><path d="M23,${33+i*20} l4,4 l6,-8" stroke="#1f9d6b" stroke-width="2.5" fill="none"/></g>`).join('')}
  ${tag(120,26,'¿Tienes lo que se necesita?','#e5484d',.2)}${tag(196,148,'Ciencia','#7b4bd6',2.8)}`,
microbios:()=>`${piso}<rect x="70" y="40" width="70" height="108" rx="12" fill="rgba(191,230,251,.5)" stroke="#9aa3b5" stroke-width="3"/><rect x="66" y="32" width="78" height="12" rx="4" fill="#5b6577"/>
  <rect x="73" y="86" width="64" height="59" rx="9" fill="#f3d9a4"/>
  ${[[86,0],[104,.5],[122,1],[96,1.5],[114,.8]].map(([x,d])=>`<g class="x-mv x-loop" style="--x0:0px;--y0:0px;--x1:0px;--y1:-44px;--t:1.8s;--d:${d}s"><circle cx="${x}" cy="138" r="3.5" fill="#fff" opacity=".9"/></g>`).join('')}
  ${[[30,60,'#7b4bd6'],[44,100,'#1f9d6b'],[172,58,'#e5484d'],[190,98,'#2f6fde']].map(([x,y,c],i)=>`<g class="x-bob" style="animation-delay:${i*.3}s"><ellipse cx="${x}" cy="${y}" rx="12" ry="8" fill="${c}" opacity=".85"/><circle cx="${x-4}" cy="${y-2}" r="1.6" fill="#fff"/><circle cx="${x+4}" cy="${y-2}" r="1.6" fill="#fff"/><path d="M${x-12},${y} l-6,-4 M${x+12},${y} l6,4" stroke="${c}" stroke-width="2"/></g>`).join('')}
  <g class="x-pop" style="--d:1.8s"><path d="M168,148 q0,-26 26,-26 q26,0 26,26z" fill="#e0a85c"/><path d="M176,136 q18,-10 36,0" stroke="#b07a3a" stroke-width="2" fill="none"/></g>
  ${tag(105,20,'Fermentación','#1f9d6b',.6)}${tag(194,112,'¡Manjar!','#f2a900',2.2)}`,
visible:()=>`${piso}<rect x="0" y="0" width="240" height="70" fill="#e7f3ff"/>
  <g class="x-mv" style="--x0:-90px;--y0:20px;--x1:150px;--y1:-10px;--t:3.4s;--d:.2s"><path d="M40,40 l40,-4 l10,4 l-10,4z" fill="#5b6577"/><path d="M58,38 l-10,-14 h8 l14,14z M58,42 l-10,14 h8 l14,-14z" fill="#2f6fde"/><path d="M40,40 l-6,-8 h5 l6,8z" fill="#2f6fde"/></g>
  <path class="x-draw" style="--t:2.4s;--d:.8s" pathLength="1" d="M10,104 h40 l8,-16 l8,30 l8,-40 l8,26 h30" fill="none" stroke="#e5484d" stroke-width="3"/>
  <g transform="translate(170 72)"><rect x="-6" y="56" width="44" height="8" rx="3" fill="#3a4253"/><rect x="10" y="-6" width="10" height="44" rx="3" fill="#5b6577" transform="rotate(-20 15 16)"/><rect x="0" y="40" width="30" height="6" fill="#5b6577"/><path d="M26,44 q12,0 12,14" stroke="#5b6577" stroke-width="6" fill="none"/></g>
  ${[[150,124,0],[134,140,.4],[160,142,.8]].map(([x,y,d])=>`<g class="x-pop" style="--d:${1.6+d}s"><circle cx="${x}" cy="${y}" r="8" fill="#a6e3b8" stroke="#1f9d6b" stroke-width="2"/><circle cx="${x+1}" cy="${y}" r="3" fill="#1f9d6b"/></g>`).join('')}
  ${tag(46,138,'Medicina','#e5484d',1.4)}${tag(196,22,'Vuelo','#2f6fde',1)}${tag(120,90,'Física','#7b4bd6',2.4)}`,
solucion:()=>`${piso}<g class="x-glow"><circle cx="120" cy="64" r="44" fill="#ffd166"/></g><path d="M100,64 a20,20 0 1 1 40,0 q0,12 -10,20 v10 h-20 v-10 q-10,-8 -10,-20z" fill="#fff6cc" stroke="#f2a900" stroke-width="3"/><rect x="108" y="96" width="24" height="8" rx="2" fill="#9aa3b5"/><path d="M114,74 l6,-10 l6,10" stroke="#f2a900" stroke-width="2.5" fill="none"/>
  <g transform="translate(46 112)"><g class="x-spin" style="--t:4s">${Array.from({length:8},(_,i)=>`<rect x="-4" y="-22" width="8" height="10" fill="#5b6577" transform="rotate(${i*45})"/>`).join('')}<circle r="16" fill="#5b6577"/><circle r="6" fill="#e8eef7"/></g></g>
  <g class="x-grow" style="--d:1s;transform-origin:194px 150px"><path d="M194,150 v-36" stroke="#3f9b52" stroke-width="4"/><path d="M194,124 q-20,-6 -22,-24 q18,2 22,24z M194,116 q18,-8 20,-26 q-18,4 -20,26z" fill="#5cb85c"/></g>
  ${tag(54,22,'Creatividad','#7b4bd6',.6)}${tag(186,22,'Innovación','#2f6fde',1)}${tag(120,140,'Ciencia','#1f9d6b',1.4)}`,
/* ---------- v34 · espacios generales: dirección de curso, rompecabezas y actividad del hacer ---------- */
lista:()=>`${piso}<rect x="62" y="22" width="96" height="124" rx="10" fill="#fff" stroke="#9aa3b5" stroke-width="3"/><rect x="92" y="14" width="36" height="16" rx="5" fill="#5b6577"/>
  ${[0,1,2,3].map(i=>`<rect x="76" y="${48+i*22}" width="14" height="14" rx="3" fill="none" stroke="#1f9d6b" stroke-width="2"/><path class="x-draw" style="--t:.4s;--d:${.5+i*.45}s" pathLength="1" d="M79,${55+i*22} l4,4 l7,-9" stroke="#1f9d6b" stroke-width="3" fill="none"/><rect x="96" y="${52+i*22}" width="${44-i*6}" height="6" rx="3" fill="#dfe5ee"/>`).join('')}
  <g class="x-pop" style="--d:2.4s"><circle cx="190" cy="56" r="22" fill="#ffd166"/><path d="M194,40 l-12,18 h10 l-6,16 l14,-20 h-10z" fill="#f2a900"/></g>
  <g class="x-grow" style="--d:2.6s;transform-origin:34px 150px"><path d="M34,150 v-28" stroke="#3f9b52" stroke-width="3"/><path d="M34,130 q-14,-4 -16,-18 q14,2 16,18z M34,124 q14,-6 16,-20 q-14,4 -16,20z" fill="#5cb85c"/></g>
  ${tag(120,158,'Pasando lista por el futuro','#2f6fde',3)}`,
rompe:()=>`${piso}<rect x="66" y="30" width="108" height="108" rx="10" fill="#e6ebf5"/>
  ${[[66,30,'#4fa3d1','-60px','-30px',0],[120,30,'#5cb85c','60px','-30px',.4],[66,84,'#5cb85c','-60px','40px',.8],[120,84,'#4fa3d1','60px','40px',1.2]].map(([x,y,c,a,b,d])=>`<g class="x-mv" style="--x0:${a};--y0:${b};--x1:0px;--y1:0px;--t:1s;--d:${d}s"><path d="M${x},${y} h54 v54 h-54z" fill="${c}" stroke="#fff" stroke-width="3"/><circle cx="${x+27}" cy="${y+27}" r="9" fill="#fff" opacity=".35"/></g>`).join('')}
  <g class="x-pop" style="--d:2.4s"><circle cx="120" cy="84" r="22" fill="none" stroke="#fff" stroke-width="4"/><path d="M110,78 q6,-8 12,0 q4,6 -2,10 q-6,4 -2,10 q-8,-2 -10,-10z" fill="#fff"/></g>
  ${tag(120,14,'Cada pieza encaja','#7b4bd6',2.6)}${tag(120,156,'Juntos armamos la solución','#1f9d6b',3)}`,
hacer:()=>`${piso}${[[70,'#f1c27d',0],[120,'#c68642',.3],[170,'#8d5524',.6]].map(([x,c,d])=>`<g class="x-mv" style="--x0:0px;--y0:40px;--x1:0px;--y1:0px;--t:.9s;--d:${d}s"><rect x="${x-10}" y="112" width="20" height="40" rx="6" fill="#2f6fde"/><rect x="${x-12}" y="84" width="24" height="30" rx="8" fill="${c}"/>${[-9,-3,3,9].map((dx,j)=>`<rect x="${x+dx-2.6}" y="${70-(j===1||j===2?6:0)}" width="5.2" height="${20+(j===1||j===2?6:0)}" rx="2.6" fill="${c}"/>`).join('')}<rect x="${x-17}" y="92" width="8" height="5.2" rx="2.6" fill="${c}" transform="rotate(-35 ${x-13} 94)"/></g>`).join('')}
  <g class="x-pop" style="--d:1.4s"><path d="M120,40 q-16,-14 -22,0 q-4,12 22,28 q26,-16 22,-28 q-6,-14 -22,0z" fill="#e5484d"/></g>
  <g class="x-pop" style="--d:1.8s"><path d="M40,30 q22,-10 30,14 q-24,8 -30,-14z" fill="#5cb85c"/><path d="M200,30 h10 v14 l10,22 q2,6 -4,6 h-22 q-6,0 -4,-6 l10,-22z" fill="rgba(191,230,251,.8)" stroke="#9aa3b5" stroke-width="2"/></g>
  ${tag(56,62,'Inspira','#2f6fde',2.2)}${tag(120,158,'Transforma','#1f9d6b',2.6)}${tag(120,14,'Nos une','#e5484d',3)}`,
/* ---------- TECNOLOGÍA · Desastres naturales (v30) ---------- */
d_avalancha:()=>`${piso}<path d="M0,150 L70,40 L120,95 L160,30 L240,150Z" fill="#9aa9bf"/><path d="M70,40 L84,62 L60,58Z M160,30 L178,58 L146,54Z" fill="#fff"/>
  ${[0,1,2,3,4,5,6].map(i=>`<circle r="${6+i%3*3}" fill="#fff" stroke="#dfe7f2"><animateMotion dur="2.2s" begin="${.3+i*.18}s" fill="freeze" path="M${150+i*4},${46+i*3} Q${110-i*6},${110} ${40-i*4},${140}"/></circle>`).join('')}
  <g class="x-pop" style="--d:2.2s"><rect x="186" y="104" width="34" height="26" rx="4" fill="#2a3550"/><rect x="190" y="108" width="26" height="14" fill="#5ef0ff"/><path d="M196,116 l5,4 l10,-9" stroke="#1f9d6b" stroke-width="3" fill="none"/></g>
  <g class="x-ring2"><circle cx="203" cy="100" r="16" fill="none" stroke="#e5484d" stroke-width="2"/></g>${tag(120,18,'Sensor de alerta temprana','#7b4bd6',2.6)}`,
d_volcan:()=>`${piso}<path d="M30,150 L100,56 L140,56 L210,150Z" fill="#8a5a3c"/><path d="M100,56 L140,56 L130,70 L110,70Z" fill="#e5484d"/>
  <path class="x-draw" pathLength="1" style="--t:1.4s;--d:.6s" d="M118,60 Q112,96 96,150" stroke="#ff7a1a" stroke-width="7" fill="none" stroke-linecap="round"/><path class="x-draw" pathLength="1" style="--t:1.4s;--d:.9s" d="M124,60 Q134,100 150,150" stroke="#ffb020" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${[0,1,2,3,4].map(i=>`<circle cx="${110+i*5}" cy="50" r="${8+i*2}" fill="#7d8696" opacity=".55" style="animation:xup 2.4s ${.2+i*.35}s ease-out infinite"/>`).join('')}
  <g class="x-pop" style="--d:2s"><circle cx="200" cy="44" r="18" fill="#2a3550"/><path d="M190,44 h20 M200,34 v20" stroke="#5ef0ff" stroke-width="2"/><circle cx="200" cy="44" r="5" fill="none" stroke="#5ef0ff" stroke-width="2"/></g>${tag(120,18,'Monitoreo con drones','#7b4bd6',2.6)}`,
d_incendio:()=>`${piso}${[40,80,120,160,200].map((x,i)=>`<g><rect x="${x-3}" y="112" width="6" height="38" fill="#7a5a30"/><circle cx="${x}" cy="104" r="20" fill="#3f9b52"/><g class="x-pop" style="--d:${.3+i*.3}s"><path d="M${x-12},106 Q${x-8},78 ${x},86 Q${x+4},70 ${x+8},88 Q${x+14},80 ${x+12},106Z" fill="#ff7a1a"><animate attributeName="opacity" values="1;.7;1" dur=".5s" repeatCount="indefinite"/></path><path d="M${x-6},106 Q${x-2},92 ${x+2},98 Q${x+6},90 ${x+6},106Z" fill="#ffd34d"/></g></g>`).join('')}
  <g class="x-mv" style="--x0:-80px;--y0:0px;--x1:0px;--y1:0px;--t:1.6s;--d:2s"><path d="M150,28 h50 l10,10 h-70z" fill="#e5484d"/><rect x="170" y="38" width="4" height="8" fill="#5b6577"/>${[0,1,2,3,4,5].map(i=>`<line x1="${160+i*8}" y1="46" x2="${156+i*8}" y2="70" stroke="#5fa8ff" stroke-width="2" opacity=".8"/>`).join('')}</g>${tag(120,18,'Detección y control del fuego','#7b4bd6',3)}`,
d_inundacion:()=>`${piso}<rect x="30" y="88" width="50" height="62" fill="#bd6a43"/><path d="M24,90 L55,62 L86,90Z" fill="#8a3c2c"/><rect x="150" y="70" width="60" height="80" fill="#c9ced6"/><rect x="162" y="84" width="14" height="14" fill="#5fa8ff"/><rect x="186" y="84" width="14" height="14" fill="#5fa8ff"/>
  <rect x="0" y="165" width="240" height="70" fill="#2f6fde" opacity=".75"><animate attributeName="y" from="165" to="118" dur="2.6s" begin=".3s" fill="freeze"/></rect>
  <g class="x-pop" style="--d:2.4s"><rect x="100" y="60" width="30" height="40" rx="4" fill="#2a3550"/><rect x="104" y="64" width="22" height="22" fill="#5ef0ff"/><path d="M108,80 v-10 M115,80 v-14 M122,80 v-6" stroke="#2f6fde" stroke-width="3"/></g>${tag(120,18,'Medidor del nivel del agua','#7b4bd6',2.8)}`,
d_terremoto:()=>`${piso}<g style="animation:xshake .12s linear 14 .3s">${[[40,60],[90,40],[150,70]].map(([x,h])=>`<rect x="${x}" y="${150-h-40}" width="44" height="${h+40}" fill="#c9ced6" stroke="#8a94a8"/>${[0,1,2].map(r=>`<rect x="${x+8}" y="${150-h-30+r*18}" width="10" height="10" fill="#5fa8ff"/><rect x="${x+26}" y="${150-h-30+r*18}" width="10" height="10" fill="#5fa8ff"/>`).join('')}`).join('')}</g>
  <path class="x-draw" pathLength="1" style="--t:1s;--d:.6s" d="M0,150 L60,150 L70,140 L80,158 L92,146 L104,156 L240,150" stroke="#1b2333" stroke-width="2.5" fill="none"/>
  <g class="x-pop" style="--d:2.2s"><rect x="196" y="40" width="36" height="28" rx="4" fill="#2a3550"/><path class="x-draw" pathLength="1" style="--t:1s;--d:2.4s" d="M200,54 l5,0 l3,-8 l4,16 l4,-12 l3,4 l9,0" stroke="#5ef0ff" stroke-width="2" fill="none"/></g>${tag(110,18,'Sismógrafo y rutas de evacuación','#7b4bd6',2.8)}`,
d_tormenta:()=>`<rect width="240" height="165" fill="#2a3550" opacity=".18"/>${piso}<g><ellipse cx="90" cy="40" rx="40" ry="18" fill="#7d8696"/><ellipse cx="130" cy="34" rx="34" ry="20" fill="#9aa3b5"/><ellipse cx="160" cy="44" rx="30" ry="16" fill="#7d8696"/></g>
  <path d="M118,56 L104,92 L118,92 L106,130" stroke="#ffd34d" stroke-width="5" fill="none" stroke-linejoin="round" opacity="0"><animate attributeName="opacity" values="0;1;0;1;0" dur="1.4s" begin=".6s" repeatCount="2"/></path>
  <rect x="180" y="60" width="4" height="90" fill="#5b6577"/><path d="M182,52 l-6,10 h12z" fill="#ffd34d"/><g class="x-pop" style="--d:2.4s">${[0,1].map(i=>`<path d="M${182},${56+i*0} m-${10+i*8},0 a${10+i*8},${10+i*8} 0 0 1 ${20+i*16},0" fill="none" stroke="#5ef0ff" stroke-width="2"/>`).join('')}</g>
  <rect x="40" y="110" width="40" height="40" fill="#bd6a43"/><path d="M34,112 L60,90 L86,112Z" fill="#8a3c2c"/>${tag(120,18,'Pararrayos inteligente','#7b4bd6',2.8)}`,
d_tsunami:()=>`${piso}<rect x="0" y="128" width="240" height="22" fill="#e8d6a8"/><rect x="170" y="80" width="50" height="70" fill="#c9ced6"/><path d="M164,82 L195,60 L226,82Z" fill="#8a94a8"/>
  <path fill="#2f8fdd" d="M-60,150 C-30,60 30,40 60,90 C70,108 40,110 50,96 C30,96 20,150 0,150Z"><animateTransform attributeName="transform" type="translate" from="0 0" to="150 0" dur="2.6s" begin=".3s" fill="freeze"/></path>
  <g class="x-pop" style="--d:2.6s"><rect x="186" y="30" width="10" height="44" fill="#5b6577"/><path d="M178,30 h26 l-4,-10 h-18z" fill="#e5484d"/><g class="x-ring2"><path d="M206,28 a10,10 0 0 1 0,16 M212,22 a18,18 0 0 1 0,28" fill="none" stroke="#e5484d" stroke-width="2"/></g></g>${tag(110,18,'Sirena y boya de alerta','#7b4bd6',2.9)}`,
d_huracan:()=>`${piso}<g style="transform-origin:120px 76px;animation:xspin 1.6s linear infinite">${[0,1,2].map(i=>`<path d="M120,76 C${150},${40} ${180},${70} ${160},${100}" stroke="#7b4bd6" stroke-width="${6-i*1.5}" fill="none" stroke-linecap="round" transform="rotate(${i*120} 120 76)" opacity="${.9-i*.2}"/>`).join('')}<circle cx="120" cy="76" r="8" fill="#fff" stroke="#7b4bd6" stroke-width="3"/></g>
  ${[40,200].map(x=>`<g><rect x="${x-2}" y="110" width="4" height="40" fill="#7a5a30"/><path d="M${x},110 q-16,-6 -22,4 M${x},110 q16,-6 22,4 M${x},110 q-8,-14 -18,-12 M${x},110 q8,-14 18,-12" stroke="#3f9b52" stroke-width="4" fill="none"><animateTransform attributeName="transform" type="rotate" values="-10 ${x} 150;12 ${x} 150;-10 ${x} 150" dur=".8s" repeatCount="indefinite"/></path></g>`).join('')}
  <g class="x-pop" style="--d:2.4s"><circle cx="200" cy="40" r="14" fill="#2a3550"/><path d="M200,30 v10 l7,5" stroke="#5ef0ff" stroke-width="2.5" fill="none"/></g>${tag(110,18,'Estación meteorológica','#7b4bd6',2.8)}`,
/* ---------- MATEMÁTICAS ---------- */
museo:()=>{ const tri=[[78,40,118,40,98,72,'#2f6fde'],[118,40,158,40,138,72,'#f2b705'],[98,72,138,72,118,40,'#e5484d'],[78,104,98,72,118,104,'#1f9d6b'],[118,104,138,72,158,104,'#7b4bd6'],[98,72,138,72,118,104,'#ff8a3d']];
  return `<line x1="90" y1="112" x2="74" y2="155" stroke="#8a6a44" stroke-width="5"/><line x1="146" y1="112" x2="162" y2="155" stroke="#8a6a44" stroke-width="5"/><line x1="118" y1="112" x2="118" y2="150" stroke="#8a6a44" stroke-width="4"/>
  <rect x="70" y="30" width="96" height="84" rx="3" fill="#fff" stroke="#c9bfae" stroke-width="3"/>
  ${tri.map((t,i)=>`<polygon class="x-pop" style="--d:${.3+i*.35}s" points="${t[0]},${t[1]} ${t[2]},${t[3]} ${t[4]},${t[5]}" fill="${t[6]}" stroke="#fff" stroke-width="1.5"/>`).join('')}
  <g class="x-mv" style="--x0:-60px;--y0:-10px;--x1:40px;--y1:40px;--t:2.6s;--d:.2s"><rect x="150" y="20" width="6" height="34" rx="3" fill="#c99a62" transform="rotate(35 153 37)"/><path d="M162,48 l8,10 l-10,-3z" fill="#e5484d"/></g>
  <circle cx="198" cy="128" r="16" fill="#fff" stroke="#c9bfae" stroke-width="2"/><circle cx="192" cy="122" r="4" fill="#2f6fde"/><circle cx="203" cy="121" r="4" fill="#f2b705"/><circle cx="198" cy="134" r="4" fill="#e5484d"/>
  ${tag(76,18,'Arte + geometría','#2f6fde',2.4)}`; },
derivada:()=>`<line x1="26" y1="138" x2="222" y2="138" stroke="#9aa3b5" stroke-width="2"/><line x1="34" y1="146" x2="34" y2="18" stroke="#9aa3b5" stroke-width="2"/>
  <path id="xs-curva" pathLength="1" class="x-draw" style="--t:1.6s" d="M40,128 C80,128 90,40 130,40 C170,40 180,120 214,120" fill="none" stroke="#2f6fde" stroke-width="3.5" stroke-linecap="round"/>
  <circle r="6" fill="#f2b705" stroke="#fff" stroke-width="2"><animateMotion dur="2.2s" begin=".4s" fill="freeze" keyPoints="0;0.5" keyTimes="0;1" calcMode="linear" path="M40,128 C80,128 90,40 130,40 C170,40 180,120 214,120"/></circle>
  <line class="x-pop" style="--d:2.5s" x1="96" y1="40" x2="164" y2="40" stroke="#e5484d" stroke-width="2.5" stroke-dasharray="6 4"/>
  ${tag(130,22,"f'(x) = 0",'#e5484d',2.8)}
  <g class="x-pop" style="--d:3.1s"><path d="M196,36 l4,9 l10,1 l-8,6 l3,10 l-9,-6 l-9,6 l3,-10 l-8,-6 l10,-1z" fill="#ffcf3a"/></g>
  <text class="x-fade" x="198" y="88" text-anchor="middle" style="--d:3.3s;font-size:9px;font-weight:800;fill:#2f6fde">¡Extraordinario!</text>`,
notodo:()=>`<rect x="116" y="56" width="8" height="90" fill="#7d8696"/><path d="M96,150 h48 l-8,-10 h-32z" fill="#5b6577"/>
  <g class="x-bal"><rect x="50" y="52" width="140" height="6" rx="3" fill="#2f6fde"/>
   <line x1="60" y1="58" x2="52" y2="96" stroke="#9aa3b5"/><line x1="60" y1="58" x2="76" y2="96" stroke="#9aa3b5"/><path d="M44,96 h40 a20,8 0 0 1 -40,0z" fill="#cfd6e4"/><circle cx="64" cy="86" r="10" fill="#f2b705"/>
   <line x1="180" y1="58" x2="168" y2="96" stroke="#9aa3b5"/><line x1="180" y1="58" x2="192" y2="96" stroke="#9aa3b5"/><path d="M160,96 h40 a20,8 0 0 1 -40,0z" fill="#cfd6e4"/><rect x="168" y="82" width="10" height="10" fill="#e5484d"/><rect x="180" y="82" width="10" height="10" fill="#e5484d"/><rect x="174" y="72" width="10" height="10" fill="#e5484d"/></g>
  <circle cx="120" cy="52" r="7" fill="#1b2333"/>
  <g transform="translate(24 30)"><path d="M0,-6 h6 l8,-7 v26 l-8,-7 h-6z" fill="#173d7a"/><path class="x-ring2" d="M18,-8 a10,10 0 0 1 0,16" fill="none" stroke="#173d7a" stroke-width="2.5"/><path class="x-ring2" style="--d:.4s" d="M22,-13 a16,16 0 0 1 0,26" fill="none" stroke="#173d7a" stroke-width="2.5"/></g>
  ${tag(120,18,'¡El equilibrio nunca miente!','#2f6fde',2.6)}
  <g class="x-pop" style="--d:3.2s"><ellipse cx="206" cy="140" rx="16" ry="9" fill="#3f9b52"/><circle cx="224" cy="138" r="5" fill="#5cb85c"/><path d="M196,132 a10,6 0 0 1 20,0" fill="#8bd17c"/></g>`,
scan:()=>`<defs><pattern id="xs-rej" width="8" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill="#1b2333"/></pattern><clipPath id="xs-mar"><rect x="40" y="26" width="160" height="110" rx="6"/></clipPath></defs>
  <rect x="40" y="26" width="160" height="110" rx="6" fill="#eaf3ff" stroke="#2f6fde" stroke-width="3"/>
  <g clip-path="url(#xs-mar)">${mariposa(120,80,'#2f6fde')}<g class="x-fade" style="--d:2.2s"><circle cx="70" cy="118" r="10" fill="#ffcf3a"/><circle cx="170" cy="50" r="6" fill="#1f9d6b"/></g>
   <rect class="x-slide" x="40" y="26" width="160" height="110" fill="url(#xs-rej)" opacity=".92"/></g>
  <g class="x-slide"><rect x="36" y="20" width="6" height="122" rx="3" fill="#f2b705"/></g>
  ${tag(120,152,'Desliza y descubre el código','#2f6fde',2.8)}`,
especie:()=>`<circle cx="70" cy="80" r="40" fill="#fff" stroke="#2f6fde" stroke-width="5"/><rect x="64" y="30" width="12" height="8" rx="2" fill="#2f6fde"/>
  ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>`<line x1="70" y1="46" x2="70" y2="50" stroke="#9aa3b5" stroke-width="2" transform="rotate(${i*30} 70 80)"/>`).join('')}
  <line class="x-spin" style="--t:2s;transform-origin:70px 80px;transform-box:view-box" x1="70" y1="80" x2="70" y2="52" stroke="#e5484d" stroke-width="3" stroke-linecap="round"/><circle cx="70" cy="80" r="4" fill="#1b2333"/>
  <g class="x-mv" style="--x0:0px;--y0:0px;--x1:0px;--y1:-12px;--t:.5s;--d:2.8s"><path d="M150,70 v-14 a18,18 0 0 1 36,0 v14" fill="none" stroke="#7d8696" stroke-width="7"/></g>
  <rect x="140" y="68" width="56" height="48" rx="8" fill="#2f6fde"/>
  ${['7','3','5'].map((n,i)=>`<g class="x-pop" style="--d:${.8+i*.6}s"><rect x="${146+i*16}" y="84" width="13" height="18" rx="3" fill="#fff"/><text x="${152.5+i*16}" y="97" text-anchor="middle" style="font-size:11px;font-weight:800;fill:#173d7a">${n}</text></g>`).join('')}
  ${tag(168,140,'¡Misión cumplida!','#1f9d6b',3.3)}
  <g class="x-pop" style="--d:3.5s"><circle cx="214" cy="40" r="11" fill="#5cb85c"/><circle cx="210" cy="37" r="3" fill="#fff"/><circle cx="219" cy="37" r="3" fill="#fff"/><circle cx="210" cy="37" r="1.4" fill="#1b2333"/><circle cx="219" cy="37" r="1.4" fill="#1b2333"/></g>`,
salvando:()=>`${piso}<rect x="0" y="128" width="240" height="22" fill="#e07b3b"/><line x1="0" y1="139" x2="240" y2="139" stroke="#fff" stroke-dasharray="10 8" stroke-width="2"/>
  ${[70,130,190].map(x=>`<g><rect x="${x-12}" y="110" width="24" height="5" fill="#fff" stroke="#e5484d" stroke-width="2"/><rect x="${x-12}" y="115" width="3" height="16" fill="#9aa3b5"/><rect x="${x+9}" y="115" width="3" height="16" fill="#9aa3b5"/></g>`).join('')}
  <g><animateMotion dur="3.2s" begin=".3s" fill="freeze" path="M20,0 L50,0 Q70,-46 90,0 L110,0 Q130,-46 150,0 L170,0 Q190,-46 210,0 L222,0"/>
   <g transform="translate(0 122)"><circle cx="0" cy="-30" r="7" fill="#c99a62"/><rect x="-6" y="-23" width="12" height="16" rx="5" fill="#2f6fde"/><line class="x-run" x1="-3" y1="-8" x2="-7" y2="2" stroke="#1b2333" stroke-width="3"/><line class="x-run2" x1="3" y1="-8" x2="7" y2="2" stroke="#1b2333" stroke-width="3"/></g></g>
  ${['+3','×2','÷4'].map((n,i)=>`<text class="x-fade" x="${70+i*60}" y="66" text-anchor="middle" style="--d:${.8+i*.9}s;font-size:13px;font-weight:800;fill:#2f6fde">${n}</text>`).join('')}
  <g class="x-pop" style="--d:3.4s">${mariposa(200,40,'#f2b705')}</g>
  ${tag(112,22,'¡Corre, piensa y resuelve!','#2f6fde',.4)}`,
/* ---------- CIENCIAS ---------- */
cop:()=>`<circle cx="120" cy="92" r="44" fill="#4fa3d1"/><path d="M92,70 q12,-10 22,2 q8,10 -4,18 q-10,6 -6,18 q-14,-6 -16,-20 q-2,-10 4,-18z M132,92 q14,-6 22,6 q4,14 -8,22 q-12,4 -16,-8 q-4,-12 2,-20z" fill="#5cb85c"/>
  ${[[60,120,0],[170,124,.5],[100,130,1],[150,118,1.4]].map(([x,y,d])=>`<g class="x-mv" style="--x0:0px;--y0:0px;--x1:0px;--y1:-52px;--t:2.2s;--d:${d}s"><circle cx="${x}" cy="${y}" r="6" fill="#3a4253"/><circle cx="${x-9}" cy="${y}" r="5" fill="#e5484d"/><circle cx="${x+9}" cy="${y}" r="5" fill="#e5484d"/></g>`).join('')}
  <line class="x-pop" style="--d:2.4s" x1="20" y1="44" x2="220" y2="44" stroke="#e5484d" stroke-width="3" stroke-dasharray="8 5"/>
  ${tag(196,32,'Límite','#e5484d',2.6)}
  ${['#e5484d','#f2b705','#2f6fde','#1f9d6b','#7b4bd6'].map((c,i)=>`<g class="x-pop" style="--d:${2.8+i*.15}s"><rect x="${70+i*22}" y="146" width="2" height="16" fill="#5b6577"/><rect x="${72+i*22}" y="146" width="14" height="9" fill="${c}"/></g>`).join('')}
  ${tag(48,22,'COP-26','#1f9d6b',.2)}`,
cinematica:()=>`${piso}<line x1="10" y1="150" x2="230" y2="150" stroke="#9aa3b5" stroke-width="3"/>
  <g class="x-mv" style="--x0:-10px;--y0:0px;--x1:120px;--y1:0px;--t:3s;--d:.2s;animation-timing-function:cubic-bezier(.2,.7,.3,1)"><g class="x-spin" style="--t:3s;transform-origin:40px 126px;transform-box:view-box"><circle cx="40" cy="126" r="22" fill="#4fa3d1"/><path d="M28,116 q8,-6 14,2 q4,8 -4,12 q-8,2 -10,-4z M44,128 q8,-2 10,6 q-2,8 -10,6z" fill="#5cb85c"/></g>
   <line x1="4" y1="116" x2="-20" y2="116" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round" class="x-blinkk"/><line x1="4" y1="132" x2="-26" y2="132" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round" class="x-blinkk"/></g>
  <path d="M150,62 a40,40 0 0 1 80,0" fill="none" stroke="#e2e6ee" stroke-width="10"/><path d="M150,62 a40,40 0 0 1 26,-37" fill="none" stroke="#1f9d6b" stroke-width="10"/><path d="M204,25 a40,40 0 0 1 26,37" fill="none" stroke="#e5484d" stroke-width="10"/>
  <line class="x-needle" x1="190" y1="62" x2="190" y2="30" stroke="#1b2333" stroke-width="3" stroke-linecap="round"/><circle cx="190" cy="62" r="5" fill="#1b2333"/>
  ${tag(64,30,'v = Δx / Δt','#1f9d6b',.6)}${tag(190,84,'¡Frena el cambio!','#e5484d',2.9)}`,
escape:()=>`<rect x="70" y="24" width="84" height="126" rx="4" fill="#5b3a1f"/>
  <g class="x-door"><rect x="74" y="28" width="76" height="122" fill="#8a5a2b"/><rect x="82" y="38" width="60" height="44" rx="3" fill="none" stroke="#6b4522" stroke-width="3"/><rect x="82" y="92" width="60" height="44" rx="3" fill="none" stroke="#6b4522" stroke-width="3"/><circle cx="140" cy="90" r="5" fill="#f2b705"/></g>
  <g class="x-mv" style="--x0:-120px;--y0:30px;--x1:0px;--y1:0px;--t:1.6s;--d:.6s"><circle cx="124" cy="90" r="7" fill="none" stroke="#f2b705" stroke-width="3"/><rect x="131" y="88" width="14" height="4" fill="#f2b705"/></g>
  ${['?','?','!'].map((t,i)=>`<text class="x-pop" x="${30+i*14}" y="${50+i*20}" style="--d:${.2+i*.5}s;font-size:22px;font-weight:900;fill:#1f9d6b">${t}</text>`).join('')}
  <rect x="186" y="40" width="14" height="80" rx="7" fill="#fff" stroke="#9aa3b5" stroke-width="2"/><circle cx="193" cy="124" r="10" fill="#e5484d"/><rect class="a-merc" x="189" y="50" width="8" height="74" rx="4" fill="#e5484d"/>
  ${tag(112,12,'Science on the edge','#1f9d6b',2.6)}${tag(40,138,'Repair','#2f6fde',.6)}${tag(40,158,'Separate','#7b4bd6',1.1)}${tag(196,138,'Save','#e5484d',1.6)}${tag(196,158,'Escape!','#f2a900',2.1)}`,
hidrosfera:()=>`<path d="M0,128 Q30,120 60,128 T120,128 T180,128 T240,128 V165 H0Z" fill="#4fa3d1"/><circle class="a-sun" cx="36" cy="32" r="14" fill="#ffd166"/>
  ${[50,90,130].map((x,i)=>`<path class="x-mv" style="--x0:0px;--y0:0px;--x1:0px;--y1:-60px;--t:1.6s;--d:${.3+i*.3}s" d="M${x},120 q-4,-8 0,-14 q4,-6 0,-14" fill="none" stroke="#bde3ff" stroke-width="3" stroke-linecap="round"/>`).join('')}
  <g class="x-pop" style="--d:1.6s"><ellipse cx="150" cy="38" rx="34" ry="14" fill="#fff"/><ellipse cx="132" cy="44" rx="20" ry="10" fill="#fff"/><ellipse cx="170" cy="44" rx="20" ry="10" fill="#fff"/></g>
  ${[136,150,164,178].map((x,i)=>`<path class="a-drop" style="animation-delay:${2+i*.25}s;animation-iteration-count:3" d="M${x},56 q3,5 0,8 q-3,-3 0,-8z" fill="#2f8fd1"/>`).join('')}
  <g class="x-flip" style="transform-origin:210px 98px"><path d="M198,78 h24 l-10,20 l10,20 h-24 l10,-20z" fill="#fff" stroke="#7d8696" stroke-width="2"/><path d="M203,82 h14 l-7,12z" fill="#f2b705"/></g>
  ${tag(110,152,'Equilibra las fuerzas','#1f9d6b',3)}`,
magnitud:()=>`<circle cx="92" cy="92" r="46" fill="#4fa3d1"/><path d="M62,70 q12,-10 22,2 q8,10 -4,18 q-10,6 -6,18 q-14,-6 -16,-20 q-2,-10 4,-18z M108,95 q14,-6 22,6 q4,14 -8,22 q-12,4 -16,-8 q-4,-12 2,-20z" fill="#5cb85c"/>
  <circle pathLength="1" class="x-draw" style="--t:1.8s" cx="92" cy="92" r="54" fill="none" stroke="#f2b705" stroke-width="7" transform="rotate(-90 92 92)"/>
  <circle pathLength="1" class="x-draw" style="--t:1.8s" cx="92" cy="92" r="54" fill="none" stroke="#1b2333" stroke-width="7" stroke-dasharray="0.004 0.03" transform="rotate(-90 92 92)" opacity=".5"/>
  <circle cx="190" cy="70" r="30" fill="#fff" stroke="#9aa3b5" stroke-width="3"/><path d="M166,82 a26,26 0 0 1 48,0" fill="none" stroke="#e2e6ee" stroke-width="6"/><path d="M200,46 a26,26 0 0 1 14,36" fill="none" stroke="#e5484d" stroke-width="6"/>
  <line class="x-needle" style="transform-origin:190px 74px" x1="190" y1="74" x2="190" y2="50" stroke="#1b2333" stroke-width="3" stroke-linecap="round"/><circle cx="190" cy="74" r="4" fill="#1b2333"/>
  ${tag(192,126,'Mide tu impacto','#1f9d6b',2.4)}${tag(92,20,'Planeta bajo presión','#e5484d',1)}`,
forense:()=>`${[0,1,2,3,4,5].map(i=>`<ellipse pathLength="1" class="x-draw" style="--t:.8s;--d:${i*.15}s" cx="80" cy="84" rx="${8+i*7}" ry="${12+i*8}" fill="none" stroke="#7b4bd6" stroke-width="2.5" stroke-dasharray="1"/>`).join('')}
  <g class="x-mv" style="--x0:-40px;--y0:20px;--x1:10px;--y1:-10px;--t:2.4s;--d:.4s"><circle cx="86" cy="80" r="22" fill="rgba(191,230,251,.45)" stroke="#173d7a" stroke-width="5"/><rect x="100" y="98" width="10" height="34" rx="5" fill="#173d7a" transform="rotate(-40 105 115)"/></g>
  ${[0,1,2].map(i=>`<g transform="translate(${160+i*22} 40)"><rect x="0" y="0" width="14" height="70" rx="7" fill="#fff" stroke="#9aa3b5" stroke-width="2"/><rect x="2" y="34" width="10" height="34" rx="5" fill="#9fc8ef"/><rect class="x-fade" style="--d:${1.4+i*.5}s" x="2" y="34" width="10" height="34" rx="5" fill="${['#e5484d','#f2b705','#1f9d6b'][i]}"/><circle class="a-drop" style="animation-delay:${1.6+i*.5}s;animation-iteration-count:2" cx="7" cy="40" r="2" fill="#fff"/></g>`).join('')}
  ${tag(180,134,'Huellas químicas','#7b4bd6',2.8)}`,
trazo:()=>`<rect x="30" y="30" width="180" height="116" rx="4" fill="#fff" stroke="#c9bfae" stroke-width="2"/>
  <path pathLength="1" class="x-draw" style="--t:2.2s" d="M44,120 C70,80 90,140 116,100 S160,70 196,96" fill="none" stroke="#1f9d6b" stroke-width="3.5" stroke-linecap="round"/>
  ${[[64,58,0],[108,52,1],[152,58,2]].map(([x,y,i])=>`<g class="x-pop" style="--d:${.9+i*.8}s"><path d="M${x},${y+16} C${x-14},${y+6} ${x-10},${y-12} ${x},${y-16} C${x+10},${y-12} ${x+14},${y+6} ${x},${y+16}Z" fill="${['#3f9b52','#5cb85c','#2e8b3d'][i]}"/><line x1="${x}" y1="${y+16}" x2="${x}" y2="${y-12}" stroke="#d4f0c8" stroke-width="1.5"/></g>`).join('')}
  <g class="x-stamp"><rect x="0" y="0" width="30" height="16" rx="3" fill="#8a5a2b"/><rect x="10" y="-22" width="10" height="22" rx="4" fill="#c99a62"/></g>
  ${tag(120,18,'Ilustra · observa · ordena','#1f9d6b',3.2)}${tag(120,160,'Cada estampado deja huella','#7b4bd6',3.6)}`,
comer:()=>`<ellipse cx="96" cy="112" rx="66" ry="26" fill="#fff" stroke="#c9bfae" stroke-width="3"/><ellipse cx="96" cy="108" rx="48" ry="17" fill="#f6f0e2"/>
  <g class="x-pop" style="--d:.3s"><circle cx="72" cy="100" r="11" fill="#e5484d"/><path d="M72,89 q2,-6 6,-7" stroke="#3f9b52" stroke-width="2" fill="none"/></g>
  <g class="x-pop" style="--d:.7s"><ellipse cx="98" cy="102" rx="7" ry="15" fill="#f2b705" transform="rotate(30 98 102)"/><path d="M104,94 q8,-6 10,-14" stroke="#3f9b52" stroke-width="3" fill="none"/></g>
  <g class="x-pop" style="--d:1.1s"><path d="M118,96 l16,12 l-22,6z" fill="#ff8a3d"/><path d="M130,100 l6,-8 M132,104 l8,-4" stroke="#3f9b52" stroke-width="2.5"/></g>
  <g class="x-pop" style="--d:1.8s"><ellipse cx="196" cy="70" rx="18" ry="28" fill="#3f9b52"/><circle cx="184" cy="34" r="6" fill="#5cb85c"/><circle cx="196" cy="30" r="5" fill="#5cb85c"/><circle cx="207" cy="34" r="4.5" fill="#5cb85c"/><circle cx="214" cy="42" r="4" fill="#5cb85c"/><path d="M190,62 q6,8 0,18 M200,58 q-6,10 2,20" stroke="#8bd17c" stroke-width="2" fill="none"/></g>
  <rect x="160" y="112" width="70" height="10" rx="5" fill="#e2e6ee"/><rect class="x-shrink" x="160" y="112" width="70" height="10" rx="5" fill="#e5484d"/>
  <text x="195" y="136" text-anchor="middle" style="font-size:8.5px;font-weight:800;fill:#5b6577">huella de carbono</text>
  ${tag(96,22,'¿Qué huella dejas al comer?','#1f9d6b',2.6)}`,
alquimia:()=>`${piso}<rect x="140" y="132" width="90" height="18" rx="4" fill="#7a5233"/>
  <path d="M40,90 h44 l-6,40 h-32z" fill="#fff" stroke="#9aa3b5" stroke-width="2"/><path d="M84,98 a10,10 0 0 1 0,20" fill="none" stroke="#9aa3b5" stroke-width="3"/><ellipse cx="62" cy="92" rx="21" ry="5" fill="#5a3314"/>
  <path class="a-steam" d="M54,84 q-6,-8 0,-16 q6,-8 0,-16" fill="none" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round"/><path class="a-steam" style="animation-delay:.4s" d="M70,84 q-6,-8 0,-16 q6,-8 0,-16" fill="none" stroke="#9aa3b5" stroke-width="3" stroke-linecap="round"/>
  ${[0,1,2,3,4].map(i=>`<circle class="x-mv" style="--x0:0px;--y0:0px;--x1:${100+i*6}px;--y1:44px;--t:1.4s;--d:${.6+i*.2}s" cx="${56+i*3}" cy="90" r="3" fill="#5a3314"/>`).join('')}
  <g class="x-grow" style="--d:2.2s;transform-origin:185px 132px"><rect x="183" y="96" width="4" height="36" fill="#3f9b52"/><ellipse cx="174" cy="100" rx="11" ry="6" fill="#5cb85c" transform="rotate(-25 174 100)"/><ellipse cx="196" cy="94" rx="11" ry="6" fill="#5cb85c" transform="rotate(25 196 94)"/></g>
  <g class="x-spin" style="--t:5s;transform-origin:120px 46px;transform-box:view-box"><path d="M120,24 a22,22 0 1 1 -21,15" fill="none" stroke="#1f9d6b" stroke-width="4"/><path d="M95,34 l4,10 l8,-7z" fill="#1f9d6b"/></g>
  ${tag(170,22,'Residuo → solución','#1f9d6b',2.8)}`,
huerta:()=>`<rect x="0" y="118" width="240" height="47" fill="#8a5a2b"/><rect x="0" y="114" width="240" height="8" fill="#6b4522"/>
  ${[[50,'#3f9b52',.2],[120,'#2e8b3d',.9],[190,'#5cb85c',1.6]].map(([x,c,d])=>`<g class="x-grow" style="--d:${d}s;transform-origin:${x}px 116px"><rect x="${x-2}" y="76" width="4" height="40" fill="${c}"/><ellipse cx="${x-12}" cy="88" rx="13" ry="6" fill="${c}" transform="rotate(-25 ${x-12} 88)"/><ellipse cx="${x+12}" cy="80" rx="13" ry="6" fill="${c}" transform="rotate(25 ${x+12} 80)"/></g>
   <path pathLength="1" class="x-draw" style="--t:1.2s;--d:${d+.3}s" d="M${x},120 q-6,14 -2,26 M${x},120 q8,12 6,28 M${x},126 q-14,6 -18,18" fill="none" stroke="#f6e3c3" stroke-width="2"/>`).join('')}
  <g class="x-pop" style="--d:1.9s"><circle cx="50" cy="68" r="9" fill="#e5484d"/><circle cx="120" cy="64" r="8" fill="#f2b705"/><circle cx="190" cy="70" r="9" fill="#7b4bd6"/></g>
  <g class="x-bee"><ellipse cx="0" cy="0" rx="8" ry="6" fill="#f2b705"/><rect x="-2" y="-6" width="3" height="12" fill="#1b2333"/><ellipse cx="-2" cy="-8" rx="5" ry="3" fill="#e6f3ff" class="a-wl"/></g>
  ${tag(120,22,'Sembrando diversidad','#1f9d6b',2.4)}`,
ecolab:()=>`<path d="M60,40 h20 v30 l26,52 a8,8 0 0 1 -7,12 h-58 a8,8 0 0 1 -7,-12 l26,-52z" fill="#fff" stroke="#9aa3b5" stroke-width="2.5"/><path d="M40,100 h60 l9,18 a8,8 0 0 1 -7,12 h-64 a8,8 0 0 1 -7,-12z" fill="#1f9d6b" opacity=".85"/>
  ${[0,1,2].map(i=>`<circle class="a-drop" style="animation:xup 1.4s ${i*.4}s ease-in infinite" cx="${62+i*10}" cy="112" r="3" fill="#d4f0c8"/>`).join('')}
  ${[['#6b4522',0],['#8a5a2b',.4],['#c99a62',.8],['#3f9b52',1.2]].map(([c,d],i)=>`<rect class="x-pop" style="--d:${d}s" x="136" y="${126-i*18}" width="62" height="16" rx="3" fill="${c}"/>`).join('')}
  <g class="x-spin" style="--t:4s;transform-origin:167px 52px;transform-box:view-box"><path d="M167,30 a22,22 0 1 1 -19,11" fill="none" stroke="#1f9d6b" stroke-width="4"/><path d="M143,34 l6,10 l7,-8z" fill="#1f9d6b"/><path d="M167,74 a22,22 0 0 1 -9,-2" fill="none" stroke="#1f9d6b" stroke-width="4"/></g>
  <text x="167" y="57" text-anchor="middle" style="font-size:14px">♻</text>
  ${tag(120,152,'Analizar · transformar · regenerar','#1f9d6b',2.2)}`,
lanzamiento:()=>`${piso}<path d="M100,150 l12,-16 h16 l12,16z" fill="#5b6577"/>
  <path class="x-draw" pathLength="1" style="--t:2.4s;--d:.9s" d="M120,130 Q170,-30 222,120" fill="none" stroke="#9aa3b5" stroke-width="2" stroke-dasharray=".02 .02"/>
  <g class="x-rocket"><path d="M112,132 v-34 q8,-18 16,0 v34z" fill="#e5484d"/><rect x="113" y="104" width="14" height="24" rx="4" fill="#bde3ff" opacity=".9"/><path d="M112,122 l-8,12 h8z M128,122 l8,12 h-8z" fill="#173d7a"/>
   <g class="x-spray">${[0,1,2,3].map(i=>`<circle cx="${114+i*4}" cy="${140+i%2*6}" r="2.5" fill="#4fa3d1"/>`).join('')}</g></g>
  <rect x="40" y="110" width="8" height="40" fill="#7d8696"/><rect class="x-pump" x="34" y="102" width="20" height="6" rx="3" fill="#173d7a"/><path d="M48,140 q30,10 64,-4" fill="none" stroke="#1b2333" stroke-width="2"/>
  ${tag(60,30,'0 emisiones','#1f9d6b',1.8)}${tag(196,30,'Presión + agua','#2f6fde',2.4)}`,
esquejes:()=>`<rect x="40" y="70" width="60" height="78" rx="10" fill="rgba(191,230,251,.55)" stroke="#9aa3b5" stroke-width="2.5"/><rect x="42" y="96" width="56" height="50" rx="8" fill="#4fa3d1" opacity=".55"/>
  <path d="M70,40 v90" stroke="#6b4522" stroke-width="4"/><g class="x-pop" style="--d:1.6s"><ellipse cx="58" cy="44" rx="12" ry="6" fill="#3f9b52" transform="rotate(-30 58 44)"/><ellipse cx="82" cy="52" rx="12" ry="6" fill="#5cb85c" transform="rotate(30 82 52)"/></g>
  <path pathLength="1" class="x-draw" style="--t:1.6s;--d:.3s" d="M70,128 q-10,8 -14,16 M70,128 q10,6 16,14 M70,130 q0,8 -2,14" fill="none" stroke="#f6e3c3" stroke-width="2.5"/>
  <path d="M120,96 h30" stroke="#9aa3b5" stroke-width="3" class="x-fade" style="--d:2s"/><path d="M146,90 l8,6 l-8,6" fill="none" stroke="#9aa3b5" stroke-width="3" class="x-fade" style="--d:2s"/>
  <rect x="160" y="140" width="64" height="10" rx="4" fill="#8a5a2b"/>
  <g class="x-grow" style="--d:2.4s;transform-origin:192px 142px"><rect x="188" y="100" width="8" height="42" fill="#7a5233"/><circle cx="192" cy="88" r="24" fill="#3f9b52"/><circle cx="178" cy="98" r="14" fill="#2e8b3d"/><circle cx="206" cy="98" r="14" fill="#2e8b3d"/></g>
  ${tag(120,22,'Enraizando el futuro','#1f9d6b',3)}`,
fisica:()=>`<rect x="24" y="30" width="120" height="84" rx="8" fill="#1b2333"/><rect x="32" y="38" width="104" height="68" rx="4" fill="#0e3b2e"/>
  ${[1,2,3].map(i=>`<line x1="32" y1="${38+i*17}" x2="136" y2="${38+i*17}" stroke="#1f5a45" stroke-width="1"/>`).join('')}
  <path pathLength="1" class="x-draw x-loop" style="--t:2s" d="M34,72 q13,-28 26,0 t26,0 t26,0 t24,0" fill="none" stroke="#7CFFB2" stroke-width="2.5"/>
  <circle cx="44" cy="126" r="6" fill="#e5484d"/><circle cx="64" cy="126" r="6" fill="#f2b705"/><circle cx="84" cy="126" r="6" fill="#4fa3d1"/>
  ${[30,52,40,66].map((h,i)=>`<rect class="x-grow" style="--d:${.4+i*.3}s;transform-origin:${166+i*16}px 140px" x="${160+i*16}" y="${140-h}" width="12" height="${h}" rx="2" fill="${['#1f9d6b','#2f6fde','#f2b705','#e5484d'][i]}"/>`).join('')}
  <line x1="154" y1="140" x2="226" y2="140" stroke="#9aa3b5" stroke-width="2"/>
  ${tag(172,26,'Midiendo el clima','#1f9d6b',1.8)}`,
induccion:()=>`${[0,1,2,3,4,5].map(i=>`<ellipse cx="${120+i*12}" cy="84" rx="6" ry="26" fill="none" stroke="#c97c2b" stroke-width="4"/>`).join('')}
  <g class="x-magnet"><rect x="40" y="72" width="34" height="24" fill="#e5484d"/><rect x="74" y="72" width="34" height="24" fill="#2f6fde"/><text x="57" y="89" text-anchor="middle" style="font-size:12px;font-weight:900;fill:#fff">N</text><text x="91" y="89" text-anchor="middle" style="font-size:12px;font-weight:900;fill:#fff">S</text></g>
  ${[0,1,2].map(i=>`<path class="x-fade" style="--d:${.4+i*.2}s" d="M60,${70-i*8} q40,-${26+i*10} 80,0" fill="none" stroke="#9aa3b5" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('')}
  <path d="M186,84 h16 v-34 M186,84 v30 h16" fill="none" stroke="#5b6577" stroke-width="2"/>
  <circle class="x-glow" cx="210" cy="40" r="18" fill="#ffd166"/><circle cx="210" cy="40" r="12" fill="#fff6d1" stroke="#9aa3b5" stroke-width="2"/><rect x="204" y="52" width="12" height="10" rx="2" fill="#7d8696"/>
  ${tag(120,140,'Energía limpia','#1f9d6b',2)}`,
insectos:()=>`<rect x="20" y="30" width="110" height="110" rx="4" fill="#fffdf6" stroke="#c9bfae" stroke-width="2"/>
  <g pathLength="1" fill="none" stroke="#3a4253" stroke-width="2"><ellipse pathLength="1" class="x-draw" style="--t:1s" cx="75" cy="94" rx="14" ry="22"/><circle pathLength="1" class="x-draw" style="--t:.6s;--d:.8s" cx="75" cy="64" r="9"/>
   <path pathLength="1" class="x-draw" style="--t:1s;--d:1.2s" d="M62,84 l-18,-8 M62,96 l-20,2 M62,108 l-16,10 M88,84 l18,-8 M88,96 l20,2 M88,108 l16,10 M71,56 l-6,-12 M79,56 l6,-12"/></g>
  <g class="x-mv" style="--x0:0px;--y0:0px;--x1:-30px;--y1:30px;--t:1.6s;--d:.2s"><rect x="112" y="20" width="6" height="40" rx="2" fill="#f2b705" transform="rotate(35 115 40)"/><path d="M104,54 l4,8 l-8,-2z" fill="#3a4253"/></g>
  <circle cx="186" cy="80" r="32" fill="rgba(191,230,251,.4)" stroke="#173d7a" stroke-width="6"/><rect x="206" y="104" width="12" height="40" rx="6" fill="#173d7a" transform="rotate(-40 212 124)"/>
  <g transform="translate(186 80)"><ellipse cx="0" cy="4" rx="8" ry="12" fill="#1f9d6b"/><circle cx="0" cy="-10" r="5" fill="#1b2333"/><ellipse class="a-wl" style="transform-origin:0 0" cx="-10" cy="-2" rx="10" ry="5" fill="rgba(230,243,255,.9)" stroke="#9aa3b5"/><ellipse class="a-wr" style="transform-origin:0 0" cx="10" cy="-2" rx="10" ry="5" fill="rgba(230,243,255,.9)" stroke="#9aa3b5"/></g>
  ${tag(170,140,'El lente del arte','#1f9d6b',2.4)}`
};
const CSS=`
  .x-pop{transform:scale(0);transform-box:fill-box;transform-origin:center;animation:xpop .45s cubic-bezier(.3,1.6,.5,1) var(--d,0s) forwards}
  @keyframes xpop{to{transform:scale(1)}}
  .x-fade{opacity:0;animation:xfade .5s var(--d,0s) forwards} @keyframes xfade{to{opacity:1}}
  .x-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:xdraw var(--t,1.2s) var(--d,0s) ease-in-out forwards} @keyframes xdraw{to{stroke-dashoffset:0}}
  .x-loop{animation-iteration-count:infinite}
  .x-spin{animation:xspin var(--t,4s) linear infinite} @keyframes xspin{to{transform:rotate(360deg)}}
  .x-bob{animation:xbob 1.2s ease-in-out infinite alternate} @keyframes xbob{to{transform:translateY(-6px)}}
  .x-mv{transform:translate(var(--x0,0),var(--y0,0));animation:xmv var(--t,2s) var(--d,0s) ease-in-out forwards} @keyframes xmv{to{transform:translate(var(--x1,0),var(--y1,0))}}
  .x-grow{transform:scale(0);transform-box:view-box;animation:xgrow 1s var(--d,0s) cubic-bezier(.3,1.3,.5,1) forwards} @keyframes xgrow{to{transform:scale(1)}}
  .x-wl,.x-wr{transform-box:fill-box;animation:flap .45s ease-in-out infinite alternate} .x-wl{transform-origin:right center} .x-wr{transform-origin:left center}
  .x-bal{transform-box:view-box;transform-origin:120px 55px;transform:rotate(-14deg);animation:xbal 2.6s .4s ease-in-out forwards}
  @keyframes xbal{30%{transform:rotate(10deg)}60%{transform:rotate(-5deg)}100%{transform:rotate(0)}}
  .x-ring2{opacity:0;animation:xring 1.2s var(--d,0s) ease-out infinite} @keyframes xring{0%{opacity:0}40%{opacity:1}100%{opacity:0}}
  .x-slide{transform:translateX(0);animation:xslide 3.2s .3s ease-in-out forwards} @keyframes xslide{to{transform:translateX(166px)}}
  .x-run{transform-box:fill-box;transform-origin:top center;animation:xrun .25s linear infinite alternate} .x-run2{transform-box:fill-box;transform-origin:top center;animation:xrun .25s .12s linear infinite alternate-reverse}
  @keyframes xrun{from{transform:rotate(-30deg)}to{transform:rotate(30deg)}}
  .x-needle{transform-box:view-box;transform-origin:190px 62px;transform:rotate(60deg);animation:xneedle 3s .6s ease-in-out forwards} @keyframes xneedle{40%{transform:rotate(70deg)}100%{transform:rotate(-55deg)}}
  .x-door{transform-box:fill-box;transform-origin:left center;animation:xdoor 1s 2.3s ease-in-out forwards} @keyframes xdoor{to{transform:scaleX(.25)}}
  .x-flip{transform-box:view-box;animation:xflip 1.2s 1s ease-in-out forwards} @keyframes xflip{to{transform:rotate(180deg)}}
  .x-stamp{transform:translate(150px,10px);animation:xstamp 3s .2s ease-in-out forwards}
  @keyframes xstamp{0%{transform:translate(150px,10px)}15%{transform:translate(49px,40px)}25%{transform:translate(49px,10px)}40%{transform:translate(93px,34px)}50%{transform:translate(93px,8px)}65%{transform:translate(137px,40px)}75%{transform:translate(137px,10px)}100%{transform:translate(190px,104px)}}
  .x-shrink{transform-box:fill-box;transform-origin:left center;animation:xshrink 2.4s 1.2s ease-in-out forwards} @keyframes xshrink{to{transform:scaleX(.3);fill:#1f9d6b}}
  .x-bee{transform:translate(20px,40px);animation:xbee 4s ease-in-out infinite} @keyframes xbee{25%{transform:translate(60px,56px)}50%{transform:translate(130px,48px)}75%{transform:translate(200px,58px)}100%{transform:translate(20px,40px)}}
  .x-rocket{animation:xrocket 2.6s .9s ease-in forwards} @keyframes xrocket{0%{transform:translate(0,0)}100%{transform:translate(0,-170px)}}
  .x-spray{opacity:0;animation:xfade .2s .9s forwards}
  .x-pump{animation:xpump .3s linear 3 alternate} @keyframes xpump{to{transform:translateY(8px)}}
  .x-magnet{animation:xmag 1.2s ease-in-out infinite alternate} @keyframes xmag{to{transform:translateX(44px)}}
  .x-glow{opacity:.15;animation:xglow 1.2s ease-in-out infinite alternate} @keyframes xglow{to{opacity:.95}}
  @keyframes xup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}}
  @keyframes xshake{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:translateX(0)}}
`;
(()=>{ const st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st); })();

window.tituloA=tituloA;
window.completarProgramacion=completarProgramacion;
window.ActSTEM={ clave:claveDe, svg:k=>SV[k]?SV[k]():'', tiene:k=>!!SV[k], claves:Object.keys(SV) };
})();
