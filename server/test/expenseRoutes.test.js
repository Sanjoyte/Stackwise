import assert from "node:assert/strict";
import test from "node:test";

import router from "../src/routes/expenseRoutes.js";

test("static expense routes are registered before the /:id parameter route", () => {
  const paths = router.stack.filter((layer) => layer.route).map((layer) => layer.route.path);

  assert.ok(paths.includes("/receipt-scan"));
  assert.ok(paths.includes("/:id"));
  assert.ok(paths.indexOf("/receipt-scan") < paths.indexOf("/:id"));
  assert.ok(paths.indexOf("/summary") < paths.indexOf("/:id"));
  assert.ok(paths.indexOf("/import") < paths.indexOf("/:id"));
});

test("POST /receipt-scan only registers the POST method, not GET", () => {
  const layer = router.stack.find((item) => item.route && item.route.path === "/receipt-scan");

  assert.ok(layer);
  assert.equal(layer.route.methods.post, true);
  assert.ok(!layer.route.methods.get);
});
