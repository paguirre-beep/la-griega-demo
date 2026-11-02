'use strict';
/* =====================================================================
   app.js — armado de pantalla, modales, formularios, eventos y arranque
   ===================================================================== */
const $ = s => document.querySelector(s);

/* ---------- Persistencia ---------- */
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: la demo sigue en memoria */ } }
function loadState() { try { const r = localStorage.getItem(STORE_KEY); if (!r) return null; const s = JSON.parse(r); return s && s.v === VERSION ? s : null; } catch (e) { return null; } }

/* ---------- Toasts ---------- */
function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'err' ? 'err' : '');
  el.setAttribute('role', type === 'err' ? 'alert' : 'status');
  el.innerHTML = ic(type === 'err' ? 'alert' : 'check') + '<span>' + esc(msg) + '</span>';
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), type === 'err' ? 6500 : 4200);
}
function run(fn) {
  try {
    const r = fn();
    S.rev++; persist(); render();
    const msg = r && typeof r === 'object' ? r.msg : r;
    if (msg) toast(msg);
    return r || true;
  } catch (e) {
    if (e instanceof UserError) { toast(e.message, 'err'); return false; }
    console.error(e); toast('Algo salió mal: ' + e.message, 'err'); return false;
  }
}
function copyText(t, ok) {
  const fallback = () => {
    openModal(mHead('Copiá el texto', 'El navegador no permitió copiar automáticamente. Ya está seleccionado.') + `<div class="m-body"><textarea class="input" id="copy-ta" rows="10" readonly>${esc(t)}</textarea></div><div class="m-foot"><button type="button" class="btn primary" data-act="close">Listo</button></div>`);
    setTimeout(() => { const ta = $('#copy-ta'); if (ta) { ta.focus(); ta.select(); } }, 60);
  };
  try { navigator.clipboard.writeText(t).then(() => toast(ok || 'Copiado'), fallback); } catch (e) { fallback(); }
}

/* ---------- Modales ---------- */
const M = { submit: null, onInput: null, back: null, ctx: null };
function openModal(html, o) {
  o = o || {};
  $('#overlay-root').innerHTML = `<div class="overlay ${o.drawer ? 'drawer-o' : ''}" data-overlay><form class="modal ${o.wide ? 'wide' : ''}" id="mform" novalidate role="dialog" aria-modal="true">${html}</form></div>`;
  M.submit = o.submit || null; M.onInput = o.onInput || null; M.ctx = o.ctx || null; M.back = o.back || null;
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const f = document.querySelector('#mform [autofocus]'); if (f && window.innerWidth > 1023) f.focus(); }, 40);
}
function closeModal() { $('#overlay-root').innerHTML = ''; M.submit = M.onInput = M.back = M.ctx = null; document.body.style.overflow = ''; }
function done(r) { if (!r) return; const back = M.back; closeModal(); if (back) back(); }
const mHead = (t, sub) => `<div class="m-head"><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button type="button" class="btn icon ghost" data-act="close" aria-label="Cerrar">${ic('x')}</button></div>`;
const mFoot = (label, extra) => `<div class="m-foot">${extra || ''}<button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn primary">${label}</button></div>`;
const fval = id => { const el = document.getElementById(id); return el ? el.value : ''; };
function openConfirm(title, text, okLabel, fn, danger) {
  openModal(mHead(title) + `<div class="m-body"><p style="margin:0">${text}</p></div><div class="m-foot"><button type="button" class="btn ghost" data-act="close">Volver</button><button type="submit" class="btn ${danger ? 'terra' : 'primary'}">${okLabel}</button></div>`, { submit: () => done(run(fn)) });
}

/* ---------- Detalle de pedido ---------- */
function openOrder(id) {
  const o = orderById(id); if (!o) return;
  const c = clientById(o.clientId), a = orderAddr(o), pays = S.payments.filter(p => p.orderId === o.id);
  const res = S.reservations.filter(r => r.orderId === o.id);
  const miss = shortage(o);
  const stockInfo = o.cancelled ? 'Pedido cancelado: no reserva stock.' : o.stockConsumed ? 'El stock ya se descontó: el pedido salió del local.' :
    Object.keys(needBySku(o)).map(k => { const rs = res.filter(r => r.skuId === k); return `<div>${esc(skuShort(skuById(k)))}: ${rs.map(r => { const l = S.lots.find(x => x.id === r.lotId); return `${r.qty} del lote <b>${esc(l.code)}</b> (vence ${fmtDate(l.expires)})`; }).join(', ') || ''}${miss[k] ? ` <span class="chip terra">faltan ${miss[k]}</span>` : ''}</div>`; }).join('');
  let next = '';
  if (!o.cancelled) {
    if (o.status === 'por_elaborar') next = fullyReserved(o) ? `<button type="button" class="btn primary" data-act="move" data-arg="${o.id}" data-to="listo" data-back="1">Marcar listo</button>` : `<button type="button" class="btn primary" data-act="move" data-arg="${o.id}" data-to="en_produccion" data-back="1">Pasar a producción</button>`;
    else if (o.status === 'en_produccion') next = `<button type="button" class="btn primary" data-act="move" data-arg="${o.id}" data-to="listo" data-back="1" ${fullyReserved(o) ? '' : 'disabled'}>Marcar listo</button>`;
    else if (o.status === 'listo') next = o.ship ? `<button type="button" class="btn primary" data-act="go-ship" data-arg="${o.id}">Ir a envíos</button>` : `<button type="button" class="btn primary" data-act="move" data-arg="${o.id}" data-to="entregado" data-back="1">Marcar entregado</button>`;
  }
  const html = mHead(`Pedido #${o.number}`, `${esc(c.name)} · tomado el ${fmtDate(o.createdAt)} por ${CHANNELS[o.channel]}`) + `<div class="m-body">
    <div class="tri"><div class="state"><small>Producto</small>${statusChip(o)}</div><div class="state"><small>Transporte</small>${shipChip(o)}</div><div class="state"><small>Cobro</small>${payChip(o)}</div></div>
    <div><div class="flabel" style="margin-bottom:8px">Productos</div><div class="rows">${o.items.map(it => { const s = skuById(it.skuId); return `<div class="row"><span>${jar(s.flavor, 34)}</span><div class="row-main"><div class="row-title">${it.qty} × ${esc(s.name)}</div>${it.toppings.length ? `<div class="row-sub">Toppings: ${it.toppings.map(t => esc(TOPPINGS[t].name)).join(', ')}</div>` : ''}</div><div class="row-end"><b>${money(it.qty * it.unitPrice)}</b><span class="hint">${money(it.unitPrice)} c/u</span></div></div>`; }).join('')}</div></div>
    <div class="total-box"><div><span>Subtotal</span><b class="num">${money(o.sub)}</b></div>${o.disc ? `<div><span>Descuento ${o.discountPct}%</span><b class="num">−${money(o.disc)}</b></div>` : ''}<div class="big"><span>Total</span><span class="num">${money(o.total)}</span></div><div class="muted"><span>Ganancia bruta estimada</span><span class="num">${money(profitOf(o))} · ${pctTxt(o.total ? profitOf(o) / o.total : 0)}</span></div><div class="muted"><span>Cobrado</span><span class="num">${money(paidOf(o))} · saldo ${money(balanceOf(o))}</span></div></div>
    <div><div class="flabel" style="margin-bottom:6px">Entrega</div><div style="font-size:13.5px;line-height:1.6">${fmtLong(o.deliveryDate)} · ${o.slot}<br>${DELIVERY[o.delivery]}${o.ship ? ` · envío ${money(o.shipCost)} a cargo del ${o.shipPaidBy === 'negocio' ? 'negocio' : 'cliente'}<br>${esc(a.address)}, ${esc(a.barrio)}${a.ref ? ' · ' + esc(a.ref) : ''}` : ''}${o.ship && o.ship.driver ? `<br>Conductor: ${esc(o.ship.driver)}${o.ship.tripRef ? ' · ' + esc(o.ship.tripRef) : ''}` : ''}</div></div>
    ${o.notes ? `<div class="oc-note" style="font-size:13px">${esc(o.notes)}</div>` : ''}
    <div><div class="flabel" style="margin-bottom:6px">Stock</div><div style="font-size:13px;line-height:1.7">${stockInfo}</div></div>
    ${pays.length ? `<div><div class="flabel" style="margin-bottom:6px">Cobros</div><div class="rows">${pays.map(p => `<div class="row"><div class="row-main"><div class="row-title" style="font-size:13.5px">${p.kind} · ${p.method}</div><div class="row-sub">${fmtDate(p.date)} ${p.time}</div></div><b class="num" style="color:var(--good)">+${money(p.amount)}</b></div>`).join('')}</div></div>` : ''}
    <div><div class="flabel" style="margin-bottom:8px">Historial</div><div class="timeline">${(o.log || []).slice().reverse().map(l => `<div><time>${fmtDate(l.date)} ${l.time}</time><span>${esc(l.text)}</span></div>`).join('') || '<span class="faint">Sin registros</span>'}</div></div>
  </div>
  <div class="m-foot" style="flex-wrap:wrap">${!o.cancelled && !o.stockConsumed ? `<button type="button" class="btn ghost danger grow" data-act="cancel-order" data-arg="${o.id}">Cancelar pedido</button><button type="button" class="btn" data-act="edit-order" data-arg="${o.id}">${ic('edit', 'sm')}Editar</button>` : '<span class="grow"></span>'}${balanceOf(o) > 0 ? `<button type="button" class="btn" data-act="pay" data-arg="${o.id}" data-back="1">${ic('cash', 'sm')}Cobrar</button>` : ''}${next}</div>`;
  openModal(html, { drawer: true, ctx: { order: id } });
}

/* ---------- Formulario de pedido ---------- */
let DR = null;
function nextSlot() { const h = new Date().getHours() + 2; return SLOTS.find(s => +s.slice(0, 2) >= h) || null; }
function openOrderForm(editId, presetClient) {
  const o = editId ? orderById(editId) : null;
  if (o && o.stockConsumed) { toast('Este pedido ya salió del local y no se puede editar.', 'err'); return; }
  const c0 = o ? clientById(o.clientId) : presetClient ? clientById(presetClient) : null;
  const slot = nextSlot();
  DR = {
    editId, clientId: c0 ? c0.id : '', newName: '', newPhone: '', barrio: c0 ? c0.barrio : '',
    items: o ? o.items.map(it => ({ skuId: it.skuId, qty: it.qty, toppings: it.toppings.slice() })) : [],
    b: { flavor: 'natural', size: 500, qty: 1, tops: [] },
    delivery: o ? o.delivery : c0 ? c0.delivery : 'uber',
    date: o ? o.deliveryDate : slot ? TODAY() : addDays(TODAY(), 1), slot: o ? o.slot : slot || SLOTS[2],
    address: o ? orderAddr(o).address : c0 ? c0.address : '', ref: o ? orderAddr(o).ref : c0 ? c0.ref : '',
    shipCost: o ? o.shipCost : c0 ? (BARRIO_UBER[c0.barrio] || 3500) : 3500, shipPaidBy: o ? o.shipPaidBy : 'cliente',
    channel: o ? o.channel : c0 ? c0.channel : 'whatsapp', payMethod: o ? o.payMethod : 'transferencia',
    discountPct: o ? o.discountPct : 0, deposit: '', notes: o ? o.notes : '',
  };
  if (c0 && c0.favs && c0.favs[0] && !o) { const s = skuById(c0.favs[0]); DR.b.flavor = s.flavor; DR.b.size = s.size; }
  openModal(orderFormHtml(), { wide: true, submit: submitOrder, onInput: draftInput, back: editId ? () => openOrder(editId) : null });
}
function draftAvail(skuId) {
  const st = skuStock(skuId);
  const own = DR.editId ? reservedFor(DR.editId, skuId) : 0;
  const inDraft = sum(DR.items.filter(i => i.skuId === skuId), i => i.qty);
  return st.free + own - inDraft;
}
function builderHtml() {
  const b = DR.b;
  const sizes = S.skus.filter(s => s.flavor === b.flavor).map(s => s.size);
  if (!sizes.includes(b.size)) b.size = sizes.includes(500) ? 500 : sizes[0];
  const sku = S.skus.find(s => s.flavor === b.flavor && s.size === b.size);
  const avail = Math.max(0, draftAvail(sku.id));
  const unit = lineUnitPrice(sku, b.tops);
  return `<div><div class="hint" style="margin-bottom:6px">Sabor</div><div class="opt-grid">${Object.keys(FLAVORS).filter(f => S.skus.some(x => x.flavor === f)).map(f => `<button type="button" class="opt ${b.flavor === f ? 'on' : ''}" data-act="nf-flavor" data-arg="${f}">${jar(f, 20)}${FLAVORS[f].name}</button>`).join('')}</div></div>
    <div class="frow" style="align-items:end"><div><div class="hint" style="margin-bottom:6px">Tamaño</div><div class="opt-grid">${[...new Set([250, 500, 1000].concat(sizes))].sort((x, y) => x - y).map(z => `<button type="button" class="opt ${b.size === z ? 'on' : ''}" data-act="nf-size" data-arg="${z}" ${sizes.includes(z) ? '' : 'disabled'}>${sizeLabel(z)}</button>`).join('')}</div></div>
    <div><div class="hint" style="margin-bottom:6px">Cantidad</div><div class="stepper"><button type="button" data-act="nf-q" data-arg="-1" aria-label="Menos">−</button><input id="nf-bq" type="number" min="1" value="${b.qty}" data-nf="bqty" aria-label="Cantidad"><button type="button" data-act="nf-q" data-arg="1" aria-label="Más">+</button></div></div></div>
    <div><div class="hint" style="margin-bottom:6px">Toppings (opcional, por frasco)</div><div class="opt-grid">${Object.keys(TOPPINGS).map(t => `<button type="button" class="opt ${b.tops.includes(t) ? 'on' : ''}" data-act="nf-top" data-arg="${t}">${TOPPINGS[t].name} <span class="faint">+${money(TOPPINGS[t].price)}</span></button>`).join('')}</div></div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between"><span class="hint">${esc(sku.name)} · ${money(unit)} c/u · ${avail > 0 ? `<b style="color:var(--good)">${avail} disponibles</b>` : '<b style="color:var(--terra-ink)">sin stock libre</b>'}${b.qty > avail ? ` · ${b.qty - avail} se suman a producción` : ''}</span><button type="button" class="btn soft" data-act="nf-add">${ic('plus', 'sm')}Agregar ${b.qty} × ${money(unit * b.qty)}</button></div>`;
}
function itemsHtml() {
  if (!DR.items.length) return `<div class="empty" style="padding:14px">Todavía no agregaste productos.</div>`;
  return DR.items.map((it, i) => { const s = skuById(it.skuId); return `<div class="line-item"><span>${jar(s.flavor, 28)}</span><div class="row-main"><b>${it.qty} × ${esc(s.name)}</b>${it.toppings.length ? `<div class="hint">+ ${it.toppings.map(t => TOPPINGS[t].name.toLowerCase()).join(', ')}</div>` : ''}</div><b class="num">${money(it.qty * lineUnitPrice(s, it.toppings))}</b><button type="button" class="btn sm icon ghost" data-act="nf-rm" data-arg="${i}" aria-label="Quitar">${ic('x', 'sm')}</button></div>`; }).join('');
}
function totalHtml() {
  const sub = sum(DR.items, it => it.qty * lineUnitPrice(skuById(it.skuId), it.toppings));
  const disc = Math.round(sub * clamp(+DR.discountPct || 0, 0, 50) / 100), tot = sub - disc;
  const cost = sum(DR.items, it => it.qty * lineUnitCost(skuById(it.skuId), it.toppings)) + (DR.delivery !== 'retiro' && DR.shipPaidBy === 'negocio' ? +DR.shipCost || 0 : 0);
  const dep = Math.round(+DR.deposit || 0);
  return `<div><span>Subtotal</span><b class="num">${money(sub)}</b></div>${disc ? `<div><span>Descuento ${DR.discountPct}%</span><b class="num">−${money(disc)}</b></div>` : ''}
    ${DR.delivery !== 'retiro' ? `<div class="muted"><span>Envío ${money(+DR.shipCost || 0)}</span><span>${DR.shipPaidBy === 'negocio' ? 'lo paga el negocio (resta ganancia)' : 'lo paga el cliente al conductor'}</span></div>` : ''}
    <div class="big"><span>Total del pedido</span><span class="num">${money(tot)}</span></div>
    <div class="muted"><span>Ganancia bruta estimada</span><span class="num">${money(tot - cost)} · ${pctTxt(tot ? (tot - cost) / tot : 0)}</span></div>
    ${dep > 0 ? `<div class="muted"><span>Seña ahora</span><span class="num">${money(dep)} · saldo ${money(Math.max(0, tot - dep))}</span></div>` : ''}`;
}
function orderFormHtml() {
  const o = DR.editId ? orderById(DR.editId) : null;
  const clients = S.clients.slice().sort((a, b) => a.name.localeCompare(b.name));
  const isNew = DR.clientId === 'new';
  return mHead(o ? `Editar pedido #${o.number}` : 'Nuevo pedido', 'El total, el margen y la reserva de stock se calculan solos.') + `<div class="m-body">
  <div class="form"><div class="field"><label for="nf-client">Cliente</label><select class="input" id="nf-client" data-nf="clientId" ${!o ? 'autofocus' : ''}><option value="">Elegí un cliente…</option><option value="new" ${isNew ? 'selected' : ''}>＋ Cliente nuevo</option>${clients.map(c => `<option value="${c.id}" ${DR.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    ${isNew ? `<div class="frow"><div class="field"><label for="nf-name">Nombre</label><input class="input" id="nf-name" data-nf="newName" value="${esc(DR.newName)}" placeholder="Ej.: Paula Gómez"></div><div class="field"><label for="nf-phone">Teléfono</label><input class="input" id="nf-phone" data-nf="newPhone" value="${esc(DR.newPhone)}" placeholder="11 5555-0000" inputmode="tel"></div></div><div class="field"><label for="nf-barrio">Barrio</label><input class="input" id="nf-barrio" data-nf="barrio" value="${esc(DR.barrio)}" placeholder="Palermo"></div>` : ''}
  </div>
  <div class="form"><div class="flabel">Productos</div><div class="builder" id="nf-builder">${builderHtml()}</div><div style="display:flex;flex-direction:column;gap:8px" id="nf-items">${itemsHtml()}</div></div>
  <div class="form"><div class="flabel">Entrega</div>
    <div class="opt-grid">${Object.keys(DELIVERY).map(k => `<button type="button" class="opt ${DR.delivery === k ? 'on' : ''}" data-act="nf-del" data-arg="${k}">${ic(k === 'uber' ? 'car' : k === 'moto' ? 'truck' : 'store', 'sm')}${DELIVERY[k]}</button>`).join('')}</div>
    <div class="frow"><div class="field"><label for="nf-date">Fecha de entrega</label><input type="date" class="input" id="nf-date" data-nf="date" value="${DR.date}" ${o ? '' : `min="${TODAY()}"`}></div><div class="field"><label for="nf-slot">Franja horaria</label><select class="input" id="nf-slot" data-nf="slot">${SLOTS.map(s => `<option ${DR.slot === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
    ${DR.delivery !== 'retiro' ? `<div class="frow"><div class="field"><label for="nf-addr">Dirección</label><input class="input" id="nf-addr" data-nf="address" value="${esc(DR.address)}" placeholder="Calle, número, piso"></div><div class="field"><label for="nf-ref">Referencia</label><input class="input" id="nf-ref" data-nf="ref" value="${esc(DR.ref)}" placeholder="Timbre, portero, color de la puerta"></div></div>
    <div class="frow" style="align-items:end"><div class="field"><label for="nf-ship">Costo del envío</label><input type="number" class="input" id="nf-ship" min="0" step="100" data-nf="shipCost" value="${DR.shipCost}"></div><div><div class="hint" style="margin-bottom:6px">¿Quién lo paga?</div><div class="opt-grid"><button type="button" class="opt ${DR.shipPaidBy === 'cliente' ? 'on' : ''}" data-act="nf-paidby" data-arg="cliente">El cliente</button><button type="button" class="opt ${DR.shipPaidBy === 'negocio' ? 'on' : ''}" data-act="nf-paidby" data-arg="negocio">El negocio</button></div></div></div>` : ''}
  </div>
  <div class="form"><div class="flabel">Venta y cobro</div>
    <div class="frow" style="align-items:end"><div class="field"><label for="nf-ch">Canal de venta</label><select class="input" id="nf-ch" data-nf="channel">${Object.keys(CHANNELS).map(k => `<option value="${k}" ${DR.channel === k ? 'selected' : ''}>${CHANNELS[k]}</option>`).join('')}</select></div>
    <div><div class="hint" style="margin-bottom:6px">Método de pago</div><div class="opt-grid">${['transferencia', 'efectivo'].map(m => `<button type="button" class="opt ${DR.payMethod === m ? 'on' : ''}" data-act="nf-pay" data-arg="${m}">${cap(m)}</button>`).join('')}</div></div></div>
    <div class="frow"><div class="field"><label for="nf-disc">Descuento (%)</label><input type="number" class="input" id="nf-disc" min="0" max="50" data-nf="discountPct" value="${DR.discountPct}"></div>${o ? '<div></div>' : `<div class="field"><label for="nf-dep">Seña ahora (opcional)</label><input type="number" class="input" id="nf-dep" min="0" step="100" data-nf="deposit" value="${DR.deposit}" placeholder="$0"></div>`}</div>
    <div class="field"><label for="nf-notes">Observaciones</label><textarea class="input" id="nf-notes" data-nf="notes" rows="2" placeholder="Ej.: avisar antes de llegar">${esc(DR.notes)}</textarea></div>
  </div>
  <div class="total-box" id="nf-total">${totalHtml()}</div>
  </div>${mFoot(o ? 'Guardar cambios' : 'Guardar pedido')}`;
}
function rerenderForm() { const m = $('#mform'); if (!m) return; const st = m.scrollTop; m.innerHTML = orderFormHtml(); m.scrollTop = st; }
function draftInput(el) {
  const k = el.dataset.nf; if (!k) return;
  if (k === 'bqty') { DR.b.qty = Math.max(1, Math.round(+el.value || 1)); $('#nf-builder').querySelector('.btn.soft').outerHTML; const old = document.activeElement === el; $('#nf-builder').innerHTML = builderHtml(); if (old) { const n = $('#nf-bq'); n.focus(); } return; }
  DR[k] = el.value;
  if (k === 'clientId') {
    const c = clientById(el.value);
    if (c) { DR.delivery = c.delivery || DR.delivery; DR.address = c.address || ''; DR.ref = c.ref || ''; DR.barrio = c.barrio || ''; DR.channel = c.channel || DR.channel; DR.shipCost = c.delivery === 'moto' ? 2500 : (BARRIO_UBER[c.barrio] || 3500); DR.shipPaidBy = c.delivery === 'moto' ? 'negocio' : 'cliente'; if (c.biz) DR.discountPct = 10; if (c.favs && c.favs[0]) { const s = skuById(c.favs[0]); DR.b.flavor = s.flavor; DR.b.size = s.size; } }
    if (el.value === 'new') { DR.address = ''; DR.ref = ''; }
    rerenderForm(); return;
  }
  $('#nf-total').innerHTML = totalHtml();
}
function submitOrder() {
  const r = run(() => A.saveOrder(DR, DR.editId));
  if (r && !DR.editId && !S.onboard.order) { S.onboard.order = true; persist(); }
  if (r) { const id = r.id; M.back = null; closeModal(); if (!DR.editId && U.view !== 'pedidos') { /* queda en la vista actual */ } DR = null; openOrder(id); }
}

/* ---------- Otros modales ---------- */
function openPay(id, back) {
  const o = orderById(id), bal = balanceOf(o), c = clientById(o.clientId);
  M.ctx = { method: o.payMethod };
  openModal(mHead('Registrar cobro', `#${o.number} · ${esc(c.name)} · ${esc(itemsText(o))}`) + `<div class="m-body">
    <div class="total-box"><div><span>Total del pedido</span><b class="num">${money(o.total)}</b></div><div><span>Ya cobrado</span><b class="num">${money(paidOf(o))}</b></div><div class="big"><span>Saldo</span><span class="num">${money(bal)}</span></div></div>
    <div class="field"><label for="pm-amount">Importe que entró</label><input type="number" class="input" id="pm-amount" min="1" max="${bal}" step="100" value="${bal}" autofocus inputmode="numeric"></div>
    <div class="opt-grid"><button type="button" class="opt" data-act="pm-quick" data-arg="${bal}">Saldo completo</button><button type="button" class="opt" data-act="pm-quick" data-arg="${Math.round(bal / 2 / 100) * 100}">50% (seña)</button></div>
    <div><div class="hint" style="margin-bottom:6px">Medio de pago</div><div class="opt-grid" id="pm-methods">${['efectivo', 'transferencia'].map(m => `<button type="button" class="opt ${o.payMethod === m ? 'on' : ''}" data-act="pm-method" data-arg="${m}">${cap(m)}</button>`).join('')}</div></div>
    <div class="field"><label for="pm-note">Nota (opcional)</label><input class="input" id="pm-note" placeholder="Ej.: comprobante 4421"></div>
    <p class="hint" style="margin:0">Registrar el cobro no cambia el estado de entrega del pedido.</p>
  </div>${mFoot('Registrar cobro')}`, { ctx: { method: o.payMethod }, back, submit: () => done(run(() => A.addPayment(id, fval('pm-amount'), M.ctx.method, fval('pm-note')))) });
}
function openAssign(id) {
  const o = orderById(id), s = o.ship;
  openModal(mHead('Registrar conductor', `#${o.number} · ${esc(clientById(o.clientId).name)} · ${o.slot}`) + `<div class="m-body">
    <p class="hint" style="margin:0">Pedí el viaje en la app de ${o.delivery === 'uber' ? 'Uber' : 'mensajería'} y cargá acá lo que te muestra. Esto no avisa al cliente ni marca el pedido como entregado.</p>
    <div class="field"><label for="as-driver">Conductor</label><input class="input" id="as-driver" value="${esc(s.driver)}" placeholder="Ej.: Marcelo · Toyota Etios gris" autofocus></div>
    <div class="frow"><div class="field"><label for="as-ref">Referencia del viaje</label><input class="input" id="as-ref" value="${esc(s.tripRef)}" placeholder="Ej.: UB-7K2Q"></div><div class="field"><label for="as-cost">Costo real del envío</label><input type="number" class="input" id="as-cost" value="${o.shipCost}" min="0" step="100"></div></div>
  </div>${mFoot('Guardar')}`, { submit: () => done(run(() => A.shipAssign(id, fval('as-driver'), fval('as-ref'), fval('as-cost')))) });
}
function openIncident(id) {
  const o = orderById(id);
  openModal(mHead('Registrar incidencia', `#${o.number} · ${esc(clientById(o.clientId).name)}`) + `<div class="m-body">
    <div class="field"><label for="in-type">Qué pasó</label><select class="input" id="in-type">${INCIDENTS.map(t => `<option>${t}</option>`).join('')}</select></div>
    <div class="field"><label for="in-note">Detalle</label><textarea class="input" id="in-note" rows="3" placeholder="Ej.: no atiende el portero, vuelve a las 18"></textarea></div>
  </div>${mFoot('Registrar')}`, { submit: () => done(run(() => A.shipIncident(id, fval('in-type'), fval('in-note')))) });
}
function openPONew(skuId, qty) {
  const sel = skuId || S.skus[1].id;
  const body = () => {
    const sku = skuById(fval('po-sku') || sel), q = +fval('po-qty') || 0;
    return Object.keys(sku.recipe).map(k => { const i = insById(k), need = sku.recipe[k] * q; return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(i.name)}</span><span class="num" style="color:var(--${need > i.stock ? 'bad' : 'ink-2'})">${fmtN(need)} de ${fmtN(i.stock)} ${i.unit}</span></div>`; }).join('');
  };
  openModal(mHead('Nueva orden de producción', 'Se programa para el día que elijas. Al finalizarla se crea el lote y se descuentan los insumos.') + `<div class="m-body">
    <div class="field"><label for="po-sku">Producto</label><select class="input" id="po-sku" data-po="1">${S.skus.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="frow"><div class="field"><label for="po-qty">Unidades</label><input type="number" class="input" id="po-qty" min="1" value="${qty || 10}" data-po="1" autofocus></div><div class="field"><label for="po-date">Fecha</label><input type="date" class="input" id="po-date" value="${TODAY()}" min="${TODAY()}"></div></div>
    <div class="field"><label for="po-note">Nota</label><input class="input" id="po-note" placeholder="Ej.: para pedidos de mañana"></div>
    <div><div class="flabel" style="margin-bottom:6px">Insumos necesarios</div><div class="total-box" id="po-ins" style="gap:4px">${body()}</div></div>
  </div>${mFoot('Crear orden')}`, { onInput: el => { if (el.dataset.po) $('#po-ins').innerHTML = body(); }, submit: () => done(run(() => A.createPO(fval('po-sku'), fval('po-qty'), fval('po-date'), fval('po-note')))) });
}
function openPOFinish(id) {
  const p = S.prodOrders.find(x => x.id === id), sku = skuById(p.skuId);
  const body = () => { const q = +fval('pf-qty') || 0; return Object.keys(sku.recipe).map(k => { const i = insById(k), need = sku.recipe[k] * q; return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${need > i.stock ? ic('alert', 'sm') : ''} ${esc(i.name)}</span><span class="num" style="color:var(--${need > i.stock ? 'bad' : 'ink-2'})">−${fmtN(need)} ${i.unit} <span class="faint">(hay ${fmtN(i.stock)})</span></span></div>`; }).join(''); };
  openModal(mHead('Finalizar producción', `${p.id.toUpperCase()} · ${esc(sku.name)}`) + `<div class="m-body">
    <div class="field"><label for="pf-qty">¿Cuántas unidades salieron?</label><input type="number" class="input" id="pf-qty" min="1" value="${p.qty}" data-pf="1" autofocus></div>
    <div class="total-box"><div><span>Lote</span><b>${esc(lotCode(sku, TODAY()))}</b></div><div><span>Elaboración</span><b>${fmtDate(TODAY())}</b></div><div><span>Vencimiento</span><b>${fmtDate(addDays(TODAY(), sku.shelf))}</b></div><div class="muted"><span>Según la vida útil configurada para este producto</span><span>${sku.shelf} días</span></div></div>
    <div><div class="flabel" style="margin-bottom:6px">Se descuentan estos insumos</div><div class="total-box" id="pf-ins" style="gap:4px">${body()}</div></div>
    <p class="hint" style="margin:0">Las unidades nuevas se reservan solas para los pedidos que las esperan.</p>
  </div>${mFoot('Finalizar y crear lote')}`, { onInput: el => { if (el.dataset.pf) $('#pf-ins').innerHTML = body(); }, submit: () => done(run(() => A.finishPO(id, fval('pf-qty')))) });
}
function openInsBuy(id) {
  const sel = id || S.insumos[0].id;
  openModal(mHead('Registrar compra', 'Suma stock y actualiza el costo del insumo.') + `<div class="m-body">
    <div class="field"><label for="ib-id">Insumo</label><select class="input" id="ib-id" data-ib="1">${S.insumos.map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.name)} (${i.unit})</option>`).join('')}</select></div>
    <div class="frow"><div class="field"><label for="ib-qty">Cantidad</label><input type="number" class="input" id="ib-qty" min="0" step="any" autofocus></div><div class="field"><label for="ib-cost">Costo por unidad</label><input type="number" class="input" id="ib-cost" min="0" value="${insById(sel).cost}"></div></div>
    <div class="field"><label for="ib-sup">Proveedor (opcional)</label><input class="input" id="ib-sup" placeholder="Ej.: Tambo Las Acacias"></div>
  </div>${mFoot('Registrar compra')}`, { onInput: el => { if (el.dataset.ib) $('#ib-cost').value = insById(el.value).cost; }, submit: () => done(run(() => A.buyInsumo(fval('ib-id'), fval('ib-qty'), fval('ib-cost'), fval('ib-sup')))) });
}
function openInsWaste(id) {
  const i = insById(id);
  openModal(mHead('Registrar desperdicio', `${esc(i.name)} · hay ${fmtN(i.stock)} ${i.unit}`) + `<div class="m-body">
    <div class="field"><label for="iw-qty">Cantidad (${i.unit})</label><input type="number" class="input" id="iw-qty" min="0" step="any" autofocus></div>
    <div class="field"><label for="iw-r">Motivo</label><select class="input" id="iw-r"><option>En mal estado</option><option>Vencido</option><option>Se rompió o derramó</option><option>Prueba de receta</option><option>Otro</option></select></div>
  </div>${mFoot('Registrar')}`, { submit: () => done(run(() => A.wasteInsumo(id, fval('iw-qty'), fval('iw-r')))) });
}
function openInsMin(id) {
  const i = insById(id);
  openModal(mHead('Stock mínimo', esc(i.name)) + `<div class="m-body"><div class="field"><label for="im-v">Avisarme cuando quede menos de (${i.unit})</label><input type="number" class="input" id="im-v" min="0" step="any" value="${i.min}" autofocus></div></div>${mFoot('Guardar')}`, { submit: () => done(run(() => A.setInsumoMin(id, fval('im-v')))) });
}
function openLotOff(id) {
  const l = S.lots.find(x => x.id === id), sku = skuById(l.skuId), free = l.expires < TODAY() ? l.qty : lotFree(l);
  openModal(mHead('Dar de baja', `Lote ${esc(l.code)} · ${esc(sku.name)}`) + `<div class="m-body">
    <div class="field"><label for="lo-q">Unidades (podés dar de baja hasta ${free})</label><input type="number" class="input" id="lo-q" min="1" max="${free}" value="${free}" autofocus></div>
    <div class="field"><label for="lo-r">Motivo</label><select class="input" id="lo-r"><option ${l.expires < TODAY() ? 'selected' : ''}>Vencido</option><option>Frasco dañado</option><option>Degustación</option><option>Consumo interno</option><option>Otro</option></select></div>
    <p class="hint" style="margin:0">Solo se pueden dar de baja unidades sin reservar. Queda registrado en Movimientos con su valor a costo.</p>
  </div>${mFoot('Dar de baja')}`, { submit: () => done(run(() => A.writeOffLot(id, fval('lo-q'), fval('lo-r')))) });
}
function openSkuEdit(id) {
  const s = skuById(id);
  openModal(mHead('Receta y precio', esc(s.name)) + `<div class="m-body">
    <div class="frow"><div class="field"><label for="se-price">Precio de venta</label><input type="number" class="input" id="se-price" value="${s.price}" min="1"></div><div class="field"><label for="se-labor">Costo de elaboración por unidad</label><input type="number" class="input" id="se-labor" value="${s.labor}" min="0"></div></div>
    <div class="frow"><div class="field"><label for="se-shelf">Vida útil validada (días)</label><input type="number" class="input" id="se-shelf" value="${s.shelf}" min="1" max="60"><span class="hint">La define la elaboradora según sus pruebas. Se usa para el vencimiento de cada lote.</span></div><div class="field"><label for="se-min">Stock mínimo (unidades)</label><input type="number" class="input" id="se-min" value="${s.min}" min="0"></div></div>
    <div><div class="flabel" style="margin-bottom:8px">Insumos por unidad <span class="hint">(0 = no lleva)</span></div>
    <div class="frow3">${S.insumos.map(i => `<div class="field"><label for="se-r-${i.id}">${esc(i.name)} (${i.unit})</label><input type="number" class="input" id="se-r-${i.id}" step="any" min="0" value="${s.recipe[i.id] || 0}"></div>`).join('')}</div></div>
  </div>${mFoot('Guardar receta')}`, { wide: true, submit: () => { const recipe = {}; for (const i of S.insumos) recipe[i.id] = fval('se-r-' + i.id); done(run(() => A.updateSku(id, { price: fval('se-price'), labor: fval('se-labor'), shelf: fval('se-shelf'), min: fval('se-min'), recipe }))); } });
}
function openEvent() {
  openModal(mHead('Agregar fecha comercial', 'Se arma sola la cuenta regresiva: preparar, publicar, publicidad y último día de pedidos.') + `<div class="m-body"><div class="field"><label for="ev-n">Nombre</label><input class="input" id="ev-n" placeholder="Ej.: Día del Padre" autofocus></div><div class="field"><label for="ev-d">Fecha</label><input type="date" class="input" id="ev-d" min="${TODAY()}"></div></div>${mFoot('Agregar')}`, { submit: () => done(run(() => A.addEvent(fval('ev-n'), fval('ev-d')))) });
}
function openConfig() {
  const c = S.config;
  openModal(mHead('Configuración', 'Datos de la marca y de la demostración.') + `<div class="m-body">
    <div class="frow"><div class="field"><label for="cf-brand">Nombre del negocio</label><input class="input" id="cf-brand" value="${esc(c.brand)}"></div><div class="field"><label for="cf-tag">Bajada</label><input class="input" id="cf-tag" value="${esc(c.tagline)}"></div></div>
    <div class="frow"><div class="field"><label for="cf-user">Nombre de quien usa el sistema</label><input class="input" id="cf-user" value="${esc(c.user)}"></div><div class="field"><label for="cf-role">Rol</label><input class="input" id="cf-role" value="${esc(c.role)}"></div></div>
    <div class="card flat tight" style="background:var(--surface-2);display:flex;flex-direction:column;gap:10px">
      <b>Fecha de la demostración</b>
      <p class="hint" style="margin:0">Todos los datos ficticios se calculan desde esta fecha. En modo automático, cada día nuevo la demo se regenera para que “hoy” siempre tenga pedidos.</p>
      <div class="frow" style="align-items:end"><div class="field"><label for="cf-mode">Modo</label><select class="input" id="cf-mode"><option value="auto" ${!c.fixedDate ? 'selected' : ''}>Automático (hoy)</option><option value="fixed" ${c.fixedDate ? 'selected' : ''}>Fecha fija</option></select></div><div class="field"><label for="cf-date">Fecha fija</label><input type="date" class="input" id="cf-date" value="${c.fixedDate || TODAY()}"></div></div>
      <span class="hint">Cambiar la fecha vuelve a generar los datos de la demo.</span>
    </div>
    <div class="card flat tight" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>Restablecer demo</b><div class="hint">Borra los cambios hechos en esta presentación y vuelve a los datos iniciales.</div></div><button type="button" class="btn danger" data-act="reset">${ic('refresh', 'sm')}Restablecer</button></div>
  </div>${mFoot('Guardar')}`, {
    submit: () => {
      const mode = fval('cf-mode'), fd = fval('cf-date');
      const brand = fval('cf-brand').trim(), user = fval('cf-user').trim();
      if (!brand || !user) { toast('El nombre del negocio y del usuario no pueden quedar vacíos.', 'err'); return; }
      Object.assign(S.config, { brand, tagline: fval('cf-tag').trim(), user, role: fval('cf-role').trim() });
      const newFixed = mode === 'fixed' ? fd : null;
      if (newFixed !== (c.fixedDate || null)) { const cfg = Object.assign({}, S.config, { fixedDate: newFixed }); seed(newFixed || realToday(), cfg); persist(); closeModal(); render(); toast('Demo regenerada para el ' + fmtDate(TODAY())); return; }
      done(run(() => 'Configuración guardada'));
    }
  });
}
function openMore() {
  const b = navBadges();
  openModal(mHead('Menú') + `<div class="m-body"><nav class="nav">${NAV.map(([id, l, icn]) => `<a href="#${id}" data-act="close" class="${U.view === id ? 'on' : ''}">${ic(icn)}<span>${l}</span>${b[id] || ''}</a>`).join('')}</nav>
  <div class="user">${`<span class="avatar">${initials(S.config.user)}</span>`}<div style="min-width:0"><b>${esc(S.config.user)}</b><small>${esc(S.config.role)}</small></div><span class="demo-pill" style="margin-left:auto"><i></i>Modo demostración</span></div>
  <button type="button" class="btn soft block" data-act="tour">${ic('info', 'sm')}¿Cómo funciona? Ver el recorrido</button><div class="frow"><button type="button" class="btn" data-act="theme">${ic(isDark() ? 'sun' : 'moon', 'sm')}${isDark() ? 'Modo claro' : 'Modo oscuro'}</button><button type="button" class="btn" data-act="config">${ic('gear', 'sm')}Configuración</button></div></div>`);
}

/* ---------- Tema ---------- */
function isDark() { return document.documentElement.classList.contains('dark'); }
function toggleTheme() { const t = isDark() ? 'light' : 'dark'; document.documentElement.classList.toggle('dark', t === 'dark'); try { localStorage.setItem('lg-theme', t); } catch (e) { } render(); }

/* ---------- Armado de pantalla ---------- */
const brandHtml = (compact) => S.config.brand.trim().toLowerCase() === 'la griega'
  ? `<div class="brand"><span class="brand-logo"><img src="${LOGO}" alt="La Griega"></span>${compact ? '' : `<div class="brand-tag">${esc(S.config.tagline)}</div>`}</div>`
  : `<div class="brand"><span class="brand-mark">${esc(S.config.brand.trim().charAt(0).toUpperCase())}</span><div><div class="brand-name">${esc(S.config.brand)}</div>${compact ? '' : `<div class="brand-tag">${esc(S.config.tagline)}</div>`}</div></div>`;
function renderChrome() {
  const b = navBadges(), dark = isDark();
  $('#side').innerHTML = `${brandHtml()}<nav class="nav" aria-label="Secciones">${NAV.map(([id, l, icn]) => `<a href="#${id}" class="${U.view === id ? 'on' : ''}" ${U.view === id ? 'aria-current="page"' : ''}>${ic(icn)}<span>${l}</span>${b[id] || ''}</a>`).join('')}</nav>
    <div class="side-cta"><button class="btn primary lg block" data-act="new-order">${ic('plus')}Nuevo pedido</button></div>
    <button class="side-gri" data-act="gri-open" data-tour="gri">${griAvatar('md')}<span><b>Preguntale a Gri</b><small>Tu asistente</small></span></button>
    <div class="side-foot"><button class="btn soft block" data-act="tour">${ic('info', 'sm')}¿Cómo funciona?</button><span class="demo-pill" style="align-self:flex-start"><i></i>Modo demostración</span>
      <div class="user"><span class="avatar">${esc(initials(S.config.user))}</span><div style="min-width:0"><b>${esc(S.config.user)}</b><small>${esc(S.config.role)}</small></div></div>
      <div class="side-tools"><button class="btn sm" data-act="theme">${ic(dark ? 'sun' : 'moon', 'sm')}${dark ? 'Claro' : 'Oscuro'}</button><button class="btn sm" data-act="config">${ic('gear', 'sm')}Ajustes</button></div></div>`;
  $('#topbar').innerHTML = `${brandHtml(true)}<div class="t-end"><span class="demo-pill"><i></i>Demo</span><button class="top-gri" data-act="gri-open" data-tour="gri" aria-label="Preguntale a Gri">${griAvatar('sm')}</button><button class="btn icon sm ghost" data-act="tour" aria-label="¿Cómo funciona?">${ic('info', 'sm')}</button><button class="btn icon sm ghost" data-act="theme" aria-label="Cambiar tema">${ic(dark ? 'sun' : 'moon', 'sm')}</button><button class="btn icon sm ghost" data-act="config" aria-label="Configuración">${ic('gear', 'sm')}</button></div>`;
  const bn = (id, l, icn) => `<a href="#${id}" class="${U.view === id ? 'on' : ''}">${ic(icn)}<span>${l}</span>${b[id] ? b[id].replace('class="badge', 'class="badge bn-badge') : ''}</a>`;
  $('#bnav').innerHTML = bn('inicio', 'Inicio', 'home') + bn('pedidos', 'Pedidos', 'orders') + `<button class="plus" data-act="new-order" aria-label="Nuevo pedido">${ic('plus')}</button>` + bn('envios', 'Envíos', 'truck') + `<button data-act="more" class="${['produccion', 'inventario', 'ventas', 'cobrar', 'clientes', 'estrategia'].includes(U.view) ? 'on' : ''}">${ic('menu')}<span>Más</span></button>`;
}
function render() {
  const ae = document.activeElement, fid = ae && ae.id && !ae.closest('#overlay-root') ? ae.id : null;
  let sel = null; try { if (fid && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) { }
  renderChrome();
  try { $('#main').innerHTML = (VIEWS[U.view] || vInicio)(); }
  catch (e) { console.error(e); $('#main').innerHTML = `<div class="wrap"><div class="card"><h2 class="serif">No se pudo mostrar esta sección</h2><p class="muted">${esc(e.message)}</p><button class="btn primary" data-act="reset">Restablecer demo</button></div></div>`; }
  if (U.gri.open && !(ae && ae.closest && ae.closest('#gri-panel'))) griRenderPanel();
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
}
function go(view) { if (location.hash !== '#' + view) location.hash = view; else { U.view = view; render(); } }

/* ---------- Acciones de interfaz ---------- */
const backTo = el => el && el.dataset.back && M.ctx && M.ctx.order ? (id => () => openOrder(id))(M.ctx.order) : null;
const ACT = {
  close: () => closeModal(),
  go: a => { closeModal(); go(a); },
  'new-order': a => { closeModal(); openOrderForm(null, a || null); },
  order: a => openOrder(a),
  'edit-order': a => { closeModal(); openOrderForm(a); },
  'cancel-order': a => { const o = orderById(a); openConfirm(`Cancelar pedido #${o.number}`, `Se libera el stock reservado y el pedido deja de contar en ventas y cobros.${paidOf(o) ? ' Ya cobraste ' + money(paidOf(o)) + ': la devolución se registra por fuera.' : ''}`, 'Cancelar pedido', () => A.cancelOrder(a), true); },
  move: (a, el) => { const back = backTo(el); const ok = run(() => A.moveOrder(a, el.dataset.to)); if (ok && back) { closeModal(); back(); } },
  'go-ship': a => { const o = orderById(a); closeModal(); U.env.date = o.deliveryDate === TODAY() ? 'hoy' : o.deliveryDate === addDays(TODAY(), 1) ? 'manana' : o.deliveryDate; go('envios'); },
  pay: (a, el) => { const back = backTo(el); openPay(a, back); },
  'pm-quick': a => { $('#pm-amount').value = a; },
  'pm-method': (a, el) => { M.ctx.method = a; el.parentElement.querySelectorAll('.opt').forEach(b => b.classList.toggle('on', b === el)); },
  'copy-route': () => {
    const D = TODAY(); const date = U.env.date === 'hoy' ? D : U.env.date === 'manana' ? addDays(D, 1) : U.env.date;
    const list = S.orders.filter(o => !o.cancelled && o.ship && o.deliveryDate === date && o.ship.status !== 'entregado').sort((a, b) => a.slot.localeCompare(b.slot));
    if (!list.length) { toast('No hay envíos pendientes para ese día.', 'err'); return; }
    const txt = `HOJA DE RUTA · ${fmtLong(date)}\n\n` + list.map(o => { const a = orderAddr(o), bal = balanceOf(o); return `${o.slot} · #${o.number} ${clientById(o.clientId).name}\n${a.address}, ${a.barrio}${a.ref ? ' (' + a.ref + ')' : ''}\n${itemsText(o)}\n${DELIVERY[o.delivery]} · ${STATUS[o.status]}${bal > 0 ? ' · cobrar ' + money(bal) + ' ' + o.payMethod : ' · pagado'}`; }).join('\n\n') + `\n\nTotal: ${list.length} envíos`;
    copyText(txt, 'Hoja de ruta copiada (' + list.length + ' envíos)');
  },
  'copy-ship': a => copyText(shipText(orderById(a)), 'Datos del pedido copiados'),
  uber: a => { copyText(shipText(orderById(a)), 'Datos copiados. Se abrió Uber en otra pestaña.'); },
  'ship-assign': a => openAssign(a),
  'ship-pickup': a => run(() => A.shipPickup(a)),
  'ship-deliver': a => run(() => A.shipDeliver(a)),
  'ship-incident': a => openIncident(a),
  'ship-resolve': a => run(() => A.shipResolve(a, false)),
  'ship-retry': a => run(() => A.shipResolve(a, true)),
  'env-date': a => { U.env.date = a; render(); },
  'env-done': () => { U.env.showDone = !U.env.showDone; render(); },
  'ped-date': a => { U.ped.date = a; render(); },
  'ped-mob': a => { U.ped.mob = a; render(); },
  'prod-tab': a => { U.prod.tab = a; render(); },
  'po-new': (a, el) => { closeModal(); openPONew(a || null, el && el.dataset.qty ? +el.dataset.qty : null); },
  'po-start': a => run(() => A.startPO(a)),
  'po-advance': a => run(() => 'Etapa: ' + A.advancePO(a)),
  'po-finish': a => openPOFinish(a),
  'po-cancel': a => openConfirm('Cancelar orden', 'La orden se cierra sin crear lote ni consumir insumos.', 'Cancelar orden', () => A.cancelPO(a), true),
  'sim-reset': () => { U.sim.milk = null; render(); },
  'sim-save': () => { run(() => A.setInsumoCost('leche', U.sim.milk)); U.sim.milk = null; render(); },
  'sku-edit': a => openSkuEdit(a),
  'inv-tab': a => { U.inv.tab = a; render(); },
  'ins-buy': a => openInsBuy(a || null),
  'ins-waste': a => openInsWaste(a),
  'ins-min': a => openInsMin(a),
  'ins-hist': a => { U.inv.tab = 'movimientos'; U.inv.mv = a; go('inventario'); render(); },
  'lot-off': a => openLotOff(a),
  'ven-p': a => { U.ven.period = a; U.ven.all = false; if (a === 'rango' && !U.ven.from) { U.ven.from = addDays(TODAY(), -13); U.ven.to = TODAY(); } render(); },
  'ven-b': a => { U.ven.basis = a; render(); },
  'ven-all': () => { U.ven.all = !U.ven.all; render(); },
  'day-sales': a => { U.ven.period = 'rango'; U.ven.from = a; U.ven.to = a; go('ventas'); },
  'cob-h': a => { U.cob.hist = a; render(); },
  'cli-tag': a => { U.cli.tag = a; closeModal(); if (U.view !== 'clientes') go('clientes'); else render(); },
  client: a => openClient(a),
  'copy-wa': a => { const c = clientById(a); copyText(waMessage(c, clientStats(c)), 'Mensaje copiado. Pegalo en WhatsApp.'); },
  'copy-phone': a => copyText(clientById(a).phone, 'Teléfono copiado'),
  'ev-new': () => openEvent(),
  config: () => { closeModal(); openConfig(); },
  theme: () => toggleTheme(),
  more: () => openMore(),
  reset: () => openConfirm('Restablecer demo', 'Se borran los pedidos, cobros y cambios que hiciste en esta demostración y se vuelve a los datos iniciales.', 'Restablecer', () => { const cfg = Object.assign({}, S.config); seed(cfg.fixedDate || realToday(), cfg); U.sim.milk = null; return 'Demo restablecida'; }, true),
  /* formulario de pedido */
  'nf-flavor': a => { DR.b.flavor = a; DR.b.tops = []; $('#nf-builder').innerHTML = builderHtml(); },
  'nf-size': a => { DR.b.size = +a; $('#nf-builder').innerHTML = builderHtml(); },
  'nf-q': a => { DR.b.qty = Math.max(1, DR.b.qty + +a); $('#nf-builder').innerHTML = builderHtml(); },
  'nf-top': a => { const t = DR.b.tops; DR.b.tops = t.includes(a) ? t.filter(x => x !== a) : t.concat(a); $('#nf-builder').innerHTML = builderHtml(); },
  'nf-add': () => {
    const sku = S.skus.find(s => s.flavor === DR.b.flavor && s.size === DR.b.size);
    const key = DR.b.tops.slice().sort().join(',');
    const same = DR.items.find(i => i.skuId === sku.id && i.toppings.slice().sort().join(',') === key);
    if (same) same.qty += DR.b.qty; else DR.items.push({ skuId: sku.id, qty: DR.b.qty, toppings: DR.b.tops.slice() });
    DR.b.qty = 1; DR.b.tops = [];
    $('#nf-builder').innerHTML = builderHtml(); $('#nf-items').innerHTML = itemsHtml(); $('#nf-total').innerHTML = totalHtml();
  },
  'nf-rm': a => { DR.items.splice(+a, 1); $('#nf-builder').innerHTML = builderHtml(); $('#nf-items').innerHTML = itemsHtml(); $('#nf-total').innerHTML = totalHtml(); },
  'nf-del': a => { DR.delivery = a; if (a === 'moto') { DR.shipPaidBy = 'negocio'; DR.shipCost = 2500; } else if (a === 'uber') { DR.shipPaidBy = 'cliente'; const c = clientById(DR.clientId); DR.shipCost = c && BARRIO_UBER[c.barrio] || 3500; } rerenderForm(); },
  'nf-paidby': a => { DR.shipPaidBy = a; rerenderForm(); },
  'nf-pay': a => { DR.payMethod = a; rerenderForm(); },
};

Object.assign(ACT, GRI_ACT, TOUR_ACT, UI2_ACT, ONB_ACT);

/* ---------- Arrastrar y soltar ---------- */
const DRAG = { s: null, suppress: false };
function dragStart() {
  const d = DRAG.s; if (!d || d.started) return;
  d.started = true;
  const r = d.card.getBoundingClientRect();
  d.ox = d.x - r.left; d.oy = d.y - r.top;
  d.ghost = d.card.cloneNode(true); d.ghost.classList.add('drag-ghost'); d.ghost.style.width = r.width + 'px';
  d.ghost.style.left = r.left + 'px'; d.ghost.style.top = r.top + 'px';
  document.body.appendChild(d.ghost); d.card.classList.add('drag-src');
  if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
}
function dropTarget(x, y) { const el = document.elementFromPoint(x, y); return el && el.closest('[data-drop]'); }
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('[data-drag]');
  if (!card || e.target.closest('button,a,input,select') || e.button > 0) return;
  DRAG.s = { card, id: card.dataset.drag, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', started: false };
  if (DRAG.s.touch) DRAG.s.timer = setTimeout(dragStart, 380);
});
document.addEventListener('pointermove', e => {
  const d = DRAG.s; if (!d) return;
  const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
  if (!d.started) { if (d.touch) { if (dist > 8) { clearTimeout(d.timer); DRAG.s = null; } return; } if (dist > 6) dragStart(); else return; }
  d.ghost.style.left = (e.clientX - d.ox) + 'px'; d.ghost.style.top = (e.clientY - d.oy) + 'px';
  document.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on'));
  const t = dropTarget(e.clientX, e.clientY); if (t) t.classList.add('drop-on');
});
document.addEventListener('touchmove', e => { if (DRAG.s && DRAG.s.started) e.preventDefault(); }, { passive: false });
function endDrag(e, cancel) {
  const d = DRAG.s; if (!d) return; clearTimeout(d.timer); DRAG.s = null;
  if (!d.started) return;
  const t = !cancel && dropTarget(e.clientX, e.clientY);
  d.ghost.remove(); d.card.classList.remove('drag-src');
  document.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on'));
  DRAG.suppress = true; setTimeout(() => DRAG.suppress = false, 60);
  if (t) { const to = t.dataset.drop; if (orderById(d.id).status !== to) { if (to === 'entregado' && orderById(d.id).ship && orderById(d.id).ship.status !== 'en_camino') { toast('Los envíos se marcan entregados desde Envíos, después del retiro del conductor.', 'err'); return; } run(() => A.moveOrder(d.id, to)); } }
}
document.addEventListener('pointerup', e => endDrag(e));
document.addEventListener('pointercancel', e => endDrag(e, true));
document.addEventListener('contextmenu', e => { if (DRAG.s && DRAG.s.touch) e.preventDefault(); });

/* ---------- Eventos globales ---------- */
document.addEventListener('click', e => {
  if (DRAG.suppress) { e.preventDefault(); e.stopPropagation(); return; }
  if (e.target.closest('.qhelp, .how')) return;
  const ov = e.target.closest('[data-overlay]');
  if (ov && e.target === ov) { closeModal(); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'A' && el.dataset.act !== 'uber' && el.dataset.act !== 'close') e.preventDefault();
  fn(el.dataset.arg, el, e);
}, true);
document.addEventListener('submit', e => { e.preventDefault(); if (e.target.id === 'gri-form') { const i = $('#gri-in'); griAsk(i.value); return; } if (M.submit) M.submit(); });
document.addEventListener('input', e => {
  const el = e.target;
  if (el.closest('#mform')) { if (M.onInput) M.onInput(el); return; }
  if (el.closest('#gri-panel')) return;
  const k = el.dataset.input; if (!k) return;
  if (k === 'ped-q') U.ped.q = el.value;
  else if (k === 'cli-q') U.cli.q = el.value;
  else if (k === 'sim-milk') U.sim.milk = Math.max(1, Math.round(+el.value || 0));
  else if (k === 'est-packs') U.est.packs = +el.value;
  else if (k === 'est-disc') U.est.disc = +el.value;
  render();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.closest('#mform')) { if (M.onInput && el.tagName === 'SELECT') M.onInput(el); return; }
  const k = el.dataset.change; if (!k) return;
  if (k === 'ped-state') U.ped.state = el.value;
  else if (k === 'env-day') U.env.date = el.value || 'hoy';
  else if (k === 'mv-f') U.inv.mv = el.value;
  else if (k === 'ven-from') U.ven.from = el.value;
  else if (k === 'ven-to') U.ven.to = el.value;
  render();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#overlay-root').innerHTML) closeModal();
  else if (e.key === 'Escape' && U.gri.open) ACT['gri-close']();
  if (e.key === 'Enter' && e.target.matches && e.target.matches('.ocard')) openOrder(e.target.dataset.arg);
});
/* Tooltips de gráficos */
const tip = () => $('#tip');
document.addEventListener('pointerover', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { tip().classList.remove('on'); return; }
  const r = el.getBoundingClientRect();
  tip().textContent = el.dataset.tip;
  tip().style.left = clamp(r.left + r.width / 2, 90, innerWidth - 90) + 'px'; tip().style.top = r.top + 'px';
  tip().classList.add('on');
});
document.addEventListener('scroll', () => tip().classList.remove('on'), true);

window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS[v]) { U.view = v; closeModal(); render(); scrollTo(0, 0); } });

/* ---------- Arranque ---------- */
(function boot() {
  try { document.documentElement.classList.toggle('dark', localStorage.getItem('lg-theme') === 'dark'); } catch (e) { }
  const saved = loadState();
  if (saved && (saved.config.fixedDate || saved.demoDate === realToday())) { S = saved; S.ideas = S.ideas || {}; S.flavors = S.flavors || {}; S.onboard = S.onboard || { products: true, stock: false, clients: false, order: false }; Object.assign(FLAVORS, S.flavors); LOG_RES = false; rebalance(); LOG_RES = true; }
  else seed(saved && saved.config.fixedDate ? saved.config.fixedDate : realToday(), saved ? saved.config : null);
  persist();
  const v = location.hash.slice(1); if (VIEWS[v]) U.view = v;
  else if (!tourSeen()) { markSeen(); U.view = 'bienvenida'; }
  render();
  griRenderPanel();
})();
