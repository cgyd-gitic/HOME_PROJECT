/* HOME · v0.7 (d): Preparación e Inventario con las mismas cuatro pestañas (material quirúrgico de un solo uso, fungible,
   fármacos/reactivos/soluciones e inventariable con las cajas de instrumental y su esterilización), cantidades según los días
   reales de perfusión, catálogo de referencia en español, ubicaciones fijas, gestor de inventario (Configuración › Inventario,
   con la reposición y los pedidos), PROEX por experimento, censo mensual de animales (MODELO CENSO ANIMALES) y nuevo dibujo
   técnico del cerdo para la morfometría. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME;
  if (!C || !H) return;
  var S = H.S, esc = H.esc, ico = H.ico, UB = C.UBICACIONES;
  function siNo(v) { return v === true || /^(true|sí|si|1|verdadero|x)$/i.test(String(v === undefined || v === null ? "" : v).trim()); }
  function activos() { return H.filas("Material").filter(function (m) { return m.Activo !== false && m.Activo !== "FALSE"; }); }
  function n1(x) { return H.n(x, Math.abs(x - Math.round(x)) > 1e-9 ? 1 : 0); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  // ============================================================== 0. Gestor de inventario (casilla por usuario; respaldo: los ADMIN)
  H.gestoresInventario = function () {
    return H.filas("Usuarios").filter(function (u) { return u.Activo !== false && u.Activo !== "FALSE" && siNo(u.Gestor_inventario) && /^(ADMIN|INVESTIGADOR)$/.test(H.normRol(u.Rol)); });
  };
  // Valor efectivo: con la tabla de usuarios (ADMIN) se calcula aquí, para que un cambio de casilla se note sin volver a entrar; si no, lo que diga el servidor
  H.esGestorInv = function () {
    var u = S.usuario; if (!u) return false; var r = H.rol(); if (r !== "ADMIN" && r !== "INVESTIGADOR") return false;
    if (H.filas("Usuarios").length) { var g = H.gestoresInventario(); return g.length ? g.some(function (x) { return String(x.Email).toLowerCase() === String(u.email || "").toLowerCase(); }) : r === "ADMIN"; }
    if (u.gestor_inventario !== undefined) return !!u.gestor_inventario;
    return r === "ADMIN";
  };
  H.gestorRespaldo = function () { if (!H.esAdmin() || !H.esGestorInv()) return false; if (H.filas("Usuarios").length) return !H.gestoresInventario().length; return !!(S.usuario || {}).gestor_respaldo; };
  var puede0 = H.puede;
  H.puede = function (a) {
    if (a === "inventario" || a === "gestor_inventario") return H.esGestorInv();   // Material, Pedidos, reposición y pedidos al proveedor
    if (a === "movimientos") return H.esGestorInv() || H.esAdmin();               // entradas, consumos y descuentos del checklist
    return puede0(a);
  };
  function aviso(tipo, html, icono) { return '<div class="aviso ' + tipo + '">' + ico(icono || (tipo === "al" ? "circle-alert" : tipo === "ok" ? "circle-check" : tipo === "aj" ? "triangle-alert" : "info")) + "<div>" + html + "</div></div>"; }
  function info(t) { return H.v07b && H.v07b.info ? H.v07b.info(t) : ""; }   // v0.7.1: botón (i) común (app_v07b)
  function soloGestor(txt) { return aviso("info", (txt || "Solo lectura: el inventario lo gestiona") + " " + (H.gestoresInventario().length ? "<b>" + esc(H.gestoresInventario().map(function (u) { return u.Nombre || u.Email; }).join(", ")) + "</b>" : "el gestor de inventario") + ".", "lock"); }

  // ============================================================== 1. Pestañas y secciones del material (las mismas en Preparación e Inventario)
  var PESTANAS = [["quirurgico", "Material quirúrgico", "scissors"], ["fungible", "Material fungible", "package"], ["farmacos", "Fármacos, reactivos y soluciones", "flask-conical"], ["inventariable", "Inventariable", "monitor"]];
  H.PESTANAS_MATERIAL = PESTANAS;
  var CAJAS_N = function () { return H.CAJAS.map(function (c) { return c.nombre; }); };
  var SECCIONES = {
    quirurgico: ["Material quirúrgico de un solo uso"],
    fungible: ["Fungible de perfusión", "Fungible de hemodiafiltración", "Fungible general"],
    farmacos: ["Fármacos y soluciones", "Reactivos"],
    inventariable: ["Equipos", "Caja donante", "Caja receptor", "Instrumental suelto"]
  };
  H.SECCIONES_MATERIAL = SECCIONES;
  H.CATS_MAT = ["Material quirúrgico", "Fungible de perfusión", "Fungible de hemodiafiltración", "Fungible general", "Fármacos y soluciones", "Reactivos", "Equipos", "Caja donante", "Caja receptor", "Instrumental suelto"];
  H.TIPOS_MAT = ["Fungible", "Inventariable", "Instrumental", "Fármaco", "Reactivo", "Solución"];
  function esInstrumental(m) { return m.Tipo === "Instrumental"; }
  function cajaDe(m) { var n = CAJAS_N(); if (n.indexOf(m.Categoria) !== -1) return m.Categoria; if (n.indexOf(m.Ubicacion) !== -1) return m.Ubicacion; return "Instrumental suelto"; }   // v0.6 guardaba la caja en Ubicacion
  function pestanaDe(m) {
    var t = String(m.Tipo || ""), c = String(m.Categoria || "");
    if (t === "Instrumental" || t === "Inventariable") return "inventariable";
    if (/^fungible|^hdf$|hemodiafiltr|m[aá]quina de perfusi/i.test(c)) return "fungible";
    if (/quir[uú]rgico/i.test(c)) return "quirurgico";
    if (/^(Fármaco|Reactivo|Solución)$/.test(t) || /f[aá]rmaco|reactiv|soluci[oó]n/i.test(c)) return "farmacos";
    return "fungible";
  }
  function seccionDe(m) {
    var s = pestanaDe(m), c = String(m.Categoria || "");
    if (s === "inventariable") return esInstrumental(m) ? cajaDe(m) : "Equipos";
    if (s === "quirurgico") return "Material quirúrgico de un solo uso";
    if (s === "farmacos") return /reactiv/i.test(c) || m.Tipo === "Reactivo" ? "Reactivos" : "Fármacos y soluciones";
    if (/perfusi/i.test(c)) return "Fungible de perfusión";
    if (/^hdf$|hemodiafiltr/i.test(c)) return "Fungible de hemodiafiltración";
    return "Fungible general";
  }
  H.pestanaMaterial = pestanaDe; H.seccionMaterial = seccionDe;
  H.farmacosCatalogo = function () { return activos().filter(function (m) { return pestanaDe(m) === "farmacos"; }); };
  function porSeccion(lista, s) {
    var orden = SECCIONES[s] || [], g = {}; lista.forEach(function (m) { var k = seccionDe(m); (g[k] = g[k] || []).push(m); });
    return Object.keys(g).sort(function (a, b) { return ((orden.indexOf(a) + 99) % 99) - ((orden.indexOf(b) + 99) % 99) || a.localeCompare(b, "es"); }).map(function (k) { return { nombre: k, items: g[k] }; });
  }
  function sinConsumo(m) { return m.Tipo === "Inventariable" || m.Tipo === "Instrumental"; }

  // ============================================================== 2. Catálogo de referencia: nombres en español con un solo formato
  // Formato: «nombre genérico + marca o modelo + dosis o concentración + envase», sin paréntesis ni mezcla de idiomas
  // (p. ej. «Hemofiltro HF03», «Taurocolato sódico hidratado 25 g», «Heparina sódica 5000 UI/mL 5 mL»).
  // Alias: nombres con los que el material puede estar ya en el inventario (en inglés o en el formato de la v0.6), para no duplicarlo.
  C.ALIAS_MATERIAL = {
    "Set de perfusión Liver Assist": ["Liver Assist Perfusion Set", "Set de tubos Liver Assist"], "Oxigenador Capiox FX05 Baby": ["Capiox FX05 Baby-FX", "Capiox FX05"],
    "Conector 1/4″–3/8″": ["Connector 1/4-3/8", "Conector 1/4-3/8"], "Conector de pagoda 1/4″–1/4″": ["Connector de Pagoda 1/4-1/4", "Conector de pagoda 1/4-1/4"], "Tubuladura 1/4″–1/4″": ["Tubuladura 1/4-1/4"],
    "Adaptador Luer-Lock 1/4″": ["Adaptador Luer Lock 1/4"], "Llave de tres vías": ["Llave de 3 vías"], "Línea de hemofiltración Aqualine S": ["Aqualine S", "Línea arteriovenosa Aquarius"],
    "Bolsa de recogida de ultrafiltrado 5 L": ["Bolsa de recogida de ultrafiltrado 5L/L", "Bolsa de efluente"], "Hemofiltro HF03": ["HF03", "Filtro de hemodiafiltración"],
    "Solución de hemodiafiltración Accusol 35 potasio 2 mmol/L 5 L": ["Accusol 35 potasio 2 mmol/L (bolsa de 5 L)", "Accusol 35 2K", "Líquido de reposición 5 L"],
    "Puntas de pipeta 200 µL": ["Puntas de pipeta 200 µL (caja de 96)", "Puntas 200 µL 96 unidades"], "Microtubo tipo Eppendorf de fondo plano": ["Microtubo de fondo plano tipo Eppendorf", "microtubo tipo eppendorf T/plano"],
    "Tubo de heparina de litio con separador 0,8 mL": ["LH lithium heparin separator tube, 0,8 mL", "LH lithium heparin separator tube"], "Tubo de K2EDTA Vacutest 5,4 mg 3 mL": ["Tubo K2EDTA 5,4 mg 3 mL (Vacutest)", "Vacutest K2EDTA 5,4 mg, 3 mL"],
    "Tubo de suero con gel y activador Vacutest 3,5 mL": ["Tubo de suero con gel y activador 3,5 mL (Vacutest)", "Vacutest Gel and Clot Act, 3,5 mL"], "Tubo de citrato sódico Minicollect 9NC 3,2 % 1 mL": ["Tubo de citrato sódico 3,2 % 1 mL (Minicollect 9NC)", "Minicollect 9NC Coagulation sodium citrate 3,2%, 1mL"],
    "Jeringa de gasometría con heparina 80 UI 0,7 mL": ["Jeringa de gasometría 80 UI de heparina 0,7 mL", "Jeringa gasometría, 80 IU heparina, 0,7 mL", "Tubo de gasometría"],
    "Sonda vascular TTFM Medistim 10 mm": ["Sonda vascular TTFM 10 mm (Medistim; 20 usos)", "10 mm Vascular TTFM Probe"], "Sonda vascular TTFM Medistim 4 mm": ["Sonda vascular TTFM 4 mm (Medistim; 20 usos)", "4mm Vascular TTFM Probe", "4 mm Vascular TTFM Probe"],
    "Taurocolato sódico hidratado 25 g": ["Taurocolato sódico hidratado (25 g)", "Sodium taurocholate hydrate, 25 g", "Sodium taurocholate hydrate"], "Aceite mineral 500 mL": ["Aceite mineral (500 mL)", "Mineral Oil, 500 mL", "Mineral oil"],
    "Periolimel N4E 2 L": ["Periolimel N4e 2L", "Periolimel N4E 1500 mL"], "Taurina 100 g": ["Taurina (100 g)"], "Cloruro de colina 100 g": ["Cloruro de colina (100 g)"],
    "Cefoxitina 1 g/10 mL": ["Cefoxitina 1 g, 10 mL"], "Metronidazol 500 mg/100 mL": ["Metrodinazol 500 mg, 100 mL", "Metronidazol 500 mg, 100 mL"], "Fluconazol 2 mg/mL 50 mL": ["Fluconazol 2 mg/mL (50 mL)", "Fluconazol 2mg/mL, 50 mL"],
    "Hidrocortisona Actocortina 75 mg/1 mL": ["Hidrocortisona 75 mg/1 mL (Actocortina)", "Actocotina 75 mg, 1 mL", "Actocortina 75 mg"], "L-carnitina Carnicor 200 mg/mL 5 mL": ["L-carnitina 200 mg/mL (Carnicor, 5 mL)", "Carnicor 200 mg/mL, 5 mL"],
    "Epoprostenol Veletri 0,5 mg/100 mL": ["Epoprostenol 0,5 mg en 100 mL (Veletri)", "Epoprostenol, Veletri 0,5 mg en 100 mL"], "Heparina sódica 5000 UI/mL 5 mL": ["Heparina sódica 5000 UI/mL (5 mL)", "Heparina sódica 5000 U/mL (5 mL)", "Heparina sódica inyectable, 5000 u/mL, 5 mL"],
    "Acetilcisteína Hidonac antídoto 200 mg/mL 25 mL": ["Acetilcisteína 200 mg/mL (Hidonac antídoto, 25 mL)", "Aceticisteína, hidonac antídoto 200 mg/mL, 25 mL"], "Fosfato dipotásico 1 M 174,2 mg/mL 10 mL": ["Fosfato dipotásico 1 M 174,2 mg/mL (10 mL)", "Fosfato dipotásico 1M, 174,2 mg/mL, 10 mL"],
    "Sulfato de magnesio Sulmetin simple 150 mg/mL 10 mL": ["Sulfato de magnesio 150 mg/mL (Sulmetin simple, 10 mL)"], "Solución de preservación IGL-1 1 L": ["Solución de preservación IGL-1 (1 L)", "Solución IGL-1 1 L"],
    "Sistema de medición de flujo Medistim VeriQ": ["Medidor de flujo Medistim VeriQ", "Medistim VeriQ System"], "Mezclador de aire y oxígeno": ["Mezcladores de aire"]
  };
  // notas que se guardan con el material al cargar el catálogo
  var NOTAS_CAT = {
    "Puntas de pipeta 200 µL": "Caja de 96 puntas: se reaprovecha entre perfusiones (1 punta por tubo de EDTA).", "Sonda vascular TTFM Medistim 10 mm": "Sonda reutilizable: 20 usos si es nueva. Se registra cada uso.",
    "Sonda vascular TTFM Medistim 4 mm": "Sonda reutilizable: 20 usos si es nueva. Se registra cada uso.", "Equipo de irrigación de una sola sonda": "Solo en la cirugía del donante.", "Solución de preservación IGL-1 1 L": "Solo en la cirugía del donante.",
    "Hidrocortisona Actocortina 75 mg/1 mL": "Las ampollas abiertas no se reaprovechan en la siguiente perfusión.", "Acetilcisteína Hidonac antídoto 200 mg/mL 25 mL": "El frasco se puede reaprovechar.", "Sulfato de magnesio Sulmetin simple 150 mg/mL 10 mL": "Solo si hay que compensar el magnesio en la HDF o en el perfusato; ampolla de un solo uso.",
    "Epoprostenol Veletri 0,5 mg/100 mL": "Solo si hay vasoconstricción o vasoespasmo (recomendación según el flujo arterial en el seguimiento).", "Metronidazol 500 mg/100 mL": "Se mezcla con la cefoxitina: 1 al día.", "Fosfato dipotásico 1 M 174,2 mg/mL 10 mL": "1 ampolla por cada 2 bolsas de Accusol."
  };
  C.CATALOGO.forEach(function (m) { if (NOTAS_CAT[m.Nombre]) m.Notas = NOTAS_CAT[m.Nombre]; });
  function aliasDe(nombre) { return [nombre].concat(C.ALIAS_MATERIAL[nombre] || []).map(norm); }
  function buscarExistente(cat, lista) {
    var ref = norm(cat.Referencia), al = aliasDe(cat.Nombre);
    return lista.filter(function (m) { return ref && norm(m.Referencia) === ref; })[0] || lista.filter(function (m) { return al.indexOf(norm(m.Nombre)) !== -1; })[0] || null;
  }
  H.buscarEnCatalogo = function (m) { return C.CATALOGO.filter(function (c) { return (c.Referencia && norm(c.Referencia) === norm(m.Referencia)) || aliasDe(c.Nombre).indexOf(norm(m.Nombre)) !== -1; })[0] || null; };
  function cantidadTipica(m) { return C.cantidadMaterial(m, { dias: diasPrevistos(), tx: false, circ: S.cfg.circadiano, protocolo: { lineas: protLineas(C.versionActual()) } }); }
  function protLineas(v) { var p = C.PROTOCOLOS[v] || C.PROTOCOLOS[C.versionActual()]; return p ? p.lineas : {}; }
  // categorías antiguas → nuevas (sin tocar el stock)
  function categoriaNormal(m) {
    var c = String(m.Categoria || ""); if (esInstrumental(m)) return cajaDe(m);
    if (m.Tipo === "Inventariable") return "Equipos";
    if (/^hdf$/i.test(c)) return "Fungible de hemodiafiltración"; if (/m[aá]quina de perfusi/i.test(c)) return "Fungible de perfusión"; if (/reactivos de lab/i.test(c)) return "Reactivos";
    return c;
  }
  // Plan de carga: altas, actualizaciones (nombre, tipo, categoría, regla, ubicación) y normalización de lo que ya hay
  H.planCatalogo = function () {
    var lista = H.filas("Material"), usados = {}, altas = [], cambios = [];
    C.CATALOGO.forEach(function (cat) {
      var ex = buscarExistente(cat, lista.filter(function (m) { return !usados[m.ID]; })), pp = cat.Regla === "fijo" || cat.Regla === "prop7" ? cat.Por_perfusion : cantidadTipica(cat);
      var o = { Nombre: cat.Nombre, Tipo: cat.Tipo, Categoria: cat.Categoria === "Equipos" ? "Equipos" : cat.Categoria === "Reactivos" ? "Reactivos" : cat.Categoria, Unidad: cat.Unidad, Regla: cat.Regla, Por_perfusion: pp };
      if (cat.Notas) o.Notas = cat.Notas;
      if (ex) { usados[ex.ID] = 1; o.ID = ex.ID; if (!ex.Referencia && cat.Referencia) o.Referencia = cat.Referencia; if (UB.indexOf(ex.Ubicacion) === -1) o.Ubicacion = cat.Ubicacion; if (ex.Activo === false || ex.Activo === "FALSE") o.Activo = true; cambios.push({ antes: ex, o: o }); }
      else { o.ID = "MAT-" + cat.ID; o.Referencia = cat.Referencia; o.Ubicacion = cat.Ubicacion; o.Stock_inicial = cat.Tipo === "Inventariable" ? cat.Por_perfusion : 0; o.Stock_minimo = cat.Tipo === "Inventariable" ? cat.Por_perfusion : 0; o.Activo = true; altas.push(o); }   // los equipos ya están en el laboratorio
    });
    // instrumental: las cajas pasan a «Inventariable» (categoría = caja) y a una ubicación válida
    var ins = H.filasCajas().filter(function (m) { return !H.fila("Material", m.ID); });
    lista.forEach(function (m) {
      if (usados[m.ID]) return; var o = { ID: m.ID }, c = categoriaNormal(m), hay = false;
      if (c !== m.Categoria) { o.Categoria = c; hay = true; } if (esInstrumental(m) && UB.indexOf(m.Ubicacion) === -1) { o.Ubicacion = UB[0]; hay = true; }
      if (hay) cambios.push({ antes: m, o: o, normaliza: true });
    });
    var renombres = cambios.filter(function (x) { return x.o.Nombre && x.o.Nombre !== x.antes.Nombre; });
    return { altas: altas, cambios: cambios, instrumental: ins, renombres: renombres };
  };
  H.acc.cargarCatalogo = function () {
    if (!H.puede("inventario")) { var g = H.gestoresInventario(); H.modal({ titulo: "Cargar el catálogo de material", cuerpo: "<p>El catálogo de referencia lo carga el <b>gestor de inventario</b>" + (g.length ? " (" + esc(g.map(function (u) { return u.Nombre || u.Email; }).join(", ")) + ")" : " (sin ninguno marcado, los administradores)") + ".</p><p>Si te encargas tú del material, pide a un administrador que marque tu casilla en Configuración › Inventario › Gestores.</p>", pie: '<button class="bt pri" data-cerrar>Entendido</button>' }); return; }
    var p = H.planCatalogo(), filas = p.altas.concat(p.cambios.map(function (x) { return x.o; })).concat(p.instrumental);
    if (!filas.length) { H.toast("El catálogo ya está cargado y normalizado."); return; }
    var cuerpo = "<p>Se cargará el catálogo de referencia del protocolo (" + C.CATALOGO.length + " productos, con referencia, regla de cantidad y ubicación). El stock no cambia.</p><ul>" +
      "<li><b>" + p.altas.length + "</b> productos nuevos (stock 0, salvo los equipos; indica después el stock y el mínimo).</li><li><b>" + p.cambios.filter(function (x) { return !x.normaliza; }).length + "</b> productos que ya estaban: se ponen el nombre, el tipo, la categoría y la regla del catálogo" + (p.renombres.length ? " (" + p.renombres.length + " cambian de nombre)" : "") + ".</li>" +
      "<li><b>" + p.cambios.filter(function (x) { return x.normaliza; }).length + "</b> productos con categoría antigua o ubicación no válida que se normalizan.</li><li><b>" + p.instrumental.length + "</b> instrumentos de las cajas donante y receptor (B. Braun).</li></ul>" +
      (p.renombres.length ? '<details class="plegable"><summary>Cambios de nombre</summary><div class="dentro"><ul>' + p.renombres.map(function (x) { return "<li>" + esc(x.antes.Nombre) + " → <b>" + esc(x.o.Nombre) + "</b></li>"; }).join("") + "</ul></div></details>" : "");
    H.modal({ titulo: "Cargar el catálogo de material", ancho: true, cuerpo: cuerpo, pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="catOk">' + ico("download") + "Cargar</button>",
      alAbrir: function (d) { d.querySelector("#catOk").addEventListener("click", function () { H.guardar("Material", filas); d.close(); H.toast("Catálogo cargado: " + p.altas.length + " nuevos, " + p.cambios.length + " actualizados" + (p.instrumental.length ? ", " + p.instrumental.length + " instrumentos" : "") + "."); }); } });
  };
  // las cajas de instrumental (v0.6) se dan de alta como inventariable, con la caja como categoría y una ubicación válida
  H.filasCajas = function () {
    return H.CAJAS.reduce(function (out, c) {
      return out.concat(c.items.map(function (x) { return { ID: "INS-" + c.id + "-" + x[0], Nombre: x[1], Categoria: c.nombre, Tipo: "Instrumental", Unidad: "unidad", Stock_inicial: x[2], Stock_minimo: x[2], Por_perfusion: x[2], Referencia: x[0], Proveedor: "B. Braun Surgical", Ubicacion: UB[0], Activo: true, Notas: c.ref, Regla: "fijo" }; }));
    }, []);
  };

  // ============================================================== 3. Días de perfusión (previstos y reales) y cantidades
  function diasPrevistos() { return C.num(((S.cfg && S.cfg.programacion) || C.DEF.programacion || {}).dias_perfusion) || 7; }
  function finPerf(e) { return (e && (e.Fin_perfusion || H.eventos(e.ID).fin_perfusion)) || null; }
  // {previstos, reales (null si no ha terminado), en_curso (días transcurridos), terminada, antes (terminó antes de lo previsto)}
  H.diasPerfusion = function (e) {
    var p = diasPrevistos(), ini = C.aFecha(H.inicioPerf(e.ID)), fin = C.aFecha(finPerf(e)), o = { previstos: p, reales: null, en_curso: null, terminada: false, antes: false };
    if (ini && fin && fin > ini) { o.reales = C.r((fin - ini) / 864e5, 2); o.terminada = true; o.antes = o.reales < p - 0.05; }
    else if (ini) o.en_curso = C.r((Date.now() - ini) / 864e5, 2);
    return o;
  };
  function bilisReal(e) { if (!S.medCargada || !S.medCargada[e.ID]) return null; var pts = {}; H.med(e.ID).forEach(function (m) { if (m.Muestra === "BILIS" && m.Valor !== "" && m.Valor !== null) pts[m.Punto] = 1; }); var n = Object.keys(pts).length; return n || null; }
  function ctxMaterial(e, dias, real) {
    var o = { dias: dias, tx: C.tipoProc(e) === "trasplante", circ: H.circadianoDe ? H.circadianoDe(e) : S.cfg.circadiano, protocolo: H.protocoloExp ? H.protocoloExp(e) : null, V_mL: H.Vperf ? H.Vperf(e.ID) : null, muestreo: S.cfg.muestreo };
    if (real) { var b = bilisReal(e); if (b !== null) o.bilisReal = b; }
    return o;
  }
  // cantidad para la perfusión: con regla (catálogo) se calcula; sin regla, la «cantidad por perfusión» de la ficha
  function cantidad(m, e, dias, real) {
    if (sinConsumo(m)) return 0;
    if (!m.Regla) { var b = C.num(m.Por_perfusion) || 0, pd = diasPrevistos(); return real && dias < pd - 0.05 && /^(Fungible de hemodiafiltración|HDF)$/.test(m.Categoria) ? Math.ceil(b * dias / pd - 1e-9) : b; }
    var c = C.cantidadMaterial(m, ctxMaterial(e, dias, real)); return c === null || c === undefined || !isFinite(c) ? 0 : C.r(c, 2);
  }
  H.cantidadPerfusion = function (m, e) { var dp = H.diasPerfusion(e); return { prevista: cantidad(m, e, dp.previstos, false), real: dp.terminada ? cantidad(m, e, dp.reales, true) : null, dias: dp }; };

  // ============================================================== 4. PREPARACIÓN del experimento (mismas pestañas que el inventario)
  function formChk(exp) { var d = H.copia(H.form(exp, "checklist", "") || {}); d.items = d.items || {}; return d; }
  function formIns(exp) { var d = H.copia(H.form(exp, "instrumental", "") || {}); d.cajas = d.cajas || {}; return d; }
  function consumibles() { return activos().filter(function (m) { return !sinConsumo(m); }); }
  H.tabsExp.preparacion = function (e, p) {
    var s = PESTANAS.some(function (x) { return x[0] === p[0]; }) ? p[0] : "quirurgico", idq = encodeURIComponent(e.ID), mats = activos(), n = {};
    mats.forEach(function (m) { var k = pestanaDe(m); n[k] = (n[k] || 0) + 1; });
    var sin = H.materialSinEsterilizar(e).length + cajasSinConfirmar(e).length;
    var seg = '<div class="segmentado sub2 prep-tabs" role="tablist">' + PESTANAS.map(function (x) { return '<button role="tab" aria-selected="' + (x[0] === s) + '" class="' + (x[0] === s ? "activo" : "") + '" data-act="irSub" data-r="exp/' + idq + "/preparacion/" + x[0] + '">' + ico(x[2], "s") + "<span>" + x[1] + '</span><span class="n">' + (n[x[0]] || 0) + "</span>" + (x[0] === "inventariable" && sin ? '<span class="punto-al" aria-label="Aviso de esterilización"></span>' : "") + "</button>"; }).join("") + "</div>";
    return '<div class="v7d-prep">' + seg + resumenChk(e) + tablaPestana(e, s) + (s === "inventariable" ? cajas(e) : "") + "</div>";
  };
  function resumenChk(e) {
    var d = formChk(e.ID), dp = H.diasPerfusion(e), mats = activos().filter(function (m) { return !esInstrumental(m); }), hechos = mats.filter(function (m) { return d.items[m.ID] && d.items[m.ID].ok; }).length, puedo = H.puede("registrar"), mov = H.puede("movimientos");
    var acc = !puedo ? "" : !mov ? (d.revisado_en ? '<span class="chip ok">Revisado ' + esc(H.fechaHora(d.revisado_en)) + "</span>" : '<button class="bt pri" data-act="chkRevisado" data-exp="' + esc(e.ID) + '">' + ico("clipboard-check") + "Marcar checklist como revisado</button>") :
      d.confirmado_en ? '<button class="bt peligro" data-act="chkDeshacer" data-exp="' + esc(e.ID) + '">' + ico("undo-2") + "Devolver al inventario</button>" : '<button class="bt pri" data-act="chkConfirmar" data-exp="' + esc(e.ID) + '">' + ico("package-check") + "Descontar del inventario</button>";
    var dias = "Perfusión prevista de <b>" + dp.previstos + " días</b>" + (dp.terminada ? " · duró <b>" + H.n(dp.reales, 1) + " días</b>" + (dp.antes ? ' <span class="chip aj">Terminó antes</span>' : "") : dp.en_curso !== null ? " · en curso (" + H.n(dp.en_curso, 1) + " días)" : "");
    var ajuste = "";
    if (d.confirmado_en && dp.terminada && !d.ajuste_en && mov) { var dif = difReal(e, d); if (dif.length) ajuste = aviso("aj", "<b>La perfusión ha durado " + H.n(dp.reales, 1) + " días</b>, no " + (d.dias_descuento || dp.previstos) + ": se descontó más material del que se ha usado en " + dif.length + " producto(s). " + '<button class="bt pri" data-act="chkAjustarReal" data-exp="' + esc(e.ID) + '">' + ico("refresh-cw", "s") + "Recalcular con los días reales</button>"); }
    if (d.ajuste_en) ajuste = aviso("ok", "Consumo recalculado con los " + H.n(d.ajuste_dias, 1) + " días reales el " + esc(H.fechaHora(d.ajuste_en)) + " (" + (d.ajuste_movs || []).length + " ajuste(s) en el inventario).");
    return '<div class="prep-resumen"><div><b>' + hechos + " / " + mats.length + "</b> comprobados · " + dias + (d.confirmado_en ? ' · <span class="chip ok">Descontado el ' + esc(H.fechaHora(d.confirmado_en)) + " por " + esc(d.confirmado_por || "") + "</span>" : "") + '</div><div class="fila-flex">' + acc + "</div></div>" + ajuste;
  }
  var INTRO = { quirurgico: "Material quirúrgico de un solo uso.", fungible: "Fungible de perfusión, de hemodiafiltración y general.", farmacos: "Fármacos, reactivos y soluciones.", inventariable: "Equipos y cajas de instrumental." };
  // v0.7.1: lo importante (cuándo se descuenta, cómo se calcula, qué no se consume) va en el botón (i)
  var INTRO_INFO = { quirurgico: "Se descuenta del inventario al pulsar «Descontar del inventario» (checklist confirmado).", fungible: "La cantidad se calcula con los días de perfusión y el plan de muestreo (tubos, microtubos, aceite mineral…). Si la perfusión termina antes, se recalcula con los días reales.",
    farmacos: "La cantidad es la que pide el protocolo para los días de perfusión. Este catálogo es el que se ofrece al actualizar la tabla de infusiones.", inventariable: "Se comprueban pero no se consumen. El instrumental se cuenta después de cada cirugía y las cajas deben estar esterilizadas el día de la perfusión." };
  var COLS = '<colgroup><col class="c-chk"><col class="c-mat"><col class="c-cant"><col class="c-real"><col class="c-stock"><col class="c-est"></colgroup>';
  function tablaPestana(e, s) {
    var d = formChk(e.ID), puedo = H.puede("registrar"), bloq = !!d.confirmado_en, dp = H.diasPerfusion(e), falta = [], mats = activos().filter(function (m) { return pestanaDe(m) === s && !esInstrumental(m); });
    var cab = '<div class="fila-flex prep-cab"><p class="muy-tenue">' + INTRO[s] + info(INTRO_INFO[s]) + "</p>" + (puedo ? '<span class="empuja"></span><button class="bt" data-act="chkTodoTab" data-exp="' + esc(e.ID) + '" data-tab="' + s + '"' + (bloq ? " disabled" : "") + ">" + ico("check-check", "s") + 'Marcar todo</button><button class="bt pri" data-act="anadirProducto" data-tab="' + s + '">' + ico("plus") + "Añadir</button>" : "") + "</div>";
    if (!mats.length) return cab + (s === "inventariable" ? "" : '<div class="vacio">' + ico(PESTANAS.filter(function (x) { return x[0] === s; })[0][2], "l") + "<p>No hay nada en esta pestaña todavía.</p><p class=\"tenue\">" + (H.puede("inventario") ? 'Carga el catálogo de referencia en <a href="#/inventario/' + s + '">Inventario</a> o pulsa «Añadir».' : "Pide al gestor de inventario que cargue el catálogo.") + "</p></div>");
    var html = porSeccion(mats, s).map(function (g) {
      return '<section class="tarjeta"><div class="cabecera"><h3>' + esc(g.nombre) + '</h3><span class="muy-tenue">' + g.items.length + ' producto(s)</span></div><div class="tabla-env"><table class="t tabla-chk v7">' + COLS + '<thead><tr><th><span class="sr">Comprobado</span></th><th>Material</th><th class="num">' + (s === "inventariable" ? "Necesario" : "Para " + dp.previstos + " días") + '</th><th class="num">' + (dp.terminada ? "Con " + H.n(dp.reales, 1) + " días reales" : "Días reales") + '</th><th class="num">Stock</th><th>Estado</th></tr></thead><tbody>' +
        g.items.sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); }).map(function (m) {
          var it = d.items[m.ID] || {}, cp = H.cantidadPerfusion(m, e), sc = sinConsumo(m), cant = sc ? 0 : it.cant !== undefined ? it.cant : cp.prevista, st = H.stockDe(m), min = C.num(m.Stock_minimo), quedan = st - (bloq ? 0 : cant);
          var est = sc ? (st > 0 ? '<span class="chip ok">Disponible</span>' : '<span class="chip al">No disponible</span>') : m.Regla === "a_demanda" ? '<span class="chip info">Solo si hace falta</span>' : st < cant && !bloq ? '<span class="chip al">Stock insuficiente</span>' : min !== null && quedan < min ? '<span class="chip aj">Quedará bajo mínimo</span>' : '<span class="chip ok">OK</span>';
          if (!sc && st < cant && !bloq) falta.push(m.Nombre);
          var regla = m.Regla ? C.reglaTexto(m.Regla) : "";
          return '<tr><td class="chk"><input type="checkbox" aria-label="Comprobado: ' + esc(m.Nombre) + '" data-cambio="chkItem" data-id="' + esc(m.ID) + '"' + (it.ok ? " checked" : "") + (puedo && !bloq ? "" : " disabled") + '></td><td><span class="nom">' + esc(m.Nombre) + "</span>" + (m.Referencia || regla ? '<span class="muy-tenue ref">' + (m.Referencia ? "Ref. " + esc(m.Referencia) : "") + (m.Referencia && regla ? " · " : "") + esc(regla) + "</span>" : "") + "</td>" +
            '<td class="num">' + (sc ? '<span class="muy-tenue">no se consume</span>' : '<span class="cant-u"><input type="text" inputmode="decimal" data-num="1" aria-label="Cantidad de ' + esc(m.Nombre) + '" value="' + esc(String(cant).replace(".", ",")) + '" data-cambio="chkCant" data-id="' + esc(m.ID) + '"' + (puedo && !bloq ? "" : " disabled") + "><span>" + esc(m.Unidad || "") + "</span></span>") + "</td>" +
            '<td class="num">' + (sc ? "—" : cp.real === null ? '<span class="muy-tenue">—</span>' : '<b class="' + (cp.real < cant ? "txt-aj" : "") + '">' + n1(cp.real) + "</b>") + '</td><td class="num">' + H.n(st, 1) + "</td><td>" + est + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }).join("");
    if (falta.length) html = aviso("al", "<b>Falta material:</b> " + esc(falta.join(", ")) + '. <a href="#/inventario/solicitudes">Solicitar compra</a>', "triangle-alert") + html;
    return cab + html;
  }
  H.acc.chkTodoTab = function (el) {
    var exp = el.getAttribute("data-exp"), s = el.getAttribute("data-tab"), d = H.usarForm(exp, "checklist", ""); d.items = d.items || {};
    activos().filter(function (m) { return pestanaDe(m) === s && !esInstrumental(m); }).forEach(function (m) { (d.items[m.ID] = d.items[m.ID] || {}).ok = true; });
    H.guardarForm(exp, "checklist", "", d);
  };
  // Descuento: cantidad indicada o calculada; si la perfusión ya terminó, la de los días reales
  H.acc.chkConfirmar = function (el) {
    if (!H.puede("movimientos")) return; var exp = el.getAttribute("data-exp"), e = H.exp(exp), d = H.usarForm(exp, "checklist", ""), dp = H.diasPerfusion(e), movs = [], desc = {};
    consumibles().forEach(function (m) { var it = (d.items || {})[m.ID] || {}, cp = H.cantidadPerfusion(m, e), c = it.cant !== undefined ? C.num(it.cant) : dp.terminada ? cp.real : cp.prevista; if (it.ok && c > 0) { desc[m.ID] = c; movs.push({ ID: H.uid(), Material: m.ID, Fecha: new Date().toISOString(), Cantidad: -c, Motivo: "Consumo perfusión", Experimento: exp, Nota: "Checklist " + exp + " (" + H.n(dp.terminada ? dp.reales : dp.previstos, 1) + " días)" }); } });
    if (!movs.length) { H.toast("Marca al menos un material con cantidad mayor que 0.", "error"); return; }
    H.confirmar("Descontar del inventario", "Se registrarán " + movs.length + " salidas de material asociadas a " + exp + (dp.terminada ? " con los " + H.n(dp.reales, 1) + " días reales de perfusión" : " para " + dp.previstos + " días de perfusión (si termina antes, se podrá recalcular)") + ". Si un material queda por debajo del mínimo se avisará al gestor de inventario.", "Descontar").then(function (ok) {
      if (!ok) return; d.confirmado_en = new Date().toISOString(); d.confirmado_por = (S.usuario || {}).nombre; d.movimientos = movs.map(function (m) { return m.ID; }); d.descontado = desc; d.dias_descuento = dp.terminada ? dp.reales : dp.previstos; if (dp.terminada) { d.ajuste_en = d.confirmado_en; d.ajuste_dias = dp.reales; d.ajuste_movs = []; }
      H.guardar("Movimientos", movs, { sinRepintar: true }); H.guardarForm(exp, "checklist", "", d, {}); H.toast("Material descontado."); H.pintarMarco(); H.repintar();
    });
  };
  function difReal(e, d) {
    var desc = d.descontado || {}, out = [];
    Object.keys(desc).forEach(function (id) { var m = H.fila("Material", id); if (!m) return; var it = (d.items || {})[id] || {}; if (it.cant !== undefined && !m.Regla && !/hemodiafiltr|^HDF$/i.test(m.Categoria)) return; var r = H.cantidadPerfusion(m, e).real; if (r === null) return; var dif = C.r(desc[id] - r, 2); if (Math.abs(dif) > 1e-9) out.push({ m: m, dif: dif, real: r }); });
    return out;
  }
  H.difConsumoReal = function (exp) { return difReal(H.exp(exp), formChk(exp)); };
  H.acc.chkAjustarReal = function (el) {
    if (!H.puede("movimientos")) return; var exp = el.getAttribute("data-exp"), e = H.exp(exp), d = H.usarForm(exp, "checklist", ""), dp = H.diasPerfusion(e), dif = difReal(e, d);
    if (!dif.length) { H.toast("El consumo ya coincide con los días reales."); return; }
    var movs = dif.map(function (x) { return { ID: H.uid(), Material: x.m.ID, Fecha: new Date().toISOString(), Cantidad: x.dif, Motivo: x.dif > 0 ? "Devolución (perfusión más corta)" : "Consumo perfusión (ajuste)", Experimento: exp, Nota: "Recalculado con " + H.n(dp.reales, 1) + " días reales" }; });
    H.confirmar("Recalcular con los días reales", "La perfusión duró " + H.n(dp.reales, 1) + " días. Se devolverán al inventario " + dif.filter(function (x) { return x.dif > 0; }).map(function (x) { return n1(x.dif) + " × " + x.m.Nombre; }).join("; ") + (dif.some(function (x) { return x.dif < 0; }) ? " y se descontará lo que falte" : "") + ".", "Recalcular").then(function (ok) {
      if (!ok) return; d.ajuste_en = new Date().toISOString(); d.ajuste_dias = dp.reales; d.ajuste_movs = movs.map(function (m) { return m.ID; });
      H.guardar("Movimientos", movs, { sinRepintar: true }); H.guardarForm(exp, "checklist", "", d, {}); H.toast(movs.length + " ajuste(s) registrados en el inventario."); H.pintarMarco(); H.repintar();
    });
  };
  H.acc.chkDeshacer = function (el) {
    var exp = el.getAttribute("data-exp"), d = H.usarForm(exp, "checklist", "");
    H.confirmar("Devolver al inventario", "Se anularán las salidas registradas por este checklist" + ((d.ajuste_movs || []).length ? " y sus ajustes" : "") + ".", "Devolver", true).then(function (ok) { if (!ok) return; H.borrar("Movimientos", (d.movimientos || []).concat(d.ajuste_movs || [])); ["confirmado_en", "confirmado_por", "descontado", "dias_descuento", "ajuste_en", "ajuste_dias", "ajuste_movs"].forEach(function (k) { delete d[k]; }); d.movimientos = []; H.guardarForm(exp, "checklist", "", d, {}); H.pintarMarco(); H.repintar(); });
  };

  // ---- Inventariable: cajas de instrumental (recuento y esterilización). El aviso de esterilización vive aquí.
  var EST_POST = ["Pendiente de esterilizar", "Enviada a esterilizar", "Esterilizada"];
  function cajasNecesarias(e) { return H.CAJAS.filter(function (c) { return !c.soloTx || C.tipoProc(e) === "trasplante"; }); }
  function itemsCaja(nombre) { return activos().filter(function (m) { return esInstrumental(m) && cajaDe(m) === nombre; }); }
  H.itemsCaja = itemsCaja;
  function terminada(e) { return !!e && (e.Estado === "Finalizado" || e.Estado === "Trasplante" || !!H.eventos(e.ID).fin_perfusion); }
  H.materialSinEsterilizar = function (e) {
    if (!terminada(e)) return []; var cj = (H.form(e.ID, "instrumental", "") || {}).cajas || {};
    return cajasNecesarias(e).filter(function (c) { return itemsCaja(c.nombre).length && (cj[c.nombre] || {}).post !== "Esterilizada"; }).map(function (c) { return c.nombre; });
  };
  // antes de la cirugía (hoy o mañana): cajas sin confirmar «estéril y precintada»
  function cajasSinConfirmar(e) {
    if (!e || terminada(e) || e.Estado === "Cancelado" || H.esHistorico && H.esHistorico(e) || !e.Fecha_cirugia) return [];
    var d = C.diasEntre(C.diaISO(new Date()), e.Fecha_cirugia); if (d === null || d < 0 || d > 1 || H.inicioPerf(e.ID)) return [];
    var cj = (H.form(e.ID, "instrumental", "") || {}).cajas || {};
    return cajasNecesarias(e).filter(function (c) { return itemsCaja(c.nombre).length && !(cj[c.nombre] || {}).pre; }).map(function (c) { return c.nombre; });
  }
  H.cajasSinConfirmar = cajasSinConfirmar;
  function cajas(e) {
    var puedo = H.puede("registrar"), d = formIns(e.ID), hay = activos().some(esInstrumental), tx = C.tipoProc(e) === "trasplante", fin = terminada(e), sc = cajasSinConfirmar(e);
    var cab = '<h3 class="sub v7d-sub">' + ico("briefcase-medical", "s") + " Cajas de instrumental y esterilización" + info("Todo el material que entra en el campo debe estar esterilizado el día de la perfusión. Antes de la cirugía se confirma que cada caja está estéril y precintada; después se cuenta cada pieza y se marca el estado de la esterilización. Si una caja no queda esterilizada, se avisa al equipo.") + "</h3>" +
      '<p class="muy-tenue">Antes: estéril y precintada · después: recuento y esterilización.</p>' +
      (sc.length ? aviso("aj", "<b>Cirugía " + (C.diasEntre(C.diaISO(new Date()), e.Fecha_cirugia) === 0 ? "hoy" : "mañana") + ":</b> confirma que " + esc(sc.join(" y ")) + (sc.length > 1 ? " están estériles y precintadas." : " está estéril y precintada."), "triangle-alert") : "");
    if (!hay) return cab + '<div class="vacio">' + ico("scissors", "l") + "<p>Todavía no están las cajas de instrumental en el catálogo.</p>" + (H.puede("inventario") ? '<button class="bt pri" data-act="cargarCajas">' + ico("download") + "Cargar las cajas donante y receptor (B. Braun)</button>" : '<p class="tenue">Pide al gestor de inventario que las cargue.</p>') + "</div>";
    var sueltos = activos().filter(function (m) { return esInstrumental(m) && cajaDe(m) === "Instrumental suelto"; });
    var bloques = H.CAJAS.filter(function (c) { return !c.soloTx || tx; }).map(function (c) { return { nombre: c.nombre, soloTx: c.soloTx, items: itemsCaja(c.nombre) }; }).concat(sueltos.length ? [{ nombre: "Instrumental suelto", items: sueltos }] : []);
    return cab + bloques.map(function (b) {
      if (!b.items.length) return "";
      var cj = d.cajas[b.nombre] || {}, rec = cj.recuento || {}, nec = !b.soloTx || tx, faltan = 0, contadas = 0, piezas = 0;
      var filas = b.items.map(function (m) {
        var esp = C.num(m.Por_perfusion) || 1, r = rec[m.ID], dif = r === undefined || r === null || r === "" ? null : C.num(r) - esp; piezas += esp; if (dif !== null) contadas++; if (dif !== null && dif < 0) faltan += -dif;
        return '<tr class="' + (dif !== null && dif < 0 ? "falta" : "") + '"><td class="ref"><span class="mono">' + esc(m.Referencia || "") + '</span></td><td><span class="nom">' + esc(m.Nombre) + '</span></td><td class="num">' + esp + '</td><td class="num"><input type="text" inputmode="numeric" data-num="1" aria-label="Recuento de ' + esc(m.Nombre) + '" value="' + (r === undefined || r === null ? "" : r) + '" placeholder="' + esp + '" data-cambio="insRecuento" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '" data-id="' + esc(m.ID) + '"' + (puedo ? "" : " disabled") + '></td><td class="num">' + (dif === null ? '<span class="muy-tenue">—</span>' : dif < 0 ? '<span class="chip al">Faltan ' + (-dif) + "</span>" : dif > 0 ? '<span class="chip aj">+' + dif + "</span>" : '<span class="chip ok">Completo</span>') + "</td></tr>";
      }).join("");
      var postSel = '<select aria-label="Estado de la esterilización de ' + esc(b.nombre) + '" data-cambio="insPost" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '"' + (puedo ? "" : " disabled") + '><option value="">— sin indicar —</option>' + EST_POST.map(function (x) { return "<option" + (cj.post === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>";
      var alerta = fin && nec && cj.post !== "Esterilizada" ? aviso("al", "<b>" + esc(b.nombre) + " sin esterilizar.</b> La perfusión ha terminado: márcala como «Esterilizada» cuando vuelva de esterilización.", "triangle-alert") : "";
      return '<section class="tarjeta caja-ins' + (nec ? "" : " no-necesaria") + '"><div class="cabecera"><h3>' + ico("briefcase-medical", "s") + esc(b.nombre) + '</h3><span class="muy-tenue">' + b.items.length + " referencias · " + piezas + " piezas</span>" + (b.soloTx ? '<span class="chip">' + (tx ? "Trasplante" : "Solo con trasplante") + "</span>" : "") + "</div>" + alerta +
        '<div class="rejilla tres caja-estado"><label class="campo check-campo"><span class="et">Antes de la cirugía</span><span class="check"><input type="checkbox" data-cambio="insPre" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '"' + (cj.pre ? " checked" : "") + (puedo ? "" : " disabled") + "> Caja estéril y precintada</span></label>" +
        '<div class="campo"><label class="et">Tras la cirugía</label>' + postSel + "</div>" +
        '<div class="campo"><span class="et">Recuento</span><div class="recuento-res">' + (contadas ? contadas + " de " + b.items.length + " contadas" + (faltan ? ' · <b class="txt-al">faltan ' + faltan + " pieza(s)</b>" : " · todo completo") : '<span class="muy-tenue">Sin contar todavía</span>') + "</div></div></div>" +
        '<div class="tabla-env"><table class="t tabla-ins"><colgroup><col class="c-ref"><col><col class="c-num"><col class="c-rec"><col class="c-dif"></colgroup><thead><tr><th>Código</th><th>Instrumento</th><th class="num">En la caja</th><th class="num">Recuento</th><th class="num">Diferencia</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
        (puedo ? '<div class="fila-flex caja-acc"><button class="bt" data-act="insContarTodo" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '">' + ico("check-check", "s") + "Está todo (recuento completo)</button>" + (faltan ? '<button class="bt pri" data-act="insComprar" data-exp="' + esc(e.ID) + '" data-caja="' + esc(b.nombre) + '">' + ico("shopping-cart", "s") + "Añadir lo que falta a la lista de compra</button>" : "") + (cj.solicitado_en ? '<span class="chip info">Pedido a compras el ' + esc(H.fechaHora(cj.solicitado_en)) + "</span>" : "") + "</div>" : "") + "</section>";
    }).join("");
  }
  function guardarIns(exp, fn) { var d = formIns(exp); fn(d); d.actualizado_por = (S.usuario || {}).nombre || ""; H.guardarForm(exp, "instrumental", "", d); return d; }
  function caja(d, n) { return d.cajas[n] = d.cajas[n] || {}; }
  H.acc.insRecuento = function (el) {
    var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"), id = el.getAttribute("data-id"), v = String(el.value).trim();
    guardarIns(exp, function (d) { var c = caja(d, n); c.recuento = c.recuento || {}; if (v === "") delete c.recuento[id]; else c.recuento[id] = C.num(v); c.contado_en = new Date().toISOString(); });
    preguntarCompra(exp, n);
  };
  H.acc.insContarTodo = function (el) { var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"); guardarIns(exp, function (d) { var c = caja(d, n); c.recuento = c.recuento || {}; itemsCaja(n).forEach(function (m) { if (c.recuento[m.ID] === undefined || c.recuento[m.ID] === null) c.recuento[m.ID] = C.num(m.Por_perfusion) || 1; }); c.contado_en = new Date().toISOString(); }); };
  H.acc.insPre = function (el) { var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"), v = el.checked; guardarIns(exp, function (d) { caja(d, n).pre = v; caja(d, n).pre_en = new Date().toISOString(); }); };
  H.acc.insPost = function (el) { var exp = el.getAttribute("data-exp"), n = el.getAttribute("data-caja"), v = el.value; guardarIns(exp, function (d) { caja(d, n).post = v; caja(d, n).post_en = new Date().toISOString(); }); avisoMaterial(H.exp(exp)); };
  function faltantes(exp, n) { var c = ((H.form(exp, "instrumental", "") || {}).cajas || {})[n] || {}, rec = c.recuento || {}; return itemsCaja(n).map(function (m) { var r = rec[m.ID]; return r === undefined || r === null || r === "" ? null : { m: m, n: (C.num(m.Por_perfusion) || 1) - C.num(r) }; }).filter(function (x) { return x && x.n > 0; }); }
  var preguntado = {};
  function preguntarCompra(exp, n) {
    var f = faltantes(exp, n), k = exp + "|" + n + "|" + f.map(function (x) { return x.m.ID + ":" + x.n; }).join(","); if (!f.length || preguntado[k] || !H.puede("solicitar")) return; preguntado[k] = 1;
    H.confirmar("Falta material en la " + n.toLowerCase(), "Faltan " + f.map(function (x) { return x.n + " × " + x.m.Nombre; }).join("; ") + ". ¿Quieres añadirlo a la lista de compra?", "Añadir a la lista de compra").then(function (ok) { if (ok) comprar(exp, n); });
  }
  function comprar(exp, n) {
    var f = faltantes(exp, n); if (!f.length) return;
    H.guardar("Solicitudes", f.map(function (x) { return { ID: H.uid(), Fecha: new Date().toISOString(), Solicitante: (S.usuario || {}).nombre || "", Material: x.m.ID, Cantidad: x.n, Urgencia: "Normal", Motivo: "Falta en la " + n.toLowerCase() + " tras " + exp + " (recuento)", Estado: "Pendiente" }; }), { sinRepintar: true });
    guardarIns(exp, function (d) { caja(d, n).solicitado_en = new Date().toISOString(); }); H.toast(f.length + " producto(s) añadidos a la lista de compra.");
  }
  H.acc.insComprar = function (el) { comprar(el.getAttribute("data-exp"), el.getAttribute("data-caja")); };
  H.acc.cargarCajas = function () {
    if (!H.puede("inventario")) return; var filas = H.filasCajas().filter(function (m) { return !H.fila("Material", m.ID); });
    H.confirmar("Cargar las cajas de instrumental", "Se añadirán " + filas.length + " instrumentos al inventariable (caja donante y caja receptor, según las ofertas de B. Braun). No se descuentan del inventario: se cuentan después de cada cirugía.", "Cargar").then(function (ok) { if (ok) { H.guardar("Material", filas); H.toast("Cajas de instrumental cargadas."); } });
  };
  function avisoMaterial(e) {
    if (!e || !H.programarAvisos || !H.puede("registrar")) return; var sin = H.materialSinEsterilizar(e);
    H.programarAvisos(e.ID, sin.length ? [{ ID: e.ID + "|material", Experimento: e.ID, Fecha_hora: new Date().toISOString(), Tipo: "material", Titulo: "Material sin esterilizar · " + e.ID, Texto: sin.join(" y ") + ": hay que esterilizar(la) tras la cirugía. Márcalo en Preparación → Inventariable.", Destino: "equipo", Vista: "exp:" + e.ID + ":preparacion" }] : [], ["material"]);
  }
  H.avisoMaterial = avisoMaterial;
  // el aviso que programa la v0.6 al cerrar la perfusión apunta ahora a la pestaña Inventariable
  var progAv = H.programarAvisos;
  if (progAv) H.programarAvisos = function (exp, avisos, tipos) {
    (avisos || []).forEach(function (a) { if (a && a.Tipo === "material") { a.Texto = String(a.Texto || "").replace("Preparación → Material quirúrgico", "Preparación → Inventariable"); a.Titulo = String(a.Titulo || "").replace("Material quirúrgico sin esterilizar", "Material sin esterilizar"); } });
    return progAv.apply(this, arguments);
  };
  // campana: esterilización (Inventariable), cajas sin confirmar antes de la cirugía y pedidos solo para los gestores
  var accOrig = H.alertasAccion;
  H.alertasAccion = function () {
    var out = (accOrig ? accOrig() : []).map(function (x) { if (/^ins\|/.test(x.id)) { x.href = String(x.href || "").replace("/preparacion/quirurgico", "/preparacion/inventariable"); x.titulo = String(x.titulo).replace("Material quirúrgico sin esterilizar", "Material sin esterilizar"); } if (/^ped\|/.test(x.id)) x.href = "#/config/inventario/pedidos"; return x; });
    if (!H.esGestorInv()) out = out.filter(function (x) { return !/^ped\|/.test(x.id); });
    else if (!H.esAdmin()) H.filas("Pedidos").filter(function (p) { return p.Estado === "Borrador"; }).forEach(function (p) { out.push({ id: "ped|" + p.ID, t: C.aFecha(p.Fecha) || new Date(), icono: "mail", titulo: "Pedido en borrador por revisar", texto: p.ID + (p.Proveedor ? " · " + p.Proveedor : ""), href: "#/config/inventario/pedidos", tipo: "accion" }); });
    if (H.puede("registrar")) H.listaExp().forEach(function (e) { var sc = cajasSinConfirmar(e); if (sc.length) out.push({ id: "pre|" + e.ID + "|" + sc.join(","), t: new Date(), icono: "briefcase-medical", titulo: "Confirmar la esterilización · " + e.ID, texto: sc.join(", ") + " sin marcar «estéril y precintada»", href: "#/exp/" + encodeURIComponent(e.ID) + "/preparacion/inventariable", tipo: "accion" }); });
    return out;
  };

  // ============================================================== 5. Añadir y editar material (ubicaciones fijas, categorías nuevas)
  function campo(id, et, html, ayuda) { return '<div class="campo"><label class="et" for="' + id + '">' + et + "</label>" + html + (ayuda ? '<div class="ayuda">' + ayuda + "</div>" : "") + "</div>"; }
  function selUbic(id, v, dis) { var ok = UB.indexOf(v) !== -1; return '<select id="' + id + '"' + (dis ? " disabled" : "") + ">" + (ok || !v ? "" : '<option value="' + esc(v) + '" selected>' + esc(v) + " (no válida)</option>") + UB.map(function (u, i) { return '<option value="' + esc(u) + '"' + (v === u || (!v && i === 0) ? " selected" : "") + ">" + esc(u) + "</option>"; }).join("") + "</select>"; }
  H.selectUbicacion = selUbic;
  H.acc.anadirProducto = function (el) {
    var s = el.getAttribute("data-tab") || "fungible", ges = H.puede("inventario"), tipos = { quirurgico: ["Fungible"], fungible: ["Fungible", "Solución"], farmacos: ["Fármaco", "Reactivo", "Solución"], inventariable: ["Inventariable", "Instrumental"] }[s] || ["Fungible"];
    var cats = SECCIONES[s].filter(function (c) { return CAJAS_N().indexOf(c) === -1 && c !== "Instrumental suelto"; }).map(function (c) { return c === "Material quirúrgico de un solo uso" ? "Material quirúrgico" : c; });
    if (s === "inventariable") cats = ["Equipos"].concat(CAJAS_N(), ["Instrumental suelto"]);
    var cuerpo = (ges ? "" : aviso("info", "El catálogo lo gestiona el gestor de inventario: se enviará como <b>solicitud de alta de producto</b>.")) +
      '<div class="rejilla dos">' + campo("apN", "Nombre del producto" + info("Nombre en español con el formato del catálogo: nombre genérico + marca o modelo + dosis o concentración + envase (p. ej. «Hemofiltro HF03», «Taurocolato sódico hidratado 25 g»)."), '<input id="apN" autocomplete="off" placeholder="' + (s === "farmacos" ? "Principio activo, marca, concentración y envase…" : "Nombre…") + '">') +
      campo("apT", "Tipo", '<select id="apT">' + tipos.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select>") +
      campo("apC", "Sección", '<select id="apC">' + cats.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + "</select>") +
      campo("apU", "Unidad", '<input id="apU" value="' + (s === "farmacos" ? "vial" : "unidad") + '" autocomplete="off">') +
      campo("apP", s === "inventariable" ? "Unidades o piezas" : "Cantidad por perfusión (7 días)", '<input id="apP" inputmode="decimal" data-num="1" value="1">') +
      campo("apS", "Stock actual", '<input id="apS" inputmode="decimal" data-num="1" value="0">') +
      campo("apR", "Referencia", '<input id="apR" autocomplete="off" placeholder="Código del proveedor…">') + campo("apM", "Stock mínimo", '<input id="apM" inputmode="decimal" data-num="1" value="0">') +
      campo("apUb", "Ubicación", selUbic("apUb", "")) + "</div>" + '<div class="msg-error" id="apErr" role="alert"></div>';
    H.modal({ titulo: "Añadir a «" + PESTANAS.filter(function (x) { return x[0] === s; })[0][1] + "»", ancho: true, cuerpo: cuerpo, pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="apOk">' + ico("plus") + (ges ? "Añadir al catálogo" : "Enviar la solicitud") + "</button>",
      alAbrir: function (d) {
        d.querySelector("#apOk").addEventListener("click", function () {
          var g = function (id) { var x = d.querySelector("#" + id); return x ? x.value.trim() : ""; }, nom = g("apN");
          if (nom.length < 2) { d.querySelector("#apErr").textContent = "Escribe el nombre del producto."; return; }
          if (ges) {
            var cat = g("apC") || cats[0], m = { ID: "MAT-" + H.uid(), Nombre: nom, Tipo: CAJAS_N().indexOf(cat) !== -1 || cat === "Instrumental suelto" ? "Instrumental" : g("apT"), Categoria: cat, Unidad: g("apU") || "unidad", Por_perfusion: C.num(g("apP")) || 0, Stock_inicial: C.num(g("apS")) || 0, Stock_minimo: C.num(g("apM")) || 0, Referencia: g("apR"), Activo: true, Ubicacion: g("apUb") || UB[0] };
            H.guardar("Material", [m]); d.close(); H.toast("«" + nom + "» añadido al catálogo.");
          } else {
            H.guardar("Solicitudes", [{ ID: H.uid(), Fecha: new Date().toISOString(), Solicitante: (S.usuario || {}).nombre || "", Nombre_nuevo: nom, Categoria: g("apC"), Cantidad: C.num(g("apS")) || 1, Urgencia: "Normal", Motivo: "Alta de producto en " + s + (g("apR") ? " · ref. " + g("apR") : "") + " · " + g("apUb"), Estado: "Pendiente" }]); d.close(); H.toast("Solicitud enviada.");
          }
        });
      } });
  };
  H.acc.editarMat = function (el) {
    var id = el && el.getAttribute && el.getAttribute("data-id"), m = id ? H.fila("Material", id) : { ID: "MAT-" + H.uid(), Activo: true, Stock_inicial: 0, Tipo: "Fungible", Categoria: "Fungible general", Ubicacion: UB[0] }, ges = H.puede("inventario"), nuevo = !id;
    if (!m) return;
    function val(k) { return m[k] === undefined || m[k] === null ? "" : m[k]; }
    function f(k, et, o) { o = o || {}; return campo("em_" + k, et, '<input id="em_' + k + '"' + (o.tipo ? ' type="' + o.tipo + '"' : "") + (o.num ? ' inputmode="decimal" data-num="1"' : "") + ' value="' + esc(String(val(k)).replace(o.num ? "." : "\u0000", ",")) + '" autocomplete="off"' + (o.dis || !ges ? " disabled" : "") + ">", o.ayuda); }
    function sel(k, et, ops, nombres) { var v = val(k) || ops[0]; if (ops.indexOf(v) === -1) ops = [v].concat(ops); return campo("em_" + k, et, '<select id="em_' + k + '"' + (ges ? "" : " disabled") + ">" + ops.map(function (c, i) { return '<option value="' + esc(c) + '"' + (v === c ? " selected" : "") + ">" + esc((nombres && nombres[i]) || c || "—") + "</option>"; }).join("") + "</select>"); }
    var cat = H.buscarEnCatalogo(m), hist = H.expedientesHist(m), ex = H.expedienteEstado(m), inactivo = m.Activo === false || m.Activo === "FALSE";
    var expHTML = '<h3 class="sub">Tipo y vía de suministro' + info("Inventariable e instrumental: no se consumen ni se reponen. Farmacia: entra en la lista descargable para la farmacia del hospital. Contrato menor (CM) o licitación: genera pedidos al proveedor con el nº de expediente; las unidades restantes = adjudicadas − consumidas antes de HOME − pedidas desde HOME. Cuando el expediente se acaba, abre uno nuevo: el anterior queda en el historial.") + "</h3>" +
      '<div class="rejilla dos">' + sel("Tipo", "Tipo", H.TIPOS_MAT) + sel("Via", "Vía de suministro", H.VIAS_MAT) + f("Expediente", "Nº de expediente (CM o licitación)") + f("Expediente_inicio", "Inicio del expediente", { tipo: "date" }) +
      f("Unidades_contrato", "Unidades adjudicadas en el expediente", { num: 1 }) + f("Unidades_previas", "Consumidas antes de registrar en HOME" + info("Unidades de este expediente que ya se pidieron o gastaron antes de empezar a usar HOME. Se restan de las adjudicadas."), { num: 1 }) +
      f("Email_proveedor", "Correo del proveedor para los pedidos") + "</div>" + (ex ? expedienteResumen(m, ex) : "") +
      (ges && !nuevo ? '<div class="fila-flex v71-exp-acc"><button type="button" class="bt" data-act="expNuevo" data-id="' + esc(m.ID) + '">' + ico("folder-plus", "s") + "Abrir un nuevo expediente (CM o licitación)</button></div>" : "") +
      (hist.length ? '<details class="plegable v71-hist"' + (ex && ex.estado === "al" ? " open" : "") + "><summary>Historial de expedientes (" + hist.length + ')</summary><div class="dentro"><div class="tabla-env"><table class="t tabla-exp"><thead><tr><th>Expediente</th><th>Vía</th><th>Inicio</th><th>Cierre</th><th class="num">Adjudicadas</th><th class="num">Consumidas</th><th class="num">Restantes</th><th>Cerrado por</th></tr></thead><tbody>' +
        hist.slice().reverse().map(function (x) { var cons = (C.num(x.Previas) || 0) + (C.num(x.Pedidas) || 0), adj = C.num(x.Adjudicadas); return "<tr><td><b>" + esc(x.Expediente || "—") + "</b></td><td>" + esc(x.Via || "") + "</td><td>" + esc(x.Inicio ? H.fechaDMA(x.Inicio) : "—") + "</td><td>" + esc(x.Fin ? H.fechaDMA(x.Fin) : "—") + '</td><td class="num">' + H.n(adj, 0) + '</td><td class="num">' + H.n(cons, 0) + '</td><td class="num">' + (adj === null ? "—" : H.n(adj - cons, 0)) + "</td><td>" + esc(x.Cerrado_por || "") + "</td></tr>"; }).join("") + "</tbody></table></div></div></details>" : "");
    var cuerpo = (ges ? "" : soloGestor()) + (inactivo ? aviso("aj", "<b>Dado de baja</b>: no aparece en el inventario ni en la preparación. Sus movimientos se conservan.", "archive") : "") +
      '<div class="rejilla dos">' + f("Nombre", "Nombre", { ayuda: cat && cat.Nombre !== m.Nombre ? "En el catálogo: «" + esc(cat.Nombre) + "»." : "" }) + sel("Categoria", "Sección", H.CATS_MAT) + f("Unidad", "Unidad") + f("Referencia", "Referencia") + f("Proveedor", "Proveedor") +
      campo("em_Ubicacion", "Ubicación", selUbic("em_Ubicacion", m.Ubicacion, !ges)) +
      f("Stock_inicial", "Stock inicial", { num: 1, dis: !nuevo, ayuda: "Stock actual = inicial + entradas − consumos." }) + f("Stock_minimo", "Stock mínimo (alerta)", { num: 1 }) + f("Por_perfusion", "Cantidad por perfusión (7 días)", { num: 1, ayuda: "Para la regla «fija» y para la reposición." }) +
      reglaCampo(m, ges) + f("Notas", "Notas") + "</div>" + expHTML +
      (ges && !nuevo ? '<label class="check"><input type="checkbox" id="em_Activo"' + (inactivo ? "" : " checked") + "> Activo (desmarca para darlo de baja)</label>" : "");
    var pie = '<button class="bt" data-cerrar>' + (ges ? "Cancelar" : "Cerrar") + "</button>" + (ges && !nuevo ? '<button class="bt peligro v71-borrar" id="emDel">' + ico("trash-2", "s") + (H.movimientosDe(m.ID).length ? "Dar de baja" : "Eliminar") + "</button>" : "") + (ges ? '<button class="bt pri" id="emOk">Guardar</button>' : "");
    H.modal({ titulo: nuevo ? "Nuevo material" : (ges ? "Editar " : "Ficha de ") + m.Nombre, ancho: true, cuerpo: cuerpo, pie: pie,
      alAbrir: function (d) {
        reglaEnlazar(d, m); var del = d.querySelector("#emDel"); if (del) del.addEventListener("click", function () { d.close(); H.matEliminar(m.ID); });
        var ok = d.querySelector("#emOk"); if (!ok) return; ok.addEventListener("click", function () {
        var o = { ID: m.ID }; ["Nombre", "Categoria", "Unidad", "Referencia", "Proveedor", "Ubicacion", "Notas", "Tipo", "Via", "Expediente", "Expediente_inicio", "Email_proveedor"].forEach(function (k) { o[k] = d.querySelector("#em_" + k).value.trim(); });
        o.Regla = reglaLeer(d, m); o.Unidades_contrato = C.num(d.querySelector("#em_Unidades_contrato").value); o.Unidades_previas = C.num(d.querySelector("#em_Unidades_previas").value);
        if (o.Unidades_previas !== null && o.Unidades_previas < 0) { H.toast("Las unidades consumidas antes de HOME no pueden ser negativas.", "error"); return; }
        ["Stock_inicial", "Stock_minimo", "Por_perfusion"].forEach(function (k) { var i = d.querySelector("#em_" + k); if (!i.disabled) o[k] = C.num(i.value); }); var ac = d.querySelector("#em_Activo"); if (ac) o.Activo = ac.checked; else if (nuevo) o.Activo = true;
        if (CAJAS_N().indexOf(o.Categoria) !== -1 || o.Categoria === "Instrumental suelto") o.Tipo = "Instrumental";
        if (!o.Nombre) { H.toast("El nombre es obligatorio.", "error"); return; } H.guardar("Material", [o]); d.close(); }); } });
  };
  H.acc.verMat = function (el) { return H.acc.editarMat(el); };
  H.acc.matUbic = function (el) { if (!H.puede("inventario")) return; H.guardar("Material", [{ ID: el.getAttribute("data-id"), Ubicacion: el.value }], { sinRepintar: true }); H.toast("Ubicación actualizada."); };

  // ============================================================== 6. INVENTARIO: mismas pestañas que la Preparación, tablas iguales
  var vInv0 = H.vistas.inventario, TABS_V3 = ["stock"];
  H.tabsInv = function () { var t = [["farmacia", "Farmacia", "pill"]]; if (H.puede("movimientos")) t.push(["recuento", "Recuento", "clipboard-check"]); return t; };
  var invRecuento = H.invExtra.recuento;
  H.invExtra.recuento = function () { if (!H.puede("movimientos")) return aviso("al", "El recuento lo hace el gestor de inventario."); var keep = H.esAdmin; H.esAdmin = function () { return true; }; try { return invRecuento(); } finally { H.esAdmin = keep; } };
  var invPedidos = H.invExtra.pedidos;
  function pedidosHTML() {
    if (!H.esGestorInv() && !H.esAdmin()) return aviso("al", "Los pedidos solo los ven el gestor de inventario y los administradores.");
    var keep = H.esAdmin; H.esAdmin = function () { return true; }; var h; try { h = invPedidos(); } finally { H.esAdmin = keep; }
    if (!H.esGestorInv()) h = soloGestor("Solo lectura: los pedidos los revisa y envía") + h.replace(/<button class="bt[^"]*" data-act="(pedGenerar|pedManual|pedEnviar|pedCancelar|pedRecibir)"/g, function (x) { return x.replace("<button ", "<button disabled "); }).replace(/data-cambio="pedLinea"/g, 'data-cambio="pedLinea" disabled');
    return h;
  }
  H.invExtra.pedidos = function () { return aviso("info", 'Los pedidos están ahora en <a href="#/config/inventario/pedidos">Configuración › Inventario › Pedidos</a>.') + pedidosHTML(); };
  H.vistas.inventario = function (p, q) {
    var s = p[0] || "quirurgico"; if (TABS_V3.indexOf(s) !== -1) s = "quirurgico";
    var esCat = PESTANAS.some(function (x) { return x[0] === s; });
    if (!esCat) {   // solicitudes, movimientos, farmacia, recuento, pedidos: la vista anterior con las pestañas nuevas
      var h = vInv0(p, q); return h.replace(/<nav class="pestanas">[\s\S]*?<\/nav>/, navInv(s)).replace(/(<h1>Inventario<\/h1>)/, "$1" + botonesInv());
    }
    var h2 = vInv0(["stock"], q).replace(/<nav class="pestanas">[\s\S]*$/, "");
    return h2.replace(/(<h1>Inventario<\/h1>)/, "$1" + botonesInv()) + navInv(s) + stockPestana(s) + "</div>";
  };
  // v0.7.1: «Cargar catálogo» visible para todos (sin ser gestor, explica quién lo carga) y con aviso si faltan productos del catálogo
  function botonesInv() { return '<button class="bt v71-cat" data-act="cargarCatalogo"' + (H.puede("inventario") ? "" : ' aria-describedby="v71CatNo"') + ">" + ico("list-checks") + "Cargar catálogo</button>" + (H.esGestorInv() || H.esAdmin() ? '<a class="bt" href="#/config/inventario">' + ico("settings") + "Gestión del inventario</a>" : ""); }
  function navInv(s) {
    var mats = activos(), n = {}; mats.forEach(function (m) { var k = pestanaDe(m); n[k] = (n[k] || 0) + 1; });
    var solP = H.filas("Solicitudes").filter(function (x) { return x.Estado === "Pendiente"; }).length;
    var tabs = PESTANAS.map(function (x) { return [x[0], x[1], x[2], n[x[0]] || 0]; }).concat([["solicitudes", "Solicitudes" + (solP ? " (" + solP + ")" : ""), "shopping-cart"], ["movimientos", "Movimientos", "history"]]).concat(H.tabsInv());
    return '<nav class="pestanas inv-tabs">' + tabs.map(function (t) { return '<a href="#/inventario/' + t[0] + '" class="' + (t[0] === s ? "activo" : "") + '"' + (t[0] === s ? ' aria-current="page"' : "") + ">" + ico(t[2], "s") + t[1] + (t[3] !== undefined ? ' <span class="n">' + t[3] + "</span>" : "") + "</a>"; }).join("") + "</nav>";
  }
  var COLS_INV = '<colgroup><col class="c-mat"><col class="c-ub"><col class="c-st"><col class="c-n"><col class="c-n"><col class="c-n"><col class="c-niv"><col class="c-acc"></colgroup>';
  function stockPestana(s) {
    var mats = activos().filter(function (m) { return pestanaDe(m) === s; }), ges = H.puede("inventario"), mov = H.puede("movimientos");
    var bajo = activos().filter(function (m) { var mn = C.num(m.Stock_minimo); return !sinConsumo(m) && mn !== null && H.stockDe(m) < mn; });
    var malUb = activos().filter(function (m) { return UB.indexOf(m.Ubicacion) === -1; });
    var cab = (bajo.length ? aviso("aj", "<b>" + bajo.length + " material(es) por debajo del mínimo:</b> " + esc(bajo.map(function (m) { return m.Nombre; }).join(", ")) + ". El gestor de inventario recibe un aviso al cruzar el mínimo.", "triangle-alert") : "") +
      (malUb.length && ges ? aviso("info", "<b>" + malUb.length + " material(es) sin una ubicación válida.</b> Elige en la columna «Ubicación» uno de los tres sitios: " + esc(UB.join(" · ")) + ".") : "") + (ges ? avisoCatalogo() + avisoExpedientes() : soloGestor());
    var bajas = H.filas("Material").filter(function (m) { return (m.Activo === false || m.Activo === "FALSE") && pestanaDe(m) === s; });
    if (!mats.length) return cab + bajasHTML(bajas, ges) + '<div class="vacio">' + ico("package", "l") + "<p>No hay material en esta pestaña.</p>" + (ges ? '<p class="tenue">Pulsa «Cargar catálogo» para incorporar todo el material del protocolo, o «Nuevo material».</p>' : "") + "</div>";
    return cab + porSeccion(mats, s).map(function (g) {
      return '<section class="tarjeta"><div class="cabecera"><h2>' + esc(g.nombre) + '</h2><span class="chip">' + g.items.length + '</span></div><div class="tabla-env"><table class="t tabla-inv">' + COLS_INV + '<thead><tr><th>Material</th><th>Ubicación</th><th class="num">Stock</th><th class="num">Mínimo</th><th class="num">' + (s === "inventariable" ? "Unidades" : "Por perfusión") + '</th><th class="num">Perfusiones</th><th>Nivel</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>' +
        g.items.sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); }).map(function (m) {
          var st = H.stockDe(m), mn = C.num(m.Stock_minimo), pp = C.num(m.Por_perfusion), sc = sinConsumo(m), niv = st <= 0 ? "al" : mn !== null && st < mn ? "aj" : "", ancho = mn ? Math.min(100, st / (mn * 2) * 100) : 100, nivT = niv === "al" ? "Agotado" : niv ? "Bajo mínimo" : "Correcto";
          return '<tr data-id="' + esc(m.ID) + '"><td><span class="nom"><b>' + esc(m.Nombre) + "</b></span>" + (H.chipsMat ? H.chipsMat(m) : "") + '<span class="muy-tenue ref">' + (m.Referencia ? "Ref. " + esc(m.Referencia) : "") + (m.Regla && !sc ? (m.Referencia ? " · " : "") + esc(C.reglaTexto(m.Regla)) : "") + "</span></td>" +
            "<td>" + (ges ? '<select class="sel-ub" aria-label="Ubicación de ' + esc(m.Nombre) + '" data-cambio="matUbic" data-id="' + esc(m.ID) + '">' + (UB.indexOf(m.Ubicacion) === -1 ? '<option value="" selected>— elige —</option>' : "") + UB.map(function (u) { return "<option" + (u === m.Ubicacion ? " selected" : "") + ">" + esc(u) + "</option>"; }).join("") + "</select>" : '<span class="' + (UB.indexOf(m.Ubicacion) === -1 ? "muy-tenue" : "") + '">' + esc(m.Ubicacion || "—") + "</span>") + "</td>" +
            '<td class="num"><b>' + H.n(st, 1) + "</b> " + esc(m.Unidad || "") + '</td><td class="num">' + H.n(mn, 1) + '</td><td class="num">' + H.n(pp, 1) + '</td><td class="num">' + (!sc && pp ? H.n(Math.floor(st / pp), 0) : "—") + "</td>" +
            '<td><div class="barra-stock ' + niv + '" title="' + nivT + '"><i style="width:' + ancho + '%"></i></div><span class="sr">' + nivT + "</span></td>" +
            '<td><div class="acc-mat">' + (mov && !sc ? '<button class="bt mini" data-act="movMat" data-id="' + esc(m.ID) + '" data-s="1" aria-label="Entrada de ' + esc(m.Nombre) + '">' + ico("plus", "s") + '</button><button class="bt mini" data-act="movMat" data-id="' + esc(m.ID) + '" data-s="-1" aria-label="Consumo de ' + esc(m.Nombre) + '">' + ico("minus", "s") + "</button>" : "") +
            (ges ? '<button class="bt mini" data-act="editarMat" data-id="' + esc(m.ID) + '" aria-label="Editar ' + esc(m.Nombre) + '">' + ico("pencil", "s") + "</button>" : '<button class="bt mini" data-act="verMat" data-id="' + esc(m.ID) + '" aria-label="Ver la ficha de ' + esc(m.Nombre) + '">' + ico("info", "s") + "</button>") +
            (H.puede("solicitar") ? '<button class="bt mini" data-act="nuevaSol" data-id="' + esc(m.ID) + '" aria-label="Solicitar ' + esc(m.Nombre) + '">' + ico("shopping-cart", "s") + "</button>" : "") + "</div></td></tr>";
        }).join("") + "</tbody></table></div></section>";
    }).join("") + bajasHTML(bajas, ges);
  }

  // ============================================================== 7. CONFIGURACIÓN › INVENTARIO (antes «Reposición» + «Pedidos») y PROEX
  // Opción elegida: casilla «Gestor de inventario» por usuario (ADMIN o INVESTIGADOR; puede haber varios). Solo los gestores tocan
  // Material y Pedidos, envían la reposición y los pedidos; si no hay ninguno, actúan los administradores (respaldo).
  // Los parámetros (Config) los sigue guardando un administrador, como el resto de la configuración.
  var repHTML0 = H.reposicionHTML;
  H.reposicionHTML = function () {
    if (!repHTML0 || !(H.esGestorInv() || H.esAdmin())) return ""; var keep = H.esAdmin; H.esAdmin = function () { return true; }; var h; try { h = repHTML0(); } finally { H.esAdmin = keep; }
    return h.replace('href="#/config/reposicion"', 'href="#/config/inventario/reposicion"');
  };
  var SUBINV = [["reposicion", "Reposición", "mail"], ["pedidos", "Pedidos", "send"], ["gestores", "Gestores", "user-check"]];
  function seccionInventario(sub) {
    sub = SUBINV.some(function (x) { return x[0] === sub; }) ? sub : "reposicion";
    var ges = H.esGestorInv(), adm = H.esAdmin(), g = H.gestoresInventario(), nb = H.filas("Pedidos").filter(function (p) { return p.Estado === "Borrador"; }).length;
    var estado = adm || H.filas("Usuarios").length ? (g.length ? aviso("ok", "<b>Gestor(es) de inventario:</b> " + esc(g.map(function (u) { return u.Nombre || u.Email; }).join(", ")) + ". Solo ellos editan el material, la reposición y los pedidos.") : aviso("aj", "<b>No hay ningún gestor de inventario:</b> mientras tanto lo gestionan todos los administradores (respaldo). Marca la casilla de la persona encargada en «Gestores».", "triangle-alert")) :
      aviso(ges ? "ok" : "info", ges ? "Eres <b>gestor de inventario</b>." : "No eres gestor de inventario: esta sección es de solo lectura.");
    var nav = '<div class="segmentado sub2 inv-sub" role="tablist">' + SUBINV.map(function (x) { return '<a role="tab" href="#/config/inventario/' + x[0] + '" class="' + (x[0] === sub ? "activo" : "") + '" aria-selected="' + (x[0] === sub) + '">' + ico(x[2], "s") + "<span>" + x[1] + (x[0] === "pedidos" && nb ? " (" + nb + ")" : "") + "</span></a>"; }).join("") + "</div>";
    var cuerpo;
    if (sub === "gestores") cuerpo = gestoresHTML();
    else if (sub === "pedidos") cuerpo = cfgPedidosHTML() + pedidosHTML();
    else { var keep = H.esAdmin; H.esAdmin = function () { return true; }; try { cuerpo = H.seccionesExtra.reposicion(); } finally { H.esAdmin = keep; }
      if (!adm) cuerpo = cuerpo.replace(/data-cambio="repCampo"/g, 'data-cambio="repCampo" disabled');
      if (!ges) cuerpo = cuerpo.replace('data-act="repEnviar"', 'data-act="repEnviar" disabled');
      cuerpo = infoReposicion(cuerpo); }
    return '<div class="v7d-inv">' + estado + nav + cuerpo + "</div>";
  }
  // v0.7.1: textos de la reposición (v0.2) con reglas → botón (i); queda una línea descriptiva
  function infoReposicion(h) {
    return h.replace(/<h2>Aviso de reposición de material<\/h2><\/div><p class="tenue">([^<]*)<\/p>/, function (x, t) { return "<h2>Aviso de reposición de material" + info(t.replace("a los administradores", "a los gestores de inventario")) + '</h2></div><p class="tenue">Correo diario con la lista de material a reponer.</p>'; })
      .replace(/<p class="muy-tenue">(Fórmula \(igual en la web y en el servidor\)[^<]*)<\/p>/, function (x, t) { return '<p class="muy-tenue">A reponer: mínimo + una perfusión − stock.' + info(t) + "</p>"; })
      .replace(/<span class="muy-tenue">(El asunto indica si es antes o después[^<]*)<\/span>/, function (x, t) { return info(t); });
  }
  function gestoresHTML() {
    var adm = H.esAdmin(), l = H.filas("Usuarios").filter(function (u) { return u.Activo !== false && u.Activo !== "FALSE"; });
    var intro = '<section class="tarjeta"><div class="cabecera"><h2>Quién gestiona el inventario</h2></div><p class="tenue">Marca la casilla de la persona encargada del material (puede haber varias, administradores o investigadores). Los gestores son los únicos que editan el catálogo y las ubicaciones, cargan el catálogo de referencia, revisan y envían los pedidos y la reposición, y reciben sus avisos. Las entradas, consumos y descuentos del checklist los puede registrar también un administrador. Los demás ven el inventario en lectura y pueden pedir material con «Solicitar material». Si no hay ningún gestor, actúan todos los administradores.</p>';
    if (!l.length) return intro + '<p class="muy-tenue">La lista de usuarios solo la ven los administradores.</p></section>';
    return intro + '<div class="tabla-env"><table class="t tabla-gest"><thead><tr><th>Usuario</th><th>Rol</th><th>Gestor de inventario</th></tr></thead><tbody>' + l.map(function (u) {
      var r = H.normRol(u.Rol), puede = r === "ADMIN" || r === "INVESTIGADOR";
      return "<tr><td><b>" + esc(u.Nombre || u.Email) + '</b><div class="muy-tenue">' + esc(u.Email) + "</div></td><td>" + esc(H.nombreRol(r)) + '</td><td><label class="check"><input type="checkbox" data-cambio="gestorInv" data-id="' + esc(u.ID) + '"' + (siNo(u.Gestor_inventario) ? " checked" : "") + (adm && puede ? "" : " disabled") + "> " + (puede ? "Gestor" : "No aplica a colaboradores") + "</label></td></tr>";
    }).join("") + "</tbody></table></div></section>";
  }
  H.acc.gestorInv = function (el) { if (!H.esAdmin()) return; H.guardar("Usuarios", [{ ID: el.getAttribute("data-id"), Gestor_inventario: el.checked }]).then(function () { H.pintarMarco(); H.repintar(); }, function () { }); H.toast(el.checked ? "Gestor de inventario añadido." : "Gestor de inventario retirado."); };
  function cfgPedidosHTML() {
    var c = Object.assign({ aviso_expediente_pct: 20 }, S.cfg.pedidos || C.DEF.pedidos || {}), adm = H.esAdmin(), K = [["envio_automatico", "Enviar los pedidos automáticos sin revisar (true/false)"], ["cc", "Copia de los pedidos a (correos, separados por comas)"], ["asunto", "Asunto del pedido ({expediente}, {proveedor})"], ["texto", "Texto del pedido"], ["firma", "Firma"], ["aviso_expediente_pct", "Aviso de fin de expediente: cuando queden menos del … % de las unidades adjudicadas"]];   // v0.7.1
    return '<details class="plegable"><summary>Parámetros de los pedidos</summary><div class="dentro"><div class="rejilla dos">' + K.filter(function (k) { return c.hasOwnProperty(k[0]); }).map(function (k) { var v = c[k[0]], l = Array.isArray(v); return campo("cfgp_" + k[0], esc(k[1]), '<input id="cfgp_' + k[0] + '" value="' + esc(l ? v.join(", ") : String(v)) + '" data-cambio="cfgCampo" data-c="pedidos" data-k="' + k[0] + '" data-lista="' + (l ? "t" : "") + '"' + (k[0] === "aviso_expediente_pct" ? ' inputmode="numeric" data-num="1"' : "") + ' autocomplete="off"' + (adm ? "" : " disabled") + ">"); }).join("") + "</div>" + (adm ? "" : '<p class="muy-tenue">Los parámetros los cambia un administrador.</p>') + "</div></details>";
  }
  // PROEX (procedimientos autorizados) y datos del censo
  C.DEF.proex = { defecto: "084.6/23", lista: [{ codigo: "084.6/23", proyecto: "PI23", ip: "FONDEVILA", activo: true }], especie: "SUIDO", cepa: "LW", sala: "Grandes 1" };
  function cfgProex() { var c = H.copia((S.cfg && S.cfg.proex) || C.DEF.proex); if (!Array.isArray(c.lista) || !c.lista.length) c.lista = H.copia(C.DEF.proex.lista); c.defecto = c.defecto || c.lista[0].codigo; return c; }
  H.cfgProex = cfgProex;
  H.proexDe = function (e) { return (e && String(e.PROEX || "").trim()) || cfgProex().defecto; };
  function seccionProex() {
    var c = cfgProex();
    return '<section class="tarjeta"><div class="cabecera"><h2>PROEX de la investigación ' + H.botonInfo("Procedimientos autorizados. Cada experimento lleva el suyo (se elige al programarlo o editarlo); el marcado como «por defecto» es el que se asigna si no se indica. El censo mensual hace una fila por PROEX.") + '</h2><button class="bt pri" data-act="proexNuevo">' + ico("plus") + "Añadir PROEX</button></div>" +
      '<div class="tabla-env"><table class="t tabla-proex"><thead><tr><th>PROEX</th><th>Proyecto</th><th>IP (censo)</th><th>Por defecto</th><th>Activo</th><th class="num">Experimentos</th></tr></thead><tbody>' + c.lista.map(function (x, i) {
        var n = H.filas("Experimentos").filter(function (e) { return H.proexDe(e) === x.codigo; }).length;
        return '<tr><td><input value="' + esc(x.codigo) + '" aria-label="Código PROEX" data-cambio="proexCampo" data-i="' + i + '" data-k="codigo" autocomplete="off"></td><td><input value="' + esc(x.proyecto || "") + '" aria-label="Proyecto" data-cambio="proexCampo" data-i="' + i + '" data-k="proyecto" autocomplete="off" placeholder="PI24…"></td><td><input value="' + esc(x.ip || "") + '" aria-label="Investigador principal" data-cambio="proexCampo" data-i="' + i + '" data-k="ip" autocomplete="off"></td>' +
          '<td><input type="radio" name="proexDef" aria-label="Por defecto" data-cambio="proexDef" data-i="' + i + '"' + (x.codigo === c.defecto ? " checked" : "") + '></td><td><input type="checkbox" aria-label="Activo" data-cambio="proexCampo" data-i="' + i + '" data-k="activo"' + (x.activo === false ? "" : " checked") + '></td><td class="num">' + n + "</td></tr>";
      }).join("") + "</tbody></table></div></section>" +
      '<section class="tarjeta"><div class="cabecera"><h2>Datos fijos del censo</h2></div><div class="rejilla tres">' + [["especie", "Especie"], ["cepa", "Cepa"], ["sala", "Sala"]].map(function (k) { return campo("prx_" + k[0], k[1], '<input id="prx_' + k[0] + '" value="' + esc(c[k[0]] || "") + '" data-cambio="proexCampo" data-i="-1" data-k="' + k[0] + '" autocomplete="off">'); }).join("") + '</div><p class="muy-tenue">Se usan en «Exportar › Censo mensual de animales» (MODELO CENSO ANIMALES).</p></section>';
  }
  H.acc.proexCampo = function (el) {
    var c = cfgProex(), i = Number(el.getAttribute("data-i")), k = el.getAttribute("data-k"), v = el.type === "checkbox" ? el.checked : el.value.trim();
    if (i < 0) c[k] = v; else { if (k === "codigo") { if (!/^\d{3}\.\d\/\d{2}$/.test(v)) { H.toast("El PROEX tiene el formato 000.0/00 (p. ej. 084.6/23).", "error"); return; } if (c.defecto === c.lista[i].codigo) c.defecto = v; } c.lista[i][k] = v; }
    H.guardarCfg("proex", c);
  };
  H.acc.proexDef = function (el) { var c = cfgProex(); c.defecto = c.lista[Number(el.getAttribute("data-i"))].codigo; H.guardarCfg("proex", c); };
  H.acc.proexNuevo = function () {
    H.modal({ titulo: "Añadir PROEX", cuerpo: '<div class="rejilla dos">' + campo("pxC", "Código PROEX", '<input id="pxC" placeholder="000.0/24" autocomplete="off">', "Formato 000.0/00.") + campo("pxP", "Proyecto", '<input id="pxP" placeholder="PI24" autocomplete="off">') + campo("pxI", "IP (como aparece en el censo)", '<input id="pxI" value="FONDEVILA" autocomplete="off">') + '</div><label class="check"><input type="checkbox" id="pxD"> Usarlo por defecto en los experimentos nuevos</label><div class="msg-error" id="pxErr" role="alert"></div>',
      pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="pxOk">' + ico("plus") + "Añadir</button>",
      alAbrir: function (d) { d.querySelector("#pxOk").addEventListener("click", function () {
        var c = cfgProex(), cod = d.querySelector("#pxC").value.trim(); if (!/^\d{3}\.\d\/\d{2}$/.test(cod)) { d.querySelector("#pxErr").textContent = "El PROEX tiene el formato 000.0/00 (p. ej. 084.6/23)."; return; }
        if (c.lista.some(function (x) { return x.codigo === cod; })) { d.querySelector("#pxErr").textContent = "Ese PROEX ya está en la lista."; return; }
        c.lista.push({ codigo: cod, proyecto: d.querySelector("#pxP").value.trim(), ip: d.querySelector("#pxI").value.trim(), activo: true }); if (d.querySelector("#pxD").checked) c.defecto = cod; H.guardarCfg("proex", c); d.close(); H.repintar(); }); } });
  };
  var vCfg0 = H.vistas.config;
  H.vistas.config = function (p, q) {
    p = p || []; var s = p[0] || "usuarios", sub = p[1];
    if (s === "reposicion" || s === "pedidos") { sub = s; s = "inventario"; }
    if (s === "inventario" && !H.esAdmin()) {
      if (!H.esGestorInv() && !H.puede("registrar")) return aviso("al", "Esta sección es del gestor de inventario.");
      return '<div class="ancho"><div class="titulo-pag"><h1>Gestión del inventario</h1><a class="bt" href="#/inventario">' + ico("package") + "Ir al inventario</a></div>" + seccionInventario(sub) + "</div>";
    }
    var h = vCfg0(s === "inventario" || s === "proex" ? ["reposicion"] : p, q);
    if (!H.esAdmin()) return h;
    if (s === "inventario" || s === "proex") h = h.replace(/<\/nav>[\s\S]*$/, "</nav>" + (s === "proex" ? seccionProex() : seccionInventario(sub)) + "</div>");
    return h.replace(/<a href="#\/config\/pedidos"[^>]*>[^<]*<\/a>/, "").replace(/<a href="#\/config\/reposicion" class="([^"]*)">[^<]*<\/a>/, function (x, cl) { return '<a href="#/config/inventario" class="' + (s === "inventario" ? "activo" : "") + '">Inventario</a>'; })
      .replace(/(<a href="#\/config\/programacion"[^>]*>[^<]*<\/a>)/, '$1<a href="#/config/proex" class="' + (s === "proex" ? "activo" : "") + '">PROEX</a>').replace(/<a href="#\/config\/usuarios" class="activo">/, s === "inventario" || s === "proex" ? '<a href="#/config/usuarios" class="">' : '<a href="#/config/usuarios" class="activo">');
  };

  // ---- PROEX al programar, editar o registrar una perfusión anterior (campo añadido a los diálogos existentes)
  function selProex(v) {
    var c = cfgProex(), l = c.lista.filter(function (x) { return x.activo !== false || x.codigo === v; }); v = v || c.defecto; if (!l.some(function (x) { return x.codigo === v; })) l.push({ codigo: v });
    return '<div class="campo campo-proex"><label class="et" for="pgProex">PROEX</label><select id="pgProex">' + l.map(function (x) { return '<option value="' + esc(x.codigo) + '"' + (x.codigo === v ? " selected" : "") + ">" + esc(x.codigo + (x.proyecto ? " · " + x.proyecto : "")) + "</option>"; }).join("") + '</select><div class="ayuda">Procedimiento autorizado (censo mensual). Lista en Configuración › PROEX.</div></div>';
  }
  var modal0 = H.modal, dlgProex = null;
  H.modal = function (o) {
    var t = String((o && o.titulo) || ""), m = /^Programación · (.+)$/.exec(t), es = t === "Programar experimento" || t === "Registrar una perfusión anterior" || !!m;
    if (es && typeof o.cuerpo === "string") {
      var e = m ? H.exp(m[1]) : null, campoP = selProex(e ? e.PROEX : "");
      o.cuerpo = /<div class="msg-error" id="(pgErr|hiErr)"/.test(o.cuerpo) ? o.cuerpo.replace(/<div class="msg-error" id="(pgErr|hiErr)"/, campoP + '<div class="msg-error" id="$1"') : o.cuerpo + campoP;
      var ab = o.alAbrir; o.alAbrir = function (d) { d.addEventListener("click", function (ev) { if (ev.target && ev.target.closest && ev.target.closest("#pgOk,#neOk,#hiOk")) { dlgProex = d; setTimeout(function () { if (dlgProex === d) dlgProex = null; }, 0); } }, true); if (ab) return ab.apply(this, arguments); };   // solo durante el clic en «Guardar»
    }
    return modal0.apply(this, arguments);
  };
  var guardar0 = H.guardar;
  H.guardar = function (tabla, filas) {
    if (tabla === "Experimentos" && dlgProex && dlgProex.querySelector && dlgProex.querySelector("#pgProex")) {
      var v = dlgProex.querySelector("#pgProex").value; (filas || []).forEach(function (f) { if (f && f.PROEX === undefined && (f.Fecha_cirugia !== undefined || f.Fase !== undefined)) f.PROEX = v; });
    }
    return guardar0.apply(this, arguments);
  };
  var progRes0 = H.progResumen;
  if (progRes0) H.progResumen = function (e) { var h = progRes0(e); return h.replace(/<\/div>$/, '<span class="chip">PROEX: <b>' + esc(H.proexDe(e)) + "</b></span></div>"); };

  // ============================================================== 8. EXPORTAR: censo mensual de animales (MODELO CENSO ANIMALES.xlsx)
  var CENSO = null;
  function selCenso() { if (!CENSO) { var h = new Date(); CENSO = { anio: h.getFullYear(), mes: h.getMonth() + 1 }; } return CENSO; }
  // Nº ANIMALES: donante de sangre y donante de hígado desde su llegada hasta la cirugía; receptor desde su llegada hasta el sacrificio.
  // Nº ANIMALES USADOS: los 2 donantes en el mes de la cirugía y el receptor en el mes del trasplante.
  H.censoDatos = function (anio, mes) {
    var c = cfgProex(), pd = (S.cfg && S.cfg.programacion) || C.DEF.programacion || {}, antes = C.num(pd.dias_llegada_antes) || 7;
    var exps = H.filas("Experimentos").map(function (e) {
      var an = (H.animales && H.animales(e.ID)) || {}, lr = an.LR || an.REC || {}, ld = an.LD || {};
      return { ID: e.ID, PROEX: H.proexDe(e), Estado: e.Estado, Fecha_llegada: e.Fecha_llegada || ld.Fecha_llegada || "", Fecha_cirugia: e.Fecha_cirugia || "", Fecha_trasplante: e.Fecha_trasplante || "", Fecha_sacrificio: e.Fecha_sacrificio || "", tx: C.tipoProc(e) === "trasplante" && !!e.Fecha_trasplante,
        Fecha_llegada_receptor: lr.Fecha_llegada || (e.Fecha_trasplante ? C.sumarDias(e.Fecha_trasplante, -antes) : "") };
    });
    var r = C.censoMes(exps, anio, mes, { ip: (c.lista.filter(function (x) { return x.codigo === c.defecto; })[0] || {}).ip || "FONDEVILA", especie: c.especie || "SUIDO", cepa: c.cepa || "LW", sala: c.sala || "Grandes 1", proex_def: c.defecto });
    var ya = {}; r.filas.forEach(function (f) { ya[f.PROEX] = 1; var x = c.lista.filter(function (y) { return y.codigo === f.PROEX; })[0]; if (x && x.ip) f.IP = x.ip; });
    c.lista.filter(function (x) { return x.activo !== false && !ya[x.codigo]; }).forEach(function (x) { r.filas.push({ PROEX: x.codigo, IP: x.ip || "FONDEVILA", ESPECIE: c.especie || "SUIDO", CEPA: c.cepa || "LW", SALA: c.sala || "Grandes 1", N_ANIMALES: 0, N_USADOS: 0, EXCEDENTES: "", detalle: [] }); });
    r.filas.sort(function (a, b) { return a.PROEX.localeCompare(b.PROEX); });
    r.total = r.filas.reduce(function (s, f) { return s + f.N_ANIMALES; }, 0); r.usados = r.filas.reduce(function (s, f) { return s + f.N_USADOS; }, 0);
    return r;
  };
  // Hoja con la estructura de la plantilla: A1 título, D1 mes, E1 año; fila 3 cabecera; una fila por PROEX; totales por especie (solo SUIDOS)
  H.censoHoja = function (X, anio, mes) {
    var d = H.censoDatos(anio, mes), aoa = [["CENSO ANIMALES", null, null, d.mes, anio], [], ["PROEX", "IP", "ESPECIE", "CEPA", "SALA", "Nº ANIMALES", "Nº ANIMALES USADOS", "EXCEDENTES COLONIA"]];
    d.filas.forEach(function (f) { aoa.push([f.PROEX, f.IP, f.ESPECIE, f.CEPA, f.SALA, f.N_ANIMALES, f.N_USADOS, null]); });
    var ult = aoa.length, fEt = ult + 2, fTot = fEt + 2; aoa.push([]); aoa.push([null, null, null, null, null, null, "RATAS", "RATONES", "SUIDOS", "CONEJOS"]); aoa.push([]); aoa.push([null, null, null, null, "TOTAL", null, null, null, d.total, null]);
    var ws = X.utils.aoa_to_sheet(aoa); ws["I" + fTot] = { t: "n", v: d.total, f: "SUM(F4:F" + ult + ")" };
    ws["!cols"] = [{ wch: 12 }, { wch: 33.6 }, { wch: 17.4 }, { wch: 23.3 }, { wch: 20 }, { wch: 23.3 }, { wch: 24.7 }, { wch: 26.1 }, { wch: 24.7 }, { wch: 12 }];
    return { ws: ws, datos: d };
  };
  H.censoLibro = function (X, anio, meses) { var wb = X.utils.book_new(); meses.forEach(function (m) { X.utils.book_append_sheet(wb, H.censoHoja(X, anio, m).ws, C.MESES[m - 1]); }); return wb; };
  H.acc.censoSel = function (el) { var c = selCenso(); c[el.getAttribute("data-k")] = Number(el.value); H.repintar(); };
  H.acc.censoDescargar = function () {
    var c = selCenso(), meses = c.mes ? [c.mes] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    H.xlsx().then(function (X) { var wb = H.censoLibro(X, c.anio, meses); X.writeFile(wb, "Censo_animales_HOME_" + c.anio + (c.mes ? "_" + (c.mes < 10 ? "0" : "") + c.mes + "_" + C.MESES[c.mes - 1] : "") + ".xlsx"); H.toast("Censo de " + (c.mes ? C.MESES[c.mes - 1].toLowerCase() + " de " : "") + c.anio + " descargado."); }).catch(function (e) { H.toast(e.message, "error"); });
  };
  function censoHTML() {
    var c = selCenso(), anios = {}, h = new Date().getFullYear(); [h - 1, h, h + 1].forEach(function (a) { anios[a] = 1; }); H.filas("Experimentos").forEach(function (e) { var a = Number(String(e.Fecha_cirugia || "").slice(0, 4)); if (a > 2000) anios[a] = 1; });
    var d = c.mes ? H.censoDatos(c.anio, c.mes) : null;
    return '<section class="tarjeta censo-sec"><div class="cabecera"><h2>' + ico("file-spreadsheet", "s") + " Censo mensual de animales" + info("Nº animales = cerdos presentes algún día del mes (los dos donantes desde su llegada hasta la cirugía y el receptor desde su llegada hasta el sacrificio). Nº animales usados = los dos donantes en el mes de la cirugía y el receptor en el del trasplante. Solo se rellenan nuestros datos (SUIDOS en los totales).") + '</h2><span class="muy-tenue">Formato «MODELO CENSO ANIMALES»</span></div>' +
      '<p class="tenue">Una fila por PROEX con los cerdos del proyecto.</p>' +
      '<div class="fila-flex censo-sel"><div class="campo"><label class="et" for="censoMes">Mes</label><select id="censoMes" data-cambio="censoSel" data-k="mes">' + C.MESES.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (c.mes === i + 1 ? " selected" : "") + ">" + m.charAt(0) + m.slice(1).toLowerCase() + "</option>"; }).join("") + '<option value="0"' + (!c.mes ? " selected" : "") + ">Todo el año (una hoja por mes)</option></select></div>" +
      '<div class="campo"><label class="et" for="censoAnio">Año</label><select id="censoAnio" data-cambio="censoSel" data-k="anio">' + Object.keys(anios).sort().map(function (a) { return '<option value="' + a + '"' + (Number(a) === c.anio ? " selected" : "") + ">" + a + "</option>"; }).join("") + "</select></div>" +
      '<button class="bt pri" data-act="censoDescargar">' + ico("download") + "Descargar el censo (.xlsx)</button></div>" +
      (d ? '<div class="tabla-env"><table class="t tabla-censo"><thead><tr><th>PROEX</th><th>IP</th><th>Especie</th><th>Cepa</th><th>Sala</th><th class="num">Nº animales</th><th class="num">Nº animales usados</th></tr></thead><tbody>' + d.filas.map(function (f) { return "<tr><td>" + esc(f.PROEX) + "</td><td>" + esc(f.IP) + "</td><td>" + esc(f.ESPECIE) + "</td><td>" + esc(f.CEPA) + "</td><td>" + esc(f.SALA) + '</td><td class="num"><b>' + f.N_ANIMALES + '</b></td><td class="num"><b>' + f.N_USADOS + "</b></td></tr>"; }).join("") + '</tbody><tfoot><tr><td colspan="5">Total suidos · ' + esc(d.mes.toLowerCase()) + " de " + d.anio + '</td><td class="num"><b>' + d.total + '</b></td><td class="num"><b>' + d.usados + "</b></td></tr></tfoot></table></div>" +
        (d.filas.some(function (f) { return f.detalle.length; }) ? '<details class="plegable"><summary>Detalle por experimento</summary><div class="dentro"><ul>' + d.filas.map(function (f) { return f.detalle.map(function (x) { return "<li>" + esc(f.PROEX) + " · " + esc(x) + "</li>"; }).join(""); }).join("") + "</ul></div></details>" : "") : "") + "</section>";
  }
  var vExp0 = H.vistas.exportar;
  H.vistas.exportar = function (p, q) { var h = vExp0(p, q), i = h.indexOf('<section class="tarjeta"><div class="cabecera"><h2>Importar perfusiones anteriores'); return i === -1 ? h.replace(/<\/div>$/, censoHTML() + "</div>") : h.slice(0, i) + censoHTML() + h.slice(i); };

  // ============================================================== 9. MORFOMETRÍA: dibujo técnico a línea de un cerdo Large White (Sus scrofa domesticus)
  // Perfil izquierdo, proporciones de un cerdo de engorde Large White/Yorkshire: orejas erguidas, perfil nasal recto, dorso ligeramente
  // arqueado, extremidades con antebrazo, carpo, corvejón, cuartilla y pezuñas; cotas con flechas y líneas de referencia.
    // Dibujo técnico a línea (estilo lámina veterinaria) de un cerdo Large White / Yorkshire de perfil izquierdo, con las cotas de C.MORFO.
  function morfoFabrica() {
    var VB = "0 0 720 380", TIN = "#1d2a2e", GRIS = "#8a9499", PAPEL = "#fdfcf8", LEJOS = "#eceae4", SUELO = 342;
    var COL = { OBL: "#0f766e", NL: "#2563eb", BL1: "#7c3aed", HSLD: "#c2410c", HHIP: "#a16207", HGH: "#be185d", MGH: "#0e7490", PGH: "#4d7c0f" };
    function p(d, o) { o = o || {}; return '<path d="' + d + '" fill="' + (o.f || "none") + '" stroke="' + (o.s || TIN) + '" stroke-width="' + (o.w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round"' + (o.op ? ' opacity="' + o.op + '"' : "") + (o.da ? ' stroke-dasharray="' + o.da + '"' : "") + "/>"; }
    function mover(d, dx) { return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (m, x, y) { return (Math.round((Number(x) + dx) * 10) / 10) + "," + y; }); }
    // ---- extremidades (contorno abierto por arriba: el relleno tapa la línea del vientre y el trazo solo marca los lados)
    var MANO = "M203,232 C205,254 208,270 212,284 C215,293 213,301 215,308 C216,315 217,321 216,327 C215,330 213,332 211,334 L236,334 C237,330 237,326 237,320 C237,314 237,310 239,304 C241,296 241,288 243,280 C246,268 249,256 253,238";
    var PIE = "M480,240 C489,258 498,274 505,288 C510,297 512,305 512,313 C512,319 513,324 512,329 C511,331 510,333 508,334 L535,334 C536,329 537,323 538,317 C539,311 541,305 545,301 C548,298 550,294 550,290 C553,280 559,268 572,250";
    function pezuna(x0, x1, lejos) { var xm = (x0 + x1) / 2 - 1; return p("M" + (x0 - 5) + ",341 C" + (x0 - 3) + ",337 " + (x0 - 1) + ",335 " + x0 + ",333 L" + (x1 - 1) + ",333 C" + x1 + ",336 " + (x1 + 1) + ",339 " + (x1 + 1) + ",341 Z", { f: lejos ? "#a7adb0" : "#4b5357", s: lejos ? GRIS : TIN, w: 1.3 }) + p("M" + xm + ",334 L" + (xm - 1) + ",341", { s: PAPEL, w: 1.1 }) + p("M" + (x1 - 1) + ",324 c4,1 6,4 5,8", { s: lejos ? GRIS : TIN, w: 1.2 }); }
    function pata(d, dx, lejos) { var dd = mover(d, dx); return p(dd, { f: lejos ? LEJOS : PAPEL, s: lejos ? GRIS : TIN, w: lejos ? 1.3 : 1.7 }); }
    var cuerpo = "M188,139 C205,129 222,123 244,121 C300,110 352,103 400,103 C462,104 522,114 556,131 C574,140 586,152 590,170 C596,200 593,232 579,255 C566,272 545,276 526,268 C510,262 496,258 484,255 " +
      "C440,266 380,272 330,270 C290,268 262,266 240,265 C224,268 210,268 200,262 C186,270 160,270 140,262 C122,254 104,246 88,240 C78,237 70,234 64,232 L64,197 C88,188 114,178 138,167 C156,157 172,145 188,139 Z";
    var orejaL = "M184,146 C178,124 178,104 184,84 C198,98 212,118 218,140 C208,143 196,145 184,146 Z";
    var oreja = "M154,157 C143,137 141,110 148,83 C170,94 192,116 202,142 C187,150 170,155 154,157 Z";
    var cerdo = '<g class="mf-cerdo">' +
      '<ellipse cx="380" cy="343" rx="300" ry="6" fill="#000" opacity=".07"/>' + p("M24," + SUELO + " L696," + SUELO, { s: "#9aa5ad", w: 1.2 }) +
      pata(MANO, 24, true) + pezuna(235, 260, true) + pata(PIE, -24, true) + pezuna(484, 511, true) +
      p(orejaL, { f: LEJOS, s: GRIS, w: 1.3 }) +
      p(cuerpo, { f: PAPEL, w: 2 }) +
      pata(MANO, 0) + pezuna(211, 236) + pata(PIE, 0) + pezuna(508, 535) +
      // cabeza: disco del hocico, ollares, boca, ojo, arrugas y papada
      '<ellipse cx="63" cy="214.5" rx="7.5" ry="18.5" fill="' + PAPEL + '" stroke="' + TIN + '" stroke-width="1.8"/>' + '<ellipse cx="62" cy="208" rx="1.8" ry="3.6" fill="' + TIN + '"/><ellipse cx="62" cy="221" rx="1.8" ry="3.6" fill="' + TIN + '"/>' +
      p("M70,229 C86,233 102,233 116,227", { w: 1.4 }) + p("M131,180 Q139,173 148,179 Q140,184 131,180 Z", { f: TIN, w: 1 }) + p("M129,175 Q139,167 151,174", { w: 1.1 }) +
      p("M84,192 q4,4 2,10 M93,188 q4,4 2,10 M102,184 q4,4 2,10", { w: 1, op: .55 }) + p("M146,192 C156,206 162,224 166,242", { w: 1.1, op: .55 }) + p("M172,230 C184,242 192,252 198,261", { w: 1.1, op: .5 }) + p("M104,236 C116,244 128,250 142,252", { w: 1, op: .45 }) +
      p(oreja, { f: PAPEL, w: 1.7 }) + p("M160,147 C154,128 154,108 157,95", { w: 1, op: .55 }) +
      // tronco: escápula, codo, jamón, ijada, pezones y rabo
      p("M246,128 C262,160 262,200 251,238", { w: 1.1, op: .5 }) + p("M234,262 C242,255 252,253 260,256", { w: 1.1, op: .5 }) + p("M556,136 C541,172 531,210 523,248", { w: 1.1, op: .5 }) +
      p("M484,232 C478,243 480,251 486,255", { w: 1.1, op: .5 }) + [292, 318, 344, 370, 396, 422, 448].map(function (x) { return p("M" + x + ",267 q3,4 6,0", { w: 1, op: .55 }); }).join("") +
      [[262,250],[284,254],[306,257],[328,258],[350,259],[372,259],[394,258],[416,257],[438,255],[458,252]].map(function (q) { return p("M" + q[0] + "," + q[1] + " l7,8", { w: .9, op: .35 }); }).join("") + [[586,196],[587,210],[586,224],[583,238],[578,250]].map(function (q) { return p("M" + q[0] + "," + q[1] + " l-9,4", { w: .9, op: .35 }); }).join("") + [[150,258],[164,262],[178,264]].map(function (q) { return p("M" + q[0] + "," + q[1] + " l4,6", { w: .9, op: .35 }); }).join("") + p("M566,139 C580,137 590,145 586,155 C582,165 570,161 574,153 C578,145 592,149 596,161 C599,171 596,181 590,185", { w: 2.4 }) +
      "</g>";
    // ---- cotas: líneas de medida con flechas, líneas de referencia y etiquetas
    function flecha(x, y, dx, dy, c) { var l = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / l, uy = dy / l, a = 8, b = 3.6; return '<path d="M' + x + "," + y + " L" + (x - ux * a - uy * b).toFixed(1) + "," + (y - uy * a + ux * b).toFixed(1) + " L" + (x - ux * a + uy * b).toFixed(1) + "," + (y - uy * a - ux * b).toFixed(1) + ' Z" fill="' + c + '"/>'; }
    function et(x, y, t, c) { var w = t.length > 3 ? 46 : 38; return '<g class="mf-et"><rect x="' + (x - w / 2) + '" y="' + (y - 10) + '" width="' + w + '" height="20" rx="10" fill="' + c + '" stroke="#fff" stroke-width="1.5"/><text x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="Roboto, system-ui, sans-serif">' + t + "</text></g>"; }
    function ref(x1, y1, x2, y2) { return '<path d="M' + x1 + "," + y1 + " L" + x2 + "," + y2 + '" stroke="#5f6b70" stroke-width=".9" stroke-dasharray="3 3" fill="none"/>'; }
    var G = {
      OBL: { d: "M188,113 C240,92 320,78 400,78 C476,79 534,92 568,116", et: [392, 66], ini: [188, 113, -52, 20], fin: [568, 116, 34, 22], refs: [[188, 137, 188, 106], [568, 140, 568, 108]] },
      NL: { d: "M190,153 L242,136", et: [206, 168], ini: [190, 153, -52, 17], fin: [242, 136, 52, -17], refs: [] },
      BL1: { d: "M214,213 L566,151", et: [430, 176], ini: [214, 213, -352, 62], fin: [566, 151, 352, -62], refs: [] },
      HSLD: { d: "M244," + SUELO + " L244,122", et: [244, 240], ini: [244, SUELO, 0, 1], fin: [244, 122, 0, -1], refs: [[232, 121, 262, 121]] },
      HHIP: { d: "M506," + SUELO + " L506,112", et: [506, 214], ini: [506, SUELO, 0, 1], fin: [506, 112, 0, -1], refs: [[494, 111, 522, 111]] },
      HGH: { e: [276, 192, 11, 73], et: [276, 296] }, MGH: { e: [378, 187, 12, 83], et: [378, 296] }, PGH: { e: [466, 184, 11, 76], et: [466, 296] }
    };
    function cota(k) {
      var g = G[k], c = COL[k], s = "";
      if (g.e) { var e = g.e; s = '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="4 4" opacity=".75"/>' +
          '<path d="M' + e[0] + "," + (e[1] - e[3]) + " A" + e[2] + "," + e[3] + " 0 0 1 " + e[0] + "," + (e[1] + e[3]) + '" fill="none" stroke="' + c + '" stroke-width="2.6"/>' + '<path d="M' + e[0] + "," + (e[1] + e[3]) + " L" + e[0] + "," + (g.et[1] - 10) + '" stroke="' + c + '" stroke-width="1" fill="none"/>'; }
      else { s = (g.refs || []).map(function (r) { return ref(r[0], r[1], r[2], r[3]); }).join("") + '<path d="' + g.d + '" fill="none" stroke="' + c + '" stroke-width="2"/>' + flecha(g.ini[0], g.ini[1], g.ini[2], g.ini[3], c) + flecha(g.fin[0], g.fin[1], g.fin[2], g.fin[3], c); }
      return '<g class="mf-cota" data-m="' + k + '">' + s + et(g.et[0], g.et[1], k, c) + "</g>";
    }
    return { VB: VB, COL: COL, G: G, cerdo: cerdo, cota: cota, svg: function (solo) { return '<svg class="morfo-svg" data-zoom viewBox="' + VB + '" role="img" aria-label="Cerdo Large White de perfil con las medidas morfométricas">' + cerdo + (solo ? "" : Object.keys(G).map(cota).join("")) + "</svg>"; } };
  }

  var MF = morfoFabrica();
  H.MORFO_VB = MF.VB; H.MORFO_COL = MF.COL; H.MORFO_GEOM = MF.G;
  H.morfoSVG = function (soloCerdo) { return soloCerdo ? MF.cerdo : MF.svg(false); };

  // ============================================================== 10. v0.7.1 · Materiales: regla de cantidad simplificada, expedientes (CM / licitación) con
  // historial, eliminar o dar de baja material, y vídeo de cómo tomar las medidas morfométricas dentro de la app.
  // ---- 10.1 Regla de cantidad: 5 opciones claras; cada una con sus parámetros. Se guarda la misma clave de C.REGLAS (compatibles con el catálogo).
  var MODOS_REGLA = [["fijo", "Fija por perfusión"], ["dia", "Por día de perfusión"], ["muestra", "Por muestra o tubo (plan de muestreo)"], ["protocolo", "Según el protocolo"], ["a_demanda", "Solo si hace falta (no se prepara)"]];
  var OPC_DIA = [["por_dia", "Una cantidad al día"], ["prop7", "Proporcional a los días (la «cantidad por perfusión» es para 7 días)"]];
  var OPC_MUESTRA = [["tubo:LH", "1 por tubo de heparina de litio (LH)"], ["tubo:EDTA", "1 por tubo de EDTA"], ["tubo:AMA", "1 por tubo de suero con gel (amarillo)"], ["tubo:CIT", "1 por tubo de citrato (azul)"], ["tubo:GAS", "1 por jeringa de gasometría"],
    ["puntas", "Puntas de pipeta: 1 por tubo de EDTA"], ["microtubos", "Microtubos: 3 por EDTA + 2 por bilis + 2 por filtrado"], ["aceite_bilis", "Aceite mineral: 2,5 mL por muestra de bilis"]];
  function opcProtocolo(actual) {
    var l = ["heparina", "periolimel", "fosfato", "usos_sonda"]; C.CATALOGO.forEach(function (c) { if (/^protocolo:/.test(c.Regla) && l.indexOf(c.Regla) === -1) l.push(c.Regla); });
    if (actual && l.indexOf(actual) === -1) l.push(actual); return l.map(function (r) { return [r, r === "usos_sonda" ? "Usos de la sonda de flujo (1 en el donante; +2 con trasplante)" : C.reglaTexto(r)]; });
  }
  H.REGLA_MODOS = MODOS_REGLA;
  // clave de C.REGLAS → {modo, p (opción), n (cantidad al día)}
  H.reglaPartes = function (r) {
    r = String(r || "").trim(); var m;
    if (!r || r === "fijo") return { modo: "fijo", p: r };
    if (r === "prop7") return { modo: "dia", p: "prop7", n: 1 };
    if ((m = /^por_dia:(.+)$/.exec(r))) return { modo: "dia", p: "por_dia", n: C.num(m[1]) || 1 };
    if (/^tubo:/.test(r) || /^(puntas|microtubos|aceite_bilis)$/.test(r)) return { modo: "muestra", p: r };
    if (r === "a_demanda") return { modo: "a_demanda", p: "" };
    return { modo: "protocolo", p: r };   // heparina, periolimel, fosfato, usos_sonda, protocolo:… o un texto propio (se conserva)
  };
  // {modo, p, n} → clave; «antes» conserva «sin regla» ("") si sigue siendo fija
  H.reglaDe = function (o, antes) {
    o = o || {};
    if (o.modo === "fijo") return antes === "" || antes === undefined || antes === null ? (o.p === "fijo" ? "fijo" : "") : "fijo";
    if (o.modo === "dia") return o.p === "prop7" ? "prop7" : "por_dia:" + String(C.num(o.n) > 0 ? C.num(o.n) : 1).replace(",", ".");
    if (o.modo === "muestra") return OPC_MUESTRA.some(function (x) { return x[0] === o.p; }) ? o.p : "tubo:EDTA";
    if (o.modo === "a_demanda") return "a_demanda";
    return o.p || "heparina";
  };
  function reglaSub(modo, pa, ges) {
    var dis = ges ? "" : " disabled";
    function selO(ops, v, et) { return '<select id="em_ReglaP" aria-label="' + et + '"' + dis + ">" + ops.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select>"; }
    if (modo === "dia") return selO(OPC_DIA, pa.p || "por_dia", "Cómo se reparte por día") + (pa.p === "prop7" ? "" : '<span class="cant-u v71-n"><input id="em_ReglaN" inputmode="decimal" data-num="1" aria-label="Cantidad al día" value="' + esc(String(pa.n || 1).replace(".", ",")) + '"' + dis + "><span>al día</span></span>");
    if (modo === "muestra") return selO(OPC_MUESTRA, pa.p || "tubo:EDTA", "Qué muestra o tubo se cuenta");
    if (modo === "protocolo") return selO(opcProtocolo(pa.p), pa.p || "heparina", "Cálculo del protocolo");
    return "";
  }
  function reglaCampo(m, ges) {
    var pa = H.reglaPartes(m.Regla);
    return '<div class="campo v71-regla"><label class="et" for="em_ReglaModo">Regla de cantidad' + info("Fija: la «cantidad por perfusión» de la ficha. Por día: N al día de perfusión, o proporcional a los días reales. Por muestra o tubo: según el plan de muestreo (tubos, microtubos, aceite…). Según el protocolo: lo calcula el protocolo de la perfusión (heparina, nutrición, fosfato…). Solo si hace falta: no se prepara ni se descuenta.") + "</label>" +
      '<select id="em_ReglaModo"' + (ges ? "" : " disabled") + ">" + MODOS_REGLA.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === pa.modo ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select>" +
      '<div class="v71-regla-sub" id="em_ReglaSub">' + reglaSub(pa.modo, pa, ges) + '</div><div class="ayuda" id="em_ReglaPrev"></div></div>';
  }
  function reglaLeer(d, m) {
    var mo = d.querySelector("#em_ReglaModo"); if (!mo) return m.Regla || "";
    var p = d.querySelector("#em_ReglaP"), n = d.querySelector("#em_ReglaN");
    return H.reglaDe({ modo: mo.value, p: p ? p.value : H.reglaPartes(m.Regla).p, n: n ? C.num(n.value) : null }, m.Regla === undefined ? "" : m.Regla);
  }
  function reglaEnlazar(d, m) {
    var mo = d.querySelector("#em_ReglaModo"), sub = d.querySelector("#em_ReglaSub"), prev = d.querySelector("#em_ReglaPrev"); if (!mo) return;
    function vista() {
      var r = reglaLeer(d, m), pp = d.querySelector("#em_Por_perfusion"), x = { Regla: r, Por_perfusion: pp ? C.num(pp.value) : m.Por_perfusion, Tipo: m.Tipo }, dias = diasPrevistos(), c = C.cantidadMaterial(x, { dias: dias, tx: false, circ: S.cfg.circadiano, protocolo: { lineas: protLineas(C.versionActual()) } });
      if (prev) prev.textContent = r === "a_demanda" ? "No se prepara: se añade a mano si hace falta." : "Para " + dias + " días: " + n1(C.r(c || 0, 2)) + " " + (d.querySelector("#em_Unidad") ? d.querySelector("#em_Unidad").value : m.Unidad || "") + " (" + C.reglaTexto(r || "fijo") + ").";
    }
    mo.addEventListener("change", function () { var pa = mo.value === H.reglaPartes(m.Regla).modo ? H.reglaPartes(m.Regla) : { modo: mo.value, p: "", n: 1 }; sub.innerHTML = reglaSub(mo.value, pa, true); vista(); });
    d.addEventListener("change", function (ev) { if (ev.target && /^em_(ReglaP|ReglaN|Por_perfusion|Unidad)$/.test(ev.target.id)) { if (ev.target.id === "em_ReglaP" && mo.value === "dia") { var pa = { modo: "dia", p: ev.target.value, n: 1 }; sub.innerHTML = reglaSub("dia", pa, true); } vista(); } });
    vista();
  }

  // ---- 10.2 Expedientes (contrato menor «CM» o licitación): adjudicadas, consumidas antes de HOME, pedidas desde HOME, restantes e historial
  // Almacenamiento: columnas de Material Expediente, Via, Expediente_inicio, Unidades_contrato (adjudicadas), Unidades_previas (consumidas antes de HOME),
  // Unidades_pedidas (servidor: pedidos Enviado/Recibido de ese expediente) y Expedientes_JSON (historial de los expedientes cerrados).
  if (C.DEF.pedidos && C.DEF.pedidos.aviso_expediente_pct === undefined) C.DEF.pedidos.aviso_expediente_pct = 20;
  function pctAviso() { var v = C.num(((S.cfg && S.cfg.pedidos) || {}).aviso_expediente_pct); if (v === null) v = C.num((C.DEF.pedidos || {}).aviso_expediente_pct); return v === null ? 20 : v; }
  H.expedientesHist = function (m) { try { var l = typeof (m && m.Expedientes_JSON) === "string" ? JSON.parse(m.Expedientes_JSON || "[]") : (m && m.Expedientes_JSON) || []; return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  H.expedienteEstado = function (m) {
    if (!m || (!m.Expediente && !/^(Contrato menor|Licitación)$/.test(String(m.Via || "")))) return null;
    var adj = C.num(m.Unidades_contrato), prev = C.num(m.Unidades_previas) || 0, ped = C.num(m.Unidades_pedidas) || 0, cons = C.r(prev + ped, 2), pct = pctAviso();
    var rest = adj === null ? null : C.r(adj - cons, 2), umbral = adj === null ? null : Math.max(1, Math.ceil(adj * pct / 100 - 1e-9)), pp = C.num(m.Por_perfusion) || 0;
    var estado = rest === null ? "" : rest <= 0 ? "al" : rest <= umbral || (pp > 0 && rest < pp) ? "aj" : "ok";
    return { via: m.Via || "", expediente: m.Expediente || "", adjudicadas: adj, previas: prev, pedidas: ped, consumidas: cons, restantes: rest, umbral: umbral, pct: pct, estado: estado };
  };
  function expedienteResumen(m, x) {
    if (x.adjudicadas === null) return aviso("info", "Indica las <b>unidades adjudicadas</b> para seguir lo que queda del expediente" + (x.expediente ? " " + esc(x.expediente) : "") + ".");
    var ancho = x.adjudicadas > 0 ? Math.max(0, Math.min(100, x.restantes / x.adjudicadas * 100)) : 0;
    var txt = "<b>" + esc(x.expediente || "Expediente sin nº") + "</b>" + (x.via ? " · " + esc(x.via) : "") + ": " + H.n(x.adjudicadas, 0) + " adjudicadas − " + H.n(x.previas, 0) + " consumidas antes de HOME − " + H.n(x.pedidas, 0) + " pedidas desde HOME = <b>" + H.n(Math.max(0, x.restantes), 0) + " restantes</b>.";
    return '<div class="v71-exp-estado ' + x.estado + '"><div>' + txt + '</div><div class="barra-stock ' + (x.estado === "ok" ? "" : x.estado) + '" title="Unidades restantes"><i style="width:' + ancho + '%"></i></div></div>' +
      (x.estado === "al" ? aviso("al", "<b>Expediente agotado.</b> Abre un nuevo contrato menor o licitación para seguir pidiendo este producto.", "triangle-alert") : x.estado === "aj" ? aviso("aj", "<b>El expediente se está acabando:</b> quedan " + H.n(x.restantes, 0) + " de " + H.n(x.adjudicadas, 0) + " (aviso por debajo del " + H.n(x.pct, 0) + " % o de lo que gasta una perfusión). Prepara el siguiente CM o licitación.", "triangle-alert") : "");
  }
  H.expedienteResumenHTML = function (m) { var x = H.expedienteEstado(m); return x ? expedienteResumen(m, x) : ""; };
  function expAvisables() { return activos().filter(function (m) { if (sinConsumo(m)) return false; var x = H.expedienteEstado(m); return x && (x.estado === "aj" || x.estado === "al"); }); }
  H.expedientesPorAgotar = expAvisables;
  function avisoExpedientes() {
    var l = expAvisables(); if (!l.length) return "";
    return aviso(l.some(function (m) { return H.expedienteEstado(m).estado === "al"; }) ? "al" : "aj", "<b>" + l.length + " expediente(s) agotados o a punto de agotarse:</b> " + l.map(function (m) { var x = H.expedienteEstado(m); return '<button type="button" class="bt mini" data-act="editarMat" data-id="' + esc(m.ID) + '">' + esc(m.Nombre) + " · " + esc(x.expediente || "sin nº") + " · quedan " + H.n(Math.max(0, x.restantes), 0) + "/" + H.n(x.adjudicadas, 0) + "</button>"; }).join(" ") + " Ábrelos para iniciar el siguiente CM o licitación.", "file-warning");
  }
  function avisoCatalogo() {
    var p; try { p = H.planCatalogo(); } catch (e) { return ""; }
    return p.altas.length ? aviso("info", "<b>Faltan " + p.altas.length + " producto(s) del catálogo de referencia</b> del protocolo en el inventario. " + '<button type="button" class="bt mini pri" data-act="cargarCatalogo">' + ico("list-checks", "s") + "Cargar catálogo</button>") : "";
  }
  // chip del expediente en las tablas: restantes / adjudicadas (antes: pedidas / adjudicadas)
  H.chipsMat = function (m) {
    var c = ""; if (m.Tipo && m.Tipo !== "Fungible") c += ' <span class="chip' + (m.Tipo === "Inventariable" ? " info" : "") + '">' + esc(m.Tipo) + "</span>";
    if (m.Via) c += ' <span class="chip pri">' + esc(m.Via) + "</span>";
    var x = m.Expediente ? H.expedienteEstado(m) : null;
    if (x) c += ' <span class="chip v71-chip-exp' + (x.estado === "al" ? " al" : x.estado === "aj" ? " aj" : "") + '" title="Expediente: unidades restantes / adjudicadas">' + esc(m.Expediente) + (x.adjudicadas !== null ? " · quedan " + H.n(Math.max(0, x.restantes), 0) + "/" + H.n(x.adjudicadas, 0) : "") + "</span>";
    return c;
  };
  function pedidasDe(id, exp, inicio) {
    var e = String(exp || "").trim().toLowerCase(), t0 = inicio ? C.aFecha(inicio) : null, s = 0;
    H.filas("Pedidos").forEach(function (p) {
      if (!/^(Enviado|Recibido)$/.test(p.Estado || "")) return; var pe = String(p.Expediente || "").trim().toLowerCase(), f = C.aFecha(p.Fecha);
      if (e && (pe ? pe !== e : t0 && f && f < t0)) return;
      var ls = []; try { ls = typeof p.Lineas_JSON === "string" ? JSON.parse(p.Lineas_JSON || "[]") : p.Lineas_JSON || []; } catch (er) { ls = []; }
      ls.forEach(function (l) { if (l.Material === id) s += C.num(l.Cantidad) || 0; });
    });
    return C.r(s, 2);
  }
  H.pedidasExpediente = pedidasDe;
  H.acc.expNuevo = function (el) {
    if (!H.puede("inventario")) return; var m = H.fila("Material", el.getAttribute("data-id")); if (!m) return;
    var dlg = el.closest && el.closest("dialog"); if (dlg) dlg.close();
    var x = H.expedienteEstado(m) || { adjudicadas: C.num(m.Unidades_contrato), previas: C.num(m.Unidades_previas) || 0, pedidas: C.num(m.Unidades_pedidas) || 0 }, hoy = C.diaISO(new Date()), via = /^(Contrato menor|Licitación)$/.test(m.Via || "") ? m.Via : "Contrato menor";
    var antes = m.Expediente || x.adjudicadas !== null ? aviso("info", "El expediente actual <b>" + esc(m.Expediente || "sin nº") + "</b>" + (m.Via ? " (" + esc(m.Via) + ")" : "") + " se cierra hoy y pasa al historial" + (x.adjudicadas !== null ? " con " + H.n(x.adjudicadas, 0) + " adjudicadas, " + H.n((x.previas || 0) + (x.pedidas || 0), 0) + " consumidas y " + H.n(x.adjudicadas - (x.previas || 0) - (x.pedidas || 0), 0) + " restantes" : "") + ".") : "";
    var cuerpo = antes + '<div class="rejilla dos">' + campo("enVia", "Vía", '<select id="enVia">' + ["Contrato menor", "Licitación"].map(function (v) { return "<option" + (v === via ? " selected" : "") + ">" + v + "</option>"; }).join("") + "</select>") +
      campo("enExp", "Nº del nuevo expediente", '<input id="enExp" autocomplete="off" placeholder="CM-2027-…">') + campo("enIni", "Inicio", '<input id="enIni" type="date" value="' + hoy + '">') +
      campo("enAdj", "Unidades adjudicadas", '<input id="enAdj" inputmode="decimal" data-num="1">') + campo("enPrev", "Consumidas antes de registrar en HOME", '<input id="enPrev" inputmode="decimal" data-num="1" value="0">') +
      campo("enProv", "Proveedor", '<input id="enProv" autocomplete="off" value="' + esc(m.Proveedor || "") + '">') + campo("enMail", "Correo del proveedor", '<input id="enMail" autocomplete="off" value="' + esc(m.Email_proveedor || "") + '">') + '</div><div class="msg-error" id="enErr" role="alert"></div>';
    H.modal({ titulo: "Nuevo expediente · " + m.Nombre, ancho: true, cuerpo: cuerpo, pie: '<button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="enOk">' + ico("folder-plus") + "Abrir el expediente</button>",
      alAbrir: function (d) { d.querySelector("#enOk").addEventListener("click", function () {
        var g = function (i) { return d.querySelector("#" + i).value.trim(); }, nx = g("enExp"), adj = C.num(g("enAdj")), prev = C.num(g("enPrev")) || 0, err = d.querySelector("#enErr");
        if (nx.length < 2) { err.textContent = "Escribe el nº del nuevo expediente."; return; }
        if (m.Expediente && nx.toLowerCase() === String(m.Expediente).trim().toLowerCase()) { err.textContent = "Es el mismo nº que el expediente actual."; return; }
        if (adj === null || adj <= 0) { err.textContent = "Indica las unidades adjudicadas (mayor que 0)."; return; }
        if (prev < 0 || prev > adj) { err.textContent = "Las consumidas antes de HOME deben estar entre 0 y las adjudicadas."; return; }
        var hist = H.expedientesHist(m), ini = g("enIni") || hoy;
        if (m.Expediente || x.adjudicadas !== null) hist.push({ Expediente: m.Expediente || "", Via: m.Via || "", Inicio: m.Expediente_inicio || "", Fin: hoy, Adjudicadas: x.adjudicadas, Previas: x.previas || 0, Pedidas: x.pedidas || 0, Proveedor: m.Proveedor || "", Cerrado_por: (S.usuario || {}).nombre || "", Cerrado_en: new Date().toISOString() });
        var o = { ID: m.ID, Via: g("enVia"), Expediente: nx, Expediente_inicio: ini, Unidades_contrato: adj, Unidades_previas: prev, Proveedor: g("enProv"), Email_proveedor: g("enMail"), Expedientes_JSON: JSON.stringify(hist), Unidades_pedidas: pedidasDe(m.ID, nx, ini) };   // Unidades_pedidas: lo recalcula el servidor
        H.guardar("Material", [o]); d.close(); H.toast("Expediente " + nx + " abierto para «" + m.Nombre + "»; el anterior queda en el historial.");
      }); } });
  };
  // campana: avisos de expediente para los gestores
  var accExp = H.alertasAccion;
  H.alertasAccion = function () {
    var out = accExp ? accExp() : []; if (!H.esGestorInv()) return out;
    expAvisables().forEach(function (m) { var x = H.expedienteEstado(m); out.push({ id: "expd|" + m.ID + "|" + (m.Expediente || "") + "|" + x.estado, t: new Date(), icono: "file-warning", titulo: (x.estado === "al" ? "Expediente agotado · " : "Expediente a punto de agotarse · ") + m.Nombre, texto: (m.Expediente || "sin nº") + " · quedan " + H.n(Math.max(0, x.restantes), 0) + " de " + H.n(x.adjudicadas, 0) + ": abre el siguiente CM o licitación", href: "#/inventario/" + pestanaDe(m), tipo: "accion" }); });
    return out;
  };

  // ---- 10.3 Eliminar material: sin historial se borra (webBorrar, borrado lógico en el servidor); con movimientos, solicitudes o pedidos se da de baja (Activo = false)
  H.movimientosDe = function (id) { return H.filas("Movimientos").filter(function (x) { return x.Material === id; }); };
  function historialDe(id) {
    var mv = H.movimientosDe(id).length, so = H.filas("Solicitudes").filter(function (x) { return x.Material === id; }).length, pe = 0;
    H.filas("Pedidos").forEach(function (p) { var ls = []; try { ls = typeof p.Lineas_JSON === "string" ? JSON.parse(p.Lineas_JSON || "[]") : p.Lineas_JSON || []; } catch (e) { ls = []; } if (ls.some(function (l) { return l.Material === id; })) pe++; });
    return { movimientos: mv, solicitudes: so, pedidos: pe, total: mv + so + pe };
  }
  H.historialMaterial = historialDe;
  H.matEliminar = function (id) {
    if (!H.puede("inventario")) { H.toast("El material lo elimina el gestor de inventario.", "error"); return Promise.resolve(false); }
    var m = H.fila("Material", id); if (!m) return Promise.resolve(false); var h = historialDe(id);
    if (h.total) {
      var q = [h.movimientos ? h.movimientos + " movimiento(s)" : "", h.solicitudes ? h.solicitudes + " solicitud(es)" : "", h.pedidos ? h.pedidos + " pedido(s)" : ""].filter(Boolean).join(", ");
      return H.confirmar("Dar de baja «" + m.Nombre + "»", "Tiene historial (" + q + "), así que no se borra: se da de baja. Deja de aparecer en el inventario y en la preparación, y se conserva todo su historial. Se puede reactivar desde «Dados de baja».", "Dar de baja", true).then(function (ok) { if (ok) { H.guardar("Material", [{ ID: id, Activo: false }]); H.toast("«" + m.Nombre + "» dado de baja."); } return ok; });
    }
    return H.confirmar("Eliminar «" + m.Nombre + "»", "No tiene movimientos, solicitudes ni pedidos. Se eliminará del catálogo (el servidor guarda la auditoría). No se puede deshacer desde la app.", "Eliminar", true).then(function (ok) { if (ok) { H.borrar("Material", [id]).catch(function () { }); H.toast("«" + m.Nombre + "» eliminado."); } return ok; });
  };
  H.acc.matEliminar = function (el) { H.matEliminar(el.getAttribute("data-id")); };
  H.acc.matReactivar = function (el) { if (!H.puede("inventario")) return; H.guardar("Material", [{ ID: el.getAttribute("data-id"), Activo: true }]); H.toast("Material reactivado."); };
  function bajasHTML(l, ges) {
    if (!l.length) return "";
    return '<details class="plegable v71-bajas"><summary>' + ico("archive", "s") + " Dados de baja (" + l.length + ')</summary><div class="dentro"><div class="tabla-env"><table class="t"><thead><tr><th>Material</th><th>Referencia</th><th class="num">Movimientos</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>' +
      l.sort(function (a, b) { return String(a.Nombre).localeCompare(String(b.Nombre), "es"); }).map(function (m) { return "<tr><td><b>" + esc(m.Nombre) + "</b></td><td>" + esc(m.Referencia || "—") + '</td><td class="num">' + H.movimientosDe(m.ID).length + '</td><td><div class="acc-mat">' + (ges ? '<button class="bt mini" data-act="matReactivar" data-id="' + esc(m.ID) + '">' + ico("archive-restore", "s") + "Reactivar</button>" : "") + '<button class="bt mini" data-act="verMat" data-id="' + esc(m.ID) + '" aria-label="Ficha de ' + esc(m.Nombre) + '">' + ico("info", "s") + "</button></div></td></tr>"; }).join("") + "</tbody></table></div></div></details>";
  }

  // ---- 10.4 Morfometría: «Cómo tomar las medidas» con Foto (lámina técnica) y Vídeo (animación paso a paso, sin archivos externos)
  var CINTA = {
    OBL: "Apoya el cero de la cinta en la nuca, entre las orejas, y llévala por encima del lomo, pegada a la línea dorsal, hasta la base de la cola.",
    NL: "Cero en la nuca; lleva la cinta por la línea media del cuello hasta la cruz, el punto más alto entre las escápulas.",
    BL1: "Cero en la base de la cola; tensa la cinta en línea recta por el costado hasta la punta del hombro.",
    HSLD: "Con el animal de pie en suelo plano, apoya el cero en el suelo junto a la pata delantera y sube la cinta en vertical hasta la cruz (ayuda apoyar una regla en el lomo).",
    HHIP: "Igual que la altura a la cruz, pero hasta la punta de la cadera: cinta vertical desde el suelo, sin seguir la curva del cuerpo.",
    HGH: "Pasa la cinta alrededor del tórax justo detrás de las patas delanteras, perpendicular al lomo. Ajusta sin apretar y lee donde se cruza con el cero.",
    MGH: "Rodea el tronco a mitad de camino entre las patas delanteras y las traseras, perpendicular al lomo y sin apretar.",
    PGH: "Rodea el tronco justo delante de las patas traseras (flanco), perpendicular al lomo y sin apretar."
  };
  H.MORFO_CINTA = CINTA;
  var VEL = [0.5, 1, 1.5, 2], DUR_PASO = 7000;
  function trazo(g) { if (!g.e) return g.d; var e = g.e; return "M" + e[0] + "," + (e[1] - e[3]) + " A" + e[2] + "," + e[3] + " 0 1 1 " + e[0] + "," + (e[1] + e[3]) + " A" + e[2] + "," + e[3] + " 0 1 1 " + e[0] + "," + (e[1] - e[3]); }
  function pasosMorfo() { return C.MORFO.map(function (m) { return { id: m.id, sigla: m.sigla, nombre: m.nombre, como: m.como, cinta: CINTA[m.sigla] || "", col: MF.COL[m.sigla] || "#0f766e", g: MF.G[m.sigla] }; }).filter(function (p) { return p.g; }); }
  H.morfoPasos = pasosMorfo;
  function morfoVideoHTML() {
    var P = pasosMorfo();
    return '<div class="v71-video"><div class="v71-pant"><svg class="morfo-svg v71-svg" viewBox="' + MF.VB + '" role="img" aria-label="Animación: cómo tomar las medidas morfométricas">' + MF.cerdo + '<g class="v71-capa"></g></svg><span class="v71-cont" aria-hidden="true"></span></div>' +
      '<div class="v71-barra" aria-hidden="true"><i></i></div><div class="v71-rot" aria-live="polite"></div>' +
      '<div class="v71-ctrl"><button type="button" class="bt" data-mfc="prev" aria-label="Medida anterior">' + ico("skip-back") + '</button><button type="button" class="bt pri" data-mfc="play" aria-label="Pausa">' + ico("pause") + '<span>Pausa</span></button><button type="button" class="bt" data-mfc="next" aria-label="Medida siguiente">' + ico("skip-forward") + "</button>" +
      '<label class="v71-vel"><span>Velocidad</span><select data-mfc="vel" aria-label="Velocidad">' + VEL.map(function (v) { return '<option value="' + v + '"' + (v === 1 ? " selected" : "") + ">" + String(v).replace(".", ",") + "×</option>"; }).join("") + "</select></label></div>" +
      '<div class="v71-pasos" role="tablist" aria-label="Medidas">' + P.map(function (p, k) { return '<button type="button" role="tab" data-mfk="' + k + '" style="--c:' + p.col + '">' + esc(p.sigla) + "</button>"; }).join("") + "</div></div>";
  }
  // reproductor: requestAnimationFrame (o setTimeout), se para al cerrar el diálogo o al volver a «Foto»
  function morfoVideo(raiz) {
    var P = pasosMorfo(), i = 0, t = 0, vel = 1, play = true, vivo = true, ult = null, NS = "http://www.w3.org/2000/svg", capa = raiz.querySelector(".v71-capa");
    var raf = window.requestAnimationFrame ? function (f) { return window.requestAnimationFrame(f); } : function (f) { return setTimeout(function () { f(Date.now()); }, 40); };
    try { if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { play = false; t = DUR_PASO; } } catch (e) { }
    function el(n, a) { var e = document.createElementNS(NS, n); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); return e; }
    function pintarPaso() {
      var p = P[i]; capa.innerHTML = "";
      P.forEach(function (q, j) { if (j < i) capa.appendChild(el("path", { d: trazo(q.g), fill: "none", stroke: q.col, "stroke-width": 3, opacity: 0.2, "stroke-linecap": "round" })); });
      capa.appendChild(el("path", { d: trazo(p.g), class: "v71-cinta", fill: "none", stroke: "#f2c94c", "stroke-width": 9, "stroke-linecap": "round", pathLength: 100, "stroke-dasharray": "100 100", "stroke-dashoffset": 100 }));
      capa.appendChild(el("path", { d: trazo(p.g), class: "v71-cinta v71-marcas", fill: "none", stroke: "#5b4a12", "stroke-width": 9, pathLength: 100, "stroke-dasharray": "0.4 2.1", opacity: 0 }));
      var g = el("g", { class: "v71-cota", opacity: 0 }); g.innerHTML = MF.cota(p.sigla); capa.appendChild(g);
      raiz.querySelector(".v71-rot").innerHTML = '<div class="v71-tit"><span class="v71-sig" style="background:' + p.col + '">' + esc(p.sigla) + "</span><b>" + esc(p.nombre) + "</b></div><p>" + esc(p.como) + '</p><p class="v71-cinta-t">' + ico("ruler", "s") + "<span>" + esc(p.cinta) + "</span></p>";
      raiz.querySelector(".v71-cont").textContent = (i + 1) + " / " + P.length;
      Array.prototype.forEach.call(raiz.querySelectorAll("[data-mfk]"), function (b, j) { b.classList.toggle("activo", j === i); b.setAttribute("aria-selected", String(j === i)); });
      dibujar();
    }
    function dibujar() {
      var f = Math.min(1, t / DUR_PASO), a = Math.min(1, f / 0.55), e = 1 - Math.pow(1 - a, 3), cs = capa.querySelectorAll(".v71-cinta"), mk = capa.querySelector(".v71-marcas"), co = capa.querySelector(".v71-cota");
      if (cs[0]) cs[0].setAttribute("stroke-dashoffset", String(C.r(100 * (1 - e), 2)));
      if (mk) mk.setAttribute("opacity", String(C.r(Math.max(0, Math.min(1, (f - 0.5) / 0.1)) * 0.85, 2)));
      if (co) co.setAttribute("opacity", String(C.r(Math.max(0, Math.min(1, (f - 0.6) / 0.15)), 2)));
      var b = raiz.querySelector(".v71-barra i"); if (b) b.style.width = C.r((i + f) / P.length * 100, 2) + "%";
    }
    function botonPlay() { var b = raiz.querySelector('[data-mfc="play"]'); if (!b) return; b.innerHTML = ico(play ? "pause" : "play") + "<span>" + (play ? "Pausa" : "Reproducir") + "</span>"; b.setAttribute("aria-label", play ? "Pausa" : "Reproducir"); }
    function bucle(ahora) {
      if (!vivo) return; if (!raiz.isConnected) { vivo = false; return; }
      if (ult === null) ult = ahora; var dt = Math.max(0, Math.min(200, ahora - ult)); ult = ahora;
      if (play) { t += dt * vel; if (t >= DUR_PASO) { i = (i + 1) % P.length; t = 0; pintarPaso(); } else dibujar(); }
      raf(bucle);
    }
    function ir(k) { i = (k + P.length) % P.length; t = play ? 0 : DUR_PASO; pintarPaso(); }
    raiz.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest("[data-mfc],[data-mfk]"); if (!b || b.tagName === "SELECT") return; var c = b.getAttribute("data-mfc");
      if (c === "play") { play = !play; if (play && t >= DUR_PASO) t = 0; botonPlay(); } else if (c === "prev") ir(i - 1); else if (c === "next") ir(i + 1); else if (b.hasAttribute("data-mfk")) ir(Number(b.getAttribute("data-mfk")));
    });
    var sv = raiz.querySelector('[data-mfc="vel"]'); if (sv) sv.addEventListener("change", function () { vel = Number(sv.value) || 1; });
    pintarPaso(); botonPlay(); raf(bucle);
    return { ir: ir, pausar: function () { play = false; botonPlay(); }, reproducir: function () { play = true; if (t >= DUR_PASO) t = 0; botonPlay(); }, parar: function () { vivo = false; }, estado: function () { return { paso: i, sigla: P[i].sigla, t: t, vel: vel, play: play, vivo: vivo }; } };
  }
  H.acc.infoMorfo = function () {
    var foto = H.morfoSVG() + '<ol class="lista-morfo">' + C.MORFO.map(function (m) { return "<li><b>" + esc(m.sigla) + " · " + esc(m.nombre) + "</b><span>" + esc(m.como) + "</span></li>"; }).join("") + "</ol>" +
      '<p class="v71-mf-nota">' + ico("ruler", "s") + " Cinta métrica flexible, animal de pie y tranquilo, cabeza en posición natural. Longitudes y alturas en línea recta; perímetros ajustando la cinta sin apretar. Anota en centímetros.</p>";
    var seg = '<div class="segmentado v71-mf-seg" role="tablist"><button type="button" role="tab" data-mf="foto" class="activo" aria-selected="true">' + ico("image", "s") + '<span>Foto</span></button><button type="button" role="tab" data-mf="video" aria-selected="false">' + ico("video", "s") + "<span>Vídeo</span></button></div>";
    H.modal({ titulo: "Cómo tomar las medidas", ancho: true, cuerpo: '<div class="v71-mf">' + seg + '<div class="v71-mf-foto">' + foto + '</div><div class="v71-mf-video" hidden></div></div>',
      alAbrir: function (d) {
        var rep = null, cv = d.querySelector(".v71-mf-video"), cf = d.querySelector(".v71-mf-foto");
        d.querySelector(".v71-mf-seg").addEventListener("click", function (ev) {
          var b = ev.target.closest("[data-mf]"); if (!b) return; var v = b.getAttribute("data-mf") === "video";
          Array.prototype.forEach.call(d.querySelectorAll("[data-mf]"), function (x) { var on = x === b; x.classList.toggle("activo", on); x.setAttribute("aria-selected", String(on)); });
          cf.hidden = v; cv.hidden = !v;
          if (v) { if (!rep) { cv.innerHTML = morfoVideoHTML(); rep = morfoVideo(cv); } else rep.reproducir(); } else if (rep) rep.pausar();
          H.morfoReproductor = rep;
        });
        d.addEventListener("close", function () { if (rep) rep.parar(); });
      } });
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v07d.js"] = "0.7.1";
