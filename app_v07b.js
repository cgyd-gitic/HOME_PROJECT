/* HOME · v0.7 (b): Seguimiento (registro, HDF, infusiones, perfusato, cierre, post-trasplante), avisos de muestreo/HDF/resumen diario,
   importación de informes del laboratorio (PDF o texto) y Configuración → HDF y → Horario circadiano por protocolo. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function cfgH() { return S.cfg.hdf || C.DEF.hdf; }
  function idq(e) { return encodeURIComponent(e.ID); }
  function tH(m) { var a = C.num(m.T_real_h); return a !== null ? a : C.num(m.T_nominal_h) || 0; }
  function seg(base, lista, act, extraCls) { return '<div class="segmentado' + (extraCls ? " " + extraCls : "") + '" role="tablist">' + lista.map(function (x) { return '<button role="tab" aria-selected="' + (x[0] === act) + '" class="' + (x[0] === act ? "activo" : "") + '" data-act="irSub" data-r="' + base + "/" + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>"; }
  function coma(x, d) { return x === null || x === undefined || !isFinite(x) ? "—" : H.n(x, d === undefined ? 1 : d); }
  function info(texto) { return '<button type="button" class="bt-info" data-act="infoTexto" data-t="' + esc(texto) + '" aria-label="Más información" title="' + esc(texto) + '">' + ico("info", "s") + "</button>"; }
  H.acc.infoTexto = function (el) { H.modal({ titulo: "Información", cuerpo: "<p>" + esc(el.getAttribute("data-t")) + "</p>", pie: '<button class="bt pri" data-cerrar>Entendido</button>' }); };
  H.v07b = { info: info };

  // ============================================================== 1. Estado «Trasplante»
  var MOT_TX = "Trasplante del injerto";
  function motivoCierre(e) { var d = e ? H.form(e.ID, "cierre", "") : null; return d && d.motivo ? d.motivo : ""; }
  var tipoOrig = C.tipoProc;
  C.tipoProc = function (e) { if (e && (e.Estado === "Trasplante" || (e.ID && motivoCierre(e) === MOT_TX))) return "trasplante"; return tipoOrig(e); };
  var chipOrig = H.estadoChip;
  H.estadoChip = function (est) { return est === "Trasplante" ? '<span class="chip info">Trasplante</span>' : chipOrig(est); };

  // ============================================================== 2. Fin de la perfusión: cronómetro parado y registros restringidos
  H.perfTerminada = function (exp) { var e = H.exp(exp); if (!e) return false; return e.Estado === "Finalizado" || e.Estado === "Trasplante" || e.Estado === "Cancelado" || !!H.eventos(exp).fin_perfusion; };
  H.finPerf = function (exp) {
    if (!H.perfTerminada(exp)) return null; var e = H.exp(exp), f = H.eventos(exp).fin_perfusion || e.Fin_perfusion; if (f) return f;
    var u = H.med(exp).map(function (m) { return m.Fecha_hora; }).filter(Boolean).sort().pop(); return u || H.inicioPerf(exp);
  };
  function finH(exp) { var t0 = H.inicioPerf(exp), f = H.finPerf(exp); return t0 && f ? C.horasEntre(t0, f) : null; }
  var ticOrig = H.tic;
  H.tic = function (inm) {
    try { var mapa = {}; H.listaExp().forEach(function (e) { var t0 = H.inicioPerf(e.ID), f = t0 && H.finPerf(e.ID); if (f) mapa[C.aFecha(t0).getTime()] = f; });
      H.$$("[data-crono]").forEach(function (el) { if (el.hasAttribute("data-hasta")) return; var d = C.aFecha(el.getAttribute("data-crono")); if (d && mapa[d.getTime()]) el.setAttribute("data-hasta", mapa[d.getTime()]); });
    } catch (x) { }
    return ticOrig(inm);
  };
  var paOrig = H.puntoAhora, ppOrig = H.proximoPunto, planOrig = H.puntosPlan;
  H.puntoAhora = function (exp) { return H.perfTerminada(exp) ? null : paOrig(exp); };
  H.proximoPunto = function (exp) { return H.perfTerminada(exp) ? null : ppOrig(exp); };
  // registros urgentes (después del fin y fuera de los puntos del muestreo): Formularios «urgentes»
  function urgentes(exp) { var f = H.form(exp, "urgentes", ""); return (f && f.lista) || []; }
  var MUESTRAS_URG = /^(PERF|ART|POR|CAV|FLUJO|BILIS|HDF|INMUNO)$/;
  H.puntosPlan = function (exp, muestra) {
    var l = planOrig(exp, muestra);
    if (muestra === "HDF") l = planHDF(exp);
    if (muestra === "INMUNO") l = planInmuno(exp);   // v0.7.1: inmunología en la pre-perfusión y cada 24 h (tubo amarillo)
    var fh = finH(exp); if (fh !== null) l = l.filter(function (p) { return p.t_h === null || p.t_h === undefined || p.t_h <= fh + 0.75; });
    if (MUESTRAS_URG.test(muestra)) urgentes(exp).forEach(function (u) { if (!l.some(function (p) { return p.punto === u.punto; })) l.push({ punto: u.punto, t_h: u.t_h, fecha: u.fecha, urgente: true }); });
    return l;
  };
  // HDF: pre-perfusión aparte (PRE_HDF); cada hora las primeras 24 h y después en los puntos del muestreo
  function planHDF(exp) {
    var t0 = H.inicioPerf(exp), dias = S.cfg.general.dias_perfusion, m = S.cfg.muestreo;
    if (!t0) { var o = []; for (var h = 1; h <= 24; h++) o.push({ punto: h + " h", t_h: h, fecha: null }); return o; }
    return C.puntosHDF(t0, dias, m).map(function (p) { return { punto: p.etiqueta.replace(/^HDF /, ""), t_h: p.t_h, fecha: p.fecha.toISOString() }; });
  }
  H.planHDF = planHDF;
  // v0.7.1: puntos de inmunología de la perfusión (24 h y después el punto de las 10:00 de cada día, con tubo amarillo)
  function planInmuno(exp) { var t0 = H.inicioPerf(exp); if (!t0) return []; return C.puntosInmuno(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo).map(function (p) { return { punto: p.etiqueta, t_h: p.t_h, fecha: p.fecha.toISOString() }; }); }
  H.planInmuno = planInmuno;
  function puntosMuestreoHasta(exp) { var t0 = H.inicioPerf(exp); if (!t0) return []; var fh = finH(exp); return C.puntosMuestreo(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo).filter(function (p) { return fh === null || p.t_h <= fh + 0.75; }); }
  var anadirOrig = H.acc.añadirPunto;
  H.acc.añadirPunto = function (el) {
    var exp = el.getAttribute("data-exp"); if (!H.perfTerminada(exp)) return anadirOrig(el);
    registroUrgente(exp);
  };
  function registroUrgente(exp) {
    var fin = H.finPerf(exp);
    H.modal({ titulo: "Registro urgente", cuerpo: '<div class="aviso aj">' + ico("triangle-alert") + "<div>La perfusión terminó el " + esc(H.diaCorto(fin) + " " + H.hora(fin)) + ". Solo se registran los puntos del muestreo; un punto adicional solo se admite si fue una <b>urgencia</b>, con su motivo.</div></div>" +
      '<div class="rejilla dos"><div class="campo"><label class="et" for="urF">Fecha y hora de la muestra</label><input id="urF" type="datetime-local" value="' + H.aLocal(fin) + '"></div><div class="campo"><label class="et" for="urM">Motivo de la urgencia</label><input id="urM" autocomplete="off" placeholder="Qué pasó y por qué se tomó la muestra"></div></div>',
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="urOk">Añadir el registro urgente</button>',
      alAbrir: function (d) {
        d.querySelector("#urOk").addEventListener("click", function () {
          var f = H.deLocal(d.querySelector("#urF").value), mot = d.querySelector("#urM").value.trim(), t0 = H.inicioPerf(exp);
          if (!f) { H.toast("Indica la fecha y hora.", "error"); return; }
          var pts = puntosMuestreoHasta(exp), cerca = pts.filter(function (p) { return Math.abs(p.fecha - C.aFecha(f)) <= 45 * 6e4; })[0];
          if (C.registroPermitido(pts, f) && cerca) { H.toast("Esa hora corresponde al punto «" + cerca.etiqueta + "» del muestreo: regístralo en esa columna.", "error"); return; }
          if (!mot) { H.toast("Indica el motivo de la urgencia.", "error"); d.querySelector("#urM").focus(); return; }
          var th = t0 ? C.r(C.horasEntre(t0, f), 2) : null, et = "Urgente " + H.diaCorto(f) + " " + H.hora(f), fu = H.copia(H.form(exp, "urgentes", "") || {}); fu.lista = fu.lista || [];
          fu.lista.push({ punto: et, t_h: th, fecha: f, motivo: mot, por: (S.usuario || {}).nombre || "" }); H.guardarForm(exp, "urgentes", "", fu);
          H.guardar("Eventos", [{ ID: H.uid(), Experimento: exp, Tipo: "incidencia", Fecha_hora: f, Nota: "Registro urgente tras el fin de la perfusión («" + et + "»): " + mot }], { sinRepintar: true });
          d.close(); H.toast("Registro urgente añadido: «" + et + "»."); H.repintar();
        });
      } });
  }
  H.registroUrgente = registroUrgente;
  H.acc.registroUrgente = function (el) { registroUrgente(el.getAttribute("data-exp")); };
  function avisoTerminada(e) {
    var fin = H.finPerf(e.ID), mot = motivoCierre(e);
    return '<div class="aviso info aviso-fin">' + ico("circle-stop") + "<div><b>Perfusión terminada</b> el " + esc(H.diaCorto(fin) + " " + H.hora(fin)) + (mot ? " · " + esc(mot) : "") + ". El cronómetro está parado. Solo se pueden completar los puntos del muestreo hasta el fin" +
      (H.puede("registrar") ? ' o añadir un <button class="bt mini" data-act="registroUrgente" data-exp="' + esc(e.ID) + '">' + ico("siren", "s") + "Registro urgente</button>" : "") + ".</div></div>";
  }
  function tiraTerminada(e) {
    var t0 = H.inicioPerf(e.ID), fin = H.finPerf(e.ID);
    return '<div class="cronos dos"><div class="crono"><div class="et">Perfusión terminada · duración</div><div class="t" data-crono="' + esc(t0) + '" data-hasta="' + esc(fin) + '">--:--:--</div></div><div class="crono"><div class="et">Fin de la perfusión</div><div class="t pequeno">' + esc(H.diaCorto(fin) + " " + H.hora(fin)) + "</div></div></div>";
  }

  // ============================================================== 3. Pre-perfusión = punto 0 h (una sola toma, visible en los dos sitios)
  var IDS = function (m) { var o = {}; (C.MUESTRAS[m] || { vars: [] }).vars.forEach(function (v) { o[v.id] = 1; }); return o; };
  var GASV = IDS("ART"), BQV = IDS("PERF"), PREV = IDS("PRE"), P0 = "0 min";
  function parPre(m, p, v) {
    if (m === "PRE" && p === "Pre") return GASV[v] ? ["ART", P0, 0] : BQV[v] ? ["PERF", P0, 0] : null;
    if (p === P0 && PREV[v] && ((m === "ART" && GASV[v]) || (m === "PERF" && BQV[v]))) return ["PRE", "Pre", null];
    return null;
  }
  H.parPre = parPre;
  var valorOrig = H.valor;
  H.valor = function (exp, m, p, v) { var x = valorOrig(exp, m, p, v); if (x) return x; var q = parPre(m, p, v); return q ? valorOrig(exp, q[0], q[1], v) : null; };
  var guardarMedOrig = H.guardarMediciones;
  H.guardarMediciones = function (exp, m, p, tnom, fecha, valores, opc) {
    var propios = {}, otros = {}, dest = null, hay = false;
    Object.keys(valores || {}).forEach(function (v) { var q = parPre(m, p, v); if (q && !valorOrig(exp, m, p, v) && valorOrig(exp, q[0], q[1], v)) { (otros[q[0]] = otros[q[0]] || { q: q, o: {} }).o[v] = valores[v]; } else { propios[v] = valores[v]; hay = true; } });
    var ps = []; if (hay || !Object.keys(otros).length) ps.push(guardarMedOrig(exp, m, p, tnom, fecha, propios, opc));
    Object.keys(otros).forEach(function (k) { var x = otros[k]; ps.push(guardarMedOrig(exp, x.q[0], x.q[1], x.q[2], fecha, x.o, opc)); });
    if (/^(BILIS|HDF|PERF|FLUJO|ART)$/.test(m)) H.retrasar("revHDF|" + exp, 1500, function () { H.revisarHDF(exp); });
    if (/^(ART|POR|CAV|PERF|FLUJO|BILIS|HDF)$/.test(m)) H.retrasar("revRes|" + exp, 1800, function () { H.revisarResumen(exp); });
    return ps.length === 1 ? ps[0] : Promise.all(ps);
  };

  // ============================================================== 4. Rejillas: filas de grupo fijas al desplazar y mismo diseño en todas las tablas
  function gruposFijos(h) { return String(h).replace(/<th class="grupo" colspan="(\d+)">([^<]*)<\/th>/g, '<th class="grupo" colspan="$1"><span class="g-fijo">$2</span></th>'); }
  var hojaOrig = H.hojaHTML;
  H.hojaHTML = function (exp, muestra, opc) { return gruposFijos(hojaOrig(exp, muestra, opc)); };
  // Tabla de columnas fijas con el diseño de la hoja de la perfusión (basal, pre-perfusión, receptor)
  function tablaHoja(e, cols, vars, opc) {
    opc = opc || {}; var puedo = H.puede("registrar"), grupo = null;
    var cab = '<tr><th class="var" scope="col">Variable</th>' + cols.map(function (c) { return '<th scope="col">' + esc(c.et) + (c.sub ? '<span class="hora">' + esc(c.sub) + "</span>" : "") + "</th>"; }).join("") + "</tr>";
    var cuerpo = vars.filter(function (v) { return !v.calculada; }).map(function (v) {
      var g = ""; if (v.grupo && v.grupo !== grupo) { grupo = v.grupo; g = '<tr><th class="grupo" colspan="' + (cols.length + 1) + '"><span class="g-fijo">' + esc(grupo) + "</span></th></tr>"; }
      var uni = H.unidadVisible(v.id, v.unidad);
      return g + '<tr><th class="var" scope="row">' + esc(v.nombre) + (uni ? '<span class="u">' + esc(uni) + "</span>" : "") + "</th>" + cols.map(function (c) {
        var x = H.valor(e.ID, c.m, c.p, v.id), val = x ? (C.num(x.Valor) !== null ? String(H.aVista(v.id, x.Valor)).replace(".", ",") : x.Texto) : "", cl = x ? H.claseValor((C.MUESTRAS_BASALES || []).indexOf(c.m) !== -1 ? c.m : opc.objM || c.m, v.id, x.Valor) + (H.pendiente(x) ? " pend" : "") : "";
        return '<td><input class="' + cl + '" inputmode="decimal" autocomplete="off" aria-label="' + esc(v.nombre + " · " + c.et) + '" value="' + esc(val || "") + '" data-cambio="celda" data-exp="' + esc(e.ID) + '" data-m="' + c.m + '" data-p="' + esc(c.p) + '" data-t="' + (c.t === undefined || c.t === null ? "" : c.t) + '" data-f="' + esc(c.f || "") + '" data-v="' + v.id + '"' + (puedo ? "" : " readonly") + "></td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="hoja tabla-fija" role="region" aria-label="' + esc(opc.titulo || "Tabla de registro") + '" tabindex="0"><table class="h"><thead>' + cab + "</thead><tbody>" + cuerpo + "</tbody></table></div>";
  }
  H.tablaHoja = tablaHoja;

  // ============================================================== 5. Seguimiento: niveles y pestañas
  var segPrev = H.tabsExp.seguimiento;
  var SUB_PRE = [["protocolo", "Tabla de infusiones"], ["calculos", "Cálculos del perfusato"], ["gas", "Gasometría"], ["bq", "Bioquímica"], ["hdf", "HDF"], ["inmuno", "Inmunología"], ["pdf", "Subir PDF"], ["registro", "Eventos"]];
  var SUB_PERF = [["registrar", "Registrar"], ["gas", "Gasometría"], ["bq", "Bioquímica"], ["flujos", "Flujos y O₂"], ["bilis", "Bilis"], ["hdf", "HDF"], ["inmuno", "Inmunología"], ["fotos", "Fotos"], ["pdf", "Subir PDF"], ["registro", "Eventos"], ["plan", "Plan y avisos"]];
  var SUB_POST = [["supervision", "Supervisión y medicación"], ["eval", "Evaluación funcional"], ["bq", "Bioquímica y gasometría"], ["pdf", "Subir PDF"], ["eutanasia", "Eutanasia"]];
  H.SUB_SEG = { pre: SUB_PRE, perf: SUB_PERF, post: SUB_POST };
  function tx(e) { return C.tipoProc(e) === "trasplante"; }
  var RE_TIRA = /<div class="cronos dos">(?:<div class="crono[^"]*"><div class="et">[\s\S]*?<\/div><div class="t[^"]*"[^>]*>[\s\S]*?<\/div><\/div>){2}<\/div>/;
  H.tabsExp.seguimiento = function (e, p, q) {
    p = p || []; q = q || {}; var niv = p[0], sub = p[1], t0 = H.inicioPerf(e.ID), niveles = [["pre", "Preperfusión"], ["perf", "Perfusión"]].concat(tx(e) ? [["post", "Post-trasplante"]] : []);
    if (niv === "pdf") { niv = t0 ? "perf" : "pre"; sub = "pdf"; }
    if (!niveles.some(function (x) { return x[0] === niv; })) { if (niv && SUB_PERF.some(function (x) { return x[0] === niv; })) { sub = niv; niv = "perf"; } else niv = t0 ? "perf" : "pre"; }
    var lista = H.SUB_SEG[niv], base = "exp/" + idq(e) + "/seguimiento";
    if (!lista.some(function (x) { return x[0] === sub; })) sub = niv === "pre" ? (H.protocoloConfirmado(e) ? "gas" : "protocolo") : niv === "post" ? "supervision" : (t0 ? "registrar" : "gas");
    var cab = seg(base, niveles, niv, "nivel"), subSeg = seg(base + "/" + niv, lista, sub, "sub2"), mio = cuerpoPropio(e, niv, sub, q), term = t0 && H.perfTerminada(e.ID);
    if (mio !== null) return cab + (niv === "perf" ? (term ? tiraTerminada(e) + avisoTerminada(e) : tiraViva(e)) : "") + subSeg + mio;
    var h = segPrev(e, [niv, sub], q);
    h = h.replace(/<div class="segmentado sub2" role="tablist">[\s\S]*?<\/div>/, subSeg);
    if (niv === "perf" && term) h = h.replace(RE_TIRA, tiraTerminada(e) + avisoTerminada(e));
    return gruposFijos(grisesAInfo(h, niv, sub));
  };
  // v0.7.1: las notas grises importantes de las pestañas de otros módulos pasan a una (i); los avisos del plan se ven en formato lista
  function grisesAInfo(h, niv, sub) {
    h = String(h);
    if (sub === "plan") {
      var mp = /<p class="muy-tenue">(Llegan como notificación push[^<]*)<\/p>/.exec(h);
      if (mp) h = h.replace(mp[0], "").replace("<h3>Avisos programados</h3>", "<h3>Avisos programados</h3>" + info(mp[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&")));
      h = h.replace(/<td class="envolver"><b>/g, '<td class="envolver aviso-txt"><b>');
    }
    if (sub === "flujos") { var mv = /<p class="muy-tenue" style="margin-top:8px">(VO₂ = [^<]*)<\/p>/.exec(h); if (mv) h = h.replace(mv[0], '<div class="et-info" style="margin-top:8px">Cómo se calcula el VO₂' + info(mv[1].replace(/&amp;/g, "&")) + "</div>"); }
    if (niv === "post") {
      h = h.replace(/<span class="muy-tenue">(1 = normal · 2 = alterado · 3 = nulo) · (si suma (\d+) dos veces seguidas, se sacrifica)<\/span>/, function (m0, a, b, n) { return '<span class="muy-tenue">' + a + "</span>" + info("Criterio de sacrificio: si la evaluación suma " + n + " puntos en dos evaluaciones seguidas, se sacrifica al receptor."); });
      h = h.replace(", hora provisional: anota el fin en Cirugía → Receptor).", ').</p><p class="hora-prov"><span class="chip aj">Hora provisional del tiempo 0</span>' + info("Hasta que se anote la hora de fin de la cirugía del receptor en Cirugía → Receptor, el tiempo 0 se toma a las 12:00 del día del trasplante."));
    }
    return h;
  }
  function tiraViva(e) {
    var t0 = H.inicioPerf(e.ID), prox = H.proximoPunto(e.ID); if (!t0) return '<div class="aviso info">' + ico("info") + '<div>La perfusión no ha empezado: regístrala en <a href="#/exp/' + idq(e) + '/quirofano">Quirófano</a>.</div></div>';
    return '<div class="cronos dos"><div class="crono activo"><div class="et">Perfusión · día ' + (Math.floor(C.horasEntre(t0, new Date()) / 24) + 1) + '</div><div class="t" data-crono="' + esc(t0) + '">--:--:--</div></div>' +
      (prox ? '<div class="crono"><div class="et">Próxima muestra · ' + esc(prox.etiqueta) + " · " + esc(H.hora(prox.fecha)) + '</div><div class="t" data-cuenta="' + prox.fecha.toISOString() + '">--:--</div></div>' : '<div class="crono"><div class="et">Próxima muestra</div><div class="t pequeno">Sin muestras pendientes</div></div>') + "</div>";
  }
  function cuerpoPropio(e, niv, sub, q) {
    if (sub === "pdf") return H.pdfPantalla(e, niv);
    if (niv === "pre") {
      if (sub === "protocolo") return H.tablaInfusiones(e);
      if (sub === "calculos") return H.calculosV7(e);
      if (sub === "gas") return preTabla(e, "gas"); if (sub === "bq") return preTabla(e, "bq"); if (sub === "inmuno") return preTabla(e, "inmuno"); if (sub === "hdf") return H.hdfPre(e);
      return null;
    }
    if (niv === "perf") {
      if (sub === "registrar") return H.registrarV7(e, q); if (sub === "hdf") return H.hdfPerf(e, q);
      if (sub === "inmuno") return inmunoPerf(e, q);
      return null;
    }
    if (niv === "post") { if (sub === "bq") return H.postBq(e); if (sub === "supervision") return H.postSupervision(e); }
    return null;
  }
  // ---- tablas de la pre-perfusión: basal del donante de hígado y pre-perfusión (= 0 h). Sin basal del donante de sangre.
  var COLS_PRE = [{ m: "BASAL_LD", p: "Basal", et: "Basal", sub: "donante de hígado" }, { m: "PRE", p: "Pre", et: "Pre-perfusión", sub: "= 0 h de la perfusión" }];
  var GAS_IDS = ["pH", "pO2", "pCO2", "sO2", "HCO3", "BE", "Hb", "Lactato", "Glucosa", "Na", "K", "Ca", "Cl"];
  function preTabla(e, tipo) {
    var nota = { gas: "Basal del donante de hígado: con el animal intubado y antes de empezar la cirugía. Pre-perfusión: una sola jeringa del perfusato con la HDF ya en marcha; sus valores son los del punto 0 h de la perfusión (se ven y se editan en los dos sitios). No se toma basal del donante de sangre.",
      bq: "Pre-perfusión: tubo de heparina de litio pediátrico, citrato pediátrico y tubo amarillo. Son los valores del punto 0 h de la perfusión.", inmuno: "La inmunología se hace en la pre-perfusión (del tubo amarillo) y después cada 24 h durante la perfusión, del tubo amarillo de las 24 h y del punto de las 10:00 de cada día (pestaña Perfusión → Inmunología). No se toma en la basal." }[tipo];
    var vars = tipo === "gas" ? C.MUESTRAS.ART.vars : tipo === "bq" ? C.MUESTRAS.PERF.vars.filter(function (v) { return GAS_IDS.indexOf(v.id) === -1; }) : C.MUESTRAS.INMUNO.vars;
    // v0.7.1: la inmunología no tiene basal; la columna «Basal» solo aparece si ya hay datos guardados en ella
    var cols = tipo === "inmuno" && !H.med(e.ID).some(function (m) { return m.Muestra === "BASAL_LD" && !m.Borrado && vars.some(function (v) { return v.id === m.Variable; }); }) ? COLS_PRE.slice(1) : COLS_PRE;
    var tit = tipo === "gas" ? "Gasometría basal y pre-perfusión" : tipo === "bq" ? "Bioquímica basal y pre-perfusión" : "Inmunología de la pre-perfusión";
    return titInfo(tit, nota) + pieTabla(e) + tablaHoja(e, cols, vars, { objM: tipo === "gas" ? "ART" : tipo === "bq" ? "PERF" : null, titulo: tit });
  }
  // v0.7.1: título con su (i) (las notas importantes no van en gris debajo)
  function titInfo(tit, nota, nivel) { return '<div class="tit-info"><' + (nivel || "h3") + ">" + esc(tit) + "</" + (nivel || "h3") + ">" + info(nota) + "</div>"; }
  H.titInfo = titInfo;
  function pieTabla(e) { return '<div class="pie-hoja"><span class="muy-tenue">Enter o ↓ pasan a la celda de abajo · fuera de objetivo en rojo · también puedes <a href="#/exp/' + idq(e) + '/seguimiento/pdf">subir el informe del laboratorio</a></span></div>'; }
  function inmunoPerf(e, q) {
    var pl = planInmuno(e.ID), hay = pl.length || H.med(e.ID).some(function (m) { return m.Muestra === "INMUNO"; });
    return titInfo("Inmunología: pre-perfusión y cada 24 h", "La inmunología se toma en la pre-perfusión y cada 24 h durante la perfusión: del tubo amarillo (suero con gel) de las 24 h y del punto de las 10:00 de cada día (" + pl.map(function (p) { return p.punto; }).join(", ") + "). No hace falta un tubo más: sale del mismo tubo amarillo. Los informes del laboratorio de inmunología (Subir PDF) van a estos puntos según sus horas.") +
      '<div class="pie-hoja">' + (H.puede("registrar") ? '<button class="bt mini" data-act="añadirPunto" data-exp="' + esc(e.ID) + '" data-m="INMUNO">' + ico("plus", "s") + (H.perfTerminada(e.ID) ? "Registro urgente" : "Punto fuera de protocolo") + "</button>" : "") + '<a class="muy-tenue" href="#/exp/' + idq(e) + '/seguimiento/pre/inmuno">Pre-perfusión</a></div>' + (hay || (H.extraCols || {})[e.ID + "|INMUNO"] ? H.hojaHTML(e.ID, "INMUNO", { todos: true }) : '<p class="tenue">Los puntos de inmunología aparecen al iniciar la perfusión.</p>');
  }

  // ============================================================== 6. Registrar (bloques alineados, epoprostenol, HDF con recomendaciones)
  H.registrarV7 = function (e, q) {
    var h = H.segExtra.registrar(e, ["registrar"], q), pa = H.puntoAhora(e.ID), puedo = H.puede("registrar");
    var mp = /<option value="([^"]*)" selected>/.exec(h), punto = mp ? mp[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">") : null, mt = /data-m="FLUJO" data-p="[^"]*" data-t="([^"]*)" data-f="([^"]*)"/.exec(h);
    var extra = '<div class="reg-hdf-extra">' + consejoCuerpo(e) + "</div>" + '<div class="fila-flex reg-hdf-fila">' + (puedo && pa ? '<button class="bt mini" data-act="hdfFijos" data-exp="' + esc(e.ID) + '" data-m="HDF" data-p="' + esc(pa.punto) + '" data-t="' + pa.t_h + '">' + ico("wand-sparkles", "s") + "Registrar los parámetros fijos de la HDF</button>" : "") +
      '<span class="et-info">Cuándo se registra la HDF' + info("Las variables de la HDF se registran cada hora las primeras 24 h (pestaña HDF) y después en los puntos del muestreo.") + "</span></div>";
    h = h.replace(/(<details class="reg-bloque" id="reg_hdf"[^>]*><summary>[\s\S]*?<\/summary><div class="dentro">)/, "$1" + extra);
    h = cabeceraReg(e, h, punto, puedo);
    h = h.replace('<p class="muy-tenue">El volumen es lo recogido desde la medición anterior; con él se calcula la producción (mL/h) y se ajusta la extracción de la HDF.</p>', '<p class="et-info">Qué volumen se anota' + info("El volumen de bilis es lo recogido desde la medición anterior; con él se calcula la producción (mL/h) y se ajusta la extracción de la HDF.") + "</p>");
    if (punto) h = h.replace('<div class="fila-flex" id="regDeriv"', epoHTML(e, punto, mt ? mt[1] : "", mt ? mt[2] : "", puedo) + '<div class="fila-flex" id="regDeriv"');
    return h;
  };
  // ---- v0.7.1: cabecera del registro alineada (punto · bloques · unidad de gases); los bloques (gris = sin datos, amarillo = incompleto,
  //      verde = completo) son botones que abren el formulario de ese bloque del punto elegido
  var BLOQUES_REG = { "Gasometrías": "gas", "Flujos": "flu", "Bilis": "bil", "Bioquímica": "bq", "HDF": "hdf", "Foto": "foto", "Falta la foto": "foto" };
  function cabeceraReg(e, h, punto, puedo) {
    var i = h.indexOf('<section class="tarjeta reg-cab">'); if (i === -1) return h; var j = h.indexOf("</section>", i); if (j === -1) return h;
    var sec = h.slice(i, j + 10), sel = /<select id="regPunto"[\s\S]*?<\/select>/.exec(sec), res = /<div class="reg-resumen">([\s\S]*?)<\/div>/.exec(sec), uni = /<div class="segmentado" aria-label="Unidad de gases">[\s\S]*?<\/div>/.exec(sec);
    if (!sel || !res) return h;
    var chips = res[1].replace(/<span class="chip ?([a-z]*) ?">([^<]*)<\/span>/g, function (m0, cl, tx) {
      var nom = String(tx).replace(/\s+\d+\/\d+$/, "").trim(), b = BLOQUES_REG[nom]; if (!b) return m0;
      var est = cl === "ok" ? "completo" : cl === "aj" ? (b === "foto" ? "pendiente" : "incompleto") : "sin datos";
      return '<button type="button" class="chip ' + cl + ' reg-ir" data-act="regIrBloque" data-b="' + b + '" data-exp="' + esc(e.ID) + '" data-p="' + esc(punto || "") + '" aria-label="' + esc(nom + " (" + est + "): abrir el formulario de este punto") + '" title="Abrir y rellenar">' + esc(tx) + "</button>";
    });
    var nueva = '<section class="tarjeta reg-cab"><div class="reg-cab-rej"><div class="campo reg-c-punto"><span class="et"><label for="regPunto">Punto de muestreo</label>' + info("Elige el punto y pulsa un bloque para abrir su formulario: gris = sin datos, amarillo = incompleto, verde = completo. Cada valor se guarda al salir de la casilla; en rojo, fuera del objetivo; debajo de cada casilla, el objetivo y el valor anterior." + (H.perfTerminada(e.ID) ? " La perfusión ha terminado: solo se pueden completar los puntos del muestreo hasta el fin (o un registro urgente)." : "")) + "</span>" + sel[0] + "</div>" +
      '<div class="campo reg-c-bloques"><span class="et">Bloques de este punto</span><div class="reg-resumen">' + chips + (puedo ? "" : '<span class="chip">Solo lectura</span>') + "</div></div>" +
      (uni ? '<div class="campo reg-c-unidad"><span class="et">Unidad de gases</span>' + uni[0] + "</div>" : "") + "</div></section>";
    return h.slice(0, i) + nueva + h.slice(j + 10);
  }
  // ¿se puede registrar en este punto? Con la perfusión terminada, solo los puntos del muestreo hasta el fin (C.registroPermitido) o un registro urgente
  function puntoPermitido(exp, punto) {
    if (!H.perfTerminada(exp)) return true; if (urgentes(exp).some(function (u) { return u.punto === punto; })) return true;
    var pts = puntosMuestreoHasta(exp), p = pts.filter(function (x) { return x.etiqueta === punto; })[0]; return !!p && C.registroPermitido(pts, p.fecha);
  }
  H.regPuntoPermitido = puntoPermitido;
  H.acc.regIrBloque = function (el) {
    var exp = el.getAttribute("data-exp"), b = el.getAttribute("data-b"), sel = H.$("#regPunto"), pto = (sel && sel.value) || el.getAttribute("data-p");
    if (!puntoPermitido(exp, pto)) { H.toast("La perfusión ha terminado: «" + pto + "» no es un punto del muestreo hasta el fin. Usa «Registro urgente».", "error"); return; }
    var d = H.$("#reg_" + b); if (!d) return; d.open = true; d.setAttribute("open", "");
    try { d.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (x) { }
    var inp = Array.prototype.filter.call(d.querySelectorAll(".dentro input:not([readonly]):not([disabled]):not([type=file]), .dentro select:not([disabled])"), function (x) { return !x.value; })[0] || d.querySelector(".dentro input:not([readonly]), .dentro button");
    if (inp && inp.focus) try { inp.focus({ preventScroll: true }); } catch (x) { inp.focus(); }
  };
  // ---- epoprostenol (Veletri 5 µg/mL) según el flujo de la arteria hepática: propuesta a validar
  function epoRec(e, punto) {
    var q = H.valor(e.ID, "FLUJO", punto, "Q_AH"), pr = H.valor(e.ID, "FLUJO", punto, "P_AH"), a = H.valor(e.ID, "FLUJO", punto, "Epoprostenol") || H.ultimo(e.ID, "FLUJO", "Epoprostenol");
    var r = q ? C.epoprostenol(C.num(q.Valor), pr ? C.num(pr.Valor) : null, a ? C.num(a.Valor) : 0, S.cfg.epoprostenol) : null;
    if (!q) return '<span class="muy-tenue">Con el flujo de la arteria hepática se propone iniciar, ajustar o suspender el epoprostenol.</span>';
    if (!r) return '<span class="muy-tenue">Flujo arterial en rango: no se propone epoprostenol.</span>';
    return '<div class="rec ' + (r.nivel === "alerta" ? "alerta" : r.nivel === "ok" ? "ok" : "ajuste") + '">' + ico(r.nivel === "alerta" ? "triangle-alert" : "pill", "s") + "<div><b>Propuesta a validar:</b> " + esc(r.texto) + "</div></div>";
  }
  function epoHTML(e, punto, t, f, puedo) {
    var x = H.valor(e.ID, "FLUJO", punto, "Epoprostenol"), val = x && C.num(x.Valor) !== null ? String(x.Valor).replace(".", ",") : "";
    return '<div class="reg-epo"><h4 class="reg-grupo">Epoprostenol (Veletri 0,5 mg en 100 mL = 5 µg/mL) <span class="chip aj">Propuesta a validar</span></h4><div class="reg-rejilla"><div class="reg-campo"><label>Ritmo actual <span class="u">mL/h</span></label><input inputmode="decimal" autocomplete="off" aria-label="Epoprostenol (mL/h)" value="' + esc(val) + '"' + (puedo ? "" : " readonly") +
      ' data-cambio="regVal" data-exp="' + esc(e.ID) + '" data-m="FLUJO" data-p="' + esc(punto) + '" data-t="' + esc(t) + '" data-f="' + esc(f) + '" data-v="Epoprostenol"><span class="pista">0 = sin epoprostenol</span></div></div><div id="regEpo" class="recs">' + epoRec(e, punto) + "</div></div>";
  }
  var regValPrev = H.acc.regVal;
  H.acc.regVal = function (el) {
    regValPrev(el); var m = el.getAttribute("data-m"), v = el.getAttribute("data-v"), exp = el.getAttribute("data-exp"), p = el.getAttribute("data-p");
    if (m === "FLUJO" && /^(Q_AH|P_AH|Epoprostenol)$/.test(v)) { var c = H.$("#regEpo"); if (c) c.innerHTML = epoRec(H.exp(exp), p); }
  };

  // ============================================================== 7. HDF: rangos (provisionales), alarmas y recomendaciones combinadas
  function rangosHDF() { return (cfgH().rangos) || C.DEF.hdf.rangos; }
  var objOrig = H.objetivo;
  H.objetivo = function (muestra, v) { if (/^(HDF|PRE_HDF)$/.test(muestra)) { var r = rangosHDF()[v]; if (r) return r; } return objOrig(muestra, v); };
  var VAR_HDF = ["Extraccion", "P_acceso", "P_retorno", "TMP", "Caida_P", "P_efluente", "P_prefiltro", "Temp"], PAR_HDF = ["Q_sangre", "Q_dialisis", "Reposicion"];
  function varsHDF() { return VAR_HDF.map(function (k) { return Object.assign({}, C.variable("HDF", k), { grupo: "Variables (cada hora el día 1; después en los puntos del muestreo)" }); }).concat(PAR_HDF.map(function (k) { return Object.assign({}, C.variable("HDF", k), { grupo: "Parámetros fijos (solo si se cambian)" }); })); }
  function ultimaHDF(exp, muestra) {
    var l = H.med(exp).filter(function (m) { return m.Muestra === (muestra || "HDF") && C.num(m.Valor) !== null; }), ps = {}; l.forEach(function (m) { (ps[m.Punto] = ps[m.Punto] || { t: tH(m), v: {} }).v[m.Variable] = C.num(m.Valor); });
    var ord = Object.keys(ps).map(function (k) { return { punto: k, t: ps[k].t, v: ps[k].v }; }).sort(function (a, b) { return a.t - b.t; }); return { ult: ord[ord.length - 1] || null, prev: ord[ord.length - 2] || null };
  }
  function alarmasCard(e, muestra) {
    var u = ultimaHDF(e.ID, muestra), lst = u.ult ? C.alarmasHDF(u.ult.v, u.prev ? u.prev.v : null, cfgH()) : [];
    return '<section class="tarjeta hdf-alarmas"><div class="cabecera"><h3>Presiones de la HDF</h3><span class="chip aj" title="Rangos por defecto del set HF03; falta la tabla de rangos del grupo">Rangos provisionales</span>' + info("Cada lectura se compara con los rangos de trabajo de Configuración → HDF (provisionales hasta recibir la tabla del grupo) y con la lectura anterior: una PTM o una caída de presión que suben indican coagulación del filtro; una presión de acceso muy negativa, problemas de aspiración.") + "</div>" +
      (!u.ult ? '<p class="tenue">Sin lecturas de la HDF todavía.</p>' : lst.length ? '<div class="recs">' + lst.map(function (x) { return '<div class="rec ' + (x.nivel === "alerta" ? "alerta" : "ajuste") + '">' + ico(x.nivel === "alerta" ? "triangle-alert" : "sliders-horizontal", "s") + "<div>" + esc(x.texto) + "</div></div>"; }).join("") + "</div>" : '<div class="rec ok">' + ico("circle-check", "s") + "<div>Última lectura («" + esc(u.ult.punto) + "») dentro de los rangos.</div></div>") + "</section>";
  }
  // valores con los que se aconseja: última bioquímica del perfusato completada con la última gasometría arterial
  function datosConsejo(e) {
    var med = H.med(e.ID), ult = function (mu) { var l = med.filter(function (m) { return m.Muestra === mu && C.num(m.Valor) !== null; }); if (!l.length) return null; var tm = Math.max.apply(null, l.map(tH)), o = { punto: null, v: {} }; l.filter(function (m) { return Math.abs(tH(m) - tm) < 1e-6; }).forEach(function (m) { o.v[m.Variable] = C.num(m.Valor); o.punto = m.Punto; }); return o; };
    var pf = ult("PERF"), ga = ult("ART"); if (!pf && !ga) return null; var v = Object.assign({}, ga ? ga.v : {}, pf ? pf.v : {});
    var ureas = med.filter(function (m) { return m.Muestra === "PERF" && m.Variable === "Urea" && C.num(m.Valor) !== null; }).sort(function (a, b) { return tH(a) - tH(b); }), prev = ureas.length > 1 ? C.num(ureas[ureas.length - 2].Valor) : null;
    var tmp = H.ultimo(e.ID, "FLUJO", "Temp"), ev = H.eventos(e.ID), t0 = H.inicioPerf(e.ID), rc = S.cfg.recalentamiento, norm = !!ev.fin_recalentamiento || (t0 && C.horasEntre(t0, new Date()) * 60 > (rc.pasos.slice(-1)[0].t + rc.paso_min));
    var uh = ultimaHDF(e.ID).ult, pm = cfgH().parametros, act = { Q_sangre: pm.Q_sangre, Q_dialisis: pm.Q_dialisis, Reposicion: pm.Reposicion };
    PAR_HDF.forEach(function (k) { var x = H.ultimo(e.ID, "HDF", k); if (x) act[k] = C.num(x.Valor); });
    return { v: v, punto: (pf || ga).punto, ctx: { temp: tmp ? C.num(tmp.Valor) : null, urea_previa: prev, normotermia: tmp ? undefined : norm, cfg: cfgH(), actual: act } };
  }
  function consejoLista(e) { var d = datosConsejo(e); return d ? C.consejoHDF(d.v, d.ctx) : []; }
  H.consejoHDFLista = consejoLista;
  function consejoCuerpo(e) {
    var t0 = H.inicioPerf(e.ID); if (!t0) return ""; var d = datosConsejo(e), bx = H.balanceExp(e), paso = cfgH().paso_mL_h || 10;
    var ext = bx ? (function () { var act = bx.b.extraccion_actual, r = bx.rec.redondeada_mL_h, cambia = act === null || Math.abs(r - act) >= paso;
      return '<div class="rec ' + (cambia ? "ajuste" : "ok") + '">' + ico("filter", "s") + "<div><b>Extracción recomendada: " + H.n(r, 0) + " mL/h</b>" + (act !== null ? " (ahora " + H.n(act, 0) + " mL/h" + (cambia ? ": cámbiala" : ": se mantiene") + ")" : " (aún no hay extracción registrada)") + ". Es lo único que se ajusta de forma rutinaria; flujo de sangre, diálisis y reposición son fijos salvo que lo indiquen las recomendaciones de abajo.</div></div>"; })() : "";
    if (!d) return '<section class="tarjeta"><div class="cabecera"><h3>Recomendaciones de la HDF</h3></div><div class="recs">' + ext + '</div><p class="tenue">Las recomendaciones renales aparecen con la primera bioquímica del perfusato (urea e iones).</p></section>';
    var recs = C.consejoHDF(d.v, d.ctx);
    return '<section class="tarjeta"><div class="cabecera"><h3>Recomendaciones de la HDF</h3><span class="muy-tenue">Con la analítica de «' + esc(d.punto) + '»' + (d.ctx.temp !== null ? " y el perfusato a " + H.n(d.ctx.temp, 1) + " °C" : "") + "</span>" +
      info("Las recomendaciones combinan a la vez urea (y su subida), K⁺, Na⁺, ácido-base, lactato, Ca²⁺, fosfato, Mg, glucosa, osmolalidad y la temperatura del perfusato: por ejemplo, con alcalosis no se propone subir la reposición aunque la urea esté alta, y durante el recalentamiento no se propone ningún cambio. La extracción en mL/h sale del balance de volumen.") + '</div><div class="recs">' + ext +
      recs.map(function (x) { return '<div class="rec ' + x.nivel + '">' + ico(x.nivel === "ok" ? "circle-check" : x.nivel === "ajuste" ? "sliders-horizontal" : x.nivel === "alerta" ? "triangle-alert" : "info", "s") + "<div>" + (x.nivel === "ajuste" ? "<b>Consejo:</b> " : "") + esc(x.texto) + "</div></div>"; }).join("") + "</div></section>";
  }
  H.consejoHDFHTML = consejoCuerpo;
  function hdfFijaHTML() {
    var pm = cfgH().parametros, D = C.dializado(cfgH());
    return '<section class="tarjeta hdf-fija"><div class="cabecera"><h3>Configuración de la HDF</h3>' + info("Flujo de sangre, diálisis, reposición y temperatura son fijos. Solo se recomienda cambiar la extracción, en pasos de " + (cfgH().paso_mL_h || 10) + " mL/h; los demás parámetros solo cambian si lo indican las recomendaciones.") + '<span class="chip">Siempre la misma</span></div><dl class="datos-exp cinco"><div><dt>Set</dt><dd>' + esc(pm.set) + "</dd></div><div><dt>Flujo de sangre</dt><dd>" + pm.Q_sangre + " mL/min</dd></div><div><dt>Flujo de diálisis</dt><dd>" + pm.Q_dialisis + " mL/h</dd></div><div><dt>Reposición " + esc(pm.Reposicion_modo) + "</dt><dd>" + pm.Reposicion + " mL/h</dd></div><div><dt>Temperatura</dt><dd>" + pm.Temp_min + "–" + pm.Temp_max + " °C</dd></div></dl>" +
      '<p class="muy-tenue">' + esc(pm.liquido) + ". Dializado efectivo: Na⁺ " + D.Na + " · K⁺ " + H.n(D.K, 1) + " · Ca²⁺ " + D.Ca + " · Mg²⁺ " + D.Mg + " · HCO₃⁻ " + D.HCO3 + " mmol/L · fosfato " + H.n(D.P_mmol, 1) + " mmol/L · glucosa " + D.Glucosa_mg_dL + " mg/dL.</p></section>";
  }
  function extraccionInicial(e) {
    var cfg = cfgH(), hz = C.num(cfg.horizonte_h) || 4, inf = C.infusionA(H.circadianoDe(e), new Date(), cfg).mL_h;
    return C.recomendarExtraccion({ balance_mL: 0, infusion_mL: inf * hz, bilis_mL: 0, muestras_mL: 0, horizonte_h: hz, cfg: cfg }).redondeada_mL_h;
  }
  H.hdfPre = function (e) {
    var puedo = H.puede("registrar"), ext = extraccionInicial(e);
    return '<div class="aviso info">' + ico("filter") + "<div>La HDF empieza en la <b>pre-perfusión</b>, con los parámetros fijos. Registra aquí las variables de la máquina; en la perfusión se registran cada hora las primeras 24 h y después en los puntos del muestreo. <b>Extracción inicial recomendada: " + H.n(ext, 0) + " mL/h</b> (infusiones del protocolo a esta hora; sin bilis ni muestras todavía).</div></div>" +
      hdfFijaHTML() + (puedo ? '<div class="fila-flex"><button class="bt" data-act="hdfFijos" data-exp="' + esc(e.ID) + '" data-m="PRE_HDF" data-p="Pre">' + ico("wand-sparkles") + "Rellenar con los parámetros fijos</button></div>" : "") +
      alarmasCard(e, "PRE_HDF") + tablaHoja(e, [{ m: "PRE_HDF", p: "Pre", et: "Pre-perfusión" }], varsHDF(), { titulo: "HDF en la pre-perfusión" });
  };
  H.hdfPerf = function (e, q) {
    var pa = H.puntoAhora(e.ID), puedo = H.puede("registrar");
    return H.hdfPanel(e) + consejoCuerpo(e) + alarmasCard(e, "HDF") + hdfFijaHTML() +
      (puedo && pa ? '<div class="fila-flex"><button class="bt" data-act="hdfFijos" data-exp="' + esc(e.ID) + '" data-m="HDF" data-p="' + esc(pa.punto) + '" data-t="' + pa.t_h + '">' + ico("wand-sparkles") + "Registrar los parámetros fijos en «" + esc(pa.punto) + "»</button></div>" : "") +
      '<div class="pie-hoja">' + (puedo ? '<button class="bt mini" data-act="añadirPunto" data-exp="' + esc(e.ID) + '" data-m="HDF">' + ico("plus", "s") + (H.perfTerminada(e.ID) ? "Registro urgente" : "Punto fuera de protocolo") + "</button>" : "") + '<span class="et-info">Cuándo se registra' + info("Las variables de la HDF se registran cada hora las primeras 24 h y después en los puntos del muestreo. Fuera del rango (provisional) de Configuración → HDF, la casilla sale en rojo.") + '</span><a class="muy-tenue" href="#/exp/' + idq(e) + '/seguimiento/perf/hdf?todos=1">ver todos los puntos</a></div>' +
      H.hojaHTML(e.ID, "HDF", { todos: q && q.todos === "1", vars: varsHDF() });
  };
  H.acc.hdfFijos = function (el) {
    var exp = el.getAttribute("data-exp"), m = el.getAttribute("data-m"), p = el.getAttribute("data-p"), t = el.getAttribute("data-t"), pm = cfgH().parametros, e = H.exp(exp), bx = m === "HDF" && H.balanceExp ? H.balanceExp(e) : null;
    var o = { Q_sangre: pm.Q_sangre, Q_dialisis: pm.Q_dialisis, Reposicion: pm.Reposicion, Temp: (pm.Temp_min + pm.Temp_max) / 2 };
    if (bx && bx.rec) o.Extraccion = bx.b.extraccion_actual !== null ? bx.b.extraccion_actual : bx.rec.redondeada_mL_h; else if (m === "PRE_HDF" && !H.valor(exp, m, p, "Extraccion")) o.Extraccion = extraccionInicial(e);
    H.guardarMediciones(exp, m, p, t === null || t === "" ? null : Number(t), new Date().toISOString(), o); H.toast("Parámetros de la HDF registrados."); H.repintarPronto();
  };
  H.acc.hdfRegistrar = function (el) {
    var exp = el.getAttribute("data-exp"), inp = H.$("#hdfNueva"), n = C.num(inp && inp.value), paso = cfgH().paso_mL_h || 10, pa = H.puntoAhora(exp);
    if (!pa) { H.toast("La perfusión ha terminado: no se programan más cambios de la extracción.", "error"); return; }
    if (n === null || n < 0) { H.toast("Indica la extracción en mL/h.", "error"); return; }
    if (Math.abs(n / paso - Math.round(n / paso)) > 1e-9) { H.toast("La máquina solo admite pasos de " + paso + " mL/h.", "error"); return; }
    var ant = (H.balanceExp(H.exp(exp)) || { b: {} }).b.extraccion_actual;
    H.guardarMediciones(exp, "HDF", pa.punto, pa.t_h, pa.fecha, { Extraccion: n }, { sinRepintar: true });
    H.guardar("Eventos", [{ ID: H.uid(), Experimento: exp, Tipo: "ajuste", Fecha_hora: pa.fecha, Nota: "Extracción de la HDF: " + (ant === null || ant === undefined ? "—" : H.n(ant, 0)) + " → " + H.n(n, 0) + " mL/h" }]);
    H.toast("Extracción registrada: " + H.n(n, 0) + " mL/h.");
  };

  // ---- balance con los mL reales de cada punto de muestreo (C.puntosMuestreo) en lugar de cfg.muestra_mL_dia1
  H.balanceExp = function (e) {
    var t0 = H.inicioPerf(e.ID); if (!t0) return null; var cfg = cfgH(), fin = H.finPerf(e.ID), ahora = fin ? C.aFecha(fin) : new Date(), med = H.med(e.ID), fd = H.form(e.ID, "hdf", ""), circ = H.circadianoDe(e);
    var bilis = med.filter(function (m) { return m.Muestra === "BILIS" && m.Variable === "Volumen_mL" && C.num(m.Valor) !== null && m.Fecha_hora; }).map(function (m) { return { t: m.Fecha_hora, mL: C.num(m.Valor), punto: m.Punto }; });
    var pts = C.puntosMuestreo(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo), real = {};
    med.forEach(function (m) { if (/^(PERF|ART|POR|CAV)$/.test(m.Muestra) && m.Fecha_hora && !real[m.Punto]) real[m.Punto] = m.Fecha_hora; });
    var muestras = pts.filter(function (p) { return p.fecha <= ahora || real[p.etiqueta]; }).map(function (p) { return { t: real[p.etiqueta] || p.fecha.toISOString(), mL: p.mL, punto: p.etiqueta }; });
    var ext = med.filter(function (m) { return m.Muestra === "HDF" && m.Variable === "Extraccion" && C.num(m.Valor) !== null && m.Fecha_hora; }).map(function (m) { return { t: m.Fecha_hora, mL_h: C.num(m.Valor) }; });
    var pre = H.valor(e.ID, "PRE_HDF", "Pre", "Extraccion"); if (pre && C.num(pre.Valor) !== null && !ext.some(function (x) { return C.aFecha(x.t) <= C.aFecha(t0); })) ext.push({ t: t0, mL_h: C.num(pre.Valor) });
    if (C.num(fd.Extraccion) !== null && fd.inicio && !ext.some(function (x) { return C.aFecha(x.t) <= C.aFecha(fd.inicio); })) ext.push({ t: H.deLocal(fd.inicio) || fd.inicio, mL_h: C.num(fd.Extraccion) });
    var b = C.balanceHDF({ circ: circ, inicio: t0, ahora: ahora, bilis: bilis, muestras: muestras, extraccion: ext, cfg: cfg });
    var hz = C.num(cfg.horizonte_h) || 4, finH = new Date(ahora.getTime() + hz * 36e5);
    var ub = bilis.slice().sort(function (x, y) { return String(y.t).localeCompare(String(x.t)); })[0], prod = ub ? (H.derivadasBilis(e, { punto: ub.punto }) || {}).Produccion_mLh : null;
    var nM = pts.filter(function (p) { return p.fecha > ahora && p.fecha <= finH; }), mlM = nM.reduce(function (a, p) { return a + p.mL; }, 0);
    var infPrev = circ.cambios.length ? C.volumenInfundido(circ, ahora, finH, cfg) : (C.num(cfg.otras_infusiones_mL_h) || 0) * hz;
    var rec = C.recomendarExtraccion({ balance_mL: b.balance_mL, infusion_mL: infPrev, bilis_mL: (prod || 0) * hz, muestras_mL: mlM, horizonte_h: hz, cfg: cfg });
    return { b: b, rec: rec, prod: prod, nMuestras: nM.length, mlMuestras: C.r(mlM, 1), infPrev: infPrev, cfg: cfg, sinMuestra: false, conectada: ext.length > 0, muestrasPasadas: muestras.length };
  };

  // ---- aviso (tipo «hdf») cuando cambia la extracción recomendada o aparece una recomendación renal nueva
  function memHDF() { try { return JSON.parse(localStorage.getItem("home_aviso_hdf") || "{}") || {}; } catch (x) { return {}; } }
  H.revisarHDF = function (exp) {
    var e = H.exp(exp); if (!e || !H.inicioPerf(exp) || H.perfTerminada(exp) || !H.puede("registrar") || !S.cfg) return null;
    var bx = H.balanceExp(e); if (!bx) return null; var act = bx.b.extraccion_actual, rec = bx.rec.redondeada_mL_h, paso = cfgH().paso_mL_h || 10;
    if (act === null) return null;   // la HDF aún no tiene extracción registrada: se programa desde el panel, sin aviso
    var dc = datosConsejo(e); if (dc && dc.ctx.normotermia === false || dc && dc.ctx.temp !== null && dc.ctx.temp < (H.mezclar ? H.mezclar(C.DEF.hdf.consejo, cfgH().consejo || {}) : C.DEF.hdf.consejo).temp_minima) return null;   // recalentamiento: sin cambios
    var cons = consejoLista(e).filter(function (x) { return x.nivel === "ajuste" || x.nivel === "alerta"; }), firma = cons.map(function (x) { return x.texto; }).join("|"), mem = memHDF(), prev = mem[exp] || {};
    var cambiaExt = Math.abs(rec - act) >= paso, nuevaRec = cambiaExt && (prev.rec !== rec) && (prev.rec === undefined || Math.abs(prev.rec - rec) >= 2 * paso || Date.now() - (prev.t || 0) > 36e5), nuevoCons = !!firma && firma !== prev.cons;
    if (!nuevaRec && !nuevoCons) return null;
    mem[exp] = { rec: cambiaExt ? rec : prev.rec, cons: firma, t: Date.now() }; try { localStorage.setItem("home_aviso_hdf", JSON.stringify(mem)); } catch (x) { }
    var txt = (cambiaExt ? ["Extracción recomendada " + H.n(rec, 0) + " mL/h" + (act !== null ? " (ahora " + H.n(act, 0) + " mL/h)" : "")] : []).concat(cons.map(function (x) { return x.texto; })).join("\n");   // v0.7.1: una recomendación por línea
    var av = { ID: exp + "|hdf|" + Date.now(), Experimento: exp, Fecha_hora: new Date().toISOString(), Tipo: "hdf", Destino: "equipo", Vista: "exp:" + exp + ":seguimiento", Titulo: "HDF · " + exp + (cambiaExt ? ": cambiar la extracción a " + H.n(rec, 0) + " mL/h" : ": revisar los parámetros"), Texto: txt.slice(0, 900) };
    H.programarAvisos(exp, [av], ["hdf"]); return av;
  };

  // ============================================================== 8. Horario circadiano por versión del protocolo (Config «circadiano_protocolos»)
  // v0.7.2: cada versión se guarda en su propia fila de Config («circadiano_protocolo_Vn», por el límite de 45 000 caracteres por celda);
  // se leen también las guardadas en «circadiano_protocolos» (v0.7–v0.7.1). Sin guardar: precarga del Excel del protocolo con «Revisar».
  function vRef() { return C.num((S.cfg.general || {}).volumen_sangre_mL) || 2200; }
  function claveH(v) { return "circadiano_protocolo_" + v; }
  H.horarioProtocolo = function (v) {
    var x = S.cfg[claveH(v)] || (S.cfg.circadiano_protocolos || {})[v];
    if (x && x.cambios) { var o = Object.assign({ lineas: [], cambios: [], V_ref_mL: vRef(), revisar: false }, x); if (!o.madres) o.madres = (C.horarioPrecargado(v) || {}).madres || C.madresDe(v, o.lineas); return o; }
    var p = C.horarioPrecargado(v) || C.horarioPrecargado(C.versionActual());
    return Object.assign({ V_ref_mL: vRef() }, p, { precargado: true });
  };
  function guardarHorario(v, hp) {
    delete hp.precargado; H.guardarCfg(claveH(v), hp);
    if (v === C.versionActual()) H.guardarCfg("circadiano", Object.assign(H.copia(S.cfg.circadiano || C.DEF.circadiano), { lineas: hp.lineas, cambios: hp.cambios, verificado: !hp.revisar && hp.verificado !== false }));
  }
  // configuración efectiva: versiones creadas en Configuración y horario vigente (S.cfg.circadiano) = el de la versión actual
  var recPrev = H.recalcCfg;
  H.recalcCfg = function () {
    var cfg = recPrev.apply(this, arguments);
    try { C.registrarVersionesExtra(cfg.protocolos_extra || {}); var hp = H.horarioProtocolo(C.versionActual()); cfg.circadiano = Object.assign({}, cfg.circadiano, { lineas: hp.lineas, cambios: hp.cambios, verificado: !hp.revisar && hp.verificado !== false }); } catch (e) { console.error(e); }
    return cfg;
  };
  // solución madre: la del horario del protocolo, salvo que el experimento haya guardado la suya en la tabla de infusiones
  var protPrev = H.protocoloExp;
  function conMadres(v, lineas, propias) {
    var hp = H.horarioProtocolo(v); propias = propias || {};
    Object.keys(lineas).forEach(function (l) { if (propias[l]) return; (lineas[l].componentes || []).forEach(function (c) { var m = C.madreHorario(hp, l, c.nombre); if (m) { c.madre = m.madre; c.unidad = m.unidad || c.unidad; } }); });
    (hp.lineas || []).forEach(function (l) { if (lineas[l] || C.LINEAS_SIN_MADRE.indexOf(l) !== -1) return; var ms = (hp.madres || {})[l]; lineas[l] = { producto: l, incluida: true, componentes: (ms && ms.length ? ms : [{ nombre: l, madre: null, unidad: "mg/mL" }]).map(function (c) { return { nombre: c.nombre, madre: c.madre, unidad: c.unidad }; }) }; });
    return lineas;
  }
  H.protocoloExp = function (e) {
    var p = protPrev(e), f = e ? H.form(e.ID, "protocolo", "") : {}, conf = (f && f.lineas) || {}, propias = {};
    Object.keys(conf).forEach(function (l) { if (conf[l] && conf[l].componentes && conf[l].componentes.length) propias[l] = true; });
    conMadres(p.version, p.lineas, propias); return p;
  };
  H.acc.protVersion = function (el) {
    var exp = el.getAttribute("data-exp"), v = el.value, f = { version: v, lineas: conMadres(v, H.copia(C.PROTOCOLOS[v].lineas)) };
    Object.keys(f.lineas).forEach(function (l) { f.lineas[l].incluida = true; }); H.guardarForm(exp, "protocolo", "", f); H.guardar("Experimentos", [{ ID: exp, Protocolo: v }], { sinRepintar: true });
    H.toast("Tabla cargada con la versión " + v + ". Revísala y confírmala."); H.repintarPronto();
  };
  H.horarioDe = function (e) { return H.horarioProtocolo(H.versionExp(e)); };
  // horario efectivo del experimento: el de su protocolo, sin las líneas no administradas y reescalado si el volumen real se desvía > 100 mL
  H.circadianoDe = function (e) {
    if (!e || !H.esCircadiano(e)) return { lineas: [], cambios: [] };
    var hp = H.horarioDe(e), p = H.protocoloExp(e), fuera = Object.keys(p.lineas).filter(function (l) { return !p.lineas[l].incluida; });
    var cambios = hp.cambios.filter(function (x) { return fuera.indexOf(x.linea) === -1; }), excl = (cfgH().lineas_excluidas || ["HDF"]);
    var Vr = C.num(hp.V_ref_mL) || vRef(), Vx = H.Vperf(e.ID), inf = cambios.filter(function (x) { return excl.indexOf(x.linea) === -1; }), rs = C.reescalarHorario(inf, Vr, Vx, 100);
    var out = rs.cambiado ? rs.cambios.concat(cambios.filter(function (x) { return excl.indexOf(x.linea) !== -1; })) : cambios;
    return { lineas: hp.lineas.filter(function (l) { return fuera.indexOf(l) === -1; }), cambios: out, verificado: hp.verificado, revisar: hp.revisar, reescalado: rs.cambiado ? { factor: rs.factor, V_ref: Vr, V_real: Vx } : null, version: H.versionExp(e) };
  };
  H.infusionAhora = function (e) { return C.infusionA(H.circadianoDe(e), new Date(), cfgH()).mL_h; };

  // ============================================================== 9. Tabla de infusiones (pre-perfusión)
  var RECETAS = {
    "Hidrocortisona": "Stock: 0,7 mL de Actocortina 75 mg/mL + 49,3 mL de SF (1,05 mg/mL). Infusión: 7,2 mL del stock + 992,8 mL de SF (7,56 µg/mL).",
    "Ácidos biliares": "Taurocolato sódico (confirmar 31 g frente a 3,1 g) en 445 mL de SF + 25 mL de albúmina 200 g/L.",
    "Insulina": "0,1 mL de insulina 100 UI/mL + 95 mL de SF + 5 mL de albúmina 200 g/L (1 %).",
    "Melatonina": "Stock (20 µg/mL): 1 mg de melatonina + 10 mL de propanodiol + 40 mL de SF. Infusión: 1 mL del stock + 99 mL de SF (0,2 µg/mL), protegida de la luz.",
    "NP (glucosa + AA)": "Periolimel N4E: aditivos por bolsa de 1500 mL — oligoelementos (Supliven) 15 mL, multivitaminas (Cernevit) 1,5 viales, taurina 1,5 g, cloruro de colina 1,3 g (2000 mL: 20 mL, 2 viales, 2 g, 1,5 g). En la hoja original la colina administrada (1,2 g) no coincide con la recomendada (1,3 g): confirmar.",
    "Profilaxis (bolo)": "Metronidazol 500 mg/100 mL (1 al día) con 1 g de cefoxitina (10 mL a 100 mg/mL).",
    "Profilaxis": "Fluconazol 2 mg/mL (frasco de 50 mL), continuo.",
    "Heparina": "Heparina sódica: cebado según el volumen del perfusato e infusión continua (ver la fila)." };
  function ritmosLinea(circ, l) {
    var ini = 8 * 60, rel = function (h) { return ((C.hm(h) - ini) % 1440 + 1440) % 1440; };
    return circ.cambios.filter(function (x) { return x.linea === l; }).sort(function (a, b) { return rel(a.h) - rel(b.h); });
  }
  H.tablaInfusiones = function (e) {
    var p = H.protocoloExp(e), puedo = H.puede("registrar"), V = H.Vperf(e.ID), info0 = C.PROTOCOLOS[p.version] || {}, circ = H.circadianoDe(e), hp = H.horarioDe(e), dias = S.cfg.general.dias_perfusion;
    var base = { cambios: hp.cambios }, cfgP = S.cfg.perfusato, hep = C.heparina(V, dias, cfgP), d = H.usarForm(e.ID, "calculos", "");
    var filas = Object.keys(p.lineas).map(function (l) {
      var x = p.lineas[l], esHep = l === "Heparina", vd = esHep ? (C.num(cfgH().otras_infusiones_mL_h) || 0) * 24 : C.volumenDiaLinea(circ, l), rit = ritmosLinea(circ, l), rit0 = ritmosLinea(base, l);
      var comps = x.componentes.map(function (c, i) { var a = vd ? C.aporteLinea(c, vd / 24, V) : null; return '<div class="comp"><span class="c-nom">' + esc(c.nombre) + '</span><span class="con-u"><input inputmode="decimal" aria-label="Solución madre de ' + esc(c.nombre) + '" value="' + (c.madre === null || c.madre === undefined ? "" : String(c.madre).replace(".", ",")) + '" placeholder="?" data-cambio="protMadre" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '" data-i="' + i + '"' + (puedo ? "" : " disabled") + "> " + esc(c.unidad) + '</span><span class="muy-tenue c-dosis">' + (a ? H.n(a.por_h * 24, a.por_h * 24 < 1 ? 3 : 0) + " " + esc(a.unidad_h.replace("/h", "/día")) + " · +" + H.n(a.por_L_h * 24, a.por_L_h * 24 < 1 ? 3 : 1) + " " + esc(a.unidad_L_h.replace(" por hora", "/día")) : "") + "</span></div>"; }).join("");
      var ritmos = esHep ? '<div class="anticoag"><b>Anticoagulación</b><div>Cebado: ' + H.n(hep.cebado_U, 0) + " U (" + H.n(hep.cebado_mL, 2) + " mL del vial)</div><div>Infusión: <b>" + H.n(hep.ritmo_mL_h, 1) + " mL/h</b> (" + H.n(cfgP.heparina_infusion_U_h, 0) + " U/h a " + H.n(cfgP.heparina_infusion_conc_U_mL, 0) + " U/mL)</div><div>Para " + dias + " días: <b>" + hep.viales + " viales de 5 mL</b> · " + H.n(hep.mL_suero, 0) + " mL de SF · volumen final " + H.n(hep.mL_total, 0) + " mL (" + H.n(hep.horas_cubiertas, 0) + " h)</div>" +
        '<div class="rejilla dos anti-in">' + H.campo("anti.preparado_mL", "Volumen preparado", H.leerRuta(d, "anti.preparado_mL"), { tipo: "number", u: "mL" }) + H.campo("anti.ritmo", "Ritmo programado", H.leerRuta(d, "anti.ritmo"), { tipo: "number", u: "mL/h" }) + "</div></div>"
        : rit.length ? '<ul class="ritmos">' + rit.map(function (c, i) { var o = rit0[i], cambio = circ.reescalado && o && C.num(o.valor) !== C.num(c.valor); return "<li><time>" + esc(c.h) + "</time> " + (cambio ? "<s>" + H.n(o.valor, l === "Insulina" ? 1 : 0) + "</s> " : "") + "<b>" + (c.unidad === "bolo" ? "bolo" : H.n(c.valor, l === "Insulina" ? 1 : 0)) + "</b> " + (c.unidad === "bolo" ? "" : esc(c.unidad)) + "</li>"; }).join("") + "</ul>" : '<span class="muy-tenue">Sin horario en este protocolo</span>';
      return '<tr class="' + (x.incluida ? "" : "excluida") + '"><td class="chk" data-et="Se administra"><input type="checkbox" aria-label="Se administra ' + esc(C.nombreLinea(l)) + '"' + (x.incluida ? " checked" : "") + ' data-cambio="protIncl" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '"' + (puedo ? "" : " disabled") + '></td><td class="c-lin" data-et="Línea"><b>' + esc(C.nombreLinea(l)) + "</b>" +
        (puedo ? '<input class="prot-prod" list="dlFarmacos" aria-label="Producto de ' + esc(C.nombreLinea(l)) + '" value="' + esc(x.producto) + '" data-cambio="protProducto" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '">' : '<div class="muy-tenue">' + esc(x.producto) + "</div>") + '</td><td class="c-comp" data-et="Componentes">' + comps + '</td><td class="c-rit" data-et="' + (esHep ? "Anticoagulación" : "Ritmos (mL/h)") + '">' + ritmos + '</td><td class="num c-vol" data-et="Volumen al día">' + (vd ? H.n(vd, 1) + " mL" : "—") + '</td><td class="c-inf" data-et="Preparación"><button type="button" class="bt-info" data-act="infoPrep" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '" aria-label="Cómo preparar ' + esc(C.nombreLinea(l)) + ' para ' + dias + ' días">' + ico("info", "s") + "</button></td></tr>";
    }).join("");
    var rs = circ.reescalado;
    return '<section class="tarjeta"><div class="cabecera"><h2>Tabla de infusiones</h2>' + info("Los ritmos salen del horario circadiano del protocolo " + p.version + " (Configuración → Horario circadiano). La (i) de cada línea indica cómo prepararla para " + dias + " días. Desmarca las líneas que no se vayan a administrar: dejarán de verse en el horario y en el balance.") + (p.confirmado_en ? '<span class="chip ok">' + ico("check", "s") + "Confirmada por " + esc(p.confirmado_por || "") + " el " + esc(H.fechaHora(p.confirmado_en)) + "</span>" : '<span class="chip aj">Sin confirmar</span>') + (hp.revisar ? '<span class="chip aj">Horario del protocolo por revisar</span>' : "") + "</div>" +
      '<div class="rejilla dos"><div class="campo"><label class="et" for="protVer">Versión del protocolo</label><select id="protVer" data-cambio="protVersion" data-exp="' + esc(e.ID) + '"' + (puedo ? "" : " disabled") + ">" + C.VERSIONES.map(function (v) { return '<option value="' + v + '"' + (v === p.version ? " selected" : "") + ">" + v + " · " + esc(C.PROTOCOLOS[v].propuesto ? "propuesto" : C.PROTOCOLOS[v].ref) + "</option>"; }).join("") + '</select><div class="ayuda">' + esc(info0.notas || "") + '</div></div><div class="campo"><span class="et">Volumen de perfusato</span><div class="valor-fijo">' + H.n(V, 0) + ' mL</div><div class="ayuda">Referencia del protocolo: ' + H.n(C.num(hp.V_ref_mL) || vRef(), 0) + " mL</div></div></div>" +
      (rs ? '<div class="aviso aj">' + ico("scale") + "<div><b>Ritmos recalculados.</b> El volumen real (" + H.n(rs.V_real, 0) + " mL) se desvía " + H.n(rs.V_real - rs.V_ref, 0) + " mL de la referencia (" + H.n(rs.V_ref, 0) + " mL): para mantener las concentraciones, todos los ritmos del horario se multiplican por " + H.n(rs.factor, 3) + " y se redondean a 1 mL/h (insulina, 0,1 mL/h). Tachado, el ritmo original.</div></div>" : "") +
      '<datalist id="dlFarmacos">' + (H.farmacosCatalogo ? H.farmacosCatalogo() : []).map(function (m) { return '<option value="' + esc(m.Nombre) + '">'; }).join("") + "</datalist>" +
      '<div class="tabla-env"><table class="t tabla-prot tabla-inf"><colgroup><col class="c-chk"><col class="c-lin"><col class="c-comp"><col class="c-rit"><col class="c-vol"><col class="c-inf"></colgroup><thead><tr><th>Se administra</th><th>Línea y producto</th><th>Componentes · solución madre · dosis al día · concentración esperada</th><th>Ritmos del protocolo</th><th class="num">Volumen al día</th><th>Preparar</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      '<p class="muy-tenue">Horario del protocolo ' + esc(p.version) + ': <a href="#/config/circadiano/' + esc(p.version) + '">Configuración → Horario circadiano</a>.</p>' +
      (puedo ? '<button class="bt pri" data-act="protConfirmar" data-exp="' + esc(e.ID) + '">' + ico("clipboard-check") + (p.confirmado_en ? "Volver a confirmar" : "Confirmar la tabla de infusiones") + "</button>" : "") + "</section>";
  };
  H.acc.infoPrep = function (el) {
    var e = H.exp(el.getAttribute("data-exp")), l = el.getAttribute("data-l"), p = H.protocoloExp(e), x = p.lineas[l] || { componentes: [] }, dias = S.cfg.general.dias_perfusion, circ = H.circadianoDe(e);
    var vd = l === "Heparina" ? C.heparina(H.Vperf(e.ID), dias, S.cfg.perfusato).ritmo_mL_h * 24 : C.volumenDiaLinea(circ, l), c0 = x.componentes[0], r = C.preparacionSemanal(l, vd, dias, c0 ? C.num(c0.madre) : null);
    H.modal({ titulo: "Preparar " + C.nombreLinea(l) + " para " + dias + " días", cuerpo: '<p><b>' + esc(r.recomendacion) + "</b></p><ul><li>Volumen al día: " + H.n(vd, 1) + " mL · total " + H.n(r.total_mL, 0) + " mL</li><li>Contenedor: " + esc(r.contenedor) + (r.contenedores_por_tanda > 1 ? " × " + r.contenedores_por_tanda : "") + "</li><li>" + (r.semana ? "Una sola preparación para la semana" : r.tandas + " preparaciones de " + r.dias_por_tanda + " día(s)") + "</li>" + (r.masa !== null && c0 ? "<li>" + esc(c0.nombre) + " necesario para la semana: " + H.n(r.masa, 2) + " " + esc(String(c0.unidad || "").split("/")[0]) + "</li>" : "") + "</ul>" + (RECETAS[l] ? '<p class="muy-tenue">' + esc(RECETAS[l]) + "</p>" : ""), pie: '<button class="bt pri" data-cerrar>Entendido</button>' });
  };

  // ============================================================== 10. Cálculos del perfusato: cebado fijo; sin NPT, preparaciones ni coherencia (van a la tabla de infusiones y a Configuración)
  H.calculosV7 = function (e) {
    var h = H.calculosPerfusato ? H.calculosPerfusato(e) : "", i = h.indexOf('<section class="tarjeta"><div class="cabecera"><h3>4 · Anticoagulación'); if (i !== -1) h = h.slice(0, i);
    var hp = H.horarioDe(e), Vr = C.num(hp.V_ref_mL) || vRef(), V = H.Vperf(e.ID), dv = V - Vr;
    return '<div class="aviso ' + (Math.abs(dv) > 100 ? "aj" : "info") + '">' + ico(Math.abs(dv) > 100 ? "scale" : "info") + "<div>La solución de cebado es siempre la misma; solo cambia ligeramente el volumen total del perfusato. " +
      (Math.abs(dv) > 100 ? "<b>El volumen total (" + H.n(V, 0) + " mL) se desvía " + H.n(dv, 0) + " mL de la referencia del protocolo (" + H.n(Vr, 0) + " mL)</b>: se han recalculado las correcciones y los ritmos del horario circadiano (ver la <a href=\"#/exp/" + idq(e) + "/seguimiento/pre/protocolo\">tabla de infusiones</a>)." : "Volumen total " + H.n(V, 0) + " mL (referencia " + H.n(Vr, 0) + " mL): desviación ≤ 100 mL, el horario no cambia.") +
      " La anticoagulación, la nutrición parenteral y las preparaciones del horario están en la tabla de infusiones.</div></div>" + h;
  };

  // ============================================================== 11. Configuración → Horario circadiano (por protocolo) y → HDF
  H.seccionesExtra = H.seccionesExtra || {};
  var UNIDADES_CIRC = ["mL/h", "bolo", "mL"];
  var ABIERTOS = {};   // v0.7.2: desplegables abiertos del editor (se conservan al añadir o borrar horas y al repintar)
  function recordarAbiertos() { H.$$("details.circ-linea[data-v]").forEach(function (d) { var k = d.getAttribute("data-v") + "|" + d.getAttribute("data-l"); if (d.open) ABIERTOS[k] = true; else delete ABIERTOS[k]; }); }
  function vNum(x) { return x === null || x === undefined || x === "" ? "" : String(x).replace(".", ","); }
  function madreTxt(c) { return c && c.madre !== null && c.madre !== undefined ? vNum(c.madre) + " " + (c.unidad || "") : "sin concentración"; }
  function selUnidad(attrs, u) { return '<select ' + attrs + '>' + C.MADRE_UNIDADES.concat(C.MADRE_UNIDADES.indexOf(u) === -1 && u ? [u] : []).map(function (x) { return "<option" + (x === u ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>"; }
  function camposMadre(v, l, hp) {
    if (C.LINEAS_SIN_MADRE.indexOf(l) !== -1) return "";
    var comps = ((hp.madres || {})[l]) || (((C.PROTOCOLOS[v] || {}).lineas || {})[l] || {}).componentes || [{ nombre: l, madre: null, unidad: "mg/mL" }];
    return '<div class="circ-madres">' + comps.map(function (c, j) { var at = 'data-v="' + v + '" data-l="' + esc(l) + '" data-c="' + j + '" data-n="' + esc(c.nombre) + '"';
      return '<div class="campo circ-madre"><label class="et" for="cpM_' + j + "_" + esc(l.replace(/\W/g, "")) + '">Solución madre · ' + esc(c.nombre) + '</label><div class="madre-in"><input id="cpM_' + j + "_" + esc(l.replace(/\W/g, "")) + '" inputmode="decimal" autocomplete="off" placeholder="?" value="' + esc(vNum(c.madre)) + '" data-cambio="cpMadre" ' + at + ">" + selUnidad('aria-label="Unidad de la solución madre de ' + esc(c.nombre) + '" data-cambio="cpMadreU" ' + at, c.unidad) + "</div></div>"; }).join("") + "</div>";
  }
  H.seccionesExtra.circadiano = function () {
    var r = H.ruta(), v = (r.partes || [])[2] || r.p2 || C.versionActual(); if (C.VERSIONES.indexOf(v) === -1) v = C.versionActual();
    recordarAbiertos();
    var hp = H.horarioProtocolo(v), lineas = hp.lineas.filter(function (l) { return l; }), prot = C.PROTOCOLOS[v] || {}, admin = H.esAdmin();
    var sel = '<div class="fila-flex cfg-circ-vers"><div class="segmentado vers" role="tablist">' + C.VERSIONES.map(function (x) { var h2 = H.horarioProtocolo(x); return '<button role="tab" class="' + (x === v ? "activo" : "") + '" aria-selected="' + (x === v) + '" data-act="irSub" data-r="config/circadiano/' + x + '">' + x + (h2.revisar ? ' <span class="punto-rev" title="Revisar">•</span>' : "") + "</button>"; }).join("") + "</div>" +
      (admin ? '<button class="bt" data-act="cpNuevoProt" data-v="' + v + '">' + ico("plus") + "Añadir protocolo</button>" : "") + "</div>";
    var bloques = lineas.map(function (l) {
      var filas = hp.cambios.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return x.c.linea === l; }).sort(function (a, b) { return C.hm(a.c.h) - C.hm(b.c.h); }), vd = C.volumenDiaLinea(hp, l);
      var ms = C.LINEAS_SIN_MADRE.indexOf(l) === -1 ? ((hp.madres || {})[l] || []) : [];
      return '<details class="circ-linea" data-v="' + v + '" data-l="' + esc(l) + '"' + (filas.length && !ABIERTOS[v + "|" + l] ? "" : " open") + "><summary><b>" + esc(C.nombreLinea(l)) + '</b><span class="muy-tenue">' + filas.length + " cambio(s)" + (vd ? " · " + H.n(vd, 1) + " mL/día" : "") + (ms.length ? " · " + esc(ms.map(madreTxt).join(" + ")) : "") + "</span></summary><div class=\"dentro\">" + camposMadre(v, l, hp) +
        '<div class="circ-filas"><div class="circ-cab"><span>Hora</span><span>Ritmo</span><span>Unidad</span><span>Nota (concentración, bolo…)</span><span></span></div>' + filas.map(function (x) { var c = x.c, i = x.i;
          return '<div class="circ-fila"><input type="time" aria-label="Hora" value="' + esc(c.h) + '" data-cambio="cpCampo" data-v="' + v + '" data-i="' + i + '" data-k="h"><input type="text" inputmode="decimal" aria-label="Ritmo" value="' + esc(c.valor === null || c.valor === undefined ? "" : String(c.valor).replace(".", ",")) + '" data-cambio="cpCampo" data-v="' + v + '" data-i="' + i + '" data-k="valor">' +
            '<select aria-label="Unidad" data-cambio="cpCampo" data-v="' + v + '" data-i="' + i + '" data-k="unidad">' + UNIDADES_CIRC.concat(UNIDADES_CIRC.indexOf(c.unidad) === -1 && c.unidad ? [c.unidad] : []).map(function (u) { return "<option" + (u === c.unidad ? " selected" : "") + ">" + esc(u) + "</option>"; }).join("") + '</select><input aria-label="Nota" autocomplete="off" value="' + esc(c.nota || "") + '" data-cambio="cpCampo" data-v="' + v + '" data-i="' + i + '" data-k="nota"><button class="bt ico-solo texto" data-act="cpBorrar" data-v="' + v + '" data-i="' + i + '" aria-label="Borrar el cambio">' + ico("trash-2", "s") + "</button></div>"; }).join("") +
        '</div><button class="bt mini" data-act="cpFila" data-v="' + v + '" data-l="' + esc(l) + '">' + ico("plus", "s") + "Añadir hora</button></div></details>";
    }).join("");
    var hep = hp.heparina || {}, hepB = '<details class="circ-linea circ-hep" data-v="' + v + '" data-l="Heparina"' + (ABIERTOS[v + "|Heparina"] ? " open" : "") + '><summary><b>Heparina</b><span class="muy-tenue">continua, fuera del horario' + (hep.ritmo_mL_h ? " · " + H.n(hep.ritmo_mL_h, 1) + " mL/h" : "") + (hep.madre ? " · " + H.n(hep.madre, 0) + " " + esc(hep.unidad || "U/mL") : "") + '</span></summary><div class="dentro">' + camposMadre(v, "Heparina", hp) +
      '<div class="campo"><label class="et" for="cpHepR">Ritmo del protocolo</label><div class="unidad-in"><input id="cpHepR" inputmode="decimal" value="' + esc(vNum(hep.ritmo_mL_h)) + '" data-cambio="cpHep" data-v="' + v + '"><span>mL/h</span></div><div class="ayuda">Dato del protocolo; la anticoagulación del experimento se calcula en la tabla de infusiones.</div></div></div></details>';
    var ext = prot.extra ? '<section class="tarjeta cfg-prot-extra"><div class="cabecera"><h3>Protocolo ' + esc(v) + "</h3>" + info("Versión creada en Configuración" + (prot.base ? " a partir de " + prot.base : "") + ". Para usarla en un experimento, elígela en su tabla de infusiones (Versión del protocolo); la versión vigente por defecto sigue siendo " + C.versionActual() + ".") + '</div><div class="rejilla dos">' +
      '<div class="campo"><label class="et" for="cpPRef">Referencia</label><input id="cpPRef" autocomplete="off" value="' + esc(prot.ref || "") + '" data-cambio="cpProtCampo" data-k="ref" data-v="' + v + '"></div><div class="campo"><label class="et" for="cpPNot">Notas</label><input id="cpPNot" autocomplete="off" value="' + esc(prot.notas || "") + '" data-cambio="cpProtCampo" data-k="notas" data-v="' + v + '"></div></div>' +
      (admin ? '<button class="bt peligro" data-act="cpBorrarProt" data-v="' + v + '">' + ico("trash-2") + "Eliminar " + esc(v) + "</button>" : "") + "</section>" : "";
    return '<div class="aviso ' + (hp.revisar ? "aj" : "ok") + '">' + ico(hp.revisar ? "triangle-alert" : "circle-check") + "<div>" + (hp.revisar ? "<b>Revisar.</b> El horario de " + esc(v) + " se ha precargado " + (C.HORARIOS_PROTOCOLO[v] ? "de la hoja " + esc(C.HORARIOS_PROTOCOLO[v].ref) + " del Excel del protocolo" : prot.extra ? "copiando " + esc(prot.base || "otra versión") : "con el horario circadiano de referencia") + ": comprueba cada línea y márcalo como revisado." : "Horario de " + esc(v) + " revisado.") +
      " Cada fila es un <b>cambio de ritmo</b>: la línea mantiene ese ritmo hasta su siguiente cambio.</div>" + info("Los ritmos de cada experimento salen de su protocolo y se reescalan si el volumen real se desvía más de 100 mL de la referencia. La solución madre de cada línea (salvo nutrición, antifúngico y antibiótico, de concentración fija) es la que usan la tabla de infusiones y los cálculos de los experimentos con este protocolo, salvo que en el experimento se cambie.") + "</div>" + sel + ext +
      '<div class="fila-flex cfg-circ-barra"><label class="check"><input type="checkbox" data-cambio="cpRevisado" data-v="' + v + '"' + (!hp.revisar ? " checked" : "") + "> Horario de " + esc(v) + ' revisado</label><div class="campo"><label class="et" for="cpVref">Volumen de referencia</label><div class="unidad-in"><input id="cpVref" inputmode="decimal" data-num="1" value="' + esc(hp.V_ref_mL) + '" data-cambio="cpVref" data-v="' + v + '"><span>mL</span></div></div>' +
      '<div class="campo"><label class="et" for="cpCopia">Copiar el horario de</label><select id="cpCopia" data-cambio="cpCopiar" data-v="' + v + '"><option value="">—</option>' + C.VERSIONES.filter(function (x) { return x !== v; }).map(function (x) { return "<option>" + x + "</option>"; }).join("") + "</select></div>" + (admin ? '<button class="bt" data-act="cpLinea" data-v="' + v + '">' + ico("plus") + "Añadir línea</button>" : "") + "</div>" +
      '<p class="muy-tenue">' + esc(v + " · " + (prot.propuesto ? "protocolo propuesto" : (prot.ref || "")) + (prot.notas ? " · " + prot.notas : "")) + "</p>" + bloques + hepB + recomendacionModelo(v, hp);
  };
  // recomendación del modelo (antes «Coherencia con la administración circadiana» de los cálculos del perfusato)
  function recomendacionModelo(v, hp) {
    var F = S.cfg.farmacos || {}, V = C.num(hp.V_ref_mL) || vRef(), hto = 27, recs = [];
    var hcConc = (F.hidrocortisona_stock_mL_75 || 0.7) * 75 / (F.hidrocortisona_stock_vol_mL || 50) * 7.2;   // µg/mL en la infusión
    var bolo = hp.cambios.filter(function (c) { return c.linea === "Hidrocortisona" && c.h === "08:00"; })[0], cb = bolo ? C.cortisolBolo(C.num(bolo.valor), 30, hcConc, V, hto) : null;
    if (cb && cb.nmol_L) { var obj = 275, nuevo = C.redondearRitmo(C.num(bolo.valor) * obj / cb.nmol_L, "Hidrocortisona"); recs.push([cb.nmol_L < 250 || cb.nmol_L > 300 ? "ajuste" : "ok", "Bolo matutino de hidrocortisona (" + H.n(bolo.valor, 0) + " mL/h · 30 min · " + H.n(hcConc, 2) + " µg/mL): ≈ " + H.n(cb.nmol_L, 0) + " nmol/L en el plasma del circuito (objetivo 250–300)" + (cb.nmol_L < 250 || cb.nmol_L > 300 ? ". Propuesta: " + H.n(nuevo, 0) + " mL/h." : ".")]); }
    var mel = hp.cambios.filter(function (c) { return c.linea === "Melatonina" && C.num(c.valor) > 0; })[0];
    if (mel) { var CL = C.num(F.melatonina_CL_mL_min) || 500, css = C.num(mel.valor) * 0.2 * 1e6 / 60 / CL, nm = C.redondearRitmo(C.num(mel.valor) * 150 / css, "Melatonina"); recs.push([css < 100 || css > 200 ? "ajuste" : "ok", "Melatonina " + H.n(mel.valor, 1) + " mL/h a 0,2 µg/mL: estado estacionario ≈ " + H.n(css, 0) + " pg/mL con un aclaramiento estimado de " + H.n(CL, 0) + " mL/min (objetivo 100–200)" + (css < 100 || css > 200 ? ". Propuesta: " + H.n(nm, 0) + " mL/h o una concentración mayor; mide la melatonina y ajusta." : ".")]); }
    var tcMax = Math.max.apply(null, hp.cambios.filter(function (c) { return c.linea === "Ácidos biliares"; }).map(function (c) { return C.num(c.valor) || 0; }).concat([0]));
    if (tcMax) { var mgh = 31000 / 470 * tcMax, ref = F.taurocolato_ref_mg_h || 7.7; recs.push([mgh > 5 * ref ? "alerta" : "ok", "Taurocolato: 31 g en 470 mL a " + H.n(tcMax, 1) + " mL/h = " + H.n(mgh, 0) + " mg/h frente a ≈" + H.n(ref, 1) + " mg/h publicados (de Vries 2019; Lau 2023)" + (mgh > 5 * ref ? ": confirma la masa (¿3,1 g?)." : ".")]); }
    var tot = hp.lineas.reduce(function (a, l) { return (cfgH().lineas_excluidas || []).indexOf(l) === -1 ? a + C.volumenDiaLinea(hp, l) : a; }, 0);
    recs.push(["info", "Volumen infundido por el horario: " + H.n(tot, 0) + " mL/día (+ " + H.n((C.num(cfgH().otras_infusiones_mL_h) || 0) * 24, 0) + " mL/día de heparina): la HDF debe extraerlo para mantener el balance."]);
    return '<section class="tarjeta"><div class="cabecera"><h3>Recomendación del modelo para ' + esc(v) + "</h3>" + info("Estimaciones sin aclaramiento hepático (cortisol) o con un aclaramiento provisional (melatonina, Configuración → Fármacos), con el volumen de referencia del protocolo. Úsalas al crear o revisar un protocolo; no sustituyen a las mediciones.") + '</div><div class="recs">' + recs.map(function (x) { return '<div class="rec ' + x[0] + '">' + ico(x[0] === "ok" ? "circle-check" : x[0] === "info" ? "info" : "sliders-horizontal", "s") + "<div>" + esc(x[1]) + "</div></div>"; }).join("") + "</div></section>";
  }
  function hpEdit(v, fn) { var hp = H.copia(H.horarioProtocolo(v)); fn(hp); guardarHorario(v, hp); }
  function repintarCirc() { recordarAbiertos(); H.repintar(); }
  // v0.7.2: al cambiar la hora, la fila se coloca en su sitio (al salir del campo, para no cortar la escritura)
  function ordenarFilas(cont) { if (!cont) return; H.$$(".circ-fila", cont).map(function (f) { var t = f.querySelector("input[type=time]"); return { f: f, m: t ? C.hm(t.value) : 0 }; }).sort(function (a, b) { return a.m - b.m; }).forEach(function (x) { cont.appendChild(x.f); }); }
  H.acc.cpCampo = function (el) {
    var v = el.getAttribute("data-v"), i = +el.getAttribute("data-i"), k = el.getAttribute("data-k");
    if (k === "h" && !/^\d{2}:\d{2}$/.test(el.value)) return;
    hpEdit(v, function (hp) { hp.cambios[i][k] = k === "valor" ? C.num(String(el.value).replace(",", ".")) : el.value; });
    if (k === "h") { var cont = el.closest(".circ-filas"); if (document.activeElement === el) el.addEventListener("blur", function () { ordenarFilas(cont); }, { once: true }); else ordenarFilas(cont); }
  };
  H.acc.cpBorrar = function (el) { var v = el.getAttribute("data-v"), d = el.closest("details"); if (d) ABIERTOS[v + "|" + d.getAttribute("data-l")] = true; hpEdit(v, function (hp) { hp.cambios.splice(+el.getAttribute("data-i"), 1); }); repintarCirc(); };
  H.acc.cpFila = function (el) {
    var v = el.getAttribute("data-v"), l = el.getAttribute("data-l"), n = 0; hpEdit(v, function (hp) { hp.cambios.push({ h: "12:00", linea: l, valor: 0, unidad: "mL/h", nota: "" }); n = hp.cambios.length - 1; });
    recordarAbiertos(); ABIERTOS[v + "|" + l] = true; H.repintar();
    var nueva = H.$('.circ-fila input[data-k="h"][data-v="' + v + '"][data-i="' + n + '"]'); if (nueva) try { nueva.focus({ preventScroll: true }); } catch (e) { }
  };
  H.acc.cpRevisado = function (el) {
    var v = el.getAttribute("data-v");
    if (!el.checked) { hpEdit(v, function (hp) { hp.revisar = true; hp.verificado = false; }); repintarCirc(); return; }
    el.checked = false;
    H.confirmar("Horario de " + v + " revisado", "¿Has comprobado todas las líneas del horario de " + v + " (horas, ritmos y soluciones madre) con la hoja del protocolo? Los experimentos con este protocolo lo usarán como horario verificado.", "Sí, está revisado").then(function (ok) {
      if (!ok) return; hpEdit(v, function (hp) { hp.revisar = false; hp.verificado = true; }); H.toast("Horario de " + v + " marcado como revisado."); repintarCirc();
    });
  };
  H.acc.cpVref = function (el) { var v = el.getAttribute("data-v"); hpEdit(v, function (hp) { hp.V_ref_mL = C.num(String(el.value).replace(",", ".")) || vRef(); }); };
  function madreEdit(el, fn) {
    var v = el.getAttribute("data-v"), l = el.getAttribute("data-l"), j = +el.getAttribute("data-c");
    hpEdit(v, function (hp) { hp.madres = hp.madres || {}; if (!hp.madres[l]) hp.madres[l] = H.copia((((C.PROTOCOLOS[v] || {}).lineas || {})[l] || {}).componentes || [{ nombre: el.getAttribute("data-n") || l, madre: null, unidad: "mg/mL" }]).map(function (c) { return { nombre: c.nombre, madre: c.madre, unidad: c.unidad }; }); if (hp.madres[l][j]) fn(hp.madres[l][j], hp); });
  }
  H.acc.cpMadre = function (el) { madreEdit(el, function (c, hp) { c.madre = C.num(String(el.value).replace(",", ".")); if (el.getAttribute("data-l") === "Heparina") hp.heparina = Object.assign({}, hp.heparina, { madre: c.madre }); }); };
  H.acc.cpMadreU = function (el) { madreEdit(el, function (c) { c.unidad = el.value; }); };
  H.acc.cpHep = function (el) { var v = el.getAttribute("data-v"); hpEdit(v, function (hp) { hp.heparina = Object.assign({ unidad: "U/mL" }, hp.heparina, { ritmo_mL_h: C.num(String(el.value).replace(",", ".")) }); }); };
  H.acc.cpCopiar = function (el) { var v = el.getAttribute("data-v"), de = el.value; if (!de) return; var o = H.copia(H.horarioProtocolo(de)); hpEdit(v, function (hp) { hp.lineas = o.lineas; hp.cambios = o.cambios; hp.madres = o.madres; hp.heparina = o.heparina; hp.revisar = true; hp.verificado = false; }); H.toast("Horario copiado de " + de + ": revísalo."); repintarCirc(); };
  H.acc.cpLinea = function (el) { var v = el.getAttribute("data-v"); H.modal({ titulo: "Añadir línea al horario de " + v, cuerpo: '<div class="campo"><label class="et" for="cpLN">Nombre de la línea</label><input id="cpLN" autocomplete="off"></div>', pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="cpLOk">Añadir</button>', alAbrir: function (d) { d.querySelector("#cpLOk").addEventListener("click", function () { var n = d.querySelector("#cpLN").value.trim(); if (!n) return; hpEdit(v, function (hp) { if (hp.lineas.indexOf(n) === -1) hp.lineas.splice(Math.max(0, hp.lineas.indexOf("HDF") === -1 ? hp.lineas.length : hp.lineas.indexOf("HDF")), 0, n); }); ABIERTOS[v + "|" + n] = true; d.close(); repintarCirc(); }); } }); };
  // v0.7.2: «Añadir protocolo» = versión nueva (V10, V11…) con la estructura de la versión elegida (por defecto, la última)
  H.acc.cpNuevoProt = function (el) {
    if (!H.esAdmin()) return; var nv = C.siguienteVersion(), ult = C.VERSIONES[C.VERSIONES.length - 1], de0 = el.getAttribute("data-v") || ult;
    H.modal({ titulo: "Añadir protocolo " + nv, cuerpo: '<p class="muy-tenue">Se crea la versión ' + nv + " con las líneas, el horario y las soluciones madre de la versión elegida, para modificarla.</p>" +
      '<div class="campo"><label class="et" for="npDe">Copiar la estructura de</label><select id="npDe">' + C.VERSIONES.map(function (x) { var p = C.PROTOCOLOS[x]; return '<option value="' + x + '"' + (x === ult ? " selected" : "") + ">" + x + " · " + esc(p.propuesto ? "propuesto" : p.ref) + "</option>"; }).join("") + "</select></div>" +
      '<div class="campo"><label class="et" for="npRef">Referencia</label><input id="npRef" autocomplete="off" placeholder="p. ej. HOME-PM-11"></div><div class="campo"><label class="et" for="npNot">Notas</label><input id="npNot" autocomplete="off" placeholder="Qué cambia respecto a la versión anterior"></div>',
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="npOk">' + ico("plus") + "Crear " + nv + "</button>",
      alAbrir: function (d) { d.querySelector("#npOk").addEventListener("click", function () {
        var de = d.querySelector("#npDe").value || de0, ex = H.copia(S.cfg.protocolos_extra || {}), base = C.PROTOCOLOS[de];
        ex[nv] = { ref: d.querySelector("#npRef").value.trim() || "Nuevo protocolo (copia de " + de + ")", notas: d.querySelector("#npNot").value.trim(), fecha: C.diaISO(new Date()), base: de, creado_por: (S.usuario || {}).email || "", lineas: conMadres(de, H.copia(base.lineas)) };
        var hp = H.copia(H.horarioProtocolo(de)); hp.revisar = true; hp.verificado = false; hp.copia_de = de; delete hp.fuente; delete hp.ref;
        H.guardarCfg("protocolos_extra", ex); guardarHorario(nv, hp); d.close(); H.toast("Protocolo " + nv + " creado a partir de " + de + ": modifícalo y márcalo como revisado."); H.ir("config/circadiano/" + nv);
      }); } });
  };
  H.acc.cpProtCampo = function (el) { var v = el.getAttribute("data-v"), ex = H.copia(S.cfg.protocolos_extra || {}); if (!ex[v]) return; ex[v][el.getAttribute("data-k")] = el.value.trim(); H.guardarCfg("protocolos_extra", ex); };
  H.acc.cpBorrarProt = function (el) {
    var v = el.getAttribute("data-v"), ex = H.copia(S.cfg.protocolos_extra || {}); if (!ex[v]) return;
    var usan = H.filas("Experimentos").filter(function (e) { return H.versionExp(e) === v; }).map(function (e) { return e.ID; });
    if (usan.length) { H.toast(v + " lo usa" + (usan.length > 1 ? "n " : " ") + usan.join(", ") + ": cambia antes su versión del protocolo.", "error"); return; }
    H.confirmar("Eliminar " + v, "Se eliminan la versión " + v + " y su horario. No se puede deshacer.", "Eliminar", true).then(function (ok) {
      if (!ok) return; delete ex[v]; H.guardarCfg("protocolos_extra", ex); H.borrar("Config", [claveH(v)]); H.recalcCfg(); H.toast("Versión " + v + " eliminada."); H.ir("config/circadiano/" + C.versionActual());
    });
  };

  var GRUPOS_HDF = [["Extracción y balance", ["paso_mL_h", "max_mL_h", "horizonte_h", "otras_infusiones_mL_h"], "Solo se recomienda la extracción (mL/h) que deja el balance de volumen en cero en el horizonte indicado, en pasos que admite la máquina. El volumen de las muestras ya no se configura: sale de los tubos de cada punto del muestreo."],
    ["Parámetros fijos de la máquina", ["parametros.set", "parametros.liquido", "parametros.Q_sangre", "parametros.Q_dialisis", "parametros.Reposicion", "parametros.Reposicion_modo", "parametros.Temp_min", "parametros.Temp_max"], "Son siempre los mismos: se precargan en la pre-perfusión y en cada registro de la HDF."],
    ["Dializado (Accusol 35 K2 + fosfato dipotásico)", ["dializado.Na", "dializado.K", "dializado.Ca", "dializado.Mg", "dializado.Cl", "dializado.HCO3", "dializado.Glucosa_mg_dL", "dializado.fosfato_mL_bolsa", "dializado.fosfato_M", "dializado.bolsa_L"], "Composición efectiva del líquido de diálisis y reposición: es el valor hacia el que tienden los iones al subir el intercambio."],
    ["Límites de las recomendaciones", ["consejo.urea_max", "consejo.urea_subida_pct", "consejo.K_min", "consejo.K_max", "consejo.Na_min", "consejo.Na_max", "consejo.HCO3_min", "consejo.HCO3_max", "consejo.BE_min", "consejo.BE_max", "consejo.Ca_min", "consejo.P_min", "consejo.P_max", "consejo.Mg_min", "consejo.Glucosa_max", "consejo.Osm_min", "consejo.Osm_max", "consejo.Lactato_max", "consejo.temp_minima"], "Las recomendaciones combinan todos estos límites a la vez (no uno a uno): urea, iones, ácido-base, lactato y temperatura del perfusato. Por ejemplo, con alcalosis no se sube la reposición aunque la urea esté alta; con lactato alto la acidosis no se trata con la HDF; por debajo de la temperatura mínima no se propone ningún cambio."],
    ["Cambios que se pueden proponer", ["consejo.Q_dialisis_alto", "consejo.Q_sangre_max", "consejo.Reposicion_baja", "consejo.Reposicion_alta"], "Valores hasta los que se propone subir o bajar el flujo de diálisis, el de sangre y la reposición cuando la analítica lo pide."]];
  H.seccionesExtra.hdf = function () {
    var o = S.cfg.hdf, N = C.NOMBRES_HDF, leer = function (k) { return H.leerRuta(o, k); };
    function campoH(k) {
      var n = N[k] || [k, "", ""], v = leer(k), id = "cfgh_" + k.replace(/\W/g, "_"), num = typeof v === "number" || v === null || v === undefined && /_|max|min/.test(k);
      return '<div class="campo cfg-h"><label class="et" for="' + id + '">' + esc(n[0]) + (n[2] ? info(n[2]) : "") + '</label><div class="unidad-in"><input id="' + id + '" type="text"' + (num ? ' inputmode="decimal" data-num="1"' : "") + ' autocomplete="off" value="' + esc(v === null || v === undefined ? "" : typeof v === "number" ? String(v).replace(".", ",") : v) + '" data-cambio="cfgCampo" data-c="hdf" data-k="' + esc(k) + '">' + (n[1] ? "<span>" + esc(n[1]) + "</span>" : "") + "</div></div>";
    }
    var rg = o.rangos || C.DEF.hdf.rangos;
    return '<div class="aviso info">' + ico("info") + "<div>Configuración fija de la hemodiafiltración (Aquarius, set pediátrico HF03). Los títulos de cada casilla explican qué hace; la (i) da el detalle.</div></div><div class=\"fila-flex\" style=\"margin-bottom:10px\"><button class=\"bt\" data-act=\"cfgRestaurar\" data-k=\"hdf\">" + ico("undo-2") + "Valores por defecto</button></div>" +
      GRUPOS_HDF.map(function (g) { return '<section class="tarjeta"><div class="cabecera"><h3>' + esc(g[0]) + "</h3>" + info(g[2]) + '</div><div class="rejilla cfg-hdf">' + g[1].map(campoH).join("") + "</div></section>"; }).join("") +
      '<section class="tarjeta"><div class="cabecera"><h3>Rangos de las presiones y de la temperatura</h3><span class="chip aj">Provisionales</span>' + info("Rangos de trabajo por defecto para el set HF03 con flujo de sangre 80 mL/min. Son provisionales hasta recibir la tabla de rangos del grupo. Fuera de rango, la casilla sale en rojo y se avisa en la pestaña HDF.") + '</div><div class="rejilla cfg-hdf">' +
      Object.keys(rg).map(function (k) { var n = N["rangos." + k] || [k, "", ""]; return '<div class="campo cfg-h"><span class="et">' + esc(n[0].replace(" (rango)", "")) + '</span><div class="par-rango"><div class="unidad-in"><input inputmode="decimal" aria-label="' + esc(n[0] + " mínimo") + '" value="' + esc(String(rg[k][0]).replace(".", ",")) + '" data-cambio="cfgRango" data-k="' + k + '" data-i="0"><span>mín.</span></div><div class="unidad-in"><input inputmode="decimal" aria-label="' + esc(n[0] + " máximo") + '" value="' + esc(String(rg[k][1]).replace(".", ",")) + '" data-cambio="cfgRango" data-k="' + k + '" data-i="1"><span>máx.</span></div></div><div class="ayuda">' + esc(n[1]) + "</div></div>"; }).join("") + "</div></section>";
  };
  H.acc.cfgRango = function (el) { var o = H.copia(S.cfg.hdf), k = el.getAttribute("data-k"), i = +el.getAttribute("data-i"); o.rangos = o.rangos || H.copia(C.DEF.hdf.rangos); o.rangos[k] = (o.rangos[k] || [null, null]).slice(); o.rangos[k][i] = C.num(String(el.value).replace(",", ".")); H.guardarCfg("hdf", o); };

  // ============================================================== 12. Cierre: campos alineados; «Trasplante del injerto» → Estado «Trasplante» y seguimiento del receptor
  var MOTIVOS = ["Objetivo de la perfusión alcanzado", MOT_TX, "Aumento de la resistencia / problema de flujo", "Fallo técnico del dispositivo", "Deterioro del injerto", "Obstrucción o parada del flujo biliar", "Contaminación / infección", "Decisión del equipo", "Otro"];
  H.tabsExp.cierre = function (e) {
    var ev = H.eventos(e.ID), d = H.usarForm(e.ID, "cierre", ""), puedo = H.puede("registrar"), dis = puedo ? "" : " disabled", esTx = d.motivo === MOT_TX, est = d.motivo ? (esTx ? "Trasplante" : "Finalizado") : null, cerrado = e.Estado === "Finalizado" || e.Estado === "Trasplante";
    return '<section class="tarjeta cierre"><div class="cabecera"><h2>Fin de la perfusión</h2><span id="indGuardado" class="guardado">' + ico("check", "s") + "Guardado automático</span></div>" +
      '<div class="rejilla dos cierre-rej"><div class="campo"><label class="et" for="cFin">Fecha y hora de fin' + info("El cronómetro de la perfusión se para a esta hora; después solo se pueden completar los puntos del muestreo hasta el fin o añadir un registro urgente.") + '</label><div class="con-ahora"><input id="cFin" type="datetime-local" value="' + H.aLocal(ev.fin_perfusion || e.Fin_perfusion || "") + '"' + dis + ">" + (puedo ? '<button type="button" class="bt mini" data-act="ahoraFH" data-id="cFin">Ahora</button>' : "") + "</div></div>" +
      '<div class="campo"><label class="et" for="cPeso">Peso final del hígado' + info("Pésalo antes del trasplante o de la necropsia.") + '</label><div class="unidad-in"><input id="cPeso" inputmode="decimal" data-num="1" value="' + esc(e.Peso_higado_final_g || "") + '"' + dis + '><span>g</span></div></div>' +
      '<div class="campo"><label class="et" for="cMot">Motivo de finalización' + info("Con «Trasplante del injerto» el experimento pasa a «Trasplante» y se abre el seguimiento del receptor; con cualquier otro, a «Finalizado».") + '</label><select id="cMot" data-cambio="cierreMotivo" data-exp="' + esc(e.ID) + '"' + dis + '><option value="">—</option>' + MOTIVOS.map(function (m) { return '<option value="' + esc(m) + '"' + (m === d.motivo ? " selected" : "") + ">" + esc(m) + "</option>"; }).join("") + "</select>" + (est ? '<div class="cierre-est"><span class="chip ' + (esTx ? "info" : "") + '">Pasará a «' + est + "»</span></div>" : "") + "</div>" +
      (esTx ? '<div class="campo"><span class="et">Destino del injerto</span><div class="valor-fijo">Trasplante al receptor</div></div>' : H.campo("destino", "Destino del injerto", d.destino, { tipo: "select", opciones: ["Necropsia y muestras", "Desechado"] })) +
      H.campo("obs", "Observaciones finales", d.obs, { tipo: "textarea", ancho: true }) + "</div>" +
      (esTx ? '<div class="aviso info">' + ico("heart-pulse") + '<div><b>Trasplante del injerto.</b> Se abren <a href="#/exp/' + idq(e) + '/cirugia">Cirugía → receptor</a> y <a href="#/exp/' + idq(e) + '/seguimiento/post">Seguimiento → Post-trasplante</a> para el receptor HOME-LR-' + esc(String(e.ID).replace("HOME-", "")) + ".</div></div>" : "") +
      (puedo ? '<button class="bt pri" data-act="cerrarExp" data-exp="' + esc(e.ID) + '">' + ico("circle-check") + (cerrado ? "Actualizar el fin de la perfusión" : "Finalizar la perfusión") + "</button>" : "") + "</section>";
  };
  H.acc.cierreMotivo = function (el) { var exp = el.getAttribute("data-exp"), d = H.usarForm(exp, "cierre", ""); d.motivo = el.value; if (d.motivo === MOT_TX) delete d.destino; H.guardarForm(exp, "cierre", "", d); H.repintar(); };
  H.acc.cerrarExp = function (el) {
    var exp = el.getAttribute("data-exp"), e = H.exp(exp), f = H.deLocal(H.$("#cFin").value), pf = C.num(H.$("#cPeso").value), selM = H.$("#cMot"), d = H.usarForm(exp, "cierre", "");
    if (selM && selM.value !== (d.motivo || "")) { d.motivo = selM.value; H.guardarForm(exp, "cierre", "", d); }
    if (!f) { H.toast("Indica la fecha y hora de fin.", "error"); H.$("#cFin").focus(); return; }
    var esTx = d.motivo === MOT_TX, est = esTx ? "Trasplante" : "Finalizado";
    H.confirmar("Finalizar perfusión", "El experimento pasará a «" + est + "», el cronómetro se parará a las " + H.hora(f) + " y se cancelarán los avisos pendientes." + (esTx ? " Se abre el seguimiento del receptor." : ""), "Finalizar").then(function (ok) {
      if (!ok) return; H.guardar("Eventos", [{ ID: exp + "|evento|fin_perfusion", Experimento: exp, Tipo: "fin_perfusion", Fecha_hora: f }], { sinRepintar: true });
      var o = { ID: exp, Estado: est, Fin_perfusion: f, Peso_higado_final_g: pf }; if (esTx) { if (tipoOrig(e) !== "trasplante") o.Fase = C.TIPOS_PROC ? C.TIPOS_PROC[2] : "Perfusión con trasplante"; if (!e.Fecha_trasplante) o.Fecha_trasplante = H.aFechaLocal(f); }
      H.guardar("Experimentos", [o], { sinRepintar: true }); H.cancelarAvisos(exp, []); H.toast(exp + ": " + (esTx ? "trasplante del injerto; seguimiento del receptor abierto." : "finalizado.")); H.repintar();
    });
  };

  // ============================================================== 13. Post-trasplante: observaciones por día al marcar un evento; bioquímica con el diseño de la perfusión
  function t0Rec(e) { var rf = H.form(e.ID, "receptor", "LR") || {}, base = rf.fecha || e.Fecha_trasplante, finQx = H.leerRuta(rf, "qx.fin"); return base ? C.aFecha(C.diaISO(C.aDia(base)) + "T" + (finQx || "12:00") + ":00") : null; }
  H.postBq = function (e) {
    var t0 = t0Rec(e), cols = [{ m: "REC", p: "Basal", et: "Basal", sub: "antes del trasplante", t: null, f: "" }].concat(C.PUNTOS_REC.map(function (h) { return { m: "REC", p: h + " h", et: h + " h", t: h, f: t0 ? new Date(t0.getTime() + h * 36e5).toISOString() : "" }; }));   // v0.7.1: basal del receptor
    return '<p class="muy-tenue">Receptor HOME-LR-' + esc(String(e.ID).replace("HOME-", "")) + (t0 ? " · tiempo 0 = fin de la cirugía del trasplante (" + esc(H.diaCorto(t0) + " " + H.hora(t0)) + ")" : "") + '.</p><section class="tarjeta"><div class="cabecera"><h3>Bioquímica y gasometría del receptor</h3>' + info("Basal del receptor (antes del trasplante) y seguimiento a las 0, 3, 6, 12, 24… h del fin de la cirugía. Los informes del laboratorio con el NHC del receptor (" + (nhcCfg().nhc_receptor || "—") + ") van a esta tabla.") + "</div>" + pieTabla(e) + tablaHoja(e, cols, C.MUESTRAS.REC.vars, { objM: "PERF", titulo: "Bioquímica y gasometría del receptor" }) + "</section>";
  };
  H.postSupervision = function (e) {
    var t0 = t0Rec(e), puedo = H.puede("registrar"), dis = puedo ? "" : " disabled", sup = H.usarForm(e.ID, "receptor_sup", "LR"), rf = H.form(e.ID, "receptor", "LR") || {}, peso = C.num(rf.peso_kg), L = H.leerRuta;
    H.formActivo(function (el) { if (el.type === "checkbox" || el.type === "datetime-local") H.retrasar("supRep", 800, H.repintarPronto); });
    function med(h, k, pauta) { if (!pauta) return '<td class="na">—</td>'; var kk = "filas.h" + h + "." + k; return '<td><label class="check"><input type="checkbox" data-k="' + kk + '" data-cambio="campoForm"' + (L(sup, kk) ? " checked" : "") + dis + "> " + esc(pauta) + (k === "tac" && peso ? ' <span class="muy-tenue">(' + H.n(0.04 * peso, 2) + " mg)</span>" : "") + "</label></td>"; }
    function hayEvento(h) { var k = "filas.h" + h + "."; return !!(L(sup, k + "fecha") || L(sup, k + "muestras") || L(sup, k + "buprex") || L(sup, k + "tac") || L(sup, k + "met") || L(sup, k + "cef")); }
    var porDia = {}; C.SUPERVISION_REC.forEach(function (r) { var dd = Math.max(1, Math.ceil(r.h / 24)); (porDia[dd] = porDia[dd] || []).push(r); });
    var filas = Object.keys(porDia).map(Number).sort(function (a, b) { return a - b; }).map(function (dd) {
      var rs = porDia[dd], conEv = rs.some(function (r) { return hayEvento(r.h); }), ko = "dias.d" + dd + ".obs";
      return rs.map(function (r) { var k = "filas.h" + r.h + ".", fh = t0 ? new Date(t0.getTime() + r.h * 36e5) : null;
        return '<tr class="' + (hayEvento(r.h) ? "con-evento" : "") + '"><th scope="row">' + r.h + " h" + (fh ? '<div class="muy-tenue">' + esc(H.diaCorto(fh) + " " + H.hora(fh)) + "</div>" : "") + '</th><td><div class="con-ahora"><input type="datetime-local" id="sup' + r.h + '" aria-label="Extracción a las ' + r.h + ' h" value="' + esc(H.aLocal(L(sup, k + "fecha") || "")) + '" data-k="' + k + 'fecha" data-cambio="campoForm"' + dis + ">" + (puedo ? '<button type="button" class="bt mini" data-act="ahoraFH" data-id="sup' + r.h + '">Ahora</button>' : "") + "</div></td>" +
          '<td><label class="check"><input type="checkbox" data-k="' + k + 'muestras" data-cambio="campoForm"' + (L(sup, k + "muestras") ? " checked" : "") + dis + "> Tomadas</label></td>" + '<td><input aria-label="Buprex a las ' + r.h + ' h" value="' + esc(L(sup, k + "buprex") || "") + '" data-k="' + k + 'buprex" data-cambio="campoForm" placeholder="dosis…"' + dis + "></td>" + med(r.h, "tac", r.tacrolimus) + med(r.h, "met", r.metpret) + med(r.h, "cef", r.cefoxitina) + "</tr>"; }).join("") +
        (conEv || L(sup, ko) ? '<tr class="obs-dia"><td colspan="7"><label class="et" for="obsD' + dd + '">Observaciones del día ' + dd + "</label><textarea id=\"obsD" + dd + '" rows="2" data-k="' + ko + '" data-cambio="campoForm" placeholder="Estado del receptor, incidencias, cambios de pauta…"' + dis + ">" + esc(L(sup, ko) || "") + "</textarea></td></tr>" : "");
    }).join("");
    return '<p class="muy-tenue">Receptor HOME-LR-' + esc(String(e.ID).replace("HOME-", "")) + (t0 ? " · tiempo 0 = fin de la cirugía del trasplante (" + esc(H.diaCorto(t0) + " " + H.hora(t0)) + ")" : "") + '.</p><section class="tarjeta"><div class="cabecera"><h3>Supervisión post-trasplante</h3>' + info("Al marcar un evento de una hora (extracción, muestras o medicación) se abren las observaciones de ese día.") + '<span id="indGuardado" class="guardado">' + ico("check", "s") + 'Guardado automático</span></div><div class="tabla-env"><table class="t tabla-sup"><thead><tr><th>Hora</th><th>Extracción</th><th>Muestras</th><th>Buprex</th><th>Tacrolimus</th><th>Metpret</th><th>Cefoxitina</th></tr></thead><tbody>' + filas +
      '</tbody></table></div><div class="rejilla dos">' + H.campo("obs", "Observaciones generales", sup.obs, { tipo: "textarea", ancho: true }) + H.campo("reportado", "Reportado por", sup.reportado || (S.usuario || {}).nombre, {}) + "</div></section>";
  };

  // ============================================================== 14. Subir PDF: informe del laboratorio del HULP → verificación → solo se guardan los valores confirmados (el PDF no se guarda)
  var IMP = { exp: null, inf: null, filas: [], destExp: null, punto: null };
  var NOM_DEST = { ART: "Gasometría arterial", POR: "Gasometría portal", CAV: "Gasometría cava", PERF: "Bioquímica del perfusato", BILIS: "Bilis", INMUNO: "Inmunología", REC: "Receptor", PRE: "Pre-perfusión (= 0 h)", BASAL_LD: "Basal del donante de hígado" };
  function opcionesPunto(exp) {
    var t0 = H.inicioPerf(exp), o = [{ v: "Basal", et: "Basal (donante de hígado)", t: null }, { v: "Pre", et: "Pre-perfusión (= 0 h)", t: 0 }];
    if (t0) C.puntosMuestreo(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo).forEach(function (p) { if (p.t_h > 0) o.push({ v: p.etiqueta, et: p.etiqueta + " · " + H.diaCorto(p.fecha) + " " + H.hora(p.fecha) + (p.inmuno ? " · inmunología" : ""), t: p.t_h, f: p.fecha.toISOString(), inmuno: !!p.inmuno }); });
    var e = H.exp(exp); if (e && C.tipoProc(e) === "trasplante") { o.push({ v: "REC|Basal", et: "Receptor · basal (antes del trasplante)", t: null, rec: true }); C.PUNTOS_REC.forEach(function (h) { o.push({ v: "REC|" + h + " h", et: "Receptor · " + h + " h", t: h, rec: true }); }); }
    urgentes(exp).forEach(function (u) { o.push({ v: u.punto, et: u.punto, t: u.t_h, f: u.fecha }); });
    return o;
  }
  function puntoPara(exp, inf) {
    var ops = opcionesPunto(exp), t0 = H.inicioPerf(exp);
    // v0.7.1: el NHC decide donante/receptor (receptor: basal del receptor y seguimiento; donantes: basal, pre-perfusión y perfusión)
    if (inf.muestra === "REC" || inf.sujeto === "receptor") {
      var recs = ops.filter(function (o) { return o.rec; }); if (inf.horas === "basal" || inf.horas === "pre") return recs.some(function (o) { return o.v === "REC|Basal"; }) ? "REC|Basal" : null;
      var hr = typeof inf.horas === "number" ? inf.horas : 0, rr = recs.filter(function (o) { return o.t !== null; }).sort(function (a, b) { return Math.abs(a.t - hr) - Math.abs(b.t - hr); })[0]; return rr ? rr.v : null;
    }
    if (inf.horas === "basal") return "Basal"; if (inf.horas === "pre" || inf.horas === 0) return "Pre";
    var th = typeof inf.horas === "number" ? inf.horas : (t0 && inf.fecha ? C.horasEntre(t0, new Date(inf.fecha)) : null); if (th === null) return null;
    var cand = ops.filter(function (o) { return o.t !== null && !o.rec && o.v !== "Basal"; });
    if (inf.muestra === "INMUNO" && cand.some(function (o) { return o.inmuno; })) cand = cand.filter(function (o) { return o.inmuno || o.v === "Pre"; });   // v0.7.1: la inmunología va a sus puntos (24 h, 48 h…)
    var c = cand.sort(function (a, b) { return Math.abs(a.t - th) - Math.abs(b.t - th); })[0]; return c ? c.v : null;
  }
  function destino(r, punto) {
    if (!punto) return null; if (/^REC\|/.test(punto)) return { m: "REC", p: punto.split("|")[1] };   // «REC|Basal» = basal del receptor
    if (punto === "Basal") return { m: "BASAL_LD", p: "Basal" }; if (punto === "Pre") return { m: "PRE", p: "Pre" };
    return { m: r.muestra === "INMUNO" ? "INMUNO" : r.muestra, p: punto };
  }
  function nhcCfg() { var g = S.cfg.general || {}; return { nhc_donantes: g.nhc_donantes, nhc_receptor: g.nhc_receptor }; }
  // aviso de la verificación si el NHC del informe no cuadra con el destino elegido
  function avisoNHC(inf, punto, exp) {
    var g = nhcCfg(), n = inf.nhc, esRec = /^REC\|/.test(punto || ""), e = H.exp(exp), txTx = e && C.tipoProc(e) === "trasplante";
    if (!n) return '<div class="aviso info aviso-nhc">' + ico("info") + "<div>No se ha encontrado el NHC en el informe: comprueba que el destino es el correcto (donantes " + esc(g.nhc_donantes || "—") + ", receptor " + esc(g.nhc_receptor || "—") + ").</div></div>";
    if (!inf.sujeto) return '<div class="aviso aj aviso-nhc">' + ico("triangle-alert") + "<div>El NHC del informe (<b>" + esc(n) + "</b>) no coincide con los de Configuración → General (donantes " + esc(g.nhc_donantes || "—") + ", receptor " + esc(g.nhc_receptor || "—") + "): comprueba que el informe es de este experimento.</div></div>";
    if (inf.sujeto === "receptor" && !txTx) return '<div class="aviso aj aviso-nhc">' + ico("triangle-alert") + "<div>El NHC del informe (<b>" + esc(n) + "</b>) es el del <b>receptor</b>, pero " + esc(exp || "el experimento") + " no tiene trasplante: elige el experimento correcto.</div></div>";
    if (punto && inf.sujeto === "receptor" && !esRec) return '<div class="aviso aj aviso-nhc">' + ico("triangle-alert") + "<div>El NHC del informe (<b>" + esc(n) + "</b>) es el del <b>receptor</b>, pero el punto elegido es de los donantes o de la perfusión.</div></div>";
    if (punto && inf.sujeto === "donante" && esRec) return '<div class="aviso aj aviso-nhc">' + ico("triangle-alert") + "<div>El NHC del informe (<b>" + esc(n) + "</b>) es el de los <b>donantes</b> (basal, pre-perfusión y perfusión), pero el punto elegido es del receptor.</div></div>";
    return "";
  }
  H.avisoNHC = avisoNHC;
  function tieneVar(m, v) { return (C.MUESTRAS[m] || { vars: [] }).vars.some(function (x) { return x.id === v; }); }
  H.importarFilas = function (expActual, filas, texto) {
    var inf = C.leerInformeLab(filas, texto, nhcCfg()), porPM = inf.codigo ? H.listaExp().filter(function (x) { return String(x.Codigo_PM || "").toUpperCase() === inf.codigo; })[0] : null, exp = porPM ? porPM.ID : expActual;
    IMP = { exp: expActual, inf: inf, destExp: exp, encontrado: !!porPM, punto: puntoPara(exp, inf), filas: [] };
    IMP.filas = inf.resultados.map(function (r) { return Object.assign({}, r, { sel: !r.censurado }); }); recalcDest(); return IMP;
  };
  function recalcDest() { IMP.filas.forEach(function (r) { var d = destino(r, IMP.punto); r.dest = d; r.ok = !!(d && tieneVar(d.m, r.variable)); if (!r.ok) r.sel = false; var x = d && r.ok ? H.valor(IMP.destExp, d.m, d.p, r.variable) : null; r.previo = x ? (C.num(x.Valor) !== null ? x.Valor : x.Texto) : null; }); }
  function verifHTML() {
    if (!IMP.inf) return ""; var inf = IMP.inf, ops = opcionesPunto(IMP.destExp), nSel = IMP.filas.filter(function (r) { return r.sel; }).length;
    var cab = '<section class="tarjeta pdf-verif"><div class="cabecera"><h3>Verificación antes de guardar</h3>' + info("Revisa cada valor antes de guardarlo. Los valores censurados (<, >) vienen desmarcados: si los marcas, se guardan como texto (p. ej. «<3»). Si ya hay un valor en ese punto, se sustituye. El PDF no se guarda.") + '<span class="chip ' + (nSel ? "pri" : "") + '">' + nSel + " de " + IMP.filas.length + " marcados</span></div>" +
      '<dl class="datos-exp cinco"><div><dt>Observaciones del informe</dt><dd>' + esc(inf.observaciones || "—") + "</dd></div><div><dt>Código</dt><dd>" + esc(inf.codigo || "no encontrado") + "</dd></div><div><dt>Tipo de muestra</dt><dd>" + esc(inf.tipo || inf.muestra || "—") + "</dd></div><div><dt>Obtención de la muestra</dt><dd>" + esc(inf.fecha ? H.diaCorto(new Date(inf.fecha)) + " " + H.hora(new Date(inf.fecha)) : "—") + "</dd></div><div><dt>Horas del informe</dt><dd>" + esc(inf.horas === null ? "—" : String(inf.horas)) + "</dd></div><div><dt>NHC</dt><dd>" + esc(inf.nhc ? inf.nhc + (inf.sujeto === "receptor" ? " · receptor" : inf.sujeto === "donante" ? " · donantes" : " · desconocido") : "no encontrado") + "</dd></div></dl>" + avisoNHC(inf, IMP.punto, IMP.destExp) +
      (IMP.encontrado ? "" : '<div class="aviso aj">' + ico("triangle-alert") + "<div>" + (inf.codigo ? "Ningún experimento tiene el código " + esc(inf.codigo) + ": elige el experimento." : "El informe no lleva un código HOME-PM-xx: elige el experimento.") + "</div></div>") +
      '<div class="rejilla dos"><div class="campo"><label class="et" for="impExp">Experimento</label><select id="impExp" data-cambio="impExp">' + H.listaExp().map(function (x) { return '<option value="' + esc(x.ID) + '"' + (x.ID === IMP.destExp ? " selected" : "") + ">" + esc(x.ID + (x.Codigo_PM ? " · " + x.Codigo_PM : "")) + "</option>"; }).join("") + '</select></div><div class="campo"><label class="et" for="impPunto">Punto de muestreo</label><select id="impPunto" data-cambio="impPunto"><option value="">— elige —</option>' + ops.map(function (o) { return '<option value="' + esc(o.v) + '"' + (o.v === IMP.punto ? " selected" : "") + ">" + esc(o.et) + "</option>"; }).join("") + '</select><div class="ayuda">El más cercano a las horas del informe.</div></div></div>';
    var filas = IMP.filas.map(function (r, i) {
      var conv = r.convertido ? "× " + H.n(r.valor / C.num(String(r.resultado).replace(/[<>=\s]/g, "").replace(",", ".")), 4) + " (" + esc(r.unidades) + " → " + esc(C.variable("PERF", r.variable).unidad) + ")" : "—";
      return '<tr class="' + (r.ok ? "" : "no-dest") + (r.censurado ? " censurado" : "") + '"><td class="chk"><input type="checkbox" aria-label="Guardar ' + esc(r.variable) + '"' + (r.sel ? " checked" : "") + (r.ok ? "" : " disabled") + ' data-cambio="impSel" data-i="' + i + '"></td><td><b>' + esc(C.variable(r.dest ? r.dest.m : "PERF", r.variable).nombre) + '</b><div class="muy-tenue">' + esc(r.prueba) + "</div></td><td class=\"num\">" + esc(r.resultado) + (r.censurado ? ' <span class="chip aj" title="Valor fuera del límite de detección">censurado</span>' : "") + "</td><td>" + esc(r.unidades || "") + "</td><td>" + conv +
        '</td><td class="num"><b>' + (r.censurado ? esc(r.censurado + H.n(r.valor, 3)) : H.n(r.valor, 3)) + "</b></td><td>" + (r.dest ? esc((NOM_DEST[r.dest.m] || r.dest.m) + " · " + r.dest.p) : "—") + (r.ok ? "" : '<div class="muy-tenue">Sin casilla en esta muestra</div>') + (r.previo !== null && r.previo !== undefined ? '<div><span class="chip aj">Ya hay ' + esc(String(r.previo).replace(".", ",")) + ": se sustituye</span></div>" : "") + "</td></tr>";
    }).join("");
    return cab + '<div class="tabla-env"><table class="t tabla-imp"><thead><tr><th></th><th>Variable</th><th class="num">Resultado</th><th>Unidad del informe</th><th>Conversión</th><th class="num">Valor en HOME</th><th>Destino</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      (inf.ignoradas.length ? '<details class="plegable"><summary>' + inf.ignoradas.length + " línea(s) del informe sin casilla en HOME</summary><div class=\"dentro\"><ul>" + inf.ignoradas.map(function (x) { return "<li>" + esc(x.prueba + " = " + x.resultado + " · " + x.motivo) + "</li>"; }).join("") + "</ul></div></details>" : "") +
      '<div class="fila-flex"><button class="bt" data-act="impTodos">Marcar todos los no censurados</button><button class="bt" data-act="impCancelar">Descartar</button><button class="bt pri" data-act="impGuardar"' + (nSel && IMP.punto ? "" : " disabled") + ">" + ico("save") + "Guardar los " + nSel + " valores marcados</button></div></section>";
  }
  function repVerif() { var c = H.$("#pdfVerif"); if (c) c.innerHTML = verifHTML(); }
  H.pdfVerifHTML = verifHTML; H.IMP = function () { return IMP; };
  H.pdfPantalla = function (e) {
    if (!H.puede("registrar")) return '<div class="aviso info">' + ico("lock") + "<div>Tu usuario es de solo lectura: no puede importar informes.</div></div>";
    var prev = !!window.HOME_PREVIEW || location.protocol === "file:";
    var g = nhcCfg();
    return '<section class="tarjeta pdf-imp"><div class="cabecera"><h3>Subir el informe del laboratorio</h3>' + info("Se lee el texto del PDF del Servicio de Análisis Clínicos (Hospital La Paz): código HOME-PM-xx y horas en «Observaciones», tipo de muestra (arterial, portal, cava, bilis, inmunología, receptor), el NHC y cada prueba con su resultado y unidad. El NHC decide si es de los donantes (" + (g.nhc_donantes || "—") + ": basal, pre-perfusión y perfusión) o del receptor (" + (g.nhc_receptor || "—") + ": basal del receptor y seguimiento); se cambian en Configuración → General. Antes de guardar se muestran todos los valores para verificarlos. El PDF no se sube ni se guarda.") + "</div>" +
      '<div class="aviso info">' + ico("shield-check") + "<div>Solo se guardan los valores que confirmes en la pantalla de verificación; <b>el PDF no se guarda</b>.</div></div>" +
      '<div class="rejilla dos pdf-campos"><div class="campo"><span class="et"><label for="pdfArchivo">Informe en PDF</label>' + info(prev ? "En la vista previa de un solo archivo no se puede cargar el lector de PDF: usa la versión publicada o pega el texto." : "El lector de PDF (pdf.js) se descarga la primera vez que se usa: hace falta conexión.") + '</span><input id="pdfArchivo" type="file" accept="application/pdf,.pdf" data-cambio="pdfArchivo" data-exp="' + esc(e.ID) + '"' + (prev ? " disabled" : "") + ">" + (prev ? '<div class="pdf-acciones"><span class="chip aj">Solo en la versión publicada</span></div>' : "") + "</div>" +
      '<div class="campo"><span class="et"><label for="pdfTexto">… o pega el texto del informe</label></span><textarea id="pdfTexto" rows="4" placeholder="Selecciona todo el texto del PDF, cópialo y pégalo aquí"></textarea><div class="pdf-acciones"><button class="bt mini" data-act="pdfTexto" data-exp="' + esc(e.ID) + '">' + ico("file-text", "s") + "Leer el texto</button></div></div></div>" +
      '<div id="pdfEstado" class="muy-tenue" role="status"></div></section><div id="pdfVerif">' + (IMP.exp === e.ID ? verifHTML() : "") + "</div>";
  };
  H.cargarPdfjs = function () {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (window.HOME_PREVIEW || location.protocol === "file:") return Promise.reject(new Error("La importación de PDF necesita la versión publicada de la web (en la vista previa, pega el texto)."));
    return new Promise(function (ok, ko) { var sc = document.createElement("script"); sc.src = "pdf.min.js"; sc.onload = function () { if (!window.pdfjsLib) { ko(new Error("No se pudo cargar el lector de PDF.")); return; } window.pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js"; ok(window.pdfjsLib); }; sc.onerror = function () { ko(new Error("No se pudo descargar el lector de PDF (¿sin conexión?).")); }; document.head.appendChild(sc); });
  };
  // páginas → fragmentos {str, x, y} → filas (C.filasDeItems); se exporta para las pruebas
  H.pdfFilas = function (lib, datos) {
    return lib.getDocument({ data: datos, verbosity: 0 }).promise.then(function (doc) {
      var ps = []; for (var i = 1; i <= doc.numPages; i++) ps.push(doc.getPage(i).then(function (pg) { return pg.getTextContent(); }));
      return Promise.all(ps).then(function (tcs) { var filas = [], txt = []; tcs.forEach(function (tc) { var r = C.filasDeItems(tc.items.map(function (it) { return { str: it.str, x: it.transform[4], y: it.transform[5] }; })); filas = filas.concat(r.filas); txt.push(r.texto); }); return { filas: filas, texto: txt.join("\n") }; });
    });
  };
  H.acc.pdfArchivo = function (el) {
    var f = el.files && el.files[0], exp = el.getAttribute("data-exp"), est = H.$("#pdfEstado"); if (!f) return; if (est) est.textContent = "Leyendo " + f.name + "…";
    H.cargarPdfjs().then(function (lib) { return f.arrayBuffer().then(function (b) { return H.pdfFilas(lib, new Uint8Array(b)); }); }).then(function (r) {
      H.importarFilas(exp, r.filas, r.texto); el.value = ""; if (est) est.textContent = f.name + ": " + IMP.filas.length + " valores leídos. Revísalos antes de guardar."; repVerif();
    }).catch(function (x) { if (est) est.textContent = ""; H.toast(x.message || String(x), "error"); });
  };
  H.acc.pdfTexto = function (el) {
    var t = (H.$("#pdfTexto") || {}).value || "", exp = el.getAttribute("data-exp"); if (!t.trim()) { H.toast("Pega el texto del informe.", "error"); return; }
    H.importarFilas(exp, C.filasDeTexto(t), t); var est = H.$("#pdfEstado"); if (est) est.textContent = IMP.filas.length + " valores leídos del texto. Revísalos antes de guardar."; repVerif();
  };
  H.acc.impSel = function (el) { var r = IMP.filas[+el.getAttribute("data-i")]; if (r) r.sel = el.checked; repVerif(); };
  H.acc.impTodos = function () { IMP.filas.forEach(function (r) { r.sel = r.ok && !r.censurado; }); repVerif(); };
  H.acc.impCancelar = function () { IMP = { exp: null, inf: null, filas: [] }; repVerif(); };
  H.acc.impExp = function (el) { IMP.destExp = el.value; IMP.encontrado = true; IMP.punto = puntoPara(IMP.destExp, IMP.inf); recalcDest(); repVerif(); };
  H.acc.impPunto = function (el) { IMP.punto = el.value || null; recalcDest(); repVerif(); };
  H.acc.impGuardar = function () {
    if (!IMP.inf || !IMP.punto) return; var exp = IMP.destExp, ops = opcionesPunto(exp), op = ops.filter(function (o) { return o.v === IMP.punto; })[0] || {}, grupos = {}, n = 0;
    var fecha = IMP.inf.fecha ? new Date(IMP.inf.fecha).toISOString() : (op.f || new Date().toISOString());
    IMP.filas.forEach(function (r) { if (!r.sel || !r.ok) return; var k = r.dest.m + "|" + r.dest.p; (grupos[k] = grupos[k] || { d: r.dest, o: {} }).o[r.variable] = r.censurado ? r.censurado + String(r.valor).replace(".", ",") : r.valor; n++; });
    if (!n) { H.toast("No hay valores marcados.", "error"); return; }
    var ps = Object.keys(grupos).map(function (k) { var g = grupos[k], t = g.d.m === "PRE" || g.d.m === "BASAL_LD" ? null : g.d.m === "REC" ? C.num(g.d.p) : op.t; return H.guardarMediciones(exp, g.d.m, g.d.p, t === undefined ? null : t, fecha, g.o); });
    H.guardar("Eventos", [{ ID: H.uid(), Experimento: exp, Tipo: "muestra", Fecha_hora: fecha, Nota: "Importados " + n + " valores del informe del laboratorio (" + (IMP.inf.observaciones || "sin observaciones") + ") en «" + IMP.punto + "». El PDF no se guarda." }], { sinRepintar: true });
    Promise.all(ps).then(function () { }, function () { }); H.toast(n + " valores guardados en " + exp + " · " + IMP.punto + "."); IMP = { exp: null, inf: null, filas: [] }; repVerif();
  };

  // ---- v0.7.1: NHC de los donantes y del receptor en Configuración → General (editables; por defecto 3306230 y 3306231)
  var cfgVistaPrev = H.vistas && H.vistas.config;
  if (cfgVistaPrev) H.vistas.config = function (p) {
    var h = cfgVistaPrev.apply(this, arguments); if (((p && p[0]) || "") !== "general") return h;
    return h.replace('for="cfg_nhc_donantes">nhc_donantes</label>', 'for="cfg_nhc_donantes">NHC de los donantes' + info("NHC con el que el laboratorio identifica las muestras de los donantes: basal, pre-perfusión y perfusión. Al subir un informe se lee su NHC para elegir el destino.") + "</label>")
      .replace('for="cfg_nhc_receptor">nhc_receptor</label>', 'for="cfg_nhc_receptor">NHC del receptor' + info("NHC con el que el laboratorio identifica las muestras del receptor: basal del receptor y seguimiento post-trasplante.") + "</label>");
  };

  // ============================================================== 15. Resumen diario (aviso «resumen», destino «diario»): 14:00 o antes si el punto de las 10:00 está completo
  var REQ_RES = { ART: ["pH", "pO2", "pCO2"], POR: ["pH", "pO2", "pCO2"], CAV: ["pH", "pO2", "pCO2"], FLUJO: ["Q_AH", "Q_VP", "P_AH", "P_VP", "Temp"], PERF: ["Lactato", "Glucosa", "Urea", "Na", "K", "ALT", "AST", "LDH", "BilT", "Albumina"], BILIS: ["Volumen_mL"] };
  var NOM_RES = { ART: "gasometría arterial", POR: "gasometría portal", CAV: "gasometría cava", FLUJO: "flujos y presiones", PERF: "bioquímica (tubo amarillo)", BILIS: "volumen de bilis" };
  H.RES_REQ = REQ_RES;
  function diasPerf(exp) { var t0 = C.aFecha(H.inicioPerf(exp)); if (!t0) return []; var n = S.cfg.general.dias_perfusion, out = []; for (var d = 0; d <= n; d++) { var f = C.enHora(t0, "14:00", d); if (f > t0 && f.getTime() <= t0.getTime() + n * 864e5 + 6e4) out.push(f); } return out; }
  function puntoDelDia(exp, f14) {
    var t0 = H.inicioPerf(exp), dia = C.diaISO(f14), pts = C.puntosMuestreo(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo).filter(function (p) { return C.diaISO(p.fecha) === dia && p.fecha <= f14; });
    return pts.filter(function (p) { return p.amarillo; })[0] || pts.filter(function (p) { return p.tipo === "completa"; }).pop() || null;
  }
  H.faltaResumen = function (exp, punto) { var out = []; Object.keys(REQ_RES).forEach(function (m) { var f = REQ_RES[m].filter(function (v) { var x = H.valor(exp, m, punto, v); return !x || (C.num(x.Valor) === null && !x.Texto); }); if (f.length) out.push(NOM_RES[m] + (f.length < REQ_RES[m].length ? " (" + f.join(", ") + ")" : "")); }); return out; };
  function v1(exp, m, p, v, d) { var x = H.valor(exp, m, p, v); return x && C.num(x.Valor) !== null ? H.n(x.Valor, d) : "—"; }
  function textoResumen(e, p, falta) {
    var x = e.ID, bx = H.balanceExp(e), db = H.derivadasBilis ? H.derivadasBilis(e, { punto: p.etiqueta }) || {} : {};
    // v0.7.1: formato lista (una variable por línea, separadas por "\n")
    return ["Punto " + p.etiqueta, "Lactato: " + v1(x, "PERF", p.etiqueta, "Lactato", 1) + " mmol/L", "pH arterial: " + v1(x, "ART", p.etiqueta, "pH", 2), "Urea: " + v1(x, "PERF", p.etiqueta, "Urea", 0) + " mg/dL", "ALT/AST: " + v1(x, "PERF", p.etiqueta, "ALT", 0) + "/" + v1(x, "PERF", p.etiqueta, "AST", 0) + " U/L",
      "Bilis: " + (db.Produccion_mLh !== undefined && db.Produccion_mLh !== null ? H.n(db.Produccion_mLh, 1) : "—") + " mL/h", "Flujos AH/VP: " + v1(x, "FLUJO", p.etiqueta, "Q_AH", 0) + "/" + v1(x, "FLUJO", p.etiqueta, "Q_VP", 0) + " mL/min"]
      .concat(bx ? ["Extracción HDF: " + (bx.b.extraccion_actual === null ? "—" : H.n(bx.b.extraccion_actual, 0)) + " mL/h", "Balance: " + H.n(bx.b.balance_mL, 0) + " mL"] : [])
      .concat([falta.length ? "Falta: " + falta.join("; ") : "Punto completo"]).join("\n");
  }
  function memRes() { try { return JSON.parse(localStorage.getItem("home_resumen") || "{}") || {}; } catch (x) { return {}; } }
  // avisos de resumen de todos los días pendientes (el servidor cancela los «resumen» pendientes del experimento en cada llamada)
  H.avisosResumen = function (exp, adelantar) {
    var e = H.exp(exp); if (!e || !H.inicioPerf(exp)) return []; var ahora = Date.now(), mem = memRes(), out = [], t0 = C.aFecha(H.inicioPerf(exp));
    diasPerf(exp).forEach(function (f14) {
      var dia = C.diaISO(f14), id = exp + "|resumen|" + dia, ya = H.filas("Avisos").filter(function (a) { return a.ID === id; })[0], adel = adelantar === dia;
      if ((ya && ya.Estado === "Enviado") || (mem[id] && mem[id].enviado && !adel)) return; if (f14.getTime() < ahora - 6e4 && !adel) return;
      var p = puntoDelDia(exp, f14), falta = p ? H.faltaResumen(exp, p.etiqueta) : [], n = Math.floor((f14 - t0) / 864e5) + 1;
      out.push({ ID: id, Experimento: exp, Fecha_hora: adel ? new Date(ahora).toISOString() : f14.toISOString(), Tipo: "resumen", Destino: "diario", Vista: "exp:" + exp + ":seguimiento", Titulo: "Resumen diario · " + exp + " · día " + n + (falta.length ? " (incompleto)" : ""), Texto: p ? textoResumen(e, p, falta) : "Sin punto de muestreo con tubo amarillo antes de las 14:00." });
    });
    return out;
  };
  H.revisarResumen = function (exp) {
    var e = H.exp(exp); if (!e || !H.inicioPerf(exp) || H.perfTerminada(exp) || !H.puede("registrar")) return null;
    var ahora = new Date(), hoy = diasPerf(exp).filter(function (f) { return C.diaISO(f) === C.diaISO(ahora); })[0]; if (!hoy) return null;
    var dia = C.diaISO(hoy), id = exp + "|resumen|" + dia, mem = memRes(); if (mem[id] && mem[id].enviado) return null;
    var p = puntoDelDia(exp, hoy); if (!p || p.fecha > ahora) return null; var falta = H.faltaResumen(exp, p.etiqueta), completo = !falta.length && hoy > ahora;
    var lista = H.avisosResumen(exp, completo ? dia : null), firma = lista.map(function (a) { return a.ID + a.Fecha_hora.slice(0, 16) + a.Texto; }).join("|");
    if (!completo && mem[exp] === firma) return null;
    mem[exp] = firma; if (completo) mem[id] = { enviado: true, t: Date.now() }; try { localStorage.setItem("home_resumen", JSON.stringify(mem)); } catch (x) { }
    H.programarAvisos(exp, lista, ["resumen"]); return completo ? lista.filter(function (a) { return a.ID === id; })[0] : null;
  };
  // al programar los avisos de la perfusión (inicio o reprogramación): horario circadiano del protocolo y resúmenes diarios
  var progOrig = H.programarAvisos;
  H.programarAvisos = function (exp, avisos, tipos) {
    tipos = (tipos || []).slice(); var e = H.exp(exp), t0 = H.inicioPerf(exp) || (e && e.Inicio_perfusion) || null, g = S.cfg.general, ya = Date.now() - 6e4;
    // v0.7.2: siempre con el horario del protocolo del experimento (también si el inicio aún no está en los eventos) y solo los avisos futuros
    if (e && t0 && tipos.indexOf("circadiano") !== -1 && H.esCircadiano(e)) avisos = avisos.filter(function (a) { return a.Tipo !== "circadiano"; }).concat(C.avisosCircadianos(exp, t0, g.dias_perfusion, H.circadianoDe(e), g.aviso_antelacion_min).filter(function (a) { var d = C.aFecha(a.Fecha_hora); return !d || d.getTime() > ya; }));
    if (e && t0 && tipos.indexOf("muestra") !== -1 && tipos.indexOf("resumen") === -1) { avisos = avisos.concat(H.avisosResumen(exp)); tipos.push("resumen"); }
    return progOrig(exp, avisos, tipos);
  };
})();

/* v0.7 (fusión): las gráficas toman como punto 0 h la toma de la pre-perfusión cuando solo se guardó allí (pre = 0 h). */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME;
  if (!C || !H || !H.serieExp || !H.parPre) return;
  var orig = H.serieExp;
  H.serieExp = function (exp, m, v, eje) {
    var s = orig.apply(this, arguments) || [];
    if ((m !== "ART" && m !== "PERF") || !H.parPre(m, "0 min", v) || s.some(function (p) { return p.punto === "0 min"; })) return s;
    var t0 = H.inicioPerf(exp), pre = (H.med(exp) || []).filter(function (x) { return x.Muestra === "PRE" && x.Punto === "Pre" && x.Variable === v && !x.Borrado && C.num(x.Valor) !== null; })[0];
    if (!pre || !t0) return s;
    var reg = Object.assign({}, pre, { Muestra: m, Punto: "0 min", T_nominal_h: 0, T_real_h: 0, Fecha_hora: t0 }), x = C.xDe(reg, eje || "real", C.aFecha(t0));
    if (x === null || x === undefined) return s;
    return s.concat([{ x: x, y: C.num(pre.Valor), punto: "0 min", fecha: t0, tn: 0 }]).sort(function (a, b) { return a.x - b.x; });
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v07b.js"] = "0.7.2";
