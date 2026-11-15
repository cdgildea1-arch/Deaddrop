import {read, token, joinRoom, connect} from '../mini/room.mjs';
import {round, act, publicView, ink, validLine} from './rules.mjs';
const $=id=>document.getElementById(id);
const set=(id,text)=>{$(id).textContent=text};
const canvas=$('canvas'), ctx=canvas.getContext('2d');
let room, net, connected=false, peer, session, game, remote, draft, preview, pending, receipt;
const received=new Set();
let pointer=null, color=ink[0], lastPreview=0, nextTick=0, displayedChoices='';
const host=()=>room?.seat===0;
const available=()=>connected&&Boolean(peer);
const current=()=>host()?game&&publicView(game,0):remote;
const notice=text=>{set('notice',text);$('notice').hidden=!text};
function screen(playing){
 $('entry').hidden=playing;
 $('play').hidden=!playing;
}
$('name').value=read('pounce.name')||read('pounce.room')?.name||'';
$('joinForm').onsubmit=async event=>{
 event.preventDefault();
 const name=$('name').value.trim(), code=$('code').value.trim().toUpperCase();
 if(!name||!/^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(code))return notice('Enter your name and a valid game code.');
 if(!window.supabase)return notice('Live play couldn’t load. Reload and try again.');
 event.submitter.disabled=true;
 notice('Joining your friend…');
 try{
  room=await joinRoom(code,name);
  screen(true);notice('');
  wire();
  render();
 }catch(error){notice(error.message)}
 finally{event.submitter.disabled=false}
};
$('leave').onclick=()=>{
 net?.close();room=net=peer=session=game=remote=draft=preview=pending=receipt=null;
 connected=false;pointer=null;$('code').value='';$('guess').value='';screen(false);notice('');
};
function publish(){
 if(host()&&game)net?.send('state',{session,round:publicView(game,1),receipt});
}
function start(){
 const next=game&&game.number<6;
 if(!next)session=token();
 game=round(next?game.number+1:1,next?game.scores:[0,0],next?game.used:[]);
 draft=preview=receipt=null;received.clear();
 publish();render();
}
function apply(seat,action){
 if(!act(game,seat,action))return false;
 preview=null;
 if(game.phase==='result'){draft=null;pointer=null;}
 return true;
}
function wire(){
 net=connect('quick-draw',room,{
  connection(link,other){
   connected=link;peer=other;
   if(available()){publish();net?.send('hello',{});}
   render();
  },
  hello(){publish()},
  state(message){
   if(host())return;
   if(message.sync){
    const {number,rev}=message.sync;
    if(!remote||session!==message.session||number!==remote.number||rev>remote.rev)net.send('hello',{});
    return;
   }
   if(message.preview){
    if(!remote||remote.phase!=='draw'||message.session!==session||message.number!==remote.number||message.rev!==remote.rev||!validLine(message.preview))return;
    preview=message.preview;paint();return;
   }
   const incoming=message.round;
   if(!incoming)return;
   const same=remote&&session===message.session&&remote.number===incoming.number;
   if(same&&remote.rev>incoming.rev)return;
   if(!same||remote.rev!==incoming.rev)preview=null;
   if(!same||incoming.phase!=='draw'){draft=null;pointer=null;}
   if(!same||(pending&&message.receipt?.nonce===pending.nonce))pending=null;
   session=message.session;remote=incoming;render();
  },
  move(message){
   if(!host()||!game||message.session!==session||!available())return;
   if(message.preview){
    if(game.phase==='draw'&&game.drawer===1&&game.number===message.number&&game.rev===message.rev&&validLine(message.preview)){
     preview=message.preview;paint();
    }
    return;
   }
   if(!message.action||typeof message.nonce!=='string')return;
   if(!received.has(message.nonce)){
    received.add(message.nonce);apply(1,message.action);
   }
   receipt={nonce:message.nonce};
   publish();render();
  }
 });
}
function submit(action){
 if(!available()||!current()||pending)return;
 action={...action,number:current().number};
 if(host()){
  apply(0,action);publish();
 }else{
  pending={session,action,nonce:token()};
  net.send('move',pending);
 }
 render();
}
setInterval(()=>{
 if(!room||document.hidden)return;
 if(host()&&game?.phase==='draw'&&Date.now()>=game.end){apply(game.drawer,{type:'timeout',number:game.number});publish();}
 if(available()&&Date.now()>nextTick){
  nextTick=Date.now()+1500;
  if(pending)net.send('move',pending);
  else if(host()&&game)net.send('state',{session,sync:{number:game.number,rev:game.rev}});
  else if(!host()&&!remote)net.send('hello',{});
 }
 renderClock();
},200);

function draw(line){
 ctx.strokeStyle=ctx.fillStyle=line.color;ctx.lineWidth=line.color===ink.at(-1)?19:6;
 ctx.lineJoin=ctx.lineCap='round';ctx.beginPath();
 const [start,...rest]=line.points;
 const [x,y]=[start[0]*canvas.width,start[1]*canvas.height];
 if(!rest.length){ctx.arc(x,y,ctx.lineWidth/2,0,2*Math.PI);ctx.fill();return;}
 ctx.moveTo(x,y);
 for(const [x,y] of rest)ctx.lineTo(x*canvas.width,y*canvas.height);
 ctx.stroke();
}
function paint(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 for(const line of current()?.lines||[])draw(line);
 const live=draft||pending?.action.line||preview;
 if(live)draw(live);
}
function point(event){
 const r=canvas.getBoundingClientRect(), clamp=n=>Math.round(Math.min(1,Math.max(0,n))*1000)/1000;
 return [clamp((event.clientX-r.left)/r.width),clamp((event.clientY-r.top)/r.height)];
}
canvas.onpointerdown=event=>{
 if(canvas.dataset.drawing!=='true'||pointer!==null)return;
 pointer=event.pointerId;draft={color,points:[point(event)]};lastPreview=0;
 canvas.setPointerCapture(pointer);paint();
};
canvas.onpointermove=event=>{
 if(pointer!==event.pointerId||!draft||draft.points.length>=200)return;
 const next=point(event), before=draft.points.at(-1);
 if(Math.hypot(next[0]-before[0],next[1]-before[1])<.003)return;
 draft.points.push(next);paint();
 if(Date.now()-lastPreview>100){
  lastPreview=Date.now();const state=current();
  net?.send(host()?'state':'move',{session,preview:draft,number:state.number,rev:state.rev});
 }
};
function finishStroke(event){
 if(pointer!==event.pointerId||!draft)return;
 const line=draft;draft=null;pointer=null;
 submit({type:'line',line});
}
canvas.onpointerup=canvas.onpointercancel=finishStroke;
for(const [index,value] of ink.entries()){
 const swatch=document.createElement('button');
 swatch.type='button';swatch.style.setProperty('--swatch',value);
 swatch.setAttribute('aria-label',['Black','Pink','Orange','Green','Blue','Purple','Eraser'][index]);
 swatch.onclick=()=>{color=value;updateColors()};
 $('colors').append(swatch);
}
function updateColors(){[...$('colors').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(color===ink[i])))}
updateColors();
$('undo').onclick=()=>submit({type:'undo'});
$('clear').onclick=()=>submit({type:'clear'});
$('guessForm').onsubmit=event=>{
 event.preventDefault();const text=$('guess').value.trim();
 if(text&&!pending&&available()){submit({type:'guess',text});$('guess').value='';}
};
const mainAction=$('mainAction');
function action(label,handler){mainAction.hidden=!label;mainAction.textContent=label;mainAction.onclick=handler||null}
function renderClock(){
 const state=current();
 set('clock',state?.phase==='draw'?Math.max(0,Math.ceil((state.end-Date.now())/1000))+'s':'');
}
function render(){
 if(!room||$('play').hidden)return;
 const state=current(), phase=state?.phase, online=available(), drawing=state?.drawer===room.seat;
 const canDraw=online&&drawing&&phase==='draw'&&!pending;
 const guess=phase==='draw'&&!drawing;
 const showChoices=phase==='pick'&&drawing;
 const names=room.names.map((name,i)=>i===room.seat?'You':peer||name||'Friend');
 const scores=$('scores');scores.replaceChildren();
 for(const [i,name] of names.entries()){
  const tile=document.createElement('span');tile.textContent=name+' · '+(state?.scores[i]||0);scores.append(tile);
 }
 set('round',state?'Turn '+state.number+' of 6':'Room '+room.code);
 $('art').hidden=!['draw','result'].includes(phase);
 $('tools').hidden=phase!=='draw'||!drawing;
 $('guessForm').hidden=!guess;
 $('guessForm').querySelector('button').disabled=!online||!!pending;
 $('undo').disabled=$('clear').disabled=!canDraw||!state?.lines.length;
 $('guesses').hidden=!state?.guesses.length;
 set('guesses',state?.guesses.length?'Guesses · '+state.guesses.join('  ·  '):'');
 canvas.dataset.drawing=String(canDraw&&state.lines.length<75);
 $('choices').hidden=!showChoices;
 const choicesKey=showChoices?session+'-'+state.number:'';
 if(choicesKey!==displayedChoices){
  displayedChoices=choicesKey;$('choices').replaceChildren();
  for(const word of state?.choices||[]){
   const option=document.createElement('button');option.type='button';option.className='primary';option.textContent=word;
   option.onclick=()=>submit({type:'pick',word});$('choices').append(option);
  }
 }
 for(const option of $('choices').children)option.disabled=!online||!!pending;
 action('');
 let status;
 if(!online)status=connected?'Waiting for your friend to join…':'Connecting…';
 else if(!state){status=host()?'Both players are here.':'Waiting for your friend to start.';if(host())action('Start game',start);}
 else if(phase==='pick'){status=drawing?'Pick a word to draw.':names[state.drawer]+' is picking a word.';}
 else if(phase==='draw'){status=drawing?'Draw: '+state.word:'Guess the word: '+state.hint;}
 else {
  const [first,second]=state.scores;
  const end=state.number===6;
  const winner=end?(first===second?' It’s a tie!':first>second?' '+names[0]+' win'+(room.seat===0?'!':'s!'):' '+names[1]+' win'+(room.seat===1?'!':'s!')):'';
  status=state.result+' The word was '+state.word+'.'+winner;
  if(host())action(end?'Play again':'Next turn',start);
 }
 set('status',status);renderClock();paint();
}
