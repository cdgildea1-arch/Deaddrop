import {newGame,action,view} from './rules.mjs';
import {savedTable} from '../your-move-sync.mjs';
const $=s=>document.querySelector(s);
const text=(id,value)=>{$('#'+id).textContent=value};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info, client, channel, connected=false, peer, ready=false;
let game, remote, screen='menu', pending=null;
let messages=[], seen=0, pollBusy=false;
const sid=hex();
// ---------- saved room games (your-move-games) ----------
// The server keeps the game, so either phone can move while the other is away. Realtime "moved" is just a doorbell.
let over=false, botTurn=-1, entering=false;
const table=savedTable('duet',()=>room,data=>{
 const changed=remote?.id!==data.game?.id||remote?.rev!==data.game?.rev;
 
 remote=data.game;over=!!data.over;botTurn=data.botTurn??-1;
 if(screen==='lobby'&&remote&&!over&&entering)show('game');
 renderLobby();render();roomBot();
});
async function enterRoom(){entering=true;try{await table.load()}catch(e){text('notice',e.message)}finally{entering=false}}
function refresh(){if(info&&!practice&&!pending&&screen!=='menu')table.load().catch(e=>text('notice',e.message))}
async function roomStart(options){
 if(!info||pending)return;
 pending={};renderLobby();text('notice','');
 try{await table.start(options);show('game');send('moved',{});}
 catch(e){text('notice',e.message)}
 finally{pending=null;renderLobby();render();}
}
async function roomMove(move){
 pending=move;render();
 try{await table.move(move);text('notice','');send('moved',{});}
 catch(e){text('notice',e.message)}
 finally{pending=null;render();}
}
function roomBot(){}

$('#name').value=room?.name||read('pounce.name','');

function show(id){
 screen=id;
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
const seat=()=>info?.seat??0;
const host=()=>false; // room games are kept on the server (your-move-games), not on a host phone
const current=()=>host()?game&&view(game,seat()):remote;
const canAct=g=>g&&!g.outcome&&!pending&&!!info;


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
  $('#join').disabled=true;text('notice','Joining room '+code+'…');
 try{
  const stored=read('pounce.room');
  const candidate={name,code,secret:stored?.code===code?stored.secret:hex()};
  const data=await call('join',candidate);
  room=candidate;save('pounce.room',room);save('pounce.name',name);
  info=null;messages=[];remote=null;over=false;table.forget();absorb(data);
  show('lobby');connect();await enterRoom();
 }catch(e){text('notice',e.message)}
 finally{$('#join').disabled=false}
}
function send(event,payload){if(connected)channel.send({type:'broadcast',event,payload}).catch(()=>{})}
function track(){if(connected)channel.track({sid,name:room.name,ready}).catch(()=>{})}
function publish(result){if(host()&&game)send('state',{sid,game:view(game,1),result})}
function saveGame(){if(host()&&game)save('duet.game.'+info.live,game)}
let lastResult;
const receipts=new Map();
function connect(){
 if(!window.supabase)return;
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel('duet-v2-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+seat()}}});
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
  if(remote?.id!==p.game.id)pending=null;
  remote=p.game;
  const acknowledged=pending&&p.result?.nonce===pending.nonce;
  if(acknowledged){
   pending=null;
   if(p.result.error)text('notice',p.result.error);
  }
  if(screen==='lobby')show('game');
  else if(!changed&&!acknowledged)return;
  render();
 }).on('broadcast',{event:'move'},({payload:p})=>{
  if(!host()||!peer?.ready||p?.sid!==peer.sid||!game||typeof p.move?.nonce!=='string')return;
  if(receipts.has(p.move.nonce)){publish(receipts.get(p.move.nonce));return;}
  lastResult={nonce:p.move.nonce};
  try{action(game,1,p.move);saveGame();}catch(e){lastResult.error=e.message}
  receipts.set(p.move.nonce,lastResult);
  publish(lastResult);render();
 }).on('broadcast',{event:'moved'},()=>refresh())
 .on('broadcast',{event:'ping'},()=>poll())
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
 $('#seats').innerHTML=info.names.map((name,i)=>`<div class="seat"><b>${esc(name||'Waiting for a friend')}</b><span>${i===seat()?'You':peer?'Here now':'Away · can still play'}</span></div>`).join('');
 text('ready',ready?'Ready · tap to cancel':'I’m ready');
 $('#ready').hidden=true;$('#start').hidden=false;
 $('#start').disabled=!!pending;
 text('start',remote&&!over?'Resume game':'Start game');
}

function start(){
 return roomStart({turns:+$('#turns').value});
 const saved=host()&&screen==='lobby'?read('duet.game.'+info.live):null;
 const names=info.names.slice(0,2);
 game=saved&&!saved.outcome?saved:newGame(names,+$('#turns').value);
 lastResult=null;receipts.clear();show('game');saveGame();publish();render();
}
function submit(data){
 const state=current();
 if(!canAct(state))return;
 const move={...data,id:state.id,rev:state.rev,nonce:hex()};
 if(host()){
  try{action(game,seat(),move)}catch(e){return text('notice',e.message)}
  text('notice','');saveGame();publish();render();
 }else{
  roomMove(move);
 }
}
function render(){
 if(screen!=='game')return;
 const g=current();if(!g)return;
 const me=seat(), active=canAct(g), giving=g.phase==='clue'&&g.giver===me;
 const guessing=g.canGuess&&(g.phase==='final'||g.phase==='guess'&&g.giver!==me);
 const showKey=g.giver===me&&g.phase!=='final'&&!g.outcome;
 const headline=g.outcome==='won'?'Mission complete!':g.outcome==='lost'?'Mission failed':g.phase==='final'?'Sudden death':g.phase==='clue'?(giving?'Give your partner a clue':g.names[g.giver]+' is choosing a clue'):g.clue.word.toUpperCase()+' · '+g.clue.count;
 const meta=g.outcome?'':g.phase==='final'?'Use earlier clues. Any wrong guess ends the game.':g.phase==='guess'?(g.giver===me?g.names[1-me]+' is guessing':'Your turn to guess'):showKey?'Green = agent · black = assassin':'Your partner can see their key';
 $('#mission').innerHTML=`<strong>${esc(headline)}</strong><span>${esc(meta)}${meta?' · ':''}${g.found.length}/15 agents · ${g.turns} turns left</span>`;
 text('mode','Room '+room.code);
 $('#words').innerHTML=g.words.map((word,i)=>{
  const found=g.found.includes(i),missed=g.misses[g.phase==='final'?me:1-g.giver].includes(i);
  const style=found?'found':showKey&&g.key[i]==='A'?'key-agent':showKey&&g.key[i]==='X'?'key-danger':'';
  const status=found?' · agent found':showKey&&g.key[i]==='A'?' · agent':showKey&&g.key[i]==='X'?' · assassin':'';
  return `<button class="word ${style} ${missed?'missed':''}" data-index="${i}" aria-label="${word}${status}" ${active&&guessing&&!found&&!missed?'':'disabled'}>${word}</button>`;
 }).join('');
 $('#clue').hidden=!(active&&giving);
 $('#stop').hidden=!(active&&guessing&&g.phase==='guess'&&g.guesses>0);
 $('#again').hidden=!g.outcome;
 $('#again').disabled=!!pending;
 $('#history').innerHTML=g.history.map(line=>`<li>${esc(line)}</li>`).join('');
}
$('#clueCount').innerHTML=Array.from({length:9},(_,i)=>`<option>${i+1}</option>`).join('');
$('#clue').onsubmit=e=>{
 e.preventDefault();const input=$('#clueWord');
 const clue=input.value.trim(),g=current();
 if(!/^\p{L}+$/u.test(clue)||g.words.some((w,i)=>!g.found.includes(i)&&w===clue.toUpperCase()))return text('notice','Use one word that is not on the board.');
 submit({type:'clue',clue,count:+$('#clueCount').value});
 input.value='';
};
$('#words').onclick=e=>{const b=e.target.closest('[data-index]');if(b&&!b.disabled)submit({type:'guess',index:+b.dataset.index})};
$('#stop').onclick=()=>submit({type:'stop'});
$('#again').onclick=start;
$('#join').onclick=join;
$('#ready').onclick=()=>{ready=!ready;track();renderLobby();if(ready)send('hello',{})};
$('#start').onclick=start;
function leave(){
 over=false;table.forget();
 if(channel)client.removeChannel(channel);
 channel=null;connected=false;peer=null;ready=false;pending=null;game=remote=null;
 show('menu');
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
// Backup for a missed doorbell: check the saved game every few seconds while it's on screen.
setInterval(()=>{if(!document.hidden)refresh()},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
renderChat();

// Rejoin the saved room on open (e.g. 25800852) so the code never has to be typed again, game or no game.
// A game in progress opens to the board; otherwise you land in the room's lobby. Back still goes to the menu.
if(room?.code){$('#code').value=room.code;if(room.secret&&$('#name').value.trim())join();}
