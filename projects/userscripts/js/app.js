// Userscripts · 油猴脚本合集 —— 渲染与交互
// 卡片墙 / 列表两种视图，数据来自 js/data.js 的 window.USERSCRIPTS
(function () {
  "use strict";

  var scripts = Array.isArray(window.USERSCRIPTS) ? window.USERSCRIPTS : [];

  var cardsEl = document.getElementById("cards");
  var countEl = document.getElementById("script-count");
  var lastEl = document.getElementById("last-updated");
  var tabGrid = document.getElementById("tab-grid");
  var tabList = document.getElementById("tab-list");

  var VIEW_KEY = "userscripts_view";

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseTime(v) {
    if (!v) return -Infinity;
    var m = String(v).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(v);
    return isNaN(d.getTime()) ? -Infinity : d.getTime();
  }

  function loadView() {
    try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; }
    catch (e) { return "grid"; }
  }
  function saveView(v) {
    try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* 忽略 */ }
  }

  function iconHtml(s, withWrapper) {
    var inner = s.icon
      ? '<img class="card-icon" src="' + escapeHtml(s.icon) + '" alt="" width="46" height="46" />'
      : '<span class="card-icon is-glyph" aria-hidden="true">' +
        escapeHtml((s.cnName || s.name).slice(0, 2)) + "</span>";
    // 列表模式把图标并进标题行，否则会占掉一整列、把文字挤窄
    return withWrapper ? inner : '<div class="card-head">' + inner + "</div>";
  }

  function storeButtons(s) {
    return (s.stores || [])
      .map(function (st) {
        var cls = "store-btn" + (st.primary ? " is-primary" : "");
        return '<a class="' + cls + '" href="' + escapeHtml(st.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(st.name) + "</a>";
      })
      .join("");
  }

  function renderCards() {
    if (!cardsEl) return;
    var isList = cardsEl.classList.contains("list-mode");

    if (!scripts.length) {
      cardsEl.innerHTML =
        '<div class="howto-item"><h4>暂无脚本</h4><p>在 <code>js/data.js</code> 的 ' +
        "<code>window.USERSCRIPTS</code> 数组里登记。</p></div>";
      return;
    }

    cardsEl.innerHTML = scripts
      .map(function (s) {
        var tags = (s.tags || [])
          .map(function (t) { return '<span class="tag">' + escapeHtml(t) + "</span>"; })
          .join("");

        var meta = [
          s.version ? "版本 " + escapeHtml(s.version) : "",
          s.license ? escapeHtml(s.license) : "",
          s.updatedAt ? "更新 " + escapeHtml(s.updatedAt) : ""
        ].filter(Boolean).join(" · ");

        // 卡片头：图标 + 名称，GitHub 图标按钮靠右
        var head =
          '<div class="card-head">' +
          iconHtml(s, true) +
          '<div class="card-headtext">' +
          '<div class="card-cat">' + escapeHtml(s.cnName || "") + "</div>" +
          "<h3>" + escapeHtml(s.name) + "</h3>" +
          '<div class="card-meta"><span>' + meta + "</span></div>" +
          "</div>" +
          (s.repo
            ? '<a class="card-gh" href="' + escapeHtml(s.repo) + '" target="_blank" rel="noopener"' +
              ' title="在 GitHub 打开源码" aria-label="' + escapeHtml(s.name) + ' 源码仓库">' +
              '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>' +
              "</a>"
            : "") +
          "</div>";

        return (
          '<article class="card">' +
          head +
          '<div class="card-body">' +
          // 只有一段描述：说清这脚本干什么，不拆要点
          "<p>" + escapeHtml(s.summary || "") + "</p>" +
          (tags ? '<div class="tag-row">' + tags + "</div>" : "") +
          "</div>" +
          // 商店按钮是卡片的直接子元素：列表模式下要单独占右侧一列，
          // 放在 card-body 里会跟着文字区一起撑开
          '<div class="store-row">' + storeButtons(s) + "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function setView(view) {
    var isList = view === "list";
    if (cardsEl) cardsEl.classList.toggle("list-mode", isList);
    if (tabGrid) tabGrid.classList.toggle("active", !isList);
    if (tabList) tabList.classList.toggle("active", isList);
    renderCards(); // 两种视图的卡片结构不同，需重绘
    saveView(view);
  }

  function renderLastUpdated() {
    if (!lastEl) return;
    var latest = scripts.reduce(function (acc, s) {
      var t = parseTime(s.updatedAt);
      return t > acc.t ? { t: t, raw: s.updatedAt } : acc;
    }, { t: -Infinity, raw: null });
    if (!latest.raw) return;
    var m = String(latest.raw).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    var text = m ? m[1] + "-" + m[2] + "-" + m[3] : String(latest.raw);
    var strong = lastEl.querySelector("strong");
    if (strong) strong.textContent = text;
    else lastEl.textContent = "最后更新：" + text;
  }

  if (tabGrid) tabGrid.addEventListener("click", function () { setView("grid"); });
  if (tabList) tabList.addEventListener("click", function () { setView("list"); });

  if (countEl) countEl.textContent = String(scripts.length);
  renderCards();
  renderLastUpdated();
  setView(loadView());
})();