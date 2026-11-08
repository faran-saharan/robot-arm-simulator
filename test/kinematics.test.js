const test = require("node:test");
const assert = require("node:assert");
const { forward, inverse, reach } = require("../js/kinematics.js");

const arm = { l1: 160, l2: 120 };

// numbers with decimals are never exactly equal, so check they're very close
function close(a, b) {
  assert.ok(Math.abs(a - b) < 1e-6, `${a} is not ${b}`);
}

test("forward: straight arm along x", () => {
  const { elbow, tip } = forward(arm, 0, 0);
  close(elbow.x, 160);
  close(tip.x, 280);
  close(tip.y, 0);
});

test("forward: elbow bent 90 degrees", () => {
  const { tip } = forward(arm, 0, Math.PI / 2);
  close(tip.x, 160);
  close(tip.y, 120);
});

test("inverse puts the tip where we asked, with the elbow either way", () => {
  const points = [[200, 50], [-120, 180], [0, -250], [60, 30], [-200, -100]];
  for (const [x, y] of points) {
    for (const flip of [false, true]) {
      const j = inverse(arm, x, y, flip);
      const { tip } = forward(arm, j.t1, j.t2);
      assert.ok(j.reachable);
      close(tip.x, x);
      close(tip.y, y);
    }
  }
});

test("flipping the elbow mirrors the elbow angle", () => {
  const a = inverse(arm, 200, 0, false);
  const b = inverse(arm, 200, 0, true);
  close(a.t2, -b.t2);
});

test("too far away: stretches straight out toward the target", () => {
  const j = inverse(arm, 1000, 1000);
  const { tip } = forward(arm, j.t1, j.t2);
  assert.strictEqual(j.reachable, false);
  close(Math.hypot(tip.x, tip.y), 280);
});

test("too close: stops at the inner edge", () => {
  const j = inverse(arm, 10, 0);
  const { tip } = forward(arm, j.t1, j.t2);
  assert.strictEqual(j.reachable, false);
  close(Math.hypot(tip.x, tip.y), 40);
});

test("target right on the shoulder doesn't crash", () => {
  const j = inverse({ l1: 100, l2: 100 }, 0, 0);
  assert.ok(Number.isFinite(j.t1) && Number.isFinite(j.t2));
});

test("reach ring", () => {
  assert.deepStrictEqual(reach(arm), { min: 40, max: 280 });
});
