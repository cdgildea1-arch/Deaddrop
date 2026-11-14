export const points = Object.fromEntries([...['AEILNORSTU','DG','BCMP','FHVWY','K','','','JX','','QZ']].flatMap((s,i)=>[...s].map(c=>[c,i+1])));
points['?']=0;
const counts=[9,2,2,4,12,2,3,2,9,1,1,4,2,6,8,2,1,6,4,6,4,2,2,1,2,1];
export const premium=Array(225).fill('');
for(const [type,coords] of Object.entries({TW:[[0,0],[0,7]],DW:[[1,1],[2,2],[3,3],[4,4],[7,7]],TL:[[1,5],[5,5]],DL:[[0,3],[2,6],[3,7],[6,6]]}))
 for(const [r,c] of coords)for(const [a,b] of [[r,c],[c,r]])for(const y of [a,14-a])for(const x of [b,14-b])premium[y*15+x]=type;
function shuffle(bag){for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[j],bag[i]]=[bag[i],bag[j]]}return bag}
export function newGame(names){
 const bag=shuffle([...counts.flatMap((n,i)=>Array(n).fill(String.fromCharCode(65+i))),'?','?']);
 return {id:crypto.randomUUID(),rev:0,board:Array(225).fill(null),bag,players:names.map(name=>({name,rack:bag.splice(0,7),score:0})),turn:Math.floor(Math.random()*names.length),drought:0,end:false,history:[]};
}
function step(i,d){if(d===1&&i%15===14||d===-1&&i%15===0)return -1;const n=i+d;return n>=0&&n<225?n:-1}
function run(board,i,d){let first=i;while(board[step(first,-d)])first=step(first,-d);const out=[];for(let p=first;board[p];p=step(p,d))out.push(p);return out}
export function evaluate(game,placed,dictionary){
 const rack=game.players[game.turn].rack, indexes=new Set(), cells=new Set(), board=game.board.slice();
 if(!Array.isArray(placed)||!placed.length||placed.length>7)throw Error('Place at least one tile.');
 for(const {i,k,l} of placed){
  if(!Number.isInteger(i)||i<0||i>=225||board[i]||!rack[k]||indexes.has(k)||typeof l!=='string'||!/^[A-Z]$/.test(l)||(rack[k]!=='?'&&rack[k]!==l))throw Error('Invalid tile placement.');
  indexes.add(k);cells.add(i);board[i]={l,blank:rack[k]==='?'};
 }
 const first=placed[0].i, horizontal=placed.every(p=>Math.floor(p.i/15)===Math.floor(first/15)),vertical=placed.every(p=>p.i%15===first%15);
 if(!horizontal&&!vertical)throw Error('Place tiles in a single row or column.');
 const direction=horizontal?1:15,main=run(board,first,direction);
 if(!placed.every(p=>main.includes(p.i)))throw Error('Fill the gaps between your tiles.');
 const lines=[main,...placed.map(p=>run(board,p.i,direction===1?15:1))].filter(line=>line.length>1);
 if(!game.board.some(Boolean)){if(!cells.has(112)||placed.length<2)throw Error('Start with a word of at least two letters across the star.')}
 else if(!lines.some(line=>line.some(i=>game.board[i])))throw Error('Connect to a tile already on the board.');
 const words=lines.map(line=>line.map(i=>board[i].l).join(''));
 const invalid=words.filter(word=>!dictionary.has(word));
 if(invalid.length)throw Error('Word list does not include '+invalid.join(', ')+'.');
 const score=lines.reduce((total,line)=>{let sum=0,mult=1;for(const i of line){let v=board[i].blank?0:points[board[i].l];const p=cells.has(i)?premium[i]:'';if(p[1]==='L')v*=p[0]==='D'?2:3;if(p[1]==='W')mult*=p[0]==='D'?2:3;sum+=v}return total+sum*mult},placed.length===7?50:0);
 return {board,score,words,indexes};
}
export function action(game,seat,move,dictionary){
 if(game.end||game.turn!==seat||move.rev!==game.rev||move.id!==game.id)throw Error('The turn has changed.');
 const player=game.players[seat];let score=0, label, used=new Set();
 if(move.type==='play'){const result=evaluate(game,move.placed,dictionary);game.board=result.board;score=result.score;used=result.indexes;label=result.words.join(', ')}
 else if(move.type==='exchange'){used=new Set(move.indices);if(game.bag.length<7||!used.size||[...used].some(i=>!Number.isInteger(i)||!player.rack[i]))throw Error('Pick tiles to exchange while at least seven are in the bag.');label='Exchanged '+used.size}
 else if(move.type==='pass')label='Passed';else throw Error('Unknown move.');
 const removed=player.rack.filter((_,i)=>used.has(i));player.rack=player.rack.filter((_,i)=>!used.has(i));while(player.rack.length<7&&game.bag.length)player.rack.push(game.bag.shift());
 if(move.type==='exchange'){game.bag.push(...removed);shuffle(game.bag)}
 player.score+=score;game.history.push({name:player.name,label,score});game.drought=score?0:game.drought+1;game.rev++;
 const out=move.type==='play'&&!player.rack.length&&!game.bag.length;
 if(out||game.drought>=6){game.end=true;game.before=game.players.map(p=>p.score);let leftover=0;for(const p of game.players){const cost=p.rack.reduce((n,c)=>n+points[c],0);p.score-=cost;leftover+=cost}if(out)player.score+=leftover}
 else game.turn=(seat+1)%game.players.length;
}
export function view(game,seat){return {...game,bag:game.bag.length,players:game.players.map((p,i)=>({...p,rack:i===seat?p.rack:[],count:p.rack.length}))}}
