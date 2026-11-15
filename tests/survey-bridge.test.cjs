'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const evidence=require('../survey-evidence-v1.js');globalThis.BoluoSurveyEvidence=evidence;
const B=require('../survey-bridge-v1.js');globalThis.BoluoSurveyBridge=B;
const UI=require('../survey-bridge-ui-v1.js');
test('four survey topics have a stable frozen, item-specific scenario reference',()=>{
 for(const topic of Object.keys(B.DIMENSIONS)){
  const ref=B.FROZEN[topic];
  assert.equal(ref.topic,topic);
  assert.equal(ref.item_id,B.DIMENSIONS[topic].item_id);
  assert.equal(ref.model,'illustrative-only');
  assert.ok(ref.mean>=1&&ref.mean<=5);
 }
});
test('scenario response generation repeats exactly for identical settings',()=>{
 const a=B.simulate('industry',{pressure:.6,mechanism:'friction',seed:317});
 const b=B.simulate('industry',{pressure:.6,mechanism:'friction',seed:317});
 assert.deepEqual(a,b);
 assert.equal(a.syntheticN,360);
 assert.equal(a.observedSurveyN,0);
 assert.equal(a.scenarioType,'researcher-assumed-synthetic');
 assert.match(a.intervalType,/not-confidence-interval/);
 for(const g of a.groups){
  assert.equal(g.counts.reduce((x,y)=>x+y,0),g.n);
  assert.ok(g.mean>=1&&g.mean<=5);
  assert.equal(g.surveyed,false);
 }
});
test('opposing hypotheses and strength control change the synthetic group output',()=>{
 const a=B.simulate('industry',{pressure:1,mechanism:'expansion'});
 const b=B.simulate('industry',{pressure:1,mechanism:'friction'});
 const c=B.simulate('industry',{pressure:-1,mechanism:'expansion'});
 assert.ok(a.syntheticMean>b.syntheticMean);
 assert.ok(a.syntheticMean>c.syntheticMean);
 assert.equal(a.evidenceCount,2);
 assert.equal(a.sourceFamilies,1);
 assert.equal(B.simulate('talent').evidenceCount,0);
 assert.equal(B.simulate('agriculture').evidenceCount,0);
});
test('pending real questionnaire does not automatically create phantom survey responses',()=>{
 const feed={schema_version:'1.0',status:'pending',datasets:[]};
 assert.equal(B.checkSurveyFeed(feed).ready,false);
 assert.equal(B.compare('industry',feed).available,false);
 assert.match(UI.render({signalTopic:'agriculture',realSurveyFeed:feed}),/没有可核验的公开材料|尚无可核验/);
 const html=UI.render({signalTopic:'industry',realSurveyFeed:feed});
 assert.match(html,/扩张解释/);
 assert.match(html,/摩擦解释/);
 assert.match(html,/合成平均回应/);
 assert.match(html,/真实问卷尚未接入/);
 assert.match(html,/不是置信区间/);
 assert.match(html,/survey-to-wind/);
});
const realFeed={
 schema_version:'1.0',status:'verified',datasets:[{
  topic:'industry',item_id:'business_outlook',
  scale_min:1,scale_max:5,fieldwork_start:'2027-04-01',fieldwork_end:'2027-05-01',
  population:'博罗县相关企业经营主体及从业群体',
  sampling_frame:'stratified enterprises and staff',sampling_method:'stratified sampled, corrected nonresponse',
  groups:[
   {id:'large',n:80,weight:.25,mean:4.2},
   {id:'small',n:100,weight:.50,mean:3.0},
   {id:'workers',n:110,weight:.25,mean:2.6}
  ]
 }]
};
test('future real anonymous group aggregates produce a transparent DESCRIPTIVE comparison',()=>{
 const res=B.compare('industry',realFeed);
 assert.equal(res.mode,'descriptive-comparison-only');
 assert.equal(res.available,true);
 assert.equal(res.nSurvey,290);
 assert.equal(res.calibrationCertified,false);
 assert.ok(Math.abs(res.surveyMean-3.2)<1e-12);
 assert.ok(Number.isFinite(res.difference));
 assert.equal(res.frozenVersion,'shadow-v1');
 assert.equal(res.groups.length,3);
 assert.match(res.caution,/不能直接修正OSINT权重/);
 assert.match(UI.render({signalTopic:'industry',realSurveyFeed:realFeed}),/仅描述性比较/);
});
test('aggregate validator rejects mismatched item, missing metadata and invalid values',()=>{
 const base=realFeed.datasets[0];
 assert.equal(B.validateAggregate({...base,item_id:'some-other-question'}).ok,false);
 assert.equal(B.validateAggregate({...base,sampling_frame:''}).ok,false);
 assert.equal(B.validateAggregate({...base,groups:[{id:'large',n:10,weight:1,mean:6}]}).ok,false);
 assert.equal(B.validateAggregate({...base,groups:[{id:'fake',n:15,weight:1,mean:3}]}).ok,false);
});
test('real survey measurements do not silently rewrite the earlier frozen synthetic baseline',()=>{
 const first=JSON.stringify(B.FROZEN);
 B.compare('industry',realFeed);
 B.compare('tourism',realFeed);
 assert.equal(JSON.stringify(B.FROZEN),first);
});
