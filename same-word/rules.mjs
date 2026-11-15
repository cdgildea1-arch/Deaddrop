const prompts = [
 'President','King Kong','Breakfast','The moon','Road trip','A zoo animal','A red fruit','Summer','A superhero','A dinosaur',
 'A pizza topping','The beach','A cartoon mouse','Camping','A fast animal','A board game','A holiday movie','A school subject',
 'An ice cream flavor','Halloween','A farm animal','A country in Europe','A musical instrument','A ball sport','A breakfast cereal',
 'A rainy day','A tropical bird','A carnival ride','A Disney villain','A movie snack','A yellow food','An ocean animal','Space travel',
 'A famous wizard','A sandwich filling','A card game','A round fruit','A dog breed','A street food','An arcade game','A planet',
 'A type of flower','A famous landmark','A kitchen utensil','A winter sport','A cookie flavor','A comic book character','A kind of tree',
 'A wedding song','A hot drink','A fictional detective','A breakfast drink','A mall store','A sea monster','A noisy animal','A picnic food',
 'A sport with a net','A cartoon dog','A thing you lose','A camping snack','A theme park','Something found in a pocket',
];
export const duration=10000;
export const grace=5000;
export function nextRound(previous, now=Date.now()){
 const used=previous?.used.length===prompts.length?[]:previous?.used||[];
 const choices=prompts.filter(prompt=>!used.includes(prompt));
 const prompt=choices[Math.floor(Math.random()*choices.length)];
 const starts=now+1200;
 return {number:(previous?.number||0)+1,phase:'answer',prompt,used:[...used,prompt],starts,end:starts+duration,
  answers:[null,null],votes:[null,null],streak:previous?.streak||0,best:previous?.best||0,rev:0};
}
export function progress(state, now=Date.now()){
 if(state.phase!=='answer'||now<state.end)return false;
 if(state.answers.some(answer=>answer===null)&&now<state.end+grace)return false;
 state.answers=state.answers.map(answer=>answer??'');
 state.phase='vote';
 state.rev++;
 return true;
}
export function answer(state,seat,text,now=Date.now()){
 if(state.phase!=='answer'||now<state.end||now>=state.end+grace||state.answers[seat]!==null||typeof text!=='string')return false;
 state.answers[seat]=text.trim().slice(0,64);
 state.rev++;
 progress(state,now);
 return true;
}
export function vote(state,seat,close){
 if(state.phase!=='vote'||state.votes[seat]!==null||typeof close!=='boolean')return false;
 if(close&&state.answers.some(value=>!value))return false;
 state.votes[seat]=close;
 state.rev++;
 if(state.votes.every(value=>value!==null)){
  state.phase='result';
  state.matched=state.votes.every(Boolean);
  state.streak=state.matched?state.streak+1:0;
  state.best=Math.max(state.streak,state.best);
 }
 return true;
}
export function view(state,seat){
 const {answers,votes,used,...publicState}=state;
 return {...publicState,submitted:answers[seat]!==null,voted:votes[seat]!==null,answers:state.phase==='answer'?undefined:answers};
}
