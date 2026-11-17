/* ===================== STUDENT PORTAL ===================== */
function sHome(){const u=me();const cs=coursesOf(u.id);const unread=unreadFor(u.id);
 // continue where you left off
 let last=null;Object.entries(db.progress[u.id]||{}).forEach(([mid,p])=>{if(M(mid)&&modPct(u.id,mid)<100&&(!last||p.touched>last.p.touched))last={mid,p}});
 if(!last){for(const c of cs){const nx=enrolledMods(u.id,c.id).find(m=>modStatus(u.id,m)!=='done'&&modStatus(u.id,m)!=='locked');if(nx){last={mid:nx,p:prog(u.id,nx)||{pos:0}};break}}}
 const meets=db.meetings.filter(m=>m.attendees.includes(u.id)&&m.status==='scheduled'&&m.at>Date.now()).sort((a,b)=>a.at-b.at);
 const fb=[...db.reflections.filter(r=>r.userId===u.id&&r.thread.some(t=>t.by!==u.id)).map(r=>({at:r.thread.filter(t=>t.by!==u.id).slice(-1)[0].at,from:r.thread.filter(t=>t.by!==u.id).slice(-1)[0].by,text:r.thread.filter(t=>t.by!==u.id).slice(-1)[0].text,ctx:'Reflection · M'+M(r.moduleId).num,unread:r.unread,link:'#/student/journal'})),...db.notes.filter(n=>n.to===u.id).map(n=>({at:n.at,from:n.from,text:n.text,ctx:'Note',unread:!n.read,link:'#/student/journal'}))].sort((a,b)=>b.at-a.at).slice(0,4);
 const allMods=cs.flatMap(c=>enrolledMods(u.id,c.id));const done=allMods.filter(m=>modStatus(u.id,m)==='done').length;const overall=allMods.length?Math.round(allMods.reduce((a,m)=>a+modPct(u.id,m),0)/allMods.length):0;
 return `<div class="pagehead"><div><div class="eyebrow">Welcome back</div><h1>Good to see you, ${esc(u.name.split(' ')[0])}.</h1><p class="muted" style="margin:0">${esc(u.credential)} · ${esc(u.setting||'')}</p></div></div>
 <div class="split">
  <div class="grid">
   ${last?`<div class="card" style="background:linear-gradient(115deg,#1d4436,#336e54);color:#fff;border:0"><div class="eyebrow" style="color:#e4c68b">Continue where you left off</div>
    <h2 style="color:#fff">${esc(M(last.mid).title)}</h2><p style="color:#d6e6da;margin-bottom:12px">Next: ${esc(stepsOf(M(last.mid))[Math.min(last.p.pos||0,stepsOf(M(last.mid)).length-1)].label)}</p>
    <div class="bar" style="background:#ffffff30;margin-bottom:14px"><i style="width:${modPct(u.id,last.mid)}%;background:#e4c68b"></i></div>
    <a class="btn" style="background:#fff;color:var(--green);border-color:#fff" href="#/student/module/${last.mid}">Resume module →</a></div>`:`<div class="card tint"><h3>You’re all caught up</h3><p class="muted">No modules in progress. Check with your supervisor about your next assignment.</p></div>`}
   <div class="card"><div class="cardhead"><h3>My courses</h3></div>
    ${cs.length?cs.map(c=>{const p=coursePct(u.id,c.id),e=db.enrollments.find(e=>e.userId===u.id&&e.courseId===c.id);return `<a href="#/student/course/${c.id}" style="text-decoration:none;color:inherit"><div class="modrow"><div class="modnum">${p===100?'✓':esc(c.title[0])}</div><div style="flex:1;min-width:0"><b>${esc(c.title)}</b><div class="small muted">${enrolledMods(u.id,c.id).length} modules · due ${fmtD(e.due)} · ${esc(c.hoursLabel)}</div><div class="mt" style="margin-top:8px">${bar(p)}</div></div><span class="small"><b>${p}%</b></span></div></a>`}).join(''):'<div class="empty">No courses assigned yet.</div>'}
   </div>
  </div>
  <div class="grid" style="align-content:start">
   <div class="card flex" style="gap:16px">${ring(overall)}<div><b>${done} of ${allMods.length} modules complete</b><div class="small muted">Average knowledge-check score: ${avgQuiz(u.id)??'—'}${avgQuiz(u.id)!==null?'%':''}</div><a class="small" href="#/student/progress">View my progress →</a></div></div>
   <div class="card"><div class="cardhead"><h3>Instructor feedback</h3>${unread?`<span class="tag gold">${unread} new</span>`:''}</div>
    ${fb.length?`<div class="list">${fb.map(f=>`<a class="li" href="${f.link}" style="text-decoration:none;color:inherit"><span class="dot ${f.unread?'gold':''}"></span><div class="grow"><div class="small"><b>${esc(U(f.from).name)}</b> · <span class="muted">${esc(f.ctx)} · ${rel(f.at)}</span></div><div class="small" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(f.text)}</div></div></a>`).join('')}</div>`:'<div class="small muted">Feedback on your reflections will appear here.</div>'}
   </div>
   <div class="card"><div class="cardhead"><h3>Upcoming supervision</h3></div>
    ${meets.length?`<div class="list">${meets.slice(0,3).map(m=>`<div class="li"><span class="dot ${m.type==='group'?'gold':''}"></span><div class="grow"><b class="small">${fmtDT(m.at)}</b><div class="small muted">${m.type==='group'?'Group':'Individual'} · ${m.mins} min · with ${esc(U(m.supervisorId).name)}</div><div class="small">${esc(m.agenda)}</div></div></div>`).join('')}</div>`:'<div class="small muted">No meetings scheduled.</div>'}
    <p class="tiny muted mt" style="margin-bottom:0">Supervision meetings are scheduled and recorded by your supervisor. Online course activity is never counted as supervision hours.</p>
   </div>
  </div>
 </div>`}

function sCourse(cid){const u=me(),c=C(cid);if(!c||!db.enrollments.some(e=>e.userId===u.id&&e.courseId===cid))return denied('You are not enrolled in this course.');
 const mods=enrolledMods(u.id,cid);const p=coursePct(u.id,cid);
 return `<div class="crumbs"><a href="#/student">Home</a> / Course</div>
 <div class="pagehead"><div><div class="eyebrow">Course</div><h1>${esc(c.title)}</h1><p class="muted" style="max-width:640px;margin:0">${esc(c.desc)}</p></div>${ring(p)}</div>
 <div class="notice mb"><b>Educational demonstration.</b> ${esc(c.hoursLabel)}. This course is not approved for continuing education and does not count toward supervised clinical experience or practicum hours.</div>
 ${mods.map(mid=>{const m=M(mid),s=modStatus(u.id,mid),pc=modPct(u.id,mid),pp=prog(u.id,mid);const b=best(pp);
  return `<div class="modrow ${s==='locked'?'locked':''} ${s==='done'?'done':''}"><div class="modnum">${s==='done'?'✓':m.num}</div><div style="flex:1;min-width:0"><div class="flex wrap" style="gap:8px"><b>${esc(m.title)}</b>${statusTag(s)}</div>
   <div class="small muted">${esc(m.summary)}</div><div class="small muted" style="margin-top:4px">${m.lessons.length} lessons${m.scenario?' · case simulation':''} · ${m.quiz.length}-question check${b!==null?' · best '+b+'%':''} · ~${m.minutes} min</div>
   ${s==='locked'?`<div class="small" style="color:var(--amber);margin-top:4px">Prerequisite: complete “${esc(M(m.prereq).title)}” first.</div>`:`<div style="margin-top:8px;max-width:420px">${bar(pc)}</div>`}</div>
   ${s==='locked'?'':`<a class="btn sm ${s==='done'?'alt':''}" href="#/student/module/${mid}">${s==='done'?'Review':s==='in'?'Resume':'Start'}</a>`}</div>`}).join('')}`}

/* ---------- module player ---------- */
function sModule(mid,stepArg){const u=me(),m=M(mid);if(!m)return denied('Module not found.');
 const enrolled=db.enrollments.some(e=>e.userId===u.id&&enrolledMods(u.id,e.courseId).includes(mid));if(!enrolled)return denied('This module isn’t assigned to you.');
 if(modStatus(u.id,mid)==='locked')return denied('Complete the prerequisite module first: '+M(m.prereq).title);
 const p=prog(u.id,mid,true),st=stepsOf(m);let pos=stepArg!==undefined?+stepArg:p.pos||0;pos=Math.max(0,Math.min(pos,st.length-1));
 if(p.pos!==pos||!p.touched){p.pos=pos;p.touched=Date.now();save()}
 const s=st[pos];
 return `<div class="crumbs"><a href="#/student">Home</a> / <a href="#/student/course/${m.courseId}">${esc(C(m.courseId).title)}</a> / Module ${m.num}</div>
 <div class="pagehead"><div><div class="eyebrow">Module ${m.num} · ${esc(m.category)}</div><h1>${esc(m.title)}</h1></div><div style="min-width:200px"><div class="flex between small"><span class="muted">Module progress</span><b>${modPct(u.id,mid)}%</b></div>${bar(modPct(u.id,mid))}<div class="tiny muted" style="margin-top:4px">Saved automatically · resume anytime</div></div></div>
 <div class="player"><nav class="steps" aria-label="Module steps">${st.map((x,i)=>`<button class="step ${i===pos?'on':''} ${p.done[x.key]?'done':''}" data-a="goStep" data-m="${mid}" data-i="${i}"><span class="sdot">${p.done[x.key]?'✓':i+1}</span><span class="lbl">${esc(x.label)}</span></button>`).join('')}</nav>
 <section class="stage">${renderStep(u,m,p,s,pos,st)}</section></div>`}

function stepFoot(m,pos,st,canNext,label){return `<div class="stagefoot"><button class="btn alt sm" data-a="goStep" data-m="${m.id}" data-i="${pos-1}" ${pos===0?'disabled':''}>← Back</button>
 ${pos<st.length-1?`<button class="btn" data-a="complete" data-m="${m.id}" data-k="${st[pos].key}" ${canNext?'':'disabled'}>${label||'Mark complete & continue →'}</button>`:''}</div>`}

function renderStep(u,m,p,s,pos,st){
 if(s.kind==='ov')return `<div class="eyebrow">Overview</div><h2>What you’ll learn</h2><p class="muted">${esc(m.summary)}</p>
  <ul class="lessonbody">${m.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul>
  <div class="grid g3 mt">${[['Lessons',m.lessons.length],['Case simulation',m.scenario?'1 branching':'—'],['Knowledge check',m.quiz.length+' questions · pass '+passOf(m.id)+'%']].map(x=>`<div class="card flat cream"><div class="small muted">${x[0]}</div><b>${x[1]}</b></div>`).join('')}</div>
  <div class="notice green mt">Estimated time ~${m.minutes} minutes (illustrative). Your progress saves automatically after each step, so you can stop and resume on any device using this browser.</div>
  ${stepFoot(m,pos,st,true,'Begin module →')}`;
 if(s.kind==='lesson'){const l=m.lessons[s.i];return renderLesson(u,m,p,l,s,pos,st)}
 if(s.kind==='sim')return renderSim(u,m,p,pos,st);
 if(s.kind==='quiz')return renderQuiz(u,m,p,pos,st);
 if(s.kind==='ref')return renderRefl(u,m,p,pos,st)}

function renderLesson(u,m,p,l,s,pos,st){const k=s.key,head=`<div class="eyebrow">Lesson ${s.i+1} of ${m.lessons.length}${l.type==='video'?' · Video':l.type==='sort'||l.type==='sequence'||l.type==='rewrite'?' · Interactive exercise':l.type==='worksheet'?' · Worksheet':l.type==='file'?' · Instructor resource':''}</div><h2>${esc(l.title)}</h2>`;
 if(l.type==='text')return head+`<div class="lessonbody">${l.html}</div>`+stepFoot(m,pos,st,true);
 if(l.type==='video')return head+`<div class="video"><div><div class="play">▶</div><b>Video placeholder</b><div class="small" style="opacity:.8">${esc(l.duration||'')} · ${l.fileName?esc(l.fileName)+' (uploaded in demo)':'Instructor video will stream here in production'}</div></div></div><div class="lessonbody">${l.html||''}</div>`+stepFoot(m,pos,st,true);
 if(l.type==='file')return head+`<div class="card flat cream flex"><div style="font-size:28px">📄</div><div class="grow"><b>${esc(l.fileName||'No file attached')}</b><div class="small muted">${l.fileSize?Math.round(l.fileSize/1024)+' KB · ':''}Uploaded by instructor. Demo stores the file name only.</div></div></div><div class="lessonbody mt">${l.html||''}</div>`+stepFoot(m,pos,st,true);
 if(l.type==='worksheet')return head+`<p class="muted">${esc(l.intro)}</p><div class="card flat cream">${l.sections.map(x=>`<h4>${esc(x.h)}</h4><ul class="small" style="margin-top:0">${x.p.filter(Boolean).map(q=>`<li>${esc(q)}</li>`).join('')}</ul>`).join('')}</div>
  <div class="btnrow mt"><button class="btn alt" data-a="worksheet" data-m="${m.id}" data-i="${s.i}">⬇ Download printable worksheet</button></div><p class="tiny muted mt">Don’t write identifying client information on worksheets.</p>`+stepFoot(m,pos,st,true);
 if(l.type==='sort'){const ex=ui.ex[m.id+k]=ui.ex[m.id+k]||{sel:null,placed:{},checked:false};const solved=p.done[k];
  const unplaced=l.items.map((x,i)=>i).filter(i=>ex.placed[i]===undefined);
  return head+`<p class="lessonbody">${l.intro}</p>
  ${solved&&!ex.retry&&!Object.keys(ex.placed).length?`<div class="notice green">✓ You completed this exercise. <button class="btn xs alt" data-a="exReset" data-m="${m.id}" data-k="${k}">Try again</button></div>`:`
  <div class="chips">${unplaced.map(i=>`<button class="chipbtn ${ex.sel===i?'sel':''}" data-a="exSel" data-m="${m.id}" data-k="${k}" data-i="${i}">${esc(l.items[i].t)}</button>`).join('')||'<span class="small muted">All items placed.</span>'}</div>
  <div class="buckets">${l.buckets.map((b,bi)=>`<button class="bucket ${ex.sel!==null?'armed':''}" data-a="exPlace" data-m="${m.id}" data-k="${k}" data-b="${bi}"><h4>${esc(b)}</h4>${Object.entries(ex.placed).filter(([i,v])=>v===bi).map(([i])=>`<span class="placed ${ex.checked?(l.items[i].b===bi?'ok':'no'):''}">${ex.checked?(l.items[i].b===bi?'✓ ':'✗ '):''}${esc(l.items[i].t)}</span>`).join('')}</button>`).join('')}</div>
  <div class="btnrow mt">${!unplaced.length&&!ex.checked?`<button class="btn" data-a="exCheck" data-m="${m.id}" data-k="${k}">Check answers</button>`:''}${ex.checked&&l.items.some((it,i)=>ex.placed[i]!==it.b)?`<span class="small" style="color:var(--red)">${l.items.filter((it,i)=>ex.placed[i]!==it.b).length} to reconsider.</span><button class="btn alt sm" data-a="exRetry" data-m="${m.id}" data-k="${k}">Move incorrect items back</button>`:''}${ex.checked&&l.items.every((it,i)=>ex.placed[i]===it.b)?'<span class="tag">✓ All correct</span>':''}</div>`}`+stepFoot(m,pos,st,solved||(ex.checked&&l.items.every((it,i)=>ex.placed[i]===it.b)),'Continue →')}
 if(l.type==='sequence'){const ex=ui.ex[m.id+k]=ui.ex[m.id+k]||{order:[3,0,5,1,4,2].filter(i=>i<l.items.length).concat(l.items.map((x,i)=>i)).filter((v,i,a)=>a.indexOf(v)===i),checked:false};const ok=ex.order.every((v,i)=>v===l.order[i]);
  return head+`<p class="lessonbody">${l.intro}</p>${ex.order.map((ii,pi)=>`<div class="seqitem" style="${ex.checked?(l.order[pi]===ii?'border-color:#9fc5aa;background:#f1f8f2':'border-color:#e2b3ab;background:#fbf0ee'):''}"><span class="n">${pi+1}</span><span class="grow">${esc(l.items[ii])}</span><button class="btn xs alt" aria-label="Move up" data-a="seqMove" data-m="${m.id}" data-k="${k}" data-i="${pi}" data-d="-1" ${pi===0?'disabled':''}>↑</button><button class="btn xs alt" aria-label="Move down" data-a="seqMove" data-m="${m.id}" data-k="${k}" data-i="${pi}" data-d="1" ${pi===ex.order.length-1?'disabled':''}>↓</button></div>`).join('')}
  <div class="btnrow mt"><button class="btn" data-a="seqCheck" data-m="${m.id}" data-k="${k}">Check order</button>${ex.checked?(ok?'<span class="tag">✓ Nice sequence</span>':'<span class="small" style="color:var(--red)">Not quite. Adjust the highlighted items.</span>'):''}</div>
  ${ex.checked&&ok&&l.explain?`<div class="keypoint">${esc(l.explain)}</div>`:''}`+stepFoot(m,pos,st,p.done[k]||(ex.checked&&ok),'Continue →')}
 if(l.type==='rewrite'){const show=p.ex&&p.ex[k+'show'];return head+`<p class="lessonbody">${esc(l.prompt)}</p><label class="f">Original note (fictional)</label><div class="quote" style="background:var(--red2);border-color:#efc9c2">${esc(l.poor)}</div>
  <div class="field mt"><label class="f" for="rw">Your rewrite (saved as you type)</label><textarea class="input" id="rw" data-in="rewrite" data-m="${m.id}" data-k="${k}" style="min-height:140px" placeholder="D: … A: … P: …">${esc((p.ex||{})[k]||'')}</textarea></div>
  <button class="btn alt" data-a="rwShow" data-m="${m.id}" data-k="${k}">${show?'Hide':'Compare with'} model note</button>${show?`<div class="quote mt" style="background:#f1f8f2;border-color:#bcdbc4">${esc(l.model)}</div><p class="small muted mt">Notice what the model does: it quotes the client, describes observable behavior, links to a goal, and gives a concrete plan.</p>`:''}`+stepFoot(m,pos,st,show||p.done[k],'Continue →')}
 return head+`<div class="lessonbody">${l.html||''}</div>`+stepFoot(m,pos,st,true)}

/* ---- branching simulation ---- */
function renderSim(u,m,p,pos,st){const sc=m.scenario;const sim=p.sim&&p.sim.path?p.sim:{path:[],done:false};const nodes=sc.nodes;
 let html=`<div class="eyebrow">Case simulation · branching</div><h2>${esc(sc.title)}</h2><div class="notice blue mb small">Fictional scenario for practice. Choose how you’d respond. Each choice changes what happens next, and you’ll see feedback right away.</div>
 <div class="sim"><div class="bubble narr">${sc.setup}</div>`;
 const line=l=>l.w==='client'?`<div class="bubble client"><div class="tiny muted" style="margin-bottom:2px">${esc(sc.client)}</div>${esc(l.t)}</div>`:`<div class="bubble narr">${esc(l.t)}</div>`;
 let cur=sc.start;sim.path.forEach(st2=>{const n=nodes[st2.n],ch=n.choices[st2.c];html+=n.lines.map(line).join('')+`<div class="bubble me">${esc(ch.t)}</div><div class="bubble fb ${ch.q}"><b>${ch.q==='good'?'Strong choice.':ch.q==='mixed'?'Partly effective.':'Risky choice.'}</b> ${esc(ch.fb)}</div>`;cur=ch.next});
 if(cur&&!sim.done){const n=nodes[cur];html+=n.lines.map(line).join('')+`<div class="choices">${n.choices.map((c,i)=>`<button class="choice" data-a="simChoose" data-m="${m.id}" data-n="${cur}" data-c="${i}">${esc(c.t)}</button>`).join('')}</div>`}
 html+='</div>';
 if(sim.done){const sc2=sim.score,mx=sim.max;const tier=sc2/mx>=.85?['Skillful handling','You consistently chose responses that protected the client and the relationship.']:sc2/mx>=.5?['Mixed outcome','Some choices worked well. Replay to see how other paths unfold.']:['Learning opportunity','Several choices increased risk. Replay and compare the feedback.'];
  html+=`<div class="card tint mt"><div class="flex between wrap"><div><div class="eyebrow">Outcome</div><h3>${tier[0]}</h3><p class="small" style="margin:0">${tier[1]}</p></div><div class="meter" title="${sc2}/${mx}">${Array.from({length:mx/2},(x,i)=>`<i class="${i<Math.round(sc2/2)?'on':''}"></i>`).join('')}</div></div>
  <div class="btnrow mt"><button class="btn alt sm" data-a="simReset" data-m="${m.id}">↺ Replay scenario</button></div></div>`}
 return html+stepFoot(m,pos,st,sim.done||p.done.sim,'Continue →')}

/* ---- quiz ---- */
function renderQuiz(u,m,p,pos,st){const pass=passOf(m.id),q=ui.quiz[m.id];const last=p.attempts[p.attempts.length-1];
 const head=`<div class="eyebrow">Knowledge check · ${m.quiz.length} questions · passing score ${pass}%</div><h2>Check your understanding</h2>`;
 if(q&&q.submitted){const sc=q.score;return head+`<div class="card ${sc>=pass?'tint':''} flex between wrap mb"><div><h3 style="margin:0">${sc>=pass?'Passed ✓':'Not yet passing'} · ${sc}%</h3><div class="small muted">${sc>=pass?'Nice work. Review the explanations below.':'Review the explanations, then try again. Your supervisor can see your attempts.'}</div></div>${sc>=pass?'':`<button class="btn" data-a="quizRetake" data-m="${m.id}">Retake</button>`}</div>
  ${m.quiz.map((x,i)=>`<div class="qcard"><b>${i+1}. ${esc(x.q)}</b>${x.o.map((o,j)=>`<div class="opt ${j===x.a?'right':q.ans[i]===j?'wrong':''}"><span class="l">${String.fromCharCode(65+j)}</span><span>${esc(o)}</span></div>`).join('')}<div class="explain">${q.ans[i]===x.a?'✓ Correct. ':'✗ '}${esc(x.why)}</div></div>`).join('')}`+stepFoot(m,pos,st,sc>=pass||p.done.quiz,'Continue →')}
 if(!q&&p.done.quiz)return head+`<div class="card tint mb"><h3 style="margin:0">Passed ✓ · best score ${best(p)}%</h3><div class="small muted">${p.attempts.length} attempt${p.attempts.length>1?'s':''}. You can retake it for practice.</div><div class="btnrow mt"><button class="btn alt sm" data-a="quizRetake" data-m="${m.id}">Practice again</button></div></div>`+stepFoot(m,pos,st,true,'Continue →');
 const ans=(q&&q.ans)||{};ui.quiz[m.id]={ans,submitted:false};
 return head+(last?`<div class="notice mb small">Previous attempt: ${last.score}% (${rel(last.at)}). ${p.attempts.length} attempt${p.attempts.length>1?'s':''} so far.</div>`:'')+
 m.quiz.map((x,i)=>`<div class="qcard"><b>${i+1}. ${esc(x.q)}</b>${x.o.map((o,j)=>`<button class="opt ${ans[i]===j?'sel':''}" data-a="quizPick" data-m="${m.id}" data-q="${i}" data-o="${j}"><span class="l">${String.fromCharCode(65+j)}</span><span>${esc(o)}</span></button>`).join('')}</div>`).join('')+
 `<div class="btnrow"><button class="btn" data-a="quizSubmit" data-m="${m.id}" ${Object.keys(ans).length<m.quiz.length?'disabled':''}>Submit answers (${Object.keys(ans).length}/${m.quiz.length})</button></div>`+stepFoot(m,pos,st,false)}

/* ---- reflection ---- */
function renderRefl(u,m,p,pos,st){const r=db.reflections.find(r=>r.userId===u.id&&r.moduleId===m.id);const head=`<div class="eyebrow">Reflection journal</div><h2>Reflect & submit</h2><div class="lessonbody"><p>${m.reflection}</p></div>`;
 const allDone=st.every(s=>s.key==='ref'||p.done[s.key]);
 if(r&&r.status!=='revise'){if(r.unread){r.unread=false;save()}return head+`<div class="flex between wrap mb"><span class="small muted">Submitted ${fmtDY(r.at)}</span>${r.status==='awaiting'?'<span class="tag gold">Awaiting instructor feedback</span>':'<span class="tag">Feedback received</span>'}</div><div class="quote">${esc(r.text)}</div>${thread(r,u)}${replyBox(r)}
  ${modPct(u.id,m.id)>=100?`<div class="card tint mt flex between wrap"><div><h3 style="margin:0">Module complete 🎉</h3><div class="small muted">Nice work. Your supervisor can see your progress.</div></div><a class="btn" href="#/student/course/${m.courseId}">Back to course</a></div>`:`<div class="notice mt">Finish the remaining steps (${st.filter(s=>!p.done[s.key]).map(s=>esc(s.label)).join(', ')}) to complete this module.</div>`}
  <div class="stagefoot"><button class="btn alt sm" data-a="goStep" data-m="${m.id}" data-i="${pos-1}">← Back</button></div>`}
 const draft=(p.ex||{}).refDraft??(r?r.text:'');
 return head+(r&&r.status==='revise'?`<div class="notice mb"><b>Revision requested.</b> See your instructor’s note below, then update and resubmit.</div>${thread(r,u)}`:'')+
 `<div class="notice red small mb"><b>Privacy reminder:</b> don’t include names, dates of birth, contact details, addresses, or other identifying client information. This demo checks for common identifiers before you submit.</div>
 <div class="field"><label class="f" for="refl">Your reflection</label><textarea class="input" id="refl" data-in="refl" data-m="${m.id}" style="min-height:170px" placeholder="Write a few thoughtful paragraphs…">${esc(draft)}</textarea><div class="flex between tiny muted" style="margin-top:4px"><span id="piiwarn"></span><span id="wc">${draft.trim()?draft.trim().split(/\s+/).length:0} words</span></div></div>
 <div class="btnrow"><button class="btn" data-a="reflSubmit" data-m="${m.id}">${r?'Resubmit for review':'Submit to instructor'}</button><span class="small muted">Draft saves automatically.</span></div>
 ${!allDone?`<div class="notice mt small">You can submit now. To complete the module, also finish: ${st.filter(s=>s.key!=='ref'&&!p.done[s.key]).map(s=>esc(s.label)).join(', ')}.</div>`:''}
 <div class="stagefoot"><button class="btn alt sm" data-a="goStep" data-m="${m.id}" data-i="${pos-1}">← Back</button></div>`}
function thread(r,viewer){if(!r.thread.length)return'';return `<div class="thread">${r.thread.map(t=>`<div class="msg"><div class="meta"><b>${esc(U(t.by).name)}</b> · ${rel(t.at)}${t.kind==='revise'?' · <span class="tag amber">revision requested</span>':''}</div><div class="small">${esc(t.text)}</div></div>`).join('')}</div>`}
function replyBox(r){if(!r.thread.length)return'';return `<form class="flex mt" data-f="reply" data-r="${r.id}" style="gap:8px"><input class="input" name="t" placeholder="Reply to your instructor…" aria-label="Reply"><button class="btn sm">Send</button></form>`}

/* ---- progress & journal ---- */
function sProgress(){const u=me();const cs=coursesOf(u.id);
 const rows=cs.flatMap(c=>enrolledMods(u.id,c.id).map(mid=>{const m=M(mid),p=prog(u.id,mid);return {m,p,s:modStatus(u.id,mid),pc:modPct(u.id,mid)}}));
 const atts=allAttempts(u.id).sort((a,b)=>b.at-a.at);
 return `<div class="pagehead"><div><div class="eyebrow">My progress</div><h1>Learning record</h1><p class="muted" style="margin:0">Course activity only. This is not a record of supervised clinical experience or CE credit.</p></div><button class="btn alt sm" data-a="exportMine">⬇ Export my record (CSV)</button></div>
 <div class="grid g4 mb">${[['Modules complete',rows.filter(r=>r.s==='done').length+' / '+rows.length],['Average best score',(avgQuiz(u.id)??'—')+(avgQuiz(u.id)!==null?'%':'')],['Quiz attempts',atts.length],['Reflections submitted',db.reflections.filter(r=>r.userId===u.id).length]].map(k=>`<div class="card kpi"><div class="lbl">${k[0]}</div><div class="val">${k[1]}</div></div>`).join('')}</div>
 <div class="card mb"><h3>Modules</h3><div class="tablewrap"><table class="t stack"><thead><tr><th>Module</th><th>Status</th><th>Progress</th><th>Best score</th><th>Simulation</th><th></th></tr></thead><tbody>
 ${rows.map(r=>`<tr><td data-l="Module"><b>${esc(r.m.title)}</b></td><td data-l="Status">${statusTag(r.s)}</td><td data-l="Progress" style="min-width:120px">${bar(r.pc)}<span class="tiny muted">${r.pc}%</span></td><td data-l="Best score">${best(r.p)??'—'}${best(r.p)!==null?'%':''}</td><td data-l="Simulation">${r.p&&r.p.sim&&r.p.sim.done?r.p.sim.score+'/'+r.p.sim.max:'—'}</td><td class="nolabel">${r.s!=='locked'?`<a class="btn xs alt" href="#/student/module/${r.m.id}">Open</a>`:''}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="card"><h3>Knowledge-check history</h3>${atts.length?`<div class="list">${atts.map(a=>`<div class="li"><span class="dot ${a.score>=passOf(a.mid)?'':'gold'}"></span><div class="grow small"><b>${esc(M(a.mid).title)}</b> · ${a.score}% ${a.score>=passOf(a.mid)?'<span class="tag">pass</span>':'<span class="tag gold">below passing</span>'}</div><span class="small muted">${fmtDY(a.at)}</span></div>`).join('')}</div>`:'<div class="small muted">No attempts yet.</div>'}</div>`}

function sJournal(){const u=me();const rs=db.reflections.filter(r=>r.userId===u.id).sort((a,b)=>b.at-a.at);const notes=db.notes.filter(n=>n.to===u.id).sort((a,b)=>b.at-a.at);
 const html=`<div class="pagehead"><div><div class="eyebrow">Reflection journal</div><h1>Reflections & feedback</h1><p class="muted" style="margin:0">Your submitted reflections and your instructor’s responses.</p></div></div>
 ${notes.length?`<div class="card mb"><h3>Notes from your instructor</h3><div class="list">${notes.map(n=>`<div class="li"><span class="dot ${n.read?'':'gold'}"></span><div class="grow"><div class="small"><b>${esc(U(n.from).name)}</b> · <span class="muted">${rel(n.at)}</span></div><div class="small">${esc(n.text)}</div></div></div>`).join('')}</div></div>`:''}
 ${rs.length?rs.map(r=>`<div class="card mb"><div class="cardhead"><div><div class="eyebrow">Module ${M(r.moduleId).num}</div><h3>${esc(M(r.moduleId).title)}</h3></div>${r.status==='awaiting'?'<span class="tag gold">Awaiting feedback</span>':r.status==='revise'?'<span class="tag amber">Revision requested</span>':'<span class="tag">Reviewed</span>'}</div>
  <div class="quote">${esc(r.text)}</div>${thread(r,u)}${r.status==='revise'?`<a class="btn sm mt" href="#/student/module/${r.moduleId}/${stepsOf(M(r.moduleId)).length-1}">Revise & resubmit</a>`:replyBox(r)}<div class="tiny muted mt">Submitted ${fmtDY(r.at)}</div></div>`).join(''):'<div class="empty">No reflections yet. You’ll write one at the end of each module.</div>'}`;
 let ch=false;notes.forEach(n=>{if(!n.read){n.read=true;ch=true}});rs.forEach(r=>{if(r.unread){r.unread=false;ch=true}});if(ch)save();return html}
