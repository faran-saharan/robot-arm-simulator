// Angles are in radians. t1 = shoulder angle from the x axis,
// t2 = elbow angle measured from where link 1 is pointing.

function forward(arm, t1, t2) {
  const elbow = {
    x: arm.l1 * Math.cos(t1),
    y: arm.l1 * Math.sin(t1),
  };
  const tip = {
    x: elbow.x + arm.l2 * Math.cos(t1 + t2),
    y: elbow.y + arm.l2 * Math.sin(t1 + t2),
  };
  return { elbow, tip };
}

function reach(arm) {
  return { min: Math.abs(arm.l1 - arm.l2), max: arm.l1 + arm.l2 };
}

// every point can be reached with the elbow bent either way, flip picks the other one
function inverse(arm, x, y, flip = false) {
  const { l1, l2 } = arm;
  const { min, max } = reach(arm);

  let dist = Math.hypot(x, y);
  const reachable = dist >= min && dist <= max;

  // target right on the shoulder, otherwise we divide by 0 below
  if (dist === 0) {
    x = 1;
    dist = 1;
  }

  // out of reach: aim for the closest point it can actually get to
  const d = Math.min(Math.max(dist, min), max);
  x = (x / dist) * d;
  y = (y / dist) * d;

  // law of cosines
  let c = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  c = Math.min(1, Math.max(-1, c)); // rounding can push it slightly past 1
  const t2 = flip ? Math.acos(c) : -Math.acos(c);

  // point at the target, then take off the extra angle the bent elbow adds
  const t1 = Math.atan2(y, x) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));

  return { t1, t2, reachable };
}

// so the test file can use these too
if (typeof module !== "undefined") {
  module.exports = { forward, inverse, reach };
}