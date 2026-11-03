'use strict';
/* =====================================================================
   ui.js — componentes, vistas y eventos
   ===================================================================== */

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>',
  pot: '<path d="M4 11h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 11h20"/><path d="M9 7.5c0-1.2 1-1.2 1-2.5M14 7.5c0-1.2 1-1.2 1-2.5"/>',
  truck: '<path d="M2 6h12v10H2z"/><path d="M14 9h4.5L22 12.5V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
  boxes: '<path d="M12 3 3 7.5 12 12l9-4.5z"/><path d="M3 7.5v9L12 21l9-4.5v-9"/><path d="M12 12v9"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2M7 6V4h10v2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  chevl: '<path d="m15 6-6 6 6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.7-4.3L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4.3L21 15"/><path d="M21 20v-5h-5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  car: '<path d="M5 16h14v-4l-2-5H7l-2 5z"/><path d="M5 12h14"/><circle cx="8" cy="16.5" r="1.6"/><circle cx="16" cy="16.5" r="1.6"/>',
  msg: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  store: '<path d="M4 9h16l-1.5-5h-13zM5 9v11h14V9"/><path d="M10 20v-5h4v5"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
};
const ic = (n, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- Ilustraciones (SVG propio, sin imágenes externas) ---------- */
function jarInner(flavor) {
  const top = flavor === 'frutos' ? '<circle cx="15" cy="17.5" r="2.7" fill="#B83A55"/><circle cx="20.5" cy="16.5" r="2.5" fill="#8E2440"/><circle cx="25.5" cy="17.8" r="2.6" fill="#C9475F"/><path d="M19 14.5l1.5-1.5" stroke="#5E7A47" stroke-width="1.2"/>'
    : flavor === 'miel' ? '<path d="M10 18.5c4-2.6 16-2.6 20 0v1.5H10z" fill="#E1A93C"/><circle cx="14.5" cy="16.8" r="1.7" fill="#B07A2A"/><circle cx="19.5" cy="16" r="1.5" fill="#9C6A22"/><circle cx="25" cy="16.9" r="1.7" fill="#C08A34"/>'
      : flavor === 'arandanos' ? '<circle cx="15" cy="17.6" r="2.5" fill="#4F4889"/><circle cx="20.4" cy="16.6" r="2.5" fill="#3D3772"/><circle cx="25.6" cy="17.7" r="2.4" fill="#5C55A0"/>'
        : '<path d="M12.5 18.5q7.5-3.6 15 0" stroke="#E2D9C3" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
  return `<rect x="9" y="3" width="22" height="7" rx="2.5" fill="var(--sage)"/><rect x="9" y="8.4" width="22" height="1.6" fill="var(--sage-ink)" opacity=".25"/><path d="M8 12h24v24a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z" fill="var(--glass)" stroke="var(--glass-line)"/><path d="M10 18h20v17a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="var(--yog)"/>${top}<path d="M12.5 23v11" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>`;
}
const jar = (flavor, size) => `<svg width="${size || 40}" height="${size || 40}" viewBox="0 0 40 44" aria-hidden="true">${jarInner(flavor)}</svg>`;
function heroArt() {
  const berry = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  return `<svg viewBox="0 0 340 210" aria-hidden="true">
    <ellipse cx="190" cy="196" rx="150" ry="10" fill="var(--sage-2)" opacity=".35"/>
    <path d="M38 150c-6-40 22-74 60-78-4 36-26 66-60 78z" fill="var(--sage)" opacity=".55"/><path d="M38 150 86 86" stroke="var(--sage-ink)" stroke-width="1.5" opacity=".5"/>
    <path d="M300 64c34 6 40 44 26 70-22-12-34-42-26-70z" fill="var(--sage)" opacity=".45"/>
    <g transform="translate(96 24) scale(4.1)">${jarInner('frutos')}</g>
    <g transform="translate(40 92) scale(2.5)">${jarInner('natural')}</g>
    <g transform="translate(244 98) scale(2.3)">${jarInner('arandanos')}</g>
    ${berry(232, 192, 7, '#B83A55')}${berry(246, 189, 6, '#8E2440')}${berry(80, 194, 6, '#4F4889')}${berry(292, 192, 5, '#C9475F')}
    <path d="M226 186l3-5" stroke="#5E7A47" stroke-width="1.6"/>
  </svg>`;
}

/* ---------- Estado de interfaz (no se guarda) ---------- */
const U = {
  view: 'inicio',
  ped: { date: 'hoy', state: 'todos', q: '', mob: 'por_elaborar' },
  env: { date: 'hoy', showDone: false },
  prod: { tab: 'hoy' },
  inv: { tab: 'productos', mv: 'todos' },
  ven: { period: '30d', basis: 'pedido', from: '', to: '', all: false },
  cob: { hist: 'todos' },
  cli: { q: '', tag: 'todos' },
  est: { packs: 8, disc: 8 },
  sim: { milk: null },
  gri: { open: false, msgs: [], more: false, allMain: false },
};

/* ---------- Chips ---------- */
function payChip(o) {
  const st = payState(o);
  if (st === 'cancelado') return '<span class="chip">Cancelado</span>';
  if (st === 'pagado') return `<span class="chip good">${ic('check', 'sm')}Pagado</span>`;
  if (st === 'parcial') return `<span class="chip warn">Debe ${money(balanceOf(o))}</span>`;
  return `<span class="chip bad">A cobrar · ${o.payMethod === 'efectivo' ? 'efectivo' : 'transf.'}</span>`;
}
function statusChip(o) {
  if (o.cancelled) return '<span class="chip">Cancelado</span>';
  const m = { por_elaborar: 'terra', en_produccion: 'warn', listo: 'info', entregado: 'good' };
  return `<span class="chip ${m[o.status]}"><span class="dot"></span>${STATUS[o.status]}</span>`;
}
function shipChip(o) {
  if (!o.ship) return '<span class="chip">Retira en el local</span>';
  if (o.ship.incident) return `<span class="chip bad">${ic('alert', 'sm')}Incidencia</span>`;
  const m = { pendiente: '', solicitado: 'info', en_camino: 'warn', entregado: 'good' };
  const label = o.ship.status === 'pendiente' && o.status === 'listo' ? 'Listo para solicitar' : SHIP[o.ship.status];
  return `<span class="chip ${m[o.ship.status]}">${label}</span>`;
}
const slotStart = s => s.split('–')[0];
const itemsText = o => o.items.map(it => it.qty + ' × ' + skuShort(skuById(it.skuId)) + (it.toppings.length ? ' + ' + it.toppings.map(t => TOPPINGS[t].name.toLowerCase()).join(', ') : '')).join(', ');
const orderAddr = o => { const c = clientById(o.clientId); return { address: o.address || c.address || '', ref: o.ref != null && o.address ? o.ref : (c.ref || ''), barrio: c.barrio || '' }; };
const initials = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const relDay = d => { const n = diffDays(d, TODAY()); return n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n === -1 ? 'Ayer' : fmtDate(d); };
const ago = d => { const n = diffDays(TODAY(), d); return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : 'hace ' + n + ' días'; };
function delta(cur, prev, label) {
  if (!prev) return `<span class="delta flat">sin datos ${label || ''}</span>`;
  const r = (cur - prev) / prev;
  const cls = Math.abs(r) < .005 ? 'flat' : r > 0 ? 'up' : 'down';
  return `<span class="delta ${cls}">${cls === 'up' ? ic('up', 'sm') : cls === 'down' ? ic('down', 'sm') : ''}${Math.abs(Math.round(r * 100))}%</span><span>${label || ''}</span>`;
}

/* ---------- Gráficos SVG ---------- */
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
const kfmt = n => n >= 1e6 ? '$' + fmtN(n / 1e6, 1) + 'M' : n >= 1e3 ? '$' + Math.round(n / 1e3) + 'k' : '$' + Math.round(n);
function barChart(data, opt) {
  opt = opt || {};
  const W = opt.w || 900, H = opt.h || 250, pl = 46, pr = 6, pt = 18, pb = 30;
  const max = niceMax(Math.max(1, ...data.map(d => d.v)));
  const iw = W - pl - pr, ih = H - pt - pb, bw = iw / data.length, w = Math.max(4, Math.min(44, bw * .62));
  const step = data.length > 20 ? Math.ceil(data.length / 10) : 1;
  let g = '';
  for (let i = 0; i <= 4; i++) { const y = pt + ih - ih * i / 4; g += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${kfmt(max * i / 4)}</text>`; }
  data.forEach((d, i) => {
    const h = Math.max(d.v > 0 ? 2 : 0, ih * d.v / max), x = pl + bw * i + (bw - w) / 2, y = pt + ih - h;
    g += `<rect class="bar ${d.cls || ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(6, w / 3)}" data-tip="${esc(d.tip || d.label + ' · ' + money(d.v))}" ${opt.act ? `data-act="${opt.act}" data-arg="${esc(d.arg || '')}"` : ''}/>`;
    if (i % step === 0) g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 10}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opt.label || 'Gráfico de barras')}">${g}</svg>`;
}
function hbars(list, fmt) {
  const max = Math.max(1, ...list.map(x => x.v));
  return `<div class="hbars">${list.map(x => `<div class="hbar"><span class="lbl">${x.icon || ''}<span style="min-width:0">${esc(x.label)}</span></span><span class="val">${fmt ? fmt(x.v) : money(x.v)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span><span class="track"><i style="width:${(x.v / max * 100).toFixed(1)}%;${x.color ? 'background:' + x.color : ''}"></i></span></div>`).join('')}</div>`;
}
const PALETTE = ['var(--primary)', 'var(--terra)', 'var(--sage-2)', '#C9A74A', 'var(--info)'];
function stackBar(list) {
  const tot = sum(list, x => x.v) || 1;
  return `<div class="stack">${list.map((x, i) => `<i style="width:${(x.v / tot * 100).toFixed(2)}%;background:${PALETTE[i % PALETTE.length]}" data-tip="${esc(x.label + ' · ' + money(x.v) + ' · ' + pctTxt(x.v / tot))}"></i>`).join('')}</div>
  <div class="legend">${list.map((x, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(x.label)} <b class="num">${pctTxt(x.v / tot)}</b></span>`).join('')}</div>`;
}

/* ---------- Componentes ---------- */
const pageHead = (title, sub, actions) => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
const seg = (act, cur, opts) => `<div class="seg" role="tablist">${opts.map(([v, l]) => `<button role="tab" aria-selected="${v === cur}" class="${v === cur ? 'on' : ''}" data-act="${act}" data-arg="${v}">${l}</button>`).join('')}</div>`;
const emptyBox = t => `<div class="empty">${t}</div>`;

/* =====================================================================
   VISTAS
   ===================================================================== */
const NAV = [
  ['bienvenida', 'Primeros pasos', 'spark'], ['inicio', 'Inicio', 'home'], ['pedidos', 'Pedidos', 'orders'], ['produccion', 'Producción', 'pot'], ['envios', 'Envíos', 'truck'],
  ['inventario', 'Inventario', 'boxes'], ['ventas', 'Ventas', 'chart'], ['cobrar', 'Cobrar', 'wallet'], ['clientes', 'Clientes', 'users'], ['estrategia', 'Estrategia', 'target'],
];
function navBadges() {
  const D = TODAY();
  const open = S.orders.filter(o => isOpen(o) && o.deliveryDate <= D);
  const toReq = S.orders.filter(o => isOpen(o) && o.ship && o.ship.status === 'pendiente' && o.status === 'listo').length;
  const plan = productionPlan().filter(p => p.need > 0).length;
  const lowIns = S.insumos.filter(i => i.stock < i.min).length;
  const expiring = S.lots.filter(l => l.qty > 0 && (lotState(l) === 'proximo' || lotState(l) === 'vencido')).length;
  const owed = S.orders.filter(o => balanceOf(o) > 0 && (o.status === 'entregado' || o.deliveryDate < D)).length;
  const ob = typeof onbDone === 'function' ? onbDone() : 4;
  return {
    bienvenida: ob < 4 ? `<span class="badge terra">${ob}/4</span>` : '',
    pedidos: open.length ? `<span class="badge">${open.length}</span>` : '',
    produccion: plan ? `<span class="badge terra">${plan}</span>` : '',
    envios: toReq ? `<span class="badge terra">${toReq}</span>` : '',
    inventario: lowIns + expiring ? `<span class="badge warn">${lowIns + expiring}</span>` : '',
    cobrar: owed ? `<span class="badge bad">${owed}</span>` : '',
  };
}

/* ---------- PEDIDOS ---------- */
function pedFilter(o) {
  const D = TODAY(), f = U.ped;
  if (f.q) {
    const q = f.q.toLowerCase().replace('#', '');
    const c = clientById(o.clientId);
    if (!c.name.toLowerCase().includes(q) && !String(o.number).includes(q)) return false;
  }
  if (o.status === 'entregado') return o.deliveredDate === D;
  if (f.date === 'hoy') return o.deliveryDate <= D;
  if (f.date === 'manana') return o.deliveryDate === addDays(D, 1);
  if (f.date === 'semana') return o.deliveryDate <= addDays(D, 7);
  return true;
}
function orderCard(o) {
  const c = clientById(o.clientId); const D = TODAY();
  const late = o.deliveryDate < D && isOpen(o);
  const miss = shortageText(o);
  const reserveLine = o.status === 'entregado' ? '' : o.stockConsumed ? `<span class="chip warn">${ic('car', 'sm')}${SHIP[o.ship ? o.ship.status : 'en_camino']}</span>` : miss ? `<span class="chip terra">Falta: ${esc(miss)}</span>` : `<span class="chip sage">${ic('check', 'sm')}Stock reservado</span>`;
  let next = '';
  if (o.status === 'por_elaborar') next = miss ? `<button class="btn sm soft" data-act="move" data-arg="${o.id}" data-to="en_produccion">A producción</button>` : `<button class="btn sm primary" data-act="move" data-arg="${o.id}" data-to="listo">Listo ${ic('check', 'sm')}</button>`;
  else if (o.status === 'en_produccion') next = `<button class="btn sm primary" data-act="move" data-arg="${o.id}" data-to="listo" ${miss ? 'disabled title="Falta stock"' : ''}>Listo ${ic('check', 'sm')}</button>`;
  else if (o.status === 'listo') next = o.ship ? `<button class="btn sm primary" data-act="go-ship" data-arg="${o.id}">Envío ${ic('chev', 'sm')}</button>` : `<button class="btn sm primary" data-act="move" data-arg="${o.id}" data-to="entregado">Entregado ${ic('check', 'sm')}</button>`;
  return `<article class="ocard ${late || o.ship?.incident ? 'alertline' : ''}" data-drag="${o.id}" data-act="order" data-arg="${o.id}" tabindex="0" aria-label="Pedido ${o.number} de ${esc(c.name)}">
    <div class="oc-top"><span class="oc-num">#${o.number}</span><span class="oc-total">${money(o.total)}</span></div>
    <div class="oc-name">${esc(c.name)}</div>
    <div class="oc-items">${o.items.map(it => `<div><b>${it.qty}×</b> ${esc(skuShort(skuById(it.skuId)))}${it.toppings.length ? ' <span class="faint">+ ' + it.toppings.map(t => esc(TOPPINGS[t].name.toLowerCase())).join(', ') + '</span>' : ''}</div>`).join('')}</div>
    <div class="oc-meta"><span style="${late ? 'color:var(--bad);font-weight:700' : ''}">${ic('clock', 'sm')}${relDay(o.deliveryDate)} · ${o.slot}</span><span>${ic(o.delivery === 'retiro' ? 'store' : o.delivery === 'uber' ? 'car' : 'truck', 'sm')}${o.delivery === 'retiro' ? 'Retira' : DELIVERY[o.delivery]}</span></div>
    ${o.notes ? `<div class="oc-note">${esc(o.notes)}</div>` : ''}
    <div class="chips">${payChip(o)}${reserveLine}</div>
    ${o.status !== 'entregado' ? `<div class="oc-actions"><button class="btn sm ghost" data-act="edit-order" data-arg="${o.id}">${ic('edit', 'sm')}Editar</button>${next}</div>` : ''}
  </article>`;
}
function vPedidos() {
  const D = TODAY();
  const list = S.orders.filter(o => !o.cancelled && pedFilter(o));
  const cols = [['por_elaborar', 'Por elaborar', 'var(--terra)', 'Hay que prepararlos'], ['en_produccion', 'En producción', 'var(--warn)', 'Se están elaborando'], ['listo', 'Listo para enviar', 'var(--info)', 'Armados y reservados'], ['entregado', 'Entregado', 'var(--good)', 'Entregados hoy']];
  const by = {}; for (const [k] of cols) by[k] = list.filter(o => o.status === k).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.slot.localeCompare(b.slot));
  const toBuild = {}; for (const o of [...by.por_elaborar, ...by.en_produccion]) for (const it of o.items) toBuild[it.skuId] = (toBuild[it.skuId] || 0) + it.qty;
  const sumTxt = Object.keys(toBuild).map(k => `<b>${toBuild[k]}</b> ${esc(skuShort(skuById(k)))}`).join(' · ');
  const shown = U.ped.state === 'todos' ? cols : cols.filter(c => c[0] === U.ped.state);
  return `<div class="wrap">
  ${pageHead('Pedidos', 'Arrastrá un pedido a otra columna para cambiar su estado. El stock se reserva solo, del lote que vence primero.', `<button class="btn primary" data-act="new-order">${ic('plus')}Nuevo pedido</button>`)}
  <div class="toolbar">
    <label class="search">${ic('search')}<input id="ped-q" type="search" placeholder="Buscar por cliente o número" value="${esc(U.ped.q)}" data-input="ped-q" aria-label="Buscar pedidos"></label>
    ${seg('ped-date', U.ped.date, [['hoy', 'Hoy'], ['manana', 'Mañana'], ['semana', '7 días'], ['todos', 'Todos']])}
    <select class="input" style="width:auto;height:40px" id="ped-state" data-change="ped-state" aria-label="Filtrar por estado">${[['todos', 'Todos los estados'], ...cols.map(c => [c[0], c[1]])].map(([v, l]) => `<option value="${v}" ${U.ped.state === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
  </div>
  ${U.ped.state === 'todos' ? `<div class="col-tabs">${seg('ped-mob', U.ped.mob, cols.map(c => [c[0], c[1].replace(' para enviar', '') + ' <span class="badge">' + by[c[0]].length + '</span>']))}</div>` : ''}
  <div class="kanban ${U.ped.state !== 'todos' ? 'single' : ''}">
    ${shown.map(([k, label, color, hint]) => `<section class="col ${U.ped.mob === k || U.ped.state !== 'todos' ? 'mob-on' : ''}" data-drop="${k}">
      <div class="col-head"><span class="cdot" style="background:${color}"></span><div><b>${label}</b><div class="hint">${hint}</div></div><span class="badge count">${by[k].length}</span></div>
      <div class="col-body">${k === 'por_elaborar' && sumTxt ? `<div class="col-sum">Total a armar: ${sumTxt}</div>` : ''}${by[k].map(orderCard).join('') || emptyBox(k === 'entregado' ? 'Todavía no entregaste nada hoy.' : 'Sin pedidos')}</div>
    </section>`).join('')}
  </div>
  <p class="hint">En la compu, arrastrá la tarjeta. En el celu, mantené apretada la tarjeta y soltala sobre la pestaña del estado. También podés usar los botones de cada pedido.</p>
  </div>`;
}

/* ---------- ENVÍOS ---------- */
function shipText(o) {
  const c = clientById(o.clientId), a = orderAddr(o), bal = balanceOf(o);
  return `PEDIDO #${o.number} · ${c.name}
Tel: ${c.phone || 'sin teléfono'}
Dirección: ${a.address}${a.barrio ? ', ' + a.barrio : ''}, CABA${a.ref ? '\nReferencia: ' + a.ref : ''}
Entrega: ${relDay(o.deliveryDate).toLowerCase()} ${o.slot}
Contenido: ${itemsText(o)}
Envío a cargo del ${o.shipPaidBy === 'negocio' ? 'negocio' : 'cliente'}${bal > 0 ? '\nCobrar al entregar: ' + money(bal) + (o.payMethod === 'efectivo' ? ' en efectivo' : ' (transferencia)') : '\nYa está pagado'}
Frascos de vidrio: viajan refrigerados y derechos.`;
}
/* ---------- PRODUCCIÓN ---------- */
function vProduccion() {
  const t = U.prod.tab;
  return `<div class="wrap">
  ${pageHead('Producción', 'Producción mixta: lo que piden tus clientes más lo que querés tener en stock.', `<button class="btn primary" data-act="po-new">${ic('plus')}Orden de producción</button>`)}
  ${seg('prod-tab', t, [['hoy', 'Qué producir hoy'], ['ordenes', 'Órdenes y lotes'], ['recetas', 'Recetas y costos']])}
  ${t === 'hoy' ? prodHoy() : t === 'ordenes' ? prodOrdenes() : prodRecetas()}
  </div>`;
}
function poCard(p) {
  const sku = skuById(p.skuId), lot = S.lots.find(l => l.id === p.lotId);
  const stages = `<div class="stages">${STAGES.map((s, i) => `<div class="stage ${p.status === 'finalizada' || i < p.stage ? 'done' : i === p.stage && p.status === 'en_curso' ? 'cur' : ''}"><i>${p.status === 'finalizada' || i < p.stage ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--on-primary)" stroke-width="4"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' : ''}</i>${s}</div>`).join('')}</div>`;
  let acts = '';
  if (p.status === 'programada') acts = `<button class="btn sm ghost" data-act="po-cancel" data-arg="${p.id}">Cancelar</button><button class="btn sm" data-act="po-start" data-arg="${p.id}">Iniciar</button><button class="btn sm primary" data-act="po-finish" data-arg="${p.id}">Finalizar</button>`;
  if (p.status === 'en_curso') acts = `<button class="btn sm ghost" data-act="po-cancel" data-arg="${p.id}">Cancelar</button>${p.stage < STAGES.length - 1 ? `<button class="btn sm" data-act="po-advance" data-arg="${p.id}">Pasar a ${STAGES[p.stage + 1].toLowerCase()}</button>` : ''}<button class="btn sm primary" data-act="po-finish" data-arg="${p.id}">Finalizar</button>`;
  const chip = { programada: '<span class="chip">Programada</span>', en_curso: '<span class="chip warn">En curso</span>', finalizada: '<span class="chip good">Finalizada</span>', cancelada: '<span class="chip bad">Cancelada</span>' }[p.status];
  return `<div class="card tight" style="display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;gap:12px;align-items:center">${jar(sku.flavor, 42)}<div class="row-main"><div class="row-title">${esc(sku.name)} ${chip}</div><div class="row-sub">${p.id.toUpperCase()} · ${relDay(p.date)} · ${p.realQty || p.qty} unidades${lot ? ' · lote ' + esc(lot.code) + ' · vence ' + fmtDate(lot.expires) : ''}</div>${p.note ? `<div class="row-sub">${esc(p.note)}</div>` : ''}</div></div>
    ${p.status !== 'cancelada' ? stages : ''}
    ${acts ? `<div class="chips" style="justify-content:flex-end">${acts}</div>` : ''}
  </div>`;
}
function prodOrdenes() {
  const list = S.prodOrders.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id, undefined, { numeric: true }));
  return `<div class="grid g2">${list.map(poCard).join('')}</div>`;
}
function prodRecetas() {
  const milk = insById('leche');
  const simCost = U.sim.milk != null ? U.sim.milk : milk.cost;
  const D = TODAY();
  const sold = {}; for (const o of S.orders.filter(o => !o.cancelled && o.createdAt > addDays(D, -30))) for (const it of o.items) sold[it.skuId] = (sold[it.skuId] || 0) + it.qty;
  const rows = S.skus.map(s => {
    const now = skuCost(s), sim = skuCost(s, { leche: simCost });
    return { s, now, sim, mNow: (s.price - now.total) / s.price, mSim: (s.price - sim.total) / s.price, units: sold[s.id] || 0 };
  });
  const impact = sum(rows, r => (r.sim.total - r.now.total) * r.units);
  const pctUp = (simCost - milk.cost) / milk.cost;
  const cards = rows.map(({ s, now }) => {
    const gp = s.price - now.total, m = gp / s.price;
    const seg2 = [['Ingredientes', now.ing, 'var(--sage)'], ['Envase y tapa', now.env, 'var(--terra)'], ['Etiqueta', now.eti, '#C9A74A'], ['Elaboración', now.labor, 'var(--info)']];
    return `<div class="card tight" style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;gap:12px;align-items:center">${jar(s.flavor, 44)}<div class="row-main"><div class="row-title">${esc(s.name)}</div><div class="row-sub">Vida útil ${s.shelf} días · stock mínimo ${s.min}</div></div><button class="btn sm" data-act="sku-edit" data-arg="${s.id}">${ic('edit', 'sm')}Receta</button></div>
      <div class="cost-split">${seg2.map(([l, v, c]) => `<i style="width:${(v / s.price * 100).toFixed(1)}%;background:${c}" data-tip="${l} · ${money(v)}"></i>`).join('')}<i style="flex:1;background:var(--surface-2)" data-tip="Ganancia bruta · ${money(gp)}"></i></div>
      <div class="legend">${seg2.map(([l, v, c]) => `<span><i style="background:${c}"></i>${l} <b class="num">${money(v)}</b></span>`).join('')}</div>
      <div class="tri" style="margin-top:4px"><div class="stat"><small>Precio de venta</small><b>${money(s.price)}</b></div><div class="stat"><small>Costo unitario total</small><b>${money(now.total)}</b></div><div class="stat"><small>Ganancia bruta · margen</small><b>${money(gp)} · ${pctTxt(m)}</b></div></div>
    </div>`;
  }).join('');
  return `<div class="card">
    <div class="sec-title"><div><h2>¿Qué pasa si aumenta el precio de la leche?</h2><p class="hint" style="margin:4px 0 0">Mové el costo y mirá cómo cambia el margen de cada receta. No modifica nada hasta que lo guardes.</p></div></div>
    <div class="frow" style="align-items:end">
      <div class="field"><label for="sim-milk">Costo de la leche por litro</label><input type="range" class="range" id="sim-milk" min="${Math.round(milk.cost * .7)}" max="${Math.round(milk.cost * 1.8)}" step="10" value="${simCost}" data-input="sim-milk"></div>
      <div class="field"><label for="sim-milk-n">Hoy pagás ${money(milk.cost)}</label><input type="number" class="input" id="sim-milk-n" value="${simCost}" data-input="sim-milk"></div>
    </div>
    <div class="k-sub" style="margin:12px 0 4px;font-size:13.5px">${Math.abs(pctUp) < .001 ? 'Precio actual.' : `Con la leche ${pctUp > 0 ? 'un ' + Math.round(pctUp * 100) + '% más cara' : 'un ' + Math.round(-pctUp * 100) + '% más barata'}, con lo que vendiste en los últimos 30 días la ganancia bruta habría sido <b style="color:var(--${impact > 0 ? 'bad' : 'good'})">${money(Math.abs(impact))} ${impact > 0 ? 'menor' : 'mayor'}</b>.`}</div>
    <div class="tbl-wrap"><table class="lot-table resp"><thead><tr><th>Producto</th><th class="r">Costo hoy</th><th class="r">Costo simulado</th><th class="r">Margen hoy</th><th class="r">Margen simulado</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td class="wide" data-l="Producto"><b>${esc(r.s.name)}</b></td><td class="r" data-l="Costo hoy">${money(r.now.total)}</td><td class="r" data-l="Simulado">${money(r.sim.total)}</td><td class="r" data-l="Margen hoy">${pctTxt(r.mNow)}</td><td class="r" data-l="Margen simulado"><b style="color:var(--${r.mSim < r.mNow - .001 ? 'bad' : r.mSim > r.mNow + .001 ? 'good' : 'ink'})">${pctTxt(r.mSim)}</b></td></tr>`).join('')}
    </tbody></table></div>
    <div class="chips" style="margin-top:12px;justify-content:space-between"><span class="hint">Margen bruto = precio − costo directo (ingredientes, envase, etiqueta y elaboración). No incluye alquiler, sueldos fijos, impuestos ni comisiones, así que no es la utilidad neta.</span>${simCost !== milk.cost ? `<span class="chips"><button class="btn sm ghost" data-act="sim-reset">Volver al precio actual</button><button class="btn sm primary" data-act="sim-save">Guardar como nuevo costo</button></span>` : ''}</div>
  </div>
  <div class="grid g2">${cards}</div>
  <div class="card"><div class="sec-title"><h2>Toppings opcionales</h2></div><div class="rows">${Object.keys(TOPPINGS).map(k => { const t = TOPPINGS[k], c = toppingCost(k); return `<div class="row"><div class="row-main"><div class="row-title">${t.name}</div><div class="row-sub">${fmtN(t.qty * 1000, 0)} g de ${esc(insById(t.insumo).name.toLowerCase())} por frasco</div></div><div class="row-end"><b>${money(t.price)}</b><span class="hint">costo ${money(c)} · margen ${pctTxt((t.price - c) / t.price)}</span></div></div>`; }).join('')}</div></div>`;
}

/* ---------- INVENTARIO ---------- */
const lotChip = l => ({ ok: '<span class="chip good">Vigente</span>', proximo: '<span class="chip warn">Próximo a vencer</span>', vencido: '<span class="chip bad">Vencido</span>', agotado: '<span class="chip">Agotado</span>' }[lotState(l)]);
function invInsumos() {
  const value = sum(S.insumos, i => i.stock * i.cost);
  const low = S.insumos.filter(i => i.stock < i.min);
  const D = TODAY();
  const cons30 = {}; for (const m of S.moves.filter(m => m.kind === 'insumo' && m.type === 'consumo' && m.date > addDays(D, -30))) cons30[m.insumoId] = (cons30[m.insumoId] || 0) - m.qty;
  const waste30 = sum(S.moves.filter(m => m.kind === 'insumo' && m.type === 'desperdicio' && m.date > addDays(D, -30)), m => -m.qty * (m.unitCost || 0));
  const cats = [['ingrediente', 'Ingredientes'], ['envase', 'Envases y tapas'], ['etiqueta', 'Etiquetas']];
  return `<div class="grid g3">
    ${kpi({ icon: 'boxes', label: 'Valor del inventario', value: money(value), sub: S.insumos.length + ' insumos a costo actual', small: true })}
    ${kpi({ icon: 'alert', label: 'Por debajo del mínimo', value: low.length, sub: low.map(i => i.name).join(', ') || 'Todo cubierto', tone: low.length ? 'bad' : '' })}
    ${kpi({ icon: 'trash', label: 'Desperdicio 30 días', value: money(waste30), sub: 'insumos descartados', tone: 'warn', small: true })}
  </div>
  ${cats.map(([cat, label]) => `<div class="card"><div class="sec-title"><h2>${label}</h2></div><div class="rows">${S.insumos.filter(i => i.cat === cat).map(i => {
    const r = i.min ? i.stock / (i.min * 2) : 1; const tone = i.stock < i.min ? 'bad' : i.stock < i.min * 1.3 ? 'warn' : 'good';
    return `<div class="row" style="flex-wrap:wrap"><div class="row-main" style="min-width:180px"><div class="row-title">${esc(i.name)} ${i.stock < i.min ? '<span class="chip bad">Bajo mínimo</span>' : ''}</div>
      <div class="row-sub">${fmtN(i.stock)} ${i.unit} · mínimo ${fmtN(i.min)} ${i.unit} · ${money(i.cost)} por ${i.unit}${cons30[i.id] ? ' · consumo 30 días ' + fmtN(cons30[i.id], 1) + ' ' + i.unit : ''}</div>
      <div class="prog ${tone}" style="margin-top:7px;max-width:420px"><i style="width:${Math.min(100, r * 100).toFixed(0)}%"></i></div></div>
      <div class="chips"><button class="btn sm" data-act="ins-buy" data-arg="${i.id}">Compra</button><button class="btn sm ghost" data-act="ins-waste" data-arg="${i.id}">Desperdicio</button><button class="btn sm ghost" data-act="ins-min" data-arg="${i.id}">Mínimo</button><button class="btn sm ghost icon" data-act="ins-hist" data-arg="${i.id}" aria-label="Historial">${ic('history', 'sm')}</button></div></div>`;
  }).join('')}</div></div>`).join('')}`;
}
/* ---------- VENTAS ---------- */
function periodRange(p) {
  const D = TODAY();
  if (p === 'hoy') return { a: D, b: D, pa: addDays(D, -7), pb: addDays(D, -7), label: 'Hoy', cmp: 'vs. el ' + DIAS[weekday(D)] + ' pasado' };
  if (p === 'semana') { const back = (weekday(D) + 6) % 7; const a = addDays(D, -back); return { a, b: D, pa: addDays(a, -7), pb: addDays(D, -7), label: 'Esta semana', cmp: 'vs. mismos días de la semana pasada' }; }
  if (p === '30d') return { a: addDays(D, -29), b: D, pa: addDays(D, -59), pb: addDays(D, -30), label: 'Últimos 30 días', cmp: 'vs. los 30 días anteriores' };
  if (p === 'mes') { const a = D.slice(0, 8) + '01'; const pd = new Date(toT(a) - DAY); const pa = fromT(Date.UTC(pd.getUTCFullYear(), pd.getUTCMonth(), 1)); const pbN = Math.min(+D.slice(8), pd.getUTCDate()); return { a, b: D, pa, pb: pa.slice(0, 8) + pad(pbN), label: cap(MESES_L[+D.slice(5, 7) - 1]), cmp: 'vs. mismo tramo del mes pasado' }; }
  if (p === 'rango' && U.ven.from && U.ven.to && U.ven.from <= U.ven.to) { const n = diffDays(U.ven.to, U.ven.from) + 1; return { a: U.ven.from, b: U.ven.to, pa: addDays(U.ven.from, -n), pb: addDays(U.ven.from, -1), label: fmtDate(U.ven.from) + ' al ' + fmtDate(U.ven.to), cmp: 'vs. los ' + n + ' días anteriores' }; }
  const first = S.orders.reduce((m, o) => o.createdAt < m ? o.createdAt : m, D);
  return { a: first, b: D, pa: null, pb: null, label: 'Todo el historial', cmp: '' };
}
function salesIn(a, b, basis) {
  const valid = S.orders.filter(o => !o.cancelled);
  if (basis === 'cobro') {
    const ps = S.payments.filter(p => p.date >= a && p.date <= b);
    return ps.map(p => { const o = orderById(p.orderId); const f = o.total ? p.amount / o.total : 0; return { o, date: p.date, total: p.amount, profit: profitOf(o) * f, f }; });
  }
  if (basis === 'entrega') return valid.filter(o => o.status === 'entregado' && o.deliveredDate >= a && o.deliveredDate <= b).map(o => ({ o, date: o.deliveredDate, total: o.total, profit: profitOf(o), f: 1 }));
  return valid.filter(o => o.createdAt >= a && o.createdAt <= b).map(o => ({ o, date: o.createdAt, total: o.total, profit: profitOf(o), f: 1 }));
}
function vVentas() {
  const R = periodRange(U.ven.period), basis = U.ven.basis;
  const cur = salesIn(R.a, R.b, basis), prev = R.pa ? salesIn(R.pa, R.pb, basis) : null;
  const m = rows => { const t = sum(rows, r => r.total), p = sum(rows, r => r.profit), n = new Set(rows.map(r => r.o.id)).size; return { t, p, n, avg: n ? t / n : 0, mg: t ? p / t : 0 }; };
  const c = m(cur), pv = prev ? m(prev) : null;
  const dl = (a, b) => pv ? delta(a, b, R.cmp) : '';
  /* evolución */
  const span = diffDays(R.b, R.a) + 1;
  const series = [];
  if (span <= 1) { for (let i = 13; i >= 0; i--) { const d = addDays(R.b, -i); const v = sum(salesIn(d, d, basis), r => r.total); series.push({ label: DIAS_C[weekday(d)] + ' ' + new Date(toT(d)).getUTCDate(), v, cls: i === 0 ? 'today' : '', tip: fmtLong(d) + ' · ' + money(v) }); } }
  else if (span <= 45) { for (let d = R.a; d <= R.b; d = addDays(d, 1)) { const v = sum(cur.filter(r => r.date === d), r => r.total); series.push({ label: span > 10 ? String(new Date(toT(d)).getUTCDate()) : DIAS_C[weekday(d)] + ' ' + new Date(toT(d)).getUTCDate(), v, cls: d === TODAY() ? 'today' : weekday(d) === 5 ? 'hi' : '', tip: fmtLong(d) + ' · ' + money(v) + ' · ' + cur.filter(r => r.date === d).length + ' ventas' }); } }
  else { for (let d = R.a; d <= R.b; d = addDays(d, 7)) { const e = addDays(d, 6) > R.b ? R.b : addDays(d, 6); const v = sum(cur.filter(r => r.date >= d && r.date <= e), r => r.total); series.push({ label: fmtDate(d), v, tip: 'Semana del ' + fmtDate(d) + ' · ' + money(v) }); } }
  /* desgloses */
  const by = (keyFn) => { const acc = {}; for (const r of cur) for (const it of r.o.items) { const k = keyFn(it, r.o); acc[k] = (acc[k] || { v: 0, u: 0 }); acc[k].v += it.qty * it.unitPrice * (1 - (r.o.discountPct || 0) / 100) * r.f; acc[k].u += it.qty * r.f; } return acc; };
  const prod = by(it => it.skuId), fl = by(it => skuById(it.skuId).flavor), sz = by(it => skuById(it.skuId).size);
  const ch = {}; for (const r of cur) ch[r.o.channel] = (ch[r.o.channel] || 0) + r.total;
  const prodList = Object.keys(prod).map(k => ({ label: skuById(k).name, v: prod[k].v, sub: Math.round(prod[k].u) + ' u', icon: jar(skuById(k).flavor, 22) })).sort((a, b) => b.v - a.v);
  const flList = Object.keys(fl).map(k => ({ label: FLAVORS[k].name, v: fl[k].v })).sort((a, b) => b.v - a.v);
  const szList = Object.keys(sz).map(k => ({ label: sizeLabel(+k), v: sz[k].v, sub: Math.round(sz[k].u) + ' u' })).sort((a, b) => b.v - a.v);
  const chList = Object.keys(CHANNELS).filter(k => ch[k]).map(k => ({ label: CHANNELS[k], v: ch[k] })).sort((a, b) => b.v - a.v);
  const listRows = cur.slice().sort((a, b) => b.date.localeCompare(a.date) || b.o.number - a.o.number);
  const shown = U.ven.all ? listRows : listRows.slice(0, 15);
  return `<div class="wrap">
  ${pageHead('Ventas', 'Lo que vendiste por día, semana y mes. Elegí si contar por fecha de pedido, de entrega o de cobro.', `<button class="btn primary" data-act="new-order">${ic('plus')}Nuevo pedido</button>`)}
  <div class="toolbar">${seg('ven-p', U.ven.period, [['hoy', 'Hoy'], ['semana', 'Semana'], ['30d', '30 días'], ['mes', 'Mes'], ['todo', 'Todo'], ['rango', 'Rango']])}
    ${seg('ven-b', basis, [['pedido', 'Fecha de pedido'], ['entrega', 'Fecha de entrega'], ['cobro', 'Fecha de cobro']])}</div>
  ${U.ven.period === 'rango' ? `<div class="toolbar"><div class="field"><label for="ven-from">Desde</label><input type="date" class="input" id="ven-from" value="${U.ven.from}" max="${TODAY()}" data-change="ven-from"></div><div class="field"><label for="ven-to">Hasta</label><input type="date" class="input" id="ven-to" value="${U.ven.to}" max="${TODAY()}" data-change="ven-to"></div>${!(U.ven.from && U.ven.to) ? '<span class="hint" style="align-self:end;padding-bottom:12px">Elegí las dos fechas. Mientras tanto se muestra todo el historial.</span>' : ''}</div>` : ''}
  <div class="eyebrow">${esc(R.label)} · ${fmtDate(R.a)} al ${fmtDate(R.b)}</div>
  <div class="grid g-kpi">
    ${kpi({ icon: 'chart', label: basis === 'cobro' ? 'Cobrado' : 'Facturación', value: money(c.t), sub: dl(c.t, pv && pv.t), small: true, bg: 'orange', help: basis === 'cobro' ? 'Plata que efectivamente entró en el período.' : 'Total vendido en el período, con descuentos aplicados. Es lo que facturaste, no lo que ya cobraste.' })}
    ${kpi({ icon: 'leaf', label: 'Ganancia bruta', value: money(c.p), sub: 'margen ' + pctTxt(c.mg) + ' ' + (pv ? '· ' + dl(c.p, pv.p) : ''), small: true, bg: 'sage', help: 'Venta menos costo directo (ingredientes, envase, etiqueta y elaboración). El margen bruto es esa ganancia dividida por la venta. No descuenta gastos fijos.' })}
    ${kpi({ icon: 'orders', label: 'Ventas', value: c.n, sub: dl(c.n, pv && pv.n), help: 'Cantidad de pedidos del período, sin contar los cancelados.' })}
    ${kpi({ icon: 'bag', label: 'Ticket promedio', value: money(c.avg), sub: dl(c.avg, pv && pv.avg), bg: 'cream', small: true, help: 'Lo que gasta en promedio cada pedido: facturación dividida por la cantidad de ventas.' })}
  </div>
  <div class="card"><div class="sec-title"><h2>Evolución de ventas</h2><span class="hint">${span > 45 ? 'Por semana' : span <= 1 ? 'Últimos 14 días' : 'Por día · viernes resaltados'}</span></div>${barChart(series, { label: 'Evolución de ventas' })}</div>
  <div class="grid g2">
    <div class="card"><div class="sec-title"><h2>Productos más vendidos</h2></div>${prodList.length ? hbars(prodList) : emptyBox('Sin ventas en el período.')}</div>
    <div class="card" style="display:flex;flex-direction:column;gap:18px">
      <div><div class="sec-title" style="margin-bottom:4px"><h2>Ventas por canal</h2></div>${chList.length ? stackBar(chList) : emptyBox('Sin datos')}</div>
      <div><div class="sec-title" style="margin-bottom:4px"><h2>Ventas por sabor</h2></div>${flList.length ? stackBar(flList) : emptyBox('Sin datos')}</div>
      <div><div class="sec-title" style="margin-bottom:8px"><h2>Ventas por tamaño</h2></div>${szList.length ? hbars(szList) : emptyBox('Sin datos')}</div>
    </div>
  </div>
  <div class="card"><div class="sec-title"><h2>Detalle</h2><span class="hint">${listRows.length} ${basis === 'cobro' ? 'cobros' : 'ventas'}</span></div><div class="rows">
    ${shown.map(r => `<div class="row click" data-act="order" data-arg="${r.o.id}"><span class="time-tag" style="width:64px;font-size:12px">${fmtDate(r.date)}</span><div class="row-main"><div class="row-title">${esc(clientById(r.o.clientId).name)} <span class="faint" style="font-weight:600">#${r.o.number}</span></div><div class="row-sub">${esc(itemsText(r.o))} · ${CHANNELS[r.o.channel]} · pedido ${fmtDate(r.o.createdAt)} · entrega ${fmtDate(r.o.deliveryDate)}</div></div><div class="row-end"><b>${money(r.total)}</b><span class="hint">ganancia ${money(r.profit)}</span></div></div>`).join('') || emptyBox('No hay ventas en este período.')}
  </div>${listRows.length > 15 ? `<button class="btn ghost block" data-act="ven-all" style="margin-top:8px">${U.ven.all ? 'Mostrar menos' : 'Ver las ' + listRows.length}</button>` : ''}</div>
  </div>`;
}

/* ---------- COBRAR ---------- */
/* ---------- CLIENTES ---------- */
function waMessage(c, st) {
  const first = c.name.split(' ')[0];
  const fav = st.fav ? skuShort(skuById(st.fav)).toLowerCase() : 'yogur';
  if (c.biz) return `Hola! ¿Cómo va? Les escribo de ${S.config.brand}. ¿Armamos el pedido de esta semana? Tenemos elaboración fresca de ${fav}. Si me pasan cantidades, lo dejo reservado.`;
  return `Hola ${first}! ¿Cómo estás? Te escribo de ${S.config.brand} 🌿 La última vez te llevaste ${fav}. ¿Querés que te reserve para esta semana? Hoy tenemos elaboración fresca.`;
}

/* ---------- ESTRATEGIA ---------- */
function calendarEvents() {
  const D = TODAY(), y = +D.slice(0, 4);
  const thirdSunOct = yr => { const d1 = new Date(Date.UTC(yr, 9, 1)).getUTCDay(); return fromT(Date.UTC(yr, 9, 1 + ((7 - d1) % 7) + 14)); };
  const easter = yr => { const a = yr % 19, b = Math.floor(yr / 100), c = yr % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return fromT(Date.UTC(yr, mo - 1, da)); };
  const base = [];
  for (const yr of [y, y + 1]) base.push({ name: 'Navidad', date: yr + '-12-25' }, { name: 'Vuelta a la rutina', date: yr + '-03-02' }, { name: 'Pascuas', date: easter(yr) }, { name: 'Día de la Madre', date: thirdSunOct(yr) });
  const all = base.concat(S.events.map(e => ({ name: e.name, date: e.date, custom: true }))).filter(e => e.date >= addDays(D, -3)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  return all.map(e => {
    const steps = [[-30, 'Preparar stock y fotos'], [-21, 'Publicar orgánico'], [-14, 'Arrancar publicidad'], [-7, 'Escalar lo que funcione'], [-2, 'Último día para pedidos'], [0, e.name]].map(([o, l]) => ({ date: addDays(e.date, o), label: l }));
    return Object.assign(e, { steps, next: steps.find(s => s.date >= D) });
  });
}

const VIEWS = { bienvenida: vBienvenida, inicio: vInicio, pedidos: vPedidos, produccion: vProduccion, envios: vEnvios, inventario: vInventario, ventas: vVentas, cobrar: vCobrar, clientes: vClientes, estrategia: vEstrategia };
