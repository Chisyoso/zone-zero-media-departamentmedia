// CREA NUEVO ARCHIVO js/pvp.js

const pvpCanvasData = {
leftAvatar:null,
rightAvatar:null
};

let currentMode = "formation";

function switchMode(mode){

currentMode = mode;

document
.querySelectorAll(".card")
.forEach(v=>v.classList.remove("active"));

if(mode === "pvp"){

document
.querySelectorAll(".card")[1]
.classList.add("active");

document
.getElementById("pvpPanel")
.classList.remove("hidden");

players.style.display = "none";

renderPVP();

}else{

document
.querySelectorAll(".card")[0]
.classList.add("active");

document
.getElementById("pvpPanel")
.classList.add("hidden");

players.style.display = "flex";

render();

}

}

async function getPvpAvatar(username){

if(!username) return null;

const key = username.toLowerCase();

if(avatarCache.has(key)){
return avatarCache.get(key);
}

const userId = await fetchRobloxUserId(username);

if(!userId) return null;

const thumb =
await fetch(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`
)
.then(r=>r.json())
.then(r=>r?.data?.[0]?.imageUrl || null)
.catch(()=>null);

if(!thumb) return null;

const img = await loadImage(
thumb,
4,
9000,
true
);

if(!img) return null;

avatarCache.set(key,img);

return img;

}

function drawRoundedRect(ctx,x,y,w,h,r){

ctx.beginPath();

ctx.moveTo(x+r,y);

ctx.lineTo(x+w-r,y);

ctx.quadraticCurveTo(x+w,y,x+w,y+r);

ctx.lineTo(x+w,y+h-r);

ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);

ctx.lineTo(x+r,y+h);

ctx.quadraticCurveTo(x,y+h,x,y+h-r);

ctx.lineTo(x,y+r);

ctx.quadraticCurveTo(x,y,x+r,y);

ctx.closePath();

}

function fitFont(text,max,start){

let size = start;

while(size > 10){

ctx.font = `bold ${size}px Arial`;

if(ctx.measureText(text).width <= max){
return size;
}

size--;

}

return size;

}

async function renderPVP(){

ctx.clearRect(0,0,canvas.width,canvas.height);

const bgURL =
document.getElementById("pvp_bg").value.trim();

const bg =
await loadImage(
bgURL || defaultBG,
3,
10000,
true
);

if(bg){

ctx.drawImage(
bg,
0,
0,
canvas.width,
canvas.height
);

ctx.fillStyle = "rgba(0,0,0,.45)";
ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}else{

const grad =
ctx.createLinearGradient(0,0,0,1000);

grad.addColorStop(0,"#050505");
grad.addColorStop(1,"#000");

ctx.fillStyle = grad;
ctx.fillRect(0,0,1600,1000);

}

const nick1 =
document.getElementById("pvp_nick1").value.trim();

const nick2 =
document.getElementById("pvp_nick2").value.trim();

const name1 =
document.getElementById("pvp_name1").value.trim()
|| nick1
|| "Player 1";

const name2 =
document.getElementById("pvp_name2").value.trim()
|| nick2
|| "Player 2";

const color1 =
document.getElementById("pvp_color1").value;

const color2 =
document.getElementById("pvp_color2").value;

const score =
document.getElementById("pvp_score").value.trim()
|| "0-0";

const left =
await getPvpAvatar(nick1);

const right =
await getPvpAvatar(nick2);

if(left){

ctx.save();

ctx.shadowColor = color1;
ctx.shadowBlur = 45;

drawRoundedRect(
ctx,
110,
180,
420,
520,
30
);

ctx.fillStyle =
"rgba(255,255,255,.04)";

ctx.fill();

ctx.restore();

ctx.drawImage(
left,
140,
180,
360,
360
);

ctx.fillStyle = color1;

ctx.fillRect(
160,
585,
320,
12
);

}

if(right){

ctx.save();

ctx.shadowColor = color2;
ctx.shadowBlur = 45;

drawRoundedRect(
ctx,
1070,
180,
420,
520,
30
);

ctx.fillStyle =
"rgba(255,255,255,.04)";

ctx.fill();

ctx.restore();

ctx.drawImage(
right,
1100,
180,
360,
360
);

ctx.fillStyle = color2;

ctx.fillRect(
1120,
585,
320,
12
);

}

ctx.save();

ctx.shadowColor =
"rgba(255,0,0,.5)";

ctx.shadowBlur = 40;

ctx.font = "bold 170px Arial";
ctx.textAlign = "center";

ctx.fillStyle = "white";

ctx.fillText(
"VS",
800,
510
);

ctx.restore();

const nameSize1 =
fitFont(name1,360,50);

ctx.font =
`bold ${nameSize1}px Arial`;

ctx.lineWidth = 10;
ctx.strokeStyle = "black";

ctx.strokeText(
name1,
320,
110
);

ctx.fillStyle = color1;

ctx.fillText(
name1,
320,
110
);

const nameSize2 =
fitFont(name2,360,50);

ctx.font =
`bold ${nameSize2}px Arial`;

ctx.strokeStyle = "black";

ctx.strokeText(
name2,
1280,
110
);

ctx.fillStyle = color2;

ctx.fillText(
name2,
1280,
110
);

ctx.font = "bold 130px Arial";

ctx.strokeStyle = "black";
ctx.lineWidth = 12;

ctx.strokeText(
score,
800,
900
);

ctx.fillStyle = "white";

ctx.fillText(
score,
800,
900
);

}

async function reloadPvpAvatars(){

avatarCache.clear();

await renderPVP();

}

document.addEventListener("input",()=>{

if(currentMode === "pvp"){

clearTimeout(renderTimeout);

renderTimeout = setTimeout(()=>{
renderPVP();
},300);

}

});