/* HOME · cálculos v0.7 (amplía HOMECalc): muestreo real de la perfusión con tubos y volúmenes, puntos de registro de la HDF,
   recomendaciones combinadas de la HDF (urea, iones, ácido-base, temperatura) y alarmas de presiones, epoprostenol,
   cantidades de material según los días de perfusión, censo mensual de animales y lectura de informes del laboratorio. */
(function (root, factory) {
  var C = typeof module === "object" && module.exports ? require("./calc.js") : root.HOMECalc;
  factory(C);
  if (typeof module === "object" && module.exports) module.exports = C;
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";
  var num = C.num, r = C.r, aFecha = C.aFecha, DEF = C.DEF;
  function dos(n) { return (n < 10 ? "0" : "") + n; }

  // ============================================================== 1. Muestreo (solo durante la perfusión)
  // Tubos: LH heparina de litio pediátrico 0,8 mL · EDTA 3 mL · CIT citrato pediátrico 1 mL · AMA amarillo (suero con gel) 3,5 mL · GAS jeringa 0,7 mL
  DEF.muestreo = {
    version: 7,
    tubos: { LH: { nombre: "Heparina de litio pediátrico", mL: 0.8 }, EDTA: { nombre: "EDTA", mL: 3 }, CIT: { nombre: "Citrato pediátrico (azul)", mL: 1 }, AMA: { nombre: "Suero con gel (amarillo)", mL: 3.5 }, GAS: { nombre: "Jeringa de gasometría", mL: 0.7 } },
    pre: { LH: 1, CIT: 1, AMA: 1, GAS: 1 },                       // pre-perfusión (sus valores son los del punto 0 h)
    dia1_h: [0, 0.5, 2, 4, 6, 8, 12, 16, 20, 24],
    completa: { LH: 1, EDTA: 1, CIT: 1, GAS: 3 },                  // + 1 amarillo a las 24 h y cada 24 h
    diarias: ["10:00", "20:00"], amarillo_hora: "10:00",           // a partir de las 24 h, cada 12 h (manda la hora del día)
    extra_horas: ["14:00", "16:00"], extra: { EDTA: 1, GAS: 3 },   // EDTA + 3 gasometrías (arterial, portal y cava) para el metabolismo posprandial
    bilis_en_puntos: true, aceite_mL_bilis: 2.5, microtubos_EDTA: 3, microtubos_bilis: 2, microtubos_filtrado: 2,
    biopsia_cada_h: 24, hdf_cada_h_dia1: 1, inmuno: "pre+24h",      // v0.7.1: inmunología en la pre-perfusión y cada 24 h (del tubo amarillo de las 24 h y de las 10:00)
    inmuno_cada_h: 24,                                             // 0 = sin inmunología durante la perfusión
    antelacion_min: 10
  };
  function cfgM(m) { var d = DEF.muestreo; if (!m || m.version !== 7) return d; var o = {}; Object.keys(d).forEach(function (k) { o[k] = m[k] !== undefined ? m[k] : d[k]; }); return o; }
  function mlDe(tubos, m) { var s = 0; Object.keys(tubos || {}).forEach(function (k) { s += (num(tubos[k]) || 0) * ((m.tubos[k] || {}).mL || 0); }); return r(s, 2); }
  function sumaTubos(a, b) { var o = {}; [a, b].forEach(function (x) { Object.keys(x || {}).forEach(function (k) { o[k] = (o[k] || 0) + (num(x[k]) || 0); }); }); return o; }
  function etiqueta(h) { return h === 0 ? "0 min" : h < 1 ? Math.round(h * 60) + " min" : r(h, 1) + " h"; }
  // Puntos de muestreo: [{t_h, fecha, etiqueta, dia, tipo: "completa"|"extra", tubos, mL, amarillo, bilis, gas, bq}]
  function puntosMuestreo(inicioISO, dias, m) {
    m = cfgM(m); var t0 = aFecha(inicioISO); if (!t0) return []; dias = num(dias) || 7; var out = [], fin = t0.getTime() + dias * 864e5 + 6e4, lim1 = t0.getTime() + 24.5 * 36e5;
    function pon(t, et, tipo, tubos, amarillo) {
      var tb = amarillo ? sumaTubos(tubos, { AMA: 1 }) : sumaTubos(tubos, {}), h = (t - t0) / 36e5;
      out.push({ t_h: r(h, 2), fecha: new Date(t), etiqueta: et, dia: Math.floor(h / 24 + 1e-9) + 1, tipo: tipo, tubos: tb, mL: mlDe(tb, m), amarillo: !!amarillo, bilis: !!m.bilis_en_puntos, gas: (tb.GAS || 0) > 0, bq: tipo === "completa" });
    }
    m.dia1_h.forEach(function (h) { pon(t0.getTime() + h * 36e5, etiqueta(h), "completa", m.completa, h === 24); });
    for (var d = 1; d <= dias + 1; d++) {
      m.diarias.forEach(function (hh) { var t = C.enHora(t0, hh, d).getTime(); if (t <= lim1 || t > fin) return; pon(t, "D" + (Math.floor((t - t0) / 864e5 + 1e-9) + 1) + " " + hh, "completa", m.completa, hh === m.amarillo_hora); });
      m.extra_horas.forEach(function (hh) { var t = C.enHora(t0, hh, d).getTime(); if (t <= lim1 || t > fin) return; pon(t, "D" + (Math.floor((t - t0) / 864e5 + 1e-9) + 1) + " " + hh, "extra", m.extra, false); });
    }
    var vistos = {}; out = out.sort(function (a, b) { return a.t_h - b.t_h; }).filter(function (p) { var k = Math.round(p.t_h * 60); if (vistos[k]) return false; vistos[k] = 1; return true; });
    // v0.7.1: inmunología cada 24 h en un punto con tubo amarillo (24 h y las 10:00), como mucho uno por cada 24 h (la pre-perfusión es la primera)
    var ci = num(m.inmuno_cada_h), ult = 0; if (ci === null) ci = 24;
    out.forEach(function (p) { p.inmuno = false; if (ci > 0 && p.amarillo && p.t_h - ult >= ci / 2) { p.inmuno = true; ult = p.t_h; } });
    return out;
  }
  // Puntos de inmunología de la perfusión (sin la pre-perfusión): [{t_h, fecha, etiqueta, …}]
  function puntosInmuno(inicioISO, dias, m) { return puntosMuestreo(inicioISO, dias, m).filter(function (p) { return p.inmuno; }); }
  // Resumen del plan de muestreo (para el material): nº de tubos de cada tipo, muestras de bilis y de filtrado, mL
  function planMuestreo(dias, m, inicioISO) {
    m = cfgM(m); var t0 = inicioISO || "2026-01-05T10:00:00", pts = puntosMuestreo(t0, dias, m), tubos = sumaTubos(m.pre, {}), mL = mlDe(m.pre, m), bilis = 0, filt = 0;
    pts.forEach(function (p) { tubos = sumaTubos(tubos, p.tubos); mL += p.mL; if (p.bilis) bilis++; if (p.tipo === "completa") filt++; });
    return { puntos: pts.length, completas: pts.filter(function (p) { return p.tipo === "completa"; }).length, tubos: tubos, mL: r(mL, 1), bilis: bilis, filtrado: filt + 1, inmuno: pts.filter(function (p) { return p.inmuno; }).length + 1 };
  }
  function avisosMuestreo(expId, inicioISO, dias, m, antelMin) {
    m = cfgM(m); antelMin = antelMin === undefined ? m.antelacion_min : antelMin; var t0 = aFecha(inicioISO); if (!t0) return [];
    // v0.7.1: Texto en formato lista (un elemento por línea, separados por "\n"; la viñeta la pone quien lo muestra)
    function txt(p) { var l = []; Object.keys(p.tubos).forEach(function (k) { var n = p.tubos[k]; if (n) l.push(n + " × " + m.tubos[k].nombre); }); if (p.bilis) l.push("Bilis"); if (p.inmuno) l.push("+ inmunología (del tubo amarillo)"); l.push("Total: " + String(p.mL).replace(".", ",") + " mL"); return l.join("\n"); }
    var out = puntosMuestreo(inicioISO, dias, m).filter(function (p) { return p.t_h > 0; }).map(function (p) {
      return { ID: expId + "|muestra|" + p.t_h, Experimento: expId, Fecha_hora: new Date(p.fecha.getTime() - antelMin * 6e4).toISOString(), Tipo: "muestra", Destino: "equipo", Vista: "exp:" + expId + ":seguimiento",
        Titulo: "Muestra " + p.etiqueta + " en " + antelMin + " min" + (p.tipo === "extra" ? " (EDTA + gasometrías)" : "") + (p.inmuno ? " + inmunología" : ""), Texto: txt(p) };
    });
    if (m.biopsia_cada_h) for (var h = m.biopsia_cada_h; h <= (num(dias) || 7) * 24; h += m.biopsia_cada_h)
      out.push({ ID: expId + "|biopsia|" + h, Experimento: expId, Fecha_hora: new Date(t0.getTime() + (h * 60 - antelMin) * 6e4).toISOString(), Tipo: "muestra", Destino: "equipo", Vista: "exp:" + expId + ":seguimiento", Titulo: "Biopsia hepática " + h + " h en " + antelMin + " min", Texto: "Parénquima (parafina + criopreservación)." });
    return out;
  }
  // Puntos de registro de la HDF: pre-perfusión, cada hora las primeras 24 h y luego en los puntos de muestreo
  function puntosHDF(inicioISO, dias, m) {
    m = cfgM(m); var t0 = aFecha(inicioISO); if (!t0) return []; var out = [], vistos = {};
    for (var h = 1; h <= 24; h += m.hdf_cada_h_dia1 || 1) { out.push({ t_h: h, fecha: new Date(t0.getTime() + h * 36e5), etiqueta: "HDF " + h + " h" }); vistos[h * 60] = 1; }
    puntosMuestreo(inicioISO, dias, m).forEach(function (p) { var k = Math.round(p.t_h * 60); if (p.t_h > 24 && !vistos[k]) { vistos[k] = 1; out.push({ t_h: p.t_h, fecha: p.fecha, etiqueta: "HDF " + p.etiqueta }); } });
    return out.sort(function (a, b) { return a.t_h - b.t_h; });
  }
  // ¿Se puede registrar ahora en una perfusión terminada? Solo en los puntos del muestreo (± margen) o un registro urgente
  function registroPermitido(puntos, fecha, margenMin) {
    var t = aFecha(fecha) || new Date(), mg = (num(margenMin) || 45) * 6e4;
    return (puntos || []).some(function (p) { return Math.abs(aFecha(p.fecha) - t) <= mg; });
  }

  // ============================================================== 2. HDF: alarmas de presiones y recomendaciones combinadas
  // Rangos de trabajo por defecto (Aquarius, set pediátrico HF03, Qb 80 mL/min). Provisionales hasta recibir la tabla del grupo.
  DEF.hdf.rangos = { P_acceso: [-150, -10], P_retorno: [10, 150], TMP: [-20, 150], Caida_P: [10, 100], P_efluente: [-150, 50], P_prefiltro: [20, 250], Temp: [36.5, 38.5] };
  DEF.hdf.consejo = DEF.hdf.consejo || {};
  var CJ = DEF.hdf.consejo; if (CJ.Q_sangre_max === undefined) CJ.Q_sangre_max = 120; if (CJ.Reposicion_alta === undefined) CJ.Reposicion_alta = 200; if (CJ.temp_minima === undefined) CJ.temp_minima = 35;
  if (CJ.Osm_max === undefined) CJ.Osm_max = 310; if (CJ.Osm_min === undefined) CJ.Osm_min = 280; if (CJ.Lactato_max === undefined) CJ.Lactato_max = 2.5;
  // Nombres legibles de todos los parámetros de Configuración › HDF (para no mostrar «consejo.BE_min»)
  C.NOMBRES_HDF = {
    paso_mL_h: ["Paso de la extracción", "mL/h", "La máquina solo admite cambios de este tamaño."], max_mL_h: ["Extracción máxima", "mL/h", "Nunca se recomienda más que esto."], horizonte_h: ["Horizonte del balance", "h", "Horas para las que se calcula la extracción que deja el balance en cero."],
    muestra_mL_dia1: ["Volumen por muestra (día 1)", "mL", "Ya no hace falta: se calcula con los tubos del muestreo."], muestra_mL_despues: ["Volumen por muestra (después)", "mL", "Ya no hace falta: se calcula con los tubos del muestreo."], otras_infusiones_mL_h: ["Otras infusiones continuas", "mL/h", "Heparina y otras líneas fuera del horario circadiano."],
    "parametros.set": ["Set de hemofiltración", "", ""], "parametros.liquido": ["Líquido de diálisis y reposición", "", ""], "parametros.Q_sangre": ["Flujo de sangre", "mL/min", ""], "parametros.Q_dialisis": ["Flujo de diálisis", "mL/h", ""], "parametros.Reposicion": ["Reposición", "mL/h", ""], "parametros.Reposicion_modo": ["Modo de la reposición", "", "Post-dilución."], "parametros.Temp_min": ["Temperatura mínima del calentador", "°C", ""], "parametros.Temp_max": ["Temperatura máxima del calentador", "°C", ""],
    "dializado.Na": ["Na⁺ del dializado", "mmol/L", ""], "dializado.K": ["K⁺ del dializado (sin fosfato)", "mmol/L", ""], "dializado.Ca": ["Ca²⁺ del dializado", "mmol/L", ""], "dializado.Mg": ["Mg²⁺ del dializado", "mmol/L", ""], "dializado.Cl": ["Cl⁻ del dializado", "mmol/L", "Calculado por balance de cargas."], "dializado.HCO3": ["HCO₃⁻ del dializado", "mmol/L", ""], "dializado.Glucosa_mg_dL": ["Glucosa del dializado", "mg/dL", ""], "dializado.fosfato_mL_bolsa": ["Fosfato dipotásico por bolsa", "mL", ""], "dializado.fosfato_M": ["Concentración del fosfato dipotásico", "M", ""], "dializado.bolsa_L": ["Volumen de cada bolsa", "L", ""],
    "consejo.urea_max": ["Urea máxima", "mg/dL", "Por encima, se recomienda más aclaramiento."], "consejo.urea_subida_pct": ["Subida de urea que avisa", "%", "Respecto a la medición anterior."], "consejo.K_max": ["K⁺ máximo", "mmol/L", ""], "consejo.K_min": ["K⁺ mínimo", "mmol/L", ""], "consejo.Na_max": ["Na⁺ máximo", "mmol/L", ""], "consejo.Na_min": ["Na⁺ mínimo", "mmol/L", ""],
    "consejo.HCO3_max": ["HCO₃⁻ máximo", "mmol/L", ""], "consejo.HCO3_min": ["HCO₃⁻ mínimo", "mmol/L", ""], "consejo.BE_max": ["Exceso de bases máximo", "mmol/L", ""], "consejo.BE_min": ["Exceso de bases mínimo", "mmol/L", ""], "consejo.Ca_min": ["Ca²⁺ iónico mínimo", "mmol/L", ""], "consejo.P_max": ["Fosfato máximo", "mg/dL", ""], "consejo.P_min": ["Fosfato mínimo", "mg/dL", ""], "consejo.Mg_min": ["Magnesio mínimo", "mg/dL", ""], "consejo.Glucosa_max": ["Glucosa máxima", "mg/dL", ""],
    "consejo.Osm_max": ["Osmolalidad máxima", "mOsm/kg", ""], "consejo.Osm_min": ["Osmolalidad mínima", "mOsm/kg", ""], "consejo.Lactato_max": ["Lactato máximo", "mmol/L", "Con lactato alto no se sube el aclaramiento por la urea: primero el injerto."],
    "consejo.Q_dialisis_alto": ["Flujo de diálisis máximo recomendado", "mL/h", ""], "consejo.Reposicion_baja": ["Reposición mínima recomendada", "mL/h", ""], "consejo.Reposicion_alta": ["Reposición máxima recomendada", "mL/h", ""], "consejo.Q_sangre_max": ["Flujo de sangre máximo recomendado", "mL/min", "Límite del set pediátrico HF03."], "consejo.temp_minima": ["Temperatura mínima para recomendar cambios", "°C", "Por debajo (recalentamiento) no se proponen cambios."],
    "rangos.P_acceso": ["P. de acceso (rango)", "mmHg", ""], "rangos.P_retorno": ["P. de retorno (rango)", "mmHg", ""], "rangos.TMP": ["PTM (rango)", "mmHg", ""], "rangos.Caida_P": ["Caída de presión del filtro (rango)", "mmHg", ""], "rangos.P_efluente": ["P. del efluente (rango)", "mmHg", ""], "rangos.P_prefiltro": ["P. prefiltro (rango)", "mmHg", ""], "rangos.Temp": ["Temperatura del circuito (rango)", "°C", ""]
  };
  // Alarmas de la máquina con la última lectura (y la tendencia respecto a la anterior)
  function alarmasHDF(v, prev, cfg) {
    cfg = cfg || DEF.hdf; var rg = cfg.rangos || DEF.hdf.rangos, out = [], n = function (o, k) { return o ? num(o[k]) : null; };
    var NOM = { P_acceso: "P. de acceso", P_retorno: "P. de retorno", TMP: "PTM", Caida_P: "Caída de presión del filtro", P_efluente: "P. del efluente", P_prefiltro: "P. prefiltro", Temp: "Temperatura del circuito" };
    Object.keys(rg).forEach(function (k) { var x = n(v, k), lim = rg[k]; if (x === null || !lim) return; if (x < lim[0] || x > lim[1]) out.push({ k: k, nivel: "alerta", texto: NOM[k] + " " + r(x, 0) + " fuera del rango (" + lim[0] + " a " + lim[1] + ")." }); });
    var tmp = n(v, "TMP"), tmp0 = n(prev, "TMP"), dp = n(v, "Caida_P"), dp0 = n(prev, "Caida_P"), pa = n(v, "P_acceso"), pr = n(v, "P_retorno"), pre = n(v, "P_prefiltro");
    if (tmp !== null && tmp0 !== null && tmp - tmp0 >= 30) out.push({ k: "TMP", nivel: "ajuste", texto: "La PTM sube " + r(tmp - tmp0, 0) + " mmHg desde la lectura anterior: el filtro se está colmatando o coagulando. Revisa la heparina, baja la reposición post si es alta y prepara el cambio de filtro." });
    if (dp !== null && dp0 !== null && dp - dp0 >= 20) out.push({ k: "Caida_P", nivel: "ajuste", texto: "La caída de presión del filtro sube " + r(dp - dp0, 0) + " mmHg: coagulación en las fibras. Comprueba la anticoagulación y valora cambiar el filtro." });
    if (pa !== null && pa < (rg.P_acceso || [-150])[0]) out.push({ k: "P_acceso", nivel: "ajuste", texto: "P. de acceso muy negativa: la línea arterial aspira con dificultad. Comprueba acodamientos y el nivel del reservorio; si persiste, baja el flujo de sangre en 10 mL/min." });
    if (pr !== null && pre !== null && pr > (rg.P_retorno || [0, 150])[1] && pre > (rg.P_prefiltro || [0, 250])[1]) out.push({ k: "P_retorno", nivel: "ajuste", texto: "P. de retorno y prefiltro altas a la vez: obstrucción después del filtro (cámara venosa o línea de retorno)." });
    return out;
  }
  // Recomendaciones combinadas: tiene en cuenta todos los parámetros a la vez y la temperatura del perfusato.
  // v = última bioquímica (y gasometría) del perfusato; ctx = { temp, urea_previa, lactato, normotermia, cfg, actual:{Q_sangre,Q_dialisis,Reposicion} }
  function consejoHDF(v, ctx) {
    ctx = ctx || {}; var cfg = ctx.cfg || DEF.hdf, u = C.mezclarCfg ? C.mezclarCfg(DEF.hdf.consejo, cfg.consejo) : Object.assign({}, DEF.hdf.consejo, cfg.consejo || {}), D = C.dializado(cfg), pm = Object.assign({}, DEF.hdf.parametros, cfg.parametros || {}), act = Object.assign({ Q_sangre: pm.Q_sangre, Q_dialisis: pm.Q_dialisis, Reposicion: pm.Reposicion }, ctx.actual || {});
    var n = function (k) { return num(v ? v[k] : null); }, temp = num(ctx.temp), out = [], f = function (x, d) { return String(r(x, d === undefined ? 1 : d)).replace(".", ","); };
    var normo = ctx.normotermia !== undefined ? ctx.normotermia : (temp === null || temp >= u.temp_minima);
    if (!normo || (temp !== null && temp < u.temp_minima)) return [{ nivel: "info", texto: "Perfusato a " + (temp !== null ? f(temp) + " °C" : "temperatura por debajo de " + u.temp_minima + " °C") + ": durante el recalentamiento el metabolismo y la producción de urea son bajos y no se recomiendan cambios en la HDF. Mantén los parámetros fijos y extrae según el balance." }];
    var urea = n("Urea"), up = num(ctx.urea_previa), K = n("K"), Na = n("Na"), H = n("HCO3"), BE = n("BE"), pH = n("pH"), Ca = n("Ca"), P = n("P"), Mg = n("Mg"), G = n("Glucosa"), Osm = n("Osm"), Lac = n("Lactato") !== null ? n("Lactato") : num(ctx.lactato);
    var ureaAlta = urea !== null && (urea > u.urea_max || (up && urea > up * (1 + u.urea_subida_pct / 100))), Kalto = K !== null && K > u.K_max, Kbajo = K !== null && K < u.K_min, Naalto = Na !== null && Na > u.Na_max, Nabajo = Na !== null && Na < u.Na_min;
    var alc = (H !== null && H > u.HCO3_max) || (BE !== null && BE > u.BE_max) || (pH !== null && pH > 7.5), acid = (H !== null && H < u.HCO3_min) || (BE !== null && BE < u.BE_min), lacAlto = Lac !== null && Lac > u.Lactato_max;
    var difusion = ureaAlta || Kalto || Naalto || Nabajo || (acid && !lacAlto), problemas = [];
    if (ureaAlta) problemas.push("urea " + f(urea, 0) + " mg/dL" + (urea > u.urea_max ? "" : " (sube más de un " + u.urea_subida_pct + " %)")); if (Kalto) problemas.push("K⁺ " + f(K) + " mmol/L"); if (Naalto || Nabajo) problemas.push("Na⁺ " + f(Na, 0) + " mmol/L"); if (acid) problemas.push("acidosis (HCO₃⁻ " + (H !== null ? f(H) : "—") + ")"); if (alc) problemas.push("alcalosis (HCO₃⁻ " + (H !== null ? f(H) : "—") + ")");
    // 1) aclaramiento difusivo: subir el flujo de diálisis es lo primero (urea, K⁺, Na⁺ y ácido-base van hacia el dializado)
    if (difusion) {
      var pasos = [];
      if (act.Q_dialisis < u.Q_dialisis_alto) pasos.push("sube el flujo de diálisis de " + act.Q_dialisis + " a " + u.Q_dialisis_alto + " mL/h");
      else if (act.Q_sangre < u.Q_sangre_max) pasos.push("el flujo de diálisis ya está en " + act.Q_dialisis + " mL/h: sube el flujo de sangre de " + act.Q_sangre + " a " + Math.min(u.Q_sangre_max, act.Q_sangre + 20) + " mL/min (comprueba que la P. de acceso no baja de −150 mmHg)");
      if (ureaAlta && act.Reposicion < u.Reposicion_alta && !alc) pasos.push("añade aclaramiento convectivo subiendo la reposición post de " + act.Reposicion + " a " + Math.min(u.Reposicion_alta, act.Reposicion + 50) + " mL/h (la extracción recomendada no cambia: la reposición entra y sale)");
      var avisos = [];
      if (alc) avisos.push("ojo: hay alcalosis y el dializado lleva HCO₃⁻ " + D.HCO3 + " mmol/L, así que más intercambio la empeora; no subas la reposición, no des bicarbonato y vigila el pH");
      if (Kbajo) avisos.push("el K⁺ está bajo (" + f(K) + "): al subir el intercambio tenderá a " + f(D.K) + " mmol/L, revisa que todas las bolsas llevan el fosfato dipotásico");
      if (Nabajo && ureaAlta) avisos.push("el Na⁺ bajo también se corrige hacia " + D.Na + " con más intercambio");
      if (lacAlto && ureaAlta) avisos.push("el lactato está alto (" + f(Lac) + " mmol/L): la urea puede reflejar catabolismo del injerto; prioriza revisar flujos, oxigenación y nutrición");
      if (Kalto) avisos.push("un K⁺ por encima del dializado (≈" + f(D.K) + ") indica liberación celular (lisis o hemólisis)");
      out.push({ nivel: "ajuste", texto: "Por " + problemas.join(", ") + ": " + pasos.join("; ") + "." + (avisos.length ? " Además, " + avisos.join("; ") + "." : "") + " Revisa la PTM y que el filtro no esté coagulado." });
    } else if (alc) {
      out.push({ nivel: "ajuste", texto: "Alcalosis metabólica" + (H !== null ? " (HCO₃⁻ " + f(H) + ")" : "") + " sin urea ni iones que obliguen a más aclaramiento: el dializado y la reposición aportan HCO₃⁻ " + D.HCO3 + " mmol/L. No administres bicarbonato y baja la reposición post de " + act.Reposicion + " a " + u.Reposicion_baja + " mL/h; si el flujo de diálisis está por encima de " + pm.Q_dialisis + ", vuelve a " + pm.Q_dialisis + " mL/h." });
    } else if (acid && lacAlto) {
      out.push({ nivel: "alerta", texto: "Acidosis con lactato " + f(Lac) + " mmol/L: es láctica (del injerto), no se corrige con la HDF. Revisa flujos, oxigenación y el asesor de gasometría antes de tocar la HDF." });
    }
    if (Kbajo && !difusion) out.push({ nivel: "ajuste", texto: "K⁺ " + f(K) + " mmol/L con un dializado de ≈" + f(D.K) + ": comprueba que cada bolsa lleva los " + ((cfg.dializado || DEF.hdf.dializado).fosfato_mL_bolsa || 5) + " mL de fosfato dipotásico; si sigue bajo, corrige con KCl (Cálculos del perfusato)." });
    if (Ca !== null && Ca < u.Ca_min) out.push({ nivel: "ajuste", texto: "Ca²⁺ iónico " + f(Ca, 2) + " mmol/L: el dializado aporta " + D.Ca + " mmol/L; corrige con CaCl₂ (Cálculos del perfusato)" + (difusion ? " y vuelve a medirlo tras subir el intercambio" : "") + "." });
    if (P !== null && P > u.P_max) out.push({ nivel: "ajuste", texto: "Fosfato " + f(P) + " mg/dL: valora quitar el fosfato dipotásico de una de cada dos bolsas (aporta ≈" + f(D.P_mg_dL) + " mg/dL)" + (Kbajo ? ", pero el K⁺ está bajo: compénsalo con KCl" : "") + "." });
    else if (P !== null && P < u.P_min) out.push({ nivel: "ajuste", texto: "Fosfato " + f(P) + " mg/dL: comprueba que el fosfato dipotásico está en todas las bolsas." });
    if (Mg !== null && Mg < u.Mg_min) out.push({ nivel: "ajuste", texto: "Mg " + f(Mg, 2) + " mg/dL: el Accusol solo lleva " + D.Mg + " mmol/L y lo arrastra hacia abajo" + (difusion ? " (más aún al subir el intercambio)" : "") + ". Suplementa con sulfato de magnesio (Sulmetin 150 mg/mL) en el perfusato." });
    if (G !== null && G > u.Glucosa_max) out.push({ nivel: "info", texto: "Glucosa " + f(G, 0) + " mg/dL: la HDF la acerca a " + D.Glucosa_mg_dL + " mg/dL; si sigue alta, revisa la nutrición y la insulina." });
    if (Osm !== null && (Osm > u.Osm_max || Osm < u.Osm_min)) out.push({ nivel: "info", texto: "Osmolalidad " + f(Osm, 0) + " mOsm/kg" + (Osm > u.Osm_max && ureaAlta ? ": la urea contribuye; mejorará con más aclaramiento." : Osm > u.Osm_max ? ": revisa Na⁺ y glucosa." : ": revisa Na⁺ y el aporte de líquidos.") });
    if (!out.length) out.push({ nivel: "ok", texto: "Urea, iones y ácido-base compatibles con los parámetros fijos de la HDF: no hace falta cambiar nada; solo ajusta la extracción según el balance." });
    return out;
  }
  C.alarmasHDF = alarmasHDF; C.consejoHDF = consejoHDF;

  // ============================================================== 3. Epoprostenol (Veletri 0,5 mg en 100 mL = 5 µg/mL) por flujo arterial
  // Propuesta a validar por el equipo: solo si hay vasoconstricción/vasoespasmo (flujo de la arteria hepática bajo con presión en objetivo).
  DEF.epoprostenol = { conc_ug_mL: 5, inicio_ug_h: 4, paso_ug_h: 2, max_ug_h: 8, Q_AH_bajo: 100, Q_AH_ok: 150, Q_AH_alto: 350, P_AH_baja: 45 };
  function epoprostenol(q, p, actual_mL_h, cfg) {
    cfg = Object.assign({}, DEF.epoprostenol, cfg || {}); q = num(q); p = num(p); var act = num(actual_mL_h) || 0, ug = act * cfg.conc_ug_mL, mlh = function (x) { return r(x / cfg.conc_ug_mL, 1); };
    if (q === null) return null;
    if (p !== null && p < cfg.P_AH_baja && act > 0) return { nivel: "alerta", mL_h: 0, texto: "P. arterial " + r(p, 0) + " mmHg (baja) con epoprostenol en marcha: suspéndelo (0 mL/h) y revisa el volumen y las conexiones." };
    if (q < cfg.Q_AH_bajo) {
      if (!act) return { nivel: "ajuste", mL_h: mlh(cfg.inicio_ug_h), texto: "Flujo de la arteria hepática " + r(q, 0) + " mL/min (< " + cfg.Q_AH_bajo + ") con presión en objetivo, compatible con vasoespasmo: empieza epoprostenol a " + cfg.inicio_ug_h + " µg/h = " + String(mlh(cfg.inicio_ug_h)).replace(".", ",") + " mL/h y vuelve a medir el flujo en 30 min." };
      if (ug < cfg.max_ug_h) { var nv = Math.min(cfg.max_ug_h, ug + cfg.paso_ug_h); return { nivel: "ajuste", mL_h: mlh(nv), texto: "El flujo arterial sigue bajo (" + r(q, 0) + " mL/min): sube el epoprostenol de " + r(ug, 1) + " a " + nv + " µg/h = " + String(mlh(nv)).replace(".", ",") + " mL/h." }; }
      return { nivel: "alerta", mL_h: act, texto: "Flujo arterial bajo (" + r(q, 0) + " mL/min) con epoprostenol al máximo (" + cfg.max_ug_h + " µg/h): busca otra causa (trombosis, acodamiento de la cánula, presión)." };
    }
    if (act > 0 && q > cfg.Q_AH_alto) { var bj = Math.max(0, ug - cfg.paso_ug_h); return { nivel: "ajuste", mL_h: mlh(bj), texto: "Flujo arterial " + r(q, 0) + " mL/min (alto): " + (bj ? "baja el epoprostenol a " + bj + " µg/h = " + String(mlh(bj)).replace(".", ",") + " mL/h." : "suspende el epoprostenol.") }; }
    if (act > 0 && q >= cfg.Q_AH_ok) { var bj2 = Math.max(0, ug - cfg.paso_ug_h); return { nivel: "info", mL_h: mlh(bj2), texto: "Flujo arterial recuperado (" + r(q, 0) + " mL/min): baja el epoprostenol a " + (bj2 ? bj2 + " µg/h = " + String(mlh(bj2)).replace(".", ",") + " mL/h" : "0 (suspender)") + " y vuelve a medir en 30 min." }; }
    return act > 0 ? { nivel: "ok", mL_h: act, texto: "Mantén el epoprostenol a " + r(ug, 1) + " µg/h (" + String(act).replace(".", ",") + " mL/h)." } : null;
  }
  C.epoprostenol = epoprostenol;

  // ============================================================== 4. Ritmos de infusión redondeados (bombas: 1 mL/h; insulina 0,1 mL/h)
  function pasoBomba(linea) { return /insulina/i.test(linea || "") ? 0.1 : 1; }
  function redondearRitmo(v, linea) { var p = pasoBomba(linea); v = num(v); return v === null ? null : r(Math.round(v / p) * p, p < 1 ? 1 : 0); }
  // Reescala el horario a un volumen de perfusato distinto (si la desviación supera el umbral) para mantener las concentraciones
  function reescalarHorario(cambios, V_ref, V_real, umbral) {
    V_ref = num(V_ref); V_real = num(V_real); umbral = num(umbral) || 100; if (!V_ref || !V_real || Math.abs(V_real - V_ref) <= umbral) return { cambiado: false, cambios: cambios };
    var f = V_real / V_ref; return { cambiado: true, factor: r(f, 3), cambios: (cambios || []).map(function (c) { var o = Object.assign({}, c); if (num(c.valor) !== null && c.unidad !== "bolo") o.valor = redondearRitmo(num(c.valor) * f, c.linea); return o; }) };
  }
  function volumenDiaLinea(circ, linea) {
    var ev = ((circ || DEF.circadiano).cambios || []).filter(function (x) { return x.linea === linea; }); if (!ev.length) return 0;
    var ini = 8 * 60, rel = function (h) { return ((C.hm(h) - ini) % 1440 + 1440) % 1440; }, ord = ev.slice().sort(function (a, b) { return rel(a.h) - rel(b.h); }), tot = 0;
    ord.forEach(function (x, j) { var a = rel(x.h), b = j + 1 < ord.length ? rel(ord[j + 1].h) : 1440 + rel(ord[0].h); tot += (num(x.valor) || 0) * (b - a) / 60; });
    return tot;
  }
  // Preparación de cada solución para 7 días: volumen al día, para la semana, cuántas jeringas/bolsas y si conviene preparar para toda la semana
  var ESTABILIDAD_H = { "Hidrocortisona": 168, "Ácidos biliares": 168, "NP (glucosa + AA)": 168, "NP (lípidos)": 168, "Insulina": 168, "Profilaxis": 168, "Profilaxis (bolo)": 24, "Melatonina": 24, "Heparina": 168, "N-acetilcisteína": 168 };
  var CONTENEDORES = [[50, "jeringa de 50 mL"], [100, "bolsa de 100 mL"], [250, "bolsa de 250 mL"], [500, "bolsa de 500 mL"], [1000, "bolsa de 1000 mL"]];
  var FIJOS = { "NP (glucosa + AA)": [1600, "Periolimel N4E (cámara de glucosa + aminoácidos, 1600 mL)"], "NP (lípidos)": [400, "Periolimel N4E (cámara de lípidos, 400 mL)"], "Profilaxis (bolo)": [110, "frasco de metronidazol 500 mg/100 mL con 1 g de cefoxitina"], "Profilaxis": [50, "frasco de fluconazol 2 mg/mL de 50 mL"] };
  function coma(x, d) { return String(r(x, d === undefined ? 1 : d)).replace(".", ","); }
  function preparacionSemanal(linea, mL_dia, dias, madre) {
    dias = num(dias) || 7; mL_dia = num(mL_dia) || 0; var tot = mL_dia * dias, est = ESTABILIDAD_H[linea] || 168, diasPrep = Math.max(1, Math.min(dias, Math.floor(est / 24))), porTanda = mL_dia * diasPrep, tandas = Math.ceil(dias / diasPrep - 1e-9);
    var c = FIJOS[linea] || CONTENEDORES.filter(function (x) { return x[0] >= porTanda; })[0] || CONTENEDORES[CONTENEDORES.length - 1], n = Math.max(1, Math.ceil(porTanda / c[0] - 1e-9)), rec;
    if (!mL_dia) rec = "No se administra con el horario de este protocolo.";
    else if (/Melatonina/.test(linea)) rec = "Preparar cada día (fotosensible y a concentración muy baja): " + coma(mL_dia) + " mL al día, protegida de la luz. Es la única línea que no conviene preparar para la semana.";
    else if (FIJOS[linea]) { var nt = Math.max(1, Math.ceil(tot / c[0] - 1e-9)); rec = "Sin preparación: se conecta directamente " + (/^Periolimel/.test(c[1]) ? "" : "el ") + c[1] + ". Hacen falta " + nt + " para " + dias + " días (" + coma(tot, 0) + " mL); se cambia el envase cada " + coma(c[0] / mL_dia) + " días, sin cambiar la línea."; }
    else if (diasPrep >= dias && n === 1) rec = "Preparar para toda la semana: " + coma(tot, 0) + " mL en una " + c[1] + ". Un solo cambio de línea.";
    else if (diasPrep >= dias) rec = "Preparar para toda la semana: " + coma(tot, 0) + " mL en " + n + " × " + c[1] + " (se cambia el contenedor, no la línea, cada " + coma(c[0] / mL_dia) + " días).";
    else rec = "Preparar cada " + diasPrep + " día(s) (" + coma(porTanda, 0) + " mL por tanda, " + tandas + " tandas): la mezcla no es estable 7 días.";
    return { total_mL: r(tot, 1), dias_por_tanda: diasPrep, tandas: tandas, contenedor: c[1], contenedor_mL: c[0], contenedores_por_tanda: n, semana: diasPrep >= dias && !/Melatonina/.test(linea), recomendacion: rec, masa: madre ? r(tot * madre, 2) : null };
  }
  C.pasoBomba = pasoBomba; C.redondearRitmo = redondearRitmo; C.reescalarHorario = reescalarHorario; C.volumenDiaLinea = volumenDiaLinea; C.preparacionSemanal = preparacionSemanal;

  // ============================================================== 5. Material: catálogo de referencia y cantidades según los días de perfusión
  // Tipo: Fungible | Fármaco | Reactivo | Solución | Inventariable | Instrumental · Regla: cómo se calcula la cantidad para una perfusión
  C.UBICACIONES = ["Almacén general Cirugía Experimental (entreplanta)", "Despacho de Investigación (planta baja)", "Nevera GITIC (3.ª planta)"];
  var U0 = C.UBICACIONES[0], U1 = C.UBICACIONES[1], U2 = C.UBICACIONES[2];
  C.CATALOGO = [
    // Fungible · perfusión
    ["Set de perfusión Liver Assist", "Fungible", "Fungible de perfusión", "unidad", "11.493", 1, "fijo", U0], ["Oxigenador Capiox FX05 Baby", "Fungible", "Fungible de perfusión", "unidad", "CX*FX05RW", 1, "fijo", U0],
    ["Conector 1/4″–3/8″", "Fungible", "Fungible de perfusión", "unidad", "", 1, "fijo", U0], ["Conector de pagoda 1/4″–1/4″", "Fungible", "Fungible de perfusión", "unidad", "", 3, "fijo", U0],
    ["Tubuladura 1/4″–1/4″", "Fungible", "Fungible de perfusión", "unidad", "", 1, "fijo", U0], ["Adaptador Luer-Lock 1/4″", "Fungible", "Fungible de perfusión", "unidad", "", 1, "fijo", U0], ["Llave de tres vías", "Fungible", "Fungible de perfusión", "unidad", "", 8, "fijo", U0],
    // Fungible · hemodiafiltración
    ["Línea de hemofiltración Aqualine S", "Fungible", "Fungible de hemodiafiltración", "unidad", "Aqualine S", 3, "prop7", U0], ["Bolsa de recogida de ultrafiltrado 5 L", "Fungible", "Fungible de hemodiafiltración", "unidad", "B3052", 11, "prop7", U0],
    ["Hemofiltro HF03", "Fungible", "Fungible de hemodiafiltración", "unidad", "HF03", 3, "prop7", U0], ["Accesorio para terapias extracorpóreas", "Fungible", "Fungible de hemodiafiltración", "unidad", "H3051", 3, "prop7", U0],
    ["Solución de hemodiafiltración Accusol 35 potasio 2 mmol/L 5 L", "Solución", "Fungible de hemodiafiltración", "bolsa", "ACCUSOL 35 2K", 2, "por_dia:2", U0],
    // Fungible · general (muestras)
    ["Bolsa de órganos", "Fungible", "Fungible general", "unidad", "", 1, "fijo", U0], ["Puntas de pipeta 200 µL", "Fungible", "Fungible general", "punta", "", 96, "puntas", U1],
    ["Criomolde", "Fungible", "Fungible general", "unidad", "", 2, "fijo", U1], ["Criotubo", "Fungible", "Fungible general", "unidad", "21263", 2, "fijo", U1], ["Microtubo tipo Eppendorf de fondo plano", "Fungible", "Fungible general", "unidad", "200400P", 0, "microtubos", U1],
    ["Tubo de heparina de litio con separador 0,8 mL", "Fungible", "Fungible general", "unidad", "450535", 0, "tubo:LH", U1], ["Tubo de K2EDTA Vacutest 5,4 mg 3 mL", "Fungible", "Fungible general", "unidad", "135100", 0, "tubo:EDTA", U1],
    ["Tubo de suero con gel y activador Vacutest 3,5 mL", "Fungible", "Fungible general", "unidad", "10174", 0, "tubo:AMA", U1], ["Tubo de citrato sódico Minicollect 9NC 3,2 % 1 mL", "Fungible", "Fungible general", "unidad", "450539", 0, "tubo:CIT", U1],
    ["Jeringa de gasometría con heparina 80 UI 0,7 mL", "Fungible", "Fungible general", "unidad", "957-204", 0, "tubo:GAS", U1], ["Equipo de irrigación de una sola sonda", "Fungible", "Fungible general", "unidad", "E5MC4002", 2, "fijo", U0],
    ["Sonda vascular TTFM Medistim 10 mm", "Fungible", "Fungible general", "uso", "PV100101-20", 1, "usos_sonda", U0], ["Sonda vascular TTFM Medistim 4 mm", "Fungible", "Fungible general", "uso", "", 1, "usos_sonda", U0],
    // Fármacos, reactivos y soluciones
    ["Taurocolato sódico hidratado 25 g", "Reactivo", "Reactivos", "g", "86339", 0, "protocolo:Ácidos biliares:Ácido taurocólico:g", U2], ["Aceite mineral 500 mL", "Reactivo", "Reactivos", "mL", "M5310-500ML", 0, "aceite_bilis", U1],
    ["Periolimel N4E 2 L", "Solución", "Fármacos y soluciones", "bolsa", "", 2, "periolimel", U0], ["Taurina 100 g", "Reactivo", "Reactivos", "g", "T0625-100G", 0, "protocolo:NP (glucosa + AA):Taurina:g", U2],
    ["Cloruro de colina 100 g", "Reactivo", "Reactivos", "g", "C7527-100G", 0, "protocolo:NP (glucosa + AA):Cloruro de colina:g", U2], ["Cefoxitina 1 g/10 mL", "Fármaco", "Fármacos y soluciones", "vial", "615609.4", 1, "por_dia:1", U0],
    ["Metronidazol 500 mg/100 mL", "Fármaco", "Fármacos y soluciones", "frasco", "643494.9", 1, "por_dia:1", U0], ["Fluconazol 2 mg/mL 50 mL", "Fármaco", "Fármacos y soluciones", "frasco", "606084.1", 1, "por_dia:1", U0],
    ["Hidrocortisona Actocortina 75 mg/1 mL", "Fármaco", "Fármacos y soluciones", "ampolla", "606541.9", 2, "protocolo:Hidrocortisona:Hidrocortisona:amp75", U0], ["L-carnitina Carnicor 200 mg/mL 5 mL", "Fármaco", "Fármacos y soluciones", "vial", "957548.9", 1, "protocolo:NP (glucosa + AA):L-carnitina:vial1000", U0],
    ["Epoprostenol Veletri 0,5 mg/100 mL", "Fármaco", "Fármacos y soluciones", "vial", "711649.3", 0, "a_demanda", U2], ["Heparina sódica 5000 UI/mL 5 mL", "Fármaco", "Fármacos y soluciones", "vial", "607779.5", 1, "heparina", U0],
    ["Acetilcisteína Hidonac antídoto 200 mg/mL 25 mL", "Fármaco", "Fármacos y soluciones", "mL", "7028389", 0, "protocolo:N-acetilcisteína:N-acetilcisteína:mL200", U0], ["Fosfato dipotásico 1 M 174,2 mg/mL 10 mL", "Fármaco", "Fármacos y soluciones", "ampolla", "600215.5", 1, "fosfato", U0],
    ["Sulfato de magnesio Sulmetin simple 150 mg/mL 10 mL", "Fármaco", "Fármacos y soluciones", "ampolla", "", 0, "a_demanda", U0], ["Solución de preservación IGL-1 1 L", "Solución", "Fármacos y soluciones", "bolsa", "", 4, "fijo", U2],
    ["Melatonina", "Reactivo", "Reactivos", "mg", "", 0, "protocolo:Melatonina:Melatonina:mg", U2],
    // Inventariable
    ["Máquina de perfusión Liver Assist", "Inventariable", "Equipos", "unidad", "", 1, "fijo", U0], ["Monitor de hemodiafiltración Aquarius", "Inventariable", "Equipos", "unidad", "", 1, "fijo", U0],
    ["Sistema de medición de flujo Medistim VeriQ", "Inventariable", "Equipos", "unidad", "", 1, "fijo", U0], ["Mezclador de aire y oxígeno", "Inventariable", "Equipos", "unidad", "", 2, "fijo", U0]
  ].map(function (x, i) { return { ID: "CAT-" + dos(Math.floor(i / 10)) + (i % 10), Nombre: x[0], Tipo: x[1], Categoria: x[2], Unidad: x[3], Referencia: x[4], Por_perfusion: x[5], Regla: x[6], Ubicacion: x[7], Activo: true }; });
  C.REGLAS = { fijo: "Cantidad fija por perfusión", prop7: "Proporcional a los días (la cantidad indicada es para 7 días)", "por_dia:1": "1 al día", "por_dia:2": "2 al día", puntas: "1 punta por tubo de EDTA", microtubos: "3 por EDTA + 2 por muestra de bilis + 2 por muestra de filtrado", "tubo:LH": "Según el muestreo", "tubo:EDTA": "Según el muestreo", "tubo:AMA": "Según el muestreo", "tubo:CIT": "Según el muestreo", "tubo:GAS": "Según el muestreo", aceite_bilis: "2,5 mL por muestra de bilis", usos_sonda: "1 uso en el donante; con trasplante, +1 tras la anastomosis y +1 en el sacrificio", periolimel: "Según el volumen de nutrición del protocolo (1600 mL de glucosa + aminoácidos y 400 mL de lípidos por bolsa)", heparina: "Según el protocolo (cebado + infusión continua)", fosfato: "1 ampolla por cada 2 bolsas de Accusol", a_demanda: "Solo si hace falta (no se prepara)" };
  function reglaTexto(regla) { regla = regla || "fijo"; if (C.REGLAS[regla]) return C.REGLAS[regla]; if (/^protocolo:/.test(regla)) return "Según el protocolo (" + regla.split(":")[1] + ")"; return regla; }
  // ctx = { dias, tx, circ (horario), protocolo (lineas con madre), V_mL, bilisReal, sobrevive5 }
  function cantidadMaterial(m, ctx) {
    ctx = ctx || {}; var dias = num(ctx.dias) || 7, base = num(m.Por_perfusion) || 0, regla = m.Regla || (m.Tipo === "Inventariable" || m.Tipo === "Instrumental" ? "fijo" : "fijo"), pl = ctx.plan || planMuestreo(dias, ctx.muestreo);
    var vl = function (l) { return volumenDiaLinea(ctx.circ, l) * dias; }, madre = function (l, comp) { var L = ((ctx.protocolo || {}).lineas || {})[l]; if (!L) return null; var c = (L.componentes || []).filter(function (x) { return x.nombre === comp; })[0]; return c ? num(c.madre) : null; };
    if (regla === "fijo") return base;
    if (regla === "prop7") return Math.ceil(base * dias / 7 - 1e-9);
    if (/^por_dia:/.test(regla)) return (num(regla.split(":")[1]) || 1) * Math.ceil(dias - 1e-9);
    if (/^tubo:/.test(regla)) return pl.tubos[regla.split(":")[1]] || 0;
    if (regla === "puntas") return pl.tubos.EDTA || 0;
    if (regla === "microtubos") return (pl.tubos.EDTA || 0) * 3 + (num(ctx.bilisReal) !== null ? num(ctx.bilisReal) : pl.bilis) * 2 + pl.filtrado * 2;
    if (regla === "aceite_bilis") return r((num(ctx.bilisReal) !== null ? num(ctx.bilisReal) : pl.bilis) * DEF.muestreo.aceite_mL_bilis, 1);
    if (regla === "usos_sonda") return ctx.tx ? 3 : 1;
    if (regla === "fosfato") return Math.ceil(2 * Math.ceil(dias - 1e-9) / 2);
    if (regla === "a_demanda") return 0;
    if (regla === "periolimel") { var v1 = vl("NP (glucosa + AA)"), v2 = vl("NP (lípidos)"); return Math.max(1, Math.ceil(Math.max(v1 / 1600, v2 / 400) - 1e-9)); }
    if (regla === "heparina") { var V = num(ctx.V_mL) || 2200, U = V / 1000 * ((DEF.perfusato || {}).heparina_U_L || 2500) + vl("Heparina") * (madre("Heparina", "Heparina") || 1000) + 3 * 24 * dias * 0; return Math.max(1, Math.ceil(U / 25000 - 1e-9)); }
    if (/^protocolo:/.test(regla)) {
      var p = regla.split(":"), l = p[1], comp = p[2], modo = p[3], mc = madre(l, comp), vol = vl(l), mg = mc !== null ? vol * mc : null; if (mg === null) return base;
      if (modo === "g") return r(mg / 1000, 2); if (modo === "mg") return r(mg, 2); if (modo === "amp75") return Math.max(1, Math.ceil(mg / 75 - 1e-9)); if (modo === "vial1000") return Math.max(1, Math.ceil(mg / 1000 - 1e-9)); if (modo === "mL200") return r(mg / 200, 1);
      return base;
    }
    return base;
  }
  C.reglaTexto = reglaTexto; C.cantidadMaterial = cantidadMaterial; C.planMuestreo = planMuestreo;

  // ============================================================== 6. Censo mensual de animales (MODELO CENSO ANIMALES)
  var MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  // exps: [{ID, PROEX, Estado, Fecha_llegada, Fecha_cirugia, Fecha_trasplante, Fecha_sacrificio, tx}] · cfg: {ip, especie, cepa, sala, proex_def}
  // Nº ANIMALES = animales presentes en el estabulario algún día del mes · Nº ANIMALES USADOS = animales usados (cirugía o trasplante) en el mes
  function censoMes(exps, anio, mes, cfg) {
    cfg = Object.assign({ ip: "FONDEVILA", especie: "SUIDO", cepa: "LW", sala: "Grandes 1", proex_def: "084.6/23" }, cfg || {});
    var ini = anio + "-" + dos(mes) + "-01", finD = new Date(Date.UTC(anio, mes, 0)).getUTCDate(), fin = anio + "-" + dos(mes) + "-" + dos(finD), porP = {};
    function enMes(f) { return f && f >= ini && f <= fin; }
    function solapa(a, b) { return a && a <= fin && (!b || b >= ini); }
    (exps || []).forEach(function (e) {
      if (e.Estado === "Cancelado") return; var p = e.PROEX || cfg.proex_def, o = porP[p] = porP[p] || { PROEX: p, presentes: 0, usados: 0, detalle: [] };
      var ll = e.Fecha_llegada || (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -7) : ""), qx = e.Fecha_cirugia || "", sac = e.Fecha_sacrificio || "", tx = e.tx;
      // donantes de sangre y de hígado: llegan juntos y se usan (eutanasia) el día de la cirugía
      if (solapa(ll, qx)) { o.presentes += 2; o.detalle.push(e.ID + ": 2 donantes en el estabulario"); }
      if (enMes(qx)) { o.usados += 2; o.detalle.push(e.ID + ": 2 donantes usados el " + qx); }
      if (tx && e.Fecha_trasplante) { var llR = e.Fecha_llegada_receptor || ll; if (solapa(llR, sac || e.Fecha_trasplante)) { o.presentes += 1; o.detalle.push(e.ID + ": receptor en el estabulario"); } if (enMes(e.Fecha_trasplante)) { o.usados += 1; o.detalle.push(e.ID + ": receptor trasplantado el " + e.Fecha_trasplante); } }
    });
    return { mes: MESES[mes - 1], anio: anio, filas: Object.keys(porP).sort().map(function (k) { var o = porP[k]; return { PROEX: o.PROEX, IP: cfg.ip, ESPECIE: cfg.especie, CEPA: cfg.cepa, SALA: cfg.sala, N_ANIMALES: o.presentes, N_USADOS: o.usados, EXCEDENTES: "", detalle: o.detalle }; }).filter(function (f) { return f.N_ANIMALES || f.N_USADOS; }) };
  }
  C.MESES = MESES; C.censoMes = censoMes;

  // ============================================================== 7. Informes del laboratorio (PDF del Hospital La Paz) → mediciones
  // Cada prueba del informe → [muestra destino ("gas" = la del tipo de muestra, "bq" = perfusato/receptor, "inmuno"), variable, factor de conversión]
  C.MAPA_LAB = [
    [/^(San-)?pH$/i, "gas", "pH"], [/^(San-)?pO2$/i, "gas", "pO2"], [/^(San-)?pCO2$/i, "gas", "pCO2"], [/Saturaci[oó]n de O2/i, "gas", "sO2"], [/^San-Lactato$/i, "gas", "Lactato"], [/^San-Bicarbonato$/i, "gas", "HCO3"],
    [/Exceso de bases/i, "gas", "BE"], [/^San-Potasio$/i, "gas", "K"], [/^San-Cloro$/i, "gas", "Cl"], [/Calcio ionizado/i, "gas", "Ca"], [/^San-Sodio$/i, "gas", "Na"], [/Hemoglobina total/i, "gas", "Hb"], [/^San-Glucosa$/i, "gas", "Glucosa"],
    [/Glucosa$/i, "bq", "Glucosa"], [/Urea$/i, "bq", "Urea"], [/Creatinina/i, "bq", "Creatinina"], [/-Sodio$/i, "bq", "Na"], [/-Potasio$/i, "bq", "K"], [/-Cloro$/i, "bq", "Cl"], [/Magnesio$/i, "bq", "Mg"], [/Osmolalidad medida/i, "bq", "Osm"],
    [/Triglic[eé]ridos/i, "bq", "TG"], [/Fosfato$/i, "bq", "P"], [/Prote[ií]nas totales/i, "bq", "ProtT"], [/Alb[uú]mina$/i, "bq", "Albumina"], [/\(AST\)/i, "bq", "AST"], [/\(ALT\)/i, "bq", "ALT"], [/\(GGT\)/i, "bq", "GGT"],
    [/Lactato deshidrogenasa/i, "bq", "LDH"], [/Fosfatasa alcalina/i, "bq", "FA"], [/Bilirrubina total/i, "bq", "BilT"], [/Amonio/i, "bq", "Amonio", 0.5872], [/Actividad de protrombina/i, "bq", "ActPT"], [/^Pla-Tiempo de protrombina$/i, "bq", "TP"],
    [/^Pla-TTPA$/i, "bq", "Cefalina"], [/Fibrin[oó]geno/i, "bq", "Fibrinogeno"], [/Hematocrito/i, "bq", "Hto"], [/^Srm.*Lactato$/i, "bq", "Lactato"], [/Insulina/i, "bq", "Insulina"], [/Cortisol/i, "bq", "Cortisol", 27.59],
    [/Prote[ií]na C reactiva/i, "inmuno", "PCR"], [/Estradiol/i, "inmuno", "Estradiol"], [/Progesterona/i, "inmuno", "Progesterona"], [/Testosterona/i, "inmuno", "Testosterona"], [/(^|-)IgA$/i, "inmuno", "IgA"], [/(^|-)IgG$/i, "inmuno", "IgG"], [/(^|-)IgM$/i, "inmuno", "IgM"], [/Complemento C3|(^|-)C3( SUERO)?$/i, "inmuno", "C3"], [/Complemento C4|(^|-)C4( SUERO)?$/i, "inmuno", "C4"]
  ];
  // Unidades del informe que hay que convertir a las de la app: amonio µg/dL → µmol/L (× 0,5872); cortisol µg/dL → nmol/L (× 27,59)
  var UNIDAD_ORIGEN = { Amonio: /[µμu]g\/dL/i, Cortisol: /[µμu]g\/dL/i };   // micro: µ (U+00B5) o μ griega (U+03BC)
  function numeroLab(s) { var t = String(s || "").trim().replace(",", "."), m = /^([<>]=?)?\s*(-?\d+(?:\.\d+)?)$/.exec(t); if (!m) return null; return { v: Number(m[2]), cens: m[1] || "" }; }
  // v0.7.1: NHC del informe. Donantes (basal, pre-perfusión y perfusión) y receptor (basal y seguimiento) tienen NHC distintos (Configuración → General).
  if (DEF.general) { if (DEF.general.nhc_donantes === undefined) DEF.general.nhc_donantes = "3306230"; if (DEF.general.nhc_receptor === undefined) DEF.general.nhc_receptor = "3306231"; }
  function soloDig(x) { return String(x === null || x === undefined ? "" : x).replace(/\D/g, ""); }
  // Lectura robusta: el campo «Paciente» llega partido («NHC_33062» y «30» en otra línea, o «NHC_33062 / 30») y el NHC aparece además suelto («3306230»).
  // Devuelve { nhc, sujeto: "donante"|"receptor"|null, candidatos }
  function leerNHC(texto, opc) {
    opc = opc || {}; var t = String(texto || ""), don = soloDig(opc.nhc_donantes !== undefined ? opc.nhc_donantes : (DEF.general || {}).nhc_donantes), rec = soloDig(opc.nhc_receptor !== undefined ? opc.nhc_receptor : (DEF.general || {}).nhc_receptor), cand = [];
    var re = /NHC[_\s:]*(\d{3,})[\s\/_-]*(\d{1,4})?(?!\d)/gi, mm;
    var nhcPat = []; while ((mm = re.exec(t))) { var a = mm[1], b = mm[2] || ""; if (b) { cand.push(a + b); nhcPat.push(a + b); } cand.push(a); }
    var sueltos = t.match(/(?:^|[^\d.,\/])(\d{6,9})(?![\d.,\/])/g) || []; sueltos.forEach(function (x) { cand.push(x.replace(/\D/g, "")); });
    var conocidos = [don, rec].filter(Boolean), nhc = null;
    for (var i = 0; i < cand.length && !nhc; i++) if (conocidos.indexOf(cand[i]) !== -1) nhc = cand[i];
    if (!nhc && nhcPat.length) nhc = nhcPat[0];   // NHC desconocido: el del campo «Paciente» (unido)
    return { nhc: nhc, sujeto: nhc && nhc === rec ? "receptor" : nhc && nhc === don ? "donante" : null, candidatos: cand };
  }
  C.leerNHC = leerNHC;
  // lineas: [{prueba, resultado, unidades, referencia}] (de pdf.js o de texto) · texto: todo el texto (para la cabecera) · opc: { nhc_donantes, nhc_receptor }
  function leerInformeLab(lineas, texto, opc) {
    var obs = /Observaciones:\s*([^\n]+)/i.exec(texto || ""), o = obs ? obs[1].trim() : "", out = { observaciones: o, codigo: null, horas: null, muestra: null, fecha: null, resultados: [], ignoradas: [] };
    var mc = /(HOME-PM-\d+)/i.exec(o) || /(HOME-PM-\d+)/i.exec(texto || ""); if (mc) out.codigo = mc[1].toUpperCase();
    var mh = /(\d+(?:[.,]\d+)?)\s*(HORAS?|H|MIN(?:UTOS)?)\b/i.exec(o); if (mh) out.horas = Number(mh[1].replace(",", ".")) / (/^MIN/i.test(mh[2]) ? 60 : 1); if (/BASAL/i.test(o)) out.horas = "basal"; if (/PRE[- ]?PERF|PREPERF/i.test(o)) out.horas = "pre";
    var mt = /\(([^)]+)\)\s*$/.exec(o), tipo = mt ? mt[1].toUpperCase() : ""; out.muestra = /PORTAL/.test(tipo) ? "POR" : /CAVA/.test(tipo) ? "CAV" : /BILIS/.test(tipo) ? "BILIS" : /INMUNO/.test(tipo) ? "INMUNO" : /RECEPTOR/.test(tipo) ? "REC" : "ART"; out.tipo = tipo;
    var nh = leerNHC(texto, opc); out.nhc = nh.nhc; out.sujeto = nh.sujeto; if (nh.sujeto === "receptor" && out.muestra !== "INMUNO") out.muestra = "REC";   // v0.7.1: el NHC del receptor manda
    var mf = /F\.\s*Obtenci[oó]n muestra:[\s\S]{0,200}?(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/i.exec(texto || "") || /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/.exec(texto || "");
    if (mf) out.fecha = mf[3] + "-" + mf[2] + "-" + mf[1] + "T" + mf[4] + ":" + mf[5] + ":00";
    (lineas || []).forEach(function (l) {
      var p = String(l.prueba || "").trim(), nv = numeroLab(l.resultado); if (!p) return;
      var reg = null; for (var i = 0; i < C.MAPA_LAB.length; i++) if (C.MAPA_LAB[i][0].test(p)) { reg = C.MAPA_LAB[i]; break; }
      if (!reg || !nv) { if (reg || nv) out.ignoradas.push({ prueba: p, resultado: l.resultado, motivo: !reg ? "Prueba sin variable en la app" : "Resultado no numérico" }); return; }
      var destino = reg[1] === "gas" ? (out.muestra === "BILIS" ? "BILIS" : out.muestra === "REC" ? "REC" : out.muestra === "INMUNO" ? "INMUNO" : out.muestra) : reg[1] === "inmuno" ? "INMUNO" : (out.muestra === "REC" ? "REC" : out.muestra === "BILIS" ? "BILIS" : "PERF");
      var f = reg[3] && UNIDAD_ORIGEN[reg[2]] && UNIDAD_ORIGEN[reg[2]].test(l.unidades || "") ? reg[3] : 1, val = r(nv.v * f, 3);
      if (out.resultados.some(function (x) { return x.muestra === destino && x.variable === reg[2]; })) return;   // la primera aparición manda
      out.resultados.push({ prueba: p, resultado: String(l.resultado).trim(), unidades: l.unidades || "", referencia: l.referencia || "", muestra: destino, variable: reg[2], valor: val, censurado: nv.cens, convertido: f !== 1 });
    });
    return out;
  }
  // Reconstruye las filas «Prueba · Resultado · Unidades · Referencia» a partir de los fragmentos de texto con su posición (pdf.js)
  function filasDeItems(items) {
    // v0.7: las líneas se agrupan con tolerancia (±2,5 pt): en los informes del HULP «Prueba» y «Resultado» de la cabecera difieren 0,8 pt
    var its = (items || []).filter(function (it) { return String(it.str || "").trim(); }).slice().sort(function (a, b) { return b.y - a.y || a.x - b.x; }), grupos = [];
    its.forEach(function (it) { var g = grupos[grupos.length - 1]; if (g && Math.abs(g.y - it.y) <= 2.5) g.l.push(it); else grupos.push({ y: it.y, l: [it] }); });
    var cab = null, out = [], txt = [];
    grupos.forEach(function (gr) { var l = gr.l.sort(function (a, b) { return a.x - b.x; }), s = l.map(function (x) { return x.str; }).join(" ").replace(/\s+/g, " ").trim(); txt.push(s);
      if (/^Prueba\s+Resultado\s+Unidades/i.test(s)) { cab = {}; l.forEach(function (x) { var k = x.str.trim(); if (/^Resultado/i.test(k)) cab.res = x.x; else if (/^Unidades/i.test(k)) cab.uni = x.x; else if (/Referencia|^I\./i.test(k)) cab.ref = cab.ref === undefined ? x.x : cab.ref; }); return; }
      if (!cab || cab.res === undefined) return;
      var f = { prueba: "", resultado: "", unidades: "", referencia: "", marca: "" };
      l.forEach(function (x) { var t = String(x.str).trim(); if (/^\*+$/.test(t)) { f.marca += t; return; }   // asterisco de fuera de rango
        var k = x.x < cab.res - 4 ? "prueba" : cab.uni !== undefined && x.x >= cab.uni - 4 && (cab.ref === undefined || x.x < cab.ref - 4) ? "unidades" : cab.ref !== undefined && x.x >= cab.ref - 4 ? "referencia" : "resultado"; f[k] = (f[k] + " " + t).trim(); });
      if (f.prueba && f.resultado) out.push(f);
    });
    return { filas: out, texto: txt.join("\n") };
  }
  // Alternativa sin posiciones: separa por expresión regular las líneas de texto plano
  function filasDeTexto(texto) {
    var out = []; String(texto || "").split(/\n/).forEach(function (s) {
      var m = /^((?:San|Srm\/Pla|Pla|Srm|Orn|Bil)-.+?|Ig[AGM]|C[34] SUERO)\s+([<>]?\s*-?\d+(?:,\d+)?)\s*(.*)$/.exec(s.trim()); if (!m) return;
      var resto = m[3], ref = "", uni = ""; var mr = /^(<?\s*-?\d+(?:,\d+)?\s*(?:-\s*-?\d+(?:,\d+)?)?\**)\s*(.*)$/.exec(resto.trim()); if (mr) { ref = mr[1]; uni = mr[2]; } else uni = resto;
      out.push({ prueba: m[1].trim(), resultado: m[2].replace(/\s+/g, ""), unidades: uni.trim(), referencia: ref.trim() });
    });
    return out;
  }
  C.leerInformeLab = leerInformeLab; C.filasDeItems = filasDeItems; C.filasDeTexto = filasDeTexto; C.numeroLab = numeroLab;

  // ============================================================== 8. Objetivos revisados (pO₂ arterial con valores arteriales habituales)
  if (DEF.objetivos && DEF.objetivos.ART) DEF.objetivos.ART.pO2 = [80, 100];

  C.puntosMuestreo = puntosMuestreo; C.puntosInmuno = puntosInmuno; C.avisosMuestreo = avisosMuestreo; C.puntosHDF = puntosHDF; C.registroPermitido = registroPermitido; C.cfgMuestreo = cfgM;
  return C;
});

;(window.HOME_MODS = window.HOME_MODS || {})["calc7.js"] = "0.7.3";
