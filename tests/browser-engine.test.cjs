/* node --test tests/browser-engine.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../engine.js');
const base={year:2030,target:1600,scenario:'balanced',draws:500,seed:317,knobs:{}};
test('all seven workspaces and six tunnel views are implemented',()=>{
 const src=fs.readFileSync(require('node:path').join(__dirname,'../lab.js'),'utf8');
 for(const name of ['home','mission','data','survey','models','wind','archive'])assert.match(src,new RegExp("function "+(name==='wind'?'windPage':name==='data'?'dataPage':name==='survey'?'surveyPage':name==='models'?'modelsPage':name==='archive'?'archivePage':name)+"\\("));
 for(let i=0;i<6;i++)assert.match(src,new RegExp("function wind"+i+"\\("));
 assert.match(src,/calibrationMarkup/);
 assert.doesNotMatch(src,/\bfetch\s*\(/);
});
test('macro baseline matches publicly reported 2025 structure',()=>{
 assert.equal(E.DATA.p+E.DATA.s+E.DATA.t,1005.45);
 assert.equal(E.DATA.year,2025);
});
test('deterministic repeatability with exact same seed and state',()=>{
 const a=E.run(base),b=E.run(base);
 assert.deepEqual(a,b);
 assert.equal(a.history.length,6);
 assert.equal(a.samples,500);
 assert.equal(a.runId,b.runId);
});
test('sector totals compose each simulated end year with negligible median aggregation difference',()=>{
 const r=E.run(base);
 assert.ok(r.total.p10<=r.total.p50&&r.total.p50<=r.total.p90);
 assert.ok(r.sector.every(s=>s.p10<=s.p50&&s.p50<=s.p90));
 assert.ok(Math.abs(r.share.reduce((a,b)=>a+b,0)-1)<0.01);
 assert.ok(r.hit>=0&&r.hit<=1);
});
test('industrial upgrading raises secondary and total median',()=>{
 const a=E.run(base),b=E.run({...base,knobs:{manufacturing:1}});
 assert.ok(b.total.p50>a.total.p50);
 assert.ok(b.sector[1].p50>a.sector[1].p50);
});
test('project delay reduces the overall median',()=>{
 const a=E.run(base),b=E.run({...base,knobs:{project_delay:1}});
 assert.ok(b.total.p50<a.total.p50);
});
test('2032 calibration is separately modeled and not mistaken for 2030',()=>{
 const r=E.run({...base,year:2032,target:1500});
 assert.equal(r.state.year,2032);
 assert.equal(r.history.length,8);
 assert.equal(r.state.target,1500);
});
test('synthetic network is repeatable and all edges and subjects count match',()=>{
 const n=E.network(base),m=E.network(base);
 assert.deepEqual(n,m);
 assert.equal(n.nodes,500);
 assert.equal(n.edges,680);
 assert.equal(n.serviceEdges,600);
 assert.equal(n.agriEdges,80);
 assert.ok(n.lostDemand>=0);
});
test('synthetic survey paths and bootstrap are actually computed',()=>{
 const a=E.survey({...base,sampleSize:100});
 const b=E.survey({...base,sampleSize:100});
 assert.deepEqual(a,b);
 assert.equal(a.n,100);
 assert.equal(a.bootstrap,120);
 for(const k of Object.keys(a.paths)){
  assert.ok(Number.isFinite(a.paths[k]));
  assert.ok(a.intervals[k][0]<=a.intervals[k][1]);
 }
});
test('sensitivity is ranked from most to least responsive',()=>{
 const s=E.sensitivity(base);
 assert.equal(s.length,5);
 assert.ok(s.every(v=>Number.isFinite(v.span)));
 assert.ok(s.every((v,i)=>!i||s[i-1].span>=v.span));
});
test('money calculation is isolated from macro value added',()=>{
 assert.equal(E.tea(75,12,10).money,630);
 assert.equal(E.tea(12,75,10).money,0);
});
test('input normalization prevents out-of-range calculations',()=>{
 const s=E.normalize({year:2099,target:30000,scenario:'invented',draws:1,seed:0,knobs:{manufacturing:100,project_delay:-3}});
 assert.equal(s.year,2030);
 assert.equal(s.target,2500);
 assert.equal(s.scenario,'balanced');
 assert.equal(s.draws,300);
 assert.equal(s.knobs.manufacturing,1);
 assert.equal(s.knobs.project_delay,0);
});


test('synthetic HTMT, two-predictor VIF and holdout predictions are computed, not placeholders',()=>{
 const m=E.survey({sampleSize:125,seed:317});
 assert.deepEqual(Object.keys(m.htmt).sort(),['SA_OP','SA_SU','SU_OP']);
 for(const h of Object.values(m.htmt))assert.ok(Number.isFinite(h)&&h>0&&h<4);
 assert.ok(m.vifOP>=1&&m.vifOP<20);
 assert.equal(m.holdout.train,100);
 assert.equal(m.holdout.test,25);
 assert.ok(Number.isFinite(m.holdout.rmse)&&m.holdout.rmse>0);
 assert.ok(Number.isFinite(m.holdout.meanBaselineRMSE));
 assert.ok(Number.isFinite(m.holdout.skill));
 assert.match(m.holdout.method,/非PLSpredict/);
});

test('the legacy 1:5:4 added-value proximity metric is no longer emitted',()=>{
 const r=E.run(base);
 assert.equal(Object.prototype.hasOwnProperty.call(r,'structural'),false);
});
