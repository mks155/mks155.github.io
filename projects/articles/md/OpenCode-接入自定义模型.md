# OpenCode V2 自定义模型接入指南

> **适用版本：OpenCode V2（2.x）**
> V1 与 V2 的配置语法**不兼容**。本文只讲 V2，V1 用户请勿直接套用。
>
> V1 → V2 的关键差异见文末「迁移对照表」。

---

## 适用范围

本文用于把**任意 OpenAI 兼容的本地或远程服务**接入 OpenCode 作为可选模型，例如：

- 本地推理引擎（llama.cpp / vLLM / Ollama / LM Studio 等）
- 自建推理服务
- 第三方 OpenAI 兼容网关

前提：目标服务提供 OpenAI 兼容的 `/v1/chat/completions` 接口。

---

## 第 1 步：确认三个信息

访问目标服务的模型列表接口：

```
GET http://<地址>:<端口>/v1/models
```

从返回结果中确认三件事：

| 需要的信息 | 在返回结果中的位置 | 用途 |
|---|---|---|
| **模型 ID** | `data[].id` | 填入配置里的 `modelID` |
| **上下文长度** | `data[].meta.n_ctx` | 填入配置里的 `limit.context` |
| **输入模态** | `data[].architecture.input_modalities` | 决定 `capabilities.input` 填 `text` 还是加 `image` |

返回示例：

```json
{
  "data": [
    {
      "id": "qwen3.8-flash-next",
      "meta": { "n_ctx": 32768 },
      "architecture": {
        "input_modalities": ["text"],
        "output_modalities": ["text"]
      }
    }
  ]
}
```

对应要填的值：

- `modelID` = `qwen3.8-flash-next`
- `context` = `32768`
- `input` = `["text"]`

> **这三个值必须来自服务端实际返回，不要凭印象填。**
> 上下文长度填错会在对话中途报错；模型 ID 填错会直接报 `Model unavailable`。
> `input_modalities` 里没有 `image` 却声明支持图片，会导致上传图片后静默失败。

---

## 第 2 步：打开配置文件

| 生效范围 | 文件位置 |
|---|---|
| **所有项目**（推荐） | `$env:USERPROFILE\.config\opencode\opencode.jsonc` |
| 单个项目 | `<项目目录>\opencode.jsonc` |
| 单个项目（另一形式） | `<项目目录>\.opencode\opencode.jsonc` |

Windows 下 `$env:USERPROFILE` 通常是 `C:\Users\<你的用户名>`。

文件不存在就直接新建。**如果已有其他配置（MCP、权限等），只追加内容，不要覆盖。**

### 配置优先级

OpenCode 会从当前工作目录**一路向上扫描到磁盘根**，按以下顺序合并：

```
1. 全局  $env:USERPROFILE\.config\opencode\opencode.jsonc     ← 优先级最低
2. 项目根  opencode.jsonc
3. 更深的子目录  opencode.jsonc
4. .opencode\opencode.jsonc        ← 同级中优先级最高
```

合并规则：**不冲突的字段全部保留，只有同名同层级的字段才覆盖。**
所以在项目配置里写 `providers` 不会丢掉全局配置里的 `mcp`。

---

## 第 3 步：写入配置（核心步骤）

### 最小可用模板

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "providers": {
    "myai": {
      "name": "我的 AI 服务",
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": {
        "baseURL": "http://<地址>:<端口>/v1"
      },
      "models": {
        "coder": {
          "modelID": "把第 1 步的模型 ID 粘这里",
          "name": "显示名",
          "capabilities": {
            "tools": true,
            "input": ["text"],
            "output": ["text"]
          },
          "limit": {
            "context": 32768,
            "output": 32768
          }
        }
      }
    }
  }
}
```

**需要替换的位置只有 4 处：**

| 位置 | 填什么 |
|---|---|
| `"myai"` | 你自定义的 provider ID，引用模型时用它做前缀 |
| `models` 里的 `"coder"` | 模型短名，引用时用它 |
| `settings.baseURL` | 服务地址，**结尾要有 `/v1`** |
| `modelID` / `limit.context` | 第 1 步抄来的值 |

> ⚠️ **必须确认顶层字段是 `providers`（复数），包声明用 `package`。**
> 写成 `"provider"` + `"npm"` 是 V1 语法，在 V2 里不生效。

### provider 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 否 | 界面显示名 |
| `package` | 是 | 运行时包，决定用哪种协议实现 |
| `env` | 否 | 凭证的环境变量名，按顺序尝试 |
| `canonical` | 否 | 继承某个内置 provider 的目录默认值 |
| `settings` | 否 | 端点、超时、采样类配置 |
| `headers` | 否 | 附加 HTTP 请求头（字符串键值） |
| `body` | 否 | 合并进每次请求体的 JSON 字段 |
| `models` | 是 | 该 provider 下的模型定义 |

### `package` 可选值

绝大多数 OpenAI 兼容服务用第一个即可：

| 包名 | 用途 |
|---|---|
| `@opencode/ai/providers/openai-compatible` | **通用 OpenAI 兼容接口（首选）** |
| `@opencode/ai/providers/openai-compatible/responses` | 同上，但走 OpenAI Responses API |
| `@opencode/ai/providers/openai` | OpenAI 官方 |
| `@opencode/ai/providers/openai/chat` | OpenAI Chat Completions 专用 |
| `@opencode/ai/providers/openai/responses` | OpenAI Responses API |
| `@opencode/ai/providers/anthropic` | Anthropic Messages 原生 |
| `@opencode/ai/providers/anthropic-compatible` | Anthropic 兼容接口 |
| `@opencode/ai/providers/google` | Google Gemini |
| `@opencode/ai/providers/openrouter` | OpenRouter |
| `@opencode/ai/providers/xai` | xAI |

也可以填任意 npm 包名或 `file://` 绝对路径，指向自定义 provider 包。

### `settings` 常用字段

| 字段 | 说明 |
|---|---|
| `baseURL` | 服务端点。**这是最关键的一个字段** |
| `apiKey` | 凭证。**服务端不校验时不要写这一项** |
| `headerTimeout` | 等待响应头的毫秒数，默认 300000 |
| `chunkTimeout` | 流式响应两帧之间允许的毫秒间隔，默认 300000 |
| `timeout` | 整个请求的总时限（毫秒），无默认值 |
| `reasoningEffort` | 推理强度：`none` / `low` / `medium` / `high` |
| `transport` | `"http"` 或 `"websocket"`（仅部分 provider 支持） |

**关于 `apiKey`：**

文档明确要求 —— 服务端不要求 bearer 认证时**应当省略**这一项。如果确实需要，用环境变量引用而不是硬编码：

```jsonc
"settings": {
  "baseURL": "https://api.example.com/v1",
  "apiKey": "{env:MY_AI_API_KEY}"
}
```

### `models` 字段说明

| 字段 | 说明 |
|---|---|
| `modelID` | **实际发给服务端的模型 ID** |
| `name` | 界面显示名 |
| `family` | 模型家族，用于分组显示 |
| `capabilities` | 能力声明，见下 |
| `limit` | `context` / `input` / `output` token 上限 |
| `settings` | 该模型特有的包选项（覆盖 provider 级） |
| `headers` / `body` | 该模型特有的请求头 / 请求体字段 |
| `variants` | 命名变体，各带独立 settings |
| `cost` | 每百万 token 的 input / output / cache 价格 |
| `disabled` | `true` 则从模型列表隐藏 |

### `capabilities` —— 最容易漏掉的一项

```jsonc
"capabilities": {
  "tools": true,
  "input": ["text"],
  "output": ["text"]
}
```

| 字段 | 含义 |
|---|---|
| `tools` | 是否支持工具调用（function calling） |
| `input` | 接受的输入模态：`"text"` / `"image"` |
| `output` | 输出的模态，通常只有 `"text"` |

**为什么必须显式声明：**

对于不在内置目录中的模型，OpenCode 使用一组**默认假设**：工具支持、文本+图片输入、文本输出、200000 context、32000 output。这些是兜底值，**不是探测出来的真实能力**。

其中最坑的是图片：默认假设包含 `image`。如果你没配 `capabilities`，OpenCode 会认为服务支持图片，用户上传图片后请求会被服务端拒绝或静默失败。

`tools` 同理 —— **OpenCode 无法自动推断工具支持**。不声明则工具默认关闭，表现为 agent 调不动任何工具。

### `limit` —— 上下文长度

```jsonc
"limit": {
  "context": 32768,
  "output": 32768
}
```

`context` 填第 1 步拿到的 `n_ctx`。

> 部分内置 provider（如 vLLM）会自动从服务端的 `max_model_len` 读取。
> 但**自定义 provider 不会**，必须手填。不填就用 200000 的假设值，超了会在对话中途失败。

### `variants` —— 把参数做成可选档位

适合暴露「思考强度」这类模型参数：

```jsonc
"models": {
  "coder": {
    "modelID": "some-model-id",
    "settings": { "reasoningEffort": "medium" },
    "variants": [
      { "id": "none",   "settings": { "reasoningEffort": "none" } },
      { "id": "medium", "settings": { "reasoningEffort": "medium" } },
      { "id": "high",   "settings": { "reasoningEffort": "high" } }
    ]
  }
}
```

引用方式：

```
myai/coder            # 用 model 级 settings（medium）
myai/coder#none       # 用 none 档
myai/coder#high       # 用 high 档
```

应用顺序：**provider 级 → model 级 → 选中的 variant**。
`settings` 和 `body` 是深度合并，数组和标量则后者覆盖前者。

---

## 第 4 步：刷新配置

OpenCode 的服务端会热加载配置，但**界面上的模型列表是启动时取的快照**。

```powershell
# 方式 A：优先用这个，温和，不影响当前会话
opencode reload

# 方式 B：如果 opencode 不在 PATH（桌面版安装常见）
& "$env:LOCALAPPDATA\Programs\@opencodedesktop\resources\opencode-cli.exe" reload
```

预期输出：`Configuration reloaded`

然后**重新打开**模型选择菜单。只关掉再打开菜单不够，需要重新进入。

若仍未刷新，完全退出并重启 OpenCode 客户端。

---

## 第 5 步：验证

```powershell
# 列出全部可用模型，确认你的 provider/model 在列
opencode models

# 直接实跑一次
opencode run --model myai/coder "只回复两个字：OK"
```

两者都通过即接入成功。之后在界面里用 `/models` 选择即可。

---

## 常见错误对照表

| 现象 | 原因 | 处理 |
|---|---|---|
| 模型列表里看不到 | UI 列表未刷新 | 执行第 4 步的 `reload`，然后重新打开 `/models` |
| `Model unavailable: provider/model` | 模型 ID 不存在，或引用用了 `modelID` 而非 `models` 的 key | 确认引用格式是 `myai/coder`；核对服务端 `/v1/models` 返回的 id |
| 模型列出来了但一用就报错 | `baseURL` 少了 `/v1`，或端口/路径不对 | 检查 `settings.baseURL` |
| agent 调不动任何工具 | 缺 `capabilities.tools` | 加上 `"tools": true` |
| 上传图片后失败 | `capabilities.input` 含 `image` 但服务不支持 | 改成 `["text"]` |
| 对话中途报超出上下文 | `limit.context` 填错 | 按服务端 `n_ctx` 重填 |
| 配置写了完全没反应 | 用的是 V1 语法 | `provider` → `providers`，`npm:` → `package:` |
| 界面提示自定义 provider 不可用 | 该版本禁用了手动添加表单 | **正常，无需处理**。表单只是辅助写配置的工具，配置文件才是生效通道 |
| 被策略阻止 | `experimental.policies` 里有 `provider.use` 的 deny | 见下方「策略」一节 |

---

## 补充：策略

`experimental.policies` 可以禁用特定 provider，优先级**由高到低**：

```
1. 已连接的 Console 工作区（最高，本地无法覆盖）
2. 全局 ~/.config/opencode/opencode.jsonc
3. 项目直接配置 opencode.jsonc（外层目录优先于内层）
4. .opencode/opencode.jsonc（最低）
```

**策略反转了常规的优先级规则**：范围更广的配置反而在**后面**求值，因此覆盖范围更窄的。

```jsonc
{
  "experimental": {
    "policies": [
      { "action": "provider.use", "resource": "*", "effect": "deny" },
      { "action": "provider.use", "resource": "myai", "effect": "allow" }
    ]
  }
}
```

`resource` 支持通配：`*` 匹配任意长度，`?` 匹配单个字符。多条命中时**最后一条生效**，所以宽规则放前面、例外放后面。

V2 用 `provider.use` 取代了 V1 的 `enabled_providers` / `disabled_providers` 列表。

---

## V1 → V2 迁移对照表

| V1（不兼容） | V2（正确） |
|---|---|
| `"provider"` | `"providers"` |
| `"npm": "@ai-sdk/openai-compatible"` | `"package": "@opencode/ai/providers/openai-compatible"` |
| `"options": { "baseURL": ... }` | `"settings": { "baseURL": ... }` |
| `"enabled_providers": [...]` | `"experimental.policies` 里的 `provider.use` |
| `~/<user>/.opencode/` | `~/.config/opencode/` |

V1 配置文件仍可加载，但新配置请一律使用 V2 语法。

---

## 完整配置示例

一个同时带环境变量凭证、思考档位、超时调整的完整例子：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",

  "providers": {
    "myai": {
      "name": "自建推理服务",
      "package": "@opencode/ai/providers/openai-compatible",
      "env": ["MY_AI_API_KEY"],
      "settings": {
        "baseURL": "https://ai.internal.example.com/v1",
        "apiKey": "{env:MY_AI_API_KEY}",
        "headerTimeout": 600000,
        "chunkTimeout": 600000
      },
      "headers": {
        "X-Team": "research"
      },
      "models": {
        "coder": {
          "modelID": "qwen3.8-flash-next-coder-iq1_m",
          "name": "Coder (本地)",
          "capabilities": {
            "tools": true,
            "input": ["text"],
            "output": ["text"]
          },
          "limit": {
            "context": 32768,
            "output": 32768
          },
          "settings": {
            "reasoningEffort": "low"
          },
          "variants": [
            { "id": "none", "settings": { "reasoningEffort": "none" } },
            { "id": "medium", "settings": { "reasoningEffort": "medium" } },
            { "id": "high", "settings": { "reasoningEffort": "high" } }
          ]
        }
      }
    }
  }
}
```

引用：

```
myai/coder          # 默认 low
myai/coder#none     # 不思考，最快
myai/coder#high     # 最慢最准
```

---

## 参考

| 内容 | 地址 |
|---|---|
| V2 配置总览 | https://opencode.ai/v2/docs/config |
| Provider 详解 | https://opencode.ai/v2/docs/providers |
| 模型与 capabilities | https://opencode.ai/v2/docs/models |
| 策略 | https://opencode.ai/v2/docs/policies |
| V1→V2 迁移 | https://opencode.ai/v2/docs/migrate-v1 |

> `$schema` 字段请保留在配置文件首行，编辑器据此提供校验和补全。
> schema 可能在某些编辑器中仍描述 V1 结构，**不要用它反推 V2 字段名**，以官方文档为准。

---

*最后更新：2026-10-08 · 依据 OpenCode V2（2.x）官方文档整理*