import {newGame,action,view,edges,botMove} from './rules.mjs';
import {savedTable} from '../your-move-sync.mjs';
const $=s=>document.querySelector(s);
const text=(id,value)=>{$('#'+id).textContent=value};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info, client, channel, connected=false, peer;
// Room games live on the server (your-move-games): `remote` is this phone's view, `over` whether it has finished.
let practice=false, game, remote=null, over=false, screen='menu', busy=false, botTimer;
let messages=[], seen=0, pollBusy=false;
const sid=hex();
const table=savedTable('dots',()=>room,data=>{remote=data.game;over=!!data.over;renderLobby();render();});
$('#name').value=room?.name||read('pounce.name','');

function show(id){
 screen=id;
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
const seat=()=>practice?0:info?.seat??0;
const current=()=>practice?game&&view(game,seat()):remote;
const canAct=g=>g&&g.winner===null&&!busy&&(practice||!!info);

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
  practice=false;info=null;messages=[];remote=null;over=false;table.forget();absorb(data);
  show('lobby');connect();
  await table.load();
  if(remote&&!over)show('game'),render(); // an unfinished saved game opens straight to the board
 }catch(e){text('notice',e.message)}
 finally{$('#join').disabled=false}
}
function send(event,payload){if(connected)channel.send({type:'broadcast',event,payload}).catch(()=>{})}
// Realtime is only a doorbell now: "moved" tells the other phone to fetch the saved game right away.
function connect(){
 if(!window.supabase)return;
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel('dots-v2-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+seat()}}});
 channel=ch;
 ch.on('presence',{event:'sync'},()=>{
  if(channel!==ch)return;
  peer=ch.presenceState()['s'+(1-seat())]?.[0];
  renderLobby();render();
 }).on('broadcast',{event:'moved'},()=>refresh())
 .on('broadcast',{event:'ping'},()=>poll())
 .subscribe(status=>{
  if(channel!==ch)return;
  connected=status==='SUBSCRIBED';
  if(connected)ch.track({sid,name:room.name}).catch(()=>{});
  renderLobby();render();
 });
}
function refresh(){if(info&&!practice&&!busy)table.load().catch(e=>text('notice',e.message))}
function renderLobby(){
 if(screen!=='lobby'||!info)return;
 text('roomLabel','Room '+room.code+(connected?'':' · Connecting…'));
 $('#seats').innerHTML=info.names.map((name,i)=>`<div class="seat"><b>${esc(name||'Waiting for a friend')}</b><span>${i===seat()?'You':peer?'Here now':'Away · can still play'}</span></div>`).join('');
 $('#ready').hidden=true;
 $('#start').hidden=false;
 $('#start').disabled=busy;
 text('start',remote&&!over?'Resume game':'Start game');
}

async function start(){
 if(practice){
  game=newGame([$('#name').value.trim()||'You','Computer'],1);
  show('game');render();runBot();return;
 }
 if(!info||busy)return;
 busy=true;renderLobby();text('notice','');
 try{await table.start();show('game');send('moved',{});}
 catch(e){text('notice',e.message)}
 finally{busy=false;renderLobby();render();}
}
async function submit(data){
 const state=current();
 if(!canAct(state)||state.turn!==seat())return;
 const move={...data,id:state.id,rev:state.rev,nonce:hex()};
 if(practice){
  try{action(game,seat(),move)}catch(e){return text('notice',e.message)}
  text('notice','');render();runBot();return;
 }
 busy=true;render();
 try{await table.move(move);text('notice','');send('moved',{});}
 catch(e){text('notice',e.message)}
 finally{busy=false;render();}
}
function runBot(){
 clearTimeout(botTimer);
 if(!practice||!game||screen!=='game'||game.winner!==null||game.turn!==1)return;
 botTimer=setTimeout(()=>{
  action(game,1,{...botMove(game),id:game.id,rev:game.rev});render();runBot();
 },480);
}
function render(){
 if(screen!=='game')return;
 const g=current();if(!g)return;
 const me=seat(),active=canAct(g)&&g.turn===me, done=g.winner!==null;
 text('mode',practice?'Solo practice':'Room '+room.code+(peer?' · both here':''));
 text('dotsTurn',done?(g.winner===-1?'It’s a tie!':g.winner===me?'You win!':g.names[g.winner]+' wins!'):busy?'Saving…':active?'Your turn · choose a line':g.names[g.turn]+'’s turn'+(practice||peer?'':' · saved for when they’re back'));
 $('#scoreboard').innerHTML=g.names.map((name,i)=>`<div><span>${esc(name)}${i===me?' · You':''}</span><strong>${g.scores[i]}</strong></div>`).join('');
 const position=(r,c)=>`--x:${10+c*20}%;--y:${10+r*20}%`;
 const squares=g.owners.map((owner,i)=>owner===null?'':`<span class="box p${owner}" style="${position(Math.floor(i/4)+.5,i%4+.5)}" aria-label="Box claimed by ${esc(g.names[owner])}">${esc(g.names[owner][0])}</span>`).join('');
 const dots=Array.from({length:25},(_,i)=>`<span class="dot" style="${position(Math.floor(i/5),i%5)}" aria-hidden="true"></span>`).join('');
 const lines=edges.map(({axis,r,c,id})=>{
  const owner=g.lines[id],filled=owner!==undefined;
  return `<button class="edge ${axis} ${filled?'p'+owner:''} ${g.last===id?'latest':''}" style="${position(r+(axis==='v'?.5:0),c+(axis==='h'?.5:0))}" data-edge="${id}" aria-label="${axis==='h'?'Horizontal':'Vertical'} line at row ${r+1}, column ${c+1}" ${active&&!filled?'':'disabled'}></button>`;
 }).join('');
 $('#grid').innerHTML=squares+lines+dots;
 $('#again').hidden=!done;
 $('#again').disabled=busy;
}
$('#grid').onclick=e=>{const b=e.target.closest('[data-edge]');if(b&&!b.disabled)submit({edge:b.dataset.edge})};
$('#again').onclick=start;
$('#join').onclick=join;
$('#practice').onclick=()=>{practice=true;start()};
$('#start').onclick=start;
function leave(){
 clearTimeout(botTimer);if(channel)client.removeChannel(channel);
 channel=null;connected=false;peer=null;busy=false;practice=false;game=remote=null;over=false;
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
setInterval(()=>{if(!document.hidden&&screen!=='menu')refresh()},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&screen!=='menu')refresh()});
renderChat();

// Rejoin the saved room on open (e.g. 25800852) so the code never has to be typed again, game or no game.
// A game in progress opens to the board; otherwise you land in the room's lobby. Back still goes to the menu.
if(room?.code){$('#code').value=room.code;if(room.secret&&$('#name').value.trim())join();}
