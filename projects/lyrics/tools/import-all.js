#!/usr/bin/env node
/**
 * 从本机音乐库读 .lrc，打包成 lyrics.json（页面唯一的数据源）。
 *
 *   node projects/lyrics/tools/import-all.js
 *   node projects/lyrics/tools/import-all.js --src "D:\Music"
 *   node projects/lyrics/tools/import-all.js --check     只报告，不写文件
 *
 * 产物：projects/lyrics/lyrics.json
 *   结构与页面「恢复备份」完全一致 —— { _v, _at, _count, lrc: { 歌名: {...} } }
 *   所以同一个文件既是运行时数据源，也是可传输的备份。
 *
 * 音乐库里文件名五花八门（「歌手 - 歌名.lrc」「歌名（Live）.lrc」、
 * 「歌手 - 歌名《副题》.lrc」），逐级放宽去撞歌单；命中就用歌单标题当键，
 * 对不上的按剥掉括号注释的原始歌名收着，不丢。
 *
 * 注意：lyrics.json 是歌词原文，提交上去就等于公开发布，别 add 进去。
 */
"use strict";

const fs = require("fs");
const path = require("path");

// 本文件在 projects/lyrics/tools/ 下，所以 .. 就是 projects/lyrics
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "lyrics.json");
const DEFAULT_SRC = ["F:\\Music"];

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const srcArg = args.indexOf("--src");
const SRC = srcArg >= 0 && args[srcArg + 1] ? [args[srcArg + 1]] : DEFAULT_SRC;

// 直接复用页面自己的解析器，避免两边逻辑漂移
const shim = { window: {} };
new Function("window", fs.readFileSync(path.join(ROOT, "js", "lrc.js"), "utf8"))(shim.window);
new Function("window", fs.readFileSync(path.join(ROOT, "js", "setlist.js"), "utf8"))(shim.window);
const LRC = shim.window.LRC;
const TRACKS = shim.window.LYRIC_TRACKS;
const BY_TITLE = new Map(TRACKS.map((t) => [t.title, t]));

function walk(dir, out) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^\./.test(e.name)) walk(p, out); }
    else if (/\.lrc$/i.test(e.name)) out.push(p);
  }
  return out;
}

// 候选歌名按「越原始 → 剥得越多」排序，命中歌单就用歌单标题
function candidates(base) {
  const parts = base.split(/\s+[-–—]\s+/).map((s) => s.trim()).filter(Boolean);
  const main = parts.length > 1 ? parts[parts.length - 1] : base;
  const c = [];
  const push = (x) => { x = String(x || "").replace(/[\s　]+/g, "").trim(); if (x && !c.includes(x)) c.push(x); };
  push(main);                                                                     // 原样
  push(main.replace(/《.*?》/g, ""));                                              // 去《》副题
  push(main.replace(/[（(【\[][^)）】\]]*[)）】\]]$/, ""));                         // 去尾部括号注释
  push(main.replace(/《.*?》/g, "").replace(/[（(【\[][^)）】\]]*[)）】\]]$/, ""));
  push(main.replace(/（.*?）|\(.*?\)/g, ""));                                       // 去全部括号
  push(main.replace(/《.*?》/g, "").replace(/（.*?）|\(.*?\)/g, ""));
  return c;
}

function resolveKey(base) {
  const c = candidates(base);
  for (const x of c) if (BY_TITLE.has(x)) return x;
  return c[1] || c[0];
}

const found = [];
for (const dir of SRC) found.push(...walk(dir, []));

const wanted = new Map();
let dup = 0;
for (const f of found) {
  const key = resolveKey(f.replace(/\.lrc$/i, ""));
  if (wanted.has(key)) { dup++; continue; }
  wanted.set(key, f);
}

const bag = {};
let timed = 0, plain = 0;
const broken = [];
for (const [key, src] of wanted) {
  const parsed = LRC.parse(fs.readFileSync(src, "utf8"));
  const hasLines = parsed.lines && parsed.lines.length;
  const hasPlain = parsed.plain && parsed.plain.length;
  if (!hasLines && !hasPlain) { broken.push(key); continue; }
  if (hasLines) timed++; else plain++;
  bag[key] = { lines: parsed.lines, plain: parsed.plain, meta: parsed.meta, duration: parsed.duration };
}

const names = Object.keys(bag);
const got = TRACKS.filter((t) => bag[t.title]);
const miss = TRACKS.filter((t) => !bag[t.title]);
const extra = names.filter((n) => !BY_TITLE.has(n));

if (CHECK_ONLY) {
  console.log(`扫描 ${found.length} 个 .lrc（去重 ${dup}）· 未写入（--check）`);
} else {
  const payload = { _v: 1, _at: new Date().toISOString(), _count: names.length, lrc: bag };
  fs.writeFileSync(OUT, JSON.stringify(payload), "utf8");
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  const total = names.reduce((s, k) => s + (bag[k].duration || 0), 0);
  console.log(`扫描 ${found.length} 个 .lrc（去重 ${dup}）`);
  console.log(`已写出 ${path.relative(process.cwd(), OUT)} · ${names.length} 首 · ${kb} KB`);
  console.log(`带时间轴 ${timed} 首 · 仅静态歌词 ${plain} 首 · 时长合计 ${LRC.fmt(total)}`);
}

console.log(`\n歌单覆盖 ${got.length} / ${TRACKS.length}`);
console.log("  已有: " + got.map((t) => t.index + "." + t.title).join("  "));
if (miss.length) console.log("  仍缺: " + miss.map((t) => t.index + "." + t.title).join("  "));
if (broken.length) console.log("  解析为空: " + broken.join("  "));
if (extra.length) console.log("  歌单外（收着备用）: " + extra.join("  "));
