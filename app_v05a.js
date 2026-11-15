/* HOME v0.5 (A) · cabecera (foto, nombre y rol; alertas; vista de la perfusión), pantalla de inicio con gráficos con ejes,
   modo «comparar con otras perfusiones» (media ± DE), horario circadiano rediseñado con información de cada infusión y foto de perfil. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  var NOMBRE_M = { ART: "Arterial", POR: "Portal", CAV: "Cava", PERF: "Perfusato", FLUJO: "Máquina", BILIS: "Bilis", HDF: "HDF", INMUNO: "Inmunología" };
  function tH(m) { var a = C.num(m.T_real_h); return a !== null ? a : (C.num(m.T_nominal_h) || 0); }
  function si(v) { return v === true || v === "TRUE" || v === "true"; }

  // ============================================================== usuario: foto, nombre y rol
  function iniciales(n) { var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "?").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase(); }
  H.avatarHTML = function (u, cls) {
    u = u || {}; var f = u.foto || u.Foto || "";
    return f && /^data:image\/(jpeg|webp|png);base64,/.test(f) ? '<img class="avatar ' + (cls || "") + '" src="' + esc(f) + '" alt="">' : '<span class="avatar ' + (cls || "") + '" aria-hidden="true"><span>' + esc(iniciales(u.nombre || u.Nombre || u.email || u.Email)) + "</span></span>";
  };
  // nombre visible de un correo: Usuarios (ADMIN) → Equipo (resto) → parte local del correo
  H.nombreDe = function (email) {
    var e = String(email || "").toLowerCase(); if (!e) return ""; if (/^qr:/.test(e)) return String(email).slice(3) + " (QR)";
    var u = H.filas("Usuarios").concat(H.filas("Equipo")).filter(function (x) { return String(x.Email || "").toLowerCase() === e; })[0];
    return u && u.Nombre ? u.Nombre : e.split("@")[0];
  };

  // ============================================================== alertas: «Todas», «Requieren acción», «Actualizaciones»
  var NOMBRE_TABLA = { Mediciones: "datos", Eventos: "evento", Fotos: "foto del injerto", Dieta: "registro de dieta", Formularios: "formulario", Experimentos: "datos del experimento", Animales: "datos de los animales" };
  var NOMBRE_FORM = { cirugia: "hoja de cirugía", checklist: "checklist de material", hdf: "configuración de la HDF", cierre: "cierre", protocolo: "tabla de infusiones", receptor: "hoja del receptor", morfometria: "morfometría", eutanasia: "eutanasia" };
  function vistoAlertas() { return C.num(localStorage.getItem("home_alertas_vistas")) || 0; }
  H.alertasAccion = function () {
    var out = [], ahora = new Date(), hoy = C.diaISO(ahora), cfgP = S.cfg.programacion || C.DEF.programacion, adm = H.esAdmin();
    if (adm) {
      var pv = H.pendientesValidacion ? H.pendientesValidacion() : [], porExp = {};
      pv.forEach(function (x) { var k = x.exp || "—"; porExp[k] = porExp[k] || { n: 0, t: 0 }; porExp[k].n++; var t = C.aFecha(x.f.Actualizado_en || x.f.Creado_en); if (t && t.getTime() > porExp[k].t) porExp[k].t = t.getTime(); });
      Object.keys(porExp).forEach(function (k) { out.push({ id: "val|" + k, t: new Date(porExp[k].t || ahora.getTime()), icono: "badge-check", titulo: porExp[k].n + " registro(s) pendientes de validación", texto: k, href: "#/validar" }); });
      H.filas("Solicitudes_Acceso").filter(function (a) { return a.Estado === "Pendiente"; }).forEach(function (a) { out.push({ id: "acc|" + a.ID, t: C.aFecha(a.Fecha) || ahora, icono: "user-plus", titulo: "Solicitud de alta de " + ((a.Nombre || "") + " " + (a.Apellidos || "")).trim(), texto: (a.Rol_solicitado || "") + (a.Cargo ? " · " + a.Cargo : ""), href: "#/config/accesos" }); });
      H.filas("Solicitudes").filter(function (a) { return a.Estado === "Pendiente"; }).forEach(function (a) { out.push({ id: "sol|" + a.ID, t: C.aFecha(a.Fecha) || ahora, icono: "shopping-cart", titulo: "Solicitud de material" + (a.Urgencia === "Urgente" ? " urgente" : ""), texto: (a.Nombre_nuevo || (H.fila("Material", a.Material) || {}).Nombre || "") + (a.Cantidad ? " · " + a.Cantidad : ""), href: "#/inventario/solicitudes" }); });
      H.filas("Pedidos").filter(function (p) { return p.Estado === "Borrador"; }).forEach(function (p) { out.push({ id: "ped|" + p.ID, t: C.aFecha(p.Fecha) || ahora, icono: "mail", titulo: "Pedido en borrador por revisar", texto: p.ID + (p.Proveedor ? " · " + p.Proveedor : ""), href: "#/inventario/pedidos" }); });
      (H.expProgramados ? H.expProgramados() : []).forEach(function (e) {
        var d = C.diasEntre(hoy, e.Fecha_cirugia); if (d === null || d < 0) return;
        if (H.esProvisional(e) && d <= cfgP.confirmar_dias_antes) out.push({ id: "conf|" + e.ID, t: C.aDia(C.sumarDias(e.Fecha_cirugia, -cfgP.confirmar_dias_antes)) || ahora, icono: "calendar-days", titulo: "Confirmar la fecha de " + e.ID, texto: "Faltan " + d + " días (" + H.fechaDMA(C.aDia(e.Fecha_cirugia)) + ")", href: "#/calendario" });
        if (d <= 7 && H.protocoloConfirmado && !H.protocoloConfirmado(e)) out.push({ id: "prot|" + e.ID, t: C.aDia(C.sumarDias(e.Fecha_cirugia, -7)) || ahora, icono: "clipboard-check", titulo: "Confirmar la tabla de infusiones de " + e.ID, texto: "Protocolo " + (H.versionExp ? H.versionExp(e) : ""), href: "#/exp/" + encodeURIComponent(e.ID) + "/seguimiento/pre/protocolo" });
      });
      if (H.stockBajo) { var b = H.stockBajo(); if (b.length) out.push({ id: "stock", t: ahora, icono: "package", titulo: b.length + " material(es) bajo mínimo", texto: b.slice(0, 3).map(function (m) { return m.Nombre; }).join(", "), href: "#/inventario" }); }
    } else if (H.rol() === "INVESTIGADOR") {
      var me = String((S.usuario || {}).email || "").toLowerCase(), mias = (H.pendientesValidacion ? H.pendientesValidacion() : []).filter(function (x) { return String(x.f.Actualizado_por || "").toLowerCase() === me; });
      if (mias.length) out.push({ id: "mias", t: ahora, icono: "clock", titulo: mias.length + " registro(s) tuyos pendientes de validación", texto: "Los revisa un administrador", href: "#/experimentos" });
    }
    return out.map(function (x) { x.tipo = "accion"; return x; });
  };
  H.alertasActualizaciones = function () {
    var me = String((S.usuario || {}).email || "").toLowerCase(), lim = Date.now() - 7 * 864e5, grupos = {};
    function anadir(tabla, f, clave, titulo, href) {
      var t = C.aFecha(f.Actualizado_en || f.Creado_en); if (!t || t.getTime() < lim) return; var por = String(f.Actualizado_por || f.Creado_por || "").toLowerCase(); if (por === me) return;
      var k = clave + "|" + por + "|" + Math.floor(t.getTime() / 9e5), g = grupos[k] = grupos[k] || { id: "upd|" + k, t: t, n: 0, icono: "refresh-cw", titulo: titulo, por: por, href: href };
      g.n++; if (t > g.t) g.t = t;
    }
    H.todasMed().forEach(function (m) { if (H.esBorrado && H.esBorrado(m)) return; var mu = C.MUESTRAS[m.Muestra]; anadir("Mediciones", m, m.Experimento + "|" + m.Muestra + "|" + m.Punto, "Nuevos datos · " + (mu ? mu.corto : m.Muestra) + " · " + m.Experimento + " · " + (m.Punto || ""), "#/exp/" + encodeURIComponent(m.Experimento) + "/seguimiento"); });
    H.filas("Eventos").forEach(function (e) { anadir("Eventos", e, e.ID, H.nombreEvento(e.Tipo) + " · " + e.Experimento, "#/exp/" + encodeURIComponent(e.Experimento) + "/resumen"); });
    H.filas("Fotos").forEach(function (f) { anadir("Fotos", f, f.ID, "Foto del injerto · " + f.Experimento, "#/exp/" + encodeURIComponent(f.Experimento) + "/seguimiento/fotos"); });
    H.filas("Dieta").forEach(function (d) { anadir("Dieta", d, d.Experimento + "|dieta|" + d.Fecha + "|" + d.Toma, "Dieta · " + d.Experimento + " · " + (d.Toma || "") + " del " + H.fechaDMA(d.Fecha), "#/exp/" + encodeURIComponent(d.Experimento) + "/dieta"); });
    H.filas("Formularios").forEach(function (f) { anadir("Formularios", f, f.ID, "Actualizada la " + (NOMBRE_FORM[f.Tipo] || f.Tipo) + " · " + f.Experimento, "#/exp/" + encodeURIComponent(f.Experimento) + "/resumen"); });
    H.filas("Experimentos").forEach(function (e) { anadir("Experimentos", e, e.ID, "Cambios en " + e.ID, "#/exp/" + encodeURIComponent(e.ID) + "/resumen"); });
    return Object.keys(grupos).map(function (k) { var g = grupos[k]; g.tipo = "actualizacion"; g.texto = (g.n > 1 ? g.n + " cambios · " : "") + "por " + H.nombreDe(g.por); return g; });
  };
  function alertas() { var a = H.alertasAccion().concat(H.alertasActualizaciones()); return a.sort(function (x, y) { return x.t - y.t; }); }
  function nuevas(l) { var v = vistoAlertas(); return l.filter(function (x) { return x.tipo === "accion" || x.t.getTime() > v; }).length; }
  H.campanaHTML = function () {
    var n = 0; try { n = nuevas(alertas()); } catch (e) { n = 0; }
    return '<button class="bt ico-solo campana" data-act="abrirAlertas" aria-haspopup="dialog" aria-label="Alertas' + (n ? " (" + n + " nuevas)" : "") + '">' + ico("bell") + (n ? '<span class="cont">' + (n > 99 ? "99+" : n) + "</span>" : "") + "</button>";
  };
  var POP = { filtro: "todas" };
  function listaAlertasHTML() {
    var l = alertas(), v = vistoAlertas(), f = POP.filtro, sel = l.filter(function (x) { return f === "todas" || (f === "accion" ? x.tipo === "accion" : x.tipo === "actualizacion"); });
    if (sel.length > 60) sel = sel.slice(-60);
    var n = { todas: l.length, accion: l.filter(function (x) { return x.tipo === "accion"; }).length, actualizacion: l.filter(function (x) { return x.tipo === "actualizacion"; }).length };
    return '<div class="segmentado alertas-filtro" role="tablist" aria-label="Filtrar alertas">' + [["todas", "Todas"], ["accion", "Requieren acción"], ["actualizacion", "Actualizaciones"]].map(function (x) { return '<button role="tab" aria-selected="' + (f === x[0]) + '" class="' + (f === x[0] ? "activo" : "") + '" data-act="filtroAlertas" data-f="' + x[0] + '">' + x[1] + ' <span class="n">' + n[x[0]] + "</span></button>"; }).join("") + "</div>" +
      (sel.length ? '<ol class="lista-alertas">' + sel.map(function (x) {
        var nueva = x.tipo === "accion" || x.t.getTime() > v;
        return '<li class="' + (x.tipo === "accion" ? "accion" : "upd") + (nueva ? " nueva" : "") + '"><a href="' + esc(x.href || "#/inicio") + '" data-cerrar-alertas>' + '<span class="ic">' + ico(x.icono || "bell", "s") + '</span><span class="tx"><b>' + esc(x.titulo) + "</b>" + (x.texto ? "<span>" + esc(x.texto) + "</span>" : "") + '</span><time datetime="' + esc(x.t.toISOString()) + '">' + esc(H.diaCorto(x.t) + " " + H.hora(x.t)) + "</time></a></li>";
      }).join("") + "</ol>" : '<p class="tenue vacio-alertas">' + (f === "accion" ? "No hay nada pendiente de tu parte." : "Sin novedades en los últimos 7 días.") + "</p>") +
      '<p class="muy-tenue pie-alertas">Orden cronológico, de la más antigua a la más reciente. Actualizaciones de los últimos 7 días hechas por otras personas.</p>';
  }
  H.acc.abrirAlertas = function (el) {
    var ex = H.$("#popAlertas"); if (ex) { cerrarPop(); return; }
    var d = document.createElement("div"); d.id = "popAlertas"; d.className = "pop-alertas"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Alertas");
    d.innerHTML = '<div class="pop-cab"><h2>Alertas</h2><button class="bt ico-solo texto" data-act="cerrarAlertas" aria-label="Cerrar">' + ico("x") + '</button></div><div class="pop-cuerpo">' + listaAlertasHTML() + "</div>";
    document.body.appendChild(d); var fondo = document.createElement("div"); fondo.id = "popFondo"; fondo.className = "pop-fondo"; fondo.addEventListener("click", cerrarPop); document.body.appendChild(fondo);
    d.addEventListener("click", function (e) { var a = e.target.closest("[data-cerrar-alertas]"); if (a) { cerrarPop(); } });
    var c = el.closest(".campana") || el; if (c && c.getBoundingClientRect && window.innerWidth >= 600) { var r = c.getBoundingClientRect(); d.style.top = Math.round(r.bottom + 8) + "px"; d.style.right = Math.max(12, Math.round(window.innerWidth - r.right)) + "px"; }
    localStorage.setItem("home_alertas_vistas_prev", String(vistoAlertas())); localStorage.setItem("home_alertas_vistas", String(Date.now()));
  };
  function cerrarPop() { var d = H.$("#popAlertas"), f = H.$("#popFondo"); if (d) d.remove(); if (f) f.remove(); var c = H.$(".campana"); if (c) c.outerHTML = H.campanaHTML(); }
  H.acc.cerrarAlertas = cerrarPop;
  H.acc.filtroAlertas = function (el) { POP.filtro = el.getAttribute("data-f"); var c = H.$("#popAlertas .pop-cuerpo"); if (c) { var v = localStorage.getItem("home_alertas_vistas"); localStorage.setItem("home_alertas_vistas", localStorage.getItem("home_alertas_vistas_prev") || "0"); c.innerHTML = listaAlertasHTML(); localStorage.setItem("home_alertas_vistas", v); } };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && H.$("#popAlertas")) cerrarPop(); });

  // ============================================================== vista de la perfusión (cabecera, solo en Inicio con perfusión en curso)
  H.perfusionActual = function () { return H.listaExp().filter(function (e) { return e.Estado === "Perfusión"; }).sort(function (a, b) { return String(b.Inicio_perfusion || "").localeCompare(String(a.Inicio_perfusion || "")); })[0] || null; };
  function modoIni() { var m = H.pref("vistaIni"); return m === "todo" || m === "comparar" ? m : "24h"; }
  H.pintarCabecera = function (r) {
    var c = H.$("#cabPerf"); if (c) {
      var act = r.partes[0] === "inicio" ? H.perfusionActual() : null, m = modoIni();
      c.innerHTML = act ? '<label class="sr" for="selVistaIni">Vista de la perfusión ' + esc(act.ID) + '</label><span class="sel-pildora">' + ico("activity", "s") + '<select id="selVistaIni" data-cambio="vistaIni">' + [["24h", "Últimas 24 horas"], ["todo", "Toda la perfusión"], ["comparar", "Comparar con otras perfusiones"]].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === m ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></span>" : "";
    }
    var cp = H.$(".campana"); if (cp && !H.$("#popAlertas")) cp.outerHTML = H.campanaHTML();
  };
  H.acc.vistaIni = function (el) { H.pref("vistaIni", el.value); if (el.value === "comparar") cargarComparacion(); H.repintar(); };
  var COMP = { pedido: false };
  function previas(act) { return H.listaExp().filter(function (e) { return e.ID !== act.ID && H.inicioPerf(e.ID) && (e.Estado === "Finalizado" || e.Fin_perfusion); }); }
  function cargarComparacion() {
    var act = H.perfusionActual(); if (!act || COMP.pedido) return; COMP.pedido = true;
    var ids = previas(act).map(function (e) { return e.ID; }).filter(function (id) { return !S.medCargada[id]; });
    if (ids.length && H.asegurarMed) H.asegurarMed(ids).then(function () { H.repintar(); }).catch(function () { COMP.pedido = false; });
  }

  // ============================================================== series por clave «MUESTRA:variable» (incluye producción de bilis y VO₂)
  function serieClave(exp, k) {
    var p = String(k).split(":"), mu = p[0], v = p[1], e = H.exp(exp) || { ID: exp };
    if (k === "BILIS:Volumen_mL") return H.med(exp).filter(function (m) { return m.Muestra === "BILIS" && m.Variable === "Volumen_mL" && C.num(m.Valor) !== null; }).sort(function (x, y) { return tH(x) - tH(y); }).map(function (m) { var d = H.derivadasBilis ? H.derivadasBilis(e, { punto: m.Punto }) : null; return d && d.Produccion_mLh !== undefined && d.Produccion_mLh !== null ? { t: tH(m), tn: C.num(m.T_nominal_h), v: d.Produccion_mLh, punto: m.Punto } : null; }).filter(Boolean);
    if (mu === "DERIV") { var pts = {}; H.med(exp).forEach(function (m) { if (m.Muestra === "CAV" && m.Variable === "pO2") pts[m.Punto] = m; }); return Object.keys(pts).map(function (pp) { var d = H.derivadasFlujo ? H.derivadasFlujo(e, pp) : null, x = d ? (C.num(d.VO2_100g) !== null && d.VO2_100g !== undefined ? d.VO2_100g : d.VO2) : null; return x !== null && x !== undefined ? { t: tH(pts[pp]), tn: C.num(pts[pp].T_nominal_h), v: x, punto: pp } : null; }).filter(Boolean).sort(function (a, b) { return a.t - b.t; }); }
    var l = H.med(exp).filter(function (m) { return m.Muestra === mu && m.Variable === v && C.num(m.Valor) !== null; });
    if (mu === "PERF" && v === "Cefalina") l = l.concat(H.med(exp).filter(function (m) { return m.Muestra === "INMUNO" && m.Variable === "Cefalina" && C.num(m.Valor) !== null; }));
    return l.sort(function (a, b) { return tH(a) - tH(b); }).map(function (m) { return { t: tH(m), tn: C.num(m.T_nominal_h), v: C.num(m.Valor), punto: m.Punto }; });
  }
  H.serieClave = serieClave;
  function defClave(k) {
    var p = String(k).split(":"), mu = p[0], v = p[1];
    if (k === "BILIS:Volumen_mL") return { nombre: "Producción de bilis", unidad: "mL/h", dec: 1, ob: null, mu: mu, v: v };
    if (mu === "DERIV") return { nombre: "Consumo de O₂", unidad: "mL/min/100 g", dec: 3, ob: null, mu: mu, v: v };
    var d = C.variable(mu, v); return { nombre: d.nombre, unidad: H.unidadVisible(v, d.unidad), dec: d.dec !== undefined ? d.dec : 1, ob: H.objetivo(mu, v), mu: mu, v: v };
  }
  // media ± DE de las perfusiones anteriores, agrupando por tiempo nominal (o la hora redondeada si no lo hay)
  function bandaComparacion(act, k) {
    var g = {}, n = 0;
    previas(act).forEach(function (e) { var s = serieClave(e.ID, k); if (s.length) n++; s.forEach(function (p) { var x = p.tn !== null && p.tn !== undefined ? p.tn : Math.round(p.t); (g[x] = g[x] || []).push(p.v); }); });
    var out = Object.keys(g).map(Number).sort(function (a, b) { return a - b; }).map(function (x) { var a = g[x]; return { t: x, n: a.length, m: C.media(a), s: a.length > 1 ? C.de(a) : null }; });
    return { puntos: out, n: n };
  }

  // ============================================================== gráfico SVG con ejes (tiempo en X, valor en Y)
  function ticks(lo, hi, n) {
    var span = hi - lo || 1, paso = Math.pow(10, Math.floor(Math.log10(span / n))), err = span / n / paso;
    paso *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1; var out = []; for (var t = Math.ceil(lo / paso) * paso; t <= hi + paso * 1e-9; t += paso) out.push(+t.toFixed(10)); return out;
  }
  function fmt(v, dec) { return H.n(v, Math.max(0, Math.min(dec, Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : dec))); }
  H.graficoEjes = function (pts, o) {
    o = o || {}; var W = 320, Hh = 158, L = 44, R = 10, T = 10, B = 26, pw = W - L - R, ph = Hh - T - B;
    var x0 = o.x0 !== undefined ? o.x0 : 0, x1 = o.x1 !== undefined ? o.x1 : Math.max(1, pts.length ? pts[pts.length - 1].t : 1); if (x1 <= x0) x1 = x0 + 1;
    var vis = pts.filter(function (p) { return p.t >= x0 - 1e-9 && p.t <= x1 + 1e-9; }), banda = (o.banda || []).filter(function (b) { return b.t >= x0 - 1e-9 && b.t <= x1 + 1e-9; });
    var ys = vis.map(function (p) { return p.v; }); banda.forEach(function (b) { ys.push(b.m); if (b.s !== null) { ys.push(b.m - b.s); ys.push(b.m + b.s); } }); if (o.ob) { if (o.ob[0] !== null) ys.push(o.ob[0]); if (o.ob[1] !== null) ys.push(o.ob[1]); } if (o.ref !== null && o.ref !== undefined) ys.push(o.ref);
    if (!ys.length) return '<div class="graf-vacio">Sin datos en este periodo</div>';
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys); if (hi === lo) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; } var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    var X = function (t) { return L + (t - x0) / (x1 - x0) * pw; }, Y = function (v) { return T + ph - (v - lo) / (hi - lo) * ph; };
    var g = "", ty = ticks(lo, hi, 4), tx = ticks(x0, x1, 5);
    ty.forEach(function (v) { if (v < lo || v > hi) return; g += '<line class="ge-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ge-ty" x="' + (L - 5) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" text-anchor="end">' + esc(fmt(v, o.dec || 1)) + "</text>"; });
    tx.forEach(function (t) { if (t < x0 || t > x1) return; g += '<line class="ge-tick" x1="' + X(t).toFixed(1) + '" x2="' + X(t).toFixed(1) + '" y1="' + (T + ph) + '" y2="' + (T + ph + 4) + '"/><text class="ge-tx" x="' + X(t).toFixed(1) + '" y="' + (T + ph + 15) + '" text-anchor="middle">' + esc(H.n(t, 0)) + "</text>"; });
    if (o.ob && o.ob[0] !== null && o.ob[1] !== null) { var y1 = Y(Math.min(hi, o.ob[1])), y0 = Y(Math.max(lo, o.ob[0])); if (y0 > y1) g = '<rect class="ge-obj" x="' + L + '" width="' + pw + '" y="' + y1.toFixed(1) + '" height="' + (y0 - y1).toFixed(1) + '"/>' + g; }
    if (banda.length) {
      var bs = banda.filter(function (b) { return b.s !== null; });
      if (bs.length > 1) { g += '<path class="ge-de-area" d="M' + bs.map(function (b) { return X(b.t).toFixed(1) + "," + Y(b.m + b.s).toFixed(1); }).join("L") + "L" + bs.slice().reverse().map(function (b) { return X(b.t).toFixed(1) + "," + Y(b.m - b.s).toFixed(1); }).join("L") + 'Z"/>';
        g += '<polyline class="ge-de" points="' + bs.map(function (b) { return X(b.t).toFixed(1) + "," + Y(b.m + b.s).toFixed(1); }).join(" ") + '"/><polyline class="ge-de" points="' + bs.map(function (b) { return X(b.t).toFixed(1) + "," + Y(b.m - b.s).toFixed(1); }).join(" ") + '"/>'; }
      g += '<polyline class="ge-media" points="' + banda.map(function (b) { return X(b.t).toFixed(1) + "," + Y(b.m).toFixed(1); }).join(" ") + '"/>';
    }
    if (o.ref !== null && o.ref !== undefined) g += '<line class="ge-ref" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(o.ref).toFixed(1) + '" y2="' + Y(o.ref).toFixed(1) + '"><title>Basal del donante de sangre</title></line>';
    if (vis.length > 1) g += '<polyline class="ge-linea" points="' + vis.map(function (p) { return X(p.t).toFixed(1) + "," + Y(p.v).toFixed(1); }).join(" ") + '"/>';
    vis.forEach(function (p, i) { var fuera = o.ob ? C.enRango(p.v, o.ob) : 0; g += '<circle class="ge-punto' + (fuera ? " fuera" : "") + (i === vis.length - 1 ? " ultimo" : "") + '" cx="' + X(p.t).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="' + (i === vis.length - 1 ? 3.6 : 2.4) + '"><title>' + esc((p.punto || "") + " · " + H.n(p.t, 1) + " h · " + H.n(p.v, o.dec || 1)) + "</title></circle>"; });
    g += '<line class="ge-eje" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (T + ph) + '"/><line class="ge-eje" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '"/>';
    g += '<text class="ge-tit-x" x="' + (W - R) + '" y="' + (Hh - 1) + '" text-anchor="end">h de perfusión</text>';
    return '<svg class="graf-ejes" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="' + esc(o.titulo || "Gráfico") + '">' + g + "</svg>";
  };

  // tarjeta de una variable con valor actual, tendencia y gráfico
  function basalBD(expId, k) { var p = String(k).split(":"); if (p[0] !== "PERF" && p[0] !== "ART") return null; var m = H.med(expId).filter(function (x) { return x.Muestra === "BASAL_BD" && x.Variable === p[1] && C.num(x.Valor) !== null; })[0]; return m ? C.num(m.Valor) : null; }
  function tarjetaGrafico(e, k, modo, horas) {
    var d = defClave(k), serie = serieClave(e.ID, k).map(function (p) { return { t: p.t, v: C.num(H.aVista(d.v, p.v)), punto: p.punto, tn: p.tn }; }), u = serie[serie.length - 1], a = serie[serie.length - 2];
    var x1 = Math.max(horas, 1), x0 = modo === "24h" ? Math.max(0, x1 - 24) : 0, banda = null, nComp = 0;
    if (modo === "comparar") { var bc = bandaComparacion(e, k); nComp = bc.n; banda = bc.puntos.map(function (b) { return { t: b.t, m: C.num(H.aVista(d.v, b.m)), s: b.s === null ? null : Math.abs(C.num(H.aVista(d.v, b.m + b.s)) - C.num(H.aVista(d.v, b.m))), n: b.n }; }); }
    var ob = d.ob ? [C.num(H.aVista(d.v, d.ob[0])), C.num(H.aVista(d.v, d.ob[1]))] : null, ref = basalBD(e.ID, k), cls = u && ob ? (C.enRango(u.v, ob) ? "al" : "ok") : "";
    var tend = u && a ? (function () { var dv = u.v - a.v, fl = Math.abs(dv) < Math.pow(10, -d.dec) / 2 ? "=" : dv > 0 ? "↑" : "↓"; return '<span class="tend"><span class="flecha" aria-label="' + (fl === "↑" ? "sube" : fl === "↓" ? "baja" : "sin cambio") + '">' + fl + "</span> " + esc(H.n(a.v, d.dec)) + "</span>"; })() : u ? '<span class="tend muy-tenue">primer valor</span>' : "";
    return '<div class="g-tarjeta ' + cls + '"><div class="g-cab"><div class="g-tit"><span class="et">' + esc(d.nombre) + (d.mu !== "PERF" && d.mu !== "BILIS" && d.mu !== "FLUJO" && d.mu !== "DERIV" ? " · " + esc(NOMBRE_M[d.mu] || d.mu) : "") + '</span><span class="u">' + esc(d.unidad) + (u && u.punto ? " · " + esc(u.punto) : "") + '</span></div><div class="g-val"><b>' + (u ? esc(H.n(u.v, d.dec)) : "—") + "</b>" + tend + "</div></div>" +
      H.graficoEjes(serie, { x0: x0, x1: x1, ob: ob, banda: banda, dec: d.dec, ref: ref, titulo: d.nombre }) +
      (modo === "comparar" ? '<div class="g-pie">' + (nComp ? "Media ± DE de " + nComp + " perfusión(es) anterior(es)" : "Sin perfusiones anteriores con este dato") + "</div>" : "") + "</div>";
  }

  H.tarjetaGrafico = tarjetaGrafico;
  // ============================================================== pantalla de inicio: perfusión en curso
  H.tarjetaPerfusion = function (e) {
    var t0 = H.inicioPerf(e.ID), ev = H.eventos(e.ID), horas = t0 ? C.horasEntre(t0, new Date()) : 0, prox = H.proximoPunto(e.ID), idq = encodeURIComponent(e.ID), modo = modoIni();
    if (modo === "comparar") cargarComparacion();
    var enRecal = t0 && !ev.fin_recalentamiento && (Date.now() - C.aFecha(t0).getTime()) / 6e4 < (S.cfg.recalentamiento.pasos.slice(-1)[0].t + S.cfg.recalentamiento.paso_min + 30);
    var al = H.alertasUltimoRegistro(e.ID), sel = (S.cfg.inicio || C.DEF.inicio).ultimos_valores || [];
    var alHTML = '<details class="alertas ' + (al.length ? "hay" : "nada") + '"' + (al.length && al.length <= 6 ? " open" : "") + "><summary>" + ico(al.length ? "triangle-alert" : "circle-check") + (al.length ? "<b>" + al.length + " valor(es) fuera de rango</b> en el último registro" : "Sin valores fuera de rango en el último registro") + "</summary>" +
      (al.length ? "<ul>" + al.map(function (a) { return '<li><span class="chip ' + (a.dir < 0 ? "info" : "al") + '">' + (a.dir < 0 ? "↓ bajo" : "↑ alto") + "</span> <b>" + esc(a.nombre) + "</b> " + esc(NOMBRE_M[a.muestra] || a.muestra) + " · " + esc(a.punto) + ": <b>" + esc(H.n(H.aVista(a.variable, a.valor), 2)) + "</b> " + esc(H.unidadVisible(a.variable, a.unidad)) + ' <span class="muy-tenue">(objetivo ' + esc(H.n(H.aVista(a.variable, a.ob[0]), 2)) + "–" + esc(H.n(H.aVista(a.variable, a.ob[1]), 2)) + ")</span></li>"; }).join("") + "</ul>" : "") + "</details>";
    var usados = {}, grupos = C.GRUPOS_INICIO.map(function (g) {
      var ks = g[1].filter(function (k) { return sel.indexOf(k) !== -1; }); ks.forEach(function (k) { usados[k] = 1; }); if (!ks.length) return "";
      return '<h3 class="sub">' + esc(g[0]) + '</h3><div class="g-rejilla">' + ks.map(function (k) { return tarjetaGrafico(e, k, modo, horas); }).join("") + "</div>";
    }).join("");
    var otros = sel.filter(function (k) { return !usados[k]; }); if (otros.length) grupos += '<h3 class="sub">Otros valores</h3><div class="g-rejilla">' + otros.map(function (k) { return tarjetaGrafico(e, k, modo, horas); }).join("") + "</div>";
    var leyenda = '<p class="g-leyenda muy-tenue"><span class="lg lg-serie"></span>' + esc(e.ID) + '<span class="lg lg-obj"></span>rango objetivo' + (modo === "comparar" ? '<span class="lg lg-media"></span>media de las perfusiones anteriores<span class="lg lg-de"></span>± 1 DE' : "") + '<span class="lg lg-ref"></span>basal del donante de sangre · ' + (modo === "24h" ? "últimas 24 h" : "desde el inicio") + "</p>";
    var bx = H.balanceExp ? H.balanceExp(e) : null, hdf = bx ? '<h3 class="sub">Balance de volumen y HDF</h3><div class="kpis kpis-ini"><div class="kpi ' + (Math.abs(bx.b.balance_mL) <= 50 ? "ok" : Math.abs(bx.b.balance_mL) <= 150 ? "aj" : "al") + '"><div class="et">Balance desde el inicio</div><div class="v">' + (bx.b.balance_mL > 0 ? "+" : "") + H.n(bx.b.balance_mL, 0) + '<small>mL</small></div><div class="tend">infundido ' + H.n(bx.b.infundido_mL, 0) + " · bilis " + H.n(bx.b.bilis_mL, 0) + " · HDF " + H.n(bx.b.extraido_mL, 0) + "</div></div>" +
      '<div class="kpi"><div class="et">Extracción de la HDF ahora</div><div class="v">' + (bx.b.extraccion_actual !== null ? H.n(bx.b.extraccion_actual, 0) + "<small>mL/h</small>" : "—") + '</div><div class="tend">recomendada ' + H.n(bx.rec.redondeada_mL_h, 0) + " mL/h</div></div>" +
      '<div class="kpi"><div class="et">Infusión total ahora</div><div class="v">' + H.n(H.infusionAhora(e), 1) + '<small>mL/h</small></div><div class="tend"><a href="#/exp/' + idq + '/seguimiento/perf/hdf">Ajustar la extracción</a></div></div></div>' : "";
    return '<section class="tarjeta perf-curso" aria-label="Perfusión en curso ' + esc(e.ID) + '"><div class="cabecera"><h2><span class="punto-color" style="background:' + esc(H.colorExp(e.ID)) + '"></span> ' + esc(e.ID) + " · perfusión en curso</h2>" + H.estadoChip(e.Estado) +
      (H.puede("registrar") ? '<a class="bt pri" href="#/exp/' + idq + '/seguimiento/perf/registrar">' + ico("clipboard-list") + "Registrar datos</a>" : "") + '<a class="bt" href="#/exp/' + idq + '/seguimiento">' + ico("activity") + "Seguimiento</a>" + (enRecal ? '<a class="bt pri" href="#/exp/' + idq + '/quirofano">' + ico("thermometer") + "Recalentamiento</a>" : "") + "</div>" +
      '<div class="cronos tres"><div class="crono activo heroe"><div class="et">Tiempo de perfusión · día ' + (t0 ? Math.floor(horas / 24) + 1 : "—") + '</div><div class="t" data-crono="' + esc(t0 || "") + '">--:--:--</div><div class="muy-tenue">Inicio ' + esc(H.fechaHora(t0)) + "</div></div>" +
      (prox ? '<div class="crono"><div class="et">Próxima muestra · ' + esc(prox.etiqueta) + '</div><div class="t cuenta-atras" data-cuenta="' + prox.fecha.toISOString() + '">--:--</div><div class="muy-tenue">' + esc(H.diaCorto(prox.fecha) + " " + H.hora(prox.fecha)) + "</div></div>" : '<div class="crono"><div class="et">Próxima muestra</div><div class="t pequeno">Sin muestras pendientes</div><div class="muy-tenue">Protocolo de muestreo completado</div></div>') +
      '<div class="crono foto-crono"><div class="et">Foto diaria del injerto</div>' + (H.bloqueFotoHTML ? H.bloqueFotoHTML(e) : "") + "</div></div>" +
      '<h3 class="sub">Alertas</h3>' + alHTML + leyenda + grupos + hdf +
      (H.esCircadiano(e) ? '<h3 class="sub">Administración circadiana · ahora (' + esc(H.hora(new Date())) + ")</h3>" + H.circadianoPanel(e) : "") + "</section>";
  };

  // ============================================================== horario circadiano (HTML adaptable, sin solapes) + información de cada línea
  H.esCircadiano = function (e) { return !/no circadiano/i.test((e && e.Protocolo) || ""); };
  H.versionExp = function (e) { var f = e ? H.form(e.ID, "protocolo", "") : {}; if (f && f.version) return f.version; return e && /^V\d+$/.test(e.Protocolo || "") ? e.Protocolo : C.versionActual(); };
  H.protocoloExp = function (e) {
    var v = H.versionExp(e), base = (C.PROTOCOLOS[v] || C.PROTOCOLOS[C.versionActual()]).lineas, f = e ? H.form(e.ID, "protocolo", "") : {}, conf = (f && f.lineas) || {}, out = {};
    Object.keys(base).forEach(function (l) { var b = base[l], c = conf[l] || {}; out[l] = { producto: c.producto || b.producto, incluida: c.incluida !== false, componentes: (c.componentes && c.componentes.length ? c.componentes : b.componentes).map(function (x) { return { nombre: x.nombre, madre: x.madre, unidad: x.unidad }; }) }; });
    Object.keys(conf).forEach(function (l) { if (!out[l]) out[l] = { producto: conf[l].producto || l, incluida: conf[l].incluida !== false, componentes: conf[l].componentes || [] }; });
    return { version: v, lineas: out, confirmado_por: f && f.confirmado_por, confirmado_en: f && f.confirmado_en };
  };
  H.protocoloConfirmado = function (e) { var f = H.form(e.ID, "protocolo", ""); return !!(f && f.confirmado_en); };
  function cfgH() { return S.cfg.hdf || C.DEF.hdf; }
  H.infusionAhora = function (e) { var circ = H.circadianoDe(e); return C.infusionA(circ, new Date(), cfgH()).mL_h; };
  // horario efectivo: sin las líneas que el protocolo confirmado marca como no administradas
  H.circadianoDe = function (e) {
    var c = S.cfg.circadiano; if (!e || !H.esCircadiano(e)) return { lineas: [], cambios: [] };
    var p = H.protocoloExp(e), fuera = Object.keys(p.lineas).filter(function (l) { return !p.lineas[l].incluida; });
    return { lineas: c.lineas.filter(function (l) { return fuera.indexOf(l) === -1; }), cambios: c.cambios.filter(function (x) { return fuera.indexOf(x.linea) === -1; }), verificado: c.verificado };
  };
  var COLOR_LINEA = ["#0f766e", "#2563eb", "#c2410c", "#7c3aed", "#b45309", "#0e7490", "#be185d", "#4d7c0f", "#475569"];
  H.circadianoSVG = function (c, ahora, e) {
    c = c || S.cfg.circadiano; var ini = 8 * 60, lineas = c.lineas.filter(function (l) { return C.LINEAS_OCULTAS.indexOf(l) === -1 && c.cambios.some(function (x) { return x.linea === l; }); });
    function pos(m) { return (((m - ini) % 1440 + 1440) % 1440) / 1440 * 100; }
    var eje = '<div class="ci-eje"><span></span><div class="ci-horas">' + [0, 4, 8, 12, 16, 20, 24].map(function (h) { var hr = (8 + h) % 24; return '<span style="left:' + (h / 24 * 100).toFixed(3) + '%">' + (hr < 10 ? "0" : "") + hr + ":00</span>"; }).join("") + "</div></div>";
    var filas = lineas.map(function (l, i) {
      var ev = c.cambios.filter(function (x) { return x.linea === l; }).slice().sort(function (a, b) { return ((C.hm(a.h) - ini + 1440) % 1440) - ((C.hm(b.h) - ini + 1440) % 1440); });
      var max = Math.max.apply(null, ev.map(function (x) { return C.num(x.valor) || 0; }).concat([1e-9])), primero = (C.hm(ev[0].h) - ini + 1440) % 1440, col = COLOR_LINEA[i % COLOR_LINEA.length];
      var segs = ev.map(function (x, j) { var a = (C.hm(x.h) - ini + 1440) % 1440, b = j + 1 < ev.length ? (C.hm(ev[j + 1].h) - ini + 1440) % 1440 : 1440; return { a: a, b: b, v: C.num(x.valor) || 0 }; });
      if (primero > 0) segs.unshift({ a: 0, b: primero, v: C.num(ev[ev.length - 1].valor) || 0 });
      var ultimoX = -100, barras = segs.map(function (sg) {
        if (!sg.v || sg.b <= sg.a) return ""; var x = sg.a / 1440 * 100, w = (sg.b - sg.a) / 1440 * 100, hh = 28 + 62 * sg.v / max, mostrar = w >= 4.2 && x - ultimoX >= 4.2;
        if (mostrar) ultimoX = x;
        return '<span class="ci-barra" style="left:' + x.toFixed(3) + "%;width:" + Math.max(0.35, w - 0.15).toFixed(3) + "%;height:" + hh.toFixed(0) + "%;background:" + col + '" title="' + esc(C.nombreLinea(l) + " · " + H.n(sg.v, 1) + " mL/h · " + hhmm(sg.a + ini) + "–" + hhmm(sg.b + ini)) + '">' + (mostrar ? '<span class="ci-v">' + esc(H.n(sg.v, sg.v < 10 && sg.v % 1 ? 1 : 0)) + "</span>" : "") + "</span>";
      }).join("");
      return '<div class="ci-fila"><div class="ci-nombre"><span class="ci-punto" style="background:' + col + '"></span><span>' + esc(C.nombreLinea(l)) + '</span><button class="bt ico-solo texto ci-info" data-act="infoLinea" data-l="' + esc(l) + '"' + (e ? ' data-exp="' + esc(e.ID) + '"' : "") + ' aria-label="Información de ' + esc(C.nombreLinea(l)) + '">' + ico("info", "s") + '</button></div><div class="ci-pista"><span class="ci-noche"></span>' + barras + "</div></div>";
    }).join("");
    var ya = ahora ? '<span class="ci-ahora" style="left:' + pos(ahora.getHours() * 60 + ahora.getMinutes()).toFixed(3) + '%"><span>ahora ' + esc(H.hora(ahora)) + "</span></span>" : "";
    return '<div class="ci-env" role="img" aria-label="Ritmos de infusión del protocolo circadiano a lo largo de 24 horas, en mL/h">' + eje + '<div class="ci-cuerpo">' + filas + '<div class="ci-capa-ahora">' + ya + "</div></div></div>";
  };
  function hhmm(m) { m = ((m % 1440) + 1440) % 1440; var h = Math.floor(m / 60), mi = m % 60; return (h < 10 ? "0" : "") + h + ":" + (mi < 10 ? "0" : "") + mi; }
  H.circadianoPanel = function (e) {
    var circ = H.circadianoDe(e), ahora = new Date(), inf = C.infusionA(circ, ahora, cfgH()), p = e ? H.protocoloExp(e) : null;
    return H.circadianoSVG(circ, ahora, e) + '<div class="fila-flex ci-pie"><span class="chip pri">Infusión total ahora: ' + H.n(inf.mL_h, 1) + " mL/h</span>" + (p ? '<span class="chip">Protocolo ' + esc(p.version) + (p.confirmado_en ? " · confirmado" : " · sin confirmar") + "</span>" : "") + '<span class="muy-tenue">Las barras indican mL/h de cada línea.</span></div>';
  };
  H.acc.infoLinea = function (el) {
    var l = el.getAttribute("data-l"), e = H.exp(el.getAttribute("data-exp")), p = H.protocoloExp(e), x = p.lineas[l] || { producto: C.nombreLinea(l), componentes: [] }, V = e ? H.Vperf(e.ID) : (S.cfg.general.volumen_sangre_mL || 2200);
    var rv = C.ritmosVigentes(S.cfg.circadiano, new Date()), act = rv.vigentes[l], mLh = act ? C.num(act.valor) : 0;
    var filas = x.componentes.map(function (c) {
      var a = C.aporteLinea(c, mLh, V);
      return "<tr><td><b>" + esc(c.nombre) + '</b></td><td class="num">' + (c.madre !== null && c.madre !== undefined ? esc(H.n(c.madre, c.madre < 0.01 ? 4 : c.madre < 1 ? 3 : 1)) + " " + esc(c.unidad) : '<span class="muy-tenue">por confirmar</span>') + '</td><td class="num">' + (a ? esc(H.n(a.por_h, a.por_h < 0.1 ? 4 : 2)) + " " + esc(a.unidad_h) : "—") + '</td><td class="num">' + (a ? "+" + esc(H.n(a.por_L_h, a.por_L_h < 0.1 ? 4 : 2)) + " " + esc(a.unidad_L_h) : "—") + "</td></tr>";
    }).join("");
    H.modal({ titulo: C.nombreLinea(l), cuerpo: '<p><b>' + esc(x.producto) + '</b></p><p class="tenue">Ritmo ahora: <b>' + H.n(mLh, 1) + " mL/h</b> · volumen de perfusato " + H.n(V, 0) + " mL · protocolo " + esc(p.version) + (C.PROTOCOLOS[p.version] ? " (" + esc(C.PROTOCOLOS[p.version].ref) + ")" : "") + (x.incluida ? "" : ' · <span class="chip aj">no se administra en esta perfusión</span>') + "</p>" +
      (filas ? '<div class="tabla-env"><table class="t"><thead><tr><th>Componente</th><th class="num">Solución madre</th><th class="num">Se administra ahora</th><th class="num">Concentración esperada en el perfusato</th></tr></thead><tbody>' + filas + "</tbody></table></div>" : "") +
      '<p class="muy-tenue" style="margin-top:8px">«Se administra ahora» = solución madre × ritmo. La concentración esperada es el aumento por hora en el volumen de perfusato si no hubiera aclaramiento (hígado ni HDF): sirve de referencia, no es la concentración real.</p>' +
      (e && H.puede("registrar") ? '<a class="bt" data-cerrar href="#/exp/' + encodeURIComponent(e.ID) + '/seguimiento/pre/protocolo">' + ico("clipboard-check") + "Tabla de infusiones de " + esc(e.ID) + "</a>" : "") });
  };

  // ============================================================== Mi cuenta: foto de perfil
  function reducirFoto(file) {
    return new Promise(function (ok, ko) {
      if (!/^image\//.test(file.type)) { ko(new Error("Elige una imagen (JPG, PNG o HEIC convertida).")); return; }
      var rd = new FileReader(); rd.onerror = function () { ko(new Error("No se ha podido leer la imagen.")); };
      rd.onload = function () { var img = new Image(); img.onerror = function () { ko(new Error("Este navegador no puede abrir esa imagen.")); }; img.onload = function () {
        try { var lado = 160, cv = document.createElement("canvas"); cv.width = lado; cv.height = lado; var cx = cv.getContext("2d"), m = Math.min(img.width, img.height); cx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
          var q = 0.85, url = cv.toDataURL("image/jpeg", q); while (url.length > 19000 && q > 0.4) { q -= 0.1; url = cv.toDataURL("image/jpeg", q); } ok(url); } catch (e) { ko(new Error("No se ha podido reducir la imagen en este navegador.")); } }; img.src = rd.result; };
      rd.readAsDataURL(file);
    });
  }
  var cuentaPrev = H.vistas.cuenta;
  H.vistas.cuenta = function (p, q) {
    var u = S.usuario || {}, h = cuentaPrev(p, q);
    var foto = '<section class="tarjeta perfil"><div class="perfil-fila">' + H.avatarHTML(u, "grande") + '<div class="perfil-txt"><b>' + esc(u.nombre || u.email || "") + "</b><span>" + esc(H.nombreRol(u.rol)) + " · " + esc(u.email || "") + '</span><div class="fila-flex"><label class="bt" for="fotoPerfil">' + ico("camera") + (u.foto ? "Cambiar la foto" : "Añadir una foto") + '</label><input id="fotoPerfil" class="sr" type="file" accept="image/*" data-cambio="fotoPerfil">' + (u.foto ? '<button class="bt texto" data-act="quitarFotoPerfil">Quitar la foto</button>' : "") + '</div><p class="muy-tenue">Aparece arriba a la derecha, junto a tu nombre. Se guarda reducida (160 × 160 px).</p></div></div></section>';
    var i = h.indexOf('<section class="tarjeta"'); return i === -1 ? h : h.slice(0, i) + foto + h.slice(i);
  };
  function guardarFoto(url) {
    return H.api("webPerfilFoto", url).then(function (r) { S.usuario = Object.assign({}, S.usuario, { foto: (r && r.usuario && r.usuario.foto !== undefined) ? r.usuario.foto : url }); if (H.guardarSesion) H.guardarSesion(); H.pintarMarco(); H.repintar(); H.toast(url ? "Foto actualizada." : "Foto quitada."); })
      .catch(function (e) { H.toast(e.message || "No se ha podido guardar la foto.", "error"); });
  }
  H.acc.fotoPerfil = function (el) { var f = el.files && el.files[0]; if (!f) return; reducirFoto(f).then(guardarFoto).catch(function (e) { H.toast(e.message, "error"); }); };
  H.acc.quitarFotoPerfil = function () { guardarFoto(""); };
})();
