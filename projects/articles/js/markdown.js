/* ============================================================
 * 极简 Markdown 解析器 · markdown.js
 * ------------------------------------------------------------
 * 站点要求零第三方请求，所以不能引 marked / markdown-it 之类
 * 的 CDN 版本，这里手写一个够用的实现。
 *
 * 支持：ATX 标题（# ~ ######）、分隔线、无序 / 有序列表、
 *       引用块（含懒续行）、GFM 表格（含对齐）、
 *       围栏代码块（```lang）、行内 `code` / **粗** / *斜* /
 *       [链接](url) / 裸 URL 自动链接。
 * 不支持：HTML 内嵌、图片、脚注、任务列表、深层嵌套列表。
 *
 * 安全：先整体转义再套标签；链接只放行 http/https/mailto 与
 *      相对路径，所以 md 里写 <script> 只会变成文本。
 * 用法：MD.render('# 标题\n\n正文') → HTML 字符串
 * ============================================================ */
(function (global) {
  "use strict";

  /* 占位符用 NUL 分隔前后。它只在解析过程里短暂存在，
   * 源码里写成转义序列而不是裸控制字符 —— 裸 NUL 会让部分
   * 工具把 .js 当成二进制文件。 */
  var PH = String.fromCharCode(0);
  var PH_RE = new RegExp(PH + "(\\d+)" + PH, "g");

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* 只放行安全协议与相对路径，挡掉 javascript: / data: */
  function safeUrl(url) {
    var raw = String(url == null ? "" : url).trim();
    if (!raw) return "";
    if (raw.charAt(0) === "#" || raw.charAt(0) === "/" ||
        raw.indexOf("./") === 0 || raw.indexOf("../") === 0) {
      return escapeHtml(raw);
    }
    if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) return escapeHtml(raw);
    return "";
  }

  /* ---------- 行内 ---------- */

  /* 只做强调，不碰占位符。
     链接文字复用它，所以这里必须保持纯粹。 */
  function emphasis(text) {
    return String(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }

  /* 行内解析。顺序：行内代码 → 链接 → 裸 URL → 强调。
     每处理完一种就把结果收进 store 并留一个占位符，
     后面的正则因此不会回头改写已定稿的片段。
     注意：还原只做一次，且在最后统一做。 */
  function inline(src) {
    var store = [];
    function keep(html) {
      store.push(html);
      return PH + (store.length - 1) + PH;
    }

    var s = escapeHtml(src);

    // 1. 行内代码：内部不再做任何替换
    s = s.replace(/`([^`]+)`/g, function (_, code) {
      return keep("<code>" + code + "</code>");
    });

    // 2. 链接：整段摘成占位符，裸 URL 规则就不会把 href 也链一遍
    s = s.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, function (whole, text, url) {
      var href = safeUrl(url);
      if (!href) return whole; // 协议不安全就当普通文本
      // text 取自已转义的字符串，不能再转义一次
      return keep('<a href="' + href + '" target="_blank" rel="noopener">' +
        emphasis(text) + "</a>");
    });

    // 3. 裸 URL 自动链接
    s = s.replace(/(^|[\s(])((?:https?:\/\/|mailto:)[^\s<>"')\]]+)/g, function (_, pre, url) {
      var trimmed = url.replace(/[.,;:]+$/, "");
      var tail = url.slice(trimmed.length);
      return pre + keep('<a href="' + escapeHtml(trimmed) + '" target="_blank" rel="noopener">' +
        escapeHtml(trimmed) + "</a>") + tail;
    });

    // 4. 强调
    s = emphasis(s);

    // 5. 统一还原
    return s.replace(PH_RE, function (_, i) {
      return store[+i];
    });
  }

  /* ---------- 块级 ---------- */

  var RE = {
    fence: /^```([A-Za-z0-9_+-]*)\s*$/,
    heading: /^(#{1,6})\s+(.*?)\s*#*\s*$/,
    hr: /^(-{3,}|\*{3,}|_{3,})\s*$/,
    quote: /^>\s?(.*)$/,
    ulItem: /^[-*+]\s+(.*)$/,
    olItem: /^(\d{1,9})[.)]\s+(.*)$/,
    tableSep: /^\s*\|?[\s:]*-{1,}[\s:|-]*\|?\s*$/
  };

  function splitRow(line) {
    var s = String(line).trim();
    if (s.charAt(0) === "|") s = s.slice(1);
    if (s.charAt(s.length - 1) === "|") s = s.slice(0, -1);
    var cells = [];
    var cur = "";
    for (var i = 0; i < s.length; i++) {
      if (s.charAt(i) === "\\" && s.charAt(i + 1) === "|") {
        cur += "|";
        i++;
      } else if (s.charAt(i) === "|") {
        cells.push(cur);
        cur = "";
      } else {
        cur += s.charAt(i);
      }
    }
    cells.push(cur);
    return cells.map(function (c) { return c.trim(); });
  }

  function alignmentsOf(sepLine) {
    return splitRow(sepLine).map(function (c) {
      var left = c.charAt(0) === ":";
      var right = c.charAt(c.length - 1) === ":";
      if (left && right) return "center";
      if (right) return "right";
      if (left) return "left";
      return "";
    });
  }

  function slugify(text) {
    return String(text).toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function render(src) {
    var lines = String(src == null ? "" : src).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      /* 空行 */
      if (!line.trim()) { i++; continue; }

      /* 围栏代码块 */
      var f = line.match(RE.fence);
      if (f) {
        var lang = f[1] || "";
        var body = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          body.push(lines[i]);
          i++;
        }
        i++; // 吃掉收尾的 ```
        out.push(
          '<pre class="md-code"' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : "") +
          "><code>" + escapeHtml(body.join("\n")) + "</code></pre>"
        );
        continue;
      }

      /* 分隔线 */
      if (RE.hr.test(line)) { out.push("<hr />"); i++; continue; }

      /* ATX 标题 */
      var h = line.match(RE.heading);
      if (h) {
        var lvl = h[1].length;
        out.push('<h' + lvl + ' id="h-' + slugify(h[2]) + '">' + inline(h[2]) +
          "</h" + lvl + ">");
        i++;
        continue;
      }

      /* 表格：当前行含 |，且下一行是分隔行 */
      if (line.indexOf("|") !== -1 && i + 1 < lines.length &&
          lines[i + 1].indexOf("-") !== -1 && RE.tableSep.test(lines[i + 1])) {
        var head = splitRow(line);
        var aligns = alignmentsOf(lines[i + 1]);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].indexOf("|") !== -1 && lines[i].trim()) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        var thead = "<tr>" + head.map(function (c, k) {
          return '<th' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : "") + ">" +
            inline(c) + "</th>";
        }).join("") + "</tr>";
        var tbody = rows.map(function (r) {
          return "<tr>" + head.map(function (_, k) {
            return '<td' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : "") + ">" +
              inline(r[k] == null ? "" : r[k]) + "</td>";
          }).join("") + "</tr>";
        }).join("");
        out.push('<div class="md-table-wrap"><table class="md-table"><thead>' + thead +
          "</thead><tbody>" + tbody + "</tbody></table></div>");
        continue;
      }

      /* 引用块：连续 > 行，允许后续非 > 行懒续写 */
      if (RE.quote.test(line)) {
        var q = [];
        while (i < lines.length) {
          if (RE.quote.test(lines[i])) {
            q.push(lines[i].match(RE.quote)[1]);
            i++;
          } else if (lines[i].trim() && !RE.fence.test(lines[i])) {
            q.push(lines[i]); // 懒续行
            i++;
          } else {
            break;
          }
        }
        out.push('<blockquote class="md-quote">' + render(q.join("\n")) + "</blockquote>");
        continue;
      }

      /* 列表：连续同类标记，缩进行并入上一项 */
      if (RE.ulItem.test(line) || RE.olItem.test(line)) {
        var ordered = RE.olItem.test(line) && !RE.ulItem.test(line);
        var items = [];
        while (i < lines.length) {
          var li = lines[i].match(ordered ? RE.olItem : RE.ulItem);
          if (li) {
            items.push(li[ordered ? 2 : 1]);
            i++;
          } else if (lines[i].trim() && items.length &&
                     /^\s{2,}\S/.test(lines[i]) && !RE.ulItem.test(lines[i]) &&
                     !RE.olItem.test(lines[i])) {
            items[items.length - 1] += " " + lines[i].trim();
            i++;
          } else {
            break;
          }
        }
        var tag = ordered ? "ol" : "ul";
        out.push('<' + tag + ' class="md-list">' + items.map(function (t) {
          return "<li>" + inline(t) + "</li>";
        }).join("") + "</" + tag + ">");
        continue;
      }

      /* 段落：吃到空行或下一个块级起始为止 */
      var para = [line];
      i++;
      while (i < lines.length && lines[i].trim() &&
             !RE.fence.test(lines[i]) && !RE.heading.test(lines[i]) &&
             !RE.hr.test(lines[i]) && !RE.quote.test(lines[i]) &&
             !RE.ulItem.test(lines[i]) && !RE.olItem.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push("<p>" + inline(para.join(" ")) + "</p>");
    }

    return out.join("\n");
  }

  global.MD = { render: render, escapeHtml: escapeHtml };
})(window);