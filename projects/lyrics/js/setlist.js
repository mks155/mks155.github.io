// 凤凰传奇 2026「吉祥如意」巡回演唱会 · 重庆站 官方歌单
// ------------------------------------------------------------
// 来源：2026-10-16/17/18 重庆站演出流程海报（35 首，含各 solo 段）。
// 只登记曲序与曲名（元数据），不含歌词 —— 歌词在同目录的 lyrics.json，
// 页面启动时一次性读完，结构与「恢复备份」通用。
window.LYRIC_SETLIST = {
  show: "吉祥如意巡回演唱会",
  city: "重庆站",
  dates: "10.16 / 10.17 / 10.18",
  parts: [
    {
      id: "p1",
      name: "PART 1",
      songs: ["光芒", "望星辰", "过山", "御龙归字谣", "我从草原来", "天蓝蓝"]
    },
    {
      id: "soloci",
      name: "曾毅 solo",
      songs: ["浪子心声", "漫步人生路"]
    },
    {
      id: "p2",
      name: "PART 2",
      songs: ["花开繁华", "大声唱", "等爱的玫瑰", "郎的诱惑", "全是爱"]
    },
    {
      id: "djm3",
      name: "DJ M3",
      songs: ["小刀会序曲", "好汉歌", "春满家园"]
    },
    {
      id: "p3",
      name: "PART 3",
      songs: ["来晒秋", "中国喜事", "好运来", "只为遇见", "年轻主义", "自由自在"]
    },
    {
      id: "sololing",
      name: "玲花 solo",
      songs: ["酒歌", "特斯河之赞"]
    },
    {
      id: "p4",
      name: "PART 4",
      songs: ["海底", "荷塘月色", "策马奔腾", "山河图"]
    },
    {
      id: "soloband",
      name: "乐队 solo",
      songs: ["不再犹豫"]
    },
    {
      id: "p5",
      name: "PART 5",
      songs: ["月亮之上", "绿旋风", "奢香夫人", "自由飞翔", "最炫民族风", "吉祥如意"]
    }
  ]
};

// 摊平成带连续序号的列表，页面各处按序号引用
(function () {
  var n = 0;
  var flat = [];
  var set = window.LYRIC_SETLIST;
  for (var p = 0; p < set.parts.length; p++) {
    var part = set.parts[p];
    for (var i = 0; i < part.songs.length; i++) {
      flat.push({
        index: ++n,
        part: part.name,
        partId: part.id,
        title: part.songs[i]
      });
    }
  }
  window.LYRIC_TRACKS = flat;
  window.LYRIC_TOTAL = flat.length;
})();
