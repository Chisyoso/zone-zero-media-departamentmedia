// js/card.js

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");

const BG =
"https://i.imgur.com/9JXUwwa.jpeg";

const proxy =
"https://corsproxy.io/?";

const avatarCache =
new Map();

const userCache =
new Map();

function qs(id){
return document.getElementById(id);
}

function toggleSidebar(){

document
.getElementById("sidebar")
.classList.toggle("open");

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
proxy +
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

userCache.set(clean,id);

return id;

}catch{

return null;

}
}

async function getAvatar(username){

const clean =
username.trim().toLowerCase();

if(avatarCache.has(clean)){
return avatarCache.get(clean);
}

const id =
await getUserId(username);

if(!id) return null;

try{

const res = await fetch(
proxy +
encodeURIComponent(
`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`
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

}catch{

return null;

}
}

function emojiURL(text){

const match =
text.match(/<?a?:\w+:(\d+)>?/);

if(!match) return null;

return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=128&quality=lossless`;

}

function text(txt,x,y,size,color){

ctx.font =
`bold ${size}px Arial`;

ctx.textAlign = "center";

ctx.fillStyle = color;

ctx.strokeStyle =
"rgba(0,0,0,.9)";

ctx.lineWidth = 5;

ctx.strokeText(txt,x,y);

ctx.fillText(txt,x,y);

}

async function renderCard(){

ctx.clearRect(
0,
0,
580,
746
);

const bg =
await loadImage(BG);

if(bg){

ctx.drawImage(
bg,
0,
0,
580,
746
);

}

const avatar =
await getAvatar(
qs("card_username").value
);

if(avatar){

ctx.save();

ctx.beginPath();

ctx.roundRect(
145,
130,
290,
290,
24
);

ctx.clip();

ctx.drawImage(
avatar,
145,
130,
290,
290
);

ctx.restore();

}

const mainColor =
qs("card_color").value;

ctx.strokeStyle =
mainColor;

ctx.lineWidth = 5;

ctx.strokeRect(
145,
130,
290,
290
);

ctx.fillStyle =
qs("card_bg_color").value + "cc";

ctx.fillRect(
72,
470,
436,
95
);

const emoji =
emojiURL(
qs("card_badge").value
);

if(emoji){

const emojiImg =
await loadImage(emoji);

if(emojiImg){

ctx.drawImage(
emojiImg,
48,
238,
50,
50
);

}

}

text(
(
qs("card_name").value ||
"PLAYER"
).slice(0,14),
290,
530,
42,
mainColor
);

const stats = [

{
t:"DRI",
v:qs("dribbling").value,
x:90
},

{
t:"PAS",
v:qs("passing").value,
x:220
},

{
t:"SHT",
v:qs("shooting").value,
x:355
},

{
t:"DEF",
v:qs("defense").value,
x:490
}

];

stats.forEach(s=>{

text(
s.t,
s.x,
615,
18,
"rgba(255,255,255,.6)"
);

text(
s.v || "0",
s.x,
680,
58,
mainColor
);

});

const small = [

{
t:"TMW",
v:qs("teamwork").value,
x:110
},

{
t:"IND",
v:qs("individual").value,
x:240
},

{
t:"REA",
v:qs("reaction").value,
x:370
},

{
t:"GEN",
v:qs("general").value,
x:500
}

];

small.forEach(s=>{

text(
s.t,
s.x,
710,
15,
"rgba(255,255,255,.5)"
);

text(
s.v || "0",
s.x,
738,
24,
"white"
);

});

}

let timeout;

document.addEventListener(
"input",
()=>{

clearTimeout(timeout);

timeout =
setTimeout(()=>{
renderCard();
},80);

}
);

function collect(){

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

function apply(data){

qs("card_username").value =
data.username || "";

qs("card_name").value =
data.name || "";

qs("card_badge").value =
data.badge || "";

qs("card_color").value =
data.color || "#00d9ff";

qs("card_bg_color").value =
data.bg || "#00162d";

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
"zzm_card",
JSON.stringify(
collect()
)
);

alert("Saved");

}

function downloadTXTCard(){

const blob =
new Blob(
[
JSON.stringify(
collect(),
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

apply(
JSON.parse(
reader.result
)
);

}catch{

alert("Invalid");

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

userCache.clear();

await renderCard();

}

const local =
localStorage.getItem(
"zzm_card"
);

if(local){

try{

apply(
JSON.parse(local)
);

}catch{}

}else{

renderCard();

}