const pvpCanvas = document.getElementById("pvpCanvas");
const pvpCtx = pvpCanvas.getContext("2d");

const PVP_WIDTH = 1152;
const PVP_HEIGHT = 648;

const VS_IMAGE = "https://i.imgur.com/DOys6I4.png";

const pvpAvatarCache = new Map();
const pvpUserCache = new Map();
const pvpThumbCache = new Map();
const pvpLoading = new Map();

function pvpGet(id) {
  return document.getElementById(id);
}

function pvpDelay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function pvpRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function pvpHash(str) {
  let h = 0;

  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }

  return Math.abs(h);
}

function pvpPalette(seed) {
  const hue = pvpHash(seed || "?") % 360;

  return {
    main: `hsl(${hue},85%,60%)`,
    glow: `hsla(${hue},85%,60%,0.45)`,
    dark: `hsla(${hue},85%,20%,0.85)`
  };
}

function pvpSetStatus(id, state) {
  const el = pvpGet(id);

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

async function pvpLoadImage(src, retries = 5) {
  return new Promise(resolve => {
    if (!src) return resolve(null);

    let tries = 0;

    const tryLoad = () => {
      tries++;

      const img = new Image();

      img.crossOrigin = "anonymous";

      const timeout = setTimeout(() => {
        if (tries >= retries) {
          resolve(null);
        } else {
          setTimeout(tryLoad, 500);
        }
      }, 8000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeout);

        if (tries >= retries) {
          resolve(null);
        } else {
          setTimeout(tryLoad, 500);
        }
      };

      img.src =
        src +
        (src.includes("?") ? "&" : "?") +
        "t=" +
        Date.now() +
        "_" +
        tries;
    };

    tryLoad();
  });
}

async function pvpGetUserId(username) {
  const clean = username.trim().toLowerCase();

  if (!clean) return null;

  if (pvpUserCache.has(clean)) {
    return pvpUserCache.get(clean);
  }

  try {
    const res = await fetch(
      "https://users.roblox.com/v1/usernames/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: false
        })
      }
    );

    const json = await res.json();

    const id = json?.data?.[0]?.id;

    if (!id) return null;

    pvpUserCache.set(clean, String(id));

    return String(id);

  } catch {
    return null;
  }
}

async function pvpGetAvatarUrl(username) {
  const clean = username.trim().toLowerCase();

  if (!clean) return null;

  if (pvpThumbCache.has(clean)) {
    return pvpThumbCache.get(clean);
  }

  const userId = await pvpGetUserId(username);

  if (!userId) return null;

  try {

    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`
    );

    const json = await res.json();

    const url = json?.data?.[0]?.imageUrl;

    if (!url) return null;

    pvpThumbCache.set(clean, url);

    return url;

  } catch {
    return null;
  }
}

async function pvpLoadAvatar(username, statusId) {

  const clean = username.trim().toLowerCase();

  if (!clean) return null;

  if (pvpAvatarCache.has(clean)) {
    pvpSetStatus(statusId, "success");
    return pvpAvatarCache.get(clean);
  }

  pvpSetStatus(statusId, "loading");

  const avatarUrl = await pvpGetAvatarUrl(username);

  if (!avatarUrl) {
    pvpSetStatus(statusId, "error");
    return null;
  }

  const img = await pvpLoadImage(avatarUrl, 6);

  if (!img) {
    pvpSetStatus(statusId, "error");
    return null;
  }

  pvpAvatarCache.set(clean, img);

  pvpSetStatus(statusId, "success");

  return img;
}

function pvpFitFont(text, maxWidth, start) {
  let size = start;

  while (size > 8) {

    pvpCtx.font = `bold ${size}px Arial`;

    if (pvpCtx.measureText(text).width <= maxWidth) {
      return size;
    }

    size--;
  }

  return size;
}

function pvpText(text, x, y, maxWidth, startSize, fill, stroke, line) {

  const size = pvpFitFont(text, maxWidth, startSize);

  pvpCtx.font = `bold ${size}px Arial`;

  pvpCtx.textAlign = "center";
  pvpCtx.textBaseline = "middle";

  pvpCtx.lineWidth = line;
  pvpCtx.strokeStyle = stroke;
  pvpCtx.fillStyle = fill;

  pvpCtx.strokeText(text, x, y);
  pvpCtx.fillText(text, x, y);
}

async function pvpDrawPlayer({
  username,
  displayName,
  x,
  color1,
  color2,
  statusId
}) {

  const avatar = await pvpLoadAvatar(username, statusId);

  const palette = {
    main: color1 || pvpPalette(username).main,
    glow: color2 || pvpPalette(username).glow
  };

  const boxW = 360;
  const boxH = 440;

  const boxX = x - boxW / 2;
  const boxY = 90;

  pvpCtx.save();

  pvpCtx.shadowColor = palette.glow;
  pvpCtx.shadowBlur = 35;

  pvpRoundedRect(
    pvpCtx,
    boxX,
    boxY,
    boxW,
    boxH,
    26
  );

  pvpCtx.fillStyle = "rgba(255,255,255,0.03)";
  pvpCtx.fill();

  pvpCtx.lineWidth = 2;
  pvpCtx.strokeStyle = "rgba(255,255,255,0.08)";
  pvpCtx.stroke();

  pvpCtx.restore();

  if (avatar) {

    const size = 360;

    pvpCtx.drawImage(
      avatar,
      x - size / 2,
      140,
      size,
      size
    );
  }

  const grad = pvpCtx.createLinearGradient(
    x - 120,
    525,
    x + 120,
    525
  );

  grad.addColorStop(0, color1 || "#ffffff");
  grad.addColorStop(1, color2 || "#888888");

  pvpCtx.fillStyle = grad;

  pvpCtx.fillRect(
    x - 120,
    520,
    240,
    12
  );

  pvpText(
    displayName,
    x,
    70,
    340,
    42,
    "white",
    "rgba(0,0,0,.95)",
    9
  );
}

async function pvpRender() {

  pvpCtx.clearRect(
    0,
    0,
    PVP_WIDTH,
    PVP_HEIGHT
  );

  pvpCtx.fillStyle = "#1b1b1b";
  pvpCtx.fillRect(
    0,
    0,
    PVP_WIDTH,
    PVP_HEIGHT
  );

  const bgUrl = pvpGet("pvp_background").value.trim();

  if (bgUrl) {

    const bg = await pvpLoadImage(bgUrl, 3);

    if (bg) {

      pvpCtx.drawImage(
        bg,
        0,
        0,
        PVP_WIDTH,
        PVP_HEIGHT
      );

      pvpCtx.fillStyle = "rgba(0,0,0,.55)";
      pvpCtx.fillRect(
        0,
        0,
        PVP_WIDTH,
        PVP_HEIGHT
      );
    }
  }

  const leftNick = pvpGet("pvp_left_nick").value.trim();
  const rightNick = pvpGet("pvp_right_nick").value.trim();

  const leftName =
    pvpGet("pvp_left_name").value.trim() ||
    leftNick ||
    "Player 1";

  const rightName =
    pvpGet("pvp_right_name").value.trim() ||
    rightNick ||
    "Player 2";

  const score =
    pvpGet("pvp_score").value.trim() ||
    "0-0";

  const leftColor1 = pvpGet("pvp_left_color1").value;
  const leftColor2 = pvpGet("pvp_left_color2").value;

  const rightColor1 = pvpGet("pvp_right_color1").value;
  const rightColor2 = pvpGet("pvp_right_color2").value;

  await pvpDrawPlayer({
    username: leftNick,
    displayName: leftName,
    x: 250,
    color1: leftColor1,
    color2: leftColor2,
    statusId: "pvp_left_status"
  });

  await pvpDrawPlayer({
    username: rightNick,
    displayName: rightName,
    x: 902,
    color1: rightColor1,
    color2: rightColor2,
    statusId: "pvp_right_status"
  });

  const vs = await pvpLoadImage(VS_IMAGE, 3);

  if (vs) {

    pvpCtx.save();

    pvpCtx.shadowColor = "rgba(255,0,0,.45)";
    pvpCtx.shadowBlur = 30;

    pvpCtx.drawImage(
      vs,
      PVP_WIDTH / 2 - 110,
      PVP_HEIGHT / 2 - 110,
      220,
      220
    );

    pvpCtx.restore();
  }

  pvpText(
    score,
    PVP_WIDTH / 2,
    590,
    320,
    105,
    "white",
    "rgba(0,0,0,.95)",
    10
  );

  pvpCtx.fillStyle = "rgba(255,255,255,.04)";
  pvpCtx.fillRect(
    0,
    0,
    PVP_WIDTH,
    PVP_HEIGHT
  );
}

function pvpCollectData() {

  return {

    background: pvpGet("pvp_background").value,

    leftNick: pvpGet("pvp_left_nick").value,
    rightNick: pvpGet("pvp_right_nick").value,

    leftName: pvpGet("pvp_left_name").value,
    rightName: pvpGet("pvp_right_name").value,

    leftColor1: pvpGet("pvp_left_color1").value,
    leftColor2: pvpGet("pvp_left_color2").value,

    rightColor1: pvpGet("pvp_right_color1").value,
    rightColor2: pvpGet("pvp_right_color2").value,

    score: pvpGet("pvp_score").value
  };
}

function pvpApplyData(data) {

  pvpGet("pvp_background").value =
    data.background || "";

  pvpGet("pvp_left_nick").value =
    data.leftNick || "";

  pvpGet("pvp_right_nick").value =
    data.rightNick || "";

  pvpGet("pvp_left_name").value =
    data.leftName || "";

  pvpGet("pvp_right_name").value =
    data.rightName || "";

  pvpGet("pvp_left_color1").value =
    data.leftColor1 || "#3b82f6";

  pvpGet("pvp_left_color2").value =
    data.leftColor2 || "#ffffff";

  pvpGet("pvp_right_color1").value =
    data.rightColor1 || "#ef4444";

  pvpGet("pvp_right_color2").value =
    data.rightColor2 || "#ffffff";

  pvpGet("pvp_score").value =
    data.score || "0-0";

  pvpRender();
}

function pvpSaveLocal() {

  localStorage.setItem(
    "zzm_pvp_save",
    JSON.stringify(
      pvpCollectData()
    )
  );

  alert("PVP saved");
}

function pvpDownloadTXT() {

  const blob = new Blob(
    [
      JSON.stringify(
        pvpCollectData(),
        null,
        2
      )
    ],
    {
      type: "text/plain"
    }
  );

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);

  a.download = "team-pvp.txt";

  a.click();
}

function pvpLoadTXT() {
  pvpGet("txtLoader").click();
}

document
.getElementById("txtLoader")
.addEventListener("change", e => {

  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {

    try {

      const data =
        JSON.parse(reader.result);

      if (
        data.leftNick !== undefined ||
        data.rightNick !== undefined
      ) {

        pvpApplyData(data);

      }

    } catch {
      alert("Invalid file");
    }

  };

  reader.readAsText(file);

});

function pvpDownloadImage() {

  const a = document.createElement("a");

  a.download = "team-pvp.png";

  a.href =
    pvpCanvas.toDataURL("image/png");

  a.click();
}

async function pvpReloadAvatars() {

  pvpAvatarCache.clear();
  pvpUserCache.clear();
  pvpThumbCache.clear();

  pvpSetStatus(
    "pvp_left_status",
    "loading"
  );

  pvpSetStatus(
    "pvp_right_status",
    "loading"
  );

  await pvpRender();
}

let pvpTimeout;

document.addEventListener("input", e => {

  if (!e.target.closest(".pvp-page")) {
    return;
  }

  clearTimeout(pvpTimeout);

  pvpTimeout = setTimeout(() => {
    pvpRender();
  }, 250);

});

const pvpLocal =
  localStorage.getItem("zzm_pvp_save");

if (pvpLocal) {

  try {

    pvpApplyData(
      JSON.parse(pvpLocal)
    );

  } catch {}
}

pvpRender();