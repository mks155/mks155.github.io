// Userscripts — 油猴脚本登记表
// ---------------------------------------------------------------------------
// 新增一个脚本的流程：
//   1) 把脚本图标（可选，svg）放到 assets/svg/
//   2) 在下面数组追加一条，链接与说明以脚本自己的 README 为准
//   3) index.html 里把 js/app.js?v= 的版本号 +1
//
// 说明字段约定：
//   summary  卡片上唯一的描述，1–2 句话说清这脚本干什么，不拆段、不罗列要点
//   stores   安装渠道，按推荐度排序，第一个视为首选
//   repo     源码仓库，卡片右上角 GitHub 图标按钮的落点
window.USERSCRIPTS = [
  {
    id: "download-router",
    name: "DownloadRouter",
    cnName: "下载路由",
    icon: "/assets/svg/downloadrouter.svg",
    repo: "https://github.com/mks155/DownloadRouter",
    site: "https://github.com/mks155/DownloadRouter",
    license: "MIT",
    version: "1.x",
    updatedAt: "2026-10-04",
    tags: ["下载加速", "右键菜单", "全协议"],
    summary: "接管浏览器里的下载链接，右键就能交给迅雷 / 比特彗星下载。识别漏网时按住 Alt + 右键强制唤起。",
    stores: [
      { name: "脚本猫", url: "https://scriptcat.org/zh-CN/script-show-page/8253", primary: true },
      { name: "Greasy Fork", url: "https://greasyfork.org/zh-CN/scripts/598571-%E4%B8%8B%E8%BD%BD%E8%B7%AF%E7%94%B1-download-router" },
      { name: "OpenUserJS", url: "https://openuserjs.org/scripts/mks155/%E4%B8%8B%E8%BD%BD%E8%B7%AF%E7%94%B1_Download_Router" }
    ]
  },
  {
    id: "huya-live-optimizer",
    name: "HuyaLiveOptimizer",
    cnName: "虎牙直播优化器",
    icon: "/assets/svg/HuyaLiveOptimizer.svg",
    repo: "https://github.com/mks155/HuyaLiveOptimizer",
    site: "https://github.com/mks155/HuyaLiveOptimizer",
    license: "MIT",
    version: "1.x",
    updatedAt: "2026-10-04",
    tags: ["直播画质", "自动观影", "弹幕增强"],
    summary: "进虎牙直播间自动切到最高画质并进入观影模式，顺带解锁被扫码限制的高档画质、给弹幕加一键 +1。",
    stores: [
      { name: "脚本猫", url: "https://scriptcat.org/zh-CN/script-show-page/8254", primary: true },
      { name: "Greasy Fork", url: "https://greasyfork.org/zh-CN/scripts/595617-huyaliveoptimizer-%E8%99%8E%E7%89%99%E7%9B%B4%E6%92%AD%E4%BC%98%E5%8C%96%E5%99%A8" },
      { name: "OpenUserJS", url: "https://openuserjs.org/scripts/mks155/HuyaLiveOptimizer_%E8%99%8E%E7%89%99%E7%9B%B4%E6%92%AD%E4%BC%98%E5%8C%96%E5%99%A8" }
    ]
  }
];