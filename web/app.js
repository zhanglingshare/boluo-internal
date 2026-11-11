/* Real API-driven internal UI. No baked-in statistical results. */
"use strict";
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const state = {datasetId:"BOLUO_2032_DEMO_V1",scenario:"balanced",knobs:{},token:"",
               scenarioData:null,overview:null,network:null,model:null,external:null};
const sectors = ["primary","secondary","tertiary"];
const names = {primary:"第一产业",secondary:"第二产业",tertiary:"第三产业"};
const colors = ["#71d8b1","#4c8fdb","#e9b16a"];
const format = v => Number(v).toLocaleString("zh-CN",{maximumFractionDigits:1});
const pct = v => (Number(v)*100).toFixed(1)+"%";
const safe = v => String(v == null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

let toastTimeout;
function toast(message){
  const el=$("#toast");el.textContent=String(message);el.hidden=false;
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{el.hidden=true},5500);
}
function status(message){
  $("#statusStrip").innerHTML='<span class="loading-dot"></span><span>'+safe(message)+'</span>';
}
async function api(path,opts={}){
  const headers = Object.assign({"Accept":"application/json"},opts.headers||{});
  if(state.token)headers["X-Internal-Token"]=state.token;
  if(opts.body && typeof opts.body==="object" && !(opts.body instanceof Blob)){
    headers["Content-Type"]="application/json";opts.body=JSON.stringify(opts.body);
  }
  const response=await fetch("/api/v1"+path,{...opts,headers});
  if(response.status===401){$("#authLayer").hidden=false;throw new Error("需要内部访问令牌");}
  if(!response.ok){
    let detail=await response.text();
    try{const data=JSON.parse(detail);detail=typeof data.detail==="string"?data.detail:JSON.stringify(data.detail)}catch(e){}
    throw new Error(detail.slice(0,320));
  }
  return response;
}
async function json(path,opts={}){return (await api(path,opts)).json();}
async function request(path,body){return json(path,{method:"POST",body});}
function activeTab(tab){
  $$(".tabs button").forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle("active",active);if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  $$(".tab-panel").forEach(p=>p.hidden=p.id!=="panel-"+tab);
  if(tab==="network"&&!state.network)loadNetwork();
  if(tab==="model"&&!state.model)runModel();
}
function stack(element,shares){
  const total=sectors.reduce((x,k)=>x+Number(shares[k]||0),0);
  if(!(total>0)){element.textContent="暂无可绘制结果";return}
  element.innerHTML=sectors.map((k,i)=>{
    const fraction=Number(shares[k])/total;
    return '<span style="width:'+(100*fraction).toFixed(4)+'%;background:'+colors[i]+';color:'+(i===1?"#fff":"#11283b")+'">'+(fraction>.08?pct(fraction):"")+'</span>'
  }).join("");
}
function renderHistogram(data){
  const counts=data.counts||[],edges=data.edges||[];
  if(!counts.length||edges.length!==counts.length+1){$("#histogram").textContent="结果分布不可用";return}
  const max=Math.max(...counts,1);const width=750,height=200,base=156,plotH=126,barW=width/counts.length;
  const bars=counts.map((v,i)=>{
    const h=Number(v)/max*plotH;
    return '<rect x="'+(i*barW+1).toFixed(2)+'" y="'+(base-h).toFixed(2)+'" width="'+Math.max(1,barW-2).toFixed(2)+'" height="'+h.toFixed(2)+'" rx="2" fill="'+(i%2?"#55a6cc":"#3888bd")+'"/>';
  }).join("");
  const p10=state.scenarioData.total_2032.p10,p50=state.scenarioData.total_2032.p50,p90=state.scenarioData.total_2032.p90;
  const low=Number(edges[0]),high=Number(edges[edges.length-1]);
  const x=v=>(v-low)/Math.max(high-low,1)*width;
  let marks="";
  for(const [value,label,color] of [[p10,"P10","#90c4d9"],[p50,"P50","#e6a65a"],[p90,"P90","#90c4d9"]]){
    marks+='<line x1="'+x(value)+'" y1="5" x2="'+x(value)+'" y2="'+base+'" stroke="'+color+'" stroke-dasharray="4 5" stroke-width="2"/>';
  }
  $("#histogram").innerHTML='<svg role="img" aria-label="2032 GDP条件模拟分布，区间P10到P90" viewBox="0 0 750 200" xmlns="http://www.w3.org/2000"><line x1="0" y1="'+base+'" x2="'+width+'" y2="'+base+'" stroke="#d5e4ea"/>'+bars+marks+'<text x="5" y="187" fill="#7a93a1" font-size="13">'+format(low)+'亿</text><text x="'+(width-6)+'" text-anchor="end" y="187" fill="#7a93a1" font-size="13">'+format(high)+'亿</text></svg>';
}
function renderScenario(data){
  state.scenarioData=data;
  $("#gdp2025").textContent=format(data.base.gdp);
  $("#gdp2032").textContent=format(data.total_2032.p50);
  $("#share2032").textContent=pct(data.share_2032_p50.tertiary);
  $("#scenarioTitle").textContent=data.scenario_label+" · 条件模拟";
  stack($("#bar2025"),data.base.shares);
  stack($("#bar2032"),data.share_2032_p50);
  $("#sectorLines").innerHTML=sectors.map((k,i)=>{
    const s=data.sectors_2032[k];
    return '<div class="sector-line"><small><i style="display:inline-block;width:8px;height:8px;border-radius:3px;background:'+colors[i]+';margin-right:5px"></i>'+names[k]+'</small><strong>'+format(s.p50)+'亿</strong><span>P10 '+format(s.p10)+' · P90 '+format(s.p90)+'</span></div>'
  }).join("");
  $("#p10").textContent=format(data.total_2032.p10)+"亿";
  $("#p50").textContent=format(data.total_2032.p50)+"亿";
  $("#p90").textContent=format(data.total_2032.p90)+"亿";
  renderHistogram(data.histogram_2032);
  $("#runMeta").textContent="已运行 "+data.draws.toLocaleString()+" 条轨迹 · 种子 "+data.seed;
  status((data.mode==="DEMO"?"Demo合成数据":"混合或未核实导入数据")+" · 计算完成 · "+data.run_id);
}
let runSerial=0;
async function runScenario(){
  const runId=++runSerial;const btn=$("#runScenario");btn.disabled=true;
  status("正在重新计算产业结构和不确定性...");
  try{
    const result=await request("/scenarios/run",{dataset_id:state.datasetId,scenario_id:state.scenario,
      knobs:state.knobs,draws:2500,seed:2032});
    if(runId===runSerial)renderScenario(result);
  }catch(err){toast("情景运行失败："+err.message);status("情景运行未完成，请核对数据或参数。");}
  finally{btn.disabled=false}
}
function renderOverview(result){
  state.overview=result;
  const b=result.summary.baseline;
  $("#modeBadge").textContent=result.dataset.mode+" DATA";
  $("#datasetModeChip").textContent=result.dataset.mode;
  const rows=[
    ["数据快照",result.dataset.dataset_id],
    ["2025 GDP基准",format(b.gdp)+"亿元"],
    ["2025 一二三产",sectors.map(k=>format(b[k])).join(" / ")+"亿元"],
    ["数据指纹",result.dataset.fingerprint_sha256.slice(0,16)+"..."],
    ...Object.entries(result.dataset.counts).map(([k,v])=>[k,format(v)+"条"]),
    ["快照模式",result.dataset.mode]
  ];
  $("#datasetDetails").innerHTML=rows.map(r=>'<div class="dataset-item"><span>'+safe(r[0])+'</span><b>'+safe(r[1])+'</b></div>').join("");
}
async function loadOverview(){
  const result=await json("/overview?dataset_id="+encodeURIComponent(state.datasetId));
  renderOverview(result);
}
async function loadNetwork(){
  try{
    status("正在计算产业关系网络...");
    const data=await json("/network?dataset_id="+encodeURIComponent(state.datasetId));
    state.network=data;
    const vals=data.service_demand_million;
    const entries=Object.entries(vals).sort((a,b)=>b[1]-a[1]);
    const max=Math.max(1,...entries.map(e=>e[1]));
    $("#serviceDemand").innerHTML=entries.map(([name,value])=>'<div class="demand-item"><div class="demand-row"><b>'+safe(name)+'</b><span>'+format(value)+' 百万元</span></div><div class="demand-track"><i style="width:'+(value/max*100).toFixed(1)+'%"></i></div></div>').join("");
    $("#networkMeta").textContent="合成企业节点 "+data.node_count+" · 实际计算的关联边 "+data.edge_count+" · 无对应主体的关系 "+data.missing_endpoint_count+"。关系金额不等于增加值。";
    let paths="";
    const count=Math.max(1,entries.length);
    entries.forEach(([name,value],i)=>{
      const y=36+i*52;
      paths+='<path d="M160 168 C 275 168, 260 '+y+', 364 '+y+'" stroke="#4b92c5" stroke-opacity=".36" stroke-width="'+(2+value/max*12)+'" fill="none"/>';
      paths+='<rect x="364" y="'+(y-17)+'" width="195" height="34" rx="9" fill="#edf5f7" stroke="#d2e1e8"/>';
      paths+='<text x="375" y="'+(y+5)+'" fill="#1f5367" font-size="13">'+safe(name)+'</text>';
    });
    $("#networkDiagram").innerHTML='<svg role="img" aria-label="制造业需求连接五种专业服务的合成关系示意" viewBox="0 0 600 325" xmlns="http://www.w3.org/2000"><rect x="12" y="116" width="148" height="104" rx="14" fill="#12374d"/><text x="86" y="161" text-anchor="middle" fill="#fff" font-size="17" font-weight="800">制造业企业</text><text x="86" y="185" text-anchor="middle" fill="#add3df" font-size="12">模拟需求来源</text>'+paths+'</svg>';
    status("已计算合成产业关系网络 · "+data.edge_count+"条关联边");
  }catch(err){toast("网络分析失败："+err.message)}
}
function renderModel(data){
  state.model=data;
  const labels={"SA->SU":"服务可得性 → 服务使用","SA->OP":"服务可得性 → 经营表现","SU->OP":"服务使用 → 经营表现"};
  $("#modelOutput").innerHTML=Object.entries(data.paths).map(([k,value])=>{
    const ci=data.confidence_intervals[k]||{};
    const range=ci.low==null?"区间不可得":"95% Bootstrap区间 ["+Number(ci.low).toFixed(3)+", "+Number(ci.high).toFixed(3)+"]";
    return '<div class="path-row"><div><strong>'+safe(labels[k]||k)+'</strong><small>'+safe(range)+'</small></div><span>'+Number(value).toFixed(3)+'</span></div>'
  }).join("")+'<p class="chart-footnote">样本 '+data.n+' 份 · Bootstraps '+data.bootstraps+' · 完成 '+(data.converged?"收敛":"未达到预设收敛阈值")+'</p>';
}
async function runModel(){
  $("#runModel").disabled=true;status("正在计算探索性路径模型与自助重抽样...");
  try{const result=await request("/models/run",{dataset_id:state.datasetId,bootstraps:100,seed:317});
    renderModel(result);status("程序模型已运行 · "+result.run_id+" · 非SmartPLS等价认证");
  }catch(err){toast("模型运行失败："+err.message)}
  finally{$("#runModel").disabled=false}
}
async function download(path,body,name){
  const resp=await api(path,{method:"POST",body});
  const blob=await resp.blob();const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function convertToBase64(file){
  const bytes=new Uint8Array(await file.arrayBuffer());let binary="";
  for(let i=0;i<bytes.length;i+=16384){binary+=String.fromCharCode(...bytes.subarray(i,i+16384))}
  return btoa(binary);
}
async function importData(){
  const file=$("#dataFile").files[0];
  if(!file){toast("请先选择CSV或XLSX文件");return}
  if(file.size>3000000){toast("文件超过3MB单次导入限制");return}
  $("#importData").disabled=true;
  try{
    const base64=await convertToBase64(file);
    const result=await request("/datasets/import",{dataset_id:state.datasetId,table:$("#dataType").value,
      filename:file.name,file_base64:base64});
    state.datasetId=result.dataset.dataset_id;
    state.model=null;state.network=null;state.scenarioData=null;
    $("#modelOutput").innerHTML='<div class="placeholder">数据已改变，请重新运行模型</div>';
    $("#comparisonOutput").innerHTML='<div class="placeholder">数据已改变，需要重新导入同一数据版本的专业软件结果</div>';
    await loadOverview();await runScenario();
    $("#uploadMessage").textContent="已生成新快照："+state.datasetId+"。未验证真实数据，不得作为官方结论。";
    toast("数据已导入并重新计算。新快照没有覆盖Demo。");
  }catch(err){toast("数据导入失败："+err.message)}
  finally{$("#importData").disabled=false}
}
async function importExternalFile(){
  const file=$("#externalResultFile").files[0];if(!file)return;
  try{
    const content=JSON.parse(await file.text());
    const res=await request("/external-results",content);
    const comparison=await json("/comparisons/"+encodeURIComponent(res.external_result_id));
    $("#comparisonOutput").innerHTML='<p class="body-copy">已导入 '+safe(comparison.external_software)+' 原始结果，以下为探索性差异，非方法等价认证：</p>'+
      Object.entries(comparison.paths).map(([k,p])=>'<div class="path-row"><div><strong>'+safe(k)+'</strong><small>程序 '+Number(p.program).toFixed(3)+' · 专业软件 '+Number(p.external).toFixed(3)+'</small></div><span>差 '+Number(p.difference).toFixed(3)+'</span></div>').join("");
    toast("结果导入成功，分歧需要人工核对软件估计设置。");
  }catch(err){toast("专业软件结果导入失败："+err.message)}
}
function bind(){
  $$(".tabs button").forEach(b=>b.addEventListener("click",()=>activeTab(b.dataset.tab)));
  $$("#scenarioChoices button").forEach(b=>b.addEventListener("click",()=>{
    state.scenario=b.dataset.scenario;
    $$("#scenarioChoices button").forEach(x=>x.classList.toggle("selected",x===b));
    runScenario();
  }));
  $$("[data-knob]").forEach(input=>{
    input.addEventListener("input",()=>{state.knobs[input.dataset.knob]=Number(input.value);input.parentElement.querySelector("b").textContent=input.value});
    input.addEventListener("change",runScenario);
  });
  $("#runScenario").addEventListener("click",runScenario);
  $("#resetScenario").addEventListener("click",()=>{
    state.scenario="balanced";state.knobs={};
    $$("#scenarioChoices button").forEach(b=>b.classList.toggle("selected",b.dataset.scenario==="balanced"));
    $$("[data-knob]").forEach(input=>{input.value=0;input.parentElement.querySelector("b").textContent="0"});
    runScenario();
  });
  $("#runNetwork").addEventListener("click",loadNetwork);
  $("#runModel").addEventListener("click",runModel);
  $("#importData").addEventListener("click",importData);
  $("#externalResultFile").addEventListener("change",importExternalFile);
  $("#exportPack").addEventListener("click",()=>download("/external-packages",{dataset_id:state.datasetId},"boluo-internal-analysis-pack.zip").catch(err=>toast(err.message)));
  $("#exportReport").addEventListener("click",()=>download("/reports",{dataset_id:state.datasetId,scenario_id:state.scenario},"boluo-2032-demo-report.md").catch(err=>toast(err.message)));
  $("#resetDemo").addEventListener("click",async()=>{state.datasetId="BOLUO_2032_DEMO_V1";state.network=null;state.model=null;await loadOverview();await runScenario();toast("已切回默认Demo，不影响其他数据快照。")});
  $("#authSubmit").addEventListener("click",async()=>{
    state.token=$("#authToken").value;try{await loadOverview();$("#authLayer").hidden=true;await runScenario()}catch(err){toast("令牌验证失败："+err.message)}$("#authToken").value="";
  });
}
async function start(){
  bind();
  try{await loadOverview();await runScenario()}catch(err){toast("启动失败："+err.message);status("启动失败，检查本地服务或授权令牌")}
}
document.addEventListener("DOMContentLoaded",start);
