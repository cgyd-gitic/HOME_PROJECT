/* HOME v0.2 · pantalla de inicio, validación de registros, solicitudes de alta y reposición de material. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  H.fechaDMA = function (v) { var d = C.aFecha(v); return d ? dos(d.getDate()) + "/" + dos(d.getMonth() + 1) + "/" + d.getFullYear() : ""; };
  function hoy0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function diaLocal(v) { if (!v) return null; var s = String(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); } var d = C.aFecha(v); if (!d) return null; d = new Date(d.getTime()); d.setHours(0, 0, 0, 0); return d; }
  function diasHasta(v) { var d = diaLocal(v); return d ? Math.round((d - hoy0()) / 864e5) : null; }
  function cfgIni() { return S.cfg.inicio || C.DEF.inicio; }
  var NOMBRE_M = { ART: "Arterial", POR: "Portal", CAV: "Cava", PERF: "Perfusato", FLUJO: "Flujos", BILIS: "Bilis", HDF: "HDF", INMUNO: "Inmunología" };

  // ============================================================== utilidades de datos
  function tH(m) { var a = C.num(m.T_real_h); return a !== null ? a : (C.num(m.T_nominal_h) || 0); }
  // Último y penúltimo valor numérico de una variable
  H.ultimos2 = function (exp, muestra, v) {
    var l = H.med(exp).filter(function (m) { return m.Muestra === muestra && m.Variable === v && C.num(m.Valor) !== null; }).sort(function (a, b) { return tH(a) - tH(b); });
    return [l[l.length - 1] || null, l[l.length - 2] || null];
  };
  // Valores fuera de rango SOLO del último registro de cada muestra configurada
  H.alertasUltimoRegistro = function (exp) {
    var out = [];
    (cfgIni().alertas_muestras || []).forEach(function (mu) {
      var l = H.med(exp).filter(function (m) { return m.Muestra === mu && C.num(m.Valor) !== null; }); if (!l.length) return;
      var tmax = Math.max.apply(null, l.map(tH)), ult = l.filter(function (m) { return Math.abs(tH(m) - tmax) < 1e-6; });
      ult.forEach(function (m) {
        var ob = H.objetivo(mu, m.Variable); if (!ob) return; var e = C.enRango(m.Valor, ob); if (!e) return;
        var def = C.variable(mu, m.Variable) || {};
        out.push({ muestra: mu, punto: m.Punto, variable: m.Variable, nombre: def.nombre || m.Variable, unidad: def.unidad || "", valor: C.num(m.Valor), ob: ob, dir: e, fecha: m.Fecha_hora });
      });
    });
    return out;
  };
  function proximaPerfusion() {
    var man = cfgIni().proxima_perfusion, cand = H.listaExp().filter(function (e) { return ["Planificado", "Aclimatación", "Cirugía"].indexOf(e.Estado) !== -1 && e.Fecha_cirugia && diasHasta(e.Fecha_cirugia) >= 0; })
      .sort(function (a, b) { return diaLocal(a.Fecha_cirugia) - diaLocal(b.Fecha_cirugia); });
    if (man && diasHasta(man) !== null && diasHasta(man) >= 0) return { fecha: man, exp: cand.filter(function (e) { return diasHasta(e.Fecha_cirugia) === diasHasta(man); })[0] || null, manual: true };
    return cand.length ? { fecha: cand[0].Fecha_cirugia, exp: cand[0], manual: false } : null;
  }
  H.proximaPerfusion = proximaPerfusion;

  // ============================================================== INICIO
  H.vistas.inicio = function () {
    var exps = H.listaExp(), act = exps.filter(function (e) { return e.Estado === "Perfusión"; }).sort(function (a, b) { return String(b.Inicio_perfusion || "").localeCompare(String(a.Inicio_perfusion || "")); })[0];
    var qx = exps.filter(function (e) { return e.Estado === "Cirugía"; })[0];
    var html = "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Inicio</h1><span id=\"indDirecto\" class=\"muy-tenue\">En directo · se actualiza cada 20 s</span>" +
      (H.esAdmin() ? "<button class=\"bt pri\" data-act=\"nuevoExp\">" + ico("plus") + "Programar experimento</button>" : "") + "</div>";
    html += avisosRol() + (H.avisosInicioExtra ? H.avisosInicioExtra() : "");
    html += act ? (H.tarjetaPerfusion || tarjetaPerfusion)(act) : tarjetaSinPerfusion(qx);
    html += "<div class=\"columnas\" style=\"margin-top:14px\">" + tarjetaInventario() + tarjetaProximas() + "</div></div>";
    return html;
  };
  function avisosRol() {
    var h = "";
    if (H.esAdmin()) {
      var pv = H.pendientesValidacion(), acc = H.filas("Solicitudes_Acceso").filter(function (a) { return a.Estado === "Pendiente"; }).length;
      if (pv.length) { var porExp = {}; pv.forEach(function (x) { porExp[x.exp || "—"] = (porExp[x.exp || "—"] || 0) + 1; });
        h += "<div class=\"aviso aj\">" + ico("badge-check") + "<div><b>" + pv.length + " registro(s) pendientes de validación</b> · " + esc(Object.keys(porExp).map(function (k) { return k + " (" + porExp[k] + ")"; }).join(", ")) + ". <a href=\"#/validar\">Revisar y validar</a></div></div>"; }
      if (acc) h += "<div class=\"aviso info\">" + ico("user-plus") + "<div><b>" + acc + " solicitud(es) de alta</b> esperando permisos. <a href=\"#/config/accesos\">Revisar accesos</a></div></div>";
    } else if (H.rol() === "INVESTIGADOR") {
      var me = (S.usuario || {}).email, mias = H.pendientesValidacion().filter(function (x) { return String(x.f.Actualizado_por || "").toLowerCase() === String(me || "").toLowerCase(); }).length;
      if (mias) h += "<div class=\"aviso info\">" + ico("clock") + "<div><b>Tienes " + mias + " registro(s) pendientes de validación</b> por un administrador. En las hojas aparecen con un borde ámbar discontinuo.</div></div>";
    }
    return h;
  }
  function tarjetaSinPerfusion(qx) {
    var pp = proximaPerfusion(), d = pp ? diasHasta(pp.fecha) : null;
    return "<section class=\"tarjeta perf-vacia\" aria-label=\"Perfusión en curso\"><div class=\"cabecera\"><h2>Perfusión en curso</h2><span class=\"chip\">Sin perfusión</span></div>" +
      "<div class=\"vacio\">" + ico("calendar-days", "l") + "<p><b>No hay ninguna perfusión en curso.</b></p>" +
      (pp ? "<p class=\"proxima\">La próxima perfusión está programada para el <b>" + esc(H.fechaDMA(pp.fecha)) + "</b>" + (pp.exp ? " · " + esc(pp.exp.ID) : "") + (d === 0 ? " (hoy)" : d === 1 ? " (mañana)" : " (en " + d + " días)") + (pp.exp ? (pp.exp.Programacion === "Provisional" ? " · <span class=\"chip aj\">fecha provisional</span>" : " · <span class=\"chip ok\">confirmada</span>") : "") + ".</p>"
        : "<p class=\"proxima tenue\">La fecha de la próxima perfusión está pendiente de programar." + (H.esAdmin() ? " <a href=\"#/config/inicio\">Programar</a>" : "") + "</p>") +
      (qx ? "<p class=\"tenue\">" + esc(qx.ID) + " está en quirófano. <a href=\"#/exp/" + encodeURIComponent(qx.ID) + "/quirofano\">Abrir quirófano</a></p>" : "") + "</div></section>";
  }
  function tarjetaPerfusion(e) {
    var t0 = H.inicioPerf(e.ID), ev = H.eventos(e.ID), horas = t0 ? C.horasEntre(t0, new Date()) : null, prox = H.proximoPunto(e.ID), circ = !/no circadiano/i.test(e.Protocolo || ""), rv = C.ritmosVigentes(S.cfg.circadiano, new Date());
    var enRecal = t0 && !ev.fin_recalentamiento && (Date.now() - C.aFecha(t0).getTime()) / 6e4 < (S.cfg.recalentamiento.pasos.slice(-1)[0].t + S.cfg.recalentamiento.paso_min + 30);
    var al = H.alertasUltimoRegistro(e.ID);
    var alHTML = "<details class=\"alertas " + (al.length ? "hay" : "nada") + "\"" + (al.length && al.length <= 6 ? " open" : "") + "><summary>" + ico(al.length ? "triangle-alert" : "circle-check") +
      (al.length ? "<b>" + al.length + " valor(es) fuera de rango</b> en el último registro" : "Sin valores fuera de rango en el último registro") + "</summary>" +
      (al.length ? "<ul>" + al.map(function (a) { return "<li><span class=\"chip " + (a.dir < 0 ? "info" : "al") + "\">" + (a.dir < 0 ? "↓ bajo" : "↑ alto") + "</span> <b>" + esc(a.nombre) + "</b> " + esc(NOMBRE_M[a.muestra] || a.muestra) + " · " + esc(a.punto) + ": <b>" + esc(H.n(H.aVista(a.variable, a.valor), 2)) + "</b> " + esc(H.unidadVisible(a.variable, a.unidad)) + " <span class=\"muy-tenue\">(objetivo " + esc(H.n(H.aVista(a.variable, a.ob[0]), 2)) + "–" + esc(H.n(H.aVista(a.variable, a.ob[1]), 2)) + ")</span></li>"; }).join("") + "</ul>" +
        "<p class=\"muy-tenue\" style=\"margin:6px 0 0\">Rangos en <a href=\"#/config/objetivos\">Configuración → Objetivos</a>; muestras vigiladas en <a href=\"#/config/inicio\">Pantalla de inicio</a>.</p>" : "") + "</details>";
    var kp = (cfgIni().ultimos_valores || []).map(function (k) {
      var p = String(k).split(":"), mu = p[0], v = p[1], def = C.variable(mu, v); if (!def) return "";
      var uu = H.ultimos2(e.ID, mu, v), u = uu[0], a = uu[1], cl = u ? H.claseValor(mu, v, u.Valor) : "", dec = def.dec !== undefined ? def.dec : 1;
      var tend = "";
      if (u && a) { var dv = C.num(u.Valor) - C.num(a.Valor), fl = Math.abs(dv) < Math.pow(10, -dec) / 2 ? "=" : dv > 0 ? "↑" : "↓";
        tend = "<div class=\"tend\"><span class=\"flecha\" aria-label=\"" + (fl === "↑" ? "sube" : fl === "↓" ? "baja" : "sin cambio") + "\">" + fl + "</span> anterior " + esc(H.n(H.aVista(v, a.Valor), dec)) + " <span class=\"muy-tenue\">· " + esc(a.Punto) + "</span></div>"; }
      else if (u) tend = "<div class=\"tend muy-tenue\">Primer valor</div>";
      return "<div class=\"kpi " + (cl === "v-ok" ? "ok" : cl ? "al" : "") + "\"><div class=\"et\">" + esc(def.nombre) + " · " + esc(NOMBRE_M[mu] || mu) + (u ? " · " + esc(u.Punto) : "") + "</div><div class=\"v\">" +
        (u ? esc(H.n(H.aVista(v, u.Valor), dec)) + "<small>" + esc(H.unidadVisible(v, def.unidad)) + "</small>" : "—") + "</div>" + tend + "</div>";
    }).join("");
    var ritmos = Object.keys(rv.vigentes).sort(function (a, b) { return S.cfg.circadiano.lineas.indexOf(a) - S.cfg.circadiano.lineas.indexOf(b); }).map(function (k) { var c = rv.vigentes[k]; return "<span class=\"chip" + (C.num(c.valor) ? " pri" : "") + "\">" + esc(k) + " · " + H.n(c.valor, 1) + " " + esc(c.unidad) + "</span>"; }).join(" ");
    return "<section class=\"tarjeta perf-curso\" aria-label=\"Perfusión en curso " + esc(e.ID) + "\"><div class=\"cabecera\"><h2><span class=\"punto-color\" style=\"background:" + esc(H.colorExp(e.ID)) + "\"></span> " + esc(e.ID) + " · perfusión en curso</h2>" + H.estadoChip(e.Estado) +
      "<a class=\"bt\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/seguimiento\">" + ico("activity") + "Seguimiento</a>" + (enRecal ? "<a class=\"bt pri\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/quirofano\">" + ico("thermometer") + "Recalentamiento</a>" : "") + "</div>" +
      "<div class=\"cronos\"><div class=\"crono activo\"><div class=\"et\">Tiempo de perfusión · día " + (horas !== null ? Math.floor(horas / 24) + 1 : "—") + "</div><div class=\"t\" data-crono=\"" + esc(t0 || "") + "\">--:--:--</div><div class=\"muy-tenue\">Inicio " + esc(H.fechaHora(t0)) + "</div></div>" +
      (prox ? "<div class=\"crono\"><div class=\"et\">Próxima muestra · " + esc(prox.etiqueta) + "</div><div class=\"t cuenta-atras\" style=\"font-size:30px\" data-cuenta=\"" + prox.fecha.toISOString() + "\">--:--</div><div class=\"muy-tenue\">" + esc(H.diaCorto(prox.fecha) + " " + H.hora(prox.fecha)) + "</div></div>" : "<div class=\"crono\"><div class=\"et\">Próxima muestra</div><div class=\"t\" style=\"font-size:18px\">Sin muestras pendientes</div></div>") +
      (circ && rv.proxima_hora ? "<div class=\"crono\"><div class=\"et\">Próximo cambio de ritmo · " + esc(rv.proxima_hora) + "</div><div class=\"t\" style=\"font-size:15px;font-family:inherit;line-height:1.4\">" + rv.proximos.map(function (c) { return esc(c.linea) + " → <b>" + H.n(c.valor, 1) + " " + esc(c.unidad) + "</b>"; }).join("<br>") + "</div></div>" : "") + "</div>" +
      "<h3 class=\"sub\">Alertas</h3>" + alHTML +
      "<h3 class=\"sub\">Últimos valores <span class=\"muy-tenue\" style=\"font-weight:400\">· función y daño hepático; debajo, la tendencia respecto al valor anterior</span></h3><div class=\"kpis kpis-ini\">" + kp + "</div>" +
      (circ ? "<h3 class=\"sub\">Ritmos vigentes ahora (" + esc(H.hora(new Date())) + ") <span class=\"muy-tenue\" style=\"font-weight:400\">· según el protocolo de administración circadiana" + (S.cfg.circadiano.verificado ? "" : " (borrador)") + "</span></h3><div class=\"fila-flex\">" + ritmos + "</div>" : "") + "</section>";
  }
  function tarjetaInventario() {
    var bajo = H.stockBajo(), solP = H.filas("Solicitudes").filter(function (s) { return s.Estado === "Pendiente"; }), rp = H.esAdmin() ? infoReposicion() : null;
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Inventario</h2><a class=\"bt texto\" href=\"#/inventario\">Abrir" + ico("chevron-right", "s") + "</a></div>" +
      (bajo.length ? "<ul style=\"margin:0;padding-left:18px\">" + bajo.slice(0, 6).map(function (m) { return "<li><b>" + esc(m.Nombre) + "</b> · " + H.n(m._stock, 1) + " " + esc(m.Unidad || "") + " <span class=\"chip " + (m._stock <= 0 ? "al" : "aj") + "\">" + (m._stock <= 0 ? "Agotado" : "Bajo mínimo (" + H.n(m.Stock_minimo, 1) + ")") + "</span></li>"; }).join("") + "</ul>" + (bajo.length > 6 ? "<p class=\"muy-tenue\">y " + (bajo.length - 6) + " más</p>" : "") : "<p class=\"tenue\">" + ico("circle-check", "s") + " Ningún material por debajo del mínimo.</p>") +
      (rp && rp.proximo ? "<p class=\"tenue\" style=\"margin-top:8px\">" + ico("mail", "s") + " Próximo aviso de reposición: <b>" + esc(H.fechaDMA(rp.proximo.fecha)) + "</b> (" + esc(rp.proximo.texto) + ") · " + rp.lista.length + " material(es) a reponer ahora. <a href=\"#/config/reposicion\">Detalle</a></p>" : "") +
      (H.esAdmin() && solP.length ? "<div class=\"aviso info\" style=\"margin-top:10px\">" + ico("shopping-cart") + "<div>" + solP.length + " solicitud(es) de material pendientes. <a href=\"#/inventario/solicitudes\">Revisar</a></div></div>" : "") + "</section>";
  }
  function tarjetaProximas() {
    var l = H.listaExp().filter(function (e) { return ["Planificado", "Aclimatación", "Cirugía"].indexOf(e.Estado) !== -1; }).sort(function (a, b) { var x = diaLocal(a.Fecha_cirugia), y = diaLocal(b.Fecha_cirugia); return (x ? x.getTime() : 9e15) - (y ? y.getTime() : 9e15); });
    var man = cfgIni().proxima_perfusion, hayMan = man && diasHasta(man) >= 0 && !l.some(function (e) { return diasHasta(e.Fecha_cirugia) === diasHasta(man); });
    var filas = (hayMan ? "<tr><td class=\"tenue\">Programada</td><td>" + esc(H.fechaDMA(man)) + "</td><td class=\"num\">" + diasHasta(man) + "</td><td><span class=\"chip\">Sin experimento creado</span></td></tr>" : "") +
      l.map(function (e) { var d = diasHasta(e.Fecha_cirugia); return "<tr class=\"clic\" data-act=\"abrirExp\" data-id=\"" + esc(e.ID) + "\"><td><span class=\"punto-color\" style=\"background:" + esc(H.colorExp(e.ID)) + "\"></span> <a href=\"#/exp/" + encodeURIComponent(e.ID) + "\">" + esc(e.ID) + "</a></td><td>" + (e.Fecha_cirugia ? esc(H.fechaDMA(e.Fecha_cirugia)) : "<span class=\"muy-tenue\">sin fecha</span>") + "</td><td class=\"num\">" + (d === null ? "—" : d < 0 ? "<span class=\"chip aj\">pasada</span>" : d) + "</td><td>" + (e.Programacion === "Provisional" ? "<span class=\"chip aj\">Provisional</span>" : "<span class=\"chip ok\">Confirmado</span>") + " " + H.estadoChip(e.Estado) + "</td></tr>"; }).join("");
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Próximas perfusiones</h2><a class=\"bt texto\" href=\"#/calendario\">Calendario" + ico("chevron-right", "s") + "</a></div>" +
      (filas ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Experimento</th><th>Cirugía</th><th class=\"num\">Días</th><th>Estado</th></tr></thead><tbody>" + filas + "</tbody></table></div>" : "<p class=\"tenue\">No hay perfusiones programadas.</p>") +
      "<p class=\"muy-tenue\" style=\"margin-top:8px\">" + ico("calendar", "s") + " Hepatectomía y perfusión, trasplante y sacrificio de cada experimento están en el <a href=\"#/calendario\">calendario</a>.</p></section>";
  }

  // ============================================================== VALIDACIÓN
  H.pendientesValidacion = function () {
    var out = [];
    H.VALIDABLES.forEach(function (t) {
      if (t === "Mediciones") Object.keys(S.med || {}).forEach(function (e) { (S.med[e] || []).forEach(function (f) { if (H.pendiente(f)) out.push({ tabla: t, f: f, exp: f.Experimento }); }); });
      else (S.t[t] || []).forEach(function (f) { if (H.pendiente(f)) out.push({ tabla: t, f: f, exp: t === "Experimentos" ? f.ID : f.Experimento || "" }); });
    });
    return out;
  };
  function previo(f) { try { var p = f.Previo_JSON; if (!p) return {}; return typeof p === "string" ? JSON.parse(p) : p; } catch (e) { return {}; } }
  function tipoCambio(f) { var p = previo(f), k = Object.keys(p); if (H.esBorrado(f) && p.Borrado === false) return "borrado"; return k.length ? "modificado" : "nuevo"; }
  function describe(x) {
    var f = x.f, t = x.tabla;
    if (t === "Mediciones") { var def = C.variable(f.Muestra, f.Variable) || {}; return esc((NOMBRE_M[f.Muestra] || f.Muestra) + " · " + f.Punto + " · " + (def.nombre || f.Variable)) + " = <b>" + esc(f.Valor !== "" && f.Valor !== null && f.Valor !== undefined ? H.n(H.aVista(f.Variable, f.Valor), (def.dec || 1) + 1) : f.Texto || "") + "</b> " + esc(H.unidadVisible(f.Variable, def.unidad || f.Unidad || "")); }
    if (t === "Dieta") return esc("Dieta · " + (f.Animal || "") + " · " + H.fechaDMA(f.Fecha) + " " + (f.Toma || "")) + (f.Consumido_g !== undefined && f.Consumido_g !== "" ? " · consumido <b>" + esc(H.n(f.Consumido_g, 0)) + " g</b>" : "");
    if (t === "Formularios") return esc("Formulario «" + (f.Tipo || "") + "»" + (f.Animal ? " · " + f.Animal : ""));
    if (t === "Eventos") return esc("Evento «" + String(f.Tipo || "").replace(/_/g, " ") + "» · " + H.fechaHora(f.Fecha_hora)) + (f.Nota ? " · " + esc(String(f.Nota).slice(0, 80)) : "");
    if (t === "Animales") return esc("Animal " + f.ID + (f.Rol ? " (" + f.Rol + ")" : ""));
    return esc("Experimento " + f.ID);
  }
  function detalleCambio(x) {
    var p = previo(x.f), tc = tipoCambio(x.f);
    if (tc === "nuevo") return "<span class=\"chip info\">Nuevo</span>";
    if (tc === "borrado") return "<span class=\"chip al\">Borrado</span>";
    return "<span class=\"chip aj\">Modificado</span> " + Object.keys(p).slice(0, 4).map(function (k) { var ahora = x.f[k], antes = p[k]; if (/_JSON$/.test(k)) return "<span class=\"muy-tenue\">" + esc(k.replace(/_JSON$/, "")) + ": contenido cambiado</span>"; return "<span class=\"muy-tenue\">" + esc(k) + ":</span> <s>" + esc(String(antes === null || antes === undefined || antes === "" ? "vacío" : antes).slice(0, 30)) + "</s> → " + esc(String(ahora === null || ahora === undefined || ahora === "" ? "vacío" : ahora).slice(0, 30)); }).join(" · ");
  }
  H.vistas.validar = function (p, q) {
    if (!H.esAdmin()) return "<div class=\"ancho\"><div class=\"aviso al\">" + ico("circle-alert") + "<div>Solo los administradores validan registros.</div></div></div>";
    var todos = H.pendientesValidacion(), fe = q.exp || "", ft = q.tabla || "", l = todos.filter(function (x) { return (!fe || x.exp === fe) && (!ft || x.tabla === ft); });
    l.sort(function (a, b) { return String(a.exp).localeCompare(String(b.exp), "es", { numeric: true }) || H.VALIDABLES.indexOf(a.tabla) - H.VALIDABLES.indexOf(b.tabla) || String(a.f.Actualizado_en || "").localeCompare(String(b.f.Actualizado_en || "")); });
    var exps = {}; todos.forEach(function (x) { exps[x.exp || "—"] = (exps[x.exp || "—"] || 0) + 1; });
    var noCargados = H.listaExp().filter(function (e) { return !S.medCargada[e.ID] && !S.med[e.ID]; }).length;
    H._valLista = l;
    var html = "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Validar registros</h1><span class=\"chip " + (todos.length ? "aj" : "ok") + "\">" + todos.length + " pendiente(s)</span></div>" +
      "<p class=\"tenue\">Lo que registra un investigador queda pendiente hasta que un administrador lo valida. <b>Validar</b> lo da por bueno. <b>Rechazar</b> deshace el cambio: restaura el valor validado anterior o elimina el registro si era nuevo.</p>" +
      (noCargados ? "<div class=\"aviso info\">" + ico("info") + "<div>Las mediciones de " + noCargados + " experimento(s) antiguos no están cargadas en este dispositivo. <button class=\"bt texto\" data-act=\"valCargarTodo\">Cargarlas y revisar también</button></div></div>" : "") +
      "<div class=\"fila-flex\" style=\"margin-bottom:10px\"><div><label class=\"sr\" for=\"valExp\">Experimento</label><select id=\"valExp\" data-cambio=\"valFiltro\"><option value=\"\">Todos los experimentos</option>" + Object.keys(exps).sort().map(function (k) { return "<option value=\"" + esc(k === "—" ? "" : k) + "\"" + (k === fe ? " selected" : "") + ">" + esc(k) + " (" + exps[k] + ")</option>"; }).join("") + "</select></div>" +
      "<div><label class=\"sr\" for=\"valTab\">Tipo</label><select id=\"valTab\" data-cambio=\"valFiltro\"><option value=\"\">Todos los tipos</option>" + H.VALIDABLES.map(function (t) { return "<option" + (t === ft ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div><span class=\"empuja\"></span>" +
      "<button class=\"bt pri\" data-act=\"valValidar\"" + (l.length ? "" : " disabled") + ">" + ico("check") + "Validar seleccionados</button><button class=\"bt peligro\" data-act=\"valRechazar\"" + (l.length ? "" : " disabled") + ">" + ico("x") + "Rechazar seleccionados…</button></div>";
    if (!l.length) return html + "<div class=\"vacio\">" + ico("badge-check", "l") + "<p>No hay registros pendientes de validación" + (fe || ft ? " con estos filtros" : "") + ".</p></div></div>";
    html += "<div class=\"tabla-env\" style=\"max-height:70vh\"><table class=\"t\"><thead><tr><th style=\"width:36px\"><input type=\"checkbox\" id=\"valTodo\" aria-label=\"Seleccionar todo\" data-cambio=\"valTodo\" checked></th><th>Exp.</th><th>Registro</th><th>Cambio</th><th>Registrado por</th><th></th></tr></thead><tbody>" +
      l.slice(0, 1500).map(function (x, i) {
        return "<tr><td><input type=\"checkbox\" class=\"val-sel\" data-i=\"" + i + "\" aria-label=\"Seleccionar registro " + (i + 1) + "\" checked></td><td>" + esc(x.exp || "—") + "</td><td class=\"envolver\">" + describe(x) + "</td><td class=\"envolver\">" + detalleCambio(x) + "</td><td class=\"muy-tenue\">" + esc(x.f.Actualizado_por || "") + "<br>" + esc(H.fechaHora(x.f.Actualizado_en)) + "</td>" +
          "<td><div class=\"fila-flex\" style=\"flex-wrap:nowrap\"><button class=\"bt mini\" data-act=\"valUno\" data-i=\"" + i + "\" aria-label=\"Validar\">" + ico("check", "s") + "</button><button class=\"bt mini\" data-act=\"valUnoRech\" data-i=\"" + i + "\" aria-label=\"Rechazar\">" + ico("x", "s") + "</button></div></td></tr>";
      }).join("") + "</tbody></table></div>" + (l.length > 1500 ? "<p class=\"muy-tenue\">Se muestran 1500 de " + l.length + ". Valida por lotes y la lista se irá completando.</p>" : "") + "</div>";
    return html;
  };
  function seleccion() { var l = H._valLista || []; return H.$$(".val-sel").filter(function (c) { return c.checked; }).map(function (c) { return l[Number(c.getAttribute("data-i"))]; }).filter(Boolean); }
  function porTabla(items) { var o = {}; items.forEach(function (x) { (o[x.tabla] = o[x.tabla] || []).push(x); }); return o; }
  function aplicarValidar(items) {
    var yo = (S.usuario || {}).email, t = new Date().toISOString(), g = porTabla(items);
    Object.keys(g).forEach(function (tab) { g[tab].forEach(function (x) { x.f.Validado = true; x.f.Validado_por = yo; x.f.Validado_en = t; x.f.Previo_JSON = ""; });
      var ids = g[tab].map(function (x) { return x.f.ID; }); for (var i = 0; i < ids.length; i += 2000) H.encolar("webValidar", [tab, ids.slice(i, i + 2000)]); });
    H.toast(items.length + " registro(s) validados."); H.pintarMarco(); H.repintar();
  }
  function aplicarRechazar(items, nota) {
    var g = porTabla(items);
    Object.keys(g).forEach(function (tab) { g[tab].forEach(function (x) { var p = previo(x.f), k = Object.keys(p); if (k.length) k.forEach(function (c) { x.f[c] = p[c]; }); else x.f.Borrado = true; x.f.Validado = true; x.f.Previo_JSON = ""; });
      var ids = g[tab].map(function (x) { return x.f.ID; }); for (var i = 0; i < ids.length; i += 2000) H.encolar("webRechazar", [tab, ids.slice(i, i + 2000), nota || ""]); });
    H.toast(items.length + " registro(s) rechazados: se ha restaurado el valor anterior o eliminado el registro nuevo."); H.pintarMarco(); H.repintar();
  }
  function pedirNota(items) {
    H.modal({ titulo: "Rechazar " + items.length + " registro(s)", cuerpo: "<p class=\"tenue\">Se restaurará el valor validado anterior; los registros nuevos se eliminarán. La nota queda en la auditoría.</p><div class=\"campo\"><label class=\"et\" for=\"rjN\">Motivo (opcional)</label><textarea id=\"rjN\" rows=\"3\"></textarea></div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt peligro\" id=\"rjOk\">Rechazar</button>",
      alAbrir: function (d) { d.querySelector("#rjOk").addEventListener("click", function () { var n = d.querySelector("#rjN").value.trim(); d.close(); aplicarRechazar(items, n); }); } });
  }
  H.acc.valFiltro = function () { var e = H.$("#valExp").value, t = H.$("#valTab").value; H.ir("validar?" + (e ? "exp=" + encodeURIComponent(e) + "&" : "") + (t ? "tabla=" + encodeURIComponent(t) : "")); };
  H.acc.valTodo = function (el) { H.$$(".val-sel").forEach(function (c) { c.checked = el.checked; }); };
  H.acc.valValidar = function () { var s = seleccion(); if (!s.length) { H.toast("Selecciona al menos un registro.", "error"); return; } aplicarValidar(s); };
  H.acc.valRechazar = function () { var s = seleccion(); if (!s.length) { H.toast("Selecciona al menos un registro.", "error"); return; } pedirNota(s); };
  H.acc.valUno = function (el) { var x = (H._valLista || [])[Number(el.getAttribute("data-i"))]; if (x) aplicarValidar([x]); };
  H.acc.valUnoRech = function (el) { var x = (H._valLista || [])[Number(el.getAttribute("data-i"))]; if (x) pedirNota([x]); };
  H.acc.valCargarTodo = function () { H.asegurarMed(H.listaExp().map(function (e) { return e.ID; })).then(function () { H.repintar(); }); };

  // ============================================================== CONFIGURACIÓN · secciones nuevas
  H.seccionesExtra = H.seccionesExtra || {};
  // ---- Accesos (solicitudes de alta)
  H.seccionesExtra.accesos = function () {
    var l = H.filas("Solicitudes_Acceso").slice().sort(function (a, b) { return (a.Estado === "Pendiente" ? 0 : 1) - (b.Estado === "Pendiente" ? 0 : 1) || String(b.Fecha).localeCompare(String(a.Fecha)); });
    var pend = l.filter(function (a) { return a.Estado === "Pendiente"; }), res = l.filter(function (a) { return a.Estado !== "Pendiente"; });
    var html = "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Solicitudes de alta</h2><span class=\"chip " + (pend.length ? "aj" : "ok") + "\">" + pend.length + " pendiente(s)</span></div>" +
      "<p class=\"tenue\">Llegan desde «Solicitar alta» en la pantalla de acceso. Al aprobar, el usuario se crea con el rol elegido y recibe un correo de bienvenida con la dirección de la web. Al rechazar, recibe un correo con la nota.</p>";
    html += pend.length ? pend.map(function (a) {
      var id = esc(a.ID), rs = H.normRol(a.Rol_solicitado || "COLABORADOR");
      return "<div class=\"acceso-sol\"><div class=\"datos\"><b>" + esc((a.Nombre || "") + " " + (a.Apellidos || "")) + "</b> · <a href=\"mailto:" + esc(a.Email) + "\">" + esc(a.Email) + "</a><div class=\"tenue\">" + esc([a.Cargo, a.Institucion].filter(Boolean).join(" · ")) + " · solicita <b>" + esc(H.nombreRol(rs)) + "</b> · " + esc(H.fechaHora(a.Fecha)) + "</div>" + (a.Comentario ? "<div class=\"muy-tenue\">«" + esc(a.Comentario) + "»</div>" : "") + "</div>" +
        "<div class=\"rejilla tres\"><div class=\"campo\"><label class=\"et\" for=\"acR_" + id + "\">Rol</label><select id=\"acR_" + id + "\">" + H.ROLES.map(function (r) { return "<option value=\"" + r[0] + "\"" + (r[0] === rs ? " selected" : "") + ">" + esc(r[1]) + "</option>"; }).join("") + "</select></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"acN_" + id + "\">Nombre visible</label><input id=\"acN_" + id + "\" autocomplete=\"off\" value=\"" + esc(((a.Nombre || "") + " " + (a.Apellidos || "")).trim()) + "\"></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"acT_" + id + "\">Nota (opcional)</label><input id=\"acT_" + id + "\" autocomplete=\"off\"></div></div>" +
        "<div class=\"fila-flex\"><button class=\"bt pri\" data-act=\"accResolver\" data-id=\"" + id + "\" data-a=\"aprobar\">" + ico("user-check") + "Aprobar</button><button class=\"bt peligro\" data-act=\"accResolver\" data-id=\"" + id + "\" data-a=\"rechazar\">" + ico("x") + "Rechazar</button></div></div>";
    }).join("") : "<p class=\"tenue\">" + ico("circle-check", "s") + " No hay solicitudes pendientes.</p>";
    html += "</section>";
    if (res.length) html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>Resueltas</h3></div><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fecha</th><th>Nombre</th><th>Correo</th><th>Estado</th><th>Rol asignado</th><th>Resuelta por</th><th>Nota</th></tr></thead><tbody>" +
      res.map(function (a) { return "<tr><td>" + esc(H.fechaDMA(a.Fecha)) + "</td><td>" + esc((a.Nombre || "") + " " + (a.Apellidos || "")) + "</td><td>" + esc(a.Email) + "</td><td><span class=\"chip " + (a.Estado === "Aprobada" ? "ok" : "al") + "\">" + esc(a.Estado) + "</span></td><td>" + esc(a.Rol_asignado ? H.nombreRol(a.Rol_asignado) : "") + "</td><td class=\"muy-tenue\">" + esc(a.Resuelto_por || "") + " " + esc(H.fechaDMA(a.Resuelto_en)) + "</td><td class=\"envolver\">" + esc(a.Nota || "") + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    return html;
  };
  H.acc.accResolver = function (el) {
    var id = el.getAttribute("data-id"), acc = el.getAttribute("data-a"), g = function (p) { var x = document.getElementById(p + id); return x ? x.value.trim() : ""; };
    var o = { accion: acc, rol: g("acR_"), nombre: g("acN_"), nota: g("acT_") };
    H.confirmar(acc === "aprobar" ? "Aprobar alta" : "Rechazar solicitud", acc === "aprobar" ? "Se creará el usuario con el rol «" + H.nombreRol(o.rol) + "» y recibirá un correo de bienvenida." : "Se enviará un correo al solicitante" + (o.nota ? " con la nota." : "."), acc === "aprobar" ? "Aprobar" : "Rechazar", acc !== "aprobar").then(function (ok) {
      if (!ok) return; el.disabled = true;
      H.api("webResolverAcceso", id, o).then(function (r) {
        if (r && r.solicitud) H.upsertLocal("Solicitudes_Acceso", [r.solicitud]); if (r && r.usuario) H.upsertLocal("Usuarios", [r.usuario]);
        H.guardarCache(); H.toast(acc === "aprobar" ? "Alta aprobada." : "Solicitud rechazada."); H.pintarMarco(); H.repintar();
      }).catch(function (e) { el.disabled = false; H.toast(e.message || "No se ha podido resolver la solicitud.", "error"); });
    });
  };
  // ---- Pantalla de inicio
  var MUESTRAS_INI = ["PERF", "ART", "POR", "CAV", "BILIS", "FLUJO", "HDF", "INMUNO"];
  H.seccionesExtra.inicio = function () {
    var c = cfgIni(), sel = c.ultimos_valores || [], pp = proximaPerfusion();
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Próxima perfusión</h2></div><div class=\"rejilla dos\"><div class=\"campo\"><label class=\"et\" for=\"iniFecha\">Fecha programada (manual)</label><input id=\"iniFecha\" type=\"date\" value=\"" + esc(c.proxima_perfusion || "") + "\" data-cambio=\"iniFecha\"></div>" +
      "<div class=\"campo\"><span class=\"et\">Se muestra ahora</span><div style=\"padding-top:8px\">" + (pp ? "<b>" + esc(H.fechaDMA(pp.fecha)) + "</b> " + (pp.manual ? "(fecha manual)" : "(Fecha de cirugía de " + esc(pp.exp.ID) + ")") : "<span class=\"tenue\">Ninguna</span>") + "</div></div></div>" +
      "<p class=\"muy-tenue\">Si la dejas vacía se usa la fecha de cirugía más próxima de los experimentos planificados. Las fechas de cada experimento se programan en el <a href=\"#/calendario\">calendario</a>.</p></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Alertas de la perfusión en curso</h2></div><p class=\"tenue\">Se listan los valores fuera del rango objetivo del <b>último registro</b> de cada muestra marcada.</p><div class=\"fila-flex\">" +
      ["ART", "POR", "CAV", "PERF", "FLUJO", "BILIS", "HDF"].map(function (m) { return "<label class=\"check\"><input type=\"checkbox\" data-cambio=\"iniAlerta\" data-m=\"" + m + "\"" + ((c.alertas_muestras || []).indexOf(m) !== -1 ? " checked" : "") + "> " + esc(NOMBRE_M[m]) + "</label>"; }).join("") + "</div></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Últimos valores</h2><button class=\"bt\" data-act=\"iniRestaurar\">" + ico("undo-2") + "Valores por defecto</button></div><p class=\"tenue\">Orden actual: " + esc(sel.map(function (k) { var p = k.split(":"), d = C.variable(p[0], p[1]); return d ? d.nombre + " (" + (NOMBRE_M[p[0]] || p[0]) + ")" : k; }).join(" · ")) + ". Las variables nuevas se añaden al final.</p>" +
      MUESTRAS_INI.map(function (m) { var def = C.MUESTRAS[m]; if (!def) return ""; return "<details class=\"plegable\"" + (sel.some(function (k) { return k.indexOf(m + ":") === 0; }) ? " open" : "") + "><summary>" + esc(def.nombre || m) + "</summary><div class=\"dentro fila-flex\">" +
        def.vars.map(function (v) { var k = m + ":" + v.id; return "<label class=\"check\"><input type=\"checkbox\" data-cambio=\"iniVar\" data-k=\"" + esc(k) + "\"" + (sel.indexOf(k) !== -1 ? " checked" : "") + "> " + esc(v.nombre) + "</label>"; }).join("") + "</div></details>"; }).join("") + "</section>";
  };
  function guardarIni(c) { H.guardarCfg("inicio", c); }
  H.acc.iniFecha = function (el) { var c = H.copia(cfgIni()); c.proxima_perfusion = el.value || ""; guardarIni(c); H.repintar(); };
  H.acc.iniAlerta = function (el) { var c = H.copia(cfgIni()), m = el.getAttribute("data-m"), l = (c.alertas_muestras || []).filter(function (x) { return x !== m; }); if (el.checked) l.push(m); c.alertas_muestras = l; guardarIni(c); };
  H.acc.iniVar = function (el) { var c = H.copia(cfgIni()), k = el.getAttribute("data-k"), l = (c.ultimos_valores || []).filter(function (x) { return x !== k; }); if (el.checked) l.push(k); c.ultimos_valores = l; guardarIni(c); H.repintar(); };
  H.acc.iniRestaurar = function () { var c = H.copia(cfgIni()); c.ultimos_valores = C.DEF.inicio.ultimos_valores.slice(); c.alertas_muestras = C.DEF.inicio.alertas_muestras.slice(); guardarIni(c); H.repintar(); };

  // ---- Reposición de material
  function cfgRep() { return S.cfg.reposicion || C.DEF.reposicion; }
  function infoReposicion() {
    var c = cfgRep(), lista = C.reposicion(H.filas("Material"), H.stockDe), ev = [];
    H.listaExp().filter(function (e) { return e.Estado !== "Cancelado"; }).forEach(function (e) {
      var fq = diaLocal(e.Fecha_cirugia), ref = diaLocal(e.Fin_perfusion) || fq;
      if (fq) ev.push({ fecha: new Date(fq.getTime() - c.dias_antes * 864e5), exp: e.ID, tipo: "antes", texto: c.dias_antes + " días antes de " + e.ID + ", cirugía " + H.fechaDMA(fq) });
      if (ref) ev.push({ fecha: new Date(ref.getTime() + c.dias_despues * 864e5), exp: e.ID, tipo: "después", texto: c.dias_despues + " días después de " + e.ID });
    });
    var h = hoy0(), fut = ev.filter(function (x) { return x.fecha >= h; }).sort(function (a, b) { return a.fecha - b.fecha; });
    return { lista: lista, proximos: fut, proximo: fut[0] || null };
  }
  H.infoReposicion = infoReposicion;
  H.reposicionHTML = function () {
    if (!H.esAdmin()) return ""; var i = infoReposicion();
    return "<div class=\"aviso " + (i.lista.length ? "aj" : "info") + "\">" + ico("mail") + "<div><b>Reposición:</b> " + (i.lista.length ? i.lista.length + " material(es) por debajo de «mínimo + lo que usa una perfusión»" : "nada que reponer ahora") +
      (i.proximo ? ". Próximo aviso por correo (con PDF) el <b>" + esc(H.fechaDMA(i.proximo.fecha)) + "</b> (" + esc(i.proximo.texto) + ")" : "") + ". <a href=\"#/config/reposicion\">Ver lista y enviar</a></div></div>";
  };
  H.seccionesExtra.reposicion = function () {
    var c = cfgRep(), i = infoReposicion(), exps = H.listaExp().filter(function (e) { return e.Estado !== "Cancelado"; }), pp = proximaPerfusion();
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Aviso de reposición de material</h2></div><p class=\"tenue\">El servidor envía cada día, a la hora indicada, un correo con la lista de material a reponer (y el mismo contenido en PDF adjunto) " + c.dias_antes + " días antes de cada procedimiento y " + c.dias_despues + " días después de su final. También manda un aviso push a los administradores.</p>" +
      "<div class=\"rejilla tres\"><div class=\"campo\"><label class=\"et\" for=\"rpA\">Días antes de la cirugía</label><input id=\"rpA\" inputmode=\"numeric\" data-num=\"1\" value=\"" + esc(c.dias_antes) + "\" data-cambio=\"repCampo\" data-k=\"dias_antes\"></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"rpD\">Días después del final</label><input id=\"rpD\" inputmode=\"numeric\" data-num=\"1\" value=\"" + esc(c.dias_despues) + "\" data-cambio=\"repCampo\" data-k=\"dias_despues\"></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"rpH\">Hora del envío</label><input id=\"rpH\" type=\"time\" value=\"" + esc(c.hora) + "\" data-cambio=\"repCampo\" data-k=\"hora\"></div></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"rpM\">Destinatarios (correos separados por comas; vacío = todos los administradores)</label><input id=\"rpM\" type=\"text\" spellcheck=\"false\" autocomplete=\"off\" value=\"" + esc((c.destinatarios || []).join(", ")) + "\" data-cambio=\"repCampo\" data-k=\"destinatarios\"></div>" +
      "<p class=\"muy-tenue\">Fórmula (igual en la web y en el servidor): a reponer = máx(0, stock mínimo + cantidad por perfusión − stock actual).</p></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Próximos envíos</h2></div>" + (i.proximos.length ? "<ul style=\"margin:0;padding-left:18px\">" + i.proximos.slice(0, 8).map(function (x) { return "<li><b>" + esc(H.fechaDMA(x.fecha)) + "</b> · " + esc(x.texto) + "</li>"; }).join("") + "</ul>" : "<p class=\"tenue\">No hay procedimientos con fecha.</p>") + "</section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Lista actual a reponer</h2><span class=\"chip " + (i.lista.length ? "aj" : "ok") + "\">" + i.lista.length + "</span></div>" +
      (i.lista.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Material</th><th>Categoría</th><th class=\"num\">Stock</th><th class=\"num\">Mínimo</th><th class=\"num\">Por perfusión</th><th class=\"num\">A reponer</th><th>Unidad</th><th>Referencia</th><th>Proveedor</th></tr></thead><tbody>" +
        i.lista.map(function (m) { return "<tr><td><b>" + esc(m.Nombre) + "</b></td><td>" + esc(m.Categoria) + "</td><td class=\"num\">" + H.n(m.stock, 1) + "</td><td class=\"num\">" + H.n(m.minimo, 1) + "</td><td class=\"num\">" + H.n(m.por_perfusion, 1) + "</td><td class=\"num\"><b>" + H.n(m.a_reponer, 1) + "</b></td><td>" + esc(m.Unidad) + "</td><td class=\"muy-tenue\">" + esc(m.Referencia) + "</td><td class=\"muy-tenue\">" + esc(m.Proveedor) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "<p class=\"tenue\">" + ico("circle-check", "s") + " Nada que reponer.</p>") +
      "<div class=\"fila-flex\" style=\"margin-top:10px\"><label class=\"sr\" for=\"rpE\">Experimento</label><select id=\"rpE\">" + exps.map(function (e) { return "<option" + (pp && pp.exp && pp.exp.ID === e.ID ? " selected" : "") + ">" + esc(e.ID) + "</option>"; }).join("") + "</select>" +
      "<button class=\"bt pri\" data-act=\"repEnviar\"" + (exps.length ? "" : " disabled") + ">" + ico("send") + "Enviar el correo ahora</button><span class=\"muy-tenue\">El asunto indica si es antes o después del procedimiento según su fecha.</span></div></section>";
  };
  H.acc.repCampo = function (el) {
    var c = H.copia(cfgRep()), k = el.getAttribute("data-k"), v = el.value;
    if (k === "destinatarios") c[k] = v.split(/[,;\s]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); });
    else if (k === "hora") c[k] = /^\d{2}:\d{2}$/.test(v) ? v : c[k]; else { var n = C.num(v); if (n === null || n < 0 || n > 90) { H.toast("Indica un número de días entre 0 y 90.", "error"); return; } c[k] = Math.round(n); }
    H.guardarCfg("reposicion", c);
  };
  H.acc.repEnviar = function (el) {
    var exp = H.$("#rpE").value; el.disabled = true;
    H.api("webEnviarReposicion", exp).then(function (r) { el.disabled = false; H.toast("Correo de reposición enviado (" + (r && r.n !== undefined ? r.n + " material(es)" : "") + (r && r.destinatarios ? " · " + [].concat(r.destinatarios).length + " destinatario(s)" : "") + ")."); })
      .catch(function (e) { el.disabled = false; H.toast(e.message || "No se ha podido enviar.", "error"); });
  };
})();
