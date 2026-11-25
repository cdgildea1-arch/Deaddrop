import {spectrums, bands} from './rules.mjs';
import {savedTable} from '../your-move-sync.mjs';
// Wavelength is a saved turn game: the server (your-move-games) keeps it, so either of you can move while the
// other is away. Realtime is only a doorbell ("moved") so the other phone refreshes right away when it's open.
const $=s=>document.querySelector(s);
const text=(id,value)=>{$('#'+id).textContent=value};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=null)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('');
const API='https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const KEY='sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
let room=read('pounce.room'), info=null, client, channel, peer=null, connected=false;
let g=null, over=false, screen='menu', busy=false, entering=false, dial=50, shownRev=null;
const sid=hex();
const table=savedTable('wavelength',()=>room,data=>{
 if(g?.id!==data.game?.id||g?.round!==data.game?.round)dial=50;
 g=data.game;over=!!data.over;
 if(screen==='lobby'&&g&&!over&&entering)show('game');
 renderLobby();render();
});
$('#name').value=room?.name||read('pounce.name','');

function show(id){
 screen=id;
 for(const name of ['menu','lobby','game'])$('#'+name).hidden=name!==id;
 text('notice','');
}
async function join(){
 const name=$('#name').value.trim(), code=$('#code').value.trim().toUpperCase();
 if(!name)return text('notice','Enter your name first.');
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
 const ch=client.channel('wavelength-v1-'+info.live,{config:{broadcast:{self:false},presence:{key:'s'+info.seat}}});
 channel=ch;
 ch.on('presence',{event:'sync'},()=>{if(channel!==ch)return;peer=ch.presenceState()['s'+(1-info.seat)]?.[0]||null;renderLobby();render();})
 .on('broadcast',{event:'moved'},()=>refresh())
 .subscribe(status=>{if(channel!==ch)return;connected=status==='SUBSCRIBED';if(connected)ch.track({sid,name:room.name}).catch(()=>{});renderLobby();});
}
function refresh(){if(info&&!busy&&screen!=='menu')table.load().catch(e=>text('notice',e.message))}
function renderLobby(){
 if(screen!=='lobby'||!info)return;
 text('roomLabel','Room '+room.code);
 $('#seats').innerHTML=info.names.map((name,i)=>`<div class="seat"><b>${esc(name||'Waiting for a friend')}</b><span>${i===info.seat?'You':peer?'Here now':'Away · can still play'}</span></div>`).join('');
 $('#start').disabled=busy;
 text('start',g&&!over?'Resume game':'Start game');
}
async function act(move){
 if(!g||busy)return;
 busy=true;render();
 try{await table.move({...move,id:g.id,rev:g.rev,nonce:hex()});text('notice','');send('moved');}
 catch(e){text('notice',e.message)}
 finally{busy=false;render();}
}
async function start(){
 if(!info||busy)return;
 busy=true;renderLobby();text('notice','');
 try{await table.start({});show('game');send('moved');}
 catch(e){text('notice',e.message)}
 finally{busy=false;renderLobby();render();}
}

// ---------- the dial: 0 is the far left of the scale, 100 the far right ----------
const C={x:100,y:102},R=92;
const at=(v,r=R)=>{const a=Math.PI*(1-v/100);return [C.x+r*Math.cos(a),C.y-r*Math.sin(a)]};
const fmt=n=>n.toFixed(2);
function wedge(from,to,cls){
 from=Math.max(0,from);to=Math.min(100,to);
 const [x1,y1]=at(from),[x2,y2]=at(to);
 return `<path class="${cls}" d="M${C.x} ${C.y}L${fmt(x1)} ${fmt(y1)}A${R} ${R} 0 0 1 ${fmt(x2)} ${fmt(y2)}Z"/>`;
}
function target(t){return [...bands].reverse().map(([w,p])=>wedge(t-w,t+w,'b'+p)).join('')}
function needle(v,cls='needle'){const [x,y]=at(v,R-8);return `<line class="${cls}" x1="${C.x}" y1="${C.y}" x2="${fmt(x)}" y2="${fmt(y)}"/>`}
function drawDial({show:t=null,guess=null,live=false}){
 const face=`<path class="face" d="M${C.x-R} ${C.y}A${R} ${R} 0 0 1 ${C.x+R} ${C.y}Z"/>`;
 $('#dial').innerHTML=face+(t===null?'':target(t))+(guess===null?'':needle(guess,live?'needle guess':'needle'))+`<circle class="hub" cx="${C.x}" cy="${C.y}" r="7"/>`;
 $('#dial').classList.toggle('live',live);
}
function pointTo(event){
 const box=$('#dial').getBoundingClientRect();
 const x=(event.clientX-box.left)/box.width*200, y=(event.clientY-box.top)/box.height*112;
 const angle=Math.atan2(Math.max(0,C.y-y),x-C.x);
 dial=Math.round(Math.min(100,Math.max(0,100*(1-angle/Math.PI))));
 $('#slider').value=dial;render();
}
let dragging=false;
$('#dial').addEventListener('pointerdown',e=>{if(!$('#dial').classList.contains('live'))return;dragging=true;$('#dial').setPointerCapture(e.pointerId);pointTo(e)});
$('#dial').addEventListener('pointermove',e=>{if(dragging)pointTo(e)});
$('#dial').addEventListener('pointerup',()=>{dragging=false});
$('#dial').addEventListener('pointercancel',()=>{dragging=false});
$('#slider').oninput=()=>{dial=+$('#slider').value;render()};

// A small dial for the reveal: where the target was, and where the guess landed.
function miniDial(h){
 return `<svg class="mini" viewBox="0 0 200 104" aria-label="Target ${h.target}, guess ${h.guess}"><path class="face" d="M${C.x-R} ${C.y}A${R} ${R} 0 0 1 ${C.x+R} ${C.y}Z"/>${target(h.target)}${needle(h.guess,'needle')}<circle class="hub" cx="${C.x}" cy="${C.y}" r="7"/></svg>`;
}
function lastRound(h){
 if(!h)return '';
 const [l,r]=spectrums[h.card];
 const word=['Missed','','Close','Nice','Bullseye!'][h.points];
 return `<span class="pts">+${h.points}</span><b>${esc(word||'Missed')}</b> · ${esc(l)} ↔ ${esc(r)}<br>${esc(g.names[h.psychic])}’s clue: “${esc(h.clue)}”${miniDial(h)}`;
}
function render(){
 if(screen!=='game'||!g)return;
 const me=info.seat, psychic=g.psychic===me, [l,r]=spectrums[g.card], other=g.names[1-me]||'your partner';
 text('mode','Room '+room.code+(peer?' · both here':''));
 text('roundLabel',g.phase==='end'?'Final score':'Round '+g.round+' of '+g.rounds);
 text('score',g.score+' / '+g.maxScore);
 const ending=g.phase==='end';
 text('left',ending?'':l);text('right',ending?'':r);
 $('#clueForm').hidden=!(g.phase==='clue'&&psychic);
 $('#guessBox').hidden=!(g.phase==='guess'&&!psychic);
 $('#clueShown').hidden=!(g.phase==='guess');
 text('clueShown',g.clue?'“'+g.clue+'”':'');
 $('#swap').disabled=busy||g.swaps<1;
 text('swap',g.swaps?'Different card ('+g.swaps+')':'No swaps left');
 $('#sendClue').disabled=$('#lock').disabled=busy;
 $('#again').hidden=!ending;$('#again').disabled=busy;
 let status;
 if(ending){
  const pct=g.score/g.maxScore;
  status=pct>=.75?'Totally in sync.':pct>=.5?'Pretty well matched.':pct>=.25?'Getting there.':'Different wavelengths tonight.';
  drawDial({});
 }else if(g.phase==='clue'){
  status=psychic?'Your clue. Point '+other+' to the bullseye.':'Waiting on '+other+'’s clue';
  drawDial({show:psychic?g.target:null});
 }else{
  status=psychic?'Waiting on '+other+' to turn the dial':'Your guess. Where does the clue land?';
  drawDial(psychic?{show:g.target}:{guess:dial,live:!busy});
 }
 if(busy)status='Saving…';
 text('status',status);
 const recent=g.history.at(-1);
 $('#last').hidden=!recent;
 $('#last').innerHTML=ending?`<b>${g.history.length} rounds</b><ul class="history">${g.history.map(h=>`<li><span>${esc(spectrums[h.card].join(' ↔ '))} · “${esc(h.clue)}”</span><b>+${h.points}</b></li>`).join('')}</ul>`:recent?'<small>Last round</small><br>'+lastRound(recent):'';
}
$('#clueForm').onsubmit=e=>{e.preventDefault();const clue=$('#clue').value.trim();if(!clue)return text('notice','Type a clue first.');act({type:'clue',clue}).then(()=>{if(g?.phase!=='clue')$('#clue').value=''})};
$('#swap').onclick=()=>act({type:'swap'});
$('#lock').onclick=()=>act({type:'guess',value:dial});
$('#join').onclick=join;
$('#start').onclick=start;
$('#again').onclick=start;
function leave(){$('#code').value='';if(channel)client.removeChannel(channel);channel=null;connected=false;peer=null;g=null;over=false;info=null;table.forget();show('menu')}
$('#back').onclick=leave;$('#leaveLobby').onclick=leave;
setInterval(()=>{if(!document.hidden)refresh()},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});

// You always type the room code (e.g. 25800852) to get in. With a saved room the button reads "Continue";
// typing the same code keeps your seat, and a game in progress opens straight to the board.
if(room?.code){$('#code').value='';$('#code').placeholder='Enter room code to continue';$('#join').textContent='Continue';}
