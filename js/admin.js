/* =====================================================================
   STEM Day Cafam · Panel del administrador
   Pestañas: Importar Excel · Programación · Usuarios · Correcciones · Avisos · Configuración
   ===================================================================== */
(function(){
  'use strict';
  const S = () => window.STEAM;
  const $ = id => document.getElementById(id);
  const sb = () => S().sb;
  let tab = 'importar', lectura = null, filtro = { nivel:'Primaria', curso:'' };

  // Usuarios Master (coordinadores de ciclo y de área, y Rectora). Carlos es administrador.
  const MASTERS = [
    ['Molina Mantilla Adriana','amolina@cafam.edu.co','Rectora'],
    ['Mejía Tolosa Yaqueline','ymejia@colegio.cafam.edu.co','Coordinación Ciclo TR°, 1° y 2°'],
    ['López Ramírez Andrea','anlopez@colegio.cafam.edu.co','Coordinación Ciclo 3°, 4° y 5°'],
    ['Hoyos Hoyos William','whoyos@colegio.cafam.edu.co','Coordinación Ciclo 6°, 7° y 8°'],
    ['Estupiñan Zabala Myriam Rosalba','mestupinan@colegio.cafam.edu.co','Coordinación Ciclo 9°, 10° y 11°'],
    ['Acero Molina Liz Pieranllely','lpacero@colegio.cafam.edu.co','Coordinación Matemáticas'],
    ['Celis Calderón Michael Andrés','mcelis@colegio.cafam.edu.co','Coordinación Ciencias Naturales'],
    ['Acevedo Betancourt Andres Elias','aeacevedo@colegio.cafam.edu.co','Coordinación Sociales'],
    ['Villamil Lopez Nubia Maria','nmvillamil@colegio.cafam.edu.co','Coordinación Humanidades'],
    ['Ibañez Castillo Karen Liliana','klibanez@colegio.cafam.edu.co','Coordinación Ed. Física'],
    ['Sandoval González Heidi Tatiana','tsandoval@colegio.cafam.edu.co','Coordinación Bilingüismo Bachillerato'],
    ['Rincon Peña Jasleidy','jrincon@colegio.cafam.edu.co','Coordinación Bilingüismo Primaria']
  ];
  const ADMIN = ['Castro Rojas Carlos Arturo','carcastro@colegio.cafam.edu.co','Coordinación Tecnología · Administrador'];

  function aviso(msg, tipo){ if(typeof toast==='function') toast(msg, tipo, 4000); }
  function cargarXLSX(){
    if(window.XLSX) return Promise.resolve();
    return new Promise((ok, fail) => { const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload=ok; s.onerror=()=>fail(new Error('No se pudo cargar el lector de Excel. Revisa la conexión.'));
      document.head.appendChild(s); });
  }
  function descargar(nombre, texto){
    const b=new Blob(['﻿'+texto],{type:'text/csv;charset=utf-8'}), a=document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=nombre; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  }
  window.cargarXLSX = cargarXLSX;
  const csvCell = v => { const t=String(v==null?'':v); return /[",;\n]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t; };

  /* ---------------- estructura ---------------- */
  function abrir(){
    if(!S() || !S().perfil || S().perfil.rol!=='admin') return;
    show('s-admin');
    $('admBody').innerHTML = `
      <div class="top"><div class="logo"><div class="mark"><i></i><i></i><i></i><i></i></div><div><b>STEM Day · Administración</b><small>${escHTML(S().perfil.nombre)}</small></div></div>
        <button class="b2" id="admVolver">← Volver a la app</button></div>
      <div class="desk"><div class="tabs" id="admTabs">
        <span data-t="importar">Importar Excel</span><span data-t="programacion">Programación</span><span data-t="usuarios">Usuarios</span><span data-t="lideres">⭐ Líderes</span><span data-t="agenda">📅 Agenda Master</span>
        <span data-t="correcciones">Correcciones de curso</span><span data-t="avisos">Avisos generales</span><span data-t="estudiantes">Estudiantes</span><span data-t="copa">🏆 Copa STEM</span><span data-t="config">Configuración</span></div>
        <div class="tbody" id="admTab"></div></div>`;
    $('admVolver').onclick = async () => { show('s-main'); if(window.recargarApp) await window.recargarApp(); };
    $('admTabs').querySelectorAll('span').forEach(s => s.onclick = () => irTab(s.dataset.t));
    irTab(tab);
  }
  function irTab(t){
    tab=t; $('admTabs').querySelectorAll('span').forEach(s=>s.classList.toggle('on', s.dataset.t===t));
    const f={importar:tImportar, programacion:tProgramacion, usuarios:tUsuarios, lideres:tLideres, agenda:tAgenda, correcciones:tCorrecciones, avisos:tAvisos, estudiantes:tEstudiantes, copa:tCopa, config:tConfig}[t];
    $('admTab').innerHTML='<p class="sm">Cargando…</p>'; f().catch(e=>{ $('admTab').innerHTML=`<div class="warnbox">Error: ${escHTML(e.message)}</div>`; });
  }

  /* ---------------- Estudiantes (llamado a lista) ---------------- */
  async function tEstudiantes(){
    const { count } = await sb().from('sd_estudiantes').select('id',{count:'exact',head:true});
    $('admTab').innerHTML = `
      <p>Carga un Excel con una fila por estudiante y estas columnas (en la primera fila): <b>Grado</b>, <b>Curso</b>, <b>Estudiante</b> y, si quieres, <b>Documento</b>.
      Puede tener una o varias hojas; se leen todas. Al cargarlo se <b>reemplaza</b> la lista completa (y la asistencia ya registrada se borra).</p>
      <table class="t" style="max-width:520px"><tr><th>Grado</th><th>Curso</th><th>Estudiante</th><th>Documento</th></tr><tr><td>Cuarto</td><td>4D</td><td>Acosta Rincón Valentina</td><td>1023456789</td></tr></table>
      <p class="sm">Estudiantes cargados actualmente: <b>${count||0}</b></p>
      <div class="drop" id="dropE">Arrastra aquí el Excel de estudiantes o <b>toca para elegir el archivo</b></div><input type="file" id="fxE" accept=".xlsx,.xls,.csv" hidden><div id="estRes"></div>`;
    const drop=$('dropE'), fx=$('fxE'); drop.onclick=()=>fx.click(); fx.onchange=()=>{ if(fx.files[0]) leerEst(fx.files[0]); };
    drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) leerEst(e.dataTransfer.files[0]); };
  }
  async function leerEst(file){
    const res=$('estRes'); res.innerHTML='<p class="sm">Leyendo…</p>';
    try{
      await cargarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
      const filas=[]; const orden={};
      wb.SheetNames.forEach(n=>{ XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''}).forEach(r=>{ const k={}; Object.keys(r).forEach(c=>k[norm(c)]=r[c]);
        const nombre=String(k.estudiante||k.nombre||k['nombre del estudiante']||'').trim(), curso=String(k.curso||'').trim().toUpperCase(), grado=String(k.grado||'').trim();
        if(!nombre||!curso) return; orden[curso]=(orden[curso]||0)+1; filas.push({grado,curso,nombre,documento:String(k.documento||'').trim(),orden:orden[curso]}); }); });
      if(!filas.length) throw new Error('No se encontraron filas con las columnas Grado, Curso y Estudiante.');
      const cursos=Object.keys(orden).sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
      res.innerHTML=`<div class="okbox">Se leyeron <b>${filas.length}</b> estudiantes de <b>${cursos.length}</b> cursos: ${cursos.map(c=>`${escHTML(c)} (${orden[c]})`).join(', ')}.</div><button class="b1" id="estOk">Reemplazar la lista de estudiantes</button>`;
      $('estOk').onclick=async()=>{ $('estOk').disabled=true; $('estOk').textContent='Guardando…';
        const {data,error}=await sb().rpc('sd_importar_estudiantes',{p_filas:filas});
        if(error){ res.innerHTML=`<div class="warnbox">No se pudo guardar: ${escHTML(error.message)}</div>`; return; }
        aviso(`Lista cargada: ${data} estudiantes`,'ok'); const st=S(); if(st){ st.est=null; st.listaLocal=null; } tEstudiantes(); };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message)}</div>`; }
  }


  /* ---------------- Copa STEM: banco de preguntas y ranking ---------------- */
  async function tCopa(){
    $('admTab').innerHTML='<p class="sm">Cargando…</p>';
    const q=await sb().from('sd_preguntas').select('clave,actividad,area').limit(5000);
    if(q.error){ $('admTab').innerHTML=`<div class="warnbox">La Copa STEM aún no está activa: ${escHTML(q.error.message)}.<br>Ejecuta el archivo <b>11-copa-stem.sql</b> en Supabase.</div>`; return; }
    const cnt={}; (q.data||[]).forEach(r=>{ const k=(r.actividad||r.clave); cnt[k]=(cnt[k]||0)+1; });
    const rk=await sb().rpc('sd_copa_admin'); const R=rk.data||[];
    $('admTab').innerHTML=`
      <h3 style="margin-bottom:8px">Banco de preguntas</h3>
      <p>Carga el Excel <b>banco-preguntas-copa-stem.xlsx</b> diligenciado (hoja «Preguntas»). Al cargarlo se <b>reemplaza</b> el banco (las preguntas ya respondidas se conservan).</p>
      <p class="sm">Preguntas cargadas: <b>${(q.data||[]).length}</b>${Object.keys(cnt).length?' · '+Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${escHTML(k)} (${v})`).join(', '):''}</p>
      <div class="drop" id="dropQ">Arrastra aquí el Excel de preguntas o <b>toca para elegir el archivo</b></div><input type="file" id="fxQ" accept=".xlsx,.xls" hidden><div id="qRes"></div>
      <h3 style="margin:26px 0 8px">Ranking completo</h3>
      ${R.length?`<button class="b1" id="cpXls" style="margin-bottom:10px">⬇ Descargar ranking (Excel/CSV)</button>
      <table class="t"><tr><th>#</th><th>Docente</th><th>Puntos</th><th>Encuestas</th><th>Aciertos</th><th>Preguntas respondidas</th><th>Puntos por rapidez</th></tr>
      ${R.map((r,i)=>`<tr${i<3?' style="background:#fff7dc;font-weight:700"':''}><td>${i<3?['🥇','🥈','🥉'][i]:i+1}</td><td>${escHTML(r.nombre||'')}</td><td><b>${r.puntos}</b></td><td>${r.encuestas}</td><td>${r.aciertos}</td><td>${r.respondidas}</td><td>${r.rapidez}</td></tr>`).join('')}</table>`:'<p class="sm">Aún nadie suma puntos.</p>'}`;
    const drop=$('dropQ'), fx=$('fxQ'); drop.onclick=()=>fx.click(); fx.onchange=()=>{ if(fx.files[0]) leerPreg(fx.files[0]); };
    drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) leerPreg(e.dataTransfer.files[0]); };
    if($('cpXls')) $('cpXls').onclick=()=>{ const L=[['Puesto','Docente','Correo','Puntos','Encuestas','Aciertos','Preguntas respondidas','Puntos por rapidez']].concat(R.map((r,i)=>[i+1,r.nombre,r.correo,r.puntos,r.encuestas,r.aciertos,r.respondidas,r.rapidez]));
      descargar('copa-stem-ranking.csv', L.map(f=>f.map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(';')).join('\n')); };
  }
  async function leerPreg(file){
    const res=$('qRes'); res.innerHTML='<p class="sm">Leyendo…</p>';
    try{
      await cargarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
      const ws=wb.Sheets['Preguntas']||wb.Sheets[wb.SheetNames.find(n=>/pregunt/i.test(n))||wb.SheetNames[0]];
      const M=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}); const norm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
      const hi=M.findIndex(r=>r.some(c=>norm(c)==='pregunta')); if(hi<0) throw new Error('No se encontró la fila de encabezados (columna «Pregunta»).');
      const H=M[hi].map(norm), col=k=>H.findIndex(h=>h.startsWith(k));
      const ci={area:col('area'),act:col('actividad'),p:col('pregunta'),a:col('opcion a'),b:col('opcion b'),c:col('opcion c'),d:col('opcion d'),ok:col('respuesta'),au:col('registrada')};
      const filas=[], malas=[];
      M.slice(hi+1).forEach((r,i)=>{ const g=k=>ci[k]>=0?String(r[ci[k]]||'').trim():''; if(!g('p')&&!g('act')) return;
        const f={area:g('area'),actividad:g('act'),pregunta:g('p'),a:g('a'),b:g('b'),c:g('c'),d:g('d'),correcta:g('ok').toUpperCase().slice(0,1),autor:g('au')};
        const ok=f.pregunta&&f.a&&f.b&&'ABCD'.includes(f.correcta)&&f.correcta&&(f.correcta!=='C'||f.c)&&(f.correcta!=='D'||f.d)&&f.actividad;
        if(!ok){ malas.push(hi+2+i); return; }
        f.clave=/^general/i.test(f.area)||/^general/i.test(f.actividad)?'general':(window.copaClave?copaClave({titulo:f.actividad,categoria:/tecno/i.test(f.area)?'tec':''}):norm(f.actividad));
        filas.push(f); });
      if(!filas.length) throw new Error('No se encontraron preguntas completas.');
      const por={}; filas.forEach(f=>por[f.actividad]=(por[f.actividad]||0)+1);
      res.innerHTML=`<div class="okbox">Se leyeron <b>${filas.length}</b> preguntas: ${Object.entries(por).map(([k,v])=>`${escHTML(k)} (${v})`).join(', ')}.${malas.length?`<br>Se omitieron ${malas.length} filas incompletas (filas ${malas.slice(0,12).join(', ')}${malas.length>12?'…':''}).`:''}</div><button class="b1" id="qOk">Cargar estas preguntas</button>`;
      $('qOk').onclick=async()=>{ $('qOk').disabled=true; $('qOk').textContent='Guardando…';
        const {data,error}=await sb().rpc('sd_copa_importar',{p_filas:filas});
        if(error){ res.innerHTML=`<div class="warnbox">No se pudo guardar: ${escHTML(error.message)}</div>`; return; }
        aviso(`Banco cargado: ${data} preguntas`,'ok'); tCopa(); };
    }catch(e){ res.innerHTML=`<div class="warnbox">${escHTML(e.message)}</div>`; }
  }

  /* ---------------- 1. Importar Excel ---------------- */
  async function tImportar(){
    const { data:hist } = await sb().from('sd_importaciones').select('*').order('hecho_en',{ascending:false}).limit(5);
    $('admTab').innerHTML = `
      <div class="drop" id="drop">Arrastra aquí el Excel con el mismo formato o <b>toca para elegir el archivo</b><br>
        <span class="sm">Se leen las hojas PRIMARIA y BACHILLERATO; la columna OBSERVACIONES se ignora. La hoja del directorio se usa solo para los correos.</span></div>
      <input type="file" id="fx" accept=".xlsx,.xls" hidden>
      <div id="impRes"></div>
      <h4 style="margin:18px 0 6px">Últimas cargas</h4>
      ${(hist&&hist.length)?`<table class="t"><tr><th>Fecha</th><th>Archivo</th><th>Filas</th><th>Docentes</th></tr>${hist.map(h=>`<tr><td>${new Date(h.hecho_en).toLocaleString('es-CO')}</td><td>${escHTML(h.archivo||'')}</td><td>${h.filas}</td><td>${h.docentes}</td></tr>`).join('')}</table>`:'<p class="sm">Aún no se ha cargado ningún archivo.</p>'}`;
    const drop=$('drop'), fx=$('fx');
    drop.onclick=()=>fx.click();
    drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); if(e.dataTransfer.files[0]) leer(e.dataTransfer.files[0]); };
    fx.onchange=()=>{ if(fx.files[0]) leer(fx.files[0]); };
  }
  async function leer(file){
    const res=$('impRes'); res.innerHTML='<p class="sm" style="margin-top:12px">Leyendo el archivo…</p>';
    try{ await cargarXLSX(); lectura = await SteamExcel.leerArchivo(file); lectura.archivo=file.name; }
    catch(e){ res.innerHTML=`<div class="warnbox">No se pudo leer el archivo: ${escHTML(e.message)}</div>`; return; }
    const r=lectura.resumen, p=lectura.pendientes, sinCorreo=lectura.docentes.filter(d=>!d.correo);
    const bloqueante = !lectura.filas.length;
    res.innerHTML = `
      <div class="stat"><div><b>${r.filas}</b><span>filas de actividades</span></div><div><b>${r.cursos}</b><span>cursos</span></div>
        <div><b>${r.acompanantes}</b><span>docentes acompañantes</span></div><div><b>${r.apoyos}</b><span>docentes de apoyo</span></div>
        <div><b>${r.apoyos_dos_cursos}</b><span>apoyos con 2 cursos</span></div><div><b>${lectura.docentes.length-sinCorreo.length} / ${lectura.docentes.length}</b><span>docentes con correo</span></div></div>
      ${bloqueante?'<div class="warnbox"><b>El archivo no trae filas de programación. Revisa que tenga las hojas PRIMARIA y BACHILLERATO.</b></div>':
        `<div class="${p.sin_titulo+p.sin_frase+p.sin_docente_cargo?'warnbox':'okbox'}"><b>El archivo se puede cargar.</b>${p.sin_titulo+p.sin_frase+p.sin_docente_cargo?` Quedan casillas por completar (la app mostrará "Información pendiente"):
          <ul><li>${p.sin_titulo} filas sin título de actividad</li><li>${p.sin_frase} filas sin frase</li><li>${p.sin_docente_cargo} filas sin docente a cargo</li></ul>`:''}</div>`}
      ${lectura.avisos.length?`<div class="warnbox"><b>Revisa:</b><ul>${lectura.avisos.slice(0,15).map(a=>`<li>${escHTML(a)}</li>`).join('')}${lectura.avisos.length>15?`<li>… y ${lectura.avisos.length-15} más</li>`:''}</ul></div>`:''}
      <p class="sm">Al actualizar se reemplaza toda la programación actual. Las ediciones hechas a mano en la pestaña Programación se pierden; los avatares, alertas y correcciones de curso de los docentes se conservan.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px"><button class="b2" id="impNo">Cancelar</button><button class="b1" id="impSi" ${bloqueante?'disabled':''}>Actualizar toda la app</button></div>`;
    $('impNo').onclick=()=>{ lectura=null; res.innerHTML=''; };
    $('impSi').onclick=async()=>{
      $('impSi').disabled=true; $('impSi').textContent='Actualizando…';
      const filas=lectura.filas.map(f=>({ tipo:f.tipo, nivel:f.nivel, grado:f.grado||'', curso:f.curso||'', hora_inicio:f.hora_inicio, hora_fin:f.hora_fin,
        franja:f.franja, salon:f.salon, area:f.area, categoria:f.categoria, titulo:f.titulo, frase:f.frase, docente_cargo:f.docente_cargo,
        acompanante:f.acompanante, apoyo:f.apoyo, fila:f.fila }));
      const { data, error } = await sb().rpc('sd_importar', { p_filas:filas, p_directorio:lectura.directorio, p_archivo:lectura.archivo });
      if(error){ res.insertAdjacentHTML('beforeend',`<div class="warnbox">No se pudo actualizar: ${escHTML(error.message)}</div>`); $('impSi').disabled=false; $('impSi').textContent='Actualizar toda la app'; return; }
      aviso(`Programación actualizada: ${data.filas} filas, ${data.docentes} docentes.`,'ok'); lectura=null;
      try{ if(window.recargarDatos) await window.recargarDatos(); const n=await aplicarLideres(); if(n!=null) aviso(`Programación actualizada y líderes asignados (${n} filas con cambios).`,'ok'); }catch(e){ aviso('La programación se cargó, pero no se pudieron asignar los líderes: '+e.message,'bad'); }
      tImportar();
    };
  }

  /* ---------------- 2. Programación (edición puntual) ---------------- */
  async function tProgramacion(){
    const prog=S().prog;
    if(!prog.length){ $('admTab').innerHTML='<p class="sm">Aún no hay programación. Carga el Excel primero.</p>'; return; }
    const cursos=[...new Set(prog.filter(r=>r.nivel===filtro.nivel&&r.curso).map(r=>r.curso))].sort();
    if(!cursos.includes(filtro.curso)) filtro.curso=cursos[0]||'';
    const filas=prog.filter(r=>r.curso===filtro.curso).sort((a,b)=>a.hora_inicio.localeCompare(b.hora_inicio));
    $('admTab').innerHTML=`
      <div class="tools"><select id="pfN"><option ${filtro.nivel==='Primaria'?'selected':''}>Primaria</option><option ${filtro.nivel==='Bachillerato'?'selected':''}>Bachillerato</option></select>
        <select id="pfC">${cursos.map(c=>`<option ${c===filtro.curso?'selected':''}>${escHTML(c)}</option>`).join('')}</select>
        <span class="sm">Los cambios llegan de inmediato a los celulares. Si cambias el salón, el docente verá un aviso de cambio.</span></div>
      <div class="twrap"><table class="t"><tr><th>Hora</th><th>Área</th><th>Salón</th><th>Título</th><th>Frase</th><th>Docente a cargo</th><th>Acompañante</th><th>Apoyo</th><th></th></tr>
      ${filas.map(r=>`<tr data-id="${r.id}"><td>${fmtHora(r.hora_inicio)}<br><span class="sm">${fmtHora(r.hora_fin)}</span></td><td>${escHTML(r.area||'')}</td>
        <td><input data-k="salon" value="${escHTML(r.salon||'')}"></td><td><input data-k="titulo" value="${escHTML(r.titulo||'')}"></td>
        <td><input data-k="frase" value="${escHTML(r.frase||'')}"></td><td><input data-k="docente_cargo" value="${escHTML(r.docente_cargo||'')}"></td>
        <td><input data-k="acompanante" value="${escHTML(r.acompanante||'')}"></td><td><input data-k="apoyo" value="${escHTML(r.apoyo||'')}"></td>
        <td><button class="b1" data-save>Guardar</button></td></tr>`).join('')}</table></div>`;
    $('pfN').onchange=e=>{ filtro.nivel=e.target.value; filtro.curso=''; tProgramacion(); };
    $('pfC').onchange=e=>{ filtro.curso=e.target.value; tProgramacion(); };
    $('admTab').querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
      const tr=b.closest('tr'), id=+tr.dataset.id, r=prog.find(x=>x.id===id), cambios={};
      tr.querySelectorAll('input').forEach(i=>{ const v=i.value.trim(); if(v!==(r[i.dataset.k]||'')) cambios[i.dataset.k]=v||null; });
      if(!Object.keys(cambios).length) return aviso('No hay cambios en esta fila.');
      if('salon' in cambios) cambios.nota_cambio=`Cambió de salón: ${r.salon||'—'} → ${cambios.salon||'—'}`;
      b.disabled=true;
      const { error } = await sb().from('sd_programacion').update(cambios).eq('id',id);
      b.disabled=false;
      if(error) return aviso('No se pudo guardar: '+error.message,'bad');
      Object.assign(r,cambios); aviso('Cambio guardado','ok');
      if('docente_cargo' in cambios||'salon' in cambios) aplicarLideres().catch(()=>{});
    });
  }

  /* ---------------- 3. Usuarios ---------------- */
  async function tUsuarios(){
    const [{ data:perf, error:e1 }, { data:dir, error:e2 }] = await Promise.all([
      sb().from('sd_perfiles').select('id,correo,nombre,rol,experiencia,video_visto,avatar,confirmado').order('nombre'),
      sb().from('sd_directorio').select('correo,nombre,nombre_n')
    ]);
    if(e1) throw e1; if(e2) throw e2;
    const porCorreo=new Map((perf||[]).map(p=>[p.correo.toLowerCase(),p]));
    // docentes de la programación con su correo del directorio
    const prog=S().prog, nombres=new Map();
    prog.filter(r=>r.tipo==='actividad').forEach(r=>{ [r.acompanante,r.apoyo].forEach(n=>{ if(n) nombres.set(SteamExcel.norm(n), n); }); });
    const buscar = n => { const k=SteamExcel.norm(n); const d=(dir||[]).find(x=>x.nombre_n===k) || (dir||[]).find(x=>x.nombre_n.startsWith(k)); return d?d.correo:''; };
    const docentes=[...nombres.values()].sort((a,b)=>a.localeCompare(b,'es')).map(n=>({ nombre:n, correo:buscar(n), rol:'docente' }));
    const todos=[{nombre:ADMIN[0],correo:ADMIN[1],rol:'admin',cargo:ADMIN[2]}, ...MASTERS.map(m=>({nombre:m[0],correo:m[1],rol:'master',cargo:m[2]})), ...docentes];
    const sinCuenta=todos.filter(u=>u.correo && !porCorreo.has(u.correo.toLowerCase()));
    const sinCorreo=docentes.filter(d=>!d.correo);
    const expN={mat:'Matemáticas',cie:'Ciencias Naturales',tec:'Tecnología'};
    $('admTab').innerHTML=`
      <div class="stat"><div><b>${(perf||[]).length}</b><span>cuentas creadas</span></div><div><b>${sinCuenta.length}</b><span>personas sin cuenta</span></div>
        <div><b>${(perf||[]).filter(p=>p.confirmado).length}</b><span>ya ingresaron</span></div><div><b>${(perf||[]).filter(p=>p.avatar).length}</b><span>crearon su avatar</span></div></div>
      ${sinCorreo.length?`<div class="warnbox"><b>Docentes sin correo en el directorio (no se les puede crear cuenta):</b><ul>${sinCorreo.map(d=>`<li>${escHTML(d.nombre)}</li>`).join('')}</ul></div>`:''}
      <div class="tools"><button class="b1" id="uCrear">⭐ Crear cuentas faltantes</button><button class="b2" id="uCsv">Descargar lista (${sinCuenta.length})</button>
        <span class="sm">Crea las cuentas de docentes y líderes que aún no tienen, con la contraseña temporal <b>0000</b> (al entrar, la app les pide crear la suya).</span></div>
      <h4 style="margin:14px 0 6px">Usuarios Master</h4>
      <div class="twrap"><table class="t"><tr><th>Nombre</th><th>Cargo</th><th>Correo</th><th>Cuenta</th><th>Experiencia elegida</th></tr>
        ${[ {nombre:ADMIN[0],correo:ADMIN[1],cargo:ADMIN[2]}, ...MASTERS.map(m=>({nombre:m[0],correo:m[1],cargo:m[2]}))].map(m=>{ const p=porCorreo.get(m.correo.toLowerCase());
          return `<tr><td><b>${escHTML(m.nombre)}</b></td><td>${escHTML(m.cargo)}</td><td class="sm">${escHTML(m.correo)}</td><td>${p?(p.confirmado?'✓ Activa':'Creada, sin ingresar'):'<span class="pend">Sin cuenta</span>'}</td><td>${p&&p.experiencia?expN[p.experiencia]:'—'}</td></tr>`; }).join('')}</table></div>
      ${(perf||[]).filter(p=>p.rol==='lider').length?`<h4 style="margin:18px 0 6px">Líderes de estación</h4><div class="twrap"><table class="t"><tr><th>Nombre</th><th>Correo</th><th>Cuenta</th><th>Avatar</th></tr>${(perf||[]).filter(p=>p.rol==='lider').map(p=>`<tr><td>${escHTML(p.nombre)}</td><td class="sm">${escHTML(p.correo)}</td><td>${p.confirmado?'✓ Activa':'Creada, sin ingresar'}</td><td>${p.avatar?'✓':'—'}</td></tr>`).join('')}</table></div>`:''}
      <h4 style="margin:18px 0 6px">Docentes</h4>
      <div class="twrap"><table class="t"><tr><th>Nombre</th><th>Correo</th><th>Cuenta</th><th>Avatar</th></tr>
        ${docentes.map(d=>{ const p=d.correo&&porCorreo.get(d.correo.toLowerCase());
          return `<tr><td>${escHTML(d.nombre)}</td><td class="sm">${escHTML(d.correo||'—')}</td><td>${p?(p.confirmado?'✓ Activa':'Creada, sin ingresar'):'<span class="pend">Sin cuenta</span>'}</td><td>${p&&p.avatar?'✓':'—'}</td></tr>`; }).join('')}</table></div>`;
    $('uCrear').onclick=async()=>{ $('uCrear').disabled=true; $('uCrear').textContent='Creando…'; try{ await crearCuentasFaltantes(); }catch(e){ aviso('No se pudieron crear: '+e.message,'bad'); } tUsuarios(); };
    $('uCsv').onclick=()=>{
      if(!sinCuenta.length) return aviso('Todas las personas ya tienen cuenta.','ok');
      descargar('cuentas.csv', 'nombre,correo,rol\n'+sinCuenta.map(u=>[u.nombre,u.correo,u.rol].map(csvCell).join(',')).join('\n'));
    };
  }

  /* ---------------- 4. Correcciones de curso ---------------- */
  async function tCorrecciones(){
    const { data, error } = await sb().from('sd_perfiles').select('nombre,nombre_n,correo,cursos_manual,cursos_manual_en').not('cursos_manual','is',null).order('cursos_manual_en',{ascending:false});
    if(error) throw error;
    const prog=S().prog;
    const segunExcel = n => { const s=new Set(); prog.forEach(r=>{ if(r.tipo==='actividad' && (r.acompanante_n===n||r.apoyo_n===n)) s.add(r.curso); }); return [...s].sort().join(', ')||'No aparece'; };
    $('admTab').innerHTML = (data&&data.length) ? `
      <p class="sm" style="margin-bottom:10px">Docentes que eligieron su curso con el botón de ayuda. Corrige el Excel y vuelve a cargarlo; su elección se mantiene hasta que ellos toquen "Volver a lo que dice la programación".</p>
      <div class="twrap"><table class="t"><tr><th>Docente</th><th>Según el Excel</th><th>Eligió</th><th>Fecha</th></tr>
      ${data.map(p=>`<tr><td><b>${escHTML(p.nombre)}</b><br><span class="sm">${escHTML(p.correo)}</span></td><td>${escHTML(segunExcel(p.nombre_n))}</td><td><b>${escHTML((p.cursos_manual||[]).join(', '))}</b></td><td class="sm">${p.cursos_manual_en?new Date(p.cursos_manual_en).toLocaleString('es-CO'):''}</td></tr>`).join('')}</table></div>`
      : '<div class="okbox">Ningún docente ha corregido su curso.</div>';
  }

  /* ---------------- 5. Avisos generales ---------------- */
  async function tAvisos(){
    const { data, error } = await sb().from('sd_avisos').select('*').order('creado_en',{ascending:false}).limit(50);
    if(error) throw error;
    const cursos=[...new Set(S().prog.filter(r=>r.curso).map(r=>r.curso))].sort();
    $('admTab').innerHTML=`
      <div class="field" style="margin-bottom:10px"><label>Título</label><input id="avT" maxlength="80" placeholder="Ej. Cambio de salón"></div>
      <div class="field" style="margin-bottom:10px"><label>Mensaje</label><textarea id="avM" rows="3" maxlength="400" placeholder="Ej. La actividad de Matemáticas de 7A pasa al salón 210."></textarea></div>
      <div class="field" style="margin-bottom:12px"><label>Para</label><select id="avC"><option value="">Todos</option>${cursos.map(c=>`<option>${escHTML(c)}</option>`).join('')}</select></div>
      <button class="b1" id="avEnviar">Enviar aviso</button> <span class="sm">Aparece en la app de inmediato y como notificación en los celulares con avisos activados.</span>
      <h4 style="margin:18px 0 6px">Avisos enviados</h4>
      ${(data&&data.length)?`<table class="t"><tr><th>Fecha</th><th>Para</th><th>Aviso</th><th></th></tr>${data.map(a=>`<tr><td class="sm">${new Date(a.creado_en).toLocaleString('es-CO')}</td><td>${escHTML(a.curso||'Todos')}</td><td><b>${escHTML(a.titulo)}</b><br>${escHTML(a.mensaje)}</td><td><button class="b2" data-del="${a.id}">Borrar</button></td></tr>`).join('')}</table>`:'<p class="sm">No hay avisos.</p>'}`;
    $('avEnviar').onclick=async()=>{
      const titulo=$('avT').value.trim(), mensaje=$('avM').value.trim(), curso=$('avC').value||null;
      if(!titulo||!mensaje) return aviso('Escribe el título y el mensaje.','bad');
      const { error } = await sb().from('sd_avisos').insert({ titulo, mensaje, curso, creado_por:S().perfil.id });
      if(error) return aviso('No se pudo enviar: '+error.message,'bad');
      aviso('Aviso enviado','ok'); tAvisos();
    };
    $('admTab').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
      const { error } = await sb().from('sd_avisos').delete().eq('id',+b.dataset.del);
      if(error) return aviso('No se pudo borrar: '+error.message,'bad'); tAvisos();
    });
  }

  /* ---------------- 6. Configuración ---------------- */
  async function tConfig(){
    const c=S().config||{};
    $('admTab').innerHTML=`
      <div class="field" style="margin-bottom:12px"><label>Fecha del evento</label><input id="cfF" type="date" value="${escHTML(c.fecha_evento||'2026-10-23')}"></div>
      <div class="field" style="margin-bottom:12px"><label>Video de bienvenida (enlace de YouTube, Google Drive o archivo .mp4)</label><input id="cfV" value="${escHTML(c.video_url||'')}" placeholder="https://youtu.be/..."></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para usuarios Master (enlace de YouTube, Google Drive o archivo .mp4)</label><input id="cfT" value="${escHTML(c.video_tutorial_url||'')}" placeholder="https://youtu.be/..."></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para docentes (archivo .mp4 o enlace)</label><input id="cfTD" value="${escHTML(c.video_tutorial_docente||'')}" placeholder="https://…/Videos/tutorial-docentes-vertical.mp4"></div>
      <div class="field" style="margin-bottom:12px"><label>Video tutorial para organizadores (archivo .mp4 o enlace)</label><input id="cfTO" value="${escHTML(c.video_tutorial_org||'')}" placeholder="https://…/Videos/tutorial-organizadores-vertical.mp4"></div>
      <div class="field" style="margin-bottom:12px"><label>Minutos de anticipación por defecto para los avisos</label><select id="cfA">${[5,10,15].map(m=>`<option ${c.anticipacion_min===m?'selected':''}>${m}</option>`).join('')}</select></div>
      <button class="b1" id="cfG">Guardar configuración</button>
      <div class="okbox" style="margin-top:16px"><b>Probar la app como si fuera el día del evento:</b> abre la app con <code>?simular=2026-10-23T08:55</code> al final de la dirección (cambia la hora a tu gusto). Así ves avanzar el avatar y saltar las alertas sin esperar al 23 de octubre.</div>`;
    $('cfG').onclick=async()=>{
      const campos={ fecha_evento:$('cfF').value, video_url:$('cfV').value.trim()||null, video_tutorial_url:$('cfT').value.trim()||null, video_tutorial_docente:$('cfTD').value.trim()||null, video_tutorial_org:$('cfTO').value.trim()||null, anticipacion_min:+$('cfA').value, actualizado_en:new Date().toISOString() };
      const { error } = await sb().from('sd_config').update(campos).eq('id',1);
      if(error) return aviso('No se pudo guardar: '+error.message,'bad');
      Object.assign(S().config,campos); aviso('Configuración guardada','ok');
    };
  }


  /* =================== v28 · Líderes de estación =================== */
  const nrm=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const actKey=r=>nrm(r.titulo||r.area);
  const salKey=s0=>nrm(s0).replace(/[^a-z0-9]/g,'');
  const lev=(a,b)=>{ if(Math.abs(a.length-b.length)>1) return 9; const d=Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++) d[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[a.length][b.length]; };
  function buscarPersona(nombre,dir){ const tk=nrm(nombre).replace(/[^a-z ]/g,' ').split(' ').filter(t=>t.length>1); if(!tk.length) return null;
    const ok=d=>{ const dt=nrm(d.nombre).replace(/[^a-z ]/g,' ').split(' '); return tk.every(t=>dt.some(x=>x===t||(t.length>4&&lev(x,t)<=1))); };
    const c=dir.filter(ok); return c.length===1?c[0]:null; }
  let LD=null; const LDX=new Set();   // datos para la pestaña: directorio, perfiles, manuales · actividades desplegadas
  async function datosLideres(forzar){
    if(LD&&!forzar) return LD;
    const [d,p,m]=await Promise.all([ sb().from('sd_directorio').select('correo,nombre'), sb().from('sd_perfiles').select('id,correo,nombre,rol,confirmado,avatar'), sb().from('sd_lideres').select('*').order('id') ]);
    if(m.error) throw new Error('Falta ejecutar el archivo 14-lideres-y-agenda.sql en Supabase ('+m.error.message+')');
    LD={dir:d.data||[], perf:p.data||[], man:m.data||[]}; return LD;
  }
  /* quién dirige cada fila: asignación manual (gana) o la columna «Docente a cargo» del Excel */
  function calcularLideres(D){
    const porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
    const res=new Map();
    S().prog.filter(r=>r.tipo==='actividad').forEach(r=>{
      const ak=actKey(r), sk=salKey(r.salon);
      let man=D.man.filter(x=>x.actividad===ak&&x.salon===sk); if(!man.length) man=D.man.filter(x=>x.actividad===ak&&x.salon==='*');
      let personas=[], pend=[], fuente='';
      if(man.length){ fuente='manual'; personas=man.map(x=>({correo:x.correo.toLowerCase(),nombre:x.nombre})); }
      else { const dc=String(r.docente_cargo||'').trim();
        if(dc&&!/director de curso|docentes del/i.test(dc)){ fuente='excel';
          dc.split(/\s*-\s*/).map(x=>x.trim()).filter(Boolean).forEach(n=>{ const d=buscarPersona(n,D.dir); if(d) personas.push({correo:d.correo.toLowerCase(),nombre:d.nombre}); else pend.push(n); }); }
        else if(/docentes del/i.test(dc)) pend.push(dc); }
      const ids=[]; personas.forEach(x=>{ const p=porCorreo.get(x.correo); x.perfil=p||null; if(p&&p.rol==='lider') ids.push(p.id); });
      res.set(r.id,{r,ak,sk,fuente,personas,pend,ids});
    });
    return res;
  }
  async function aplicarLideres(){
    const D=await datosLideres(true), R=calcularLideres(D);
    const pay=[...R.values()].map(x=>({id:x.r.id,lideres:x.ids}));
    const {data,error}=await sb().rpc('sd_set_lideres',{p:pay}); if(error) throw error;
    R.forEach(x=>{ x.r.lideres=x.ids; });
    if(window.recargarDatos){ try{ await window.recargarDatos(); }catch(e){} }
    return data;
  }
  window.aplicarLideres=aplicarLideres;
  async function crearCuentasFaltantes(){
    const D=await datosLideres(true), R=calcularLideres(D), lista=new Map(), porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
    R.forEach(x=>x.personas.forEach(pp=>{ const p=porCorreo.get(pp.correo); if(!p||p.rol==='docente') lista.set(pp.correo,{nombre:pp.nombre,correo:pp.correo,rol:'lider'}); }));
    const prog=S().prog, nombres=new Map(); prog.filter(r=>r.tipo==='actividad').forEach(r=>[r.acompanante,r.apoyo].forEach(n=>{ if(n) nombres.set(SteamExcel.norm(n),n); }));
    const dirN=(D.dir||[]).map(d=>({...d,n:SteamExcel.norm(d.nombre)}));
    nombres.forEach((n,k)=>{ const d=dirN.find(x=>x.n===k)||dirN.find(x=>x.n.startsWith(k)); if(!d) return; const c=d.correo.toLowerCase(); if(!porCorreo.has(c)&&!lista.has(c)) lista.set(c,{nombre:d.nombre.replace(/\s+\d.*$|\s+TR°.*$/,''),correo:c,rol:'docente'}); });
    if(!lista.size){ aviso('Todas las personas ya tienen cuenta.','ok'); return; }
    const {data,error}=await sb().rpc('sd_crear_cuentas',{p_lista:[...lista.values()]}); if(error) throw error;
    const n=await aplicarLideres();
    aviso(`Cuentas creadas: ${data.creadas} · pasaron a líder: ${data.roles}. Contraseña temporal: 0000.`,'ok');
    return data;
  }
  async function tLideres(){
    const D=await datosLideres(true), R=calcularLideres(D), porCorreo=new Map(D.perf.map(p=>[String(p.correo).toLowerCase(),p]));
    const G={}; R.forEach(x=>{ const g=(G[x.ak]=G[x.ak]||{r:x.r,lugares:{}}); const l=(g.lugares[x.sk]=g.lugares[x.sk]||{salon:x.r.salon||'—',filas:[],x}); l.filas.push(x); });
    const gente=new Map(); R.forEach(x=>x.personas.forEach(p=>gente.set(p.correo,p)));
    const sinCuenta=[...gente.values()].filter(p=>!porCorreo.get(p.correo)), aConv=[...gente.values()].filter(p=>{ const q=porCorreo.get(p.correo); return q&&q.rol==='docente'; });
    const lugares=Object.values(G).reduce((n,g)=>n+Object.keys(g.lugares).length,0), conL=Object.values(G).reduce((n,g)=>n+Object.values(g.lugares).filter(l=>l.filas.some(f=>f.personas.length)).length,0);
    const chip=p=>{ const q=porCorreo.get(p.correo); const st=!q?'<i class="pend">sin cuenta</i>':q.rol==='docente'?'<i class="pend">cuenta de docente</i>':q.rol!=='lider'?`<i class="pend">${escHTML(q.rol)}</i>`:'';
      return `<span class="lch">${escHTML(p.nombre)} ${st}</span>`; };
    let h=`<div class="stat"><div><b>${conL} / ${lugares}</b><span>lugares con líder</span></div><div><b>${gente.size}</b><span>líderes</span></div><div><b>${sinCuenta.length}</b><span>sin cuenta</span></div><div><b>${aConv.length}</b><span>con cuenta de docente</span></div></div>
      <div class="tools"><button class="b1" id="lCrear" ${sinCuenta.length+aConv.length?'':'disabled'}>⭐ Crear cuentas faltantes (${sinCuenta.length+aConv.length})</button><button class="b2" id="lAplicar">Actualizar la app</button>
      <span class="sm">Los líderes salen de la columna «Docente a cargo» del Excel. Lo que asignes aquí a mano <b>gana</b> sobre el Excel y <b>no se borra</b> al volver a cargarlo.</span></div>`;
    Object.entries(G).sort((a,b)=>String(a[1].r.titulo||a[1].r.area).localeCompare(b[1].r.titulo||b[1].r.area,'es')).forEach(([ak,g])=>{
      const col=AREA_C[g.r.categoria]||AREA_C.gen;
      const LUG=Object.entries(g.lugares), muchos=LUG.length>6, abierto=LDX.has(ak);
      h+=`<div class="lgrp" style="--c:${col}"><h4>${escHTML(g.r.titulo?titA(g.r.titulo):g.r.area)} <small>${escHTML(g.r.area||'')} · ${LUG.length} lugar${LUG.length>1?'es':''}</small></h4>`;
      if(muchos){ const conL=LUG.filter(([,l])=>l.filas.some(f=>f.personas.length)).length;
        h+=`<div class="lrow2"><div class="lsal"><b>Todos los lugares</b><small>${LUG.length} lugares · ${conL} con líder</small></div><div class="lppl"><span class="sm">${conL?'':'Sin líder en ningún lugar. '}Puedes asignar líderes a todos a la vez o abrir la lista.</span></div>
          <div class="lbtn"><button class="b2" data-asig="${escHTML(ak)}|*">Asignar a todos</button><button class="b2" data-ver="${escHTML(ak)}">${abierto?'Ocultar':'Ver'} lugares</button></div></div>`; }
      LUG.forEach(([sk,l])=>{ if(muchos&&!abierto) return; const x=l.x, per=new Map(); l.filas.forEach(f=>f.personas.forEach(p=>per.set(p.correo,p))); const pend=[...new Set(l.filas.flatMap(f=>f.pend))];
        const man=l.filas.some(f=>f.fuente==='manual');
        h+=`<div class="lrow2"><div class="lsal"><b>${escHTML(l.salon)}</b><small>${l.filas.length} grupo${l.filas.length>1?'s':''}</small></div>
          <div class="lppl">${[...per.values()].map(chip).join('')||'<span class="pend">Sin líder</span>'}${pend.length?`<span class="lpend">Excel: ${escHTML(pend.join(', '))}${pend.some(p=>/docentes del/i.test(p))?'':' (no está en el directorio)'}</span>`:''}${man?'<span class="lman">✋ asignado a mano</span>':''}</div>
          <div class="lbtn"><button class="b2" data-asig="${escHTML(ak)}|${escHTML(sk)}">Asignar</button>${man?`<button class="b2" data-ex="${escHTML(ak)}|${escHTML(sk)}" title="Quitar la asignación manual">Volver al Excel</button>`:''}</div></div>`; });
      h+='</div>'; });
    $('admTab').innerHTML=h;
    $('lCrear').onclick=async()=>{ $('lCrear').disabled=true; $('lCrear').textContent='Creando cuentas…'; try{ await crearCuentasFaltantes(); }catch(e){ aviso('No se pudieron crear: '+e.message,'bad'); } tLideres(); };
    $('lAplicar').onclick=async()=>{ $('lAplicar').disabled=true; try{ const n=await aplicarLideres(); aviso(`App actualizada (${n} filas con cambios)`,'ok'); }catch(e){ aviso('Error: '+e.message,'bad'); } tLideres(); };
    $('admTab').querySelectorAll('[data-ex]').forEach(b=>b.onclick=async()=>{ const [ak,sk]=b.dataset.ex.split('|');
      const ids=D.man.filter(x=>x.actividad===ak&&(x.salon===sk||x.salon==='*')).map(x=>x.id); if(!ids.length) return;
      if(!confirm('¿Quitar la asignación manual y volver a lo que dice el Excel?')) return;
      const {error}=await sb().from('sd_lideres').delete().in('id',ids); if(error) return aviso(error.message,'bad'); await aplicarLideres(); tLideres(); });
    $('admTab').querySelectorAll('[data-ver]').forEach(b=>b.onclick=()=>{ const k=b.dataset.ver; LDX.has(k)?LDX.delete(k):LDX.add(k); tLideres(); });
    $('admTab').querySelectorAll('[data-asig]').forEach(b=>b.onclick=()=>{ const [ak,sk]=b.dataset.asig.split('|'); asignarModal(ak,sk,G[ak],D,R); });
  }
  function asignarModal(ak,sk,g,D,R){
    const todosSk=sk==='*', l=todosSk?{salon:'todos los lugares',filas:Object.values(g.lugares).flatMap(x=>x.filas)}:g.lugares[sk], actuales=new Map(); if(!todosSk) l.filas.forEach(f=>f.personas.forEach(p=>actuales.set(p.correo,p)));
    const sel=new Map(actuales), base=new Map(); D.dir.forEach(d=>base.set(d.correo.toLowerCase(),{correo:d.correo.toLowerCase(),nombre:d.nombre}));
    D.perf.filter(p=>!['admin'].includes(p.rol)).forEach(p=>{ const c=String(p.correo).toLowerCase(); if(!base.has(c)) base.set(c,{correo:c,nombre:p.nombre}); });
    const todos=[...base.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')), nLug=Object.keys(g.lugares).length;
    const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
    const pinta=q=>{ q=nrm(q||''); const lista=todos.filter(p=>!q||nrm(p.nombre+' '+p.correo).includes(q)).slice(0,80);
      m.innerHTML=`<div class="amb"><h3>Asignar líderes</h3><p class="sm">${escHTML(g.r.titulo?titA(g.r.titulo):g.r.area)} · <b>${escHTML(l.salon)}</b></p>
        <div class="asel">${[...sel.values()].map(p=>`<span class="lch on" data-q="${escHTML(p.correo)}">✕ ${escHTML(p.nombre)}</span>`).join('')||'<span class="pend">Nadie seleccionado</span>'}</div>
        <input id="asB" placeholder="Buscar docente por nombre o correo…" value="${escHTML(q)}">
        <div class="alist">${lista.map(p=>`<label><input type="checkbox" data-c="${escHTML(p.correo)}" ${sel.has(p.correo)?'checked':''}> ${escHTML(p.nombre)} <small>${escHTML(p.correo)}</small></label>`).join('')}</div>
        ${nLug>1&&!todosSk?`<div class="ascope"><label><input type="radio" name="asA" value="uno" checked> Solo en ${escHTML(l.salon)}</label><label><input type="radio" name="asA" value="todos"> En los ${nLug} lugares de esta actividad</label></div>`:''}
        <div class="abtn"><button class="b2" id="asX">Cancelar</button><button class="b1" id="asOk">Guardar</button></div></div>`;
      const b=m.querySelector('#asB'); b.oninput=()=>{ const v=b.value; pinta(v); const nb=m.querySelector('#asB'); nb.focus(); nb.setSelectionRange(v.length,v.length); };
      m.querySelectorAll('[data-c]').forEach(c=>c.onchange=()=>{ const p=base.get(c.dataset.c); if(c.checked) sel.set(p.correo,p); else sel.delete(p.correo); pinta(m.querySelector('#asB').value); });
      m.querySelectorAll('.asel [data-q]').forEach(c=>c.onclick=()=>{ sel.delete(c.dataset.q); pinta(m.querySelector('#asB').value); });
      m.querySelector('#asX').onclick=()=>m.remove();
      m.querySelector('#asOk').onclick=async()=>{ const todosL=todosSk||(m.querySelector('input[name=asA][value=todos]')&&m.querySelector('input[name=asA][value=todos]').checked), salon=todosL?'*':sk;
        m.querySelector('#asOk').disabled=true;
        let q1=sb().from('sd_lideres').delete().eq('actividad',ak); q1=todosL?q1:q1.eq('salon',sk); const r1=await q1; if(r1.error){ aviso(r1.error.message,'bad'); return; }
        if(sel.size){ const r2=await sb().from('sd_lideres').insert([...sel.values()].map(p=>({actividad:ak,salon,correo:p.correo,nombre:p.nombre}))); if(r2.error){ aviso(r2.error.message,'bad'); return; } }
        m.remove(); try{ await aplicarLideres(); }catch(e){} aviso('Líderes guardados','ok'); tLideres(); }; };
    pinta('');
  }

  /* =================== v28 · Agenda Master =================== */
  const TIPOS={sup:['Supervisar','#173d7a'],acom:['Acompañar actividad','#1f9d6b'],fijo:['Punto fijo','#c2410c'],reu:['Reunión','#7b4bd6'],lib:['Libre','#8a94a8']};
  const H0=6.5, H1=15;
  const hm=v=>{ const h=Math.floor(v), m=Math.round((v-h)*60); return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); };
  const aNum=t=>{ const [a,b]=String(t).slice(0,5).split(':').map(Number); return a+b/60; };
  let AGS=null, agSel=null;
  async function tAgenda(){
    const [p,a]=await Promise.all([ sb().from('sd_perfiles').select('id,nombre,rol').in('rol',['master']).order('nombre'), sb().from('sd_agenda').select('*').order('hora_inicio') ]);
    if(a.error) throw new Error('Falta ejecutar el archivo 14-lideres-y-agenda.sql en Supabase ('+a.error.message+')');
    AGS={m:p.data||[], b:(a.data||[]).map(x=>({...x,hora_inicio:String(x.hora_inicio).slice(0,5),hora_fin:String(x.hora_fin).slice(0,5)}))};
    pintarAgendaAdm();
  }
  function lugaresAg(){ const s=new Set(S().prog.filter(r=>r.tipo==='actividad'&&r.salon).map(r=>String(r.salon).replace(/^[-\s]+|[-\s]+$/g,'')));
    ['Portería principal','Entrada 2','Hall Principal','Coliseo','Cancha de fútbol','Zona verde','Rectoría','Sala de profesores','Restaurante','Bloque 130','Sede Primaria'].forEach(x=>s.add(x)); return [...s].sort((a,b)=>a.localeCompare(b,'es',{numeric:true})); }
  function pintarAgendaAdm(){
    const M=AGS.m, B=AGS.b, W=H1-H0, nom=id=>((M.find(x=>x.id===id)||{}).nombre||'');
    if(agSel&&agSel.id&&!B.find(b=>b.id===agSel.id)) agSel=null;
    const f=agSel||{perfil_id:(M[0]||{}).id,hora_inicio:'08:00',hora_fin:'09:00',lugar:'',tarea:'',tipo:'sup',avisar:true};
    const blk=b=>`<div class="ablk ${agSel&&agSel.id===b.id?'sel':''}" data-id="${b.id}" style="left:${((aNum(b.hora_inicio)-H0)/W*100).toFixed(2)}%;width:calc(${((aNum(b.hora_fin)-aNum(b.hora_inicio))/W*100).toFixed(2)}% - 3px);background:${(TIPOS[b.tipo]||TIPOS.sup)[1]}" title="${escHTML(b.lugar+' · '+(b.tarea||''))}"><b>${escHTML(b.lugar)}</b>${escHTML(b.tarea||'')}</div>`;
    $('admTab').innerHTML=`<div class="aglay"><div class="agmain">
      <div class="tools"><div class="aleg">${Object.values(TIPOS).map(t=>`<span><i style="background:${t[1]}"></i>${t[0]}</span>`).join('')}</div><button class="b1" id="agNuevo">+ Nuevo bloque</button><button class="b2" id="agXls">⬇ Descargar agenda</button></div>
      ${M.length?`<div class="agantt"><div class="agh"><div>Master</div><div class="agt">${Array.from({length:Math.ceil(W)},(_,i)=>`<span>${fmtHora(hm(H0+i))}</span>`).join('')}</div></div>
      ${M.map(m=>`<div class="agr"><div class="agn"><b>${escHTML(m.nombre)}</b><small>${B.filter(b=>b.perfil_id===m.id).length} bloques</small></div><div class="agt rel" data-p="${m.id}">${B.filter(b=>b.perfil_id===m.id).map(blk).join('')}</div></div>`).join('')}</div>`:'<div class="warnbox">No hay usuarios Master registrados.</div>'}
      <p class="sm">Toca un bloque para editarlo o un espacio vacío de una fila para crear uno nuevo. Los cambios llegan de inmediato al celular de esa persona, con un aviso.</p></div>
      <div class="agform"><h4>${agSel&&agSel.id?'Editar bloque':'Nuevo bloque'}</h4>
        <label>Persona</label><select id="agP">${M.map(m=>`<option value="${m.id}" ${m.id===f.perfil_id?'selected':''}>${escHTML(m.nombre)}</option>`).join('')}</select>
        <div class="two"><div><label>Desde</label><input type="time" id="agD" value="${f.hora_inicio}" min="06:00" max="16:00"></div><div><label>Hasta</label><input type="time" id="agH" value="${f.hora_fin}" min="06:00" max="16:00"></div></div>
        <label>Lugar</label><input id="agL" list="agLs" value="${escHTML(f.lugar)}" placeholder="Ej. Coliseo, 144, Portería principal"><datalist id="agLs">${lugaresAg().map(x=>`<option value="${escHTML(x)}">`).join('')}</datalist>
        <label>Qué debe hacer</label><textarea id="agT" rows="3" maxlength="300" placeholder="Ej. Verificar que los grupos lleguen a tiempo y apoyar al líder de la estación">${escHTML(f.tarea||'')}</textarea>
        <label>Tipo</label><div class="agtipos">${Object.entries(TIPOS).map(([k,t])=>`<span data-k="${k}" class="${k===f.tipo?'on':''}" style="--c:${t[1]}">${t[0]}</span>`).join('')}</div>
        <label class="chk"><input type="checkbox" id="agA" ${f.avisar!==false?'checked':''}> Avisarle antes de este bloque</label>
        <div id="agErr" class="warnbox" hidden></div>
        <div class="agbtns"><button class="b1" id="agG">Guardar</button>${agSel&&agSel.id?'<button class="b2" id="agDup">Duplicar para…</button><button class="b2 del" id="agDel">Eliminar</button>':''}</div></div></div>`;
    let tipo=f.tipo;
    $('admTab').querySelectorAll('.agtipos span').forEach(x=>x.onclick=()=>{ tipo=x.dataset.k; $('admTab').querySelectorAll('.agtipos span').forEach(y=>y.classList.toggle('on',y===x)); });
    $('admTab').querySelectorAll('.ablk').forEach(x=>x.onclick=e=>{ e.stopPropagation(); agSel={...B.find(b=>String(b.id)===x.dataset.id)}; pintarAgendaAdm(); });
    $('admTab').querySelectorAll('.agt.rel').forEach(x=>x.onclick=e=>{ const r=x.getBoundingClientRect(), h=H0+(e.clientX-r.left)/r.width*W, h0=Math.floor(h*4)/4; agSel={perfil_id:x.dataset.p,hora_inicio:hm(h0),hora_fin:hm(Math.min(H1,h0+1)),lugar:'',tarea:'',tipo:'sup',avisar:true}; pintarAgendaAdm(); });
    $('agNuevo').onclick=()=>{ agSel=null; pintarAgendaAdm(); };
    $('agXls').onclick=descargarAgenda;
    $('agG').onclick=async()=>{ const d={perfil_id:$('agP').value,hora_inicio:$('agD').value,hora_fin:$('agH').value,lugar:$('agL').value.trim(),tarea:$('agT').value.trim()||null,tipo,avisar:$('agA').checked};
      const err=m=>{ $('agErr').hidden=false; $('agErr').textContent=m; };
      if(!d.lugar) return err('Escribe el lugar.'); if(!d.hora_inicio||!d.hora_fin||d.hora_fin<=d.hora_inicio) return err('La hora final debe ser mayor que la inicial.');
      const cruce=B.find(b=>b.perfil_id===d.perfil_id&&(!agSel||b.id!==agSel.id)&&b.hora_inicio<d.hora_fin&&d.hora_inicio<b.hora_fin);
      if(cruce&&!confirm(`Se cruza con otro bloque de ${nom(d.perfil_id)} (${fmtHora(cruce.hora_inicio)}–${fmtHora(cruce.hora_fin)} · ${cruce.lugar}). ¿Guardar de todas formas?`)) return;
      const q=agSel&&agSel.id?sb().from('sd_agenda').update(d).eq('id',agSel.id).select().single():sb().from('sd_agenda').insert(d).select().single();
      const {data,error}=await q; if(error) return err('No se pudo guardar: '+error.message);
      aviso('Bloque guardado','ok'); agSel={...data,hora_inicio:String(data.hora_inicio).slice(0,5),hora_fin:String(data.hora_fin).slice(0,5)}; await tAgenda(); };
    if($('agDel')) $('agDel').onclick=async()=>{ if(!confirm('¿Eliminar este bloque?')) return; const {error}=await sb().from('sd_agenda').delete().eq('id',agSel.id); if(error) return aviso(error.message,'bad'); agSel=null; aviso('Bloque eliminado','ok'); await tAgenda(); };
    if($('agDup')) $('agDup').onclick=()=>{ const m=document.createElement('div'); m.className='admmodal'; document.body.appendChild(m);
      m.innerHTML=`<div class="amb"><h3>Duplicar para…</h3><p class="sm">${fmtHora(agSel.hora_inicio)}–${fmtHora(agSel.hora_fin)} · ${escHTML(agSel.lugar)}${agSel.tarea?' · '+escHTML(agSel.tarea):''}</p>
        <div class="alist">${M.filter(x=>x.id!==agSel.perfil_id).map(x=>`<label><input type="checkbox" value="${x.id}"> ${escHTML(x.nombre)}</label>`).join('')}</div>
        <div class="abtn"><button class="b2" id="duT">Todos</button><button class="b2" id="duX">Cancelar</button><button class="b1" id="duOk">Duplicar</button></div></div>`;
      m.querySelector('#duT').onclick=()=>m.querySelectorAll('input').forEach(i=>i.checked=true); m.querySelector('#duX').onclick=()=>m.remove();
      m.querySelector('#duOk').onclick=async()=>{ const ids=[...m.querySelectorAll('input:checked')].map(i=>i.value); if(!ids.length) return m.remove();
        const {error}=await sb().from('sd_agenda').insert(ids.map(id=>({perfil_id:id,hora_inicio:agSel.hora_inicio,hora_fin:agSel.hora_fin,lugar:agSel.lugar,tarea:agSel.tarea,tipo:agSel.tipo,avisar:agSel.avisar}))); m.remove();
        if(error) return aviso(error.message,'bad'); aviso(`Bloque copiado a ${ids.length} persona${ids.length>1?'s':''}`,'ok'); await tAgenda(); }; };
  }
  async function descargarAgenda(){ try{ await cargarXLSX(); const nom=id=>((AGS.m.find(x=>x.id===id)||{}).nombre||'');
      const filas=AGS.b.slice().sort((a,b)=>nom(a.perfil_id).localeCompare(nom(b.perfil_id),'es')||a.hora_inicio.localeCompare(b.hora_inicio)).map(b=>({Master:nom(b.perfil_id),Desde:b.hora_inicio,Hasta:b.hora_fin,Lugar:b.lugar,'Qué debe hacer':b.tarea||'',Tipo:(TIPOS[b.tipo]||TIPOS.sup)[0],Aviso:b.avisar?'Sí':'No'}));
      const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(filas),'Agenda Master'); XLSX.writeFile(wb,'agenda-master-steam-day.xlsx');
    }catch(e){ aviso('No se pudo generar: '+e.message,'bad'); } }

  window.abrirAdmin = abrir;
})();
