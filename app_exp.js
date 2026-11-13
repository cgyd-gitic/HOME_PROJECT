/* HOME · ficha de experimento: resumen, dieta, cirugía, preparación (material + cálculos), quirófano y recalentamiento, cierre. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  var PEST = [["resumen", "Resumen", "layers"], ["dieta", "Dieta", "utensils"], ["cirugia", "Cirugía", "scissors"], ["preparacion", "Preparación", "clipboard-check"],
    ["quirofano", "Quirófano y recalentamiento", "timer"], ["seguimiento", "Seguimiento", "activity"], ["cierre", "Cierre", "circle-check"]];
  H.tabsExp = {};

  H.vistas.exp = function (p, q) {
    var id = p[0], tab = p[1] || "resumen", e = H.exp(id);
    if (!e) return "<div class=\"vacio\">No existe el experimento «" + esc(id) + "». <a href=\"#/experimentos\">Volver al listado</a></div>";
    var cargando = !S.medCargada[id] && S.token && S.online;
    if (cargando) H.asegurarMed([id]).then(function (x) { if (x) H.repintar(); }).catch(function () { });
    H.ticVista = null; H.pantallaEncendida(false);
    var cuerpo = (H.tabsExp[tab] || H.tabsExp.resumen)(e, p.slice(2), q);
    var puedo = H.puede("registrar"), estados = ["Planificado", "Aclimatación", "Cirugía", "Perfusión", "Finalizado", "Cancelado"];
    return "<div class=\"ancho\"><div class=\"miga\"><a href=\"#/experimentos\">Experimentos</a> / " + esc(id) + "</div>" +
      "<div class=\"titulo-pag\"><h1><span class=\"punto-color\" style=\"background:" + esc(H.colorExp(id)) + ";width:16px;height:16px\"></span> " + esc(id) + " <span class=\"tenue\" style=\"font-size:14px;font-weight:400\">" + esc(e.Codigo_PM || "") + " · " + esc(e.Fase || "") + " · " + esc(e.Protocolo || "") + "</span></h1>" +
      (puedo ? "<label class=\"sr\" for=\"selEstado\">Estado</label><select id=\"selEstado\" style=\"width:auto\" data-cambio=\"estadoExp\" data-id=\"" + esc(id) + "\">" + estados.map(function (s) { return "<option" + (s === e.Estado ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" : H.estadoChip(e.Estado)) +
      (cargando ? "<span class=\"chip\">Cargando mediciones…</span>" : "") + "</div>" +
      "<nav class=\"pestanas\" aria-label=\"Secciones del experimento\">" + PEST.map(function (t) { return "<a href=\"#/exp/" + encodeURIComponent(id) + "/" + t[0] + "\" class=\"" + (t[0] === tab ? "activo" : "") + "\"" + (t[0] === tab ? " aria-current=\"page\"" : "") + ">" + ico(t[2], "s") + t[1] + "</a>"; }).join("") + "</nav>" + cuerpo + "</div>";
  };
  H.acc.estadoExp = function (el) { var e = H.exp(el.getAttribute("data-id")); H.guardar("Experimentos", [{ ID: e.ID, Estado: el.value }]); H.toast("Estado: " + el.value); };

  // utilidades de formulario --------------------------------------------------------------------
  function campo(k, et, val, o) {
    o = o || {}; var id = "f_" + k.replace(/[^\w]/g, "_"), dis = H.puede("registrar") ? "" : " disabled", dc = " data-k=\"" + esc(k) + "\" data-cambio=\"" + (o.acc || "campoForm") + "\"";
    var inp;
    if (o.tipo === "select") inp = "<select id=\"" + id + "\"" + dc + dis + ">" + ["<option value=\"\">—</option>"].concat(o.opciones.map(function (x) { var v = Array.isArray(x) ? x[0] : x, n = Array.isArray(x) ? x[1] : x; return "<option value=\"" + esc(v) + "\"" + (String(val) === String(v) ? " selected" : "") + ">" + esc(n) + "</option>"; })).join("") + "</select>";
    else if (o.tipo === "textarea") inp = "<textarea id=\"" + id + "\"" + dc + dis + ">" + esc(val || "") + "</textarea>";
    else { var t = o.tipo || "text", v = val === null || val === undefined ? "" : val; if (t === "datetime-local") v = H.aLocal(v); if (t === "number" && typeof v === "number") v = String(v).replace(".", ","); inp = "<input id=\"" + id + "\" type=\"" + (t === "number" ? "text" : t) + "\"" + (t === "number" ? " inputmode=\"decimal\" data-num=\"1\"" : "") + " autocomplete=\"off\" value=\"" + esc(v) + "\"" + dc + dis + (o.ph ? " placeholder=\"" + esc(o.ph) + "\"" : "") + ">"; }
    if (o.u) inp = "<div class=\"unidad-in\">" + inp + "<span>" + esc(o.u) + "</span></div>";
    return "<div class=\"campo\"" + (o.ancho ? " style=\"grid-column:1/-1\"" : "") + "><label class=\"et\" for=\"" + id + "\">" + esc(et) + "</label>" + inp + (o.ayuda ? "<div class=\"ayuda\">" + o.ayuda + "</div>" : "") + "</div>";
  }
  H.campo = campo;
  function valorCampo(el) { var v = el.value; if (el.hasAttribute("data-num")) return C.num(v); if (el.type === "datetime-local") return H.deLocal(v); if (el.type === "checkbox") return el.checked; return v; }
  H.valorCampo = valorCampo;
  // formulario activo (cirugía, cálculos, hdf…): se guarda el objeto completo con retraso
  var FA = { exp: null, tipo: null, animal: null, datos: null };
  function usarForm(exp, tipo, animal) { if (FA.exp !== exp || FA.tipo !== tipo || FA.animal !== animal || !FA.datos) { FA.exp = exp; FA.tipo = tipo; FA.animal = animal; FA.datos = H.form(exp, tipo, animal); FA.alCambiar = null; FA.alGuardar = null; } return FA.datos; }
  H.formActivo = function (alCambiar) { FA.alCambiar = alCambiar; };
  H.recargarForm = function () { FA.datos = null; };
  H.usarForm = usarForm;
  function ponerRuta(o, k, v) { var p = k.split("."), x = o; for (var i = 0; i < p.length - 1; i++) { if (typeof x[p[i]] !== "object" || x[p[i]] === null) x[p[i]] = {}; x = x[p[i]]; } x[p[p.length - 1]] = v; }
  function leerRuta(o, k) { return k.split(".").reduce(function (x, p) { return x && x[p] !== undefined ? x[p] : null; }, o); }
  H.leerRuta = leerRuta;
  H.acc.campoForm = function (el) {
    ponerRuta(FA.datos, el.getAttribute("data-k"), valorCampo(el)); var ind = H.$("#indGuardado"); if (ind) { ind.className = "guardado sucio"; ind.textContent = "Guardando…"; }
    H.retrasar("form", 700, function () { H.guardarForm(FA.exp, FA.tipo, FA.animal, FA.datos).then(function () { }); if (ind) { ind.className = "guardado"; ind.innerHTML = ico("check", "s") + "Guardado " + H.hora(new Date()); } if (FA.alGuardar) FA.alGuardar(el); });
    if (FA.alCambiar) FA.alCambiar(el);
  };
  function indicador() { return "<span id=\"indGuardado\" class=\"guardado\">" + ico("check", "s") + "Guardado automático</span>"; }

  // ============================================================================ RESUMEN
  H.tabsExp.resumen = function (e) {
    var an = H.animales(e.ID), ev = H.eventos(e.ID), t = C.tiempos(ev), avs = H.filas("Avisos").filter(function (a) { return a.Experimento === e.ID; });
    var pend = avs.filter(function (a) { return a.Estado === "Pendiente" && C.aFecha(a.Fecha_hora) > new Date(); }).length, nMed = H.med(e.ID).length;
    function kpi(et, v, u) { return "<div class=\"kpi\"><div class=\"et\">" + et + "</div><div class=\"v\">" + (v === null || v === "" || v === undefined ? "—" : v) + (u && v !== null && v !== "" ? "<small>" + u + "</small>" : "") + "</div></div>"; }
    var evs = H.filas("Eventos").filter(function (x) { return x.Experimento === e.ID; }).sort(function (a, b) { return String(a.Fecha_hora).localeCompare(String(b.Fecha_hora)); });
    return "<div class=\"kpis\" style=\"margin-bottom:14px\">" + kpi("Isquemia caliente", t.isquemia_caliente_min !== null ? C.duracionTxt(t.isquemia_caliente_min) : null) + kpi("Isquemia fría", t.isquemia_fria_min !== null ? C.duracionTxt(t.isquemia_fria_min) : null) +
      kpi("Cirugía de banco", t.cirugia_banco_min !== null ? C.duracionTxt(t.cirugia_banco_min) : null) + kpi("Duración de la perfusión", t.duracion_perfusion_h !== null ? H.n(t.duracion_perfusion_h, 1) : (H.inicioPerf(e.ID) ? "<span data-transcurrido=\"" + esc(H.inicioPerf(e.ID)) + "\"></span>" : null), t.duracion_perfusion_h !== null ? "h" : "") +
      kpi("Peso del hígado", H.n(e.Peso_higado_inicial_g, 0), "g") + kpi("Volumen de perfusato", H.n(H.Vperf(e.ID), 0), "mL") + kpi("Mediciones", nMed) + kpi("Avisos pendientes", pend) + "</div>" +
      "<div class=\"columnas\"><section class=\"tarjeta\"><div class=\"cabecera\"><h2>Animales</h2></div><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Rol</th><th>ID</th><th>Crotal</th><th>Sexo</th><th class=\"num\">Peso llegada</th><th>Llegada</th></tr></thead><tbody>" +
      ["BD", "LD"].map(function (r) { var a = an[r] || {}; return "<tr><td>" + (r === "BD" ? "Donante de sangre" : "Donante de hígado") + "</td><td>" + esc(a.ID || "—") + "</td><td>" + esc(a.Crotal || "") + "</td><td>" + esc(a.Sexo === "H" ? "Hembra" : a.Sexo === "M" ? "Macho" + (a.Castrado === "Sí" ? " (castrado)" : "") : "") + "</td><td class=\"num\">" + (a.Peso_llegada_kg ? H.n(a.Peso_llegada_kg, 1) + " kg" : "") + "</td><td>" + esc(H.fechaHora(a.Fecha_llegada)) + "</td></tr>"; }).join("") + "</tbody></table></div></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Datos del experimento</h2>" + indicadorExp() + "</div><div class=\"rejilla\">" +
      campoExp(e, "Codigo_PM", "Código perfusión") + (H.progResumen ? H.progResumen(e) : "") + campoExp(e, "Peso_higado_inicial_g", "Peso del hígado inicial", { tipo: "number", u: "g" }) +
      campoExp(e, "Volumen_perfusato_mL", "Volumen de perfusato", { tipo: "number", u: "mL", ayuda: "Si se deja vacío se usa el total de la hoja de cálculos." }) + campoExp(e, "Responsable", "Responsable") +
      "<div class=\"campo\"><label class=\"et\" for=\"expColor\">Color en los gráficos</label><input id=\"expColor\" type=\"color\" value=\"" + esc(H.colorExp(e.ID)) + "\" data-cambio=\"campoExp\" data-k=\"Color\" data-id=\"" + esc(e.ID) + "\"" + (H.puede("registrar") ? "" : " disabled") + "></div>" +
      campoExp(e, "Notas", "Notas", { tipo: "textarea", ancho: true }) + "</div></section></div>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Cronología</h2><a class=\"bt\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/seguimiento/registro\">" + ico("plus") + "Añadir evento</a></div>" +
      (evs.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fecha y hora</th><th class=\"num\">T perfusión</th><th>Evento</th><th>Nota</th><th>Registrado por</th></tr></thead><tbody>" + evs.map(function (x) {
        var t0 = H.inicioPerf(e.ID), h = t0 ? C.horasEntre(t0, x.Fecha_hora) : null;
        return "<tr><td>" + esc(H.fechaHora(x.Fecha_hora)) + "</td><td class=\"num\">" + (h !== null ? (h < 0 ? "−" : "") + C.duracionTxt(Math.abs(h) * 60) : "") + "</td><td>" + esc(H.nombreEvento(x.Tipo)) + "</td><td class=\"envolver\">" + esc(x.Nota || "") + "</td><td class=\"muy-tenue\">" + esc(x.Creado_por || "") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "<p class=\"tenue\">Sin eventos. Los tiempos de quirófano se registran en la pestaña «Quirófano y recalentamiento».</p>") + "</section>";
  };
  function campoExp(e, k, et, o) { o = o || {}; var h = campo(k, et, k === "Fecha_cirugia" ? H.aFechaLocal(e[k]) || e[k] : e[k], Object.assign({}, o, { acc: "campoExp" })); return h.replace("data-cambio=\"campoExp\"", "data-cambio=\"campoExp\" data-id=\"" + esc(e.ID) + "\""); }
  function indicadorExp() { return "<span id=\"indGuardado\" class=\"guardado\">" + ico("check", "s") + "Guardado automático</span>"; }
  H.acc.campoExp = function (el) { var o = { ID: el.getAttribute("data-id") }; o[el.getAttribute("data-k")] = valorCampo(el); H.guardar("Experimentos", [o], { sinRepintar: true }); var i = H.$("#indGuardado"); if (i) i.innerHTML = ico("check", "s") + "Guardado " + H.hora(new Date()); };
  var NOMBRES_EV = { inicio_exanguinacion: "Inicio de la exanguinación", parada_cardiaca: "Parada cardíaca", inicio_preservacion_fria: "Inicio de la preservación en frío", inicio_banco: "Inicio de la cirugía de banco",
    fin_banco: "Fin de la cirugía de banco", inicio_perfusion: "Inicio de la perfusión", fin_recalentamiento: "Fin del recalentamiento", inicio_hdf: "Conexión de la HDF", fin_perfusion: "Fin de la perfusión",
    incidencia: "Incidencia", ajuste: "Ajuste de parámetros", administracion: "Administración", muestra: "Muestra", biopsia: "Biopsia" };
  H.nombreEvento = function (t) { return NOMBRES_EV[t] || t; };
  H.NOMBRES_EV = NOMBRES_EV;

  // ============================================================================ DIETA
  H.tabsExp.dieta = function (e) {
    var an = H.animales(e.ID), cfg = S.cfg.dieta, puedo = H.puede("registrar");
    var avisoPienso = !C.num(cfg.em_pienso_kcal_kg) || /definir/i.test(cfg.nombre_pienso || "") ? "<div class=\"aviso aj\">" + ico("triangle-alert") + "<div><b>Pienso sin definir.</b> Los gramos por toma usan " + H.n(cfg.em_pienso_kcal_kg, 0) + " kcal EM/kg como valor provisional. Indica el pienso y su energía metabolizable (kcal/kg, en la etiqueta o la ficha técnica) en " + (H.esAdmin() ? "<a href=\"#/config/dieta\">Configuración → Dieta</a>" : "Configuración → Dieta (administradores)") + ".</div></div>" : "";
    var ayuno = "";
    if (e.Fecha_cirugia) { var qx = C.enHora(new Date(e.Fecha_cirugia + "T08:00:00"), "08:00", 0), ret = new Date(qx.getTime() - (cfg.ayuno_h || 12) * 36e5);
      ayuno = "<div class=\"aviso info\">" + ico("clock") + "<div>Cirugía prevista el <b>" + esc(H.fecha(qx)) + "</b>. Retirar la comida a las <b>" + esc(H.hora(ret)) + " del " + esc(H.fecha(ret)) + "</b> (ayuno de " + (cfg.ayuno_h || 12) + " h antes de las 08:00). " +
        (puedo ? "<button class=\"bt mini\" data-act=\"avisoAyuno\" data-id=\"" + esc(e.ID) + "\" data-t=\"" + ret.toISOString() + "\">" + ico("bell") + "Programar aviso</button>" : "") + "</div></div>"; }
    return (H.dietaInfo ? H.dietaInfo(e) : "") + avisoPienso + ayuno + "<div class=\"columnas\">" + ["LD", "BD"].map(function (r) { return tarjetaAnimalDieta(e, an[r], r); }).join("") + "</div>" +
      "<p class=\"muy-tenue\">Temperatura y humedad medidas con el termohigrómetro LIORQUE YGH5254 (adquirido el 07.06.2024). Modelo energético: " + esc(C.MODELOS_DIETA[cfg.modelo] ? C.MODELOS_DIETA[cfg.modelo].nombre : cfg.modelo) + " · factor de actividad " + H.n(cfg.f_actividad, 2) + " · " + (cfg.tomas || 2) + " tomas/día.</p>";
  };
  function tarjetaAnimalDieta(e, a, rol) {
    if (!a) return "<section class=\"tarjeta\"><p>Falta el animal " + rol + ".</p></section>";
    var cfg = S.cfg.dieta, regs = H.filas("Dieta").filter(function (d) { return d.Animal === a.ID; }).sort(function (x, y) { return String(y.Fecha + y.Hora).localeCompare(String(x.Fecha + x.Hora)); });
    var pesoAct = (regs.filter(function (d) { return C.num(d.Peso_kg); })[0] || {}).Peso_kg || a.Peso_llegada_kg, tAct = (regs.filter(function (d) { return C.num(d.Temperatura_C); })[0] || {}).Temperatura_C;
    var en = C.energiaDieta(pesoAct, a.Sexo, a.Castrado, cfg, tAct), comp = C.compararModelosDieta(pesoAct, a.Sexo, a.Castrado, cfg), puedo = H.puede("registrar");
    var calc = en ? "<div class=\"kpis\" style=\"margin:8px 0\"><div class=\"kpi\"><div class=\"et\">Peso de referencia</div><div class=\"v\">" + H.n(pesoAct, 1) + "<small>kg</small></div></div><div class=\"kpi\"><div class=\"et\">Energía metabolizable</div><div class=\"v\">" + H.n(en.em_kcal, 0) + "<small>kcal/día</small></div></div>" +
      "<div class=\"kpi ok\"><div class=\"et\">Pienso por toma</div><div class=\"v\">" + H.n(en.g_toma, 0) + "<small>g × " + en.tomas + "</small></div></div><div class=\"kpi\"><div class=\"et\">Pienso al día</div><div class=\"v\">" + H.n(en.g_dia, 0) + "<small>g</small></div></div></div>" +
      (en.aviso_frio ? "<div class=\"aviso aj\">" + ico("thermometer") + "<div>Sala a " + H.n(tAct, 1) + " °C. La TCI de NRC (" + H.n(en.tci, 1) + " °C) no exige corrección, pero en alojamiento individual se ha medido una TCI de ≈24 °C (Quiniou 2001): vigila el peso durante la aclimatación.</div></div>" : "") +
      "<details class=\"plegable\"><summary>Comparar modelos energéticos</summary><div class=\"dentro\"><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Modelo</th><th class=\"num\">EM de mantenimiento</th><th class=\"num\">EM de la ración</th><th class=\"num\">g/toma</th></tr></thead><tbody>" +
      Object.keys(comp).map(function (k) { var x = comp[k]; return "<tr" + (k === cfg.modelo ? " class=\"actual\"" : "") + "><td>" + esc(x.modelo) + "</td><td class=\"num\">" + H.n(x.base, 0) + "</td><td class=\"num\">" + H.n(x.em_kcal, 0) + "</td><td class=\"num\">" + H.n(x.g_toma, 0) + "</td></tr>"; }).join("") +
      "</tbody></table></div><p class=\"muy-tenue\" style=\"margin-top:6px\">Ración = EM de mantenimiento × sexo " + H.n(en.f_sexo, 2) + " × actividad " + H.n(en.f_actividad, 2) + " × múltiplo " + H.n(en.multiplo, 2) + (en.termico_kcal ? " + coste térmico " + H.n(en.termico_kcal, 0) + " kcal" : "") + " (TCI " + H.n(en.tci, 1) + " °C). La fórmula histórica del grupo ya es la ración completa (múltiplo 1, actividad 1,1). Equivale al " + H.n(en.pct_peso, 1) + " % del peso vivo en pienso al día. Se usa el último peso registrado.</p></div></details>"
      : "<p class=\"tenue\">Registra el peso para calcular la ración.</p>";
    var form = puedo ? "<details class=\"plegable\" open><summary>" + ico("plus", "s") + "Nuevo registro</summary><div class=\"dentro\"><div class=\"rejilla estrecha\" data-dieta=\"" + esc(a.ID) + "\">" +
      "<div class=\"campo\"><label class=\"et\">Fecha</label><input type=\"date\" name=\"Fecha\" value=\"" + H.aFechaLocal(new Date()) + "\"></div><div class=\"campo\"><label class=\"et\">Hora</label><input type=\"time\" name=\"Hora\" value=\"" + H.hora(new Date()) + "\"></div>" +
      "<div class=\"campo\"><label class=\"et\">Toma</label><select name=\"Toma\"><option>1ª toma</option><option>2ª toma</option><option>Control</option><option>Ayuno</option></select></div>" +
      "<div class=\"campo\"><label class=\"et\">Peso (kg)</label><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"0.1\" inputmode=\"decimal\" name=\"Peso_kg\"></div>" +
      "<div class=\"campo\"><label class=\"et\">Temperatura (°C)</label><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"0.1\" inputmode=\"decimal\" name=\"Temperatura_C\"></div><div class=\"campo\"><label class=\"et\">Humedad (%)</label><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"1\" inputmode=\"decimal\" name=\"Humedad_pct\"></div>" +
      "<div class=\"campo\"><label class=\"et\">Ofrecido (g)</label><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"1\" inputmode=\"decimal\" name=\"Ofrecido_g\" value=\"" + (en ? Math.round(en.g_toma) : "") + "\"></div><div class=\"campo\"><label class=\"et\">Sobrante (g)</label><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"1\" inputmode=\"decimal\" name=\"Sobrante_g\"></div>" +
      "<div class=\"campo\"><label class=\"et\">Responsable</label><input name=\"Responsable\" value=\"" + esc((S.usuario || {}).nombre || "") + "\" autocomplete=\"off\"></div><div class=\"campo\" style=\"grid-column:1/-1\"><label class=\"et\">Observaciones / incidencias</label><input name=\"Observaciones\" autocomplete=\"off\"></div>" +
      "<div class=\"fila-flex\" style=\"grid-column:1/-1\"><label class=\"check\"><input type=\"checkbox\" name=\"Agua_ok\" checked> Agua limpia y disponible</label><label class=\"check\"><input type=\"checkbox\" name=\"Enriquecimiento_ok\" checked> Juguetes de enriquecimiento</label></div></div>" +
      "<button class=\"bt pri\" data-act=\"guardarDieta\" data-animal=\"" + esc(a.ID) + "\" data-exp=\"" + esc(e.ID) + "\" data-em=\"" + (en ? Math.round(en.em_kcal) : "") + "\">" + ico("save") + "Guardar registro</button></div></details>" : "";
    var tabla = regs.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fecha</th><th>Hora</th><th>Toma</th><th class=\"num\">Peso</th><th class=\"num\">T °C</th><th class=\"num\">HR %</th><th class=\"num\">Ofrecido</th><th class=\"num\">Sobrante</th><th class=\"num\">Ingerido</th><th>Responsable</th><th>Obs.</th>" + (puedo ? "<th></th>" : "") + "</tr></thead><tbody>" +
      regs.map(function (d) { var ing = C.num(d.Consumido_g), of = C.num(d.Ofrecido_g); return "<tr><td>" + esc(H.fecha(d.Fecha)) + "</td><td>" + esc(d.Hora || "") + "</td><td>" + esc(d.Toma || "") + "</td><td class=\"num\">" + H.n(d.Peso_kg, 1) + "</td><td class=\"num\">" + H.n(d.Temperatura_C, 1) + "</td><td class=\"num\">" + H.n(d.Humedad_pct, 0) + "</td><td class=\"num\">" + H.n(of, 0) + "</td><td class=\"num\">" + H.n(d.Sobrante_g, 0) + "</td><td class=\"num\">" + (ing !== null ? H.n(ing, 0) + (of ? " <span class=\"muy-tenue\">(" + H.n(ing / of * 100, 0) + " %)</span>" : "") : "") + "</td><td>" + esc(d.Responsable || "") + (d.Origen === "qr" ? " <span class=\"chip info\">QR</span>" : "") + (H.pendiente(d) ? " <span class=\"chip aj\">Pendiente</span>" : "") + "</td><td class=\"envolver\">" + esc(d.Observaciones || "") + "</td>" + (puedo ? "<td><button class=\"bt ico-solo texto\" data-act=\"borrarFila\" data-tabla=\"Dieta\" data-id=\"" + esc(d.ID) + "\" aria-label=\"Borrar registro\">" + ico("trash-2", "s") + "</button></td>" : "") + "</tr>"; }).join("") + "</tbody></table></div>" : "<p class=\"tenue\">Sin registros.</p>";
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>" + (rol === "BD" ? "Donante de sangre" : "Donante de hígado") + " · " + esc(a.ID) + "</h2><span class=\"chip\">" + esc(a.Sexo === "H" ? "Hembra" : a.Sexo === "M" ? "Macho" + (a.Castrado === "Sí" ? " castrado" : " entero") : "Sexo —") + "</span></div>" +
      "<div class=\"rejilla estrecha\">" + campoAnimal(a, "Crotal", "Crotal") + campoAnimal(a, "Sexo", "Sexo", { tipo: "select", opciones: [["H", "Hembra"], ["M", "Macho"]] }) + campoAnimal(a, "Castrado", "Castrado", { tipo: "select", opciones: ["No", "Sí"] }) + campoAnimal(a, "Peso_llegada_kg", "Peso llegada (kg)", { tipo: "number" }) + campoAnimal(a, "Fecha_llegada", "Llegada", { tipo: "datetime-local" }) + "</div>" +
      calc + form + "<h4 style=\"margin:12px 0 6px\">Registros</h4>" + tabla + "</section>";
  }
  function campoAnimal(a, k, et, o) { var h = campo(k, et, a[k], Object.assign({}, o || {}, { acc: "campoAnimal" })); return h.replace("data-cambio=\"campoAnimal\"", "data-cambio=\"campoAnimal\" data-id=\"" + esc(a.ID) + "\""); }
  H.acc.campoAnimal = function (el) { var o = { ID: el.getAttribute("data-id") }, k = el.getAttribute("data-k"); o[k] = valorCampo(el); if (k === "Fecha_llegada" && el.value) o.Hora_llegada = el.value.slice(11, 16); H.guardar("Animales", [o]); };
  H.acc.guardarDieta = function (el) {
    var cont = H.$("[data-dieta=\"" + el.getAttribute("data-animal") + "\"]"), o = { ID: H.uid(), Experimento: el.getAttribute("data-exp"), Animal: el.getAttribute("data-animal"), EM_objetivo_kcal: C.num(el.getAttribute("data-em")) };
    H.$$("input,select", cont).forEach(function (i) { o[i.name] = i.type === "checkbox" ? i.checked : i.hasAttribute("data-num") ? C.num(i.value) : i.value; }); o.Origen = "web";
    if (!o.Fecha) { H.toast("Indica la fecha.", "error"); return; }
    o.Consumido_g = o.Ofrecido_g !== null && o.Sobrante_g !== null ? o.Ofrecido_g - o.Sobrante_g : null;
    H.guardar("Dieta", [o]); H.toast("Registro de dieta guardado.");
  };
  H.acc.avisoAyuno = function (el) {
    var id = el.getAttribute("data-id"), t = el.getAttribute("data-t");
    H.programarAvisos(id, [{ ID: id + "|ayuno", Experimento: id, Fecha_hora: t, Tipo: "otro", Destino: "equipo", Vista: "exp:" + id + ":dieta", Titulo: "Retirar la comida · " + id, Texto: "Inicio del ayuno preoperatorio de " + (S.cfg.dieta.ayuno_h || 12) + " h (donante de sangre y donante de hígado)." }], ["otro"]);
    H.toast("Aviso de ayuno programado para las " + H.hora(t) + ".");
  };
  H.acc.borrarFila = function (el) { H.confirmar("Borrar registro", "El registro quedará marcado como borrado (se conserva en la auditoría).", "Borrar", true).then(function (ok) { if (ok) H.borrar(el.getAttribute("data-tabla"), [el.getAttribute("data-id")]); }); };
  // avisos: aplica en local y encola el envío
  H.programarAvisos = function (exp, avisos, tipos) {
    S.t.Avisos = (S.t.Avisos || []).filter(function (a) { return !(a.Experimento === exp && a.Estado === "Pendiente" && tipos.indexOf(a.Tipo) !== -1); });
    avisos.forEach(function (a) { a.Estado = "Pendiente"; }); S.t.Avisos = S.t.Avisos.concat(avisos);
    S.cola.push({ id: H.uid(), fn: "webProgramarAvisos", args: [exp, avisos, tipos] }); H.guardarCache(); H.actualizarSync(); H.enviarCola();
  };
  H.cancelarAvisos = function (exp, tipos) {
    (S.t.Avisos || []).forEach(function (a) { if (a.Experimento === exp && a.Estado === "Pendiente" && (!tipos.length || tipos.indexOf(a.Tipo) !== -1)) a.Estado = "Cancelado"; });
    S.cola.push({ id: H.uid(), fn: "webCancelarAvisos", args: [exp, tipos] }); H.guardarCache(); H.actualizarSync(); H.enviarCola();
  };

  // ============================================================================ CIRUGÍA
  var MORFO = [["HSLD", "Altura a la cruz (hombro)"], ["MGH", "Perímetro zona media"], ["PGH", "Perímetro zona baja"], ["HHIP", "Altura a la cadera"], ["BL1", "Longitud base de la cola–hombro"],
    ["OBL", "Longitud del cuerpo"], ["NL", "Longitud del cuello"], ["HGH", "Perímetro torácico (cardíaco)"]];
  var CAT_ASIST = [["fea", "Cirujanos (F.E.A.)"], ["residentes", "Cirujanos (residentes)"], ["alumnos", "Alumnos de Medicina"], ["anestesia", "Anestesia"], ["veterinaria", "Veterinaria"], ["tecnicos", "Asistentes y técnicos"]];
  H.CAT_ASIST = CAT_ASIST;
  H.tabsExp.cirugia = function (e, sub) {
    var rol = sub[0] === "BD" ? "BD" : "LD", an = H.animales(e.ID), a = an[rol]; if (!a) return "<div class=\"vacio\">Falta el animal " + rol + ".</div>";
    var d = usarForm(e.ID, "cirugia", a.ID), peso = C.num(d.peso_kg) || C.num(a.Peso_llegada_kg), ev = H.eventos(e.ID), tt = C.tiempos(ev);
    FA.alCambiar = function (el) { var k = el.getAttribute("data-k"); if (k === "peso_kg" || /^premed\./.test(k) || /^morfo\./.test(k)) H.retrasar("rep", 900, H.repintar); if (k === "peso_higado_g") H.guardar("Experimentos", [{ ID: e.ID, Peso_higado_inicial_g: C.num(el.value) }], { sinRepintar: true }); };
    var seg = "<div class=\"segmentado\" role=\"tablist\" style=\"margin-bottom:12px\"><button role=\"tab\" class=\"" + (rol === "LD" ? "activo" : "") + "\" aria-selected=\"" + (rol === "LD") + "\" data-act=\"irSub\" data-r=\"exp/" + encodeURIComponent(e.ID) + "/cirugia/LD\">Donante de hígado · " + esc(an.LD ? an.LD.ID : "") + "</button><button role=\"tab\" class=\"" + (rol === "BD" ? "activo" : "") + "\" aria-selected=\"" + (rol === "BD") + "\" data-act=\"irSub\" data-r=\"exp/" + encodeURIComponent(e.ID) + "/cirugia/BD\">Donante de sangre · " + esc(an.BD ? an.BD.ID : "") + "</button></div>";
    var pm = C.pesoMorfometrico(leerRuta(d, "morfo.HGH"), leerRuta(d, "morfo.OBL"));
    var html = seg + "<div class=\"fila-flex sep\" style=\"margin-bottom:8px\"><p class=\"tenue\" style=\"margin:0\">Orden propuesto: datos generales → morfometría → anestesia → cirugía → hemodinámica → extracción/isquemia → asistentes → observaciones.</p>" + indicador() + "</div>";
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>1 · Datos generales previos a la cirugía</h3></div><div class=\"rejilla\">" +
      campo("fecha", "Fecha del procedimiento", d.fecha || e.Fecha_cirugia || H.aFechaLocal(new Date()), { tipo: "date" }) + "<div class=\"campo\"><label class=\"et\">Identificación</label><input value=\"" + esc(a.ID) + "\" disabled></div>" +
      "<div class=\"campo\"><label class=\"et\">Sexo / crotal</label><input value=\"" + esc((a.Sexo === "H" ? "Hembra" : a.Sexo === "M" ? "Macho" : "—") + " · " + (a.Crotal || "—")) + "\" disabled></div>" +
      campo("peso_kg", "Peso pre-cirugía", d.peso_kg, { tipo: "number", u: "kg", ayuda: a.Peso_llegada_kg ? "Llegada: " + H.n(a.Peso_llegada_kg, 1) + " kg" : "" }) +
      campo("ayuno_h", "Horas de ayuno", d.ayuno_h, { tipo: "number", u: "h" }) + campo("estado", "Estado general / incidencias previas", d.estado, { ph: "Sin incidencias…" }) + "</div></section>";
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>2 · Morfometría</h3>" + (pm ? "<span class=\"chip info\">Peso estimado por perímetro torácico y longitud: " + H.n(pm, 1) + " kg</span>" : "") + "</div><div class=\"rejilla\">" +
      MORFO.map(function (m) { return campo("morfo." + m[0], m[1] + " (" + m[0] + ")", leerRuta(d, "morfo." + m[0]), { tipo: "number", u: "cm" }); }).join("") + "</div></section>";
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>3 · Premedicación</h3><span class=\"muy-tenue\">Dosis calculadas con " + (peso ? H.n(peso, 1) + " kg" : "el peso (pendiente)") + "</span></div>" + tablaFarmacos(d, "premed", S.cfg.premedicacion, peso) + "</section>";
    if (rol === "BD") {
      html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>4 · Medicación</h3></div>" + tablaFarmacos(d, "med", [{ f: "Heparina", dosis_mg_kg: S.cfg.heparina_donante_mg_kg, conc_mg_mL: 50 }], peso) + "</section>";
      html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>5 · Extracción de sangre y eutanasia</h3></div>" + (H.sangreHTML ? H.sangreHTML(e) : "") + "<div class=\"rejilla\">" +
        campo("ext.metodo", "Método de extracción", leerRuta(d, "ext.metodo"), { tipo: "select", opciones: ["Sistema de HDF (Aquarius)", "Bolsas CPDA-1", "Máquina CRRT (Aquarius)"] }) + campo("ext.inicio", "Inicio de la extracción", leerRuta(d, "ext.inicio"), { tipo: "time" }) +
        campo("ext.fin", "Fin de la extracción", leerRuta(d, "ext.fin"), { tipo: "time" }) + campo("ext.volumen_mL", "Volumen de sangre extraído", leerRuta(d, "ext.volumen_mL"), { tipo: "number", u: "mL" }) +
        campo("ext.bolsas", "Nº de bolsas", leerRuta(d, "ext.bolsas"), { tipo: "number" }) + campo("ext.hora_eutanasia", "Hora de la eutanasia", leerRuta(d, "ext.hora_eutanasia"), { tipo: "time" }) + "</div></section>";
    } else {
      html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>4 · Anestesia y datos de la cirugía</h3></div><div class=\"rejilla\">" + campo("qx.intubacion", "Hora de intubación", leerRuta(d, "qx.intubacion"), { tipo: "time" }) +
        campo("qx.inicio", "Hora de inicio de la cirugía", leerRuta(d, "qx.inicio"), { tipo: "time" }) + campo("qx.temp_C", "Temperatura del quirófano", leerRuta(d, "qx.temp_C"), { tipo: "number", u: "°C" }) + campo("qx.humedad", "Humedad", leerRuta(d, "qx.humedad"), { tipo: "number", u: "%" }) + "</div>" +
        tablaFarmacos(d, "med", [{ f: "Tiopental" }, { f: "Fentanilo" }, { f: "Cefoxitina" }, { f: "Heparina", dosis_mg_kg: S.cfg.heparina_donante_mg_kg, conc_mg_mL: 50 }, { f: "Cisatracurio" }], peso) + (H.basalHTML ? H.basalHTML(e, d) : "") + "</section>";
      html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>5 · Hemodinámica in vivo</h3><a class=\"bt mini\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/seguimiento/pre\">Muestra basal in vivo</a></div><div class=\"rejilla\">" +
        campo("hemo.Q_VP", "Flujo vena porta", leerRuta(d, "hemo.Q_VP"), { tipo: "number", u: "mL/min" }) + campo("hemo.Q_AH", "Flujo arteria hepática", leerRuta(d, "hemo.Q_AH"), { tipo: "number", u: "mL/min" }) +
        campo("hemo.PAM", "Presión arterial media", leerRuta(d, "hemo.PAM"), { tipo: "number", u: "mmHg" }) + campo("hemo.FC", "Frecuencia cardíaca", leerRuta(d, "hemo.FC"), { tipo: "number", u: "lpm" }) + campo("hemo.Temp", "Temperatura corporal", leerRuta(d, "hemo.Temp"), { tipo: "number", u: "°C" }) + "</div></section>";
      html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>6 · Exanguinación, isquemia y extracción del injerto</h3><a class=\"bt\" href=\"#/exp/" + encodeURIComponent(e.ID) + "/quirofano\">" + ico("timer") + "Cronómetros</a></div>" +
        "<div class=\"kpis\" style=\"margin-bottom:10px\">" + [["Inicio exanguinación", ev.inicio_exanguinacion], ["Parada cardíaca", ev.parada_cardiaca], ["Inicio preservación fría", ev.inicio_preservacion_fria]].map(function (x) { return "<div class=\"kpi\"><div class=\"et\">" + x[0] + "</div><div class=\"v\" style=\"font-size:18px\">" + (x[1] ? esc(H.horaS(x[1])) : "—") + "</div></div>"; }).join("") +
        "<div class=\"kpi\"><div class=\"et\">Isquemia caliente</div><div class=\"v\" style=\"font-size:18px\">" + C.duracionTxt(tt.isquemia_caliente_min) + "</div></div></div>" + (H.sangreHTML ? H.sangreHTML(e) : "") + "<div class=\"rejilla\">" +
        campo("ext.volumen_mL", "Volumen de sangre extraído (sistema de HDF)", leerRuta(d, "ext.volumen_mL"), { tipo: "number", u: "mL" }) + campo("ext.solucion", "Solución de preservación", leerRuta(d, "ext.solucion") || "IGL-1", {}) +
        campo("ext.volumen_preservacion_mL", "Volumen de preservación infundido", leerRuta(d, "ext.volumen_preservacion_mL"), { tipo: "number", u: "mL" }) + campo("peso_higado_g", "Peso del hígado tras la extracción", d.peso_higado_g || e.Peso_higado_inicial_g, { tipo: "number", u: "g", ayuda: peso && (d.peso_higado_g || e.Peso_higado_inicial_g) ? "≈ " + H.n((d.peso_higado_g || e.Peso_higado_inicial_g) / (peso * 10), 2) + " % del peso corporal" : "" }) + "</div></section>";
    }
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>" + (rol === "BD" ? 6 : 7) + " · Asistentes en la cirugía</h3><span class=\"muy-tenue\">Sirve para el registro de autorías</span>" + (H.puede("registrar") ? "<button class=\"bt mini\" data-act=\"nuevaPersona\">" + ico("plus", "s") + "Añadir persona</button>" : "") + "</div>" + asistentesHTML(d) + "</section>";
    html += "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>" + (rol === "BD" ? 7 : 8) + " · Observaciones e incidencias</h3></div><div class=\"rejilla dos\">" + campo("obs", "Observaciones e incidencias", d.obs, { tipo: "textarea", ancho: true }) + campo("reportado", "Reportado por", d.reportado || (S.usuario || {}).nombre, {}) + "</div></section>";
    return html;
  };
  H.acc.irSub = function (el) { H.ir(el.getAttribute("data-r")); };
  function tablaFarmacos(d, grupo, lista, peso) {
    return "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fármaco</th><th class=\"num\">Dosis pautada</th><th class=\"num\">Dosis calculada</th><th class=\"num\">Volumen calculado</th><th>Cantidad administrada</th><th>Hora</th></tr></thead><tbody>" +
      lista.map(function (f) {
        var k = grupo + "." + f.f.replace(/\W/g, ""), dk = C.num(leerRuta(d, k + ".dosis_mg_kg")); if (dk === null) dk = f.dosis_mg_kg; var mg = f.dosis_mg !== undefined ? f.dosis_mg : (dk !== null && dk !== undefined && peso ? dk * peso : null), ml = mg !== null && f.conc_mg_mL ? mg / f.conc_mg_mL : null;
        return "<tr><td><b>" + esc(f.f) + "</b>" + (f.conc_mg_mL ? "<div class=\"muy-tenue\">" + H.n(f.conc_mg_mL, 2) + " mg/mL</div>" : "") + "</td><td class=\"num\">" + (f.dosis_mg !== undefined ? H.n(f.dosis_mg, 1) + " mg" : "<input style=\"width:90px\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" aria-label=\"Dosis de " + esc(f.f) + " en mg/kg\" value=\"" + (dk === null || dk === undefined ? "" : dk) + "\" data-k=\"" + k + ".dosis_mg_kg\" data-cambio=\"campoForm\"> mg/kg") + "</td>" +
          "<td class=\"num\">" + (mg !== null ? H.n(mg, 1) + " mg" : "—") + "</td><td class=\"num\">" + (ml !== null ? H.n(ml, 2) + " mL" : "—") + "</td><td><input style=\"min-width:110px\" aria-label=\"Cantidad administrada de " + esc(f.f) + "\" value=\"" + esc(leerRuta(d, k + ".admin") || "") + "\" data-k=\"" + k + ".admin\" data-cambio=\"campoForm\" placeholder=\"" + (ml !== null ? H.n(ml, 2) + " mL…" : "mg o mL…") + "\" autocomplete=\"off\"></td>" +
          "<td><input type=\"time\" style=\"width:120px\" aria-label=\"Hora de " + esc(f.f) + "\" value=\"" + esc(leerRuta(d, k + ".hora") || "") + "\" data-k=\"" + k + ".hora\" data-cambio=\"campoForm\"></td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function asistentesHTML(d) {
    var per = H.filas("Personal").filter(function (p) { return p.Activo !== false && p.Activo !== "FALSE"; }), sel = d.asistentes || {}, puedo = H.puede("registrar");
    return CAT_ASIST.map(function (c) {
      var lista = per.filter(function (p) { return p.Categoria === c[1]; }), ids = sel[c[0]] || [];
      ids.forEach(function (id) { if (!lista.some(function (p) { return p.ID === id; })) { var p = H.fila("Personal", id); if (p) lista.push(p); } });
      return "<div class=\"campo\"><span class=\"et\">" + esc(c[1]) + "</span><div class=\"fila-flex\">" + (lista.length ? lista.map(function (p) {
        var on = ids.indexOf(p.ID) !== -1; return "<button class=\"chip " + (on ? "pri" : "") + "\" style=\"min-height:32px;cursor:pointer\" aria-pressed=\"" + on + "\" data-act=\"asistente\" data-cat=\"" + c[0] + "\" data-id=\"" + esc(p.ID) + "\"" + (puedo ? "" : " disabled") + ">" + (on ? ico("check", "s") : "") + esc(p.Nombre) + "</button>";
      }).join("") : "<span class=\"muy-tenue\">Sin personas en esta categoría. Añádelas con «Añadir persona».</span>") + "</div></div>";
    }).join("");
  }
  H.acc.asistente = function (el) {
    var c = el.getAttribute("data-cat"), id = el.getAttribute("data-id"); FA.datos.asistentes = FA.datos.asistentes || {}; var l = FA.datos.asistentes[c] = FA.datos.asistentes[c] || [];
    var i = l.indexOf(id); if (i === -1) l.push(id); else l.splice(i, 1); H.guardarForm(FA.exp, FA.tipo, FA.animal, FA.datos); H.repintar();
  };
  H.acc.nuevaPersona = function () {
    H.modal({ titulo: "Añadir persona", cuerpo: "<div class=\"campo\"><label class=\"et\" for=\"npN\">Nombre y apellidos</label><input id=\"npN\" autocomplete=\"off\"></div><div class=\"campo\"><label class=\"et\" for=\"npC\">Categoría</label><select id=\"npC\">" + CAT_ASIST.map(function (c) { return "<option>" + esc(c[1]) + "</option>"; }).join("") + "<option>Investigador/a</option><option>Otro</option></select></div><div class=\"campo\"><label class=\"et\" for=\"npE\">Correo (opcional)</label><input id=\"npE\" type=\"email\" autocomplete=\"off\" spellcheck=\"false\"></div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"npOk\">Añadir</button>",
      alAbrir: function (d) { d.querySelector("#npOk").addEventListener("click", function () { var n = d.querySelector("#npN").value.trim(); if (!n) return; H.guardar("Personal", [{ ID: "PER-" + H.uid(), Nombre: n, Categoria: d.querySelector("#npC").value, Email: d.querySelector("#npE").value.trim(), Activo: true }]); d.close(); }); } });
  };
})();
