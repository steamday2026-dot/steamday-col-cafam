/* =====================================================================
   STEM Day Cafam · Copa STEM (competencia de docentes)
   - v47: 10 minutos antes de terminar cada actividad salen 2 preguntas al azar (30 s cada una; más rápido, más puntos).
   - v47: 5 minutos antes sale la encuesta: puntos por responder, por rapidez y por la opinión.
   - Barra fija abajo con el podio en vivo (top 10), avisos y sonidos.
   Las respuestas correctas las revisa el servidor (SQL 11-copa-stem.sql).
   ===================================================================== */
const COPA_SND={correcta:'sonidos/correcta.mp3',incorrecta:'sonidos/incorrecta.mp3',puntos:'sonidos/puntos.mp3',podio:'sonidos/podio.mp3',aviso:'sonidos/aviso.mp3'};
const COPA_T=30;          // segundos por pregunta
const COPA_ANTES=10;      // v47: la trivia sale 10 minutos antes de terminar la actividad
const copaAntes=()=>{ const n=+(S.config&&S.config.copa_antes); return n>0?n:COPA_ANTES; };   // v48: lo cambia el administrador
let COPA={rank:null, prev:null, ok:true, buf:{}, t:null, pend:[], liga:null};
const copaLiga=()=>COPA.liga||(S.modo==='master'&&S.perfil&&S.perfil.rol!=='admin'?'mst':'doc');
const copaYoCompite=()=>COPA.liga?false:(S.modo==='docente'||(S.modo==='master'&&S.perfil.rol!=='admin'));

/* ---------- sonidos (Web Audio, con los archivos de Descript) ---------- */
async function copaSonar(k){
  try{ if(typeof prefs==='function' && !prefs().sonido) return; desbloquearAudio(); const ac=_actx; if(!ac) return;
    if(!COPA.buf[k]){ const r=await fetch(COPA_SND[k]); COPA.buf[k]=await ac.decodeAudioData(await r.arrayBuffer()); }
    const s=ac.createBufferSource(); s.buffer=COPA.buf[k]; s.connect(ac.destination); s.start(); }catch(e){}
}
/* ---------- utilidades ---------- */
function copaClave(r){
  const A=window.ActSTEM; const t=r.titulo||r.actividad||r.area||'';
  const k=A&&A.clave({titulo:t,frase:r.frase||''}); if(k) return /^d_/.test(k)?'tec':k;   // v47: los desastres naturales comparten el banco de Tecnología
  const n=String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  if(/desastres/.test(n)||(r.categoria||r.cat)==='tec') return 'tec';
  if(/^general/.test(n)) return 'general';
  return n.replace(/[^a-z0-9]+/g,' ').trim();
}
function copaSegDesdeAviso(s){ // segundos desde que se habilitó la encuesta (5 min antes del final)
  const a=ahora(); let seg=(a.min-(toMin(s.hora_fin||s.f)-ENC_ANTES))*60;
  try{ const d=_simBase&&!isNaN(_simBase.d)?new Date(_simBase.d.getTime()+(Date.now()-_simBase.t0)):new Date(Date.now()-5*3600e3); seg+=d.getUTCSeconds(); }catch(e){}
  if(a.fecha>S.config.fecha_evento) seg=99999; return Math.max(0,seg);
}
const copaRap=seg=>seg<=60?40:seg<=180?25:seg<=300?10:0;
const copaCara=(av,c='')=>{ av=av||{}; const r=av.lid?'lid':av.mst?'mst':''; return `<span class="cav ${r} ${c}"><svg viewBox="-25 -106 50 52">${typeof avatarFondo==='function'?avatarFondo(av,-25,-106,50,52):''}${avatarPose(av,{})}</svg>${r?`<em class="cbadge">${r==='lid'?'⭐':'👑'}</em>`:''}</span>`; };
function copaPendKey(){ return 'copa_pend_'+(S.perfil&&S.perfil.id)+(typeof copaEns==='function'?copaEns():''); }
function copaPend(){ return LS.get(copaPendKey(),[]); }
function copaSetPend(l){ LS.set(copaPendKey(),l); copaBarra(); }
function copaW(){ let w=$('copaW'); if(!w){ w=document.createElement('div'); w.id='copaW'; w.className='copaw'; $('s-main').appendChild(w); } w.hidden=false; return w; }
function copaCerrar(){ const w=$('copaW'); if(w){ w.hidden=true; w.innerHTML=''; } clearInterval(COPA.t); }

/* ---------- 1) después de guardar la encuesta ---------- */
async function copaTrasEncuesta(s,curso,R){
  if(S.vistaComo||S.modo!=='docente') return;
  const seg=copaSegDesdeAviso(s), opinion=String(R.comentario||'').trim().length>=15;
  let total=0;
  try{ const r=await S.sb.rpc('sd_copa_encuesta',{p_curso:curso,p_hora:s.hora_inicio,p_seg:seg,p_opinion:opinion}); if(r.error) throw r.error; total=r.data||0; }
  catch(e){ COPA.ok=false; return; }   // la Copa no está activa (falta el SQL 11)
  const rap=copaRap(seg), item={curso,hora:s.hora_inicio,clave:copaClave(s),nombre:nomAct(s)};
  // v47: la trivia ya salió 10 minutos antes; solo se ofrece aquí si sigue pendiente o si aún no había salido
  const kO=copaOfrKey(item), yaSalio=LS.get(kO,false), pendiente=copaPend().some(x=>x.curso===curso&&x.hora===s.hora_inicio);
  if(!yaSalio){ LS.set(kO,true); copaSetPend([...copaPend(),item]); }
  const ofrecer=!yaSalio||pendiente;
  if(total>0) copaSonar('puntos');
  const w=copaW();
  w.innerHTML=`<div class="cwhd" style="background:linear-gradient(135deg,#1f9d6b,#16805a)"><span class="x" id="cwX">✕</span><small>📝 ENCUESTA · ${escHTML(curso)}</small><h3>${escHTML(nomAct(s))}</h3></div>
   <div class="cwb center"><div style="font-size:56px">🎉</div><h3>¡Encuesta enviada!</h3>
   <div class="chips">${total?`<span class="cchip ok">📝 +50</span>${rap?`<span class="cchip gold">⚡ +${rap} rápida</span>`:''}${opinion?'<span class="cchip ok">💬 +20 opinión</span>':''}`:'<span class="cchip">Ya habías sumado estos puntos</span>'}</div>
   ${ofrecer?`<button class="btn cgo" id="cwGo">⚡ Aún tienes la trivia: hasta 110 pts más</button>
   <p class="sm">30 segundos por pregunta · un solo intento</p><button class="btn ghost" id="cwLuego" style="margin-top:6px">Más tarde</button>`:`<button class="btn" id="cwLuego">Ver el podio</button>`}</div>`;
  $('cwX').onclick=()=>copaCerrar();
  $('cwLuego').onclick=()=>{ copaCerrar(); if(ofrecer) toast('Tus preguntas quedan en la barra 🏆 Copa STEM.','',3500); else copaPodio(); };
  if($('cwGo')) $('cwGo').onclick=()=>copaPreguntas(item);
}

/* ---------- 1b) v47 · trivia 10 minutos antes de terminar la actividad (sin esperar la encuesta) ---------- */
const copaEns=()=>{ try{ return typeof _sim!=='undefined'&&_sim?'_ens'+_sim:''; }catch(_){ return ''; } };   // v49: en modo ensayo cada ensayo empieza de cero
const copaOfrKey=it=>'copa_ofr_'+(S.perfil&&S.perfil.id)+'_'+it.curso+'_'+it.hora+copaEns();
function copaRevisar(){
  if(S.modo!=='docente'||!S.config) return;   // v49: también en «Ver como» (vista previa) y aunque el podio no haya cargado
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  const nuevos=[];
  (S.cursos||[]).forEach(c=>rutaCurso(c).filter(evaluable).forEach(s=>{ const fin=toMin(s.hora_fin||s.f);
    if(a.min<fin-copaAntes()||a.min>=fin) return;
    const it={curso:c,hora:s.hora_inicio,clave:copaClave(s),nombre:nomAct(s)}, k=copaOfrKey(it);
    if(LS.get(k,false)) return; LS.set(k,true); it.faltan=fin-a.min; nuevos.push(it); }));
  if(!nuevos.length) return;
  copaSetPend([...copaPend().filter(x=>!nuevos.some(n=>n.curso===x.curso&&n.hora===x.hora)),...nuevos]);
  const w=$('copaW'); if(w&&!w.hidden) return;   // ya hay algo abierto: queda en la barra
  const f=nuevos[0].faltan; copaInvitar(nuevos[0],f>1?`¡Faltan ${f} minutos!`:'¡Falta 1 minuto!');
}
function copaInvitar(it,titulo){
  copaSonar('aviso');
  const v=copaW();
  v.innerHTML=`<div class="cwhd"><span class="x" id="cwX">✕</span><small>⚡ TRIVIA COPA STEM · ${escHTML(it.curso)}</small><h3>${escHTML(titulo)}</h3><span class="cact">🌍 ${escHTML(it.nombre)}</span></div>
   <div class="cwb center"><div style="font-size:52px">🧠</div><h3>2 preguntas sobre esta actividad</h3>
   <p class="sm">30 segundos por pregunta · un solo intento · más rápido, más puntos</p>
   <button class="btn cgo" id="cwGo">⚡ Responder ahora (hasta +110 pts)</button><button class="btn ghost" id="cwLuego" style="margin-top:6px">Más tarde</button></div>`;
  $('cwX').onclick=$('cwLuego').onclick=()=>{ copaCerrar(); toast('Tus preguntas quedan en la barra 🏆 Copa STEM.','',3500); };
  $('cwGo').onclick=()=>copaPreguntas(it);
}
window.copaRevisar=copaRevisar;
/* v48 · el administrador lanza la trivia cuando quiere: sale a los docentes que estén en esa actividad */
function copaLanzada(L){
  if(!L||S.modo!=='docente'||!S.config) return;
  if(Date.now()-new Date(L.creado_en).getTime()>45*60000) return;   // solo lanzamientos recientes
  const a=ahora(); if(a.fecha!==S.config.fecha_evento) return;
  const pend=copaPend(), lista=[];
  (S.cursos||[]).forEach(c=>rutaCurso(c).filter(evaluable).forEach(s=>{
    if(a.min<toMin(s.hora_inicio||s.h)||a.min>=toMin(s.hora_fin||s.f)) return;
    const it={curso:c,hora:s.hora_inicio,clave:copaClave(s),nombre:nomAct(s)};
    if(L.clave!=='*'&&L.clave!==it.clave) return;
    const kL='copa_lz_'+L.id+'_'+c+copaEns(); if(LS.get(kL,false)) return; LS.set(kL,true);
    const yaSalio=LS.get(copaOfrKey(it),false), pendiente=pend.some(x=>x.curso===c&&x.hora===it.hora);
    if(yaSalio&&!pendiente) return;   // ya la respondió
    LS.set(copaOfrKey(it),true); lista.push(it); }));
  if(!lista.length) return;
  copaSetPend([...copaPend().filter(x=>!lista.some(n=>n.curso===x.curso&&n.hora===x.hora)),...lista]);
  const w=$('copaW'); if(w&&!w.hidden) return;
  copaInvitar(lista[0],'¡Es hora de la trivia!');
}
async function copaLanzamientos(){
  if(S.modo!=='docente') return;
  try{ const r=await S.sb.from('sd_copa_lanzar').select('*').gte('creado_en',new Date(Date.now()-45*60000).toISOString()).order('id'); (r.data||[]).forEach(copaLanzada); }catch(_){}
}

/* ---------- 2) las dos preguntas ---------- */
async function copaPreguntas(it){
  if(S.vistaComo){ copaCerrar(); toast('Vista previa («Ver como»): así le aparece la trivia al docente. Las respuestas solo se registran desde su propia cuenta.','',5000); return; }
  const w=copaW(); w.innerHTML='<div class="cwb center"><div class="spin"></div><p class="sm">Preparando tus preguntas…</p></div>';
  let qs=[]; try{ const r=await S.sb.rpc('sd_copa_preguntas',{p_curso:it.curso,p_hora:it.hora,p_clave:it.clave}); if(r.error) throw r.error; qs=r.data||[]; }
  catch(e){ w.innerHTML=`<div class="cwb center"><p>No se pudieron cargar las preguntas: ${escHTML(e.message)}</p><button class="btn" id="cwC">Cerrar</button></div>`; $('cwC').onclick=copaCerrar; return; }
  const faltan=qs.filter(q=>!q.respondida);
  if(!qs.length){ copaSetPend(copaPend().filter(x=>!(x.curso===it.curso&&x.hora===it.hora))); w.innerHTML=`<div class="cwb center"><div style="font-size:48px">🗂️</div><h3>Aún no hay preguntas para esta actividad</h3><p class="sm">Tus puntos de la encuesta ya cuentan.</p><button class="btn" id="cwC">Entendido</button></div>`; $('cwC').onclick=copaCerrar; return; }
  if(!faltan.length){ copaSetPend(copaPend().filter(x=>!(x.curso===it.curso&&x.hora===it.hora))); return copaResumen(it,0); }
  let ganado=0, idx=qs.length-faltan.length;
  const una=(q)=>new Promise(res=>{
    const n=qs.indexOf(q)+1, ops=Object.entries(q.opciones||{});
    w.innerHTML=`<div class="cwhd"><span class="x" id="cwX">✕</span><small>⚡ PREGUNTA ${n} DE ${qs.length} · HASTA +50 PTS</small><h3>Responde y suma puntos</h3><span class="cact">🌍 ${escHTML(it.nombre)}</span>
      <div class="cprog">${qs.map((_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div><div class="ctimer"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" class="bg"/><circle cx="24" cy="24" r="20" class="fg" id="ctR"/></svg><b id="ctN">${COPA_T}</b></div></div>
      <div class="cwb"><div class="cq">${escHTML(q.pregunta)}</div>${ops.map(([k,t])=>`<div class="copt" data-k="${k}"><b>${k}</b><span>${escHTML(t)}</span></div>`).join('')}<div id="cRes"></div></div>`;
    $('cwX').onclick=()=>{ clearInterval(COPA.t); copaCerrar(); toast('Puedes seguir desde la barra 🏆 Copa STEM. El reloj de esta pregunta ya corrió.','',4000); res(null); };
    const t0=performance.now(); let listo=false;
    const enviar=async k=>{ if(listo) return; listo=true; clearInterval(COPA.t); const ms=Math.round(performance.now()-t0);
      w.querySelectorAll('.copt').forEach(o=>o.classList.add('off'));
      let r; try{ const x=await S.sb.rpc('sd_copa_responder',{p_curso:it.curso,p_hora:it.hora,p_pregunta:q.id,p_opcion:k||'',p_ms:ms}); if(x.error) throw x.error; r=x.data; }
      catch(e){ toast('No se pudo guardar la respuesta: '+e.message,'bad',4000); res(null); return; }
      const ok=!!r.correcta; w.querySelectorAll('.copt').forEach(o=>{ if(o.dataset.k===r.correcta_op) o.classList.add('ok'); else if(o.dataset.k===k) o.classList.add('bad'); });
      const p=(r.puntos||0)+(r.rapidez||0)+(r.bono||0); ganado+=p;
      copaSonar(ok?'correcta':'incorrecta');
      if(ok&&window.avatarCelebrar) setTimeout(()=>avatarCelebrar(S.perfil.avatar,`+${(r.puntos||0)+(r.rapidez||0)+(r.bono||0)} pts`),250);   // v38
      $('cRes').innerHTML=ok?`<div class="cpop">+${r.puntos} <small>⚡+${r.rapidez}</small>${r.bono?` <small>🎯+${r.bono}</small>`:''}</div>`+copaConfeti():`<div class="cmiss">${k?'Esta vez no 🙁':'Se acabó el tiempo ⏱'} · La correcta era la <b>${escHTML(r.correcta_op)}</b></div>`;
      setTimeout(()=>res(true),ok?1900:2300); };
    w.querySelectorAll('.copt').forEach(o=>o.onclick=()=>enviar(o.dataset.k));
    const C=125.6; COPA.t=setInterval(()=>{ const s=COPA_T-(performance.now()-t0)/1000; const e=$('ctN'),c=$('ctR'); if(!e) return clearInterval(COPA.t);
      e.textContent=Math.max(0,Math.ceil(s)); c.style.strokeDashoffset=(C*(1-Math.max(0,s)/COPA_T)).toFixed(1); if(s<=5) e.parentNode.classList.add('low'); if(s<=0) enviar(''); },200);
  });
  for(const q of faltan){ const r=await una(q); if(r===null) return; idx++; }
  copaSetPend(copaPend().filter(x=>!(x.curso===it.curso&&x.hora===it.hora)));
  copaResumen(it,ganado);
}
function copaConfeti(){ return '<div class="cconf">'+Array.from({length:22},(_,i)=>`<i style="left:${(i*37)%100}%;background:${['#ffd34d','#2f6fde','#1f9d6b','#e5484d','#7b4bd6'][i%5]};animation-delay:${(i%7)*.08}s"></i>`).join('')+'</div>'; }

/* ---------- 3) resumen ---------- */
async function copaResumen(it,ganado){
  const w=copaW(); await copaRanking(true); const yo=COPA.rank&&COPA.rank.yo, tot=COPA.rank&&COPA.rank.total;
  w.innerHTML=`<div class="cwhd"><span class="x" id="cwX">✕</span><small>RESULTADO · ${escHTML(it.nombre)}</small><h3>¡Excelente, ${escHTML(firstName(S.perfil.nombre))}!</h3></div>
   <div class="cwb"><div class="ccard center"><small>GANASTE EN LAS PREGUNTAS</small><div class="cbig">${ganado} <span>pts</span></div></div>
   ${yo?`<div class="ccard crow">${copaCara(S.perfil.avatar,'lg')}<div><small>TU PUESTO EN LA COPA STEM</small><div class="cpos">${yo.pos}.º</div><div class="sm">de ${tot} ${copaLiga()==='mst'?'Master':'docentes'} · ${yo.puntos} pts</div></div></div>`:''}
   <button class="btn cgo" id="cwPod">🏆 Ver el podio</button><button class="btn ghost" id="cwC" style="margin-top:8px">Volver a mi ruta</button></div>`;
  if(ganado>0) copaSonar('puntos');
  $('cwX').onclick=$('cwC').onclick=copaCerrar; $('cwPod').onclick=()=>{ copaCerrar(); copaPodio(); };
}

/* ---------- 4) ranking, barra y podio ---------- */
async function copaRanking(silencio){
  try{ const r=await S.sb.rpc(copaLiga()==='mst'?'sd_copa_ranking_master':'sd_copa_ranking'); if(r.error) throw r.error; COPA.ok=true;
    const prev=COPA.rank; COPA.rank=r.data||{top:[],total:0}; copaBarra(); if(window.cmTop10&&S.panel==='agenda') cmTop10(); if(!$('copaSheet').hidden) copaPodio(true);
    if(prev&&!silencio) copaCambios(prev,COPA.rank); }
  catch(e){ COPA.ok=false; const b=$('copaBar'); if(b) b.hidden=true; }
}
function copaCambios(a,b){
  const l0=a.top[0], l1=b.top[0]; let msg=null, k=null;
  if(l1&&(!l0||l0.id!==l1.id)){ msg=`🏆 ¡${l1.nombre} pasa al 1.er lugar!`; k=l1; }
  else { const t0=a.top.slice(0,3).map(x=>x.id).join(), t1=b.top.slice(0,3).map(x=>x.id).join(); if(t0!==t1){ const n=b.top.slice(0,3).find(x=>!a.top.slice(0,3).some(y=>y.id===x.id))||b.top[1]; msg=`🏆 ${n.nombre} entra al podio (${n.pos}.º)`; k=n; } }
  let sub=''; if(a.yo&&b.yo&&b.yo.pos<a.yo.pos) sub=`¡Subiste al ${b.yo.pos}.º puesto!`;
  if(!msg&&sub){ msg='🚀 '+sub; sub=''; k={avatar:S.perfil.avatar}; }
  if(!msg) return;
  const bar=$('copaBar'); if(bar){ bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash'); }
  copaSonar('podio');
  let t=$('copaToast'); if(!t){ t=document.createElement('div'); t.id='copaToast'; t.className='ctoast'; $('s-main').appendChild(t); }
  t.innerHTML=`${copaCara(k&&k.avatar,'gold')}<div><b>${escHTML(msg)}</b>${sub?`<div>${escHTML(sub)}</div>`:''}</div>`; t.className='ctoast on'; t.onclick=()=>{ t.className='ctoast'; copaPodio(); };
  clearTimeout(COPA.tt); COPA.tt=setTimeout(()=>t.className='ctoast',5200);
}
function copaBarra(){
  const b=$('copaBar'); if(!b) return; const R=COPA.rank;
  if(!COPA.ok||!R){ b.hidden=true; return; } b.hidden=false;
  const pend=S.modo==='docente'&&!S.vistaComo?copaPend().length:0;
  b.innerHTML=`<span class="ctr">🏆</span><div class="cttl">Copa STEM${copaLiga()==='mst'?' · Liga Master':''}<small>${pend?`⚡ ${pend} ${pend>1?'actividades':'actividad'} con preguntas`:R.total?'Toca para ver el podio':'¡Aún nadie suma puntos!'}</small></div>
   <div class="cmini">${R.top.slice(0,3).map((x,i)=>copaCara(x.avatar,['g','s','b'][i])).join('')}</div>${R.yo&&copaYoCompite()?`<span class="cme">Tú ${R.yo.pos}.º</span>`:''}${pend?'<span class="cdot"></span>':''}`;
  b.onclick=()=>copaPodio();
}
function copaPodio(refresca){
  const sh=$('copaSheet'), R=COPA.rank||{top:[],total:0}; sh.hidden=false; const T=R.top;
  const pl=(r)=>{ const x=T[r]; if(!x) return `<div class="cpl p${r+1} vac"><div class="cblk">${r+1}</div></div>`;
    return `<div class="cpl p${r+1}">${r===0?'<span class="ccrown">👑</span>':''}${copaCara(x.avatar,'pod')}<div class="cnm">${escHTML(x.nombre)}</div><div class="cpt">${x.puntos} pts</div><div class="cblk">${r+1}</div></div>`; };
  const pend=S.modo==='docente'&&!S.vistaComo?copaPend():[];
  sh.innerHTML=`<div class="cpodbg"><div class="cphd"><span class="x" id="cpX">✕</span><b>🏆 Copa STEM</b><small>En vivo · ${R.total||0} ${copaLiga()==='mst'?'Master':'docentes'} en competencia</small><div class="cligas"><span data-l="doc" class="${copaLiga()==='doc'?'on':''}">Docentes</span><span data-l="mst" class="${copaLiga()==='mst'?'on':''}">Liga Master</span></div></div>
    <div class="cstage">${pl(1)}${pl(0)}${pl(2)}</div></div>
    <div class="clst">${pend.length?`<button class="btn cgo" id="cpPend" style="margin:4px 0 10px">⚡ Responder preguntas pendientes (${pend.length})</button>`:''}
    ${T.slice(3,10).map(x=>`<div class="cit ${R.yo&&R.yo.pos===x.pos&&copaYoCompite()?'me':''}"><span class="n">${x.pos}</span>${copaCara(x.avatar)}<span class="nm">${escHTML(x.nombre)}</span><span class="p">${x.puntos}</span></div>`).join('')}
    ${R.yo&&R.yo.pos>10&&copaYoCompite()?`<div class="cit me"><span class="n">${R.yo.pos}</span>${copaCara(S.perfil.avatar)}<span class="nm">Tú</span><span class="p">${R.yo.puntos}</span></div>`:''}
    ${!T.length?`<p class="sm" style="text-align:center;margin-top:20px">Aún nadie suma puntos. ${copaLiga()==='mst'?'¡Marca tu llegada a tu zona para empezar!':'¡Responde la encuesta de tu actividad para empezar!'}</p>`:''}
    <p class="sm" style="margin-top:12px;text-align:center">${copaLiga()==='mst'?'Liga Master: llegada a tu zona hasta 40 · reporte 50 + rapidez hasta 30 · trivia de zona 25 + rapidez hasta 25 por pregunta · las dos +10 · cada Sello STEM 30 (máx. 6)':'Puntos: encuesta 50 · rapidez hasta 40 · opinión 20 · cada pregunta correcta 25 + rapidez hasta 25 · las dos correctas +10'}</p></div>`;
  $('cpX').onclick=()=>{ sh.hidden=true; if(COPA.liga){ COPA.liga=null; copaRanking(true); } };
  sh.querySelectorAll('.cligas [data-l]').forEach(e=>e.onclick=async()=>{ const def=(S.modo==='master'&&S.perfil.rol!=='admin')?'mst':'doc'; COPA.liga=e.dataset.l===def?null:e.dataset.l; await copaRanking(true); copaPodio(true); });
  if($('cpPend')) $('cpPend').onclick=()=>{ sh.hidden=true; copaPreguntas(pend[0]); };
  if(!refresca) sh.querySelectorAll('.cpl').forEach((e,i)=>e.animate([{transform:'translateY(40px)',opacity:0},{transform:'none',opacity:1}],{duration:600,delay:[150,0,300][i],easing:'cubic-bezier(.2,1.3,.3,1)',fill:'backwards'}));
}
function copaIniciar(){
  if(!$('copaBar')) return;
  copaRanking(true); clearInterval(COPA.iv); COPA.iv=setInterval(()=>copaRanking(false),60000);
  clearInterval(COPA.rv); COPA.rv=setInterval(copaRevisar,20000); setTimeout(copaRevisar,4000); setTimeout(copaLanzamientos,5000);
  if(!COPA.vis){ COPA.vis=true; document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ setTimeout(copaRevisar,1200); setTimeout(copaLanzamientos,1600); } }); }
  if(!COPA.chL){ try{ COPA.chL=S.sb.channel('copa-lanzar').on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_copa_lanzar'},p=>copaLanzada(p.new)).subscribe(); }catch(_){} }
  if(!COPA.ch){ COPA.ch=S.sb.channel('copa').on('postgres_changes',{event:'INSERT',schema:'public',table:'sd_copa_puntos'},()=>{ clearTimeout(COPA.rt); COPA.rt=setTimeout(()=>copaRanking(false),1800); }).subscribe(); }
}
window.copaTrasEncuesta=copaTrasEncuesta; window.copaIniciar=copaIniciar; window.copaClave=copaClave;
