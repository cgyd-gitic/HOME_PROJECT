/* HOME v0.3 (B) · inventario: tipo y vía de suministro, lista de farmacia, pedidos a proveedores (solo administradores) y recuento. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  H.TIPOS_MAT = ["Fungible", "Inventariable", "Fármaco", "Reactivo"];
  H.VIAS_MAT = ["", "Farmacia", "Contrato menor", "Licitación", "Otro"];
  function activos() { return H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }); }
  function aReponer(m) { if (m.Tipo === "Inventariable") return 0; return Math.max(0, (C.num(m.Stock_minimo) || 0) + (C.num(m.Por_perfusion) || 0) - H.stockDe(m)); }
  function lineas(p) { var l = p && p.Lineas_JSON; if (!l) return []; if (Array.isArray(l)) return l; try { var x = JSON.parse(l); return Array.isArray(x) ? x : []; } catch (e) { return []; } }
  H.lineasPedido = lineas;
  H.chipsMat = function (m) {
    var c = ""; if (m.Tipo && m.Tipo !== "Fungible") c += ' <span class="chip' + (m.Tipo === "Inventariable" ? " info" : "") + '">' + esc(m.Tipo) + "</span>";
    if (m.Via) c += ' <span class="chip pri">' + esc(m.Via) + "</span>";
    if (m.Expediente) { var uc = C.num(m.Unidades_contrato), up = C.num(m.Unidades_pedidas) || 0; c += ' <span class="chip' + (uc !== null && up >= uc ? " al" : "") + '" title="Unidades pedidas / adjudicadas">' + esc(m.Expediente) + (uc !== null ? " · " + H.n(up, 0) + "/" + H.n(uc, 0) : "") + "</span>"; }
    return c;
  };
  H.tabsInv = function () {
    var t = [["farmacia", "Farmacia", "pill"]];
    if (H.esAdmin()) { var nb = H.filas("Pedidos").filter(function (p) { return p.Estado === "Borrador"; }).length; t.push(["pedidos", "Pedidos" + (nb ? " (" + nb + ")" : ""), "mail"], ["recuento", "Recuento", "clipboard-check"]); }
    return t;
  };
  H.invExtra = {};

  // ============================================================== FARMACIA DEL HOSPITAL (lista descargable)
  var FARM = {};
  function filasFarmacia() { return activos().filter(function (m) { return m.Via === "Farmacia"; }).sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); }).map(function (m) { var r = aReponer(m); return { m: m, stock: H.stockDe(m), rep: r, cant: FARM[m.ID] !== undefined ? FARM[m.ID] : r }; }); }
  H.invExtra.farmacia = function () {
    var l = filasFarmacia(), pp = H.proximaPerfusion ? H.proximaPerfusion() : null;
    if (!l.length) return '<div class="vacio">' + ico("pill", "l") + "<p>Ningún material tiene «Farmacia» como vía de suministro.</p><p class=\"tenue\">" + (H.esAdmin() ? "Edita cada fármaco o solución en la pestaña Stock y elige «Farmacia» en «Vía de suministro»." : "Lo configura un administrador en la ficha de cada material.") + "</p></div>";
    return '<section class="tarjeta imprimible"><div class="cabecera"><h2>Pedido a la farmacia del hospital</h2><span class="muy-tenue">GITIC · proyecto HOME · ' + esc(H.fechaDMA(new Date())) + (pp ? " · próximo procedimiento " + esc(H.fechaDMA(pp.fecha)) : "") + "</span></div>" +
      '<p class="tenue no-imprimir">La cantidad propuesta es lo que falta para tener el mínimo más lo que consume una perfusión. Ajústala si hace falta y descarga la lista.</p>' +
      '<div class="tabla-env"><table class="t"><thead><tr><th>Fármaco o solución</th><th>Referencia</th><th class="num">Stock</th><th class="num">Mínimo</th><th class="num">Por perfusión</th><th class="num">Cantidad a pedir</th><th>Unidad</th></tr></thead><tbody>' +
      l.map(function (x) { var m = x.m; return "<tr><td><b>" + esc(m.Nombre) + '</b></td><td class="muy-tenue">' + esc(m.Referencia || "") + '</td><td class="num">' + H.n(x.stock, 1) + '</td><td class="num">' + H.n(m.Stock_minimo, 1) + '</td><td class="num">' + H.n(m.Por_perfusion, 1) + '</td><td class="num"><input style="width:90px" inputmode="decimal" data-num="1" aria-label="Cantidad a pedir de ' + esc(m.Nombre) + '" value="' + esc(String(x.cant).replace(".", ",")) + '" data-cambio="farmCant" data-id="' + esc(m.ID) + '"></td><td>' + esc(m.Unidad || "") + "</td></tr>"; }).join("") +
      '</tbody></table></div><div class="fila-flex no-imprimir" style="margin-top:10px"><button class="bt pri" data-act="farmExcel">' + ico("file-spreadsheet") + 'Descargar Excel</button><button class="bt" data-act="imprimir">' + ico("printer") + 'Imprimir o guardar como PDF</button><button class="bt texto" data-act="farmUna">Poner lo que consume una perfusión</button><button class="bt texto" data-act="farmRep">Volver a lo que falta</button></div></section>';
  };
  H.acc.farmCant = function (el) { var n = C.num(el.value); FARM[el.getAttribute("data-id")] = n === null || n < 0 ? 0 : n; };
  H.acc.farmUna = function () { activos().forEach(function (m) { if (m.Via === "Farmacia") FARM[m.ID] = C.num(m.Por_perfusion) || 0; }); H.repintar(); };
  H.acc.farmRep = function () { FARM = {}; H.repintar(); };
  H.acc.farmExcel = function () {
    var l = filasFarmacia().filter(function (x) { return x.cant > 0; }); if (!l.length) { H.toast("No hay ninguna cantidad mayor que 0.", "error"); return; }
    var aoa = [["Pedido a la farmacia del hospital · GITIC · proyecto HOME"], ["Fecha", H.fechaDMA(new Date())], [], ["Fármaco o solución", "Referencia", "Cantidad", "Unidad", "Stock actual", "Stock mínimo", "Consumo por perfusión"]].concat(l.map(function (x) { return [x.m.Nombre, x.m.Referencia || "", x.cant, x.m.Unidad || "", x.stock, C.num(x.m.Stock_minimo), C.num(x.m.Por_perfusion)]; }));
    H.xlsx().then(function (X) { var wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws["!cols"] = [{ wch: 44 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }]; X.utils.book_append_sheet(wb, ws, "Farmacia"); X.writeFile(wb, "Farmacia_HOME_" + C.diaISO(new Date()) + ".xlsx"); })
      .catch(function () { H.descargar("Farmacia_HOME_" + C.diaISO(new Date()) + ".csv", H.csv(aoa), "text/csv"); });
  };

  // ============================================================== PEDIDOS A PROVEEDORES (solo administradores)
  function cfgPed() { return S.cfg.pedidos || C.DEF.pedidos; }
  function asuntoDe(p) { return String(p.Asunto || cfgPed().asunto || "Pedido · expediente {expediente}").replace("{expediente}", p.Expediente || "—").replace("{proveedor}", p.Proveedor || ""); }
  H.invExtra.pedidos = function () {
    if (!H.esAdmin()) return '<div class="aviso al">' + ico("circle-alert") + "<div>Los pedidos solo los ven los administradores.</div></div>";
    var l = H.filas("Pedidos").slice().sort(function (a, b) { return String(b.Fecha || "").localeCompare(String(a.Fecha || "")); }), orden = ["Borrador", "Enviado", "Recibido", "Cancelado"];
    var exps = {}; activos().forEach(function (m) { if (!m.Expediente) return; var k = m.Expediente; (exps[k] = exps[k] || { via: m.Via, prov: m.Proveedor, mats: [] }).mats.push(m); });
    var sinCorreo = activos().filter(function (m) { return /^(Contrato menor|Licitación)$/.test(m.Via || "") && !m.Email_proveedor; }).length;
    var html = '<div class="fila-flex" style="margin-bottom:12px"><button class="bt pri" data-act="pedGenerar">' + ico("refresh-cw") + 'Generar pedidos según lo que falta</button><button class="bt" data-act="pedManual">' + ico("plus") + 'Pedido manual</button><span class="muy-tenue">Los pedidos se preparan solos 14 días antes y 7 días después de cada procedimiento; aquí se revisan y se envían al proveedor.</span></div>' +
      (sinCorreo ? '<div class="aviso aj">' + ico("triangle-alert") + "<div>" + sinCorreo + " material(es) de contrato menor o licitación no tienen el correo del proveedor: sus pedidos no se podrán enviar hasta indicarlo en la ficha del material.</div></div>" : "");
    if (Object.keys(exps).length) html += '<details class="plegable"><summary>Expedientes y unidades disponibles</summary><div class="dentro"><div class="tabla-env"><table class="t"><thead><tr><th>Expediente</th><th>Vía</th><th>Material</th><th class="num">Adjudicadas</th><th class="num">Pedidas</th><th class="num">Quedan</th></tr></thead><tbody>' +
      Object.keys(exps).sort().map(function (k) { return exps[k].mats.map(function (m) { var uc = C.num(m.Unidades_contrato), up = C.num(m.Unidades_pedidas) || 0; return "<tr><td>" + esc(k) + "</td><td>" + esc(m.Via || "") + "</td><td>" + esc(m.Nombre) + '</td><td class="num">' + H.n(uc, 0) + '</td><td class="num">' + H.n(up, 0) + '</td><td class="num">' + (uc !== null ? '<span class="' + (uc - up <= 0 ? "v-alto" : "") + '">' + H.n(uc - up, 0) + "</span>" : "—") + "</td></tr>"; }).join(""); }).join("") + "</tbody></table></div></div></details>";
    if (!l.length) return html + '<div class="vacio">' + ico("mail", "l") + "<p>No hay pedidos.</p><p class=\"tenue\">Se generan para los materiales con vía «Contrato menor» o «Licitación» que estén por debajo de «mínimo + consumo de una perfusión».</p></div>";
    orden.forEach(function (est) {
      var g = l.filter(function (p) { return (p.Estado || "Borrador") === est; }); if (!g.length) return;
      html += '<h3 class="sub">' + ({ Borrador: "Para revisar y enviar", Enviado: "Enviados, pendientes de recibir", Recibido: "Recibidos", Cancelado: "Cancelados" })[est] + " (" + g.length + ")</h3>" + g.map(function (p) {
        var ls = lineas(p), id = esc(p.ID), borr = est === "Borrador";
        return '<section class="tarjeta pedido"><div class="cabecera"><h2>' + id + " · " + esc(p.Proveedor || "Proveedor sin indicar") + '</h2><span class="chip pri">' + esc(p.Via || "") + "</span>" + (p.Expediente ? '<span class="chip">Expediente ' + esc(p.Expediente) + "</span>" : "") + (p.Origen === "auto" ? '<span class="chip info">Automático</span>' : "") +
          (p.Experimento ? '<span class="chip">' + esc(p.Experimento) + "</span>" : "") + '</div><p class="muy-tenue">' + esc(H.fechaDMA(p.Fecha)) + " · " + (p.Email_proveedor ? esc(p.Email_proveedor) : '<span class="v-alto">sin correo del proveedor</span>') + (p.Enviado_en ? " · enviado el " + esc(H.fechaHora(p.Enviado_en)) + " por " + esc(p.Enviado_por || "") : "") + (p.Recibido_en ? " · recibido el " + esc(H.fechaDMA(p.Recibido_en)) : "") + "</p>" +
          '<div class="tabla-env"><table class="t"><thead><tr><th>Material</th><th>Referencia</th><th class="num">Cantidad</th><th>Unidad</th></tr></thead><tbody>' + ls.map(function (x, i) { return "<tr><td>" + esc(x.Nombre || x.Material) + '</td><td class="muy-tenue">' + esc(x.Referencia || "") + '</td><td class="num">' + (borr ? '<input style="width:90px" inputmode="decimal" data-num="1" aria-label="Cantidad de ' + esc(x.Nombre || "") + '" value="' + esc(String(x.Cantidad).replace(".", ",")) + '" data-cambio="pedLinea" data-id="' + id + '" data-i="' + i + '">' : "<b>" + H.n(x.Cantidad, 1) + "</b>") + "</td><td>" + esc(x.Unidad || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
          '<div class="fila-flex" style="margin-top:10px">' + (borr ? '<button class="bt pri" data-act="pedEnviar" data-id="' + id + '">' + ico("send") + 'Revisar y enviar al proveedor</button><button class="bt texto" data-act="pedCancelar" data-id="' + id + '">Descartar</button>' : est === "Enviado" ? '<button class="bt pri" data-act="pedRecibir" data-id="' + id + '">' + ico("package") + "Marcar como recibido y sumar al stock</button>" : "") + "</div></section>";
      }).join("");
    });
    return html;
  };
  function trasPedido(r) { if (r && r.pedido) H.upsertLocal("Pedidos", [r.pedido]); if (r && r.pedidos) H.upsertLocal("Pedidos", r.pedidos); if (r && r.movimientos) H.upsertLocal("Movimientos", r.movimientos); H.guardarCache(); H.pintarMarco(); H.repintar(); if (H.sondear) H.sondear(); }
  H.acc.pedGenerar = function (el) { el.disabled = true; H.api("webPedidosGenerar").then(function (r) { el.disabled = false; trasPedido(r); H.toast(r && r.n ? r.n + " pedido(s) preparados para revisar." : "No hace falta pedir nada: el stock cubre el mínimo y la próxima perfusión."); }).catch(function (e) { el.disabled = false; H.toast(e.message, "error"); }); };
  H.acc.pedLinea = function (el) { var p = H.fila("Pedidos", el.getAttribute("data-id")), ls = lineas(p), n = C.num(el.value); if (!p || n === null || n < 0) { H.toast("Cantidad no válida.", "error"); return; } ls[Number(el.getAttribute("data-i"))].Cantidad = n; H.guardar("Pedidos", [{ ID: p.ID, Lineas_JSON: JSON.stringify(ls.filter(function (x) { return x.Cantidad > 0; })) }], { sinRepintar: true }); };
  H.acc.pedCancelar = function (el) { var id = el.getAttribute("data-id"); H.confirmar("Descartar el pedido", "El pedido " + id + " quedará cancelado. Si sigue faltando material se volverá a proponer.", "Descartar", true).then(function (ok) { if (ok) H.guardar("Pedidos", [{ ID: id, Estado: "Cancelado" }]); }); };
  H.acc.pedEnviar = function (el) {
    var p = H.fila("Pedidos", el.getAttribute("data-id")), ls = lineas(p), cfg = cfgPed();
    H.modal({ titulo: "Enviar el pedido " + p.ID, ancho: true, cuerpo:
      '<div class="rejilla dos"><div class="campo"><label class="et" for="peTo">Para (correo del proveedor)</label><input id="peTo" type="email" spellcheck="false" autocomplete="off" value="' + esc(p.Email_proveedor || "") + '"></div><div class="campo"><label class="et" for="peCc">Copia a (opcional, separados por comas)</label><input id="peCc" spellcheck="false" autocomplete="off" value="' + esc((cfg.cc || []).join(", ")) + '"></div></div>' +
      '<div class="campo"><label class="et" for="peAs">Asunto</label><input id="peAs" autocomplete="off" value="' + esc(asuntoDe(p)) + '"></div><div class="campo"><label class="et" for="peTx">Texto (antes de la tabla)</label><textarea id="peTx" rows="4">' + esc(p.Texto || cfg.texto || "Buenos días:\n\nSolicitamos el suministro del siguiente material con cargo al expediente " + (p.Expediente || "—") + ".\n\nGracias.") + "</textarea></div>" +
      '<div class="tabla-env"><table class="t"><thead><tr><th>Material</th><th>Referencia</th><th class="num">Cantidad</th><th>Unidad</th></tr></thead><tbody>' + ls.map(function (x) { return "<tr><td>" + esc(x.Nombre || x.Material) + "</td><td>" + esc(x.Referencia || "") + '</td><td class="num"><b>' + H.n(x.Cantidad, 1) + "</b></td><td>" + esc(x.Unidad || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      '<p class="muy-tenue">La respuesta del proveedor llegará a tu correo (' + esc((S.usuario || {}).email || "") + ").</p><div class=\"msg-error\" id=\"peErr\" role=\"alert\"></div>",
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="peOk">' + ico("send") + "Enviar el correo</button>",
      alAbrir: function (d) { d.querySelector("#peOk").addEventListener("click", function () {
        var to = d.querySelector("#peTo").value.trim().toLowerCase(), err = d.querySelector("#peErr"), bt = this;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { err.textContent = "Indica el correo del proveedor."; return; }
        var o = { asunto: d.querySelector("#peAs").value.trim(), texto: d.querySelector("#peTx").value, cc: d.querySelector("#peCc").value.split(/[,;\s]+/).filter(function (x) { return /@/.test(x); }) };
        bt.disabled = true; err.textContent = "";
        var antes = to !== String(p.Email_proveedor || "").toLowerCase() ? H.guardar("Pedidos", [{ ID: p.ID, Email_proveedor: to }], { sinRepintar: true }) : Promise.resolve();
        function enviar(forzar) { if (forzar) o.forzar = true; return H.api("webPedidoEnviar", p.ID, o).then(function (r) { d.close(); trasPedido(r); H.toast("Pedido " + p.ID + " enviado a " + to + "."); }); }
        Promise.resolve(antes).then(function () { return enviar(false); }).catch(function (e) {
          bt.disabled = false;
          if (/Supera las unidades/i.test(e.message || "")) H.confirmar("Supera el expediente", e.message + " ¿Enviar de todos modos?", "Enviar igualmente", true).then(function (ok) { if (ok) enviar(true).catch(function (x) { err.textContent = x.message; }); });
          else err.textContent = e.message || "No se ha podido enviar.";
        });
      }); } });
  };
  H.acc.pedRecibir = function (el) { var id = el.getAttribute("data-id"); H.confirmar("Pedido recibido", "Se registrará la entrada de todas las líneas del pedido " + id + " en el inventario.", "Registrar la entrada").then(function (ok) { if (!ok) return; H.api("webPedidoRecibir", id, {}).then(function (r) { trasPedido(r); H.toast("Pedido " + id + " recibido: stock actualizado."); }).catch(function (e) { H.toast(e.message, "error"); }); }); };
  H.acc.pedManual = function () {
    var ms = activos().filter(function (m) { return m.Tipo !== "Inventariable"; }).sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); });
    H.modal({ titulo: "Pedido manual", cuerpo: '<div class="campo"><label class="et" for="pmM">Material</label><select id="pmM">' + ms.map(function (m) { return '<option value="' + esc(m.ID) + '">' + esc(m.Nombre + (m.Expediente ? " · " + m.Expediente : "")) + "</option>"; }).join("") + '</select></div><div class="campo"><label class="et" for="pmC">Cantidad</label><input id="pmC" inputmode="decimal" data-num="1"></div>',
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="pmOk">Crear borrador</button>',
      alAbrir: function (d) { d.querySelector("#pmOk").addEventListener("click", function () {
        var m = H.fila("Material", d.querySelector("#pmM").value), c = C.num(d.querySelector("#pmC").value); if (!m || !c || c <= 0) { H.toast("Elige el material y una cantidad mayor que 0.", "error"); return; }
        var n = H.filas("Pedidos").length + 1, id = "PED-M" + H.uid().slice(-6).toUpperCase();
        H.guardar("Pedidos", [{ ID: id, Fecha: new Date().toISOString(), Via: m.Via || "Otro", Expediente: m.Expediente || "", Proveedor: m.Proveedor || "", Email_proveedor: m.Email_proveedor || "", Lineas_JSON: JSON.stringify([{ Material: m.ID, Nombre: m.Nombre, Referencia: m.Referencia || "", Cantidad: c, Unidad: m.Unidad || "" }]), Estado: "Borrador", Origen: "manual" }]); d.close(); H.toast("Borrador " + id + " creado (" + n + " pedidos)."); }); } });
  };

  // ============================================================== RECUENTO (antes y después de cada procedimiento)
  H.invExtra.recuento = function () {
    if (!H.esAdmin()) return '<div class="aviso al">' + ico("circle-alert") + "<div>El recuento lo hacen los administradores.</div></div>";
    var ms = activos().sort(function (a, b) { return String(a.Categoria || "").localeCompare(String(b.Categoria || ""), "es") || String(a.Nombre).localeCompare(String(b.Nombre), "es"); });
    var ult = H.filas("Movimientos").filter(function (x) { return x.Motivo === "Recuento"; }).sort(function (a, b) { return String(b.Fecha).localeCompare(String(a.Fecha)); })[0];
    if (!ms.length) return '<div class="vacio">' + ico("package", "l") + "<p>El catálogo de material está vacío.</p></div>";
    return '<div class="aviso info">' + ico("info") + "<div>Cuenta las unidades reales <b>el día antes</b> de cada procedimiento y <b>al terminar</b>. Escribe solo lo que no coincida: al guardar se corrige el stock con un movimiento «Recuento» y se recalculan la reposición y los pedidos." + (ult ? " Último recuento: " + esc(H.fechaDMA(ult.Fecha)) + "." : " Aún no se ha hecho ningún recuento.") + "</div></div>" +
      '<div class="tabla-env" style="max-height:65vh"><table class="t"><thead><tr><th>Material</th><th>Categoría</th><th class="num">Según la app</th><th class="num">Contado</th><th>Unidad</th></tr></thead><tbody>' +
      ms.map(function (m) { return "<tr><td><b>" + esc(m.Nombre) + "</b>" + H.chipsMat(m) + "</td><td>" + esc(m.Categoria || "") + '</td><td class="num">' + H.n(H.stockDe(m), 1) + '</td><td class="num"><input class="rec-cont" style="width:90px" inputmode="decimal" data-num="1" aria-label="Unidades contadas de ' + esc(m.Nombre) + '" data-id="' + esc(m.ID) + '" placeholder="' + esc(String(H.stockDe(m)).replace(".", ",")) + '"></td><td>' + esc(m.Unidad || "") + "</td></tr>"; }).join("") +
      '</tbody></table></div><div class="fila-flex" style="margin-top:10px"><button class="bt pri" data-act="recGuardar">' + ico("save") + "Guardar el recuento</button></div>";
  };
  H.acc.recGuardar = function () {
    var movs = [], nota = "Recuento del " + H.fechaDMA(new Date());
    H.$$(".rec-cont").forEach(function (i) { var n = C.num(i.value); if (n === null) return; var m = H.fila("Material", i.getAttribute("data-id")), dif = n - H.stockDe(m); if (Math.abs(dif) > 1e-9) movs.push({ ID: H.uid(), Material: m.ID, Fecha: new Date().toISOString(), Cantidad: C.r(dif, 3), Motivo: "Recuento", Experimento: "", Nota: nota }); });
    if (!movs.length) { H.toast("No hay diferencias que guardar."); return; }
    H.confirmar("Guardar el recuento", "Se corregirá el stock de " + movs.length + " material(es).", "Guardar").then(function (ok) { if (!ok) return; H.guardar("Movimientos", movs); H.pintarMarco(); H.toast("Recuento guardado: " + movs.length + " ajuste(s)."); });
  };
})();
