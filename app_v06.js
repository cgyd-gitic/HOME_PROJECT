/* HOME · v0.6: registro histórico de perfusiones, preparación por pestañas (material quirúrgico con las cajas de instrumental,
   fungible, fármacos/reactivos/soluciones e inventariable), aviso de material sin esterilizar, dibujo realista del cerdo para la
   morfometría y catálogo de fármacos disponible en la tabla de infusiones. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  function hoyISO() { return H.aFechaLocal(new Date()); }
  function dma(v) { return H.fechaDMA ? H.fechaDMA(v) : v; }

  // ============================================================== cajas de instrumental (ofertas B. Braun 27/10/2020)
  H.CAJAS = [
    { id: "D", nombre: "Caja donante", ref: "Oferta B. Braun 27102020 · donante", items: [
      ["FB412R", "Pinza atraumática 1,5 mm · 200 mm", 3], ["BH109R", "Pinza hemostática micro-Halsted curva · 125 mm", 5], ["BD560R", "Pinza quirúrgica 1×2 dientes · 180 mm", 2],
      ["AN913R", "Pinza de tubo, boca estriada · 200 mm", 2], ["BC557R", "Tijera Mayo curva · 170 mm", 1], ["BC606R", "Tijera de ligaduras Metzenbaum curva · 180 mm", 1],
      ["BC023R", "Tijera de disección Metzenbaum fina curva · 145 mm", 1], ["BT033R", "Separador de Roux 30×30 / 36×44 mm · 165 mm", 1], ["BB084R", "Mango de bisturí n.º 4 · 135 mm", 1],
      ["FM565R", "Portaagujas micro Diadust, mango redondo · 210 mm", 1], ["BD760R", "Pinza quirúrgica Mo Ruso · 200 mm", 1], ["BJ014R", "Pinza de disección Baby-Adson · 180 mm", 1],
      ["BV610R", "Separador abdominal Balfour", 1], ["BM036R", "Portaagujas Durogrip DeBakey · 230 mm", 1], ["BM067R", "Portaagujas Durogrip Hegar-Mayo · 205 mm", 1],
      ["JK341", "Cubeta para contenedor 1/2 · altura 120 mm", 1], ["JK389", "Tapa inferior para contenedor 1/2 (plata)", 1]] },
    { id: "R", nombre: "Caja receptor", ref: "Oferta B. Braun 27102020 · receptor", soloTx: true, items: [
      ["BT032R", "Separador de Roux 26×26 / 32×36 mm · 155 mm", 2], ["FM565R", "Portaagujas micro Diadust, mango redondo · 210 mm", 1], ["FB402R", "Pinza atraumática recta, boca 2 mm · 200 mm", 2],
      ["FB404R", "Pinza atraumática recta, boca 2,0 mm · 240 mm", 1], ["BD609R", "Pinza de Treves 1×2 dientes · 150 mm", 1], ["BH109R", "Pinza hemostática micro-Halsted curva · 125 mm", 5],
      ["BH167R", "Pinza hemostática Crile curva · 160 mm", 1], ["FB568R", "Pinza Baby U-múltiple curva angulada 60° · 30/160 mm", 1], ["FB504R", "Pinza vascular DeBakey · 75/119/280 mm", 1],
      ["BD760R", "Pinza quirúrgica Mo Ruso · 200 mm", 1], ["FB510R", "Pinza vascular atraumática DeBakey 60° · 40/93/235 mm", 1], ["FB435R", "Pinza bulldog Glover atraumática curva · 40/97 mm", 1],
      ["FB353R", "Pinza bulldog DeBakey atraumática curva · 20/50 mm", 1], ["BJ014R", "Pinza de disección Baby-Adson · 180 mm", 1], ["BV610R", "Separador abdominal Balfour", 1],
      ["BC547R", "Tijera Mayo recta · 170 mm", 1], ["BC605R", "Tijera de ligaduras Metzenbaum curva · 145 mm", 1], ["BC615R", "Tijera Nelson-Metzenbaum curva · 230 mm", 1],
      ["FB567R", "Pinza Baby U-múltiple curva angulada 30° · 30/165 mm", 1], ["BC648R", "Tijera de Potts-Martel curva lateral 45° · 185 mm", 1], ["BM067R", "Portaagujas Durogrip Hegar-Mayo · 205 mm", 1],
      ["BM037R", "Portaagujas Durogrip DeBakey · 260 mm", 1], ["BH647R", "Pinza Kocher-Ochsner curva 1×2 dientes · 200 mm", 1], ["BB084R", "Mango de bisturí n.º 4 · 135 mm", 1],
      ["JK341", "Cubeta para contenedor 1/2 · altura 120 mm", 1], ["JK389", "Tapa inferior para contenedor 1/2 (plata)", 1]] }];
  H.filasCajas = function () {
    return H.CAJAS.reduce(function (out, c) {
      return out.concat(c.items.map(function (x) { return { ID: "INS-" + c.id + "-" + x[0], Nombre: x[1], Categoria: "Material quirúrgico", Tipo: "Instrumental", Unidad: "unidad", Stock_inicial: x[2], Stock_minimo: x[2], Por_perfusion: x[2], Referencia: x[0], Proveedor: "B. Braun Surgical", Ubicacion: c.nombre, Activo: true, Notas: c.ref }; }));
    }, []);
  };

  // ============================================================== pestañas de la preparación
  var PESTANAS_PREP = [["quirurgico", "Material quirúrgico", "scissors"], ["fungible", "Material fungible", "package"], ["farmacos", "Fármacos, reactivos y soluciones", "flask-conical"], ["inventariable", "Inventariable", "monitor"]];
  function pestanaDe(m) {
    var t = String(m.Tipo || ""), c = String(m.Categoria || "");
    if (t === "Instrumental") return "quirurgico";
    if (t === "Inventariable") return "inventariable";
    if (/^(Fármaco|Reactivo|Solución)$/.test(t) || /f[aá]rmaco|reactiv|soluci[oó]n/i.test(c)) return "farmacos";
    return "fungible";
  }
  H.pestanaMaterial = pestanaDe;
  function activos() { return H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }); }
  H.farmacosCatalogo = function () { return activos().filter(function (m) { return pestanaDe(m) === "farmacos"; }); };
  function sinConsumo(m) { return m.Tipo === "Inventariable" || m.Tipo === "Instrumental"; }

  function formChk(exp) { var d = H.copia(H.form(exp, "checklist", "") || {}); d.items = d.items || {}; return d; }
  function formIns(exp) { var d = H.copia(H.form(exp, "instrumental", "") || {}); d.cajas = d.cajas || {}; return d; }

  H.tabsExp.preparacion = function (e, p) {
    var s = PESTANAS_PREP.some(function (x) { return x[0] === p[0]; }) ? p[0] : "quirurgico", idq = encodeURIComponent(e.ID), mats = activos();
    var n = {}; mats.forEach(function (m) { var k = pestanaDe(m); n[k] = (n[k] || 0) + 1; });
    var seg = '<div class="segmentado sub2 prep-tabs" role="tablist">' + PESTANAS_PREP.map(function (x) { return '<button role="tab" aria-selected="' + (x[0] === s) + '" class="' + (x[0] === s ? "activo" : "") + '" data-act="irSub" data-r="exp/' + idq + "/preparacion/" + x[0] + '">' + ico(x[2], "s") + "<span>" + x[1] + '</span><span class="n">' + (n[x[0]] || 0) + "</span></button>"; }).join("") + "</div>";
    return seg + resumenChk(e) + (s === "quirurgico" ? quirurgico(e) : tablaPestana(e, s));
  };
  // cabecera común: cuántos comprobados y el descuento del inventario
  function resumenChk(e) {
    var d = formChk(e.ID), mats = activos().filter(function (m) { return pestanaDe(m) !== "quirurgico"; }), hechos = mats.filter(function (m) { return d.items[m.ID] && d.items[m.ID].ok; }).length, puedo = H.puede("registrar");
    var acc = !puedo ? "" : (!H.puede("inventario") ? (d.revisado_en ? '<span class="chip ok">Revisado ' + esc(H.fechaHora(d.revisado_en)) + "</span>" : '<button class="bt pri" data-act="chkRevisado" data-exp="' + esc(e.ID) + '">' + ico("clipboard-check") + "Marcar checklist como revisado</button>") :
      d.confirmado_en ? '<button class="bt peligro" data-act="chkDeshacer" data-exp="' + esc(e.ID) + '">' + ico("undo-2") + "Devolver al inventario</button>" : '<button class="bt pri" data-act="chkConfirmar" data-exp="' + esc(e.ID) + '">' + ico("package-check") + "Descontar del inventario</button>");
    return '<div class="prep-resumen"><div><b>' + hechos + " / " + mats.length + "</b> comprobados (fungible, fármacos e inventariable)" + (d.confirmado_en ? ' · <span class="chip ok">Descontado el ' + esc(H.fechaHora(d.confirmado_en)) + " por " + esc(d.confirmado_por || "") + "</span>" : "") + '</div><div class="fila-flex">' + acc + "</div></div>";
  }
  var COLS = '<colgroup><col class="c-chk"><col><col class="c-cant"><col class="c-stock"><col class="c-est"></colgroup>';
  function tablaPestana(e, s) {
    var d = formChk(e.ID), puedo = H.puede("registrar"), bloq = !!d.confirmado_en, mats = activos().filter(function (m) { return pestanaDe(m) === s; }), falta = [];
    var cats = {}; mats.forEach(function (m) { var c = m.Categoria || "Sin categoría"; (cats[c] = cats[c] || []).push(m); });
    var cab = '<div class="fila-flex prep-cab"><p class="muy-tenue">' + (s === "inventariable" ? "Equipos que se usan en la perfusión: se comprueban, pero no se descuentan del inventario." : s === "farmacos" ? "Este catálogo de fármacos, reactivos y soluciones es el que se ofrece al actualizar la tabla de infusiones de un protocolo." : "Cantidad para esta perfusión: se descuenta del inventario al confirmar el checklist.") + "</p>" +
      (puedo ? '<span class="empuja"></span>' + (s !== "inventariable" || true ? '<button class="bt" data-act="chkTodoTab" data-exp="' + esc(e.ID) + '" data-tab="' + s + '"' + (bloq ? " disabled" : "") + ">" + ico("check-check", "s") + "Marcar todo</button>" : "") + '<button class="bt pri" data-act="anadirProducto" data-tab="' + s + '">' + ico("plus") + "Añadir</button>" : "") + "</div>";
    if (!mats.length) return cab + '<div class="vacio">' + ico("package", "l") + "<p>No hay nada en esta pestaña todavía.</p><p class=\"tenue\">Pulsa «Añadir» o importa el listado en <a href=\"#/inventario\">Inventario</a>.</p></div>";
    var html = Object.keys(cats).sort().map(function (c) {
      return '<section class="tarjeta"><div class="cabecera"><h3>' + esc(c) + '</h3><span class="muy-tenue">' + cats[c].length + ' producto(s)</span></div><div class="tabla-env"><table class="t tabla-chk">' + COLS + '<thead><tr><th><span class="sr">Comprobado</span></th><th>Material</th><th class="num">' + (s === "inventariable" ? "Necesario" : "Cantidad para esta perfusión") + '</th><th class="num">Stock</th><th>Estado</th></tr></thead><tbody>' +
        cats[c].map(function (m) {
          var it = d.items[m.ID] || {}, cant = sinConsumo(m) ? 0 : it.cant !== undefined ? it.cant : C.num(m.Por_perfusion) || 0, st = H.stockDe(m), min = C.num(m.Stock_minimo), quedan = st - (bloq ? 0 : cant);
          var est = sinConsumo(m) ? (st > 0 ? '<span class="chip ok">Disponible</span>' : '<span class="chip al">No disponible</span>') : st < cant && !bloq ? '<span class="chip al">Stock insuficiente</span>' : min !== null && quedan < min ? '<span class="chip aj">Quedará bajo mínimo</span>' : '<span class="chip ok">OK</span>';
          if (!sinConsumo(m) && st < cant && !bloq) falta.push(m.Nombre);
          return '<tr><td class="chk"><input type="checkbox" aria-label="Comprobado: ' + esc(m.Nombre) + '" data-cambio="chkItem" data-id="' + esc(m.ID) + '"' + (it.ok ? " checked" : "") + (puedo && !bloq ? "" : " disabled") + '></td><td><span class="nom">' + esc(m.Nombre) + "</span>" + (m.Referencia ? '<span class="muy-tenue ref">' + esc(m.Referencia) + "</span>" : "") + "</td>" +
            '<td class="num">' + (sinConsumo(m) ? '<span class="muy-tenue">no se consume</span>' : '<span class="cant-u"><input type="text" inputmode="decimal" data-num="1" aria-label="Cantidad de ' + esc(m.Nombre) + '" value="' + cant + '" data-cambio="chkCant" data-id="' + esc(m.ID) + '"' + (puedo && !bloq ? "" : " disabled") + "><span>" + esc(m.Unidad || "") + "</span></span>") + '</td><td class="num">' + H.n(st, 1) + "</td><td>" + est + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }).join("");
    if (falta.length) html = '<div class="aviso al">' + ico("triangle-alert") + "<div><b>Falta material:</b> " + esc(falta.join(", ")) + '. <a href="#/inventario/solicitudes">Solicitar compra</a></div></div>' + html;
    return cab + html;
  }
  H.acc.chkTodoTab = function (el) {
    var exp = el.getAttribute("data-exp"), s = el.getAttribute("data-tab"), d = H.usarForm(exp, "checklist", ""); d.items = d.items || {};   // mismo objeto que usan chkItem/chkCant
    activos().filter(function (m) { return pestanaDe(m) === s; }).forEach(function (m) { (d.items[m.ID] = d.items[m.ID] || {}).ok = true; });
    H.guardarForm(exp, "checklist", "", d);
  };
  // el descuento del inventario no incluye el instrumental (no se consume)
  var confOrig = H.acc.chkConfirmar;
  H.acc.chkConfirmar = function (el) {
    var keep = H.filas; H.filas = function (t) { var l = keep(t); return t === "Material" ? l.filter(function (m) { return m.Tipo !== "Instrumental"; }) : l; };
    try { confOrig(el); } finally { H.filas = keep; }
  };

  // ---- añadir un producto desde cualquier pestaña
  H.acc.anadirProducto = function (el) {
    var s = el.getAttribute("data-tab"), adm = H.esAdmin(), tipos = { quirurgico: ["Instrumental"], fungible: ["Fungible"], farmacos: ["Fármaco", "Reactivo", "Solución"], inventariable: ["Inventariable"] }[s] || ["Fungible"];
    var cats = { quirurgico: ["Material quirúrgico"], fungible: ["Fungible de perfusión", "HDF", "Material quirúrgico", "Fungible general"], farmacos: ["Fármacos y soluciones", "Reactivos de laboratorio"], inventariable: ["Máquina de perfusión", "HDF", "Fungible general"] }[s];
    var cajas = H.CAJAS.map(function (c) { return c.nombre; });
    function f(id, et, html, ayuda) { return '<div class="campo"><label class="et" for="' + id + '">' + et + "</label>" + html + (ayuda ? '<div class="ayuda">' + ayuda + "</div>" : "") + "</div>"; }
    var cuerpo = (adm ? "" : '<div class="aviso info">' + ico("info") + "<div>El catálogo lo gestionan los administradores: se enviará como <b>solicitud de alta de producto</b>.</div></div>") +
      '<div class="rejilla dos">' + f("apN", "Nombre del producto", '<input id="apN" autocomplete="off" placeholder="' + (s === "farmacos" ? "Fármaco, concentración y presentación…" : "Nombre…") + '">') +
      f("apT", "Tipo", '<select id="apT">' + tipos.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select>") +
      f("apC", "Categoría", '<input id="apC" list="apCats" value="' + esc(cats[0]) + '"><datalist id="apCats">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>") +
      (s === "quirurgico" ? f("apCaja", "Caja", '<select id="apCaja">' + cajas.concat(["Instrumental suelto"]).map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + "</select>") : f("apU", "Unidad", '<input id="apU" value="' + (s === "farmacos" ? "vial" : "unidad") + '" autocomplete="off">')) +
      f("apP", s === "quirurgico" ? "Piezas en la caja" : s === "inventariable" ? "Unidades" : "Cantidad por perfusión", '<input id="apP" inputmode="decimal" data-num="1" value="1">') +
      f("apS", "Stock actual", '<input id="apS" inputmode="decimal" data-num="1" value="' + (s === "quirurgico" ? 1 : 0) + '">') +
      f("apR", "Referencia", '<input id="apR" autocomplete="off" placeholder="Código del proveedor…">') + f("apM", "Stock mínimo", '<input id="apM" inputmode="decimal" data-num="1" value="' + (s === "quirurgico" ? 1 : 0) + '">') + "</div>" +
      '<div class="msg-error" id="apErr" role="alert"></div>';
    H.modal({ titulo: "Añadir a «" + PESTANAS_PREP.filter(function (x) { return x[0] === s; })[0][1] + "»", ancho: true, cuerpo: cuerpo, pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="apOk">' + ico("plus") + (adm ? "Añadir al catálogo" : "Enviar la solicitud") + "</button>",
      alAbrir: function (d) {
        d.querySelector("#apOk").addEventListener("click", function () {
          var g = function (id) { var x = d.querySelector("#" + id); return x ? x.value.trim() : ""; }, nom = g("apN");
          if (nom.length < 2) { d.querySelector("#apErr").textContent = "Escribe el nombre del producto."; return; }
          if (adm) {
            var cant = C.num(g("apP")) || 0, m = { ID: "MAT-" + H.uid(), Nombre: nom, Tipo: g("apT"), Categoria: g("apC") || cats[0], Unidad: s === "quirurgico" ? "unidad" : g("apU") || "unidad", Por_perfusion: cant, Stock_inicial: C.num(g("apS")) || 0, Stock_minimo: C.num(g("apM")) || 0, Referencia: g("apR"), Activo: true, Ubicacion: s === "quirurgico" ? g("apCaja") : "" };
            H.guardar("Material", [m]); d.close(); H.toast("«" + nom + "» añadido al catálogo.");
          } else {
            H.guardar("Solicitudes", [{ ID: H.uid(), Fecha: new Date().toISOString(), Solicitante: (S.usuario || {}).nombre || "", Nombre_nuevo: nom, Categoria: g("apC"), Cantidad: C.num(g("apS")) || 1, Urgencia: "Normal", Motivo: "Alta de producto en " + s + (g("apR") ? " · ref. " + g("apR") : ""), Estado: "Pendiente" }]); d.close(); H.toast("Solicitud enviada a los administradores.");
          }
        });
      } });
  };

  // ---- material quirúrgico: cajas, recuento y esterilización
  var EST_POST = ["Pendiente de esterilizar", "Enviada a esterilizar", "Esterilizada"];
  function cajasNecesarias(e) { return H.CAJAS.filter(function (c) { return !c.soloTx || C.tipoProc(e) === "trasplante"; }); }
  function itemsCaja(nombre) { return activos().filter(function (m) { return m.Tipo === "Instrumental" && (m.Ubicacion || "Instrumental suelto") === nombre; }); }
  H.materialSinEsterilizar = function (e) {
    if (!e || !(e.Estado === "Finalizado" || H.eventos(e.ID).fin_perfusion)) return [];
    var d = H.form(e.ID, "instrumental", "") || {}, cj = d.cajas || {};
    return cajasNecesarias(e).filter(function (c) { return itemsCaja(c.nombre).length && (cj[c.nombre] || {}).post !== "Esterilizada"; }).map(function (c) { return c.nombre; });
  };
  function quirurgico(e) {
    var puedo = H.puede("registrar"), d = formIns(e.ID), hay = activos().some(function (m) { return m.Tipo === "Instrumental"; }), tx = C.tipoProc(e) === "trasplante", fin = e.Estado === "Finalizado" || !!H.eventos(e.ID).fin_perfusion;
    var cab = '<div class="fila-flex prep-cab"><p class="muy-tenue">Cajas de instrumental de B. Braun. Antes de la cirugía se comprueba que están estériles; después se cuenta cada pieza y se marca el estado de la esterilización. Si una caja no queda esterilizada, se avisa al equipo.</p>' +
      (puedo ? '<span class="empuja"></span><button class="bt pri" data-act="anadirProducto" data-tab="quirurgico">' + ico("plus") + "Añadir</button>" : "") + "</div>";
    if (!hay) return cab + '<div class="vacio">' + ico("scissors", "l") + "<p>Todavía no están las cajas de instrumental en el catálogo.</p>" + (H.esAdmin() ? '<button class="bt pri" data-act="cargarCajas">' + ico("download") + "Cargar las cajas donante y receptor (B. Braun)</button>" : '<p class="tenue">Pide a un administrador que las cargue.</p>') + "</div>";
    var nombres = H.CAJAS.map(function (c) { return c.nombre; }), sueltos = itemsCaja("Instrumental suelto"); activos().forEach(function (m) { if (m.Tipo === "Instrumental" && m.Ubicacion && nombres.indexOf(m.Ubicacion) === -1 && m.Ubicacion !== "Instrumental suelto") sueltos.push(m); });
    var bloques = H.CAJAS.filter(function (c) { return !c.soloTx || tx; }).map(function (c) { return { nombre: c.nombre, soloTx: c.soloTx, items: itemsCaja(c.nombre) }; })   // la caja del receptor solo con trasplante.concat(sueltos.length ? [{ nombre: "Instrumental suelto", items: sueltos }] : []);
    return cab + bloques.map(function (b) {
      if (!b.items.length) return "";
      var cj = d.cajas[b.nombre] || {}, rec = cj.recuento || {}, nec = !b.soloTx || tx, faltan = 0, contadas = 0, piezas = 0;
      var filas = b.items.map(function (m) {
        var esp = C.num(m.Por_perfusion) || 1, r = rec[m.ID], dif = r === undefined || r === null || r === "" ? null : C.num(r) - esp; piezas += esp; if (dif !== null) contadas++; if (dif !== null && dif < 0) faltan += -dif;
        return '<tr class="' + (dif !== null && dif < 0 ? "falta" : "") + '"><td class="ref"><span class="mono">' + esc(m.Referencia || "") + '</span></td><td><span class="nom">' + esc(m.Nombre) + '</span></td><td class="num">' + esp + '</td><td class="num"><input type="text" inputmode="numeric" data-num="1" aria-label="Recuento de ' + esc(m.Nombre) + '" value="' + (r === undefined || r === null ? "" : r) + '" placeholder="' + esp + '" data-cambio="insRecuento" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '" data-id="' + esc(m.ID) + '"' + (puedo ? "" : " disabled") + '></td><td class="num">' + (dif === null ? '<span class="muy-tenue">—</span>' : dif < 0 ? '<span class="chip al">Faltan ' + (-dif) + "</span>" : dif > 0 ? '<span class="chip aj">+' + dif + "</span>" : '<span class="chip ok">Completo</span>') + "</td></tr>";
      }).join("");
      var postSel = '<select aria-label="Estado de la esterilización de ' + esc(b.nombre) + '" data-cambio="insPost" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '"' + (puedo ? "" : " disabled") + '><option value="">— sin indicar —</option>' + EST_POST.map(function (x) { return "<option" + (cj.post === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>";
      var alerta = fin && nec && cj.post !== "Esterilizada" ? '<div class="aviso al">' + ico("triangle-alert") + "<div><b>" + esc(b.nombre) + " sin esterilizar.</b> La perfusión ha terminado: márcala como «Esterilizada» cuando vuelva de esterilización.</div></div>" : "";
      return '<section class="tarjeta caja-ins' + (nec ? "" : " no-necesaria") + '"><div class="cabecera"><h3>' + ico("briefcase-medical", "s") + esc(b.nombre) + '</h3><span class="muy-tenue">' + b.items.length + " referencias · " + piezas + " piezas</span>" + (b.soloTx ? '<span class="chip">' + (tx ? "Trasplante" : "Solo con trasplante") + "</span>" : "") + "</div>" + alerta +
        '<div class="rejilla tres caja-estado"><label class="campo check-campo"><span class="et">Antes de la cirugía</span><span class="check"><input type="checkbox" data-cambio="insPre" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '"' + (cj.pre ? " checked" : "") + (puedo ? "" : " disabled") + "> Caja estéril y precintada</span></label>" +
        '<div class="campo"><label class="et">Tras la cirugía</label>' + postSel + "</div>" +
        '<div class="campo"><span class="et">Recuento</span><div class="recuento-res">' + (contadas ? contadas + " de " + b.items.length + " contadas" + (faltan ? ' · <b class="txt-al">faltan ' + faltan + " pieza(s)</b>" : " · todo completo") : '<span class="muy-tenue">Sin contar todavía</span>') + "</div></div></div>" +
        '<div class="tabla-env"><table class="t tabla-ins"><colgroup><col class="c-ref"><col><col class="c-num"><col class="c-rec"><col class="c-dif"></colgroup><thead><tr><th>Código</th><th>Instrumento</th><th class="num">En la caja</th><th class="num">Recuento</th><th class="num">Diferencia</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
        (puedo ? '<div class="fila-flex caja-acc"><button class="bt" data-act="insContarTodo" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '">' + ico("check-check", "s") + "Está todo (recuento completo)</button>" + (faltan ? '<button class="bt pri" data-act="insComprar" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '">' + ico("shopping-cart", "s") + "Añadir lo que falta a la lista de compra</button>" : "") + (cj.solicitado_en ? '<span class="chip info">Pedido a compras el ' + esc(H.fechaHora(cj.solicitado_en)) + "</span>" : "") + "</div>" : "") + "</section>";
    }).join("");
  }
  function guardarIns(exp, fn, sinRep) { var d = formIns(exp); fn(d); d.actualizado_por = (S.usuario || {}).nombre || ""; H.guardarForm(exp, "instrumental", "", d, sinRep ? { sinRepintar: true } : undefined); return d; }
  function caja(d, n) { return d.cajas[n] = d.cajas[n] || {}; }
  H.acc.insRecuento = function (el) {
    var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"), id = el.getAttribute("data-id"), v = String(el.value).trim();
    guardarIns(exp, function (d) { var c = caja(d, n); c.recuento = c.recuento || {}; if (v === "") delete c.recuento[id]; else c.recuento[id] = C.num(v); c.contado_en = new Date().toISOString(); });
    preguntarCompra(exp, n);
  };
  H.acc.insContarTodo = function (el) {
    var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja");
    guardarIns(exp, function (d) { var c = caja(d, n); c.recuento = c.recuento || {}; itemsCaja(n).forEach(function (m) { if (c.recuento[m.ID] === undefined || c.recuento[m.ID] === null) c.recuento[m.ID] = C.num(m.Por_perfusion) || 1; }); c.contado_en = new Date().toISOString(); });
  };
  H.acc.insPre = function (el) { var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"), v = el.checked; guardarIns(exp, function (d) { caja(d, n).pre = v; }); };
  H.acc.insPost = function (el) {
    var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"), v = el.value;
    guardarIns(exp, function (d) { caja(d, n).post = v; caja(d, n).post_en = new Date().toISOString(); });
    avisoMaterial(H.exp(exp));
  };
  function faltantes(exp, n) {
    var c = ((H.form(exp, "instrumental", "") || {}).cajas || {})[n] || {}, rec = c.recuento || {};
    return itemsCaja(n).map(function (m) { var r = rec[m.ID]; return r === undefined || r === null || r === "" ? null : { m: m, n: (C.num(m.Por_perfusion) || 1) - C.num(r) }; }).filter(function (x) { return x && x.n > 0; });
  }
  var preguntado = {};
  function preguntarCompra(exp, n) {
    var f = faltantes(exp, n), k = exp + "|" + n + "|" + f.map(function (x) { return x.m.ID + ":" + x.n; }).join(","); if (!f.length || preguntado[k] || !H.puede("solicitar")) return; preguntado[k] = 1;
    H.confirmar("Falta material en la " + n.toLowerCase(), "Faltan " + f.map(function (x) { return x.n + " × " + x.m.Nombre; }).join("; ") + ". ¿Quieres añadirlo a la lista de compra?", "Añadir a la lista de compra").then(function (ok) { if (ok) comprar(exp, n); });
  }
  function comprar(exp, n) {
    var f = faltantes(exp, n); if (!f.length) return;
    H.guardar("Solicitudes", f.map(function (x) { return { ID: H.uid(), Fecha: new Date().toISOString(), Solicitante: (S.usuario || {}).nombre || "", Material: x.m.ID, Cantidad: x.n, Urgencia: "Normal", Motivo: "Falta en la " + n.toLowerCase() + " tras " + exp + " (recuento)", Estado: "Pendiente" }; }), { sinRepintar: true });
    guardarIns(exp, function (d) { caja(d, n).solicitado_en = new Date().toISOString(); });
    H.toast(f.length + " producto(s) añadidos a la lista de compra.");
  }
  H.acc.insComprar = function (el) { comprar(el.getAttribute("data-exp"), el.getAttribute("data-caja")); };
  H.acc.cargarCajas = function () {
    if (!H.esAdmin()) return; var filas = H.filasCajas().filter(function (m) { return !H.fila("Material", m.ID); });
    H.confirmar("Cargar las cajas de instrumental", "Se añadirán " + filas.length + " instrumentos al catálogo (caja donante y caja receptor, según las ofertas de B. Braun). No se descuentan del inventario: se cuentan después de cada cirugía.", "Cargar").then(function (ok) { if (ok) { H.guardar("Material", filas); H.toast("Cajas de instrumental cargadas."); } });
  };
  // aviso al equipo si al terminar la perfusión alguna caja no está esterilizada (y se cancela al marcarla)
  function avisoMaterial(e) {
    if (!e || !H.programarAvisos || !H.puede("registrar")) return;
    var sin = H.materialSinEsterilizar(e);
    H.programarAvisos(e.ID, sin.length ? [{ ID: e.ID + "|material", Experimento: e.ID, Fecha_hora: new Date().toISOString(), Tipo: "material", Titulo: "Material quirúrgico sin esterilizar · " + e.ID, Texto: sin.join(" y ") + ": hay que esterilizar(la) tras la cirugía. Márcalo en Preparación → Material quirúrgico.", Destino: "equipo", Vista: "exp:" + e.ID + ":preparacion" }] : [], ["material"]);
  }
  H.avisoMaterial = avisoMaterial;
  // al pasar un experimento a «Finalizado» (cierre de la perfusión) se comprueba el material
  var guardarOrig = H.guardar;
  H.guardar = function (tabla, filas) {
    var antes = tabla === "Experimentos" ? (filas || []).filter(function (f) { var e = f && H.exp(f.ID); return f && (f.Estado === "Finalizado" || f.Estado === "Trasplante") && (!e || (e.Estado !== "Finalizado" && e.Estado !== "Trasplante")) && f.Programacion !== "Histórico"; }).map(function (f) { return f.ID; }) : [];
    var r = guardarOrig.apply(this, arguments);
    antes.forEach(function (id) { setTimeout(function () { avisoMaterial(H.exp(id)); }, 0); });
    return r;
  };
  // y en la campana, como alerta que requiere acción (administradores e investigadores)
  var accOrig = H.alertasAccion;
  H.alertasAccion = function () {
    var out = accOrig ? accOrig() : [];
    if (H.puede("registrar")) H.listaExp().forEach(function (e) { var sin = H.materialSinEsterilizar(e); if (sin.length) out.push({ id: "ins|" + e.ID + "|" + sin.join(","), t: C.aFecha(e.Fin_perfusion) || new Date(), icono: "briefcase-medical", titulo: "Material quirúrgico sin esterilizar · " + e.ID, texto: sin.join(", "), href: "#/exp/" + encodeURIComponent(e.ID) + "/preparacion/quirurgico", tipo: "accion" }); });
    return out;
  };

  // ============================================================== registro histórico de perfusiones
  H.esHistorico = function (e) { return !!e && e.Programacion === "Histórico"; };
  var listaOrig = H.vistas.experimentos;
  H.vistas.experimentos = function (p, q) {
    var vista = q.vista === "historico" || q.vista === "actuales" ? q.vista : "todos", keep = H.listaExp;
    var fin = function (e) { return e.Estado === "Finalizado" || e.Estado === "Cancelado" || H.esHistorico(e); };
    H.listaExp = function () { var l = keep(); return vista === "historico" ? l.filter(fin) : vista === "actuales" ? l.filter(function (e) { return !fin(e); }) : l; };
    var html; try { html = listaOrig(p, q); } finally { H.listaExp = keep; }
    var nH = keep().filter(fin).length, nA = keep().length - nH, qs = function (v) { var o = []; if (v !== "todos") o.push("vista=" + v); if (q.q) o.push("q=" + encodeURIComponent(q.q)); if (q.estado) o.push("estado=" + encodeURIComponent(q.estado)); return "#/experimentos" + (o.length ? "?" + o.join("&") : ""); };
    var seg = '<nav class="segmentado vista-exp" aria-label="Qué experimentos ver">' + [["todos", "Todos", keep().length], ["actuales", "Programados y en curso", nA], ["historico", "Histórico", nH]].map(function (x) { return '<a href="' + qs(x[0]) + '" class="' + (vista === x[0] ? "activo" : "") + '"' + (vista === x[0] ? ' aria-current="page"' : "") + "><span>" + x[1] + '</span><span class="n">' + x[2] + "</span></a>"; }).join("") + "</nav>";
    var bt = H.esAdmin() ? '<button class="bt" data-act="nuevoHistorico">' + ico("history") + "Registrar una perfusión anterior</button>" : "";
    html = html.replace(/(<div class="titulo-pag"><h1>Experimentos<\/h1>)/, "$1" + bt).replace('<div class="barra-filtros">', seg + '<div class="barra-filtros">');
    if (vista === "historico") html = html.replace('<div class="barra-filtros">', '<p class="muy-tenue intro-hist">' + ico("history", "s") + " Perfusiones terminadas y registros de perfusiones hechas antes de usar la app. En una perfusión anterior todas las pestañas están abiertas para pasar los datos, y no se envían avisos ni citas.</p>" + '<div class="barra-filtros">');
    return html;
  };
  H.acc.nuevoHistorico = function () {
    if (!H.esAdmin()) return;
    var n = H.filas("Experimentos").reduce(function (m, e) { return Math.max(m, C.num(e.Numero) || 0); }, 0) + 1, nn = (n < 10 ? "0" : "") + n, hoy = hoyISO();
    function f(id, et, html, ayuda) { return '<div class="campo"><label class="et" for="' + id + '">' + et + "</label>" + html + '<div class="ayuda">' + (ayuda || "&nbsp;") + "</div></div>"; }
    var tipos = [["puesta", C.TIPOS_PROC[0]], ["perfusion", C.TIPOS_PROC[1]], ["trasplante", C.TIPOS_PROC[2]]];
    var cuerpo = '<p class="muy-tenue">Para pasar a la app una perfusión que ya se hizo. Queda como <b>Finalizado</b>, con todas las pestañas abiertas para introducir los datos, y <b>no se envían avisos, correos ni citas</b>.</p>' +
      '<fieldset class="campo pg-tipo"><legend class="et">Tipo de procedimiento</legend><div class="segmentado ancho-total" role="radiogroup">' + tipos.map(function (t, i) { return '<label class="seg-op"><input type="radio" name="hiTipo" value="' + t[0] + '"' + (i === 1 ? " checked" : "") + "><span>" + esc(t[1]) + "</span></label>"; }).join("") + "</div></fieldset>" +
      '<div class="rejilla tres">' + f("hiNum", "Número", '<input id="hiNum" inputmode="numeric" data-num="1" value="' + n + '">', 'ID: <b id="hiId">HOME-' + nn + "</b>") + f("hiPM", "Código de la perfusión", '<input id="hiPM" value="HOME-PM-' + nn + '" autocomplete="off">') +
      f("hiProt", "Versión del protocolo", '<select id="hiProt">' + C.VERSIONES.map(function (v) { var pr = C.PROTOCOLOS[v]; return '<option value="' + v + '">' + v + " · " + esc(pr.propuesto ? "propuesto" : pr.ref) + "</option>"; }).join("") + "</select>") +
      f("hiQx", "Fecha de la hepatectomía", '<input id="hiQx" type="date" max="' + hoy + '">') + f("hiIni", "Inicio de la perfusión", '<input id="hiIni" type="time" value="12:00">') +
      f("hiFin", "Fin de la perfusión", '<input id="hiFin" type="datetime-local">', "Fecha y hora") +
      f("hiTx", "Fecha del trasplante", '<input id="hiTx" type="date" max="' + hoy + '">', "Solo con trasplante") + f("hiSa", "Fecha del sacrificio", '<input id="hiSa" type="date" max="' + hoy + '">', "Solo con trasplante") +
      f("hiPeso", "Peso del hígado inicial", '<div class="unidad-in"><input id="hiPeso" inputmode="decimal" data-num="1"><span>g</span></div>') + "</div>" +
      '<div class="rejilla tres">' + f("hiCrLD", "Crotal del donante de hígado", '<input id="hiCrLD" autocomplete="off">') + f("hiCrBD", "Crotal del donante de sangre", '<input id="hiCrBD" autocomplete="off">') +
      f("hiSexo", "Sexo de los donantes", '<select id="hiSexo"><option value="">—</option><option value="H">Hembra</option><option value="M">Macho</option></select>') + "</div>" +
      '<div class="campo"><label class="et" for="hiNotas">Notas</label><textarea id="hiNotas" rows="2" placeholder="Origen de los datos (cuaderno, Excel…), incidencias…"></textarea></div><div class="msg-error" id="hiErr" role="alert"></div>';
    H.modal({ titulo: "Registrar una perfusión anterior", ancho: true, cuerpo: cuerpo, pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="hiOk">' + ico("history") + "Crear el registro</button>",
      alAbrir: function (d) {
        var q$ = function (s) { return d.querySelector(s); }, tipo = function () { return (q$("input[name=hiTipo]:checked") || {}).value || "perfusion"; };
        function ver() { var tx = tipo() === "trasplante"; ["#hiTx", "#hiSa"].forEach(function (s) { q$(s).closest(".campo").classList.toggle("oculto", !tx); }); }
        H.$$("input[name=hiTipo]", d).forEach(function (r) { r.addEventListener("change", ver); }); ver();
        q$("#hiNum").addEventListener("input", function () { var v = Number(this.value) || 1, s = (v < 10 ? "0" : "") + v; q$("#hiId").textContent = "HOME-" + s; q$("#hiPM").value = "HOME-PM-" + s; });
        q$("#hiQx").addEventListener("change", function () { if (this.value && !q$("#hiFin").value) q$("#hiFin").value = C.sumarDias(this.value, 7) + "T12:00"; });
        q$("#hiOk").addEventListener("click", function () {
          var v = Number(q$("#hiNum").value) || n, s = (v < 10 ? "0" : "") + v, id = "HOME-" + s, qx = q$("#hiQx").value, ini = q$("#hiIni").value || "12:00", fin = q$("#hiFin").value, tx = tipo() === "trasplante", err = q$("#hiErr");
          if (H.exp(id)) { err.textContent = "Ya existe " + id + ". Elige otro número."; return; }
          if (!qx) { err.textContent = "Indica la fecha de la hepatectomía."; return; }
          if (qx > hoyISO()) { err.textContent = "Una perfusión anterior no puede tener fecha futura: para eso usa «Programar experimento»."; return; }
          var t0 = C.aFecha(qx + "T" + ini + ":00"), t1 = fin ? C.aFecha(fin + ":00") : null;
          if (t1 && t0 && t1 <= t0) { err.textContent = "El fin de la perfusión debe ser posterior al inicio."; return; }
          var o = { ID: id, Numero: v, Codigo_PM: q$("#hiPM").value.trim(), Fase: { puesta: C.TIPOS_PROC[0], perfusion: C.TIPOS_PROC[1], trasplante: C.TIPOS_PROC[2] }[tipo()], Protocolo: q$("#hiProt").value, Estado: "Finalizado", Programacion: "Histórico",
            Fecha_cirugia: qx, Fecha_llegada: C.sumarDias(qx, -(S.cfg.programacion || C.DEF.programacion).dias_llegada_antes), Fecha_trasplante: tx ? q$("#hiTx").value : "", Fecha_sacrificio: tx ? q$("#hiSa").value : "",
            Inicio_perfusion: t0 ? t0.toISOString() : "", Fin_perfusion: t1 ? t1.toISOString() : "", Peso_higado_inicial_g: C.num(q$("#hiPeso").value), Color: C.PALETA[(v - 1) % C.PALETA.length], Responsable: (S.usuario || {}).nombre || "", Notas: q$("#hiNotas").value.trim(), Participantes: "[]" };
          var sx = q$("#hiSexo").value, an = [["BD", q$("#hiCrBD").value.trim()], ["LD", q$("#hiCrLD").value.trim()]].map(function (r) { return { ID: "HOME-" + r[0] + "-" + s, Experimento: id, Rol: r[0], Crotal: r[1], Sexo: sx, Raza: "Landrace × Large White", Fecha_llegada: o.Fecha_llegada }; });
          var evs = [t0 ? { ID: id + "|ev|inicio_perfusion", Experimento: id, Tipo: "inicio_perfusion", Fecha_hora: t0.toISOString(), Nota: "Registro histórico" } : null, t1 ? { ID: id + "|ev|fin_perfusion", Experimento: id, Tipo: "fin_perfusion", Fecha_hora: t1.toISOString(), Nota: "Registro histórico" } : null].filter(Boolean);
          H.guardar("Experimentos", [o], { sinRepintar: true }); H.guardar("Animales", an, { sinRepintar: true }); if (evs.length) H.guardar("Eventos", evs, { sinRepintar: true });
          S.medCargada[id] = true; d.close(); H.toast(id + " registrado como perfusión anterior."); H.ir("exp/" + encodeURIComponent(id) + "/resumen");
        });
      } });
  };

  // ============================================================== dibujo del cerdo (más realista) para «Cómo medir»
  H.morfoSVG = function (soloCerdo) {
    var col = { OBL: "#0f766e", NL: "#2563eb", BL1: "#7c3aed", HSLD: "#c2410c", HHIP: "#b45309", HGH: "#be185d", MGH: "#0e7490", PGH: "#4d7c0f" };
    function et(x, y, t, c, anc) { var w = t.length > 3 ? 44 : 38, x0 = anc === "end" ? x - w : anc === "start" ? x : x - w / 2; return '<g class="mf-et"><rect x="' + x0 + '" y="' + (y - 12) + '" width="' + w + '" height="18" rx="9" fill="' + c + '"/><text x="' + (x0 + w / 2) + '" y="' + (y + 1.5) + '" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="Roboto, system-ui, sans-serif">' + t + "</text></g>"; }
    var defs = '<defs><linearGradient id="mfPiel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6cfc2"/><stop offset=".55" stop-color="#efbcad"/><stop offset="1" stop-color="#dfa192"/></linearGradient>' +
      '<linearGradient id="mfPielL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5ab9c"/><stop offset="1" stop-color="#c98a7c"/></linearGradient>' +
      '<radialGradient id="mfBrillo" cx=".45" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
    var pie = function (x, y, w, h, lejos) {   // pata ahusada con rodilla/corvejón y pezuña partida
      var r = function (v) { return Math.round(v * 10) / 10; }, b = y + h - 12, P = function (a, c) { return r(x + w * a) + "," + r(c); };
      return '<path d="M' + P(0, y) + " L" + P(1, y) + " C" + P(1.06, y + h * 0.32) + " " + P(0.84, y + h * 0.44) + " " + P(0.88, y + h * 0.6) + " L" + P(0.8, b) + " L" + P(0.2, b) + " L" + P(0.13, y + h * 0.6) + " C" + P(0.18, y + h * 0.44) + " " + P(-0.06, y + h * 0.32) + " " + P(0, y) + ' Z" fill="url(#' + (lejos ? "mfPielL" : "mfPiel") + ')" stroke="#b97d70" stroke-width="1.2"/>' +
        '<path d="M' + P(0.18, b - 1) + " L" + P(0.82, b - 1) + " L" + P(0.9, b + 10) + " Q" + P(0.5, b + 13) + " " + P(0.1, b + 10) + ' Z" fill="#6f4a40"/><line x1="' + r(x + w / 2) + '" y1="' + (b + 1) + '" x2="' + r(x + w / 2) + '" y2="' + (b + 11) + '" stroke="#3f2a24" stroke-width="1.1"/>';
    };
    var cerdo = defs + '<ellipse cx="330" cy="294" rx="250" ry="7" fill="#000" opacity=".12"/>' +
      pie(240, 190, 24, 100, true) + pie(474, 188, 26, 102, true) + pie(206, 196, 28, 94) + pie(448, 194, 30, 96) +
      '<path d="M182,128 C214,100 300,86 404,90 C470,93 516,104 536,134 C552,160 546,198 520,216 C474,240 298,242 236,230 C204,224 184,208 178,188 Z" fill="url(#mfPiel)" stroke="#b97d70" stroke-width="1.4"/>' +
      '<path d="M436,104 C492,104 532,128 534,168 C536,200 516,220 488,226 C470,206 462,166 470,128 Z" fill="#ecb6a7" opacity=".55"/>' +
      '<path d="M190,150 C206,128 240,122 262,138 C276,160 270,200 252,226 C230,224 204,214 192,198 Z" fill="#ecb6a7" opacity=".5"/>' +
      '<path d="M250,228 C320,238 420,236 482,224" fill="none" stroke="#c48b7d" stroke-width="1.2" opacity=".7"/>' +
      '<path d="M236,100 C300,84 420,84 500,104" fill="none" stroke="#fff" stroke-width="3" opacity=".25" stroke-linecap="round"/>' +
      '<path d="M190,124 C168,110 136,114 112,130 C92,142 74,156 62,170 C54,180 54,196 66,201 C92,208 134,206 164,198 C182,193 192,182 194,168 Z" fill="url(#mfPiel)" stroke="#b97d70" stroke-width="1.4"/>' +
      '<ellipse cx="58" cy="185" rx="9" ry="15" fill="#f0b2a4" stroke="#b97d70" stroke-width="1.2"/><ellipse cx="56" cy="180" rx="2" ry="3.2" fill="#8a5448"/><ellipse cx="56" cy="191" rx="2" ry="3.2" fill="#8a5448"/>' +
      '<path d="M68,199 C86,203 104,201 118,195" fill="none" stroke="#a8695c" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M120,178 C132,190 150,192 166,186" fill="none" stroke="#c48b7d" stroke-width="1.2" opacity=".8"/>' +
      '<path d="M146,124 C146,100 156,82 176,70 C184,90 184,110 176,128 Z" fill="url(#mfPielL)" stroke="#b97d70" stroke-width="1.2"/><path d="M154,120 C156,104 162,92 172,84 C176,98 176,110 170,122 Z" fill="#e7a89a" opacity=".8"/>' +
      '<ellipse cx="121" cy="152" rx="4" ry="4.4" fill="#2a1f1c"/><circle cx="122.4" cy="150.6" r="1.3" fill="#fff"/><path d="M112,144 C118,140 126,140 131,144" fill="none" stroke="#a8695c" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M536,132 c14,-9 24,2 16,11 c-8,9 1,18 12,10" fill="none" stroke="#c48b7d" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M182,128 C214,100 300,86 404,90 C470,93 516,104 536,134 C552,160 546,198 520,216 C474,240 298,242 236,230 C204,224 184,208 178,188 Z" fill="url(#mfBrillo)"/>' +
      '<line x1="20" x2="620" y1="291" y2="291" stroke="#9aa5ad" stroke-width="1.5"/>';
    if (soloCerdo) return cerdo;
    var m = '<path d="M176,100 C268,70 440,72 532,118" stroke="' + col.OBL + '" class="mf-l"/>' + et(350, 64, "OBL", col.OBL) +
      '<path d="M170,108 L238,96" stroke="' + col.NL + '" class="mf-l"/>' + et(200, 88, "NL", col.NL) +
      '<path d="M532,130 L222,152" stroke="' + col.BL1 + '" class="mf-l"/>' + et(380, 130, "BL1", col.BL1) +
      '<path d="M238,290 L238,96" stroke="' + col.HSLD + '" class="mf-l"/>' + et(232, 280, "HSLD", col.HSLD, "end") +
      '<path d="M474,290 L474,98" stroke="' + col.HHIP + '" class="mf-l"/>' + et(480, 280, "HHIP", col.HHIP, "start") +
      [["HGH", 268], ["MGH", 354], ["PGH", 440]].map(function (x) { return '<ellipse cx="' + x[1] + '" cy="164" rx="12" ry="70" stroke="' + col[x[0]] + '" class="mf-anillo"/>' + et(x[1], 250, x[0], col[x[0]]); }).join("");
    return '<svg class="morfo-svg" viewBox="0 0 640 310" role="img" aria-label="Esquema de las medidas morfométricas del cerdo">' + cerdo + m + "</svg>";
  };

  // ============================================================== tabla de infusiones: producto elegido del catálogo de fármacos
  H.acc.protProducto = function (el) {
    var exp = el.getAttribute("data-exp"), l = el.getAttribute("data-l"), e = H.exp(exp), p = H.protocoloExp(e), f = H.copia(H.form(exp, "protocolo", "") || {});
    f.version = p.version; f.lineas = f.lineas || {}; Object.keys(p.lineas).forEach(function (k) { if (!f.lineas[k]) f.lineas[k] = H.copia(p.lineas[k]); });
    f.lineas[l].producto = String(el.value || "").trim() || p.lineas[l].producto; delete f.confirmado_en; delete f.confirmado_por;
    H.guardarForm(exp, "protocolo", "", f); H.toast("Producto actualizado. Vuelve a confirmar la tabla de infusiones.");
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v06.js"] = "0.7.3";
