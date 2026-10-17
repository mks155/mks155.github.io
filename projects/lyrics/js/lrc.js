// LRC 解析 + 时间轴驱动
// ------------------------------------------------------------
// 只做一件事：把 .lrc 文本变成 [{ t: 秒, text: 歌词 }] 的有序数组，
// 并提供一个不漂移的时钟（用 performance.now，不用 setInterval 累加）。
//
// 时间轴为什么不用 Date.now()：手机在演唱会场馆里锁屏、系统改时区、
// 用户中途校时都会让墙上时钟跳变，导致歌词突然倒退或跳跃。
// performance.now() 是单调递增的，跨越这些情况都不会漂。
window.LRC = (function () {
  "use strict";

  // [mm:ss] / [mm:ss.xx] / [mm:ss.xxx]，也兼容 [mm:ss.x] 与带空白的形式
  var TIME_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  // 元信息标签：[ti:] [ar:] [al:] [by:] [offset:] 等
  var META_RE = /^\[[a-zA-Z]+:.*\]$/;

  function parse(text) {
    var lines = [];
    var plain = [];
    var meta = {};
    var raw = String(text || "").replace(/\r\n?/g, "\n").split("\n");

    for (var i = 0; i < raw.length; i++) {
      var line = raw[i].trim();
      if (!line) continue;

      // 纯元信息行，如 [ti:光芒]
      if (META_RE.test(line)) {
        var kv = line.replace(/^\[|\]$/g, "");
        var p = kv.indexOf(":");
        if (p > 0) meta[kv.slice(0, p).trim().toLowerCase()] = kv.slice(p + 1).trim();
        continue;
      }

      // 网易云有把歌词存成 JSON 的（{"c":[{"tx":"..."}]}），纯结构噪音，跳过
      if (line.charAt(0) === "{") continue;

      // 行内可能有多个时间戳，常见于重复副歌
      TIME_RE.lastIndex = 0;
      var stamps = [];
      var m;
      while ((m = TIME_RE.exec(line)) !== null) {
        var min = parseInt(m[1], 10);
        var sec = parseInt(m[2], 10);
        var frac = m[3];
        var ms = 0;
        if (frac) {
          // .5 -> 500ms ; .05 -> 50ms ; .050 -> 50ms（按位数补齐）
          ms = parseFloat("0." + frac) * 1000;
        }
        stamps.push(min * 60 + sec + ms / 1000);
        // 防止同一行的时间戳互相吃掉
        if (TIME_RE.lastIndex >= line.length) break;
      }
      if (!stamps.length) {
        // 有些版本的 .lrc 是没有时间戳的纯文本歌词（下载的原版常常如此）。
        // 这类没法滚动同步，但词本身能看，留着当静态歌词用。
        plain.push(line);
        continue;
      }

      var content = line.replace(TIME_RE, "").trim();
      for (var j = 0; j < stamps.length; j++) {
        lines.push({ t: stamps[j], text: content });
      }
    }

    lines.sort(function (a, b) {
      if (a.t !== b.t) return a.t - b.t;
      return 0;
    });

    // LRC 的 [offset:] 是毫秒，正数表示歌词要提前显示
    if (meta.offset !== undefined) {
      var off = parseFloat(meta.offset) / 1000;
      if (!isNaN(off)) for (var k = 0; k < lines.length; k++) lines[k].t -= off;
    }

    // 只要有带时间戳的行，就认为它是正常的歌词；否则把纯文本整段当歌词
    return {
      lines: lines,
      plain: lines.length ? [] : plain,
      meta: meta,
      duration: lines.length ? lines[lines.length - 1].t : 0
    };
  }

  // 二分找当前应显示的行号（返回最后一条 t <= time 的下标，没有则 -1）
  function indexAt(lines, time) {
    var lo = 0, hi = lines.length - 1, ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (lines[mid].t <= time) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return ans;
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  return {
    parse: parse,
    indexAt: indexAt,
    fmt: fmt
  };
})();
