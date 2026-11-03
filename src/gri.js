'use strict';
/* =====================================================================
   gri.js — Gri, la asistente de Griega.
   Motor local: lee el estado real de la demo y arma recomendaciones y respuestas
   con reglas. No llama a ninguna IA.

   Para integrar una IA más adelante:
   - griContext() devuelve un resumen estructurado del negocio.
   - GRI_ENGINE.ask(pregunta) es el único punto de entrada del chat. Se puede reemplazar
     por una llamada a un backend propio que reciba { pregunta, contexto: griContext() }
     y devuelva { html, actions }. Las acciones siguen pasando por ACT y A.*, con las
     mismas validaciones y confirmaciones que usa la interfaz.
   ===================================================================== */

const LEVELS = {
  urgente: { label: 'Urgente', tone: 'red', rank: 0 },
  hoy: { label: 'Hoy', tone: 'amber', rank: 1 },
  semana: { label: 'Esta semana', tone: 'green', rank: 2 },
  info: { label: 'Para tener en cuenta', tone: 'blue', rank: 3 },
};
const fname = c => c.biz ? c.name : c.name.split(' ')[0];
const joinList = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const pl = (n, s, p) => n === 1 ? s : (p || s + 's');
const nowHour = () => new Date().getHours() + new Date().getMinutes() / 60;
const slotH = s => +s.slice(0, 2);
const missMap = orders => { const m = {}; for (const o of orders) { const s = shortage(o); for (const k in s) m[k] = (m[k] || 0) + s[k]; } return m; };
const skuList = m => Object.keys(m).map(k => m[k] + ' × ' + skuShort(skuById(k)));
const B = s => '<b>' + esc(s) + '</b>';

/* ---------- Recomendaciones priorizadas ----------
   Cada una: title (qué hacer), reason (por qué), level, todo (frase para el resumen), actions. */
function griRecs() {
  const D = TODAY(), out = [];
  const open = S.orders.filter(isOpen);
  const today = open.filter(o => o.deliveryDate <= D);
  const plan = productionPlan();
  const sched = {}; for (const p of plan) sched[p.sku.id] = p.scheduled;
  const add = r => out.push(r);

  for (const o of open.filter(o => o.ship && o.ship.incident)) {
    const c = clientById(o.clientId);
    add({ id: 'inc-' + o.id, level: 'urgente', score: 100, icon: 'alert', title: `Resolver el envío de ${fname(c)}`, reason: `Tuvo un problema: ${o.ship.incident.type.toLowerCase()}. Conviene resolverlo antes de que se corra el horario.`, todo: `resolver el envío de ${fname(c)}`,
      actions: [{ label: 'Ver envío', act: 'go-ship', arg: o.id, primary: true }] });
  }
  const lateDel = open.filter(o => o.deliveryDate < D);
  if (lateDel.length) add({ id: 'late', level: 'urgente', score: 95, icon: 'clock', title: `Reprogramar ${lateDel.length === 1 ? 'un pedido atrasado' : lateDel.length + ' pedidos atrasados'}`, reason: `Tenían que salir antes de hoy: ${joinList(lateDel.map(o => '#' + o.number + ' de ' + fname(clientById(o.clientId))))}.`, todo: 'reprogramar pedidos atrasados',
    actions: [{ label: 'Ver pedidos', act: 'go', arg: 'pedidos', primary: true }] });

  const shortToday = today.filter(o => !fullyReserved(o));
  const missToday = missMap(shortToday);
  const uncovered = {}; for (const k in missToday) { const u = missToday[k] - (sched[k] || 0); if (u > 0) uncovered[k] = u; }
  const forOrders = sum(plan, p => p.forOrders), forStock = sum(plan, p => p.forStock);
  if (Object.keys(uncovered).length) {
    const first = shortToday.slice().sort((a, b) => a.slot.localeCompare(b.slot))[0];
    add({ id: 'short-today', level: 'urgente', score: 90, icon: 'pot', title: 'Producir lo que falta para hoy', brief: `Faltan unidades para entregas desde las ${slotStart(first.slot)}.`, reason: `Faltan ${joinList(skuList(uncovered))} para pedidos que salen desde las ${slotStart(first.slot)}. Te puedo organizar la producción.`, todo: 'producir lo que falta para las entregas de hoy',
      actions: [{ label: 'Organizar producción', act: 'gri-prodlist', arg: 'pedidos', primary: true }] });
  } else if (forOrders) {
    add({ id: 'prod', level: 'hoy', score: 80, icon: 'pot', title: 'Completar la producción pendiente', brief: `Faltan ${forOrders} ${pl(forOrders, 'unidad', 'unidades')} para los pedidos confirmados.`, reason: `Tenemos que preparar ${forOrders} ${pl(forOrders, 'unidad', 'unidades')} para cubrir los pedidos confirmados. Te puedo organizar la producción.`, todo: 'completar la producción pendiente',
      actions: [{ label: 'Organizar producción', act: 'gri-prodlist', arg: 'pedidos', primary: true }] });
  }
  if (!forOrders && forStock) add({ id: 'restock', level: 'semana', score: 48, icon: 'boxes', title: 'Reponer stock mínimo', reason: `Los pedidos están cubiertos. Con ${forStock} ${pl(forStock, 'unidad', 'unidades')} más llegás a tu stock mínimo.`, todo: '',
    actions: [{ label: 'Ver producción', act: 'go', arg: 'produccion', primary: true }] });
  if (Object.keys(missToday).length && !Object.keys(uncovered).length) {
    const inProg = S.prodOrders.filter(p => (p.status === 'en_curso' || p.status === 'programada') && missToday[p.skuId]);
    add({ id: 'wait-prod', level: 'info', score: 40, icon: 'pot', title: 'Pedidos esperando producción', reason: `Quedan cubiertos con ${joinList(inProg.map(p => p.qty + ' × ' + skuShort(skuById(p.skuId))))}. Al finalizarla se reservan solos.`, todo: '',
      actions: [{ label: 'Ir a producción', act: 'go', arg: 'produccion', primary: true }] });
  }
  const pending = S.prodOrders.filter(p => p.status === 'programada' && p.date <= D);
  if (pending.length && !forOrders) add({ id: 'prog', level: 'hoy', score: 70, icon: 'pot', title: 'Arrancar la producción programada', reason: `${pending.length === 1 ? 'Hay una orden' : 'Hay ' + pending.length + ' órdenes'} para hoy sin empezar: ${joinList(pending.map(p => p.qty + ' × ' + skuShort(skuById(p.skuId))))}.`, todo: 'arrancar la producción programada',
    actions: [{ label: 'Ir a producción', act: 'go', arg: 'produccion', primary: true }] });

  const ready = today.filter(o => o.ship && o.ship.status === 'pendiente' && o.status === 'listo').sort((a, b) => a.slot.localeCompare(b.slot));
  if (ready.length) {
    const soon = slotH(ready[0].slot) <= nowHour() + 1, o = ready[0], via = o.delivery === 'uber' ? 'Uber' : 'envío';
    add({ id: 'uber', level: soon ? 'urgente' : 'hoy', score: soon ? 92 : 85, icon: 'car',
      title: ready.length === 1 ? `Solicitar ${via} para ${fname(clientById(o.clientId))}` : `Solicitar ${ready.length} envíos`,
      reason: ready.length === 1 ? `Su pedido ya está listo y sale a las ${slotStart(o.slot)}. Te dejé los datos listos para copiar.` : `Ya están listos: ${joinList(ready.map(x => fname(clientById(x.clientId)) + ' (' + slotStart(x.slot) + ')'))}.`,
      todo: ready.length === 1 ? `coordinar el ${via} de ${fname(clientById(o.clientId))}` : `coordinar ${ready.length} envíos`,
      actions: [{ label: ready.length === 1 ? 'Gestionar envío' : 'Gestionar envíos', act: ready.length === 1 ? 'go-ship' : 'go', arg: ready.length === 1 ? o.id : 'envios', primary: true }] });
  }

  const needIns = {};
  for (const p of plan) for (const k in p.sku.recipe) needIns[k] = (needIns[k] || 0) + p.sku.recipe[k] * p.need;
  for (const p of S.prodOrders.filter(p => p.status === 'programada' || p.status === 'en_curso')) { const s = skuById(p.skuId); for (const k in s.recipe) needIns[k] = (needIns[k] || 0) + s.recipe[k] * p.qty; }
  const blocking = S.insumos.filter(i => (needIns[i.id] || 0) > i.stock + 1e-9);
  for (const i of blocking) add({ id: 'ins-block-' + i.id, level: 'urgente', score: 88, icon: 'bag', title: `Comprar ${i.name.toLowerCase()}`, brief: 'No alcanza para la producción pendiente.', reason: `Para la producción pendiente necesitamos ${fmtN(needIns[i.id])} ${i.unit} y hay ${fmtN(i.stock)} ${i.unit}.`, todo: `comprar ${i.name.toLowerCase()}`,
    actions: [{ label: 'Ver cuánto comprar', act: 'gri-buy', arg: i.id, primary: true }] });
  const low = S.insumos.filter(i => i.stock < i.min && !blocking.includes(i));
  if (low.length === 1) { const i = low[0]; add({ id: 'ins-' + i.id, level: 'hoy', score: 60, icon: 'bag', title: `Revisar el stock de ${i.name.toLowerCase()}`, brief: `Quedan ${fmtN(i.stock)} ${i.unit}, por debajo del mínimo de ${fmtN(i.min)} ${i.unit}.`, reason: `Nos estamos quedando sin ${i.name.toLowerCase()}: hay ${fmtN(i.stock)} ${i.unit} y el mínimo es ${fmtN(i.min)} ${i.unit}. ¿Revisamos cuánto comprar?`, todo: `revisar el stock de ${i.name.toLowerCase()}`,
    actions: [{ label: 'Ver cuánto comprar', act: 'gri-buy', arg: i.id, primary: true }] }); }
  else if (low.length > 1) add({ id: 'ins-many', level: 'hoy', score: 60, icon: 'bag', title: `Revisar ${low.length} insumos`, reason: `Están por debajo del mínimo: ${joinList(low.map(i => i.name.toLowerCase()))}.`, todo: 'revisar insumos que se están acabando',
    actions: [{ label: 'Ver insumos', act: 'gri-ins', primary: true }] });

  const expLots = S.lots.filter(l => l.qty > 0 && l.expires < D), expU = sum(expLots, l => l.qty);
  if (expU) add({ id: 'expired', level: 'hoy', score: 55, icon: 'trash', title: `Dar de baja ${expU} ${pl(expU, 'unidad vencida', 'unidades vencidas')}`, reason: `Son del lote ${joinList(expLots.map(l => l.code))}. No se usan en pedidos; darlas de baja deja el stock al día.`, todo: 'dar de baja lo vencido',
    actions: [{ label: 'Dar de baja', act: 'gri-writeoff', primary: true }] });

  const owedLate = S.orders.filter(o => balanceOf(o) > 0 && o.deliveryDate < D).sort((a, b) => balanceOf(b) - balanceOf(a));
  if (owedLate.length) { const c = clientById(owedLate[0].clientId); add({ id: 'owed', level: 'hoy', score: 58, icon: 'wallet', title: `Cobrar ${money(sum(owedLate, balanceOf))} atrasados`, brief: `${owedLate.length} ${pl(owedLate.length, 'pedido')} de días anteriores sin cobrar.`, reason: `${fname(c)}${owedLate.length > 1 ? ` y ${owedLate.length - 1} ${pl(owedLate.length - 1, 'cliente más', 'clientes más')}` : ''} ${owedLate.length > 1 ? 'tienen' : 'tiene'} saldo de entregas anteriores.`, todo: 'ponernos al día con los cobros',
    actions: [{ label: 'Ver cobros', act: 'go', arg: 'cobrar', primary: true }] }); }

  const soonLots = S.lots.filter(l => l.qty > 0 && lotState(l) === 'proximo');
  const soonFree = sum(soonLots, l => lotFree(l)), soonRes = sum(soonLots, l => lotReserved(l));
  if (soonFree > 0) add({ id: 'soon', level: 'semana', score: 50, icon: 'clock', title: `Ofrecer ${soonFree} ${pl(soonFree, 'unidad', 'unidades')} que vencen pronto`, reason: `No están reservadas y vencen en 3 días o menos. Un topping de regalo puede moverlas.`, todo: '',
    actions: [{ label: 'Copiar promo', act: 'gri-promo', primary: true }] });
  computeVip();
  const reco = S.clients.map(c => ({ c, st: clientStats(c) })).filter(x => clientTags(x.c, x.st).includes('recompra')).sort((a, b) => b.st.total - a.st.total);
  if (reco.length) add({ id: 'reco', level: 'semana', score: 45, icon: 'users', title: `Escribirle a ${reco.length} ${pl(reco.length, 'cliente')} que ${pl(reco.length, 'suele', 'suelen')} reponer`, reason: `${joinList(reco.slice(0, 3).map(x => fname(x.c)))}${reco.length > 3 ? ' y otros' : ''} ya pasaron su tiempo habitual entre compras.`, todo: '',
    actions: [{ label: 'Copiar mensaje', act: 'copy-wa', arg: reco[0].c.id, primary: true }, { label: 'Ver clientes', act: 'cli-tag', arg: 'recompra' }] });

  const cashToday = today.filter(o => balanceOf(o) > 0);
  if (cashToday.length) add({ id: 'cash', level: 'info', score: 30, icon: 'cash', title: `Cobrar ${money(sum(cashToday, balanceOf))} en las entregas de hoy`, reason: `${cashToday.length} ${pl(cashToday.length, 'pedido')}: ${money(sum(cashToday.filter(o => o.payMethod === 'efectivo'), balanceOf))} en efectivo, el resto por transferencia.`, todo: '',
    actions: [{ label: 'Ver cobros', act: 'go', arg: 'cobrar', primary: true }] });
  const tom = open.filter(o => o.deliveryDate === addDays(D, 1));
  if (tom.length) add({ id: 'tomorrow', level: 'info', score: 25, icon: 'calendar', title: `Mañana: ${tom.length} ${pl(tom.length, 'pedido')}`, reason: tom.some(o => !fullyReserved(o)) ? `${tom.filter(o => !fullyReserved(o)).length} todavía esperan producción.` : 'Todo el stock ya está reservado.', todo: '',
    actions: [{ label: 'Ver pedidos de mañana', act: 'gri-tomorrow', primary: true }] });
  if (soonRes > 0 && !soonFree) add({ id: 'soon-ok', level: 'info', score: 20, icon: 'clock', title: 'Lo que vence pronto ya está reservado', reason: `Las ${soonRes} unidades salen en pedidos antes de vencer.`, todo: '', actions: [{ label: 'Ver lotes', act: 'go', arg: 'inventario', primary: true }] });

  return out.map(r => Object.assign(r, { text: r.title + '. ' + r.reason })).sort((a, b) => LEVELS[a.level].rank - LEVELS[b.level].rank || b.score - a.score);
}

/* ---------- Resumen de bienvenida (sin repetir las cifras de las tarjetas) ---------- */
function griSummary(recs) {
  const D = TODAY(), LW = addDays(D, -7), dn = DIAS[weekday(D)];
  const sales = sum(S.orders.filter(o => !o.cancelled && o.createdAt === D), o => o.total), prev = sum(S.orders.filter(o => !o.cancelled && o.createdAt === LW), o => o.total);
  const top = recs.filter(r => (r.level === 'urgente' || r.level === 'hoy') && r.todo);
  const words = ['', 'una cosa importante', 'dos cosas importantes', 'tres cosas importantes'];
  let p1 = '';
  if (top.length) {
    const shown = top.slice(0, 3).map(r => r.todo);
    p1 = top.length <= 3 ? `Hoy tenemos ${words[top.length]} para resolver: ${esc(joinList(shown))}.` : `Hoy tenemos ${top.length} cosas para resolver. Las más importantes: ${esc(joinList(shown))}.`;
  } else p1 = 'No hay nada urgente: lo de hoy está encaminado.';
  let p2 = '';
  if (!sales) p2 = ' Todavía no entraron ventas hoy.';
  else if (prev) { const r = (sales - prev) / prev; p2 = r >= .1 ? ` Las ventas vienen muy bien respecto del ${dn} pasado.` : r <= -.1 ? ` Las ventas vienen más tranquilas que el ${dn} pasado.` : ` Las ventas vienen parecidas al ${dn} pasado.`; }
  return p1 + p2;
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
  { id: 'explicar', match: /(que es|que son|que significa|que quiere decir|como (se )?calcul|como funciona|para que sirve|explica|no entiendo)/, run: q => {
    const T = [
      [/margen|ganancia/, 'La <b>ganancia bruta</b> es lo que queda de cada venta después de restar ingredientes, envase, etiqueta y elaboración. El <b>margen</b> es esa ganancia dividida por el precio. No descuenta gastos fijos como alquiler, sueldos o impuestos, así que no es la ganancia final del mes.'],
      [/ticket/, 'El <b>ticket promedio</b> es lo que gasta en promedio cada pedido: total vendido dividido por la cantidad de pedidos.'],
      [/factur/, 'La <b>facturación</b> es el total vendido en el período, con descuentos aplicados. Podés contarla por fecha de pedido, de entrega o de cobro.'],
      [/reserv/, 'Un producto <b>reservado</b> ya está apartado para un pedido. El sistema lo reserva solo apenas cargás el pedido, del lote que vence primero, y deja de ofrecerlo como disponible.'],
      [/disponible/, '<b>Disponible para vender</b> son las unidades que no están reservadas para ningún pedido y no vencieron. Son las que podés ofrecer ya.'],
      [/minimo/, 'El <b>stock mínimo</b> es la cantidad que querés tener siempre de cada producto. Si quedás por debajo, te sugiero producir la diferencia como reposición, aparte de los pedidos.'],
      [/lote|venc/, 'Cada producción genera un <b>lote</b> con su fecha de elaboración y vencimiento, según la vida útil configurada para el producto. Lo vencido nunca se asigna a un pedido.'],
      [/sena|parcial|cobr/, 'Una <b>seña</b> o pago parcial es una parte del total. El pedido queda con saldo hasta que entra el resto. Cobrar y entregar van por separado: un pedido puede estar pagado y sin entregar, o al revés.'],
      [/produc|fabric/, 'Para saber <b>qué producir</b> sumo los pedidos confirmados, resto lo que ya está reservado del stock y lo que ya está en producción. Lo que queda es lo que falta. La reposición para tu stock mínimo va aparte.'],
      [/envio|uber|transporte/, 'Cada envío tiene <b>tres estados separados</b>: el producto (si está listo), el viaje (sin solicitar, conductor asignado, en camino, entregado) y el cobro. Pedir un Uber nunca marca el pedido como entregado.'],
      [/recompra|inactiv/, 'Para cada cliente calculo cada cuántos días suele comprar. Si ya pasó ese tiempo sin un pedido nuevo, lo marco como <b>posible recompra</b>. Si pasó mucho más, como <b>inactivo</b>.'],
    ];
    const t = T.find(([re]) => re.test(q));
    if (t) return { html: t[1] };
    return { html: `${esc(S.config.brand)} organiza el día en cuatro pasos: cargás el pedido, el sistema reserva el stock o te dice qué producir, coordinás el envío y registrás el cobro. Todo queda conectado. Si querés, te muestro el recorrido guiado.`, actions: [{ label: 'Ver recorrido', act: 'tour', primary: true }, { label: 'Primeros pasos', act: 'go', arg: 'bienvenida' }] };
  } },
  { id: 'ayuda', match: /^(hola|buen|que (podes|sabes)|ayuda|como funciona)/, run: () => ({ html: `Hola. Puedo contarte cómo vienen las ventas y la ganancia, qué productos te dejan más, qué pedidos faltan entregar, qué hay que producir, cuántos envíos quedan, qué vence pronto, quién te debe y qué clientes hace tiempo que no compran. Todo sale de los datos del sistema.` }) },
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
const GRI_SUGGEST = ['¿Cuánto vendí hoy?', '¿Qué es el margen bruto?', '¿Cuánto gané esta semana?', '¿Cuáles son mis productos más rentables?', '¿Qué pedidos faltan entregar?', '¿Qué necesito producir mañana?', '¿Cuántos Uber tengo pendientes?', '¿Qué productos están próximos a vencer?', '¿Qué clientes hace tiempo que no compran?'];
const GRI_ENGINE = {
  provider: 'local',
  ask(text) {
    const q = norm(text).trim();
    if (!q) return null;
    const it = GRI_INTENTS.find(i => i.match.test(q));
    if (!it) return { html: `Eso todavía no lo sé responder. Por ahora puedo ayudarte con ventas, ganancia, productos rentables, pedidos, producción, envíos, vencimientos, cobros, stock y clientes, y explicarte cómo funciona el sistema.`, unknown: true };
    try { return it.run(q); } catch (e) { console.error(e); return { html: 'No pude calcular eso ahora. Probá de nuevo o revisalo en el módulo correspondiente.' }; }
  },
};

/* ---------- Inicio (versión definitiva: Gri, 4 indicadores, prioridades y envíos) ---------- */
const briefOf = r => { if (r.brief) return r.brief; const m = r.reason.match(/^.*?[.?!](?=\s|$)/); return m ? m[0] : r.reason; };
function attRow(r, i) {
  const L = LEVELS[r.level], a = r.actions[0];
  return `<div class="att lv-${L.tone}"><span class="att-ico">${ic(r.icon)}</span><div class="att-main"><b>${esc(r.title)}</b><span title="${esc(r.reason)}">${esc(briefOf(r))}</span></div>${r.level === 'urgente' ? `<span class="lvl lvl-red">Urgente</span>` : '<span></span>'}<button class="btn sm ${i === 0 ? 'primary' : ''}" data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ''}>${esc(a.label)}</button></div>`;
}
function griHello(recs) {
  const top = recs.filter(r => r.level === 'urgente' || r.level === 'hoy');
  if (!top.length) return 'Todo está al día. No hay nada urgente por resolver.';
  const n = top.length;
  return `${esc(S.config.user)}, tenés ${n === 1 ? 'una prioridad' : n + ' prioridades'} hoy. Empecemos por ${esc(top[0].todo || top[0].title.toLowerCase())}.`;
}
function vInicio() {
  const D = TODAY(), LW = addDays(D, -7), dname = DIAS[weekday(D)];
  const valid = S.orders.filter(o => !o.cancelled);
  const tod = valid.filter(o => o.createdAt === D), lw = valid.filter(o => o.createdAt === LW);
  const sales = sum(tod, o => o.total), salesLW = sum(lw, o => o.total), profit = sum(tod, profitOf);
  const delivT = valid.filter(o => o.deliveryDate === D), delivLW = valid.filter(o => o.deliveryDate === LW);
  const shipsT = delivT.filter(o => o.ship), shipsLeft = shipsT.filter(o => o.ship.status !== 'entregado'), shipsDone = shipsT.length - shipsLeft.length;
  const cmp = (cur, prev) => prev ? delta(cur, prev, 'vs. ' + dname + ' pasado') : '<span>Sin datos para comparar</span>';
  const h = new Date().getHours();
  const greet = h < 13 ? '¡Buen día' : h < 20 ? '¡Buenas tardes' : '¡Buenas noches';
  const emoji = h < 13 ? '☀️' : h < 20 ? '🧡' : '🌙';
  const recs = griRecs();
  const first = recs.find(r => r.level === 'urgente' || r.level === 'hoy');
  const fa = first && first.actions[0];
  const next = shipsLeft.slice().sort((a, b) => a.slot.localeCompare(b.slot) || a.number - b.number).slice(0, 3);
  return `<div class="wrap home">
  <section class="card gri-hello" aria-label="Resumen de Gri">
    <div class="gh-mascot">${griMascot(96)}</div>
    <div class="gh-main"><div class="eyebrow">Gri · tu asistente · ${fmtLong(D)}</div>
      <h1 class="gw-title">${greet}, ${esc(S.config.user)}! ${emoji}</h1>
      <p class="gw-text">${griHello(recs)}</p>
      <div class="chips gw-acts">${fa ? `<button class="btn primary" data-act="${fa.act}" ${fa.arg ? `data-arg="${esc(fa.arg)}"` : ''}>${esc(fa.label)}</button>` : ''}<button class="btn" data-act="gri-open">${ic('msg', 'sm')}Preguntale a Gri</button></div></div>
  </section>
  <div class="grid home-kpis">
    ${kpi({ icon: 'chart', label: 'Vendiste hoy', value: money(sales), sub: cmp(sales, salesLW), bg: 'orange', go: 'ventas', help: 'Suma de los pedidos que tomaste hoy, con descuentos aplicados.' })}
    ${kpi({ icon: 'leaf', label: 'Ganancia bruta', value: money(profit), sub: sales ? 'margen ' + pctTxt(profit / sales) : 'Sin ventas hoy', bg: 'sage', go: 'ventas', help: 'Lo que queda de las ventas de hoy después de restar ingredientes, envase, etiqueta y elaboración. No descuenta gastos fijos.' })}
    ${kpi({ icon: 'orders', label: 'Pedidos de hoy', value: delivT.length, sub: cmp(delivT.length, delivLW.length), go: 'pedidos', help: 'Pedidos con entrega programada para hoy, sin importar cuándo se tomaron.' })}
    ${kpi({ icon: 'truck', label: 'Envíos pendientes', value: shipsLeft.length, sub: shipsT.length ? shipsDone + (shipsDone === 1 ? ' ya entregado hoy' : ' ya entregados hoy') : 'Sin envíos hoy', bg: 'blue', go: 'envios' })}
  </div>
  <div class="grid g-main home-cols">
    <section class="card att-card">
      <div class="sec-title"><h2>Lo que necesita tu atención</h2>${recs.length ? `<button class="link" data-act="gri-all">Ver todas (${recs.length})</button>` : ''}</div>
      <div class="att-list">${recs.slice(0, 3).map(attRow).join('') || `<div class="empty">Todo al día. No hay tareas pendientes.</div>`}</div>
    </section>
    <section class="card env-card">
      <div class="sec-title"><h2>Próximos envíos</h2><a class="link" href="#envios">Hoja de entregas ${ic('chev', 'sm')}</a></div>
      <div class="ship-rows">${next.map(o => `<button class="ship-row" data-act="order" data-arg="${o.id}"><span class="sr-time">${ic('truck', 'sm')}${slotStart(o.slot)}</span><span class="sr-main"><b>${esc(clientById(o.clientId).name)}</b><small>${esc(orderAddr(o).barrio || 'Sin zona')} · #${o.number}</small></span>${ic('chev', 'sm sr-chev')}</button>`).join('') || emptyBox('No quedan envíos para hoy.')}</div>
    </section>
  </div>
  </div>`;
}
function openAllRecs() {
  const recs = griRecs();
  const groups = Object.keys(LEVELS).map(k => [k, recs.filter(r => r.level === k)]).filter(g => g[1].length);
  openModal(mHead('Todo lo que Gri tiene para vos', 'Ordenado por importancia. Cada tarea trae el botón que la resuelve.') + `<div class="m-body">${groups.map(([k, list]) => `<div><div style="margin-bottom:4px"><span class="lvl lvl-${LEVELS[k].tone}">${LEVELS[k].label}</span></div><div class="att-list all">${list.map(r => { const L = LEVELS[r.level]; return `<div class="att lv-${L.tone}"><span class="att-ico">${ic(r.icon)}</span><div class="att-main"><b>${esc(r.title)}</b><span>${esc(r.reason)}</span></div><span class="chips">${r.actions.map(a => `<button type="button" class="btn sm ${a.primary ? 'primary' : ''}" data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ''}>${esc(a.label)}</button>`).join('')}</span></div>`; }).join('')}</div></div>`).join('') || emptyBox('Todo al día.')}</div><div class="m-foot"><button type="button" class="btn primary" data-act="close">Listo</button></div>`, { wide: true });
}

/* ---------- Panel de chat ---------- */
function griPanelHtml() {
  const msgs = U.gri.msgs;
  return `<div class="gp-head">${griAvatar('md')}<div style="min-width:0"><b>Gri</b><small>Responde con los datos de ${esc(S.config.brand)}</small></div><button class="btn icon sm ghost" data-act="gri-clear" aria-label="Limpiar conversación" title="Limpiar">${ic('refresh', 'sm')}</button><button class="btn icon sm ghost" data-act="gri-close" aria-label="Cerrar">${ic('x', 'sm')}</button></div>
  <div class="gp-msgs" id="gp-msgs">
    <div class="msg gri">${griAvatar('sm')}<div class="bubble">Hola. Preguntame lo que necesites del negocio o de cómo funciona el sistema. Respondo con lo que está cargado.</div></div>
    ${msgs.map(m => m.from === 'me' ? `<div class="msg me"><div class="bubble">${esc(m.text)}</div></div>` : `<div class="msg gri">${griAvatar('sm')}<div class="bubble ${m.unknown ? 'unknown' : ''}">${m.html}${m.actions && m.actions.length ? `<div class="rec-acts">${m.actions.map(a => `<button class="btn sm ${a.primary ? 'primary' : ''}" data-act="${a.act}" ${a.arg ? `data-arg="${esc(a.arg)}"` : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}<time>${m.time}</time></div></div>`).join('')}
  </div>
  <div class="gp-sugg">${GRI_SUGGEST.filter(s => !msgs.some(m => m.text === s)).slice(0, 4).map(s => `<button class="chip-btn" data-act="gri-ask" data-arg="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  <form class="gp-form" id="gri-form"><input id="gri-in" class="input" placeholder="Escribile a Gri…" autocomplete="off" aria-label="Pregunta para Gri"><button class="btn primary icon" type="submit" aria-label="Enviar">${ic('chev')}</button></form>
  <p class="gp-note">Versión demo: respuestas calculadas con reglas sobre tus datos. Todavía no usa inteligencia artificial.</p>`;
}
function griRenderPanel() {
  const p = $('#gri-panel');
  if (!U.gri.open) { p.hidden = true; return; }
  p.hidden = false;
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

/* ---------- Lista de producción (pedidos / reposición) ---------- */
function prodNeeds(mode) { return productionPlan().map(p => ({ p, q: mode === 'stock' ? p.forStock : mode === 'pedidos' ? p.forOrders : p.need })).filter(x => x.q > 0); }
function insFor(list) { const ins = {}; for (const { p, q } of list) for (const k in p.sku.recipe) ins[k] = (ins[k] || 0) + p.sku.recipe[k] * q; return ins; }
function insTable(ins) {
  return `<div class="total-box" style="gap:4px">${Object.keys(ins).map(k => { const i = insById(k), bad = ins[k] > i.stock + 1e-9; return `<div><span>${bad ? ic('alert', 'sm') + ' ' : ''}${esc(i.name)}</span><span class="num" style="color:var(--${bad ? 'bad' : 'ink-2'})">${fmtN(ins[k])} ${i.unit} <span class="faint">(hay ${fmtN(i.stock)})</span></span></div>`; }).join('') || '<div class="faint">Sin insumos para calcular.</div>'}</div>`;
}
function openProdList(mode) {
  mode = mode || 'pedidos';
  const list = prodNeeds(mode);
  if (!list.length) { toast(mode === 'stock' ? 'El stock está por encima del mínimo.' : 'No hace falta producir nada para los pedidos.'); return; }
  const ins = insFor(list), lacks = Object.keys(ins).filter(k => ins[k] > insById(k).stock + 1e-9);
  const txt = `PRODUCCIÓN · ${fmtLong(TODAY())}\n` + list.map(({ p, q }) => `· ${q} × ${p.sku.name}`).join('\n') + '\n\nInsumos:\n' + Object.keys(ins).map(k => `· ${insById(k).name}: ${fmtN(ins[k])} ${insById(k).unit}`).join('\n');
  openModal(mHead(mode === 'stock' ? 'Reposición de stock' : 'Organizar producción', mode === 'stock' ? 'Producción extra para llegar a tu stock mínimo.' : 'Lo necesario para cumplir los pedidos confirmados.') + `<div class="m-body">
    <div class="rows">${list.map(({ p, q }) => `<div class="row"><span>${jar(p.sku.flavor, 34)}</span><div class="row-main"><div class="row-title">${esc(p.sku.name)}</div><div class="row-sub">Vence a los ${p.sku.shelf} días de elaborado</div></div><div class="need num" style="font-size:26px">${q}</div></div>`).join('')}</div>
    <div><div class="flabel" style="margin-bottom:6px">Ingredientes y envases que se van a usar</div>${insTable(ins)}</div>
    ${lacks.length ? `<div class="incident">${ic('alert', 'sm')}<span>No alcanza ${esc(joinList(lacks.map(k => insById(k).name.toLowerCase())))}. Podés crear las órdenes igual, pero para finalizarlas vas a tener que registrar la compra.</span></div>` : ''}
    <p class="hint" style="margin:0">Al confirmar, creo ${list.length} ${pl(list.length, 'orden programada', 'órdenes programadas')} para hoy. Los insumos se descuentan recién cuando las finalices.</p>
  </div><div class="m-foot"><button type="button" class="btn ghost grow" data-act="gri-copyprod">${ic('copy', 'sm')}Copiar lista</button><button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn primary">Crear ${list.length} ${pl(list.length, 'orden', 'órdenes')}</button></div>`, {
    ctx: { prodTxt: txt },
    submit: () => done(run(() => { const l2 = prodNeeds(mode); for (const { p, q } of l2) A.createPO(p.sku.id, q, TODAY(), mode === 'stock' ? 'Reposición de stock' : 'Para pedidos confirmados'); return `Listo: creé ${l2.length} ${pl(l2.length, 'orden', 'órdenes')} de producción para hoy.`; }))
  });
}
function openIngredients(withStock) {
  const list = prodNeeds(withStock ? 'todo' : 'pedidos');
  const ins = insFor(list);
  openModal(mHead('Ingredientes necesarios', 'Calculado con las recetas configuradas de cada producto.') + `<div class="m-body">
    <div class="seg">${[['0', 'Solo pedidos'], ['1', 'Pedidos + reposición']].map(([v, l]) => `<button type="button" class="${(withStock ? '1' : '0') === v ? 'on' : ''}" data-act="gri-ingredients" data-arg="${v}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="hint">Para: ${esc(joinList(list.map(({ p, q }) => q + ' × ' + skuShort(p.sku))))}</div>${insTable(ins)}` : emptyBox('No hay nada para producir en esta opción.')}
    <p class="hint" style="margin:0">Si algo no alcanza aparece en rojo. Las cantidades salen de la receta de cada producto (Producción → Recetas y costos).</p>
  </div><div class="m-foot"><button type="button" class="btn primary" data-act="close">Listo</button></div>`);
}
function openBuySuggest(id) {
  const i = insById(id), plan = productionPlan();
  let need = 0;
  for (const p of plan) need += (p.sku.recipe[id] || 0) * p.need;
  for (const p of S.prodOrders.filter(p => p.status === 'programada' || p.status === 'en_curso')) need += (skuById(p.skuId).recipe[id] || 0) * p.qty;
  const sugg = Math.max(0, +(need + i.min - i.stock).toFixed(2));
  openModal(mHead(`¿Cuánto comprar de ${esc(i.name.toLowerCase())}?`, 'Te lo calculé con la producción pendiente y tu mínimo.') + `<div class="m-body">
    <div class="total-box"><div><span>Hay ahora</span><b class="num">${fmtN(i.stock)} ${i.unit}</b></div><div><span>Necesitás para producir lo pendiente</span><b class="num">${fmtN(need)} ${i.unit}</b></div><div><span>Stock mínimo configurado</span><b class="num">${fmtN(i.min)} ${i.unit}</b></div><div class="big"><span>Te sugiero comprar</span><span class="num">${fmtN(sugg)} ${i.unit}</span></div></div>
    <p class="hint" style="margin:0">Cálculo: lo necesario + el mínimo − lo que hay. Al precio actual (${money(i.cost)} por ${i.unit}) serían unos ${money(sugg * i.cost)}.</p>
  </div><div class="m-foot"><button type="button" class="btn ghost" data-act="close">Ahora no</button><button type="button" class="btn primary" data-act="gri-buy-go" data-arg="${i.id}" data-qty="${sugg}">Registrar compra</button></div>`);
}

const GRI_ACT = {
  'gri-open': () => { closeModal(); U.gri.open = true; griRenderPanel(); setTimeout(() => { const i = $('#gri-in'); if (i && innerWidth > 1023) i.focus(); }, 50); },
  'gri-close': () => { U.gri.open = false; griRenderPanel(); },
  'gri-clear': () => { U.gri.msgs = []; griRenderPanel(); },
  'gri-ask': a => griAsk(a),
  'gri-more-main': () => { U.gri.allMain = !U.gri.allMain; render(); },
  'gri-all': () => { closeModal(); openAllRecs(); },
  'gri-prodlist': a => { closeModal(); openProdList(a || 'pedidos'); },
  'gri-ingredients': a => { closeModal(); openIngredients(a === '1'); },
  'gri-buy': a => { closeModal(); openBuySuggest(a); },
  'gri-buy-go': (a, el) => { closeModal(); openInsBuy(a); setTimeout(() => { const q = $('#ib-qty'); if (q && +el.dataset.qty > 0) q.value = el.dataset.qty; }, 30); },
  'gri-copyprod': () => copyText(M.ctx.prodTxt, 'Lista de producción copiada'),
  'gri-route': () => { U.env.date = 'hoy'; ACT['copy-route'](); },
  'gri-tomorrow': () => { U.ped.date = 'manana'; U.ped.state = 'todos'; closeModal(); go('pedidos'); },
  'gri-ins': () => { U.inv.tab = 'insumos'; closeModal(); go('inventario'); render(); },
  'gri-recetas': () => { U.prod.tab = 'recetas'; closeModal(); go('produccion'); render(); },
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
