'use strict';
// 证据分视图：不同 Agent 只能看到其 scope 内的字段，物理隔离
function path28(DD) {
  return DD.topics.factory;
}

// 情报建构：原始语料，无任何预设结论
function intelView(DD) {
  return {
    sources: Object.entries(DD.sources).map(([id, s]) => ({
      id, publisher: s.publisher, kind: s.kind, note: s.note
    })),
    events: DD.events.map(e => ({
      id: e.id, topic: e.topic, town: e.town, state: e.state,
      title: e.title, subtitle: e.subtitle, question: e.question
    })),
    cliff: path28(DD).cliff,
    stateCounts: DD.events.reduce((acc, e) => {
      acc[e.state] = (acc[e.state] || 0) + 1;
      return acc;
    }, {})
  };
}

// 关系研究：节点/边结构（record/question 两分类）
function relationsView(RD) {
  const cases = {};
  for (const [key, c] of Object.entries(RD.cases)) {
    cases[key] = {
      label: c.label, title: c.title, subtitle: c.subtitle,
      views: Object.fromEntries(Object.entries(c.views).map(([vk, v]) => [
        vk,
        {
          heading: v.heading,
          metrics: (v.metrics || []).map(x => ({
            label: x.label, current: x.current, before: x.before, note: x.note
          })),
          nodes: (v.nodes || []).map(n => ({
            id: n.id, label: n.label, sub: n.sub, kind: n.kind,
            detail: n.detail, boundary: n.boundary, next: n.next
          })),
          questions: (v.questions || []).map(q => ({
            id: q.id, label: q.label, ask: q.ask, evidence: q.evidence
          }))
        }
      ]))
    };
  }
  return { version: RD.version, source: RD.source, cases };
}

// 红队反例集：约束强结论的已落地事实 + 来源限制
function counterevidenceView(DD, RD) {
  const orders = RD.cases.hande.views.orders;
  return {
    anchoredRecords: orders.metrics.map(m => ({
      label: m.label, current: m.current, before: m.before, note: m.note
    })),
    recordNodes: orders.nodes
      .filter(n => n.kind === 'record')
      .map(n => ({ label: n.label, detail: n.detail, boundary: n.boundary })),
    stateCounts: DD.events.reduce((acc, e) => {
      acc[e.state] = (acc[e.state] || 0) + 1;
      return acc;
    }, {}),
    sourceLimitations: {
      singleSource: '本地配套具体数字主要来自单一南方日报报道，企业受访口径',
      denominators: '两个约40%分母不同：汉德采购 vs 密特斯业务',
      noLedger: '无交易台账、供应商名单或品类拆分'
    }
  };
}

// 测量核验：仅一手来源元数据 + 原始 record，不含任何生成结论
function primarySourceView(DD, RD) {
  return {
    ddSources: Object.entries(DD.sources).map(([id, s]) => ({
      id, publisher: s.publisher, kind: s.kind, note: s.note
    })),
    rdSource: {
      id: RD.source.id, publisher: RD.source.publisher, date: RD.source.date,
      nature: RD.source.nature, grade: RD.source.grade
    },
    rawRecords: Object.fromEntries(Object.entries(RD.cases).map(([ck, c]) => [
      ck,
      c.views.orders.nodes
        .filter(n => n.kind === 'record')
        .map(n => ({ label: n.label, detail: n.detail, boundary: n.boundary }))
    ]))
  };
}

module.exports = { intelView, relationsView, counterevidenceView, primarySourceView };
