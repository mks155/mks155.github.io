/* 节日彩蛋 · 主页
 * ------------------------------------------------------------
 * 每年按本地日期自动出现，公历、农历、第几个周日都支持：
 * 夏历节日（春节 / 端午 / 中秋 …）按农历月日匹配，母亲节父亲节按“某月第几个周日”，
 * 其余按公历区间匹配，跨年的区间（12-31 ~ 01-02）比大小会自动绕回去。
 * 节日清单都在下面的 EGGS 里，加节日往数组里塞一条即可（顺序即优先级）。
 * 想随时预览：index.html?egg=<id> / ?egg=off
 * 每次进入都会出现：不写任何存储，关掉只在当前页面生效，刷新就回来。
 */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- 农历 ----------
   * 1900-2100 每年的闰月与大小月表。只在匹配农历节日时算一次，
   * 页面其他部分不依赖它。 */
  var LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a4d0, 0x0d150, 0x0f252,
    0x0d520
  ];

  function leapMonth(y) {
    return LUNAR_INFO[y - 1900] & 0xf;
  }

  function leapDays(y) {
    if (!leapMonth(y)) return 0;
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
  }

  function monthDays(y, m) {
    return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  }

  function yearDays(y) {
    var sum = 348;
    for (var i = 0x8000; i > 0x8; i >>= 1) {
      if (LUNAR_INFO[y - 1900] & i) sum++;
    }
    return sum + leapDays(y);
  }

  var EPOCH = Date.UTC(1900, 0, 31);
  var DAY = 86400000;

  /* 公历日期 → { y, m, d, isLeap }；超出 1900-2100 返回 null */
  function solar2lunar(date) {
    var gy = date.getFullYear();
    if (gy < 1900 || gy > 2100) return null;

    var offset = Math.round((Date.UTC(gy, date.getMonth(), date.getDate()) - EPOCH) / DAY);
    var i, temp = 0;

    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = yearDays(i);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      i--;
    }

    var lunarYear = i;
    var leap = leapMonth(i);
    var isLeap = false;

    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) {
        --i;
        isLeap = true;
        temp = leapDays(lunarYear);
      } else {
        temp = monthDays(lunarYear, i);
      }
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }

    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) {
        isLeap = false;
      } else {
        isLeap = true;
        --i;
      }
    }
    if (offset < 0) {
      offset += temp;
      --i;
    }

    return { y: lunarYear, m: i, d: offset + 1, isLeap: isLeap };
  }

  /* ---------- 彩蛋表 ----------
   * rule.kind
   *   solar  公历 [from, to]，月份日拼成四位数字比大小，from > to 表示跨年
   *   lunar  农历 [月, 日] 区间，闰月不算
   *   nth    某月第 n 个星期几（weekday：0 周日 … 6 周六）
   *   eve    除夕——明天是正月初一
   * fx
   *   rain   字符下落（chars）
   *   float  符号漂浮（glyphs）
   *   flake  彩色碎片下落（colors）
   */
  var EGGS = [
    {
      id: "chuxi",
      name: "除夕",
      accent: "#ff6b57",
      glyph: "🧧",
      line: "年夜饭，守岁到零点",
      fx: "float",
      glyphs: ["🧧", "🏮", "✨"],
      rule: { kind: "eve" }
    },
    {
      id: "chunjie",
      name: "春节",
      accent: "#ff5b5b",
      glyph: "福",
      line: "过年好，愿你今年一次跑通",
      fx: "rain",
      chars: "福",
      rule: { kind: "lunar", from: [1, 1], to: [1, 3] }
    },
    {
      id: "yuanxiao",
      name: "元宵节",
      accent: "#ffc75f",
      glyph: "🏮",
      line: "灯亮着，汤圆还热着",
      fx: "float",
      glyphs: ["🏮", "✨"],
      rule: { kind: "lunar", from: [1, 15], to: [1, 15] }
    },
    {
      id: "duanwu",
      name: "端午节",
      accent: "#57c98a",
      glyph: "🐉",
      line: "粽子咸甜都行，别吵",
      fx: "float",
      glyphs: ["🐉", "🎏"],
      rule: { kind: "lunar", from: [5, 5], to: [5, 5] }
    },
    {
      id: "qixi",
      name: "七夕",
      accent: "#c9a7ff",
      glyph: "✨",
      line: "抬头，银河就在那儿",
      fx: "float",
      glyphs: ["✨", "🌌"],
      rule: { kind: "lunar", from: [7, 7], to: [7, 7] }
    },
    {
      id: "zhongqiu",
      name: "中秋节",
      accent: "#ffcf6b",
      glyph: "🌕",
      line: "月亮圆了，人也该回了",
      fx: "float",
      glyphs: ["🌕", "🥮"],
      rule: { kind: "lunar", from: [8, 15], to: [8, 15] }
    },
    {
      id: "chongyang",
      name: "重阳节",
      accent: "#e0a35c",
      glyph: "🍂",
      line: "登高，也给长辈问个好",
      fx: "float",
      glyphs: ["🍂", "🌾"],
      rule: { kind: "lunar", from: [9, 9], to: [9, 9] }
    },
    {
      id: "yuandan",
      name: "元旦",
      accent: "#7cc4ff",
      glyph: "01",
      line: "新的一年，从第一行开始",
      fx: "flake",
      colors: ["#7cc4ff", "#ffffff", "#ffd166"],
      rule: { kind: "solar", from: 1231, to: 102 }
    },
    {
      id: "qingren",
      name: "情人节",
      accent: "#ff7aa2",
      glyph: "🌹",
      line: "今天适合说点好听的",
      fx: "float",
      glyphs: ["🌹", "💗"],
      rule: { kind: "solar", from: 214, to: 214 }
    },
    {
      id: "520",
      name: "520",
      accent: "#ff6f9c",
      glyph: "♥",
      line: "把喜欢说出口，别写在注释里",
      fx: "float",
      glyphs: ["💗", "💌", "✨"],
      rule: { kind: "solar", from: 520, to: 521 }
    },
    {
      id: "qingming",
      name: "清明",
      accent: "#8fd18a",
      glyph: "🌿",
      line: "雨落清明，出去走走",
      fx: "float",
      glyphs: ["🌿", "🌧️"],
      rule: { kind: "solar", from: 404, to: 406 }
    },
    {
      id: "laodong",
      name: "劳动节",
      accent: "#ffb14e",
      glyph: "🛠️",
      line: "今天不写代码，也算劳动",
      fx: "float",
      glyphs: ["🛠️", "☕"],
      rule: { kind: "solar", from: 501, to: 505 }
    },
    {
      id: "muqin",
      name: "母亲节",
      accent: "#ff9ec7",
      glyph: "🌷",
      line: "今天是她的节日，打个电话",
      fx: "float",
      glyphs: ["🌷", "💐"],
      rule: { kind: "nth", month: 5, weekday: 0, n: 2 }
    },
    {
      id: "ertong",
      name: "儿童节",
      accent: "#7ee0ff",
      glyph: "🎈",
      line: "心里那个小孩还在",
      fx: "float",
      glyphs: ["🎈", "🍭"],
      rule: { kind: "solar", from: 601, to: 601 }
    },
    {
      id: "fuqin",
      name: "父亲节",
      accent: "#79c0a5",
      glyph: "🌳",
      line: "也记得给家里打个电话",
      fx: "float",
      glyphs: ["🌳", "☕"],
      rule: { kind: "nth", month: 6, weekday: 0, n: 3 }
    },
    {
      id: "jiaoshi",
      name: "教师节",
      accent: "#8fb8ff",
      glyph: "📚",
      line: "离开学校，还在学",
      fx: "float",
      glyphs: ["📚", "✏️"],
      rule: { kind: "solar", from: 910, to: 910 }
    },
    {
      id: "guoqing",
      name: "国庆节",
      accent: "#ff5f5f",
      glyph: "★",
      line: "七天假，出门走走",
      fx: "flake",
      colors: ["#ff5f5f", "#ffd166", "#ffffff"],
      rule: { kind: "solar", from: 1001, to: 1007 }
    },
    {
      id: "1024",
      name: "程序员节",
      accent: "#3ddc84",
      glyph: "1024",
      line: "感谢你为这个世界注入的每一行代码",
      fx: "rain",
      chars: "01",
      rule: { kind: "solar", from: 1023, to: 1025 }
    },
    {
      id: "halloween",
      name: "万圣节",
      accent: "#ff9f43",
      glyph: "🎃",
      line: "不给糖就捣蛋",
      fx: "float",
      glyphs: ["🎃", "🦇", "👻", "🕸️"],
      rule: { kind: "solar", from: 1029, to: 1101 }
    },
    {
      id: "dongzhi",
      name: "冬至",
      accent: "#9fd8ff",
      glyph: "🥟",
      line: "饺子还是汤圆，你定",
      fx: "float",
      glyphs: ["🥟", "❄️"],
      rule: { kind: "solar", from: 1221, to: 1223 }
    },
    {
      id: "shengdan",
      name: "圣诞",
      accent: "#58d68d",
      glyph: "🎄",
      line: "拆礼物，许个愿",
      fx: "float",
      glyphs: ["🎄", "🎁", "❄️"],
      rule: { kind: "solar", from: 1224, to: 1225 }
    }
  ];

  /* 月份和日期拼成四位数字再比大小，跨年区间（12-31 ~ 01-02）绕回来比 */
  function dayKey(d) {
    return (d.getMonth() + 1) * 100 + d.getDate();
  }

  function match(egg, d) {
    var r = egg.rule;

    if (r.kind === "solar") {
      var k = dayKey(d);
      return r.from <= r.to ? (k >= r.from && k <= r.to) : (k >= r.from || k <= r.to);
    }

    if (r.kind === "nth") {
      if (d.getMonth() + 1 !== r.month) return false;
      return d.getDay() === r.weekday && Math.floor((d.getDate() - 1) / 7) + 1 === r.n;
    }

    if (r.kind === "lunar") {
      var l = solar2lunar(d);
      if (!l || l.isLeap) return false;
      var v = l.m * 100 + l.d;
      return v >= r.from[0] * 100 + r.from[1] && v <= r.to[0] * 100 + r.to[1];
    }

    if (r.kind === "eve") {
      var t = solar2lunar(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
      return !!t && t.m === 1 && t.d === 1 && !t.isLeap;
    }

    return false;
  }

  /* 命中多个节日时按 EGGS 顺序取第一个 */
  function pick(d) {
    for (var i = 0; i < EGGS.length; i++) {
      if (match(EGGS[i], d)) return EGGS[i];
    }
    return null;
  }

  /* 从某天起往后找这个节日最近的一次，用来给卡片写对日期
     （?egg= 预览时今天未必是节日，日期得算出来才不别扭） */
  function nextDate(egg, from) {
    for (var i = 0; i < 400; i++) {
      var d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      if (match(egg, d)) return d;
    }
    return from;
  }

  function byId(id) {
    for (var i = 0; i < EGGS.length; i++) {
      if (EGGS[i].id === id) return EGGS[i];
    }
    return null;
  }

  function rgba(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  /* 卡片右上角那行日期，按中文习惯写 */
  function dateLabel(d) {
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  var query = "";
  try {
    query = (new URLSearchParams(location.search).get("egg") || "").toLowerCase();
  } catch (e) {
    query = "";
  }

  var today = new Date();
  var egg = null;
  if (query !== "off") {
    egg = (query && byId(query)) || pick(today);
  }

  /* ---------- 环境特效 ---------- */

  function rain(egg) {
    var chars = (egg.chars || "01").split("");
    var frag = document.createDocumentFragment();
    var COLS = 15;
    for (var i = 0; i < COLS; i++) {
      var col = document.createElement("span");
      col.className = "egg-col";
      var len = 16 + Math.floor(Math.random() * 14);
      var digits = [];
      for (var j = 0; j < len; j++) digits.push(chars[Math.floor(Math.random() * chars.length)]);
      col.textContent = digits.join("\n");
      col.style.left = (i * (100 / COLS) + Math.random() * 3).toFixed(1) + "%";
      col.style.animationDuration = (7 + Math.random() * 9).toFixed(1) + "s";
      col.style.animationDelay = "-" + (Math.random() * 14).toFixed(1) + "s";
      frag.appendChild(col);
    }
    return frag;
  }

  function float(egg) {
    var glyphs = egg.glyphs || ["✨"];
    var frag = document.createDocumentFragment();
    var N = 12;
    for (var i = 0; i < N; i++) {
      var el = document.createElement("span");
      el.className = "egg-float";
      el.textContent = glyphs[i % glyphs.length];
      el.style.left = (4 + Math.random() * 90).toFixed(1) + "%";
      el.style.top = (6 + Math.random() * 82).toFixed(1) + "%";
      el.style.fontSize = (14 + Math.random() * 14).toFixed(0) + "px";
      el.style.animationDuration = (5 + Math.random() * 6).toFixed(1) + "s";
      el.style.animationDelay = "-" + (Math.random() * 8).toFixed(1) + "s";
      frag.appendChild(el);
    }
    return frag;
  }

  function flake(egg) {
    var colors = egg.colors || ["#ffd166"];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 26; i++) {
      var el = document.createElement("span");
      el.className = "egg-flake";
      el.style.left = (Math.random() * 100).toFixed(1) + "%";
      el.style.background = colors[i % colors.length];
      el.style.width = (5 + Math.random() * 5).toFixed(0) + "px";
      el.style.height = (10 + Math.random() * 8).toFixed(0) + "px";
      el.style.opacity = (0.4 + Math.random() * 0.35).toFixed(2);
      el.style.animationDuration = (7 + Math.random() * 7).toFixed(1) + "s";
      el.style.animationDelay = "-" + (Math.random() * 14).toFixed(1) + "s";
      frag.appendChild(el);
    }
    return frag;
  }

  /* ---------- 挂载 ---------- */

  function mount(current, when) {
    root.setAttribute("data-egg", current.id);
    root.style.setProperty("--egg-accent", current.accent);
    root.style.setProperty("--egg-edge", rgba(current.accent, 0.34));
    root.style.setProperty("--egg-glow", rgba(current.accent, 0.45));

    var fx = document.createElement("div");
    fx.className = "egg-fx";
    fx.setAttribute("aria-hidden", "true");
    var maker = current.fx === "float" ? float : current.fx === "flake" ? flake : rain;
    fx.appendChild(maker(current));
    document.body.appendChild(fx);

    var label = dateLabel(when);

    var card = document.createElement("aside");
    card.className = "egg-card";
    card.setAttribute("role", "complementary");
    card.setAttribute("aria-label", "节日彩蛋");
    card.innerHTML =
      '<button class="egg-close" type="button" aria-label="关闭彩蛋" title="关闭">×</button>' +
      '<p class="egg-kicker">' + label + "</p>" +
      '<p class="egg-title">' + current.name + "</p>" +
      '<p class="egg-line">' + current.line + "</p>" +
      '<span class="egg-glyph" aria-hidden="true">' + current.glyph + "</span>";

    function close() {
      card.remove();
      fx.remove();
      root.removeAttribute("data-egg");
      root.style.removeProperty("--egg-accent");
      root.style.removeProperty("--egg-edge");
      root.style.removeProperty("--egg-glow");
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    card.querySelector(".egg-close").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(card);

    console.log("%c" + label + " " + current.name, "color:" + current.accent + ";font-weight:700");
  }

  if (egg) {
    var when = nextDate(egg, today);
    if (document.body) mount(egg, when);
    else document.addEventListener("DOMContentLoaded", function () { mount(egg, when); });
  }

  /* 调试用：EASTER_EGG.pick(new Date(2026, 9, 31)) */
  window.EASTER_EGG = {
    eggs: EGGS,
    pick: pick,
    match: match,
    dayKey: dayKey,
    dateLabel: dateLabel,
    nextDate: nextDate,
    lunar: solar2lunar,
    active: egg ? egg.id : null
  };
})();
