import {evaluate} from './rules.mjs';

export function makeTrie(words) {
 const root=Object.create(null);
 for(const word of words){
  if(!/^[A-Z]{2,15}$/.test(word))continue;
  let node=root;
  for(const letter of word)node=node[letter]??=Object.create(null);
  node.end=true;
 }
 return root;
}

export function choosePlay(game, dictionary, trie) {
 const board=game.board, rack=game.players[game.turn].rack, empty=!board.some(Boolean);
 let best=null;
 for(const stride of [1,15]){
  for(let line=0;line<15;line++){
   if(empty&&line!==7)continue;
   const cells=Array.from({length:15},(_,i)=>stride===1?line*15+i:i*15+line);
   const anchors=cells.map(i=>empty?i===112:!!(board[i]||board[i-15]||board[i+15]||(i%15&&board[i-1])||(i%15!==14&&board[i+1])));
   if(!anchors.some(Boolean))continue;
   for(let start=0;start<15;start++){
    if(start&&board[cells[start-1]])continue;
    const next=anchors.indexOf(true,start);
    if(next<0||cells.slice(start,next).filter(i=>!board[i]).length>=rack.length)continue;
    function visit(pos,node,mask,placed,attached){
     if(pos-start>=2&&node.end&&placed.length&&attached&&!board[cells[pos]]){
      try{const {score}=evaluate(game,placed,dictionary);if(!best||score>best.score)best={score,placed};}catch{}
     }
     if(pos===15)return;
     const i=cells[pos], fixed=board[i]?.l;
     if(fixed){if(node[fixed])visit(pos+1,node[fixed],mask,placed,true);return}
     const used=new Set();
     rack.forEach((tile,k)=>{
      if(mask&(1<<k)||used.has(tile))return;
      used.add(tile);
      const letters=tile==='?'?Object.keys(node).filter(key=>key!=='end'):[tile];
      for(const l of letters)if(node[l])visit(pos+1,node[l],mask|(1<<k),[...placed,{i,k,l}],attached||anchors[pos]);
     });
    }
    visit(start,trie,0,[],false);
   }
  }
 }
 return best?.placed??null;
}
