// js/groups.js

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");

canvas.width = 1536;
canvas.height = 864;

const $ = id =>
document.getElementById(id);

const sidebar =
$("sidebar");

let sidebarOpen = false;

let layoutMode = false;

const imageCache =
new Map();

const defaultLayout = {
x:294,
y:116,
gapX:24,
gapY:28,
boxWidth:286,
boxHeight:274,
teamHeight:42,
groupsPerRow:4,
scale:1
};

let layout =
JSON.parse(
localStorage.getItem(
"zzm_groups_layout"
)
) ||
structuredClone(defaultLayout);

function syncInputs(){

$("boxWidth").value =
layout.boxWidth;

$("boxHeight").value =
layout.boxHeight;

$("teamHeight").value =
layout.teamHeight;

$("gapX").value =
layout.gapX;

$("gapY").value =
layout.gapY;

$("groupsPerRow").value =
layout.groupsPerRow;

}

syncInputs();

function saveLayout(){

localStorage.setItem(
"zzm_groups_layout",
JSON.stringify(layout)
);

}

function toggleSidebar(){

sidebarOpen = !sidebarOpen;

if(window.innerWidth <= 900){

sidebar.style.transform =
sidebarOpen
? "translateX(0)"
: "translateX(-100%)";

}

}

window.addEventListener(
"resize",
()=>{

if(window.innerWidth > 900){

sidebar.style.transform =
"translateX(0)";

}

}
);

function toggleLayout(){

layoutMode = !layoutMode;

render();

}

function resetLayout(){

layout =
structuredClone(defaultLayout);

syncInputs();

saveLayout();

render();

}

function addGroup(){

$("groupCount").value =
parseInt(
$("groupCount").value || 8
) + 1;

generateInputs();

render();

}

function removeGroup(){

$("groupCount").value =
Math.max(
1,
parseInt(
$("groupCount").value || 8
) - 1
);

generateInputs();

render();

}

function generateInputs(){

const container =
$("groupsContainer");

container.innerHTML = "";

const groups =
parseInt(
$("groupCount").value || 8
);

const teams =
parseInt(
$("teamsPerGroup").value || 5
);

for(let g=0; g<groups; g++){

const div =
document.createElement("div");

div.className =
"group-box";

let html = `
<div class="group-title">
GROUP ${String.fromCharCode(65+g)}
</div>
`;

for(let t=0; t<teams; t++){

html += `
<div class="team-row">

<input
id="g${g}_team${t}"
placeholder="Team Name"
/>

<input
id="g${g}_emoji${t}"
placeholder="<:emoji:id>"
/>

</div>
`;

}

div.innerHTML = html;

container.appendChild(div);

}

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

img.crossOrigin = "anonymous";

img.onload = ()=>{

imageCache.set(src,img);

resolve(img);

};

img.onerror =
()=>resolve(null);

img.src =
src +
(src.includes("?")?"&":"?")
+ "t=" + Date.now();

});

}

function emojiURL(text){

const match =
String(text || "")
.match(/<?a?:\w+:(\d+)>?/);

if(!match)
return null;

return
`https://cdn.discordapp.com/emojis/${match[1]}.png?size=128&quality=lossless`;

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

ctx.lineTo(
x+w,
y+h-r
);

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

async function drawBackground(){

const bg =
await loadImage(
$("bg").value.trim()
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
"#050816";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

}

async function render(){

layout.boxWidth =
parseInt(
$("boxWidth").value
|| 286
);

layout.boxHeight =
parseInt(
$("boxHeight").value
|| 274
);

layout.teamHeight =
parseInt(
$("teamHeight").value
|| 42
);

layout.gapX =
parseInt(
$("gapX").value
|| 24
);

layout.gapY =
parseInt(
$("gapY").value
|| 28
);

layout.groupsPerRow =
parseInt(
$("groupsPerRow").value
|| 4
);

saveLayout();

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

await drawBackground();

ctx.fillStyle =
"white";

ctx.font =
"bold 150px Arial";

ctx.fillText(
$("sideText").value || "EU",
66,
458
);

const groups =
parseInt(
$("groupCount").value || 8
);

const teams =
parseInt(
$("teamsPerGroup").value || 5
);

for(let i=0; i<groups; i++){

const row =
Math.floor(
i /
layout.groupsPerRow
);

const col =
i %
layout.groupsPerRow;

const x =
layout.x +
col *
(layout.boxWidth +
layout.gapX);

const y =
layout.y +
row *
(layout.boxHeight +
layout.gapY);

await drawGroup(
x,
y,
i,
teams
);

}

if(layoutMode){

ctx.strokeStyle =
"#00d9ff";

ctx.lineWidth = 5;

ctx.strokeRect(
layout.x - 10,
layout.y - 10,
layout.boxWidth *
layout.groupsPerRow +
layout.gapX *
(layout.groupsPerRow - 1)
+ 20,
(
Math.ceil(
groups /
layout.groupsPerRow
)
*
(layout.boxHeight +
layout.gapY)
)
- layout.gapY
+ 20
);

}

}

async function drawGroup(
x,
y,
group,
teams
){

roundedRect(
x,
y,
layout.boxWidth,
layout.boxHeight,
0
);

ctx.fillStyle =
"rgba(0,0,0,.42)";

ctx.fill();

ctx.lineWidth = 3;

ctx.strokeStyle =
group % 2
? "#dc68ff"
: "#65d9ff";

ctx.stroke();

ctx.fillStyle =
"white";

ctx.textAlign =
"center";

ctx.font =
"bold 28px Arial";

ctx.fillText(
`GROUP ${
String.fromCharCode(
65+group
)
}`,
x +
layout.boxWidth/2,
y + 34
);

for(let i=0; i<teams; i++){

const rowY =
y + 58 +
i *
(layout.teamHeight + 8);

roundedRect(
x + 14,
rowY,
layout.boxWidth - 28,
layout.teamHeight,
8
);

ctx.fillStyle =
"rgba(0,0,0,.42)";

ctx.fill();

ctx.strokeStyle =
"rgba(255,255,255,.06)";

ctx.lineWidth = 1;

ctx.stroke();

const name =
$(`g${group}_team${i}`)
?.value || "";

ctx.textAlign =
"left";

ctx.fillStyle =
"white";

ctx.font =
"bold 20px Arial";

ctx.fillText(
name,
x + 24,
rowY +
layout.teamHeight/2 + 6
);

const emoji =
$(`g${group}_emoji${i}`)
?.value || "";

const url =
emojiURL(emoji);

if(url){

const img =
await loadImage(url);

if(img){

ctx.drawImage(
img,
x +
layout.boxWidth -
52,
rowY + 5,
layout.teamHeight - 10,
layout.teamHeight - 10
);

}

}

}

}

function collectData(){

const groups =
parseInt(
$("groupCount").value || 8
);

const teams =
parseInt(
$("teamsPerGroup").value || 5
);

const data = {
bg:
$("bg").value,

sideText:
$("sideText").value,

groupCount:groups,

teamsPerGroup:teams,

layout,

groups:[]
};

for(let g=0; g<groups; g++){

const arr = [];

for(let t=0; t<teams; t++){

arr.push({

name:
$(`g${g}_team${t}`)
.value,

emoji:
$(`g${g}_emoji${t}`)
.value

});

}

data.groups.push(arr);

}

return data;

}

function applyData(data){

$("bg").value =
data.bg || "";

$("sideText").value =
data.sideText || "";

$("groupCount").value =
data.groupCount || 8;

$("teamsPerGroup").value =
data.teamsPerGroup || 5;

layout =
data.layout ||
structuredClone(defaultLayout);

syncInputs();

generateInputs();

(data.groups || [])
.forEach((group,g)=>{

group.forEach((team,t)=>{

const n =
$(`g${g}_team${t}`);

const e =
$(`g${g}_emoji${t}`);

if(n)
n.value =
team.name || "";

if(e)
e.value =
team.emoji || "";

});

});

render();

}

function saveLocal(){

localStorage.setItem(
"zzm_groups_save",
JSON.stringify(
collectData()
)
);

alert("Saved");

}

function downloadTXT(){

const blob =
new Blob(
[
JSON.stringify(
collectData(),
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
"groups.txt";

a.click();

}

function loadTXT(){

$("txtLoader").click();

}

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

reader.onload = ()=>{

try{

applyData(
JSON.parse(
reader.result
)
);

}catch{

alert(
"Invalid file"
);

}

};

reader.readAsText(file);

}
);

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

document.addEventListener(
"input",
()=>{

clearTimeout(render.t);

render.t =
setTimeout(
render,
80
);

}
);

let drag = null;

canvas.addEventListener(
"pointerdown",
e=>{

if(!layoutMode)
return;

drag = {
x:e.clientX,
y:e.clientY,
layout:
structuredClone(layout)
};

}
);

window.addEventListener(
"pointermove",
e=>{

if(!drag)
return;

layout.x =
drag.layout.x +
(e.clientX - drag.x);

layout.y =
drag.layout.y +
(e.clientY - drag.y);

render();

}
);

window.addEventListener(
"pointerup",
()=>{

drag = null;

}
);

generateInputs();

const local =
localStorage.getItem(
"zzm_groups_save"
);

if(local){

try{

applyData(
JSON.parse(local)
);

}catch{

render();

}

}else{

render();

}