// js/pvp.js

const VS_IMAGE =
"https://i.imgur.com/DOys6I4.png";

let currentMode = "formation";

const pvpAvatarCache = new Map();
const pvpLoading = new Map();

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

async function getPVPAvatar(username){

if(!username) return null;

const clean = username.trim().toLowerCase();

if(pvpAvatarCache.has(clean)){
return pvpAvatarCache.get(clean);
}

if(pvpLoading.has(clean)){
return null;
}

pvpLoading.set(clean,true);

try{

const userId =
await fetchRobloxUserId(username);

if(!userId){

pvpLoading.delete(clean);
return null;

}

const thumbReq =
await fetch(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`
);

const thumbJson =
await thumbReq.json();

const imageUrl =
thumbJson?.data?.[0]?.imageUrl;

if(!imageUrl){

pvpLoading.delete(clean);
return null;

}

const img =
await loadImage(
imageUrl,
6,
12000,
true
);

if(!img){

pvpLoading.delete(clean);
return null;

}

pvpAvatarCache.set(clean,img);

pvpLoading.delete(clean);

return img;

}catch{

pvpLoading.delete(clean);
return null;

}

}

function roundedRectPVP(ctx,x,y,w,h,r){

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

function fitText(text,max,start){

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

function pvpData(){

return {
mode:"pvp",
nick1:document.getElementById("pvp_nick1").value,
nick2:document.getElementById("pvp_nick2").value,
name1:document.getElementById("pvp_name1").value,
name2:document.getElementById("pvp_name2").value,
score:document.getElementById("pvp_score").value,
bg:document.getElementById("pvp_bg").value,
color1:document.getElementById("pvp_color1").value,
color2:document.getElementById("pvp_color2").value
};

}

function applyPvpData(data){

document.getElementById("pvp_nick1").value =
data.nick1 || "";

document.getElementById("pvp_nick2").value =
data.nick2 || "";

document.getElementById("pvp_name1").value =
data.name1 || "";

document.getElementById("pvp_name2").value =
data.name2 || "";

document.getElementById("pvp_score").value =
data.score || "";

document.getElementById("pvp_bg").value =
data.bg || "";

document.getElementById("pvp_color1").value =
data.color1 || "#ff004c";

document.getElementById("pvp_color2").value =
data.color2 || "#00d9ff";

renderPVP();

}

const oldCollectData = collectData;

collectData = function(){

if(currentMode === "pvp"){
return pvpData();
}

return oldCollectData();

};

const oldApplyData = applyData;

applyData = function(data){

if(data.mode === "pvp"){

switchMode("pvp");
applyPvpData(data);

return;

}

switchMode("formation");
oldApplyData(data);

};

async function drawPVPBackground(bgURL){

ctx.fillStyle = "#0d0d0d";
ctx.fillRect(0,0,canvas.width,canvas.height);

if(bgURL){

const bg =
await loadImage(
bgURL,
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

ctx.fillStyle =
"rgba(0,0,0,.55)";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

}

const glow =
ctx.createRadialGradient(
800,
120,
10,
800,
120,
500
);

glow.addColorStop(
0,
"rgba(255,255,255,.13)"
);

glow.addColorStop(
1,
"rgba(255,255,255,0)"
);

ctx.fillStyle = glow;

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

async function drawPVPPlayer(
avatar,
x,
y,
color1,
color2
){

const boxW = 420;
const boxH = 520;

const boxX = x - boxW/2;
const boxY = 130;

ctx.save();

ctx.shadowColor = color1;
ctx.shadowBlur = 40;

roundedRectPVP(
ctx,
boxX,
boxY,
boxW,
boxH,
28
);

ctx.fillStyle =
"rgba(255,255,255,.03)";

ctx.fill();

ctx.lineWidth = 3;

ctx.strokeStyle =
"rgba(255,255,255,.10)";

ctx.stroke();

ctx.restore();

if(avatar){

ctx.drawImage(
avatar,
x-180,
y-180,
360,
360
);

}

const barY = y + 215;

const grad =
ctx.createLinearGradient(
x-120,
barY,
x+120,
barY
);

grad.addColorStop(0,color1);
grad.addColorStop(1,color2);

ctx.fillStyle = grad;

ctx.fillRect(
x-120,
barY,
240,
12
);

}

async function renderPVP(){

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

const nick1 =
document.getElementById("pvp_nick1").value.trim();

const nick2 =
document.getElementById("pvp_nick2").value.trim();

const name1 =
document.getElementById("pvp_name1").value.trim()
|| nick1
|| "Player1";

const name2 =
document.getElementById("pvp_name2").value.trim()
|| nick2
|| "Player2";

const score =
document.getElementById("pvp_score").value.trim()
|| "0-0";

const bgURL =
document.getElementById("pvp_bg").value.trim();

const color1 =
document.getElementById("pvp_color1").value;

const color2 =
document.getElementById("pvp_color2").value;

await drawPVPBackground(bgURL);

const avatar1 =
await getPVPAvatar(nick1);

const avatar2 =
await getPVPAvatar(nick2);

await drawPVPPlayer(
avatar1,
250,
370,
color1,
color2
);

await drawPVPPlayer(
avatar2,
1350,
370,
color2,
color1
);

const vs =
await loadImage(
VS_IMAGE,
3,
10000,
true
);

if(vs){

ctx.save();

ctx.shadowColor =
"rgba(255,0,0,.45)";

ctx.shadowBlur = 35;

ctx.drawImage(
vs,
690,
260,
220,
220
);

ctx.restore();

}

const glow =
ctx.createRadialGradient(
800,
500,
20,
800,
500,
350
);

glow.addColorStop(
0,
"rgba(255,255,255,.06)"
);

glow.addColorStop(
1,
"rgba(255,255,255,0)"
);

ctx.fillStyle = glow;

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

const size1 =
fitText(
name1,
360,
52
);

ctx.font =
`bold ${size1}px Arial`;

ctx.textAlign = "center";
ctx.textBaseline = "middle";

ctx.lineWidth = 9;

ctx.strokeStyle =
"rgba(0,0,0,.95)";

ctx.strokeText(
name1,
250,
90
);

ctx.fillStyle = color1;

ctx.fillText(
name1,
250,
90
);

const size2 =
fitText(
name2,
360,
52
);

ctx.font =
`bold ${size2}px Arial`;

ctx.strokeText(
name2,
1350,
90
);

ctx.fillStyle = color2;

ctx.fillText(
name2,
1350,
90
);

ctx.font =
"bold 120px Arial";

ctx.lineWidth = 12;

ctx.strokeStyle =
"rgba(0,0,0,.95)";

ctx.strokeText(
score,
800,
910
);

ctx.fillStyle = "white";

ctx.fillText(
score,
800,
910
);

ctx.fillStyle =
"rgba(255,255,255,.04)";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

async function reloadPvpAvatars(){

pvpAvatarCache.clear();

await renderPVP();

}

document.addEventListener("input",()=>{

if(currentMode !== "pvp") return;

clearTimeout(renderTimeout);

renderTimeout = setTimeout(()=>{

renderPVP();

},250);

});