'use strict';
/* =====================================================================
   tour.js — bienvenida y recorrido guiado por todas las funciones.
   Cada paso indica la sección, qué resaltar y qué preparar antes (pestañas).
   ===================================================================== */
const TOUR = [
  { view: 'inicio', sel: '.gri-hello', title: 'Gri, tu asistente', text: 'Cada mañana Gri te cuenta cómo viene el día y qué conviene resolver primero. Todo sale de los datos del sistema, nada inventado.' },
  { view: 'inicio', sel: '.att-card', title: 'Lo importante, primero', text: 'Hasta tres prioridades por vez: urgente, hoy, esta semana. Cada una dice qué hacer, por qué y trae el botón que lo resuelve.' },
  { view: 'pedidos', sel: '.kanban', pre: () => { U.ped.state = 'todos'; U.ped.date = 'hoy'; }, title: 'Tus pedidos en un tablero', text: 'Por elaborar, en producción, listo y entregado. Arrastrás la tarjeta y cambia de estado. El stock se reserva solo, del lote que vence primero.' },
  { view: 'pedidos', sel: '.page-head .btn.primary', title: 'Un pedido en segundos', text: 'Elegís cliente, sabor, tamaño y toppings. El total y la ganancia se calculan solos. <b>Probá:</b> cargá uno y mirá cómo aparece en el tablero.' },
  { view: 'produccion', sel: '.need-card', pre: () => { U.prod.tab = 'hoy'; }, title: 'Qué producir hoy', text: 'A la izquierda, lo necesario para cumplir los pedidos. A la derecha, la reposición opcional para tu stock mínimo. Con un toque ves los ingredientes que vas a usar.' },
  { view: 'produccion', sel: '.card:has(#sim-milk)', pre: () => { U.prod.tab = 'recetas'; }, title: 'Cuánto te deja cada frasco', text: 'Ingredientes, envase, etiqueta y elaboración por receta. Mové el precio de la leche y mirá cómo cambia el margen de cada producto.' },
  { view: 'envios', sel: '.ship2', pre: () => { U.env.date = 'hoy'; }, title: 'Cada Uber bajo control', text: 'Cada entrega muestra tres estados separados: producto, viaje y cobro. Copiás dirección o datos para Uber y registrás conductor, retiro y entrega.' },
  { view: 'inventario', sel: '.inv-list', pre: () => { U.inv.tab = 'productos'; }, title: 'Tu stock, claro', text: 'Primero un resumen por producto: existencia, reservado para pedidos y disponible para vender. Tocá un producto para ver sus lotes y vencimientos.' },
  { view: 'ventas', sel: '.g-kpi', title: 'Ventas y ganancia', text: 'Por día, semana o mes, comparado con el período anterior. Podés contar por fecha de pedido, de entrega o de cobro.' },
  { view: 'cobrar', sel: '.g-kpi', title: 'Quién te debe', text: 'Lo atrasado, las señas y lo que cobrás en la entrega. Un pedido puede estar pagado y sin entregar, o entregado y sin cobrar.' },
  { view: 'clientes', sel: '.card:has(.cl-av)', pre: () => { U.cli.tag = 'todos'; U.cli.q = ''; }, title: 'Tus clientes', text: 'Cada cuánto compran, qué les gusta y cuánto gastaron. Te avisa quién está por reponer y te arma el mensaje para WhatsApp.' },
  { view: 'estrategia', sel: '.grid.g2', title: 'Ideas para crecer', text: 'Datos calculados con tus números y, aparte, ideas para probar. Nunca muestra ganancias inventadas como si fueran seguras.' },
  { view: 'inicio', sel: '[data-tour=gri]', title: 'Preguntale a Gri', text: '¿Cuánto vendí hoy? ¿Qué tengo que producir mañana? Preguntale lo que quieras del negocio y te responde con los datos del sistema.' },
];
const T = { i: -1 };
const tourSeen = () => { try { return localStorage.getItem('lg-tour-seen') === '1'; } catch (e) { return true; } };
const markSeen = () => { try { localStorage.setItem('lg-tour-seen', '1'); } catch (e) { } };

function openWelcome() {
  markSeen();
  const n = esc(S.config.user), b = esc(S.config.brand);
  const items = [
    ['Tomás un pedido y el stock se reserva solo.', 'Elegís sabor, tamaño y toppings. El sistema calcula el total y aparta los frascos del lote que vence primero.'],
    ['Sabés qué producir cada mañana.', 'Junta los pedidos, lo que ya tenés y tu stock mínimo, y te arma la lista con los insumos.'],
    ['Seguís cada Uber sin perder ninguno.', 'Producto, viaje y cobro por separado. Copiás los datos con un toque.'],
    ['Gri te avisa lo importante.', 'Te resume el día, ordena los pendientes y responde preguntas sobre tu negocio.'],
  ];
  openModal(`<div class="m-body welcome">
    <div class="eyebrow" style="color:var(--sage-ink)">Demo preparada para ${b}</div>
    <h2 class="w-title">${n}, esto es ${b} adentro de un sistema</h2>
    <p class="muted" style="margin:0;font-size:15px;line-height:1.55">Con datos de ejemplo de un emprendimiento de yogur griego como el tuyo. Andá tocando todo: no se rompe nada y podés volver a empezar cuando quieras.</p>
    <ol class="w-list">${items.map(([t, s]) => `<li><b>${t}</b> <span>${s}</span></li>`).join('')}</ol>
  </div>
  <div class="m-foot w-foot"><button type="button" class="btn lg" data-act="tour-skip">Prefiero explorar sola</button><button type="button" class="btn primary lg" data-act="tour">Mostrame cómo funciona</button></div>`);
}

function tourStart() {
  markSeen(); closeModal();
  U.gri.open = false; griRenderPanel();
  T.i = 0; tourGo();
}
function tourGo() {
  const st = TOUR[T.i];
  if (st.pre) st.pre();
  if (location.hash !== '#' + st.view) location.hash = st.view; else render();
  setTimeout(tourPlace, 90);
}
function tourEnd(final) {
  T.i = -1; $('#tour').innerHTML = ''; $('#tour').hidden = true;
  if (final) openModal(`<div class="m-body welcome" style="text-align:center;align-items:center">${'<span class="gri-av lg" aria-hidden="true">G</span>'}
    <h2 class="w-title">Listo, ${esc(S.config.user)}. Ahora probalo vos.</h2>
    <p class="muted" style="margin:0;max-width:44ch">Una buena forma de empezar: cargá un pedido, producilo, mandalo por Uber y registrá el cobro. Vas a ver cómo se actualiza todo. Si querés repasar, tocá <b>¿Cómo funciona?</b> en el menú.</p></div>
    <div class="m-foot w-foot"><button type="button" class="btn lg" data-act="close">Explorar</button><button type="button" class="btn primary lg" data-act="new-order">${ic('plus', 'sm')}Cargar un pedido</button></div>`);
}
function tourPlace() {
  if (T.i < 0) return;
  const st = TOUR[T.i], root = $('#tour'), el = tourEl(st.sel);
  root.hidden = false;
  const mobile = innerWidth <= 760;
  let atTop = false;
  if (el && !el.matches('[data-tour=gri]')) {
    const tall = el.getBoundingClientRect().height > innerHeight * .7;
    el.scrollIntoView({ block: mobile || tall ? 'start' : 'center', behavior: 'instant' });
    if (mobile || tall) scrollBy(0, mobile ? -72 : -24);
  }
  if (el && mobile) { const r = el.getBoundingClientRect(); atTop = r.top + r.height / 2 > innerHeight * .6; }
  const last = T.i === TOUR.length - 1;
  root.innerHTML = `<div class="t-block"></div><div class="t-spot" id="t-spot"></div>
    <div class="t-pop ${mobile ? 'sheet' : ''} ${atTop ? 'top' : ''}" id="t-pop" role="dialog" aria-live="polite" aria-label="Recorrido guiado">
      <div class="eyebrow" style="color:var(--sage-ink)">Paso ${T.i + 1} de ${TOUR.length}</div>
      <h3>${st.title}</h3><p>${st.text}</p>
      <div class="t-foot"><div class="t-dots">${TOUR.map((_, i) => `<i class="${i === T.i ? 'on' : i < T.i ? 'done' : ''}"></i>`).join('')}</div>
      <button class="btn sm" data-act="tour-exit">Salir</button>${T.i > 0 ? `<button class="btn sm ghost" data-act="tour-prev" aria-label="Paso anterior">${ic('chevl', 'sm')}</button>` : ''}<button class="btn sm primary" data-act="tour-next">${last ? 'Terminar' : 'Siguiente'}</button></div>
    </div>`;
  requestAnimationFrame(() => tourPosition(el));
}
function tourPosition(el) {
  const spot = $('#t-spot'), pop = $('#t-pop'); if (!spot || !pop) return;
  const vw = innerWidth, vh = innerHeight, pad = 8, mobile = vw <= 760;
  if (!el) { spot.style.cssText = 'left:50%;top:50%;width:0;height:0'; pop.style.left = Math.max(16, (vw - pop.offsetWidth) / 2) + 'px'; pop.style.top = Math.max(16, (vh - pop.offsetHeight) / 2) + 'px'; return; }
  const r = el.getBoundingClientRect();
  const top = Math.max(8, r.top - pad), left = Math.max(8, r.left - pad);
  const bottom = Math.min(vh - 8, r.bottom + pad), right = Math.min(vw - 8, r.right + pad);
  Object.assign(spot.style, { left: left + 'px', top: top + 'px', width: (right - left) + 'px', height: Math.max(0, bottom - top) + 'px', borderRadius: getComputedStyle(el).borderRadius || '16px' });
  if (mobile) return;
  const pw = pop.offsetWidth, ph = pop.offsetHeight, g = 14;
  let x, y;
  if (vh - bottom >= ph + g) { y = bottom + g; x = left; }
  else if (top >= ph + g) { y = top - ph - g; x = left; }
  else if (vw - right >= pw + g) { x = right + g; y = top; }
  else if (left >= pw + g) { x = left - pw - g; y = top; }
  else { x = right - pw - 16; y = bottom - ph - 16; }
  pop.style.left = clamp(x, 12, vw - pw - 12) + 'px';
  pop.style.top = clamp(y, 12, vh - ph - 12) + 'px';
}
const tourEl = sel => [...document.querySelectorAll(sel)].find(e => e.getClientRects().length && e.getBoundingClientRect().width > 0) || null;
addEventListener('resize', () => { if (T.i >= 0) tourPosition(tourEl(TOUR[T.i].sel)); });
addEventListener('scroll', () => { if (T.i >= 0) tourPosition(tourEl(TOUR[T.i].sel)); }, { passive: true });
addEventListener('keydown', e => {
  if (T.i < 0) return;
  if (e.key === 'Escape') { e.stopPropagation(); tourEnd(false); }
  else if (e.key === 'ArrowRight') TOUR_ACT['tour-next']();
  else if (e.key === 'ArrowLeft') TOUR_ACT['tour-prev']();
}, true);

const TOUR_ACT = {
  tour: () => tourStart(),
  'tour-skip': () => { markSeen(); closeModal(); },
  'tour-next': () => { if (T.i >= TOUR.length - 1) tourEnd(true); else { T.i++; tourGo(); } },
  'tour-prev': () => { if (T.i > 0) { T.i--; tourGo(); } },
  'tour-exit': () => tourEnd(false),
};
