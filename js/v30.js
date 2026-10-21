/* =====================================================================
   STEM Day · versión 30
   - Ventanas emergentes en el centro (mensajes del administrador, recordatorios)
   - Conexiones (latido cada minuto) y personas en línea (presencia)
   - Si el administrador cambia el perfil de alguien, su app se actualiza sola
   - Aviso «tu rol es solo por este día» (Director de curso / Codirector)
   - Rompecabezas: por qué, qué hacen los estudiantes y preguntas guía
   - Actividades del hacer: estudiantes líderes, docentes a cargo y video explicativo
   - Encuesta final de la jornada (20 minutos antes del último espacio)
   - Recordatorios de asistencia (7:00 y 5 minutos después de llegar a cada actividad)
   ===================================================================== */
const V30 = { sesion: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'x'+Date.now()+Math.random(), cola: [], pres: null, enLinea: {} };
const esOrgM = () => !!(S.perfil && (S.perfil.rol === 'admin' || S.perfil.org_master));
const nrm30 = t => String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();

/* ---------- ventana emergente (cola) ---------- */
function ventana(o){ V30.cola.push(o); if(V30.cola.length===1) pintarVentana(); }
function pintarVentana(){
  let b=document.getElementById('popBox'); if(!b){ b=document.createElement('div'); b.id='popBox'; document.body.appendChild(b); }
  const o=V30.cola[0]; if(!o){ b.innerHTML=''; return; }
  const bt=o.botones||[{t:'Entendido'}];
  b.innerHTML=`<div class="pop"><div class="pbx" style="--c:${o.color||'#173d7a'}">${o.icono?`<div class="pic">${o.icono}</div>`:''}${o.kicker?`<div class="pk">${o.kicker}</div>`:''}
    <h3>${o.titulo||''}</h3><div class="pt">${o.html||''}</div><div class="pbt">${bt.map((x,i)=>`<button class="btn ${x.ghost?'ghost':''}" data-b="${i}">${x.t}</button>`).join('')}</div></div></div>`;
  b.querySelectorAll('[data-b]').forEach(e=>e.onclick=async()=>{ const x=bt[+e.dataset.b]; if(x.fn){ const r=await x.fn(b); if(r===false) return; } V30.cola.shift(); pintarVentana(); });
  if(o.alAbrir) o.alAbrir(b);
}

/* ---------- inicio (lo llama principal()) ---------- */
function v30Iniciar(){
  if(V30.listo) return; V30.listo=true;
  if(!S.vistaComo){
    latido(); setInterval(latido,60000); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) latido(); });
    presencia(); vigilarPerfil(); cargarMensajes();
  }
  setTimeout(revisarV30,2500); setInterval(revisarV30,30000);
  if(window.turIniciar) turIniciar();
  setTimeout(avisoVideoHacer,3500);
}
/* v48 · video del hacer: le aparece al docente al abrir la app (el de su nivel) hasta que toque «Ya lo vi» */
function avisoVideoHacer(){
  if(S.vistaComo||S.modo!=='docente'||!S.config) return;
  const nv=nivelDocente(), url=videoHacer(nv); if(!url) return;
  const a=ahora(); if(a.fecha>S.config.fecha_evento) return;
  const k='steam_vhacer_'+S.perfil.id+'_'+url; if(LS.get(k,false)) return;
  ventana({icono:'🌎',kicker:'Video para orientadores · '+(nv||'STEM Day'),titulo:'Actividad del hacer · Cambio climático',color:'#1f9d6b',
    html:`<p>Antes del 23 de octubre, mira cómo se orienta la Actividad del hacer con tu curso.</p><div class="vbox pv">${videoHTML(url)}</div><p class="sm">También lo encuentras en <b>Alertas → Más</b> y en la ficha de la actividad en <b>Mi ruta</b>.</p>`,
    botones:[{t:'Ya lo vi',fn:()=>{ LS.set(k,true); }},{t:'Verlo más tarde',ghost:true}]});
}
window.avisoVideoHacer=avisoVideoHacer;
function latido(){ if(document.hidden||!S.perfil||S.vistaComo) return; S.sb.rpc('sd_latido',{p_sesion:V30.sesion}).then(()=>{},()=>{}); }

/* personas en línea (Supabase Realtime Presence) */
function presencia(){
  try{
    V30.pres=S.sb.channel('presencia',{config:{presence:{key:S.perfil.id}}});
    V30.pres.on('presence',{event:'sync'},()=>{ V30.enLinea=V30.pres.presenceState(); if(window.adminPresencia) window.adminPresencia(V30.enLinea); })
      .subscribe(st=>{ if(st==='SUBSCRIBED') V30.pres.track({id:S.perfil.id,nombre:S.perfil.nombre,rol:S.perfil.rol,org:!!S.perfil.org_master,desde:new Date().toISOString()}); });
  }catch(e){}
}
window.enLineaAhora=()=>V30.enLinea;

/* si el administrador cambia mi perfil, la app se recarga con el perfil nuevo */
function vigilarPerfil(){
  try{
    S.sb.channel('yo-'+S.perfil.id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'sd_perfiles',filter:'id=eq.'+S.perfil.id},p=>{
      const n=p.new||{}; if(n.rol!==S.perfil.rol||!!n.org_master!==!!S.perfil.org_master||!!n.org_lista!==!!S.perfil.org_lista){
        ventana({icono:'🔄',titulo:'Tu perfil se actualizó',html:`<p>El administrador cambió tu perfil a <b>${escHTML(n.rol==='organizador'&&n.org_lista?'Organizador Master':PERFIL_N[n.rol]||n.rol)}${n.org_master?' · Máster Coordinador':''}</b>. La app se va a actualizar.</p>`,botones:[{t:'Actualizar ahora',fn:()=>{ location.reload(); }}]});
      } }).subscribe();
  }catch(e){}
}
const PERFIL_N={docente:'Docente',lider:'Líder de estación',master:'Master',organizador:'Organizador',secretario:'Secretario',admin:'Administrador'};

/* ---------- mensajes del administrador ---------- */
function paraMi(m){ const p=S.perfil; if(m.destino==='todos') return true;
  if(m.destino==='roles'){ const R=m.roles||[], nv=p.rol==='docente'?nivelDocente():'';   // v43: docentes de Primaria / de Bachillerato
    return R.includes(p.rol)||(R.includes('orgmaster')&&esOrgM())||(R.includes('doc_pri')&&nv==='Primaria')||(R.includes('doc_bach')&&nv==='Bachillerato'); }
  return (m.personas||[]).includes(p.id); }
// v44: además del tiempo real, se revisa al volver a la app y cada 90 s
// (el celular corta la conexión en vivo cuando la app queda en segundo plano o se apaga la pantalla).
const MSG_YA=new Set(); let MSG_INI=false;
async function revisarMensajes(){
  if(!S.perfil||!S.sb) return;
  try{
    const [m,v]=await Promise.all([ S.sb.from('sd_mensajes').select('*').order('id').limit(200), S.sb.from('sd_mensajes_vistos').select('mensaje_id').eq('perfil_id',S.perfil.id) ]);
    if(m.error) return; const vistos=new Set((v.data||[]).map(x=>x.mensaje_id));
    const nuevos=(m.data||[]).filter(x=>paraMi(x)&&!vistos.has(x.id)&&!MSG_YA.has(x.id));
    if(nuevos.length&&MSG_INI){ const pr=prefs(); if(pr.sonido) sonarTono(pr.tono); }
    nuevos.forEach(mostrarMensaje);
  }catch(e){}
}
async function cargarMensajes(){
  await revisarMensajes(); MSG_INI=true;
  try{ S.sb.channel('mensajes').on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_mensajes'},p=>{ if(paraMi(p.new)&&!MSG_YA.has(p.new.id)){ const pr=prefs(); if(pr.sonido) sonarTono(pr.tono); mostrarMensaje(p.new); } }).subscribe(); }catch(e){}
  setInterval(revisarMensajes,90000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(revisarMensajes,800); });
  window.addEventListener('online',()=>setTimeout(revisarMensajes,1500));
}
function mostrarMensaje(m){ if(m&&m.id!=null){ if(MSG_YA.has(m.id)) return; MSG_YA.add(m.id); }
  ventana({ icono:'💬', kicker:'Mensaje del administrador', titulo:escHTML(m.titulo), color:'#173d7a',
    html:`<p style="white-space:pre-wrap">${escHTML(m.texto)}</p>${m.video?`<div class="vbox pv">${videoHTML(m.video)}</div>`:''}`,
    botones:[{t:'Entendido', fn:async()=>{ if(!S.vistaComo) await S.sb.from('sd_mensajes_vistos').upsert({mensaje_id:m.id,perfil_id:S.perfil.id},{onConflict:'mensaje_id,perfil_id'}); }}] });
}

/* ---------- revisiones periódicas (docentes) ---------- */
function revisarV30(){
  if(!S.perfil||$('s-main').hidden) return;
  if(S.modo==='docente'){ avisoRolUnaVez(); recordatoriosAsistencia(); revisarEncuestaFinal(); revisarRompecabezas(); }
}
function avisoRolUnaVez(){
  const k='steam_rolnota30_'+S.perfil.id; if(LS.get(k,false)) return; const t=avisoRolDia(); if(!t) return;
  LS.set(k,true); ventana({icono:'📌',titulo:'Tu rol en el STEM Day',html:`<p>${t}</p>`});
}

/* asistencia: 7:00 (todos los directores y codirectores) y 5 min después de llegar a cada actividad */
function recordatoriosAsistencia(){
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  if(a.min>=418&&a.min<450){ const k='steam_asis7_'+S.perfil.id; if(!LS.get(k,false)){ LS.set(k,true); const prim=S.cursos.some(c=>S.prog.some(r=>r.curso===c&&r.nivel==='Primaria'));
    avisarAsis({titulo:'Recuerda llamar asistencia',html:`<p>Ya empezó la jornada. Abre <b>Lista</b> y marca a cada estudiante de <b>${escHTML(S.cursos.join(' y '))}</b>: asistió, no asistió o llegó tarde (con el motivo del retardo).</p>${prim?'<p class="onces">🍎 <b>Después de llamar a lista</b>, los estudiantes pueden comer algo sencillo antes de salir a la primera rotación.</p>':''}`,mom:'inicial'}); } }
  avisoSalidaDirGrupo(a);
  S.cursos.forEach(c=>{ momentosLista(c).forEach(s=>{
    const m=toMin(s.h)+5; if(a.min<m||a.min>m+20) return; const k='steam_asisact_'+c+'_'+s.h; if(LS.get(k,false)) return; LS.set(k,true);
    avisarAsis({titulo:`Llamado a lista · ${escHTML(c)}`,html:`<p>Ya están en <b>${escHTML(s.salon||s.nombre)}</b> (${escHTML(s.nombre)}). Confirma quiénes están en esta actividad y, si falta alguien, el motivo.</p>`,mom:s.h,curso:c}); }); });
}
/* v34 · cierre de la dirección de grupo: 30 minutos antes de la primera rotación, recordar que deben salir */
function avisoSalidaDirGrupo(a){
  S.cursos.forEach(c=>{ const sig=rutaCurso(c).find(x=>x.tipo==='actividad'&&!esDirGrupo(x)); if(!sig) return;
    const m=toMin(sig.h)-30; if(a.min<m||a.min>=toMin(sig.h)) return; const k='steam_salida_'+c+'_'+sig.h; if(LS.get(k,false)) return; LS.set(k,true);
    const p=prefs(); if(p.sonido) sonarTono(p.tono); if(p.vibracion&&navigator.vibrate) navigator.vibrate([300,150,300]);
    ventana({icono:'⏰',kicker:`Curso ${escHTML(c)} · cierre de la dirección de grupo`,titulo:`En ${toMin(sig.h)-a.min} minutos salen a la próxima rotación`,color:'#c2410c',
      html:`<p>Su primera actividad es <b>${escHTML(sig.nombre)}</b> en <b>${escHTML(sig.salon||'la estación')}</b> a las <b>${fmtHora(sig.h)}</b>.</p><p>Cierren la dirección de grupo, recojan sus cosas y prepárense para salir a tiempo.</p>`,
      botones:[{t:'Ver el camino',fn:()=>{ irPanel('ruta'); }},{t:'Entendido',ghost:true}]}); });
}
function avisarAsis(o){ const p=prefs(); if(p.sonido) sonarTono(p.tono); if(p.vibracion&&navigator.vibrate) navigator.vibrate([200,100,200]);
  ventana({icono:'📋',kicker:'Asistencia',titulo:o.titulo,color:'#1f9d6b',html:o.html,botones:[{t:'Llamar a lista ahora',fn:()=>{ S.listaMom=o.mom; if(o.curso) S.listaCurso=o.curso; S.listaLocal=null; irPanel('lista'); }},{t:'Más tarde',ghost:true}]}); }

/* ---------- Rompecabezas ---------- */
const esRompe = f => f && /rompecabezas/i.test((f.area||'')+' '+(f.titulo||''));
const esHacer = f => f && /actividad(es)? del hacer|cambio clim/i.test(nrm30(f.area));
function rompecabezasHTML(){
  const img=(S.config&&S.config.rompecabezas_img)||'img/rompecabezas.jpg';
  return `<div class="rpz">${img?`<img src="${escHTML(img)}" alt="Rompecabezas del STEM Day">`:''}
    <h4>🧩 ¿Por qué esta actividad?</h4><p>El rompecabezas es una <b>representación simbólica de todo lo que el curso vivió hoy</b>. La imagen es una <b>mano</b> que guarda la riqueza natural de Colombia —el oso de anteojos, los colibríes, el jaguar, el delfín rosado, la ballena, los frailejones y las palmas de cera— junto a los desastres que estudiaron en el día: volcán, terremoto, incendio y deslizamiento. Al unir las piezas, el grupo descubre que <b>el cuidado del planeta está en nuestras manos</b> y que las soluciones aparecen cuando las matemáticas, las ciencias y la tecnología encajan… y cuando cada persona aporta su parte.</p>
    <h4>👩‍🎓 Qué deben hacer los estudiantes</h4><ol><li>Organizarse en equipos y repartir las piezas.</li><li>Armar el rompecabezas entre todos, conversando sobre lo que muestra cada pieza.</li><li>Al terminarlo, sentarse alrededor de la imagen para la conversación final.</li></ol>
    <h4>💬 Preguntas guía para conversar al terminar</h4><ol><li>¿Por qué creen que la imagen tiene la forma de una mano? ¿Qué nos quiere decir?</li><li>¿Qué animales y plantas de Colombia reconocen? ¿Cuál de ellos podría verse afectado por el cambio climático y por qué?</li><li>¿Qué desastres aparecen en la imagen? ¿Cuáles vieron hoy en el Coliseo y qué aprendieron sobre cómo prevenirlos?</li><li>Si faltara una pieza, ¿qué pasaría con la imagen? ¿Qué nos dice eso sobre el planeta y sobre el trabajo en equipo?</li><li>¿Qué acción concreta puede hacer nuestro curso, desde mañana, para cuidar lo que hay en esa mano?</li></ol>
    <p class="sm">El docente guía la conversación; no hay respuestas correctas o incorrectas.</p></div>`;
}
function revisarRompecabezas(){
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  S.cursos.forEach(c=>rutaCurso(c).filter(esRompe).forEach(s=>{ if(a.min<toMin(s.h)-2||a.min>toMin(s.f)) return; const k='steam_rompe_'+c; if(LS.get(k,false)) return; LS.set(k,true);
    ventana({icono:'🧩',kicker:`${escHTML(c)} · ${fmtHora(s.h)} – ${fmtHora(s.f)}`,titulo:'Construcción del rompecabezas',color:'#7b4bd6',html:rompecabezasHTML(),botones:[{t:'Entendido'}]}); }));
}
/* sección extra en la ficha de cada estación (la usa abrirParada) */
function fichaExtraV30(f){
  let h='';
  if(esRompe(f)) h+=`<div class="sec">${rompecabezasHTML()}</div>`;
  if(esHacer(f)){ window._fhNivel=f.nivel||'';
    h+=`<div class="sec hacer"><h3>🌎 Actividad del hacer</h3><p>La dirigen <b>estudiantes de 10.° y 11.°</b> con el apoyo de los docentes de Ciencias <b>Diana Cardona</b> y <b>Javier Téllez</b>.</p>
      ${f.estudiantes?`<p><small>Estudiante${/,| y |  /.test(f.estudiantes)?'s':''} a cargo en tu salón</small><br><b>${escHTML(f.estudiantes)}</b></p>`:''}
      ${S.config&&S.config.video_hacer?`<button class="btn" id="vHacer">▶ Ver el video explicativo</button>`:'<p class="sm">📹 El video explicativo de esta actividad estará disponible aquí antes del 23 de octubre.</p>'}</div>`;
  }
  return h;
}
/* v42: dos videos del hacer en el mismo campo de configuración: «Primaria | Bachillerato» */
function videoHacer(nivel){ const U=String((S.config&&S.config.video_hacer)||'').split(/\s*\|\s*|\s+/).filter(x=>/^https?:/i.test(x)); if(!U.length) return '';
  if(U.length===1) return U[0]; return /bach/i.test(nivel||'')?U[1]:U[0]; }
function nivelDocente(){ const r=(S.prog||[]).find(x=>(S.cursos||[]).includes(x.curso)); return r?r.nivel:''; }
window.videoHacer=videoHacer; window.nivelDocente=nivelDocente;
function bindFichaV30(){ const b=$('vHacer'); if(b) b.onclick=()=>verVideo('Actividades del hacer · Cambio climático',videoHacer(window._fhNivel||nivelDocente())); }
function verVideo(titulo,url){ ventana({icono:'▶',titulo:escHTML(titulo),html:`<div class="vbox pv">${videoHTML(url)}</div>`,botones:[{t:'Cerrar'}]}); }

/* ---------- Encuesta final de la jornada (una por curso) ---------- */
const ENC_FIN_DOC=[
  {k:'general',t:'¿Cómo calificas la jornada del STEM Day en general?',tipo:'estrellas'},
  {k:'organizacion',t:'Organización y puntualidad de las rotaciones',tipo:'estrellas'},
  {k:'app',t:'¿Qué tan útil te fue la app durante el día?',tipo:'estrellas'},
  {k:'mejor',t:'¿Qué fue lo mejor de la jornada?',tipo:'texto'},
  {k:'mejorar',t:'¿Qué mejorarías para la próxima versión?',tipo:'texto'}];
const ENC_FIN_GRUPO=[
  {k:'aprendieron',t:'¿Qué aprendieron hoy sobre el cambio climático que no sabían antes?',tipo:'texto'},
  {k:'conexion',t:'¿Cómo ayudan las matemáticas, las ciencias y la tecnología a enfrentar el cambio climático, según lo que vivieron hoy?',tipo:'texto'},
  {k:'pensar',t:'¿Qué actividad los hizo pensar más y por qué?',tipo:'texto'},
  {k:'compromiso',t:'¿Qué acción concreta se comprometen a hacer como curso para cuidar el planeta?',tipo:'texto'},
  {k:'sentir',t:'En una palabra, ¿cómo se sintió el grupo al final del día?',tipo:'op',op:['Inspirado','Curioso','Motivado','Comprometido','Sorprendido','Cansado']},
  {k:'participacion',t:'¿Qué tanto participó el grupo en esta conversación?',tipo:'estrellas'}];
function ultimoEspacio(c){ const acts=rutaCurso(c).filter(s=>s.tipo==='actividad'); return acts.length?acts[acts.length-1]:null; }
async function revisarEncuestaFinal(){
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  for(const c of S.cursos){ const u=ultimoEspacio(c); if(!u) continue; const desde=toMin(u.f)-20; if(a.min<desde) continue;
    const k='steam_encfin_av_'+c; if(LS.get(k,false)) continue; LS.set(k,true);
    const ya=await encuestaFinalDe(c); if(ya&&ya.perfil_id!==S.perfil.id&&!S.vistaComo) continue;
    ventana({icono:'📝',kicker:`Curso ${escHTML(c)} · cierre de la jornada`,titulo:'Encuesta final del STEM Day',color:'#c2410c',
      html:`<p>Faltan 20 minutos para terminar. Conversa con tus estudiantes las preguntas de reflexión, <b>resume las opiniones del grupo</b> y escríbelas en la encuesta. También queremos saber cómo te pareció el evento.</p>`,
      botones:[{t:'Responder ahora',fn:()=>abrirEncuestaFinal(c)},{t:'Más tarde',ghost:true}]}); }
}
async function encuestaFinalDe(c){ const r=await S.sb.from('sd_encuesta_final').select('curso,perfil_id,docente,respuestas,actualizado_en').eq('curso',c).maybeSingle(); return r.data||null; }
function encuestaFinalDisponible(){ const a=ahora(); if(a.fecha>S.config.fecha_evento) return true; if(a.fecha<S.config.fecha_evento) return false; return S.cursos.some(c=>{ const u=ultimoEspacio(c); return u&&a.min>=toMin(u.f)-20; }); }
async function abrirEncuestaFinal(c){
  c=c||S.curso; const prev=await encuestaFinalDe(c), R={...((prev&&prev.respuestas)||{})};
  const preg=(q,i)=>{ let x='';
    if(q.tipo==='estrellas') x=`<div class="estr" data-k="${q.k}">${[1,2,3,4,5].map(n=>`<span data-v="${n}" class="${R[q.k]>=n?'on':''}">★</span>`).join('')}</div>`;
    if(q.tipo==='op') x=`<div class="ops" data-k="${q.k}">${q.op.map(o=>`<span data-v="${escHTML(o)}" class="${R[q.k]===o?'on':''}">${escHTML(o)}</span>`).join('')}</div>`;
    if(q.tipo==='texto') x=`<textarea data-k="${q.k}" rows="3" maxlength="1200" placeholder="Escribe aquí…">${escHTML(R[q.k]||'')}</textarea>`;
    return `<div class="q" data-q="${q.k}"><label><b>${i}.</b> ${escHTML(q.t)}</label>${x}</div>`; };
  const w=$('encW');
  w.innerHTML=`<div class="enchd" style="--c:#c2410c"><span class="x" id="efX">✕</span><small>Encuesta final · Curso ${escHTML(c)}</small><h3>Cierre del STEM Day</h3><span>${prev?`Respondida por ${escHTML(prev.docente||'')} · puedes corregirla`:'Una sola encuesta por curso'}</span></div>
    <div class="encb"><h4>1. Tu evaluación del evento</h4>${ENC_FIN_DOC.map((q,i)=>preg(q,i+1)).join('')}
      <h4>2. Reflexión con tu grupo</h4><p class="sm" style="margin:-4px 0 8px">Conversa estas preguntas con todo el curso en este último espacio. Luego <b>resume en pocas líneas lo que opinaron los estudiantes</b>.</p>
      ${ENC_FIN_GRUPO.map((q,i)=>preg(q,i+1)).join('')}<p class="sm">Las respuestas las ve el equipo organizador del STEM Day.</p></div>
    <div class="encf"><button class="btn" id="efOk" style="background:#c2410c">${prev?'Guardar cambios':'Enviar encuesta final'}</button></div>`;
  w.hidden=false; w.scrollTop=0;
  w.querySelectorAll('.estr span').forEach(e=>e.onclick=()=>{ const k=e.parentNode.dataset.k, v=+e.dataset.v; R[k]=v; e.parentNode.querySelectorAll('span').forEach(x=>x.classList.toggle('on',+x.dataset.v<=v)); e.closest('.q').classList.remove('falta'); });
  w.querySelectorAll('.ops span').forEach(e=>e.onclick=()=>{ const k=e.parentNode.dataset.k; R[k]=e.dataset.v; e.parentNode.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===e)); e.closest('.q').classList.remove('falta'); });
  w.querySelectorAll('textarea').forEach(e=>e.oninput=()=>{ R[e.dataset.k]=e.value.trim(); e.closest('.q').classList.remove('falta'); });
  $('efX').onclick=()=>{ w.hidden=true; w.innerHTML=''; };
  $('efOk').onclick=async()=>{
    const falta=[...ENC_FIN_DOC,...ENC_FIN_GRUPO].filter(q=>R[q.k]==null||R[q.k]==='');
    w.querySelectorAll('.q').forEach(n=>n.classList.toggle('falta',falta.some(q=>q.k===n.dataset.q)));
    if(falta.length){ const n=w.querySelector('.q.falta'); n&&n.scrollIntoView({behavior:'smooth',block:'center'}); return toast('Responde las preguntas marcadas en rojo.','bad',3200); }
    const b=$('efOk'); b.disabled=true; b.textContent='Guardando…';
    const r=await S.sb.from('sd_encuesta_final').upsert({curso:c,perfil_id:S.perfil.id,docente:S.perfil.nombre,respuestas:R,actualizado_en:new Date().toISOString()},{onConflict:'curso'});
    if(r.error){ b.disabled=false; b.textContent='Enviar encuesta final'; return toast('No se pudo guardar: '+r.error.message,'bad',5000); }
    w.hidden=true; w.innerHTML=''; toast('¡Gracias! Encuesta final guardada.','ok');
  };
}

/* ---------- Avatar: sección exclusiva para usuarios Master (y administrador) ---------- */
const MST_OP={capa:['Ninguna','Capa dorada','Capa azul Cafam'],cab:['Ninguno','Corona STEM','Diadema de coordinación'],mano:['Nada','Tablet de coordinación','Megáfono']};
function editorMaster(c, av, prev){
  const tabs=c.querySelector('.atabs'), opts=c.querySelector('.opts'); if(!tabs||!opts) return;
  av.mst=av.mst?{...av.mst}:{capa:1,cab:0,mano:1,ins:true,aura:false};
  tabs.insertAdjacentHTML('beforeend','<span data-t="mst" class="tmst">👑 Master</span>');
  opts.insertAdjacentHTML('beforeend','<div class="pane" data-p="mst" hidden><div id="optMst"></div></div>');
  const pinta=()=>{ const L=av.mst, ch=(k,i,t)=>`<span class="chip ${L[k]===i?'on':''}" data-k="${k}" data-i="${i}">${escHTML(t)}</span>`;
    c.querySelector('#optMst').innerHTML=`<p class="sm" style="margin:6px 0 2px">Piezas exclusivas de los usuarios Master del STEM Day.</p>
      <div class="opt"><h4>Capa</h4><div class="row">${MST_OP.capa.map((x,i)=>ch('capa',i,x)).join('')}</div></div>
      <div class="opt"><h4>En la cabeza</h4><div class="row">${MST_OP.cab.map((x,i)=>ch('cab',i,x)).join('')}</div></div>
      <div class="opt"><h4>En la mano</h4><div class="row">${MST_OP.mano.map((x,i)=>ch('mano',i,x)).join('')}</div></div>
      <div class="opt"><h4>Distintivos</h4><div class="row"><span class="chip ${L.ins?'on':''}" data-b="ins">⭐ Insignia Master</span><span class="chip ${L.aura?'on':''}" data-b="aura">✨ Aura dorada</span></div></div>`;
    c.querySelectorAll('#optMst .chip').forEach(s=>s.onclick=()=>{ const d=s.dataset; if(d.b) L[d.b]=!L[d.b]; else L[d.k]=+d.i; pinta(); prev(); }); };
  pinta();
  tabs.querySelectorAll('span').forEach(t=>t.onclick=()=>{ tabs.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===t)); c.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.p!==t.dataset.t); });
}
