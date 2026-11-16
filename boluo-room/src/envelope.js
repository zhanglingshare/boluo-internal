'use strict';
// 消息信封与校验：所有 Agent 输出都必须是合法信封
const MESSAGE_TYPES = ['hypothesis', 'evidence', 'objection', 'verdict', 'handoff', 'question', 'user-inject'];
const GRADES = ['A', 'B', 'C', 'D'];
const CONFIDENCE = ['弱', '中', '强'];
const STATUSES = ['proposed', 'challenged', 'testing', 'supported', 'refuted', 'retired'];
const RUN_STATUSES = ['running', 'waiting', 'complete', 'error'];

function makeRunId(now = Date.now()) {
  return 'run_' + new Date(now).toISOString().slice(0, 10).replace(/-/g, '') + '_' + now.toString(36);
}

function createRun(runId, question, agents) {
  return {
    runId,
    question,
    status: 'running',
    agents: agents.slice(),
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  };
}

// 每个 run 一个自增消息工厂；续跑时从已有消息数继续，保证全 run 唯一
function messageFactory(run) {
  let seq = run.messages.length;
  return function makeMessage(fields) {
    seq += 1;
    const msg = {
      messageId: 'msg_' + String(seq).padStart(4, '0'),
      runId: run.runId,
      from: fields.from,
      to: fields.to || null,
      type: fields.type,
      timestamp: new Date().toISOString(),
      inReplyTo: fields.inReplyTo || null,
      payload: fields.payload || {},
      evidenceRefs: fields.evidenceRefs || [],
      grade: fields.grade || null,
      confidence: fields.confidence || null,
      status: fields.status || 'proposed'
    };
    const err = validateMessage(msg);
    if (err) throw new Error('信封校验失败: ' + err);
    run.messages.push(msg);
    run.updatedAt = msg.timestamp;
    return msg;
  };
}

function validateMessage(m) {
  if (!m || typeof m !== 'object') return '消息不是对象';
  if (!/^msg_\d{4}$/.test(m.messageId || '')) return 'messageId 非法';
  if (!m.runId) return '缺 runId';
  if (!m.from || typeof m.from !== 'string') return '缺 from';
  if (!MESSAGE_TYPES.includes(m.type)) return 'type 非法: ' + m.type;
  if (m.grade && !GRADES.includes(m.grade)) return 'grade 非法';
  if (m.confidence && !CONFIDENCE.includes(m.confidence)) return 'confidence 非法';
  if (!STATUSES.includes(m.status)) return 'status 非法';
  if (!m.payload || typeof m.payload !== 'object') return 'payload 非法';
  if (!Array.isArray(m.evidenceRefs)) return 'evidenceRefs 非数组';
  return null;
}

module.exports = {
  MESSAGE_TYPES, GRADES, CONFIDENCE, STATUSES, RUN_STATUSES,
  makeRunId, createRun, messageFactory, validateMessage
};
