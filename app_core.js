/* HOME · núcleo de la web: estado, servidor, cola sin conexión, caché, rutas, acceso, alarmas y push. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME = window.HOME || {};
  var VERSION = "0.1.0";
  var S = H.S = { token: null, usuario: null, demo: false, cfg: null, t: {}, med: {}, medCargada: {}, cola: [], enviando: false, online: navigator.onLine !== false,
    ultima: null, pref: {}, avisosVistos: {}, pendienteRepintar: false, errores: [] };
  var TABLAS = ["Experimentos", "Animales", "Dieta", "Formularios", "Eventos", "Avisos", "Material", "Movimientos", "Solicitudes", "Personal", "Usuarios", "Config"];
  H.TABLAS = TABLAS; H.VERSION = VERSION;

  // ---------------------------------------------------------------- utilidades
  var esc = H.esc = function (s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  H.ico = function (n, cls) { return "<svg class=\"ico " + (cls || "") + "\" aria-hidden=\"true\"><use href=\"#i-" + n + "\"/></svg>"; };
  var nf = {}; H.n = function (v, d) { v = C.num(v); if (v === null) return ""; d = d === undefined ? 1 : d; var k = "d" + d; if (!nf[k]) nf[k] = new Intl.NumberFormat("es-ES", { maximumFractionDigits: d, minimumFractionDigits: 0 }); return nf[k].format(v); };
  H.nFijo = function (v, d) { v = C.num(v); if (v === null) return ""; return new Intl.NumberFormat("es-ES", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v); };
  var dtf = { f: new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }), fh: new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    h: new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }), hs: new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), dc: new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "2-digit", month: "short" }) };
  H.fecha = function (v) { var d = C.aFecha(v); return d ? dtf.f.format(d) : ""; };
  H.fechaHora = function (v) { var d = C.aFecha(v); return d ? dtf.fh.format(d) : ""; };
  H.hora = function (v) { var d = C.aFecha(v); return d ? dtf.h.format(d) : ""; };
  H.horaS = function (v) { var d = C.aFecha(v); return d ? dtf.hs.format(d) : ""; };
  H.diaCorto = function (v) { var d = C.aFecha(v); return d ? dtf.dc.format(d) : ""; };
  function pad(x) { return (x < 10 ? "0" : "") + x; }
  H.aLocal = function (v) { var d = C.aFecha(v); if (!d) return ""; return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); };   // para <input type=datetime-local>
  H.aFechaLocal = function (v) { var d = C.aFecha(v); if (!d) return ""; return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  H.deLocal = function (s) { if (!s) return ""; var d = new Date(s); return isNaN(d) ? "" : d.toISOString(); };
  H.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  H.$ = function (sel, el) { return (el || document).querySelector(sel); };
  H.$$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  H.copia = function (o) { return JSON.parse(JSON.stringify(o)); };
  function mezclar(base, sobre) { if (sobre === undefined || sobre === null) return H.copia(base); if (Array.isArray(base) || typeof base !== "object" || base === null) return H.copia(sobre); var o = H.copia(base); Object.keys(sobre).forEach(function (k) { o[k] = (k in base && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) ? mezclar(base[k], sobre[k]) : H.copia(sobre[k]); }); return o; }
  H.mezclar = mezclar;
  var debounces = {}; H.retrasar = function (k, ms, fn) { clearTimeout(debounces[k]); debounces[k] = setTimeout(fn, ms); };

  // ---------------------------------------------------------------- toasts y modal
  H.toast = function (txt, tipo) {
    var c = H.$("#toasts"); if (!c) return; var d = document.createElement("div"); d.className = "toast " + (tipo || ""); d.setAttribute("role", tipo === "error" ? "alert" : "status");
    d.innerHTML = H.ico(tipo === "error" ? "circle-alert" : "circle-check") + "<div>" + esc(txt) + "</div>"; c.appendChild(d);
    setTimeout(function () { d.remove(); }, tipo === "error" ? 7000 : 3500);
  };
  H.modal = function (o) {   // {titulo, cuerpo (html), pie (html), ancho, alAbrir(dlg), alCerrar}
    var d = document.createElement("dialog"); d.className = "modal" + (o.ancho ? " ancho" : ""); d.setAttribute("aria-label", o.titulo || "");
    d.innerHTML = "<div class=\"m-cab\"><h2>" + esc(o.titulo || "") + "</h2><button class=\"bt ico-solo texto\" data-cerrar aria-label=\"Cerrar\">" + H.ico("x") + "</button></div><div class=\"m-cuerpo\">" + (o.cuerpo || "") + "</div>" + (o.pie ? "<div class=\"m-pie\">" + o.pie + "</div>" : "");
    document.body.appendChild(d);
    d.addEventListener("click", function (e) { if (e.target.closest("[data-cerrar]") || e.target === d) d.close(); });
    d.addEventListener("close", function () { if (o.alCerrar) o.alCerrar(d); d.remove(); });
    d.showModal(); if (o.alAbrir) o.alAbrir(d); return d;
  };
  H.confirmar = function (titulo, texto, etiquetaOk, peligro) {
    return new Promise(function (ok) {
      var res = false;
      H.modal({ titulo: titulo, cuerpo: "<p>" + esc(texto) + "</p>", pie: "<button class=\"bt\" data-cerrar>Cancelar</button><button class=\"bt " + (peligro ? "peligro" : "pri") + "\" data-ok>" + esc(etiquetaOk || "Aceptar") + "</button>",
        alAbrir: function (d) { d.querySelector("[data-ok]").addEventListener("click", function () { res = true; d.close(); }); }, alCerrar: function () { ok(res); } });
    });
  };

  // ---------------------------------------------------------------- almacenamiento local (IndexedDB clave-valor)
  var idbP = null;
  function idb() { if (!idbP) idbP = new Promise(function (ok, ko) { try { var r = indexedDB.open("home-app", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error); }; } catch (e) { ko(e); } }); return idbP; }
  H.idbGet = function (k) { return idb().then(function (db) { return new Promise(function (ok) { var q = db.transaction("kv", "readonly").objectStore("kv").get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { ok(undefined); }; }); }).catch(function () { return undefined; }); };
  H.idbSet = function (k, v) { return idb().then(function (db) { return new Promise(function (ok) { var tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = function () { ok(true); }; tx.onerror = function () { ok(false); }; }); }).catch(function () { return false; }); };
  H.idbDel = function (k) { return idb().then(function (db) { return new Promise(function (ok) { var tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").delete(k); tx.oncomplete = function () { ok(true); }; }); }).catch(function () { return false; }); };
  function claveCache() { return "cache:" + (S.demo ? "demo:" : "") + (S.usuario ? S.usuario.email : "anon"); }
  function guardarCache() { H.retrasar("cache", 600, function () { H.idbSet(claveCache(), { t: S.t, med: S.med, medCargada: S.medCargada, ultima: S.ultima, cola: S.cola, cfgSrv: S.cfgSrv || {} }); }); }
  H.guardarCache = guardarCache;
  function leerPref() { try { S.pref = JSON.parse(localStorage.getItem("home_pref") || "{}"); } catch (e) { S.pref = {}; } }
  H.pref = function (k, v) { if (v === undefined) return S.pref[k]; S.pref[k] = v; localStorage.setItem("home_pref", JSON.stringify(S.pref)); };
  function aplicarTema() { var t = S.pref.tema || "sistema", osc = t === "oscuro" || (t === "sistema" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("tema-oscuro", !!osc);
    var m = document.querySelector("meta[name=theme-color]"); if (m) m.setAttribute("content", osc ? "#172025" : "#ffffff"); }
  H.aplicarTema = aplicarTema;

  // ---------------------------------------------------------------- servidor
  function ErrorServidor(m) { this.message = m; this.servidor = true; } ErrorServidor.prototype = Object.create(Error.prototype);
  H.servidor = function (fn, args) {
    if (S.demo) return window.HOMEDemo.llamar(fn, args || []);
    if (!window.HOME_API || /PEGA_AQUI/.test(window.HOME_API)) return Promise.reject(new ErrorServidor("Falta la dirección del servidor en config.js. Mientras tanto puedes usar el modo demostración."));
    return fetch(window.HOME_API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ fn: fn, args: args || [] }), redirect: "follow" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (j && j.error) throw new ErrorServidor(j.error); return j ? j.r : null; });
  };
  H.api = function (fn) { var args = Array.prototype.slice.call(arguments, 1); return H.servidor(fn, [S.token].concat(args)).catch(function (e) { if (e.servidor && /sesi[oó]n caducada/i.test(e.message)) { H.salir(true); } throw e; }); };

  // ---------------------------------------------------------------- datos locales
  H.filas = function (tabla) { return (S.t[tabla] || []).filter(function (f) { return !esBorrado(f); }); };
  function esBorrado(f) { return f.Borrado === true || f.Borrado === "TRUE" || f.Borrado === "true"; }
  H.esBorrado = esBorrado;
  H.fila = function (tabla, id) { var l = S.t[tabla] || []; for (var i = 0; i < l.length; i++) if (l[i].ID === id) return esBorrado(l[i]) ? null : l[i]; return null; };
  function upsertLocal(tabla, filas) {
    if (tabla === "Mediciones") { filas.forEach(function (f) { var e = f.Experimento, l = S.med[e] = S.med[e] || [], i = indice(l, f.ID); if (i === -1) l.push(f); else l[i] = mezclarFila(l[i], f); }); return; }
    var l = S.t[tabla] = S.t[tabla] || []; filas.forEach(function (f) { var i = indice(l, f.ID); if (i === -1) l.push(f); else l[i] = mezclarFila(l[i], f); });
  }
  function mezclarFila(a, b) { var o = {}; for (var k in a) o[k] = a[k]; for (var j in b) o[j] = b[j]; return o; }
  function indice(l, id) { for (var i = 0; i < l.length; i++) if (l[i].ID === id) return i; return -1; }
  H.upsertLocal = upsertLocal;
  H.med = function (exp) { return (S.med[exp] || []).filter(function (f) { return !esBorrado(f); }); };
  H.todasMed = function () { var o = []; Object.keys(S.med).forEach(function (e) { o = o.concat(H.med(e)); }); return o; };

  // Guardar: aplica en local al instante y encola el envío (funciona sin conexión; los ID los genera el cliente → reintentos idempotentes)
  H.guardar = function (tabla, filas, opc) {
    opc = opc || {}; if (!filas || !filas.length) return Promise.resolve();
    if (!H.puede(tabla === "Solicitudes" ? "solicitar" : "registrar")) { H.toast("Tu usuario es de solo lectura: no puedes guardar cambios.", "error"); return Promise.reject(new Error("solo lectura")); }
    var ahora = new Date().toISOString(), u = S.usuario ? S.usuario.email : "", filasOrig = filas;
    filas = filas.map(function (f) {
      var prev = tabla === "Mediciones" ? (S.med[f.Experimento] || []).filter(function (x) { return x.ID === f.ID; })[0] : (S.t[tabla] || []).filter(function (x) { return x.ID === f.ID; })[0];
      var o = mezclarFila(prev || {}, f); if (!prev) { o.Creado_por = u; o.Creado_en = ahora; } o.Actualizado_por = u; o.Actualizado_en = ahora; if (o.Borrado === undefined) o.Borrado = false; return o;
    });
    upsertLocal(tabla, filas);
    var envio = filasOrig.map(function (f) { var o = {}; Object.keys(f).forEach(function (k) { if (k.charAt(0) !== "_" && !/^(Creado_|Actualizado_)/.test(k)) o[k] = f[k]; }); return o; });   // solo los campos que cambian
    for (var i = 0; i < envio.length; i += 500) S.cola.push({ id: H.uid(), fn: "webGuardar", args: [tabla, envio.slice(i, i + 500)], t: ahora });
    guardarCache(); actualizarSync(); if (!opc.sinRepintar) H.repintarPronto();
    return H.enviarCola();
  };
  H.borrar = function (tabla, ids) {
    var l = tabla === "Mediciones" ? H.todasMed() : (S.t[tabla] || []);
    l.forEach(function (f) { if (ids.indexOf(f.ID) !== -1) f.Borrado = true; });
    S.cola.push({ id: H.uid(), fn: "webBorrar", args: [tabla, ids] }); guardarCache(); actualizarSync(); H.repintarPronto(); return H.enviarCola();
  };
  H.enviarCola = function () {
    if (S.enviando || !S.cola.length || !S.token) return Promise.resolve();
    S.enviando = true; actualizarSync();
    var it = S.cola[0];
    return H.servidor(it.fn, [S.token].concat(it.args)).then(function (r) {
      S.cola.shift(); S.online = true;
      if (r && r.filas && it.args[0]) upsertLocal(it.args[0], r.filas);
      S.enviando = false; guardarCache(); actualizarSync(); return H.enviarCola();
    }).catch(function (e) {
      S.enviando = false;
      if (e && e.servidor) {
        if (/sesi[oó]n caducada/i.test(e.message)) { H.salir(true); return; }
        S.cola.shift(); S.errores.push({ t: new Date().toISOString(), msg: e.message, it: it }); H.toast("No se ha guardado un cambio: " + e.message, "error"); guardarCache(); actualizarSync(); return H.enviarCola();
      }
      S.online = false; actualizarSync(); setTimeout(H.enviarCola, 15000);
    });
  };
  function actualizarSync() {
    var el = H.$("#estadoSync"); if (!el) return; var n = S.cola.length;
    el.className = "estado-sync" + (!S.online ? " offline" : n ? " pendiente" : "");
    el.innerHTML = !S.online ? H.ico("wifi-off", "s") + "<span class=\"txt\">Sin conexión · " + n + " pendiente" + (n === 1 ? "" : "s") + "</span>"
      : n ? H.ico("cloud-upload", "s") + "<span class=\"txt\">Guardando " + n + "…</span>" : H.ico("circle-check", "s") + "<span class=\"txt\">" + (S.demo ? "Demostración" : "Sincronizado") + "</span>";
    el.title = !S.online ? "Los cambios se guardan en este dispositivo y se enviarán al recuperar la conexión." : n ? n + " cambio(s) pendientes de enviar" : "Todos los cambios están guardados en el servidor";
  }
  H.actualizarSync = actualizarSync;
  window.addEventListener("online", function () { S.online = true; H.enviarCola(); actualizarSync(); });
  window.addEventListener("offline", function () { S.online = false; actualizarSync(); });
  window.addEventListener("beforeunload", function (e) { if (S.cola.length) { e.preventDefault(); e.returnValue = ""; } });

  // Mediciones de experimentos concretos (se piden bajo demanda)
  H.asegurarMed = function (exps) {
    var falta = exps.filter(function (e) { return !S.medCargada[e]; }); if (!falta.length) return Promise.resolve(false);
    return H.api("webMediciones", falta).then(function (r) {
      falta.forEach(function (e) { S.medCargada[e] = true; S.med[e] = (S.med[e] || []).filter(function (f) { return pendienteEnCola(f.ID); }); });
      upsertLocal("Mediciones", r.filas || []); reaplicarCola(); guardarCache(); return true;
    });
  };
  function pendienteEnCola(id) { return S.cola.some(function (it) { return it.fn === "webGuardar" && it.args[1].some(function (f) { return f.ID === id; }); }); }
  function reaplicarCola() { S.cola.forEach(function (it) { if (it.fn === "webGuardar") upsertLocal(it.args[0], it.args[1]); }); }

  // Configuración efectiva = valores por defecto + lo guardado en la pestaña Config
  H.recalcCfg = function () {
    var cfg = H.copia(C.DEF); H.filas("Config").forEach(function (f) { try { var v = typeof f.Valor_JSON === "string" ? JSON.parse(f.Valor_JSON) : f.Valor_JSON; if (v && cfg.hasOwnProperty(f.ID)) cfg[f.ID] = mezclar(cfg[f.ID], v); else if (v) cfg[f.ID] = v; } catch (e) { } });
    S.cfg = cfg; return cfg;
  };

  // ---------------------------------------------------------------- permisos
  H.rol = function () { return S.usuario ? String(S.usuario.rol || "").toUpperCase() : ""; };
  H.esAdmin = function () { return H.rol() === "ADMIN"; };
  H.puede = function (accion) { var r = H.rol(); if (accion === "solicitar") return !!r; if (accion === "registrar") return r === "ADMIN" || r === "REGISTRO"; if (accion === "admin") return r === "ADMIN"; return !!r; };

  // ---------------------------------------------------------------- acceso
  H.pantallaAcceso = function (paso, email) {
    document.body.innerHTML = "<div id=\"toasts\" class=\"toasts\" aria-live=\"polite\"></div><main class=\"acceso\"><div class=\"caja\">" + H.marcaHTML() +
      (paso === "codigo"
        ? "<h1>Introduce el código</h1><p class=\"tenue\">Hemos enviado un código de 6 dígitos a <b>" + esc(email) + "</b>. Caduca en 10 minutos; si no lo ves, revisa el correo no deseado.</p>" +
          "<form id=\"fCodigo\" novalidate><div class=\"campo\"><label class=\"et\" for=\"codigo\">Código</label><input id=\"codigo\" name=\"one-time-code\" autocomplete=\"one-time-code\" inputmode=\"numeric\" pattern=\"[0-9]*\" maxlength=\"6\" spellcheck=\"false\" placeholder=\"123456…\" required></div>" +
          "<div class=\"msg-error\" id=\"errAcc\" role=\"alert\"></div><button class=\"bt pri grande\" style=\"width:100%\" type=\"submit\">Entrar</button></form><p style=\"margin-top:12px\"><button class=\"bt texto\" id=\"volver\">Usar otro correo</button></p>"
        : "<h1>Acceso</h1><p class=\"tenue\">Registro de experimentos del proyecto HOME. Escribe el correo con el que te dieron de alta y te enviaremos un código.</p>" +
          "<form id=\"fEmail\" novalidate><div class=\"campo\"><label class=\"et\" for=\"email\">Correo</label><input id=\"email\" type=\"email\" name=\"email\" autocomplete=\"email\" spellcheck=\"false\" placeholder=\"nombre@salud.madrid.org…\" required></div>" +
          "<div class=\"msg-error\" id=\"errAcc\" role=\"alert\"></div><button class=\"bt pri grande\" style=\"width:100%\" type=\"submit\">Enviar código</button></form>" +
          "<details class=\"plegable\" style=\"margin-top:16px\"" + (sinServidor() ? " open" : "") + "><summary>Modo demostración (sin servidor)</summary><div class=\"dentro\"><p class=\"tenue\">Datos simulados guardados solo en este navegador. Sirve para probar la app antes de instalar el servidor.</p>" +
          "<div class=\"fila-flex\"><button class=\"bt\" data-demo=\"ADMIN\">Entrar como ADMIN</button><button class=\"bt\" data-demo=\"REGISTRO\">REGISTRO</button><button class=\"bt\" data-demo=\"VISUALIZAR\">VISUALIZAR</button></div></div></details>") +
      "<p class=\"pie\">GITIC · Hospital Universitario La Paz / IdiPAZ · PI23/00364 · PI26/00141 · v" + VERSION + "</p></div></main>";
    H.cargarIconos();
    var fE = H.$("#fEmail"), fC = H.$("#fCodigo");
    H.$$("[data-demo]").forEach(function (b) { b.addEventListener("click", function () { H.entrarDemo(b.getAttribute("data-demo")); }); });
    if (fE) fE.addEventListener("submit", function (e) {
      e.preventDefault(); var em = H.$("#email").value.trim().toLowerCase(), err = H.$("#errAcc"), bt = fE.querySelector("button[type=submit]");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { err.textContent = "Escribe un correo válido, por ejemplo nombre@salud.madrid.org."; H.$("#email").focus(); return; }
      bt.disabled = true; bt.classList.add("cargando-bt"); err.textContent = "";
      H.servidor("webSolicitarCodigo", [em]).then(function (r) { if (r && r.ok === false) throw new Error(r.mensaje || "No se ha podido enviar el código."); H.pantallaAcceso("codigo", em); }).catch(function (x) { err.textContent = x.message || "No se ha podido contactar con el servidor. Comprueba la conexión y vuelve a intentarlo."; bt.disabled = false; bt.classList.remove("cargando-bt"); });
    });
    if (fC) {
      H.$("#volver").addEventListener("click", function () { H.pantallaAcceso("email"); });
      fC.addEventListener("submit", function (e) {
        e.preventDefault(); var c = H.$("#codigo").value.replace(/\D/g, ""), err = H.$("#errAcc"), bt = fC.querySelector("button[type=submit]");
        if (c.length !== 6) { err.textContent = "El código tiene 6 dígitos."; return; }
        bt.disabled = true; bt.classList.add("cargando-bt");
        H.servidor("webVerificarCodigo", [email, c, nombreDispositivo()]).then(function (r) {
          S.token = r.token; S.usuario = r.usuario; S.demo = false; localStorage.setItem("home_sesion", JSON.stringify({ token: r.token, usuario: r.usuario }));
          H.arrancar();
        }).catch(function (x) { err.textContent = x.message || "Código incorrecto."; bt.disabled = false; bt.classList.remove("cargando-bt"); });
      });
    }
    var primero = H.$("#email") || H.$("#codigo"); if (primero && window.matchMedia("(pointer: fine)").matches) primero.focus();
  };
  function sinServidor() { return !window.HOME_API || /PEGA_AQUI/.test(window.HOME_API); }
  function nombreDispositivo() { var u = navigator.userAgent; return (/iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "Navegador") + " · " + (/Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : ""); }
  H.entrarDemo = function (rol) {
    S.demo = true; window.HOMEDemo.iniciar(); return window.HOMEDemo.llamar("webVerificarCodigo", ["demo-" + rol.toLowerCase() + "@home.demo", "000000", "demo"]).then(function (r) {
      S.token = r.token; S.usuario = r.usuario; localStorage.setItem("home_sesion", JSON.stringify({ token: r.token, usuario: r.usuario, demo: true })); H.arrancar();
    });
  };
  H.salir = function (caducada) {
    var tok = S.token; if (tok && !caducada) H.servidor("webSalir", [tok]).catch(function () { });
    if (H.pushDesactivar) H.pushDesactivar(true);
    localStorage.removeItem("home_sesion"); H.idbDel(claveCache()); S.token = null; S.usuario = null; S.t = {}; S.med = {}; S.medCargada = {}; S.cola = [];
    if (caducada) { H.pantallaAcceso("email"); setTimeout(function () { H.toast("La sesión ha caducado. Vuelve a entrar.", "error"); }, 50); } else H.pantallaAcceso("email");
  };

  // ---------------------------------------------------------------- arranque
  H.arrancar = function () {
    leerPref(); aplicarTema(); H.pintarMarco(); H.actualizarSync();
    try { S.avisosVistos = JSON.parse(localStorage.getItem("home_avisos_vistos") || "{}"); } catch (e) { S.avisosVistos = {}; }
    H.idbGet(claveCache()).then(function (c) {
      if (c && c.t) { S.t = c.t; S.med = c.med || {}; S.medCargada = {}; S.ultima = c.ultima; S.cola = (c.cola || []).concat(S.cola); H.recalcCfg(); H.repintar(); }
      return H.api("webCargar");
    }).then(function (r) {
      S.usuario = r.usuario || S.usuario; var sess = JSON.parse(localStorage.getItem("home_sesion") || "{}"); sess.usuario = S.usuario; localStorage.setItem("home_sesion", JSON.stringify(sess));
      S.t = r.tablas || {}; S.ultima = r.ahora; reaplicarCola(); H.recalcCfg(); S.online = true; S.cargado = true;
      var act = H.expRelevantes(); return H.asegurarMed(act).catch(function () { }).then(function () { H.pintarMarco(); H.repintar(); guardarCache(); H.enviarCola(); });
    }).catch(function (e) {
      if (e && e.servidor) { H.toast(e.message, "error"); if (/sesi[oó]n/i.test(e.message)) return; }
      S.online = false; H.recalcCfg(); H.repintar(); H.toast("Sin conexión con el servidor: trabajas con la copia de este dispositivo.", "error");
    }).then(function () { actualizarSync(); });
    if (!H._intervalos) {
      H._intervalos = true;
      setInterval(H.tic, 1000);
      setInterval(H.sondear, 20000);
      document.addEventListener("visibilitychange", function () { if (!document.hidden) H.sondear(); });
    }
    if (H.registrarSW) H.registrarSW();
  };
  // Experimentos cuyas mediciones se cargan al entrar: en perfusión, en cirugía y los 3 más recientes
  H.expRelevantes = function () {
    var l = H.filas("Experimentos").slice().sort(function (a, b) { return String(b.ID).localeCompare(String(a.ID), "es", { numeric: true }); });
    var act = l.filter(function (e) { return e.Estado === "Perfusión" || e.Estado === "Cirugía"; }).map(function (e) { return e.ID; });
    l.slice(0, 3).forEach(function (e) { if (act.indexOf(e.ID) === -1) act.push(e.ID); }); return act;
  };
  // «En directo»: trae cambios de otros dispositivos
  H.sondear = function () {
    if (!S.token || !S.ultima || document.hidden || S.enviando) return;
    H.api("webCambios", S.ultima).then(function (r) {
      var hay = false; Object.keys(r.tablas || {}).forEach(function (t) {
        var f = (r.tablas[t] || []).filter(function (x) { return !pendienteEnCola(x.ID); }); if (!f.length) return; hay = true;
        if (t === "Mediciones") f = f.filter(function (x) { return S.medCargada[x.Experimento] || S.med[x.Experimento]; });
        upsertLocal(t, f);
      });
      S.ultima = r.ahora; S.online = true; actualizarSync();
      if (hay) { H.recalcCfg(); guardarCache(); H.repintarPronto(); var l = H.$("#indDirecto"); if (l) { l.classList.add("chip", "ok"); l.textContent = "Actualizado " + H.hora(new Date()); } }
    }).catch(function (e) { if (!(e && e.servidor)) { S.online = false; actualizarSync(); } });
  };
  // Repintar sin perder lo que se está escribiendo
  H.repintarPronto = function () {
    var a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && H.$("#principal") && H.$("#principal").contains(a)) { S.pendienteRepintar = true; return; }
    H.retrasar("repintar", 60, H.repintar);
  };
  document.addEventListener("focusout", function () { setTimeout(function () { if (S.pendienteRepintar) { var a = document.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { S.pendienteRepintar = false; H.repintar(); } } }, 250); });

  // ---------------------------------------------------------------- marco (cabecera + navegación)
  H.marcaHTML = function () {
    return "<a class=\"marca\" href=\"#/inicio\" aria-label=\"HOME, inicio\"><svg viewBox=\"0 0 32 32\" aria-hidden=\"true\"><rect width=\"32\" height=\"32\" rx=\"8\" fill=\"var(--pri)\"/><path d=\"M4 14C4 9 9 7 15 7.5S27 8 28 10.5S24 15 20 17.5S11 23 7.5 21.5S4 17.5 4 14z\" fill=\"#fff\"/><path d=\"M15 7.6C13.5 10 13.2 12.5 14 15.5\" stroke=\"var(--pri)\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/></svg><b>HOME</b><span>Perfusión hepática extendida</span></a>";
  };
  var NAV = [
    { r: "inicio", n: "Inicio", i: "house" }, { r: "experimentos", n: "Experimentos", i: "flask-conical" }, { r: "graficos", n: "Gráficos", i: "chart-line" },
    { r: "inventario", n: "Inventario", i: "package" }, { r: "exportar", n: "Exportar", i: "download" }, { r: "config", n: "Configuración", i: "settings", admin: true }];
  H.pintarMarco = function () {
    var u = S.usuario || {}, ini = String(u.nombre || u.email || "?").trim().charAt(0).toUpperCase();
    var bajo = H.stockBajo ? H.stockBajo().length : 0, solP = H.filas("Solicitudes").filter(function (s) { return s.Estado === "Pendiente"; }).length;
    var nav = NAV.filter(function (x) { return !x.admin || H.esAdmin(); });
    function cont(r) { var n = r === "inventario" ? bajo + (H.esAdmin() ? solP : 0) : 0; return n ? "<span class=\"cont\" aria-label=\"" + n + " avisos\">" + n + "</span>" : ""; }
    document.body.innerHTML = "<a class=\"saltar\" href=\"#principal\">Saltar al contenido</a>" + (S.demo ? "<div class=\"demo-banda\">Modo demostración · datos simulados guardados solo en este navegador</div>" : "") +
      "<header class=\"cab\">" + H.marcaHTML() + "<span id=\"chipActivo\"></span><span class=\"empuja\"></span><span id=\"estadoSync\" class=\"estado-sync\" role=\"status\"></span>" +
      "<button class=\"avatar\" data-act=\"cuenta\" aria-label=\"Mi cuenta: " + esc(u.nombre || u.email || "") + " (" + esc(u.rol || "") + ")\">" + esc(ini) + "</button></header>" +
      "<div class=\"marco\"><nav class=\"riel\" aria-label=\"Secciones\">" + nav.map(function (x) { return "<a href=\"#/" + x.r + "\" data-nav=\"" + x.r + "\">" + H.ico(x.i) + x.n + cont(x.r) + "</a>"; }).join("") +
      "<div class=\"sep\"></div><a href=\"#/cuenta\" data-nav=\"cuenta\">" + H.ico("user") + "Mi cuenta</a><p class=\"muy-tenue\" style=\"padding:8px 10px\">" + esc(u.nombre || "") + "<br>" + esc(u.rol || "") + " · v" + VERSION + "</p></nav>" +
      "<main id=\"principal\" class=\"principal\" tabindex=\"-1\"></main></div>" +
      "<nav class=\"inferior\" aria-label=\"Secciones\">" + nav.slice(0, 5).map(function (x) { return "<a href=\"#/" + x.r + "\" data-nav=\"" + x.r + "\">" + H.ico(x.i) + "<span>" + x.n + "</span></a>"; }).join("") + "</nav>" +
      "<div id=\"toasts\" class=\"toasts\" aria-live=\"polite\"></div><div id=\"alarmas\"></div>";
    H.cargarIconos(); actualizarSync();
  };
  H.cargarIconos = function () { if (!document.getElementById("sprite") && window.HOME_SPRITE) { var d = document.createElement("div"); d.id = "sprite"; d.style.display = "none"; d.innerHTML = window.HOME_SPRITE; document.body.insertBefore(d, document.body.firstChild); } };

  // ---------------------------------------------------------------- rutas
  H.vistas = {};
  H.ruta = function () { var h = location.hash.replace(/^#\/?/, ""), q = {}, i = h.indexOf("?"); if (i !== -1) { h.slice(i + 1).split("&").forEach(function (p) { var kv = p.split("="); q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ""); }); h = h.slice(0, i); } var partes = h.split("/").filter(Boolean).map(decodeURIComponent); return { partes: partes.length ? partes : ["inicio"], q: q }; };
  H.ir = function (ruta) { if (location.hash === "#/" + ruta) H.repintar(); else location.hash = "#/" + ruta; };
  H.repintar = function () {
    var main = H.$("#principal"); if (!main || !S.usuario) return;
    if (!S.cfg) H.recalcCfg();
    var r = H.ruta(), v = H.vistas[r.partes[0]] || H.vistas.inicio, y = window.scrollY, mismo = H._ultimaRuta === location.hash;
    try { main.innerHTML = v(r.partes.slice(1), r.q); } catch (e) { console.error(e); main.innerHTML = "<div class=\"aviso al\">" + H.ico("circle-alert") + "<div><b>Error al mostrar esta pantalla.</b><br>" + esc(e.message) + "</div></div>"; }
    H.$$("[data-nav]").forEach(function (a) { a.classList.toggle("activo", a.getAttribute("data-nav") === r.partes[0] || (r.partes[0] === "exp" && a.getAttribute("data-nav") === "experimentos")); if (a.classList.contains("activo")) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (H._postPintar) { var f = H._postPintar; H._postPintar = null; try { f(); } catch (e) { console.error(e); } }
    H.chipActivo(); H.tic(true);
    if (mismo) window.scrollTo(0, y); else { window.scrollTo(0, 0); H._ultimaRuta = location.hash; }
  };
  H.trasPintar = function (f) { var a = H._postPintar; H._postPintar = a ? function () { a(); f(); } : f; };
  window.addEventListener("hashchange", function () { if (S.usuario) H.repintar(); });

  // ---------------------------------------------------------------- acciones por delegación
  H.acc = {};
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
    if (H.desbloquearAudio) H.desbloquearAudio();
    var f = H.acc[el.getAttribute("data-act")]; if (f) { e.preventDefault(); f(el, e); }
  });
  document.addEventListener("change", function (e) { var el = e.target.closest("[data-cambio]"); if (!el) return; var f = H.acc[el.getAttribute("data-cambio")]; if (f) f(el, e); });
  document.addEventListener("input", function (e) { var el = e.target.closest("[data-entrada]"); if (!el) return; var f = H.acc[el.getAttribute("data-entrada")]; if (f) f(el, e); });
  document.addEventListener("keydown", function (e) {
    var el = e.target; if (el.tagName === "INPUT" && el.closest("table.h") && (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp")) {   // navegación tipo hoja de cálculo
      var td = el.closest("td"), tr = td.parentElement, i = Array.prototype.indexOf.call(tr.children, td), sig = e.key === "ArrowUp" ? tr.previousElementSibling : tr.nextElementSibling;
      while (sig && !(sig.children[i] && sig.children[i].querySelector("input"))) sig = e.key === "ArrowUp" ? sig.previousElementSibling : sig.nextElementSibling;
      if (sig) { e.preventDefault(); sig.children[i].querySelector("input").focus(); sig.children[i].querySelector("input").select(); }
    }
  });
  H.acc.cuenta = function () { H.ir("cuenta"); };

  // ---------------------------------------------------------------- reloj: cronómetros, cuentas atrás y alarmas locales
  H.tic = function (inmediato) {
    var ahora = Date.now();
    H.$$("[data-crono]").forEach(function (el) { var d = C.aFecha(el.getAttribute("data-crono")), h = C.aFecha(el.getAttribute("data-hasta")); el.textContent = d ? C.cronoTxt((h ? h.getTime() : ahora) - d.getTime()) : "--:--:--"; });
    H.$$("[data-cuenta]").forEach(function (el) { var d = C.aFecha(el.getAttribute("data-cuenta")); if (!d) return; var ms = d.getTime() - ahora; el.textContent = ms > 0 ? C.cronoTxt(ms).replace(/^00:/, "") : "00:00"; el.classList.toggle("inminente", ms > 0 && ms < 60000); });
    H.$$("[data-transcurrido]").forEach(function (el) { var d = C.aFecha(el.getAttribute("data-transcurrido")); if (d) el.textContent = C.duracionTxt((ahora - d) / 6e4); });
    if (H.ticVista) H.ticVista(ahora);
    if (!inmediato) H.revisarAlarmas(ahora);
  };
  H.revisarAlarmas = function (ahora) {
    if (!S.usuario) return;
    var due = H.filas("Avisos").filter(function (a) { if (a.Estado === "Cancelado") return false; var t = C.aFecha(a.Fecha_hora); return t && t.getTime() <= ahora && t.getTime() > ahora - 90000 && !S.avisosVistos[a.ID]; });
    if (!due.length) return;
    due.forEach(function (a) { S.avisosVistos[a.ID] = ahora; });
    var lim = ahora - 3 * 864e5; Object.keys(S.avisosVistos).forEach(function (k) { if (S.avisosVistos[k] < lim) delete S.avisosVistos[k]; });
    localStorage.setItem("home_avisos_vistos", JSON.stringify(S.avisosVistos));
    if (H.pref("silenciar")) return;
    H.mostrarAlarma(due);
  };
  H.mostrarAlarma = function (lista) {
    var c = H.$("#alarmas"); if (!c) return;
    var a = lista[0], mas = lista.length > 1 ? " (+" + (lista.length - 1) + ")" : "";
    c.innerHTML = "<div class=\"alarma\" role=\"alertdialog\" aria-labelledby=\"alT\" aria-describedby=\"alX\"><h3 id=\"alT\">" + H.ico("bell-ring") + esc(a.Titulo + mas) + "</h3><p id=\"alX\">" + lista.map(function (x) { return esc(x.Texto); }).join("<br>") + "</p>" +
      "<div class=\"acciones\"><button class=\"bt\" data-act=\"alarmaCerrar\">Entendido</button>" + (a.Vista ? "<button class=\"bt pri\" data-act=\"alarmaIr\" data-vista=\"" + esc(a.Vista) + "\">Abrir</button>" : "") + "</div></div>";
    H.pitido(a.Tipo === "critico" ? 5 : 3);
    if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) { }
    if (document.hidden && window.Notification && Notification.permission === "granted" && navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) reg.showNotification(a.Titulo, { body: a.Texto, tag: "home-local-" + a.ID, icon: "icon-192.png", data: { vista: a.Vista } }); }).catch(function () { });
  };
  H.acc.alarmaCerrar = function () { H.$("#alarmas").innerHTML = ""; };
  H.acc.alarmaIr = function (el) { H.$("#alarmas").innerHTML = ""; H.irVista(el.getAttribute("data-vista")); };
  H.irVista = function (v) { var p = String(v || "inicio").split(":"); if (p[0] === "exp" && p[1]) H.ir("exp/" + encodeURIComponent(p[1]) + "/" + (p[2] || "resumen")); else H.ir(p[0] || "inicio"); };
  var ctxAudio = null;
  H.desbloquearAudio = function () { if (ctxAudio) return; try { var A = window.AudioContext || window.webkitAudioContext; if (A) { ctxAudio = new A(); } } catch (e) { } };
  H.pitido = function (n) {
    if (!ctxAudio || H.pref("sinSonido")) return; try {
      if (ctxAudio.state === "suspended") ctxAudio.resume();
      for (var i = 0; i < (n || 3); i++) { var o = ctxAudio.createOscillator(), g = ctxAudio.createGain(), t = ctxAudio.currentTime + i * 0.35; o.type = "sine"; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.connect(g); g.connect(ctxAudio.destination); o.start(t); o.stop(t + 0.3); }
    } catch (e) { }
  };
  // Mantener la pantalla encendida durante el recalentamiento
  var wake = null; H.pantallaEncendida = function (si) { try { if (si && !wake && navigator.wakeLock) navigator.wakeLock.request("screen").then(function (w) { wake = w; w.addEventListener("release", function () { wake = null; }); }).catch(function () { }); else if (!si && wake) { wake.release(); wake = null; } } catch (e) { } };

  // ---------------------------------------------------------------- service worker y notificaciones push
  H.registrarSW = function () {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").catch(function () { });
    navigator.serviceWorker.addEventListener("message", function (e) { if (e.data && e.data.ir) H.irVista(e.data.ir); });
  };
  function b64aU8(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function pushIdb(v) { return new Promise(function (ok) { try { var r = indexedDB.open("home-push", 1); r.onupgradeneeded = function () { r.result.createObjectStore("cfg"); }; r.onsuccess = function () { var tx = r.result.transaction("cfg", "readwrite"); if (v) tx.objectStore("cfg").put(v, "cfg"); else tx.objectStore("cfg").delete("cfg"); tx.oncomplete = function () { ok(true); }; }; r.onerror = function () { ok(false); }; } catch (e) { ok(false); } }); }
  H.pushSoportado = function () { return !S.demo && "serviceWorker" in navigator && "PushManager" in window && window.Notification && location.protocol === "https:"; };
  H.pushActivar = function () {
    if (!H.pushSoportado()) return Promise.reject(new Error(S.demo ? "Las notificaciones push no funcionan en modo demostración (las alarmas en pantalla sí)." : "Este navegador no admite notificaciones push. En iPhone, instala antes la web en la pantalla de inicio (Compartir → Añadir a pantalla de inicio)."));
    return Notification.requestPermission().then(function (p) {
      if (p !== "granted") throw new Error("Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para esta web.");
      return Promise.all([navigator.serviceWorker.ready, H.api("webPushClave")]);
    }).then(function (x) {
      return x[0].pushManager.getSubscription().then(function (s) { return s || x[0].pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64aU8(x[1].clave) }); });
    }).then(function (sub) { return H.api("webPushSuscribir", { endpoint: sub.endpoint, dispositivo: nombreDispositivo() }); })
      .then(function (r) { return pushIdb({ api: window.HOME_API, secreto: r.secreto }).then(function () { H.pref("pushActivo", true); return r; }); });
  };
  H.pushDesactivar = function (silencioso) {
    if (!("serviceWorker" in navigator)) return Promise.resolve();
    return navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return; var ep = sub.endpoint; return sub.unsubscribe().then(function () { if (S.token && !silencioso) return H.api("webPushBaja", ep).catch(function () { }); });
    }).then(function () { H.pref("pushActivo", false); return pushIdb(null); }).catch(function () { });
  };

  // ---------------------------------------------------------------- inicio de la app
  function iniciar() {
    leerPref(); aplicarTema();
    if (window.matchMedia) { var mq = window.matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", aplicarTema); }
    var ses = null; try { ses = JSON.parse(localStorage.getItem("home_sesion") || "null"); } catch (e) { }
    var q = location.search; if (/[?&]demo=1/.test(q) && (!ses || !ses.demo)) { H.entrarDemo((q.match(/rol=(\w+)/) || [0, "ADMIN"])[1].toUpperCase()); return; }
    if (ses && ses.token) { S.token = ses.token; S.usuario = ses.usuario; S.demo = !!ses.demo; if (S.demo) window.HOMEDemo.iniciar(); H.arrancar(); }
    else H.pantallaAcceso("email");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else setTimeout(iniciar, 0);
})();
