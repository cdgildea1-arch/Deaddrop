import {directions,suit,rank,newGame,legal,action,view,botMove} from './rules.mjs';

const $=s=>document.querySelector(s);
const text=(id,value)=>{$('#'+id).textContent=value};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info, client, channel, connected=false, peer, ready=false;
let practice=false, game, remote, screen='menu', selected=new Set(), pending=null, botTimer;
let messages=[], seen=0, pollBusy=false;
const sid=hex();
$('#name').value=room?.name||read('pounce.name','');

function show(id){
 screen=id;
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
const seat=()=>practice?0:info?.seat??0;
const host=()=>!practice&&info?.seat===0;
const current=()=>practice||host()?game&&view(game,seat()):remote;
const canAct=g=>g&&g.phase!=='end'&&!pending&&(practice||connected&&!!peer?.ready);
function clearDraft(){selected.clear()}

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
function saveGame(){if(host()&&game)save('hearts.game.'+info.live,game)}
let lastResult;
const receipts=new Map();
function connect(){
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel('hearts-v1-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+seat()}}});
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
   pending=null;
   if(p.result.error)text('notice',p.result.error);
  }
  if(screen==='lobby')show('game');
  else if(!changed&&!acknowledged)return;
  if(changed&&(remote.phase!=='pass'||remote.passes[seat()]))clearDraft();
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
 text('start',host()&&read('hearts.game.'+info.live)?.phase && read('hearts.game.'+info.live).phase!=='end'?'Resume game':'Start match');
}
function start(){
 if(!practice&&!(host()&&connected&&ready&&peer?.ready))return;
 const saved=host()&&screen==='lobby'?read('hearts.game.'+info.live):null;
 const names=practice?[$('#name').value.trim()||'You','Clover','Ace','Ruby']:[...info.names.slice(0,2),'Clover','Ace'];
 game=saved&&saved.phase!=='end'?saved:newGame(names,practice?1:2);
 lastResult=null;receipts.clear();clearDraft();show('game');saveGame();publish();render();runBot();
}
function submit(type,data={}){
 const state=current();
 if(!canAct(state))return;
 const move={type,...data,id:state.id,rev:state.rev,nonce:hex()};
 if(practice||host()){
  try{action(game,seat(),move)}catch(e){return text('notice',e.message)}
  clearDraft();text('notice','');saveGame();publish();render();runBot();
 }else{
  pending=move;send('move',{sid,move});render();
 }
}
function runBot(){
 clearTimeout(botTimer);
 if(!game||screen!=='game'||(!practice&&(!connected||!peer?.ready)))return;
 const index=game.phase==='pass'?game.passes.findIndex((p,i)=>i>=game.humans&&!p):game.phase==='play'&&game.turn>=game.humans?game.turn:-1;
 if(index<0)return;
 botTimer=setTimeout(()=>{
  action(game,index,{...botMove(game,index),id:game.id,rev:game.rev});
  saveGame();publish();render();runBot();
 },game.phase==='play'&&!game.trick.length&&game.played?750:400);
}
const symbols=['♣','♦','♥','♠'], suits=['clubs','diamonds','hearts','spades'];
const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const short=c=>ranks[rank(c)]+symbols[suit(c)];
function card(c,enabled,table=false){
 return `<button data-card="${c}" class="card ${table?'shown':''} ${[1,2].includes(suit(c))?'red':''} ${selected.has(c)&&!table?'selected':''}" ${enabled?'':'disabled'} aria-label="${ranks[rank(c)]} of ${suits[suit(c)]}">${ranks[rank(c)]}<span class="suit">${symbols[suit(c)]}</span></button>`;
}
function render(){
 if(screen!=='game')return;
 const g=current();if(!g)return;
 const me=seat(), active=canAct(g), passing=g.phase==='pass', playable=g.phase==='play'&&g.turn===me, summary=g.phase==='summary'||g.phase==='end';
 text('mode',(practice?'Practice':'Room '+room.code)+' · Hand '+g.round);
 $('#scores').innerHTML=g.names.map((name,i)=>`<div class="score ${g.phase==='play'&&g.turn===i?'active':''}"><span>${esc(name)}${i===me?' · You':''}</span><b>${g.scores[i]}</b><small>${passing?(g.passes[i]?'Passed':'Choosing'):g.taken[i]+' this hand'}</small></div>`).join('');
 const display=g.trick.length?g.trick:g.last;
 text('tableLabel',passing?'PASSING '+directions[(g.round-1)%4].toUpperCase():summary?'HAND '+g.round+' COMPLETE':g.trick.length||!g.last.length?'CURRENT TRICK':'LAST TRICK');
 $('#trick').innerHTML=display.map(({seat,card:c})=>`<div class="play">${card(c,false,true)}<small>${esc(g.names[seat])}</small></div>`).join('')||'<span class="empty" aria-hidden="true"></span>';
 const label=g.phase==='end'?(g.winner===me?'You win!':g.names[g.winner]+' wins!'):pending?'Sending…':!practice&&!peer?.ready?'Waiting for your friend to return':passing?g.passes[me]?'Waiting for the other players':'Choose three cards to pass '+directions[(g.round-1)%4].toLowerCase():summary?'Scores updated':playable?'Your turn':g.names[g.turn]+'’s turn';
 text('turn',label);
 text('lastTrick',g.moon!==null?g.names[g.moon]+' shot the moon!':g.last.length&&g.trick.length?'Previous trick: '+g.last.map(e=>short(e.card)).join('  '):g.broken&&!summary?'Hearts are broken':'');
 const options=playable?legal(g,me):[];
 $('#hand').innerHTML=g.hands[me].map(c=>card(c,active&&(passing&&!g.passes[me]||options.includes(c)))).join('');
 $('#passCards').hidden=!passing||g.passes[me];$('#passCards').disabled=!active||selected.size!==3;
 text('passCards','Pass cards ('+selected.size+'/3)');
 $('#again').hidden=!summary||(!host()&&!practice);
 $('#again').disabled=!active&&g.phase!=='end'||!practice&&(!connected||!peer?.ready);
 text('again',g.phase==='end'?'Play again':'Next hand');
}
$('#hand').onclick=e=>{
 const b=e.target.closest('[data-card]');if(!b||b.disabled)return;
 const c=+b.dataset.card;
 if(current().phase==='pass'){
  if(!selected.delete(c)&&selected.size<3)selected.add(c);
  render();
 }else submit('play',{card:c});
};
$('#passCards').onclick=()=>submit('pass',{cards:[...selected]});
$('#again').onclick=()=>current().phase==='end'?start():submit('next');
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
 text('chatCode',info?'Room '+room.code+' · shared with the Central games':'Join a room to chat');
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
