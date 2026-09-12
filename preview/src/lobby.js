/* MiniOficina · Lobby (§6.1) — copia de prototipo del componente React
   web/src/pages/Lobby.tsx + lobby.css. Sin imports, sin build: usa los globales
   del host (avatar, SEED, levelFor, $, el, MO.toast, MO.go).
   Igual que el módulo React: cero lógica: cada acción que tocaría el store
   muestra el contrato del callback en un toast. */
(function () {

  /* ── seed de respaldo, por si el host no trajo SEED (§5 del brief) ── */
  var FALLBACK = {
    areas: [
      { id: 'inv', name: 'Investigación', emoji: '🔎', color: '#4D96FF', xp: 40 },
      { id: 'mkt', name: 'Marketing', emoji: '🎨', color: '#FF6B6B', xp: 25 },
      { id: 'ven', name: 'Ventas', emoji: '💰', color: '#6BCB77', xp: 15 }
    ],
    skills: [
      { id: 'resumir', name: 'Resumir' }, { id: 'redactar', name: 'Redactar' },
      { id: 'analizar', name: 'Analizar' }, { id: 'traducir', name: 'Traducir' },
      { id: 'revisar', name: 'Revisar' }, { id: 'buscar', name: 'Buscar en web' }
    ],
    agents: [
      { id: 'ramon', name: 'Don Ramón', role: 'Gerente', xp: 280, isSupervisor: true, skillIds: ['revisar', 'resumir'], avatar: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' } },
      { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado', areaId: 'inv', xp: 145, skillIds: ['buscar', 'resumir'], avatar: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' } },
      { id: 'beto', name: 'Beto', role: 'Analista de competencia', areaId: 'inv', xp: 60, skillIds: ['analizar', 'buscar'], avatar: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' } },
      { id: 'monica', name: 'Mónica', role: 'Redactora creativa', areaId: 'mkt', xp: 95, skillIds: ['redactar', 'revisar'], avatar: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' } },
      { id: 'diego', name: 'Diego', role: 'Diseñador de campaña', areaId: 'mkt', xp: 30, skillIds: ['redactar', 'analizar'], avatar: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' } },
      { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas', areaId: 'ven', xp: 45, skillIds: ['analizar', 'redactar'], avatar: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' } }
    ],
    planos: [
      { id: 'pl1', name: 'Lanzamiento de producto', nodes: [
        { id: 'pl1-p1', kind: 'process', title: 'Investigar mercado', agentId: 'lupita', areaId: 'inv' },
        { id: 'pl1-p2', kind: 'process', title: 'Analizar competencia', agentId: 'beto', areaId: 'inv' },
        { id: 'pl1-p3', kind: 'process', title: 'Redactar campaña', agentId: 'monica', areaId: 'mkt' },
        { id: 'pl1-p4', kind: 'process', title: 'Plan de ventas', agentId: 'sofia', areaId: 'ven' },
        { id: 'pl1-r', kind: 'result', title: 'Plan de lanzamiento', format: 'documento' }
      ] },
      { id: 'pl2', name: 'Atención a clientes', nodes: [
        { id: 'pl2-p1', kind: 'process', title: 'Entender la queja' },
        { id: 'pl2-p2', kind: 'process', title: 'Proponer solución' },
        { id: 'pl2-r', kind: 'result', title: 'Respuesta al cliente', format: 'mensaje' }
      ] }
    ],
    projects: [
      { id: 'p1', name: 'Lanzamiento Café Frío', emoji: '☕', description: 'Lanzar nuestra bebida de café frío en CDMX en 4 semanas.', planoId: 'pl1', areaIds: ['inv', 'mkt', 'ven'], agentIds: ['ramon', 'lupita', 'beto', 'monica', 'sofia'], xp: 120 },
      { id: 'p2', name: 'Atención a clientes', emoji: '🛟', description: 'Responder dudas y quejas en menos de 2 horas.', planoId: 'pl2', areaIds: ['ven'], agentIds: ['ramon', 'sofia'], xp: 30 }
    ]
  };

  var EMOJIS = ['☕', '🛟', '🚀', '🎨', '📈', '🧪', '🛒', '📣', '🍰', '🧭', '💡', '📦'];
  var ACTIVIDAD = { p1: 'hace 2 horas', p2: 'ayer' };
  var EMPTY_AVATAR = { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' };
  var LEVELS = [0, 50, 150, 300, 500];

  var ICO = {
    folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6h6l2 2.5h10V19H3z"/></svg>',
    team: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    map: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 6h4v4H6zM14 14h4v4h-4zM10 8h4a2 2 0 0 1 2 2v4"/></svg>',
    spark: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.9L18.6 9.6 13.7 11.3 12 16.2 10.3 11.3 5.4 9.6l4.9-1.7z"/></svg>',
    fwd: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    check: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5L20 6.5"/></svg>',
    close: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ── helpers ── */
  function S() { return (typeof SEED !== 'undefined' && SEED) ? SEED : FALLBACK; }
  function lista(k) { var d = S(); return (d && Array.isArray(d[k]) && d[k].length) ? d[k] : FALLBACK[k]; }
  function nivel(xp) {
    if (typeof levelFor === 'function') return levelFor(xp || 0);
    return LEVELS.filter(function (t) { return (xp || 0) >= t; }).length;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function sprite(a, size, state) {
    if (typeof avatar === 'function') return avatar(a, size, state || 'idle', {});
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + esc(a && a.color || '#4D96FF') + '"></div>';
  }
  function pasosDe(pl) {
    var ns = (pl && Array.isArray(pl.nodes)) ? pl.nodes : [];
    var ps = ns.filter(function (n) { return n && n.kind === 'process'; });
    if (ps.length) return ps;
    var d = S();
    if (d && Array.isArray(d.processes)) {
      var pr = d.processes.filter(function (p) { return p && p.planoId === (pl && pl.id); });
      if (pr.length) return pr.map(function (p) { return { id: p.id, title: p.title || p.name }; });
    }
    var fb = FALLBACK.planos.filter(function (x) { return x.id === (pl && pl.id); })[0];
    return fb ? fb.nodes.filter(function (n) { return n.kind === 'process'; }) : [];
  }
  function finDe(pl) {
    var ns = (pl && Array.isArray(pl.nodes)) ? pl.nodes : [];
    var r = ns.filter(function (n) { return n && n.kind === 'result'; })[0];
    if (r) return r;
    var fb = FALLBACK.planos.filter(function (x) { return x.id === (pl && pl.id); })[0];
    return fb ? fb.nodes.filter(function (n) { return n.kind === 'result'; })[0] : null;
  }
  function avisa(nombre, payload) {
    if (typeof MO !== 'undefined' && MO.toast) MO.toast(nombre, JSON.stringify(payload, null, 2));
  }
  function ve(seccion) {
    try { if (typeof MO !== 'undefined' && typeof MO.go === 'function') MO.go(seccion); } catch (e) { /* el prototipo puede no tener esa sección */ }
  }

  /* ── piezas de HTML (mismo marcado que el componente React) ── */

  function vacio(linea, cta, act) {
    return '<div class="lb-empty">' + sprite(EMPTY_AVATAR, 72, 'idle') +
      '<p>' + esc(linea) + '</p>' +
      '<p class="lb-hand">Aquí no hay nadie todavía…</p>' +
      '<button class="lb-btn primary sm" data-act="' + act + '">' + esc(cta) + '</button></div>';
  }

  function tarjetaProyecto(p, planos) {
    var pl = planos.filter(function (x) { return x.id === p.planoId; })[0];
    return '<article class="lb-card lb-proj">' +
      '<div class="lb-proj-top"><span class="lb-emoji" aria-hidden>' + esc(p.emoji) + '</span>' +
      '<div style="min-width:0"><h3 class="lb-proj-name">' + esc(p.name) + '</h3>' +
      '<span class="lb-nv">Nivel ' + nivel(p.xp) + '</span></div></div>' +
      '<p class="lb-proj-desc">' + esc(p.description) + '</p>' +
      '<div class="lb-metrics">' +
      '<div class="lb-metric"><b>' + ((p.agentIds || []).length) + '</b><span>agentes</span></div>' +
      '<div class="lb-metric"><b>' + ((p.areaIds || []).length) + '</b><span>áreas</span></div>' +
      '<div class="lb-metric"><b>' + pasosDe(pl).length + '</b><span>pasos</span></div></div>' +
      '<div class="lb-proj-foot"><span class="lb-when">Última actividad: ' +
      esc(p.lastActivity || ACTIVIDAD[p.id] || 'sin movimiento') + '</span>' +
      '<button class="lb-btn primary sm" data-act="open-project" data-id="' + esc(p.id) + '">Abrir ' + ICO.fwd + '</button>' +
      '</div></article>';
  }

  function tarjetaAgente(a, skills) {
    var chips = (a.skillIds || []).slice(0, 2).map(function (id) {
      var s = skills.filter(function (x) { return x.id === id; })[0];
      return '<span class="lb-skill">' + esc(s ? s.name : id) + '</span>';
    }).join('');
    return '<button class="lb-agent" data-act="edit-agent" data-id="' + esc(a.id) + '"' +
      ' aria-label="Ver a ' + esc(a.name) + ', ' + esc(a.role) + '">' +
      sprite(a.avatar || a, 84, 'idle') +
      '<h3 class="lb-agent-name">' + esc(a.name) + '</h3>' +
      '<p class="lb-agent-role">' + esc(a.role) + '</p>' +
      '<span class="lb-nv">Nivel ' + nivel(a.xp) + '</span>' +
      '<div class="lb-skills">' + chips + '</div></button>';
  }

  function tarjetaPlano(pl) {
    var pasos = pasosDe(pl), fin = finDe(pl), i, html = '';
    for (i = 0; i < pasos.length; i++) {
      if (i > 0) html += '<span class="lb-link"></span>';
      html += '<div class="lb-node"><span class="lb-bullet">' + (i + 1) + '</span><span>' +
        esc(pasos[i].title || 'Paso') + '</span></div>';
    }
    if (fin) {
      html += '<span class="lb-link"></span><div class="lb-node"><span class="lb-bullet fin">★</span><span>' +
        esc(fin.title || 'Resultado') + '</span></div>';
    }
    return '<article class="lb-card lb-plano">' +
      '<div class="lb-plano-hd"><h3>' + esc(pl.name) + '</h3>' +
      '<span class="lb-pasos">' + pasos.length + ' pasos</span></div>' +
      '<div class="lb-flow" aria-hidden>' + html + '</div>' +
      '<div class="lb-plano-foot"><span class="lb-hint">' +
      (fin ? 'Termina en ' + esc(fin.format || 'un entregable') : 'Sin entregable final') + '</span>' +
      '<button class="lb-btn sm" data-act="use-plano" data-id="' + esc(pl.id) + '">Usar en proyecto</button>' +
      '</div></article>';
  }

  function rejillaAgentes(agents, skills, filtro) {
    var vis = agents.filter(function (a) {
      if (filtro === 'todas') return true;
      if (filtro === 'direccion') return !a.areaId;
      return a.areaId === filtro;
    });
    if (!vis.length) return vacio('Nadie trabaja en esta área todavía. ¿Contratamos a alguien?', '+ Crear agente', 'create-agent');
    return '<div class="lb-grid agents">' + vis.map(function (a) { return tarjetaAgente(a, skills); }).join('') + '</div>';
  }

  function modal(planos, draft, touched) {
    var tira = EMOJIS.map(function (em) {
      return '<button class="lb-em" data-act="emoji" data-em="' + esc(em) + '" aria-label="Emoji ' + esc(em) + '"' +
        ' aria-pressed="' + (draft.emoji === em) + '">' + em + '</button>';
    }).join('');
    var opts = '<button class="lb-opt" data-act="plano-opt" data-id="" aria-pressed="' + (!draft.planoId) + '">' +
      '<span class="lb-mark">' + ICO.check + '</span>' +
      '<span><b>Empezar vacío</b><small>Tú acomodas las áreas y los pasos.</small></span></button>' +
      planos.map(function (pl) {
        return '<button class="lb-opt" data-act="plano-opt" data-id="' + esc(pl.id) + '" aria-pressed="' +
          (draft.planoId === pl.id) + '"><span class="lb-mark">' + ICO.check + '</span>' +
          '<span><b>' + esc(pl.name) + '</b><small>' + pasosDe(pl).length + ' pasos listos para usar</small></span></button>';
      }).join('');
    var malNombre = touched && !draft.name.trim();
    return '<div class="lb-back" role="dialog" aria-modal="true" aria-label="Nuevo proyecto" data-act="backdrop">' +
      '<div class="lb-sheet">' +
      '<div class="lb-sheet-hd"><span class="lb-ico">' + ICO.folder + '</span><h2>Nuevo proyecto</h2>' +
      '<button class="lb-x" data-act="close" aria-label="Cerrar">' + ICO.close + '</button></div>' +
      '<div class="lb-sheet-bd">' +
      '<div class="lb-f ' + (malNombre ? 'lb-err' : '') + '">' +
      '<label class="lb-lb" for="lb-name">Nombre <span class="req">*</span></label>' +
      '<input id="lb-name" class="lb-in" value="' + esc(draft.name) + '" placeholder="Lanzamiento Café Frío">' +
      (malNombre ? '<p class="lb-msg">Ponle un nombre al proyecto.</p>' : '') + '</div>' +
      '<div class="lb-f"><label class="lb-lb">Escoge un emoji</label>' +
      '<div class="lb-strip" role="group" aria-label="Emoji del proyecto">' + tira + '</div></div>' +
      '<div class="lb-f"><label class="lb-lb" for="lb-desc">¿De qué se trata?</label>' +
      '<textarea id="lb-desc" class="lb-ta" placeholder="Lanzar nuestra bebida de café frío en CDMX en 4 semanas.">' +
      esc(draft.description) + '</textarea></div>' +
      '<div class="lb-f"><label class="lb-lb">¿Cómo va a trabajar el equipo?</label>' +
      '<div class="lb-opts">' + opts + '</div></div>' +
      '</div>' +
      '<div class="lb-sheet-ft"><button class="lb-btn ghost" data-act="close">Cancelar</button>' +
      '<button class="lb-btn primary" data-act="create">Crear proyecto</button></div>' +
      '</div></div>';
  }

  /* ── pantalla completa ── */

  function render(root) {
    var projects = lista('projects'), agents = lista('agents'),
        areas = lista('areas'), planos = lista('planos'), skills = lista('skills');

    // estado de UI, nada más
    var ui = { filtro: 'todas', abierto: false, touched: false,
               draft: { name: '', emoji: EMOJIS[0], description: '', planoId: undefined } };

    var chips = '<button class="lb-chip" data-act="filter" data-area="todas" aria-pressed="true">Todas</button>' +
      areas.map(function (a) {
        return '<button class="lb-chip" data-act="filter" data-area="' + esc(a.id) + '" aria-pressed="false">' +
          '<span class="lb-dotc" style="background:' + esc(a.color) + '" aria-hidden></span>' +
          esc(a.emoji) + ' ' + esc(a.name) + '</button>';
      }).join('') +
      (agents.some(function (a) { return !a.areaId; })
        ? '<button class="lb-chip" data-act="filter" data-area="direccion" aria-pressed="false">👔 Dirección</button>' : '');

    root.innerHTML =
      '<div class="lb">' +
      '<header class="lb-head"><div>' +
      '<h1 class="lb-title">Hola, Christian 👋</h1>' +
      '<p class="lb-sub">Tu oficina está lista. ¿Con qué le entramos hoy?</p></div>' +
      '<div class="lb-head-r">' +
      '<button class="lb-btn" data-act="copilot">' + ICO.spark + ' Pídeselo a la oficina</button>' +
      '<button class="lb-btn primary" data-act="new-project">+ Nuevo proyecto</button></div></header>' +

      '<section class="lb-shelf"><div class="lb-shelf-hd"><span class="lb-ico">' + ICO.folder + '</span>' +
      '<h2>Mis proyectos</h2><span class="lb-count">' + projects.length + ' en marcha</span>' +
      '<button class="lb-btn sm" data-act="new-project">+ Nuevo proyecto</button></div>' +
      (projects.length
        ? '<div class="lb-grid proj">' + projects.map(function (p) { return tarjetaProyecto(p, planos); }).join('') +
          '<button class="lb-new" data-act="new-project"><span class="plus" aria-hidden>+</span>Nuevo proyecto</button></div>'
        : vacio('Aún no tienes proyectos. Crea el primero y tu equipo se pone a trabajar.', '+ Nuevo proyecto', 'new-project')) +
      '</section>' +

      '<section class="lb-shelf"><div class="lb-shelf-hd"><span class="lb-ico">' + ICO.team + '</span>' +
      '<h2>Biblioteca de agentes</h2><span class="lb-count">' + agents.length + ' contratados</span>' +
      '<button class="lb-btn sm" data-act="create-agent">+ Crear agente</button></div>' +
      (agents.length
        ? '<div class="lb-chips" role="group" aria-label="Filtrar agentes por área">' + chips + '</div>' +
          '<div data-slot="agents">' + rejillaAgentes(agents, skills, 'todas') + '</div>'
        : vacio('Tu oficina está vacía. Contrata a tu primer agente y ponle un escritorio.', '+ Crear agente', 'create-agent')) +
      '</section>' +

      '<section class="lb-shelf"><div class="lb-shelf-hd"><span class="lb-ico amber">' + ICO.map + '</span>' +
      '<h2>Espacios de trabajo (planos)</h2><span class="lb-count">' + planos.length + ' guardados</span>' +
      '<button class="lb-btn sm" data-act="new-plano">+ Nuevo plano</button></div>' +
      (planos.length
        ? '<div class="lb-grid planos">' + planos.map(tarjetaPlano).join('') +
          '<button class="lb-new" data-act="new-plano"><span class="plus" aria-hidden>+</span>Nuevo plano</button></div>'
        : vacio('Un plano es el mapa de cómo trabaja tu equipo. Dibuja el primero.', '+ Nuevo plano', 'new-plano')) +
      '</section>' +

      '<div data-slot="modal"></div></div>';

    var slotModal = root.querySelector('[data-slot="modal"]');
    var slotAgentes = root.querySelector('[data-slot="agents"]');

    function pintaModal() {
      slotModal.innerHTML = ui.abierto ? modal(planos, ui.draft, ui.touched) : '';
      if (ui.abierto) {
        var n = slotModal.querySelector('#lb-name');
        if (n) n.focus();
      }
    }
    function leeCampos() {
      var n = slotModal.querySelector('#lb-name'), d = slotModal.querySelector('#lb-desc');
      if (n) ui.draft.name = n.value;
      if (d) ui.draft.description = d.value;
    }
    function abre(planoId) {
      ui.draft = { name: '', emoji: EMOJIS[0], description: '', planoId: planoId };
      ui.touched = false; ui.abierto = true; pintaModal();
    }

    // se asigna (no se acumula) porque render() corre cada vez que se entra a la sección
    root.onclick = function (ev) {
      var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!t || !root.contains(t)) return;
      var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');

      if (act === 'backdrop') { if (ev.target !== t) return; ui.abierto = false; pintaModal(); return; }
      if (act === 'new-project') { abre(undefined); return; }
      if (act === 'close') { ui.abierto = false; pintaModal(); return; }

      if (act === 'open-project') { avisa('onOpenProject(id)', id); ve('office'); return; }
      if (act === 'create-agent') { avisa('onCreateAgent()', {}); ve('agentes'); return; }
      if (act === 'edit-agent') {
        var ag = agents.filter(function (a) { return a.id === id; })[0];
        avisa('onEditAgent(agent)', ag ? { id: ag.id, name: ag.name, role: ag.role } : id);
        return;
      }
      if (act === 'new-plano') { avisa('onNewPlano()', {}); ve('plano'); return; }
      if (act === 'use-plano') { avisa('onUsePlano(planoId)', id); abre(id); return; }
      if (act === 'copilot') { avisa('onOpenCopilot()', {}); ve('copilot'); return; }

      if (act === 'filter') {
        ui.filtro = t.getAttribute('data-area');
        Array.prototype.forEach.call(root.querySelectorAll('[data-act="filter"]'), function (c) {
          c.setAttribute('aria-pressed', String(c.getAttribute('data-area') === ui.filtro));
        });
        if (slotAgentes) slotAgentes.innerHTML = rejillaAgentes(agents, skills, ui.filtro);
        return;
      }
      if (act === 'emoji') {
        ui.draft.emoji = t.getAttribute('data-em');
        Array.prototype.forEach.call(slotModal.querySelectorAll('[data-act="emoji"]'), function (c) {
          c.setAttribute('aria-pressed', String(c.getAttribute('data-em') === ui.draft.emoji));
        });
        return;
      }
      if (act === 'plano-opt') {
        ui.draft.planoId = id || undefined;
        Array.prototype.forEach.call(slotModal.querySelectorAll('[data-act="plano-opt"]'), function (c) {
          c.setAttribute('aria-pressed', String((c.getAttribute('data-id') || '') === (ui.draft.planoId || '')));
        });
        return;
      }
      if (act === 'create') {
        leeCampos(); ui.touched = true;
        if (!ui.draft.name.trim()) { pintaModal(); return; }
        var payload = {
          name: ui.draft.name.trim(), emoji: ui.draft.emoji,
          description: ui.draft.description.trim(), planoId: ui.draft.planoId
        };
        avisa('onCreateProject(payload)', payload);
        ui.abierto = false; pintaModal();
        return;
      }
    };
  }

  MO.register('lobby', {
    title: 'Lobby',
    subtitle: 'Proyectos, agentes y planos',
    css: `
/* MiniOficina · Lobby (§6.1) — tema claro (§6). Mismos tokens del módulo aprobado. */
.lb{
  --bg:#F7F8FC; --card:#FFFFFF; --soft:#F4F6FB; --line:#E9EBF4;
  --ink:#1D2237; --ink-2:#5B6379; --ink-3:#9AA1B4;
  --navy:#1B2340; --blue:#4D7CFE; --blue-soft:#EEF3FF;
  --amber:#FFD97A; --amber-deep:#C98A12; --ok:#2FA36B; --danger:#E15252;
  --r:18px; --r-sm:12px;
  --shadow:0 1px 2px rgba(29,34,55,.04),0 14px 30px -22px rgba(29,34,55,.35);
  color:var(--ink);
  font-family:"Nunito Sans",ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;
}
.lb *{box-sizing:border-box}
.lb :where(button){font:inherit;color:inherit}
.lb :focus-visible{outline:2px solid var(--blue);outline-offset:2px}

/* ---------- encabezado de página ---------- */
.lb-head{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;justify-content:space-between;margin-bottom:20px}
.lb-title{font-family:Fredoka,"Nunito Sans",system-ui,sans-serif;font-weight:600;font-size:28px;margin:0;letter-spacing:-.02em}
.lb-sub{margin:2px 0 0;color:var(--ink-2);font-size:13.5px}
.lb-head-r{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

/* ---------- botones ---------- */
.lb-btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;padding:11px 18px;font-weight:700;
  font-size:13.5px;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink);
  transition:background .14s,box-shadow .14s,transform .14s}
.lb-btn:hover{background:var(--soft)}
.lb-btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.lb-btn.primary:hover{background:#242D52}
.lb-btn.primary:disabled{opacity:.45;cursor:not-allowed}
.lb-btn.ghost{border-color:transparent;background:none;color:var(--ink-2)}
.lb-btn.ghost:hover{background:var(--soft)}
.lb-btn.sm{padding:8px 14px;font-size:13px;border-radius:12px}

/* ---------- estantes ---------- */
.lb-shelf{margin-bottom:24px}
.lb-shelf-hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.lb-ico{width:30px;height:30px;border-radius:9px;background:var(--blue-soft);color:var(--blue);
  display:grid;place-items:center;flex:none}
.lb-ico.amber{background:#FFF6DD;color:var(--amber-deep)}
.lb-shelf-hd h2{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:17px;margin:0;letter-spacing:-.02em}
.lb-count{font-size:12.5px;color:var(--ink-3);font-weight:600}
.lb-shelf-hd .lb-btn{margin-left:auto}

/* ---------- rejillas ---------- */
.lb-grid{display:grid;gap:14px;align-items:stretch}
.lb-grid.proj{grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.lb-grid.agents{grid-template-columns:repeat(auto-fill,minmax(168px,1fr))}
.lb-grid.planos{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
@media (max-width:900px){.lb-grid.proj,.lb-grid.planos{grid-template-columns:1fr}
  .lb-grid.agents{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}

/* ---------- tarjeta base ---------- */
.lb-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);
  transition:transform .14s,box-shadow .14s,border-color .14s}
.lb-card:hover{transform:translateY(-2px);box-shadow:0 2px 4px rgba(29,34,55,.05),0 20px 34px -20px rgba(29,34,55,.42)}

/* ---------- tarjeta de proyecto ---------- */
.lb-proj{display:flex;flex-direction:column;padding:16px 16px 14px;text-align:left}
.lb-proj-top{display:flex;align-items:flex-start;gap:11px}
.lb-emoji{width:44px;height:44px;border-radius:var(--r-sm);background:var(--soft);display:grid;place-items:center;
  font-size:22px;flex:none}
.lb-proj-name{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:16.5px;margin:0;letter-spacing:-.01em}
.lb-nv{display:inline-flex;align-items:center;gap:4px;background:#FFF6DD;color:var(--amber-deep);border-radius:999px;
  padding:3px 9px;font-size:11.5px;font-weight:700;white-space:nowrap}
.lb-proj-desc{margin:10px 0 0;font-size:13px;color:var(--ink-2);min-height:38px}
.lb-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.lb-metric{background:var(--soft);border-radius:var(--r-sm);padding:8px 6px;text-align:center}
.lb-metric b{display:block;font-size:15px;font-family:Fredoka,system-ui,sans-serif;font-weight:600}
.lb-metric span{font-size:11.5px;color:var(--ink-3);font-weight:600}
.lb-proj-foot{display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
.lb-when{font-size:12px;color:var(--ink-3)}
.lb-proj-foot .lb-btn{margin-left:auto}

/* ---------- tarjeta "nuevo" (punteada) ---------- */
.lb-new{border:1.5px dashed #C9D0E4;background:var(--soft);border-radius:var(--r);min-height:150px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  color:var(--ink-2);font-weight:700;font-size:13.5px;padding:18px;transition:.14s}
.lb-new:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}
.lb-new .plus{width:34px;height:34px;border-radius:50%;background:var(--card);border:1px solid var(--line);
  display:grid;place-items:center;font-size:18px;line-height:1}

/* ---------- filtro por área ---------- */
.lb-chips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px}
.lb-chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:5px 12px;font-size:12.5px;
  font-weight:600;color:var(--ink-2);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.lb-chip:hover{border-color:var(--blue);color:var(--blue)}
.lb-chip[aria-pressed="true"]{background:var(--blue-soft);border-color:var(--blue);color:#2C4BA8}
.lb-dotc{width:8px;height:8px;border-radius:50%;flex:none}

/* ---------- tarjeta de agente ---------- */
.lb-agent{display:flex;flex-direction:column;align-items:center;gap:2px;padding:16px 12px 14px;cursor:pointer;
  background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);
  transition:transform .14s,box-shadow .14s,border-color .14s;text-align:center;width:100%}
.lb-agent:hover{transform:translateY(-2px);border-color:#C9D0E4;
  box-shadow:0 2px 4px rgba(29,34,55,.05),0 20px 34px -20px rgba(29,34,55,.42)}
.lb-agent-name{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:15px;margin:8px 0 0;letter-spacing:-.01em}
.lb-agent-role{font-size:12px;color:var(--ink-3);margin:1px 0 0}
.lb-agent .lb-nv{margin-top:7px}
.lb-skills{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:9px}
.lb-skill{background:var(--blue-soft);color:#2C4BA8;border-radius:8px;padding:4px 8px;font-size:11.5px;font-weight:600}

/* ---------- tarjeta de plano ---------- */
.lb-plano{padding:16px;display:flex;flex-direction:column}
.lb-plano-hd{display:flex;align-items:center;gap:10px}
.lb-plano-hd h3{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:16px;margin:0;letter-spacing:-.01em}
.lb-pasos{font-size:12px;color:var(--ink-3);margin-left:auto;white-space:nowrap}
.lb-flow{display:flex;align-items:center;gap:0;margin:16px 0 10px;background:var(--soft);border-radius:var(--r-sm);padding:14px 12px}
.lb-node{display:flex;flex-direction:column;align-items:center;gap:6px;flex:none;max-width:96px}
.lb-bullet{width:24px;height:24px;border-radius:50%;background:var(--card);border:1.5px solid var(--blue);
  color:var(--blue);display:grid;place-items:center;font-size:11.5px;font-weight:700}
.lb-bullet.fin{background:var(--blue);border-color:var(--blue);color:#fff}
.lb-node span{font-size:10.5px;color:var(--ink-2);line-height:1.25;text-align:center;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.lb-link{flex:1 1 12px;min-width:10px;height:2px;background:#D8DEF0;border-radius:2px;margin:0 4px;align-self:flex-start;
  margin-top:11px}
.lb-plano-foot{display:flex;align-items:center;gap:10px;margin-top:auto;padding-top:6px}
.lb-plano-foot .lb-btn{margin-left:auto}
.lb-hint{font-size:12px;color:var(--ink-3)}

/* ---------- estado vacío ---------- */
.lb-empty{border:1px dashed #D8DEF0;background:var(--card);border-radius:var(--r);padding:26px 18px;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:8px}
.lb-empty p{margin:0;color:var(--ink-2);font-size:13.5px;max-width:380px}
.lb-empty .lb-hand{font-family:"Caveat","Segoe Script",cursive;font-size:18px;color:var(--ink-3);margin:0}

/* ---------- modal "Nuevo proyecto" ---------- */
.lb-back{position:fixed;inset:0;background:rgba(29,34,55,.38);display:grid;place-items:center;padding:18px;z-index:60}
.lb-sheet{width:min(560px,100%);max-height:92vh;overflow:auto;background:var(--card);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:0 30px 60px -24px rgba(29,34,55,.5)}
.lb-sheet-hd{display:flex;align-items:center;gap:10px;padding:18px 18px 0}
.lb-sheet-hd h2{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:17px;margin:0}
.lb-x{margin-left:auto;width:32px;height:32px;border-radius:10px;border:1px solid var(--line);background:var(--card);
  display:grid;place-items:center;cursor:pointer;color:var(--ink-2)}
.lb-x:hover{background:var(--soft)}
.lb-sheet-bd{padding:18px}
.lb-f{margin-top:15px}
.lb-f:first-child{margin-top:0}
.lb-lb{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.lb-lb .req{color:var(--danger)}
.lb-in,.lb-ta{width:100%;background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);
  padding:11px 13px;font:inherit;font-size:13.5px;color:var(--ink);transition:.14s}
.lb-in::placeholder,.lb-ta::placeholder{color:var(--ink-3)}
.lb-in:focus,.lb-ta:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.lb-ta{resize:vertical;min-height:84px}
.lb-err .lb-in{border-color:var(--danger)}
.lb-msg{font-size:12px;color:var(--danger);margin:5px 0 0}
.lb-strip{display:flex;flex-wrap:wrap;gap:7px}
.lb-em{width:42px;height:42px;border-radius:var(--r-sm);border:1.5px solid var(--line);background:var(--card);
  font-size:20px;display:grid;place-items:center;cursor:pointer;transition:.14s}
.lb-em:hover{border-color:#C9D0E4;transform:translateY(-1px)}
.lb-em[aria-pressed="true"]{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.lb-opts{display:grid;gap:8px}
.lb-opt{display:flex;align-items:center;gap:10px;text-align:left;border:1.5px solid var(--line);background:var(--card);
  border-radius:var(--r-sm);padding:11px 12px;cursor:pointer;transition:.14s}
.lb-opt:hover{border-color:#C9D0E4}
.lb-opt[aria-pressed="true"]{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.lb-opt b{font-size:13.5px;font-weight:700;display:block}
.lb-opt small{font-size:12px;color:var(--ink-3)}
.lb-mark{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--line);display:grid;place-items:center;flex:none;
  color:transparent}
.lb-opt[aria-pressed="true"] .lb-mark{background:var(--blue);border-color:var(--blue);color:#fff}
.lb-sheet-ft{display:flex;align-items:center;gap:10px;padding:16px 18px 18px;border-top:1px solid var(--line);margin-top:6px}
.lb-sheet-ft .lb-btn.primary{margin-left:auto}

@media (prefers-reduced-motion:reduce){.lb *{animation:none!important;transition:none!important}}
`,
    render: render
  });

})();
