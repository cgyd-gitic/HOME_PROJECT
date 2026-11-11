/* HOME · ficha de experimento (2): preparación, quirófano/recalentamiento, seguimiento con asesor de gases, cierre. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico, campo = H.campo;
  function ind() { return "<span id=\"indGuardado\" class=\"guardado\">" + ico("check", "s") + "Guardado automático</span>"; }
  function sub(e, base, lista, act) { return "<div class=\"segmentado\" role=\"tablist\" style=\"margin-bottom:12px;flex-wrap:wrap\">" + lista.map(function (x) { return "<button role=\"tab\" aria-selected=\"" + (x[0] === act) + "\" class=\"" + (x[0] === act ? "activo" : "") + "\" data-act=\"irSub\" data-r=\"exp/" + encodeURIComponent(e.ID) + "/" + base + "/" + x[0] + "\">" + x[1] + "</button>"; }).join("") + "</div>"; }

  // ============================================================================ PREPARACIÓN
  H.tabsExp.preparacion = function (e, p) {
    var s = p[0] || "calculos";
    return sub(e, "preparacion", [["calculos", "Cálculos del perfusato"], ["material", "Checklist de material"]], s) + (s === "material" ? checklist(e) : calculos(e));
  };
  // ---- checklist de material
  function checklist(e) {
    var d = H.usarForm(e.ID, "checklist", ""), mats = H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }), puedo = H.puede("registrar");
    if (!mats.length) return "<div class=\"vacio\">" + ico("package", "l") + "<p>El catálogo de material está vacío.</p><p class=\"tenue\">Importa el listado (Excel o CSV) en <a href=\"#/inventario\">Inventario</a> o añade los materiales uno a uno.</p></div>";
    d.items = d.items || {}; var cats = {}; mats.forEach(function (m) { (cats[m.Categoria || "Sin categoría"] = cats[m.Categoria || "Sin categoría"] || []).push(m); });
    var total = mats.length, hechos = mats.filter(function (m) { return d.items[m.ID] && d.items[m.ID].ok; }).length, falta = [];
    var html = "<div class=\"fila-flex sep\" style=\"margin-bottom:10px\"><div><b>" + hechos + " / " + total + "</b> comprobados" + (d.confirmado_en ? " · <span class=\"chip ok\">Descontado del inventario el " + esc(H.fechaHora(d.confirmado_en)) + " por " + esc(d.confirmado_por || "") + "</span>" : "") + "</div>" +
      (puedo ? "<div class=\"fila-flex\"><button class=\"bt\" data-act=\"chkTodo\">Marcar todo</button>" + (!H.puede("inventario") ? (d.revisado_en ? "<span class=\"chip ok\">Revisado " + esc(H.fechaHora(d.revisado_en)) + "</span>" : "<button class=\"bt pri\" data-act=\"chkRevisado\" data-exp=\"" + esc(e.ID) + "\">" + ico("clipboard-check") + "Marcar checklist como revisado</button>") : d.confirmado_en ? "<button class=\"bt peligro\" data-act=\"chkDeshacer\" data-exp=\"" + esc(e.ID) + "\">" + ico("undo-2") + "Devolver al inventario</button>" : "<button class=\"bt pri\" data-act=\"chkConfirmar\" data-exp=\"" + esc(e.ID) + "\">" + ico("clipboard-check") + "Confirmar y descontar</button>") + "</div>" : "") + "</div>" +
      (puedo && !H.puede("inventario") && !d.confirmado_en ? "<div class=\"aviso info\">" + ico("info") + "<div>El descuento del material del inventario lo hace un administrador (el inventario es de gestión exclusiva de los administradores).</div></div>" : "");
    Object.keys(cats).sort().forEach(function (c) {
      html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>" + esc(c) + "</h3></div><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th style=\"width:40px\"><span class=\"sr\">Comprobado</span></th><th>Material</th><th class=\"num\">Cantidad para esta perfusión</th><th class=\"num\">Stock</th><th>Estado</th></tr></thead><tbody>" +
        cats[c].map(function (m) {
          var it = d.items[m.ID] || {}, cant = it.cant !== undefined ? it.cant : C.num(m.Por_perfusion) || 0, st = H.stockDe(m), min = C.num(m.Stock_minimo), quedan = st - (d.confirmado_en ? 0 : cant);
          var est = st < cant && !d.confirmado_en ? "<span class=\"chip al\">Stock insuficiente</span>" : min !== null && quedan < min ? "<span class=\"chip aj\">Quedará bajo mínimo</span>" : "<span class=\"chip ok\">OK</span>";
          if (st < cant && !d.confirmado_en) falta.push(m.Nombre);
          return "<tr><td><input type=\"checkbox\" aria-label=\"Comprobado: " + esc(m.Nombre) + "\" data-cambio=\"chkItem\" data-id=\"" + esc(m.ID) + "\"" + (it.ok ? " checked" : "") + (puedo && !d.confirmado_en ? "" : " disabled") + "></td><td>" + esc(m.Nombre) + (m.Referencia ? " <span class=\"muy-tenue\">" + esc(m.Referencia) + "</span>" : "") + "</td>" +
            "<td class=\"num\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" style=\"width:90px\" aria-label=\"Cantidad de " + esc(m.Nombre) + "\" value=\"" + cant + "\" data-cambio=\"chkCant\" data-id=\"" + esc(m.ID) + "\"" + (puedo && !d.confirmado_en ? "" : " disabled") + "> " + esc(m.Unidad || "") + "</td><td class=\"num\">" + H.n(st, 1) + "</td><td>" + est + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
    });
    if (falta.length) html = "<div class=\"aviso al\">" + ico("triangle-alert") + "<div><b>Falta material:</b> " + esc(falta.join(", ")) + ". <a href=\"#/inventario/solicitudes\">Solicitar compra</a></div></div>" + html;
    return html;
  }
  H.acc.chkItem = function (el) { var d = H.usarForm(H.ruta().partes[1], "checklist", ""); d.items = d.items || {}; var it = d.items[el.getAttribute("data-id")] = d.items[el.getAttribute("data-id")] || {}; it.ok = el.checked; H.guardarForm(H.ruta().partes[1], "checklist", "", d); };
  H.acc.chkCant = function (el) { var d = H.usarForm(H.ruta().partes[1], "checklist", ""); d.items = d.items || {}; var it = d.items[el.getAttribute("data-id")] = d.items[el.getAttribute("data-id")] || {}; it.cant = C.num(el.value) || 0; H.guardarForm(H.ruta().partes[1], "checklist", "", d); };
  H.acc.chkTodo = function () { var exp = H.ruta().partes[1], d = H.usarForm(exp, "checklist", ""); d.items = d.items || {}; H.filas("Material").forEach(function (m) { (d.items[m.ID] = d.items[m.ID] || {}).ok = true; }); H.guardarForm(exp, "checklist", "", d); H.repintar(); };
  H.acc.chkConfirmar = function (el) {
    var exp = el.getAttribute("data-exp"), d = H.usarForm(exp, "checklist", ""), movs = [];
    H.filas("Material").forEach(function (m) { var it = (d.items || {})[m.ID] || {}, cant = it.cant !== undefined ? it.cant : C.num(m.Por_perfusion) || 0; if (it.ok && cant > 0) movs.push({ ID: H.uid(), Material: m.ID, Fecha: new Date().toISOString(), Cantidad: -cant, Motivo: "Consumo perfusión", Experimento: exp, Nota: "Checklist " + exp }); });
    if (!movs.length) { H.toast("Marca al menos un material con cantidad mayor que 0.", "error"); return; }
    H.confirmar("Descontar del inventario", "Se registrarán " + movs.length + " salidas de material asociadas a " + exp + ". Si un material queda por debajo del mínimo se avisará a los administradores.", "Descontar").then(function (ok) {
      if (!ok) return; d.confirmado_en = new Date().toISOString(); d.confirmado_por = (S.usuario || {}).nombre; d.movimientos = movs.map(function (m) { return m.ID; });
      H.guardar("Movimientos", movs, { sinRepintar: true }); H.guardarForm(exp, "checklist", "", d, {}); H.toast("Material descontado."); H.pintarMarco(); H.repintar();
    });
  };
  H.acc.chkRevisado = function (el) { var exp = el.getAttribute("data-exp"), d = H.usarForm(exp, "checklist", ""); d.revisado_en = new Date().toISOString(); d.revisado_por = (S.usuario || {}).nombre; H.guardarForm(exp, "checklist", "", d); H.toast("Checklist marcado como revisado. Un administrador hará el descuento del inventario."); H.repintar(); };
  H.acc.chkDeshacer = function (el) {
    var exp = el.getAttribute("data-exp"), d = H.usarForm(exp, "checklist", "");
    H.confirmar("Devolver al inventario", "Se anularán las salidas registradas por este checklist.", "Devolver", true).then(function (ok) { if (!ok) return; H.borrar("Movimientos", d.movimientos || []); delete d.confirmado_en; delete d.confirmado_por; d.movimientos = []; H.guardarForm(exp, "checklist", "", d, {}); H.pintarMarco(); H.repintar(); });
  };

  // ---- cálculos del perfusato
  var CEBADO = [{ k: "sangre", n: "Sangre porcina total", rec: function (V) { return S.cfg.general.volumen_sangre_mL + " mL"; }, def: function () { return S.cfg.general.volumen_sangre_mL; } },
    { k: "heparina", n: "Heparina sódica (5000 U/mL)", rec: function (V) { var u = V / 1000 * S.cfg.perfusato.heparina_U_L; return H.n(u, 0) + " U = " + H.n(u / 5000, 2) + " mL (2500 U/L)"; }, def: function (V) { return C.r(V / 1000 * S.cfg.perfusato.heparina_U_L / 5000, 1); } },
    { k: "cefoxitina", n: "Cefoxitina (1 g/10 mL)", rec: function () { return "5 mL"; }, def: function () { return 5; } },
    { k: "metronidazol", n: "Metronidazol (500 mg/100 mL)", rec: function () { return "50 mL"; }, def: function () { return 50; } }];
  var PREP = [
    { g: "Control oxidativo", k: "nac", n: "N-acetilcisteína (Hidonac 200 mg/mL)", rec: "0,6 mL en la reperfusión", recN: 0.6 },
    { g: "Control glucémico", k: "ins_ins", n: "Insulina (100 UI/mL)", rec: "0,1 mL", recN: 0.1 }, { g: "Control glucémico", k: "ins_ss", n: "Cloruro sódico 0,9 %", rec: "95 mL", recN: 95 }, { g: "Control glucémico", k: "ins_alb", n: "Albúmina 200 g/L (1 %)", rec: "5 mL", recN: 5 },
    { g: "Producción biliar", k: "tc", n: "Taurocolato sódico (confirmar 31 g frente a 3,1 g)", rec: "31 g", recN: 31, u: "g" }, { g: "Producción biliar", k: "tc_ss", n: "Cloruro sódico 0,9 %", rec: "445 mL", recN: 445 }, { g: "Producción biliar", k: "tc_alb", n: "Albúmina 200 g/L (1 %)", rec: "25 mL", recN: 25 },
    { g: "Estímulos diurnos", k: "hc_stock", n: "Actocortina 75 mg/mL → stock", rec: "0,7 mL (52,5 mg → 1,05 mg/mL) + 49,3 mL SF; para 1 mg/mL usar 0,67 mL", recN: 0.7 }, { g: "Estímulos diurnos", k: "hc_inf", n: "Actocortina stock → infusión", rec: "7,2 mL + 992,8 mL SF (7,56 µg/mL con el stock a 1,05 mg/mL)", recN: 7.2 },
    { g: "Estímulos nocturnos", k: "mel_stock", n: "Melatonina pura (stock 20 µg/mL)", rec: "1 mg + 10 mL propanodiol + 40 mL SF", recN: 1, u: "mg" }, { g: "Estímulos nocturnos", k: "mel_inf", n: "Melatonina stock → infusión", rec: "1 mL + 99 mL SF (0,2 µg/mL)", recN: 1 },
    { g: "Profilaxis diaria", k: "pro_met", n: "Metronidazol (5 mg/mL)", rec: "100 mL", recN: 100 }, { g: "Profilaxis diaria", k: "pro_cef", n: "Cefoxitina (100 mg/mL)", rec: "10 mL", recN: 10 }, { g: "Profilaxis diaria", k: "pro_flu", n: "Fluconazol (2 mg/mL) · la hoja dice 48 mL recomendados y 4 mL administrados", rec: "48 mL (96 mg/día)", recN: 48 }];
  var NPT = { 1500: { olig: 15, vit: 1.5, tau: 1.5, col: 1.3 }, 2000: { olig: 20, vit: 2, tau: 2, col: 1.5 } };
  // volúmenes preparados por línea del horario circadiano (para comprobar cobertura)
  var PREP_LINEA = { "Hidrocortisona": function (d) { return 1000; }, "Ácidos biliares": function (d) { return (C.num(H.leerRuta(d, "prep.tc_ss")) || 445) + (C.num(H.leerRuta(d, "prep.tc_alb")) || 25); }, "Insulina": function () { return 100; }, "Melatonina": function () { return 100; },
    "NP (glucosa + AA)": function (d) { return C.num(d.npt) || 1500; } };
  function volumenDiario(circ, linea) {
    var ev = circ.cambios.filter(function (c) { return c.linea === linea; }).slice().sort(function (a, b) { return C.hm(a.h) - C.hm(b.h); }); if (!ev.length || ev[0].unidad !== "mL/h") return null;
    var tot = 0; for (var i = 0; i < ev.length; i++) { var a = C.hm(ev[i].h), b = i + 1 < ev.length ? C.hm(ev[i + 1].h) : C.hm(ev[0].h) + 1440; tot += ev[i].valor * (b - a) / 60; } return tot;
  }
  H.volumenDiario = volumenDiario;
  function calculos(e) {
    var d = H.usarForm(e.ID, "calculos", ""), cfg = S.cfg.perfusato, puedo = H.puede("registrar"); d.ceb = d.ceb || {}; d.corr = d.corr || {};
    var Vceb = CEBADO.reduce(function (s, c) { var v = C.num(d.ceb[c.k]); return s + (v === null ? c.def(S.cfg.general.volumen_sangre_mL) : v); }, 0) + (C.num(d.ceb_otros) || 0);
    var Vcorr = ["KCl", "CaCl2", "NaHCO3", "Albumina"].reduce(function (s, k) { return s + (C.num(d.corr[k]) || 0); }, 0), Vtot = Vceb + Vcorr;
    if (d.V_total_mL !== Math.round(Vtot)) { d.V_total_mL = Math.round(Vtot); H.retrasar("vtot", 300, function () { H.guardarForm(e.ID, "calculos", "", d); }); }
    H.formActivo(function () { H.retrasar("rep", 900, H.repintarPronto); });
    var pre = {}; ["pH", "pO2", "pCO2", "Hb", "Hto", "Lactato", "HCO3", "BE", "K", "Cl", "Ca", "Na", "Glucosa", "Albumina", "Mg", "P", "Osm"].forEach(function (v) { var m = H.valor(e.ID, "PRE", "Pre", v); pre[v] = m ? C.num(m.Valor) : null; });
    var obj = H.mezclar(cfg.objetivos_correccion, d.obj || {}), cc = C.correccionesPerfusato(pre, Vceb, H.mezclar(cfg, { objetivos_correccion: obj }));
    var html = "<div class=\"fila-flex sep\" style=\"margin-bottom:10px\"><div class=\"kpis\" style=\"flex:1\"><div class=\"kpi\"><div class=\"et\">Volumen de cebado</div><div class=\"v\">" + H.n(Vceb, 0) + "<small>mL</small></div></div><div class=\"kpi\"><div class=\"et\">Correcciones añadidas</div><div class=\"v\">" + H.n(Vcorr, 1) + "<small>mL</small></div></div><div class=\"kpi ok\"><div class=\"et\">Volumen total de perfusato</div><div class=\"v\">" + H.n(Vtot, 0) + "<small>mL</small></div></div>" +
      "<div class=\"kpi\"><div class=\"et\">Volumen plasmático estimado</div><div class=\"v\">" + (cc.f_plasma !== null ? H.n(Vceb * cc.f_plasma, 0) + "<small>mL</small>" : "—") + "</div></div></div>" + ind() + "</div>";
    // 1. cebado
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>1 · Solución de cebado</h3></div><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Producto</th><th>Cantidad recomendada</th><th>Cantidad administrada</th></tr></thead><tbody>" +
      CEBADO.map(function (c) { var v = d.ceb[c.k]; return "<tr><td>" + esc(c.n) + "</td><td>" + esc(c.rec(Vceb)) + "</td><td><div class=\"unidad-in\" style=\"max-width:160px\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" aria-label=\"" + esc(c.n) + " administrado\" value=\"" + (v === undefined || v === null ? c.def(S.cfg.general.volumen_sangre_mL) : v) + "\" data-k=\"ceb." + c.k + "\" data-cambio=\"campoForm\"" + (puedo ? "" : " disabled") + "><span>mL</span></div></td></tr>"; }).join("") +
      "<tr><td>Otros (volumen)</td><td class=\"muy-tenue\">—</td><td><div class=\"unidad-in\" style=\"max-width:160px\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" aria-label=\"Otros volúmenes\" value=\"" + esc(d.ceb_otros || "") + "\" data-k=\"ceb_otros\" data-cambio=\"campoForm\"" + (puedo ? "" : " disabled") + "><span>mL</span></div></td></tr></tbody></table></div></section>";
    // 2. muestra pre-perfusión
    var vpre = ["pH", "pO2", "pCO2", "Hb", "Hto", "Lactato", "HCO3", "BE", "K", "Cl", "Ca", "Na", "Glucosa", "Albumina", "Mg", "P", "Osm"];
    var mpre = H.med(e.ID).filter(function (m) { return m.Muestra === "PRE" && m.Punto === "Pre"; })[0];
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>2 · Muestra pre-perfusión (perfusato)</h3><div class=\"campo\" style=\"margin:0\"><label class=\"sr\" for=\"preF\">Hora de extracción</label><input id=\"preF\" type=\"datetime-local\" value=\"" + H.aLocal((mpre && mpre.Fecha_hora) || new Date()) + "\" style=\"width:auto\"" + (puedo ? "" : " disabled") + "></div><a class=\"bt mini\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/seguimiento/pre\">Panel completo</a></div><div class=\"rejilla estrecha\">" +
      vpre.map(function (v) { var vd = C.variable("PRE", v), m = H.valor(e.ID, "PRE", "Pre", v), val = m ? H.aVista(v, m.Valor) : ""; return "<div class=\"campo\"><label class=\"et\" for=\"pre_" + v + "\">" + esc(vd.nombre) + " <span class=\"muy-tenue\">" + esc(H.unidadVisible(v, vd.unidad)) + "</span></label><input id=\"pre_" + v + "\" inputmode=\"decimal\" autocomplete=\"off\" class=\"" + (m ? H.claseValor("PRE", v, m.Valor) : "") + "\" value=\"" + esc(String(val).replace(".", ",")) + "\" data-cambio=\"preVal\" data-exp=\"" + esc(e.ID) + "\" data-v=\"" + v + "\"" + (puedo ? "" : " disabled") + "></div>"; }).join("") + "</div></section>";
    // 3. correcciones
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>3 · Soluciones de corrección</h3><span class=\"muy-tenue\">V = " + H.n(Vceb, 0) + " mL" + (cc.f_plasma !== null ? " · Hto " + H.n(pre.Hto, 1) + " %" : " · sin Hto: no se calcula el volumen plasmático") + "</span></div>" +
      "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Producto</th><th class=\"num\">Medido</th><th class=\"num\">Objetivo</th><th class=\"num\">Fórmula del grupo</th><th class=\"num\">Alternativa propuesta</th><th>Administrado</th></tr></thead><tbody>" +
      cc.items.map(function (it) {
        return "<tr><td><b>" + esc(it.producto) + "</b><div class=\"muy-tenue\" style=\"white-space:normal;max-width:360px\">" + esc(it.nota_alternativa) + "</div></td><td class=\"num\">" + (it.medido === null ? "—" : H.n(it.medido, 2) + " " + esc(it.unidad)) + "</td>" +
          "<td class=\"num\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" style=\"width:80px\" aria-label=\"Objetivo " + esc(it.clave) + "\" value=\"" + obj[it.clave === "KCl" ? "K" : it.clave === "CaCl2" ? "Ca" : it.clave === "NaHCO3" ? "HCO3" : "Albumina"] + "\" data-k=\"obj." + (it.clave === "KCl" ? "K" : it.clave === "CaCl2" ? "Ca" : it.clave === "NaHCO3" ? "HCO3" : "Albumina") + "\" data-cambio=\"campoForm\"" + (puedo ? "" : " disabled") + "></td>" +
          "<td class=\"num\">" + (it.mL_grupo === null ? "—" : "<b>" + H.n(it.mL_grupo, 1) + " mL</b>") + "</td><td class=\"num\">" + (it.mL_alternativa === null ? "—" : H.n(it.mL_alternativa, 1) + " mL") + "</td>" +
          "<td><div class=\"unidad-in\" style=\"max-width:130px\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" aria-label=\"" + esc(it.producto) + " administrado\" value=\"" + esc(d.corr[it.clave] === undefined ? "" : d.corr[it.clave]) + "\" data-k=\"corr." + it.clave + "\" data-cambio=\"campoForm\"" + (puedo ? "" : " disabled") + "><span>mL</span></div></td></tr>";
      }).join("") + "</tbody></table></div>" +
      (cc.Na_proyectado !== null ? "<p style=\"margin-top:8px\">Na⁺ proyectado tras el bicarbonato: <b class=\"" + H.claseValor("PERF", "Na", cc.Na_proyectado) + "\">" + H.n(cc.Na_proyectado, 1) + " mmol/L</b> (8,4 % aporta 1 mmol de Na⁺ por mL).</p>" : "") +
      avisosExtra(pre) + "</section>";
    // 4. anticoagulación
    var hep = C.heparina(Vtot, S.cfg.general.dias_perfusion, cfg);
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>4 · Anticoagulación</h3></div><div class=\"kpis\"><div class=\"kpi\"><div class=\"et\">Ritmo de infusión</div><div class=\"v\">" + H.n(hep.ritmo_mL_h, 1) + "<small>mL/h (" + H.n(cfg.heparina_infusion_U_h, 0) + " U/h a " + H.n(cfg.heparina_infusion_conc_U_mL, 0) + " U/mL)</small></div></div>" +
      "<div class=\"kpi\"><div class=\"et\">Para " + S.cfg.general.dias_perfusion + " días</div><div class=\"v\">" + hep.viales + "<small>viales de 5 mL</small></div></div><div class=\"kpi\"><div class=\"et\">Suero fisiológico</div><div class=\"v\">" + H.n(hep.mL_suero, 0) + "<small>mL</small></div></div><div class=\"kpi\"><div class=\"et\">Volumen final</div><div class=\"v\">" + H.n(hep.mL_total, 0) + "<small>mL · " + H.n(hep.horas_cubiertas, 0) + " h</small></div></div></div>" +
      "<div class=\"rejilla\" style=\"margin-top:10px\">" + campo("anti.preparado_mL", "Volumen preparado", H.leerRuta(d, "anti.preparado_mL"), { tipo: "number", u: "mL" }) + campo("anti.ritmo", "Ritmo programado", H.leerRuta(d, "anti.ritmo"), { tipo: "number", u: "mL/h" }) + "</div></section>";
    // 5. NPT
    var np = NPT[d.npt] || NPT[1500];
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>5 · Nutrición parenteral total (Periolimel N4E)</h3><div class=\"segmentado\"><button class=\"" + (String(d.npt || 1500) === "1500" ? "activo" : "") + "\" data-act=\"npt\" data-v=\"1500\">1500 mL</button><button class=\"" + (String(d.npt) === "2000" ? "activo" : "") + "\" data-act=\"npt\" data-v=\"2000\">2000 mL</button></div></div>" +
      "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Producto</th><th>Recomendado</th><th>Administrado</th></tr></thead><tbody>" +
      [["olig", "Oligoelementos (Supliven)", np.olig + " mL"], ["vit", "Multivitaminas (Cernevit)", H.n(np.vit, 1) + " viales"], ["tau", "Taurina", H.n(np.tau, 1) + " g"], ["col", "Cloruro de colina", H.n(np.col, 1) + " g"]].map(function (x) {
        return "<tr><td>" + esc(x[1]) + "</td><td>" + esc(x[2]) + "</td><td><input style=\"max-width:140px\" aria-label=\"" + esc(x[1]) + " administrado\" value=\"" + esc(H.leerRuta(d, "nptA." + x[0]) || "") + "\" data-k=\"nptA." + x[0] + "\" data-cambio=\"campoForm\" placeholder=\"" + esc(x[2]) + "…\" autocomplete=\"off\"" + (puedo ? "" : " disabled") + "></td></tr>"; }).join("") + "</tbody></table></div>" +
      "<p class=\"muy-tenue\" style=\"margin-top:6px\">En la hoja original, el cloruro de colina administrado (1,2 g) no coincide con el recomendado (1,3 g): confirmar cuál es el correcto.</p></section>";
    // 6. preparaciones
    var grupos = {}; PREP.forEach(function (x) { (grupos[x.g] = grupos[x.g] || []).push(x); });
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>6 · Preparaciones del protocolo circadiano</h3><span class=\"muy-tenue\">Se marca en ámbar si lo administrado difiere más de un 5 % de lo recomendado</span></div><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Grupo</th><th>Producto</th><th>Recomendado</th><th>Administrado</th></tr></thead><tbody>" +
      Object.keys(grupos).map(function (g) { return grupos[g].map(function (x, i) { var a = H.leerRuta(d, "prep." + x.k), dif = C.num(a) !== null && Math.abs(C.num(a) - x.recN) / x.recN > 0.05;
        return "<tr><td>" + (i ? "" : "<b>" + esc(g) + "</b>") + "</td><td>" + esc(x.n) + "</td><td>" + esc(x.rec) + "</td><td><div class=\"fila-flex\"><div class=\"unidad-in\" style=\"max-width:140px\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" aria-label=\"" + esc(x.n) + " administrado\" value=\"" + esc(a === null ? "" : a) + "\" data-k=\"prep." + x.k + "\" data-cambio=\"campoForm\"" + (puedo ? "" : " disabled") + "><span>" + esc(x.u || "mL") + "</span></div>" + (dif ? "<span class=\"chip aj\">Difiere</span>" : "") + "</div></td></tr>"; }).join(""); }).join("") + "</tbody></table></div></section>";
    // 7. coherencia con el horario circadiano
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>7 · Coherencia con la administración circadiana</h3>" + (S.cfg.circadiano.verificado ? "<span class=\"chip ok\">Horario verificado</span>" : "<span class=\"chip aj\">Horario en borrador</span>") + "</div>" + coherencia(d, pre, Vtot) + "</section>";
    return html;
  }
  function avisosExtra(pre) {
    var o = [], P = S.cfg.objetivos.PERF;
    if (pre.Mg !== null && C.enRango(pre.Mg, P.Mg) < 0) o.push("Magnesio bajo (" + H.n(pre.Mg, 2) + " mg/dL): valora sulfato de magnesio.");
    if (pre.P !== null && C.enRango(pre.P, P.P) < 0) o.push("Fosfato bajo (" + H.n(pre.P, 1) + " mg/dL): la NPT y la insulina lo bajarán más; valora glicerofosfato.");
    if (pre.Glucosa !== null && pre.Glucosa > 250) o.push("Glucosa muy alta (" + H.n(pre.Glucosa, 0) + " mg/dL), esperable por la dextrosa del CPDA-1: no adelantes la insulina hasta la primera muestra en normotermia.");
    if (pre.Hb !== null && C.enRango(pre.Hb, P.Hb) < 0) o.push("Hb baja (" + H.n(pre.Hb, 1) + " g/dL): el aporte de O₂ dependerá más de la pO₂; considera concentrado de hematíes.");
    if (pre.Osm !== null && C.enRango(pre.Osm, P.Osm) !== 0) o.push("Osmolalidad fuera de rango (" + H.n(pre.Osm, 0) + " mOsm/kg).");
    if (pre.Lactato !== null && pre.Lactato > 5) o.push("Lactato inicial alto (" + H.n(pre.Lactato, 1) + " mmol/L): su aclaramiento en las primeras horas es un indicador de viabilidad; el hígado lo convertirá en bicarbonato.");
    return o.length ? "<div class=\"aviso aj\" style=\"margin-top:10px\">" + ico("triangle-alert") + "<div><b>Otras correcciones a valorar</b><ul style=\"margin:4px 0 0;padding-left:18px\">" + o.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div>" : "";
  }
  function coherencia(d, pre, V) {
    var circ = S.cfg.circadiano, filas = [];
    Object.keys(PREP_LINEA).forEach(function (l) { var vd = volumenDiario(circ, l); if (vd === null) return; var prep = PREP_LINEA[l](d); filas.push([l, vd, prep, prep / vd]); });
    var F = S.cfg.farmacos || {}, hcStockML = C.num(H.leerRuta(d, "prep.hc_stock")) || F.hidrocortisona_stock_mL_75 || 0.7, hcInfML = C.num(H.leerRuta(d, "prep.hc_inf")) || 7.2;
    var hcConc = hcStockML * 75 / (F.hidrocortisona_stock_vol_mL || 50) * hcInfML / 1000 * 1000;   // µg/mL en la infusión
    var hcBolo = circ.cambios.filter(function (c) { return c.linea === "Hidrocortisona" && c.h === "08:00"; })[0], hto = pre.Hto !== null ? pre.Hto : 30;
    var cb = hcBolo ? C.cortisolBolo(hcBolo.valor, 30, hcConc, V, hto) : null;
    var mel = circ.cambios.filter(function (c) { return c.linea === "Melatonina" && c.valor > 0; })[0], melFin = circ.cambios.filter(function (c) { return c.linea === "Melatonina" && c.valor === 0; })[0];
    var melH = mel && melFin ? (C.hm(melFin.h) - C.hm(mel.h)) / 60 : null, melUg = mel && melH ? mel.valor * melH * 0.2 : null, Vpl = V / 1000 * (1 - hto / 100), melPg = melUg !== null ? melUg / Vpl * 1000 : null;
    var CL = C.num(F.melatonina_CL_mL_min) || 500, melCss = mel ? mel.valor * 0.2 * 1e6 / 60 / CL : null;   // pg/min ÷ mL/min = pg/mL
    var tcMax = Math.max.apply(null, circ.cambios.filter(function (c) { return c.linea === "Ácidos biliares"; }).map(function (c) { return c.valor; }).concat([0]));
    var tcMg = (C.num(H.leerRuta(d, "prep.tc")) || 31) * 1000, tcVol = PREP_LINEA["Ácidos biliares"](d), tcMgH = tcMax ? tcMg / tcVol * tcMax : null;
    return "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Línea</th><th class=\"num\">Volumen diario pautado</th><th class=\"num\">Volumen preparado</th><th class=\"num\">Cobertura</th></tr></thead><tbody>" +
      filas.map(function (f) { return "<tr><td>" + esc(f[0]) + "</td><td class=\"num\">" + H.n(f[1], 0) + " mL</td><td class=\"num\">" + H.n(f[2], 0) + " mL</td><td class=\"num\"><span class=\"chip " + (f[3] < 1 ? "al" : f[3] < 2 ? "aj" : "ok") + "\">" + H.n(f[3], 1) + " días</span></td></tr>"; }).join("") + "</tbody></table></div>" +
      "<ul style=\"margin:10px 0 0;padding-left:18px\">" + (cb ? "<li>Bolo matutino de hidrocortisona (" + H.n(hcBolo.valor, 0) + " mL/h · 30 min · " + H.n(hcConc, 2) + " µg/mL): <b>" + H.n(cb.ug, 0) + " µg</b> → ≈ <b>" + H.n(cb.nmol_L, 0) + " nmol/L</b> en el plasma del circuito sin contar el aclaramiento (objetivo 250–300 nmol/L).</li>" : "") +
      (mel ? "<li>Melatonina (" + H.n(mel.valor, 1) + " mL/h a 0,2 µg/mL" + (melH ? " durante " + H.n(melH, 1) + " h" : "") + "): en estado estacionario con un aclaramiento estimado de " + H.n(CL, 0) + " mL/min ≈ <b>" + H.n(melCss, 0) + " pg/mL</b>" + (melPg !== null ? " (máximo teórico sin aclaramiento: " + H.n(melPg, 0) + " pg/mL)" : "") + "; objetivo 100–200 pg/mL. " + (melCss < 100 ? "<span class=\"chip aj\">Probablemente insuficiente: mide la melatonina y ajusta el ritmo</span>" : "") + " El aclaramiento es una estimación provisional (Configuración → Fármacos).</li>" : "") +
      (tcMgH ? "<li>Taurocolato: " + H.n(tcMg / 1000, 1) + " g en " + H.n(tcVol, 0) + " mL a " + H.n(tcMax, 1) + " mL/h = <b>" + H.n(tcMgH, 0) + " mg/h</b>, frente a ≈" + H.n(F.taurocolato_ref_mg_h || 7.7, 1) + " mg/h en los protocolos publicados (de Vries 2019; Lau 2023). " + (tcMgH > 5 * (F.taurocolato_ref_mg_h || 7.7) ? "<span class=\"chip al\">Confirmar la masa (¿3,1 g?)</span>" : "") + "</li>" : "") + "</ul>";
  }
  H.acc.preVal = function (el) {
    var exp = el.getAttribute("data-exp"), v = el.getAttribute("data-v"), raw = el.value.trim().replace(",", "."), f = H.deLocal(H.$("#preF").value) || new Date().toISOString(), o = {}; o[v] = raw === "" ? "" : H.deVista(v, raw);
    H.guardarMediciones(exp, "PRE", "Pre", null, f, o); H.retrasar("rep", 500, H.repintar);
  };
  H.acc.npt = function (el) { var exp = H.ruta().partes[1], d = H.usarForm(exp, "calculos", ""); d.npt = Number(el.getAttribute("data-v")); H.guardarForm(exp, "calculos", "", d); H.repintar(); };

  // ============================================================================ QUIRÓFANO Y RECALENTAMIENTO
  var EVQ = [["inicio_exanguinacion", "Inicio de la exanguinación"], ["parada_cardiaca", "Parada cardíaca"], ["inicio_preservacion_fria", "Inicio de la preservación en frío"],
    ["inicio_banco", "Inicio de la cirugía de banco"], ["fin_banco", "Fin de la cirugía de banco"], ["inicio_perfusion", "Inicio de la perfusión"], ["fin_recalentamiento", "Fin del recalentamiento"]];
  H.tabsExp.quirofano = function (e) {
    var ev = H.eventos(e.ID), puedo = H.puede("registrar"), sig = EVQ.filter(function (x) { return !ev[x[0]]; })[0], t = C.tiempos(ev);
    var html = "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Tiempos de isquemia</h2><span class=\"muy-tenue\">Pulsa cada hito en el momento en que ocurre. Para corregir una hora, vuelve a pulsarlo.</span></div>" +
      "<div class=\"cronos\" style=\"margin-bottom:12px\">" +
      "<div class=\"crono caliente " + (ev.inicio_exanguinacion && !ev.inicio_preservacion_fria ? "activo" : "") + "\"><div class=\"et\">Isquemia caliente</div><div class=\"t\"" + (ev.inicio_exanguinacion ? " data-crono=\"" + esc(ev.inicio_exanguinacion) + "\"" + (ev.inicio_preservacion_fria ? " data-hasta=\"" + esc(ev.inicio_preservacion_fria) + "\"" : "") : "") + ">--:--:--</div><div class=\"muy-tenue\">Inicio de la exanguinación → inicio de la preservación en frío" + (t.exanguinacion_a_parada_min !== null ? " · hasta parada: " + C.duracionTxt(t.exanguinacion_a_parada_min) : "") + "</div></div>" +
      "<div class=\"crono fria " + (ev.inicio_preservacion_fria && !ev.inicio_perfusion ? "activo" : "") + "\"><div class=\"et\">Isquemia fría</div><div class=\"t\"" + (ev.inicio_preservacion_fria ? " data-crono=\"" + esc(ev.inicio_preservacion_fria) + "\"" + (ev.inicio_perfusion ? " data-hasta=\"" + esc(ev.inicio_perfusion) + "\"" : "") : "") + ">--:--:--</div><div class=\"muy-tenue\">Preservación en frío (incluye la cirugía de banco) → inicio de la perfusión" + (t.cirugia_banco_min !== null ? " · banco: " + C.duracionTxt(t.cirugia_banco_min) : "") + "</div></div>" +
      "<div class=\"crono " + (ev.inicio_perfusion ? "activo" : "") + "\"><div class=\"et\">Perfusión</div><div class=\"t\"" + (ev.inicio_perfusion ? " data-crono=\"" + esc(ev.inicio_perfusion) + "\"" + (ev.fin_perfusion ? " data-hasta=\"" + esc(ev.fin_perfusion) + "\"" : "") : "") + ">--:--:--</div><div class=\"muy-tenue\">Desde la reperfusión</div></div></div>" +
      "<div class=\"pasos-ev\">" + EVQ.map(function (x, i) { var h = ev[x[0]]; return "<button class=\"ev-bt " + (h ? "hecho" : sig && sig[0] === x[0] ? "siguiente" : "") + "\" data-act=\"evQx\" data-exp=\"" + esc(e.ID) + "\" data-t=\"" + x[0] + "\"" + (puedo ? "" : " disabled") + "><span class=\"n\">" + (i + 1) + "</span><b>" + esc(x[1]) + "</b><span class=\"h\">" + (h ? esc(H.diaCorto(h) + " " + H.horaS(h)) : "Pulsar para registrar") + "</span></button>"; }).join("") + "</div></section>";
    html += recalentamiento(e, ev);
    return html;
  };
  H.acc.evQx = function (el) {
    var exp = el.getAttribute("data-exp"), tipo = el.getAttribute("data-t"), ev = H.eventos(exp), nom = EVQ.filter(function (x) { return x[0] === tipo; })[0][1];
    if (ev[tipo]) {
      H.modal({ titulo: nom, cuerpo: "<div class=\"campo\"><label class=\"et\" for=\"evH\">Fecha y hora</label><input id=\"evH\" type=\"datetime-local\" step=\"1\" value=\"" + H.aLocal(ev[tipo]) + ":" + ("0" + C.aFecha(ev[tipo]).getSeconds()).slice(-2) + "\"></div>",
        pie: "<button class=\"bt peligro\" id=\"evDel\">" + ico("trash-2") + "Borrar</button><span class=\"empuja\"></span><button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"evOk\">Guardar</button>",
        alAbrir: function (d) {
          d.querySelector("#evOk").addEventListener("click", function () { var f = H.deLocal(d.querySelector("#evH").value); if (!f) return; registrarEvento(exp, tipo, f, true); d.close(); });
          d.querySelector("#evDel").addEventListener("click", function () { H.borrar("Eventos", [exp + "|evento|" + tipo]); if (tipo === "inicio_perfusion") { H.guardar("Experimentos", [{ ID: exp, Inicio_perfusion: "" }]); H.cancelarAvisos(exp, ["recalentamiento", "circadiano", "muestra"]); } d.close(); });
        } });
      return;
    }
    registrarEvento(exp, tipo, new Date().toISOString(), false);
  };
  function registrarEvento(exp, tipo, iso, correccion) {
    H.guardar("Eventos", [{ ID: exp + "|evento|" + tipo, Experimento: exp, Tipo: tipo, Fecha_hora: iso, Nota: correccion ? "Hora corregida" : "" }], { sinRepintar: true });
    var e = H.exp(exp), cambios = { ID: exp };
    if (tipo === "inicio_exanguinacion" && ["Planificado", "Aclimatación"].indexOf(e.Estado) !== -1) { cambios.Estado = "Cirugía"; if (!e.Fecha_cirugia) cambios.Fecha_cirugia = H.aFechaLocal(iso); }
    if (tipo === "inicio_perfusion") {
      cambios.Estado = "Perfusión"; cambios.Inicio_perfusion = iso; H.guardar("Experimentos", [cambios], { sinRepintar: true });
      var g = S.cfg.general, av = C.avisosRecalentamiento(exp, iso, S.cfg.recalentamiento).concat(C.avisosMuestreo(exp, iso, g.dias_perfusion, S.cfg.muestreo, g.aviso_muestra_min));
      if (!/no circadiano/i.test(e.Protocolo || "")) av = av.concat(C.avisosCircadianos(exp, iso, g.dias_perfusion, S.cfg.circadiano, g.aviso_antelacion_min));
      H.programarAvisos(exp, av, ["recalentamiento", "circadiano", "muestra"]);
      H.toast("Perfusión iniciada a las " + H.horaS(iso) + ". " + av.length + " avisos programados (recalentamiento, horario circadiano y muestras).");
      if (window.Notification && Notification.permission === "default" && H.pushSoportado()) setTimeout(function () { H.confirmar("Notificaciones", "¿Activar las notificaciones en este dispositivo para recibir los avisos aunque la pantalla esté bloqueada?", "Activar").then(function (ok) { if (ok) H.pushActivar().then(function () { H.toast("Notificaciones activadas."); }).catch(function (x) { H.toast(x.message, "error"); }); }); }, 600);
    } else {
      if (Object.keys(cambios).length > 1) H.guardar("Experimentos", [cambios], { sinRepintar: true });
      if (tipo === "fin_recalentamiento") H.cancelarAvisos(exp, ["recalentamiento"]);
      H.toast(H.nombreEvento(tipo) + ": " + H.horaS(iso) + (correccion ? " (corregido)" : ""));
    }
    H.repintar();
  }
  H.registrarEvento = registrarEvento;
  function recalentamiento(e, ev) {
    var cfg = S.cfg.recalentamiento, t0 = ev.inicio_perfusion, ps = t0 ? C.pasoRecalentamiento(t0, Date.now(), cfg) : null, puedo = H.puede("registrar"), cols = ["Temp", "P_VP", "FiO2_POR", "Barrido_POR", "P_AH", "FiO2_ART", "Barrido_ART"];
    var activo = ps && !ev.fin_recalentamiento && ps.minuto < ps.fin_min + 30;
    if (activo) { H.pantallaEncendida(true); H._pasoRecal = ps.indice; H.ticVista = function (ahora) { var p = C.pasoRecalentamiento(t0, ahora, cfg); if (p.indice !== H._pasoRecal) { H._pasoRecal = p.indice; H.repintarPronto(); } }; }
    var cab = "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Recalentamiento</h2>" + (cfg.verificado ? "" : "<span class=\"chip aj\">Pauta en borrador · verificar</span>") +
      "<label class=\"check\"><input type=\"checkbox\" data-cambio=\"prefSonido\"" + (H.pref("sinSonido") ? "" : " checked") + "> Sonido</label></div>";
    if (!t0) return cab + "<p class=\"tenue\">El cronómetro y los avisos de cambio de temperatura, presión y gases empiezan al pulsar «Inicio de la perfusión». Pauta: escalones de " + cfg.paso_min + " min desde " + cfg.pasos[0].Temp + " °C hasta " + cfg.pasos[cfg.pasos.length - 1].Temp + " °C.</p>" + tablaRecal(e, cfg, null, cols, puedo) + "</section>";
    var act = ps.actual, sigP = ps.siguiente, cambios = sigP ? C.cambiosRecal(act, sigP) : [];
    var panel = activo && !ps.terminado ? "<div class=\"paso-actual\" style=\"margin-bottom:12px\"><div class=\"crono activo\"><div class=\"et\">" + (sigP ? "Siguiente cambio en" : "Fin del recalentamiento en") + "</div><div class=\"cuenta-atras\" data-cuenta=\"" + new Date(C.aFecha(t0).getTime() + (sigP ? sigP.t : ps.fin_min) * 6e4).toISOString() + "\">--:--</div>" +
      "<div class=\"muy-tenue\">Paso " + (ps.indice + 1) + " de " + cfg.pasos.length + " · minuto " + H.n(ps.minuto, 0) + "</div></div><div>" +
      (sigP ? "<h4 style=\"margin-bottom:6px\">Al minuto " + sigP.t + " cambia:</h4><div class=\"fila-flex\">" + cambios.map(function (c) { return "<span class=\"chip aj\" style=\"font-size:14px;padding:5px 10px\">" + esc(c.nombre) + ": " + H.n(c.de, 1) + " → <b>" + H.n(c.a, 1) + "</b> " + esc(c.unidad) + "</span>"; }).join("") + "</div>" : "<p>Último escalón. Al terminar, pulsa «Fin del recalentamiento».</p>") +
      "<h4 style=\"margin:10px 0 6px\">Ahora</h4><div class=\"fila-flex\">" + cols.map(function (k) { return "<span class=\"chip pri\">" + esc(C.NOMBRES_RECAL[k]) + " " + H.n(act[k], 1) + " " + esc(C.UNIDAD_RECAL[k]) + "</span>"; }).join("") + "</div></div></div>"
      : ps.terminado || ev.fin_recalentamiento ? "<div class=\"aviso ok\">" + ico("circle-check") + "<div>Recalentamiento completado" + (ev.fin_recalentamiento ? " a las " + esc(H.hora(ev.fin_recalentamiento)) : "") + ". Continúa en <a href=\"#/exp/" + encodeURIComponent(e.ID) + "/seguimiento\">Seguimiento</a>.</div></div>" : "";
    return cab + panel + tablaRecal(e, cfg, ps, cols, puedo) + "</section>";
  }
  function tablaRecal(e, cfg, ps, cols, puedo) {
    var t0 = H.inicioPerf(e.ID);
    return "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Minuto</th><th>Hora</th>" + cols.map(function (k) { return "<th class=\"num\">" + esc(C.NOMBRES_RECAL[k]) + "<div class=\"muy-tenue\">" + esc(C.UNIDAD_RECAL[k]) + "</div></th>"; }).join("") + "<th>Valores reales (T · P portal · P arterial)</th></tr></thead><tbody>" +
      cfg.pasos.map(function (p, i) {
        var prev = i ? cfg.pasos[i - 1] : null, cl = ps ? (i === ps.indice && !ps.terminado ? "actual" : i < ps.indice ? "pasado" : "") : "", punto = "R" + p.t;
        var h = t0 ? new Date(C.aFecha(t0).getTime() + p.t * 6e4) : null;
        return "<tr class=\"" + cl + "\"><td>" + p.t + "–" + (p.t + cfg.paso_min) + "′</td><td>" + (h ? esc(H.hora(h)) : "") + "</td>" + cols.map(function (k) { return "<td class=\"num\">" + (prev && prev[k] !== p[k] ? "<span class=\"cambia\">" + H.n(p[k], 1) + "</span>" : H.n(p[k], 1)) + "</td>"; }).join("") +
          "<td><div class=\"fila-flex\" style=\"flex-wrap:nowrap\">" + ["Temp", "P_VP", "P_AH"].map(function (v) { var m = H.valor(e.ID, "RECAL", punto, v); return "<input style=\"width:70px;min-height:30px\" inputmode=\"decimal\" aria-label=\"" + esc(C.NOMBRES_RECAL[v] + " real minuto " + p.t) + "\" value=\"" + (m ? esc(String(m.Valor).replace(".", ",")) : "") + "\" data-cambio=\"celda\" data-exp=\"" + esc(e.ID) + "\" data-m=\"RECAL\" data-p=\"" + punto + "\" data-t=\"" + C.r(p.t / 60, 3) + "\" data-f=\"" + (h ? h.toISOString() : "") + "\" data-v=\"" + v + "\"" + (puedo && t0 ? "" : " disabled") + ">"; }).join("") + "</div></td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  H.acc.prefSonido = function (el) { H.pref("sinSonido", !el.checked); };

  // ============================================================================ SEGUIMIENTO
  var SUBS = [["gas", "Gasometría"], ["bq", "Bioquímica"], ["flujos", "Flujos y O₂"], ["bilis", "Bilis"], ["hdf", "HDF"], ["inmuno", "Inmunología"], ["pre", "Basales"], ["registro", "Registro"], ["plan", "Plan y avisos"]];
  H.tabsExp.seguimiento = function (e, p, q) {
    var s = p[0] || "gas", t0 = H.inicioPerf(e.ID), prox = H.proximoPunto(e.ID), rv = C.ritmosVigentes(S.cfg.circadiano, new Date()), todos = q.todos === "1";
    var tira = "<div class=\"cronos\" style=\"margin-bottom:12px\"><div class=\"crono " + (t0 ? "activo" : "") + "\"><div class=\"et\">Perfusión" + (t0 ? " · día " + (Math.floor(C.horasEntre(t0, new Date()) / 24) + 1) : "") + "</div><div class=\"t\"" + (t0 ? " data-crono=\"" + esc(t0) + "\"" : "") + ">--:--:--</div></div>" +
      (prox ? "<div class=\"crono\"><div class=\"et\">Próxima muestra · " + esc(prox.etiqueta) + " · " + esc(H.hora(prox.fecha)) + "</div><div class=\"t\" data-cuenta=\"" + prox.fecha.toISOString() + "\">--:--</div></div>" : "") +
      (t0 && !/no circadiano/i.test(e.Protocolo || "") ? "<div class=\"crono\"><div class=\"et\">Próximo cambio de ritmo · " + esc(rv.proxima_hora || "") + "</div><div style=\"font-size:13px\">" + rv.proximos.map(function (c) { return esc(c.linea) + " → <b>" + H.n(c.valor, 1) + " " + esc(c.unidad) + "</b>"; }).join("<br>") + "</div></div>" : "") + "</div>";
    if (!t0) tira = "<div class=\"aviso info\">" + ico("info") + "<div>La perfusión no ha empezado. Registra el «Inicio de la perfusión» en <a href=\"#/exp/" + encodeURIComponent(e.ID) + "/quirofano\">Quirófano</a> para fijar los tiempos reales; mientras tanto puedes registrar los basales.</div></div>";
    var pie = "<div class=\"fila-flex\" style=\"margin:8px 0 12px\"><label class=\"check\"><input type=\"checkbox\" data-cambio=\"verTodos\"" + (todos ? " checked" : "") + "> Mostrar todos los puntos del protocolo</label>" +
      (H.puede("registrar") ? "<button class=\"bt mini\" data-act=\"añadirPunto\" data-exp=\"" + esc(e.ID) + "\" data-m=\"__M__\">" + ico("plus", "s") + "Punto fuera de protocolo</button>" : "") + "<span class=\"muy-tenue\">Enter / ↓ pasa a la celda de abajo · los valores fuera de objetivo se marcan en rojo</span></div>";
    function hoja(m, opc) { return pie.replace("__M__", m) + H.hojaHTML(e.ID, m, Object.assign({ todos: todos }, opc || {})); }
    var cuerpo;
    if (s === "gas") cuerpo = asesorPanel(e) + ["ART", "POR", "CAV"].map(function (m) { return "<details class=\"plegable\"" + (m === "ART" ? " open" : "") + "><summary>" + esc(C.MUESTRAS[m].nombre) + "</summary><div class=\"dentro\">" + hoja(m) + "</div></details>"; }).join("");
    else if (s === "bq") cuerpo = hoja("PERF");
    else if (s === "flujos") cuerpo = hoja("FLUJO", { filasDerivadas: ["Q_total", "Q_100g", "R_AH", "R_VP", "VO2", "VO2_100g", "DO2", "EO2"].map(function (k) { return C.DERIVADAS.filter(function (d) { return d.id === k; })[0]; }), derivadas: function (p) { return derivadasFlujo(e, p.punto); } }) +
      "<p class=\"muy-tenue\" style=\"margin-top:8px\">VO₂ = [Q_AH·(CaO₂ − CvO₂) + Q_VP·(CpO₂ − CvO₂)] / 100, con CxO₂ = " + S.cfg.o2.k_hb + "·Hb·sO₂ + " + S.cfg.o2.k_disuelto + "·pO₂. Se calcula en los puntos con gasometría arterial, portal y de cava y flujos registrados (la pestaña Gasometría guarda los flujos en el mismo punto). Si falta la sO₂ se estima con la curva de Hill (P50 " + S.cfg.o2.p50 + " mmHg, n " + S.cfg.o2.hill_n + ").</p>";
    else if (s === "bilis") cuerpo = hoja("BILIS", { filasDerivadas: [C.variable("BILIS", "Densidad"), C.variable("BILIS", "Produccion_mLh"), C.DERIVADAS.filter(function (d) { return d.id === "Bilis_mLh_100g"; })[0]], derivadas: function (p) { return derivadasBilis(e, p); } });
    else if (s === "hdf") cuerpo = hdfConfig(e) + hoja("HDF");
    else if (s === "inmuno") cuerpo = hoja("INMUNO");
    else if (s === "pre") cuerpo = ["PRE", "BASAL_LD", "BASAL_BD"].map(function (m) { return "<details class=\"plegable\"" + (m === "PRE" ? " open" : "") + "><summary>" + esc(C.MUESTRAS[m].nombre) + "</summary><div class=\"dentro\">" + H.hojaHTML(e.ID, m, { extraCol: [{ punto: m === "PRE" ? "Pre" : "Basal", t_h: null, fecha: null, conDatos: true }] }) + "</div></details>"; }).join("");
    else if (s === "registro") cuerpo = registro(e);
    else cuerpo = plan(e);
    return tira + sub(e, "seguimiento", SUBS, s) + cuerpo;
  };
  H.acc.verTodos = function (el) { var r = H.ruta(); H.ir(r.partes.join("/") + (el.checked ? "?todos=1" : "")); };
  function gasEn(exp, punto) { var o = {}; ["ART", "POR", "CAV"].forEach(function (m) { var g = {}; ["pO2", "sO2", "Hb", "pH", "pCO2"].forEach(function (v) { var x = H.valor(exp, m, punto, v); g[v] = x ? C.num(x.Valor) : null; }); o[m] = g.pO2 !== null ? g : null; }); return o; }
  function flujoEn(exp, punto) { var o = {}; C.MUESTRAS.FLUJO.vars.forEach(function (v) { var x = H.valor(exp, "FLUJO", punto, v.id); o[v.id] = x ? C.num(x.Valor) : null; }); return o; }
  function derivadasFlujo(e, punto) {
    var f = flujoEn(e.ID, punto), hm = C.hemodinamica(f, H.pesoHigado(e.ID)), o = { Q_total: hm.Q_total, Q_100g: hm.Q_100g, R_AH: hm.R_AH, R_VP: hm.R_VP };
    var g = gasEn(e.ID, punto); if (g.ART && g.POR && g.CAV) { var v = C.consumoO2(g, f, H.pesoHigado(e.ID), S.cfg.o2); if (v) { o.VO2 = v.VO2; o.VO2_100g = v.VO2_100g; o.DO2 = v.DO2; o.EO2 = v.EO2; } }
    return o;
  }
  H.derivadasFlujo = derivadasFlujo;
  function derivadasBilis(e, p) {
    var pe = H.valor(e.ID, "BILIS", p.punto, "Peso_g"), vo = H.valor(e.ID, "BILIS", p.punto, "Volumen_mL"), o = {};
    if (pe && vo && C.num(vo.Valor)) o.Densidad = C.num(pe.Valor) / C.num(vo.Valor);
    if (vo) { var ant = H.med(e.ID).filter(function (m) { return m.Muestra === "BILIS" && m.Variable === "Volumen_mL" && m.Fecha_hora && C.aFecha(m.Fecha_hora) < C.aFecha(vo.Fecha_hora); }).sort(function (a, b) { return String(b.Fecha_hora).localeCompare(String(a.Fecha_hora)); })[0];
      var desde = ant ? ant.Fecha_hora : H.inicioPerf(e.ID), pb = C.produccionBilis(vo.Valor, desde, vo.Fecha_hora, H.pesoHigado(e.ID)); if (pb) { o.Produccion_mLh = pb.mL_h; o.Bilis_mLh_100g = pb.mL_h_100g; } }
    return o;
  }
  H.derivadasBilis = derivadasBilis;

  // ---- asesor de gasometría (entrada rápida de las tres ramas + mezcladores + flujos)
  var BORR = { exp: null, punto: null, g: { ART: {}, POR: {}, CAV: {} }, f: {} };
  function asesorPanel(e) {
    var puedo = H.puede("registrar"), t0 = H.inicioPerf(e.ID), ahoraH = t0 ? C.horasEntre(t0, new Date()) : null;
    var plan = H.puntosPlan(e.ID, "ART"), cercano = ahoraH === null ? plan[0] : plan.filter(function (p) { return Math.abs(p.t_h - ahoraH) <= 0.75; })[0];
    if (BORR.exp !== e.ID) { BORR.exp = e.ID; BORR.punto = cercano ? cercano.punto : (H.puntoAhora(e.ID) || {}).punto || "0"; BORR.g = { ART: {}, POR: {}, CAV: {} }; BORR.f = {}; BORR.fecha = H.aLocal(new Date()); BORR.cargado = null; }
    if (BORR.cargado !== BORR.punto) {   // precarga lo ya registrado en ese punto y los ajustes vigentes
      BORR.cargado = BORR.punto; ["ART", "POR", "CAV"].forEach(function (m) { BORR.g[m] = {}; C.MUESTRAS[m].vars.forEach(function (v) { var x = H.valor(e.ID, m, BORR.punto, v.id); if (x) BORR.g[m][v.id] = C.num(x.Valor); }); });
      BORR.f = {}; ["FiO2_ART", "Barrido_ART", "FiO2_POR", "Barrido_POR", "Q_AH", "Q_VP", "P_AH", "P_VP", "Temp"].forEach(function (k) { var x = H.valor(e.ID, "FLUJO", BORR.punto, k) || H.ultimo(e.ID, "FLUJO", k); if (x) BORR.f[k] = C.num(x.Valor); });
      var x0 = H.valor(e.ID, "ART", BORR.punto, "pH"); if (x0 && x0.Fecha_hora) BORR.fecha = H.aLocal(x0.Fecha_hora);
    }
    var opts = plan.map(function (p) { return p.punto; }); H.columnas(e.ID, "ART", true).forEach(function (c) { if (opts.indexOf(c.punto) === -1) opts.push(c.punto); }); var pa = H.puntoAhora(e.ID); if (pa && opts.indexOf(pa.punto) === -1) opts.push(pa.punto); if (opts.indexOf(BORR.punto) === -1) opts.push(BORR.punto);
    var vars = C.MUESTRAS.ART.vars;
    var tabla = "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Variable</th><th class=\"num\">Arterial</th><th class=\"num\">Portal</th><th class=\"num\">Cava</th></tr></thead><tbody>" + vars.map(function (v) {
      return "<tr><td>" + esc(v.nombre) + " <span class=\"muy-tenue\">" + esc(H.unidadVisible(v.id, v.unidad)) + "</span></td>" + ["ART", "POR", "CAV"].map(function (m) { var val = BORR.g[m][v.id]; return "<td class=\"num\"><input style=\"width:86px\" inputmode=\"decimal\" autocomplete=\"off\" aria-label=\"" + esc(v.nombre + " " + C.MUESTRAS[m].corto) + "\" class=\"" + (val !== undefined && val !== null ? H.claseValor(m, v.id, val) : "") + "\" value=\"" + (val === undefined || val === null ? "" : esc(String(H.aVista(v.id, val)).replace(".", ","))) + "\" data-entrada=\"borrGas\" data-m=\"" + m + "\" data-v=\"" + v.id + "\"" + (puedo ? "" : " disabled") + "></td>"; }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>";
    var ajustes = [["FiO2_ART", "FiO₂ arterial", "%"], ["Barrido_ART", "Aire arterial", "mL/min"], ["FiO2_POR", "FiO₂ portal", "%"], ["Barrido_POR", "Aire portal", "mL/min"], ["Q_AH", "Flujo AH", "mL/min"], ["Q_VP", "Flujo VP", "mL/min"], ["P_AH", "Presión AH", "mmHg"], ["P_VP", "Presión VP", "mmHg"], ["Temp", "Temperatura", "°C"]];
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Nueva gasometría y asesor de mezcladores</h2><div class=\"segmentado\" aria-label=\"Unidad de gases\"><button class=\"" + (H.pref("kpa") ? "" : "activo") + "\" data-act=\"unidadGas\" data-v=\"mmHg\">mmHg</button><button class=\"" + (H.pref("kpa") ? "activo" : "") + "\" data-act=\"unidadGas\" data-v=\"kPa\">kPa</button></div></div>" +
      "<div class=\"rejilla\"><div class=\"campo\"><label class=\"et\" for=\"gPunto\">Punto</label><select id=\"gPunto\" data-cambio=\"gasPunto\">" + opts.map(function (o) { return "<option" + (o === BORR.punto ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"gFecha\">Hora de la muestra</label><input id=\"gFecha\" type=\"datetime-local\" value=\"" + esc(BORR.fecha) + "\" data-entrada=\"gasFecha\"></div></div>" +
      "<div class=\"columnas\"><div>" + tabla + "</div><div><h4 style=\"margin-bottom:6px\">Mezcladores y flujos en el momento de la muestra</h4><div class=\"rejilla estrecha\">" + ajustes.map(function (a) { var v = BORR.f[a[0]]; return "<div class=\"campo\"><label class=\"et\" for=\"aj_" + a[0] + "\">" + a[1] + " <span class=\"muy-tenue\">" + a[2] + "</span></label><input id=\"aj_" + a[0] + "\" inputmode=\"decimal\" autocomplete=\"off\" value=\"" + (v === undefined || v === null ? "" : esc(String(v).replace(".", ","))) + "\" data-entrada=\"borrAj\" data-k=\"" + a[0] + "\"" + (puedo ? "" : " disabled") + "></div>"; }).join("") + "</div>" +
      "<div id=\"recsGas\" aria-live=\"polite\">" + recsHTML(e) + "</div></div></div>" +
      (puedo ? "<div class=\"fila-flex\" style=\"margin-top:12px\"><button class=\"bt pri grande\" data-act=\"guardarGas\" data-exp=\"" + esc(e.ID) + "\">" + ico("save") + "Guardar gasometría y flujos</button><span class=\"muy-tenue\">Guarda las tres ramas, los mezcladores y los flujos en el punto «" + esc(BORR.punto) + "».</span></div>" : "") + "</section>";
  }
  function recsHTML(e) {
    var V = H.Vperf(e.ID), out = ["ART", "POR"].map(function (r) {
      var g = BORR.g[r]; if (g.pH === undefined && g.pO2 === undefined && g.pCO2 === undefined) return "";
      var a = C.asesorGas(r, g, { FiO2: BORR.f["FiO2_" + r], Barrido: BORR.f["Barrido_" + r] }, S.cfg.objetivos, S.cfg.gases, { V_mL: V });
      return "<h4 style=\"margin:12px 0 6px\">" + (r === "ART" ? "Rama arterial (gasometría arterial)" : "Rama portal (gasometría venosa)") + "</h4><div class=\"recs\">" + a.recomendaciones.map(function (x) {
        return "<div class=\"rec " + x.nivel + "\">" + ico(x.nivel === "ok" ? "circle-check" : x.nivel === "alerta" ? "triangle-alert" : x.nivel === "ajuste" ? "sliders-horizontal" : "info", "s") + "<div>" + esc(x.texto) + "</div>" +
          (x.accion && x.accion.campo && BORR.f.hasOwnProperty(x.accion.campo.replace(/_(ART|POR)$/, "_$1")) !== undefined && /^(FiO2|Barrido)_/.test(x.accion.campo) && H.puede("registrar") ? "<button class=\"bt mini accion\" data-act=\"aplicarRec\" data-k=\"" + x.accion.campo + "\" data-a=\"" + x.accion.a + "\">Aplicar " + H.n(x.accion.a, 0) + "</button>" : "") + "</div>";
      }).join("") + "</div>";
    }).join("");
    var g = { ART: Object.keys(BORR.g.ART).length ? BORR.g.ART : null, POR: Object.keys(BORR.g.POR).length ? BORR.g.POR : null, CAV: Object.keys(BORR.g.CAV).length ? BORR.g.CAV : null };
    var vo = g.ART && g.POR && g.CAV ? C.consumoO2(g, BORR.f, H.pesoHigado(e.ID), S.cfg.o2) : null;
    if (vo) out += "<h4 style=\"margin:12px 0 6px\">Oxígeno</h4><div class=\"kpis\"><div class=\"kpi\"><div class=\"et\">VO₂</div><div class=\"v\">" + H.n(vo.VO2, 2) + "<small>mL/min</small></div></div><div class=\"kpi\"><div class=\"et\">VO₂ / 100 g</div><div class=\"v\">" + (vo.VO2_100g !== null ? H.n(vo.VO2_100g, 3) : "—") + "<small>mL/min</small></div></div><div class=\"kpi\"><div class=\"et\">DO₂</div><div class=\"v\">" + H.n(vo.DO2, 1) + "<small>mL/min</small></div></div><div class=\"kpi\"><div class=\"et\">Extracción</div><div class=\"v\">" + H.n(vo.EO2, 1) + "<small>%</small></div></div></div>" + (vo.sO2_estimada ? "<p class=\"muy-tenue\">sO₂ estimada con la curva de Hill en alguna rama.</p>" : "");
    return out || "<p class=\"tenue\" style=\"margin-top:12px\">Introduce pH, pO₂ y pCO₂ de cada rama para ver las recomendaciones.</p>";
  }
  function refrescarRecs() { var e = H.exp(BORR.exp), c = H.$("#recsGas"); if (e && c) c.innerHTML = recsHTML(e); }
  H.acc.borrGas = function (el) { var m = el.getAttribute("data-m"), v = el.getAttribute("data-v"), raw = el.value.trim().replace(",", "."); if (raw === "") delete BORR.g[m][v]; else { var n = C.num(H.deVista(v, raw)); if (n !== null) BORR.g[m][v] = n; } el.className = BORR.g[m][v] !== undefined ? H.claseValor(m, v, BORR.g[m][v]) : ""; H.retrasar("recs", 250, refrescarRecs); };
  H.acc.borrAj = function (el) { var k = el.getAttribute("data-k"), n = C.num(el.value); if (n === null) delete BORR.f[k]; else BORR.f[k] = n; H.retrasar("recs", 250, refrescarRecs); };
  H.acc.gasFecha = function (el) { BORR.fecha = el.value; };
  H.acc.gasPunto = function (el) { BORR.punto = el.value; H.repintar(); };
  H.acc.unidadGas = function (el) { H.pref("kpa", el.getAttribute("data-v") === "kPa"); H.repintar(); };
  H.acc.aplicarRec = function (el) {
    var k = el.getAttribute("data-k"), a = Number(el.getAttribute("data-a")), de = BORR.f[k]; BORR.f[k] = a; var i = H.$("#aj_" + k); if (i) i.value = String(a).replace(".", ",");
    BORR.ajustes = BORR.ajustes || []; BORR.ajustes.push({ k: k, de: de, a: a }); refrescarRecs(); H.toast("Ajuste anotado: se registrará al guardar (" + k.replace("_", " ") + " " + de + " → " + a + ").");
  };
  H.acc.guardarGas = function (el) {
    var exp = el.getAttribute("data-exp"), f = H.deLocal(BORR.fecha) || new Date().toISOString(), t0 = H.inicioPerf(exp), plan = H.puntosPlan(exp, "ART").filter(function (p) { return p.punto === BORR.punto; })[0];
    var tn = plan ? plan.t_h : (t0 ? C.r(C.horasEntre(t0, f), 2) : null), n = 0;
    ["ART", "POR", "CAV"].forEach(function (m) { if (Object.keys(BORR.g[m]).length) { H.guardarMediciones(exp, m, BORR.punto, tn, f, BORR.g[m]); n++; } });
    if (Object.keys(BORR.f).length) H.guardarMediciones(exp, "FLUJO", BORR.punto, tn, f, BORR.f);
    (BORR.ajustes || []).forEach(function (a) { H.guardar("Eventos", [{ ID: H.uid(), Experimento: exp, Tipo: "ajuste", Fecha_hora: new Date().toISOString(), Valor_JSON: JSON.stringify(a), Nota: a.k.replace("_ART", " arterial").replace("_POR", " portal").replace("Barrido", "Flujo de aire") + ": " + a.de + " → " + a.a + " (recomendación del asesor, punto " + BORR.punto + ")" }], { sinRepintar: true }); });
    BORR.ajustes = []; BORR.cargado = null; H.toast("Gasometría guardada en el punto «" + BORR.punto + "» (" + n + " rama" + (n === 1 ? "" : "s") + ")."); H.repintar();
    var alertas = ["ART", "POR"].map(function (r) { return C.asesorGas(r, BORR.g[r], {}, S.cfg.objetivos, S.cfg.gases, { V_mL: H.Vperf(exp) }); }).filter(function (a) { return a.estado === "alerta"; });
    if (alertas.length && H.puede("registrar")) H.servidor("webNotificar", [S.token, { titulo: "Alerta gasometría " + exp, texto: alertas.map(function (a) { return a.recomendaciones.filter(function (x) { return x.nivel === "alerta"; }).map(function (x) { return x.texto; }).join(" "); }).join(" · "), destino: "equipo", vista: "exp:" + exp + ":seguimiento" }]).catch(function () { });
  };
  function hdfConfig(e) {
    var d = H.usarForm(e.ID, "hdf", "");
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>Información general de la hemodiafiltración</h3>" + ind() + "</div><div class=\"rejilla\">" + campo("Q_sangre", "Flujo de sangre", d.Q_sangre, { tipo: "number", u: "mL/min" }) + campo("Q_dialisis", "Flujo de diálisis", d.Q_dialisis, { tipo: "number", u: "mL/h" }) +
      campo("Extraccion", "Extracción", d.Extraccion, { tipo: "number", u: "mL/h" }) + campo("Reposicion", "Volumen de reemplazo", d.Reposicion, { tipo: "number", u: "mL/h" }) + campo("liquido", "Líquido de diálisis/reposición", d.liquido, { ph: "Composición, bicarbonato…" }) + campo("inicio", "Conexión", d.inicio, { tipo: "datetime-local" }) + "</div></section>";
  }
  function registro(e) {
    var evs = H.filas("Eventos").filter(function (x) { return x.Experimento === e.ID; }).sort(function (a, b) { return String(b.Fecha_hora).localeCompare(String(a.Fecha_hora)); }), puedo = H.puede("registrar"), t0 = H.inicioPerf(e.ID);
    return (puedo ? "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>Nuevo evento</h3></div><div class=\"rejilla\" id=\"nuevoEv\"><div class=\"campo\"><label class=\"et\" for=\"nvT\">Tipo</label><select id=\"nvT\">" + ["incidencia", "ajuste", "administracion", "muestra", "biopsia", "inicio_hdf"].map(function (t) { return "<option value=\"" + t + "\">" + esc(H.nombreEvento(t)) + "</option>"; }).join("") + "</select></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"nvF\">Fecha y hora</label><input id=\"nvF\" type=\"datetime-local\" value=\"" + H.aLocal(new Date()) + "\"></div><div class=\"campo\" style=\"grid-column:span 2\"><label class=\"et\" for=\"nvN\">Descripción</label><input id=\"nvN\" autocomplete=\"off\" placeholder=\"Qué ha pasado, qué se ha hecho…\"></div></div><button class=\"bt pri\" data-act=\"guardarEv\" data-exp=\"" + esc(e.ID) + "\">" + ico("save") + "Guardar evento</button></section>" : "") +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>Eventos, ajustes e incidencias</h3></div>" + (evs.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fecha y hora</th><th class=\"num\">T</th><th>Tipo</th><th>Descripción</th><th>Por</th>" + (puedo ? "<th></th>" : "") + "</tr></thead><tbody>" +
        evs.map(function (x) { var h = t0 ? C.horasEntre(t0, x.Fecha_hora) : null; return "<tr><td>" + esc(H.fechaHora(x.Fecha_hora)) + "</td><td class=\"num\">" + (h !== null && h >= 0 ? H.n(h, 1) + " h" : "") + "</td><td>" + esc(H.nombreEvento(x.Tipo)) + "</td><td class=\"envolver\">" + esc(x.Nota || "") + "</td><td class=\"muy-tenue\">" + esc(x.Creado_por || "") + "</td>" + (puedo ? "<td><button class=\"bt ico-solo texto\" data-act=\"borrarFila\" data-tabla=\"Eventos\" data-id=\"" + esc(x.ID) + "\" aria-label=\"Borrar evento\">" + ico("trash-2", "s") + "</button></td>" : "") + "</tr>"; }).join("") + "</tbody></table></div>" : "<p class=\"tenue\">Sin eventos.</p>") + "</section>";
  }
  H.acc.guardarEv = function (el) { var exp = el.getAttribute("data-exp"), n = H.$("#nvN").value.trim(), t = H.$("#nvT").value; if (!n && t === "incidencia") { H.toast("Describe la incidencia.", "error"); return; } H.guardar("Eventos", [{ ID: H.uid(), Experimento: exp, Tipo: t, Fecha_hora: H.deLocal(H.$("#nvF").value) || new Date().toISOString(), Nota: n }]); H.toast("Evento guardado."); };
  function plan(e) {
    var av = H.filas("Avisos").filter(function (a) { return a.Experimento === e.ID; }).sort(function (a, b) { return String(a.Fecha_hora).localeCompare(String(b.Fecha_hora)); }), ahora = Date.now(), puedo = H.puede("registrar"), t0 = H.inicioPerf(e.ID);
    var prox = av.filter(function (a) { return a.Estado === "Pendiente" && C.aFecha(a.Fecha_hora).getTime() > ahora; });
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>Avisos programados</h3><span class=\"chip\">" + prox.length + " pendientes</span>" + (puedo && t0 ? "<button class=\"bt\" data-act=\"reprogramar\" data-exp=\"" + esc(e.ID) + "\">" + ico("refresh-cw") + "Regenerar desde la configuración</button><button class=\"bt peligro\" data-act=\"cancelarAv\" data-exp=\"" + esc(e.ID) + "\">Cancelar pendientes</button>" : "") + "</div>" +
      "<p class=\"muy-tenue\">Llegan como notificación push a los usuarios ADMIN y REGISTRO con las notificaciones activadas, y como alarma sonora en cualquier pantalla abierta de la app. Se generan al registrar el inicio de la perfusión a partir del recalentamiento, el horario circadiano y el muestreo de Configuración.</p>" +
      (av.length ? "<div class=\"tabla-env\" style=\"max-height:60vh\"><table class=\"t\"><thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Aviso</th><th>Estado</th></tr></thead><tbody>" + av.slice(0, 400).map(function (a) { var pas = C.aFecha(a.Fecha_hora).getTime() <= ahora; return "<tr class=\"" + (pas ? "pasado" : "") + "\"><td>" + esc(H.diaCorto(a.Fecha_hora) + " " + H.hora(a.Fecha_hora)) + "</td><td>" + esc(a.Tipo) + "</td><td class=\"envolver\"><b>" + esc(a.Titulo) + "</b><div class=\"muy-tenue\">" + esc(a.Texto) + "</div></td><td><span class=\"chip " + (a.Estado === "Enviado" ? "ok" : a.Estado === "Cancelado" || a.Estado === "Caducado" ? "" : "info") + "\">" + esc(a.Estado) + "</span></td></tr>"; }).join("") + "</tbody></table></div>" : "<p class=\"tenue\">No hay avisos programados.</p>") + "</section>";
  }
  H.acc.reprogramar = function (el) {
    var exp = el.getAttribute("data-exp"), t0 = H.inicioPerf(exp), g = S.cfg.general, e = H.exp(exp), ev = H.eventos(exp);
    var av = C.avisosMuestreo(exp, t0, g.dias_perfusion, S.cfg.muestreo, g.aviso_muestra_min); if (!/no circadiano/i.test(e.Protocolo || "")) av = av.concat(C.avisosCircadianos(exp, t0, g.dias_perfusion, S.cfg.circadiano, g.aviso_antelacion_min));
    var tipos = ["circadiano", "muestra"]; if (!ev.fin_recalentamiento) { av = av.concat(C.avisosRecalentamiento(exp, t0, S.cfg.recalentamiento)); tipos.push("recalentamiento"); }
    av = av.filter(function (a) { return C.aFecha(a.Fecha_hora).getTime() > Date.now(); }); H.programarAvisos(exp, av, tipos); H.toast(av.length + " avisos futuros regenerados."); H.repintar();
  };
  H.acc.cancelarAv = function (el) { var exp = el.getAttribute("data-exp"); H.confirmar("Cancelar avisos", "Se cancelarán todos los avisos pendientes de " + exp + ".", "Cancelar avisos", true).then(function (ok) { if (ok) { H.cancelarAvisos(exp, []); H.repintar(); } }); };

  // ============================================================================ CIERRE
  H.tabsExp.cierre = function (e) {
    var ev = H.eventos(e.ID), d = H.usarForm(e.ID, "cierre", ""), t = C.tiempos(ev), puedo = H.puede("registrar"), pf = C.num(e.Peso_higado_final_g), pi = C.num(e.Peso_higado_inicial_g);
    var bil = H.med(e.ID).filter(function (m) { return m.Muestra === "BILIS" && m.Variable === "Volumen_mL"; }).reduce(function (s, m) { return s + (C.num(m.Valor) || 0); }, 0);
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Fin de la perfusión</h2>" + ind() + "</div><div class=\"rejilla\">" +
      "<div class=\"campo\"><label class=\"et\" for=\"cFin\">Fecha y hora de fin</label><input id=\"cFin\" type=\"datetime-local\" value=\"" + H.aLocal(ev.fin_perfusion || e.Fin_perfusion || "") + "\"" + (puedo ? "" : " disabled") + "></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"cPeso\">Peso final del hígado</label><div class=\"unidad-in\"><input id=\"cPeso\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" value=\"" + esc(e.Peso_higado_final_g || "") + "\"" + (puedo ? "" : " disabled") + "><span>g</span></div></div>" +
      campo("motivo", "Motivo de finalización", d.motivo, { tipo: "select", opciones: ["Protocolo completado", "Fallo técnico del dispositivo", "Deterioro del injerto", "Trombosis / problema vascular", "Contaminación / infección", "Decisión del equipo", "Otro"] }) +
      campo("destino", "Destino del injerto", d.destino, { tipo: "select", opciones: ["Necropsia y muestras", "Trasplante (fase 3)", "Desechado"] }) + campo("obs", "Observaciones finales", d.obs, { tipo: "textarea", ancho: true }) + "</div>" +
      (puedo ? "<button class=\"bt pri\" data-act=\"cerrarExp\" data-exp=\"" + esc(e.ID) + "\">" + ico("circle-check") + (e.Estado === "Finalizado" ? "Actualizar cierre" : "Finalizar perfusión") + "</button>" : "") + "</section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Resumen</h2></div><div class=\"kpis\"><div class=\"kpi\"><div class=\"et\">Duración total</div><div class=\"v\">" + (t.duracion_perfusion_h !== null ? H.n(t.duracion_perfusion_h, 1) + "<small>h</small>" : "—") + "</div></div>" +
      "<div class=\"kpi\"><div class=\"et\">Peso inicial → final</div><div class=\"v\">" + (pi ? H.n(pi, 0) : "—") + " → " + (pf ? H.n(pf, 0) : "—") + "<small>g</small></div></div><div class=\"kpi\"><div class=\"et\">Cambio de peso</div><div class=\"v\">" + (pi && pf ? (pf >= pi ? "+" : "") + H.n((pf - pi) / pi * 100, 1) + "<small>%</small>" : "—") + "</div></div>" +
      "<div class=\"kpi\"><div class=\"et\">Bilis total registrada</div><div class=\"v\">" + H.n(bil, 1) + "<small>mL</small></div></div></div></section>";
  };
  H.acc.cerrarExp = function (el) {
    var exp = el.getAttribute("data-exp"), f = H.deLocal(H.$("#cFin").value), pf = C.num(H.$("#cPeso").value);
    if (!f) { H.toast("Indica la fecha y hora de fin.", "error"); H.$("#cFin").focus(); return; }
    H.confirmar("Finalizar perfusión", "El experimento pasará a «Finalizado» y se cancelarán los avisos pendientes.", "Finalizar").then(function (ok) {
      if (!ok) return; H.guardar("Eventos", [{ ID: exp + "|evento|fin_perfusion", Experimento: exp, Tipo: "fin_perfusion", Fecha_hora: f }], { sinRepintar: true });
      H.guardar("Experimentos", [{ ID: exp, Estado: "Finalizado", Fin_perfusion: f, Peso_higado_final_g: pf }], { sinRepintar: true }); H.cancelarAvisos(exp, []); H.toast(exp + " finalizado."); H.repintar();
    });
  };
})();
