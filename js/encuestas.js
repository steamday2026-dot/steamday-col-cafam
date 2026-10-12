/* =====================================================================
   STEM Day Cafam · Encuesta al finalizar cada actividad
   - Docente: al terminar cada actividad evalúa desde su punto de vista
     y registra lo que opinó su grupo (preguntas para hacer a los estudiantes).
   - Administrador: sección "Encuestas" con el tablero de resultados.
   Usa S, $, toast, LS, ahora, toMin, fmtHora, escHTML, AREA_C, AREA_N (app.js / mapa.js).
   ===================================================================== */
const ENC_DOC=[
  {k:'general',      t:'¿Cómo calificas la actividad en general?', tipo:'estrellas'},
  {k:'participacion',t:'Participación y motivación de los estudiantes', tipo:'estrellas'},
  {k:'tema',         t:'Relación con el tema del STEM Day (cambio climático y sostenibilidad)', tipo:'estrellas'},
  {k:'organizacion', t:'Organización, materiales y espacio', tipo:'estrellas'},
  {k:'tiempo',       t:'El tiempo de la actividad fue…', tipo:'op', op:['Faltó tiempo','Adecuado','Sobró tiempo']},
  {k:'repetir',      t:'¿Recomiendas repetir esta actividad el próximo año?', tipo:'op', op:['Sí','Tal vez','No']},
  {k:'comentario',   t:'Observaciones o sugerencias (opcional)', tipo:'texto', opcional:true}
];
const ENC_EST=[
  {k:'gusto',       t:'¿Les gustó la actividad?', tipo:'op', op:['😀 Mucho','🙂 Más o menos','🙁 Poco']},
  {k:'aprendizaje', t:'¿Aprendieron algo nuevo sobre el cuidado del planeta?', tipo:'op', op:['Sí, mucho','Algo','Poco']},
  {k:'dificultad',  t:'¿Fue fácil entender el reto?', tipo:'op', op:['Fácil','Normal','Difícil']},
  {k:'otra',        t:'¿Les gustaría hacer otra actividad como esta?', tipo:'op', op:['Sí','Tal vez','No']},
  {k:'lo_mejor',    t:'¿Qué fue lo que más les gustó? (opcional)', tipo:'texto', opcional:true},
  {k:'participantes',t:'¿Cuántos estudiantes participaron? (opcional)', tipo:'numero', opcional:true}
];
const ENC_ANTES=7;   // la encuesta se habilita 7 minutos antes de terminar la actividad
const encClave=(curso,h)=>curso+'|'+h;
const evaluable=s=>s.tipo==='actividad'&&!/direcci[oó]n de curso/i.test(s.area||'');
const nomAct=s=>(s.titulo&&window.tituloA?window.tituloA(s.titulo):'')||String(s.area||'').replace('Ciencias Naturales. Actividades del Cambio Climático','Cambio climático').replace('Construcción de Rompecabezas','Rompecabezas');

/* ---------- DOCENTE ---------- */
async function cargarMisEncuestas(){
  if(S.encMias) return S.encMias;
  try{ const r=await S.sb.from('sd_encuestas').select('curso,hora_inicio,respuestas').eq('perfil_id',S.perfil.id).limit(200);
    if(r.error) throw r.error; S.encMias={}; (r.data||[]).forEach(x=>S.encMias[encClave(x.curso,x.hora_inicio)]=x.respuestas||{}); }
  catch(e){ S.encMias=null; }
  return S.encMias;
}
function terminada(s){ const a=ahora(); if(a.fecha!==S.config.fecha_evento) return a.fecha>S.config.fecha_evento; return a.min>=toMin(s.hora_fin||s.f)-ENC_ANTES; }
function encuestasPendientes(){
  if(S.modo!=='docente'||!S.encMias) return [];
  const out=[]; (S.cursos||[]).forEach(c=>rutaCurso(c).filter(evaluable).forEach(s=>{ if(terminada(s)&&!S.encMias[encClave(c,s.hora_inicio)]) out.push({...s,curso:c}); }));
  return out;
}
async function revisarEncuestas(silencio){
  if(S.modo!=='docente') return; await cargarMisEncuestas(); const p=encuestasPendientes(), b=$('btnEnc'); if(!b) return;
  b.hidden=!p.length; $('encN').textContent=p.length; const mb=$('btnColegio'); if(mb&&mb.offsetTop) b.style.top=mb.offsetTop+'px';
  if(!p.length) return;
  // aviso automático solo para la actividad que acaba de terminar (máximo 30 min); las demás quedan en el botón 📝
  const u=p.slice().sort((x,y)=>toMin(y.hora_fin)-toMin(x.hora_fin))[0], k='steam_encp_'+S.perfil.id+'_'+encClave(u.curso,u.hora_inicio), a=ahora();
  const reciente=a.fecha===S.config.fecha_evento && a.min-toMin(u.hora_fin)<=30;
  if(!silencio && reciente && !LS.get(k,false) && $('encW').hidden && !$('modalBox').innerHTML && S.panel==='ruta' && !(S.mapa&&S.mapa.busy) && !document.querySelector('.arrive.on')){
    LS.set(k,true);
    $('modalBox').innerHTML=`<div class="modal"><div class="mbox"><div class="k" style="color:var(--brand)">📝 ${a.min<toMin(u.hora_fin)?'La actividad está por terminar':'Terminó una actividad'}</div><h3>${escHTML(nomAct(u))}</h3>
      <p>Curso ${escHTML(u.curso)} · ${fmtHora(u.hora_inicio)} – ${fmtHora(u.hora_fin)}. Cuéntanos cómo te pareció y pregúntale a tu grupo qué opinó. Toma 2 minutos.</p>
      <button class="btn" id="encYa">Responder ahora</button><button class="btn ghost" id="encLuego" style="margin-top:8px">Más tarde</button></div></div>`;
    $('encYa').onclick=()=>{ $('modalBox').innerHTML=''; abrirEncuesta(u); };
    $('encLuego').onclick=()=>{ $('modalBox').innerHTML=''; toast('Puedes responderla con el botón 📝 de Mi ruta.','',3500); };
  }
}
function listaPendientes(){
  const p=encuestasPendientes(); if(!p.length) return toast('No tienes encuestas pendientes.','ok');
  if(p.length===1) return abrirEncuesta(p[0]);
  const sh=$('sheet');
  sh.innerHTML=`<div class="sh" style="background:var(--brand)"><span class="x" id="shX">✕ Cerrar</span><div style="font-size:12px;opacity:.85">Encuestas pendientes</div><h3>Evalúa tus actividades</h3></div>
    <div class="sb">${p.map((s,i)=>`<div class="rot encp" data-i="${i}" style="cursor:pointer"><b>${escHTML(s.curso)}</b><span>${escHTML(nomAct(s))}<br>${fmtHora(s.hora_inicio)} · ${escHTML(s.salon||'')}</span></div>`).join('')}</div>`;
  sh.classList.add('open'); $('shX').onclick=cerrarSheet;
  sh.querySelectorAll('.encp').forEach(n=>n.onclick=()=>{ cerrarSheet(); abrirEncuesta(p[+n.dataset.i]); });
}
function abrirEncuesta(s){
  const curso=s.curso||S.curso, prev=(S.encMias&&S.encMias[encClave(curso,s.hora_inicio)])||{}, R={...prev};
  const col=AREA_C[s.categoria||s.cat]||'#173d7a';
  const preg=(q,i)=>{ let c='';
    if(q.tipo==='estrellas') c=`<div class="estr" data-k="${q.k}">${[1,2,3,4,5].map(n=>`<span data-v="${n}" class="${R[q.k]>=n?'on':''}" role="button" aria-label="${n} de 5">★</span>`).join('')}</div>`;
    if(q.tipo==='op') c=`<div class="ops" data-k="${q.k}">${q.op.map(o=>`<span data-v="${escHTML(o)}" class="${R[q.k]===o?'on':''}">${escHTML(o)}</span>`).join('')}</div>`;
    if(q.tipo==='texto') c=`<textarea data-k="${q.k}" rows="2" maxlength="600" placeholder="Escribe aquí…">${escHTML(R[q.k]||'')}</textarea>`;
    if(q.tipo==='numero') c=`<input type="number" min="0" max="60" data-k="${q.k}" value="${R[q.k]!=null?escHTML(R[q.k]):''}" placeholder="Ej. 32">`;
    return `<div class="q" data-q="${q.k}"><label><b>${i}.</b> ${escHTML(q.t)}</label>${c}</div>`; };
  const w=$('encW');
  w.innerHTML=`<div class="enchd" style="--c:${col}"><span class="x" id="encX">✕</span><small>Encuesta · ${escHTML(curso)} · ${fmtHora(s.hora_inicio)}</small><h3>${escHTML(nomAct(s))}</h3><span>${escHTML(s.area||'')}${s.salon?' · '+escHTML(s.salon):''}</span></div>
    <div class="encb">
      <h4>1. Tu evaluación como docente</h4>${ENC_DOC.map((q,i)=>preg(q,i+1)).join('')}
      <h4>2. Pregúntale a tu grupo</h4><p class="sm" style="margin:-4px 0 8px">Haz estas preguntas a tus estudiantes (pueden responder levantando la mano) y marca la respuesta de la mayoría.</p>
      ${ENC_EST.map((q,i)=>preg(q,i+1)).join('')}
      <p class="sm">Tus respuestas solo las ve el administrador del STEM Day.</p>
    </div>
    <div class="encf"><button class="btn" id="encOk">${Object.keys(prev).length?'Guardar cambios':'Enviar encuesta'}</button></div>`;
  w.hidden=false; w.scrollTop=0;
  w.querySelectorAll('.estr span').forEach(e=>e.onclick=()=>{ const k=e.parentNode.dataset.k, v=+e.dataset.v; R[k]=v; e.parentNode.querySelectorAll('span').forEach(x=>x.classList.toggle('on',+x.dataset.v<=v)); e.closest('.q').classList.remove('falta'); });
  w.querySelectorAll('.ops span').forEach(e=>e.onclick=()=>{ const k=e.parentNode.dataset.k; R[k]=e.dataset.v; e.parentNode.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x===e)); e.closest('.q').classList.remove('falta'); });
  w.querySelectorAll('textarea,input').forEach(e=>e.oninput=()=>{ R[e.dataset.k]=e.type==='number'?(e.value===''?null:Math.max(0,Math.min(60,+e.value))):e.value.trim(); });
  $('encX').onclick=()=>{ w.hidden=true; w.innerHTML=''; };
  $('encOk').onclick=async()=>{
    const falta=[...ENC_DOC,...ENC_EST].filter(q=>!q.opcional&&(R[q.k]==null||R[q.k]===''));
    w.querySelectorAll('.q').forEach(n=>n.classList.toggle('falta',falta.some(q=>q.k===n.dataset.q)));
    if(falta.length){ const n=w.querySelector('.q.falta'); n&&n.scrollIntoView({behavior:'smooth',block:'center'}); return toast('Responde las preguntas marcadas en rojo.','bad',3200); }
    const b=$('encOk'); b.disabled=true; b.textContent='Guardando…';
    const fila={ perfil_id:S.perfil.id, docente:S.perfil.nombre||S.perfil.correo, curso, grado:s.grado||'', nivel:s.nivel||'', hora_inicio:s.hora_inicio,
      area:s.area||'', categoria:s.categoria||s.cat||'', titulo:s.titulo||'', salon:s.salon||'', respuestas:R, actualizado_en:new Date().toISOString() };
    const r=await S.sb.from('sd_encuestas').upsert(fila,{onConflict:'perfil_id,curso,hora_inicio'});
    if(r.error){ b.disabled=false; b.textContent='Enviar encuesta'; return toast('No se pudo guardar: '+r.error.message,'bad',5000); }
    (S.encMias=S.encMias||{})[encClave(curso,s.hora_inicio)]=R; w.hidden=true; w.innerHTML=''; toast('¡Gracias! Encuesta guardada.','ok'); revisarEncuestas(true); if(window.copaTrasEncuesta) copaTrasEncuesta(s,curso,R);
  };
}

/* ---------- ADMINISTRADOR: tablero ---------- */
async function cargarEncuestas(){
  let out=[]; for(let i=0;;i+=1000){ const r=await S.sb.from('sd_encuestas').select('*').order('id').range(i,i+999); if(r.error) throw r.error; out=out.concat(r.data||[]); if(!r.data||r.data.length<1000) break; }
  S.enc=out; return out;
}
const prom=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const f1=v=>v==null?'—':v.toFixed(1).replace('.',',');
const pct=(n,d)=>d?Math.round(100*n/d):0;
async function pintarEncuestas(){
  const el=$('encPz'); if(!S.enc) el.innerHTML='<p class="sm">Cargando encuestas…</p>';
  try{ if(!S.enc||S.encSucia){ await cargarEncuestas(); S.encSucia=false; } }catch(e){ el.innerHTML=`<div class="alertbox">No se pudieron cargar las encuestas: ${escHTML(e.message)}.<br>¿Ya ejecutaste el archivo 09-encuestas.sql en Supabase?</div>`; return; }
  const fN=S.encNivel||'Todos', fA=S.encArea||'todas';
  const E=S.enc.filter(x=>(fN==='Todos'||x.nivel===fN)&&(fA==='todas'||(x.categoria||'gen')===fA));
  const esperadas=S.prog.filter(r=>evaluable(r)&&(fN==='Todos'||r.nivel===fN)&&(fA==='todas'||(r.categoria||'gen')===fA)).length;
  const val=k=>E.map(x=>+x.respuestas[k]).filter(v=>v>0);
  const g=prom(val('general')), docentes=new Set(E.map(x=>x.perfil_id)).size, mucho=E.filter(x=>String(x.respuestas.gusto||'').includes('Mucho')).length;
  let h=`<h3>Encuestas de las actividades</h3><div class="sub">Lo que respondieron los docentes al terminar cada actividad. Solo lo ve el administrador.</div>
    <div class="segs wrap">${['Todos','Primaria','Bachillerato'].map(n=>`<span data-n="${n}" class="${n===fN?'on':''}">${n}</span>`).join('')}</div>
    <div class="segs wrap">${[['todas','Todas las áreas'],['tec','Tecnología'],['mat','Matemáticas'],['cie','Ciencias'],['gen','Otras']].map(([k,t])=>`<span data-a="${k}" class="${k===fA?'on':''}">${t}</span>`).join('')}</div>
    <div class="kpi"><div><b>${E.length}</b><small>encuestas recibidas</small></div><div><b>${pct(E.length,esperadas)}%</b><small>de ${esperadas} esperadas</small></div>
      <div><b>${f1(g)}<i> / 5</i></b><small>valoración general</small></div><div><b>${pct(mucho,E.length)}%</b><small>grupos: les gustó mucho</small></div></div>
    <div class="sm" style="margin:-4px 0 10px">${docentes} docente${docentes===1?'':'s'} han respondido.</div>`;
  if(!E.length){ el.innerHTML=h+'<div class="alertbox">Aún no hay encuestas con estos filtros. Aparecerán aquí a medida que los docentes terminen sus actividades.</div>'; return bindEnc(el); }
  /* criterios (1 a 5) */
  h+=`<div class="dcard"><h4>Evaluación de los docentes <small>promedio de 1 a 5</small></h4>${ENC_DOC.filter(q=>q.tipo==='estrellas').map(q=>{ const v=prom(val(q.k)); return `<div class="hb" title="${escHTML(q.t)}: ${f1(v)} de 5 (${val(q.k).length} respuestas)"><span>${escHTML(q.t.replace(/ \(.*\)/,''))}</span><div><i style="width:${v?v/5*100:0}%"></i></div><b>${f1(v)}</b></div>`; }).join('')}</div>`;
  /* por área */
  const AR=['tec','mat','cie','gen'].map(c=>{ const xs=E.filter(x=>(x.categoria||'gen')===c); return [c,xs,prom(xs.map(x=>+x.respuestas.general).filter(v=>v>0))]; }).filter(a=>a[1].length);
  if(fA==='todas'&&AR.length>1) h+=`<div class="dcard"><h4>Valoración general por área</h4>${AR.map(([c,xs,v])=>`<div class="hb" title="${AREA_N[c]||c}: ${f1(v)} de 5 (${xs.length} encuestas)"><span><i class="dot" style="background:${AREA_C[c]}"></i>${c==='gen'?'Otras':AREA_N[c]}</span><div><i style="width:${v?v/5*100:0}%;background:${AREA_C[c]}"></i></div><b>${f1(v)}</b></div>`).join('')}</div>`;
  /* opción múltiple: tiempo, repetir y voz de los estudiantes */
  const TON=['#173d7a','#7d9fd6','#d5deee'];
  const apil=(q)=>{ const n=q.op.map(o=>E.filter(x=>x.respuestas[q.k]===o).length), tot=n.reduce((a,b)=>a+b,0)||1;
    return `<div class="ekst"><span>${escHTML(q.t)}</span><div class="sb2">${n.map((v,i)=>v?`<i style="width:${v/tot*100}%;background:${TON[i]}" title="${escHTML(q.op[i])}: ${v} (${pct(v,tot)}%)"></i>`:'').join('')}</div>
      <div class="lg">${q.op.map((o,i)=>`<em><i style="background:${TON[i]}"></i>${escHTML(o)} <b>${pct(n[i],tot)}%</b></em>`).join('')}</div></div>`; };
  h+=`<div class="dcard"><h4>Tiempo y continuidad</h4>${ENC_DOC.filter(q=>q.tipo==='op').map(apil).join('')}</div>`;
  h+=`<div class="dcard"><h4>La voz de los estudiantes <small>respuesta de la mayoría del grupo</small></h4>${ENC_EST.filter(q=>q.tipo==='op').map(apil).join('')}
    ${(()=>{ const p=E.map(x=>+x.respuestas.participantes).filter(v=>v>0); return p.length?`<p class="sm" style="margin-top:6px">Estudiantes reportados: <b>${p.reduce((a,b)=>a+b,0)}</b> en ${p.length} encuestas.</p>`:''; })()}</div>`;
  /* ranking de actividades */
  const A={}; E.forEach(x=>{ const k=(x.categoria||'gen')+'|'+(nomAct(x)||x.area); (A[k]=A[k]||{c:x.categoria||'gen',t:nomAct(x)||x.area,xs:[]}).xs.push(x); });
  const rk=Object.values(A).map(a=>({...a,v:prom(a.xs.map(x=>+x.respuestas.general).filter(v=>v>0)),m:pct(a.xs.filter(x=>String(x.respuestas.gusto||'').includes('Mucho')).length,a.xs.length)})).sort((a,b)=>(b.v||0)-(a.v||0)||b.xs.length-a.xs.length);
  h+=`<div class="dcard"><h4>Actividades <small>ordenadas por valoración</small></h4><table class="dt"><tr><th>Actividad</th><th>Enc.</th><th>★</th><th>Les gustó mucho</th></tr>
    ${rk.map(a=>`<tr><td><i class="dot" style="background:${AREA_C[a.c]||AREA_C.gen}"></i>${escHTML(a.t)}</td><td>${a.xs.length}</td><td><b>${f1(a.v)}</b></td><td>${a.m}%</td></tr>`).join('')}</table></div>`;
  /* comentarios */
  const C=E.filter(x=>x.respuestas.comentario||x.respuestas.lo_mejor).sort((a,b)=>String(b.actualizado_en).localeCompare(a.actualizado_en));
  h+=`<div class="dcard"><h4>Comentarios <small>${C.length}</small></h4>${C.length?C.slice(0,60).map(x=>`<div class="cm"><small>${escHTML(x.curso)} · ${escHTML(nomAct(x))} · ${escHTML(x.docente||'')}</small>${x.respuestas.comentario?`<p>💬 ${escHTML(x.respuestas.comentario)}</p>`:''}${x.respuestas.lo_mejor?`<p>⭐ Lo que más les gustó: ${escHTML(x.respuestas.lo_mejor)}</p>`:''}</div>`).join(''):'<p class="pend">Sin comentarios todavía.</p>'}</div>
    <button class="btn ghost" id="encXls">⬇ Descargar todas las respuestas (Excel)</button>`;
  el.innerHTML=h; bindEnc(el);
}
function bindEnc(el){
  el.querySelectorAll('[data-n]').forEach(s=>s.onclick=()=>{ S.encNivel=s.dataset.n; pintarEncuestas(); });
  el.querySelectorAll('[data-a]').forEach(s=>s.onclick=()=>{ S.encArea=s.dataset.a; pintarEncuestas(); });
  const x=$('encXls'); if(x) x.onclick=descargarEncuestas;
}
async function descargarEncuestas(){
  try{ const XLSX=await window.cargarXLSX();
    const rows=(S.enc||[]).map(x=>{ const o={Fecha:new Date(x.actualizado_en||x.creado_en).toLocaleString('es-CO'),Docente:x.docente,Nivel:x.nivel,Grado:x.grado,Curso:x.curso,Hora:x.hora_inicio,Área:x.area,Actividad:nomAct(x),Salón:x.salon};
      [...ENC_DOC,...ENC_EST].forEach(q=>o[q.t]=x.respuestas[q.k]??''); return o; });
    const wb=XLSX.utils.book_new(), ws=XLSX.utils.json_to_sheet(rows); XLSX.utils.book_append_sheet(wb,ws,'Encuestas'); XLSX.writeFile(wb,'encuestas-stem-day.xlsx');
  }catch(e){ toast('No se pudo generar el Excel: '+e.message,'bad',5000); }
}
