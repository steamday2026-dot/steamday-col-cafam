/* =====================================================================
   STEM Day · v35 · Turnos del curso (Director de curso y Codirector)
   - Cada bloque del día dice quién estará con el curso: D, C o A (ambos).
   - Uno propone y el otro confirma. Se puede hacer días antes o el mismo día,
     pero un bloque que ya empezó no se puede cambiar (lo valida también Supabase).
   - Lo ven en vivo: organizadores, Master, Máster Coord., administrador y líderes.
   ===================================================================== */
const TUR={ m:{}, listo:false, cargado:false, vistos:{} };
const TUR_N={D:'Director',C:'Codirector',A:'Ambos'};
const turK=(c,h)=>c+'|'+String(h).slice(0,5);
const corto=n=>{ const p=String(n||'').trim().split(/\s+/); if(p.length<=2) return p.join(' '); return p.length>=4?p[2]+' '+p[0]:p[p.length-1]+' '+p[0]; };   // «Apellido Apellido Nombre Nombre» → «Nombre Apellido»

async function turCargar(){
  try{ const r=await S.sb.from('sd_turnos').select('*'); if(r.error) throw r.error; TUR.m={}; (r.data||[]).forEach(t=>TUR.m[turK(t.curso,t.hora_inicio)]=t); TUR.cargado=true; }
  catch(e){ TUR.cargado=false; }
}
function turIniciar(){
  if(TUR.listo) return; TUR.listo=true;
  turCargar().then(turRefrescar);
  try{ S.sb.channel('turnos').on('postgres_changes',{event:'*',schema:'public',table:'sd_turnos'},()=>{ clearTimeout(TUR._t); TUR._t=setTimeout(async()=>{ await turCargar(); turRefrescar(); turRevisarPropuestas(); },600); }).subscribe(); }catch(e){}
  setInterval(turRevisar,30000); setTimeout(turRevisar,4000);
}
/* repinta lo que esté abierto */
function turRefrescar(){
  turBoton();
  const sh=$('sheet'); if(sh&&sh.classList.contains('open')&&sh.dataset.tur){ sh.dataset.tur==='doc'?turAbrirDocente(TUR.cursoSel,true):turAbrirResumen(true); }
  if(S.panel==='rot'&&window.pintarRotaciones) pintarRotaciones();
  if(S.panel==='vivo'&&window.pintarVivo) pintarVivo();
}

/* bloques del curso: actividades (sin la dirección de grupo) y pausas */
function turBloques(c){ return rutaCurso(c).filter(s=>!(s.tipo==='actividad'&&esDirGrupo(s))); }
function turPersonas(c){ const f=S.prog.find(r=>r.curso===c&&r.tipo==='actividad'&&(r.acompanante||r.apoyo))||{}; return {D:f.acompanante||'',C:f.apoyo||''}; }
function turIniciado(h){ const a=ahora(); if(a.fecha!==S.config.fecha_evento) return a.fecha>S.config.fecha_evento; return a.min>=toMin(h); }
function miPapel(c){ if(S.modo!=='docente') return null; const ex=S.rolDoc||{acompana:[],apoya:[]}; if((ex.acompana||[]).includes(c)) return 'D'; if((ex.apoya||[]).includes(c)) return 'C'; return (S.cursos||[]).includes(c)?'D':null; }

/* ¿quién está con el curso en el bloque h? (texto corto para otros perfiles) */
function conQuien(c,h){
  const t=TUR.m[turK(c,h)], P=turPersonas(c); if(!t) return null;
  const nom=t.quien==='A'?`${corto(P.D)} y ${corto(P.C)}`:corto(P[t.quien]);
  return {txt:nom||TUR_N[t.quien], rol:TUR_N[t.quien], ok:t.confirmado, quien:t.quien};
}
function conQuienHTML(c,h,pref){ const q=conQuien(c,h);
  if(!q) return `<small class="turq sd">👥 ${pref||'Con el curso'}: sin definir</small>`;
  return `<small class="turq ${q.ok?'ok':'pe'}">👥 ${pref||'Con el curso'}: <b>${escHTML(q.txt)}</b> · ${q.rol}${q.ok?'':' (por confirmar)'}</small>`; }
window.conQuienHTML=conQuienHTML; window.conQuien=conQuien;

/* ---------- botón flotante en Mi ruta (docente) ---------- */
function turBoton(){
  let b=$('btnTurnos');
  if(!b){ const p=$('p-ruta'); if(!p) return; b=document.createElement('button'); b.id='btnTurnos'; b.className='turbtn'; b.hidden=true; p.appendChild(b); b.onclick=()=>turAbrirDocente(); }
  if(S.modo!=='docente'||!(S.cursos||[]).length){ b.hidden=true; return; }
  let pend=0, sin=0; S.cursos.forEach(c=>{ const yo=miPapel(c); turBloques(c).forEach(s=>{ if(turIniciado(s.h)) return; const t=TUR.m[turK(c,s.h)]; if(!t) sin++; else if(!t.confirmado&&t.propuesto_por!==S.perfil.id&&yo) pend++; }); });
  b.innerHTML=`<span class="ti">👥${pend?`<b class="r">${pend}</b>`:sin?`<b>${sin}</b>`:'<b class="ok">✓</b>'}</span>Turnos`; b.title=pend?`${pend} por confirmar`:sin?`${sin} sin definir`:'Todo acordado';
  // v39: debajo del botón «Mapa del colegio» (a la izquierda) para no tapar los salones de la ruta
  b.hidden=false; const mb=$('btnColegio'), mp=$('mapa'); b.style.top=(mb&&!mb.hidden&&mb.offsetHeight?mb.offsetTop+mb.offsetHeight+8:((mp&&mp.offsetTop||0)+10))+'px';
}

/* ---------- hoja del docente: proponer / confirmar ---------- */
function turAbrirDocente(curso,refresco){
  const cs=S.cursos||[]; if(!cs.length) return; const c=TUR.cursoSel=(curso&&cs.includes(curso))?curso:(TUR.cursoSel&&cs.includes(TUR.cursoSel)?TUR.cursoSel:cs[0]);
  const yo=miPapel(c), P=turPersonas(c), sh=$('sheet'), sc=refresco&&sh.querySelector('.sb')?sh.querySelector('.sb').scrollTop:0;
  const otro=yo==='D'?'Codirector':'Director de curso';
  let h=`<div class="sh" style="background:#1f6f5c"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Curso ${escHTML(c)} · tú eres ${yo==='C'?'Codirector':'Director de curso'}</div><h3>Turnos con tu ${otro.toLowerCase()}</h3></div><div class="sb">`;
  if(cs.length>1) h+=`<div class="segs" style="margin-bottom:8px">${cs.map(x=>`<span data-c="${escHTML(x)}" class="${x===c?'on':''}">${escHTML(x)}</span>`).join('')}</div>`;
  h+=`<p class="sm" style="margin:0 0 6px">Elige quién estará con el curso en cada momento. Tu ${otro.toLowerCase()} recibe un aviso y confirma con «✓ De acuerdo». Puedes hacerlo desde hoy o el mismo día, pero <b>no se puede cambiar un bloque que ya empezó</b>.</p>
    <div class="turper"><span><b>D</b> ${escHTML(corto(P.D)||'Director')}</span><span><b>C</b> ${escHTML(corto(P.C)||'Codirector')}</span></div>`;
  if(!TUR.cargado) h+=`<div class="warnbox">Los turnos aún no están activos. El administrador debe ejecutar el archivo 18 en Supabase.</div>`;
  turBloques(c).forEach(s=>{ const t=TUR.m[turK(c,s.h)], ini=turIniciado(s.h), mio=t&&t.propuesto_por===S.perfil.id;
    const est=!t?'<span class="tst sd">Sin definir</span>':t.confirmado?'<span class="tst ok">✓ Acordado</span>':mio?`<span class="tst pe">⏳ Esperando a tu ${otro.toLowerCase()}</span>`:`<span class="tst pe">⏳ Propuesto por ${escHTML(corto(t.propuesto_nombre))}</span>`;
    h+=`<div class="turb ${ini?'lock':''} ${s.tipo==='pausa'?'pz':''}"><div class="th"><b>${fmtHora(s.h)}</b><span>${escHTML(s.nombre)}${s.tipo==='pausa'?'':' · '+escHTML(s.salon||'')}</span></div>
      <div class="tsel">${['D','C','A'].map(q=>`<span data-h="${s.h}" data-q="${q}" class="${t&&t.quien===q?'on '+(t.confirmado?'ok':'pe'):''}">${q==='A'?'Ambos':q==='D'?escHTML(corto(P.D).split(' ')[0]||'Director'):escHTML(corto(P.C).split(' ')[0]||'Codirector')}<small>${TUR_N[q]}</small></span>`).join('')}</div>
      <div class="tpie">${ini?'<span class="tst lk">🔒 Ya inició · no se puede cambiar</span>'+(t?` · ${est}`:''):est}${!ini&&t&&!t.confirmado&&!mio?`<button class="b1 sm" data-ok="${s.h}">✓ De acuerdo</button>`:''}${!ini&&t?`<a href="#" data-del="${s.h}" class="tdel">Quitar</a>`:''}</div></div>`; });
  h+='</div>'; sh.innerHTML=h; sh.dataset.tur='doc'; sh.classList.add('open'); if(sc) sh.querySelector('.sb').scrollTop=sc;
  $('shX').onclick=()=>{ delete sh.dataset.tur; cerrarSheet(); };
  sh.querySelectorAll('.segs [data-c]').forEach(e=>e.onclick=()=>turAbrirDocente(e.dataset.c,true));
  sh.querySelectorAll('.tsel [data-q]').forEach(e=>e.onclick=async()=>{ if(turIniciado(e.dataset.h)) return toast('Esta actividad ya inició: no se puede cambiar.','bad',3500);
    const t=TUR.m[turK(c,e.dataset.h)]; if(t&&t.quien===e.dataset.q) return;
    const r=await S.sb.rpc('sd_turno_guardar',{p_curso:c,p_hora:e.dataset.h,p_quien:e.dataset.q}); if(r.error) return toast(r.error.message,'bad',4500); if(window.avisarYa) avisarYa();
    toast(`Propuesta enviada a tu ${otro.toLowerCase()}`,'ok'); await turCargar(); turRefrescar(); });
  sh.querySelectorAll('[data-ok]').forEach(e=>e.onclick=async()=>{ const r=await S.sb.rpc('sd_turno_confirmar',{p_curso:c,p_hora:e.dataset.ok}); if(r.error) return toast(r.error.message,'bad',4500); toast('Turno acordado ✓','ok'); await turCargar(); turRefrescar(); });
  sh.querySelectorAll('[data-del]').forEach(e=>e.onclick=async ev=>{ ev.preventDefault(); const r=await S.sb.rpc('sd_turno_quitar',{p_curso:c,p_hora:e.dataset.del}); if(r.error) return toast(r.error.message,'bad',4500); await turCargar(); turRefrescar(); });
}

/* ---------- resumen para organizadores, Master, Máster Coord., administrador y líderes ---------- */
function turAbrirResumen(refresco){
  const sh=$('sheet'), sc=refresco&&sh.querySelector('.sb')?sh.querySelector('.sb').scrollTop:0, a=ahora(), hoy=a.fecha===S.config.fecha_evento;
  const cursos=[...new Set(S.prog.filter(r=>r.tipo==='actividad'&&r.curso).map(r=>r.curso))].filter(c=>/^\d/.test(c)).sort((x,y)=>x.localeCompare(y,'es',{numeric:true}));
  const grados=[...new Set(cursos.map(c=>c.replace(/[A-Z].*$/i,'')))], g=TUR.grado&&grados.includes(TUR.grado)?TUR.grado:'*', q=(TUR.q||'').toLowerCase();
  let acord=0, pend=0, sin=0;
  const filas=cursos.filter(c=>g==='*'||c.replace(/[A-Z].*$/i,'')===g).map(c=>{ const B=turBloques(c), P=turPersonas(c); let k={ok:0,pe:0,sd:0};
    B.forEach(s=>{ const t=TUR.m[turK(c,s.h)]; t?(t.confirmado?k.ok++:k.pe++):k.sd++; }); k.ok===B.length?acord++:k.pe?pend++:sin++;
    return {c,B,P,k}; }).filter(f=>!q||`${f.c} ${f.P.D} ${f.P.C}`.toLowerCase().includes(q));
  let h=`<div class="sh" style="background:#1f6f5c"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Director de curso y Codirector</div><h3>Turnos de los cursos</h3></div><div class="sb">
    <div class="cnt c3"><div><b style="color:#1f9d6b">${acord}</b><small>cursos con todo acordado</small></div><div><b style="color:#b07a00">${pend}</b><small>con turnos por confirmar</small></div><div><b style="color:#8a94a8">${sin}</b><small>con bloques sin definir</small></div></div>
    <div class="segs wrap">${['*',...grados].map(x=>`<span data-g="${x}" class="${x===g?'on':''}">${x==='*'?'Todos':x+'.°'}</span>`).join('')}</div>
    <input class="srch" id="turQ" placeholder="Buscar curso o docente…" value="${escHTML(TUR.q||'')}">
    <div class="leg">D = Director de curso · C = Codirector · A = Ambos · <span style="color:#1f9d6b">verde</span> acordado · <span style="color:#b07a00">amarillo</span> por confirmar · gris sin definir</div>`;
  if(!TUR.cargado) h+=`<div class="warnbox">Los turnos aún no están activos (falta el archivo 18 en Supabase).</div>`;
  filas.forEach(({c,B,P})=>{ const ahoraB=hoy?B.filter(s=>toMin(s.h)<=a.min&&a.min<toMin(s.f)).pop():null, qn=ahoraB?conQuien(c,ahoraB.h):null;
    h+=`<div class="turc"><div class="tc"><b>${escHTML(c)}</b><span>D: ${escHTML(corto(P.D)||'—')} · C: ${escHTML(corto(P.C)||'—')}</span></div>
      ${ahoraB?`<div class="tnow">● Ahora (${escHTML(ahoraB.nombre)}): <b>${qn?escHTML(qn.txt):'sin definir'}</b>${qn&&!qn.ok?' (por confirmar)':''}</div>`:''}
      <div class="tchips">${B.map(s=>{ const t=TUR.m[turK(c,s.h)]; return `<span class="${!t?'sd':t.confirmado?'ok':'pe'} ${ahoraB&&ahoraB.h===s.h?'now':''}" title="${escHTML(s.nombre)}">${fmtHora(s.h).replace(/\s?[ap]m/,'')}<b>${t?t.quien:'—'}</b></span>`; }).join('')}</div></div>`; });
  h+='</div>'; sh.innerHTML=h; sh.dataset.tur='res'; sh.classList.add('open'); if(sc) sh.querySelector('.sb').scrollTop=sc;
  $('shX').onclick=()=>{ delete sh.dataset.tur; cerrarSheet(); };
  sh.querySelectorAll('[data-g]').forEach(e=>e.onclick=()=>{ TUR.grado=e.dataset.g; turAbrirResumen(true); });
  $('turQ').oninput=e=>{ TUR.q=e.target.value; turAbrirResumen(true); const b=$('turQ'); b.focus(); b.setSelectionRange(b.value.length,b.value.length); };
}
window.turAbrirResumen=turAbrirResumen; window.turAbrirDocente=turAbrirDocente;

/* ---------- avisos al docente ---------- */
function turRevisarPropuestas(){
  if(S.modo!=='docente'||S.vistaComo) return;
  (S.cursos||[]).forEach(c=>{ const yo=miPapel(c); if(!yo) return; turBloques(c).forEach(s=>{ const t=TUR.m[turK(c,s.h)]; if(!t||t.confirmado||t.propuesto_por===S.perfil.id||turIniciado(s.h)) return;
    const k='steam_turprop_'+turK(c,s.h)+'_'+t.actualizado_en; if(LS.get(k,false)) return; LS.set(k,true);
    ventana({icono:'👥',kicker:`Curso ${escHTML(c)} · turnos`,titulo:`${escHTML(corto(t.propuesto_nombre))} propone un turno`,color:'#1f6f5c',
      html:`<p><b>${fmtHora(s.h)} · ${escHTML(s.nombre)}</b>${s.tipo==='pausa'?'':' ('+escHTML(s.salon||'')+')'}</p><p>Con el curso: <b>${TUR_N[t.quien]}${t.quien==='A'?' (los dos)':''}</b>.</p>`,
      botones:[{t:'✓ De acuerdo',fn:async()=>{ const r=await S.sb.rpc('sd_turno_confirmar',{p_curso:c,p_hora:s.h}); if(r.error) toast(r.error.message,'bad',4000); else { toast('Turno acordado ✓','ok'); await turCargar(); turRefrescar(); } }},{t:'Ver todos los turnos',ghost:true,fn:()=>turAbrirDocente(c)}]}); }); });
}
function turRevisar(){
  turBoton(); turRevisarPropuestas();
  if(S.modo!=='docente'||S.vistaComo) return; const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  (S.cursos||[]).forEach(c=>{ const yo=miPapel(c); if(!yo) return; const B=turBloques(c);
    B.forEach((s,i)=>{ const t=TUR.m[turK(c,s.h)]; if(!t||t.quien!==yo) return; const prev=i?TUR.m[turK(c,B[i-1].h)]:null; if(prev&&prev.quien===yo) return;
      const m=toMin(s.h); if(a.min<m-10||a.min>=m) return; const k='steam_turtoma_'+turK(c,s.h); if(LS.get(k,false)) return; LS.set(k,true);
      const p=prefs(); if(p.sonido&&window.sonarTono) sonarTono(p.tono); if(p.vibracion&&navigator.vibrate) navigator.vibrate([300,150,300]);
      ventana({icono:'👥',kicker:`Curso ${escHTML(c)} · tu turno`,titulo:`En ${m-a.min} minutos tomas el curso`,color:'#1f6f5c',html:`<p><b>${escHTML(s.nombre)}</b>${s.tipo==='pausa'?'':' en <b>'+escHTML(s.salon||'')+'</b>'} a las <b>${fmtHora(s.h)}</b>.</p><p>Acordado con tu ${yo==='D'?'codirector':'director de curso'}.</p>`}); }); });
}
window.turIniciar=turIniciar; window.turBoton=turBoton;
