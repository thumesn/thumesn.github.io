(function () {
  function mountMascot(widget) {
    if (!widget || widget.querySelector(".anime-mascot")) {
      return;
    }

    var mascot = document.createElement("div");
    mascot.className = "anime-mascot";
    mascot.setAttribute("aria-hidden", "true");
    mascot.innerHTML = [
      '<span class="mascot-halo"></span>',
      '<span class="mascot-twin mascot-twin-left"></span>',
      '<span class="mascot-twin mascot-twin-right"></span>',
      '<span class="mascot-hair"></span>',
      '<span class="mascot-head">',
      '  <span class="mascot-eye mascot-eye-left"></span>',
      '  <span class="mascot-eye mascot-eye-right"></span>',
      '  <span class="mascot-blush mascot-blush-left"></span>',
      '  <span class="mascot-blush mascot-blush-right"></span>',
      '  <span class="mascot-mouth"></span>',
      '</span>',
      '<span class="mascot-ribbon mascot-ribbon-left"></span>',
      '<span class="mascot-ribbon mascot-ribbon-right"></span>',
      '<span class="mascot-body"></span>',
      '<span class="mascot-collar"></span>',
      '<span class="mascot-arm mascot-arm-left"></span>',
      '<span class="mascot-arm mascot-arm-right"></span>',
      '<span class="mascot-tablet"></span>',
      '<span class="mascot-skirt"></span>',
      '<span class="mascot-leg mascot-leg-left"></span>',
      '<span class="mascot-leg mascot-leg-right"></span>'
    ].join("");
    widget.appendChild(mascot);
  }

  if (!window.L2Dwidget) {
    var fallback = document.createElement("div");
    fallback.id = "live2d-widget";
    document.body.appendChild(fallback);
    mountMascot(fallback);
    return;
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    return;
  }

  window.L2Dwidget.init({
    pluginRootPath: "live2dw/",
    pluginJsPath: "lib/",
    pluginModelPath: "assets/",
    tagMode: false,
    log: false,
    model: {
      jsonPath: "/live2dw/assets/shizuku/shizuku.model.json",
      scale: 1
    },
    display: {
      position: "right",
      width: 280,
      height: 520,
      hOffset: -10,
      vOffset: -48,
      superSample: 2
    },
    mobile: {
      show: false,
      scale: 0.72,
      motion: false
    },
    react: {
      opacityDefault: 0.86,
      opacityOnHover: 1
    },
    dialog: {
      enable: false,
      hitokoto: false
    }
  });

  var attempts = 0;
  var badgeTimer = window.setInterval(function () {
    attempts += 1;
    var widget = document.getElementById("live2d-widget");

    if (widget && !widget.querySelector(".anime-status-dot")) {
      var dot = document.createElement("span");
      dot.className = "anime-status-dot";
      widget.appendChild(dot);
      mountMascot(widget);
      window.clearInterval(badgeTimer);
    }

    if (attempts > 40) {
      window.clearInterval(badgeTimer);
    }
  }, 250);
})();
