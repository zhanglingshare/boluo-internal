const test=require('node:test'),assert=require('node:assert/strict');
const Cards=require('../research-cards.js');
const E=require('../engine.js'),R=require('../research-core.js'),V3=require('../research-v3.js'),V4=require('../research-v4.js');
const store=new Map(),storage={getItem(k){return store.get(k)||null;},setItem(k,v){store.set(k,v);}};
function make(){const state=E.normalize({year:2030,target:1600,draws:500,seed:77});return Cards.build({engine:E,v3:V3,v4:V4,research:R,run:E.run(state),archiveCount:2,storage});}
test('card generator emits evidence-aware cards with unique stable IDs',()=>{
 const cards=make(),ids=cards.map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
 for(const id of ['signal-industrial-investment','target-2032-layout','target-gdp-simulation','conflict-retail-base','reminder-gdp-revision','gap-local-service-procurement','lead-electronics-divergence','model-synthetic-network-boundary','review-local-snapshots'])assert.ok(ids.includes(id),id);
});
test('2032 1:5:4 is a layout direction and never receives an added-value progress score',()=>{
 const c=make().find(x=>x.id==='target-2032-layout');
 assert.match(c.summary,/不是三次产业增加值占比/);assert.match(c.caution,/测量办法/);assert.doesNotMatch(c.metric,/%/);
});
test('GDP target card distinguishes conditional simulation frequency from real probability',()=>{
 const c=make().find(x=>x.id==='target-gdp-simulation');assert.match(c.caution,/不是现实达标概率/);assert.match(c.grade,/条件模拟/);
});
test('no confirmed high-level alert is fabricated from a single divergence signal',()=>{
 const stats=Cards.counts(make());assert.equal(stats.verifiedAlerts,0);
});
test('workflow status can be updated, reopened and persisted',()=>{
 assert.equal(Cards.statusOf('signal-industrial-investment',storage),'new');
 assert.equal(Cards.setStatus('signal-industrial-investment','investigating',storage),true);
 assert.equal(Cards.statusOf('signal-industrial-investment',storage),'investigating');
 assert.equal(Cards.setStatus('signal-industrial-investment','verified',storage),true);
 assert.equal(Cards.statusOf('signal-industrial-investment',storage),'verified');
 assert.equal(Cards.setStatus('signal-industrial-investment','new',storage),true);
 assert.equal(Cards.statusOf('signal-industrial-investment',storage),'new');
});
test('filters and counts stay consistent',()=>{
 const cards=make();assert.equal(Cards.filter(cards,'gap').length,1);assert.equal(Cards.filter(cards,'target').length,2);
 assert.equal(Cards.counts(cards).total,cards.length);assert.equal(Cards.counts(cards).gaps,1);
});
