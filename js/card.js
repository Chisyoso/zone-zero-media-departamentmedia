// js/card.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 580;
canvas.height = 746;

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const DEFAULT_BG = "https://i.imgur.com/9JXUwwa.jpeg";
const ROBLOX_PROXY = "https://corsproxy.io/?";

const avatarCache = new Map();
const userIdCache = new Map();
const imageCache = new Map();

const $ = id => document.getElementById(id);
const sidebar = $("sidebar");

let sidebarOpen = false;
let renderToken = 0;
let layoutMode = false;
let activeHandle = null;

const defaultLayout = {
  avatar: { x: 0, y: 0, scale: 1 },
  badge: { x: 0, y: 0, scale: 1 },
  name: { x: 0, y: 0, scale: 1 },
  stats: { x: 0, y: 0, scale: 1 },
  showTemplate: true,
  showOverlay: true,
  showBorders: true
};

let layout = loadLayout();

function loadLayout() {
  try {
    const raw = localStorage.getItem("zzm_card_layout");
    if (!raw) return structuredClone(defaultLayout);
    const data = JSON.parse(raw);
    return {
      avatar: { ...defaultLayout.avatar, ...(data.avatar || {}) },
      badge: { ...defaultLayout.badge, ...(data.badge || {}) },
      name: { ...defaultLayout.name, ...(data.name || {}) },
      stats: { ...defaultLayout.stats, ...(data.stats || {}) },
      showTemplate: data.showTemplate !== false,
      showOverlay: data.showOverlay !== false,
      showBorders: data.showBorders !== false
    };
  } catch {
    return structuredClone(defaultLayout);
  }
}

function saveLayout() {
  localStorage.setItem("zzm_card_layout", JSON.stringify(layout));
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  if (window.innerWidth <= 900) {
    sidebar.style.transform = sidebarOpen ? "translateX(0)" : "translateX(-100%)";
  }
}
window.toggleSidebar = toggleSidebar;

function syncSidebar() {
  if (window.innerWidth > 900) {
    sidebar.style.transform = "translateX(0)";
    return;
  }
  sidebar.style.transform = sidebarOpen ? "translateX(0)" : "translateX(-100%)";
}

window.addEventListener("resize", syncSidebar);
syncSidebar();

function injectLayoutTools() {
  if (document.getElementById("layoutTools")) return;

  const actions = document.querySelector(".actions");
  if (!actions) return;

  const wrap = document.createElement("div");
  wrap.id = "layoutTools";
  wrap.style.marginTop = "14px";
  wrap.innerHTML = `
    <div style="
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.08);
      padding:14px;
      border-radius:14px;
    ">
      <button id="layoutModeBtn" type="button" style="width:100%;margin-bottom:10px;">${layoutMode ? "Exit Layout Mode" : "Enter Layout Mode"}</button>

      <label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:13px;">
        <input id="showTemplateChk" type="checkbox" ${layout.showTemplate ? "checked" : ""}> Show Template
      </label>

      <label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:13px;">
        <input id="showOverlayChk" type="checkbox" ${layout.showOverlay ? "checked" : ""}> Show Overlay
      </label>

      <label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:13px;">
        <input id="showBordersChk" type="checkbox" ${layout.showBorders ? "checked" : ""}> Show Borders
      </label>

      <div style="margin-top:12px;">
        <label style="font-size:13px;">Background URL</label>
        <input id="card_custom_bg" placeholder="Imgur URL" style="margin-top:6px;">
      </div>

      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);">
        <div style="font-size:12px;opacity:.75;margin-bottom:8px;">
          Selected: <span id="activeHandleLabel">none</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button id="scaleDownBtn" type="button">Size -</button>
          <button id="scaleUpBtn" type="button">Size +</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
          <button id="resetPosBtn" type="button">Reset Part</button>
          <button id="resetLayoutBtn" type="button">Reset Layout</button>
        </div>

        <div style="margin-top:10px;font-size:12px;opacity:.78;line-height:1.5;">
          Tap a handle to select it.<br>
          Drag to move. Use the buttons to scale.
        </div>
      </div>
    </div>
  `;

  actions.parentNode.insertBefore(wrap, actions);

  const bgInput = $("card_custom_bg");
  bgInput.value = localStorage.getItem("zzm_card_bg") || "";

  $("layoutModeBtn").addEventListener("click", () => {
    layoutMode = !layoutMode;
    $("layoutModeBtn").textContent = layoutMode ? "Exit Layout Mode" : "Enter Layout Mode";
    renderCard();
  });

  $("showTemplateChk").addEventListener("change", e => {
    layout.showTemplate = e.target.checked;
    saveLayout();
    renderCard();
  });

  $("showOverlayChk").addEventListener("change", e => {
    layout.showOverlay = e.target.checked;
    saveLayout();
    renderCard();
  });

  $("showBordersChk").addEventListener("change", e => {
    layout.showBorders = e.target.checked;
    saveLayout();
    renderCard();
  });

  bgInput.addEventListener("input", e => {
    localStorage.setItem("zzm_card_bg", e.target.value.trim());
    renderCard();
  });

  const setScale = (delta) => {
    if (!activeHandle) return;
    const item = layout[activeHandle];
    if (!item) return;
    item.scale = Math.max(0.4, Math.min(3, (item.scale || 1) + delta));
    saveLayout();
    renderCard();
  };

  $("scaleUpBtn").addEventListener("click", () => setScale(0.08));
  $("scaleDownBtn").addEventListener("click", () => setScale(-0.08));

  $("resetPosBtn").addEventListener("click", () => {
    if (!activeHandle) return;
    layout[activeHandle].x = 0;
    layout[activeHandle].y = 0;
    layout[activeHandle].scale = 1;
    saveLayout();
    renderCard();
  });

  $("resetLayoutBtn").addEventListener("click", () => {
    layout = structuredClone(defaultLayout);
    saveLayout();
    localStorage.removeItem("zzm_card_bg");
    $("card_custom_bg").value = "";
    $("showTemplateChk").checked = layout.showTemplate;
    $("showOverlayChk").checked = layout.showOverlay;
    $("showBordersChk").checked = layout.showBorders;
    activeHandle = null;
    updateActiveHandleUI();
    renderCard();
  });
}

function updateActiveHandleUI() {
  const label = $("activeHandleLabel");
  if (!label) return;
  label.textContent = activeHandle || "none";
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hexToRGBA(hex, alpha) {
  hex = String(hex || "").replace("#", "");
  if (hex.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function emojiURL(text) {
  const match = String(text || "").match(/<?a?:\w+:(\d+)>?/);
  if (!match) return null;
  return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=256&quality=lossless`;
}

async function loadImage(src, retries = 4) {
  return new Promise(resolve => {
    if (!src) return resolve(null);

    if (imageCache.has(src)) {
      return resolve(imageCache.get(src));
    }

    let tries = 0;

    const attempt = () => {
      tries++;
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        imageCache.set(src, img);
        resolve(img);
      };

      img.onerror = () => {
        if (tries < retries) {
          setTimeout(attempt, 500);
        } else {
          resolve(null);
        }
      };

      img.src = src + (src.includes("?") ? "&" : "?") + "t=" + Date.now() + "_" + tries;
    };

    attempt();
  });
}

async function getUserId(username) {
  const clean = String(username).trim().toLowerCase();
  if (!clean) return null;

  if (userIdCache.has(clean)) return userIdCache.get(clean);

  try {
    const res = await fetch(
      ROBLOX_PROXY + encodeURIComponent("https://users.roblox.com/v1/usernames/users"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [clean],
          excludeBannedUsers: false
        })
      }
    );

    const json = await res.json();
    const id = json?.data?.[0]?.id;
    if (!id) return null;

    userIdCache.set(clean, String(id));
    return String(id);
  } catch {
    return null;
  }
}

async function getAvatar(username) {
  const clean = String(username).trim().toLowerCase();
  if (!clean) return null;

  if (avatarCache.has(clean)) return avatarCache.get(clean);

  const id = await getUserId(username);
  if (!id) return null;

  try {
    const res = await fetch(
      ROBLOX_PROXY + encodeURIComponent(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`
      )
    );

    const json = await res.json();
    const url = json?.data?.[0]?.imageUrl;
    if (!url) return null;

    const img = await loadImage(url);
    if (!img) return null;

    avatarCache.set(clean, img);
    return img;
  } catch {
    return null;
  }
}

async function drawBackground() {
  const bgUrl = localStorage.getItem("zzm_card_bg") || DEFAULT_BG;
  const bg = await loadImage(bgUrl);

  if (bg) {
    ctx.drawImage(bg, 0, 0, 580, 746);
  } else {
    ctx.fillStyle = "#07111e";
    ctx.fillRect(0, 0, 580, 746);
  }

  if (layout.showOverlay) {
    ctx.fillStyle = "rgba(0,0,0,.08)";
    ctx.fillRect(0, 0, 580, 746);
  }
}

function drawText(text, x, y, size, color) {
  ctx.save();
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(0,0,0,.95)";
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawHandle(x, y, label, color) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y - 16);
}

function drawBorderedSlot(x, y, w, h, color) {
  if (!layout.showBorders) return;
  ctx.save();
  ctx.shadowColor = hexToRGBA(color, 0.32);
  ctx.shadowBlur = 18;
  roundedRect(x, y, w, h, 18);
  ctx.fillStyle = "rgba(0,0,0,.20)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function drawSlotGroup(x, y, w, h, title1, value1, title2, value2, color, scale) {
  drawBorderedSlot(x, y, w, h, color);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `bold ${Math.round(10 * scale)}px Arial`;
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.fillText(title1, x + w / 2, y + 12);

  ctx.font = `bold ${Math.round(22 * scale)}px Arial`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,.95)";
  ctx.fillStyle = color;
  ctx.strokeText(String(value1 || "0"), x + w / 2, y + 34);
  ctx.fillText(String(value1 || "0"), x + w / 2, y + 34);

  ctx.font = `bold ${Math.round(10 * scale)}px Arial`;
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.fillText(title2, x + w / 2, y + 76);

  ctx.font = `bold ${Math.round(22 * scale)}px Arial`;
  ctx.strokeText(String(value2 || "0"), x + w / 2, y + 98);
  ctx.fillText(String(value2 || "0"), x + w / 2, y + 98);

  ctx.restore();
}

function handleData() {
  return {
    avatar: {
      cx: 186 + layout.avatar.x + (208 * layout.avatar.scale) / 2,
      cy: 92 + layout.avatar.y + (208 * layout.avatar.scale) / 2,
      rx: 104 * layout.avatar.scale,
      ry: 104 * layout.avatar.scale
    },
    badge: {
      cx: 64 + layout.badge.x + 32 * layout.badge.scale,
      cy: 170 + layout.badge.y + 32 * layout.badge.scale,
      r: 26 * layout.badge.scale
    },
    name: {
      cx: 290 + layout.name.x,
      cy: 420 + layout.name.y,
      r: 28 * layout.name.scale
    },
    stats: {
      cx: 280 + layout.stats.x,
      cy: 640 + layout.stats.y,
      r: 36 * layout.stats.scale
    }
  };
}

function handleHit(p) {
  const h = handleData();
  const touchRadius = 42;

  const list = [
    { id: "avatar", x: h.avatar.cx, y: h.avatar.cy, r: Math.max(touchRadius, h.avatar.rx) },
    { id: "badge", x: h.badge.cx, y: h.badge.cy, r: Math.max(touchRadius, h.badge.r) },
    { id: "name", x: h.name.cx, y: h.name.cy, r: Math.max(touchRadius, h.name.r) },
    { id: "stats", x: h.stats.cx, y: h.stats.cy, r: Math.max(touchRadius, h.stats.r) }
  ];

  return list.find(item => Math.hypot(p.x - item.x, p.y - item.y) <= item.r) || null;
}

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height)
  };
}

async function renderCard() {
  const token = ++renderToken;

  ctx.clearRect(0, 0, 580, 746);
  await drawBackground();
  if (token !== renderToken) return;

  const color = $("card_color").value || "#00d9ff";
  const username = String($("card_username").value || "").trim();
  const displayName = String($("card_name").value || "").trim() || username || "PLAYER";

  const avatarScale = layout.avatar.scale || 1;
  const badgeScale = layout.badge.scale || 1;
  const nameScale = layout.name.scale || 1;
  const statsScale = layout.stats.scale || 1;

  const avatarX = 186 + layout.avatar.x;
  const avatarY = 92 + layout.avatar.y;
  const avatarSize = 208 * avatarScale;

  const badgeX = 64 + layout.badge.x;
  const badgeY = 170 + layout.badge.y;
  const badgeSize = 64 * badgeScale;

  const nameX = 290 + layout.name.x;
  const nameY = 420 + layout.name.y;
  const nameFontSize = 34 * nameScale;

  const statStartX = 32 + layout.stats.x;
  const statY = 590 + layout.stats.y;
  const statW = 112 * statsScale;
  const statH = 110 * statsScale;
  const gap = 18;
  const stat1 = ["DRI", $("dribbling").value, "PAS", $("passing").value];
  const stat2 = ["SHT", $("shooting").value, "DEF", $("defense").value];
  const stat3 = ["TMW", $("teamwork").value, "IND", $("individual").value];
  const stat4 = ["REA", $("reaction").value, "GEN", $("general").value];

  if (layout.showBorders) {
    ctx.save();
    ctx.shadowColor = hexToRGBA(color, 0.35);
    ctx.shadowBlur = 24;
    roundedRect(42, 58, 496, 640, 26);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexToRGBA(color, 0.85);
    ctx.stroke();
    ctx.restore();
  }

  if (layout.showBorders) {
    ctx.save();
    ctx.shadowColor = hexToRGBA(color, 0.35);
    ctx.shadowBlur = 20;
    roundedRect(avatarX, avatarY, avatarSize, avatarSize, 22);
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  const avatar = await getAvatar(username);
  if (token !== renderToken) return;

  if (avatar) {
    ctx.save();
    roundedRect(avatarX + 6, avatarY + 6, avatarSize - 12, avatarSize - 12, 18);
    ctx.clip();
    ctx.drawImage(avatar, avatarX + 6, avatarY + 6, avatarSize - 12, avatarSize - 12);
    ctx.restore();
  } else {
    drawText("?", avatarX + avatarSize / 2, avatarY + avatarSize / 2, 72, "rgba(255,255,255,.7)");
  }

  const badge = emojiURL($("card_badge").value);
  if (badge) {
    const badgeImg = await loadImage(badge);
    if (token !== renderToken) return;
    if (badgeImg) {
      ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
    }
  }

  drawText(displayName, nameX, nameY, nameFontSize, "white");

  const slot1X = statStartX;
  const slot2X = slot1X + statW + gap;
  const slot3X = slot2X + statW + gap;
  const slot4X = slot3X + statW + gap;

  drawSlotGroup(slot1X, statY, statW, statH, stat1[0], stat1[1], stat1[2], stat1[3], color, statsScale);
  drawSlotGroup(slot2X, statY, statW, statH, stat2[0], stat2[1], stat2[2], stat2[3], color, statsScale);
  drawSlotGroup(slot3X, statY, statW, statH, stat3[0], stat3[1], stat3[2], stat3[3], color, statsScale);
  drawSlotGroup(slot4X, statY, statW, statH, stat4[0], stat4[1], stat4[2], stat4[3], color, statsScale);

  if (layoutMode) {
    drawHandle(avatarX + avatarSize / 2, avatarY + avatarSize / 2, "A", color);
    drawHandle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, "B", color);
    drawHandle(nameX, nameY, "N", color);
    drawHandle(statStartX + 220, statY + 58, "S", color);
  }

  updateActiveHandleUI();
}

function getData() {
  return {
    username: $("card_username").value,
    name: $("card_name").value,
    badge: $("card_badge").value,
    color: $("card_color").value,
    customBG: localStorage.getItem("zzm_card_bg") || "",
    dribbling: $("dribbling").value,
    passing: $("passing").value,
    shooting: $("shooting").value,
    defense: $("defense").value,
    teamwork: $("teamwork").value,
    individual: $("individual").value,
    reaction: $("reaction").value,
    general: $("general").value,
    layout
  };
}

function applyData(data) {
  $("card_username").value = data.username || "";
  $("card_name").value = data.name || "";
  $("card_badge").value = data.badge || "";
  $("card_color").value = data.color || "#00d9ff";

  ["dribbling", "passing", "shooting", "defense", "teamwork", "individual", "reaction", "general"].forEach(k => {
    $(k).value = data[k] || "";
  });

  if (data.customBG) {
    localStorage.setItem("zzm_card_bg", data.customBG);
    const bgInput = $("card_custom_bg");
    if (bgInput) bgInput.value = data.customBG;
  }

  if (data.layout) {
    layout = {
      avatar: { ...defaultLayout.avatar, ...(data.layout.avatar || {}) },
      badge: { ...defaultLayout.badge, ...(data.layout.badge || {}) },
      name: { ...defaultLayout.name, ...(data.layout.name || {}) },
      stats: { ...defaultLayout.stats, ...(data.layout.stats || {}) },
      showTemplate: data.layout.showTemplate !== false,
      showOverlay: data.layout.showOverlay !== false,
      showBorders: data.layout.showBorders !== false
    };
    saveLayout();
  }

  renderCard();
}

function saveLocalCard() {
  localStorage.setItem("zzm_card_save", JSON.stringify(getData()));
  saveLayout();
  alert("Saved locally");
}

function downloadTXTCard() {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zzm-card.txt";
  a.click();
}

function loadTXTCard() {
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
  a.download = "zzm-card.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

async function reloadAvatars() {
  avatarCache.clear();
  userIdCache.clear();
  imageCache.clear();
  await renderCard();
}

canvas.style.touchAction = "none";

let drag = null;

canvas.addEventListener("pointerdown", e => {
  if (!layoutMode) return;

  const p = canvasPoint(e);
  const hit = handleHit(p);
  if (!hit) return;

  activeHandle = hit.id;
  updateActiveHandleUI();

  drag = {
    id: hit.id,
    start: p,
    layout: JSON.parse(JSON.stringify(layout))
  };

  canvas.setPointerCapture(e.pointerId);
  renderCard();
});

canvas.addEventListener("pointermove", e => {
  if (!drag || !layoutMode) return;

  const p = canvasPoint(e);
  const dx = p.x - drag.start.x;
  const dy = p.y - drag.start.y;

  layout = JSON.parse(JSON.stringify(drag.layout));

  layout[drag.id].x += dx;
  layout[drag.id].y += dy;

  saveLayout();
  renderCard();
});

canvas.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("pointercancel", () => {
  drag = null;
});

canvas.addEventListener("wheel", e => {
  if (!layoutMode) return;

  const p = canvasPoint(e);
  const hit = handleHit(p);
  if (!hit) return;

  e.preventDefault();

  activeHandle = hit.id;
  updateActiveHandleUI();

  const dir = e.deltaY < 0 ? 0.06 : -0.06;
  layout[hit.id].scale = Math.max(0.4, Math.min(3, (layout[hit.id].scale || 1) + dir));

  saveLayout();
  renderCard();
}, { passive: false });

document.addEventListener("input", () => {
  clearTimeout(renderCard._t);
  renderCard._t = setTimeout(renderCard, 80);
});

injectLayoutTools();

const local = localStorage.getItem("zzm_card_save");
if (local) {
  try {
    applyData(JSON.parse(local));
  } catch {
    renderCard();
  }
} else {
  renderCard();
}