// js/pvp.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const VS_URL = "https://i.imgur.com/DOys6I4.png";

const cache = {
users: new Map(),
thumbs: new Map(),
avatars: new Map(),
images: new Map()
};

function $(id){
return document.getElementById(id);
}

function fitText(text,max,size){

while(size > 10){

ctx.font = `bold ${size}px Arial`;

if(ctx.measureText(text).width <= max){
return size;
}

size--;
}

return size;
}

function roundRect(x,y,w,h,r){

ctx.beginPath();

ctx.moveTo(x+r,y);
ctx.arcTo(x+w,y,x+w,y+h,r);
ctx.arcTo(x+w,y+h,x,y+h,r);
ctx.arcTo(x,y+h,x,y,r);
ctx.arcTo(x,y,x+w,y,r);

ctx.closePath();
}

async function loadImage(src){

if(!src) return null;

if(cache.images.has(src)){
return cache.images.get(src);
}

return new Promise(resolve=>{

const img = new Image();

img.crossOrigin = "anonymous";

img.onload = ()=>{

cache.images.set(src,img);

resolve(img);

};

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

if(cache.users.has(clean)){
return cache.users.get(clean);
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

cache.users.set(clean,id);

return id;

}catch{

return null;

}
}

async function getAvatar(username){

if(!username) return null;

const clean =
username.trim().toLowerCase();

if(cache.avatars.has(clean)){
return cache.avatars.get(clean);
}

try{

let thumb =
cache.thumbs.get(clean);

if(!thumb){

const id =
await getUserId(username);

if(!id) return null;

const res = await fetch(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
);

const json = await res.json();

thumb =
json?.data?.[0]?.imageUrl;

if(!thumb) return null;

cache.thumbs.set(clean,thumb);

}

const img =
await loadImage(thumb);

if(!img) return null;

cache.avatars.set(clean,img);

return img;

}catch{

return null;

}
}

function drawBackground(bg,color1,color2){

ctx.fillStyle = "#1b1b1b";
ctx.fillRect(0,0,WIDTH,HEIGHT);

if(bg){

ctx.globalAlpha = .25;
ctx.drawImage(bg,0,0,WIDTH,HEIGHT);
ctx.globalAlpha = 1;

}

const glow1 =
ctx.createRadialGradient(
200,
250,
50,
200,
250,
450
);

glow1.addColorStop(0,color1+"55");
glow1.addColorStop(1,"transparent");

ctx.fillStyle = glow1;
ctx.fillRect(0,0,WIDTH,HEIGHT);

const glow2 =
ctx.createRadialGradient(
WIDTH-200,
250,
50,
WIDTH-200,
250,
450
);

glow2.addColorStop(0,color2+"55");
glow2.addColorStop(1,"transparent");

ctx.fillStyle = glow2;
ctx.fillRect(0,0,WIDTH,HEIGHT);

ctx.fillStyle =
"rgba(255,255,255,.04)";

ctx.fillRect(0,0,WIDTH,HEIGHT);

}

function drawName(text,x,y,color){

const size =
fitText(text,360,42);

ctx.font =
`bold ${size}px Arial`;

ctx.textAlign = "center";
ctx.textBaseline = "middle";

ctx.lineWidth = 9;

ctx.strokeStyle =
"rgba(0,0,0,.95)";

ctx.strokeText(text,x,y);

ctx.fillStyle = color;
ctx.fillText(text,x,y);

}

function drawPlayerBox(x,color){

ctx.save();

ctx.shadowColor = color;
ctx.shadowBlur = 35;

roundRect(
x-180,
90,
360,
440,
28
);

ctx.fillStyle =
"rgba(255,255,255,.03)";

ctx.fill();

ctx.lineWidth = 4;
ctx.strokeStyle = color;
ctx.stroke();

ctx.restore();

}

async function render(){

const leftNick =
$("leftNick").value.trim();

const rightNick =
$("rightNick").value.trim();

const leftName =
$("leftName").value.trim() || leftNick;

const rightName =
$("rightName").value.trim() || rightNick;

const score =
$("score").value.trim() || "0-0";

const color1 =
$("color1").value;

const color2 =
$("color2").value;

const bgUrl =
$("background").value.trim();

ctx.clearRect(0,0,WIDTH,HEIGHT);

const [
leftAvatar,
rightAvatar,
vs,
bg
] = await Promise.all([
getAvatar(leftNick),
getAvatar(rightNick),
loadImage(VS_URL),
loadImage(bgUrl)
]);

drawBackground(bg,color1,color2);

drawPlayerBox(250,color1);
drawPlayerBox(WIDTH-250,color2);

if(leftAvatar){

ctx.drawImage(
leftAvatar,
70,
120,
360,
360
);

}

if(rightAvatar){

ctx.drawImage(
rightAvatar,
WIDTH-430,
120,
360,
360
);

}

drawName(
leftName,
250,
80,
color1
);

drawName(
rightName,
WIDTH-250,
80,
color2
);

ctx.fillStyle = color1;

ctx.fillRect(
130,
530,
240,
12
);

ctx.fillStyle = color2;

ctx.fillRect(
WIDTH-370,
530,
240,
12
);

ctx.font =
"bold 104px Arial";

ctx.textAlign = "center";

ctx.lineWidth = 12;

ctx.strokeStyle =
"rgba(0,0,0,.95)";

ctx.strokeText(
score,
WIDTH/2,
605
);

ctx.fillStyle = "white";

ctx.fillText(
score,
WIDTH/2,
605
);

if(vs){

ctx.save();

ctx.shadowColor =
"rgba(255,0,0,.45)";

ctx.shadowBlur = 28;

ctx.drawImage(
vs,
WIDTH/2-110,
HEIGHT/2-110,
220,
220
);

ctx.restore();

}
}

function getData(){

return{
leftNick:$("leftNick").value,
rightNick:$("rightNick").value,
leftName:$("leftName").value,
rightName:$("rightName").value,
color1:$("color1").value,
color2:$("color2").value,
score:$("score").value,
background:$("background").value
};

}

function applyData(data){

$("leftNick").value =
data.leftNick || "";

$("rightNick").value =
data.rightNick || "";

$("leftName").value =
data.leftName || "";

$("rightName").value =
data.rightName || "";

$("color1").value =
data.color1 || "#ff004c";

$("color2").value =
data.color2 || "#00d9ff";

$("score").value =
data.score || "0-0";

$("background").value =
data.background || "";

render();

}

function saveLocalPVP(){

localStorage.setItem(
"zzm_pvp",
JSON.stringify(getData())
);

}

function downloadTXTPVP(){

const blob = new Blob(
[
JSON.stringify(
getData(),
null,
2
)
],
{
type:"application/json"
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

$("txtLoader").click();

}

$("txtLoader").addEventListener(
"change",
e=>{

const file =
e.target.files[0];

if(!file) return;

const reader =
new FileReader();

reader.onload = ()=>{

try{

applyData(
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

cache.users.clear();
cache.thumbs.clear();
cache.avatars.clear();

await render();

}

let timeout;

document.addEventListener(
"input",
()=>{

clearTimeout(timeout);

timeout =
setTimeout(
render,
120
);

}
);

function toggleSidebar(){

$("sidebar")
.classList.toggle("open");

}

const save =
localStorage.getItem("zzm_pvp");

if(save){

try{

applyData(JSON.parse(save));

}catch{

render();

}

}else{

render();

}