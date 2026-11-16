'use strict';
// 编排状态机：四 Agent 顺序可打断，下游以 inReplyTo 引用上游，证据分视图
const { AGENTS } = require('./agents');
const ark = require('./ark');
const ev = require('./evidence');
const { messageFactory } = require('./envelope');

const KIND_TO_TYPE = {
  hypothesis: 'hypothesis',
  evidence: 'evidence',
  objection: 'objection',
  verdict: 'verdict',
  question: 'question',
  handoff: 'handoff'
};

function buildViews(DD, RD) {
  return {
    intel: ev.intelView(DD),
    relations: ev.relationsView(RD),
    counter: ev.counterevidenceView(DD, RD),
    primary: ev.primarySourceView(DD, RD)
  };
}

function existingIds(run) {
  return new Set(run.messages.map(m => m.messageId));
}

// 把一个 Agent 的 findings 转成合法信封
function emitFindings(agent, run, findings, nextAgent) {
  const make = messageFactory(run);
  const ids = existingIds(run);
  const out = [];
  for (const f of findings) {
    const type = KIND_TO_TYPE[f.kind] || 'hypothesis';
    const inReplyTo = f.inReplyTo && ids.has(f.inReplyTo) ? f.inReplyTo : null;
    const msg = make({
      from: agent.from,
      to: nextAgent ? AGENTS[nextAgent].from : null,
      type,
      inReplyTo,
      payload: { statement: f.statement || '', detail: f.detail || '' },
      evidenceRefs: Array.isArray(f.evidenceRefs) ? f.evidenceRefs : [],
      grade: f.grade || null,
      confidence: f.confidence || null,
      status: f.status || 'proposed'
    });
    out.push(msg);
  }
  return out;
}

function brief(messages) {
  return messages.map(m => ({ id: m.messageId, statement: m.payload.statement }));
}

function full(messages) {
  return messages.map(m => ({
    id: m.messageId,
    from: m.from,
    type: m.type,
    statement: m.payload.statement,
    detail: m.payload.detail
  }));
}

function contextFor(agentId, run, views, question) {
  if (agentId === 'intel') {
    return JSON.stringify({ task: question, evidence: views.intel }, null, 1);
  }
  if (agentId === 'relations') {
    const upstream = run.messages.filter(m => m.from === AGENTS.intel.from);
    return JSON.stringify({
      task: question,
      evidence: views.relations,
      upstreamMessages: full(upstream),
      instruction: '通过 inReplyTo 引用 upstreamMessages 中的真实 messageId'
    }, null, 1);
  }
  if (agentId === 'redteam') {
    const claims = run.messages.filter(m => m.from !== AGENTS.redteam.from && m.type !== 'user-inject');
    return JSON.stringify({
      task: question,
      claimsToChallenge: full(claims),
      counterevidence: views.counter
    }, null, 1);
  }
  // measurement：只给主张语句，不给生成推理
  const claims = run.messages
    .filter(m => m.from !== AGENTS.measurement.from && m.type !== 'user-inject')
    .map(m => ({ id: m.messageId, statement: m.payload.statement }));
  return JSON.stringify({
    task: question,
    claimsToGrade: claims,
    primarySources: views.primary
  }, null, 1);
}

async function runAgent(agentId, run, views, question, nextAgent) {
  const agent = AGENTS[agentId];
  const userContext = contextFor(agentId, run, views, question);
  const parsed = await ark.structured(agent.system, userContext);
  return emitFindings(agent, run, parsed.findings, nextAgent);
}

async function runResearch(question, DD, RD) {
  const { createRun, makeRunId } = require('./envelope');
  const run = createRun(makeRunId(), question, ['intel', 'relations', 'redteam', 'measurement']);
  const views = buildViews(DD, RD);

  await runAgent('intel', run, views, question, 'relations');
  await runAgent('relations', run, views, question, 'redteam');
  await runAgent('redteam', run, views, question, 'measurement');
  await runAgent('measurement', run, views, question, null);

  run.status = 'complete';
  run.version += 1;
  return run;
}

// 用户注入“第十一种解释”，触发目标 Agent 再研究
async function injectAndContinue(run, views, statement, targetAgent, nextAgent) {
  const make = messageFactory(run);
  const injected = make({
    from: 'user',
    to: AGENTS[targetAgent].from,
    type: 'user-inject',
    payload: { statement, detail: '用户注入的竞争解释，触发再研究' },
    status: 'challenged'
  });
  run.status = 'running';
  const agent = AGENTS[targetAgent];
  const userContext = JSON.stringify({
    task: run.question,
    injectedMessage: full([injected]),
    priorMessages: full(run.messages.filter(m => m.messageId !== injected.messageId)),
    evidenceView: views[targetAgent === 'measurement' ? 'primary' : agent.scope]
  }, null, 1);
  const parsed = await ark.structured(agent.system, userContext);
  const newMsgs = emitFindings(agent, run, parsed.findings, nextAgent);
  run.status = 'complete';
  run.version += 1;
  return { injected, newMsgs };
}

module.exports = { buildViews, runResearch, injectAndContinue, contextFor };
