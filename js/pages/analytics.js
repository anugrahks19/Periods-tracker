/* ============================================
   BLOOM — Analytics Dashboard (v2 — Advanced)
   ============================================ */
const AnalyticsPage = (() => {
  let charts = [];
  let timeRange = 90;

  function init() {}

  async function render(container) {
    const logs = await BloomDB.getAllLogs();
    const cycles = await BloomDB.getAllCycles();
    charts.forEach(c => c.destroy()); charts = [];

    if (logs.length === 0) {
      container.innerHTML = `<div class="section-header"><h2 class="section-header__title">Insights</h2></div>
        <div class="empty-state"><div class="empty-state__icon">📊</div><div class="empty-state__title">No Data Yet</div>
        <div class="empty-state__text">Start logging daily entries or load demo data from Settings.</div></div>`;
      return;
    }

    const cutoff = BloomDB.addDays(BloomDB.today(), -timeRange);
    const filtered = logs.filter(l => l.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));

    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title">Insights</h2></div>
      <div class="time-tabs">
        ${[7,30,60,90].map(r => `<button class="time-tab ${timeRange===r?'active':''}" data-range="${r}">${r}D</button>`).join('')}
      </div>
      <div id="insights-box"></div>
      <div class="analytics-grid">
        <div class="chart-card chart-card--full"><div class="chart-card__title">😊 Mood Over Time</div><div class="chart-wrap"><canvas id="ch-mood"></canvas></div></div>
        <div class="chart-card"><div class="chart-card__title">🔥 Pain Intensity</div><div class="chart-wrap"><canvas id="ch-pain"></canvas></div></div>
        <div class="chart-card"><div class="chart-card__title">⚡ Energy Levels</div><div class="chart-wrap"><canvas id="ch-energy"></canvas></div></div>
        <div class="chart-card chart-card--full"><div class="chart-card__title">😴 Sleep vs Pain Correlation</div><div class="chart-wrap"><canvas id="ch-sleep-pain"></canvas></div></div>
        <div class="chart-card chart-card--full"><div class="chart-card__title">🩹 Top Symptoms</div><div class="chart-wrap chart-wrap--tall"><canvas id="ch-symptoms"></canvas></div></div>
        <div class="chart-card"><div class="chart-card__title">💧 Flow Distribution</div><div class="chart-wrap"><canvas id="ch-flow"></canvas></div></div>
        <div class="chart-card"><div class="chart-card__title">💕 What She Needs Most</div><div class="chart-wrap"><canvas id="ch-needs"></canvas></div></div>
        <div class="chart-card chart-card--full"><div class="chart-card__title">📊 Mood by Cycle Phase</div><div class="chart-wrap"><canvas id="ch-phase-mood"></canvas></div></div>
        <div class="chart-card chart-card--full"><div class="chart-card__title">💊 Relief Effectiveness</div><div class="chart-wrap"><canvas id="ch-relief"></canvas></div></div>
        <div class="chart-card chart-card--full"><div class="chart-card__title">🍫 Cravings Breakdown</div><div class="chart-wrap"><canvas id="ch-cravings"></canvas></div></div>
        <div class="chart-card chart-card--full"><div class="chart-card__title">🤝 Your Actions vs Her Mood</div><div class="chart-wrap"><canvas id="ch-partner"></canvas></div></div>
      </div>
      <div id="pms-analysis"></div>`;

    container.querySelectorAll('.time-tab').forEach(t => t.addEventListener('click', () => { timeRange = parseInt(t.dataset.range); render(container); }));

    renderInsights(container.querySelector('#insights-box'), logs, cycles);
    renderPMS(container.querySelector('#pms-analysis'), logs, cycles);
    setTimeout(() => buildCharts(filtered, logs, cycles), 50);
  }

  function cs() {
    const tc = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
    const gc = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim();
    return { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ x:{ticks:{color:tc,font:{family:'Outfit',size:10}},grid:{color:gc}}, y:{ticks:{color:tc,font:{family:'Outfit',size:10}},grid:{color:gc}} } };
  }

  function buildCharts(filtered, allLogs, cycles) {
    // Mood
    const moodData = filtered.filter(l=>l.mood).map(l=>({x:l.date.slice(5),y:UI.MOOD_SCORE[l.mood]||3}));
    if(moodData.length) charts.push(new Chart(document.getElementById('ch-mood'),{type:'line',data:{labels:moodData.map(d=>d.x),datasets:[{data:moodData.map(d=>d.y),borderColor:'#E8647A',backgroundColor:'rgba(232,100,122,0.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#E8647A'}]},options:{...cs(),scales:{...cs().scales,y:{...cs().scales.y,min:0,max:5,ticks:{...cs().scales.y.ticks,stepSize:1,callback:v=>['','Low','Meh','OK','Good','Great'][v]}}}}}));

    // Pain
    const painData = filtered.map(l=>({x:l.date.slice(5),y:l.painLevel||0}));
    if(painData.length) charts.push(new Chart(document.getElementById('ch-pain'),{type:'bar',data:{labels:painData.map(d=>d.x),datasets:[{data:painData.map(d=>d.y),backgroundColor:painData.map(d=>d.y<=3?'rgba(110,231,183,0.7)':d.y<=5?'rgba(251,191,36,0.7)':d.y<=7?'rgba(251,146,60,0.7)':'rgba(248,113,113,0.7)'),borderRadius:6}]},options:{...cs(),scales:{...cs().scales,y:{...cs().scales.y,min:0,max:10}}}}));

    // Energy
    const enData = filtered.map(l=>({x:l.date.slice(5),y:l.energy||5}));
    if(enData.length) charts.push(new Chart(document.getElementById('ch-energy'),{type:'line',data:{labels:enData.map(d=>d.x),datasets:[{data:enData.map(d=>d.y),borderColor:'#A78BFA',backgroundColor:'rgba(167,139,250,0.1)',fill:true,tension:0.4,pointRadius:2,pointBackgroundColor:'#A78BFA'}]},options:{...cs(),scales:{...cs().scales,y:{...cs().scales.y,min:0,max:10}}}}));

    // Sleep vs Pain scatter
    const spData = filtered.filter(l=>l.sleepQuality).map(l=>({x:l.sleepQuality,y:l.painLevel||0}));
    if(spData.length>2) charts.push(new Chart(document.getElementById('ch-sleep-pain'),{type:'scatter',data:{datasets:[{data:spData,backgroundColor:'rgba(232,100,122,0.6)',pointRadius:6}]},options:{...cs(),scales:{x:{...cs().scales.x,title:{display:true,text:'Sleep Quality',color:cs().scales.x.ticks.color}},y:{...cs().scales.y,title:{display:true,text:'Pain Level',color:cs().scales.y.ticks.color},min:0,max:10}}}}));

    // Symptoms
    const symC = {};
    allLogs.forEach(l=>{[...(l.physicalSymptoms||[]),...(l.emotionalSymptoms||[])].forEach(s=>{symC[s]=(symC[s]||0)+1});});
    const symSorted = Object.entries(symC).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const colors10 = ['#E8647A','#A78BFA','#6EE7B7','#FBBF24','#60A5FA','#FB923C','#F472B6','#34D399','#C084FC','#94A3B8'];
    if(symSorted.length) charts.push(new Chart(document.getElementById('ch-symptoms'),{type:'bar',data:{labels:symSorted.map(s=>s[0]),datasets:[{data:symSorted.map(s=>s[1]),backgroundColor:symSorted.map((_,i)=>colors10[i]+'CC'),borderRadius:6}]},options:{...cs(),indexAxis:'y'}}));

    // Flow doughnut
    const flowC = {}; allLogs.forEach(l=>{if(l.flow)flowC[l.flow]=(flowC[l.flow]||0)+1});
    const flowE = Object.entries(flowC);
    const flowCols = {spotting:'#F9A8D4',light:'#F472B6',moderate:'#EC4899',heavy:'#DB2777','very-heavy':'#BE185D'};
    const tc = cs().scales.x.ticks.color;
    if(flowE.length) charts.push(new Chart(document.getElementById('ch-flow'),{type:'doughnut',data:{labels:flowE.map(e=>UI.getFlowObj(e[0]).label),datasets:[{data:flowE.map(e=>e[1]),backgroundColor:flowE.map(e=>flowCols[e[0]]||'#E8647A'),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Outfit',size:11}}}}}}));

    // Needs doughnut
    const needC = {}; allLogs.forEach(l=>(l.needs||[]).forEach(n=>{needC[n]=(needC[n]||0)+1}));
    const needE = Object.entries(needC).sort((a,b)=>b[1]-a[1]);
    if(needE.length) charts.push(new Chart(document.getElementById('ch-needs'),{type:'doughnut',data:{labels:needE.map(e=>{const t=UI.NEED_TAGS.find(n=>n.id===e[0]);return t?t.label:e[0]}),datasets:[{data:needE.map(e=>e[1]),backgroundColor:needE.map((_,i)=>colors10[i%10]),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:tc,font:{family:'Outfit',size:11}}}}}}));

    // Mood by cycle phase
    const phaseM = {menstrual:{sum:0,n:0},follicular:{sum:0,n:0},ovulatory:{sum:0,n:0},luteal:{sum:0,n:0}};
    allLogs.forEach(l=>{if(!l.mood)return; let cd=0; for(const c of cycles){if(l.date>=c.startDate){cd=BloomDB.daysBetween(c.startDate,l.date)+1}} if(cd>0){const p=UI.getCyclePhase(cd); const k=p.class; if(phaseM[k]){phaseM[k].sum+=(UI.MOOD_SCORE[l.mood]||3);phaseM[k].n++}}});
    const phaseLabels=['Menstrual','Follicular','Ovulatory','Luteal'];
    const phaseKeys=['menstrual','follicular','ovulatory','luteal'];
    const phaseColors=['#E8647A','#6EE7B7','#FBBF24','#A78BFA'];
    const phaseAvgs=phaseKeys.map(k=>phaseM[k].n>0?(phaseM[k].sum/phaseM[k].n).toFixed(1):0);
    if(phaseAvgs.some(v=>v>0)) charts.push(new Chart(document.getElementById('ch-phase-mood'),{type:'bar',data:{labels:phaseLabels,datasets:[{data:phaseAvgs,backgroundColor:phaseColors.map(c=>c+'CC'),borderRadius:8}]},options:{...cs(),scales:{...cs().scales,y:{...cs().scales.y,min:0,max:5,ticks:{...cs().scales.y.ticks,callback:v=>['','Low','Meh','OK','Good','Great'][v]}}}}}));

    // Relief effectiveness
    const relD = {}; allLogs.forEach(l=>(l.reliefMethods||[]).forEach(r=>{if(!relD[r])relD[r]={t:0,c:0};relD[r].t+=(l.reliefEffectiveness||0);relD[r].c++}));
    const relE = Object.entries(relD).map(([n,d])=>({n,avg:d.c>0?(d.t/d.c).toFixed(1):0,c:d.c})).sort((a,b)=>b.avg-a.avg);
    if(relE.length) charts.push(new Chart(document.getElementById('ch-relief'),{type:'bar',data:{labels:relE.map(e=>`${e.n} (${e.c}x)`),datasets:[{data:relE.map(e=>e.avg),backgroundColor:relE.map(e=>e.avg>=4?'rgba(110,231,183,0.7)':e.avg>=2.5?'rgba(251,191,36,0.7)':'rgba(248,113,113,0.7)'),borderRadius:6}]},options:{...cs(),scales:{...cs().scales,y:{...cs().scales.y,min:0,max:5}}}}));

    // Cravings
    const cravC = {}; allLogs.forEach(l=>(l.cravings||[]).forEach(c=>{cravC[c]=(cravC[c]||0)+1}));
    const cravE = Object.entries(cravC).sort((a,b)=>b[1]-a[1]);
    if(cravE.length) charts.push(new Chart(document.getElementById('ch-cravings'),{type:'bar',data:{labels:cravE.map(e=>e[0]),datasets:[{data:cravE.map(e=>e[1]),backgroundColor:cravE.map((_,i)=>colors10[i%10]+'CC'),borderRadius:6}]},options:cs()}));

    // Partner actions vs mood
    const actLogs = allLogs.filter(l=>l.partnerAction&&l.mood);
    const withAction = actLogs.map(l=>UI.MOOD_SCORE[l.mood]||3);
    const noActLogs = allLogs.filter(l=>!l.partnerAction&&l.mood);
    const withoutAction = noActLogs.map(l=>UI.MOOD_SCORE[l.mood]||3);
    const avgWith = withAction.length>0?(withAction.reduce((a,b)=>a+b,0)/withAction.length).toFixed(1):0;
    const avgWithout = withoutAction.length>0?(withoutAction.reduce((a,b)=>a+b,0)/withoutAction.length).toFixed(1):0;
    if(withAction.length>0) charts.push(new Chart(document.getElementById('ch-partner'),{type:'bar',data:{labels:['Days You Did Something','Days You Didn\'t'],datasets:[{data:[avgWith,avgWithout],backgroundColor:['rgba(110,231,183,0.7)','rgba(248,113,113,0.5)'],borderRadius:8}]},options:{...cs(),scales:{...cs().scales,y:{...cs().scales.y,min:0,max:5,ticks:{...cs().scales.y.ticks,callback:v=>['','Low','Meh','OK','Good','Great'][v]}}}}}));
  }

  function renderInsights(el, logs, cycles) {
    const ins = [];
    if(logs.length<3){ins.push({i:'💡',t:'Keep logging daily! After a few entries, <strong>pattern insights</strong> will appear.'});}
    else {
      const painL=logs.filter(l=>l.painLevel>0);
      if(painL.length){const avg=(painL.reduce((s,l)=>s+l.painLevel,0)/painL.length).toFixed(1);ins.push({i:'🔥',t:`Average pain: <strong>${avg}/10</strong> on pain days (${painL.length} days).`});}
      const mc={};logs.forEach(l=>{if(l.mood)mc[l.mood]=(mc[l.mood]||0)+1});
      const tm=Object.entries(mc).sort((a,b)=>b[1]-a[1])[0];
      if(tm){const m=UI.getMoodObj(tm[0]);ins.push({i:m.emoji,t:`Most common mood: <strong>${m.label}</strong> (${tm[1]} days).`});}
      const sc={};logs.forEach(l=>[...(l.physicalSymptoms||[]),...(l.emotionalSymptoms||[])].forEach(s=>{sc[s]=(sc[s]||0)+1}));
      const ts=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
      if(ts)ins.push({i:'🩹',t:`Top symptom: <strong>${ts[0]}</strong> (${ts[1]}× logged).`});
      const nc={};logs.forEach(l=>(l.needs||[]).forEach(n=>{nc[n]=(nc[n]||0)+1}));
      const tn=Object.entries(nc).sort((a,b)=>b[1]-a[1])[0];
      if(tn){const nl=UI.NEED_TAGS.find(n=>n.id===tn[0]);if(nl)ins.push({i:'💕',t:`She needs <strong>${nl.label}</strong> most (${tn[1]}×).`});}
      // Sleep insight
      const sleepL=logs.filter(l=>l.sleepQuality);
      if(sleepL.length>5){const avg=(sleepL.reduce((s,l)=>s+l.sleepQuality,0)/sleepL.length).toFixed(1);ins.push({i:'😴',t:`Average sleep quality: <strong>${avg}/10</strong>.`});}
      // Partner impact
      const actL=logs.filter(l=>l.partnerAction&&l.mood);
      const noActL=logs.filter(l=>!l.partnerAction&&l.mood);
      if(actL.length>3&&noActL.length>3){
        const wAvg=(actL.reduce((s,l)=>s+(UI.MOOD_SCORE[l.mood]||3),0)/actL.length).toFixed(1);
        const woAvg=(noActL.reduce((s,l)=>s+(UI.MOOD_SCORE[l.mood]||3),0)/noActL.length).toFixed(1);
        const diff=(wAvg-woAvg).toFixed(1);
        if(diff>0)ins.push({i:'🤝',t:`Her mood is <strong>${diff} points higher</strong> on days you do something for her!`});
      }
      ins.push({i:'📊',t:`<strong>${logs.length}</strong> days logged across <strong>${cycles.length}</strong> cycles.`});
    }
    el.innerHTML=ins.map(i=>`<div class="insight-card"><div class="insight-card__icon">${i.i}</div><div class="insight-card__text">${i.t}</div></div>`).join('');
  }

  function renderPMS(el, logs, cycles) {
    if(cycles.length<2){el.innerHTML='';return;}
    // Analyze 5 days before each period
    const pmsData = {symptoms:{},moods:{},pain:[],needs:{}};
    cycles.forEach(c => {
      for(let d=-5;d<=-1;d++){
        const date=BloomDB.addDays(c.startDate,d);
        const log=logs.find(l=>l.date===date);
        if(!log)continue;
        [...(log.physicalSymptoms||[]),...(log.emotionalSymptoms||[])].forEach(s=>{pmsData.symptoms[s]=(pmsData.symptoms[s]||0)+1});
        if(log.mood)pmsData.moods[log.mood]=(pmsData.moods[log.mood]||0)+1;
        if(log.painLevel)pmsData.pain.push(log.painLevel);
        (log.needs||[]).forEach(n=>{pmsData.needs[n]=(pmsData.needs[n]||0)+1});
      }
    });
    const topSym=Object.entries(pmsData.symptoms).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const topMoods=Object.entries(pmsData.moods).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const avgPain=pmsData.pain.length>0?(pmsData.pain.reduce((a,b)=>a+b,0)/pmsData.pain.length).toFixed(1):0;
    const topNeeds=Object.entries(pmsData.needs).sort((a,b)=>b[1]-a[1]).slice(0,3);
    if(topSym.length===0){el.innerHTML='';return;}

    el.innerHTML=`
      <div class="section-header" style="margin-top: var(--space-6)"><h2 class="section-header__title">🔮 PMS Pattern Analysis</h2></div>
      <div class="card card--gradient" style="margin-bottom: var(--space-3)">
        <p style="font-size: var(--font-sm); color: var(--text-tertiary); margin-bottom: var(--space-3)">Based on <strong>${cycles.length} cycles</strong>, here's what typically happens 5 days before her period:</p>
        <div style="margin-bottom: var(--space-3)">
          <div style="font-weight: 600; margin-bottom: var(--space-2)">🩹 Top PMS Symptoms</div>
          <div class="chip-group">${topSym.map(([s,c])=>`<span class="chip active" style="pointer-events:none">${s} (${c}×)</span>`).join('')}</div>
        </div>
        <div style="margin-bottom: var(--space-3)">
          <div style="font-weight: 600; margin-bottom: var(--space-2)">😊 Common PMS Moods</div>
          <div class="chip-group">${topMoods.map(([m,c])=>{const o=UI.getMoodObj(m);return`<span class="chip active" style="pointer-events:none">${o.emoji} ${o.label} (${c}×)</span>`}).join('')}</div>
        </div>
        ${avgPain>0?`<div style="margin-bottom: var(--space-3)"><div style="font-weight: 600">🔥 Avg PMS Pain: ${avgPain}/10</div></div>`:''}
        ${topNeeds.length>0?`<div><div style="font-weight: 600; margin-bottom: var(--space-2)">💕 What She Needs During PMS</div>
          <div class="need-tags">${topNeeds.map(([n,c])=>{const t=UI.NEED_TAGS.find(x=>x.id===n);return`<span class="need-tag active" style="pointer-events:none">${t?t.label:n} (${c}×)</span>`}).join('')}</div></div>`:''}
      </div>`;
  }

  function destroy(){charts.forEach(c=>c.destroy());charts=[];}
  return {init,render,destroy};
})();
