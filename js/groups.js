// js/groups.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1600;
canvas.height = 900;

const BG_URL = "https://i.imgur.com/Z72kUog.png";

const imageCache = new Map();

const $ = (id) => document.getElementById(id);

let sidebarOpen = false;

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;

  const sidebar = $("sidebar");

  if (window.innerWidth <= 900) {
    sidebar.classList.toggle("open", sidebarOpen);
  }
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    $("sidebar").classList.remove("open");
  }
});

const defaultData = {
  globalColor: "#00d9ff",
  useGlobalColor: true,
  showBorders: true,
  minimalBorders: false,
  blockWidth: 420,
  blockHeight: 82,
  gap: 18,

  groups: [
    {
      id: crypto.randomUUID(),
      x: 110,
      y: 140,
      color: "#00d9ff",
      teams: [
        { name: "TEAM ONE", badge: "<:MEDIAZZ:1501791652354719925>" },
        { name: "TEAM TWO", badge: "<:MEDIAZZ:1501791652354719925>" },
        { name: "TEAM THREE", badge: "<:MEDIAZZ:1501791652354719925>" },
        { name: "TEAM FOUR", badge: "<:MEDIAZZ:1501791652354719925>" }
      ]
    }
  ]
};

let data = loadData();

function loadData() {
  try {
    const saved = localStorage.getItem("zzm_groups");

    if (!saved) {
      return structuredClone(defaultData);
    }

    return {
      ...structuredClone(defaultData),
      ...JSON.parse(saved)
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem("zzm_groups", JSON.stringify(data));
}

function emojiURL(text) {
  const match = String(text || "").match(/<?a?:\w+:(\d+)>?/);

  if (!match) return null;

  return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=128&quality=lossless`;
}

async function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);

    if (imageCache.has(src)) {
      return resolve(imageCache.get(src));
    }

    const img = new Image();

    img.crossOrigin = "anonymous";

    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = src + (src.includes("?") ? "&" : "?") + "t=" + Date.now();
  });
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();

  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);

  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);

  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);

  ctx.closePath();
}

function syncUI() {
  $("globalColor").value = data.globalColor;
  $("useGlobalColor").checked = data.useGlobalColor;
  $("showBorders").checked = data.showBorders;
  $("minimalBorders").checked = data.minimalBorders;
  $("blockWidth").value = data.blockWidth;
  $("blockHeight").value = data.blockHeight;
  $("gap").value = data.gap;

  renderGroupsEditor();
}

function renderGroupsEditor() {
  const container = $("groupsEditor");

  container.innerHTML = "";

  data.groups.forEach((group, groupIndex) => {
    const div = document.createElement("div");

    div.className = "player-box";

    div.innerHTML = `
      <div class="player-header">
        <h4>GROUP ${groupIndex + 1}</h4>

        <button
          type="button"
          style="
            width:36px;
            height:36px;
            border:none;
            border-radius:10px;
            background:#ff4d4d;
            color:white;
            cursor:pointer;
            font-weight:bold;
          "
          onclick="removeGroup('${group.id}')"
        >
          ✕
        </button>
      </div>

      <label class="color-label">Group Color</label>

      <input
        type="color"
        value="${group.color}"
        onchange="updateGroupColor('${group.id}', this.value)"
      >

      ${group.teams.map((team, teamIndex) => `
        <div
          style="
            margin-top:10px;
            display:flex;
            flex-direction:column;
            gap:8px;
          "
        >
          <input
            placeholder="Team Name"
            value="${team.name}"
            oninput="updateTeam('${group.id}', ${teamIndex}, 'name', this.value)"
          >

          <input
            placeholder="<:emoji:id>"
            value="${team.badge}"
            oninput="updateTeam('${group.id}', ${teamIndex}, 'badge', this.value)"
          >
        </div>
      `).join("")}
    `;

    container.appendChild(div);
  });
}

window.updateTeam = (groupId, teamIndex, key, value) => {
  const group = data.groups.find(g => g.id === groupId);

  if (!group) return;

  group.teams[teamIndex][key] = value;

  saveData();
  render();
};

window.updateGroupColor = (groupId, value) => {
  const group = data.groups.find(g => g.id === groupId);

  if (!group) return;

  group.color = value;

  if (data.useGlobalColor) {
    data.groups.forEach(g => {
      g.color = value;
    });

    data.globalColor = value;
  }

  saveData();

  syncUI();

  render();
};

window.removeGroup = (id) => {
  data.groups = data.groups.filter(g => g.id !== id);

  saveData();

  syncUI();

  render();
};

function addGroup() {
  const color = data.useGlobalColor
    ? data.globalColor
    : "#00d9ff";

  data.groups.push({
    id: crypto.randomUUID(),
    x: 120,
    y: 120,
    color,
    teams: [
      { name: "TEAM ONE", badge: "" },
      { name: "TEAM TWO", badge: "" },
      { name: "TEAM THREE", badge: "" },
      { name: "TEAM FOUR", badge: "" }
    ]
  });

  saveData();

  syncUI();

  render();
}

$("addGroup").onclick = addGroup;

$("globalColor").oninput = (e) => {
  data.globalColor = e.target.value;

  if (data.useGlobalColor) {
    data.groups.forEach(g => {
      g.color = e.target.value;
    });

    syncUI();
  }

  saveData();

  render();
};

$("useGlobalColor").onchange = (e) => {
  data.useGlobalColor = e.target.checked;

  if (data.useGlobalColor) {
    data.groups.forEach(g => {
      g.color = data.globalColor;
    });

    syncUI();
  }

  saveData();

  render();
};

$("showBorders").onchange = (e) => {
  data.showBorders = e.target.checked;

  saveData();

  render();
};

$("minimalBorders").onchange = (e) => {
  data.minimalBorders = e.target.checked;

  saveData();

  render();
};

$("blockWidth").oninput = (e) => {
  data.blockWidth = Number(e.target.value);

  saveData();

  render();
};

$("blockHeight").oninput = (e) => {
  data.blockHeight = Number(e.target.value);

  saveData();

  render();
};

$("gap").oninput = (e) => {
  data.gap = Number(e.target.value);

  saveData();

  render();
};

async function drawBackground() {
  const bg = await loadImage(BG_URL);

  if (bg) {
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

async function drawBlock(x, y, text, badge, color) {
  const w = data.blockWidth;
  const h = data.blockHeight;

  ctx.save();

  roundedRect(x, y, w, h, 22);

  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.fill();

  if (data.showBorders) {
    ctx.lineWidth = data.minimalBorders ? 1.5 : 3;

    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.restore();

  ctx.fillStyle = "white";

  ctx.font = "bold 34px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillText(
    String(text || "?").slice(0, 18),
    x + 28,
    y + h / 2
  );

  const url = emojiURL(badge);

  if (url) {
    const img = await loadImage(url);

    if (img) {
      ctx.drawImage(
        img,
        x + w - 68,
        y + 12,
        56,
        56
      );
    }
  }
}

let dragging = null;

function getPointer(e) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = getPointer(e);

  for (let i = data.groups.length - 1; i >= 0; i--) {
    const g = data.groups[i];

    const totalH =
      (data.blockHeight * 4) +
      (data.gap * 3);

    if (
      p.x >= g.x &&
      p.x <= g.x + data.blockWidth &&
      p.y >= g.y &&
      p.y <= g.y + totalH
    ) {
      dragging = {
        group: g,
        offsetX: p.x - g.x,
        offsetY: p.y - g.y
      };

      break;
    }
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;

  const p = getPointer(e);

  dragging.group.x = p.x - dragging.offsetX;
  dragging.group.y = p.y - dragging.offsetY;

  render();
});

canvas.addEventListener("pointerup", () => {
  if (!dragging) return;

  saveData();

  dragging = null;
});

canvas.addEventListener("pointercancel", () => {
  dragging = null;
});

async function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  await drawBackground();

  for (const group of data.groups) {
    for (let i = 0; i < group.teams.length; i++) {
      const team = group.teams[i];

      await drawBlock(
        group.x,
        group.y + i * (data.blockHeight + data.gap),
        team.name,
        team.badge,
        group.color
      );
    }
  }
}

function saveLocal() {
  saveData();

  alert("Saved locally");
}

function downloadTXT() {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "text/plain" }
  );

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "groups.txt";

  a.click();
}

function loadTXT() {
  $("txtLoader").click();
}

$("txtLoader").addEventListener("change", (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      data = JSON.parse(reader.result);

      saveData();

      syncUI();

      render();
    } catch {
      alert("Invalid file");
    }
  };

  reader.readAsText(file);
});

function downloadImage() {
  const a = document.createElement("a");

  a.href = canvas.toDataURL("image/png");
  a.download = "groups.png";

  a.click();
}

syncUI();
render();