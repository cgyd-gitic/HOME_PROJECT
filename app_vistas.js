/* HOME · ayudas de dominio, inicio, lista de experimentos, alta de experimento, rejilla de registro. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;

  // ================================================================ ayudas de dominio
  H.exp = function (id) { return H.fila("Experimentos", id); };
  H.animales = function (exp) { var o = {}; H.filas("Animales").forEach(function (a) { if (a.Experimento === exp) o[a.Rol] = a; }); return o; };
  H.eventos = function (exp) { var o = {}; H.filas("Eventos").filter(function (e) { return e.Experimento === exp; }).sort(function (a, b) { return String(a.Fecha_hora).localeCompare(String(b.Fecha_hora)); }).forEach(function (e) { o[e.Tipo] = e.Fecha_hora; }); return o; };
  H.inicioPerf = function (exp) { var e = H.exp(exp); return (e && e.Inicio_perfusion) || H.eventos(exp).inicio_perfusion || null; };
  H.form = function (exp, tipo, animal) { var f = H.fila("Formularios", exp + "|" + tipo + "|" + (animal || "")); if (!f) return {}; try { return typeof f.Datos_JSON === "string" ? JSON.parse(f.Datos_JSON || "{}") : (f.Datos_JSON || {}); } catch (e) { return {}; } };
  H.guardarForm = function (exp, tipo, animal, datos, opc) { return H.guardar("Formularios", [{ ID: exp + "|" + tipo + "|" + (animal || ""), Experimento: exp, Tipo: tipo, Animal: animal || "", Datos_JSON: JSON.stringify(datos) }], opc || { sinRepintar: true }); };
  H.pesoHigado = function (exp) { var e = H.exp(exp); return e ? C.num(e.Peso_higado_inicial_g) : null; };
  H.Vperf = function (exp) { var e = H.exp(exp), c = H.form(exp, "calculos"); return C.num(c.V_total_mL) || (e && C.num(e.Volumen_perfusato_mL)) || S.cfg.general.volumen_sangre_mL; };
  H.idMed = function (exp, muestra, punto, v) { return exp + "|" + muestra + "|" + punto + "|" + v; };
  H.valor = function (exp, muestra, punto, v) { var id = H.idMed(exp, muestra, punto, v), l = S.med[exp] || []; for (var i = 0; i < l.length; i++) if (l[i].ID === id && !H.esBorrado(l[i])) return l[i]; return null; };
  H.guardarMediciones = function (exp, muestra, punto, tnom, fechaISO, valores, opc) {
    var t0 = H.inicioPerf(exp), filas = [];
    Object.keys(valores).forEach(function (v) {
      var x = valores[v], n = C.num(x), id = H.idMed(exp, muestra, punto, v), prev = H.valor(exp, muestra, punto, v);
      if ((x === "" || x === null || x === undefined) && !prev) return;
      var real = t0 && fechaISO ? C.r(C.horasEntre(t0, fechaISO), 3) : null;
      var f = { ID: id, Experimento: exp, Muestra: muestra, Punto: punto, T_nominal_h: tnom === undefined ? null : tnom, Fecha_hora: fechaISO || "", T_real_h: real, Variable: v,
        Valor: n, Texto: n === null && x !== "" && x !== null && x !== undefined ? String(x) : "", Unidad: C.variable(muestra, v).unidad };
      if ((x === "" || x === null) && prev) f.Borrado = true;
      filas.push(f);
    });
    return H.guardar("Mediciones", filas, opc || { sinRepintar: true });
  };
  H.ultimo = function (exp, muestra, v) {
    var l = H.med(exp).filter(function (m) { return m.Muestra === muestra && m.Variable === v && C.num(m.Valor) !== null; });
    l.sort(function (a, b) { return (C.num(a.T_real_h) !== null ? C.num(a.T_real_h) : C.num(a.T_nominal_h) || 0) - (C.num(b.T_real_h) !== null ? C.num(b.T_real_h) : C.num(b.T_nominal_h) || 0) || String(a.Actualizado_en).localeCompare(String(b.Actualizado_en)); });
    return l.length ? l[l.length - 1] : null;
  };
  H.objetivo = function (muestra, v) {
    var O = S.cfg.objetivos; if (O[muestra] && O[muestra][v]) return O[muestra][v];
    if (/^(ART|POR|CAV|PERF|PRE)$/.test(muestra) && O.PERF && O.PERF[v]) return O.PERF[v];
    if (/^(FLUJO|RECAL)$/.test(muestra) && O.FLUJO && O.FLUJO[v]) return O.FLUJO[v];
    return null;
  };
  H.claseValor = function (muestra, v, val) { var e = C.enRango(val, H.objetivo(muestra, v)); return e === null ? "" : e < 0 ? "v-bajo" : e > 0 ? "v-alto" : "v-ok"; };
  H.unidadVisible = function (v, u) { return (v === "pO2" || v === "pCO2") && H.pref("kpa") ? "kPa" : u; };
  H.aVista = function (v, x) { var n = C.num(x); if (n === null) return ""; return (v === "pO2" || v === "pCO2") && H.pref("kpa") ? C.r(n / C.KPA, 2) : n; };
  H.deVista = function (v, x) { var n = C.num(x); if (n === null) return x; return (v === "pO2" || v === "pCO2") && H.pref("kpa") ? C.r(n * C.KPA, 2) : n; };
  H.estadoChip = function (est) { var m = { "Planificado": "", "Aclimatación": "info", "Cirugía": "aj", "Perfusión": "pri", "Finalizado": "ok", "Cancelado": "al" }; return "<span class=\"chip " + (m[est] || "") + "\">" + esc(est || "—") + "</span>"; };
  H.colorExp = function (exp, i) { var e = H.exp(exp); return (e && e.Color) || C.PALETA[(i === undefined ? (C.num(e && e.Numero) || 1) - 1 : i) % C.PALETA.length]; };
  H.listaExp = function () { return H.filas("Experimentos").slice().sort(function (a, b) { return String(a.ID).localeCompare(String(b.ID), "es", { numeric: true }); }); };

  // Puntos planificados por tipo de muestra
  H.puntosPlan = function (exp, muestra) {
    var t0 = H.inicioPerf(exp), dias = S.cfg.general.dias_perfusion, m = S.cfg.muestreo, out = [];
    function add(h, et) { out.push({ punto: et || C.etiquetaPunto(h), t_h: h, fecha: t0 ? new Date(C.aFecha(t0).getTime() + h * 36e5).toISOString() : null }); }
    if (/^(PERF|ART|POR|CAV)$/.test(muestra)) {
      if (t0) C.puntosMuestreo(t0, dias, m).forEach(function (p) { out.push({ punto: p.etiqueta, t_h: p.t_h, fecha: p.fecha.toISOString() }); });
      else m.dia1_h.forEach(function (h) { add(h); });
    } else if (muestra === "BILIS") {
      for (var h = 0; h <= 24; h += m.bilis_dia1_cada_h || 2) add(h);
      if (t0) C.puntosMuestreo(t0, dias, m).filter(function (p) { return p.t_h > 24.5; }).forEach(function (p) { out.push({ punto: p.etiqueta, t_h: p.t_h, fecha: p.fecha.toISOString() }); });
    } else if (muestra === "FLUJO") {
      for (var a = 0; a <= 24; a += m.flujos_cada_h_dia1 || 0.5) add(a);
      for (var b = 24 + (m.flujos_cada_h_despues || 3); b <= dias * 24; b += m.flujos_cada_h_despues || 3) add(b);
    } else if (muestra === "HDF") {
      for (var c = 0; c <= 24; c++) add(c); for (var d = 36; d <= dias * 24; d += 12) add(d);
    } else if (muestra === "INMUNO") { for (var e = 0; e <= dias * 24; e += m.inmuno_cada_h || 24) add(e); }
    return out;
  };
  // Columnas de la rejilla: puntos con datos + planificados en la ventana visible
  H.columnas = function (exp, muestra, todos) {
    var plan = H.puntosPlan(exp, muestra), datos = {}, ahoraH = H.inicioPerf(exp) ? C.horasEntre(H.inicioPerf(exp), new Date()) : null;
    H.med(exp).forEach(function (m) { if (m.Muestra === muestra && !datos[m.Punto]) datos[m.Punto] = { punto: m.Punto, t_h: C.num(m.T_nominal_h), fecha: m.Fecha_hora, conDatos: true }; });
    var mapa = {}; plan.forEach(function (p) { mapa[p.punto] = p; });
    Object.keys(datos).forEach(function (k) { if (mapa[k]) { mapa[k].conDatos = true; if (datos[k].fecha) mapa[k].fechaReal = datos[k].fecha; } else mapa[k] = datos[k]; });
    var l = Object.keys(mapa).map(function (k) { return mapa[k]; });
    if (!todos) l = l.filter(function (p) { return p.conDatos || ahoraH === null ? (p.conDatos || p.t_h <= 24) : p.t_h <= ahoraH + 6 && p.t_h >= ahoraH - 12; });
    return l.sort(function (a, b) { return (a.t_h === null ? 1e9 : a.t_h) - (b.t_h === null ? 1e9 : b.t_h); });
  };
  H.puntoAhora = function (exp) { var t0 = H.inicioPerf(exp); if (!t0) return null; var h = C.horasEntre(t0, new Date()); return { t_h: C.r(h, 2), punto: "T+" + C.etiquetaPunto(C.r(h, 2)).replace(/\s/g, ""), fecha: new Date().toISOString() }; };
  H.proximoPunto = function (exp) { var t0 = H.inicioPerf(exp); if (!t0) return null; var ahora = Date.now(); return C.puntosMuestreo(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo).filter(function (p) { return p.fecha.getTime() > ahora - 5 * 6e4; })[0] || null; };

  // ================================================================ rejilla de registro (hoja)
  // opc: {vars, todos, derivadas: fn(punto) → {id: valor}, filasDerivadas: [{id,nombre,unidad,dec}]}
  H.hojaHTML = function (exp, muestra, opc) {
    opc = opc || {}; var def = C.MUESTRAS[muestra], vars = opc.vars || def.vars, cols = H.columnas(exp, muestra, opc.todos), puedo = H.puede("registrar");
    var extra = (opc.extraCol || []).concat((H.extraCols || {})[exp + "|" + muestra] || []);
    extra.forEach(function (x) { if (!cols.some(function (c) { return c.punto === x.punto; })) cols.push(x); });
    cols.sort(function (a, b) { return (a.t_h === null || a.t_h === undefined ? -1e9 : a.t_h) - (b.t_h === null || b.t_h === undefined ? -1e9 : b.t_h); });
    var cab = "<tr><th class=\"var\" scope=\"col\">Variable</th>" + cols.map(function (p) {
      var f = p.fechaReal || p.fecha; return "<th scope=\"col\" class=\"" + (p.conDatos ? "" : "plan") + "\">" + esc(p.punto) + "<span class=\"hora\">" + (f ? esc(H.diaCorto(f) + " " + H.hora(f)) : "—") + "</span></th>";
    }).join("") + "</tr>";
    var grupo = null, cuerpo = "";
    vars.forEach(function (v) {
      if (v.calculada) return;
      if (v.grupo && v.grupo !== grupo) { grupo = v.grupo; cuerpo += "<tr><th class=\"grupo\" colspan=\"" + (cols.length + 1) + "\">" + esc(grupo) + "</th></tr>"; }
      var ob = H.objetivo(muestra, v.id), uni = H.unidadVisible(v.id, v.unidad);
      cuerpo += "<tr><th class=\"var\" scope=\"row\" title=\"" + esc(ob ? "Objetivo " + ob[0] + "–" + ob[1] + " " + v.unidad : "") + "\">" + esc(v.nombre) + (uni ? "<span class=\"u\">" + esc(uni) + "</span>" : "") + "</th>" + cols.map(function (p) {
        var m = H.valor(exp, muestra, p.punto, v.id), val = m ? (C.num(m.Valor) !== null ? H.aVista(v.id, m.Valor) : m.Texto) : "", cl = (m ? H.claseValor(muestra, v.id, m.Valor) : "") + (m && H.pendiente(m) ? " pend" : "");
        return "<td><input" + (m && H.pendiente(m) ? " title=\"Pendiente de validación por un administrador\"" : "") + " aria-label=\"" + esc(v.nombre + " " + p.punto) + (m && H.pendiente(m) ? " (pendiente de validación)" : "") + "\" inputmode=\"decimal\" autocomplete=\"off\" class=\"" + cl + "\" value=\"" + esc(String(val).replace(".", ",")) + "\"" + (puedo ? "" : " readonly") +
          " data-cambio=\"celda\" data-exp=\"" + esc(exp) + "\" data-m=\"" + muestra + "\" data-p=\"" + esc(p.punto) + "\" data-t=\"" + (p.t_h === null || p.t_h === undefined ? "" : p.t_h) + "\" data-f=\"" + esc(p.fechaReal || p.fecha || "") + "\" data-v=\"" + v.id + "\"></td>";
      }).join("") + "</tr>";
    });
    (opc.filasDerivadas || []).forEach(function (d, i) {
      if (i === 0) cuerpo += "<tr><th class=\"grupo\" colspan=\"" + (cols.length + 1) + "\">Calculado</th></tr>";
      cuerpo += "<tr><th class=\"var\" scope=\"row\">" + esc(d.nombre) + "<span class=\"u\">" + esc(d.unidad) + "</span></th>" + cols.map(function (p) { var o = opc.derivadas ? opc.derivadas(p) : {}; var x = o ? o[d.id] : null; return "<td class=\"calc\">" + (x === null || x === undefined ? "" : esc(H.n(x, d.dec))) + "</td>"; }).join("") + "</tr>";
    });
    return "<div class=\"hoja\" role=\"region\" aria-label=\"" + esc(def.nombre) + "\" tabindex=\"0\"><table class=\"h\"><thead>" + cab + "</thead><tbody>" + cuerpo + "</tbody></table></div>" +
      (cols.length ? "" : "<p class=\"tenue\">Aún no hay puntos: registra el inicio de la perfusión o añade un punto.</p>");
  };
  H.acc.celda = function (el) {
    var exp = el.getAttribute("data-exp"), m = el.getAttribute("data-m"), p = el.getAttribute("data-p"), t = el.getAttribute("data-t"), f = el.getAttribute("data-f"), v = el.getAttribute("data-v");
    var raw = el.value.trim(), val = raw === "" ? "" : H.deVista(v, raw.replace(",", "."));
    if (raw !== "" && C.num(val) === null && !/^[<>]/.test(raw)) { el.classList.add("v-alto"); H.toast("«" + raw + "» no es un número. Usa coma o punto decimal (p. ej. 7,38).", "error"); return; }
    var fecha = f || new Date().toISOString(); if (!f && H.inicioPerf(exp)) fecha = new Date().toISOString();
    var o = {}; o[v] = C.num(val) !== null ? C.num(val) : raw;
    H.guardarMediciones(exp, m, p, t === "" ? null : Number(t), fecha, o).then(function () { });
    el.className = raw === "" ? "" : H.claseValor(m, v, C.num(val));
    if (H.alCambiarCelda) H.alCambiarCelda(exp, m, p, v);
  };
  H.acc.añadirPunto = function (el) {
    var exp = el.getAttribute("data-exp"), m = el.getAttribute("data-m"), ahora = H.puntoAhora(exp);
    H.modal({ titulo: "Añadir punto fuera de protocolo", cuerpo: "<div class=\"rejilla dos\"><div class=\"campo\"><label class=\"et\" for=\"npF\">Fecha y hora de la muestra</label><input id=\"npF\" type=\"datetime-local\" value=\"" + H.aLocal(new Date()) + "\"></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"npE\">Etiqueta</label><input id=\"npE\" autocomplete=\"off\" value=\"" + esc(ahora ? ahora.punto : "Extra") + "\"><div class=\"ayuda\">Se usa como columna. Debe ser única en este tipo de muestra.</div></div></div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"npOk\">Añadir columna</button>",
      alAbrir: function (d) {
        d.querySelector("#npF").addEventListener("change", function () { var t0 = H.inicioPerf(exp), f = H.deLocal(this.value); if (t0 && f) d.querySelector("#npE").value = "T+" + C.etiquetaPunto(C.r(C.horasEntre(t0, f), 2)).replace(/\s/g, ""); });
        d.querySelector("#npOk").addEventListener("click", function () {
          var f = H.deLocal(d.querySelector("#npF").value), et = d.querySelector("#npE").value.trim(); if (!et) return;
          var t0 = H.inicioPerf(exp), th = t0 && f ? C.r(C.horasEntre(t0, f), 2) : null;
          H.extraCols = H.extraCols || {}; (H.extraCols[exp + "|" + m] = H.extraCols[exp + "|" + m] || []).push({ punto: et, t_h: th, fecha: f, conDatos: true }); d.close(); H.repintar();
        });
      } });
  };

  // INICIO: ver app_v02.js (v0.2)

  // ================================================================ LISTA DE EXPERIMENTOS (histórico)
  H.vistas.experimentos = function (p, q) {
    var filtro = q.estado || "", txt = (q.q || "").toLowerCase();
    var l = H.listaExp().filter(function (e) { return (!filtro || e.Estado === filtro) && (!txt || JSON.stringify(e).toLowerCase().indexOf(txt) !== -1); });
    var estados = ["", "Planificado", "Aclimatación", "Cirugía", "Perfusión", "Finalizado", "Cancelado"];
    return "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Experimentos</h1>" + (H.esAdmin() ? "<button class=\"bt pri\" data-act=\"nuevoExp\">" + ico("plus") + "Programar experimento</button>" : "") + "</div>" +
      "<div class=\"fila-flex\" style=\"margin-bottom:12px\"><div style=\"flex:1;min-width:200px\"><label class=\"sr\" for=\"buscaExp\">Buscar</label><input id=\"buscaExp\" type=\"search\" placeholder=\"Buscar por ID, crotal, notas…\" value=\"" + esc(q.q || "") + "\" data-cambio=\"filtrarExp\" autocomplete=\"off\"></div>" +
      "<div><label class=\"sr\" for=\"estExp\">Estado</label><select id=\"estExp\" data-cambio=\"filtrarExp\">" + estados.map(function (s) { return "<option value=\"" + s + "\"" + (s === filtro ? " selected" : "") + ">" + (s || "Todos los estados") + "</option>"; }).join("") + "</select></div>" +
      "<a class=\"bt\" href=\"#/exportar\">" + ico("download") + "Exportar</a></div>" +
      (l.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>ID</th><th>Estado</th><th>Fase</th><th>Cirugía</th><th>Donante de hígado</th><th class=\"num\">Hígado (g)</th><th class=\"num\">Isq. caliente</th><th class=\"num\">Isq. fría</th><th class=\"num\">Duración</th><th>Notas</th></tr></thead><tbody>" +
        l.map(function (e) {
          var an = H.animales(e.ID), ld = an.LD || {}, t = C.tiempos(H.eventos(e.ID));
          return "<tr class=\"clic\" data-act=\"abrirExp\" data-id=\"" + esc(e.ID) + "\"><td><span class=\"punto-color\" style=\"background:" + esc(H.colorExp(e.ID)) + "\"></span> <a href=\"#/exp/" + encodeURIComponent(e.ID) + "\">" + esc(e.ID) + "</a></td><td>" + H.estadoChip(e.Estado) + "</td><td>" + esc(e.Fase || "") + "</td><td>" + esc(H.fecha(e.Fecha_cirugia)) + "</td>" +
            "<td>" + (ld.ID ? esc((ld.Sexo || "") + " · " + (ld.Peso_llegada_kg ? H.n(ld.Peso_llegada_kg, 1) + " kg" : "")) : "—") + "</td><td class=\"num\">" + H.n(e.Peso_higado_inicial_g, 0) + "</td><td class=\"num\">" + C.duracionTxt(t.isquemia_caliente_min) + "</td><td class=\"num\">" + C.duracionTxt(t.isquemia_fria_min) + "</td>" +
            "<td class=\"num\">" + (t.duracion_perfusion_h !== null ? H.n(t.duracion_perfusion_h, 1) + " h" : e.Estado === "Perfusión" ? "<span class=\"chip pri\">en curso</span>" : "—") + "</td><td class=\"envolver\">" + esc(String(e.Notas || "").slice(0, 80)) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : "<div class=\"vacio\">No hay experimentos con esos filtros.</div>") + "</div>";
  };
  H.acc.filtrarExp = function () { var q = H.$("#buscaExp").value.trim(), e = H.$("#estExp").value; H.ir("experimentos?" + (q ? "q=" + encodeURIComponent(q) + "&" : "") + (e ? "estado=" + encodeURIComponent(e) : "")); };
  H.acc.abrirExp = function (el, ev) { if (ev && ev.target.closest("a")) return; H.ir("exp/" + encodeURIComponent(el.getAttribute("data-id"))); };

  // ================================================================ NUEVO EXPERIMENTO (siempre dos animales: BD + LD)
  H.acc.nuevoExp = function () {
    var n = H.filas("Experimentos").reduce(function (m, e) { return Math.max(m, C.num(e.Numero) || 0); }, 0) + 1, nn = (n < 10 ? "0" : "") + n, hoy = H.aFechaLocal(new Date());
    function animal(rol, nombre, peso) {
      return "<fieldset class=\"tarjeta plana\" style=\"margin:0\"><legend><h3>" + nombre + " · HOME-" + rol + "-<span class=\"nn\">" + nn + "</span></h3></legend><div class=\"rejilla\">" +
        "<div class=\"campo\"><label class=\"et\" for=\"" + rol + "crotal\">Crotal</label><input id=\"" + rol + "crotal\" autocomplete=\"off\"></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"" + rol + "sexo\">Sexo</label><select id=\"" + rol + "sexo\"><option value=\"\">—</option><option value=\"H\">Hembra</option><option value=\"M\">Macho</option></select></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"" + rol + "cast\">Castrado</label><select id=\"" + rol + "cast\"><option value=\"No\">No</option><option value=\"Sí\">Sí</option></select></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"" + rol + "peso\">Peso a la llegada (kg)</label><input id=\"" + rol + "peso\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"0.1\" inputmode=\"decimal\" placeholder=\"" + peso + "…\"></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"" + rol + "fl\">Fecha y hora de llegada</label><input id=\"" + rol + "fl\" type=\"datetime-local\" value=\"" + H.aLocal(new Date()) + "\"></div>" +
        "<div class=\"campo\"><label class=\"et\" for=\"" + rol + "raza\">Raza / cruce</label><input id=\"" + rol + "raza\" value=\"Landrace × Large White\" autocomplete=\"off\"></div></div></fieldset>";
    }
    H.modal({ titulo: "Nuevo experimento", ancho: true, cuerpo:
      "<div class=\"rejilla\"><div class=\"campo\"><label class=\"et\" for=\"neNum\">Número</label><input id=\"neNum\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" min=\"1\" value=\"" + n + "\"><div class=\"ayuda\">ID: <b id=\"neId\">HOME-" + nn + "</b></div></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"nePM\">Código perfusión (HOME-PM nº)</label><input id=\"nePM\" value=\"HOME-PM-" + nn + "\" autocomplete=\"off\"></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"neFase\">Fase</label><select id=\"neFase\"><option>Fase 2 · 7 días de perfusión</option><option>Fase 3 · perfusión + trasplante</option><option>Piloto / puesta a punto</option></select></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"neProt\">Protocolo</label><select id=\"neProt\"><option>CHRONO-LIVER (circadiano)</option><option>HOME estándar (no circadiano)</option></select></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"neQx\">Fecha prevista de cirugía</label><input id=\"neQx\" type=\"date\" min=\"" + hoy + "\"></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"neResp\">Responsable</label><input id=\"neResp\" value=\"" + esc((S.usuario || {}).nombre || "") + "\" autocomplete=\"off\"></div></div>" +
      "<div class=\"columnas\">" + animal("BD", "Donante de sangre", "60") + animal("LD", "Donante de hígado", "25") + "</div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"neOk\">" + ico("plus") + "Crear experimento</button>",
      alAbrir: function (d) {
        d.querySelector("#neNum").addEventListener("input", function () { var v = Number(this.value) || 1, s = (v < 10 ? "0" : "") + v; d.querySelector("#neId").textContent = "HOME-" + s; d.querySelector("#nePM").value = "HOME-PM-" + s; H.$$(".nn", d).forEach(function (x) { x.textContent = s; }); });
        d.querySelector("#neOk").addEventListener("click", function () {
          var v = Number(d.querySelector("#neNum").value) || n, s = (v < 10 ? "0" : "") + v, id = "HOME-" + s;
          if (H.exp(id)) { H.toast("Ya existe " + id + ". Elige otro número.", "error"); return; }
          var e = { ID: id, Numero: v, Codigo_PM: d.querySelector("#nePM").value.trim(), Fase: d.querySelector("#neFase").value, Protocolo: d.querySelector("#neProt").value, Estado: "Aclimatación",
            Fecha_llegada: H.deLocal(d.querySelector("#LDfl").value), Fecha_cirugia: d.querySelector("#neQx").value || "", Responsable: d.querySelector("#neResp").value.trim(), Color: C.PALETA[(v - 1) % C.PALETA.length] };
          var an = ["BD", "LD"].map(function (r) { var fl = d.querySelector("#" + r + "fl").value; return { ID: "HOME-" + r + "-" + s, Experimento: id, Rol: r, Crotal: d.querySelector("#" + r + "crotal").value.trim(), Sexo: d.querySelector("#" + r + "sexo").value,
            Castrado: d.querySelector("#" + r + "cast").value, Raza: d.querySelector("#" + r + "raza").value.trim(), Fecha_llegada: fl ? H.deLocal(fl) : "", Hora_llegada: fl ? fl.slice(11, 16) : "", Peso_llegada_kg: C.num(d.querySelector("#" + r + "peso").value) }; });
          H.guardar("Experimentos", [e], { sinRepintar: true }); H.guardar("Animales", an, { sinRepintar: true });
          S.medCargada[id] = true; d.close(); H.toast("Experimento " + id + " creado."); H.ir("exp/" + encodeURIComponent(id) + "/dieta");
        });
      } });
  };

  // ================================================================ inventario: stock calculado
  H.stockDe = function (m) { var s = C.num(m.Stock_inicial) || 0; H.filas("Movimientos").forEach(function (x) { if (x.Material === m.ID) s += C.num(x.Cantidad) || 0; }); return s; };
  H.stockBajo = function () { return H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }).map(function (m) { m._stock = H.stockDe(m); return m; }).filter(function (m) { var min = C.num(m.Stock_minimo); return min !== null && m._stock < min; }); };

  // chip de la cabecera con el experimento activo
  H.chipActivo = function () {
    var el = H.$("#chipActivo"); if (!el) return; var e = H.listaExp().filter(function (x) { return x.Estado === "Perfusión"; }).slice(-1)[0];
    el.innerHTML = e && H.inicioPerf(e.ID) ? "<a class=\"chip-activo\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/seguimiento\" title=\"Perfusión en curso\">" + ico("activity", "s") + esc(e.ID) + " <span class=\"mono\" data-crono=\"" + esc(H.inicioPerf(e.ID)) + "\"></span></a>" : "";
  };
})();
