const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");

const COLORS = {
  grid: "#e6e4de",
  axis: "#cfccc4",
  reach: "#2a78d6",
  link1: "#e8742c",
  link2: "#c95a17",
  joint: "#2b2b29",
  target: "#2a78d6",
  warn: "#d03b3b",
};

const arm = { l1: 160, l2: 120 };

let useSliders = false;
let flip = false;
let mouse = null;
let joints = { t1: 1, t2: -1.6 };
let reachable = true;

// screen size and how many pixels one mm takes up
let width, height, scale;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1; // keeps it sharp on high res screens
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  width = rect.width;
  height = rect.height;
  scale = (Math.min(width, height) * 0.46) / 400; // 400 mm = longest the arm can get
}

// the arm uses mm with y going up, the screen uses pixels with y going down
function toScreen(p) {
  return { x: width / 2 + p.x * scale, y: height / 2 - p.y * scale };
}

function toWorld(sx, sy) {
  return { x: (sx - width / 2) / scale, y: (height / 2 - sy) / scale };
}

function toDegrees(r) {
  let d = (r * 180) / Math.PI;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function idlePoint(time) {
  const r = (arm.l1 + arm.l2) * 0.7;
  return { x: r * Math.cos(time * 0.6), y: r * 0.45 * Math.sin(time * 1.2) + r * 0.3 };
}

function update(time) {
  if (useSliders) {
    // forward kinematics: the sliders set angles directly
    joints.t1 = (document.getElementById("j1").value * Math.PI) / 180;
    joints.t2 = (document.getElementById("j2").value * Math.PI) / 180;
    reachable = true;
  } else {
    // inverse kinematics: work out angles that reach the mouse
    const target = mouse || idlePoint(time);
    const result = inverse(arm, target.x, target.y, flip);
    joints = { t1: result.t1, t2: result.t2 };
    reachable = result.reachable || !mouse;

    // keep sliders showing where the arm is
    document.getElementById("j1").value = Math.round(toDegrees(joints.t1));
    document.getElementById("j2").value = Math.round(toDegrees(joints.t2));
    updateLabels();
  }
}

function drawLine(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawCircle(p, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrid() {
  const step = 50 * scale; // a line every 50 mm
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = (width / 2) % step; x < width; x += step) {
    drawLine({ x, y: 0 }, { x, y: height });
  }
  for (let y = (height / 2) % step; y < height; y += step) {
    drawLine({ x: 0, y }, { x: width, y });
  }

  ctx.strokeStyle = COLORS.axis;
  drawLine({ x: 0, y: height / 2 }, { x: width, y: height / 2 });
  drawLine({ x: width / 2, y: 0 }, { x: width / 2, y: height });
}

function drawReach() {
  const center = toScreen({ x: 0, y: 0 });
  ctx.strokeStyle = COLORS.reach;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, (arm.l1 + arm.l2) * scale, 0, Math.PI * 2);
  ctx.stroke();
}

function drawArm() {
  const { elbow, tip } = forward(arm, joints.t1, joints.t2);
  const base = toScreen({ x: 0, y: 0 });
  const e = toScreen(elbow);
  const t = toScreen(tip);

  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.link1;
  ctx.lineWidth = 20;
  drawLine(base, e);

  ctx.strokeStyle = COLORS.link2;
  ctx.lineWidth = 14;
  drawLine(e, t);

  drawCircle(base, 11, COLORS.joint);
  drawCircle(e, 8, COLORS.joint);
  drawCircle(t, 5, COLORS.joint);
}

function drawTarget() {
  if (!mouse || useSliders) return;
  const s = toScreen(mouse);
  ctx.strokeStyle = reachable ? COLORS.target : COLORS.warn;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  drawGrid();
  drawReach();
  drawArm();
  drawTarget();
}

function updateReadout() {
  const tip = forward(arm, joints.t1, joints.t2).tip;
  document.getElementById("r-t1").textContent = toDegrees(joints.t1).toFixed(1) + "°";
  document.getElementById("r-t2").textContent = toDegrees(joints.t2).toFixed(1) + "°";
  document.getElementById("r-x").textContent = tip.x.toFixed(0);
  document.getElementById("r-y").textContent = tip.y.toFixed(0);

  const status = document.getElementById("r-status");
  status.textContent = reachable ? "" : "Out of reach";
  status.className = reachable ? "status" : "status warn";
}

// runs every frame 60 times/sec
function loop(ms) {
  update(ms / 1000);
  draw();
  updateReadout();
  requestAnimationFrame(loop);
}

function updateLabels() {
  document.getElementById("o-l1").textContent = arm.l1 + " mm";
  document.getElementById("o-l2").textContent = arm.l2 + " mm";
  document.getElementById("o-j1").textContent = document.getElementById("j1").value + "°";
  document.getElementById("o-j2").textContent = document.getElementById("j2").value + "°";
}

canvas.addEventListener("pointermove", (ev) => {
  const rect = canvas.getBoundingClientRect();
  mouse = toWorld(ev.clientX - rect.left, ev.clientY - rect.top);
  useSliders = false;
  document.getElementById("hint").style.opacity = 0;
});

document.getElementById("l1").addEventListener("input", (ev) => {
  arm.l1 = Number(ev.target.value);
  updateLabels();
});

document.getElementById("l2").addEventListener("input", (ev) => {
  arm.l2 = Number(ev.target.value);
  updateLabels();
});

function slidersMoved() {
  useSliders = true;
  updateLabels();
}

document.getElementById("j1").addEventListener("input", slidersMoved);
document.getElementById("j2").addEventListener("input", slidersMoved);

document.getElementById("flip").addEventListener("change", (ev) => {
  flip = ev.target.checked;
});

window.addEventListener("resize", resize);

resize();
updateLabels();
requestAnimationFrame(loop);