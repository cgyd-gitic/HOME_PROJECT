/* HOME v0.5 (B) · calendario con barras continuas, programación (tipo de procedimiento, versión del protocolo, participantes por
   categoría), lista de experimentos con avisos pendientes y resumen según el estado del experimento. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function cfgP() { return S.cfg.programacion || C.DEF.programacion; }
  function hoyISO() { return C.diaISO(new Date()); }
  function dma(v) { var d = C.aDia(v); return d ? H.fechaDMA(d).replace(/\//g, ".") : ""; }
  function iso(v) { var d = C.aDia(v); return d ? C.diaISO(d) : ""; }
  var CATEGORIAS = (H.CAT_ASIST || []).map(function (c) { return c[1]; }).concat(["Responsable de la perfusión", "Investigador/a", "Otro"]);   // v0.7: los responsables reciben los avisos de su perfusión

  // ============================================================== participantes (objetos {Categoria, Nombre, Email, Usuario_ID})
  function usuariosConocidos() {
    var vistos = {}, out = [];
    H.filas("Usuarios").concat(H.filas("Equipo")).forEach(function (u) { var em = String(u.Email || "").toLowerCase(); var k = em || u.Nombre; if (!k || vistos[k]) return; if (u.Activo === false || u.Activo === "FALSE") return; vistos[k] = 1; out.push({ ID: u.ID, Nombre: u.Nombre || em.split("@")[0], Email: em }); });
    return out;
  }
  H.participantes = function (e) {
    var p = e && e.Participantes; if (!p) return [];
    var l = p; if (!Array.isArray(l)) { try { l = JSON.parse(p); } catch (err) { l = String(p).split(/[,;\s]+/).filter(Boolean); } }
    if (!Array.isArray(l)) return [];
    return l.map(function (x) { if (typeof x === "string") { var em = x.toLowerCase(), u = usuariosConocidos().filter(function (k) { return k.Email === em; })[0]; return { Categoria: "", Nombre: u ? u.Nombre : em.split("@")[0], Email: em, Usuario_ID: u ? u.ID : "" }; } return { Categoria: x.Categoria || "", Nombre: x.Nombre || String(x.Email || "").split("@")[0], Email: String(x.Email || "").toLowerCase(), Usuario_ID: x.Usuario_ID || "" }; });
  };
  H.participo = function (e) { var yo = String((S.usuario || {}).email || "").toLowerCase(); return H.participantes(e).some(function (x) { return x.Email === yo; }); };
  function textoParticipantes(e) {
    var g = {}; H.participantes(e).forEach(function (x) { var c = x.Categoria || "Participantes"; (g[c] = g[c] || []).push(x.Nombre + (x.Email ? "" : " (sin correo)")); });
    return Object.keys(g).map(function (c) { return '<div class="part-cat"><span class="pc-et">' + esc(c) + '</span><span class="pc-n">' + esc(g[c].join(", ")) + "</span></div>"; }).join("");   // v0.6: en columnas alineadas
  }

  // ============================================================== CALENDARIO (barras continuas por fase, como el calendario de Apple)
  var FASES = { aclimatacion: "Llegada y aclimatación", perfusion: "Perfusión", seguimiento: "Trasplante y seguimiento", sacrificio: "Sacrificio" };
  function tramos(e) {
    var hs = C.hitosExperimento(e, cfgP()), h = {}; hs.forEach(function (x) { h[x.tipo] = x.fecha; }); var out = [], tx = C.tipoProc(e) === "trasplante";
    if (h.llegada && h.cirugia && h.llegada < h.cirugia) out.push({ fase: "aclimatacion", a: h.llegada, b: C.sumarDias(h.cirugia, -1) });
    if (h.cirugia) { var fin = tx && h.trasplante ? C.sumarDias(h.trasplante, -1) : (h.fin || C.sumarDias(h.cirugia, cfgP().dias_perfusion)); out.push({ fase: "perfusion", a: h.cirugia, b: fin < h.cirugia ? h.cirugia : fin }); }
    if (tx && h.trasplante) out.push({ fase: "seguimiento", a: h.trasplante, b: h.sacrificio ? C.sumarDias(h.sacrificio, -1) : C.sumarDias(h.trasplante, cfgP().dias_seguimiento - 1) });
    if (tx && h.sacrificio) out.push({ fase: "sacrificio", a: h.sacrificio, b: h.sacrificio });
    return out;
  }
  H.vistas.calendario = function (p, q) {
    var hoy = new Date(), m = /^\d{4}-\d{2}$/.test(q.m || "") ? q.m : hoy.getFullYear() + "-" + (hoy.getMonth() < 9 ? "0" : "") + (hoy.getMonth() + 1), a = +m.slice(0, 4), mes = +m.slice(5) - 1;
    var prim = new Date(a, mes, 1), ini = new Date(a, mes, 1 - ((prim.getDay() + 6) % 7)), exps = H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.Fecha_cirugia; });
    function mesRel(n) { var d = new Date(a, mes + n, 1); return d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1); }
    var nombreMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(prim), semanas = "", todos = [];
    exps.forEach(function (e) { tramos(e).forEach(function (t) { t.e = e; todos.push(t); }); });
    for (var w = 0; w < 6; w++) {
      var d0 = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + w * 7); if (w >= 4 && d0.getMonth() !== mes && d0 > prim) break;
      var dias = [], i0 = C.diaISO(d0), i6 = C.sumarDias(i0, 6);
      for (var i = 0; i < 7; i++) dias.push(C.sumarDias(i0, i));
      var segs = todos.filter(function (t) { return t.a <= i6 && t.b >= i0; }).map(function (t) { var a1 = t.a < i0 ? i0 : t.a, b1 = t.b > i6 ? i6 : t.b; return { t: t, c0: C.diasEntre(i0, a1), c1: C.diasEntre(i0, b1), izq: t.a < i0, der: t.b > i6 }; })
        .sort(function (x, y) { return x.c0 - y.c0 || String(x.t.e.Fecha_cirugia).localeCompare(String(y.t.e.Fecha_cirugia)); });
      var carriles = []; segs.forEach(function (s) { for (var k = 0; ; k++) { if (!carriles[k] || carriles[k] < s.c0) { carriles[k] = s.c1; s.carril = k; break; } } });
      var nC = Math.max(2, carriles.length), celdas = dias.map(function (di, j) { var dd = C.aDia(di); return '<div class="cal-dia' + (dd.getMonth() !== mes ? " fuera" : "") + (di === hoyISO() ? " hoy" : "") + '" style="grid-column:' + (j + 1) + '"><span class="n">' + dd.getDate() + "</span></div>"; }).join("");
      var barras = segs.map(function (s) {
        var e = s.t.e, prov = H.esProvisional(e), etq = e.ID + " · " + FASES[s.t.fase];
        return '<a class="cal-barra f-' + s.t.fase + (prov ? " prov" : "") + (s.izq ? " sigue-izq" : "") + (s.der ? " sigue-der" : "") + '" style="grid-column:' + (s.c0 + 1) + " / " + (s.c1 + 2) + ";grid-row:" + (s.carril + 2) + '" href="#/exp/' + encodeURIComponent(e.ID) + '" title="' + esc(etq + " · " + dma(s.t.a) + (s.t.a !== s.t.b ? "–" + dma(s.t.b) : "") + (prov ? " · fecha provisional" : " · confirmado")) + '"><span>' + esc(s.t.fase === "sacrificio" ? e.ID.replace("HOME-", "") + " · Sacrificio" : (s.izq ? e.ID : etq)) + "</span></a>";
      }).join("");
      semanas += '<div class="cal-semana" style="grid-template-rows:30px repeat(' + nC + ',24px) 6px">' + celdas + barras + "</div>";
    }
    var prox = H.expProgramados().filter(function (e) { var hs = C.hitosExperimento(e, cfgP()), fin = hs.length ? hs[hs.length - 1].fecha : e.Fecha_cirugia; return C.diasEntre(hoyISO(), fin) >= -3; });
    return '<div class="ancho"><div class="titulo-pag"><h1>Calendario</h1>' + (H.esAdmin() ? '<button class="bt pri" data-act="nuevoExp">' + ico("plus") + "Programar experimento</button>" : "") + "</div>" +
      '<section class="tarjeta cal-tarjeta"><div class="cabecera cal-nav"><a class="bt ico-solo" href="#/calendario?m=' + mesRel(-1) + '" aria-label="Mes anterior">' + ico("chevron-left") + '</a><h2>' + esc(nombreMes) + '</h2><a class="bt ico-solo" href="#/calendario?m=' + mesRel(1) + '" aria-label="Mes siguiente">' + ico("chevron-right") + '</a><a class="bt texto" href="#/calendario">Hoy</a></div>' +
      '<div class="cal2" aria-label="' + esc(nombreMes) + '"><div class="cal-cabs">' + ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(function (x) { return "<span>" + x + "</span>"; }).join("") + "</div>" + semanas + "</div>" +
      '<div class="cal-leyenda">' + Object.keys(FASES).map(function (f) { return '<span><i class="cal-barra f-' + f + '"></i>' + FASES[f] + "</span>"; }).join("") + '<span><i class="cal-barra f-perfusion prov"></i>Fecha provisional</span><span><i class="cal-barra f-perfusion"></i>Fecha confirmada</span></div></section>' +
      '<section class="tarjeta"><div class="cabecera"><h2>Procedimientos programados</h2>' + H.botonInfo("Al programar una fecha provisional se avisa a los participantes. Tres semanas antes, los administradores reciben el aviso para confirmarla; al confirmar, los participantes reciben la cita para su calendario y un recordatorio una semana antes de cada procedimiento.") + "</div>" + (prox.length ? '<div class="progs">' + prox.map(tarjetaProg).join("") + "</div>" : '<p class="tenue">No hay procedimientos programados.' + (H.esAdmin() ? " Usa «Programar experimento» para reservar las fechas." : "") + "</p>") +
      "</section></div>";
  };
  function pasado(e) { var hs = C.hitosExperimento(e, cfgP()); var fin = hs.length ? hs[hs.length - 1].fecha : e.Fecha_cirugia; return C.diasEntre(hoyISO(), fin) < 0 || e.Estado === "Finalizado"; }
  H.expPasado = pasado;
  function tarjetaProg(e) {
    var hitos = C.hitosExperimento(e, cfgP()), dias = C.diasEntre(hoyISO(), e.Fecha_cirugia), prov = H.esProvisional(e), id = esc(e.ID), sinCorreo = H.participantes(e).filter(function (x) { return !x.Email; }).length;
    var aviso = prov && dias !== null && dias >= 0 && dias <= cfgP().confirmar_dias_antes ? '<div class="aviso aj">' + ico("triangle-alert") + "<div>Faltan " + dias + " días y la fecha sigue siendo provisional: hay que confirmarla o moverla.</div></div>" : "";
    return '<article class="prog' + (prov ? " prov" : "") + '"><div class="prog-cab"><div class="prog-tit"><b><a href="#/exp/' + encodeURIComponent(e.ID) + '">' + id + "</a></b>" + (prov ? '<span class="chip aj">Fecha provisional</span>' : '<span class="chip ok">Confirmado</span>') + '<span class="chip">' + esc(C.nombreTipo(e)) + '</span><span class="chip">Protocolo ' + esc(H.versionExp(e)) + "</span>" + (H.participo(e) ? '<span class="chip pri">Participas</span>' : "") + "</div>" +
      '<div class="prog-acc">' + (H.esAdmin() && prov ? '<button class="bt pri" data-act="progConfirmar" data-id="' + id + '">' + ico("check") + "Confirmar</button>" : "") + (H.esAdmin() ? '<button class="bt" data-act="progEditar" data-id="' + id + '">' + ico("pencil") + "Editar</button>" : "") +
      (pasado(e) ? "" : '<button class="bt" data-act="progICS" data-id="' + id + '">' + ico("calendar-days") + "Añadir a mi calendario</button>") + "</div></div>" +
      '<div class="hitos h' + hitos.length + '">' + hitos.map(function (h) { var d = C.diasEntre(hoyISO(), h.fecha); return '<div class="hito f-' + h.tipo + '"><div class="et">' + esc(h.nombre) + '</div><div class="f">' + esc(dma(h.fecha)) + '</div><div class="muy-tenue">' + (d === 0 ? "hoy" : d > 0 ? "en " + d + " días" : "hace " + (-d) + " días") + "</div></div>"; }).join("") + "</div>" +
      '<div class="prog-part">' + ico("users", "s") + (H.participantes(e).length ? '<div class="part-lista">' + textoParticipantes(e) + "</div>" : '<span class="tenue">Sin participantes asignados</span>') + "</div>" +
      (sinCorreo && H.esAdmin() ? '<div class="aviso aj">' + ico("mail") + "<div>" + sinCorreo + " participante(s) sin correo no recibirán los avisos. Añádelo en «Editar».</div></div>" : "") + aviso + "</article>";
  }
  H.acc.progICS = function (el) { var e = H.exp(el.getAttribute("data-id")); if (!e || pasado(e)) return; H.descargar(e.ID + ".ics", C.icsExperimento(e, cfgP()), "text/calendar"); H.toast("Abre el archivo descargado para añadir las fechas a tu calendario."); };

  // ============================================================== formulario de programación
  function campoFecha(id, et, v, ayuda, ro) { return '<div class="campo"><label class="et" for="' + id + '">' + et + '</label><input id="' + id + '" type="date" value="' + esc(iso(v)) + '"' + (ro ? " readonly" : "") + ">" + '<div class="ayuda">' + (ayuda || "&nbsp;") + "</div></div>"; }
  function filaPart(x, i) {
    return '<div class="part-fila" data-i="' + i + '"><div class="campo"><label class="et" for="ppC' + i + '">Categoría</label><select id="ppC' + i + '" class="ppC">' + CATEGORIAS.map(function (c) { return "<option" + (c === x.Categoria ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div>" +
      '<div class="campo"><label class="et" for="ppN' + i + '">Nombre</label><input id="ppN' + i + '" class="ppN" list="ppUsuarios" autocomplete="off" value="' + esc(x.Nombre || "") + '" placeholder="Escribe para buscar…"></div>' +
      '<div class="campo"><label class="et" for="ppE' + i + '">Correo</label><input id="ppE' + i + '" class="ppE" type="email" autocomplete="off" spellcheck="false" value="' + esc(x.Email || "") + '"' + (x.Usuario_ID ? " readonly" : "") + ' placeholder="nombre@…"></div>' +
      '<button type="button" class="bt ico-solo texto ppQuitar" aria-label="Quitar participante">' + ico("x") + '</button><div class="part-aviso" role="status"></div></div>';
  }
  function formProg(e, nuevo) {
    var tipo = nuevo ? "trasplante" : C.tipoProc(e), ver = nuevo ? C.versionActual() : H.versionExp(e), part = H.participantes(e), us = usuariosConocidos();
    var tipos = [["puesta", C.TIPOS_PROC[0]], ["perfusion", C.TIPOS_PROC[1]], ["trasplante", C.TIPOS_PROC[2]]];
    return '<fieldset class="campo pg-tipo"><legend class="et">Tipo de procedimiento</legend><div class="segmentado ancho-total" role="radiogroup">' + tipos.map(function (t) { return '<label class="seg-op"><input type="radio" name="pgTipo" value="' + t[0] + '"' + (t[0] === tipo ? " checked" : "") + "><span>" + esc(t[1]) + "</span></label>"; }).join("") + "</div></fieldset>" +
      '<div class="rejilla dos pg-rejilla"><div class="campo"><label class="et" for="pgProt">Versión del protocolo</label><select id="pgProt">' + C.VERSIONES.map(function (v) { var p = C.PROTOCOLOS[v]; return '<option value="' + v + '"' + (v === ver ? " selected" : "") + ">" + v + " · " + esc(p.propuesto ? "propuesto" : p.ref) + "</option>"; }).join("") + '</select><div class="ayuda" id="pgProtA">' + esc((C.PROTOCOLOS[ver] || {}).notas || "") + "</div></div>" +
      '<div class="campo"><label class="et" for="pgEst">Estado de la fecha</label><select id="pgEst"><option' + (nuevo || e.Programacion === "Provisional" ? " selected" : "") + ">Provisional</option><option" + (!nuevo && e.Programacion !== "Provisional" ? " selected" : "") + '>Confirmado</option>' + (!nuevo && e.Programacion === "Histórico" ? '<option selected value="Histórico">Histórico (perfusión anterior)</option>' : "") + '</select><div class="ayuda">' + (!nuevo && e.Programacion === "Histórico" ? "Registro de una perfusión anterior: no se envían avisos." : "Confirmado envía la cita a los participantes.") + "</div></div>" +
      campoFecha("pgLl", "Llegada prevista de los animales", e.Fecha_llegada || (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -cfgP().dias_llegada_antes) : ""), cfgP().dias_llegada_antes + " días antes de la hepatectomía") +
      campoFecha("pgQx", "Hepatectomía e inicio de la perfusión", e.Fecha_cirugia, "Las demás fechas se calculan a partir de esta") +
      '<div class="pg-tx' + (tipo === "trasplante" ? "" : " oculto") + '">' + campoFecha("pgTx", "Trasplante del injerto", e.Fecha_trasplante, "Tras " + cfgP().dias_perfusion + " días de perfusión") + "</div>" +
      '<div class="pg-tx' + (tipo === "trasplante" ? "" : " oculto") + '">' + campoFecha("pgSa", "Sacrificio", e.Fecha_sacrificio, "Tras " + cfgP().dias_seguimiento + " días de seguimiento") + "</div>" +
      '<div class="pg-fin' + (tipo === "trasplante" ? " oculto" : "") + '">' + campoFecha("pgFin", "Fin de la perfusión prevista", C.finPerfusionPrevista(e, cfgP()), cfgP().dias_perfusion + " días de perfusión", true) + "</div></div>" +
      '<fieldset class="campo pg-part"><legend class="et">Participantes</legend><datalist id="ppUsuarios">' + us.map(function (u) { return '<option value="' + esc(u.Nombre) + '">' + esc(u.Email) + "</option>"; }).join("") + '</datalist><div id="ppLista">' + (part.length ? part : [{ Categoria: CATEGORIAS[0], Nombre: "", Email: "" }]).map(filaPart).join("") + '</div><button type="button" class="bt mini" id="ppAnadir">' + ico("plus", "s") + "Añadir participante</button>" +
      '<p class="muy-tenue">Si la persona está registrada en HOME, elígela de la lista y el correo se rellena solo. Si no lo está, escribe su correo para que reciba los avisos por correo electrónico.</p></fieldset>';
  }
  function enlazarProg(d) {
    var tocadas = {}; ["pgLl", "pgTx", "pgSa"].forEach(function (k) { d.querySelector("#" + k).addEventListener("change", function () { tocadas[k] = true; }); });
    function tipo() { var r = d.querySelector("input[name=pgTipo]:checked"); return r ? r.value : "perfusion"; }
    function auto() {
      var P = C.fechasPrograma(d.querySelector("#pgQx").value, cfgP()); if (!P) return;
      if (!tocadas.pgLl) d.querySelector("#pgLl").value = P.llegada; if (!tocadas.pgTx) d.querySelector("#pgTx").value = P.trasplante; if (!tocadas.pgSa) d.querySelector("#pgSa").value = P.sacrificio;
      d.querySelector("#pgFin").value = C.sumarDias(P.cirugia, cfgP().dias_perfusion);
    }
    function verTipo() { var tx = tipo() === "trasplante"; H.$$(".pg-tx", d).forEach(function (x) { x.classList.toggle("oculto", !tx); }); H.$$(".pg-fin", d).forEach(function (x) { x.classList.toggle("oculto", tx); }); }
    H.$$("input[name=pgTipo]", d).forEach(function (r) { r.addEventListener("change", verTipo); });
    d.querySelector("#pgQx").addEventListener("change", auto); d.querySelector("#pgQx").addEventListener("input", auto);
    d.querySelector("#pgProt").addEventListener("change", function () { d.querySelector("#pgProtA").textContent = (C.PROTOCOLOS[this.value] || {}).notas || ""; });
    var us = usuariosConocidos();
    function revisar(fila) {
      var n = fila.querySelector(".ppN").value.trim(), e = fila.querySelector(".ppE"), av = fila.querySelector(".part-aviso"), u = us.filter(function (x) { return x.Nombre.toLowerCase() === n.toLowerCase(); })[0];
      if (u) { e.value = u.Email; e.readOnly = true; fila.setAttribute("data-uid", u.ID || ""); av.innerHTML = ""; av.className = "part-aviso"; }
      else { if (e.readOnly) { e.value = ""; e.readOnly = false; } fila.removeAttribute("data-uid"); av.className = "part-aviso" + (n && !e.value.trim() ? " aj" : "");
        av.innerHTML = n && !e.value.trim() ? ico("mail", "s") + " " + esc(n) + " no está registrado: introduce su correo para enviarle la notificación." : n && e.value.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.value.trim()) ? ico("triangle-alert", "s") + " El correo no parece válido." : ""; }
    }
    function enlazarFila(fila) {
      fila.querySelector(".ppN").addEventListener("change", function () { revisar(fila); }); fila.querySelector(".ppN").addEventListener("input", function () { revisar(fila); });
      fila.querySelector(".ppE").addEventListener("input", function () { revisar(fila); });
      fila.querySelector(".ppQuitar").addEventListener("click", function () { fila.remove(); });
      revisar(fila);
    }
    H.$$(".part-fila", d).forEach(enlazarFila);
    d.querySelector("#ppAnadir").addEventListener("click", function () { var l = d.querySelector("#ppLista"), i = Date.now() % 1e6, t = document.createElement("div"); t.innerHTML = filaPart({ Categoria: CATEGORIAS[0] }, i); var f = t.firstChild; l.appendChild(f); enlazarFila(f); f.querySelector(".ppN").focus(); });
    verTipo(); return { auto: auto, tipo: tipo };
  }
  function leerProg(d) {
    var tipo = (d.querySelector("input[name=pgTipo]:checked") || {}).value || "perfusion", tx = tipo === "trasplante";
    var o = { Fase: { puesta: C.TIPOS_PROC[0], perfusion: C.TIPOS_PROC[1], trasplante: C.TIPOS_PROC[2] }[tipo], Protocolo: d.querySelector("#pgProt").value, Fecha_cirugia: d.querySelector("#pgQx").value, Fecha_llegada: d.querySelector("#pgLl").value,
      Fecha_trasplante: tx ? d.querySelector("#pgTx").value : "", Fecha_sacrificio: tx ? d.querySelector("#pgSa").value : "", Programacion: d.querySelector("#pgEst").value };
    var vistos = {}; o.Participantes = JSON.stringify(H.$$(".part-fila", d).map(function (f) { return { Categoria: f.querySelector(".ppC").value, Nombre: f.querySelector(".ppN").value.trim(), Email: f.querySelector(".ppE").value.trim().toLowerCase(), Usuario_ID: f.getAttribute("data-uid") || "" }; })
      .filter(function (x) { var k = x.Email || (x.Nombre + "|" + x.Categoria); if (!x.Nombre || vistos[k]) return false; vistos[k] = 1; return true; }));
    return o;
  }
  function validarProg(o) {
    if (!o.Fecha_cirugia) return "Indica la fecha de la hepatectomía y del inicio de la perfusión.";
    if (o.Fecha_llegada && o.Fecha_llegada > o.Fecha_cirugia) return "Los animales no pueden llegar después de la cirugía.";
    if (o.Fecha_trasplante && o.Fecha_trasplante < o.Fecha_cirugia) return "El trasplante no puede ser anterior a la perfusión.";
    if (o.Fecha_sacrificio && o.Fecha_trasplante && o.Fecha_sacrificio < o.Fecha_trasplante) return "El sacrificio no puede ser anterior al trasplante.";
    var malos = JSON.parse(o.Participantes).filter(function (x) { return x.Email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.Email); }); if (malos.length) return "Revisa el correo de " + malos[0].Nombre + ".";
    var choca = H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.ID !== o.ID && e.Fecha_cirugia && /^(cirugia|perfusion|trasplante|fin)$/.test(C.faseDia(e, o.Fecha_cirugia, cfgP()) || ""); })[0];
    return choca ? "Ese día coincide con la perfusión de " + choca.ID + ": los experimentos no se solapan." : "";
  }
  H.acc.progEditar = function (el) {
    var e = H.exp(el.getAttribute("data-id")); if (!e || !H.esAdmin()) return;
    H.modal({ titulo: "Programación · " + e.ID, ancho: true, cuerpo: formProg(e, false) + '<div class="msg-error" id="pgErr" role="alert"></div>',
      pie: '<button class="bt peligro" id="pgCancelar">Cancelar el procedimiento</button><span class="empuja"></span><button class="bt" data-cerrar>Cerrar</button><button class="bt pri" id="pgOk">Guardar</button>',
      alAbrir: function (d) {
        enlazarProg(d);
        d.querySelector("#pgOk").addEventListener("click", function () { var o = leerProg(d); o.ID = e.ID; var err = validarProg(o); if (err) { d.querySelector("#pgErr").textContent = err; return; } H.guardar("Experimentos", [o]); d.close(); H.toast("Programación de " + e.ID + " guardada."); });
        d.querySelector("#pgCancelar").addEventListener("click", function () { d.close(); H.confirmar("Cancelar " + e.ID, "El procedimiento quedará cancelado y se avisará a los participantes.", "Cancelar el procedimiento", true).then(function (ok) { if (ok) { H.guardar("Experimentos", [{ ID: e.ID, Estado: "Cancelado" }]); H.toast(e.ID + " cancelado."); } }); });
      } });
  };
  H.acc.nuevoExp = function () {
    if (!H.esAdmin()) { H.toast("Las fechas de los experimentos las programa un administrador.", "error"); return; }
    var n = H.filas("Experimentos").reduce(function (m, e) { return Math.max(m, C.num(e.Numero) || 0); }, 0) + 1, nn = (n < 10 ? "0" : "") + n;
    H.modal({ titulo: "Programar experimento", ancho: true, cuerpo:
      '<div class="rejilla tres pg-rejilla"><div class="campo"><label class="et" for="neNum">Número</label><input id="neNum" type="text" inputmode="numeric" data-num="1" value="' + n + '"><div class="ayuda">ID: <b id="neId">HOME-' + nn + "</b></div></div>" +
      '<div class="campo"><label class="et" for="nePM">Código de la perfusión</label><input id="nePM" value="HOME-PM-' + nn + '" autocomplete="off"><div class="ayuda">HOME-PM nº</div></div>' +
      '<div class="campo"><label class="et" for="neResp">Responsable</label><input id="neResp" value="' + esc((S.usuario || {}).nombre || "") + '" autocomplete="off"><div class="ayuda">&nbsp;</div></div></div>' +
      formProg({}, true) + '<p class="muy-tenue">Se crean el donante de sangre (HOME-BD-<span class="nn">' + nn + '</span>) y el donante de hígado (HOME-LD-<span class="nn">' + nn + "</span>), hermanos y del mismo sexo; su crotal, sexo y peso se rellenan cuando lleguen.</p>" +
      '<div class="msg-error" id="pgErr" role="alert"></div>',
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="neOk">' + ico("plus") + "Programar experimento</button>",
      alAbrir: function (d) {
        enlazarProg(d);
        d.querySelector("#neNum").addEventListener("input", function () { var v = Number(this.value) || 1, s = (v < 10 ? "0" : "") + v; d.querySelector("#neId").textContent = "HOME-" + s; d.querySelector("#nePM").value = "HOME-PM-" + s; H.$$(".nn", d).forEach(function (x) { x.textContent = s; }); });
        d.querySelector("#neOk").addEventListener("click", function () {
          var v = Number(d.querySelector("#neNum").value) || n, s = (v < 10 ? "0" : "") + v, id = "HOME-" + s, o = leerProg(d); o.ID = id;
          if (H.exp(id)) { d.querySelector("#pgErr").textContent = "Ya existe " + id + ". Elige otro número."; return; }
          var err = validarProg(o); if (err) { d.querySelector("#pgErr").textContent = err; return; }
          o.Numero = v; o.Codigo_PM = d.querySelector("#nePM").value.trim(); o.Estado = "Planificado"; o.Responsable = d.querySelector("#neResp").value.trim(); o.Color = C.PALETA[(v - 1) % C.PALETA.length];
          var an = ["BD", "LD"].map(function (r) { return { ID: "HOME-" + r + "-" + s, Experimento: id, Rol: r, Raza: "Landrace × Large White", Fecha_llegada: o.Fecha_llegada || "" }; });
          H.guardar("Experimentos", [o], { sinRepintar: true }); H.guardar("Animales", an, { sinRepintar: true });
          S.medCargada[id] = true; d.close(); H.toast(id + " programado para el " + dma(o.Fecha_cirugia) + " (" + o.Programacion.toLowerCase() + ")."); H.ir("calendario?m=" + o.Fecha_cirugia.slice(0, 7));
        });
      } });
  };
  H.progResumen = function (e) {
    var hs = C.hitosExperimento(e, cfgP());
    return '<div class="prog-resumen">' + (H.esProvisional(e) ? '<span class="chip aj">Fecha provisional</span>' : '<span class="chip ok">Confirmado</span>') + hs.map(function (h) { return '<span class="chip">' + esc(h.nombre) + ": <b>" + esc(dma(h.fecha)) + "</b></span>"; }).join("") + "</div>";
  };

  // ============================================================== LISTA DE EXPERIMENTOS (con avisos pendientes)
  function avisosPend(id) { var ahora = Date.now(); return H.filas("Avisos").filter(function (a) { return a.Experimento === id && a.Estado === "Pendiente" && C.aFecha(a.Fecha_hora) && C.aFecha(a.Fecha_hora).getTime() > ahora; }).length; }
  H.avisosPendientesExp = avisosPend;
  H.vistas.experimentos = function (p, q) {
    var filtro = q.estado || "", txt = (q.q || "").toLowerCase();
    var l = H.listaExp().filter(function (e) { return (!filtro || e.Estado === filtro) && (!txt || JSON.stringify(e).toLowerCase().indexOf(txt) !== -1); });
    var estados = ["", "Planificado", "Aclimatación", "Cirugía", "Perfusión", "Finalizado", "Cancelado"], conAv = l.filter(function (e) { return avisosPend(e.ID); }).length;
    return '<div class="ancho"><div class="titulo-pag"><h1>Experimentos</h1>' + (H.esAdmin() ? '<button class="bt pri" data-act="nuevoExp">' + ico("plus") + "Programar experimento</button>" : "") + "</div>" +
      '<div class="barra-filtros"><div class="campo"><label class="sr" for="buscaExp">Buscar</label><input id="buscaExp" type="search" placeholder="Buscar por ID, crotal, notas…" value="' + esc(q.q || "") + '" data-cambio="filtrarExp" autocomplete="off"></div>' +
      '<div class="campo"><label class="sr" for="estExp">Estado</label><select id="estExp" data-cambio="filtrarExp">' + estados.map(function (s) { return '<option value="' + s + '"' + (s === filtro ? " selected" : "") + ">" + (s || "Todos los estados") + "</option>"; }).join("") + "</select></div>" +
      '<a class="bt" href="#/exportar">' + ico("download") + "Exportar</a></div>" +
      (conAv ? '<p class="muy-tenue">' + ico("bell", "s") + " " + conAv + " experimento(s) con avisos pendientes (campana junto al ID).</p>" : "") +
      (l.length ? '<div class="tabla-env"><table class="t lista-exp"><thead><tr><th>ID</th><th>Estado</th><th>Tipo</th><th>Protocolo</th><th>Cirugía</th><th>Donante de hígado</th><th class="num">Hígado (g)</th><th class="num">Isq. caliente</th><th class="num">Isq. fría</th><th class="num">Duración</th></tr></thead><tbody>' +
        l.map(function (e) {
          var an = H.animales(e.ID), ld = an.LD || {}, t = C.tiempos(H.eventos(e.ID)), av = avisosPend(e.ID);
          return '<tr class="clic" data-act="abrirExp" data-id="' + esc(e.ID) + '"><td class="id-exp"><span class="punto-color" style="background:' + esc(H.colorExp(e.ID)) + '"></span> <a href="#/exp/' + encodeURIComponent(e.ID) + '">' + esc(e.ID) + "</a>" + (av ? '<span class="chip-aviso" title="' + av + ' aviso(s) pendientes" aria-label="' + av + ' avisos pendientes">' + ico("bell", "s") + av + "</span>" : "") + "</td><td>" + H.estadoChip(e.Estado) + "</td><td>" + esc(C.nombreTipo(e)) + "</td><td>" + esc(H.versionExp(e)) + "</td><td>" + esc(dma(e.Fecha_cirugia)) + "</td>" +
            "<td>" + (ld.ID ? esc([ld.Crotal ? "crotal " + ld.Crotal : "", ld.Sexo === "H" ? "hembra" : ld.Sexo === "M" ? "macho" : "", ld.Peso_llegada_kg ? H.n(ld.Peso_llegada_kg, 1) + " kg" : ""].filter(Boolean).join(" · ") || "—") : "—") + '</td><td class="num">' + H.n(e.Peso_higado_inicial_g, 0) + '</td><td class="num">' + C.duracionTxt(t.isquemia_caliente_min) + '</td><td class="num">' + C.duracionTxt(t.isquemia_fria_min) + "</td>" +
            '<td class="num">' + (t.duracion_perfusion_h !== null ? H.n(t.duracion_perfusion_h, 1) + " h" : e.Estado === "Perfusión" ? '<span class="chip pri">en curso</span>' : "—") + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="vacio">No hay experimentos con esos filtros.</div>') + "</div>";
  };

  // ============================================================== RESUMEN según el estado del experimento
  function finalizado(e) { return e.Estado === "Finalizado" || !!(H.eventos(e.ID).fin_perfusion || e.Fin_perfusion); }
  function iniciado(e) { return ["Cirugía", "Perfusión"].indexOf(e.Estado) !== -1 || !!H.inicioPerf(e.ID) || finalizado(e); }
  function animalesLlegaron(e) { var ll = e.Fecha_llegada || (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -cfgP().dias_llegada_antes) : ""); return e.Estado === "Aclimatación" || (ll && C.diasEntre(ll, hoyISO()) >= 0); }
  H.expFinalizado = finalizado; H.expIniciado = iniciado; H.animalesLlegaron = animalesLlegaron;
  function kpi(et, v, u) { return '<div class="kpi"><div class="et">' + et + '</div><div class="v">' + (v === null || v === "" || v === undefined ? "—" : v) + (u && v !== null && v !== "" && v !== undefined ? "<small>" + u + "</small>" : "") + "</div></div>"; }
  function campoE(e, k, et, o) { var h = H.campo(k, et, e[k], Object.assign({}, o || {}, { acc: "campoExp" })); return h.replace('data-cambio="campoExp"', 'data-cambio="campoExp" data-id="' + esc(e.ID) + '"'); }
  function cronologia(e) {
    var evs = H.filas("Eventos").filter(function (x) { return x.Experimento === e.ID; }).sort(function (a, b) { return String(a.Fecha_hora).localeCompare(String(b.Fecha_hora)); }), t0 = H.inicioPerf(e.ID);
    return '<section class="tarjeta"><div class="cabecera"><h2>Cronología</h2>' + (H.puede("registrar") && iniciado(e) ? '<a class="bt" href="#/exp/' + encodeURIComponent(e.ID) + '/seguimiento/perf/registro">' + ico("plus") + "Añadir evento</a>" : "") + "</div>" +
      (evs.length ? '<ol class="cronologia">' + evs.map(function (x) { var h = t0 ? C.horasEntre(t0, x.Fecha_hora) : null; return '<li><time>' + esc(H.diaCorto(x.Fecha_hora) + " " + H.hora(x.Fecha_hora)) + '</time><span class="t-rel">' + (h !== null ? (h < 0 ? "−" : "T+") + esc(C.duracionTxt(Math.abs(h) * 60)) : "") + "</span><b>" + esc(H.nombreEvento(x.Tipo)) + "</b>" + (x.Nota ? '<span class="nota">' + esc(x.Nota) + "</span>" : "") + "</li>"; }).join("") + "</ol>" : '<p class="tenue">Sin eventos registrados.</p>') + "</section>";
  }
  H.tabsExp.resumen = function (e) {
    var id = encodeURIComponent(e.ID), pend = avisosPend(e.ID), avisoPend = pend ? '<div class="aviso info">' + ico("bell") + "<div><b>" + pend + " aviso(s) pendientes</b> para este experimento. <a href=\"#/exp/" + id + '/seguimiento/perf/plan">Ver los avisos</a></div></div>' : "";
    var ll = e.Fecha_llegada || (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -cfgP().dias_llegada_antes) : "");
    if (!iniciado(e) && !animalesLlegaron(e)) {
      var msg = H.esProvisional(e) ? "<b>Este procedimiento está pendiente de confirmar</b> y todavía no contiene datos para revisar. Cuando un administrador confirme la fecha, recibirás la cita y aquí verás las fechas definitivas."
        : "<b>Este procedimiento está programado para el " + esc(dma(e.Fecha_cirugia)) + ".</b> Los datos aparecerán cuando los animales lleguen al estabulario" + (ll ? " (llegada prevista el " + esc(dma(ll)) + ")" : "") + "; te avisaremos con una notificación y un correo cuando la pestaña esté disponible.";
      return '<div class="estado-exp ' + (H.esProvisional(e) ? "prov" : "conf") + '">' + ico(H.esProvisional(e) ? "calendar-clock" : "calendar-check", "l") + "<p>" + msg + "</p>" + H.progResumen(e) +
        (pasado(e) ? "" : '<div class="fila-flex centro"><button class="bt" data-act="progICS" data-id="' + esc(e.ID) + '">' + ico("calendar-days") + "Añadir a mi calendario</button>" + (H.esAdmin() ? '<button class="bt" data-act="progEditar" data-id="' + esc(e.ID) + '">' + ico("pencil") + "Editar la programación</button>" : "") + "</div>") + "</div>" + avisoPend;
    }
    var an = H.animales(e.ID), ev = H.eventos(e.ID), t = C.tiempos(ev), cierre = H.form(e.ID, "cierre", "") || {}, pi = C.num(e.Peso_higado_inicial_g), pf = C.num(e.Peso_higado_final_g), puedo = H.puede("registrar");
    var kp = '<div class="kpis kpis-resumen">' + kpi("Isquemia caliente", t.isquemia_caliente_min !== null ? C.duracionTxt(t.isquemia_caliente_min) : null) + kpi("Isquemia fría", t.isquemia_fria_min !== null ? C.duracionTxt(t.isquemia_fria_min) : null) +
      kpi("Duración de la perfusión", t.duracion_perfusion_h !== null ? H.n(t.duracion_perfusion_h, 1) : (H.inicioPerf(e.ID) ? '<span data-transcurrido="' + esc(H.inicioPerf(e.ID)) + '"></span>' : null), t.duracion_perfusion_h !== null ? "h" : "") +
      kpi("Peso del hígado", pi ? H.n(pi, 0) + (pf ? " → " + H.n(pf, 0) : "") : null, "g") + "</div>";
    var animalesTab = '<div class="tabla-env"><table class="t"><thead><tr><th>Rol</th><th>ID</th><th>Crotal</th><th>Sexo</th><th class="num">Peso</th></tr></thead><tbody>' + ["LD", "BD"].map(function (r) { var a = an[r] || {}; return "<tr><td>" + (r === "BD" ? "Donante de sangre" : "Donante de hígado") + "</td><td>" + esc(a.ID || "—") + "</td><td>" + esc(a.Crotal || "") + "</td><td>" + esc(a.Sexo === "H" ? "Hembra" : a.Sexo === "M" ? "Macho" : "") + '</td><td class="num">' + (a.Peso_llegada_kg ? H.n(a.Peso_llegada_kg, 1) + " kg" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>";
    var hs = C.hitosExperimento(e, cfgP());
    if (finalizado(e)) {
      var datos = '<section class="tarjeta"><div class="cabecera"><h2>Datos del experimento</h2><span id="indGuardado" class="guardado">' + ico("check", "s") + (H.requiereValidacion("Experimentos") ? "Los cambios quedan pendientes de validación" : "Guardado automático") + "</span></div>" +
        '<dl class="datos-exp"><div><dt>Código de la perfusión</dt><dd>' + esc(e.Codigo_PM || "—") + "</dd></div><div><dt>Tipo</dt><dd>" + esc(C.nombreTipo(e)) + "</dd></div><div><dt>Protocolo</dt><dd>" + esc(H.versionExp(e)) + "</dd></div>" +
        hs.map(function (h) { return "<div><dt>" + esc(h.nombre) + "</dt><dd>" + esc(dma(h.fecha)) + "</dd></div>"; }).join("") +
        "<div><dt>Inicio de la perfusión</dt><dd>" + esc(H.fechaHora(H.inicioPerf(e.ID)) || "—") + "</dd></div><div><dt>Fin de la perfusión</dt><dd>" + esc(H.fechaHora(ev.fin_perfusion || e.Fin_perfusion) || "—") + "</dd></div>" +
        "<div><dt>Motivo de finalización</dt><dd>" + esc(cierre.motivo || "—") + (cierre.obs ? '<div class="muy-tenue">' + esc(cierre.obs) + "</div>" : "") + "</dd></div></dl>" +
        (puedo ? '<div class="rejilla dos">' + campoE(e, "Peso_higado_inicial_g", "Peso del hígado antes de la perfusión", { tipo: "number", u: "g" }) + campoE(e, "Peso_higado_final_g", "Peso del hígado después de la perfusión", { tipo: "number", u: "g" }) + campoE(e, "Volumen_perfusato_mL", "Volumen de perfusato", { tipo: "number", u: "mL" }) + campoE(e, "Responsable", "Responsable") + campoE(e, "Notas", "Notas", { tipo: "textarea", ancho: true }) + "</div>" : "") + "</section>";
      var claves = ["PERF:Lactato", "PERF:ALT", "FLUJO:Q_AH", "FLUJO:Q_VP", "BILIS:Volumen_mL", "PERF:Glucosa"], horas = C.num(t.duracion_perfusion_h) || 24;
      var graf = '<section class="tarjeta"><div class="cabecera"><h2>Visión rápida</h2><a class="bt texto" href="#/graficos">Más gráficos' + ico("chevron-right", "s") + '</a></div><div class="g-rejilla">' + claves.map(function (k) { return H.tarjetaGrafico(e, k, "todo", horas); }).join("") + "</div></section>";
      return kp + '<div class="columnas"><div class="col">' + datos + '</div><div class="col"><section class="tarjeta"><div class="cabecera"><h2>Animales</h2></div>' + animalesTab + "</section></div></div>" + graf + cronologia(e);
    }
    // programado y confirmado con los animales ya en el estabulario, o procedimiento en curso
    return avisoPend + kp + '<div class="columnas"><section class="tarjeta"><div class="cabecera"><h2>Programación</h2>' + (H.esAdmin() ? '<button class="bt mini" data-act="progEditar" data-id="' + esc(e.ID) + '">' + ico("pencil", "s") + "Editar</button>" : "") + "</div>" + H.progResumen(e) +
      '<div class="prog-part">' + ico("users", "s") + (H.participantes(e).length ? '<div class="part-lista">' + textoParticipantes(e) + "</div>" : '<span class="tenue">Sin participantes asignados</span>') + "</div></section>" +
      '<section class="tarjeta"><div class="cabecera"><h2>Animales</h2><a class="bt mini" href="#/exp/' + id + '/dieta">' + ico("utensils", "s") + "Dieta</a></div>" + animalesTab + "</section></div>" + cronologia(e);
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v05b.js"] = "0.7.3";
