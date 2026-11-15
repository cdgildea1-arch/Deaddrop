export const traits = [
 ['glasses','Are they wearing glasses?','glasses'],
 ['hat','Are they wearing a hat?','a hat'],
 ['earrings','Are they wearing earrings?','earrings'],
 ['freckles','Do they have freckles?','freckles'],
 ['longHair','Do they have hair reaching their shoulders?','shoulder-length hair'],
 ['lightHair','Do they have blond or gray hair?','blond or gray hair'],
 ['mustache','Do they have a mustache?','a mustache'],
 ['beard','Do they have a full beard?','a full beard'],
 ['grayHair','Do they have gray hair?','gray hair'],
 ['teeth','Are they showing their teeth?','visible teeth'],
 ['curly','Do they have clearly curly hair?','curly hair'],
 ['tie','Are they wearing a tie?','a tie'],
 ['receding','Do they have a receding hairline?','a receding hairline'],
 ['turtleneck','Are they wearing a turtleneck?','a turtleneck'],
 ['afro','Do they have an afro?','an afro'],
 ['centerPart','Is their hair parted down the middle?','a middle part']
];
const names='Avery|Blair|Casey|Devon|Emery|Frankie|Gray|Harper|Indigo|Jamie|Kai|Lane|Morgan|Noel|Oakley|Parker|Quinn|Remy|Sage|Taylor'.split('|');
// Row-major traits observed in the printed portrait sheet.
const features=[
 'mustache teeth curly',
 'earrings freckles longHair lightHair turtleneck',
 'glasses tie receding',
 'earrings teeth curly afro',
 'longHair lightHair mustache beard teeth',
 'glasses earrings lightHair grayHair curly',
 'earrings longHair teeth',
 'glasses mustache tie',
 'freckles longHair teeth curly',
 'hat grayHair lightHair',
 'earrings longHair centerPart',
 'glasses mustache curly',
 'hat lightHair teeth',
 'earrings curly',
 'glasses mustache beard',
 'earrings longHair lightHair teeth turtleneck',
 'mustache teeth tie receding',
 'hat earrings freckles longHair',
 'teeth tie',
 'glasses earrings lightHair teeth curly'
];

export const cast=names.map((name,id)=>({name,id,...Object.fromEntries(traits.map(([key])=>[key,features[id].split(' ').includes(key)]))}));
export const newGame=names=>({id:crypto.randomUUID(),rev:0,players:names.map(name=>({name,secret:null})),turn:Math.floor(Math.random()*2),winner:null,history:[],question:null});
export function action(game,seat,move){
 if(move.id!==game.id||game.winner!==null||!game.players[seat])throw Error('This round has ended.');
 const player=game.players[seat],other=game.players[1-seat];
 if(move.type==='pick'){
  if(player.secret!==null||!Number.isInteger(move.choice)||!cast[move.choice])throw Error('Choose a character from the board.');
  player.secret=move.choice;
 }else if(move.type==='answer'){
  const q=game.question;
  if(!q||q.seat===seat||move.rev!==game.rev||typeof move.answer!=='boolean')throw Error('There is no question for you to answer.');
  game.history.push({seat:q.seat,label:q.label,answer:move.answer,custom:true});
  game.question=null;game.turn=seat;
 }else{
  if(game.question)throw Error('Wait for your friend to answer.');
  if(game.turn!==seat||player.secret===null||other.secret===null||move.rev!==game.rev)throw Error('Wait for your turn.');
  if(move.type==='custom'){
   const label=typeof move.label==='string'?move.label.trim():'';
   if(!label||label.length>160)throw Error('Type one yes-or-no question, up to 160 characters.');
   game.question={seat,label};
  }else if(move.type==='ask'){
   const trait=traits.find(([key])=>key===move.trait);
   if(!trait||game.history.some(h=>h.seat===seat&&h.trait===move.trait))throw Error('Pick a question you have not asked.');
   game.history.push({seat,trait:move.trait,label:trait[1],answer:cast[other.secret][move.trait]});
   game.turn=1-seat;
  }else if(move.type==='guess'){
   if(!Number.isInteger(move.choice)||!cast[move.choice])throw Error('Choose a character.');
   const correct=move.choice===other.secret;
   game.history.push({seat,label:'Guessed '+cast[move.choice].name,answer:correct});
   game.winner=correct?seat:1-seat;
  }else throw Error('Unknown move.');
 }
 game.rev++;
}
export function view(game,seat){
 return {...game,players:game.players.map((p,i)=>({...p,ready:p.secret!==null,secret:i===seat||game.winner!==null?p.secret:null}))};
}
export function candidates(game,seat){
 return cast.filter(p=>game.history.every(h=>h.seat!==seat||!h.trait||p[h.trait]===h.answer));
}
export function botMove(game){
 const options=candidates(game,1);
 if(options.length===1)return {type:'guess',choice:options[0].id};
 const ranked=traits.filter(([key])=>!game.history.some(h=>h.seat===1&&h.trait===key)).map(([key])=>[key,Math.min(options.filter(p=>p[key]).length,options.filter(p=>!p[key]).length)]).sort((a,b)=>b[1]-a[1]);
 return ranked[0]?.[1]>0?{type:'ask',trait:ranked[0][0]}:{type:'guess',choice:options[0].id};
}
