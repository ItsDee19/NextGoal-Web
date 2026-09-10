const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadTypeScript(name) {
    const source = fs.readFileSync(path.join(__dirname, name + ".ts"), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const target = { exports: {} };
    vm.runInNewContext(compiled, {
        exports: target.exports, URL, URLSearchParams, Intl,
        require: (request) => {
            if (request !== "./job-search") throw new Error(`Unexpected test dependency: ${request}`);
            return loadTypeScript("job-search");
        },
    });
    return target.exports;
}
const { createJobFilterState } = loadTypeScript("job-filter-state");
const snapshot = (state) => JSON.parse(JSON.stringify(state.getSnapshot()));

test("rapid filter choices accumulate before any UI render or router acknowledgment", () => {
    const urls = [];
    const state = createJobFilterState("page=4&limit=50", (query) => urls.push(query));
    state.update((current) => ({ ...current, source: [...(current.source || []), "lever"], page: 1 }));
    state.update((current) => ({ ...current, source: [...(current.source || []), "ashby"], page: 1 }));
    state.update((current) => ({ ...current, jobType: ["contract"], remote: true, page: 1 }));
    assert.deepEqual(snapshot(state).filters, { page: 1, limit: 50, source: ["lever", "ashby"], jobType: ["contract"], remote: true });
    const query = new URLSearchParams(urls.at(-1));
    assert.deepEqual(query.getAll("source"), ["lever", "ashby"]);
    assert.equal(query.get("jobType"), "contract");
    assert.equal(query.get("remote"), "true");
    assert.equal(query.get("limit"), "50");
});

test("a delayed keyword commit retains source and location choices made after it was scheduled", () => {
    const state = createJobFilterState("", () => {});
    const delayedSearch = () => state.update((current) => ({ ...current, search: "Engineer", page: 1 }));
    state.update((current) => ({ ...current, location: "Remote, India", source: ["lever"] }));
    state.update((current) => ({ ...current, postedWithin: "7d" }));
    delayedSearch();
    assert.deepEqual(snapshot(state).filters, { page: 1, limit: 20, location: "Remote, India", source: ["lever"], postedWithin: "7d", search: "Engineer" });
});

test("consecutive toggles remove one choice while preserving the other", () => {
    const state = createJobFilterState("source=lever&source=ashby&location=India", () => {});
    state.update((current) => ({ ...current, source: current.source.filter((source) => source !== "lever"), page: 1 }));
    state.update((current) => ({ ...current, experienceLevel: ["fresher"], page: 1 }));
    assert.deepEqual(snapshot(state).filters, { page: 1, limit: 20, source: ["ashby"], location: "India", experienceLevel: ["fresher"] });
});

test("clear starts a new filter selection without resurrecting the previous search", () => {
    const state = createJobFilterState("search=Design&source=lever&location=India&page=3", () => {});
    state.update({ page: 1, limit: 20 });
    state.update((current) => ({ ...current, jobType: ["internship"] }));
    assert.deepEqual(snapshot(state).filters, { page: 1, limit: 20, jobType: ["internship"] });
});

test("back/forward restoration replaces committed filters without rewriting browser history", () => {
    const urls = [];
    const state = createJobFilterState("search=Engineer&source=lever", (query) => urls.push(query));
    state.update((current) => ({ ...current, source: ["ashby"] }));
    state.restore("search=Design&source=greenhouse&page=2&limit=50");
    assert.equal(urls.length, 1);
    assert.deepEqual(snapshot(state), { filters: { page: 2, limit: 50, search: "Design", source: ["greenhouse"] }, navigationVersion: 1 });
    state.update((current) => ({ ...current, degree: ["btech"], page: 1 }));
    assert.equal(new URLSearchParams(urls.at(-1)).get("search"), "Design");
    assert.equal(new URLSearchParams(urls.at(-1)).get("source"), "greenhouse");
});

test("echoes from native history synchronization do not reset draft inputs or trigger another commit", () => {
    const urls = [];
    const state = createJobFilterState("search=Engineer", (query) => urls.push(query));
    let notifications = 0;
    const unsubscribe = state.subscribe(() => notifications++);
    state.update((current) => ({ ...current, source: ["lever"] }));
    const committed = state.getSnapshot();
    state.restore(urls[0]);
    assert.equal(state.getSnapshot(), committed);
    assert.equal(snapshot(state).navigationVersion, 0);
    assert.equal(notifications, 1);
    assert.equal(urls.length, 1);
    unsubscribe();
});

test("native history echoes preserve the space while typing a multiword company name", () => {
    const urls = [];
    const state = createJobFilterState("", (query) => urls.push(query));
    state.update((current) => ({ ...current, company: "New " }));
    state.restore(urls.at(-1));
    assert.equal(snapshot(state).filters.company, "New ");
    assert.equal(snapshot(state).navigationVersion, 0);
    state.update((current) => ({ ...current, company: current.company + "Relic" }));
    state.restore(urls.at(-1));
    assert.equal(snapshot(state).filters.company, "New Relic");
    state.restore("company=Acme");
    assert.equal(snapshot(state).filters.company, "Acme");
    assert.equal(snapshot(state).navigationVersion, 1);
});
