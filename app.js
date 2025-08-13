// Minimal PWA app with IndexedDB storage via idb helper
'use strict';

const TABS = ['log','urges','review','trends','settings'];
const todayStr = () => new Date().toISOString().slice(0,10);

async function ready(){
  // PWA: register service worker
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('service-worker.js'); } catch(e){}
  }

  // tab nav
  document.querySelectorAll('nav button').forEach(btn=>{
    btn.addEventListener('click',()=>showTab(btn.dataset.tab));
  });

  // load coach plan
  const plan = await idb.get('coach_plan');
  if(plan){ document.getElementById('coach-plan').textContent = JSON.stringify(plan,null,2); }

  // forms
  document.getElementById('log-form').addEventListener('submit', onSaveLog);
  document.getElementById('urge-form').addEventListener('submit', onSaveUrge);
  document.getElementById('daily-form').addEventListener('submit', onSaveDaily);
  document.getElementById('export-btn').addEventListener('click', onExport);
  document.getElementById('import-file').addEventListener('change', onImport);

  // initial render
  await renderToday();
  await renderLast7();
  await renderTrends();
}

function showTab(name){
  TABS.forEach(t=>document.getElementById('tab-'+t).classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
}

async function onSaveLog(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const rec = Object.fromEntries(fd.entries());
  rec.date = todayStr();
  rec.duration_min = parseInt(rec.duration_min||'0',10);
  rec.intensity = parseInt(rec.intensity||'0',10);
  rec.acted = fd.get('acted') ? 1 : 0;
  rec.start_time = rec.start_time || '';
  rec.end_time = rec.end_time || '';
  rec.notes = rec.notes || '';
  const logs = (await idb.get('logs')) || [];
  logs.push({...rec, id: crypto.randomUUID()});
  await idb.set('logs', logs);
  e.target.reset();
  await renderToday();
}

async function onSaveUrge(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const rec = Object.fromEntries(fd.entries());
  rec.date = todayStr();
  rec.intensity = parseInt(rec.intensity||'0',10);
  rec.resisted = fd.get('resisted') ? 1 : 0;
  rec.minutes = parseInt(rec.minutes||'0',10);
  const urges = (await idb.get('urges')) || [];
  urges.push({...rec, id: crypto.randomUUID()});
  await idb.set('urges', urges);
  e.target.reset();
  await renderToday();
}

async function onSaveDaily(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const rec = Object.fromEntries(fd.entries());
  rec.date = todayStr();
  rec.sleep_hours = parseFloat(rec.sleep_hours||'0');
  rec.energy = parseInt(rec.energy||'0',10);
  rec.mood = parseInt(rec.mood||'0',10);
  rec.workouts = parseInt(rec.workouts||'0',10);
  await upsertDaily(rec);
  await renderLast7();
}

async function upsertDaily(rec){
  const daily = (await idb.get('daily')) || [];
  const idx = daily.findIndex(d=>d.date===rec.date);
  if(idx>=0) daily[idx] = rec; else daily.push(rec);
  await idb.set('daily', daily);
}

async function renderToday(){
  const logs = (await idb.get('logs')) || [];
  const urges = (await idb.get('urges')) || [];
  const d = todayStr();

  const tl = document.getElementById('today-logs');
  tl.innerHTML = '';
  logs.filter(x=>x.date===d).sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')).forEach(x=>{
    const el = card(`
      <strong>${x.habit}</strong>
      <div class="meta">${x.start_time||'--:--'} → ${x.end_time||'--:--'} • ${x.duration_min||0} min • intensity ${x.intensity||0} • ${x.acted? 'acted':'urge only'}</div>
      <div>${escapeHtml(x.trigger||'')}</div>
      <div class="meta">${escapeHtml(x.context||'')} • ${escapeHtml(x.location||'')} • ${escapeHtml(x.device||'')}</div>
      ${x.notes? `<div>${escapeHtml(x.notes)}</div>`:''}
    `);
    tl.appendChild(el);
  });

  const tu = document.getElementById('today-urges');
  tu.innerHTML = '';
  urges.filter(x=>x.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||'')).forEach(x=>{
    const el = card(`
      <strong>urge @ ${x.time||'--:--'}</strong>
      <div class="meta">intensity ${x.intensity||0} • ${x.minutes||0} min • ${x.resisted? 'resisted':'gave in'}</div>
      <div>${escapeHtml(x.trigger||'')}</div>
      ${x.method? `<div class="meta">helped: ${escapeHtml(x.method)}</div>`:''}
      ${x.notes? `<div>${escapeHtml(x.notes)}</div>`:''}
    `);
    tu.appendChild(el);
  });
}

async function renderLast7(){
  const daily = (await idb.get('daily')) || [];
  const div = document.getElementById('last7');
  div.innerHTML='';
  daily.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).forEach(d=>{
    div.appendChild(card(`
      <strong>${d.date}</strong>
      <div class="meta">sleep ${d.sleep_hours}h • energy ${d.energy} • mood ${d.mood} • workouts ${d.workouts}</div>
      ${d.wins? `<div>${escapeHtml(d.wins)}</div>`:''}
      ${d.slips? `<div class="meta">slips: ${escapeHtml(d.slips)}</div>`:''}
    `));
  });
}

async function renderTrends(){
  const logs = (await idb.get('logs')) || [];
  // Count events per day per habit over last 14 days
  const now = new Date();
  const days = [];
  for(let i=13;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  const habits = ['porn','cam','gaming','weed','shisha'];
  const counts = {};
  habits.forEach(h=>counts[h]=days.map(()=>0));
  logs.forEach(x=>{
    const idx = days.indexOf(x.date);
    if(idx>=0 && counts[x.habit]!=null){ counts[x.habit][idx] += 1; }
  });
  // simple SVG line chart
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // axes
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,280); ctx.lineTo(390,280); ctx.stroke();
  // determine max
  let max = 1;
  Object.values(counts).forEach(arr=>arr.forEach(v=>{ if(v>max) max=v; }));
  const colors = ['#22d3ee','#f59e0b','#ef4444','#10b981','#a78bfa'];
  habits.forEach((h,hi)=>{
    ctx.beginPath();
    ctx.strokeStyle = colors[hi%colors.length];
    arr = counts[h];
    arr.forEach((v,i)=>{
      const x = 45 + (i*(340/13));
      const y = 280 - (v*(240/Math.max(1,max)));
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });
  // legend
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '12px system-ui';
  habits.forEach((h,hi)=>{
    ctx.fillStyle = colors[hi%colors.length];
    ctx.fillRect(50+hi*65, 10, 10, 10);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(h, 65+hi*65, 20);
  });
}

function card(inner){ const d=document.createElement('div'); d.className='card'; d.innerHTML=inner; return d; }
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function onExport(){
  const rangeDays = 14;
  const exported_at = new Date().toISOString();
  const logs = (await idb.get('logs')) || [];
  const urges = (await idb.get('urges')) || [];
  const daily = (await idb.get('daily')) || [];
  const bundle = {version:1, exported_at, range_days:rangeDays, logs, urges, daily};
  const blob = new Blob([JSON.stringify(bundle,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'coach_sync.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function onImport(ev){
  const file = ev.target.files[0];
  if(!file) return;
  try{
    const text = await file.text();
    const plan = JSON.parse(text);
    await idb.set('coach_plan', plan);
    document.getElementById('coach-plan').textContent = JSON.stringify(plan,null,2);
    document.getElementById('import-status').textContent = 'Coach plan imported.';
  }catch(e){
    document.getElementById('import-status').textContent = 'Import failed.';
  }finally{
    ev.target.value = '';
  }
}

document.addEventListener('DOMContentLoaded', ready);
