// js/card.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const CARD_BG =
"https://i.imgur.com/9JXUwwa.jpeg";

const avatarCache = new Map();
const userIdCache = new Map();

const ROBLOX_PROXY =
"https://corsproxy.io/?";

const CARD = {
x: 0,
y: 0,
w: 750,
h: 1050
};

function qs(id){
return document.getElementById(id);
}

function roundedImage(img,x,y,w,h,r){

ctx.save();

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

ctx.clip();

ctx.drawImage(img,x,y,w,h);

ctx.restore();

}

async function loadImage(src,retries=4){

return new Promise(resolve=>{

if(!src) return resolve(null);

let tries = 0;

function attempt(){

tries++;

const img = new Image();

img.crossOrigin = "anonymous";

img.onload = ()=>resolve(img);

img.onerror = ()=>{

if(tries < retries){

setTimeout(attempt,500);

}else{

resolve(null);

}

};

img.src =
src +
(src.includes("?") ? "&" : "?") +
"t=" +
Date.now() +
tries;

}

attempt();

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

const json = await res.json();

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

try{

const res = await fetch(
ROBLOX_PROXY +
encodeURIComponent(
`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
)
);

const json = await res.json();

const url =
json?.data?.[0]?.imageUrl;

if(!url) return null;

const img =
await loadImage(url);

if(!img) return null;

avatarCache.set(clean,img);

return img;

}catch{

return null;

}
}

function discordEmojiToURL(text){

if(!text) return null;

const match =
text.match(/<?a?:\w+:(\d+)>?/);

if(!match) return null;

const id = match[1];

return `https://cdn.discordapp.com/emojis/${id}.png?size=128&quality=lossless`;

}

function drawText(text,x,y,size,color,align="center"){

ctx.font =
`bold ${size}px Arial`;

ctx.textAlign = align;

ctx.fillStyle = color;

ctx.shadowColor =
"rgba(0,0,0,.8)";

ctx.shadowBlur = 8;

ctx.fillText(text,x,y);

ctx.shadowBlur = 0;

}

function drawStat(x,title,value,color){

drawText(
title,
x,
880,
22,
"rgba(255,255,255,.7)"
);

drawText(
value,
x,
940,
64,
color
);

}

async function drawBackground(){

const bg =
await loadImage(CARD_BG);

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

if(bg){

ctx.drawImage(
bg,
0,
0,
canvas.width,
canvas.height
);

}else{

ctx.fillStyle = "#08111f";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

}

async function renderCard(){

await drawBackground();

const username =
qs("card_username").value.trim();

const playerName =
qs("card_name").value.trim() ||
username ||
"PLAYER";

const cardColor =
qs("card_color").value;

const bgColor =
qs("card_bg_color").value;

const badge =
qs("card_badge").value.trim();

ctx.fillStyle =
bgColor + "88";

ctx.fillRect(
120,
560,
510,
120
);

const avatar =
await fetchAvatar(username);

if(avatar){

roundedImage(
avatar,
180,
180,
390,
390,
30
);

}

ctx.strokeStyle =
cardColor;

ctx.lineWidth = 8;

ctx.strokeRect(
180,
180,
390,
390
);

const badgeURL =
discordEmojiToURL(badge);

if(badgeURL){

const badgeImg =
await loadImage(badgeURL);

if(badgeImg){

ctx.drawImage(
badgeImg,
72,
285,
72,
72
);

}

}

drawText(
playerName,
375,
725,
52,
cardColor
);

const stats = [

{
title:"DRI",
value:qs("dribbling").value || "0"
},

{
title:"PAS",
value:qs("passing").value || "0"
},

{
title:"SHT",
value:qs("shooting").value || "0"
},

{
title:"DEF",
value:qs("defense").value || "0"
}

];

const pos = [
120,
290,
460,
630
];

stats.forEach((s,i)=>{

drawStat(
pos[i],
s.title,
s.value,
cardColor
);

});

drawText(
"TEAM",
170,
1015,
18,
"rgba(255,255,255,.5)"
);

drawText(
qs("teamwork").value || "0",
170,
1060,
34,
"white"
);

drawText(
"IND",
320,
1015,
18,
"rgba(255,255,255,.5)"
);

drawText(
qs("individual").value || "0",
320,
1060,
34,
"white"
);

drawText(
"REA",
470,
1015,
18,
"rgba(255,255,255,.5)"
);

drawText(
qs("reaction").value || "0",
470,
1060,
34,
"white"
);

drawText(
"GEN",
620,
1015,
18,
"rgba(255,255,255,.5)"
);

drawText(
qs("general").value || "0",
620,
1060,
34,
"white"
);

}

let renderTimeout;

document.addEventListener(
"input",
()=>{

clearTimeout(renderTimeout);

renderTimeout =
setTimeout(()=>{
renderCard();
},120);

}
);

function collectCardData(){

return{

username:
qs("card_username").value,

name:
qs("card_name").value,

badge:
qs("card_badge").value,

color:
qs("card_color").value,

bg:
qs("card_bg_color").value,

dribbling:
qs("dribbling").value,

passing:
qs("passing").value,

shooting:
qs("shooting").value,

defense:
qs("defense").value,

teamwork:
qs("teamwork").value,

individual:
qs("individual").value,

reaction:
qs("reaction").value,

general:
qs("general").value

};

}

function applyCardData(data){

qs("card_username").value =
data.username || "";

qs("card_name").value =
data.name || "";

qs("card_badge").value =
data.badge || "";

qs("card_color").value =
data.color || "#00d9ff";

qs("card_bg_color").value =
data.bg || "#001a33";

[
"dribbling",
"passing",
"shooting",
"defense",
"teamwork",
"individual",
"reaction",
"general"
].forEach(v=>{

qs(v).value =
data[v] || "";

});

renderCard();

}

function saveLocalCard(){

localStorage.setItem(
"zzm_card_save",
JSON.stringify(
collectCardData()
)
);

alert("Saved locally");

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
"zzm-card.txt";

a.click();

}

function loadTXTCard(){

qs("txtLoader").click();

}

qs("txtLoader")
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

applyCardData(
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
"zzm-card.png";

a.href =
canvas.toDataURL("image/png");

a.click();

}

async function reloadAvatars(){

avatarCache.clear();

userIdCache.clear();

await renderCard();

}

const local =
localStorage.getItem(
"zzm_card_save"
);

if(local){

try{

applyCardData(
JSON.parse(local)
);

}catch{}

}

renderCard();