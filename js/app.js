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
const loadingState = new Map();

const ROBLOX_PROXY = "https://corsproxy.io/?";

function getSaved(type) {
  return JSON.parse(localStorage.getItem(type) || "[]");
}

function saveAutocomplete(type, value) {

  if (!value || value.length < 2) return;

  let data = getSaved(type);

  data = data.filter(
    v => v.toLowerCase() !== value.toLowerCase()
  );

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

  document
    .querySelectorAll("datalist")
    .forEach(v => v.remove());

  createDatalist(
    "nicklist",
    getSaved("nick_autocomplete")
  );

  createDatalist(
    "stylelist",
    getSaved("style_autocomplete")
  );
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

<label class="color-label">
Player Color
</label>

<input
type="color"
id="${pos.id}_color"
value="#00d9ff"
>
`;

  players.appendChild(div);

});

const globalColorInput =
document.getElementById("globalColor");

const useGlobalColor =
document.getElementById("useGlobalColor");

globalColorInput.addEventListener(
  "input",
  () => {

    if (useGlobalColor.checked) {

      positions.forEach(pos => {

        document.getElementById(
          pos.id + "_color"
        ).value =
          globalColorInput.value;

      });

    }

    render();
  }
);

useGlobalColor.addEventListener(
  "change",
  () => {

    if (useGlobalColor.checked) {

      positions.forEach(pos => {

        document.getElementById(
          pos.id + "_color"
        ).value =
          globalColorInput.value;

      });

    }

    render();
  }
);

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

async function loadImage(src, retries = 5) {

  return new Promise(resolve => {

    if (!src) return resolve(null);

    let tries = 0;

    function attempt() {

      tries++;

      const img = new Image();

      img.crossOrigin = "anonymous";

      img.onload = () => {
        resolve(img);
      };

      img.onerror = () => {

        if (tries < retries) {

          setTimeout(attempt, 700);

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

function setStatus(posId, state) {

  const el =
    document.getElementById(posId + "_status");

  if (!el) return;

  if (state === "loading") {

    el.innerHTML =
      `<span class="status loading"></span>`;

    return;
  }

  if (state === "success") {

    el.innerHTML =
      `<span class="status success">✓</span>`;

    return;
  }

  if (state === "error") {

    el.innerHTML =
      `<span class="status error">!</span>`;

    return;
  }

  el.innerHTML =
    `<span class="status idle"></span>`;
}

async function fetchUserId(username) {

  const clean = username.trim();

  if (!clean) return null;

  const key = clean.toLowerCase();

  if (userIdCache.has(key)) {
    return userIdCache.get(key);
  }

  try {

    const res = await fetch(
      ROBLOX_PROXY +
      encodeURIComponent(
        "https://users.roblox.com/v1/usernames/users"
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          usernames: [clean],
          excludeBannedUsers: false
        })
      }
    );

    const json = await res.json();

    const data = json?.data?.[0];

    if (!data?.id) {
      return null;
    }

    const id = String(data.id);

    userIdCache.set(key, id);

    return id;

  } catch {

    return null;

  }
}

async function fetchAvatar(username, posId) {

  const clean = username.trim();

  if (!clean) {
    setStatus(posId, "idle");
    return null;
  }

  const key = clean.toLowerCase();

  if (avatarCache.has(key)) {

    setStatus(posId, "success");

    return avatarCache.get(key);

  }

  setStatus(posId, "loading");

  const state =
    loadingState.get(posId) || {
      token: 0
    };

  state.token++;

  loadingState.set(posId, state);

  const token = state.token;

  try {

    const userId =
      await fetchUserId(clean);

    if (
      loadingState.get(posId)?.token !== token
    ) {
      return null;
    }

    if (!userId) {

      setStatus(posId, "error");

      return null;
    }

    let imageUrl = null;

    for (let i = 0; i < 7; i++) {

      const url =
        ROBLOX_PROXY +
        encodeURIComponent(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
        );

      const res = await fetch(url);

      const json = await res.json();

      const item = json?.data?.[0];

      if (
        item?.state === "Completed" &&
        item?.imageUrl
      ) {

        imageUrl = item.imageUrl;

        break;

      }

      await delay(700);

    }

    if (
      loadingState.get(posId)?.token !== token
    ) {
      return null;
    }

    if (!imageUrl) {

      setStatus(posId, "error");

      return null;
    }

    const img =
      await loadImage(imageUrl, 5);

    if (
      loadingState.get(posId)?.token !== token
    ) {
      return null;
    }

    if (!img) {

      setStatus(posId, "error");

      return null;
    }

    avatarCache.set(key, img);

    setStatus(posId, "success");

    return img;

  } catch {

    setStatus(posId, "error");

    return null;

  }
}

function hexToRGBA(hex, alpha) {

  hex = hex.replace("#", "");

  const r =
    parseInt(hex.substring(0, 2), 16);

  const g =
    parseInt(hex.substring(2, 4), 16);

  const b =
    parseInt(hex.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

function getPlayerColor(posId, seed) {

  const customColor =
    document.getElementById(posId + "_color").value;

  return {
    main: customColor,
    glow: hexToRGBA(customColor, .35)
  };
}

async function drawBackground() {

  const bg =
    await loadImage(
      document
        .getElementById("stadium")
        .value
        .trim() || defaultBG,
      3
    );

  if (bg) {

    ctx.drawImage(
      bg,
      0,
      0,
      canvas.width,
      canvas.height
    );

  } else {

    ctx.fillStyle = "#111";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

  }
}

async function render() {

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  await drawBackground();

  for (const pos of positions) {

    const name =
      document
        .getElementById(pos.id + "_name")
        .value
        .trim();

    const style =
      document
        .getElementById(pos.id + "_style")
        .value
        .trim();

    const palette =
      getPlayerColor(
        pos.id,
        name + style
      );

    ctx.save();

    ctx.shadowColor =
      palette.glow;

    ctx.shadowBlur = 35;

    ctx.beginPath();

    ctx.arc(
      pos.x,
      pos.y,
      92,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(255,255,255,.06)";

    ctx.fill();

    ctx.restore();

    if (name) {

      const key =
        name.toLowerCase();

      const cached =
        avatarCache.get(key);

      if (cached) {

        ctx.save();

        ctx.beginPath();

        ctx.arc(
          pos.x,
          pos.y,
          75,
          0,
          Math.PI * 2
        );

        ctx.closePath();

        ctx.clip();

        ctx.drawImage(
          cached,
          pos.x - 75,
          pos.y - 75,
          150,
          150
        );

        ctx.restore();

      } else {

        fetchAvatar(
          name,
          pos.id
        ).then(() => {
          render();
        });

      }

    } else {

      setStatus(pos.id, "idle");

    }

    ctx.beginPath();

    ctx.arc(
      pos.x,
      pos.y,
      80,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      palette.main;

    ctx.lineWidth = 5;

    ctx.stroke();

    ctx.beginPath();

    ctx.arc(
      pos.x,
      pos.y,
      88,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      "rgba(255,255,255,.15)";

    ctx.lineWidth = 2;

    ctx.stroke();

    roundedRect(
      pos.x + 60,
      pos.y - 40,
      170,
      48,
      14
    );

    ctx.fillStyle =
      palette.main;

    ctx.fill();

    ctx.fillStyle = "white";

    ctx.font =
      "bold 22px Arial";

    ctx.textAlign =
      "center";

    ctx.fillText(
      (style || "Style")
        .slice(0, 14),
      pos.x + 145,
      pos.y - 10
    );

    const nameW =
      Math.max(
        120,
        ctx.measureText(
          name || "?"
        ).width + 40
      );

    roundedRect(
      pos.x - nameW / 2,
      pos.y + 100,
      nameW,
      50,
      14
    );

    ctx.fillStyle =
      "rgba(0,0,0,.65)";

    ctx.fill();

    ctx.strokeStyle =
      palette.main;

    ctx.lineWidth = 2;

    ctx.stroke();

    ctx.fillStyle =
      "white";

    ctx.font =
      "bold 28px Arial";

    ctx.fillText(
      (name || "?")
        .slice(0, 16),
      pos.x,
      pos.y + 133
    );
  }
}

let renderTimeout;

document.addEventListener(
  "input",
  () => {

    clearTimeout(renderTimeout);

    renderTimeout =
      setTimeout(() => {
        render();
      }, 100);

  }
);

document.addEventListener(
  "change",
  e => {

    if (
      e.target.id.includes("_name")
    ) {

      saveAutocomplete(
        "nick_autocomplete",
        e.target.value.trim()
      );

      refreshDatalists();
    }

    if (
      e.target.id.includes("_style")
    ) {

      saveAutocomplete(
        "style_autocomplete",
        e.target.value.trim()
      );

      refreshDatalists();
    }

  }
);

function collectData() {

  const data = {
    stadium:
      document.getElementById(
        "stadium"
      ).value,

    globalColor:
      document.getElementById(
        "globalColor"
      ).value,

    useGlobalColor:
      document.getElementById(
        "useGlobalColor"
      ).checked,

    players: []
  };

  positions.forEach(pos => {

    data.players.push({
      id: pos.id,

      name:
        document.getElementById(
          pos.id + "_name"
        ).value,

      style:
        document.getElementById(
          pos.id + "_style"
        ).value,

      color:
        document.getElementById(
          pos.id + "_color"
        ).value
    });

  });

  return data;
}

function applyData(data) {

  document.getElementById(
    "stadium"
  ).value =
    data.stadium || "";

  document.getElementById(
    "globalColor"
  ).value =
    data.globalColor || "#00d9ff";

  document.getElementById(
    "useGlobalColor"
  ).checked =
    data.useGlobalColor !== false;

  data.players.forEach(p => {

    document.getElementById(
      p.id + "_name"
    ).value =
      p.name || "";

    document.getElementById(
      p.id + "_style"
    ).value =
      p.style || "";

    document.getElementById(
      p.id + "_color"
    ).value =
      p.color || "#00d9ff";

  });

  render();
}

function saveLocal() {

  localStorage.setItem(
    "zzm_save",
    JSON.stringify(
      collectData()
    )
  );

  alert("Saved locally");
}

function downloadTXT() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          collectData(),
          null,
          2
        )
      ],
      {
        type:
          "text/plain"
      }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "zone-zero-media.txt";

  a.click();
}

function loadTXT() {

  document
    .getElementById("txtLoader")
    .click();
}

document
  .getElementById("txtLoader")
  .addEventListener(
    "change",
    e => {

      const file =
        e.target.files[0];

      if (!file) return;

      const reader =
        new FileReader();

      reader.onload =
        () => {

          try {

            applyData(
              JSON.parse(
                reader.result
              )
            );

          } catch {

            alert(
              "Invalid file"
            );

          }

        };

      reader.readAsText(file);

    }
  );

function downloadImage() {

  try {

    const a =
      document.createElement("a");

    a.download =
      "zone-zero-media.png";

    a.href =
      canvas.toDataURL(
        "image/png"
      );

    a.click();

  } catch {

    alert(
      "No se pudo descargar la imagen."
    );

  }
}

async function reloadAvatars() {

  avatarCache.clear();

  userIdCache.clear();

  positions.forEach(pos => {

    setStatus(
      pos.id,
      "loading"
    );

  });

  await render();
}

let sidebarOpen = false;

function toggleSidebar() {

  sidebarOpen =
    !sidebarOpen;

  document
    .getElementById("sidebar")
    .classList.toggle(
      "open",
      sidebarOpen
    );
}

const local =
  localStorage.getItem(
    "zzm_save"
  );

if (local) {

  try {

    applyData(
      JSON.parse(local)
    );

  } catch {}

}

render();