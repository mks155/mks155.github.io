(function () {
  const models = Array.isArray(window.SNAKE_LLM_MODELS) ? window.SNAKE_LLM_MODELS : [];
  const cardsEl = document.getElementById("cards");
  const playerEl = document.getElementById("player");
  const countEl = document.getElementById("model-count");
  const frame = document.getElementById("player-frame");
  const nameEl = document.getElementById("player-name");
  const pathEl = document.getElementById("player-path");
  const downloadLink = document.getElementById("player-download");
  const reloadBtn = document.getElementById("player-reload");
  const backBtn = document.getElementById("player-back");
  const tabGrid = document.getElementById("tab-grid");
  const tabPlayer = document.getElementById("tab-player");
  const footerNote = document.querySelector(".footer-note");
  const wrapEl = document.querySelector(".wrap");
  const backHome = document.querySelector(".back-home");

  const NO_SCROLL_CSS =
    "html,body{overflow:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important}" +
    "::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}";

  if (countEl) countEl.textContent = String(models.length);

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

    cardsEl.innerHTML = models
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
      <div>
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
    <p>${escapeHtml(m.note || "")}</p>
    <div class="stat-grid">
      <div class="stat"><span>参数</span><b>${escapeHtml(m.params || "—")}</b></div>
      <div class="stat"><span>量化</span><b>${escapeHtml(m.quant || "—")}</b></div>
      <div class="stat"><span>平台</span><b>${escapeHtml(m.backend || "local")}</b></div>
    </div>
    ${tags ? `<div class="meta-row">${tags}</div>` : ""}
    <div class="card-actions">
      <button class="primary-btn" type="button" data-action="play">试玩</button>
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
    const isGrid = view === "grid";
    const isPlayer = !isGrid;

    if (cardsEl) cardsEl.classList.toggle("hidden", isPlayer);
    if (playerEl) {
      playerEl.classList.toggle("active", isPlayer);
      if (isPlayer) playerEl.removeAttribute("hidden");
      else playerEl.setAttribute("hidden", "");
    }
    document.body.classList.toggle("player-mode", isPlayer);
    if (wrapEl) wrapEl.hidden = isPlayer;
    if (footerNote) footerNote.hidden = isPlayer;
    if (backHome) backHome.hidden = isPlayer;
    if (tabGrid) tabGrid.classList.toggle("active", isGrid);
    if (tabPlayer) tabPlayer.classList.toggle("active", isPlayer);

    if (isPlayer) injectNoScroll(frame);
  }

  function openPlayer(index) {
    const m = models[index];
    if (!m) return;
    const src = encodeURI(m.file);
    const uploaded = formatUploadDate(m.uploadedAt);
    nameEl.textContent = m.name + (m.quant ? " · " + m.quant : "");
    pathEl.textContent = uploaded ? m.file + " · 上传 " + uploaded : m.file;
    if (downloadLink) {
      downloadLink.href = src;
      downloadLink.setAttribute("download", fileBaseName(m.file) + ".html");
    }
    frame.src = src;
    setView("player");
    window.scrollTo(0, 0);
    setTimeout(() => {
      try {
        frame.contentWindow && frame.contentWindow.focus();
      } catch (_) {}
    }, 150);
  }

  function closePlayer() {
    setView("grid");
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

  if (tabGrid) tabGrid.addEventListener("click", () => setView("grid"));
  if (tabPlayer) {
    tabPlayer.addEventListener("click", () => {
      if (models.length) openPlayer(0);
    });
  }
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
    if (e.key === "Escape" && document.body.classList.contains("player-mode")) {
      closePlayer();
    }
  });

  function applyHash() {
    const h = location.hash || "";
    const m = h.match(/m=([^&]+)/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    const idx = models.findIndex((x) => x.id === id);
    if (idx >= 0) openPlayer(idx);
  }

  renderCards();
  applyHash();
  window.addEventListener("hashchange", applyHash);
})();
