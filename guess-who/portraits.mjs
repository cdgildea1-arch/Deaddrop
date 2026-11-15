export function portrait(person){
 const canvas=document.createElement('canvas');canvas.width=120;canvas.height=108;
 const ctx=canvas.getContext('2d');
 const skin=['#f3c4a1','#a86545','#e5a271','#704229','#ca8c69','#f3d1b5'][person.id%6];
 const hair=person.lightHair?['#e4b960','#f0d285','#c78952'][person.id%3]:['#291c29','#533134','#242640'][person.id%3];
 const colors=['#f5aa9d','#a4bfe4','#ced7a7','#dec1f2','#f8cf86','#a3d9cf'];
 const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);ctx.fill();};
 const stroke=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();};
 ctx.fillStyle=colors[person.id%6];ctx.fillRect(0,0,120,108);ellipse(60,58,46,46,'#ffffff38');
 if(person.longHair)ellipse(60,58,34,45,hair);
 ellipse(60,110,43,27,colors[(person.id+3)%6]);
 ellipse(60,83,10,15,skin);
 ellipse(34,53,7,9,skin);ellipse(86,53,7,9,skin);
 ellipse(60,50,27,34,skin);
 ellipse(60,24,28,12,hair);ellipse(37,34,6,12,hair);
 if(person.id%2)ellipse(79,28,9,9,hair);
 ellipse(49,48,2.4,3.2,'#291e2c');ellipse(71,48,2.4,3.2,'#291e2c');
 ctx.lineWidth=2;ctx.strokeStyle='#5e3843';ctx.beginPath();ctx.arc(60,60,8,.2,Math.PI-.2);ctx.stroke();
 if(person.freckles)for(const x of [43,47,50,70,73,77])ellipse(x,57+(x%2)*2,1.4,1.4,'#743b42');
 if(person.glasses){ctx.strokeStyle='#1b203b';ctx.lineWidth=3;for(const x of [39,61])ctx.strokeRect(x,41,20,14);stroke(59,47,61,47);stroke(32,45,39,45);stroke(81,45,88,45);}
 if(person.earrings){ellipse(33,62,4.2,5,'#fff3ae');ellipse(87,62,4.2,5,'#fff3ae');}
 if(person.hat){ellipse(60,19,30,12,'#51315e');ellipse(60,27,38,4,'#724b8d');}
 return canvas.toDataURL();
}
