import {colors,labels,newGame,legal,action,view,botMove} from './rules.mjs';
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
let practice=false, game, remote, screen='menu', pending=null, botTimer;
let messages=[], seen=0, pollBusy=false;
const sid=hex();
// ---------- saved room games (your-move-games) ----------
// The server keeps the game, so either phone can move while the other is away. Realtime "moved" is just a doorbell.
let over=false, botTurn=-1, entering=false;
const table=savedTable('uno',()=>room,data=>{
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
const seat=()=>practice?0:info?.seat??0;
const host=()=>false; // room games are kept on the server (your-move-games), not on a host phone
const current=()=>practice||host()?game&&view(game,seat()):remote;
const canAct=g=>g&&g.winner===null&&!pending&&(practice||!!info);


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
async function join(auto=false){
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
  // Reopening the app: check for a game in progress before showing the lobby, so you land right back at the table.
  if(auto)$('#lobby').style.visibility='hidden';
  show('lobby');connect();await enterRoom();$('#lobby').style.visibility='';
 }catch(e){text('notice',e.message)}
 finally{$('#join').disabled=false;$('#lobby').style.visibility=''}
}
function send(event,payload){if(connected)channel.send({type:'broadcast',event,payload}).catch(()=>{})}
function track(){if(connected)channel.track({sid,name:room.name,ready}).catch(()=>{})}
function publish(result){if(host()&&game)send('state',{sid,game:view(game,1),result})}
function saveGame(){if(host()&&game)save('uno.game.'+info.live,game)}
let lastResult;
const receipts=new Map();
function connect(){
 if(!window.supabase)return;
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel('uno-v2-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+seat()}}});
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
  publish(lastResult);render();runBot();
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
 text('start',remote&&!over?'Resume game':'Deal cards');
}
const symbols={skip:'⊘',reverse:'↻',two:'+2',wild:'✦',four:'+4',swap:'⇄',party:'+1'};
function start(){
 if(!practice)return roomStart({extras:$('#extras').checked});
 const saved=host()&&screen==='lobby'?read('uno.game.'+info.live):null;
 const names=practice?[$('#name').value.trim()||'You','Clover','Ace','Ruby']:[...info.names.slice(0,2),'Clover','Ace'];
 game=saved&&saved.winner===null?saved:newGame(names,practice?1:2,$('#extras').checked);
 lastResult=null;receipts.clear();show('game');saveGame();publish();render();runBot();
}
function submit(type,data={}){
 const state=current();
 if(!canAct(state)||state.turn!==seat())return;
 const move={type,...data,id:state.id,rev:state.rev,nonce:hex()};
 if(practice||host()){
  try{action(game,seat(),move)}catch(e){return text('notice',e.message)}
  text('notice','');saveGame();publish();render();runBot();
 }else{
  roomMove(move);
 }
}
function runBot(){
 clearTimeout(botTimer);
 if(!game||screen!=='game'||game.winner!==null||game.turn<game.humans||!practice)return;
 botTimer=setTimeout(()=>{
  const i=game.turn;
  action(game,i,{...botMove(game,i),id:game.id,rev:game.rev});
  saveGame();publish();render();runBot();
 },640);
}
function cardMarkup(c,enabled){
 const glyph=symbols[c.value]||c.value;
 const name=[c.color,labels[c.value]||c.value].filter(Boolean).join(' ');
 const sym=/^\d$/.test(c.value)?'':' sym';
 return `<button class="card ${c.color||'wild'}${sym}" data-card="${c.id}" data-glyph="${glyph}" aria-label="${name}" ${enabled?'':'disabled'}><small>${glyph}</small><strong>${glyph}</strong></button>`;
}
// Fan the hand: overlap cards to fit the width and tilt them around the middle.
function layoutHand(){
 const box=$('#hand'),cards=[...box.children],n=cards.length;
 if(!n)return;
 const w=cards[0].offsetWidth,room=box.clientWidth-12-w*.35;
 box.style.setProperty('--gap',(n>1?Math.min(6,(room-n*w)/(n-1)):0)+'px');
 const tilt=Math.min(4.5,24/Math.max(n-1,1));
 cards.forEach((c,i)=>{const o=i-(n-1)/2;c.style.setProperty('--r',(o*tilt)+'deg');c.style.setProperty('--y',(o*o*tilt*.32)+'px')});
}
addEventListener('resize',layoutHand);
let lastTop;
const handPageSize=10;
let handPage=0,lastGameId;
function render(){
 if(screen!=='game')return;
 const g=current();if(!g)return;
 const me=seat(), active=canAct(g)&&g.turn===me, over=g.winner!==null;
 text('mode',practice?'Solo practice':'Room '+room.code);
 $('#game').dataset.turn=active?'me':'wait';
 $('.table').dataset.color=g.color;
 $('#players').innerHTML=g.names.map((name,i)=>`<div class="player p${i%4} ${!over&&i===g.turn?'on':''} ${g.counts[i]===1?'last':''}"><i aria-hidden="true">${esc([...String(name).trim()][0]||'?').toUpperCase()}</i><span>${esc(name)}${i===me?' · You':''}</span><b>${g.counts[i]}</b></div>`).join('');
 $('#discard').innerHTML=cardMarkup(g.top,false);
 if(lastTop!==undefined&&lastTop!==g.top.id)$('#discard').firstElementChild.classList.add('fresh');
 lastTop=g.top.id;
 $('#activeColor').className=g.color;text('activeColor',g.color[0].toUpperCase()+g.color.slice(1));
 text('direction',g.direction===1?'↻ Clockwise':'↺ Counterclockwise');
 text('turn',over?(g.winner===me?'You win!':g.names[g.winner]+' wins!'):pending?'Sending…':active?'Your turn':g.names[g.turn]+'’s turn');
 text('last',g.last);
 const hand=g.hands[me],pages=Math.max(1,Math.ceil(hand.length/handPageSize));
 if(lastGameId!==g.id){handPage=0;lastGameId=g.id;}
 const drawnIndex=g.drawn===null?-1:hand.findIndex(c=>c.id===g.drawn);
 if(drawnIndex>=0&&active)handPage=Math.floor(drawnIndex/handPageSize);
 handPage=Math.min(handPage,pages-1);
 $('#handPager').hidden=pages===1;
 $('#handPrev').disabled=handPage===0||drawnIndex>=0;
 $('#handNext').disabled=handPage===pages-1||drawnIndex>=0;
 text('handPage',(handPage+1)+' / '+pages+' · '+hand.length+' cards');
 $('#hand').innerHTML=hand.slice(handPage*handPageSize,(handPage+1)*handPageSize).map(c=>cardMarkup(c,active&&legal(g,me,c))).join('');
 layoutHand();
 $('#draw').disabled=!active||g.drawn!==null;
 $('#pass').hidden=!active||g.drawn===null;
 $('#call').disabled=!active||g.counts[me]!==2||g.called;
 text('call',g.called&&g.turn===me?'UNO called':'Call UNO!');
 $('#again').hidden=!over;
 $('#again').disabled=!!pending;
}
let wildCard=null;
$('#hand').onclick=e=>{
 const b=e.target.closest('[data-card]');if(!b||b.disabled)return;
 const state=current(), c=state.hands[seat()].find(card=>card.id===+b.dataset.card);
 if(c.color){submit('play',{card:c.id});return}
 wildCard=c.id;
 const swap=c.value==='swap'&&state.counts[seat()]>1;
 text('wildTitle',swap?'Swap hands & choose a color':'Choose a color');
 $('#target').hidden=$('#targetLabel').hidden=!swap;
 $('#target').innerHTML=state.names.map((name,i)=>i===seat()?'':`<option value="${i}">${esc(name)} · ${state.counts[i]} cards</option>`).join('');
 $('#wild').showModal();
};
$('#colorButtons').innerHTML=colors.map(color=>`<button type="button" class="color ${color}" data-color="${color}">${color[0].toUpperCase()+color.slice(1)}</button>`).join('');
$('#colorButtons').onclick=e=>{
 const b=e.target.closest('[data-color]');if(!b)return;
 $('#wild').close();submit('play',{card:wildCard,color:b.dataset.color,target:+$('#target').value});
};
$('#wildForm').onsubmit=e=>e.preventDefault();
$('#closeWild').onclick=()=>$('#wild').close();
$('#call').onclick=()=>submit('call');
$('#handPrev').onclick=()=>{handPage--;render()};
$('#handNext').onclick=()=>{handPage++;render()};
$('#draw').onclick=()=>submit('draw');
$('#pass').onclick=()=>submit('pass');
$('#again').onclick=start;
$('#join').onclick=()=>join();
$('#practice').onclick=()=>{practice=true;start()};
$('#ready').onclick=()=>{ready=!ready;track();renderLobby();if(ready)send('hello',{})};
$('#start').onclick=start;
function leave(){$('#code').value='';
 over=false;table.forget();
 clearTimeout(botTimer);if(channel)client.removeChannel(channel);
 channel=null;connected=false;peer=null;ready=false;pending=null;practice=false;game=remote=null;
 show('menu');
}
$('#back').onclick=leave;$('#leaveLobby').onclick=leave;
const readLabel = at => { const d = new Date(at), t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); return 'Read ' + (d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + t); };
function renderChat(){
 $('#chatForm').hidden=!info;
 text('chatCode',info?'Room '+room.code+' · shared with the Central games':'Join a room to chat');
 const box=$('#messages'),near=box.scrollHeight-box.scrollTop-box.clientHeight<90;
 // One-way read receipt: only the parent's phone gets info.theirRead from the server.
 const rUp=info?.theirRead?.upTo||0,rId=rUp?messages.filter(m=>m.seat===info.seat&&m.ts<=rUp).at(-1)?.id:null;
 box.innerHTML=info?messages.map(m=>`<div class="msg ${m.seat===info.seat?'mine':''}"><small>${esc(info.names[m.seat]||'Player')}</small>${esc(m.text)}</div>`+(m.id===rId?`<p class="readrcpt">${esc(readLabel(info.theirRead.at))}</p>`:'')).join('')||'<p class="fine">Say hello.</p>':'<p class="fine">Join a friend to open the shared chat.</p>';
 if(near)box.scrollTop=box.scrollHeight;
 if($('#chat').open){const ts=messages.at(-1)?.ts||0;if(ts>seen&&info)call('read',{thread:'room',ts}).catch(()=>{});seen=ts;}
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
// You always type the room code (e.g. 25800852) to get in. With a saved room the button reads "Continue";
// typing the same code keeps your seat, and a game in progress opens straight to the board.
if(room?.code){$('#code').value='';$('#code').placeholder='Enter room code to continue';$('#join').textContent='Continue';}
