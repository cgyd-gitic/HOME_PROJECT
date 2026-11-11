/* HOME · motor de cálculo (funciones puras, sin DOM). Lo usan la web, el modo demo y las pruebas de Node.
   Unidades internas: presiones de gases en mmHg, flujos en mL/min, Hb en g/dL, glucosa en mg/dL, iones en mmol/L.
   Todas las cifras por defecto son editables en Configuración; las que proceden de la revisión bibliográfica
   llevan su fuente en DEF.fuentes. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HOMECalc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var KPA = 7.50062;                       // 1 kPa = 7,50062 mmHg
  var PM_CORTISOL = 362.46;                // g/mol

  function num(v) { if (v === null || v === undefined || v === "") return null; var n = typeof v === "number" ? v : Number(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function redondear(x, paso) { return Math.round(x / paso) * paso; }
  function r(x, d) { if (x === null || x === undefined || !isFinite(x)) return null; var f = Math.pow(10, d === undefined ? 1 : d); return Math.round(x * f) / f; }
  function fx(x, d) { var v = r(x, d); return v === null ? "—" : String(v).replace(".", ","); }
  function media(a) { a = a.filter(function (x) { return x !== null && isFinite(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function de(a) { a = a.filter(function (x) { return x !== null && isFinite(x); }); if (a.length < 2) return null; var m = media(a); return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1)); }

  // ------------------------------------------------------------------------------------------------
  // Catálogo de variables por tipo de muestra (id interno · nombre visible · unidad · decimales · clave de objetivo)
  // ------------------------------------------------------------------------------------------------
  function V(id, nombre, unidad, dec, obj, extra) { var o = { id: id, nombre: nombre, unidad: unidad || "", dec: dec === undefined ? 1 : dec, obj: obj || null }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  var GAS = [V("pH", "pH", "", 3, "pH"), V("pO2", "pO₂", "mmHg", 0, "pO2"), V("pCO2", "pCO₂", "mmHg", 1, "pCO2"), V("sO2", "sO₂", "%", 1),
    V("HCO3", "HCO₃⁻", "mmol/L", 1, "HCO3"), V("BE", "BE", "mmol/L", 1, "BE"), V("Hb", "Hb", "g/dL", 1, "Hb"), V("Lactato", "Lactato", "mmol/L", 2, "Lactato"),
    V("Glucosa", "Glucosa", "mg/dL", 0, "Glucosa"), V("Na", "Na⁺", "mmol/L", 0, "Na"), V("K", "K⁺", "mmol/L", 1, "K"), V("Ca", "Ca²⁺ iónico", "mmol/L", 2, "Ca"), V("Cl", "Cl⁻", "mmol/L", 0, "Cl")];
  var BQ = [
    V("ALT", "ALT", "U/L", 0, null, { grupo: "Daño hepatocelular" }), V("AST", "AST", "U/L", 0, null, { grupo: "Daño hepatocelular" }), V("LDH", "LDH", "U/L", 0, null, { grupo: "Daño hepatocelular" }),
    V("GGT", "GGT", "U/L", 0, null, { grupo: "Daño biliar" }), V("BilT", "Bilirrubina total", "mg/dL", 2, null, { grupo: "Daño biliar" }), V("FA", "Fosfatasa alcalina", "U/L", 0, null, { grupo: "Daño biliar" }),
    V("Glucosa", "Glucosa", "mg/dL", 0, "Glucosa", { grupo: "Metabolismo" }), V("Lactato", "Lactato", "mmol/L", 2, "Lactato", { grupo: "Metabolismo" }), V("Colesterol", "Colesterol total", "mg/dL", 0, null, { grupo: "Metabolismo" }),
    V("HDL", "HDL", "mg/dL", 0, null, { grupo: "Metabolismo" }), V("LDL", "LDL", "mg/dL", 0, null, { grupo: "Metabolismo" }),
    V("TG", "Triglicéridos", "mg/dL", 0, null, { grupo: "Metabolismo" }), V("ProtT", "Proteínas totales", "g/dL", 1, null, { grupo: "Metabolismo" }),
    V("Albumina", "Albúmina", "g/dL", 2, "Albumina", { grupo: "Función hepática" }), V("ActPT", "Actividad de protrombina", "%", 0, null, { grupo: "Función hepática" }), V("TP", "Tiempo de protrombina", "s", 1, null, { grupo: "Función hepática" }),
    V("Fibrinogeno", "Fibrinógeno", "mg/dL", 0, null, { grupo: "Función hepática" }), V("Insulina", "Insulina", "µU/mL", 1, null, { grupo: "Hormonas" }), V("Cortisol", "Cortisol", "nmol/L", 0, "Cortisol", { grupo: "Hormonas" }),
    V("Creatinina", "Creatinina", "mg/dL", 2, null, { grupo: "Renal / medio interno" }), V("HCO3", "HCO₃⁻", "mmol/L", 1, "HCO3", { grupo: "Renal / medio interno" }), V("BE", "BE", "mmol/L", 1, "BE", { grupo: "Renal / medio interno" }),
    V("Ca", "Ca²⁺ iónico", "mmol/L", 2, "Ca", { grupo: "Renal / medio interno" }), V("Na", "Na⁺", "mmol/L", 0, "Na", { grupo: "Renal / medio interno" }), V("K", "K⁺", "mmol/L", 1, "K", { grupo: "Renal / medio interno" }),
    V("Cl", "Cl⁻", "mmol/L", 0, null, { grupo: "Renal / medio interno" }), V("P", "Fosfato", "mg/dL", 1, "P", { grupo: "Renal / medio interno" }), V("Mg", "Magnesio", "mg/dL", 2, "Mg", { grupo: "Renal / medio interno" }),
    V("Urea", "Urea", "mg/dL", 0, null, { grupo: "Renal / medio interno" }), V("Amonio", "Amonio", "µmol/L", 0, "Amonio", { grupo: "Renal / medio interno" }), V("Osm", "Osmolalidad", "mOsm/kg", 0, "Osm", { grupo: "Renal / medio interno" }),
    V("Hb", "Hemoglobina", "g/dL", 1, "Hb", { grupo: "Hemograma" }), V("Hto", "Hematocrito", "%", 1, "Hto", { grupo: "Hemograma" })];
  var BILIS = [V("pH", "pH", "", 2), V("BilT", "Bilirrubina total", "mg/dL", 2), V("LDH", "LDH", "U/L", 0), V("Glucosa", "Glucosa", "mg/dL", 0), V("Lactato", "Lactato", "mmol/L", 2),
    V("Hb", "Hemoglobina", "g/dL", 1), V("Hto", "Hematocrito", "%", 1), V("Colesterol", "Colesterol", "mg/dL", 0), V("HCO3", "HCO₃⁻", "mmol/L", 1), V("BE", "BE", "mmol/L", 1),
    V("Ca", "Ca²⁺", "mmol/L", 2), V("Na", "Na⁺", "mmol/L", 0), V("K", "K⁺", "mmol/L", 1), V("Cl", "Cl⁻", "mmol/L", 0),
    V("Peso_g", "Peso", "g", 2), V("Volumen_mL", "Volumen", "mL", 1), V("Densidad", "Densidad (calculada)", "g/mL", 3, null, { calculada: true }), V("Produccion_mLh", "Producción (calculada)", "mL/h", 2, null, { calculada: true })];
  var FLUJO = [V("P_VP", "Presión VP", "mmHg", 1, "P_VP"), V("Q_VP", "Flujo VP", "mL/min", 0), V("P_AH", "Presión media AH", "mmHg", 0, "P_AH"), V("P_AH_sis", "Presión sistólica AH", "mmHg", 0),
    V("P_AH_dia", "Presión diastólica AH", "mmHg", 0), V("Q_AH", "Flujo AH", "mL/min", 0), V("Temp", "Temperatura", "°C", 1, "Temp"),
    V("FiO2_ART", "FiO₂ mezclador arterial", "%", 0), V("Barrido_ART", "Flujo de aire arterial", "mL/min", 0), V("FiO2_POR", "FiO₂ mezclador portal", "%", 0), V("Barrido_POR", "Flujo de aire portal", "mL/min", 0),
    V("Glucosa_CGM", "Glucosa (monitor continuo)", "mg/dL", 0)];
  var HDF = [V("Q_sangre", "Flujo de sangre", "mL/min", 0), V("Q_dialisis", "Flujo de diálisis", "mL/h", 0), V("Extraccion", "Extracción", "mL/h", 0), V("Reposicion", "Volumen de reemplazo", "mL/h", 0),
    V("P_acceso", "P. acceso", "mmHg", 0), V("P_retorno", "P. retorno", "mmHg", 0), V("TMP", "PTM", "mmHg", 0), V("Caida_P", "Caída de presión", "mmHg", 0),
    V("P_efluente", "P. efluente", "mmHg", 0), V("P_prefiltro", "P. prefiltro", "mmHg", 0), V("Temp", "Temperatura", "°C", 1)];
  var INMUNO = [V("C3", "C3", "mg/dL", 0), V("C4", "C4", "mg/dL", 1), V("C5", "C5", "mg/dL", 1), V("IgA", "IgA", "mg/dL", 0), V("IgG", "IgG", "mg/dL", 0), V("IgM", "IgM", "mg/dL", 0),
    V("PCR", "PCR", "mg/L", 1), V("Testosterona", "Testosterona", "ng/mL", 2), V("Estradiol", "Estradiol", "pg/mL", 1), V("Progesterona", "Progesterona", "ng/mL", 2),
    V("Prostaglandina", "Prostaglandina", "pg/mL", 1), V("Cefalina", "Tiempo de cefalina (TTPa)", "s", 1)];
  var RECAL = FLUJO.filter(function (v) { return /^(Temp|P_VP|P_AH|FiO2_ART|Barrido_ART|FiO2_POR|Barrido_POR|Q_VP|Q_AH)$/.test(v.id); });
  var PANEL_COMPLETO = BQ.concat(GAS.filter(function (g) { return !BQ.some(function (b) { return b.id === g.id; }); })).concat(INMUNO);

  var MUESTRAS = {
    ART: { nombre: "Gasometría · rama arterial", corto: "Arterial", vars: GAS, tipo: "gas" },
    POR: { nombre: "Gasometría · rama portal", corto: "Portal", vars: GAS, tipo: "gas" },
    CAV: { nombre: "Gasometría · cava (salida)", corto: "Cava", vars: GAS, tipo: "gas" },
    PERF: { nombre: "Perfusato · bioquímica", corto: "Bioquímica", vars: BQ, tipo: "bq" },
    FLUJO: { nombre: "Presiones, flujos y mezcladores", corto: "Flujos", vars: FLUJO, tipo: "flujo" },
    BILIS: { nombre: "Bilis", corto: "Bilis", vars: BILIS, tipo: "bilis" },
    HDF: { nombre: "Hemodiafiltración", corto: "HDF", vars: HDF, tipo: "hdf" },
    INMUNO: { nombre: "Inmunología y hormonas", corto: "Inmuno", vars: INMUNO, tipo: "inmuno" },
    RECAL: { nombre: "Recalentamiento (valores reales)", corto: "Recalent.", vars: RECAL, tipo: "flujo" },
    PRE: { nombre: "Muestra pre-perfusión (perfusato)", corto: "Pre-perfusión", vars: PANEL_COMPLETO, tipo: "bq" },
    BASAL_LD: { nombre: "Basal in vivo · donante de hígado", corto: "Basal LD", vars: PANEL_COMPLETO, tipo: "bq" },
    BASAL_BD: { nombre: "Basal in vivo · donante de sangre", corto: "Basal BD", vars: PANEL_COMPLETO, tipo: "bq" }
  };
  // Variables derivadas (se calculan, no se registran)
  var DERIVADAS = [
    V("VO2", "Consumo de O₂ hepático", "mL/min", 2), V("VO2_100g", "Consumo de O₂ por 100 g", "mL/min/100 g", 3), V("DO2", "Aporte de O₂", "mL/min", 1), V("EO2", "Extracción de O₂", "%", 1),
    V("Q_total", "Flujo total", "mL/min", 0), V("Q_100g", "Flujo total por 100 g", "mL/min/100 g", 1), V("R_AH", "Resistencia AH", "mmHg·min/mL", 3), V("R_VP", "Resistencia VP", "mmHg·min/mL", 4),
    V("Bilis_mLh_100g", "Bilis por 100 g", "mL/h/100 g", 3)];

  function variable(muestra, id) {
    var m = MUESTRAS[muestra]; var l = m ? m.vars : []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    for (var j = 0; j < DERIVADAS.length; j++) if (DERIVADAS[j].id === id) return DERIVADAS[j];
    return V(id, id, "", 2);
  }

  // ------------------------------------------------------------------------------------------------
  // Valores por defecto (editables en Configuración)
  // ------------------------------------------------------------------------------------------------
  var DEF = {
    version: "0.1",
    general: { volumen_sangre_mL: 2200, dias_perfusion: 7, unidad_gases: "mmHg", aviso_antelacion_min: 2, aviso_muestra_min: 10 },
    objetivos: {
      // [mín, máx]. Rama arterial/portal: memoria HOME PI23/00364 (pO2 10–12 kPa AH, 5–7 kPa VP). CHRONO-LIVER cita 40 kPa: ver revisión.
      ART: { pH: [7.35, 7.45], pO2: [75, 90], pCO2: [35, 45] },
      POR: { pH: [7.35, 7.45], pO2: [37.5, 52.5], pCO2: [35, 45] },
      CAV: { pH: [7.30, 7.45], pO2: [30, 50], pCO2: [35, 50], sO2: [55, 75] },                       // sO2 de salida 55–75 %: de Vries 2019 (PMID 30588774)
      // Lactato ≤ 2,5 (viabilidad; < 1,7 óptimo): van Leeuwen 2019, Mergental 2020 · Glucosa ≥ 90 y K 3–5 y Hb ≥ 5,5: Lau 2023 (PMID 37553343)
      // HCO3, BE e iCa: rangos humanos (fuente secundaria, a validar) · Na, Mg, P, osmolalidad: sin referencia verificada → rango de trabajo del laboratorio
      PERF: { HCO3: [23, 28], BE: [-2, 3], Lactato: [0, 2.5], Glucosa: [90, 180], Na: [135, 150], K: [3.0, 5.0], Ca: [1.15, 1.30], Cl: [95, 115],
              Mg: [1.8, 2.6], P: [3, 7], Hb: [5.5, 12], Hto: [17, 36], Albumina: [2.5, 3.5], Osm: [280, 310], Amonio: [0, 100], Cortisol: [100, 300] },
      FLUJO: { P_AH: [55, 65], P_VP: [2, 4], Temp: [36.5, 38.0] }
    },
    gases: {
      FiO2_min: 21, FiO2_max: 100, FiO2_paso: 5, FiO2_cambio_max: 20,
      Barrido_min: 50, Barrido_max: 3000, Barrido_paso: 10, Barrido_cambio_max_pct: 50,
      fraccion_bicarbonato: 0.3,       // fracción de −BE(B)·V por bolo (= práctica actual del grupo; Siggaard-Andersen 1995, Watson 2018)
      bicarbonato_pH_umbral: 7.30, bicarbonato_BE_umbral: -5,   // solo se propone bicarbonato si pH < 7,30 y BE < −5
      bicarbonato_max_mmol: 40
    },
    // P50 porcina 35,7 mmHg a 37 °C y pH 7,40 (Willford & Hill 1986, PMID 3704384); sO2 estimada con Severinghaus 1979 escalada por la P50 porcina
    o2: { k_hb: 1.34, k_disuelto: 0.0031, p50: 35.7, dlogP50_dT: 0.016, bohr: -0.441, metodo: "severinghaus_p50", hill_n: 2.7, ventana_min: 15 },
    farmacos: { melatonina_CL_mL_min: 500, hidrocortisona_stock_mL_75: 0.7, hidrocortisona_stock_vol_mL: 50, taurocolato_ref_mg_h: 7.7 },
    // NRC 2012 (Kil 2013, PMID 25049902): EMm = 197·PV^0,60 · TCI = 17,9 − 0,0375·PV y +7,425 % de EMm por °C bajo la TCI (Rahimifar 2026, PMID 41410523)
    // Ración = múltiplo × EMm (2,5×: elección del revisor, a validar; 3× en ensayos de digestibilidad, Kong & Adeola 2014) · macho entero 1,05: empírico del grupo
    dieta: { modelo: "NRC2012", multiplo: 2.5, tomas: 2, em_pienso_kcal_kg: 3300, nombre_pienso: "(por definir)",
      f_sexo: { M_entero: 1.05, M_castrado: 1.0, H: 1.0 }, f_actividad: 1.0, f_termico_por_grado: 0.07425, tci_C: null, tci_aviso_C: 24, horas_tomas: ["09:30", "18:00"], ayuno_h: 12 },
    perfusato: {
      objetivos_correccion: { K: 4.5, Ca: 1.1, HCO3: 24, Albumina: 3.0 },
      factores_grupo: { K: 0.3, Ca: 0.5, HCO3: 0.3 },
      conc: { KCl_mEq_mL: 2, CaCl2_mmol_mL: 0.4565, NaHCO3_mmol_mL: 1, Albumina_g_mL: 0.2 },
      fraccion_bicarbonato: 0.3, fraccion_potasio: 0.5,
      heparina_U_L: 2500, heparina_U_mL_vial: 5000, heparina_infusion_U_h: 3000, heparina_infusion_conc_U_mL: 1000, heparina_vial_mL: 5
    },
    premedicacion: [
      { f: "Ketamina", dosis_mg_kg: 12, conc_mg_mL: 100 }, { f: "Xilacina", dosis_mg_kg: null, conc_mg_mL: 20 },
      { f: "Midazolam", dosis_mg_kg: 0.5, conc_mg_mL: 5 }, { f: "Lidocaína", dosis_mg: 10, conc_mg_mL: 20 }],
    heparina_donante_mg_kg: 3,
    // Recalentamiento: escalones de 5 min (hoja 2026-HOME-Recalentamiento; FiO2 y presión portal leídos de celdas combinadas → verificar)
    recalentamiento: { verificado: false, paso_min: 5, pasos: [
      { t: 0,  Temp: 24, P_VP: 2, FiO2_POR: 21, Barrido_POR: 160, P_AH: 35, FiO2_ART: 21, Barrido_ART: 50 },
      { t: 5,  Temp: 25, P_VP: 2, FiO2_POR: 21, Barrido_POR: 170, P_AH: 37, FiO2_ART: 21, Barrido_ART: 60 },
      { t: 10, Temp: 26, P_VP: 2, FiO2_POR: 21, Barrido_POR: 180, P_AH: 39, FiO2_ART: 21, Barrido_ART: 60 },
      { t: 15, Temp: 27, P_VP: 2, FiO2_POR: 21, Barrido_POR: 190, P_AH: 41, FiO2_ART: 30, Barrido_ART: 70 },
      { t: 20, Temp: 28, P_VP: 2, FiO2_POR: 21, Barrido_POR: 200, P_AH: 44, FiO2_ART: 30, Barrido_ART: 80 },
      { t: 25, Temp: 29, P_VP: 2, FiO2_POR: 21, Barrido_POR: 210, P_AH: 46, FiO2_ART: 30, Barrido_ART: 80 },
      { t: 30, Temp: 30, P_VP: 2, FiO2_POR: 21, Barrido_POR: 220, P_AH: 48, FiO2_ART: 30, Barrido_ART: 90 },
      { t: 35, Temp: 31, P_VP: 3, FiO2_POR: 21, Barrido_POR: 260, P_AH: 50, FiO2_ART: 30, Barrido_ART: 90 },
      { t: 40, Temp: 32, P_VP: 3, FiO2_POR: 21, Barrido_POR: 280, P_AH: 52, FiO2_ART: 30, Barrido_ART: 90 },
      { t: 45, Temp: 33, P_VP: 3, FiO2_POR: 21, Barrido_POR: 300, P_AH: 54, FiO2_ART: 30, Barrido_ART: 100 },
      { t: 50, Temp: 34, P_VP: 3, FiO2_POR: 21, Barrido_POR: 320, P_AH: 56, FiO2_ART: 40, Barrido_ART: 100 },
      { t: 55, Temp: 35, P_VP: 3, FiO2_POR: 21, Barrido_POR: 360, P_AH: 59, FiO2_ART: 40, Barrido_ART: 110 },
      { t: 60, Temp: 36, P_VP: 4, FiO2_POR: 21, Barrido_POR: 390, P_AH: 61, FiO2_ART: 40, Barrido_ART: 110 },
      { t: 65, Temp: 37, P_VP: 4, FiO2_POR: 21, Barrido_POR: 410, P_AH: 63, FiO2_ART: 40, Barrido_ART: 120 },
      { t: 70, Temp: 38, P_VP: 4, FiO2_POR: 21, Barrido_POR: 440, P_AH: 65, FiO2_ART: 40, Barrido_ART: 130 }] },
    // Horario circadiano: CAMBIOS de ritmo (el ritmo se mantiene hasta el siguiente cambio de la misma línea).
    // Borrador leído de «2026-HOME-Administración Circadiana PRE-ESTABLECIDA» (la página 2 del PDF está mal escaneada): VERIFICAR.
    circadiano: { verificado: false, lineas: ["Hidrocortisona", "Ácidos biliares", "NP (glucosa + AA)", "NP (lípidos)", "Insulina", "Profilaxis", "Melatonina", "HDF", "Temperatura"], cambios: [
      { h: "08:00", linea: "Hidrocortisona", valor: 44, unidad: "mL/h", nota: "Bolo matutino (pico 250–300 nmol/L)" },
      { h: "08:00", linea: "Insulina", valor: 0.5, unidad: "mL/h", nota: "" },
      { h: "08:00", linea: "HDF", valor: 20, unidad: "mL/h", nota: "Verificar unidad/parámetro" },
      { h: "08:00", linea: "Temperatura", valor: 37.5, unidad: "°C", nota: "Fase diurna (rango 36,5–38 °C)" },
      { h: "08:30", linea: "Hidrocortisona", valor: 0, unidad: "mL/h", nota: "Fin del bolo" },
      { h: "09:00", linea: "Ácidos biliares", valor: 2, unidad: "mL/h", nota: "" },
      { h: "09:30", linea: "Hidrocortisona", valor: 4, unidad: "mL/h", nota: "Basal" },
      { h: "09:30", linea: "NP (glucosa + AA)", valor: 15, unidad: "mL/h", nota: "Ciclo nutricional 1" },
      { h: "10:00", linea: "Profilaxis", valor: 2, unidad: "mL/h", nota: "" },
      { h: "10:30", linea: "Hidrocortisona", valor: 22, unidad: "mL/h", nota: "Bolo posprandial (150–200 nmol/L)" },
      { h: "10:30", linea: "Insulina", valor: 0.5, unidad: "mL/h", nota: "" },
      { h: "11:00", linea: "Hidrocortisona", valor: 0, unidad: "mL/h", nota: "Fin del bolo" },
      { h: "11:30", linea: "Ácidos biliares", valor: 5, unidad: "mL/h", nota: "Ventana posprandial" },
      { h: "12:00", linea: "NP (glucosa + AA)", valor: 30, unidad: "mL/h", nota: "Ciclo nutricional 2" },
      { h: "12:00", linea: "NP (lípidos)", valor: 2, unidad: "mL/h", nota: "" },
      { h: "12:00", linea: "Insulina", valor: 1, unidad: "mL/h", nota: "" },
      { h: "12:00", linea: "HDF", valor: 40, unidad: "mL/h", nota: "Verificar" },
      { h: "13:00", linea: "Hidrocortisona", valor: 4, unidad: "mL/h", nota: "Basal" },
      { h: "13:00", linea: "Profilaxis", valor: 105, unidad: "mL/h", nota: "Verificar (¿metronidazol 105 mL/h + 2 mL/h?)" },
      { h: "14:30", linea: "Ácidos biliares", valor: 2, unidad: "mL/h", nota: "Basal" },
      { h: "14:30", linea: "NP (glucosa + AA)", valor: 15, unidad: "mL/h", nota: "" },
      { h: "14:30", linea: "Profilaxis", valor: 2, unidad: "mL/h", nota: "" },
      { h: "16:30", linea: "Hidrocortisona", valor: 11, unidad: "mL/h", nota: "Bolo posprandial vespertino" },
      { h: "16:30", linea: "Insulina", valor: 0.5, unidad: "mL/h", nota: "" },
      { h: "17:00", linea: "Hidrocortisona", valor: 4, unidad: "mL/h", nota: "Basal" },
      { h: "17:30", linea: "Ácidos biliares", valor: 5, unidad: "mL/h", nota: "Ventana posprandial" },
      { h: "18:00", linea: "NP (glucosa + AA)", valor: 30, unidad: "mL/h", nota: "Ciclo nutricional 3" },
      { h: "18:00", linea: "NP (lípidos)", valor: 2, unidad: "mL/h", nota: "" },
      { h: "18:00", linea: "Insulina", valor: 1, unidad: "mL/h", nota: "" },
      { h: "19:00", linea: "Profilaxis", valor: 105, unidad: "mL/h", nota: "Verificar" },
      { h: "19:30", linea: "Ácidos biliares", valor: 2, unidad: "mL/h", nota: "Basal" },
      { h: "19:30", linea: "NP (glucosa + AA)", valor: 15, unidad: "mL/h", nota: "" },
      { h: "20:00", linea: "Melatonina", valor: 5, unidad: "mL/h", nota: "Infusión 20:00–23:00 (100–200 pg/mL)" },
      { h: "20:00", linea: "HDF", valor: 20, unidad: "mL/h", nota: "Verificar" },
      { h: "21:00", linea: "NP (glucosa + AA)", valor: 0, unidad: "mL/h", nota: "Ayuno nocturno" },
      { h: "21:00", linea: "NP (lípidos)", valor: 0, unidad: "mL/h", nota: "" },
      { h: "21:00", linea: "Insulina", valor: 0, unidad: "mL/h", nota: "" },
      { h: "22:00", linea: "Temperatura", valor: 36.5, unidad: "°C", nota: "Nadir nocturno" },
      { h: "23:00", linea: "Melatonina", valor: 0, unidad: "mL/h", nota: "Fin de la infusión" }] },
    // Muestreo (memoria PI26/00141): día 1 a 30 min y 2-4-6-8-12-16-20-24 h; después a las 10, 14, 16 y 20 h. Biopsia cada 24 h.
    muestreo: { dia1_h: [0, 0.5, 2, 4, 6, 8, 12, 16, 20, 24], diarias: ["10:00", "14:00", "16:00", "20:00"], biopsia_cada_h: 24,
      bilis_dia1_cada_h: 2, flujos_cada_h_dia1: 0.5, flujos_cada_h_despues: 3, hdf_inicio_h: 6, inmuno_cada_h: 24 },
    fuentes: {}
  };

  // ------------------------------------------------------------------------------------------------
  // Utilidades de fechas (sin dependencias). Las horas «HH:MM» se interpretan en la zona del navegador.
  // ------------------------------------------------------------------------------------------------
  function aFecha(v) { if (!v) return null; if (v instanceof Date) return isNaN(v) ? null : v; var d = new Date(v); return isNaN(d) ? null : d; }
  function horasEntre(a, b) { a = aFecha(a); b = aFecha(b); return a && b ? (b - a) / 36e5 : null; }
  function minutosEntre(a, b) { var h = horasEntre(a, b); return h === null ? null : h * 60; }
  function hm(s) { var m = String(s || "").match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  function enHora(base, hhmm, diasMas) { var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (diasMas || 0), 0, 0, 0, 0); var m = hm(hhmm); d.setMinutes(m || 0); return d; }
  function duracionTxt(min) { if (min === null || min === undefined || !isFinite(min)) return "—"; var neg = min < 0; min = Math.abs(Math.round(min)); var h = Math.floor(min / 60), m = min % 60; return (neg ? "−" : "") + (h ? h + " h " : "") + (m < 10 && h ? "0" : "") + m + " min"; }
  function cronoTxt(ms) { if (ms === null || ms === undefined || !isFinite(ms)) return "--:--:--"; var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x; }
  function etiquetaPunto(h) { if (h === null || h === undefined || !isFinite(h)) return ""; if (h === 0) return "0"; if (h < 1) return Math.round(h * 60) + "′"; var e = Math.floor(h), m = Math.round((h - e) * 60); return e + "h" + (m ? " " + m + "′" : ""); }

  // ------------------------------------------------------------------------------------------------
  // 1. Dieta pre-quirúrgica
  // ------------------------------------------------------------------------------------------------
  var MODELOS_DIETA = {
    GRUPO:   { nombre: "Fórmula actual del grupo · 115·PV^0,75", k: 115, e: 0.75 },
    NRC1998: { nombre: "NRC 1998 · 106·PV^0,75 (mantenimiento)", k: 106, e: 0.75 },
    NRC2012: { nombre: "NRC 2012 · 197·PV^0,60 (mantenimiento)", k: 197, e: 0.60 }
  };
  function factorSexo(sexo, castrado, cfg) { var f = (cfg && cfg.f_sexo) || DEF.dieta.f_sexo; if (sexo === "H") return f.H; return castrado === "Sí" ? f.M_castrado : f.M_entero; }
  // EM de la ración (kcal/d) = EMm·f_sexo·f_actividad·múltiplo + coste térmico (0,07425·(TCI − T)·EMm). La fórmula histórica del grupo ya es la ración (múltiplo 1).
  function energiaDieta(pesoKg, sexo, castrado, cfg, tempC) {
    cfg = cfg || DEF.dieta; var p = num(pesoKg); if (!p || p <= 0) return null;
    var mod = MODELOS_DIETA[cfg.modelo] || MODELOS_DIETA.NRC2012, esGrupo = cfg.modelo === "GRUPO";
    var base = mod.k * Math.pow(p, mod.e), fs = factorSexo(sexo, castrado, cfg), fa = esGrupo ? (num(cfg.f_actividad_grupo) || 1.1) : (num(cfg.f_actividad) || 1), mult = esGrupo ? 1 : (num(cfg.multiplo) || 1);
    var t = num(tempC), tci = num(cfg.tci_C); if (tci === null) tci = 17.9 - 0.0375 * p;
    var inc = num(cfg.f_termico_por_grado) || 0, term = t !== null && t < tci ? inc * (tci - t) * base : 0;
    var em = base * fs * fa * mult + term, dens = num(cfg.em_pienso_kcal_kg), tomas = num(cfg.tomas) || 2, avisoT = num(cfg.tci_aviso_C);
    return { modelo: mod.nombre, base: base, f_sexo: fs, f_actividad: fa, multiplo: mult, termico_kcal: term, f_termico: base ? 1 + term / (base * fs * fa * mult) : 1, tci: tci, em_kcal: em,
      aviso_frio: t !== null && avisoT !== null && p < 40 && t < avisoT, g_dia: dens ? em / dens * 1000 : null, g_toma: dens ? em / dens * 1000 / tomas : null, tomas: tomas, pct_peso: dens ? em / dens / p * 100 : null };
  }
  function compararModelosDieta(pesoKg, sexo, castrado, cfg) {
    var out = {}; Object.keys(MODELOS_DIETA).forEach(function (k) { var c = {}; for (var x in cfg) c[x] = cfg[x]; c.modelo = k; out[k] = energiaDieta(pesoKg, sexo, castrado, c); }); return out;
  }

  // ------------------------------------------------------------------------------------------------
  // 2. Perfusato: volumen, correcciones iniciales y comprobaciones
  // ------------------------------------------------------------------------------------------------
  function volumenPerfusato(componentes) { return (componentes || []).reduce(function (s, c) { var v = num(c.mL); return s + (v || 0); }, 0); }
  // pre: {K, Ca, HCO3, BE, Albumina, Hto, Na, Hb}; V en mL
  function correccionesPerfusato(pre, Vml, cfg) {
    cfg = cfg || DEF.perfusato; var VL = (num(Vml) || 0) / 1000, o = cfg.objetivos_correccion, fg = cfg.factores_grupo, c = cfg.conc, out = [];
    var hto = num(pre.Hto); var fPlasma = hto !== null ? 1 - (hto > 1 ? hto / 100 : hto) : null;
    function pos(x) { return x === null ? null : Math.max(0, x); }
    function item(clave, nombre, med, obj, mlGrupo, mlAlt, notaAlt, unidadMed) {
      return { clave: clave, producto: nombre, medido: med, objetivo: obj, unidad: unidadMed, deficit: med === null ? null : obj - med,
        mL_grupo: pos(mlGrupo), mL_alternativa: pos(mlAlt), nota_alternativa: notaAlt };
    }
    var K = num(pre.K); out.push(item("KCl", "Cloruro potásico 2 mEq/mL", K, o.K,
      K === null ? null : (o.K - K) * VL * fg.K / c.KCl_mEq_mL,
      K === null || fPlasma === null ? null : (o.K - K) * VL * fPlasma * (num(cfg.fraccion_potasio) || 0.5) / c.KCl_mEq_mL, "ΔK·V·(1−Hto)·" + String(num(cfg.fraccion_potasio) || 0.5).replace(".", ",") + ": volumen plasmático y la mitad, porque el K pasa a hematíes e hígado. Re-medir a los 10–15 min", "mmol/L"));
    var Ca = num(pre.Ca); out.push(item("CaCl2", "Cloruro cálcico 0,4565 mmol/mL", Ca, o.Ca,
      Ca === null ? null : (o.Ca - Ca) * VL * fg.Ca / c.CaCl2_mmol_mL,
      Ca === null || fPlasma === null ? null : (o.Ca - Ca) * VL * fPlasma / c.CaCl2_mmol_mL, "ΔCa²⁺·V·(1−Hto). El citrato del CPDA-1 quela el calcio: la necesidad real es mayor y variable. Corregir el calcio antes que el bicarbonato y re-medir a los 10–15 min", "mmol/L"));
    var H = num(pre.HCO3), BE = num(pre.BE), fb = num(cfg.fraccion_bicarbonato) || DEF.gases.fraccion_bicarbonato;
    out.push(item("NaHCO3", "Bicarbonato sódico 8,4 % (1 mmol/mL)", H, o.HCO3,
      H === null ? null : (o.HCO3 - H) * VL * fg.HCO3 / c.NaHCO3_mmol_mL,
      BE === null ? null : (-BE) * VL * fb / c.NaHCO3_mmol_mL, "Por BE(B): dosis teórica = −BE(B)·V(L); se propone el " + Math.round(fb * 100) + " % (como la práctica del grupo) porque el hígado metaboliza citrato y lactato a bicarbonato. Indicado si pH < 7,30 y BE < −5", "mmol/L"));
    var A = num(pre.Albumina); out.push(item("Albumina", "Albúmina 20 % (0,2 g/mL)", A, o.Albumina,
      A === null ? null : (o.Albumina - A) * 10 * VL / c.Albumina_g_mL,
      A === null || fPlasma === null ? null : (o.Albumina - A) * 10 * VL * fPlasma / c.Albumina_g_mL, "La albúmina se mide en plasma: usar V·(1−Hto)", "g/dL"));
    // Na proyectado tras añadir bicarbonato (8,4 % = 1 mmol Na/mL) y el volumen añadido
    var Na = num(pre.Na), mlBic = out[2].mL_alternativa !== null ? out[2].mL_alternativa : out[2].mL_grupo, Vpl = fPlasma !== null ? VL * fPlasma : VL;
    var naProy = Na !== null && mlBic !== null && Vpl > 0 ? (Na * Vpl + mlBic * 1) / (Vpl + mlBic / 1000) : null;
    return { V_L: VL, f_plasma: fPlasma, items: out, Na_proyectado: naProy };
  }
  function heparina(Vml, dias, cfg) {
    cfg = cfg || DEF.perfusato; var VL = (num(Vml) || 0) / 1000, d = num(dias) || 7;
    var cebado_U = VL * cfg.heparina_U_L, totalU = cfg.heparina_infusion_U_h * 24 * d, mlHep = totalU / cfg.heparina_U_mL_vial;
    var conc = cfg.heparina_infusion_conc_U_mL, viales = Math.ceil(mlHep / cfg.heparina_vial_mL - 1e-9);
    var mlHepV = viales * cfg.heparina_vial_mL, mlTotal = mlHepV * cfg.heparina_U_mL_vial / conc, ritmo = cfg.heparina_infusion_U_h / conc;   // viales enteros, concentración final fija
    return { cebado_U: cebado_U, cebado_mL: cebado_U / cfg.heparina_U_mL_vial, ritmo_mL_h: ritmo, U_necesarias: totalU,
      viales: viales, mL_heparina: mlHepV, mL_suero: mlTotal - mlHepV, mL_total: mlTotal, horas_cubiertas: mlTotal / ritmo };
  }
  // Bolo de hidrocortisona: dosis y concentración esperada en el plasma del circuito (sin aclaramiento)
  function cortisolBolo(ritmo_mL_h, min, conc_ug_mL, Vml, hto) {
    var h = num(hto) || 0; h = h > 1 ? h / 100 : h;
    var ug = ritmo_mL_h * (min / 60) * conc_ug_mL, Vpl = (num(Vml) || 0) / 1000 * (1 - h);
    var ugL = Vpl ? ug / Vpl : null; return { ug: ug, ug_L: ugL, nmol_L: ugL === null ? null : ugL / PM_CORTISOL * 1000 };
  }

  // ------------------------------------------------------------------------------------------------
  // 3. Asesor de gasometría por rama
  // ------------------------------------------------------------------------------------------------
  function enRango(v, rango) { v = num(v); if (v === null || !rango) return null; if (rango[0] !== null && v < rango[0]) return -1; if (rango[1] !== null && v > rango[1]) return 1; return 0; }
  function centro(rango) { return (rango[0] + rango[1]) / 2; }
  // g = {pH,pO2,pCO2,HCO3,BE,Lactato}; ajustes = {FiO2, Barrido}; contexto = {V_mL}
  function asesorGas(rama, g, ajustes, objetivos, gcfg, contexto) {
    objetivos = objetivos || DEF.objetivos; gcfg = gcfg || DEF.gases; contexto = contexto || {}; ajustes = ajustes || {};
    var O = objetivos[rama] || {}, P = objetivos.PERF || {}, recs = [], fio2 = num(ajustes.FiO2), bar = num(ajustes.Barrido);
    var pO2 = num(g.pO2), pCO2 = num(g.pCO2), pH = num(g.pH), BE = num(g.BE), HCO3 = num(g.HCO3), lac = num(g.Lactato);
    var nombreRama = rama === "ART" ? "rama arterial" : rama === "POR" ? "rama portal" : "cava", mezclador = rama === "ART" ? "arterial" : "portal";
    function add(nivel, param, texto, accion) { recs.push({ nivel: nivel, parametro: param, texto: texto, accion: accion || null }); }
    if (rama === "CAV") {
      if (pO2 !== null && pO2 < 20) add("alerta", "pO2", "pO₂ de salida muy baja (" + fx(pO2, 0) + " mmHg): extracción de O₂ elevada o aporte insuficiente. Revisa flujos, Hb y pO₂ de entrada.");
      else if (pO2 !== null) add("ok", "", "pO₂ de salida " + fx(pO2, 0) + " mmHg.");
      return { rama: rama, estado: recs.some(function (x) { return x.nivel === "alerta"; }) ? "alerta" : "ok", recomendaciones: recs };
    }
    // --- oxigenación: pO2 ∝ FiO2 del gas de barrido ---
    var eO2 = enRango(pO2, O.pO2);
    if (eO2 !== null && eO2 !== 0) {
      var obj = centro(O.pO2);
      if (fio2 !== null) {
        var bruto = fio2 * obj / pO2, lim = clamp(bruto, fio2 - gcfg.FiO2_cambio_max, fio2 + gcfg.FiO2_cambio_max);
        var nuevo = clamp(redondear(lim, gcfg.FiO2_paso), gcfg.FiO2_min, gcfg.FiO2_max);
        if (eO2 < 0 && fio2 >= gcfg.FiO2_max) add("alerta", "pO2", "pO₂ baja (" + fx(pO2, 0) + " mmHg) con FiO₂ al máximo en la " + nombreRama + ": sospecha fallo de membrana, cortocircuito o flujo de gas insuficiente. Comprueba el oxigenador, la línea de gas y la Hb.");
        else if (eO2 > 0 && fio2 <= gcfg.FiO2_min) {
          if (rama === "POR") add("ajuste", "pO2", "pO₂ portal alta (" + fx(pO2, 0) + " mmHg) con FiO₂ ya al 21 %. Opciones: reducir el flujo de aire si la pCO₂ lo permite, o añadir N₂ al gas de barrido para bajar la FiO₂ por debajo del 21 %.");
          else add("ajuste", "pO2", "pO₂ alta (" + fx(pO2, 0) + " mmHg) con FiO₂ al 21 %: reduce el flujo de aire vigilando la pCO₂.");
        } else if (nuevo !== fio2) add("ajuste", "pO2", "pO₂ " + (eO2 < 0 ? "baja" : "alta") + " (" + fx(pO2, 0) + " mmHg; objetivo " + O.pO2[0] + "–" + O.pO2[1] + "). Cambia la FiO₂ del mezclador " + mezclador + " de " + fio2 + " % a " + nuevo + " %.", { campo: "FiO2_" + rama, de: fio2, a: nuevo });
        else add("info", "pO2", "pO₂ ligeramente fuera de rango; el cambio calculado es menor que el paso mínimo del mezclador (" + gcfg.FiO2_paso + " %). Repite la gasometría.");
      } else add("ajuste", "pO2", "pO₂ " + (eO2 < 0 ? "baja" : "alta") + " (" + fx(pO2, 0) + " mmHg). Introduce la FiO₂ actual del mezclador para calcular el cambio.");
    }
    // --- ventilación: pCO2 ∝ 1 / flujo de barrido ---
    var eCO2 = enRango(pCO2, O.pCO2);
    if (eCO2 !== null && eCO2 !== 0) {
      var objC = centro(O.pCO2);
      if (bar !== null && bar > 0) {
        var b = bar * pCO2 / objC, maxd = bar * gcfg.Barrido_cambio_max_pct / 100, b2 = clamp(b, bar - maxd, bar + maxd);
        var nb = clamp(redondear(b2, gcfg.Barrido_paso), gcfg.Barrido_min, gcfg.Barrido_max);
        if (eCO2 < 0 && bar <= gcfg.Barrido_min) add("ajuste", "pCO2", "Hipocapnia (" + fx(pCO2, 1) + " mmHg) con flujo de aire mínimo: añade CO₂ al gas de barrido (carbógeno 5 %) o reduce la superficie de intercambio.");
        else if (nb !== bar) add("ajuste", "pCO2", (eCO2 > 0 ? "Hipercapnia" : "Hipocapnia") + " (" + fx(pCO2, 1) + " mmHg; objetivo " + O.pCO2[0] + "–" + O.pCO2[1] + "). Cambia el flujo de aire " + mezclador + " de " + bar + " a " + nb + " mL/min." + (rama === "POR" && eCO2 > 0 ? " Al subir el barrido también subirá la pO₂ portal: revisa la FiO₂." : "") + " Las dos ramas comparten reservorio: cambia un mezclador cada vez y repite la gasometría a los 10–15 min.", { campo: "Barrido_" + rama, de: bar, a: nb });
        else add("info", "pCO2", "pCO₂ ligeramente fuera de rango; el cambio calculado es menor que el paso mínimo. Repite la gasometría.");
      } else add("ajuste", "pCO2", (eCO2 > 0 ? "Hipercapnia" : "Hipocapnia") + " (" + fx(pCO2, 1) + " mmHg). Introduce el flujo de aire actual para calcular el cambio.");
    }
    // --- equilibrio ácido-base (componente metabólico, común a todo el perfusato) ---
    var epH = enRango(pH, O.pH);
    if (epH !== null && epH !== 0) {
      var beR = P.BE || [-3, 3], hcR = P.HCO3 || [22, 28];
      var resp = eCO2 !== null && eCO2 !== 0 && ((epH < 0 && eCO2 > 0) || (epH > 0 && eCO2 < 0));
      var meta = BE !== null ? ((epH < 0 && BE < beR[0]) || (epH > 0 && BE > beR[1])) : (HCO3 !== null ? ((epH < 0 && HCO3 < hcR[0]) || (epH > 0 && HCO3 > hcR[1])) : false);
      var tipo = (epH < 0 ? "Acidemia" : "Alcalemia") + (resp && meta ? " mixta" : resp ? " respiratoria" : meta ? " metabólica" : "");
      if (meta && epH < 0) {
        var uPH = num(gcfg.bicarbonato_pH_umbral), uBE = num(gcfg.bicarbonato_BE_umbral), indicado = !(uPH !== null && pH >= uPH) && !(uBE !== null && BE !== null && BE >= uBE);
        var Vm = num(contexto.V_mL), dosis = indicado && BE !== null && Vm ? Math.min(-BE * Vm / 1000 * gcfg.fraccion_bicarbonato, gcfg.bicarbonato_max_mmol) : null;
        var txt = tipo + " (pH " + fx(pH, 2) + (BE !== null ? ", BE " + fx(BE, 1) : "") + ").";
        if (lac !== null && lac > (P.Lactato || [0, 2.5])[1]) txt += " El lactato está alto (" + fx(lac, 1) + " mmol/L): si sube respecto a la muestra anterior, la acidosis refleja metabolismo hepático insuficiente y el bicarbonato solo es sintomático.";
        if (dosis !== null && dosis > 0) txt += " Bicarbonato 8,4 %: " + fx(dosis, 0) + " mL (" + Math.round(gcfg.fraccion_bicarbonato * 100) + " % de −BE·V) y repetir gasometría en 15–20 min.";
        else if (!indicado) txt += " Todavía no se propone bicarbonato (umbral pH < " + String(uPH).replace(".", ",") + " y BE < " + uBE + "): el hígado genera bicarbonato al metabolizar lactato y citrato. Repite en 15 min.";
        else if (!Vm) txt += " Indica el volumen de perfusato para calcular la dosis de bicarbonato.";
        add("ajuste", "pH", txt, dosis ? { campo: "NaHCO3_mL", a: r(dosis, 0) } : null);
      } else if (meta && epH > 0) add("ajuste", "pH", tipo + " (pH " + fx(pH, 2) + (BE !== null ? ", BE +" + fx(BE, 1) : "") + "). Suspende aportes de bicarbonato, revisa el bicarbonato del líquido de reposición/diálisis de la HDF y el aporte de citrato/lactato.");
      else if (resp) add("info", "pH", tipo + ": se corrige con el ajuste del flujo de aire indicado arriba.");
      else add("info", "pH", tipo + " (pH " + fx(pH, 2) + ") sin causa clara con los datos introducidos: añade HCO₃⁻/BE.");
    }
    var estado = recs.some(function (x) { return x.nivel === "alerta"; }) ? "alerta" : recs.some(function (x) { return x.nivel === "ajuste"; }) ? "ajuste" : "ok";
    if (!recs.length && (pO2 !== null || pCO2 !== null || pH !== null)) add("ok", "", "Gasometría de la " + nombreRama + " dentro de los objetivos.");
    return { rama: rama, estado: estado, recomendaciones: recs };
  }

  // ------------------------------------------------------------------------------------------------
  // 4. Oxígeno, hemodinámica y bilis
  // ------------------------------------------------------------------------------------------------
  function sO2Hill(pO2, o2) { o2 = o2 || DEF.o2; var p = num(pO2); if (p === null || p <= 0) return null; var n = o2.hill_n || 2.7, p50 = o2.p50; return Math.pow(p, n) / (Math.pow(p, n) + Math.pow(p50, n)) * 100; }
  // P50 corregida por temperatura y pH; pO2 «virtual» = pO2·26,86/P50 y ecuación de Severinghaus (1979)
  function p50Corregida(o2, temp, pH) { o2 = o2 || DEF.o2; var t = num(temp), h = num(pH), lg = 0; if (t !== null) lg += (o2.dlogP50_dT || 0) * (t - 37); if (h !== null) lg += (o2.bohr || 0) * (h - 7.4); return o2.p50 * Math.pow(10, lg); }
  function sO2Estimada(pO2, o2, temp, pH) {
    o2 = o2 || DEF.o2; var p = num(pO2); if (p === null || p <= 0) return null;
    if (o2.metodo === "hill") return sO2Hill(p, o2);
    var v = p * 26.86 / p50Corregida(o2, temp, pH); return 100 / (23400 / (v * v * v + 150 * v) + 1);
  }
  function contenidoO2(Hb, sO2pct, pO2, o2, temp, pH) {
    o2 = o2 || DEF.o2; var hb = num(Hb), p = num(pO2), s = num(sO2pct), estimada = false;
    if (hb === null || p === null) return null; if (s === null) { s = sO2Estimada(p, o2, temp, pH); estimada = true; }
    return { ml_dl: o2.k_hb * hb * s / 100 + o2.k_disuelto * p, sO2: s, sO2_estimada: estimada };
  }
  // gas = {ART:{...}, POR:{...}, CAV:{...}}, flujo = {Q_AH, Q_VP}, pesoG = gramos de hígado
  function consumoO2(gas, flujo, pesoG, o2) {
    o2 = o2 || DEF.o2; var hbDef = num((gas.ART || {}).Hb) || num((gas.POR || {}).Hb) || num((gas.CAV || {}).Hb), T = num((flujo || {}).Temp);
    function c(x) { return x ? contenidoO2(num(x.Hb) || hbDef, x.sO2, x.pO2, o2, T, x.pH) : null; }
    var a = c(gas.ART), p = c(gas.POR), v = c(gas.CAV), qa = num(flujo.Q_AH), qp = num(flujo.Q_VP);
    if (!a || !p || !v || qa === null || qp === null) return null;
    var vo2 = (qa * (a.ml_dl - v.ml_dl) + qp * (p.ml_dl - v.ml_dl)) / 100, do2 = (qa * a.ml_dl + qp * p.ml_dl) / 100;
    var g = num(pesoG);
    return { VO2: vo2, VO2_100g: g ? vo2 / g * 100 : null, DO2: do2, EO2: do2 ? vo2 / do2 * 100 : null, CaO2: a.ml_dl, CpO2: p.ml_dl, CvO2: v.ml_dl,
      sO2_estimada: a.sO2_estimada || p.sO2_estimada || v.sO2_estimada };
  }
  function hemodinamica(f, pesoG) {
    var qa = num(f.Q_AH), qp = num(f.Q_VP), pa = num(f.P_AH), pp = num(f.P_VP), g = num(pesoG), qt = qa !== null && qp !== null ? qa + qp : null;
    return { Q_total: qt, Q_100g: qt !== null && g ? qt / g * 100 : null, R_AH: pa !== null && qa ? pa / qa : null, R_VP: pp !== null && qp ? pp / qp : null };
  }
  function produccionBilis(volMl, desdeISO, hastaISO, pesoG) { var h = horasEntre(desdeISO, hastaISO), v = num(volMl), g = num(pesoG); if (!h || h <= 0 || v === null) return null; var mlh = v / h; return { mL_h: mlh, mL_h_100g: g ? mlh / g * 100 : null }; }

  // ------------------------------------------------------------------------------------------------
  // 5. Tiempos de isquemia y recalentamiento
  // ------------------------------------------------------------------------------------------------
  function tiempos(ev) { // ev: {tipo: ISO}
    return { isquemia_caliente_min: minutosEntre(ev.inicio_exanguinacion, ev.inicio_preservacion_fria), exanguinacion_a_parada_min: minutosEntre(ev.inicio_exanguinacion, ev.parada_cardiaca),
      parada_a_frio_min: minutosEntre(ev.parada_cardiaca, ev.inicio_preservacion_fria), isquemia_fria_min: minutosEntre(ev.inicio_preservacion_fria, ev.inicio_perfusion),
      cirugia_banco_min: minutosEntre(ev.inicio_banco, ev.fin_banco), duracion_perfusion_h: horasEntre(ev.inicio_perfusion, ev.fin_perfusion) };
  }
  function pasoRecalentamiento(inicioISO, ahora, cfg) {
    cfg = cfg || DEF.recalentamiento; var t0 = aFecha(inicioISO); if (!t0) return null; var min = (ahora - t0) / 6e4, pasos = cfg.pasos;
    var i = -1; for (var k = 0; k < pasos.length; k++) if (min >= pasos[k].t) i = k;
    var fin = pasos[pasos.length - 1].t + cfg.paso_min;
    return { minuto: min, indice: i, actual: i >= 0 ? pasos[i] : null, siguiente: i + 1 < pasos.length ? pasos[i + 1] : null,
      ms_al_siguiente: i + 1 < pasos.length ? (t0.getTime() + pasos[i + 1].t * 6e4) - ahora : null, terminado: min >= fin, fin_min: fin };
  }
  var NOMBRES_RECAL = { Temp: "Temperatura", P_VP: "Presión portal", FiO2_POR: "FiO₂ portal", Barrido_POR: "Aire portal", P_AH: "Presión arterial", FiO2_ART: "FiO₂ arterial", Barrido_ART: "Aire arterial" };
  var UNIDAD_RECAL = { Temp: "°C", P_VP: "mmHg", FiO2_POR: "%", Barrido_POR: "mL/min", P_AH: "mmHg", FiO2_ART: "%", Barrido_ART: "mL/min" };
  function cambiosRecal(prev, act) { var out = []; Object.keys(NOMBRES_RECAL).forEach(function (k) { if (!prev || prev[k] !== act[k]) out.push({ k: k, nombre: NOMBRES_RECAL[k], de: prev ? prev[k] : null, a: act[k], unidad: UNIDAD_RECAL[k] }); }); return out; }
  function avisosRecalentamiento(expId, inicioISO, cfg) {
    cfg = cfg || DEF.recalentamiento; var t0 = aFecha(inicioISO); if (!t0) return [];
    var out = cfg.pasos.map(function (p, i) {
      var ch = cambiosRecal(i ? cfg.pasos[i - 1] : null, p);
      return { ID: expId + "|recal|" + p.t, Experimento: expId, Fecha_hora: new Date(t0.getTime() + p.t * 6e4).toISOString(), Tipo: "recalentamiento", Destino: "equipo", Vista: "exp:" + expId + ":quirofano",
        Titulo: "Recalentamiento " + duracionTxt(p.t) + " · " + String(p.Temp).replace(".", ",") + " °C", Texto: ch.map(function (c) { return c.nombre + " → " + String(c.a).replace(".", ",") + " " + c.unidad; }).join(" · ") };
    }).filter(function (a, i) { return i > 0; });
    var fin = cfg.pasos[cfg.pasos.length - 1].t + cfg.paso_min;
    out.push({ ID: expId + "|recal|fin", Experimento: expId, Fecha_hora: new Date(t0.getTime() + fin * 6e4).toISOString(), Tipo: "recalentamiento", Destino: "equipo", Vista: "exp:" + expId + ":quirofano",
      Titulo: "Fin del recalentamiento (" + duracionTxt(fin) + ")", Texto: "Registra «Fin del recalentamiento» y comprueba que la temperatura y las presiones están en objetivo." });
    return out;
  }

  // ------------------------------------------------------------------------------------------------
  // 6. Horario circadiano y muestreo → avisos programados
  // ------------------------------------------------------------------------------------------------
  function avisosCircadianos(expId, inicioISO, dias, circ, antelMin) {
    var t0 = aFecha(inicioISO); if (!t0) return []; circ = circ || DEF.circadiano; dias = num(dias) || 7; antelMin = antelMin === undefined ? 2 : antelMin;
    var porHora = {}; circ.cambios.forEach(function (c) { (porHora[c.h] = porHora[c.h] || []).push(c); });
    var out = [], fin = new Date(t0.getTime() + dias * 864e5);
    for (var d = 0; d <= dias + 1; d++) Object.keys(porHora).sort().forEach(function (h) {
      var t = enHora(t0, h, d); if (t <= t0 || t > fin) return;
      var ev = porHora[h], aviso = new Date(t.getTime() - antelMin * 6e4);
      out.push({ ID: expId + "|circ|" + t.toISOString().slice(0, 16), Experimento: expId, Fecha_hora: aviso.toISOString(), Tipo: "circadiano", Destino: "equipo", Vista: "exp:" + expId + ":seguimiento",
        Titulo: h + " · cambio de ritmo (día " + (Math.floor((t - t0) / 864e5) + 1) + ")", Texto: ev.map(function (c) { return c.linea + " → " + String(c.valor).replace(".", ",") + " " + c.unidad + (c.nota ? " (" + c.nota + ")" : ""); }).join(" · ") });
    });
    return out;
  }
  function puntosMuestreo(inicioISO, dias, m) {
    var t0 = aFecha(inicioISO); if (!t0) return []; m = m || DEF.muestreo; dias = num(dias) || 7; var out = [];
    m.dia1_h.forEach(function (h) { out.push({ t_h: h, fecha: new Date(t0.getTime() + h * 36e5), etiqueta: etiquetaPunto(h), dia: 1 }); });
    var fin = t0.getTime() + dias * 864e5, lim1 = t0.getTime() + 24 * 36e5;
    for (var d = 1; d <= dias + 1; d++) m.diarias.forEach(function (hh) {
      var t = enHora(t0, hh, d); if (t.getTime() <= lim1 + 30 * 6e4 || t.getTime() > fin) return;
      var h = (t - t0) / 36e5; out.push({ t_h: r(h, 2), fecha: t, etiqueta: "D" + (Math.floor(h / 24) + 1) + " " + hh, dia: Math.floor(h / 24) + 1 });
    });
    var vistos = {}; return out.sort(function (a, b) { return a.t_h - b.t_h; }).filter(function (p) { if (vistos[p.t_h]) return false; vistos[p.t_h] = 1; return true; });
  }
  function avisosMuestreo(expId, inicioISO, dias, m, antelMin) {
    antelMin = antelMin === undefined ? 10 : antelMin; m = m || DEF.muestreo; var t0 = aFecha(inicioISO); if (!t0) return [];
    var out = puntosMuestreo(inicioISO, dias, m).filter(function (p) { return p.t_h > 0; }).map(function (p) {
      return { ID: expId + "|muestra|" + p.t_h, Experimento: expId, Fecha_hora: new Date(p.fecha.getTime() - antelMin * 6e4).toISOString(), Tipo: "muestra", Destino: "equipo", Vista: "exp:" + expId + ":seguimiento",
        Titulo: "Muestra " + p.etiqueta + " en " + antelMin + " min", Texto: "Perfusato (bioquímica), gasometrías arterial, portal y cava, flujos y mezcladores" + (p.dia === 1 && p.t_h % (m.bilis_dia1_cada_h || 2) === 0 ? ", bilis" : "") + "." };
    });
    if (m.hdf_inicio_h) out.push({ ID: expId + "|hdf", Experimento: expId, Fecha_hora: new Date(t0.getTime() + (m.hdf_inicio_h * 60 - antelMin) * 6e4).toISOString(), Tipo: "muestra", Destino: "equipo", Vista: "exp:" + expId + ":seguimiento", Titulo: "Conectar HDF en " + antelMin + " min", Texto: "Según protocolo, la hemodiafiltración se conecta a las " + m.hdf_inicio_h + " h de perfusión." });
    if (m.biopsia_cada_h) for (var h = m.biopsia_cada_h; h <= (num(dias) || 7) * 24; h += m.biopsia_cada_h)
      out.push({ ID: expId + "|biopsia|" + h, Experimento: expId, Fecha_hora: new Date(t0.getTime() + (h * 60 - antelMin) * 6e4).toISOString(), Tipo: "muestra", Destino: "equipo", Vista: "exp:" + expId + ":seguimiento", Titulo: "Biopsia hepática " + h + " h en " + antelMin + " min", Texto: "Parénquima (parafina + criopreservación)." });
    return out;
  }
  // Ritmo vigente de cada línea a una hora dada (para el panel «ahora mismo»)
  function ritmosVigentes(circ, fecha) {
    circ = circ || DEF.circadiano; var m = fecha.getHours() * 60 + fecha.getMinutes(), est = {};
    var orden = circ.cambios.slice().sort(function (a, b) { return hm(a.h) - hm(b.h); });
    orden.forEach(function (c) { est[c.linea] = c; });               // estado al final del día = arrastre desde ayer
    orden.forEach(function (c) { if (hm(c.h) <= m) est[c.linea] = c; });
    var prox = orden.filter(function (c) { return hm(c.h) > m; }); if (!prox.length) prox = orden;
    var h1 = prox.length ? prox[0].h : null;
    return { vigentes: est, proxima_hora: h1, proximos: prox.filter(function (c) { return c.h === h1; }) };
  }

  // ------------------------------------------------------------------------------------------------
  // 7. Datos para gráficos, histórico y exportación
  // ------------------------------------------------------------------------------------------------
  function xDe(m, eje, t0) {
    if (eje === "nominal") return num(m.T_nominal_h);
    var h = num(m.T_real_h); if (h === null && t0 && m.Fecha_hora) h = horasEntre(t0, m.Fecha_hora); if (h === null) h = num(m.T_nominal_h);
    if (eje === "hora") { var d = aFecha(m.Fecha_hora); return d ? d.getHours() + d.getMinutes() / 60 : null; }
    if (eje === "dia") return h === null ? null : h / 24;
    return h;
  }
  function serie(mediciones, exp, muestra, variable, eje, inicioISO) {
    var t0 = aFecha(inicioISO);
    return mediciones.filter(function (m) { return m.Experimento === exp && m.Muestra === muestra && m.Variable === variable && !m.Borrado && num(m.Valor) !== null; })
      .map(function (m) { return { x: xDe(m, eje, t0), y: num(m.Valor), punto: m.Punto, fecha: m.Fecha_hora, tn: num(m.T_nominal_h) }; })
      .filter(function (p) { return p.x !== null; }).sort(function (a, b) { return a.x - b.x; });
  }
  // Banda histórica: media ± k·DE de otros experimentos agrupando por punto nominal
  function bandaHistorica(mediciones, excluir, muestra, variable, k) {
    k = k || 2; var grupos = {};
    mediciones.forEach(function (m) {
      if (m.Muestra !== muestra || m.Variable !== variable || m.Borrado || excluir.indexOf(m.Experimento) !== -1) return;
      var t = num(m.T_nominal_h), v = num(m.Valor); if (t === null || v === null) return; (grupos[t] = grupos[t] || []).push(v);
    });
    return Object.keys(grupos).map(Number).sort(function (a, b) { return a - b; }).map(function (t) {
      var a = grupos[t], mu = media(a), s = de(a); return { t: t, n: a.length, media: mu, de: s, inf: s === null ? null : mu - k * s, sup: s === null ? null : mu + k * s };
    });
  }
  function zScore(v, banda, t) { var b = (banda || []).filter(function (x) { return x.t === t; })[0]; if (!b || b.de === null || !b.de || b.n < 3) return null; return (v - b.media) / b.de; }
  // Resumen por grupo (media, DE, EEM, n) para el modo «media ± DE»
  function agregarSeries(series) {
    var g = {}; series.forEach(function (s) { s.forEach(function (p) { var k = r(p.x, 3); (g[k] = g[k] || []).push(p.y); }); });
    return Object.keys(g).map(Number).sort(function (a, b) { return a - b; }).map(function (x) { var a = g[x], s = de(a); return { x: x, media: media(a), de: s, eem: s === null ? null : s / Math.sqrt(a.length), n: a.length }; });
  }
  // Pivot ancho: filas = (Experimento, Punto), columnas = variables
  function pivotAncho(mediciones, muestra) {
    var filas = {}, vars = [];
    mediciones.forEach(function (m) {
      if (m.Muestra !== muestra || m.Borrado) return; var k = m.Experimento + "|" + m.Punto;
      if (!filas[k]) filas[k] = { Experimento: m.Experimento, Punto: m.Punto, T_nominal_h: num(m.T_nominal_h), T_real_h: num(m.T_real_h), Fecha_hora: m.Fecha_hora };
      filas[k][m.Variable] = num(m.Valor) !== null ? num(m.Valor) : (m.Texto || ""); if (vars.indexOf(m.Variable) === -1) vars.push(m.Variable);
    });
    var cat = (MUESTRAS[muestra] || { vars: [] }).vars.map(function (v) { return v.id; });
    vars.sort(function (a, b) { var ia = cat.indexOf(a), ib = cat.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    var lista = Object.keys(filas).map(function (k) { return filas[k]; }).sort(function (a, b) { return a.Experimento < b.Experimento ? -1 : a.Experimento > b.Experimento ? 1 : (a.T_nominal_h || 0) - (b.T_nominal_h || 0); });
    return { columnas: ["Experimento", "Punto", "T_nominal_h", "T_real_h", "Fecha_hora"].concat(vars), filas: lista };
  }
  // Formato GraphPad Prism (tabla XY): X = tiempo, una columna Y por experimento
  function tablaPrismXY(mediciones, exps, muestra, variable, eje, inicios) {
    var xs = {}, data = {};
    exps.forEach(function (e) { serie(mediciones, e, muestra, variable, eje, inicios[e]).forEach(function (p) { var k = r(p.x, 3); xs[k] = 1; (data[e] = data[e] || {})[k] = p.y; }); });
    var X = Object.keys(xs).map(Number).sort(function (a, b) { return a - b; });
    return { cabecera: ["X (" + (eje === "dia" ? "días" : eje === "hora" ? "hora del día" : "h") + ")"].concat(exps), filas: X.map(function (x) { return [x].concat(exps.map(function (e) { return data[e] && data[e][x] !== undefined ? data[e][x] : ""; })); }) };
  }

  // Paleta Okabe-Ito (apta para daltonismo) + extensión
  var PALETA = ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#E69F00", "#56B4E9", "#000000", "#B8A200", "#7F3C8D", "#11A579", "#3969AC", "#E73F74", "#80BA5A", "#E68310", "#008695", "#CF1C90"];

  // Morfometría: estimación de peso vivo a partir del perímetro torácico (HGH) y la longitud del cuerpo, fórmula de campo
  // peso (lb) = HG(in)² · L(in) / 400 → kg = HG(cm)² · L(cm) / 400 / 2,54³ · 0,45359. Orientativa (error ±5–10 %).
  function pesoMorfometrico(perimCm, longCm) { var h = num(perimCm), l = num(longCm); if (!h || !l) return null; return h * h * l / 400 / Math.pow(2.54, 3) * 0.45359; }

  return { KPA: KPA, num: num, r: r, clamp: clamp, media: media, de: de, MUESTRAS: MUESTRAS, DERIVADAS: DERIVADAS, variable: variable, DEF: DEF, MODELOS_DIETA: MODELOS_DIETA,
    aFecha: aFecha, horasEntre: horasEntre, minutosEntre: minutosEntre, hm: hm, enHora: enHora, duracionTxt: duracionTxt, cronoTxt: cronoTxt, etiquetaPunto: etiquetaPunto,
    energiaDieta: energiaDieta, compararModelosDieta: compararModelosDieta, factorSexo: factorSexo,
    volumenPerfusato: volumenPerfusato, correccionesPerfusato: correccionesPerfusato, heparina: heparina, cortisolBolo: cortisolBolo,
    enRango: enRango, asesorGas: asesorGas, sO2Hill: sO2Hill, sO2Estimada: sO2Estimada, p50Corregida: p50Corregida, contenidoO2: contenidoO2, consumoO2: consumoO2, hemodinamica: hemodinamica, produccionBilis: produccionBilis,
    tiempos: tiempos, pasoRecalentamiento: pasoRecalentamiento, cambiosRecal: cambiosRecal, NOMBRES_RECAL: NOMBRES_RECAL, UNIDAD_RECAL: UNIDAD_RECAL, avisosRecalentamiento: avisosRecalentamiento,
    avisosCircadianos: avisosCircadianos, puntosMuestreo: puntosMuestreo, avisosMuestreo: avisosMuestreo, ritmosVigentes: ritmosVigentes,
    serie: serie, xDe: xDe, bandaHistorica: bandaHistorica, zScore: zScore, agregarSeries: agregarSeries, pivotAncho: pivotAncho, tablaPrismXY: tablaPrismXY,
    PALETA: PALETA, pesoMorfometrico: pesoMorfometrico };
});
