const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const defaultBG = "https://i.imgur.com/dRSz8QM.png";

const positions = [
  { id: "cf", x: 800, y: 165 },
  { id: "rw", x: 1300, y: 420 },
  { id: "cm", x: 800, y: 500 },
  { id: "lw", x: 370, y: 420 },
  { id: "gk", x: 800, y: 820 }
];

const players = document.getElementById("players");

const avatarCache = new Map();
const userIdCache = new Map();
const thumbUrlCache = new Map();
const loadingState = new Map();

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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadImage(src, retries = 5, timeoutMs = 8000, useAnonymous = true) {
  return new Promise(resolve => {
    if (!src) return resolve(null);

    let attempts = 0;
    let done = false;

    const tryLoad = () => {
      attempts++;

      const img = new Image();
      if (useAnonymous) img.crossOrigin = "anonymous";

      const timer = setTimeout(() => {
        if (done) return;
        done = true;

        if (attempts < retries) {
          setTimeout(() => {
            done = false;
            tryLoad();
          }, 500);
        } else {
          resolve(null);
        }
      }, timeoutMs);

      img.onload = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);

        if (attempts < retries) {
          setTimeout(() => {
            done = false;
            tryLoad();
          }, 500);
        } else {
          resolve(null);
        }
      };

      img.src = src + (src.includes("?") ? "&" : "?") + "t=" + Date.now() + "_" + attempts;
    };

    tryLoad();
  });
}

function setStatus(posId, state) {
  const el = document.getElementById(posId + "_status");
  if (!el) return;

  if (state === "loading") {
    el.innerHTML = `<span class="status loading"></span>`;
    return;
  }

  if (state === "success") {
    el.innerHTML = `<span class="status success">✓</span>`;
    return;
  }

  if (state === "error") {
    el.innerHTML = `<span class="status error">!</span>`;
    return;
  }

  el.innerHTML = `<span class="status idle"></span>`;
}

async function fetchRobloxUserId(username, retries = 4) {
  const clean = username.trim();
  if (!clean) return null;

  const key = clean.toLowerCase();
  if (userIdCache.has(key)) return userIdCache.get(key);

  const url = "https://users.roblox.com/v1/usernames/users";
  const body = JSON.stringify({
    usernames: [clean],
    excludeBannedUsers: false
  });

  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const json = await res.json();
      const item = Array.isArray(json?.data) ? json.data[0] : null;

      const userId = item?.id ?? item?.targetId ?? item?.userId ?? null;
      if (!userId) throw new Error("No userId");

      userIdCache.set(key, String(userId));
      return String(userId);
    } catch (err) {
      if (i < retries) await delay(450 * i);
    }
  }

  return null;
}

async function fetchRobloxThumbUrl(userId, retries = 6) {
  const key = String(userId);
  if (thumbUrlCache.has(key)) return thumbUrlCache.get(key);

  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(key)}&size=150x150&format=Png&isCircular=true`;

  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const json = await res.json();
      const item = Array.isArray(json?.data) ? json.data[0] : null;

      const state = item?.state;
      const imageUrl = item?.imageUrl || null;

      if (state === "Completed" && imageUrl) {
        thumbUrlCache.set(key, imageUrl);
        return imageUrl;
      }

      if (state === "Pending" || state === "InReview" || state === "Blocked") {
        await delay(500);
        continue;
      }
    } catch (err) {
      if (i < retries) await delay(450 * i);
    }
  }

  return null;
}

async function loadAvatarForUsername(username, posId) {
  const clean = username.trim();
  const key = clean.toLowerCase();

  if (!clean) {
    setStatus(posId, "idle");
    return null;
  }

  if (avatarCache.has(key)) {
    setStatus(posId, "success");
    return avatarCache.get(key);
  }

  const state = loadingState.get(posId) || { token: 0, username: "" };
  state.token += 1;
  state.username = key;
  loadingState.set(posId, state);

  const token = state.token;
  setStatus(posId, "loading");

  const userId = await fetchRobloxUserId(clean);
  if (loadingState.get(posId)?.token !== token) return null;

  if (!userId) {
    setStatus(posId, "error");
    return null;
  }

  const imageUrl = await fetchRobloxThumbUrl(userId);
  if (loadingState.get(posId)?.token !== token) return null;

  if (!imageUrl) {
    setStatus(posId, "error");
    return null;
  }

  let img = await loadImage(imageUrl, 4, 9000, true);
  if (loadingState.get(posId)?.token !== token) return null;

  if (!img) {
    img = await loadImage(imageUrl, 2, 9000, false);
    if (loadingState.get(posId)?.token !== token) return null;
  }

  if (!img) {
    setStatus(posId, "error");
    return null;
  }

  avatarCache.set(key, img);
  setStatus(posId, "success");
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

function drawBackground() {
  return loadImage(document.getElementById("stadium").value.trim() || defaultBG, 3, 10000, true)
    .then(bg => {
      if (bg) {
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    });
}

async function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await drawBackground();

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

    if (name) {
      const key = name.toLowerCase();
      const cached = avatarCache.get(key);

      if (cached) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 75, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        try {
          ctx.drawImage(cached, pos.x - 75, pos.y - 75, 150, 150);
        } catch {}
        ctx.restore();
      } else {
        loadAvatarForUsername(name, pos.id).then(() => {
          render();
        });
      }
    } else {
      setStatus(pos.id, "idle");
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

document.addEventListener("input", e => {
  clearTimeout(renderTimeout);

  renderTimeout = setTimeout(() => {
    render();
  }, 300);
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
  } catch {
    alert("No se pudo descargar la imagen.");
  }
}

async function reloadAvatars() {
  avatarCache.clear();
  userIdCache.clear();
  thumbUrlCache.clear();

  positions.forEach(pos => {
    loadingState.set(pos.id, { token: (loadingState.get(pos.id)?.token || 0) + 1, username: "" });
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