'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../research-core.js');
const E=require('../engine.js');
const V=require('../research-v3.js');
globalThis.BoluoV3=V;
const G=require('../research-v3-viz.js');
test('industry microstructure only sums publicly reported five subsectors',()=>{
 const s=V.summary();
 assert.equal(Math.round(s.covered*10)/10,61.4);
 assert.equal(Math.round(s.missing*10)/10,38.6);
 assert.equal(V.INDUSTRIES.length,5);
 assert.equal(V.INDUSTRIES[0].share,23.2);
 assert.equal(V.INDUSTRIES[2].growth,-4.2);
 assert.ok(V.INDUSTRIES.every(x=>x.source==='stat'));
});
test('2025 plan-target gaps compare growth rates in percentage points, not GDP differences',()=>{
 assert.equal(V.TARGETS.length,5);
 const invest=V.TARGETS.find(x=>x.name==='固定资产投资');
 assert.equal(invest.actual,-18.8);
 assert.equal(invest.gap,-23.8);
 assert.equal(V.TARGETS[0].gap,-1.5);
});
test('evidence conflicts remain unresolved, never treated as corrected data',()=>{
 const a=V.CONFLICTS.find(x=>x.id==='retail');
 const b=V.CONFLICTS.find(x=>x.id==='fiscal');
 assert.match(a.caveat,/不能断言/);
 assert.match(b.caveat,/不得/);
 assert.equal(a.state,'待查');
 assert.ok(V.CONFLICTS.every(x=>x.sources.every(name=>V.URL[name])));
});
test('income gap ratio uses reported 2025 values and back-calculated 2020 amounts',()=>{
 const income=V.summary().income;
 assert.equal(income.urbanBefore,37668);
 assert.equal(income.ruralBefore,24244);
 assert.ok(income.ratioNow<income.ratioBefore);
});
test('separate synthetic macro parameter uncertainty is deterministic',()=>{
 const state=E.normalize({year:2030,target:1600});
 const a=V.epistemic(E,state),b=V.epistemic(E,state);
 assert.deepEqual(a,b);
 assert.equal(a.lines.length,3);
 assert.ok(a.lines[0].value<a.lines[1].value&&a.lines[1].value<a.lines[2].value);
 assert.ok(a.spread>0);
});
test('Morris-type screening actually evaluates parameter excursions; fixed seed repeatable',()=>{
 const s=E.normalize({year:2030,target:1600,seed:317});
 const a=V.morris(E,s,12),b=V.morris(E,s,12);
 assert.deepEqual(a,b);
 assert.equal(a.stats.length,5);
 assert.ok(a.stats.every(x=>x.n===12&&x.muStar>0&&x.sigma>=0));
 assert.ok(a.stats.every((x,i)=>i===0||a.stats[i-1].muStar>=x.muStar));
});
test('synthetic cascade propagates through actual directed edges, respects loss threshold',()=>{
 const zero=V.cascade({cut:0});
 assert.equal(zero.lostServiceEdges,0);
 assert.equal(zero.manufacturersImpaired,0);
 assert.equal(zero.farmsTouched,0);
 const one=V.cascade({cut:20,threshold:1});
 const two=V.cascade({cut:20,threshold:2});
 assert.ok(one.manufacturersImpaired>=two.manufacturersImpaired);
 assert.ok(one.farmsTouched>=two.farmsTouched);
 assert.equal(one.lostServiceEdges,two.lostServiceEdges);
 const more=V.cascade({cut:30,threshold:1});
 assert.ok(more.manufacturersImpaired>=one.manufacturersImpaired);
});
test('V3 graphics are sourced to model observations and no random static image used',()=>{
 assert.match(G.scatter(1),/电子设备/);
 assert.match(G.scatter(2),/data-v3-industry="2"/);
 assert.match(G.products(),/中成药/);
 assert.match(G.industrialSizes(),/大型企业/);
 assert.match(G.plan(),/固定资产投资/);
 assert.match(G.signals('金融'),/金融业增加值/);
 assert.match(G.cascade(V.cascade({cut:5})),/制造主体受影响/);
 const m=V.morris(E,E.normalize({}),12);
 assert.match(G.morris(m),/svg/);
 const r=E.run({...E.normalize({}),draws:300});
 assert.match(G.uncertainty(V.epistemic(E,r.state),r,1600),/v3-uncert/);
});
test('all four research questions expose competing mechanisms and falsifiers',()=>{
 assert.equal(V.HYPOTHESES.length,4);
 assert.ok(V.HYPOTHESES.every(x=>x.rival.length>=3&&x.test&&x.falsifier&&x.quality));
});
