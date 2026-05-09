const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 1536;
canvas.height = 864;

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const $ = id => document.getElementById(id);
const sidebar = $("sidebar");

const DEFAULT_BG = "https://i.imgur.com/Z72kUog.png";
const imageCache = new Map();

let layoutMode = false;
let selected = null;
let drag = null;

const defaultLayout = {
  board: { x: 0, y: 0 },
  boxWidth: 286,
  boxHeight: 274,
  groupsPerRow: 4,
  title: { x: 0, y: 0, size: 52 },
  subtitle: { x: 0, y: 0, size: 18 },
  sideText: { x: 0, y: 0, size: 140 },
  footerText: { x: 0, y: 0, size: 18 }
};

const defaultState = {
  bg: DEFAULT_BG,
  titleText: "SEASON 0: WORLD ZERO",
  subtitleText: "SOCCER ZERO 2026",
  sideText: "EU",
  footerText: "GROUP STAGE",
  globalColor: "#65d9ff",
  useGlobalColor: true,
  showGlobalBorders: true,
  groupCount: 8,
  teamsPerGroup: 5,
  moveSpeed: 8,
  groupsPerRow: 4,
  groups: [],
  layout: JSON.parse(JSON.stringify(defaultLayout))
};

let state = loadState();
normalizeState();
buildEditor();
bindGlobals();
render();

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function groupLetter(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function createTeam() {
  return { name: "", emoji: "" };
}

function createGroup(index) {
  return {
    letter: groupLetter(index),
    x: 0,
    y: 0,
    scale: 1,
    color: index % 2 === 0 ? "#cf66ff" : "#65d9ff",
    useGlobalColor: true,
    showBorder: true,
    teams: Array.from({ length: state.teamsPerGroup || defaultState.teamsPerGroup }, () => createTeam())
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem("zzm_groups_save");
    if (!raw) return clone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...clone(defaultState),
      ...parsed,
      layout: {
        ...clone(defaultLayout),
        ...(parsed.layout || {})
      },
      groups: Array.isArray(parsed.groups) ? parsed.groups : []
    };
  } catch {
    return clone(defaultState);
  }
}

function saveState() {
  localStorage.setItem("zzm_groups_save", JSON.stringify(state));
  localStorage.setItem("zzm_groups_layout", JSON.stringify(state.layout));
}

function toggleSidebar() {
  sidebar.classList.toggle("open");
}
window.toggleSidebar = toggleSidebar;

function toggleLayout() {
  layoutMode = !layoutMode;
  render();
}
window.toggleLayout = toggleLayout;

function resetLayout() {
  state.layout = clone(defaultLayout);
  state.groups.forEach(g => {
    g.x = 0;
    g.y = 0;
    g.scale = 1;
  });
  syncLayoutInputs();
  saveState();
  render();
}
window.resetLayout = resetLayout;

function addGroup() {
  state.groupCount = Math.min(20, (state.groupCount || 8) + 1);
  syncCountInputs();
  normalizeState();
  buildEditor();
  saveState();
  render();
}
window.addGroup = addGroup;

function removeGroup() {
  state.groupCount = Math.max(1, (state.groupCount || 8) - 1);
  syncCountInputs();
  normalizeState();
  buildEditor();
  saveState();
  render();
}
window.removeGroup = removeGroup;

function applyBoardShift(dx, dy) {
  state.layout.board.x += dx;
  state.layout.board.y += dy;
  saveState();
  render();
}
window.applyBoardShift = applyBoardShift;

function scaleSelected(dir) {
  if (!selected) return;
  const step = dir > 0 ? 0.08 : -0.08;

  if (selected.type === "group") {
    const g = state.groups[selected.index];
    if (!g) return;
    g.scale = clamp((g.scale || 1) + step, 0.5, 2.5);
  } else if (selected.type === "board") {
    state.layout.boxWidth = clamp(state.layout.boxWidth + (dir > 0 ? 12 : -12), 150, 420);
    state.layout.boxHeight = clamp(state.layout.boxHeight + (dir > 0 ? 12 : -12), 120, 420);
    syncLayoutInputs();
  } else if (selected.type === "title") {
    state.layout.title.size = clamp(state.layout.title.size + (dir > 0 ? 3 : -3), 22, 80);
    syncLayoutInputs();
  } else if (selected.type === "subtitle") {
    state.layout.subtitle.size = clamp(state.layout.subtitle.size + (dir > 0 ? 2 : -2), 10, 40);
    syncLayoutInputs();
  } else if (selected.type === "sideText") {
    state.layout.sideText.size = clamp(state.layout.sideText.size + (dir > 0 ? 6 : -6), 80, 220);
    syncLayoutInputs();
  } else if (selected.type === "footerText") {
    state.layout.footerText.size = clamp(state.layout.footerText.size + (dir > 0 ? 2 : -2), 10, 40);
    syncLayoutInputs();
  }

  saveState();
  render();
}
window.scaleSelected = scaleSelected;

function resetSelected() {
  if (!selected) return;
  if (selected.type === "group") {
    const g = state.groups[selected.index];
    g.x = 0;
    g.y = 0;
    g.scale = 1;
  } else if (selected.type === "board") {
    state.layout.board.x = 0;
    state.layout.board.y = 0;
  } else if (selected.type === "title") {
    state.layout.title.x = 0;
    state.layout.title.y = 0;
    state.layout.title.size = defaultLayout.title.size;
  } else if (selected.type === "subtitle") {
    state.layout.subtitle.x = 0;
    state.layout.subtitle.y = 0;
    state.layout.subtitle.size = defaultLayout.subtitle.size;
  } else if (selected.type === "sideText") {
    state.layout.sideText.x = 0;
    state.layout.sideText.y = 0;
    state.layout.sideText.size = defaultLayout.sideText.size;
  } else if (selected.type === "footerText") {
    state.layout.footerText.x = 0;
    state.layout.footerText.y = 0;
    state.layout.footerText.size = defaultLayout.footerText.size;
  }
  saveState();
  render();
}
window.resetSelected = resetSelected;

function syncCountInputs() {
  $("groupCount").value = state.groupCount;
  $("teamsPerGroup").value = state.teamsPerGroup;
  $("groupsPerRow").value = state.groupsPerRow;
}

function syncLayoutInputs() {
  $("boxWidth").value = state.layout.boxWidth;
  $("boxHeight").value = state.layout.boxHeight;
  $("groupsPerRow").value = state.layout.groupsPerRow;
  $("selectedLabel").textContent = `Selected: ${selected ? selected.label : "none"}`;
}

function normalizeState() {
  state.layout = state.layout || clone(defaultLayout);
  state.layout.board = state.layout.board || { x: 0, y: 0 };
  state.layout.title = state.layout.title || clone(defaultLayout.title);
  state.layout.subtitle = state.layout.subtitle || clone(defaultLayout.subtitle);
  state.layout.sideText = state.layout.sideText || clone(defaultLayout.sideText);
  state.layout.footerText = state.layout.footerText || clone(defaultLayout.footerText);
  state.layout.boxWidth = Number(state.layout.boxWidth || defaultLayout.boxWidth);
  state.layout.boxHeight = Number(state.layout.boxHeight || defaultLayout.boxHeight);
  state.layout.groupsPerRow = Number(state.layout.groupsPerRow || state.groupsPerRow || defaultLayout.groupsPerRow);

  state.groupCount = clamp(Number(state.groupCount || 8), 1, 20);
  state.teamsPerGroup = clamp(Number(state.teamsPerGroup || 5), 1, 20);
  state.groupsPerRow = clamp(Number(state.groupsPerRow || state.layout.groupsPerRow || 4), 1, 8);

  while (state.groups.length < state.groupCount) state.groups.push(createGroup(state.groups.length));
  while (state.groups.length > state.groupCount) state.groups.pop();

  state.groups.forEach((g, i) => {
    g.letter = groupLetter(i);
    g.x = Number(g.x || 0);
    g.y = Number(g.y || 0);
    g.scale = clamp(Number(g.scale || 1), 0.5, 2.5);
    g.color = g.color || (i % 2 === 0 ? "#cf66ff" : "#65d9ff");
    g.useGlobalColor = g.useGlobalColor !== false;
    g.showBorder = g.showBorder !== false;
    g.teams = Array.isArray(g.teams) ? g.teams : [];
    while (g.teams.length < state.teamsPerGroup) g.teams.push(createTeam());
    while (g.teams.length > state.teamsPerGroup) g.teams.pop();
  });

  syncCountInputs();
  syncLayoutInputs();
}

function bindGlobals() {
  const bindText = (id, key) => {
    $(id).value = state[key];
    $(id).addEventListener("input", () => {
      state[key] = $(id).value;
      saveState();
      render();
    });
  };

  bindText("bg", "bg");
  bindText("titleText", "titleText");
  bindText("subtitleText", "subtitleText");
  bindText("sideText", "sideText");
  bindText("footerText", "footerText");

  $("globalColor").value = state.globalColor;
  $("globalColor").addEventListener("input", () => {
    state.globalColor = $("globalColor").value;
    saveState();
    render();
  });

  $("useGlobalColor").checked = state.useGlobalColor !== false;
  $("useGlobalColor").addEventListener("change", () => {
    state.useGlobalColor = $("useGlobalColor").checked;
    saveState();
    render();
  });

  $("showGlobalBorders").checked = state.showGlobalBorders !== false;
  $("showGlobalBorders").addEventListener("change", () => {
    state.showGlobalBorders = $("showGlobalBorders").checked;
    saveState();
    render();
  });

  const numberBind = (id, fn) => {
    $(id).value = state[id] ?? $(id).value;
    $(id).addEventListener("input", () => {
      fn(Number($(id).value));
      saveState();
      render();
      buildEditor();
    });
  };

  numberBind("groupCount", v => {
    state.groupCount = clamp(v || 8, 1, 20);
    normalizeState();
  });

  numberBind("teamsPerGroup", v => {
    state.teamsPerGroup = clamp(v || 5, 1, 20);
    normalizeState();
  });

  numberBind("groupsPerRow", v => {
    state.groupsPerRow = clamp(v || 4, 1, 8);
    state.layout.groupsPerRow = state.groupsPerRow;
    normalizeState();
  });

  numberBind("boxWidth", v => {
    state.layout.boxWidth = clamp(v || defaultLayout.boxWidth, 150, 420);
  });

  numberBind("boxHeight", v => {
    state.layout.boxHeight = clamp(v || defaultLayout.boxHeight, 120, 420);
  });

  numberBind("titleSize", v => {
    state.layout.title.size = clamp(v || defaultLayout.title.size, 22, 90);
  });

  numberBind("subtitleSize", v => {
    state.layout.subtitle.size = clamp(v || defaultLayout.subtitle.size, 10, 40);
  });

  numberBind("sideTextSize", v => {
    state.layout.sideText.size = clamp(v || defaultLayout.sideText.size, 80, 220);
  });

  numberBind("footerTextSize", v => {
    state.layout.footerText.size = clamp(v || defaultLayout.footerText.size, 10, 40);
  });

  numberBind("moveSpeed", v => {
    state.moveSpeed = clamp(v || 8, 1, 20);
  });
}

function buildEditor() {
  const host = $("groupsContainer");
  host.innerHTML = "";

  state.groups.forEach((group, gi) => {
    const card = document.createElement("div");
    card.className = "group-card";

    const color = group.useGlobalColor ? state.globalColor : group.color;
    card.innerHTML = `
      <div class="group-head">
        <h4>GROUP ${group.letter}</h4>
        <span class="selected-pill">#${gi + 1}</span>
      </div>

      <div class="group-tools">
        <div>
          <label>Color</label>
          <input type="color" data-g="${gi}" data-k="color" value="${group.color}">
        </div>
        <div>
          <label>Use Global</label>
          <div class="checkbox-line" style="margin-top:8px;">
            <input type="checkbox" data-g="${gi}" data-k="useGlobalColor" ${group.useGlobalColor ? "checked" : ""}>
            <span>Use global color</span>
          </div>
        </div>
        <div>
          <label>Show Border</label>
          <div class="checkbox-line" style="margin-top:8px;">
            <input type="checkbox" data-g="${gi}" data-k="showBorder" ${group.showBorder ? "checked" : ""}>
            <span>Visible border</span>
          </div>
        </div>
        <div>
          <label>Scale</label>
          <input type="number" step="0.05" min="0.5" max="2.5" data-g="${gi}" data-k="scale" value="${group.scale}">
        </div>
        <div>
          <label>X</label>
          <input type="number" data-g="${gi}" data-k="x" value="${group.x}">
        </div>
        <div>
          <label>Y</label>
          <input type="number" data-g="${gi}" data-k="y" value="${group.y}">
        </div>
      </div>

      <div class="note">Edit team by team. Names on the left, Discord emoji shield on the right.</div>

      ${group.teams.map((team, ti) => `
        <div class="team-row">
          <input placeholder="Team name" data-g="${gi}" data-t="${ti}" data-k="name" value="${escapeHtml(team.name)}">
          <input placeholder="<:emoji:id>" data-g="${gi}" data-t="${ti}" data-k="emoji" value="${escapeHtml(team.emoji)}">
        </div>
      `).join("")}
    `;
    host.appendChild(card);
  });

  host.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => {
      const g = Number(inp.dataset.g);
      const key = inp.dataset.k;

      if (inp.dataset.t != null) {
        const t = Number(inp.dataset.t);
        state.groups[g].teams[t][key] = inp.value;
      } else {
        if (key === "useGlobalColor" || key === "showBorder") {
          state.groups[g][key] = inp.checked;
        } else if (key === "scale" || key === "x" || key === "y") {
          state.groups[g][key] = Number(inp.value);
        } else {
          state.groups[g][key] = inp.value;
        }
      }

      saveState();
      render();
    });
  });

  syncCountInputs();
  syncLayoutInputs();
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function emojiURL(text) {
  const m = String(text || "").trim().match(/<?a?:\w+:(\d+)>?/);
  if (!m) return null;
  return `https://cdn.discordapp.com/emojis/${m[1]}.png?size=128&quality=lossless`;
}

async function loadImage(src, retries = 4) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const url = String(src);
    if (imageCache.has(url)) return resolve(imageCache.get(url));

    let tries = 0;
    const attempt = () => {
      tries++;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        if (tries < retries) setTimeout(attempt, 500);
        else resolve(null);
      };
      img.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now() + "_" + tries;
    };
    attempt();
  });
}

function drawBackground() {
  return loadImage(state.bg || DEFAULT_BG).then(bg => {
    if (bg) {
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, "#07112a");
      g.addColorStop(1, "#02050d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });
}

function drawText(text, x, y, size, color, align = "center", stroke = "rgba(0,0,0,.9)", strokeWidth = 6) {
  ctx.save();
  ctx.font = `900 ${size}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundedRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function getGroupPos(index) {
  const perRow = state.groupsPerRow || 4;
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  const baseX = 300 + state.layout.board.x;
  const baseY = 110 + state.layout.board.y;
  const w = Math.round(state.layout.boxWidth * (state.groups[index]?.scale || 1));
  const h = Math.round(state.layout.boxHeight * (state.groups[index]?.scale || 1));
  const x = baseX + col * (state.layout.boxWidth + 24) + (state.groups[index]?.x || 0);
  const y = baseY + row * (state.layout.boxHeight + 28) + (state.groups[index]?.y || 0);
  return { x, y, w, h };
}

function boardHandlePos() {
  const perRow = state.groupsPerRow || 4;
  const totalW = perRow * state.layout.boxWidth + (perRow - 1) * 24;
  return {
    x: 300 + state.layout.board.x + totalW / 2,
    y: 78 + state.layout.board.y
  };
}

function textHandlePos(key) {
  const t = state.layout[key];
  const base = {
    title: { x: canvas.width / 2, y: 52 },
    subtitle: { x: canvas.width / 2, y: 90 },
    sideText: { x: 122, y: 430 },
    footerText: { x: canvas.width / 2, y: 832 }
  };
  return {
    x: base[key].x + (t.x || 0),
    y: base[key].y + (t.y || 0)
  };
}

function drawHandle(x, y, label, color, r = 16) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.stroke();
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  ctx.restore();
}

async function drawGroup(group, index) {
  const pos = getGroupPos(index);
  const accent = group.useGlobalColor ? state.globalColor : group.color;
  const showBorder = state.showGlobalBorders && group.showBorder;
  const headerH = 34;
  const pad = 8;
  const rowH = Math.max(22, Math.floor((pos.h - headerH - pad * 2) / state.teamsPerGroup));
  const bodyH = rowH * state.teamsPerGroup + (state.teamsPerGroup - 1) * 8;

  if (showBorder) {
    ctx.save();
    ctx.shadowColor = hexToRGBA(accent, 0.26);
    ctx.shadowBlur = 18;
    roundedRect(pos.x, pos.y, pos.w, pos.h, 10);
    ctx.fillStyle = "rgba(0,0,0,.30)";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.restore();
  } else {
    roundedRect(pos.x, pos.y, pos.w, pos.h, 10);
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fill();
  }

  roundedRect(pos.x, pos.y, pos.w, headerH, 10);
  ctx.fillStyle = accent;
  ctx.fill();

  ctx.save();
  ctx.font = "bold 17px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`GROUP ${group.letter}`, pos.x + pos.w / 2, pos.y + headerH / 2);
  ctx.restore();

  const startY = pos.y + headerH + pad;
  const innerPadX = 10;
  const shieldSize = Math.max(18, Math.min(28, Math.floor(rowH * 0.62)));

  for (let i = 0; i < state.teamsPerGroup; i++) {
    const team = group.teams[i] || createTeam();
    const ry = startY + i * (rowH + 8);
    roundedRect(pos.x + innerPadX, ry, pos.w - innerPadX * 2, rowH, 5);
    ctx.fillStyle = "rgba(8,12,26,.58)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.stroke();

    const name = String(team.name || "").trim() || `Team ${i + 1}`;
    ctx.save();
    ctx.font = `bold ${Math.max(12, Math.floor(rowH * 0.42))}px Arial`;
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(name, pos.x + 18, ry + rowH / 2);
    ctx.restore();

    const em = emojiURL(team.emoji);
    const shieldX = pos.x + pos.w - 22 - shieldSize / 2;
    const shieldY = ry + rowH / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(shieldX, shieldY, shieldSize / 2 + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.restore();

    if (em) {
      const img = await loadImage(em);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(shieldX, shieldY, shieldSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, shieldX - shieldSize / 2, shieldY - shieldSize / 2, shieldSize, shieldSize);
        ctx.restore();
      }
    }
  }

  if (layoutMode) {
    drawHandle(pos.x + pos.w / 2, pos.y + 8, "G", accent, 18);
  }
}

function setSelected(h) {
  selected = h;
  syncLayoutInputs();
}

function getHandles() {
  const handles = [];
  const b = boardHandlePos();
  handles.push({ type: "board", label: "BOARD", x: b.x, y: b.y, r: 32 });

  const title = textHandlePos("title");
  const subtitle = textHandlePos("subtitle");
  const sideText = textHandlePos("sideText");
  const footerText = textHandlePos("footerText");

  handles.push({ type: "title", label: "TITLE", x: title.x, y: title.y, r: 34 });
  handles.push({ type: "subtitle", label: "SUB", x: subtitle.x, y: subtitle.y, r: 28 });
  handles.push({ type: "sideText", label: "SIDE", x: sideText.x, y: sideText.y, r: 40 });
  handles.push({ type: "footerText", label: "FOOT", x: footerText.x, y: footerText.y, r: 26 });

  state.groups.forEach((g, i) => {
    const pos = getGroupPos(i);
    handles.push({
      type: "group",
      index: i,
      label: g.letter,
      x: pos.x + pos.w / 2,
      y: pos.y + 14,
      r: 30
    });
  });

  return handles;
}

function pickHandle(p) {
  const handles = getHandles();
  return handles.find(h => Math.hypot(p.x - h.x, p.y - h.y) <= h.r) || null;
}

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener("pointerdown", e => {
  if (!layoutMode) return;
  const p = canvasPoint(e);
  const hit = pickHandle(p);
  if (!hit) return;
  setSelected(hit);
  drag = {
    type: hit.type,
    index: hit.index,
    startX: p.x,
    startY: p.y,
    snap: clone(state)
  };
  canvas.setPointerCapture(e.pointerId);
  render();
});

canvas.addEventListener("pointermove", e => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = p.x - drag.startX;
  const dy = p.y - drag.startY;
  const speed = Math.max(1, Number(state.moveSpeed || 8));

  if (drag.type === "board") {
    state.layout.board.x = drag.snap.layout.board.x + dx / speed;
    state.layout.board.y = drag.snap.layout.board.y + dy / speed;
  } else if (drag.type === "title" || drag.type === "subtitle" || drag.type === "sideText" || drag.type === "footerText") {
    state.layout[drag.type].x = drag.snap.layout[drag.type].x + dx / speed;
    state.layout[drag.type].y = drag.snap.layout[drag.type].y + dy / speed;
  } else if (drag.type === "group") {
    state.groups[drag.index].x = drag.snap.groups[drag.index].x + dx / speed;
    state.groups[drag.index].y = drag.snap.groups[drag.index].y + dy / speed;
  }

  saveState();
  render();
});

window.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("wheel", e => {
  if (!layoutMode || !selected) return;
  e.preventDefault();

  const dir = e.deltaY < 0 ? 1 : -1;

  if (selected.type === "group") {
    const g = state.groups[selected.index];
    g.scale = clamp((g.scale || 1) + (dir * 0.06), 0.5, 2.5);
  } else if (selected.type === "board") {
    state.layout.boxWidth = clamp(state.layout.boxWidth + (dir * 10), 150, 420);
    state.layout.boxHeight = clamp(state.layout.boxHeight + (dir * 10), 120, 420);
  } else if (selected.type === "title") {
    state.layout.title.size = clamp(state.layout.title.size + (dir * 2), 22, 90);
  } else if (selected.type === "subtitle") {
    state.layout.subtitle.size = clamp(state.layout.subtitle.size + dir, 10, 40);
  } else if (selected.type === "sideText") {
    state.layout.sideText.size = clamp(state.layout.sideText.size + (dir * 4), 80, 220);
  } else if (selected.type === "footerText") {
    state.layout.footerText.size = clamp(state.layout.footerText.size + dir, 10, 40);
  }

  syncLayoutInputs();
  saveState();
  render();
}, { passive: false });

function updateSelectedLabel() {
  $("selectedLabel").textContent = `Selected: ${selected ? selected.label : "none"}`;
}

function bindDynamicGroupInputs() {
  $("groupsContainer").querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => {
      const g = Number(inp.dataset.g);
      const k = inp.dataset.k;

      if (inp.dataset.t != null) {
        const t = Number(inp.dataset.t);
        state.groups[g].teams[t][k] = inp.value;
      } else {
        if (k === "useGlobalColor" || k === "showBorder") {
          state.groups[g][k] = inp.checked;
        } else if (k === "scale" || k === "x" || k === "y") {
          state.groups[g][k] = Number(inp.value);
        } else {
          state.groups[g][k] = inp.value;
        }
      }

      saveState();
      render();
    });
  });
}

function buildEditor() {
  const host = $("groupsContainer");
  host.innerHTML = "";

  state.groups.forEach((group, gi) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-head">
        <h4>GROUP ${group.letter}</h4>
        <span class="selected-pill">Block ${gi + 1}</span>
      </div>

      <div class="group-tools">
        <div>
          <label>Color</label>
          <input type="color" data-g="${gi}" data-k="color" value="${group.color}">
        </div>
        <div>
          <label>Use Global</label>
          <div class="checkbox-line" style="margin-top:8px;">
            <input type="checkbox" data-g="${gi}" data-k="useGlobalColor" ${group.useGlobalColor ? "checked" : ""}>
            <span>Use global</span>
          </div>
        </div>
        <div>
          <label>Show Border</label>
          <div class="checkbox-line" style="margin-top:8px;">
            <input type="checkbox" data-g="${gi}" data-k="showBorder" ${group.showBorder ? "checked" : ""}>
            <span>Visible</span>
          </div>
        </div>
        <div>
          <label>Scale</label>
          <input type="number" step="0.05" min="0.5" max="2.5" data-g="${gi}" data-k="scale" value="${group.scale}">
        </div>
        <div>
          <label>X</label>
          <input type="number" data-g="${gi}" data-k="x" value="${group.x}">
        </div>
        <div>
          <label>Y</label>
          <input type="number" data-g="${gi}" data-k="y" value="${group.y}">
        </div>
      </div>

      <div class="note">Names go on the left. Discord emoji shield goes on the right. No extra row titles.</div>

      ${group.teams.map((team, ti) => `
        <div class="team-row">
          <input placeholder="Team name" data-g="${gi}" data-t="${ti}" data-k="name" value="${escapeHtml(team.name)}">
          <input placeholder="<:emoji:id>" data-g="${gi}" data-t="${ti}" data-k="emoji" value="${escapeHtml(team.emoji)}">
        </div>
      `).join("")}
    `;
    host.appendChild(card);
  });

  bindDynamicGroupInputs();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function collectData() {
  return {
    bg: $("bg").value,
    titleText: $("titleText").value,
    subtitleText: $("subtitleText").value,
    sideText: $("sideText").value,
    footerText: $("footerText").value,
    globalColor: $("globalColor").value,
    useGlobalColor: $("useGlobalColor").checked,
    showGlobalBorders: $("showGlobalBorders").checked,
    groupCount: Number($("groupCount").value),
    teamsPerGroup: Number($("teamsPerGroup").value),
    groupsPerRow: Number($("groupsPerRow").value),
    moveSpeed: Number($("moveSpeed").value),
    layout: clone(state.layout),
    groups: clone(state.groups)
  };
}

function applyData(data) {
  $("bg").value = data.bg || DEFAULT_BG;
  $("titleText").value = data.titleText || defaultState.titleText;
  $("subtitleText").value = data.subtitleText || defaultState.subtitleText;
  $("sideText").value = data.sideText || defaultState.sideText;
  $("footerText").value = data.footerText || defaultState.footerText;
  $("globalColor").value = data.globalColor || defaultState.globalColor;
  $("useGlobalColor").checked = data.useGlobalColor !== false;
  $("showGlobalBorders").checked = data.showGlobalBorders !== false;
  $("groupCount").value = data.groupCount || defaultState.groupCount;
  $("teamsPerGroup").value = data.teamsPerGroup || defaultState.teamsPerGroup;
  $("groupsPerRow").value = data.groupsPerRow || defaultState.groupsPerRow;
  $("moveSpeed").value = data.moveSpeed || defaultState.moveSpeed;

  state.bg = $("bg").value;
  state.titleText = $("titleText").value;
  state.subtitleText = $("subtitleText").value;
  state.sideText = $("sideText").value;
  state.footerText = $("footerText").value;
  state.globalColor = $("globalColor").value;
  state.useGlobalColor = $("useGlobalColor").checked;
  state.showGlobalBorders = $("showGlobalBorders").checked;
  state.groupCount = Number($("groupCount").value);
  state.teamsPerGroup = Number($("teamsPerGroup").value);
  state.groupsPerRow = Number($("groupsPerRow").value);
  state.moveSpeed = Number($("moveSpeed").value);

  if (data.layout) state.layout = { ...clone(defaultLayout), ...data.layout };
  state.groups = Array.isArray(data.groups) ? data.groups : state.groups;

  normalizeState();
  buildEditor();
  saveState();
  render();
}

function saveLocal() {
  state = collectData();
  normalizeState();
  saveState();
  alert("Saved locally");
}

function downloadTXT() {
  state = collectData();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "groups.txt";
  a.click();
}

function loadTXT() {
  $("txtLoader").click();
}

$("txtLoader").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyData(JSON.parse(reader.result));
    } catch {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
});

function downloadImage() {
  const a = document.createElement("a");
  a.download = "groups.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function reloadEmojis() {
  imageCache.clear();
  render();
}
window.reloadEmojis = reloadEmojis;

async function render() {
  state = collectData();
  normalizeState();
  saveState();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = await loadImage(state.bg || DEFAULT_BG);
  if (bg) {
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#07112a");
    g.addColorStop(1, "#02050d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const titleSize = Number(state.layout.title.size || 52);
  const subtitleSize = Number(state.layout.subtitle.size || 18);
  const sideTextSize = Number(state.layout.sideText.size || 140);
  const footerSize = Number(state.layout.footerText.size || 18);

  drawText(state.titleText, canvas.width / 2 + state.layout.title.x, 44 + state.layout.title.y, titleSize, "white");
  drawText(state.subtitleText, canvas.width / 2 + state.layout.subtitle.x, 80 + state.layout.subtitle.y, subtitleSize, "#9fd6ff");
  drawText(state.sideText, 122 + state.layout.sideText.x, 430 + state.layout.sideText.y, sideTextSize, "white");
  drawText(state.footerText, canvas.width / 2 + state.layout.footerText.x, 834 + state.layout.footerText.y, footerSize, "white");

  const perRow = state.groupsPerRow || 4;
  state.groups.forEach(async (group, index) => {
    await drawGroup(group, index);
  });

  if (layoutMode) {
    const bh = boardHandlePos();
    drawHandle(bh.x, bh.y, "ALL", "#00d9ff", 22);

    const title = textHandlePos("title");
    const subtitle = textHandlePos("subtitle");
    const sideText = textHandlePos("sideText");
    const footerText = textHandlePos("footerText");

    drawHandle(title.x, title.y, "T", "#cf66ff", 20);
    drawHandle(subtitle.x, subtitle.y, "S", "#cf66ff", 18);
    drawHandle(sideText.x, sideText.y, "E", "#cf66ff", 24);
    drawHandle(footerText.x, footerText.y, "F", "#cf66ff", 18);

    state.groups.forEach((g, i) => {
      const p = getGroupPos(i);
      drawHandle(p.x + p.w / 2, p.y + 14, g.letter, g.useGlobalColor ? state.globalColor : g.color, 18);
    });
  }

  updateSelectedLabel();
}

document.addEventListener("input", () => {
  clearTimeout(render._t);
  render._t = setTimeout(() => {
    saveState();
    buildEditor();
    render();
  }, 80);
});

function normalizeAfterFormChange() {
  state.bg = $("bg").value;
  state.titleText = $("titleText").value;
  state.subtitleText = $("subtitleText").value;
  state.sideText = $("sideText").value;
  state.footerText = $("footerText").value;
  state.globalColor = $("globalColor").value;
  state.useGlobalColor = $("useGlobalColor").checked;
  state.showGlobalBorders = $("showGlobalBorders").checked;
  state.groupCount = clamp(Number($("groupCount").value), 1, 20);
  state.teamsPerGroup = clamp(Number($("teamsPerGroup").value), 1, 20);
  state.groupsPerRow = clamp(Number($("groupsPerRow").value), 1, 8);
  state.moveSpeed = clamp(Number($("moveSpeed").value), 1, 20);
  state.layout.boxWidth = clamp(Number($("boxWidth").value), 150, 420);
  state.layout.boxHeight = clamp(Number($("boxHeight").value), 120, 420);
  state.layout.groupsPerRow = state.groupsPerRow;
  normalizeState();
}

["bg","titleText","subtitleText","sideText","footerText","globalColor","useGlobalColor","showGlobalBorders","groupCount","teamsPerGroup","groupsPerRow","moveSpeed","boxWidth","boxHeight","titleSize","subtitleSize","sideTextSize","footerTextSize"].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", () => {
    normalizeAfterFormChange();
    saveState();
    buildEditor();
    render();
  });
  el.addEventListener("change", () => {
    normalizeAfterFormChange();
    saveState();
    buildEditor();
    render();
  });
});

function updateSelectedFromHandle(h) {
  if (!h) {
    selected = null;
  } else {
    selected = h;
  }
  updateSelectedLabel();
}

canvas.addEventListener("pointerdown", e => {
  if (!layoutMode) return;
  const p = canvasPoint(e);
  const hit = getHandles().find(h => Math.hypot(p.x - h.x, p.y - h.y) <= h.r);
  if (!hit) return;
  updateSelectedFromHandle(hit);
  drag = {
    type: hit.type,
    index: hit.index,
    startX: p.x,
    startY: p.y,
    snap: clone(state)
  };
  canvas.setPointerCapture(e.pointerId);
  render();
});

canvas.addEventListener("pointermove", e => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = (p.x - drag.startX) / Math.max(1, Number(state.moveSpeed || 8));
  const dy = (p.y - drag.startY) / Math.max(1, Number(state.moveSpeed || 8));
  const s = drag.snap;

  if (drag.type === "board") {
    state.layout.board.x = s.layout.board.x + dx;
    state.layout.board.y = s.layout.board.y + dy;
  } else if (drag.type === "title" || drag.type === "subtitle" || drag.type === "sideText" || drag.type === "footerText") {
    state.layout[drag.type].x = s.layout[drag.type].x + dx;
    state.layout[drag.type].y = s.layout[drag.type].y + dy;
  } else if (drag.type === "group") {
    state.groups[drag.index].x = s.groups[drag.index].x + dx;
    state.groups[drag.index].y = s.groups[drag.index].y + dy;
  }

  saveState();
  render();
});

window.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("wheel", e => {
  if (!layoutMode || !selected) return;
  e.preventDefault();

  const dir = e.deltaY < 0 ? 1 : -1;
  if (selected.type === "group") {
    const g = state.groups[selected.index];
    g.scale = clamp((g.scale || 1) + dir * 0.06, 0.5, 2.5);
  } else if (selected.type === "board") {
    state.layout.boxWidth = clamp(state.layout.boxWidth + dir * 10, 150, 420);
    state.layout.boxHeight = clamp(state.layout.boxHeight + dir * 10, 120, 420);
  } else if (selected.type === "title") {
    state.layout.title.size = clamp(state.layout.title.size + dir * 3, 22, 90);
  } else if (selected.type === "subtitle") {
    state.layout.subtitle.size = clamp(state.layout.subtitle.size + dir * 2, 10, 40);
  } else if (selected.type === "sideText") {
    state.layout.sideText.size = clamp(state.layout.sideText.size + dir * 6, 80, 220);
  } else if (selected.type === "footerText") {
    state.layout.footerText.size = clamp(state.layout.footerText.size + dir * 2, 10, 40);
  }

  syncLayoutInputs();
  saveState();
  render();
}, { passive: false });

function updateSelectedLabel() {
  $("selectedLabel").textContent = `Selected: ${selected ? selected.label : "none"}`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeForSave() {
  normalizeAfterFormChange();
  buildEditor();
  saveState();
}

function boardHandlePos() {
  const perRow = state.groupsPerRow || 4;
  const totalW = perRow * state.layout.boxWidth + (perRow - 1) * 24;
  return {
    x: 300 + state.layout.board.x + totalW / 2,
    y: 78 + state.layout.board.y
  };
}

function textHandlePos(key) {
  const base = {
    title: { x: canvas.width / 2, y: 44 },
    subtitle: { x: canvas.width / 2, y: 80 },
    sideText: { x: 122, y: 430 },
    footerText: { x: canvas.width / 2, y: 834 }
  };
  const t = state.layout[key];
  return { x: base[key].x + (t?.x || 0), y: base[key].y + (t?.y || 0) };
}

function getGroupPos(index) {
  const perRow = state.groupsPerRow || 4;
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  const scale = state.groups[index]?.scale || 1;
  const w = state.layout.boxWidth * scale;
  const h = state.layout.boxHeight * scale;
  const x = 300 + state.layout.board.x + col * (state.layout.boxWidth + 24) + (state.groups[index]?.x || 0);
  const y = 110 + state.layout.board.y + row * (state.layout.boxHeight + 28) + (state.groups[index]?.y || 0);
  return { x, y, w, h };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function loadState() {
  try {
    const raw = localStorage.getItem("zzm_groups_save");
    if (!raw) return clone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...clone(defaultState),
      ...parsed,
      layout: { ...clone(defaultLayout), ...(parsed.layout || {}) },
      groups: Array.isArray(parsed.groups) ? parsed.groups : []
    };
  } catch {
    return clone(defaultState);
  }
}

function normalizeState() {
  state.layout = state.layout || clone(defaultLayout);
  state.layout.board = state.layout.board || { x: 0, y: 0 };
  state.layout.title = state.layout.title || clone(defaultLayout.title);
  state.layout.subtitle = state.layout.subtitle || clone(defaultLayout.subtitle);
  state.layout.sideText = state.layout.sideText || clone(defaultLayout.sideText);
  state.layout.footerText = state.layout.footerText || clone(defaultLayout.footerText);

  state.groupCount = clamp(Number(state.groupCount || 8), 1, 20);
  state.teamsPerGroup = clamp(Number(state.teamsPerGroup || 5), 1, 20);
  state.groupsPerRow = clamp(Number(state.groupsPerRow || state.layout.groupsPerRow || 4), 1, 8);
  state.layout.groupsPerRow = state.groupsPerRow;
  state.layout.boxWidth = clamp(Number(state.layout.boxWidth || 286), 150, 420);
  state.layout.boxHeight = clamp(Number(state.layout.boxHeight || 274), 120, 420);

  while (state.groups.length < state.groupCount) state.groups.push(createGroup(state.groups.length));
  while (state.groups.length > state.groupCount) state.groups.pop();

  state.groups.forEach((g, i) => {
    g.letter = groupLetter(i);
    g.x = Number(g.x || 0);
    g.y = Number(g.y || 0);
    g.scale = clamp(Number(g.scale || 1), 0.5, 2.5);
    g.color = g.color || (i % 2 === 0 ? "#cf66ff" : "#65d9ff");
    g.useGlobalColor = g.useGlobalColor !== false;
    g.showBorder = g.showBorder !== false;
    g.teams = Array.isArray(g.teams) ? g.teams : [];
    while (g.teams.length < state.teamsPerGroup) g.teams.push(createTeam());
    while (g.teams.length > state.teamsPerGroup) g.teams.pop();
  });

  syncCountInputs();
  syncLayoutInputs();
}

function saveState() {
  localStorage.setItem("zzm_groups_save", JSON.stringify(state));
  localStorage.setItem("zzm_groups_layout", JSON.stringify(state.layout));
}

function syncCountInputs() {
  $("groupCount").value = state.groupCount;
  $("teamsPerGroup").value = state.teamsPerGroup;
  $("groupsPerRow").value = state.groupsPerRow;
  $("moveSpeed").value = state.moveSpeed || 8;
}

function syncLayoutInputs() {
  $("boxWidth").value = state.layout.boxWidth;
  $("boxHeight").value = state.layout.boxHeight;
  $("selectedLabel").textContent = `Selected: ${selected ? selected.label : "none"}`;
  $("titleSize").value = state.layout.title.size;
  $("subtitleSize").value = state.layout.subtitle.size;
  $("sideTextSize").value = state.layout.sideText.size;
  $("footerTextSize").value = state.layout.footerText.size;
}

function updateAllFormValuesFromState() {
  $("bg").value = state.bg;
  $("titleText").value = state.titleText;
  $("subtitleText").value = state.subtitleText;
  $("sideText").value = state.sideText;
  $("footerText").value = state.footerText;
  $("globalColor").value = state.globalColor;
  $("useGlobalColor").checked = state.useGlobalColor !== false;
  $("showGlobalBorders").checked = state.showGlobalBorders !== false;
  syncCountInputs();
  syncLayoutInputs();
}

function buildEditor() {
  const host = $("groupsContainer");
  host.innerHTML = "";

  state.groups.forEach((group, gi) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-head">
        <h4>GROUP ${group.letter}</h4>
        <span class="selected-pill">Block ${gi + 1}</span>
      </div>

      <div class="group-tools">
        <div>
          <label>Color</label>
          <input type="color" data-g="${gi}" data-k="color" value="${group.color}">
        </div>
        <div>
          <label>Use Global</label>
          <div class="checkbox-line" style="margin-top:8px;">
            <input type="checkbox" data-g="${gi}" data-k="useGlobalColor" ${group.useGlobalColor ? "checked" : ""}>
            <span>Use global</span>
          </div>
        </div>
        <div>
          <label>Show Border</label>
          <div class="checkbox-line" style="margin-top:8px;">
            <input type="checkbox" data-g="${gi}" data-k="showBorder" ${group.showBorder ? "checked" : ""}>
            <span>Visible</span>
          </div>
        </div>
        <div>
          <label>Scale</label>
          <input type="number" step="0.05" min="0.5" max="2.5" data-g="${gi}" data-k="scale" value="${group.scale}">
        </div>
        <div>
          <label>X</label>
          <input type="number" data-g="${gi}" data-k="x" value="${group.x}">
        </div>
        <div>
          <label>Y</label>
          <input type="number" data-g="${gi}" data-k="y" value="${group.y}">
        </div>
      </div>

      <div class="note">Names left, emoji shield right. No extra team header is rendered inside each row.</div>

      ${group.teams.map((team, ti) => `
        <div class="team-row">
          <input placeholder="Team name" data-g="${gi}" data-t="${ti}" data-k="name" value="${escapeHtml(team.name)}">
          <input placeholder="<:emoji:id>" data-g="${gi}" data-t="${ti}" data-k="emoji" value="${escapeHtml(team.emoji)}">
        </div>
      `).join("")}
    `;
    host.appendChild(card);
  });

  host.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => {
      const g = Number(inp.dataset.g);
      const key = inp.dataset.k;

      if (inp.dataset.t != null) {
        const t = Number(inp.dataset.t);
        state.groups[g].teams[t][key] = inp.value;
      } else {
        if (key === "useGlobalColor" || key === "showBorder") {
          state.groups[g][key] = inp.checked;
        } else {
          state.groups[g][key] = key === "scale" || key === "x" || key === "y" ? Number(inp.value) : inp.value;
        }
      }

      saveState();
      render();
    });
  });
}

function updateSelectedDisplay() {
  $("selectedLabel").textContent = `Selected: ${selected ? selected.label : "none"}`;
}

function getHandles() {
  const handles = [];
  const bh = boardHandlePos();
  handles.push({ type: "board", label: "ALL", x: bh.x, y: bh.y, r: 34 });

  const handlesText = [
    ["title", "TITLE"],
    ["subtitle", "SUB"],
    ["sideText", "SIDE"],
    ["footerText", "FOOT"]
  ];

  handlesText.forEach(([type, label]) => {
    const p = textHandlePos(type);
    handles.push({ type, label, x: p.x, y: p.y, r: type === "sideText" ? 42 : 30 });
  });

  state.groups.forEach((g, i) => {
    const p = getGroupPos(i);
    handles.push({
      type: "group",
      index: i,
      label: g.letter,
      x: p.x + p.w / 2,
      y: p.y + 14,
      r: 28
    });
  });

  return handles;
}

function hitHandle(p) {
  return getHandles().find(h => Math.hypot(p.x - h.x, p.y - h.y) <= h.r) || null;
}

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function drawHandle(x, y, label, color, r = 16) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.stroke();
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  ctx.restore();
}

canvas.addEventListener("pointerdown", e => {
  if (!layoutMode) return;
  const p = canvasPoint(e);
  const hit = hitHandle(p);
  if (!hit) return;
  selected = hit;
  updateSelectedDisplay();
  drag = {
    type: hit.type,
    index: hit.index,
    startX: p.x,
    startY: p.y,
    snap: clone(state)
  };
  canvas.setPointerCapture(e.pointerId);
  render();
});

canvas.addEventListener("pointermove", e => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = (p.x - drag.startX) / Math.max(1, Number(state.moveSpeed || 8));
  const dy = (p.y - drag.startY) / Math.max(1, Number(state.moveSpeed || 8));
  const s = drag.snap;

  if (drag.type === "board") {
    state.layout.board.x = s.layout.board.x + dx;
    state.layout.board.y = s.layout.board.y + dy;
  } else if (["title", "subtitle", "sideText", "footerText"].includes(drag.type)) {
    state.layout[drag.type].x = s.layout[drag.type].x + dx;
    state.layout[drag.type].y = s.layout[drag.type].y + dy;
  } else if (drag.type === "group") {
    state.groups[drag.index].x = s.groups[drag.index].x + dx;
    state.groups[drag.index].y = s.groups[drag.index].y + dy;
  }

  saveState();
  render();
});

window.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("wheel", e => {
  if (!layoutMode || !selected) return;
  e.preventDefault();

  const dir = e.deltaY < 0 ? 1 : -1;

  if (selected.type === "group") {
    const g = state.groups[selected.index];
    g.scale = clamp((g.scale || 1) + dir * 0.06, 0.5, 2.5);
  } else if (selected.type === "board") {
    state.layout.boxWidth = clamp(state.layout.boxWidth + dir * 10, 150, 420);
    state.layout.boxHeight = clamp(state.layout.boxHeight + dir * 10, 120, 420);
  } else if (selected.type === "title") {
    state.layout.title.size = clamp(state.layout.title.size + dir * 3, 22, 90);
  } else if (selected.type === "subtitle") {
    state.layout.subtitle.size = clamp(state.layout.subtitle.size + dir * 2, 10, 40);
  } else if (selected.type === "sideText") {
    state.layout.sideText.size = clamp(state.layout.sideText.size + dir * 6, 80, 220);
  } else if (selected.type === "footerText") {
    state.layout.footerText.size = clamp(state.layout.footerText.size + dir * 2, 10, 40);
  }

  syncLayoutInputs();
  saveState();
  render();
}, { passive: false });

async function render() {
  normalizeState();
  saveState();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = await loadImage(state.bg || DEFAULT_BG);
  if (bg) {
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#07112a");
    g.addColorStop(1, "#02050d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawText(state.titleText, canvas.width / 2 + state.layout.title.x, 44 + state.layout.title.y, state.layout.title.size, "white");
  drawText(state.subtitleText, canvas.width / 2 + state.layout.subtitle.x, 80 + state.layout.subtitle.y, state.layout.subtitle.size, "#9fd6ff");
  drawText(state.sideText, 122 + state.layout.sideText.x, 430 + state.layout.sideText.y, state.layout.sideText.size, "white");
  drawText(state.footerText, canvas.width / 2 + state.layout.footerText.x, 834 + state.layout.footerText.y, state.layout.footerText.size, "white");

  for (let i = 0; i < state.groups.length; i++) {
    await drawGroup(state.groups[i], i);
  }

  if (layoutMode) {
    const bh = boardHandlePos();
    drawHandle(bh.x, bh.y, "ALL", "#00d9ff", 22);

    const title = textHandlePos("title");
    const subtitle = textHandlePos("subtitle");
    const sideText = textHandlePos("sideText");
    const footerText = textHandlePos("footerText");

    drawHandle(title.x, title.y, "T", "#cf66ff", 20);
    drawHandle(subtitle.x, subtitle.y, "S", "#cf66ff", 18);
    drawHandle(sideText.x, sideText.y, "E", "#cf66ff", 24);
    drawHandle(footerText.x, footerText.y, "F", "#cf66ff", 18);

    state.groups.forEach((g, i) => {
      const p = getGroupPos(i);
      drawHandle(p.x + p.w / 2, p.y + 14, g.letter, g.useGlobalColor ? state.globalColor : g.color, 18);
    });
  }

  updateSelectedDisplay();
}

document.addEventListener("input", () => {
  clearTimeout(render._t);
  render._t = setTimeout(() => {
    saveState();
    buildEditor();
    render();
  }, 80);
});

function applyBoardShift(dx, dy) {
  state.layout.board.x += dx;
  state.layout.board.y += dy;
  saveState();
  render();
}

function collectData() {
  return clone(state);
}

function applyData(data) {
  state = {
    ...clone(defaultState),
    ...data,
    layout: {
      ...clone(defaultLayout),
      ...(data.layout || {})
    },
    groups: Array.isArray(data.groups) ? data.groups : []
  };

  normalizeState();
  updateAllFormValuesFromState();
  buildEditor();
  saveState();
  render();
}

function saveLocal() {
  state = collectData();
  saveState();
  alert("Saved");
}
window.saveLocal = saveLocal;

function downloadTXT() {
  state = collectData();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "groups.txt";
  a.click();
}
window.downloadTXT = downloadTXT;

function loadTXT() {
  $("txtLoader").click();
}
window.loadTXT = loadTXT;

$("txtLoader").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyData(JSON.parse(reader.result));
    } catch {
      alert("Invalid file");
    }
  };
  reader.readAsText(file);
});

function downloadImage() {
  const a = document.createElement("a");
  a.download = "groups.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}
window.downloadImage = downloadImage;

function renderImmediately() {
  buildEditor();
  render();
}

window.renderGroups = renderImmediately;

buildEditor();
updateAllFormValuesFromState();
render();