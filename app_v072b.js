/* HOME · v0.7.2 (b): perfusiones anteriores (Programación «Histórico») — los tiempos de quirófano, desde el inicio de la exanguinación
   hasta el fin de la cirugía de banco, se escriben a mano con el lápiz, sin el cronómetro; se comprueba el orden cronológico y que no
   haya fechas futuras, y la isquemia caliente, la fría y la cirugía de banco se recalculan con los eventos guardados. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, esc = H.esc, ico = H.ico;
  var MANUALES = ["inicio_exanguinacion", "parada_cardiaca", "inicio_preservacion_fria", "inicio_banco", "fin_banco"];
  function info(t) { return H.botonInfo ? H.botonInfo(t) : ""; }
  function manual(e) {
    var ev = H.eventos(e.ID), t = C.tiempos(ev), puedo = H.puede("registrar");
    var linea = '<ol class="linea-qx qx-manual">' + C.HITOS_QX.map(function (k) {
      var h = ev[k], edit = MANUALES.indexOf(k) !== -1;
      return '<li class="' + (h ? "hecho" : "") + '"><span class="pt"></span><span class="tx"><b>' + esc(C.NOMBRE_HITO[k]) + "</b>" + (h ? "<time>" + esc(H.diaCorto(h) + " " + H.horaS(h)) + "</time>" : '<span class="muy-tenue">sin registrar</span>') + "</span>" +
        (edit && puedo ? '<button class="bt ico-solo texto" data-act="qxManual" data-exp="' + esc(e.ID) + '" data-t="' + k + '" aria-label="Escribir la fecha y la hora de «' + esc(C.NOMBRE_HITO[k]) + '»" title="Editar">' + ico("pencil", "s") + "</button>" : "") + "</li>";
    }).join("") + "</ol>";
    var kpis = '<div class="kpis cuatro qx-tiempos">' + [["Isquemia caliente", t.isquemia_caliente_min], ["Exanguinación → parada", t.exanguinacion_a_parada_min], ["Isquemia fría", t.isquemia_fria_min], ["Cirugía de banco", t.cirugia_banco_min]].map(function (x) { return '<div class="kpi"><div class="et">' + esc(x[0]) + '</div><div class="v">' + esc(C.duracionTxt(x[1])) + "</div></div>"; }).join("") + "</div>";
    return '<section class="tarjeta qx-hist"><div class="cabecera"><h2>Tiempos de quirófano</h2>' + info("Perfusión anterior: escribe con el lápiz la fecha y la hora de cada paso, desde el inicio de la exanguinación hasta el fin de la cirugía de banco (no se usa el cronómetro). Cada hora debe quedar entre la del paso anterior y la del siguiente ya registrados, y no puede ser futura. La isquemia caliente, la fría y la cirugía de banco se recalculan al guardar. El inicio de la perfusión es el del registro de la perfusión anterior (Programación).") + "</div>" + kpis + linea + "</section>";
  }
  var qxPrev = H.tabsExp.quirofano;
  H.tabsExp.quirofano = function (e) {
    if (!(H.esHistorico && H.esHistorico(e))) return qxPrev.apply(this, arguments);
    var html = qxPrev.apply(this, arguments), i = html.indexOf("</section>");   // se sustituye la tarjeta del cronómetro; se mantiene el recalentamiento
    if (H.pantallaEncendida) H.pantallaEncendida(false);
    return manual(e) + (i === -1 ? "" : html.slice(i + 10));
  };
  H.acc.qxManual = function (el) {
    var exp = el.getAttribute("data-exp"), tipo = el.getAttribute("data-t"), e = H.exp(exp), ev = H.eventos(exp), nom = C.NOMBRE_HITO[tipo];
    if (!e || MANUALES.indexOf(tipo) === -1 || !H.puede("registrar")) return;
    var j = C.HITOS_QX.indexOf(tipo), ant = null; for (var a = j - 1; a >= 0 && !ant; a--) ant = ev[C.HITOS_QX[a]] || null;
    var v0 = ev[tipo] ? H.aLocal(ev[tipo]) : ant ? H.aLocal(ant) : e.Fecha_cirugia ? String(e.Fecha_cirugia).slice(0, 10) + "T08:00" : "";
    H.modal({ titulo: nom, cuerpo: '<div class="campo"><label class="et" for="qxmH">Fecha y hora</label><input id="qxmH" type="datetime-local" value="' + esc(v0) + '" max="' + esc(H.aLocal(new Date())) + '"><div class="ayuda">Perfusión anterior de ' + esc(exp) + ": hora escrita a mano.</div></div><div class=\"msg-error\" id=\"qxmErr\" role=\"alert\"></div>",
      pie: (ev[tipo] ? '<button class="bt peligro" id="qxmDel">' + ico("trash-2") + "Borrar</button>" : "") + '<span class="empuja"></span><button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="qxmOk">Guardar</button>',
      alAbrir: function (d) {
        d.querySelector("#qxmOk").addEventListener("click", function () {
          var iso = H.deLocal(d.querySelector("#qxmH").value), err = iso ? C.validarHitoQx(ev, tipo, iso, new Date()) : "Indica la fecha y la hora.";
          if (err) { d.querySelector("#qxmErr").textContent = err; return; }
          H.guardar("Eventos", [{ ID: exp + "|evento|" + tipo, Experimento: exp, Tipo: tipo, Fecha_hora: iso, Nota: "Registro manual (perfusión anterior)" }]);
          d.close(); H.toast(nom + ": " + H.diaCorto(iso) + " " + H.hora(iso));
        });
        var del = d.querySelector("#qxmDel"); if (del) del.addEventListener("click", function () { H.borrar("Eventos", H.filas("Eventos").filter(function (x) { return x.Experimento === exp && x.Tipo === tipo; }).map(function (x) { return x.ID; })); d.close(); });
      } });
  };
})();

/* HOME · v0.7.3 (a): seguimiento.
   · Gasometrías de la pre-perfusión, 0 min y 30 min: corregidas a la temperatura del perfusato (indicador «corregido a T °C» con la temperatura editable,
     O₂ calculado con esa temperatura sin volver a corregir, sin colores ni alarmas de pH/pCO₂/pO₂ frente a los objetivos a 37 °C).
   · Configuración → Objetivos: origen de cada rango (porcina GITIC, humana HULP, protocolo) y objetivos de corrección del perfusato; los valores por defecto
     antiguos que estuvieran guardados (urea 7–38, K 4,5, Ca 1,1, HCO₃ 24) se leen con los nuevos. Configuración → HDF: paso de la extracción ≥ 10 mL/h.
   · Preparación de las soluciones del protocolo elegido al programar (diálogo, Preparación → Fármacos y resumen de la programación), imprimible.
   · Inicio de la perfusión: aviso inmediato con las infusiones que deben iniciarse según el horario circadiano del protocolo a la hora del reloj
     (más la heparina y la extracción inicial de la HDF), recordatorio al terminar el recalentamiento y la misma lista en el quirófano. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME; if (!C || !H || !C.planExtraccion) return;
  var S = H.S, esc = H.esc, ico = H.ico;
  function info(t) { return H.botonInfo ? H.botonInfo(t) : ""; }
  function cfgH() { return (S.cfg && S.cfg.hdf) || C.DEF.hdf; }

  // ============================================================== 1. Configuración efectiva
  var OBJ_CORR_ANT = { K: 4.5, Ca: 1.1, HCO3: 24 };
  var recPrev = H.recalcCfg;
  H.recalcCfg = function () {
    var cfg = recPrev.apply(this, arguments);
    try {
      var oc = cfg && cfg.perfusato && cfg.perfusato.objetivos_correccion, nd = C.DEF.perfusato.objetivos_correccion;
      if (oc) Object.keys(OBJ_CORR_ANT).forEach(function (k) { if (C.num(oc[k]) === OBJ_CORR_ANT[k]) oc[k] = nd[k]; });
      var u = cfg && cfg.objetivos && cfg.objetivos.PERF && cfg.objetivos.PERF.Urea; if (u && C.num(u[0]) === 7 && C.num(u[1]) === 38) cfg.objetivos.PERF.Urea = C.UREA_HULP.slice();
    } catch (x) { console.error(x); }
    return cfg;
  };
  // horarios guardados antes de v0.7.3: el antibiótico de referencia ya no lleva «verificar» (lo ha confirmado el grupo)
  var hpPrev = H.horarioProtocolo;
  if (hpPrev) H.horarioProtocolo = function () {
    var hp = hpPrev.apply(this, arguments);
    ((hp && hp.cambios) || []).forEach(function (c) { if (c && /pauta de referencia \(verificar\)/.test(c.nota || "")) c.nota = String(c.nota).replace("pauta de referencia (verificar)", "pauta de referencia (confirmada por el grupo)"); });
    return hp;
  };
  var cfgCampoPrev = H.acc.cfgCampo;
  if (cfgCampoPrev) H.acc.cfgCampo = function (el) {
    var c = el.getAttribute("data-c"), k = el.getAttribute("data-k"), n = C.num(String(el.value).replace(",", "."));
    if (c === "hdf" && k === "paso_mL_h") {
      if (n === null || n < 10) { H.toast("La máquina solo admite cambios de 10 en 10 mL/h: el paso no puede ser menor de 10 mL/h.", "error"); el.value = "10"; }
      else if (Math.abs(n / 10 - Math.round(n / 10)) > 1e-9) { el.value = String(C.pasoHDF({ paso_mL_h: n })); H.toast("El paso se redondea a " + el.value + " mL/h (múltiplo de 10)."); }
    }
    if (c === "hdf" && k === "tope_deficit_mL" && n !== null && n < 0) el.value = String(-n);
    return cfgCampoPrev.apply(this, arguments);
  };

  // ============================================================== 2. Gasometrías corregidas por temperatura (pre-perfusión, 0 min, 30 min)
  var FUENTE_T = { indicada: "indicada a mano", flujos: "temperatura registrada en Flujos", recalentamiento: "temperatura real del paso del recalentamiento", tabla: "escalón de la tabla del recalentamiento" };
  var INFO_T = "El gasómetro da los valores de la pre-perfusión, 0 min y 30 min corregidos a la temperatura del perfusato durante el recalentamiento. La app no los vuelve a corregir: la sO₂ estimada, la P50, el contenido de O₂ y el VO₂ se calculan con esta temperatura (P50 corregida por temperatura y pH; Severinghaus). " +
    "pH, pO₂ y pCO₂ no se colorean ni generan alarmas ni ajustes del asesor frente a los objetivos, que son valores a 37 °C, salvo que la temperatura esté a ±0,5 °C de 37 °C. La pre-perfusión y el 0 min son la misma toma. " +
    "Por defecto se toma la temperatura del perfusato registrada en ese punto (Flujos), la real del paso del recalentamiento o el escalón de la tabla; cámbiala si el gasómetro usó otra.";
  function puntoT(p) { return p === "Pre" ? "0 min" : p; }
  H.tempGas = function (exp, punto) {
    if (C.PUNTOS_GAS_T.indexOf(punto) === -1) return null;
    var k = puntoT(punto), f = H.form(exp, "gas_temp", "") || {}, T = C.num(f[k]); if (T !== null) return { T: T, fuente: "indicada" };
    var fl = H.valor(exp, "FLUJO", k, "Temp") || (k === "0 min" ? H.valor(exp, "FLUJO", "Pre", "Temp") : null); if (fl && C.num(fl.Valor) !== null) return { T: C.num(fl.Valor), fuente: "flujos" };
    var mi = C.minutoGas(k), rc = H.valor(exp, "RECAL", "R" + mi, "Temp"); if (rc && C.num(rc.Valor) !== null) return { T: C.num(rc.Valor), fuente: "recalentamiento" };
    return { T: C.tempRecalentamiento(mi, S.cfg.recalentamiento), fuente: "tabla" };
  };
  // temperatura con la que se interpreta un valor (null si no es un valor corregido o la temperatura es ≈ 37 °C)
  function corrige(exp, muestra, punto, v) { if (!exp || !C.gasCorregido(muestra, punto) || (v && C.VARS_GAS_T.indexOf(v) === -1)) return null; var t = H.tempGas(exp, punto); return t && C.fueraDe37(t.T) ? t : null; }
  H.gasCorregidoT = corrige;
  function editorT(exp, puntos) {
    var puedo = H.puede("registrar");
    return '<div class="aviso info gas-temp">' + ico("thermometer") + "<div><b>Valores corregidos por temperatura</b>" + info(INFO_T) + " · " + puntos.map(function (k) {
      var t = H.tempGas(exp, k) || {}, id = "gasT_" + k.replace(/\W/g, "");
      return '<label for="' + id + '">' + (k === "0 min" ? "Pre-perfusión y 0 min" : esc(k)) + ': corregido a</label> <span class="unidad-in" style="display:inline-flex;width:96px"><input id="' + id + '" inputmode="decimal" autocomplete="off" value="' + (t.T === null || t.T === undefined ? "" : esc(String(t.T).replace(".", ","))) + '" data-cambio="gasTemp" data-exp="' + esc(exp) + '" data-k="' + esc(k) + '"' + (puedo ? "" : " disabled") + "><span>°C</span></span> <span class=\"muy-tenue\">(" + esc(FUENTE_T[t.fuente] || "") + ")</span>";
    }).join(" · ") + "</div></div>";
  }
  H.acc.gasTemp = function (el) {
    var exp = el.getAttribute("data-exp"), k = el.getAttribute("data-k"), f = H.copia(H.form(exp, "gas_temp", "") || {}), raw = String(el.value || "").trim(), n = C.num(raw.replace(",", "."));
    if (raw === "") delete f[k]; else if (n === null || n < 4 || n > 42) { H.toast("Indica la temperatura del perfusato en °C (4–42).", "error"); return; } else f[k] = n;
    H.guardarForm(exp, "gas_temp", "", f); H.toast(raw === "" ? "Temperatura de «" + k + "»: la de Flujos o la del recalentamiento." : "«" + k + "»: valores corregidos a " + H.n(n, 1) + " °C."); H.repintarPronto();
  };
  function neutro(html, exp, ptoFijo) {
    return html.replace(/<input\b[^>]*>/g, function (tag) {
      var m = (/ data-m="([^"]*)"/.exec(tag) || [])[1], v = (/ data-v="([^"]*)"/.exec(tag) || [])[1], p = ptoFijo || (/ data-p="([^"]*)"/.exec(tag) || [])[1], t = m && v && p ? corrige(exp, m, p, v) : null;
      if (!t || / data-cambio="gasTemp"/.test(tag)) return tag;
      tag = / class="/.test(tag) ? tag.replace(/ class="([^"]*)"/, function (x, cl) { return ' class="' + (cl.replace(/\bv-(bajo|alto|ok)\b/g, "").replace(/\s+/g, " ").trim() + " v-tc").trim() + '"'; }) : tag.replace("<input", '<input class="v-tc"');
      return / title="/.test(tag) ? tag : tag.replace("<input", '<input title="Corregido a ' + esc(String(t.T).replace(".", ",")) + ' °C: no se compara con el objetivo a 37 °C"');
    });
  }
  var hojaPrev = H.hojaHTML;
  H.hojaHTML = function (exp, muestra) {
    var h = hojaPrev.apply(this, arguments); if (C.MUESTRAS_GAS_T.indexOf(muestra) === -1) return h;
    var pts = C.PUNTOS_GAS_T.filter(function (p) { return h.indexOf('data-p="' + p + '"') !== -1; }); if (!pts.length) return h;
    h = neutro(h, exp).replace(/(<th scope="col" class="[^"]*">)(Pre|0 min|30 min)(<span class="hora">)/g, function (x, a, p, b) { var t = H.tempGas(exp, p); return a + p + (t && t.T !== null ? ' <span class="chip info tc">corregido a ' + H.n(t.T, 1) + " °C</span>" : "") + b; });
    var ks = []; pts.forEach(function (p) { if (ks.indexOf(puntoT(p)) === -1) ks.push(puntoT(p)); });
    return editorT(exp, ks) + h;
  };
  if (H.segExtra && H.segExtra.registrar) {
    var regPrev = H.segExtra.registrar;
    H.segExtra.registrar = function (e) {
      var h = regPrev.apply(this, arguments), sel = (/<select id="regPunto"[\s\S]*?<option value="([^"]*)" selected>/.exec(h) || [])[1]; if (!e || !sel || C.PUNTOS_GAS_T.indexOf(sel) === -1) return h;
      h = neutro(h, e.ID); var i = h.indexOf('<div class="tabla-env"><table class="t reg-gas">'); return i === -1 ? h : h.slice(0, i) + editorT(e.ID, [puntoT(sel)]) + h.slice(i);
    };
  }
  var segPrev = H.tabsExp.seguimiento;
  H.tabsExp.seguimiento = function (e) {
    var h = segPrev.apply(this, arguments); if (!e || h.indexOf('id="gPunto"') === -1) return h;
    var sel = (/<select id="gPunto"[\s\S]*?<option selected>([^<]*)<\/option>/.exec(h) || [])[1]; if (!sel || C.PUNTOS_GAS_T.indexOf(sel) === -1) return h;
    h = neutro(h, e.ID, sel); var i = h.indexOf('<div id="recsGas"'); return i === -1 ? h : h.slice(0, i) + editorT(e.ID, [puntoT(sel)]) + h.slice(i);
  };
  ["celda", "regVal", "borrGas"].forEach(function (k) {
    var prev = H.acc[k]; if (!prev) return;
    H.acc[k] = function (el) {
      var r = prev.apply(this, arguments);
      try {
        var exp = el.getAttribute("data-exp"), p = el.getAttribute("data-p"), g = document.getElementById("gPunto"), bt = document.querySelector("[data-act=guardarGas]");
        if (k === "borrGas") { p = g ? g.value : null; exp = bt ? bt.getAttribute("data-exp") : null; }
        if (corrige(exp, el.getAttribute("data-m"), p, el.getAttribute("data-v")) && C.num(H.deVista ? H.deVista(el.getAttribute("data-v"), String(el.value).trim().replace(",", ".")) : String(el.value).replace(",", ".")) !== null) el.className = (String(el.className).replace(/\bv-(bajo|alto|ok)\b/g, "").replace(/\s+/g, " ").trim() + " v-tc").trim();
      } catch (x) { }
      return r;
    };
  });
  // el asesor de gases recibe el punto (exp, punto) y lo traduce a la temperatura de corrección
  var asesorPrev = C.asesorGas;
  C.asesorGas = function (rama, g, aj, ob, gc, ctx) {
    if (ctx && ctx.exp && ctx.punto && ctx.temp_corr === undefined) { var t = corrige(ctx.exp, rama, ctx.punto); if (t) ctx = Object.assign({}, ctx, { temp_corr: t.T }); }
    return asesorPrev.call(this, rama, g, aj, ob, gc, ctx);
  };
  var alPrev = H.alertasUltimoRegistro;
  if (alPrev) H.alertasUltimoRegistro = function (exp) { return (alPrev.apply(this, arguments) || []).filter(function (a) { return !corrige(exp, a.muestra, a.punto, a.variable); }); };
  // VO₂, DO₂ y extracción de O₂ con la temperatura de corrección del punto (si no coincide con la de Flujos)
  var dfPrev = H.derivadasFlujo;
  if (dfPrev) H.derivadasFlujo = function (e, punto) {
    var o = dfPrev.apply(this, arguments); if (!e || C.PUNTOS_GAS_T.indexOf(punto) === -1) return o;
    var t = H.tempGas(e.ID, punto), ft = H.valor(e.ID, "FLUJO", punto, "Temp"); if (!t || t.T === null || (ft && C.num(ft.Valor) === t.T)) return o;
    var g = {}; ["ART", "POR", "CAV"].forEach(function (m) { var x = {}; ["pO2", "sO2", "Hb", "pH", "pCO2"].forEach(function (v) { var y = H.valor(e.ID, m, punto, v); x[v] = y ? C.num(y.Valor) : null; }); g[m] = x.pO2 !== null ? x : null; });
    if (!g.ART || !g.POR || !g.CAV) return o;
    var f = {}; C.MUESTRAS.FLUJO.vars.forEach(function (v) { var y = H.valor(e.ID, "FLUJO", punto, v.id); f[v.id] = y ? C.num(y.Valor) : null; }); f.Temp = t.T;
    var vo = C.consumoO2(g, f, H.pesoHigado(e.ID), S.cfg.o2); o = Object.assign({}, o); if (vo) { o.VO2 = vo.VO2; o.VO2_100g = vo.VO2_100g; o.DO2 = vo.DO2; o.EO2 = vo.EO2; o.Temp_O2 = t.T; }
    return o;
  };

  // ============================================================== 3. Configuración → Objetivos: origen de cada rango y objetivos de corrección
  var INFO_UREA = "La urea del perfusato usa el intervalo humano del laboratorio del HULP (11–49 mg/dL) y no la estandarización porcina del grupo (7–38 mg/dL): esa referencia procede de cerdos jóvenes con poca ingesta proteica, mientras que el injerto perfundido produce urea a partir de los aminoácidos de la nutrición parenteral. La HDF depura la urea (Configuración → HDF).";
  function igual(a, b) { return !!a && !!b && C.num(a[0]) === C.num(b[0]) && C.num(a[1]) === C.num(b[1]); }
  var objPrev = H.seccionesExtra && H.seccionesExtra.objetivos;
  if (objPrev) H.seccionesExtra.objetivos = function () {
    var h = objPrev.apply(this, arguments), D = C.DEF.objetivos, O = S.cfg.objetivos || {};
    h = h.replace(/<th class="centro">Por defecto<\/th>/g, '<th class="centro">Por defecto</th><th class="centro">Origen</th>');
    h = h.replace(/<tr><th scope="row">[\s\S]*?<\/tr>/g, function (tr) {
      if (tr.indexOf('data-et="Por defecto"') === -1) return tr; var mm = /data-cambio="cfgObj" data-m="([^"]+)" data-v="([^"]+)"/.exec(tr); if (!mm) return tr;
      var m = mm[1], v = mm[2], o = C.origenObjetivo(m, v), mod = !igual((O[m] || {})[v], (D[m] || {})[v]);
      var cel = '<td class="centro" data-et="Origen"><span class="chip ' + (o.clave === "porcina" ? "ok" : o.clave === "humana" ? "info" : "") + '">' + esc(o.texto) + "</span>" + (mod ? ' <span class="chip aj">modificado</span>' : "") + (m === "PERF" && v === "Urea" ? info(INFO_UREA) : "") + "</td>";
      return tr.replace(/(data-et="Por defecto">[\s\S]*?<\/td>)/, "$1" + cel);
    });
    h = h.replace("<h2>Gasometrías del circuito</h2>", "<h2>Gasometrías del circuito</h2>" + info("Origen: la rama arterial usa los valores humanos habituales de la gasometría arterial (pO₂ 80–100 mmHg); la portal y la cava, el criterio de perfusión del protocolo. Son valores a 37 °C: las gasometrías de la pre-perfusión, 0 min y 30 min salen del gasómetro corregidas a la temperatura del perfusato y no se comparan con ellos."));
    var oc = (S.cfg.perfusato || {}).objetivos_correccion || {}, R = S.cfg.referencia_porcina || C.DEF.referencia_porcina, nd = C.DEF.perfusato.objetivos_correccion;
    var fil = [["K", "K⁺", "mmol/L", 1, 1], ["Ca", "Ca²⁺ iónico", "mmol/L", 2, 2], ["HCO3", "HCO₃⁻", "mmol/L", 1, 0], ["Albumina", "Albúmina", "g/dL", 1, 1]].map(function (x) {
      var r = ((R.vars || {})[x[0]] || {}), rg = r.rango ? H.n(r.rango[0], x[3]) + "–" + H.n(r.rango[1], x[3]) : "—";
      return '<tr><th scope="row">' + esc(x[1]) + ' <span class="muy-tenue">' + esc(x[2]) + '</span></th><td class="centro" data-et="Objetivo"><b>' + (C.num(oc[x[0]]) === null ? "—" : C.num(oc[x[0]]).toFixed(x[4]).replace(".", ",")) + "</b>" + (C.num(oc[x[0]]) !== nd[x[0]] ? ' <span class="chip aj">modificado</span>' : "") + '</td><td class="centro" data-et="Referencia porcina">' + esc(rg) + '</td><td class="centro muy-tenue" data-et="Laboratorio HULP">' + esc(r.lab || "—") + "</td></tr>";
    }).join("");
    return h + '<section class="tarjeta obj-correccion"><div class="cabecera"><h2>Objetivos de corrección del perfusato</h2>' + info("Valores a los que se corrige el perfusato en Pre-perfusión → Cálculos del perfusato (KCl, CaCl₂, bicarbonato y albúmina). K⁺ 4,0, Ca²⁺ 1,25, HCO₃⁻ 28 mmol/L y albúmina 3,0 g/dL están dentro de la referencia porcina del grupo; K⁺ y Ca²⁺, también dentro del intervalo humano del laboratorio del HULP. Se cambian en Configuración → Perfusato.") +
      '</div><div class="tabla-env"><table class="t t-obj"><thead><tr><th>Variable</th><th class="centro">Objetivo</th><th class="centro">Referencia porcina</th><th class="centro">Laboratorio HULP</th></tr></thead><tbody>' + fil + "</tbody></table></div></section>";
  };

  // ============================================================== 4. Preparación de las soluciones del protocolo (al programar y en Preparación)
  var INFO_PREP = "Para la versión del protocolo elegida: cada línea con su producto y la solución madre de cada componente (concentración final de la preparación, de Configuración → Horario circadiano), el volumen al día según el horario circadiano, cuánto preparar para los días de perfusión y en cuántas tandas, con el mismo criterio que la (i) de la tabla de infusiones (estabilidad de cada mezcla y contenedores). " +
    "«Aporte al perfusato» es lo que sube cada día la concentración en el perfusato sin aclaramiento. La heparina se calcula con el volumen del perfusato. Antes de la perfusión se confirma en la tabla de infusiones (volumen real y líneas que se administran).";
  function filasPrep(v, V, dias) {
    var hp = H.horarioProtocolo(v) || { lineas: [], cambios: [] }, prot = (C.PROTOCOLOS[v] || {}).lineas || {}, cfgP = S.cfg.perfusato || C.DEF.perfusato, excl = cfgH().lineas_excluidas || ["HDF"], lineas = [];
    (hp.lineas || []).forEach(function (l) { if (l && excl.indexOf(l) === -1 && lineas.indexOf(l) === -1) lineas.push(l); });
    Object.keys(prot).forEach(function (l) { if (lineas.indexOf(l) === -1 && l !== "Heparina") lineas.push(l); });
    lineas.push("Heparina");
    return lineas.map(function (l) {
      var x = prot[l] || { producto: l, componentes: ((hp.madres || {})[l]) || [] }, comps = (x.componentes || []).map(function (c) { var m = C.madreHorario(hp, l, c.nombre); return { nombre: c.nombre, madre: m ? m.madre : c.madre, unidad: m ? m.unidad || c.unidad : c.unidad }; });
      var esHep = l === "Heparina", hep = esHep ? C.heparina(V, dias, cfgP) : null, vd = esHep ? hep.ritmo_mL_h * 24 : C.volumenDiaLinea(hp, l), c0 = comps[0];
      return { linea: l, nombre: C.nombreLinea(l), producto: x.producto || l, comps: comps, vd: vd, r: C.preparacionSemanal(l, vd, dias, c0 ? C.num(c0.madre) : null), hep: hep, receta: (H.RECETAS_INF || {})[l] || "" };
    });
  }
  H.preparacionFilas = filasPrep;
  H.preparacionVersionHTML = function (v, opc) {
    opc = opc || {}; if (!v || !C.PROTOCOLOS[v]) return ""; var hp = H.horarioProtocolo(v) || {}, dias = C.num(opc.dias) || C.num((S.cfg.general || {}).dias_perfusion) || 7, V = C.num(opc.V) || C.num(hp.V_ref_mL) || C.num((S.cfg.general || {}).volumen_sangre_mL) || 2200;
    var filas = filasPrep(v, V, dias).map(function (f) {
      var comps = f.comps.map(function (c) { var a = f.vd ? C.aporteLinea(c, f.vd / 24, V) : null, sin = c.madre === null || c.madre === undefined || c.madre === "";
        return "<div>" + esc(c.nombre) + ": <b>" + (sin ? "?" : esc(String(c.madre).replace(".", ","))) + " " + esc(c.unidad || "") + "</b>" + (a ? ' <span class="muy-tenue">· aporte +' + H.n(a.por_L_h * 24, a.por_L_h * 24 < 1 ? 3 : 1) + " " + esc(a.unidad_L_h.replace(" por hora", "/día")) + "</span>" : "") + "</div>"; }).join("") || '<span class="muy-tenue">Concentración fija del producto</span>';
      var prep = f.hep ? "Cebado " + H.n(f.hep.cebado_U, 0) + " U (" + H.n(f.hep.cebado_mL, 2) + " mL del vial) · infusión " + H.n(f.hep.ritmo_mL_h, 1) + " mL/h · para " + dias + " días: " + f.hep.viales + " viales de 5 mL + " + H.n(f.hep.mL_suero, 0) + " mL de SF (volumen final " + H.n(f.hep.mL_total, 0) + " mL)." : f.r.recomendacion;
      var tandas = !f.vd ? "—" : f.hep ? "1" : f.r.semana ? "1 (toda la semana)" : f.r.tandas + " × " + f.r.dias_por_tanda + " día(s)";
      return '<tr><td data-et="Línea"><b>' + esc(f.nombre) + '</b><div class="muy-tenue">' + esc(f.producto) + '</div></td><td data-et="Solución madre">' + comps + '</td><td class="num" data-et="Volumen al día">' + (f.vd ? H.n(f.vd, 1) + " mL" : "—") + '</td><td class="num" data-et="Para ' + dias + ' días">' + (f.vd ? H.n(f.hep ? f.hep.mL_total : f.r.total_mL, 0) + " mL" : "—") + '</td><td class="num" data-et="Tandas">' + esc(tandas) + '</td><td data-et="Cómo prepararla">' + esc(prep) + (f.receta ? '<div class="muy-tenue">' + esc(f.receta) + "</div>" : "") + "</td></tr>";
    }).join("");
    return '<section class="tarjeta prep-soluciones imprimible"><div class="cabecera"><h3>Preparación de las soluciones · ' + esc(v) + " · " + esc(C.PROTOCOLOS[v].propuesto ? "propuesto" : C.PROTOCOLOS[v].ref) + "</h3>" + info(INFO_PREP) + (hp.revisar ? '<span class="chip aj">Horario del protocolo por revisar</span>' : "") + "</div>" +
      '<p class="muy-tenue">Para ' + dias + " días de perfusión con " + H.n(V, 0) + " mL de perfusato" + (opc.V ? "" : " (referencia del protocolo)") + ".</p>" +
      '<div class="tabla-env"><table class="t tabla-prep-sol"><thead><tr><th>Línea y producto</th><th>Solución madre · aporte al perfusato</th><th class="num">Volumen al día</th><th class="num">Para ' + dias + ' días</th><th class="num">Tandas</th><th>Cómo prepararla</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
      (opc.imprimir === false ? "" : '<div class="fila-flex no-imprimir" style="margin-top:8px"><button type="button" class="bt" data-act="imprimir">' + ico("printer") + "Imprimir la preparación</button></div>") + "</section>";
  };
  var modalPrev = H.modal;
  H.modal = function (o) {
    var t = String((o && o.titulo) || ""), m = /^Programación · (.+)$/.exec(t);
    if (o && (t === "Programar experimento" || m) && typeof o.cuerpo === "string" && o.cuerpo.indexOf('id="pgProt"') !== -1) {
      var e = m ? H.exp(m[1]) : null, V = e ? H.Vperf(e.ID) : null, ab = o.alAbrir;
      o.alAbrir = function (d) {
        var r = ab ? ab.apply(this, arguments) : undefined;
        try {
          var sel = d.querySelector("#pgProt"), err = d.querySelector("#pgErr"), cont = document.createElement("details"); cont.className = "plegable pg-prep"; cont.open = true;
          cont.innerHTML = "<summary>" + ico("flask-conical") + ' Preparación de las soluciones según el protocolo</summary><div class="dentro" id="pgPrep">' + H.preparacionVersionHTML(sel ? sel.value : C.versionActual(), { V: V }) + "</div>";
          if (err && err.parentNode) err.parentNode.insertBefore(cont, err); else if (sel && sel.closest) sel.closest(".rejilla").parentNode.appendChild(cont);
          if (sel) sel.addEventListener("change", function () { var c = d.querySelector("#pgPrep"); if (c) c.innerHTML = H.preparacionVersionHTML(sel.value, { V: V }); });
        } catch (x) { console.error(x); }
        return r;
      };
    }
    return modalPrev.apply(this, arguments);
  };
  var prepPrev = H.tabsExp.preparacion;
  if (prepPrev) H.tabsExp.preparacion = function (e, p) {
    var h = prepPrev.apply(this, arguments); if (!e || (p || [])[0] !== "farmacos") return h;
    var b = H.preparacionVersionHTML(H.versionExp(e), { V: H.Vperf(e.ID) }); return /<\/div>$/.test(h) ? h.replace(/<\/div>$/, b + "</div>") : h + b;
  };
  var progResPrev = H.progResumen;
  if (progResPrev) H.progResumen = function (e) { var h = progResPrev.apply(this, arguments); if (!e || !e.ID) return h; return h.replace(/<\/div>$/, '<a class="chip" href="#/exp/' + encodeURIComponent(e.ID) + '/preparacion/farmacos">' + ico("flask-conical", "s") + " Preparación de las soluciones (" + esc(H.versionExp(e)) + ")</a></div>"); };

  // ============================================================== 5. Inicio de la perfusión: infusiones que deben iniciarse
  var INFO_INF = "Sale del horario circadiano del protocolo del experimento (Configuración → Horario circadiano; en la tabla de infusiones, las líneas desmarcadas no salen y los ritmos se reescalan si el volumen real se desvía más de 100 mL) a la hora del reloj del inicio de la perfusión: no hay otra fuente de recomendación. " +
    "Se envía como aviso al equipo al pulsar «Inicio de la perfusión», junto con la heparina continua (tabla de infusiones) y la extracción inicial de la HDF (primer tramo del plan, múltiplo de 10). Al terminar el recalentamiento llega otro aviso para comprobar que todas las infusiones están en marcha.";
  function heparinaExp(e) {
    var d = H.form(e.ID, "calculos", "") || {}, r = C.num(((d.anti || {}).ritmo)); if (r) return r;
    try { return C.heparina(H.Vperf(e.ID), S.cfg.general.dias_perfusion, S.cfg.perfusato).ritmo_mL_h; } catch (x) { return null; }
  }
  H.infusionesInicioExp = function (e, fecha) {
    var circ = H.circadianoDe(e), p = H.protocoloExp(e), f = C.aFecha(fecha) || new Date();
    var ext = C.planExtraccion({ circ: circ, desde: f, horas: 1, balance_mL: 0, bilis_mL_h: 0, cfg: cfgH() }).ahora_mL_h;
    var l = C.infusionesInicio(circ, f, p.lineas, cfgH(), { heparina_mL_h: heparinaExp(e), extraccion_mL_h: ext }); l.version = p.version || H.versionExp(e); return l;
  };
  H.avisosInfusiones = function (e, t0) {
    var exp = e.ID, ini = C.aFecha(t0); if (!ini) return [];
    var lst = H.infusionesInicioExp(e, ini), partes = C.textoInfusiones(lst), n = partes.length, ahora = new Date().toISOString();
    var out = partes.map(function (tx, i) { return { ID: exp + "|infusiones|inicio|" + (i + 1), Experimento: exp, Fecha_hora: ahora, Tipo: "circadiano", Destino: "equipo", Vista: "exp:" + exp + ":quirofano", Titulo: "Iniciar las infusiones · " + exp + " (" + lst.version + (n > 1 ? ", " + (i + 1) + "/" + n : "") + ")", Texto: tx }; });
    var fin = C.finRecalentamiento(ini, S.cfg.recalentamiento);
    if (fin) { var l2 = H.infusionesInicioExp(e, fin); l2.etiqueta_hdf = "extracción recomendada"; var p2 = C.textoInfusiones(l2, 330);
      p2.forEach(function (tx, i) { out.push({ ID: exp + "|infusiones|fin_recal|" + (i + 1), Experimento: exp, Fecha_hora: fin.toISOString(), Tipo: "circadiano", Destino: "equipo", Vista: "exp:" + exp + ":seguimiento", Titulo: "Fin del recalentamiento: comprobar las infusiones · " + exp + (p2.length > 1 ? " (" + (i + 1) + "/" + p2.length + ")" : ""), Texto: (i === 0 ? "Comprueba que todas las infusiones están en marcha:\n" : "") + tx }); }); }
    return out;
  };
  var progPrev = H.programarAvisos;
  H.programarAvisos = function (exp, avisos, tipos) {
    tipos = tipos || []; var e = null, t0 = null;
    try {
      e = H.exp(exp); t0 = H.inicioPerf(exp) || (e && e.Inicio_perfusion) || null;
      if (e && t0 && tipos.indexOf("circadiano") !== -1 && !(H.esHistorico && H.esHistorico(e)) && !(H.perfTerminada && H.perfTerminada(exp))) {
        var ya = Date.now(), ini = C.aFecha(t0).getTime(), prev = {}; (S.t.Avisos || []).forEach(function (a) { if (a.Experimento === exp) prev[a.ID] = a; });
        var extra = H.avisosInfusiones(e, t0).filter(function (a) { var x = prev[a.ID];
          if (/\|inicio\|/.test(a.ID)) return x ? x.Estado === "Pendiente" : ya - ini < 15 * 6e4 && ya >= ini - 6e4;
          return C.aFecha(a.Fecha_hora).getTime() > ya - 6e4; });
        avisos = (avisos || []).filter(function (a) { return !/\|infusiones\|/.test(a.ID); }).concat(extra);
      }
    } catch (x) { console.error(x); }
    var r = progPrev.call(this, exp, avisos, tipos);
    try { if (e && t0 && tipos.indexOf("recalentamiento") !== -1 && H.programarPlanHDF && H.balanceExp && !(H.esHistorico && H.esHistorico(e))) H.programarPlanHDF(exp, H.balanceExp(e)); } catch (x) { console.error(x); }
    return r;
  };
  function tarjetaInfusiones(e, t0, fin) {
    var l = H.infusionesInicioExp(e, t0), li = l.iniciar.map(function (x) { var p = [x.producto, x.madre].filter(Boolean).join(", "); return "<li><b>" + esc(x.nombre) + "</b>" + (p ? ' <span class="muy-tenue">(' + esc(p) + ")</span>" : "") + " → <b>" + H.n(x.mL_h, 2) + " mL/h</b></li>"; }).join("");
    if (l.heparina_mL_h) li += "<li><b>Heparina continua</b> → <b>" + H.n(l.heparina_mL_h, 2) + " mL/h</b></li>";
    if (l.extraccion_mL_h !== null && l.extraccion_mL_h !== undefined) li += "<li><b>HDF · extracción inicial</b> → <b>" + H.n(l.extraccion_mL_h, 0) + " mL/h</b> <span class=\"muy-tenue\">(múltiplo de 10)</span></li>";
    var desp = l.despues.length ? '<p class="muy-tenue">Sin ritmo a esa hora: ' + l.despues.map(function (x) { return esc(x.nombre) + " (a las " + esc(x.proxima_h) + ", " + H.n(x.proximo_mL_h, 2) + " mL/h)"; }).join(" · ") + ".</p>" : "";
    return '<section class="tarjeta qx-infusiones"><div class="cabecera"><h2>Infusiones que deben iniciarse</h2><span class="chip pri">' + esc(l.version || "") + " · inicio " + esc(H.hora(t0)) + "</span>" + info(INFO_INF) + "</div>" +
      (l.iniciar.length ? "" : '<p class="tenue">' + (H.esCircadiano(e) ? "El horario del protocolo no tiene ninguna línea con ritmo a esa hora." : "Protocolo no circadiano: solo la heparina y la HDF.") + "</p>") + '<ul class="lista-inf">' + li + "</ul>" + desp +
      (fin ? '<p class="muy-tenue">A las <b>' + esc(H.hora(fin)) + "</b> (fin del recalentamiento) llega un aviso para comprobar que todas están en marcha.</p>" : "") + "</section>";
  }
  H.tarjetaInfusionesInicio = tarjetaInfusiones;
  var qxPrev = H.tabsExp.quirofano;
  H.tabsExp.quirofano = function (e) {
    var h = qxPrev.apply(this, arguments);
    try {
      if (!e || (H.esHistorico && H.esHistorico(e)) || (H.perfTerminada && H.perfTerminada(e.ID))) return h;
      var t0 = H.eventos(e.ID).inicio_perfusion; if (!t0) return h;
      var fin = C.finRecalentamiento(t0, S.cfg.recalentamiento), lim = (fin ? fin.getTime() : C.aFecha(t0).getTime()) + 60 * 6e4; if (Date.now() > lim) return h;
      var i = h.indexOf("</section>"), card = tarjetaInfusiones(e, t0, fin); return i === -1 ? card + h : h.slice(0, i + 10) + card + h.slice(i + 10);
    } catch (x) { console.error(x); return h; }
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v072b.js"] = "0.7.3";
