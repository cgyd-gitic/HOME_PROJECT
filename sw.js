// HOME · service worker: app instalable, funcionamiento sin conexión (copia de la propia web) y notificaciones push.
// Las llamadas al servidor (Apps Script) nunca se guardan en caché. El aviso push llega vacío: el texto se pide
// al servidor con el código propio de este dispositivo (guardado en IndexedDB «home-push»).
var CACHE = "home-0.3.0";
var BASE = ["./", "index.html", "app.css", "config.js", "sprite.js", "calc.js", "demo.js", "app_core.js", "app_vistas.js", "app_exp.js", "app_exp2.js", "app_graf.js", "app_inv.js", "app_v02.js", "app_v03a.js", "app_v03b.js", "app_v03c.js", "lib/qrcode.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "fonts/roboto-latin-400-normal.woff2", "fonts/roboto-latin-500-normal.woff2", "fonts/roboto-latin-700-normal.woff2", "fonts/roboto-mono-latin-500-normal.woff2"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE).catch(function () { }); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf("home-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url); if (e.request.method !== "GET" || u.origin !== self.location.origin) return;   // el servidor de datos va siempre por la red
  if (/config\.js$/.test(u.pathname)) { e.respondWith(fetch(e.request).catch(function () { return caches.match(e.request); })); return; }
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(e.request, { ignoreSearch: true }).then(function (r) {
    var red = fetch(e.request).then(function (resp) { if (resp && resp.ok) c.put(e.request, resp.clone()); return resp; }).catch(function () { return r; });
    return r || red;
  }); }));
});
function leerCfg() { return new Promise(function (ok) { try { var rq = indexedDB.open("home-push", 1); rq.onupgradeneeded = function () { rq.result.createObjectStore("cfg"); }; rq.onsuccess = function () { try { var g = rq.result.transaction("cfg", "readonly").objectStore("cfg").get("cfg"); g.onsuccess = function () { ok(g.result || null); }; g.onerror = function () { ok(null); }; } catch (e) { ok(null); } }; rq.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); }
function pedirAvisos(cfg) {
  if (!cfg || !cfg.api || !cfg.secreto) return Promise.resolve([]);
  return fetch(cfg.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ fn: "webPushPendientes", args: [cfg.secreto] }), redirect: "follow" })
    .then(function (r) { return r.json(); }).then(function (j) { return (j && j.r) || []; }).catch(function () { return []; });
}
self.addEventListener("push", function (e) {
  e.waitUntil(leerCfg().then(pedirAvisos).then(function (lista) {
    if (!lista.length) lista = [{ id: "general", titulo: "HOME · perfusión", texto: "Tienes avisos nuevos. Abre la app para verlos.", vista: "inicio" }];
    return Promise.all(lista.map(function (a) { return self.registration.showNotification(a.titulo || "HOME", { body: a.texto || "", icon: "icon-192.png", badge: "icon-192.png", tag: "home-" + (a.id || "general"), renotify: true, requireInteraction: /recalent|critic|alerta/i.test(a.titulo || ""), vibrate: [300, 150, 300], data: { vista: a.vista || "inicio" } }); }));
  }));
});
function rutaDe(v) { var p = String(v || "inicio").split(":"); return p[0] === "exp" && p[1] ? "exp/" + encodeURIComponent(p[1]) + "/" + (p[2] || "resumen") : p[0]; }
self.addEventListener("notificationclick", function (e) {
  e.notification.close(); var vista = (e.notification.data && e.notification.data.vista) || "inicio", url = new URL("./#/" + rutaDe(vista), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) if (cs[i].url.indexOf(self.registration.scope) === 0 && "focus" in cs[i]) { cs[i].postMessage({ ir: vista }); return cs[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
