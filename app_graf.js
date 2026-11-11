/* HOME · gráficos automáticos (Plotly, cargado bajo demanda). */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  var scripts = {};
  H.cargarScript = function (src) { if (!scripts[src]) scripts[src] = new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { ko(new Error("No se ha podido cargar " + src)); }; document.head.appendChild(s); }); return scripts[src]; };
  H.plotly = function () { return window.Plotly ? Promise.resolve(window.Plotly) : H.cargarScript("lib/plotly-cartesian.min.js").then(function () { return window.Plotly; }); };
  H.xlsx = function () { return window.XLSX ? Promise.resolve(window.XLSX) : H.cargarScript("lib/xlsx.full.min.js").then(function () { return window.XLSX; }); };

  var DEF_G = { exps: [], colores: {}, muestra: "PERF", vars: ["Lactato"], eje: "real", modo: "individual", puntos: true, lineas: true, log: false, objetivo: true, historica: false, noche: true,
    xmin: "", xmax: "", titulo: "", fuente: 13, ancho: 1000, alto: 560, leyenda: "derecha", rejilla: true, estilo: "pantalla", grosor: 2, tam_punto: 6 };
  var G = null;
  function cargarG() { if (G) return G; try { G = H.mezclar(DEF_G, JSON.parse(localStorage.getItem("home_graf") || "{}")); } catch (e) { G = H.copia(DEF_G); } return G; }
  function guardarG() { localStorage.setItem("home_graf", JSON.stringify(G)); }
  var MUESTRAS_G = [["PERF", "Perfusato · bioquímica"], ["ART", "Gasometría arterial"], ["POR", "Gasometría portal"], ["CAV", "Gasometría cava"], ["FLUJO", "Presiones, flujos y mezcladores"], ["DERIV", "Derivadas (VO₂, resistencias, flujo/100 g)"],
    ["BILIS", "Bilis"], ["HDF", "Hemodiafiltración"], ["INMUNO", "Inmunología y hormonas"], ["RECAL", "Recalentamiento (valores reales)"]];
  function varsDe(m) { if (m === "DERIV") return C.DERIVADAS.filter(function (d) { return d.id !== "Bilis_mLh_100g"; }); return C.MUESTRAS[m].vars.concat(m === "BILIS" ? [C.DERIVADAS.filter(function (d) { return d.id === "Bilis_mLh_100g"; })[0]] : []); }
  function colorDe(id, i) { return G.colores[id] || H.colorExp(id, i); }

  // serie de puntos (x, y) para un experimento, incluidas las variables derivadas
  function serieExp(exp, m, v) {
    var e = H.exp(exp), t0 = H.inicioPerf(exp);
    var calc = (m === "DERIV") || (m === "BILIS" && /^(Densidad|Produccion_mLh|Bilis_mLh_100g)$/.test(v));
    if (!calc) return C.serie(H.med(exp), exp, m, v, G.eje, t0);
    var base = m === "DERIV" ? "FLUJO" : "BILIS", puntos = {};
    H.med(exp).forEach(function (x) { if (x.Muestra === base && !puntos[x.Punto]) puntos[x.Punto] = x; });
    return Object.keys(puntos).map(function (p) {
      var o = m === "DERIV" ? H.derivadasFlujo(e, p) : H.derivadasBilis(e, { punto: p }), y = o ? o[v] : null; if (y === null || y === undefined || !isFinite(y)) return null;
      return { x: C.xDe(puntos[p], G.eje, C.aFecha(t0)), y: y, punto: p, tn: C.num(puntos[p].T_nominal_h) };
    }).filter(function (q) { return q && q.x !== null; }).sort(function (a, b) { return a.x - b.x; });
  }
  H.serieExp = function (exp, m, v, eje) { cargarG(); var e0 = G.eje; if (eje) G.eje = eje; var r = serieExp(exp, m, v); G.eje = e0; return r; };
  function filtrarX(s) { var a = C.num(G.xmin), b = C.num(G.xmax); return s.filter(function (p) { return (a === null || p.x >= a) && (b === null || p.x <= b); }); }
  function tituloX() { return G.eje === "nominal" ? "Tiempo de perfusión nominal (h)" : G.eje === "dia" ? "Día de perfusión" : G.eje === "hora" ? "Hora del día (h)" : "Tiempo de perfusión (h)"; }

  H.vistas.graficos = function () {
    cargarG(); var exps = H.listaExp(); if (!G.exps.length) G.exps = exps.filter(function (e) { return e.Estado === "Finalizado" || e.Estado === "Perfusión"; }).map(function (e) { return e.ID; }).slice(-6);
    G.exps = G.exps.filter(function (id) { return H.exp(id); });
    var falta = G.exps.filter(function (id) { return !S.medCargada[id]; });
    if (falta.length && S.online) H.asegurarMed(falta).then(function (x) { if (x) H.repintar(); }).catch(function () { });
    var vs = varsDe(G.muestra);
    function chk(k, et) { return "<label class=\"check\"><input type=\"checkbox\" data-cambio=\"gOpc\" data-k=\"" + k + "\"" + (G[k] ? " checked" : "") + "> " + et + "</label>"; }
    function sel(k, et, ops) { return "<div class=\"campo\"><label class=\"et\" for=\"g_" + k + "\">" + et + "</label><select id=\"g_" + k + "\" data-cambio=\"gOpc\" data-k=\"" + k + "\">" + ops.map(function (o) { return "<option value=\"" + o[0] + "\"" + (String(G[k]) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>"; }
    function num(k, et, u) { return "<div class=\"campo\"><label class=\"et\" for=\"g_" + k + "\">" + et + "</label><div class=\"unidad-in\"><input id=\"g_" + k + "\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" value=\"" + esc(G[k]) + "\" data-cambio=\"gOpc\" data-k=\"" + k + "\"><span>" + esc(u || "") + "</span></div></div>"; }
    var panel = "<aside class=\"graf-panel tarjeta\" aria-label=\"Opciones del gráfico\">" +
      "<h3 style=\"margin-bottom:8px\">Perfusiones</h3><div class=\"fila-flex\" style=\"margin-bottom:6px\"><button class=\"bt mini\" data-act=\"gTodas\">Todas</button><button class=\"bt mini\" data-act=\"gNinguna\">Ninguna</button><button class=\"bt mini\" data-act=\"gPaleta\" title=\"Reasignar la paleta apta para daltonismo\">Paleta</button></div>" +
      "<div class=\"lista-sel\">" + (exps.length ? exps.map(function (e, i) { var on = G.exps.indexOf(e.ID) !== -1; return "<label><input type=\"checkbox\" data-cambio=\"gExp\" data-id=\"" + esc(e.ID) + "\"" + (on ? " checked" : "") + "> <span>" + esc(e.ID) + "</span> <span class=\"muy-tenue\">" + esc(e.Estado || "") + "</span><input type=\"color\" aria-label=\"Color de " + esc(e.ID) + "\" value=\"" + esc(colorDe(e.ID, i)) + "\" data-cambio=\"gColor\" data-id=\"" + esc(e.ID) + "\"></label>"; }).join("") : "<p class=\"tenue\">Sin experimentos.</p>") + "</div>" +
      "<h3 style=\"margin:14px 0 8px\">Variables</h3>" + sel("muestra", "Tipo de muestra", MUESTRAS_G) +
      "<div class=\"lista-sel\" style=\"max-height:220px\">" + vs.map(function (v) { return "<label><input type=\"checkbox\" data-cambio=\"gVar\" data-id=\"" + v.id + "\"" + (G.vars.indexOf(v.id) !== -1 ? " checked" : "") + "> " + esc(v.nombre) + " <span class=\"muy-tenue\">" + esc(v.unidad) + "</span></label>"; }).join("") + "</div>" +
      "<h3 style=\"margin:14px 0 8px\">Presentación</h3>" + sel("eje", "Eje X", [["real", "Tiempo real (h)"], ["nominal", "Tiempo nominal del protocolo (h)"], ["dia", "Día de perfusión"], ["hora", "Hora del día (circadiano)"]]) +
      sel("modo", "Modo", [["individual", "Cada perfusión"], ["media_de", "Media ± DE"], ["media_eem", "Media ± EEM"], ["ind_media", "Cada perfusión + media"]]) +
      "<div class=\"rejilla estrecha\">" + num("xmin", "X desde", "") + num("xmax", "X hasta", "") + "</div>" +
      "<div style=\"display:flex;flex-direction:column;gap:2px\">" + chk("puntos", "Puntos") + chk("lineas", "Líneas") + chk("log", "Escala logarítmica en Y") + chk("objetivo", "Banda de objetivo") + chk("historica", "Banda histórica (media ± 2 DE del resto)") + chk("noche", "Sombrear la noche (20–8 h)") + chk("rejilla", "Cuadrícula") + "</div>" +
      "<details class=\"plegable\" style=\"margin-top:10px\"><summary>Formato y exportación</summary><div class=\"dentro\"><div class=\"campo\"><label class=\"et\" for=\"g_titulo\">Título</label><input id=\"g_titulo\" value=\"" + esc(G.titulo) + "\" data-cambio=\"gOpc\" data-k=\"titulo\" placeholder=\"Automático…\" autocomplete=\"off\"></div>" +
      sel("estilo", "Estilo", [["pantalla", "Pantalla"], ["publicacion", "Publicación (fondo blanco, ejes negros)"]]) + sel("leyenda", "Leyenda", [["derecha", "Derecha"], ["abajo", "Abajo"], ["oculta", "Oculta"]]) +
      "<div class=\"rejilla estrecha\">" + num("fuente", "Tamaño de letra", "pt") + num("grosor", "Grosor de línea", "px") + num("tam_punto", "Tamaño de punto", "px") + num("ancho", "Ancho exportado", "px") + num("alto", "Alto exportado", "px") + "</div></div></details>" +
      "</aside>";
    var barra = "<div class=\"fila-flex\" style=\"margin-bottom:10px\"><button class=\"bt\" data-act=\"gExport\" data-f=\"png\">" + ico("image") + "PNG (300 ppp)</button><button class=\"bt\" data-act=\"gExport\" data-f=\"svg\">" + ico("image") + "SVG</button>" +
      "<button class=\"bt\" data-act=\"gCSV\">" + ico("file-text") + "Datos (CSV)</button><button class=\"bt\" data-act=\"gPrism\">" + ico("file-spreadsheet") + "GraphPad Prism (XY)</button><span class=\"muy-tenue empuja\">" + G.exps.length + " perfusiones · " + G.vars.length + " variables</span></div>";
    H.trasPintar(dibujar);
    return "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Gráficos</h1></div><div class=\"graf-marco\">" + panel + "<div style=\"min-width:0\">" + barra + "<div id=\"graficos\" class=\"" + (G.vars.length > 1 ? "graf-multiples" : "") + "\">" +
      G.vars.map(function (v, i) { return "<div class=\"tarjeta\" style=\"padding:8px\"><div id=\"gr_" + i + "\" class=\"graf-lienzo\" role=\"img\" aria-label=\"Gráfico de " + esc(C.variable(G.muestra === "DERIV" ? "FLUJO" : G.muestra, v).nombre) + "\"></div></div>"; }).join("") + "</div>" +
      (G.vars.length ? "" : "<div class=\"vacio\">Elige al menos una variable.</div>") + "<div id=\"gTabla\"></div></div></div></div>";
  };
  function trazas(v) {
    var tr = [], seriesSel = [], vd = C.variable(G.muestra === "DERIV" ? "FLUJO" : G.muestra, v), modo = (G.lineas ? "lines" : "") + (G.puntos ? (G.lineas ? "+" : "") + "markers" : "") || "markers";
    G.exps.forEach(function (id, i) {
      var s = filtrarX(serieExp(id, G.muestra, v)); if (!s.length) return; seriesSel.push(s);
      if (G.modo === "individual" || G.modo === "ind_media") tr.push({ type: "scatter", mode: modo, name: id, x: s.map(function (p) { return p.x; }), y: s.map(function (p) { return p.y; }), text: s.map(function (p) { return p.punto; }),
        hovertemplate: "<b>" + id + "</b><br>%{text}<br>x = %{x:.2f}<br>" + vd.nombre + " = %{y}<extra></extra>", line: { color: colorDe(id, i), width: G.modo === "ind_media" ? 1 : C.num(G.grosor) || 2 }, marker: { color: colorDe(id, i), size: C.num(G.tam_punto) || 6 }, opacity: G.modo === "ind_media" ? 0.45 : 1 });
    });
    if (G.modo !== "individual" && seriesSel.length) {
      var src = G.eje === "real" ? seriesSel.map(function (s) { return s.map(function (p) { return { x: p.tn !== null && p.tn !== undefined ? p.tn : C.r(p.x, 1), y: p.y }; }); }) : seriesSel;   // en tiempo real se agrupa por punto nominal
      var ag = C.agregarSeries(src), err = G.modo === "media_eem" ? "eem" : "de";
      tr.push({ type: "scatter", mode: "lines+markers", name: "Media ± " + (err === "eem" ? "EEM" : "DE") + " (n = " + seriesSel.length + ")", x: ag.map(function (a) { return a.x; }), y: ag.map(function (a) { return a.media; }),
        error_y: { type: "data", array: ag.map(function (a) { return a[err] || 0; }), visible: true, thickness: 1.2, width: 4, color: "#222" }, line: { color: G.estilo === "publicacion" ? "#000" : "#172026", width: (C.num(G.grosor) || 2) + 0.5 }, marker: { size: (C.num(G.tam_punto) || 6) + 1, color: "#172026" },
        text: ag.map(function (a) { return "n = " + a.n; }), hovertemplate: "Media %{y:.3g}<br>%{text}<extra></extra>" });
    }
    if (G.historica && G.muestra !== "DERIV") {
      var b = C.bandaHistorica(H.todasMed(), G.exps, G.muestra, v, 2).filter(function (x) { return x.inf !== null && x.n >= 3; });
      if (b.length) { tr.unshift({ type: "scatter", mode: "lines", x: b.map(function (x) { return x.t; }), y: b.map(function (x) { return x.sup; }), line: { width: 0 }, hoverinfo: "skip", showlegend: false });
        tr.splice(1, 0, { type: "scatter", mode: "lines", name: "Histórico ± 2 DE", x: b.map(function (x) { return x.t; }), y: b.map(function (x) { return x.inf; }), fill: "tonexty", fillcolor: "rgba(120,130,140,.18)", line: { width: 0 }, hoverinfo: "skip" }); }
    }
    return { trazas: tr, vd: vd };
  }
  function layout(vd, v) {
    var pub = G.estilo === "publicacion", osc = document.documentElement.classList.contains("tema-oscuro") && !pub, f = C.num(G.fuente) || 13, ob = G.objetivo ? H.objetivo(G.muestra === "DERIV" ? "FLUJO" : G.muestra, v) : null;
    var col = osc ? "#e5ecef" : "#172026", grid = osc ? "#2a363d" : "#e3e8eb", shapes = [];
    if (ob) shapes.push({ type: "rect", xref: "paper", x0: 0, x1: 1, y0: ob[0], y1: ob[1], fillcolor: "rgba(27,122,58,.10)", line: { width: 0 }, layer: "below" });
    if (G.noche && G.eje === "hora") { shapes.push({ type: "rect", xref: "x", yref: "paper", x0: 0, x1: 8, y0: 0, y1: 1, fillcolor: "rgba(44,93,154,.08)", line: { width: 0 }, layer: "below" }); shapes.push({ type: "rect", xref: "x", yref: "paper", x0: 20, x1: 24, y0: 0, y1: 1, fillcolor: "rgba(44,93,154,.08)", line: { width: 0 }, layer: "below" }); }
    if (G.noche && G.eje === "real" && G.exps.length === 1 && H.inicioPerf(G.exps[0])) { var t0 = C.aFecha(H.inicioPerf(G.exps[0])), dias = S.cfg.general.dias_perfusion + 1; for (var d = -1; d <= dias; d++) { var a = C.enHora(t0, "20:00", d), b = C.enHora(t0, "08:00", d + 1); shapes.push({ type: "rect", xref: "x", yref: "paper", x0: (a - t0) / 36e5, x1: (b - t0) / 36e5, y0: 0, y1: 1, fillcolor: "rgba(44,93,154,.08)", line: { width: 0 }, layer: "below" }); } }
    var titulo = G.titulo ? (G.vars.length > 1 ? G.titulo + " · " + vd.nombre : G.titulo) : vd.nombre + (G.muestra !== "PERF" && G.muestra !== "DERIV" ? " · " + C.MUESTRAS[G.muestra].corto : "");
    var leg = G.leyenda === "oculta" ? { showlegend: false } : G.leyenda === "abajo" ? { showlegend: true, legend: { orientation: "h", y: -0.22 } } : { showlegend: true, legend: { x: 1.02, y: 1 } };
    var lx = C.num(G.xmin), ux = C.num(G.xmax);
    return Object.assign({ title: { text: titulo, font: { size: f + 3 } }, font: { family: "Roboto, Arial, sans-serif", size: f, color: pub ? "#000" : col }, paper_bgcolor: pub ? "#fff" : "rgba(0,0,0,0)", plot_bgcolor: pub ? "#fff" : "rgba(0,0,0,0)",
      margin: { l: 64, r: 20, t: 46, b: 56 }, shapes: shapes, hovermode: "closest",
      xaxis: { title: { text: tituloX() }, showgrid: !!G.rejilla, gridcolor: grid, zeroline: false, linecolor: pub ? "#000" : grid, showline: true, ticks: "outside", range: lx !== null || ux !== null ? [lx, ux] : undefined, dtick: G.eje === "hora" ? 4 : undefined },
      yaxis: { title: { text: vd.nombre + (vd.unidad ? " (" + H.unidadVisible(vd.id, vd.unidad) + ")" : "") }, type: G.log ? "log" : "linear", showgrid: !!G.rejilla, gridcolor: grid, zeroline: false, linecolor: pub ? "#000" : grid, showline: true, ticks: "outside" } }, leg);
  }
  function dibujar() {
    if (!G.vars.length) return;
    H.plotly().then(function (P) {
      G.vars.forEach(function (v, i) {
        var el = document.getElementById("gr_" + i); if (!el) return; var t = trazas(v), ly = layout(t.vd, v);
        if (G.muestra === "POR" || G.muestra === "ART" || G.muestra === "CAV") { if ((v === "pO2" || v === "pCO2") && H.pref("kpa")) t.trazas.forEach(function (tr) { if (tr.y) tr.y = tr.y.map(function (y) { return y === null ? null : y / C.KPA; }); if (tr.error_y) tr.error_y.array = tr.error_y.array.map(function (y) { return y / C.KPA; }); }); }
        if (!t.trazas.length) { el.innerHTML = "<div class=\"vacio\" style=\"margin:20px\">Sin datos de " + esc(t.vd.nombre) + " en las perfusiones seleccionadas.</div>"; return; }
        P.react(el, t.trazas, ly, { responsive: true, displaylogo: false, locale: "es", modeBarButtonsToRemove: ["lasso2d", "select2d"], toImageButtonOptions: { format: "png", scale: 3, filename: nombreArchivo(v) } });
      });
    }).catch(function (e) { var c = H.$("#graficos"); if (c) c.innerHTML = "<div class=\"aviso al\">" + ico("circle-alert") + "<div>" + esc(e.message) + "</div></div>"; });
  }
  function nombreArchivo(v) { return "HOME_" + G.muestra + "_" + v + "_" + H.aFechaLocal(new Date()); }
  H.acc.gOpc = function (el) { var k = el.getAttribute("data-k"); G[k] = el.type === "checkbox" ? el.checked : el.hasAttribute("data-num") ? (el.value === "" ? "" : C.num(el.value)) : el.value; if (k === "muestra") { var ids = varsDe(G.muestra).map(function (v) { return v.id; }); G.vars = G.vars.filter(function (v) { return ids.indexOf(v) !== -1; }); if (!G.vars.length) G.vars = [ids[0]]; } guardarG(); H.repintar(); };
  H.acc.gExp = function (el) { var id = el.getAttribute("data-id"), i = G.exps.indexOf(id); if (el.checked && i === -1) G.exps.push(id); if (!el.checked && i !== -1) G.exps.splice(i, 1); guardarG(); H.repintar(); };
  H.acc.gColor = function (el) { G.colores[el.getAttribute("data-id")] = el.value; guardarG(); dibujar(); };
  H.acc.gVar = function (el) { var id = el.getAttribute("data-id"), i = G.vars.indexOf(id); if (el.checked && i === -1) G.vars.push(id); if (!el.checked && i !== -1) G.vars.splice(i, 1); guardarG(); H.repintar(); };
  H.acc.gTodas = function () { G.exps = H.listaExp().map(function (e) { return e.ID; }); guardarG(); H.repintar(); };
  H.acc.gNinguna = function () { G.exps = []; guardarG(); H.repintar(); };
  H.acc.gPaleta = function () { G.colores = {}; H.listaExp().forEach(function (e, i) { G.colores[e.ID] = C.PALETA[i % C.PALETA.length]; }); guardarG(); H.repintar(); };
  H.acc.gExport = function (el) {
    var f = el.getAttribute("data-f"); H.plotly().then(function (P) { G.vars.forEach(function (v, i) { var d = document.getElementById("gr_" + i); if (d && d.data) P.downloadImage(d, { format: f, width: C.num(G.ancho) || 1000, height: C.num(G.alto) || 560, scale: f === "png" ? 3 : 1, filename: nombreArchivo(v) }); }); });
  };
  H.acc.gCSV = function () {
    var filas = [["Experimento", "Muestra", "Variable", "Unidad", "Punto", "X (" + tituloX() + ")", "Valor"]];
    G.vars.forEach(function (v) { var vd = C.variable(G.muestra === "DERIV" ? "FLUJO" : G.muestra, v); G.exps.forEach(function (id) { filtrarX(serieExp(id, G.muestra, v)).forEach(function (p) { filas.push([id, G.muestra, v, vd.unidad, p.punto, C.r(p.x, 4), p.y]); }); }); });
    H.descargar(nombreArchivo(G.vars.join("-")) + ".csv", H.csv(filas), "text/csv");
  };
  H.acc.gPrism = function () {
    H.xlsx().then(function (X) {
      var wb = X.utils.book_new(), ini = {}; G.exps.forEach(function (id) { ini[id] = H.inicioPerf(id); });
      G.vars.forEach(function (v) {
        var xs = {}, data = {}; G.exps.forEach(function (id) { filtrarX(serieExp(id, G.muestra, v)).forEach(function (p) { var k = C.r(G.eje === "real" && p.tn !== null && p.tn !== undefined ? p.tn : p.x, 3); xs[k] = 1; (data[id] = data[id] || {})[k] = p.y; }); });
        var X0 = Object.keys(xs).map(Number).sort(function (a, b) { return a - b; }), aoa = [[tituloX()].concat(G.exps)].concat(X0.map(function (x) { return [x].concat(G.exps.map(function (id) { return data[id] && data[id][x] !== undefined ? data[id][x] : null; })); }));
        X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), String(v).slice(0, 31));
      });
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Formato"], ["Tabla XY de GraphPad Prism: columna X = tiempo, una columna Y por perfusión (réplicas)."], ["En Prism: File → Import → elegir esta hoja; o copiar el rango y Paste Special en una tabla XY."], ["Con eje «tiempo real», X es el tiempo nominal del protocolo para alinear las perfusiones."], ["Generado", new Date().toISOString()]]), "Léeme");
      X.writeFile(wb, nombreArchivo("Prism") + ".xlsx");
    });
  };

  // ---- descargas genéricas
  H.csv = function (filas, sep) { sep = sep || ","; return "\ufeff" + filas.map(function (f) { return f.map(function (x) { if (x === null || x === undefined) return ""; var s = typeof x === "number" ? String(x) : String(x); return /[",\n;]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s; }).join(sep); }).join("\r\n"); };
  H.descargar = function (nombre, contenido, tipo) { var b = contenido instanceof Blob ? contenido : new Blob([contenido], { type: (tipo || "text/plain") + ";charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
})();
