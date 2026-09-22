# mks155.github.io

mks155 的个人主页（GitHub Pages）。

## 结构

| 路径 | 说明 |
|------|------|
| `/` | 个人主页 |
| `/games/cyber-snake/` | 赛博城市 3D 贪吃蛇 |
| `/games/snake-llm-bench/` | 本地大模型一把出 HTML 写贪吃蛇的展示墙 |

## Snake LLM Bench

收集本地部署大模型「一把出完整 HTML 贪吃蛇」的产物，卡片墙可试玩对比。

### 添加新模型产物

1. 把模型生成的单文件 HTML 拷到 `games/snake-llm-bench/models/`（文件名用可读 slug）。
2. 在 `games/snake-llm-bench/js/models.js` 的 `window.SNAKE_LLM_MODELS` 数组追加一条，例如：

```js
{
  id: "some-model-slug",
  name: "Some-Model-Name",
  file: "models/some-model-slug.html",
  family: "Local",
  quant: "Q4_K_M",
  params: "14B",
  backend: "llama.cpp",
  uploadedAt: "2026-09-22",
  note: "一句话观察：交互、视觉、完成度。",
  tags: ["one-shot", "canvas"]
}
```

3. 刷新 `/games/snake-llm-bench/` 即可上墙。深链：`#m=some-model-slug`。

### 本地预览

在仓库根目录执行：

```bash
python -m http.server 8080
```

浏览器打开 http://127.0.0.1:8080/
