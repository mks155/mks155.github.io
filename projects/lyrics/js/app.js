// 歌单 · 歌词 页面交互
// ------------------------------------------------------------
// 时间轴用 performance.now() 驱动，不用 setInterval 累加 ——
// 后者每帧都会因定时器抖动而累积误差，跑十几分钟就能差出好几秒。
(function () {
  "use strict";

  var TRACKS = window.LYRIC_TRACKS || [];
  var SET = window.LYRIC_SETLIST || { parts: [] };
  var STORE_LRC = "lyric_lrc_v1";     // 歌词缓存（本地，不上传）
  var STORE_UI = "lyric_ui_v1";       // 字号 / 偏移等偏好

  // 字号六档。默认第 3 档 28px —— 演唱会离舞台远，再小看不清
  var SIZES = [20, 24, 28, 32, 38, 44];
  var DEFAULT_SIZE = 2;

  var el = {
    setlist: document.getElementById("view-setlist"),
    lyrics: document.getElementById("view-lyrics"),
    parts: document.getElementById("sl-parts"),
    total: document.getElementById("sl-total"),
    dates: document.getElementById("sl-dates"),
    lrcInput: document.getElementById("lrc-input"),
    lrcInput2: document.getElementById("lrc-input2"),
    song: document.getElementById("ly-song"),
    part: document.getElementById("ly-part"),
    stage: document.getElementById("ly-stage"),
    scroll: document.getElementById("ly-scroll"),
    empty: document.getElementById("ly-empty"),
    badge: document.getElementById("ly-pause-badge"),
    now: document.getElementById("ly-now"),
    totalT: document.getElementById("ly-total"),
    seek: document.getElementById("ly-seek"),
    play: document.getElementById("btn-play"),
    btns: document.getElementById("ly-btns"),
    prev: document.getElementById("btn-prev"),
    next: document.getElementById("btn-next"),
    back: document.getElementById("btn-back"),
    listBtn: document.getElementById("btn-list"),
    adjustBtn: document.getElementById("btn-adjust"),
    adjustBox: document.getElementById("ly-adjust"),
    fsVal: document.getElementById("fs-val"),
    fsMinus: document.getElementById("fs-minus"),
    fsPlus: document.getElementById("fs-plus"),
    offRow: document.getElementById("off-row"),
    offsetBar: document.getElementById("ly-adjust"),
    offVal: document.getElementById("off-val"),
    offMinus: document.getElementById("off-minus"),
    offPlusBtn: document.getElementById("off-plus"),
    offReset: document.getElementById("off-reset"),
    drawer: document.getElementById("ly-drawer"),
    drawerList: document.getElementById("ly-drawer-list"),
    drawerClose: document.getElementById("drawer-close"),
    toast: document.getElementById("ly-toast"),
    pasteBox: document.getElementById("sl-paste"),
    pasteArea: document.getElementById("paste-area"),
    pasteName: document.getElementById("paste-name"),
    pasteBtn: document.getElementById("btn-paste"),
    pasteOk: document.getElementById("paste-ok"),
    pasteCancel: document.getElementById("paste-cancel"),
    backupBtn: document.getElementById("btn-backup"),
    backupInput: document.getElementById("backup-input"),
    unmatchedBox: document.getElementById("sl-unmatched"),
    unmatchedList: document.getElementById("sl-unmatched-list")
  };

  var state = {
    cur: -1,          // 当前歌曲在 TRACKS 里的下标
    data: null,       // 当前歌曲的解析结果
    lrc: {},          // { 歌名: { lines, meta, duration } }
    playing: false,
    time: 0,          // 当前播放位置（秒）
    startedAt: 0,     // performance.now() 基准点
    offset: 0,        // 现场对不准时手动微调（秒）
    sizeIdx: DEFAULT_SIZE,
    activeLine: -1,
    raf: 0,
    wakeLock: null
  };

  // ---------- 本地存储（隐私模式下会抛，全包起来）----------
  function loadStore(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function saveStore(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略 */ }
  }

  // ---------- 歌单渲染 ----------
  function renderSetlist() {
    el.total.textContent = String(TRACKS.length);
    el.dates.textContent = SET.dates || "—";
    var html = "";
    for (var p = 0; p < SET.parts.length; p++) {
      var part = SET.parts[p];
      html += '<section class="sl-part"><h2 class="sl-part-name">' + esc(part.name) + "</h2>";
      if (part.note) html += '<p class="sl-part-note">' + esc(part.note) + "</p>";
      html += '<ul class="sl-songs">';
      for (var i = 0; i < part.songs.length; i++) {
        var idx = TRACKS.findIndex(function (t) { return t.title === part.songs[i] && t.partId === part.id; });
        var has = idx >= 0 && hasLyrics(state.lrc[TRACKS[idx].title]);
        html += '<li class="sl-song' + (has ? " has-lrc" : "") + '" data-idx="' + idx + '">';
        html += '<span class="sl-no">' + (idx >= 0 ? TRACKS[idx].index : "?") + "</span>";
        html += '<span class="sl-name">' + esc(part.songs[i]) + "</span>";
        html += '<span class="sl-dot" title="' + (has ? "已有歌词" : "缺歌词") + '"></span>';
        html += "</li>";
      }
      html += "</ul></section>";
    }
    el.parts.innerHTML = html;
    Array.prototype.forEach.call(el.parts.querySelectorAll(".sl-song"), function (li) {
      li.addEventListener("click", function () {
        var i = Number(li.getAttribute("data-idx"));
        if (i >= 0) openSong(i, true);
      });
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---------- 歌词导入 ----------

  // 真实世界的 .lrc 文件名远比「歌名.lrc」复杂：常见的有
  //   「凤凰传奇 - 光芒.lrc」「光芒 (Live).lrc」「【高清】光芒.lrc」
  //   「芒 光.lrc」「光芒(凤凰传奇).lrc」「过山 御龙归字谣.lrc」……
  // 逐级放宽去撞歌单，命中就挂上去，撞不上就记进未匹配清单，
  // 方便用户改名后重导，而不是静默变成「没歌词」。
  var SEP_RE = /[\s\-–—_·|]+/;

  function normalize(s) {
    return String(s || "")
      .replace(/[（(【\[].*?[)）】\]]/g, "")              // 去掉括号注释
      .replace(/[\s\-–—_·|,，。.!！?？'"“”\/／、]+/g, "") // 去掉所有分隔符（含斜杠：歌单里有「过山 / 御龙归字谣」）
      .toLowerCase();
  }

  function matchTrack(filename) {
    var base = filename.replace(/\.(lrc|txt)$/i, "").trim();
    if (!base) return null;

    var tries = [base];

    // 「歌手 - 歌名」：按最后一个分隔符切，取后半段再试
    var parts = base.split(SEP_RE).filter(Boolean);
    if (parts.length > 1) {
      tries.push(parts[parts.length - 1]);
      tries.push(parts[0]);
    }

    // 歌名被塞在括号里的情况，括号已经被 normalize 去掉了，这里单独再试一次原文
    var inBracket = base.match(/[（(【\[]([^)）】\]]{2,})[)）】\]]/);
    if (inBracket) tries.push(inBracket[1].trim());

    // 先精确匹配，再归一化匹配
    for (var i = 0; i < tries.length; i++) {
      var t = tries[i];
      if (!t) continue;
      var exact = TRACKS.find(function (x) { return x.title === t; });
      if (exact) return exact;
    }
    for (var j = 0; j < tries.length; j++) {
      var key = normalize(tries[j]);
      if (!key) continue;
      var hit = TRACKS.find(function (x) { return normalize(x.title) === key; });
      if (hit) return hit;
    }
    // 最后再试「歌单里某个歌名被完整包含在文件名里」，能兜住大部分花式命名
    for (var k = 0; k < TRACKS.length; k++) {
      var name = normalize(TRACKS[k].title);
      if (name.length >= 2 && normalize(base).indexOf(name) >= 0) return TRACKS[k];
    }
    return null;
  }

  function bindFileInput(input) {
    if (!input) return;
    input.addEventListener("change", function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (files.length) readFiles(files);
      input.value = "";
    });
  }

  function readFiles(files) {
    var matched = 0;
    var missed = [];
    files.forEach(function (f) {
      var fr = new FileReader();
      fr.onload = function () {
        var parsed = window.LRC.parse(fr.result);
        if (!hasLyrics(parsed)) { missed.push(f.name); return; }
        var hit = matchTrack(f.name);
        var key = hit ? hit.title : f.name.replace(/\.(lrc|txt)$/i, "").trim();
        state.lrc[key] = parsed;
        if (hit) matched++; else missed.push(f.name);
      };
      fr.onerror = function () { missed.push(f.name + "（读取失败）"); };
      fr.readAsText(f, "utf-8");
    });
    // FileReader 是异步的，等它们全部落地再刷新界面
    setTimeout(function () {
      saveStore(STORE_LRC, state.lrc);
      renderSetlist();
      renderDrawer();
      renderUnmatched(missed);
      toast(matched ? "已导入 " + matched + " 首" + (missed.length ? "，" + missed.length + " 个没对上" : "") : "都没对上歌单");
    }, 450);
  }

  // 没对上歌单的文件摆出来，别让它们悄悄消失
  function renderUnmatched(missed) {
    var box = el.unmatchedBox, list = el.unmatchedList;
    if (!box || !list) return;
    var names = (missed || []).filter(Boolean);
    if (!names.length) { box.hidden = true; return; }
    list.innerHTML = names.map(function (n) {
      return '<li>' + esc(n) + "</li>";
    }).join("");
    box.hidden = false;
  }

  // ---------- 备份：导入的东西存在 localStorage，清缓存就没了 ----------
  function exportBackup() {
    var keys = Object.keys(state.lrc);
    if (!keys.length) { toast("还没有歌词可以导出"); return; }
    var payload = { _v: 1, _at: new Date().toISOString(), lrc: state.lrc };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "演唱会歌词备份-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("已导出 " + keys.length + " 首");
  }

  function importBackup(file) {
    var fr = new FileReader();
    fr.onload = function () {
      var data;
      try { data = JSON.parse(fr.result); }
      catch (e) { toast("这个文件不是有效的备份"); return; }
      var incoming = data && data.lrc && typeof data.lrc === "object" ? data.lrc : null;
      if (!incoming) { toast("备份文件里没有歌词数据"); return; }
      var added = 0;
      Object.keys(incoming).forEach(function (k) {
        var v = incoming[k];
        if (v && ((Array.isArray(v.lines) && v.lines.length) || (Array.isArray(v.plain) && v.plain.length))) {
          state.lrc[k] = v;
          added++;
        }
      });
      if (!added) { toast("备份里没有可用的歌词"); return; }
      saveStore(STORE_LRC, state.lrc);
      renderSetlist();
      renderDrawer();
      toast("已恢复 " + added + " 首");
    };
    fr.readAsText(file, "utf-8");
  }

  // 手动粘贴：没有 .lrc 文件、只有一段带时间戳的文本时用
  function importText(text, label) {
    var parsed = window.LRC.parse(text);
    if (!hasLyrics(parsed)) { toast("没解析出歌词"); return false; }
    var hit = matchTrack(label || "");
    var key = hit ? hit.title : (label || "手动粘贴").trim();
    state.lrc[key] = parsed;
    saveStore(STORE_LRC, state.lrc);
    renderSetlist();
    renderDrawer();
    toast((hit ? "已导入《" + hit.title + "》" : "已导入（未匹配歌单）") + " · " + parsed.lines.length + " 行");
    return true;
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }
  var toastEl, toastTimer;
  (function () { toastEl = el.toast; })();

  // 一份歌词「有没有词」：带时间戳的算正常，没有时间戳的纯文本也算
  function hasLyrics(d) {
    return !!(d && ((d.lines && d.lines.length) || (d.plain && d.plain.length)));
  }
  // 有没有时间轴 —— 没有就做不了滚动同步，只能当静态歌词看
  function hasTiming(d) {
    return !!(d && d.lines && d.lines.length);
  }

  // ---------- 打开某首歌 ----------
  function openSong(idx, autoplay) {
    state.cur = idx;
    var t = TRACKS[idx];
    if (!t) return;
    el.song.textContent = t.title;
    el.part.textContent = "第 " + t.index + " 首 · " + t.part;
    state.data = state.lrc[t.title] || null;

    if (hasTiming(state.data)) {
      el.scroll.innerHTML = state.data.lines.map(function (l, i) {
        return '<p class="ly-line" data-i="' + i + '">' + esc(l.text || "♪") + "</p>";
      }).join("");
      el.empty.hidden = true;
      el.totalT.textContent = window.LRC.fmt(state.data.duration);
      state.time = 0;
      // 用 -2 而不是 -1：render() 里 `idx === state.activeLine` 会早退，
      // 开唱前 indexAt 返回 -1，若这里也写 -1 就一次类都不上，第一句连
      // 「下一句」的提亮都没有。-2 强制首帧渲染，idx=-1 时第 0 行成为下一句。
      state.activeLine = -2;
      setTimingUI(true);
      setPlaying(!!autoplay);
      render();
    } else if (hasLyrics(state.data)) {
      // 这份歌词没有时间戳（原版常常如此），做不了滚动同步，
      // 就把整首铺成静态歌词墙 —— 词能看总比显示「缺歌词」强
      el.scroll.innerHTML = state.data.plain.map(function (x, i) {
        return '<p class="ly-line is-plain" data-i="' + i + '">' + esc(x) + "</p>";
      }).join("");
      el.empty.hidden = true;
      el.now.textContent = "—";
      el.totalT.textContent = "无时间轴";
      state.time = 0;
      state.activeLine = -1;
      state.playing = false;
      setTimingUI(false);
      updatePlayIcon();
    } else {
      el.scroll.innerHTML = "";
      el.empty.hidden = false;
      el.totalT.textContent = "0:00";
      state.data = null;
      state.playing = false;
      setTimingUI(true);
      updatePlayIcon();
    }
    applySize();
    el.setlist.classList.remove("is-active");
    el.lyrics.classList.add("is-active");
    if (autoplay) requestWakeLock();
  }

  function closeSong() {
    stop();
    el.lyrics.classList.remove("is-active");
    el.setlist.classList.add("is-active");
    releaseWakeLock();
  }

  // ---------- 时钟 ----------
  // 页面不放音频，只有一条虚拟时钟，所以"这首放完了"只能按最后一句歌词的
  // 时间戳加一段尾奏来估 —— 没有别的依据。尾奏留 8 秒让器乐收一收再翻页。
  var TAIL = 8;

  function tick() {
    // 循环绝不能因为一次异常就断掉：requestAnimationFrame(tick) 在函数末尾，
    // 中间抛错就等于永久停摆，之后点播放也没反应 —— 现场那是最糟的失败方式。
    try {
      if (state.playing) {
        state.time = (performance.now() - state.startedAt) / 1000 + state.offset;
        if (state.data && state.time > state.data.duration + TAIL) {
          // 放完接着放下一首；已经是最后一首就停在原地，不循环
          var next = state.cur + 1;
          if (next < TRACKS.length) {
            toast("接着放《" + TRACKS[next].title + "》");
            openSong(next, true);          // 内部已自行渲染，这里不再 render
          } else {
            state.time = state.data.duration + TAIL;
            setPlaying(false);
            render();
          }
        } else {
          render();
        }
      }
    } catch (err) {
      if (window.console && console.error) console.error("[lyrics] tick 出错", err);
    }
    // 无论如何都要排下一帧。这里绝不能出现 return —— 那会连同下面这行一起
    // 跳过，时钟就此永久停摆（曾经真踩过：自动续播一次之后整个页面就不走了）。
    state.raf = requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    state.playing = !!on && !!(state.data && state.data.lines.length);
    if (state.playing) {
      state.startedAt = performance.now() - (state.time - state.offset) * 1000;
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    updatePlayIcon();
    el.badge.hidden = state.playing || !state.data;
  }

  function updatePlayIcon() {
    // 图标切换走按钮身上的类，不能用 el.icPause.hidden ——
    // SVG 元素没有 hidden 这个 IDL 属性，那样写只是挂了个 JS 属性，
    // 属性根本没变，图标永远不会切。
    el.play.classList.toggle("is-playing", state.playing);
    el.play.setAttribute("aria-label", state.playing ? "暂停" : "播放");
    el.badge.hidden = state.playing || !state.data;
  }

  // 无时间轴时把播放键/上下首/进度条收掉，它们在这份歌词上没有意义。
  // 字号**保留**：静态歌词墙没有滚动跟随，正是最需要手动放大的时候，
  // 所以只把偏移那一行藏起来，不整个禁用调节键。
  function setTimingUI(on) {
    if (el.btns) el.btns.classList.toggle("no-timing", !on);
    if (el.seek) el.seek.disabled = !on;
    if (el.offRow) el.offRow.hidden = !on;
    if (!on && el.adjustBox && !el.adjustBox.hidden) {
      el.adjustBox.hidden = true;
      if (el.adjustBtn) el.adjustBtn.classList.remove("is-on");
    }
  }

  function stop() {
    state.playing = false;
    // 注意不要在这里 cancelAnimationFrame：那个 rAF 是整个页面唯一的时钟，
    // 一旦取消，后面的歌就再也播不动了（表现是点播放没反应、时间不走）。
    updatePlayIcon();
  }

  // ---------- 渲染 ----------
  function render() {
    if (!hasTiming(state.data)) return;
    var idx = window.LRC.indexAt(state.data.lines, state.time);
    el.now.textContent = window.LRC.fmt(state.time);
    var dur = state.data.duration || 1;
    if (!el.seek.dataset.dragging) {
      el.seek.value = String(Math.round(Math.max(0, Math.min(1, state.time / dur)) * 1000));
    }

    if (idx === state.activeLine) return;
    state.activeLine = idx;
    var nodes = el.scroll.children;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle("is-active", i === idx);
      nodes[i].classList.toggle("is-past", i < idx);
      // 下一句提前提亮；还没开唱（idx=-1）时第一句就是「下一句」
      nodes[i].classList.toggle("is-next", i === idx + 1);
    }
    scrollToLine(idx);
  }

  // 当前行滚到视口正中。留出上下各 1/3 屏，方便看上下文
  function scrollToLine(idx) {
    var stageH = el.stage.clientHeight;
    var max = Math.max(0, el.scroll.scrollHeight - stageH);
    // idx 为 -1 表示还没唱到第一句，必须显式回到顶部。
    // 换歌时浏览器只把容器的 scrollTop 按新内容的最大滚动量夹一下就保留原值，
    // 并不会自己归零 —— 不主动滚回去的话，新歌会停在上首歌的底部，
    // 第一行落在视口外老远，看着就像「卡住了」。
    var node = idx >= 0 ? el.scroll.children[idx] : null;
    if (!node) { el.scroll.scrollTo({ top: 0, behavior: "auto" }); return; }
    var want = node.offsetTop - stageH / 2 + node.offsetHeight / 2;
    el.scroll.scrollTo({ top: Math.max(0, Math.min(max, want)), behavior: "smooth" });
  }

  // ---------- 字号 ----------
  function applySize() {
    var px = SIZES[state.sizeIdx];
    el.scroll.style.fontSize = px + "px";
    if (el.fsVal) el.fsVal.textContent = String(px);
    saveStore(STORE_UI, { sizeIdx: state.sizeIdx });
  }

  function bumpSize(d) {
    var n = Math.max(0, Math.min(SIZES.length - 1, state.sizeIdx + d));
    if (n === state.sizeIdx) return;
    state.sizeIdx = n;
    applySize();
  }

  // ---------- 偏移 ----------
  function setOffset(v) {
    state.offset = Math.max(-30, Math.min(30, v));
    // 归零时不带正号，"+0.0s" 看着像还有偏移
    el.offVal.textContent = (state.offset > 0 ? "+" : "") + state.offset.toFixed(1) + "s";
    saveStore(STORE_UI, { sizeIdx: state.sizeIdx, offset: state.offset });
  }

  // ---------- 抽屉 ----------
  function renderDrawer() {
    el.drawerList.innerHTML = TRACKS.map(function (t, i) {
      var has = !!state.lrc[t.title];
      return '<button class="dw-item' + (i === state.cur ? " is-cur" : "") + '" data-i="' + i + '">' +
        '<span class="dw-no">' + t.index + "</span>" +
        '<span class="dw-name">' + esc(t.title) + "</span>" +
        (has ? '<span class="dw-ok">词</span>' : "") +
        "</button>";
    }).join("");
    Array.prototype.forEach.call(el.drawerList.querySelectorAll(".dw-item"), function (b) {
      b.addEventListener("click", function () {
        el.drawer.hidden = true;
        openSong(Number(b.getAttribute("data-i")), true);
      });
    });
  }

  // ---------- 屏幕常亮（手机上省得手动解锁）----------
  function requestWakeLock() {
    if (state.wakeLock || !navigator.wakeLock) return;
    navigator.wakeLock.request("screen").then(function (w) {
      state.wakeLock = w;
      w.addEventListener("release", function () { state.wakeLock = null; });
    }).catch(function () { /* 不支持就算了，不影响主功能 */ });
  }
  function releaseWakeLock() {
    if (!state.wakeLock) return;
    try { state.wakeLock.release(); } catch (e) { /* 忽略 */ }
    state.wakeLock = null;
  }

  // ---------- 歌词数据 ----------
  // 整份歌词打包成一个 lyrics.json，启动时一次读完。
  // 格式与「恢复备份」完全一致，所以同一个文件既是数据源也是备份，
  // 换设备时只需传这一个文件。缺这个文件时不报错，直接用 localStorage 里
  // 手动导入过的那些继续用。
  var LYRICS_FILE = "lyrics.json";

  function loadLyrics(cb) {
    cb = cb || function () {};
    if (typeof fetch !== "function") { cb(0); return; }
    fetch(LYRICS_FILE + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var bag = data && data.lrc;
        if (!bag || typeof bag !== "object") throw new Error("格式不对");
        var n = 0;
        Object.keys(bag).forEach(function (k) {
          if (hasLyrics(bag[k])) { state.lrc[k] = bag[k]; n++; }
        });
        if (n) { saveStore(STORE_LRC, state.lrc); renderSetlist(); renderDrawer(); }
        cb(n);
      })
      .catch(function () { cb(0); });   // 没有这个文件是正常情况，不打扰
  }

  // ---------- 事件 ----------
  bindFileInput(el.lrcInput);
  bindFileInput(el.lrcInput2);

  // 粘贴导入
  if (el.pasteBtn) {
    el.pasteBtn.addEventListener("click", function () {
      el.pasteBox.hidden = !el.pasteBox.hidden;
      if (!el.pasteBox.hidden) setTimeout(function () { el.pasteArea.focus(); }, 30);
    });
  }
  if (el.pasteCancel) el.pasteCancel.addEventListener("click", function () { el.pasteBox.hidden = true; });
  if (el.pasteOk) {
    el.pasteOk.addEventListener("click", function () {
      var txt = el.pasteArea.value || "";
      if (importText(txt, el.pasteName.value)) {
        el.pasteArea.value = "";
        el.pasteName.value = "";
        el.pasteBox.hidden = true;
      }
    });
  }

  // 备份导出 / 恢复
  if (el.backupBtn) el.backupBtn.addEventListener("click", exportBackup);
  if (el.backupInput) {
    el.backupInput.addEventListener("change", function () {
      var f = (el.backupInput.files || [])[0];
      if (f) importBackup(f);
      el.backupInput.value = "";
    });
  }

  el.back.addEventListener("click", closeSong);
  el.listBtn.addEventListener("click", function () {
    renderDrawer();
    el.drawer.hidden = !el.drawer.hidden;
  });
  el.drawerClose.addEventListener("click", function () { el.drawer.hidden = true; });
  el.drawer.addEventListener("click", function (e) { if (e.target === el.drawer) el.drawer.hidden = true; });

  el.play.addEventListener("click", function () { setPlaying(!state.playing); });

  // 点歌词区暂停/继续
  el.stage.addEventListener("click", function () {
    if (!state.data) return;
    setPlaying(!state.playing);
  });
  el.stage.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (state.data) setPlaying(!state.playing); }
  });

  el.fsPlus.addEventListener("click", function () { bumpSize(1); });
  el.fsMinus.addEventListener("click", function () { bumpSize(-1); });

  el.prev.addEventListener("click", function () {
    if (!TRACKS.length) return;
    openSong((state.cur - 1 + TRACKS.length) % TRACKS.length, true);
  });
  el.next.addEventListener("click", function () {
    if (!TRACKS.length) return;
    openSong((state.cur + 1) % TRACKS.length, true);
  });

  // 进度条拖动
  function seekFromRange() {
    if (!hasTiming(state.data)) return;
    var dur = state.data.duration || 0;
    state.time = (Number(el.seek.value) / 1000) * dur;
    state.startedAt = performance.now() - (state.time - state.offset) * 1000;
    state.activeLine = -1;   // 强制重绘
    render();
  }
  el.seek.addEventListener("input", function () { el.seek.dataset.dragging = "1"; seekFromRange(); });
  el.seek.addEventListener("change", function () { delete el.seek.dataset.dragging; seekFromRange(); });

  // 点某一行歌词跳到那一句
  el.scroll.addEventListener("click", function (e) {
    var p = e.target.closest(".ly-line");
    if (!p || !hasTiming(state.data)) return;   // 无时间轴的歌词不可点跳
    e.stopPropagation();
    var i = Number(p.getAttribute("data-i"));
    state.time = state.data.lines[i].t;
    state.startedAt = performance.now() - (state.time - state.offset) * 1000;
    state.activeLine = -1;
    render();
    setPlaying(true);
  });

  // 顶栏调节键：展开字号 / 偏移面板。点面板外或按 Esc 收起
  if (el.adjustBtn && el.adjustBox) {
    el.adjustBtn.addEventListener("click", function () {
      el.adjustBox.hidden = !el.adjustBox.hidden;
      el.adjustBtn.classList.toggle("is-on", !el.adjustBox.hidden);
    });
    el.adjustBox.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function (e) {
      if (el.adjustBox.hidden) return;
      if (el.adjustBox.contains(e.target) || el.adjustBtn.contains(e.target)) return;
      el.adjustBox.hidden = true;
      el.adjustBtn.classList.remove("is-on");
    });
  }
  el.offMinus.addEventListener("click", function () { setOffset(state.offset - 0.5); });
  el.offPlusBtn.addEventListener("click", function () { setOffset(state.offset + 0.5); });
  el.offReset.addEventListener("click", function () { setOffset(0); });

  // 空格 = 播放/暂停，方向键 = 快退快进 5 秒
  document.addEventListener("keydown", function (e) {
    if (!el.lyrics.classList.contains("is-active")) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
    if (e.key === " ") { e.preventDefault(); if (state.data) setPlaying(!state.playing); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); seekTo(state.time - 5); }
    else if (e.key === "ArrowRight") { e.preventDefault(); seekTo(state.time + 5); }
    else if (e.key === "Escape") closeSong();
  });

  function seekTo(t) {
    if (!hasTiming(state.data)) return;
    state.time = Math.max(0, Math.min(state.data.duration, t));
    state.startedAt = performance.now() - (state.time - state.offset) * 1000;
    state.activeLine = -1;
    render();
  }

  // ---------- 启动 ----------
  (function init() {
    var cached = loadStore(STORE_LRC, {});
    state.lrc = cached && typeof cached === "object" ? cached : {};
    var ui = loadStore(STORE_UI, {});
    if (typeof ui.sizeIdx === "number") state.sizeIdx = Math.max(0, Math.min(SIZES.length - 1, ui.sizeIdx));
    if (typeof ui.offset === "number") setOffset(ui.offset);
    else setOffset(0);

    renderSetlist();
    renderDrawer();
    el.scroll.style.fontSize = SIZES[state.sizeIdx] + "px";

    state.raf = requestAnimationFrame(tick);

    // 再读一遍 lyrics.json，覆盖 localStorage 里的旧副本
    loadLyrics(function (n) {
      if (n) toast("已加载 " + n + " 首歌词");
    });
  })();
})();
