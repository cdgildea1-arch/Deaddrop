export function portrait(person){
 const canvas=document.createElement('canvas');canvas.width=240;canvas.height=216;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);
 const skin=['#f3c4a1','#a86545','#e5a271','#704229','#ca8c69','#f3d1b5'][person.id%6];
 const hair=person.lightHair?['#e4b960','#f0d285','#c78952'][person.id%3]:['#291c29','#533134','#242640'][person.id%3];
 const colors=['#f5aa9d','#a4bfe4','#ced7a7','#dec1f2','#f8cf86','#a3d9cf'];
 const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);ctx.fill();};
 const stroke=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();};
 ctx.fillStyle=colors[person.id%6];ctx.fillRect(0,0,120,108);for(let x=7;x<120;x+=13)for(let y=8;y<108;y+=14)ellipse(x,y,1,1,'#ffffff44');ellipse(60,58,46,46,'#ffffff38');
 if(person.longHair)ellipse(60,58,34,45,hair);
 ellipse(60,110,43,27,colors[(person.id+3)%6]);
 ctx.strokeStyle='#ffffff65';ctx.lineWidth=2;
 for(let line=0;line<4;line++){
  if(person.id%3===0)stroke(25,94+line*4,93,94+line*4);
  else if(person.id%3===1){ellipse(35+line*16,100,2,2,'#ffffff70');}
 }
 ellipse(60,83,10,15,skin);
 ellipse(34,53,7,9,skin);ellipse(86,53,7,9,skin);
 ellipse(60,50,27,34,skin);
 ellipse(60,24,28,12,hair);ellipse(37,34,6,12,hair);
 if(person.id%2)ellipse(79,28,9,9,hair);
 ctx.strokeStyle=hair;ctx.lineWidth=1.5;
 stroke(43,42,53,41);stroke(67,41,77,42);
 for(const x of [49,71]){
  ellipse(x,48,4.3,3.6,'#fff6e6');ellipse(x,48,2.4,3.2,['#3f4553','#4c392e','#435743'][person.id%3]);
  ellipse(x+.6,47.2,.7,.7,'#ffffff');
 }
 ellipse(60,56,3.4,2,'#935c503d');ellipse(43,61,5,3,'#d0706e4c');ellipse(77,61,5,3,'#d0706e4c');
 ctx.strokeStyle='#ffffff30';ctx.lineWidth=1;
 for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(42+i*9,22);ctx.quadraticCurveTo(48+i*8,16,52+i*8,20);ctx.stroke();}

 ctx.lineWidth=2;ctx.strokeStyle='#5e3843';ctx.beginPath();ctx.arc(60,60,8,.2,Math.PI-.2);ctx.stroke();
 if(person.freckles)for(const x of [43,47,50,70,73,77])ellipse(x,57+(x%2)*2,1.4,1.4,'#743b42');
 if(person.glasses){ctx.strokeStyle='#1b203b';ctx.lineWidth=3;for(const x of [39,61])ctx.strokeRect(x,41,20,14);stroke(59,47,61,47);stroke(32,45,39,45);stroke(81,45,88,45);}
 if(person.earrings){ellipse(33,62,4.2,5,'#fff3ae');ellipse(87,62,4.2,5,'#fff3ae');}
 if(person.hat){ellipse(60,19,30,12,'#51315e');ellipse(60,27,38,4,'#724b8d');}
 return canvas.toDataURL();
}
