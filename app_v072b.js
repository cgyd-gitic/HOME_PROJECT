/* HOME · v0.7.2 (b): perfusiones anteriores (Programación «Histórico») — los tiempos de quirófano, desde el inicio de la exanguinación
   hasta el fin de la cirugía de banco, se escriben a mano con el lápiz, sin el cronómetro; se comprueba el orden cronológico y que no
   haya fechas futuras, y la isquemia caliente, la fría y la cirugía de banco se recalculan con los eventos guardados. */
(function () {
  "use strict";
  var C = window.HOMECalc, H = window.HOME, esc = H.esc, ico = H.ico;
  var MANUALES = ["inicio_exanguinacion", "parada_cardiaca", "inicio_preservacion_fria", "inicio_banco", "fin_banco"];
  function info(t) { return H.botonInfo ? H.botonInfo(t) : ""; }
  function manual(e) {
    var ev = H.eventos(e.ID), t = C.tiempos(ev), puedo = H.puede("registrar");
    var linea = '<ol class="linea-qx qx-manual">' + C.HITOS_QX.map(function (k) {
      var h = ev[k], edit = MANUALES.indexOf(k) !== -1;
      return '<li class="' + (h ? "hecho" : "") + '"><span class="pt"></span><span class="tx"><b>' + esc(C.NOMBRE_HITO[k]) + "</b>" + (h ? "<time>" + esc(H.diaCorto(h) + " " + H.horaS(h)) + "</time>" : '<span class="muy-tenue">sin registrar</span>') + "</span>" +
        (edit && puedo ? '<button class="bt ico-solo texto" data-act="qxManual" data-exp="' + esc(e.ID) + '" data-t="' + k + '" aria-label="Escribir la fecha y la hora de «' + esc(C.NOMBRE_HITO[k]) + '»" title="Editar">' + ico("pencil", "s") + "</button>" : "") + "</li>";
    }).join("") + "</ol>";
    var kpis = '<div class="kpis cuatro qx-tiempos">' + [["Isquemia caliente", t.isquemia_caliente_min], ["Exanguinación → parada", t.exanguinacion_a_parada_min], ["Isquemia fría", t.isquemia_fria_min], ["Cirugía de banco", t.cirugia_banco_min]].map(function (x) { return '<div class="kpi"><div class="et">' + esc(x[0]) + '</div><div class="v">' + esc(C.duracionTxt(x[1])) + "</div></div>"; }).join("") + "</div>";
    return '<section class="tarjeta qx-hist"><div class="cabecera"><h2>Tiempos de quirófano</h2>' + info("Perfusión anterior: escribe con el lápiz la fecha y la hora de cada paso, desde el inicio de la exanguinación hasta el fin de la cirugía de banco (no se usa el cronómetro). Cada hora debe quedar entre la del paso anterior y la del siguiente ya registrados, y no puede ser futura. La isquemia caliente, la fría y la cirugía de banco se recalculan al guardar. El inicio de la perfusión es el del registro de la perfusión anterior (Programación).") + "</div>" + kpis + linea + "</section>";
  }
  var qxPrev = H.tabsExp.quirofano;
  H.tabsExp.quirofano = function (e) {
    if (!(H.esHistorico && H.esHistorico(e))) return qxPrev.apply(this, arguments);
    var html = qxPrev.apply(this, arguments), i = html.indexOf("</section>");   // se sustituye la tarjeta del cronómetro; se mantiene el recalentamiento
    if (H.pantallaEncendida) H.pantallaEncendida(false);
    return manual(e) + (i === -1 ? "" : html.slice(i + 10));
  };
  H.acc.qxManual = function (el) {
    var exp = el.getAttribute("data-exp"), tipo = el.getAttribute("data-t"), e = H.exp(exp), ev = H.eventos(exp), nom = C.NOMBRE_HITO[tipo];
    if (!e || MANUALES.indexOf(tipo) === -1 || !H.puede("registrar")) return;
    var j = C.HITOS_QX.indexOf(tipo), ant = null; for (var a = j - 1; a >= 0 && !ant; a--) ant = ev[C.HITOS_QX[a]] || null;
    var v0 = ev[tipo] ? H.aLocal(ev[tipo]) : ant ? H.aLocal(ant) : e.Fecha_cirugia ? String(e.Fecha_cirugia).slice(0, 10) + "T08:00" : "";
    H.modal({ titulo: nom, cuerpo: '<div class="campo"><label class="et" for="qxmH">Fecha y hora</label><input id="qxmH" type="datetime-local" value="' + esc(v0) + '" max="' + esc(H.aLocal(new Date())) + '"><div class="ayuda">Perfusión anterior de ' + esc(exp) + ": hora escrita a mano.</div></div><div class=\"msg-error\" id=\"qxmErr\" role=\"alert\"></div>",
      pie: (ev[tipo] ? '<button class="bt peligro" id="qxmDel">' + ico("trash-2") + "Borrar</button>" : "") + '<span class="empuja"></span><button class="bt" data-cerrar>Cancelar</button><button class="bt pri" id="qxmOk">Guardar</button>',
      alAbrir: function (d) {
        d.querySelector("#qxmOk").addEventListener("click", function () {
          var iso = H.deLocal(d.querySelector("#qxmH").value), err = iso ? C.validarHitoQx(ev, tipo, iso, new Date()) : "Indica la fecha y la hora.";
          if (err) { d.querySelector("#qxmErr").textContent = err; return; }
          H.guardar("Eventos", [{ ID: exp + "|evento|" + tipo, Experimento: exp, Tipo: tipo, Fecha_hora: iso, Nota: "Registro manual (perfusión anterior)" }]);
          d.close(); H.toast(nom + ": " + H.diaCorto(iso) + " " + H.hora(iso));
        });
        var del = d.querySelector("#qxmDel"); if (del) del.addEventListener("click", function () { H.borrar("Eventos", H.filas("Eventos").filter(function (x) { return x.Experimento === exp && x.Tipo === tipo; }).map(function (x) { return x.ID; })); d.close(); });
      } });
  };
})();

;(window.HOME_MODS = window.HOME_MODS || {})["app_v072b.js"] = "0.7.2";
