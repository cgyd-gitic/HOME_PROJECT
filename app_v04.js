/* HOME v0.4 · detalles de la interfaz: franja semanal (como en el calendario de referencia) y utilidades de diseño. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, S = H.S, esc = H.esc;
  var FASE_N = { llegada: "Llegada", aclimatacion: "Aclimatación", cirugia: "Hepatectomía y perfusión", perfusion: "Perfusión", trasplante: "Trasplante", seguimiento: "Seguimiento", sacrificio: "Sacrificio" };
  // Semana actual (lunes → domingo): día de hoy destacado y un punto por cada fase de experimento ese día
  H.semanaHTML = function () {
    var hoy = new Date(), lun = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7)), cfg = S.cfg.programacion || C.DEF.programacion;
    var exps = H.listaExp().filter(function (e) { return e.Estado !== "Cancelado" && e.Fecha_cirugia; }), dias = "";
    var mes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(hoy), DS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    for (var i = 0; i < 7; i++) {
      var d = new Date(lun.getFullYear(), lun.getMonth(), lun.getDate() + i), iso = C.diaISO(d), fases = [];
      exps.forEach(function (e) { var f = C.faseDia(e, iso, cfg); if (f) fases.push({ f: f, e: e }); });
      var tit = fases.map(function (x) { return x.e.ID + " · " + FASE_N[x.f]; }).join(" · ");
      dias += "<a class=\"d" + (iso === C.diaISO(hoy) ? " hoy" : "") + "\" href=\"#/calendario?m=" + iso.slice(0, 7) + "\"" + (tit ? " title=\"" + esc(tit) + "\"" : "") + "><span class=\"ds\">" + DS[i] + "</span><span class=\"dn\">" + d.getDate() + "</span><span class=\"pts\">" +
        fases.slice(0, 3).map(function (x) { return "<i class=\"f-" + x.f + (H.esProvisional && H.esProvisional(x.e) ? " prov" : "") + "\"></i>"; }).join("") + "</span><span class=\"sr\">" + esc(tit || "sin procedimientos") + "</span></a>";
    }
    return "<div class=\"semana-cab\"><span>" + esc(mes.charAt(0).toUpperCase() + mes.slice(1)) + "</span></div><div class=\"semana\" aria-label=\"Semana actual\">" + dias + "</div>";
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v04.js"] = "0.7.3";
