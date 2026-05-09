const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");

const CARD_BG =
"https://i.imgur.com/9JXUwwa.jpeg";

const ROBLOX_PROXY =
"https://corsproxy.io/?";

const avatarCache =
new Map();

const userIdCache =
new Map();

function toggleSidebar(){

document
.getElementById("sidebar")
.classList.toggle("open");

}

function roundedRect(x,y,w,h,r){

ctx.beginPath();

ctx.moveTo(x+r,y);

ctx.lineTo(x+w-r,y);

ctx.quadraticCurveTo(x+w,y,x+w,y+r);

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

async function fetchUserId(username){

const clean =
username.trim().toLowerCase();

if(userIdCache.has(clean)){

return userIdCache.get(clean);

}

try{

const res = await fetch(
ROBLOX_PROXY +
encodeURIComponent(
"https://users.roblox.com/v1/usernames/users"
),
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

const json =
await res.json();

const id =
json?.data?.[0]?.id;

if(!id) return null;

userIdCache.set(clean,id);

return id;

}catch{

return null;

}
}

async function fetchAvatar(username){

const clean =
username.trim().toLowerCase();

if(avatarCache.has(clean)){

return avatarCache.get(clean);

}

const userId =
await fetchUserId(username);

if(!userId) return null;

const res = await fetch(
ROBLOX_PROXY +
encodeURIComponent(
`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=720x720&format=Png&isCircular=false`
)
);

const json =
await res.json();

const url =
json?.data?.[0]?.imageUrl;

if(!url) return null;

const img =
await loadImage(url);

if(!img) return null;

avatarCache.set(clean,img);

return img;

}

function drawStat(label,value,x,y,color){

ctx.fillStyle = "white";

ctx.font =
"bold 28px Arial";

ctx.fillText(label,x,y);

roundedRect(x+170,y-26,240,24,12);

ctx.fillStyle =
"rgba(255,255,255,.12)";

ctx.fill();

roundedRect(
x+170,
y-26,
value*2.4,
24,
12
);

ctx.fillStyle = color;

ctx.fill();

ctx.fillStyle = "white";

ctx.font =
"bold 22px Arial";

ctx.fillText(value,x+430,y);

}

async function render(){

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

const bg =
await loadImage(CARD_BG);

if(bg){

ctx.drawImage(
bg,
0,
0,
canvas.width,
canvas.height
);

}

const username =
document
.getElementById("username")
.value
.trim();

const playerName =
document
.getElementById("playerName")
.value
.trim() || username;

const color =
document
.getElementById("teamColor")
.value;

const avatar =
await fetchAvatar(username);

if(avatar){

ctx.save();

ctx.beginPath();

ctx.arc(
350,
180,
95,
0,
Math.PI*2
);

ctx.closePath();

ctx.clip();

ctx.drawImage(
avatar,
255,
85,
190,
190
);

ctx.restore();

}

ctx.textAlign = "center";

ctx.fillStyle = "white";

ctx.font =
"bold 52px Arial";

ctx.fillText(
playerName,
350,
330
);

ctx.font =
"bold 70px Arial";

ctx.fillStyle = color;

ctx.fillText(
document
.getElementById("general")
.value,
350,
430
);

ctx.textAlign = "left";

drawStat(
"DRIBBLING",
+document
.getElementById("dribbling")
.value,
90,
540,
color
);

drawStat(
"PASSING",
+document
.getElementById("passing")
.value,
90,
610,
color
);

drawStat(
"SHOOTING",
+document
.getElementById("shooting")
.value,
90,
680,
color
);

drawStat(
"TEAMWORK",
+document
.getElementById("teamwork")
.value,
90,
750,
color
);

drawStat(
"INDIVIDUAL",
+document
.getElementById("individual")
.value,
90,
820,
color
);

drawStat(
"REACTION",
+document
.getElementById("reaction")
.value,
90,
890,
color
);

drawStat(
"DEFENSE",
+document
.getElementById("defense")
.value,
90,
960,
color
);

}

document.addEventListener(
"input",
()=>render()
);

function collectCardData(){

return{

username:
document.getElementById("username").value,

playerName:
document.getElementById("playerName").value,

teamColor:
document.getElementById("teamColor").value,

general:
document.getElementById("general").value,

dribbling:
document.getElementById("dribbling").value,

passing:
document.getElementById("passing").value,

shooting:
document.getElementById("shooting").value,

teamwork:
document.getElementById("teamwork").value,

individual:
document.getElementById("individual").value,

reaction:
document.getElementById("reaction").value,

defense:
document.getElementById("defense").value

};

}

function applyCardData(data){

Object.keys(data).forEach(key=>{

const el =
document.getElementById(key);

if(el){

el.value = data[key];

}

});

render();

}

function saveLocalCard(){

localStorage.setItem(
"zzm_card_save",
JSON.stringify(
collectCardData()
)
);

alert("Saved");

}

function downloadTXTCard(){

const blob =
new Blob(
[
JSON.stringify(
collectCardData(),
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
"player-card.txt";

a.click();

}

function loadTXTCard(){

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

applyCardData(
JSON.parse(reader.result)
);

};

reader.readAsText(file);

}
);

function downloadImageCard(){

const a =
document.createElement("a");

a.download =
"player-card.png";

a.href =
canvas.toDataURL();

a.click();

}

async function reloadAvatarCard(){

avatarCache.clear();

userIdCache.clear();

await render();

}

const local =
localStorage.getItem(
"zzm_card_save"
);

if(local){

applyCardData(
JSON.parse(local)
);

}else{

render();

}