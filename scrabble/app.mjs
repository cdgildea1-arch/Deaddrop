import {points,premium,newGame,evaluate,action,view} from './rules.mjs';
import {makeTrie,choosePlay} from './bot.mjs';

const $=s=>document.querySelector(s);
const text=(id,value)=>{$('#'+id).textContent=value};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info, client, channel, connected=false, peer, ready=false;
let practice=false, game, remote, screen='menu', selected=null, draft=[], swaps=new Set(), swapping=false, pending=null, botTimer;
let dictionary, trie, messages=[], seen=0, pollBusy=false;
const sid=hex();
$('#name').value=room?.name||read('pounce.name','');

async function loadWords(){
 text('notice','Loading the word list…');
 try{
  const response=await fetch('enable1.txt.gz');
  if(!response.ok)throw Error('Word list failed to load.');
  const words=(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text()).trim().toUpperCase().split(/\s+/);
  if(words.length<170000)throw Error('Word list failed to load.');
  dictionary=new Set(words);
  $('#join').disabled=$('#practice').disabled=false;
  text('notice','');
 }catch{ text('notice','Could not load the word list. Refresh to try again.'); }
}
function show(id){
 screen=id;
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
const seat=()=>practice?0:info?.seat??0;
const host=()=>!practice&&info?.seat===0;
const current=()=>practice||host()?game&&view(game,seat()):remote;
const canPlay=g=>g&&!g.end&&g.turn===seat()&&!pending&&(practice||connected&&!!peer?.ready);
function clearDraft(){selected=null;draft=[];swaps.clear();swapping=false}

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
  const candidate={name,code,secret:room?.code===code?room.secret:hex()};
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
function saveGame(){if(host()&&game)save('scrabble.game.'+info.live,game)}
let lastResult;
function connect(){
 client??=window.supabase.createClient(API.split('/functions')[0],KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ch=client.channel('scrabble-v1-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+seat()}}});
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
  remote=p.game;
  if(p.result?.nonce===pending?.nonce&&pending){
   pending=null;
   if(p.result.error)text('notice',p.result.error);
  }
  if(screen==='lobby')show('game');
  if(changed){pending=null;clearDraft();text('notice','');}
  render();
 }).on('broadcast',{event:'move'},({payload:p})=>{
  if(!host()||!peer?.ready||p?.sid!==peer.sid||!game||typeof p.move?.nonce!=='string')return;
  if(lastResult?.nonce===p.move.nonce){publish(lastResult);return;}
  lastResult={nonce:p.move.nonce};
  try{action(game,1,p.move,dictionary);saveGame();}catch(e){lastResult.error=e.message}
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
 text('start',host()&&read('scrabble.game.'+info.live)?.end===false?'Resume game':'Start game');
}
function start(){
 if(!practice&&!(host()&&connected&&ready&&peer?.ready))return;
 const names=practice?[$('#name').value.trim()||'You']:info.names.slice(0,2);
 const count=practice?Math.max(1,+$('#bots').value):+$('#bots').value;
 for(let i=0;i<count;i++)names.push(['Clover','Ace'][i]+' (CPU)');
 const saved=host()?read('scrabble.game.'+info.live):null;
 game=saved&&!saved.end?saved:newGame(names);
 game.humans=practice?1:2;
 lastResult=null;clearDraft();show('game');saveGame();publish();render();runBot();
}
function submit(type,data={}){
 const state=current();
 if(!canPlay(state))return;
 const move={type,...data,id:state.id,rev:state.rev,nonce:hex()};
 if(type==='play'){
  try{evaluate(state,draft,dictionary)}catch(e){return text('notice',e.message)}
 }
 if(practice||host()){
  try{action(game,seat(),move,dictionary)}catch(e){return text('notice',e.message)}
  clearDraft();text('notice','');saveGame();publish();render();runBot();
 }else{
  pending=move;send('move',{sid,move});render();
 }
}
function runBot(){
 clearTimeout(botTimer);
 if(!game||game.end||game.turn<game.humans||screen!=='game'||(!practice&&(!peer?.ready||!connected)))return;
 botTimer=setTimeout(()=>{
  trie??=makeTrie(dictionary);
  const placed=choosePlay(game,dictionary,trie);
  const move=placed?{type:'play',placed}:game.bag.length>=7?{type:'exchange',indices:game.players[game.turn].rack.map((_,i)=>i)}:{type:'pass'};
  action(game,game.turn,{...move,id:game.id,rev:game.rev},dictionary);
  saveGame();publish();render();runBot();
 },500);
}
function render(){
 if(screen!=='game')return;
 const g=current();if(!g)return;
 const rack=g.players[seat()].rack, enabled=canPlay(g);
 text('bag',g.bag+' tiles in bag');
 $('#scores').innerHTML=g.players.map((p,i)=>`<div class="score ${!g.end&&i===g.turn?'active':''}"><span>${esc(p.name)}</span><b>${p.score}</b></div>`).join('');
 const tentative=new Map(draft.map(p=>[p.i,p]));
 $('#board').innerHTML=g.board.map((tile,i)=>{
  const d=tentative.get(i), letter=tile?.l??d?.l;
  const blank=tile?.blank??(d&&rack[d.k]==='?');
  return `<button type="button" data-cell="${i}" ${!enabled||tile||swapping?'disabled':''} class="${letter?'placed'+(d?' draft':'')+(blank?' blank':''):premium[i]+' premium'}" aria-label="Row ${1+Math.floor(i/15)}, column ${1+i%15}${letter?', '+letter:premium[i]?', '+premium[i]:''}">${letter?letter+`<small>${blank?0:points[letter]}</small>`:i===112?'★':premium[i]}</button>`;
 }).join('');
 $('#rack').innerHTML=rack.map((letter,i)=>`<button data-tile="${i}" class="tile ${selected===i||swaps.has(i)?'pick':''}" ${!enabled||draft.some(p=>p.k===i)?'disabled':''} aria-label="${letter==='?'?'Blank':letter+' worth '+points[letter]}">${letter==='?'?'□':letter}<small>${points[letter]}</small></button>`).join('');
 let label=pending?'Sending move…':!practice&&!peer?.ready?'Waiting for your friend to return.':g.turn===seat()?'Your turn':g.players[g.turn].name+'’s turn';
 if(g.end){
  const ranked=g.players.map((p,i)=>({...p,before:g.before[i]})).sort((a,b)=>b.score-a.score||b.before-a.before);
  const winners=ranked.filter(p=>p.score===ranked[0].score&&p.before===ranked[0].before);
  label=winners.length>1?'Tie: '+winners.map(p=>p.name).join(' and '):ranked[0].name+' wins with '+ranked[0].score+' points';
 }else if(enabled&&swapping)label='Select the tiles you want to exchange.';
 else if(enabled&&draft.length){try{label=evaluate(g,draft,dictionary).score+' points if played'}catch{}}
 text('turn',label);
 $('#play').hidden=g.end;
 $('#play').disabled=!enabled||(swapping?!swaps.size:!draft.length);
 text('play',swapping?'Swap tiles':'Play word');
 $('#undo').disabled=!enabled||(!draft.length&&!swapping);
 $('#exchange').disabled=!enabled||g.bag<7;
 $('#pass').disabled=!enabled;
 $('#history').innerHTML=g.history.slice().reverse().map(m=>`<li>${esc(m.name)} · ${esc(m.label)}${m.score?' · '+m.score+' pts':''}</li>`).join('');
}
$('#rack').onclick=e=>{
 const b=e.target.closest('[data-tile]');if(!b||b.disabled)return;
 const k=+b.dataset.tile;
 if(swapping){if(swaps.has(k))swaps.delete(k);else swaps.add(k)}
 else selected=selected===k?null:k;
 render();
};
$('#board').onclick=e=>{
 const b=e.target.closest('[data-cell]');if(!b||b.disabled)return;
 const i=+b.dataset.cell;
 if(draft.some(p=>p.i===i)){draft=draft.filter(p=>p.i!==i);render();return}
 if(selected===null)return text('notice','Select a tile from your rack first.');
 const k=selected;
 let l=current().players[seat()].rack[k];
 if(l==='?'){
  l=(prompt('Which letter should this blank represent?')||'').trim().toUpperCase();
  if(!/^[A-Z]$/.test(l))return;
 }
 draft.push({i,k,l});selected=null;text('notice','');render();
};
$('#play').onclick=()=>swapping?submit('exchange',{indices:[...swaps]}):submit('play',{placed:draft});
$('#undo').onclick=()=>{clearDraft();text('notice','');render()};
$('#exchange').onclick=()=>{clearDraft();swapping=true;render()};
$('#pass').onclick=()=>{if(confirm('Pass your turn?'))submit('pass')};
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
 text('chatCode',info?'Room '+room.code+' · shared with Pounce and Speed':'Join a room to chat');
 const box=$('#messages'),near=box.scrollHeight-box.scrollTop-box.clientHeight<90;
 box.innerHTML=info?messages.map(m=>`<div class="msg ${m.seat===info.seat?'mine':''}"><small>${esc(info.names[m.seat]||'Player')}</small>${esc(m.text)}</div>`).join('')||'<p class="fine">Say hello.</p>':'<p class="fine">Join a friend to open the shared chat.</p>';
 if(near)box.scrollTop=box.scrollHeight;
 if($('#chat').open)seen=messages.at(-1)?.ts||0;
 const unread=messages.filter(m=>m.seat!==info?.seat&&m.ts>seen).length;
 text('chatToggle',unread?'Chat ('+unread+')':'Chat');
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
renderChat();loadWords();
