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
let sidebarOpen = false;

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

  const userId = await getUserId(clean);
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
  const bg = await loadImage(CARD_BG, 2);
  if (bg) {
    ctx.drawImage(bg, 0, 0, 580, 746);
  } else {
    ctx.fillStyle = "#08111f";
    ctx.fillRect(0, 0, 580, 746);
  }

  const topGlow = ctx.createRadialGradient(290, 170, 30, 290, 170, 380);
  topGlow.addColorStop(0, "rgba(52, 148, 255, .22)");
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, 580, 746);

  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fillRect(0, 0, 580, 746);
}

function drawSlotBox(x, y, w, h, color) {
  ctx.save();
  ctx.shadowColor = hexToRGBA(color, 0.28);
  ctx.shadowBlur = 18;
  roundedRect(x, y, w, h, 22);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function drawMiniStat(x, y, w, label, value, color) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.fillText(label, x + w / 2, y + 12);

  ctx.font = "bold 24px Arial";
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

function collectCardData() {
  return {
    username: escapeText($("card_username").value),
    name: escapeText($("card_name").value),
    badge: escapeText($("card_badge").value),
    color: $("card_color").value,
    bg: $("card_bg_color").value,
    dribbling: $("dribbling").value,
    passing: $("passing").value,
    shooting: $("shooting").value,
    defense: $("defense").value,
    teamwork: $("teamwork").value,
    individual: $("individual").value,
    reaction: $("reaction").value,
    general: $("general").value
  };
}

function applyCardData(data) {
  $("card_username").value = data.username || "";
  $("card_name").value = data.name || "";
  $("card_badge").value = data.badge || "";
  $("card_color").value = data.color || "#00d9ff";
  $("card_bg_color").value = data.bg || "#00162d";

  ["dribbling", "passing", "shooting", "defense", "teamwork", "individual", "reaction", "general"].forEach(k => {
    $(k).value = data[k] ?? "";
  });

  renderCard();
}

async function renderCard() {
  const token = Symbol("render");
  renderCard._token = token;

  await drawBackground();
  if (renderCard._token !== token) return;

  const mainColor = $("card_color").value || "#00d9ff";
  const bgColor = $("card_bg_color").value || "#00162d";

  const username = escapeText($("card_username").value);
  const displayName = escapeText($("card_name").value) || username || "PLAYER";

  // Lower card panel
  ctx.save();
  ctx.fillStyle = hexToRGBA(bgColor, 0.44);
  roundedRect(42, 495, 496, 205, 26);
  ctx.fill();
  ctx.restore();

  // Left badge / emoji slot
  ctx.save();
  ctx.shadowColor = hexToRGBA(mainColor, 0.35);
  ctx.shadowBlur = 18;
  roundedRect(58, 130, 78, 78, 18);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = mainColor;
  ctx.stroke();
  ctx.restore();

  const badge = emojiURL($("card_badge").value);
  if (badge) {
    const badgeImg = await loadImage(badge, 4);
    if (renderCard._token !== token) return;
    if (badgeImg) {
      ctx.drawImage(badgeImg, 64, 136, 66, 66);
    }
  } else {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath();
    ctx.moveTo(92, 146);
    ctx.lineTo(118, 172);
    ctx.lineTo(92, 198);
    ctx.lineTo(66, 172);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Avatar area
  const avatar = await getAvatar(username);
  if (renderCard._token !== token) return;

  const ax = 178;
  const ay = 76;
  const aw = 224;
  const ah = 224;

  ctx.save();
  ctx.shadowColor = hexToRGBA(mainColor, 0.35);
  ctx.shadowBlur = 20;
  roundedRect(ax, ay, aw, ah, 26);
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = mainColor;
  ctx.stroke();
  ctx.restore();

  if (avatar) {
    ctx.save();
    roundedRect(ax + 8, ay + 8, aw - 16, ah - 16, 20);
    ctx.clip();
    ctx.drawImage(avatar, ax + 8, ay + 8, aw - 16, ah - 16);
    ctx.restore();
  } else {
    drawText("?", 290, 188, 72, "rgba(255,255,255,.7)");
  }

  // Name
  const nameFont = fitFontSize(displayName, 360, 34);
  drawText(displayName, 290, 346, nameFont, "white", "center", "rgba(0,0,0,.95)", 7);

  // Bottom stats: 4 slots x 2 stats each
  const color1 = mainColor;
  const slots = [
    { x: 28,  a: "DRI", av: $("dribbling").value, b: "PAS", bv: $("passing").value },
    { x: 160, a: "SHT", av: $("shooting").value, b: "DEF", bv: $("defense").value },
    { x: 292, a: "TMW", av: $("teamwork").value, b: "IND", bv: $("individual").value },
    { x: 424, a: "REA", av: $("reaction").value, b: "GEN", bv: $("general").value },
  ];

  slots.forEach(s => {
    drawSlot(s.x, 542, 126, 122, s.a, s.av, s.b, s.bv, color1);
  });

  // subtle bottom logo area
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ZONE ZERO", 290, 725);
  ctx.restore();
}

function saveLocalCard() {
  localStorage.setItem("zzm_card_save", JSON.stringify(collectCardData()));
  alert("Saved locally");
}

function downloadTXTCard() {
  const blob = new Blob([JSON.stringify(collectCardData(), null, 2)], { type: "text/plain" });
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
      applyCardData(JSON.parse(reader.result));
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

let renderTimeout;
document.addEventListener("input", () => {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderCard();
  }, 90);
});

const local = localStorage.getItem("zzm_card_save");
if (local) {
  try {
    applyCardData(JSON.parse(local));
  } catch {
    renderCard();
  }
} else {
  renderCard();
}