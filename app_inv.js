/* HOME · inventario, exportación/importación, configuración y cuenta. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  var CATS = ["Máquina de perfusión", "Fungible de perfusión", "HDF", "Material quirúrgico", "Fungible general", "Fármacos y soluciones"];
  function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  // ============================================================================ INVENTARIO
  H.vistas.inventario = function (p) {
    var s = p[0] || "stock", solP = H.filas("Solicitudes").filter(function (x) { return x.Estado === "Pendiente"; }).length;
    var tabs = [["stock", "Stock", "package"], ["solicitudes", "Solicitudes" + (solP ? " (" + solP + ")" : ""), "shopping-cart"], ["movimientos", "Movimientos", "history"]];
    return "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Inventario</h1>" + (H.puede("inventario") ? "<button class=\"bt\" data-act=\"importarMat\">" + ico("file-spreadsheet") + "Importar listado</button><button class=\"bt pri\" data-act=\"editarMat\">" + ico("plus") + "Nuevo material</button>" : "") +
      (H.puede("solicitar") ? "<button class=\"bt\" data-act=\"nuevaSol\">" + ico("shopping-cart") + "Solicitar material</button>" : "") + "</div>" + (H.reposicionHTML ? H.reposicionHTML() : "") + "<nav class=\"pestanas\">" + tabs.map(function (t) { return "<a href=\"#/inventario/" + t[0] + "\" class=\"" + (t[0] === s ? "activo" : "") + "\">" + ico(t[2], "s") + t[1] + "</a>"; }).join("") + "</nav>" +
      (s === "solicitudes" ? solicitudes() : s === "movimientos" ? movimientos() : stock()) + "</div>";
  };
  function stock() {
    var mats = H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }), puedo = H.puede("inventario"), admin = H.esAdmin();
    if (!mats.length) return "<div class=\"vacio\">" + ico("package", "l") + "<p>Aún no hay material en el catálogo.</p><p class=\"tenue\">Usa «Importar listado» con un Excel o CSV (descarga la <button class=\"bt texto\" data-act=\"plantillaMat\">plantilla</button>) o añade los materiales uno a uno.</p></div>";
    var cats = {}; mats.forEach(function (m) { m._stock = H.stockDe(m); (cats[m.Categoria || "Sin categoría"] = cats[m.Categoria || "Sin categoría"] || []).push(m); });
    var bajo = mats.filter(function (m) { var mn = C.num(m.Stock_minimo); return mn !== null && m._stock < mn; });
    return (bajo.length ? "<div class=\"aviso aj\">" + ico("triangle-alert") + "<div><b>" + bajo.length + " material(es) por debajo del mínimo:</b> " + esc(bajo.map(function (m) { return m.Nombre; }).join(", ")) + ". Los administradores reciben un aviso al cruzar el mínimo.</div></div>" : "") +
      Object.keys(cats).sort(function (a, b) { return (CATS.indexOf(a) + 99) % 99 - (CATS.indexOf(b) + 99) % 99; }).map(function (c) {
        return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>" + esc(c) + "</h2><span class=\"chip\">" + cats[c].length + "</span></div><div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Material</th><th>Referencia</th><th class=\"num\">Stock</th><th class=\"num\">Mínimo</th><th class=\"num\">Por perfusión</th><th class=\"num\">Perfusiones</th><th>Nivel</th><th></th></tr></thead><tbody>" +
          cats[c].sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); }).map(function (m) {
            var mn = C.num(m.Stock_minimo), pp = C.num(m.Por_perfusion), niv = m._stock <= 0 ? "al" : mn !== null && m._stock < mn ? "aj" : "", ancho = mn ? Math.min(100, m._stock / (mn * 2) * 100) : 100;
            return "<tr><td><b>" + esc(m.Nombre) + "</b>" + (m.Ubicacion ? "<div class=\"muy-tenue\">" + esc(m.Ubicacion) + "</div>" : "") + "</td><td class=\"muy-tenue\">" + esc(m.Referencia || "") + (m.Proveedor ? " · " + esc(m.Proveedor) : "") + "</td><td class=\"num\"><b>" + H.n(m._stock, 1) + "</b> " + esc(m.Unidad || "") + "</td><td class=\"num\">" + H.n(mn, 1) + "</td><td class=\"num\">" + H.n(pp, 1) + "</td>" +
              "<td class=\"num\">" + (pp ? H.n(Math.floor(m._stock / pp), 0) : "—") + "</td><td><div class=\"barra-stock " + niv + "\" title=\"" + (niv === "al" ? "Agotado" : niv ? "Bajo mínimo" : "Correcto") + "\"><i style=\"width:" + ancho + "%\"></i></div><span class=\"sr\">" + (niv === "al" ? "Agotado" : niv ? "Bajo mínimo" : "Correcto") + "</span></td>" +
              "<td><div class=\"fila-flex\" style=\"flex-wrap:nowrap\">" + (puedo ? "<button class=\"bt mini\" data-act=\"movMat\" data-id=\"" + esc(m.ID) + "\" data-s=\"1\" aria-label=\"Entrada de " + esc(m.Nombre) + "\">" + ico("plus", "s") + "</button><button class=\"bt mini\" data-act=\"movMat\" data-id=\"" + esc(m.ID) + "\" data-s=\"-1\" aria-label=\"Consumo de " + esc(m.Nombre) + "\">" + ico("minus", "s") + "</button><button class=\"bt mini\" data-act=\"editarMat\" data-id=\"" + esc(m.ID) + "\" aria-label=\"Editar " + esc(m.Nombre) + "\">" + ico("pencil", "s") + "</button>" : "") +
              (H.puede("solicitar") ? "<button class=\"bt mini\" data-act=\"nuevaSol\" data-id=\"" + esc(m.ID) + "\" aria-label=\"Solicitar " + esc(m.Nombre) + "\">" + ico("shopping-cart", "s") + "</button>" : "") + "</div></td></tr>";
          }).join("") + "</tbody></table></div></section>";
      }).join("");
  }
  H.acc.movMat = function (el) {
    var m = H.fila("Material", el.getAttribute("data-id")), sg = Number(el.getAttribute("data-s"));
    H.modal({ titulo: (sg > 0 ? "Entrada de " : "Consumo de ") + m.Nombre, cuerpo: "<div class=\"rejilla dos\"><div class=\"campo\"><label class=\"et\" for=\"mvC\">Cantidad (" + esc(m.Unidad || "unidades") + ")</label><input id=\"mvC\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" min=\"0\" inputmode=\"decimal\"></div><div class=\"campo\"><label class=\"et\" for=\"mvM\">Motivo</label><select id=\"mvM\">" +
      (sg > 0 ? "<option>Compra</option><option>Ajuste de inventario</option>" : "<option>Consumo perfusión</option><option>Caducado/roto</option><option>Ajuste de inventario</option>") + "</select></div><div class=\"campo\"><label class=\"et\" for=\"mvE\">Experimento (opcional)</label><select id=\"mvE\"><option value=\"\">—</option>" + H.listaExp().map(function (e) { return "<option>" + esc(e.ID) + "</option>"; }).join("") + "</select></div><div class=\"campo\"><label class=\"et\" for=\"mvN\">Nota</label><input id=\"mvN\" autocomplete=\"off\"></div></div><p class=\"muy-tenue\">Stock actual: " + H.n(H.stockDe(m), 1) + " " + esc(m.Unidad || "") + "</p>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"mvOk\">Registrar</button>",
      alAbrir: function (d) { d.querySelector("#mvOk").addEventListener("click", function () { var c = C.num(d.querySelector("#mvC").value); if (!c || c <= 0) { H.toast("Indica una cantidad mayor que 0.", "error"); return; } H.guardar("Movimientos", [{ ID: H.uid(), Material: m.ID, Fecha: new Date().toISOString(), Cantidad: sg * c, Motivo: d.querySelector("#mvM").value, Experimento: d.querySelector("#mvE").value, Nota: d.querySelector("#mvN").value }]); d.close(); H.pintarMarco(); H.repintar(); }); } });
  };
  H.acc.editarMat = function (el) {
    var m = el && el.getAttribute("data-id") ? H.fila("Material", el.getAttribute("data-id")) : { ID: "MAT-" + H.uid(), Activo: true, Stock_inicial: 0 }, admin = H.esAdmin(), nuevo = !el || !el.getAttribute("data-id");
    function f(k, et, t, o) { return "<div class=\"campo\"><label class=\"et\" for=\"em_" + k + "\">" + et + "</label>" + (t === "cat" ? "<select id=\"em_" + k + "\">" + CATS.map(function (c) { return "<option" + (m[k] === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>" : "<input id=\"em_" + k + "\"" + (t ? " type=\"" + t + "\" step=\"any\"" : "") + " value=\"" + esc(m[k] === undefined || m[k] === null ? "" : m[k]) + "\" autocomplete=\"off\"" + (o && o.dis ? " disabled" : "") + ">") + (o && o.ayuda ? "<div class=\"ayuda\">" + o.ayuda + "</div>" : "") + "</div>"; }
    H.modal({ titulo: nuevo ? "Nuevo material" : "Editar " + m.Nombre, ancho: true, cuerpo: "<div class=\"rejilla dos\">" + f("Nombre", "Nombre") + f("Categoria", "Categoría", "cat") + f("Unidad", "Unidad", null) + f("Referencia", "Referencia") + f("Proveedor", "Proveedor") + f("Ubicacion", "Ubicación") +
      f("Stock_inicial", "Stock inicial", "number", { dis: !nuevo && !admin, ayuda: "El stock actual = stock inicial + entradas − consumos." }) + f("Stock_minimo", "Stock mínimo (alerta)", "number", { dis: !admin, ayuda: admin ? "" : "Lo fija un administrador." }) + f("Por_perfusion", "Cantidad por perfusión", "number", { ayuda: "Se propone en el checklist de cada perfusión." }) + f("Notas", "Notas") + "</div>" +
      (admin && !nuevo ? "<label class=\"check\"><input type=\"checkbox\" id=\"em_Activo\"" + (m.Activo === false || m.Activo === "FALSE" ? "" : " checked") + "> Activo (desmarca para retirarlo del catálogo)</label>" : ""),
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"emOk\">Guardar</button>",
      alAbrir: function (d) { d.querySelector("#emOk").addEventListener("click", function () {
        var o = { ID: m.ID }; ["Nombre", "Categoria", "Unidad", "Referencia", "Proveedor", "Ubicacion", "Notas"].forEach(function (k) { o[k] = d.querySelector("#em_" + k).value.trim(); });
        ["Stock_inicial", "Stock_minimo", "Por_perfusion"].forEach(function (k) { var i = d.querySelector("#em_" + k); if (!i.disabled) o[k] = C.num(i.value); }); var ac = d.querySelector("#em_Activo"); if (ac) o.Activo = ac.checked; else if (nuevo && admin) o.Activo = true;
        if (!o.Nombre) { H.toast("El nombre es obligatorio.", "error"); return; } H.guardar("Material", [o]); d.close(); }); } });
  };
  H.acc.plantillaMat = function () { H.descargar("Plantilla_material_HOME.csv", H.csv([["Nombre", "Categoria", "Unidad", "Stock_inicial", "Stock_minimo", "Por_perfusion", "Referencia", "Proveedor", "Ubicacion", "Notas"], ["Oxigenador de membrana larga duración", "Fungible de perfusión", "unidad", 4, 2, 2, "", "XVIVO", "Almacén A", ""], ["Filtro de hemodiafiltración", "HDF", "unidad", 6, 3, 1, "", "Nikkiso", "", ""]]), "text/csv"); };
  H.acc.importarMat = function () {
    H.modal({ titulo: "Importar listado de material", cuerpo: "<p>Excel (.xlsx) o CSV con una fila por material. Columnas reconocidas: <b>Nombre</b>, Categoria, Unidad, Stock_inicial, Stock_minimo, Por_perfusion, Referencia, Proveedor, Ubicacion, Notas. Si un nombre ya existe se actualizan sus datos (no el stock).</p>" +
      "<p><button class=\"bt texto\" data-act=\"plantillaMat\">" + ico("download", "s") + "Descargar plantilla</button></p><div class=\"campo\"><label class=\"et\" for=\"impF\">Archivo</label><input id=\"impF\" type=\"file\" accept=\".xlsx,.xls,.csv\"></div><div id=\"impPrev\"></div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"impOk\" disabled>Importar</button>",
      alAbrir: function (d) {
        var filas = [];
        d.querySelector("#impF").addEventListener("change", function () {
          var f = this.files[0]; if (!f) return; H.xlsx().then(function (X) { return f.arrayBuffer().then(function (b) { var wb = X.read(b, { type: "array" }); return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }); }); }).then(function (rows) {
            var mapa = { nombre: "Nombre", categoria: "Categoria", unidad: "Unidad", stockinicial: "Stock_inicial", stock: "Stock_inicial", stockminimo: "Stock_minimo", minimo: "Stock_minimo", porperfusion: "Por_perfusion", referencia: "Referencia", ref: "Referencia", proveedor: "Proveedor", ubicacion: "Ubicacion", notas: "Notas" };
            var exist = {}; H.filas("Material").forEach(function (m) { exist[norm(m.Nombre)] = m; });
            filas = rows.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { var c = mapa[norm(k)]; if (c) o[c] = /^(Stock_inicial|Stock_minimo|Por_perfusion)$/.test(c) ? C.num(r[k]) : String(r[k]).trim(); }); return o; }).filter(function (o) { return o.Nombre; })
              .map(function (o) { var m = exist[norm(o.Nombre)]; if (m) { o.ID = m.ID; delete o.Stock_inicial; } else { o.ID = "MAT-" + H.uid(); o.Activo = true; if (o.Stock_inicial === undefined) o.Stock_inicial = 0; } if (o.Categoria && CATS.indexOf(o.Categoria) === -1) { var c = CATS.filter(function (x) { return norm(x) === norm(o.Categoria); })[0]; if (c) o.Categoria = c; } return o; });
            var nu = filas.filter(function (o) { return o.Activo; }).length;
            d.querySelector("#impPrev").innerHTML = "<div class=\"aviso info\">" + ico("info") + "<div>" + filas.length + " materiales leídos: " + nu + " nuevos y " + (filas.length - nu) + " actualizaciones.</div></div>";
            d.querySelector("#impOk").disabled = !filas.length;
          }).catch(function (e) { d.querySelector("#impPrev").innerHTML = "<div class=\"aviso al\">" + esc(e.message) + "</div>"; });
        });
        d.querySelector("#impOk").addEventListener("click", function () { H.guardar("Material", filas); d.close(); H.toast(filas.length + " materiales importados."); });
      } });
  };
  function solicitudes() {
    var l = H.filas("Solicitudes").slice().sort(function (a, b) { return String(b.Fecha).localeCompare(String(a.Fecha)); }), admin = H.esAdmin(), est = ["Pendiente", "Aprobada", "Pedida", "Recibida", "Rechazada"];
    if (!l.length) return "<div class=\"vacio\">No hay solicitudes. Cualquier usuario puede pedir material con «Solicitar material».</div>";
    return "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fecha</th><th>Solicitante</th><th>Material</th><th class=\"num\">Cantidad</th><th>Urgencia</th><th>Motivo</th><th>Estado</th><th>Resolución</th></tr></thead><tbody>" + l.map(function (s) {
      var m = s.Material ? H.fila("Material", s.Material) : null;
      return "<tr><td>" + esc(H.fecha(s.Fecha)) + "</td><td>" + esc(s.Solicitante || "") + "</td><td>" + esc(m ? m.Nombre : s.Nombre_nuevo || "") + (m ? "" : " <span class=\"chip info\">Nuevo</span>") + "</td><td class=\"num\">" + H.n(s.Cantidad, 1) + "</td><td>" + (s.Urgencia === "Urgente" ? "<span class=\"chip al\">Urgente</span>" : "Normal") + "</td><td class=\"envolver\">" + esc(s.Motivo || "") + "</td>" +
        "<td>" + (admin ? "<label class=\"sr\" for=\"se_" + esc(s.ID) + "\">Estado</label><select id=\"se_" + esc(s.ID) + "\" data-cambio=\"estadoSol\" data-id=\"" + esc(s.ID) + "\" style=\"width:auto\">" + est.map(function (x) { return "<option" + (x === s.Estado ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>" : "<span class=\"chip " + (s.Estado === "Recibida" ? "ok" : s.Estado === "Rechazada" ? "al" : "info") + "\">" + esc(s.Estado) + "</span>") + "</td><td class=\"envolver muy-tenue\">" + esc((s.Resuelto_por || "") + (s.Nota_resolucion ? " · " + s.Nota_resolucion : "")) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  H.acc.estadoSol = function (el) {
    var s = H.fila("Solicitudes", el.getAttribute("data-id")), est = el.value;
    H.guardar("Solicitudes", [{ ID: s.ID, Estado: est, Resuelto_por: (S.usuario || {}).nombre }]);
    if (est === "Recibida" && s.Material) H.confirmar("Material recibido", "¿Registrar la entrada de " + H.n(s.Cantidad, 1) + " en el inventario?", "Registrar entrada").then(function (ok) { if (ok) { H.guardar("Movimientos", [{ ID: H.uid(), Material: s.Material, Fecha: new Date().toISOString(), Cantidad: C.num(s.Cantidad) || 0, Motivo: "Compra", Nota: "Solicitud " + s.ID }]); H.pintarMarco(); H.repintar(); } });
    if (est === "Recibida" && !s.Material && s.Nombre_nuevo) H.toast("Material nuevo recibido: añádelo al catálogo con «Nuevo material».");
  };
  H.acc.nuevaSol = function (el) {
    var mid = el && el.getAttribute("data-id"), mats = H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }).sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); });
    H.modal({ titulo: "Solicitar material", cuerpo: "<div class=\"rejilla dos\"><div class=\"campo\" style=\"grid-column:1/-1\"><label class=\"et\" for=\"sM\">Material</label><select id=\"sM\"><option value=\"\">— Material nuevo (no está en el catálogo) —</option>" + mats.map(function (m) { return "<option value=\"" + esc(m.ID) + "\"" + (m.ID === mid ? " selected" : "") + ">" + esc(m.Nombre) + " · stock " + H.n(H.stockDe(m), 1) + "</option>"; }).join("") + "</select></div>" +
      "<div class=\"campo\" id=\"sNw\"><label class=\"et\" for=\"sN\">Nombre del material nuevo</label><input id=\"sN\" autocomplete=\"off\"></div><div class=\"campo\" id=\"sCw\"><label class=\"et\" for=\"sC\">Categoría</label><select id=\"sC\">" + CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"sQ\">Cantidad</label><input id=\"sQ\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" min=\"0\"></div><div class=\"campo\"><label class=\"et\" for=\"sU\">Urgencia</label><select id=\"sU\"><option>Normal</option><option>Urgente</option></select></div>" +
      "<div class=\"campo\" style=\"grid-column:1/-1\"><label class=\"et\" for=\"sMo\">Motivo</label><input id=\"sMo\" autocomplete=\"off\" placeholder=\"Para la perfusión HOME-…, reposición, nuevo protocolo…\"></div></div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"sOk\">Enviar solicitud</button>",
      alAbrir: function (d) {
        function vis() { var n = !d.querySelector("#sM").value; d.querySelector("#sNw").classList.toggle("oculto", !n); d.querySelector("#sCw").classList.toggle("oculto", !n); } vis(); d.querySelector("#sM").addEventListener("change", vis);
        d.querySelector("#sOk").addEventListener("click", function () {
          var o = { ID: "SOL-" + H.uid(), Fecha: new Date().toISOString(), Solicitante: (S.usuario || {}).nombre || (S.usuario || {}).email, Material: d.querySelector("#sM").value, Nombre_nuevo: d.querySelector("#sN").value.trim(), Categoria: d.querySelector("#sC").value, Cantidad: C.num(d.querySelector("#sQ").value), Urgencia: d.querySelector("#sU").value, Motivo: d.querySelector("#sMo").value.trim(), Estado: "Pendiente" };
          if (!o.Material && !o.Nombre_nuevo) { H.toast("Elige un material o escribe el nombre del nuevo.", "error"); return; }
          H.guardar("Solicitudes", [o]); d.close(); H.toast("Solicitud enviada a los administradores."); H.pintarMarco(); H.ir("inventario/solicitudes");
        });
      } });
  };
  function movimientos() {
    var l = H.filas("Movimientos").slice().sort(function (a, b) { return String(b.Fecha).localeCompare(String(a.Fecha)); }).slice(0, 400);
    return l.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Fecha</th><th>Material</th><th class=\"num\">Cantidad</th><th>Motivo</th><th>Experimento</th><th>Nota</th><th>Por</th></tr></thead><tbody>" + l.map(function (x) { var m = H.fila("Material", x.Material); return "<tr><td>" + esc(H.fechaHora(x.Fecha)) + "</td><td>" + esc(m ? m.Nombre : x.Material) + "</td><td class=\"num " + (C.num(x.Cantidad) < 0 ? "" : "v-ok") + "\">" + (C.num(x.Cantidad) > 0 ? "+" : "") + H.n(x.Cantidad, 1) + "</td><td>" + esc(x.Motivo || "") + "</td><td>" + esc(x.Experimento || "") + "</td><td class=\"envolver\">" + esc(x.Nota || "") + "</td><td class=\"muy-tenue\">" + esc(x.Creado_por || "") + "</td></tr>"; }).join("") + "</tbody></table></div>" : "<div class=\"vacio\">Sin movimientos.</div>";
  }

  // ============================================================================ EXPORTAR / IMPORTAR
  var EXSEL = null;
  H.vistas.exportar = function () {
    var exps = H.listaExp(); if (!EXSEL) EXSEL = exps.map(function (e) { return e.ID; });
    return "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Exportar e importar</h1></div><div class=\"columnas\"><section class=\"tarjeta\"><div class=\"cabecera\"><h2>Perfusiones</h2><button class=\"bt mini\" data-act=\"exTodas\">Todas</button><button class=\"bt mini\" data-act=\"exNinguna\">Ninguna</button></div>" +
      "<div class=\"lista-sel\" style=\"max-height:340px\">" + exps.map(function (e) { return "<label><input type=\"checkbox\" data-cambio=\"exSel\" data-id=\"" + esc(e.ID) + "\"" + (EXSEL.indexOf(e.ID) !== -1 ? " checked" : "") + "> <span class=\"punto-color\" style=\"background:" + esc(H.colorExp(e.ID)) + "\"></span> " + esc(e.ID) + " <span class=\"muy-tenue\">" + esc(e.Estado || "") + " · " + esc(H.fecha(e.Fecha_cirugia)) + "</span></label>"; }).join("") + "</div></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Descargar</h2></div><div style=\"display:flex;flex-direction:column;gap:10px\">" +
      boton("exExcel", "file-spreadsheet", "Excel completo (.xlsx)", "Una pestaña por tabla y por tipo de muestra (formato ancho, como las hojas), variables derivadas, formato largo y diccionario de variables.") +
      boton("exR", "file-text", "CSV largo para R + script (.csv, .R)", "Una fila por medición con las covariables del experimento (sexo, pesos, isquemias). El script lee el CSV, dibuja trayectorias, ajusta un modelo mixto y prueba ritmicidad.") +
      boton("exPrism", "table", "GraphPad Prism (.xlsx)", "Una hoja por variable en formato XY: X = tiempo nominal, una columna Y por perfusión. Elige el tipo de muestra.") +
      "<div class=\"campo\" style=\"margin:0 0 0 46px;max-width:320px\"><label class=\"sr\" for=\"exPrismM\">Tipo de muestra para Prism</label><select id=\"exPrismM\">" + Object.keys(C.MUESTRAS).map(function (k) { return "<option value=\"" + k + "\">" + esc(C.MUESTRAS[k].nombre) + "</option>"; }).join("") + "</select></div>" +
      boton("exJSON", "save", "Copia de seguridad (.json)", "Todas las tablas y mediciones de las perfusiones elegidas, tal cual están en el servidor.") + "</div></section></div>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Importar perfusiones anteriores</h2></div><p class=\"tenue\">Para incorporar datos de perfusiones registradas en papel o en Excel (y usarlos en las bandas históricas y en los modelos), descarga la plantilla, rellena una pestaña por tipo de muestra (una fila por experimento y punto) y súbela. Los experimentos que no existan se crean como «Finalizado».</p>" +
      "<div class=\"fila-flex\"><button class=\"bt\" data-act=\"exPlantilla\">" + ico("download") + "Plantilla de importación</button>" + (H.puede("registrar") ? "<label class=\"bt\" for=\"impHist\">" + ico("cloud-upload") + "Subir plantilla rellena</label><input id=\"impHist\" class=\"sr\" type=\"file\" accept=\".xlsx\" data-cambio=\"impHist\">" : "") + "</div><div id=\"impRes\" aria-live=\"polite\"></div></section></div>";
  };
  function boton(act, i, t, d) { return "<div class=\"fila-flex\" style=\"flex-wrap:nowrap;align-items:flex-start\"><button class=\"bt pri\" data-act=\"" + act + "\" style=\"min-width:36px\" aria-label=\"" + esc(t) + "\">" + ico(i) + "</button><div><b>" + esc(t) + "</b><div class=\"muy-tenue\">" + esc(d) + "</div></div></div>"; }
  H.acc.exSel = function (el) { var id = el.getAttribute("data-id"), i = EXSEL.indexOf(id); if (el.checked && i === -1) EXSEL.push(id); if (!el.checked && i !== -1) EXSEL.splice(i, 1); };
  H.acc.exTodas = function () { EXSEL = H.listaExp().map(function (e) { return e.ID; }); H.repintar(); };
  H.acc.exNinguna = function () { EXSEL = []; H.repintar(); };
  function preparar() { if (!EXSEL.length) { H.toast("Elige al menos una perfusión.", "error"); return Promise.reject(new Error("vacío")); } return H.asegurarMed(EXSEL).catch(function () { }).then(function () { return EXSEL.slice().sort(function (a, b) { return a.localeCompare(b, "es", { numeric: true }); }); }); }
  function covariables(id) {
    var e = H.exp(id) || {}, an = H.animales(id), ld = an.LD || {}, bd = an.BD || {}, t = C.tiempos(H.eventos(id)), cq = H.form(id, "cirugia", ld.ID || "");
    return { Experimento: id, Fase: e.Fase || "", Protocolo: e.Protocolo || "", Estado: e.Estado || "", Fecha_cirugia: e.Fecha_cirugia || "", Inicio_perfusion: H.inicioPerf(id) || "", Fin_perfusion: e.Fin_perfusion || "",
      Sexo_LD: ld.Sexo || "", Castrado_LD: ld.Castrado || "", Peso_LD_kg: C.num(cq.peso_kg) || C.num(ld.Peso_llegada_kg), Sexo_BD: bd.Sexo || "", Peso_BD_kg: C.num(bd.Peso_llegada_kg),
      Peso_higado_inicial_g: C.num(e.Peso_higado_inicial_g), Peso_higado_final_g: C.num(e.Peso_higado_final_g), Volumen_perfusato_mL: H.Vperf(id),
      Isquemia_caliente_min: C.r(t.isquemia_caliente_min, 1), Exang_a_parada_min: C.r(t.exanguinacion_a_parada_min, 1), Isquemia_fria_min: C.r(t.isquemia_fria_min, 1), Cirugia_banco_min: C.r(t.cirugia_banco_min, 1), Duracion_perfusion_h: C.r(t.duracion_perfusion_h, 2) };
  }
  function largo(ids) {
    var out = [];
    ids.forEach(function (id) {
      var cv = covariables(id), t0 = C.aFecha(H.inicioPerf(id));
      H.med(id).forEach(function (m) { var d = C.aFecha(m.Fecha_hora), th = C.num(m.T_real_h); if (th === null && t0 && d) th = C.r((d - t0) / 36e5, 3); out.push(Object.assign({}, cv, { Muestra: m.Muestra, Punto: m.Punto, T_nominal_h: C.num(m.T_nominal_h), T_real_h: th, Fecha_hora: m.Fecha_hora || "", Hora_dia: d ? C.r(d.getHours() + d.getMinutes() / 60, 3) : null, Dia: th !== null ? Math.floor(th / 24) + 1 : null, Variable: m.Variable, Valor: C.num(m.Valor), Texto: m.Texto || "", Unidad: m.Unidad || C.variable(m.Muestra, m.Variable).unidad })); });
      // derivadas
      var e = H.exp(id), pts = {}; H.med(id).forEach(function (m) { if (m.Muestra === "FLUJO" && !pts[m.Punto]) pts[m.Punto] = m; });
      Object.keys(pts).forEach(function (p) { var o = H.derivadasFlujo(e, p), m = pts[p], d = C.aFecha(m.Fecha_hora), th = C.num(m.T_real_h); Object.keys(o).forEach(function (k) { if (o[k] === null || o[k] === undefined || !isFinite(o[k])) return; out.push(Object.assign({}, cv, { Muestra: "DERIV", Punto: p, T_nominal_h: C.num(m.T_nominal_h), T_real_h: th, Fecha_hora: m.Fecha_hora || "", Hora_dia: d ? C.r(d.getHours() + d.getMinutes() / 60, 3) : null, Dia: th !== null ? Math.floor(th / 24) + 1 : null, Variable: k, Valor: C.r(o[k], 5), Texto: "", Unidad: C.variable("DERIV", k).unidad })); }); });
    });
    return out;
  }
  function aplanar(o, pref, out) { out = out || {}; Object.keys(o || {}).forEach(function (k) { var v = o[k], n = pref ? pref + "." + k : k; if (v && typeof v === "object" && !Array.isArray(v)) aplanar(v, n, out); else out[n] = Array.isArray(v) ? v.join("; ") : v; }); return out; }
  function hojaDe(X, filas, cols) { if (!filas.length) return X.utils.aoa_to_sheet([cols || ["(sin datos)"]]); cols = cols || Object.keys(filas.reduce(function (a, f) { Object.keys(f).forEach(function (k) { a[k] = 1; }); return a; }, {})); var ws = X.utils.aoa_to_sheet([cols].concat(filas.map(function (f) { return cols.map(function (c) { var v = f[c]; return v === undefined ? null : v; }); }))); ws["!autofilter"] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: cols.length - 1 } }) }; ws["!cols"] = cols.map(function (c) { return { wch: Math.min(40, Math.max(10, String(c).length + 2)) }; }); return ws; }
  function sinMeta(f) { var o = {}; Object.keys(f).forEach(function (k) { if (!/^(Creado_|Actualizado_|Borrado$|_)/.test(k)) o[k] = f[k]; }); return o; }
  H.acc.exExcel = function () {
    preparar().then(function (ids) { return H.xlsx().then(function (X) {
      var wb = X.utils.book_new(), med = []; ids.forEach(function (id) { med = med.concat(H.med(id)); });
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Proyecto HOME / CHRONO-LIVER · exportación"], ["Generado", new Date().toISOString()], ["Por", (S.usuario || {}).email || ""], ["Perfusiones", ids.join(", ")], ["Versión de la app", H.VERSION], [], ["Las pestañas por tipo de muestra tienen una fila por experimento y punto, y una columna por variable (códigos en «Diccionario»)."], ["«Largo» tiene una fila por medición, lista para R/Python; incluye las variables derivadas (Muestra = DERIV)."]]), "Info");
      X.utils.book_append_sheet(wb, hojaDe(X, ids.map(covariables)), "Experimentos");
      X.utils.book_append_sheet(wb, hojaDe(X, H.filas("Animales").filter(function (a) { return ids.indexOf(a.Experimento) !== -1; }).map(sinMeta)), "Animales");
      X.utils.book_append_sheet(wb, hojaDe(X, H.filas("Dieta").filter(function (a) { return ids.indexOf(a.Experimento) !== -1; }).map(sinMeta)), "Dieta");
      X.utils.book_append_sheet(wb, hojaDe(X, H.filas("Eventos").filter(function (a) { return ids.indexOf(a.Experimento) !== -1; }).map(function (e) { return { Experimento: e.Experimento, Tipo: e.Tipo, Evento: H.nombreEvento(e.Tipo), Fecha_hora: e.Fecha_hora, T_h: H.inicioPerf(e.Experimento) ? C.r(C.horasEntre(H.inicioPerf(e.Experimento), e.Fecha_hora), 3) : null, Nota: e.Nota || "", Por: e.Creado_por || "" }; })), "Eventos");
      ["cirugia", "calculos", "hdf", "cierre", "checklist"].forEach(function (t) { var fs = H.filas("Formularios").filter(function (f) { return f.Tipo === t && ids.indexOf(f.Experimento) !== -1; }).map(function (f) { var d = {}; try { d = JSON.parse(f.Datos_JSON || "{}"); } catch (e) { } return Object.assign({ Experimento: f.Experimento, Animal: f.Animal || "" }, aplanar(d)); }); if (fs.length) X.utils.book_append_sheet(wb, hojaDe(X, fs), "Form_" + t); });
      Object.keys(C.MUESTRAS).forEach(function (m) { var pv = C.pivotAncho(med, m); if (pv.filas.length) X.utils.book_append_sheet(wb, hojaDe(X, pv.filas, pv.columnas), m); });
      var lg = largo(ids); X.utils.book_append_sheet(wb, hojaDe(X, lg.filter(function (r) { return r.Muestra === "DERIV"; })), "Derivadas"); X.utils.book_append_sheet(wb, hojaDe(X, lg), "Largo");
      X.utils.book_append_sheet(wb, hojaDe(X, diccionario()), "Diccionario");
      X.writeFile(wb, "HOME_export_" + H.aFechaLocal(new Date()) + ".xlsx", { compression: true });
    }); }).catch(function (e) { if (e.message !== "vacío") H.toast(e.message, "error"); });
  };
  function diccionario() { var o = []; Object.keys(C.MUESTRAS).forEach(function (m) { C.MUESTRAS[m].vars.forEach(function (v) { var ob = H.objetivo(m, v.id); o.push({ Muestra: m, Muestra_nombre: C.MUESTRAS[m].nombre, Variable: v.id, Nombre: v.nombre, Unidad: v.unidad, Grupo: v.grupo || "", Objetivo_min: ob ? ob[0] : null, Objetivo_max: ob ? ob[1] : null, Calculada: v.calculada ? "sí" : "" }); }); }); C.DERIVADAS.forEach(function (v) { o.push({ Muestra: "DERIV", Muestra_nombre: "Variables derivadas", Variable: v.id, Nombre: v.nombre, Unidad: v.unidad, Calculada: "sí" }); }); return o; }
  H.acc.exR = function () {
    preparar().then(function (ids) {
      var lg = largo(ids), cols = Object.keys(lg[0] || { Experimento: 1 }), f = "HOME_largo_" + H.aFechaLocal(new Date()) + ".csv";
      H.descargar(f, H.csv([cols].concat(lg.map(function (r) { return cols.map(function (c) { return r[c]; }); }))), "text/csv");
      setTimeout(function () { H.descargar("HOME_analisis.R", scriptR(f), "text/plain"); }, 400);
    }).catch(function (e) { if (e.message !== "vacío") H.toast(e.message, "error"); });
  };
  function scriptR(f) {
    return ["# HOME / CHRONO-LIVER · análisis de la exportación «" + f + "» (generado " + new Date().toISOString().slice(0, 10) + ")",
      "# Paquetes: install.packages(c(\"tidyverse\", \"lme4\", \"lmerTest\", \"MetaCycle\"))", "library(tidyverse)", "",
      "d <- read_csv(\"" + f + "\", show_col_types = FALSE) |>", "  mutate(across(c(Experimento, Muestra, Variable, Sexo_LD, Protocolo), as.factor))", "",
      "# 1. Trayectorias individuales (tiempo real) de una variable", "graf <- function(muestra, variable, eje = T_real_h) {", "  d |> filter(Muestra == muestra, Variable == variable, !is.na(Valor)) |>",
      "    ggplot(aes({{ eje }}, Valor, colour = Experimento)) + geom_line() + geom_point(size = 1.5) +", "    labs(x = \"Tiempo de perfusión (h)\", y = paste0(variable, \" (\", first(d$Unidad[d$Variable == variable]), \")\"), title = paste(muestra, variable)) + theme_classic()", "}",
      "graf(\"PERF\", \"Lactato\")", "graf(\"ART\", \"pO2\")", "graf(\"DERIV\", \"VO2_100g\")", "",
      "# 2. Media ± DE por punto nominal", "d |> filter(Muestra == \"PERF\", Variable == \"ALT\") |> group_by(T_nominal_h) |>", "  summarise(n = n(), media = mean(Valor, na.rm = TRUE), de = sd(Valor, na.rm = TRUE)) |> print(n = 50)", "",
      "# 3. Modelo lineal mixto (medidas repetidas): efecto del tiempo y del sexo, intercepto aleatorio por perfusión", "library(lmerTest)", "m <- lmer(log(Valor) ~ T_real_h * Sexo_LD + (1 | Experimento),", "          data = filter(d, Muestra == \"PERF\", Variable == \"Lactato\", Valor > 0))", "summary(m)", "",
      "# 4. Ritmicidad (JTK_CYCLE / Lomb-Scargle / ARSER) por perfusión a partir del día 2", "library(MetaCycle)", "dir.create(\"ritmo\", showWarnings = FALSE)",
      "for (e in levels(droplevels(d$Experimento))) {", "  x <- d |> filter(Experimento == e, Muestra == \"PERF\", T_real_h >= 24, !is.na(Valor)) |>", "    mutate(t = round(T_real_h, 1)) |> group_by(Variable, t) |> summarise(v = mean(Valor), .groups = \"drop\") |>",
      "    pivot_wider(names_from = t, values_from = v)", "  if (ncol(x) < 6) next", "  write_csv(x, file.path(\"ritmo\", paste0(e, \".csv\")))",
      "  meta2d(infile = file.path(\"ritmo\", paste0(e, \".csv\")), filestyle = \"csv\", timepoints = as.numeric(colnames(x)[-1]),", "         minper = 20, maxper = 28, cycMethod = c(\"JTK\", \"LS\"), outdir = file.path(\"ritmo\", e))", "}", ""].join("\n");
  }
  H.acc.exPrism = function () {
    var m = H.$("#exPrismM").value;
    preparar().then(function (ids) { return H.xlsx().then(function (X) {
      var wb = X.utils.book_new(), n = 0;
      C.MUESTRAS[m].vars.forEach(function (v) {
        var xs = {}, data = {}; ids.forEach(function (id) { H.serieExp(id, m, v.id, "nominal").forEach(function (p) { var k = C.r(p.x, 3); xs[k] = 1; (data[id] = data[id] || {})[k] = p.y; }); });
        var X0 = Object.keys(xs).map(Number).sort(function (a, b) { return a - b; }); if (!X0.length) return; n++;
        X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Tiempo (h)"].concat(ids)].concat(X0.map(function (x) { return [x].concat(ids.map(function (id) { return data[id] && data[id][x] !== undefined ? data[id][x] : null; })); }))), v.id.slice(0, 31));
      });
      if (!n) { H.toast("No hay datos de " + C.MUESTRAS[m].nombre + " en esas perfusiones.", "error"); return; }
      X.writeFile(wb, "HOME_Prism_" + m + "_" + H.aFechaLocal(new Date()) + ".xlsx");
    }); }).catch(function (e) { if (e.message !== "vacío") H.toast(e.message, "error"); });
  };
  H.acc.exJSON = function () { preparar().then(function (ids) { var o = { generado: new Date().toISOString(), version: H.VERSION, experimentos: ids, tablas: {}, mediciones: {} }; H.TABLAS.forEach(function (t) { o.tablas[t] = (S.t[t] || []).filter(function (f) { return !f.Experimento || ids.indexOf(f.Experimento) !== -1; }); }); delete o.tablas.Usuarios; ids.forEach(function (id) { o.mediciones[id] = H.med(id); }); H.descargar("HOME_copia_" + H.aFechaLocal(new Date()) + ".json", JSON.stringify(o, null, 1), "application/json"); }).catch(function () { }); };
  H.acc.exPlantilla = function () {
    H.xlsx().then(function (X) {
      var wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Plantilla de importación HOME"], ["Una pestaña por tipo de muestra. Una fila por experimento y punto."], ["Experimento: HOME-01, HOME-02… · Punto: etiqueta (0, 30′, 2h, D2 10:00…) · T_nominal_h: horas desde el inicio de la perfusión · Fecha_hora: opcional (aaaa-mm-dd hh:mm)."], ["Las columnas siguientes son los códigos de variable (ver «Diccionario»). Deja vacías las que no tengas. Usa punto o coma decimal."], ["Pestaña «Experimentos»: datos generales; si el experimento no existe se crea."]]), "Léeme");
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["ID", "Fase", "Protocolo", "Fecha_cirugia", "Inicio_perfusion", "Fin_perfusion", "Peso_higado_inicial_g", "Peso_higado_final_g", "Sexo_LD", "Peso_LD_kg", "Notas"], ["HOME-00", "Piloto / puesta a punto", "HOME estándar (no circadiano)", "2025-03-10", "2025-03-10 11:30", "2025-03-15 09:00", 650, 700, "H", 24.5, "Perfusión histórica"]]), "Experimentos");
      Object.keys(C.MUESTRAS).forEach(function (m) { X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Experimento", "Punto", "T_nominal_h", "Fecha_hora"].concat(C.MUESTRAS[m].vars.filter(function (v) { return !v.calculada; }).map(function (v) { return v.id; }))]), m); });
      X.utils.book_append_sheet(wb, hojaDe(X, diccionario()), "Diccionario");
      X.writeFile(wb, "Plantilla_importacion_HOME.xlsx");
    });
  };
  H.acc.impHist = function (el) {
    var f = el.files[0], res = H.$("#impRes"); if (!f) return; res.innerHTML = "<p class=\"tenue\">Leyendo…</p>";
    H.xlsx().then(function (X) { return f.arrayBuffer().then(function (b) { return X.read(b, { type: "array", cellDates: true }); }).then(function (wb) {
      var nuevos = [], meds = {}, n = 0, avisos = [];
      if (wb.Sheets.Experimentos) X.utils.sheet_to_json(wb.Sheets.Experimentos, { defval: "" }).forEach(function (r) {
        var id = String(r.ID || "").trim(); if (!id) return; var ex = H.exp(id), num = Number((id.match(/(\d+)$/) || [0, 0])[1]);
        var o = { ID: id, Numero: num, Fase: r.Fase, Protocolo: r.Protocolo, Fecha_cirugia: fechaTxt(r.Fecha_cirugia, true), Inicio_perfusion: fechaTxt(r.Inicio_perfusion), Fin_perfusion: fechaTxt(r.Fin_perfusion), Peso_higado_inicial_g: C.num(r.Peso_higado_inicial_g), Peso_higado_final_g: C.num(r.Peso_higado_final_g), Notas: r.Notas };
        if (!ex) { o.Estado = "Finalizado"; o.Color = C.PALETA[(num - 1 + 16) % C.PALETA.length]; } nuevos.push(o);
        if (r.Sexo_LD || r.Peso_LD_kg) H.guardar("Animales", [{ ID: "HOME-LD-" + String(id).replace(/^HOME-/, ""), Experimento: id, Rol: "LD", Sexo: r.Sexo_LD, Peso_llegada_kg: C.num(r.Peso_LD_kg) }], { sinRepintar: true });
      });
      if (nuevos.length) H.guardar("Experimentos", nuevos, { sinRepintar: true });
      Object.keys(C.MUESTRAS).forEach(function (m) { if (!wb.Sheets[m]) return; X.utils.sheet_to_json(wb.Sheets[m], { defval: "" }).forEach(function (r) {
        var id = String(r.Experimento || "").trim(), p = String(r.Punto || "").trim(); if (!id || !p) return; if (!H.exp(id) && !nuevos.some(function (x) { return x.ID === id; })) { avisos.push(id); return; }
        var vals = {}; C.MUESTRAS[m].vars.forEach(function (v) { if (r[v.id] !== "" && r[v.id] !== undefined) { vals[v.id] = C.num(r[v.id]) !== null ? C.num(r[v.id]) : String(r[v.id]); n++; } });
        if (Object.keys(vals).length) (meds[id] = meds[id] || []).push([m, p, C.num(r.T_nominal_h), fechaTxt(r.Fecha_hora), vals]);
      }); });
      Object.keys(meds).forEach(function (id) { S.medCargada[id] = S.medCargada[id] || !S.online; meds[id].forEach(function (x) { H.guardarMediciones(id, x[0], x[1], x[2], x[3], x[4]); }); });
      res.innerHTML = "<div class=\"aviso ok\">" + ico("circle-check") + "<div>Importadas " + n + " mediciones de " + Object.keys(meds).length + " experimento(s)" + (nuevos.length ? "; " + nuevos.length + " experimento(s) creados o actualizados" : "") + "." + (avisos.length ? " Se han ignorado filas de experimentos inexistentes: " + esc(avisos.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(", ")) + "." : "") + "</div></div>";
    }); }).catch(function (e) { res.innerHTML = "<div class=\"aviso al\">" + ico("circle-alert") + "<div>" + esc(e.message) + "</div></div>"; });
  };
  function fechaTxt(v, soloFecha) { if (!v) return ""; var d = v instanceof Date ? v : new Date(String(v).replace(" ", "T")); if (isNaN(d)) return ""; return soloFecha ? H.aFechaLocal(d) : d.toISOString(); }

  // ============================================================================ CONFIGURACIÓN (ADMIN)
  var SECC = [["usuarios", "Usuarios"], ["accesos", "Accesos"], ["personal", "Personal"], ["inicio", "Pantalla de inicio"], ["reposicion", "Reposición"], ["objetivos", "Objetivos"], ["circadiano", "Horario circadiano"], ["recalentamiento", "Recalentamiento"], ["muestreo", "Muestreo"], ["dieta", "Dieta"], ["perfusato", "Perfusato"], ["gases", "Asesor de gases"], ["o2", "Oxígeno"], ["farmacos", "Fármacos"], ["general", "General"]];
  var ETQ = { volumen_sangre_mL: "Volumen de sangre del cebado (mL)", dias_perfusion: "Días de perfusión (protocolo)", unidad_gases: "Unidad de gases por defecto", aviso_antelacion_min: "Antelación de los avisos de cambio de ritmo (min)", aviso_muestra_min: "Antelación de los avisos de muestra (min)",
    FiO2_min: "FiO₂ mínima (%)", FiO2_max: "FiO₂ máxima (%)", FiO2_paso: "Paso del mezclador de FiO₂ (%)", FiO2_cambio_max: "Cambio máximo de FiO₂ por recomendación (puntos)", Barrido_min: "Flujo de aire mínimo (mL/min)", Barrido_max: "Flujo de aire máximo (mL/min)", Barrido_paso: "Paso del flujo de aire (mL/min)", Barrido_cambio_max_pct: "Cambio máximo del flujo de aire por recomendación (%)",
    fraccion_bicarbonato: "Fracción de −BE·V a administrar de una vez", bicarbonato_pH_umbral: "Proponer bicarbonato si pH menor que", bicarbonato_BE_umbral: "… y BE menor que (mmol/L)", fraccion_potasio: "Fracción del déficit de K a administrar",
    dlogP50_dT: "Δlog P50 por °C", bohr: "Efecto Bohr (Δlog P50 / ΔpH)", metodo: "Método de estimación de sO₂ (severinghaus_p50 / hill)", multiplo: "Múltiplo del mantenimiento (ración)", tci_aviso_C: "Aviso de frío por debajo de (°C, alojamiento individual)", f_actividad_grupo: "Factor de actividad de la fórmula del grupo",
    melatonina_CL_mL_min: "Aclaramiento estimado de melatonina (mL/min)", hidrocortisona_stock_mL_75: "Actocortina 75 mg/mL en el stock (mL)", hidrocortisona_stock_vol_mL: "Volumen del stock de hidrocortisona (mL)", taurocolato_ref_mg_h: "Taurocolato de referencia publicado (mg/h)", bicarbonato_max_mmol: "Bicarbonato máximo por recomendación (mmol)", k_hb: "Capacidad de O₂ de la Hb (mL/g)", k_disuelto: "Solubilidad del O₂ (mL/dL/mmHg)", p50: "P50 porcina (mmHg)", hill_n: "Coeficiente de Hill", ventana_min: "Ventana para emparejar flujos y gasometría (min)",
    modelo: "Modelo energético", tomas: "Tomas al día", em_pienso_kcal_kg: "Energía metabolizable del pienso (kcal/kg)", nombre_pienso: "Pienso", "f_sexo.M_entero": "Factor sexo · macho entero", "f_sexo.M_castrado": "Factor sexo · macho castrado", "f_sexo.H": "Factor sexo · hembra", f_actividad: "Factor de actividad (corral)",
    f_termico_por_grado: "Incremento por °C bajo la temperatura crítica (fracción)", tci_C: "Temperatura crítica inferior (°C; vacío = NRC 17,9 − 0,0375·PV)", horas_tomas: "Horas de las tomas", ayuno_h: "Ayuno preoperatorio (h)",
    dia1_h: "Puntos del día 1 (h)", diarias: "Muestras diarias desde el día 2 (hora)", biopsia_cada_h: "Biopsia cada (h)", bilis_dia1_cada_h: "Bilis el día 1 cada (h)", flujos_cada_h_dia1: "Flujos el día 1 cada (h)", flujos_cada_h_despues: "Flujos después cada (h)", hdf_inicio_h: "Conexión de la HDF (h)", inmuno_cada_h: "Inmunología cada (h)",
    "objetivos_correccion.K": "Objetivo K⁺ (mmol/L)", "objetivos_correccion.Ca": "Objetivo Ca²⁺ (mmol/L)", "objetivos_correccion.HCO3": "Objetivo HCO₃⁻ (mmol/L)", "objetivos_correccion.Albumina": "Objetivo albúmina (g/dL)", "factores_grupo.K": "Factor del grupo K", "factores_grupo.Ca": "Factor del grupo Ca", "factores_grupo.HCO3": "Factor del grupo HCO₃",
    "conc.KCl_mEq_mL": "KCl (mEq/mL)", "conc.CaCl2_mmol_mL": "CaCl₂ (mmol/mL)", "conc.NaHCO3_mmol_mL": "NaHCO₃ (mmol/mL)", "conc.Albumina_g_mL": "Albúmina (g/mL)", heparina_U_L: "Heparina en el cebado (U/L)", heparina_U_mL_vial: "Heparina del vial (U/mL)", heparina_infusion_U_h: "Infusión de heparina (U/h)", heparina_infusion_conc_U_mL: "Concentración de la infusión (U/mL)", heparina_vial_mL: "Volumen del vial (mL)" };
  H.vistas.config = function (p) {
    if (!H.esAdmin()) return "<div class=\"aviso al\">" + ico("circle-alert") + "<div>Solo los administradores pueden cambiar la configuración.</div></div>";
    var s = p[0] || "usuarios", cuerpo = H.seccionesExtra && H.seccionesExtra[s] ? H.seccionesExtra[s]() : s === "usuarios" ? usuarios() : s === "personal" ? personal() : s === "objetivos" ? objetivos() : s === "circadiano" ? circadiano() : s === "recalentamiento" ? recal() : editorObjeto(s);
    return "<div class=\"ancho\"><div class=\"titulo-pag\"><h1>Configuración</h1></div><nav class=\"pestanas\">" + SECC.map(function (x) { return "<a href=\"#/config/" + x[0] + "\" class=\"" + (x[0] === s ? "activo" : "") + "\">" + x[1] + (x[0] === "accesos" ? (function (n) { return n ? " <span class=\"cont\">" + n + "</span>" : ""; })(H.filas("Solicitudes_Acceso").filter(function (a) { return a.Estado === "Pendiente"; }).length) : "") + "</a>"; }).join("") + "</nav>" + cuerpo + "</div>";
  };
  function guardarCfg(clave, valor) { H.guardar("Config", [{ ID: clave, Valor_JSON: JSON.stringify(valor) }], { sinRepintar: true }); H.recalcCfg(); H.toast("Configuración guardada."); }
  H.guardarCfg = guardarCfg;
  function restaurar(clave) { return "<button class=\"bt\" data-act=\"cfgRestaurar\" data-k=\"" + clave + "\">" + ico("undo-2") + "Valores por defecto</button>"; }
  H.acc.cfgRestaurar = function (el) { var k = el.getAttribute("data-k"); H.confirmar("Restaurar valores", "Se sustituirá la configuración de «" + k + "» por los valores por defecto.", "Restaurar", true).then(function (ok) { if (ok) { guardarCfg(k, C.DEF[k]); H.repintar(); } }); };
  function usuarios() {
    var l = H.filas("Usuarios");
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Usuarios con acceso</h2><button class=\"bt pri\" data-act=\"nuevoUsr\">" + ico("plus") + "Añadir usuario</button></div><p class=\"tenue\">" + H.ROLES.map(function (r) { return "<b>" + esc(r[1]) + "</b>: " + esc(r[2].charAt(0).toLowerCase() + r[2].slice(1)); }).join(". ") + ". Al añadir un usuario recibe un correo con la dirección de la web. Las solicitudes de alta están en <a href=\"#/config/accesos\">Accesos</a>.</p>" +
      "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Activo</th><th>Último acceso</th></tr></thead><tbody>" + l.map(function (u) {
        return "<tr><td>" + esc(u.Email) + "</td><td><input value=\"" + esc(u.Nombre || "") + "\" aria-label=\"Nombre de " + esc(u.Email) + "\" data-cambio=\"usrCampo\" data-id=\"" + esc(u.ID) + "\" data-k=\"Nombre\" autocomplete=\"off\"></td><td><select aria-label=\"Rol de " + esc(u.Email) + "\" data-cambio=\"usrCampo\" data-id=\"" + esc(u.ID) + "\" data-k=\"Rol\">" + H.ROLES.map(function (r) { return "<option value=\"" + r[0] + "\"" + (r[0] === H.normRol(u.Rol) ? " selected" : "") + ">" + esc(r[1]) + "</option>"; }).join("") + "</select></td>" +
          "<td><input type=\"checkbox\" aria-label=\"Activo\" data-cambio=\"usrCampo\" data-id=\"" + esc(u.ID) + "\" data-k=\"Activo\"" + (u.Activo === false || u.Activo === "FALSE" ? "" : " checked") + "></td><td class=\"muy-tenue\">" + esc(H.fechaHora(u.Ultimo_acceso)) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
  }
  H.acc.usrCampo = function (el) { var o = { ID: el.getAttribute("data-id") }; o[el.getAttribute("data-k")] = el.type === "checkbox" ? el.checked : el.value; H.guardar("Usuarios", [o], { sinRepintar: true }); };
  H.acc.nuevoUsr = function () {
    H.modal({ titulo: "Añadir usuario", cuerpo: "<div class=\"campo\"><label class=\"et\" for=\"nuE\">Correo</label><input id=\"nuE\" type=\"email\" autocomplete=\"off\" spellcheck=\"false\"></div><div class=\"campo\"><label class=\"et\" for=\"nuN\">Nombre</label><input id=\"nuN\" autocomplete=\"off\"></div><div class=\"campo\"><label class=\"et\" for=\"nuR\">Rol</label><select id=\"nuR\">" + H.ROLES.slice().reverse().map(function (r) { return "<option value=\"" + r[0] + "\">" + esc(r[1]) + "</option>"; }).join("") + "</select></div>",
      pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt pri\" id=\"nuOk\">Añadir</button>",
      alAbrir: function (d) { d.querySelector("#nuOk").addEventListener("click", function () { var em = d.querySelector("#nuE").value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { H.toast("Correo no válido.", "error"); return; } if (H.filas("Usuarios").some(function (u) { return String(u.Email).toLowerCase() === em; })) { H.toast("Ese correo ya tiene usuario.", "error"); return; } H.guardar("Usuarios", [{ ID: "USR-" + H.uid(), Email: em, Nombre: d.querySelector("#nuN").value.trim(), Rol: d.querySelector("#nuR").value, Activo: true }]); d.close(); }); } });
  };
  function personal() {
    var l = H.filas("Personal").slice().sort(function (a, b) { return String(a.Categoria + a.Nombre).localeCompare(String(b.Categoria + b.Nombre), "es"); });
    return "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Personal (asistentes a las cirugías)</h2><button class=\"bt pri\" data-act=\"nuevaPersona\">" + ico("plus") + "Añadir persona</button></div><p class=\"tenue\">Lista fija de personas que aparecen como asistentes en la hoja de cirugía, agrupadas por categoría. Desactiva en lugar de borrar para conservar el histórico de autorías.</p>" +
      (l.length ? "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th>Nombre</th><th>Categoría</th><th>Correo</th><th>Activo</th><th class=\"num\">Cirugías</th></tr></thead><tbody>" + l.map(function (p) {
        var n = H.filas("Formularios").filter(function (f) { return f.Tipo === "cirugia" && String(f.Datos_JSON || "").indexOf("\"" + p.ID + "\"") !== -1; }).length;
        return "<tr><td><input value=\"" + esc(p.Nombre) + "\" aria-label=\"Nombre\" data-cambio=\"perCampo\" data-id=\"" + esc(p.ID) + "\" data-k=\"Nombre\" autocomplete=\"off\"></td><td><select aria-label=\"Categoría\" data-cambio=\"perCampo\" data-id=\"" + esc(p.ID) + "\" data-k=\"Categoria\">" + H.CAT_ASIST.map(function (c) { return c[1]; }).concat(["Investigador/a", "Otro"]).map(function (c) { return "<option" + (c === p.Categoria ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></td>" +
          "<td><input value=\"" + esc(p.Email || "") + "\" aria-label=\"Correo\" data-cambio=\"perCampo\" data-id=\"" + esc(p.ID) + "\" data-k=\"Email\" autocomplete=\"off\" spellcheck=\"false\"></td><td><input type=\"checkbox\" aria-label=\"Activo\" data-cambio=\"perCampo\" data-id=\"" + esc(p.ID) + "\" data-k=\"Activo\"" + (p.Activo === false || p.Activo === "FALSE" ? "" : " checked") + "></td><td class=\"num\">" + n + "</td></tr>";
      }).join("") + "</tbody></table></div>" : "<div class=\"vacio\">Sin personas.</div>") + "</section>";
  }
  H.acc.perCampo = function (el) { var o = { ID: el.getAttribute("data-id") }; o[el.getAttribute("data-k")] = el.type === "checkbox" ? el.checked : el.value; H.guardar("Personal", [o], { sinRepintar: true }); };
  function objetivos() {
    var O = S.cfg.objetivos;
    return "<div class=\"aviso info\">" + ico("info") + "<div>Rangos que colorean los valores en las hojas y alimentan el asesor de gases. Los valores por defecto de las ramas arterial y portal proceden de la memoria HOME (pO₂ 10–12 kPa en AH y 5–7 kPa en VP); la memoria CHRONO-LIVER menciona 40 kPa: decide cuál aplica a cada fase. Presiones de gases en mmHg (1 kPa = 7,50 mmHg).</div></div>" +
      "<div class=\"fila-flex\" style=\"margin-bottom:10px\"><span class=\"tenue\">pO₂ arterial:</span><button class=\"bt\" data-act=\"cfgPO2\" data-a=\"75\" data-b=\"90\">HOME · 10–12 kPa</button><button class=\"bt\" data-act=\"cfgPO2\" data-a=\"100\" data-b=\"200\">NMP publicada · 100–200 mmHg</button><button class=\"bt\" data-act=\"cfgPO2\" data-a=\"270\" data-b=\"330\">Protocolo del grupo · 40 kPa</button>" + restaurar("objetivos") + "</div><div class=\"columnas tres\">" + Object.keys(O).map(function (m) {
        var nom = m === "PERF" ? "Perfusato (común)" : m === "FLUJO" ? "Presiones y temperatura" : C.MUESTRAS[m] ? C.MUESTRAS[m].nombre : m;
        return "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>" + esc(nom) + "</h3></div><table class=\"t\"><thead><tr><th>Variable</th><th class=\"num\">Mín.</th><th class=\"num\">Máx.</th></tr></thead><tbody>" + Object.keys(O[m]).map(function (v) {
          var vd = C.variable(m === "FLUJO" ? "FLUJO" : m === "PERF" ? "PERF" : m, v); return "<tr><td>" + esc(vd.nombre) + " <span class=\"muy-tenue\">" + esc(vd.unidad) + "</span></td>" + [0, 1].map(function (i) { return "<td class=\"num\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" style=\"width:80px\" aria-label=\"" + esc(vd.nombre + (i ? " máximo" : " mínimo")) + "\" value=\"" + esc(O[m][v][i]) + "\" data-cambio=\"cfgObj\" data-m=\"" + m + "\" data-v=\"" + v + "\" data-i=\"" + i + "\"></td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></section>";
      }).join("") + "</div>";
  }
  H.acc.cfgPO2 = function (el) { var O = H.copia(S.cfg.objetivos); O.ART.pO2 = [Number(el.getAttribute("data-a")), Number(el.getAttribute("data-b"))]; guardarCfg("objetivos", O); H.repintar(); };
  H.acc.cfgObj = function (el) { var O = H.copia(S.cfg.objetivos), m = el.getAttribute("data-m"), v = el.getAttribute("data-v"), i = Number(el.getAttribute("data-i")); O[m][v][i] = C.num(el.value); guardarCfg("objetivos", O); };
  function circadiano() {
    var c = S.cfg.circadiano, cambios = c.cambios.slice().sort(function (a, b) { return C.hm(a.h) - C.hm(b.h) || String(a.linea).localeCompare(String(b.linea)); }), lineas = c.lineas;
    return "<div class=\"aviso " + (c.verificado ? "ok" : "aj") + "\">" + ico(c.verificado ? "circle-check" : "triangle-alert") + "<div>" + (c.verificado ? "Horario verificado por el equipo." : "<b>Borrador.</b> Leído de la hoja «Administración circadiana pre-establecida»; la segunda página del escaneo es ilegible en parte y se completó por simetría con la memoria (bolos de hidrocortisona a las 8:00, 10:30 y 16:30; tres ciclos nutricionales; melatonina 20–23 h; nadir térmico nocturno). Revisa cada fila.") +
      " Cada fila es un <b>cambio de ritmo</b>: la línea mantiene ese ritmo hasta su siguiente cambio. Los avisos se envían " + S.cfg.general.aviso_antelacion_min + " min antes.</div></div>" +
      "<div class=\"fila-flex\" style=\"margin-bottom:10px\"><label class=\"check\"><input type=\"checkbox\" data-cambio=\"circVerif\"" + (c.verificado ? " checked" : "") + "> Horario revisado y verificado</label><button class=\"bt\" data-act=\"circFila\">" + ico("plus") + "Añadir cambio</button>" + restaurar("circadiano") + "</div>" +
      "<div class=\"columnas\"><section class=\"tarjeta\" style=\"grid-column:span 2\"><div class=\"tabla-env\" style=\"max-height:65vh\"><table class=\"t\"><thead><tr><th>Hora</th><th>Línea</th><th class=\"num\">Ritmo / valor</th><th>Unidad</th><th>Nota</th><th></th></tr></thead><tbody>" + cambios.map(function (x) {
        var i = c.cambios.indexOf(x); return "<tr><td><input type=\"time\" style=\"width:110px\" aria-label=\"Hora\" value=\"" + esc(x.h) + "\" data-cambio=\"circCampo\" data-i=\"" + i + "\" data-k=\"h\"></td><td><select aria-label=\"Línea\" data-cambio=\"circCampo\" data-i=\"" + i + "\" data-k=\"linea\">" + lineas.map(function (l) { return "<option" + (l === x.linea ? " selected" : "") + ">" + esc(l) + "</option>"; }).join("") + "</select></td>" +
          "<td class=\"num\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" style=\"width:90px\" aria-label=\"Valor\" value=\"" + esc(x.valor) + "\" data-cambio=\"circCampo\" data-i=\"" + i + "\" data-k=\"valor\"></td><td><input style=\"width:80px\" aria-label=\"Unidad\" value=\"" + esc(x.unidad) + "\" data-cambio=\"circCampo\" data-i=\"" + i + "\" data-k=\"unidad\" autocomplete=\"off\"></td><td><input aria-label=\"Nota\" value=\"" + esc(x.nota || "") + "\" data-cambio=\"circCampo\" data-i=\"" + i + "\" data-k=\"nota\" autocomplete=\"off\"></td>" +
          "<td><button class=\"bt ico-solo texto\" data-act=\"circBorrar\" data-i=\"" + i + "\" aria-label=\"Borrar fila\">" + ico("trash-2", "s") + "</button></td></tr>";
      }).join("") + "</tbody></table></div></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h3>Volumen diario por línea</h3></div><table class=\"t\"><tbody>" + lineas.map(function (l) { var v = H.volumenDiario(c, l); return v === null ? "" : "<tr><td>" + esc(l) + "</td><td class=\"num\">" + H.n(v, 1) + " mL/día</td></tr>"; }).join("") + "</tbody></table>" +
      "<div class=\"campo\" style=\"margin-top:12px\"><label class=\"et\" for=\"circLin\">Líneas (separadas por comas)</label><input id=\"circLin\" value=\"" + esc(lineas.join(", ")) + "\" data-cambio=\"circLineas\" autocomplete=\"off\"></div></section></div>";
  }
  function guardarCirc(c) { guardarCfg("circadiano", c); }
  H.acc.circCampo = function (el) { var c = H.copia(S.cfg.circadiano), i = Number(el.getAttribute("data-i")), k = el.getAttribute("data-k"); c.cambios[i][k] = k === "valor" ? C.num(el.value) : el.value; guardarCirc(c); };
  H.acc.circBorrar = function (el) { var c = H.copia(S.cfg.circadiano); c.cambios.splice(Number(el.getAttribute("data-i")), 1); guardarCirc(c); H.repintar(); };
  H.acc.circFila = function () { var c = H.copia(S.cfg.circadiano); c.cambios.push({ h: "12:00", linea: c.lineas[0], valor: 0, unidad: "mL/h", nota: "" }); guardarCirc(c); H.repintar(); };
  H.acc.circVerif = function (el) { var c = H.copia(S.cfg.circadiano); c.verificado = el.checked; guardarCirc(c); var r = H.copia(S.cfg.recalentamiento); H.repintar(); };
  H.acc.circLineas = function (el) { var c = H.copia(S.cfg.circadiano); c.lineas = el.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean); guardarCirc(c); H.repintar(); };
  function recal() {
    var r = S.cfg.recalentamiento, cols = ["Temp", "P_VP", "FiO2_POR", "Barrido_POR", "P_AH", "FiO2_ART", "Barrido_ART"];
    return "<div class=\"aviso " + (r.verificado ? "ok" : "aj") + "\">" + ico(r.verificado ? "circle-check" : "triangle-alert") + "<div>" + (r.verificado ? "Pauta verificada." : "<b>Borrador.</b> En la hoja original la presión portal y las FiO₂ están en celdas combinadas; se han repartido por bloques (portal 2 → 3 → 4 mmHg; FiO₂ arterial 21 → 30 → 40 %; FiO₂ portal 21 %). Revisa.") + "</div></div>" +
      "<div class=\"fila-flex\" style=\"margin-bottom:10px\"><label class=\"check\"><input type=\"checkbox\" data-cambio=\"recVerif\"" + (r.verificado ? " checked" : "") + "> Pauta revisada</label><div class=\"campo\" style=\"margin:0\"><label class=\"et\" for=\"recPaso\">Duración de cada paso (min)</label><input id=\"recPaso\" type=\"text\" inputmode=\"decimal\" data-num=\"1\" style=\"width:90px\" value=\"" + r.paso_min + "\" data-cambio=\"recCampo\" data-i=\"-1\" data-k=\"paso_min\"></div><button class=\"bt\" data-act=\"recFila\">" + ico("plus") + "Añadir paso</button>" + restaurar("recalentamiento") + "</div>" +
      "<div class=\"tabla-env\"><table class=\"t\"><thead><tr><th class=\"num\">Minuto</th>" + cols.map(function (k) { return "<th class=\"num\">" + esc(C.NOMBRES_RECAL[k]) + "<div class=\"muy-tenue\">" + esc(C.UNIDAD_RECAL[k]) + "</div></th>"; }).join("") + "<th></th></tr></thead><tbody>" + r.pasos.map(function (p, i) {
        return "<tr>" + ["t"].concat(cols).map(function (k) { return "<td class=\"num\"><input type=\"text\" inputmode=\"decimal\" data-num=\"1\" step=\"any\" style=\"width:76px\" aria-label=\"" + esc(k + " paso " + (i + 1)) + "\" value=\"" + esc(p[k]) + "\" data-cambio=\"recCampo\" data-i=\"" + i + "\" data-k=\"" + k + "\"></td>"; }).join("") + "<td><button class=\"bt ico-solo texto\" data-act=\"recBorrar\" data-i=\"" + i + "\" aria-label=\"Borrar paso\">" + ico("trash-2", "s") + "</button></td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  H.acc.recCampo = function (el) { var r = H.copia(S.cfg.recalentamiento), i = Number(el.getAttribute("data-i")), k = el.getAttribute("data-k"); if (i < 0) r[k] = C.num(el.value); else r.pasos[i][k] = C.num(el.value); r.pasos.sort(function (a, b) { return a.t - b.t; }); guardarCfg("recalentamiento", r); };
  H.acc.recBorrar = function (el) { var r = H.copia(S.cfg.recalentamiento); r.pasos.splice(Number(el.getAttribute("data-i")), 1); guardarCfg("recalentamiento", r); H.repintar(); };
  H.acc.recFila = function () { var r = H.copia(S.cfg.recalentamiento), u = r.pasos[r.pasos.length - 1]; var n = H.copia(u); n.t = u.t + r.paso_min; r.pasos.push(n); guardarCfg("recalentamiento", r); H.repintar(); };
  H.acc.recVerif = function (el) { var r = H.copia(S.cfg.recalentamiento); r.verificado = el.checked; guardarCfg("recalentamiento", r); };
  // editor genérico de objetos de configuración (hojas: número, texto, lista)
  function editorObjeto(clave) {
    var o = S.cfg[clave]; if (!o) return "<p>Sección desconocida.</p>";
    var hojas = []; (function rec(x, p) { Object.keys(x).forEach(function (k) { var v = x[k], n = p ? p + "." + k : k; if (v && typeof v === "object" && !Array.isArray(v)) rec(v, n); else hojas.push([n, v]); }); })(o, "");
    var intro = { dieta: "Energía metabolizable diaria = k·PV^e · factor sexo · factor actividad (· factor térmico si la temperatura del alojamiento está por debajo de la crítica). Gramos por toma = EM / energía del pienso / nº de tomas. Revisa la «Revisión científica» para la justificación de cada valor.",
      perfusato: "Parámetros de las fórmulas de corrección de la hoja «Cálculos perfusión». Los factores del grupo (0,3/0,5) se mantienen para comparar; la alternativa usa el volumen plasmático o el BE.", gases: "Límites y pasos del asesor de mezcladores. Las recomendaciones nunca superan estos cambios máximos por gasometría.", o2: "Constantes del contenido de O₂ y de la curva de disociación usada cuando el gasómetro no da sO₂.", muestreo: "Puntos de muestreo que generan las columnas de las hojas y los avisos.", general: "" }[clave] || "";
    return (intro ? "<div class=\"aviso info\">" + ico("info") + "<div>" + esc(intro) + "</div></div>" : "") + "<div class=\"fila-flex\" style=\"margin-bottom:10px\">" + restaurar(clave) + "</div><section class=\"tarjeta\"><div class=\"rejilla dos\">" + hojas.map(function (h) {
      var k = h[0], v = h[1], et = ETQ[k] || k, id = "cfg_" + k.replace(/\W/g, "_");
      if (clave === "dieta" && k === "modelo") return "<div class=\"campo\"><label class=\"et\" for=\"" + id + "\">" + esc(et) + "</label><select id=\"" + id + "\" data-cambio=\"cfgCampo\" data-c=\"" + clave + "\" data-k=\"" + k + "\">" + Object.keys(C.MODELOS_DIETA).map(function (m) { return "<option value=\"" + m + "\"" + (m === v ? " selected" : "") + ">" + esc(C.MODELOS_DIETA[m].nombre) + "</option>"; }).join("") + "</select></div>";
      if (k === "unidad_gases") return "<div class=\"campo\"><label class=\"et\" for=\"" + id + "\">" + esc(et) + "</label><select id=\"" + id + "\" data-cambio=\"cfgCampo\" data-c=\"" + clave + "\" data-k=\"" + k + "\"><option" + (v === "mmHg" ? " selected" : "") + ">mmHg</option><option" + (v === "kPa" ? " selected" : "") + ">kPa</option></select></div>";
      var esLista = Array.isArray(v), tipo = esLista || typeof v === "string" ? "text" : "number";
      return "<div class=\"campo\"><label class=\"et\" for=\"" + id + "\">" + esc(et) + "</label><input id=\"" + id + "\" type=\"text\"" + (tipo === "number" ? " inputmode=\"decimal\" data-num=\"1\"" : "") + " value=\"" + esc(esLista ? v.join(", ") : v === null ? "" : typeof v === "number" ? String(v).replace(".", ",") : v) + "\" data-cambio=\"cfgCampo\" data-c=\"" + clave + "\" data-k=\"" + k + "\" data-lista=\"" + (esLista ? (typeof v[0] === "number" ? "n" : "t") : "") + "\" autocomplete=\"off\">" + (esLista ? "<div class=\"ayuda\">Separa los valores con comas.</div>" : "") + "</div>";
    }).join("") + "</div></section>";
  }
  H.acc.cfgCampo = function (el) {
    var c = el.getAttribute("data-c"), k = el.getAttribute("data-k"), l = el.getAttribute("data-lista"), o = H.copia(S.cfg[c]), v;
    if (l) v = el.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return l === "n" ? C.num(x) : x; }); else v = el.hasAttribute("data-num") ? C.num(el.value) : el.value;
    var p = k.split("."), x = o; for (var i = 0; i < p.length - 1; i++) x = x[p[i]]; x[p[p.length - 1]] = v; guardarCfg(c, o);
  };

  // ============================================================================ CUENTA
  H.vistas.cuenta = function () {
    var u = S.usuario || {}, pa = H.pref("pushActivo"), tema = H.pref("tema") || "sistema";
    return "<div class=\"ancho\" style=\"max-width:820px\"><div class=\"titulo-pag\"><h1>Mi cuenta</h1></div>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>" + esc(u.nombre || u.email) + "</h2><span class=\"chip pri\">" + esc(u.rol) + "</span></div><p class=\"tenue\">" + esc(u.email) + (S.demo ? " · modo demostración" : "") + "</p><button class=\"bt peligro\" data-act=\"salir\">" + ico("log-out") + "Cerrar sesión</button></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Avisos en este dispositivo</h2></div>" +
      "<p class=\"tenue\">Con la app abierta, los avisos programados suenan y aparecen en pantalla. Para recibirlos con la pantalla bloqueada activa las notificaciones push (en iPhone, instala antes la web: Safari → Compartir → Añadir a pantalla de inicio).</p>" +
      "<div class=\"fila-flex\">" + (pa ? "<button class=\"bt\" data-act=\"pushOff\">" + ico("bell") + "Desactivar notificaciones</button><button class=\"bt\" data-act=\"pushTest\">" + ico("send") + "Enviar prueba</button>" : "<button class=\"bt pri\" data-act=\"pushOn\">" + ico("bell-ring") + "Activar notificaciones</button>") + "<button class=\"bt\" data-act=\"probarAlarma\">" + ico("bell") + "Probar alarma en pantalla</button></div>" +
      "<div style=\"margin-top:10px;display:flex;flex-direction:column;gap:4px\"><label class=\"check\"><input type=\"checkbox\" data-cambio=\"prefChk\" data-k=\"sinSonido\"" + (H.pref("sinSonido") ? " checked" : "") + "> Silenciar el sonido de las alarmas</label><label class=\"check\"><input type=\"checkbox\" data-cambio=\"prefChk\" data-k=\"silenciar\"" + (H.pref("silenciar") ? " checked" : "") + "> No mostrar alarmas en este dispositivo</label></div></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Preferencias</h2></div><div class=\"rejilla dos\"><div class=\"campo\"><label class=\"et\" for=\"pTema\">Tema</label><select id=\"pTema\" data-cambio=\"prefTema\">" + [["sistema", "Según el sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]].map(function (t) { return "<option value=\"" + t[0] + "\"" + (t[0] === tema ? " selected" : "") + ">" + t[1] + "</option>"; }).join("") + "</select></div>" +
      "<div class=\"campo\"><label class=\"et\" for=\"pKpa\">Unidad de pO₂ y pCO₂</label><select id=\"pKpa\" data-cambio=\"prefKpa\"><option value=\"0\"" + (H.pref("kpa") ? "" : " selected") + ">mmHg</option><option value=\"1\"" + (H.pref("kpa") ? " selected" : "") + ">kPa</option></select></div></div></section>" +
      "<section class=\"tarjeta\"><div class=\"cabecera\"><h2>Sincronización</h2></div><p>" + (S.cola.length ? S.cola.length + " cambio(s) pendientes de enviar." : "Todo enviado.") + " " + (S.online ? "Conectado." : "Sin conexión.") + "</p>" +
      (S.errores.length ? "<details class=\"plegable\"><summary>Errores recientes (" + S.errores.length + ")</summary><div class=\"dentro\"><ul>" + S.errores.slice(-10).map(function (x) { return "<li class=\"muy-tenue\">" + esc(H.fechaHora(x.t) + " · " + x.msg) + "</li>"; }).join("") + "</ul></div></details>" : "") +
      "<div class=\"fila-flex\"><button class=\"bt\" data-act=\"forzarSync\">" + ico("refresh-cw") + "Sincronizar ahora</button></div><p class=\"muy-tenue\" style=\"margin-top:8px\">HOME v" + H.VERSION + " · GITIC · Hospital Universitario La Paz / IdiPAZ</p></section></div>";
  };
  H.acc.salir = function () { H.confirmar("Cerrar sesión", S.cola.length ? "Hay " + S.cola.length + " cambio(s) sin enviar que se perderán." : "Se borrará la copia local de este dispositivo.", "Cerrar sesión", !!S.cola.length).then(function (ok) { if (ok) H.salir(); }); };
  H.acc.pushOn = function (el) { el.disabled = true; H.pushActivar().then(function () { H.toast("Notificaciones activadas en este dispositivo."); H.repintar(); }).catch(function (e) { el.disabled = false; H.toast(e.message, "error"); }); };
  H.acc.pushOff = function () { H.pushDesactivar().then(function () { H.toast("Notificaciones desactivadas."); H.repintar(); }); };
  H.acc.pushTest = function () { H.api("webPushProbar").then(function (r) { H.toast(r.mensaje || "Enviado."); }).catch(function (e) { H.toast(e.message, "error"); }); };
  H.acc.probarAlarma = function () { H.desbloquearAudio(); H.mostrarAlarma([{ ID: "prueba", Titulo: "Prueba de alarma", Texto: "Así se verán los avisos de cambio de temperatura, ritmo o muestra.", Tipo: "otro" }]); };
  H.acc.prefChk = function (el) { H.pref(el.getAttribute("data-k"), el.checked); };
  H.acc.prefTema = function (el) { H.pref("tema", el.value); H.aplicarTema(); H.repintar(); };
  H.acc.prefKpa = function (el) { H.pref("kpa", el.value === "1"); };
  H.acc.forzarSync = function () { S.online = true; H.enviarCola().then(H.sondear); H.toast("Sincronizando…"); };
})();
