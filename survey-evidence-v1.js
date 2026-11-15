/* Observable, source-linked public signal ledger for a FUTURE survey calibration.
   No social-media posts are fabricated; no Likert responses or human attitudes
   are generated. No proprietary scoring model is embedded in this public code. */
(function(root){
'use strict';
const TOPICS=[
 {id:'industry',label:'制造与经营',question:'实际生产扩张是否改善了企业经营感受？',
  observed:[
   {id:'manufacturing',date:'2025',source_type:'年度官方统计',lineage:'stat-2025-boluo',name:'规上工业增加值同比+8.7%',description:'生产端指标回升',source:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2'},
   {id:'investment',date:'2025',source_type:'同一统计公报',lineage:'stat-2025-boluo',name:'固定资产投资同比−18.8%',description:'投资与生产变化方向不同',source:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2'}
  ],
  interpretations:['存量产能或既有订单在释放','企业仍可能承受新投资和经营压力'],
  gap:'企业利润、现金流、分行业招工及匿名抽样问卷',candidate_questions:['过去一年，你的企业订单总体如何变化？','目前经营中最难解决的障碍是什么？']},
 {id:'tourism',label:'旅游与消费',question:'旅游热度是否意味着当地经营者与居民普遍受益？',
  observed:[
   {id:'visitors',date:'2025',source_type:'年度官方统计',lineage:'stat-2025-boluo',name:'游客人次同比+11.7%',description:'年度接待游客1028.09万人次',source:'https://maptable.com/tjgb/2025/%E6%83%A0%E5%B7%9E%E5%B8%82/%E5%8D%9A%E7%BD%97%E5%8E%BF/report/hui-zhou-shi-2025-nian-bo-luo-guo-min-jing-ji-he-she-hui-fa-zhan-tong-ji-gong-bao-2'},
   {id:'hotel',date:'2026-10',source_type:'媒体引述平台数据',lineage:'tc-2026-10-platform',name:'博罗入列国庆热门县域目的地前十',description:'引用同程旅行平台的数据，非随机顾客访谈',source:'https://static.nfnews.com/content/202610/07/c12882053.html'}
  ],
  interpretations:['客流与节假日消费活动活跃','高客流可能具有季节性、营销与空间集中度，不能证明居民普遍受益'],
  gap:'住客构成、商户收入与成本、当地居民实际受益的分层样本',
  candidate_questions:['旅游旺季有没有增加你家的收入？','旅游热度对你的通勤、物价或居住体验有哪些变化？']},
 {id:'talent',label:'人才与就业',question:'岗位需求上升是在吸引人才，还是反映用工缺口？',
  observed:[],
  interpretations:['招聘增加可能反映扩产','招聘增加也可能源于流失率和技能匹配不足'],
  gap:'经核验的岗位发布时间、工资区间、岗位去重、企业员工流失率与毕业生就业调查',
  candidate_questions:['过去半年，你是否收到符合技能和薪资预期的工作机会？','企业最难招聘的是哪类岗位？']},
 {id:'agriculture',label:'农业与乡村',question:'网上较少发声的农户，是否被错误当成“没有问题”？',
  observed:[],
  interpretations:['社交平台沉默不能推断产业表现差','社交平台沉默也不能证明农户满意'],
  gap:'镇村分层抽样、农户收入与账期、采收季和渠道销售登记',
  candidate_questions:['上一季农产品实际收款需要多长时间？','目前最影响生产经营的环节是什么？']}
];
function analyze(id){
 const t=TOPICS.find(x=>x.id===id)||TOPICS[0];
 const groups=[...new Set(t.observed.map(x=>x.lineage))];
 return {...t,evidenceCount:t.observed.length,independentOrigins:groups.length,
  hasObservedMedia:t.observed.some(x=>x.source_type.includes('媒体')),
  status:'倾向未识别',likert:null,observedSurveyN:0,
  publicStatus:t.observed.length===0?'尚无入库的可验证公开信号':t.observed.length===1?'仅有单项公开线索':'有多条公开线索，但未经问卷校准',
  disclosure:'不同媒体转载同一公报只算同一信源。来源独立并不保证指标同口径、同日期或足以推断群体态度。'};
}
function plan(){
 return {steps:[
  {name:'登记公开线索',gate:'仅保留已核验URL、发生时点、发表时点、统计单位和重复来源'},
  {name:'保留竞争解释',gate:'同一事件允许正反机制共存，未知群体维持未识别'},
  {name:'分群设计真实问卷',gate:'后续对企业、职工、消费者及农户分别建立可核验抽样框'},
  {name:'对照校准',gate:'以真实问卷为参照评估偏差、排序误差与样本外预测，不强制转成1–5分'}
 ],realSurveyCompleted:0,inferredLikertAllowed:false};
}
const API={TOPICS,analyze,plan};
root.BoluoSurveyEvidence=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
