/*
 * dash-shim.js — Implementación mínima y local de la API `dash` que usa el tablero.
 * En claude.ai el tablero corre dentro del tipo de artefacto "Data", que provee `dash`.
 * Este archivo permite abrir el mock en cualquier navegador sin ese entorno.
 * Requiere d3 v7 cargado antes y los datos en window.__DASH_DATA__ = { docentes: [...] }.
 */
(function () {
  const datasets = window.__DASH_DATA__ || {};
  const calcs = {};
  const draws = {};
  const listeners = [];
  let params = {};
  let scheduled = false;

  const ok = (data) => { const r = { status: 'ok', data, message: null, refreshing: false, truncated: false, meta: null };
    if (Array.isArray(data) && data.length) r.columns = Object.keys(data[0]); return r; };

  function data(id) {
    if (id in datasets) return ok(datasets[id]);
    if (id in calcs) {
      try {
        const c = calcs[id];
        const args = c.inputs.map((i) => { const d = data(i); return d.status === 'ok' ? d.data : []; });
        return ok(c.fn(...args));
      } catch (e) { console.error('calc', id, e); return { status: 'error', data: null, message: String(e) }; }
    }
    return { status: 'missing', data: [], message: 'No existe la fuente ' + id };
  }

  const visible = (el) => !el.closest('[hidden]');
  function runDraw(name) {
    const fn = draws[name]; if (!fn) return;
    document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => {
      if (!visible(el)) return;
      try { fn(el); } catch (e) { console.error('draw', name, e); }
    });
  }
  function redrawAll() {
    scheduled = false;
    listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    Object.keys(draws).forEach(runDraw);
  }
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(redrawAll); } };

  window.dash = {
    data,
    calc: (id, def) => { calcs[id] = def; },
    loader: () => {},
    onData: (fn) => { listeners.push(fn); },
    draw: (name, fn) => {
      if (fn === undefined) { runDraw(name); return; }
      if (typeof fn === 'object') { const m = fn; let made; fn = (el) => { if (!el.__mounted) { el.replaceChildren(); made = m.mount ? m.mount(el) : undefined; el.__mounted = true; } m.update && m.update(el, made); }; }
      draws[name] = fn;
    },
    params: () => ({ ...params }),
    setParams: (p) => { Object.entries(p).forEach(([k, v]) => { if (v === null || v === undefined) delete params[k]; else params[k] = v; }); schedule(); },
    resetParams: () => { params = {}; schedule(); },
    setLink: (name) => { if (name && location.hash !== '#' + name) history.replaceState(null, '', '#' + name); },
    refresh: () => schedule(),
    colors: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
  };

  document.addEventListener('DOMContentLoaded', () => {
    redrawAll();
    // Al mostrar una pestaña oculta (atributo hidden) se vuelven a dibujar sus gráficos.
    new MutationObserver(schedule).observe(document.getElementById('dash-root'), { attributes: true, attributeFilter: ['hidden'], subtree: true });
    let w = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; schedule(); } });
  });
})();
