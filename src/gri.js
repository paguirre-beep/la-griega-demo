'use strict';
/* =====================================================================
   gri.js — Gri, la asistente de La Griega.
   Motor local: lee el estado real de la demo y arma recomendaciones y respuestas
   con reglas. No llama a ninguna IA.

   Para integrar una IA más adelante:
   - griContext() ya devuelve un resumen estructurado del negocio.
   - GRI_ENGINE.ask(pregunta) es el único punto de entrada del chat. Se puede reemplazar
     por una llamada a un backend propio que reciba { pregunta, contexto: griContext() }
     y devuelva { html, actions }. Las acciones siguen pasando por ACT y A.*, con las
     mismas validaciones y confirmaciones que usa la interfaz.
   ===================================================================== */

const LEVELS = {
  urgente: { label: 'Urgente', tone: 'bad', rank: 0 },
  hoy: { label: 'Para resolver hoy', tone: 'warn', rank: 1 },
  oportunidad: { label: 'Oportunidad', tone: 'good', rank: 2 },
  info: { label: 'Para tener en cuenta', tone: 'info', rank: 3 },
};
const fname = c => c.biz ? c.name : c.name.split(' ')[0];
const joinList = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const pl = (n, s, p) => n === 1 ? s : (p || s + 's');
const nowHour = () => new Date().getHours() + new Date().getMinutes() / 60;
const slotH = s => +s.slice(0, 2);
const missMap = orders => { const m = {}; for (const o of orders) { const s = shortage(o); for (const k in s) m[k] = (m[k] || 0) + s[k]; } return m; };
const skuList = m => Object.keys(m).map(k => m[k] + ' × ' + skuShort(skuById(k)));
const B = s => '<b>' + esc(s) + '</b>';

/* ---------- Recomendaciones priorizadas ---------- */
function griRecs() {
  const D = TODAY(), out = [], name = esc(S.config.user);
  const open = S.orders.filter(isOpen);
  const today = open.filter(o => o.deliveryDate <= D);
  const plan = productionPlan();
  const sched = {}; for (const p of plan) sched[p.sku.id] = p.scheduled;

  /* Incidencias de envío */
  for (const o of open.filter(o => o.ship && o.ship.incident)) {
    const c = clientById(o.clientId);
    out.push({ id: 'inc-' + o.id, level: 'urgente', score: 100, icon: 'alert', short: 'una incidencia en un envío', ask: '¿Vemos primero la incidencia del envío?',
      text: `El envío de ${B(fname(c))} (#${o.number}) tuvo un problema: ${esc(o.ship.incident.type.toLowerCase())}. Conviene resolverlo antes de que se corra el horario.`,
      actions: [{ label: 'Ver envío', act: 'go-ship', arg: o.id, primary: true }, { label: 'Llamar: copiar teléfono', act: 'copy-phone', arg: c.id }] });
  }

  /* Pedidos de días anteriores que siguen abiertos */
  const lateDel = open.filter(o => o.deliveryDate < D);
  if (lateDel.length) out.push({ id: 'late', level: 'urgente', score: 95, icon: 'clock', short: pl(lateDel.length, 'un pedido atrasado', lateDel.length + ' pedidos atrasados'), ask: '¿Arrancamos por los pedidos atrasados?',
    text: `${lateDel.length === 1 ? 'Hay un pedido que tenía' : `Hay ${lateDel.length} pedidos que tenían`} que salir antes de hoy y ${pl(lateDel.length, 'sigue abierto', 'siguen abiertos')}: ${esc(joinList(lateDel.map(o => '#' + o.number + ' de ' + fname(clientById(o.clientId)))))}. Avisale al cliente y reprogramalo.`,
    actions: [{ label: 'Ver pedidos', act: 'go', arg: 'pedidos', primary: true }] });

  /* Stock para las entregas de hoy */
  const shortToday = today.filter(o => !fullyReserved(o));
  const missToday = missMap(shortToday);
  const uncovered = {}; for (const k in missToday) { const u = missToday[k] - (sched[k] || 0); if (u > 0) uncovered[k] = u; }
  const needAll = plan.filter(p => p.need > 0), forOrders = sum(needAll, p => p.forOrders), forStock = sum(needAll, p => p.forStock);
  if (Object.keys(uncovered).length) {
    const first = shortToday.slice().sort((a, b) => a.slot.localeCompare(b.slot))[0];
    out.push({ id: 'short-today', level: 'urgente', score: 90, icon: 'pot', short: `faltan ${sum(Object.values(uncovered))} unidades para las entregas de hoy`, ask: '¿Te preparo la lista de producción?',
      text: `${name}, para entregar hoy nos faltan ${esc(joinList(skuList(uncovered)))}. Afecta ${shortToday.length === 1 ? 'el pedido de ' + B(fname(clientById(first.clientId))) : shortToday.length + ' pedidos'}, el primero sale a las ${slotStart(first.slot)}.${needAll.length ? ` En total hay que producir ${forOrders + forStock} unidades.` : ''} ¿Querés que te prepare la lista?`,
      actions: [{ label: 'Preparar lista de producción', act: 'gri-prodlist', primary: true }, { label: 'Ver producción', act: 'go', arg: 'produccion' }] });
  } else if (needAll.length) {
    out.push({ id: 'prod', level: forOrders ? 'hoy' : 'oportunidad', score: 80, icon: 'pot', short: forOrders ? `faltan ${forOrders} unidades por producir` : 'reponer stock mínimo', ask: '¿Te preparo la lista de producción?',
      text: forOrders ? `${name}, para completar los pedidos confirmados necesitamos producir ${B(forOrders + ' ' + pl(forOrders, 'unidad', 'unidades'))}${forStock ? ` y ${forStock} más para llegar a tu stock mínimo` : ''}. ¿Querés que te prepare la lista?`
        : `Los pedidos están cubiertos. Si producís ${forStock} unidades más, llegás al stock mínimo que configuraste.`,
      actions: [{ label: 'Preparar lista de producción', act: 'gri-prodlist', primary: true }] });
  }
  if (Object.keys(missToday).length && !Object.keys(uncovered).length) {
    const inProg = S.prodOrders.filter(p => (p.status === 'en_curso' || p.status === 'programada') && missToday[p.skuId]);
    out.push({ id: 'wait-prod', level: 'info', score: 40, icon: 'pot', short: '',
      text: `Los pedidos de hoy que esperan stock quedan cubiertos con ${esc(joinList(inProg.map(p => p.qty + ' × ' + skuShort(skuById(p.skuId)) + (p.status === 'en_curso' ? ' (en ' + STAGES[p.stage].toLowerCase() + ')' : ' (programada)'))))}. Cuando la finalices, las unidades se reservan solas.`,
      actions: [{ label: 'Ir a producción', act: 'go', arg: 'produccion', primary: true }] });
  }
  const pending = S.prodOrders.filter(p => p.status === 'programada' && p.date <= D);
  if (pending.length && !needAll.length) out.push({ id: 'prog', level: 'hoy', score: 70, icon: 'pot', short: pl(pending.length, 'una orden de producción sin arrancar', pending.length + ' órdenes de producción sin arrancar'), ask: '¿Arrancamos con la producción?',
    text: `Tenés ${pending.length === 1 ? 'una orden programada' : pending.length + ' órdenes programadas'} para hoy sin arrancar: ${esc(joinList(pending.map(p => p.qty + ' × ' + skuShort(skuById(p.skuId)))))}.`,
    actions: [{ label: 'Ir a producción', act: 'go', arg: 'produccion', primary: true }] });

  /* Envíos listos para pedir */
  const ready = today.filter(o => o.ship && o.ship.status === 'pendiente' && o.status === 'listo').sort((a, b) => a.slot.localeCompare(b.slot));
  if (ready.length) {
    const soon = slotH(ready[0].slot) <= nowHour() + 1;
    const o = ready[0], c = clientById(o.clientId);
    out.push({ id: 'uber', level: soon ? 'urgente' : 'hoy', score: soon ? 92 : 85, icon: 'car', short: ready.length === 1 ? 'un pedido listo para pedir Uber' : ready.length + ' pedidos listos para pedir Uber', ask: '¿Empezamos por los envíos?',
      text: ready.length === 1 ? `El pedido de ${B(fname(c))} ya está listo y sale a las ${slotStart(o.slot)}. Te preparé los datos para que puedas solicitar el ${o.delivery === 'uber' ? 'Uber' : 'envío'}.`
        : `${ready.length} pedidos ya están listos para salir: ${esc(joinList(ready.map(x => fname(clientById(x.clientId)) + ' (' + slotStart(x.slot) + ')')))}. Te armé la hoja de ruta para pedir los Uber.`,
      actions: ready.length === 1 ? [{ label: 'Copiar datos para Uber', act: 'copy-ship', arg: o.id, primary: true }, { label: 'Ir a envíos', act: 'go-ship', arg: o.id }]
        : [{ label: 'Copiar hoja de ruta', act: 'gri-route', primary: true }, { label: 'Ir a envíos', act: 'go', arg: 'envios' }] });
  }

  /* Insumos */
  const low = S.insumos.filter(i => i.stock < i.min);
  const needIns = {}; for (const p of needAll) for (const k in p.sku.recipe) needIns[k] = (needIns[k] || 0) + p.sku.recipe[k] * p.need;
  for (const p of S.prodOrders.filter(p => p.status === 'programada' || p.status === 'en_curso')) { const s = skuById(p.skuId); for (const k in s.recipe) needIns[k] = (needIns[k] || 0) + s.recipe[k] * p.qty; }
  const blocking = S.insumos.filter(i => (needIns[i.id] || 0) > i.stock + 1e-9);
  for (const i of blocking) out.push({ id: 'ins-block-' + i.id, level: 'urgente', score: 88, icon: 'bag', short: `no alcanza ${i.name.toLowerCase()}`, ask: '¿Registramos la compra?',
    text: `Con lo que hay que producir no alcanza ${B(i.name.toLowerCase())}: necesitamos ${fmtN(needIns[i.id])} ${i.unit} y hay ${fmtN(i.stock)} ${i.unit}.`,
    actions: [{ label: 'Registrar compra', act: 'ins-buy', arg: i.id, primary: true }] });
  const lowOnly = low.filter(i => !blocking.includes(i));
  if (lowOnly.length === 1) { const i = lowOnly[0]; out.push({ id: 'ins-' + i.id, level: 'hoy', score: 60, icon: 'bag', short: `${i.name.toLowerCase()} por debajo del mínimo`, ask: '',
    text: `Nos estamos quedando sin ${B(i.name.toLowerCase())}. Tenemos ${fmtN(i.stock)} ${i.unit} y el mínimo configurado es ${fmtN(i.min)} ${i.unit}. Te recomiendo revisar si necesitamos comprar.`,
    actions: [{ label: 'Registrar compra', act: 'ins-buy', arg: i.id, primary: true }, { label: 'Ver insumos', act: 'gri-ins' }] }); }
  else if (lowOnly.length > 1) out.push({ id: 'ins-many', level: 'hoy', score: 60, icon: 'bag', short: 'insumos por debajo del mínimo', ask: '',
    text: `Hay ${lowOnly.length} insumos por debajo del mínimo: ${esc(joinList(lowOnly.map(i => i.name.toLowerCase() + ' (' + fmtN(i.stock) + ' ' + i.unit + ')')))}. Te recomiendo armar la compra.`,
    actions: [{ label: 'Ver insumos', act: 'gri-ins', primary: true }] });

  /* Vencimientos */
  const expLots = S.lots.filter(l => l.qty > 0 && l.expires < D), expU = sum(expLots, l => l.qty);
  if (expU) out.push({ id: 'expired', level: 'hoy', score: 55, icon: 'trash', short: `${expU} ${pl(expU, 'unidad vencida', 'unidades vencidas')}`, ask: '',
    text: `Hay ${B(expU + ' ' + pl(expU, 'unidad vencida', 'unidades vencidas'))} (${esc(joinList(expLots.map(l => l.code)))}). No se usan en ningún pedido. ¿Las doy de baja para que el stock quede al día?`,
    actions: [{ label: 'Dar de baja', act: 'gri-writeoff', primary: true }, { label: 'Ver lotes', act: 'go', arg: 'inventario' }] });
  const soonLots = S.lots.filter(l => l.qty > 0 && lotState(l) === 'proximo');
  const soonFree = sum(soonLots, l => lotFree(l)), soonRes = sum(soonLots, l => lotReserved(l));
  if (soonFree > 0) out.push({ id: 'soon', level: 'oportunidad', score: 50, icon: 'clock', short: `${soonFree} unidades por vencer`, ask: '',
    text: `Tenés ${B(soonFree + ' ' + pl(soonFree, 'unidad', 'unidades'))} que vencen en los próximos días y no están reservadas (${esc(joinList(soonLots.filter(l => lotFree(l) > 0).map(l => lotFree(l) + ' × ' + skuShort(skuById(l.skuId)))))}). Podrías ofrecerlas con un topping de regalo antes de perderlas.`,
    actions: [{ label: 'Copiar mensaje de promo', act: 'gri-promo', primary: true }, { label: 'Ver lotes', act: 'go', arg: 'inventario' }] });
  else if (soonRes > 0) out.push({ id: 'soon-ok', level: 'info', score: 20, icon: 'clock', short: '',
    text: `Las ${soonRes} unidades que vencen pronto ya están reservadas para pedidos de esta semana. Salen antes de vencer.`, actions: [{ label: 'Ver lotes', act: 'go', arg: 'inventario' }] });

  /* Cobros */
  const owedLate = S.orders.filter(o => balanceOf(o) > 0 && o.deliveryDate < D).sort((a, b) => balanceOf(b) - balanceOf(a));
  if (owedLate.length) { const c = clientById(owedLate[0].clientId);
    out.push({ id: 'owed', level: 'hoy', score: 58, icon: 'wallet', short: `${money(sum(owedLate, balanceOf))} por cobrar de días anteriores`, ask: '¿Revisamos los cobros?',
      text: `${B(fname(c))}${owedLate.length > 1 ? ` y ${owedLate.length - 1} ${pl(owedLate.length - 1, 'cliente más', 'clientes más')}` : ''} te ${owedLate.length > 1 ? 'deben' : 'debe'} ${B(money(sum(owedLate, balanceOf)))} de entregas anteriores. ¿Revisamos los cobros?`,
      actions: [{ label: 'Ver cobros', act: 'go', arg: 'cobrar', primary: true }] }); }
  const cashToday = today.filter(o => balanceOf(o) > 0);
  if (cashToday.length) out.push({ id: 'cash', level: 'info', score: 30, icon: 'cash', short: '',
    text: `En las entregas de hoy quedan por cobrar ${B(money(sum(cashToday, balanceOf)))} en ${cashToday.length} ${pl(cashToday.length, 'pedido')}: ${money(sum(cashToday.filter(o => o.payMethod === 'efectivo'), balanceOf))} en efectivo y el resto por transferencia.`,
    actions: [{ label: 'Ver cobros', act: 'go', arg: 'cobrar' }] });

  /* Clientes */
  computeVip();
  const reco = S.clients.map(c => ({ c, st: clientStats(c) })).filter(x => clientTags(x.c, x.st).includes('recompra')).sort((a, b) => b.st.total - a.st.total);
  if (reco.length) out.push({ id: 'reco', level: 'oportunidad', score: 45, icon: 'users', short: '',
    text: `${esc(joinList(reco.slice(0, 3).map(x => fname(x.c))))}${reco.length > 3 ? ` y ${reco.length - 3} más` : ''} ${reco.length === 1 ? 'suele' : 'suelen'} pedir por esta fecha y todavía no lo ${reco.length === 1 ? 'hizo' : 'hicieron'}. Un mensaje a tiempo puede traer el pedido de la semana.`,
    actions: [{ label: 'Copiar mensaje para ' + fname(reco[0].c), act: 'copy-wa', arg: reco[0].c.id, primary: true }, { label: 'Ver clientes', act: 'cli-tag', arg: 'recompra' }] });

  /* Mañana y envíos en curso */
  const tom = open.filter(o => o.deliveryDate === addDays(D, 1));
  if (tom.length) out.push({ id: 'tomorrow', level: 'info', score: 25, icon: 'calendar', short: '',
    text: `Mañana tenés ${tom.length} ${pl(tom.length, 'pedido')} para entregar por ${money(sum(tom, o => o.total))}${tom.some(o => !fullyReserved(o)) ? `. ${tom.filter(o => !fullyReserved(o)).length} todavía esperan producción` : ', con todo el stock reservado'}.`,
    actions: [{ label: 'Ver pedidos de mañana', act: 'gri-tomorrow' }] });
  const moving = today.filter(o => o.ship && (o.ship.status === 'solicitado' || o.ship.status === 'en_camino'));
  if (moving.length) out.push({ id: 'moving', level: 'info', score: 22, icon: 'truck', short: '',
    text: `Envíos en curso: ${esc(joinList(moving.map(o => fname(clientById(o.clientId)) + (o.ship.status === 'en_camino' ? ' (en camino)' : ' (esperando al conductor)'))))}. Cuando entreguen, marcalo en Envíos.`,
    actions: [{ label: 'Ver envíos', act: 'go', arg: 'envios' }] });

  return out.sort((a, b) => LEVELS[a.level].rank - LEVELS[b.level].rank || b.score - a.score);
}

/* ---------- Resumen de bienvenida ---------- */
function griSummary(recs) {
  const D = TODAY(), LW = addDays(D, -7), dn = DIAS[weekday(D)];
  const tod = S.orders.filter(o => !o.cancelled && o.createdAt === D), lw = S.orders.filter(o => !o.cancelled && o.createdAt === LW);
  const sales = sum(tod, o => o.total), prev = sum(lw, o => o.total);
  let p1;
  if (!sales) p1 = 'Todavía no entró ninguna venta hoy.';
  else if (!prev) p1 = `Ya vendiste ${B(money(sales))} en ${tod.length} ${pl(tod.length, 'pedido')}.`;
  else {
    const r = (sales - prev) / prev, pc = Math.abs(Math.round(r * 100));
    p1 = r >= .1 ? `Hoy venimos muy bien. Ya vendiste ${B(money(sales))}, un ${pc}% más que el ${dn} pasado.`
      : r <= -.1 ? `Ya vendiste ${B(money(sales))}, un ${pc}% menos que el ${dn} pasado. Todavía queda día.`
        : `Ya vendiste ${B(money(sales))}, parecido al ${dn} pasado.`;
  }
  const top = recs.filter(r => (r.level === 'urgente' || r.level === 'hoy') && r.short);
  let p2 = '';
  if (top.length) p2 = ` Tenés ${top.length === 1 ? 'un pendiente importante' : 'algunos pendientes importantes'}: ${esc(joinList(top.slice(0, 3).map(r => r.short)))}.`;
  const ask = top.find(r => r.ask);
  const p3 = top.length ? (ask ? ' ' + ask.ask : '') : ' No hay nada urgente. Si querés, miramos oportunidades para vender más.';
  return p1 + p2 + p3;
}

/* ---------- Contexto estructurado para una futura IA ---------- */
function griContext() {
  const D = TODAY();
  return {
    fecha: D, negocio: S.config.brand, usuaria: S.config.user,
    ventasHoy: sum(S.orders.filter(o => !o.cancelled && o.createdAt === D), o => o.total),
    pedidosAbiertos: S.orders.filter(isOpen).map(o => ({ numero: o.number, cliente: clientById(o.clientId).name, entrega: o.deliveryDate, franja: o.slot, estado: o.status, envio: o.ship ? o.ship.status : 'retiro', saldo: balanceOf(o), faltante: shortage(o) })),
    produccion: productionPlan().map(p => ({ producto: p.sku.name, producir: p.need, paraPedidos: p.forOrders, paraStock: p.forStock })),
    stock: S.skus.map(s => Object.assign({ producto: s.name }, skuStock(s.id))),
    insumosBajos: S.insumos.filter(i => i.stock < i.min).map(i => ({ insumo: i.name, stock: i.stock, minimo: i.min, unidad: i.unit })),
    recomendaciones: griRecs().map(r => ({ nivel: r.level, texto: r.text.replace(/<[^>]+>/g, '') })),
  };
}

/* ---------- Motor de preguntas (local, por reglas) ---------- */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,]/g, ' ');
function griPeriod(q) {
  const D = TODAY(), mon = addDays(D, -((weekday(D) + 6) % 7));
  if (/ayer/.test(q)) return { a: addDays(D, -1), b: addDays(D, -1), t: 'Ayer', pa: addDays(D, -8), pb: addDays(D, -8), cmp: 'el ' + DIAS[weekday(addDays(D, -1))] + ' anterior' };
  if (/semana pasada/.test(q)) return { a: addDays(mon, -7), b: addDays(mon, -1), t: 'La semana pasada' };
  if (/semana/.test(q)) return { a: mon, b: D, t: 'Esta semana', pa: addDays(mon, -7), pb: addDays(D, -7), cmp: 'los mismos días de la semana pasada' };
  if (/mes pasado/.test(q)) { const pd = new Date(toT(D.slice(0, 8) + '01') - DAY); const a = fromT(Date.UTC(pd.getUTCFullYear(), pd.getUTCMonth(), 1)); return { a, b: fromT(pd.getTime()), t: 'El mes pasado' }; }
  if (/30|ultimo mes/.test(q)) return { a: addDays(D, -29), b: D, t: 'En los últimos 30 días', pa: addDays(D, -59), pb: addDays(D, -30), cmp: 'los 30 días anteriores' };
  if (/mes/.test(q)) return { a: D.slice(0, 8) + '01', b: D, t: 'Este mes' };
  return { a: D, b: D, t: 'Hoy', pa: addDays(D, -7), pb: addDays(D, -7), cmp: 'el ' + DIAS[weekday(D)] + ' pasado' };
}
const cmpTxt = (cur, prev, label) => !prev ? '' : (() => { const r = (cur - prev) / prev; return Math.abs(r) < .05 ? ` Muy parecido a ${label}.` : ` Es un ${Math.abs(Math.round(r * 100))}% ${r > 0 ? 'más' : 'menos'} que ${label}.`; })();

const GRI_INTENTS = [
  { id: 'ayuda', match: /^(hola|buen|que (podes|sabes)|ayuda|como funciona)/, run: () => ({ html: `Hola, ${esc(S.config.user)}. Puedo contarte cómo vienen las ventas y la ganancia, qué productos te dejan más, qué pedidos faltan entregar, qué hay que producir, cuántos envíos quedan, qué vence pronto, quién te debe y qué clientes hace tiempo que no compran. Todo sale de los datos del sistema.` }) },
  { id: 'ganancia', match: /(gan[eéa]|ganancia|margen|utilidad)(?!.*rentab)/, run: q => {
    if (/producto|rentab|cual/.test(q) && !/cuanto/.test(q)) return GRI_INTENTS.find(i => i.id === 'rentables').run(q);
    const P = griPeriod(q), rows = salesIn(P.a, P.b, 'pedido'), t = sum(rows, r => r.total), g = sum(rows, r => r.profit);
    const prev = P.pa ? sum(salesIn(P.pa, P.pb, 'pedido'), r => r.profit) : 0;
    return { html: `${P.t} la ganancia bruta estimada es ${B(money(g))} sobre ${money(t)} vendidos (margen ${pctTxt(t ? g / t : 0)}).${P.cmp ? cmpTxt(g, prev, P.cmp) : ''} Es ganancia bruta: no descuenta alquiler, sueldos fijos ni impuestos.`, actions: [{ label: 'Ver ventas', act: 'go', arg: 'ventas' }] };
  } },
  { id: 'rentables', match: /rentab|conviene|mas (me )?deja|mejor(es)? producto|mas gan/, run: () => {
    const D = TODAY(), per = S.skus.map(s => { let u = 0, gp = 0; for (const o of S.orders.filter(o => !o.cancelled && o.createdAt > addDays(D, -30))) for (const it of o.items) if (it.skuId === s.id) { const f = 1 - (o.discountPct || 0) / 100; u += it.qty; gp += it.qty * (it.unitPrice * f - it.unitCost); } return { s, u, gp, m: (s.price - skuCost(s).total) / s.price }; });
    const byM = per.slice().sort((a, b) => b.m - a.m).slice(0, 3), byG = per.slice().sort((a, b) => b.gp - a.gp)[0];
    return { html: `Por margen por unidad, los más rentables son ${esc(joinList(byM.map(p => skuShort(p.s) + ' (' + pctTxt(p.m) + ')')))}. Por ganancia total en 30 días gana ${B(byG.s.name)} con ${money(byG.gp)}, porque es el que más se vende.`, actions: [{ label: 'Ver ranking', act: 'go', arg: 'estrategia' }, { label: 'Ver costos', act: 'gri-recetas' }] };
  } },
  { id: 'ventas', match: /vend|factur|venta|cuanto (entro|hice)/, run: q => {
    const P = griPeriod(q), rows = salesIn(P.a, P.b, 'pedido'), t = sum(rows, r => r.total), n = rows.length;
    const prev = P.pa ? sum(salesIn(P.pa, P.pb, 'pedido'), r => r.total) : 0;
    if (!n) return { html: `${P.t} todavía no hay ventas registradas.`, actions: [{ label: 'Nuevo pedido', act: 'new-order', primary: true }] };
    return { html: `${P.t} vendiste ${B(money(t))} en ${n} ${pl(n, 'pedido')}, con un ticket promedio de ${money(t / n)}.${P.cmp ? cmpTxt(t, prev, P.cmp) : ''}`, actions: [{ label: 'Ver ventas', act: 'go', arg: 'ventas' }] };
  } },
  { id: 'vence', match: /venc|caduc|vieja|frescos?/, run: () => {
    const soon = S.lots.filter(l => l.qty > 0 && lotState(l) === 'proximo').sort((a, b) => a.expires.localeCompare(b.expires)), exp = S.lots.filter(l => l.qty > 0 && l.expires < TODAY());
    if (!soon.length && !exp.length) return { html: 'No hay nada por vencer en los próximos 3 días.' };
    return { html: `${soon.length ? 'En los próximos 3 días vencen ' + B(joinList(soon.map(l => l.qty + ' × ' + skuShort(skuById(l.skuId)) + ' (' + fmtDate(l.expires) + ')'))) + `; ${sum(soon, lotReserved)} ya están reservadas para pedidos.` : 'Nada vence en los próximos 3 días.'}${exp.length ? ` Además hay ${sum(exp, l => l.qty)} unidades vencidas para dar de baja.` : ''}`, actions: [{ label: 'Revisar lotes', act: 'go', arg: 'inventario', primary: true }].concat(exp.length ? [{ label: 'Dar de baja vencidos', act: 'gri-writeoff' }] : []) };
  } },
  { id: 'producir', match: /producir|produzco|producimos|produccion|fabric|elabor|cocinar/, run: q => {
    const D = TODAY(), plan = productionPlan().filter(p => p.need > 0);
    const active = S.prodOrders.filter(p => p.status === 'en_curso' || p.status === 'programada');
    const act = active.length ? ` Ya ${active.length === 1 ? 'hay una orden' : 'hay ' + active.length + ' órdenes'} en marcha: ${esc(joinList(active.map(p => p.qty + ' × ' + skuShort(skuById(p.skuId)) + (p.status === 'en_curso' ? ' (en curso)' : ' (programada)'))))}.` : '';
    if (/manana/.test(q)) {
      const tom = S.orders.filter(o => isOpen(o) && o.deliveryDate === addDays(D, 1));
      const m = missMap(tom);
      if (!tom.length) return { html: 'Mañana no tenés pedidos cargados todavía.' + act };
      return { html: `Para los ${tom.length} pedidos de mañana ${Object.keys(m).length ? `faltan ${B(joinList(skuList(m)))}` : 'ya está todo el stock reservado'}.${plan.length ? ` Contando también los de hoy y tu stock mínimo, conviene producir ${esc(joinList(plan.map(p => p.need + ' × ' + skuShort(p.sku))))}.` : ''}${act}`, actions: plan.length ? [{ label: 'Preparar lista de producción', act: 'gri-prodlist', primary: true }] : [{ label: 'Ver pedidos de mañana', act: 'gri-tomorrow' }] };
    }
    if (!plan.length) return { html: `No hace falta producir nada más: el stock y lo que ya está en marcha cubren los pedidos y tu stock mínimo.${act}`, actions: [{ label: 'Ir a producción', act: 'go', arg: 'produccion' }] };
    return { html: `Hay que producir ${B(joinList(plan.map(p => p.need + ' × ' + skuShort(p.sku))))}. De eso, ${sum(plan, p => p.forOrders)} son para pedidos confirmados y ${sum(plan, p => p.forStock)} para llegar al stock mínimo.${act}`, actions: [{ label: 'Preparar lista de producción', act: 'gri-prodlist', primary: true }] };
  } },
  { id: 'uber', match: /uber|envio|enviar|conductor|cadete|despach|hoja de ruta/, run: () => {
    const D = TODAY(), list = S.orders.filter(o => !o.cancelled && o.ship && o.deliveryDate === D);
    const c = st => list.filter(o => o.ship.status === st);
    const ready = c('pendiente').filter(o => o.status === 'listo'), wait = c('pendiente').filter(o => o.status !== 'listo');
    return { html: `Hoy hay ${list.length} envíos. ${ready.length ? B(ready.length + ' ' + pl(ready.length, 'listo', 'listos') + ' para pedir Uber') + ' (' + esc(joinList(ready.map(o => fname(clientById(o.clientId))))) + '), ' : 'Ninguno listo para pedir todavía, '}${wait.length} todavía en preparación, ${c('solicitado').length} con conductor asignado, ${c('en_camino').length} en camino y ${c('entregado').length} ${pl(c('entregado').length, 'entregado')}.`, actions: [{ label: 'Ir a envíos', act: 'go', arg: 'envios', primary: true }].concat(ready.length ? [{ label: 'Copiar hoja de ruta', act: 'gri-route' }] : []) };
  } },
  { id: 'entregar', match: /entreg|pendiente|faltan|pedidos/, run: q => {
    const D = TODAY(), day = /manana/.test(q) ? addDays(D, 1) : D;
    const list = S.orders.filter(o => isOpen(o) && (day === D ? o.deliveryDate <= D : o.deliveryDate === day)).sort((a, b) => a.slot.localeCompare(b.slot));
    if (!list.length) return { html: day === D ? 'No te queda ningún pedido por entregar hoy.' : 'Mañana no hay pedidos cargados.' };
    const n = s => list.filter(o => o.status === s).length;
    const nx = list.find(o => slotH(o.slot) >= Math.floor(nowHour())) || list[0];
    return { html: `${day === D ? 'Te quedan' : 'Mañana tenés'} ${B(list.length + ' ' + pl(list.length, 'pedido'))} por entregar: ${n('listo')} ${pl(n('listo'), 'listo')} para salir, ${n('en_produccion')} en producción y ${n('por_elaborar')} por elaborar. ${day === D ? 'El próximo' : 'El primero'} es el de ${B(fname(clientById(nx.clientId)))} a las ${slotStart(nx.slot)}.`, actions: [{ label: day === D ? 'Ver pedidos' : 'Ver pedidos de mañana', act: day === D ? 'go' : 'gri-tomorrow', arg: 'pedidos', primary: true }] };
  } },
  { id: 'clientes', match: /cliente|compran|recompra|inactiv|hace tiempo/, run: () => {
    computeVip();
    const all = S.clients.map(c => ({ c, st: clientStats(c) })).filter(x => x.st.count);
    const ina = all.filter(x => clientTags(x.c, x.st).includes('inactivo')), reco = all.filter(x => clientTags(x.c, x.st).includes('recompra'));
    return { html: `${ina.length ? `Hace tiempo que no compran ${B(joinList(ina.map(x => x.c.name + ' (' + ago(x.st.last) + ')')))}.` : 'No hay clientes inactivos.'} ${reco.length ? `Y ${esc(joinList(reco.map(x => fname(x.c))))} ya ${reco.length === 1 ? 'pasó' : 'pasaron'} su tiempo habitual entre compras: es buen momento para escribirles.` : ''}`, actions: [{ label: 'Ver clientes', act: 'cli-tag', arg: reco.length ? 'recompra' : 'inactivo', primary: true }].concat(reco.length ? [{ label: 'Copiar mensaje para ' + fname(reco[0].c), act: 'copy-wa', arg: reco[0].c.id }] : []) };
  } },
  { id: 'cobros', match: /deb|cobr|deuda|pag|plata|saldo/, run: () => {
    const D = TODAY(), owed = S.orders.filter(o => balanceOf(o) > 0), late = owed.filter(o => o.deliveryDate < D);
    if (!owed.length) return { html: 'Nadie te debe nada. Todo cobrado.' };
    return { html: `Te deben ${B(money(sum(owed, balanceOf)))} en ${owed.length} pedidos. ${late.length ? `De eso, ${money(sum(late, balanceOf))} son de entregas anteriores (${esc(joinList([...new Set(late.map(o => fname(clientById(o.clientId))))]))}).` : 'Nada atrasado: es todo de pedidos de hoy en adelante.'} Hoy ya cobraste ${money(sum(S.payments.filter(p => p.date === D), p => p.amount))}.`, actions: [{ label: 'Ver cobros', act: 'go', arg: 'cobrar', primary: true }] };
  } },
  { id: 'stock', match: /stock|insumo|queda|hay de|leche|frutill|frambues|arandan|miel|granola|frasco|tapa|etiqueta|cultivo|almendra|chia|azucar/, run: q => {
    const ins = S.insumos.find(i => norm(i.name).split(' ').some(w => w.length > 3 && q.includes(w.replace(/s$/, ''))));
    if (ins) return { html: `De ${esc(ins.name.toLowerCase())} hay ${B(fmtN(ins.stock) + ' ' + ins.unit)}. El mínimo configurado es ${fmtN(ins.min)} ${ins.unit}${ins.stock < ins.min ? ', así que conviene comprar.' : '.'}`, actions: [{ label: 'Registrar compra', act: 'ins-buy', arg: ins.id }] };
    const free = S.skus.map(s => ({ s, k: skuStock(s.id) }));
    const low = S.insumos.filter(i => i.stock < i.min);
    return { html: `Disponible para vender: ${esc(joinList(free.map(x => x.k.free + ' × ' + skuShort(x.s))))}. ${low.length ? 'Insumos bajo el mínimo: ' + esc(joinList(low.map(i => i.name.toLowerCase()))) + '.' : 'Los insumos están por encima del mínimo.'}`, actions: [{ label: 'Ver inventario', act: 'go', arg: 'inventario' }] };
  } },
];
const GRI_SUGGEST = ['¿Cuánto vendí hoy?', '¿Cuánto gané esta semana?', '¿Cuáles son mis productos más rentables?', '¿Qué pedidos faltan entregar?', '¿Qué necesito producir mañana?', '¿Cuántos Uber tengo pendientes?', '¿Qué productos están próximos a vencer?', '¿Qué clientes hace tiempo que no compran?'];
const GRI_ENGINE = {
  provider: 'local',
  ask(text) {
    const q = norm(text).trim();
    if (!q) return null;
    const it = GRI_INTENTS.find(i => i.match.test(q));
    if (!it) return { html: `Eso todavía no lo sé responder, ${esc(S.config.user)}. Por ahora puedo ayudarte con ventas, ganancia, productos rentables, pedidos, producción, envíos, vencimientos, cobros, stock y clientes.`, unknown: true };
    try { return it.run(q); } catch (e) { console.error(e); return { html: 'No pude calcular eso ahora. Probá de nuevo o revisalo en el módulo correspondiente.' }; }
  },
};

/* ---------- Vista de Inicio ---------- */
const griAvatar = (cls) => `<span class="gri-av ${cls || ''}" aria-hidden="true">G</span>`;
function recHtml(r) {
  const L = LEVELS[r.level];
  return `<div class="rec rec-${L.tone}"><span class="rec-ico">${ic(r.icon)}</span><div class="rec-body"><span class="rec-level">${L.label}</span><p>${r.text}</p>
    <div class="rec-acts">${r.actions.map(a => `<button class="btn sm ${a.primary ? 'primary' : ''}" data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ''}>${esc(a.label)}</button>`).join('')}</div></div></div>`;
}
function vInicio() {
  const D = TODAY(), LW = addDays(D, -7), dname = DIAS[weekday(D)];
  const valid = S.orders.filter(o => !o.cancelled);
  const created = d => valid.filter(o => o.createdAt === d);
  const tod = created(D), lw = created(LW);
  const sales = sum(tod, o => o.total), salesLW = sum(lw, o => o.total), profit = sum(tod, profitOf);
  const delivT = valid.filter(o => o.deliveryDate === D), delivLW = valid.filter(o => o.deliveryDate === LW);
  const toMake = valid.filter(o => isOpen(o) && (o.status === 'por_elaborar' || o.status === 'en_produccion') && o.deliveryDate <= addDays(D, 1));
  const toMakeToday = toMake.filter(o => o.deliveryDate <= D).length;
  const shipsT = delivT.filter(o => o.ship), shipsDone = shipsT.filter(o => o.ship.status === 'entregado').length;
  const owedOrders = valid.filter(o => balanceOf(o) > 0), owed = sum(owedOrders, balanceOf);
  const stocks = S.skus.map(s => skuStock(s.id));
  const free = sum(stocks, s => s.free), reserved = sum(stocks, s => s.reserved), soon = sum(stocks, s => s.soon);
  const soonLots = S.lots.filter(l => lotState(l) === 'proximo').length;
  const h = new Date().getHours();
  const greet = h < 13 ? '¡Buen día' : h < 20 ? '¡Buenas tardes' : '¡Buenas noches';
  const emoji = h < 13 ? '☀️' : h < 20 ? '🧡' : '🌙';

  const recs = griRecs();
  const main = recs.filter(r => r.level === 'urgente' || r.level === 'hoy');
  const rest = recs.filter(r => r.level === 'oportunidad' || r.level === 'info');
  const shownMain = U.gri.allMain ? main : main.slice(0, 3);
  const quick = recs.slice(0, 2).map(r => r.actions.find(a => a.primary) || r.actions[0]).filter(Boolean);

  /* Producción de hoy */
  const pos = S.prodOrders.filter(p => p.date === D && p.status !== 'cancelada');
  const plan = productionPlan().filter(p => p.need > 0);
  const unplanned = plan.filter(p => !pos.some(x => x.skuId === p.sku.id && x.status !== 'finalizada'));
  const prodRows = pos.map(p => {
    const sku = skuById(p.skuId), fin = p.status === 'finalizada', cur = p.status === 'en_curso';
    const pr = fin ? 1 : cur ? (p.stage + 1) / (STAGES.length + 1) : 0;
    return `<div class="row"><span>${jar(sku.flavor, 36)}</span><div class="row-main"><div class="row-title">${esc(sku.name)}</div><div class="row-sub">${fin ? (p.realQty || p.qty) + ' unidades listas' : cur ? STAGES[p.stage] + ' · ' + p.qty + ' unidades' : 'Programada · ' + p.qty + ' unidades'}</div><div class="prog ${fin ? 'good' : cur ? 'terra' : ''}" style="margin-top:7px"><i style="width:${Math.round(pr * 100)}%"></i></div></div><div class="row-end">${fin ? '<span class="chip good">Lista</span>' : cur ? '<span class="chip warn">En curso</span>' : '<span class="chip">Programada</span>'}</div></div>`;
  }).join('') + unplanned.map(p => `<div class="row"><span>${jar(p.sku.flavor, 36)}</span><div class="row-main"><div class="row-title">${esc(p.sku.name)}</div><div class="row-sub">Faltan ${p.need}: ${p.forOrders} para pedidos, ${p.forStock} para stock</div><div class="prog" style="margin-top:7px"><i style="width:0"></i></div></div><div class="row-end"><button class="btn sm soft" data-act="po-new" data-arg="${p.sku.id}" data-qty="${p.need}">Programar</button></div></div>`).join('');
  const doneU = sum(pos.filter(p => p.status === 'finalizada'), p => p.realQty || p.qty);
  const totalU = doneU + sum(pos.filter(p => p.status === 'en_curso' || p.status === 'programada'), p => p.qty) + sum(unplanned, p => p.need);

  const next = valid.filter(o => o.deliveryDate === D && o.status !== 'entregado' && o.ship).sort((a, b) => a.slot.localeCompare(b.slot));
  const nextRows = next.slice(0, 5).map(o => `<div class="row click" data-act="order" data-arg="${o.id}"><span class="time-tag">${slotStart(o.slot)}</span><div class="row-main"><div class="row-title">${esc(clientById(o.clientId).name)} <span class="faint" style="font-weight:600">#${o.number}</span></div><div class="row-sub">${esc(orderAddr(o).barrio)} · ${esc(itemsText(o))}</div></div><div class="row-end">${shipChip(o)}</div></div>`).join('');

  const days = [];
  for (let i = 6; i >= 0; i--) { const d = addDays(D, -i); const os = created(d); days.push({ label: DIAS_C[weekday(d)] + ' ' + new Date(toT(d)).getUTCDate(), v: sum(os, o => o.total), cls: i === 0 ? 'today' : '', tip: fmtLong(d) + ' · ' + money(sum(os, o => o.total)) + ' · ' + os.length + ' pedidos', arg: d }); }
  const wk = sum(days, d => d.v), prevWk = sum(Array.from({ length: 7 }, (_, i) => sum(created(addDays(D, -7 - i)), o => o.total)));

  return `<div class="wrap">
  <div class="grid g-welcome">
    <section class="card gri-welcome" aria-label="Resumen de Gri">
      <div class="gw-head">${griAvatar('lg')}<div><div class="eyebrow">Gri · tu asistente en ${esc(S.config.brand)}</div><div class="faint" style="font-size:12.5px">${fmtLong(D)}</div></div></div>
      <h1 class="gw-title">${greet}, ${esc(S.config.user)}! ${emoji}</h1>
      <p class="gw-text">${griSummary(recs)}</p>
      <div class="chips gw-acts">${quick.map((a, i) => `<button class="btn ${i === 0 ? 'primary' : ''}" data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ''}>${esc(a.label)}</button>`).join('')}<button class="btn ghost" data-act="gri-open">${ic('msg', 'sm')}Preguntale a Gri</button></div>
    </section>
    <section class="card hero hero-c" aria-label="Ventas de hoy">
      <div class="eyebrow">Vendiste hoy</div>
      <div class="k-val num">${money(sales)}</div>
      <div class="k-sub">${delta(sales, salesLW, 'vs. el ' + dname + ' pasado')}</div>
      <div class="hero-mini"><div><b class="num">${money(profit)}</b><span>Ganancia bruta · ${pctTxt(sales ? profit / sales : 0)}</span></div><div><b class="num">${tod.length}</b><span>Pedidos tomados</span></div><div><b class="num">${money(tod.length ? sales / tod.length : 0)}</b><span>Ticket promedio</span></div></div>
      <div class="hero-actions"><button class="btn primary sm" data-act="new-order">${ic('plus', 'sm')}Nuevo pedido</button><button class="btn sm" data-act="go" data-arg="ventas">Ver ventas</button></div>
    </section>
  </div>
  <div class="grid g-main">
    <section class="card">
      <div class="sec-title"><h2>Lo que necesita tu atención</h2>${main.length ? `<span class="hint">${main.length} ${pl(main.length, 'pendiente')}</span>` : ''}</div>
      <div class="recs">${shownMain.map(recHtml).join('') || `<div class="empty">Nada urgente por ahora, ${esc(S.config.user)}. Todo lo de hoy está encaminado.</div>`}</div>
      ${main.length > 3 ? `<button class="btn ghost sm" data-act="gri-more-main" style="margin-top:8px">${U.gri.allMain ? 'Mostrar menos' : 'Ver ' + (main.length - 3) + ' más'}</button>` : ''}
      ${rest.length ? `<div class="rec-rest"><button class="rest-toggle" data-act="gri-more" aria-expanded="${U.gri.more}">${ic(U.gri.more ? 'down' : 'chev', 'sm')}${rest.filter(r => r.level === 'oportunidad').length} ${pl(rest.filter(r => r.level === 'oportunidad').length, 'oportunidad', 'oportunidades')} y ${rest.filter(r => r.level === 'info').length} ${pl(rest.filter(r => r.level === 'info').length, 'novedad', 'novedades')}</button>${U.gri.more ? `<div class="recs">${rest.map(recHtml).join('')}</div>` : ''}</div>` : ''}
    </section>
    <section class="card">
      <div class="sec-title"><h2>Próximos envíos</h2><a class="link" href="#envios">Hoja de ruta ${ic('chev', 'sm')}</a></div>
      <div class="rows">${nextRows || emptyBox('No quedan envíos para hoy.')}</div>
    </section>
  </div>
  <div class="grid g-kpi6">
    ${kpi({ icon: 'orders', label: 'Pedidos de hoy', value: delivT.length, sub: delta(delivT.length, delivLW.length, 'vs. ' + dname + ' pasado'), go: 'pedidos' })}
    ${kpi({ icon: 'pot', label: 'Por elaborar', value: toMake.length, sub: toMakeToday + ' para hoy · ' + (toMake.length - toMakeToday) + ' para mañana', tone: 'terra', go: 'produccion' })}
    ${kpi({ icon: 'truck', label: 'Envíos de hoy', value: shipsT.length, sub: shipsDone + ' entregados · ' + (shipsT.length - shipsDone) + ' por salir', tone: 'info', go: 'envios' })}
    ${kpi({ icon: 'wallet', label: 'Cobros pendientes', value: money(owed), sub: owedOrders.length + ' pedidos con saldo', tone: 'bad', go: 'cobrar', small: true })}
    ${kpi({ icon: 'boxes', label: 'Productos disponibles', value: free, sub: reserved + ' reservados para pedidos', go: 'inventario' })}
    ${kpi({ icon: 'clock', label: 'Próximos a vencer', value: soon, sub: soon ? 'en ' + soonLots + ' ' + pl(soonLots, 'lote') + ' · 3 días o menos' : 'Nada por vencer', tone: 'warn', go: 'inventario' })}
  </div>
  <div class="grid g2">
    <section class="card"><div class="sec-title"><h2>Producción de hoy</h2><a class="link" href="#produccion">${doneU} de ${totalU} unidades ${ic('chev', 'sm')}</a></div><div class="rows">${prodRows || emptyBox('No hay producción para hoy.')}</div></section>
    <section class="card"><div class="sec-title"><div><h2>Últimos 7 días</h2><div class="k-sub" style="margin-top:4px"><b class="num" style="color:var(--ink)">${money(wk)}</b> ${delta(wk, prevWk, 'vs. 7 días anteriores')}</div></div><a class="link" href="#ventas">Ventas ${ic('chev', 'sm')}</a></div>${barChart(days, { act: 'day-sales', label: 'Ventas de los últimos 7 días', w: 640, h: 260 })}</section>
  </div>
  </div>`;
}

/* ---------- Panel de chat ---------- */
function griPanelHtml() {
  const msgs = U.gri.msgs;
  return `<div class="gp-head">${griAvatar()}<div style="min-width:0"><b>Gri</b><small>Responde con los datos de ${esc(S.config.brand)}</small></div><button class="btn icon sm ghost" data-act="gri-clear" aria-label="Limpiar conversación" title="Limpiar">${ic('refresh', 'sm')}</button><button class="btn icon sm ghost" data-act="gri-close" aria-label="Cerrar">${ic('x', 'sm')}</button></div>
  <div class="gp-msgs" id="gp-msgs">
    <div class="msg gri">${griAvatar('sm')}<div class="bubble">Hola, ${esc(S.config.user)}. Preguntame lo que necesites del negocio. Respondo con lo que está cargado en el sistema.</div></div>
    ${msgs.map(m => m.from === 'me' ? `<div class="msg me"><div class="bubble">${esc(m.text)}</div></div>` : `<div class="msg gri">${griAvatar('sm')}<div class="bubble ${m.unknown ? 'unknown' : ''}">${m.html}${m.actions && m.actions.length ? `<div class="rec-acts">${m.actions.map(a => `<button class="btn sm ${a.primary ? 'primary' : ''}" data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}<time>${m.time}</time></div></div>`).join('')}
  </div>
  <div class="gp-sugg">${GRI_SUGGEST.filter(s => !msgs.some(m => m.text === s)).slice(0, 4).map(s => `<button class="chip-btn" data-act="gri-ask" data-arg="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <form class="gp-form" id="gri-form"><input id="gri-in" class="input" placeholder="Escribile a Gri…" autocomplete="off" aria-label="Pregunta para Gri"><button class="btn primary icon" type="submit" aria-label="Enviar">${ic('chev')}</button></form>
  <p class="gp-note">Versión demo: respuestas calculadas con reglas sobre tus datos. No usa inteligencia artificial todavía.</p>`;
}
function griRenderPanel() {
  const p = $('#gri-panel');
  if (!U.gri.open) { p.hidden = true; $('#gri-fab').hidden = false; return; }
  p.hidden = false; $('#gri-fab').hidden = true;
  p.innerHTML = griPanelHtml();
  const box = $('#gp-msgs'); box.scrollTop = box.scrollHeight;
}
function griAsk(text) {
  text = (text || '').trim(); if (!text) return;
  const r = GRI_ENGINE.ask(text);
  U.gri.msgs.push({ from: 'me', text });
  U.gri.msgs.push(Object.assign({ from: 'gri', time: nowTime() }, r));
  griRenderPanel();
  const inp = $('#gri-in'); if (inp && innerWidth > 1023) inp.focus();
}

/* ---------- Lista de producción ---------- */
function openProdList() {
  const plan = productionPlan().filter(p => p.need > 0);
  if (!plan.length) { toast('No hace falta producir nada: el stock y lo programado cubren todo.'); return; }
  const ins = {}; for (const p of plan) for (const k in p.sku.recipe) ins[k] = (ins[k] || 0) + p.sku.recipe[k] * p.need;
  const lacks = Object.keys(ins).filter(k => ins[k] > insById(k).stock);
  const txt = `PRODUCCIÓN · ${fmtLong(TODAY())}\n` + plan.map(p => `· ${p.need} × ${p.sku.name} (${p.forOrders} pedidos + ${p.forStock} stock)`).join('\n') + '\n\nInsumos:\n' + Object.keys(ins).map(k => `· ${insById(k).name}: ${fmtN(ins[k])} ${insById(k).unit}`).join('\n');
  M.ctx = { prodTxt: txt };
  openModal(mHead('Lista de producción', `La preparé con los pedidos confirmados, lo que ya está en marcha y tu stock mínimo.`) + `<div class="m-body">
    <div class="rows">${plan.map(p => `<div class="row"><span>${jar(p.sku.flavor, 34)}</span><div class="row-main"><div class="row-title">${esc(p.sku.name)}</div><div class="row-sub">${p.forOrders} para pedidos · ${p.forStock} para stock · vence a los ${p.sku.shelf} días</div></div><div class="need num" style="font-size:26px">${p.need}</div></div>`).join('')}</div>
    <div><div class="flabel" style="margin-bottom:6px">Insumos que se van a usar</div><div class="total-box" style="gap:4px">${Object.keys(ins).map(k => { const i = insById(k), bad = ins[k] > i.stock; return `<div><span>${bad ? ic('alert', 'sm') + ' ' : ''}${esc(i.name)}</span><span class="num" style="color:var(--${bad ? 'bad' : 'ink-2'})">${fmtN(ins[k])} de ${fmtN(i.stock)} ${i.unit}</span></div>`; }).join('')}</div></div>
    ${lacks.length ? `<div class="incident">${ic('alert', 'sm')}<span>No alcanza ${esc(joinList(lacks.map(k => insById(k).name.toLowerCase())))}. Podés crear las órdenes igual, pero para finalizarlas vas a tener que registrar la compra.</span></div>` : ''}
    <p class="hint" style="margin:0">Al confirmar, creo ${plan.length} ${pl(plan.length, 'orden programada', 'órdenes programadas')} para hoy. No se descuentan insumos hasta que las finalices.</p>
  </div><div class="m-foot"><button type="button" class="btn ghost grow" data-act="gri-copyprod">${ic('copy', 'sm')}Copiar lista</button><button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn primary">Crear ${plan.length} ${pl(plan.length, 'orden', 'órdenes')}</button></div>`, {
    ctx: { prodTxt: txt },
    submit: () => done(run(() => { const p2 = productionPlan().filter(p => p.need > 0); for (const p of p2) A.createPO(p.sku.id, p.need, TODAY(), 'Desde la lista de Gri'); return `Listo, ${S.config.user}: creé ${p2.length} ${pl(p2.length, 'orden', 'órdenes')} de producción para hoy.`; }))
  });
}

const GRI_ACT = {
  'gri-open': () => { closeModal(); U.gri.open = true; griRenderPanel(); setTimeout(() => { const i = $('#gri-in'); if (i && innerWidth > 1023) i.focus(); }, 50); },
  'gri-close': () => { U.gri.open = false; griRenderPanel(); },
  'gri-clear': () => { U.gri.msgs = []; griRenderPanel(); },
  'gri-ask': a => griAsk(a),
  'gri-more': () => { U.gri.more = !U.gri.more; render(); },
  'gri-more-main': () => { U.gri.allMain = !U.gri.allMain; render(); },
  'gri-prodlist': () => { closeModal(); openProdList(); },
  'gri-copyprod': () => copyText(M.ctx.prodTxt, 'Lista de producción copiada'),
  'gri-route': () => { U.env.date = 'hoy'; ACT['copy-route'](); },
  'gri-tomorrow': () => { U.ped.date = 'manana'; U.ped.state = 'todos'; closeModal(); go('pedidos'); },
  'gri-ins': () => { U.inv.tab = 'insumos'; closeModal(); go('inventario'); render(); },
  'gri-recetas': () => { U.prod.tab = 'recetas'; go('produccion'); render(); },
  'gri-writeoff': () => {
    const lots = S.lots.filter(l => l.qty > 0 && l.expires < TODAY());
    if (!lots.length) { toast('No hay unidades vencidas.'); return; }
    openConfirm('Dar de baja vencidos', `Voy a dar de baja ${esc(joinList(lots.map(l => l.qty + ' × ' + skuShort(skuById(l.skuId)) + ' (lote ' + l.code + ')')))}. Queda registrado en Movimientos con su valor a costo.`, 'Dar de baja', () => { for (const l of lots) A.writeOffLot(l.id, l.qty, 'Vencido'); return 'Listo: el stock vencido quedó dado de baja.'; }, true);
  },
  'gri-promo': () => {
    const lots = S.lots.filter(l => l.qty > 0 && lotState(l) === 'proximo' && lotFree(l) > 0);
    const names = [...new Set(lots.map(l => skuShort(skuById(l.skuId)).toLowerCase()))];
    copyText(`¡Hola! Esta semana en ${S.config.brand} tenemos ${joinList(names)} con un topping de regalo, para disfrutar en estos días 🧡 Son pocas unidades: si querés, te reservo.`, 'Mensaje de promo copiado');
  },
};
