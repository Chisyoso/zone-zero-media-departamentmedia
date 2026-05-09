// js/groups.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

canvas.width = 1600;
canvas.height = 900;

const DEFAULT_BG =
"https://i.imgur.com/Z72kUog.png";

const sidebar = $("sidebar");

let sidebarOpen = false;

function toggleSidebar(){

sidebarOpen = !sidebarOpen;

if(window.innerWidth <= 900){

sidebar.style.transform =
sidebarOpen
? "translateX(0)"
: "translateX(-100%)";

}

}

window.addEventListener("resize",()=>{

if(window.innerWidth > 900){

sidebar.style.transform = "translateX(0)";

}else{

sidebar.style.transform =
"translateX(-100%)";

}

});

if(window.innerWidth <= 900){

sidebar.style.transform =
"translateX(-100%)";

}

const imageCache = new Map();

let layoutMode = false;

let drag = null;

let groups =
JSON.parse(
localStorage.getItem("zzm_groups_data")
|| "null"
)
||
[
createGroup(),
createGroup()
];

function createGroup(){

return{

x:0,
y:0,

color:"#6f8cff",

teams:[
{
name:"TEAM 1",
emoji:"<:LOGO:1501791652354719925>"
},
{
name:"TEAM 2",
emoji:"<:LOGO:1501791652354719925>"
},
{
name:"TEAM 3",
emoji:"<:LOGO:1501791652354719925>"
},
{
name:"TEAM 4",
emoji:"<:LOGO:1501791652354719925>"
}
]

};

}

function saveData(){

localStorage.setItem(
"zzm_groups_data",
JSON.stringify(groups)
);

}

function addGroup(){

groups.push(createGroup());

renderSidebar();

render();

saveData();

}

function removeGroup(i){

groups.splice(i,1);

renderSidebar();

render();

saveData();

}

function renderSidebar(){

const wrap =
$("groupsContainer");

wrap.innerHTML = "";

groups.forEach((g,i)=>{

const div =
document.createElement("div");

div.className =
"group-box";

div.innerHTML = `

<div class="group-top">

<div class="group-title">
Block ${i+1}
</div>

<button
class="group-remove"
onclick="removeGroup(${i})"
>
✕
</button>

</div>

<label>Block Color</label>

<input
type="color"
class="group-color"
data-group="${i}"
value="${g.color}"
>

<div class="check-line">

<input
type="checkbox"
class="move-group"
data-group="${i}"
checked
>

<span>
Move this block
</span>

</div>

${g.teams.map((t,ti)=>`

<div class="team-item">

<input
class="team-name"
data-group="${i}"
data-team="${ti}"
value="${t.name}"
placeholder="Team name"
>

<input
class="team-emoji"
data-group="${i}"
data-team="${ti}"
value="${t.emoji}"
placeholder="<:emoji:id>"
>

</div>

`).join("")}

`;

wrap.appendChild(div);

});

bindInputs();

}

function bindInputs(){

document
.querySelectorAll(".team-name")
.forEach(el=>{

el.oninput = e=>{

const g =
+e.target.dataset.group;

const t =
+e.target.dataset.team;

groups[g].teams[t].name =
e.target.value;

render();

saveData();

};

});

document
.querySelectorAll(".team-emoji")
.forEach(el=>{

el.oninput = e=>{

const g =
+e.target.dataset.group;

const t =
+e.target.dataset.team;

groups[g].teams[t].emoji =
e.target.value;

render();

saveData();

};

});

document
.querySelectorAll(".group-color")
.forEach(el=>{

el.oninput = e=>{

const g =
+e.target.dataset.group;

groups[g].color =
e.target.value;

render();

saveData();

};

});

}

function emojiURL(text){

const match =
String(text || "")
.match(/<?a?:\w+:(\d+)>?/);

if(!match) return null;

return
`https://cdn.discordapp.com/emojis/${match[1]}.png?size=128&quality=lossless`;

}

async function loadImage(src){

return new Promise(resolve=>{

if(!src)
return resolve(null);

if(imageCache.has(src))
return resolve(
imageCache.get(src)
);

const img = new Image();

img.crossOrigin =
"anonymous";

img.onload = ()=>{

imageCache.set(src,img);

resolve(img);

};

img.onerror = ()=>{

resolve(null);

};

img.src =
src +
(src.includes("?")
? "&"
: "?") +
"t=" +
Date.now();

});

}

async function drawBackground(){

const bg =
await loadImage(
$("bgUrl").value.trim()
|| DEFAULT_BG
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

ctx.fillStyle =
"#0b0f18";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

ctx.fillStyle =
"rgba(0,0,0,.25)";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

function roundedRect(
x,y,w,h,r
){

ctx.beginPath();

ctx.moveTo(x+r,y);

ctx.lineTo(x+w-r,y);

ctx.quadraticCurveTo(
x+w,y,
x+w,y+r
);

ctx.lineTo(x+w,y+h-r);

ctx.quadraticCurveTo(
x+w,y+h,
x+w-r,y+h
);

ctx.lineTo(x+r,y+h);

ctx.quadraticCurveTo(
x,y+h,
x,y+h-r
);

ctx.lineTo(x,y+r);

ctx.quadraticCurveTo(
x,y,
x+r,y
);

ctx.closePath();

}

async function render(){

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

await drawBackground();

const width =
+$("blockWidth").value;

const height =
+$("blockHeight").value;

const gapX =
+$("gapX").value;

const gapY =
+$("gapY").value;

const useGlobal =
$("useGlobalColor").checked;

const globalColor =
$("globalColor").value;

const showBorders =
$("showBorders").checked;

groups.forEach(async(g,i)=>{

const col = i % 2;

const row =
Math.floor(i / 2);

const baseX =
180 +
(col * (width + gapX));

const baseY =
120 +
(row * (height + gapY));

const x =
baseX + g.x;

const y =
baseY + g.y;

const color =
useGlobal
? globalColor
: g.color;

ctx.save();

ctx.shadowColor =
color;

ctx.shadowBlur = 30;

roundedRect(
x,
y,
width,
height,
24
);

ctx.fillStyle =
"rgba(0,0,0,.45)";

ctx.fill();

if(showBorders){

ctx.lineWidth = 3;

ctx.strokeStyle =
color;

ctx.stroke();

}

ctx.restore();

const rowH =
height / 4;

for(let t=0;t<4;t++){

const team =
g.teams[t];

const ty =
y + (t * rowH);

if(t !== 0){

ctx.fillStyle =
"rgba(255,255,255,.08)";

ctx.fillRect(
x + 20,
ty,
width - 40,
1
);

}

ctx.fillStyle =
"white";

ctx.font =
`bold ${Math.max(
18,
rowH * .23
)}px Arial`;

ctx.textBaseline =
"middle";

ctx.textAlign =
"left";

ctx.fillText(
team.name || "?",
x + 30,
ty + rowH/2
);

const emoji =
emojiURL(team.emoji);

if(emoji){

const img =
await loadImage(emoji);

if(img){

const size =
rowH * .58;

ctx.drawImage(
img,
x + width - size - 26,
ty + rowH/2 - size/2,
size,
size
);

}

}

}

if(layoutMode){

ctx.beginPath();

ctx.arc(
x + width/2,
y - 18,
18,
0,
Math.PI * 2
);

ctx.fillStyle =
color;

ctx.fill();

ctx.fillStyle =
"white";

ctx.font =
"bold 12px Arial";

ctx.textAlign =
"center";

ctx.fillText(
"M",
x + width/2,
y - 14
);

}

});

}

function toggleLayoutMode(){

layoutMode =
!layoutMode;

render();

}

function resetLayout(){

groups.forEach(g=>{

g.x = 0;
g.y = 0;

});

render();

saveData();

}

function pointerPos(e){

const rect =
canvas.getBoundingClientRect();

return{

x:
(e.clientX - rect.left)
*
(canvas.width / rect.width),

y:
(e.clientY - rect.top)
*
(canvas.height / rect.height)

};

}

canvas.addEventListener(
"pointerdown",
e=>{

if(!layoutMode)
return;

const p =
pointerPos(e);

const width =
+$("blockWidth").value;

const height =
+$("blockHeight").value;

const gapX =
+$("gapX").value;

const gapY =
+$("gapY").value;

for(let i=groups.length-1;i>=0;i--){

const g = groups[i];

const col = i % 2;

const row =
Math.floor(i / 2);

const x =
180 +
(col * (width + gapX))
+ g.x;

const y =
120 +
(row * (height + gapY))
+ g.y;

if(
p.x >= x &&
p.x <= x + width &&
p.y >= y &&
p.y <= y + height
){

drag = {

index:i,

startX:p.x,
startY:p.y,

origX:g.x,
origY:g.y

};

break;

}

}

}
);

canvas.addEventListener(
"pointermove",
e=>{

if(!drag)
return;

const p =
pointerPos(e);

const g =
groups[drag.index];

g.x =
drag.origX +
(p.x - drag.startX);

g.y =
drag.origY +
(p.y - drag.startY);

render();

saveData();

}
);

window.addEventListener(
"pointerup",
()=>{

drag = null;

}
);

function saveLocal(){

saveData();

alert("Saved");

}

function downloadImage(){

const a =
document.createElement("a");

a.download =
"groups.png";

a.href =
canvas.toDataURL(
"image/png"
);

a.click();

}

[
"bgUrl",
"globalColor",
"useGlobalColor",
"showBorders",
"blockWidth",
"blockHeight",
"gapX",
"gapY"
]
.forEach(id=>{

$(id).addEventListener(
"input",
()=>{

render();

saveData();

}
);

});

renderSidebar();

render();