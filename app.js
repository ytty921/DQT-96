const DIM_NAMES=['','数据敏感性','量化抽象力','逻辑推演力','决策校准力'];
const DIM_COLORS=['','#3b82f6','#7c3aed','#ec4899','#f97316'];
const TOTAL_Q=36;
const MIN_PER_DIM=9;

let allQ=[],selectedQ=[],currentIdx=0;
let userAnswers=[]; // {answer, score} per index
let startTime=0,testId='';
const SHEET_URL='https://script.google.com/macros/s/AKfycbxhowV5d7BRoMP9zXUZqiwRSQauQQyW991AaGw37vRC0knIxeYPL9mOUjuAKqKTAjXV/exec';
let dimState={1:{answered:0,totalPts:0,maxPts:0},2:{answered:0,totalPts:0,maxPts:0},3:{answered:0,totalPts:0,maxPts:0},4:{answered:0,totalPts:0,maxPts:0}};

fetch('questions.json').then(r=>r.json()).then(data=>{allQ=data;});

function startQuiz(){
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
  let saved=userAnswers[currentIdx];
  let pct=Math.min((currentIdx)/TOTAL_Q*100,100).toFixed(0);
  document.getElementById('progressBar').style.width=pct+'%';
  document.getElementById('progressText').textContent=Math.min(currentIdx+1,TOTAL_Q)+' / '+TOTAL_Q;
  document.getElementById('dimIndicator').textContent=DIM_NAMES[q.dim];
  let typeLabel=q.type==='single'?'单选题':q.type==='multiple'?'多选题':'判断题';
  let typeCls=q.type==='single'?'b-single':q.type==='multiple'?'b-multiple':'b-judge';
  let html='<div class="q-badge '+typeCls+'">'+typeLabel+'</div>';
  html+='<div class="q-text">'+q.q+'</div>';

  if(q.type==='judge'){
    html+='<div class="judge-opts">';
    html+='<div class="judge-btn'+(saved&&saved.answer===true?' selected':'')+'" onclick="selectJudge(this,true)">\u2714 正确</div>';
    html+='<div class="judge-btn'+(saved&&saved.answer===false?' selected':'')+'" onclick="selectJudge(this,false)">\u2718 错误</div>';
    html+='</div>';
    if(saved){window._selected=saved.answer;}else{window._selected=null;}
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

function checkAnswer(q,ua){
  if(q.type==='single')return ua===q.ans;
  if(q.type==='judge')return ua===q.ans;
  if(q.type==='multiple'){if(!ua||ua.length!==q.ans.length)return false;let s=new Set(ua);return q.ans.every(c=>s.has(c));}
  return false;
}

function difficultyBonus(d){return d===1?0:d===2?0.5:1.0;}

function getScore(q,ua){
  let bonus=difficultyBonus(q.diff);
  if(q.type==='single'||q.type==='judge')return checkAnswer(q,ua)?1.0+bonus:0;
  if(q.type==='multiple'){
    let uas=new Set(ua||[]),cas=new Set(q.ans);
    if([...uas].some(a=>!cas.has(a)))return 0;
    let overlap=[...uas].filter(a=>cas.has(a)).length;
    return overlap===cas.size?1.0+bonus:1.0;
  }
  return 0;
}

function submitAnswer(){
  let q=selectedQ[currentIdx];
  let ua=window._selected;
  let score=getScore(q,ua);
  let d=q.dim;

  // If re-answering, revert old score (but keep answered/maxPts since question stays)
  if(userAnswers[currentIdx]){
    dimState[d].totalPts-=userAnswers[currentIdx].score;
  }else{
    dimState[d].answered++;
    dimState[d].maxPts+=1.0;
  }
  dimState[d].totalPts+=score;

  // Store answer
  userAnswers[currentIdx]={answer:ua,score:score};

  currentIdx++;
  saveProgress();

  // End of test?
  if(currentIdx>=TOTAL_Q){showResult();return;}

  // Need more questions?
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
    let p={selectedQ,currentIdx,userAnswers,dimState,startTime,testId,savedAt:new Date().toISOString()};
    localStorage.setItem('dqt_progress',JSON.stringify(p));
  }catch(e){}
}

function loadProgress(){
  try{
    let raw=localStorage.getItem('dqt_progress');
    if(!raw)return null;
    let p=JSON.parse(raw);
    // Validate basic structure
    if(!p.selectedQ||!Array.isArray(p.selectedQ)||typeof p.currentIdx!=='number')return null;
    return p;
  }catch(e){return null;}
}

function clearProgress(){
  try{localStorage.removeItem('dqt_progress');}catch(e){}
}

// === Results ===
function showResult(){
  clearProgress();
  document.getElementById('quizScreen').classList.add('hidden');
  document.getElementById('resultScreen').classList.remove('hidden');
  let totalScore=0,totalMax=0,dimScores=[0,0,0,0,0],dimMaxes=[0,0,0,0,0];
  for(let d=1;d<=4;d++){dimScores[d]=dimState[d].totalPts;dimMaxes[d]=dimState[d].maxPts;totalScore+=dimScores[d];totalMax+=dimMaxes[d];}
  let pct=totalMax>0?Math.round(totalScore/totalMax*100):0;
  let totalScoreR=totalScore%1===0?totalScore.toFixed(0):totalScore.toFixed(1),totalMaxR=totalMax%1===0?totalMax.toFixed(0):totalMax.toFixed(1);
  let duration=Math.round((Date.now()-startTime)/1000);
  let min=Math.floor(duration/60),sec=duration%60;
  let durStr=min>0?min+'分'+sec+'秒':sec+'秒';

  let html='<div class="result-header"><h1>\u6570\u636e\u601d\u7ef4\u80fd\u529b\u6d4b\u8bd5\u62a5\u544a</h1>';
  html+='<div class="total-score">'+pct+'<span style="font-size:24px">\u5206</span></div>';
  html+='<div class="score-label">\u52a0\u6743\u603b\u5206 '+totalScoreR+' / '+totalMaxR+'\uff0c\u767e\u5206\u5236 '+pct+' \u5206 &nbsp;|&nbsp; \u7528\u65f6 '+durStr+'</div></div>';

  html+='<div class="result-card"><h2>\u80fd\u529b\u96f7\u8fbe\u56fe</h2><div class="radar-wrap"><canvas id="radarChart"></canvas></div></div>';
  html+='<div class="result-card"><h2>\u5404\u7ef4\u5ea6\u8be6\u60c5</h2><div class="dim-list">';
  for(let d=1;d<=4;d++){
    let s=dimScores[d],m=dimMaxes[d],p=m>0?Math.round(s/m*100):0;
    let lv,lvCls;if(p>=80){lv='\u4f18\u79c0';lvCls='lv-a';}else if(p>=60){lv='\u826f\u597d';lvCls='lv-b';}else if(p>=40){lv='\u5f85\u63d0\u5347';lvCls='lv-c';}else{lv='\u8584\u5f31';lvCls='lv-d';}
    html+='<div class="dim-item"><div class="dim-head"><span class="dim-name">'+DIM_NAMES[d]+'</span><span><span class="dim-score" style="color:'+DIM_COLORS[d]+'">'+p+'\u5206</span> <span class="dim-level '+lvCls+'">'+lv+'</span></span></div><div class="dim-bar"><div class="dim-bar-fill" style="width:'+Math.min(p,100)+'%;background:'+DIM_COLORS[d]+'"></div></div><div class="dim-desc">'+getDimDesc(d,p)+'</div></div>';
  }
  html+='</div></div>';

  let weakDims=[];
  for(let d=1;d<=4;d++){let m=dimMaxes[d],p=m>0?Math.round(dimScores[d]/m*100):0;if(p<60)weakDims.push({dim:d,pct:p});}
  if(weakDims.length){
    html+='<div class="weakness-card"><h2>\u26a0 \u8584\u5f31\u9879\u63d0\u793a\u4e0e\u6539\u8fdb\u5efa\u8bae</h2>';
    weakDims.sort((a,b)=>a.pct-b.pct);
    weakDims.forEach(w=>{html+='<div class="weakness-item"><h3>'+DIM_NAMES[w.dim]+'\uff08'+w.pct+'\u5206\uff09</h3><p>'+getWeaknessAdvice(w.dim)+'</p></div>';});
    html+='</div>';
  }

  // Action buttons
  html+='<div class="result-actions">';
  html+='<button class="btn btn-primary" onclick="downloadPdf()">\ud83d\udcc4 \u5bfc\u51fa PDF \u62a5\u544a</button>';
  html+='<button class="btn btn-restart" onclick="location.reload()">\u91cd\u65b0\u6d4b\u8bc4</button>';
  html+='</div>';

  document.getElementById('resultScreen').innerHTML=html;

  // Store result for PDF export
  window._lastResult={pct,totalScore,totalMax,dimScores,dimMaxes,duration,dimState,startTime};

  // Store result summary in localStorage for history
  saveResultSummary(pct,totalScore,totalMax,dimScores,dimMaxes,duration);

  // Upload to Google Sheets (fire-and-forget)
  uploadResults(pct,totalScore,totalMax,dimScores,dimMaxes,duration);

  setTimeout(()=>{
    let ctx=document.getElementById('radarChart');
    if(ctx){
      let radarData=DIM_NAMES.slice(1).map((_,i)=>dimMaxes[i+1]>0?Math.round(dimScores[i+1]/dimMaxes[i+1]*100):0);
      let radarMax=Math.max(100,Math.ceil(Math.max(...radarData)/20)*20);
      window._radarChart=new Chart(ctx,{type:'radar',data:{labels:DIM_NAMES.slice(1),datasets:[{label:'\u5f97\u5206',data:radarData,backgroundColor:'rgba(79,70,229,0.15)',borderColor:'#4f46e5',borderWidth:2,pointBackgroundColor:'#4f46e5',pointRadius:4},{label:'\u57fa\u51c6\u7ebf',data:[60,60,60,60],backgroundColor:'rgba(156,163,175,0.05)',borderColor:'#9ca3af',borderWidth:1,borderDash:[4,4],pointRadius:0}]},options:{responsive:true,scales:{r:{min:0,max:radarMax,ticks:{stepSize:20,font:{size:11}},pointLabels:{font:{size:13,weight:'600'}}}},plugins:{legend:{display:false}}}});}
  },100);
}

function downloadPdf(){
  let r=window._lastResult;
  if(!r)return;
  let {pct,totalScore,totalMax,dimScores,dimMaxes,duration,dimState}=r;
  let totalScoreR=totalScore%1===0?totalScore.toFixed(0):totalScore.toFixed(1);
  let totalMaxR=totalMax%1===0?totalMax.toFixed(0):totalMax.toFixed(1);
  let min=Math.floor(duration/60),sec=duration%60;
  let durStr=min>0?min+'\u5206'+sec+'\u79d2':sec+'\u79d2';
  let ts=new Date().toLocaleString('zh-CN');

  // Collect weakness dims
  let weakDims=[];
  for(let d=1;d<=4;d++){let m=dimMaxes[d],p=m>0?Math.round(dimScores[d]/m*100):0;if(p<60)weakDims.push({dim:d,pct:p});}
  weakDims.sort((a,b)=>a.pct-b.pct);

  // Build dim rows
  let dimRows='';
  for(let d=1;d<=4;d++){
    let s=dimScores[d],m=dimMaxes[d],p=m>0?Math.round(s/m*100):0;
    let lv;if(p>=80)lv='\u4f18\u79c0';else if(p>=60)lv='\u826f\u597d';else if(p>=40)lv='\u5f85\u63d0\u5347';else lv='\u8584\u5f31';
    dimRows+='<tr><td style="color:'+DIM_COLORS[d]+';font-weight:700">'+DIM_NAMES[d]+'</td><td style="font-weight:700">'+p+'\u5206</td><td>'+lv+'</td><td style="font-size:12px;color:#666">'+getDimDesc(d,p)+'</td></tr>';
  }

  // Build weakness rows
  let weakRows='';
  if(weakDims.length){
    weakDims.forEach(w=>{
      weakRows+='<div class="weak-card"><h3>'+DIM_NAMES[w.dim]+' \uff08'+w.pct+'\u5206\uff09</h3><p>'+getWeaknessAdvice(w.dim)+'</p></div>';
    });
  }

  let pw=window.open('','_blank','width=900,height=700');
  pw.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>DQT \u6d4b\u8bc4\u62a5\u544a</title>');
  pw.document.write('<style>');
  pw.document.write('*{margin:0;padding:0;box-sizing:border-box}');
  pw.document.write('body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2937;line-height:1.7;padding:0}');
  pw.document.write('.report{max-width:700px;margin:0 auto;padding:30px 40px}');
  pw.document.write('.header{text-align:center;border-bottom:2px solid #4f46e5;padding-bottom:20px;margin-bottom:24px}');
  pw.document.write('.header h1{font-size:24px;color:#4f46e5;margin-bottom:4px}');
  pw.document.write('.header .score{font-size:48px;font-weight:800;color:#4f46e5;margin:8px 0}');
  pw.document.write('.header .meta{font-size:13px;color:#6b7280}');
  pw.document.write('.section{margin-bottom:24px}');
  pw.document.write('.section h2{font-size:16px;font-weight:700;border-left:3px solid #4f46e5;padding-left:10px;margin-bottom:12px}');
  pw.document.write('table{width:100%;border-collapse:collapse;font-size:13px}');
  pw.document.write('th,td{border:1px solid #e5e7eb;padding:10px 12px;text-align:left}');
  pw.document.write('th{background:#f3f4f6;font-weight:600}');
  pw.document.write('.weak-card{background:#fffbeb;border-left:3px solid #d97706;padding:12px 16px;margin-bottom:10px;border-radius:0 6px 6px 0}');
  pw.document.write('.weak-card h3{font-size:14px;color:#92400e;margin-bottom:4px}');
  pw.document.write('.weak-card p{font-size:13px;color:#78350f}');
  pw.document.write('.chart-wrap{max-width:360px;margin:0 auto 20px}');
  pw.document.write('.footer{text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:20px}');
  pw.document.write('@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.report{padding:0}}');
  pw.document.write('</style></head><body><div class="report">');
  
  // Header
  pw.document.write('<div class="header"><h1>\u6570\u636e\u601d\u7ef4\u80fd\u529b\u6d4b\u8bc4\u62a5\u544a</h1>');
  pw.document.write('<div class="score">'+pct+'<span style="font-size:20px"> \u5206</span></div>');
  pw.document.write('<div class="meta">\u52a0\u6743\u603b\u5206 '+totalScoreR+' / '+totalMaxR+' \uff5c \u7528\u65f6 '+durStr+' \uff5c '+ts+'</div></div>');
  
  // Dimension table
  pw.document.write('<div class="section"><h2>\u5404\u7ef4\u5ea6\u8be6\u60c5</h2>');
  pw.document.write('<table><tr><th>\u7ef4\u5ea6</th><th>\u5f97\u5206</th><th>\u7b49\u7ea7</th><th>\u8bf4\u660e</th></tr>');
  pw.document.write(dimRows);
  pw.document.write('</table></div>');
  
  // Weakness
  if(weakRows){
    pw.document.write('<div class="section"><h2>\u8584\u5f31\u9879\u63d0\u793a</h2>'+weakRows+'</div>');
  }
  
  // Footer
  pw.document.write('<div class="footer">DQT \u00b7 \u6570\u636e\u601d\u7ef4\u80fd\u529b\u6d4b\u8bc4 \u00b7 \u62a5\u544a\u751f\u6210\u65f6\u95f4\uff1a'+ts+'</div>');
  pw.document.write('</div>');
  
  // Auto-print after DOM ready
  pw.document.write('<script>setTimeout(function(){window.print();},300);<\/script>');
  pw.document.write('</body></html>');
  pw.document.close();
}

function downloadResult(){
  let totalScore=0,totalMax=0,dimScores=[0,0,0,0,0],dimMaxes=[0,0,0,0,0];
  for(let d=1;d<=4;d++){dimScores[d]=dimState[d].totalPts;dimMaxes[d]=dimState[d].maxPts;totalScore+=dimScores[d];totalMax+=dimMaxes[d];}
  let pct=totalMax>0?Math.round(totalScore/totalMax*100):0;
  let duration=Math.round((Date.now()-startTime)/1000);

  let result={
    testId:'DQT-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19),
    timestamp:new Date().toISOString(),
    totalScore:totalScore,totalMax:totalMax,percentage:pct,
    durationSeconds:duration,
    dimensions:{},
    answers:[]
  };
  for(let d=1;d<=4;d++){
    result.dimensions[DIM_NAMES[d]]={
      score:Math.round(dimScores[d]*10)/10,
      max:Math.round(dimMaxes[d]*10)/10,
      percentage:dimMaxes[d]>0?Math.round(dimScores[d]/dimMaxes[d]*100):0
    };
  }
  for(let i=0;i<Math.min(selectedQ.length,userAnswers.length);i++){
    if(!userAnswers[i])continue;
    let q=selectedQ[i],ua=userAnswers[i];
    result.answers.push({
      order:i+1,qid:q.id,dim:DIM_NAMES[q.dim],diff:q.diff,type:q.type,
      question:q.q,
      userAnswer:ua.answer,
      correct:checkAnswer(q,ua.answer),
      score:ua.score
    });
  }

  let blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'});
  let url=URL.createObjectURL(blob);
  let a=document.createElement('a');
  a.href=url;a.download=result.testId+'.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saveResultSummary(pct,totalScore,totalMax,dimScores,dimMaxes,duration){
  try{
    let history=JSON.parse(localStorage.getItem('dqt_history')||'[]');
    history.push({
      timestamp:new Date().toISOString(),
      percentage:pct,score:totalScore,max:totalMax,
      dim1:dimMaxes[1]>0?Math.round(dimScores[1]/dimMaxes[1]*100):0,
      dim2:dimMaxes[2]>0?Math.round(dimScores[2]/dimMaxes[2]*100):0,
      dim3:dimMaxes[3]>0?Math.round(dimScores[3]/dimMaxes[3]*100):0,
      dim4:dimMaxes[4]>0?Math.round(dimScores[4]/dimMaxes[4]*100):0,
      durationSeconds:duration
    });
    // Keep only last 20
    if(history.length>20)history=history.slice(-20);
    localStorage.setItem('dqt_history',JSON.stringify(history));
  }catch(e){}
}

function uploadResults(pct,totalScore,totalMax,dimScores,dimMaxes,duration){
  try{
    let dimNames=['数据敏感性','量化抽象力','逻辑推演力','决策校准力'];
    let dimPcts={};
    for(let d=1;d<=4;d++){
      dimPcts[dimNames[d-1]]={percentage:dimMaxes[d]>0?Math.round(dimScores[d]/dimMaxes[d]*100):0};
    }

    // collect per-question detail
    let answers=[];
    for(let i=0;i<selectedQ.length;i++){
      let q=selectedQ[i],ua=userAnswers[i];
      if(!ua)continue;
      let correctAns=Array.isArray(q.ans)?q.ans:[q.ans];
      let userAns=ua.answer;
      let isCorrect=false;
      if(Array.isArray(correctAns)&&Array.isArray(userAns)){
        isCorrect=correctAns.length===userAns.length&&correctAns.every(v=>userAns.includes(v));
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

    let min=Math.floor(duration/60),sec=duration%60;
    let ts=new Date().toLocaleString('zh-CN',{hour12:false});

    let payload={
      testId, timestamp:ts, totalScore, totalMax,
      percentage:pct, durationSeconds:duration,
      dimensions:dimPcts, answers
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
  const D={
    1:{h:'\u4f60\u5bf9\u5bb6\u5ead\u8d26\u5355\u4e0a\u7684\u6570\u5b57\u53d8\u5316\u975e\u5e38\u654f\u9510\u3002\u770b\u5230\u5f00\u652f\u7a81\u7136\u7ffb\u500d\uff0c\u4f60\u4f1a\u672c\u80fd\u5730\u6392\u67e5\u662f\u771f\u5b9e\u82b1\u4e86\u66f4\u591a\u94b1\uff0c\u8fd8\u662f\u6362\u4e86\u8bb0\u8d26\u8f6f\u4ef6\u5bfc\u81f4\u5f52\u7c7b\u53d8\u4e86\u3001\u6216\u8005\u94f6\u884c\u7cfb\u7edf\u5ef6\u8fdf\u5165\u8d26\u3002\u4f60\u80fd\u8fa8\u522b\u4ec0\u4e48\u662f\u771f\u6b63\u7684\u5f02\u5e38\uff0c\u4ec0\u4e48\u662f\u770b\u8d77\u6765\u5413\u4eba\u4f46\u5176\u5b9e\u4e0d\u5947\u602a\u7684\u6b63\u5e38\u6ce2\u52a8\u3002',m:'\u4f60\u80fd\u53d1\u73b0\u5927\u90e8\u5206\u660e\u663e\u7684\u8d26\u5355\u5f02\u5e38\uff08\u6bd4\u5982\u7535\u8d39\u7a81\u7136\u66b4\u6da8\uff09\uff0c\u4f46\u5bf9\u4e8e\u66f4\u9690\u853d\u7684\u95ee\u9898\u2014\u2014\u6bd4\u5982\u6362\u4e86\u7edf\u8ba1\u53e3\u5f84\u5bfc\u81f4\u6570\u636e\u770b\u4e0a\u53bb\u53d8\u4e86\u4f46\u5b9e\u9645\u4e0a\u6ca1\u53d8\u2014\u2014\u8fd8\u9700\u8981\u591a\u79ef\u7d2f\u7ecf\u9a8c\u3002',l:'\u4f60\u5bf9\u8d26\u5355\u6570\u636e\u7684\u51c6\u786e\u6027\u548c\u4e00\u81f4\u6027\u95ee\u9898\u8fd8\u4e0d\u591f\u654f\u611f\u3002\u5efa\u8bae\u517b\u6210\u4e60\u60ef\uff1a\u770b\u5230\u4efb\u4f55\u6570\u5b57\u660e\u663e\u53d8\u5316\u65f6\uff0c\u5148\u95ee\u81ea\u5df1\u201c\u8fd9\u4e2a\u53d8\u5316\u662f\u771f\u5b9e\u53d1\u751f\u7684\uff0c\u8fd8\u662f\u8bb0\u5f55\u65b9\u5f0f\u53d8\u4e86\u9020\u6210\u7684\u9519\u89c9\u201d\u3002'},
    2:{h:'\u4f60\u5584\u4e8e\u5c06\u6a21\u7cca\u4e1a\u52a1\u6982\u5ff5\u62c6\u89e3\u4e3a\u53ef\u91cf\u5316\u5b50\u7ef4\u5ea6\uff0c\u5728\u6570\u636e\u7f3a\u5931\u65f6\u4ecd\u80fd\u6784\u5efa\u4e0a\u4e0b\u754c\u4f30\u7b97\uff0c\u5e76\u80fd\u4e3b\u52a8\u66b4\u9732\u4ee3\u7406\u6307\u6807\u7684\u6548\u5ea6\u7f3a\u9677\u3002',m:'\u4f60\u5177\u5907\u57fa\u672c\u7684\u91cf\u5316\u62c6\u89e3\u80fd\u529b\uff0c\u4f46\u5728\u6570\u636e\u7a00\u758f\u573a\u666f\u4e0b\u7684\u63a8\u65ad\u548c\u4e0d\u786e\u5b9a\u6027\u5904\u7406\u65b9\u9762\u8fd8\u9700\u63d0\u5347\u3002',l:'\u4f60\u5728\u5c06\u62bd\u8c61\u6982\u5ff5\u8f6c\u5316\u4e3a\u53ef\u91cf\u5316\u6307\u6807\u65b9\u9762\u8fd8\u9700\u5927\u91cf\u7ec3\u4e60\uff0c\u5efa\u8bae\u4ece\u201c\u62c6\u89e3\u201d\u601d\u7ef4\u5165\u624b\uff1a\u4efb\u4f55\u6a21\u7cca\u6982\u5ff5\u90fd\u53ef\u4ee5\u62c6\u4e3a2-3\u4e2a\u53ef\u89c2\u6d4b\u7684\u5b50\u7ef4\u5ea6\u3002'},
    3:{h:'\u4f60\u5177\u5907\u5f3a\u70c8\u7684\u56e0\u679c\u63a8\u65ad\u610f\u8bc6\uff0c\u80fd\u672c\u80fd\u5730\u8ffd\u95ee\u201c\u8fd8\u6709\u4ec0\u4e48\u522b\u7684\u89e3\u91ca\uff1f\u201d\uff0c\u5e76\u80fd\u533a\u5206\u968f\u673a\u5b9e\u9a8c\u4e0e\u81ea\u7136\u5b9e\u9a8c\u7684\u9002\u7528\u8fb9\u754c\u3002',m:'\u4f60\u80fd\u8bc6\u522b\u5927\u90e8\u5206\u56e0\u679c\u8c2c\u8bef\uff0c\u4f46\u5bf9\u66f4\u590d\u6742\u7684\u56e0\u679c\u8bc6\u522b\u7b56\u7565\uff08\u5982\u5916\u751f\u53d8\u91cf\u3001\u65ad\u70b9\u8bbe\u8ba1\uff09\u8fd8\u9700\u66f4\u6df1\u5165\u5b66\u4e60\u3002',l:'\u4f60\u5bb9\u6613\u5c06\u76f8\u5173\u6027\u7b49\u540c\u4e8e\u56e0\u679c\u6027\uff0c\u5efa\u8bae\u517b\u6210\u201c\u8fd9\u4e2a\u7ed3\u8bba\u8fd8\u6709\u4ec0\u4e48\u522b\u7684\u89e3\u91ca\uff1f\u201d\u7684\u672c\u80fd\u53cd\u5e94\uff0c\u5b66\u4e60\u57fa\u672c\u7684\u56e0\u679c\u63a8\u65ad\u65b9\u6cd5\u3002'},
    4:{h:'\u4f60\u80fd\u5728\u4fe1\u606f\u4e0d\u5b8c\u5907\u65f6\u505a\u51fa\u201c\u5e26\u6761\u4ef6\u7684\u51b3\u7b56\u201d\uff0c\u5584\u4e8e\u7528\u635f\u5931\u4ee3\u4ef7\u800c\u975e\u7edf\u8ba1\u6570\u503c\u9a71\u52a8\u6700\u7ec8\u9009\u62e9\uff0c\u5e76\u80fd\u533a\u5206\u53ef\u9006\u4e0e\u4e0d\u53ef\u9006\u51b3\u7b56\u3002',m:'\u4f60\u5177\u5907\u57fa\u672c\u7684\u51b3\u7b56\u6821\u51c6\u610f\u8bc6\uff0c\u4f46\u5728\u591a\u76ee\u6807\u51b2\u7a81\u548c\u63a2\u7d22-\u5229\u7528\u6743\u8861\u65b9\u9762\u8fd8\u9700\u63d0\u5347\u3002',l:'\u4f60\u5728\u51b3\u7b56\u6821\u51c6\u65b9\u9762\u8fd8\u9700\u52a0\u5f3a\uff0c\u5efa\u8bae\u5b66\u4e60\u201c\u671f\u671b\u4ef7\u503c\u201d\u601d\u7ef4\u548c\u201c\u53ef\u9006vs\u4e0d\u53ef\u9006\u51b3\u7b56\u201d\u7684\u533a\u5206\u6846\u67b6\u3002'}
  };
  let r=D[dim];
  return pct>=75?r.h:pct>=50?r.m:r.l;
}

function getWeaknessAdvice(dim){
  const A={
    1:'\u5efa\u8bae\u4ece\u4ee5\u4e0b\u65b9\u9762\u63d0\u5347\u5bf9\u8d26\u5355\u6570\u636e\u7684\u654f\u611f\u5ea6\uff1a\u2460\u770b\u5230\u4efb\u4f55\u5f00\u652f\u5927\u5e45\u53d8\u52a8\uff0c\u5148\u6392\u67e5\u662f\u4e0d\u662f\u6362\u4e86\u8bb0\u8d26\u65b9\u5f0f\u3001\u5206\u7c7b\u89c4\u5219\u53d8\u4e86\u3001\u6216\u8005\u94f6\u884c\u8d26\u5355\u5ef6\u8fdf\uff1b\u2461\u5efa\u7acb\u201c\u5e38\u89c1\u5047\u5f02\u5e38\u6e05\u5355\u201d\uff0c\u6bd4\u5982\u5e74\u5e95\u5956\u91d1\u7ed3\u7b97\u5bfc\u81f4\u67d0\u4e2a\u6708\u6536\u5165\u7ffb\u500d\u3001\u7f13\u5b58\u672a\u66f4\u65b0\u5bfc\u81f4\u91cd\u590d\u8ba1\u7b97\u7b49\uff1b\u2462\u6bcf\u6b21\u770b\u5230\u8ba9\u4f60\u60ca\u8bb6\u7684\u6570\u5b57\uff0c\u5148\u95ee\u81ea\u5df1\u201c\u8fd9\u4e2a\u6570\u5b57\u53ef\u80fd\u662f\u600e\u4e48\u7edf\u8ba1\u51fa\u6765\u7684\uff0c\u6709\u6ca1\u6709\u88ab\u5f55\u9519\u6216\u7b97\u9519\u201d\u3002',
    2:'\u5efa\u8bae\u4ece\u4ee5\u4e0b\u65b9\u9762\u63d0\u5347\uff1a\u2460\u7ec3\u4e60\u5c06\u6bcf\u4e2a\u6a21\u7cca\u6982\u5ff5\u62c6\u89e3\u4e3a2-3\u4e2a\u53ef\u89c2\u6d4b\u5b50\u7ef4\u5ea6\u7684\u4e60\u60ef\uff1b\u2461\u5b66\u4e60\u8d39\u7c73\u4f30\u7b97\u6cd5\uff0c\u5728\u6570\u636e\u7f3a\u5931\u65f6\u6784\u5efa\u4e0a\u4e0b\u754c\uff1b\u2462\u5173\u6ce8\u201c\u6307\u6807\u6548\u5ea6\u201d\u2014\u2014\u6bcf\u4e2a\u4ee3\u7406\u6307\u6807\u90fd\u95ee\u201c\u5b83\u5230\u5e95\u5728\u5ea6\u91cf\u4ec0\u4e48\uff0c\u9057\u6f0f\u4e86\u4ec0\u4e48\u201d\u3002',
    3:'\u5efa\u8bae\u91cd\u70b9\u5b66\u4e60\u56e0\u679c\u63a8\u65ad\u57fa\u7840\uff1a\u2460\u638c\u63e1\u201c\u76f8\u5173\u2260\u56e0\u679c\u201d\u7684\u5e38\u89c1\u6a21\u5f0f\uff08\u6df7\u6742\u3001\u81ea\u9009\u62e9\u3001\u53cd\u5411\u56e0\u679c\uff09\uff1b\u2461\u5b66\u4e60\u5de5\u5177\u53d8\u91cf\u3001\u53cc\u91cd\u5dee\u5206\u7b49\u57fa\u672c\u56e0\u679c\u8bc6\u522b\u7b56\u7565\uff1b\u2462\u517b\u6210\u201c\u770b\u5230\u7ed3\u8bba\u5148\u627e\u66ff\u4ee3\u89e3\u91ca\u201d\u7684\u601d\u7ef4\u4e60\u60ef\u3002',
    4:'\u5efa\u8bae\u91cd\u70b9\u57f9\u517b\uff1a\u2460\u671f\u671b\u4ef7\u503c\u601d\u7ef4\u2014\u2014\u4efb\u4f55\u51b3\u7b56\u5148\u7b97\u671f\u671b\u6536\u76ca\u548c\u6700\u574f\u60c5\u51b5\uff1b\u2461\u53ef\u9006vs\u4e0d\u53ef\u9006\u51b3\u7b56\u533a\u5206\u2014\u2014\u524d\u8005\u5feb\u901f\u8bd5\u9519\uff0c\u540e\u8005\u63d0\u9ad8\u8bc1\u636e\u95e8\u69db\uff1b\u2462\u63a2\u7d22-\u5229\u7528\u610f\u8bc6\u2014\u2014\u4e0d\u8981\u6c38\u8fdc\u53ea\u9009\u5df2\u77e5\u6700\u4f18\uff0c\u8981\u7559\u51fa\u63a2\u7d22\u7a7a\u95f4\u3002'
  };
  return A[dim];
}
