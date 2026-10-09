// HF 工具集:组件公用的主题、动画参数、长文案自适应与文案拆分。
// 在 index.html 中于 gsap 之后、子合成之前加载。只含确定性逻辑。
(function () {
  const cssVar = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

  window.HF = {
    // 组件级主题覆盖:theme 非空时设置 data-theme;accent / accent2 非空时覆盖强调色
    applyTheme(root, v) {
      if (v.theme) root.dataset.theme = v.theme;
      if (v.accent) root.style.setProperty("--hf-accent", v.accent);
      if (v.accent2) root.style.setProperty("--hf-accent-2", v.accent2);
    },

    // 读取主题的动画参数
    motion(root) {
      return {
        ease: cssVar(root, "--hf-ease") || "power3.out",
        easeOut: cssVar(root, "--hf-ease-out") || "power2.in",
        dur: parseFloat(cssVar(root, "--hf-dur")) || 0.5,
        stagger: parseFloat(cssVar(root, "--hf-stagger")) || 0.15,
      };
    },

    // 单行缩字号;maxW 为 0 时以元素自身宽度为界;缩到 minPx 仍放不下则换行
    fit(el, maxW, minPx) {
      el.style.fontSize = ""; el.style.whiteSpace = "nowrap";
      const over = () => maxW ? el.scrollWidth > maxW : el.scrollWidth > el.clientWidth + 1;
      let fs = parseFloat(getComputedStyle(el).fontSize);
      while (over() && fs > minPx) { fs -= 2; el.style.fontSize = fs + "px"; }
      if (over()) el.style.whiteSpace = "normal";
    },

    // 超出底部安全区时先上移(不高于 minTop),仍放不下再等比缩小
    fitBox(el, bottom = 1520, minTop = 260) {
      el.style.scale = ""; el.style.top = "";
      const h = el.offsetHeight;
      if (el.offsetTop + h <= bottom) return;
      const top = Math.max(minTop, bottom - h);
      el.style.top = top + "px";
      if (top + h > bottom) { el.style.transformOrigin = "50% 0"; el.style.scale = String(Math.max(0.5, (bottom - top) / h)); }
    },

    // 立即执行一次,字体加载完成后再执行一次
    refit(fn) {
      fn();
      if (document.fonts) document.fonts.ready.then(fn);
    },

    split(s, sep = "|") {
      return String(s == null ? "" : s).split(sep).map(x => x.trim()).filter(Boolean);
    },

    pair(s) {
      const i = String(s).indexOf("::");
      return i < 0 ? [String(s).trim(), ""] : [s.slice(0, i).trim(), s.slice(i + 2).trim()];
    },
  };
})();
