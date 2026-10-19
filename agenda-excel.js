/* =====================================================================
   STEM Day Cafam · v40 · Lector del Excel de agenda de coordinadores y Bienestar
   Formato: una hoja con una fila de horas («7:00 a 7:30 am», «8:00 a 9:00 am»…),
   debajo (opcional) una fila de títulos (ASISTENCIA, ROTACIÓN…), y una fila por persona:
   CARGO · NOMBRE · lugar de cada franja. Otra hoja con columna de correos sirve de directorio.
   Devuelve { personas:[{cargo,nombre,correo,bloques:[{hora_inicio,hora_fin,lugar,tarea,tipo}]}], avisos:[] }
   ===================================================================== */
(function (root) {
  'use strict';
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const limpio = s => String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const h24 = (h, m) => { h = +h; m = +m; if (h >= 1 && h <= 5) h += 12; return pad(h) + ':' + pad(m); };
  const RX_FRANJA = /(\d{1,2})[:.](\d{2})\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?\s*(?:a|-|–|hasta)\s*(\d{1,2})[:.](\d{2})/i;
  function franja(txt) { const m = String(txt || '').match(RX_FRANJA); return m ? [h24(m[1], m[2]), h24(m[3], m[4])] : null; }
  // «Zamora Deisy Julieth 4° y 5°» → «Zamora Deisy Julieth»
  const nombreLimpio = n => limpio(n).replace(/\s+(TR\s*°|\d+\s*°).*$/i, '').replace(/\s+\d.*$/, '').trim();
  const palabras = n => norm(n).replace(/[^a-z ]/g, ' ').split(' ').filter(w => w.length > 1);
  // «AB203, 106, 107,AC102, 103» → «AB203, AB106, AB107, AC102, AC103»
  function expandir(txt) {
    const t = limpio(txt); if (!/,/.test(t)) return t;
    let pref = ''; return t.split(/\s*,\s*/).filter(Boolean).map(x => { const m = x.match(/^([A-Za-z]{1,3})?\s*(\d{2,3}[A-Za-z]?)$/);
      if (!m) { pref = ''; return x; } if (m[1]) pref = m[1].toUpperCase(); return (pref || '') + m[2]; }).join(', ');
  }
  const bonito = s => { const t = limpio(s); return t === t.toUpperCase() && /[A-ZÁÉÍÓÚ]{4}/.test(t) ? t.charAt(0) + t.slice(1).toLowerCase().replace(/\bpiso\b/g, 'piso').replace(/\bbachillerato\b/g, 'Bachillerato').replace(/\bprimaria\b/g, 'Primaria').replace(/\bcoliseo\b/g, 'Coliseo').replace(/\bmaloka\b/g, 'Maloka').replace(/\btr\b/g, 'TR') : t; };

  function bloque(celda, titulo, h) {
    const c = limpio(celda), k = norm(c), tk = norm(titulo);
    if (!c) return null;
    const b = { hora_inicio: h[0], hora_fin: h[1], lugar: '', tarea: '', tipo: 'sup' };
    if (/almuerzo/.test(k)) { b.tipo = 'lib'; b.lugar = /restaurante/.test(k) ? 'Restaurante' : /salon/.test(k) ? 'Salones de los cursos' : bonito(c); b.tarea = 'Almuerzo'; return b; }
    if (/ruta asignada/.test(k)) { b.tipo = 'lib'; const sube = /subir/.test(k); b.lugar = sube ? 'Ruta para subir a Bachillerato' : 'Ruta para bajar a Primaria'; b.tarea = 'Desplazamiento y descanso: acompañar a los cursos por la ruta asignada'; return b; }
    if (/stem day/.test(k)) { b.tipo = 'acom'; b.lugar = /primaria/.test(k) ? 'STEM Day · Primaria' : 'STEM Day · Bachillerato'; b.tarea = 'Acompañar las actividades del STEM Day'; return b; }
    if (/asistencia/.test(tk)) { b.lugar = bonito(c); b.tarea = 'Acompañar el llamado a lista (asistencia) en ' + bonito(c); return b; }
    b.lugar = expandir(bonito(c));
    if (/cierre/.test(tk)) b.tarea = 'Cierre de la jornada: acompañar a los cursos en estos espacios';
    else if (/desplazamiento|descanso/.test(tk)) b.tarea = 'Acompañar el descanso en ' + b.lugar;
    else b.tarea = 'Supervisar la rotación: que los cursos lleguen a tiempo y que la convivencia esté bien';
    return b;
  }

  function leerDirectorio(ws, XLSX) {
    const out = []; const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    rows.forEach(r => { const i = r.findIndex(c => /@[a-z0-9.-]+\.[a-z]{2,}/i.test(String(c))); if (i < 1) return;
      const correo = (String(r[i]).match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i) || [''])[0].toLowerCase();
      const nombre = nombreLimpio(r[i - 1]); if (nombre && correo) out.push({ nombre, correo }); });
    return out;
  }
  function buscarCorreo(nombre, dir) {
    const k = norm(nombre), tk = palabras(nombre);
    let d = dir.find(x => norm(x.nombre) === k); if (d) return d.correo;
    const c = dir.filter(x => { const w = palabras(x.nombre); return tk.length >= 2 && tk.every(t => w.includes(t)); });
    return c.length === 1 ? c[0].correo : '';
  }

  function leerLibro(wb, XLSX) {
    XLSX = XLSX || root.XLSX; const avisos = []; let hoja = null, hr = -1;
    for (const n of wb.SheetNames) { const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
      const i = rows.findIndex(r => r.filter(c => franja(c)).length >= 3); if (i >= 0) { hoja = { n, rows }; hr = i; break; } }
    if (!hoja) return { personas: [], avisos: ['No encontré una hoja con las franjas de horas (por ejemplo «8:00 a 9:00 am»).'] };
    const R = hoja.rows, H = R[hr], cols = H.map((c, i) => ({ i, h: franja(c) })).filter(x => x.h);
    const t0 = cols[0].i, cNom = t0 - 1, cCar = t0 - 2;
    let lab = R[hr + 1] || [], ini = hr + 1;
    const esTit = lab.some(c => /asistencia|rotaci|cierre|almuerzo|desplazamiento/i.test(String(c))) && !lab.some(c => /@/.test(String(c)));
    if (esTit) ini = hr + 2; else lab = [];
    let dir = []; wb.SheetNames.filter(n => n !== hoja.n).forEach(n => { dir = dir.concat(leerDirectorio(wb.Sheets[n], XLSX)); });
    const personas = [];
    for (let r = ini; r < R.length; r++) {
      const fila = R[r], nombre = nombreLimpio(fila[cNom]); if (!nombre || nombre.length < 5) continue;
      const bloques = cols.map(x => bloque(fila[x.i], lab[x.i] || '', x.h)).filter(Boolean);
      if (!bloques.length) continue;
      personas.push({ fila: r + 1, cargo: cCar >= 0 ? limpio(fila[cCar]) : '', nombre, correo: buscarCorreo(nombre, dir), bloques });
    }
    personas.filter(p => !p.correo).forEach(p => avisos.push(`Sin correo en el archivo: ${p.nombre}.`));
    return { hoja: hoja.n, franjas: cols.map(x => x.h), personas, avisos };
  }
  async function leerArchivo(archivo) { const buf = archivo.arrayBuffer ? await archivo.arrayBuffer() : archivo; return leerLibro(root.XLSX.read(buf, { type: 'array' }), root.XLSX); }
  const api = { leerArchivo, leerLibro, franja, expandir, nombreLimpio, palabras };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AgendaExcel = api;
})(typeof window !== 'undefined' ? window : globalThis);
