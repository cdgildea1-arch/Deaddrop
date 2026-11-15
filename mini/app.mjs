import { games, limit, newRound, move, view } from './rules.mjs';
import { read, token, joinRoom, connect } from './room.mjs';

const params = new URLSearchParams(location.search);
const requested = params.get('game');
const kind = Object.hasOwn(games,requested) ? requested : 'what-changed';
const {title,detail,instructions} = games[kind];
const $ = id => document.getElementById(id);
const txt = (id,value) => { $(id).textContent=value; };
const marks = {'what-changed':'◫','draw-together':'〰',warmer:'◉','hide-a-dot':'⊙'};
document.title = title+' · Your Move';
document.body.dataset.kind = kind;
document.documentElement.dataset.moveChat = kind;
void import('/your-move-chat/chat.mjs?v=mini');
txt('title',title);
txt('gameTitle',title);
txt('mark',marks[kind]);
txt('detail',detail);
txt('instructions',instructions);
$('name').value=read('pounce.name') || read('pounce.room')?.name || '';

const stage=$('stage'), button=$('mainAction');
const canvas=document.createElement('canvas');
canvas.width=700;
canvas.height=700;
canvas.setAttribute('aria-label','Shared drawing canvas');
const ctx=canvas.getContext('2d');
let state, remote, net, room, link, peer, pending, receipt, session;
let local=false, localSeat=0, passing=false, timer, points, pointer, renderedKey;
const host=()=>room?.seat===0;
const seat=()=>local?localSeat:room?.seat;
const available=()=>local||Boolean(link&&peer);
const board=()=>local||host()?(state&&view(state,seat())):remote;
const name=()=>local?'Player '+(seat()+1):'you';
function notice(text=''){
  txt('notice',text);
  $('notice').hidden=!text;
}
function screen(playing){
  $('entry').hidden=playing;
  $('play').hidden=!playing;
}
function publish(){
  if(host()&&state&&net)net.send('state',{session,board:view(state,1),receipt});
}
function startRound(){
  clearTimeout(timer);
  state=newRound(kind,(state?.round||0)+1);
  session??=token();
  receipt=null;
  passing=local&&state.round>1;
  localSeat=state.turn;
  resetDraft();
  publish();
  render();
}
function apply(seat,action){
  if(!state||!move(state,seat,action))return false;
  if(local&&state.turn!==seat&&state.phase!=='done'){
    if(kind!=='draw-together')passing=true;
    else localSeat=state.turn;
  }
  clearTimeout(timer);
  if(state.phase==='study'){
    const {round,rev,turn}=state;
    timer=setTimeout(()=>{
      apply(turn,{type:'recall',round,rev});
      publish();
      render();
    },5000);
  }
  return true;
}
function submit(data){
  const current=board();
  if(!current||!available()||passing||pending||current.turn!==seat())return;
  const action={...data,round:current.round,rev:current.rev};
  if(local||host()){
    if(apply(seat(),action)){
      if(data.type==='stroke')resetDraft();
      publish();
    }
  }else{
    pending={session,nonce:token(),action};
    net.send('move',pending);
  }
  render();
}
function wire(){
  net=connect(kind,room,{
    connection(connected,friend){
      link=connected;peer=friend;
      if(peer){publish();net?.send('hello',{});}
      render();
    },
    hello(){publish()},
    state(message){
      if(host()||!message.board||message.board.kind!==kind)return;
      const incoming=message.board;
      const sameRound=session===message.session && remote?.round===incoming.round;
      if(sameRound&&incoming.rev<remote.rev)return;
      if(!sameRound)resetDraft();
      if(pending?.nonce===message.receipt?.nonce&&pending){
        if(message.receipt.ok&&pending.action.type==='stroke')resetDraft();
        pending=null;
      }else if(!sameRound||(pending&&incoming.rev>pending.action.rev)){
        if(pending?.action.type==='stroke')resetDraft();
        pending=null;
      }
      session=message.session;remote=incoming;
      render();
    },
    move(message){
      if(!host()||!state||!peer||message.session!==session||typeof message.nonce!=='string'||!message.action)return;
      if(receipt?.nonce!==message.nonce)receipt={nonce:message.nonce,ok:apply(1,message.action)};
      publish();
      render();
    },
  });
}
$('joinForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const code=$('code').value.trim().toUpperCase(), player=$('name').value.trim();
  if(!player||!/^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(code))return notice('Enter your name and a valid game code.');
  if(!window.supabase)return notice('Live play couldn’t load. Reload and try again.');
  const submitter=event.submitter;
  submitter.disabled=$('local').disabled=true;
  notice('Joining your friend…');
  try{
    room=await joinRoom(code,player);
    notice();
    screen(true);
    wire();
    render();
  }catch(error){notice(error.message)}
  finally{submitter.disabled=$('local').disabled=false}
});
$('local').onclick=()=>{
  local=true;
  notice();
  screen(true);
  startRound();
};
$('leave').onclick=()=>{
  clearTimeout(timer);
  net?.close();
  state=remote=net=room=peer=pending=receipt=session=null;
  link=local=passing=false;
  resetDraft();
  renderedKey=null;
  stage.replaceChildren();
  $('code').value='';
  screen(false);
};
setInterval(()=>{
  if(document.hidden||!link||!peer||!net)return;
  if(pending)net.send('move',pending);
  else if(host())publish();
  else net.send('hello',{});
},1200);

function paint(strokes){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const {seat,points:line} of strokes){
    ctx.strokeStyle=ctx.fillStyle=seat===0?'#5937a3':'#b1394e';
    ctx.lineWidth=10;
    ctx.lineJoin=ctx.lineCap='round';
    ctx.beginPath();
    const [x,y]=line[0].map(v=>v*700);
    if(line.length===1){
      ctx.arc(x,y,5,0,2*Math.PI);ctx.fill();continue;
    }
    ctx.moveTo(x,y);
    for(const [x,y] of line.slice(1))ctx.lineTo(x*700,y*700);
    ctx.stroke();
  }
}
function resetDraft(){points=null;pointer=null}
function point(event){
  const rect=canvas.getBoundingClientRect();
  const clamp=value=>Math.round(Math.min(1,Math.max(0,value))*1000)/1000;
  return [clamp((event.clientX-rect.left)/rect.width),clamp((event.clientY-rect.top)/rect.height)];
}
canvas.onpointerdown=event=>{
  if(canvas.dataset.drawing!=='true'||pointer!==null||points)return;
  pointer=event.pointerId;
  points=[point(event)];
  canvas.setPointerCapture(pointer);
  render();
};
canvas.onpointermove=event=>{
  if(event.pointerId!==pointer||points.length>=300)return;
  const next=point(event), previous=points.at(-1);
  if(Math.hypot(next[0]-previous[0],next[1]-previous[1])<.004)return;
  points.push(next);
  paint([...board().strokes,{seat:seat(),points}]);
};
canvas.onpointerup=event=>{if(event.pointerId===pointer){pointer=null;render()}};
canvas.onpointercancel=event=>{if(event.pointerId===pointer){resetDraft();render()}};
$('erase').onclick=()=>{resetDraft();render()};

function setAction(label,handler){
  button.hidden=!label;
  button.textContent=label;
  button.onclick=handler||null;
}
function makeGrid(current,enabled){
  const shelf=kind==='what-changed';
  const grid=document.createElement('div');
  grid.className=shelf?'shelf-grid':'hunt';
  for(let index=0;index<(shelf?6:49);index++){
    const tile=document.createElement('button');
    tile.type='button';
    const item=current.shelf?.[index];
    const mark=current.marks?.find(m=>m.cell===index);
    tile.disabled=!enabled||!!mark;
    tile.dataset.answer=String(current.answer===index);
    if(mark)tile.dataset.mark=mark.heat;
    if(shelf){
      tile.textContent=item;
      tile.dataset.miss=String(current.guess===index&&current.guess!==current.answer);
    }
    tile.setAttribute('aria-label',shelf?`Slot ${index+1}: ${item}`:`Row ${Math.floor(index/7)+1}, column ${index%7+1}${mark?', '+mark.heat:''}`);
    tile.onclick=()=>submit({type:'cell',cell:index});
    grid.append(tile);
  }
  return grid;
}
function render(){
  if($('play').hidden)return;
  const current=board();
  const active=available()&&current?.turn===seat()&&!pending&&!passing;
  const key=JSON.stringify([current?.round,current?.rev,active,passing,session]);
  const updateStage=renderedKey!==key;
  renderedKey=key;
  setAction('');
  $('erase').hidden=true;
  txt('round',current?'Round '+current.round+(local?' · '+name():''):room?'Room '+room.code:'');
  let status;
  if(!current){
    status=!link?'Connecting…':!peer?'Waiting for your friend to join.':host()?'Both players are here.':'Waiting for your friend to start.';
    if(host()&&available())setAction('Start round',startRound);
    if(updateStage)stage.replaceChildren();
  }else if(passing){
    status='Pass the phone to Player '+(current.turn+1)+'.';
    setAction('I have the phone',()=>{localSeat=state.turn;passing=false;render()});
    stage.replaceChildren();
  }else if(kind==='draw-together'){
    if(canvas.parentNode!==stage)stage.replaceChildren(canvas);
    canvas.dataset.drawing=String(active&&current.phase==='draw');
    paint(points?[...current.strokes,{seat:seat(),points}]:current.strokes);
    status=current.phase==='done'?'Six strokes. What would you call it?':`${current.strokes.length} of 6 strokes · ${active?'Add your stroke':pending?'Sending…':'Waiting for your friend'}`;
    if(active&&points&&pointer===null){
      setAction('Add my stroke',()=>submit({type:'stroke',points}));
      $('erase').hidden=false;
    }
  }else{
    const shelf=kind==='what-changed';
    const showGrid=!shelf||!!current.shelf;
    if(updateStage){
      if(showGrid)stage.replaceChildren(makeGrid(current,active&&['set','guess'].includes(current.phase)));
      else stage.replaceChildren();
    }
    if(current.phase==='set'){
      status=active?(shelf?'Tap an object to swap it.':'Tap a spot to hide your dot.'):'Your friend is setting up the round.';
    }else if(current.phase==='ready'){
      status=active?'You’ll see the original shelf for five seconds.':'Waiting for your friend to study the shelf.';
      if(active)setAction('Show me the shelf',()=>submit({type:'study'}));
    }else if(current.phase==='study'){
      status='Study the original shelf.';
      if(active)setAction('I’ve got it',()=>submit({type:'recall'}));
    }else if(current.phase==='guess'){
      const heat=current.marks?.at(-1)?.heat;
      const hint=kind==='warmer'&&heat?heat[0].toUpperCase()+heat.slice(1)+' · ':'';
      status=!active?(pending?'Sending…':'Your friend is guessing.'):shelf?'Which spot changed?':hint+(limit(kind)-current.marks.length)+' taps left.';
    }else{
      status=shelf?(current.won?'Correct! ': 'That wasn’t the spot. ')+'The outlined object replaced '+current.original+'.':current.won?'Found it in '+current.marks.length+(current.marks.length===1?' tap!':' taps!'):'The dot was in the outlined spot.';
    }
  }
  if(current?.phase==='done'&&(local||host())&&available())setAction('Next round',startRound);
  if(current&&!local&&!available())status='Waiting for your friend to reconnect…';
  txt('status',status);
}
