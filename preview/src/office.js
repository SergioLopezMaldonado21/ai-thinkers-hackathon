/* MiniOficina · Oficina en vivo (§6.2) — copia de prototipo.
   Misma pantalla que web/src/pages/Office.tsx, en JS de navegador y sin build.
   Aquí SÍ hay simulación visual del pedido (papel que viaja de mesa en mesa,
   estados que cambian, experiencia que sube, entregable que cae): el prototipo
   existe para enseñar el movimiento. En el componente React eso no pasa. */
MO.register('office', {
  title: 'Oficina en vivo',
  subtitle: 'Tu equipo trabajando en el proyecto',
  css: `/* MiniOficina · Oficina en vivo (§6.2) — tema claro (§6) */
.of{
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
.of *{box-sizing:border-box}
.of :where(button){font:inherit;color:inherit}
.of :focus-visible{outline:2px solid var(--blue);outline-offset:2px}

/* ---------- encabezado ---------- */
.of-head{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;justify-content:space-between;margin-bottom:16px}
.of-head-l{display:flex;align-items:center;gap:13px;min-width:0}
.of-emoji{width:46px;height:46px;border-radius:14px;background:var(--blue-soft);display:grid;place-items:center;
  font-size:23px;flex:none}
.of-title{font-family:Fredoka,"Nunito Sans",system-ui,sans-serif;font-weight:600;font-size:28px;margin:0;letter-spacing:-.02em}
.of-sub{margin:2px 0 0;color:var(--ink-2);font-size:13.5px}
.of-head-r{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.of-xp-box{display:flex;flex-direction:column;gap:5px;min-width:118px}
.of-xp-lb{font-size:12px;font-weight:700;color:var(--ink-2)}
.of-bar{display:block;height:7px;border-radius:999px;background:var(--line);overflow:hidden}
.of-bar i{display:block;height:100%;border-radius:999px;background:var(--blue)}
.of-bar.sm{height:5px;margin-top:5px}

.of-btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;padding:10px 15px;font-weight:700;
  font-size:13.5px;cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink)}
.of-btn:hover{background:var(--soft)}
.of-btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.of-btn.primary:hover{background:#242D52}

/* ---------- rejilla de 3 columnas ---------- */
.of-grid{display:grid;grid-template-columns:280px minmax(0,1fr) 320px;gap:16px;align-items:start}
@media (max-width:1240px){.of-grid{grid-template-columns:260px minmax(0,1fr)}
  .of-grid > .of-side{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}}
@media (max-width:1000px){.of-grid{grid-template-columns:1fr}
  .of-grid > .of-side{grid-column:auto}}

/* ---------- tarjetas ---------- */
.of-card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow)}
.of-card-hd{display:flex;align-items:center;gap:10px;padding:15px 16px 0}
.of-card-hd h2{font-family:Fredoka,system-ui,sans-serif;font-weight:600;font-size:17px;margin:0}
.of-card-bd{padding:14px 16px 16px}
.of-ico{width:30px;height:30px;border-radius:9px;background:var(--blue-soft);color:var(--blue);
  display:grid;place-items:center;flex:none}
.of-ico.amber{background:#FFF6DD;color:var(--amber-deep)}
.of-count{margin-left:auto;font-size:12px;font-weight:700;color:var(--ink-3);background:var(--soft);
  border-radius:999px;padding:2px 9px}
.of-empty{margin:6px 0 0;font-size:12.5px;color:var(--ink-3)}
.of-mut{color:var(--ink-3)}

/* ---------- columna: Tu gente ---------- */
.of-people .of-card-bd{max-height:calc(100vh - 220px);overflow:auto}
@media (max-width:1000px){.of-people .of-card-bd{max-height:none}}
.of-group{margin-top:14px}
.of-group:first-child{margin-top:0}
.of-group-hd{display:flex;align-items:center;gap:7px;margin-bottom:7px}
.of-dot{width:9px;height:9px;border-radius:50%;flex:none}
.of-group-nm{font-size:12.5px;font-weight:700;color:var(--ink-2)}
.of-group-lv{margin-left:auto;font-size:11.5px;font-weight:700;color:var(--ink-3)}
.of-person{width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;
  background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 9px;margin-top:7px}
.of-person:hover{background:var(--soft)}
.of-person.is-sel{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.of-person-tx{display:flex;flex-direction:column;min-width:0;flex:1}
.of-person-nm{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-person-rl{font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-person-rt{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.of-state{font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap;
  background:var(--soft);color:var(--ink-2)}
.of-state.trabajando{background:var(--blue-soft);color:#2C4BA8}
.of-state.termino{background:#E6F6EE;color:var(--ok)}
.of-lv{font-size:11px;font-weight:700;color:var(--amber-deep)}

/* ---------- centro ---------- */
.of-main{display:flex;flex-direction:column;gap:12px;min-width:0}
.of-tabs{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between}
.of-tabs-l{display:inline-flex;gap:4px;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:4px}
.of-tab{border:none;background:none;border-radius:999px;padding:7px 16px;font-size:13.5px;font-weight:700;
  color:var(--ink-2);cursor:pointer}
.of-tab.is-on{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(29,34,55,.10)}
.of-switch{display:inline-flex;align-items:center;gap:9px;font-size:13px;font-weight:700;color:var(--ink-2);cursor:pointer;user-select:none}
.of-switch input{position:absolute;opacity:0;width:0;height:0}
.of-track{width:38px;height:22px;border-radius:999px;background:var(--line);display:block;position:relative;transition:.16s}
.of-track i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;
  box-shadow:0 1px 3px rgba(29,34,55,.3);transition:.16s}
.of-switch input:checked + .of-track{background:var(--blue)}
.of-switch input:checked + .of-track i{left:19px}
.of-switch input:focus-visible + .of-track{box-shadow:0 0 0 3px var(--blue-soft)}

/* ---------- lienzo 960x540 ---------- */
.of-canvas{position:relative;aspect-ratio:960/540;width:100%;background:var(--card);
  border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);overflow:hidden;
  background-image:linear-gradient(rgba(29,34,55,.045) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(29,34,55,.045) 1px,transparent 1px);
  background-size:3.334% 5.926%}
.of-canvas.flat{aspect-ratio:auto;min-height:320px;background-image:none;display:grid;place-items:center;padding:22px}
.of-stage{position:absolute;inset:0}
.of-floor{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .35s ease}

.of-zone{position:absolute;border:1.5px dashed var(--line);border-radius:14px;background:var(--soft)}
.of-zone.boss{background:rgba(27,35,64,.07);border-color:rgba(27,35,64,.35)}
.of-zone-lb{position:absolute;left:10px;top:-1px;transform:translateY(-50%);background:var(--card);
  border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;color:var(--navy);
  border:1px solid var(--line);white-space:nowrap}

.of-desk{position:absolute;transform:translateX(-50%);height:24px;border-radius:8px;background:var(--card);
  border:1.5px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:6px;
  padding:0 7px;z-index:3;box-shadow:0 2px 5px rgba(29,34,55,.08)}
/* ancho mínimo para que el nombre no se corte */
.of-desk{min-width:88px;gap:2px;padding:3px 4px}
.of-desk-nm{font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-desk-lv{font-size:8px;font-weight:800;color:var(--amber-deep);background:#FFF6DD;border-radius:999px;
  padding:1px 5px;flex:none}

.of-seat{position:absolute;transform:translate(-50%,-100%);background:none;border:none;padding:0;cursor:pointer;
  z-index:2;border-radius:12px;animation:of-enter .62s cubic-bezier(.3,.9,.4,1) both}
.of-seat.is-sel{box-shadow:0 0 0 3px var(--blue-soft);background:rgba(77,124,254,.08)}
@keyframes of-enter{from{left:var(--fx);top:var(--fy);opacity:0}to{opacity:1}}

.of-door{position:absolute;border-radius:10px 4px 4px 10px;background:#FFF6DD;border:1.5px solid #EBD79B;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:20px}
.of-door small{font-size:9.5px;font-weight:700;color:var(--amber-deep)}
.of-strip{position:absolute;border-radius:12px;background:var(--blue-soft);border:1.5px dashed #C3D3FF;
  display:flex;align-items:center;gap:8px;padding:0 12px;overflow:hidden}
.of-strip-lb{font-size:12px;font-weight:800;color:#2C4BA8;white-space:nowrap}
.of-strip-mut{font-size:11.5px;color:#6A81C6}
.of-strip-chip{background:var(--card);border:1px solid #C3D3FF;border-radius:999px;padding:3px 10px;
  font-size:11.5px;font-weight:700;color:#2C4BA8;cursor:pointer;white-space:nowrap}
.of-strip-chip:hover{background:#fff;border-color:var(--blue)}

/* vista isométrica: se gira el piso y se contragira lo que debe seguir de frente */
.of-stage[data-iso="true"] .of-floor{transform:perspective(1500px) rotateX(48deg) rotateZ(-38deg) scale(.74)}
.of-stage[data-iso="true"] .of-seat{transform:translate(-50%,-100%) rotateZ(38deg) rotateX(-48deg)}
.of-stage[data-iso="true"] .of-zone-lb,
.of-stage[data-iso="true"] .of-desk-nm,
.of-stage[data-iso="true"] .of-desk-lv{transform:rotateZ(38deg) rotateX(-48deg)}
.of-stage[data-iso="true"] .of-zone-lb{transform-origin:left center}

/* ---------- pestañas Plano y Agentes ---------- */
.of-plan{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.of-plan-tt{margin:0;font-family:Fredoka,system-ui,sans-serif;font-size:17px;font-weight:600}
.of-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
.of-step{background:var(--blue-soft);color:#2C4BA8;border-radius:8px;padding:7px 11px;font-size:12.5px;font-weight:600}
.of-step.end{background:#FFF6DD;color:var(--amber-deep)}
.of-arrow{color:var(--ink-3);display:inline-flex}
.of-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;width:100%}
.of-mini{display:flex;flex-direction:column;align-items:center;gap:3px;background:var(--card);
  border:1px solid var(--line);border-radius:var(--r-sm);padding:14px 10px;cursor:pointer;text-align:center}
.of-mini:hover{background:var(--soft)}
.of-mini.is-sel{border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.of-mini b{font-size:13px;margin-top:4px}
.of-mini span{font-size:11.5px;color:var(--ink-3)}
.of-mini.add{justify-content:center;border-style:dashed}
.of-mini-plus{font-size:32px;color:var(--ink-3);line-height:1}

/* ---------- columna: Pedidos ---------- */
.of-side{display:flex;flex-direction:column;gap:14px;align-items:stretch}
.of-lb{display:block;font-size:13px;font-weight:700;margin-bottom:6px}
.of-f{margin-top:14px}
.of-ta,.of-sel{width:100%;background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);
  padding:11px 13px;font:inherit;font-size:13.5px;color:var(--ink);transition:.14s}
.of-ta{resize:vertical;min-height:92px}
.of-ta::placeholder{color:var(--ink-3)}
.of-ta:focus,.of-sel:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}
.of-chips{display:flex;flex-wrap:wrap;gap:7px}
.of-chip{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 11px;
  font-size:12.5px;font-weight:600;color:var(--ink-2);cursor:pointer}
.of-chip:hover{border-color:#C9D0E4}
.of-chip.is-on{background:var(--blue-soft);color:#2C4BA8;border-color:var(--blue)}
.of-run{width:100%;margin-top:16px;display:inline-flex;align-items:center;justify-content:center;gap:9px;
  background:var(--navy);color:#fff;border:1px solid var(--navy);border-radius:12px;padding:12px 18px;
  font-weight:700;font-size:14px;cursor:pointer}
.of-run:hover{background:#242D52}
.of-run:disabled{opacity:.45;cursor:not-allowed}

/* ajuste fino: la placa de la mesa muestra sólo el nombre (el nivel vive en el panel izquierdo)
   y la etiqueta de Dirección se va a la derecha para no chocar con el sombrero del supervisor */
.of-desk-lv{display:none}
.of-desk{min-width:auto;max-width:96px}
.of-zone.boss .of-zone-lb{left:auto;right:12px}
.of-hint{margin:8px 0 0;font-size:12px;color:var(--ink-3);text-align:center}

.of-log{list-style:none;margin:0;padding:0;max-height:230px;overflow:auto}
.of-log li{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:12.5px}
.of-log li:last-child{border-bottom:none}
.of-log-h{color:var(--ink-3);font-size:11.5px;font-weight:700;flex:none;padding-top:1px}
.of-log-i{flex:none}
.of-log-t{color:var(--ink-2)}
.of-log li.ok .of-log-t{color:var(--ok);font-weight:600}
.of-log li.alta .of-log-t{color:var(--ink);font-weight:700}

.of-result{width:100%;display:flex;align-items:flex-start;gap:10px;text-align:left;cursor:pointer;
  background:var(--card);border:1px solid var(--line);border-radius:var(--r-sm);padding:11px;margin-bottom:9px}
.of-result:hover{background:var(--soft);border-color:#C9D0E4}
.of-result-ic{width:30px;height:30px;border-radius:9px;background:#FFF6DD;color:var(--amber-deep);
  display:grid;place-items:center;flex:none}
.of-result-tx{display:flex;flex-direction:column;min-width:0}
.of-result-tx b{font-size:13px}
.of-result-sm{font-size:12px;color:var(--ink-2)}
.of-result-mt{font-size:11.5px;color:var(--ink-3);margin-top:2px}
.of-hand{font-family:"Caveat","Segoe Script",cursive;font-size:17px;color:var(--ink-3);margin:6px 0 0;text-align:center}

@media (prefers-reduced-motion:reduce){.of *{animation:none!important;transition:none!important}}

/* ── sólo prototipo: papel que viaja y sprites ya sentados ── */
.of-paper{position:absolute;transform:translate(-50%,-50%);font-size:22px;z-index:4;
  filter:drop-shadow(0 3px 5px rgba(29,34,55,.25));transition:left .85s cubic-bezier(.4,.1,.3,1),top .85s cubic-bezier(.4,.1,.3,1)}
.of-ready .of-seat{animation:none}
`,

  render(root) {
    /* ── seed (§5 del brief) con respaldo por si el host cambia de forma ── */
    var S = (typeof SEED !== 'undefined' && SEED) ? SEED : {};
    var lvl = (typeof levelFor === 'function') ? levelFor
      : function (xp) { return [0, 50, 150, 300, 500].filter(function (t) { return xp >= t; }).length; };

    var PROJECT = (S.projects && S.projects[0]) || {
      id: 'p1', name: 'Lanzamiento Café Frío', emoji: '☕',
      description: 'Lanzar nuestra bebida de café frío en CDMX en 4 semanas.', xp: 120
    };
    var AREAS = (S.areas && S.areas.length) ? S.areas : [
      { id: 'inv', name: 'Investigación', emoji: '🔎', color: '#4D96FF', xp: 40 },
      { id: 'mkt', name: 'Marketing', emoji: '🎨', color: '#FF6B6B', xp: 25 },
      { id: 'ven', name: 'Ventas', emoji: '💰', color: '#6BCB77', xp: 15 }
    ];
    var BASE_AGENTS = (S.agents && S.agents.length) ? S.agents : [
      { id: 'ramon', name: 'Don Ramón', role: 'Gerente', xp: 280, isSupervisor: true, avatar: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' } },
      { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado', areaId: 'inv', xp: 145, avatar: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' } },
      { id: 'beto', name: 'Beto', role: 'Analista de competencia', areaId: 'inv', xp: 60, avatar: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' } },
      { id: 'monica', name: 'Mónica', role: 'Redactora creativa', areaId: 'mkt', xp: 95, avatar: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' } },
      { id: 'diego', name: 'Diego', role: 'Diseñador de campaña', areaId: 'mkt', xp: 30, avatar: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' } },
      { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas', areaId: 'ven', xp: 45, avatar: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' } }
    ];
    var areaOf = function (a) { return a.areaId || a.area || ''; };
    var AGENTS = BASE_AGENTS.map(function (a) {
      return { id: a.id, name: a.name, role: a.role || a.puesto || '', avatar: a.avatar,
               xp: a.xp || 0, areaId: areaOf(a), isSupervisor: !!a.isSupervisor };
    });
    var PEDIDO = 'Quiero lanzar el café frío en la Roma y la Condesa el próximo mes con presupuesto de 20 mil pesos.';

    /* ── estado (de pantalla; el prototipo además lo mueve para la demo) ── */
    var st = {
      tab: 'oficina', selected: null, iso: false, request: '',
      picked: AREAS.map(function (a) { return a.id; }),
      boss: (AGENTS.filter(function (a) { return a.isSupervisor; })[0] || {}).id || '',
      status: { lupita: 'termino', beto: 'trabajando' },
      xp: {}, paper: null, running: false, entered: false,
      log: [
        { id: 'e1', time: '09:41', icon: '▶️', text: 'Don Ramón repartió el pedido entre 3 áreas.', tone: 'alta' },
        { id: 'e2', time: '09:41', icon: '📋', text: 'Lupita tomó: Investigar mercado.', tone: 'normal' },
        { id: 'e3', time: '09:44', icon: '✅', text: 'Lupita entregó su parte. +10 de experiencia.', tone: 'ok' },
        { id: 'e4', time: '09:45', icon: '🤝', text: 'Lupita le pasó el trabajo a Beto.', tone: 'normal' },
        { id: 'e5', time: '09:46', icon: '✏️', text: 'Beto está analizando a la competencia.', tone: 'normal' }
      ],
      results: [
        { id: 'r1', title: 'Hallazgos de mercado', format: 'documento', author: 'Lupita', time: '09:44',
          summary: 'Quiénes toman café frío en la Roma y la Condesa, y cuánto pagan.' }
      ]
    };
    AGENTS.forEach(function (a) { st.xp[a.id] = a.xp; });
    var STEPS = ['Investigar mercado', 'Analizar competencia', 'Redactar campaña', 'Plan de ventas'];
    var LABEL = { libre: 'Libre', trabajando: 'Trabajando', termino: 'Terminó' };
    var statusOf = function (id) { return st.status[id] || 'libre'; };

    /* ── temporizadores de la demo: se limpian al volver a entrar ── */
    if (root._ofTimers) { root._ofTimers.forEach(clearTimeout); }
    root._ofTimers = [];
    var later = function (ms, fn) { root._ofTimers.push(setTimeout(fn, ms)); };

    /* ── geometría del piso (lienzo 960×540), idéntica al componente ── */
    var W = 960, H = 540, GAP = 18, AX = 92, AR = 936, ATOP = 140, ABOT = 482;
    var BOSS = { x: 318, y: 22, w: 324, h: 102 };
    var DOOR = { x: 24, y: 418, w: 56, h: 64 };
    var DFEET = { x: DOOR.x + DOOR.w / 2, y: DOOR.y + DOOR.h };
    var STRIP = { x: 24, y: 492, w: 912, h: 36 };
    var px = function (v) { return (v / W * 100) + '%'; };
    var py = function (v) { return (v / H * 100) + '%'; };

    function zoneRects() {
      var n = Math.max(AREAS.length, 1), rows = Math.ceil(n / 3);
      var rowH = (ABOT - ATOP - (rows - 1) * GAP) / rows;
      return AREAS.map(function (_, i) {
        var r = Math.floor(i / 3), inRow = Math.min(3, n - r * 3), c = i % 3;
        var w = ((AR - AX) - (inRow - 1) * GAP) / inRow;
        return { x: AX + c * (w + GAP), y: ATOP + r * (rowH + GAP), w: w, h: rowH };
      });
    }
    function seatsIn(rect, list) {
      var padX = 14, padTop = 36, padBottom = 12, gap = 8;
      var ix = rect.x + padX, iy = rect.y + padTop;
      var iw = rect.w - padX * 2, ih = Math.max(rect.h - padTop - padBottom, 60);
      var cols = Math.min(2, Math.max(list.length, 1));
      var rows = Math.max(Math.ceil(list.length / cols), 1);
      var cellW = (iw - (cols - 1) * gap) / cols, cellH = Math.min(ih / rows, 132);
      var top = iy + (ih - cellH * rows) / 2;
      return list.map(function (ag, i) {
        var c = i % cols, r = Math.floor(i / cols);
        var deskY = top + r * cellH + cellH - 28;
        return { agent: ag, cx: ix + c * (cellW + gap) + cellW / 2,
                 deskW: Math.min(cellW - 6, 140), deskY: deskY, feetY: deskY + 7 };
      });
    }
    var byArea = {};
    AREAS.forEach(function (a) {
      byArea[a.id] = AGENTS.filter(function (g) { return !g.isSupervisor && g.areaId === a.id; })
        .sort(function (x, y) { return st.xp[y.id] - st.xp[x.id]; });
    });
    var bosses = AGENTS.filter(function (a) { return a.isSupervisor; });
    var rects = zoneRects();
    var zones = AREAS.map(function (a, i) { return { area: a, rect: rects[i], seats: seatsIn(rects[i], byArea[a.id]) }; });
    var bossSeats = seatsIn(BOSS, bosses);
    var order = bosses.map(function (a) { return a.id; })
      .concat(zones.reduce(function (acc, z) { return acc.concat(z.seats.map(function (s) { return s.agent.id; })); }, []));
    var seatIndex = {};
    zones.concat([{ seats: bossSeats }]).forEach(function (z) {
      z.seats.forEach(function (s) { seatIndex[s.agent.id] = s; });
    });

    /* ── pintar ── */
    function xpPct(xp) {
      var L = [0, 50, 150, 300, 500], l = lvl(xp), lo = L[l - 1] || 0, hi = L[l] || (lo + 200);
      return Math.max(5, Math.min(100, (xp - lo) / (hi - lo) * 100));
    }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function seatHTML(s, color) {
      var id = s.agent.id, i = order.indexOf(id), state;
      if (!st.entered) state = 'walking';
      else if (statusOf(id) === 'trabajando') state = 'working';
      else if (statusOf(id) === 'termino') state = 'done';
      else state = 'idle';
      return '<button class="of-seat' + (st.selected === id ? ' is-sel' : '') + '" data-agent="' + id + '"' +
        ' style="left:' + px(s.cx) + ';top:' + py(s.feetY) + ';--fx:' + px(DFEET.x) + ';--fy:' + py(DFEET.y) +
        ';animation-delay:' + (Math.max(i, 0) * 280) + 'ms" aria-label="' + esc(s.agent.name) + '" title="' +
        esc(s.agent.name + ' · ' + s.agent.role) + '">' + avatar(s.agent.avatar, 52, state, {}) + '</button>' +
        '<div class="of-desk" style="left:' + px(s.cx) + ';top:' + py(s.deskY) + ';width:' + px(s.deskW) +
        ';border-color:' + color + '55">' +
        '<span class="of-desk-nm">' + esc(s.agent.name) + '</span>' +
        '<span class="of-desk-lv">Nv.' + lvl(st.xp[id]) + '</span></div>';
    }

    function stageHTML() {
      var h = '<div class="of-zone boss" style="left:' + px(BOSS.x) + ';top:' + py(BOSS.y) +
        ';width:' + px(BOSS.w) + ';height:' + py(BOSS.h) + '"><span class="of-zone-lb">👔 Dirección</span></div>';
      zones.forEach(function (z) {
        var n = lvl(z.area.xp);
        h += '<div class="of-zone" style="left:' + px(z.rect.x) + ';top:' + py(z.rect.y) + ';width:' + px(z.rect.w) +
          ';height:' + py(z.rect.h) + ';background:' + z.area.color + '26;border-color:' + z.area.color + '80">' +
          '<span class="of-zone-lb" style="color:' + z.area.color + '">' + z.area.emoji + ' ' + esc(z.area.name) +
          ' · Nv.' + n + (n >= 3 ? ' ⭐' : '') + '</span></div>';
      });
      h += '<div class="of-door" style="left:' + px(DOOR.x) + ';top:' + py(DOOR.y) + ';width:' + px(DOOR.w) +
        ';height:' + py(DOOR.h) + '"><span aria-hidden="true">🚪</span><small>Entrada</small></div>';
      h += '<div class="of-strip" style="left:' + px(STRIP.x) + ';top:' + py(STRIP.y) + ';width:' + px(STRIP.w) +
        ';height:' + py(STRIP.h) + '"><span class="of-strip-lb">📬 Entregables</span>' +
        (st.results.length
          ? st.results.slice(0, 3).map(function (r) {
              return '<button class="of-strip-chip" data-res="' + r.id + '">' + esc(r.title) + '</button>';
            }).join('')
          : '<span class="of-strip-mut">Aquí caerá lo que terminen.</span>') + '</div>';
      bossSeats.forEach(function (s) { h += seatHTML(s, '#1B2340'); });
      zones.forEach(function (z) { z.seats.forEach(function (s) { h += seatHTML(s, z.area.color); }); });
      if (st.paper) {
        h += '<div class="of-paper" style="left:' + px(st.paper.x) + ';top:' + py(st.paper.y) + '">📄</div>';
      }
      return h;
    }

    function groupsHTML() {
      var gs = [{ key: 'dir', title: 'Dirección', emoji: '👔', color: '#1B2340', list: bosses, xp: PROJECT.xp }];
      AREAS.forEach(function (a) { gs.push({ key: a.id, title: a.name, emoji: a.emoji, color: a.color, list: byArea[a.id], xp: a.xp }); });
      return gs.map(function (g) {
        return '<section class="of-group"><div class="of-group-hd">' +
          '<span class="of-dot" style="background:' + g.color + '"></span>' +
          '<span class="of-group-nm">' + g.emoji + ' ' + esc(g.title) + '</span>' +
          '<span class="of-group-lv">Nv.' + lvl(g.xp) + '</span></div>' +
          (g.list.length ? '' : '<p class="of-empty">Todavía no hay nadie sentado aquí.</p>') +
          g.list.map(function (a) {
            var s = statusOf(a.id);
            return '<button class="of-person' + (st.selected === a.id ? ' is-sel' : '') + '" data-agent="' + a.id + '">' +
              avatar(a.avatar, 34, s === 'trabajando' ? 'working' : 'static', {}) +
              '<span class="of-person-tx"><span class="of-person-nm">' + esc(a.name) + '</span>' +
              '<span class="of-person-rl">' + esc(a.role) + '</span>' +
              '<span class="of-bar sm"><i style="width:' + xpPct(st.xp[a.id]) + '%;background:' + g.color + '"></i></span></span>' +
              '<span class="of-person-rt"><span class="of-state ' + s + '">' + LABEL[s] + '</span>' +
              '<span class="of-lv">Nv.' + lvl(st.xp[a.id]) + '</span></span></button>';
          }).join('') + '</section>';
      }).join('');
    }

    function centerHTML() {
      if (st.tab === 'plano') {
        return '<div class="of-canvas flat"><div class="of-plan"><p class="of-plan-tt">Así se pasan el trabajo</p>' +
          '<div class="of-flow">' + STEPS.map(function (s, i) {
            return '<span class="of-step">' + (i + 1) + '. ' + esc(s) + '</span><span class="of-arrow">›</span>';
          }).join('') + '<span class="of-step end">◆ Entregable final</span></div>' +
          '<button class="of-btn primary" data-go="plano">Abrir el plano completo</button></div></div>';
      }
      if (st.tab === 'agentes') {
        return '<div class="of-canvas flat"><div class="of-cards">' + AGENTS.map(function (a) {
          return '<button class="of-mini' + (st.selected === a.id ? ' is-sel' : '') + '" data-agent="' + a.id + '">' +
            avatar(a.avatar, 56, 'static', {}) + '<b>' + esc(a.name) + '</b><span>' + esc(a.role) + '</span>' +
            '<span class="of-lv">Nv.' + lvl(st.xp[a.id]) + '</span></button>';
        }).join('') + '<button class="of-mini add" data-add="1"><span class="of-mini-plus">+</span>' +
          '<b>Nuevo agente</b><span>Súmalo a un área</span></button></div></div>';
      }
      return '<div class="of-canvas"><div class="of-stage"' + (st.iso ? ' data-iso="true"' : '') +
        '><div class="of-floor">' + stageHTML() + '</div></div></div>';
    }

    function sideHTML() {
      return '<div class="of-card"><div class="of-card-hd"><span class="of-ico amber">⚡</span><h2>Pedidos</h2></div>' +
        '<div class="of-card-bd">' +
        '<label class="of-lb" for="of-req">¿Qué necesitas?</label>' +
        '<textarea id="of-req" class="of-ta" placeholder="' + esc(PEDIDO) + '">' + esc(st.request) + '</textarea>' +
        '<div class="of-f"><span class="of-lb">¿Quiénes le entran?</span><div class="of-chips">' +
        AREAS.map(function (a) {
          return '<button class="of-chip' + (st.picked.indexOf(a.id) >= 0 ? ' is-on' : '') + '" data-area="' + a.id + '">' +
            a.emoji + ' ' + esc(a.name) + '</button>';
        }).join('') + '</div></div>' +
        '<div class="of-f"><label class="of-lb" for="of-boss">¿Quién reparte el trabajo?</label>' +
        '<select id="of-boss" class="of-sel"><option value="">Nadie por ahora</option>' +
        bosses.map(function (b) {
          return '<option value="' + b.id + '"' + (st.boss === b.id ? ' selected' : '') + '>' +
            esc(b.name + ' · ' + b.role) + '</option>';
        }).join('') + '</select></div>' +
        '<button class="of-run" id="of-run"' + (st.running ? ' disabled' : '') + '>➤ Poner a trabajar</button>' +
        '<p class="of-hint">Se lo pasa a ' + (st.picked.length || 'ninguna') + ' ' +
        (st.picked.length === 1 ? 'área' : 'áreas') + '.</p></div></div>' +

        '<div class="of-card"><div class="of-card-hd"><span class="of-ico">📈</span><h2>Lo que está pasando</h2></div>' +
        '<div class="of-card-bd"><ul class="of-log">' + st.log.map(function (e) {
          return '<li class="' + (e.tone || 'normal') + '"><span class="of-log-h">' + e.time + '</span>' +
            '<span class="of-log-i">' + e.icon + '</span><span class="of-log-t">' + esc(e.text) + '</span></li>';
        }).join('') + '</ul></div></div>' +

        '<div class="of-card"><div class="of-card-hd"><span class="of-ico">📦</span><h2>Entregables</h2>' +
        '<span class="of-count">' + st.results.length + '</span></div><div class="of-card-bd">' +
        (st.results.length ? st.results.map(function (r) {
          return '<button class="of-result" data-res="' + r.id + '"><span class="of-result-ic">📄</span>' +
            '<span class="of-result-tx"><b>' + esc(r.title) + '</b>' +
            (r.summary ? '<span class="of-result-sm">' + esc(r.summary) + '</span>' : '') +
            '<span class="of-result-mt">' + esc(r.format + (r.author ? ' · ' + r.author : '') + (r.time ? ' · ' + r.time : '')) +
            '</span></span></button>';
        }).join('') : '<p class="of-empty">Cuando terminen, lo dejan aquí.</p>') +
        '<p class="of-hand">Todo queda guardado ♡</p></div></div>';
    }

    function paint() {
      root.innerHTML =
        '<div class="of' + (st.entered ? ' of-ready' : '') + '">' +
        '<header class="of-head"><div class="of-head-l"><span class="of-emoji">' + PROJECT.emoji + '</span>' +
        '<div><h1 class="of-title">' + esc(PROJECT.name) + '</h1>' +
        '<p class="of-sub">' + esc(PROJECT.description) + '</p></div></div>' +
        '<div class="of-head-r"><div class="of-xp-box"><span class="of-xp-lb">Nivel ' + lvl(PROJECT.xp) + '</span>' +
        '<span class="of-bar"><i style="width:' + xpPct(PROJECT.xp) + '%"></i></span></div>' +
        '<button class="of-btn" data-go="plano">🗺 Ver plano</button>' +
        '<button class="of-btn" data-go="copilot">✨ Ayudante</button>' +
        '<button class="of-btn primary" data-add="1">＋ Nuevo agente</button></div></header>' +

        '<div class="of-grid">' +
        '<aside class="of-card of-people"><div class="of-card-hd"><span class="of-ico">👥</span><h2>Tu gente</h2>' +
        '<span class="of-count">' + AGENTS.length + '</span></div>' +
        '<div class="of-card-bd">' + groupsHTML() + '</div></aside>' +

        '<section class="of-main"><div class="of-tabs"><div class="of-tabs-l" role="tablist">' +
        [['oficina', 'Oficina'], ['plano', 'Plano'], ['agentes', 'Agentes']].map(function (t) {
          return '<button class="of-tab' + (st.tab === t[0] ? ' is-on' : '') + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        '<label class="of-switch" title="Ver el piso en perspectiva"><input type="checkbox" id="of-iso"' +
        (st.iso ? ' checked' : '') + '><span class="of-track"><i></i></span> Isométrico</label></div>' +
        centerHTML() + '</section>' +

        '<aside class="of-side">' + sideHTML() + '</aside></div></div>';
      bind();
    }

    /* ── eventos: lo que en la app tocaría el store, aquí sale como toast ── */
    function bind() {
      root.querySelectorAll('[data-agent]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-agent');
          var a = AGENTS.filter(function (x) { return x.id === id; })[0];
          st.selected = id; paint();
          MO.toast('onSelectAgent(agent)', JSON.stringify({ id: a.id, name: a.name, role: a.role, xp: st.xp[a.id] }, null, 2));
        };
      });
      root.querySelectorAll('[data-res]').forEach(function (b) {
        b.onclick = function () {
          var r = st.results.filter(function (x) { return x.id === b.getAttribute('data-res'); })[0];
          MO.toast('onOpenResult(result)', JSON.stringify(r, null, 2));
        };
      });
      root.querySelectorAll('[data-tab]').forEach(function (b) {
        b.onclick = function () {
          st.tab = b.getAttribute('data-tab'); paint();
          MO.toast('onTabChange(tab)', JSON.stringify({ tab: st.tab }, null, 2));
        };
      });
      root.querySelectorAll('[data-area]').forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute('data-area'), i = st.picked.indexOf(id);
          if (i >= 0) st.picked.splice(i, 1); else st.picked.push(id);
          paint();
        };
      });
      root.querySelectorAll('[data-add]').forEach(function (b) {
        b.onclick = function () { MO.toast('onAddAgent()', 'Abre el creador de agentes.'); MO.go('agents'); };
      });
      root.querySelectorAll('[data-go]').forEach(function (b) {
        b.onclick = function () {
          var d = b.getAttribute('data-go');
          if (d === 'plano') { MO.toast('onOpenPlano()', 'Abre el plano del proyecto.'); MO.go('plano'); }
          else { MO.toast('onOpenCopilot()', 'Abre el ayudante.'); MO.go('copilot'); }
        };
      });
      var iso = root.querySelector('#of-iso');
      if (iso) iso.onchange = function () { st.iso = iso.checked; paint(); };
      var ta = root.querySelector('#of-req');
      if (ta) ta.oninput = function () { st.request = ta.value; };
      var sel = root.querySelector('#of-boss');
      if (sel) sel.onchange = function () { st.boss = sel.value; };
      var run = root.querySelector('#of-run');
      if (run) run.onclick = simular;
    }

    /* ── simulación visual del pedido (sólo prototipo) ── */
    function hora() {
      var d = new Date();
      return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
    function apunta(icon, text, tone) {
      st.log.push({ id: 'l' + st.log.length + Date.now(), time: hora(), icon: icon, text: text, tone: tone || 'normal' });
    }
    function simular() {
      if (st.running) return;
      var texto = (st.request || '').trim() || PEDIDO;
      var payload = { request: texto, areaIds: st.picked.slice(), supervisorId: st.boss || undefined };
      MO.toast('onRun(payload)', JSON.stringify(payload, null, 2));
      if (!st.picked.length) return;

      st.running = true; st.tab = 'oficina';
      AGENTS.forEach(function (a) { if (!a.isSupervisor) st.status[a.id] = 'libre'; });
      st.log = []; st.paper = { x: DFEET.x, y: DFEET.y - 40 };
      var jefe = AGENTS.filter(function (a) { return a.id === st.boss; })[0] || bosses[0];
      apunta('▶️', (jefe ? jefe.name : 'La dirección') + ' repartió el pedido entre ' + st.picked.length +
        (st.picked.length === 1 ? ' área.' : ' áreas.'), 'alta');
      st.status[jefe ? jefe.id : ''] = 'trabajando';
      paint();

      var fila = [];
      AREAS.forEach(function (a) {
        if (st.picked.indexOf(a.id) < 0) return;
        (byArea[a.id] || []).forEach(function (g) { fila.push({ agent: g, area: a }); });
      });

      var t = 500;
      fila.forEach(function (paso, i) {
        var s = seatIndex[paso.agent.id];
        later(t, function () {
          st.paper = { x: s.cx, y: s.deskY - 34 };
          st.status[paso.agent.id] = 'trabajando';
          apunta('📋', paso.agent.name + ' tomó su parte en ' + paso.area.name + '.');
          paint();
        });
        t += 1100;
        later(t, function () {
          st.status[paso.agent.id] = 'termino';
          st.xp[paso.agent.id] += 10;
          apunta('✅', paso.agent.name + ' entregó su parte. +10 de experiencia.', 'ok');
          if (fila[i + 1]) apunta('🤝', paso.agent.name + ' le pasó el trabajo a ' + fila[i + 1].agent.name + '.');
          paint();
        });
        t += 500;
      });

      later(t, function () {
        st.paper = { x: STRIP.x + 120, y: STRIP.y - 4 };
        st.results = [{ id: 'r' + (st.results.length + 1), title: 'Plan de lanzamiento', format: 'documento',
          author: jefe ? jefe.name : 'La oficina', time: hora(),
          summary: 'Todo junto: mercado, competencia, campaña y plan de ventas.' }].concat(st.results);
        apunta('📬', 'Listo: Plan de lanzamiento está en Entregables.', 'alta');
        if (jefe) st.status[jefe.id] = 'libre';
        st.running = false;
        paint();
        MO.toast('Entregable listo', 'Plan de lanzamiento · documento');
      });
      later(t + 1400, function () { st.paper = null; paint(); });
    }

    paint();
    later(620 + order.length * 280, function () { st.entered = true; paint(); });
  }
});
