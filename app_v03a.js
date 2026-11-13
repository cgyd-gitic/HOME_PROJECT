/* HOME v0.3 (A) · programación y calendario, nuevo experimento, registro de dieta por QR, acceso rápido (llaves de acceso y contraseña). */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function cfgP() { return S.cfg.programacion || C.DEF.programacion; }
  function hoyISO() { return C.diaISO(new Date()); }
  function dma(v) { var d = C.aDia(v); return d ? H.fechaDMA(d) : ""; }
  function publico(fn, args) { if (!window.HOME_API || /PEGA_AQUI/.test(window.HOME_API)) { window.HOMEDemo.iniciar(); return window.HOMEDemo.llamar(fn, args); } return H.servidor(fn, args); }
  H.llamarPublico = publico;

  // ============================================================== utilidades de programación
  H.participantes = function (e) { var p = e && e.Participantes; if (!p) return []; if (Array.isArray(p)) return p; try { var x = JSON.parse(p); return Array.isArray(x) ? x : []; } catch (err) { return String(p).split(/[,;\s]+/).filter(Boolean); } };
  H.esProvisional = function (e) { return !!e && e.Programacion === "Provisional"; };
  H.nombreUsuario = function (email) { var u = H.filas("Usuarios").filter(function (x) { return String(x.Email).toLowerCase() === String(email).toLowerCase(); })[0]; return u && u.Nombre ? u.Nombre : String(email).split("@")[0]; };
  H.participo = function (e) { var yo = String((S.usuario || {}).email || "").toLowerCase(); return H.participantes(e).map(function (x) { return String(x).toLowerCase(); }).indexOf(yo) !== -1; };
  H.expProgramados = function () {
    return H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.Fecha_cirugia; }).sort(function (a, b) { return C.aDia(a.Fecha_cirugia) - C.aDia(b.Fecha_cirugia); });
  };
  var FASES = { llegada: "Llegada", aclimatacion: "Aclimatación y dieta", cirugia: "Hepatectomía y perfusión", perfusion: "Perfusión", trasplante: "Trasplante", seguimiento: "Seguimiento", sacrificio: "Sacrificio" };

  // ============================================================== CALENDARIO
  H.vistas.calendario = function (p, q) {
    var hoy = new Date(), m = /^\d{4}-\d{2}$/.test(q.m || "") ? q.m : hoy.getFullYear() + "-" + (hoy.getMonth() < 9 ? "0" : "") + (hoy.getMonth() + 1), a = +m.slice(0, 4), mes = +m.slice(5) - 1;
    var prim = new Date(a, mes, 1), ini = new Date(a, mes, 1 - ((prim.getDay() + 6) % 7)), exps = H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.Fecha_cirugia; });
    function mesRel(n) { var d = new Date(a, mes + n, 1); return d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1); }
    var nombreMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(prim), celdas = "";
    for (var i = 0; i < 42; i++) {
      var d = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i), iso = C.diaISO(d), fuera = d.getMonth() !== mes;
      if (i >= 35 && fuera && i % 7 === 0) break;
      var pills = exps.map(function (e) {
        var f = C.faseDia(e, iso, cfgP()); if (!f) return "";
        var hito = /^(llegada|cirugia|trasplante|sacrificio)$/.test(f);
        return '<a class="cal-ev f-' + f + (H.esProvisional(e) ? " prov" : "") + (hito ? " hito" : "") + '" href="#/exp/' + encodeURIComponent(e.ID) + '" title="' + esc(e.ID + " · " + FASES[f] + (H.esProvisional(e) ? " (fecha provisional)" : "")) + '">' + (hito ? esc(e.ID.replace("HOME-", "") + " · " + FASES[f]) : '<span class="sr">' + esc(e.ID + " " + FASES[f]) + "</span>") + "</a>";
      }).join("");
      celdas += '<div class="cal-dia' + (fuera ? " fuera" : "") + (iso === hoyISO() ? " hoy" : "") + '"><span class="n">' + d.getDate() + "</span>" + pills + "</div>";
    }
    var prox = H.expProgramados().filter(function (e) { var fin = e.Fecha_sacrificio || e.Fecha_trasplante || C.sumarDias(e.Fecha_cirugia, cfgP().dias_perfusion); return C.diasEntre(hoyISO(), fin) >= -3; });
    return '<div class="ancho"><div class="titulo-pag"><h1>Calendario</h1>' + (H.esAdmin() ? '<button class="bt pri" data-act="nuevoExp">' + ico("plus") + "Programar experimento</button>" : "") + "</div>" +
      '<section class="tarjeta"><div class="cabecera"><a class="bt ico-solo" href="#/calendario?m=' + mesRel(-1) + '" aria-label="Mes anterior">' + ico("chevron-left") + '</a><h2 style="text-transform:capitalize;min-width:170px;text-align:center">' + esc(nombreMes) + '</h2><a class="bt ico-solo" href="#/calendario?m=' + mesRel(1) + '" aria-label="Mes siguiente">' + ico("chevron-right") + '</a><a class="bt texto" href="#/calendario">Hoy</a></div>' +
      '<div class="cal" role="grid" aria-label="' + esc(nombreMes) + '">' + ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(function (x) { return '<div class="cal-cab">' + x + "</div>"; }).join("") + celdas + "</div>" +
      '<div class="cal-leyenda">' + Object.keys(FASES).map(function (f) { return '<span><i class="cal-ev f-' + f + '"></i>' + FASES[f] + "</span>"; }).join("") + '<span><i class="cal-ev f-perfusion prov"></i>Fecha provisional</span></div></section>' +
      '<section class="tarjeta"><div class="cabecera"><h2>Procedimientos programados</h2></div>' + (prox.length ? prox.map(tarjetaProg).join("") : '<p class="tenue">No hay procedimientos programados.' + (H.esAdmin() ? " Usa «Programar experimento» para reservar las fechas." : "") + "</p>") +
      '<p class="muy-tenue" style="margin-top:8px">Al programar una fecha provisional se avisa a los participantes. Tres semanas antes, los administradores reciben el aviso para confirmarla; al confirmar, los participantes reciben la cita para su calendario y un recordatorio una semana antes de cada procedimiento.</p></section></div>';
  };
  function tarjetaProg(e) {
    var hitos = C.hitosExperimento(e, cfgP()), part = H.participantes(e), dias = C.diasEntre(hoyISO(), e.Fecha_cirugia), prov = H.esProvisional(e), id = esc(e.ID);
    var aviso = prov && dias !== null && dias >= 0 && dias <= cfgP().confirmar_dias_antes ? '<div class="aviso aj" style="margin:8px 0 0">' + ico("triangle-alert") + "<div>Faltan " + dias + " días y la fecha sigue siendo provisional: hay que confirmarla o moverla.</div></div>" : "";
    return '<div class="prog' + (prov ? " prov" : "") + '"><div class="fila-flex sep"><div><b><a href="#/exp/' + encodeURIComponent(e.ID) + '">' + id + "</a></b> " + (prov ? '<span class="chip aj">Fecha provisional</span>' : '<span class="chip ok">Confirmado</span>') + " " + H.estadoChip(e.Estado) +
      (dias !== null && dias >= 0 ? ' <span class="muy-tenue">faltan ' + dias + " días</span>" : "") + (H.participo(e) ? ' <span class="chip pri">Participas</span>' : "") + '</div><div class="fila-flex">' +
      (H.esAdmin() && prov ? '<button class="bt pri" data-act="progConfirmar" data-id="' + id + '">' + ico("check") + "Confirmar</button>" : "") +
      (H.esAdmin() ? '<button class="bt" data-act="progEditar" data-id="' + id + '">' + ico("pencil") + "Fechas y participantes</button>" : "") +
      '<button class="bt" data-act="progICS" data-id="' + id + '">' + ico("calendar-days") + "Añadir a mi calendario</button></div></div>" +
      '<div class="hitos">' + hitos.map(function (h) { var d = C.diasEntre(hoyISO(), h.fecha); return '<div class="hito f-' + h.tipo + '"><div class="et">' + esc(h.nombre) + '</div><div class="f">' + esc(dma(h.fecha)) + '</div><div class="muy-tenue">' + (d === 0 ? "hoy" : d > 0 ? "en " + d + " días" : "hace " + (-d) + " días") + "</div></div>"; }).join("") + "</div>" +
      '<p class="tenue" style="margin:8px 0 0">' + ico("users", "s") + " " + (part.length ? esc(part.map(H.nombreUsuario).join(", ")) : "Sin participantes asignados") + "</p>" + aviso + "</div>";
  }
  H.acc.progICS = function (el) { var e = H.exp(el.getAttribute("data-id")); if (!e) return; H.descargar(e.ID + ".ics", C.icsExperimento(e, cfgP()), "text/calendar"); H.toast("Abre el archivo descargado para añadir las fechas a tu calendario."); };
  H.acc.progConfirmar = function (el) {
    var e = H.exp(el.getAttribute("data-id")), n = H.participantes(e).length;
    H.confirmar("Confirmar " + e.ID, "La hepatectomía y la perfusión quedan confirmadas para el " + dma(e.Fecha_cirugia) + ". " + (n ? "Se avisará a " + n + " participante(s) con la cita para su calendario y recibirán un recordatorio una semana antes." : "No hay participantes asignados: añádelos para que reciban el aviso."), "Confirmar").then(function (ok) {
      if (!ok) return; H.guardar("Experimentos", [{ ID: e.ID, Programacion: "Confirmado" }]); H.toast(e.ID + " confirmado."); });
  };
  function formProg(e, nuevo) {
    var us = H.filas("Usuarios").filter(function (u) { return u.Activo !== false && u.Activo !== "FALSE"; }), part = H.participantes(e).map(function (x) { return String(x).toLowerCase(); });
    function f(id, et, v, ayuda) { return '<div class="campo"><label class="et" for="' + id + '">' + et + '</label><input id="' + id + '" type="date" value="' + esc(v ? C.diaISO(C.aDia(v)) : "") + '">' + (ayuda ? '<div class="ayuda">' + ayuda + "</div>" : "") + "</div>"; }
    return '<div class="rejilla">' + f("pgQx", "Hepatectomía e inicio de la perfusión", e.Fecha_cirugia, "Las demás fechas se calculan solas.") + f("pgLl", "Llegada de los animales", e.Fecha_llegada, cfgP().dias_llegada_antes + " días antes") +
      f("pgTx", "Trasplante del injerto", e.Fecha_trasplante, "Tras " + cfgP().dias_perfusion + " días de perfusión") + f("pgSa", "Sacrificio", e.Fecha_sacrificio, "Tras " + cfgP().dias_seguimiento + " días de seguimiento") +
      '<div class="campo"><label class="et" for="pgEst">Estado de la fecha</label><select id="pgEst"><option' + (e.Programacion === "Provisional" || nuevo ? " selected" : "") + '>Provisional</option><option' + (!nuevo && e.Programacion !== "Provisional" ? " selected" : "") + ">Confirmado</option></select></div></div>" +
      '<fieldset class="campo"><legend class="et">Participantes principales (reciben los avisos)</legend><div class="fila-flex">' + (us.length ? us.map(function (u) { var em = String(u.Email).toLowerCase(); return '<label class="check"><input type="checkbox" class="pgPart" value="' + esc(em) + '"' + (part.indexOf(em) !== -1 ? " checked" : "") + "> " + esc(u.Nombre || em) + ' <span class="muy-tenue">' + esc(H.nombreRol(u.Rol)) + "</span></label>"; }).join("") : '<span class="tenue">No hay usuarios.</span>') + "</div></fieldset>";
  }
  function enlazarFechas(d) {
    var tocadas = {}; ["pgLl", "pgTx", "pgSa"].forEach(function (k) { d.querySelector("#" + k).addEventListener("change", function () { tocadas[k] = true; }); });
    function auto() { var P = C.fechasPrograma(d.querySelector("#pgQx").value, cfgP()); if (!P) return; if (!tocadas.pgLl) d.querySelector("#pgLl").value = P.llegada; if (!tocadas.pgTx) d.querySelector("#pgTx").value = P.trasplante; if (!tocadas.pgSa) d.querySelector("#pgSa").value = P.sacrificio; }
    d.querySelector("#pgQx").addEventListener("change", auto); d.querySelector("#pgQx").addEventListener("input", auto); return auto;
  }
  function leerProg(d) {
    var o = { Fecha_cirugia: d.querySelector("#pgQx").value, Fecha_llegada: d.querySelector("#pgLl").value, Fecha_trasplante: d.querySelector("#pgTx").value, Fecha_sacrificio: d.querySelector("#pgSa").value, Programacion: d.querySelector("#pgEst").value };
    o.Participantes = JSON.stringify(H.$$(".pgPart", d).filter(function (c) { return c.checked; }).map(function (c) { return c.value; })); return o;
  }
  function validarProg(o) {
    if (!o.Fecha_cirugia) return "Indica la fecha de la hepatectomía y la perfusión.";
    if (o.Fecha_llegada && o.Fecha_llegada > o.Fecha_cirugia) return "Los animales no pueden llegar después de la cirugía.";
    if (o.Fecha_trasplante && o.Fecha_trasplante < o.Fecha_cirugia) return "El trasplante no puede ser anterior a la perfusión.";
    if (o.Fecha_sacrificio && o.Fecha_trasplante && o.Fecha_sacrificio < o.Fecha_trasplante) return "El sacrificio no puede ser anterior al trasplante.";
    var choca = H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.ID !== o.ID && e.Fecha_cirugia && /^(cirugia|perfusion|trasplante)$/.test(C.faseDia(e, o.Fecha_cirugia, cfgP()) || ""); })[0];
    return choca ? "Ese día coincide con la perfusión de " + choca.ID + ": los experimentos no se solapan." : "";
  }
  H.acc.progEditar = function (el) {
    var e = H.exp(el.getAttribute("data-id")); if (!e || !H.esAdmin()) return;
    H.modal({ titulo: "Fechas y participantes · " + e.ID, ancho: true, cuerpo: formProg(e, false) + '<div class="msg-error" id="pgErr" role="alert"></div>',
      pie: '<button class="bt peligro" id="pgCancelar">Cancelar el procedimiento</button><span class="empuja"></span><button class="bt" data-cerrar>Cerrar</button><button class="bt pri" id="pgOk">Guardar</button>',
      alAbrir: function (d) {
        enlazarFechas(d);
        d.querySelector("#pgOk").addEventListener("click", function () { var o = leerProg(d); o.ID = e.ID; var err = validarProg(o); if (err) { d.querySelector("#pgErr").textContent = err; return; } H.guardar("Experimentos", [o]); d.close(); H.toast("Programación de " + e.ID + " guardada."); });
        d.querySelector("#pgCancelar").addEventListener("click", function () { d.close(); H.confirmar("Cancelar " + e.ID, "El procedimiento quedará cancelado y se avisará a los participantes.", "Cancelar el procedimiento", true).then(function (ok) { if (ok) { H.guardar("Experimentos", [{ ID: e.ID, Estado: "Cancelado" }]); H.toast(e.ID + " cancelado."); } }); });
      } });
  };

  // ============================================================== NUEVO EXPERIMENTO = programar (solo administradores)
  H.acc.nuevoExp = function () {
    if (!H.esAdmin()) { H.toast("Las fechas de los experimentos las programa un administrador.", "error"); return; }
    var n = H.filas("Experimentos").reduce(function (m, e) { return Math.max(m, C.num(e.Numero) || 0); }, 0) + 1, nn = (n < 10 ? "0" : "") + n;
    H.modal({ titulo: "Programar experimento", ancho: true, cuerpo:
      '<div class="rejilla"><div class="campo"><label class="et" for="neNum">Número</label><input id="neNum" type="text" inputmode="numeric" data-num="1" value="' + n + '"><div class="ayuda">ID: <b id="neId">HOME-' + nn + "</b></div></div>" +
      '<div class="campo"><label class="et" for="nePM">Código perfusión (HOME-PM nº)</label><input id="nePM" value="HOME-PM-' + nn + '" autocomplete="off"></div>' +
      '<div class="campo"><label class="et" for="neFase">Fase</label><select id="neFase"><option>Fase 3 · perfusión + trasplante</option><option>Fase 2 · 7 días de perfusión</option><option>Piloto / puesta a punto</option></select></div>' +
      '<div class="campo"><label class="et" for="neProt">Protocolo</label><select id="neProt"><option>CHRONO-LIVER (circadiano)</option><option>HOME estándar (no circadiano)</option></select></div>' +
      '<div class="campo"><label class="et" for="neResp">Responsable</label><input id="neResp" value="' + esc((S.usuario || {}).nombre || "") + '" autocomplete="off"></div></div>' +
      formProg({}, true) + '<p class="muy-tenue">Se crean el donante de sangre (HOME-BD-<span class="nn">' + nn + '</span>) y el donante de hígado (HOME-LD-<span class="nn">' + nn + "</span>); su crotal, sexo y peso se rellenan cuando lleguen. Con fecha provisional se avisa a los participantes; 3 semanas antes se pedirá a los administradores que la confirmen.</p>" +
      '<div class="msg-error" id="pgErr" role="alert"></div>',
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="neOk">' + ico("plus") + "Programar experimento</button>",
      alAbrir: function (d) {
        enlazarFechas(d);
        d.querySelector("#neNum").addEventListener("input", function () { var v = Number(this.value) || 1, s = (v < 10 ? "0" : "") + v; d.querySelector("#neId").textContent = "HOME-" + s; d.querySelector("#nePM").value = "HOME-PM-" + s; H.$$(".nn", d).forEach(function (x) { x.textContent = s; }); });
        d.querySelector("#neOk").addEventListener("click", function () {
          var v = Number(d.querySelector("#neNum").value) || n, s = (v < 10 ? "0" : "") + v, id = "HOME-" + s, o = leerProg(d); o.ID = id;
          if (H.exp(id)) { d.querySelector("#pgErr").textContent = "Ya existe " + id + ". Elige otro número."; return; }
          var err = validarProg(o); if (err) { d.querySelector("#pgErr").textContent = err; return; }
          o.Numero = v; o.Codigo_PM = d.querySelector("#nePM").value.trim(); o.Fase = d.querySelector("#neFase").value; o.Protocolo = d.querySelector("#neProt").value; o.Estado = "Planificado"; o.Responsable = d.querySelector("#neResp").value.trim(); o.Color = C.PALETA[(v - 1) % C.PALETA.length];
          var an = ["BD", "LD"].map(function (r) { return { ID: "HOME-" + r + "-" + s, Experimento: id, Rol: r, Raza: "Landrace × Large White", Fecha_llegada: o.Fecha_llegada || "" }; });
          H.guardar("Experimentos", [o], { sinRepintar: true }); H.guardar("Animales", an, { sinRepintar: true });
          S.medCargada[id] = true; d.close(); H.toast(id + " programado para el " + dma(o.Fecha_cirugia) + " (" + o.Programacion.toLowerCase() + ")."); H.ir("calendario?m=" + o.Fecha_cirugia.slice(0, 7));
        });
      } });
  };

  // ============================================================== DIETA POR QR (celadores, sin sesión)
  var QR = { k: "", datos: null, toma: null, error: "" };
  H.pantallaQR = function () {
    var q = H.ruta().q; QR.k = q.k || ""; QR.datos = null; QR.error = ""; pintarQR();
    publico("webDietaQR", [QR.k]).then(function (r) { if (r && r.ok === false) throw new Error(r.mensaje || "Código QR no válido."); QR.datos = r; if (!QR.toma) QR.toma = new Date().getHours() < 14 ? "1ª toma" : "2ª toma"; pintarQR(); })
      .catch(function (e) { QR.error = e.message || "No se ha podido conectar. Comprueba la conexión y vuelve a escanear el código."; pintarQR(); });
  };
  function racion(a, cfgD) { var en = C.num(a.Peso_kg) ? C.energiaDieta(a.Peso_kg, a.Sexo, a.Castrado, cfgD) : null; return en ? Math.round(en.g_toma) : null; }
  function regDe(animal, fecha, toma) { return ((QR.datos || {}).registros || []).filter(function (r) { return r.Animal === animal && String(r.Fecha).slice(0, 10) === fecha && r.Toma === toma && !(r.Borrado === true || r.Borrado === "TRUE"); })[0]; }
  function si(v) { return v === true || v === "TRUE" || v === "true"; }
  function pintarQR() {
    var d = QR.datos, cuerpo;
    if (QR.error) cuerpo = '<div class="aviso al">' + ico("circle-alert") + "<div>" + esc(QR.error) + '</div></div><button class="bt" id="qrRe">' + ico("refresh-cw") + "Reintentar</button>";
    else if (!d) cuerpo = '<p class="tenue">Cargando…</p>';
    else if (!d.activo) cuerpo = '<div class="aviso info">' + ico("calendar-days") + "<div><b>Ahora no hay ningún procedimiento en curso</b>, así que no hay que registrar tomas.<br>" +
      (d.proximo ? "El próximo procedimiento previsto es el <b>" + esc(dma(d.proximo.fecha).replace(/\//g, ".")) + "</b> (" + (d.proximo.confirmado ? "<b>confirmado</b>" : "<b>pendiente de confirmar</b>") + ")." : "Todavía no hay ninguna fecha prevista.") + "</div></div>";
    else {
      var cfgD = H.mezclar(C.DEF.dieta, d.dieta || {}), ac = C.diaAclimatacion(d.experimento.Fecha_llegada || C.sumarDias(d.experimento.Fecha_cirugia, -C.DEF.programacion.dias_llegada_antes), d.hoy, cfgD) || { dia: d.dia, patron: (d.dia || 2) >= 2 };
      cuerpo = '<p class="qr-exp"><b>' + esc(d.experimento.ID) + "</b> · día " + ac.dia + " de aclimatación · cirugía el " + esc(dma(d.experimento.Fecha_cirugia).replace(/\//g, ".")) + "</p>" +
        '<div class="aviso info">' + ico("droplets") + "<div>Agua limpia y juguetes de enriquecimiento <b>siempre disponibles</b>.</div></div>";
      if (!ac.patron) cuerpo += '<div class="aviso aj">' + ico("info") + "<div><b>Día de llegada.</b> Hoy los animales están juntos y <b>no se aplica el patrón de alimentación</b> (estrés del transporte). Comprueba solo el agua y los juguetes. El registro de tomas empieza mañana, ya separados.</div></div>";
      else {
        var hh = cfgD.horas_tomas || ["09:30", "18:00"];
        cuerpo += '<div class="campo"><label class="et" for="qrNombre">Tu nombre</label><input id="qrNombre" autocomplete="name" value="' + esc(localStorage.getItem("home_qr_nombre") || "") + '" placeholder="Nombre y apellido…"></div>' +
          '<div class="segmentado qr-toma" role="tablist" aria-label="Toma">' + ["1ª toma", "2ª toma"].map(function (t, i) { return '<button role="tab" class="' + (QR.toma === t ? "activo" : "") + '" aria-selected="' + (QR.toma === t) + '" data-qtoma="' + t + '">' + t + ' <span class="muy-tenue">' + esc(hh[i] || "") + "</span></button>"; }).join("") + "</div>" +
          d.animales.map(function (a) {
            var g = racion(a, cfgD), r = regDe(a.ID, d.hoy, QR.toma), val = r && si(r.Validado);
            return '<section class="tarjeta qr-animal" data-animal="' + esc(a.ID) + '"><div class="cabecera"><h2>' + (a.Rol === "LD" ? "Donante de hígado" : "Donante de sangre") + '</h2><span class="chip">' + esc(a.ID + (a.Crotal ? " · " + a.Crotal : "")) + "</span></div>" +
              '<div class="qr-racion"><span class="et">Pienso que hay que poner</span><span class="v">' + (g !== null ? g + " g" : "—") + "</span>" + (g === null ? '<span class="muy-tenue">Falta el peso del animal: pregunta al equipo.</span>' : '<span class="muy-tenue">' + H.n(a.Peso_kg, 1) + " kg · " + esc(cfgD.nombre_pienso || "") + "</span>") + "</div>" +
              (r ? '<div class="aviso ok">' + ico("circle-check") + "<div>Toma registrada a las " + esc(r.Hora || "") + " por " + esc(r.Responsable || "") + (val ? " y validada" : ". Puedes corregirla") + ".</div></div>" : "") +
              '<div class="rejilla dos"><div class="campo"><label class="et">Pienso puesto (g)</label><input inputmode="numeric" data-num="1" name="Ofrecido_g" value="' + esc(r && r.Ofrecido_g !== undefined && r.Ofrecido_g !== "" && r.Ofrecido_g !== null ? r.Ofrecido_g : g !== null ? g : "") + '"' + (val ? " disabled" : "") + "></div>" +
              '<div class="campo"><label class="et">Sobrante de la toma anterior (g)</label><input inputmode="numeric" data-num="1" name="Sobrante_prev" placeholder="0 si no quedaba nada"' + (val ? " disabled" : "") + "></div></div>" +
              '<div class="fila-flex"><label class="check"><input type="checkbox" name="Agua_ok"' + (!r || si(r.Agua_ok) ? " checked" : "") + (val ? " disabled" : "") + '> Agua limpia y disponible</label><label class="check"><input type="checkbox" name="Enriquecimiento_ok"' + (!r || si(r.Enriquecimiento_ok) ? " checked" : "") + (val ? " disabled" : "") + "> Juguetes en el corral</label></div>" +
              '<div class="campo"><label class="et">Observaciones</label><input name="Observaciones" autocomplete="off" placeholder="No come, diarrea, cojera…" value="' + esc(r ? r.Observaciones || "" : "") + '"' + (val ? " disabled" : "") + "></div></section>";
          }).join("") +
          '<div class="rejilla dos"><div class="campo"><label class="et" for="qrT">Temperatura de la sala (°C)</label><input id="qrT" inputmode="decimal" data-num="1"></div><div class="campo"><label class="et" for="qrHR">Humedad (%)</label><input id="qrHR" inputmode="decimal" data-num="1"></div></div>' +
          '<div class="msg-error" id="qrErr" role="alert"></div><button class="bt pri grande" style="width:100%" id="qrOk">' + ico("save") + "Guardar la " + esc(QR.toma) + "</button>";
      }
    }
    document.body.innerHTML = '<div id="toasts" class="toasts" aria-live="polite"></div><main class="acceso qr"><div class="caja ancha">' + H.marcaAccesoHTML() + '<h1 style="text-align:center">Alimentación de los animales</h1>' + cuerpo +
      '<p class="pie">Grupo de Investigación Traslacional e Innovación en Cirugía (GITIC)<br>Hospital Universitario La Paz/IdiPAZ</p></div></main>';
    H.cargarIconos();
    if (H.$("#qrRe")) H.$("#qrRe").addEventListener("click", H.pantallaQR);
    H.$$("[data-qtoma]").forEach(function (b) { b.addEventListener("click", function () { QR.toma = b.getAttribute("data-qtoma"); pintarQR(); }); });
    if (H.$("#qrOk")) H.$("#qrOk").addEventListener("click", guardarQR);
  }
  function guardarQR() {
    var d = QR.datos, err = H.$("#qrErr"), bt = H.$("#qrOk"), nombre = H.$("#qrNombre").value.trim(), hora = H.hora(new Date()), envios = [];
    if (nombre.length < 2) { err.textContent = "Escribe tu nombre para saber quién ha dado la toma."; H.$("#qrNombre").focus(); return; }
    localStorage.setItem("home_qr_nombre", nombre);
    var prevToma = QR.toma === "2ª toma" ? { f: d.hoy, t: "1ª toma" } : { f: C.sumarDias(d.hoy, -1), t: "2ª toma" };
    H.$$(".qr-animal").forEach(function (sec) {
      var a = sec.getAttribute("data-animal"), g = function (n) { return sec.querySelector("[name=" + n + "]"); }; if (g("Ofrecido_g").disabled) return;
      var nuevo = { Animal: a, Fecha: d.hoy, Toma: QR.toma, Hora: hora, Ofrecido_g: C.num(g("Ofrecido_g").value), Agua_ok: g("Agua_ok").checked, Enriquecimiento_ok: g("Enriquecimiento_ok").checked, Responsable: nombre, Observaciones: g("Observaciones").value.trim(), Temperatura_C: C.num(H.$("#qrT").value), Humedad_pct: C.num(H.$("#qrHR").value) };
      envios.push(nuevo);
      var sob = C.num(g("Sobrante_prev").value), rp = regDe(a, prevToma.f, prevToma.t);   // el sobrante pertenece a la toma anterior
      if (sob !== null && rp && !si(rp.Validado)) envios.push({ Animal: a, Fecha: prevToma.f, Toma: prevToma.t, Hora: rp.Hora, Ofrecido_g: C.num(rp.Ofrecido_g), Sobrante_g: sob, Consumido_g: C.num(rp.Ofrecido_g) !== null ? C.num(rp.Ofrecido_g) - sob : null, Agua_ok: si(rp.Agua_ok), Enriquecimiento_ok: si(rp.Enriquecimiento_ok), Responsable: rp.Responsable || nombre, Observaciones: rp.Observaciones || "", _previa: true });
      else if (sob !== null) nuevo.Observaciones = ("Sobrante de la toma anterior: " + sob + " g. " + nuevo.Observaciones).trim();
    });
    if (!envios.length) { err.textContent = "Estas tomas ya están validadas. Avisa a un investigador si hay que corregirlas."; return; }
    if (envios.some(function (x) { return !x._previa && x.Ofrecido_g === null; })) { err.textContent = "Indica los gramos de pienso puestos a cada animal."; return; }
    bt.disabled = true; bt.classList.add("cargando-bt"); err.textContent = "";
    var p = Promise.resolve(); envios.forEach(function (x) { var r = H.copia(x); delete r._previa; p = p.then(function () { return publico("webDietaQRRegistrar", [QR.k, r]).then(function (res) { if (res && res.ok === false) throw new Error(res.mensaje || "No se ha podido guardar."); }).catch(function (e) { if (!x._previa) throw e; }); }); });
    p.then(function () { return publico("webDietaQR", [QR.k]); }).then(function (r) { QR.datos = r; pintarQR(); H.toast("Toma guardada. ¡Gracias!"); })
      .catch(function (e) { bt.disabled = false; bt.classList.remove("cargando-bt"); err.textContent = e.message || "No se ha podido guardar. Comprueba la conexión."; });
  }
  // ---- Configuración → QR de dieta (administradores)
  H.seccionesExtra = H.seccionesExtra || {};
  H.urlQR = function (k) { return location.origin + location.pathname + "#/qr-dieta?k=" + encodeURIComponent(k); };
  H.seccionesExtra.qr = function () {
    if (H._qrClave === undefined) { H._qrClave = null; H.api("webDietaQRClave").then(function (r) { H._qrClave = r.clave; H.repintar(); }).catch(function (e) { H._qrClave = ""; H._qrError = e.message; H.repintar(); }); }
    var k = H._qrClave, url = k ? H.urlQR(k) : "", svg = "";
    if (k && window.qrcode) { try { var q = window.qrcode(0, "M"); q.addData(url); q.make(); svg = q.createSvgTag({ cellSize: 5, margin: 4, scalable: true }); } catch (e) { svg = ""; } }
    var pp = H.proximaPerfusion ? H.proximaPerfusion() : null;
    return '<section class="tarjeta"><div class="cabecera"><h2>Código QR para el registro de la alimentación</h2></div>' +
      '<p class="tenue">Imprime este código y ponlo junto a los corrales. Quien lo escanee (celadores) abre <b>solo</b> la pantalla de registro de tomas, sin usuario ni contraseña. Solo funciona mientras hay un procedimiento confirmado en fase de aclimatación; fuera de ese periodo indica la fecha del próximo procedimiento. Lo que registren queda pendiente de validación.</p>' +
      (k === null ? '<p class="tenue">Cargando el código…</p>' : !k ? '<div class="aviso al">' + ico("circle-alert") + "<div>" + esc(H._qrError || "No se ha podido obtener el código.") + "</div></div>" :
        '<div class="qr-panel imprimible"><div class="qr-img">' + (svg || '<p class="tenue">No se ha podido dibujar el código.</p>') + '</div><div><h3>HOME · Alimentación de los animales</h3><p>Escanea el código con la cámara del móvil y registra cada toma (1ª y 2ª).</p><p class="muy-tenue qr-url">' + esc(url) + "</p></div></div>" +
        '<div class="fila-flex" style="margin-top:10px"><button class="bt pri" data-act="imprimir">' + ico("printer") + 'Imprimir</button><a class="bt" href="' + esc(url) + '" target="_blank" rel="noopener">' + ico("external-link") + 'Abrir la pantalla</a><button class="bt peligro" data-act="qrRegenerar">' + ico("refresh-cw") + "Generar un código nuevo</button></div>" +
        '<p class="muy-tenue" style="margin-top:8px">«Generar un código nuevo» anula el anterior: úsalo si el cartel se pierde o al terminar una serie de experimentos.' + (pp ? " Próximo procedimiento: " + esc(dma(pp.fecha)) + "." : "") + "</p>") + "</section>";
  };
  H.acc.imprimir = function () { document.body.classList.add("imprimiendo"); try { window.print(); } catch (e) { } setTimeout(function () { document.body.classList.remove("imprimiendo"); }, 800); };
  H.acc.qrRegenerar = function () { H.confirmar("Generar un código nuevo", "El código QR actual dejará de funcionar y habrá que imprimir el nuevo.", "Generar", true).then(function (ok) { if (!ok) return; H.api("webDietaQRRegenerar").then(function (r) { H._qrClave = r.clave; H.toast("Código nuevo generado."); H.repintar(); }).catch(function (e) { H.toast(e.message, "error"); }); }); };

  // ============================================================== MI CUENTA · acceso rápido (llave de acceso y contraseña)
  var cuentaOrig = H.vistas.cuenta, CRED = { cargado: 0, passkeys: [], pass: null, error: "" };
  function cargarCred(forzar) {
    if (S.demo) { CRED.cargado = Date.now(); return; }
    if (!forzar && Date.now() - CRED.cargado < 60000) return; CRED.cargado = Date.now();
    Promise.all([H.api("webPasskeys").catch(function (e) { CRED.error = e.message; return { credenciales: [] }; }), H.api("webPasswordEstado").catch(function () { return { tiene: false }; })]).then(function (r) { CRED.passkeys = r[0].credenciales || []; CRED.pass = r[1]; if (H.ruta().partes[0] === "cuenta") H.repintarPronto(); });
  }
  H.vistas.cuenta = function (p, q) {
    cargarCred(false);
    var u = S.usuario || {}, sop = H.passkeySoportado();
    var pk = S.demo ? '<p class="tenue">No disponible en el modo demostración.</p>' :
      (CRED.passkeys.length ? '<ul class="lista-cred">' + CRED.passkeys.map(function (c) { return "<li>" + ico("fingerprint", "s") + " <b>" + esc(c.nombre || "Llave de acceso") + '</b> <span class="muy-tenue">creada el ' + esc(H.fechaDMA(c.creado_en)) + (c.ultimo_uso ? " · último uso " + esc(H.fechaDMA(c.ultimo_uso)) : "") + '</span> <button class="bt mini texto" data-act="pkQuitar" data-id="' + esc(c.id) + '" aria-label="Quitar la llave ' + esc(c.nombre || "") + '">' + ico("trash-2", "s") + "</button></li>"; }).join("") + "</ul>" : '<p class="tenue">Este usuario aún no tiene ninguna llave de acceso.</p>') +
      (sop ? '<button class="bt pri" data-act="pkCrear">' + ico("fingerprint") + "Crear una llave de acceso en este dispositivo</button>" : '<p class="muy-tenue">Este navegador no ofrece llaves de acceso aquí (hace falta abrir la web por https y un dispositivo con Face ID, huella, PIN o Windows Hello).</p>');
    var pw = S.demo ? "" : '<form id="fPass" class="rejilla dos" autocomplete="on"><input class="sr" type="text" name="username" autocomplete="username" value="' + esc(u.email || "") + '" readonly tabindex="-1" aria-hidden="true">' +
      '<div class="campo"><label class="et" for="pwN">' + (CRED.pass && CRED.pass.tiene ? "Cambiar la contraseña" : "Definir una contraseña") + '</label><input id="pwN" type="password" name="new-password" autocomplete="new-password" minlength="10"><div class="ayuda">Mínimo 10 caracteres. El navegador te ofrecerá guardarla.</div></div>' +
      '<div class="campo"><label class="et" for="pwR">Repítela</label><input id="pwR" type="password" autocomplete="new-password"></div></form>' +
      '<div class="fila-flex"><button class="bt" data-act="pwGuardar">' + ico("save") + "Guardar contraseña</button>" + (CRED.pass && CRED.pass.tiene ? '<button class="bt texto" data-act="pwQuitar">Quitar la contraseña</button><span class="chip ok">Contraseña definida</span>' : "") + "</div>";
    var extra = '<section class="tarjeta" id="accesoRapido"><div class="cabecera"><h2>Acceso rápido</h2></div><p class="tenue">Además del código por correo puedes entrar con la <b>llave de acceso</b> del dispositivo (Face ID, huella, PIN o Windows Hello) o con una <b>contraseña</b> que el navegador recuerda. El código por correo sigue funcionando siempre.</p>' +
      '<h3 class="sub">Llaves de acceso</h3>' + pk + (S.demo ? "" : '<h3 class="sub">Contraseña</h3>' + pw) + "</section>";
    var h = cuentaOrig(p, q), i = h.indexOf('<section class="tarjeta"><div class="cabecera"><h2>Avisos en este dispositivo');
    return i === -1 ? h.replace(/<\/div>$/, extra + "</div>") : h.slice(0, i) + extra + h.slice(i);
  };
  H.acc.pkCrear = function (el) { el.disabled = true; H.passkeyCrear().then(function () { H.toast("Llave de acceso creada. La próxima vez entra con «Face ID, huella o llave del dispositivo»."); H.pref("noSugerirAcceso", true); cargarCred(true); }).catch(function (e) { el.disabled = false; H.toast(e && e.name === "NotAllowedError" ? "Se ha cancelado la creación de la llave." : e && e.name === "InvalidStateError" ? "Este dispositivo ya tiene una llave de acceso de HOME." : (e.message || "No se ha podido crear la llave."), "error"); }); };
  H.acc.pkQuitar = function (el) { var id = el.getAttribute("data-id"); H.confirmar("Quitar la llave de acceso", "Ya no se podrá entrar con ella. Puedes crear otra cuando quieras.", "Quitar", true).then(function (ok) { if (ok) H.api("webPasskeyQuitar", id).then(function () { cargarCred(true); H.toast("Llave quitada."); }).catch(function (e) { H.toast(e.message, "error"); }); }); };
  H.acc.pwGuardar = function () {
    var a = H.$("#pwN").value, b = H.$("#pwR").value; if (a.length < 10) { H.toast("La contraseña debe tener al menos 10 caracteres.", "error"); return; } if (a !== b) { H.toast("Las dos contraseñas no coinciden.", "error"); return; }
    H.api("webPasswordDefinir", a).then(function () { H.toast("Contraseña guardada."); H.pref("noSugerirAcceso", true); cargarCred(true); }).catch(function (e) { H.toast(e.message, "error"); });
  };
  H.acc.pwQuitar = function () { H.confirmar("Quitar la contraseña", "Seguirás pudiendo entrar con el código por correo o con una llave de acceso.", "Quitar", true).then(function (ok) { if (ok) H.api("webPasswordQuitar").then(function () { cargarCred(true); H.toast("Contraseña quitada."); }).catch(function (e) { H.toast(e.message, "error"); }); }); };
  H.recargarCredenciales = function () { cargarCred(true); };
})();
