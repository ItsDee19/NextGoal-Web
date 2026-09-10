const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "redirect.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const target = { exports: {} };
vm.runInNewContext(compiled, { exports: target.exports, URL, decodeURIComponent });
const { safeAuthRedirect } = target.exports;

for (const value of ["/", "/saved", "/profile#preferences", "/?search=data%20science&source=lever"]) {
    test(`preserves an internal destination: ${value}`, () => assert.equal(safeAuthRedirect(value), value));
}

for (const value of [null, "", "https://example.com", "javascript:alert(1)", "//example.com", "/\\example.com", "/%2f%2fexample.com", "/%5cexample.com", "/auth/callback?next=/profile", "/%61uth/login", "/auth%2flogin", "/jobs/../auth/login", "/%0asaved", "/%ZZ"]) {
    test(`rejects unsafe destinations and authentication loops: ${JSON.stringify(value)}`, () => assert.equal(safeAuthRedirect(value), "/"));
}
