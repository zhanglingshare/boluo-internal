'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../research-discovery.js');
const R=require('../research-core.js');globalThis.BoluoResearch=R;
const V3=require('../research-v3.js'),V4=require('../research-v4.js');
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const header='record_type,indicator,period,geography,industry,value,unit,scope,source_name,source_url,evidence_grade,sample_n,population,sample_frame,aggregation,missing_rate,notes';
function row(a){return header.split(',').map(k=>a[k]===undefined?'':String(a[k])).join(',');}
function metric(indicator,period,value,source='统计来源',extra={}){return{record_type:'metric',indicator,period,geography:'博罗县',industry:'制造业',value,unit:'%',scope:'县域同比',source_name:source,evidence_grade:'A',...extra};}
function csv(records){return [header,...records.map(row)].join('\n');}
test('built-in discovery is generated from current evidence and data readiness',()=>{
 const issues=D.discover({v3:V3,v4:V4,observations:[]});
 const ids=issues.map(x=>x.id);
 for(const id of ['discovery-public-industrial-investment','discovery-industry-dispersion','discovery-target-investment-gap','discovery-source-conflicts','discovery-critical-data-gaps','discovery-survey-blindspots'])assert.ok(ids.includes(id),id);
 const industrial=issues.find(x=>x.id==='discovery-public-industrial-investment');
 assert.match(industrial.summary,/不等于工业危机/);assert.equal(industrial.tier,'watch');
 assert.ok(industrial.alternatives.length>=3);assert.ok(industrial.falsifier);
});
test('CSV import accepts aggregate indicators and stores locally only',()=>{
 const st=storage(),r=D.importCsv(csv([metric('工业增加值','2021',4)]),st);
 assert.equal(r.ok,true);assert.equal(r.imported,1);assert.equal(D.load(st).length,1);
 assert.equal(D.importCsv(csv([metric('工业增加值','2021',4)]),st).imported,0);
});
test('PII or respondent-level columns are rejected as a whole',()=>{
 const st=storage(),bad=header+',phone\n'+row(metric('工业增加值','2021',4))+',13800000000';
 const r=D.importCsv(bad,st);assert.equal(r.ok,false);assert.equal(D.load(st).length,0);
});
test('unknown fields and invalid periods are rejected',()=>{
 assert.ok(D.parseCsv(header+',employee_name\n'+row(metric('工业增加值','2021',4))+',测试人员').errors.length);
 const bad=D.parseCsv(csv([metric('工业增加值','2021年',4)]));
 assert.ok(bad.errors.length);
});
test('different values from same source scope and period become a conflict candidate',()=>{
 const st=storage(),a=metric('工业增加值','2025',8.7,'公报A'),b=metric('工业增加值','2025',4.1,'公报B');
 const r=D.importCsv(csv([a,b]),st);assert.equal(r.ok,true);
 const issue=D.discover({v3:V3,v4:V4,observations:D.load(st),storage:st}).find(x=>x.kind==='conflict'&&x.source==='本地导入汇总数据');
 assert.ok(issue);assert.match(issue.title,/不同来源数值/);
});
test('five-period series can create a robust anomaly candidate',()=>{
 const st=storage(),rows=[10,11,12,13,40].map((v,i)=>metric('工业产值','2021'.replace('2021',String(2021+i)),v));
 D.importCsv(csv(rows),st);
 const issue=D.discover({v3:V3,v4:V4,observations:D.load(st),storage:st}).find(x=>x.kind==='anomaly');
 assert.ok(issue);assert.match(issue.summary,/偏离该序列此前变化节奏/);
});
test('D-grade assumptions do not trigger empirical anomaly screening',()=>{
 const st=storage(),rows=[10,11,12,13,40].map((v,i)=>metric('工业产值',String(2021+i),v,'研究假设',{evidence_grade:'D'}));
 D.importCsv(csv(rows),st);
 assert.equal(D.discover({v3:V3,v4:V4,observations:D.load(st),storage:st}).filter(x=>x.kind==='anomaly').length,0);
});
test('same-period imported industrial and investment signals can surface a divergence',()=>{
 const st=storage(),rows=[metric('规上工业增加值','2025',8.7,'统计公报'),metric('固定资产投资','2025',-18.8,'统计公报')];
 D.importCsv(csv(rows),st);
 const issue=D.discover({v3:V3,v4:V4,observations:D.load(st),storage:st}).find(x=>x.id.startsWith('import-divergence-'));
 assert.ok(issue);assert.equal(issue.tier,'watch');
});
test('survey aggregate requires sample frame, population and missingness metadata',()=>{
 const good={record_type:'survey_aggregate',indicator:'企业订单预期',period:'2026Q3',geography:'博罗县',value:3.7,unit:'分',scope:'匿名企业问卷均值',source_name:'企业调查汇总',evidence_grade:'B',sample_n:42,population:'规上制造业企业',sample_frame:'按行业分层的企业名录',aggregation:'mean',missing_rate:4};
 const st=storage(),r=D.importCsv(csv([good]),st);assert.equal(r.ok,true);
 const issue=D.discover({v3:V3,v4:V4,observations:D.load(st),storage:st}).find(x=>x.kind==='survey');
 assert.ok(issue);assert.match(issue.summary,/样本量本身不能证明代表性/);
 const bad={...good,sample_frame:''};assert.equal(D.parseCsv(csv([bad])).errors.length,1);
});
test('discovery status and local import clearing work',()=>{
 const st=storage();assert.equal(D.setStatus('discovery-public-industrial-investment','investigating',st),true);
 const issue=D.discover({v3:V3,v4:V4,observations:[],storage:st}).find(x=>x.id==='discovery-public-industrial-investment');
 assert.equal(issue.status,'investigating');D.importCsv(csv([metric('工业增加值','2021',4)]),st);assert.equal(D.clear(st),true);assert.equal(D.load(st).length,0);
});
