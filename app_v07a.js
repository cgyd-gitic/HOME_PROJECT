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
      '<ul class="im-tubos">' + listaTubos(p.tubos, m) + "</ul>" + '<div class="im-total">Volumen de sangre: <b>' + nf(p.mL) + " mL</b>" + (nota(p) ? ' <span class="muy-tenue">· ' + esc(nota(p)) + "</span>" : "") + (p.bilis ? '<div class="muy-tenue">También bilis (no cuenta para el volumen de sangre).</div>' : "") + "</div></div>"
      : '<div class="im-prox"><div class="et">Próxima extracción</div><div class="im-hora"><b>Protocolo de muestreo completado</b></div></div>';
    var kp = function (et, v, sub) { return '<div class="kpi"><div class="et">' + esc(et) + '</div><div class="v">' + H.n(v, 1) + '<small>mL</small></div><div class="tend">' + sub + "</div></div>"; };
    var kpis = '<div class="kpis im-kpis">' + kp("Extraído hasta ahora", P.extraido, P.hechos.length + " de " + P.pts.length + " puntos + pre-perfusión") + kp("Últimas 24 h", P.ult24, "según el plan de muestreo") + kp("Próximas 24 h", P.sig24, P.futuros.filter(function (x) { return x.fecha.getTime() <= Date.now() + 864e5; }).length + " extracciones") + kp("Total del protocolo", P.total, "pre-perfusión " + nf(P.pre) + " mL") + "</div>";
    var filas = P.futuros.slice(0, 8).map(function (x) { return "<tr><td><b>" + esc(x.etiqueta) + "</b></td><td>" + esc(H.diaCorto(x.fecha) + " " + H.hora(x.fecha)) + '</td><td class="envolver">' + esc(cortoTubos(x.tubos)) + (x.tipo === "extra" ? ' <span class="chip">metabolismo</span>' : "") + '</td><td class="num">' + nf(x.mL) + "</td></tr>"; }).join("");
    var c = m.completa || {}, txt = "Pre-perfusión: " + cortoTubos(m.pre) + " (" + nf(P.pre) + " mL). Primeras 24 h, a los " + horasTxt(m.dia1_h || []) + ": " + cortoTubos(c) + " (" + nf(mlTubos(c, m)) + " mL; a las 24 h, + amarillo). " +
      "Después, cada 12 h a las " + (m.diarias || []).join(" y ") + " (manda la hora del día), con el amarillo a las " + esc(m.amarillo_hora || "") + (m.extra_horas && m.extra_horas.length ? "; a las " + m.extra_horas.join(" y ") + ": " + cortoTubos(m.extra) + " (" + nf(mlTubos(m.extra, m)) + " mL) para los cálculos de metabolismo" : "") + ". Las muestras de bilis dependen de la bilis producida y no cuentan para el volumen.";
    return '<h3 class="sub">Muestreo de la perfusión</h3><div class="ini-muestreo">' + proxHTML + kpis + "</div>" +
      '<details class="plegable im-plan"><summary>Próximas extracciones y esquema completo</summary><div class="dentro">' + (filas ? '<div class="tabla-env"><table class="t"><thead><tr><th>Punto</th><th>Hora</th><th>Tubos</th><th class="num">mL</th></tr></thead><tbody>' + filas + "</tbody></table></div>" : "") +
      '<p class="muy-tenue" style="margin:8px 0 0">' + esc(txt) + "</p></div></details>";
  };
  function recHDFInicio(e) {
    var h = H.recomendacionHDFInicio ? H.recomendacionHDFInicio(e) : H.consejoHDFHTML ? H.consejoHDFHTML(e) : "";
    if (!h) return "";
    h = String(h).replace(/^<section class="tarjeta[^"]*">/, '<div class="ini-hdf-rec">').replace(/<\/section>\s*$/, "</div>");
    return h.indexOf("ini-hdf-rec") === -1 ? '<div class="ini-hdf-rec">' + h + "</div>" : h;
  }
  var tarjPrev = H.tarjetaPerfusion;
  H.tarjetaPerfusion = function (e) {
    var h = tarjPrev.apply(this, arguments), ci = cfgIni(), mu = "", rec = "";
    try { if (ci.muestreo !== false) mu = H.muestreoInicioHTML(e); } catch (x) { console.error(x); }
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
    }
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
      '<section class="tarjeta"><div class="cabecera"><h2>Usuarios con acceso</h2><button class="bt pri" data-act="nuevoUsr">' + ico("plus") + "Añadir usuario</button></div><p class=\"tenue\">" + H.ROLES.map(function (r) { return "<b>" + esc(r[1]) + "</b>: " + esc(r[2].charAt(0).toLowerCase() + r[2].slice(1)); }).join(". ") + ". Al añadir un usuario recibe un correo con la dirección de la web. Las solicitudes de alta están en la pestaña <a href=\"#/config/accesos\">Accesos</a>.</p>" +
      '<div class="tabla-env"><table class="t t-usuarios"><thead><tr><th>Usuario</th><th>Rol</th><th class="centro">Activo</th>' + NOTIF.map(function (n) { return '<th class="centro">' + esc(n[2]) + "</th>"; }).join("") + '<th class="centro">Gestor de inventario</th><th>Último acceso</th></tr></thead><tbody>' +
      l.map(function (u) {
        var em = String(u.Email || "").toLowerCase();
        return '<tr class="' + (activo(u) ? "" : "inactivo") + '"><td data-et="Usuario"><input value="' + esc(u.Nombre || "") + '" aria-label="Nombre de ' + esc(u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Nombre" autocomplete="off" placeholder="Nombre…"><div class="muy-tenue usr-mail">' + esc(u.Email) + (em === yo ? ' · <b>tú</b>' : "") + "</div></td>" +
          '<td data-et="Rol"><select aria-label="Rol de ' + esc(u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Rol">' + H.ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === H.normRol(u.Rol) ? " selected" : "") + ">" + esc(r[1]) + "</option>"; }).join("") + "</select></td>" +
          '<td class="centro" data-et="Activo"><label class="check usr-chk"><input type="checkbox" aria-label="Activo · ' + esc(u.Nombre || u.Email) + '" data-cambio="usrCampo" data-id="' + esc(u.ID) + '" data-k="Activo"' + (activo(u) ? " checked" : "") + '><span class="usr-chk-et">Activo</span></label></td>' +
          NOTIF.map(function (n) { return casilla(u, n[0], n[2]); }).join("") + casilla(u, "Gestor_inventario", "Gestor de inventario") +
          '<td class="muy-tenue" data-et="Último acceso">' + esc(H.fechaHora(u.Ultimo_acceso) || "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      (gestores.length ? "" : '<div class="aviso aj" style="margin-top:10px">' + ico("triangle-alert") + "<div>No hay ningún gestor de inventario: mientras tanto actúan como gestores todos los administradores (respaldo).</div></div>") + "</section>" +
      '<section class="tarjeta"><div class="cabecera"><h2>Qué recibe cada casilla</h2></div><dl class="usr-ayuda">' + NOTIF.map(function (n) { return "<dt>" + esc(n[2]) + "</dt><dd>" + esc(n[3]) + "</dd>"; }).join("") +
      "<dt>" + esc(CAT_RESP) + "</dt><dd>Los participantes de cada experimento con la categoría «" + esc(CAT_RESP) + "» reciben <b>automáticamente</b> los avisos de esa perfusión, aunque no tengan marcada la casilla (puede haber varios). Si no tienen usuario en la app pero sí correo, los reciben por correo. Se asignan en el calendario, al programar o editar el experimento.</dd>" +
      "<dt>Gestor de inventario</dt><dd>Gestiona el inventario y los pedidos (solo administradores e investigadores; puede haber varios). Si no hay ninguno, lo hacen todos los administradores.</dd></dl>" +
      '<p class="muy-tenue">Una casilla sin tocar sigue el valor por defecto del rol: los avisos de la perfusión, activados para administradores e investigadores; los datos para revisar, para los administradores; el resumen diario, desactivado. Cada usuario puede cambiar sus notificaciones en «Mi cuenta».</p></section>' +
      '<section class="tarjeta"><div class="cabecera"><h2>Responsables de la perfusión</h2></div>' + (resp.length ? '<div class="tabla-env"><table class="t"><thead><tr><th>Experimento</th><th>Estado</th><th>Responsables</th></tr></thead><tbody>' + resp.map(function (x) {
        return '<tr><td><a href="#/exp/' + encodeURIComponent(x.e.ID) + '">' + esc(x.e.ID) + "</a></td><td>" + (H.estadoChip ? H.estadoChip(x.e.Estado) : esc(x.e.Estado || "")) + '</td><td class="envolver">' + (x.l.length ? esc(x.l.map(function (r) { return r.Nombre + (r.Email ? "" : " (sin correo)"); }).join(", ")) : '<span class="muy-tenue">Sin responsable asignado</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<p class="tenue">No hay experimentos programados.</p>') + "</section>";
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
  var cuentaPrev = H.vistas.cuenta;
  H.vistas.cuenta = function (p, q) {
    var h = cuentaPrev.apply(this, arguments), marca = '<section class="tarjeta"><div class="cabecera"><h2>Avisos en este dispositivo', i = h.indexOf(marca), extra = cuentaNotifHTML();
    return i === -1 ? h.replace(/<\/div>\s*$/, extra + "</div>") : h.slice(0, i) + extra + h.slice(i);
  };
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
    return '<section class="tarjeta"><div class="cabecera"><h2>Pantalla de inicio de todos los usuarios</h2></div><p class="tenue">Lo que elijas aquí es lo que ven todos los usuarios en Inicio (no hay preferencias personales). Cada persona puede cambiar la vista de la perfusión desde la cabecera solo durante la sesión: al volver a abrir la app vuelve a la que elijas aquí.</p>' +
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
      return '<section class="tarjeta"><div class="cabecera"><h2>' + esc(titulo) + '</h2></div><div class="tabla-env"><table class="t t-obj"><thead><tr><th>Variable</th><th>Unidad</th><th class="centro">Mín. – máx.</th><th class="centro">Por defecto</th></tr></thead><tbody>' +
        vs.map(function (v) { var vd = C.variable(m, v) || { nombre: v, unidad: "" }; return '<tr><th scope="row"><span class="obj-var">' + esc(vd.nombre) + '</span></th><td class="muy-tenue">' + esc(vd.unidad || "") + '</td><td class="centro">' + parIn(m, v, O[m][v], vd.nombre) + '</td><td class="centro muy-tenue">' + esc(defTxt((D[m] || {})[v])) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    }
    var otros = Object.keys(O).filter(function (m) { return ["ART", "POR", "CAV", "PERF", "FLUJO"].indexOf(m) === -1; }).map(function (m) { return tablaSimple(m, C.MUESTRAS[m] ? C.MUESTRAS[m].nombre : m); }).join("");
    return '<div class="aviso info">' + ico("info") + "<div>Rangos que colorean los valores en las hojas, alimentan las alertas de Inicio y el asesor de gases. Gasometrías y presiones en mmHg (1 kPa = 7,50 mmHg). La pO₂ arterial usa los valores arteriales habituales (80–100 mmHg), no la del protocolo del grupo.</div></div>" +
      '<div class="aviso aj">' + ico("clock") + "<div><b>Pendiente de basales del grupo.</b> Los rangos por especie se ajustarán con los datos basales de nuestros experimentos y de los anteriores. Como son intraoperatorios, el pH y la oxigenación basales no se usarán como referencia.</div></div>" +
      (ok80 ? "" : '<div class="aviso aj">' + ico("triangle-alert") + "<div>La pO₂ arterial guardada es " + esc(defTxt(art)) + ' mmHg. <button class="bt mini" data-act="cfgPO2" data-a="80" data-b="100">Aplicar 80–100 mmHg</button></div></div>') +
      '<div class="fila-flex" style="margin-bottom:10px"><button class="bt" data-act="cfgRestaurar" data-k="objetivos">' + ico("undo-2") + "Valores por defecto</button></div>" +
      '<div class="obj-rejilla">' + gas + tablaSimple("FLUJO", "Presiones y temperatura") + tablaSimple("PERF", "Perfusato (bioquímica)") + otros + "</div>";
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v07a.js"] = "0.7.0";
