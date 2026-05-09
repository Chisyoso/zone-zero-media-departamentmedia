// js/pvp.js

const canvas = document.getElementById("canvas");
if (!canvas) {
  throw new Error('No se encontró el elemento <canvas id="canvas">');
}

const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const VS_URL = "https://i.imgur.com/DOys6I4.png";

const cache = {
  users: new Map(),
  thumbs: new Map(),
  avatars: new Map(),
  images: new Map(),
};

let renderToken = 0;
let saveTimeout = null;

function $(id) {
  return document.getElementById(id);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fitText(text, maxWidth, startSize) {
  let size = startSize;

  while (size > 10) {
    ctx.font = `bold ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size--;
  }

  return size;
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function loadImageSafe(src) {
  if (!src) return null;

  if (cache.images.has(src)) {
    return cache.images.get(src);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      cache.images.set(src, img);
      resolve(img);
    };

    img.onerror = () => resolve(null);

    const joiner = src.includes("?") ? "&" : "?";
    img.src = `${src}${joiner}t=${Date.now()}`;
  });
}

async function getUserId(username) {
  const clean = (username || "").trim().toLowerCase();
  if (!clean) return null;

  if (cache.users.has(clean)) {
    return cache.users.get(clean);
  }

  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username.trim()],
        excludeBannedUsers: false,
      }),
    });

    const json = await res.json();
    const id = json?.data?.[0]?.id || null;

    if (id) cache.users.set(clean, id);
    return id;
  } catch {
    return null;
  }
}

async function getAvatar(username) {
  const clean = (username || "").trim().toLowerCase();
  if (!clean) return null;

  if (cache.avatars.has(clean)) {
    return cache.avatars.get(clean);
  }

  try {
    let thumb = cache.thumbs.get(clean);

    if (!thumb) {
      const id = await getUserId(username);
      if (!id) return null;

      const res = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
      );

      const json = await res.json();
      thumb = json?.data?.[0]?.imageUrl || null;

      if (!thumb) return null;
      cache.thumbs.set(clean, thumb);
    }

    const img = await loadImageSafe(thumb);
    if (!img) return null;

    cache.avatars.set(clean, img);
    return img;
  } catch {
    return null;
  }
}

function drawBackground(bg, color1, color2) {
  ctx.fillStyle = "#1b1b1b";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (bg) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  } else {
    const base = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    base.addColorStop(0, "#090909");
    base.addColorStop(0.55, "#111111");
    base.addColorStop(1, "#000000");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const glow1 = ctx.createRadialGradient(200, 250, 50, 200, 250, 450);
  glow1.addColorStop(0, `${color1}55`);
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow2 = ctx.createRadialGradient(WIDTH - 200, 250, 50, WIDTH - 200, 250, 450);
  glow2.addColorStop(0, `${color2}55`);
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255,255,255,.04)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawName(text, x, y, color) {
  const safeText = String(text || "");
  const size = fitText(safeText, 360, 42);

  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(0,0,0,.95)";
  ctx.strokeText(safeText, x, y);

  ctx.fillStyle = color;
  ctx.fillText(safeText, x, y);
}

function drawPlayerBox(x, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 35;

  roundRect(x - 180, 90, 360, 440, 28);
  ctx.fillStyle = "rgba(255,255,255,.03)";
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.restore();
}

async function render() {
  const token = ++renderToken;

  const leftNick = ($("leftNick")?.value || "").trim();
  const rightNick = ($("rightNick")?.value || "").trim();

  const leftName = ($("leftName")?.value || "").trim() || leftNick;
  const rightName = ($("rightName")?.value || "").trim() || rightNick;

  const score = ($("score")?.value || "").trim() || "0-0";
  const color1 = ($("color1")?.value || "#ff004c").trim();
  const color2 = ($("color2")?.value || "#00d9ff").trim();
  const bgUrl = ($("background")?.value || "").trim();

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const [leftAvatar, rightAvatar, vs, bg] = await Promise.all([
    getAvatar(leftNick),
    getAvatar(rightNick),
    loadImageSafe(VS_URL),
    loadImageSafe(bgUrl),
  ]);

  if (token !== renderToken) return;

  drawBackground(bg, color1, color2);

  drawPlayerBox(250, color1);
  drawPlayerBox(WIDTH - 250, color2);

  if (leftAvatar) {
    ctx.drawImage(leftAvatar, 70, 120, 360, 360);
  }

  if (rightAvatar) {
    ctx.drawImage(rightAvatar, WIDTH - 430, 120, 360, 360);
  }

  drawName(leftName, 250, 80, color1);
  drawName(rightName, WIDTH - 250, 80, color2);

  ctx.fillStyle = color1;
  ctx.fillRect(130, 530, 240, 12);

  ctx.fillStyle = color2;
  ctx.fillRect(WIDTH - 370, 530, 240, 12);

  ctx.font = "bold 104px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineWidth = 12;
  ctx.strokeStyle = "rgba(0,0,0,.95)";
  ctx.strokeText(score, WIDTH / 2, 605);

  ctx.fillStyle = "white";
  ctx.fillText(score, WIDTH / 2, 605);

  if (vs) {
    ctx.save();
    ctx.shadowColor = "rgba(255,0,0,.45)";
    ctx.shadowBlur = 28;
    ctx.drawImage(vs, WIDTH / 2 - 110, HEIGHT / 2 - 110, 220, 220);
    ctx.restore();
  }
}

function getData() {
  return {
    leftNick: $("leftNick")?.value || "",
    rightNick: $("rightNick")?.value || "",
    leftName: $("leftName")?.value || "",
    rightName: $("rightName")?.value || "",
    color1: $("color1")?.value || "#ff004c",
    color2: $("color2")?.value || "#00d9ff",
    score: $("score")?.value || "0-0",
    background: $("background")?.value || "",
  };
}

function applyData(data) {
  $("leftNick").value = data?.leftNick || "";
  $("rightNick").value = data?.rightNick || "";
  $("leftName").value = data?.leftName || "";
  $("rightName").value = data?.rightName || "";
  $("color1").value = data?.color1 || "#ff004c";
  $("color2").value = data?.color2 || "#00d9ff";
  $("score").value = data?.score || "0-0";
  $("background").value = data?.background || "";

  render();
}

function saveLocalPVP() {
  localStorage.setItem("zzm_pvp", JSON.stringify(getData()));
}

function downloadTXTPVP() {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], {
    type: "application/json",
  });

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = "team-pvp.txt";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadTXTPVP() {
  const input = $("txtLoader");
  if (input) input.click();
}

const txtLoader = $("txtLoader");
if (txtLoader) {
  txtLoader.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || "{}"));
        applyData(json);
      } catch {
        alert("Invalid file");
      }
    };

    reader.readAsText(file);
  });
}

function downloadImage() {
  const a = document.createElement("a");
  a.download = "team-pvp.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
}

async function reloadAvatars() {
  cache.users.clear();
  cache.thumbs.clear();
  cache.avatars.clear();
  cache.images.delete(VS_URL);
  await render();
}

function toggleSidebar() {
  const sidebar = $("sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function scheduleRenderAndSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveLocalPVP();
    render();
  }, 120);
}

document.addEventListener("input", scheduleRenderAndSave);
document.addEventListener("change", scheduleRenderAndSave);

document.addEventListener("DOMContentLoaded", () => {
  const save = localStorage.getItem("zzm_pvp");

  if (save) {
    try {
      applyData(JSON.parse(save));
      return;
    } catch {
      // si el localStorage está corrupto, dibuja vacío
    }
  }

  render();
});