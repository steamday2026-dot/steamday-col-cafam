/* =====================================================================
   STEM Day · v36 · Copa STEM · Liga Master
   - Ronda de vigía: «📍 Llegué a mi zona» y reporte rápido en cada bloque de la Agenda Master.
   - Trivia de zona: 2 preguntas sobre la actividad que ocurre en esa zona (banco de la Copa).
   - Sello STEM: reconocimientos a cursos, estudiantes o docentes.
   - Las novedades le llegan en vivo al Org. Master y al administrador; los sellos, al curso.
   Los puntos los calcula el servidor (SQL 19-liga-master.sql).
   ===================================================================== */
const CM={ rep:{}, listo:false, ok:true };
const SELLOS={equipo:['🤝','Trabajo en equipo'],entorno:['🌱','Cuidado del entorno'],creatividad:['💡','Creatividad'],convivencia:['💛','Convivencia']};
const CM_FLUJO={fluido:'Fluido',lento:'Lento',represado:'Represado'}, CM_CONV={bien:'😊 Bien',regular:'😐 Regular',mal:'😟 Mal'};
const esCompMaster=()=>S.modo==='master'&&S.perfil.rol!=='admin';
const cmVista=()=>{ if(!S.vistaComo) return false; toast('Vista previa («Ver como»): así lo ve el Máster. Los puntos y los sellos solo se registran desde su propia cuenta.','',5000); return true; };
const cmEsDia=()=>ahora().fecha===S.config.fecha_evento;
const cmKey=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();

async function cmCargar(){ try{ const r=await S.sb.from('sd_master_reportes').select('*').eq('perfil_id',S.perfil.id); if(r.error) throw r.error; CM.rep={}; (r.data||[]).forEach(x=>CM.rep[x.agenda_id]=x); CM.ok=true; }catch(e){ CM.ok=false; } }

function cmIniciar(){
  if(CM.listo) return; CM.listo=true;
  if(esCompMaster()){
    cmCargar().then(()=>{ if(S.panel==='agenda') pintarAgenda(); tickAgenda(); });
    const pa=window.pintarAgenda; window.pintarAgenda=pintarAgenda=function(){ pa(); cmAgenda(); };
    const ta=window.tickAgenda; window.tickAgenda=tickAgenda=function(){ ta(); cmTarjeta(); };
    setInterval(cmRecordar,30000); setTimeout(cmRecordar,5000);
  }
  if(S.modo==='docente') setTimeout(cmSellosPendientes,6000);
  try{
    const ch=S.sb.channel('ligamaster');
    if(S.perfil.rol==='admin'||S.perfil.org_master) ch.on('postgres_changes',{event:'*',schema:'public',table:'sd_master_reportes'},p=>cmNovedad(p.new));
    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_sellos'},p=>cmSelloRecibido(p.new));
    ch.subscribe();
  }catch(e){}
  if(S.perfil.org_master&&!S.agNombres) S.sb.from('sd_perfiles').select('id,nombre').in('rol',['master','admin']).then(q=>{ S.agNombres={}; (q.data||[]).forEach(x=>S.agNombres[x.id]=firstName(x.nombre)); });
}
window.cmIniciar=cmIniciar;

/* ---------- bloque de agenda: ventana para actuar ---------- */
function cmEstado(b){ const m=minAhora(), ini=toMin(b.hora_inicio), fin=toMin(b.hora_fin);
  return { abierto:m>=ini-10&&m<fin, reportable:m>=ini-10&&m<=fin+30, futuro:m<ini-10, pasado:m>fin+30 }; }
function cmClave(b){ const i0=b.hora_inicio, f0=b.hora_fin, k=cmKey(b.lugar);
  const en=r=>r.tipo==='actividad'&&r.hora_inicio<f0&&r.hora_fin>i0, zona=r=>k&&cmKey(r.salon)&&(cmKey(r.salon).includes(k)||k.includes(cmKey(r.salon)));
  const f=S.prog.find(r=>en(r)&&zona(r));
  return f?{clave:copaClave(f),nombre:titA(f.titulo||f.area)}:{clave:'general',nombre:'el STEM Day y el cambio climático'}; }
function cmBotones(b,compacto){
  const e=cmEstado(b), r=CM.rep[b.id]||{}, out=[];
  if(!CM.ok) return '';
  if(r.llegada_en) out.push(`<span class="cmok">✓ Llegaste ${hDe(minDe(r.llegada_en))}</span>`);
  else if(e.abierto) out.push(`<button class="cmb ll" data-cm="ll" data-id="${b.id}">📍 Llegué a mi zona</button>`);
  if(r.reportado_en) out.push(`<span class="cmok">✓ Reporte enviado</span>${!compacto&&!LS.get('cm_triv_'+b.id,false)?`<button class="cmb tv" data-cm="tv" data-id="${b.id}">⚡ Trivia de zona</button>`:''}`);
  else if(e.reportable&&(r.llegada_en||minAhora()>=toMin(b.hora_inicio))) out.push(`<button class="cmb rp" data-cm="rp" data-id="${b.id}">📝 Reporte de la zona</button>`);
  if(!out.length&&e.futuro&&!compacto) out.push('<span class="cmfut">🏆 Ronda de vigía: podrás marcar tu llegada 10 min antes</span>');
  return out.length?`<div class="cmact">${out.join('')}</div>`:'';
}
function cmBind(el){ el.querySelectorAll('[data-cm]').forEach(x=>x.onclick=ev=>{ ev.stopPropagation(); const b=(S.agenda||[]).find(z=>String(z.id)===x.dataset.id); if(!b) return;
  if(x.dataset.cm==='ll') cmLlegue(b); if(x.dataset.cm==='rp') cmReporte(b); if(x.dataset.cm==='tv') cmTrivia(b); }); }
function cmAgenda(){
  const el=$('agPz'); if(!el||!esCompMaster()) return;
  if(!el.querySelector('#cmSel')) el.querySelector('h3')&&el.querySelector('h3').insertAdjacentHTML('afterend',`<div class="cmhead"><span>🏆 <b>Liga Master</b> · llega a tiempo, reporta tu zona, responde la trivia y otorga sellos</span><button class="b2 sm" id="cmSel">🏅 Otorgar Sello STEM</button></div>`);
  el.querySelectorAll('.agb').forEach(x=>{ const b=(S.agenda||[]).find(z=>String(z.id)===x.dataset.id); if(!b||x.nextElementSibling&&x.nextElementSibling.classList.contains('cmact')) return; const h=cmBotones(b); if(h) x.insertAdjacentHTML('afterend',h); });
  cmBind(el); if($('cmSel')) $('cmSel').onclick=()=>cmSello();
}
function cmTarjeta(){
  const card=$('agCard'); if(!card||card.hidden||card.classList.contains('min')||!esCompMaster()) return;
  const {cur,nxt}=bloqueAhora(), b=cur||nxt; if(!b) return; const h=cmBotones(b,true); if(!h) return;
  card.insertAdjacentHTML('beforeend',h); cmBind(card);
}
function cmRepintar(){ if(S.panel==='agenda') pintarAgenda(); tickAgenda(); }

/* ---------- 📍 llegada ---------- */
async function cmLlegue(b){
  if(cmVista()) return;
  const r=await S.sb.rpc('sd_master_llegue',{p_agenda:b.id}); if(r.error) return toast(r.error.message,'bad',4500);
  await cmCargar(); cmRepintar();
  if(r.data&&r.data.repetida) return toast('Tu llegada ya estaba registrada.','ok');
  const p=(r.data&&r.data.puntos)||0; if(window.copaSonar) copaSonar('puntos');
  ventana({icono:'📍',kicker:'Ronda de vigía',titulo:`¡Llegada registrada! +${p} pts`,color:'#173d7a',html:`<p>${p===40?'Llegaste a tiempo a':'Ya estás en'} <b>${escHTML(lugarTxt(b.lugar))}</b>.</p><p>Ahora observa la zona unos minutos y envía el <b>reporte</b>: suma 50 puntos y más si lo haces pronto.</p>`,
    botones:[{t:'📝 Hacer el reporte',fn:()=>cmReporte(b)},{t:'Más tarde',ghost:true}]});
}

/* ---------- 📝 reporte de la zona ---------- */
function cmReporte(b){
  const w=copaW(), R={orden:null,flujo:null,conv:null};
  w.innerHTML=`<div class="cwhd" style="background:linear-gradient(135deg,#0f5132,#1f9d6b)"><span class="x" id="cwX">✕</span><small>REPORTE DE ZONA · ${fmtHora(b.hora_inicio)} a ${fmtHora(b.hora_fin)}</small><h3>${escHTML(lugarTxt(b.lugar))}</h3></div>
    <div class="cwb"><p class="sm" style="margin:0 0 10px">Tres toques. Si hay una novedad, el Org. Master la recibe al instante.</p>
      <div class="cmq"><b>¿Todo en orden en la zona?</b><div class="cmops" data-k="orden"><span data-v="1">✅ Sí</span><span data-v="0">⚠️ Hay novedad</span></div></div>
      <div class="cmq"><b>Flujo de estudiantes</b><div class="cmops" data-k="flujo">${Object.entries(CM_FLUJO).map(([k,v])=>`<span data-v="${k}">${v}</span>`).join('')}</div></div>
      <div class="cmq"><b>Convivencia</b><div class="cmops" data-k="conv">${Object.entries(CM_CONV).map(([k,v])=>`<span data-v="${k}">${v}</span>`).join('')}</div></div>
      <div class="cmq"><b>Nota <small id="cmNotaR">(opcional)</small></b><textarea id="cmNota" rows="3" maxlength="300" placeholder="¿Qué observaste? ¿Qué se necesita?"></textarea></div>
      <button class="btn" id="cmEnv" style="background:#1f9d6b">Enviar reporte</button></div>`;
  $('cwX').onclick=copaCerrar;
  w.querySelectorAll('.cmops span').forEach(s=>s.onclick=()=>{ const k=s.parentNode.dataset.k; R[k]=s.dataset.v; s.parentNode.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===s)); if(k==='orden') $('cmNotaR').textContent=s.dataset.v==='0'?'(cuéntanos la novedad)':'(opcional)'; });
  $('cmEnv').onclick=async()=>{ if(cmVista()) return; if(R.orden==null||!R.flujo||!R.conv) return toast('Responde las tres preguntas','bad');
    $('cmEnv').disabled=true;
    const r=await S.sb.rpc('sd_master_reporte',{p_agenda:b.id,p_orden:R.orden==='1',p_flujo:R.flujo,p_conv:R.conv,p_nota:$('cmNota').value});
    if(r.error){ $('cmEnv').disabled=false; return toast(r.error.message,'bad',4500); }
    await cmCargar(); cmRepintar(); const p=(r.data&&r.data.puntos)||0; if(p&&window.copaSonar) copaSonar('puntos');
    const z=cmClave(b);
    w.innerHTML=`<div class="cwhd" style="background:linear-gradient(135deg,#0f5132,#1f9d6b)"><span class="x" id="cwX">✕</span><small>REPORTE ENVIADO</small><h3>¡Gracias, ${escHTML(firstName(S.perfil.nombre))}!</h3></div>
      <div class="cwb center"><div class="ccard center"><small>GANASTE</small><div class="cbig">${p} <span>pts</span></div></div>${p?copaConfeti():''}
      <p>Ahora la <b>trivia de zona</b>: 2 preguntas sobre <b>${escHTML(z.nombre)}</b>. 30 segundos cada una; más rápido, más puntos.</p>
      <button class="btn cgo" id="cmTv">⚡ Empezar la trivia</button><button class="btn ghost" id="cwC">Más tarde</button></div>`;
    $('cwX').onclick=$('cwC').onclick=copaCerrar; $('cmTv').onclick=()=>cmTrivia(b); };
}

/* ---------- ⚡ trivia de zona (mismo banco y reglas de la Copa) ---------- */
function cmTrivia(b){ if(cmVista()) return; const z=cmClave(b); LS.set('cm_triv_'+b.id,true); cmRepintar();
  copaPreguntas({curso:'M'+b.id,hora:b.hora_inicio,clave:z.clave,nombre:'Trivia de zona · '+z.nombre}); }

/* ---------- 🏅 Sello STEM ---------- */
function cmSello(pre){ pre=pre||{};
  const sh=$('sheet'), m=minAhora(), b=(bloqueAhora()||{}).cur, k=b?cmKey(b.lugar):'';
  const cursos=[...new Set(S.prog.filter(r=>r.tipo==='actividad'&&/^\d/.test(r.curso||'')).map(r=>r.curso))].sort((a,c)=>a.localeCompare(c,'es',{numeric:true}));
  const cerca=b?[...new Set(S.prog.filter(r=>r.tipo==='actividad'&&toMin(r.hora_inicio)<=m&&m<toMin(r.hora_fin)&&cmKey(r.salon)&&(cmKey(r.salon).includes(k)||k.includes(cmKey(r.salon)))).map(r=>r.curso))]:[];
  const docentes=[...new Set(S.prog.flatMap(r=>[r.acompanante,r.apoyo,r.docente_cargo]).filter(x=>x&&x.length>5&&!/director|codirector/i.test(x)).flatMap(x=>String(x).split(/\s+-\s+/)).map(x=>x.trim()))].sort();
  sh.innerHTML=`<div class="sh" style="background:#b45309"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Liga Master · reconocimientos</div><h3>🏅 Otorgar Sello STEM</h3></div><div class="sb">
    <p class="sm" style="margin:0 0 8px">Reconoce a quien veas haciendo algo destacado. Cada sello con una descripción de lo que viste suma <b>30 puntos</b> (hasta 6 en el día).</p>
    <div class="segs" id="slT"><span data-t="curso" class="on">Curso</span><span data-t="estudiante">Estudiante</span><span data-t="docente">Docente</span></div>
    <div id="slD"></div>
    <b style="display:block;margin:12px 0 6px;font-size:13px">Sello</b><div class="slops">${Object.entries(SELLOS).map(([k,[i,t]])=>`<span data-s="${k}"><i>${i}</i>${t}</span>`).join('')}</div>
    <b style="display:block;margin:12px 0 6px;font-size:13px">¿Qué viste?</b><textarea id="slTx" rows="3" maxlength="300" placeholder="Ej.: organizaron los materiales y ayudaron a otro curso a terminar el reto"></textarea>
    ${cmEsDia()?'':'<div class="warnbox" style="margin-top:10px">📅 Los sellos se otorgan el <b>viernes 23 de octubre</b>. Hoy puedes ver cómo funciona, pero aún no se pueden enviar.</div>'}
    <button class="btn" id="slOk" style="background:#b45309;margin-top:10px">Otorgar sello</button><div id="slMis"></div></div>`;
  sh.classList.add('open'); delete sh.dataset.tur; $('shX').onclick=cerrarSheet;
  let tipo=pre.tipo||'curso', sello=null;
  sh.querySelectorAll('#slT span').forEach(x=>x.classList.toggle('on',x.dataset.t===tipo));
  const dest=()=>{ $('slD').innerHTML=tipo==='curso'?`<select id="slC" class="cmsel"><option value="">Elige el curso…</option>${cerca.length?`<optgroup label="En tu zona ahora">${cerca.map(c=>`<option>${escHTML(c)}</option>`).join('')}</optgroup>`:''}<optgroup label="Todos">${cursos.map(c=>`<option>${escHTML(c)}</option>`).join('')}</optgroup></select>`
      :tipo==='estudiante'?`<input id="slN" class="cmsel" maxlength="80" placeholder="Nombre del estudiante"><select id="slC" class="cmsel"><option value="">Curso…</option>${cerca.concat(cursos.filter(c=>!cerca.includes(c))).map(c=>`<option>${escHTML(c)}</option>`).join('')}</select>`
      :`<input id="slN" class="cmsel" list="slDL" maxlength="80" placeholder="Nombre del docente"><datalist id="slDL">${docentes.map(d=>`<option value="${escHTML(d)}">`).join('')}</datalist>`; };
  dest(); if(pre.curso&&$('slC')) $('slC').value=pre.curso; if(pre.nombre&&$('slN')) $('slN').value=pre.nombre;
  sh.querySelectorAll('#slT span').forEach(s=>s.onclick=()=>{ tipo=s.dataset.t; sh.querySelectorAll('#slT span').forEach(x=>x.classList.toggle('on',x===s)); dest(); });
  sh.querySelectorAll('.slops span').forEach(s=>s.onclick=()=>{ sello=s.dataset.s; sh.querySelectorAll('.slops span').forEach(x=>x.classList.toggle('on',x===s)); });
  $('slOk').onclick=async()=>{ if(cmVista()) return; const c=$('slC')?$('slC').value:'', n=$('slN')?$('slN').value.trim():'';
    if(!cmEsDia()) return toast('Los sellos se otorgan el viernes 23 de octubre.','bad',4000);
    const destino=tipo==='curso'?c:n; if(!destino) return toast(tipo==='curso'?'Elige el curso':'Escribe el nombre','bad'); if(tipo==='estudiante'&&!c) return toast('Elige el curso del estudiante','bad'); if(!sello) return toast('Elige el sello','bad');
    $('slOk').disabled=true;
    const r=await S.sb.rpc('sd_master_sello',{p_tipo:tipo,p_destino:destino,p_curso:tipo==='docente'?null:c,p_sello:sello,p_desc:$('slTx').value});
    if(r.error){ $('slOk').disabled=false; return toast(r.error.message,'bad',4500); }
    const p=r.data.puntos||0; if(p&&window.copaSonar) copaSonar('puntos'); cerrarSheet();
    ventana({icono:SELLOS[sello][0],kicker:'Sello STEM otorgado',titulo:`${escHTML(destino)} recibió el sello «${SELLOS[sello][1]}»`,color:'#b45309',html:p?`<p>Sumaste <b>+${p} puntos</b> en la Liga Master. Llevas ${r.data.con_puntos} de 6 sellos con puntos.</p>`:`<p>El sello quedó registrado. ${$('slTx')&&$('slTx').value.trim().length<10?'Para sumar puntos, describe lo que viste (mínimo 10 letras).':'Ya completaste los 6 sellos con puntos del día.'}</p>`}); };
}
window.cmSello=cmSello;

/* ---------- recordatorios del Master ---------- */
function cmRecordar(){
  const a=ahora(); if(a.fecha!==S.config.fecha_evento||!esCompMaster()||!CM.ok||S.vistaComo) return;
  (S.agenda||[]).forEach(b=>{ const ini=toMin(b.hora_inicio), r=CM.rep[b.id]||{};
    if(!r.llegada_en&&a.min>=ini-2&&a.min<ini+10){ const k='cm_rll_'+b.id; if(!LS.get(k,false)){ LS.set(k,true);
      ventana({icono:'📍',kicker:'Ronda de vigía · Liga Master',titulo:`¿Ya estás en ${escHTML(lugarTxt(b.lugar))}?`,color:'#173d7a',html:'<p>Marca tu llegada: <b>+40 puntos</b> si es hasta 5 minutos después del inicio.</p>',botones:[{t:'📍 Llegué a mi zona',fn:()=>cmLlegue(b)},{t:'Más tarde',ghost:true}]}); } }
    if(r.llegada_en&&!r.reportado_en&&a.min>=ini+6&&a.min<toMin(b.hora_fin)){ const k='cm_rrp_'+b.id; if(!LS.get(k,false)){ LS.set(k,true);
      ventana({icono:'📝',kicker:'Liga Master',titulo:'¿Cómo está tu zona?',color:'#1f9d6b',html:`<p>Envía el reporte de <b>${escHTML(lugarTxt(b.lugar))}</b>: +50 puntos y +30 si lo haces en los primeros 10 minutos.</p>`,botones:[{t:'📝 Hacer el reporte',fn:()=>cmReporte(b)},{t:'Más tarde',ghost:true}]}); } } });
}

/* ---------- avisos en vivo ---------- */
function cmNovedad(x){
  if(!x||!x.reportado_en||(x.en_orden!==false&&x.convivencia!=='mal')) return; const k='cm_nov_'+x.perfil_id+'_'+x.agenda_id+'_'+(x.nota||''); if(LS.get(k,false)) return; LS.set(k,true);
  const nom=(S.agNombres&&S.agNombres[x.perfil_id])||'Un Master';
  if(window.sonarTono) sonarTono(prefs().tono);
  ventana({icono:'⚠️',kicker:'Novedad reportada · Liga Master',titulo:escHTML(lugarTxt(x.lugar||'')),color:'#c2410c',html:`<p><b>${escHTML(nom)}</b> · ${x.en_orden===false?'Hay novedad':'Todo en orden'} · Flujo: ${CM_FLUJO[x.flujo]||'—'} · Convivencia: ${CM_CONV[x.convivencia]||'—'}</p>${x.nota?`<p>«${escHTML(x.nota)}»</p>`:''}`});
}
function cmEsMio(x){
  if(!x) return false; if(x.curso&&(S.cursos||[]).includes(x.curso)) return true;
  if(x.destino_tipo==='docente'){ const a=nrmN(x.destino).split(' ').filter(w=>w.length>2), b=nrmN(S.perfil.nombre).split(' '); return a.length>=2&&a.filter(w=>b.includes(w)).length>=Math.min(2,a.length); }
  return false; }
function cmSelloRecibido(x){
  if(!x||S.modo!=='docente'||S.vistaComo||!cmEsMio(x)) return; const k='cm_sello_'+x.id; if(LS.get(k,false)) return; LS.set(k,true);
  const s=SELLOS[x.sello]||['🏅','Sello STEM']; if(window.copaSonar) copaSonar('podio');
  const tit=x.destino_tipo==='curso'?`¡Tu curso recibió el sello «${s[1]}»!`:x.destino_tipo==='docente'?`¡Recibiste el sello «${s[1]}»!`:`${escHTML(x.destino)} recibió el sello «${s[1]}»`;
  ventana({icono:s[0],kicker:`Sello STEM${x.curso?' · Curso '+escHTML(x.curso):''}`,titulo:tit,color:'#b45309',
    html:`${x.descripcion?`<p>«${escHTML(x.descripcion)}»</p>`:''}<p class="sm">Otorgado por ${escHTML(firstName(x.otorgado_por||'un Máster'))}.${x.destino_tipo==='docente'?' ¡Gracias por tu trabajo!':' ¡Cuéntaselo a tus estudiantes!'}</p>`,
    botones:[{t:'Entendido'},{t:'Ver los sellos de mi curso',ghost:true,fn:()=>cmMisSellos()}]});
}
async function cmLeerMios(){ try{ const r=await S.sb.from('sd_sellos').select('*').order('creado_en',{ascending:false}).limit(500); if(r.error) return []; return (r.data||[]).filter(cmEsMio); }catch(e){ return []; } }
async function cmSellosPendientes(){ if(S.vistaComo) return; const L=await cmLeerMios(); L.filter(x=>!LS.get('cm_sello_'+x.id,false)).slice(0,3).reverse().forEach(cmSelloRecibido); }
async function cmMisSellos(){
  const sh=$('sheet'); sh.innerHTML=`<div class="sh" style="background:#b45309"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Reconocimientos de los Máster</div><h3>🏅 Sellos de mi curso</h3></div><div class="sb" id="msB"><p class="sm">Cargando…</p></div>`;
  sh.classList.add('open'); delete sh.dataset.tur; $('shX').onclick=cerrarSheet;
  const L=await cmLeerMios();
  $('msB').innerHTML=L.length?`<p class="sm" style="margin:0 0 8px">Sellos que tu curso, tus estudiantes o tú han recibido durante el STEM Day.</p>`+L.map(x=>{ const s=SELLOS[x.sello]||['🏅','Sello']; return `<div class="cmnov sl"><b>${s[0]} ${escHTML(s[1])} · ${escHTML(x.destino_tipo==='curso'?'Curso '+x.destino:x.destino)}${x.destino_tipo==='estudiante'&&x.curso?' ('+escHTML(x.curso)+')':''}</b>${x.descripcion?`<i>«${escHTML(x.descripcion)}»</i>`:''}<span>Otorgado por ${escHTML(firstName(x.otorgado_por||''))} · ${hDe(minDe(x.creado_en))}</span></div>`; }).join('')
    :'<div class="okbox">Aún no hay sellos para tu curso. Los Máster los otorgan durante la jornada cuando ven algo destacado.</div>';
}
window.cmMisSellos=cmMisSellos;
/* desde Asistencia → curso: botones para otorgar el sello al curso o a un estudiante */
function cmAsisHook(el,c){
  if(!esCompMaster()) return; const h=el.querySelector('h3'); if(!h) return;
  h.insertAdjacentHTML('afterend',`<button class="b2 sm" id="cmSC" style="margin:6px 0 4px;border-color:#b45309;color:#b45309">🏅 Otorgar Sello STEM al curso ${escHTML(c)}</button><p class="sm" style="margin:0 0 6px">o toca 🏅 junto a un estudiante.</p>`);
  $('cmSC').onclick=()=>cmSello({tipo:'curso',curso:c});
  el.querySelectorAll('.est[data-sn]').forEach(e=>{ e.insertAdjacentHTML('beforeend',`<button class="cmsb" title="Otorgar Sello STEM">🏅</button>`); e.querySelector('.cmsb').onclick=()=>cmSello({tipo:'estudiante',curso:c,nombre:e.dataset.sn}); });
}
window.cmAsisHook=cmAsisHook;

/* ---------- panel de resultados (administrador y Org. Master) ---------- */
async function cmPanelHTML(){
  const [a,r,s]=await Promise.all([S.sb.rpc('sd_copa_master_admin'), S.sb.from('sd_master_reportes').select('*').order('reportado_en',{ascending:false}).limit(500), S.sb.from('sd_sellos').select('*').order('creado_en',{ascending:false}).limit(300)]);
  if(a.error) return `<div class="warnbox">La Liga Master aún no está activa: ${escHTML(a.error.message)}. Ejecuta el archivo <b>19-liga-master.sql</b>.</div>`;
  const R=a.data||[], REP=(r.data||[]), SEL=(s.data||[]); CM.panel={R,REP,SEL};
  const nombres={}; R.forEach(x=>nombres[x.correo]=x.nombre);
  const nov=REP.filter(x=>x.reportado_en&&(x.en_orden===false||x.convivencia==='mal'));
  return `<h3 style="margin-bottom:6px">🏅 Liga Master · ranking</h3>
    <button class="b1" id="cmXls" style="margin-bottom:8px">⬇ Descargar (Excel/CSV)</button>
    <table class="t"><tr><th>#</th><th>Master</th><th>Puntos</th><th>Bloques</th><th>Llegadas</th><th>Reportes</th><th>Aciertos</th><th>Sellos</th></tr>
    ${R.map((x,i)=>`<tr${i<3&&x.puntos?' style="background:#fff7dc;font-weight:700"':''}><td>${i<3&&x.puntos?['🥇','🥈','🥉'][i]:i+1}</td><td>${escHTML(x.nombre)}</td><td><b>${x.puntos}</b></td><td>${x.bloques}</td><td>${x.llegadas}</td><td>${x.reportes}</td><td>${x.aciertos}</td><td>${x.sellos}</td></tr>`).join('')}</table>
    <h3 style="margin:18px 0 6px">⚠️ Novedades reportadas (${nov.length})</h3>
    ${nov.length?nov.map(x=>`<div class="cmnov"><b>${fmtHora(x.hora_inicio)} · ${escHTML(lugarTxt(x.lugar||''))}</b><span>${x.en_orden===false?'Hay novedad':'En orden'} · Flujo ${CM_FLUJO[x.flujo]||'—'} · ${CM_CONV[x.convivencia]||'—'}</span>${x.nota?`<i>«${escHTML(x.nota)}»</i>`:''}</div>`).join(''):'<p class="sm">Sin novedades.</p>'}
    <h3 style="margin:18px 0 6px">🏅 Sellos otorgados (${SEL.length})</h3>
    ${SEL.length?SEL.map(x=>`<div class="cmnov sl"><b>${(SELLOS[x.sello]||['🏅'])[0]} ${escHTML(x.destino)}${x.curso&&x.destino!==x.curso?' · '+escHTML(x.curso):''}</b><span>${(SELLOS[x.sello]||['','Sello'])[1]} · por ${escHTML(x.otorgado_por||'')}</span>${x.descripcion?`<i>«${escHTML(x.descripcion)}»</i>`:''}</div>`).join(''):'<p class="sm">Aún no hay sellos.</p>'}
    <p class="sm" style="margin-top:12px">Puntos: llegada a tiempo 40 (20 hasta 15 min tarde, 10 después) · reporte 50 + rapidez hasta 30 · cada pregunta correcta 25 + rapidez hasta 25 · las dos +10 · sello con descripción 30 (máx. 6).</p>`;
}
function cmBindPanel(root){
  const b=root.querySelector('#cmXls'); if(!b||!CM.panel) return;
  b.onclick=()=>{ const {R,SEL}=CM.panel; const cs=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const L=[['Puesto','Master','Correo','Puntos','Bloques','Llegadas','Reportes','Aciertos','Sellos']].concat(R.map((x,i)=>[i+1,x.nombre,x.correo,x.puntos,x.bloques,x.llegadas,x.reportes,x.aciertos,x.sellos]))
      .concat([[],['Sellos'],['Para','Curso','Sello','Descripción','Otorgado por']]).concat(SEL.map(x=>[x.destino,x.curso,(SELLOS[x.sello]||['',''])[1],x.descripcion,x.otorgado_por]));
    const bl=new Blob(['﻿'+L.map(f=>f.map(cs).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}), a=document.createElement('a'); a.href=URL.createObjectURL(bl); a.download='liga-master-stem-day.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };
}
async function cmAbrirPanel(){
  const sh=$('sheet'); sh.innerHTML=`<div class="sh" style="background:#b45309"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Copa STEM</div><h3>🏅 Liga Master</h3></div><div class="sb" id="cmPB"><p class="sm">Cargando…</p></div>`;
  sh.classList.add('open'); delete sh.dataset.tur; $('shX').onclick=cerrarSheet; const el=$('cmPB'); el.innerHTML=await cmPanelHTML(); cmBindPanel(el);
}
window.cmPanelHTML=cmPanelHTML; window.cmBindPanel=cmBindPanel; window.cmAbrirPanel=cmAbrirPanel;
