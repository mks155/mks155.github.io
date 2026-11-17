# 手机里的 SystemHelper 是什么，怎么安全处理掉

> **适用设备**：小米 / Redmi（HyperOS、MIUI）。同款组件在 OPPO、vivo、三星国行、摩托罗拉、努比亚、一加、真我、中兴的部分机型上也存在，思路通用。
>
> **前提**：一台电脑 + 数据线 + `adb`，**全程不需要 root**。
>
> **风险等级**：低。本文的处置方式只做「冻结」，不删系统文件，随时可恢复；删 `/system` 下的文件会破坏 OTA 校验，不推荐。

---

## 阅读方式（人类 / bot）

同一篇文档，两条路径。先确认自己是哪一类，别把给机器看的步骤当成人来读。

| 你是 | 从哪开始 | 怎么走 |
|---|---|---|
| **人类读者** | [第 3 节](#h-3-先确认你的手机有没有) → [第 4 节](#h-4-准备-adb-含下载) → [第 9 节](#h-9-一键脚本-双击就能用) | 不用敲命令：装好 adb，双击 bat，菜单按 `1` 看状态、`2` 执行、`3` 恢复 |
| **AI / bot（能操作电脑）** | [第 13 节 Bot 执行协议](#h-13-bot-执行协议-给-ai-用) | 按 S0 → S6 顺序执行，每步都有预期输出与中止条件；五条硬指标全绿才算完成 |
| **AI / bot（只能读文本）** | 本页 Markdown 原文 | 不需要渲染页面，直接取下面的地址 |

机器可读入口：

| 用途 | 地址 |
|---|---|
| 渲染后的页面 | `https://mks155.github.io/projects/articles/#a=systemhelper-guide` |
| Markdown 原文 | `https://mks155.github.io/projects/articles/md/SystemHelper-通用处置指南.md` |
| adb 官方直链（**bot 用这个**） | [platform-tools-latest-windows.zip](https://dl.google.com/android/repository/platform-tools-latest-windows.zip) |

> 网盘链接是给人在浏览器里点的，脚本抓不到（只会拿到登录页）。bot 一律走官方直链或 `winget`，见 [4.1 下载](#h-4-1-下载)。

---

## 一句话结论

`com.mobiletools.systemhelper` 是**中国联通的运营商设备管理客户端**（OMA-DM / TR-069 变种），预装在系统分区 `/system/priv-app/`，用厂商平台签名，所以在「设置 → 应用」里**卸不掉**。

它会采集设备标识、基站参数、已安装应用列表与使用时长，通过**明文 HTTP** 上报到 `dm.wo.com.cn:18080`。

它**不是小米自家的组件**，也**不是病毒**。不影响正常使用；如果你在意隐私，按本文把它**冻结**掉即可，冻结不影响打电话、发短信、5G 上网。

---

## 目录

> - [阅读方式（人类 / bot）](#h-阅读方式-人类-bot)
> - [1. 三个容易搞混的包名](#h-1-三个容易搞混的包名)
> - [2. 它到底在收集什么](#h-2-它到底在收集什么)
> - [3. 先确认你的手机有没有](#h-3-先确认你的手机有没有)
> - [4. 准备 adb（含下载）](#h-4-准备-adb-含下载)
> - [5. 处置方案（力度从小到大）](#h-5-处置方案-力度从小到大)
> - [6. 验证是否真的停住了](#h-6-验证是否真的停住了)
> - [7. 怎么恢复](#h-7-怎么恢复)
> - [8. 副作用与边界](#h-8-副作用与边界)
> - [9. 一键脚本（双击就能用）](#h-9-一键脚本-双击就能用)
> - [10. 常见问题](#h-10-常见问题)
> - [11. 命令速查表](#h-11-命令速查表)
> - [12. 参考来源](#h-12-参考来源)
> - [13. Bot 执行协议（给 AI 用）](#h-13-bot-执行协议-给-ai-用)

---

## 1. 三个容易搞混的包名

这三个包名长得很像，处理对象只有第一个。

| 包名 | 是谁的 | 说明 |
|---|---|---|
| `com.mobiletools.systemhelper` | 中国联通 | **本文要处理的对象** |
| `com.miui.guardprovider` | 小米 | 「系统安全组件」，做反诈检测，删了容易出问题，**别动** |
| `com.qualcomm.qti.services.systemhelper` | 高通 | 芯片相关系统服务，与本文无关，**别动，会变砖** |

> 只冻结第一个。后两个不是同一类东西，误伤代价远大于收益。

---

## 2. 它到底在收集什么

以下字段来自对 APK 与本地数据库的公开逆向分析，不同版本略有差异。

| 类别 | 具体内容 |
|---|---|
| 设备 | 厂商、型号、硬件版本、系统版本、Android 版本 |
| 卡 | IMEI1/2、IMSI1/2、ICCID1/2、手机号（MSISDN1/2）、运营商编码 |
| 网络 | 网络制式、VoLTE / 5G 开关、数据卡槽、公网 IP、IPv6 |
| 基站 | TAC、CID、PCI（配合基站库可以反推大致位置） |
| 硬件 | RAM / ROM 容量、剩余空间 |
| 应用 | **已安装应用列表、过去 24 小时使用时长、上下行流量** |

对应的权限里，比较扎眼的是这四条：

```text
READ_PRIVILEGED_PHONE_STATE   ← 绕开 Android 10+ 对普通应用读 IMEI 的限制
ACCESS_BACKGROUND_LOCATION    ← 后台定位
PACKAGE_USAGE_STATS           ← 应用使用统计
QUERY_ALL_PACKAGES            ← 读取全部已安装应用
```

另外还有几个实现层面的问题：

- `usesCleartextTraffic=true`，上报走的是 **HTTP 而非 HTTPS**，传输链路可被中间人观察
- 有一个 `exported` 且无权限保护的服务，第三方应用可以直接 bind 并**改写上报地址**
- 开机广播接收器优先级设为最大值（`2147483647`），会在开机时抢占广播队列
- 保留了一个 `exported` 的调试用 Activity

**它多久跑一次？** 不是常驻后台。典型节奏是「每天定时醒一次 → 上报一次 → 被系统回收」，外加开机和 SIM 状态变化时触发。所以它在任务管理器里时有时无，是正常的。

---

## 3. 先确认你的手机有没有

```bash
adb devices
adb -s <序列号> shell pm list packages | grep -i systemhelper
```

只看名字容易误伤，建议直接看完整路径：

```bash
adb -s <序列号> shell pm list packages -f | grep com.mobiletools.systemhelper
```

有输出、且路径在 `/system/priv-app/` 下，就是它。再确认版本和 UID：

```bash
adb -s <序列号> shell dumpsys package com.mobiletools.systemhelper | grep -E "versionName|User 0:"
```

> **没有输出就到此为止。** 说明你的机器上没有这个包（港版、海外版、部分自刷 ROM 通常没有），不用往下做。

---

## 4. 准备 adb（含下载）

### 4.1 下载

三种来源，任选一种。**能连外网就让脚本自己下；网盘那条是给人手动点的。**

| 来源 | 地址 | 适合 |
|---|---|---|
| 官方直链 | **[↓ 下载 platform-tools-latest-windows.zip](https://dl.google.com/android/repository/platform-tools-latest-windows.zip)** | bot / 能访问 Google 的网络，一条 `curl` 搞定 |
| winget | `winget install --id Google.PlatformTools -e` | Windows 10 / 11，装完自动在 `Path` 里 |
| 百度网盘 | **[↓ 下载 adb.zip（提取码 `6666`）](https://pan.baidu.com/s/1HKlKIVSemLa-tSI76iUfFg?pwd=6666)** | 国内网络、不想装包管理器 |

官方直链约 8 MB，解压后是一个 `platform-tools/` 目录。Windows 上（Win10 1803 起自带 `curl` 和 `tar`）直接这么下：

```bat
curl -L -o platform-tools.zip https://dl.google.com/android/repository/platform-tools-latest-windows.zip
mkdir D:\adb
tar -xf platform-tools.zip -C D:\adb
D:\adb\platform-tools\adb.exe version
```

macOS / Linux 把地址换成 `platform-tools-latest-darwin.zip` / `platform-tools-latest-linux.zip`，解压改用 `unzip -q platform-tools.zip -d ~/adb`；之后的 `adb` 命令完全一致。

> **网盘链接不能自动化下载。** 百度网盘要登录、要过验证码和跳转，`curl` / `wget` 抓回来的只是一段 HTML 登录页。bot 请走官方直链或 `winget`；官方下载页（含校验信息）是 `developer.android.com/studio/releases/platform-tools`。
>
> 三种来源的命令完全一致，装哪个都行；区别只是版本新旧与是否需要手动解压。

### 4.2 解压与放置

1. 把下载到的压缩包（`adb.zip` 或 `platform-tools.zip`）解压到一个**路径里没有中文和空格**的目录，例如 `D:\adb`
2. 打开该目录，确认能看到 `adb.exe`。官方包会多一层 `platform-tools\`，`adb.exe` 在那一层里面
3. 想在任何目录都能用 `adb` 命令，就把 **`adb.exe` 所在的那一层目录**加进系统环境变量 `Path`；
   不想改环境变量也可以，**直接在该目录里打开命令行**，或在命令前写全路径

验证：

```bash
adb version
```

有版本号输出就说明能用。提示 `'adb' 不是内部或外部命令`，说明没在 `Path` 里，见上面的第 3 条。

### 4.3 打开 USB 调试并连机

1. 手机：**设置 → 关于手机 → 连点「版本号」7 次**，打开开发者选项
2. **设置 → 系统 → 开发者选项 → USB 调试**，打开
3. 数据线连电脑（**必须是能传数据的线**，很多线只有充电功能）
4. 手机上弹出「允许 USB 调试吗」，勾选「一律允许」并确定

```bash
adb devices
```

正常输出形如：

```text
List of devices attached
a1b2c3d4        device
```

> 状态是 `unauthorized` 说明第 4 步没点允许；是 `offline` 就先拔插一次，或执行 `adb kill-server` 再 `adb devices`。
>
> 电脑上开着模拟器（MuMu、雷电等）时，列表里会多出 `emulator-5554` 之类的条目。**后面所有命令都要用 `-s <序列号>` 指定真机**，别把命令打到模拟器上。

---

## 5. 处置方案（力度从小到大）

### 方案 A：标准停用

多数机型的第一步。

```bash
adb -s <序列号> shell pm disable-user --user 0 com.mobiletools.systemhelper
```

成功会返回 `Package ... new state: disabled-user`。

**但在小米 MIUI / HyperOS 上大概率会被拒绝：**

```text
java.lang.SecurityException: Cannot disable system packages.
  at com.android.server.pm.PackageManagerServiceImpl.shouldRestrictEnabledSettingsChange(...)
```

这是厂商在 `PackageManagerServiceImpl` 里加的私有拦截，不是权限不够，换 `su` 也一样。遇到这个就跳到**方案 C**。

### 方案 B：用户级卸载（能成功的话最彻底）

```bash
adb -s <序列号> shell pm uninstall --user 0 com.mobiletools.systemhelper
```

| 项目 | 说明 |
|---|---|
| 含义 | 只取消当前用户（user 0）的安装登记，系统分区的 APK 仍在，`installed=false` |
| 效果 | 应用列表里消失，开机不会被拉起，桌面无图标 |
| 恢复 | `adb shell cmd package install-existing com.mobiletools.systemhelper` |
| 兼容性 | 小米 14 Pro（HyperOS 3）实测直接 `Success`；小米 17 系列（HyperOS 4 / Android 17）实测返回 `only root can delete system app for a particular user`，需要额外的 DEX 工具直调 `IPackageManager.deletePackageAsUser(..., DELETE_KEEP_DATA \| DELETE_SYSTEM_APP)`，普通用户不建议折腾 |

### 方案 C：冻结组合（被拒绝时的通用解法，不需要 root）

四步，缺一不可。下面是 bash 语法，Windows 用户直接用[第 9 节的一键脚本](#h-9-一键脚本-双击就能用)。

```bash
PKG=com.mobiletools.systemhelper
S=<序列号>

# 1) 挂起：组件无法启动、收不到广播（含开机广播），桌面图标消失
adb -s $S shell pm suspend --user 0 $PKG

# 2) 强停当前进程
adb -s $S shell am force-stop --user 0 $PKG

# 3) 压到最严待机分组
adb -s $S shell am set-standby-bucket --user 0 $PKG restricted

# 4) 按 UID 锁掉敏感 AppOps
UID=$(adb -s $S shell pm list packages -U | grep $PKG | sed 's/.*uid://')
for op in RUN_ANY_IN_BACKGROUND READ_PHONE_STATE COARSE_LOCATION FINE_LOCATION GET_USAGE_STATS; do
  adb -s $S shell cmd appops set --uid $UID $op ignore
done
```

**关键在第 1 步。** 只做 `force-stop` 和后台限制是没用的——实测重启后系统电话组件（`SIMStateReceiver`）仍然会把它拉起来跑几十秒再被回收。

`suspended=true` 是系统级冻结，状态写在 `package-restrictions.xml` 里，**重启后保持**。

### 方案 D：有 root 的情况（可选）

```bash
# ① 直接从系统分区删掉（会破坏系统分区校验，OTA 前务必恢复，一定备份并谨慎操作）
adb shell su -c "mount -o rw,remount /system"
adb shell su -c "rm -rf /system/priv-app/SystemHelper"

# ② 或者只堵网络：把上报域名指到黑洞
adb shell su -c "echo '127.0.0.1 dm.wo.com.cn' >> /system/etc/hosts"
```

> ② 比 ① 温和得多：APK 还在，但再也连不上联通服务器。**优先选 ②。**

---

## 6. 验证是否真的停住了

```bash
PKG=com.mobiletools.systemhelper

# 状态：看 suspended / stopped / installed
adb shell dumpsys package $PKG | grep "User 0:"
#   方案 C 期望：suspended=true ... stopped=true
#   方案 B 期望：installed=false

# 进程：应该没有输出
adb shell pidof $PKG

# 待机分组：10 = restricted
adb shell am get-standby-bucket --user 0 $PKG

# AppOps：五项都应该是 ignore
adb shell cmd appops get --uid $UID
```

再试着拉起它一次，应该直接被系统拒绝：

```bash
adb shell am start --user 0 -n $PKG/.TestActivity
```

| 输出项 | 正常值 | 说明 |
|---|---|---|
| `suspended=` | `true` | 已冻结。`false` 说明第 1 步没生效 |
| `stopped=` | `true` | 进程已被杀掉并保持停止 |
| 进程 | 空 | `pidof` 没有输出才是对的 |
| 待机分组 | `10` | 10 就是 `restricted`（最严） |
| AppOps | `ignore` | 五项都应该是 ignore |

---

## 7. 怎么恢复

```bash
PKG=com.mobiletools.systemhelper

# 方案 C 的恢复
adb shell pm unsuspend --user 0 $PKG
adb shell am set-standby-bucket --user 0 $PKG active
adb shell cmd appops reset --uid $UID
# 重启一次手机，图标和开机注册才会回来

# 方案 B 的恢复
adb shell cmd package install-existing com.mobiletools.systemhelper
```

恢复后反过来看：`suspended=false`、待机分组回到 `0`（active）。

---

## 8. 副作用与边界

1. **不影响通信**：这个组件和电话、短信、5G 数据在系统层是解耦的，冻结它不会掉信号。
2. **桌面图标会消失**（方案 B、C 都是），这是正常现象，不是「应用损坏」。
3. **系统大版本 OTA 可能重置**。升级完请重新跑一遍第 6 节的验证命令。
4. **恢复出厂设置一定会重置**，需要重新做一次。
5. **不同厂商行为不同**：ColorOS / OriginOS / One UI 对 `suspend` 的支持程度不一，命令报错不代表方法无效，只是这条路在你机器上不通，可以改试方案 B 或 A。
6. **不要碰 `com.miui.guardprovider`**。它是小米的反诈模块，涉及系统完整性校验，删了可能出现延迟推送、应用安装异常等问题。
7. **本文不做「它在偷传你的数据」这类定性**。公开分析能证明的是：它有能力采集这些字段、终端地址是 `dm.wo.com.cn:18080`、通道是明文 HTTP；具体某台设备上实际传了什么，需要抓包才能确认，不要拿推断当事实传播。

---

## 9. 一键脚本（双击就能用）

### 9.1 创建脚本

1. 按 `Win`，输入「记事本」，打开
2. 把下面[完整脚本](#h-9-6-完整脚本)整段复制粘贴进去
3. 点「文件 → 另存为」
4. **文件名**填 `"SystemHelper.bat"`（两边加英文双引号，可以避免记事本偷偷加 `.txt` 后缀）
5. **保存类型**选：`所有文件 (*.*)`
6. **编码**选：`UTF-8`
7. 保存到桌面，或直接保存到 `adb.exe` 所在目录

> 编码一定要选 UTF-8。选成 ANSI 的话，菜单里的中文会变成乱码（功能不受影响，但看着别扭）。

### 9.2 运行

**方式一（推荐）**：双击 `SystemHelper.bat`，出现菜单：

```text
============================================
   SystemHelper 处置工具
   包名: com.mobiletools.systemhelper
============================================
   [1] 查看状态（只读，不改任何东西）
   [2] 禁用（挂起 + 强停 + 限后台 + 锁权限）
   [3] 恢复（解除全部限制）
   [0] 退出
============================================
请输入序号后回车:
```

第一次用**先按 1**，确认能看到 `suspended=` / `installed=` 这类字段，说明连接正常，再按 2。

**方式二**：命令行指定动作，适合排查。

```bat
SystemHelper.bat status
SystemHelper.bat disable
SystemHelper.bat restore
```

### 9.3 判断结果

结果判读见[第 6 节](#h-6-验证是否真的停住了)的对照表：`suspended=true`、`stopped=true`、进程为空、待机分组 `10`、AppOps 全为 `ignore`。

### 9.4 脚本做了什么

- **自动跳过 `emulator-` 开头的设备**：电脑上开着模拟器（MuMu、雷电等）时，不加这条很容易把命令打到模拟器上，白忙一场
- **UID 动态获取**：`pm list packages -U` 现场取，OTA 后 UID 变了也不用改脚本
- **包里没有就直接退出**：不会对着一台没有该组件的手机硬跑命令
- 每个动作末尾都有 `pause`，双击运行不会一闪而过

### 9.5 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `'adb' 不是内部或外部命令` | adb 不在 `Path` 里 | 把 bat 放到 `adb.exe` 同目录，或用完整路径 |
| 提示「没有找到真机」 | 手机没连上 / 只充电 | 换数据线、换 USB 口、确认 USB 调试已允许 |
| 双击一闪而过 | 脚本被改坏或编码错 | 用 `cmd` 手动运行 `SystemHelper.bat status` 看报错 |
| 中文变成方块 / 乱码 | 保存时编码选了 ANSI | 重新另存为 UTF-8 |
| 输出 `Cannot disable system packages` | 用的是方案 A 的 `disable-user` | 改用本脚本（方案 C） |
| 手机上没有这个包 | 港版 / 海外版 / 纯净 ROM | 提示「无需处理」，直接退出，正常现象 |

### 9.6 完整脚本

```bat
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SystemHelper 处置工具

set "PKG=com.mobiletools.systemhelper"
set "ACTION=%~1"

if "%ACTION%"=="" goto menu

:run
if /i "%ACTION%"=="1" set "ACTION=status"
if /i "%ACTION%"=="2" set "ACTION=disable"
if /i "%ACTION%"=="3" set "ACTION=restore"

rem ============ 找设备（自动跳过模拟器）============
set "SERIAL="
for /f "skip=1 tokens=1,2" %%a in ('adb devices') do (
    if "%%b"=="device" (
        set "S=%%a"
        echo !S! | findstr /b /c:"emulator-" >nul
        if errorlevel 1 (
            if not defined SERIAL set "SERIAL=!S!"
        )
    )
)

if not defined SERIAL (
    echo.
    echo [错误] 没有找到真机。请依次检查：
    echo   1. 数据线要能传数据（很多线只有充电功能）
    echo   2. 手机：设置 -^> 开发者选项 -^> USB 调试 已打开
    echo   3. 插上后手机上弹出“允许 USB 调试吗”，要点允许
    echo   4. 在命令行执行 adb devices，看能否列出你的手机
    echo.
    pause
    exit /b 1
)

echo 设备: %SERIAL%

rem ============ 包是否存在 ============
set "PATHP="
for /f "delims=" %%P in ('adb -s %SERIAL% shell pm path %PKG% 2^>nul') do set "PATHP=%%P"
if not defined PATHP (
    echo.
    echo 这台设备上没有 %PKG%，无需处理。
    pause
    exit /b 0
)
echo 路径: %PATHP%

rem ============ 取 UID ============
set "UID="
for /f "delims=" %%L in ('adb -s %SERIAL% shell pm list packages -U ^| findstr /c:"%PKG%"') do (
    set "LINE=%%L"
    set "UID=!LINE:*uid:=!"
)
echo UID : %UID%
echo.

if /i "%ACTION%"=="status"  goto status
if /i "%ACTION%"=="disable" goto disable
if /i "%ACTION%"=="restore" goto restore
echo [错误] 未知参数: %ACTION%
echo 用法: %~nx0 [status^|disable^|restore]
pause
exit /b 1

rem ============ 查看状态 ============
:status
echo ==== 当前状态 ====
adb -s %SERIAL% shell "dumpsys package %PKG% | grep 'User 0:'" 2>nul
echo.
echo 待机分组（10 = restricted，最严）:
adb -s %SERIAL% shell am get-standby-bucket --user 0 %PKG%
echo.
echo 进程（下面没有内容 = 没在运行）:
adb -s %SERIAL% shell pidof %PKG%
echo.
echo AppOps:
adb -s %SERIAL% shell "cmd appops get --uid %UID% | grep -E 'RUN_ANY_IN_BACKGROUND|READ_PHONE_STATE|LOCATION|GET_USAGE_STATS'"
echo.
pause
exit /b 0

rem ============ 禁用 ============
:disable
echo ==== 禁用 ====
echo.
echo [1/4] 挂起（阻断启动和广播，最关键的一步）
adb -s %SERIAL% shell pm suspend --user 0 %PKG%
echo.
echo [2/4] 强制停止当前进程
adb -s %SERIAL% shell am force-stop --user 0 %PKG%
echo.
echo [3/4] 压到最严待机分组
adb -s %SERIAL% shell am set-standby-bucket --user 0 %PKG% restricted
echo.
echo [4/4] 锁定敏感权限（AppOps）
for %%o in (RUN_ANY_IN_BACKGROUND READ_PHONE_STATE COARSE_LOCATION FINE_LOCATION GET_USAGE_STATS) do (
    adb -s %SERIAL% shell cmd appops set --uid %UID% %%o ignore
    echo       %%o -^> ignore
)
echo.
echo ==== 回读 ====
adb -s %SERIAL% shell "dumpsys package %PKG% | grep 'User 0:'" 2>nul
echo 待机分组:
adb -s %SERIAL% shell am get-standby-bucket --user 0 %PKG%
echo 进程:
adb -s %SERIAL% shell pidof %PKG%
echo.
echo 期望结果: suspended=true、stopped=true、进程为空、bucket=10
echo.
pause
exit /b 0

rem ============ 恢复 ============
:restore
echo ==== 恢复 ====
echo.
echo [1/3] 解除挂起
adb -s %SERIAL% shell pm unsuspend --user 0 %PKG%
echo.
echo [2/3] 待机分组恢复默认
adb -s %SERIAL% shell am set-standby-bucket --user 0 %PKG% active
echo.
echo [3/3] 重置 AppOps
adb -s %SERIAL% shell cmd appops reset --uid %UID%
echo.
echo 完成。手机重启一次后，桌面图标和开机注册才会回来。
echo.
pause
exit /b 0

rem ============ 菜单 ============
:menu
cls
echo ============================================
echo    SystemHelper 处置工具
echo    包名: %PKG%
echo ============================================
echo    [1] 查看状态（只读，不改任何东西）
echo    [2] 禁用（挂起 + 强停 + 限后台 + 锁权限）
echo    [3] 恢复（解除全部限制）
echo    [0] 退出
echo ============================================
echo.
set /p "ACTION=请输入序号后回车: "
echo.
if "%ACTION%"=="0" exit /b 0
if "%ACTION%"=="" goto menu
goto run
```

---

## 10. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `pm disable-user` 报 `Cannot disable system packages` | 厂商拦截，不是权限问题 | 走方案 C |
| `pm uninstall --user 0` 报 `only root can delete system app` | 新系统收紧了用户级卸载 | 走方案 C |
| 冻结后任务管理器里还能看到它 | 冻结前已被系统拉起 | 正常，`pm suspend` 只阻止新的启动；强停一次即可 |
| 重启后状态回到未冻结 | OTA / 恢复出厂重置了 `package-restrictions.xml` | 重新跑一遍脚本 |
| `adb devices` 只显示 `offline` | adb 服务状态异常 | `adb kill-server` 后重新 `adb devices` |
| 命令打到了模拟器上 | 没加 `-s <序列号>` | 用 `adb devices` 拿真机序列号，所有命令都带 `-s` |
| 担心影响打电话 / 收短信 | 组件与通信栈解耦 | 冻结不影响通信；真不放心就按第 7 节恢复 |

---

## 11. 命令速查表

| 目的 | 命令 |
|---|---|
| 确认包是否存在 | `adb shell pm list packages -f \| grep com.mobiletools.systemhelper` |
| 看版本与状态 | `adb shell dumpsys package com.mobiletools.systemhelper \| grep "User 0:"` |
| 标准停用 | `adb shell pm disable-user --user 0 com.mobiletools.systemhelper` |
| 用户级卸载 | `adb shell pm uninstall --user 0 com.mobiletools.systemhelper` |
| 冻结（挂起） | `adb shell pm suspend --user 0 com.mobiletools.systemhelper` |
| 强停进程 | `adb shell am force-stop --user 0 com.mobiletools.systemhelper` |
| 最严待机分组 | `adb shell am set-standby-bucket --user 0 com.mobiletools.systemhelper restricted` |
| 解除冻结 | `adb shell pm unsuspend --user 0 com.mobiletools.systemhelper` |
| 恢复用户级卸载 | `adb shell cmd package install-existing com.mobiletools.systemhelper` |
| 重置 AppOps | `adb shell cmd appops reset --uid <UID>` |

---

## 12. 参考来源

- 公开逆向分析（APK 结构、权限、上报字段、`dm.wo.com.cn:18080` 端点）
- 多机型免 root 处置实测记录：小米 14 Pro / HyperOS 3 上 `uninstall --user 0` 成功；小米 17 Pro Max / HyperOS 4 上标准命令被拒，需 DEX 工具直调应用管理接口
- 厂商平台拦截点：`PackageManagerServiceImpl.shouldRestrictEnabledSettingsChange`
- Android 官方文档：`pm suspend` / `pm uninstall --user 0` / AppOps 语义

> 本文命令在 Android 15 / 17，HyperOS 3 / 4 上实测通过；其他机型请先备份，再按方案 A 逐级尝试。

---

## 13. Bot 执行协议（给 AI 用）

这一节是给能读文本、也能调用 `adb` 的 AI 用的。**读完 1、2、5、8 四节再动手**：1 讲包名区分，2 讲采集内容，5 是方案边界，8 是副作用与禁止动作。

> **总目标**：在不 root、不改 `/system` 的前提下冻结 `com.mobiletools.systemhelper`，并交出可核对的证据。
>
> **硬约束**：只执行下面出现过的命令；不删 `/system` 下任何文件；不 `pm uninstall` 其他包；不碰 `com.miui.guardprovider` 与 `com.qualcomm.qti.services.systemhelper`；不 `adb root`、不 `fastboot`。

### 13.1 参数与判据

| 项 | 值 |
|---|---|
| 目标包 | `com.mobiletools.systemhelper` |
| 允许的写操作 | `pm disable-user` / `pm suspend` / `am force-stop` / `am set-standby-bucket` / `cmd appops set`；必要时 `pm uninstall --user 0` |
| 成功判据（全绿才算完成） | `suspended=true`、`stopped=true`、`pidof` 无输出、待机分组 `10`、5 项 AppOps 全为 `ignore` |
| 失败判据 | 出现 `SecurityException` 且四步冻结也失败；或需要 root 才能继续 |

### 13.2 执行顺序

严格按 S0 → S6 走，**任一步不满足「期望」就按该步的失败处理，不要跳步、不要重试循环**。

**S0 环境自检**

```bash
adb version
adb devices
```

- 期望：`adb devices` 至少一行以 `device` 结尾
- 无 adb：按 [4.1](#h-4-1-下载) 装
- `unauthorized`：请人在手机上点「允许 USB 调试」，**不要自己反复重连**
- `offline`：`adb kill-server` 后重试一次，仍失败就停
- **选设备**：过滤掉 `emulator-` 开头的行。剩 1 台就用它；剩多台就停下问人，不要猜

**S1 目标是否存在**

```bash
adb -s "$S" shell pm path com.mobiletools.systemhelper
```

- 期望：`package:/system/priv-app/.../....apk`
- 空输出：结论「本机无此组件」，**结束，不执行任何写操作**
- 路径不在 `/system/priv-app/` 下：停下问人（可能是同名第三方包）

**S2 记录基线（必须原样保留输出）**

```bash
adb -s "$S" shell dumpsys package com.mobiletools.systemhelper | grep "User 0:"
adb -s "$S" shell am get-standby-bucket --user 0 com.mobiletools.systemhelper
adb -s "$S" shell pm list packages -U | grep com.mobiletools.systemhelper
```

**S3 首选：标准停用**

```bash
adb -s "$S" shell pm disable-user --user 0 com.mobiletools.systemhelper
```

| 输出 | 含义 | 下一步 |
|---|---|---|
| `new state: disabled-user` | 成功 | 跳到 S5 |
| `Cannot disable system packages` | 厂商拦截（MIUI / HyperOS 常态） | 继续 S4 |
| `only root can delete system app` | 命令用错了或系统收紧 | 继续 S4 |
| `Success`（uninstall 场景） | 用户级卸载成功 | 直接 S5，S6 里 `method` 记 `uninstall-user0` |

**S4 兜底：四步冻结**

```bash
adb -s "$S" shell pm suspend --user 0 com.mobiletools.systemhelper
adb -s "$S" shell am force-stop --user 0 com.mobiletools.systemhelper
adb -s "$S" shell am set-standby-bucket --user 0 com.mobiletools.systemhelper restricted
UID=$(adb -s "$S" shell pm list packages -U | grep com.mobiletools.systemhelper | sed 's/.*uid://')
for op in RUN_ANY_IN_BACKGROUND READ_PHONE_STATE COARSE_LOCATION FINE_LOCATION GET_USAGE_STATS; do
  adb -s "$S" shell cmd appops set --uid "$UID" "$op" ignore
done
```

- 第一行是关键：只做 force-stop 和限后台，重启后系统电话组件还会把它拉起来
- Windows 上没有 `grep` / `sed`：直接调 [9.6 的脚本](#h-9-6-完整脚本) `SystemHelper.bat disable`，它已内置同样的四步与 UID 解析

**S5 验证（五项全过才算完成）**

| 检查项 | 命令 | 通过条件 |
|---|---|---|
| 冻结状态 | `adb -s "$S" shell dumpsys package com.mobiletools.systemhelper \| grep "User 0:"` | 含 `suspended=true` 且 `stopped=true` |
| 进程 | `adb -s "$S" shell pidof com.mobiletools.systemhelper` | 无输出 |
| 待机分组 | `adb -s "$S" shell am get-standby-bucket --user 0 com.mobiletools.systemhelper` | 输出 `10` |
| AppOps | `adb -s "$S" shell cmd appops get --uid "$UID"` | 5 项全为 `ignore` |
| 拉起被拒 | `adb -s "$S" shell am start --user 0 -n com.mobiletools.systemhelper/.TestActivity` | 报错或拒绝，且 `pidof` 仍为空 |

任一项不过：**不要靠加码命令硬凑**，回到 S4 重跑一次，仍不过就按失败处理上报。

**S6 汇报（按这个结构输出，缺项视为未完成）**

```json
{
  "device": "<序列号>",
  "package": "com.mobiletools.systemhelper",
  "present": true,
  "method": "disable-user | suspend | uninstall-user0",
  "checks": {
    "suspended": true,
    "stopped": true,
    "pid": null,
    "standby_bucket": 10,
    "appops_ignored": [
      "RUN_ANY_IN_BACKGROUND",
      "READ_PHONE_STATE",
      "COARSE_LOCATION",
      "FINE_LOCATION",
      "GET_USAGE_STATS"
    ],
    "relaunch_blocked": true
  },
  "baseline": "<S2 三条命令的原始输出>",
  "warnings": [],
  "rollback": [
    "adb -s <序列号> shell pm unsuspend --user 0 com.mobiletools.systemhelper",
    "adb -s <序列号> shell am set-standby-bucket --user 0 com.mobiletools.systemhelper active",
    "adb -s <序列号> shell cmd appops reset --uid <UID>"
  ]
}
```

### 13.3 失败即停，不要绕过

- `adb devices` 出现 `unauthorized` → 必须由人点允许
- 目标路径不在 `/system/priv-app/` → 可能不是同一个包，停下确认
- 需要 root / 需要刷机 / 需要改 `/system` → 超出本文范围，直接上报
- 任何 `SecurityException` 在 S4 重试后仍出现 → 上报原始命令与原始输出

> 汇报里**只写实际观察到的输出**，不要根据「应该会成功」去补全字段。判据没过就写没过。

### 13.4 不建议 bot 做的事

| 不要做 | 原因 |
|---|---|
| 删 `/system/priv-app/SystemHelper` | 破坏系统分区校验，OTA 失败甚至无法开机 |
| 对多设备批量跑命令 | 模拟器 / 多账号实例会被一起打到 |
| 用网盘链接做自动下载 | 拿到的是 HTML 登录页，不是 zip |
| 顺手处理 `com.miui.guardprovider` | 小米反诈模块，影响系统完整性校验 |
| 冻结后立刻重启验证 | 先按 S5 当场验证，重启只在需要确认持久性时做一次 |
