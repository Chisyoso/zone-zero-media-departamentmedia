// js/pvp.js

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const VS_URL = "https://i.imgur.com/DOys6I4.png";
const ROBLOX_PROXY = "https://corsproxy.io/?";

const cache = {
  users: new Map(),
  thumbs: new Map(),
  avatars: new Map(),
  images: new Map(),
};

let renderToken = 0;

function $(id) {
  return document.getElementById(id);
}

function fitText(text, max, size) {
  const safeText = String(text || "");

  while (size > 10) {
    ctx.font = `bold ${size}px Arial`;
    if (ctx.measureText(safeText).width <= max) {
      return size;
    }
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadImage(src, retries = 4) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);

    if (cache.images.has(src)) {
      return resolve(cache.images.get(src));
    }

    let tries = 0;

    function attempt() {
      tries++;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        cache.images.set(src, img);
        resolve(img);
      };

      img.onerror = () => {
        if (tries < retries) {
          setTimeout(attempt, 500);
        } else {
          resolve(null);
        }
      };

      img.src =
        src +
        (src.includes("?") ? "&" : "?") +
        "t=" +
        Date.now() +
        "_" +
        tries;
    }

    attempt();
  });
}

async function getUserId(username) {
  const clean = username?.trim().toLowerCase();
  if (!clean) return null;

  if (cache.users.has(clean)) {
    return cache.users.get(clean);
  }

  try {
    const res = await fetch(ROBLOX_PROXY + encodeURIComponent("https://users.roblox.com/v1/usernames/users"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        usernames: [username.trim()],
        excludeBannedUsers: false,
      }),
    });

    const json = await res.json();
    const id = json?.data?.[0]?.id;

    if (!id) return null;

    cache.users.set(clean, id);
    return id;
  } catch {
    return null;
  }
}

async function getAvatar(username) {
  const clean = username?.trim().toLowerCase();
  if (!clean) return null;

  if (cache.avatars.has(clean)) {
    return cache.avatars.get(clean);
  }

  try {
    let thumb = cache.thumbs.get(clean);

    if (!thumb) {
      const id = await getUserId(username);
      if (!id) return null;

      // Avatar completo, no headshot
      for (let i = 0; i < 7; i++) {
        const url =
          ROBLOX_PROXY +
          encodeURIComponent(
            `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=720x720&format=Png&isCircular=false`
          );

        const res = await fetch(url);
        const json = await res.json();
        const item = json?.data?.[0];

        if (item?.state === "Completed" && item?.imageUrl) {
          thumb = item.imageUrl;
          break;
        }

        await delay(500);
      }

      if (!thumb) return null;
      cache.thumbs.set(clean, thumb);
    }

    const img = await loadImage(thumb, 5);
    if (!img) return null;

    cache.avatars.set(clean, img);
    return img;
  } catch {
    return null;
  }
}

function drawBackground(bg, color1, color2) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (bg) {
    // No estirar: cubrir manteniendo proporción
    const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
    const w = bg.width * scale;
    const h = bg.height * scale;
    const x = (WIDTH - w) / 2;
    const y = (HEIGHT - h) / 2;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bg, x, y, w, h);
    ctx.restore();
  }

  const glow1 = ctx.createRadialGradient(180, 240, 60, 180, 240, 420);
  glow1.addColorStop(0, color1 + "55");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow2 = ctx.createRadialGradient(WIDTH - 180, 240, 60, WIDTH - 180, 240, 420);
  glow2.addColorStop(0, color2 + "55");
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

function drawAvatar(img, x, y, size) {
  if (!img) return;

  // Avatar completo sin deformar
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const dx = x + (size - w) / 2;
  const dy = y + (size - h) / 2;

  ctx.save();

  roundRect(x, y, size, size, 20);
  ctx.clip();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, dx, dy, w, h);

  ctx.restore();
}

async function render() {
  const token = ++renderToken;

  const leftNick = $("leftNick")?.value.trim() || "";
  const rightNick = $("rightNick")?.value.trim() || "";

  const leftName = $("leftName")?.value.trim() || leftNick;
  const rightName = $("rightName")?.value.trim() || rightNick;

  const score = $("score")?.value.trim() || "0-0";
  const color1 = $("color1")?.value || "#ff004c";
  const color2 = $("color2")?.value || "#00d9ff";
  const bgUrl = $("background")?.value.trim() || "";

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const [leftAvatar, rightAvatar, vs, bg] = await Promise.all([
    getAvatar(leftNick),
    getAvatar(rightNick),
    loadImage(VS_URL),
    loadImage(bgUrl),
  ]);

  if (token !== renderToken) return;

  drawBackground(bg, color1, color2);

  drawPlayerBox(250, color1);
  drawPlayerBox(WIDTH - 250, color2);

  // Un poco más de margen visual para que el cuerpo completo se vea mejor
  drawAvatar(leftAvatar, 70, 120, 360);
  drawAvatar(rightAvatar, WIDTH - 430, 120, 360);

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
    color1: $("color1")?.value || "",
    color2: $("color2")?.value || "",
    score: $("score")?.value || "",
    background: $("background")?.value || "",
  };
}

function applyData(data) {
  $("leftNick").value = data.leftNick || "";
  $("rightNick").value = data.rightNick || "";
  $("leftName").value = data.leftName || "";
  $("rightName").value = data.rightName || "";
  $("color1").value = data.color1 || "#ff004c";
  $("color2").value = data.color2 || "#00d9ff";
  $("score").value = data.score || "0-0";
  $("background").value = data.background || "";

  render();
}

function saveLocalPVP() {
  localStorage.setItem("zzm_pvp", JSON.stringify(getData()));
  alert("Saved locally");
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
  $("txtLoader").click();
}

const txtLoader = $("txtLoader");
if (txtLoader) {
  txtLoader.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        applyData(JSON.parse(String(reader.result || "{}")));
      } catch {
        alert("Invalid file");
      }
    };

    reader.readAsText(file);
  });
}

function downloadImage() {
  try {
    const a = document.createElement("a");
    a.download = "team-pvp.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  } catch {
    alert("No se pudo descargar la imagen.");
  }
}

async function reloadAvatars() {
  cache.users.clear();
  cache.thumbs.clear();
  cache.avatars.clear();
  await render();
}

let timeout;

document.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(render, 200);
});

function toggleSidebar() {
  $("sidebar")?.classList.toggle("open");
}

const save = localStorage.getItem("zzm_pvp");

if (save) {
  try {
    applyData(JSON.parse(save));
  } catch {
    render();
  }
} else {
  render();
}