/* ===== LPC Learning Studio — demo LMS core (all data fictional, stored in this browser only) ===== */
const KEY='lpcls-demo-v2', UIKEY='lpcls-ui-v2', DAY=864e5;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Math.random().toString(36).slice(2,9);
const clone=o=>JSON.parse(JSON.stringify(o));
const pctf=(a,b)=>b?Math.round(a/b*100):0;
const fmtD=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const fmtDY=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const fmtDT=t=>new Date(t).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const fmtT=t=>new Date(t).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
function rel(t){const d=Date.now()-t,m=Math.round(d/6e4);if(Math.abs(m)<1)return'just now';if(d<0){const dd=Math.round(-d/DAY);return dd<1?'today':dd===1?'tomorrow':'in '+dd+' days'}if(m<60)return m+'m ago';const h=Math.round(m/60);if(h<24)return h+'h ago';const dd=Math.round(h/24);return dd===1?'yesterday':dd+'d ago'}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function load(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}}

/* ---------- seed ---------- */
function seed(){
 const N=Date.now(), d=n=>N-n*DAY, at=(n,h,m)=>{const x=new Date(N+n*DAY);x.setHours(h,m||0,0,0);return +x};
 const users=[
  {id:'a1',name:'Casey Whitfield',role:'admin',credential:'Platform Administrator',email:'casey.admin@example.org',color:'#7b5523',joined:d(120)},
  {id:'i1',name:'Dr. Elena Morris',role:'instructor',credential:'LPC-S (fictional)',email:'elena.morris@example.org',color:'#265744',joined:d(110),bio:'Supervisor & lead instructor'},
  {id:'i2',name:'Dr. Hannah Cole',role:'instructor',credential:'LPC-S (fictional)',email:'hannah.cole@example.org',color:'#3b6280',joined:d(90),bio:'Instructor'},
  {id:'s1',name:'Mia Torres',role:'student',credential:'LPC Associate',email:'mia.torres@example.org',color:'#3d7a5f',joined:d(62),supervisorId:'i1',setting:'Community mental health agency',stage:'Month 7 of supervised experience'},
  {id:'s2',name:'Jordan Patel',role:'student',credential:'LPC Associate',email:'jordan.patel@example.org',color:'#9a6a18',joined:d(55),supervisorId:'i1',setting:'Group private practice',stage:'Month 3 of supervised experience'},
  {id:'s3',name:'Lauren Kim',role:'student',credential:'Graduate practicum student',email:'lauren.kim@example.org',color:'#6a5a8c',joined:d(70),supervisorId:'i1',setting:'University counseling center practicum',stage:'Practicum, final semester'},
  {id:'s4',name:'Caleb Brooks',role:'student',credential:'LPC Associate',email:'caleb.brooks@example.org',color:'#a4473b',joined:d(48),supervisorId:'i1',setting:'Integrated primary care clinic',stage:'Month 2 of supervised experience'},
  {id:'s5',name:'Nina Shah',role:'student',credential:'LPC Associate',email:'nina.shah@example.org',color:'#3b6280',joined:d(3),supervisorId:'i1',setting:'Telehealth practice',stage:'Month 1 of supervised experience'},
  {id:'s6',name:'Owen Grant',role:'student',credential:'LPC Associate',email:'owen.grant@example.org',color:'#557a3d',joined:d(30),supervisorId:'i2',setting:'School-based services',stage:'Month 4 of supervised experience'},
  {id:'s7',name:'Priya Das',role:'student',credential:'LPC',email:'priya.das@example.org',color:'#8c5a6a',joined:d(20),supervisorId:'i2',setting:'Private practice',stage:'Licensed, professional development'}];
 const modules={};[...SEED_MODULES,...SEED_DRAFT_MODULES].forEach(m=>modules[m.id]=clone(m));
 const courses=[
  {id:'c1',title:'Clinical Foundations Pathway',desc:'Five case-based modules covering ethics, documentation, supervision, treatment planning, and risk. Designed for counseling students and LPC Associates.',status:'published',passScore:80,moduleIds:['m1','m2','m3','m4','m5'],instructorIds:['i1','i2'],approval:'not_approved',hoursLabel:'~10 hrs (estimated, not verified)',price:149,createdAt:d(100)},
  {id:'c2',title:'Telehealth Practice Essentials',desc:'Draft course: telehealth readiness, privacy, and emergency planning for remote sessions.',status:'draft',passScore:80,moduleIds:['m6','m7'],instructorIds:['i1'],approval:'not_approved',hoursLabel:'~2 hrs (estimated)',price:39,createdAt:d(8)}];
 const db={v:2,seededAt:N,users,courses,modules,enrollments:[],progress:{},reflections:[],notes:[],meetings:[],activity:[],
  settings:{brand:'LPC Learning Studio',tagline:'Interactive counselor education'},
  plans:[{id:'p1',name:'Single course',price:149,interval:'one-time',active:true},{id:'p2',name:'Foundations bundle (all courses)',price:249,interval:'one-time',active:true},{id:'p3',name:'Monthly membership',price:29,interval:'month',active:false}]};
 ['s1','s2','s3','s4','s5','s6','s7'].forEach((s,i)=>db.enrollments.push({id:uid('e'),userId:s,courseId:'c1',moduleIds:null,assignedBy:users.find(u=>u.id===s).supervisorId,at:d([60,54,68,46,3,28,18][i]),due:N+[21,14,10,7,45,30,40][i]*DAY}));
 const P=(u,m)=>{db.progress[u]=db.progress[u]||{};return db.progress[u][m]=db.progress[u][m]||{done:{},pos:0,sim:null,attempts:[],ex:{},touched:0}};
 const finish=(u,mid,o)=>{const m=modules[mid],p=P(u,mid);stepsOf(m).forEach(s=>{if(s.key!=='quiz'&&s.key!=='ref')p.done[s.key]=true});
  p.sim={path:[],done:true,score:o.sim??5,max:6};(o.att||[100]).forEach((sc,i)=>p.attempts.push({score:sc,at:o.t-DAY*(o.att.length-i)/2,answers:[],reviewed:true}));
  if(Math.max(...(o.att||[100]))>=80)p.done.quiz=true;p.touched=o.t;p.pos=stepsOf(m).length-1;
  if(o.ref){const r={id:uid('r'),userId:u,moduleId:mid,text:o.ref,at:o.t,status:o.rs||'awaiting',thread:o.th||[],unread:!!o.unread};db.reflections.push(r);p.done.ref=true;p.reflId=r.id;if(r.status!=='awaiting'||true)p.completedAt=o.t}};
 const partial=(u,mid,n,t,extra)=>{const m=modules[mid],p=P(u,mid),st=stepsOf(m);st.slice(0,n).forEach(s=>p.done[s.key]=true);p.pos=Math.min(n,st.length-1);p.touched=t;Object.assign(p,extra||{})};
 // Mia: strong
 finish('s1','m1',{t:d(40),att:[100],sim:6,ref:'In my agency, clients sometimes see me at the local grocery store. I’m in tension between autonomy (letting them decide whether to greet me) and fidelity to confidentiality. I now mention this at intake and let clients choose. I’d consult my supervisor if a client asked to meet socially.',rs:'reviewed',th:[{by:'i1',text:'Thoughtful. Raising chance encounters at intake is exactly the kind of proactive consent conversation that prevents ruptures. Let’s add this to your informed consent script.',at:d(38)}]});
 finish('s1','m2',{t:d(6),att:[80,100],sim:5,ref:'I want to stop writing notes at the end of the day from memory. I’m going to block 10 minutes after each session for two weeks and use the DAP template. The barrier is back-to-back scheduling.',rs:'awaiting'});
 partial('s1','m3',3,d(1));
 // Jordan: struggling on documentation quiz
 finish('s2','m1',{t:d(30),att:[60,80],sim:4,ref:'A client offered me concert tickets they couldn’t use. I declined kindly and we explored what the offer meant. Principles in tension were beneficence and avoiding a dual relationship.',rs:'reviewed',th:[{by:'i1',text:'Good handling. Next time, also document the offer and your response. Please add a one-line addendum to the note.',at:d(28)},{by:'s2',text:'Done. I added the addendum. Thanks!',at:d(27)}]});
 partial('s2','m2',6,d(4),{attempts:[{score:60,at:d(9),answers:[0,1,0,1,0],reviewed:false},{score:60,at:d(4),answers:[1,2,1,1,0],reviewed:false}]});
 // Lauren: nearly done
 finish('s3','m1',{t:d(60),att:[100],sim:6,ref:'Practicum boundaries: a former classmate is now a client at the center. I disclosed this to my site supervisor and the case was reassigned.',rs:'reviewed',th:[{by:'i1',text:'Exactly the right call, and well documented.',at:d(59)}]});
 finish('s3','m2',{t:d(45),att:[100],sim:6,ref:'Strengthening objective language: I’m replacing adjectives with observable behaviors.',rs:'reviewed',th:[{by:'i1',text:'Great specific habit.',at:d(44)}]});
 finish('s3','m3',{t:d(30),att:[80],sim:5,ref:'My first reaction to feedback is to over-explain. I’m practicing paraphrasing first.',rs:'reviewed',th:[{by:'i1',text:'I’ve noticed the change in our meetings. Keep going.',at:d(29)}]});
 finish('s3','m4',{t:d(15),att:[100],sim:6,ref:'I’ll start graphing GAD-7 scores and reviewing them with clients monthly.',rs:'reviewed',th:[{by:'i1',text:'Love this. Bring a sample (de-identified) graph to group.',at:d(14)}]});
 finish('s3','m5',{t:d(2),att:[80],sim:6,ref:'At my practicum site, any positive screen means I page the on-call supervisor before the client leaves. What feels uncertain is how to phrase the follow-up questions naturally.',rs:'awaiting'});
 // Caleb: inactive
 partial('s4','m1',2,d(18));
 // Nina: new
 partial('s5','m1',1,d(1));
 // Owen & Priya (other supervisor)
 finish('s6','m1',{t:d(10),att:[80],sim:4,ref:'School settings make dual relationships common, since I see families at events.',rs:'awaiting'});
 partial('s7','m1',4,d(2));
 db.reflections.find(r=>r.userId==='s1'&&r.moduleId==='m1').unread=false;
 db.reflections.find(r=>r.userId==='s2'&&r.moduleId==='m1').unread=false;
 // notes
 db.notes.push({id:uid('n'),to:'s1',from:'i1',text:'Nice work on Documentation. For our Thursday meeting, bring one de-identified note you’d like feedback on.',at:d(5),read:false});
 db.notes.push({id:uid('n'),to:'s4',from:'i1',text:'Checking in. I noticed you haven’t logged in for a couple of weeks. Let’s talk about your schedule at our next meeting.',at:d(4),read:false});
 // meetings
 const mt=(att,type,t,mins,status,agenda,notes,approved)=>db.meetings.push({id:uid('mt'),supervisorId:'i1',attendees:att,type,at:t,mins,status,agenda,notes:notes||'',approved:!!approved});
 mt(['s1'],'individual',at(2,15),60,'scheduled','Review documentation sample; case conceptualization (de-identified).');
 mt(['s2'],'individual',at(3,10),60,'scheduled','Documentation remediation plan; quiz review.');
 mt(['s1','s3','s5'],'group',at(6,13),120,'scheduled','Group: ethical decision-making case discussion.');
 mt(['s4'],'individual',at(8,11),60,'scheduled','Re-engagement and scheduling.');
 mt(['s1'],'individual',at(-5,15),60,'completed','Boundaries with chance encounters.','Discussed informed consent language for chance encounters. Associate to update consent script.',true);
 mt(['s2'],'individual',at(-6,10),60,'completed','Gift offers; documentation.','Reviewed gift-offer handling. Recommended addendum. Discussed note timeliness.',true);
 mt(['s1','s3','s5'],'group',at(-8,13),120,'completed','Group: risk screening procedures.','Reviewed agency screening workflow and consultation pathways (no identifying information).',false);
 mt(['s3'],'individual',at(-12,9),60,'completed','Practicum wrap-up planning.','Planned final practicum evaluation.',true);
 mt(['s4'],'individual',at(-20,11),60,'completed','Onboarding.','Reviewed supervision agreement and expectations.',true);
 db.meetings.push({id:uid('mt'),supervisorId:'i2',attendees:['s6'],type:'individual',at:at(4,14),mins:60,status:'scheduled',agenda:'School-setting boundaries.',notes:'',approved:false});
 // activity
 const A=(t,u,text,type)=>db.activity.push({at:t,uid:u,text,type});
 A(d(.05),'s1','opened Module 3, Supervision & Consultation','progress');A(d(1),'s5','started Module 1, Ethics & Professional Boundaries','progress');
 A(d(2),'s3','submitted a reflection for Module 5','reflection');A(d(2.1),'s3','passed the Module 5 knowledge check (80%)','quiz');
 A(d(4),'s2','scored 60% on the Module 2 knowledge check (attempt 2)','quiz');A(d(4.1),'i1','sent a check-in note to Caleb Brooks','feedback');
 A(d(6),'s1','submitted a reflection for Module 2','reflection');A(d(6.1),'s1','passed the Module 2 knowledge check (100%)','quiz');
 A(d(9),'s2','scored 60% on the Module 2 knowledge check (attempt 1)','quiz');A(d(10),'s6','submitted a reflection for Module 1','reflection');A(d(14),'i1','gave feedback on Lauren Kim’s Module 4 reflection','feedback');
 db.activity.sort((a,b)=>b.at-a.at);
 // touched for last-active
 users.forEach(u=>u.lastActive=u.role==='student'?Math.max(0,...Object.values(db.progress[u.id]||{}).map(p=>p.touched||0))||u.joined:d(.02));
 return db}

/* ---------- state ---------- */
let db=load(KEY); if(!db||db.v!==2){db=seed();store(KEY,db)}
let ui=Object.assign({as:'s1',supAs:'i1',ex:{},quiz:{},tab:{},filter:'',cal:0},load(UIKEY)||{});ui.ex={};ui.quiz={};
const save=()=>{store(KEY,db);store(UIKEY,{as:ui.as,supAs:ui.supAs,role:ui.role,cal:ui.cal})};
const U=id=>db.users.find(u=>u.id===id);
const C=id=>db.courses.find(c=>c.id===id);
const M=id=>db.modules[id];
function role(){return ui.role||'public'}
function me(){return role()==='student'?U(ui.as):role()==='instructor'?U(ui.supAs):role()==='admin'?U('a1'):null}
function log(text,type,u){db.activity.unshift({at:Date.now(),uid:u||me().id,text,type})}
function initials(n){return n.replace(/^Dr\.\s*/,'').split(/\s+/).map(x=>x[0]).slice(0,2).join('')}
function av(u,cls){return `<span class="avatar ${cls||''}" style="background:${u.color||'#3d7a5f'}">${esc(initials(u.name))}</span>`}
function person(u,sub){return `<div class="person">${av(u)}<div><b>${esc(u.name)}</b><span>${esc(sub??u.credential)}</span></div></div>`}

/* ---------- learning model ---------- */
function stepsOf(m){const s=[{key:'ov',label:'Overview',kind:'ov'}];m.lessons.forEach((l,i)=>s.push({key:'l'+i,label:l.title,kind:'lesson',i}));
 if(m.scenario)s.push({key:'sim',label:'Case simulation',kind:'sim'});if(m.quiz&&m.quiz.length)s.push({key:'quiz',label:'Knowledge check',kind:'quiz'});s.push({key:'ref',label:'Reflection',kind:'ref'});return s}
function prog(u,mid,create){if(!db.progress[u]){if(!create)return null;db.progress[u]={}}let p=db.progress[u][mid];if(!p&&create)p=db.progress[u][mid]={done:{},pos:0,sim:null,attempts:[],ex:{},touched:0};return p||null}
const best=p=>p&&p.attempts.length?Math.max(...p.attempts.map(a=>a.score)):null;
function passOf(mid){const m=M(mid);return (C(m.courseId)||{}).passScore||80}
function modPct(u,mid){const p=prog(u,mid),st=stepsOf(M(mid));if(!p)return 0;return pctf(st.filter(s=>p.done[s.key]).length,st.length)}
function modStatus(u,mid){const m=M(mid);if(m.prereq&&modStatus(u,m.prereq)!=='done')return 'locked';const pc=modPct(u,mid);return pc>=100?'done':pc>0?'in':'not'}
function enrolledMods(u,cid){const e=db.enrollments.find(e=>e.userId===u&&e.courseId===cid);if(!e)return[];const c=C(cid);return (e.moduleIds&&e.moduleIds.length?c.moduleIds.filter(x=>e.moduleIds.includes(x)):c.moduleIds).filter(id=>M(id))}
function coursePct(u,cid){const ms=enrolledMods(u,cid);return ms.length?Math.round(ms.reduce((a,m)=>a+modPct(u,m),0)/ms.length):0}
function coursesOf(u){return db.enrollments.filter(e=>e.userId===u).map(e=>C(e.courseId)).filter(c=>c&&(c.status==='published'))}
function allAttempts(u){const out=[];Object.entries(db.progress[u]||{}).forEach(([mid,p])=>p.attempts.forEach(a=>out.push({...a,mid})));return out}
function avgQuiz(u){const b=Object.entries(db.progress[u]||{}).map(([m,p])=>best(p)).filter(x=>x!==null);return b.length?Math.round(b.reduce((a,x)=>a+x,0)/b.length):null}
function lastActive(u){const t=Math.max(U(u).lastActive||0,...Object.values(db.progress[u]||{}).map(p=>p.touched||0));return t}
function flags(u){const f=[];const la=lastActive(u);if(Date.now()-la>10*DAY)f.push({t:'Inactive '+Math.round((Date.now()-la)/DAY)+'d',c:'red'});
 Object.entries(db.progress[u]||{}).forEach(([mid,p])=>{const fails=p.attempts.filter(a=>a.score<passOf(mid)).length;if(fails>=2&&!p.done.quiz)f.push({t:'2+ failed attempts · M'+M(mid).num,c:'gold'})});
 db.enrollments.filter(e=>e.userId===u).forEach(e=>{if(e.due<Date.now()&&coursePct(u,e.courseId)<100)f.push({t:'Overdue',c:'red'})});return f}
function studentsFor(viewer){return db.users.filter(u=>u.role==='student'&&(viewer.role==='admin'||u.supervisorId===viewer.id))}
function pendingRefl(viewer){const ids=studentsFor(viewer).map(s=>s.id);return db.reflections.filter(r=>ids.includes(r.userId)&&r.status==='awaiting')}
function pendingQuiz(viewer){const out=[];studentsFor(viewer).forEach(s=>Object.entries(db.progress[s.id]||{}).forEach(([mid,p])=>{const un=p.attempts.filter(a=>!a.reviewed&&a.score<passOf(mid));if(un.length)out.push({s,mid,p,un})}));return out}
function unreadFor(u){return db.reflections.filter(r=>r.userId===u&&r.unread).length+db.notes.filter(n=>n.to===u&&!n.read).length}

/* ---------- UI helpers ---------- */
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function modal(html){$('#mbody').innerHTML=html;$('#modal').classList.add('show');setTimeout(()=>{const f=$('#mbody input,#mbody textarea,#mbody select');f&&f.focus()},50)}
function closeModal(){$('#modal').classList.remove('show')}
function bar(p,cls){return `<div class="bar ${cls||''}"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`}
function ring(p,sm){return `<div class="ring ${sm?'sm':''}" style="--p:${p}"><span>${p}%</span></div>`}
function statusTag(s){return {done:'<span class="tag">Complete</span>',in:'<span class="tag blue">In progress</span>',not:'<span class="tag gray">Not started</span>',locked:'<span class="tag outline">🔒 Locked</span>'}[s]}
function download(name,content,type){try{const b=new Blob([content],{type:type||'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Downloaded '+name)}catch(e){toast('Download blocked in this preview')}}
function csv(rows){return rows.map(r=>r.map(c=>{c=String(c??'');return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')).join('\n')}
function hbars(rows,max){max=max||100;const h=rows.length*34+6;return `<div class="chart"><svg viewBox="0 0 520 ${h}" role="img">${rows.map((r,i)=>{const y=i*34+4,w=Math.max(2,(r.v/max)*300);return `<text x="0" y="${y+17}" font-size="12.5" fill="#2c4a3e">${esc(r.l.length>26?r.l.slice(0,25)+'…':r.l)}</text><rect x="178" y="${y+5}" width="300" height="16" rx="8" fill="#e7ece5"/><rect x="178" y="${y+5}" width="${w}" height="16" rx="8" fill="${r.c||'#3d7a5f'}"/><text x="${w>230?178+w-8:178+w+6}" y="${y+17}" font-size="12" fill="${w>230?'#fff':'#19362d'}" font-weight="600" ${w>230?'text-anchor="end"':''}>${esc(r.t??r.v+'%')}</text>`}).join('')}</svg></div>`}
function cols(rows){const max=Math.max(1,...rows.map(r=>r.v));const W=520,H=170,bw=(W-20)/rows.length;return `<div class="chart"><svg viewBox="0 0 ${W} ${H+24}">${rows.map((r,i)=>{const h=Math.round(r.v/max*(H-24)),x=10+i*bw;return `<rect x="${x+bw*.18}" y="${H-h}" width="${bw*.64}" height="${h}" rx="6" fill="${r.c||'#3d7a5f'}"/><text x="${x+bw/2}" y="${H-h-6}" text-anchor="middle" font-size="12" font-weight="600" fill="#19362d">${r.v}</text><text x="${x+bw/2}" y="${H+16}" text-anchor="middle" font-size="11.5" fill="#66796d">${esc(r.l)}</text>`}).join('')}<line x1="6" x2="${W-6}" y1="${H}" y2="${H}" stroke="#dfe7df"/></svg></div>`}
function piiCheck(t){const hard=[],soft=[];
 if(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/.test(t))hard.push('a number that looks like a Social Security number');
 if(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]\d{4})/.test(t))hard.push('a phone number');
 if(/[\w.+-]+@[\w-]+\.[\w.]+/.test(t))hard.push('an email address');
 if(/\b(dob|date of birth|born on)\b/i.test(t)||/\b\d{1,2}\/\d{1,2}\/(19|20)\d{2}\b/.test(t))hard.push('a date of birth or full date');
 if(/\b(Mr|Mrs|Ms|Miss)\.?\s+[A-Z][a-z]+/.test(t)||/\bclient(?:'s)? name(?:d| is)\s+[A-Z]/i.test(t))soft.push('what may be a client name');
 if(/\b\d{1,5}\s+\w+\s+(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane)\b/i.test(t))hard.push('a street address');
 return {hard,soft}}
