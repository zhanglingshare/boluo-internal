'use strict';
const assert = require('assert');
const DD = require('../../boluo-discovery-data.js');
const RD = require('../../boluo-relations-data.js');
const { runResearch, injectAndContinue, buildViews, contextFor } = require('../src/orchestrator');
const { validateMessage } = require('../src/envelope');

const QUESTION = '某些产业项目已经投产，为什么本地供应商可能还没有获得预期订单？';
function bigrams(s) {
  const clean = s.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
  const set = new Set();
  for (let i = 0; i < clean.length - 1; i += 1) set.add(clean.slice(i, i + 2));
  return set;
}
function bigramOverlap(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0) return 1;
  let common = 0;
  for (const x of A) if (B.has(x)) common += 1;
  return common / A.size;
}

let pass = 0;
function check(name, fn) {
  fn();
  pass += 1;
  console.log('✓', name);
}

(async () => {
  const run = await runResearch(QUESTION, DD, RD);
  const views = buildViews(DD, RD);

  check('全部消息为合法信封', () => {
    for (const m of run.messages) assert.strictEqual(validateMessage(m), null);
  });

  check('messageId 全 run 唯一', () => {
    const ids = run.messages.map(m => m.messageId);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  check('inReplyTo 指向真实且更早的消息', () => {
    const index = new Map(run.messages.map((m, i) => [m.messageId, i]));
    for (const m of run.messages) {
      if (m.inReplyTo) {
        assert.ok(index.has(m.inReplyTo), '引用不存在: ' + m.inReplyTo);
        assert.ok(index.get(m.inReplyTo) < index.get(m.messageId), '引用了更晚的消息');
      }
    }
  });

  check('红队产出上游没有的竞争机制', () => {
    const upstream = run.messages
      .filter(m => m.from === 'agent.intel' || m.from === 'agent.relations')
      .map(m => m.payload.statement);
    const red = run.messages.filter(m => m.from === 'agent.redteam').map(m => m.payload.statement);
    const novel = red.some(r => Math.max(...upstream.map(u => bigramOverlap(r, u))) < 0.6);
    if (!novel) console.log('红队:', red);
    assert.ok(novel, '未发现独立新机制');
  });

  check('测量核验上下文物理不含生成结论', () => {
    const pre = run.messages.filter(m => m.from !== 'agent.measurement');
    const ctx = contextFor('measurement', { messages: pre }, views, QUESTION);
    const obj = JSON.parse(ctx);
    // 待裁定主张只含 id/statement，不含生成推理
    for (const c of obj.claimsToGrade) {
      assert.deepStrictEqual(Object.keys(c).sort(), ['id', 'statement']);
    }
    // 上游生成的 detail 文本不得出现
    for (const m of pre) {
      if (m.payload.detail) assert.ok(!ctx.includes(m.payload.detail), '泄漏了上游生成推理');
    }
  });

  check('序列化结果不含 API 密钥', () => {
    const key = process.env.VOLCENGINE_ARK_API_KEY;
    assert.ok(key && !JSON.stringify(run).includes(key), '输出中出现密钥');
  });

  const beforeCount = run.messages.length;
  const beforeVersion = run.version;
  const { injected, newMsgs } = await injectAndContinue(
    run, views,
    '也许新项目采购品类与本地产业品类根本不匹配，而非信息不对称',
    'redteam', 'measurement'
  );
  check('用户注入重开并产生新消息、版本递增', () => {
    assert.strictEqual(injected.type, 'user-inject');
    assert.ok(newMsgs.length > 0);
    assert.strictEqual(run.messages.length, beforeCount + 1 + newMsgs.length);
    assert.ok(run.version > beforeVersion);
  });

  console.log('\n全部 ' + pass + ' 项 P0 验收通过，消息总数 ' + run.messages.length);
})().catch(e => {
  console.error('验收失败:', e.message);
  process.exit(1);
});
