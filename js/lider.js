/* =====================================================================
   STEM Day · Líder de estación (v28)
   1) Avatar exclusivo por área: liderSVG(cfg, L, pose, t)
      L = { area:'tec'|'mat'|'cie', atu, cab, mano, comp, est:bool, efe:[0..2] }
      Se guarda dentro del avatar del líder como avatar.lid
   2) Pantallas del perfil Líder (Mi estación, Rotaciones) y utilidades de líderes
   Requiere avatar.js (avatarPose, PAL).
   ===================================================================== */
const LID_AREA={cie:'#1f9d6b',mat:'#2f6fde',tec:'#7b4bd6'};
const LID_AREA_N={tec:'Tecnología',mat:'Matemáticas',cie:'Ciencias'};
const LID_ATU=['Ninguno','Capa del área','Chaleco del área','Chaqueta de explorador','Traje espacial'];
const LID_EFE=['Aura del área','Pedestal con nombre','Destellos'];
const LID_KIT={
  tec:{cab:['Ninguno','Gafas de realidad virtual','Casco con linterna','Audífonos con micrófono','Antenas'],
       mano:['Nada','Tablet','Laptop','Control de dron','Destornillador','Placa de circuitos'],
       comp:['Ninguno','Robot','Dron','Holograma','Satélite'], est:'Código </>', vest:['#2a3550','#5ef0ff']},
  mat:{cab:['Ninguno','Birrete','Gorro con π','Lápiz en la oreja','Corona de estrellas'],
       mano:['Nada','Compás','Escuadra','Calculadora','Transportador','Cubo de Rubik'],
       comp:['Ninguno','Símbolo π','Cubo geométrico','Búho sabio','Infinito ∞'], est:'Símbolo π', vest:['#1e3a8a','#f2b705']},
  cie:{cab:['Ninguno','Sombrero de explorador','Casco espacial','Corona de hojas','Flor en el cabello'],
       mano:['Nada','Matraz','Lupa','Tubo de ensayo','Planta','Microscopio'],
       comp:['Ninguno','Mariposa','Planeta Tierra','ADN','Átomo'], est:'Hoja', vest:['#5b7f2a','#e9d8a6']}
};
const _O='#2b2b3a', _st='stroke="#2b2b3a" stroke-width="1.3" stroke-linejoin="round"';
function _star(x,y,r,f){let p='';for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2,rr=i%2?r*.45:r;p+=(i?'L':'M')+(x+Math.cos(a)*rr).toFixed(1)+','+(y+Math.sin(a)*rr).toFixed(1);}return `<path d="${p}Z" fill="${f}" stroke="${_O}" stroke-width="1"/>`;}
const LID_DEFS=`<defs>${Object.entries(LID_AREA).map(([k,v])=>`<radialGradient id="aura_${k}"><stop offset="0" stop-color="${v}" stop-opacity=".55"/><stop offset=".6" stop-color="${v}" stop-opacity=".18"/><stop offset="1" stop-color="${v}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;

/* ---------- piezas ---------- */
const _hy=-74;
const CAB={
 'Gafas de realidad virtual':c=>`<path d="M-17,${_hy-2} C-22,${_hy-4} -22,${_hy+4} -17,${_hy+4}" fill="none" stroke="${_O}" stroke-width="2.4"/><rect x="-16" y="${_hy-7}" width="32" height="13" rx="5" fill="#2a3550" ${_st}/><rect x="-13" y="${_hy-4.5}" width="26" height="8" rx="3" fill="${c}"/><path d="M-10,${_hy-2} h8 M3,${_hy-2} h7" stroke="#bff6ff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>`,
 'Casco con linterna':c=>`<path d="M-19,${_hy-5} C-19,${_hy-30} 19,${_hy-30} 19,${_hy-5}Z" fill="#f2c200" ${_st}/><rect x="-21" y="${_hy-7}" width="42" height="5" rx="2.5" fill="#f2c200" ${_st}/><circle cx="0" cy="${_hy-19}" r="5" fill="#fff8c4" ${_st}/><path d="M-4,${_hy-23} L-14,${_hy-40} L14,${_hy-40} L4,${_hy-23}Z" fill="#fff7a8" opacity=".45"/>`,
 'Audífonos con micrófono':c=>`<path d="M-17,${_hy-2} C-17,${_hy-27} 17,${_hy-27} 17,${_hy-2}" fill="none" stroke="#1b2333" stroke-width="3.2"/><rect x="-22" y="${_hy-8}" width="8" height="14" rx="4" fill="${c}" ${_st}/><rect x="14" y="${_hy-8}" width="8" height="14" rx="4" fill="${c}" ${_st}/><path d="M18,${_hy+4} Q18,${_hy+11} 6,${_hy+10}" fill="none" stroke="#1b2333" stroke-width="1.8"/><circle cx="5" cy="${_hy+10}" r="2.4" fill="#1b2333"/>`,
 'Antenas':c=>`<path d="M-8,${_hy-16} L-14,${_hy-32} M8,${_hy-16} L14,${_hy-32}" stroke="${_O}" stroke-width="1.8"/><circle cx="-14" cy="${_hy-34}" r="4" fill="${c}" ${_st}/><circle cx="14" cy="${_hy-34}" r="4" fill="#f2b705" ${_st}/>`,
 'Birrete':c=>`<rect x="-12" y="${_hy-23}" width="24" height="8" rx="2" fill="#1b2333" ${_st}/><path d="M0,${_hy-33} L26,${_hy-24} L0,${_hy-16} L-26,${_hy-24}Z" fill="#1b2333" ${_st}/><path d="M0,${_hy-24} L17,${_hy-20} L18,${_hy-9}" fill="none" stroke="#f2b705" stroke-width="1.6"/><circle cx="18" cy="${_hy-8}" r="2.2" fill="#f2b705"/>`,
 'Gorro con π':c=>`<path d="M-18,${_hy-5} C-18,${_hy-30} 18,${_hy-30} 18,${_hy-5}Z" fill="${c}" ${_st}/><rect x="-19" y="${_hy-9}" width="38" height="6" rx="3" fill="#1e3a8a" ${_st}/><circle cx="0" cy="${_hy-29}" r="3.5" fill="#f2b705" ${_st}/><text x="0" y="${_hy-12}" text-anchor="middle" style="font:900 11px Georgia,serif;fill:#fff">π</text>`,
 'Lápiz en la oreja':c=>`<g transform="translate(19,${_hy-4}) rotate(-35)"><rect x="-2.5" y="-14" width="5" height="22" fill="#f2c200" ${_st}/><rect x="-2.5" y="-17" width="5" height="4" rx="1" fill="#f28b82" ${_st}/><path d="M-2.5,8 L0,14 L2.5,8Z" fill="#e9cfa8" ${_st}/><path d="M-.8,12 L0,14 L.8,12Z" fill="#1b2333"/></g>`,
 'Corona de estrellas':c=>[-16,-8,0,8,16].map((x,i)=>_star(x,_hy-20-(i===2?7:i%2?4:0),i===2?6:4.5,i===2?'#f2b705':'#ffd84d')).join(''),
 'Sombrero de explorador':c=>`<ellipse cx="0" cy="${_hy-10}" rx="27" ry="5.5" fill="#c8a165" ${_st}/><path d="M-15,${_hy-11} C-15,${_hy-30} 15,${_hy-30} 15,${_hy-11}Z" fill="#c8a165" ${_st}/><rect x="-15" y="${_hy-16}" width="30" height="4" fill="#7a5a30"/>`,
 'Casco espacial':c=>`<circle cx="0" cy="${_hy}" r="24" fill="#bfe6ff" fill-opacity=".28" stroke="#dfe7f2" stroke-width="3"/><circle cx="0" cy="${_hy}" r="24" fill="none" stroke="${_O}" stroke-width="1.3"/><path d="M-14,${_hy-12} q6,-8 15,-8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><rect x="-16" y="${_hy+19}" width="32" height="6" rx="3" fill="#dfe7f2" ${_st}/>`,
 'Corona de hojas':c=>{let s='';for(let i=0;i<9;i++){const a=Math.PI*(1.08+i*0.105),x=Math.cos(a)*19,y=_hy-4+Math.sin(a)*19;s+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="5" ry="2.6" fill="${i%2?'#3f9b52':'#5cbf60'}" stroke="${_O}" stroke-width=".9" transform="rotate(${(a*180/Math.PI+90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;}return s;},
 'Flor en el cabello':c=>`<g transform="translate(13,${_hy-14})">${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-4.5" rx="3.2" ry="4.6" fill="#f7a1c4" ${_st} transform="rotate(${a})"/>`).join('')}<circle r="2.8" fill="#f2b705" ${_st}/></g>`
};
const MANO={
 'Tablet':c=>`<g transform="translate(19,-32) rotate(8)"><rect x="-7" y="-10" width="14" height="19" rx="2.5" fill="#2a3550" ${_st}/><rect x="-5" y="-8" width="10" height="13" rx="1" fill="${c}"/><path d="M-3,-1 l2,2 l4,-5" stroke="#fff" stroke-width="1.3" fill="none"/></g>`,
 'Laptop':c=>`<g transform="translate(20,-30)"><path d="M-10,-1 L10,-1 L13,5 L-13,5Z" fill="#9aa3b5" ${_st}/><rect x="-9" y="-15" width="18" height="14" rx="1.5" fill="#2a3550" ${_st}/><path d="M-6,-11 h7 M-6,-8 h10 M-6,-5 h5" stroke="${c==='#7b4bd6'?'#5ef0ff':c}" stroke-width="1.3"/></g>`,
 'Control de dron':c=>`<g transform="translate(19,-30)"><line x1="6" y1="-6" x2="9" y2="-16" stroke="${_O}" stroke-width="1.4"/><circle cx="9" cy="-17" r="1.6" fill="#e5484d"/><rect x="-9" y="-6" width="18" height="11" rx="4" fill="#1b2333" ${_st}/><circle cx="-4" cy="-.5" r="2.4" fill="#9aa3b5"/><circle cx="4" cy="-.5" r="2.4" fill="#9aa3b5"/><rect x="-2" y="-4.5" width="4" height="2" rx="1" fill="${c}"/></g>`,
 'Destornillador':c=>`<g transform="translate(18,-30) rotate(-30)"><rect x="-2.6" y="-1" width="5.2" height="10" rx="2.4" fill="#e5484d" ${_st}/><rect x="-.9" y="-14" width="1.8" height="13" fill="#c9ced8" stroke="${_O}" stroke-width=".8"/></g>`,
 'Placa de circuitos':c=>`<g transform="translate(20,-32) rotate(10)"><rect x="-9" y="-8" width="18" height="15" rx="1.5" fill="#1f8a5a" ${_st}/><rect x="-4" y="-4" width="7" height="6" fill="#1b2333"/><path d="M-9,-3 h5 M3,-1 h6 M-1,2 v5 M-6,4 h-3" stroke="#f2c200" stroke-width="1"/><circle cx="6" cy="-5" r="1.4" fill="#e5484d"/></g>`,
 'Compás':c=>`<g transform="translate(17,-34)"><circle cx="0" cy="-6" r="2.5" fill="#f2b705" ${_st}/><path d="M-1,-4 L-6,12 M1,-4 L6,12" stroke="#5b6577" stroke-width="2.2" stroke-linecap="round"/></g>`,
 'Escuadra':c=>`<g transform="translate(18,-30) rotate(-10)"><path d="M-8,8 L-8,-12 L10,8Z" fill="#f2c200" fill-opacity=".85" ${_st}/><path d="M-4,4 L-4,-3 L3,4Z" fill="#fff" ${_st}/></g>`,
 'Calculadora':c=>`<g transform="translate(19,-31) rotate(6)"><rect x="-7" y="-10" width="14" height="19" rx="2" fill="#2a3550" ${_st}/><rect x="-5" y="-8" width="10" height="4" fill="#bfe6c8"/>${[0,1,2].map(r=>[0,1,2].map(k=>`<rect x="${-5+k*3.6}" y="${-2+r*3.4}" width="2.6" height="2.4" rx=".5" fill="${k===2&&r===2?'#f2a900':'#dfe7f2'}"/>`).join('')).join('')}</g>`,
 'Transportador':c=>`<g transform="translate(19,-31)"><path d="M-10,4 A10,10 0 0 1 10,4Z" fill="#bfe6ff" fill-opacity=".8" ${_st}/>${[-60,-30,0,30,60].map(a=>`<line x1="0" y1="4" x2="${(Math.sin(a*Math.PI/180)*8).toFixed(1)}" y2="${(4-Math.cos(a*Math.PI/180)*8).toFixed(1)}" stroke="#2f6fde" stroke-width=".8"/>`).join('')}</g>`,
 'Cubo de Rubik':c=>`<g transform="translate(19,-31)"><path d="M0,-9 L9,-4.5 L0,0 L-9,-4.5Z" fill="#f2c200" ${_st}/><path d="M-9,-4.5 L0,0 L0,10 L-9,5.5Z" fill="#e5484d" ${_st}/><path d="M9,-4.5 L0,0 L0,10 L9,5.5Z" fill="#2f6fde" ${_st}/><path d="M-4.5,-6.75 L4.5,-2.25 M4.5,-6.75 L-4.5,-2.25 M-4.5,-2.2 L-4.5,7.8 M4.5,-2.2 L4.5,7.8 M-9,.5 L0,5 L9,.5" stroke="${_O}" stroke-width=".7" fill="none"/></g>`,
 'Matraz':c=>`<g transform="translate(18,-30) rotate(10)"><path d="M-2.5,-14 h5 v6 l6,12 a3,3 0 0 1 -3,4 h-11 a3,3 0 0 1 -3,-4 l6,-12z" fill="#e8f6ff" ${_st}/><path d="M-6.5,-1 l13,0 l2,4 a3,3 0 0 1 -3,4 h-11 a3,3 0 0 1 -3,-4z" fill="#32d27a"/><circle cx="1" cy="-17" r="1.6" fill="#32d27a" opacity=".8"/></g>`,
 'Lupa':c=>`<g transform="translate(17,-28) rotate(-25)"><rect x="-1.6" y="0" width="3.2" height="12" rx="1.5" fill="#7a5a30" ${_st}/><circle cx="0" cy="-6" r="7" fill="#d9f1ff" fill-opacity=".7" stroke="${_O}" stroke-width="2.2"/></g>`,
 'Tubo de ensayo':c=>`<g transform="translate(19,-32) rotate(20)"><rect x="-3.2" y="-13" width="6.4" height="20" rx="3.2" fill="#e8f6ff" ${_st}/><rect x="-2.4" y="-2" width="4.8" height="8.4" rx="2.4" fill="#e5484d" opacity=".85"/><circle cx="0" cy="-16" r="1.3" fill="#e5484d" opacity=".7"/><rect x="-4.2" y="-14" width="8.4" height="2.4" rx="1" fill="#c9ced8" ${_st}/></g>`,
 'Planta':c=>`<g transform="translate(19,-30)"><path d="M-6,0 L6,0 L4.5,9 L-4.5,9Z" fill="#c4683a" ${_st}/><path d="M0,0 C0,-6 -2,-10 -7,-12 C-5,-7 -3,-5 0,-3 M0,0 C0,-7 3,-12 8,-13 C6,-8 4,-5 0,-2" fill="#4caf50" ${_st}/></g>`,
 'Microscopio':c=>`<g transform="translate(20,-28)"><rect x="-8" y="6" width="16" height="3.5" rx="1" fill="#5b6577" ${_st}/><path d="M4,6 C8,0 8,-8 3,-12" fill="none" stroke="#5b6577" stroke-width="3"/><rect x="-4" y="-16" width="5" height="12" rx="1.5" fill="#dfe7f2" ${_st} transform="rotate(-20 -1.5 -10)"/><rect x="-6" y="1" width="10" height="2" fill="#9aa3b5"/></g>`
};
const COMP={
 'Robot':(c,t)=>`<line x1="0" y1="-12" x2="0" y2="-17" stroke="${_O}" stroke-width="1.3"/><circle cx="0" cy="-18" r="2.3" fill="#e5484d" stroke="${_O}"/><rect x="-10" y="-12" width="20" height="16" rx="5" fill="#dfe7f2" ${_st}/><rect x="-7" y="-8" width="14" height="8" rx="3" fill="#1b2333"/><circle cx="-3" cy="-4" r="1.7" fill="#5ef0ff"/><circle cx="3" cy="-4" r="1.7" fill="#5ef0ff"/><path d="M-6,7 h12" stroke="${c}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
 'Dron':(c,t)=>`<rect x="-8" y="-3" width="16" height="7" rx="3" fill="#2a3550" ${_st}/><circle cx="0" cy="1" r="1.8" fill="#5ef0ff"/><path d="M-8,-1 L-14,-6 M8,-1 L14,-6" stroke="${_O}" stroke-width="1.4"/><ellipse cx="-14" cy="-7" rx="${(6*Math.abs(Math.cos(t*14))+1).toFixed(1)}" ry="1.4" fill="#9aa3b5"/><ellipse cx="14" cy="-7" rx="${(6*Math.abs(Math.sin(t*14))+1).toFixed(1)}" ry="1.4" fill="#9aa3b5"/>`,
 'Holograma':(c,t)=>`<ellipse cx="0" cy="10" rx="9" ry="2.5" fill="#5ef0ff" opacity=".5"/><path d="M-7,9 L-5,-8 L5,-8 L7,9Z" fill="#5ef0ff" opacity=".18"/><g transform="rotate(${(t*60%360).toFixed(0)} 0 -2)"><rect x="-6" y="-8" width="12" height="12" fill="none" stroke="#2ad4ff" stroke-width="1.4"/><path d="M-6,-8 L0,-12 L12,-12 L6,-8 M6,4 L12,0 L12,-12" fill="none" stroke="#2ad4ff" stroke-width="1"/></g>`,
 'Satélite':(c,t)=>`<g transform="rotate(${(Math.sin(t)*15).toFixed(1)})"><rect x="-5" y="-5" width="10" height="10" rx="2" fill="#dfe7f2" ${_st}/><rect x="-17" y="-3.5" width="10" height="7" fill="#2f6fde" ${_st}/><rect x="7" y="-3.5" width="10" height="7" fill="#2f6fde" ${_st}/><path d="M0,-5 L0,-10" stroke="${_O}" stroke-width="1.2"/><circle cx="0" cy="-11" r="1.8" fill="#e5484d"/></g>`,
 'Símbolo π':(c,t)=>`<circle r="11" fill="#fff4cc" ${_st}/><text x="0" y="6" text-anchor="middle" style="font:900 17px Georgia,serif;fill:#1e3a8a">π</text>`,
 'Cubo geométrico':(c,t)=>{const a=t*1.2,P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([x,y,z])=>{const X=x*Math.cos(a)-z*Math.sin(a),Z=x*Math.sin(a)+z*Math.cos(a),Y=y*Math.cos(.5)-Z*Math.sin(.5);return [X*7,Y*7];});const E=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];return E.map(([i,j])=>`<line x1="${P[i][0].toFixed(1)}" y1="${P[i][1].toFixed(1)}" x2="${P[j][0].toFixed(1)}" y2="${P[j][1].toFixed(1)}" stroke="${c}" stroke-width="1.6"/>`).join('')+P.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.5" fill="#f2b705"/>`).join('');},
 'Búho sabio':(c,t)=>`<ellipse cx="0" cy="0" rx="10" ry="12" fill="#a0703f" ${_st}/><ellipse cx="0" cy="3" rx="6" ry="7" fill="#e9cfa8"/><circle cx="-4" cy="-4" r="4.3" fill="#fff" stroke="${_O}"/><circle cx="4" cy="-4" r="4.3" fill="#fff" stroke="${_O}"/><circle cx="-4" cy="-4" r="2" fill="#1b2333"/><circle cx="4" cy="-4" r="2" fill="#1b2333"/><path d="M-1.6,0 l1.6,2.6 l1.6,-2.6z" fill="#f2a900"/><path d="M-9,-13 L9,-13 L0,-17Z" fill="#1b2333"/>`,
 'Infinito ∞':(c,t)=>`<path d="M0,0 C-4,-7 -13,-7 -13,0 C-13,7 -4,7 0,0 C4,-7 13,-7 13,0 C13,7 4,7 0,0Z" fill="none" stroke="#f2b705" stroke-width="4"/><path d="M0,0 C-4,-7 -13,-7 -13,0 C-13,7 -4,7 0,0 C4,-7 13,-7 13,0 C13,7 4,7 0,0Z" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="6 40" stroke-dashoffset="${(-t*40%46).toFixed(0)}"/>`,
 'Mariposa':(c,t)=>{const k=.35+.65*Math.abs(Math.sin(t*7));return `<g transform="scale(${k.toFixed(2)},1)"><path d="M0,0 C-6,-12 -16,-10 -13,-1 C-15,6 -6,9 0,2Z" fill="#f2a900" ${_st}/><path d="M0,0 C6,-12 16,-10 13,-1 C15,6 6,9 0,2Z" fill="#f2a900" ${_st}/><circle cx="-8" cy="-4" r="2" fill="#e5484d"/><circle cx="8" cy="-4" r="2" fill="#e5484d"/></g><rect x="-1" y="-6" width="2" height="12" rx="1" fill="#1b2333"/>`;},
 'Planeta Tierra':(c,t)=>`<circle r="10" fill="#2f8fdd" ${_st}/><path d="M-6,-5 C-2,-8 1,-4 -2,-1 C-5,1 -8,-1 -6,-5Z M2,2 C6,0 8,4 5,7 C2,8 0,5 2,2Z M3,-8 C6,-8 7,-5 4,-5Z" fill="#4caf50"/><ellipse rx="15" ry="4" fill="none" stroke="#f2b705" stroke-width="1.4" transform="rotate(-18)"/>`,
 'ADN':(c,t)=>{let s='';for(let i=0;i<9;i++){const y=-12+i*3,ph=t*3+i*.7,x=Math.sin(ph)*7;s+=`<line x1="${x.toFixed(1)}" y1="${y}" x2="${(-x).toFixed(1)}" y2="${y}" stroke="#c9ced8" stroke-width="1"/><circle cx="${x.toFixed(1)}" cy="${y}" r="1.8" fill="#1f9d6b"/><circle cx="${(-x).toFixed(1)}" cy="${y}" r="1.8" fill="#e5484d"/>`;}return s;},
 'Átomo':(c,t)=>`<g transform="rotate(${(t*40%360).toFixed(0)})"><ellipse rx="13" ry="5" fill="none" stroke="${c}" stroke-width="1.6"/><ellipse rx="13" ry="5" fill="none" stroke="#2f6fde" stroke-width="1.6" transform="rotate(60)"/><ellipse rx="13" ry="5" fill="none" stroke="#e5484d" stroke-width="1.6" transform="rotate(120)"/><circle r="3.3" fill="#f2b705" ${_st}/></g>`
};
const EST={tec:`<text x="6" y="-40" text-anchor="middle" style="font:900 6px monospace;fill:#5ef0ff">&lt;/&gt;</text>`,
           mat:`<text x="6" y="-38.5" text-anchor="middle" style="font:900 9px Georgia,serif;fill:#f2b705">π</text>`,
           cie:`<path d="M2,-38 C2,-45 8,-47 11,-47 C11,-42 8,-38 2,-38Z M2,-38 L8,-44" fill="#5cbf60" stroke="#fff" stroke-width=".8"/>`};

function liderSVG(base,L,pose,t){
  L=Object.assign({area:'cie',atu:0,cab:0,mano:0,comp:0,est:false,efe:[]},L||{}); pose=pose||{}; t=t||0;
  const col=LID_AREA[L.area], K=LID_KIT[L.area], c=Object.assign({},avatarNormal(base));
  const back=pose.dir==='b';
  c.extra=(c.extra||[]).filter(x=>x!==2);
  if(L.atu===4){c.top=PAL.indexOf('#dfe7f2')>=0?PAL.indexOf('#dfe7f2'):6;c.bot=c.top;c.shoe=1;c.style=0;}
  if(L.atu===3){const i=PAL.indexOf('#c8a165'); if(i>=0) c.top=i;}
  if(L.atu===2) c.extra=[...c.extra,2];
  let s='';
  if(L.efe.includes(0)) s+=LID_DEFS+`<circle cx="0" cy="-48" r="50" fill="url(#aura_${L.area})"/>`;
  if(L.efe.includes(1)) s+=`<ellipse cx="0" cy="3" rx="30" ry="8" fill="#f2b705" ${_st}/><path d="M-30,3 v8 a30,8 0 0 0 60,0 v-8 a30,8 0 0 1 -60,0z" fill="#c98f00" ${_st}/><text x="0" y="14" text-anchor="middle" style="font:900 6.5px system-ui;fill:#fff;letter-spacing:.5px">LÍDER</text>`;
  if(L.atu===1&&!back) s+=`<path d="M-13,-57 Q0,-60 13,-57 L24,-6 Q0,2 -24,-6Z" fill="${col}" ${_st}/><path d="M9,-57 L24,-6 Q16,-3 10,-2 Z" fill="#000" opacity=".15"/>`;
  let body=avatarPose(c,pose);
  if(L.atu===2) body=body.split('#ff7a1a').join(K.vest[0]).split('#e8f04a').join(K.vest[1]).replace('>STAFF<','>LÍDER<');
  s+=body;
  if(L.atu===1&&back) s+=`<path d="M-15,-58 Q0,-62 15,-58 L25,-4 Q0,4 -25,-4Z" fill="${col}" ${_st}/><text x="0" y="-30" text-anchor="middle" style="font:900 7px system-ui;fill:#fff">LÍDER</text>`;
  if(!back){
    if(L.est) s+=`<circle cx="6" cy="-42" r="5.6" fill="${L.area==='tec'?'#1b2333':L.area==='mat'?'#1e3a8a':'#2e6b3a'}" stroke="#fff" stroke-width=".8"/>`+EST[L.area];
    if(L.atu===3) s+=`<path d="M-5,-58 L0,-50 L5,-58" fill="#a8844e" ${_st}/><rect x="2" y="-46" width="8" height="7" rx="1.5" fill="#b8925a" stroke="${_O}" stroke-width="1"/>`;
    if(L.atu===4) s+=`<rect x="1" y="-52" width="11" height="9" rx="2" fill="#2a3550" stroke="${_O}" stroke-width="1"/><circle cx="4" cy="-47.5" r="1.4" fill="#e5484d"/><circle cx="8.5" cy="-47.5" r="1.4" fill="#2ecc71"/><rect x="-12" y="-36" width="24" height="3" fill="${col}"/>`;
    s+=`<g transform="translate(-8,-47)"><circle r="5.2" fill="#fff4cc" stroke="${_O}" stroke-width="1.2"/>${_star(0,0,3.8,'#f2b705')}</g>`;
  }
  const cab=K.cab[L.cab]; if(L.cab&&CAB[cab]&&!(back&&/Gafas|Flor/.test(cab))) s+=CAB[cab](col);
  else if(L.atu===4&&!back) s+=CAB['Casco espacial'](col);
  const mano=K.mano[L.mano]; if(L.mano&&MANO[mano]&&!back) s+=MANO[mano](col);
  const comp=K.comp[L.comp]; if(L.comp&&COMP[comp]){ const fy=Math.sin(t*2.2)*3.5; s+=`<g transform="translate(32,${(-92+fy).toFixed(1)})">${COMP[comp](col,t)}</g>`; }
  if(L.efe.includes(2)) s+=[[-30,-100],[28,-40],[-34,-30],[24,-112]].map((p,i)=>`<g style="opacity:${(.35+.65*Math.abs(Math.sin(t*2+i))).toFixed(2)}">${_star(p[0],p[1],3.5,'#ffe066')}</g>`).join('');
  return s;
}
if(typeof PAL!=='undefined'){ ['#c8a165','#dfe7f2'].forEach(x=>{ if(!PAL.includes(x)) PAL.push(x); }); }

/* avatar de cualquier perfil: si es líder, con sus piezas exclusivas */
function avatarAny(cfg,pose,t){ return cfg&&cfg.lid ? liderSVG(cfg,cfg.lid,pose,t==null?performance.now()/1000:t) : avatarPose(cfg,pose); }
window.avatarAny=avatarAny;

/* =====================================================================
   Perfil «Líder de estación» (v28)
   Mi estación · Rotaciones · Programa · Avatar · Más
   Usa los globales de app.js (S, $, ahora, toMin, fmtHora, escHTML, toast…)
   ===================================================================== */
const LIDE={ sal:null, rsal:'*', raf:0, t0:performance.now() };
function filasLider(){ return S.prog.filter(r=>r.tipo==='actividad'&&Array.isArray(r.lideres)&&r.lideres.includes(S.perfil.id)).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio)||String(a.curso).localeCompare(b.curso,'es',{numeric:true})); }
function salKeyL(x){ return String(x||'Por definir').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim(); }
function salonesLider(fs){ const m=new Map(); (fs||filasLider()).forEach(r=>{ const k=salKeyL(r.salon); if(!m.has(k)) m.set(k,r.salon||'Por definir'); }); return [...m.values()]; }
function letraLider(fs,sal){ const c={}; fs.filter(r=>salKeyL(r.salon)===salKeyL(sal)).forEach(r=>{ const l=String(r.curso||'').slice(-1).toUpperCase(); c[l]=(c[l]||0)+1; }); return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||''; }
function areaLider(fs){ const c={}; (fs||filasLider()).forEach(r=>{ if(['tec','mat','cie'].includes(r.categoria)) c[r.categoria]=(c[r.categoria]||0)+1; }); return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||'cie'; }
function minAhora(){ const a=ahora(), fe=S.config.fecha_evento; return a.fecha<fe?-1:a.fecha>fe?9999:a.min; }
/* franjas (hora de inicio) en las que el líder recibe cursos */
function franjasLider(fs){ const g={}; fs.forEach(r=>{ (g[r.hora_inicio]=g[r.hora_inicio]||[]).push(r); }); return Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0])).map(([h,rs])=>({h,f:rs[0].hora_fin,rs})); }
function nombreAct(r){ return r.titulo?titA(r.titulo):(r.area||''); }
const lidNom=n=>{ const p=String(n||'').trim().split(/\s+/); return p.length>=3?p[2]+' '+p[0]:n||''; };

/* ---------- escena del salón (vista de frente) ---------- */
function lineasTablero(t){ const w=String(t||'').split(/\s+/), out=['']; w.forEach(x=>{ const l=out[out.length-1]; if((l+' '+x).trim().length>24&&l) out.push(x); else out[out.length-1]=(l+' '+x).trim(); }); if(out.length>2){ out[1]=out.slice(1).join(' ').slice(0,23)+'…'; out.length=2; } return out; }
/* v30 · el escenario cambia según el lugar: aula, laboratorio de química (143 y 144), laboratorio de microbiología (138),
   Aula de Cristal (paredes de vidrio) y Coliseo (cancha con los espacios A–H) */
function tipoLugar(salon){ const k=String(salon||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  if(/^14[34]\b/.test(k)) return 'quim'; if(/^138\b/.test(k)) return 'micro'; if(/cristal/.test(k)) return 'cristal'; if(/coliseo/.test(k)) return 'coliseo'; return 'aula'; }
const _desks=()=>[[62,208],[132,208],[202,208],[272,208],[40,256],[118,256],[198,256],[276,256]].map(([x,y],i)=>`<g><rect x="${x-26}" y="${y-12}" width="52" height="14" rx="3" fill="#e8d6b5" stroke="#a88a5c"/><rect x="${x-22}" y="${y+2}" width="4" height="14" fill="#a88a5c"/><rect x="${x+18}" y="${y+2}" width="4" height="14" fill="#a88a5c"/><rect x="${x-14}" y="${y-18}" width="7" height="7" rx="1.5" fill="${['#e5484d','#2f6fde','#f2a900','#7b4bd6'][i%4]}"/></g>`).join('');
function _tablero(titulo,area,x,w){ x=x||72; w=w||196; const cx=x+w/2;
  return `<rect x="${x}" y="28" width="${w}" height="90" rx="5" fill="#1f5b46" stroke="#7a5a30" stroke-width="5"/>`+
   lineasTablero(titulo).map((l,i,arr)=>`<text x="${cx}" y="${(arr.length>1?54:62)+i*16}" text-anchor="middle" style="font:800 ${w<180?11:12.5}px system-ui;fill:#fff">${escHTML(l)}</text>`).join('')+
   `<text x="${cx}" y="96" text-anchor="middle" style="font:700 10px system-ui;fill:#ffe9a6">${escHTML(LID_AREA_N[area]||'')} · ¡Bienvenidos!</text>`; }
function _piso(){ return `<rect width="340" height="290" fill="#f4efe6"/><rect width="340" height="146" fill="#e9eef7"/><rect y="142" width="340" height="6" fill="#c9d2e3"/><path d="M0,148 L340,148 L340,290 L0,290Z" fill="#d8c4a3"/>${Array.from({length:9},(_,i)=>`<path d="M${i*40-20},290 L${170+(i*40-180)*.35},148" stroke="#c7b08b"/>`).join('')}`; }
const _pill=(sal,col)=>`<rect x="283" y="14" width="52" height="14" rx="7" fill="${col}"/><text x="309" y="24.5" text-anchor="middle" style="font:800 8.5px system-ui;fill:#fff">${escHTML(String(sal||'').slice(0,18))}</text>`;
function _mesaLab(y,micro){ let s=`<rect x="18" y="${y}" width="304" height="16" rx="3" fill="#2b3446"/><rect x="24" y="${y+16}" width="292" height="26" fill="#9aa3b5"/>${[60,130,200,270].map(x=>`<rect x="${x-14}" y="${y+20}" width="28" height="18" rx="2" fill="#b7bfcd" stroke="#8a94a8"/><circle cx="${x}" cy="${y+29}" r="1.6" fill="#5b6577"/>`).join('')}`;
  [40,95,150,205,260,305].forEach((x,i)=>{ if(micro){ if(i%2===0) s+=`<g transform="translate(${x},${y-2})"><rect x="-9" y="-2" width="18" height="3" fill="#5b6577"/><path d="M4,-2 C9,-10 9,-18 3,-22" fill="none" stroke="#5b6577" stroke-width="3"/><rect x="-5" y="-26" width="6" height="15" rx="2" fill="#dfe7f2" stroke="#5b6577" transform="rotate(-18 -2 -18)"/><rect x="-6" y="-8" width="10" height="2" fill="#9aa3b5"/></g>`;
      else s+=`<ellipse cx="${x-6}" cy="${y-1}" rx="7" ry="2.4" fill="#f6e7ff" stroke="#b083d6"/><ellipse cx="${x+6}" cy="${y-1}" rx="7" ry="2.4" fill="#e8ffe9" stroke="#7fc98a"/><circle cx="${x-7}" cy="${y-1.4}" r="1.1" fill="#b083d6"/><circle cx="${x+5}" cy="${y-1.6}" r="1" fill="#2e9d4a"/>`; }
    else { const c=['#32d27a','#2f8fdd','#e5484d','#f2a900','#b083d6','#32d27a'][i]; s+=i%2?`<g transform="translate(${x},${y})"><path d="M-3,-16 h6 v6 l6,9 a2,2 0 0 1 -2,3 h-14 a2,2 0 0 1 -2,-3 l6,-9z" fill="#eaf6ff" stroke="#8aa0bf"/><path d="M-7,-4 h14 l2,3 a2,2 0 0 1 -2,3 h-14 a2,2 0 0 1 -2,-3z" fill="${c}"/></g>`:`<g transform="translate(${x},${y})"><rect x="-6" y="-14" width="5" height="14" rx="2" fill="#eaf6ff" stroke="#8aa0bf"/><rect x="-5.5" y="-7" width="4" height="7" rx="2" fill="${c}"/><rect x="2" y="-12" width="5" height="12" rx="2" fill="#eaf6ff" stroke="#8aa0bf"/><rect x="2.5" y="-5" width="4" height="5" rx="2" fill="${['#f2a900','#2f8fdd','#e5484d'][i%3]}"/><path d="M10,-2 q2,-8 0,-14" stroke="#cfd8e6" stroke-width="2" fill="none" opacity=".7"/></g>`; } });
  [50,110,170,230,290].forEach(x=>{ s+=`<g><rect x="${x-8}" y="${y+46}" width="16" height="4" rx="2" fill="#1b2333"/><rect x="${x-1.5}" y="${y+50}" width="3" height="16" fill="#5b6577"/><rect x="${x-7}" y="${y+64}" width="14" height="2.5" rx="1" fill="#5b6577"/></g>`; });
  return s; }
function escenaEstacion(titulo,salon,area,letra){
  const col=LID_AREA[area]||'#1f9d6b', tipo=tipoLugar(salon);
  LIDE.esc={ lid:[58,238,1.12], ent:[300,160], dst:[220,220], k:.78 };
  if(tipo==='coliseo') return escenaColiseo(titulo,salon,letra);
  let s=`<svg viewBox="0 0 340 290" class="estsc">${LID_DEFS}${_piso()}`;
  if(tipo==='aula'||tipo==='cristal'){
    if(tipo==='cristal'){   // todas las paredes de vidrio: se ve el exterior
      s+=`<rect width="340" height="146" fill="#cfeaff"/><path d="M0,112 C40,96 80,104 120,98 C170,90 210,104 260,96 C300,90 320,100 340,96 L340,146 L0,146Z" fill="#8fc77a"/>`+
        [20,75,250,310].map((x,i)=>`<circle cx="${x}" cy="${88+i%2*6}" r="${16+i%3*3}" fill="#4caf50" opacity=".85"/><rect x="${x-2}" y="${100+i%2*6}" width="4" height="16" fill="#7a5a30"/>`).join('')+
        Array.from({length:9},(_,i)=>`<rect x="${i*42}" y="0" width="4" height="146" fill="#dfe7f2" opacity=".95"/>`).join('')+`<rect y="70" width="340" height="3" fill="#dfe7f2"/><rect width="340" height="146" fill="#ffffff" opacity=".12"/>
        <path d="M10,10 L40,60 M210,10 L250,70 M300,20 L330,70" stroke="#fff" stroke-width="3" opacity=".55"/>`;
      s+=`<path d="M0,148 L0,290" stroke="#b9d9f5" stroke-width="10" opacity=".7"/><path d="M340,148 L340,290" stroke="#b9d9f5" stroke-width="10" opacity=".7"/>`;
    } else s+=`<rect x="14" y="26" width="44" height="64" rx="3" fill="#bfe1ff" stroke="#8aa0bf" stroke-width="3"/><line x1="36" y1="26" x2="36" y2="90" stroke="#8aa0bf" stroke-width="2"/><rect x="292" y="54" width="40" height="94" rx="3" fill="#a0703f" stroke="#7a5a30" stroke-width="2"/><circle cx="300" cy="102" r="2.5" fill="#f2b705"/>`;
    s+=_tablero(titulo,area)+_pill(salon,col)+_desks();
    if(tipo==='cristal') s+=`<rect x="6" y="6" width="70" height="16" rx="8" fill="#2f8fdd"/><text x="41" y="17" text-anchor="middle" style="font:800 8px system-ui;fill:#fff">AULA DE CRISTAL</text>`;
  } else {
    const micro=tipo==='micro';
    // pared del laboratorio: póster, tablero y (química) cabina de extracción o (micro) incubadora
    if(micro) s+=`<g transform="translate(16,30)"><rect width="50" height="62" rx="3" fill="#fff" stroke="#b083d6" stroke-width="2"/><ellipse cx="25" cy="30" rx="18" ry="14" fill="#f6e7ff" stroke="#b083d6"/><circle cx="21" cy="28" r="5" fill="#c79be6"/><circle cx="31" cy="34" r="2" fill="#7fc98a"/><circle cx="14" cy="36" r="1.6" fill="#7fc98a"/><text x="25" y="56" text-anchor="middle" style="font:800 6.5px system-ui;fill:#7b4bd6">LA CÉLULA</text></g>`;
    else s+=`<g transform="translate(14,30)"><rect width="54" height="40" rx="2" fill="#fff" stroke="#8aa0bf"/>${Array.from({length:36},(_,i)=>`<rect x="${3+(i%9)*5.4}" y="${4+Math.floor(i/9)*8}" width="4.6" height="6.6" fill="${['#ff9aa2','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#bdb2ff','#ffc6ff','#e0e0e0'][i%9]}"/>`).join('')}<text x="27" y="49" text-anchor="middle" style="font:800 6px system-ui;fill:#5b6577">TABLA PERIÓDICA</text></g>
      <g transform="translate(16,82)"><rect width="22" height="22" fill="#f2c200" transform="rotate(45 11 11)"/><text x="11" y="15" text-anchor="middle" style="font:900 12px system-ui;fill:#1b2333">!</text></g>`;
    s+=_tablero(titulo,area,82,176)+_pill(salon,col);
    if(micro) s+=`<g transform="translate(270,46)"><rect width="58" height="98" rx="4" fill="#f4f6fa" stroke="#9aa3b5" stroke-width="2"/><rect x="8" y="10" width="42" height="50" rx="3" fill="#dfe7f2" stroke="#9aa3b5"/>${[20,32,44].map(y=>`<line x1="10" y1="${y}" x2="48" y2="${y}" stroke="#9aa3b5"/>`).join('')}<ellipse cx="22" cy="18" rx="7" ry="2" fill="#e8ffe9" stroke="#7fc98a"/><ellipse cx="36" cy="30" rx="7" ry="2" fill="#f6e7ff" stroke="#b083d6"/><rect x="10" y="68" width="38" height="8" rx="2" fill="#1b2333"/><text x="29" y="74.5" text-anchor="middle" style="font:700 6px monospace;fill:#5ef0ff">37.0 °C</text><text x="29" y="90" text-anchor="middle" style="font:800 6px system-ui;fill:#5b6577">INCUBADORA</text></g>`;
    else s+=`<g transform="translate(268,30)"><rect width="62" height="114" rx="3" fill="#c9ced8" stroke="#8a94a8" stroke-width="2"/><rect x="6" y="8" width="50" height="10" fill="#8a94a8"/><rect x="6" y="24" width="50" height="44" fill="#d9f1ff" stroke="#8a94a8" opacity=".85"/><rect x="6" y="70" width="50" height="38" fill="#eef1f5" stroke="#8a94a8"/><path d="M18,62 h10 M34,54 v14" stroke="#32d27a" stroke-width="5" stroke-linecap="round"/><text x="31" y="15.5" text-anchor="middle" style="font:800 6px system-ui;fill:#fff">CAMPANA</text></g>`;
    s+=`<rect x="70" y="124" width="190" height="8" rx="2" fill="#a0703f"/>`+[90,120,150,180,210,240].map((x,i)=>`<rect x="${x-5}" y="${micro?110:108}" width="10" height="${micro?14:16}" rx="2" fill="${micro?['#f6e7ff','#e8ffe9'][i%2]:['#32d27a','#2f8fdd','#e5484d'][i%3]}" stroke="#8aa0bf"/>`).join('');
    s+=_mesaLab(176,micro)+_mesaLab(238,micro);
    s+=`<rect x="6" y="122" width="${micro?96:92}" height="16" rx="8" fill="${micro?'#7b4bd6':'#1f9d6b'}"/><text x="${micro?54:52}" y="133" text-anchor="middle" style="font:800 8px system-ui;fill:#fff">${micro?'LAB. MICROBIOLOGÍA':'LAB. DE QUÍMICA'}</text>`;
    LIDE.esc={ lid:[58,196,1.0], ent:[330,150], dst:[250,170], k:.72 };
  }
  return s+`<g class="eLid"></g><g class="eDoc"></g></svg>`;
}
/* Coliseo: la cancha vista desde arriba con los 8 espacios; se resalta el del líder */
function escenaColiseo(titulo,salon,letra){
  const Z=window.COL_Z||{}, L=String(letra||'').toUpperCase(), zc={};
  let s=`<svg viewBox="0 0 340 290" class="estsc">${LID_DEFS}<rect width="340" height="290" fill="#eef1f6"/>
    <rect x="78" y="6" width="176" height="14" rx="3" fill="#5b6577"/><text x="166" y="16" text-anchor="middle" style="font:800 8px system-ui;fill:#fff">TARIMA</text>
    <rect x="262" y="6" width="48" height="14" rx="3" fill="#a0703f"/><text x="286" y="16" text-anchor="middle" style="font:800 7px system-ui;fill:#fff">Teatro</text>
    <rect x="58" y="26" width="236" height="250" rx="6" fill="#ffe58a"/><rect x="72" y="38" width="208" height="226" rx="3" fill="#d8a86a" stroke="#3db5e6" stroke-width="3"/>
    ${Array.from({length:14},(_,i)=>`<line x1="${72+i*16}" y1="38" x2="${72+i*16}" y2="264" stroke="#c99a5c" stroke-width="1"/>`).join('')}
    <rect x="166" y="38" width="20" height="226" fill="#ffd640" opacity=".75"/>
    <rect x="8" y="60" width="40" height="80" rx="4" fill="#e5484d"/><text x="28" y="100" text-anchor="middle" transform="rotate(-90 28 100)" style="font:800 8px system-ui;fill:#fff">LOGÍSTICA</text>
    <rect x="8" y="150" width="40" height="80" rx="4" fill="#5b6577"/><text x="28" y="190" text-anchor="middle" transform="rotate(-90 28 190)" style="font:800 7px system-ui;fill:#fff">MATERIAL / VARIOS</text>`;
  'ABCDEFGH'.split('').forEach((l,k)=>{ const z=Z[l]||['','#999',''], r=Math.floor(k/2), c=k%2, x=c?190:78, y=44+r*55, w=86, h=48, mio=l===L; zc[l]=[x+w/2,y+h/2];
    s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${mio?z[1]:'#fff'}" opacity="${mio?1:.55}" stroke="${mio?'#fff':z[1]}" stroke-width="${mio?3:1.2}"/>
      <text x="${x+12}" y="${y+18}" style="font:900 16px system-ui;fill:${mio?'#fff':z[1]}">${l}</text><text x="${x+w-6}" y="${y+16}" text-anchor="end" style="font-size:12px">${z[2]}</text>
      <text x="${x+w/2}" y="${y+h-7}" text-anchor="middle" style="font:800 7.4px system-ui;fill:${mio?'#fff':'#5b6577'}">${escHTML(z[0])}</text>`; });
  s+=`<polyline points="22,284 64,270 64,32 120,32 300,32 300,24" fill="none" stroke="#6d3fc0" stroke-width="2.4" stroke-dasharray="6 4"/><polyline points="64,270 288,270 288,282 330,282" fill="none" stroke="#6d3fc0" stroke-width="2.4" stroke-dasharray="6 4"/>
    <rect x="4" y="270" width="76" height="16" rx="8" fill="#6d3fc0"/><text x="42" y="281" text-anchor="middle" style="font:800 7px system-ui;fill:#fff">Entrada · Av. 68</text>
    <rect x="296" y="36" width="42" height="26" rx="6" fill="#1f9d6b"/><text x="317" y="47" text-anchor="middle" style="font:800 6.5px system-ui;fill:#fff">Salida →</text><text x="317" y="56" text-anchor="middle" style="font:800 6.5px system-ui;fill:#fff">Media torta</text>
    <g class="eLid"></g><g class="eDoc"></g></svg>`;
  const c=zc[L]||[234,148]; LIDE.esc={ lid:[c[0]-22,c[1]+22,.5], ent:[24,282], dst:[c[0]+18,c[1]+18], k:.36, coliseo:true };
  return s;
}
const DOC_GEN={gender:0,skin:2,hair:0,hairC:0,style:1,top:0,bot:5,shoe:0,head:0,face:1,extra:[1]};
function animEstacion(){
  cancelAnimationFrame(LIDE.raf);
  const loop=()=>{ const sc=document.querySelector('#estPz .estsc'); if(!sc||S.panel!=='estacion'||document.hidden){ LIDE.raf=0; return; }
    const t=(performance.now()-LIDE.t0)/1000, av=S.perfil.avatar||{}, L=av.lid||{area:areaLider(),atu:1,est:true,efe:[]};
    const E=LIDE.esc||{lid:[58,238,1.12],ent:[300,160],dst:[220,220],k:.78}; const lg=sc.querySelector('.eLid'); if(lg) lg.innerHTML=`<g transform="translate(${E.lid[0]},${E.lid[1]}) scale(${E.lid[2]})">${liderSVG(av,L,{wave:(t%6)<1.6?(t%6)/1.6:0,blink:(t%4)<.12},t)}</g>`;
    const dg=sc.querySelector('.eDoc'), ll=LIDE.llega;
    if(dg){ if(ll){ const cyc=Math.min(t-ll.t0,6), k=Math.min(1,cyc/4); let s='';
        const [ex,ey]=E.ent,[dx,dy]=E.dst, kd=E.k||.78, ks=kd*.54, via=E.coliseo?[64,ey-8]:null;
        const at=q=>{ if(!via) return [ex+(dx-ex)*q,ey+(dy-ey)*q]; const q1=Math.min(1,q*2), q2=Math.max(0,q*2-1); return q<.5?[ex+(via[0]-ex)*q1,ey+(via[1]-ey)*q1]:[via[0]+(dx-via[0])*q2,via[1]+(dy-via[1])*q2]; };
        for(let i=0;i<3;i++){ const kk=Math.max(0,Math.min(1,(cyc-.7-i*.5)/4)); if(cyc>.7+i*.5){ const [px,py]=at(kk*(1-i*.08)); s+=`<g transform="translate(${(px+12+i*10).toFixed(1)},${(py-6+i*4).toFixed(1)}) scale(${ks})">${avatarPose({gender:i%2,skin:i,hair:i%3,hairC:i,style:2,top:[0,3,8][i],bot:5,shoe:1,extra:[]},{walk:kk<1?1:0,ph:t*9+i,dir:'f'})}</g>`; } }
        const [px,py]=at(k); s+=`<g transform="translate(${px.toFixed(1)},${py.toFixed(1)}) scale(${kd})">${avatarPose(DOC_GEN,{walk:k<1?1:0,ph:t*9,dir:'f',wave:k>=1?Math.min(1,(cyc-4)/2):0})}</g>`; dg.innerHTML=s; }
      else dg.innerHTML=''; }
    LIDE.raf=requestAnimationFrame(loop); };
  LIDE.raf=requestAnimationFrame(loop);
}

/* ---------- Mi estación ---------- */
async function cargarLlegadas(){ try{ const r=await S.sb.from('sd_llegadas').select('*'); if(!r.error){ S.llegadas={}; (r.data||[]).forEach(x=>S.llegadas[x.curso+'|'+String(x.hora_inicio).slice(0,5)]=x); } }catch(e){} }
function pintarEstacion(){
  const el=$('estPz'); const fs=filasLider();
  if(!fs.length){ el.innerHTML=`<div class="alertbox">Aún no tienes estaciones asignadas en la programación.<br><br>Cuando el administrador te asigne como líder de una actividad, aquí verás tu estación, los cursos que te llegan y el docente que acompaña a cada uno.</div>`; return; }
  const sal=salonesLider(fs); if(!LIDE.sal||!sal.includes(LIDE.sal)) LIDE.sal=null;
  const m=minAhora(), F=franjasLider(fs), cur=F.find(x=>toMin(x.h)<=m&&m<toMin(x.f)), nxt=F.find(x=>toMin(x.h)>m);
  const base=cur||nxt||F[F.length-1];
  if(!LIDE.sal) LIDE.sal=(base.rs[0].salon||'Por definir');
  const enSal=r=>salKeyL(r.salon)===salKeyL(LIDE.sal);
  const rCur=cur?cur.rs.filter(enSal):[], rNxt=nxt?nxt.rs.filter(enSal):[], r0=(rCur[0]||rNxt[0]||fs.find(enSal)||fs[0]);
  const area=['tec','mat','cie'].includes(r0.categoria)?r0.categoria:areaLider(fs);
  const grupos=F.length, hechos=F.filter(x=>toMin(x.f)<=m).length;
  const cursoTxt=rs=>rs.map(r=>`<div class="lrow"><span class="cur" style="background:${r.nivel==='Primaria'?'#1f9d6b':'#2f6fde'}">${escHTML(r.curso)}</span><div><b>${escHTML(r.grado||'')}</b> con ${escHTML(lidNom(r.acompanante)||'—')}<small>Codirector: ${escHTML(lidNom(r.apoyo)||'—')}</small></div>${llegoBtn(r)}</div>`).join('');
  let h=`${sal.length>6?`<select class="selsal" id="lSal">${sal.map(x=>`<option ${x===LIDE.sal?'selected':''}>${escHTML(x)}</option>`).join('')}</select>`:sal.length>1?`<div class="segs wrap" style="margin-bottom:8px">${sal.map(x=>`<span class="${x===LIDE.sal?'on lid':''}" data-s="${escHTML(x)}">${escHTML(x)}</span>`).join('')}</div>`:''}
    <div class="estbox">${escenaEstacion(nombreAct(r0),LIDE.sal,area,letraLider(fs,LIDE.sal))}</div>`;
  if(m<0) h+=`<div class="lcard"><div class="k">El STEM Day es el ${escHTML(fechaLarga(S.config.fecha_evento))}</div><p>Ese día verás aquí, en vivo, qué curso tienes, quién lo acompaña y cuánto falta para la siguiente rotación.</p></div>`;
  if(cur&&rCur.length){ const tot=toMin(cur.f)-toMin(cur.h), pas=Math.max(0,m-toMin(cur.h));
    h+=`<div class="lcard now"><div class="k">Ahora · ${fmtHora(cur.h)} a ${fmtHora(cur.f)}</div>${cursoTxt(rCur)}<div class="lbar"><i style="width:${Math.min(100,pas/tot*100).toFixed(0)}%"></i></div><div class="lft"><span>Faltan <b>${Math.max(0,toMin(cur.f)-m)} min</b></span><span>${hechos+1} de ${grupos} rotaciones</span></div></div>`; }
  else if(cur) h+=`<div class="lcard"><div class="k">Ahora · ${fmtHora(cur.h)}</div><p>En este salón no hay curso a esta hora${sal.length>1?'; mira tus otros salones arriba':''}.</p></div>`;
  if(nxt&&rNxt.length) h+=`<div class="lcard"><div class="k">Siguiente · ${fmtHora(nxt.h)}</div>${rNxt.map(r=>`<div class="lrow"><span class="cur" style="background:${r.nivel==='Primaria'?'#1f9d6b':'#2f6fde'}">${escHTML(r.curso)}</span><div><b>${escHTML(r.grado||'')}</b> con ${escHTML(lidNom(r.acompanante)||'—')}</div></div>`).join('')}</div>`;
  if(m>=0&&!cur&&!nxt) h+=`<div class="lcard"><div class="k">Terminaste tus rotaciones</div><p>¡Gracias por liderar tu estación en el STEM Day! 🎉</p></div>`;
  h+=`<button class="pbtn alt" id="lApoyo">💬 Pedir apoyo a los organizadores</button>`;
  el.innerHTML=h;
  el.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{ LIDE.sal=x.dataset.s; pintarEstacion(); });
  if($('lSal')) $('lSal').onchange=e=>{ LIDE.sal=e.target.value; pintarEstacion(); };
  el.querySelectorAll('[data-lleg]').forEach(b=>b.onclick=()=>marcarLlegada(b.dataset.lleg));
  $('lApoyo').onclick=pedirApoyo;
  // el curso va llegando: los primeros 5 minutos de la rotación, si aún no se confirmó
  LIDE.llega = cur&&rCur.length&&m-toMin(cur.h)<5&&!rCur.every(r=>S.llegadas&&S.llegadas[r.curso+'|'+r.hora_inicio]) ? (LIDE.llega&&LIDE.llega.k===cur.h+LIDE.sal?LIDE.llega:{k:cur.h+LIDE.sal,t0:(performance.now()-LIDE.t0)/1000}) : null;
  if(!LIDE.raf) animEstacion();
}
function llegoBtn(r){ const k=r.curso+'|'+r.hora_inicio, x=S.llegadas&&S.llegadas[k];
  return x?`<button class="llb ok" data-lleg="${escHTML(k)}" title="Deshacer">✓ Llegó ${new Date(x.creado_en).toLocaleTimeString('es-CO',{hour:'numeric',minute:'2-digit'})}</button>`:`<button class="llb" data-lleg="${escHTML(k)}">✓ Llegó</button>`; }
async function marcarLlegada(k){
  if(S.vistaComo) return avisoVista(); S.llegadas=S.llegadas||{}; const [curso,h]=k.split('|'), x=S.llegadas[k];
  if(x){ const r=await S.sb.from('sd_llegadas').delete().eq('id',x.id); if(r.error) return toast('No se pudo deshacer: '+r.error.message,'bad'); delete S.llegadas[k]; }
  else { const row=S.prog.find(r=>r.curso===curso&&r.hora_inicio===h); const r=await S.sb.from('sd_llegadas').insert({perfil_id:S.perfil.id,curso,hora_inicio:h,salon:row&&row.salon||null}).select().single();
    if(r.error) return toast('No se pudo guardar: '+r.error.message,'bad',4000); S.llegadas[k]=r.data; toast('✓ Llegada de '+curso+' registrada','ok'); }
  pintarEstacion();
}
function pedirApoyo(){
  $('modalBox').innerHTML=`<div class="modal"><div class="mbox"><div class="k" style="color:#c2410c">💬 PEDIR APOYO</div><h3>Mensaje a los organizadores</h3>
    <p>Llega de inmediato al chat del equipo de organización.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin:10px 0">${['Necesito apoyo en mi estación','Falta material','Un curso no ha llegado','Todo en orden ✅'].map(x=>`<span class="chip" data-q="${escHTML(x)}">${escHTML(x)}</span>`).join('')}</div>
    <div class="field"><textarea id="apTxt" rows="3" maxlength="300" placeholder="Escribe tu mensaje…"></textarea></div>
    <button class="btn" id="apOk" style="margin-top:10px;background:#c2410c">Enviar</button><button class="btn ghost" id="apX" style="margin-top:8px">Cancelar</button></div></div>`;
  $('modalBox').querySelectorAll('[data-q]').forEach(c=>c.onclick=()=>$('apTxt').value=c.dataset.q);
  $('apX').onclick=()=>$('modalBox').innerHTML='';
  $('apOk').onclick=async()=>{ const v=$('apTxt').value.trim(); if(!v) return; if(S.vistaComo){ $('modalBox').innerHTML=''; return avisoVista(); }
    const r0=filasLider().find(r=>(r.salon||'')===LIDE.sal);
    const {error}=await S.sb.from('sd_chat').insert({perfil_id:S.perfil.id,nombre:'⭐ '+S.perfil.nombre+(LIDE.sal?' · '+LIDE.sal:''),mensaje:v.slice(0,1000)});
    if(error) return toast('No se envió: '+error.message,'bad',4000); $('modalBox').innerHTML=''; toast('Mensaje enviado a los organizadores','ok'); };
}

/* ---------- Rotaciones ---------- */
function pintarRotaciones(){
  const el=$('rotPz'), fs=filasLider();
  if(!fs.length){ el.innerHTML='<div class="alertbox">Aún no tienes rotaciones asignadas.</div>'; return; }
  if(fs.every(r=>tipoLugar(r.salon)==='coliseo')) return pintarRotColiseo(fs);
  const sal=salonesLider(fs), m=minAhora(); if(LIDE.rsal!=='*'&&!sal.includes(LIDE.rsal)) LIDE.rsal='*';
  const ver=fs.filter(r=>LIDE.rsal==='*'||(r.salon||'Por definir')===LIDE.rsal), F=franjasLider(ver);
  const niv=[...new Set(fs.map(r=>r.nivel))], pausas=S.prog.filter(p=>p.tipo==='pausa'&&niv.includes(p.nivel));
  const r0=fs[0];
  let h=`<div class="lcard" style="margin-top:0"><div class="k">${escHTML(nombreAct(r0))}</div><b style="font-size:15px">${F.length} rotaciones · ${ver.length} grupos</b><small style="display:block;color:var(--muted)">${escHTML(sal.join(' · '))}</small></div>
    ${sal.length>1?`<div class="segs wrap" style="margin:8px 0">${['*',...sal].map(x=>`<span class="${x===LIDE.rsal?'on lid':''}" data-s="${escHTML(x)}">${x==='*'?'Todos':escHTML(x)}</span>`).join('')}</div>`:''}`;
  const items=[...F.map(x=>({t:'r',...x})), ...pausas.filter((p,i,a)=>a.findIndex(q=>q.hora_inicio===p.hora_inicio)===i).map(p=>({t:'p',h:p.hora_inicio,f:p.hora_fin,area:p.area}))].sort((a,b)=>a.h.localeCompare(b.h));
  items.forEach(x=>{ if(x.t==='p'){ h+=`<div class="rsep">☕ ${escHTML(x.area)} · ${fmtHora(x.h)} a ${fmtHora(x.f)}</div>`; return; }
    const est=toMin(x.f)<=m?'ok':toMin(x.h)<=m?'now':'nx';
    h+=`<div class="rot2 ${est}"><div class="h">${fmtHora(x.h)}<small>a ${fmtHora(x.f)}</small></div><div class="c">${x.rs.map(r=>`<div><span class="cur" style="background:${r.nivel==='Primaria'?'#1f9d6b':'#2f6fde'}">${escHTML(r.curso)}</span><b>${escHTML(r.grado||'')}</b> · ${escHTML(r.salon||'')}<small>Director: ${escHTML(r.acompanante||'—')}${r.apoyo?' · Codirector: '+escHTML(r.apoyo):''}</small>${window.conQuienHTML?conQuienHTML(r.curso,r.hora_inicio,'Llega con'):''}</div>`).join('')}</div><span class="st">${est==='ok'?'✓ Terminó':est==='now'?'● Ahora':'Próxima'}</span></div>`; });
  el.innerHTML=h; el.querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{ LIDE.rsal=x.dataset.s; pintarRotaciones(); });
}

/* v33 · Líderes del Coliseo: qué curso llega a su espacio y a los demás espacios (A–H) en cada rotación */
function pintarRotColiseo(fs){
  const el=$('rotPz'), Z=window.COL_Z||{}, mi=letraLider(fs,fs[0].salon), m=minAhora(), modo=LIDE.rcol||'todo';
  const col=S.prog.filter(r=>r.tipo==='actividad'&&tipoLugar(r.salon)==='coliseo'), F=franjasLider(col);
  const L=r=>String(r.curso||'').trim().slice(-1).toUpperCase(), z=k=>Z[k]||[k,'#5b6577','📍'];
  const lider=r=>{ const id=(r.lideres||[])[0]; return id&&S.lid&&S.lid[id]?S.lid[id].nombre:''; };
  const niv=[...new Set(col.map(r=>r.nivel))], pausas=S.prog.filter(p=>p.tipo==='pausa'&&niv.includes(p.nivel));
  const mios=col.filter(r=>L(r)===mi).length, zm=z(mi);
  let h=`<div class="lcard colcard" style="margin-top:0;--c:${zm[1]}"><span class="colL">${escHTML(mi)}</span><div><div class="k">Tu espacio en el Coliseo</div><b style="font-size:15px">${zm[2]} ${escHTML(zm[0])}</b><small style="display:block;color:var(--muted)">${F.length} rotaciones · ${mios} grupos llegan a tu espacio</small></div></div>
    <div class="segs" style="margin:8px 0"><span data-cm="todo" class="${modo==='todo'?'on lid':''}">Todo el Coliseo</span><span data-cm="mi" class="${modo==='mi'?'on lid':''}">Solo mi espacio</span></div>`;
  const items=[...F.map(x=>({t:'r',...x})), ...pausas.filter((p,i,a)=>a.findIndex(q=>q.hora_inicio===p.hora_inicio)===i).map(p=>({t:'p',h:p.hora_inicio,f:p.hora_fin,area:p.area}))].sort((a,b)=>a.h.localeCompare(b.h));
  items.forEach(x=>{ if(x.t==='p'){ h+=`<div class="rsep">☕ ${escHTML(x.area)} · ${fmtHora(x.h)} a ${fmtHora(x.f)}</div>`; return; }
    const est=toMin(x.f)<=m?'ok':toMin(x.h)<=m?'now':'nx', yo=x.rs.find(r=>L(r)===mi);
    h+=`<div class="rotcol e-${est}"><div class="rh"><b>${fmtHora(x.h)} a ${fmtHora(x.f)}</b><span class="st">${est==='ok'?'✓ Terminó':est==='now'?'● Ahora':'Próxima'}</span></div>
      <div class="miesp" style="--c:${zm[1]}">${yo?`<span class="cur">${escHTML(yo.curso)}</span><div><b>Llega a tu espacio ${escHTML(mi)}</b><small>Director: ${escHTML(yo.acompanante||'—')}${yo.apoyo?' · Codirector: '+escHTML(yo.apoyo):''}</small>${window.conQuienHTML?conQuienHTML(yo.curso,yo.hora_inicio,'Llega con'):''}</div>`:`<div><b>Ningún curso llega a tu espacio en esta rotación</b><small>Puedes apoyar a los demás espacios.</small></div>`}</div>`;
    if(modo==='todo') h+=`<div class="colgrid">${'ABCDEFGH'.split('').filter(k=>k!==mi).map(k=>{ const r=x.rs.find(q=>L(q)===k), zz=z(k);
        return `<div class="cg ${r?'':'vac'}" style="--c:${zz[1]}"><span class="l">${k}</span><div><small>${zz[2]} ${escHTML(zz[0])}</small><b>${r?escHTML(r.curso):'—'}</b>${r?`<small>${escHTML(lider(r)||'')}</small>`:''}</div></div>`; }).join('')}</div>`;
    else h+=`<div class="colmini">${'ABCDEFGH'.split('').filter(k=>k!==mi).map(k=>{ const r=x.rs.find(q=>L(q)===k); return `<span style="--c:${z(k)[1]}"><b>${k}</b> ${r?escHTML(r.curso):'—'}</span>`; }).join('')}</div>`;
    h+='</div>'; });
  el.innerHTML=h; el.querySelectorAll('[data-cm]').forEach(x=>x.onclick=()=>{ LIDE.rcol=x.dataset.cm; pintarRotColiseo(fs); });
}

/* ---------- alertas del líder: antes de cada rotación y cuando el curso llega ---------- */
function proximasLider(){ const m=minAhora(); return franjasLider(filasLider()).filter(x=>m<0||toMin(x.h)>m); }
function revisarAlertasLider(){
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  const p=prefs(), hechas=LS.get('steam_lidalert_'+a.fecha,[]);
  franjasLider(filasLider()).forEach(x=>{ const ini=toMin(x.h);
    if(a.min>=ini-p.anticipacion_min&&a.min<ini&&!hechas.includes('a'+x.h)){ hechas.push('a'+x.h); LS.set('steam_lidalert_'+a.fecha,hechas);
      const r=x.rs[0]; lanzarAlerta({tipo:'lider',nombre:'Llega'+(x.rs.length>1?'n':'')+' '+x.rs.map(z=>z.curso).join(', '),h:x.h,f:x.f,cat:r.categoria,salon:r.salon,frase:x.rs.map(z=>z.curso+' con '+lidNom(z.acompanante)).join(' · '),docente_cargo:'Director: '+x.rs.map(z=>lidNom(z.acompanante)).join(', ')}, ini-a.min); }
    if(a.min>=ini&&a.min<ini+2&&!hechas.includes('l'+x.h)){ hechas.push('l'+x.h); LS.set('steam_lidalert_'+a.fecha,hechas);
      toast('🚶 '+x.rs.map(z=>z.curso).join(', ')+' está'+(x.rs.length>1?'n':'')+' llegando con '+x.rs.map(z=>lidNom(z.acompanante)).join(', '),'',6000); if(p.sonido) sonarTono(p.tono); }
  });
}

/* ---------- editor de avatar: pestaña ⭐ Líder ---------- */
function editorLider(c, av, prev){
  const tabs=c.querySelector('.atabs'), opts=c.querySelector('.opts'); if(!tabs||!opts) return;
  av.lid=av.lid?{...av.lid,efe:[...(av.lid.efe||[])]}:{area:areaLider(),atu:1,cab:1,mano:1,comp:1,est:true,efe:[0]};
  tabs.insertAdjacentHTML('beforeend','<span data-t="lid" class="tlid">⭐ Líder</span>');
  opts.insertAdjacentHTML('beforeend','<div class="pane" data-p="lid" hidden><div id="optLid"></div></div>');
  const pinta=()=>{ const L=av.lid, K=LID_KIT[L.area]; const ch=(k,i,lbl)=>`<span class="chip ${L[k]===i?'on':''}" data-k="${k}" data-i="${i}">${escHTML(lbl)}</span>`;
    c.querySelector('#optLid').innerHTML=`<p class="sm" style="margin:6px 0 2px">Piezas exclusivas de los líderes de estación. Primero elige tu área.</p>
      <div class="opt"><h4>Tu área</h4><div class="row">${Object.keys(LID_KIT).map(a=>`<span class="chip ${L.area===a?'on':''}" data-area="${a}">${LID_AREA_N[a]}</span>`).join('')}</div></div>
      <div class="opt"><h4>Atuendo</h4><div class="row">${LID_ATU.map((x,i)=>ch('atu',i,x)).join('')}</div></div>
      <div class="opt"><h4>Cabeza · ${LID_AREA_N[L.area]}</h4><div class="row">${K.cab.map((x,i)=>ch('cab',i,x)).join('')}</div></div>
      <div class="opt"><h4>En la mano · ${LID_AREA_N[L.area]}</h4><div class="row">${K.mano.map((x,i)=>ch('mano',i,x)).join('')}</div></div>
      <div class="opt"><h4>Compañero flotante · ${LID_AREA_N[L.area]}</h4><div class="row">${K.comp.map((x,i)=>ch('comp',i,x)).join('')}</div></div>
      <div class="opt"><h4>Estampado en la camiseta</h4><div class="row"><span class="chip ${L.est?'on':''}" data-est="1">${K.est}</span><span class="chip ${!L.est?'on':''}" data-est="0">Ninguno</span></div></div>
      <div class="opt"><h4>Efectos (puedes elegir varios)</h4><div class="row">${LID_EFE.map((x,i)=>`<span class="chip ${L.efe.includes(i)?'on':''}" data-efe="${i}">${x}</span>`).join('')}</div></div>`;
    c.querySelectorAll('#optLid .chip').forEach(s=>s.onclick=()=>{ const d=s.dataset;
      if(d.area){ L.area=d.area; L.cab=1; L.mano=1; L.comp=1; } else if(d.est!=null) L.est=d.est==='1';
      else if(d.efe!=null){ const i=+d.efe; L.efe=L.efe.includes(i)?L.efe.filter(x=>x!==i):[...L.efe,i]; } else L[d.k]=+d.i;
      pinta(); prev(); }); };
  pinta();
  tabs.querySelectorAll('span').forEach(t=>t.onclick=()=>{ tabs.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===t)); c.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.p!==t.dataset.t); });
  tabs.querySelector('.tlid').click();
}
