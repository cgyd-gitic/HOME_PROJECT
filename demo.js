/* HOME · servidor simulado para el modo demostración (mismas funciones y respuestas que el servidor de Apps Script).
   Los datos son SINTÉTICOS (generador con semilla) y se guardan solo en este navegador (IndexedDB). */
(function () {
  "use strict";
  var C = window.HOMECalc, DB = null, listo = null, VERSION_DEMO = 4;
  var TABLAS = ["Experimentos", "Animales", "Dieta", "Formularios", "Mediciones", "Eventos", "Avisos", "Material", "Movimientos", "Solicitudes", "Personal", "Usuarios", "Config", "Solicitudes_Acceso"];
  function idb(op, v) { return new Promise(function (ok) { try { var r = indexedDB.open("home-demo", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { var tx = r.result.transaction("kv", op === "get" ? "readonly" : "readwrite"), st = tx.objectStore("kv"); if (op === "get") { var q = st.get("db"); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { ok(null); }; } else { st.put(v, "db"); tx.oncomplete = function () { ok(true); }; } }; r.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); }
  var tGuardar = null; function persistir() { clearTimeout(tGuardar); tGuardar = setTimeout(function () { idb("put", DB); }, 400); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function ahoraISO() { return new Date().toISOString(); }
  function meta(f, u, t) { f.Creado_por = f.Creado_por || u; f.Creado_en = f.Creado_en || t; f.Actualizado_por = u; f.Actualizado_en = t; if (f.Borrado === undefined) f.Borrado = false; return f; }

  // ------------------------------------------------------------------ generador de datos sintéticos
  function sembrar() {
    var db = { version: VERSION_DEMO, tablas: {}, sesiones: {} }; TABLAS.forEach(function (t) { db.tablas[t] = []; });
    var T = db.tablas, u = "demo", t = ahoraISO(), R = rng(20261111);
    function add(tab, f) { T[tab].push(meta(f, u, t)); }
    function g(m, s) { var a = R(), b = R(); return m + s * Math.sqrt(-2 * Math.log(a || 1e-9)) * Math.cos(2 * Math.PI * b); }
    [["ADMIN", "Administrador demo"], ["INVESTIGADOR", "Investigador demo"], ["COLABORADOR", "Colaborador demo"]].forEach(function (r, i) { add("Usuarios", { ID: "USR-D" + i, Email: "demo-" + r[0].toLowerCase() + "@home.demo", Nombre: r[1], Rol: r[0], Activo: true }); });
    [["Fondevila, C.", "Cirujanos (F.E.A.)"], ["Hessheimer, A.", "Cirujanos (F.E.A.)"], ["Residente A", "Cirujanos (residentes)"], ["Residente B", "Cirujanos (residentes)"], ["Alumno/a 1", "Alumnos de Medicina"], ["Largo, C.", "Anestesia"], ["Salinas, J.", "Veterinaria"],
      ["Burgos, P. P.", "Asistentes y técnicos"], ["Vengohechea, J.", "Asistentes y técnicos"], ["Técnico/a CCE", "Asistentes y técnicos"]].forEach(function (p, i) { add("Personal", { ID: "PER-D" + i, Nombre: p[0], Categoria: p[1], Email: "", Activo: true }); });
    var MAT = [["Oxigenador de membrana de larga duración", "Fungible de perfusión", "unidad", 6, 4, 2], ["Set de tubos Liver Assist", "Fungible de perfusión", "unidad", 3, 2, 1], ["Reservorio estéril", "Fungible de perfusión", "unidad", 4, 2, 1],
      ["Cánula portal 24 Fr", "Fungible de perfusión", "unidad", 5, 2, 1], ["Cánula arterial 10 Fr", "Fungible de perfusión", "unidad", 5, 2, 1], ["Sonda de temperatura", "Máquina de perfusión", "unidad", 2, 1, 1], ["Transductor de presión", "Máquina de perfusión", "unidad", 8, 4, 2],
      ["Filtro de hemodiafiltración", "HDF", "unidad", 7, 3, 2], ["Línea arteriovenosa Aquarius", "HDF", "unidad", 5, 2, 1], ["Líquido de reposición 5 L", "HDF", "bolsa", 40, 20, 14], ["Bolsa de efluente", "HDF", "unidad", 20, 10, 7],
      ["Bolsa CPDA-1 450 mL", "Material quirúrgico", "unidad", 18, 10, 6], ["Seda 2/0", "Material quirúrgico", "sobre", 30, 10, 4], ["Bisturí nº 23", "Material quirúrgico", "unidad", 25, 10, 3], ["Solución IGL-1 1 L", "Fármacos y soluciones", "bolsa", 4, 3, 3],
      ["Periolimel N4E 1500 mL", "Fármacos y soluciones", "bolsa", 10, 7, 7], ["Heparina sódica 5000 U/mL (5 mL)", "Fármacos y soluciones", "vial", 30, 25, 22], ["Jeringa 50 mL", "Fungible general", "unidad", 80, 40, 30], ["Tubo de gasometría", "Fungible general", "unidad", 150, 100, 120], ["Guantes estériles 7,5", "Fungible general", "par", 60, 30, 20]];
    MAT.forEach(function (m, i) { add("Material", { ID: "MAT-D" + i, Nombre: m[0], Categoria: m[1], Unidad: m[2], Stock_inicial: m[3], Stock_minimo: m[4], Por_perfusion: m[5], Referencia: "", Proveedor: "", Ubicacion: "Almacén CCE", Activo: true }); });
    add("Solicitudes", { ID: "SOL-D1", Fecha: new Date(Date.now() - 2 * 864e5).toISOString(), Solicitante: "Investigador demo", Material: "MAT-D14", Cantidad: 6, Urgencia: "Urgente", Motivo: "Quedan 4 bolsas de IGL-1 y cada perfusión usa 3", Estado: "Pendiente" });
    add("Solicitudes", { ID: "SOL-D2", Fecha: new Date(Date.now() - 5 * 864e5).toISOString(), Solicitante: "Investigador demo", Material: "", Nombre_nuevo: "Monitor continuo de glucosa (sensor)", Categoria: "Máquina de perfusión", Cantidad: 4, Urgencia: "Normal", Motivo: "Controlador BES (objetivo 1 del PI26/00141)", Estado: "Aprobada" });

    var ahora = Date.now(), H0 = 36e5;
    var exps = [{ n: 1, dias: 7, ini: ahora - 70 * 864e5, sexo: "H", peso: 24.6, hig: 640 }, { n: 2, dias: 7, ini: ahora - 45 * 864e5, sexo: "M", peso: 25.8, hig: 702 }, { n: 3, dias: 5.6, ini: ahora - 20 * 864e5, sexo: "H", peso: 23.9, hig: 611, fallo: true },
      { n: 4, dias: null, ini: ahora - 26.3 * H0, sexo: "M", peso: 25.1, hig: 668 }, { n: 5, dias: null, ini: null, sexo: "H", peso: 24.2, hig: 0, en_dias: 14 }, { n: 6, dias: null, ini: null, sexo: "M", peso: 25, hig: 0, en_dias: 42 }];
    exps.forEach(function (x) {
      var s = (x.n < 10 ? "0" : "") + x.n, id = "HOME-" + s, ini = x.ini ? new Date(C.enHora(new Date(x.ini), "11:00", 0).getTime() + (x.n === 4 ? 0 : 0)) : null;
      if (x.n === 4) ini = new Date(x.ini);
      var fin = ini && x.dias ? new Date(ini.getTime() + x.dias * 864e5) : null, est = x.n <= 3 ? "Finalizado" : x.n === 4 ? "Perfusión" : "Planificado";
      var fqx = ini ? new Date(ini.getTime() - 3.2 * H0) : C.enHora(new Date(ahora), "08:00", x.en_dias);
      add("Experimentos", { ID: id, Numero: x.n, Codigo_PM: "HOME-PM-" + s, Fase: "Fase 2 · 7 días de perfusión", Protocolo: "CHRONO-LIVER (circadiano)", Estado: est, Fecha_llegada: new Date(fqx.getTime() - 6 * 864e5).toISOString(), Fecha_cirugia: fqx.toISOString().slice(0, 10),
        Inicio_perfusion: ini ? ini.toISOString() : "", Fin_perfusion: fin ? fin.toISOString() : "", Peso_higado_inicial_g: x.hig || null, Peso_higado_final_g: fin ? Math.round(x.hig * (x.fallo ? 1.18 : 1.06)) : null, Volumen_perfusato_mL: 2390, Color: C.PALETA[(x.n - 1) % C.PALETA.length], Responsable: "Investigador demo", Notas: x.fallo ? "Datos sintéticos de demostración. Fin anticipado por deterioro del injerto (lactato y transaminasas en ascenso desde el día 4)." : "Datos sintéticos de demostración." });
      [["BD", 61, "M"], ["LD", x.peso, x.sexo]].forEach(function (a) { add("Animales", { ID: "HOME-" + a[0] + "-" + s, Experimento: id, Rol: a[0], Crotal: "ES" + (10000 + x.n * 7 + (a[0] === "BD" ? 1 : 2)), Sexo: a[2], Castrado: a[2] === "M" ? "Sí" : "No", Raza: "Landrace × Large White", Fecha_llegada: new Date(fqx.getTime() - 6 * 864e5).toISOString(), Hora_llegada: "10:00", Peso_llegada_kg: C.r(a[1] - 1.2, 1) }); });
      if (x.en_dias) return;   // planificados: sin animales, dieta ni datos todavía
      // dieta (6 días, 2 tomas)
      for (var d = 6; d >= 1; d--) ["08:00", "17:00"].forEach(function (h, k) {
        var f = new Date(fqx.getTime() - d * 864e5); if (d === 1 && k === 1) return;
        ["BD", "LD"].forEach(function (rol) { var pk = rol === "BD" ? 60 + (6 - d) * 0.2 : x.peso - 1.2 + (6 - d) * 0.2, en = C.energiaDieta(pk, rol === "BD" ? "M" : x.sexo, rol === "BD" || x.sexo === "M" ? "Sí" : "No", C.DEF.dieta), of = Math.round(en.g_toma), sob = Math.max(0, Math.round(g(of * 0.06, of * 0.05)));
          add("Dieta", { ID: id + "-d" + d + k + rol, Experimento: id, Animal: "HOME-" + rol + "-" + s, Fecha: f.toISOString().slice(0, 10), Hora: h, Toma: k ? "2ª toma" : "1ª toma", Peso_kg: k ? null : C.r(pk, 1), Temperatura_C: C.r(g(19.5, 0.6), 1), Humedad_pct: Math.round(g(52, 5)), EM_objetivo_kcal: Math.round(en.em_kcal), Ofrecido_g: of, Sobrante_g: sob, Consumido_g: of - sob, Responsable: "Técnico/a CCE", Observaciones: "" }); });
      });
      if (!ini) return;
      // quirófano
      var exang = new Date(ini.getTime() - 2.9 * H0), parada = new Date(exang.getTime() + g(11, 1.5) * 6e4), frio = new Date(parada.getTime() + g(3, 0.6) * 6e4), bi = new Date(frio.getTime() + 25 * 6e4), bf = new Date(bi.getTime() + g(70, 8) * 6e4);
      var evs = [["inicio_exanguinacion", exang], ["parada_cardiaca", parada], ["inicio_preservacion_fria", frio]];
      evs = evs.concat([["inicio_banco", bi], ["fin_banco", bf], ["inicio_perfusion", ini], ["fin_recalentamiento", new Date(ini.getTime() + 75 * 6e4)]]); if (fin) evs.push(["fin_perfusion", fin]);
      evs.forEach(function (e) { if (e[1] <= new Date(ahora)) add("Eventos", { ID: id + "|evento|" + e[0], Experimento: id, Tipo: e[0], Fecha_hora: e[1].toISOString(), Nota: "" }); });
      add("Formularios", { ID: id + "|cirugia|HOME-LD-" + s, Experimento: id, Tipo: "cirugia", Animal: "HOME-LD-" + s, Datos_JSON: JSON.stringify({ fecha: fqx.toISOString().slice(0, 10), peso_kg: x.peso, morfo: { HGH: C.r(g(76, 2), 0), OBL: C.r(g(88, 3), 0), HSLD: 48, MGH: 80, PGH: 74, HHIP: 50, BL1: 70, NL: 18 }, qx: { intubacion: "08:05", inicio: "08:40", temp_C: 21, humedad: 45 }, hemo: { Q_VP: Math.round(g(620, 60)), Q_AH: Math.round(g(130, 20)) }, ext: { volumen_mL: Math.round(g(900, 80)), solucion: "IGL-1" }, peso_higado_g: x.hig || null, asistentes: { fea: ["PER-D0", "PER-D1"], residentes: ["PER-D2"], anestesia: ["PER-D5"], veterinaria: ["PER-D6"], tecnicos: ["PER-D7", "PER-D8"] }, reportado: "Investigador demo" }) });
      add("Formularios", { ID: id + "|calculos|", Experimento: id, Tipo: "calculos", Animal: "", Datos_JSON: JSON.stringify({ V_total_mL: 2390, ceb: { sangre: 2200, heparina: 1.1, cefoxitina: 5, metronidazol: 50 }, corr: { KCl: 0.4, CaCl2: 3.5, NaHCO3: 25, Albumina: 105 }, npt: 1500 }) });
      add("Formularios", { ID: id + "|checklist|", Experimento: id, Tipo: "checklist", Animal: "", Datos_JSON: JSON.stringify({ items: {}, confirmado_en: x.n <= 3 ? ini.toISOString() : null }) });
      if (x.n <= 3) MAT.forEach(function (m, i) { add("Movimientos", { ID: id + "-mov" + i, Material: "MAT-D" + i, Fecha: ini.toISOString(), Cantidad: -m[5], Motivo: "Consumo perfusión", Experimento: id, Nota: "Checklist " + id }); if (x.n === 1) add("Movimientos", { ID: "COMPRA-" + i, Material: "MAT-D" + i, Fecha: new Date(ini.getTime() - 3 * 864e5).toISOString(), Cantidad: m[5] * 2 + (i % 3), Motivo: "Compra", Experimento: "", Nota: "Reposición inicial" }); });
      // mediciones
      var hasta = fin ? fin.getTime() : ahora, ruido = rng(1000 + x.n), mal = x.fallo ? function (h) { return h > 96 ? (h - 96) / 24 : 0; } : function () { return 0; };
      function gn(m, s) { var a = ruido(), b = ruido(); return m + s * Math.sqrt(-2 * Math.log(a || 1e-9)) * Math.cos(2 * Math.PI * b); }
      function hc(dt) { var hd = dt.getHours() + dt.getMinutes() / 60; return hd; }
      function pr(dt) { var hd = hc(dt), z = 0; [10.5, 13, 19].forEach(function (c) { z += Math.exp(-Math.pow((hd - c) / 1.2, 2)); }); return z; }   // efecto posprandial
      function med(muestra, punto, tn, fecha, vals) { var th = C.r((fecha - ini) / H0, 3); Object.keys(vals).forEach(function (v) { if (vals[v] === null || !isFinite(vals[v])) return; T.Mediciones.push(meta({ ID: id + "|" + muestra + "|" + punto + "|" + v, Experimento: id, Muestra: muestra, Punto: punto, T_nominal_h: tn, Fecha_hora: fecha.toISOString(), T_real_h: th, Variable: v, Valor: C.r(vals[v], C.variable(muestra, v).dec + 1), Texto: "", Unidad: C.variable(muestra, v).unidad }, u, t)); }); }
      // PRE
      med("PRE", "Pre", null, new Date(ini.getTime() - 20 * 6e4), { pH: 7.08, pO2: 145, pCO2: 33, Hb: 8.9, Hto: 27, Lactato: gn(7.5, 0.8), HCO3: 11.5, BE: -15, K: 3.4, Cl: 104, Ca: 0.31, Na: 151, Glucosa: 465, Albumina: 2.1, Mg: 1.6, P: 4.8, Osm: 302 });
      C.puntosMuestreo(ini.toISOString(), 8, C.DEF.muestreo).forEach(function (p) {
        var f = new Date(p.fecha.getTime() + gn(4, 3) * 6e4); if (f.getTime() > hasta) return; var h = (f - ini) / H0, m = mal(h), hd = hc(f), dia = h > 24, ppd = dia ? pr(f) : 0;
        var lac = 1.1 + 6.4 * Math.exp(-h / 2.2) + 0.25 * ppd + 1.8 * m * m + gn(0, 0.12);
        var vals = { ALT: 35 + 210 * (h / 14) * Math.exp(1 - h / 14) + 120 * m + gn(0, 8), AST: 60 + 780 * (h / 8) * Math.exp(1 - h / 8) + 400 * m + gn(0, 30), LDH: 700 + 2600 * (h / 7) * Math.exp(1 - h / 7) + 900 * m + gn(0, 90),
          GGT: 25 + 6 * h / 24 + gn(0, 2), BilT: 0.3 + 0.08 * h / 24 + gn(0, 0.03), FA: 180 + 15 * h / 24 + gn(0, 10), Glucosa: 110 + 330 * Math.exp(-h / 3) + 70 * ppd + 40 * m + gn(0, 10), Lactato: Math.max(0.4, lac),
          Colesterol: 75 + 4 * h / 24 + gn(0, 3), TG: 30 + 18 * ppd + gn(0, 4), ProtT: 4.6 - 0.05 * h / 24 + gn(0, 0.1), Albumina: 2.9 + 0.03 * h / 24 - 0.25 * m + gn(0, 0.05), ActPT: 55 + 25 * (1 - Math.exp(-h / 10)) - 20 * m + gn(0, 3), Fibrinogeno: 120 + 60 * (1 - Math.exp(-h / 30)) + gn(0, 8),
          Creatinina: 1.4 - 0.1 * h / 24 + gn(0, 0.05), HCO3: 24.5 - 9 * Math.exp(-h / 2) - 3 * m + gn(0, 0.6), BE: 0.6 - 11 * Math.exp(-h / 2) - 3.5 * m + gn(0, 0.6), Ca: 1.05 + gn(0, 0.05), Na: 143 + 0.8 * h / 24 + gn(0, 1), K: 4.1 + 0.3 * m + gn(0, 0.15), Cl: 106 + gn(0, 1.5),
          P: 4.2 - 0.25 * h / 24 + gn(0, 0.2), Mg: 2.0 + gn(0, 0.08), Urea: 18 + 3 * h / 24 + gn(0, 1), Amonio: 45 + 30 * Math.exp(-h / 4) + 40 * m + gn(0, 5), Osm: 296 + gn(0, 2), Hb: 8.6 - 0.1 * h / 24 + gn(0, 0.15), Hto: 26 - 0.3 * h / 24 + gn(0, 0.5),
          Cortisol: dia ? 55 + 230 * Math.exp(-Math.pow((hd - 8.6) / 0.9, 2)) + 130 * Math.exp(-Math.pow((hd - 11) / 0.9, 2)) + 110 * Math.exp(-Math.pow((hd - 17) / 0.9, 2)) + gn(0, 10) : 60 + gn(0, 12), Insulina: 8 + 25 * ppd + gn(0, 2) };
        med("PERF", p.etiqueta, p.t_h, f, vals);
        var pHa = 7.40 - 0.12 * Math.exp(-h / 2) - 0.06 * m + gn(0, 0.015), pco2 = 39 + gn(0, 2.5);
        [["ART", gn(84, 7) - 15 * m], ["POR", gn(46, 4)], ["CAV", gn(34, 3)]].forEach(function (r) {
          var po2 = r[1], hb = vals.Hb; med(r[0], p.etiqueta, p.t_h, f, { pH: pHa - (r[0] === "CAV" ? 0.03 : 0) + gn(0, 0.005), pO2: po2, pCO2: pco2 + (r[0] === "CAV" ? 4 : 0) + gn(0, 0.8), sO2: C.sO2Hill(po2), HCO3: vals.HCO3, BE: vals.BE, Hb: hb, Lactato: vals.Lactato, Glucosa: vals.Glucosa, Na: vals.Na, K: vals.K, Ca: vals.Ca, Cl: vals.Cl });
        });
        med("FLUJO", p.etiqueta, p.t_h, f, flujo(h, f, m));
        if (!dia ? (p.t_h % 2 === 0) : true) med("BILIS", p.etiqueta, p.t_h, f, (function () { var vol = Math.max(0.2, (p.t_h <= 2 ? 1.5 : dia ? 12 : 6) * (1 - 0.6 * m) + gn(0, 0.8)); return { Volumen_mL: vol, Peso_g: vol * 1.01, pH: 7.6 + gn(0, 0.08) - 0.2 * m, BilT: 18 + gn(0, 3), Glucosa: 20 + gn(0, 5), HCO3: 30 + gn(0, 2), Na: 150 + gn(0, 3), K: 4.5 + gn(0, 0.3), Cl: 100 + gn(0, 3), Lactato: 1 + gn(0, 0.2), LDH: 60 + gn(0, 10) }; })());
      });
      function flujo(h, f, m) { var hd = hc(f), noche = hd >= 22 || hd < 8; return { P_AH: 60 + gn(0, 2), P_AH_sis: 88 + gn(0, 3), P_AH_dia: 50 + gn(0, 3), Q_AH: Math.max(60, 120 + 140 * (1 - Math.exp(-h / 3)) - 60 * m + gn(0, 15)), P_VP: 3 + gn(0, 0.3), Q_VP: Math.max(200, 560 + 380 * (1 - Math.exp(-h / 3)) - 150 * m + gn(0, 40)),
        Temp: h < 1.25 ? 24 + 14 * h / 1.25 : (noche ? 36.6 : 37.6) + gn(0, 0.1), FiO2_ART: h < 1 ? 30 : 40, Barrido_ART: 300, FiO2_POR: 21, Barrido_POR: 420 }; }
      for (var hh = 27; ini.getTime() + hh * H0 <= hasta; hh += 3) { var ff = new Date(ini.getTime() + hh * H0); med("FLUJO", C.etiquetaPunto(hh), hh, ff, flujo(hh, ff, mal(hh))); }
      for (var hd2 = 6; hd2 <= 24 && ini.getTime() + hd2 * H0 <= hasta; hd2++) { var fh = new Date(ini.getTime() + hd2 * H0); med("HDF", C.etiquetaPunto(hd2), hd2, fh, { P_acceso: gn(-60, 6), P_retorno: gn(55, 5), TMP: gn(45, 6), Caida_P: gn(30, 4), P_efluente: gn(-20, 4), P_prefiltro: gn(110, 8), Temp: 37 + gn(0, 0.2) }); }
      for (var hi = 0; ini.getTime() + hi * H0 <= hasta; hi += 24) { var fi = new Date(ini.getTime() + hi * H0); med("INMUNO", C.etiquetaPunto(hi), hi, fi, { C3: gn(90, 8), C4: gn(12, 2), IgA: gn(60, 6), IgG: gn(1300, 90), IgM: gn(120, 12), PCR: gn(8 + hi / 24, 1.5) }); }
      for (var rp = 0; rp < 15; rp++) { var pr0 = C.DEF.recalentamiento.pasos[rp], fr = new Date(ini.getTime() + (pr0.t + 2) * 6e4); if (fr.getTime() > hasta) break; med("RECAL", "R" + pr0.t, C.r(pr0.t / 60, 3), fr, { Temp: pr0.Temp - 0.4 + gn(0, 0.2), P_VP: pr0.P_VP + gn(0, 0.2), P_AH: pr0.P_AH + gn(0, 1.5) }); }
      add("Formularios", { ID: id + "|hdf|", Experimento: id, Tipo: "hdf", Animal: "", Datos_JSON: JSON.stringify({ Q_sangre: 150, Q_dialisis: 1000, Extraccion: 0, Reposicion: 1000, liquido: "Bicarbonato 32 mmol/L", inicio: new Date(ini.getTime() + 6 * H0).toISOString() }) });
      if (x.n === 4) {
        var g0 = C.DEF.general; C.avisosMuestreo(id, ini.toISOString(), 7, C.DEF.muestreo, g0.aviso_muestra_min).concat(C.avisosCircadianos(id, ini.toISOString(), 7, C.DEF.circadiano, g0.aviso_antelacion_min)).concat(C.avisosRecalentamiento(id, ini.toISOString(), C.DEF.recalentamiento))
          .forEach(function (a) { a.Estado = C.aFecha(a.Fecha_hora).getTime() < ahora ? "Enviado" : "Pendiente"; add("Avisos", a); });
        add("Eventos", { ID: id + "|ev1", Experimento: id, Tipo: "ajuste", Fecha_hora: new Date(ini.getTime() + 2.1 * H0).toISOString(), Nota: "FiO₂ arterial 30 → 40 % (recomendación del asesor, punto 2h)" });
        add("Eventos", { ID: id + "|ev2", Experimento: id, Tipo: "incidencia", Fecha_hora: new Date(ini.getTime() + 9.4 * H0).toISOString(), Nota: "Alarma de presión de acceso de la HDF; se recoloca la línea. Sin consecuencias." });
      }
    });
    // v0.2: todo lo sembrado está validado; algunos registros del investigador quedan pendientes
    TABLAS.forEach(function (tb) { if (VALIDABLES.indexOf(tb) !== -1) T[tb].forEach(function (f) { f.Validado = true; f.Validado_por = "demo-admin@home.demo"; f.Validado_en = t; f.Previo_JSON = ""; }); });
    var inv = "demo-investigador@home.demo", m4 = T.Mediciones.filter(function (m) { return m.Experimento === "HOME-04" && m.Muestra === "PERF"; }).sort(function (a, b) { return b.T_real_h - a.T_real_h; });
    var tUlt = m4.length ? m4[0].T_real_h : null;
    m4.filter(function (m) { return m.T_real_h === tUlt && /^(Lactato|ALT|Glucosa)$/.test(m.Variable); }).forEach(function (m) { var antes = m.Valor; m.Valor = C.r(m.Valor * 1.08, 2); m.Validado = false; m.Previo_JSON = JSON.stringify({ Valor: antes }); m.Validado_por = ""; m.Validado_en = ""; m.Actualizado_por = inv; });
    T.Eventos.push(meta({ ID: "HOME-04|ev3", Experimento: "HOME-04", Tipo: "incidencia", Fecha_hora: new Date(ahora - 40 * 6e4).toISOString(), Nota: "Burbuja en la línea portal; purgada.", Validado: false, Previo_JSON: "" }, inv, t));
    T.Solicitudes_Acceso.push(meta({ ID: "ACC-0001", Fecha: new Date(ahora - 5 * H0).toISOString(), Nombre: "Lucía", Apellidos: "Ejemplo Demo", Email: "lucia.demo@example.org", Cargo: "Residente de Cirugía", Institucion: "HU La Paz", Rol_solicitado: "INVESTIGADOR", Comentario: "Guardias de perfusión de la semana próxima", Estado: "Pendiente" }, "anónimo", t));
    T.Solicitudes_Acceso.push(meta({ ID: "ACC-0000", Fecha: new Date(ahora - 9 * 864e5).toISOString(), Nombre: "Colaborador", Apellidos: "Externo Demo", Email: "externo.demo@example.org", Cargo: "Investigador visitante", Institucion: "Universidad", Rol_solicitado: "COLABORADOR", Estado: "Aprobada", Rol_asignado: "COLABORADOR", Resuelto_por: "demo-admin@home.demo", Resuelto_en: new Date(ahora - 8 * 864e5).toISOString() }, "anónimo", t));
    return db;
  }
  var VALIDABLES = ["Experimentos", "Animales", "Dieta", "Formularios", "Mediciones", "Eventos"], ALIAS = { REGISTRO: "INVESTIGADOR", VISUALIZAR: "COLABORADOR" };
  function normRol(r) { r = String(r || "").toUpperCase(); return ALIAS[r] || r; }
  function esPend(f) { return f.Validado === false || f.Validado === "FALSE"; }

  // ------------------------------------------------------------------ API simulada
  function sesion(token) { var s = DB.sesiones[token]; if (!s) throw new Error("Sesión caducada. Vuelve a entrar."); var u = DB.tablas.Usuarios.filter(function (x) { return x.Email === s; })[0]; if (!u || u.Activo === false) throw new Error("Sesión caducada. Vuelve a entrar."); return { email: u.Email, nombre: u.Nombre, rol: normRol(u.Rol), id: u.ID }; }
  function req(u, roles) { if (roles.indexOf(u.rol) === -1) throw new Error("Tu rol (" + u.rol + ") no permite esta acción."); }
  function vivas(t, admin) { return DB.tablas[t].filter(function (f) { return f.Borrado !== true || (admin && esPend(f)); }); }
  var API = {
    webSolicitarCodigo: function () { return { ok: true, mensaje: "Si el correo tiene acceso, recibirás un código." }; },
    webVerificarCodigo: function (email) { var u = DB.tablas.Usuarios.filter(function (x) { return x.Email === email; })[0]; if (!u) throw new Error("Código incorrecto o caducado."); var tok = "demo-" + Math.random().toString(36).slice(2) + Date.now(); DB.sesiones[tok] = email; u.Ultimo_acceso = ahoraISO(); persistir(); return { ok: true, token: tok, usuario: { email: u.Email, nombre: u.Nombre, rol: normRol(u.Rol), personalId: "", id: u.ID } }; },
    webSesion: function (tok) { return { usuario: sesion(tok) }; },
    webSalir: function (tok) { delete DB.sesiones[tok]; persistir(); return { ok: true }; },
    webCargar: function (tok) { var u = sesion(tok), o = {}, ad = u.rol === "ADMIN"; TABLAS.forEach(function (t) { if (t !== "Mediciones") o[t] = vivas(t, ad); }); if (!ad) { o.Usuarios = []; o.Solicitudes_Acceso = []; } return { usuario: u, ahora: ahoraISO(), config: {}, tablas: o }; },
    webMediciones: function (tok, exps) { var u = sesion(tok); return { filas: vivas("Mediciones", u.rol === "ADMIN").filter(function (m) { return exps.indexOf(m.Experimento) !== -1; }) }; },
    webCambios: function (tok, desde) { var u = sesion(tok), o = {}; TABLAS.forEach(function (t) { if ((t === "Usuarios" || t === "Solicitudes_Acceso") && u.rol !== "ADMIN") return; var f = DB.tablas[t].filter(function (x) { return String(x.Actualizado_en) > String(desde); }); if (f.length) o[t] = f; }); return { ahora: ahoraISO(), tablas: o }; },
    webGuardar: function (tok, tabla, filas) {
      var u = sesion(tok); if (TABLAS.indexOf(tabla) === -1) throw new Error("Tabla no válida: " + tabla);
      if (/^(Config|Usuarios|Material|Movimientos)$/.test(tabla)) req(u, ["ADMIN"]); else if (/^(Avisos|Solicitudes_Acceso)$/.test(tabla)) throw new Error("Sin permiso: " + tabla + " no se escribe con webGuardar."); else req(u, ["ADMIN", "INVESTIGADOR"]);
      var val = VALIDABLES.indexOf(tabla) !== -1;
      var l = DB.tablas[tabla], idx = {}, t = ahoraISO(), out = []; l.forEach(function (f, i) { idx[f.ID] = i; });
      filas.forEach(function (f) {
        if (tabla === "Solicitudes" && u.rol !== "ADMIN" && idx[f.ID] !== undefined && f.Estado && f.Estado !== l[idx[f.ID]].Estado) throw new Error("Solo un administrador puede cambiar el estado de una solicitud.");
        f = Object.assign({}, f); ["Validado", "Validado_por", "Validado_en", "Previo_JSON"].forEach(function (k) { delete f[k]; });
        var prev = idx[f.ID] !== undefined ? l[idx[f.ID]] : null, o = prev ? Object.assign({}, prev, f) : Object.assign({}, f); delete o.Creado_por; if (prev) { o.Creado_por = prev.Creado_por; o.Creado_en = prev.Creado_en; } meta(o, u.email, t);
        if (val) {
          if (u.rol === "ADMIN") { o.Validado = true; o.Validado_por = u.email; o.Validado_en = t; o.Previo_JSON = ""; }
          else { var pj = {}; try { pj = prev && prev.Previo_JSON ? JSON.parse(prev.Previo_JSON) : {}; } catch (e) { pj = {}; } var eraNueva = prev && esPend(prev) && !prev.Previo_JSON;
            if (prev && !eraNueva) Object.keys(f).forEach(function (k) { if (k !== "ID" && !pj.hasOwnProperty(k) && String(prev[k]) !== String(f[k])) pj[k] = prev[k] === undefined ? "" : prev[k]; });
            o.Validado = false; o.Validado_por = ""; o.Validado_en = ""; o.Previo_JSON = prev && !eraNueva && Object.keys(pj).length ? JSON.stringify(pj) : ""; }
        }
        if (idx[f.ID] !== undefined) l[idx[f.ID]] = o; else { idx[f.ID] = l.length; l.push(o); } out.push(o);
      });
      persistir(); return { ok: true, filas: out, ahora: t };
    },
    webBorrar: function (tok, tabla, ids) { var u = sesion(tok); if (/^(Config|Usuarios|Material|Movimientos)$/.test(tabla)) req(u, ["ADMIN"]); else req(u, ["ADMIN", "INVESTIGADOR"]); var n = 0, t = ahoraISO(), val = VALIDABLES.indexOf(tabla) !== -1;
      DB.tablas[tabla].forEach(function (f) { if (ids.indexOf(f.ID) === -1 || f.Borrado === true) return; if (u.rol !== "ADMIN" && f.Creado_por !== u.email && f.Creado_por !== "demo") throw new Error("Sin permiso: solo puedes borrar tus propios registros.");
        var eraVal = !esPend(f); f.Borrado = true; meta(f, u.email, t); if (val) { if (u.rol === "ADMIN") { f.Validado = true; f.Previo_JSON = ""; } else { f.Validado = false; f.Previo_JSON = eraVal ? JSON.stringify({ Borrado: false }) : f.Previo_JSON || ""; } } n++; }); persistir(); return { ok: true, n: n }; },
    webValidar: function (tok, tabla, ids) { var u = sesion(tok); req(u, ["ADMIN"]); var t = ahoraISO(), n = 0, out = []; DB.tablas[tabla].forEach(function (f) { if (ids.indexOf(f.ID) === -1) return; if (esPend(f)) n++; f.Validado = true; f.Validado_por = u.email; f.Validado_en = t; f.Previo_JSON = ""; f.Actualizado_en = t; out.push(f); }); persistir(); return { ok: true, n: n, filas: out }; },
    webRechazar: function (tok, tabla, ids, nota) { var u = sesion(tok); req(u, ["ADMIN"]); var t = ahoraISO(), n = 0, out = []; DB.tablas[tabla].forEach(function (f) { if (ids.indexOf(f.ID) === -1 || !esPend(f)) return; var p = {}; try { p = f.Previo_JSON ? JSON.parse(f.Previo_JSON) : {}; } catch (e) { } if (Object.keys(p).length) Object.keys(p).forEach(function (k) { f[k] = p[k]; }); else f.Borrado = true; f.Validado = true; f.Validado_por = u.email; f.Validado_en = t; f.Previo_JSON = ""; f.Actualizado_en = t; n++; out.push(f); }); persistir(); return { ok: true, n: n, filas: out }; },
    webSolicitarAlta: function (d) { d = d || {}; if (d.web) return { ok: true, mensaje: "Solicitud recibida. Un administrador revisará tu alta y te avisará por correo." };
      if (!d.nombre || !d.apellidos || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || "") || !d.cargo || d.acepta !== true) return { ok: false, mensaje: "Revisa los campos obligatorios: nombre, apellidos, correo, cargo y aceptación." };
      var em = String(d.email).toLowerCase(), t = ahoraISO(); if (!DB.tablas.Usuarios.some(function (x) { return String(x.Email).toLowerCase() === em && x.Activo !== false; })) {
        var ex = DB.tablas.Solicitudes_Acceso.filter(function (x) { return x.Email === em && x.Estado === "Pendiente"; })[0], o = ex || { ID: "ACC-" + String(DB.tablas.Solicitudes_Acceso.length + 1).padStart(4, "0"), Estado: "Pendiente" };
        Object.assign(o, { Fecha: t, Nombre: d.nombre, Apellidos: d.apellidos, Email: em, Cargo: d.cargo, Institucion: d.institucion || "", Rol_solicitado: d.rol_solicitado === "INVESTIGADOR" ? "INVESTIGADOR" : "COLABORADOR", Comentario: d.comentario || "" }); meta(o, "anónimo", t); if (!ex) DB.tablas.Solicitudes_Acceso.push(o); persistir(); }
      return { ok: true, mensaje: "Solicitud recibida. Un administrador revisará tu alta y te avisará por correo." }; },
    webResolverAcceso: function (tok, id, o) { var u = sesion(tok); req(u, ["ADMIN"]); var a = DB.tablas.Solicitudes_Acceso.filter(function (x) { return x.ID === id; })[0]; if (!a) throw new Error("Solicitud no encontrada."); if (a.Estado !== "Pendiente") throw new Error("La solicitud ya está resuelta.");
      var t = ahoraISO(), usr = null; o = o || {}; if (o.accion === "aprobar") { var rol = normRol(o.rol || a.Rol_solicitado); usr = DB.tablas.Usuarios.filter(function (x) { return String(x.Email).toLowerCase() === a.Email; })[0]; if (!usr) { usr = { ID: "USR-" + Date.now().toString(36), Email: a.Email }; DB.tablas.Usuarios.push(usr); } Object.assign(usr, { Nombre: o.nombre || (a.Nombre + " " + a.Apellidos), Rol: rol, Activo: true, Borrado: false }); meta(usr, u.email, t); a.Estado = "Aprobada"; a.Rol_asignado = rol; }
      else if (o.accion === "rechazar") a.Estado = "Rechazada"; else throw new Error("Acción no válida.");
      a.Resuelto_por = u.email; a.Resuelto_en = t; a.Nota = o.nota || ""; meta(a, u.email, t); persistir(); return { ok: true, solicitud: a, usuario: usr || undefined }; },
    webEnviarReposicion: function (tok, exp) { var u = sesion(tok); req(u, ["ADMIN"]); var mats = DB.tablas.Material.filter(function (m) { return m.Borrado !== true; }).map(function (m) { var s = (C.num(m.Stock_inicial) || 0); DB.tablas.Movimientos.forEach(function (x) { if (x.Material === m.ID && x.Borrado !== true) s += C.num(x.Cantidad) || 0; }); return Object.assign({}, m, { Stock_actual: s }); });
      var cfg = (DB.tablas.Config.filter(function (c) { return c.ID === "reposicion"; })[0] || {}).Valor_JSON, dest = []; try { dest = (JSON.parse(cfg || "{}").destinatarios) || []; } catch (e) { } if (!dest.length) dest = DB.tablas.Usuarios.filter(function (x) { return normRol(x.Rol) === "ADMIN" && x.Activo !== false; }).map(function (x) { return x.Email; });
      return { ok: true, n: C.reposicion(mats).length, destinatarios: dest, nota: "Modo demostración: no se envía ningún correo." }; },
    webProgramarAvisos: function (tok, exp, avisos, tipos) { var u = sesion(tok); req(u, ["ADMIN", "INVESTIGADOR"]); var t = ahoraISO(); DB.tablas.Avisos.forEach(function (a) { if (a.Experimento === exp && a.Estado === "Pendiente" && tipos.indexOf(a.Tipo) !== -1) { a.Estado = "Cancelado"; meta(a, u.email, t); } }); var l = DB.tablas.Avisos; avisos.forEach(function (a) { var o = meta(Object.assign({}, a, { Estado: "Pendiente" }), u.email, t), i = -1; l.forEach(function (x, j) { if (x.ID === a.ID) i = j; }); if (i === -1) l.push(o); else l[i] = Object.assign({}, l[i], o); }); persistir(); return { ok: true, n: avisos.length }; },
    webCancelarAvisos: function (tok, exp, tipos) { var u = sesion(tok), n = 0, t = ahoraISO(); DB.tablas.Avisos.forEach(function (a) { if (a.Experimento === exp && a.Estado === "Pendiente" && (!tipos.length || tipos.indexOf(a.Tipo) !== -1)) { a.Estado = "Cancelado"; meta(a, u.email, t); n++; } }); persistir(); return { ok: true, n: n }; },
    webNotificar: function (tok) { sesion(tok); return { ok: true, enviados: 0 }; },
    webPushClave: function () { throw new Error("Las notificaciones push no funcionan en modo demostración."); },
    webPushProbar: function () { throw new Error("Las notificaciones push no funcionan en modo demostración."); },
    webPushSuscribir: function () { throw new Error("No disponible en modo demostración."); }, webPushBaja: function () { return { ok: true }; }, webPushEstado: function () { return { preparado: false, esta: false, dispositivos: 0 }; }
  };
  window.HOMEDemo = {
    iniciar: function () { if (!listo) listo = idb("get").then(function (d) { DB = d && d.version === VERSION_DEMO ? d : sembrar(); if (!d || d.version !== VERSION_DEMO) idb("put", DB); }); return listo; },
    llamar: function (fn, args) { return window.HOMEDemo.iniciar().then(function () { return new Promise(function (ok, ko) { setTimeout(function () { try { if (!API[fn]) throw new Error("Función no disponible en demostración: " + fn); var r = API[fn].apply(null, args || []); ok(JSON.parse(JSON.stringify(r))); } catch (e) { var er = new Error(e.message); er.servidor = true; ko(er); } }, 60); }); }); },
    reiniciar: function () { DB = sembrar(); return idb("put", DB); }
  };
})();
