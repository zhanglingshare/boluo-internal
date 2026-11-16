'use strict';
// 从真实 run 生成浏览器数据文件 boluo-room-data.js（仓库根）
const fs = require('fs');
const path = require('path');

const RUN_FILE = process.argv[2] || path.join(__dirname, 'runs', 'run_20261116_mwivl48i.json');
const run = require(RUN_FILE);

const AGENT_META = [
  { id: 'intel', from: 'agent.intel', label: '情报建构', color: '#2E7FD6', role: '建构候选关系' },
  { id: 'relations', from: 'agent.relations', label: '关系研究', color: '#1E9E8C', role: '节点边与机制' },
  { id: 'redteam', from: 'agent.redteam', label: '红队异见', color: '#E0644B', role: '反例与竞争机制' },
  { id: 'measurement', from: 'agent.measurement', label: '测量核验', color: '#7A6FF0', role: '来源分级与缺口' },
  { id: 'user', from: 'user', label: '用户注入', color: '#D9A441', role: '第十一种解释' }
];

function tally(items, key) {
  const map = new Map();
  for (const it of items) {
    const k = it[key] || '未标注';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

const messages = run.messages;
const agentOf = new Map(AGENT_META.map(a => [a.from, a]));

const graph = {
  nodes: messages.map(m => ({
    id: m.messageId,
    agent: m.from,
    label: agentOf.get(m.from) ? agentOf.get(m.from).label : m.from,
    type: m.type,
    status: m.status,
    statement: m.payload.statement
  })),
  edges: messages
    .filter(m => m.inReplyTo)
    .map(m => ({ from: m.inReplyTo, to: m.messageId }))
};

const data = {
  meta: {
    runId: run.runId,
    question: run.question,
    createdAt: run.createdAt,
    version: run.version,
    model: 'doubao-seed-2-1-lite-260915'
  },
  agents: AGENT_META,
  messages,
  graph,
  charts: {
    byAgent: tally(messages, 'from').map(x => ({
      label: (agentOf.get(x.label) || { label: x.label }).label,
      value: x.value
    })),
    byGrade: tally(messages, 'grade'),
    byStatus: tally(messages, 'status'),
    byType: tally(messages, 'type')
  },
  metrics: {
    total: messages.length,
    linked: messages.filter(m => m.inReplyTo).length,
    agents: new Set(messages.map(m => m.from)).size,
    evidenceRefs: new Set(messages.flatMap(m => m.evidenceRefs)).size
  }
};

const out = path.resolve(__dirname, '..', 'boluo-room-data.js');
const banner = '// 由 boluo-room/build-data.cjs 从真实 run 生成，请勿手改\n';
const body = '(function(){\n' +
  'var data = ' + JSON.stringify(data, null, 1) + ';\n' +
  'if (typeof window !== "undefined") window.BoluoRoomData = data;\n' +
  'if (typeof globalThis !== "undefined") globalThis.BoluoRoomData = data;\n' +
  'if (typeof module === "object" && module.exports) module.exports = data;\n' +
  '})();\n';
fs.writeFileSync(out, banner + body);
console.log('已生成', out, '| 消息', messages.length, '| 节点', graph.nodes.length, '| 边', graph.edges.length);
