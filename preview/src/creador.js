/* Creador de agentes §6.3 — copia de prototipo del módulo ya entregado */
const CREADOR_HTML = "<div class=\"ab\">\n        <header class=\"ab-head\">\n          <div class=\"ab-head-l\">\n            <button class=\"ab-back\" aria-label=\"Volver\"><svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 18l-6-6 6-6\"/></svg></button>\n            <div>\n              <h1 class=\"ab-title\">Creador de agentes</h1>\n              <p class=\"ab-sub\">Dise\u00f1a un nuevo agente de IA. Personaliza su apariencia y define su personalidad.</p>\n            </div>\n          </div>\n          <div class=\"ab-head-r\">\n            <span class=\"ab-crumb\">Agentes \u203a <b>Nuevo</b></span>\n            <button class=\"ab-btn\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"><path d=\"M5 4h9l5 5v11H5z\"/><path d=\"M14 4v5h5\"/></svg> Ver biblioteca</button>\n          </div>\n        </header>\n\n        <div class=\"ab-grid\">\n          <section class=\"ab-card\"><div class=\"ab-card-bd\">\n            <div class=\"ab-preview\">\n              <p class=\"ab-hand\">\u00a1Hola!<br>Soy tu agente \u2661</p>\n              <button class=\"ab-nav l\" id=\"prev-body\" aria-label=\"Cuerpo anterior\"><svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 18l-6-6 6-6\"/></svg></button>\n              <button class=\"ab-nav r\" id=\"next-body\" aria-label=\"Cuerpo siguiente\"><svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 18l6-6-6-6\"/></svg></button>\n              <div id=\"preview\"></div>\n            </div>\n            <div style=\"text-align:center\">\n              <button class=\"ab-play\" id=\"play\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M8 5v14l11-7z\"/></svg> Vista previa en movimiento</button>\n            </div>\n            <div id=\"parts\"></div>\n            <button class=\"ab-dice\" id=\"dice\">\ud83c\udfb2 Aleatorio</button>\n          </div></section>\n\n          <section class=\"ab-card\">\n            <div class=\"ab-card-hd\">\n              <span class=\"ab-chip-ico\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"3.2\"/></svg></span>\n              <h2>Informaci\u00f3n del agente</h2>\n            </div>\n            <div class=\"ab-card-bd\">\n              <div class=\"ab-row\">\n                <div><label class=\"ab-lb\" for=\"f-name\">Nombre <span class=\"req\">*</span></label>\n                  <input id=\"f-name\" class=\"ab-in\" value=\"Lupita\" placeholder=\"Lupita\"></div>\n                <div><label class=\"ab-lb\" for=\"f-role\">Puesto <span class=\"req\">*</span></label>\n                  <input id=\"f-role\" class=\"ab-in\" value=\"Investigadora\" placeholder=\"Investigadora\"></div>\n              </div>\n              <div class=\"ab-f\">\n                <label class=\"ab-lb\" for=\"f-does\">\u00bfQu\u00e9 hace? <span class=\"req\">*</span></label>\n                <div class=\"ab-tawrap\">\n                  <textarea id=\"f-does\" class=\"ab-ta\" maxlength=\"500\" placeholder=\"Investiga informaci\u00f3n, analiza fuentes\u2026\">Investiga informaci\u00f3n, analiza fuentes, resume hallazgos y encuentra oportunidades de mercado.</textarea>\n                  <span class=\"ab-count\" id=\"f-count\">0/500</span>\n                </div>\n              </div>\n              <div class=\"ab-f\">\n                <label class=\"ab-lb\" for=\"f-not\">\u00bfQu\u00e9 NO hace?</label>\n                <input id=\"f-not\" class=\"ab-in\" placeholder=\"No toma decisiones finales de negocio, no ejecuta campa\u00f1as, no programa c\u00f3digo.\">\n              </div>\n              <div class=\"ab-f\">\n                <label class=\"ab-lb\" for=\"f-del\">\u00bfQu\u00e9 entrega?</label>\n                <div class=\"ab-tokens\" id=\"del-box\"></div>\n                <div class=\"ab-sug\" id=\"del-sug\"></div>\n              </div>\n              <div class=\"ab-f\">\n                <label class=\"ab-lb\">Habilidades</label>\n                <div class=\"ab-tokens\" id=\"sk-box\"></div>\n                <div class=\"ab-sug\" id=\"sk-sug\"></div>\n              </div>\n              <div class=\"ab-row ab-f\">\n                <div>\n                  <label class=\"ab-lb\">Reporta a</label>\n                  <div class=\"ab-pickwrap\">\n                    <button class=\"ab-pick\" id=\"sup-btn\" aria-haspopup=\"listbox\" aria-expanded=\"false\"></button>\n                    <div class=\"ab-menu\" id=\"sup-menu\" hidden role=\"listbox\"></div>\n                  </div>\n                </div>\n                <div style=\"display:flex;align-items:flex-end;padding-bottom:12px\">\n                  <label class=\"ab-check\"><input type=\"checkbox\" id=\"f-sup\">\n                    <span class=\"ab-box\"><svg width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12.5l5.2 5L20 6.5\"/></svg></span>\n                    Es supervisor</label>\n                </div>\n              </div>\n              <div class=\"ab-f\">\n                <label class=\"ab-lb\" for=\"f-area\">Sentar en \u00e1rea <span class=\"ab-opt-tag\">(opcional)</span></label>\n                <p class=\"ab-help\">Al guardar, se sienta en su mesa dentro del plano de Lanzamiento Caf\u00e9 Fr\u00edo.</p>\n                <select id=\"f-area\" class=\"ab-sel\">\n                  <option value=\"\">Sin \u00e1rea por ahora</option>\n                  <option value=\"inv\" selected>\ud83d\udd0e Investigaci\u00f3n</option>\n                  <option value=\"mkt\">\ud83c\udfa8 Marketing</option>\n                  <option value=\"ven\">\ud83d\udcb0 Ventas</option>\n                </select>\n              </div>\n              <div class=\"ab-foot\">\n                <button class=\"ab-btn\" id=\"test\"><svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M8 5v14l11-7z\"/></svg> Probar agente (P1)</button>\n                <button class=\"ab-btn ghost\">Cancelar</button>\n                <button class=\"ab-btn primary\" id=\"save\"><svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"><path d=\"M5 3h11l3 3v15H5z\"/><path d=\"M8 3v6h8V3M8 21v-7h8v7\"/></svg> Guardar agente</button>\n              </div>\n            </div>\n          </section>\n\n          <aside class=\"ab-aside\">\n            <div class=\"ab-card\">\n              <div class=\"ab-card-hd\">\n                <span class=\"ab-chip-ico\" style=\"background:#FFF6DD;color:#C98A12\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z\"/></svg></span>\n                <h2>Consejos</h2>\n              </div>\n              <div class=\"ab-card-bd\" style=\"padding-top:12px\">\n                <p style=\"margin:0;font-size:13px;color:var(--ab-ink-2)\">S\u00e9 espec\u00edfico en lo que hace tu agente. Entre m\u00e1s claro, mejores resultados.</p>\n                <div class=\"ab-rule\"></div>\n                <strong style=\"font-size:13px\">Un buen agente tiene:</strong>\n                <ul class=\"ab-tips\" id=\"tips\"></ul>\n              </div>\n            </div>\n            <div style=\"text-align:center\">\n              <div class=\"ab-troupe\" id=\"troupe\"></div>\n              <p style=\"font-family:Caveat,cursive;font-size:18px;color:var(--ab-ink-3);margin:0\">Equipos de agentes,<br>ideas m\u00e1s grandes. \u2661</p>\n            </div>\n            <blockquote class=\"ab-quote\">\u201cLa inteligencia artificial trabaja mejor cuando tiene un buen equipo.\u201d<cite>\u2014 MiniOficina</cite></blockquote>\n          </aside>\n        </div>\n      </div>";

MO.register('creador',{
  title:'Creador de agentes',
  subtitle:'Apariencia en 3 partes + ficha en lenguaje natural',
  css:'',
  render(root){ root.innerHTML = CREADOR_HTML; initCreador(); }
});

function initCreador(){
/* ═══════════════ Módulo: estado de UI del creador ═══════════════ */
const BUILDER_COLORS=['#FFD93D','#FF8FA8','#4D96FF','#6BCB77','#B892FF','#3A3D4D'];
const SKILLS=[{id:'resumir',name:'Resumir información'},{id:'buscar',name:'Buscar fuentes'},
  {id:'analizar',name:'Analizar datos'},{id:'redactar',name:'Redactar informes'},
  {id:'revisar',name:'Revisar trabajo'},{id:'traducir',name:'Traducir'}];
const DELIVERABLES=['Reportes de investigación','Lista','Tabla','Documento','Mensaje','Resumen'];
const TEAM=[
  {id:'ramon', name:'Don Ramón', role:'Gerente',               avatar:{body:'round', eyes:'focused',hat:'badge',     color:'#3A3D4D'}},
  {id:'monica',name:'Mónica',    role:'Redactora creativa',    avatar:{body:'round', eyes:'happy',  hat:'bow',       color:'#FF8FA8'}},
  {id:'sofia', name:'Sofía',     role:'Estratega de ventas',   avatar:{body:'bean',  eyes:'happy',  hat:'cap',       color:'#6BCB77'}},
  {id:'beto',  name:'Beto',      role:'Analista de competencia',avatar:{body:'square',eyes:'focused',hat:'headphones',color:'#B892FF'}}
];
let av={body:'round',eyes:'big',hat:'cap',color:'#FFD93D'};
let delivers=['Reportes de investigación'];
let skillIds=['resumir','buscar','analizar','redactar'];
let supervisorId='ramon';
let previewState='idle';

const PART_ROWS=[['Ojos','eyes',EYES],['Cuerpo','body',BODIES],['Gorro','hat',HATS]];

function renderPreview(){ $('#preview').innerHTML=avatar(av,206,previewState); }
function renderParts(){
  const box=$('#parts'); box.innerHTML='';
  PART_ROWS.forEach(([label,kind,list])=>{
    const row=el(`<div class="ab-part"><div class="ab-part-lb">${label} (${list.length})</div><div class="ab-opts"></div></div>`);
    const opts=row.querySelector('.ab-opts');
    list.forEach(v=>{
      const test=Object.assign({},av); test[kind]=v;
      const p=palette(av.color), m=GEO[kind==='body'?v:av.body];
      const svg=`<svg width="42" height="42" viewBox="0 0 128 128" aria-hidden="true">${
        bodyOf(kind==='body'?v:av.body, av.color, false)}${
        kind==='eyes'?EYE[v](m,p):''}${kind==='hat'?HAT[v](m,p):''}</svg>`;
      const b=el(`<button class="ab-opt" title="${LABELS[kind][v]}" aria-pressed="${av[kind]===v}">${svg}</button>`);
      b.onclick=()=>{av[kind]=v;renderAll();};
      opts.appendChild(b);
    });
    box.appendChild(row);
  });
  const crow=el(`<div class="ab-part"><div class="ab-part-lb">Color (${BUILDER_COLORS.length})</div><div class="ab-opts c6"></div></div>`);
  BUILDER_COLORS.forEach(c=>{
    const b=el(`<button class="ab-opt ab-sw" style="background:${c}" aria-pressed="${av.color===c}" aria-label="Color ${c}"></button>`);
    b.onclick=()=>{av.color=c;renderAll();}; crow.querySelector('.ab-opts').appendChild(b);
  });
  box.appendChild(crow);
}
function renderTokens(){
  const db=$('#del-box'); db.innerHTML='';
  delivers.forEach(t=>{const s=el(`<span class="ab-token">${t}<button aria-label="Quitar ${t}">×</button></span>`);
    s.querySelector('button').onclick=()=>{delivers=delivers.filter(x=>x!==t);renderTokens();};db.appendChild(s);});
  db.appendChild(el('<input class="ab-token-in" placeholder="Selecciona o escribe…">'));
  db.querySelector('input').onkeydown=e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();
    const v=e.target.value.trim(); if(v&&!delivers.includes(v)){delivers.push(v);renderTokens();}}};
  const ds=$('#del-sug'); ds.innerHTML='';
  DELIVERABLES.filter(d=>!delivers.includes(d)).forEach(d=>{
    const b=el(`<button>+ ${d}</button>`); b.onclick=()=>{delivers.push(d);renderTokens();}; ds.appendChild(b);});

  const sb=$('#sk-box'); sb.innerHTML='';
  skillIds.forEach(id=>{const sk=SKILLS.find(s=>s.id===id);
    const s=el(`<span class="ab-token">${sk.name}<button aria-label="Quitar ${sk.name}">×</button></span>`);
    s.querySelector('button').onclick=()=>{skillIds=skillIds.filter(x=>x!==id);renderTokens();};sb.appendChild(s);});
  sb.appendChild(el('<button class="ab-add">+ Agregar habilidad</button>'));
  const ss=$('#sk-sug'); ss.innerHTML='';
  const free=SKILLS.filter(s=>!skillIds.includes(s.id));
  sb.querySelector('.ab-add').onclick=()=>{ss.hidden=!ss.hidden;};
  free.forEach(s=>{const b=el(`<button>+ ${s.name}</button>`);
    b.onclick=()=>{skillIds.push(s.id);renderTokens();}; ss.appendChild(b);});
  ss.hidden=true;
}
function renderSup(){
  const btn=$('#sup-btn'), menu=$('#sup-menu'), sup=TEAM.find(a=>a.id===supervisorId);
  const isSup=$('#f-sup').checked;
  btn.disabled=isSup;
  btn.innerHTML=(sup&&!isSup)
    ? `${avatar(sup.avatar,26,'static')}<span>${sup.name}</span><span class="car"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>`
    : `<span style="color:var(--ab-ink-3)">${isSup?'Es la cabeza del equipo':'Nadie por ahora'}</span><span class="car"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>`;
  menu.innerHTML='';
  const none=el('<button><span style="color:var(--ab-ink-3)">Nadie por ahora</span></button>');
  none.onclick=()=>{supervisorId=null;menu.hidden=true;renderSup();}; menu.appendChild(none);
  TEAM.forEach(a=>{const b=el(`<button role="option">${avatar(a.avatar,26,'static')}<span>${a.name} <span class="rl">· ${a.role}</span></span></button>`);
    b.onclick=()=>{supervisorId=a.id;menu.hidden=true;renderSup();}; menu.appendChild(b);});
}
function renderAside(){
  $('#tips').innerHTML=['Un rol claro','Entregables definidos','Límites (qué NO hace)','Habilidades específicas']
    .map(t=>`<li><span class="ab-tick"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5L20 6.5"/></svg></span>${t}</li>`).join('');
  $('#troupe').innerHTML=[['round','cap','#FFD93D'],['bean','antenna','#4D96FF'],['round','bow','#FF8FA8'],['square','headphones','#B892FF']]
    .map((a,i)=>`<div style="margin-left:${i?-10:0}px">${avatar({body:a[0],eyes:'big',hat:a[1],color:a[2]},54)}</div>`).join('');
  $('#logo-mark').innerHTML=avatar({body:'round',eyes:'big',hat:'cap',color:'#FFD93D'},26,'static');
  $('#user-av').innerHTML=avatar({body:'bean',eyes:'big',hat:'antenna',color:'#4D96FF'},32,'static');
}
function renderAll(){renderPreview();renderParts();}

/* validación §6.3 */
function draft(){
  return {name:$('#f-name').value.trim(),role:$('#f-role').value.trim(),avatar:Object.assign({},av),
    does:$('#f-does').value.trim(),doesNot:$('#f-not').value.trim(),delivers:delivers.join(', '),
    skillIds:skillIds.slice(),supervisorId:$('#f-sup').checked?undefined:supervisorId,
    isSupervisor:$('#f-sup').checked,areaId:$('#f-area').value||undefined};
}
function toastLocal(title,body){
  document.querySelectorAll('.ab-toast').forEach(n=>n.remove());
  const n=el(`<div class="ab-toast"><b>${title}</b>${body}</div>`);
  document.body.appendChild(n); setTimeout(()=>n.remove(),9000);
}
function validate(){
  let ok=true;
  [['f-name','Ponle un nombre.'],['f-role','Dinos su puesto.'],['f-does','Describe qué hace.']].forEach(([id,msg])=>{
    const f=$('#'+id), wrap=f.closest('div');
    wrap.querySelectorAll('.ab-msg').forEach(n=>n.remove());
    if(!f.value.trim()){ok=false;wrap.classList.add('ab-err');wrap.appendChild(el(`<p class="ab-msg">${msg}</p>`));}
    else wrap.classList.remove('ab-err');
  });
  return ok;
}

/* eventos */
$('#dice').onclick=()=>{av={body:rnd(BODIES),eyes:rnd(EYES),hat:rnd(HATS),color:av.color};renderAll();};
$('#prev-body').onclick=()=>{const i=BODIES.indexOf(av.body);av.body=BODIES[(i+BODIES.length-1)%BODIES.length];renderAll();};
$('#next-body').onclick=()=>{const i=BODIES.indexOf(av.body);av.body=BODIES[(i+1)%BODIES.length];renderAll();};
$('#play').onclick=()=>{previewState='walking';renderPreview();
  setTimeout(()=>{previewState='working';renderPreview();},1600);
  setTimeout(()=>{previewState='idle';renderPreview();},3400);};
$('#f-sup').onchange=renderSup;
$('#sup-btn').onclick=()=>{const m=$('#sup-menu');m.hidden=!m.hidden;$('#sup-btn').setAttribute('aria-expanded',String(!m.hidden));};
if(!window.__creadorDoc){window.__creadorDoc=true;document.addEventListener('click',e=>{const m=document.querySelector('#sup-menu');if(m&&!e.target.closest('.ab-pickwrap'))m.hidden=true;});}
$('#f-does').addEventListener('input',e=>{$('#f-count').textContent=`${e.target.value.length}/500`;});
$('#save').onclick=()=>{ if(!validate()) return MO.toast('Faltan datos','Nombre, puesto y «qué hace» son obligatorios (§6.3).');
  MO.toast('onSave(draft) recibiría:', JSON.stringify(draft(),null,2)); };
$('#test').onclick=()=>MO.toast('onTest(draft)','P1: aquí tu equipo manda la ficha al motor y muestra una salida de ejemplo.');
}
