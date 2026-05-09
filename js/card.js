// js/card.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 580;
canvas.height = 746;
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const CARD_BG = "https://i.imgur.com/9JXUwwa.jpeg";
const ROBLOX_PROXY = "https://corsproxy.io/?";

const avatarCache = new Map();
const userIdCache = new Map();
const imageCache = new Map();

const $ = (id) => document.getElementById(id);

const sidebar = $("sidebar");
let sidebarOpen = location.hash.includes("layout");

const defaultLayout = {
  avatar: { x: 0, y: 0 },
  badge: { x: 0, y: 0 },
  name: { x: 0, y: 0 },
  stats: { x: 0, y: 0 },
  showTemplate: true,
  showOverlay: true,
  showBorders: true
};

let layout = loadLayout();
let layoutMode = location.hash.includes("layout");
let renderToken = 0;

function loadLayout() {
  try {
    const raw = localStorage.getItem("zzm_card_layout");
    if (!raw) return structuredClone(defaultLayout);
    const parsed = JSON.parse(raw);
    return {
      avatar: { ...defaultLayout.avatar, ...(parsed.avatar || {}) },
      badge: { ...defaultLayout.badge, ...(parsed.badge || {}) },
      name: { ...defaultLayout.name, ...(parsed.name || {}) },
      stats: { ...defaultLayout.stats, ...(parsed.stats || {}) },
      showTemplate: parsed.showTemplate !== false,
      showOverlay: parsed.showOverlay !== false,
      showBorders: parsed.showBorders !== false
    };
  } catch {
    return structuredClone(defaultLayout);
  }
}

function saveLayout() {
  localStorage.setItem("zzm_card_layout", JSON.stringify(layout));
}

function syncSidebarState() {
  if (window.innerWidth <= 900) {
    sidebar.style.transform = sidebarOpen ? "translateX(0)" : "translateX(-100%)";
  } else {
    sidebar.style.transform = "translateX(0)";
  }
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  syncSidebarState();
}

window.addEventListener("resize", syncSidebarState);
syncSidebarState();

function injectLayoutTools() {
  if (document.getElementById("layoutTools")) return;

  const actions = document.querySelector(".actions");
  if (!actions) return;

  const wrap = document.createElement("div");
  wrap.id = "layoutTools";
  wrap.style.margin = "14px 0 0";
  wrap.style.padding = "12px";
  wrap.style.borderRadius = "14px";
  wrap.style.background = "rgba(255,255,255,.04)";
  wrap.style.border = "1px solid rgba(255,255,255,.08)";
  wrap.innerHTML = `
    <button id="layoutModeBtn" type="button" style="width:100%;margin-bottom:10px;">${layoutMode ? "Exit Layout Mode" : "Enter Layout Mode"}</button>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:13px;">
      <input id="showTemplateChk" type="checkbox" ${layout.showTemplate ? "checked" : ""}> Show background template
    </label>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-size:13px;">
      <input id="showOverlayChk" type="checkbox" ${layout.showOverlay ? "checked" : ""}> Show dark overlay
    </label>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0 0;font-size:13px;">
      <input id="showBordersChk" type="checkbox" ${layout.showBorders ? "checked" : ""}> Show borders
    </label>
    <button id="resetLayoutBtn" type="button" style="width:100%;margin-top:10px;">Reset Layout</button>
    <div style="margin-top:10px;font-size:12px;opacity:.78;line-height:1.4;">
      Drag the handles on the card to move avatar, badge, name and stats.
    </div>
  `;
  actions.parentNode.insertBefore(wrap, actions);

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

  $("resetLayoutBtn").addEventListener("click", () => {
    layout = structuredClone(defaultLayout);
    saveLayout();
    if ($("showTemplateChk")) $("showTemplateChk").checked = layout.showTemplate;
    if ($("showOverlayChk")) $("showOverlayChk").checked = layout.showOverlay;
    if ($("showBordersChk")) $("showBordersChk").checked = layout.showBorders;
    renderCard();
  });
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

function escapeText(value) {
  return String(value ?? "").trim();
}

function fitFontSize(text, maxWidth, startSize, weight = "bold", family = "Arial") {
  let size = startSize;
  while (size > 8) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size--;
  }
  return size;
}

function drawText(text, x, y, size, color, align = "center", stroke = "rgba(0,0,0,.9)", strokeWidth = 6) {
  ctx.save();
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = color;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function emojiURL(text) {
  const match = String(text || "").match(/<?a?:\w+:(\d+)>?/);
  if (!match) return null;
  return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=128&quality=lossless`;
}

async function loadImage(src, retries = 4) {
  return new Promise((resolve) => {
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
  const clean = escapeText(username).toLowerCase();
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
    const id = json?.data?.[0]?.id || null;
    if (!id) return null;

    userIdCache.set(clean, String(id));
    return String(id);
  } catch {
    return null;
  }
}

async function getAvatar(username) {
  const clean = escapeText(username).toLowerCase();
  if (!clean) return null;

  if (avatarCache.has(clean)) return avatarCache.get(clean);

  const userId = await getUserId(username);
  if (!userId) return null;

  try {
    for (let i = 0; i < 6; i++) {
      const res = await fetch(
        ROBLOX_PROXY +
          encodeURIComponent(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
          )
      );

      const json = await res.json();
      const item = json?.data?.[0];
      const url = item?.imageUrl || null;

      if (item?.state === "Completed" && url) {
        const img = await loadImage(url, 4);
        if (img) {
          avatarCache.set(clean, img);
          return img;
        }
      }

      if (url && i === 5) {
        const img = await loadImage(url, 4);
        if (img) {
          avatarCache.set(clean, img);
          return img;
        }
      }

      await new Promise(r => setTimeout(r, 500));
    }
    return null;
  } catch {
    return null;
  }
}

async function drawBackground() {
  if (layout.showTemplate) {
    const bg = await loadImage(CARD_BG, 2);
    if (bg) {
      ctx.drawImage(bg, 0, 0, 580, 746);
    } else {
      ctx.fillStyle = "#08111f";
      ctx.fillRect(0, 0, 580, 746);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 746);
    g.addColorStop(0, "#07111e");
    g.addColorStop(1, "#050816");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 580, 746);
  }

  if (layout.showOverlay) {
    const topGlow = ctx.createRadialGradient(290, 170, 30, 290, 170, 380);
    topGlow.addColorStop(0, "rgba(52, 148, 255, .22)");
    topGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, 580, 746);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(0, 0, 580, 746);
  }
}

function drawSlotBox(x, y, w, h, color) {
  if (!layout.showBorders) return;
  ctx.save();
  ctx.shadowColor = hexToRGBA(color, 0.28);
  ctx.shadowBlur = 18;
  roundedRect(x, y, w, h, 18);
  ctx.fillStyle = "rgba(0,0,0,.20)";
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function drawMiniStat(x, y, w, label, value, color) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.fillText(label, x + w / 2, y + 12);

  ctx.font = "bold 22px Arial";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,.92)";
  ctx.fillStyle = color;
  ctx.strokeText(String(value || "0"), x + w / 2, y + 34);
  ctx.fillText(String(value || "0"), x + w / 2, y + 34);
  ctx.restore();
}

function drawSlot(x, y, w, h, title1, value1, title2, value2, color) {
  drawSlotBox(x, y, w, h, color);
  drawMiniStat(x, y + 6, w, title1, value1, color);
  drawMiniStat(x, y + 58, w, title2, value2, color);
}

function drawHandle(x, y, label, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "white";
  ctx.stroke();
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, y - 13);
  ctx.restore();
}

function getData() {
  return {
    username: $("card_username").value,
    name: $("card_name").value,
    badge: $("card_badge").value,
    color: $("card_color").value,
    bg: $("card_bg_color").value,
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
  $("card_bg_color").value = data.bg || "#00162d";

  ["dribbling", "passing", "shooting", "defense", "teamwork", "individual", "reaction", "general"].forEach(k => {
    $(k).value = data[k] ?? "";
  });

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

async function renderCard() {
  const token = ++renderToken;

  await drawBackground();
  if (token !== renderToken) return;

  const mainColor = $("card_color").value || "#00d9ff";
  const bgColor = $("card_bg_color").value || "#00162d";

  const username = escapeText($("card_username").value);
  const displayName = escapeText($("card_name").value) || username || "PLAYER";

  const avatarX = 178 + layout.avatar.x;
  const avatarY = 76 + layout.avatar.y;
  const badgeX = 58 + layout.badge.x;
  const badgeY = 130 + layout.badge.y;
  const nameX = 290 + layout.name.x;
  const nameY = 346 + layout.name.y;
  const slotY = 542 + layout.stats.y;
  const slotX = 28 + layout.stats.x;

  ctx.save();
  if (layout.showBorders) {
    ctx.fillStyle = hexToRGBA(bgColor, 0.44);
    roundedRect(42, 495, 496, 205, 26);
    ctx.fill();
  } else {
    ctx.fillStyle = hexToRGBA(bgColor, 0.26);
    roundedRect(42, 495, 496, 205, 26);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  if (layout.showBorders) {
    ctx.shadowColor = hexToRGBA(mainColor, 0.35);
    ctx.shadowBlur = 18;
    roundedRect(badgeX, badgeY, 78, 78, 18);
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = mainColor;
    ctx.stroke();
  }
  ctx.restore();

  const badge = emojiURL($("card_badge").value);
  if (badge) {
    const badgeImg = await loadImage(badge, 4);
    if (token !== renderToken) return;
    if (badgeImg) {
      ctx.drawImage(badgeImg, badgeX + 6, badgeY + 6, 66, 66);
    }
  }

  const avatar = await getAvatar(username);
  if (token !== renderToken) return;

  if (layout.showBorders) {
    ctx.save();
    ctx.shadowColor = hexToRGBA(mainColor, 0.35);
    ctx.shadowBlur = 20;
    roundedRect(avatarX, avatarY, 224, 224, 26);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = mainColor;
    ctx.stroke();
    ctx.restore();
  }

  if (avatar) {
    ctx.save();
    roundedRect(avatarX + 8, avatarY + 8, 208, 208, 20);
    ctx.clip();
    ctx.drawImage(avatar, avatarX + 8, avatarY + 8, 208, 208);
    ctx.restore();
  } else {
    drawText("?", avatarX + 112, avatarY + 116, 72, "rgba(255,255,255,.7)");
  }

  const nameFont = fitFontSize(displayName, 360, 34);
  drawText(displayName, nameX, nameY, nameFont, "white", "center", "rgba(0,0,0,.95)", 7);

  const slots = [
    { x: slotX + 0,   a: "DRI", av: $("dribbling").value,   b: "PAS", bv: $("passing").value },
    { x: slotX + 132, a: "SHT", av: $("shooting").value,    b: "DEF", bv: $("defense").value },
    { x: slotX + 264, a: "TMW", av: $("teamwork").value,    b: "IND", bv: $("individual").value },
    { x: slotX + 396, a: "REA", av: $("reaction").value,    b: "GEN", bv: $("general").value },
  ];

  slots.forEach(s => {
    drawSlot(s.x, slotY, 126, 122, s.a, s.av, s.b, s.bv, mainColor);
  });

  if (layoutMode) {
    drawHandle(avatarX + 112, avatarY + 112, "A", mainColor);
    drawHandle(badgeX + 39, badgeY + 39, "S", mainColor);
    drawHandle(nameX, nameY, "N", mainColor);
    drawHandle(290 + layout.stats.x, slotY + 60, "ST", mainColor);
  }
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

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left) * (canvas.width / rect.width),
    y: (evt.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function hitHandle(p) {
  const avatarX = 178 + layout.avatar.x + 112;
  const avatarY = 76 + layout.avatar.y + 112;
  const badgeX = 58 + layout.badge.x + 39;
  const badgeY = 130 + layout.badge.y + 39;
  const nameX = 290 + layout.name.x;
  const nameY = 346 + layout.name.y;
  const statsX = 290 + layout.stats.x;
  const statsY = 542 + layout.stats.y + 60;

  const handles = [
    { id: "avatar", x: avatarX, y: avatarY, r: 18 },
    { id: "badge", x: badgeX, y: badgeY, r: 18 },
    { id: "name", x: nameX, y: nameY, r: 18 },
    { id: "stats", x: statsX, y: statsY, r: 18 }
  ];

  return handles.find(h => Math.hypot(p.x - h.x, p.y - h.y) <= h.r) || null;
}

let drag = null;

canvas.style.touchAction = "none";
canvas.addEventListener("pointerdown", (e) => {
  if (!layoutMode) return;
  const p = canvasPoint(e);
  const hit = hitHandle(p);
  if (!hit) return;

  drag = {
    id: hit.id,
    start: p,
    orig: JSON.parse(JSON.stringify(layout))
  };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag || !layoutMode) return;
  const p = canvasPoint(e);
  const dx = Math.round(p.x - drag.start.x);
  const dy = Math.round(p.y - drag.start.y);

  layout = JSON.parse(JSON.stringify(drag.orig));

  if (drag.id === "avatar") {
    layout.avatar.x += dx;
    layout.avatar.y += dy;
  } else if (drag.id === "badge") {
    layout.badge.x += dx;
    layout.badge.y += dy;
  } else if (drag.id === "name") {
    layout.name.x += dx;
    layout.name.y += dy;
  } else if (drag.id === "stats") {
    layout.stats.x += dx;
    layout.stats.y += dy;
  }

  saveLayout();
  renderCard();
});

canvas.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("pointercancel", () => {
  drag = null;
});

document.addEventListener("input", () => {
  clearTimeout(renderCard._timeout);
  renderCard._timeout = setTimeout(() => {
    renderCard();
  }, 90);
});

injectLayoutTools();

if (location.hash.includes("layout")) {
  layoutMode = true;
  const btn = $("layoutModeBtn");
  if (btn) btn.textContent = "Exit Layout Mode";
}

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