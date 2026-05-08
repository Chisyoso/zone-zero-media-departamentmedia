const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const positions = [
{ id:"cf", x:800, y:160 },
{ id:"rw", x:1240, y:420 },
{ id:"cm", x:800, y:500 },
{ id:"lw", x:360, y:420 },
{ id:"gk", x:800, y:820 }
];

const playersContainer = document.getElementById("players");

function getSaved(type){
return JSON.parse(localStorage.getItem(type) || "[]");
}

function saveAutocomplete(type,value){
if(!value) return;

let data = getSaved(type);

data = data.filter(v => v.toLowerCase() !== value.toLowerCase());

data.unshift(value);

data = data.slice(0,5);

localStorage.setItem(type,JSON.stringify(data));
}

function createDatalist(id,items){
const dl = document.createElement("datalist");
dl.id = id;

items.forEach(v=>{
const op = document.createElement("option");
op.value = v;
dl.appendChild(op);
});

document.body.appendChild(dl);
}

function refreshDatalists(){
document.querySelectorAll("datalist").forEach(v=>v.remove());

createDatalist("nicklist",getSaved("nick_autocomplete"));
createDatalist("stylelist",getSaved("style_autocomplete"));
}

refreshDatalists();

positions.forEach(pos=>{
const div = document.createElement("div");
div.className = "player-box";

div.innerHTML = `
<h4>${pos.id.toUpperCase()}</h4>
<input list="nicklist" placeholder="Username" id="${pos.id}_name">
<input list="stylelist" placeholder="Style" id="${pos.id}_style">
<input placeholder="Avatar URL" id="${pos.id}_avatar">
`;

playersContainer.appendChild(div);
});

function roundedRect(x,y,w,h,r){
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
}

async function loadImage(src){
return new Promise(resolve=>{
if(!src) return resolve(null);

const img = new Image();
img.crossOrigin = "anonymous";

img.onload = ()=>resolve(img);
img.onerror = ()=>resolve(null);

img.src = src;
});
}

async function render(){

ctx.clearRect(0,0,canvas.width,canvas.height);

const bgURL = document.getElementById("stadium").value;

const bg = await loadImage(bgURL);

if(bg){
ctx.drawImage(bg,0,0,canvas.width,canvas.height);
}else{
ctx.fillStyle="#0d0d0d";
ctx.fillRect(0,0,canvas.width,canvas.height);
}

for(const pos of positions){

const name = document.getElementById(pos.id+"_name").value;
const style = document.getElementById(pos.id+"_style").value;
const avatar = document.getElementById(pos.id+"_avatar").value;

const img = await loadImage(avatar);

ctx.save();

ctx.beginPath();
ctx.arc(pos.x,pos.y,75,0,Math.PI*2);
ctx.closePath();
ctx.clip();

if(img){
ctx.drawImage(img,pos.x-75,pos.y-75,150,150);
}else{
ctx.fillStyle="#1d1d1d";
ctx.fillRect(pos.x-75,pos.y-75,150,150);
}

ctx.restore();

ctx.strokeStyle="#5d5dff";
ctx.lineWidth=5;
ctx.beginPath();
ctx.arc(pos.x,pos.y,78,0,Math.PI*2);
ctx.stroke();

roundedRect(pos.x-120,pos.y+95,240,48,12);
ctx.fillStyle="rgba(0,0,0,.65)";
ctx.fill();

ctx.fillStyle="white";
ctx.font="bold 28px Arial";
ctx.textAlign="center";
ctx.fillText(name || "?",pos.x,pos.y+128);

roundedRect(pos.x+50,pos.y-50,170,44,12);
ctx.fillStyle="#3737ff";
ctx.fill();

ctx.fillStyle="white";
ctx.font="bold 20px Arial";
ctx.fillText(style || "Style",pos.x+135,pos.y-22);
}
}

document.addEventListener("input", async e=>{

if(e.target.id.includes("_name")){
saveAutocomplete("nick_autocomplete",e.target.value);
refreshDatalists();
}

if(e.target.id.includes("_style")){
saveAutocomplete("style_autocomplete",e.target.value);
refreshDatalists();
}

await render();
});

async function saveLocal(){

const data = collectData();

localStorage.setItem("zzm_save",JSON.stringify(data));

alert("Saved locally");
}

function collectData(){

const data = {
stadium:document.getElementById("stadium").value,
players:[]
};

positions.forEach(pos=>{
data.players.push({
id:pos.id,
name:document.getElementById(pos.id+"_name").value,
style:document.getElementById(pos.id+"_style").value,
avatar:document.getElementById(pos.id+"_avatar").value
});
});

return data;
}

function applyData(data){

document.getElementById("stadium").value = data.stadium || "";

data.players.forEach(p=>{
document.getElementById(p.id+"_name").value = p.name || "";
document.getElementById(p.id+"_style").value = p.style || "";
document.getElementById(p.id+"_avatar").value = p.avatar || "";
});

render();
}

function downloadTXT(){

const data = JSON.stringify(collectData(),null,2);

const blob = new Blob([data],{type:"text/plain"});

const a = document.createElement("a");

a.href = URL.createObjectURL(blob);
a.download = "zone-zero-media.txt";
a.click();
}

function loadTXT(){
document.getElementById("txtLoader").click();
}

document.getElementById("txtLoader").addEventListener("change",e=>{

const file = e.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = ()=>{
try{
const data = JSON.parse(reader.result);
applyData(data);
}catch{
alert("Invalid file");
}
};

reader.readAsText(file);
});

function downloadImage(){

const a = document.createElement("a");

a.download = "zone-zero-media.png";
a.href = canvas.toDataURL("image/png");

a.click();
}

function toggleSidebar(){
document.getElementById("sidebar").classList.toggle("open");
}

function goHome(){
window.scrollTo({top:0,behavior:"smooth"});
}

const local = localStorage.getItem("zzm_save");

if(local){
try{
applyData(JSON.parse(local));
}catch{}
}

render();
