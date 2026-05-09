// js/pvp.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = 1152;
const HEIGHT = 648;

canvas.width = WIDTH;
canvas.height = HEIGHT;

const VS_URL =
"https://i.imgur.com/DOys6I4.png";

const avatarCache = {};
const imageCache = {};

function safe(v){
return decodeURIComponent(v || "");
}

async function loadImageSafe(url){

try{

if(!url) return null;

if(imageCache[url]){
return imageCache[url];
}

const img = new Image();

img.crossOrigin = "anonymous";

const loaded =
await new Promise((resolve)=>{

img.onload = ()=> resolve(img);

img.onerror = ()=> resolve(null);

img.src =
url +
(url.includes("?") ? "&" : "?") +
"_t=" +
Date.now();

});

if(loaded){
imageCache[url] = loaded;
}

return loaded;

}catch{

return null;

}
}

async function getUserId(username){

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

const data = await res.json();

return data?.data?.[0]?.id || null;

}catch{

return null;

}
}

async function getAvatarFromUsername(username){

if(!username) return null;

const clean =
username.toLowerCase().trim();

if(avatarCache[clean]){
return avatarCache[clean];
}

const id =
await getUserId(username);

if(!id) return null;

try{

const res = await fetch(
`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
);

const data = await res.json();

const avatar =
data?.data?.[0]?.imageUrl || null;

if(avatar){
avatarCache[clean] = avatar;
}

return avatar;

}catch{

return null;

}
}

function hashString(str){

let h = 0;

for(let i = 0; i < str.length; i++){

h = (h << 5) - h + str.charCodeAt(i);

h |= 0;

}

return Math.abs(h);

}

function paletteFromSeed(seed){

const h =
hashString(seed || "?");

const hue1 = h % 360;

const hue2 =
(hue1 + 35 + (h % 40)) % 360;

return{

fill:
`hsla(${hue1}, 85%, 60%, 0.20)`,

stroke:
`hsla(${hue1}, 90%, 70%, 0.55)`,

text:
`hsla(${hue2}, 100%, 96%, 0.98)`,

glow:
`hsla(${hue1}, 90%, 65%, 0.28)`

};

}

function getCustomColors(c1,c2,fallbackSeed){

if(c1 && c2){

return{

fill:c1,
stroke:c2,
text:c2,
glow:c1

};

}

return paletteFromSeed(fallbackSeed);

}

function roundedRect(ctx,x,y,w,h,r){

const radius =
Math.min(r,w/2,h/2);

ctx.beginPath();

ctx.moveTo(x + radius,y);

ctx.arcTo(
x + w,
y,
x + w,
y + h,
radius
);

ctx.arcTo(
x + w,
y + h,
x,
y + h,
radius
);

ctx.arcTo(
x,
y + h,
x,
y,
radius
);

ctx.arcTo(
x,
y,
x + w,
y,
radius
);

ctx.closePath();

}

function fitFontSize(
ctx,
text,
maxWidth,
startSize,
weight = "bold",
family = "Sans"
){

let size = startSize;

while(size > 8){

ctx.font =
`${weight} ${size}px ${family}`;

if(
ctx.measureText(text).width
<= maxWidth
){
return size;
}

size--;

}

return size;

}

function drawCenteredText(
ctx,
text,
x,
y,
maxWidth,
startSize,
fillStyle,
strokeStyle,
lineWidth,
weight = "bold"
){

const size =
fitFontSize(
ctx,
text,
maxWidth,
startSize,
weight
);

ctx.font =
`${weight} ${size}px Sans`;

ctx.textAlign = "center";
ctx.textBaseline = "middle";

ctx.lineWidth = lineWidth;

ctx.strokeStyle = strokeStyle;
ctx.fillStyle = fillStyle;

ctx.strokeText(text,x,y);
ctx.fillText(text,x,y);

}

async function drawBackground(bgUrl){

if(bgUrl && bgUrl !== "0" && bgUrl !== "?"){

const img =
await loadImageSafe(bgUrl);

if(img){

ctx.drawImage(
img,
0,
0,
WIDTH,
HEIGHT
);

ctx.fillStyle =
"rgba(0,0,0,0.55)";

ctx.fillRect(
0,
0,
WIDTH,
HEIGHT
);

return;

}

}

const bg =
ctx.createLinearGradient(
0,
0,
0,
HEIGHT
);

bg.addColorStop(0,"#050505");
bg.addColorStop(0.55,"#0b0b0b");
bg.addColorStop(1,"#000000");

ctx.fillStyle = bg;

ctx.fillRect(
0,
0,
WIDTH,
HEIGHT
);

const glow =
ctx.createRadialGradient(
WIDTH / 2,
HEIGHT / 2,
50,
WIDTH / 2,
HEIGHT / 2,
WIDTH / 1.6
);

glow.addColorStop(
0,
"rgba(255,255,255,0.08)"
);

glow.addColorStop(
1,
"rgba(0,0,0,0)"
);

ctx.fillStyle = glow;

ctx.fillRect(
0,
0,
WIDTH,
HEIGHT
);

}

async function drawPlayer(
username,
x,
y,
color1,
color2
){

const avatarURL =
await getAvatarFromUsername(username);

const avatar =
avatarURL
? await loadImageSafe(avatarURL)
: null;

const palette =
getCustomColors(
color1,
color2,
username
);

const boxW = 360;
const boxH = 440;
const boxX = x - boxW / 2;
const boxY = 90;

ctx.save();

ctx.shadowColor =
palette.glow;

ctx.shadowBlur = 32;

roundedRect(
ctx,
boxX,
boxY,
boxW,
boxH,
28
);

ctx.fillStyle =
"rgba(255,255,255,0.03)";

ctx.fill();

ctx.lineWidth = 3;

ctx.strokeStyle =
"rgba(255,255,255,0.10)";

ctx.stroke();

ctx.restore();

if(avatar){

const size = 360;

ctx.drawImage(
avatar,
x - size / 2,
y - size / 2,
size,
size
);

}

const barY =
y + 210;

const grad =
ctx.createLinearGradient(
x - 120,
barY,
x + 120,
barY
);

grad.addColorStop(
0,
palette.fill
);

grad.addColorStop(
1,
palette.stroke
);

ctx.fillStyle = grad;

ctx.fillRect(
x - 120,
barY,
240,
12
);

}

async function drawVS(){

const vs =
await loadImageSafe(VS_URL);

if(vs){

ctx.save();

ctx.shadowColor =
"rgba(255,0,0,0.45)";

ctx.shadowBlur = 28;

ctx.drawImage(
vs,
WIDTH / 2 - 110,
HEIGHT / 2 - 110,
220,
220
);

ctx.restore();

}

}

async function renderPVP(){

ctx.clearRect(
0,
0,
WIDTH,
HEIGHT
);

const leftNick =
safe(
document.getElementById("leftNick").value
) || "Player1";

const rightNick =
safe(
document.getElementById("rightNick").value
) || "Player2";

const leftName =
safe(
document.getElementById("leftName").value
) || leftNick;

const rightName =
safe(
document.getElementById("rightName").value
) || rightNick;

const score =
safe(
document.getElementById("score").value
) || "0-0";

const bgUrl =
safe(
document.getElementById("background").value
);

const color1 =
safe(
document.getElementById("color1").value
);

const color2 =
safe(
document.getElementById("color2").value
);

await drawBackground(bgUrl);

const topGlow =
ctx.createRadialGradient(
WIDTH / 2,
80,
20,
WIDTH / 2,
80,
260
);

topGlow.addColorStop(
0,
"rgba(255,255,255,0.18)"
);

topGlow.addColorStop(
1,
"rgba(255,255,255,0)"
);

ctx.fillStyle = topGlow;

ctx.fillRect(
0,
0,
WIDTH,
HEIGHT
);

drawCenteredText(
ctx,
leftName,
250,
86,
360,
42,
getCustomColors(
color1,
color2,
leftName
).text,
"rgba(0,0,0,0.95)",
9
);

drawCenteredText(
ctx,
rightName,
WIDTH - 250,
86,
360,
42,
getCustomColors(
color1,
color2,
rightName
).text,
"rgba(0,0,0,0.95)",
9
);

drawCenteredText(
ctx,
score,
WIDTH / 2,
600,
320,
104,
"white",
"rgba(0,0,0,0.95)",
10
);

await drawPlayer(
leftNick,
250,
320,
color1,
color2
);

await drawPlayer(
rightNick,
WIDTH - 250,
320,
color1,
color2
);

await drawVS();

ctx.fillStyle =
"rgba(255,255,255,0.05)";

ctx.fillRect(
0,
0,
WIDTH,
HEIGHT
);

}

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

score:
document.getElementById("score").value,

background:
document.getElementById("background").value,

color1:
document.getElementById("color1").value,

color2:
document.getElementById("color2").value

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

document.getElementById("score").value =
data.score || "0-0";

document.getElementById("background").value =
data.background || "";

document.getElementById("color1").value =
data.color1 || "#ff004c";

document.getElementById("color2").value =
data.color2 || "#00d9ff";

renderPVP();

}

function saveLocalPVP(){

localStorage.setItem(
"zzm_team_pvp",
JSON.stringify(
collectPVPData()
)
);

alert("Saved");

}

function downloadTXTPVP(){

const blob =
new Blob(
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

Object.keys(avatarCache)
.forEach(key=> delete avatarCache[key]);

await renderPVP();

}

let renderTimeout;

document.addEventListener(
"input",
()=>{

clearTimeout(renderTimeout);

renderTimeout =
setTimeout(()=>{

renderPVP();

},150);

}
);

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

const localSave =
localStorage.getItem(
"zzm_team_pvp"
);

if(localSave){

try{

applyPVPData(
JSON.parse(localSave)
);

}catch{}

}

renderPVP();