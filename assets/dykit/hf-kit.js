// HF 工具集:组件公用的主题、动画参数、长文案自适应与文案拆分。
// 在 index.html 中于 gsap 之后、子合成之前加载。只含确定性逻辑。
(function () {
  const cssVar = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

  window.HF = {
    // 组件级主题覆盖:theme 非空时设置 data-theme;accent / accent2 为合法颜色时覆盖强调色(非法值忽略)。
    // 覆盖强调色时也在本节点写上当前主题名,让主题块在这一层重新计算依赖强调色的装饰(如渐变强调词);
    // 并按新强调色的亮度重新选择其上的文字色(--hf-on-accent / --hf-on-accent-2),保证对比度
    applyTheme(root, v) {
      const ok = c => !!c && (typeof CSS === "undefined" || !CSS.supports || CSS.supports("color", c));
      const accent = ok(v.accent) ? v.accent : "", accent2 = ok(v.accent2) ? v.accent2 : "";
      if (v.theme || accent || accent2) {
        const up = root.parentElement && root.parentElement.closest("[data-theme]");
        root.dataset.theme = v.theme || (up ? up.dataset.theme : "minimal");
      }
      if (accent) { root.style.setProperty("--hf-accent", accent); root.style.setProperty("--hf-on-accent", this.onColor(root, accent)); }
      if (accent2) { root.style.setProperty("--hf-accent-2", accent2); root.style.setProperty("--hf-on-accent-2", this.onColor(root, accent2)); }
    },

    // 给定底色,返回对比度更高的文字色(近黑或白)
    onColor(root, color) {
      const probe = document.createElement("i");
      probe.style.color = color; root.appendChild(probe);
      const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0];
      probe.remove();
      const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const L = 0.2126 * lin(+m[0]) + 0.7152 * lin(+m[1]) + 0.0722 * lin(+m[2]);
      const dark = 0.0033; // #0a0a12 的相对亮度
      return (L + 0.05) / (dark + 0.05) >= 1.05 / (L + 0.05) ? "#0a0a12" : "#ffffff";
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

    // 多行文字:超过 maxLines 行或横向溢出时缩字号,最小 minPx
    fitLines(el, maxLines, minPx) {
      el.style.fontSize = "";
      let fs = parseFloat(getComputedStyle(el).fontSize);
      const lh = () => parseFloat(getComputedStyle(el).lineHeight) || fs * 1.2;
      const over = () => el.scrollHeight > lh() * maxLines + 2 || el.scrollWidth > el.clientWidth + 1;
      while (over() && fs > minPx) { fs -= 4; el.style.fontSize = fs + "px"; }
    },

    // 读取挂载点时长(子合成的 #root 直接位于挂载点内)
    duration(root, fallback = 4) {
      // 运行时会把挂载点的 data-duration 改名为 data-hf-authored-duration
      // 只读紧邻的挂载点,不向上找到外层根合成的时长
      const host = root.parentElement;
      const d = host ? parseFloat(host.getAttribute("data-duration") || host.getAttribute("data-hf-authored-duration")) : NaN;
      return d > 0 ? d : fallback;
    },

    // 节拍:cues 变量(秒,| 分隔,相对挂载点开头)→ 前 n 拍的时间。没写、空着或写错的拍用 defaults[i];
    // 后一拍不早于前一拍。项目(如 vd)把口播里的 @词 换算成秒填进 cues,组件的动作就跟着口播走
    cues(s, n, defaults) {
      const parts = String(s == null ? "" : s).split("|");
      const out = [];
      for (let i = 0; i < n; i++) {
        const raw = (parts[i] || "").trim();
        const x = raw === "" ? NaN : Number(raw);
        let t = isFinite(x) && x >= 0 ? x : defaults[i];
        if (i > 0 && t < out[i - 1]) t = out[i - 1];
        out.push(t);
      }
      return out;
    },

    // 默认节奏:n 拍从 first 开始,间隔 max(minGap, (D - first) / n),铺满挂载时长 D(最后一拍也停留同样久)
    spread(n, first, D, minGap) {
      const gap = Math.max(minGap, (D - first) / n);
      return Array.from({ length: n }, (_, i) => Math.round((first + i * gap) * 100) / 100);
    },

    // 退场开始时间:挂载时长 D 的末尾留出 dur;D 太短时不早于 notBefore(演完最后一拍)
    exitAt(D, dur, notBefore = 0) {
      return Math.max(notBefore, D - dur);
    },

    // 超出底部安全区时先上移(不高于 minTop),仍放不下再等比缩小
    fitBox(el, bottom = 1520, minTop = 260) {
      el.style.scale = ""; el.style.top = "";
      const h = el.offsetHeight;
      if (el.offsetTop + h <= bottom) return;
      const top = Math.max(minTop, bottom - h);
      el.style.top = top + "px";
      if (top + h > bottom) {
        const scale = Math.max(0.5, (bottom - top) / h);
        el.style.transformOrigin = "50% 0"; el.style.scale = String(scale);
        // 缩到下限仍超出安全区:内容太多。发出警告,hyperframes check --strict 会把它判为失败
        // 只在字体加载完成后的排版里判断,避免后备字体的第一次排版误报
        const fontsReady = !document.fonts || document.fonts.status === "loaded";
        if (fontsReady && top + h * scale > bottom + 1) console.warn(`[dykit] #${el.id || el.className} 内容过多,缩小到 50% 仍超出安全区 ${Math.round(top + h * scale - bottom)}px`);
      }
    },

    // 在 [top, bottom] 安全区内垂直居中;放不下时交给 fitBox(上移,再缩放)
    centerBox(el, top = 260, bottom = 1520) {
      el.style.scale = ""; el.style.top = "";
      const h = el.offsetHeight;
      el.style.top = Math.max(top, Math.round((top + bottom) / 2 - h / 2)) + "px";
      if (el.offsetTop + h > bottom) this.fitBox(el, bottom, top);
    },

    // 立即执行一次,字体加载完成后再执行一次
    refit(fn) {
      fn();
      if (document.fonts) document.fonts.ready.then(fn);
    },

    // ---- 镜头(dy-shot-*)用的 helper:只往传入的时间线上加 tween,seek 安全 ----

    // 段与段之间的平移转场:enter / exit 是 vd 写的变量("pan-left:0.6");duration 是挂载时长(含转场重叠)
    panInOut(tl, root, { enter, exit, duration }) {
      const off = { "pan-left": [1080, 0], "pan-right": [-1080, 0], "pan-up": [0, 1920], "pan-down": [0, -1920] };
      const parse = v => { if (!v) return null; const [d, t] = String(v).split(":"); return off[d] ? { d: off[d], dur: Number(t) } : null; };
      const a = parse(enter), b = parse(exit);
      if (a) {
        gsap.set(root, { x: a.d[0], y: a.d[1], filter: "blur(12px)" });
        tl.to(root, { x: 0, y: 0, filter: "blur(0px)", duration: a.dur, ease: "power2.inOut" }, 0);
      }
      if (b) tl.to(root, { x: -b.d[0], y: -b.d[1], filter: "blur(12px)", duration: b.dur, ease: "power2.inOut" }, Math.round((duration - b.dur) * 1000) / 1000);
    },

    // 镜头推拉平移:stage 是比画面大的画布层;keys[0] 是初态,其余按 t(段内秒)移过去,缺省 1 秒
    camera(tl, stage, keys) {
      const [first, ...rest] = keys;
      gsap.set(stage, { x: first.x, y: first.y, scale: first.scale, transformOrigin: "0 0" });
      for (const k of rest) tl.to(stage, { x: k.x, y: k.y, scale: k.scale, duration: k.dur ?? 1, ease: k.ease ?? "power2.inOut" }, k.t);
    },

    // 贴纸:白描边 + 三层投影(样式在 dykit.css 的 .hf-sticker)
    sticker(el) {
      el.classList.add("hf-sticker");
    },

    // 引线:SVG line / path 从起点画到终点
    leader(tl, line, t, dur = 0.4) {
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(line, { strokeDashoffset: 0, duration: dur, ease: "power2.out" }, t);
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
