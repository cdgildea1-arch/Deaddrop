import {read, token, joinRoom, connect} from '../mini/room.mjs';
import {nextRound, progress, answer, vote, view} from './rules.mjs';

const $=id=>document.getElementById(id);
const set=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value};
const input=$('answer');
let room, net, peer, session, state, remote, pending;
let connected=false, sent=false, offset=0, heartbeat=0, revealKey='', typed='';
const host=()=>room?.seat===0;
const paired=()=>connected&&!!peer;
const current=()=>host()?state&&view(state,0):remote;
const clock=()=>Date.now()+offset;
function status(message=''){set('notice',message);$('notice').hidden=!message}
function screen(playing){$('entry').hidden=playing;$('play').hidden=!playing}
$('name').value=read('pounce.name')||read('pounce.room')?.name||'';
$('joinForm').onsubmit=async event=>{
 event.preventDefault();
 const name=$('name').value.trim(), code=$('code').value.trim().toUpperCase();
 if(!name||!/^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(code))return status('Enter your name and a valid game code.');
 if(!window.supabase)return status('Live play couldn’t load. Refresh and try again.');
 event.submitter.disabled=true;
 status('Joining your friend…');
 try{room=await joinRoom(code,name);screen(true);wire();status();render();}
 catch(error){status(error.message)}
 finally{event.submitter.disabled=false}
};
$('leave').onclick=()=>{
 net?.close();room=net=peer=session=state=remote=pending=null;
 connected=false;offset=0;resetInput();$('code').value='';screen(false);status();
};
function resetInput(){sent=false;typed='';input.value='';revealKey=''}
input.addEventListener('input',()=>{
 if(current()?.phase==='answer'&&clock()<current().end)typed=input.value;
 else input.value=typed;
});
function publish(){
 if(host()&&state)net?.send('state',{session,round:view(state,1),at:Date.now()});
}
function wire(){
 net=connect('same-word',room,{
  connection(link,friend){
   connected=link;peer=friend;
   if(paired()){publish();net?.send('hello',{});}
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
   const incoming=message.round;
   if(!incoming)return;
   const same=remote&&session===message.session&&remote.number===incoming.number;
   if(same&&incoming.rev<remote.rev)return;
   if(!same){
    resetInput();
    pending=null;
    offset=message.at-Date.now();
   }
   if(pending?.type==='answer'&&(incoming.submitted||incoming.phase!=='answer'))pending=null;
   if(pending?.type==='vote'&&(incoming.voted||incoming.phase!=='vote'))pending=null;
   session=message.session;remote=incoming;render();
  },
  move(message){
   if(!host()||!state||message.session!==session||message.number!==state.number)return;
   if(message.type==='answer')answer(state,1,message.text);
   if(message.type==='vote')vote(state,1,message.close);
   publish();render();
  },
 });
}
$('next').onclick=()=>{
 if(!host()||!paired()||(state&&state.phase!=='result'))return;
 session??=token();
 state=nextRound(state);resetInput();publish();render();input.focus();
};
function enqueue(type,fields){
 pending={type,session,number:remote.number,...fields};
 net.send('move',pending);
}
function lockAnswer(){
 sent=true;
 if(host()){answer(state,0,typed);publish();}
 else enqueue('answer',{text:typed});
}
function cast(close){
 if(!paired()||pending)return;
 if(host()){if(vote(state,0,close))publish();}
 else enqueue('vote',{close});
 render();
}
$('match').onclick=()=>cast(true);
$('miss').onclick=()=>cast(false);

function tick(){
 if(!room)return;
 const game=current();
 if(game?.phase==='answer'&&clock()>=game.end&&!sent&&!game.submitted)lockAnswer();
 if(host()&&state&&progress(state))publish();
 if(paired()&&Date.now()>=heartbeat){
  heartbeat=Date.now()+550;
  if(pending)net.send('move',pending);
  else if(host()&&state)net.send('state',{session,sync:{number:state.number,rev:state.rev}});
  else if(!host()&&!remote)net.send('hello',{});
 }
 render();
}
setInterval(tick,100);
document.addEventListener('visibilitychange',tick);
function render(){
 if(!room||$('play').hidden)return;
 const game=current(), now=clock();
 const preparing=game?.phase==='answer'&&now<game.starts;
 const writing=game?.phase==='answer'&&now>=game.starts&&now<game.end;
 const waiting=game?.phase==='answer'&&now>=game.end;
 const revealing=game&&game.phase!=='answer';
 const myVote=game?.voted||pending?.type==='vote';
 set('streak','Streak '+(game?.streak||0));
 set('best','Best '+(game?.best||0));
 set('prompt',writing||revealing||waiting?game.prompt:game?'Get ready':'Same Word');
 set('clock',writing?Math.ceil((game.end-now)/1000)+'s':'');
 $('answerField').hidden=!preparing&&!writing;
 input.disabled=!preparing&&!writing;
 $('answers').hidden=!revealing;
 const key=revealing?session+'-'+game.number:'';
 if(key!==revealKey){
  revealKey=key;$('answers').replaceChildren();
  if(revealing)game.answers.forEach((text,index)=>{
   const card=document.createElement('article');
   const who=document.createElement('small');
   const entry=document.createElement('p');
   who.textContent=index===room.seat?'You':peer||room.names[index]||'Friend';
   entry.textContent=text||'No answer';
   card.append(who,entry);$('answers').append(card);
  });
 }
 $('votes').hidden=game?.phase!=='vote'||!!myVote;
 $('match').disabled=!paired()||!game?.answers?.every(Boolean);
 $('miss').disabled=!paired();
 $('next').hidden=!host()||!paired()||(game&&game.phase!=='result');
 set('next',game?'Next prompt':'Start game');
 let message='';
 if(!paired())message=connected?'Waiting for your friend to join…':'Connecting…';
 else if(!game)message=host()?'Ready when you are.':'Waiting for your friend to start.';
 else if(preparing)message='Tap the answer field to get ready.';
 else if(writing)message='Your answer submits when the timer ends.';
 else if(waiting)message='Revealing both answers…';
 else if(game.phase==='vote')message=myVote?'Waiting for your friend’s vote.':'Close enough to count?';
 else if(game.phase==='result')message=game.matched?'Match! Your streak grows.':'No match. Your streak starts over.';
 set('status',message);
}
