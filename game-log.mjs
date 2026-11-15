// Keep long move history available without making the play surface scroll.
const trigger=document.querySelector('.game-log');
const dialog=document.querySelector('.game-log-dialog');
if(trigger&&dialog){
 trigger.onclick=()=>dialog.showModal();
 dialog.querySelector('button').onclick=()=>dialog.close();
}
