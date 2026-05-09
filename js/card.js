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

let layoutMode = false;

function loadLayout() {

  try {

    const raw =
      localStorage.getItem("zzm_card_layout");

    if (!raw)
      return structuredClone(defaultLayout);

    const data = JSON.parse(raw);

    return {

      avatar: {
        ...defaultLayout.avatar,
        ...(data.avatar || {})
      },

      badge: {
        ...defaultLayout.badge,
        ...(data.badge || {})
      },

      name: {
        ...defaultLayout.name,
        ...(data.name || {})
      },

      stats: {
        ...defaultLayout.stats,
        ...(data.stats || {})
      },

      showTemplate:
        data.showTemplate !== false,

      showOverlay:
        data.showOverlay !== false,

      showBorders:
        data.showBorders !== false

    };

  } catch {

    return structuredClone(defaultLayout);

  }

}

function saveLayout() {

  localStorage.setItem(
    "zzm_card_layout",
    JSON.stringify(layout)
  );

}

function toggleSidebar() {

  sidebarOpen = !sidebarOpen;

  if (window.innerWidth <= 900) {

    sidebar.style.transform =
      sidebarOpen
        ? "translateX(0)"
        : "translateX(-100%)";

  }

}

window.toggleSidebar = toggleSidebar;

function syncSidebar() {

  if (window.innerWidth > 900) {

    sidebar.style.transform = "translateX(0)";
    return;

  }

  sidebar.style.transform =
    sidebarOpen
      ? "translateX(0)"
      : "translateX(-100%)";

}

window.addEventListener(
  "resize",
  syncSidebar
);

syncSidebar();

function injectLayoutTools() {

  if (
    document.getElementById(
      "layoutTools"
    )
  ) return;

  const actions =
    document.querySelector(".actions");

  const wrap =
    document.createElement("div");

  wrap.id = "layoutTools";

  wrap.style.marginTop = "14px";

  wrap.innerHTML = `

<div style="
background:rgba(255,255,255,.04);
border:1px solid rgba(255,255,255,.08);
padding:14px;
border-radius:14px;
">

<button id="layoutModeBtn" style="width:100%;margin-bottom:10px;">
Enter Layout Mode
</button>

<label style="display:flex;gap:8px;margin:8px 0;font-size:13px;">
<input id="showTemplateChk" type="checkbox" ${layout.showTemplate ? "checked" : ""}>
Show Template
</label>

<label style="display:flex;gap:8px;margin:8px 0;font-size:13px;">
<input id="showOverlayChk" type="checkbox" ${layout.showOverlay ? "checked" : ""}>
Show Overlay
</label>

<label style="display:flex;gap:8px;margin:8px 0;font-size:13px;">
<input id="showBordersChk" type="checkbox" ${layout.showBorders ? "checked" : ""}>
Show Borders
</label>

<div style="margin-top:12px;">
<label style="font-size:13px;">Background URL</label>

<input
id="card_custom_bg"
placeholder="Imgur URL"
style="margin-top:6px;"
>
</div>

<button id="resetLayoutBtn" style="width:100%;margin-top:10px;">
Reset Layout
</button>

<div style="
margin-top:10px;
font-size:12px;
opacity:.7;
line-height:1.5;
">
Drag handles to move.<br>
Mouse wheel changes size.
</div>

</div>
`;

  actions.parentNode.insertBefore(
    wrap,
    actions
  );

  $("layoutModeBtn")
    .addEventListener(
      "click",
      () => {

        layoutMode =
          !layoutMode;

        $("layoutModeBtn").textContent =
          layoutMode
            ? "Exit Layout Mode"
            : "Enter Layout Mode";

        renderCard();

      }
    );

  $("showTemplateChk")
    .addEventListener(
      "change",
      e => {

        layout.showTemplate =
          e.target.checked;

        saveLayout();

        renderCard();

      }
    );

  $("showOverlayChk")
    .addEventListener(
      "change",
      e => {

        layout.showOverlay =
          e.target.checked;

        saveLayout();

        renderCard();

      }
    );

  $("showBordersChk")
    .addEventListener(
      "change",
      e => {

        layout.showBorders =
          e.target.checked;

        saveLayout();

        renderCard();

      }
    );

  $("resetLayoutBtn")
    .addEventListener(
      "click",
      () => {

        layout =
          structuredClone(
            defaultLayout
          );

        saveLayout();

        renderCard();

      }
    );

  const savedBG =
    localStorage.getItem(
      "zzm_card_bg"
    ) || "";

  $("card_custom_bg").value =
    savedBG;

  $("card_custom_bg")
    .addEventListener(
      "input",
      e => {

        localStorage.setItem(
          "zzm_card_bg",
          e.target.value
        );

        renderCard();

      }
    );

}

function roundedRect(
  x,
  y,
  w,
  h,
  r
) {

  ctx.beginPath();

  ctx.moveTo(x + r, y);

  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    r
  );

  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    r
  );

  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    r
  );

  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    r
  );

  ctx.closePath();

}

function hexToRGBA(
  hex,
  alpha
) {

  hex =
    String(hex)
      .replace("#", "");

  const r =
    parseInt(
      hex.slice(0, 2),
      16
    );

  const g =
    parseInt(
      hex.slice(2, 4),
      16
    );

  const b =
    parseInt(
      hex.slice(4, 6),
      16
    );

  return `rgba(${r},${g},${b},${alpha})`;

}

function emojiURL(text) {

  const match =
    String(text || "")
      .match(
        /<?a?:\w+:(\d+)>?/
      );

  if (!match)
    return null;

  return `https://cdn.discordapp.com/emojis/${match[1]}.png?size=256&quality=lossless`;

}

async function loadImage(
  src,
  retries = 4
) {

  return new Promise(resolve => {

    if (!src)
      return resolve(null);

    if (
      imageCache.has(src)
    ) {

      return resolve(
        imageCache.get(src)
      );

    }

    let tries = 0;

    const attempt = () => {

      tries++;

      const img =
        new Image();

      img.crossOrigin =
        "anonymous";

      img.onload = () => {

        imageCache.set(
          src,
          img
        );

        resolve(img);

      };

      img.onerror = () => {

        if (
          tries < retries
        ) {

          setTimeout(
            attempt,
            500
          );

        } else {

          resolve(null);

        }

      };

      img.src =
        src +
        (
          src.includes("?")
            ? "&"
            : "?"
        ) +
        "t=" +
        Date.now();

    };

    attempt();

  });

}

async function getUserId(
  username
) {

  const clean =
    String(username)
      .trim()
      .toLowerCase();

  if (!clean)
    return null;

  if (
    userIdCache.has(clean)
  ) {

    return userIdCache.get(
      clean
    );

  }

  try {

    const res =
      await fetch(
        ROBLOX_PROXY +
        encodeURIComponent(
          "https://users.roblox.com/v1/usernames/users"
        ),
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              usernames: [clean],
              excludeBannedUsers: false
            })
        }
      );

    const json =
      await res.json();

    const id =
      json?.data?.[0]?.id;

    if (!id)
      return null;

    userIdCache.set(
      clean,
      String(id)
    );

    return String(id);

  } catch {

    return null;

  }

}

async function getAvatar(
  username
) {

  const clean =
    String(username)
      .trim()
      .toLowerCase();

  if (!clean)
    return null;

  if (
    avatarCache.has(clean)
  ) {

    return avatarCache.get(
      clean
    );

  }

  const id =
    await getUserId(
      username
    );

  if (!id)
    return null;

  try {

    const res =
      await fetch(
        ROBLOX_PROXY +
        encodeURIComponent(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`
        )
      );

    const json =
      await res.json();

    const url =
      json?.data?.[0]
        ?.imageUrl;

    if (!url)
      return null;

    const img =
      await loadImage(url);

    if (!img)
      return null;

    avatarCache.set(
      clean,
      img
    );

    return img;

  } catch {

    return null;

  }

}

async function drawBackground() {

  const custom =
    localStorage.getItem(
      "zzm_card_bg"
    );

  const bg =
    await loadImage(
      custom || DEFAULT_BG
    );

  if (bg) {

    ctx.drawImage(
      bg,
      0,
      0,
      580,
      746
    );

  } else {

    ctx.fillStyle =
      "#07111e";

    ctx.fillRect(
      0,
      0,
      580,
      746
    );

  }

  if (
    layout.showOverlay
  ) {

    ctx.fillStyle =
      "rgba(0,0,0,.18)";

    ctx.fillRect(
      0,
      0,
      580,
      746
    );

  }

}

function drawText(
  text,
  x,
  y,
  size,
  color
) {

  ctx.save();

  ctx.font =
    `bold ${size}px Arial`;

  ctx.textAlign =
    "center";

  ctx.textBaseline =
    "middle";

  ctx.lineWidth = 7;

  ctx.strokeStyle =
    "rgba(0,0,0,.95)";

  ctx.fillStyle =
    color;

  ctx.strokeText(
    text,
    x,
    y
  );

  ctx.fillText(
    text,
    x,
    y
  );

  ctx.restore();

}

function drawHandle(
  x,
  y,
  label,
  color
) {

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    10,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    color;

  ctx.fill();

  ctx.strokeStyle =
    "white";

  ctx.lineWidth = 2;

  ctx.stroke();

  ctx.font =
    "bold 10px Arial";

  ctx.fillStyle =
    "white";

  ctx.textAlign =
    "center";

  ctx.fillText(
    label,
    x,
    y - 16
  );

}

async function renderCard() {

  const token =
    ++renderToken;

  ctx.clearRect(
    0,
    0,
    580,
    746
  );

  await drawBackground();

  if (
    token !== renderToken
  ) return;

  const color =
    $("card_color")
      .value ||
    "#00d9ff";

  const username =
    $("card_username")
      .value;

  const displayName =
    $("card_name")
      .value ||
    username ||
    "PLAYER";

  const avatarSize =
    208 *
    layout.avatar.scale;

  const avatarX =
    186 +
    layout.avatar.x;

  const avatarY =
    92 +
    layout.avatar.y;

  const badgeSize =
    64 *
    layout.badge.scale;

  const badgeX =
    64 +
    layout.badge.x;

  const badgeY =
    170 +
    layout.badge.y;

  const nameSize =
    34 *
    layout.name.scale;

  const nameX =
    290 +
    layout.name.x;

  const nameY =
    420 +
    layout.name.y;

  const statsScale =
    layout.stats.scale;

  const slotY =
    590 +
    layout.stats.y;

  const slotW =
    112 *
    statsScale;

  const slotH =
    110 *
    statsScale;

  const slotGap =
    18;

  const slotStart =
    32 +
    layout.stats.x;

  const avatar =
    await getAvatar(
      username
    );

  if (
    token !== renderToken
  ) return;

  if (
    layout.showBorders
  ) {

    ctx.save();

    ctx.shadowColor =
      hexToRGBA(
        color,
        .45
      );

    ctx.shadowBlur = 24;

    roundedRect(
      avatarX,
      avatarY,
      avatarSize,
      avatarSize,
      22
    );

    ctx.fillStyle =
      "rgba(0,0,0,.25)";

    ctx.fill();

    ctx.lineWidth = 3;

    ctx.strokeStyle =
      color;

    ctx.stroke();

    ctx.restore();

  }

  if (avatar) {

    ctx.save();

    roundedRect(
      avatarX + 6,
      avatarY + 6,
      avatarSize - 12,
      avatarSize - 12,
      18
    );

    ctx.clip();

    ctx.drawImage(
      avatar,
      avatarX + 6,
      avatarY + 6,
      avatarSize - 12,
      avatarSize - 12
    );

    ctx.restore();

  }

  const badge =
    emojiURL(
      $("card_badge")
        .value
    );

  if (badge) {

    const img =
      await loadImage(
        badge
      );

    if (img) {

      ctx.drawImage(
        img,
        badgeX,
        badgeY,
        badgeSize,
        badgeSize
      );

    }

  }

  drawText(
    displayName,
    nameX,
    nameY,
    nameSize,
    "white"
  );

  const stats = [

    ["DRI", $("dribbling").value, "PAS", $("passing").value],

    ["SHT", $("shooting").value, "DEF", $("defense").value],

    ["TMW", $("teamwork").value, "IND", $("individual").value],

    ["REA", $("reaction").value, "GEN", $("general").value]

  ];

  stats.forEach(
    (
      s,
      i
    ) => {

      const x =
        slotStart +
        (
          i *
          (
            slotW +
            slotGap
          )
        );

      if (
        layout.showBorders
      ) {

        roundedRect(
          x,
          slotY,
          slotW,
          slotH,
          16
        );

        ctx.fillStyle =
          "rgba(0,0,0,.24)";

        ctx.fill();

      }

      drawText(
        s[0],
        x + slotW / 2,
        slotY + 18,
        12 * statsScale,
        "rgba(255,255,255,.7)"
      );

      drawText(
        s[1] || "0",
        x + slotW / 2,
        slotY + 42,
        24 * statsScale,
        color
      );

      drawText(
        s[2],
        x + slotW / 2,
        slotY + 72,
        12 * statsScale,
        "rgba(255,255,255,.7)"
      );

      drawText(
        s[3] || "0",
        x + slotW / 2,
        slotY + 96,
        24 * statsScale,
        color
      );

    }
  );

  if (layoutMode) {

    drawHandle(
      avatarX +
      avatarSize / 2,
      avatarY +
      avatarSize / 2,
      "A",
      color
    );

    drawHandle(
      badgeX +
      badgeSize / 2,
      badgeY +
      badgeSize / 2,
      "B",
      color
    );

    drawHandle(
      nameX,
      nameY,
      "N",
      color
    );

    drawHandle(
      slotStart + 220,
      slotY + 55,
      "S",
      color
    );

  }

}

function getData() {

  return {

    username:
      $("card_username")
        .value,

    name:
      $("card_name")
        .value,

    badge:
      $("card_badge")
        .value,

    color:
      $("card_color")
        .value,

    customBG:
      localStorage.getItem(
        "zzm_card_bg"
      ) || "",

    dribbling:
      $("dribbling")
        .value,

    passing:
      $("passing")
        .value,

    shooting:
      $("shooting")
        .value,

    defense:
      $("defense")
        .value,

    teamwork:
      $("teamwork")
        .value,

    individual:
      $("individual")
        .value,

    reaction:
      $("reaction")
        .value,

    general:
      $("general")
        .value,

    layout

  };

}

function applyData(
  data
) {

  $("card_username").value =
    data.username || "";

  $("card_name").value =
    data.name || "";

  $("card_badge").value =
    data.badge || "";

  $("card_color").value =
    data.color || "#00d9ff";

  [
    "dribbling",
    "passing",
    "shooting",
    "defense",
    "teamwork",
    "individual",
    "reaction",
    "general"
  ].forEach(k => {

    $(k).value =
      data[k] || "";

  });

  if (
    data.customBG
  ) {

    localStorage.setItem(
      "zzm_card_bg",
      data.customBG
    );

  }

  if (
    data.layout
  ) {

    layout =
      data.layout;

    saveLayout();

  }

  renderCard();

}

function saveLocalCard() {

  localStorage.setItem(
    "zzm_card_save",
    JSON.stringify(
      getData()
    )
  );

  alert(
    "Saved locally"
  );

}

function downloadTXTCard() {

  const blob =
    new Blob(
      [
        JSON.stringify(
          getData(),
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
    document.createElement(
      "a"
    );

  a.href =
    URL.createObjectURL(
      blob
    );

  a.download =
    "zzm-card.txt";

  a.click();

}

function loadTXTCard() {

  $("txtLoader")
    .click();

}

$("txtLoader")
  .addEventListener(
    "change",
    e => {

      const file =
        e.target.files[0];

      if (!file)
        return;

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

      reader.readAsText(
        file
      );

    }
  );

function downloadImage() {

  const a =
    document.createElement(
      "a"
    );

  a.download =
    "zzm-card.png";

  a.href =
    canvas.toDataURL(
      "image/png"
    );

  a.click();

}

async function reloadAvatars() {

  avatarCache.clear();

  userIdCache.clear();

  imageCache.clear();

  await renderCard();

}

let drag = null;

function canvasPoint(
  e
) {

  const rect =
    canvas.getBoundingClientRect();

  return {

    x:
      (
        e.clientX -
        rect.left
      ) *
      (
        canvas.width /
        rect.width
      ),

    y:
      (
        e.clientY -
        rect.top
      ) *
      (
        canvas.height /
        rect.height
      )

  };

}

function handleHit(
  p
) {

  const handles = [

    {
      id: "avatar",
      x:
        186 +
        layout.avatar.x +
        (
          208 *
          layout.avatar.scale
        ) / 2,
      y:
        92 +
        layout.avatar.y +
        (
          208 *
          layout.avatar.scale
        ) / 2
    },

    {
      id: "badge",
      x:
        64 +
        layout.badge.x,
      y:
        170 +
        layout.badge.y
    },

    {
      id: "name",
      x:
        290 +
        layout.name.x,
      y:
        420 +
        layout.name.y
    },

    {
      id: "stats",
      x:
        280 +
        layout.stats.x,
      y:
        640 +
        layout.stats.y
    }

  ];

  return handles.find(
    h =>
      Math.hypot(
        p.x - h.x,
        p.y - h.y
      ) < 20
  );

}

canvas.style.touchAction =
  "none";

canvas.addEventListener(
  "pointerdown",
  e => {

    if (!layoutMode)
      return;

    const p =
      canvasPoint(e);

    const hit =
      handleHit(p);

    if (!hit)
      return;

    drag = {

      id: hit.id,

      start: p,

      layout:
        JSON.parse(
          JSON.stringify(
            layout
          )
        )

    };

  }
);

canvas.addEventListener(
  "pointermove",
  e => {

    if (!drag)
      return;

    const p =
      canvasPoint(e);

    const dx =
      p.x -
      drag.start.x;

    const dy =
      p.y -
      drag.start.y;

    layout =
      JSON.parse(
        JSON.stringify(
          drag.layout
        )
      );

    layout[
      drag.id
    ].x += dx;

    layout[
      drag.id
    ].y += dy;

    saveLayout();

    renderCard();

  }
);

canvas.addEventListener(
  "pointerup",
  () => {

    drag = null;

  }
);

canvas.addEventListener(
  "wheel",
  e => {

    if (
      !layoutMode
    ) return;

    const p =
      canvasPoint(e);

    const hit =
      handleHit(p);

    if (!hit)
      return;

    e.preventDefault();

    const dir =
      e.deltaY < 0
        ? .05
        : -.05;

    layout[
      hit.id
    ].scale =
      Math.max(
        .4,
        Math.min(
          3,
          (
            layout[
              hit.id
            ].scale || 1
          ) + dir
        )
      );

    saveLayout();

    renderCard();

  },
  {
    passive: false
  }
);

document.addEventListener(
  "input",
  () => {

    clearTimeout(
      renderCard._t
    );

    renderCard._t =
      setTimeout(
        renderCard,
        80
      );

  }
);

injectLayoutTools();

const local =
  localStorage.getItem(
    "zzm_card_save"
  );

if (local) {

  try {

    applyData(
      JSON.parse(local)
    );

  } catch {

    renderCard();

  }

} else {

  renderCard();

}