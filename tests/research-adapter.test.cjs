'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../research-adapter.js'),R=require('../research-core.js'),E=require('../engine.js');
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
function row(overrides={}){return{id:'obs-industrial',record_type:'metric',indicator:'规上工业增加值',period:'2025',geography:'博罗县',industry:'',value:8.7,unit:'%',scope:'规上工业增加值不变价同比',source_name:'2025博罗统计公报',source_url:'https://example.org/stat',evidence_grade:'B',...overrides};}
test('V7 auto-maps only exact indicator and unit pairs',()=>{
 const x=row(),s=A.suggest(x);assert.equal(s.variableId,'industrial');
 assert.equal(A.suggest({...x,unit:'亿元'}).variableId,null);
 assert.equal(A.suggest({...x,indicator:'工业总产值'}).variableId,null);
});
test('approved A/B observation requires valid variable mapping, scope and period',()=>{
 const st=storage(),x=row(),all=[x];
 const mapped=A.setMapping(x.id,'industrial','',all,R,st);
 assert.equal(mapped.ok,true);assert.equal(mapped.validation.ok,true);
 const approved=A.setStatus(x.id,'已批准',all,R,st);
 assert.equal(approved.ok,true);
 assert.equal(A.list(all,R,st)[0].status,'已批准');
});
test('C/D assumptions cannot be approved as factual evidence',()=>{
 const st=storage(),x=row({evidence_grade:'C'}),all=[x];
 A.setMapping(x.id,'industrial','',all,R,st);
 const result=A.setStatus(x.id,'已批准',all,R,st);
 assert.equal(result.ok,false);assert.match(result.error,/A\/B级/);
});
test('manual mapping requires a written semantic justification',()=>{
 const st=storage(),x=row({indicator:'县域制造景气指数',unit:'指数'}),all=[x];
 const weak=A.setMapping(x.id,'outside','',all,R,st);
 assert.equal(weak.validation.ok,false);
 assert.ok(weak.validation.blockers.some(v=>v.includes('至少12个字')));
 const strong=A.setMapping(x.id,'outside','该指数采用县域制造业企业订单景气综合指数口径',all,R,st);
 assert.equal(strong.validation.ok,true);
 assert.equal(A.setStatus(x.id,'已批准',all,R,st).ok,true);
});
test('duplicate mapped observations require a documented version decision',()=>{
 const st=storage(),a=row({id:'a',source_name:'公报A'}),b=row({id:'b',source_name:'公报B',value:7.9}),all=[a,b];
 A.setMapping('a','industrial','',all,R,st);
 A.setMapping('b','industrial','',all,R,st);
 const blocked=A.list(all,R,st).find(x=>x.record.id==='b');
 assert.ok(blocked.validation.blockers.some(v=>v.includes('同范围')));
 const resolved=A.setMapping('b','industrial','已回查两份原始公报，采用修订后统计公报值并保留旧值用于版本追踪',all,R,st);
 assert.equal(resolved.validation.ok,true);
});
test('composite constructs cannot be approved from one scalar observation',()=>{
 const st=storage(),x=row({id:'sector',indicator:'第一产业占比',unit:'%',value:10}),all=[x];
 const result=A.setMapping(x.id,'sectorShare','',all,R,st);
 assert.equal(result.validation.ok,false);
 assert.ok(result.validation.blockers.some(v=>v.includes('三次产业结构需要')));
});
test('survey means cannot masquerade as SEM path coefficients',()=>{
 const st=storage(),x=row({id:'survey',record_type:'survey_aggregate',indicator:'服务可得性路径系数',unit:'标准化路径',sample_n:40,population:'规上制造业企业',sample_frame:'按行业分层抽样框',aggregation:'mean',missing_rate:2}),all=[x];
 const result=A.setMapping(x.id,'survey','',all,R,st);
 assert.equal(result.validation.ok,false);
 assert.ok(result.validation.blockers.some(v=>v.includes('问卷均值不能直接当作结构路径系数')));
});
test('scenario proposal requires approved linked evidence and explicit interpretation',()=>{
 const st=storage(),x=row(),all=[x];
 A.setMapping(x.id,'industrial','',all,R,st);
 assert.equal(A.saveProposal({parameter:'manufacturing',evidenceIds:[x.id],note:'工业增加值增速仅作为情境背景，测试制造业增长条件上调的敏感性。',before:{year:2030,target:1600,scenario:'balanced',seed:20321111,draws:500,knobs:{}},after:{year:2030,target:1600,scenario:'balanced',seed:20321111,draws:500,knobs:{manufacturing:.2}},baseline:{p10:1000,p50:1100,p90:1200,hit:.1},candidate:{p10:1010,p50:1120,p90:1230,hit:.2}},A.list(all,R,st),E,st).ok,false);
 A.setStatus(x.id,'已批准',all,R,st);
 const items=A.list(all,R,st),before=E.normalize({year:2030,target:1600,scenario:'balanced',seed:20321111,draws:500,knobs:{}}),after=E.normalize({...before,knobs:{...before.knobs,manufacturing:.2}});
 const baseline=E.run(before),candidate=E.run(after);
 const saved=A.saveProposal({parameter:'manufacturing',evidenceIds:[x.id],note:'工业增加值增速仅作为情境背景，测试制造业增长条件上调的敏感性。',before,after,baseline:baseline.total,candidate:candidate.total},items,E,st);
 assert.equal(saved.ok,true);assert.equal(saved.proposal.status,'情景提案 · 未应用');
 assert.equal(E.normalize({}).knobs.manufacturing,0);
 assert.equal(A.getProposals(st).length,1);
});
test('proposal cannot use evidence mapped to an unrelated variable or an out-of-range parameter',()=>{
 const st=storage(),x=row({id:'investment',indicator:'固定资产投资',value:-18.8}),all=[x];
 A.setMapping(x.id,'investment','',all,R,st);A.setStatus(x.id,'已批准',all,R,st);
 const items=A.list(all,R,st),base=E.normalize({}),after=E.normalize({...base,knobs:{...base.knobs,services:.2}});
 const p={parameter:'services',evidenceIds:[x.id],note:'用投资增速背景测试服务业条件变化，但并不视为直接估计。',before:base,after,baseline:{p10:1,p50:2,p90:3,hit:0},candidate:{p10:1,p50:2.1,p90:3.1,hit:0}};
 assert.equal(A.saveProposal(p,items,E,st).ok,false);
 p.parameter='manufacturing';p.after=E.normalize({...base,knobs:{...base.knobs,manufacturing:1.5}});
 assert.equal(A.saveProposal(p,items,E,st).ok,false);
});

test('scenario proposal must preserve all non-selected model inputs',()=>{
 const st=storage(),x=row(),all=[x];
 A.setMapping(x.id,'industrial','',all,R,st);A.setStatus(x.id,'已批准',all,R,st);
 const items=A.list(all,R,st),base=E.normalize({}),after=E.normalize({...base,knobs:{...base.knobs,manufacturing:.2}});
 after.draws=1000;
 const p={parameter:'manufacturing',evidenceIds:[x.id],note:'工业增速只作为背景，单独测试制造业条件变化，不将其视为参数估计。',before:base,after,baseline:{p10:1,p50:2,p90:3,hit:.1},candidate:{p10:1,p50:2.1,p90:3.1,hit:.2}};
 assert.equal(A.saveProposal(p,items,E,st).ok,false);
 assert.match(A.saveProposal(p,items,E,st).error,/抽样次数不变/);
});
