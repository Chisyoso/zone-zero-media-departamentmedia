// js/pvp.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const avatarCache = new Map();
const thumbCache = new Map();
const userCache = new Map();

const VS_IMAGE =
"https://i.imgur.com/DOys6I4.png";

function delay(ms){
return new Promise(r=>setTimeout(r,ms));
}

function setStatus(side,state){

const el =
document.getElementById(side+"_status");

if(!el) return;

if(state==="loading"){
el.innerHTML =
`<span class="status loading"></span>`;
return;
}

if(state==="success"){
el.innerHTML =
`<span class="status success">✓</span>`;
return;
}

if(state==="error"){
el.innerHTML =
`<span class="status error">!</span>`;
return;
}

el.innerHTML =
`<span class="status idle"></span>`;
}

async function loadImage(src){

return new Promise(resolve=>{

if(!src) return resolve(null);

const img = new Image();

img.crossOrigin = "anonymous";

img.onload = ()=>resolve(img);

img.onerror = ()=>resolve(null);

img.src =
src +
(src.includes("?") ? "&" : "?") +
"t=" +
Date.now();

});

}

async function getUserId(username){

const clean =
username.trim().toLowerCase();

if(userCache.has(clean)){
return userCache.get(clean);
}

try{

const res = await fetch(
"https://users.roblox.com/v1/usernames/users",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
usernames:[username],
excludeBannedUsers:false
})
}
);

const json = await res.json();

const id =
json?.data?.[0]?.id;

if(!id) return null;

userCache.set(clean,id);

return id;

}catch{

return null;

}
}

async function getAvatarURL(username){

const clean =
username.trim().toLowerCase();

if(thumbCache.has(clean)){
return thumbCache.get(clean);
}

const userId =
await getUserId(username);

if(!userId) return null;

try{

const res = await fetch(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`
);

const json = await res.json();

const imageUrl =
json?.data?.[0]?.imageUrl;

if(!imageUrl) return null;

thumbCache.set(clean,imageUrl);

return imageUrl;

}catch{

return null;

}
}

async function getAvatar(username,side){

if(!username){

setStatus(side,"idle");

return null;

}

const clean =
username.trim().toLowerCase();

if(avatarCache.has(clean)){

setStatus(side,"success");

return avatarCache.get(clean);

}

setStatus(side,"loading");

const avatarURL =
await getAvatarURL(username);

if(!avatarURL){

setStatus(side,"error");

return null;

}

const img =
await loadImage(avatarURL);

if(!img){

setStatus(side,"error");

return null;

}

avatarCache.set(clean,img);

setStatus(side,"success");

return img;
}

function roundedRect(x,y,w,h,r){

ctx.beginPath();

ctx.moveTo(x+r,y);

ctx.lineTo(x+w-r,y);

ctx.quadraticCurveTo(
x+w,
y,
x+w,
y+r
);

ctx.lineTo(x+w,y+h-r);

ctx.quadraticCurveTo(
x+w,
y+h,
x+w-r,
y+h
);

ctx.lineTo(x+r,y+h);

ctx.quadraticCurveTo(
x,
y+h,
x,
y+h-r
);

ctx.lineTo(x,y+r);

ctx.quadraticCurveTo(
x,
y,
x+r,
y
);

ctx.closePath();

}

function drawBackground(){

ctx.fillStyle = "#6f6f6f";
ctx.fillRect(0,0,WIDTH,HEIGHT);

const grad =
ctx.createLinearGradient(
0,
0,
0,
HEIGHT
);

grad.addColorStop(
0,
"rgba(255,255,255,.05)"
);

grad.addColorStop(
1,
"rgba(0,0,0,.25)"
);

ctx.fillStyle = grad;
ctx.fillRect(0,0,WIDTH,HEIGHT);

}

async function drawVS(){

const img =
await loadImage(VS_IMAGE);

if(!img) return;

ctx.save();

ctx.shadowColor =
"rgba(255,0,0,.45)";

ctx.shadowBlur = 25;

ctx.drawImage(
img,
WIDTH/2-110,
HEIGHT/2-110,
220,
220
);

ctx.restore();

}

function fitText(text,max,start){

let size = start;

while(size > 10){

ctx.font =
`bold ${size}px Arial`;

if(
ctx.measureText(text).width
<= max
){
return size;
}

size--;

}

return size;
}

function drawName(text,x,y,color){

const size =
fitText(text,320,44);

ctx.font =
`bold ${size}px Arial`;

ctx.textAlign = "center";

ctx.lineWidth = 8;

ctx.strokeStyle =
"rgba(0,0,0,.9)";

ctx.strokeText(text,x,y);

ctx.fillStyle = color;

ctx.fillText(text,x,y);

}

async function render(){

ctx.clearRect(0,0,WIDTH,HEIGHT);

drawBackground();

const leftNick =
document.getElementById("leftNick")
.value.trim();

const rightNick =
document.getElementById("rightNick")
.value.trim();

const leftName =
document.getElementById("leftName")
.value.trim() || leftNick;

const rightName =
document.getElementById("rightName")
.value.trim() || rightNick;

const color1 =
document.getElementById("color1")
.value;

const color2 =
document.getElementById("color2")
.value;

const score =
document.getElementById("score")
.value.trim() || "0-0";

const leftAvatar =
await getAvatar(leftNick,"left");

const rightAvatar =
await getAvatar(rightNick,"right");

if(leftAvatar){

ctx.drawImage(
leftAvatar,
40,
90,
430,
430
);

}

if(rightAvatar){

ctx.drawImage(
rightAvatar,
WIDTH-470,
90,
430,
430
);

}

ctx.fillStyle =
"rgba(255,255,255,.04)";

roundedRect(
30,
70,
450,
470,
28
);

ctx.fill();

roundedRect(
WIDTH-480,
70,
450,
470,
28
);

ctx.fill();

ctx.lineWidth = 5;

ctx.strokeStyle = color1;

ctx.stroke();

roundedRect(
WIDTH-480,
70,
450,
470,
28
);

ctx.lineWidth = 5;

ctx.strokeStyle = color2;

ctx.stroke();

drawName(
leftName,
250,
65,
color1
);

drawName(
rightName,
WIDTH-250,
65,
color2
);

ctx.font =
"bold 100px Arial";

ctx.textAlign = "center";

ctx.lineWidth = 12;

ctx.strokeStyle =
"rgba(0,0,0,.9)";

ctx.strokeText(
score,
WIDTH/2,
600
);

ctx.fillStyle = "white";

ctx.fillText(
score,
WIDTH/2,
600
);

ctx.fillStyle = color1;

ctx.fillRect(
120,
540,
260,
12
);

ctx.fillStyle = color2;

ctx.fillRect(
WIDTH-380,
540,
260,
12
);

await drawVS();

}

let renderTimeout;

document.addEventListener(
"input",
()=>{

clearTimeout(renderTimeout);

renderTimeout =
setTimeout(()=>{
render();
},200);

}
);

function collectPVPData(){

return{
leftNick:
document.getElementById("leftNick").value,

rightNick:
document.getElementById("rightNick").value,

leftName:
document.getElementById("leftName").value,

rightName:
document.getElementById("rightName").value,

color1:
document.getElementById("color1").value,

color2:
document.getElementById("color2").value,

score:
document.getElementById("score").value
};

}

function applyPVPData(data){

document.getElementById("leftNick").value =
data.leftNick || "";

document.getElementById("rightNick").value =
data.rightNick || "";

document.getElementById("leftName").value =
data.leftName || "";

document.getElementById("rightName").value =
data.rightName || "";

document.getElementById("color1").value =
data.color1 || "#5b8cff";

document.getElementById("color2").value =
data.color2 || "#ff4f7a";

document.getElementById("score").value =
data.score || "0-0";

render();

}

function saveLocalPVP(){

localStorage.setItem(
"zzm_pvp_save",
JSON.stringify(
collectPVPData()
)
);

alert("Saved locally");

}

function downloadTXTPVP(){

const blob = new Blob(
[
JSON.stringify(
collectPVPData(),
null,
2
)
],
{
type:"text/plain"
}
);

const a =
document.createElement("a");

a.href =
URL.createObjectURL(blob);

a.download =
"team-pvp.txt";

a.click();

}

function loadTXTPVP(){

document
.getElementById("txtLoader")
.click();

}

document
.getElementById("txtLoader")
.addEventListener(
"change",
e=>{

const file =
e.target.files[0];

if(!file) return;

const reader =
new FileReader();

reader.onload = ()=>{

try{

applyPVPData(
JSON.parse(reader.result)
);

}catch{

alert("Invalid file");

}

};

reader.readAsText(file);

}
);

function downloadImage(){

const a =
document.createElement("a");

a.download =
"team-pvp.png";

a.href =
canvas.toDataURL("image/png");

a.click();

}

async function reloadAvatars(){

avatarCache.clear();
thumbCache.clear();
userCache.clear();

setStatus("left","loading");
setStatus("right","loading");

await render();

}

let sidebarOpen = false;

function toggleSidebar(){

sidebarOpen = !sidebarOpen;

document
.getElementById("sidebar")
.classList.toggle(
"open",
sidebarOpen
);

}

const local =
localStorage.getItem(
"zzm_pvp_save"
);

if(local){

try{

applyPVPData(
JSON.parse(local)
);

}catch{}

}

render();