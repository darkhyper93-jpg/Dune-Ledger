/**
 * Ayudas mínimas para armar la interfaz sin frameworks: crear elementos,
 * mostrar avisos cortos (toast) y abrir hojas inferiores.
 */

/**
 * Crea un elemento. `h('button', { class: 'btn', onclick }, 'Hola')`.
 * Los atributos que empiezan con "on" se registran como eventos; los
 * hijos pueden ser texto, nodos, arreglos o null (se ignora).
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {...any} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  appendAll(el, children);
  return el;
}

/**
 * Agrega hijos (texto, nodos o listas) a un elemento.
 */
function appendAll(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/**
 * Reemplaza el contenido de un elemento.
 * @param {HTMLElement} el
 * @param {...any} children
 */
export function mount(el, ...children) {
  el.replaceChildren();
  appendAll(el, children);
}

let toastTimer = 0;

/**
 * Muestra un aviso corto abajo de la pantalla.
 * @param {string} text
 * @param {number} [ms=2200]
 */
export function toast(text, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/**
 * Abre una hoja inferior con contenido. Devuelve una función para cerrarla.
 * Tocar fuera o la tecla Escape la cierran.
 * @param {(close:Function)=>HTMLElement|HTMLElement[]} build arma el contenido
 * @param {{label?:string, onClose?:Function}} [opts]
 */
export function openSheet(build, opts = {}) {
  const root = document.getElementById('sheet-root');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    root.replaceChildren();
    opts.onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const sheet = h('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label ?? 'Detalle' }, h('div', { class: 'grab' }));
  appendAll(sheet, [build(close)]);
  mount(root, h('div', { class: 'sheet-backdrop', onclick: close }), sheet);
  document.addEventListener('keydown', onKey);
  sheet.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
  return close;
}

/**
 * Cierra cualquier hoja abierta.
 */
export function closeSheets() {
  document.getElementById('sheet-root').replaceChildren();
}

/**
 * Formatea un precio por unidad: con un decimal si no es entero (coma decimal).
 * @param {number} p
 */
export function fmtPrice(p) {
  if (Number.isInteger(p) || p >= 100) return String(Math.round(p));
  return p.toFixed(1).replace('.', ',');
}
