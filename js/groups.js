const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");

const $ = id =>
document.getElementById(id);

canvas.width = 1600;
canvas.height = 900;

const DEFAULT_BG =
"https://i.imgur.com/Z72kUog.png";

const imageCache =
new Map();

const sidebar =
$("sidebar");

let sidebarOpen = false;

let layoutMode = false;

let drag = null;

let data =
JSON.parse(
localStorage.getItem(
"zzm_groups_v3"
)
|| "null"
)
||
{
bgUrl:DEFAULT_BG,

globalColor:"#6f8cff",

useGlobalColor:true,

showBorders:true,

minimalBorders:false,

moveAll:false,

gapX:35,

gapY:28,

groups:[]
};

if(!data.groups.length){

for(let i=0;i<2;i++){

data.groups.push(
createGroup()
);

}

}

function createGroup(){

return{

x:0,
y:0,

width:360,
height:210,

show:true,

color:"#6f8cff",

teams:[
{
name:"",
emoji:""
},
{
name:"",
emoji:""
},
{
name:"",
emoji:""
},
{
name:"",
emoji:""
}
]

};

}

function saveData(){

localStorage.setItem(
"zzm_groups_v3",
JSON.stringify(data)
);

}

function toggleSidebar(){

sidebarOpen = !sidebarOpen;

sidebar.classList.toggle(
"open",
sidebarOpen
);

}

window.toggleSidebar =
toggleSidebar;

function addGroup(){

data.groups.push(
createGroup()
);

renderSidebar();

render();

saveData();

}

window.addGroup =
addGroup;

function removeGroup(i){

data.groups.splice(i,1);

renderSidebar();

render();

saveData();

}

window.removeGroup =
removeGroup;

function renderSidebar(){

const wrap =
$("groupsContainer");

wrap.innerHTML = "";

data.groups.forEach((g,i)=>{

const div =
document.createElement("div");

div.className =
"group-box";

div.innerHTML = `

<div class="group-top">

<div class="group-title">
BLOCK ${i+1}
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

<label>Width</label>

<input
type="range"
min="180"
max="700"
value="${g.width}"
class="group-width"
data-group="${i}"
>

<label>Height</label>

<input
type="range"
min="120"
max="500"
value="${g.height}"
class="group-height"
data-group="${i}"
>

<div class="check-line">

<input
type="checkbox"
class="group-show"
data-group="${i}"
${g.show ? "checked" : ""}

>

<span>
Show block
</span>

</div>

${g.teams.map((t,ti)=>`

<div class="team-item">

<input
class="team-name"
data-group="${i}"
data-team="${ti}"
value="${t.name || ""}"
placeholder="Team"
>

<input
class="team-emoji"
data-group="${i}"
data-team="${ti}"
value="${t.emoji || ""}"
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

data.groups[g]
.teams[t]
.name =
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

data.groups[g]
.teams[t]
.emoji =
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

const val =
e.target.value;

data.groups[g]
.color = val;

if(
$("useGlobalColor").checked
){

data.globalColor =
val;

$("globalColor").value =
val;

data.groups.forEach(group=>{

group.color = val;

});

}

render();

saveData();

};

});

document
.querySelectorAll(".group-width")
.forEach(el=>{

el.oninput = e=>{

const g =
+e.target.dataset.group;

data.groups[g]
.width =
+e.target.value;

render();

saveData();

};

});

document
.querySelectorAll(".group-height")
.forEach(el=>{

el.oninput = e=>{

const g =
+e.target.dataset.group;

data.groups[g]
.height =
+e.target.value;

render();

saveData();

};

});

document
.querySelectorAll(".group-show")
.forEach(el=>{

el.onchange = e=>{

const g =
+e.target.dataset.group;

data.groups[g]
.show =
e.target.checked;

render();

saveData();

};

});

}

function emojiURL(text){

const match =
String(text || "")
.trim()
.match(/<?a?:.+:(\d+)>?/);

if(!match)
return null;

return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=256&quality=lossless`;

}

async function loadImage(src){

return new Promise(resolve=>{

if(!src)
return resolve(null);

if(imageCache.has(src)){

return resolve(
imageCache.get(src)
);

}

const img =
new Image();

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
"#10131d";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

ctx.fillStyle =
"rgba(0,0,0,.18)";

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

const minimalBorders =
$("minimalBorders").checked;

for(let i=0;i<data.groups.length;i++){

const g =
data.groups[i];

if(!g.show)
continue;

const col =
i % 2;

const row =
Math.floor(i / 2);

const startX =
120;

const startY =
100;

const x =
startX +
(col * (g.width + gapX))
+ g.x;

const y =
startY +
(row * (g.height + gapY))
+ g.y;

const color =
useGlobal
? globalColor
: g.color;

ctx.save();

ctx.shadowColor =
minimalBorders
? "transparent"
: color;

ctx.shadowBlur =
minimalBorders
? 0
: 24;

roundedRect(
x,
y,
g.width,
g.height,
22
);

ctx.fillStyle =
minimalBorders
? "rgba(0,0,0,.18)"
: "rgba(0,0,0,.48)";

ctx.fill();

if(showBorders){

ctx.lineWidth =
minimalBorders
? 1
: 3;

ctx.strokeStyle =
minimalBorders
? "rgba(255,255,255,.18)"
: color;

ctx.stroke();

}

ctx.restore();

const rowH =
g.height / 4;

for(let t=0;t<4;t++){

const team =
g.teams[t];

const ty =
y + (t * rowH);

if(
t !== 0 &&
!minimalBorders
){

ctx.fillStyle =
"rgba(255,255,255,.08)";

ctx.fillRect(
x + 20,
ty,
g.width - 40,
1
);

}

ctx.fillStyle =
"white";

ctx.textAlign =
"left";

ctx.textBaseline =
"middle";

ctx.font =
`bold ${Math.max(
18,
rowH * .22
)}px Arial`;

ctx.fillText(
team.name || "",
x + 30,
ty + rowH/2
);

const emoji =
emojiURL(
team.emoji
);

if(emoji){

const img =
await loadImage(
emoji
);

if(img){

const size =
rowH * .58;

ctx.drawImage(
img,
x + g.width - size - 26,
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
x + g.width/2,
y - 20,
28,
0,
Math.PI * 2
);

ctx.fillStyle =
color;

ctx.fill();

ctx.fillStyle =
"white";

ctx.textAlign =
"center";

ctx.font =
"bold 13px Arial";

ctx.fillText(
"MOVE",
x + g.width/2,
y - 16
);

}

}

}

function toggleLayoutMode(){

layoutMode =
!layoutMode;

render();

}

window.toggleLayoutMode =
toggleLayoutMode;

function resetLayout(){

data.groups.forEach(g=>{

g.x = 0;
g.y = 0;

});

render();

saveData();

}

window.resetLayout =
resetLayout;

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

const gapX =
+$("gapX").value;

const gapY =
+$("gapY").value;

for(let i=data.groups.length-1;i>=0;i--){

const g =
data.groups[i];

const col =
i % 2;

const row =
Math.floor(i / 2);

const x =
120 +
(col * (g.width + gapX))
+ g.x;

const y =
100 +
(row * (g.height + gapY))
+ g.y;

if(
p.x >= x - 40 &&
p.x <= x + g.width + 40 &&
p.y >= y - 40 &&
p.y <= y + g.height + 40
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

const dx =
p.x - drag.startX;

const dy =
p.y - drag.startY;

if($("moveAll").checked){

data.groups.forEach(g=>{

g.x += dx;
g.y += dy;

});

drag.startX = p.x;
drag.startY = p.y;

}else{

const g =
data.groups[drag.index];

g.x =
drag.origX + dx;

g.y =
drag.origY + dy;

}

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

window.saveLocal =
saveLocal;

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

window.downloadImage =
downloadImage;

function saveTXT(){

const blob =
new Blob(
[
JSON.stringify(
data,
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
URL.createObjectURL(
blob
);

a.download =
"groups.txt";

a.click();

}

window.saveTXT =
saveTXT;

function loadTXT(){

$("txtLoader").click();

}

window.loadTXT =
loadTXT;

$("txtLoader")
.addEventListener(
"change",
e=>{

const file =
e.target.files[0];

if(!file)
return;

const reader =
new FileReader();

reader.onload =
()=>{

try{

data =
JSON.parse(
reader.result
);

saveData();

renderSidebar();

render();

}catch{

alert(
"Invalid file"
);

}

};

reader.readAsText(
file
);

}
);

[
"bgUrl",
"globalColor",
"useGlobalColor",
"showBorders",
"minimalBorders",
"gapX",
"gapY"
]
.forEach(id=>{

$(id)
?.addEventListener(
"input",
()=>{

if(
id === "globalColor" &&
$("useGlobalColor").checked
){

data.groups.forEach(g=>{

g.color =
$("globalColor").value;

});

renderSidebar();

}

render();

saveData();

}
);

});

renderSidebar();

render();