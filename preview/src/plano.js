/* MiniOficina · Plano (§6.4) — copia de prototipo del componente React
   web/src/pages/Plano.tsx + plano.css. Sin imports, sin build: usa los globales
   del host (avatar, SEED, $, el, MO.toast, MO.go).
   Igual que el módulo React: cero lógica. Cada acción que tocaría el store
   muestra el contrato del callback en un toast. */
(function () {

  /* ── seed de respaldo, por si el host no trajo SEED (§5 del brief) ── */
  var FALLBACK = {
    areas: [
      { id: 'inv', name: 'Investigación', emoji: '🔎', color: '#4D96FF', xp: 40 },
      { id: 'mkt', name: 'Marketing', emoji: '🎨', color: '#FF6B6B', xp: 25 },
      { id: 'ven', name: 'Ventas', emoji: '💰', color: '#6BCB77', xp: 15 }
    ],
    agents: [
      { id: 'ramon', name: 'Don Ramón', role: 'Gerente', isSupervisor: true, xp: 280, avatar: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' } },
      { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado', areaId: 'inv', xp: 145, avatar: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' } },
      { id: 'beto', name: 'Beto', role: 'Analista de competencia', areaId: 'inv', xp: 60, avatar: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' } },
      { id: 'monica', name: 'Mónica', role: 'Redactora creativa', areaId: 'mkt', xp: 95, avatar: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' } },
      { id: 'diego', name: 'Diego', role: 'Diseñador de campaña', areaId: 'mkt', xp: 30, avatar: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' } },
      { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas', areaId: 'ven', xp: 45, avatar: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' } }
    ],
    planos: [
      { id: 'pl1', name: 'Lanzamiento de producto', nodes: [
        { id: 'pl1-p1', kind: 'process', title: 'Investigar mercado', agentId: 'lupita', areaId: 'inv', instructions: 'Busca qué toman hoy en la Roma y la Condesa y a qué precio.' },
        { id: 'pl1-p2', kind: 'process', title: 'Analizar competencia', agentId: 'beto', areaId: 'inv', instructions: 'Compara las tres cafeterías más cercanas y sus promociones.' },
        { id: 'pl1-p3', kind: 'process', title: 'Redactar campaña', agentId: 'monica', areaId: 'mkt', instructions: 'Escribe los mensajes para redes y para el menú de la tienda.' },
        { id: 'pl1-p4', kind: 'process', title: 'Plan de ventas', agentId: 'sofia', areaId: 'ven', instructions: 'Propón metas por semana y el precio de lanzamiento.' },
        { id: 'pl1-r', kind: 'result', title: 'Plan de lanzamiento', format: 'documento' }
      ], edges: [
        { id: 'pl1-e1', source: 'pl1-p1', target: 'pl1-p2', kind: 'flow' },
        { id: 'pl1-e2', source: 'pl1-p2', target: 'pl1-p3', kind: 'flow' },
        { id: 'pl1-e3', source: 'pl1-p3', target: 'pl1-p4', kind: 'flow' },
        { id: 'pl1-e4', source: 'pl1-p4', target: 'pl1-r', kind: 'flow' }
      ] },
      { id: 'pl2', name: 'Atención a clientes', nodes: [
        { id: 'pl2-p1', kind: 'process', title: 'Entender la queja' },
        { id: 'pl2-p2', kind: 'process', title: 'Proponer solución' },
        { id: 'pl2-r', kind: 'result', title: 'Respuesta al cliente', format: 'mensaje' }
      ], edges: [
        { id: 'pl2-e1', source: 'pl2-p1', target: 'pl2-p2', kind: 'flow' },
        { id: 'pl2-e2', source: 'pl2-p2', target: 'pl2-r', kind: 'flow' }
      ] }
    ],
    projects: [
      { id: 'p1', name: 'Lanzamiento Café Frío', emoji: '☕', planoId: 'pl1' },
      { id: 'p2', name: 'Atención a clientes', emoji: '🛟', planoId: 'pl2' }
    ]
  };

  var REQUEST = 'Quiero lanzar el café frío en la Roma y la Condesa el próximo mes con presupuesto de 20 mil pesos.';
  var HANDOFFS = ['hallazgos', 'análisis', 'borrador', 'propuesta'];
  var FORMATS = [
    { id: 'documento', label: 'Documento', emoji: '📄' },
    { id: 'lista', label: 'Lista', emoji: '📋' },
    { id: 'tabla', label: 'Tabla', emoji: '📊' },
    { id: 'mensaje', label: 'Mensaje', emoji: '💬' }
  ];
  var PIEZAS = [
    { kind: 'area', glyph: '▢', label: 'Área', hint: 'Un espacio del despacho' },
    { kind: 'agent', glyph: '☺', label: 'Agente', hint: 'Quién hace la etapa' },
    { kind: 'process', glyph: '▷', label: 'Proceso', hint: 'Un paso del trabajo' },
    { kind: 'result', glyph: '◆', label: 'Resultado', hint: 'Lo que se entrega' }
  ];

  var ICO = {
    back: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    prev: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    caret: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    map: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 6h4v4H6zM14 14h4v4h-4zM10 8h4a2 2 0 0 1 2 2v4"/></svg>',
    check: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5L20 6.5"/></svg>',
    warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4.5l8.2 14.2H3.8z" stroke-linejoin="round"/><path d="M12 10v3.6M12 16.4v.1"/></svg>',
    save: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg>',
    office: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20V7l7-3v16M11 20h9V11h-9"/><path d="M14.5 14.5h2M14.5 17.5h2M7 9v.1M7 12v.1M7 15v.1" stroke-linecap="round"/></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M10 7V5h4v2M6.5 7l1 13h9l1-13"/></svg>',
    link: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11 7.3"/><path d="M14 10a4 4 0 0 0-5.7 0L5.7 12.6a4 4 0 1 0 5.7 5.7L13 16.7"/></svg>'
  };

  /* ── helpers ── */
  function S() { return (typeof SEED !== 'undefined' && SEED && SEED.agents) ? SEED : FALLBACK; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var seq = 0;
  function nuevoId(p) { seq += 1; return p + '-' + Date.now().toString(36) + '-' + seq; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ── estado de UI: el borrador del plano ── */
  var draft = null, openPick = null, dragging = null, root = null;

  function toDraft(plano, areas) {
    var procesos = plano.nodes.filter(function (n) { return n.kind === 'process'; });
    var conectados = {};
    (plano.edges || []).forEach(function (e) { conectados[e.source] = 1; conectados[e.target] = 1; });
    var enBanda = procesos.filter(function (n) { return conectados[n.id] || procesos.length === 1; });
    var sueltos = procesos.filter(function (n) { return enBanda.indexOf(n) < 0; });
    var result = plano.nodes.filter(function (n) { return n.kind === 'result'; })[0];
    function aStage(n, i) {
      return {
        id: n.id, title: n.title || '', areaId: n.areaId || '', agentId: n.agentId || '',
        instructions: n.instructions || '', handoff: HANDOFFS[i % HANDOFFS.length]
      };
    }
    return {
      id: plano.id, name: plano.name,
      areas: areas.slice(),
      stages: enBanda.map(aStage),
      loose: sueltos.map(aStage),
      result: result ? { id: result.id, title: result.title || 'Resultado', format: result.format || 'documento' } : null
    };
  }

  /* Arma el Plano del contrato §7 con nodes y edges bien formados. */
  function toPlano(d) {
    var nodes = [], edges = [];
    d.areas.forEach(function (a, i) {
      nodes.push({ id: d.id + '-area-' + a.id, kind: 'area', position: { x: 40 + i * 240, y: 24 }, refId: a.id, areaId: a.id, title: a.name });
    });
    d.stages.forEach(function (s, i) {
      nodes.push({
        id: s.id, kind: 'process', position: { x: 40 + i * 260, y: 220 },
        title: s.title, instructions: s.instructions,
        agentId: s.agentId || undefined, areaId: s.areaId || undefined,
        parentId: s.areaId ? d.id + '-area-' + s.areaId : undefined
      });
    });
    d.loose.forEach(function (s, i) {
      nodes.push({
        id: s.id, kind: 'process', position: { x: 40 + i * 260, y: 460 },
        title: s.title, instructions: s.instructions,
        agentId: s.agentId || undefined, areaId: s.areaId || undefined
      });
    });
    if (d.result) {
      nodes.push({ id: d.result.id, kind: 'result', position: { x: 40 + d.stages.length * 260, y: 220 }, title: d.result.title, format: d.result.format });
    }
    for (var i = 0; i < d.stages.length - 1; i++) {
      edges.push({ id: d.stages[i].id + '->' + d.stages[i + 1].id, source: d.stages[i].id, target: d.stages[i + 1].id, kind: 'flow' });
    }
    var ultima = d.stages[d.stages.length - 1];
    if (ultima && d.result) edges.push({ id: ultima.id + '->' + d.result.id, source: ultima.id, target: d.result.id, kind: 'flow' });
    return { id: d.id, name: d.name, nodes: nodes, edges: edges };
  }

  /* ── validación (§6.4) ── */
  function revision() {
    var agents = S().agents;
    var fuera = draft.stages.filter(function (s) {
      var ag = s.agentId ? byId(agents, s.agentId) : null;
      return !!(ag && !ag.isSupervisor && ag.areaId && s.areaId && ag.areaId !== s.areaId);
    });
    var sinResp = draft.stages.filter(function (s) { return !s.agentId; });
    var sueltas = draft.loose;
    var sinRes = !draft.result;
    var avisos = [];
    if (fuera.length) avisos.push({ tono: 'warn', texto: fuera.length === 1 ? 'Un agente está sentado fuera de su área.' : fuera.length + ' agentes están sentados fuera de su área.' });
    if (sinResp.length) avisos.push({ tono: 'warn', texto: sinResp.length === 1 ? 'Hay una etapa sin responsable.' : 'Hay ' + sinResp.length + ' etapas sin responsable.' });
    if (sueltas.length) avisos.push({ tono: 'warn', texto: (sueltas.length === 1 ? 'Hay una pieza sin conectar' : 'Hay ' + sueltas.length + ' piezas sin conectar') + ' a la fila de trabajo.' });
    if (sinRes) avisos.push({ tono: 'stop', texto: 'Falta la tarjeta de resultado: sin ella no se puede guardar.' });
    return { fuera: fuera, sinRes: sinRes, avisos: avisos, motivo: sinRes ? 'Agrega una tarjeta de resultado para poder guardar.' : '' };
  }

  /* ── HTML ── */
  function palHTML() {
    var r = revision();
    var piezas = PIEZAS.map(function (p) {
      return '<button class="pl-piece" draggable="true" data-piece="' + p.kind + '" title="' + esc(p.hint) + '">' +
        '<span class="pl-glyph" aria-hidden="true">' + p.glyph + '</span>' +
        '<span><b>' + esc(p.label) + '</b><em>' + esc(p.hint) + '</em></span></button>';
    }).join('');

    var tpls = S().planos.map(function (t) {
      var pasos = t.nodes.filter(function (n) { return n.kind === 'process'; }).length;
      return '<button class="pl-tpl' + (t.id === draft.id ? ' on' : '') + '" data-tpl="' + t.id + '">' +
        '<b>' + esc(t.name) + '</b><em>' + pasos + (pasos === 1 ? ' paso' : ' pasos') + '</em></button>';
    }).join('');

    var checks = r.avisos.map(function (a) {
      return '<li class="' + a.tono + '"><span class="pl-dot" aria-hidden="true"></span>' + esc(a.texto) + '</li>';
    }).join('');

    return '' +
      '<div class="pl-card">' +
        '<div class="pl-card-hd"><span class="pl-ico">' + ICO.map + '</span><h2>Piezas</h2></div>' +
        '<div class="pl-card-bd"><p class="pl-help">Arrástralas a la fila o tócalas para agregarlas.</p>' +
        '<div class="pl-pieces">' + piezas + '</div></div>' +
      '</div>' +
      '<div class="pl-card">' +
        '<div class="pl-card-hd"><span class="pl-ico amber">✦</span><h2>Plantillas</h2></div>' +
        '<div class="pl-card-bd">' + tpls + '</div>' +
      '</div>' +
      '<div class="pl-card">' +
        '<div class="pl-card-hd"><span class="pl-ico ' + (r.avisos.length ? 'amber' : 'ok') + '">' +
          (r.avisos.length ? ICO.warn : ICO.check) + '</span><h2>Revisión</h2></div>' +
        '<div class="pl-card-bd">' +
          (r.avisos.length ? '' : '<p class="pl-ok-msg">Todo listo: cada etapa tiene responsable y hay un resultado al final.</p>') +
          '<ul class="pl-checks">' + checks + '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="pl-pal-foot">' +
        '<button class="pl-btn primary" data-act="save"' + (r.sinRes ? ' disabled title="' + esc(r.motivo) + '"' : '') + '>' + ICO.save + ' Guardar</button>' +
        (r.motivo ? '<p class="pl-why">' + esc(r.motivo) + '</p>' : '') +
        '<button class="pl-btn" data-act="office">' + ICO.office + ' Ver en la oficina</button>' +
      '</div>';
  }

  function flechaHTML(etiqueta, id) {
    var svg = '<svg width="58" height="18" viewBox="0 0 58 18" fill="none" aria-hidden="true">' +
      '<path d="M2 9h42" stroke="#C9D2E8" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M42 2l12 7-12 7z" fill="#C9D2E8"/></svg>';
    var lb = id
      ? '<input class="pl-flow-lb" value="' + esc(etiqueta) + '" data-handoff="' + id + '" aria-label="Qué se pasa a la siguiente etapa">'
      : '<span class="pl-flow-lb ro">' + esc(etiqueta) + '</span>';
    return '<div class="pl-flow">' + lb + svg + '</div>';
  }

  function areasHTML() {
    var agents = S().agents;
    function asientos(list) {
      return list.map(function (ag, i) {
        return '<div class="pl-seat" style="margin-left:' + (i ? -10 : 0) + 'px" title="' + esc(ag.name + ' · ' + ag.role) + '">' +
          avatar(ag.avatar, 38, 'static') + '</div>';
      }).join('');
    }
    var cajas = draft.areas.map(function (a) {
      var mios = agents.filter(function (ag) { return ag.areaId === a.id; });
      return '<div class="pl-area" style="border-color:' + a.color + '55;background:' + a.color + '0F">' +
        '<div class="pl-area-hd"><span class="pl-area-em" aria-hidden="true">' + a.emoji + '</span><b>' + esc(a.name) + '</b>' +
        '<span class="pl-area-n">' + mios.length + '</span></div>' +
        '<div class="pl-seats">' + (mios.length ? asientos(mios) : '<span class="pl-empty">Nadie sentado aquí</span>') + '</div></div>';
    }).join('');
    var libres = agents.filter(function (ag) { return !ag.areaId; });
    if (libres.length) {
      cajas += '<div class="pl-area ghost"><div class="pl-area-hd"><span class="pl-area-em" aria-hidden="true">🪑</span>' +
        '<b>Sin área</b><span class="pl-area-n">' + libres.length + '</span></div>' +
        '<div class="pl-seats">' + asientos(libres) + '</div></div>';
    }
    return '<div class="pl-areas">' + cajas + '</div>';
  }

  function bannerHTML() {
    var r = revision();
    if (!r.avisos.length) return '';
    return '<div class="pl-banner' + (r.sinRes ? ' stop' : '') + '" role="status">' +
      '<span class="pl-banner-ico" aria-hidden="true">' + ICO.warn + '</span><div>' +
      r.avisos.map(function (a) { return '<p>' + esc(a.texto) + '</p>'; }).join('') +
      '</div></div>';
  }

  function stageHTML(s, i) {
    var agents = S().agents;
    var ag = s.agentId ? byId(agents, s.agentId) : null;
    var ar = s.areaId ? byId(draft.areas, s.areaId) : null;
    var mal = revision().fuera.indexOf(s) >= 0;

    var opciones = '<option value="">Sin área</option>' + draft.areas.map(function (a) {
      return '<option value="' + a.id + '"' + (a.id === s.areaId ? ' selected' : '') + '>' + a.emoji + ' ' + esc(a.name) + '</option>';
    }).join('');

    var menu = '';
    if (openPick === s.id) {
      menu = '<div class="pl-menu" role="listbox">' +
        '<button data-pickset="' + s.id + '" data-agent=""><span class="pl-none">Sin responsable</span></button>' +
        agents.map(function (a) {
          return '<button role="option" aria-selected="' + (a.id === s.agentId) + '" data-pickset="' + s.id + '" data-agent="' + a.id + '">' +
            avatar(a.avatar, 26, 'static') + '<span>' + esc(a.name) + ' <span class="pl-rl">· ' + esc(a.role) + '</span></span></button>';
        }).join('') + '</div>';
    }

    return '<article class="pl-step' + (mal ? ' bad' : '') + '">' +
      '<header class="pl-step-hd"><span class="pl-num">' + (i + 1) + '</span><div class="pl-arrows">' +
        '<button data-move="' + s.id + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Mover la etapa ' + (i + 1) + ' a la izquierda">' + ICO.prev + '</button>' +
        '<button data-move="' + s.id + '" data-dir="1"' + (i === draft.stages.length - 1 ? ' disabled' : '') + ' aria-label="Mover la etapa ' + (i + 1) + ' a la derecha">' + ICO.next + '</button>' +
        '<button class="pl-del" data-del="' + s.id + '" aria-label="Quitar la etapa ' + (i + 1) + '">' + ICO.trash + '</button>' +
      '</div></header>' +
      '<input class="pl-step-title" value="' + esc(s.title) + '" placeholder="¿Qué se hace aquí?" data-title="' + s.id + '" aria-label="Nombre de la etapa ' + (i + 1) + '">' +
      '<label class="pl-lb" for="area-' + s.id + '">Área</label>' +
      '<select id="area-' + s.id + '" class="pl-chipsel" data-area="' + s.id + '"' +
        (ar ? ' style="background:' + ar.color + '1A;color:#2C3550;border-color:' + ar.color + '66"' : '') + '>' + opciones + '</select>' +
      '<label class="pl-lb">Responsable</label>' +
      '<div class="pl-pickwrap"><button class="pl-pick" data-pick="' + s.id + '" aria-haspopup="listbox" aria-expanded="' + (openPick === s.id) + '">' +
        (ag ? avatar(ag.avatar, 26, 'static') + '<span class="pl-pick-nm">' + esc(ag.name) + '</span>'
            : '<span class="pl-none">Sin responsable</span>') +
        '<span class="pl-car">' + ICO.caret + '</span></button>' + menu + '</div>' +
      (mal ? '<p class="pl-bad-msg">Está sentado en otra área.</p>' : '') +
      '<label class="pl-lb" for="ins-' + s.id + '">Instrucciones</label>' +
      '<textarea id="ins-' + s.id + '" class="pl-ta" data-ins="' + s.id + '" placeholder="Dile en pocas palabras qué esperas de esta etapa.">' + esc(s.instructions) + '</textarea>' +
    '</article>';
  }

  function resultHTML() {
    if (!draft.result) {
      return '<button class="pl-add res" data-piece="result"><span aria-hidden="true">◆</span> Falta el resultado</button>';
    }
    var opts = FORMATS.map(function (f) {
      return '<option value="' + f.id + '"' + (f.id === draft.result.format ? ' selected' : '') + '>' + f.emoji + ' ' + f.label + '</option>';
    }).join('');
    return '<article class="pl-res"><span class="pl-tag amber">Resultado</span>' +
      '<input class="pl-step-title" value="' + esc(draft.result.title) + '" data-restitle="1" aria-label="Nombre del resultado" placeholder="¿Qué se entrega?">' +
      '<label class="pl-lb" for="pl-format">Formato</label>' +
      '<select id="pl-format" class="pl-chipsel" data-resformat="1">' + opts + '</select>' +
      '<button class="pl-del wide" data-act="delres">' + ICO.trash + ' Quitar resultado</button></article>';
  }

  function trayHTML() {
    if (!draft.loose.length) return '';
    var piezas = draft.loose.map(function (s) {
      return '<div class="pl-loose">' +
        '<input class="pl-step-title sm" value="' + esc(s.title) + '" placeholder="¿Qué se hace aquí?" data-title="' + s.id + '" aria-label="Nombre de la pieza suelta">' +
        '<div class="pl-loose-ft">' +
          '<button class="pl-mini" data-link="' + s.id + '">' + ICO.link + ' Conectar</button>' +
          '<button class="pl-mini del" data-del="' + s.id + '" aria-label="Quitar pieza suelta">' + ICO.trash + '</button>' +
        '</div></div>';
    }).join('');
    return '<div class="pl-tray"><h3>Piezas sin conectar</h3><div class="pl-tray-row">' + piezas + '</div></div>';
  }

  function canvasHTML() {
    var banda = '<article class="pl-in"><span class="pl-tag">Entrada</span>' +
      '<p class="pl-in-tx">“' + esc(REQUEST) + '”</p>' +
      '<span class="pl-in-ft">Lo que pide la persona</span></article>' + flechaHTML('el pedido', null);

    draft.stages.forEach(function (s, i) { banda += stageHTML(s, i) + flechaHTML(s.handoff, s.id); });
    banda += resultHTML();
    banda += '<button class="pl-add" data-act="addstage"><span aria-hidden="true">＋</span> Etapa</button>';

    return areasHTML() + bannerHTML() + '<div class="pl-band">' + banda + '</div>' + trayHTML() +
      '<p class="pl-hand">De izquierda a derecha,<br>como en la vida real ♡</p>';
  }

  /* ── pintar + enganchar ── */
  /** querySelector dentro del módulo; si el host aún no lo montó, cae en el $ global. */
  function q(sel) { return (root && root.querySelector(sel)) || $(sel); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function paint() {
    q('#pl-pal').innerHTML = palHTML();
    q('#pl-canvas').innerHTML = canvasHTML();
    wire();
  }

  function addPiece(kind) {
    if (kind === 'process') {
      draft.loose.push({ id: nuevoId('proc'), title: '', areaId: '', agentId: '', instructions: '', handoff: 'entrega' });
      paint(); return;
    }
    if (kind === 'result') {
      if (!draft.result) { draft.result = { id: nuevoId('res'), title: 'Resultado final', format: 'documento' }; paint(); }
      return;
    }
    if (kind === 'area') {
      draft.areas.push({ id: nuevoId('area'), name: 'Área ' + (draft.areas.length + 1), emoji: '🗂️', color: '#8FA0C8' });
      paint(); return;
    }
    var pendiente = draft.stages.filter(function (s) { return !s.agentId; })[0] || draft.stages[0];
    if (pendiente) { openPick = pendiente.id; paint(); }
  }

  function wire() {
    var pal = q('#pl-pal'), canvas = q('#pl-canvas');

    /* piezas: clic y arrastre */
    each(pal.querySelectorAll('[data-piece]'), function (b) {
      b.onclick = function () { addPiece(b.getAttribute('data-piece')); };
      b.ondragstart = function () { dragging = b.getAttribute('data-piece'); };
      b.ondragend = function () { dragging = null; canvas.classList.remove('drop'); };
    });
    canvas.ondragover = function (e) { if (dragging) { e.preventDefault(); canvas.classList.add('drop'); } };
    canvas.ondragleave = function () { canvas.classList.remove('drop'); };
    canvas.ondrop = function (e) {
      e.preventDefault(); canvas.classList.remove('drop');
      if (dragging) { var k = dragging; dragging = null; addPiece(k); }
    };

    /* plantillas */
    each(pal.querySelectorAll('[data-tpl]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-tpl');
        var t = byId(S().planos, id);
        if (!t) return;
        draft = toDraft(t, S().areas);
        openPick = null;
        paint();
        MO.toast('onLoadTemplate(planoId)', JSON.stringify({ planoId: id }, null, 2));
      };
    });

    /* guardar / oficina / quitar resultado */
    var save = pal.querySelector('[data-act="save"]');
    if (save) save.onclick = function () {
      if (save.disabled) return;
      MO.toast('onSave(plano) recibiría:', JSON.stringify(toPlano(draft), null, 2));
    };
    var office = pal.querySelector('[data-act="office"]');
    if (office) office.onclick = function () {
      MO.toast('onOpenOffice()', 'Aquí el prototipo se va a la oficina en vivo.');
      if (MO.go) MO.go('office');
    };
    var delres = canvas.querySelector('[data-act="delres"]');
    if (delres) delres.onclick = function () { draft.result = null; paint(); };
    var addstage = canvas.querySelector('[data-act="addstage"]');
    if (addstage) addstage.onclick = function () {
      draft.stages.push({ id: nuevoId('proc'), title: '', areaId: '', agentId: '', instructions: '', handoff: 'entrega' });
      paint();
    };
    each(canvas.querySelectorAll('[data-piece]'), function (b) {
      b.onclick = function () { addPiece(b.getAttribute('data-piece')); };
    });

    /* etapas: reordenar, quitar, conectar */
    each(canvas.querySelectorAll('[data-move]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-move'), dir = Number(b.getAttribute('data-dir'));
        var i = draft.stages.map(function (s) { return s.id; }).indexOf(id), j = i + dir;
        if (i < 0 || j < 0 || j >= draft.stages.length) return;
        var mov = draft.stages.splice(i, 1)[0];
        draft.stages.splice(j, 0, mov);
        paint();
      };
    });
    each(canvas.querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        draft.stages = draft.stages.filter(function (s) { return s.id !== id; });
        draft.loose = draft.loose.filter(function (s) { return s.id !== id; });
        paint();
      };
    });
    each(canvas.querySelectorAll('[data-link]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-link');
        var s = byId(draft.loose, id);
        if (!s) return;
        draft.loose = draft.loose.filter(function (x) { return x.id !== id; });
        draft.stages.push(s);
        paint();
      };
    });

    /* texto: se guarda sin repintar para no perder el cursor */
    function stageOf(id) { return byId(draft.stages, id) || byId(draft.loose, id); }
    each(canvas.querySelectorAll('[data-title]'), function (inp) {
      inp.oninput = function () { var s = stageOf(inp.getAttribute('data-title')); if (s) s.title = inp.value; };
    });
    each(canvas.querySelectorAll('[data-ins]'), function (ta) {
      ta.oninput = function () { var s = stageOf(ta.getAttribute('data-ins')); if (s) s.instructions = ta.value; };
    });
    each(canvas.querySelectorAll('[data-handoff]'), function (inp) {
      inp.oninput = function () { var s = stageOf(inp.getAttribute('data-handoff')); if (s) s.handoff = inp.value; };
    });
    var rt = canvas.querySelector('[data-restitle]');
    if (rt) rt.oninput = function () { if (draft.result) draft.result.title = rt.value; };
    var rf = canvas.querySelector('[data-resformat]');
    if (rf) rf.onchange = function () { if (draft.result) { draft.result.format = rf.value; paint(); } };

    /* área y responsable */
    each(canvas.querySelectorAll('[data-area]'), function (sel) {
      sel.onchange = function () {
        var s = stageOf(sel.getAttribute('data-area'));
        if (s) { s.areaId = sel.value; paint(); }
      };
    });
    each(canvas.querySelectorAll('[data-pick]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-pick');
        openPick = (openPick === id) ? null : id;
        paint();
      };
    });
    each(canvas.querySelectorAll('[data-pickset]'), function (b) {
      b.onclick = function () {
        var s = stageOf(b.getAttribute('data-pickset'));
        if (s) s.agentId = b.getAttribute('data-agent') || '';
        openPick = null;
        paint();
      };
    });
  }

  /* ── registro ── */
  MO.register('plano', {
    title: 'Plano',
    subtitle: 'Cómo fluye el trabajo, etapa por etapa',
    css: `
/* MiniOficina · Plano (§6.4) — tema claro (§6). Mismos tokens del módulo aprobado. */
.pl{
  --bg:#F7F8FC; --card:#FFFFFF; --soft:#F4F6FB; --line:#E9EBF4;
  --ink:#1D2237; --ink-2:#5B6379; --ink-3:#9AA1B4;
  --navy:#1B2340; --blue:#4D7CFE; --blue-soft:#EEF3FF;
  --amber:#FFD97A; --amber-deep:#C98A12; --ok:#2FA36B; --danger:#E15252;
  --r:18px; --r-sm:12px;
  --shadow:0 1px 2px rgba(29,34,55,.04),0 14px 30px -22px rgba(29,34,55,.35);
  color:var(--ink);
  font-family:"Nunito Sans",ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;
}
.pl *{box-sizing:border-box}
.pl :where(button){font:inherit;color:inherit}
.pl :focus-visible{outline:2px solid var(--blue);outline-offset:2px}

.pl-head{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;justify-content:space-between;margin-bottom:18px}
.pl-head-l{display:flex;align-items:center;gap:14px}
.pl-back{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--card);
  display:grid;place-items:center;cursor:pointer;color:var(--ink-2);flex:none}
.pl-back:hover{background:var(--soft)}
.pl-title{font-family:Fredoka,"Nunito Sans",system-ui,sans-serif;font-weight:600;font-size:28px;margin:0;letter-spacing:-.02em}
.pl-sub{margin:2px 0 0;color:var(--ink-2);font-size:13.5px}
.pl-crumb{font-size:13px;color:var(--ink-3)}
.pl-crumb b{color:var(--ink-2);font-weight:600}

.pl-wrap{display:grid;grid-template-columns:210px minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:900px){.pl-wrap{grid-template-columns:1fr}}

.pl-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow)}
.pl-card-hd{display:flex;align-items:center;gap:10px;padding:14px 14px 0}
.pl-card-hd h2{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:17px;margin:0}
.pl-card-bd{padding:12px 14px 14px}
.pl-ico{width:30px;height:30px;border-radius:9px;background:var(--blue-soft);color:var(--blue);
  display:grid;place-items:center;flex:none;font-size:14px}
.pl-ico.amber{background:#FFF6DD;color:var(--amber-deep)}
.pl-ico.ok{background:#E8F6EF;color:var(--ok)}
.pl-help{font-size:12px;color:var(--ink-3);margin:0 0 10px}

.pl-pal{display:flex;flex-direction:column;gap:14px;position:sticky;top:12px}
@media (max-width:900px){.pl-pal{position:static}}
.pl-pieces{display:flex;flex-direction:column;gap:8px}
.pl-piece{display:flex;align-items:center;gap:10px;text-align:left;cursor:grab;
  border:1px solid var(--line);background:var(--card);border-radius:var(--r-sm);padding:9px 10px;transition:.14s}
.pl-piece:hover{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.pl-piece:active{cursor:grabbing}
.pl-glyph{width:28px;height:28px;border-radius:9px;background:var(--soft);color:var(--ink-2);
  display:grid;place-items:center;font-size:14px;flex:none}
.pl-piece b{display:block;font-size:13px;font-weight:700}
.pl-piece em{display:block;font-style:normal;font-size:11.5px;color:var(--ink-3);line-height:1.25}

.pl-tpl{width:100%;text-align:left;border:1px solid var(--line);background:var(--card);border-radius:var(--r-sm);
  padding:9px 10px;cursor:pointer;margin-bottom:8px;transition:.14s}
.pl-tpl:last-child{margin-bottom:0}
.pl-tpl:hover{border-color:var(--blue)}
.pl-tpl.on{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.pl-tpl b{display:block;font-size:13px;font-weight:700}
.pl-tpl em{font-style:normal;font-size:11.5px;color:var(--ink-3)}

.pl-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.pl-checks li{display:flex;gap:8px;font-size:12.5px;color:var(--ink-2);line-height:1.35}
.pl-dot{width:8px;height:8px;border-radius:50%;background:var(--amber-deep);flex:none;margin-top:5px}
.pl-checks li.stop{color:var(--danger)}
.pl-checks li.stop .pl-dot{background:var(--danger)}
.pl-ok-msg{margin:0;font-size:12.5px;color:var(--ok);font-weight:600}

.pl-pal-foot{display:flex;flex-direction:column;gap:9px}
.pl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;padding:11px 18px;
  font-weight:700;font-size:13.5px;cursor:pointer;border:1px solid var(--line);background:var(--card)}
.pl-btn:hover{background:var(--soft)}
.pl-btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.pl-btn.primary:hover{background:#242D52}
.pl-btn.primary:disabled{opacity:.45;cursor:not-allowed}
.pl-why{margin:-2px 0 0;font-size:11.5px;color:var(--danger)}

.pl-canvas{position:relative;background:var(--card);border:1px solid var(--line);border-radius:var(--r);
  box-shadow:var(--shadow);padding:16px;
  background-image:radial-gradient(#E9EBF4 1px,transparent 1px);background-size:22px 22px}
.pl-canvas.drop{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}

.pl-areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px}
.pl-area{border:1.5px solid var(--line);border-radius:var(--r-sm);padding:10px;background:var(--card)}
.pl-area.ghost{border-style:dashed;background:var(--soft)}
.pl-area-hd{display:flex;align-items:center;gap:7px;font-size:13px;margin-bottom:8px}
.pl-area-em{font-size:15px}
.pl-area-n{margin-left:auto;background:var(--card);border:1px solid var(--line);border-radius:999px;
  padding:1px 8px;font-size:11.5px;font-weight:700;color:var(--ink-2)}
.pl-seats{display:flex;align-items:flex-end;min-height:46px}
.pl-seat{flex:none}
.pl-empty{font-size:12px;color:var(--ink-3);align-self:center}

.pl-banner{display:flex;gap:10px;align-items:flex-start;background:#FFF6DD;border:1px solid #F2E0B0;
  border-radius:var(--r-sm);padding:10px 12px;margin-bottom:14px}
.pl-banner.stop{background:#FDECEC;border-color:#F5CFCF}
.pl-banner-ico{color:var(--amber-deep);flex:none;margin-top:2px}
.pl-banner.stop .pl-banner-ico{color:var(--danger)}
.pl-banner p{margin:0;font-size:12.5px;color:var(--ink-2)}
.pl-banner p + p{margin-top:3px}

.pl-band{display:flex;align-items:stretch;overflow-x:auto;padding:4px 2px 12px}
.pl-in,.pl-step,.pl-res{flex:none;width:236px;background:var(--card);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:var(--shadow);padding:13px}
.pl-in{display:flex;flex-direction:column;gap:8px;width:210px;background:var(--soft)}
.pl-in-tx{margin:0;font-size:13px;color:var(--ink-2);line-height:1.4}
.pl-in-ft{font-size:11.5px;color:var(--ink-3)}
.pl-tag{display:inline-block;background:var(--blue-soft);color:#2C4BA8;border-radius:8px;padding:4px 8px;
  font-size:11.5px;font-weight:700;align-self:flex-start}
.pl-tag.amber{background:#FFF6DD;color:var(--amber-deep)}

.pl-step.bad{border-color:#F0C3C3;box-shadow:0 0 0 3px #FDECEC}
.pl-step-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.pl-num{width:24px;height:24px;border-radius:8px;background:var(--navy);color:#fff;display:grid;place-items:center;
  font-size:12.5px;font-weight:700;flex:none}
.pl-arrows{margin-left:auto;display:flex;gap:4px}
.pl-arrows button{width:24px;height:24px;border-radius:8px;border:1px solid var(--line);background:var(--card);
  display:grid;place-items:center;cursor:pointer;color:var(--ink-2)}
.pl-arrows button:hover:not(:disabled){background:var(--soft)}
.pl-arrows button:disabled{opacity:.35;cursor:not-allowed}
.pl-del{color:var(--ink-3)}
.pl-del:hover{color:var(--danger)}
.pl-del.wide{width:100%;margin-top:10px;display:inline-flex;align-items:center;justify-content:center;gap:7px;
  border:1px solid var(--line);background:var(--card);border-radius:10px;padding:7px;font-size:12.5px;cursor:pointer}

.pl-step-title{width:100%;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--card);
  padding:9px 11px;font:inherit;font-size:14px;font-weight:700;color:var(--ink)}
.pl-step-title.sm{font-size:13px}
.pl-step-title::placeholder{color:var(--ink-3);font-weight:400}
.pl-step-title:focus,.pl-chipsel:focus,.pl-ta:focus,.pl-flow-lb:focus{outline:none;border-color:var(--blue);
  box-shadow:0 0 0 3px var(--blue-soft)}
.pl-lb{display:block;font-size:13px;font-weight:700;margin:11px 0 5px}
.pl-chipsel{width:100%;border:1px solid var(--line);background:var(--blue-soft);color:#2C4BA8;border-radius:8px;
  padding:6px 8px;font:inherit;font-size:12.5px;font-weight:600}
.pl-ta{width:100%;border:1px solid var(--line);border-radius:var(--r-sm);background:var(--card);padding:9px 11px;
  font:inherit;font-size:12.5px;color:var(--ink);resize:vertical;min-height:62px}
.pl-ta::placeholder{color:var(--ink-3)}
.pl-bad-msg{margin:6px 0 0;font-size:11.5px;color:var(--danger)}

.pl-pickwrap{position:relative}
.pl-pick{width:100%;display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);
  border-radius:var(--r-sm);padding:6px 10px;cursor:pointer;text-align:left;font-size:13px;min-height:42px}
.pl-pick-nm{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-none{color:var(--ink-3)}
.pl-car{margin-left:auto;color:var(--ink-3);flex:none}
.pl-menu{position:absolute;z-index:20;left:0;right:0;top:calc(100% + 6px);background:var(--card);
  border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 40px -18px rgba(29,34,55,.4);
  padding:6px;max-height:240px;overflow:auto}
.pl-menu button{width:100%;display:flex;align-items:center;gap:9px;background:none;border:none;border-radius:10px;
  padding:6px 8px;cursor:pointer;text-align:left;font-size:13px}
.pl-menu button:hover{background:var(--soft)}
.pl-rl{color:var(--ink-3);font-size:11.5px}

.pl-flow{flex:none;width:86px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  padding:0 4px}
.pl-flow-lb{width:78px;text-align:center;border:1px solid var(--line);background:var(--card);border-radius:999px;
  padding:3px 6px;font:inherit;font-size:11.5px;font-weight:600;color:var(--ink-2)}
.pl-flow-lb.ro{display:block;color:var(--ink-3);font-weight:600}

.pl-add{flex:none;width:150px;align-self:stretch;border:1.5px dashed #C9D0E4;background:none;border-radius:var(--r);
  color:var(--ink-2);font-weight:700;font-size:13.5px;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;min-height:180px}
.pl-add span{font-size:20px}
.pl-add:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}
.pl-add.res{border-color:#E7CE93;color:var(--amber-deep)}
.pl-add.res:hover{background:#FFF6DD;border-color:var(--amber-deep);color:var(--amber-deep)}

.pl-tray{border:1.5px dashed #C9D0E4;border-radius:var(--r-sm);padding:11px;background:var(--soft);margin-top:6px}
.pl-tray h3{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:14px;margin:0 0 9px}
.pl-tray-row{display:flex;flex-wrap:wrap;gap:9px}
.pl-loose{width:214px;background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);padding:9px}
.pl-loose-ft{display:flex;gap:6px;margin-top:8px}
.pl-mini{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card);
  border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--ink-2);cursor:pointer}
.pl-mini:hover{border-color:var(--blue);color:var(--blue)}
.pl-mini.del:hover{border-color:var(--danger);color:var(--danger)}

.pl-hand{margin:10px 0 0;text-align:right;font-family:"Caveat","Segoe Script",cursive;font-size:17px;
  line-height:1.2;color:var(--ink-3)}

@media (prefers-reduced-motion:reduce){.pl *{animation:none!important;transition:none!important}}
`,
    render: function (host) {
      root = host;
      var seed = S();
      var proyecto = (seed.projects && seed.projects[0]) || { name: 'Lanzamiento Café Frío', planoId: 'pl1' };
      var base = byId(seed.planos, proyecto.planoId) || seed.planos[0];
      draft = toDraft(base, seed.areas);
      openPick = null;
      dragging = null;

      root.innerHTML = '' +
        '<div class="pl">' +
          '<header class="pl-head"><div class="pl-head-l">' +
            '<button class="pl-back" aria-label="Volver">' + ICO.back + '</button>' +
            '<div><h1 class="pl-title">Plano del despacho</h1>' +
            '<p class="pl-sub">Así fluye el trabajo de ' + esc(proyecto.name) + ', de izquierda a derecha.</p></div>' +
          '</div>' +
          '<span class="pl-crumb">Proyecto › <b>' + esc(draft.name) + '</b></span></header>' +
          '<div class="pl-wrap"><aside class="pl-pal" id="pl-pal"></aside>' +
          '<section class="pl-canvas" id="pl-canvas"></section></div>' +
        '</div>';

      var volver = root.querySelector('.pl-back');
      if (volver) volver.onclick = function () { if (MO.go) MO.go('lobby'); };

      paint();
    }
  });

})();
