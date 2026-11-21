/* HOME · v0.7 (a): interfaz general, cabecera, Inicio, Calendario y Configuración. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME;
  if (!C || !H) return;
  var S = H.S, esc = H.esc, ico = H.ico;

  // ============================================================== valores por defecto nuevos (solo si faltan)
  var RESP_COMIDA = ["Fernando Gil Villaverde", "Paloma Guijarro Bachiller", "Rubén Ruiz Garzón"];
  if (C.DEF.dieta && !Array.isArray(C.DEF.dieta.responsables_qr)) C.DEF.dieta.responsables_qr = RESP_COMIDA.slice();
  if (C.DEF.inicio) { if (C.DEF.inicio.vista === undefined) C.DEF.inicio.vista = "24h"; if (C.DEF.inicio.muestreo === undefined) C.DEF.inicio.muestreo = true; if (C.DEF.inicio.hdf_rec === undefined) C.DEF.inicio.hdf_rec = true; }
  function cfgIni() { return (S.cfg && S.cfg.inicio) || C.DEF.inicio; }

  // ============================================================== estado de la sesión (no se guarda como preferencia personal)
  var memSes = {};
  function ses(k, v) {
    var key = "home_ses_" + k;
    if (v === undefined) { try { var x = sessionStorage.getItem(key); return x === null ? memSes[k] : JSON.parse(x); } catch (e) { return memSes[k]; } }
    memSes[k] = v; try { if (v === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) { }
  }
  H.sesion = ses;
  // La pantalla de inicio es igual para todos: la vista por defecto la elige un administrador (Config.inicio.vista).
  // El selector de la cabecera solo la cambia durante la sesión; los desplegables abiertos tampoco se guardan como preferencia.
  var prefPrev = H.pref;
  H.pref = function (k, v) {
    if (k === "vistaIni") { if (v === undefined) { var m = ses("vistaIni"); return m || cfgIni().vista || "24h"; } ses("vistaIni", v); return; }
    if (k === "gruposIni") { if (v === undefined) return ses("gruposIni") || {}; ses("gruposIni", v); return; }
    return prefPrev.apply(H, arguments);
  };

  // ============================================================== pellizco: bloqueado salvo dentro de [data-zoom]
  function enZoom(t) { return !!(t && t.closest && t.closest("[data-zoom]")); }
  function zoomPropio(t) { return !!(t && t.closest && t.closest(".g-amp-vista")); }
  function bloquearGesto(e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : e.target && e.target.parentElement;
    if (!enZoom(t) || zoomPropio(t)) { if (e.cancelable !== false) e.preventDefault(); }
    // pellizcar una miniatura de Inicio abre su ampliación (donde sí se puede ampliar y desplazar)
    var g = t && t.closest ? t.closest(".g-tarjeta[data-ampliar]") : null;
    if (g && !H.$("#grafAmpliado") && H.ampliarGrafico) H.ampliarGrafico(g.getAttribute("data-ampliar"), g.getAttribute("data-k"), g.getAttribute("data-modo"));
  }
  ["gesturestart", "gesturechange"].forEach(function (n) { document.addEventListener(n, bloquearGesto, { passive: false }); });
  document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) bloquearGesto(e); }, { passive: false });
  H.enZoom = enZoom;

  // ============================================================== repintar sin perder el desplazamiento
  // Se conserva el scroll de la ventana si la vista base no cambia (partes [0..1] de la ruta; en un experimento, [0..2])
  // y el de los contenedores desplazables internos (por id o por su posición estable entre los del mismo tipo).
  function baseRuta(r) { r = r || H.ruta(); return r.partes.slice(0, r.partes[0] === "exp" ? 3 : 2).join("/"); }
  H.baseRuta = baseRuta;
  function firma(el) { return el.id ? "#" + el.id : el.tagName + "." + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").trim().split(/\s+/).filter(function (c) { return c !== "activo" && c !== "abierto"; }).sort().join("."); }
  function capturarScroll(raiz) {
    var out = [], cuenta = {}; if (!raiz) return out;
    Array.prototype.forEach.call(raiz.querySelectorAll("*"), function (el) {
      var f = firma(el), i = cuenta[f] = (cuenta[f] || 0) + 1;
      if (el.scrollTop > 0 || el.scrollLeft > 0) out.push({ f: f, i: i, top: el.scrollTop, left: el.scrollLeft });
    });
    return out;
  }
  function restaurarScroll(raiz, lista) {
    if (!raiz || !lista || !lista.length) return; var cuenta = {}, porClave = {};
    lista.forEach(function (x) { porClave[x.f + "|" + x.i] = x; });
    Array.prototype.forEach.call(raiz.querySelectorAll("*"), function (el) { var f = firma(el), i = cuenta[f] = (cuenta[f] || 0) + 1, x = porClave[f + "|" + i]; if (x) { el.scrollTop = x.top; el.scrollLeft = x.left; } });
  }
  // en barras de pestañas desplazables, la activa siempre queda a la vista
  function pestanaVisible(raiz) {
    H.$$(".pestanas, .segmentado.sub2, .segmentado.nivel, .vista-exp, .subpestanas", raiz).forEach(function (c) {
      var a = c.querySelector(".activo"); if (!a || !c.clientWidth || c.scrollWidth <= c.clientWidth) return;
      var l = a.offsetLeft - c.offsetLeft, r = l + a.offsetWidth; if (l < c.scrollLeft) c.scrollLeft = Math.max(0, l - 16); else if (r > c.scrollLeft + c.clientWidth) c.scrollLeft = r - c.clientWidth + 16;
    });
  }
  var repPrev = H.repintar;
  H.repintar = function () {
    var main = H.$("#principal"), b = baseRuta(), y = window.pageYOffset || window.scrollY || 0, misma = !!main && H._baseRutaA === b, sc = misma ? capturarScroll(main) : null;
    var res = repPrev.apply(this, arguments);
    H._baseRutaA = b;
    main = H.$("#principal");
    if (misma && main) { if (y) window.scrollTo(0, y); restaurarScroll(main, sc); }
    try { pestanaVisible(main); despuesDePintar(); } catch (e) { console.error(e); }
    return res;
  };
  H.capturarScroll = capturarScroll; H.restaurarScroll = restaurarScroll;

  // ============================================================== cabecera: chip de la perfusión y vista en una segunda fila
  function despuesDePintar() {
    var cab = H.$(".cab"); if (cab) {
      var chip = H.$("#chipActivo"), perf = H.$("#cabPerf"), hay = !!((chip && chip.children.length) || (perf && perf.children.length));
      cab.classList.toggle("con-fila2", hay); medirCab();
    }
    envolverTablas(); datalistComida();
  }
  function medirCab() { var cab = H.$(".cab"); if (!cab) return; var h = cab.offsetHeight; if (h > 30) document.documentElement.style.setProperty("--cab", h + "px"); }
  if (window.addEventListener) window.addEventListener("resize", function () { H.retrasar("medirCab", 120, medirCab); });
  var chipPrev = H.chipActivo;
  H.chipActivo = function () { var r = chipPrev.apply(this, arguments); var cab = H.$(".cab"), chip = H.$("#chipActivo"), perf = H.$("#cabPerf"); if (cab) cab.classList.toggle("con-fila2", !!((chip && chip.children.length) || (perf && perf.children.length))); return r; };
  // tablas sin contenedor con desplazamiento propio: se envuelven para que nunca ensanchen la página
  function envolverTablas() {
    var main = H.$("#principal"); if (!main) return;
    H.$$("table", main).forEach(function (t) {
      if (t.closest(".tabla-env, .hoja, .circ-env, .tabla-auto, dialog, .g-amp-caja, [data-sin-envoltorio]")) return;
      var d = document.createElement("div"); d.className = "tabla-auto"; t.parentNode.insertBefore(d, t); d.appendChild(t);
    });
  }

  // ============================================================== Inicio: esquema de muestreo y recomendación de la HDF
  var ABREV = { LH: "Heparina de litio", EDTA: "EDTA", CIT: "Citrato", AMA: "Amarillo", GAS: "Gasometría" }, ORDEN_T = ["LH", "EDTA", "CIT", "AMA", "GAS"];
  function cfgMu() { var m = S.cfg && S.cfg.muestreo; return m && m.version === 7 && m.tubos ? m : C.DEF.muestreo; }
  function mlTubos(t, m) { var s = 0; Object.keys(t || {}).forEach(function (k) { s += (C.num(t[k]) || 0) * (((m.tubos || {})[k] || {}).mL || 0); }); return Math.round(s * 100) / 100; }
  function nf(v) { return H.n(v, v % 1 ? (Math.round(v * 10) === v * 10 ? 1 : 2) : 0); }
  function listaTubos(t, m) {
    return ORDEN_T.concat(Object.keys(t || {}).filter(function (k) { return ORDEN_T.indexOf(k) === -1; })).filter(function (k) { return C.num((t || {})[k]); }).map(function (k) {
      var n = C.num(t[k]), tb = (m.tubos || {})[k] || { nombre: k, mL: 0 };
      return '<li><span class="im-n">' + n + ' ×</span><span class="im-nom">' + esc(tb.nombre) + '</span><span class="im-ml">' + nf(tb.mL) + " mL" + (n > 1 ? " c/u" : "") + "</span></li>";
    }).join("");
  }
  function cortoTubos(t) { return ORDEN_T.filter(function (k) { return C.num((t || {})[k]); }).map(function (k) { return (C.num(t[k]) > 1 ? t[k] + " × " : "") + ABREV[k]; }).join(" · "); }
  function horasTxt(l) { return l.map(function (h) { return h === 0 ? "0 min" : h < 1 ? Math.round(h * 60) + " min" : H.n(h, 1) + " h"; }).join(", "); }
  H.planMuestreoInicio = function (e, ahora) {
    var t0 = H.inicioPerf(e.ID); if (!t0) return null;
    var m = cfgMu(), dias = (S.cfg.general || {}).dias_perfusion || 7, pts = C.puntosMuestreo(t0, dias, S.cfg.muestreo), now = ahora ? ahora.getTime() : Date.now();
    var mlPre = mlTubos(m.pre, m), hechos = pts.filter(function (p) { return p.fecha.getTime() <= now; }), futuros = pts.filter(function (p) { return p.fecha.getTime() > now; });
    var suma = function (l) { return l.reduce(function (a, p) { return a + (p.mL || 0); }, 0); };
    return { m: m, pts: pts, pre: mlPre, hechos: hechos, futuros: futuros, prox: futuros[0] || null,
      extraido: Math.round((mlPre + suma(hechos)) * 10) / 10, total: Math.round((mlPre + suma(pts)) * 10) / 10,
      ult24: Math.round(suma(hechos.filter(function (p) { return p.fecha.getTime() > now - 864e5; })) * 10) / 10,
      sig24: Math.round(suma(futuros.filter(function (p) { return p.fecha.getTime() <= now + 864e5; })) * 10) / 10 };
  };
  H.muestreoInicioHTML = function (e) {
    var P = H.planMuestreoInicio(e); if (!P) return "";
    var m = P.m, p = P.prox, nota = function (x) { return (x.tipo === "extra" ? "Solo EDTA y gasometrías (metabolismo posprandial)" : x.amarillo ? "Incluye el tubo amarillo diario" : "") ; };
    var proxHTML = p ? '<div class="im-prox"><div class="et">Próxima extracción · ' + esc(p.etiqueta) + '</div><div class="im-hora"><b>' + esc(H.diaCorto(p.fecha) + " " + H.hora(p.fecha)) + '</b> <span class="muy-tenue">· faltan <span data-cuenta="' + p.fecha.toISOString() + '">--:--</span></span></div>' +
      '<ul class="im-tubos">' + listaTubos(p.tubos, m) + "</ul>" + '<div class="im-total">Volumen de sangre: <b>' + nf(p.mL) + " mL</b>" + (nota(p) ? ' <span class="muy-tenue">· ' + esc(nota(p)) + "</span>" : "") + (p.bilis ? ' <span class="chip">+ bilis</span>' + H.botonInfo("En este punto también se toma muestra de bilis: no cuenta para el volumen de sangre extraído.") : "") + "</div></div>"
      : '<div class="im-prox"><div class="et">Próxima extracción</div><div class="im-hora"><b>Protocolo de muestreo completado</b></div></div>';
    var filas = P.futuros.slice(0, 8).map(function (x) { return "<tr><td><b>" + esc(x.etiqueta) + "</b></td><td>" + esc(H.diaCorto(x.fecha) + " " + H.hora(x.fecha)) + '</td><td class="envolver">' + esc(cortoTubos(x.tubos)) + (x.tipo === "extra" ? ' <span class="chip">metabolismo</span>' : "") + '</td><td class="num">' + nf(x.mL) + "</td></tr>"; }).join("");
    var c = m.completa || {}, txt = "Pre-perfusión: " + cortoTubos(m.pre) + " (" + nf(P.pre) + " mL). Primeras 24 h, a los " + horasTxt(m.dia1_h || []) + ": " + cortoTubos(c) + " (" + nf(mlTubos(c, m)) + " mL; a las 24 h, + amarillo). " +
      "Después, cada 12 h a las " + (m.diarias || []).join(" y ") + " (manda la hora del día), con el amarillo a las " + esc(m.amarillo_hora || "") + (m.extra_horas && m.extra_horas.length ? "; a las " + m.extra_horas.join(" y ") + ": " + cortoTubos(m.extra) + " (" + nf(mlTubos(m.extra, m)) + " mL) para los cálculos de metabolismo" : "") + ". Las muestras de bilis dependen de la bilis producida y no cuentan para el volumen.";
    return '<h3 class="sub">Muestreo de la perfusión</h3><div class="ini-muestreo">' + proxHTML + "</div>" +
      '<details class="plegable im-plan"><summary>Próximas extracciones y esquema completo</summary><div class="dentro">' + (filas ? '<div class="tabla-env"><table class="t"><thead><tr><th>Punto</th><th>Hora</th><th>Tubos</th><th class="num">mL</th></tr></thead><tbody>' + filas + "</tbody></table></div>" : "") +
      '<p class="muy-tenue" style="margin:8px 0 0">' + esc(txt) + "</p></div></details>";
  };
  // v0.7.1: volúmenes de sangre del muestreo → sección «Balance de volumen y HDF» de la misma tarjeta (mismo diseño de indicadores)
  H.volumenesMuestreoHTML = function (e) {
    var P = H.planMuestreoInicio(e); if (!P) return "";
    var kp = function (et, v, sub) { return '<div class="kpi im-vol"><div class="et">' + esc(et) + '</div><div class="v">' + H.n(v, 1) + '<small>mL</small></div><div class="tend">' + sub + "</div></div>"; };
    return kp("Muestreo · extraído hasta ahora", P.extraido, P.hechos.length + " de " + P.pts.length + " puntos + pre-perfusión") + kp("Muestreo · últimas 24 h", P.ult24, "según el plan de muestreo") +
      kp("Muestreo · próximas 24 h", P.sig24, P.futuros.filter(function (x) { return x.fecha.getTime() <= Date.now() + 864e5; }).length + " extracciones") + kp("Muestreo · total del protocolo", P.total, "pre-perfusión " + nf(P.pre) + " mL");
  };
  // cierre del <div> que empieza en la posición i (cuenta los <div> anidados)
  function finDiv(h, i) { var n = 0, re = /<div\b|<\/div>/g, m; re.lastIndex = i; while ((m = re.exec(h))) { n += m[0] === "</div>" ? -1 : 1; if (!n) return m.index; } return -1; }
  function ponerVolumenes(h, vol) {
    var cab = '<h3 class="sub">Balance de volumen y HDF</h3>', i = h.indexOf(cab), k = i === -1 ? -1 : h.indexOf('<div class="kpis kpis-ini">', i), f = k === -1 ? -1 : finDiv(h, k);
    if (f !== -1) return h.slice(0, f) + vol + h.slice(f);
    var bloque = cab + '<div class="kpis kpis-ini">' + vol + "</div>", j = h.indexOf('<h3 class="sub">Administración circadiana');
    return j === -1 ? h.replace(/<\/section>\s*$/, bloque + "</section>") : h.slice(0, j) + bloque + h.slice(j);
  }
  function recHDFInicio(e) {
    var h = H.recomendacionHDFInicio ? H.recomendacionHDFInicio(e) : H.consejoHDFHTML ? H.consejoHDFHTML(e) : "";
    if (!h) return "";
    h = String(h).replace(/^<section class="tarjeta[^"]*">/, '<div class="ini-hdf-rec">').replace(/<\/section>\s*$/, "</div>");
    return h.indexOf("ini-hdf-rec") === -1 ? '<div class="ini-hdf-rec">' + h + "</div>" : h;
  }
  var tarjPrev = H.tarjetaPerfusion;
  H.tarjetaPerfusion = function (e) {
    var h = tarjPrev.apply(this, arguments), ci = cfgIni(), mu = "", rec = "";
    try { if (ci.muestreo !== false) { mu = H.muestreoInicioHTML(e); var vol = mu ? H.volumenesMuestreoHTML(e) : ""; if (vol) h = ponerVolumenes(h, vol); } } catch (x) { console.error(x); }
    try { if (ci.hdf_rec !== false) rec = recHDFInicio(e); } catch (x) { console.error(x); }
    if (mu) { var i = h.indexOf('<h3 class="sub">Alertas</h3>'); h = i === -1 ? h.replace(/<\/section>\s*$/, mu + "</section>") : h.slice(0, i) + mu + h.slice(i); }
    if (rec) { var j = h.indexOf('<h3 class="sub">Administración circadiana'); h = j === -1 ? h.replace(/<\/section>\s*$/, rec + "</section>") : h.slice(0, j) + rec + h.slice(j); }
    return h;
  };

  // ============================================================== gráfico ampliado: + / −, restablecer, arrastrar, rueda y pellizco
  var ampPrev = H.ampliarGrafico;
  if (ampPrev) H.ampliarGrafico = function () {
    var r = ampPrev.apply(this, arguments), o = H.$("#grafAmpliado"); if (!o) return r;
    var n = o.cloneNode(true); o.parentNode.replaceChild(n, o);   // sin el «cerrar al tocar en cualquier sitio» original
    prepararZoom(n); return r;
  };
  function prepararZoom(o) {
    var caja = o.querySelector(".g-amp-caja"), svg = o.querySelector("svg.graf-ejes"), pie = o.querySelector(".g-amp-pie"), dentro = false, movido = false;
    o.setAttribute("data-zoom", "");
    o.addEventListener("pointerdown", function (e) { dentro = !!(caja && caja.contains(e.target)); movido = false; }, true);
    o.addEventListener("click", function (e) { var d = dentro; dentro = false; if (movido) { movido = false; return; } if (e.target === o && !d) H.acc.cerrarAmpliado(); });
    if (pie) pie.textContent = svg ? "Arrastra para desplazarte · + / −, rueda o pellizco para ampliar · toca fuera del gráfico para cerrar" : "Toca fuera del gráfico para cerrar";
    if (!svg) return;
    var vb = (svg.getAttribute("viewBox") || "0 0 760 380").split(/[\s,]+/).map(Number), W = vb[2] || 760, Hh = vb[3] || 380, z = { s: 1, x: 0, y: 0 };
    var vista = document.createElement("div"); vista.className = "g-amp-vista"; vista.setAttribute("data-zoom", ""); vista.setAttribute("tabindex", "0"); vista.setAttribute("aria-label", "Gráfico: arrastra para desplazarte; teclas + y − para ampliar o reducir, 0 para restablecer");
    svg.parentNode.insertBefore(vista, svg); vista.appendChild(svg);
    var barra = document.createElement("div"); barra.className = "g-amp-zoom"; barra.setAttribute("role", "toolbar"); barra.setAttribute("aria-label", "Ampliación del gráfico");
    barra.innerHTML = '<button type="button" class="bt ico-solo" data-z="menos" aria-label="Reducir">' + ico("zoom-out") + '</button><span class="g-amp-nivel" aria-live="polite">100 %</span><button type="button" class="bt ico-solo" data-z="mas" aria-label="Ampliar">' + ico("zoom-in") + '</button><button type="button" class="bt" data-z="reset">' + ico("rotate-ccw", "s") + "Restablecer</button>";
    vista.parentNode.insertBefore(barra, vista);
    function aplicar() {
      z.s = Math.max(1, Math.min(8, z.s)); var w = W / z.s, h = Hh / z.s; z.x = Math.max(0, Math.min(W - w, z.x)); z.y = Math.max(0, Math.min(Hh - h, z.y));
      svg.setAttribute("viewBox", [z.x, z.y, w, h].map(function (v) { return Math.round(v * 100) / 100; }).join(" "));
      barra.querySelector(".g-amp-nivel").textContent = Math.round(z.s * 100) + " %"; vista.classList.toggle("ampliado", z.s > 1.001);
      barra.querySelector("[data-z=menos]").disabled = z.s <= 1.001; barra.querySelector("[data-z=mas]").disabled = z.s >= 7.999; barra.querySelector("[data-z=reset]").disabled = z.s <= 1.001;
      if (sel) colocarEtq();
    }
    // v0.7.2: tocar (o pulsar) un punto sin arrastrar → etiqueta con el valor, la unidad, el punto, la hora y el experimento
    var etq = document.createElement("div"), sel = null, toque = null; etq.className = "g-amp-etq"; etq.hidden = true; etq.setAttribute("role", "status"); etq.setAttribute("aria-live", "polite"); vista.appendChild(etq);
    var EXP = o.getAttribute("data-exp") || "", UNI = o.getAttribute("data-u") || "", DEC = C.num(o.getAttribute("data-dec")), T0 = C.num(o.getAttribute("data-t0"));
    function puntoEn(cx, cy) {
      var r = vista.getBoundingClientRect(); if (!r.width || !r.height) return null;
      var w = W / z.s, h = Hh / z.s, sx = z.x + (cx - r.left) / r.width * w, sy = z.y + (cy - r.top) / r.height * h, tol = 22 * w / r.width, mejor = null, dm = Infinity;
      Array.prototype.forEach.call(svg.querySelectorAll("circle.ge-punto"), function (c) { var d = Math.hypot(C.num(c.getAttribute("cx")) - sx, C.num(c.getAttribute("cy")) - sy); if (d < dm) { dm = d; mejor = c; } });
      return dm <= tol ? mejor : null;
    }
    function colocarEtq() {
      if (!sel) return; var r = vista.getBoundingClientRect(), w = W / z.s, h = Hh / z.s, rw = r.width || W, rh = r.height || Hh;
      var px = (C.num(sel.getAttribute("cx")) - z.x) / w * rw, py = (C.num(sel.getAttribute("cy")) - z.y) / h * rh;
      etq.style.left = Math.round(px) + "px"; etq.style.top = Math.round(py) + "px";
      etq.classList.toggle("izq", px > rw * 0.62); etq.classList.toggle("abajo", py < rh * 0.3); etq.classList.toggle("fuera", px < 0 || py < 0 || px > rw || py > rh);
    }
    function mostrarPunto(c) {
      if (sel) sel.classList.remove("sel"); sel = c; c.classList.add("sel");
      var v = C.num(c.getAttribute("data-v")), t = C.num(c.getAttribute("data-t")), p = c.getAttribute("data-p") || "", dec = DEC === null ? 1 : DEC;
      var reloj = T0 !== null && t !== null ? H.fechaHora(new Date(T0 + t * 3600000)) : "";
      etq.innerHTML = '<b>' + esc(H.n(v, dec)) + (UNI ? " " + esc(UNI) : "") + "</b><span>" + (p ? "Punto " + esc(p) + " · " : "") + esc(H.n(t, 1)) + " h de perfusión</span>" + (reloj ? "<span>" + esc(reloj) + "</span>" : "") + (EXP ? "<span>" + esc(EXP) + "</span>" : "");
      etq.hidden = false; colocarEtq();
    }
    function ocultarPunto() { if (sel) sel.classList.remove("sel"); sel = null; etq.hidden = true; }
    H._zoomAmpliado_punto = { mostrar: mostrarPunto, ocultar: ocultarPunto, buscar: puntoEn };
    vista.addEventListener("pointerdown", function (e) { toque = { x: e.clientX, y: e.clientY, t: Date.now(), n: Object.keys(ptr).length }; }, true);
    vista.addEventListener("pointerup", function (e) {
      var tq = toque; toque = null; if (!tq || tq.n > 0 || movido || Object.keys(ptr).some(function (k) { return String(k) !== String(e.pointerId); })) return;
      if (Math.abs(e.clientX - tq.x) + Math.abs(e.clientY - tq.y) > 8 || Date.now() - tq.t > 800) return;
      var c = e.target && e.target.closest ? e.target.closest("circle.ge-punto") : null; c = c || puntoEn(e.clientX, e.clientY);
      if (c) mostrarPunto(c); else ocultarPunto();
    });
    vista.addEventListener("click", function (e) { var c = e.target && e.target.closest ? e.target.closest("circle.ge-punto") : null; if (c && c !== sel) mostrarPunto(c); });   // ratón/teclado sin eventos de puntero
    function zoomEn(f, fx, fy) { var w = W / z.s, h = Hh / z.s, px = z.x + (fx === undefined ? 0.5 : fx) * w, py = z.y + (fy === undefined ? 0.5 : fy) * h; z.s = Math.max(1, Math.min(8, z.s * f)); var w2 = W / z.s, h2 = Hh / z.s; z.x = px - (fx === undefined ? 0.5 : fx) * w2; z.y = py - (fy === undefined ? 0.5 : fy) * h2; aplicar(); }
    function mover(dxPx, dyPx) { var r = vista.getBoundingClientRect(), w = W / z.s, h = Hh / z.s; z.x -= dxPx * w / (r.width || W); z.y -= dyPx * h / (r.height || Hh); aplicar(); }
    function frac(cx, cy) { var r = vista.getBoundingClientRect(); return [r.width ? (cx - r.left) / r.width : 0.5, r.height ? (cy - r.top) / r.height : 0.5]; }
    H._zoomAmpliado = { estado: z, zoom: zoomEn, mover: mover, aplicar: aplicar };
    barra.addEventListener("click", function (e) { var b = e.target.closest("[data-z]"); if (!b) return; e.stopPropagation(); var a = b.getAttribute("data-z"); if (a === "mas") zoomEn(1.5); else if (a === "menos") zoomEn(1 / 1.5); else { z.s = 1; z.x = 0; z.y = 0; aplicar(); } });
    vista.addEventListener("wheel", function (e) { e.preventDefault(); var f = frac(e.clientX, e.clientY); zoomEn(e.deltaY < 0 ? 1.25 : 1 / 1.25, f[0], f[1]); }, { passive: false });
    vista.addEventListener("dblclick", function (e) { e.preventDefault(); if (z.s > 1.001) { z.s = 1; aplicar(); } else { var f = frac(e.clientX, e.clientY); zoomEn(2, f[0], f[1]); } });
    var ptr = {}, ini = null;
    function lista() { return Object.keys(ptr).map(function (k) { return ptr[k]; }); }
    function arrancar() { var l = lista(); if (l.length >= 2) { var a = l[0], b = l[1]; ini = { tipo: "pinza", d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: z.s, c: frac((a.x + b.x) / 2, (a.y + b.y) / 2) }; } else if (l.length === 1) ini = { tipo: "arrastre", x: l[0].x, y: l[0].y, x0: l[0].x, y0: l[0].y }; else ini = null; }
    vista.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse" && e.button !== 0) return; ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; try { vista.setPointerCapture(e.pointerId); } catch (x) { } arrancar(); vista.classList.add("arrastrando"); });
    vista.addEventListener("pointermove", function (e) {
      if (!ptr[e.pointerId] || !ini) return; ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; var l = lista();
      if (ini.tipo === "pinza" && l.length >= 2) { var d = Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y), objetivo = ini.s * d / ini.d; zoomEn(objetivo / z.s, ini.c[0], ini.c[1]); movido = true; }
      else if (ini.tipo === "arrastre") { var dx = e.clientX - ini.x, dy = e.clientY - ini.y; if (Math.abs(e.clientX - ini.x0) + Math.abs(e.clientY - ini.y0) > 4) movido = true; ini.x = e.clientX; ini.y = e.clientY; if (z.s > 1.001) mover(dx, dy); }
    });
    function soltar(e) { delete ptr[e.pointerId]; arrancar(); if (!lista().length) vista.classList.remove("arrastrando"); }
    vista.addEventListener("pointerup", soltar); vista.addEventListener("pointercancel", soltar);
    o.addEventListener("keydown", function (e) {
      var k = e.key; if (k === "+" || k === "=") zoomEn(1.5); else if (k === "-" || k === "_") zoomEn(1 / 1.5); else if (k === "0") { z.s = 1; aplicar(); }
      else if (/^Arrow/.test(k) && z.s > 1.001) { var r = vista.getBoundingClientRect(), p = (r.width || 300) * 0.1; mover(k === "ArrowLeft" ? p : k === "ArrowRight" ? -p : 0, k === "ArrowUp" ? p : k === "ArrowDown" ? -p : 0); } else return;
      e.preventDefault();
    });
    aplicar(); try { vista.focus({ preventScroll: true }); } catch (x) { }
  }

  // ============================================================== Configuración: envoltorio de la vista
  var cfgPrev = H.vistas.config;
  H.vistas.config = function (p, q) {
    var s = (p && p[0]) || "usuarios", h = cfgPrev.apply(this, arguments);
    if (!H.esAdmin()) return h;
    // «Accesos» pasa a ser una pestaña dentro de «Usuarios» (y sin el contador junto al título)
    h = h.replace(/<a href="#\/config\/accesos"[^>]*>[\s\S]*?<\/a>/, "");
    if (s === "accesos") h = h.replace('<a href="#/config/usuarios" class="">', '<a href="#/config/usuarios" class="activo">');
    // el editor genérico de «Dieta» no muestra la lista de responsables (se edita en «QR de dieta»)
    if (s === "dieta") h = h.replace(/<div class="campo"><label class="et" for="cfg_responsables_qr">[\s\S]*?data-k="responsables_qr"[\s\S]*?<div class="ayuda">[^<]*<\/div><\/div>/, "");
    return h;
  };
  H.seccionesExtra = H.seccionesExtra || {};
  function subUsuarios(act) {
    return '<nav class="subpestanas" aria-label="Usuarios"><a href="#/config/usuarios" class="' + (act === "usuarios" ? "activo" : "") + '"' + (act === "usuarios" ? ' aria-current="page"' : "") + ">" + ico("users", "s") + 'Usuarios y notificaciones</a><a href="#/config/accesos" class="' + (act === "accesos" ? "activo" : "") + '"' + (act === "accesos" ? ' aria-current="page"' : "") + ">" + ico("user-plus", "s") + "Accesos</a></nav>";
  }
  var accPrev = H.seccionesExtra.accesos;
  if (accPrev) H.seccionesExtra.accesos = function () { return subUsuarios("accesos") + accPrev.apply(this, arguments); };

  // ---- Usuarios: rol, activo y notificaciones (Anexo v0.7 A)
  function siNo(v) { if (v === true || v === false) return v; var t = String(v === null || v === undefined ? "" : v).trim().toLowerCase(); if (!t) return null; return /^(true|s[ií]|1|verdadero|x)$/.test(t); }
  var NOTIF = [["Notif_diaria", "diaria", "Resumen diario (24 h)", "Una notificación al día con todos los datos disponibles de las últimas 24 h (a las 14:00). Para quien solo quiere revisar el progreso una vez al día. Cualquier rol."],
    ["Notif_revision", "revision", "Datos nuevos para revisar", "Cuando hay registros pendientes de validar. Solo administradores: elige qué administradores la reciben."],
    ["Notif_perfusion", "perfusion", "Avisos de la perfusión en curso", "Accionables durante una perfusión: sacar muestra, foto diaria, cambios del ciclo circadiano, recalentamiento, HDF y alertas críticas. Administradores e investigadores."]];
  H.NOTIF = NOTIF;
  H.notifDefecto = function (rol, k) { rol = H.normRol(rol); if (k === "Notif_perfusion") return rol === "ADMIN" || rol === "INVESTIGADOR"; if (k === "Notif_revision") return rol === "ADMIN"; return false; };
  H.notifAplica = function (rol, k) { rol = H.normRol(rol); if (k === "Notif_revision") return rol === "ADMIN"; if (k === "Notif_perfusion" || k === "Gestor_inventario") return rol === "ADMIN" || rol === "INVESTIGADOR"; return true; };
  H.notifEfectiva = function (u, k) { var v = siNo(u ? u[k] : null); return v === null ? H.notifDefecto(u && u.Rol, k) : v; };
  var CAT_RESP = "Responsable de la perfusión";
  H.CAT_RESPONSABLE = CAT_RESP;
  function esResp(x) { return String(x.Categoria || "").toLowerCase() === CAT_RESP.toLowerCase(); }
  function responsables() {
    if (!H.participantes) return [];
    return H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.Estado !== "Finalizado" && !(H.esHistorico && H.esHistorico(e)); }).map(function (e) { return { e: e, l: H.participantes(e).filter(esResp) }; });
  }
  H.responsablesPerfusion = responsables;
  function activo(u) { return !(u.Activo === false || u.Activo === "FALSE" || u.Activo === "false"); }
  H.seccionesExtra.usuarios = function () {
    var l = H.filas("Usuarios").slice().sort(function (a, b) { return (activo(a) ? 0 : 1) - (activo(b) ? 0 : 1) || String(a.Nombre || a.Email).localeCompare(String(b.Nombre || b.Email), "es"); }), yo = String((S.usuario || {}).email || "").toLowerCase();
    var gestores = l.filter(function (u) { return activo(u) && H.notifAplica(u.Rol, "Gestor_inventario") && H.notifEfectiva(u, "Gestor_inventario"); });
    var resp = responsables().filter(function (x) { return x.l.length || x.e.Estado === "Perfusión" || x.e.Estado === "Planificado"; });
    var casilla = function (u, k, et) {
      var ap = H.notifAplica(u.Rol, k), v = H.notifEfectiva(u, k);
      return '<td class="centro" data-et="' + esc(et) + '"><label class="check usr-chk"' + (ap ? "" : ' title="No se aplica a este rol"') + '><input type="checkbox" data-cambio="usrNotif" data-id="' + esc(u.ID) + '" data-k="' + k + '" aria-label="' + esc(et + " · " + (u.Nombre || u.Email)) + '"' + (v && ap ? " checked" : "") + (ap ? "" : " disabled") + "><span class=\"usr-chk-et\">" + esc(et) + "</span></label></td>";
    };
    return subUsuarios("usuarios") +
      '<section class="tarjeta"><div class="cabecera"><h2>Usuarios con acceso</h2>' + H.botonInfo("Al añadir un usuario recibe un correo con la dirección de la web. Las solicitudes de alta están en la pestaña Accesos.") + '<button class="bt pri" data-act="nuevoUsr">' + ico("plus") + "Añadir usuario</button></div><p class=\"tenue\">" + H.ROLES.map(function (r) { return "<b>" + esc(r[1]) + "</b>: " + esc(r[2].charAt(0).toLowerCase() + r[2].slice(1)); }).join(". ") + ". Solicitudes de alta: pestaña <a href=\"#/config/accesos\">Accesos</a>.</p>" +
      '<div class="tabla-env"><table class="t t-usuarios"><thead><tr><th>Usuario</th><th>Rol</th><th class="centro">Activo</th>' + NOTIF.map(function (n) { return '<th class="centro">' + esc(n[2]) + "</th>"; }).join("") + '<th class="centro">Gestor de inventario</th><th>Último acceso</th></tr></thead><tbody>' +
      l.map(function (u) {
        var em = String(u.Email || "").toLowerCase();
        return '<tr class="' + (activo(u) ? "" : "inactivo") + '"><td data-et="Usuario"><input value="' + esc(u.Nombre || "") + '" aria-label="Nombre de ' + esc(u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Nombre" autocomplete="off" placeholder="Nombre…"><input class="usr-ape" value="' + esc(u.Apellidos || "") + '" aria-label="Apellidos de ' + esc(u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Apellidos" autocomplete="off" placeholder="Apellidos…"><div class="muy-tenue usr-mail">' + esc(u.Email) + (em === yo ? ' · <b>tú</b>' : "") + "</div></td>" +
          '<td data-et="Rol"><select aria-label="Rol de ' + esc(u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Rol">' + H.ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === H.normRol(u.Rol) ? " selected" : "") + ">" + esc(r[1]) + "</option>"; }).join("") + "</select></td>" +
          '<td class="centro" data-et="Activo"><label class="check usr-chk"><input type="checkbox" aria-label="Activo · ' + esc(u.Nombre || u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Activo"' + (activo(u) ? " checked" : "") + '><span class="usr-chk-et">Activo</span></label></td>' +
          NOTIF.map(function (n) { return casilla(u, n[0], n[2]); }).join("") + casilla(u, "Gestor_inventario", "Gestor de inventario") +
          '<td class="muy-tenue" data-et="Último acceso">' + esc(H.fechaHora(u.Ultimo_acceso) || "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      (gestores.length ? "" : '<div class="aviso aj" style="margin-top:10px">' + ico("triangle-alert") + "<div>No hay ningún gestor de inventario: mientras tanto actúan como gestores todos los administradores (respaldo).</div></div>") + "</section>" +
      '<section class="tarjeta"><div class="cabecera"><h2>Qué recibe cada casilla</h2>' + H.botonInfo("Una casilla sin tocar sigue el valor por defecto del rol: los avisos de la perfusión, activados para administradores e investigadores; los datos para revisar, para los administradores; el resumen diario, desactivado. Cada usuario puede cambiar sus notificaciones en «Mi cuenta».") + '</div><dl class="usr-ayuda">' + NOTIF.map(function (n) { return "<dt>" + esc(n[2]) + "</dt><dd>" + esc(n[3]) + "</dd>"; }).join("") +
      "<dt>" + esc(CAT_RESP) + "</dt><dd>Los participantes de cada experimento con la categoría «" + esc(CAT_RESP) + "» reciben <b>automáticamente</b> los avisos de esa perfusión, aunque no tengan marcada la casilla (puede haber varios). Si no tienen usuario en la app pero sí correo, los reciben por correo. Se asignan en el calendario, al programar o editar el experimento.</dd>" +
      "<dt>Gestor de inventario</dt><dd>Gestiona el inventario y los pedidos (solo administradores e investigadores; puede haber varios). Si no hay ninguno, lo hacen todos los administradores.</dd></dl>" +
      "</section>" +
      '<section class="tarjeta"><div class="cabecera"><h2>Responsables de la perfusión</h2></div>' + (resp.length ? '<div class="tabla-env"><table class="t"><thead><tr><th>Experimento</th><th>Estado</th><th>Responsables</th></tr></thead><tbody>' + resp.map(function (x) {
        return '<tr><td><a href="#/exp/' + encodeURIComponent(x.e.ID) + '">' + esc(x.e.ID) + "</a></td><td>" + (H.estadoChip ? H.estadoChip(x.e.Estado) : esc(x.e.Estado || "")) + '</td><td class="envolver">' + (x.l.length ? esc(x.l.map(function (r) { return r.Nombre + (r.Email ? "" : " (sin correo)"); }).join(", ")) : '<span class="muy-tenue">Sin responsable asignado</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="tenue">No hay experimentos programados.</p>') + "</section>";
  };
  // v0.7.2: si el ADMIN cambia su propio nombre o apellidos en la tabla, se actualiza la cabecera
  var usrCampoPrev = H.acc.usrCampo;
  H.acc.usrCampo = function (el) {
    var r = usrCampoPrev.apply(this, arguments), k = el.getAttribute("data-k"), u = H.fila("Usuarios", el.getAttribute("data-id")), yo = String((S.usuario || {}).email || "").toLowerCase();
    if ((k === "Nombre" || k === "Apellidos") && u && String(u.Email || "").toLowerCase() === yo && S.usuario) { S.usuario[k === "Nombre" ? "nombre" : "apellidos"] = el.value.trim(); if (H.guardarSesion) H.guardarSesion(); H.actualizarCabUsuario(); }
    return r;
  };
  H.acc.usrNotif = function (el) {
    var o = { ID: el.getAttribute("data-id") }, k = el.getAttribute("data-k"); o[k] = el.checked;
    H.guardar("Usuarios", [o], { sinRepintar: true }).catch(function () { });
    var u = H.fila("Usuarios", o.ID), yo = String((S.usuario || {}).email || "").toLowerCase();
    if (u && String(u.Email || "").toLowerCase() === yo && S.usuario) { var n = Object.assign({}, S.usuario.notif || {}); NOTIF.forEach(function (x) { if (x[0] === k) n[x[1]] = el.checked; }); S.usuario.notif = n; if (k === "Gestor_inventario") S.usuario.gestor_inventario = el.checked; if (H.guardarSesion) H.guardarSesion(); }
  };

  // ---- Mi cuenta: cada usuario cambia sus notificaciones
  function misNotif() { var u = S.usuario || {}, n = u.notif || {}, o = {}; NOTIF.forEach(function (x) { o[x[1]] = typeof n[x[1]] === "boolean" ? n[x[1]] : H.notifDefecto(u.rol, x[0]); }); return o; }
  H.misNotificaciones = misNotif;
  function cuentaNotifHTML() {
    var u = S.usuario || {}, n = misNotif(), yo = String(u.email || "").toLowerCase();
    var soy = responsables().filter(function (x) { return x.l.some(function (r) { return r.Email === yo; }); }).map(function (x) { return x.e.ID; });
    return '<section class="tarjeta notif-cuenta"><div class="cabecera"><h2>Notificaciones de la app</h2></div><p class="tenue">Elige qué avisos quieres recibir en la app (y en este y tus otros dispositivos con las notificaciones activadas).</p><div class="notif-lista">' +
      NOTIF.map(function (x) {
        var ap = H.notifAplica(u.rol, x[0]);
        return '<label class="check notif-op' + (ap ? "" : " no-aplica") + '"><input type="checkbox" data-cambio="miNotif" data-k="' + x[1] + '"' + (n[x[1]] && ap ? " checked" : "") + (ap ? "" : " disabled") + '><span><b>' + esc(x[2]) + "</b><span class=\"tenue\">" + esc(x[3]) + (ap ? "" : " No se aplica a tu rol.") + "</span></span></label>";
      }).join("") + "</div>" +
      (soy.length ? '<div class="aviso info">' + ico("user-check") + "<div>Eres <b>" + esc(CAT_RESP.toLowerCase()) + "</b> en " + esc(soy.join(", ")) + ": recibirás sus avisos aunque desactives «Avisos de la perfusión en curso».</div></div>" : "") +
      '<p class="muy-tenue" style="margin-top:8px">Gestor de inventario: <b>' + (u.gestor_inventario ? "sí" + (u.gestor_respaldo ? " (como administrador, porque no hay ningún gestor asignado)" : "") : "no") + "</b>. Lo asigna un administrador en Configuración → Usuarios.</p></section>";
  }
  // v0.7.2: «Datos personales»: nombre y apellidos (la cabecera muestra «Nombre Apellidos»)
  function cuentaDatosHTML() {
    var u = S.usuario || {};
    return '<section class="tarjeta" id="misDatos"><div class="cabecera"><h2>Datos personales</h2>' + H.botonInfo("Tu nombre y tus apellidos. Arriba a la derecha y en la actividad del equipo aparece «Nombre Apellidos». El correo no se puede cambiar aquí: lo cambia un administrador en Configuración → Usuarios.") + "</div>" +
      '<form id="fDatos" class="rejilla dos" novalidate><div class="campo"><label class="et" for="miNombre">Nombre</label><input id="miNombre" name="given-name" autocomplete="given-name" maxlength="60" value="' + esc(u.nombre || "") + '" placeholder="Nombre…"></div>' +
      '<div class="campo"><label class="et" for="miApellidos">Apellidos</label><input id="miApellidos" name="family-name" autocomplete="family-name" maxlength="80" value="' + esc(u.apellidos || "") + '" placeholder="Apellidos…"></div></form>' +
      '<div class="fila-flex"><button class="bt pri" data-act="miDatos">' + ico("save") + "Guardar</button><span class=\"muy-tenue\" id=\"misDatosPrev\">Se verá como: <b>" + esc(H.nombreVisible(u)) + "</b></span></div></section>";
  }
  var cuentaPrev = H.vistas.cuenta;
  H.vistas.cuenta = function (p, q) {
    var h = cuentaPrev.apply(this, arguments), marca = '<section class="tarjeta"><div class="cabecera"><h2>Avisos en este dispositivo', i = h.indexOf(marca), extra = cuentaNotifHTML();
    h = i === -1 ? h.replace(/<\/div>\s*$/, extra + "</div>") : h.slice(0, i) + extra + h.slice(i);
    var jp = h.indexOf('<section class="tarjeta perfil"'), j = jp === -1 ? -1 : h.indexOf("<section", jp + 10);   // justo después de la foto
    if (j === -1) j = h.indexOf('<section class="tarjeta" id="accesoRapido"'); if (j === -1) j = h.indexOf('<section class="tarjeta notif-cuenta"');
    return j === -1 ? h.replace(/<\/div>\s*$/, cuentaDatosHTML() + "</div>") : h.slice(0, j) + cuentaDatosHTML() + h.slice(j);
  };
  // cabecera sin repintar todo el marco (no se pierde el foco de la tabla de usuarios)
  H.actualizarCabUsuario = function () {
    var u = S.usuario || {}, b = H.$(".usuario-cab"), n = H.nombreVisible(u); if (!b) return;
    var t = b.querySelector(".usr-txt b"); if (t) t.textContent = n; b.setAttribute("aria-label", "Mi cuenta: " + n + " (" + H.nombreRol(u.rol) + ")");
    var av = b.querySelector(".avatar"); if (av && H.avatarHTML) { var d = document.createElement("div"); d.innerHTML = H.avatarHTML(u, "av-cab"); if (d.firstChild) av.parentNode.replaceChild(d.firstChild, av); }
  };
  H.acc.miDatos = function (el) {
    var iN = H.$("#miNombre"), iA = H.$("#miApellidos"); if (!iN || !iA) return;
    var o = { nombre: iN.value.trim(), apellidos: iA.value.trim() };
    if (!o.nombre) { H.toast("Escribe tu nombre.", "error"); iN.focus(); return; }
    if (el) el.disabled = true;
    H.api("webPerfilDatos", o).then(function (r) {
      var nu = (r && r.usuario) || { nombre: o.nombre, apellidos: o.apellidos }; S.usuario = Object.assign({}, S.usuario, nu);
      if (H.guardarSesion) H.guardarSesion();
      if (H.upsertLocal && S.usuario.id) {
        if (H.fila("Usuarios", S.usuario.id)) H.upsertLocal("Usuarios", [{ ID: S.usuario.id, Nombre: S.usuario.nombre, Apellidos: S.usuario.apellidos || "" }]);
        if (H.fila("Equipo", S.usuario.id)) H.upsertLocal("Equipo", [{ ID: S.usuario.id, Nombre: H.nombreVisible(S.usuario) }]);
        if (H.guardarCache) H.guardarCache();
      }
      H.actualizarCabUsuario(); H.toast("Datos guardados."); H.repintar();
    }).catch(function (e) { if (el) el.disabled = false; H.toast(e.message || "No se han podido guardar los datos. Comprueba la conexión.", "error"); });
  };
  document.addEventListener("submit", function (e) { if (e.target && e.target.id === "fDatos") { e.preventDefault(); H.acc.miDatos(H.$("[data-act=miDatos]")); } });
  document.addEventListener("input", function (e) { if (!e.target || (e.target.id !== "miNombre" && e.target.id !== "miApellidos")) return; var p = H.$("#misDatosPrev b"); if (p) p.textContent = H.nombreVisible({ nombre: (H.$("#miNombre") || {}).value, apellidos: (H.$("#miApellidos") || {}).value, email: (S.usuario || {}).email }); });
  H.acc.miNotif = function (el) {
    var k = el.getAttribute("data-k"), o = {}; o[k] = el.checked; el.disabled = true;
    H.api("webPerfilNotificaciones", o).then(function (r) {
      var nu = (r && r.usuario) || null; S.usuario = Object.assign({}, S.usuario, nu || {}); if (!nu) { var n = Object.assign({}, misNotif()); n[k] = o[k]; S.usuario.notif = n; }
      var yo = String(S.usuario.email || "").toLowerCase(), fila = H.filas("Usuarios").filter(function (u) { return String(u.Email || "").toLowerCase() === yo; })[0], nn = S.usuario.notif || {};
      if (fila && H.upsertLocal) { var c = { ID: fila.ID }; NOTIF.forEach(function (x) { if (typeof nn[x[1]] === "boolean") c[x[0]] = nn[x[1]]; }); H.upsertLocal("Usuarios", [c]); if (H.guardarCache) H.guardarCache(); }
      if (H.guardarSesion) H.guardarSesion(); el.disabled = false; H.toast("Notificaciones actualizadas."); H.repintarPronto();
    }).catch(function (e) { el.disabled = false; el.checked = !o[k]; H.toast(e.message || "No se han podido guardar las notificaciones. Comprueba la conexión.", "error"); });
  };

  // ---- Pantalla de inicio: la elige el administrador y es igual para todos
  var iniPrev = H.seccionesExtra.inicio;
  H.seccionesExtra.inicio = function () {
    var c = cfgIni(), v = c.vista || "24h";
    return '<section class="tarjeta"><div class="cabecera"><h2>Pantalla de inicio de todos los usuarios</h2>' + H.botonInfo("Lo que elijas aquí es lo que ven todos los usuarios en Inicio (no hay preferencias personales). Cada persona puede cambiar la vista de la perfusión desde la cabecera solo durante la sesión: al volver a abrir la app vuelve a la que elijas aquí.") + "</div>" +
      '<div class="rejilla tres"><div class="campo"><label class="et" for="iniVista">Vista de la perfusión en curso</label><select id="iniVista" data-cambio="iniVista">' + [["24h", "Últimas 24 horas"], ["todo", "Toda la perfusión"], ["comparar", "Comparar con otras perfusiones"]].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === v ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></div>" +
      '<label class="check ini-op"><input type="checkbox" data-cambio="iniOpcion" data-k="muestreo"' + (c.muestreo !== false ? " checked" : "") + "> Mostrar el esquema de muestreo</label>" +
      '<label class="check ini-op"><input type="checkbox" data-cambio="iniOpcion" data-k="hdf_rec"' + (c.hdf_rec !== false ? " checked" : "") + "> Mostrar la recomendación de la HDF</label></div></section>" + (iniPrev ? iniPrev.apply(this, arguments) : "");
  };
  H.acc.iniVista = function (el) { var c = H.copia(cfgIni()); c.vista = el.value; H.guardarCfg("inicio", c); ses("vistaIni", null); };
  H.acc.iniOpcion = function (el) { var c = H.copia(cfgIni()); c[el.getAttribute("data-k")] = el.checked; H.guardarCfg("inicio", c); };

  // ---- QR de dieta: responsables que suministran la comida
  H.responsablesComida = function (cfgD) { var l = (cfgD || (S.cfg && S.cfg.dieta) || C.DEF.dieta || {}).responsables_qr; return Array.isArray(l) ? l.filter(function (x) { return String(x || "").trim(); }) : RESP_COMIDA.slice(); };
  var qrPrev = H.seccionesExtra.qr;
  H.seccionesExtra.qr = function () {
    var l = H.responsablesComida();
    return (qrPrev ? qrPrev.apply(this, arguments) : "") + '<section class="tarjeta qr-resp"><div class="cabecera"><h2>Responsables de la alimentación</h2><span class="chip">' + l.length + "</span></div>" +
      '<p class="tenue">Personas que suministran la comida. En la pantalla del QR eligen su nombre de esta lista (o escriben otro si no aparecen).</p>' +
      (l.length ? '<ul class="lista-resp">' + l.map(function (n, i) { return "<li><span>" + esc(n) + '</span><button class="bt ico-solo texto" data-act="qrRespQuitar" data-i="' + i + '" aria-label="Quitar a ' + esc(n) + '">' + ico("x", "s") + "</button></li>"; }).join("") + "</ul>" : '<p class="muy-tenue">La lista está vacía: en el QR habrá que escribir el nombre.</p>') +
      '<div class="fila-flex qr-resp-nuevo"><div class="campo"><label class="et" for="qrRespNuevo">Añadir responsable</label><input id="qrRespNuevo" autocomplete="off" placeholder="Nombre y apellidos…" data-entrada="qrRespEscribe"></div><button class="bt pri" data-act="qrRespAnadir">' + ico("plus") + "Añadir</button></div></section>";
  };
  function guardarResp(l) { var d = H.copia((S.cfg && S.cfg.dieta) || C.DEF.dieta); d.responsables_qr = l; H.guardarCfg("dieta", d); H.repintar(); }
  H.acc.qrRespAnadir = function () {
    var i = H.$("#qrRespNuevo"), n = i ? i.value.replace(/\s+/g, " ").trim() : "", l = H.responsablesComida().slice();
    if (n.length < 3) { H.toast("Escribe el nombre y los apellidos.", "error"); if (i) i.focus(); return; }
    if (l.some(function (x) { return x.toLowerCase() === n.toLowerCase(); })) { H.toast("Ese nombre ya está en la lista.", "error"); return; }
    l.push(n); guardarResp(l);
  };
  H.acc.qrRespQuitar = function (el) { var l = H.responsablesComida().slice(), i = Number(el.getAttribute("data-i")), n = l[i]; if (n === undefined) return; l.splice(i, 1); guardarResp(l); H.toast("«" + n + "» quitado de la lista."); };
  H.acc.qrRespEscribe = function () { };
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "qrRespNuevo") { e.preventDefault(); H.acc.qrRespAnadir(); } });
  // selector de nombre en la pantalla del QR (lo usa app_v05c.js); #qrNombre sigue siendo el campo que se guarda
  H.qrNombreHTML = function (cfgD) {
    var l = H.responsablesComida(cfgD), prev = "";
    try { prev = localStorage.getItem("home_qr_nombre") || ""; } catch (e) { }
    var enLista = l.indexOf(prev) !== -1, otro = !!prev && !enLista;
    if (!l.length) return '<div class="campo"><label class="et" for="qrNombre">Tu nombre</label><input id="qrNombre" autocomplete="name" value="' + esc(prev) + '" placeholder="Nombre y apellido…"></div>';
    return '<div class="campo"><label class="et" for="qrNombreSel">Quién da la comida</label><select id="qrNombreSel" data-cambio="qrNombreSel"><option value="">Elige tu nombre…</option>' + l.map(function (n) { return "<option" + (n === prev ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + '<option value="__otro"' + (otro ? " selected" : "") + ">Otra persona…</option></select></div>" +
      '<div class="campo qr-otro"' + (otro ? "" : " hidden") + '><label class="et" for="qrNombre">Tu nombre</label><input id="qrNombre" autocomplete="name" value="' + esc(prev) + '" placeholder="Nombre y apellido…"></div>';
  };
  H.acc.qrNombreSel = function (el) {
    var i = H.$("#qrNombre"), caja = H.$(".qr-otro"); if (!i) return;
    if (el.value === "__otro") { i.value = ""; if (caja) caja.hidden = false; i.focus(); } else { i.value = el.value; if (caja) caja.hidden = true; }
  };
  // en el registro de dieta de la web, la misma lista como sugerencias del campo «Responsable»
  function datalistComida() {
    var r = H.$("#dResp"); if (!r || r.getAttribute("list")) return;
    var dl = H.$("#dlRespComida"); if (!dl) { dl = document.createElement("datalist"); dl.id = "dlRespComida"; document.body.appendChild(dl); }
    dl.innerHTML = H.responsablesComida().map(function (n) { return '<option value="' + esc(n) + '">'; }).join(""); r.setAttribute("list", "dlRespComida");
  }

  // ---- Objetivos: rejilla alineada por variable y compartimento
  var COMP_GAS = [["ART", "Rama arterial"], ["POR", "Rama portal"], ["CAV", "Cava (salida)"]];
  function vNum(x) { return x === null || x === undefined || x === "" ? "" : String(x).replace(".", ","); }
  function parIn(m, v, par, nombre) {
    return '<div class="obj-par">' + [0, 1].map(function (i) { return '<input type="text" inputmode="decimal" data-num="1" aria-label="' + esc(nombre + (i ? " máximo" : " mínimo")) + '" value="' + esc(vNum(par[i])) + '" data-cambio="cfgObj" data-m="' + m + '" data-v="' + esc(v) + '" data-i="' + i + '">'; }).join('<span class="obj-guion">–</span>') + "</div>";
  }
  function defTxt(d) { var m = function (x) { return vNum(x).replace(/^-/, "−"); }; return d ? m(d[0]) + "–" + m(d[1]) : "—"; }
  // ---- v0.7.2: referencia porcina del grupo (estandarización GITIC) y laboratorio del hospital (humanos, informativo)
  function REFP() { return S.cfg.referencia_porcina || C.DEF.referencia_porcina; }
  function refDe(v) { return (REFP().vars || {})[v] || null; }
  function dec(vd) { return vd && vd.dec !== undefined ? vd.dec : 1; }
  function nTxt(x, d) { return x === null || x === undefined ? "—" : H.n(x, d).replace(/^-/, "−"); }
  function refTxt(x, vd) { var d = dec(vd); return x && x.n ? nTxt(x.mediana, d) + " [" + nTxt(x.p2_5, d) + "–" + nTxt(x.p97_5, d) + "] · n " + x.n : "—"; }
  function labTxt(x, vd) { return x && x.lab ? x.lab.replace(/\s*-\s*/, "–").replace(/^-/, "−") + (x.lab_u && vd && x.lab_u !== vd.unidad ? " " + x.lab_u : "") : "—"; }
  function igual(a, b) { return a && b && C.num(a[0]) === C.num(b[0]) && C.num(a[1]) === C.num(b[1]); }
  function infoRef() {
    var R = REFP(), ns = C.PERF_PORCINA.map(function (k) { var x = refDe(k); return (C.variable("PERF", k) || { nombre: k }).nombre + " " + (x ? x.n : "—"); }).join(", ");
    return "Referencia porcina: " + R.fuente + ". Se muestra la mediana [P2,5–P97,5] y el número de animales (n) de cada variable; el rango que se aplica son esos percentiles redondeados con criterio clínico. n por variable: " + ns + ". Se actualizará al añadir más basales del grupo. " +
      "Los rangos de HCO₃⁻, BE, Na⁺, K⁺, Ca²⁺, Cl⁻, fosfato, albúmina, osmolalidad y urea del perfusato pasan a ser la referencia porcina (antes, rangos humanos a validar); lactato, glucosa, Hb, Hto, cortisol, amonio y Mg siguen el criterio de perfusión y la gasometría (pH, pO₂, pCO₂) los objetivos del circuito. " +
      "Laboratorio HULP: " + (R.lab_fuente || "intervalos humanos") + "; solo informativo. Un valor fuera de la referencia en un animal concreto es normal (desviación del animal). La estandarización no se dibuja en las gráficas.";
  }
  function celdasRef(v, vd, actual) {
    var x = refDe(v), ok = x && x.rango && x.valida !== false && C.PERF_PORCINA.indexOf(v) !== -1;
    return '<td class="centro" data-et="Referencia porcina">' + esc(refTxt(x, vd)) + '</td><td class="centro muy-tenue" data-et="Laboratorio HULP">' + esc(labTxt(x, vd)) + "</td><td class=\"centro\">" +
      (ok ? (igual(actual, x.rango) ? '<span class="chip ok">' + ico("check", "s") + "Porcina</span>" : '<button class="bt mini" data-act="objPorcina" data-v="' + esc(v) + '" aria-label="Aplicar la referencia porcina a ' + esc(vd.nombre) + '">Aplicar ' + esc(defTxt(x.rango)) + "</button>") : "") + "</td>";
  }
  function avisoPorcina(O) {
    var dif = C.PERF_PORCINA.filter(function (k) { var x = refDe(k); return x && x.rango && !igual((O.PERF || {})[k], x.rango); });
    return dif.length ? '<div class="aviso aj">' + ico("sliders-horizontal") + "<div>" + dif.length + " rango(s) del perfusato guardados no siguen la referencia porcina (" + esc(dif.map(function (k) { return (C.variable("PERF", k) || { nombre: k }).nombre; }).join(", ")) + ').<div class="fila-flex"><button class="bt mini" data-act="objPorcinaTodas">' + ico("check", "s") + "Aplicar la referencia porcina a todas</button></div></div></div>" : "";
  }
  function tablaPorcina() {
    var R = REFP(), vars = Object.keys(R.vars || {}), orden = (C.MUESTRAS.BASAL_LD.vars || []).map(function (x) { return x.id; });
    vars.sort(function (a, b) { var ia = orden.indexOf(a), ib = orden.indexOf(b); return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib); });
    var inf = "Colorea las muestras basales de los donantes (hígado y sangre) y las del receptor: verde dentro del rango, ámbar fuera. " + R.fuente + " (n por variable en la tabla). pH, pO₂ y pCO₂ basales son intraoperatorios: no valen como referencia y esas muestras se colorean con los objetivos arteriales (pO₂ 80–100 mmHg). Colesterol, ácido úrico e INR no forman parte del protocolo y no se consideran. En el perfusato la creatinina no se colorea: la HDF la depura y no hay aporte exógeno. La estandarización no se dibuja en las gráficas y se actualizará al añadir más basales.";
    return '<section class="tarjeta obj-porcina"><div class="cabecera"><h2>Referencia porcina · basales y receptor</h2>' + H.botonInfo(inf) + '</div><div class="tabla-env"><table class="t t-obj t-obj-ref"><thead><tr><th>Variable</th><th>Unidad</th><th class="num">n</th><th class="centro">Mediana [P2,5–P97,5]</th><th class="centro">Rango aplicado</th><th class="centro">&lt; 35 kg · ≥ 35 kg</th><th class="centro">Laboratorio HULP</th><th>Nota</th></tr></thead><tbody>' +
      vars.map(function (v) { var x = R.vars[v], vd = C.variable("BASAL_LD", v), d = dec(vd);
        return '<tr><th scope="row"><span class="obj-var">' + esc(vd.nombre) + '</span></th><td class="muy-tenue">' + esc(vd.unidad || "") + '</td><td class="num" data-et="n">' + (x.n || "—") + '</td><td class="centro" data-et="Mediana [P2,5–P97,5]">' + esc(x.n ? nTxt(x.mediana, d) + " [" + nTxt(x.p2_5, d) + "–" + nTxt(x.p97_5, d) + "]" : "—") + '</td><td class="centro" data-et="Rango aplicado"><b>' + esc(x.rango && x.valida !== false ? defTxt(x.rango) : "—") + '</b></td><td class="centro muy-tenue" data-et="< 35 kg · ≥ 35 kg">' + esc(x.n_lt35 ? nTxt(x.mediana_lt35, d) + " (" + x.n_lt35 + ") · " + nTxt(x.mediana_ge35, d) + " (" + x.n_ge35 + ")" : "—") +
          '</td><td class="centro muy-tenue" data-et="Laboratorio HULP">' + esc(labTxt(x, vd)) + '</td><td class="muy-tenue" data-et="Nota">' + esc(x.nota || "") + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
  }
  function aplicarPorcina(lista) { var O = H.copia(S.cfg.objetivos); O.PERF = O.PERF || {}; lista.forEach(function (k) { var x = refDe(k); if (x && x.rango) O.PERF[k] = x.rango.slice(); }); H.guardarCfg("objetivos", O); H.repintar(); }
  H.acc.objPorcina = function (el) { aplicarPorcina([el.getAttribute("data-v")]); };
  H.acc.objPorcinaTodas = function () { aplicarPorcina(C.PERF_PORCINA); };
  H.seccionesExtra.objetivos = function () {
    var O = S.cfg.objetivos, D = C.DEF.objetivos, art = (O.ART || {}).pO2 || [], ok80 = C.num(art[0]) === 80 && C.num(art[1]) === 100;
    var varsGas = []; COMP_GAS.forEach(function (c) { Object.keys(O[c[0]] || {}).forEach(function (v) { if (varsGas.indexOf(v) === -1) varsGas.push(v); }); });
    var gas = '<section class="tarjeta"><div class="cabecera"><h2>Gasometrías del circuito</h2><span class="muy-tenue">mín. – máx.</span></div><div class="tabla-env"><table class="t t-obj t-obj-gas"><thead><tr><th>Variable</th>' + COMP_GAS.map(function (c) { return '<th class="centro">' + esc(c[1]) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      varsGas.map(function (v) {
        var vd = C.variable("ART", v) || C.variable("CAV", v) || { nombre: v, unidad: "" };
        return '<tr><th scope="row"><span class="obj-var">' + esc(vd.nombre) + '</span> <span class="muy-tenue">' + esc(vd.unidad || "") + "</span></th>" + COMP_GAS.map(function (c) { var par = (O[c[0]] || {})[v]; return '<td class="centro" data-et="' + esc(c[1]) + '">' + (par ? parIn(c[0], v, par, vd.nombre + " " + c[1].toLowerCase()) : '<span class="muy-tenue">—</span>') + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div></section>";
    function tablaSimple(m, titulo) {
      var vs = Object.keys(O[m] || {}); if (!vs.length) return "";
      var perf = m === "PERF";   // v0.7.2: referencia porcina del grupo y laboratorio del hospital por variable
      return '<section class="tarjeta' + (perf ? " obj-ancho" : "") + '"><div class="cabecera"><h2>' + esc(titulo) + "</h2>" + (perf ? H.botonInfo(infoRef()) : "") + '</div><div class="tabla-env"><table class="t t-obj' + (perf ? " t-obj-perf" : "") + '"><thead><tr><th>Variable</th><th>Unidad</th><th class="centro">Mín. – máx.</th><th class="centro">Por defecto</th>' + (perf ? '<th class="centro">Referencia porcina</th><th class="centro">Laboratorio HULP</th><th></th>' : "") + "</tr></thead><tbody>" +
        vs.map(function (v) { var vd = C.variable(m, v) || { nombre: v, unidad: "" }; return '<tr><th scope="row"><span class="obj-var">' + esc(vd.nombre) + '</span></th><td class="muy-tenue">' + esc(vd.unidad || "") + '</td><td class="centro">' + parIn(m, v, O[m][v], vd.nombre) + '</td><td class="centro muy-tenue" data-et="Por defecto">' + esc(defTxt((D[m] || {})[v])) + "</td>" + (perf ? celdasRef(v, vd, O[m][v]) : "") + "</tr>"; }).join("") + "</tbody></table></div></section>";
    }
    var otros = Object.keys(O).filter(function (m) { return ["ART", "POR", "CAV", "PERF", "FLUJO"].indexOf(m) === -1; }).map(function (m) { return tablaSimple(m, C.MUESTRAS[m] ? C.MUESTRAS[m].nombre : m); }).join("");
    return '<div class="aviso info">' + ico("info") + "<div>Rangos que colorean los valores en las hojas, alimentan las alertas de Inicio y el asesor de gases. Gasometrías y presiones en mmHg (1 kPa = 7,50 mmHg). La pO₂ arterial usa los valores arteriales habituales (80–100 mmHg), no la del protocolo del grupo.</div></div>" +
      avisoPorcina(O) +
      (ok80 ? "" : '<div class="aviso aj">' + ico("triangle-alert") + "<div>La pO₂ arterial guardada es " + esc(defTxt(art)) + ' mmHg. <button class="bt mini" data-act="cfgPO2" data-a="80" data-b="100">Aplicar 80–100 mmHg</button></div></div>') +
      '<div class="fila-flex" style="margin-bottom:10px"><button class="bt" data-act="cfgRestaurar" data-k="objetivos">' + ico("undo-2") + "Valores por defecto</button></div>" +
      '<div class="obj-rejilla">' + gas + tablaSimple("FLUJO", "Presiones y temperatura") + tablaSimple("PERF", "Perfusato (bioquímica)") + otros + "</div>" + tablaPorcina();
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v07a.js"] = "0.7.2";
