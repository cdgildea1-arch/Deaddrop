import {traits,cast,newGame,action,view,candidates,botMove} from './rules.mjs?v=fit';

const $=s=>document.querySelector(s);
const text=(id,value)=>{
 $('#'+id).textContent=value;
 if(id==='notice')$('#questionNotice').textContent=value;
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info, client, channel, connected=false, peer, ready=false;
let practice=false, game, remote, screen='menu', mode='pick', marks=new Set(), pending=null, botTimer;
let messages=[], seen=0, pollBusy=false;
const sid=hex();
$('#name').value=room?.name||read('pounce.name','');

function show(id){
 screen=id;
 document.body.classList.toggle('playing',id==='game');
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
const seat=()=>practice?0:info?.seat??0;
const host=()=>!practice&&info?.seat===0;
const current=()=>practice||host()?game&&view(game,seat()):remote;
const canAct=g=>g&&g.winner===null&&!pending&&(practice||connected&&!!peer?.ready);
const canPlay=g=>canAct(g)&&g.players.every(p=>p.ready)&&g.turn===seat()&&!g.question;
function clearDraft(){mode='pick';marks.clear()}

async function call(op,extra={}){
 const response=await fetch(API,{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({op,...room,...extra})});
 const data=await response.json();
 if(!response.ok||data.error)throw Error(data.error||'Room connection failed.');
 return data;
}
function absorb(data){
 if(info&&data.live!==info.live){leave();info=null;messages=[];renderChat();text('notice','The room was reset. Join again.');return;}
 info=data;
 const ids=new Set(messages.map(m=>m.id));
 messages.push(...data.messages.filter(m=>!ids.has(m.id)));
 messages.sort((a,b)=>a.ts-b.ts);
 messages=messages.slice(-200);
 renderChat();renderLobby();
}
async function poll(){
 if(!info||pollBusy)return;
 pollBusy=true;
 try{absorb(await call('get',{after:messages.at(-1)?.ts||0}));}
 catch(e){text('chatError',e.message)}
 finally{pollBusy=false}
}
async function join(){
 const name=$('#name').value.trim(), code=$('#code').value.trim().toUpperCase();
 if(!name)return text('notice','Enter your name first.');
 if(!/^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(code))return text('notice','Enter your room code.');
 if(!window.supabase)return text('notice','Live play could not load. Refresh to try again.');
 $('#join').disabled=true;text('notice','Joining room '+code+'…');
 try{
  const stored=read('pounce.room');
  const candidate={name,code,secret:stored?.code===code?stored.secret:hex()};
  const data=await call('join',candidate);
  room=candidate;save('pounce.room',room);save('pounce.name',name);
  practice=false;info=null;messages=[];absorb(data);
  show('lobby');connect();
 }catch(e){text('notice',e.message)}
 finally{$('#join').disabled=false}
}
function send(event,payload){if(connected)channel.send({type:'broadcast',event,payload}).catch(()=>{})}
function track(){if(connected)channel.track({sid,name:room.name,ready}).catch(()=>{})}
function publish(result){if(host()&&game)send('state',{sid,game:view(game,1),result})}
function saveGame(){if(host()&&game)save('guess-who.fit.game.'+info.live,game)}
let lastResult;
const receipts=new Map();
function connect(){
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel('guess-who-v3-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+seat()}}});
 channel=ch;
 ch.on('presence',{event:'sync'},()=>{
  if(channel!==ch)return;
  peer=ch.presenceState()['s'+(1-seat())]?.[0];
  if(host()&&ready&&peer?.ready&&game){publish(lastResult);runBot()}
  if(!host()&&peer?.ready)send('hello',{});
  renderLobby();render();
 }).on('broadcast',{event:'hello'},()=>publish(lastResult))
 .on('broadcast',{event:'state'},({payload:p})=>{
  if(host()||!peer||p?.sid!==peer.sid||!p.game||!ready)return;
  if(remote?.id===p.game.id&&p.game.rev<remote.rev)return;
  const changed=remote?.id!==p.game.id||p.game.rev!==remote.rev;
  if(remote?.id!==p.game.id){clearDraft();pending=null;}
  remote=p.game;
  const acknowledged=pending&&p.result?.nonce===pending.nonce;
  if(acknowledged){
   if(!p.result.error&&$('#questions').open)$('#questions').close();
   pending=null;
   if(p.result.error)text('notice',p.result.error);
  }
  if(screen==='lobby')show('game');
  else if(!changed&&!acknowledged)return;
  if(changed&&mode==='guess'){mode='pick';text('notice','');}
  render();
 }).on('broadcast',{event:'move'},({payload:p})=>{
  if(!host()||!peer?.ready||p?.sid!==peer.sid||!game||typeof p.move?.nonce!=='string')return;
  if(receipts.has(p.move.nonce)){publish(receipts.get(p.move.nonce));return;}
  lastResult={nonce:p.move.nonce};
  try{action(game,1,p.move);saveGame();}catch(e){lastResult.error=e.message}
  receipts.set(p.move.nonce,lastResult);
  publish(lastResult);render();runBot();
 }).on('broadcast',{event:'ping'},()=>poll())
 .subscribe(status=>{
  if(channel!==ch)return;
  connected=status==='SUBSCRIBED';
  if(connected){track();send('hello',{});}
  renderLobby();render();
 });
}
function renderLobby(){
 if(screen!=='lobby'||!info)return;
 text('roomLabel','Room '+room.code+(connected?'':' · Connecting…'));
 $('#seats').innerHTML=info.names.map((name,i)=>`<div class="seat"><b>${esc(name||'Waiting for a friend')}</b><span>${i===seat()?(ready?'Ready':'You'):(peer?.ready?'Ready':peer?'Joined':'Offline')}</span></div>`).join('');
 text('ready',ready?'Ready · tap to cancel':'I’m ready');
 $('#start').hidden=!host();
 $('#start').disabled=!(connected&&ready&&peer?.ready);
 text('start',host()&&read('guess-who.fit.game.'+info.live)?.winner===null?'Resume game':'Start round');
}
const face=id=>`<span class="portrait" aria-hidden="true" style="--px:${(id%6)*20}%;--py:${Math.floor(id/6)*100/3}%"></span>`;
$('#portraits').innerHTML=[1,7,14].map(face).join('');

function start(){
 if(!practice&&!(host()&&connected&&ready&&peer?.ready))return;
 const saved=host()&&screen==='lobby'?read('guess-who.fit.game.'+info.live):null;
 game=saved&&saved.winner===null?saved:newGame(practice?[$('#name').value.trim()||'You','Computer']:info.names.slice(0,2));
 if(practice)action(game,1,{id:game.id,type:'pick',choice:Math.floor(Math.random()*cast.length)});
 lastResult=null;receipts.clear();clearDraft();show('game');saveGame();publish();render();runBot();
}
function submit(type,data={}){
 const state=current();
 if(!canAct(state)||(!['pick','answer'].includes(type)&&!canPlay(state)))return;
 const move={type,...data,id:state.id,rev:state.rev,nonce:hex()};
 if(practice||host()){
  try{action(game,seat(),move)}catch(e){return text('notice',e.message)}
  if($('#questions').open)$('#questions').close();
  mode='pick';text('notice','');saveGame();publish();render();runBot();
 }else{
  pending=move;send('move',{sid,move});render();
 }
}
function typedTrait(question){
 const normalized=question.toLowerCase().replace(/[?!.]/g,'').trim();
 const stated=traits.find(([,label])=>label.toLowerCase().replace(/[?!.]/g,'')===normalized);
 if(stated)return stated[0];
 const match=normalized.match(/^(?:do they have|are they wearing|do they wear|does (?:your|the) character (?:have|wear)) (?:a |an |any )?(.+)$/);
 if(!match)return null;
 const aliases={'long hair':'longHair','light hair':'lightHair','blonde hair':'lightHair','blond hair':'lightHair','grey hair':'grayHair','curly hair':'curly','beard':'beard','moustache':'mustache'};
 return aliases[match[1]]||traits.find(([, ,name])=>name.replace(/^(?:a|an) /,'')===match[1])?.[0]||null;
}
function runBot(){
 clearTimeout(botTimer);
 if(!practice||!game||game.winner!==null||game.turn!==1||game.players[0].secret===null)return;
 botTimer=setTimeout(()=>{
  action(game,1,{...botMove(game),id:game.id,rev:game.rev});
  render();
 },750);
}
function render(){
 if(screen!=='game')return;
 const g=current();if(!g)return;
 const me=seat(), mine=g.players[me], other=g.players[1-me], ended=g.winner!==null, enabled=canPlay(g);
 const chosen=$('#question').value, possible=new Set(candidates(g,me).map(p=>p.id));
 text('mode',practice?'Solo practice':'Room '+room.code);
 $('#secret').innerHTML=mine.ready?face(mine.secret):'';
 const status=ended?(g.winner===me?'You win!':other.name+' wins!'):pending?'Sending…':!practice&&!peer?.ready?'Waiting for your friend to return':!mine.ready?'Choose your secret character':!other.ready?'Waiting for '+other.name+' to choose':g.turn===me?'Your turn':other.name+'’s turn';
 text('turn',g.question?(g.question.seat===me?'Waiting for an answer':'Answer your friend’s question'):status);
 const last=g.history.at(-1);
 text('lastClue',g.question?g.question.label:ended?`Your character was ${cast[mine.secret].name}. ${other.name} chose ${cast[other.secret].name}.`:last?`${g.players[last.seat].name}: ${last.label} ${last.answer?'Yes':'No'}.`:mine.ready?'Your character: '+cast[mine.secret].name:'Your choice stays hidden from the other player.');
 const remaining=traits.filter(([key])=>!g.history.some(h=>h.seat===me&&h.trait===key));
 $('#question').innerHTML=remaining.map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('');
 if(remaining.some(([key])=>key===chosen))$('#question').value=chosen;
 $('#question').disabled=$('#ask').disabled=!enabled||!remaining.length;
 $('#customQuestion').disabled=$('#customForm button').disabled=!enabled;
 text('questionPrompt',g.question?.label||'');
 text('openQuestions',g.question&&g.question.seat!==me?'Answer question':'Questions');
 $('#answerRow').hidden=!g.question||g.question.seat===me;
 $('#answerYes').disabled=$('#answerNo').disabled=!canAct(g);

 $('#mark').disabled=!mine.ready||ended;
 $('#guess').disabled=!enabled;
 $('#mark').setAttribute('aria-pressed',mode==='mark');
 $('#guess').setAttribute('aria-pressed',mode==='guess');
 $('#again').hidden=!ended||(!host()&&!practice);
 $('#again').disabled=!practice&&(!connected||!peer?.ready);
 text('count',mine.ready&&!ended?'Possible: '+[...possible].filter(id=>!marks.has(id)).length:'');
 $('#board').innerHTML=cast.map(p=>{
  const out=mine.ready&&(!possible.has(p.id)||marks.has(p.id));
  const active=!mine.ready?canAct(g):!ended&&(mode==='mark'||mode==='guess'&&enabled);
  const label=[p.name,...traits.filter(([key])=>p[key]).map(([, ,description])=>description)].join(', ');
  return `<button class="person ${out?'out':''} ${mine.secret===p.id&&!ended?'mine':''}" data-person="${p.id}" aria-label="${esc(label+(out?', crossed out':''))}" ${active?'':'disabled'}>${face(p.id)}<span class="person-name">${esc(p.name)}</span></button>`;
 }).join('');
 $('#history').innerHTML=g.history.slice().reverse().map(h=>`<li>${esc(g.players[h.seat].name)} · ${esc(h.label)} · ${(h.trait||h.custom)?(h.answer?'Yes':'No'):(h.answer?'Correct':'Incorrect')}</li>`).join('');
}
$('#board').onclick=e=>{
 const b=e.target.closest('[data-person]');if(!b||b.disabled)return;
 const choice=+b.dataset.person;
 if(!current().players[seat()].ready){
  if(confirm('Choose '+cast[choice].name+' as your secret character?'))submit('pick',{choice});
 }else if(mode==='mark'){
  if(!marks.delete(choice))marks.add(choice);
  render();
 }else if(mode==='guess'&&confirm('Is '+cast[choice].name+' your final guess? A wrong guess ends the round.'))submit('guess',{choice});
};
$('#mark').onclick=()=>{mode=mode==='mark'?'pick':'mark';text('notice',mode==='mark'?'Tap cards to cross them out or restore them.':'');render()};
$('#guess').onclick=()=>{mode=mode==='guess'?'pick':'guess';text('notice',mode==='guess'?'Tap the character you want to guess.':'');render()};
$('#openQuestions').onclick=()=>$('#questions').showModal();
$('#closeQuestions').onclick=()=>$('#questions').close();
$('#ask').onclick=()=>submit('ask',{trait:$('#question').value});
$('#customForm').onsubmit=e=>{
 e.preventDefault();const input=$('#customQuestion'),label=input.value.trim();if(!label||!canPlay(current()))return;
 if(practice){const trait=typedTrait(label);if(!trait){text('notice','In solo play, try “Are they wearing glasses?” or another question from the list.');return;}submit('ask',{trait});}
 else submit('custom',{label});
 input.value='';
};
$('#answerYes').onclick=()=>submit('answer',{answer:true});
$('#answerNo').onclick=()=>submit('answer',{answer:false});
$('#again').onclick=start;
$('#join').onclick=join;
$('#practice').onclick=()=>{practice=true;start()};
$('#ready').onclick=()=>{ready=!ready;track();renderLobby();if(ready)send('hello',{})};
$('#start').onclick=start;
function leave(){
 clearTimeout(botTimer);if(channel)client.removeChannel(channel);
 channel=null;connected=false;peer=null;ready=false;pending=null;practice=false;game=remote=null;
 clearDraft();show('menu');
}
$('#back').onclick=leave;$('#leaveLobby').onclick=leave;
function renderChat(){
 $('#chatForm').hidden=!info;
 text('chatCode',info?'Room '+room.code+' · shared with Pounce, Speed and Scrabble':'Join a room to chat');
 const box=$('#messages'),near=box.scrollHeight-box.scrollTop-box.clientHeight<90;
 box.innerHTML=info?messages.map(m=>`<div class="msg ${m.seat===info.seat?'mine':''}"><small>${esc(info.names[m.seat]||'Player')}</small>${esc(m.text)}</div>`).join('')||'<p class="fine">Say hello.</p>':'<p class="fine">Join a friend to open the shared chat.</p>';
 if(near)box.scrollTop=box.scrollHeight;
 if($('#chat').open)seen=messages.at(-1)?.ts||0;
 text('chatToggle','Chat');
}
$('#chatToggle').onclick=()=>{$('#chat').showModal();renderChat();poll()};
$('#chatClose').onclick=()=>$('#chat').close();
$('#chatForm').onsubmit=async e=>{
 e.preventDefault();const input=$('#message'),message=input.value.trim();
 if(!message||!info)return;
 e.submitter.disabled=true;
 try{absorb(await call('message',{id:hex(),text:message,after:messages.at(-1)?.ts||0}));input.value='';text('chatError','');send('ping',{});}
 catch(err){text('chatError',err.message)}
 finally{e.submitter.disabled=false}
};
setInterval(()=>{if(!document.hidden)poll()},3500);
setInterval(()=>{if(pending&&connected)send('move',{sid,move:pending});if(host()&&ready&&peer?.ready&&game)publish(lastResult)},1800);
renderChat();
