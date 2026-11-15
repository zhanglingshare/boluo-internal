'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),R=require('../research-v4.js');
globalThis.BoluoV4=R;
const V=require('../research-v4-viz.js');
test('six dated reports document industrial subsector shares without imputation',()=>{
 assert.deepEqual(R.YEARS.map(y=>y.year),[2020,2021,2022,2023,2024,2025]);
 assert.equal(R.YEARS[0].shares[0],24.2);
 assert.equal(R.YEARS[3].shares[0],18.6);
 assert.equal(R.YEARS[5].shares[0],23.2);
 assert.equal(R.YEARS[0].shares[3],null);
 assert.equal(R.YEARS[0].shares[4],null);
 assert.equal(R.YEARS[1].shares[4],null);
 assert.ok(R.YEARS.every(y=>R.S[y.source]));
});
test('structural change history correctly distinguishes share points and constant-firm interpretation',()=>{
 const e=R.history('electronics');
 assert.ok(Math.abs(e.delta-(-1))<1e-12);
 assert.equal(e.firstYear,2020);assert.equal(e.lastYear,2025);
 assert.ok(e.data.every(row=>row.year>=2020&&row.year<=2025));
 assert.equal(R.YEARS[5].sizes[2],56.8);
 assert.equal(R.YEARS[0].sizes[0],31);
 assert.match(e.warning,/规上统计范围可能改变/);
});
test('industrial annual growth and missing values come from year-specific statements',()=>{
 assert.equal(R.YEARS[1].rates[0],11.3);
 assert.equal(R.YEARS[3].rates[1],-4.4);
 assert.equal(R.YEARS[3].rates[4],30.4);
 assert.equal(R.YEARS[5].rates[2],-4.2);
 assert.equal(R.YEARS[0].rates[3],null);
});
test('2025 regional compositions are public annual GDP components, with rounding tolerance',()=>{
 assert.equal(R.REGIONS.length,5);
 for(const r of R.REGIONS){
  const sum=r.parts.reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(sum-r.gdp)<0.02,r.name+' GDP components differ more than rounding');
  assert.ok(R.S[r.source]);
 }
 assert.equal(R.REGIONS[0].gdp,1005.45);
 assert.equal(R.REGIONS.find(r=>r.id==='huicheng').parts[2],829.89);
 assert.equal(R.REGIONS.find(r=>r.id==='huiyang').parts[1],570.43);
 assert.equal(R.REGIONS.find(r=>r.id==='huidong').parts[0],99);
 assert.equal(R.REGIONS.find(r=>r.id==='longmen').gdp,217.62);
 assert.equal(R.REGIONS.find(r=>r.id==='huidong').investGrowth,null);
});
test('Jensen-Shannon structural distance is symmetric, zero for self, and not a causal distance',()=>{
 const a=R.REGIONS[0].parts,b=R.REGIONS[2].parts;
 assert.equal(R.divergence(a,a),0);
 assert.ok(Math.abs(R.divergence(a,b)-R.divergence(b,a))<1e-12);
 assert.ok(R.divergence(a,b)>0&&R.divergence(a,b)<1);
 const comparison=R.compare('huiyang');
 assert.equal(comparison.distances.length,4);
 assert.ok(comparison.distances.every((x,i)=>i===0||x.distance>=comparison.distances[i-1].distance));
 assert.ok(Math.abs(comparison.shares.reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.ok(comparison.lq.every(Number.isFinite));
 assert.match(comparison.caveat,/非准实验对照组/);
});
test('local value retention is normalized accounting with conservation and no fabricated county GDP',()=>{
 const x=R.retention({local:30,va:35,improve:20});
 assert.equal(x.localPay+x.external,100);
 assert.ok(Math.abs(x.added+x.intermediate-x.localPay)<1e-9);
 assert.equal(x.added,10.5);
 assert.equal(x.improvedVA,17.5);
 assert.equal(x.delta,7);
 assert.equal(x.trivialBounds[0],0);
 assert.equal(x.trivialBounds[1],35);
 assert.match(x.caution,/不是博罗实际GDP留存/);
 const extreme=R.retention({local:500,va:-1,improve:30});
 assert.equal(extreme.local,100);assert.equal(extreme.va,0);
 assert.equal(extreme.improvement,0);
 assert.equal(extreme.added,0);
});
test('normalized retention heatmap contains 121 well-ordered combinations',()=>{
 const rows=R.retentionSurface();
 assert.equal(rows.length,121);
 assert.ok(rows.every(x=>x.result>=0&&x.result<=100));
 assert.ok(rows.find(x=>x.local===0&&x.va===80).result===0);
 assert.equal(rows.find(x=>x.local===50&&x.va===50).result,25);
 assert.equal(rows.find(x=>x.local===100&&x.va===100).result,100);
});
test('visualizations depict missing-year blanks and click interactions',()=>{
 assert.match(V.industryHistory('electronics'),/2023/);
 assert.match(V.industryHeatmap('power','shares'),/缺测/);
 assert.match(V.industryHeatmap('electrical','rates'),/-4.4%/);
 assert.match(V.sizeHistory(),/2020/);
 assert.match(V.ternary('huidong'),/data-v4-region="huidong"/);
 assert.match(V.compareBars('huiyang'),/v4-compare/);
 assert.match(V.lq(R.compare('huiyang')),/LQ/);
 assert.match(V.flow(R.retention({local:25,va:50})),/规范化/);
 assert.match(V.retentionHeat(R.retention({local:50,va:50})),/data-v4-heat="50,50"/);
});
test('entity clues deliberately have no supplier-edge claims',()=>{
 assert.equal(R.ENTITY_CLUES.length,2);
 assert.ok(R.ENTITY_CLUES.every(x=>x.link==='industryNews'&&x.missing.includes('核验')===false));
 assert.ok(R.evidenceReadiness().filter(x=>x.status==='关键数据缺失').length>=2);
});
