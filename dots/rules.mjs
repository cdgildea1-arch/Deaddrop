export const SIZE=5;
export const edges=[];
for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
 if(c<SIZE-1)edges.push({r,c,axis:'h',id:'h'+r+c});
 if(r<SIZE-1)edges.push({r,c,axis:'v',id:'v'+r+c});
}
const boxes=Array.from({length:16},(_,i)=>{
 const r=Math.floor(i/4),c=i%4;return ['h'+r+c,'h'+(r+1)+c,'v'+r+c,'v'+r+(c+1)];
});
export function newGame(names,humans){
 return {id:crypto.randomUUID(),rev:0,names,humans,turn:Math.floor(Math.random()*2),lines:{},owners:Array(16).fill(null),scores:[0,0],winner:null,last:null};
}
export function action(g,seat,m){
 if(g.id!==m.id||g.rev!==m.rev||g.winner!==null||g.turn!==seat||!edges.some(e=>e.id===m.edge)||Object.hasOwn(g.lines,m.edge))throw Error('Choose an open edge on your turn.');
 g.lines[m.edge]=seat;g.last=m.edge;let won=0;
 boxes.forEach((sides,i)=>{
  if(g.owners[i]===null&&sides.every(e=>Object.hasOwn(g.lines,e))){g.owners[i]=seat;won++;}
 });
 g.scores[seat]+=won;
 if(g.scores[0]+g.scores[1]===16)g.winner=g.scores[0]===g.scores[1]?-1:g.scores.indexOf(Math.max(...g.scores));
 else if(!won)g.turn=1-seat;
 g.rev++;
}
export const view=g=>g;
export function botMove(g){
 const used=e=>Object.hasOwn(g.lines,e);
 const options=edges.filter(e=>!used(e.id)).map(e=>{
  const adjacent=boxes.filter(b=>b.includes(e.id)).map(b=>b.filter(used).length);
  return {edge:e.id,priority:adjacent.filter(n=>n===3).length*10-adjacent.filter(n=>n===2).length+Math.random()};
 });
 return {edge:options.sort((a,b)=>b.priority-a.priority)[0].edge};
}
