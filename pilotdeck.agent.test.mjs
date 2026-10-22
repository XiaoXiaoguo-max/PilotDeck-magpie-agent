// 离线校验：不启动 magpie，只检查 agent 描述与 connect 生成的键。
import test from "node:test"
import assert from "node:assert/strict"
import { agent, connect } from "./pilotdeck.agent.mjs"

test("agent 描述指向 PilotDeck 的真实配置", () => {
  assert.equal(agent.id, "pilotdeck")
  assert.equal(agent.bin, "PilotDeck")
  assert.equal(agent.dir, "~/.pilotdeck")
  assert.equal(agent.config, "~/.pilotdeck/pilotdeck.yaml")
  assert.equal(agent.format, "yaml")
  assert.equal(agent.model, "agent.model")
  assert.equal(agent.prefix, "magpie/")
  assert.match(agent.icon, /^data:image\//)
})

test("library 写进 PilotDeck 读取的位置", () => {
  assert.equal(agent.library.instructions, "~/.pilotdeck/PILOTDECK.md")
  assert.equal(agent.library.mcp, "~/.pilotdeck/mcp.json")
  assert.equal(agent.library.mcpFormat, "claude")
  assert.equal(agent.library.skills, "~/.pilotdeck/skills")
})

test("connect 写 schemaVersion、provider 与模型能力", () => {
  const out = connect({
    gateway: { v1: "http://127.0.0.1:3425/v1", key: "magpie-pilotdeck" },
    models: [
      { id: "group/loomy", context: 1048576, images: true, efforts: ["low", "high", "none"] },
      { id: "plain" },
    ],
  })

  assert.equal(out.schemaVersion, 1)
  const p = out["model.providers.magpie"]
  assert.equal(p.protocol, "openai")
  assert.equal(p.url, "http://127.0.0.1:3425/v1")
  assert.equal(p.apiKey, "magpie-pilotdeck")
  assert.deepEqual(Object.keys(p.models), ["group/loomy", "plain"])

  assert.equal(p.models["group/loomy"].capabilities.maxContextTokens, 1048576)
  assert.equal(p.models["group/loomy"].capabilities.supportsThinking, true)
  assert.deepEqual(p.models["group/loomy"].multimodal, { input: ["text", "image"] })
  // 只有 PilotDeck 认得的推理强度会留下
  assert.deepEqual(p.models["group/loomy"].thinking, {
    state: "default",
    efforts: ["low", "high"],
    format: "openai",
  })

  assert.deepEqual(p.models.plain, {})
})

test("没有模型时仍给出可读的 provider", () => {
  const out = connect({ gateway: { v1: "http://127.0.0.1:3425/v1", key: "k" }, models: [] })
  assert.deepEqual(out["model.providers.magpie"].models, {})
})
