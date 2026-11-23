import {Engine,HandEngine,reduceOnline} from './engine.js';
// Room links are invitations; the independent device secret authorizes each saved seat.
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const token=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{24}$/.test(x);
const roomCode=(x:unknown)=>typeof x==='string'&&/^(?:[0-9]{8}|[a-f0-9]{24})$/.test(x);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),n=>n.toString(16).padStart(2,'0')).join('');
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
async function db(path:string,method='GET',body?:unknown){const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const r=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/mahjong_rooms_v2'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw new Error('Storage unavailable');return await r.json()}
function makeGame(level:string,rules:string,name:string){const seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;const shape=Engine.shape(level);Engine.deal(shape.tiles,seed);const game={...shape,level,seed,rules,mode:'online',names:['Player 1','Player 2'],scores:[0,0],turn:0};if(rules!=='pairs')game.hand=HandEngine.create(seed,rules);return game}
function view(row:any,seat:number){return{code:row.code,rev:row.rev,game:row.game,seat,joined:!!row.guest_hash,messages:row.messages,updatedAt:row.updated_at}}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>10000)return reply({error:'Request too large.'},413);
  const raw=await req.text();if(raw.length>10000)return reply({error:'Request too large.'},413);
  const b=JSON.parse(raw);if(!roomCode(b.code)||!token(b.secret))return reply({error:'Use the full room code and your saved player seat.'},400);
  const secretHash=await hash(b.secret),path='?code=eq.'+b.code;
  let row=(await db(path))[0];
  // Seats are always "Player 1" and "Player 2": typed or remembered names are never stored or shown.
  const name='Player 1';
  if(b.op==='create'){
   if(row)return reply({error:'This room code already exists. Please create a new room.'},409);
   const level=['easy','medium','large'].includes(b.level)?b.level:'easy',rules=['pairs','mini','full','bridge'].includes(b.rules)?b.rules:'pairs';
   row=(await db('','POST',{code:b.code,host_hash:secretHash,game:makeGame(level,rules,name)}))[0];return reply(view(row,0));
  }
  if(!row)return reply({error:'This saved room was not found. Ask for a new invite.'},404);
  // Cancel and start over: frees both seats and clears the game (messages stay). Anyone can reset a reserved
  // 8-digit room, so a phone that lost its seat can never lock it; other rooms need a seated phone.
  if(b.op==='reset'){
   const reserved=/^[0-9]{8}$/.test(b.code),seated=row.host_hash===secretHash||row.guest_hash===secretHash;
   if(!reserved&&!seated)return reply({error:'This device does not have a player seat in this room.'},403);
   const level=['easy','medium','large'].includes(b.level)?b.level:(row.game?.level||'easy'),rules=['pairs','mini','full','bridge'].includes(b.rules)?b.rules:(row.game?.rules||'pairs');
   const rows=await db(path+'&rev=eq.'+row.rev,'PATCH',{host_hash:reserved?'unclaimed':secretHash,guest_hash:null,game:makeGame(level,rules,name),rev:row.rev+1,updated_at:new Date().toISOString()});
   if(!rows.length)return reply({error:'The room changed. Please try again.'},409);
   return reply({reset:true,code:row.code});
  }
  // Reserved rooms have no player keys until the first person joins.
  if(b.op==='join'&&row.host_hash==='unclaimed'){
   const level=['easy','medium','large'].includes(b.level)?b.level:'easy',rules=['pairs','mini','full','bridge'].includes(b.rules)?b.rules:'pairs';
   const rows=await db(path+'&rev=eq.'+row.rev+'&host_hash=eq.unclaimed','PATCH',{host_hash:secretHash,game:makeGame(level,rules,name),rev:row.rev+1,updated_at:new Date().toISOString()});
   if(!rows.length)return reply({error:'The room changed while joining. Please try again.'},409);row=rows[0];
  }
  let seat=row.host_hash===secretHash?0:row.guest_hash===secretHash?1:-1;
  if(b.op==='join'&&seat<0){
   if(row.guest_hash)return reply({error:'This room already has two players. Tap “Cancel game and reset room” to start over, or reopen it on the device you used before.',full:true},403);
   const game=structuredClone(row.game);game.names=['Player 1','Player 2'];
   const rows=await db(path+'&rev=eq.'+row.rev+'&guest_hash=is.null','PATCH',{guest_hash:secretHash,game,rev:row.rev+1,updated_at:new Date().toISOString()});
   if(!rows.length)return reply({error:'The room changed while joining. Please try again.'},409);row=rows[0];seat=1;
  }
  if(seat<0)return reply({error:'This device does not have a player seat in this room.'},403);
  if(b.op==='get'||b.op==='join')return reply(view(row,seat));
  if(b.op==='new'){
   if(seat!==0)return reply({error:'The room creator starts a fresh game.'},403);
   if(b.rev!==row.rev)return reply({...view(row,seat),error:'The room changed. Reload before starting a new game.'},409);
   const level=['easy','medium','large'].includes(b.level)?b.level:'easy',rules=['pairs','mini','full','bridge'].includes(b.rules)?b.rules:row.game.rules;
   const game=makeGame(level,rules,name);
   const rows=await db(path+'&rev=eq.'+row.rev,'PATCH',{game,rev:row.rev+1,updated_at:new Date().toISOString()});
   if(!rows.length)return reply({error:'The room changed. Reload and try again.'},409);
   return reply(view(rows[0],seat));
  }
  if(b.op==='delete'){
   if(seat!==0)return reply({error:'Only the room creator can delete a game.'},403);
   if(row.messages.length)return reply({error:'This room has saved messages. Start a fresh game in the same room to keep the conversation.'},409);
   const rows=await db(path+'&rev=eq.'+row.rev,'DELETE');
   if(!rows.length)return reply({error:'The room changed. Reload and try again.'},409);
   return reply({deleted:true,code:row.code});
  }
  if(b.op==='action'){
   if(!row.guest_hash)return reply({error:'Invite the second player before taking a turn.'},409);
   if(b.rev!==row.rev)return reply({...view(row,seat),error:'The game changed. Your board has been updated.'},409);
   if(!b.action||typeof b.action.kind!=='string')return reply({error:'Choose a valid move.'},400);
   const game=reduceOnline(row.game,b.action,seat);if(!game)return reply({...view(row,seat),error:'That move is not available. Check whose turn it is.'},409);
   const rows=await db(path+'&rev=eq.'+row.rev,'PATCH',{game,rev:row.rev+1,updated_at:new Date().toISOString()});
   if(!rows.length)return reply({error:'Another move was saved first. Refresh the room and try again.'},409);return reply(view(rows[0],seat));
  }
  if(b.op==='message'){
   if(!token(b.id)||typeof b.text!=='string'||!b.text.trim()||b.text.length>1000)return reply({error:'Write a message of up to 1,000 characters.'},400);
   if(row.messages.some((m:any)=>m.id===b.id))return reply(view(row,seat));
   const messages=[...row.messages,{id:b.id,sender:seat,name:seat===0?'Player 1':'Player 2',text:b.text.trim(),ts:Date.now(),delivered:true}].slice(-500);
   const rows=await db(path+'&rev=eq.'+row.rev,'PATCH',{messages,rev:row.rev+1,updated_at:new Date().toISOString()});if(!rows.length)return reply({error:'The room updated. Please send again.'},409);return reply(view(rows[0],seat));
  }
  return reply({error:'Unknown room request.'},400);
 }catch(e){return reply({error:'Could not reach the saved room. Check your connection and try again.'},503)}
});
