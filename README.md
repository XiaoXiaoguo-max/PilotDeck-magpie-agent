# @pilotdeck-community/agent-pilotdeck

把 **PilotDeck**（OpenBMB/PilotDeck 桌面版）变成 magpie Agents 页面上的一行
Agent：装好插件后 magpie 会自动检测 PilotDeck、在那里为它选模型（含推理强度），
并把它自己的 `pilotdeck.yaml` 接到 magpie 网关上；断开时还原原来的配置。

## 工作原理

PilotDeck 把模型供应商写在 `~/.pilotdeck/pilotdeck.yaml` 的 `model.providers`
下，`agent.model` 用 `provider/model` 的格式选模型。插件让 magpie 往这个文件里
加一个名为 `magpie` 的 provider：

```yaml
schemaVersion: 1
model:
  providers:
    magpie:
      protocol: openai
      url: http://127.0.0.1:3425/v1   # magpie 网关
      apiKey: magpie-pilotdeck
      models:
        <provider>/<model>:            # magpie 目录里为 PilotDeck 打开的模型
          capabilities:
            maxContextTokens: 1048576
            supportsThinking: true
          multimodal:
            input: [text, image]
          thinking:
            state: default
            efforts: [low, medium, high, xhigh]
            format: openai
agent:
  model: magpie/<provider>/<model>     # 选中的 magpie 模型
```

- `protocol: openai` + `…/v1`：PilotDeck 走标准 OpenAI Chat Completions，magpie
  网关会按需转成各家格式，流式、工具调用、图片、推理都支持。
- PilotDeck 按**第一个** `/` 切分 `agent.model`，所以 `magpie/group/loomy` 会
  得到 provider `magpie`、模型 `group/loomy`，带斜杠的模型 id 不会被拆坏。
- `apiKey: magpie-pilotdeck`：每次调用在用量页里记为 `pilotdeck`（PilotDeck
  自己的请求不带专属 User-Agent，靠这把 key 认身份）。
- magpie 只动它写入的这些键；断开（选回 default / Unwire）会还原原来的值。

## Library 写入位置

插件声明了 PilotDeck 真实读取的路径，magpie 的 Library 因此能把 MCP、skills 和
指令写到 PilotDeck 会加载的地方：

| 内容 | 位置 | 说明 |
|---|---|---|
| 指令 | `~/.pilotdeck/PILOTDECK.md` | 用户级 `PILOTDECK.md`，对全部项目生效 |
| MCP | `~/.pilotdeck/mcp.json` | `mcpServers` 结构，与 Claude 的格式一致 |
| Skills | `~/.pilotdeck/skills` | PilotDeck 的全局 skills 目录 |

PilotDeck 的指令层级是 managed → 用户 → 用户 rules → 项目 → local；插件写的是
用户级文件，项目里已有的 `PILOTDECK.md` / `PILOTDECK.local.md` 仍然优先。

## 安装

magpie 已运行（应用或 `magpie serve`）时：

```sh
# 从 npm
magpie plugin add @pilotdeck-community/agent-pilotdeck

# 或从本地目录
magpie plugin add /path/to/agent-pilotdeck
```

也可以在 magpie 的 设置 → 插件 里填包名或本地路径。装好后刷新 Agents 页面，
PilotDeck 会出现在已安装列表里，打开它的「接入」开关并在下拉里选模型。

> PilotDeck 只在启动时读 `pilotdeck.yaml`，切换模型后重启 PilotDeck 生效。

## 文件

- `pilotdeck.agent.mjs` — 导出 `agent`（id/name/config/model/prefix/library/icon）
  和 `connect`（写 provider 的键）。
- `pilotdeck.agent.test.mjs` — 离线校验描述对象与写出的键（`npm test`）。
- `package.json` — `magpie.agent` 指向模块，`magpie.icon` 给插件页显示图标。
- `LICENSE` — MIT。

## 发布到 npm

```sh
npm test
npm pack --dry-run     # 确认只打包 mjs / README / LICENSE
npm publish            # 需要 @pilotdeck-community 作用域的发布权限
```

包名遵循 magpie 的 agent 插件命名：`<scope>/agent-<id>`（与
`@magpie-community/agent-aider` 一致），magpie 的 `ShortName` 会把 `agent-`
去掉，所以 `magpie plugin add agent-pilotdeck` 这类短名也能用。

## 备注

- 用的是 magpie 的 agent 适配器插件机制（`internal/agentplug`），不需要给
  magpie 提 PR；插件装在本地，随之升级也不会丢。
- `prefix: magpie/` 让 magpie 能判断「已接入」，并在选回别的模型时把写入的键
  取下来。
- 图标同时出现在 `agent.icon`（Agents 那一行）和 `package.json` 的
  `magpie.icon`（插件列表）：前者是 agent 行唯一认的位置，后者只影响插件页。
