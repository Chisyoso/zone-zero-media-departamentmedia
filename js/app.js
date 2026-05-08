const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const defaultBG = "https://i.imgur.com/dRSz8QM.png";
const DEBUG_AVATARS = true;

const positions = [
  { id: "cf", x: 800, y: 165 },
  { id: "rw", x: 1300, y: 420 },
  { id: "cm", x: 800, y: 500 },
  { id: "lw", x: 370, y: 420 },
  { id: "gk", x: 800, y: 820 }
];

const avatarCache = new Map();
const requestTokenByPos = new Map();
const players = document.getElementById("players");

function ensureDebugPanel() {
  if (!DEBUG_AVATARS) return null;

  let panel = document.getElementById("debugLog");
  if (!panel) {
    panel = document.createElement("pre");
    panel.id = "debugLog";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.width = "min(420px, calc(100vw - 24px))";
    panel.style.maxHeight = "220px";
    panel.style.overflow = "auto";
    panel.style.margin = "0";
    panel.style.padding = "12px";
    panel.style.zIndex = "99999";
    panel.style.background = "rgba(0,0,0,.82)";
    panel.style.color = "#b9ffb9";
    panel.style.border = "1px solid rgba(255,255,255,.12)";
    panel.style.borderRadius = "14px";
    panel.style.fontSize = "12px";
    panel.style.lineHeight = "1.4";
    panel.style.whiteSpace = "pre-wrap";
    panel.style.pointerEvents = "none";
    document.body.appendChild(panel);
  }
  return panel;
}

function debugLog(...parts) {
  if (!DEBUG_AVATARS) return;
  const panel = ensureDebugPanel();
  if (!panel) return;
  const msg = `[${new Date().toLocaleTimeString()}] ${parts.join(" ")}`;
  panel.textContent = `${msg}\n${panel.textContent}`.slice(0, 12000);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSaved(type) {
  return JSON.parse(localStorage.getItem(type) || "[]");
}

function saveAutocomplete(type, value) {
  if (!value || value.length < 2) return;

  let data = getSaved(type);
  data = data.filter(v => v.toLowerCase() !== value.toLowerCase());
  data.unshift(value);
  data = data.slice(0, 5);

  localStorage.setItem(type, JSON.stringify(data));
}

function createDatalist(id, items) {
  const dl = document.createElement("datalist");
  dl.id = id;

  items.forEach(v => {
    const op = document.createElement("option");
    op.value = v;
    dl.appendChild(op);
  });

  document.body.appendChild(dl);
}

function refreshDatalists() {
  document.querySelectorAll("datalist").forEach(v => v.remove());
  createDatalist("nicklist", getSaved("nick_autocomplete"));
  createDatalist("stylelist", getSaved("style_autocomplete"));
}

refreshDatalists();

positions.forEach(pos => {
  const div = document.createElement("div");
  div.className = "player-box";

  div.innerHTML = `
<div class="player-header">
<h4>${pos.id.toUpperCase()}</h4>

<div class="avatar-status" id="${pos.id}_status">
<span class="status idle"></span>
</div>
</div>

<input
list="nicklist"
placeholder="Username"
id="${pos.id}_name"
>

<input
list="stylelist"
placeholder="Style"
id="${pos.id}_style"
>
`;

  players.appendChild(div);
});

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

async function loadImage(src, retries = 4, timeoutMs = 8000, useAnonymous = true) {
  return new Promise(resolve => {
    if (!src) return resolve(null);

    let attempts = 0;
    let finished = false;

    const tryLoad = () => {
      attempts++;

      const img = new Image();
      if (useAnonymous) img.crossOrigin = "anonymous";

      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;

        if (attempts < retries) {
          debugLog("timeout", src, "retry", attempts);
          setTimeout(() => {
            finished = false;
            tryLoad();
          }, 500);
        } else {
          debugLog("timeout fail", src);
          resolve(null);
        }
      }, timeoutMs);

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (attempts < retries) {
          debugLog("image error", src, "retry", attempts);
          setTimeout(() => {
            finished = false;
            tryLoad();
          }, 500);
        } else {
          debugLog("image fail", src);
          resolve(null);
        }
      };

      const bust = src + (src.includes("?") ? "&" : "?") + "t=" + Date.now() + "_" + attempts;
      img.src = bust;
    };

    tryLoad();
  });
}

async function fetchAvatarJson(username, retries = 4) {
  const apiURL = `https://perfil-api.onrender.com/perfil/imagen?username=${encodeURIComponent(username)}`;

  for (let i = 1; i <= retries; i++) {
    try {
      debugLog("fetch api", username, "attempt", i);
      const response = await fetch(apiURL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const item = Array.isArray(data?.data) ? data.data.find(v => v && v.imageUrl) || data.data[0] : null;
      const imageUrl = item?.imageUrl;

      if (!imageUrl) {
        debugLog("no imageUrl", username, JSON.stringify(data).slice(0, 250));
        throw new Error("No imageUrl in response");
      }

      debugLog("imageUrl ok", username, imageUrl);
      return imageUrl;
    } catch (err) {
      debugLog("api fail", username, `attempt ${i}`, err?.message || err);
      if (i < retries) await delay(500 * i);
    }
  }

  return null;
}

function setStatus(pos, mode, text = "") {
  const status = document.getElementById(pos + "_status");
  if (!status) return;

  if (mode === "loading") {
    status.innerHTML = `<span class="status loading"></span>`;
    return;
  }

  if (mode === "success") {
    status.innerHTML = `<span class="status success">✓</span>`;
    return;
  }

  if (mode === "error") {
    status.innerHTML = `<span class="status error">${text || "!"}</span>`;
    return;
  }

  status.innerHTML = `<span class="status idle"></span>`;
}

async function getAvatar(username, pos) {
  if (!username) {
    setStatus(pos, "idle");
    return null;
  }

  const cleanName = username.trim().toLowerCase();
  const currentToken = (requestTokenByPos.get(pos) || 0) + 1;
  requestTokenByPos.set(pos, currentToken);

  const cached = avatarCache.get(cleanName);
  if (cached) {
    setStatus(pos, "success");
    return cached;
  }

  setStatus(pos, "loading");

  const imageUrl = await fetchAvatarJson(username, 4);
  if (requestTokenByPos.get(pos) !== currentToken) return null;

  if (!imageUrl) {
    setStatus(pos, "error", "!");
    return null;
  }

  let img = await loadImage(imageUrl, 4, 9000, true);
  if (requestTokenByPos.get(pos) !== currentToken) return null;

  if (!img) {
    debugLog("anonymous load failed, fallback plain image", username);
    img = await loadImage(imageUrl, 2, 9000, false);
    if (requestTokenByPos.get(pos) !== currentToken) return null;
  }

  if (!img) {
    setStatus(pos, "error", "!");
    return null;
  }

  avatarCache.set(cleanName, img);
  setStatus(pos, "success");
  return img;
}

function paletteFromSeed(seed) {
  let h = 0;

  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }

  h = Math.abs(h);
  const hue = h % 360;

  return {
    main: `hsl(${hue},85%,60%)`,
    glow: `hsla(${hue},85%,60%,.35)`
  };
}

async function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bgInput = document.getElementById("stadium").value.trim();
  const bg = await loadImage(bgInput || defaultBG, 3, 10000, true);

  if (bg) {
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const pos of positions) {
    const name = document.getElementById(pos.id + "_name").value.trim();
    const style = document.getElementById(pos.id + "_style").value.trim();

    const palette = paletteFromSeed(name + style);

    ctx.save();
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 92, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fill();
    ctx.restore();

    if (!name) {
      setStatus(pos.id, "idle");
    } else {
      const img = await getAvatar(name, pos.id);

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 75, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, pos.x - 75, pos.y - 75, 150, 150);
        ctx.restore();
      }
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 80, 0, Math.PI * 2);
    ctx.strokeStyle = palette.main;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 88, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.lineWidth = 2;
    ctx.stroke();

    roundedRect(pos.x + 60, pos.y - 40, 170, 48, 14);
    ctx.fillStyle = palette.main;
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText((style || "Style").slice(0, 14), pos.x + 145, pos.y - 10);

    const nameW = Math.max(120, ctx.measureText(name || "?").width + 40);

    roundedRect(pos.x - nameW / 2, pos.y + 100, nameW, 50, 14);
    ctx.fillStyle = "rgba(0,0,0,.65)";
    ctx.fill();

    ctx.strokeStyle = palette.main;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.fillText((name || "?").slice(0, 16), pos.x, pos.y + 133);
  }
}

let renderTimeout;

document.addEventListener("input", () => {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    render();
  }, 350);
});

document.addEventListener("change", e => {
  if (e.target.id.includes("_name")) {
    saveAutocomplete("nick_autocomplete", e.target.value.trim());
    refreshDatalists();
  }

  if (e.target.id.includes("_style")) {
    saveAutocomplete("style_autocomplete", e.target.value.trim());
    refreshDatalists();
  }
});

function collectData() {
  const data = {
    stadium: document.getElementById("stadium").value,
    players: []
  };

  positions.forEach(pos => {
    data.players.push({
      id: pos.id,
      name: document.getElementById(pos.id + "_name").value,
      style: document.getElementById(pos.id + "_style").value
    });
  });

  return data;
}

function applyData(data) {
  document.getElementById("stadium").value = data.stadium || "";

  data.players.forEach(p => {
    document.getElementById(p.id + "_name").value = p.name || "";
    document.getElementById(p.id + "_style").value = p.style || "";
  });

  render();
}

function saveLocal() {
  localStorage.setItem("zzm_save", JSON.stringify(collectData()));
  alert("Saved locally");
}

function downloadTXT() {
  const blob = new Blob([JSON.stringify(collectData(), null, 2)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zone-zero-media.txt";
  a.click();
}

function loadTXT() {
  document.getElementById("txtLoader").click();
}

document.getElementById("txtLoader").addEventListener("change", e => {
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
  try {
    const a = document.createElement("a");
    a.download = "zone-zero-media.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  } catch (err) {
    debugLog("downloadImage failed", err?.message || err);
    alert("No se pudo descargar la imagen. Si el avatar vino sin CORS, el canvas se taintó.");
  }
}

async function reloadAvatars() {
  avatarCache.clear();

  positions.forEach(pos => {
    requestTokenByPos.set(pos.id, (requestTokenByPos.get(pos.id) || 0) + 1);
    setStatus(pos.id, "loading");
  });

  await render();
}

let sidebarOpen = false;

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById("sidebar").classList.toggle("open", sidebarOpen);
}

const local = localStorage.getItem("zzm_save");
if (local) {
  try {
    applyData(JSON.parse(local));
  } catch {}
}

render();