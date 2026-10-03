// Snake LLM Bench — 模型产物登记表
// ---------------------------------------------------------------------------
// 新增一把出 HTML 的标准流程：
//   1) 文件原样放进 models/（保持模型生成的原始文件名与内容，一个字节都不要改）
//   2) 按 js/rubric.js 的 SNAKE SCORE v1.0 实测：8 步流程 → 9 个子项打分
//   3) 在下面数组追加一条：基础字段 + review（分数/等级/子项/缺陷）+ note + tags
//   4) index.html 里把改动的 js/css 的 ?v= 版本号 +1
//
// 评分标准全文见 js/rubric.js：测试条件、4 大项 9 子项的档位、硬门槛封顶规则、
// 等级表、评测流程、缺陷代码表、标签词表、note 规范、7 条评测陷阱。
// 铁律：产物永不修改；每个分数必须有实测证据；
//       boot=0 的产物除boot 外一律 0 分（见 rubric.js 的 zeroRule），总分即 0。
window.SNAKE_LLM_MODELS = [
  {
    id: "mimo-v2.6-q8",
    name: "MiMo-V2.6-Distill-Qwen-9B",
    file: "models/mimo-v2.6-distill-qwen-9b-q8_0.html",
    family: "MiMo",
    quant: "Q8_0",
    params: "9B",
    backend: "Unsloth Desktop",
    tps: 72.8,
    uploadedAt: "2026-09-22",
    review: {
      rubric: "1.0",
      score: 900,
      grade: "S",
      verdict: "可玩",
      evidence: "[实测]",
      subs: { boot: 200, ctrl: 90, rule: 60, pace: 105, score: 125, vis: 115, sfx: 100, rob: 45, adp: 60 },
      axes: { play: 350, feel: 230, show: 215, done: 105 },
      defects: ["MENU_NO_DRAW", "NO_FX_ON_DEATH", "DEAD_CODE"]
    },
    note: "有难度三档和穿墙模式可选，吃到食物有音效和粒子效果。开局前棋盘是空白的，要点开始才画出来。",
    tags: ["可玩", "难度切换", "规则切换", "音效"]
  },
  {
    id: "mimo-v2.6-q4",
    name: "MiMo-V2.6-Distill-Qwen-9B",
    file: "models/mimo-v2.6-distill-qwen-9b-q4_k_m.html",
    family: "MiMo",
    quant: "Q4_K_M",
    params: "9B",
    backend: "Unsloth Desktop",
    tps: 57.4,
    uploadedAt: "2026-09-22",
    review: {
      rubric: "1.0",
      score: 845,
      grade: "A",
      verdict: "可玩",
      evidence: "[实测]",
      subs: { boot: 200, ctrl: 55, rule: 60, pace: 125, score: 125, vis: 115, sfx: 100, rob: 20, adp: 45 },
      axes: { play: 315, feel: 250, show: 215, done: 65 },
      defects: ["DPAD_THROWS", "OVERLAY_ANCHOR", "NO_RESIZE", "NO_FX_ON_DEATH", "DEAD_CODE"]
    },
    note: "分数越高蛇跑得越快，吃到食物有加分浮字和音效，最高分也记得住。屏幕方向键四个全点不动，点了直接报错，手机上玩不了。",
    tags: ["可玩", "加速节奏", "移动端失效"]
  },
  {
    id: "swift-1.5-qwen3.8-27b",
    name: "Swift-1.5-Qwen3.8-27B",
    file: "models/swift-1.5-qwen3.8-27b-iq2_s-mtp.html",
    family: "Swift",
    quant: "IQ2_S",
    params: "27B",
    backend: "Unsloth Desktop",
    tps: 54.5,
    uploadedAt: "2026-09-29",
    review: {
      rubric: "1.0",
      score: 510,
      grade: "C",
      verdict: "残废",
      evidence: "[实测]",
      subs: { boot: 200, ctrl: 70, rule: 60, pace: 30, score: 0, vis: 55, sfx: 0, rob: 70, adp: 25 },
      axes: { play: 330, feel: 30, show: 55, done: 95 },
      defects: ["HIGHSCORE_DEAD", "NO_PERSIST", "NO_ACCEL", "NO_SWIPE", "OVERLAY_ANCHOR", "NO_SOUND", "NO_FX_ON_DEATH"]
    },
    note: "打开就在玩，不用点开始，方向键、暂停、重开都正常。速度一直不变，不会越玩越快；最高分永远是 0，吃到 90 分也不更新；手机上只能按按钮，滑不动。",
    tags: ["残废", "自动开局", "无加速", "最高分失效"]
  },
  {
    id: "occamy-1.0-iq2_m",
    name: "Occamy-1.0",
    file: "models/occamy-1.0-GGUF · IQ2_M.html",
    family: "Occamy",
    quant: "IQ2_M",
    params: "35B-A3B",
    backend: "Unsloth Desktop",
    tps: 57.1,
    uploadedAt: "2026-10-03",
    review: {
      rubric: "1.0",
      score: 715,
      grade: "B",
      verdict: "可玩",
      evidence: "[实测]",
      subs: { boot: 200, ctrl: 55, rule: 60, pace: 125, score: 125, vis: 85, sfx: 0, rob: 20, adp: 45 },
      axes: { play: 315, feel: 250, show: 85, done: 65 },
      defects: ["DPAD_SHADOWED", "PARTICLE_FROZEN", "GRID_DIAGONAL", "NO_SOUND", "NO_FX_ON_DEATH", "DEAD_CODE"]
    },
    note: "有开始和暂停按钮，棋盘会跟着窗口缩放，每吃 50 分会随机冒出一个加 50 分的特殊食物。背景网格画歪成了斜线，吃食物炸开的粒子不会动，屏幕方向键点了没反应。",
    tags: ["可玩", "奖励食物", "自适应", "移动端失效"]
  },
  {
    id: "occamy-1.0-q4_k_m",
    name: "Occamy-1.0",
    file: "models/occamy-1.0-GGUF · Q4_K_M.html",
    family: "Occamy",
    quant: "Q4_K_M",
    params: "35B-A3B",
    backend: "Unsloth Desktop",
    tps: 34.5,
    uploadedAt: "2026-10-03",
    review: {
      rubric: "1.0",
      score: 0,
      grade: "E",
      verdict: "开局失效",
      evidence: "[实测] boot 不可用，其余子项按 zeroRule 计 0",
      subs: { boot: 0, ctrl: 0, rule: 0, pace: 0, score: 0, vis: 0, sfx: 0, rob: 0, adp: 0 },
      axes: { play: 0, feel: 0, show: 0, done: 0 },
      defects: ["BOOT_DEADLOCK", "START_UNREACHABLE", "NO_SOUND", "DEAD_CODE"]
    },
    note: "进不去游戏：按方向键没反应，屏幕上也没有能点的开始按钮。棋盘是 30×20，蛇眼会跟着方向转，吃到食物和死亡都会炸开粒子，但都玩不到。",
    tags: ["开局失效", "宽棋盘", "粒子", "触屏完整"]
  }
];