// Snake LLM Bench — 模型产物登记表
// 新增一把出 HTML：1) 文件放入 models/  2) 在此数组追加一条（含 uploadedAt 上传日期）
window.SNAKE_LLM_MODELS = [
  {
    id: "mimo-v2.6-q8",
    name: "MiMo-V2.6-Distill-Qwen-9B",
    file: "models/mimo-v2.6-distill-qwen-9b-q8_0.html",
    family: "MiMo",
    quant: "Q8_0",
    params: "9B",
    backend: "Unsloth Desktop",
    uploadedAt: "2026-09-22",
    note: "难度三档 + 撞墙/穿墙规则切换，粒子与音效完整，移动端方向键与滑动都齐。",
    tags: ["one-shot", "canvas", "音效", "触屏"]
  },
  {
    id: "mimo-v2.6-q4",
    name: "MiMo-V2.6-Distill-Qwen-9B",
    file: "models/mimo-v2.6-distill-qwen-9b-q4_k_m.html",
    family: "MiMo",
    quant: "Q4_K_M",
    params: "9B",
    backend: "Unsloth Desktop",
    uploadedAt: "2026-09-22",
    note: "同款蒸馏 9B 的更低量化：速度渐进加快、漂浮加分字效，完成度同样一把能玩。",
    tags: ["one-shot", "canvas", "高分反馈"]
  }
];
