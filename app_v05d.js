/* HOME v0.5 (D) · flujo del procedimiento: el registro se abre el día que toca y los formularios salen en orden (hoja de ruta),
   cronómetro de quirófano con acceso rápido, recalentamiento con confirmación de cada paso y fin automático, seguimiento en
   Preperfusión / Perfusión / Post-trasplante, tabla de infusiones confirmada, recomendaciones de la HDF y cierre. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function cfgP() { return S.cfg.programacion || C.DEF.programacion; }
  function cfgH() { return S.cfg.hdf || C.DEF.hdf; }
  function hoyISO() { return C.diaISO(new Date()); }
  function dma(v) { var d = C.aDia(v); return d ? H.fechaDMA(d).replace(/\//g, ".") : ""; }
  function idq(e) { return encodeURIComponent(e.ID); }
  function tx(e) { return C.tipoProc(e) === "trasplante"; }
  function seg(base, lista, act, extraCls) { return '<div class="segmentado' + (extraCls ? " " + extraCls : "") + '" role="tablist">' + lista.map(function (x) { return '<button role="tab" aria-selected="' + (x[0] === act) + '" class="' + (x[0] === act ? "activo" : "") + '" data-act="irSub" data-r="' + base + "/" + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>"; }

  // ============================================================== ¿qué partes del registro están abiertas?
  S.desbloqueo = S.desbloqueo || {};
  function llegadaDe(e) { return e.Fecha_llegada ? C.diaISO(C.aDia(e.Fecha_llegada)) : (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -cfgP().dias_llegada_antes) : ""); }
  function faseRegistro(e) {
    if (H.expIniciado(e) || ["Cirugía", "Perfusión", "Finalizado"].indexOf(e.Estado) !== -1) return "dia";
    var hoy = hoyISO(); if (e.Fecha_cirugia && C.diasEntre(e.Fecha_cirugia, hoy) >= 0) return "dia";
    var ll = llegadaDe(e); if (e.Estado === "Aclimatación" || (ll && C.diasEntre(ll, hoy) >= 0)) return "aclim"; return "antes";
  }
  H.faseRegistro = faseRegistro;
  var REQ = { dieta: "aclim", preparacion: "aclim", cirugia: "dia", quirofano: "dia", seguimiento: "dia", cierre: "dia" }, ORDEN = { antes: 0, aclim: 1, dia: 2 };
  function abierta(e, tab) { var r = REQ[tab]; if (!r || S.desbloqueo[e.ID]) return true; return ORDEN[faseRegistro(e)] >= ORDEN[r]; }
  var PEST = [["resumen", "Resumen", "layers"], ["dieta", "Dieta", "utensils"], ["preparacion", "Preparación", "clipboard-check"], ["cirugia", "Cirugía", "scissors"], ["quirofano", "Quirófano y recalentamiento", "timer"], ["seguimiento", "Seguimiento", "activity"], ["cierre", "Cierre", "circle-check"]];
  H.vistas.exp = function (p, q) {
    var id = p[0], tab = p[1] || "resumen", e = H.exp(id);
    if (!e) return '<div class="vacio">No existe el experimento «' + esc(id) + '». <a href="#/experimentos">Volver al listado</a></div>';
    var cargando = !S.medCargada[id] && S.token && S.online; if (cargando) H.asegurarMed([id]).then(function (x) { if (x) H.repintar(); }).catch(function () { });
    H.ticVista = null; H.pantallaEncendida(false);
    if (!PEST.some(function (t) { return t[0] === tab; })) tab = "resumen";
    var cuerpo = abierta(e, tab) ? (H.tabsExp[tab] || H.tabsExp.resumen)(e, p.slice(2), q) : bloqueado(e, tab);
    var puedo = H.puede("registrar"), estados = ["Planificado", "Aclimatación", "Cirugía", "Perfusión", "Finalizado", "Cancelado"];
    var ruta = faseRegistro(e) === "dia" && !H.expFinalizado(e) && tab !== "resumen" ? H.hojaRutaHTML(e, tab, p.slice(2)) : "";
    return '<div class="ancho"><div class="miga"><a href="#/experimentos">Experimentos</a> / ' + esc(id) + "</div>" +
      '<div class="titulo-pag exp-tit"><h1><span class="punto-color grande" style="background:' + esc(H.colorExp(id)) + '"></span>' + esc(id) + '</h1><div class="exp-sub"><span class="chip">' + esc(e.Codigo_PM || "—") + '</span><span class="chip">' + esc(C.nombreTipo(e)) + '</span><span class="chip">Protocolo ' + esc(H.versionExp(e)) + "</span></div>" +
      '<span class="empuja"></span>' + (puedo ? '<label class="sr" for="selEstado">Estado</label><select id="selEstado" class="sel-estado" data-cambio="estadoExp" data-id="' + esc(id) + '">' + estados.map(function (s) { return "<option" + (s === e.Estado ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" : H.estadoChip(e.Estado)) + (cargando ? '<span class="chip">Cargando…</span>' : "") + "</div>" +
      '<nav class="pestanas" aria-label="Secciones del experimento">' + PEST.map(function (t) { var ab = abierta(e, t[0]); return '<a href="#/exp/' + encodeURIComponent(id) + "/" + t[0] + '" class="' + (t[0] === tab ? "activo" : "") + (ab ? "" : " cerrada") + '"' + (t[0] === tab ? ' aria-current="page"' : "") + (ab ? "" : ' title="Se abre ' + (REQ[t[0]] === "aclim" ? "con la llegada de los animales" : "el día de la cirugía") + '"') + ">" + ico(ab ? t[2] : "lock", "s") + t[1] + "</a>"; }).join("") + "</nav>" + ruta + cuerpo + "</div>";
  };
  function bloqueado(e, tab) {
    var cuando = REQ[tab] === "aclim" ? "con la llegada de los animales" + (llegadaDe(e) ? " (" + dma(llegadaDe(e)) + ")" : "") : "el día de la cirugía" + (e.Fecha_cirugia ? " (" + dma(e.Fecha_cirugia) + ")" : "");
    return '<div class="estado-exp">' + ico("lock", "l") + "<p><b>Este registro se abre " + esc(cuando) + ".</b> Así los formularios aparecen en el orden del procedimiento: dieta durante la aclimatación y, el día de la cirugía, cirugía, quirófano y seguimiento.</p>" +
      (H.esAdmin() ? '<button class="bt" data-act="desbloquear" data-id="' + esc(e.ID) + '">' + ico("lock-open") + "Abrir el registro igualmente</button>" : "") + "</div>";
  }
  H.acc.desbloquear = function (el) { S.desbloqueo[el.getAttribute("data-id")] = true; H.repintar(); };

  // ============================================================== hoja de ruta del día de la cirugía (formularios en orden)
  function hayMed(e, m) { return H.med(e.ID).some(function (x) { return x.Muestra === m && C.num(x.Valor) !== null; }); }
  H.pasosDia = function (e) {
    var an = H.animales(e.ID), ev = H.eventos(e.ID), id = idq(e), ld = an.LD ? H.form(e.ID, "cirugia", an.LD.ID) : {}, bd = an.BD ? H.form(e.ID, "cirugia", an.BD.ID) : {}, chk = H.form(e.ID, "checklist", "") || {};
    var obj = C.num(S.cfg.general.volumen_sangre_mL) || 2200, vLD = C.num(H.leerRuta(ld, "ext.volumen_mL")) || 0, vBD = C.num(H.leerRuta(bd, "ext.volumen_mL")) || 0, t0 = H.inicioPerf(e.ID);
    var reg = t0 && H.med(e.ID).some(function (x) { return /^(ART|PERF|FLUJO)$/.test(x.Muestra) && C.num(x.Valor) !== null; });
    return [
      { k: "protocolo", n: "Tabla de infusiones", d: "Confirmar los productos del protocolo " + H.versionExp(e), ok: H.protocoloConfirmado(e), href: "#/exp/" + id + "/seguimiento/pre/protocolo" },
      { k: "material", n: "Material", d: "Checklist revisado", ok: !!(chk.confirmado_en || chk.revisado_en), href: "#/exp/" + id + "/preparacion" },
      { k: "ld", n: "Donante de hígado", d: "Premedicación e intubación", ok: !!H.leerRuta(ld, "qx.intubacion"), href: "#/exp/" + id + "/cirugia/LD" },
      { k: "basal", n: "Muestra basal", d: "Antes de empezar la cirugía", ok: hayMed(e, "BASAL_LD"), href: "#/exp/" + id + "/seguimiento/pre/gas" },
      { k: "bd", n: "Donante de sangre", d: vLD >= obj ? "No hace falta (" + H.n(vLD, 0) + " mL)" : "Si no se llega a " + H.n(obj, 0) + " mL", ok: vLD + vBD >= obj, opcional: vLD >= obj, href: "#/exp/" + id + "/cirugia/BD" },
      { k: "pre", n: "Pre-perfusión", d: "HDF conectada y muestra del perfusato", ok: hayMed(e, "PRE"), href: "#/exp/" + id + "/seguimiento/pre/gas" },
      { k: "qx", n: "Quirófano", d: "Exanguinación → inicio de la perfusión", ok: !!ev.inicio_perfusion, href: "#/exp/" + id + "/quirofano" },
      { k: "recal", n: "Recalentamiento", d: "Se cierra solo al acabar la tabla", ok: !!ev.fin_recalentamiento, href: "#/exp/" + id + "/quirofano" },
      { k: "reg", n: "Registro de la perfusión", d: "Primeras muestras", ok: !!reg, href: "#/exp/" + id + "/seguimiento/perf/registrar" }];
  };
  H.hojaRutaHTML = function (e, tab) {
    var pasos = H.pasosDia(e), sig = pasos.filter(function (x) { return !x.ok; })[0]; if (!sig) return "";
    return '<nav class="hoja-ruta" aria-label="Orden del procedimiento"><span class="hr-tit">' + ico("route", "s") + "Hoy, en orden</span><ol>" + pasos.map(function (x, i) {
      return '<li class="' + (x.ok ? "hecho" : x === sig ? "siguiente" : "") + (x.opcional && !x.ok ? " opcional" : "") + '"><a href="' + x.href + '"><span class="n">' + (x.ok ? ico("check", "s") : i + 1) + '</span><span class="tx"><b>' + esc(x.n) + "</b><span>" + esc(x.d) + "</span></span></a></li>";
    }).join("") + "</ol></nav>";
  };

  // ============================================================== acceso rápido al cronómetro y fin automático del recalentamiento
  function expQuirofano() {
    var hoy = hoyISO(); return H.listaExp().filter(function (e) { var ev = H.eventos(e.ID); if (H.expFinalizado(e) || e.Estado === "Cancelado") return false; return e.Estado === "Cirugía" || (e.Fecha_cirugia && C.diaISO(C.aDia(e.Fecha_cirugia)) === hoy && !ev.fin_recalentamiento) || (ev.inicio_perfusion && !ev.fin_recalentamiento); })[0] || null;
  }
  var cabPrev = H.pintarCabecera;
  H.pintarCabecera = function (r) {
    if (cabPrev) cabPrev(r);
    var f = H.$("#fabCrono"), e = H.puede("registrar") ? expQuirofano() : null, aqui = e && r.partes[0] === "exp" && r.partes[1] === e.ID && r.partes[2] === "quirofano";
    if (!e || aqui) { if (f) f.remove(); return; }
    var ev = H.eventos(e.ID), ult = ["inicio_perfusion", "fin_banco", "inicio_banco", "inicio_preservacion_fria", "parada_cardiaca", "inicio_exanguinacion"].filter(function (k) { return ev[k]; })[0];
    var html = '<a id="fabCrono" class="fab-crono" href="#/exp/' + idq(e) + '/quirofano" aria-label="Cronómetro de quirófano de ' + esc(e.ID) + '">' + ico("timer") + '<span class="fab-tx"><b>' + (ult ? H.nombreEvento(ult) : "Cronómetro de quirófano") + "</b>" + (ult ? '<span data-crono="' + esc(ev[ult]) + '">--:--:--</span>' : "<span>" + esc(e.ID) + "</span>") + "</span></a>";
    if (f) f.outerHTML = html; else document.body.insertAdjacentHTML("beforeend", html);
  };
  var revPrev = H.revisarAlarmas, ultAuto = 0;
  H.revisarAlarmas = function (ahora) { revPrev(ahora); if (ahora - ultAuto > 30000) { ultAuto = ahora; try { finRecalAuto(ahora); } catch (e) { } } };
  function finRecalAuto(ahora) {
    if (!S.usuario || !H.puede("registrar")) return;
    H.listaExp().forEach(function (e) { var ev = H.eventos(e.ID); if (!ev.inicio_perfusion || ev.fin_recalentamiento) return; var fin = C.finRecalentamiento(ev.inicio_perfusion, S.cfg.recalentamiento); if (!fin || fin.getTime() > ahora) return;
      H.guardar("Eventos", [{ ID: e.ID + "|evento|fin_recalentamiento", Experimento: e.ID, Tipo: "fin_recalentamiento", Fecha_hora: fin.toISOString(), Nota: "Registrado automáticamente según la tabla de recalentamiento" }], { sinRepintar: true });
      H.cancelarAvisos(e.ID, ["recalentamiento"]); H.toast(e.ID + ": fin del recalentamiento registrado (" + H.hora(fin) + ")."); H.repintarPronto(); });
  }
  H.finRecalAuto = finRecalAuto;

  // ============================================================== QUIRÓFANO: cronómetro guiado y recalentamiento
  var EVQ = [["inicio_exanguinacion", "Inicio de la exanguinación"], ["parada_cardiaca", "Parada cardíaca"], ["inicio_preservacion_fria", "Inicio de la preservación en frío"], ["inicio_banco", "Inicio de la cirugía de banco"], ["fin_banco", "Fin de la cirugía de banco"], ["inicio_perfusion", "Inicio de la perfusión"]];
  H.tabsExp.quirofano = function (e) {
    var ev = H.eventos(e.ID), puedo = H.puede("registrar"), sig = EVQ.filter(function (x) { return !ev[x[0]]; })[0], ult = EVQ.filter(function (x) { return ev[x[0]]; }).slice(-1)[0], t = C.tiempos(ev);
    if (!ev.inicio_perfusion || !ev.fin_recalentamiento) H.pantallaEncendida(true);
    var principal;
    if (!ult) principal = '<div class="crono-heroe espera"><div class="ch-et">Cronómetro de quirófano</div><div class="ch-t">00:00:00</div><p>Pulsa cuando empiece la exanguinación. Después el cronómetro te irá pidiendo cada paso.</p>' + (puedo ? '<button class="bt pri grande" data-act="evQx" data-exp="' + esc(e.ID) + '" data-t="inicio_exanguinacion">' + ico("play") + "Inicio de la exanguinación</button>" : "") + "</div>";
    else if (!ev.inicio_perfusion) principal = '<div class="crono-heroe"><div class="ch-et">Desde «' + esc(ult[1]) + '»</div><div class="ch-t" data-crono="' + esc(ev[ult[0]]) + '">--:--:--</div>' +
      '<div class="ch-sec"><div><span>Isquemia caliente</span><b' + (ev.inicio_exanguinacion ? ' data-crono="' + esc(ev.inicio_exanguinacion) + '"' + (ev.inicio_preservacion_fria ? ' data-hasta="' + esc(ev.inicio_preservacion_fria) + '"' : "") : "") + ">--:--:--</b></div><div><span>Isquemia fría</span><b" + (ev.inicio_preservacion_fria ? ' data-crono="' + esc(ev.inicio_preservacion_fria) + '"' : "") + ">--:--:--</b></div></div>" +
      (sig && puedo ? '<button class="bt pri grande" data-act="evQx" data-exp="' + esc(e.ID) + '" data-t="' + sig[0] + '">' + ico("circle-check") + "Registrar ahora: " + esc(sig[1]) + "</button>" : "") + "</div>";
    else principal = '<div class="crono-heroe perf"><div class="ch-et">Perfusión en curso</div><div class="ch-t" data-crono="' + esc(ev.inicio_perfusion) + '"' + (ev.fin_perfusion ? ' data-hasta="' + esc(ev.fin_perfusion) + '"' : "") + '>--:--:--</div><div class="ch-sec"><div><span>Isquemia caliente</span><b>' + C.duracionTxt(t.isquemia_caliente_min) + "</b></div><div><span>Isquemia fría</span><b>" + C.duracionTxt(t.isquemia_fria_min) + "</b></div><div><span>Cirugía de banco</span><b>" + C.duracionTxt(t.cirugia_banco_min) + "</b></div></div></div>";
    var linea = '<ol class="linea-qx">' + EVQ.concat([["fin_recalentamiento", "Fin del recalentamiento"]]).map(function (x) {
      var h = ev[x[0]], auto = x[0] === "fin_recalentamiento", fin = auto && ev.inicio_perfusion && !h ? C.finRecalentamiento(ev.inicio_perfusion, S.cfg.recalentamiento) : null;
      return '<li class="' + (h ? "hecho" : sig && sig[0] === x[0] ? "siguiente" : "") + '"><span class="pt"></span><span class="tx"><b>' + esc(x[1]) + "</b>" + (h ? '<time>' + esc(H.diaCorto(h) + " " + H.horaS(h)) + "</time>" : auto ? '<span class="muy-tenue">' + (fin ? "Automático a las " + esc(H.hora(fin)) + " (según la tabla)" : "Automático al acabar la tabla") + "</span>" : '<span class="muy-tenue">pendiente</span>') + "</span>" +
        (puedo && !auto && (h || (sig && sig[0] === x[0])) ? '<button class="bt mini" data-act="evQx" data-exp="' + esc(e.ID) + '" data-t="' + x[0] + '">' + (h ? "Corregir" : "Ahora") + "</button>" : "") + "</li>";
    }).join("") + "</ol>";
    return '<section class="tarjeta"><div class="cabecera"><h2>Cronómetro de quirófano</h2><span class="muy-tenue">Pulsa cada paso en el momento en que ocurre; para corregir una hora, pulsa «Corregir».</span></div><div class="qx-grid">' + principal + linea + "</div></section>" + recalentamiento(e, ev);
  };
  function recalentamiento(e, ev) {
    var cfg = S.cfg.recalentamiento, t0 = ev.inicio_perfusion, ps = t0 ? C.pasoRecalentamiento(t0, Date.now(), cfg) : null, puedo = H.puede("registrar"), cols = ["Temp", "P_VP", "P_AH", "FiO2_ART", "Barrido_ART", "FiO2_POR", "Barrido_POR"];
    var activo = ps && !ev.fin_recalentamiento && !ps.terminado;
    if (activo) { H._pasoRecal = ps.indice; H.ticVista = function (ahora) { var x = C.pasoRecalentamiento(t0, ahora, cfg); if (x.indice !== H._pasoRecal || x.terminado) { H._pasoRecal = x.indice; H.repintarPronto(); } }; }
    var cab = '<section class="tarjeta"><div class="cabecera"><h2>Recalentamiento</h2><span class="muy-tenue">' + cfg.pasos.length + " pasos de " + cfg.paso_min + " min · " + cfg.pasos[0].Temp + " → " + cfg.pasos[cfg.pasos.length - 1].Temp + ' °C</span><label class="check"><input type="checkbox" data-cambio="prefSonido"' + (H.pref("sinSonido") ? "" : " checked") + "> Sonido</label></div>";
    function conf(i) { return H.valor(e.ID, "RECAL", "R" + cfg.pasos[i].t, "Temp"); }
    var panel = "";
    if (!t0) panel = '<p class="tenue">Empieza solo al registrar el «Inicio de la perfusión». En cada cambio de paso suena un aviso y aquí aparece un botón para confirmar que se ha aplicado.</p>';
    else if (activo) {
      var act = ps.actual, sigP = ps.siguiente, c = conf(ps.indice), fin = C.finRecalentamiento(t0, cfg);
      panel = '<div class="recal-actual"><div class="ra-paso"><span class="et">Paso ' + (ps.indice + 1) + " de " + cfg.pasos.length + '</span><b class="ra-temp">' + act.Temp + ' °C</b><span class="muy-tenue">' + (sigP ? "Siguiente cambio en" : "Fin del recalentamiento en") + ' <b data-cuenta="' + new Date(C.aFecha(t0).getTime() + (sigP ? sigP.t : ps.fin_min) * 6e4).toISOString() + '">--:--</b></span></div>' +
        '<div class="ra-valores">' + cols.map(function (k) { return '<div><span>' + esc(C.NOMBRES_RECAL[k]) + "</span><b>" + H.n(act[k], 0) + " <small>" + esc(C.UNIDAD_RECAL[k]) + "</small></b></div>"; }).join("") + "</div>" +
        '<div class="ra-conf">' + (c ? '<div class="aviso ok">' + ico("circle-check") + "<div>Paso " + (ps.indice + 1) + " confirmado" + (c.Fecha_hora ? " a las " + esc(H.hora(c.Fecha_hora)) : "") + " · temperatura real " + H.n(c.Valor, 0) + " °C.</div></div>"
          : puedo ? '<div class="ra-check"><label for="trReal' + ps.indice + '">Temperatura real</label><div class="unidad-in"><input id="trReal' + ps.indice + '" inputmode="numeric" value="' + act.Temp + '"><span>°C</span></div><button class="bt pri grande" data-act="confRecal" data-exp="' + esc(e.ID) + '" data-i="' + ps.indice + '">' + ico("check") + "Paso " + (ps.indice + 1) + " aplicado</button></div><p class=\"muy-tenue\">Las presiones y los mezcladores se ajustan exactamente a la tabla; solo la temperatura puede diferir. Valores enteros.</p>" : "") + "</div>" +
        '<p class="muy-tenue">El fin del recalentamiento se registrará solo a las <b>' + esc(H.hora(fin)) + "</b>, según la tabla.</p></div>";
    } else panel = '<div class="aviso ok">' + ico("circle-check") + "<div>Recalentamiento completado" + (ev.fin_recalentamiento ? " a las " + esc(H.hora(ev.fin_recalentamiento)) : "") + '. Continúa en <a href="#/exp/' + idq(e) + '/seguimiento/perf/registrar">Seguimiento</a>.</div></div>';
    var tabla = '<div class="tabla-env"><table class="t tabla-recal"><thead><tr><th>Paso</th><th>Hora</th>' + cols.map(function (k) { return '<th class="num">' + esc(C.NOMBRES_RECAL[k]) + '<div class="muy-tenue">' + esc(C.UNIDAD_RECAL[k]) + "</div></th>"; }).join("") + "<th>Confirmado</th></tr></thead><tbody>" +
      cfg.pasos.map(function (p, i) {
        var prev = i ? cfg.pasos[i - 1] : null, cl = ps ? (i === ps.indice && !ps.terminado ? "actual" : i < ps.indice || ps.terminado ? "pasado" : "") : "", h = t0 ? new Date(C.aFecha(t0).getTime() + p.t * 6e4) : null, c = conf(i);
        return '<tr class="' + cl + '"><td>' + (i + 1) + ' <span class="muy-tenue">' + p.t + "′</span></td><td>" + (h ? esc(H.hora(h)) : "") + "</td>" + cols.map(function (k) { return '<td class="num">' + (prev && prev[k] !== p[k] ? '<span class="cambia">' + H.n(p[k], 0) + "</span>" : H.n(p[k], 0)) + "</td>"; }).join("") +
          "<td>" + (c ? '<span class="chip ok">' + ico("check", "s") + H.n(c.Valor, 0) + " °C</span>" : t0 && puedo && (i < ps.indice || ps.terminado) ? '<span class="con-ahora"><input id="trReal' + i + '" inputmode="numeric" value="' + p.Temp + '" aria-label="Temperatura real paso ' + (i + 1) + '"><button class="bt mini" data-act="confRecal" data-exp="' + esc(e.ID) + '" data-i="' + i + '">' + ico("check", "s") + "</button></span>" : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    return cab + panel + tabla + "</section>";
  }
  H.acc.confRecal = function (el) {
    var exp = el.getAttribute("data-exp"), i = +el.getAttribute("data-i"), cfg = S.cfg.recalentamiento, p = cfg.pasos[i], inp = H.$("#trReal" + i), T = inp ? Math.round(C.num(String(inp.value).replace(",", ".")) || p.Temp) : p.Temp, t0 = H.inicioPerf(exp);
    var o = { Temp: T, P_VP: p.P_VP, P_AH: p.P_AH, FiO2_ART: p.FiO2_ART, Barrido_ART: p.Barrido_ART, FiO2_POR: p.FiO2_POR, Barrido_POR: p.Barrido_POR };
    H.guardarMediciones(exp, "RECAL", "R" + p.t, C.r(p.t / 60, 3), new Date().toISOString(), o); H.toast("Paso " + (i + 1) + " confirmado (" + T + " °C)."); H.repintarPronto();
  };

  // ============================================================== SEGUIMIENTO: Preperfusión · Perfusión · Post-trasplante
  var segOrig = H.tabsExp.seguimiento;
  var SUB_PRE = [["protocolo", "Tabla de infusiones"], ["calculos", "Cálculos del perfusato"], ["gas", "Gasometría"], ["bq", "Bioquímica"], ["hdf", "HDF"], ["inmuno", "Inmunología"], ["registro", "Eventos"]];
  var SUB_PERF = [["registrar", "Registrar"], ["gas", "Gasometría"], ["bq", "Bioquímica"], ["flujos", "Flujos y O₂"], ["bilis", "Bilis"], ["hdf", "HDF"], ["inmuno", "Inmunología"], ["fotos", "Fotos"], ["registro", "Eventos"], ["plan", "Plan y avisos"]];
  var SUB_POST = [["supervision", "Supervisión y medicación"], ["eval", "Evaluación funcional"], ["bq", "Bioquímica y gasometría"], ["eutanasia", "Eutanasia"]];
  H.tabsExp.seguimiento = function (e, p, q) {
    var niv = p[0], sub = p[1], t0 = H.inicioPerf(e.ID), niveles = [["pre", "Preperfusión"], ["perf", "Perfusión"]].concat(tx(e) ? [["post", "Post-trasplante"]] : []);
    if (!niveles.some(function (x) { return x[0] === niv; })) { if (niv && SUB_PERF.some(function (x) { return x[0] === niv; })) { sub = niv; niv = "perf"; } else if (niv === "pre") { niv = "pre"; } else niv = t0 ? "perf" : "pre"; }
    var base = "exp/" + idq(e) + "/seguimiento", cuerpo;
    if (niv === "pre") { sub = SUB_PRE.some(function (x) { return x[0] === sub; }) ? sub : (H.protocoloConfirmado(e) ? "gas" : "protocolo"); cuerpo = seg(base + "/pre", SUB_PRE, sub, "sub2") + preperfusion(e, sub, q); }
    else if (niv === "post") { sub = SUB_POST.some(function (x) { return x[0] === sub; }) ? sub : "supervision"; cuerpo = seg(base + "/post", SUB_POST, sub, "sub2") + postTrasplante(e, sub); }
    else { sub = SUB_PERF.some(function (x) { return x[0] === sub; }) ? sub : (t0 ? "registrar" : "gas"); cuerpo = tiraPerf(e) + seg(base + "/perf", SUB_PERF, sub, "sub2") + perfusion(e, sub, q); }
    return seg(base, niveles, niv, "nivel") + cuerpo;
  };
  function tiraPerf(e) {
    var t0 = H.inicioPerf(e.ID), prox = H.proximoPunto(e.ID);
    if (!t0) return '<div class="aviso info">' + ico("info") + '<div>La perfusión no ha empezado: regístrala en <a href="#/exp/' + idq(e) + '/quirofano">Quirófano</a>. Las muestras basales y la pre-perfusión van en «Preperfusión».</div></div>';
    return '<div class="cronos dos"><div class="crono activo"><div class="et">Perfusión · día ' + (Math.floor(C.horasEntre(t0, new Date()) / 24) + 1) + '</div><div class="t" data-crono="' + esc(t0) + '">--:--:--</div></div>' +
      (prox ? '<div class="crono"><div class="et">Próxima muestra · ' + esc(prox.etiqueta) + " · " + esc(H.hora(prox.fecha)) + '</div><div class="t" data-cuenta="' + prox.fecha.toISOString() + '">--:--</div></div>' : '<div class="crono"><div class="et">Próxima muestra</div><div class="t pequeno">Sin muestras pendientes</div></div>') + "</div>";
  }
  function quitarCab(h) { var m = /<div class="segmentado" role="tablist" style="margin-bottom:12px;flex-wrap:wrap">[\s\S]*?<\/div>/.exec(h); return m ? h.slice(m.index + m[0].length) : h; }
  function pieHoja(e, m) { return '<div class="pie-hoja">' + (H.puede("registrar") ? '<button class="bt mini" data-act="añadirPunto" data-exp="' + esc(e.ID) + '" data-m="' + m + '">' + ico("plus", "s") + "Punto fuera de protocolo</button>" : "") + '<span class="muy-tenue">Enter o ↓ pasan a la celda de abajo · fuera de objetivo en rojo</span></div>'; }

  // ---- tabla de columnas fijas (basales, pre-perfusión, receptor)
  function tablaFija(e, cols, vars, opc) {
    opc = opc || {}; var puedo = H.puede("registrar"), grupo = null;
    var cab = "<tr><th>Variable</th>" + cols.map(function (c) { return '<th class="num">' + esc(c.et) + "</th>"; }).join("") + "</tr>";
    var filas = vars.filter(function (v) { return !v.calculada; }).map(function (v) {
      var g = ""; if (v.grupo && v.grupo !== grupo) { grupo = v.grupo; g = '<tr class="grupo"><th colspan="' + (cols.length + 1) + '">' + esc(grupo) + "</th></tr>"; }
      return g + '<tr><th scope="row">' + esc(v.nombre) + ' <span class="u">' + esc(H.unidadVisible(v.id, v.unidad)) + "</span></th>" + cols.map(function (c) {
        var x = H.valor(e.ID, c.m, c.p, v.id), val = x ? (C.num(x.Valor) !== null ? String(H.aVista(v.id, x.Valor)).replace(".", ",") : x.Texto) : "", cl = x ? H.claseValor((C.MUESTRAS_BASALES || []).indexOf(c.m) !== -1 ? c.m : opc.objM || c.m, v.id, x.Valor) + (H.pendiente(x) ? " pend" : "") : "";
        return '<td><input class="' + cl + '" inputmode="decimal" autocomplete="off" aria-label="' + esc(v.nombre + " · " + c.et) + '" value="' + esc(val || "") + '" data-cambio="celda" data-exp="' + esc(e.ID) + '" data-m="' + c.m + '" data-p="' + esc(c.p) + '" data-t="' + (c.t === undefined || c.t === null ? "" : c.t) + '" data-f=""' + (puedo ? "" : " readonly") + "></td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="tabla-env"><table class="t h tabla-fija"><thead>' + cab + "</thead><tbody>" + filas + "</tbody></table></div>";
  }
  var GAS_IDS = ["pH", "pO2", "pCO2", "sO2", "HCO3", "BE", "Hb", "Lactato", "Glucosa", "Na", "K", "Ca", "Cl"];
  var COLS_PRE = [{ m: "BASAL_LD", p: "Basal", et: "Basal · donante de hígado" }, { m: "BASAL_BD", p: "Basal", et: "Basal · donante de sangre" }, { m: "PRE", p: "Pre", et: "Pre-perfusión (perfusato)" }];
  function hdfFija(e) {
    var pm = cfgH().parametros, D = C.dializado(cfgH());
    return '<section class="tarjeta hdf-fija"><div class="cabecera"><h3>Configuración de la HDF</h3><span class="chip">Siempre la misma</span></div><dl class="datos-exp cinco"><div><dt>Set</dt><dd>' + esc(pm.set) + "</dd></div><div><dt>Flujo de sangre</dt><dd>" + pm.Q_sangre + " mL/min</dd></div><div><dt>Flujo de diálisis</dt><dd>" + pm.Q_dialisis + " mL/h</dd></div><div><dt>Reposición " + esc(pm.Reposicion_modo) + "</dt><dd>" + pm.Reposicion + " mL/h</dd></div><div><dt>Temperatura</dt><dd>" + pm.Temp_min + "–" + pm.Temp_max + " °C</dd></div></dl>" +
      '<p class="muy-tenue">' + esc(pm.liquido) + ". Dializado efectivo: Na⁺ " + D.Na + " · K⁺ " + H.n(D.K, 1) + " · Ca²⁺ " + D.Ca + " · Mg²⁺ " + D.Mg + " · HCO₃⁻ " + D.HCO3 + " mmol/L · fosfato " + H.n(D.P_mmol, 1) + " mmol/L · glucosa " + D.Glucosa_mg_dL + " mg/dL. La extracción se calcula con el balance (pasos de 10 mL/h).</p></section>";
  }
  function preperfusion(e, sub, q) {
    if (sub === "protocolo") return tablaProtocolo(e);
    if (sub === "calculos") return H.calculosPerfusato ? H.calculosPerfusato(e) : "";
    if (sub === "gas") return '<p class="muy-tenue">Basal del donante de hígado: con el animal intubado y antes de empezar la cirugía. Basal del donante de sangre: sirve de referencia para ajustar los valores de la perfusión (línea discontinua en los gráficos). Pre-perfusión: perfusato con la HDF ya en marcha.</p>' + tablaFija(e, COLS_PRE, C.MUESTRAS.ART.vars, { objM: "ART" });
    if (sub === "bq") return tablaFija(e, COLS_PRE, C.MUESTRAS.PERF.vars.filter(function (v) { return GAS_IDS.indexOf(v.id) === -1; }), { objM: "PERF" });
    if (sub === "inmuno") return tablaFija(e, COLS_PRE, C.MUESTRAS.INMUNO.vars);
    if (sub === "hdf") return hdfFija(e) + '<div class="fila-flex">' + (H.puede("registrar") ? '<button class="bt" data-act="hdfFijos" data-exp="' + esc(e.ID) + '" data-m="PRE_HDF" data-p="Pre">' + ico("wand-sparkles") + "Rellenar con los parámetros fijos</button>" : "") + "</div>" + tablaFija(e, [{ m: "PRE_HDF", p: "Pre", et: "Pre-perfusión" }], C.MUESTRAS.HDF.vars);
    return eventos(e, "pre");
  }
  H.acc.hdfFijos = function (el) {
    var exp = el.getAttribute("data-exp"), m = el.getAttribute("data-m"), p = el.getAttribute("data-p"), t = el.getAttribute("data-t"), pm = cfgH().parametros, bx = m === "HDF" && H.balanceExp ? H.balanceExp(H.exp(exp)) : null;
    var o = { Q_sangre: pm.Q_sangre, Q_dialisis: pm.Q_dialisis, Reposicion: pm.Reposicion, Temp: (pm.Temp_min + pm.Temp_max) / 2 }; if (bx && bx.rec) o.Extraccion = bx.b.extraccion_actual !== null ? bx.b.extraccion_actual : bx.rec.redondeada_mL_h;
    H.guardarMediciones(exp, m, p, t === null || t === "" ? null : Number(t), new Date().toISOString(), o); H.toast("Parámetros de la HDF registrados."); H.repintarPronto();
  };
  // ---- eventos de la fase (pre: antes del inicio de la perfusión)
  function eventos(e, fase) {
    var t0 = H.inicioPerf(e.ID), t0d = t0 ? C.aFecha(t0) : null, puedo = H.puede("registrar");
    var evs = H.filas("Eventos").filter(function (x) { if (x.Experimento !== e.ID) return false; var f = C.aFecha(x.Fecha_hora); return fase === "pre" ? (!t0d || f < t0d) : (t0d && f >= t0d); }).sort(function (a, b) { return String(b.Fecha_hora).localeCompare(String(a.Fecha_hora)); });
    var tipos = fase === "pre" ? ["incidencia", "administracion", "muestra", "inicio_hdf", "ajuste"] : ["incidencia", "ajuste", "administracion", "muestra", "biopsia"];
    return (puedo ? '<section class="tarjeta"><div class="cabecera"><h3>Nuevo evento</h3></div><div class="rejilla tres"><div class="campo"><label class="et" for="nvT">Tipo</label><select id="nvT">' + tipos.map(function (t) { return '<option value="' + t + '">' + esc(H.nombreEvento(t)) + "</option>"; }).join("") + "</select></div>" +
      '<div class="campo"><label class="et" for="nvF">Fecha y hora</label><div class="con-ahora"><input id="nvF" type="datetime-local" value="' + H.aLocal(new Date()) + '"><button type="button" class="bt mini" data-act="ahoraFH" data-id="nvF">Ahora</button></div></div><div class="campo span-todo"><label class="et" for="nvN">Descripción</label><input id="nvN" autocomplete="off" placeholder="Qué ha pasado, qué se ha hecho…"></div></div><button class="bt pri" data-act="guardarEv" data-exp="' + esc(e.ID) + '">' + ico("save") + "Guardar evento</button></section>" : "") +
      '<section class="tarjeta"><div class="cabecera"><h3>' + (fase === "pre" ? "Eventos antes de la perfusión" : "Eventos de la perfusión") + "</h3></div>" + (evs.length ? '<ol class="cronologia">' + evs.map(function (x) { return "<li><time>" + esc(H.diaCorto(x.Fecha_hora) + " " + H.hora(x.Fecha_hora)) + "</time><b>" + esc(H.nombreEvento(x.Tipo)) + "</b>" + (x.Nota ? '<span class="nota">' + esc(x.Nota) + "</span>" : "") + (puedo ? '<button class="bt ico-solo texto" data-act="borrarFila" data-tabla="Eventos" data-id="' + esc(x.ID) + '" aria-label="Borrar evento">' + ico("trash-2", "s") + "</button>" : "") + "</li>"; }).join("") + "</ol>" : '<p class="tenue">Sin eventos.</p>') + "</section>";
  }
  H.acc.ahoraFH = function (el) { var i = H.$("#" + el.getAttribute("data-id")); if (!i) return; i.value = H.aLocal(new Date()); i.dispatchEvent(new Event("change", { bubbles: true })); };

  // ---- tabla de infusiones del protocolo (se confirma antes de cada perfusión)
  function volDia(l) {
    var c = S.cfg.circadiano, ev = c.cambios.filter(function (x) { return x.linea === l; }); if (!ev.length) return null;
    var ini = 8 * 60, ord = ev.slice().sort(function (a, b) { return ((C.hm(a.h) - ini + 1440) % 1440) - ((C.hm(b.h) - ini + 1440) % 1440); }), tot = 0;
    ord.forEach(function (x, j) { var a = (C.hm(x.h) - ini + 1440) % 1440, b = j + 1 < ord.length ? (C.hm(ord[j + 1].h) - ini + 1440) % 1440 : 1440 + ((C.hm(ord[0].h) - ini + 1440) % 1440); tot += (C.num(x.valor) || 0) * (b - a) / 60; });
    return tot;
  }
  H.volumenDiaLinea = volDia;
  function tablaProtocolo(e) {
    var p = H.protocoloExp(e), puedo = H.puede("registrar"), V = H.Vperf(e.ID), lineas = Object.keys(p.lineas), info = C.PROTOCOLOS[p.version] || {};
    var filas = lineas.map(function (l) {
      var x = p.lineas[l], vd = l === "Heparina" ? (C.num(cfgH().otras_infusiones_mL_h) || 0) * 24 : volDia(l);
      return '<tr class="' + (x.incluida ? "" : "excluida") + '"><td class="chk"><input type="checkbox" aria-label="Se administra ' + esc(C.nombreLinea(l)) + '"' + (x.incluida ? " checked" : "") + ' data-cambio="protIncl" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '"' + (puedo ? "" : " disabled") + "></td><td><b>" + esc(C.nombreLinea(l)) + "</b>" + (puedo ? '<input class="prot-prod" list="dlFarmacos" aria-label="Producto de ' + esc(C.nombreLinea(l)) + '" value="' + esc(x.producto) + '" data-cambio="protProducto" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '">' : '<div class="muy-tenue">' + esc(x.producto) + "</div>") + "</td><td>" +
        x.componentes.map(function (c, i) { var a = vd !== null && vd !== undefined ? C.aporteLinea(c, vd / 24, V) : null; return '<div class="comp"><span>' + esc(c.nombre) + '</span><span class="con-u"><input inputmode="decimal" aria-label="Solución madre de ' + esc(c.nombre) + '" value="' + (c.madre === null || c.madre === undefined ? "" : String(c.madre).replace(".", ",")) + '" placeholder="?" data-cambio="protMadre" data-exp="' + esc(e.ID) + '" data-l="' + esc(l) + '" data-i="' + i + '"' + (puedo ? "" : " disabled") + "> " + esc(c.unidad) + '</span><span class="muy-tenue">' + (a ? H.n(a.por_h * 24, a.por_h * 24 < 1 ? 3 : 0) + " " + esc(a.unidad_h.replace("/h", "/día")) + " · +" + H.n(a.por_L_h * 24, a.por_L_h * 24 < 1 ? 3 : 1) + " " + esc(a.unidad_L_h.replace(" por hora", "/día")) : "") + "</span></div>"; }).join("") +
        '</td><td class="num">' + (vd !== null && vd !== undefined ? H.n(vd, 1) + " mL" : "—") + "</td></tr>";
    }).join("");
    return '<section class="tarjeta"><div class="cabecera"><h2>Tabla de infusiones</h2>' + (p.confirmado_en ? '<span class="chip ok">' + ico("check", "s") + "Confirmada por " + esc(p.confirmado_por || "") + " el " + esc(H.fechaHora(p.confirmado_en)) + "</span>" : '<span class="chip aj">Sin confirmar</span>') + "</div>" +
      '<div class="rejilla dos"><div class="campo"><label class="et" for="protVer">Versión del protocolo</label><select id="protVer" data-cambio="protVersion" data-exp="' + esc(e.ID) + '"' + (puedo ? "" : " disabled") + ">" + C.VERSIONES.map(function (v) { return '<option value="' + v + '"' + (v === p.version ? " selected" : "") + ">" + v + " · " + esc(C.PROTOCOLOS[v].propuesto ? "propuesto" : C.PROTOCOLOS[v].ref) + "</option>"; }).join("") + '</select><div class="ayuda">' + esc(info.notas || "") + '</div></div><div class="campo"><span class="et">Volumen de perfusato</span><div class="valor-fijo">' + H.n(V, 0) + ' mL</div><div class="ayuda">Para la concentración esperada</div></div></div>' +
      '<datalist id="dlFarmacos">' + (H.farmacosCatalogo ? H.farmacosCatalogo() : []).map(function (m) { return '<option value="' + esc(m.Nombre) + '">'; }).join("") + "</datalist>" +
      '<p class="muy-tenue">El producto de cada línea se puede elegir del catálogo de <a href="#/exp/' + encodeURIComponent(e.ID) + '/preparacion/farmacos">fármacos, reactivos y soluciones</a> (o escribirlo).</p>' +
      '<div class="tabla-env"><table class="t tabla-prot"><thead><tr><th>Se administra</th><th>Línea</th><th>Componentes · solución madre · dosis al día · concentración esperada</th><th class="num">Volumen al día</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      '<p class="muy-tenue">La dosis al día sale del horario circadiano configurado (volumen diario × solución madre). La concentración esperada es lo que añadiría al perfusato en un día sin aclaramiento: es una referencia. Desmarca las líneas que no se vayan a administrar en esta perfusión; dejarán de verse en el horario y en el balance.</p>' +
      (puedo ? '<button class="bt pri" data-act="protConfirmar" data-exp="' + esc(e.ID) + '">' + ico("clipboard-check") + (p.confirmado_en ? "Volver a confirmar" : "Confirmar la tabla de infusiones") + "</button>" : "") + "</section>";
  }
  function formProt(exp) { var e = H.exp(exp), f = H.form(exp, "protocolo", "") || {}, p = H.protocoloExp(e); f = H.copia(f); f.version = p.version; f.lineas = f.lineas || {}; Object.keys(p.lineas).forEach(function (l) { if (!f.lineas[l]) f.lineas[l] = H.copia(p.lineas[l]); }); return f; }
  function guardarProt(exp, f, msg) { delete f.confirmado_en; delete f.confirmado_por; H.guardarForm(exp, "protocolo", "", f); H.guardar("Experimentos", [{ ID: exp, Protocolo: f.version }], { sinRepintar: true }); if (msg) H.toast(msg); H.repintarPronto(); }
  H.acc.protIncl = function (el) { var exp = el.getAttribute("data-exp"), f = formProt(exp); f.lineas[el.getAttribute("data-l")].incluida = el.checked; guardarProt(exp, f); };
  H.acc.protMadre = function (el) { var exp = el.getAttribute("data-exp"), f = formProt(exp), l = el.getAttribute("data-l"), i = +el.getAttribute("data-i"); f.lineas[l].componentes[i].madre = C.num(String(el.value).replace(",", ".")); guardarProt(exp, f); };
  H.acc.protVersion = function (el) { var exp = el.getAttribute("data-exp"), v = el.value; var f = { version: v, lineas: H.copia(C.PROTOCOLOS[v].lineas) }; Object.keys(f.lineas).forEach(function (l) { f.lineas[l].incluida = true; }); guardarProt(exp, f, "Tabla cargada con la versión " + v + ". Revísala y confírmala."); };
  H.acc.protConfirmar = function (el) { var exp = el.getAttribute("data-exp"), f = formProt(exp); f.confirmado_en = new Date().toISOString(); f.confirmado_por = (S.usuario || {}).nombre || (S.usuario || {}).email; H.guardarForm(exp, "protocolo", "", f); H.guardar("Experimentos", [{ ID: exp, Protocolo: f.version }], { sinRepintar: true }); H.toast("Tabla de infusiones confirmada (" + f.version + ")."); H.repintarPronto(); };

  // ---- perfusión
  function perfusion(e, sub, q) {
    if (sub === "registro") return eventos(e, "perf");
    if (sub === "registrar") return registrarConExtras(e, q);
    if (sub === "fotos") return H.segExtra.fotos(e, [sub], q);
    if (sub === "bilis") return pieHoja(e, "BILIS") + H.hojaHTML(e.ID, "BILIS", { todos: q.todos === "1", filasDerivadas: [C.variable("BILIS", "Produccion_mLh"), C.DERIVADAS.filter(function (d) { return d.id === "Bilis_mLh_100g"; })[0]], derivadas: function (pp) { return H.derivadasBilis(e, pp); } });
    if (sub === "hdf") { var pa = H.puntoAhora(e.ID); return (H.hdfPanel ? H.hdfPanel(e) : "") + consejoHTML(e) + hdfFija(e) + (H.puede("registrar") && pa ? '<div class="fila-flex"><button class="bt" data-act="hdfFijos" data-exp="' + esc(e.ID) + '" data-m="HDF" data-p="' + esc(pa.punto) + '" data-t="' + pa.t_h + '">' + ico("wand-sparkles") + "Registrar los parámetros fijos en «" + esc(pa.punto) + "»</button></div>" : "") + pieHoja(e, "HDF") + H.hojaHTML(e.ID, "HDF", { todos: q.todos === "1" }); }
    return quitarCab(segOrig(e, [sub], q));
  }
  // recomendaciones de la HDF con la última bioquímica del perfusato
  function consejoHTML(e) {
    var ev = H.eventos(e.ID), t0 = H.inicioPerf(e.ID); if (!t0) return "";
    var norm = !!ev.fin_recalentamiento || C.horasEntre(t0, new Date()) * 60 > (S.cfg.recalentamiento.pasos.slice(-1)[0].t + S.cfg.recalentamiento.paso_min), l = H.med(e.ID).filter(function (m) { return m.Muestra === "PERF" && C.num(m.Valor) !== null; });
    if (!l.length) return '<section class="tarjeta"><div class="cabecera"><h3>Recomendaciones de la HDF</h3></div><p class="tenue">Aparecen con la primera bioquímica del perfusato (urea e iones).</p></section>';
    var th = function (m) { var a = C.num(m.T_real_h); return a !== null ? a : C.num(m.T_nominal_h) || 0; }, tmax = Math.max.apply(null, l.map(th)), v = {}, prev = null;
    l.filter(function (m) { return Math.abs(th(m) - tmax) < 1e-6; }).forEach(function (m) { v[m.Variable] = C.num(m.Valor); });
    var ureas = l.filter(function (m) { return m.Variable === "Urea"; }).sort(function (a, b) { return th(a) - th(b); }); if (ureas.length > 1) prev = C.num(ureas[ureas.length - 2].Valor);
    var punto = l.filter(function (m) { return Math.abs(th(m) - tmax) < 1e-6; })[0].Punto, recs = C.consejoHDF(v, { normotermia: norm, urea_previa: prev, cfg: cfgH() });
    return '<section class="tarjeta"><div class="cabecera"><h3>Recomendaciones de la HDF</h3><span class="muy-tenue">Con la bioquímica de «' + esc(punto) + '»</span></div><div class="recs">' + recs.map(function (x) { return '<div class="rec ' + x.nivel + '">' + ico(x.nivel === "ok" ? "circle-check" : x.nivel === "ajuste" ? "sliders-horizontal" : "info", "s") + "<div>" + esc(x.texto) + "</div></div>"; }).join("") + "</div></section>";
  }
  H.consejoHDFHTML = consejoHTML;
  function registrarConExtras(e, q) {
    var h = H.segExtra.registrar(e, ["registrar"], q), pa = H.puntoAhora(e.ID);
    var extra = consejoHTML(e).replace('<section class="tarjeta">', '<div class="reg-hdf-extra">').replace(/<\/section>$/, "</div>") + (H.puede("registrar") && pa ? '<div class="fila-flex"><button class="bt mini" data-act="hdfFijos" data-exp="' + esc(e.ID) + '" data-m="HDF" data-p="' + esc(pa.punto) + '" data-t="' + pa.t_h + '">' + ico("wand-sparkles", "s") + "Registrar los parámetros fijos de la HDF</button></div>" : "");
    return h.replace(/(<details class="reg-bloque" id="reg_hdf"[^>]*><summary>[\s\S]*?<\/summary><div class="dentro">)/, "$1" + extra);
  }
  // alarma de ajuste de los mezcladores al registrar una gasometría
  var avisados = {};
  var regValPrev = H.acc.regVal;
  H.acc.regVal = function (el) {
    regValPrev(el); var m = el.getAttribute("data-m"); if (!/^(ART|POR)$/.test(m)) return;
    var exp = el.getAttribute("data-exp"), p = el.getAttribute("data-p"), e = H.exp(exp), g = {};
    C.MUESTRAS[m].vars.forEach(function (v) { var x = H.valor(exp, m, p, v.id); if (x && C.num(x.Valor) !== null) g[v.id] = C.num(x.Valor); });
    if (g.pO2 === undefined && g.pCO2 === undefined) return;
    var aj = {}; ["FiO2", "Barrido"].forEach(function (k) { var x = H.valor(exp, "FLUJO", p, k + "_" + m) || H.ultimo(exp, "FLUJO", k + "_" + m); if (x) aj[k] = C.num(x.Valor); });
    var a = C.asesorGas(m, g, aj, S.cfg.objetivos, S.cfg.gases, { V_mL: H.Vperf(exp) }), rec = a.recomendaciones.filter(function (x) { return x.nivel === "ajuste" || x.nivel === "alerta"; });
    var clave = exp + "|" + p + "|" + m + "|" + rec.map(function (x) { return x.texto; }).join("|"); if (!rec.length || avisados[clave]) return; avisados[clave] = 1;
    H.mostrarAlarma([{ ID: "mezclador|" + clave, Titulo: "Ajustar el mezclador " + (m === "ART" ? "arterial" : "portal") + " · " + exp, Texto: rec.map(function (x) { return x.texto; }).join(" "), Tipo: rec.some(function (x) { return x.nivel === "alerta"; }) ? "critico" : "otro", Vista: "exp:" + exp + ":seguimiento" }]);
  };

  // ---- post-trasplante
  function postTrasplante(e, sub) {
    var nn = String(e.ID).replace("HOME-", ""), rf = H.form(e.ID, "receptor", "LR") || {}, base = rf.fecha || e.Fecha_trasplante, finQx = H.leerRuta(rf, "qx.fin"), t0 = base ? C.aFecha(C.diaISO(C.aDia(base)) + "T" + (finQx || "12:00") + ":00") : null, puedo = H.puede("registrar");
    var cab = '<p class="muy-tenue">Receptor HOME-LR-' + esc(nn) + (t0 ? " · tiempo 0 = fin de la cirugía del trasplante (" + esc(H.diaCorto(t0) + " " + H.hora(t0)) + (finQx ? "" : ", hora provisional: anota el fin en Cirugía → Receptor") + ")" : "") + ".</p>";
    if (sub === "eval") {
      var horas = C.SUPERVISION_REC.map(function (x) { return x.h; }), totales = [];
      var filas = horas.map(function (h) {
        var p = h + " h", vals = C.EVAL_REC.items.map(function (it) { var x = H.valor(e.ID, "REC_EVAL", p, it[0]); return x ? C.num(x.Valor) : null; }), tot = vals.every(function (v) { return v !== null; }) ? vals.reduce(function (a, b) { return a + b; }, 0) : null; totales.push(tot);
        return '<tr><th scope="row">' + h + " h" + (t0 ? '<div class="muy-tenue">' + esc(H.diaCorto(new Date(t0.getTime() + h * 36e5)) + " " + H.hora(new Date(t0.getTime() + h * 36e5))) + "</div>" : "") + "</th>" + C.EVAL_REC.items.map(function (it, i) {
          return '<td><select aria-label="' + esc(it[1] + " a las " + h + " h") + '" data-cambio="evalRec" data-exp="' + esc(e.ID) + '" data-h="' + h + '" data-v="' + it[0] + '"' + (puedo ? "" : " disabled") + '><option value="">—</option>' + it[2].map(function (o, j) { return '<option value="' + (j + 1) + '"' + (vals[i] === j + 1 ? " selected" : "") + ">" + (j + 1) + " · " + esc(o) + "</option>"; }).join("") + "</select></td>";
        }).join("") + '<td class="num"><b class="' + (tot !== null && tot >= C.EVAL_REC.limite ? "v-alto" : "") + '">' + (tot === null ? "—" : tot) + "</b></td></tr>";
      }).join("");
      var sacr = C.sacrificioPorEvaluacion(totales);
      return cab + (sacr ? '<div class="aviso al">' + ico("triangle-alert") + "<div><b>Criterio de sacrificio:</b> " + C.EVAL_REC.limite + " puntos en dos evaluaciones seguidas.</div></div>" : "") + '<section class="tarjeta"><div class="cabecera"><h3>Evaluación funcional post-trasplante</h3><span class="muy-tenue">1 = normal · 2 = alterado · 3 = nulo · si suma ' + C.EVAL_REC.limite + " dos veces seguidas, se sacrifica</span></div>" +
        '<div class="tabla-env"><table class="t tabla-eval"><thead><tr><th>Hora</th>' + C.EVAL_REC.items.map(function (it) { return "<th>" + esc(it[1]) + "</th>"; }).join("") + '<th class="num">Total</th></tr></thead><tbody>' + filas + "</tbody></table></div></section>";
    }
    if (sub === "bq") { var cols = C.PUNTOS_REC.map(function (h) { return { m: "REC", p: h + " h", et: h + " h", t: h }; }); return cab + '<section class="tarjeta"><div class="cabecera"><h3>Bioquímica y gasometría del receptor</h3></div>' + tablaFija(e, cols, C.MUESTRAS.REC.vars, { objM: "PERF" }) + "</section>"; }
    if (sub === "eutanasia") {
      var d = H.usarForm(e.ID, "eutanasia", "LR"), c = H.campo;
      return cab + '<section class="tarjeta"><div class="cabecera"><h3>Información de la eutanasia</h3><span id="indGuardado" class="guardado">' + ico("check", "s") + 'Guardado automático</span></div><div class="rejilla cuatro">' + c("tipo", "Eutanasia", d.tipo, { tipo: "select", opciones: ["Electiva", "Autopsia"] }) + c("fecha", "Fecha del procedimiento", d.fecha || e.Fecha_sacrificio || "", { tipo: "date" }) + c("peso_kg", "Peso post-seguimiento", d.peso_kg, { tipo: "number", u: "kg" }) + "<div></div>" +
        c("herida", "Herida quirúrgica", d.herida, { tipo: "select", opciones: ["Correcta", "Seroma", "Infección"] }) + c("liquido", "Líquido intraabdominal", d.liquido, { tipo: "select", opciones: ["No", "Hemoperitoneo", "Ascitis", "Otros"] }) + c("liquido_otro", "Otros (describir)", d.liquido_otro, {}) + "<div></div></div></section>" +
        '<section class="tarjeta"><div class="cabecera"><h3>Asistentes e incidencias</h3></div><div class="rejilla dos">' + (H.CAT_ASIST || []).map(function (k) { return c("asistentes." + k[0], k[1], H.leerRuta(d, "asistentes." + k[0]), { ph: "Nombres…" }); }).join("") + c("obs", "Incidencias", d.obs, { tipo: "textarea", ancho: true }) + c("reportado", "Reportado por", d.reportado || (S.usuario || {}).nombre, {}) + "</div></section>";
    }
    // supervisión y medicación
    var sup = H.usarForm(e.ID, "receptor_sup", "LR"), peso = C.num(rf.peso_kg);
    function med(h, k, pauta) { if (!pauta) return '<td class="na">—</td>'; var kk = "filas.h" + h + "." + k, v = H.leerRuta(sup, kk); return '<td><label class="check"><input type="checkbox" data-k="' + kk + '" data-cambio="campoForm"' + (v ? " checked" : "") + (puedo ? "" : " disabled") + "> " + esc(pauta) + (k === "tac" && peso ? ' <span class="muy-tenue">(' + H.n(0.04 * peso, 2) + " mg)</span>" : "") + "</label></td>"; }
    return cab + '<section class="tarjeta"><div class="cabecera"><h3>Supervisión post-trasplante</h3><span id="indGuardado" class="guardado">' + ico("check", "s") + 'Guardado automático</span></div><div class="tabla-env"><table class="t tabla-sup"><thead><tr><th>Hora</th><th>Extracción</th><th>Muestras</th><th>Buprex</th><th>Tacrolimus</th><th>Metpret</th><th>Cefoxitina</th></tr></thead><tbody>' +
      C.SUPERVISION_REC.map(function (r) {
        var k = "filas.h" + r.h + ".";
        return '<tr><th scope="row">' + r.h + " h" + (t0 ? '<div class="muy-tenue">' + esc(H.diaCorto(new Date(t0.getTime() + r.h * 36e5)) + " " + H.hora(new Date(t0.getTime() + r.h * 36e5))) + "</div>" : "") + '</th><td><div class="con-ahora"><input type="datetime-local" id="sup' + r.h + '" aria-label="Extracción a las ' + r.h + ' h" value="' + esc(H.aLocal(H.leerRuta(sup, k + "fecha") || "")) + '" data-k="' + k + 'fecha" data-cambio="campoForm"' + (puedo ? "" : " disabled") + ">" + (puedo ? '<button type="button" class="bt mini" data-act="ahoraFH" data-id="sup' + r.h + '">Ahora</button>' : "") + "</div></td>" +
          '<td><label class="check"><input type="checkbox" data-k="' + k + 'muestras" data-cambio="campoForm"' + (H.leerRuta(sup, k + "muestras") ? " checked" : "") + (puedo ? "" : " disabled") + "> Tomadas</label></td>" +
          '<td><input aria-label="Buprex a las ' + r.h + ' h" value="' + esc(H.leerRuta(sup, k + "buprex") || "") + '" data-k="' + k + 'buprex" data-cambio="campoForm" placeholder="dosis…"' + (puedo ? "" : " disabled") + "></td>" + med(r.h, "tac", r.tacrolimus) + med(r.h, "met", r.metpret) + med(r.h, "cef", r.cefoxitina) + "</tr>";
      }).join("") + '</tbody></table></div><div class="rejilla dos">' + H.campo("obs", "Observaciones", sup.obs, { tipo: "textarea", ancho: true }) + H.campo("reportado", "Reportado por", sup.reportado || (S.usuario || {}).nombre, {}) + "</div></section>";
  }
  H.acc.evalRec = function (el) {
    var exp = el.getAttribute("data-exp"), h = +el.getAttribute("data-h"), v = el.getAttribute("data-v"), o = {}; o[v] = C.num(el.value);
    var vals = C.EVAL_REC.items.map(function (it) { if (it[0] === v) return o[v]; var x = H.valor(exp, "REC_EVAL", h + " h", it[0]); return x ? C.num(x.Valor) : null; });
    if (vals.every(function (x) { return x !== null; })) o.Total = vals.reduce(function (a, b) { return a + b; }, 0);
    H.guardarMediciones(exp, "REC_EVAL", h + " h", h, new Date().toISOString(), o); H.repintarPronto();
  };

  // ============================================================== CIERRE (sin resumen)
  H.tabsExp.cierre = function (e) {
    var ev = H.eventos(e.ID), d = H.usarForm(e.ID, "cierre", ""), puedo = H.puede("registrar"), c = H.campo;
    return '<section class="tarjeta"><div class="cabecera"><h2>Fin de la perfusión</h2><span id="indGuardado" class="guardado">' + ico("check", "s") + "Guardado automático</span></div>" +
      '<div class="rejilla dos"><div class="campo"><label class="et" for="cFin">Fecha y hora de fin</label><div class="con-ahora"><input id="cFin" type="datetime-local" value="' + H.aLocal(ev.fin_perfusion || e.Fin_perfusion || "") + '"' + (puedo ? "" : " disabled") + ">" + (puedo ? '<button type="button" class="bt mini" data-act="ahoraFH" data-id="cFin">Ahora</button>' : "") + '</div><div class="ayuda">Se guarda tal cual en el registro del experimento.</div></div>' +
      '<div class="campo"><label class="et" for="cPeso">Peso final del hígado</label><div class="unidad-in"><input id="cPeso" inputmode="decimal" data-num="1" value="' + esc(e.Peso_higado_final_g || "") + '"' + (puedo ? "" : " disabled") + '><span>g</span></div><div class="ayuda">&nbsp;</div></div>' +
      c("motivo", "Motivo de finalización", d.motivo, { tipo: "select", opciones: ["Objetivo de la perfusión alcanzado", "Trasplante del injerto", "Aumento de la resistencia / problema de flujo", "Fallo técnico del dispositivo", "Deterioro del injerto", "Obstrucción o parada del flujo biliar", "Contaminación / infección", "Decisión del equipo", "Otro"] }) +
      c("destino", "Destino del injerto", d.destino, { tipo: "select", opciones: tx(e) ? ["Trasplante", "Necropsia y muestras", "Desechado"] : ["Necropsia y muestras", "Desechado"] }) + c("obs", "Observaciones finales", d.obs, { tipo: "textarea", ancho: true }) + "</div>" +
      (puedo ? '<button class="bt pri" data-act="cerrarExp" data-exp="' + esc(e.ID) + '">' + ico("circle-check") + (e.Estado === "Finalizado" ? "Actualizar el fin de la perfusión" : "Finalizar la perfusión") + "</button>" : "") + "</section>";
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v05d.js"] = "0.7.2";
