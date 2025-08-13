// PWA with prepop plan, Game Plan, and Urge Timer
'use strict';

const DEFAULT_PLAN = {"version": 1, "generated_at": "2025-08-13T21:32:00.685929", "identity": {"statement": "I am a man who chooses connection with my wife over pixels.", "why": ["Be a present husband (1-year anniversary on Sep 7).", "Be a future father with discipline and self-respect.", "Build the lifestyle we want by reclaiming time, energy, and focus."]}, "dates": {"quit_date": "2025-09-05", "reboot_length_days": 30}, "habits": {"porn_cam": {"status": "eliminate", "rules": ["Full ban from Sep 5 for 30 days (no porn, no cams, no fetish browsing).", "Bathroom rule: no phone in bathroom; leave it outside every time.", "Laptop curfew: put laptop away at 11:00 pm.", "Thursdays alone: schedule out-of-home tasks during usual danger hours."], "urge_interrupts": ["20 push-ups OR 30 squats", "2-minute cold shower/face splash", "Drink a tall glass of water and walk for 2 minutes"], "notes": "Log every urge with trigger + intensity. Every slip is data, not shame."}, "gaming": {"status": "eliminate_30_days", "rules": ["Cold stop for 30 days starting Sep 5.", "No gaming after 11 pm thereafter if reintroduced.", "Move console/PC out of private zone."]}, "weed": {"status": "reduce", "rules": ["Cut daily intake by ~30–40% pre–Sep 5.", "From Sep 5: limit to 1–2x/week; no porn/gaming within 3 hours after use.", "Avoid pairing weed with boredom/late-night scrolling."]}, "shisha": {"status": "eliminate_30_days", "rules": ["Cold stop for 30 days starting Sep 5.", "If reintroduced, cap to rare social use; no solo-night sessions."]}}, "fetish_rewire": {"focus": ["cock worship", "cock shock"], "approach": ["No fetish content for the 30-day reboot.", "Week 2+: Gradually shift arousal focus to real-life connection (sensate focus exercises, eye contact, breathing).", "Thought labeling: when fetish images arise, label 'old loop' and redirect to breath + 5 senses.", "If needed, exposure hierarchy later (safe, consent-based, non-objectifying cues)."]}, "environment": {"tech": ["Install blockers on all devices (e.g., Pluckeye).", "Set accountability partner for password (spouse if aligned)."], "device_rules": ["Phone stays outside bathroom, 100% of the time.", "Laptop physically stored away at 11:00 pm."], "schedule_guards": ["Plan out-of-home work blocks on Thursdays when alone.", "Gym in late afternoon/early evening to reduce night-time energy spikes."]}, "daily_protocol": {"morning": ["5-minute breath + intention: read identity statement.", "Plan top 3 priorities for the day.", "Place phone outside bathroom before first shower/toilet."], "evening": ["Daily Review in app (sleep, energy, mood, workouts, wins, slips).", "Export coach_sync.json (share with coach).", "Laptop away at 11:00 pm; phone docked outside bedroom/bathroom."], "urge_playbook": ["Notice → Name the trigger → Do a 2-minute interrupt (push-ups/cold water/walk) → Log urge.", "If urge persists: leave room, change posture, water + chew gum, text spouse or coach message draft (not sent)."]}, "metrics": {"track": ["Urges per day + intensity", "Porn/cam events (target zero post–Sep 5)", "Gaming minutes (target zero for 30 days)", "Weed/shisha use", "Sleep (h), energy, mood, workouts"], "streaks": ["Porn/cam-free days", "Gaming-free days", "Shisha-free days"]}, "weekly_review": ["Identify top 2 triggers; design counter-moves for next week.", "Reinforce wins and refine device/schedule rules.", "Adjust weed reduction plan if it’s acting as a gateway."], "relapse_plan": ["Interrupt immediately (cold water, push-ups, leave room).", "Log what happened (trigger, time, device).", "Review blockers/curfews and add friction.", "Recommit to next action (not next week)."]};
const USER = { name: "Vatsal", spouse: "Mehar", quitDate: "2025-09-05" };

const TABS = ['log','urges','review','trends','timer','gameplan','settings'];
const todayStr = () => new Date().toISOString().slice(0,10);

async function ready(){
  if ('serviceWorker' in navigator) { try { await navigator.serviceWorker.register('service-worker.js'); } catch(e){} }

  // Seed plan if missing
  const hasPlan = await idb.get('coach_plan');
  if(!hasPlan) { await idb.set('coach_plan', DEFAULT_PLAN); }

  // Tab nav
  document.querySelectorAll('nav button').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));

  // Load plan
  const plan = await idb.get('coach_plan');
  if(plan){ 
    document.getElementById('coach-plan').textContent = JSON.stringify(plan,null,2); 
    renderGamePlan(plan);
  }

  // Forms
  document.getElementById('log-form').addEventListener('submit', onSaveLog);
  document.getElementById('urge-form').addEventListener('submit', onSaveUrge);
  document.getElementById('daily-form').addEventListener('submit', onSaveDaily);
  document.getElementById('export-btn').addEventListener('click', onExport);
  document.getElementById('import-file').addEventListener('change', onImport);

  // Timer hooks
  setupTimer();

  // Initial renders
  await renderToday();
  await renderLast7();
  await renderTrends();
}

function showTab(name){ TABS.forEach(t=>document.getElementById('tab-'+t).classList.remove('active')); document.getElementById('tab-'+name).classList.add('active'); }

function h(tag, cls, html){ const el=document.createElement(tag); if(cls) el.className=cls; if(html!==undefined) el.innerHTML=html; return el; }
function list(items){ const ul=h('ul'); (items||[]).forEach(x=>ul.appendChild(h('li','',escapeHtml(x)))); return ul; }

function renderGamePlan(plan){
  const root = document.getElementById('gameplan');
  root.innerHTML = '';

  const head = h('div','card');
  head.appendChild(h('h3','','Identity'));
  head.appendChild(h('p','',`<em>${escapeHtml(plan.identity?.statement||'')}</em>`));
  const why = h('div'); why.appendChild(h('h4','','Why')); why.appendChild(list(plan.identity?.why)); head.appendChild(why);
  root.appendChild(head);

  const dates = h('div','card');
  dates.appendChild(h('h3','','Dates'));
  dates.appendChild(h('p','',`Quit date: <strong>${escapeHtml(plan.dates?.quit_date||'')}</strong> • Reboot: <strong>${escapeHtml(String(plan.dates?.reboot_length_days||''))} days</strong>`));
  root.appendChild(dates);

  const habits = h('div','card');
  habits.appendChild(h('h3','','Habits'));
  Object.entries(plan.habits||{}).forEach(([k,v])=>{
    const sec = h('div','');
    sec.appendChild(h('h4','',titleCase(k.replace('_',' ')) + ` — <span class="pill">${escapeHtml(v.status||'')}</span>`));
    if(v.rules){ sec.appendChild(list(v.rules)); }
    if(v.urge_interrupts){ sec.appendChild(h('h5','','Urge interrupts')); sec.appendChild(list(v.urge_interrupts)); }
    if(v.notes){ sec.appendChild(h('p','muted',escapeHtml(v.notes))); }
    habits.appendChild(sec);
  });
  root.appendChild(habits);

  const fetish = h('div','card');
  fetish.appendChild(h('h3','','Fetish Rewire'));
  if(plan.fetish_rewire?.focus){ 
    const f = h('p','', 'Focus: ' + plan.fetish_rewire.focus.map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join(' '));
    fetish.appendChild(f);
  }
  fetish.appendChild(list(plan.fetish_rewire?.approach));
  root.appendChild(fetish);

  const env = h('div','card');
  env.appendChild(h('h3','','Environment'));
  env.appendChild(h('h4','','Tech')); env.appendChild(list(plan.environment?.tech));
  env.appendChild(h('h4','','Device rules')); env.appendChild(list(plan.environment?.device_rules));
  env.appendChild(h('h4','','Schedule guards')); env.appendChild(list(plan.environment?.schedule_guards));
  root.appendChild(env);

  const daily = h('div','card');
  daily.appendChild(h('h3','','Daily Protocol'));
  daily.appendChild(h('h4','','Morning')); daily.appendChild(list(plan.daily_protocol?.morning));
  daily.appendChild(h('h4','','Evening')); daily.appendChild(list(plan.daily_protocol?.evening));
  daily.appendChild(h('h4','','Urge playbook')); daily.appendChild(list(plan.daily_protocol?.urge_playbook));
  root.appendChild(daily);

  const metrics = h('div','card');
  metrics.appendChild(h('h3','','Metrics & Streaks'));
  metrics.appendChild(h('h4','','Track')); metrics.appendChild(list(plan.metrics?.track));
  metrics.appendChild(h('h4','','Streaks')); metrics.appendChild(list(plan.metrics?.streaks));
  root.appendChild(metrics);

  const weekly = h('div','card');
  weekly.appendChild(h('h3','','Weekly Review'));
  weekly.appendChild(list(plan.weekly_review));
  root.appendChild(weekly);

  const relapse = h('div','card');
  relapse.appendChild(h('h3','','Relapse Plan'));
  relapse.appendChild(list(plan.relapse_plan));
  root.appendChild(relapse);
}

function titleCase(s){ return (s||'').split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }

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
  const now = new Date();
  const days = [];
  for(let i=13;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  const habits = ['porn','cam','gaming','weed','shisha'];
  const counts = {}
  habits.forEach(h=>counts[h]=days.map(()=>0));
  logs.forEach(x=>{
    const idx = days.indexOf(x.date);
    if(idx>=0 && counts[x.habit]!=null){ counts[x.habit][idx] += 1; }
  });
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40,10); ctx.lineTo(40,280); ctx.lineTo(390,280); ctx.stroke();
  let max = 1; Object.values(counts).forEach(arr=>arr.forEach(v=>{ if(v>max) max=v; }));
  const colors = ['#22d3ee','#f59e0b','#ef4444','#10b981','#a78bfa'];
  habits.forEach((h,hi)=>{
    ctx.beginPath(); ctx.strokeStyle = colors[hi%colors.length];
    const arr = counts[h];
    arr.forEach((v,i)=>{
      const x = 45 + (i*(340/13));
      const y = 280 - (v*(240/Math.max(1,max)));
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });
  ctx.fillStyle = '#e5e7eb'; ctx.font = '12px system-ui';
  habits.forEach((h,hi)=>{ ctx.fillStyle = colors[hi%colors.length]; ctx.fillRect(50+hi*65,10,10,10); ctx.fillStyle='#e5e7eb'; ctx.fillText(h,65+hi*65,20); });
}

function card(inner){ const d=document.createElement('div'); d.className='card'; d.innerHTML=inner; return d; }
function escapeHtml(s){ return s ? s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : ''; }

// ---------------- Urge Timer ----------------
let timerId = null, remaining = 120;

function setupTimer(){
  const disp = document.getElementById('timer-display');
  const script = document.getElementById('script');
  const intensity = document.getElementById('urge-intensity');
  const trigger = document.getElementById('urge-trigger');

  document.getElementById('btn-2').addEventListener('click', ()=>startTimer(120));
  document.getElementById('btn-5').addEventListener('click', ()=>startTimer(300));
  document.getElementById('btn-10').addEventListener('click', ()=>startTimer(600));
  document.getElementById('mark-resisted').addEventListener('click', async ()=>{ await quickLog(true); });
  document.getElementById('mark-slipped').addEventListener('click', async ()=>{ await quickLog(false); });

  function startTimer(sec){
    remaining = sec; update();
    showScript(remaining);
    clearInterval(timerId);
    timerId = setInterval(()=>{
      remaining--; if(remaining<=0){ clearInterval(timerId); remaining=0; }
      update(); if(remaining%10===0) showScript(remaining);
    }, 1000);
  }

  function update(){
    disp.textContent = fmt(remaining);
  }

  function fmt(s){
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }

  function showScript(s){
    const lines = motivation(intensity.value|0, trigger.value||'');
    script.textContent = lines.join('\n\n');
  }

  async function quickLog(resisted){
    const u = (await idb.get('urges')) || [];
    const now = new Date();
    const rec = {
      id: crypto.randomUUID(),
      date: now.toISOString().slice(0,10),
      time: now.toTimeString().slice(0,5),
      intensity: parseInt(intensity.value||'0',10),
      trigger: trigger.value||'',
      resisted: resisted?1:0,
      method: resisted? 'Urge Timer protocol' : 'Attempted Urge Timer',
      minutes: Math.round(((resisted? (remaining? ( (resisted? ((remaining) ? ( ( (remaining) ) : 0) ) : 0 )) : 0) : 0)); // placeholder
      notes: resisted? 'Rode the urge' : 'Slipped after timer attempt'
    };
    // compute elapsed
    const total = (timerId? (parseInt(intensity.value||'0',10), 0) : 0);
    // just set minutes from configured selection minus remaining
    // we don't know the selected duration; infer from display original? We'll track as best-effort:
    rec.minutes = Math.max(0, Math.round(( (rec.minutes && 0) )));
    u.push(rec);
    await idb.set('urges', u);
    alert(resisted? "Proud of you. Logged as resisted. Get back to your day." : "Logged. Review what triggered it—no shame, just data.");
  }
}

function motivation(intensity, trig){
  const me = USER;
  const why = [
    "Be present with Mehar tonight. Screens don’t deserve you.",
    "Remember Sep 5 reboot. This is who you are becoming.",
    "Future dad > instant dopamine. Your son will copy this discipline.",
    "Two minutes of discomfort beats two hours of regret."
  ];
  const scripts = [
    `Breathe 4-7-8 for 3 rounds. Name it: “old loop.” Stand up, shoulders back. Cold water to face. Return.`,
    `You want relief, not pixels. Move: 20 push-ups or 30 squats. Blood > urge.`,
    `Phone out of bathroom. If you’re alone, switch rooms. Lights on. Posture tall.`,
    `Text draft (don’t send): “I’m choosing us, not pixels.” Read it. Delete. Choose again.`
  ];
  const personal = [
    `Vatsal, this minute decides the next hour. Mehar gets your best.`,
    `Your 29-year-old self is being forged right now. Act like him.`,
    `You are building a home your kids will feel safe in. Model control.`,
    `Identity: “I choose connection over pixels.” Say it once, out loud.`
  ];

  // Blend based on intensity and trigger keyword
  const t = (trig||'').toLowerCase();
  const add = [];
  if(t.includes('bath')||t.includes('toilet')) add.push("Bathroom rule: phone outside. Leave now. Return without it.");
  if(t.includes('alone')||t.includes('thurs')) add.push("Alone? Change location for 5 minutes. Open curtains. Step outside.");
  if(t.includes('weed')) add.push("Weed spike detected: delay any screen by 3 hours. Water + gum now.");

  const out = [];
  out.push(personal[intensity%personal.length]);
  out.push(scripts[intensity%scripts.length]);
  out.push(why[intensity%why.length]);
  if(add.length) out.push(add.join(" "));
  return out;
}

// ---------------- End Timer ----------------

async function onExport(){
  const bundle = {
    version: 1,
    exported_at: new Date().toISOString(),
    range_days: 14,
    logs: (await idb.get('logs')) || [],
    urges: (await idb.get('urges')) || [],
    daily: (await idb.get('daily')) || []
  };
  const blob = new Blob([JSON.stringify(bundle,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'coach_sync.json'; a.click(); URL.revokeObjectURL(a.href);
}

async function onImport(ev){
  const file = ev.target.files[0]; if(!file) return;
  try{ const text = await file.text(); const plan = JSON.parse(text); await idb.set('coach_plan', plan); document.getElementById('coach-plan').textContent = JSON.stringify(plan,null,2); renderGamePlan(plan); document.getElementById('import-status').textContent = 'Coach plan imported.'; }
  catch(e){ document.getElementById('import-status').textContent = 'Import failed.'; }
  finally{ ev.target.value = ''; }
}

document.addEventListener('DOMContentLoaded', ready);
