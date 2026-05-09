// js/groups.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1536;
canvas.height = 864;

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const $ = id => document.getElementById(id);

const ROBLOX_PROXY =
"https://corsproxy.io/?";

const imageCache = new Map();

const sidebar = $("sidebar");

let sidebarOpen = false;

let layoutMode = false;

let drag = null;

const defaultLayout = {
x: 294,
y: 116,
gapX: 24,
gapY: 28,
boxWidth: 286,
boxHeight: 274,
teamHeight: 42,
groupsPerRow: 4
};

let layout =
JSON.parse(
localStorage.getItem(
"zzm_groups_layout"
)
) || structuredClone(defaultLayout);

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

function toggleLayout(){

layoutMode = !layoutMode;

render();

}

function resetLayout(){

layout =
structuredClone(defaultLayout);

saveLayout();

render();

}

function addGroup(){

const value =
parseInt($("groupCount").value || 8);

$("groupCount").value =
value + 1;

generateInputs();

render();

}

function removeGroup(){

const value =
parseInt($("groupCount").value || 8);

$("groupCount").value =
Math.max(1,value - 1);

generateInputs();

render();

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

img.onerror = ()=>resolve(null);

img.src =
src +
(src.includes("?") ? "&":"?")
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
<div class="groups-row">

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

ctx.fillStyle = "#050816";

ctx.fillRect(
0,
0,
canvas.width,
canvas.height
);

}

}

async function render(){

ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);

await drawBackground();

ctx.textAlign = "left";

ctx.fillStyle = "white";

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
i / layout.groupsPerRow
);

const col =
i % layout.groupsPerRow;

const x =
layout.x +
col *
(layout.boxWidth + layout.gapX);

const y =
layout.y +
row *
(layout.boxHeight + layout.gapY);

drawGroupBox(
x,
y,
i,
teams
);

}

if(layoutMode){

ctx.strokeStyle =
"#00d9ff";

ctx.lineWidth = 3;

ctx.strokeRect(
layout.x - 8,
layout.y - 8,
layout.boxWidth *
layout.groupsPerRow +
layout.gapX *
(layout.groupsPerRow - 1)
+ 16,
(
Math.ceil(
groups /
layout.groupsPerRow
)
*
(layout.boxHeight + layout.gapY)
)
- layout.gapY
+ 16
);

}

}

async function drawGroupBox(
x,
y,
groupIndex,
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
"rgba(0,0,0,.45)";

ctx.fill();

ctx.lineWidth = 3;

ctx.strokeStyle =
groupIndex % 2
? "#db6dff"
: "#6dd6ff";

ctx.stroke();

ctx.fillStyle = "white";

ctx.font =
"bold 28px Arial";

ctx.textAlign = "center";

ctx.fillText(
`GROUP ${
String.fromCharCode(
65 + groupIndex
)
}`,
x + layout.boxWidth/2,
y + 32
);

for(let i=0; i<teams; i++){

const rowY =
y + 58 +
i *
(layout.teamHeight + 8);

roundedRect(
x + 14,
rowY,
layout