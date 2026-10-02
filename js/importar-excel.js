/* =====================================================================
   STEAM Day Cafam · Lector del Excel "HORARIOS DEL DÍA STEM"
   - Lee las hojas PRIMARIA y BACHILLERATO (acepta también "BACHILLRATO").
   - Ignora la columna OBSERVACIONES.
   - Lee la hoja del directorio (Hoja3) solo para obtener los correos.
   Requiere SheetJS (XLSX) cargado antes que este archivo.
   ===================================================================== */
(function (root) {
  'use strict';

  // ---------- utilidades ----------
  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function limpio(s) {
    if (s == null) return '';
    return String(s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  // Jornada escolar: 1–5 → tarde; 6–11 → mañana; 12 → mediodía.
  // Se ignoran "am/pm" escritos, porque el archivo trae errores como "11:30 pm a 12:30 pm".
  function aHora24(h, m) {
    h = Number(h); m = Number(m);
    if (h >= 1 && h <= 5) h += 12;
    return pad(h) + ':' + pad(m);
  }
  function leerFranja(txt) {
    const t = limpio(txt);
    const hs = [...t.matchAll(/(\d{1,2})\s*[:.]\s*(\d{2})/g)];
    if (hs.length < 2) return null;
    return { inicio: aHora24(hs[0][1], hs[0][2]), fin: aHora24(hs[1][1], hs[1][2]) };
  }
  function categoria(area) {
    const a = norm(area);
    if (a.includes('matem')) return 'mat';
    if (a.includes('cienc')) return 'cie';
    if (a.includes('tecno')) return 'tec';
    return 'gen';
  }
  const PAUSAS = ['descanso', 'almuerzo', 'refrigerio', 'receso'];

  // ---------- encabezados (por nombre, no por posición) ----------
  const COLS = {
    horario:   h => h.startsWith('horario'),
    grado:     h => h === 'curso',
    salon:     h => h.startsWith('salon'),
    area:      h => h.startsWith('area'),
    titulo:    h => h.includes('titulo') || h.includes('nombre de la actividad'),
    frase:     h => h.startsWith('frase'),
    cargo:     h => h.includes('a cargo') && h.startsWith('docente'),
    acomp:     h => h.includes('acompanante'),
    apoyo:     h => h.includes('apoyo'),
    obs:       h => h.startsWith('observ')
  };

  // Rellena las celdas combinadas: solo hacia abajo, en la columna izquierda de la combinación.
  function valorConCombinadas(ws) {
    const mapa = {};
    (ws['!merges'] || []).forEach(m => {
      const ref = XLSX.utils.encode_cell(m.s);
      const v = ws[ref] ? ws[ref].v : null;
      for (let r = m.s.r; r <= m.e.r; r++) mapa[r + ',' + m.s.c] = v;
    });
    return (r, c) => {
      const k = r + ',' + c;
      if (k in mapa) return mapa[k];
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      return cell ? cell.v : null;
    };
  }

  function leerHojaHorario(ws, nivel, avisos) {
    const rango = XLSX.utils.decode_range(ws['!ref']);
    const val = valorConCombinadas(ws);
    // buscar la fila de encabezados
    let filaEnc = -1, col = {};
    for (let r = rango.s.r; r <= Math.min(rango.e.r, 10) && filaEnc < 0; r++) {
      const enc = {};
      for (let c = rango.s.c; c <= rango.e.c; c++) {
        const h = norm(val(r, c));
        for (const k in COLS) if (h && !(k in enc) && COLS[k](h)) enc[k] = c;
      }
      if ('horario' in enc && 'salon' in enc) { filaEnc = r; col = enc; }
    }
    if (filaEnc < 0) { avisos.push(`Hoja ${nivel}: no se encontraron los encabezados HORARIOS y SALONES.`); return []; }
    ['area', 'acomp', 'apoyo'].forEach(k => { if (!(k in col)) avisos.push(`Hoja ${nivel}: falta la columna ${k.toUpperCase()}.`); });

    const filas = [];
    const g = (r, k) => (k in col ? limpio(val(r, col[k])) : '');
    for (let r = filaEnc + 1; r <= rango.e.r; r++) {
      const horario = g(r, 'horario');
      const grado = g(r, 'grado');
      const salonTxt = g(r, 'salon');
      const fila = r + 1;
      if (!salonTxt && !PAUSAS.includes(norm(grado))) continue;   // fila vacía
      const fr = leerFranja(horario);
      if (!fr) { avisos.push(`${nivel} fila ${fila}: no se entiende el horario "${horario}".`); continue; }
      if (fr.fin <= fr.inicio) avisos.push(`${nivel} fila ${fila}: la hora final no es posterior a la inicial ("${horario}").`);

      if (PAUSAS.includes(norm(grado))) {
        filas.push({ tipo: 'pausa', nivel, grado: null, curso: null, hora_inicio: fr.inicio, hora_fin: fr.fin,
          franja: horario, salon: '', area: grado, categoria: 'gen', titulo: grado, frase: '',
          docente_cargo: '', acompanante: '', apoyo: '', fila });
        continue;
      }
      const partes = salonTxt.split(/\s+-\s+/);
      const curso = limpio(partes[0]).toUpperCase();
      const salon = limpio(partes.slice(1).join(' - '));
      const area = g(r, 'area');
      filas.push({
        tipo: 'actividad', nivel, grado, curso,
        hora_inicio: fr.inicio, hora_fin: fr.fin, franja: horario,
        salon, area, categoria: categoria(area),
        titulo: g(r, 'titulo'), frase: g(r, 'frase'),
        docente_cargo: g(r, 'cargo'), acompanante: g(r, 'acomp'), apoyo: g(r, 'apoyo'), fila
      });
    }
    return filas;
  }

  // Directorio (Hoja3): columnas DOCENTE y CORREO, en bloques con encabezados repetidos.
  function leerDirectorio(ws) {
    const rango = XLSX.utils.decode_range(ws['!ref']);
    const val = valorConCombinadas(ws);
    const out = [];
    let cNom = 1, cCor = 2;
    for (let r = rango.s.r; r <= rango.e.r; r++) {
      for (let c = rango.s.c; c <= rango.e.c; c++) {
        const h = norm(val(r, c));
        if (h === 'docente' || h === 'nombre') cNom = c;
        if (h === 'correo') cCor = c;
      }
      const correo = limpio(val(r, cCor)).toLowerCase();
      const nombre = limpio(val(r, cNom));
      if (correo.includes('@') && nombre) out.push({ nombre, correo, cargo: limpio(val(r, 0)) });
    }
    return out;
  }

  // Busca el correo de un nombre del horario en el directorio (exacto o por prefijo,
  // porque el directorio a veces agrega texto como "TR° y 1°").
  function buscarCorreo(nombre, dir) {
    const n = norm(nombre);
    if (!n) return null;
    let d = dir.find(x => norm(x.nombre) === n);
    if (!d) d = dir.find(x => norm(x.nombre).startsWith(n + ' ') || norm(x.nombre).startsWith(n));
    return d ? d.correo : null;
  }

  function leerLibro(wb) {
    const avisos = [];
    const nombres = wb.SheetNames;
    const hPri = nombres.find(n => norm(n).startsWith('primaria'));
    const hBach = nombres.find(n => norm(n).startsWith('bachil'));
    if (!hPri) avisos.push('No se encontró la hoja PRIMARIA.');
    if (!hBach) avisos.push('No se encontró la hoja BACHILLERATO.');
    const filas = [
      ...(hPri ? leerHojaHorario(wb.Sheets[hPri], 'Primaria', avisos) : []),
      ...(hBach ? leerHojaHorario(wb.Sheets[hBach], 'Bachillerato', avisos) : [])
    ];
    // directorio: cualquier otra hoja que tenga columna CORREO
    let directorio = [];
    nombres.filter(n => n !== hPri && n !== hBach).forEach(n => {
      directorio = directorio.concat(leerDirectorio(wb.Sheets[n]));
    });

    // ---------- docentes y sus cursos ----------
    const docentes = {};
    const add = (nombre, rol, curso) => {
      if (!nombre) return;
      const k = norm(nombre);
      docentes[k] = docentes[k] || { nombre, correo: buscarCorreo(nombre, directorio), acompana: new Set(), apoya: new Set(), cargo: new Set() };
      docentes[k][rol].add(curso);
    };
    filas.filter(f => f.tipo === 'actividad').forEach(f => {
      add(f.acompanante, 'acompana', f.curso);
      add(f.apoyo, 'apoya', f.curso);
      if (f.docente_cargo && !/director de curso|docentes del/i.test(f.docente_cargo)) add(f.docente_cargo, 'cargo', f.curso);
    });
    const listaDoc = Object.values(docentes).map(d => ({
      nombre: d.nombre, correo: d.correo,
      acompana: [...d.acompana].sort(), apoya: [...d.apoya].sort(), cargo: [...d.cargo].sort()
    })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    // ---------- revisión ----------
    const act = filas.filter(f => f.tipo === 'actividad');
    const pendientes = {
      sin_titulo: act.filter(f => !f.titulo).length,
      sin_frase: act.filter(f => !f.frase).length,
      sin_docente_cargo: act.filter(f => !f.docente_cargo).length,
      sin_acompanante: act.filter(f => !f.acompanante).length,
      sin_apoyo: act.filter(f => !f.apoyo).length
    };
    listaDoc.filter(d => !d.correo).forEach(d => avisos.push(`Sin correo en el directorio: ${d.nombre}.`));
    // choques: mismo curso en dos franjas que se cruzan
    const porCurso = {};
    act.forEach(f => (porCurso[f.curso] = porCurso[f.curso] || []).push(f));
    Object.entries(porCurso).forEach(([c, fs]) => {
      fs.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      for (let i = 1; i < fs.length; i++)
        if (fs[i].hora_inicio < fs[i - 1].hora_fin)
          avisos.push(`El curso ${c} tiene dos actividades que se cruzan (${fs[i - 1].franja} y ${fs[i].franja}).`);
    });

    return {
      filas, directorio, docentes: listaDoc, avisos, pendientes,
      resumen: {
        filas: act.length, pausas: filas.length - act.length,
        cursos: Object.keys(porCurso).length,
        acompanantes: listaDoc.filter(d => d.acompana.length).length,
        apoyos: listaDoc.filter(d => d.apoya.length).length,
        apoyos_dos_cursos: listaDoc.filter(d => d.apoya.length > 1).length
      }
    };
  }

  // Lee un archivo (File del navegador o ArrayBuffer)
  async function leerArchivo(archivo) {
    const buf = archivo.arrayBuffer ? await archivo.arrayBuffer() : archivo;
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    return leerLibro(wb);
  }

  const api = { leerArchivo, leerLibro, norm, leerFranja, categoria };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SteamExcel = api;
})(typeof window !== 'undefined' ? window : globalThis);
