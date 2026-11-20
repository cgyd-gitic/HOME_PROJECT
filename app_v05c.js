/* HOME v0.5 (C) · dieta (animales por crotal, registro común de sala, edición solo por el equipo), pantalla QR de los celadores
   con PDF de instrucciones, cirugía (donante de hígado, donante de sangre y receptor; morfometría ilustrada; botones «Ahora»;
   medicación añadida) y preparación (solo checklist de material). */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function si(v) { return v === true || v === "TRUE" || v === "true"; }
  function dma(v) { var d = C.aDia(v); return d ? H.fechaDMA(d).replace(/\//g, ".") : ""; }
  function cfgP() { return S.cfg.programacion || C.DEF.programacion; }
  function llegada(e) { return e.Fecha_llegada ? C.diaISO(C.aDia(e.Fecha_llegada)) : (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -cfgP().dias_llegada_antes) : ""); }
  function nombreAnimal(a, i) { return a && a.Crotal ? "Crotal " + a.Crotal : "Animal " + (i + 1) + " (sin crotal)"; }
  // ración por toma (sin pesadas diarias: se usa el peso de llegada)
  function racion(a, cfgD) { var p = C.num(a.Peso_llegada_kg) || C.num(a.Peso_kg); var en = p ? C.energiaDieta(p, a.Sexo, a.Castrado, cfgD) : null; return en ? { g: Math.round(en.g_toma), en: en } : null; }
  // mensaje de la pauta para el personal: solo si cambia o no
  function pautaDia(ac, e, cfgD, gramos) {
    if (!ac) return null; var hoy = C.diaISO(new Date());
    if (e && e.Fecha_cirugia && C.diasEntre(hoy, e.Fecha_cirugia) === 1) { var qx = C.enHora(new Date(e.Fecha_cirugia + "T08:00:00"), "08:00", 0), ret = new Date(qx.getTime() - (cfgD.ayuno_h || 12) * 36e5); return { tipo: "cambio", texto: "Cambio de pauta: mañana hay cirugía. Da la 1ª toma normal y retira la comida a las " + H.hora(ret) + " (ayuno)." }; }
    if (!ac.patron) return { tipo: "llegada", texto: "Día de llegada: los animales están juntos y hoy no hay pauta de comida. Comprueba solo el agua y los juguetes." };
    if (ac.dia === (cfgD.dia_inicio_patron || 2)) return { tipo: "cambio", texto: "Cambio de pauta: hoy empieza la alimentación por tomas" + (gramos ? " (" + gramos + " g por toma)" : "") + ". Los animales ya están separados." };
    return { tipo: "igual", texto: "Pauta sin cambios: pon la misma cantidad que ayer" + (gramos ? " (" + gramos + " g por toma)" : "") + "." };
  }

  // ============================================================== DIETA (ficha del experimento)
  H.tabsExp.dieta = function (e) {
    var an = H.animales(e.ID), cfg = S.cfg.dieta, puedo = H.puede("registrar"), lista = ["LD", "BD"].map(function (r) { return an[r]; }).filter(Boolean), hoy = C.diaISO(new Date()), ll = llegada(e), ac = ll ? C.diaAclimatacion(ll, hoy, cfg) : null;
    if (H.animalesLlegaron && !H.animalesLlegaron(e) && !(H.expIniciado && H.expIniciado(e))) return '<div class="estado-exp">' + ico("calendar-clock", "l") + "<p>La dieta se registra desde la llegada de los animales" + (ll ? " (prevista el <b>" + esc(dma(ll)) + "</b>)" : "") + ".</p></div>";
    var r0 = lista.length ? racion(lista[0], cfg) : null, pt = ac && C.diasEntre(hoy, e.Fecha_cirugia) >= 0 ? pautaDia(ac, e, cfg, r0 ? r0.g : null) : null;
    var cab = '<section class="tarjeta dieta-cab"><div class="dieta-dia"><span class="et">Aclimatación</span><b>' + (ac && C.diasEntre(hoy, e.Fecha_cirugia) >= 0 ? "Día " + ac.dia : "—") + '</b><span class="muy-tenue">' + esc(cfg.nombre_pienso || "") + "</span></div>" +
      (pt ? '<div class="pauta ' + pt.tipo + '">' + ico(pt.tipo === "igual" ? "circle-check" : "triangle-alert") + "<span>" + esc(pt.texto) + "</span></div>" : '<div class="pauta igual">' + ico("info") + "<span>Fuera del periodo de aclimatación.</span></div>") +
      '<div class="dieta-acc">' + (H.esAdmin() ? '<button class="bt pri" data-act="qrDietaRapido">' + ico("qr-code") + "QR para los celadores</button>" : '<span class="muy-tenue">El QR de los celadores lo imprime un administrador.</span>') + "</div></section>";
    var tarjetas = lista.map(function (a, i) {
      var rc = racion(a, cfg);
      return '<section class="tarjeta"><div class="cabecera"><h2>' + esc(nombreAnimal(a, i)) + '</h2><span class="chip">' + esc(a.Sexo === "H" ? "Hembra" : a.Sexo === "M" ? "Macho" : "Sexo —") + '</span><span class="muy-tenue">' + esc(a.ID) + "</span></div>" +
        '<div class="rejilla tres">' + campoAnimal(a, "Crotal", "Crotal") + campoAnimal(a, "Sexo", "Sexo", { tipo: "select", opciones: [["H", "Hembra"], ["M", "Macho"]] }) + campoAnimal(a, "Peso_llegada_kg", "Peso a la llegada", { tipo: "number", u: "kg" }) + "</div>" +
        (rc ? '<div class="kpis tres"><div class="kpi"><div class="et">Energía metabolizable</div><div class="v">' + H.n(rc.en.em_kcal, 0) + '<small>kcal/día</small></div></div><div class="kpi ok"><div class="et">Pienso por toma</div><div class="v">' + H.n(rc.g, 0) + "<small>g × " + rc.en.tomas + '</small></div></div><div class="kpi"><div class="et">Pienso al día</div><div class="v">' + H.n(rc.en.g_dia, 0) + "<small>g</small></div></div></div>" : '<p class="tenue">Anota el peso a la llegada para calcular la ración.</p>') + "</section>";
    }).join("");
    var form = puedo && lista.length ? '<section class="tarjeta"><div class="cabecera"><h2>Nuevo registro</h2><span class="muy-tenue">Fecha y hora de ahora; la temperatura y la humedad sirven para los dos animales.</span></div><div class="rejilla cuatro" id="dietaComun">' +
      '<div class="campo"><label class="et" for="dFecha">Fecha</label><input id="dFecha" type="date" value="' + H.aFechaLocal(new Date()) + '"></div><div class="campo"><label class="et" for="dHora">Hora</label><input id="dHora" type="time" value="' + H.hora(new Date()) + '"></div>' +
      '<div class="campo"><label class="et" for="dToma">Toma</label><select id="dToma"><option' + (new Date().getHours() < 14 ? " selected" : "") + ">1ª toma</option><option" + (new Date().getHours() >= 14 ? " selected" : "") + '>2ª toma</option><option>Control</option><option>Ayuno</option></select></div>' +
      '<div class="campo"><label class="et" for="dResp">Responsable</label><input id="dResp" value="' + esc((S.usuario || {}).nombre || "") + '" autocomplete="off"></div>' +
      '<div class="campo"><label class="et" for="dT">Temperatura de la sala</label><div class="unidad-in"><input id="dT" inputmode="decimal" data-num="1"><span>°C</span></div></div><div class="campo"><label class="et" for="dHR">Humedad</label><div class="unidad-in"><input id="dHR" inputmode="decimal" data-num="1"><span>%</span></div></div>' +
      '<div class="campo span2"><span class="et">Corral</span><div class="fila-flex checks"><label class="check"><input type="checkbox" id="dAgua" checked> Agua limpia</label><label class="check"><input type="checkbox" id="dJug" checked> Juguetes</label></div></div></div>' +
      '<div class="dieta-animales">' + lista.map(function (a, i) { var rc = racion(a, cfg); return '<div class="dieta-animal" data-animal="' + esc(a.ID) + '" data-em="' + (rc ? Math.round(rc.en.em_kcal) : "") + '"><b>' + esc(nombreAnimal(a, i)) + '</b><div class="rejilla tres"><div class="campo"><label class="et">Ofrecido</label><div class="unidad-in"><input name="Ofrecido_g" inputmode="numeric" data-num="1" value="' + (rc ? rc.g : "") + '"><span>g</span></div></div><div class="campo"><label class="et">Sobrante</label><div class="unidad-in"><input name="Sobrante_g" inputmode="numeric" data-num="1"><span>g</span></div></div><div class="campo"><label class="et">Observaciones</label><input name="Observaciones" autocomplete="off" placeholder="No come, diarrea…"></div></div></div>'; }).join("") + "</div>" +
      '<button class="bt pri" data-act="guardarDieta2" data-exp="' + esc(e.ID) + '">' + ico("save") + "Guardar registro</button></section>" : "";
    var regs = H.filas("Dieta").filter(function (d) { return d.Experimento === e.ID; }).sort(function (x, y) { return String(y.Fecha + y.Hora).localeCompare(String(x.Fecha + x.Hora)); });
    var porId = {}; lista.forEach(function (a, i) { porId[a.ID] = nombreAnimal(a, i); });
    var tabla = '<section class="tarjeta"><div class="cabecera"><h2>Registros</h2><span class="muy-tenue">' + (puedo ? "Una vez guardados, solo el equipo los modifica" + (H.requiereValidacion("Dieta") ? " (tus cambios quedan pendientes de validación)" : "") + "." : "") + "</span></div>" +
      (regs.length ? '<div class="tabla-env"><table class="t"><thead><tr><th>Fecha</th><th>Hora</th><th>Toma</th><th>Animal</th><th class="num">Ofrecido</th><th class="num">Sobrante</th><th class="num">Ingerido</th><th class="num">T °C</th><th class="num">HR %</th><th>Responsable</th><th>Obs.</th>' + (puedo ? "<th></th>" : "") + "</tr></thead><tbody>" +
        regs.map(function (d) { var ing = C.num(d.Consumido_g), of = C.num(d.Ofrecido_g); return "<tr><td>" + esc(dma(d.Fecha)) + "</td><td>" + esc(d.Hora || "") + "</td><td>" + esc(d.Toma || "") + "</td><td>" + esc(porId[d.Animal] || d.Animal) + '</td><td class="num">' + H.n(of, 0) + '</td><td class="num">' + H.n(d.Sobrante_g, 0) + '</td><td class="num">' + (ing !== null ? H.n(ing, 0) + (of ? ' <span class="muy-tenue">(' + H.n(ing / of * 100, 0) + " %)</span>" : "") : "") + '</td><td class="num">' + H.n(d.Temperatura_C, 1) + '</td><td class="num">' + H.n(d.Humedad_pct, 0) + "</td><td>" + esc(d.Responsable || "") + (d.Origen === "qr" ? ' <span class="chip info">QR</span>' : "") + (H.pendiente(d) ? ' <span class="chip aj">Pendiente</span>' : "") + '</td><td class="envolver">' + esc(d.Observaciones || "") + "</td>" +
          (puedo ? '<td class="acciones-fila"><button class="bt ico-solo texto" data-act="editarDieta" data-id="' + esc(d.ID) + '" aria-label="Modificar registro">' + ico("pencil", "s") + '</button><button class="bt ico-solo texto" data-act="borrarFila" data-tabla="Dieta" data-id="' + esc(d.ID) + '" aria-label="Borrar registro">' + ico("trash-2", "s") + "</button></td>" : "") + "</tr>"; }).join("") + "</tbody></table></div>" : '<p class="tenue">Sin registros.</p>') + "</section>";
    var ayuno = "";
    if (e.Fecha_cirugia && C.diasEntre(hoy, e.Fecha_cirugia) >= 0) { var qx = C.enHora(new Date(e.Fecha_cirugia + "T08:00:00"), "08:00", 0), ret = new Date(qx.getTime() - (cfg.ayuno_h || 12) * 36e5);
      ayuno = '<div class="aviso info">' + ico("clock") + "<div>Cirugía el <b>" + esc(dma(e.Fecha_cirugia)) + "</b>: retirar la comida a las <b>" + esc(H.hora(ret)) + " del " + esc(dma(ret)) + "</b> (ayuno de " + (cfg.ayuno_h || 12) + " h). " + (puedo ? '<button class="bt mini" data-act="avisoAyuno" data-id="' + esc(e.ID) + '" data-t="' + ret.toISOString() + '">' + ico("bell", "s") + "Programar aviso</button>" : "") + "</div></div>"; }
    return cab + ayuno + '<div class="columnas">' + tarjetas + "</div>" + form + tabla + '<p class="muy-tenue">El donante de sangre y el de hígado son hermanos y del mismo sexo: en la dieta se identifican por el crotal. Temperatura y humedad con el termohigrómetro LIORQUE YGH5254.</p>';
  };
  function campoAnimal(a, k, et, o) { var h = H.campo(k, et, a[k], Object.assign({}, o || {}, { acc: "campoAnimal" })); return h.replace('data-cambio="campoAnimal"', 'data-cambio="campoAnimal" data-id="' + esc(a.ID) + '"'); }
  H.acc.guardarDieta2 = function (el) {
    var exp = el.getAttribute("data-exp"), f = H.$("#dFecha").value, hora = H.$("#dHora").value, toma = H.$("#dToma").value, T = C.num(H.$("#dT").value), HR = C.num(H.$("#dHR").value), resp = H.$("#dResp").value.trim(), filas = [];
    if (!f) { H.toast("Indica la fecha.", "error"); return; }
    H.$$(".dieta-animal").forEach(function (d) {
      var g = function (n) { var i = d.querySelector("[name=" + n + "]"); return i.hasAttribute("data-num") ? C.num(i.value) : i.value.trim(); }, sinP = toma === "Control" || toma === "Ayuno", of = sinP ? null : g("Ofrecido_g"), so = sinP ? null : g("Sobrante_g");   // v0.5: Control y Ayuno no llevan pienso
      filas.push({ ID: H.uid(), Experimento: exp, Animal: d.getAttribute("data-animal"), Fecha: f, Hora: hora, Toma: toma, Temperatura_C: T, Humedad_pct: HR, Ofrecido_g: of, Sobrante_g: so, Consumido_g: of !== null && so !== null ? of - so : null, Responsable: resp, Observaciones: g("Observaciones"), Agua_ok: H.$("#dAgua").checked, Enriquecimiento_ok: H.$("#dJug").checked, EM_objetivo_kcal: sinP ? null : C.num(d.getAttribute("data-em")), Origen: "web" });
    });
    H.guardar("Dieta", filas); H.toast("Registro guardado para " + filas.length + " animal(es).");
  };
  H.acc.editarDieta = function (el) {
    var d = H.fila("Dieta", el.getAttribute("data-id")); if (!d) return;
    function f(k, et, t, u) { return '<div class="campo"><label class="et" for="ed_' + k + '">' + et + "</label>" + (u ? '<div class="unidad-in">' : "") + '<input id="ed_' + k + '" ' + (t === "num" ? 'inputmode="decimal" data-num="1"' : 'type="' + (t || "text") + '"') + ' value="' + esc(d[k] === null || d[k] === undefined ? "" : String(d[k]).replace(".", ",")) + '">' + (u ? "<span>" + u + "</span></div>" : "") + "</div>"; }
    H.modal({ titulo: "Modificar registro de dieta", cuerpo: '<div class="rejilla dos">' + f("Hora", "Hora", "time") + f("Ofrecido_g", "Ofrecido", "num", "g") + f("Sobrante_g", "Sobrante", "num", "g") + f("Temperatura_C", "Temperatura", "num", "°C") + f("Humedad_pct", "Humedad", "num", "%") + f("Responsable", "Responsable") + '<div class="campo span2"><label class="et" for="ed_Observaciones">Observaciones</label><input id="ed_Observaciones" value="' + esc(d.Observaciones || "") + '"></div></div>' +
      (H.requiereValidacion("Dieta") ? '<p class="muy-tenue">El cambio queda pendiente de validación por un administrador.</p>' : ""),
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="edOk">Guardar</button>',
      alAbrir: function (dl) { dl.querySelector("#edOk").addEventListener("click", function () {
        var o = { ID: d.ID }; ["Hora", "Responsable", "Observaciones"].forEach(function (k) { o[k] = dl.querySelector("#ed_" + k).value.trim(); }); ["Ofrecido_g", "Sobrante_g", "Temperatura_C", "Humedad_pct"].forEach(function (k) { o[k] = C.num(dl.querySelector("#ed_" + k).value); });
        o.Consumido_g = o.Ofrecido_g !== null && o.Sobrante_g !== null ? o.Ofrecido_g - o.Sobrante_g : null; H.guardar("Dieta", [o]); dl.close(); H.toast("Registro modificado."); }); } });
  };

  // ============================================================== QR (administradores): acceso rápido y PDF de instrucciones
  function obtenerClave() { if (H._qrClave) return Promise.resolve(H._qrClave); return H.api("webDietaQRClave").then(function (r) { H._qrClave = r.clave; return r.clave; }); }
  function qrObj(url) { var q = window.qrcode(0, "M"); q.addData(url); q.make(); return q; }
  H.acc.qrDietaRapido = function () {
    obtenerClave().then(function (k) {
      var url = H.urlQR(k), svg = ""; try { svg = qrObj(url).createSvgTag({ cellSize: 5, margin: 4, scalable: true }); } catch (e) { svg = ""; }
      H.modal({ titulo: "QR de alimentación para los celadores", cuerpo: '<div class="qr-rapido"><div class="qr-img">' + svg + '</div><div><p>Quien escanee el código abre <b>solo</b> la pantalla de registro de tomas, sin usuario ni contraseña.</p><p class="muy-tenue qr-url">' + esc(url) + "</p></div></div>",
        pie: '<a class="bt" href="' + esc(url) + '" target="_blank" rel="noopener">' + ico("external-link") + 'Abrir la pantalla</a><span class="empuja"></span><button class="bt pri" data-act="qrPDF">' + ico("file-text") + "Descargar PDF con instrucciones</button>" });
    }).catch(function (e) { H.toast(e.message || "No se ha podido obtener el código QR.", "error"); });
  };
  H.acc.qrPDF = function () { obtenerClave().then(function (k) { var url = H.urlQR(k), pdf = H.pdfInstruccionesQR(url); H.descargarBytes("HOME_QR_alimentacion.pdf", pdf, "application/pdf"); H.toast("PDF descargado: imprímelo y ponlo junto a los corrales."); }).catch(function (e) { H.toast(e.message, "error"); }); };
  H.descargarBytes = function (nombre, bytes, tipo) { var b = new Blob([bytes], { type: tipo }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  // PDF mínimo (A4, Helvetica, WinAnsi) con el QR dibujado en vectorial y las instrucciones básicas
  H.pdfInstruccionesQR = function (url) {
    var q = qrObj(url), n = q.getModuleCount(), W = 595.28, Hh = 841.89, lado = 230, cel = lado / n, x0 = (W - lado) / 2, y0 = Hh - 120 - lado, cmd = [];
    function txt(s) { return "(" + String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)") + ")"; }
    function linea(s, x, y, tam, negrita, gris) { cmd.push("BT /" + (negrita ? "F2" : "F1") + " " + tam + " Tf " + (gris ? "0.35 g " : "0 g ") + x.toFixed(2) + " " + y.toFixed(2) + " Td " + txt(s) + " Tj ET"); }
    function parrafo(s, x, y, tam, ancho, negrita) { var palabras = String(s).split(" "), l = "", lineas = [], max = Math.floor(ancho / (tam * 0.5)); palabras.forEach(function (w) { if ((l + " " + w).trim().length > max) { lineas.push(l.trim()); l = w; } else l += " " + w; }); if (l.trim()) lineas.push(l.trim()); lineas.forEach(function (li, i) { linea(li, x, y - i * tam * 1.3, tam, negrita); }); return y - lineas.length * tam * 1.3; }
    cmd.push("0.06 0.46 0.43 rg 0 " + (Hh - 70).toFixed(2) + " " + W.toFixed(2) + " 70 re f"); cmd.push("1 1 1 rg");
    cmd.push("BT /F2 22 Tf 1 g 40 " + (Hh - 44).toFixed(2) + " Td " + txt("HOME · Registro de la alimentación") + " Tj ET");
    cmd.push("BT /F1 11 Tf 1 g 40 " + (Hh - 61).toFixed(2) + " Td " + txt("Para el personal del estabulario (celadores) · escanea el código con la cámara del móvil") + " Tj ET");
    cmd.push("0 g"); for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) cmd.push((x0 + c * cel).toFixed(2) + " " + (y0 + (n - 1 - r) * cel).toFixed(2) + " " + (cel + 0.05).toFixed(2) + " " + (cel + 0.05).toFixed(2) + " re");
    cmd.push("f");
    var y = y0 - 34, pasos = [
      "Escanea el código con la cámara del móvil. Se abre la pantalla de alimentación: no hace falta usuario ni contraseña.",
      "La primera vez escribe tu nombre (el móvil lo recuerda). La fecha y la hora se ponen solas al abrir el código.",
      "Comprueba que está marcada la toma correcta: 1ª toma por la mañana, 2ª toma por la tarde.",
      "Lee el recuadro de la pauta. «Pauta sin cambios»: pon la misma cantidad que ayer. «Cambio de pauta»: sigue lo que indica.",
      "Cada animal se identifica por su crotal. Anota los gramos de pienso que pones y, si queda pienso de la toma anterior, pésalo y anota el sobrante.",
      "Marca si hay agua limpia y juguetes en el corral y anota una sola vez la temperatura y la humedad de la sala.",
      "Pulsa «Guardar». Si algún dato no se puede rellenar, déjalo en blanco: se puede completar más tarde.",
      "Si te equivocas en un dato ya guardado, avisa a un investigador: solo el equipo puede corregirlo."];
    linea("Cómo registrar cada toma", 40, y, 14, true); y -= 22;
    pasos.forEach(function (p, i) { linea(String(i + 1) + ".", 40, y, 11, true); y = parrafo(p, 58, y, 11, W - 98) - 6; });
    y -= 6; y = parrafo("Día de llegada: los animales están juntos y no hay pauta de comida; solo hay que comprobar el agua y los juguetes. Fuera de los días de aclimatación, la pantalla indica la fecha del próximo procedimiento.", 40, y, 10, W - 80);
    linea("Grupo de Investigación Traslacional e Innovación en Cirugía (GITIC) · Hospital Universitario La Paz/IdiPAZ", 40, 40, 8, false, true);
    linea(url.length > 110 ? url.slice(0, 107) + "..." : url, 40, 28, 7, false, true);
    var cont = cmd.join("\n"), enc = function (s) { var out = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) { var ch = s.charCodeAt(i); out[i] = ch === 0x2013 ? 0x96 : ch === 0x2014 ? 0x97 : ch === 0x201C ? 0x93 : ch === 0x201D ? 0x94 : ch === 0xAB ? 0xAB : ch === 0xBB ? 0xBB : ch < 256 ? ch : 0x3F; } return out; };
    var objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W + " " + Hh + "] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>", "<< /Length " + enc(cont).length + " >>\nstream\n" + cont + "\nendstream"];
    var pdf = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n", xref = [];
    objs.forEach(function (o, i) { xref.push(enc(pdf).length); pdf += (i + 1) + " 0 obj\n" + o + "\nendobj\n"; });
    var inicioXref = enc(pdf).length; pdf += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + xref.map(function (x) { return ("0000000000" + x).slice(-10) + " 00000 n \n"; }).join("") + "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + inicioXref + "\n%%EOF\n";
    return enc(pdf);
  };
  var qrSec = H.seccionesExtra.qr;
  H.seccionesExtra.qr = function () { var h = qrSec(); return h.replace('<button class="bt pri" data-act="imprimir">', '<button class="bt pri" data-act="qrPDF">' + ico("file-text") + 'Descargar PDF con instrucciones</button><button class="bt" data-act="imprimir">'); };

  // ============================================================== PANTALLA QR (celadores, sin sesión)
  var QR = { k: "", datos: null, toma: null, error: "", abierto: null };
  H.pantallaQR = function () {
    var q = H.ruta().q; QR.k = q.k || ""; QR.datos = null; QR.error = ""; QR.abierto = new Date(); pintarQR();
    H.llamarPublico("webDietaQR", [QR.k]).then(function (r) { if (r && r.ok === false) throw new Error(r.mensaje || "Código QR no válido."); QR.datos = r; if (!QR.toma) QR.toma = QR.abierto.getHours() < 14 ? "1ª toma" : "2ª toma"; pintarQR(); })
      .catch(function (e) { QR.error = e.message || "No se ha podido conectar. Comprueba la conexión y vuelve a escanear el código."; pintarQR(); });
  };
  function regDe(animal, fecha, toma) { return ((QR.datos || {}).registros || []).filter(function (r) { return r.Animal === animal && String(r.Fecha).slice(0, 10) === fecha && r.Toma === toma && !si(r.Borrado); })[0]; }
  function lleno(v) { return v !== null && v !== undefined && v !== ""; }
  function pintarQR() {
    var d = QR.datos, cuerpo;
    if (QR.error) cuerpo = '<div class="aviso al">' + ico("circle-alert") + "<div>" + esc(QR.error) + '</div></div><button class="bt" id="qrRe">' + ico("refresh-cw") + "Reintentar</button>";
    else if (!d) cuerpo = '<p class="tenue">Cargando…</p>';
    else if (!d.activo) cuerpo = '<div class="aviso info">' + ico("calendar-days") + "<div><b>Ahora no hay ningún procedimiento en curso</b>, así que no hay que registrar tomas.<br>" + (d.proximo ? "El próximo procedimiento previsto es el <b>" + esc(dma(d.proximo.fecha)) + "</b> (" + (d.proximo.confirmado ? "<b>confirmado</b>" : "<b>pendiente de confirmar</b>") + ")." : "Todavía no hay ninguna fecha prevista.") + "</div></div>";
    else {
      var cfgD = H.mezclar(C.DEF.dieta, d.dieta || {}), ll = d.experimento.Fecha_llegada || C.sumarDias(d.experimento.Fecha_cirugia, -C.DEF.programacion.dias_llegada_antes), ac = C.diaAclimatacion(ll, d.hoy, cfgD) || { dia: d.dia, patron: (d.dia || 2) >= 2 };
      var an = (d.animales || []).slice().sort(function (a, b) { return String(a.Crotal || a.ID).localeCompare(String(b.Crotal || b.ID)); }), r0 = an.length ? racion(an[0], cfgD) : null, pt = pautaDia(ac, d.experimento, cfgD, r0 ? r0.g : null);
      cuerpo = '<div class="qr-cab"><b>' + esc(d.experimento.ID) + "</b> · día " + ac.dia + ' de aclimatación<span class="muy-tenue">Registro de las <b>' + esc(H.hora(QR.abierto)) + "</b> del " + esc(dma(d.hoy)) + " (hora en que abriste el código)</span></div>" +
        '<div class="pauta ' + pt.tipo + '">' + ico(pt.tipo === "igual" ? "circle-check" : "triangle-alert") + "<span>" + esc(pt.texto) + "</span></div>";
      cuerpo += H.qrNombreHTML ? H.qrNombreHTML(cfgD) : '<div class="campo"><label class="et" for="qrNombre">Tu nombre</label><input id="qrNombre" autocomplete="name" value="' + esc(localStorage.getItem("home_qr_nombre") || "") + '" placeholder="Nombre y apellido…"></div>';   // v0.7: lista de responsables
      if (ac.patron) {
        cuerpo += '<div class="segmentado qr-toma ancho-total" role="tablist" aria-label="Toma">' + ["1ª toma", "2ª toma"].map(function (t) { return '<button role="tab" class="' + (QR.toma === t ? "activo" : "") + '" aria-selected="' + (QR.toma === t) + '" data-qtoma="' + t + '">' + t + "</button>"; }).join("") + "</div>" +
          an.map(function (a, i) {
            var rc = racion(a, cfgD), r = regDe(a.ID, d.hoy, QR.toma), dis = function (k) { return r && lleno(r[k]) ? " disabled" : ""; }, val = function (k, def) { return r && lleno(r[k]) ? r[k] : def; };
            return '<section class="tarjeta qr-animal" data-animal="' + esc(a.ID) + '"><div class="cabecera"><h2>' + esc(nombreAnimal(a, i)) + '</h2>' + (r ? '<span class="chip ok">' + ico("check", "s") + "Registrada " + esc(r.Hora || "") + "</span>" : "") + "</div>" +
              '<div class="qr-racion"><span class="et">Pienso que hay que poner</span><span class="v">' + (rc ? rc.g + " g" : "—") + "</span>" + (rc ? "" : '<span class="muy-tenue">Falta el peso del animal: pregunta al equipo.</span>') + "</div>" +
              '<div class="rejilla dos"><div class="campo"><label class="et">Pienso puesto (g)</label><input inputmode="numeric" data-num="1" name="Ofrecido_g" value="' + esc(val("Ofrecido_g", rc ? rc.g : "")) + '"' + dis("Ofrecido_g") + "></div>" +
              '<div class="campo"><label class="et">Sobrante de la toma anterior (g)</label><input inputmode="numeric" data-num="1" name="Sobrante_prev" placeholder="0 si no quedaba nada"></div></div>' +
              '<div class="campo"><label class="et">Observaciones</label><input name="Observaciones" autocomplete="off" placeholder="No come, diarrea, cojera…" value="' + esc(val("Observaciones", "")) + '"' + dis("Observaciones") + "></div></section>";
          }).join("");
      }
      var rc0 = an.length ? regDe(an[0].ID, d.hoy, ac.patron ? QR.toma : "Control") : null, disC = function (k) { return rc0 && lleno(rc0[k]) ? " disabled" : ""; };
      cuerpo += '<section class="tarjeta qr-sala"><div class="cabecera"><h2>Sala y corral</h2><span class="muy-tenue">Una vez para los dos animales</span></div><div class="fila-flex checks"><label class="check"><input type="checkbox" id="qrAgua"' + (!rc0 || si(rc0.Agua_ok) ? " checked" : "") + "> Agua limpia y disponible</label><label class=\"check\"><input type=\"checkbox\" id=\"qrJug\"" + (!rc0 || si(rc0.Enriquecimiento_ok) ? " checked" : "") + "> Juguetes en el corral</label></div>" +
        '<div class="rejilla dos"><div class="campo"><label class="et" for="qrT">Temperatura de la sala (°C)</label><input id="qrT" inputmode="decimal" data-num="1" value="' + esc(rc0 && lleno(rc0.Temperatura_C) ? String(rc0.Temperatura_C).replace(".", ",") : "") + '"' + disC("Temperatura_C") + '></div><div class="campo"><label class="et" for="qrHR">Humedad (%)</label><input id="qrHR" inputmode="decimal" data-num="1" value="' + esc(rc0 && lleno(rc0.Humedad_pct) ? rc0.Humedad_pct : "") + '"' + disC("Humedad_pct") + "></div></div></section>" +
        '<p class="muy-tenue">Los datos ya guardados aparecen bloqueados: si hay que corregirlos, avisa a un investigador. Lo que falte se puede completar después.</p>' +
        '<div class="msg-error" id="qrErr" role="alert"></div><button class="bt pri grande ancho-total" id="qrOk">' + ico("save") + (ac.patron ? "Guardar la " + esc(QR.toma) : "Guardar la comprobación") + "</button>";
    }
    document.body.innerHTML = '<div id="toasts" class="toasts" aria-live="polite"></div><main class="acceso qr"><div class="caja ancha">' + H.marcaAccesoHTML() + '<h1 class="centro">Alimentación de los animales</h1>' + cuerpo +
      '<p class="pie">Grupo de Investigación Traslacional e Innovación en Cirugía (GITIC)<br>Hospital Universitario La Paz/IdiPAZ</p></div></main>';
    H.cargarIconos();
    if (H.$("#qrRe")) H.$("#qrRe").addEventListener("click", H.pantallaQR);
    H.$$("[data-qtoma]").forEach(function (b) { b.addEventListener("click", function () { QR.toma = b.getAttribute("data-qtoma"); pintarQR(); }); });
    if (H.$("#qrOk")) H.$("#qrOk").addEventListener("click", guardarQR);
  }
  function guardarQR() {
    var d = QR.datos, err = H.$("#qrErr"), bt = H.$("#qrOk"), nom = H.$("#qrNombre"), nombre = nom ? nom.value.trim() : (localStorage.getItem("home_qr_nombre") || ""), hora = H.hora(QR.abierto), T = C.num(H.$("#qrT").value), HR = C.num(H.$("#qrHR").value);
    var cfgD = H.mezclar(C.DEF.dieta, d.dieta || {}), ll = d.experimento.Fecha_llegada || C.sumarDias(d.experimento.Fecha_cirugia, -C.DEF.programacion.dias_llegada_antes), ac = C.diaAclimatacion(ll, d.hoy, cfgD) || { patron: true };
    if (nombre.length < 2) { err.textContent = "Escribe tu nombre para saber quién ha registrado la toma."; if (nom) nom.focus(); return; }
    localStorage.setItem("home_qr_nombre", nombre);
    var toma = ac.patron ? QR.toma : "Control", ids = (d.animales || []).map(function (a) { return a.ID; }), por = {}, previas = [], prevToma = QR.toma === "2ª toma" ? { f: d.hoy, t: "1ª toma" } : { f: C.sumarDias(d.hoy, -1), t: "2ª toma" };
    H.$$(".qr-animal").forEach(function (sec) {
      var a = sec.getAttribute("data-animal"), g = function (n) { return sec.querySelector("[name=" + n + "]"); }, o = {};
      if (!g("Ofrecido_g").disabled) o.Ofrecido_g = C.num(g("Ofrecido_g").value); if (!g("Observaciones").disabled && g("Observaciones").value.trim()) o.Observaciones = g("Observaciones").value.trim(); por[a] = o;
      var sob = C.num(g("Sobrante_prev").value), rp = regDe(a, prevToma.f, prevToma.t);
      if (sob !== null && rp && !lleno(rp.Sobrante_g)) previas.push({ Animal: a, Fecha: prevToma.f, Toma: prevToma.t, Sobrante_g: sob, Consumido_g: C.num(rp.Ofrecido_g) !== null ? C.num(rp.Ofrecido_g) - sob : null, Responsable: rp.Responsable || nombre });
    });
    var r = { Animales: ids, Fecha: d.hoy, Toma: toma, Hora: hora, Responsable: nombre, Agua_ok: H.$("#qrAgua").checked, Enriquecimiento_ok: H.$("#qrJug").checked, Por_animal: por };
    if (T !== null && !H.$("#qrT").disabled) r.Temperatura_C = T; if (HR !== null && !H.$("#qrHR").disabled) r.Humedad_pct = HR;
    bt.disabled = true; bt.classList.add("cargando-bt"); err.textContent = "";
    var p = H.llamarPublico("webDietaQRRegistrar", [QR.k, r]).then(function (res) { if (res && res.ok === false) throw new Error(res.mensaje || "No se ha podido guardar."); });
    previas.forEach(function (x) { p = p.then(function () { return H.llamarPublico("webDietaQRRegistrar", [QR.k, x]).catch(function () { }); }); });
    p.then(function () { return H.llamarPublico("webDietaQR", [QR.k]); }).then(function (rr) { QR.datos = rr; pintarQR(); H.toast("Guardado. ¡Gracias!"); })
      .catch(function (e) { bt.disabled = false; bt.classList.remove("cargando-bt"); err.textContent = e.message || "No se ha podido guardar. Comprueba la conexión."; });
  }

  // ============================================================== CIRUGÍA: donante de hígado, donante de sangre y receptor
  var FA = function () { return H.usarForm; };
  function leer(d, k) { return H.leerRuta(d, k); }
  function hora(k, et, d) { return '<div class="campo"><label class="et" for="h_' + k.replace(/\W/g, "_") + '">' + esc(et) + '</label><div class="con-ahora"><input id="h_' + k.replace(/\W/g, "_") + '" type="time" value="' + esc(leer(d, k) || "") + '" data-k="' + esc(k) + '" data-cambio="campoForm"' + (H.puede("registrar") ? "" : " disabled") + '>' + (H.puede("registrar") ? '<button type="button" class="bt mini" data-act="ahora" data-k="' + esc(k) + '">Ahora</button>' : "") + "</div></div>"; }
  H.acc.ahora = function (el) { var i = H.$('input[data-k="' + el.getAttribute("data-k") + '"]'); if (!i) return; i.value = H.hora(new Date()); i.dispatchEvent(new Event("change", { bubbles: true })); H.toast("Hora registrada: " + i.value); };
  function tablaMed(d, grupo, lista, peso) {
    var puedo = H.puede("registrar"), extra = Array.isArray(d[grupo + "_extra"]) ? d[grupo + "_extra"] : [];
    function fila(nombre, k, f, esExtra, idx) {
      var dk = f ? C.num(leer(d, k + ".dosis_mg_kg")) : null; if (f && dk === null) dk = f.dosis_mg_kg; var mg = f && f.dosis_mg !== undefined ? f.dosis_mg : (dk !== null && dk !== undefined && peso ? dk * peso : null), ml = f && mg !== null && f.conc_mg_mL ? mg / f.conc_mg_mL : null;
      return "<tr><td>" + (esExtra ? '<input aria-label="Fármaco" value="' + esc(nombre || "") + '" data-k="' + k + '.f" data-cambio="campoForm" placeholder="Fármaco…"' + (puedo ? "" : " disabled") + ">" : "<b>" + esc(nombre) + "</b>" + (f && f.conc_mg_mL ? '<div class="muy-tenue">' + H.n(f.conc_mg_mL, 2) + " mg/mL</div>" : "")) + "</td>" +
        '<td class="num">' + (f && f.dosis_mg !== undefined ? H.n(f.dosis_mg, 1) + " mg" : f ? '<span class="con-u"><input inputmode="decimal" data-num="1" aria-label="Dosis de ' + esc(nombre) + ' en mg/kg" value="' + (dk === null || dk === undefined ? "" : dk) + '" data-k="' + k + '.dosis_mg_kg" data-cambio="campoForm"' + (puedo ? "" : " disabled") + "> mg/kg</span>" : "—") + "</td>" +
        '<td class="num">' + (mg !== null ? H.n(mg, 1) + " mg" + (ml !== null ? '<div class="muy-tenue">' + H.n(ml, 2) + " mL</div>" : "") : "—") + "</td>" +
        '<td><input aria-label="Cantidad administrada" value="' + esc(leer(d, k + ".admin") || "") + '" data-k="' + k + '.admin" data-cambio="campoForm" placeholder="' + (ml !== null ? H.n(ml, 2) + " mL…" : "mg o mL…") + '" autocomplete="off"' + (puedo ? "" : " disabled") + "></td>" +
        '<td><div class="con-ahora"><input type="time" aria-label="Hora" value="' + esc(leer(d, k + ".hora") || "") + '" data-k="' + k + '.hora" data-cambio="campoForm"' + (puedo ? "" : " disabled") + ">" + (puedo ? '<button type="button" class="bt mini" data-act="ahora" data-k="' + k + '.hora">Ahora</button>' : "") + "</div></td>" +
        (esExtra && puedo ? '<td><button class="bt ico-solo texto" data-act="quitarMed" data-g="' + grupo + '" data-i="' + idx + '" aria-label="Quitar">' + ico("x", "s") + "</button></td>" : "<td></td>") + "</tr>";
    }
    return '<div class="tabla-env"><table class="t tabla-med"><thead><tr><th>Fármaco</th><th class="num">Dosis pautada</th><th class="num">Dosis calculada</th><th>Cantidad administrada</th><th>Hora</th><th></th></tr></thead><tbody>' +
      lista.map(function (f) { return fila(f.f, grupo + "." + f.f.replace(/\W/g, ""), f, false); }).join("") + extra.map(function (x, i) { return fila(x.f, grupo + "_extra." + i, null, true, i); }).join("") + "</tbody></table></div>" +
      (puedo ? '<button class="bt mini" data-act="anadirMed" data-g="' + grupo + '">' + ico("plus", "s") + "Añadir medicación</button>" : "");
  }
  H.acc.anadirMed = function (el) { var g = el.getAttribute("data-g"), d = H.formEnUso(); if (!d) return; d[g + "_extra"] = Array.isArray(d[g + "_extra"]) ? d[g + "_extra"] : []; d[g + "_extra"].push({ f: "", admin: "", hora: "" }); H.guardarFormEnUso(); H.repintar(); };
  H.acc.quitarMed = function (el) { var g = el.getAttribute("data-g"), i = +el.getAttribute("data-i"), d = H.formEnUso(); if (!d || !Array.isArray(d[g + "_extra"])) return; d[g + "_extra"].splice(i, 1); H.guardarFormEnUso(); H.repintar(); };
  function asistentes(d) {
    var per = H.filas("Personal").filter(function (p) { return p.Activo !== false && p.Activo !== "FALSE"; }), sel = d.asistentes || {}, puedo = H.puede("registrar");
    return '<div class="asistentes">' + (H.CAT_ASIST || []).map(function (c) {
      var lista = per.filter(function (p) { return p.Categoria === c[1]; }), ids = sel[c[0]] || [];
      return '<div class="campo"><span class="et">' + esc(c[1]) + '</span><div class="fila-flex">' + (lista.length ? lista.map(function (p) { var on = ids.indexOf(p.ID) !== -1; return '<button class="chip-sel' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-act="asistente" data-cat="' + c[0] + '" data-id="' + esc(p.ID) + '"' + (puedo ? "" : " disabled") + ">" + (on ? ico("check", "s") : "") + esc(p.Nombre) + "</button>"; }).join("") : '<span class="muy-tenue">Nadie en esta categoría</span>') + "</div></div>";
    }).join("") + "</div>";
  }
  function morfometria(d, pref) {
    var pm = C.pesoMorfometrico(leer(d, pref + "HGH"), leer(d, pref + "OBL"));
    return '<section class="tarjeta"><div class="cabecera"><h3>Morfometría</h3><button class="bt mini" data-act="infoMorfo">' + ico("info", "s") + "Cómo medir</button>" + (pm ? '<span class="chip info">Peso estimado: ' + H.n(pm, 1) + " kg</span>" : "") + '</div><div class="rejilla cuatro">' +
      C.MORFO.map(function (m) { return H.campo(pref + m.id, m.nombre + " (" + m.sigla + ")", leer(d, pref + m.id), { tipo: "number", u: "cm" }); }).join("") + '</div><p class="muy-tenue">Estas medidas se guardan para futuras predicciones (peso, tamaño del injerto…).</p></section>';
  }
  H.morfoSVG = function () {
    var col = { OBL: "#0f766e", NL: "#2563eb", BL1: "#7c3aed", HSLD: "#c2410c", HHIP: "#b45309", HGH: "#be185d", MGH: "#0e7490", PGH: "#4d7c0f" };
    function et(x, y, t, c, anc) { return '<g class="mf-et"><rect x="' + (x - (anc === "end" ? 40 : anc === "start" ? 0 : 20)) + '" y="' + (y - 12) + '" width="40" height="17" rx="8" fill="' + c + '"/><text x="' + (x + (anc === "end" ? -20 : anc === "start" ? 20 : 0)) + '" y="' + (y + 1) + '" text-anchor="middle">' + t + "</text></g>"; }
    var cuerpo = '<path class="mf-cuerpo" d="M172,120 C205,92 305,88 405,94 C470,98 512,108 524,140 C534,176 520,210 492,220 L484,221 L482,290 L460,290 L457,224 L252,224 L249,290 L227,290 L224,220 C198,214 180,204 172,190 Z"/>' +
      '<path class="mf-cuerpo" d="M176,122 C150,116 118,128 94,148 C74,160 58,168 52,182 C50,194 62,200 78,196 C112,192 142,202 178,192 Z"/><ellipse class="mf-hocico" cx="53" cy="186" rx="6" ry="10"/><path class="mf-cuerpo" d="M152,121 L138,90 L172,113 Z"/><circle cx="112" cy="160" r="3.2" fill="#24323a"/>' +
      '<path class="mf-cola" d="M524,128 c13,-7 20,4 11,12 c-9,8 -2,17 9,10"/><line class="mf-suelo" x1="20" x2="620" y1="291" y2="291"/>';
    var m = '<path d="M168,98 C260,64 430,66 522,108" stroke="' + col.OBL + '" class="mf-l"/>' + et(345, 62, "OBL", col.OBL) +
      '<path d="M168,108 L236,96" stroke="' + col.NL + '" class="mf-l"/>' + et(196, 88, "NL", col.NL) +
      '<path d="M522,128 L222,152" stroke="' + col.BL1 + '" class="mf-l"/>' + et(372, 128, "BL1", col.BL1) +
      '<path d="M238,290 L238,94" stroke="' + col.HSLD + '" class="mf-l"/>' + et(242, 268, "HSLD", col.HSLD, "start") +
      '<path d="M470,290 L470,100" stroke="' + col.HHIP + '" class="mf-l"/>' + et(466, 268, "HHIP", col.HHIP, "end") +
      [["HGH", 262], ["MGH", 352], ["PGH", 440]].map(function (x) { return '<ellipse cx="' + x[1] + '" cy="158" rx="11" ry="64" stroke="' + col[x[0]] + '" class="mf-anillo"/>' + et(x[1], 240, x[0], col[x[0]]); }).join("");
    return '<svg class="morfo-svg" viewBox="0 0 640 310" role="img" aria-label="Esquema de las medidas morfométricas del cerdo">' + cuerpo + m + "</svg>";
  };
  H.acc.infoMorfo = function () {
    H.modal({ titulo: "Cómo tomar las medidas", ancho: true, cuerpo: H.morfoSVG() + '<ol class="lista-morfo">' + C.MORFO.map(function (m) { return "<li><b>" + esc(m.sigla) + " · " + esc(m.nombre) + "</b><span>" + esc(m.como) + "</span></li>"; }).join("") + "</ol>" +
      '<p class="muy-tenue">Mide con cinta métrica flexible y el animal de pie, tranquilo y con la cabeza en posición natural. Longitudes y alturas en línea recta; perímetros ajustando la cinta sin apretar. Anota en centímetros.</p>' });
  };
  H.tabsExp.cirugia = function (e, sub) {
    var tx = C.tipoProc(e) === "trasplante", rol = sub[0] === "BD" ? "BD" : sub[0] === "LR" && tx ? "LR" : "LD", an = H.animales(e.ID), idq = encodeURIComponent(e.ID), nn = String(e.ID).replace("HOME-", "");
    var seg = '<div class="segmentado" role="tablist">' + [["LD", "Donante de hígado"], ["BD", "Donante de sangre"]].concat(tx ? [["LR", "Receptor"]] : []).map(function (x) { return '<button role="tab" class="' + (rol === x[0] ? "activo" : "") + '" aria-selected="' + (rol === x[0]) + '" data-act="irSub" data-r="exp/' + idq + "/cirugia/" + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>";
    if (rol === "LR") return seg + receptor(e, nn);
    var a = an[rol]; if (!a) return seg + '<div class="vacio">Falta el animal ' + rol + ".</div>";
    var d = H.usarForm(e.ID, "cirugia", a.ID), peso = C.num(d.peso_kg) || C.num(a.Peso_llegada_kg), ev = H.eventos(e.ID), tt = C.tiempos(ev);
    H.formActivo(function (el) { var k = el.getAttribute("data-k"); if (k === "peso_kg" || /^premed\./.test(k) || /^morfo\./.test(k)) H.retrasar("rep", 900, H.repintar); if (k === "peso_higado_g") H.guardar("Experimentos", [{ ID: e.ID, Peso_higado_inicial_g: C.num(el.value) }], { sinRepintar: true }); });
    var c = H.campo, html = seg + '<div class="fila-flex sep"><p class="tenue">' + (rol === "LD" ? "Datos generales → morfometría → premedicación → anestesia y cirugía (muestra basal antes de empezar) → hemodinámica → extracción del injerto." : "Solo hace falta si con el donante de hígado no se llega a " + H.n(S.cfg.general.volumen_sangre_mL || 2200, 0) + " mL de sangre.") + '</p><span id="indGuardado" class="guardado">' + ico("check", "s") + "Guardado automático</span></div>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Datos generales</h3></div><div class="rejilla cuatro">' + c("fecha", "Fecha del procedimiento", d.fecha || e.Fecha_cirugia || H.aFechaLocal(new Date()), { tipo: "date" }) +
      '<div class="campo"><label class="et">Identificación</label><input value="' + esc(a.ID + (a.Crotal ? " · crotal " + a.Crotal : "")) + '" disabled></div>' + c("peso_kg", "Peso pre-cirugía", d.peso_kg, { tipo: "number", u: "kg" }) + c("ayuno_h", "Horas de ayuno", d.ayuno_h, { tipo: "number", u: "h" }) + "</div></section>";
    html += morfometria(d, "morfo.");
    html += '<section class="tarjeta"><div class="cabecera"><h3>Premedicación</h3><span class="muy-tenue">Dosis con ' + (peso ? H.n(peso, 1) + " kg" : "el peso (pendiente)") + "</span></div>" + tablaMed(d, "premed", S.cfg.premedicacion, peso) + "</section>";
    if (rol === "BD") {
      html += '<section class="tarjeta"><div class="cabecera"><h3>Medicación</h3></div>' + tablaMed(d, "med", [{ f: "Heparina", dosis_mg_kg: S.cfg.heparina_donante_mg_kg, conc_mg_mL: 50 }], peso) + "</section>";
      html += '<section class="tarjeta"><div class="cabecera"><h3>Extracción de sangre y eutanasia</h3></div>' + (H.sangreHTML ? H.sangreHTML(e) : "") + '<div class="rejilla cuatro">' + c("ext.metodo", "Método de extracción", leer(d, "ext.metodo") || "Sistema de HDF (Aquarius)", { tipo: "select", opciones: ["Sistema de HDF (Aquarius)", "Bolsas CPDA-1"] }) + hora("ext.inicio", "Inicio de la extracción", d) + hora("ext.fin", "Fin de la extracción", d) +
        c("ext.volumen_mL", "Volumen extraído", leer(d, "ext.volumen_mL"), { tipo: "number", u: "mL" }) + hora("ext.hora_eutanasia", "Hora de la eutanasia", d) + "</div></section>";
    } else {
      html += '<section class="tarjeta"><div class="cabecera"><h3>Anestesia y datos de la cirugía</h3></div><div class="rejilla cuatro">' + hora("qx.intubacion", "Intubación", d) + hora("qx.inicio", "Inicio de la cirugía", d) + c("qx.temp_C", "Temperatura del quirófano", leer(d, "qx.temp_C"), { tipo: "number", u: "°C" }) + c("qx.humedad", "Humedad", leer(d, "qx.humedad"), { tipo: "number", u: "%" }) + "</div>" +
        tablaMed(d, "med", [{ f: "Tiopental" }, { f: "Fentanilo" }, { f: "Cefoxitina" }, { f: "Heparina", dosis_mg_kg: S.cfg.heparina_donante_mg_kg, conc_mg_mL: 50 }, { f: "Cisatracurio" }], peso) + (H.basalHTML ? H.basalHTML(e, d).replace("/seguimiento/pre\"", "/seguimiento/pre/gas\"") : "") + "</section>";
      html += '<section class="tarjeta"><div class="cabecera"><h3>Hemodinámica in vivo</h3></div><div class="rejilla cinco">' + c("hemo.Q_VP", "Flujo vena porta", leer(d, "hemo.Q_VP"), { tipo: "number", u: "mL/min" }) + c("hemo.Q_AH", "Flujo arteria hepática", leer(d, "hemo.Q_AH"), { tipo: "number", u: "mL/min" }) + c("hemo.PAM", "Presión arterial media", leer(d, "hemo.PAM"), { tipo: "number", u: "mmHg" }) + c("hemo.FC", "Frecuencia cardíaca", leer(d, "hemo.FC"), { tipo: "number", u: "lpm" }) + c("hemo.Temp", "Temperatura corporal", leer(d, "hemo.Temp"), { tipo: "number", u: "°C" }) + "</div></section>";
      html += '<section class="tarjeta"><div class="cabecera"><h3>Exanguinación y extracción del injerto</h3><a class="bt pri" href="#/exp/' + idq + '/quirofano">' + ico("timer") + "Cronómetro de quirófano</a></div>" +
        '<div class="kpis cuatro">' + [["Inicio de la exanguinación", ev.inicio_exanguinacion], ["Parada cardíaca", ev.parada_cardiaca], ["Preservación en frío", ev.inicio_preservacion_fria]].map(function (x) { return '<div class="kpi"><div class="et">' + x[0] + '</div><div class="v pequeno">' + (x[1] ? esc(H.horaS(x[1])) : "—") + "</div></div>"; }).join("") + '<div class="kpi"><div class="et">Isquemia caliente</div><div class="v pequeno">' + C.duracionTxt(tt.isquemia_caliente_min) + "</div></div></div>" + (H.sangreHTML ? H.sangreHTML(e) : "") +
        '<div class="rejilla cuatro">' + c("ext.volumen_mL", "Sangre extraída (HDF)", leer(d, "ext.volumen_mL"), { tipo: "number", u: "mL" }) + c("ext.solucion", "Solución de preservación", leer(d, "ext.solucion") || "IGL-1", {}) + c("ext.volumen_preservacion_mL", "Volumen de preservación", leer(d, "ext.volumen_preservacion_mL"), { tipo: "number", u: "mL" }) + c("peso_higado_g", "Peso del hígado tras la extracción", d.peso_higado_g || e.Peso_higado_inicial_g, { tipo: "number", u: "g" }) + "</div></section>";
    }
    html += '<section class="tarjeta"><div class="cabecera"><h3>Asistentes en la cirugía</h3>' + (H.puede("registrar") ? '<button class="bt mini" data-act="nuevaPersona">' + ico("plus", "s") + "Añadir persona</button>" : "") + "</div>" + asistentes(d) + "</section>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Observaciones e incidencias</h3></div><div class="rejilla dos">' + c("obs", "Observaciones e incidencias", d.obs, { tipo: "textarea", ancho: true }) + c("reportado", "Reportado por", d.reportado || (S.usuario || {}).nombre, {}) + "</div></section>";
    return html;
  };
  function receptor(e, nn) {
    var d = H.usarForm(e.ID, "receptor", "LR"), c = H.campo, peso = C.num(d.peso_kg); H.formActivo(function (el) { var k = el.getAttribute("data-k"); if (k === "peso_kg" || /^morfo\./.test(k)) H.retrasar("rep", 900, H.repintar); });
    var html = '<div class="fila-flex sep"><p class="tenue">Hoja «Seguimiento quirúrgico y post-quirúrgico del receptor». El seguimiento post-trasplante (muestras, medicación y evaluación funcional) está en Seguimiento → Post-trasplante.</p><span id="indGuardado" class="guardado">' + ico("check", "s") + "Guardado automático</span></div>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Información general</h3></div><div class="rejilla cuatro"><div class="campo"><label class="et">Identificación</label><input value="HOME-LR-' + esc(nn) + '" disabled></div>' + c("fecha", "Fecha del procedimiento", d.fecha || e.Fecha_trasplante || "", { tipo: "date" }) + c("peso_kg", "Peso pre-cirugía", d.peso_kg, { tipo: "number", u: "kg" }) + c("sexo", "Sexo", d.sexo, { tipo: "select", opciones: [["H", "Hembra"], ["M", "Macho"]] }) + c("crotal", "Crotal", d.crotal, {}) + "</div></section>";
    html += morfometria(d, "morfo.");
    html += '<section class="tarjeta"><div class="cabecera"><h3>Premedicación</h3></div>' + tablaMed(d, "premed", [{ f: "Ketamina", dosis_mg_kg: 12, conc_mg_mL: 100 }, { f: "Xilacina", conc_mg_mL: 20 }, { f: "Midazolam", dosis_mg_kg: 0.5, conc_mg_mL: 5 }], peso) + "</section>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Datos de la cirugía · inicio</h3></div><div class="rejilla cuatro">' + hora("qx.intubacion", "Intubación", d) + hora("qx.inicio", "Inicio de la cirugía", d) + c("qx.temp_C", "Temperatura", H.leerRuta(d, "qx.temp_C"), { tipo: "number", u: "°C" }) + c("qx.humedad", "Humedad", H.leerRuta(d, "qx.humedad"), { tipo: "number", u: "%" }) + "</div></section>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Medicación</h3></div>' + tablaMed(d, "med", [], peso) + "</section>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Datos de la cirugía · final</h3></div><div class="rejilla cuatro">' + hora("qx.extubacion", "Extubación", d) + hora("qx.fin", "Fin de la cirugía", d) + c("qx.temp_fin_C", "Temperatura", H.leerRuta(d, "qx.temp_fin_C"), { tipo: "number", u: "°C" }) + c("qx.humedad_fin", "Humedad", H.leerRuta(d, "qx.humedad_fin"), { tipo: "number", u: "%" }) + "</div></section>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Asistentes en la cirugía</h3>' + (H.puede("registrar") ? '<button class="bt mini" data-act="nuevaPersona">' + ico("plus", "s") + "Añadir persona</button>" : "") + "</div>" + asistentes(d) + "</section>";
    html += '<section class="tarjeta"><div class="cabecera"><h3>Incidencias</h3></div><div class="rejilla dos">' + c("obs", "Incidencias", d.obs, { tipo: "textarea", ancho: true }) + c("reportado", "Reportado por", d.reportado || (S.usuario || {}).nombre, {}) + "</div></section>";
    return html;
  }

  // ============================================================== PREPARACIÓN: solo el checklist de material
  var prepOrig = H.tabsExp.preparacion;
  function sinSub(h) { return h.replace(/^<div class="segmentado"[\s\S]*?<\/div>/, ""); }
  H.tabsExp.preparacion = function (e) { return sinSub(prepOrig(e, ["material"])); };
  H.calculosPerfusato = function (e) { return sinSub(prepOrig(e, ["calculos"])); };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v05c.js"] = "0.7.0";
