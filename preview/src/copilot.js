/* MiniOficina · Panel generativo (§6.5) — copia de prototipo del componente React
   web/src/components/copilot/CopilotPanel.tsx + copilot-panel.css.
   Sin imports y sin build: usa los globales del host (avatar, SEED, $, el, MO.toast, MO.go).
   Igual que el módulo React, el panel no genera nada: cada acción que en la app
   tocaría el store muestra el contrato del callback en un toast. Lo único que el
   prototipo sí finge es el "Pensando…" de 1.2 s y la tarjeta de cambios que sale
   después, para que se vea el movimiento de la pantalla. */
(function () {

  /* ── seed de respaldo, por si el host no trajo SEED (§5 del brief) ── */
  var FALLBACK_AGENTS = [
    { id: 'ramon', name: 'Don Ramón', role: 'Gerente' },
    { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado' },
    { id: 'beto', name: 'Beto', role: 'Analista de competencia' },
    { id: 'monica', name: 'Mónica', role: 'Redactora creativa' },
    { id: 'diego', name: 'Diego', role: 'Diseñador de campaña' },
    { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas' }
  ];
  var AVATARES = {
    ramon: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' },
    lupita: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' },
    beto: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' },
    monica: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' },
    diego: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' },
    sofia: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' }
  };

  function agentes() {
    var list = (typeof SEED !== 'undefined' && SEED && SEED.agents) ? SEED.agents : FALLBACK_AGENTS;
    return list.map(function (a) {
      return { id: a.id, name: a.name, role: a.role, avatar: a.avatar || AVATARES[a.id] || AVATARES.lupita };
    });
  }

  /* mascota de compañía: la de Lupita */
  var HELPER = AVATARES.lupita;

  var CONTEXTO = 'Agentes del proyecto Café Frío';
  var PLACEHOLDER = 'Ejemplo: Agrega un área de Logística con un agente que cotice envíos a la Roma y la Condesa.';
  var SUGERENCIAS = [
    'Agrega un área de Logística con un agente que cotice envíos',
    'Ponle una habilidad de buscar en web a Lupita',
    'Crea un flujo para atender quejas'
  ];

  /* cambio de ejemplo: la pantalla abre con el seed cargado, nunca vacía */
  var CAMBIOS_SEED = [{
    id: 'c1',
    summary: 'Armé el área de Marketing con Mónica adentro y un paso para redactar la campaña.',
    when: 'hace un momento',
    lines: [
      { kind: 'created', what: 'Área', name: '🎨 Marketing' },
      { kind: 'created', what: 'Agente', name: 'Mónica · Redactora creativa' },
      { kind: 'created', what: 'Paso', name: 'Redactar campaña' },
      { kind: 'updated', what: 'Agente', name: 'Don Ramón · ahora supervisa Marketing' }
    ]
  }];

  var SIGNO = { created: '+', updated: '✎', removed: '−' };
  var SIGNO_TX = { created: 'Creado', updated: 'Modificado', removed: 'Eliminado' };

  /* ── iconos (los mismos del componente) ── */
  var ICO = {
    spark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l1.7 4.9 4.9 1.7-4.9 1.7L12 15.8l-1.7-4.9-4.9-1.7 4.9-1.7L12 2.6z"/><path d="M18.6 14.4l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5z" opacity=".65"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-8-6 8 6 8-16-8z"/></svg>',
    office: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20V7l7-3v16M11 20h9V11h-9"/><path d="M14.5 14.5h2M14.5 17.5h2M7 10v.1M7 13v.1M7 16v.1" stroke-linecap="round"/></svg>',
    undo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h9a5 5 0 1 1 0 10H8"/><path d="M7.5 4.5L4 8l3.5 3.5"/></svg>',
    pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ═══════════════ HTML ═══════════════ */

  function fondoHTML() {
    var team = agentes().map(function (a) {
      return '<div class="cp-demo-card">' + avatar(a.avatar, 64, 'static') +
        '<b>' + esc(a.name) + '</b><span>' + esc(a.role) + '</span></div>';
    }).join('');
    return '' +
      '<div class="cp cp-demo">' +
      '  <h1 class="cp-demo-tt">Agentes del proyecto ☕ Café Frío</h1>' +
      '  <p class="cp-demo-sub">Cualquier pantalla sirve: el panel se abre encima, a la derecha. ' +
      '     Ábrelo con la pastilla ✨ o con ⌘K / Ctrl+K.</p>' +
      '  <div class="cp-demo-grid">' + team + '</div>' +
      '  <p class="cp-demo-hand">Aquí vive tu equipo ♡</p>' +
      '</div>' +
      '<button class="cp cp-fab" id="cp-fab" aria-label="Pídeselo a la IA">' +
      '  <span class="cp-fab-ico" aria-hidden="true">✨</span>' +
      '  <span class="cp-fab-tx">Pídeselo a la IA</span>' +
      '  <kbd class="cp-fab-kbd">⌘K</kbd>' +
      '</button>';
  }

  function cambioHTML(c) {
    var lineas = c.lines.map(function (l) {
      return '<li class="cp-line ' + l.kind + '">' +
        '<span class="cp-sign" aria-hidden="true">' + SIGNO[l.kind] + '</span>' +
        '<span class="cp-sr">' + SIGNO_TX[l.kind] + ':</span>' +
        '<span class="cp-what">' + esc(l.what) + '</span>' +
        '<b class="cp-name">' + esc(l.name) + '</b></li>';
    }).join('');
    return '' +
      '<article class="cp-change" data-id="' + esc(c.id) + '">' +
      '  <p class="cp-change-sum">' + esc(c.summary) + '</p>' +
      (c.when ? '  <p class="cp-change-when">' + esc(c.when) + '</p>' : '') +
      '  <ul class="cp-diff">' + lineas + '</ul>' +
      '  <div class="cp-change-foot">' +
      '    <button class="cp-btn cp-ver" data-id="' + esc(c.id) + '">' + ICO.office + ' Ver en la oficina</button>' +
      '    <button class="cp-btn ghost cp-undo" data-id="' + esc(c.id) + '">' + ICO.undo + ' Deshacer</button>' +
      '  </div>' +
      '</article>';
  }

  function cuerpoHTML(ui) {
    var pensando = ui.thinking ? '' +
      '<div class="cp-think" aria-live="polite">' + avatar(HELPER, 48, 'working') +
      '  <div><p class="cp-think-tx">Pensando<span class="cp-dots" aria-hidden="true"><i></i><i></i><i></i></span></p>' +
      '  <p class="cp-think-sub">Ya casi: está acomodando a tu equipo.</p></div>' +
      '</div>' : '';

    if (ui.changes.length) {
      return pensando + '<section class="cp-hist"><h3 class="cp-hist-tt">Lo que se cambió</h3>' +
        ui.changes.map(cambioHTML).join('') + '</section>';
    }
    if (ui.thinking) return pensando;
    return '' +
      '<div class="cp-empty">' + avatar(HELPER, 72, 'idle') +
      '  <p class="cp-empty-tx">Aquí no hay nada todavía. Cuéntame qué quieres y lo acomodo en tu oficina.</p>' +
      '  <p class="cp-empty-hand">Sin apuros, se puede deshacer ♡</p>' +
      '</div>';
  }

  function panelHTML(ui) {
    var chips = SUGERENCIAS.map(function (s) {
      return '<button class="cp-sug-chip" data-sug="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('');
    return '' +
      '<div class="cp cp-layer">' +
      '  <div class="cp-veil" id="cp-veil" aria-hidden="true"></div>' +
      '  <aside class="cp-panel" role="dialog" aria-modal="true" aria-label="Pídeselo a la IA">' +
      '    <header class="cp-head">' +
      '      <div class="cp-head-l"><span class="cp-chip-ico">' + ICO.spark + '</span>' +
      '        <div><h2 class="cp-title">Pídeselo a la IA</h2>' +
      '        <p class="cp-sub">¿Qué quieres cambiar?</p></div></div>' +
      '      <div class="cp-head-r"><kbd class="cp-kbd" title="Abre y cierra este panel">⌘K</kbd>' +
      '        <button class="cp-x" id="cp-x" aria-label="Cerrar el panel">' + ICO.close + '</button></div>' +
      '    </header>' +
      '    <div class="cp-ctx"><span class="cp-ctx-ico" aria-hidden="true">' + ICO.pin + '</span>' +
      '      Estás en: <b>' + esc(CONTEXTO) + '</b></div>' +
      '    <div class="cp-ask">' +
      '      <label class="cp-lb" for="cp-ta">Dilo con tus palabras</label>' +
      '      <div class="cp-tawrap"><textarea id="cp-ta" class="cp-ta" placeholder="' + esc(PLACEHOLDER) + '"></textarea></div>' +
      '      <div class="cp-ask-foot">' +
      '        <span class="cp-hint">Enter para enviar · Shift + Enter para otro renglón</span>' +
      '        <button class="cp-btn primary" id="cp-send" disabled>' + ICO.send + ' Enviar</button>' +
      '      </div>' +
      '      <div class="cp-sug" aria-label="Sugerencias rápidas">' + chips + '</div>' +
      '    </div>' +
      '    <div class="cp-body" id="cp-body">' + cuerpoHTML(ui) + '</div>' +
      '  </aside>' +
      '</div>';
  }

  /* ═══════════════ Lo que el prototipo finge: la respuesta de la IA ═══════════════
     Nada de esto vive en el componente React: allá las tarjetas llegan por prop.
     Aquí se arma una tarjeta coherente con lo que se escribió y se enseña, en un
     toast, el arreglo de operaciones (Op del §7) que la app habría emitido.     */

  var NOMBRES = ['Marisol', 'Chuy', 'Paty', 'Nacho', 'Rosa', 'Toño'];
  var COLORES = ['#4D96FF', '#FF6B6B', '#6BCB77', '#B892FF', '#FF9F1C', '#FFD93D'];
  var n = 0;

  function inventaCambio(texto) {
    var id = 'c' + (Date.now() % 100000);
    var t = texto.toLowerCase();
    var mArea = texto.match(/[áa]rea\s+(?:de\s+|nueva\s+de\s+|llamada\s+|para\s+)?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,20})/i);
    var quien = agentes().filter(function (a) { return t.indexOf(a.name.toLowerCase()) >= 0; })[0];
    var quita = /quita|elimina|borra|saca/.test(t);

    /* 1 · pidió un área → se crea el área con un agente adentro */
    if (mArea) {
      var area = mayus(mArea[1]);
      var nombre = NOMBRES[n % NOMBRES.length]; n++;
      var color = COLORES[n % COLORES.length];
      return {
        card: {
          id: id, when: 'hace un segundo',
          summary: 'Creé el área de ' + area + ' y senté ahí a ' + nombre + ', que se encarga de eso.',
          lines: [
            { kind: 'created', what: 'Área', name: '📦 ' + area },
            { kind: 'created', what: 'Agente', name: nombre + ' · Encargada de ' + area },
            { kind: 'updated', what: 'Plano', name: 'Lanzamiento de producto · ahora pasa por ' + area }
          ]
        },
        ops: [
          { op: 'addArea', name: area, emoji: '📦', color: color, rules: 'Atiende lo de ' + area + ' del proyecto.' },
          { op: 'addAgent', name: nombre, role: 'Encargada de ' + area, areaId: '(el área recién creada)', does: texto },
          { op: 'addProcess', planoId: 'pl1', title: area, agentId: '(el agente recién creado)' }
        ]
      };
    }

    /* 2 · pidió quitar algo */
    if (quita) {
      var queQuita = quien ? quien.name : 'lo que pediste';
      return {
        card: {
          id: id, when: 'hace un segundo',
          summary: 'Quité ' + queQuita + ' del proyecto. Nada más se perdió.',
          lines: [
            { kind: 'removed', what: quien ? 'Agente' : 'Elemento', name: queQuita },
            { kind: 'updated', what: 'Plano', name: 'Lanzamiento de producto · quedó sin ese paso' }
          ]
        },
        ops: [{ op: 'remove', kind: quien ? 'agent' : 'node', id: quien ? quien.id : '(id del elemento)' }]
      };
    }

    /* 3 · habló de un agente del equipo → se le ajusta la ficha */
    if (quien) {
      var hab = (t.indexOf('buscar') >= 0 || t.indexOf('web') >= 0) ? 'Buscar en web'
        : (t.indexOf('traducir') >= 0) ? 'Traducir'
          : (t.indexOf('revisar') >= 0) ? 'Revisar' : 'Resumir';
      return {
        card: {
          id: id, when: 'hace un segundo',
          summary: 'Le agregué a ' + quien.name + ' la habilidad de ' + hab.toLowerCase() + '.',
          lines: [
            { kind: 'updated', what: 'Agente', name: quien.name + ' · nueva habilidad: ' + hab },
            { kind: 'updated', what: 'Ficha', name: 'Qué hace ' + quien.name }
          ]
        },
        ops: [{ op: 'updateAgent', id: quien.id, skillIds: ['buscar'], does: texto }]
      };
    }

    /* 4 · pidió un flujo o proceso */
    if (/flujo|proceso|paso|queja|atender|atenci[oó]n/.test(t)) {
      return {
        card: {
          id: id, when: 'hace un segundo',
          summary: 'Armé un flujo de tres pasos para atender quejas, con su respuesta al cliente al final.',
          lines: [
            { kind: 'created', what: 'Plano', name: 'Atención a clientes' },
            { kind: 'created', what: 'Paso', name: 'Entender la queja' },
            { kind: 'created', what: 'Paso', name: 'Proponer solución' },
            { kind: 'created', what: 'Resultado', name: 'Respuesta al cliente (mensaje)' }
          ]
        },
        ops: [
          { op: 'addProcess', planoId: 'pl2', title: 'Entender la queja' },
          { op: 'addProcess', planoId: 'pl2', title: 'Proponer solución' },
          { op: 'addProcess', planoId: 'pl2', title: 'Respuesta al cliente', format: 'mensaje' }
        ]
      };
    }

    /* 5 · cualquier otra cosa */
    var corto = texto.length > 54 ? texto.slice(0, 54).trim() + '…' : texto;
    return {
      card: {
        id: id, when: 'hace un segundo',
        summary: 'Anoté tu pedido y lo acomodé en el proyecto Café Frío.',
        lines: [
          { kind: 'updated', what: 'Proyecto', name: '☕ Lanzamiento Café Frío' },
          { kind: 'created', what: 'Paso', name: corto }
        ]
      },
      ops: [{ op: 'runProject', projectId: 'p1', request: texto }]
    };
  }

  /* ═══════════════ Registro ═══════════════ */

  MO.register('copilot', {
    title: 'Panel generativo',
    subtitle: 'Pídeselo a la IA desde cualquier pantalla',
    css: `/* MiniOficina · Panel generativo (§6.5) — tema claro (§6) */
.cp{
  --bg:#F7F8FC; --card:#FFFFFF; --soft:#F4F6FB; --line:#E9EBF4;
  --ink:#1D2237; --ink-2:#5B6379; --ink-3:#9AA1B4;
  --navy:#1B2340; --blue:#4D7CFE; --blue-soft:#EEF3FF;
  --amber:#FFD97A; --amber-deep:#C98A12; --ok:#2FA36B; --danger:#E15252;
  --r:18px; --r-sm:12px;
  --shadow:0 1px 2px rgba(29,34,55,.04),0 14px 30px -22px rgba(29,34,55,.35);
  color:var(--ink);
  font-family:"Nunito Sans",ui-sans-serif,system-ui,-apple-system,sans-serif;
  font-size:14px; line-height:1.5;
}
.cp *{box-sizing:border-box}
.cp :where(button){font:inherit;color:inherit}
.cp :focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.cp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}

/* ---------- capa y velo ---------- */
.cp-layer{position:fixed;inset:0;z-index:70}
.cp-veil{position:absolute;inset:0;background:rgba(27,35,64,.28);backdrop-filter:blur(1.5px);
  animation:cp-fade .18s ease-out}
@keyframes cp-fade{from{opacity:0}to{opacity:1}}

/* ---------- panel ---------- */
.cp-panel{position:absolute;top:0;right:0;bottom:0;width:360px;max-width:100%;
  background:var(--card);border-left:1px solid var(--line);
  box-shadow:-26px 0 60px -34px rgba(29,34,55,.55);
  display:flex;flex-direction:column;overflow:hidden;animation:cp-in .22s cubic-bezier(.2,.9,.3,1)}
@keyframes cp-in{from{transform:translateX(26px);opacity:.4}to{transform:none;opacity:1}}
@media (max-width:520px){.cp-panel{width:100%;border-left:none}}

/* ---------- encabezado ---------- */
.cp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
  padding:16px 16px 12px;border-bottom:1px solid var(--line)}
.cp-head-l{display:flex;align-items:center;gap:10px;min-width:0}
.cp-chip-ico{width:30px;height:30px;border-radius:9px;background:#FFF6DD;color:var(--amber-deep);
  display:grid;place-items:center;flex:none}
.cp-title{font-family:Fredoka,"Nunito Sans",system-ui,sans-serif;font-weight:600;font-size:17px;
  margin:0;letter-spacing:-.02em}
.cp-sub{margin:1px 0 0;font-size:12.5px;color:var(--ink-3)}
.cp-head-r{display:flex;align-items:center;gap:8px;flex:none}
.cp-kbd,.cp-fab-kbd{font-family:inherit;font-size:11.5px;font-weight:700;color:var(--ink-3);
  border:1px solid var(--line);border-radius:8px;padding:3px 7px;background:var(--soft);white-space:nowrap}
.cp-x{width:32px;height:32px;border-radius:10px;border:1px solid var(--line);background:var(--card);
  display:grid;place-items:center;cursor:pointer;color:var(--ink-2)}
.cp-x:hover{background:var(--soft)}

/* ---------- chip de contexto ---------- */
.cp-ctx{display:flex;align-items:center;gap:7px;margin:12px 16px 0;
  background:var(--blue-soft);color:#2C4BA8;border-radius:8px;padding:7px 10px;
  font-size:12.5px;font-weight:600}
.cp-ctx b{font-weight:800}
.cp-ctx-ico{display:grid;place-items:center;flex:none;color:#4D7CFE}

/* ---------- campo de texto ---------- */
.cp-ask{padding:12px 16px 14px;border-bottom:1px solid var(--line)}
.cp-lb{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.cp-tawrap{position:relative}
.cp-ta{width:100%;min-height:96px;resize:vertical;background:var(--card);border:1px solid var(--line);
  border-radius:var(--r-sm);padding:11px 13px;font:inherit;font-size:13.5px;color:var(--ink);transition:.14s}
.cp-ta::placeholder{color:var(--ink-3)}
.cp-ta:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.cp-ask-foot{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}
.cp-hint{font-size:12px;color:var(--ink-3);flex:1;min-width:120px}

.cp-btn{display:inline-flex;align-items:center;gap:7px;border-radius:12px;padding:9px 14px;
  font-weight:700;font-size:13px;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink)}
.cp-btn:hover{background:var(--soft)}
.cp-btn.primary{background:var(--navy);border-color:var(--navy);color:#fff;padding:11px 18px;font-size:13.5px}
.cp-btn.primary:hover{background:#242D52}
.cp-btn.primary:disabled{opacity:.45;cursor:not-allowed}
.cp-btn.ghost{border-color:transparent;background:none;color:var(--ink-2)}
.cp-btn.ghost:hover{background:var(--soft)}

/* ---------- sugerencias ---------- */
.cp-sug{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.cp-sug-chip{text-align:left;border:1px solid var(--line);background:var(--card);border-radius:999px;
  padding:6px 12px;font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer;transition:.14s}
.cp-sug-chip:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}

/* ---------- cuerpo con scroll ---------- */
.cp-body{flex:1;overflow:auto;padding:14px 16px 22px;background:var(--bg)}

/* pensando */
.cp-think{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:var(--shadow);padding:12px 14px;margin-bottom:14px}
.cp-think-tx{margin:0;font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:2px}
.cp-think-sub{margin:2px 0 0;font-size:12px;color:var(--ink-3)}
.cp-dots{display:inline-flex;align-items:flex-end;gap:3px;margin-left:4px;padding-bottom:3px}
.cp-dots i{width:4px;height:4px;border-radius:50%;background:var(--blue);display:block;
  animation:cp-dot 1.1s ease-in-out infinite}
.cp-dots i:nth-child(2){animation-delay:.16s}
.cp-dots i:nth-child(3){animation-delay:.32s}
@keyframes cp-dot{0%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}

/* historial */
.cp-hist-tt{font-family:Fredoka,"Nunito Sans",system-ui,sans-serif;font-weight:600;font-size:14px;
  margin:0 0 10px;letter-spacing:-.02em;color:var(--ink-2)}
.cp-change{background:var(--card);border:1px solid var(--line);border-radius:var(--r);
  box-shadow:var(--shadow);padding:14px;margin-bottom:12px;animation:cp-card .24s ease-out}
@keyframes cp-card{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.cp-change-sum{margin:0;font-size:13.5px;font-weight:700;line-height:1.35}
.cp-change-when{margin:3px 0 0;font-size:12px;color:var(--ink-3)}
.cp-diff{list-style:none;margin:11px 0 0;padding:0;background:var(--soft);border-radius:var(--r-sm);padding:9px 10px}
.cp-line{display:flex;align-items:baseline;gap:8px;font-size:12.5px;padding:3px 0;position:relative}
.cp-sign{width:18px;height:18px;flex:none;border-radius:6px;display:grid;place-items:center;
  font-weight:800;font-size:12px;line-height:1;align-self:center}
.cp-line.created .cp-sign{background:#E4F6ED;color:var(--ok)}
.cp-line.updated .cp-sign{background:var(--blue-soft);color:var(--blue)}
.cp-line.removed .cp-sign{background:#FDE9E9;color:var(--danger)}
.cp-what{color:var(--ink-3)}
.cp-name{font-weight:700;color:var(--ink);min-width:0;overflow-wrap:anywhere}
.cp-change-foot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;
  padding-top:11px;border-top:1px solid var(--line)}

/* vacío */
.cp-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;
  padding:26px 12px 10px}
.cp-empty-tx{margin:6px 0 0;font-size:13px;color:var(--ink-2);max-width:250px}
.cp-empty-hand{margin:2px 0 0;font-family:"Caveat","Segoe Script",cursive;font-size:17px;color:var(--ink-3)}

/* ---------- pastilla flotante ---------- */
.cp-fab{position:fixed;right:22px;bottom:22px;z-index:60;display:inline-flex;align-items:center;gap:9px;
  background:var(--navy);color:#fff;border:1px solid var(--navy);border-radius:999px;
  padding:12px 18px;font-weight:700;font-size:13.5px;cursor:pointer;
  box-shadow:0 10px 26px -12px rgba(29,34,55,.7)}
.cp-fab:hover{background:#242D52;transform:translateY(-1px)}
.cp-fab-ico{font-size:15px;line-height:1}
.cp-fab-kbd{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#D9DEF2}
@media (max-width:520px){.cp-fab{right:14px;bottom:14px}.cp-fab-tx{display:none}.cp-fab-kbd{display:none}}

/* ---------- sólo para el prototipo: la pantalla de fondo ---------- */
.cp-demo{padding:4px 2px 40px}
.cp-demo-tt{font-family:Fredoka,"Nunito Sans",system-ui,sans-serif;font-weight:600;font-size:28px;
  margin:0;letter-spacing:-.02em}
.cp-demo-sub{margin:4px 0 18px;color:var(--ink-2);font-size:13.5px;max-width:560px}
.cp-demo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;max-width:820px}
.cp-demo-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);
  padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.cp-demo-card b{font-size:13.5px}
.cp-demo-card span{font-size:12px;color:var(--ink-3)}
.cp-demo-hand{font-family:"Caveat","Segoe Script",cursive;font-size:19px;color:var(--ink-3);margin:14px 0 0}
@media (max-width:900px){.cp-demo-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}}

@media (prefers-reduced-motion:reduce){.cp *,.cp{animation:none!important;transition:none!important}}`,

    render: function (root) {
      /* estado de UI del prototipo (el componente React lo recibe por props) */
      var ui = { open: true, thinking: false, changes: CAMBIOS_SEED.slice(), text: '' };
      var timers = [];

      root.innerHTML = fondoHTML();
      var host = el('<div id="cp-host"></div>');
      root.appendChild(host);

      function pintaCuerpo() {
        var b = host.querySelector('#cp-body');
        if (b) b.innerHTML = cuerpoHTML(ui);
        enganchaCuerpo();
      }

      function pintaPanel() {
        host.innerHTML = ui.open ? panelHTML(ui) : '';
        var fab = root.querySelector('#cp-fab');
        if (fab) fab.style.display = ui.open ? 'none' : '';
        if (ui.open) enganchaPanel();
      }

      function enganchaCuerpo() {
        Array.prototype.forEach.call(host.querySelectorAll('.cp-ver'), function (b) {
          b.onclick = function () {
            MO.toast('onViewInOffice(changeId)', JSON.stringify({ changeId: b.dataset.id }, null, 2));
            timers.push(setTimeout(function () { try { MO.go('office'); } catch (e) { /* sin oficina montada */ } }, 500));
          };
        });
        Array.prototype.forEach.call(host.querySelectorAll('.cp-undo'), function (b) {
          b.onclick = function () {
            var id = b.dataset.id;
            MO.toast('onUndo(changeId)', JSON.stringify({ changeId: id }, null, 2));
            ui.changes = ui.changes.filter(function (c) { return c.id !== id; });
            pintaCuerpo();
          };
        });
      }

      function enviar() {
        var ta = host.querySelector('#cp-ta');
        var texto = (ta && ta.value.trim()) || '';
        if (!texto) { if (ta) ta.focus(); return; }
        MO.toast('onSubmit(texto)', JSON.stringify({ texto: texto, contexto: CONTEXTO }, null, 2));
        ta.value = ''; ui.text = '';
        host.querySelector('#cp-send').disabled = true;

        /* así se ve mientras la IA piensa (en la app, prop thinking) */
        ui.thinking = true; pintaCuerpo();
        timers.push(setTimeout(function () {
          var r = inventaCambio(texto);
          ui.thinking = false;
          ui.changes = [r.card].concat(ui.changes);
          pintaCuerpo();
          MO.toast('Cambios que la app habría aplicado', JSON.stringify(r.ops, null, 2));
        }, 1200));
      }

      function enganchaPanel() {
        var ta = host.querySelector('#cp-ta');
        var send = host.querySelector('#cp-send');
        ta.value = ui.text;
        send.disabled = !ui.text.trim();
        ta.focus();
        ta.addEventListener('input', function () {
          ui.text = ta.value; send.disabled = !ta.value.trim();
        });
        ta.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
        });
        send.onclick = enviar;
        host.querySelector('#cp-x').onclick = cerrar;
        host.querySelector('#cp-veil').onclick = cerrar;
        Array.prototype.forEach.call(host.querySelectorAll('.cp-sug-chip'), function (c) {
          c.onclick = function () {
            var s = c.dataset.sug;
            ui.text = s; ta.value = s; send.disabled = false; ta.focus();
            MO.toast('onPickSuggestion(texto)', JSON.stringify({ texto: s }, null, 2));
          };
        });
        enganchaCuerpo();
      }

      function cerrar() { ui.open = false; MO.toast('onClose()', 'El panel se cierra; la pantalla de atrás no se toca.'); pintaPanel(); }
      function abrir() { ui.open = true; pintaPanel(); }

      root.querySelector('#cp-fab').onclick = abrir;

      /* atajo ⌘K / Ctrl+K y Esc — es teclado, no negocio */
      if (window.__cpKey) window.removeEventListener('keydown', window.__cpKey);
      window.__cpKey = function (e) {
        if (!document.body.contains(host)) { window.removeEventListener('keydown', window.__cpKey); return; }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (ui.open) cerrar(); else abrir();
        } else if (e.key === 'Escape' && ui.open) { cerrar(); }
      };
      window.addEventListener('keydown', window.__cpKey);

      pintaPanel();
    }
  });

})();
