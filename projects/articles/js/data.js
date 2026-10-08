// Articles · 文章登记表
// ---------------------------------------------------------------------------
// 新增一篇文章的流程：
//   1) 把 .md 原文放到 projects/articles/md/（文件名保持可读，代码里用 encodeURI 取）
//   2) 在下面数组追加一条
//   3) index.html 里把 js/app.js / js/markdown.js 的 ?v= 版本号 +1
//
// 字段说明：
//   id        深链锚点，页面用 #a=<id> 直接打开这篇文章
//   title     列表卡片标题，也用作浏览器标题
//   file      .md 相对本模块的路径
//   date      发布 / 更新日期，显示在卡片上
//   tags      标签，建议 2 个：第一个是主题，第二个是类型
//   summary   卡片上的一句话导读
window.ARTICLES = [
  {
    id: "opencode-custom-model",
    title: "OpenCode V2 自定义模型接入指南",
    file: "md/OpenCode-接入自定义模型.md",
    date: "2026-10-08",
    tags: ["OpenCode", "配置指南"],
    summary: "把任意 OpenAI 兼容的本地或远程服务接进 OpenCode：查参数、写配置、刷新、验证，外附常见错误对照表。"
  }
];