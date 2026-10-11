(function () {
  const RAW_MODELS = Array.isArray(window.SNAKE_LLM_MODELS) ? window.SNAKE_LLM_MODELS : [];

  function parseTime(v) {
    if (v === undefined || v === null || v === "") return Infinity;
    if (typeof v === "number") return v;
    const s = String(v).trim();
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? Infinity : d.getTime();
  }

  // 统一按上传时间排序（旧的在前、新的在后）。
  // 数组顺序写乱也不会影响展示顺序；同一天的条目保持 models.js 里的先后（稳定排序）。
  const models = RAW_MODELS.map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const da = parseTime(a.m.uploadedAt);
      const db = parseTime(b.m.uploadedAt);
      if (da !== db) return da - db;
      return a.i - b.i;
    })
    .map((x) => x.m);

  // ---- 排序状态：时间 / 跑分 × 升序 / 降序 ----
  const SORTS = {
    time: function (m) { return parseTime(m.uploadedAt); },
    score: function (m) {
      const r = m.review;
      return r && typeof r.score === "number" ? r.score : -Infinity;
    }
  };

  // 默认：上传时间降序（最新的排在最前）。
  let sortKey = "time";
  let sortDesc = true;
  let viewState = "grid";
  // 进入专注试玩前的视图，退出时回到这里而不是硬编码回卡片墙
  let viewBeforePlayer = "grid";
  let currentId = null;

  function ordered() {
    const pick = SORTS[sortKey] || SORTS.time;
    const dir = sortDesc ? -1 : 1;
    return models
      .map((m, i) => ({ m, i, k: pick(m) }))
      .sort((a, b) => {
        if (a.k !== b.k) return (a.k - b.k) * dir;
        return a.i - b.i; // 同值保持稳定
      })
      .map((x) => x.m);
  }

  // 工具栏控件布局换过一版（排序维度从按钮组改成下拉、视图切换并成单按钮），
  // 旧版存档里的字段名已对不上，这里按版本号整体作废，避免读到半新半旧的状态。
  const PREFS_KEY = "snake_bench_prefs";
  const PREFS_VERSION = 2;

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.v !== PREFS_VERSION) return;
      if (p.sortKey && SORTS[p.sortKey]) sortKey = p.sortKey;
      if (typeof p.sortDesc === "boolean") sortDesc = p.sortDesc;
      if (["grid", "list", "player"].indexOf(p.view) >= 0) viewState = p.view;
      if (["grid", "list"].indexOf(p.viewBefore) >= 0) viewBeforePlayer = p.viewBefore;
    } catch (e) { /* 忽略 */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        v: PREFS_VERSION,
        sortKey: sortKey, sortDesc: sortDesc,
        view: viewState, viewBefore: viewBeforePlayer
      }));
    } catch (e) { /* 忽略 */ }
  }

  function syncSortUI() {
    if (sortSelect) sortSelect.value = sortKey;
    if (sortDirBtn) {
      sortDirBtn.textContent = sortDesc ? "↓ 降序" : "↑ 升序";
      sortDirBtn.classList.toggle("desc", sortDesc);
      sortDirBtn.title = sortDesc
        ? "当前降序，点击切换为升序"
        : "当前升序，点击切换为降序";
      sortDirBtn.setAttribute("aria-label", sortDirBtn.title);
    }
  }
  const cardsEl = document.getElementById("cards");
  const playerEl = document.getElementById("player");
  const countEl = document.getElementById("model-count");
  const frame = document.getElementById("player-frame");
  const nameEl = document.getElementById("player-name");
  const pathEl = document.getElementById("player-path");
  const downloadLink = document.getElementById("player-download");
  const reloadBtn = document.getElementById("player-reload");
  const backBtn = document.getElementById("player-back");
  const sortSelect = document.getElementById("sort-key");
  const sortDirBtn = document.getElementById("sort-dir");
  const viewToggle = document.getElementById("view-toggle");
  const focusPlayBtn = document.getElementById("focus-play");
  const playerSelect = document.getElementById("player-select");
  const playerSwitch = document.getElementById("player-switch");
  const playerPrev = document.getElementById("player-prev");
  const playerNext = document.getElementById("player-next");
  const footerNote = document.querySelector(".footer-note");
  const wrapEl = document.querySelector(".wrap");
  const backHome = document.querySelector(".back-home");

  const NO_SCROLL_CSS =
    "html,body{overflow:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important}" +
    "::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}";

  if (countEl) countEl.textContent = String(models.length);

  // 「最后更新」= 所有产物里最新的上传时间，自动跟随数据变化
  function renderLastUpdated() {
    var box = document.getElementById("last-updated");
    if (!box) return;
    var latest = models.reduce(function (acc, m) {
      var t = parseTime(m.uploadedAt);
      return t > acc.t ? { t: t, raw: m.uploadedAt } : acc;
    }, { t: -Infinity, raw: null });
    if (!latest.raw) return;
    var m = String(latest.raw).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    var text = m ? m[1] + "-" + m[2] + "-" + m[3] : String(latest.raw);
    var strong = box.querySelector("strong");
    if (strong) strong.textContent = text;
    else box.textContent = "最后更新：" + text;
  }

  function quantClass(q) {
    const s = String(q || "").toUpperCase();
    if (s.includes("Q4")) return "quant-q4";
    if (s.includes("Q8") || s.includes("Q6")) return "quant-q8";
    return "";
  }

  function shortLabel(m) {
    const bits = [m.params, m.quant].filter(Boolean);
    return bits.join(" · ") || "LOCAL";
  }

  function formatUploadDate(iso) {
    if (!iso) return "";
    const raw = String(iso).trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return y + "-" + mo + "-" + day;
    }
    return raw;
  }

  function formatTps(tps) {
    if (tps === undefined || tps === null || tps === "") return "—";
    const n = Number(tps);
    if (isNaN(n)) return String(tps);
    return n.toFixed(1) + " tok/s";
  }

  function injectNoScroll(iframe) {
    if (!iframe) return;
    const apply = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.documentElement) return;
        if (doc.getElementById("__bench_noscroll__")) return;
        const style = doc.createElement("style");
        style.id = "__bench_noscroll__";
        style.textContent = NO_SCROLL_CSS;
        doc.documentElement.appendChild(style);
        doc.documentElement.style.overflow = "hidden";
        if (doc.body) doc.body.style.overflow = "hidden";
      } catch (_) {
        /* cross-origin etc. */
      }
    };
    iframe.addEventListener("load", apply);
    apply();
  }

  function renderCards() {
    if (!cardsEl) return;
    if (!models.length) {
      cardsEl.innerHTML =
        '<div class="howto-item"><h4>暂无产物</h4><p>把模型生成的 HTML 放进 <code>models/</code>，并在 <code>js/models.js</code> 登记。</p></div>';
      return;
    }

    const list = ordered();

    cardsEl.innerHTML = list
      .map((m, i) => {
        const src = encodeURI(m.file);
        const tags = (m.tags || [])
          .map((t) => `<span class="pill">${escapeHtml(t)}</span>`)
          .join("");
        const uploaded = formatUploadDate(m.uploadedAt);
        const uploadMeta = uploaded
          ? `<div class="upload-meta" title="上传时间">上传 ${escapeHtml(uploaded)}</div>`
          : "";
        return `
<article class="card" data-id="${escapeHtml(m.id)}" data-index="${i}">
  <div class="card-preview">
    <span class="badge ${quantClass(m.quant)}">${escapeHtml(shortLabel(m))}</span>
    <span class="preview-hint">预览</span>
    <iframe
      src="${src}"
      title="${escapeHtml(m.name)} 预览"
      loading="lazy"
      tabindex="-1"
      scrolling="no"
      sandbox="allow-scripts allow-same-origin"
    ></iframe>
  </div>
  <div class="card-body">
    <div class="card-head">
      <div class="card-id">
        <div class="card-cat">${escapeHtml(m.family || "LOCAL LLM")}</div>
        <h3>${escapeHtml(m.name)}${m.quant ? " · " + escapeHtml(m.quant) : ""}</h3>
        ${uploadMeta}
      </div>
      <a
        class="download-btn"
        href="${src}"
        download
        title="下载源文件"
        aria-label="下载源文件"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v11" />
          <path d="M7.5 11.5 12 16l4.5-4.5" />
          <path d="M6 19h12" />
        </svg>
      </a>
    </div>
    <div class="stat-grid">
      <div class="stat"><span>参数</span><b>${escapeHtml(m.params || "—")}</b></div>
      <div class="stat"><span>量化</span><b>${escapeHtml(m.quant || "—")}</b></div>
      <div class="stat"><span>平台</span><b>${escapeHtml(m.backend || "local")}</b></div>
      <div class="stat"><span>速度</span><b>${escapeHtml(formatTps(m.tps))}</b></div>
    </div>
    ${renderBench(m)}
    <p>${escapeHtml(m.note || "")}</p>
    <div class="card-foot">
      ${tags ? `<div class="meta-row">${tags}</div>` : '<span class="foot-gap"></span>'}
      <div class="card-actions">
        <button class="primary-btn" type="button" data-action="play">试玩</button>
      </div>
    </div>
  </div>
</article>`;
      })
      .join("");

    cardsEl.querySelectorAll("iframe").forEach(injectNoScroll);

    cardsEl.querySelectorAll('[data-action="play"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".card");
        const idx = Number(card && card.getAttribute("data-index"));
        if (!Number.isNaN(idx)) openPlayer(idx);
      });
    });
  }

  function setView(view) {
    const isPlayer = view === "player";
    const isList = view === "list";

    // 进入试玩前记下当前视图，退出时回到它
    if (isPlayer && !document.body.classList.contains("player-mode")) {
      viewBeforePlayer = viewState === "player" ? viewBeforePlayer : viewState;
    }

    viewState = view;

    if (cardsEl) {
      cardsEl.classList.toggle("hidden", isPlayer);
      cardsEl.classList.toggle("list-mode", isList);
    }
    if (playerEl) {
      playerEl.classList.toggle("active", isPlayer);
      if (isPlayer) playerEl.removeAttribute("hidden");
      else playerEl.setAttribute("hidden", "");
    }
    document.body.classList.toggle("player-mode", isPlayer);
    if (wrapEl) wrapEl.hidden = isPlayer;
    if (footerNote) footerNote.hidden = isPlayer;
    if (backHome) backHome.hidden = isPlayer;

    // 单按钮视图切换：图标与文案反映「当前是什么模式」，title 说明点了会去哪
    if (viewToggle) {
      viewToggle.dataset.mode = isList ? "list" : "grid";
      const label = viewToggle.querySelector(".view-label");
      if (label) label.textContent = isList ? "列表" : "卡片";
      const nextName = isList ? "卡片" : "列表";
      viewToggle.title = "切换到" + nextName;
      viewToggle.setAttribute("aria-label", "当前" + (isList ? "列表" : "卡片") + "，点击切换到" + nextName);
      viewToggle.setAttribute("aria-pressed", String(isList));
    }

    if (backBtn) backBtn.textContent = isList ? "← 返回列表" : "← 返回卡片";

    if (isPlayer) injectNoScroll(frame);
    savePrefs();
  }

  function currentIndex() {
    const list = ordered();
    return list.findIndex((m) => m.id === currentId);
  }

  function openPlayer(index) {
    const m = ordered()[index];
    if (!m) return;
    currentId = m.id;
    const src = encodeURI(m.file);
    const uploaded = formatUploadDate(m.uploadedAt);
    nameEl.textContent = m.name + (m.quant ? " · " + m.quant : "");
    pathEl.textContent = uploaded ? m.file + " · 上传 " + uploaded : m.file;
    if (downloadLink) {
      downloadLink.href = src;
      downloadLink.setAttribute("download", fileBaseName(m.file) + ".html");
    }
    frame.src = src;
    syncPlayerSwitch();
    setView("player");
    window.scrollTo(0, 0);
    setTimeout(() => {
      try {
        frame.contentWindow && frame.contentWindow.focus();
      } catch (_) {}
    }, 150);
  }

  // ---- 试玩页内切换产物 ----
  function switchById(id) {
    const list = ordered();
    const idx = list.findIndex((m) => m.id === id);
    if (idx >= 0) openPlayer(idx);
  }

  function step(delta) {
    const list = ordered();
    if (!list.length) return;
    const cur = list.findIndex((m) => m.id === currentId);
    const next = (((cur < 0 ? 0 : cur) + delta) % list.length + list.length) % list.length;
    openPlayer(next);
  }

  function syncPlayerSwitch() {
    if (playerSwitch) playerSwitch.hidden = false;
    if (!playerSelect) return;
    const list = ordered();
    const sig = list.map((m) => m.id).join("|");
    if (playerSelect.dataset.sig !== sig) {
      playerSelect.innerHTML = list
        .map((m) => {
          const r = m.review || {};
          const bits = [m.name];
          if (m.quant) bits.push(m.quant);
          if (typeof r.score === "number") bits.push(r.score + " 分");
          return '<option value="' + escapeHtml(m.id) + '">' + escapeHtml(bits.join(" · ")) + "</option>";
        })
        .join("");
      playerSelect.dataset.sig = sig;
    }
    if (currentId) playerSelect.value = currentId;
    const multi = list.length > 1;
    if (playerPrev) playerPrev.disabled = !multi;
    if (playerNext) playerNext.disabled = !multi;
  }

  function closePlayer() {
    setView(viewBeforePlayer === "list" ? "list" : "grid");
    setTimeout(() => {
      if (playerEl && playerEl.hasAttribute("hidden")) {
        frame.src = "about:blank";
      }
    }, 200);
  }

  function fileBaseName(path) {
    const base = String(path).split("/").pop() || "model";
    return base.replace(/\.html?$/i, "");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---- SNAKE SCORE 渲染（评分标准见 js/rubric.js）----
  var RUBRIC = window.SNAKE_LLM_RUBRIC || null;

  function axisMeta() {
    if (RUBRIC && Array.isArray(RUBRIC.axes)) return RUBRIC.axes;
    // rubric 未加载时的兜底，保证展示层不崩
    return [
      { key: "play", name: "可玩", max: 350 },
      { key: "feel", name: "手感", max: 250 },
      { key: "show", name: "视听", max: 250 },
      { key: "done", name: "完成", max: 150 }
    ];
  }

  function gradeLabel(grade) {
    if (RUBRIC && Array.isArray(RUBRIC.grades)) {
      for (var i = 0; i < RUBRIC.grades.length; i++) {
        if (RUBRIC.grades[i].grade === grade) return RUBRIC.grades[i].label;
      }
    }
    return "";
  }

  function renderBench(m) {
    var r = m && m.review;
    if (!r || !r.axes || typeof r.score !== "number") return "";

    var bars = axisMeta()
      .map(function (ax) {
        var got = Number(r.axes[ax.key]) || 0;
        var pct = Math.max(0, Math.min(100, (got / ax.max) * 100));
        return (
          '<div class="ba" title="' + escapeHtml(ax.name) + " " + got + "/" + ax.max + '">' +
          '<span class="ba-l">' + escapeHtml(ax.name) + "</span>" +
          '<span class="ba-bar"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
          '<b class="ba-v">' + got + "</b>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<div class="bench">' +
      '<div class="bench-top">' +
      '<span class="bench-tag">SNAKE SCORE</span>' +
      '<b class="bench-num">' + r.score + "</b>" +
      '<span class="bench-grade" data-g="' + escapeHtml(r.grade || "") + '">' +
      escapeHtml((r.grade || "") + " " + gradeLabel(r.grade)).trim() +
      "</span>" +
      "</div>" +
      '<div class="bench-axes">' + bars + "</div>" +
      "</div>"
    );
  }

  function enterFocusPlayer() {
    if (!models.length) return;
    const cur = currentIndex();
    openPlayer(cur >= 0 ? cur : 0);
  }

  // 视图切换：卡片墙 ⇄ 列表，一个按钮来回切
  if (viewToggle) {
    viewToggle.addEventListener("click", () => {
      setView(viewState === "list" ? "grid" : "list");
    });
  }

  // 专注试玩独立成一个主按钮，不再混在视图切换组里
  if (focusPlayBtn) focusPlayBtn.addEventListener("click", enterFocusPlayer);

  // 排序维度走下拉；升降序仍由单独一个按钮控制
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const k = sortSelect.value;
      if (!SORTS[k]) return;
      sortKey = k;
      syncSortUI();
      renderCards();
      syncPlayerSwitch();
      savePrefs();
    });
  }

  if (sortDirBtn) {
    sortDirBtn.addEventListener("click", () => {
      sortDesc = !sortDesc;
      syncSortUI();
      renderCards();
      syncPlayerSwitch();
      savePrefs();
    });
  }

  if (playerSelect) {
    playerSelect.addEventListener("change", () => switchById(playerSelect.value));
  }
  if (playerPrev) playerPrev.addEventListener("click", () => step(-1));
  if (playerNext) playerNext.addEventListener("click", () => step(1));

  if (backBtn) backBtn.addEventListener("click", closePlayer);
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      const href = downloadLink && downloadLink.getAttribute("href");
      if (href && href !== "#") {
        frame.src = "about:blank";
        setTimeout(() => {
          frame.src = href;
          try {
            frame.contentWindow && frame.contentWindow.focus();
          } catch (_) {}
        }, 40);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    const inPlayer = document.body.classList.contains("player-mode");
    if (e.key === "Escape" && inPlayer) {
      closePlayer();
      return;
    }
    // 试玩页内：左右方向键 / J K 切换产物
    if (!inPlayer || !models.length) return;
    const t = e.target;
    if (t && (t.tagName === "SELECT" || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowLeft" || e.key === "k" || e.key === "K") { step(-1); }
    else if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") { step(1); }
  });

  function applyHash() {
    const h = location.hash || "";
    const m = h.match(/m=([^&]+)/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    switchById(id);
  }

  loadPrefs();
  syncSortUI();
  renderCards();
  renderLastUpdated();
  applyHash();
  if (viewState === "player" && models.length) {
    // 上次停在试玩页：优先回到上回那个产物，否则从第一个开始
    const cur = currentIndex();
    openPlayer(cur >= 0 ? cur : 0);
  } else {
    setView(viewState);
  }
  window.addEventListener("hashchange", applyHash);
})();
