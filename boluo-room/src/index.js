'use strict';
// CLI 入口：在博罗真实问题上跑完整四 Agent 闭环，并演示一次用户注入
const fs = require('fs');
const path = require('path');
const DD = require('../../boluo-discovery-data.js');
const RD = require('../../boluo-relations-data.js');
const { runResearch, injectAndContinue, buildViews } = require('./orchestrator');
const { DEFAULT_MODEL } = require('./ark');

const QUESTION = '某些产业项目已经投产，为什么本地供应商可能还没有获得预期订单？';

function print(run) {
  console.log('\n=== RUN', run.runId, '| 状态', run.status, '| 版本', run.version, '===');
  for (const m of run.messages) {
    const reply = m.inReplyTo ? ' ↩' + m.inReplyTo : '';
    console.log(
      m.messageId, m.from.replace('agent.', '').padEnd(11),
      m.type.padEnd(10), (m.grade || '-'), (m.confidence || '-'), reply
    );
    console.log('   ', m.payload.statement);
  }
}

(async () => {
  console.log('模型:', DEFAULT_MODEL);
  const run = await runResearch(QUESTION, DD, RD);
  print(run);

  // 演示用户注入第十一种解释，触发红队再研究
  const views = buildViews(DD, RD);
  const { injected, newMsgs } = await injectAndContinue(
    run, views,
    '也许新项目采购品类与本地产业品类根本不匹配，而非信息不对称',
    'redteam', 'measurement'
  );
  console.log('\n=== 用户注入后（版本', run.version, '）===');
  console.log(injected.messageId, 'user-inject:', injected.payload.statement);
  for (const m of newMsgs) {
    console.log(m.messageId, m.from.replace('agent.', ''), m.type, '↩' + (m.inReplyTo || '-'), ':', m.payload.statement);
  }

  const outDir = path.join(__dirname, '..', 'runs');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, run.runId + '.json');
  fs.writeFileSync(file, JSON.stringify(run, null, 2));
  console.log('\n已留痕:', file, '| 消息总数', run.messages.length);
})().catch(e => {
  console.error('运行失败:', e.message);
  process.exit(1);
});
