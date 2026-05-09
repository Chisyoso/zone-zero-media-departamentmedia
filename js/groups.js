const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1536;
canvas.height = 864;

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const DEFAULT_BG = "https://i.imgur.com/Z72kUog.png";
const ROBLOX_PROXY = "https://corsproxy.io/?";

const $ = id => document.getElementById(id);

const imageCache = new Map();

let layoutMode = false;
let dragTarget = null;

const layout = JSON.parse(
  localStorage.getItem("zzm_groups_layout")
) || {

  board:{
    x:0,
    y:0
  },

  box:{
    width:280,
    height:190,
    gapX:18,
    gapY:22
  },

  slots:{
    height:32
  }

};

const state = JSON.parse(
  localStorage.getItem("zzm_groups_data")
) || {

  background:DEFAULT_BG,

  title:"SEASON 0: WORLD ZERO",

  subtitle:"SOCCER ZERO 2026",

  region:"EU",

  groups:[
    createGroup("A"),
    createGroup("B"),
    createGroup("C"),
    createGroup("D"),
    createGroup("E"),
    createGroup("F"),
    createGroup("G"),
    createGroup("H")
  ]
};

function createGroup(letter){

  return {

    letter,

    enabled:true,

    teams:[
      createTeam(),
      createTeam(),
      createTeam(),
      createTeam()
    ]
  };
}

function createTeam(){

  return {

    name:"",
    emoji:""

  };
}

function saveData(){

  localStorage.setItem(
    "zzm_groups_data",
    JSON.stringify(state)
  );

  localStorage.setItem(
    "zzm_groups_layout",
    JSON.stringify(layout)
  );
}

function toggleSidebar(){

  const sidebar = $("sidebar");

  sidebar.classList.toggle("open");
}

function emojiURL(text){

  const match =
  String(text || "")
  .match(/<?a?:\w+:(\d+)>?/);

  if(!match) return null;

  return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=128&quality=lossless`;
}

async function loadImage(src,retries=4){

  return new Promise(resolve=>{

    if(!src) return resolve(null);

    if(imageCache.has(src)){

      return resolve(imageCache.get(src));
    }

    let tries = 0;

    const attempt = ()=>{

      tries++;

      const img = new Image();

      img.crossOrigin = "anonymous";

      img.onload = ()=>{

        imageCache.set(src,img);

        resolve(img);
      };

      img.onerror = ()=>{

        if(tries < retries){

          setTimeout(attempt,500);

        }else{

          resolve(null);
        }
      };

      img.src =
      src +
      (src.includes("?") ? "&":"?") +
      "t=" +
      Date.now();
    };

    attempt();
  });
}

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

function drawText(
  text,
  x,
  y,
  size,
  color="white",
  align="center"
){

  ctx.save();

  ctx.font = `bold ${size}px Arial`;

  ctx.fillStyle = color;

  ctx.textAlign = align;

  ctx.textBaseline = "middle";

  ctx.lineWidth = 6;

  ctx.strokeStyle = "rgba(0,0,0,.8)";

  ctx.strokeText(text,x,y);

  ctx.fillText(text,x,y);

  ctx.restore();
}

function injectControls(){

  if($("groupControls")) return;

  const section =
  document.querySelector(".section");

  const div =
  document.createElement("div");

  div.id = "groupControls";

  div.innerHTML = `

  <div class="global-color-box">

  <h3>Groups Editor</h3>

  <label>Background URL</label>
  <input id="backgroundInput">

  <label>Box Width</label>
  <input type="range" id="boxWidth" min="180" max="420">

  <label>Box Height</label>
  <input type="range" id="boxHeight" min="120" max="300">

  <label>Gap X</label>
  <input type="range" id="gapX" min="0" max="60">

  <label>Gap Y</label>
  <input type="range" id="gapY" min="0" max="60">

  <label>Slot Height</label>
  <input type="range" id="slotHeight" min="22" max="70">

  <button id="layoutBtn">
  Toggle Layout Mode
  </button>

  <button id="addGroupBtn">
  Add Group
  </button>

  <button id="removeGroupBtn">
  Remove Group
  </button>

  <div id="groupsInputs"></div>

  </div>
  `;

  section.appendChild(div);

  $("backgroundInput").value =
  state.background;

  $("boxWidth").value =
  layout.box.width;

  $("boxHeight").value =
  layout.box.height;

  $("gapX").value =
  layout.box.gapX;

  $("gapY").value =
  layout.box.gapY;

  $("slotHeight").value =
  layout.slots.height;

  $("backgroundInput")
  .addEventListener("input",e=>{

    state.background = e.target.value;

    render();
  });

  $("boxWidth")
  .addEventListener("input",e=>{

    layout.box.width =
    Number(e.target.value);

    render();
  });

  $("boxHeight")
  .addEventListener("input",e=>{

    layout.box.height =
    Number(e.target.value);

    render();
  });

  $("gapX")
  .addEventListener("input",e=>{

    layout.box.gapX =
    Number(e.target.value);

    render();
  });

  $("gapY")
  .addEventListener("input",e=>{

    layout.box.gapY =
    Number(e.target.value);

    render();
  });

  $("slotHeight")
  .addEventListener("input",e=>{

    layout.slots.height =
    Number(e.target.value);

    render();
  });

  $("layoutBtn")
  .addEventListener("click",()=>{

    layoutMode = !layoutMode;

    render();
  });

  $("addGroupBtn")
  .addEventListener("click",()=>{

    const letter =
    String.fromCharCode(
      65 + state.groups.length
    );

    state.groups.push(
      createGroup(letter)
    );

    refreshInputs();

    render();
  });

  $("removeGroupBtn")
  .addEventListener("click",()=>{

    if(state.groups.length <= 1)
    return;

    state.groups.pop();

    refreshInputs();

    render();
  });

  refreshInputs();
}

function refreshInputs(){

  const container =
  $("groupsInputs");

  container.innerHTML = "";

  state.groups.forEach((group,g)=>{

    const div =
    document.createElement("div");

    div.style.marginTop = "16px";

    div.innerHTML = `

    <h4>
    GROUP ${group.letter}
    </h4>

    ${
      group.teams
      .map((team,t)=>`

      <input
      placeholder="Team"
      data-g="${g}"
      data-t="${t}"
      data-k="name"
      value="${team.name}"
      >

      <input
      placeholder="<:emoji:id>"
      data-g="${g}"
      data-t="${t}"
      data-k="emoji"
      value="${team.emoji}"
      >

      `)
      .join("")
    }
    `;

    container.appendChild(div);
  });

  container
  .querySelectorAll("input")
  .forEach(input=>{

    input.addEventListener("input",()=>{

      const g =
      Number(input.dataset.g);

      const t =
      Number(input.dataset.t);

      const k =
      input.dataset.k;

      state.groups[g]
      .teams[t][k] =
      input.value;

      render();
    });
  });
}

async function render(){

  saveData();

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const bg =
  await loadImage(
    state.background ||
    DEFAULT_BG
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

    ctx.fillStyle = "#000";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  drawText(
    state.title,
    768,
    40,
    48
  );

  drawText(
    state.subtitle,
    768,
    90,
    18,
    "#9fd6ff"
  );

  drawText(
    state.region,
    130,
    430,
    140
  );

  const startX =
  300 + layout.board.x;

  const startY =
  110 + layout.board.y;

  const boxW =
  layout.box.width;

  const boxH =
  layout.box.height;

  const gapX =
  layout.box.gapX;

  const gapY =
  layout.box.gapY;

  state.groups.forEach((group,i)=>{

    const col = i % 4;
    const row = Math.floor(i/4);

    const x =
    startX +
    (boxW + gapX) * col;

    const y =
    startY +
    (boxH + gapY) * row;

    const accent =
    i % 2
    ? "#5fd2ff"
    : "#cf66ff";

    ctx.save();

    ctx.shadowColor =
    accent;

    ctx.shadowBlur = 25;

    roundedRect(
      x,
      y,
      boxW,
      boxH,
      10
    );

    ctx.fillStyle =
    "rgba(0,0,0,.35)";

    ctx.fill();

    ctx.lineWidth = 2;

    ctx.strokeStyle =
    accent;

    ctx.stroke();

    ctx.restore();

    roundedRect(
      x,
      y,
      boxW,
      34,
      8
    );

    ctx.fillStyle =
    accent;

    ctx.fill();

    drawText(
      `GROUP ${group.letter}`,
      x + boxW/2,
      y + 18,
      18
    );

    group.teams.forEach(async(team,t)=>{

      const slotY =
      y + 44 +
      t *
      layout.slots.height;

      roundedRect(
        x + 10,
        slotY,
        boxW - 20,
        layout.slots.height - 6,
        5
      );

      ctx.fillStyle =
      "rgba(0,0,0,.45)";

      ctx.fill();

      ctx.strokeStyle =
      "rgba(255,255,255,.08)";

      ctx.stroke();

      drawText(
        team.name || `TEAM ${t+1}`,
        x + 18,
        slotY +
        layout.slots.height/2 - 2,
        16,
        "white",
        "left"
      );

      const emoji =
      emojiURL(team.emoji);

      if(emoji){

        const img =
        await loadImage(emoji);

        if(img){

          ctx.drawImage(
            img,
            x + boxW - 46,
            slotY + 2,
            24,
            24
          );
        }
      }
    });

    if(layoutMode){

      ctx.beginPath();

      ctx.arc(
        x + boxW/2,
        y - 15,
        18,
        0,
        Math.PI*2
      );

      ctx.fillStyle =
      accent;

      ctx.fill();
    }
  });
}

canvas.addEventListener(
  "pointerdown",
  e=>{

    if(!layoutMode) return;

    const rect =
    canvas.getBoundingClientRect();

    const x =
    (e.clientX - rect.left) *
    (canvas.width / rect.width);

    const y =
    (e.clientY - rect.top) *
    (canvas.height / rect.height);

    dragTarget = {

      startX:x,
      startY:y,
      origX:layout.board.x,
      origY:layout.board.y
    };
  }
);

canvas.addEventListener(
  "pointermove",
  e=>{

    if(!dragTarget) return;

    const rect =
    canvas.getBoundingClientRect();

    const x =
    (e.clientX - rect.left) *
    (canvas.width / rect.width);

    const y =
    (e.clientY - rect.top) *
    (canvas.height / rect.height);

    layout.board.x =
    dragTarget.origX +
    (x - dragTarget.startX);

    layout.board.y =
    dragTarget.origY +
    (y - dragTarget.startY);

    render();
  }
);

canvas.addEventListener(
  "pointerup",
  ()=>{

    dragTarget = null;
  }
);

injectControls();

render();