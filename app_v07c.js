/* HOME · v0.7 (c): Gráficas (diseño tipo Inicio, leyenda común, maquetación, ejes en inglés, bandas circadianas). */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME;
  if (!C || !H || !H.grafInt) return;
  var S = H.S, esc = H.esc, ico = H.ico, GI = H.grafInt;

  // ============================================================== 1. opciones nuevas (se añaden a las de app_graf.js)
  var NUEVAS = { v7: 0, disposicion: "auto", proporcion: "16:9", fig_mm: 180, ppp: 300, letras: "A", titulos: true, familia: "Arial", fuente_pt: 8, linea_pt: 1.2, punto_pt: 2.2,
    rejilla_t: "tenue", ingles: false, y0: false, dias: true, etiq_x: "horas", sup_prandial: true, sup_gluco: true, sup_noche: true, color_media: "#1d3a5a", fuente_auto: true };   // v0.7.2: fuente_auto
  Object.keys(NUEVAS).forEach(function (k) { if (!(k in GI.DEF)) GI.DEF[k] = NUEVAS[k]; });
  GI.DEF.leyenda = "abajo";
  var EJES = [["real", "Tiempo real de perfusión (h)"], ["reloj", "Hora de perfusión (reloj)"], ["nominal", "Tiempo nominal del protocolo (h)"], ["dia", "Día de perfusión"], ["hora", "Hora del día (circadiano, 0–24 h)"]];
  // v0.7.2: (i) del «Eje X» en lista: qué es cada eje y cuándo usarlo (una línea por elemento: «Título: explicación»)
  var INFO_EJE = "Qué representa cada eje X y cuándo usarlo:\n" +
    "Tiempo real de perfusión (h): horas transcurridas desde el inicio de cada perfusión hasta la hora real en que se tomó cada muestra. Es el eje por defecto. Úsalo para ver la evolución tal y como ocurrió.\n" +
    "Hora de perfusión (reloj): cada muestra a la hora del reloj en que se tomó. El 0 son las 00:00 del día en que empezó cada perfusión, así que perfusiones que empezaron a distinta hora quedan alineadas por la hora del día; marcas principales a las 08:00 y a las 20:00 y bloques «Día N» por días naturales (día 1 = día del inicio). Úsalo para relacionar los datos con el horario circadiano o el turno.\n" +
    "Tiempo nominal del protocolo (h): la hora teórica del punto de muestreo según el protocolo (T0, T1, T24…), no la hora real. Úsalo para comparar perfusiones punto a punto o para medias ± DE/EEM cuando las muestras no se tomaron exactamente a la misma hora.\n" +
    "Día de perfusión: el tiempo real en días (1 día = 24 h desde el inicio). Úsalo para perfusiones largas (de varios días), para ver la tendencia general.\n" +
    "Hora del día (circadiano, 0–24 h): todas las muestras plegadas en un único día de 0 a 24 h, sin importar el día de perfusión. Úsalo para buscar patrones circadianos (p. ej. si un valor sube siempre a la misma hora).";
  var MODOS = [["individual", "Cada perfusión"], ["media_de", "Media ± DE"], ["media_eem", "Media ± EEM"], ["ind_media", "Cada perfusión + media"]];
  var DISPOS = [["auto", "Automática"], ["1x1", "1 × 1"], ["1x2", "1 × 2 (una fila, dos paneles)"], ["2x1", "2 × 1 (dos filas)"], ["2x2", "2 × 2"], ["2x3", "2 × 3 (dos filas, tres columnas)"], ["3x2", "3 × 2 (tres filas, dos columnas)"], ["3x3", "3 × 3"],
    ["col1", "1 columna"], ["col2", "2 columnas"], ["col3", "3 columnas"], ["col4", "4 columnas"]];
  var PROPS = [["16:9", "16:9 (apaisado)"], ["2:1", "2:1"], ["3:1", "3:1 (serie temporal larga)"], ["3:2", "3:2"], ["4:3", "4:3"], ["1:1", "1:1 (cuadrado)"], ["3:4", "3:4 (vertical)"]];
  var ANCHOS = [[85, "85 mm · una columna de revista"], [120, "120 mm · columna y media"], [180, "180 mm · doble columna"], [254, "254 mm · diapositiva 16:9"]];
  function G() {
    var g = GI.G();
    if (!g.v7) { g.v7 = 1; g.rejilla_t = g.rejilla === false ? "ninguna" : "tenue"; g.leyenda = "abajo"; }
    if (EJES.every(function (x) { return x[0] !== g.eje; })) g.eje = "real";
    if (MODOS.every(function (x) { return x[0] !== g.modo; })) g.modo = "individual";
    if (GI.muestras.every(function (x) { return x[0] !== g.muestra; })) { g.muestra = GI.muestras[0][0]; var ids0 = GI.varsDe(g.muestra).map(function (v) { return v.id; }); g.vars = (g.vars || []).filter(function (v) { return ids0.indexOf(v) !== -1; }); }   // v0.7.2: sin «Receptor · evaluación funcional»
    if (!Array.isArray(g.vars)) g.vars = []; if (!Array.isArray(g.exps)) g.exps = []; if (!g.colores || typeof g.colores !== "object") g.colores = {};
    return g;
  }
  function numEn(x, a, b, def) { var n = C.num(x); return n === null || !isFinite(n) ? def : Math.min(b, Math.max(a, n)); }
  function fpt() { return numEn(G().fuente_pt, 4, 32, 8); }
  function lpt() { return numEn(G().linea_pt, 0.2, 6, 1.2); }
  function ppt() { return numEn(G().punto_pt, 0, 10, 2.2); }
  function anchoMM() { return numEn(G().fig_mm, 40, 600, 180); }
  function aspecto() { var m = /^(\d+):(\d+)$/.exec(G().proporcion || ""); return m ? +m[1] / +m[2] : 16 / 9; }
  var PT_MM = 72 / 25.4;

  // ============================================================== 2. traducción automática al inglés (variables, unidades, muestras, ejes y leyenda)
  var EN = {
    "pH": "pH", "pO₂": "pO₂", "pCO₂": "pCO₂", "sO₂": "sO₂", "HCO₃⁻": "HCO₃⁻", "BE": "Base excess", "Hb": "Hb", "Lactato": "Lactate", "Glucosa": "Glucose", "Na⁺": "Na⁺", "K⁺": "K⁺", "Ca²⁺ iónico": "Ionized Ca²⁺", "Cl⁻": "Cl⁻",
    "ALT": "ALT", "AST": "AST", "LDH": "LDH", "GGT": "GGT", "Bilirrubina total": "Total bilirubin", "Fosfatasa alcalina": "Alkaline phosphatase", "Triglicéridos": "Triglycerides", "Proteínas totales": "Total protein", "Albúmina": "Albumin",
    "Actividad de protrombina": "Prothrombin activity", "Tiempo de protrombina": "Prothrombin time", "Fibrinógeno": "Fibrinogen", "Tiempo de cefalina (TTPa)": "Activated partial thromboplastin time (aPTT)", "Insulina": "Insulin", "Cortisol": "Cortisol",
    "Creatinina": "Creatinine", "Fosfato": "Phosphate", "Magnesio": "Magnesium", "Urea": "Urea", "Amonio": "Ammonia", "Osmolalidad": "Osmolality", "Hemoglobina": "Hemoglobin", "Hematocrito": "Hematocrit",
    "Presión VP": "Portal vein pressure", "Flujo VP": "Portal vein flow", "Presión media AH": "Mean hepatic artery pressure", "Flujo AH": "Hepatic artery flow", "Temperatura": "Temperature", "FiO₂ arterial": "Arterial FiO₂", "Flujo de aire arterial": "Arterial sweep gas flow",
    "FiO₂ portal": "Portal FiO₂", "Flujo de aire portal": "Portal sweep gas flow", "Colesterol": "Cholesterol", "Ca²⁺": "Ca²⁺", "Volumen": "Volume", "Producción (calculada)": "Bile production", "Producción de bilis": "Bile production",
    "Flujo de sangre": "Blood flow", "Flujo de diálisis": "Dialysate flow", "Extracción": "Ultrafiltration", "Volumen de reemplazo": "Replacement volume", "P. acceso": "Access pressure", "P. retorno": "Return pressure", "PTM": "TMP", "Caída de presión": "Pressure drop",
    "P. efluente": "Effluent pressure", "P. prefiltro": "Pre-filter pressure", "C3": "C3", "C4": "C4", "C5": "C5", "IgA": "IgA", "IgG": "IgG", "IgM": "IgM", "PCR": "CRP", "Testosterona": "Testosterone", "Estradiol": "Estradiol", "Progesterona": "Progesterone",
    "Prostaglandina": "Prostaglandin", "pH arterial": "Arterial pH", "pO₂ arterial": "Arterial pO₂", "pCO₂ arterial": "Arterial pCO₂", "Respiración": "Breathing", "Respuesta a estímulos": "Response to stimuli", "Postura al manejo": "Posture on handling",
    "Ingesta": "Food intake", "Puntuación final": "Final score", "Consumo de O₂ hepático": "Hepatic O₂ consumption", "Consumo de O₂ por 100 g": "O₂ consumption per 100 g", "Aporte de O₂": "O₂ delivery", "Extracción de O₂": "O₂ extraction",
    "Flujo total": "Total flow", "Flujo total por 100 g": "Total flow per 100 g", "Resistencia AH": "Hepatic artery resistance", "Resistencia VP": "Portal vein resistance", "Bilis por 100 g": "Bile per 100 g",
    // muestras y compartimentos
    "Arterial": "Hepatic artery", "Portal": "Portal vein", "Cava": "Vena cava", "Bioquímica": "Perfusate", "Receptor": "Recipient", "Evaluación": "Recipient assessment", "Inmuno": "Immunology",
    // ejes, leyenda y textos de la figura
    "Tiempo de perfusión (h)": "Hour of perfusion (h)", "Hora de perfusión": "Hour of perfusion", "Tiempo nominal del protocolo (h)": "Nominal protocol time (h)", "Día de perfusión": "Day of perfusion", "Hora del día": "Time of day",
    // v0.7.1: títulos del eje X con su unidad (también en inglés)
    "Hora de perfusión (reloj)": "Hour of perfusion (clock time)", "Día de perfusión (días)": "Day of perfusion (days)", "Hora del día (h)": "Time of day (h)",
    "Media": "Mean", "Media ± DE": "Mean ± SD", "Media ± EEM": "Mean ± SEM", "Rango objetivo": "Target range", "Histórico ± 2 DE": "Historical ± 2 SD", "Prandial": "Prandial", "Glucocorticoides": "Glucocorticoids", "Melatonina (noche)": "Melatonin",
    "Periodo nocturno": "Night", "Día": "Day", "Sin datos": "No data"
  };
  var UNID_EN = { "seg": "s", "puntos": "points" };
  function tr(s) { if (!G().ingles || s === null || s === undefined) return s; return EN.hasOwnProperty(s) ? EN[s] : s; }
  function trU(u) { if (!G().ingles || !u) return u || ""; return UNID_EN.hasOwnProperty(u) ? UNID_EN[u] : u; }
  // número con la coma (español) o el punto (inglés) decimal
  function fmtN(v, dec) { if (v === null || v === undefined || !isFinite(v)) return ""; if (Math.abs(v) < 1e-12) v = 0; dec = Math.max(0, Math.min(6, dec || 0)); if (G().ingles) { var s = Number(v).toFixed(dec); return dec ? s.replace(/\.?0+$/, "") : s; } return H.n(v, dec); }
  function decDe(paso) { return paso >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(paso) - 1e-9)); }

  // ============================================================== 3. horario circadiano → franjas prandiales, bolos de glucocorticoide y periodo nocturno
  // Se leen del horario circadiano del experimento (Configuración › Horario circadiano, sin las líneas que su protocolo excluye):
  //   prandial = ritmo máximo de «NP (glucosa + AA)» (si no hay, «NP (lípidos)» > 0) · glucocorticoide = «Hidrocortisona» por encima de su basal ·
  //   noche = «Melatonina» > 0. Devuelve minutos del día [inicio, fin) con fin > inicio (puede pasar de 1440).
  C.franjasCircadianas = function (circ) {
    var cam = ((circ && circ.cambios) || []).filter(function (x) { return x && C.hm(x.h) !== null && C.num(x.valor) !== null; });
    function tramos(linea) {
      var ev = cam.filter(function (x) { return x.linea === linea; }).map(function (x) { return { m: C.hm(x.h) % 1440, v: C.num(x.valor) }; }).sort(function (a, b) { return a.m - b.m; });
      return ev.map(function (e, j) { return { a: e.m, b: j + 1 < ev.length ? ev[j + 1].m : ev[0].m + 1440, v: e.v }; }).filter(function (t) { return t.b > t.a; });
    }
    function unir(l) {
      var o = []; l.forEach(function (t) { var u = o[o.length - 1]; if (u && Math.abs(u[1] - t.a) < 1e-9) u[1] = t.b; else o.push([t.a, t.b]); });
      if (o.length > 1 && Math.abs(o[o.length - 1][1] - (o[0][0] + 1440)) < 1e-9) { var ul = o.pop(); o[0] = [ul[0], o[0][1] + 1440]; }   // tramo que cruza el inicio del ciclo
      return o.map(function (x) { var a = ((x[0] % 1440) + 1440) % 1440; return [a, a + (x[1] - x[0])]; }).sort(function (a, b) { return a[0] - b[0]; });
    }
    function sobre(l, pred) { return unir(l.filter(pred)); }
    var np = tramos("NP (glucosa + AA)"), lip = tramos("NP (lípidos)"), hc = tramos("Hidrocortisona"), mel = tramos("Melatonina"), out = { prandial: [], gluco: [], noche: [], fuente: {} };
    if (np.length) { var mx = Math.max.apply(null, np.map(function (t) { return t.v; })), mn = Math.min.apply(null, np.map(function (t) { return t.v; })); if (mx > mn) { out.prandial = sobre(np, function (t) { return t.v === mx; }); out.fuente.prandial = "NP (glucosa + AA)"; } }
    if (!out.prandial.length && lip.length) { out.prandial = sobre(lip, function (t) { return t.v > 0; }); if (out.prandial.length) out.fuente.prandial = "NP (lípidos)"; }
    if (hc.length) {   // v0.7.2: pulsos = tramos de ≤ 1 h por encima de los dos vecinos (con nocturno < basal, «por encima del mínimo» marcaba todo el día); si no hay, por encima del mínimo
      var pic = hc.filter(function (t, j) { var p = hc[(j - 1 + hc.length) % hc.length], q = hc[(j + 1) % hc.length]; return hc.length > 2 && t.b - t.a <= 60 && t.v > p.v && t.v > q.v; });
      var b = Math.min.apply(null, hc.map(function (t) { return t.v; })); out.gluco = pic.length ? sobre(pic, function () { return true; }) : sobre(hc, function (t) { return t.v > b; }); if (out.gluco.length) out.fuente.gluco = "Hidrocortisona"; }
    if (mel.length) { out.noche = sobre(mel, function (t) { return t.v > 0; }); if (out.noche.length) out.fuente.noche = "Melatonina"; }
    return out;
  };
  function relojDe(id) { var t = C.aFecha(H.inicioPerf(id)); return t ? t.getHours() + t.getMinutes() / 60 + t.getSeconds() / 3600 : null; }
  function hhmm(h) { h = ((h % 24) + 24) % 24; var m = Math.round(h * 60); if (m === 1440) m = 0; return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2); }
  // perfusión de referencia para colocar las superposiciones (la primera elegida con inicio y protocolo circadiano)
  function referencia() {
    var g = G(), ref = null, avisos = [];
    g.exps.forEach(function (id) { var e = H.exp(id); if (!ref && e && H.esCircadiano(e) && (g.eje === "reloj" || g.eje === "hora" || relojDe(id) !== null)) ref = { id: id, e: e, c: relojDe(id) }; });
    if (!ref) return null;
    ref.circ = H.circadianoDe(ref.e); ref.franjas = C.franjasCircadianas(ref.circ);
    if (g.eje === "real" || g.eje === "nominal" || g.eje === "dia") {
      var dist = g.exps.filter(function (id) { var c = relojDe(id); if (c === null || id === ref.id) return false; var d = Math.abs(c - ref.c) % 24; return Math.min(d, 24 - d) > 1; });
      if (dist.length) avisos.push("Las perfusiones " + dist.join(", ") + " empezaron a otra hora del día que " + ref.id + ": las superposiciones siguen el horario de " + ref.id + ". Para alinearlas por la hora del reloj, usa el eje «Hora de perfusión (reloj)».");
    }
    var noCirc = g.exps.filter(function (id) { var e = H.exp(id); return e && !H.esCircadiano(e); }); if (noCirc.length) avisos.push("Protocolo no circadiano en " + noCirc.join(", ") + ": no se le aplican las superposiciones.");
    ref.avisos = avisos; return ref;
  }

  // ============================================================== 4. datos de cada panel
  var RAMAS = { ART: 1, POR: 1, CAV: 1 };
  function muestraObj(m) { return m === "DERIV" ? "FLUJO" : m; }
  function defVar(v) { var g = G(), l = GI.varsDe(g.muestra).filter(function (x) { return x.id === v; })[0]; return l || C.variable(muestraObj(g.muestra), v); }
  // serie de una perfusión en las unidades que se dibujan (kPa si así se ha elegido) y en las coordenadas del eje X elegido
  function serieG(id, v, crudo) {
    var g = G(), eje = g.eje === "reloj" ? "real" : g.eje, s = H.serieExp(id, g.muestra, v, eje) || [];
    if (g.eje === "reloj") { var c = relojDe(id); s = c === null ? [] : s.map(function (p) { return { x: p.x + c, y: p.y, punto: p.punto, tn: p.tn }; }); }
    if (!crudo) s = s.map(function (p) { return { x: p.x, y: C.num(H.aVista(v, p.y)), punto: p.punto, tn: p.tn }; });
    var a = C.num(g.xmin), b = C.num(g.xmax);
    return s.filter(function (p) { return p.y !== null && isFinite(p.y) && p.x !== null && isFinite(p.x) && (a === null || p.x >= a) && (b === null || p.x <= b); });
  }
  function agregar(series) {
    var g = G(), eje = g.eje, gr = {};
    series.forEach(function (s) { s.pts.forEach(function (p) {
      var k, xp, tn = p.tn !== null && p.tn !== undefined && isFinite(p.tn) ? p.tn : null;
      if (eje === "hora") { xp = Math.round(p.x * 2) / 2; k = "h" + xp; }
      else if (tn !== null) { k = "t" + tn; xp = eje === "dia" ? tn / 24 : eje === "reloj" ? null : tn; }   // se agrupa por punto del protocolo
      else { xp = C.r(p.x, 1); k = "x" + xp; }
      var o = gr[k] || (gr[k] = { ys: [], xs: [], xp: xp }); o.ys.push(p.y); o.xs.push(p.x);
    }); });
    return Object.keys(gr).map(function (k) { var o = gr[k], n = o.ys.length, m = C.media(o.ys), s = n > 1 ? C.de(o.ys) : null; return { x: o.xp !== null ? o.xp : C.media(o.xs), m: m, de: s, eem: s === null ? null : s / Math.sqrt(n), n: n }; })
      .filter(function (a) { return a.m !== null && isFinite(a.m) && isFinite(a.x); }).sort(function (a, b) { return a.x - b.x; });
  }
  // banda de objetivo en las unidades dibujadas (Configuración › Objetivos; ART/POR/CAV heredan del perfusato lo que no tienen propio)
  function bandaObjetivo(muestra, v) {
    var ob = H.objetivo(muestraObj(muestra), v); if (!ob) return null;
    var a = C.num(ob[0]), b = C.num(ob[1]); if (a === null && b === null) return null;
    a = a === null ? null : C.num(H.aVista(v, a)); b = b === null ? null : C.num(H.aVista(v, b)); if (a !== null && b !== null && a > b) { var t = a; a = b; b = t; }
    return [a, b];
  }
  function historica(v) {
    var g = G(); if (!g.historica || g.muestra === "DERIV" || g.eje === "reloj" || g.eje === "hora") return null;
    var b = C.bandaHistorica(H.todasMed(), g.exps, g.muestra, v, 2).filter(function (x) { return x.inf !== null && x.n >= 3; }), f = g.eje === "dia" ? 1 / 24 : 1, a0 = C.num(g.xmin), b0 = C.num(g.xmax);
    b = b.map(function (x) { return { x: x.t * f, inf: C.num(H.aVista(v, x.inf)), sup: C.num(H.aVista(v, x.sup)) }; }).filter(function (x) { return (a0 === null || x.x >= a0) && (b0 === null || x.x <= b0); });
    return b.length ? b : null;
  }
  function datos(v) {
    var g = G(), vd = defVar(v), series = [];
    g.exps.forEach(function (id, i) { var pts = serieG(id, v); if (pts.length) series.push({ id: id, color: GI.colorDe(id, H.listaExp().map(function (e) { return e.ID; }).indexOf(id)), pts: pts }); });
    var ag = g.modo !== "individual" && series.length ? agregar(series) : null;
    return { v: v, vd: vd, series: series, ag: ag, n: series.length, ob: g.objetivo ? bandaObjetivo(g.muestra, v) : null, hist: historica(v), unidad: H.unidadVisible(v, vd.unidad) };
  }

  // ============================================================== 5. geometría de la figura (puntos tipográficos; 1 pt = 1/72 in)
  function disposicion(n) {
    var d = G().disposicion || "auto", m = /^(\d)x(\d)$/.exec(d), c;
    if (m) { c = +m[2]; return { c: c, f: Math.max(+m[1], Math.ceil(n / c)), celdas: +m[1] * c, fija: true }; }
    m = /^col(\d)$/.exec(d); c = m ? +m[1] : n <= 2 ? 1 : n <= 4 ? 2 : 3;
    return { c: c, f: Math.max(1, Math.ceil(n / c)), celdas: c * Math.max(1, Math.ceil(n / c)), fija: false };
  }
  function tw(s, f) { return String(s || "").length * f * 0.53; }
  // v0.7.2 · letra automática con la disposición automática: el tamaño elegido (fuente_pt) es el máximo y se reduce lo necesario
  // para que, con más columnas (paneles más estrechos y bajos), los textos no se coman el panel: ≤ 6,9 % del alto del panel
  // (títulos, «Día N», marcas y título del eje ocupan ~6,5 letras de alto → ≥ 55 % queda para los datos) y ≤ 7,5 % del ancho
  // (marcas y título del eje Y). Nunca por debajo de 6 pt (mínimo legible en una revista); se redondea a 0,5 pt.
  function fuenteAuto(c, Wt) {
    var base = fpt(); if (G().disposicion !== "auto" || G().fuente_auto === false) return base;
    var gap0 = base * 1.4, Wp = (Wt - (c - 1) * gap0) / c, Hp = Wp / aspecto(), lim = Math.min(Hp * 0.069, Wp * 0.075);
    return Math.max(Math.min(base, 6), Math.min(base, Math.floor(lim * 2) / 2));
  }
  H.g7fuenteAuto = function (n) { var d = disposicion(n); return fuenteAuto(d.c, anchoMM() * PT_MM); };
  function geometria(n, leyenda) {
    var g = G(), d = disposicion(n), Wt = anchoMM() * PT_MM, f = fuenteAuto(d.c, Wt), gap = f * 1.4, Lw = 0;
    if (g.leyenda === "derecha" && leyenda && leyenda.length) Lw = Math.min(Wt * 0.35, Math.max.apply(null, leyenda.map(function (x) { return tw(x.texto, f) + f * 3.2; })) + f);
    var Wp = (Wt - Lw - (d.c - 1) * gap) / d.c, Hp = Wp / aspecto();
    return { c: d.c, f: d.f, celdas: d.celdas, fija: d.fija, Wt: Wt, Wp: Wp, Hp: Hp, gap: gap, Lw: Lw, fs: f };
  }
  // paleta: «pantalla» sigue el tema (claro/oscuro); «publicación» y toda exportación, fondo blanco y ejes negros
  function paleta(exportar) {
    var pub = G().estilo === "publicacion", osc = !exportar && !pub && document.documentElement.classList.contains("tema-oscuro");
    if (pub) return { texto: "#000", eje: "#000", tick: "#000", rejilla: "#e6e6e6", obj: "rgba(27,122,58,.12)", fondo: "#fff" };
    if (osc) return { texto: "#e5ecef", eje: "#8fa1aa", tick: "#b9c6cc", rejilla: "#2a363d", obj: "rgba(74,222,128,.13)", fondo: "none" };
    return { texto: "#172026", eje: "#5b6b73", tick: "#46555c", rejilla: "#e3e8eb", obj: "rgba(27,122,58,.11)", fondo: exportar ? "#fff" : "none" };
  }
  var COL = { prandial: "#f08a84", gluco: "#f2c230", noche: "#4f7397", hist: "rgba(120,130,140,.20)" };

  // ============================================================== 6. eje X compartido y superposiciones
  function rangoX(todos) {
    var g = G(), xs = []; todos.forEach(function (d) { d.series.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p.x); }); }); if (d.ag) d.ag.forEach(function (a) { xs.push(a.x); }); });
    var a = C.num(g.xmin), b = C.num(g.xmax);
    if (g.eje === "hora") return [a !== null ? a : 0, b !== null ? b : 24];
    var lo = xs.length ? Math.min.apply(null, xs) : 0, hi = xs.length ? Math.max.apply(null, xs) : (g.eje === "dia" ? 1 : 24), u = g.eje === "dia" ? 1 : g.eje === "reloj" ? 12 : hi - lo > 48 ? 12 : hi - lo > 12 ? 6 : 1;
    if (g.eje === "real" || g.eje === "nominal") lo = Math.min(0, lo);
    var a0 = g.eje === "reloj" ? FASE_RELOJ : 0;   // v0.7.1: con el eje de reloj, el rango empieza y acaba a las 08:00 o a las 20:00
    lo = Math.floor((lo - a0) / u + 1e-9) * u + a0; hi = Math.ceil((hi - a0) / u - 1e-9) * u + a0; if (hi <= lo) hi = lo + u;
    return [a !== null ? a : lo, b !== null && b > (a !== null ? a : lo) ? b : hi];
  }
  // modo de las marcas del eje X: horas, reloj (desplazamiento = hora del día del cero del eje) o días
  function modoX(ref) {
    var g = G();
    if (g.eje === "hora") return { reloj: true, off: 0 };
    if (g.eje === "reloj") return { reloj: true, off: 0 };
    if (g.eje === "dia") return { dia: true };
    if (g.etiq_x === "reloj" && ref && ref.c !== null) return { reloj: true, off: ref.c };
    return { horas: true };
  }
  var FASE_RELOJ = 8;   // hora del reloj en la que se anclan las marcas principales (08:00 y 20:00)
  function ticksX(x0, x1, pw, f, mx) {
    var span = x1 - x0, cand = mx.dia ? [0.25, 0.5, 1, 2, 5, 10] : mx.reloj ? [1, 2, 3, 4, 6, 12, 24, 48] : [0.5, 1, 2, 4, 6, 12, 24, 48, 96], hueco = (mx.reloj ? f * 3.6 : f * 2.6), paso = cand[cand.length - 1];
    for (var i = 0; i < cand.length; i++) { if (span / cand[i] <= Math.max(2, pw / hueco) && span / cand[i] <= 16) { paso = cand[i]; break; } }
    // v0.7.1: marcas de reloj ancladas a las 08:00 (y 20:00): con paso de 12 h caen a las 08:00 y 20:00, con 24 h a las 08:00; el eje «Hora del día» (0–24 h) sigue en 00:00
    var off = mx.reloj ? mx.off || 0 : 0, fase = mx.reloj && G().eje !== "hora" ? FASE_RELOJ : 0, out = [], t = Math.ceil((x0 + off - fase) / paso - 1e-9) * paso - off + fase;
    for (; t <= x1 + 1e-9; t += paso) out.push({ t: +t.toFixed(9), et: mx.reloj ? (G().eje === "hora" && Math.abs(t + off - 24) < 1e-9 ? "24:00" : hhmm(t + off)) : fmtN(t, decDe(paso)) });
    return out;
  }
  function franjasEje(x0, x1, ref) {
    var g = G(), out = []; if (!ref || !(g.sup_prandial || g.sup_gluco || g.sup_noche)) return out;
    var fr = ref.franjas, esc1 = g.eje === "dia" ? 1 / 24 : 1, off = g.eje === "reloj" || g.eje === "hora" ? 0 : -(ref.c || 0);
    var h0 = x0 / esc1 - off, h1 = x1 / esc1 - off;   // en horas del reloj
    [["noche", g.sup_noche], ["prandial", g.sup_prandial], ["gluco", g.sup_gluco]].forEach(function (q) {
      if (!q[1]) return;
      (fr[q[0]] || []).forEach(function (iv) {
        for (var k = Math.floor(h0 / 24) - 1; k <= Math.ceil(h1 / 24) + 1; k++) {
          var a = iv[0] / 60 + 24 * k, b = iv[1] / 60 + 24 * k; if (b <= h0 || a >= h1) continue;
          out.push({ tipo: q[0], a: (a + off) * esc1, b: (b + off) * esc1 });
        }
      });
    });
    return out;
  }
  // bloques «Día N» (día 1 = primeras 24 h; con el eje de reloj, día 1 = el día natural en que empezó la perfusión)
  function bloquesDia(x0, x1) {
    var g = G(); if (!g.dias || g.eje === "hora") return [];
    var u = g.eje === "dia" ? 1 : 24; if ((x1 - x0) / u < 1.2) return [];
    var out = []; for (var n = Math.floor(x0 / u); n * u < x1; n++) { var a = Math.max(x0, n * u), b = Math.min(x1, (n + 1) * u); if ((b - a) / u >= 0.45) out.push({ n: n + 1, a: a, b: b }); }
    return out;
  }

  // ============================================================== 7. panel SVG (mismo lenguaje visual que los gráficos de Inicio)
  function nice(x) { var p = Math.pow(10, Math.floor(Math.log10(x))), e = x / p; return (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1) * p; }
  function letra(i) { var l = G().letras, A = String.fromCharCode(65 + (i % 26)); return l === "A" ? A : l === "a" ? A.toLowerCase() : l === "(A)" ? "(" + A + ")" : l === "(a)" ? "(" + A.toLowerCase() + ")" : ""; }
  function tituloPanel(d) { var g = G(), m = C.MUESTRAS[g.muestra]; return tr(d.vd.nombre) + (RAMAS[g.muestra] || g.muestra === "REC" ? " · " + tr(m.corto) : ""); }
  function tituloY(d) { var u = trU(d.unidad); return tr(d.vd.nombre) + (u ? " (" + u + ")" : ""); }
  function tituloX() { var g = G(), mx = g.eje; return mx === "nominal" ? tr("Tiempo nominal del protocolo (h)") : mx === "dia" ? tr("Día de perfusión (días)") : mx === "hora" ? tr("Hora del día (h)") : mx === "reloj" || g.etiq_x === "reloj" ? tr("Hora de perfusión (reloj)") : tr("Tiempo de perfusión (h)"); }
  function f1(x) { return (Math.round(x * 100) / 100).toString(); }
  function panelSVG(d, idx, geo, ctx) {
    var g = G(), f = geo.fs, W = geo.Wp, Hh = geo.Hp, pal = ctx.pal, id = ctx.pre + idx, lw = lpt(), pr = ppt(), usado = ctx.usado, x0 = ctx.xr[0], x1 = ctx.xr[1];
    var tit = g.titulos ? tituloPanel(d) : "", etq = letra(idx), dias = bloquesDia(x0, x1), T = f * 0.5 + (tit || etq ? f * 1.45 : 0) + (dias.length ? f * 1.3 : 0) + f * 0.2;
    // rango Y con todo lo que se dibuja
    var ys = [], ind = g.modo === "individual" || g.modo === "ind_media", err = g.modo === "media_eem" ? "eem" : "de";
    if (ind) d.series.forEach(function (s) { s.pts.forEach(function (p) { if (p.x >= x0 - 1e-9 && p.x <= x1 + 1e-9) ys.push(p.y); }); });
    if (d.ag) d.ag.forEach(function (a) { if (a.x < x0 - 1e-9 || a.x > x1 + 1e-9) return; ys.push(a.m); if (a[err] !== null) { ys.push(a.m - a[err]); ys.push(a.m + a[err]); } });
    if (d.hist) d.hist.forEach(function (b) { ys.push(b.inf); ys.push(b.sup); });
    if (d.ob) { if (d.ob[0] !== null) ys.push(d.ob[0]); if (d.ob[1] !== null) ys.push(d.ob[1]); }
    var vacio = !d.series.length;
    if (!ys.length) ys = [0, 1];
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys); if (g.y0 && lo > 0) lo = 0; if (g.y0 && hi < 0) hi = 0;
    if (hi === lo) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; }
    var paso = nice((hi - lo) / 4.5), plo = Math.floor(lo / paso + 1e-9) * paso, phi = Math.ceil(hi / paso - 1e-9) * paso; if (phi <= plo) phi = plo + paso;
    var ty = []; for (var t = plo; t <= phi + paso * 1e-6; t += paso) ty.push(+t.toFixed(10)); var dec = decDe(paso), etY = ty.map(function (v) { return fmtN(v, dec); });
    var fe = f * 0.9, L = Math.max(ctx.L || 0, Math.max.apply(null, etY.map(function (s) { return tw(s, fe); })) + f * 0.4 + f * 0.35 + f * 1.45), R = modoX(ctx.ref).reloj ? f * 1.7 : f * 1.1, B = f * 0.4 + f * 1.15 + f * 1.4;
    var pw = Math.max(10, W - L - R), ph = Math.max(10, Hh - T - B);
    var X = function (x) { return L + (x - x0) / (x1 - x0) * pw; }, Y = function (v) { return T + ph - (v - plo) / (phi - plo) * ph; };
    var o = "", defs = "", clip = id + "-c", clipD = id + "-d", mx = modoX(ctx.ref), tx = ticksX(x0, x1, pw, f, mx);
    defs += '<clipPath id="' + clip + '"><rect x="' + f1(L) + '" y="' + f1(T) + '" width="' + f1(pw) + '" height="' + f1(ph) + '"/></clipPath>';
    defs += '<clipPath id="' + clipD + '"><rect x="' + f1(L - pr - 1) + '" y="' + f1(T - pr - 1) + '" width="' + f1(pw + 2 * pr + 2) + '" height="' + f1(ph + 2 * pr + 2) + '"/></clipPath>';
    // superposiciones del protocolo (debajo de todo)
    var sup = "";
    ctx.franjas.forEach(function (q, j) {
      var a = X(q.a), b = X(q.b), w = Math.max(b - a, q.tipo === "gluco" ? Math.max(0.9, lw * 0.8) : 0.5);
      if (q.tipo === "noche") { var gid = id + "-n" + j; defs += '<linearGradient id="' + gid + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + COL.noche + '" stop-opacity=".42"/><stop offset="1" stop-color="' + COL.noche + '" stop-opacity=".05"/></linearGradient>'; sup += '<rect class="g7-sup g7-noche" data-tipo="noche" x="' + f1(a) + '" y="' + f1(T) + '" width="' + f1(w) + '" height="' + f1(ph) + '" fill="url(#' + gid + ')"/>'; }
      else sup += '<rect class="g7-sup g7-' + q.tipo + '" data-tipo="' + q.tipo + '" x="' + f1(a) + '" y="' + f1(T) + '" width="' + f1(w) + '" height="' + f1(ph) + '" fill="' + COL[q.tipo] + '" fill-opacity="' + (q.tipo === "gluco" ? ".6" : ".36") + '"/>';
      usado[q.tipo] = true;
    });
    if (sup) o += '<g clip-path="url(#' + clip + ')">' + sup + "</g>";
    // rejilla
    if (g.rejilla_t !== "ninguna") { ty.forEach(function (v) { o += '<line class="g7-rej" x1="' + f1(L) + '" x2="' + f1(L + pw) + '" y1="' + f1(Y(v)) + '" y2="' + f1(Y(v)) + '" stroke="' + pal.rejilla + '" stroke-width="' + f1(Math.max(0.3, lw * 0.4)) + '"/>'; });
      if (g.rejilla_t === "completa") tx.forEach(function (q) { o += '<line class="g7-rej" x1="' + f1(X(q.t)) + '" x2="' + f1(X(q.t)) + '" y1="' + f1(T) + '" y2="' + f1(T + ph) + '" stroke="' + pal.rejilla + '" stroke-width="' + f1(Math.max(0.3, lw * 0.4)) + '"/>'; }); }
    // banda de objetivo
    if (d.ob && !vacio) { var ya = Y(Math.min(phi, d.ob[1] === null ? phi : d.ob[1])), yb = Y(Math.max(plo, d.ob[0] === null ? plo : d.ob[0]));
      if (yb > ya) { o += '<rect class="g7-obj" data-v0="' + (d.ob[0] === null ? "" : d.ob[0]) + '" data-v1="' + (d.ob[1] === null ? "" : d.ob[1]) + '" x="' + f1(L) + '" width="' + f1(pw) + '" y="' + f1(ya) + '" height="' + f1(yb - ya) + '" fill="' + pal.obj + '"><title>' + esc(tr("Rango objetivo") + ": " + fmtN(d.ob[0], 3) + "–" + fmtN(d.ob[1], 3) + " " + trU(d.unidad)) + "</title></rect>"; usado.obj = true; } }
    var dat = "";
    if (d.hist && !vacio) { dat += '<path class="g7-hist" d="M' + d.hist.map(function (b) { return f1(X(b.x)) + "," + f1(Y(b.sup)); }).join("L") + "L" + d.hist.slice().reverse().map(function (b) { return f1(X(b.x)) + "," + f1(Y(b.inf)); }).join("L") + 'Z" fill="' + COL.hist + '"/>'; usado.hist = true; }
    // perfusiones individuales
    if (ind) d.series.forEach(function (s) {
      var tenue = g.modo === "ind_media", pts = s.pts.filter(function (p) { return p.x >= x0 - 1e-9 && p.x <= x1 + 1e-9; });
      if (g.lineas && pts.length > 1) dat += '<polyline class="g7-ind" data-exp="' + esc(s.id) + '" fill="none" stroke="' + esc(s.color) + '" stroke-width="' + f1(tenue ? lw * 0.7 : lw) + '" stroke-linejoin="round" stroke-linecap="round"' + (tenue ? ' stroke-opacity=".55"' : "") + ' points="' + pts.map(function (p) { return f1(X(p.x)) + "," + f1(Y(p.y)); }).join(" ") + '"/>';
      if ((g.puntos || pts.length === 1) && pr > 0) pts.forEach(function (p) { dat += '<circle class="g7-pt" fill="' + esc(s.color) + '"' + (tenue ? ' fill-opacity=".6"' : "") + ' cx="' + f1(X(p.x)) + '" cy="' + f1(Y(p.y)) + '" r="' + f1(tenue ? pr * 0.75 : pr) + '">' + (ctx.exportar ? "" : "<title>" + esc(s.id + " · " + (p.punto || "") + " · " + fmtN(p.y, 3) + " " + d.unidad) + "</title>") + "</circle>"; });
      usado.exps[s.id] = s.color;
    });
    // media con banda de dispersión (DE o EEM)
    if (d.ag && d.ag.length) {
      var cm = esc(G().color_media || "#1d3a5a"), ag = d.ag.filter(function (a) { return a.x >= x0 - 1e-9 && a.x <= x1 + 1e-9; }), bs = ag.filter(function (a) { return a[err] !== null; });
      if (bs.length > 1) { dat += '<path class="g7-banda" fill="' + cm + '" fill-opacity=".22" stroke="none" d="M' + bs.map(function (a) { return f1(X(a.x)) + "," + f1(Y(a.m + a[err])); }).join("L") + "L" + bs.slice().reverse().map(function (a) { return f1(X(a.x)) + "," + f1(Y(a.m - a[err])); }).join("L") + 'Z"/>';
        [1, -1].forEach(function (sg) { dat += '<polyline class="g7-borde" fill="none" stroke="' + cm + '" stroke-opacity=".45" stroke-width="' + f1(Math.max(0.3, lw * 0.45)) + '" points="' + bs.map(function (a) { return f1(X(a.x)) + "," + f1(Y(a.m + sg * a[err])); }).join(" ") + '"/>'; }); }
      else if (bs.length === 1) { var a1 = bs[0]; dat += '<line class="g7-borde" stroke="' + cm + '" stroke-width="' + f1(lw * 0.8) + '" x1="' + f1(X(a1.x)) + '" x2="' + f1(X(a1.x)) + '" y1="' + f1(Y(a1.m - a1[err])) + '" y2="' + f1(Y(a1.m + a1[err])) + '"/>'; }
      if (ag.length > 1) dat += '<polyline class="g7-media" fill="none" stroke="' + cm + '" stroke-width="' + f1(lw * 1.3) + '" stroke-linejoin="round" stroke-linecap="round" points="' + ag.map(function (a) { return f1(X(a.x)) + "," + f1(Y(a.m)); }).join(" ") + '"/>';
      if ((g.puntos || ag.length === 1) && pr > 0) ag.forEach(function (a) { dat += '<circle class="g7-pm" fill="' + cm + '" cx="' + f1(X(a.x)) + '" cy="' + f1(Y(a.m)) + '" r="' + f1(pr * 0.85) + '">' + (ctx.exportar ? "" : "<title>" + esc(tr("Media") + " " + fmtN(a.m, 3) + (a[err] !== null ? " ± " + fmtN(a[err], 3) : "") + " · n = " + a.n) + "</title>") + "</circle>"; });
      usado.media = Math.max(usado.media || 0, d.n); usado.mediaMin = Math.min(usado.mediaMin === undefined ? 1e9 : usado.mediaMin, d.n);
    }
    if (dat) o += '<g clip-path="url(#' + clipD + ')">' + dat + "</g>";
    if (vacio) o += '<text class="g7-vacio" x="' + f1(L + pw / 2) + '" y="' + f1(T + ph / 2) + '" text-anchor="middle" font-size="' + f1(f) + '" fill="' + pal.tick + '">' + esc(tr("Sin datos")) + "</text>";
    // ejes con marcas hacia fuera
    var ew = f1(Math.max(0.5, lw * 0.65)), tk = f * 0.4;
    o += '<line class="g7-eje" x1="' + f1(L) + '" x2="' + f1(L) + '" y1="' + f1(T) + '" y2="' + f1(T + ph) + '" stroke="' + pal.eje + '" stroke-width="' + ew + '" stroke-linecap="square"/>';
    o += '<line class="g7-eje" x1="' + f1(L) + '" x2="' + f1(L + pw) + '" y1="' + f1(T + ph) + '" y2="' + f1(T + ph) + '" stroke="' + pal.eje + '" stroke-width="' + ew + '" stroke-linecap="square"/>';
    ty.forEach(function (v, i) { var y = f1(Y(v)); o += '<line class="g7-tk" x1="' + f1(L - tk) + '" x2="' + f1(L) + '" y1="' + y + '" y2="' + y + '" stroke="' + pal.eje + '" stroke-width="' + ew + '"/><text class="g7-ty" data-v="' + v + '" x="' + f1(L - tk - f * 0.3) + '" y="' + f1(Y(v) + fe * 0.35) + '" text-anchor="end" font-size="' + f1(fe) + '" fill="' + pal.tick + '">' + esc(etY[i]) + "</text>"; });
    tx.forEach(function (q) { var x = f1(X(q.t)); o += '<line class="g7-tk" x1="' + x + '" x2="' + x + '" y1="' + f1(T + ph) + '" y2="' + f1(T + ph + tk) + '" stroke="' + pal.eje + '" stroke-width="' + ew + '"/><text class="g7-tx" data-t="' + q.t + '" x="' + x + '" y="' + f1(T + ph + tk + fe * 1.05) + '" text-anchor="middle" font-size="' + f1(fe) + '" fill="' + pal.tick + '">' + esc(q.et) + "</text>"; });
    var ytit = tituloY(d), fy = Math.min(f, ph * 0.98 / Math.max(1, tw(ytit, 1)));
    o += '<text class="g7-tit-y" transform="translate(' + f1(f * 1.0) + "," + f1(T + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="' + f1(fy) + '" fill="' + pal.texto + '">' + esc(ytit) + "</text>";
    o += '<text class="g7-tit-x" x="' + f1(L + pw / 2) + '" y="' + f1(Hh - f * 0.35) + '" text-anchor="middle" font-size="' + f1(f) + '" fill="' + pal.texto + '">' + esc(tituloX()) + "</text>";
    dias.forEach(function (b) { o += '<text class="g7-dia" x="' + f1(X((b.a + b.b) / 2)) + '" y="' + f1(T - f * 0.35) + '" text-anchor="middle" font-size="' + f1(fe) + '" fill="' + pal.texto + '">' + esc(tr("Día") + " " + b.n) + "</text>"; });
    var yt = f * 0.5 + f * 1.05;
    if (etq) o += '<text class="g7-letra" x="0" y="' + f1(yt) + '" font-size="' + f1(f * 1.35) + '" font-weight="700" fill="' + pal.texto + '">' + esc(etq) + "</text>";
    if (tit) o += '<text class="g7-tit" x="' + f1(etq ? tw(etq, f * 1.35) + f * 0.7 : L) + '" y="' + f1(yt) + '" font-size="' + f1(f * 1.05) + '" font-weight="500" fill="' + pal.texto + '">' + esc(tit) + "</text>";
    return { defs: defs, cuerpo: o, W: W, H: Hh, escala: { lo: plo, hi: phi, T: T, ph: ph, L: L, pw: pw } };
  }

  // ============================================================== 8. leyenda común
  function leyendaItems(usado) {
    var g = G(), l = [], err = g.modo === "media_eem" ? "Media ± EEM" : "Media ± DE";
    Object.keys(usado.exps).forEach(function (id) { l.push({ tipo: "exp", color: usado.exps[id], texto: id, tenue: g.modo === "ind_media" }); });
    if (usado.media) { var n = usado.mediaMin !== undefined && usado.mediaMin !== usado.media ? usado.mediaMin + "–" + usado.media : String(usado.media); l.push({ tipo: "media", color: g.color_media || "#1d3a5a", texto: tr(g.modo === "ind_media" ? "Media ± DE" : err) + " (n = " + n + ")" }); }
    if (usado.obj) l.push({ tipo: "obj", texto: tr("Rango objetivo") });
    if (usado.hist) l.push({ tipo: "hist", texto: tr("Histórico ± 2 DE") });
    if (usado.prandial) l.push({ tipo: "prandial", texto: tr("Prandial") });
    if (usado.gluco) l.push({ tipo: "gluco", texto: tr("Glucocorticoides") });
    if (usado.noche) l.push({ tipo: "noche", texto: tr("Melatonina (noche)") });
    return l;
  }
  // muestra de la leyenda (SVG de 2,4 × 1 em) para la pantalla y para la figura exportada
  function muestraSVG(it, x, y, w, h, pal, pre) {
    var c = esc(it.color || ""), lw = lpt(), m = y + h / 2;
    if (it.tipo === "exp") return '<line x1="' + f1(x) + '" x2="' + f1(x + w) + '" y1="' + f1(m) + '" y2="' + f1(m) + '" stroke="' + c + '" stroke-width="' + f1(lw) + '"' + (it.tenue ? ' stroke-opacity=".6"' : "") + '/><circle cx="' + f1(x + w / 2) + '" cy="' + f1(m) + '" r="' + f1(Math.max(1, ppt())) + '" fill="' + c + '"/>';
    if (it.tipo === "media") return '<rect x="' + f1(x) + '" y="' + f1(y + h * 0.18) + '" width="' + f1(w) + '" height="' + f1(h * 0.64) + '" fill="' + c + '" fill-opacity=".22"/><line x1="' + f1(x) + '" x2="' + f1(x + w) + '" y1="' + f1(m) + '" y2="' + f1(m) + '" stroke="' + c + '" stroke-width="' + f1(lw * 1.3) + '"/>';
    if (it.tipo === "obj") return '<rect x="' + f1(x) + '" y="' + f1(y + h * 0.1) + '" width="' + f1(w) + '" height="' + f1(h * 0.8) + '" fill="' + pal.obj.replace(/,\.1\d\)/, ",.22)") + '"/>';
    if (it.tipo === "hist") return '<rect x="' + f1(x) + '" y="' + f1(y + h * 0.1) + '" width="' + f1(w) + '" height="' + f1(h * 0.8) + '" fill="' + COL.hist + '"/>';
    if (it.tipo === "noche") return '<linearGradient id="' + pre + 'ln" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="' + COL.noche + '" stop-opacity=".5"/><stop offset="1" stop-color="' + COL.noche + '" stop-opacity=".1"/></linearGradient><rect x="' + f1(x) + '" y="' + f1(y + h * 0.1) + '" width="' + f1(w) + '" height="' + f1(h * 0.8) + '" fill="url(#' + pre + 'ln)"/>';
    return '<rect x="' + f1(x) + '" y="' + f1(y + h * 0.1) + '" width="' + f1(w) + '" height="' + f1(h * 0.8) + '" fill="' + COL[it.tipo] + '" fill-opacity="' + (it.tipo === "gluco" ? ".85" : ".45") + '"/>';
  }
  function leyendaHTML(items) {
    if (!items.length || G().leyenda === "oculta") return "";
    var pal = paleta(false);
    return '<div class="g7-leyenda" id="g7Leyenda" role="list" aria-label="Leyenda común de los gráficos">' + items.map(function (it, i) { return '<span class="g7-li" role="listitem" data-tipo="' + it.tipo + '"><svg viewBox="0 0 24 10" width="24" height="10" aria-hidden="true">' + muestraSVG(it, 0, 0, 24, 10, pal, "g7l" + i) + "</svg>" + esc(it.texto) + "</span>"; }).join("") + "</div>";
  }
  function leyendaSVG(items, ancho, pal, vertical, fs) {
    var f = fs || fpt(), h = f, w = f * 2.2, sep = f * 1.2, filas = [[]], x = 0, out = "", alto;
    if (vertical) { items.forEach(function (it, i) { var y = i * f * 1.5; out += muestraSVG(it, 0, y, w, h, pal, "lgx" + i) + '<text x="' + f1(w + f * 0.5) + '" y="' + f1(y + h * 0.82) + '" font-size="' + f1(f) + '" fill="' + pal.texto + '">' + esc(it.texto) + "</text>"; }); return { svg: out, alto: items.length * f * 1.5, ancho: ancho }; }
    items.forEach(function (it) { var a = w + f * 0.5 + tw(it.texto, f); if (x && x + a > ancho) { filas.push([]); x = 0; } filas[filas.length - 1].push({ it: it, a: a }); x += a + sep; });
    filas.forEach(function (fl, j) { var tot = fl.reduce(function (s, q) { return s + q.a; }, 0) + sep * (fl.length - 1), x0 = (ancho - tot) / 2, y = j * f * 1.6;
      fl.forEach(function (q, k) { out += muestraSVG(q.it, x0, y, w, h, pal, "lg" + j + "-" + k) + '<text x="' + f1(x0 + w + f * 0.5) + '" y="' + f1(y + h * 0.82) + '" font-size="' + f1(f) + '" fill="' + pal.texto + '">' + esc(q.it.texto) + "</text>"; x0 += q.a + sep; }); });
    alto = filas.length * f * 1.6; return { svg: out, alto: alto, ancho: ancho };
  }

  // ============================================================== 9. figura completa (pantalla y exportación)
  function familia() { var f = G().familia; return f === "Helvetica" ? "Helvetica, Arial, sans-serif" : f === "Roboto" ? "Roboto, Arial, sans-serif" : f === "Times New Roman" ? "'Times New Roman', Times, serif" : "Arial, Helvetica, sans-serif"; }
  function construir(exportar) {
    var g = G(), ref = referencia(), todos = g.vars.map(datos), xr = rangoX(todos), usado = { exps: {} };
    var ctx = { pal: paleta(exportar), xr: xr, ref: ref, franjas: franjasEje(xr[0], xr[1], ref), usado: usado, exportar: exportar, pre: exportar ? "gx" : "g7p" };
    var geo = geometria(todos.length, null), paneles = todos.map(function (d, i) { return panelSVG(d, i, geo, ctx); }), items = leyendaItems(usado);
    if (g.leyenda === "derecha") geo = geometria(todos.length, items);
    // segunda pasada: el mismo margen izquierdo en todos los paneles (ejes Y alineados, como en Prism)
    ctx.L = Math.max.apply(null, paneles.map(function (p) { return p.escala.L; }).concat([0])); usado = ctx.usado = { exps: {} };
    paneles = todos.map(function (d, i) { return panelSVG(d, i, geo, ctx); }); items = leyendaItems(usado);
    return { g: g, ref: ref, todos: todos, geo: geo, paneles: paneles, items: items, xr: xr, ctx: ctx };
  }
  function figuraHTML() {
    var g = G(); if (!g.vars.length) return '<div class="vacio">Elige al menos una variable.</div>';
    if (!g.exps.length) return '<div class="vacio">Elige al menos una perfusión.</div>';
    var F = construir(false), geo = F.geo, pub = g.estilo === "publicacion", avisos = (F.ref && F.ref.avisos) || [];
    var supOn = g.sup_prandial || g.sup_gluco || g.sup_noche;
    if (supOn && !F.ref) avisos.push("Sin superposiciones: ninguna de las perfusiones elegidas tiene inicio registrado y protocolo circadiano.");
    else if (supOn && F.ref) { var fr = F.ref.franjas, falta = []; if (g.sup_prandial && !fr.prandial.length) falta.push("prandial (sin «NP (glucosa + AA)» con ritmo variable)"); if (g.sup_gluco && !fr.gluco.length) falta.push("glucocorticoides (sin bolos de «Hidrocortisona»)"); if (g.sup_noche && !fr.noche.length) falta.push("noche (sin «Melatonina»)"); if (falta.length) avisos.push("El horario de " + F.ref.id + " no permite dibujar: " + falta.join(" · ") + "."); }
    var cel = F.paneles.map(function (p, i) {
      return '<figure class="tarjeta g7-panel' + (pub ? " pub" : "") + '" data-var="' + esc(g.vars[i]) + '"><svg class="g7-svg" viewBox="0 0 ' + f1(p.W) + " " + f1(p.H) + '" role="img" aria-label="' + esc("Gráfico de " + F.todos[i].vd.nombre) + '" font-family="' + esc(familia()) + '" data-lo="' + p.escala.lo + '" data-hi="' + p.escala.hi + '" data-t="' + f1(p.escala.T) + '" data-ph="' + f1(p.escala.ph) + '"><defs>' + p.defs + "</defs>" + p.cuerpo + "</svg></figure>";
    });
    if (geo.fija) for (var k = cel.length; k < geo.celdas; k++) cel.push('<div class="g7-hueco" aria-hidden="true"></div>');
    var nota = F.ref && (g.sup_prandial || g.sup_gluco || g.sup_noche) ? '<p class="muy-tenue g7-nota">Superposiciones según el horario circadiano de ' + esc(F.ref.id) + (F.ref.c !== null ? " (inicio de la perfusión a las " + hhmm(F.ref.c) + ")" : "") + ": prandial = nutrición parenteral a ritmo máximo · glucocorticoides = bolos de hidrocortisona · noche = infusión de melatonina.</p>" : "";
    return (g.titulo ? '<h2 class="g7-titulo">' + esc(g.titulo) + "</h2>" : "") + leyendaHTML(F.items) +
      avisos.map(function (a) { return '<div class="aviso info g7-aviso">' + ico("info") + "<div>" + esc(a) + "</div></div>"; }).join("") +
      '<div id="graficos" class="g7-rejilla g7-c' + geo.c + '" data-zoom data-cols="' + geo.c + '">' + cel.join("") + "</div>" + nota;
  }
  // figura compuesta (SVG) en milímetros; los paneles son los mismos de la pantalla
  function figuraSVG(px) {
    var F = construir(true), geo = F.geo, g = F.g, pal = F.ctx.pal, f = geo.fs, n = F.paneles.length, filas = Math.max(1, geo.fija ? geo.f : Math.ceil(n / geo.c));
    var Wt = geo.Wt, top = g.titulo ? f * 2.2 : 0, ley = g.leyenda === "oculta" || !F.items.length ? null : leyendaSVG(F.items, g.leyenda === "derecha" ? geo.Lw : Wt, pal, g.leyenda === "derecha", f);
    var Hpaneles = filas * geo.Hp + (filas - 1) * geo.gap, ytop = top + (ley && g.leyenda === "arriba" ? ley.alto + f * 0.8 : 0);
    var Ht = ytop + Hpaneles + (ley && g.leyenda === "abajo" ? f * 1.0 + ley.alto : 0) + f * 0.3; if (ley && g.leyenda === "derecha") Ht = Math.max(Ht, ytop + ley.alto);
    var defs = "", cuerpo = "";
    F.paneles.forEach(function (p, i) { var c = i % geo.c, r = Math.floor(i / geo.c); defs += p.defs; cuerpo += '<g transform="translate(' + f1(c * (geo.Wp + geo.gap)) + "," + f1(ytop + r * (geo.Hp + geo.gap)) + ')">' + p.cuerpo + "</g>"; });
    if (g.titulo) cuerpo += '<text x="' + f1(Wt / 2) + '" y="' + f1(f * 1.4) + '" text-anchor="middle" font-size="' + f1(f * 1.3) + '" font-weight="700" fill="' + pal.texto + '">' + esc(g.titulo) + "</text>";
    if (ley) cuerpo += '<g class="g7-ley" transform="translate(' + f1(g.leyenda === "derecha" ? Wt - geo.Lw + f * 0.6 : 0) + "," + f1(g.leyenda === "abajo" ? ytop + Hpaneles + f * 1.0 : g.leyenda === "arriba" ? top : ytop + f) + ')">' + ley.svg + "</g>";
    var dim = px ? ' width="' + Math.round(px.w) + '" height="' + Math.round(px.h) + '"' : ' width="' + f1(Wt / PT_MM) + 'mm" height="' + f1(Ht / PT_MM) + 'mm"';
    return { svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"' + dim + ' viewBox="0 0 ' + f1(Wt) + " " + f1(Ht) + '" font-family="' + esc(familia()) + '"><defs>' + defs + '</defs><rect width="100%" height="100%" fill="#fff"/>' + cuerpo + "</svg>", W: Wt, H: Ht };
  }
  function dimPNG(Wt, Ht) { var ppp = numEn(G().ppp, 72, 1200, 300), w = Wt / 72 * ppp, h = Ht / 72 * ppp, k = 1, max = 16e6; if (w * h > max) { k = Math.sqrt(max / (w * h)); w *= k; h *= k; } return { w: Math.round(w), h: Math.round(h), ppp: Math.round(ppp * k), reducida: k < 1 }; }
  // PNG con la resolución anotada (fragmento pHYs) para que Word, PowerPoint o Prism lo abran al tamaño correcto
  var CRC = null;
  function crc32(b) { if (!CRC) { CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } var x = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) x = CRC[(x ^ b[i]) & 0xFF] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; }
  function conPPP(buf, ppp) {
    var u = new Uint8Array(buf), ppm = Math.round(ppp / 0.0254), ch = new Uint8Array(21), dv = new DataView(ch.buffer);
    dv.setUint32(0, 9); ch.set([112, 72, 89, 115], 4); dv.setUint32(8, ppm); dv.setUint32(12, ppm); ch[16] = 1; dv.setUint32(17, crc32(ch.subarray(4, 17)));
    var fin = 8 + 25, out = new Uint8Array(u.length + 21); out.set(u.subarray(0, fin), 0); out.set(ch, fin); out.set(u.subarray(fin), fin + 21); return out;
  }
  H.g7 = { G: G, franjas: C.franjasCircadianas, figuraSVG: figuraSVG, dimPNG: dimPNG, bandaObjetivo: bandaObjetivo, datos: datos, referencia: referencia, conPPP: conPPP, crc32: crc32, EN: EN, tr: tr, construir: construir };

  // ============================================================== 10. pantalla
  function enGraficos() { return H.ruta().partes[0] === "graficos" && !!document.getElementById("g7Fig"); }
  function chk(k, et, ayuda) { var g = G(); return '<label class="check"' + (ayuda ? ' title="' + esc(ayuda) + '"' : "") + '><input type="checkbox" data-cambio="gOpc" data-k="' + k + '"' + (g[k] ? " checked" : "") + "> " + et + "</label>"; }
  function sel(k, et, ops) { var g = G(); return '<div class="campo"><label class="et" for="g_' + k + '">' + et + '</label><select id="g_' + k + '" data-cambio="gOpc" data-k="' + k + '">' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(g[k]) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>"; }
  function num(k, et, u) { var g = G(); return '<div class="campo"><label class="et" for="g_' + k + '">' + et + '</label><div class="unidad-in"><input id="g_' + k + '" type="text" inputmode="decimal" data-num="1" value="' + esc(g[k]) + '" data-cambio="gOpc" data-k="' + k + '"><span>' + esc(u || "") + "</span></div></div>"; }
  function varsHTML() {
    var g = G(), vs = GI.varsDe(g.muestra);
    return sel("muestra", "Tipo de muestra", GI.muestras) + '<div class="lista-sel" style="max-height:220px">' + vs.map(function (v) { return '<label><input type="checkbox" data-cambio="gVar" data-id="' + esc(v.id) + '"' + (g.vars.indexOf(v.id) !== -1 ? " checked" : "") + "> " + esc(v.nombre) + ' <span class="muy-tenue">' + esc(H.unidadVisible(v.id, v.unidad)) + "</span></label>"; }).join("") + "</div>";
  }
  function ordenHTML() {
    var g = G(); if (g.vars.length < 2) return "";
    return '<div class="campo"><span class="et">Orden de los paneles</span><ol class="g7-orden">' + g.vars.map(function (v, i) { return "<li><b>" + esc(letra(i) || String(i + 1)) + "</b> <span>" + esc(defVar(v).nombre) + '</span><button class="bt mini" data-act="g7Orden" data-i="' + i + '" data-d="-1"' + (i ? "" : " disabled") + ' aria-label="Subir ' + esc(defVar(v).nombre) + '">↑</button><button class="bt mini" data-act="g7Orden" data-i="' + i + '" data-d="1"' + (i < g.vars.length - 1 ? "" : " disabled") + ' aria-label="Bajar ' + esc(defVar(v).nombre) + '">↓</button></li>'; }).join("") + "</ol></div>";
  }
  function panelHTML() {
    var g = G(), exps = H.listaExp();
    return '<h3 style="margin-bottom:8px">Perfusiones</h3><div class="fila-flex" style="margin-bottom:6px"><button class="bt mini" data-act="gTodas">Todas</button><button class="bt mini" data-act="gNinguna">Ninguna</button><button class="bt mini" data-act="gPaleta" title="Reasignar la paleta apta para daltonismo">Paleta</button></div>' +
      '<div class="lista-sel">' + (exps.length ? exps.map(function (e, i) { var on = g.exps.indexOf(e.ID) !== -1; return '<label><input type="checkbox" data-cambio="gExp" data-id="' + esc(e.ID) + '"' + (on ? " checked" : "") + "> <span>" + esc(e.ID) + '</span> <span class="muy-tenue">' + esc(e.Estado || "") + '</span><input type="color" aria-label="Color de ' + esc(e.ID) + '" value="' + esc(GI.colorDe(e.ID, i)) + '" data-cambio="gColor" data-id="' + esc(e.ID) + '"></label>'; }).join("") : '<p class="tenue">Sin experimentos.</p>') + "</div>" +
      '<h3 style="margin:14px 0 8px">Variables</h3><div id="g7Vars">' + varsHTML() + "</div>" +
      '<h3 style="margin:14px 0 8px">Presentación</h3>' + sel("eje", "Eje X", EJES).replace('<label class="et" for="g_eje">Eje X</label>', '<label class="et et-i" for="g_eje">Eje X</label>' + H.botonInfo(INFO_EJE)) + sel("modo", "Modo", MODOS) +
      '<div class="rejilla estrecha">' + num("xmin", "X desde", "") + num("xmax", "X hasta", "") + "</div>" +
      '<div class="g7-checks">' + chk("puntos", "Puntos") + chk("lineas", "Líneas") + chk("objetivo", "Banda de objetivo") + chk("historica", "Banda histórica (media ± 2 DE del resto)") + chk("y0", "Eje Y desde 0") + "</div>" +
      '<h3 style="margin:14px 0 8px">Protocolo circadiano</h3><div class="g7-checks">' + chk("sup_prandial", '<span class="g7-sw prandial"></span>Prandial (nutrición parenteral)') + chk("sup_gluco", '<span class="g7-sw gluco"></span>Glucocorticoides (bolos de hidrocortisona)') +
      chk("sup_noche", '<span class="g7-sw noche"></span>Periodo nocturno (melatonina)') + chk("dias", "Etiquetas «Día N»") + "</div>" +
      sel("etiq_x", "Marcas del eje X (tiempo real o nominal)", [["horas", "Horas desde el inicio"], ["reloj", "Hora del reloj (10:00, 22:00…)"]]) +
      '<details class="plegable" style="margin-top:10px" open><summary>Maquetación de la figura</summary><div class="dentro">' +
      '<div class="campo"><span class="et">Plantilla</span><div class="fila-flex"><button class="bt mini" data-act="g7Plantilla" data-p="pantalla">Pantalla</button><button class="bt mini" data-act="g7Plantilla" data-p="articulo">Artículo</button><button class="bt mini" data-act="g7Plantilla" data-p="presentacion">Presentación</button></div></div>' +
      sel("disposicion", "Disposición (filas × columnas)", DISPOS) + sel("proporcion", "Proporción de cada panel", PROPS) +
      sel("fig_mm", "Ancho de la figura", ANCHOS.concat(ANCHOS.some(function (a) { return String(a[0]) === String(g.fig_mm); }) ? [] : [[g.fig_mm, g.fig_mm + " mm · personalizado"]])) +
      '<div class="campo"><label class="et" for="g_fig_mm_p">Ancho personalizado</label><div class="unidad-in"><input id="g_fig_mm_p" type="text" inputmode="decimal" data-num="1" value="' + esc(g.fig_mm) + '" data-cambio="gOpc" data-k="fig_mm"><span>mm</span></div></div>' +
      sel("letras", "Etiquetas de panel", [["A", "A, B, C…"], ["a", "a, b, c…"], ["(A)", "(A), (B), (C)…"], ["(a)", "(a), (b), (c)…"], ["", "Sin etiquetas"]]) + chk("titulos", "Título en cada panel (variable y compartimento)") + ordenHTML() +
      '<div class="campo"><label class="et" for="g_titulo">Título de la figura</label><input id="g_titulo" value="' + esc(g.titulo) + '" data-cambio="gOpc" data-k="titulo" placeholder="Sin título" autocomplete="off"></div>' +
      '<div class="fila-info">' + chk("ingles", "Ejes, títulos y leyenda en inglés (traducción automática)") + H.botonInfo("Traduce los nombres de las variables, compartimentos, ejes y leyenda (p. ej. «Hour of perfusion (h)», «Day 1», «Mean ± SEM»); las unidades se mantienen. El título que escribas no se traduce.") + "</div>" +
      "</div></details>" +
      '<details class="plegable" style="margin-top:10px"><summary>Estilo</summary><div class="dentro">' +
      sel("estilo", "Estilo", [["pantalla", "Pantalla (sigue el tema)"], ["publicacion", "Publicación (fondo blanco, ejes negros)"]]) + sel("familia", "Fuente", [["Arial", "Arial"], ["Helvetica", "Helvetica"], ["Roboto", "Roboto"], ["Times New Roman", "Times New Roman"]]) +
      '<div class="rejilla estrecha">' + num("fuente_pt", g.disposicion === "auto" && g.fuente_auto !== false ? "Tamaño de letra (máximo)" : "Tamaño de letra", "pt") + num("linea_pt", "Grosor de línea", "pt") + num("punto_pt", "Tamaño de punto", "pt") + "</div>" +
      '<div class="fila-info">' + chk("fuente_auto", "Ajustar la letra a la disposición automática") + H.botonInfo("Con la disposición «Automática», la letra se adapta al número de paneles: el tamaño que escribas es el máximo y, con más columnas (paneles más pequeños), se reduce lo justo para que los textos no tapen los datos, sin bajar de 6 pt. Con una disposición fija (2 × 2, 3 columnas…) o con esta casilla desmarcada se usa siempre el tamaño escrito.") + "</div>" +
      (g.disposicion === "auto" && g.fuente_auto !== false && g.vars.length ? '<p class="muy-tenue g7-letra-auto" id="g7LetraAuto">Letra en la figura: ' + esc(H.n(H.g7fuenteAuto(g.vars.length), 1)) + " pt (" + disposicion(g.vars.length).c + (disposicion(g.vars.length).c === 1 ? " columna" : " columnas") + ")</p>" : "") +
      sel("rejilla_t", "Cuadrícula", [["ninguna", "Sin cuadrícula"], ["tenue", "Tenue (solo horizontal)"], ["completa", "Completa"]]) +
      '<div class="campo"><label class="et" for="g_color_media">Color de la media y su banda</label><input id="g_color_media" type="color" value="' + esc(g.color_media || "#1d3a5a") + '" data-cambio="gOpc" data-k="color_media"></div>' +
      sel("leyenda", "Leyenda en la figura exportada", [["abajo", "Abajo"], ["arriba", "Arriba"], ["derecha", "Derecha"], ["oculta", "Oculta"]]) +
      sel("ppp", "Resolución del PNG", [[150, "150 ppp"], [300, "300 ppp"], [600, "600 ppp"]]) + "</div></details>";
  }
  function barraHTML() {
    var g = G();
    return '<div class="fila-flex g7-barra"><button class="bt" data-act="gExport" data-f="svg">' + ico("image") + 'Figura SVG</button><button class="bt" data-act="gExport" data-f="png">' + ico("image") + "Figura PNG (" + esc(String(g.ppp || 300)) + " ppp)</button>" +
      '<button class="bt" data-act="gCSV">' + ico("file-text") + 'Datos (CSV)</button><button class="bt" data-act="gPrism">' + ico("file-spreadsheet") + 'GraphPad Prism (XY)</button><span class="muy-tenue empuja" id="g7Cuenta">' + g.exps.length + " perfusiones · " + g.vars.length + " variables</span></div>";
  }
  function asegurar() {
    var g = G(), falta = g.exps.filter(function (id) { return !S.medCargada[id]; });
    if (falta.length && S.online && H.asegurarMed) H.asegurarMed(falta).then(function (x) { if (x && enGraficos()) refrescar(); }).catch(function () { });
  }
  H.vistas.graficos = function () {
    var g = G(), exps = H.listaExp();
    if (!g.exps.length && !g._ninguna) g.exps = exps.filter(function (e) { return e.Estado === "Finalizado" || e.Estado === "Perfusión"; }).map(function (e) { return e.ID; }).slice(-6);
    g.exps = g.exps.filter(function (id) { return H.exp(id); }); asegurar();
    return '<div class="ancho"><div class="titulo-pag"><h1>Gráficos</h1></div><div class="graf-marco"><aside class="graf-panel tarjeta" id="g7Panel" aria-label="Opciones del gráfico">' + panelHTML() + "</aside>" +
      '<div class="g7-zona" style="min-width:0">' + barraHTML() + '<div id="g7Fig">' + figuraHTML() + "</div></div></div></div>";
  };
  // repintado parcial: solo la figura (y, si hace falta, el panel de opciones), sin mover el desplazamiento
  function refrescar(panel) {
    if (!enGraficos()) { H.repintar(); return; }
    var y = window.scrollY, ap = document.getElementById("g7Panel"), st = ap ? ap.scrollTop : 0;
    if (panel && ap) { var ab = {}; ap.querySelectorAll("details").forEach(function (d, i) { ab[i] = d.open; }); ap.innerHTML = panelHTML(); ap.querySelectorAll("details").forEach(function (d, i) { if (ab[i] !== undefined) d.open = ab[i]; }); ap.scrollTop = st; }
    var fig = document.getElementById("g7Fig"); if (fig) fig.innerHTML = figuraHTML();
    var cu = document.getElementById("g7Cuenta"), g = G(); if (cu) cu.textContent = g.exps.length + " perfusiones · " + g.vars.length + " variables";
    var b = document.querySelector('[data-act=gExport][data-f=png]'); if (b) b.lastChild.textContent = "Figura PNG (" + (g.ppp || 300) + " ppp)";
    if (window.scrollY !== y) window.scrollTo(0, y);
  }
  H.g7.refrescar = refrescar;

  // ============================================================== 11. acciones
  var LIM = { fig_mm: [40, 600], fuente_pt: [4, 32], linea_pt: [0.2, 6], punto_pt: [0, 10], ppp: [72, 1200] };
  H.acc.gOpc = function (el) {
    var g = G(), k = el.getAttribute("data-k"), val = el.type === "checkbox" ? el.checked : el.hasAttribute("data-num") ? (el.value === "" ? "" : C.num(el.value)) : el.value;
    if (LIM[k]) { val = C.num(val); if (val === null) { el.value = g[k]; return; } val = Math.min(LIM[k][1], Math.max(LIM[k][0], val)); }
    g[k] = val; var panel = false;
    if (k === "muestra") { var ids = GI.varsDe(g.muestra).map(function (v) { return v.id; }); g.vars = g.vars.filter(function (v) { return ids.indexOf(v) !== -1; }); if (!g.vars.length) g.vars = [ids[0]]; panel = true; }
    if (k === "fig_mm" || k === "letras" || k === "disposicion" || k === "fuente_auto" || k === "fuente_pt" || k === "proporcion") panel = true;   // v0.7.2: letra automática
    GI.guardar(); refrescar(panel);
  };
  H.acc.gExp = function (el) { var g = G(), id = el.getAttribute("data-id"), i = g.exps.indexOf(id); if (el.checked && i === -1) g.exps.push(id); if (!el.checked && i !== -1) g.exps.splice(i, 1); g._ninguna = !g.exps.length; GI.guardar(); asegurar(); refrescar(); };
  H.acc.gColor = function (el) { G().colores[el.getAttribute("data-id")] = el.value; GI.guardar(); refrescar(); };
  H.acc.gVar = function (el) { var g = G(), id = el.getAttribute("data-id"), i = g.vars.indexOf(id); if (el.checked && i === -1) g.vars.push(id); if (!el.checked && i !== -1) g.vars.splice(i, 1); GI.guardar(); refrescar(true); };
  H.acc.gTodas = function () { var g = G(); g.exps = H.listaExp().map(function (e) { return e.ID; }); g._ninguna = false; GI.guardar(); asegurar(); refrescar(true); };
  H.acc.gNinguna = function () { var g = G(); g.exps = []; g._ninguna = true; GI.guardar(); refrescar(true); };
  H.acc.gPaleta = function () { var g = G(); g.colores = {}; H.listaExp().forEach(function (e, i) { g.colores[e.ID] = C.PALETA[i % C.PALETA.length]; }); GI.guardar(); refrescar(true); };
  H.acc.g7Orden = function (el) { var g = G(), i = +el.getAttribute("data-i"), j = i + (+el.getAttribute("data-d")); if (j < 0 || j >= g.vars.length) return; var t = g.vars[i]; g.vars[i] = g.vars[j]; g.vars[j] = t; GI.guardar(); refrescar(true); };
  var PLANTILLAS = {
    pantalla: { estilo: "pantalla", fig_mm: 180, fuente_pt: 8, linea_pt: 1.2, punto_pt: 2.2, rejilla_t: "tenue", proporcion: "16:9", leyenda: "abajo", letras: "A", titulos: true },
    articulo: { estilo: "publicacion", fig_mm: 180, fuente_pt: 7, linea_pt: 0.8, punto_pt: 1.6, rejilla_t: "ninguna", proporcion: "3:2", leyenda: "abajo", letras: "A", titulos: false, familia: "Arial" },
    presentacion: { estilo: "publicacion", fig_mm: 254, fuente_pt: 14, linea_pt: 2, punto_pt: 3.5, rejilla_t: "tenue", proporcion: "16:9", leyenda: "abajo", letras: "", titulos: true, familia: "Arial" }
  };
  H.acc.g7Plantilla = function (el) { var p = PLANTILLAS[el.getAttribute("data-p")]; if (!p) return; var g = G(); Object.keys(p).forEach(function (k) { g[k] = p[k]; }); GI.guardar(); refrescar(true); H.toast("Plantilla «" + el.textContent + "» aplicada."); };
  function nombre() { var g = G(); return GI.nombreArchivo(g.vars.length === 1 ? g.vars[0] : "figura") + (g.ingles ? "_EN" : ""); }
  H.acc.gExport = function (el) {
    var g = G(), f = el.getAttribute("data-f"); if (!g.vars.length || !g.exps.length) { H.toast("Elige al menos una perfusión y una variable.", "al"); return; }
    var fs = figuraSVG(null);
    if (f === "svg") { H.descargar(nombre() + ".svg", fs.svg, "image/svg+xml"); return; }
    var d = dimPNG(fs.W, fs.H), svg = figuraSVG(d).svg, img = new Image();
    img.onload = function () {
      try {
        var cv = document.createElement("canvas"); cv.width = d.w; cv.height = d.h; var cx = cv.getContext && cv.getContext("2d"); if (!cx) throw new Error("sin lienzo");
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, d.w, d.h); cx.drawImage(img, 0, 0, d.w, d.h);
        cv.toBlob(function (b) {
          if (!b) { H.toast("No se ha podido crear el PNG; descarga el SVG.", "al"); return; }
          var fin = function (blob) { H.descargar(nombre() + ".png", blob); if (d.reducida) H.toast("La figura era demasiado grande para este dispositivo: se ha exportado a " + d.ppp + " ppp."); };
          if (b.arrayBuffer) b.arrayBuffer().then(function (ab) { fin(new Blob([conPPP(ab, d.ppp)], { type: "image/png" })); }).catch(function () { fin(b); }); else fin(b);
        }, "image/png");
      } catch (e) { H.toast("Este navegador no puede crear el PNG; descarga el SVG.", "al"); }
    };
    img.onerror = function () { H.toast("Este navegador no puede crear el PNG; descarga el SVG.", "al"); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };
  function tituloXcsv() { var g = G(); return g.eje === "reloj" ? "Hora de perfusión (h desde las 00:00 del día de inicio)" : g.eje === "nominal" ? "Tiempo nominal del protocolo (h)" : g.eje === "dia" ? "Día de perfusión" : g.eje === "hora" ? "Hora del día (h)" : "Tiempo de perfusión (h)"; }
  H.acc.gCSV = function () {
    var g = G(), filas = [["Experimento", "Muestra", "Variable", "Unidad", "Punto", "X (" + tituloXcsv() + ")", "Valor"]];
    g.vars.forEach(function (v) { var vd = defVar(v); g.exps.forEach(function (id) { serieG(id, v, true).forEach(function (p) { filas.push([id, g.muestra, v, vd.unidad, p.punto, C.r(p.x, 4), p.y]); }); }); });
    H.descargar(GI.nombreArchivo(g.vars.join("-")) + ".csv", H.csv(filas), "text/csv");
  };
  H.acc.gPrism = function () {
    var g = G();
    H.xlsx().then(function (X) {
      var wb = X.utils.book_new();
      g.vars.forEach(function (v) {
        var xs = {}, data = {}; g.exps.forEach(function (id) { serieG(id, v, true).forEach(function (p) { var k = C.r(g.eje === "real" && p.tn !== null && p.tn !== undefined ? p.tn : p.x, 3); xs[k] = 1; (data[id] = data[id] || {})[k] = p.y; }); });
        var X0 = Object.keys(xs).map(Number).sort(function (a, b) { return a - b; }), aoa = [[tituloXcsv()].concat(g.exps)].concat(X0.map(function (x) { return [x].concat(g.exps.map(function (id) { return data[id] && data[id][x] !== undefined ? data[id][x] : null; })); }));
        X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), String(v).slice(0, 31));
      });
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Formato"], ["Tabla XY de GraphPad Prism: columna X = tiempo, una columna Y por perfusión (réplicas)."], ["En Prism: File → Import → elegir esta hoja; o copiar el rango y Paste Special en una tabla XY."], ["Con eje «tiempo real», X es el tiempo nominal del protocolo para alinear las perfusiones."], ["Generado", new Date().toISOString()]]), "Léeme");
      X.writeFile(wb, GI.nombreArchivo("Prism") + ".xlsx");
    });
  };
  // ============================================================== 12. (i) con listas (v0.7.2)
  // Un texto de (i) con saltos de línea se muestra como lista: la primera línea es la entrada y cada línea siguiente un elemento;
  // «Título: explicación» pone el título en negrita. Un texto de una sola línea se muestra exactamente como antes.
  var infoPrev = H.acc.infoTexto;
  H.infoTextoHTML = function (t) {
    var l = String(t || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); if (l.length < 2) return "<p>" + esc(String(t || "")) + "</p>";
    var it = function (x) { var m = /^([^:]{2,70}):\s+([\s\S]+)$/.exec(x); return "<li>" + (m ? "<b>" + esc(m[1]) + "</b>: " + esc(m[2]) : esc(x)) + "</li>"; };
    return "<p>" + esc(l[0]) + '</p><ul class="info-lista">' + l.slice(1).map(it).join("") + "</ul>";
  };
  H.acc.infoTexto = function (el) {
    var t = el.getAttribute("data-t") || ""; if (!/\n/.test(t) && infoPrev) return infoPrev.apply(this, arguments);
    H.modal({ titulo: "Información", cuerpo: H.infoTextoHTML(t), pie: '<button class="bt pri" data-cerrar>Entendido</button>' });
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v07c.js"] = "0.7.2";
