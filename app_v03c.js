/* HOME v0.3 (C) · perfusión: registro guiado, pantalla de inicio con gráficos, horario circadiano visual, balance y extracción de la HDF, fotos del injerto, sangre extraída. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc, ico = H.ico;
  var NOMBRE_M = { ART: "Arterial", POR: "Portal", CAV: "Cava", PERF: "Perfusato", FLUJO: "Flujos", BILIS: "Bilis", HDF: "HDF", INMUNO: "Inmunología" };
  function tH(m) { var a = C.num(m.T_real_h); return a !== null ? a : (C.num(m.T_nominal_h) || 0); }
  function cfgH() { return S.cfg.hdf || C.DEF.hdf; }
  function circ(e) { return !/no circadiano/i.test((e && e.Protocolo) || ""); }

  // ============================================================== minigráfico de tendencia (SVG en línea)
  H.serieDe = function (exp, muestra, v, n) { return H.med(exp).filter(function (m) { return m.Muestra === muestra && m.Variable === v && C.num(m.Valor) !== null; }).sort(function (a, b) { return tH(a) - tH(b); }).slice(-(n || 16)).map(function (m) { return { t: tH(m), v: C.num(m.Valor) }; }); };
  H.spark = function (pts, ob) {
    if (!pts || pts.length < 2) return "";
    var W = 150, Hh = 34, xs = pts.map(function (p) { return p.t; }), ys = pts.map(function (p) { return p.v; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys); if (ob) { if (ob[0] !== null) lo = Math.min(lo, ob[0]); if (ob[1] !== null) hi = Math.max(hi, ob[1]); } if (hi === lo) { hi += 1; lo -= 1; }
    var X = function (t) { return x1 === x0 ? W / 2 : 3 + (t - x0) / (x1 - x0) * (W - 6); }, Y = function (v) { return Hh - 3 - (v - lo) / (hi - lo) * (Hh - 6); };
    var banda = ob && ob[0] !== null && ob[1] !== null ? '<rect class="sp-banda" x="0" width="' + W + '" y="' + Y(ob[1]).toFixed(1) + '" height="' + Math.max(1, Y(ob[0]) - Y(ob[1])).toFixed(1) + '"/>' : "";
    var u = pts[pts.length - 1], fuera = ob ? C.enRango(u.v, ob) : 0;
    return '<svg class="spark" viewBox="0 0 ' + W + " " + Hh + '" preserveAspectRatio="none" aria-hidden="true">' + banda + '<polyline class="sp-linea" points="' + pts.map(function (p) { return X(p.t).toFixed(1) + "," + Y(p.v).toFixed(1); }).join(" ") + '"/><circle class="sp-punto' + (fuera ? " fuera" : "") + '" cx="' + X(u.t).toFixed(1) + '" cy="' + Y(u.v).toFixed(1) + '" r="3"/></svg>';
  };

  // ============================================================== horario circadiano en 24 h (08:00 → 08:00)
  H.circadianoSVG = function (c, ahora) {
    c = c || S.cfg.circadiano; var lineas = c.lineas.filter(function (l) { return c.cambios.some(function (x) { return x.linea === l; }); });
    var LBL = 172, PW = 720, RH = 30, TOP = 22, W = LBL + PW + 8, Hh = TOP + lineas.length * RH + 6, ini = 8 * 60;
    function xMin(m) { return LBL + (((m - ini) % 1440 + 1440) % 1440) / 1440 * PW; }
    var out = '<rect class="ci-noche" x="' + (LBL + PW / 2) + '" y="' + TOP + '" width="' + (PW / 2) + '" height="' + (lineas.length * RH) + '"/>';
    for (var h = 0; h <= 24; h += 2) { var x = LBL + h / 24 * PW, hr = (8 + h) % 24; out += '<line class="ci-grid" x1="' + x + '" x2="' + x + '" y1="' + TOP + '" y2="' + (TOP + lineas.length * RH) + '"/><text class="ci-hora" x="' + x + '" y="14" text-anchor="middle">' + (hr < 10 ? "0" : "") + hr + "</text>"; }
    lineas.forEach(function (l, i) {
      var ev = c.cambios.filter(function (x) { return x.linea === l; }).slice().sort(function (a, b) { return ((C.hm(a.h) - ini + 1440) % 1440) - ((C.hm(b.h) - ini + 1440) % 1440); });
      var max = Math.max.apply(null, ev.map(function (x) { return C.num(x.valor) || 0; }).concat([1e-9])), minPos = Math.min.apply(null, ev.map(function (x) { return C.num(x.valor) || 0; }).filter(function (v) { return v > 0; }).concat([1e9])), y0 = TOP + i * RH, primero = (C.hm(ev[0].h) - ini + 1440) % 1440;
      var segs = ev.map(function (x, j) { var a = (C.hm(x.h) - ini + 1440) % 1440, b = j + 1 < ev.length ? (C.hm(ev[j + 1].h) - ini + 1440) % 1440 : 1440; return { a: a, b: b, v: C.num(x.valor) || 0 }; });
      if (primero > 0) segs.unshift({ a: 0, b: primero, v: C.num(ev[ev.length - 1].valor) || 0 });   // arrastre desde la víspera
      out += '<text class="ci-linea" x="' + (LBL - 8) + '" y="' + (y0 + RH / 2 + 4) + '" text-anchor="end">' + esc(l === "HDF" ? "HDF (extracción)" : l) + '</text><line class="ci-base" x1="' + LBL + '" x2="' + (LBL + PW) + '" y1="' + (y0 + RH - 4) + '" y2="' + (y0 + RH - 4) + '"/>';
      segs.forEach(function (s) {
        if (!s.v || s.b <= s.a) return; var x = LBL + s.a / 1440 * PW, w = (s.b - s.a) / 1440 * PW, hh = 5 + (RH - 12) * s.v / max, y = y0 + RH - 4 - hh;
        out += '<rect class="ci-seg' + (l === "HDF" ? " hdf" : (s.b - s.a) <= 60 && (/bolo/i.test(l) || s.v >= 2 * minPos) ? " bolo" : "") + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(2, w - 1).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2"><title>' + esc(l + " · " + H.n(s.v, 1) + " mL/h") + "</title></rect>";
        if (w >= 26) out += '<text class="ci-val" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" text-anchor="middle">' + esc(H.n(s.v, 1)) + "</text>"; else out += '<text class="ci-val" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" text-anchor="middle">' + esc(H.n(s.v, 0)) + "</text>";
      });
    });
    if (ahora) { var xa = xMin(ahora.getHours() * 60 + ahora.getMinutes()); out += '<line class="ci-ahora" x1="' + xa.toFixed(1) + '" x2="' + xa.toFixed(1) + '" y1="16" y2="' + (Hh - 2) + '"/><text class="ci-ahora-t" x="' + Math.min(W - 30, xa + 4).toFixed(1) + '" y="' + (Hh - 3) + '">ahora ' + esc(H.hora(ahora)) + "</text>"; }
    return '<div class="circ-env"><svg class="circ-svg" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="Ritmos de infusión del protocolo circadiano a lo largo de 24 horas, en mL/h">' + out + "</svg></div>";
  };
  H.circadianoPanel = function (e) {
    var ahora = new Date(), inf = C.infusionA(S.cfg.circadiano, ahora, cfgH()), rv = C.ritmosVigentes(S.cfg.circadiano, ahora);
    return H.circadianoSVG(S.cfg.circadiano, ahora) + '<div class="fila-flex" style="margin-top:6px"><span class="chip pri">Infusión total ahora: ' + H.n(inf.mL_h, 1) + " mL/h</span>" +
      (rv.proxima_hora ? '<span class="chip">Próximo cambio a las ' + esc(rv.proxima_hora) + ": " + esc(rv.proximos.map(function (c) { return c.linea + " → " + H.n(c.valor, 1); }).join(" · ")) + "</span>" : "") +
      '<span class="muy-tenue">Barras = mL/h de cada línea · ámbar = bolo · zona sombreada = 20:00–08:00' + (S.cfg.circadiano.verificado ? "" : " · horario en borrador") + "</span></div>";
  };

  // ============================================================== balance de volumen y extracción de la HDF
  H.balanceExp = function (e) {
    var t0 = H.inicioPerf(e.ID); if (!t0) return null; var cfg = cfgH(), ahora = new Date(), med = H.med(e.ID), fd = H.form(e.ID, "hdf", "");
    var bilis = med.filter(function (m) { return m.Muestra === "BILIS" && m.Variable === "Volumen_mL" && C.num(m.Valor) !== null && m.Fecha_hora; }).map(function (m) { return { t: m.Fecha_hora, mL: C.num(m.Valor), punto: m.Punto }; });
    var vistos = {}, muestras = []; med.forEach(function (m) { if ((m.Muestra !== "PERF" && m.Muestra !== "ART") || !m.Fecha_hora || C.num(m.Valor) === null || vistos[m.Punto]) return; vistos[m.Punto] = 1; var ml = tH(m) <= 24 ? cfg.muestra_mL_dia1 : cfg.muestra_mL_despues; muestras.push({ t: m.Fecha_hora, mL: C.num(ml) || 0 }); });
    var ext = med.filter(function (m) { return m.Muestra === "HDF" && m.Variable === "Extraccion" && C.num(m.Valor) !== null && m.Fecha_hora; }).map(function (m) { return { t: m.Fecha_hora, mL_h: C.num(m.Valor) }; });
    if (C.num(fd.Extraccion) !== null && fd.inicio && !ext.some(function (x) { return C.aFecha(x.t) <= C.aFecha(fd.inicio); })) ext.push({ t: H.deLocal(fd.inicio) || fd.inicio, mL_h: C.num(fd.Extraccion) });
    var b = C.balanceHDF({ circ: circ(e) ? S.cfg.circadiano : { cambios: [], lineas: [] }, inicio: t0, ahora: ahora, bilis: bilis, muestras: muestras, extraccion: ext, cfg: cfg });
    var hz = C.num(cfg.horizonte_h) || 4, fin = new Date(ahora.getTime() + hz * 36e5);
    var ub = bilis.slice().sort(function (x, y) { return String(y.t).localeCompare(String(x.t)); })[0], prod = ub ? (H.derivadasBilis(e, { punto: ub.punto }) || {}).Produccion_mLh : null;
    var nM = C.puntosMuestreo(t0, S.cfg.general.dias_perfusion, S.cfg.muestreo).filter(function (p) { return p.fecha > ahora && p.fecha <= fin; }), mlM = nM.reduce(function (a, p) { return a + (C.num(p.t_h <= 24 ? cfg.muestra_mL_dia1 : cfg.muestra_mL_despues) || 0); }, 0);
    var infPrev = circ(e) ? C.volumenInfundido(S.cfg.circadiano, ahora, fin, cfg) : (C.num(cfg.otras_infusiones_mL_h) || 0) * hz;
    var rec = C.recomendarExtraccion({ balance_mL: b.balance_mL, infusion_mL: infPrev, bilis_mL: (prod || 0) * hz, muestras_mL: mlM, horizonte_h: hz, cfg: cfg });
    return { b: b, rec: rec, prod: prod, nMuestras: nM.length, mlMuestras: mlM, infPrev: infPrev, cfg: cfg, sinMuestra: cfg.muestra_mL_dia1 === null || cfg.muestra_mL_despues === null || cfg.muestra_mL_dia1 === undefined, conectada: ext.length > 0 };
  };
  H.hdfPanel = function (e, compacto) {
    var x = H.balanceExp(e); if (!x) return ""; var b = x.b, r = x.rec, puedo = H.puede("registrar"), act = b.extraccion_actual;
    function k(et, v, u, cls) { return '<div class="kpi ' + (cls || "") + '"><div class="et">' + et + '</div><div class="v">' + v + "<small>" + u + "</small></div></div>"; }
    var dif = act === null ? null : r.redondeada_mL_h - act, clsBal = Math.abs(b.balance_mL) <= 50 ? "ok" : Math.abs(b.balance_mL) <= 150 ? "aj" : "al";
    var reparto = r.alto_mL_h > r.bajo_mL_h && r.min_alto > 0 && r.min_bajo > 0 ? "Para ajustarlo exactamente con pasos de " + H.n(x.cfg.paso_mL_h, 0) + ": <b>" + C.duracionTxt(r.min_alto) + " a " + H.n(r.alto_mL_h, 0) + " mL/h</b> y <b>" + C.duracionTxt(r.min_bajo) + " a " + H.n(r.bajo_mL_h, 0) + " mL/h</b>." : "";
    var html = '<section class="tarjeta hdf-panel"><div class="cabecera"><h3>Balance de volumen y extracción de la HDF</h3><span class="muy-tenue">desde el inicio de la perfusión (' + H.n(b.horas, 1) + " h)</span></div>" +
      '<div class="kpis">' + k("Infundido", H.n(b.infundido_mL, 0), "mL") + k("Bilis", "−" + H.n(b.bilis_mL, 0), "mL") + k("Muestras", "−" + H.n(b.muestras_mL, 0), "mL") + k("Extraído por la HDF", "−" + H.n(b.extraido_mL, 0), "mL") + k("Balance", (b.balance_mL > 0 ? "+" : "") + H.n(b.balance_mL, 0), "mL", clsBal) + "</div>" +
      '<div class="rec ' + (dif === null || Math.abs(dif) >= x.cfg.paso_mL_h ? "ajuste" : "ok") + '" style="margin-top:10px">' + ico("sliders-horizontal", "s") + "<div><b>Extracción recomendada para las próximas " + H.n(r.horizonte_h, 0) + " h: " + H.n(r.redondeada_mL_h, 0) + " mL/h</b>" + (act !== null ? " (ahora está en " + H.n(act, 0) + " mL/h)" : " (aún no hay ninguna extracción registrada)") +
      ". Valor exacto " + H.n(r.exacta_mL_h, 1) + " mL/h = (balance " + H.n(b.balance_mL, 0) + " + infusiones previstas " + H.n(x.infPrev, 0) + " − bilis prevista " + H.n((x.prod || 0) * r.horizonte_h, 0) + " − muestras " + H.n(x.mlMuestras, 0) + ") mL ÷ " + H.n(r.horizonte_h, 0) + " h. " + reparto +
      (r.limitada ? " El balance es negativo o supera el máximo de la máquina: revisa las infusiones." : "") + "</div></div>" +
      (x.sinMuestra ? '<p class="muy-tenue" style="margin-top:6px">' + ico("info", "s") + " El volumen que se saca en cada muestra aún no está indicado, así que las muestras no se descuentan. " + (H.esAdmin() ? '<a href="#/config/hdf">Indicarlo en Configuración → HDF</a>.' : "Lo indica un administrador en Configuración → HDF.") + "</p>" : "") +
      (x.prod === null || x.prod === undefined ? '<p class="muy-tenue">Sin producción de bilis registrada todavía: la bilis prevista cuenta como 0.</p>' : '<p class="muy-tenue">Bilis prevista con la última producción medida: ' + H.n(x.prod, 1) + " mL/h.</p>");
    if (puedo && !compacto) html += '<div class="fila-flex" style="margin-top:8px"><label class="et" for="hdfNueva" style="margin:0">Extracción que programo ahora (mL/h)</label><input id="hdfNueva" style="width:100px" inputmode="numeric" data-num="1" value="' + H.n(r.redondeada_mL_h, 0) + '"><button class="bt pri" data-act="hdfRegistrar" data-exp="' + esc(e.ID) + '">' + ico("save") + "Registrar el cambio</button></div>";
    return html + "</section>";
  };
  H.acc.hdfRegistrar = function (el) {
    var exp = el.getAttribute("data-exp"), n = C.num(H.$("#hdfNueva").value), paso = cfgH().paso_mL_h || 10;
    if (n === null || n < 0) { H.toast("Indica la extracción en mL/h.", "error"); return; }
    if (Math.abs(n / paso - Math.round(n / paso)) > 1e-9) { H.toast("La máquina solo admite pasos de " + paso + " mL/h.", "error"); return; }
    var pa = H.puntoAhora(exp), ant = (H.balanceExp(H.exp(exp)) || { b: {} }).b.extraccion_actual;
    H.guardarMediciones(exp, "HDF", pa.punto, pa.t_h, pa.fecha, { Extraccion: n }, { sinRepintar: true });
    H.guardar("Eventos", [{ ID: H.uid(), Experimento: exp, Tipo: "ajuste", Fecha_hora: pa.fecha, Nota: "Extracción de la HDF: " + (ant === null || ant === undefined ? "—" : H.n(ant, 0)) + " → " + H.n(n, 0) + " mL/h" }]);
    H.toast("Extracción registrada: " + H.n(n, 0) + " mL/h.");
  };

  // ============================================================== FOTOS DEL INJERTO
  function fotos(exp) { return H.filas("Fotos").filter(function (f) { return f.Experimento === exp; }).sort(function (a, b) { return String(b.Fecha_hora).localeCompare(String(a.Fecha_hora)); }); }
  H.fotoDeHoy = function (exp) { var h = C.diaISO(new Date()); return fotos(exp).filter(function (f) { var d = C.aFecha(f.Fecha_hora); return d && C.diaISO(d) === h; })[0] || null; };
  function leerImagen(file) {
    return new Promise(function (ok, ko) {
      var fr = new FileReader(); fr.onerror = function () { ko(new Error("No se ha podido leer la imagen.")); };
      fr.onload = function () {
        var url = String(fr.result), hecho = false;
        function crudo() { if (hecho) return; hecho = true; if (file.size > 3.8e6) { ko(new Error("La imagen es demasiado grande y este navegador no puede reducirla.")); return; } ok({ mime: file.type || "image/jpeg", base64: url.slice(url.indexOf(",") + 1), mini: "", ancho: null, alto: null }); }
        var img = new Image(), t = setTimeout(crudo, 2500);
        img.onerror = function () { clearTimeout(t); crudo(); };
        img.onload = function () {
          clearTimeout(t); if (hecho) return;
          try {
            var esc2 = function (max, q) { var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); var ctx = c.getContext("2d"); if (!ctx) throw new Error("sin canvas"); ctx.drawImage(img, 0, 0, c.width, c.height); return { url: c.toDataURL("image/jpeg", q), w: c.width, h: c.height }; };
            var g = esc2(1600, 0.82), m = esc2(220, 0.6); hecho = true; ok({ mime: "image/jpeg", base64: g.url.slice(g.url.indexOf(",") + 1), mini: m.url.length < 15000 ? m.url : "", ancho: g.w, alto: g.h });
          } catch (e) { crudo(); }
        };
        img.src = url;
      };
      fr.readAsDataURL(file);
    });
  }
  H.fotoSubir = function (exp, file, nota) {
    if (!file) return Promise.reject(new Error("Elige una imagen."));
    if (!/^image\//.test(file.type || "")) return Promise.reject(new Error("El archivo no es una imagen."));
    var t0 = H.inicioPerf(exp), ahora = new Date().toISOString();
    return leerImagen(file).then(function (im) {
      var f = { ID: exp + "|foto|" + H.uid(), Experimento: exp, Fecha_hora: ahora, T_real_h: t0 ? C.r(C.horasEntre(t0, ahora), 2) : null, Tipo: "injerto", Nota: nota || "", Nombre: "HOME_" + exp + "_" + ahora.slice(0, 16).replace(/[:T]/g, "-") + ".jpg", mime: im.mime, base64: im.base64, Miniatura: im.mini, Ancho: im.ancho, Alto: im.alto };
      return H.api("webFotoSubir", f).then(function (r) { var fila = (r && r.fila) || f; delete fila.base64; H.upsertLocal("Fotos", [fila]); H.guardarCache(); return fila; });
    });
  };
  function bloqueFoto(e, compacto) {
    var hoy = H.fotoDeHoy(e.ID), puedo = H.puede("registrar"), id = esc(e.ID);
    var sube = puedo ? '<label class="bt ' + (hoy ? "" : "pri") + '" for="fotoIn_' + id + '">' + ico("camera") + (hoy ? "Añadir otra foto" : "Hacer o elegir la foto de hoy") + '</label><input class="sr" id="fotoIn_' + id + '" type="file" accept="image/*" capture="environment" data-cambio="fotoElegida" data-exp="' + id + '">' : "";
    return '<div class="foto-hoy">' + (hoy ? miniatura(hoy, true) + '<div><span class="chip ok">Foto de hoy hecha</span><div class="muy-tenue">' + esc(H.hora(hoy.Fecha_hora)) + (hoy.Nota ? " · " + esc(hoy.Nota) : "") + "</div></div>" : '<div class="foto-falta">' + ico("camera", "l") + '</div><div><span class="chip aj">Falta la foto de hoy</span><div class="muy-tenue">Una foto del injerto al día.</div></div>') +
      '<div class="fila-flex">' + sube + (compacto ? '<a class="bt texto" href="#/exp/' + encodeURIComponent(e.ID) + '/seguimiento/fotos">Ver todas</a>' : "") + "</div></div>";
  }
  function miniatura(f, peq) { return '<button class="foto-mini' + (peq ? " peq" : "") + (H.pendiente(f) ? " pend" : "") + '" data-act="fotoVer" data-id="' + esc(f.ID) + '" aria-label="Ver la foto del ' + esc(H.fechaHora(f.Fecha_hora)) + '">' + (f.Miniatura ? '<img src="' + esc(f.Miniatura) + '" alt="" loading="lazy">' : ico("image", "l")) + "</button>"; }
  H.acc.fotoElegida = function (el) {
    var f = el.files && el.files[0], exp = el.getAttribute("data-exp"); if (!f) return;
    H.toast("Subiendo la foto…");
    H.fotoSubir(exp, f, "").then(function () { H.toast("Foto guardada" + (H.requiereValidacion("Fotos") ? " (pendiente de validación)." : ".")); H.repintar(); }).catch(function (e) { H.toast(e.message || "No se ha podido subir la foto. Hace falta conexión.", "error"); });
  };
  H.acc.fotoVer = function (el) {
    var f = H.fila("Fotos", el.getAttribute("data-id")); if (!f) return; var puedo = H.puede("registrar");
    H.modal({ titulo: "Foto del injerto · " + H.fechaHora(f.Fecha_hora), ancho: true, cuerpo: '<div class="foto-grande" id="fotoG">' + (f.Miniatura ? '<img src="' + esc(f.Miniatura) + '" alt="Foto del injerto (vista previa)">' : "") + '<p class="tenue">Cargando la imagen…</p></div>' +
      '<p class="muy-tenue">' + esc(f.Experimento) + (C.num(f.T_real_h) !== null ? " · " + H.n(f.T_real_h, 1) + " h de perfusión" : "") + " · subida por " + esc(f.Creado_por || "") + (H.pendiente(f) ? ' · <span class="chip aj">Pendiente de validación</span>' : "") + "</p>" +
      '<div class="campo"><label class="et" for="fotoNota">Nota</label><input id="fotoNota" autocomplete="off" value="' + esc(f.Nota || "") + '"' + (puedo ? "" : " disabled") + ' placeholder="Color, consistencia, zonas mal perfundidas…"></div>',
      pie: (puedo ? '<button class="bt peligro" id="fotoDel">' + ico("trash-2") + "Borrar</button>" : "") + '<span class="empuja"></span><button class="bt" data-cerrar>Cerrar</button>' + (puedo ? '<button class="bt pri" id="fotoOk">Guardar la nota</button>' : ""),
      alAbrir: function (d) {
        H.api("webFoto", f.ID).then(function (r) { var c = d.querySelector("#fotoG"); if (c && r && r.base64) c.innerHTML = '<img src="data:' + esc(r.mime || "image/jpeg") + ";base64," + r.base64 + '" alt="Foto del injerto">'; })
          .catch(function (e) { var c = d.querySelector("#fotoG p"); if (c) c.textContent = e.message || "No se ha podido cargar la imagen (hace falta conexión)."; });
        if (!puedo) return;
        d.querySelector("#fotoOk").addEventListener("click", function () { H.guardar("Fotos", [{ ID: f.ID, Nota: d.querySelector("#fotoNota").value.trim() }]); d.close(); });
        d.querySelector("#fotoDel").addEventListener("click", function () { d.close(); H.confirmar("Borrar la foto", "La foto dejará de verse en la app.", "Borrar", true).then(function (ok) { if (ok) H.borrar("Fotos", [f.ID]); }); });
      } });
  };
  H.segExtra = H.segExtra || {};
  H.segExtra.fotos = function (e) {
    var l = fotos(e.ID), dias = {}; l.forEach(function (f) { var d = C.aFecha(f.Fecha_hora), k = d ? C.diaISO(d) : "—"; (dias[k] = dias[k] || []).push(f); });
    return '<section class="tarjeta"><div class="cabecera"><h3>Foto diaria del injerto</h3></div>' + bloqueFoto(e, false) + "</section>" +
      (l.length ? Object.keys(dias).sort().reverse().map(function (k) { var t0 = H.inicioPerf(e.ID), dia = t0 && k !== "—" ? C.diasEntre(t0, k) + 1 : null; return '<h3 class="sub">' + esc(H.fechaDMA(k)) + (dia ? " · día " + dia + " de perfusión" : "") + '</h3><div class="foto-rejilla">' + dias[k].map(function (f) { return '<figure class="foto-fig">' + miniatura(f) + "<figcaption>" + esc(H.hora(f.Fecha_hora)) + (f.Nota ? " · " + esc(f.Nota) : "") + "</figcaption></figure>"; }).join("") + "</div>"; }).join("") : '<div class="vacio">' + ico("camera", "l") + "<p>Aún no hay fotos de este experimento.</p></div>");
  };

  // ============================================================== REGISTRO GUIADO (un punto de muestreo, por bloques)
  var REG = { exp: null, punto: null };
  function puntosReg(e) {
    var plan = H.puntosPlan(e.ID, "PERF"), t0 = H.inicioPerf(e.ID), ahoraH = t0 ? C.horasEntre(t0, new Date()) : null, out = plan.slice();
    H.columnas(e.ID, "PERF", true).concat(H.columnas(e.ID, "ART", true)).forEach(function (c) { if (!out.some(function (p) { return p.punto === c.punto; })) out.push({ punto: c.punto, t_h: c.t_h, fecha: c.fechaReal || c.fecha }); });
    var pa = H.puntoAhora(e.ID), cerca = ahoraH === null ? plan[0] : plan.filter(function (p) { return Math.abs(p.t_h - ahoraH) <= 0.75; })[0];
    if (pa && !cerca) out.push({ punto: pa.punto, t_h: pa.t_h, fecha: pa.fecha, ahora: true });
    out.sort(function (a, b) { return (a.t_h === null ? -1 : a.t_h) - (b.t_h === null ? -1 : b.t_h); });
    return { lista: out, defecto: cerca ? cerca.punto : pa ? pa.punto : (plan[0] || {}).punto };
  }
  function inputReg(e, m, v, p, puedo) {
    var x = H.valor(e.ID, m, p.punto, v.id), val = x ? (C.num(x.Valor) !== null ? H.aVista(v.id, x.Valor) : x.Texto) : "", cl = (x ? H.claseValor(m, v.id, x.Valor) : "") + (x && H.pendiente(x) ? " pend" : "");
    return '<input class="' + cl + '" inputmode="decimal" autocomplete="off" aria-label="' + esc(v.nombre + " " + (NOMBRE_M[m] || m)) + '" value="' + esc(String(val).replace(".", ",")) + '"' + (puedo ? "" : " readonly") + ' data-cambio="regVal" data-exp="' + esc(e.ID) + '" data-m="' + m + '" data-p="' + esc(p.punto) + '" data-t="' + (p.t_h === null || p.t_h === undefined ? "" : p.t_h) + '" data-f="' + esc(p.fechaDato || "") + '" data-v="' + v.id + '">';
  }
  function pista(e, m, v, p) {
    var ob = H.objetivo(m, v.id), ant = H.med(e.ID).filter(function (x) { return x.Muestra === m && x.Variable === v.id && C.num(x.Valor) !== null && x.Punto !== p.punto && (p.t_h === null || tH(x) < p.t_h); }).sort(function (a, b) { return tH(b) - tH(a); })[0];
    return '<span class="pista">' + (ob ? "obj. " + H.n(H.aVista(v.id, ob[0]), 2) + "–" + H.n(H.aVista(v.id, ob[1]), 2) : "") + (ob && ant ? " · " : "") + (ant ? "ant. " + H.n(H.aVista(v.id, ant.Valor), v.dec !== undefined ? v.dec : 1) : "") + "</span>";
  }
  function hechos(e, m, p, vars) { return vars.filter(function (v) { return !!H.valor(e.ID, m, p.punto, v.id); }).length; }
  function bloque(id, icono, titulo, n, tot, cuerpo, abierto) {
    return '<details class="reg-bloque" id="reg_' + id + '"' + (abierto ? " open" : "") + "><summary>" + ico(icono) + "<b>" + titulo + '</b><span class="reg-prog ' + (n >= tot && tot ? "ok" : n ? "aj" : "") + '" data-prog="' + id + '">' + n + " / " + tot + '</span></summary><div class="dentro">' + cuerpo + "</div></details>";
  }
  function campos(e, m, vars, p, puedo) {
    var grupo = null, h = "";
    vars.forEach(function (v) { if (v.calculada) return; if (v.grupo && v.grupo !== grupo) { grupo = v.grupo; h += '<h4 class="reg-grupo">' + esc(grupo) + "</h4>"; }
      h += '<div class="reg-campo"><label>' + esc(v.nombre) + ' <span class="u">' + esc(H.unidadVisible(v.id, v.unidad)) + "</span></label>" + inputReg(e, m, v, p, puedo) + pista(e, m, v, p) + "</div>"; });
    return '<div class="reg-rejilla">' + h + "</div>";
  }
  H.segExtra.registrar = function (e, sub, q) {
    var t0 = H.inicioPerf(e.ID), puedo = H.puede("registrar"); if (!t0) return '<div class="vacio">' + ico("activity", "l") + "<p>El registro guiado se activa al iniciar la perfusión.</p></div>";
    var P = puntosReg(e); if (REG.exp !== e.ID || !P.lista.some(function (x) { return x.punto === REG.punto; })) { REG.exp = e.ID; REG.punto = q.p && P.lista.some(function (x) { return x.punto === q.p; }) ? q.p : P.defecto; }
    var p = H.copia(P.lista.filter(function (x) { return x.punto === REG.punto; })[0] || P.lista[0]);
    var ya = H.med(e.ID).filter(function (x) { return x.Punto === p.punto && x.Fecha_hora && /^(ART|PERF|FLUJO|BILIS)$/.test(x.Muestra); })[0]; p.fechaDato = ya ? ya.Fecha_hora : "";
    var gv = C.MUESTRAS.ART.vars, fv = C.MUESTRAS.FLUJO.vars, bv = C.MUESTRAS.BILIS.vars.filter(function (v) { return !v.calculada; }), pv = C.MUESTRAS.PERF.vars, hv = C.MUESTRAS.HDF.vars;
    var nG = hechos(e, "ART", p, gv) + hechos(e, "POR", p, gv) + hechos(e, "CAV", p, gv), nF = hechos(e, "FLUJO", p, fv), nB = hechos(e, "BILIS", p, bv), nP = hechos(e, "PERF", p, pv), nH = hechos(e, "HDF", p, hv);
    var gas = '<div class="tabla-env"><table class="t reg-gas"><thead><tr><th>Variable</th><th>Arterial</th><th>Portal</th><th>Cava</th></tr></thead><tbody>' + gv.map(function (v) {
      var ob = H.objetivo("ART", v.id); return "<tr><th scope=\"row\">" + esc(v.nombre) + ' <span class="u">' + esc(H.unidadVisible(v.id, v.unidad)) + "</span>" + (ob ? '<span class="pista">art. ' + H.n(H.aVista(v.id, ob[0]), 2) + "–" + H.n(H.aVista(v.id, ob[1]), 2) + "</span>" : "") + "</th>" + ["ART", "POR", "CAV"].map(function (m) { return "<td>" + inputReg(e, m, v, p, puedo) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" +
      '<div id="regRecs">' + recsReg(e, p) + '</div><p class="muy-tenue">Para probar cambios de FiO₂ o de aire antes de guardarlos usa el <a href="#/exp/' + encodeURIComponent(e.ID) + '/seguimiento/gas">asesor de mezcladores</a>.</p>';
    var dfl = H.derivadasFlujo(e, p.punto) || {}, flu = campos(e, "FLUJO", fv, p, puedo) + '<div class="fila-flex" id="regDeriv" style="margin-top:8px">' + derivChips(dfl) + "</div>";
    var db = H.valor(e.ID, "BILIS", p.punto, "Volumen_mL") ? H.derivadasBilis(e, p) : {}, bil = campos(e, "BILIS", bv, p, puedo) + (db.Produccion_mLh !== undefined ? '<div class="fila-flex" style="margin-top:8px"><span class="chip pri">Producción: ' + H.n(db.Produccion_mLh, 1) + " mL/h" + (db.Bilis_mLh_100g ? " · " + H.n(db.Bilis_mLh_100g, 2) + " mL/h/100 g" : "") + "</span></div>" : '<p class="muy-tenue">El volumen es lo recogido desde la medición anterior; con él se calcula la producción (mL/h) y se ajusta la extracción de la HDF.</p>');
    var opts = P.lista.map(function (x) { var n = H.med(e.ID).filter(function (m) { return m.Punto === x.punto; }).length; return '<option value="' + esc(x.punto) + '"' + (x.punto === p.punto ? " selected" : "") + ">" + esc(x.punto + (x.ahora ? " (ahora, fuera de protocolo)" : "") + (x.fecha ? " · " + H.diaCorto(x.fecha) + " " + H.hora(x.fecha) : "") + (n ? " · " + n + " datos" : "")) + "</option>"; }).join("");
    return '<section class="tarjeta reg-cab"><div class="fila-flex sep"><div class="campo" style="margin:0;min-width:260px"><label class="et" for="regPunto">Punto de muestreo</label><select id="regPunto" data-cambio="regPunto">' + opts + "</select></div>" +
      '<div class="reg-resumen">' + [["Gasometrías", nG, gv.length * 3], ["Flujos", nF, fv.length], ["Bilis", nB, bv.length], ["Bioquímica", nP, pv.length], ["HDF", nH, hv.length]].map(function (x) { return '<span class="chip ' + (x[1] >= x[2] ? "ok" : x[1] ? "aj" : "") + '">' + x[0] + " " + x[1] + "/" + x[2] + "</span>"; }).join("") + (H.fotoDeHoy(e.ID) ? '<span class="chip ok">Foto</span>' : '<span class="chip aj">Falta la foto</span>') + "</div>" +
      '<div class="segmentado" aria-label="Unidad de gases"><button class="' + (H.pref("kpa") ? "" : "activo") + '" data-act="unidadGas" data-v="mmHg">mmHg</button><button class="' + (H.pref("kpa") ? "activo" : "") + '" data-act="unidadGas" data-v="kPa">kPa</button></div></div>' +
      '<p class="muy-tenue" style="margin:8px 0 0">Cada valor se guarda al salir de la casilla. Rojo = fuera del objetivo; debajo de cada casilla, el objetivo y el valor anterior.' + (puedo ? "" : " Tu usuario es de solo lectura.") + "</p></section>" +
      bloque("gas", "wind", "1 · Gasometrías: arterial, portal y cava", nG, gv.length * 3, gas, nG < gv.length * 3) +
      bloque("flu", "gauge", "2 · Flujos, presiones, temperatura y mezcladores", nF, fv.length, flu, nG > 0 && nF < fv.length) +
      bloque("bil", "droplet", "3 · Bilis", nB, bv.length, bil, false) +
      bloque("bq", "flask-conical", "4 · Bioquímica del perfusato", nP, pv.length, campos(e, "PERF", pv, p, puedo), false) +
      bloque("hdf", "filter", "5 · Hemodiafiltración", nH, hv.length, H.hdfPanel(e) + campos(e, "HDF", hv, p, puedo), false) +
      bloque("foto", "camera", "6 · Foto diaria del injerto", H.fotoDeHoy(e.ID) ? 1 : 0, 1, bloqueFoto(e, true), false) +
      (circ(e) ? '<details class="reg-bloque"><summary>' + ico("clock") + "<b>Administración circadiana (24 h)</b></summary><div class=\"dentro\">" + H.circadianoPanel(e) + "</div></details>" : "");
  };
  function derivChips(d) { var o = []; if (d.Q_total !== undefined && d.Q_total !== null) o.push("Flujo total " + H.n(d.Q_total, 0) + " mL/min"); if (d.Q_100g) o.push(H.n(d.Q_100g, 0) + " mL/min/100 g"); if (d.VO2 !== undefined) o.push("VO₂ " + H.n(d.VO2, 2) + " mL/min" + (d.VO2_100g ? " (" + H.n(d.VO2_100g, 3) + "/100 g)" : "")); if (d.EO2 !== undefined) o.push("Extracción de O₂ " + H.n(d.EO2, 1) + " %"); return o.map(function (x) { return '<span class="chip pri">' + x + "</span>"; }).join(""); }
  function recsReg(e, p) {
    var V = H.Vperf(e.ID), out = ["ART", "POR"].map(function (r) {
      var g = {}; C.MUESTRAS[r].vars.forEach(function (v) { var x = H.valor(e.ID, r, p.punto, v.id); if (x && C.num(x.Valor) !== null) g[v.id] = C.num(x.Valor); });
      if (g.pH === undefined && g.pO2 === undefined && g.pCO2 === undefined) return "";
      var aj = {}; ["FiO2", "Barrido"].forEach(function (k) { var x = H.valor(e.ID, "FLUJO", p.punto, k + "_" + r) || H.ultimo(e.ID, "FLUJO", k + "_" + r); if (x) aj[k] = C.num(x.Valor); });
      var a = C.asesorGas(r, g, aj, S.cfg.objetivos, S.cfg.gases, { V_mL: V });
      return '<h4 class="reg-grupo">' + (r === "ART" ? "Rama arterial" : "Rama portal") + '</h4><div class="recs">' + a.recomendaciones.map(function (x) { return '<div class="rec ' + x.nivel + '">' + ico(x.nivel === "ok" ? "circle-check" : x.nivel === "alerta" ? "triangle-alert" : x.nivel === "ajuste" ? "sliders-horizontal" : "info", "s") + "<div>" + esc(x.texto) + "</div></div>"; }).join("") + "</div>";
    }).join("");
    return out;
  }
  H.acc.regPunto = function (el) { REG.punto = el.value; H.repintar(); };
  H.acc.regVal = function (el) {
    var exp = el.getAttribute("data-exp"), m = el.getAttribute("data-m"), p = el.getAttribute("data-p"), t = el.getAttribute("data-t"), f = el.getAttribute("data-f"), v = el.getAttribute("data-v");
    var raw = el.value.trim(), val = raw === "" ? "" : H.deVista(v, raw.replace(",", "."));
    if (raw !== "" && C.num(val) === null && !/^[<>]/.test(raw)) { el.classList.add("v-alto"); H.toast("«" + raw + "» no es un número. Usa coma o punto decimal (p. ej. 7,38).", "error"); return; }
    var o = {}; o[v] = C.num(val) !== null ? C.num(val) : raw;
    H.guardarMediciones(exp, m, p, t === "" ? null : Number(t), f || new Date().toISOString(), o);
    el.className = (raw === "" ? "" : H.claseValor(m, v, C.num(val))) + (H.requiereValidacion("Mediciones") && raw !== "" ? " pend" : "");
    var e = H.exp(exp), pp = { punto: p };
    if (/^(ART|POR|CAV)$/.test(m)) { var c = H.$("#regRecs"); if (c) c.innerHTML = recsReg(e, pp); }
    if (/^(ART|POR|CAV|FLUJO)$/.test(m)) { var d = H.$("#regDeriv"); if (d) d.innerHTML = derivChips(H.derivadasFlujo(e, p) || {}); }
    S.pendienteRepintar = /^(BILIS|HDF)$/.test(m);   // la bilis y la HDF cambian el balance: se repinta al salir del campo
  };

  // ============================================================== PANTALLA DE INICIO · perfusión en curso
  var GRUPOS = [["Función hepática", ["PERF:Lactato", "ART:pH", "PERF:Glucosa", "PERF:ActPT", "PERF:Amonio", "PERF:Albumina", "PERF:Fibrinogeno", "PERF:Urea", "BILIS:Volumen_mL", "PERF:HCO3", "PERF:BE"]],
    ["Daño hepatocelular y colestasis", ["PERF:ALT", "PERF:AST", "PERF:LDH", "PERF:BilT", "PERF:GGT", "PERF:FA", "PERF:K"]],
    ["Hemodinámica y oxígeno", ["FLUJO:Q_AH", "FLUJO:Q_VP", "FLUJO:P_AH", "FLUJO:P_VP", "FLUJO:Temp", "ART:pO2", "ART:pCO2", "POR:pO2", "CAV:sO2", "CAV:pO2"]]];
  function tarjetaKPI(e, k) {
    var p = String(k).split(":"), mu = p[0], v = p[1], def = C.variable(mu, v); if (!def) return "";
    var serie = H.serieDe(e.ID, mu, v, 16), u2 = H.ultimos2(e.ID, mu, v), u = u2[0], a = u2[1], dec = def.dec !== undefined ? def.dec : 1, nombre = def.nombre, unidad = H.unidadVisible(v, def.unidad), ob = H.objetivo(mu, v), valor = u ? C.num(u.Valor) : null, ant = a ? C.num(a.Valor) : null, punto = u ? u.Punto : "";
    if (k === "BILIS:Volumen_mL") {   // la bilis se muestra como producción (mL/h)
      var pts = H.med(e.ID).filter(function (m) { return m.Muestra === "BILIS" && m.Variable === "Volumen_mL" && C.num(m.Valor) !== null; }).sort(function (x, y) { return tH(x) - tH(y); }).map(function (m) { var d = H.derivadasBilis(e, { punto: m.Punto }); return d && d.Produccion_mLh !== undefined ? { t: tH(m), v: d.Produccion_mLh, punto: m.Punto } : null; }).filter(Boolean);
      nombre = "Producción de bilis"; unidad = "mL/h"; dec = 1; ob = null; serie = pts.slice(-16); valor = pts.length ? pts[pts.length - 1].v : null; ant = pts.length > 1 ? pts[pts.length - 2].v : null; punto = pts.length ? pts[pts.length - 1].punto : ""; a = pts.length > 1 ? { Punto: pts[pts.length - 2].punto } : null;
    }
    var e2 = valor === null || !ob ? null : C.enRango(valor, ob), cls = e2 === null ? "" : e2 === 0 ? "ok" : "al", tend = "";
    if (valor !== null && ant !== null) { var dv = valor - ant, fl = Math.abs(dv) < Math.pow(10, -dec) / 2 ? "=" : dv > 0 ? "↑" : "↓"; tend = '<div class="tend"><span class="flecha" aria-label="' + (fl === "↑" ? "sube" : fl === "↓" ? "baja" : "sin cambio") + '">' + fl + "</span> anterior " + esc(H.n(H.aVista(v, ant), dec)) + (a && a.Punto ? ' <span class="muy-tenue">· ' + esc(a.Punto) + "</span>" : "") + "</div>"; }
    else if (valor !== null) tend = '<div class="tend muy-tenue">Primer valor</div>';
    return '<div class="kpi ' + cls + '"><div class="et">' + esc(nombre) + (mu !== "PERF" && mu !== "BILIS" && mu !== "FLUJO" ? " · " + esc(NOMBRE_M[mu] || mu) : "") + (punto ? ' <span class="muy-tenue">· ' + esc(punto) + "</span>" : "") + '</div><div class="v">' + (valor !== null ? esc(H.n(H.aVista(v, valor), dec)) + "<small>" + esc(unidad) + "</small>" : "—") + "</div>" + H.spark(serie.map(function (x) { return { t: x.t, v: C.num(H.aVista(v, x.v)) }; }), ob ? [C.num(H.aVista(v, ob[0])), C.num(H.aVista(v, ob[1]))] : null) + tend + "</div>";
  }
  function vo2KPI(e) {
    var pts = {}; H.med(e.ID).forEach(function (m) { if (m.Muestra === "CAV" && m.Variable === "pO2") pts[m.Punto] = tH(m); });
    var serie = Object.keys(pts).map(function (p) { var d = H.derivadasFlujo(e, p); return d && d.VO2_100g ? { t: pts[p], v: d.VO2_100g, punto: p } : d && d.VO2 ? { t: pts[p], v: d.VO2, punto: p, abs: true } : null; }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    if (!serie.length) return ""; var u = serie[serie.length - 1], a = serie[serie.length - 2];
    return '<div class="kpi"><div class="et">Consumo de O₂' + (u.abs ? "" : " / 100 g") + ' <span class="muy-tenue">· ' + esc(u.punto) + '</span></div><div class="v">' + H.n(u.v, u.abs ? 2 : 3) + "<small>mL/min</small></div>" + H.spark(serie.slice(-16)) + (a ? '<div class="tend"><span class="flecha">' + (u.v > a.v ? "↑" : u.v < a.v ? "↓" : "=") + "</span> anterior " + H.n(a.v, u.abs ? 2 : 3) + ' <span class="muy-tenue">· ' + esc(a.punto) + "</span></div>" : '<div class="tend muy-tenue">Primer valor</div>') + "</div>";
  }
  H.tarjetaPerfusion = function (e) {
    var t0 = H.inicioPerf(e.ID), ev = H.eventos(e.ID), horas = t0 ? C.horasEntre(t0, new Date()) : null, prox = H.proximoPunto(e.ID), esCirc = circ(e), rv = C.ritmosVigentes(S.cfg.circadiano, new Date()), idq = encodeURIComponent(e.ID);
    var enRecal = t0 && !ev.fin_recalentamiento && (Date.now() - C.aFecha(t0).getTime()) / 6e4 < (S.cfg.recalentamiento.pasos.slice(-1)[0].t + S.cfg.recalentamiento.paso_min + 30);
    var al = H.alertasUltimoRegistro(e.ID), sel = (S.cfg.inicio || C.DEF.inicio).ultimos_valores || [], usados = {};
    var alHTML = '<details class="alertas ' + (al.length ? "hay" : "nada") + '"' + (al.length && al.length <= 6 ? " open" : "") + "><summary>" + ico(al.length ? "triangle-alert" : "circle-check") + (al.length ? "<b>" + al.length + " valor(es) fuera de rango</b> en el último registro" : "Sin valores fuera de rango en el último registro") + "</summary>" +
      (al.length ? "<ul>" + al.map(function (a) { return '<li><span class="chip ' + (a.dir < 0 ? "info" : "al") + '">' + (a.dir < 0 ? "↓ bajo" : "↑ alto") + "</span> <b>" + esc(a.nombre) + "</b> " + esc(NOMBRE_M[a.muestra] || a.muestra) + " · " + esc(a.punto) + ": <b>" + esc(H.n(H.aVista(a.variable, a.valor), 2)) + "</b> " + esc(H.unidadVisible(a.variable, a.unidad)) + ' <span class="muy-tenue">(objetivo ' + esc(H.n(H.aVista(a.variable, a.ob[0]), 2)) + "–" + esc(H.n(H.aVista(a.variable, a.ob[1]), 2)) + ")</span></li>"; }).join("") + "</ul>" +
        '<p class="muy-tenue" style="margin:6px 0 0">Rangos en <a href="#/config/objetivos">Configuración → Objetivos</a>; muestras vigiladas en <a href="#/config/inicio">Pantalla de inicio</a>.</p>' : "") + "</details>";
    var grupos = GRUPOS.map(function (g) { var ks = sel.filter(function (k) { return g[1].indexOf(k) !== -1; }); ks.forEach(function (k) { usados[k] = 1; }); var extra = g[0] === "Hemodinámica y oxígeno" ? vo2KPI(e) : ""; return ks.length || extra ? '<h3 class="sub">' + g[0] + '</h3><div class="kpis kpis-ini">' + ks.map(function (k) { return tarjetaKPI(e, k); }).join("") + extra + "</div>" : ""; }).join("");
    var otros = sel.filter(function (k) { return !usados[k]; }); if (otros.length) grupos += '<h3 class="sub">Otros valores</h3><div class="kpis kpis-ini">' + otros.map(function (k) { return tarjetaKPI(e, k); }).join("") + "</div>";
    var bx = H.balanceExp(e), hdf = bx ? '<h3 class="sub">Balance de volumen y HDF</h3><div class="kpis kpis-ini"><div class="kpi ' + (Math.abs(bx.b.balance_mL) <= 50 ? "ok" : Math.abs(bx.b.balance_mL) <= 150 ? "aj" : "al") + '"><div class="et">Balance desde el inicio</div><div class="v">' + (bx.b.balance_mL > 0 ? "+" : "") + H.n(bx.b.balance_mL, 0) + '<small>mL</small></div><div class="tend">infundido ' + H.n(bx.b.infundido_mL, 0) + " · bilis " + H.n(bx.b.bilis_mL, 0) + " · HDF " + H.n(bx.b.extraido_mL, 0) + "</div></div>" +
      '<div class="kpi"><div class="et">Extracción de la HDF ahora</div><div class="v">' + (bx.b.extraccion_actual !== null ? H.n(bx.b.extraccion_actual, 0) + "<small>mL/h</small>" : "—") + '</div><div class="tend">recomendada ' + H.n(bx.rec.redondeada_mL_h, 0) + " mL/h (exacta " + H.n(bx.rec.exacta_mL_h, 1) + ")</div></div>" +
      '<div class="kpi"><div class="et">Infusión total ahora</div><div class="v">' + H.n(C.infusionA(esCirc ? S.cfg.circadiano : { cambios: [], lineas: [] }, new Date(), cfgH()).mL_h, 1) + '<small>mL/h</small></div><div class="tend"><a href="#/exp/' + idq + '/seguimiento/hdf">Ajustar la extracción</a></div></div></div>' : "";
    return '<section class="tarjeta perf-curso" aria-label="Perfusión en curso ' + esc(e.ID) + '"><div class="cabecera"><h2><span class="punto-color" style="background:' + esc(H.colorExp(e.ID)) + '"></span> ' + esc(e.ID) + " · perfusión en curso</h2>" + H.estadoChip(e.Estado) +
      (H.puede("registrar") ? '<a class="bt pri" href="#/exp/' + idq + '/seguimiento/registrar">' + ico("clipboard-list") + "Registrar datos</a>" : "") + '<a class="bt" href="#/exp/' + idq + '/seguimiento/gas">' + ico("activity") + "Seguimiento</a>" + (enRecal ? '<a class="bt pri" href="#/exp/' + idq + '/quirofano">' + ico("thermometer") + "Recalentamiento</a>" : "") + "</div>" +
      '<div class="cronos"><div class="crono activo"><div class="et">Tiempo de perfusión · día ' + (horas !== null ? Math.floor(horas / 24) + 1 : "—") + '</div><div class="t" data-crono="' + esc(t0 || "") + '">--:--:--</div><div class="muy-tenue">Inicio ' + esc(H.fechaHora(t0)) + "</div></div>" +
      (prox ? '<div class="crono"><div class="et">Próxima muestra · ' + esc(prox.etiqueta) + '</div><div class="t cuenta-atras" style="font-size:30px" data-cuenta="' + prox.fecha.toISOString() + '">--:--</div><div class="muy-tenue">' + esc(H.diaCorto(prox.fecha) + " " + H.hora(prox.fecha)) + "</div></div>" : '<div class="crono"><div class="et">Próxima muestra</div><div class="t" style="font-size:18px">Sin muestras pendientes</div></div>') +
      (esCirc && rv.proxima_hora ? '<div class="crono"><div class="et">Próximo cambio de ritmo · ' + esc(rv.proxima_hora) + '</div><div class="t" style="font-size:15px;font-family:inherit;line-height:1.4">' + rv.proximos.map(function (c) { return esc(c.linea) + " → <b>" + H.n(c.valor, 1) + " " + esc(c.unidad) + "</b>"; }).join("<br>") + "</div></div>" : "") +
      '<div class="crono foto-crono"><div class="et">Foto diaria del injerto</div>' + bloqueFoto(e, true) + "</div></div>" +
      '<h3 class="sub">Alertas</h3>' + alHTML + grupos + hdf +
      (esCirc ? '<h3 class="sub">Administración circadiana · ahora (' + esc(H.hora(new Date())) + ")</h3>" + H.circadianoPanel(e) : "") + "</section>";
  };
  H.avisosInicioExtra = function () {
    var h = "", hoy = C.diaISO(new Date()), cfg = S.cfg.programacion || C.DEF.programacion;
    H.expProgramados().forEach(function (e) {
      var d = C.diasEntre(hoy, e.Fecha_cirugia); if (d === null || d < 0) return;
      if (H.esAdmin() && H.esProvisional(e) && d <= cfg.confirmar_dias_antes) h += '<div class="aviso aj">' + ico("calendar-days") + "<div><b>" + esc(e.ID) + " sigue con fecha provisional</b> y faltan " + d + " días (" + esc(H.fechaDMA(C.aDia(e.Fecha_cirugia))) + '). <a href="#/calendario">Confirmar o cambiar la fecha</a></div></div>';
      else if (H.participo(e) && !H.esAdmin()) h += '<div class="aviso info">' + ico("calendar-days") + "<div><b>Participas en " + esc(e.ID) + "</b>: hepatectomía y perfusión el " + esc(H.fechaDMA(C.aDia(e.Fecha_cirugia))) + " (" + (H.esProvisional(e) ? "fecha provisional" : "confirmada") + '). <a href="#/calendario">Ver el calendario</a></div></div>';
    });
    if (S.metodoAcceso === "codigo" && !S.demo && !H.pref("noSugerirAcceso")) h += '<div class="aviso info">' + ico("fingerprint") + '<div>Has entrado con el código del correo. Puedes activar <b>Face ID, huella o una contraseña</b> para entrar más rápido. <a href="#/cuenta">Activarlo en Mi cuenta</a> · <button class="bt texto mini" data-act="noSugerir">No volver a mostrar</button></div></div>';
    return h;
  };
  H.acc.noSugerir = function () { H.pref("noSugerirAcceso", true); H.repintar(); };

  // ============================================================== ficha del experimento: programación, dieta, sangre y basal
  H.progResumen = function (e) {
    var hs = C.hitosExperimento(e, S.cfg.programacion);
    return '<div class="campo" style="grid-column:1/-1"><span class="et">Programación</span><div class="fila-flex" style="padding-top:4px">' + (H.esProvisional(e) ? '<span class="chip aj">Fecha provisional</span>' : '<span class="chip ok">Confirmado</span>') + hs.map(function (h) { return '<span class="chip">' + esc(h.nombre) + ": <b>" + esc(H.fechaDMA(C.aDia(h.fecha))) + "</b></span>"; }).join("") + '<a class="bt mini" href="#/calendario?m=' + esc(String(e.Fecha_cirugia || "").slice(0, 7)) + '">' + ico("calendar-days", "s") + (H.esAdmin() ? "Cambiar en el calendario" : "Ver el calendario") + "</a></div></div>";
  };
  H.dietaInfo = function (e) {
    var cfg = S.cfg.dieta, pg = S.cfg.programacion || C.DEF.programacion, ll = e.Fecha_llegada || (e.Fecha_cirugia ? C.sumarDias(e.Fecha_cirugia, -pg.dias_llegada_antes) : ""), ac = ll ? C.diaAclimatacion(ll, C.diaISO(new Date()), cfg) : null, activo = ac && ac.dia >= 1 && e.Fecha_cirugia && C.diasEntre(C.diaISO(new Date()), e.Fecha_cirugia) >= 0;
    return '<div class="aviso info">' + ico("utensils") + "<div><b>Pauta:</b> el día de llegada los dos animales están juntos y <b>no se aplica el patrón de alimentación</b> (estrés); desde el día " + (cfg.dia_inicio_patron || 2) + " se separan y reciben " + (cfg.tomas || 2) + " tomas al día de <b>" + esc(cfg.nombre_pienso || "pienso") + "</b> (" + H.n(cfg.em_pienso_kcal_kg, 0) + " kcal EM/kg). Agua y juguetes de enriquecimiento siempre disponibles." +
      (activo ? " Hoy es el <b>día " + ac.dia + "</b> de aclimatación" + (ac.patron ? "." : ": todavía sin patrón.") : "") + " Los celadores registran las tomas con el código QR" + (H.esAdmin() ? ' (<a href="#/config/qr">ver e imprimir el QR</a>).' : ".") + "</div></div>";
  };
  H.sangreHTML = function (e) {
    var an = H.animales(e.ID), obj = C.num(S.cfg.general.volumen_sangre_mL) || 2200, vol = function (r) { var a = an[r]; if (!a) return null; var d = H.form(e.ID, "cirugia", a.ID); return C.num(H.leerRuta(d, "ext.volumen_mL")); };
    var ld = vol("LD"), bd = vol("BD"), tot = (ld || 0) + (bd || 0), falta = obj - tot;
    return '<div class="sangre"><div class="kpis"><div class="kpi"><div class="et">Sangre del donante de hígado</div><div class="v">' + (ld !== null ? H.n(ld, 0) : "—") + '<small>mL</small></div></div><div class="kpi"><div class="et">Sangre del donante de sangre</div><div class="v">' + (bd !== null ? H.n(bd, 0) : "—") + "<small>mL</small></div></div>" +
      '<div class="kpi ' + (ld === null && bd === null ? "" : falta <= 0 ? "ok" : "aj") + '"><div class="et">Total para la perfusión</div><div class="v">' + H.n(tot, 0) + "<small>/ " + H.n(obj, 0) + " mL</small></div></div></div>" +
      '<p class="muy-tenue" style="margin:6px 0 10px">La perfusión usa siempre ' + H.n(obj, 0) + " mL, extraídos con el sistema de HDF. " + (ld === null && bd === null ? "Anota el volumen real extraído de cada animal." : falta > 0 ? "<b>Faltan " + H.n(falta, 0) + " mL</b>: se completan con el donante de sangre." : bd ? "Se ha completado con el donante de sangre." : "No ha hecho falta el donante de sangre.") + "</p></div>";
  };
  H.basalHTML = function (e, d) {
    var m = H.med(e.ID).filter(function (x) { return x.Muestra === "BASAL_LD" && C.num(x.Valor) !== null; }), n = m.length, f = m.map(function (x) { return x.Fecha_hora; }).filter(Boolean).sort()[0], enlace = '<a class="bt mini" href="#/exp/' + encodeURIComponent(e.ID) + '/seguimiento/pre">' + ico("test-tube", "s") + (n ? "Ver la muestra basal" : "Registrar la muestra basal") + "</a>";
    var intub = H.leerRuta(d, "qx.intubacion"), ini = H.leerRuta(d, "qx.inicio"), aviso = "";
    if (n && f) { var hh = H.hora(f); if (intub && hh < intub) aviso = " La hora de la muestra (" + hh + ") es anterior a la intubación (" + intub + ")."; else if (ini && hh > ini) aviso = " La hora de la muestra (" + hh + ") es posterior al inicio de la cirugía (" + ini + ")."; }
    return '<div class="aviso ' + (n ? (aviso ? "aj" : "ok") : "aj") + '" style="margin-top:10px">' + ico(n && !aviso ? "circle-check" : "triangle-alert") + "<div><b>Muestra basal del donante de hígado:</b> " + (n ? n + " valores registrados" + (f ? " a las " + esc(H.hora(f)) : "") + "." + esc(aviso) : "pendiente.") + " Se saca con el animal ya intubado y <b>siempre antes de empezar la cirugía</b>; sirve de referencia para la perfusión. " + enlace + "</div></div>";
  };
})();
