const DIM_NAMES=['','数据敏感性','量化抽象力','逻辑推演力','决策校准力'];
const DIM_COLORS=['','#3b82f6','#7c3aed','#ec4899','#f97316'];
const TOTAL_Q=36;
const MIN_PER_DIM=9;

let allQ=[],selectedQ=[],currentIdx=0;
let dimState={1:{answered:0,totalPts:0,maxPts:0},2:{answered:0,totalPts:0,maxPts:0},3:{answered:0,totalPts:0,maxPts:0},4:{answered:0,totalPts:0,maxPts:0}};

fetch('questions.json').then(r=>r.json()).then(data=>{allQ=data;});

function startQuiz(){
  selectedQ=[];currentIdx=0;
  dimState={1:{answered:0,totalPts:0,maxPts:0},2:{answered:0,totalPts:0,maxPts:0},3:{answered:0,totalPts:0,maxPts:0},4:{answered:0,totalPts:0,maxPts:0}};
  for(let d=1;d<=4;d++){
    let pool=allQ.filter(q=>q.dim===d&&q.diff===2);
    if(!pool.length) pool=allQ.filter(q=>q.dim===d);
    let q=pool[Math.floor(Math.random()*pool.length)];
    selectedQ.push(q);
  }
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  renderQuestion();
}

function pickNext(){
  // Phase 1: any dim below MIN_PER_DIM? Pick the one with fewest answered first.
  let needy=[];
  for(let d=1;d<=4;d++){if(dimState[d].answered<MIN_PER_DIM)needy.push(d);}
  let targetDim;
  if(needy.length){
    // Sort by answered count ascending (fewest first), then by ratio ascending (weakest first) as tiebreak
    needy.sort((a,b)=>{
      let da=dimState[a].answered,db=dimState[b].answered;
      if(da!==db)return da-db;
      let ra=dimState[a].maxPts>0?dimState[a].totalPts/dimState[a].maxPts:0;
      let rb=dimState[b].maxPts>0?dimState[b].totalPts/dimState[b].maxPts:0;
      return ra-rb;
    });
    targetDim=needy[0];
  }else{
    // Phase 2: all dims reached minimum, pick weakest ratio
    targetDim=[1,2,3,4].sort((a,b)=>{let ra=dimState[a].maxPts>0?dimState[a].totalPts/dimState[a].maxPts:1;let rb=dimState[b].maxPts>0?dimState[b].totalPts/dimState[b].maxPts:1;return ra-rb;})[0];
  }
  let st=dimState[targetDim];
  let targetDiff;
  if(st.answered===0)targetDiff=2;
  else{let ratio=st.maxPts>0?st.totalPts/st.maxPts:0;if(ratio>=0.7)targetDiff=3;else if(ratio>=0.4)targetDiff=2;else targetDiff=1;}
  let usedIds=new Set(selectedQ.map(q=>q.id));
  let pool=allQ.filter(q=>q.dim===targetDim&&q.diff===targetDiff&&!usedIds.has(q.id));
  if(!pool.length)pool=allQ.filter(q=>q.dim===targetDim&&!usedIds.has(q.id));
  if(!pool.length)pool=allQ.filter(q=>!usedIds.has(q.id));
  if(!pool.length)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

function renderQuestion(){
  let q=selectedQ[currentIdx];
  let pct=((currentIdx)/TOTAL_Q*100).toFixed(0);
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').textContent=(currentIdx+1)+' / '+TOTAL_Q;
  document.getElementById('dimIndicator').textContent=DIM_NAMES[q.dim];
  let typeLabel=q.type==='single'?'单选题':q.type==='multiple'?'多选题':'判断题';
  let typeCls=q.type==='single'?'b-single':q.type==='multiple'?'b-multiple':'b-judge';
  let html='<div class="q-badge '+typeCls+'">'+typeLabel+'</div>';
  html+='<div class="q-text">'+q.q+'</div>';
  if(q.type==='judge'){
    html+='<div class="judge-opts"><div class="judge-btn" onclick="selectJudge(this,true)">✔ 正确</div><div class="judge-btn" onclick="selectJudge(this,false)">✘ 错误</div></div>';
  }else{
    html+='<div class="options">';
    let labels='ABCDEFGH';
    q.opts.forEach((o,i)=>{
      let inputType=q.type==='single'?'radio':'checkbox';
      html+='<div class="option" onclick="selectOption(this,'+i+')"><input type="'+inputType+'" name="qopt" value="'+i+'"><span class="opt-label">'+labels[i]+'.</span><span>'+o+'</span></div>';
    });
    html+='</div>';
  }
  document.getElementById('questionCard').innerHTML=html;
  document.getElementById('submitBtn').disabled=true;
  window._selected=null;window._selectedMulti=new Set();
}

function selectOption(el,idx){
  let q=selectedQ[currentIdx];
  if(q.type==='single'){
    el.closest('.options').querySelectorAll('.option').forEach(o=>o.classList.remove('selected'));
    el.classList.add('selected');el.querySelector('input').checked=true;window._selected=idx;
  }else{
    if(window._selectedMulti.has(idx)){window._selectedMulti.delete(idx);el.classList.remove('selected');el.querySelector('input').checked=false;}
    else{window._selectedMulti.add(idx);el.classList.add('selected');el.querySelector('input').checked=true;}
    window._selected=[...window._selectedMulti].sort();
  }
  document.getElementById('submitBtn').disabled=false;
}

function selectJudge(el,val){
  el.closest('.judge-opts').querySelectorAll('.judge-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');window._selected=val;
  document.getElementById('submitBtn').disabled=false;
}

function checkAnswer(q,ua){
  if(q.type==='single')return ua===q.ans;
  if(q.type==='judge')return ua===q.ans;
  if(q.type==='multiple'){if(!ua||ua.length!==q.ans.length)return false;let s=new Set(ua);return q.ans.every(c=>s.has(c));}
  return false;
}

function diffCoeff(d){return d===1?1.0:d===2?1.5:2.0;}

function getScore(q,ua){
  let c=diffCoeff(q.diff);
  if(q.type==='single'||q.type==='judge')return checkAnswer(q,ua)?q.pts*c:0;
  if(q.type==='multiple'){
    let uas=new Set(ua||[]),cas=new Set(q.ans);
    if([...uas].some(a=>!cas.has(a)))return 0;
    let overlap=[...uas].filter(a=>cas.has(a)).length;
    return overlap===cas.size?q.pts*c:1*c;
  }
  return 0;
}

function submitAnswer(){
  let q=selectedQ[currentIdx],ua=window._selected,score=getScore(q,ua);
  let d=q.dim,coeff=diffCoeff(q.diff);dimState[d].answered++;dimState[d].totalPts+=score;dimState[d].maxPts+=q.pts*coeff;
  currentIdx++;
  if(currentIdx>=TOTAL_Q){showResult();return;}
  let next=pickNext();if(!next){showResult();return;}
  selectedQ.push(next);renderQuestion();
}

function getDimDesc(dim,pct){
  const D={
    1:{h:'你对数据异常和口径问题具有很高的敏感度，能迅速识别数据跳变、分布异常和采集链路问题，并能区分技术性波动与业务性波动。',m:'你能发现大部分明显的数据异常，但对更隐蔽的口径漂移和采集链路问题还需要更多经验积累。',l:'你对数据质量问题的警觉还需加强，建议在日常工作中养成"看到跳跃先问是不是伪跳"的习惯。'},
    2:{h:'你善于将模糊业务概念拆解为可量化子维度，在数据缺失时仍能构建上下界估算，并能主动暴露代理指标的效度缺陷。',m:'你具备基本的量化拆解能力，但在数据稀疏场景下的推断和不确定性处理方面还需提升。',l:'你在将抽象概念转化为可量化指标方面还需大量练习，建议从"拆解"思维入手：任何模糊概念都可以拆为2-3个可观测的子维度。'},
    3:{h:'你具备强烈的因果推断意识，能本能地追问"还有什么别的解释？"，并能区分随机实验与自然实验的适用边界。',m:'你能识别大部分因果谬误，但对更复杂的因果识别策略（如外生变量、断点设计）还需更深入学习。',l:'你容易将相关性等同于因果性，建议养成"这个结论还有什么别的解释？"的本能反应，学习基本的因果推断方法。'},
    4:{h:'你能在信息不完备时做出"带条件的决策"，善于用损失代价而非统计数值驱动最终选择，并能区分可逆与不可逆决策。',m:'你具备基本的决策校准意识，但在多目标冲突和探索-利用权衡方面还需提升。',l:'你在决策校准方面还需加强，建议学习"期望价值"思维和"可逆vs不可逆决策"的区分框架。'}
  };
  let r=D[dim];
  return pct>=75?r.h:pct>=50?r.m:r.l;
}

function getWeaknessAdvice(dim){
  const A={
    1:'建议系统训练"数据质量审计"思维：①看到指标跳变，先排查口径、采集、计算三层链路；②建立"常见伪异常清单"（口径变更、缓存回刷、测试数据混入）；③在汇报任何数据前，先问自己"这个数字可能怎么错"。',
    2:'建议从以下方面提升：①练习将每个模糊概念拆解为2-3个可观测子维度的习惯；②学习费米估算法，在数据缺失时构建上下界；③关注"指标效度"——每个代理指标都问"它到底在度量什么，遗漏了什么"。',
    3:'建议重点学习因果推断基础：①掌握"相关≠因果"的常见模式（混杂、自选择、反向因果）；②学习工具变量、双重差分等基本因果识别策略；③养成"看到结论先找替代解释"的思维习惯。',
    4:'建议重点培养：①期望价值思维——任何决策先算期望收益和最坏情况；②可逆vs不可逆决策区分——前者快速试错，后者提高证据门槛；③探索-利用意识——不要永远只选已知最优，要留出探索空间。'
  };
  return A[dim];
}

function showResult(){
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultScreen').classList.remove('hidden');
  let totalScore=0,totalMax=0,dimScores=[0,0,0,0,0],dimMaxes=[0,0,0,0,0];
  for(let d=1;d<=4;d++){dimScores[d]=dimState[d].totalPts;dimMaxes[d]=dimState[d].maxPts;totalScore+=dimScores[d];totalMax+=dimMaxes[d];}
  let pct=totalMax>0?Math.round(totalScore/totalMax*100):0;
  let totalScoreR=totalScore%1===0?totalScore.toFixed(0):totalScore.toFixed(1),totalMaxR=totalMax%1===0?totalMax.toFixed(0):totalMax.toFixed(1);
  let html='<div class="result-header"><h1>数据思维能力测试报告</h1><div class="total-score">'+pct+'<span style="font-size:24px">分</span></div><div class="score-label">加权总分 '+totalScoreR+' / '+totalMaxR+'，百分制 '+pct+' 分</div></div>';
  html+='<div class="result-card"><h2>能力雷达图</h2><div class="radar-wrap"><canvas id="radarChart"></canvas></div></div>';
  html+='<div class="result-card"><h2>各维度详情</h2><div class="dim-list">';
  for(let d=1;d<=4;d++){
    let s=dimScores[d],m=dimMaxes[d],p=m>0?Math.round(s/m*100):0;
    let lv,lvCls;if(p>=80){lv='优秀';lvCls='lv-a';}else if(p>=60){lv='良好';lvCls='lv-b';}else if(p>=40){lv='待提升';lvCls='lv-c';}else{lv='薄弱';lvCls='lv-d';}
    html+='<div class="dim-item"><div class="dim-head"><span class="dim-name">'+DIM_NAMES[d]+'</span><span><span class="dim-score" style="color:'+DIM_COLORS[d]+'">'+p+'分</span> <span class="dim-level '+lvCls+'">'+lv+'</span></span></div><div class="dim-bar"><div class="dim-bar-fill" style="width:'+p+'%;background:'+DIM_COLORS[d]+'"></div></div><div class="dim-desc">'+getDimDesc(d,p)+'</div></div>';
  }
  html+='</div></div>';
  let weakDims=[];
  for(let d=1;d<=4;d++){let m=dimMaxes[d],p=m>0?Math.round(dimScores[d]/m*100):0;if(p<60)weakDims.push({dim:d,pct:p});}
  if(weakDims.length){
    html+='<div class="weakness-card"><h2>⚠ 薄弱项提示与改进建议</h2>';
    weakDims.sort((a,b)=>a.pct-b.pct);
    weakDims.forEach(w=>{html+='<div class="weakness-item"><h3>'+DIM_NAMES[w.dim]+'（'+w.pct+'分）</h3><p>'+getWeaknessAdvice(w.dim)+'</p></div>';});
    html+='</div>';
  }
  html+='<div class="restart-wrap"><button class="btn btn-primary" onclick="location.reload()">重新测评</button></div>';
  document.getElementById('resultScreen').innerHTML=html;
  setTimeout(()=>{
    let ctx=document.getElementById('radarChart');
    if(ctx){new Chart(ctx,{type:'radar',data:{labels:DIM_NAMES.slice(1),datasets:[{label:'得分',data:DIM_NAMES.slice(1).map((_,i)=>dimMaxes[i+1]>0?Math.round(dimScores[i+1]/dimMaxes[i+1]*100):0),backgroundColor:'rgba(79,70,229,0.15)',borderColor:'#4f46e5',borderWidth:2,pointBackgroundColor:'#4f46e5',pointRadius:4},{label:'基准线',data:[60,60,60,60],backgroundColor:'rgba(156,163,175,0.05)',borderColor:'#9ca3af',borderWidth:1,borderDash:[4,4],pointRadius:0}]},options:{responsive:true,scales:{r:{min:0,max:100,ticks:{stepSize:20,font:{size:11}},pointLabels:{font:{size:13,weight:'600'}}}},plugins:{legend:{display:false}}}});}
  },100);
}
