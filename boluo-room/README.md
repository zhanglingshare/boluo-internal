# 博罗智能体议事厅 · P0 编排器（boluo-room）

在残缺信息下自主发现、相互挑战、持续改判的研究系统。P0 先让四个核心 Agent 真正自主，其余工作台作为工具执行者。

## 结构

- `src/envelope.js`：消息信封与校验（全 run 唯一、连续编号）
- `src/evidence.js`：证据分视图，不同 Agent 只看到其 scope 内字段
- `src/agents.js`：四核心 Agent（情报建构 / 关系研究 / 红队异见 / 测量核验）系统提示与 JSON 契约
- `src/ark.js`：方舟 Ark 数据面客户端（密钥仅从环境变量读取，超时 + 退避重试，关闭 thinking）
- `src/orchestrator.js`：编排状态机，下游以 `inReplyTo` 引用上游真实消息
- `src/index.js`：CLI 入口，跑完整四 Agent 闭环并演示一次用户注入
- `tests/acceptance.test.cjs`：P0 七项验收

## 运行

```bash
# 密钥不写入仓库，运行前从本地环境注入
export VOLCENGINE_ARK_API_KEY=你的key
node src/index.js
npm test
```

## 纪律

- 想象不设边界，断言需证据；弱证据留 hypothesis，不把受访口径当因果
- 测量核验上下文物理不含生成结论；异见显式保留，不平均成假确定
- 条件模拟≠官方预测，达标比例≠现实概率，P50 非点预测
