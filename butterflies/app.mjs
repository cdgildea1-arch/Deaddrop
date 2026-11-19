import {ask as askDeck, levels, pronouns} from './rules.mjs';
import {savedTable} from '../your-move-sync.mjs';
// Butterflies is a saved turn game: the server (your-move-games) keeps it and hides each answer until you've
// both answered, so you can play together live or one at a time. Realtime is only a doorbell ("moved").
const $=s=>document.querySelector(s);
const text=(id,value)=>{$('#'+id).textContent=value};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info=null, client, channel, peer=null, connected=false;
let g=null, over=false, screen='menu', busy=false, entering=false, heart=false, cardKey=null;
const sid=hex();
// The same screen runs two games: Butterflies (sweet deck) and After Dark (its own page and saved game).
const GAME=document.documentElement.dataset.moveChat||'butterflies';
const DECK=GAME==='after-dark'?'dark':'sweet';
const ICON=DECK==='dark'?'🔥':'🦋', UNIT=DECK==='dark'?'flames':'butterflies';
const ask=(card,mystery,seat,partner)=>askDeck(card,mystery,seat,partner,g?.deck||DECK);
const table=savedTable(GAME,()=>room,data=>{
 g=data.game;over=!!data.over;
 if(screen==='lobby'&&g&&!over&&entering)show('game');
 renderLobby();render();
});
$('#name').value=room?.name||read('pounce.name','');
// Questions about the other person say him or her, never a name. Each phone says which one it is.
let iam=read('butterflies.me',null);
const partner=()=>iam==='her'?'him':'her';
const P=()=>pronouns[partner()];
const Sub=()=>{const w=P().s;return w[0].toUpperCase()+w.slice(1)};
function showIam(){for(const b of document.querySelectorAll('#iam button'))b.setAttribute('aria-pressed',String(b.dataset.v===iam))}
$('#iam').onclick=e=>{const b=e.target.closest('button');if(!b)return;iam=b.dataset.v;save('butterflies.me',iam);showIam();render()};
showIam();

function show(id){
 screen=id;
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
async function join(){
 const name=$('#name').value.trim(), code=$('#code').value.trim().toUpperCase();
 if(!name)return text('notice','Enter your name first.');
 if(!iam)return text('notice','Tap I’m him or I’m her first.');
 if(!/^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(code))return text('notice','Enter your room code.');
 $('#join').disabled=true;text('notice','Joining room '+code+'…');
 try{
  const stored=read('pounce.room');
  const candidate={name,code,secret:stored?.code===code?stored.secret:hex()};
  const response=await fetch(API,{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({op:'join',...candidate})});
  const data=await response.json();
  if(!response.ok||data.error)throw Error(data.error||'Could not join that room.');
  room=candidate;info=data;save('pounce.room',room);save('pounce.name',name);
  g=null;over=false;table.forget();
  show('lobby');connect();
  entering=true;
  try{await table.load()}finally{entering=false}
  if(g&&!over){show('game');render();}
 }catch(e){text('notice',e.message)}
 finally{$('#join').disabled=false}
}
function send(event){if(connected)channel.send({type:'broadcast',event,payload:{}}).catch(()=>{})}
function connect(){
 if(!window.supabase||!info?.live)return;
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel(GAME+'-v1-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+info.seat}}});
 channel=ch;
 ch.on('presence',{event:'sync'},()=>{if(channel!==ch)return;peer=ch.presenceState()['s'+(1-info.seat)]?.[0]||null;renderLobby();render();})
 .on('broadcast',{event:'moved'},()=>refresh())
 .subscribe(status=>{if(channel!==ch)return;connected=status==='SUBSCRIBED';if(connected)ch.track({sid,name:room.name}).catch(()=>{});renderLobby();});
}
function refresh(){if(info&&!busy&&screen!=='menu')table.load().catch(e=>text('notice',e.message))}
function renderLobby(){
 if(screen!=='lobby'||!info)return;
 text('roomLabel','Room '+room.code);
 $('#seats').innerHTML=[info.seat,1-info.seat].map(i=>`<div class="seat"><b>${i===info.seat?'You':info.names[i]?Sub():'Waiting for '+P().o}</b><span>${i===info.seat?'Here':peer?'Here now':'Away · can still play'}</span></div>`).join('');
 $('#start').disabled=busy;
 text('start',g&&!over?'Resume game':'Start game');
}
async function act(move){
 if(!g||busy)return;
 busy=true;render();
 try{await table.move({...move,id:g.id,rev:g.rev,round:g.round,ci:g.card?g.card.kind+g.card.i:null,nonce:hex()});text('notice','');send('moved');}
 catch(e){text('notice',e.message)}
 finally{busy=false;render();}
}
async function start(){
 if(!info||busy)return;
 busy=true;renderLobby();text('notice','');
 try{await table.start({deck:DECK});show('game');send('moved');}
 catch(e){text('notice',e.message)}
 finally{busy=false;renderLobby();render();}
}

const kindLabel={mind:'READ MY MIND',open:'OPEN UP',note:'LOVE NOTE'};
function answerHTML(card,a,mystery){
 if(card.kind==='mind')return esc(ask(card,mystery,mystery)[1][a]);
 return esc(a);
}
function rating(){
 const p=g.jar/g.maxJar;
 if(DECK==='dark')return p>=.7?['Dangerously hot','Clear your schedule tonight.']:p>=.5?['Seriously steamy','Somebody’s getting lucky.']:p>=.3?['Heating up','The tension is real.']:['Just warming up','Plenty of night left.'];
 return p>=.7?['Totally smitten','Your jar is overflowing.']:p>=.5?['Head over heels','That’s a lot of butterflies.']:p>=.3?['Seriously crushing','The flutter is real.']:['Butterflies warming up','Every jar starts somewhere.'];
}
function render(){
 if(screen!=='game'||!g)return;
 const me=info.seat, other=P().o, She=Sub(), who=s=>s===me?'You':She, ending=g.phase==='end';
 text('mode','Room '+room.code+(peer?' · both here':''));
 text('jar',ICON+' '+g.jar);
 $('#progress').innerHTML=Array.from({length:g.rounds},(_,i)=>`<i class="${i+1<g.round||ending?'done':i+1===g.round?'now':''}"></i>`).join('');
 for(const id of ['card','status','choices','write','reveal','after','swap'])$('#'+id).hidden=ending;
 $('#end').hidden=$('#again').hidden=!ending;
 if(ending){
  text('level','All done');
  const [title,line]=rating();
  $('#end').innerHTML=`<div class="big">${ICON} ${g.jar}</div><h2>${esc(title)}</h2><p class="sub">${esc(line)} ${g.jar} of ${g.maxJar} ${UNIT}.</p>
   <ul class="recap">${g.history.map(h=>{
    const q=ask(h.card,h.mystery,me,partner());
    const words=h.card.kind==='mind'?q[0]:q;
    const extra=h.card.kind==='mind'?(h.match?' · Match '+ICON:' · Missed'):'';
    return `<li><q>${esc(words)}</q>${[0,1].map(s=>`<span><b>${who(s)}${h.card.kind==='mind'?(s===h.mystery?' picked':' guessed'):''}:</b> ${answerHTML(h.card,h.answers[s],h.mystery)}${h.hearts[1-s]?' '+ICON:''}</span>`).join('')}${extra?`<span>${extra}</span>`:''}</li>`;
   }).join('')}</ul>`;
  $('#again').disabled=busy;
  return text('status','');
 }
 const card=g.card, key=g.id+':'+g.round+':'+card.kind+card.i;
 if(key!==cardKey){cardKey=key;heart=false;$('#text').value='';}
 text('level','Level '+Math.min(card.level,3)+' · '+levels(g)[card.level]);
 if(card.kind==='note')text('level',levels(g)[4]);
 text('kind',kindLabel[card.kind]+(card.kind==='mind'?(g.mystery===me?' · ABOUT YOU':' · ABOUT '+other.toUpperCase()):''));
 const q=ask(card,g.mystery,me,partner()), question=card.kind==='mind'?q[0]:q;
 text('question',question);
 const mine=g.answers[me], theirsIn=g.answered[1-me], answering=g.phase==='answer', revealing=g.phase==='reveal';
 // answering
 $('#choices').hidden=!(card.kind==='mind'&&answering);
 if(card.kind==='mind'&&answering){
  $('#choices').innerHTML=q[1].map((o,i)=>`<button type="button" data-pick="${i}" class="${mine===i?'mine':''}" ${mine!==null||busy?'disabled':''}>${esc(o)}</button>`).join('');
 }
 $('#write').hidden=!(card.kind!=='mind'&&answering&&mine===null);
 $('#send').disabled=busy;
 $('#swap').hidden=!(answering&&!g.answered.some(Boolean)&&card.kind!=='note');
 $('#swap').disabled=busy||g.swaps<1;
 text('swap',g.swaps?`Different question (${g.swaps} left)`:'No swaps left');
 // reveal
 $('#reveal').hidden=!(revealing||(answering&&mine!==null&&card.kind!=='mind'));
 $('#after').hidden=!revealing||g.ready[me];
 let status;
 if(answering){
  if(mine===null)status=card.kind==='mind'?(g.mystery===me?'Answer honestly. '+She+'’s guessing.':'What would '+P().s+' pick?'):card.kind==='note'?'Last one. Make it count.':'Your answer stays hidden until you’ve both answered.';
  else status=theirsIn?'Revealing…':'Waiting on '+other+'…';
  $('#reveal').innerHTML=card.kind!=='mind'&&mine!==null?`<div class="ans${card.kind==='note'?' note':''}"><b>You wrote</b><p>${esc(mine)}</p></div>`:'';
 }else{
  const order=[me,1-me];
  let top='';
  if(card.kind==='mind'){
   top=`<p class="verdict${g.match?' yes':''}">${g.match?'It’s a match! +3 '+ICON:'Not quite!'}</p>`;
   $('#reveal').innerHTML=top+order.map(s=>`<div class="ans"><b>${who(s)} ${s===g.mystery?'picked':'guessed'}</b><p>${answerHTML(card,g.answers[s],g.mystery)}</p></div>`).join('');
  }else{
   $('#reveal').innerHTML=order.map(s=>`<div class="ans${card.kind==='note'?' note':''}"><b>${who(s)}</b><p>${esc(g.answers[s])}</p></div>`).join('');
  }
  if(g.hearts[1-me])$('#reveal').innerHTML+=`<p class="sent">${She} sent you a ${ICON}</p>`;
  status=g.ready[me]?'Waiting on '+other+' to read it…':(DECK==='dark'?'Did '+P().p+' answer turn you on?':'Did '+P().p+' answer give you butterflies?');
  $('#heart').setAttribute('aria-pressed',String(heart));
  text('heart',heart?ICON+' Sent':DECK==='dark'?'🔥 That’s hot':'🦋 Give a butterfly');
  $('#heart').disabled=$('#next').disabled=busy;
  text('next',g.round>=g.rounds?'See our jar':'Next question');
 }
 if(busy)status='Saving…';
 text('status',status);
}
$('#choices').onclick=e=>{const b=e.target.closest('[data-pick]');if(b&&g?.answers[info.seat]===null)act({type:'answer',pick:+b.dataset.pick})};
$('#write').onsubmit=e=>{e.preventDefault();const t=$('#text').value.trim();if(!t)return text('notice','Write an answer first.');act({type:'answer',text:t})};
$('#heart').onclick=()=>{heart=!heart;render()};
$('#next').onclick=()=>act({type:'next',heart});
$('#swap').onclick=()=>act({type:'swap'});
$('#join').onclick=join;
$('#start').onclick=()=>start();
$('#again').onclick=()=>start();
function leave(){if(channel)client.removeChannel(channel);channel=null;connected=false;peer=null;g=null;over=false;info=null;table.forget();show('menu')}
$('#back').onclick=leave;$('#leaveLobby').onclick=leave;
setInterval(()=>{if(!document.hidden&&!(document.activeElement===$('#text')))refresh()},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
