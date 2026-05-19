const DIM_NAMES=['','数据敏感性','量化抽象力','逻辑推演力','决策校准力'];
const DIM_COLORS=['','#5A7F99','#3D566E','#5A7F99','#3D566E'];
const TOTAL_Q=36;
const MIN_PER_DIM=9;

let allQ=_ALL_QUESTIONS||[],selectedQ=[],currentIdx=0;
let userAnswers=[]; // {answer, score} per index
let startTime=0,testId='';
let userName='';
let questionsReady=allQ.length>0;
const SHEET_URL='https://script.google.com/macros/s/AKfycbzNYj1qAM4_QFDuzGVz-MijZU_Ae6Dw0YWBR-ffSO4WxoEvS20dn7mj8W2FX-CwV7pJDg/exec';
let dimState={1:{answered:0,totalPts:0,maxPts:0},2:{answered:0,totalPts:0,maxPts:0},3:{answered:0,totalPts:0,maxPts:0},4:{answered:0,totalPts:0,maxPts:0}};

// 启用开始按钮
(function(){
  if(questionsReady){
    var btn=document.querySelector('#startScreen .btn-primary');
    if(btn){ btn.disabled=false; btn.textContent='开始测评'; }
  }
})();

function showNameScreen(){
  if(!questionsReady){
    alert('题库加载中，请稍候再试…');
    return;
  }
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('nameScreen').classList.remove('hidden');
  document.getElementById('nameInput').focus();
}

function onNameInput(){
  let val=document.getElementById('nameInput').value.trim();
  document.getElementById('nameBtn').disabled=!val;
}

function confirmName(){
  userName=document.getElementById('nameInput').value.trim();
  if(!userName)return;
  document.getElementById('nameScreen').classList.add('hidden');
  startQuiz();
}

function startQuiz(){
  if(!questionsReady||!allQ.length){
    alert('题库加载中，请稍候再试…');
    return;
  }
  // Check for saved progress
  let progress=loadProgress();
  if(progress && progress.currentIdx>0){
    if(confirm('检测到上次未完成的测试（已完成 '+progress.currentIdx+'/'+TOTAL_Q+' 题），是否继续？')){
      selectedQ=progress.selectedQ;
      currentIdx=progress.currentIdx;
      userAnswers=progress.userAnswers||[];
      dimState=progress.dimState;
      startTime=progress.startTime||Date.now();
      testId=progress.testId||(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
      if(progress.userName) userName=progress.userName;
      document.getElementById('startScreen').classList.add('hidden');
      document.getElementById('quizScreen').classList.remove('hidden');
      renderQuestion();
      return;
    }else{
      clearProgress();
    }
  }
  // Fresh start
  selectedQ=[];currentIdx=0;userAnswers=[];
  startTime=Date.now();
  testId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  dimState={1:{answered:0,totalPts:0,maxPts:0},2:{answered:0,totalPts:0,maxPts:0},3:{answered:0,totalPts:0,maxPts:0},4:{answered:0,totalPts:0,maxPts:0}};
  for(let d=1;d<=4;d++){
    let pool=allQ.filter(q=>q.dim===d&&q.diff===2);
    if(!pool.length) pool=allQ.filter(q=>q.dim===d);
    let q=pool[Math.floor(Math.random()*pool.length)];
    selectedQ.push(q);
  }
  clearProgress();
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('quizScreen').classList.remove('hidden');
  renderQuestion();
}

function pickNext(){
  let needy=[];
  for(let d=1;d<=4;d++){if(dimState[d].answered<MIN_PER_DIM)needy.push(d);}
  let targetDim;
  if(needy.length){
    needy.sort((a,b)=>{
      let da=dimState[a].answered,db=dimState[b].answered;
      if(da!==db)return da-db;
      let ra=dimState[a].maxPts>0?dimState[a].totalPts/dimState[a].maxPts:0;
      let rb=dimState[b].maxPts>0?dimState[b].totalPts/dimState[b].maxPts:0;
      return ra-rb;
    });
    targetDim=needy[0];
  }else{
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
  if(!q){ console.error('renderQuestion: 题目为空, idx='+currentIdx, selectedQ); alert('出错了，请刷新页面重试'); return; }
  let saved=userAnswers[currentIdx];
  let pct=Math.min((currentIdx)/TOTAL_Q*100,100).toFixed(0);
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').textContent=Math.min(currentIdx+1,TOTAL_Q)+' / '+TOTAL_Q;
  document.getElementById('dimIndicator').textContent=DIM_NAMES[q.dim];
  let typeLabel=q.type==='single'?'单选题':q.type==='multiple'?'多选题':q.type==='judge'?'判断题':'排序题';
  let typeCls=q.type==='single'?'b-single':q.type==='multiple'?'b-multiple':q.type==='judge'?'b-judge':'b-rank';
  let html='<div class="q-badge '+typeCls+'">'+typeLabel+'</div>';
  html+='<div class="q-text">'+q.q+'</div>';

  if(q.type==='judge'){
    html+='<div class="judge-opts">';
    html+='<div class="judge-btn'+(saved&&saved.answer===true?' selected':'')+'" onclick="selectJudge(this,true)">\u2714 正确</div>';
    html+='<div class="judge-btn'+(saved&&saved.answer===false?' selected':'')+'" onclick="selectJudge(this,false)">\u2718 错误</div>';
    html+='</div>';
    if(saved){window._selected=saved.answer;}else{window._selected=null;}
  }else if(q.type==='rank'){
    let n=q.opts.length;
    let labels='ABCDEFGH';
    let posLabels=['\u7b2c1\u4f4d','\u7b2c2\u4f4d','\u7b2c3\u4f4d','\u7b2c4\u4f4d','\u7b2c5\u4f4d','\u7b2c6\u4f4d'];
    html+='<div class="rank-opts">';
    q.opts.forEach((o,i)=>{
      let selPos=saved&&saved.answer?saved.answer[i]:null;
      html+='<div class="rank-row"><span class="rank-label">'+labels[i]+'. '+o+'</span><div class="rank-positions">';
      for(let p=0;p<n;p++){
        let occupied=saved&&saved.answer?saved.answer.indexOf(p):-1;
        let isSel=selPos===p;
        let disabled=occupied>=0&&occupied!==i;
        html+='<button class="rank-pos-btn'+(isSel?' selected':'')+'" onclick="selectRank('+i+','+p+',this)"'+(disabled?' disabled':'')+'>'+(p+1)+'</button>';
      }
      html+='</div></div>';
    });
    html+='</div>';
    if(saved){window._selected=saved.answer;}else{window._selected=Array(n).fill(null);}
    window._rankN=n;
  }else{
    html+='<div class="options">';
    let labels='ABCDEFGH';
    q.opts.forEach((o,i)=>{
      let isSel=false;
      if(q.type==='single') isSel=saved&&saved.answer===i;
      else isSel=saved&&saved.answer&&saved.answer.includes(i);
      let inputType=q.type==='single'?'radio':'checkbox';
      html+='<div class="option'+(isSel?' selected':'')+'" onclick="selectOption(this,'+i+')">';
      html+='<input type="'+inputType+'" name="qopt" value="'+i+'"'+(isSel?' checked':'')+'>';
      html+='<span class="opt-label">'+labels[i]+'.</span><span>'+o+'</span></div>';
    });
    html+='</div>';
    if(saved){
      window._selected=saved.answer;
      if(q.type==='multiple') window._selectedMulti=new Set(saved.answer);
      else window._selectedMulti=new Set();
    }else{
      window._selected=null;window._selectedMulti=new Set();
    }
  }

  document.getElementById('questionCard').innerHTML=html;

  // Button states
  let atLast=(currentIdx>=TOTAL_Q-1);
  document.getElementById('submitBtn').textContent=atLast?'\u63d0\u4ea4\u7b54\u5377':'\u4e0b\u4e00\u9898';
  document.getElementById('submitBtn').disabled=!saved;
  document.getElementById('prevBtn').disabled=(currentIdx===0);
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

function selectRank(optIdx,pos,btn){
  if(!Array.isArray(window._selected))window._selected=Array(window._rankN||4).fill(null);
  if(window._selected[optIdx]===pos){
    window._selected[optIdx]=null;
    btn.classList.remove('selected');
  }else{
    let row=btn.closest('.rank-row');
    row.querySelectorAll('.rank-pos-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    window._selected[optIdx]=pos;
  }
  let allRows=document.querySelectorAll('.rank-row');
  allRows.forEach((row,ri)=>{
    row.querySelectorAll('.rank-pos-btn').forEach((b,pi)=>{
      let taken=window._selected.some((p,j)=>p===pi&&j!==ri);
      b.disabled=taken;
      b.style.opacity=taken?'0.3':'';
      b.style.cursor=taken?'not-allowed':'';
    });
  });
  let allSet=window._selected.every(p=>p!==null);
  document.getElementById('submitBtn').disabled=!allSet;
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
  if(q.type==='single'||q.type==='judge')return checkAnswer(q,ua)?c:0;
  if(q.type==='multiple'){
    let uas=new Set(ua||[]),cas=new Set(q.ans);
    if([...uas].some(a=>!cas.has(a)))return 0;
    let overlap=[...uas].filter(a=>cas.has(a)).length;
    return overlap===cas.size?2*c:c;
  }
  if(q.type==='rank'){
    if(!ua||ua.length!==q.ans.length)return 0;
    let correctPos=0;
    for(let i=0;i<ua.length;i++){if(ua[i]===q.ans[i])correctPos++;}
    if(correctPos===ua.length)return 2*c;
    if(correctPos>=Math.ceil(ua.length/2))return c;
    return 0;
  }
  return 0;
}

function submitAnswer(){
  let q=selectedQ[currentIdx];
  let ua=window._selected;
  let score=getScore(q,ua);
  let d=q.dim;

  if(userAnswers[currentIdx]){
    dimState[d].totalPts-=userAnswers[currentIdx].score;
  }else{
    dimState[d].answered++;
    dimState[d].maxPts+=q.type==='multiple'||q.type==='rank'?2*diffCoeff(q.diff):diffCoeff(q.diff);
  }
  dimState[d].totalPts+=score;

  userAnswers[currentIdx]={answer:ua,score:score};

  currentIdx++;
  saveProgress();

  if(currentIdx>=TOTAL_Q){showResult();return;}

  if(currentIdx===selectedQ.length){
    let next=pickNext();
    if(!next){showResult();return;}
    selectedQ.push(next);
  }
  renderQuestion();
}

function goPrev(){
  if(currentIdx<=0)return;
  currentIdx--;
  saveProgress();
  renderQuestion();
}

// === Persistence ===
function saveProgress(){
  try{
    let p={selectedQ,currentIdx,userAnswers,dimState,startTime,testId,userName,savedAt:new Date().toISOString()};
    localStorage.setItem('dqt_progress',JSON.stringify(p));
  }catch(e){}
}

function loadProgress(){
  try{
    let raw=localStorage.getItem('dqt_progress');
    if(!raw)return null;
    let p=JSON.parse(raw);
    if(!p.selectedQ||!Array.isArray(p.selectedQ)||typeof p.currentIdx!=='number')return null;
    if(p.userName) userName=p.userName;
    return p;
  }catch(e){return null;}
}

function clearProgress(){
  try{localStorage.removeItem('dqt_progress');}catch(e){}
}

// ==========================================
// 满分等级 + 二维评级矩阵（SKILL 第六章）
// ==========================================

function maxPtsTier(totalMaxPts){
  if(totalMaxPts>=75) return {tier:3, label:'高难度组', desc:'系统持续出困难题，挑战度高'};
  if(totalMaxPts>=55) return {tier:2, label:'中难度组', desc:'中等难度为主'};
  return {tier:1, label:'低难度组', desc:'以简单题为主'};
}

function getRating2D(pct,totalMaxPts){
  var t=maxPtsTier(totalMaxPts);
  // 百分比等级
  var pctLevel=pct>=80?'优秀':pct>=60?'良好':pct>=40?'待提升':'薄弱';
  // 二维矩阵: [百分比等级][满分等级]
  var matrix={
    '优秀':{3:{level:'卓越',cls:'lv-a',stars:4,desc:'数据思维卓越，在困难题上表现突出'},
            2:{level:'优秀',cls:'lv-a',stars:4,desc:'数据思维突出，能在信息不完善时做出校准决策'},
            1:{level:'良好',cls:'lv-b',stars:3,desc:'在简单题上表现良好，建议挑战更高难度'}},
    '良好':{3:{level:'优秀',cls:'lv-a',stars:4,desc:'在困难题上达到良好水平，实际能力优秀'},
            2:{level:'良好',cls:'lv-b',stars:3,desc:'具备良好的数据分析思维，能处理多变量问题'},
            1:{level:'待提升',cls:'lv-c',stars:2,desc:'基础良好但仍需提升，尤其在复杂场景中'}},
    '待提升':{3:{level:'待提升+',cls:'lv-c',stars:2,desc:'有基本的数据识别能力，但复杂推理仍需加强'},
              2:{level:'待提升',cls:'lv-c',stars:2,desc:'有基本的数据识别能力，但复杂推理仍需加强'},
              1:{level:'待提升-',cls:'lv-c',stars:2,desc:'需要进一步强化基础数据思维训练'}},
    '薄弱':{3:{level:'薄弱+',cls:'lv-d',stars:1,desc:'基础数据意识有待加强，日常数据异常不易察觉'},
            2:{level:'薄弱',cls:'lv-d',stars:1,desc:'基础数据意识有待建立，日常数据异常不易察觉'},
            1:{level:'薄弱-',cls:'lv-d',stars:1,desc:'基础数据意识较为薄弱，建议系统学习数据思维'}}
  };
  var r=matrix[pctLevel][t.tier];
  r.tier=t.tier;
  r.tierLabel=t.label;
  r.tierDesc=t.desc;
  return r;
}

// 保留旧接口兼容
function getStarLevel(pct){
  var r=getRating2D(pct,55); // 默认中难度，仅用于非结果页的兼容调用
  return r;
}

function renderStars(count,total,size,starColor){
  size=size||'large';
  var c=starColor||'';
  return Array.from({length:total},function(_,i){
    return '<span class="star-'+size+(i<count?' filled':' empty')+'"'+
      (i<count&&c?' style="color:'+c+'"':'')+'>'+(i<count?'\u2605':'\u2606')+'</span>';
  }).join('');
}

// === Results ===
function showResult(){
  clearProgress();
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultScreen').classList.remove('hidden');
  var totalScore=0,totalMax=0,dimScores=[0,0,0,0,0],dimMaxes=[0,0,0,0,0];
  for(var d=1;d<=4;d++){dimScores[d]=dimState[d].totalPts;dimMaxes[d]=dimState[d].maxPts;totalScore+=dimScores[d];totalMax+=dimMaxes[d];}
  var pct=totalMax>0?Math.round(totalScore/totalMax*100):0;
  var totalScoreR=totalScore%1===0?totalScore.toFixed(0):totalScore.toFixed(1),totalMaxR=totalMax%1===0?totalMax.toFixed(0):totalMax.toFixed(1);
  var duration=Math.round((Date.now()-startTime)/1000);
  var min=Math.floor(duration/60),sec=duration%60;
  var durStr=min>0?min+'分'+sec+'秒':sec+'秒';

  // 二维评级
  var rating=getRating2D(pct,totalMax);

  var html='<div class="result-header"><h1>数据思维能力测评报告</h1>';
  if(userName){html+='<div class="user-name-label">'+userName+'</div>';}
  html+='<div class="star-rating">'+renderStars(rating.stars,4,'large')+'</div>';
  html+='<div class="level-badge '+rating.cls+'">'+rating.level+'</div>';
  html+='<div class="tier-badge">'+rating.tierLabel+'</div>';
  html+='<div class="level-desc">'+rating.desc+'</div>';
  html+='<div class="score-label">满分 '+totalMaxR+' 分 | 用时 '+durStr+'</div></div>';

  html+='<div class="result-card"><h2>能力概览</h2><div class="dim-list">';
  for(var d=1;d<=4;d++){
    var s=dimScores[d],m=dimMaxes[d],p=m>0?Math.round(s/m*100):0;
    var sl=getStarLevel(p);
    html+='<div class="dim-item"><div class="dim-head"><span class="dim-name">'+DIM_NAMES[d]+'</span>';
    html+='<span class="dim-stars">'+renderStars(sl.stars,4,'small',DIM_COLORS[d])+'</span>';
    html+='<span class="dim-level '+sl.cls+'">'+sl.level+'</span></div>';
    html+='<div class="dim-bar"><div class="dim-bar-fill" style="width:'+Math.min(p,100)+'%;background:'+DIM_COLORS[d]+'"></div></div>';
    html+='<div class="dim-desc">'+getDimDesc(d,p)+'</div></div>';
  }
  html+='</div></div>';

  var weakDims=[];
  for(var d=1;d<=4;d++){var m=dimMaxes[d],p=m>0?Math.round(dimScores[d]/m*100):0;if(p<60)weakDims.push({dim:d,pct:p});}
  if(weakDims.length){
    html+='<div class="weakness-card"><h2>\u26a0 提升建议</h2>';
    weakDims.sort(function(a,b){return a.pct-b.pct;});
    weakDims.forEach(function(w){html+='<div class="weakness-item"><h3>'+DIM_NAMES[w.dim]+'</h3><p>'+getWeaknessAdvice(w.dim)+'</p></div>';});
    html+='</div>';
  }

  html+='<div class="result-actions">';
  html+='<button class="btn btn-primary" onclick="downloadPdf()">\ud83d\udcc4 导出 PDF 报告</button>';
  html+='<button class="btn btn-restart" onclick="location.reload()">重新测评</button>';
  html+='</div>';

  document.getElementById('resultScreen').innerHTML=html;

  // Store result for PDF export
  window._lastResult={pct,totalScore,totalMax,dimScores,dimMaxes,duration,dimState,startTime,userName,rating};

  // Store in localStorage for history
  saveResultSummary(pct,totalScore,totalMax,dimScores,dimMaxes,duration,rating);

  // Upload to Google Sheets
  uploadResults(pct,totalScore,totalMax,dimScores,dimMaxes,duration,rating);
}

function downloadPdf(){
  var r=window._lastResult;
  if(!r)return;
  var pct=r.pct,totalScore=r.totalScore,totalMax=r.totalMax,dimScores=r.dimScores,dimMaxes=r.dimMaxes,duration=r.duration,rating=r.rating;
  var min=Math.floor(duration/60),sec=duration%60;
  var durStr=min>0?min+'分'+sec+'秒':sec+'秒';
  var ts=new Date().toLocaleString('zh-CN');

  // Weakness dims
  var weakDims=[];
  for(var d=1;d<=4;d++){var m=dimMaxes[d],p=m>0?Math.round(dimScores[d]/m*100):0;if(p<60)weakDims.push({dim:d,pct:p});}
  weakDims.sort(function(a,b){return a.pct-b.pct;});

  // Dim rows
  var dimRows='';
  for(var d=1;d<=4;d++){
    var s=dimScores[d],m=dimMaxes[d],p=m>0?Math.round(s/m*100):0;
    var sl=getStarLevel(p);
    dimRows+='<tr><td style="color:'+DIM_COLORS[d]+';font-weight:700">'+DIM_NAMES[d]+'</td><td style="color:'+DIM_COLORS[d]+'">'+'\u2605'.repeat(sl.stars)+'\u2606'.repeat(4-sl.stars)+'</td><td>'+sl.level+'</td><td style="font-size:12px;color:#666">'+getDimDesc(d,p)+'</td></tr>';
  }

  // Weakness rows
  var weakRows='';
  if(weakDims.length){
    weakDims.forEach(function(w){
      weakRows+='<div class="weak-card"><h3>'+DIM_NAMES[w.dim]+'</h3><p>'+getWeaknessAdvice(w.dim)+'</p></div>';
    });
  }

  var pw=window.open('','_blank','width=900,height=700');
  pw.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>DQT 测评报告</title>');
  pw.document.write('<style>');
  pw.document.write('*{margin:0;padding:0;box-sizing:border-box}');
  pw.document.write('body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#3D566E;line-height:1.7;padding:0}');
  pw.document.write('.report{max-width:700px;margin:0 auto;padding:30px 40px}');
  pw.document.write('.header{text-align:center;border-bottom:1px solid #A9BFD1;padding-bottom:20px;margin-bottom:24px}');
  pw.document.write('.header h1{font-size:24px;color:#5A7F99;margin-bottom:4px}');
  pw.document.write('.header .stars{font-size:36px;margin:8px 0;letter-spacing:6px;color:#5A7F99}');
  pw.document.write('.header .badge{display:inline-block;font-size:16px;font-weight:700;padding:4px 18px;border-radius:20px;margin:4px 4px 0;background:#e8eff5;color:#5A7F99}');
  pw.document.write('.header .badge.lv-a{background:#d1fae5;color:#065f46}');
  pw.document.write('.header .badge.lv-b{background:#dbeafe;color:#1e40af}');
  pw.document.write('.header .badge.lv-c{background:#fef3c7;color:#92400e}');
  pw.document.write('.header .badge.lv-d{background:#fee2e2;color:#991b1b}');
  pw.document.write('.header .tier-badge{display:inline-block;font-size:12px;padding:2px 10px;border-radius:10px;background:#f1f5f9;color:#64748b}');
  pw.document.write('.header .meta{font-size:13px;color:#A9BFD1}');
  pw.document.write('.section{margin-bottom:24px}');
  pw.document.write('.section h2{font-size:16px;font-weight:700;border-left:3px solid #5A7F99;padding-left:10px;margin-bottom:12px;color:#5A7F99}');
  pw.document.write('table{width:100%;border-collapse:collapse;font-size:13px}');
  pw.document.write('th,td{border:1px solid #A9BFD1;padding:10px 12px;text-align:left}');
  pw.document.write('th{background:#e8eff5;font-weight:600;color:#5A7F99}');
  pw.document.write('.weak-card{background:#e8eff5;border-left:3px solid #5A7F99;padding:12px 16px;margin-bottom:10px;border-radius:0 6px 6px 0}');
  pw.document.write('.weak-card h3{font-size:14px;color:#3D566E;margin-bottom:4px}');
  pw.document.write('.weak-card p{font-size:13px;color:#5A7F99}');
  pw.document.write('.footer{text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:20px}');
  pw.document.write('@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.report{padding:0}}');
  pw.document.write('</style></head><body><div class="report">');
  
  // Header with 2D rating
  pw.document.write('<div class="header"><h1>数据思维能力测评报告</h1>');
  if(userName){pw.document.write('<div style="font-size:16px;color:#3D566E;margin-bottom:4px">'+userName+'</div>');}
  pw.document.write('<div class="stars">'+'\u2605'.repeat(rating.stars)+'\u2606'.repeat(4-rating.stars)+'</div>');
  pw.document.write('<div class="badge '+rating.cls+'">'+rating.level+'</div>');
  pw.document.write('<div class="tier-badge">'+rating.tierLabel+'</div>');
  pw.document.write('<div style="font-size:14px;color:#5A7F99;margin-top:6px">'+rating.desc+'</div>');
  pw.document.write('<div class="meta">满分 '+totalMax+' 分 | 用时 '+durStr+' | '+ts+'</div></div>');
  
  // Dimension table
  pw.document.write('<div class="section"><h2>能力概览</h2>');
  pw.document.write('<table><tr><th>维度</th><th>等级</th><th>评价</th><th>说明</th></tr>');
  pw.document.write(dimRows);
  pw.document.write('</table></div>');
  
  // Weakness
  if(weakRows){
    pw.document.write('<div class="section"><h2>薄弱项提示</h2>'+weakRows+'</div>');
  }
  
  pw.document.write('<div class="footer">DQT · 数据思维能力测评 · 报告生成时间：'+ts+'</div>');
  pw.document.write('</div>');
  pw.document.write('<script>setTimeout(function(){window.print();},300);<\/script>');
  pw.document.write('</body></html>');
  pw.document.close();
}

function downloadResult(){
  var totalScore=0,totalMax=0,dimScores=[0,0,0,0,0],dimMaxes=[0,0,0,0,0];
  for(var d=1;d<=4;d++){dimScores[d]=dimState[d].totalPts;dimMaxes[d]=dimState[d].maxPts;totalScore+=dimScores[d];totalMax+=dimMaxes[d];}
  var pct=totalMax>0?Math.round(totalScore/totalMax*100):0;
  var duration=Math.round((Date.now()-startTime)/1000);

  var result={
    testId:'DQT-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19),
    timestamp:new Date().toISOString(),
    totalScore:totalScore,totalMax:totalMax,percentage:pct,
    durationSeconds:duration,
    dimensions:{},
    answers:[]
  };
  for(var d=1;d<=4;d++){
    result.dimensions[DIM_NAMES[d]]={
      score:Math.round(dimScores[d]*10)/10,
      max:Math.round(dimMaxes[d]*10)/10,
      percentage:dimMaxes[d]>0?Math.round(dimScores[d]/dimMaxes[d]*100):0
    };
  }
  for(var i=0;i<Math.min(selectedQ.length,userAnswers.length);i++){
    if(!userAnswers[i])continue;
    var q=selectedQ[i],ua=userAnswers[i];
    result.answers.push({
      order:i+1,qid:q.id,dim:DIM_NAMES[q.dim],diff:q.diff,type:q.type,
      question:q.q,
      userAnswer:ua.answer,
      correct:checkAnswer(q,ua.answer),
      score:ua.score
    });
  }

  var blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=result.testId+'.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saveResultSummary(pct,totalScore,totalMax,dimScores,dimMaxes,duration,rating){
  try{
    var history=JSON.parse(localStorage.getItem('dqt_history')||'[]');
    history.push({
      userName,
      timestamp:new Date().toISOString(),
      percentage:pct,score:totalScore,max:totalMax,
      dim1:dimMaxes[1]>0?Math.round(dimScores[1]/dimMaxes[1]*100):0,
      dim2:dimMaxes[2]>0?Math.round(dimScores[2]/dimMaxes[2]*100):0,
      dim3:dimMaxes[3]>0?Math.round(dimScores[3]/dimMaxes[3]*100):0,
      dim4:dimMaxes[4]>0?Math.round(dimScores[4]/dimMaxes[4]*100):0,
      durationSeconds:duration,
      ratingLevel:rating?rating.level:'',
      tierLabel:rating?rating.tierLabel:''
    });
    if(history.length>20)history=history.slice(-20);
    localStorage.setItem('dqt_history',JSON.stringify(history));
  }catch(e){}
}

function uploadResults(pct,totalScore,totalMax,dimScores,dimMaxes,duration,rating){
  try{
    var dimNames=['数据敏感性','量化抽象力','逻辑推演力','决策校准力'];
    var dimPcts={};
    for(var d=1;d<=4;d++){
      dimPcts[dimNames[d-1]]={percentage:dimMaxes[d]>0?Math.round(dimScores[d]/dimMaxes[d]*100):0};
    }

    var answers=[];
    for(var i=0;i<selectedQ.length;i++){
      var q=selectedQ[i],ua=userAnswers[i];
      if(!ua)continue;
      var correctAns=Array.isArray(q.ans)?q.ans:[q.ans];
      var userAns=ua.answer;
      var isCorrect=false;
      if(Array.isArray(correctAns)&&Array.isArray(userAns)){
        isCorrect=correctAns.length===userAns.length&&correctAns.every(function(v){return userAns.includes(v);});
      }else if(!Array.isArray(correctAns)&&!Array.isArray(userAns)){
        isCorrect=correctAns===userAns;
      }
      answers.push({
        order:i+1, qid:q.id, dim:q.dim,
        question:q.q,
        userAnswer:Array.isArray(userAns)?userAns.join(','):String(userAns),
        correctAnswer:Array.isArray(correctAns)?correctAns.join(','):String(correctAns),
        correct:isCorrect, score:ua.score
      });
    }

    var min=Math.floor(duration/60),sec=duration%60;
    var ts=new Date().toLocaleString('zh-CN',{hour12:false});

    var payload={
      userName, testId, timestamp:ts, totalScore, totalMax,
      percentage:pct, durationSeconds:duration,
      dimensions:dimPcts, answers,
      tierLabel: rating?rating.tierLabel:'',
      ratingLevel: rating?rating.level:''
    };

    fetch(SHEET_URL,{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify(payload)
    });
  }catch(e){}
}

function getDimDesc(dim,pct){
  var D={
    1:{h:'你对家庭账单上的数字变化非常敏锐。看到开支突然翻倍，你会本能地排查是真实花了更多钱，还是换了记账软件导致归类变了、或者银行系统延迟入账。你能辨别什么是真正的异常，什么是看起来吓人但其实不奇怪的正常波动。',m:'你能发现大部分明显的账单异常（比如电费突然暴涨），但对于更隐蔽的问题——比如换了统计口径导致数据看上去变了但实际上没变——还需要多积累经验。',l:'你对账单数据的准确性和一致性问题还不够敏感。建议养成习惯：看到任何数字明显变化时，先问自己"这个变化是真实发生的，还是记录方式变了造成的错觉"。'},
    2:{h:'你善于将模糊业务概念拆解为可量化子维度，在数据缺失时仍能构建上下界估算，并能主动暴露代理指标的效度缺陷。',m:'你具备基本的量化拆解能力，但在数据稀疏场景下的推断和不确定性处理方面还需提升。',l:'你在将抽象概念转化为可量化指标方面还需大量练习，建议从"拆解"思维入手：任何模糊概念都可以拆为2-3个可观测的子维度。'},
    3:{h:'你具备强烈的因果推断意识，能本能地追问"还有什么别的解释？"，并能区分随机实验与自然实验的适用边界。',m:'你能识别大部分因果谬误，但对更复杂的因果识别策略（如外生变量、断点设计）还需更深入学习。',l:'你容易将相关性等同于因果性，建议养成"这个结论还有什么别的解释？"的本能反应，学习基本的因果推断方法。'},
    4:{h:'你能在信息不完备时做出"带条件的决策"，善于用损失代价而非统计数值驱动最终选择，并能区分可逆与不可逆决策。',m:'你具备基本的决策校准意识，但在多目标冲突和探索-利用权衡方面还需提升。',l:'你在决策校准方面还需加强，建议学习"期望价值"思维和"可逆vs不可逆决策"的区分框架。'}
  };
  var r=D[dim];
  return pct>=75?r.h:pct>=50?r.m:r.l;
}

function getWeaknessAdvice(dim){
  var A={
    1:'建议从以下方面提升对账单数据的敏感度：①看到任何开支大幅变动，先排查是不是换了记账方式、分类规则变了、或者银行账单延迟；②建立"常见假异常清单"，比如年底奖金结算导致某个月收入翻倍、缓存未更新导致重复计算等；③每次看到让你惊讶的数字，先问自己"这个数字可能是怎么统计出来的，有没有被录错或算错"。',
    2:'建议从以下方面提升：①练习将每个模糊概念拆解为2-3个可观测子维度的习惯；②学习费米估算法，在数据缺失时构建上下界；③关注"指标效度"——每个代理指标都问"它到底在度量什么，遗漏了什么"。',
    3:'建议重点学习因果推断基础：①掌握"相关≠因果"的常见模式（混杂、自选择、反向因果）；②学习工具变量、双重差分等基本因果识别策略；③养成"看到结论先找替代解释"的思维习惯。',
    4:'建议重点培养：①期望价值思维——任何决策先算期望收益和最坏情况；②可逆vs不可逆决策区分——前者快速试错，后者提高证据门槛；③探索-利用意识——不要永远只选已知最优，要留出探索空间。'
  };
  return A[dim];
}
