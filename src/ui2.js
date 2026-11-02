'use strict';
/* =====================================================================
   ui2.js — segunda versión de las vistas (excepto Pedidos, que no se toca).
   Colores funcionales: naranja = ventas, salvia/verde = ganancia y disponible,
   azul = logística, ámbar = pendiente, rojo suave = atrasado o vencido.
   ===================================================================== */

/* ---------- Gri: mascota ---------- */
function griMascot(size) {
  return `<svg class="mascot" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M48 10l4-5M53 16l6-2M51 22l6 1" stroke="var(--brand)" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M13 29h38l-4.5 26.5a4 4 0 0 1-4 3.3H21.5a4 4 0 0 1-4-3.3z" fill="var(--yog)" stroke="#4A2412" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M11 30c-1-6 4-10 9-9 1-7 9-10 14-6 5-3 13 0 13 7 4 1 6 4 5 8z" fill="#FFFDF8" stroke="#4A2412" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M23 39q2.5 2.5 5 0M36 39q2.5 2.5 5 0" stroke="#4A2412" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M29.5 43.5q2.5 2 5 0" stroke="#4A2412" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="21" cy="43" r="2.1" fill="#F94901" opacity=".35"/><circle cx="43" cy="43" r="2.1" fill="#F94901" opacity=".35"/>
  <text x="32" y="54" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="800" font-size="8" fill="#E24300">Gri</text></svg>`;
}
const griAvatar = cls => `<span class="gri-av ${cls || ''}" aria-hidden="true">${griMascot(cls === 'xl' ? 104 : cls === 'lg' ? 52 : cls === 'md' ? 44 : cls === 'sm' ? 28 : 36)}</span>`;
const griBanner = (text, tone, dismiss) => `<div class="gri-banner tone-${tone || 'brand'}">${griAvatar('md')}<div class="gb-main"><div class="gb-name">Gri <span>Tu asistente en ${esc(S.config.brand)}</span></div><p>${text}</p></div>${dismiss ? `<button class="btn icon sm ghost" data-act="${dismiss}" aria-label="Ocultar">${ic('x', 'sm')}</button>` : ''}</div>`;

/* ---------- Ayuda contextual ---------- */
const helpTip = (t, label) => `<details class="qhelp"><summary aria-label="${esc(label || '¿Qué significa?')}" title="${esc(label || '¿Qué significa?')}">?</summary><p>${t}</p></details>`;
const howTip = (t, label) => `<details class="how"><summary>${ic('info', 'sm')}${esc(label || '¿Cómo lo calculamos?')}</summary><p>${t}</p></details>`;

/* ---------- KPI con color funcional ---------- */
const kpi = (o) => `<div class="card kpi ${o.bg ? 'bg-' + o.bg : ''} ${o.go ? 'click' : ''}" ${o.go ? `data-act="go" data-arg="${o.go}"` : ''}>
  <div class="k-top"><span class="k-ico ${o.tone || ''}">${ic(o.icon)}</span><span class="k-label">${o.label}</span>${o.help ? helpTip(o.help) : ''}</div>
  <div class="k-val ${o.small ? 'sm' : ''}">${o.value}</div><div class="k-sub">${o.sub || ''}</div></div>`;

/* ---------- Estados como píldoras ---------- */
function prodPill(o) {
  if (o.cancelled) return '<span class="pill">Cancelado</span>';
  const m = { por_elaborar: ['terra', 'pot', 'Por elaborar'], en_produccion: ['amber', 'clock', 'En producción'], listo: ['green', 'check', 'Producto listo'], entregado: ['green', 'check', 'Entregado'] }[o.status];
  return `<span class="pill p-${m[0]}">${ic(m[1], 'sm')}${m[2]}</span>`;
}
function shipPill(o) {
  if (!o.ship) return `<span class="pill">${ic('store', 'sm')}Retira en el local</span>`;
  if (o.ship.incident) return `<span class="pill p-red">${ic('alert', 'sm')}Incidencia</span>`;
  const via = o.delivery === 'uber' ? 'Uber' : 'Envío';
  const m = { pendiente: ['blue-l', 'car', via + ' sin solicitar'], solicitado: ['blue', 'users', 'Conductor asignado'], en_camino: ['blue', 'truck', 'En camino'], entregado: ['green', 'check', 'Entregado'] }[o.ship.status];
  return `<span class="pill p-${m[0]}">${ic(m[1], 'sm')}${m[2]}</span>`;
}
function payPill(o) {
  const st = payState(o);
  if (st === 'pagado') return `<span class="pill p-green">${ic('check', 'sm')}Pago confirmado</span>`;
  if (st === 'parcial') return `<span class="pill p-amber">${ic('wallet', 'sm')}Debe ${money(balanceOf(o))}</span>`;
  if (st === 'cancelado') return '<span class="pill">Cancelado</span>';
  return `<span class="pill p-amber">${ic('wallet', 'sm')}Pago pendiente · ${o.payMethod}</span>`;
}

/* =====================================================================
   ENVÍOS
   ===================================================================== */
function envBannerText(list) {
  const D = TODAY();
  const inc = list.find(o => o.ship.incident);
  if (inc) return `Primero resolvamos el envío de ${B(fname(clientById(inc.clientId)))}: tuvo un problema (${esc(inc.ship.incident.type.toLowerCase())}).`;
  const ready = list.filter(o => o.ship.status === 'pendiente' && o.status === 'listo');
  if (ready.length) { const o = ready[0]; return `Primero coordinemos el ${o.delivery === 'uber' ? 'Uber' : 'envío'} de ${B(fname(clientById(o.clientId)))}. Su pedido ya está listo y sale a las ${slotStart(o.slot)}.${ready.length > 1 ? ` Después siguen ${ready.length - 1} más.` : ''}`; }
  const asg = list.find(o => o.ship.status === 'solicitado');
  if (asg) return `${esc(asg.ship.driver)} ya está asignado para el pedido de ${B(fname(clientById(asg.clientId)))}. Cuando lo retire, registrá el retiro.`;
  const way = list.find(o => o.ship.status === 'en_camino');
  if (way) return `El pedido de ${B(fname(clientById(way.clientId)))} está en camino. Cuando te confirmen, marcá la entrega.`;
  if (list.some(o => o.ship.status === 'pendiente')) return 'Todavía no hay pedidos listos para salir. Los próximos están en preparación.';
  return list.length ? 'Todos los envíos de este día están entregados.' : 'No hay envíos para este día.';
}
function vEnvios() {
  const D = TODAY();
  const date = U.env.date === 'hoy' ? D : U.env.date === 'manana' ? addDays(D, 1) : U.env.date;
  const all = S.orders.filter(o => !o.cancelled && o.ship && o.deliveryDate === date).sort((a, b) => a.slot.localeCompare(b.slot) || a.number - b.number);
  const pend = all.filter(o => o.ship.status === 'pendiente');
  const k = { req: pend.filter(o => o.status === 'listo').length, notReady: pend.filter(o => o.status !== 'listo').length, asg: all.filter(o => o.ship.status === 'solicitado').length, way: all.filter(o => o.ship.status === 'en_camino').length, done: all.filter(o => o.ship.status === 'entregado').length, inc: all.filter(o => o.ship.incident).length };
  const active = all.filter(o => o.ship.status !== 'entregado'), done = all.filter(o => o.ship.status === 'entregado');
  return `<div class="wrap env">
  ${pageHead('Envíos', 'Coordiná y seguí las entregas del día.', `<button class="btn" data-act="copy-route">${ic('route')}Copiar hoja de ruta</button>`)}
  <div class="toolbar">${seg('env-date', U.env.date === 'hoy' || U.env.date === 'manana' ? U.env.date : 'otro', [['hoy', 'Hoy'], ['manana', 'Mañana']])}
    <input type="date" class="input" id="env-day" style="width:auto;height:40px" value="${date}" data-change="env-day" aria-label="Elegir día"><span class="muted">${fmtLong(date)}</span></div>
  <div class="grid g-kpi5">
    ${kpi({ icon: 'boxes', label: 'Por solicitar', value: k.req, sub: k.notReady ? k.notReady + ' todavía en preparación' : 'listos para pedir', bg: 'blue' })}
    ${kpi({ icon: 'car', label: 'Conductor asignado', value: k.asg, sub: 'esperando retiro', bg: 'blue' })}
    ${kpi({ icon: 'truck', label: 'En camino', value: k.way, sub: 'retirados del local', bg: 'blue' })}
    ${kpi({ icon: 'check', label: 'Entregados', value: k.done, sub: all.length ? 'de ' + all.length + ' del día' : '—', bg: 'green' })}
    ${kpi({ icon: 'alert', label: 'Incidencias', value: k.inc, sub: k.inc ? 'para resolver' : 'sin problemas', bg: k.inc ? 'red' : 'cream' })}
  </div>
  ${U.env.hideGri ? '' : griBanner(envBannerText(all), 'blue', 'env-hide-gri')}
  <div class="sec-title" style="margin:4px 0 -6px;flex-wrap:wrap"><h2 class="big-h2">Hoja de entregas ${date === D ? '<i>de hoy</i>' : ''}</h2><span class="muted">${all.length} programadas · ${pend.length} sin solicitar · ${k.way} en camino</span></div>
  ${active.map(shipCard).join('') || emptyBox('No quedan envíos pendientes para este día.')}
  ${done.length ? `<button class="btn ghost" data-act="env-done" style="align-self:flex-start">${U.env.showDone ? 'Ocultar' : 'Ver'} ${done.length} ${done.length === 1 ? 'entregado' : 'entregados'}</button>${U.env.showDone ? done.map(shipCard).join('') : ''}` : ''}
  <div class="note-box">${ic('info')}<p>Cada pedido tiene tres estados separados: el producto, el viaje y el cobro. Pedir un Uber no marca el pedido como entregado. Esta versión no está conectada a Uber: el viaje se pide afuera y acá se registra a mano.</p></div>
  </div>`;
}
function shipCard(o) {
  const c = clientById(o.clientId), a = orderAddr(o), s = o.ship, bal = balanceOf(o);
  const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a.address + ', ' + a.barrio + ', CABA');
  const st = s.incident ? 'red' : s.status === 'entregado' ? 'green' : s.status === 'pendiente' ? (o.status === 'listo' ? 'orange' : 'grey') : 'blue';
  let primary = '';
  if (s.status === 'pendiente') primary = o.status === 'listo' ? `<button class="btn primary block" data-act="ship-assign" data-arg="${o.id}">${ic('car', 'sm')}Registrar conductor</button>` : `<button class="btn block" disabled>${ic('clock', 'sm')}Esperando producción</button>`;
  else if (s.status === 'solicitado') primary = `<button class="btn primary block" data-act="ship-pickup" data-arg="${o.id}">${ic('truck', 'sm')}Registrar retiro</button>`;
  else if (s.status === 'en_camino') primary = `<button class="btn ok block" data-act="ship-deliver" data-arg="${o.id}">${ic('check', 'sm')}Confirmar entrega</button>`;
  const trip = s.driver ? `<div class="trip">${ic(s.status === 'en_camino' ? 'truck' : 'car', 'sm')}<div><b>${s.status === 'entregado' ? 'Entregado' + (s.deliveredAt ? ' ' + s.deliveredAt : '') : s.status === 'en_camino' ? 'En camino' : 'Conductor asignado'}</b><span>${esc(s.driver)}${s.tripRef ? ' · ' + esc(s.tripRef) : ''}</span>${s.pickedAt ? `<span>Retiró ${s.pickedAt}</span>` : s.requestedAt ? `<span>Pedido ${s.requestedAt}</span>` : ''}</div></div>` : '';
  const sec = [
    `<button class="btn sm" title="Copiar dirección" data-act="copy-addr" data-arg="${o.id}">${ic('copy', 'sm')}Dirección</button>`,
    c.phone ? `<button class="btn sm" title="Copiar teléfono" data-act="copy-phone" data-arg="${c.id}">${ic('phone', 'sm')}Teléfono</button>` : '',
    `<a class="btn sm" href="${maps}" target="_blank" rel="noopener">${ic('pin', 'sm')}Maps</a>`,
    s.status !== 'entregado' ? `<button class="btn sm" title="Copiar datos para pedir el viaje" data-act="copy-ship" data-arg="${o.id}">${ic('copy', 'sm')}Datos ${o.delivery === 'uber' ? 'Uber' : 'envío'}</button>` : '',
    s.status === 'pendiente' && o.delivery === 'uber' ? `<a class="btn sm" href="https://m.uber.com/looking" target="_blank" rel="noopener" data-act="uber" data-arg="${o.id}">${ic('external', 'sm')}Pedir Uber</a>` : '',
    bal > 0 ? `<button class="btn sm" data-act="pay" data-arg="${o.id}">${ic('cash', 'sm')}Cobrar</button>` : '',
    s.status !== 'entregado' ? `<button class="btn sm ghost" data-act="ship-incident" data-arg="${o.id}">${ic('alert', 'sm')}Incidencia</button>` : '',
  ].filter(Boolean).join('');
  return `<article class="ship2 st-${st}">
    <div class="s-client">
      <div class="s-name"><h3>${esc(c.name)}</h3><button class="chip info" data-act="order" data-arg="${o.id}">#${o.number}</button></div>
      <div class="s-line">${ic('calendar', 'sm')}<span><b>${relDay(o.deliveryDate)}, ${o.slot}</b></span></div>
      <div class="s-line">${ic('pin', 'sm')}<span>${esc(a.address)}<br><span class="faint">${esc(a.barrio)}${a.ref ? ' · ' + esc(a.ref) : ''}</span></span></div>
      <div class="s-line">${ic('phone', 'sm')}<span class="num">${esc(c.phone || 'Sin teléfono')}</span></div>
    </div>
    <div class="s-prod"><div class="s-lbl">Productos</div>${o.items.map(it => `<div class="s-item">${jar(skuById(it.skuId).flavor, 22)}<span>${it.qty} × ${esc(skuShort(skuById(it.skuId)))}${it.toppings.length ? ' <span class="faint">+ ' + it.toppings.map(t => esc(TOPPINGS[t].name.toLowerCase())).join(', ') + '</span>' : ''}</span></div>`).join('')}
      <div class="s-lbl" style="margin-top:8px">Envío</div><div class="faint" style="font-size:12.5px">${DELIVERY[o.delivery]} · ${money(o.shipCost)} a cargo del ${o.shipPaidBy === 'negocio' ? 'negocio' : 'cliente'}</div>
      ${o.notes ? `<div class="oc-note" style="margin-top:8px">${esc(o.notes)}</div>` : ''}</div>
    <div class="s-states"><div class="s-lbl">Estados</div>${prodPill(o)}${shipPill(o)}${payPill(o)}
      ${s.incident ? `<div class="incident">${ic('alert', 'sm')}<span>${esc(s.incident.type)}${s.incident.note ? ': ' + esc(s.incident.note) : ''}</span><button class="btn sm" data-act="ship-resolve" data-arg="${o.id}">Resolver</button>${s.status !== 'entregado' ? `<button class="btn sm" data-act="ship-retry" data-arg="${o.id}">Reprogramar</button>` : ''}</div>` : ''}</div>
    <div class="s-acts">${trip}${primary}<div class="s-sec">${sec}</div></div>
  </article>`;
}

/* =====================================================================
   PRODUCCIÓN — pestaña "Qué producir hoy"
   ===================================================================== */
function prodHoy() {
  const plan = productionPlan();
  const forOrders = sum(plan, p => p.forOrders), forStock = sum(plan, p => p.forStock);
  const orderRows = plan.filter(p => p.missing > 0);
  const stockRows = plan.filter(p => p.forStock > 0);
  const active = S.prodOrders.filter(p => p.status === 'en_curso' || p.status === 'programada').sort((a, b) => a.date.localeCompare(b.date));
  const doneToday = S.prodOrders.filter(p => p.status === 'finalizada' && p.date === TODAY());
  const msg = forOrders ? `Te faltan ${B(forOrders + ' ' + pl(forOrders, 'yogur', 'yogures'))} para cubrir pedidos${forStock ? ` y podés preparar ${forStock} más para reponer stock` : ''}.`
    : forStock ? `Los pedidos están cubiertos. Si querés, podés preparar ${B(forStock + ' ' + pl(forStock, 'unidad', 'unidades'))} para reponer stock.`
      : orderRows.length ? 'Los pedidos que esperan stock quedan cubiertos con lo que ya está en producción.' : 'No hace falta producir nada hoy: el stock y lo que está en marcha cubren todo.';
  const ex = orderRows[0];
  const how = ex ? `Tomamos los pedidos confirmados que todavía no salieron (${ex.confirmed} de ${esc(skuShort(ex.sku))}) y restamos lo que ya está reservado para ellos (${ex.reserved}). Lo reservado sale del stock que ya tenés, empezando por el lote que vence primero. Lo que queda sin cubrir (${ex.missing}) menos lo que ya está en producción (${ex.scheduled}) es lo que falta: ${B(ex.forOrders)}. La reposición se calcula aparte: comparamos lo que te queda disponible con el stock mínimo que configuraste.`
    : 'Tomamos los pedidos confirmados, restamos lo que ya está reservado del stock y lo que ya está en producción. Lo que queda es lo que falta producir. La reposición se calcula aparte con tu stock mínimo.';
  return `${griBanner(msg, 'brand')}
  <div class="grid g2">
    <section class="card need-card">
      <div class="nc-head nc-orange"><span class="nc-ico">${ic('pot')}</span><div><h2>Necesario para pedidos</h2><p>Lo que hay que producir para cumplir los pedidos confirmados.</p></div></div>
      ${orderRows.length ? `<div class="ptable"><div class="pt-h"><span>Producto</span><span>Pedidos</span><span>Reservado</span><span>En producción</span><span>Faltan</span></div>
        ${orderRows.map(p => `<div class="pt-r"><span class="pt-name">${jar(p.sku.flavor, 30)}<b>${esc(p.sku.name)}</b></span><span data-l="Pedidos">${p.confirmed}</span><span data-l="Reservado">${p.reserved}</span><span data-l="En producción">${p.scheduled}</span><span data-l="Faltan">${p.forOrders ? `<em class="hl">${p.forOrders}</em>` : '<span class="chip good">Cubierto</span>'}</span></div>`).join('')}</div>`
        : `<div class="empty">Todos los pedidos confirmados tienen stock reservado.</div>`}
      ${howTip(how, '¿Cómo calculamos esta cantidad?')}
      <div class="nc-acts"><button class="btn primary" data-act="gri-prodlist" data-arg="pedidos" ${forOrders ? '' : 'disabled'}>${ic('plus', 'sm')}Crear orden de producción</button><button class="btn" data-act="gri-ingredients">${ic('orders', 'sm')}Ver ingredientes necesarios</button></div>
    </section>
    <section class="card need-card">
      <div class="nc-head nc-cream"><span class="nc-ico">${ic('boxes')}</span><div><h2>Reposición opcional</h2><p>Producción extra sugerida para mantener tu stock mínimo. No es obligatoria.</p></div></div>
      ${stockRows.length ? `<div class="ptable pt3"><div class="pt-h"><span>Producto</span><span>Disponible</span><span>Stock mínimo</span><span>Sugerido</span></div>
        ${stockRows.map(p => `<div class="pt-r"><span class="pt-name">${jar(p.sku.flavor, 30)}<b>${esc(p.sku.name)}</b></span><span data-l="Disponible">${p.free}</span><span data-l="Mínimo">${p.sku.min}</span><span data-l="Sugerido"><em class="hl soft">${p.forStock}</em></span></div>`).join('')}</div>
        <p class="hint">Además de lo de los pedidos, podrías producir ${forStock} ${pl(forStock, 'unidad', 'unidades')} para reponer tu stock.</p>
        <div class="nc-acts"><button class="btn" data-act="gri-prodlist" data-arg="stock">${ic('plus', 'sm')}Agregar reposición</button></div>`
        : `<div class="empty">Tu stock está por encima del mínimo en todos los productos.</div>`}
    </section>
  </div>
  <div class="sec-title" style="margin:6px 0 -4px"><h2>Órdenes en marcha</h2><span class="hint">Etapas: ${STAGES.join(' → ')}</span></div>
  <div class="grid g2">${active.map(poCard).join('') || emptyBox('No hay órdenes en curso ni programadas.')}</div>
  ${doneToday.length ? `<div class="sec-title" style="margin:6px 0 -4px"><h2>Terminadas hoy</h2></div><div class="grid g2">${doneToday.map(poCard).join('')}</div>` : ''}`;
}

/* =====================================================================
   INVENTARIO
   ===================================================================== */
function vInventario() {
  const t = U.inv.tab;
  return `<div class="wrap">
  ${pageHead('Inventario', 'Lo que tenés para vender, lo reservado para pedidos y tus insumos.', t === 'insumos' ? `<button class="btn primary" data-act="ins-buy">${ic('plus')}Registrar compra</button>` : `<button class="btn" data-act="import" data-arg="stock">${ic('up', 'sm')}Importar stock</button>`)}
  ${seg('inv-tab', t, [['productos', 'Productos terminados'], ['insumos', 'Materias primas e insumos'], ['movimientos', 'Movimientos']])}
  ${t === 'productos' ? invProductos() : t === 'insumos' ? invInsumos() : invMovs()}</div>`;
}
function invProductos() {
  const st = S.skus.map(s => ({ s, k: skuStock(s.id) }));
  const tot = { free: sum(st, x => x.k.free), res: sum(st, x => x.k.reserved), soon: sum(st, x => x.k.soon), exp: sum(st, x => x.k.expired) };
  const stateOf = (s, k) => k.expired ? '<span class="pill p-red">Hay vencidos</span>' : k.soon ? '<span class="pill p-amber">Por vencer</span>' : k.free < s.min ? '<span class="pill p-terra">Stock bajo</span>' : '<span class="pill p-green">Disponible</span>';
  return `<div class="grid g-kpi">
    ${kpi({ icon: 'boxes', label: 'Disponible para vender', value: tot.free, sub: 'sin reservar y sin vencer', bg: 'sage', help: 'Unidades que podés ofrecer ya: no están apartadas para ningún pedido y no vencieron.' })}
    ${kpi({ icon: 'orders', label: 'Reservado', value: tot.res, sub: 'apartado para pedidos', bg: 'blue', help: 'Productos reservados para pedidos: ya tienen dueño. Salen del lote que vence primero.' })}
    ${kpi({ icon: 'clock', label: 'Próximo a vencer', value: tot.soon, sub: 'vence en 3 días o menos', bg: 'amber' })}
    ${kpi({ icon: 'x', label: 'Vencido', value: tot.exp, sub: 'no se entrega nunca', bg: 'red' })}
  </div>
  <section class="card inv-list">
    <div class="sec-title"><h2>Productos</h2><span class="hint">Tocá un producto para ver sus lotes</span></div>
    <div class="inv-h"><span>Producto</span><span>Existencia</span><span>Reservado</span><span>Disponible</span><span>Estado</span></div>
    ${st.map(({ s, k }) => {
    const lots = S.lots.filter(l => l.skuId === s.id && (l.qty > 0 || diffDays(TODAY(), l.made) <= 25)).sort((a, b) => a.expires.localeCompare(b.expires));
    return `<details class="inv-item"><summary><span class="ii-name">${jar(s.flavor, 34)}<span><b>${esc(s.name)}</b><small>mínimo ${s.min} · vida útil ${s.shelf} días</small></span></span><span data-l="Existencia">${k.physical + k.expired}</span><span data-l="Reservado">${k.reserved}</span><span data-l="Disponible"><b>${k.free}</b></span><span>${stateOf(s, k)}</span>${ic('chev', 'sm ii-chev')}</summary>
      <div class="ii-lots">${lots.length ? `<div class="tbl-wrap"><table class="lot-table resp"><thead><tr><th>Lote</th><th>Elaboración</th><th>Vencimiento</th><th class="r">Existencia</th><th class="r">Reservado</th><th class="r">Disponible</th><th>Estado</th><th></th></tr></thead><tbody>
      ${lots.map(l => { const res = l.expires >= TODAY() ? lotReserved(l) : 0; const free = l.expires >= TODAY() ? l.qty - res : 0; const canOff = l.qty > 0 && (l.expires < TODAY() ? l.qty : free) > 0; return `<tr><td data-l="Lote"><b>${esc(l.code)}</b></td><td data-l="Elaboración">${fmtDate(l.made)}</td><td data-l="Vence">${fmtDate(l.expires)} <span class="faint">(${l.expires < TODAY() ? 'hace ' + diffDays(TODAY(), l.expires) + ' d' : diffDays(l.expires, TODAY()) === 0 ? 'hoy' : 'en ' + diffDays(l.expires, TODAY()) + ' d'})</span></td><td class="r" data-l="Existencia">${l.qty}</td><td class="r" data-l="Reservado">${res}</td><td class="r" data-l="Disponible"><b>${free}</b></td><td data-l="Estado">${lotChip(l)}</td><td class="r" data-l="">${canOff ? `<button class="btn sm ghost" data-act="lot-off" data-arg="${l.id}">Dar de baja</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>` : emptyBox('Sin lotes. Creá una orden de producción o importá tu stock inicial.')}</div></details>`;
  }).join('')}
  </section>`;
}
function moveSentence(m) {
  const qa = Math.abs(m.qty);
  if (m.kind === 'insumo') {
    const i = insById(m.insumoId), q = fmtN(qa) + ' ' + i.unit + ' de ' + i.name.toLowerCase();
    return { compra: ['good', 'up', 'Compraste ' + q], consumo: ['', 'pot', 'Se usaron ' + q], desperdicio: ['bad', 'trash', 'Se descartaron ' + q], ajuste: ['info', 'edit', 'Cambió el costo de ' + i.name.toLowerCase()] }[m.type] || ['', 'info', m.type];
  }
  const s = skuById(m.skuId), nm = s ? skuShort(s) : 'producto', r = Math.abs(m.resQty || 0);
  return {
    produccion: ['good', 'up', `${qa === 1 ? 'Ingresó' : 'Ingresaron'} ${qa} ${pl(qa, 'unidad', 'unidades')} de ${nm}`],
    reserva: ['info', 'orders', `${r === 1 ? 'Se reservó' : 'Se reservaron'} ${r} ${pl(r, 'unidad', 'unidades')} de ${nm}`],
    libera: ['info', 'refresh', `${r === 1 ? 'Se liberó' : 'Se liberaron'} ${r} ${pl(r, 'unidad', 'unidades')} de ${nm}`],
    salida: ['', 'truck', `${qa === 1 ? 'Se entregó' : 'Se entregaron'} ${qa} ${pl(qa, 'unidad', 'unidades')} de ${nm}`],
    baja: ['bad', 'trash', `${qa === 1 ? 'Se dio de baja' : 'Se dieron de baja'} ${qa} ${pl(qa, 'unidad', 'unidades')} de ${nm}`],
  }[m.type] || ['', 'info', m.type];
}
function invMovs() {
  const f = U.inv.mv;
  let list = S.moves;
  if (f === 'insumos') list = list.filter(m => m.kind === 'insumo');
  else if (f === 'productos') list = list.filter(m => m.kind === 'producto');
  else if (f !== 'todos') list = list.filter(m => m.insumoId === f || m.skuId === f);
  return `<div class="toolbar"><select class="input" style="width:auto" id="mv-f" data-change="mv-f" aria-label="Filtrar movimientos">
    <option value="todos">Todos los movimientos</option><option value="productos" ${f === 'productos' ? 'selected' : ''}>Solo productos terminados</option><option value="insumos" ${f === 'insumos' ? 'selected' : ''}>Solo insumos</option>
    <optgroup label="Producto">${S.skus.map(s => `<option value="${s.id}" ${f === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>
    <optgroup label="Insumo">${S.insumos.map(i => `<option value="${i.id}" ${f === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</optgroup></select><span class="muted">${list.length} movimientos</span>${helpTip('Cada cambio de stock queda registrado: qué pasó, cuándo y por qué pedido, lote o compra. Así siempre podés entender por qué cambió una cantidad.')}</div>
  <div class="card"><div class="rows">${list.slice(0, 150).map(m => { const [tone, icon, txt] = moveSentence(m); return `<div class="row mv"><span class="mv-ico t-${tone || 'none'}">${ic(icon, 'sm')}</span><div class="row-main"><div class="row-title" style="font-weight:600">${esc(txt)}</div><div class="row-sub">${esc(m.note || '')}</div></div><div class="row-end"><span class="hint">${relDay(m.date)} ${m.time || ''}</span></div></div>`; }).join('') || emptyBox('Sin movimientos.')}</div></div>`;
}

/* =====================================================================
   COBRAR
   ===================================================================== */
function vCobrar() {
  const D = TODAY(), monday = addDays(D, -((weekday(D) + 6) % 7));
  const owed = S.orders.filter(o => balanceOf(o) > 0);
  const late = owed.filter(o => o.deliveryDate < D).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  const partial = owed.filter(o => paidOf(o) > 0 && !late.includes(o));
  const onDelivery = owed.filter(o => !late.includes(o) && !partial.includes(o)).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.slot.localeCompare(b.slot));
  const payToday = S.payments.filter(p => p.date === D), payWeek = S.payments.filter(p => p.date >= monday && p.date <= D);
  const row = (o, extra) => { const c = clientById(o.clientId), paid = paidOf(o); return `<div class="pay-row"><div class="row-main"><div class="row-title"><button class="linklike" data-act="order" data-arg="${o.id}">${esc(c.name)} <span class="faint">#${o.number}</span></button> ${extra || ''}</div><div class="row-sub">${esc(itemsText(o))} · entrega ${relDay(o.deliveryDate).toLowerCase()} · ${STATUS[o.status].toLowerCase()} · ${o.payMethod}</div>${paid ? `<div class="paid-bar"><div class="prog good"><i style="width:${Math.round(paid / o.total * 100)}%"></i></div><span class="hint">Pagó ${money(paid)} de ${money(o.total)}</span></div>` : ''}</div><div class="pay-end"><b class="amt">${money(balanceOf(o))}</b><button class="btn sm primary" data-act="pay" data-arg="${o.id}">Registrar cobro</button></div></div>`; };
  const hist = S.payments.filter(p => U.cob.hist === 'todos' || p.method === U.cob.hist).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 30);
  const block = (tone, title, total, help, body) => `<section class="card pay-block pb-${tone}"><div class="pb-head"><div><h2>${title}</h2>${help ? `<p>${help}</p>` : ''}</div><b class="pb-total">${money(total)}</b></div><div class="rows">${body}</div></section>`;
  return `<div class="wrap">
  ${pageHead('Cobrar', 'Lo que te deben y lo que ya entró. Cobrar y entregar son procesos separados.')}
  <div class="grid g-kpi">
    ${kpi({ icon: 'wallet', label: 'Pendiente de cobrar', value: money(sum(owed, balanceOf)), sub: owed.length + ' pedidos con saldo', bg: 'amber', small: true, help: 'Todo lo que te deben, de pedidos entregados o por entregar. No incluye pedidos cancelados.' })}
    ${kpi({ icon: 'cash', label: 'Cobraste hoy', value: money(sum(payToday, p => p.amount)), sub: payToday.length + ' cobros', bg: 'green', small: true })}
    ${kpi({ icon: 'calendar', label: 'Cobraste esta semana', value: money(sum(payWeek, p => p.amount)), sub: 'desde el lunes ' + fmtDate(monday), bg: 'green', small: true })}
    ${kpi({ icon: 'alert', label: 'Atrasados', value: money(sum(late, balanceOf)), sub: late.length + ' pedidos de días anteriores', bg: 'red', small: true })}
  </div>
  <div class="grid g-main">
    <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
      ${block('red', 'Atrasados', sum(late, balanceOf), 'Entregas de días anteriores que todavía no se cobraron.', late.map(o => row(o, `<span class="chip ${diffDays(D, o.deliveryDate) > 5 ? 'bad' : 'warn'}">${ago(o.deliveryDate)}</span>`)).join('') || emptyBox('No hay deudas atrasadas.'))}
      ${block('amber', 'Señas y pagos parciales', sum(partial, balanceOf), 'Pagaron una parte. Cuando entra el resto, el pedido queda saldado.', partial.map(o => row(o)).join('') || emptyBox('No hay pagos parciales abiertos.'))}
      ${block('amber', 'A cobrar en la entrega', sum(onDelivery, balanceOf), 'Pedidos de hoy en adelante que todavía no pagaron.', onDelivery.map(o => row(o)).join('') || emptyBox('No hay pedidos pendientes de cobro.'))}
    </div>
    <section class="card pay-block pb-green"><div class="pb-head"><div><h2>Cobrado</h2><p>Lo que ya entró, por fecha de cobro.</p></div></div>
      <div style="margin-bottom:8px">${seg('cob-h', U.cob.hist, [['todos', 'Todos'], ['efectivo', 'Efectivo'], ['transferencia', 'Transferencia']])}</div>
      <div class="rows">${hist.map(p => { const o = orderById(p.orderId); return `<div class="row click" data-act="order" data-arg="${o.id}"><div class="row-main"><div class="row-title">${esc(clientById(o.clientId).name)} <span class="faint" style="font-weight:600">#${o.number}</span></div><div class="row-sub">${relDay(p.date)} ${p.time} · ${p.kind} · ${p.method}</div></div><b class="amt" style="color:var(--good)">+${money(p.amount)}</b></div>`; }).join('') || emptyBox('Sin cobros.')}</div></section>
  </div></div>`;
}

/* =====================================================================
   CLIENTES
   ===================================================================== */
const tagChip = t => `<span class="chip ${t === 'vip' ? 'terra' : t === 'recompra' ? 'sage' : t === 'inactivo' ? '' : t === 'nuevo' ? 'info' : 'good'}">${TAGS[t]}</span>`;
function vClientes() {
  computeVip();
  const all = S.clients.map(c => { const st = clientStats(c); return { c, st, tags: clientTags(c, st) }; });
  const counts = {}; for (const x of all) for (const t of x.tags) counts[t] = (counts[t] || 0) + 1;
  const q = U.cli.q.toLowerCase(), qd = q.replace(/\D/g, '');
  const list = all.filter(x => (U.cli.tag === 'todos' || x.tags.includes(U.cli.tag)) && (!q || x.c.name.toLowerCase().includes(q) || (qd && (x.c.phone || '').replace(/\D/g, '').includes(qd)))).sort((a, b) => b.st.total - a.st.total);
  return `<div class="wrap">
  ${pageHead('Clientes', 'Quién te compra, cada cuánto y qué. Las etiquetas se calculan solas con el historial.', `<button class="btn" data-act="import" data-arg="clientes">${ic('up', 'sm')}Importar desde Excel</button>`)}
  <div class="toolbar"><label class="search">${ic('search')}<input id="cli-q" type="search" placeholder="Buscar por nombre o teléfono" value="${esc(U.cli.q)}" data-input="cli-q" aria-label="Buscar clientes"></label>
  ${seg('cli-tag', U.cli.tag, [['todos', 'Todos <span class="badge">' + all.length + '</span>'], ...Object.keys(TAGS).map(t => [t, TAGS[t] + ' <span class="badge">' + (counts[t] || 0) + '</span>'])])}</div>
  <div class="card"><div class="rows">${list.map(({ c, st, tags }) => `<div class="row cli-row click" data-act="client" data-arg="${c.id}"><span class="cl-av ${c.biz ? 'biz' : ''}">${initials(c.name)}</span><div class="row-main"><div class="row-title">${esc(c.name)} ${tags.map(tagChip).join('')}</div><div class="row-sub">${st.count} ${st.count === 1 ? 'compra' : 'compras'}${st.last ? ' · última ' + ago(st.last) : ''}${st.every ? ' · cada ~' + st.every + ' días' : ''}${st.fav ? ' · le gusta ' + esc(skuShort(skuById(st.fav))) : ''}</div></div><div class="row-end"><b>${money(st.total)}</b>${st.balance > 0 ? `<span class="chip warn">Debe ${money(st.balance)}</span>` : ''}</div><div class="cli-acts"><button class="btn sm ghost" data-act="client" data-arg="${c.id}">${ic('history', 'sm')}Historial</button><button class="btn sm ghost" data-act="copy-wa" data-arg="${c.id}">${ic('msg', 'sm')}Mensaje</button></div></div>`).join('') || emptyBox('No hay clientes con ese filtro.')}</div></div>
  </div>`;
}
function openClient(id) {
  computeVip();
  const c = clientById(id), st = clientStats(c), tags = clientTags(c, st);
  const sugg = tags.includes('recompra') ? `Suele comprar cada ~${st.every} días y su última compra fue ${ago(st.last)}. Podrías consultarle si necesita reponer.`
    : tags.includes('inactivo') ? `No compra desde ${ago(st.last)}. Un mensaje con una novedad puede reactivarla.`
      : tags.includes('nuevo') ? 'Es cliente nuevo. Escribile después de la entrega para saber qué le pareció.'
        : st.hasOpen ? 'Tiene un pedido en curso.' : st.every ? `Suele comprar cada ~${st.every} días. La próxima compra sería alrededor del ${fmtDate(addDays(st.last, st.every))}.` : 'Todavía no hay suficiente historial para estimar su frecuencia.';
  const msg = waMessage(c, st);
  openModal(mHead(esc(c.name), `${esc(c.phone || 'Sin teléfono')} · ${esc([c.address, c.barrio].filter(Boolean).join(', ') || 'Sin dirección')}`) + `<div class="m-body">
    <div class="chips">${tags.map(tagChip).join('')}${c.biz ? '<span class="chip">Comercio</span>' : ''}${c.channel ? `<span class="chip">${CHANNELS[c.channel] || ''}</span>` : ''}</div>
    <div class="stat-grid cli-stats"><div class="stat big"><small>Total comprado</small><b>${money(st.total)}</b></div><div class="stat"><small>Compras</small><b>${st.count}</b></div><div class="stat"><small>Última compra</small><b>${st.last ? cap(ago(st.last)) : '—'}</b></div><div class="stat"><small>Frecuencia habitual</small><b>${st.every ? 'Cada ~' + st.every + ' días' : '—'}</b></div><div class="stat"><small>Producto favorito</small><b>${st.fav ? esc(skuShort(skuById(st.fav))) : '—'}</b></div><div class="stat ${st.balance > 0 ? 'owe' : ''}"><small>Saldo pendiente</small><b>${money(st.balance)}</b></div></div>
    <div class="chips"><button type="button" class="btn sm primary" data-act="copy-wa" data-arg="${c.id}">${ic('msg', 'sm')}Preparar mensaje de WhatsApp</button>${c.phone ? `<button type="button" class="btn sm" data-act="copy-phone" data-arg="${c.id}">${ic('phone', 'sm')}Copiar teléfono</button>` : ''}<button type="button" class="btn sm" data-act="new-order" data-arg="${c.id}">${ic('plus', 'sm')}Nuevo pedido</button></div>
    <div class="suggest">${griAvatar('sm')}<p>${sugg}</p></div>
    <div><div class="flabel" style="margin-bottom:6px">Mensaje sugerido <span class="hint">· se copia, no se envía solo</span></div><div class="msg-box">${esc(msg)}</div></div>
    <div><div class="flabel" style="margin-bottom:8px">Historial de compras</div><div class="hist">${st.orders.map(o => `<button type="button" class="hist-item" data-act="order" data-arg="${o.id}"><span class="hist-date"><b>${new Date(toT(o.deliveryDate)).getUTCDate()}</b>${MESES[+o.deliveryDate.slice(5, 7) - 1]}</span><span class="row-main"><span class="row-title" style="font-size:13.5px">#${o.number} · ${money(o.total)}</span><span class="row-sub" style="display:block">${esc(itemsText(o))}</span></span><span class="row-end">${payChip(o)}</span></button>`).join('') || emptyBox('Sin pedidos todavía.')}</div></div>
  </div><div class="m-foot"><button type="button" class="btn ghost grow" data-act="close">Cerrar</button><button type="button" class="btn primary" data-act="new-order" data-arg="${c.id}">${ic('plus', 'sm')}Nuevo pedido</button></div>`, { drawer: true });
}

/* =====================================================================
   ESTRATEGIA
   ===================================================================== */
function unitsIn(a, b, pred) { let u = 0; for (const o of S.orders.filter(o => !o.cancelled && o.createdAt >= a && o.createdAt <= b)) for (const it of o.items) if (pred(it)) u += it.qty; return u; }
function stratData() {
  const D = TODAY(), from = addDays(D, -30);
  const recent = S.orders.filter(o => !o.cancelled && o.createdAt > from);
  computeVip();
  const per = S.skus.map(s => {
    let u = 0, rev = 0, gp = 0;
    for (const o of recent) for (const it of o.items) if (it.skuId === s.id) { const f = 1 - (o.discountPct || 0) / 100; u += it.qty; rev += it.qty * it.unitPrice * f; gp += it.qty * (it.unitPrice * f - it.unitCost); }
    return { s, u, rev, gp, m: rev ? gp / rev : 0, unitM: (s.price - skuCost(s).total) / s.price };
  }).sort((a, b) => b.gp - a.gp);
  const byMargin = per.filter(p => p.s.price).slice().sort((a, b) => b.unitM - a.unitM);
  const wd = [0, 0, 0, 0, 0, 0, 0]; for (const o of S.orders.filter(o => !o.cancelled && o.deliveryDate < D && o.deliveryDate > addDays(D, -60))) wd[weekday(o.deliveryDate)]++;
  const wtot = sum(wd), topW = wd.indexOf(Math.max(...wd));
  const envShare = sum(per, p => p.u * (skuCost(p.s).env + skuCost(p.s).eti)) / Math.max(1, sum(per, p => p.u * skuCost(p.s).total));
  const clients = S.clients.map(c => { const st = clientStats(c); return { c, st, tags: clientTags(c, st) }; }).filter(x => x.st.count);
  const repeat = clients.filter(x => x.st.count >= 2).length;
  const reco = clients.filter(x => x.tags.includes('recompra'));
  const everys = clients.filter(x => x.st.every).map(x => x.st.every);
  const avgEvery = everys.length ? Math.round(sum(everys) / everys.length) : 0;
  const soon = sum(S.skus, s => skuStock(s.id).soon);
  const chan = {}; for (const o of recent) { chan[o.channel] = chan[o.channel] || { t: 0, n: 0 }; chan[o.channel].t += o.total; chan[o.channel].n++; }
  const chBest = Object.keys(chan).filter(k => k !== 'mayorista').sort((a, b) => chan[b].t / chan[b].n - chan[a].t / chan[a].n)[0];
  const top80 = (() => { const tot = sum(per, p => p.gp); let acc = 0, n = 0; for (const p of per) { acc += p.gp; n++; if (acc >= tot * .8) break; } return n; })();
  return { D, per, byMargin, wd, wtot, topW, envShare, clients, repeat, reco, avgEvery, soon, chan, chBest, top80 };
}
function stratIdeas(d) {
  const nat500 = skuById('nat500') || d.per[0].s;
  const packPrice = Math.round(nat500.price * 4 * (1 - U.est.disc / 100) / 100) * 100, packGp = packPrice - skuCost(nat500).total * 4;
  const topFl = d.byMargin[0].s.flavor, flName = FLAVORS[topFl].name.toLowerCase();
  const list = [
    { id: 'pack', title: `Ofrecé un pack semanal de 4 × ${skuShort(nat500)}`, text: `Precio sugerido ${money(packPrice)} (${U.est.disc}% menos). Asegura recompra y ordena la producción.`, how: `Tomamos el precio actual de ${skuShort(nat500)} (${money(nat500.price)}) por 4, con el descuento que elegiste en el escenario de abajo. La ganancia por pack (${money(packGp)}) sale de restar el costo unitario de la receta (${money(skuCost(nat500).total)}) por 4.`, metric: { label: 'unidades de ' + skuShort(nat500), fn: (a, b) => unitsIn(a, b, it => it.skuId === nat500.id) } },
    { id: 'push', title: `Mostrá más el sabor ${flName} en Instagram`, text: `Es de lo más rentable por unidad (${pctTxt(d.byMargin[0].unitM)} de margen).`, how: `Calculamos el margen bruto de cada producto con su receta: (precio − costo de ingredientes, envase, etiqueta y elaboración) ÷ precio. ${skuShort(d.byMargin[0].s)} es el más alto.`, metric: { label: 'unidades de ' + flName, fn: (a, b) => unitsIn(a, b, it => skuById(it.skuId).flavor === topFl) } },
    { id: 'reco', title: `Escribile a ${d.reco.length} ${pl(d.reco.length, 'cliente')} que ${pl(d.reco.length, 'suele', 'suelen')} reponer`, text: 'Un mensaje corto el día que suelen pedir. El sistema arma el texto, vos lo mandás.', how: `Para cada cliente con 2 o más compras calculamos cada cuántos días compra (promedio entre compras). Si ya pasó ese tiempo sin un pedido nuevo, entra en “posible recompra”.`, metric: { label: 'pedidos', fn: (a, b) => S.orders.filter(o => !o.cancelled && o.createdAt >= a && o.createdAt <= b).length } },
    { id: 'retornable', title: 'Probá un frasco retornable con descuento', text: `Envase, tapa y etiqueta son el ${pctTxt(d.envShare)} del costo. Recuperar frascos lo baja.`, how: 'Sumamos el costo de envase, tapa y etiqueta de cada producto vendido en 30 días y lo dividimos por su costo total.', metric: null },
    { id: 'viernes', title: `Reforzá stock para los ${DIAS[d.topW]}`, text: 'Programá producción el día anterior para no quedarte corta.', how: `Contamos las entregas de los últimos 60 días por día de la semana. Los ${DIAS[d.topW]} concentran ${pctTxt(d.wd[d.topW] / Math.max(1, d.wtot))}.`, metric: { label: 'ventas de los ' + DIAS[d.topW], money: true, fn: (a, b) => sum(S.orders.filter(o => !o.cancelled && o.createdAt >= a && o.createdAt <= b && weekday(o.createdAt) === d.topW), o => o.total) } },
  ];
  if (d.soon) list.push({ id: 'promo', title: 'Promo para lo que vence pronto', text: 'Un topping de regalo en los frascos que vencen esta semana.', how: 'Sumamos las unidades de lotes que vencen en 3 días o menos.', metric: { label: 'unidades dadas de baja', fn: (a, b) => sum(S.moves.filter(m => m.type === 'baja' && m.date >= a && m.date <= b), m => -m.qty) } });
  return list;
}
function ideaResult(idea, rec) {
  if (!idea.metric) return 'Este resultado no se mide solo: anotá cuántos frascos vuelven para comparar.';
  const n = diffDays(TODAY(), rec.at);
  if (n < 1) return `La aplicaste hoy. En unos días vas a ver acá cómo cambiaron las ${idea.metric.label}.`;
  const a = addDays(rec.at, 0), b = TODAY(), pa = addDays(rec.at, -n), pb = addDays(rec.at, -1);
  const cur = idea.metric.fn(a, b), prev = idea.metric.fn(pa, pb), f = idea.metric.money ? money : v => fmtN(v, 0);
  return `Desde que la aplicaste (${n} ${pl(n, 'día')}): ${f(cur)} ${idea.metric.label}, contra ${f(prev)} en los ${n} días anteriores${prev ? ` (${cur >= prev ? '+' : ''}${Math.round((cur - prev) / prev * 100)}%)` : ''}. Es una comparación simple: otras cosas también pueden influir.`;
}
function vEstrategia() {
  const d = stratData();
  const facts = [
    [`${skuShort(d.byMargin[0].s)} y ${skuShort(d.byMargin[1].s)} tienen los márgenes más altos`, `${pctTxt(d.byMargin[0].unitM)} y ${pctTxt(d.byMargin[1].unitM)} de margen bruto por unidad.`, 'Margen bruto por unidad = (precio − costo de ingredientes, envase, etiqueta y elaboración) ÷ precio, con los costos actuales de cada receta.'],
    [`Los ${DIAS[d.topW]} concentran más entregas`, `${pctTxt(d.wd[d.topW] / Math.max(1, d.wtot))} de las entregas de los últimos 60 días.`, `Contamos las ${d.wtot} entregas de los últimos 60 días según el día de la semana. Si se repartieran parejo, cada día tendría ${pctTxt(1 / 7)}.`],
    [`Envase, tapa y etiqueta son el ${pctTxt(d.envShare)} del costo`, 'Ponderado por lo que vendiste en 30 días.', 'Para cada producto vendido sumamos el costo de envase, tapa y etiqueta y lo dividimos por su costo total, según las unidades vendidas.'],
    [`${d.repeat} de ${d.clients.length} clientes volvieron a comprar`, `En promedio compran cada ${d.avgEvery} días.`, 'Contamos los clientes con 2 o más compras y promediamos los días entre compras de cada uno.'],
    [`${d.top80} productos te dejan el 80% de la ganancia`, d.per.slice(0, d.top80).map(p => skuShort(p.s)).join(', ') + '.', 'Ordenamos los productos por ganancia bruta de los últimos 30 días y sumamos hasta llegar al 80% del total.'],
  ];
  if (d.chBest) facts.push([`${CHANNELS[d.chBest]} tiene el ticket más alto entre particulares`, `${money(d.chan[d.chBest].t / d.chan[d.chBest].n)} promedio por pedido.`, 'Ticket promedio = total vendido ÷ cantidad de pedidos, por canal, en los últimos 30 días. No incluye mayoristas.']);
  const ideas = stratIdeas(d);
  const mine = ideas.filter(i => S.ideas[i.id]);
  const nat500 = skuById('nat500') || d.per[0].s, packPrice = Math.round(nat500.price * 4 * (1 - U.est.disc / 100) / 100) * 100, packGp = packPrice - skuCost(nat500).total * 4, monthPacks = U.est.packs * 4.33;
  const evs = calendarEvents();
  return `<div class="wrap">
  ${pageHead('Estrategia', 'Lo que dicen tus números y, aparte, ideas para probar. Los datos son cálculos; las ideas son hipótesis.')}
  <div class="grid g2">
    <div class="card"><div class="sec-title"><h2>Lo que dicen tus números</h2><span class="chip info">Dato</span></div>${facts.map(([t, s, how]) => `<div class="insight"><span class="chip info tag">Dato</span><div><b>${esc(t)}</b><p>${esc(s)}</p>${howTip(esc(how), '¿Cómo lo calculaste?')}</div></div>`).join('')}</div>
    <div class="card"><div class="sec-title"><h2>Ideas para probar</h2><span class="chip terra">Hipótesis</span></div>${ideas.map(i => { const r = S.ideas[i.id]; return `<div class="insight"><span class="chip terra tag">Idea</span><div style="min-width:0;flex:1"><b>${esc(i.title)}</b><p>${esc(i.text)}</p>${howTip(esc(i.how), '¿Cómo lo calculaste?')}
      <div class="idea-acts">${r && r.status === 'aplicada' ? `<span class="chip good">${ic('check', 'sm')}Aplicada ${relDay(r.at).toLowerCase()}</span>` : `<button class="btn sm ${r ? 'soft' : ''}" data-act="idea-save" data-arg="${i.id}">${r ? ic('check', 'sm') + 'Guardada' : 'Guardar idea'}</button><button class="btn sm ghost" data-act="idea-apply" data-arg="${i.id}">Marcar como aplicada</button>`}</div></div></div>`; }).join('')}
      <p class="hint" style="margin:10px 0 0">Las ideas son sugerencias para probar, no resultados garantizados.</p></div>
  </div>
  ${mine.length ? `<section class="card"><div class="sec-title"><h2>Tus ideas</h2><span class="hint">Guardadas y aplicadas, con sus resultados</span></div><div class="rows">${mine.map(i => { const r = S.ideas[i.id]; return `<div class="row" style="align-items:flex-start;flex-wrap:wrap"><span class="chip ${r.status === 'aplicada' ? 'good' : 'sage'}" style="margin-top:2px">${r.status === 'aplicada' ? 'Aplicada' : 'Guardada'}</span><div class="row-main"><div class="row-title">${esc(i.title)}</div><div class="row-sub">${r.status === 'aplicada' ? esc(ideaResult(i, r)) : 'La guardaste ' + relDay(r.at).toLowerCase() + '. Cuando la pongas en práctica, marcala como aplicada para seguir sus resultados.'}</div></div><div class="chips">${r.status !== 'aplicada' ? `<button class="btn sm" data-act="idea-apply" data-arg="${i.id}">Marcar como aplicada</button>` : ''}<button class="btn sm ghost" data-act="idea-remove" data-arg="${i.id}">Quitar</button></div></div>`; }).join('')}</div></section>` : ''}
  <div class="grid g2">
    <div class="card"><div class="sec-title"><h2>Ranking de rentabilidad</h2><span class="hint">Últimos 30 días</span></div>${hbars(d.per.filter(p => p.u).map(p => ({ label: p.s.name, v: p.gp, sub: pctTxt(p.m) + ' · ' + p.u + ' u', icon: jar(p.s.flavor, 22) })))}</div>
    <div class="card"><div class="sec-title"><h2>Recompra</h2><span class="hint">Cada ~${d.avgEvery} días en promedio</span></div>
      <div class="tri" style="margin-bottom:12px"><div class="stat"><small>Volvieron a comprar</small><b>${pctTxt(d.repeat / Math.max(1, d.clients.length))}</b></div><div class="stat"><small>Por reponer ahora</small><b>${d.reco.length}</b></div><div class="stat"><small>Inactivos</small><b>${d.clients.filter(x => x.tags.includes('inactivo')).length}</b></div></div>
      <div class="rows">${d.reco.slice(0, 6).map(({ c, st }) => `<div class="row"><span class="cl-av ${c.biz ? 'biz' : ''}">${initials(c.name)}</span><div class="row-main"><div class="row-title">${esc(c.name)}</div><div class="row-sub">Compra cada ~${st.every} días · última ${ago(st.last)}</div></div><button class="btn sm" data-act="copy-wa" data-arg="${c.id}">${ic('msg', 'sm')}Copiar mensaje</button></div>`).join('') || emptyBox('Nadie atrasado en su recompra.')}</div></div>
  </div>
  <div class="card"><div class="sec-title"><div><h2>Escenario: pack semanal</h2><p class="hint" style="margin:4px 0 0">Hipótesis con tus costos actuales. No es una proyección garantizada.</p></div></div>
    <div class="frow"><div class="field"><label for="est-packs">Packs por semana: <b>${U.est.packs}</b></label><input type="range" class="range" id="est-packs" min="0" max="40" value="${U.est.packs}" data-input="est-packs"></div>
    <div class="field"><label for="est-disc">Descuento del pack: <b>${U.est.disc}%</b></label><input type="range" class="range" id="est-disc" min="0" max="25" value="${U.est.disc}" data-input="est-disc"></div></div>
    <div class="scenario-out"><div class="stat"><small>Precio del pack (4 × ${esc(sizeLabel(nat500.size))})</small><b>${money(packPrice)}</b></div><div class="stat"><small>Ganancia bruta por pack</small><b>${money(packGp)} · ${pctTxt(packGp / packPrice)}</b></div><div class="stat"><small>Ganancia bruta estimada por mes</small><b>${money(packGp * monthPacks)}</b></div></div>
  </div>
  <div class="card"><div class="sec-title"><h2>Calendario comercial</h2><button class="btn sm" data-act="ev-new">${ic('plus', 'sm')}Fecha</button></div>
    ${evs.map(e => `<div class="cal-ev"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(e.name)}</b><span class="num muted">${fmtDate(e.date)}</span></div><div class="hint" style="color:var(--terra-ink);font-weight:700">${e.next ? (e.next.date === d.D ? 'Hoy: ' : 'Próximo: ') + e.next.label + ' · ' + fmtDate(e.next.date) : ''}</div>
      <div class="cal-steps">${e.steps.map(s => `<span class="${s.date < d.D ? 'past' : s.date === d.D ? 'now' : ''}">${fmtDate(s.date)} ${s.label}</span>`).join('')}</div></div>`).join('')}
  </div>
  </div>`;
}

const UI2_ACT = {
  'env-hide-gri': () => { U.env.hideGri = true; render(); },
  'copy-addr': a => { const o = orderById(a), ad = orderAddr(o); copyText(`${ad.address}, ${ad.barrio}, CABA${ad.ref ? ' (' + ad.ref + ')' : ''}`, 'Dirección copiada'); },
  'idea-save': a => { if (S.ideas[a]) { delete S.ideas[a]; run(() => 'Idea quitada de tus ideas'); } else { S.ideas[a] = { status: 'guardada', at: TODAY() }; run(() => 'Idea guardada. La encontrás en “Tus ideas”.'); } },
  'idea-apply': a => openConfirm('Marcar como aplicada', 'Desde hoy vamos a comparar los resultados con el período anterior para que veas si la idea funcionó.', 'Marcar como aplicada', () => { S.ideas[a] = { status: 'aplicada', at: TODAY() }; return 'Idea marcada como aplicada'; }),
  'idea-remove': a => { delete S.ideas[a]; run(() => 'Idea quitada'); },
};
