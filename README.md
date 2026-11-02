# La Griega · demo de sistema de gestión

Demo navegable de un sistema de gestión para un emprendimiento de yogur griego artesanal.
Proyecto independiente: no comparte código ni datos con el sistema de frascos.

## Ejecutar
- Local: abrir `index.html` con doble clic (no necesita servidor ni instalación).
- Vercel: subir `index.html` a un repo de GitHub e importarlo en Vercel como sitio estático (sin build).

## Restablecer datos
Ajustes → Restablecer. En modo automático la demo se regenera sola cada día nuevo, así "hoy" siempre tiene pedidos.
Ajustes → Fecha fija congela la fecha de demostración.

## Estructura (src/)
- core.js: catálogo, datos ficticios, estado y reglas de negocio (reservas FEFO, stock, cobros, producción).
- ui.js: vistas e íconos. app.js: modales, formularios, eventos, arrastrar y soltar, arranque.
- style.css: tokens de color al principio (`:root`) para cambiar la marca.
- build.py une todo en `dist/index.html`.

## Para pasar a producción
Reemplazar `persist/loadState` (localStorage) por Supabase, agregar autenticación y un `negocio_id`
en cada tabla. Las funciones de `A.*` en core.js son las que pasarían a ser llamadas al backend.

## Gri (asistente)
- src/tour.js: bienvenida y recorrido guiado (lista TOUR: sección, qué resaltar, título y texto).
- src/gri.js: recomendaciones priorizadas (griRecs), resumen de bienvenida (griSummary) y chat (GRI_ENGINE).
- Hoy responde con reglas sobre los datos de la demo; no usa IA.
- Para sumar IA: reemplazar GRI_ENGINE.ask por una llamada a un backend propio que reciba la pregunta y griContext().
