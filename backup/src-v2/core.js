'use strict';
/* =====================================================================
   YOGUR STUDIO · DEMO
   core.js — utilidades, catálogo, datos ficticios, estado y reglas de negocio.
   Todo número que se ve en pantalla se calcula desde este estado.
   ===================================================================== */

const VERSION = 5;
const STORE_KEY = 'lagriega-demo';
const LOGO = 'data:image/png;base64,__LOGO__';

/* ---------- Utilidades ---------- */
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const toT = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromT = t => new Date(t).toISOString().slice(0, 10);
const addDays = (s, n) => fromT(toT(s) + n * DAY);
const diffDays = (a, b) => Math.round((toT(a) - toT(b)) / DAY);
const weekday = s => new Date(toT(s)).getUTCDay();
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const fmtDate = s => { const d = new Date(toT(s)); return d.getUTCDate() + ' ' + MESES[d.getUTCMonth()]; };
const fmtLong = s => { const d = new Date(toT(s)); return cap(DIAS[d.getUTCDay()]) + ' ' + d.getUTCDate() + ' de ' + MESES_L[d.getUTCMonth()]; };
const realToday = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const nowTime = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const money = n => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('es-AR');
const fmtN = (n, d = 2) => Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });
const pctTxt = r => (isFinite(r) ? Math.round(r * 100) : 0) + '%';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
const uid = p => p + Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

class UserError extends Error {}
const fail = m => { throw new UserError(m); };

/* ---------- Catálogo ---------- */
const FLAVORS = {
  natural: { name: 'Natural', top: null },
  frutos: { name: 'Frutos rojos', top: '#B83A55' },
  miel: { name: 'Miel y granola', top: '#D29A2F' },
  arandanos: { name: 'Arándanos', top: '#4F4889' },
};
const SIZES = { 250: '250 g', 500: '500 g', 1000: '1 kg' };
const sizeLabel = n => SIZES[n] || (n >= 1000 ? fmtN(n / 1000, 2) + ' kg' : n + ' g');
let LOG_RES = true;

const SKUS_SEED = [
  { id: 'nat250', code: 'YN250', flavor: 'natural', size: 250, price: 3200, labor: 350, shelf: 21, min: 6, recipe: { leche: .75, cultivo: .4, frasco250: 1, tapa: 1, etiqueta: 1 } },
  { id: 'nat500', code: 'YN500', flavor: 'natural', size: 500, price: 5600, labor: 550, shelf: 21, min: 8, recipe: { leche: 1.5, cultivo: .75, frasco500: 1, tapa: 1, etiqueta: 1 } },
  { id: 'nat1k', code: 'YN1K', flavor: 'natural', size: 1000, price: 9800, labor: 900, shelf: 21, min: 2, recipe: { leche: 3, cultivo: 1.5, pote1k: 1, tapa: 1, etiqueta: 1 } },
  { id: 'fr250', code: 'FR250', flavor: 'frutos', size: 250, price: 4200, labor: 450, shelf: 14, min: 4, recipe: { leche: .6, cultivo: .3, frutillas: .035, frambuesas: .02, azucar: .008, frasco250: 1, tapa: 1, etiqueta: 1 } },
  { id: 'fr500', code: 'FR500', flavor: 'frutos', size: 500, price: 7400, labor: 700, shelf: 14, min: 6, recipe: { leche: 1.2, cultivo: .6, frutillas: .07, frambuesas: .04, azucar: .015, frasco500: 1, tapa: 1, etiqueta: 1 } },
  { id: 'mg500', code: 'MG500', flavor: 'miel', size: 500, price: 7200, labor: 650, shelf: 10, min: 4, recipe: { leche: 1.3, cultivo: .65, miel: .05, granola: .06, frasco500: 1, tapa: 1, etiqueta: 1 } },
  { id: 'ar500', code: 'AR500', flavor: 'arandanos', size: 500, price: 7400, labor: 650, shelf: 14, min: 4, recipe: { leche: 1.3, cultivo: .65, arandanos: .08, azucar: .01, frasco500: 1, tapa: 1, etiqueta: 1 } },
];

const INSUMOS_SEED = [
  ['leche', 'Leche entera', 'L', 'ingrediente', 1150, 140, 120],
  ['cultivo', 'Cultivo láctico', 'g', 'ingrediente', 45, 260, 120],
  ['frutillas', 'Frutillas', 'kg', 'ingrediente', 6500, 1.6, 2],
  ['frambuesas', 'Frambuesas', 'kg', 'ingrediente', 9800, 1.6, 1],
  ['arandanos', 'Arándanos', 'kg', 'ingrediente', 11000, 2.2, 1],
  ['miel', 'Miel pura', 'kg', 'ingrediente', 7000, 3.5, 1],
  ['granola', 'Granola artesanal', 'kg', 'ingrediente', 8500, 2.8, 1.5],
  ['almendras', 'Almendras', 'kg', 'ingrediente', 16000, 1.2, .5],
  ['chia', 'Semillas de chía', 'kg', 'ingrediente', 9000, .9, .3],
  ['azucar', 'Azúcar mascabo', 'kg', 'ingrediente', 3200, 4, 1],
  ['frasco250', 'Frasco de vidrio 250 g', 'u', 'envase', 380, 70, 50],
  ['frasco500', 'Frasco de vidrio 500 g', 'u', 'envase', 520, 85, 60],
  ['pote1k', 'Pote 1 kg', 'u', 'envase', 650, 24, 15],
  ['tapa', 'Tapas', 'u', 'envase', 110, 160, 120],
  ['etiqueta', 'Etiquetas', 'u', 'etiqueta', 70, 210, 150],
];

const TOPPINGS = {
  granola: { name: 'Granola extra', price: 700, insumo: 'granola', qty: .03 },
  miel: { name: 'Miel', price: 500, insumo: 'miel', qty: .02 },
  almendras: { name: 'Almendras', price: 900, insumo: 'almendras', qty: .02 },
  chia: { name: 'Chía', price: 400, insumo: 'chia', qty: .01 },
  frutos: { name: 'Frutos rojos extra', price: 800, insumo: 'frutillas', qty: .03 },
};

const SLOTS = ['08:00–10:00', '09:00–11:00', '10:00–12:00', '11:00–13:00', '12:00–14:00', '13:00–15:00', '14:00–16:00', '15:00–17:00', '16:00–18:00', '17:00–19:00', '18:00–20:00'];
const CHANNELS = { whatsapp: 'WhatsApp', instagram: 'Instagram', directa: 'Venta directa', mayorista: 'Mayorista', otros: 'Otros' };
const DELIVERY = { uber: 'Uber', moto: 'Mensajería / cadete', retiro: 'Retira en el local' };
const STATUS = { por_elaborar: 'Por elaborar', en_produccion: 'En producción', listo: 'Listo para enviar', entregado: 'Entregado' };
const SHIP = { pendiente: 'Sin solicitar', solicitado: 'Conductor asignado', en_camino: 'En camino', entregado: 'Entregado' };
const STAGES = ['Pasteurización', 'Fermentación', 'Colado', 'Envasado'];
const INCIDENTS = ['Cliente ausente', 'Dirección incorrecta', 'Demora del conductor', 'Producto dañado', 'Otro'];
const BARRIO_UBER = { 'Palermo': 3200, 'Belgrano': 3600, 'Colegiales': 3300, 'Núñez': 4100, 'Villa Crespo': 3100, 'Recoleta': 3900, 'Caballito': 3800, 'Almagro': 3400, 'Villa Urquiza': 4300, 'Saavedra': 4500, 'Coghlan': 4200, 'Chacarita': 3000 };

/* name, barrio, address, ref, channel, delivery, every(days), favs, opts */
const CLIENTS_SEED = [
  ['Lucía Fernández', 'Palermo', 'Gorriti 4521, 3°B', 'Timbre 3B, portero eléctrico', 'whatsapp', 'uber', 8, ['nat500', 'fr250']],
  ['Martina López', 'Belgrano', 'Av. Cabildo 1820, 7°A', 'Edificio con seguridad, dejar en recepción', 'instagram', 'uber', 7, ['nat500', 'mg500']],
  ['Tomás Giménez', 'Colegiales', 'Conde 1150', 'Casa con portón verde', 'whatsapp', 'retiro', 9, ['fr250', 'nat250']],
  ['Sofía Molina', 'Núñez', 'Av. del Libertador 7340, 2°C', 'Dejar en portería', 'instagram', 'uber', 9, ['ar500', 'nat500']],
  ['Andrés López', 'Villa Crespo', 'Thames 640, PB', 'Al lado de la verdulería', 'whatsapp', 'uber', 11, ['nat500', 'fr500']],
  ['Valentina Soto', 'Recoleta', 'Ayacucho 1655, 5°D', '', 'instagram', 'retiro', 12, ['mg500']],
  ['Diego Ramírez', 'Caballito', 'Av. Rivadavia 5210, 9°F', '', 'whatsapp', 'uber', 9, ['nat500', 'fr500']],
  ['Mariana Torres', 'Palermo', 'Charcas 4380, 1°A', 'Portero: Raúl', 'whatsapp', 'uber', 6, ['nat500', 'fr250']],
  ['Daniela Castro', 'Belgrano', 'Juramento 2230, 4°B', '', 'instagram', 'uber', 10, ['nat1k', 'ar500']],
  ['Camila Herrera', 'Almagro', 'Medrano 980, 6°C', 'El timbre no anda: avisar por WhatsApp', 'instagram', 'uber', 8, ['fr500']],
  ['Julián Paz', 'Villa Urquiza', 'Monroe 4920', 'Casa de rejas blancas', 'whatsapp', 'retiro', 12, ['nat250', 'mg500']],
  ['Agustina Díaz', 'Saavedra', 'Av. Balbín 3410, 2°A', '', 'whatsapp', 'uber', 9, ['nat500']],
  ['Florencia Ruiz', 'Núñez', 'Cuba 3890, 8°B', '', 'instagram', 'uber', 11, ['ar500', 'mg500']],
  ['Ignacio Pérez', 'Coghlan', 'Tamborini 3120', '', 'directa', 'retiro', 13, ['nat250']],
  ['Paula Medina', 'Palermo', 'Soler 4120, 2°A', '', 'instagram', 'uber', 8, ['fr250', 'mg500']],
  ['Lautaro Sosa', 'Chacarita', 'Jorge Newbery 3555', '', 'whatsapp', 'moto', 14, ['nat1k']],
  ['Carolina Vega', 'Belgrano', 'Mendoza 2780, 3°C', '', 'whatsapp', 'uber', 7, ['nat500', 'ar500']],
  ['Federico Rossi', 'Villa Crespo', 'Loyola 760, 1°B', '', 'instagram', 'uber', 15, ['fr500']],
  ['Micaela Benítez', 'Colegiales', 'Zabala 3020', '', 'instagram', 'retiro', 10, ['mg500', 'fr250']],
  ['Rocío Navarro', 'Recoleta', 'Arenales 2410, 10°A', '', 'whatsapp', 'uber', 16, ['nat500']],
  ['Santiago Ortiz', 'Palermo', 'Malabia 2110, 4°D', '', 'directa', 'retiro', 12, ['nat1k', 'nat500']],
  ['Belén Aguirre', 'Núñez', 'Manuela Pedraza 2240', '', 'instagram', 'uber', 20, ['ar500'], { start: -9 }],
  ['Gonzalo Romero', 'Caballito', 'Acoyte 410, 3°A', '', 'whatsapp', 'uber', 11, ['fr500', 'nat500']],
  ['Victoria Méndez', 'Belgrano', 'Olazábal 2650, 7°C', '', 'instagram', 'uber', 9, ['fr250'], { start: -16 }],
  ['Nicolás Castro', 'Saavedra', 'Pinto 4180', '', 'otros', 'moto', 18, ['nat1k']],
  ['Josefina Ibarra', 'Palermo', 'Guatemala 5320, 2°B', '', 'instagram', 'uber', 12, ['mg500'], { inactive: true }],
  ['Café Nómade', 'Palermo', 'Honduras 5120', 'Entrar por cocina, preguntar por Eva', 'mayorista', 'moto', 5, ['nat1k', 'nat500'], { biz: true }],
  ['Dietética Raíz', 'Villa Urquiza', 'Av. Triunvirato 4630', 'Local, abierto de 9 a 19', 'mayorista', 'moto', 8, ['nat500', 'fr250'], { biz: true }],
  ['Almacén La Esquina', 'Colegiales', 'Federico Lacroze 2880', '', 'mayorista', 'moto', 9, ['nat500', 'nat250'], { biz: true, inactive: true }],
  ['Brunch Club', 'Belgrano', 'Av. Elcano 3210', 'Recepción de mercadería hasta las 11', 'mayorista', 'moto', 7, ['fr500', 'mg500', 'nat1k'], { biz: true }],
];

const DRIVERS = ['Marcelo', 'Gabriela', 'Jorge', 'Leandro', 'Carla', 'Hernán', 'Mónica', 'Pablo', 'Rodrigo', 'Silvia'];

/* ---------- Estado ---------- */
let S = null;
const TODAY = () => S.demoDate;

/* ---------- Costos ---------- */
function insById(id) { return S.insumos.find(i => i.id === id); }
function skuById(id) { return S.skus.find(s => s.id === id); }
function clientById(id) { return S.clients.find(c => c.id === id); }
function orderById(id) { return S.orders.find(o => o.id === id); }
function skuShort(s) { return (s.flavor === 'natural' ? 'Natural' : (FLAVORS[s.flavor] || { name: s.name }).name) + ' ' + sizeLabel(s.size); }

function skuCost(sku, overrides) {
  const out = { ing: 0, env: 0, eti: 0, labor: sku.labor, total: 0 };
  for (const k in sku.recipe) {
    const ins = insById(k); if (!ins) continue;
    const unit = overrides && overrides[k] != null ? overrides[k] : ins.cost;
    const c = sku.recipe[k] * unit;
    if (ins.cat === 'envase') out.env += c; else if (ins.cat === 'etiqueta') out.eti += c; else out.ing += c;
  }
  out.total = out.ing + out.env + out.eti + out.labor;
  return out;
}
function toppingCost(t) { const tp = TOPPINGS[t]; return tp.qty * insById(tp.insumo).cost; }
function lineUnitPrice(sku, tops) { return sku.price + sum(tops || [], t => TOPPINGS[t].price); }
function lineUnitCost(sku, tops) { return skuCost(sku).total + sum(tops || [], t => toppingCost(t)); }

function recalc(o) {
  o.sub = sum(o.items, it => it.qty * it.unitPrice);
  o.disc = Math.round(o.sub * (o.discountPct || 0) / 100);
  o.total = o.sub - o.disc;
  o.cost = Math.round(sum(o.items, it => it.qty * it.unitCost) + (o.ship && o.shipPaidBy === 'negocio' ? o.shipCost : 0));
}
const profitOf = o => o.total - o.cost;

/* ---------- Pagos ---------- */
function paidOf(o) { return sum(S.payments.filter(p => p.orderId === o.id), p => p.amount); }
function balanceOf(o) { return o.cancelled ? 0 : Math.max(0, o.total - paidOf(o)); }
function payState(o) {
  if (o.cancelled) return 'cancelado';
  const p = paidOf(o);
  if (p >= o.total) return 'pagado';
  return p > 0 ? 'parcial' : 'pendiente';
}

/* ---------- Stock y reservas ---------- */
function lotReserved(l) { return sum(S.reservations.filter(r => r.lotId === l.id), r => r.qty); }
function lotFree(l) { return l.qty - lotReserved(l); }
function lotState(l) {
  const D = TODAY();
  if (l.qty <= 0) return 'agotado';
  if (l.expires < D) return 'vencido';
  if (diffDays(l.expires, D) <= 3) return 'proximo';
  return 'ok';
}
function needBySku(o) { const m = {}; for (const it of o.items) m[it.skuId] = (m[it.skuId] || 0) + it.qty; return m; }
function reservedFor(oid, sku) { return sum(S.reservations.filter(r => r.orderId === oid && r.skuId === sku), r => r.qty); }
function shortage(o) {
  const m = {}; if (o.stockConsumed) return m;
  const need = needBySku(o);
  for (const k in need) { const miss = need[k] - reservedFor(o.id, k); if (miss > 0) m[k] = miss; }
  return m;
}
function fullyReserved(o) { return o.stockConsumed || Object.keys(shortage(o)).length === 0; }
function shortageText(o) { const m = shortage(o); return Object.keys(m).map(k => m[k] + ' × ' + skuShort(skuById(k))).join(', '); }
const isOpen = o => !o.cancelled && o.status !== 'entregado';

function skuStock(skuId) {
  const D = TODAY();
  const lots = S.lots.filter(l => l.skuId === skuId && l.qty > 0);
  const valid = lots.filter(l => l.expires >= D);
  const physical = sum(valid, l => l.qty);
  const reserved = sum(valid, l => lotReserved(l));
  const expired = sum(lots.filter(l => l.expires < D), l => l.qty);
  const soon = sum(valid.filter(l => diffDays(l.expires, D) <= 3), l => l.qty);
  return { physical, reserved, free: physical - reserved, expired, soon };
}

function prioritySort(a, b) {
  const pr = s => s === 'listo' ? 0 : 1;
  return pr(a.status) - pr(b.status) || a.deliveryDate.localeCompare(b.deliveryDate) || a.slot.localeCompare(b.slot) || a.number - b.number;
}

/* Reserva FEFO: primero vence, primero sale. Nunca usa lotes vencidos ni lotes que vencen antes de la entrega. */
function rebalance() {
  const D = TODAY();
  const valid = new Set(S.orders.filter(o => isOpen(o) && !o.stockConsumed).map(o => o.id));
  S.reservations = S.reservations.filter(r => {
    if (!valid.has(r.orderId)) return false;
    const l = S.lots.find(x => x.id === r.lotId);
    return l && l.expires >= D;
  });
  const open = S.orders.filter(o => valid.has(o.id)).sort(prioritySort);
  for (const o of open) {
    const need = needBySku(o);
    for (const sku in need) {
      let missing = need[sku] - reservedFor(o.id, sku);
      if (missing <= 0) continue;
      const lots = S.lots.filter(l => l.skuId === sku && l.expires >= D && l.expires >= o.deliveryDate && lotFree(l) > 0)
        .sort((a, b) => a.expires.localeCompare(b.expires) || a.made.localeCompare(b.made));
      for (const l of lots) {
        if (missing <= 0) break;
        const take = Math.min(missing, lotFree(l));
        S.reservations.push({ id: uid('r'), orderId: o.id, skuId: sku, lotId: l.id, qty: take });
        if (LOG_RES) addMove({ kind: 'producto', skuId: sku, lotId: l.id, qty: 0, resQty: take, type: 'reserva', note: 'Pedido #' + o.number + ' · lote ' + l.code });
        missing -= take;
      }
    }
  }
}
function releaseOrder(o) { S.reservations = S.reservations.filter(r => r.orderId !== o.id); }

function logOrder(o, text) { (o.log = o.log || []).push({ date: TODAY(), time: nowTime(), text }); }
function addMove(m) { S.moves.unshift(Object.assign({ id: uid('m'), date: TODAY(), time: nowTime() }, m)); }

function consumeStock(o) {
  if (o.stockConsumed) return;
  if (!fullyReserved(o)) fail('No hay stock reservado suficiente para el pedido #' + o.number + '. Faltan ' + shortageText(o) + '.');
  for (const r of S.reservations.filter(x => x.orderId === o.id)) {
    const l = S.lots.find(x => x.id === r.lotId);
    l.qty -= r.qty;
    addMove({ kind: 'producto', skuId: r.skuId, lotId: l.id, qty: -r.qty, type: 'salida', note: 'Pedido #' + o.number + ' · lote ' + l.code });
  }
  for (const it of o.items) for (const t of it.toppings || []) {
    const tp = TOPPINGS[t]; const ins = insById(tp.insumo); const q = +(tp.qty * it.qty).toFixed(3);
    ins.stock = Math.max(0, +(ins.stock - q).toFixed(3));
    addMove({ kind: 'insumo', insumoId: ins.id, qty: -q, type: 'consumo', note: 'Topping ' + tp.name.toLowerCase() + ' · pedido #' + o.number, unitCost: ins.cost });
  }
  releaseOrder(o);
  o.stockConsumed = true;
  logOrder(o, 'Salió del local: se descontó el stock');
}

/* ---------- Clientes ---------- */
function clientOrders(cid) { return S.orders.filter(o => o.clientId === cid && !o.cancelled).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number); }
function clientStats(c) {
  const D = TODAY();
  const os = clientOrders(c.id);
  const st = { orders: os, count: os.length, total: sum(os, o => o.total), balance: sum(os, o => balanceOf(o)) };
  st.avg = st.count ? st.total / st.count : 0;
  const dates = [...new Set(os.map(o => o.deliveryDate))].sort();
  const past = dates.filter(d => d <= D);
  st.last = past.length ? past[past.length - 1] : (dates[0] || null);
  st.first = dates[0] || null;
  st.since = st.last ? diffDays(D, st.last) : null;
  st.every = past.length >= 2 ? Math.round(diffDays(past[past.length - 1], past[0]) / (past.length - 1)) : null;
  const q = {}; for (const o of os) for (const it of o.items) q[it.skuId] = (q[it.skuId] || 0) + it.qty;
  st.fav = Object.keys(q).sort((a, b) => q[b] - q[a])[0] || null;
  st.hasOpen = os.some(o => isOpen(o));
  return st;
}
let _vipCut = null;
function clientTags(c, st) {
  st = st || clientStats(c);
  const t = [];
  if (st.first && diffDays(TODAY(), st.first) <= 21 && st.count <= 2) t.push('nuevo');
  if (st.since != null && st.since > Math.max(30, (st.every || 15) * 2.5)) t.push('inactivo');
  else {
    if (st.count >= 3) t.push('recurrente');
    if (_vipCut != null && st.total >= _vipCut && st.count >= 5) t.push('vip');
    if (st.every && !st.hasOpen && st.since >= Math.round(st.every * .85)) t.push('recompra');
  }
  return t;
}
function computeVip() {
  const totals = S.clients.map(c => sum(clientOrders(c.id), o => o.total)).sort((a, b) => b - a);
  _vipCut = totals[5] || 0;
}
const TAGS = { nuevo: 'Cliente nuevo', recurrente: 'Recurrente', vip: 'VIP', recompra: 'Posible recompra', inactivo: 'Inactivo' };

/* ---------- Producción: ¿qué producir hoy? ---------- */
function productionPlan() {
  return S.skus.map(sku => {
    const open = S.orders.filter(o => isOpen(o) && !o.stockConsumed);
    const confirmed = sum(open, o => needBySku(o)[sku.id] || 0);
    const reserved = sum(open, o => reservedFor(o.id, sku.id));
    const missing = confirmed - reserved;
    const st = skuStock(sku.id);
    const scheduled = sum(S.prodOrders.filter(p => p.skuId === sku.id && (p.status === 'programada' || p.status === 'en_curso')), p => p.qty);
    const forOrders = Math.max(0, missing - scheduled);
    const coverAfter = Math.max(0, scheduled - missing);
    const forStock = Math.max(0, sku.min - st.free - coverAfter);
    return { sku, confirmed, reserved, missing, free: st.free, scheduled, forOrders, forStock, need: forOrders + forStock };
  });
}

/* ---------- Datos ficticios ---------- */
function mkOrder(f) {
  const o = Object.assign({ discountPct: 0, notes: '', cancelled: false, stockConsumed: false, log: [], shipCost: 0, shipPaidBy: 'cliente' }, f);
  o.id = 'o' + o.number;
  o.items = f.items.map(([skuId, qty, tops]) => { const sku = skuById(skuId); return { skuId, qty, toppings: tops || [], unitPrice: lineUnitPrice(sku, tops), unitCost: Math.round(lineUnitCost(sku, tops)) }; });
  o.ship = o.delivery === 'retiro' ? null : Object.assign({ status: 'pendiente', driver: '', tripRef: '', requestedAt: '', pickedAt: '', deliveredAt: '', incident: null, incidents: [] }, f.ship || {});
  recalc(o);
  return o;
}

function seed(D, config) {
  const r = rng(20261102);
  const pick = a => a[Math.floor(r() * a.length)];
  const st = {
    v: VERSION, demoDate: D, rev: 1,
    config: Object.assign({ brand: 'La Griega', tagline: 'Yogur griego artesanal', user: 'Caro', role: 'Dueña', fixedDate: null }, config || {}),
    skus: SKUS_SEED.map(s => Object.assign({}, s, { recipe: Object.assign({}, s.recipe), name: 'Yogur ' + (s.flavor === 'natural' ? 'natural' : FLAVORS[s.flavor].name.toLowerCase()) + ' ' + SIZES[s.size] })),
    insumos: INSUMOS_SEED.map(([id, name, unit, cat, cost, stock, min]) => ({ id, name, unit, cat, cost, stock, min })),
    clients: [], orders: [], payments: [], lots: [], reservations: [], prodOrders: [], moves: [], events: [],
    seq: { order: 1057, po: 1 },
    ideas: {}, onboard: { products: true, stock: false, clients: false, order: false }, flavors: {},
  };
  S = st;

  st.clients = CLIENTS_SEED.map((c, i) => {
    const [name, barrio, address, ref, channel, delivery, every, favs, opt] = c;
    const ph = '11 5' + String(100 + Math.floor(r() * 899)) + '-' + String(1000 + Math.floor(r() * 8999));
    return Object.assign({ id: 'c' + (i + 1), name, barrio, address, ref, channel, delivery, every, favs, phone: ph, biz: false, inactive: false, start: null }, opt || {});
  });
  const byName = n => st.clients.find(c => c.name === n);

  /* Historial de 60 días */
  const hist = [];
  const mkHist = (c, date) => {
    const lines = [];
    const favs = c.favs.slice();
    if (c.biz) {
      for (const f of favs) if (r() < .85 || !lines.length) lines.push([f, 4 + Math.floor(r() * 9)]);
    } else {
      lines.push([favs[0], 1 + Math.floor(r() * 3)]);
      if (favs[1] && r() < .55) lines.push([favs[1], 1 + Math.floor(r() * 2)]);
      if (r() < .18) { const o = pick(SKUS_SEED).id; if (!lines.find(l => l[0] === o)) lines.push([o, 1]); }
      if (r() < .16) lines[0][2] = [pick(Object.keys(TOPPINGS))];
    }
    const delivery = c.delivery;
    hist.push({
      clientId: c.id, deliveryDate: date, createdAt: c.biz ? addDays(date, -1) : (r() < .55 ? date : addDays(date, -1)),
      createdTime: pad(8 + Math.floor(r() * 13)) + ':' + pad(Math.floor(r() * 60)),
      slot: c.biz ? pick(SLOTS.slice(0, 3)) : pick(SLOTS),
      channel: r() < .88 ? c.channel : pick(['whatsapp', 'instagram', 'directa']),
      delivery, items: lines, discountPct: c.biz ? 10 : (r() < .05 ? 10 : 0),
      payMethod: c.biz ? 'transferencia' : (r() < .6 ? 'transferencia' : 'efectivo'),
      shipCost: delivery === 'uber' ? (BARRIO_UBER[c.barrio] || 3500) : delivery === 'moto' ? 2500 : 0,
      shipPaidBy: delivery === 'moto' ? 'negocio' : 'cliente',
    });
  };
  for (const c of st.clients) {
    let day = c.start != null ? c.start : -60 + Math.floor(r() * c.every);
    const end = c.inactive ? -38 : -1;
    while (day <= end) { mkHist(c, addDays(D, day)); day += Math.max(3, c.every + Math.floor(r() * 5) - 2); }
  }
  const regulars = st.clients.filter(c => !c.biz && !c.inactive && c.start == null);
  for (let d = -60; d <= -1; d++) {
    const date = addDays(D, d);
    if (weekday(date) === 5) for (let k = 0; k < 3; k++) mkHist(pick(regulars), date);
    if (weekday(date) === 6 && r() < .6) mkHist(pick(regulars), date);
  }
  hist.sort((a, b) => (a.createdAt + a.createdTime).localeCompare(b.createdAt + b.createdTime));
  const firstNum = 1041 - hist.length;
  hist.forEach((h, i) => {
    const o = mkOrder(Object.assign(h, { number: firstNum + i, status: 'entregado', stockConsumed: true, deliveredDate: h.deliveryDate, ship: h.delivery === 'retiro' ? null : { status: 'entregado', driver: pick(DRIVERS) + (h.delivery === 'uber' ? ' (Uber)' : ' (cadete)'), tripRef: h.delivery === 'uber' ? 'UB-' + Math.floor(r() * 9e3 + 1e3) : '', requestedAt: '', pickedAt: '', deliveredAt: '' } }));
    st.orders.push(o);
  });

  /* Historia de Lucía: su última compra anterior fue hace 7 días */
  const lucia = byName('Lucía Fernández');
  const lh = st.orders.filter(o => o.clientId === lucia.id && o.number < 1041);
  if (lh.length) { const last = lh[lh.length - 1]; if (diffDays(D, last.deliveryDate) !== 7) { last.deliveryDate = addDays(D, -7); last.createdAt = addDays(D, -8); last.deliveredDate = last.deliveryDate; } }

  /* Cobros del historial: casi todo pagado, con algunas deudas reales */
  const unpaidIds = new Set(), partialIds = new Set(), cancelIds = new Set();
  const nomade = st.orders.filter(o => o.clientId === byName('Café Nómade').id && diffDays(D, o.deliveryDate) <= 6 && diffDays(D, o.deliveryDate) >= 2);
  if (nomade.length) unpaidIds.add(nomade[nomade.length - 1].id);
  const candidates = st.orders.filter(o => !clientById(o.clientId).biz && diffDays(D, o.deliveryDate) >= 3 && diffDays(D, o.deliveryDate) <= 12);
  for (let k = 0; k < 3 && candidates.length; k++) unpaidIds.add(candidates.splice(Math.floor(r() * candidates.length), 1)[0].id);
  for (let k = 0; k < 2 && candidates.length; k++) partialIds.add(candidates.splice(Math.floor(r() * candidates.length), 1)[0].id);
  const oldies = st.orders.filter(o => diffDays(D, o.deliveryDate) >= 15 && !clientById(o.clientId).biz);
  for (let k = 0; k < 2 && oldies.length; k++) cancelIds.add(oldies.splice(Math.floor(r() * oldies.length), 1)[0].id);
  for (const o of st.orders) {
    if (cancelIds.has(o.id)) { o.cancelled = true; o.status = 'por_elaborar'; o.stockConsumed = false; o.ship = null; o.notes = 'Cancelado por la clienta'; continue; }
    if (unpaidIds.has(o.id)) continue;
    if (partialIds.has(o.id)) { const half = Math.round(o.total / 2 / 100) * 100; st.payments.push({ id: uid('p'), orderId: o.id, amount: half, method: 'transferencia', date: o.createdAt, time: o.createdTime, kind: 'Seña' }); continue; }
    const d = o.payMethod === 'transferencia' ? o.createdAt : o.deliveryDate;
    st.payments.push({ id: uid('p'), orderId: o.id, amount: o.total, method: o.payMethod, date: d, time: o.payMethod === 'transferencia' ? o.createdTime : '17:30', kind: 'Pago total' });
  }

  /* Pedidos de hoy y próximos días (armados a mano para el recorrido comercial) */
  const T = [
    [1041, 'Martina López', 0, -1, '20:14', '09:00–11:00', 'uber', [['nat500', 2], ['mg500', 1]], 'entregado', { status: 'entregado', driver: 'Marcelo (Uber)', tripRef: 'UB-7K2Q', requestedAt: '09:05', pickedAt: '09:20', deliveredAt: '09:48' }, 'all', 'transferencia', ''],
    [1042, 'Café Nómade', 0, -3, '11:02', '08:00–10:00', 'moto', [['nat1k', 4], ['nat500', 6]], 'entregado', { status: 'entregado', driver: 'Ezequiel (cadete)', requestedAt: '08:00', pickedAt: '08:10', deliveredAt: '08:35' }, 0, 'transferencia', 'Cuenta corriente: pagan los viernes'],
    [1043, 'Tomás Giménez', 0, -1, '21:40', '10:00–12:00', 'retiro', [['fr250', 2], ['nat250', 1]], 'entregado', null, 'all', 'efectivo', ''],
    [1044, 'Sofía Molina', 0, -1, '18:05', '11:00–13:00', 'uber', [['ar500', 2]], 'listo', { status: 'en_camino', driver: 'Gabriela (Uber)', tripRef: 'UB-3M9X', requestedAt: '11:12', pickedAt: '11:22' }, 'all', 'transferencia', ''],
    [1045, 'Andrés López', 0, -1, '19:30', '12:00–14:00', 'uber', [['nat500', 3], ['fr500', 2]], 'listo', { status: 'solicitado', driver: 'Jorge (Uber)', tripRef: 'UB-8P1D', requestedAt: '11:50' }, 15800, 'transferencia', ''],
    [1046, 'Valentina Soto', 0, 0, '08:12', '13:00–15:00', 'retiro', [['mg500', 2, ['granola']]], 'listo', null, 0, 'efectivo', 'Retira la hermana, Lola'],
    [1047, 'Diego Ramírez', 0, -1, '22:10', '14:00–16:00', 'uber', [['nat500', 4], ['fr500', 2]], 'en_produccion', null, 'all', 'transferencia', ''],
    [1048, 'Lucía Fernández', 0, 0, '08:40', '14:00–16:00', 'uber', [['nat500', 3], ['fr250', 2]], 'listo', null, 0, 'transferencia', 'Avisar 10 minutos antes de llegar'],
    [1049, 'Mariana Torres', 0, 0, '09:05', '16:00–18:00', 'uber', [['nat500', 4], ['fr250', 2]], 'por_elaborar', null, 0, 'efectivo', ''],
    [1050, 'Daniela Castro', 0, 0, '09:30', '16:00–18:00', 'uber', [['nat1k', 1], ['ar500', 2]], 'por_elaborar', null, 12300, 'transferencia', ''],
    [1051, 'Camila Herrera', 0, 0, '10:02', '17:00–19:00', 'uber', [['fr500', 4]], 'en_produccion', null, 'all', 'transferencia', 'Es para regalo: sumar tarjeta'],
    [1052, 'Julián Paz', 0, 0, '10:45', '18:00–20:00', 'retiro', [['nat250', 3], ['mg500', 2, ['almendras']]], 'por_elaborar', null, 0, 'efectivo', ''],
    [1053, 'Dietética Raíz', 1, -2, '16:20', '10:00–12:00', 'moto', [['nat500', 10], ['fr250', 6]], 'por_elaborar', null, 0, 'transferencia', 'Factura A · pagan a 7 días'],
    [1054, 'Agustina Díaz', 1, 0, '11:10', '15:00–17:00', 'uber', [['nat500', 2, ['chia']]], 'por_elaborar', null, 0, 'transferencia', ''],
    [1055, 'Florencia Ruiz', 1, 0, '11:35', '16:00–18:00', 'uber', [['ar500', 2], ['mg500', 1]], 'por_elaborar', null, 11000, 'transferencia', ''],
    [1056, 'Ignacio Pérez', 2, 0, '11:50', '10:00–12:00', 'retiro', [['nat250', 3]], 'por_elaborar', null, 0, 'efectivo', ''],
  ];
  for (const [number, cname, dOff, cOff, time, slot, delivery, items, status, ship, paid, payMethod, notes] of T) {
    const c = byName(cname);
    const biz = c.biz;
    const o = mkOrder({
      number, clientId: c.id, deliveryDate: addDays(D, dOff), createdAt: addDays(D, cOff), createdTime: time, slot,
      channel: c.channel, delivery, items, status, ship, payMethod, notes, discountPct: biz ? 10 : 0,
      shipCost: delivery === 'uber' ? (BARRIO_UBER[c.barrio] || 3500) : delivery === 'moto' ? 2500 : 0,
      shipPaidBy: delivery === 'moto' ? 'negocio' : 'cliente',
      stockConsumed: status === 'entregado' || (ship && ship.status === 'en_camino'),
      deliveredDate: status === 'entregado' ? D : null,
    });
    o.log = [{ date: o.createdAt, time, text: 'Pedido tomado por ' + CHANNELS[o.channel] }];
    if (status !== 'por_elaborar') o.log.push({ date: D, time: '08:00', text: 'Pasó a ' + STATUS[status === 'entregado' ? 'listo' : status].toLowerCase() });
    if (o.ship && o.ship.driver) o.log.push({ date: D, time: o.ship.requestedAt || '09:00', text: 'Envío solicitado: ' + o.ship.driver });
    if (o.ship && o.ship.pickedAt) o.log.push({ date: D, time: o.ship.pickedAt, text: 'El conductor retiró el pedido' });
    if (status === 'entregado') o.log.push({ date: D, time: (o.ship && o.ship.deliveredAt) || '10:40', text: 'Entregado' });
    st.orders.push(o);
    const amount = paid === 'all' ? o.total : paid;
    if (amount > 0) st.payments.push({ id: uid('p'), orderId: o.id, amount, method: payMethod, date: o.createdAt, time, kind: amount >= o.total ? 'Pago total' : 'Seña' });
  }
  /* Lotes de producto terminado */
  const L = [
    ['nat500', -12, 6, 24], ['nat500', -3, 12, 30], ['nat250', -6, 16, 24], ['nat1k', -5, 6, 12],
    ['fr250', -9, 6, 16], ['fr500', -4, 4, 16], ['fr500', -15, 2, 14], ['mg500', -8, 4, 12],
    ['mg500', 0, 8, 8], ['ar500', -6, 7, 14], ['ar500', -13, 2, 12], ['nat250', -20, 0, 20], ['nat1k', -19, 0, 10],
  ];
  for (const [skuId, mOff, qty, init] of L) {
    const sku = skuById(skuId); const made = addDays(D, mOff);
    const lot = { id: uid('l'), code: lotCode(sku, made, st.lots), skuId, made, expires: addDays(made, sku.shelf), qty, initial: init };
    st.lots.push(lot);
    const po = { id: 'po' + st.seq.po++, skuId, qty: init, date: made, status: 'finalizada', stage: 3, lotId: lot.id, note: '', finishedAt: mOff === 0 ? '09:40' : '13:00' };
    st.prodOrders.push(po);
    st.moves.push({ id: uid('m'), kind: 'producto', skuId, lotId: lot.id, qty: init, type: 'produccion', note: 'Orden de producción ' + po.id.toUpperCase() + ' · lote ' + lot.code, date: made, time: po.finishedAt });
    for (const k in sku.recipe) st.moves.push({ id: uid('m'), kind: 'insumo', insumoId: k, qty: -+(sku.recipe[k] * init).toFixed(3), type: 'consumo', note: 'Producción lote ' + lot.code, date: made, time: po.finishedAt, unitCost: insById(k).cost });
  }
  st.prodOrders.push({ id: 'po' + st.seq.po++, skuId: 'fr500', qty: 12, date: D, status: 'en_curso', stage: 1, lotId: null, note: 'Para los pedidos #1047 y #1051, y reponer stock', startedAt: '08:30' });

  /* Compras y desperdicios de insumos */
  const buys = [['leche', -9, 120, 1120, 'Tambo Las Acacias'], ['frasco500', -12, 120, 520, 'Envases del Sur'], ['frutillas', -9, 2, 6500, 'Mercado Central'], ['granola', -7, 3, 8500, 'Granja Doña Clara'], ['leche', -5, 120, 1150, 'Tambo Las Acacias'], ['etiqueta', -11, 300, 70, 'Imprenta Rivas'], ['arandanos', -6, 2, 11000, 'Mercado Central'], ['leche', -2, 100, 1150, 'Tambo Las Acacias'], ['tapa', -4, 200, 110, 'Envases del Sur']];
  for (const [id, off, qty, cost, sup] of buys) st.moves.push({ id: uid('m'), kind: 'insumo', insumoId: id, qty, type: 'compra', unitCost: cost, note: 'Compra a ' + sup, date: addDays(D, off), time: '10:15' });
  st.moves.push({ id: uid('m'), kind: 'insumo', insumoId: 'frutillas', qty: -.4, type: 'desperdicio', unitCost: 6500, note: 'Frutillas en mal estado', date: addDays(D, -4), time: '16:20' });
  for (const o of st.orders.filter(x => x.number >= 1041 && x.stockConsumed)) for (const it of o.items) st.moves.push({ id: uid('m'), kind: 'producto', skuId: it.skuId, lotId: null, qty: -it.qty, type: 'salida', note: 'Pedido #' + o.number, date: D, time: (o.ship && o.ship.pickedAt) || '10:30' });
  st.moves.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  st.events = [];
  LOG_RES = false; rebalance(); LOG_RES = true;
  S = st;
  return st;
}
function lotCode(sku, made, lots) {
  const d = new Date(toT(made));
  let code = sku.code + '-' + pad(d.getUTCDate()) + pad(d.getUTCMonth() + 1);
  let n = 2; const base = code;
  while ((lots || S.lots).some(l => l.code === code)) code = base + '-' + (n++);
  return code;
}

/* =====================================================================
   ACCIONES — cada una valida reglas antes de cambiar datos.
   ===================================================================== */
const A = {
  moveOrder(id, to) {
    const o = orderById(id);
    if (!o) fail('No encontré el pedido.');
    if (o.cancelled) fail('El pedido #' + o.number + ' está cancelado.');
    if (o.status === to) return null;
    if (o.status === 'entregado') fail('El pedido #' + o.number + ' ya se entregó y no puede volver atrás. Si hubo un problema, registralo como incidencia en Envíos.');
    if ((to === 'por_elaborar' || to === 'en_produccion') && o.stockConsumed) fail('El pedido #' + o.number + ' ya salió del local: no puede volver a producción.');
    if (to === 'listo' && !fullyReserved(o)) fail('Para marcar #' + o.number + ' como listo faltan ' + shortageText(o) + '. Producilos primero.');
    if (to === 'entregado') {
      if (!fullyReserved(o)) fail('No se puede entregar #' + o.number + ': faltan ' + shortageText(o) + '.');
      if (o.ship && o.ship.status !== 'en_camino' && o.ship.status !== 'entregado') {
        if (o.status !== 'listo') fail('Primero pasá #' + o.number + ' a "Listo para enviar".');
      }
      consumeStock(o);
      if (o.ship) { o.ship.status = 'entregado'; o.ship.deliveredAt = nowTime(); }
      o.deliveredDate = TODAY();
    }
    const from = o.status;
    o.status = to;
    logOrder(o, 'Pasó de ' + STATUS[from].toLowerCase() + ' a ' + STATUS[to].toLowerCase());
    return 'Pedido #' + o.number + ': ' + STATUS[to].toLowerCase();
  },

  cancelOrder(id) {
    const o = orderById(id);
    if (o.stockConsumed || o.status === 'entregado') fail('El pedido #' + o.number + ' ya salió del local: no se puede cancelar.');
    for (const r of S.reservations.filter(x => x.orderId === o.id)) addMove({ kind: 'producto', skuId: r.skuId, lotId: r.lotId, qty: 0, resQty: -r.qty, type: 'libera', note: 'Pedido #' + o.number + ' cancelado' });
    releaseOrder(o);
    o.cancelled = true;
    logOrder(o, 'Pedido cancelado');
    rebalance();
    const p = paidOf(o);
    return 'Pedido #' + o.number + ' cancelado' + (p > 0 ? '. Tenía ' + money(p) + ' cobrados: registrá la devolución por fuera.' : '');
  },

  saveOrder(d, editId) {
    const o = editId ? orderById(editId) : null;
    if (o && o.stockConsumed) fail('Este pedido ya salió del local y no se puede editar.');
    const isNew = d.clientId === 'new';
    if (isNew) {
      const name = (d.newName || '').trim();
      if (name.length < 2) fail('Escribí el nombre del cliente nuevo.');
      if (S.clients.some(c => c.name.toLowerCase() === name.toLowerCase())) fail('Ya existe un cliente con ese nombre: elegilo de la lista.');
    } else if (!clientById(d.clientId)) fail('Elegí un cliente.');
    if (!d.items.length) fail('Agregá al menos un producto.');
    if (d.items.some(it => !(it.qty >= 1))) fail('Revisá las cantidades.');
    if (!d.date) fail('Elegí la fecha de entrega.');
    if (!o && d.date < TODAY()) fail('La fecha de entrega no puede ser anterior a hoy.');
    if (!d.slot) fail('Elegí la franja horaria.');
    if (d.delivery !== 'retiro' && !(d.address || '').trim()) fail('Falta la dirección de entrega.');
    const shipCost = Math.round(+d.shipCost || 0);
    if (shipCost < 0) fail('El costo de envío no puede ser negativo.');
    const disc = Math.round(+d.discountPct || 0);
    if (disc < 0 || disc > 50) fail('El descuento tiene que estar entre 0% y 50%.');
    const deposit = Math.round(+d.deposit || 0);
    if (deposit < 0) fail('La seña no puede ser negativa.');
    const fields = {
      deliveryDate: d.date, slot: d.slot, channel: d.channel, delivery: d.delivery, payMethod: d.payMethod,
      items: d.items.map(it => [it.skuId, Math.round(it.qty), it.toppings]), discountPct: disc, notes: (d.notes || '').trim(),
      shipCost: d.delivery === 'retiro' ? 0 : shipCost, shipPaidBy: d.shipPaidBy, address: (d.address || '').trim(), ref: (d.ref || '').trim(),
    };
    if (o) {
      const keep = { number: o.number, clientId: o.clientId, createdAt: o.createdAt, createdTime: o.createdTime, status: o.status, log: o.log, ship: o.delivery === d.delivery ? o.ship : null };
      if (!isNew) keep.clientId = d.clientId;
      const n = mkOrder(Object.assign({}, fields, keep));
      const paid = paidOf(o);
      if (paid > n.total) fail('El nuevo total (' + money(n.total) + ') es menor a lo ya cobrado (' + money(paid) + ').');
      if (isNew) n.clientId = A.addClient({ name: d.newName, phone: d.newPhone, address: d.address, barrio: d.barrio, ref: d.ref, channel: d.channel, delivery: d.delivery });
      releaseOrder(o);
      const wasReady = n.status === 'listo';
      if (wasReady) n.status = 'por_elaborar';
      Object.assign(o, n);
      logOrder(o, 'Pedido editado');
      rebalance();
      if (wasReady && fullyReserved(o)) o.status = 'listo';
      return { msg: 'Cambios guardados en el pedido #' + o.number + (wasReady && o.status !== 'listo' ? '. Volvió a "Por elaborar" porque falta stock.' : ''), id: o.id };
    }
    const preview = mkOrder(Object.assign({}, fields, { number: 0, clientId: 'x', status: 'por_elaborar' }));
    if (deposit > preview.total) fail('La seña supera el total del pedido.');
    const cid = isNew ? A.addClient({ name: d.newName, phone: d.newPhone, address: d.address, barrio: d.barrio, ref: d.ref, channel: d.channel, delivery: d.delivery }) : d.clientId;
    const c = clientById(cid);
    if (d.delivery !== 'retiro' && !c.address) { c.address = fields.address; c.ref = fields.ref; }
    const n = mkOrder(Object.assign({}, fields, { number: S.seq.order++, clientId: cid, status: 'por_elaborar', createdAt: TODAY(), createdTime: nowTime() }));
    n.log = [{ date: TODAY(), time: nowTime(), text: 'Pedido tomado por ' + CHANNELS[n.channel] }];
    S.orders.push(n);
    rebalance();
    if (deposit > 0) A.addPayment(n.id, deposit, d.payMethod, 'Seña al tomar el pedido');
    const miss = shortageText(n);
    return { msg: 'Pedido #' + n.number + ' creado' + (miss ? '. Falta producir: ' + miss : '. Todo el stock quedó reservado'), id: n.id };
  },

  addClient(d) {
    const name = (d.name || '').trim();
    if (name.length < 2) fail('El nombre es obligatorio.');
    if (S.clients.some(c => c.name.toLowerCase() === name.toLowerCase())) fail('Ya existe un cliente con ese nombre.');
    const c = { id: uid('c'), name, phone: (d.phone || '').trim(), address: (d.address || '').trim(), barrio: (d.barrio || '').trim(), ref: (d.ref || '').trim(), channel: d.channel || 'whatsapp', delivery: d.delivery || 'uber', favs: [], every: null, biz: false };
    S.clients.push(c);
    return c.id;
  },

  addPayment(id, amount, method, note) {
    const o = orderById(id);
    if (o.cancelled) fail('El pedido está cancelado: no se pueden registrar cobros.');
    const paid = paidOf(o), bal = o.total - paid;
    amount = Math.round(+amount);
    if (bal <= 0) fail('El pedido #' + o.number + ' ya está cobrado completo.');
    if (!(amount > 0)) fail('Ingresá un importe mayor a cero.');
    if (amount > bal) fail('El importe supera el saldo pendiente (' + money(bal) + ').');
    const kind = amount === bal ? (paid === 0 ? 'Pago total' : 'Cancela saldo') : (paid === 0 && o.status !== 'entregado' ? 'Seña' : 'Pago parcial');
    S.payments.push({ id: uid('p'), orderId: o.id, amount, method, date: TODAY(), time: nowTime(), kind, note: note || '' });
    logOrder(o, kind + ' de ' + money(amount) + ' (' + method + ')');
    return amount === bal ? 'Pedido #' + o.number + ' cobrado completo' : 'Cobro registrado. Saldo: ' + money(bal - amount);
  },

  shipAssign(id, driver, ref, cost) {
    const o = orderById(id);
    if (!o.ship) fail('Este pedido se retira en el local.');
    if (o.ship.status === 'en_camino' || o.ship.status === 'entregado') fail('El conductor ya retiró este pedido.');
    if (o.status !== 'listo') fail('Primero marcá el pedido #' + o.number + ' como "Listo para enviar".');
    if (!(driver || '').trim()) fail('Escribí el nombre del conductor.');
    o.ship.driver = driver.trim(); o.ship.tripRef = (ref || '').trim(); o.ship.status = 'solicitado'; o.ship.requestedAt = nowTime();
    if (cost !== '' && cost != null && +cost >= 0) { o.shipCost = Math.round(+cost); recalc(o); }
    logOrder(o, 'Envío solicitado: ' + o.ship.driver + (o.ship.tripRef ? ' · ' + o.ship.tripRef : ''));
    return 'Conductor registrado para #' + o.number;
  },
  shipPickup(id) {
    const o = orderById(id);
    if (!o.ship || o.ship.status !== 'solicitado') fail('Registrá primero el conductor.');
    consumeStock(o);
    o.ship.status = 'en_camino'; o.ship.pickedAt = nowTime();
    logOrder(o, 'El conductor retiró el pedido');
    return 'Pedido #' + o.number + ' en camino';
  },
  shipDeliver(id) {
    const o = orderById(id);
    if (!o.ship || o.ship.status !== 'en_camino') fail('Solo se puede marcar entregado un pedido que ya retiró el conductor.');
    A.moveOrder(id, 'entregado');
    const bal = balanceOf(o);
    return 'Pedido #' + o.number + ' entregado' + (bal > 0 ? '. Queda por cobrar ' + money(bal) : '');
  },
  shipIncident(id, type, note) {
    const o = orderById(id);
    if (!o.ship) fail('Este pedido no tiene envío.');
    o.ship.incident = { type, note: (note || '').trim(), date: TODAY(), time: nowTime() };
    o.ship.incidents = (o.ship.incidents || []).concat([o.ship.incident]);
    logOrder(o, 'Incidencia: ' + type + (note ? ' — ' + note : ''));
    return 'Incidencia registrada en #' + o.number;
  },
  shipResolve(id, retry) {
    const o = orderById(id);
    if (!o.ship || !o.ship.incident) return null;
    o.ship.incident = null;
    if (retry && o.ship.status !== 'entregado') { o.ship.status = 'pendiente'; o.ship.driver = ''; o.ship.tripRef = ''; logOrder(o, 'Envío reprogramado'); return 'Envío de #' + o.number + ' listo para volver a solicitar'; }
    logOrder(o, 'Incidencia resuelta');
    return 'Incidencia resuelta';
  },

  createPO(skuId, qty, date, note) {
    qty = Math.round(+qty);
    if (!skuById(skuId)) fail('Elegí un producto.');
    if (!(qty > 0)) fail('La cantidad tiene que ser mayor a cero.');
    if (!date) fail('Elegí la fecha.');
    const po = { id: 'po' + S.seq.po++, skuId, qty, date, status: 'programada', stage: 0, lotId: null, note: (note || '').trim() };
    S.prodOrders.push(po);
    return 'Orden ' + po.id.toUpperCase() + ' creada: ' + qty + ' × ' + skuShort(skuById(skuId));
  },
  startPO(id) {
    const po = S.prodOrders.find(p => p.id === id);
    if (po.status !== 'programada') fail('Esta orden ya está en curso o cerrada.');
    po.status = 'en_curso'; po.stage = 0; po.startedAt = nowTime();
    let moved = 0;
    for (const o of S.orders) if (isOpen(o) && o.status === 'por_elaborar' && shortage(o)[po.skuId]) { o.status = 'en_produccion'; logOrder(o, 'Pasó a en producción'); moved++; }
    return 'Producción iniciada' + (moved ? '. ' + moved + (moved === 1 ? ' pedido pasó' : ' pedidos pasaron') + ' a "En producción"' : '');
  },
  advancePO(id) {
    const po = S.prodOrders.find(p => p.id === id);
    if (po.status !== 'en_curso') fail('La orden no está en curso.');
    if (po.stage >= STAGES.length - 1) fail('Ya está en la última etapa: finalizala.');
    po.stage++;
    return STAGES[po.stage];
  },
  finishPO(id, realQty) {
    const po = S.prodOrders.find(p => p.id === id);
    if (!po || (po.status !== 'programada' && po.status !== 'en_curso')) fail('Esta orden ya fue finalizada o cancelada.');
    const sku = skuById(po.skuId);
    const q = Math.round(+realQty);
    if (!(q > 0)) fail('Indicá cuántas unidades salieron.');
    if (!(sku.shelf > 0)) fail('Configurá la vida útil de ' + sku.name + ' en Recetas antes de generar el lote.');
    const lacks = [];
    for (const k in sku.recipe) { const ins = insById(k); const need = sku.recipe[k] * q; if (ins.stock + 1e-9 < need) lacks.push(ins.name + ' (faltan ' + fmtN(need - ins.stock) + ' ' + ins.unit + ')'); }
    if (lacks.length) fail('No alcanzan los insumos: ' + lacks.join(', ') + '. Registrá una compra en Inventario.');
    const D = TODAY();
    const lot = { id: uid('l'), code: lotCode(sku, D), skuId: sku.id, made: D, expires: addDays(D, sku.shelf), qty: q, initial: q };
    S.lots.push(lot);
    for (const k in sku.recipe) {
      const ins = insById(k); const need = +(sku.recipe[k] * q).toFixed(3);
      ins.stock = +(ins.stock - need).toFixed(3);
      addMove({ kind: 'insumo', insumoId: k, qty: -need, type: 'consumo', unitCost: ins.cost, note: 'Producción lote ' + lot.code });
    }
    addMove({ kind: 'producto', skuId: sku.id, lotId: lot.id, qty: q, type: 'produccion', note: 'Orden ' + po.id.toUpperCase() + ' · lote ' + lot.code });
    po.status = 'finalizada'; po.stage = STAGES.length - 1; po.lotId = lot.id; po.realQty = q; po.finishedAt = nowTime();
    rebalance();
    const res = lotReserved(lot);
    return 'Lote ' + lot.code + ' creado con ' + q + ' unidades (vence ' + fmtDate(lot.expires) + ').' + (res ? ' Se reservaron ' + res + ' para pedidos.' : '');
  },
  cancelPO(id) {
    const po = S.prodOrders.find(p => p.id === id);
    if (po.status === 'finalizada') fail('Una orden finalizada no se puede cancelar.');
    po.status = 'cancelada';
    return 'Orden ' + po.id.toUpperCase() + ' cancelada';
  },

  buyInsumo(id, qty, cost, supplier) {
    const ins = insById(id); qty = +qty; cost = Math.round(+cost);
    if (!(qty > 0)) fail('La cantidad tiene que ser mayor a cero.');
    if (!(cost > 0)) fail('Ingresá el costo por ' + ins.unit + '.');
    ins.stock = +(ins.stock + qty).toFixed(3);
    const old = ins.cost; ins.cost = cost;
    addMove({ kind: 'insumo', insumoId: id, qty, type: 'compra', unitCost: cost, note: 'Compra' + (supplier ? ' a ' + supplier.trim() : '') + (old !== cost ? ' · costo ' + money(old) + ' → ' + money(cost) : '') });
    return 'Compra registrada: ' + fmtN(qty) + ' ' + ins.unit + ' de ' + ins.name.toLowerCase();
  },
  wasteInsumo(id, qty, reason) {
    const ins = insById(id); qty = +qty;
    if (!(qty > 0)) fail('La cantidad tiene que ser mayor a cero.');
    if (qty > ins.stock) fail('No podés desperdiciar más de lo que hay (' + fmtN(ins.stock) + ' ' + ins.unit + ').');
    ins.stock = +(ins.stock - qty).toFixed(3);
    addMove({ kind: 'insumo', insumoId: id, qty: -qty, type: 'desperdicio', unitCost: ins.cost, note: reason || 'Desperdicio' });
    return 'Desperdicio registrado';
  },
  setInsumoMin(id, min) { const ins = insById(id); min = +min; if (!(min >= 0)) fail('El mínimo no puede ser negativo.'); ins.min = min; return 'Stock mínimo actualizado'; },
  setInsumoCost(id, cost) {
    const ins = insById(id); cost = Math.round(+cost); if (!(cost > 0)) fail('El costo tiene que ser mayor a cero.');
    const old = ins.cost; ins.cost = cost;
    addMove({ kind: 'insumo', insumoId: id, qty: 0, type: 'ajuste', unitCost: cost, note: 'Costo actualizado ' + money(old) + ' → ' + money(cost) });
    return 'Nuevo costo de ' + ins.name.toLowerCase() + ': ' + money(cost) + ' por ' + ins.unit;
  },
  writeOffLot(id, qty, reason) {
    const l = S.lots.find(x => x.id === id); qty = Math.round(+qty);
    const free = l.expires < TODAY() ? l.qty : lotFree(l);
    if (!(qty > 0)) fail('Indicá cuántas unidades das de baja.');
    if (qty > free) fail('Solo podés dar de baja unidades sin reservar (' + free + ').');
    l.qty -= qty;
    addMove({ kind: 'producto', skuId: l.skuId, lotId: l.id, qty: -qty, type: 'baja', note: (reason || 'Baja') + ' · lote ' + l.code + ' · ' + money(qty * skuCost(skuById(l.skuId)).total) + ' a costo' });
    rebalance();
    return qty + ' unidades dadas de baja del lote ' + l.code;
  },
  updateSku(id, f) {
    const s = skuById(id);
    const price = Math.round(+f.price), labor = Math.round(+f.labor), shelf = Math.round(+f.shelf), min = Math.round(+f.min);
    if (!(price > 0)) fail('El precio tiene que ser mayor a cero.');
    if (!(labor >= 0)) fail('El costo de elaboración no puede ser negativo.');
    if (!(shelf >= 1 && shelf <= 60)) fail('La vida útil tiene que estar entre 1 y 60 días.');
    if (!(min >= 0)) fail('El stock mínimo no puede ser negativo.');
    const recipe = {};
    for (const k in f.recipe) { const v = +f.recipe[k]; if (v < 0 || isNaN(v)) fail('Revisá las cantidades de la receta.'); if (v > 0) recipe[k] = v; }
    Object.assign(s, { price, labor, shelf, min, recipe });
    return 'Receta de ' + s.name + ' actualizada';
  },
  importClients(rows) {
    let n = 0;
    for (const r of rows) { A.addClient({ name: r.nombre, phone: r.telefono, address: r.direccion, barrio: r.barrio, ref: r.referencia, channel: r.canal || 'whatsapp', delivery: r.direccion ? 'uber' : 'retiro' }); n++; }
    S.onboard.clients = true;
    return n + (n === 1 ? ' cliente importado' : ' clientes importados');
  },
  importProducts(rows) {
    let nNew = 0, nUpd = 0;
    for (const r of rows) {
      if (r._update) { const s = skuById(r._update); s.price = r.precio; nUpd++; continue; }
      const fk = 'f_' + uid(''), base = r.producto.replace(/^yogur(t)?\s+(griego\s+)?(de\s+|con\s+)?/i, '').replace(/\s*\d+(\s*(g|gr|kg|ml))\b.*$/i, '').trim() || r.producto;
      S.flavors[fk] = { name: cap(base), top: '#C9A74A' }; FLAVORS[fk] = S.flavors[fk];
      const id = uid('sku');
      S.skus.push({ id, code: (base.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PRD') + r.tamano, flavor: fk, size: r.tamano, price: r.precio, labor: 0, shelf: r.vida, min: 0, recipe: {}, name: r.producto, imported: true });
      nNew++;
    }
    S.onboard.products = true;
    return [nNew ? nNew + (nNew === 1 ? ' producto nuevo' : ' productos nuevos') : '', nUpd ? nUpd + (nUpd === 1 ? ' precio actualizado' : ' precios actualizados') : ''].filter(Boolean).join(' y ') || 'Nada para importar';
  },
  importStock(rows) {
    let n = 0, u = 0;
    for (const r of rows) {
      const sku = skuById(r._sku);
      const lot = { id: uid('l'), code: lotCode(sku, r.elaboracion), skuId: sku.id, made: r.elaboracion, expires: r.vencimiento, qty: r.cantidad, initial: r.cantidad };
      S.lots.push(lot);
      addMove({ kind: 'producto', skuId: sku.id, lotId: lot.id, qty: r.cantidad, type: 'produccion', note: 'Stock inicial importado · lote ' + lot.code });
      n++; u += r.cantidad;
    }
    rebalance();
    S.onboard.stock = true;
    return u + ' unidades cargadas en ' + n + (n === 1 ? ' lote' : ' lotes');
  },
  addEvent(name, date) {
    if (!(name || '').trim()) fail('Poné un nombre a la fecha.');
    if (!date) fail('Elegí la fecha.');
    S.events.push({ id: uid('e'), name: name.trim(), date });
    return 'Fecha agregada al calendario';
  },
};
