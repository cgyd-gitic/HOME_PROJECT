/* HOME · gráficos: configuración, series y cargador de librerías bajo demanda (la pantalla está en app_v07c.js desde la v0.7). */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  var scripts = {};
  H.cargarScript = function (src) { if (!scripts[src]) scripts[src] = new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error("No se ha podido cargar " + src)); }; document.head.appendChild(s); }); return scripts[src]; };
  // Librerías pesadas: se cargan al usarlas. Desde la v0.4 están en la carpeta principal (junto a index.html); se prueba también lib/ por si
  // el repositorio conserva la estructura antigua. Si falla, el mensaje dice exactamente qué archivo falta en GitHub.
  function cargarLib(nombre, global) {
    if (window[global]) return Promise.resolve(window[global]);
    return H.cargarScript(nombre).catch(function () { return H.cargarScript("lib/" + nombre); }).then(function () { if (!window[global]) throw new Error("vacío"); return window[global]; })
      .catch(function () { delete scripts[nombre]; delete scripts["lib/" + nombre]; throw new Error("No se ha podido cargar «" + nombre + "». Comprueba que ese archivo está subido en la carpeta principal del repositorio de GitHub, junto a index.html (Mi cuenta → Comprobar la instalación de la web)."); });
  }
  H.plotly = function () { return cargarLib("plotly-cartesian.min.js", "Plotly"); };
  H.xlsx = function () { return cargarLib("xlsx.full.min.js", "XLSX"); };

  var DEF_G = { exps: [], colores: {}, muestra: "PERF", vars: ["Lactato"], eje: "real", modo: "individual", puntos: true, lineas: true, log: false, objetivo: true, historica: false,
    xmin: "", xmax: "", titulo: "", fuente: 13, ancho: 1000, alto: 560, leyenda: "derecha", rejilla: true, estilo: "pantalla", grosor: 2, tam_punto: 6 };
  var G = null;
  function cargarG() { if (G) return G; try { G = H.mezclar(DEF_G, JSON.parse(localStorage.getItem("home_graf") || "{}")); } catch (e) { G = H.copia(DEF_G); } G.log = false; if (MUESTRAS_G.every(function (x) { return x[0] !== G.muestra; })) { G.muestra = "PERF"; G.vars = ["Lactato"]; } if (G.muestra === "PERF") G.vars = G.vars.filter(function (v) { return GAS_IDS.indexOf(v) === -1; }); if (!G.vars.length) G.vars = [varsDe(G.muestra)[0].id]; return G; }
  function guardarG() { localStorage.setItem("home_graf", JSON.stringify(G)); }
  // v0.5: bioquímica (sin lo que mide la gasometría), las tres gasometrías, parámetros calculados, inmunología y receptor post-trasplante
  var MUESTRAS_G = [["PERF", "Bioquímica del perfusato"], ["ART", "Gasometría arterial"], ["POR", "Gasometría portal"], ["CAV", "Gasometría cava"], ["DERIV", "Parámetros calculados (VO₂, resistencias, flujo/100 g, bilis)"],
    ["INMUNO", "Inmunología"], ["REC", "Receptor · seguimiento post-trasplante"], ["REC_EVAL", "Receptor · evaluación funcional"]];
  var GAS_IDS = ["pH", "pO2", "pCO2", "sO2", "HCO3", "BE", "Hb", "Lactato", "Glucosa", "Na", "K", "Ca", "Cl"];
  function varsDe(m) {
    if (MUESTRAS_G.every(function (x) { return x[0] !== m; })) m = "PERF";
    if (m === "DERIV") return C.DERIVADAS.concat([C.variable("BILIS", "Produccion_mLh")]);
    if (m === "PERF") return C.MUESTRAS.PERF.vars.filter(function (v) { return GAS_IDS.indexOf(v.id) === -1; });
    return C.MUESTRAS[m].vars;
  }
  function colorDe(id, i) { return G.colores[id] || H.colorExp(id, i); }

  // serie de puntos (x, y) para un experimento, incluidas las variables derivadas
  function serieExp(exp, m, v) {
    var e = H.exp(exp), t0 = H.inicioPerf(exp);
    if (m === "DERIV" && /^(Produccion_mLh|Bilis_mLh_100g)$/.test(v)) m = "BILIS";
    var calc = (m === "DERIV") || (m === "BILIS" && /^(Produccion_mLh|Bilis_mLh_100g)$/.test(v));
    if (!calc) { var s0 = C.serie(H.med(exp), exp, m, v, G.eje, t0); if (m === "PERF" && v === "Cefalina") s0 = s0.concat(C.serie(H.med(exp), exp, "INMUNO", v, G.eje, t0)).sort(function (a, b) { return a.x - b.x; }); return s0; }
    var base = m === "DERIV" ? "FLUJO" : "BILIS", puntos = {};
    H.med(exp).forEach(function (x) { if (x.Muestra === base && !puntos[x.Punto]) puntos[x.Punto] = x; });
    return Object.keys(puntos).map(function (p) {
      var o = m === "DERIV" ? H.derivadasFlujo(e, p) : H.derivadasBilis(e, { punto: p }), y = o ? o[v] : null; if (y === null || y === undefined || !isFinite(y)) return null;
      return { x: C.xDe(puntos[p], G.eje, C.aFecha(t0)), y: y, punto: p, tn: C.num(puntos[p].T_nominal_h) };
    }).filter(function (q) { return q && q.x !== null; }).sort(function (a, b) { return a.x - b.x; });
  }
  H.serieExp = function (exp, m, v, eje) { cargarG(); var e0 = G.eje; if (eje) G.eje = eje; var r = serieExp(exp, m, v); G.eje = e0; return r; };

  // v0.7 (c): la pantalla (H.vistas.graficos), el dibujo SVG, la leyenda común, la maquetación y las exportaciones están en app_v07c.js.
  //   Desde la v0.7 la pantalla Gráficos ya no usa Plotly (H.plotly se conserva por compatibilidad). Se quitó «Sombrear la noche (20–8 h)».
  function nombreArchivo(v) { return "HOME_" + G.muestra + "_" + v + "_" + H.aFechaLocal(new Date()); }
  // v0.7 (c): configuración y series para el módulo de figuras (app_v07c.js), que sustituye la vista y las acciones de esta pantalla
  H.grafInt = { G: cargarG, guardar: guardarG, varsDe: varsDe, muestras: MUESTRAS_G, DEF: DEF_G, colorDe: function (id, i) { cargarG(); return colorDe(id, i); }, nombreArchivo: function (v) { cargarG(); return nombreArchivo(v); } };

  // ---- descargas genéricas
  H.csv = function (filas, sep) { sep = sep || ","; return "\ufeff" + filas.map(function (f) { return f.map(function (x) { if (x === null || x === undefined) return ""; var s = typeof x === "number" ? String(x) : String(x); return /[",\n;]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s; }).join(sep); }).join("\r\n"); };
  H.descargar = function (nombre, contenido, tipo) { var b = contenido instanceof Blob ? contenido : new Blob([contenido], { type: (tipo || "text/plain") + ";charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_graf.js"] = "0.7.0";
