// Articles · 文章阅读器 —— 列表渲染、markdown 拉取与阅读态切换
// 深链：#a=<id> 直接落到对应文章的阅读态
(function () {
  "use strict";

  var articles = Array.isArray(window.ARTICLES) ? window.ARTICLES : [];

  var listEl = document.getElementById("articles-list");
  var cardsEl = document.getElementById("art-cards");
  var readerEl = document.getElementById("reader");
  var readerBody = document.getElementById("reader-body");
  var readerTitle = document.getElementById("reader-title");
  var readerMeta = document.getElementById("reader-meta");
  var readerTags = document.getElementById("reader-tags");
  var countEl = document.getElementById("article-count");
  var lastEl = document.getElementById("last-updated");

  var escapeHtml = window.MD ? window.MD.escapeHtml : function (s) { return String(s == null ? "" : s); };

  function byId(id) {
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].id === id) return articles[i];
    }
    return null;
  }

  function tagList(tags) {
    return (tags || [])
      .map(function (t) { return '<span class="tag">' + escapeHtml(t) + "</span>"; })
      .join("");
  }

  function renderList() {
    if (!cardsEl) return;

    if (!articles.length) {
      cardsEl.innerHTML =
        '<div class="howto-item"><h4>暂无文章</h4><p>把 .md 放进 <code>md/</code>，' +
        "再在 <code>js/data.js</code> 的 <code>window.ARTICLES</code> 里登记。</p></div>";
      return;
    }

    cardsEl.innerHTML = articles
      .map(function (a) {
        return (
          '<a class="art-card" href="#a=' + encodeURIComponent(a.id) + '">' +
          '<div class="art-card-body">' +
          '<h3>' + escapeHtml(a.title) + "</h3>" +
          '<p>' + escapeHtml(a.summary || "") + "</p>" +
          '<div class="art-meta">' +
          '<span class="art-date">' + escapeHtml(a.date || "") + "</span>" +
          (a.tags && a.tags.length ? '<span class="tag-row">' + tagList(a.tags) + "</span>" : "") +
          "</div>" +
          "</div>" +
          '<span class="art-open">阅读 →</span>' +
          "</a>"
        );
      })
      .join("");
  }

  function renderLastUpdated() {
    if (!lastEl) return;
    var dates = articles.map(function (a) { return a.date; }).filter(Boolean).sort();
    if (!dates.length) return;
    var latest = dates[dates.length - 1];
    var strong = lastEl.querySelector("strong");
    if (strong) strong.textContent = latest;
    else lastEl.textContent = "最后更新：" + latest;
  }

  function setMode(reading) {
    document.body.classList.toggle("reading", !!reading);
    if (listEl) listEl.hidden = !!reading;
    if (readerEl) readerEl.hidden = !reading;
    // 列表 / 阅读态高度不同，回到顶部避免停在上篇文章的滚动位置
    window.scrollTo(0, 0);
  }

  function openArticle(id) {
    var a = byId(id);
    if (!a) { closeReader(); return; }

    document.title = a.title + " · Articles";
    if (readerTitle) readerTitle.textContent = a.title;
    if (readerMeta) readerMeta.textContent = a.date || "";
    if (readerTags) readerTags.innerHTML = tagList(a.tags);
    if (readerBody) {
      readerBody.innerHTML =
        '<p class="reader-loading">正在载入 <code>' + escapeHtml(a.file) + "</code> …</p>";
    }
    setMode(true);

    // encodeURI 处理中文 / 空格 / · 之类的字符
    fetch(encodeURI(a.file))
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        if (readerBody) {
          readerBody.innerHTML = window.MD.render(text);
          readerBody.scrollTop = 0;
        }
      })
      .catch(function (err) {
        if (readerBody) {
          readerBody.innerHTML =
            '<p class="reader-error">载入失败：' + escapeHtml(err.message) + "</p>" +
            "<p>用 file:// 直接打开页面时浏览器会拦截 fetch，请起个本地服务：</p>" +
            "<pre class=\"md-code\"><code>python -m http.server 8080</code></pre>";
        }
      });
  }

  function closeReader() {
    if (location.hash.indexOf("#a=") === 0) {
      history.pushState(null, "", location.pathname + location.search);
    }
    document.title = "Articles · 文章";
    setMode(false);
  }

  function routeFromHash() {
    var m = location.hash.match(/^#a=(.+)$/);
    if (m) openArticle(decodeURIComponent(m[1]));
    else closeReader();
  }

  document.addEventListener("click", function (e) {
    var back = e.target.closest("[data-back]");
    if (back) {
      e.preventDefault();
      if (location.hash.indexOf("#a=") === 0) history.back();
      else closeReader();
    }
  });

  window.addEventListener("popstate", routeFromHash);

  if (countEl) countEl.textContent = String(articles.length);
  renderList();
  renderLastUpdated();
  routeFromHash();
})();