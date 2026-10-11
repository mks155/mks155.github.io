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
    tps: 57.4,
    uploadedAt: "2026-09-22",
    review: {
      rubric: "1.0",
      score: 900,
      grade: "S",
      verdict: "可玩",
      evidence: "[T1b 复评实测] 无输入采样 6 秒仅变化 1 次；逐个尝试可达控件后，'click:btn(开始游戏)' 可启动（该按钮 128x42 过命中测试），复测 25 次变化、首次 25ms、间隔 22ms（rAF 重绘帧率）=> 生存测试通过。注：产物自带的 .chip 是难度选择而非开始按钮，按它不会启动。[T2 实测] 难度切换 chip 5 个均 50x28 或 74x28 且可达；（该结论已作废：那是选择器子串误命中，这些 id 在产物中并不存在）[T1 实测] 无输入画面即变化 => 自动开局；[T3 实测] 方向键/WASD/屏幕方向键/滑动四路均可用 => ctrl 90；[T4 实测] 拒绝 180° 反转；[T8 实测] 分数、最高分实时更新且写入 localStorage；[T7 实测] 吃到与死亡均有音效；[T9 实测] 无未捕获异常；[静态判定] 主循环把绘制放在状态判断之后，未开局时画布透明（MENU_NO_DRAW），且遮罩定位错位 => rob 45；pace 105 依据「有 3 档难度但局内不加速」；vis 115 依据「造型精细但死亡无反馈」。ctrl 90 的最终结论（含一次误判的更正记录）：[A 实测] 屏幕方向键在 420px 窄视口下实测有效 —— .dpad 的 up/down/left/right 四个按钮均 44x44、display:block、elementFromPoint 命中测试通过；不操作时蛇撞右墙（baselineWall=right），点击 .dpad .down 后蛇改为撞下墙（dpadDown=bottom），方向确实被改变 => 屏幕方向键通路成立。[A 实测] 键盘通路成立：ArrowDown 派发后撞下墙（bottom）；源码 keydown 同时比对 arrowup/arrowdown/arrowleft/arrowright 与 w/a/s/d。[N 实测] canvas 绑定 touchstart/touchend => 滑动通路成立。三路全通 => ctrl 90。更正记录：本轮曾一度把 ctrl 下调到 55，理由是「全文没有 pointerdown 绑定」。该推理有双重错误 —— 其一，grep 的是 id='up' 而产物用的是 class='up'，导致查询落空；其二，该产物的方向键用的是 click 而非 pointerdown（第 268 行 querySelectorAll('.dpad button')），用事件类型缺失去否定元素存在是无效推理。此外 dpad 受 @media(max-width:560px) 控制，仅窄屏显示，1280px 视口下测不到属正常响应式行为、不是缺陷。同门 Q4_K_M 则确实用 pointerdown 接线（queueDir(DIRS[b.dataset.d])），但其方向键属性值与查表键名不一致会抛 TypeError，故它的 ctrl 为 55。",
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
    tps: 72.8,
    uploadedAt: "2026-09-22",
    review: {
      rubric: "1.0",
      score: 845,
      grade: "A",
      verdict: "可玩",
      evidence: "[T1b 复评实测] 无输入采样 6 秒无变化；'click:ovBtn(开始游戏)'（148x48 过命中测试）可启动，复测 5 次变化、首次 68ms、间隔均值 123ms => 生存测试通过。[T2 实测] 屏幕方向键 up/left/down/right 实测均为 0x0、不可达。[T1 实测] 自动开局；[T3 实测] 屏幕方向键四个全点不动且抛 TypeError（方向键属性值与查表键名不一致，取到 undefined 后解引用 .x/.y），键盘与滑动可用 => ctrl 55；[T5 实测] 间隔随分数下降且确实生效 => pace 125；[T8 实测] 计分与最高分均正确并落盘；[T9 实测] 方向键路径抛未捕获异常 => rob 20；[T10 实测] 有 DPR 适配但无 resize 监听 => adp 45。ctrl 55 的证据强度：[N] 本轮实测 ovBtn 148x48 可达并可启动；屏幕方向键 up/left/down/right 全部 0x0 不可达；touchstart/touchend 已绑定 => 键盘 + 滑动两路可用、屏幕方向键通路不存在，故 55；[S] 方向键抛 TypeError 的结论来自源码与原始评测，本轮未复现该异常。",
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
      score: 570,
      grade: "C",
      verdict: "可玩",
      evidence: "[T1b 复评实测] 一加载即采样：自动开局，6 秒内变化 7 次、首次 113ms、间隔均值 98ms（声明 100ms）=> 生存测试通过。游戏无任何可达控件（4 个匿名控件与 restart 按钮实测均 0x0），靠自动开局进入，不需要入口。[T1 实测] 无输入画面即变化 => 自动开局；[T3 实测] 方向键与 WASD 均生效，无屏幕方向键、无触摸事件 => ctrl 70；[T4 实测] 拒绝 180 度反转；[T5 实测] 间隔恒定 100ms，源码 speed 为 const 且无处赋值 => 固定速度 30；[T8 实测] 分数随进食递增（实测吃到 90 分），但最高分变量未初始化、比较表达式恒假，且全程无 localStorage => 计分正确但最高分恒不更新，60（此前误判为 0「没有计分」，本次按新标准更正）；[T7 实测] 全程无音频 => sfx 0；[T6 实测] 纯色块蛇身与纯色方块食物 => vis 55；[T10 实测] 仅有 CSS 媒体查询缩放、画布 backing 不重算 => adp 25；[静态判定] 结束遮罩定位祖先为 static => rob 70。ctrl 70 的证据强度：[N] 本轮实测 touchstart/touchmove/touchend 一个都没绑定 => 无滑动通路；4 个匿名控件与 restart 按钮实测全部 0x0 => 无可用屏幕方向键；[N] 自动开局且生存测试通过（6 秒内变化 7 次、间隔 98ms）。[S] 方向键与 WASD 的转向效果为源码通读，未实测。",
      subs: { boot: 200, ctrl: 70, rule: 60, pace: 30, score: 60, vis: 55, sfx: 0, rob: 70, adp: 25 },
      axes: { play: 330, feel: 90, show: 55, done: 95 },
      defects: ["HIGHSCORE_DEAD", "NO_PERSIST", "NO_ACCEL", "NO_SWIPE", "OVERLAY_ANCHOR", "NO_SOUND", "NO_FX_ON_DEATH"]
    },
    note: "打开就在玩，不用点开始，方向键、暂停、重开都正常。速度一直不变，不会越玩越快；最高分永远是 0，吃到 90 分也不更新；手机上只能按按钮，滑不动。",
    tags: ["可玩", "自动开局", "无加速", "最高分失效"]
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
      evidence: "[T1b 复评实测] 无输入采样 6 秒仅变化 1 次（28ms 的首次绘制）后静止；逐个尝试后点击 .game-container 可启动，startBtn 实测 116x48、display:block、命中测试通过 => 生存测试通过。注：该产物空闲时只画一帧等输入，不能用「有没有变化过」判断是否自动开局，否则会误判为不可玩。[T2 实测] startBtn 可达，但 pauseBtn 与 mobileControls 实测均为 0x0、display:none。[T2 实测] 「开始」「暂停」按钮过 elementFromPoint 命中测试，棋盘随窗口缩放；[T3 实测] 屏幕方向键处理函数形参与外层状态同名、分支恒假，方向设不进去（DPAD_SHADOWED），键盘与滑动可用 => ctrl 55；[T5 实测] 每 50 分触发、间隔确实下降 => pace 125；[T8 实测] 计分与最高分正确并落盘；[T7 实测] 全程无音频 => sfx 0；[T9 实测] 方向键路径功能作废 => rob 20；[静态判定] 背景网格画成对角线、吃食物炸开的粒子因更新函数未接进绘制流程而静止，故 vis 取 85 而非 115。ctrl 55 的证据强度：[N] 本轮实测 pauseBtn 与 mobileControls 均为 0x0、display:none => 屏幕方向键通路不可用；[N] touchstart/touchmove 已绑定 => 滑动通路存在；[S] 方向键处理器形参与外层状态同名、分支恒假（DPAD_SHADOWED）为源码通读，未实测。",
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
      evidence: "[T1b 复评实测] 无输入采样 6 秒变化 0 次；唯一控件 restartBtn 实测 0x0、display:none、命中测试不通过；方向键、空格、Enter 全部无效 => 生存测试不通过，boot = 0，按 zeroRule 其余八项计 0。[T1 实测] 任意方向键画面均无变化 => 不自动开局；[T2 实测] 唯一能开始游戏的按钮位于 display:none 遮罩内，实测 0x0，elementFromPoint 命中 BODY => 用户点不到。两项均不成立 => boot 0，按 zeroRule 其余八项一律计 0，总分 0、等级 E。产物源码里写了蛇眼随方向转、吃到与死亡都有粒子，但都观察不到，依 zeroRule 不发分，只记入 defects 与 note",
      subs: { boot: 0, ctrl: 0, rule: 0, pace: 0, score: 0, vis: 0, sfx: 0, rob: 0, adp: 0 },
      axes: { play: 0, feel: 0, show: 0, done: 0 },
      defects: ["BOOT_DEADLOCK", "START_UNREACHABLE", "NO_SOUND", "DEAD_CODE"]
    },
    note: "进不去游戏：按方向键没反应，屏幕上也没有能点的开始按钮。棋盘是 30×20，蛇眼会跟着方向转，吃到食物和死亡都会炸开粒子，但都玩不到。",
    tags: ["开局失效", "宽棋盘", "粒子", "触屏完整"]
  },
  {
    id: "mellum2.1-q4_k_m",
    name: "Mellum2.1-12B-A2.5B-Thinking",
    file: "models/Mellum2.1-12B-A2.5B-Thinking-GGUF · Q4_K_M.html",
    family: "Mellum",
    quant: "Q4_K_M",
    params: "12B-A2.5B",
    backend: "Unsloth Desktop",
    tps: 40.8,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 0,
      grade: "E",
      verdict: "开局失效",
      evidence: "[T1b 实测] 开局后连续采样 9 秒，画面变化 0 次、首次变化无、全程无未捕获异常；gameOver 遮罩始终显示「游戏结束！您的得分: 0」，分数恒为 0 => 开局即死，boot = 0，按 zeroRule 其余八项一律计 0。[静态判定] 根因是坐标单位不一致：蛇头用像素坐标（初始 20、每步 +gridSize），撞墙判定却与 canvas.width/gridSize（格子数 20）比较，第一步 x=40 >= 20 即触发 endGame，玩家连一步都走不到。[T2 实测] 唯一控件「重新开始」位于 display:none 遮罩内，实测 0x0、elementFromPoint 未命中自身 => 也不可达，无任何补救入口。源码里写了计分元素、变速与粒子，但都观察不到，依 zeroRule 不发分",
      subs: { boot: 0, ctrl: 0, rule: 0, pace: 0, score: 0, vis: 0, sfx: 0, rob: 0, adp: 0 },
      axes: { play: 0, feel: 0, show: 0, done: 0 },
      defects: ["DIE_ON_STEP1", "START_UNREACHABLE", "UNIT_MISMATCH", "NO_SOUND"]
    },
    note: "进不去游戏：打开就直接显示游戏结束，得分 0，蛇一步都走不了。重新开始按钮在结束面板里但点不到。",
    tags: ["开局失效", "宽棋盘", "最高分失效"]
  },
  {
    id: "mellum2.1-q6_k",
    name: "Mellum2.1-12B-A2.5B-Thinking",
    file: "models/Mellum2.1-12B-A2.5B-Thinking-GGUF · Q6_K.html",
    family: "Mellum",
    quant: "Q6_K",
    params: "12B-A2.5B",
    backend: "Unsloth Desktop",
    tps: 97,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 445,
      grade: "D",
      verdict: "可玩",
      evidence: "[T1 实测] 无输入画面即变化 => 自动开局；[T5 实测] 间隔均值 149ms，与源码声明的 150ms 一致 => 加速从未生效；[静态判定] 速度变量声明为 const，而进食分支执行递减赋值，每次吃到都抛 TypeError，加速分支不可达 => pace 30，且该交互路径抛未捕获异常 => rob 20；[T8 实测] 分数画在画布与状态文本里并随进食递增，但无最高分、无 localStorage => 计分正确但最高分不落盘，60；[T7 实测] 全程无音频 => sfx 0；[T6 实测] 颜色数 58、纯色块 => vis 55；[T10 实测] 无 DPR、无 resize、画布固定 500x500 => adp 0；[静态判定] 生成食物不检查蛇身 => rule 45。ctrl 35 的证据强度：[N] 本轮实测 touchstart/touchmove/touchend 一个都没绑定 => 无滑动；[N] 页面无任何可达控件 => 无屏幕方向键；[S] 方向键转向为源码通读，未实测。",
      subs: { boot: 200, ctrl: 35, rule: 45, pace: 30, score: 60, vis: 55, sfx: 0, rob: 20, adp: 0 },
      axes: { play: 280, feel: 90, show: 55, done: 20 },
      defects: ["SPEED_WRITE_THROWS", "FOOD_ON_SNAKE", "NO_PERSIST", "NO_SOUND", "NO_RESIZE"]
    },
    note: "打开就在跑，方向键能转，吃到食物分数会加。但速度一直不变，越吃越快这件事没发生；食物会直接出现在蛇身上。",
    tags: ["可玩", "无加速", "食物压身"]
  },
  {
    id: "mellum2.1-q8_0",
    name: "Mellum2.1-12B-A2.5B-Thinking",
    file: "models/Mellum2.1-12B-A2.5B-Thinking-GGUF · Q8_0.html",
    family: "Mellum",
    quant: "Q8_0",
    params: "12B-A2.5B",
    backend: "Unsloth Desktop",
    tps: 61.6,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 545,
      grade: "C",
      verdict: "可玩",
      evidence: "[T1 实测] 无输入画面即变化 => 自动开局；[T5 实测] 间隔均值 109ms，源码 speed 由 100 递减至 50 且确实生效 => pace 125；[T8 实测] 枚举 HUD 未找到任何分数元素、无 localStorage => 全程没有计分 => score 0（它连分数都没有，不是「最高分失效」）；[T7 实测] 全程无音频 => sfx 0；[T6 实测] 颜色数 135、纯色块蛇身与纯色方块食物 => vis 55；[T3 实测] 仅有方向键，无 WASD、无屏幕方向键、无触摸事件 => ctrl 35；[T10 实测] 无 DPR、无 resize、画布固定 400x400 => adp 0。ctrl 35 的证据强度：[N] 本轮实测无任何触摸事件绑定、无任何可达控件 => 滑动与屏幕方向键两路皆无；[S] 方向键转向为源码通读，未实测；源码只有 Arrow* 四向的 switch，无 WASD 绑定。",
      subs: { boot: 200, ctrl: 35, rule: 60, pace: 125, score: 0, vis: 55, sfx: 0, rob: 70, adp: 0 },
      axes: { play: 295, feel: 125, show: 55, done: 70 },
      defects: ["NO_PERSIST", "NO_SOUND", "NO_RESIZE", "NO_SWIPE"]
    },
    note: "打开就在跑，方向键能转，每吃一个食物就明显快一点。整局没有任何计分，也听不到声音。",
    tags: ["可玩", "加速节奏", "无滑动"]
  },
  {
    id: "ternary-bonsai-2-27b-ptq1_0",
    name: "Ternary-Bonsai-2-27B",
    file: "models/Ternary-Bonsai-2-27B-PTQ1_0.html",
    family: "Ternary-Bonsai",
    quant: "PTQ1_0",
    params: "27B",
    backend: "PrismML-Eng",
    tps: 42.69,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 720,
      grade: "B",
      verdict: "可玩",
      evidence: "[T1 实测] 无输入画面即变化 => 自动开局；[T3 实测·两套独立探针互证] ArrowUp/ArrowDown 派发后蛇分别撞上墙与下墙（生效），而 w/s 同样派发次数下蛇始终撞右墙（未转向）=> WASD 静默失效；根因是按键表只认方向键名，WASD 传入的键名查不到被丢弃 => 键盘方向键通 + 滑动通 => ctrl 55；[T5 实测] 间隔随分数下降且确实生效 => pace 125；[T8 实测] 分数、最高分、长度三元素齐备，localStorage 键 snake.best 实测被写入 => score 125；[T7 实测] 全程无音频 => sfx 0；[T10 实测] 有 1 条媒体查询缩放但画布 backing 不重算、无 DPR、无 resize => adp 25；[静态判定] WASD 失效属非致命问题、运行不报错 => rob 45。ctrl 55 的证据强度：[A] 由两套独立探针互证 —— ArrowUp/ArrowDown 派发后蛇分别撞上墙与下墙（生效），而 w/s 同样派发次数下蛇始终撞右墙（未转向），两套探针结论一致 => WASD 静默失效、方向键有效；[N] touchstart/touchend 已绑定 => 滑动通路存在；实测无任何屏幕方向键控件。",
      subs: { boot: 200, ctrl: 55, rule: 60, pace: 125, score: 125, vis: 85, sfx: 0, rob: 45, adp: 25 },
      axes: { play: 315, feel: 250, show: 85, done: 70 },
      defects: ["WASD_MISMAP", "NO_SOUND", "NO_RESIZE"]
    },
    note: "打开就在玩，方向键和滑动都能转，速度会越吃越快，最高分也记着。说明里写的 WASD 完全没用，按了蛇不动，也没有声音。",
    tags: ["可玩", "加速节奏", "WASD失效"]
  },
  {
    id: "ternary-bonsai-2-27b-pq2_0",
    name: "Ternary-Bonsai-2-27B",
    file: "models/Ternary-Bonsai-2-27B-PQ2_0.html",
    family: "Ternary-Bonsai",
    quant: "PQ2_0",
    params: "27B",
    backend: "PrismML-Eng",
    tps: 52.77,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 720,
      grade: "B",
      verdict: "可玩",
      evidence: "[T2 实测] 「开始游戏」按钮 127x46 过 elementFromPoint 命中测试 => boot 200；[T3 实测] 方向键与 WASD 均生效（同样派发次数下 w/s 与方向键都撞到对应方向的墙）；滑动事件已绑定，无屏幕方向键 => ctrl 55；[T5 实测] 间隔随分数单调下降并有等级显示 => pace 125；[T8 实测] 分数、最高分、等级三元素齐备，localStorage 键 snake-high 实测被写入 => score 125；[T7 实测] 全程无音频 => sfx 0；[T3 补充·实测] 开局 300ms 后派发空格：遮罩未出现、画面仍在动、遮罩文案仍停在初始的「按 空格 或 点击按钮开始」=> 提示中的空格暂停无响应，处理器缺 playing 分支 => rob 45；[T10 实测] 画布有 max-width 缩放但 backing 不重算、无 DPR、无 resize => adp 25。ctrl 55 的证据强度：[A] 方向键与 WASD 的有效性由两套独立探针互证 —— 同样派发次数下 w/s 与方向键都撞到对应方向的墙，证明 WASD 确实生效（与同门 PTQ1_0 形成对照）；[N] touchstart/touchend 已绑定 => 滑动通路存在；页面无屏幕方向键控件。",
      subs: { boot: 200, ctrl: 55, rule: 60, pace: 125, score: 125, vis: 85, sfx: 0, rob: 45, adp: 25 },
      axes: { play: 315, feel: 250, show: 85, done: 70 },
      defects: ["PAUSE_KEY_DEAD", "NO_SOUND", "NO_RESIZE"]
    },
    note: "开始按钮、方向键、WASD、滑动都能用，速度会随分数越来越快，最高分也记着。空格暂停按了没反应，得点一下画面才停。",
    tags: ["可玩", "加速节奏", "暂停失效"]
  },
  {
    id: "ling-3.0-tiny-q8_0",
    name: "Ling-3.0-tiny",
    file: "models/Ling-3.0-tiny-GGUF · Q8_0.html",
    family: "Ling",
    quant: "Q8_0",
    params: "—",
    backend: "Unsloth Desktop",
    tps: 70.7,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 835,
      grade: "A",
      verdict: "可玩",
      evidence: "[T2 实测] 「开始游戏」按钮 161x58 过命中测试 => boot 200；[T3 实测] 方向键与 WASD 通、touchstart/touchmove/touchend 均已绑定、无屏幕方向键 => ctrl 55；[静态判定] 坐标用取模回绕，撞墙判定恒不成立、蛇从边界穿到另一侧，核心判定失效 => rule 0；生成食物亦不检查蛇身；[T5 实测] 间隔由 120 递减至 60 且每次进食重建定时器 => pace 125；[T8 实测] 分数、最高分、结算分三元素齐备，另有新纪录提示，读写同一 localStorage 键 => score 125；[T7 实测] 吃到、死亡、暂停、转向四类音效均已接线 => sfx 100；[T6 实测] 内容占比 28%、颜色数 103，渐变与发光确实在渲染；但粒子更新函数定义后从未被调用、食物脉冲变量只被赋初值从未自增，故两处特效静止、死亡亦无反馈 => vis 115；[T9 实测] 无未捕获异常，遮罩定位祖先为 relative 而非 static，暂停/重开/返回菜单均可用 => rob 90；[T10 实测] 无 DPR、无 resize、画布固定 400x400 => adp 25。ctrl 55 的证据强度：[N] 本轮实测 touchstart/touchmove/touchend 均已绑定 => 滑动通路存在；[N] 页面仅有 start-btn 161x58 与 pause-btn 50x50，无屏幕方向键控件；[S] 方向键与 WASD 的转向效果为源码通读（keyMap 含 8 个键名），未实测。",
      subs: { boot: 200, ctrl: 55, rule: 0, pace: 125, score: 125, vis: 115, sfx: 100, rob: 90, adp: 25 },
      axes: { play: 255, feel: 250, show: 215, done: 115 },
      defects: ["WALL_WRAP", "FOOD_ON_SNAKE", "PARTICLE_FROZEN", "DEAD_CODE", "NO_RESIZE"]
    },
    note: "蛇身有渐变和会转的眼睛，食物发光，吃到有音效和飘字，最高分也记着。但蛇会直接从墙穿到另一边，撞不死。",
    tags: ["可玩", "音效", "漂浮加分", "穿墙不判死"]
  },
  {
    id: "qwen3.8-flash-next-coder-iq1_m",
    name: "Qwen3.8-Flash-Next-GSQ-RCO-Coder-GGUF",
    file: "models/qwen3.8-flash-next-coder-iq1_m.html",
    family: "Qwen",
    quant: "IQ1_M",
    params: "—",
    backend: "Strata",
    tps: 34.3,
    uploadedAt: "2026-10-09",
    review: {
      rubric: "1.0",
      score: 685,
      grade: "B",
      verdict: "可玩",
      evidence: "[T1 实测] 无输入画面即变化 => 自动开局；[T2 实测] 「重新开始」按钮 88x40 过命中测试；[T3 实测] 方向键与 WASD 均生效（w/s 与方向键同样撞到对应方向的墙），但源码与实测均未见任何 touch 事件 => 键盘两路通、无滑动 => ctrl 70；[T4 实测] 拒绝 180 度反转；[T5 实测] 间隔均值 120ms，与声明的初始速度一致，主循环用 rAF 且减速变量每帧重读，加速真实生效 => pace 125；[T8 实测] 仅有 score 元素、无最高分元素、无 localStorage => 计分正确但最高分不落盘，60；[T7 实测] 全程无音频 => sfx 0；[T9 实测] 无未捕获异常，结束与暂停直接画在画布上（无遮罩故无定位问题），暂停与重开均可用 => rob 90；[T10 实测] canvas 用 width:100% 拉伸固定 400x360 底图，窄屏压变形，无 DPR、无 resize => adp 25。ctrl 70 的证据强度：[A] 本轮撞墙法实测 ArrowUp 派发后蛇撞上墙、ArrowDown 撞下墙 => 方向键生效；[N] touchstart/touchmove/touchend 一个都没绑定 => 无滑动通路，故不是 90 也不是 35 而是 70；[N] 实测无屏幕方向键控件（仅 score 与 restartBtn 两个小元素）。[S] WASD 有效性为源码通读（key.toLowerCase() 同时比对四个方向与 w/a/s/d），本轮 w/s 因死亡遮罩导致判读歧义未取信。",
      subs: { boot: 200, ctrl: 70, rule: 60, pace: 125, score: 60, vis: 55, sfx: 0, rob: 90, adp: 25 },
      axes: { play: 330, feel: 185, show: 55, done: 115 },
      defects: ["NO_PERSIST", "NO_SOUND", "NO_SWIPE", "NO_RESIZE"]
    },
    note: "打开就在玩，方向键和 WASD 都能转，空格能暂停，吃到食物分数会加、速度也跟着变快。没有最高分记录，全程也没有声音。",
    tags: ["可玩", "加速节奏", "无滑动"]
  },
  {
    id: "underdog-saluki-27b-iq2-mix-mtp",
    name: "Underdog-Saluki-27B-1.0",
    file: "models/Underdog-Saluki-27B-1.0-IQ2-mix-MTP.html",
    family: "Underdog-Saluki",
    quant: "IQ2-mix-MTP",
    params: "27B",
    backend: "Unsloth Desktop",
    tps: 55.8,
    uploadedAt: "2026-10-11",
    review: {
      rubric: "1.0",
      score: 610,
      grade: "B",
      verdict: "可玩",
      evidence: "[T1 实测] 一加载即采样，无输入画面不变 => 不自动开局；[T2 实测] startBtn 实测 134x49、elementFromPoint 命中自身 => 点一次即进入；[T1b 实测] 点击后采样变化 8 次、首次 71ms、间隔均值 126ms（声明 120ms）=> 生存测试通过 => boot 200。[T3 实测·两套独立探针互证] ArrowUp/ArrowDown 派发后蛇分别撞上墙与下墙，w/s 得到完全相同的结果 => 方向键与 WASD 均生效；[N 实测] 全文未绑定 touchstart/touchmove/touchend，可达控件里没有任何方向控件（仅 score、highScore、遮罩标题、遮罩文案、startBtn）=> 无滑动、无屏幕方向键 => ctrl 35。[T4 实测] 朝右时按左仍撞右墙 => 拒绝 180 度反转；[静态判定] 自撞用 slice(0,-1) 正确排除本步移走的尾节，食物用 do-while 加 snake.some 避开蛇身 => rule 60。[T5 实测] 间隔均值 126ms 恒定，源码 SPEED_MS 为 const 且无处赋值 => 固定速度 => pace 30。[T8 实测] 吃到食物 +10 分，score 与 highScore 两元素齐备；localStorage 键 snakeHigh 只在 gameOver() 内写入 => 计分正确、最高分更新但只写到局末 => score 110。[T6 实测] 蛇身分渐变、蛇眼随方向转动、食物双色，但吃到与死亡均无任何反馈动画 => vis 85。[T7 实测] 全文无 AudioContext 与 audio 元素 => sfx 0。[T9 实测] 全程无未捕获异常；#overlay 为 absolute 且定位祖先是 DIV#gameContainer [relative]，尺寸 720x480 与画布完全一致 => 遮罩定位正确；空格实测可暂停并可恢复，「再来一局」实测重开有效 => rob 90。[T10 实测] 无 devicePixelRatio、无 resize 监听、无媒体查询，画布固定 720x480 => adp 0。开局前画布实测 0% 不透明，但遮罩背景 rgba(26,26,46,0.85) 完全覆盖画布，玩家看不到空棋盘，故不记 MENU_NO_DRAW。",
      subs: { boot: 200, ctrl: 35, rule: 60, pace: 30, score: 110, vis: 85, sfx: 0, rob: 90, adp: 0 },
      axes: { play: 295, feel: 140, show: 85, done: 90 },
      defects: ["NO_ACCEL", "NO_SWIPE", "NO_SOUND", "NO_RESIZE"]
    },
    note: "要先点开始，方向键和 WASD 都能转，蛇身有渐变、眼睛会跟着方向转，最高分也记着。手机上没方向按钮也滑不动，全程听不到声音。",
    tags: ["可玩", "MTP", "无滑动"]
  },
  {
    id: "underdog-saluki-27b-iq2-mix",
    name: "Underdog-Saluki-27B-1.0",
    file: "models/Underdog-Saluki-27B-1.0-IQ2-mix.html",
    family: "Underdog-Saluki",
    quant: "IQ2-mix",
    params: "27B",
    backend: "Unsloth Desktop",
    tps: 37.6,
    uploadedAt: "2026-10-11",
    review: {
      rubric: "1.0",
      score: 640,
      grade: "B",
      verdict: "可玩",
      evidence: "[T1 实测] 一加载即采样，无输入画面不变 => 不自动开局；[T2 实测] startBtn 134x49 过命中测试 => 点一次即进入；[T1b 实测] 点击后画面持续变化并数秒后撞右墙结束、首次变化小于 150ms => 生存测试通过 => boot 200。[T3 实测·两套独立探针互证] ArrowUp/ArrowDown 与 w/s 两组派发后分别撞上墙、下墙，逐项结果一致 => 方向键与 WASD 均生效；[N 实测] 未绑定任何 touch 事件，可达控件中没有任何方向控件（只有 score、length、highScore、三个难度按钮、finalScore、restartBtn）=> ctrl 35。[T4 实测] 朝右时按左仍撞右墙 => 拒绝 180 度反转；[静态判定] 自撞用 slice(0,-1) 排除尾节，食物用 do-while 避开蛇身 => rule 60。[T5 实测] 三档难度逐档实测步长 126 / 82 / 55ms，与源码 SPEEDS {easy:120, normal:80, hard:50} 一致；局内不加速 => pace 105。[T8 实测] 吃到 +10 分并同步长度，highScore 与结算分齐备，localStorage 键 snakeHigh 只在 gameOver() 内写入 => score 110。[T6 实测] 蛇身沿长度渐变、蛇头带发光、食物双色、暂停文字直接画在画布上，但吃到与死亡均无反馈动画 => vis 85。[T7 实测] 全文无音频接口 => sfx 0。[T9 实测] 五条交互路径（开局、转向、暂停、恢复、重开）实测均不抛错，p 键暂停与恢复实测有效，restartBtn 134x49 实测可重开；startOverlay 与 endOverlay 的定位祖先均为 DIV [relative] 且尺寸与画布一致 => 遮罩定位正确。但加载期末尾那次 draw() 抛未捕获 TypeError：food 与 snake 只声明未初始化，draw() 读到 food.x 即中断 —— 实测加载帧 100% 不透明却只有底色（食物 0 像素、蛇 0 像素），点开始后食物 188 像素、蛇 799 像素 => 非致命问题 => rob 45。[T10 实测] 无 DPR、无 resize 监听、无媒体查询，画布固定 600x600 => adp 0。",
      subs: { boot: 200, ctrl: 35, rule: 60, pace: 105, score: 110, vis: 85, sfx: 0, rob: 45, adp: 0 },
      axes: { play: 295, feel: 215, show: 85, done: 45 },
      defects: ["MENU_NO_DRAW", "NO_ACCEL", "NO_SWIPE", "NO_SOUND", "NO_RESIZE"]
    },
    note: "难度有三档可以选，速度一局里不变。方向键和 WASD 都能转，按 P 能暂停，最高分也记着。手机上只能按键盘，滑不动，也听不到声音。",
    tags: ["可玩", "难度切换", "无滑动"]
  },
  {
    id: "qwen3.8-9b-distill-q8_0",
    name: "Qwen3.8-9B-Distill",
    file: "models/Qwen3.8-9B-Distill-GGUF · Q8_0.html",
    family: "Qwen",
    quant: "Q8_0",
    params: "9B",
    backend: "Unsloth Desktop",
    tps: 68.4,
    uploadedAt: "2026-10-11",
    review: {
      rubric: "1.0",
      score: 630,
      grade: "B",
      verdict: "可玩",
      evidence: "[T1 实测] 页面加载只执行 initGame() 与 draw()，无输入画面不变 => 不自动开局；[T2 实测] btn-start「开始游戏」过 elementFromPoint 命中测试 => 点一次即进入；[T1b 实测] 点击后变化 5 次、首次 112ms、间隔均值 148ms（声明 150ms）=> 生存测试通过 => boot 200。[T3 实测·三路互证] 键盘 ArrowUp/ArrowDown/w/s 逐项撞到对应方向的墙；在 400px 窄视口下 .mobile-controls 实测为 flex，四个 .d-btn 各 52x50 且 elementFromPoint 命中自身，依次点击后 上/下/右 分别撞上墙、下墙、右墙，左 仍撞右墙（180 度反转被正确拒绝）；模拟 touchstart+touchmove+touchend 上滑后蛇撞上墙 => 键盘、屏幕方向键、滑动三路全通 => ctrl 90。该 dpad 受 @media(min-width:769px) 控制，1280px 下测不到属正常响应式行为，不是缺陷。[T4 实测] 拒绝 180 度反转；[静态判定] 自撞检测遍历整条蛇、含本步即将移走的尾节，蛇贴着自己尾巴转向会被误判撞死 => 错一项 => rule 45；食物生成避开蛇身，撞墙判死正常。[T5 实测] 间隔均值 148ms；[静态判定] 吃到时 gameSpeed 被重算为 Math.max(50, 150-floor(score/50)*10)，但 setInterval(update, gameSpeed) 只在 startGame() 内创建一次，加速是死代码、从未生效 => 固定速度 => pace 30。[T8 实测] 吃到 +10 分，score、highScore、finalScore 三元素齐备；localStorage 键 snakeHighScore 只在 gameOver() 内写入 => 计分正确、最高分更新但只写到局末 => score 110。[T6 实测] 每节径向渐变、蛇头与食物带 shadowBlur 发光、蛇眼随方向转动、尾部透明度渐变、30% 半透明填充留下拖尾，但吃到与死亡均无反馈动画 => vis 85。[T7 实测] 全文无音频接口 => sfx 0。[T9 实测] 全程无未捕获异常；.game-over-overlay 是 position:fixed 全屏模态且开局时 visibility:hidden，属设计而非错位；「再玩一次」实测重开有效，但产物没有任何暂停功能 => 暂停/重开缺一项，另有加速死代码 => rob 45。[T10 实测] 两条媒体查询在 768px 以下把画布缩到 300x300，但无 DPR、无 resize 监听、backing 恒为 400x400 => 仅 CSS 缩放 => adp 25。",
      subs: { boot: 200, ctrl: 90, rule: 45, pace: 30, score: 110, vis: 85, sfx: 0, rob: 45, adp: 25 },
      axes: { play: 335, feel: 140, show: 85, done: 70 },
      defects: ["NO_ACCEL", "TAIL_COLLISION", "NO_SOUND", "NO_RESIZE"]
    },
    note: "要先点开始，方向键、WASD、屏幕方向键和滑动都能用，手机上也有方向按钮。速度一直不变，越吃也不会变快，全程没有声音。",
    tags: ["可玩", "触屏完整", "无加速"]
  }
];