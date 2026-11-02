'use strict';
/* =====================================================================
   onboard.js — Primeros pasos (para quien viene de Excel) e importación.
   Nada se guarda hasta que la usuaria confirma la vista previa.
   ===================================================================== */

const ONB_STEPS = [
  { key: 'products', title: 'Cargá tus productos', text: 'Tus yogures con sus tamaños, sabores y precios.', act: 'onb-products', label: 'Ver productos', importAs: 'productos' },
  { key: 'stock', title: 'Registrá tu stock inicial', text: 'Cuántos frascos tenés hoy de cada producto, con su fecha de elaboración.', act: 'import', arg: 'stock', label: 'Cargar stock' },
  { key: 'clients', title: 'Importá tus clientes desde Excel', text: 'Sumá tu lista de clientes en un solo paso para empezar a tomar pedidos.', act: 'import', arg: 'clientes', label: 'Importar archivo', excel: true },
  { key: 'order', title: 'Creá tu primer pedido', text: 'Probá el circuito completo: tomá un pedido, planificá la producción y prepará la entrega.', act: 'new-order', label: 'Crear pedido' },
];
const onbDone = () => ONB_STEPS.filter(s => S.onboard[s.key]).length;

function bowlArt() {
  return `<svg viewBox="0 0 220 150" aria-hidden="true" class="bowl-art">
    <path d="M40 18l6-10M52 22l10-6M30 26l-10-4" stroke="var(--brand)" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="118" cy="132" rx="84" ry="10" fill="var(--sage-2)" opacity=".35"/>
    <path d="M28 70h180c0 34-34 62-90 62S28 104 28 70z" fill="#F3E6D8" stroke="#D8C2AE" stroke-width="2"/>
    <ellipse cx="118" cy="70" rx="90" ry="20" fill="#FFFCF6" stroke="#D8C2AE" stroke-width="2"/>
    <g fill="#C08A3E">${[[80, 62], [92, 70], [104, 60], [118, 72], [128, 62], [140, 70], [152, 61], [96, 78], [134, 79]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" transform="rotate(${(x * 7) % 50 - 25} ${x} ${y})"/>`).join('')}</g>
    <path d="M150 56c8-14 30-14 36 2-8 10-26 12-36-2z" fill="#D33B4E"/><path d="M160 66c10-10 28-6 30 8-10 6-26 4-30-8z" fill="#B82E40"/>
    <path d="M166 50l6-6M176 52l4-7" stroke="#5E7A47" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}

function vBienvenida() {
  const n = onbDone(), pct = Math.round(n / ONB_STEPS.length * 100);
  const nextStep = ONB_STEPS.find(s => !S.onboard[s.key]);
  return `<div class="wrap onb">
  <section class="onb-hero">
    <div class="onb-hello"><h1 class="w-title big">¡Bienvenida, ${esc(S.config.user)}! 🧡</h1><p>Soy Gri. Vamos a organizar tu negocio juntas, paso a paso.</p></div>
    <div class="onb-art">${bowlArt()}</div>
  </section>
  <div class="grid onb-grid">
    <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
      <div class="card onb-progress"><b>${n} de ${ONB_STEPS.length} pasos completados</b><div class="prog good"><i style="width:${pct}%"></i></div><span class="chip">${pct}%</span></div>
      ${ONB_STEPS.map((s, i) => { const ok = S.onboard[s.key]; return `<div class="card onb-step ${ok ? 'ok' : ''}"><span class="onb-num">${ok ? ic('check') : i + 1}</span><div class="onb-txt"><h3>${i + 1}. ${s.title}</h3><p>${s.text}</p></div>
        ${s.excel ? `<span class="xls">${xlsIcon()}<small>Excel o CSV</small></span>` : ''}
        <div class="onb-act">${ok ? `<span class="chip good">${ic('check', 'sm')}Completado</span><button class="btn sm" data-act="${s.act}" ${s.arg ? `data-arg="${s.arg}"` : ''}>${s.key === 'order' ? 'Otro pedido' : 'Editar'}</button>` : `<button class="btn ${s.excel ? 'terra-o' : ''}" data-act="${s.act}" ${s.arg ? `data-arg="${s.arg}"` : ''}>${s.excel ? ic('up', 'sm') : ''}${s.label}</button>`}</div></div>`; }).join('')}
      <div class="onb-foot"><button class="btn ghost" data-act="import" data-arg="productos">${ic('up', 'sm')}Importar productos y precios</button><button class="btn primary lg" data-act="onb-continue">${nextStep ? 'Continuar' : 'Ir al inicio'} ${ic('chev', 'sm')}</button></div>
      <p class="hint">Es una demo: lo que cargues queda en este navegador y podés volver a empezar desde Ajustes → Restablecer.</p>
    </div>
    <aside class="card onb-how">
      <h2 class="w-title" style="font-size:28px">¿Cómo funciona?</h2>
      <p class="muted" style="margin:0">${esc(S.config.brand)} te ayuda a gestionar tu negocio de punta a punta, de forma simple.</p>
      ${[['orders', 'orange', 'Pedidos', 'Tomás y organizás los pedidos de tus clientes.'], ['pot', 'sage', 'Producción', 'Planificás qué y cuánto producir según tus pedidos y tu stock.'], ['truck', 'blue', 'Entrega', 'Coordinás los envíos y hacés el seguimiento hasta la entrega.']].map(([i, t, h, p]) => `<div class="how-item"><span class="how-ico bg-${t}">${ic(i)}</span><div><b>${h}</b><p>${p}</p></div></div>`).join('')}
      <div class="excel-note">${xlsIcon()}<p><b>¿Venís de Excel?</b> No perdés nada: importás tus planillas y las seguís teniendo como respaldo.</p></div>
      <button class="btn block" data-act="tour">${ic('info', 'sm')}Ver el recorrido guiado</button>
      <div class="onb-mascot">${griMascot(96)}</div>
    </aside>
  </div></div>`;
}
const xlsIcon = () => `<svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true"><path d="M5 1h14l8 8v22a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="#fff" stroke="#1F7244" stroke-width="1.6"/><path d="M19 1v8h8" fill="none" stroke="#1F7244" stroke-width="1.6"/><rect x="1" y="12" width="17" height="15" rx="2" fill="#1F7244"/><path d="M5.5 15.5l8 8M13.5 15.5l-8 8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/* ---------- Importación ---------- */
const IMP = {
  clientes: { title: 'Clientes', cols: [['nombre', true, ['nombre', 'cliente', 'nombreyapellido', 'razonsocial', 'name']], ['telefono', false, ['telefono', 'tel', 'celular', 'whatsapp', 'cel']], ['direccion', false, ['direccion', 'domicilio', 'calle']], ['barrio', false, ['barrio', 'localidad', 'zona']], ['referencia', false, ['referencia', 'ref', 'observaciones', 'notas']], ['canal', false, ['canal', 'origen']]] },
  productos: { title: 'Productos y precios', cols: [['producto', true, ['producto', 'nombre', 'descripcion', 'articulo']], ['precio', true, ['precio', 'precioventa', 'pvp', 'preciounitario']], ['tamano', false, ['tamano', 'tamanio', 'gramos', 'presentacion', 'peso', 'tam']], ['vida', false, ['vidautil', 'vidautildias', 'dias', 'diasvencimiento', 'duracion']]] },
  stock: { title: 'Stock inicial', cols: [['producto', true, ['producto', 'nombre', 'descripcion', 'articulo']], ['cantidad', true, ['cantidad', 'unidades', 'stock', 'cant']], ['elaboracion', false, ['fechaelaboracion', 'elaboracion', 'fecha', 'elaborado']], ['vencimiento', false, ['vencimiento', 'fechavencimiento', 'vence']]] },
};
const nkey = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.includes('\t') ? '\t' : ',');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}
function parseMoneyAR(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s);
}
function parseSize(v) {
  if (typeof v === 'number') return v;
  const s = String(v || '').toLowerCase().replace(',', '.');
  const m = s.match(/([\d.]+)\s*(kg|k|g|gr|grs|gramos)?/); if (!m) return NaN;
  const n = parseFloat(m[1]); return /k/.test(m[2] || '') ? Math.round(n * 1000) : Math.round(n);
}
function parseDateAny(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number' && v > 20000 && v < 80000) return fromT(Date.UTC(1899, 11, 30) + v * DAY);
  if (v instanceof Date) return fromT(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; if (+m[2] > 12 || +m[1] > 31) return 'bad'; return y + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
  return 'bad';
}
function findSku(name) {
  const k = nkey(name).replace(/^yogur(t)?(griego)?/, '');
  return S.skus.find(s => nkey(s.name).replace(/^yogur(t)?(griego)?/, '') === k || nkey(skuShort(s)) === k || nkey(s.code) === nkey(name));
}
function validateImport(type, matrix) {
  const def = IMP[type];
  const head = (matrix[0] || []).map(nkey);
  const idx = {}, missing = [];
  for (const [key, req, aliases] of def.cols) { const i = head.findIndex(h => aliases.includes(h)); if (i >= 0) idx[key] = i; else if (req) missing.push(key); }
  if (!matrix.length) return { error: 'El archivo está vacío.' };
  if (missing.length) return { error: `Falta la columna ${missing.map(m => '“' + m + '”').join(' y ')}. Revisá que la primera fila tenga los encabezados.` };
  const seen = new Set(), out = [];
  for (let r = 1; r < matrix.length; r++) {
    const raw = matrix[r], get = k => idx[k] != null ? raw[idx[k]] : '';
    const d = {}; for (const k in idx) d[k] = typeof get(k) === 'string' ? get(k).trim() : get(k);
    const item = { line: r + 1, d, status: 'nuevo', msg: '' };
    const err = m => { item.status = 'error'; item.msg = m; };
    if (type === 'clientes') {
      d.nombre = String(d.nombre || '').trim();
      const ph = String(d.telefono || '').replace(/\D/g, '');
      if (!d.nombre) err('Falta el nombre');
      else if (seen.has(nkey(d.nombre))) err('Repetido en el archivo');
      else if (S.clients.some(c => nkey(c.name) === nkey(d.nombre) || (ph.length >= 6 && (c.phone || '').replace(/\D/g, '').endsWith(ph.slice(-8))))) { item.status = 'duplicado'; item.msg = 'Ya existe: no se modifica'; }
      d.telefono = String(d.telefono || ''); d.canal = Object.keys(CHANNELS).find(k => nkey(CHANNELS[k]) === nkey(d.canal) || k === nkey(d.canal)) || '';
      seen.add(nkey(d.nombre));
    } else if (type === 'productos') {
      d.producto = String(d.producto || '').trim(); d.precio = Math.round(parseMoneyAR(d.precio));
      const ex = d.producto && findSku(d.producto);
      if (!d.producto) err('Falta el nombre del producto');
      else if (seen.has(nkey(d.producto))) err('Repetido en el archivo');
      else if (!(d.precio > 0)) err('El precio no es válido');
      else if (ex) { item.status = ex.price === d.precio ? 'duplicado' : 'existe'; item.msg = ex.price === d.precio ? 'Ya existe con el mismo precio' : `Ya existe con precio ${money(ex.price)}. No se modifica`; item.sku = ex.id; }
      else {
        d.tamano = parseSize(d.tamano); d.vida = Math.round(+String(d.vida || '').replace(',', '.'));
        if (!(d.tamano > 0)) err('Falta el tamaño (por ejemplo 500 g)');
        else if (!(d.vida >= 1 && d.vida <= 60)) err('Falta la vida útil validada en días (1 a 60)');
        else item.msg = `Producto nuevo · ${sizeLabel(d.tamano)} · vence a los ${d.vida} días`;
      }
      seen.add(nkey(d.producto));
    } else {
      const sku = findSku(d.producto);
      d.cantidad = Math.round(parseMoneyAR(d.cantidad));
      const el = parseDateAny(d.elaboracion), ve = parseDateAny(d.vencimiento);
      if (!d.producto) err('Falta el producto');
      else if (!sku) err('Producto no encontrado: cargalo primero');
      else if (!(d.cantidad > 0)) err('La cantidad no es válida');
      else if (el === 'bad' || ve === 'bad') err('Fecha con formato desconocido (usá dd/mm/aaaa)');
      else {
        d.elaboracion = el || TODAY();
        if (d.elaboracion > TODAY()) err('La elaboración es posterior a hoy');
        else {
          d.vencimiento = ve || addDays(d.elaboracion, sku.shelf);
          if (d.vencimiento < TODAY()) err('Ya está vencido');
          else if (S.lots.some(l => l.skuId === sku.id && l.made === d.elaboracion && l.qty > 0) || seen.has(sku.id + d.elaboracion)) { item.status = 'duplicado'; item.msg = 'Ya hay un lote de ese día: no se agrega'; }
          else item.msg = `${d.cantidad} × ${skuShort(sku)} · vence ${fmtDate(d.vencimiento)}${ve ? '' : ' (según su vida útil)'}`;
          d._sku = sku.id; seen.add(sku.id + d.elaboracion);
        }
      }
    }
    out.push(item);
  }
  return { rows: out };
}
function importBody() {
  const C = M.ctx, def = IMP[C.type];
  const res = C.res;
  const counts = res && res.rows ? { nuevo: res.rows.filter(r => r.status === 'nuevo').length, existe: res.rows.filter(r => r.status === 'existe').length, dup: res.rows.filter(r => r.status === 'duplicado').length, err: res.rows.filter(r => r.status === 'error').length } : null;
  const ok = counts ? counts.nuevo + (C.update ? counts.existe : 0) : 0;
  return `<div class="m-body">
    <div class="seg">${Object.keys(IMP).map(k => `<button type="button" class="${C.type === k ? 'on' : ''}" data-act="imp-type" data-arg="${k}">${IMP[k].title}</button>`).join('')}</div>
    <div class="imp-cols"><div class="flabel">Columnas que leo</div><div class="chips">${def.cols.map(([k, req]) => `<span class="chip ${req ? 'terra' : ''}">${k}${req ? ' *' : ''}</span>`).join('')}</div><span class="hint">* obligatorias. Los encabezados pueden estar con o sin tildes.${C.type === 'productos' ? ' Para productos nuevos también hacen falta tamaño y vida útil.' : ''}</span><button type="button" class="btn sm ghost" data-act="imp-headers">${ic('copy', 'sm')}Copiar encabezados para Excel</button></div>
    <label class="drop"><input type="file" id="imp-file" accept=".xlsx,.xls,.csv,.txt" data-imp="1"><span>${xlsIcon()}<b>${C.file ? esc(C.file) : 'Elegí el archivo'}</b><small>Excel (.xlsx, .xls) o CSV</small></span></label>
    ${C.loading ? '<div class="hint">Leyendo el archivo…</div>' : ''}
    ${res && res.error ? `<div class="incident">${ic('alert', 'sm')}<span>${esc(res.error)}</span></div>` : ''}
    ${counts ? `<div class="chips"><span class="chip good">${counts.nuevo} para importar</span>${counts.existe ? `<span class="chip info">${counts.existe} ya existen</span>` : ''}${counts.dup ? `<span class="chip">${counts.dup} duplicados (se omiten)</span>` : ''}${counts.err ? `<span class="chip bad">${counts.err} con errores</span>` : ''}</div>
      ${C.type === 'productos' && counts.existe ? `<label class="checkline"><input type="checkbox" id="imp-upd" data-imp="1" ${C.update ? 'checked' : ''}> Actualizar el precio de los ${counts.existe} productos que ya existen</label>` : ''}
      <div class="imp-prev">${res.rows.slice(0, 60).map(r => `<div class="ip-row ip-${r.status}"><span class="ip-line">Fila ${r.line}</span><span class="ip-main">${esc(r.d.nombre || r.d.producto || '—')}${r.d.precio ? ' · ' + money(r.d.precio) : ''}</span><span class="ip-msg">${r.status === 'existe' && C.update ? 'Se actualiza el precio a ' + money(r.d.precio) : esc(r.msg || (r.status === 'nuevo' ? 'Nuevo' : ''))}</span></div>`).join('')}${res.rows.length > 60 ? `<div class="hint">Y ${res.rows.length - 60} filas más.</div>` : ''}</div>` : ''}
  </div><div class="m-foot"><span class="hint grow">Nada se guarda hasta que confirmes.</span><button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn primary" ${ok ? '' : 'disabled'}>Importar ${ok || ''}</button></div>`;
}
function openImport(type) {
  openModal(mHead('Importar desde Excel', 'Revisá la vista previa antes de guardar. No se pisa nada de lo que ya tenés.') + '<div id="imp-wrap"></div>', {
    wide: true, ctx: { type: type || 'clientes', res: null, file: '', update: false },
    onInput: el => { if (el.id === 'imp-upd') { M.ctx.update = el.checked; impRender(); } },
    submit: () => {
      const C = M.ctx; if (!C.res || !C.res.rows) return;
      const rows = C.res.rows.filter(r => r.status === 'nuevo' || (r.status === 'existe' && C.update));
      if (!rows.length) return;
      done(run(() => C.type === 'clientes' ? A.importClients(rows.map(r => r.d)) : C.type === 'productos' ? A.importProducts(rows.map(r => Object.assign({}, r.d, r.status === 'existe' ? { _update: r.sku } : {}))) : A.importStock(rows.map(r => r.d))));
    },
  });
  impRender();
}
function impRender() { const w = $('#imp-wrap'); if (w) w.innerHTML = importBody(); }
let XLSX_LOADING = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (XLSX_LOADING) return XLSX_LOADING;
  XLSX_LOADING = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => ok(window.XLSX); s.onerror = () => { XLSX_LOADING = null; ko(new Error('xlsx')); }; document.head.appendChild(s); });
  return XLSX_LOADING;
}
async function impReadFile(file) {
  const C = M.ctx; C.file = file.name; C.res = null; C.loading = true; impRender();
  try {
    let matrix;
    if (/\.(csv|txt)$/i.test(file.name)) matrix = parseCSV(await file.text());
    else {
      let X; try { X = await loadXLSX(); } catch (e) { C.loading = false; C.res = { error: 'No se pudo abrir el lector de Excel. Guardá la planilla como CSV (Archivo → Guardar como → CSV) y probá de nuevo.' }; impRender(); return; }
      const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      matrix = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    }
    C.loading = false; C.res = validateImport(C.type, matrix); impRender();
  } catch (e) { console.error(e); C.loading = false; C.res = { error: 'No pude leer el archivo. Revisá que sea un Excel o CSV válido.' }; impRender(); }
}
document.addEventListener('change', e => { if (e.target.id === 'imp-file' && e.target.files[0] && M.ctx) impReadFile(e.target.files[0]); });

const ONB_ACT = {
  import: a => { closeModal(); openImport(a || 'clientes'); },
  'imp-type': a => { M.ctx.type = a; M.ctx.res = null; M.ctx.file = ''; M.ctx.update = false; impRender(); },
  'imp-headers': () => copyText(IMP[M.ctx.type].cols.map(c => c[0]).join('\t'), 'Encabezados copiados: pegalos en la primera fila de tu Excel'),
  'onb-products': () => { U.prod.tab = 'recetas'; go('produccion'); render(); },
  'onb-continue': () => { const s = ONB_STEPS.find(x => !S.onboard[x.key]); if (!s) { go('inicio'); return; } ACT[s.act](s.arg); },
};
