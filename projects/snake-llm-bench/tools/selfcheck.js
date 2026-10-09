// SNAKE SCORE 自检脚本 —— 对应 rubric.js 第五节末尾的 7 条
// 用法：在任意目录下执行 node <仓库>/projects/snake-llm-bench/tools/selfcheck.js
// 不通过就不该提交：它挡的是「子项和≠总分」「等级算错」「标签越界」这类事故。
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "js") + path.sep;
global.window = {};
eval(fs.readFileSync(path.join(ROOT, "rubric.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "models.js"), "utf8"));
const R = window.SNAKE_LLM_RUBRIC, M = window.SNAKE_LLM_MODELS;

// 子项与轴的上限，直接取自 rubric
const SUBS_MAX = {};
const AXES_MAX = {};
for (const ax of R.axes) {
  AXES_MAX[ax.key] = ax.max;
  for (const sb of ax.subs) SUBS_MAX[sb.key] = sb.max;
}
// 每个子项允许的档位，直接取自 rubric 的 bands
const BANDS = {};
for (const ax of R.axes) for (const sb of ax.subs) {
  BANDS[sb.key] = sb.bands.map(b => b.pts).sort((a, b) => a - b);
}

const vocab = new Set();
for (const g of Object.values(R.tagVocabulary)) for (const w of g) vocab.add(w);
const defectKeys = new Set(Object.keys(R.defects));

let bad = 0;
const rows = [];
for (const m of M) {
  const rv = m.review, s = rv.subs, a = rv.axes, e = [];
  const y = el => el.replace(/[\s]/g, "").length;

  // 1 子项和 == 轴和 == 总分，且轴由子项推出
  const subSum = Object.values(s).reduce((x, v) => x + v, 0);
  const axSum = a.play + a.feel + a.show + a.done;
  if (subSum !== rv.score) e.push("子项和 " + subSum + " ≠ 总分 " + rv.score);
  if (axSum !== rv.score) e.push("轴和 " + axSum + " ≠ 总分 " + rv.score);
  const expAx = { play: s.boot + s.ctrl + s.rule, feel: s.pace + s.score,
                  show: s.vis + s.sfx, done: s.rob + s.adp };
  for (const k of Object.keys(AXES_MAX)) if (a[k] !== expAx[k]) e.push("轴 " + k + " 与子项不符");

  // 2 等级
  const g = R.grades.find(x => rv.score >= x.min).grade;
  if (g !== rv.grade) e.push("等级应为 " + g);

  // 3 verdict 只由 boot 与核心循环决定，不看总分
  const expV = s.boot === 0 ? "开局失效" : "可玩";
  if (rv.verdict !== expV) e.push("verdict 应为 " + expV + "（boot>0 即核心循环可玩）");

  // 4 tags
  if (m.tags[0] !== rv.verdict) e.push("tags[0] 与 verdict 不一致");
  for (const t of m.tags) if (!vocab.has(t)) e.push("标签不在词表: " + t);
  if (m.tags.length < 1 || m.tags.length > 4) e.push("标签数越界 " + m.tags.length);
  const cjk = m.tags.join("").replace(/[A-Za-z0-9]/g, "").length;
  if (cjk > 14) e.push("标签汉字 " + cjk + " > 14");

  // 5 defect 码
  for (const d of rv.defects) if (!defectKeys.has(d)) e.push("缺陷码未定义: " + d);

  // 6 zeroRule
  if (s.boot === 0) for (const [k, v] of Object.entries(s)) if (k !== "boot" && v !== 0) e.push("zeroRule 违规 " + k);

  // 7 note 规范（最高分 是游戏功能名，豁免）
  const n = m.note || "";
  const bare = n.replace(/最高分|最高纪录|最高/g, "");
  if (y(n) < 40 || y(n) > 80) e.push("note 长度 " + y(n) + " 不在 40-80");
  if (/最|唯一|全批|不如|比.{0,6}好/.test(bare)) e.push("note 含最高级/比较级");
  if (/localStorage|setInterval|requestAnimationFrame|函数|变量|rAF|const|canvas|touch/i.test(n)) e.push("note 含实现细节");
  if (/精美|丝滑|完美|震撼/.test(n)) e.push("note 含营销词");

  // 附加：子项必须落在 rubric 某个档位上，且不超上限
  for (const [k, v] of Object.entries(s)) {
    if (SUBS_MAX[k] !== undefined && v > SUBS_MAX[k]) e.push(k + " 超上限 " + SUBS_MAX[k]);
    if (BANDS[k] && !BANDS[k].includes(v)) e.push(k + "=" + v + " 不在档位 " + BANDS[k].join("/"));
  }

  // 附加：evidence 必须存在且注明证据来源
  if (!rv.evidence || rv.evidence === "[实测]") e.push("evidence 为空或占位符");
  else if (!/T\d|静态判定/.test(rv.evidence)) e.push("evidence 未标注 T 编号或静态判定");

  if (e.length) { bad++; rows.push("✗ " + m.id + "\n    " + e.join("\n    ")); }
  else rows.push("✓ " + m.id.padEnd(30) + String(rv.score).padStart(4) + " " + rv.grade +
                 " " + (R.grades.find(x => x.grade === rv.grade) || {}).label +
                 "  " + rv.verdict + "  " + m.tags.join("/"));
}
console.log("产物 " + M.length + " 条\n" + rows.join("\n"));
console.log(bad ? "\n>>> " + bad + " 条不合规" : "\n>>> 7 条自检全部通过");