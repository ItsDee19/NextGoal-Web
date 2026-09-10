const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "job-search.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const target = { exports: {} };
vm.runInNewContext(compiled, { exports: target.exports, URL, URLSearchParams, Intl });
const { parseJobFilters, serializeJobFilters, applicationDestination, countFilters, displayDate } = target.exports;
const snapshot = (value) => JSON.parse(JSON.stringify(value));
const parse = (query) => snapshot(parseJobFilters(new URLSearchParams(query)));

test("restores combined filters, repeated choices and a bounded page size from the URL", () => {
    const query = new URLSearchParams({ search: "  R&D engineer  ", location: "  Remote, India ", company: " Acme ", postedWithin: "7d", remote: "true", page: "4", limit: "50" });
    for (const [key, values] of Object.entries({ source: ["lever", "ashby", "lever"], experienceLevel: ["fresher", "5+"], degree: ["btech", "any"], jobType: ["full-time", "internship"] })) {
        values.forEach((value) => query.append(key, value));
    }
    assert.deepEqual(parse(query), {
        page: 4, limit: 50, search: "R&D engineer", location: "Remote, India", company: "Acme",
        source: ["lever", "ashby"], experienceLevel: ["fresher", "5+"], degree: ["btech", "any"], jobType: ["full-time", "internship"], postedWithin: "7d", remote: true,
    });
});

test("round-trips user filters without losing repeated parameters or reserved characters", () => {
    const filters = {
        page: 100000, limit: 100, search: "R&D + engineering", location: "Bengaluru / Remote", company: "A & B",
        source: ["greenhouse", "lever"], experienceLevel: ["1-3", "5+"], degree: ["btech", "llb"],
        jobType: ["full-time", "contract"], postedWithin: "30d", remote: true,
    };
    const serialized = serializeJobFilters(filters);
    assert.deepEqual(parse(serialized), filters);
    const params = new URLSearchParams(serialized);
    assert.deepEqual(params.getAll("source"), ["greenhouse", "lever"]);
    assert.deepEqual(params.getAll("experienceLevel"), ["1-3", "5+"]);
    assert.equal(params.get("search"), "R&D + engineering");
});

test("ignores unknown and inherited-property filter values", () => {
    assert.deepEqual(parse("source=constructor&source=lever&source=__proto__&source=unknown&degree=toString&experienceLevel=senior&jobType=anything&postedWithin=yesterday&remote=TRUE&unknown=ignored"), {
        page: 1, limit: 20, source: ["lever"],
    });
});

test("empty queries use stable defaults and serialize without redundant parameters", () => {
    assert.deepEqual(parse("search=+++&company=&location="), { page: 1, limit: 20 });
    assert.equal(serializeJobFilters({ page: 1, limit: 20, remote: false, source: [] }), "");
});

test("bounds free-text queries before sending them to the API", () => {
    const parsed = parse(new URLSearchParams({ search: `  ${"x".repeat(250)}  `, location: "y".repeat(250), company: "z".repeat(250) }));
    assert.equal(parsed.search.length, 200);
    assert.equal(parsed.location.length, 200);
    assert.equal(parsed.company.length, 200);
});

for (const value of ["0", "-1", "1.5", "100001", "NaN", "Infinity", "abc", ""]) {
    test(`rejects invalid page value ${JSON.stringify(value)}`, () => assert.equal(parse(new URLSearchParams({ page: value })).page, 1));
}
for (const value of ["0", "-1", "1.5", "101", "NaN", "Infinity", "abc", ""]) {
    test(`rejects invalid page size ${JSON.stringify(value)}`, () => assert.equal(parse(new URLSearchParams({ limit: value })).limit, 20));
}
for (const postedWithin of ["24h", "7d", "30d"]) {
    test(`accepts posting window ${postedWithin}`, () => assert.equal(parse(new URLSearchParams({ postedWithin })).postedWithin, postedWithin));
}
for (const remote of ["false", "1", "yes", ""]) {
    test(`does not enable remote filtering for ${JSON.stringify(remote)}`, () => assert.equal(parse(new URLSearchParams({ remote })).remote, undefined));
}

test("counts advanced filter choices without counting search fields or pagination", () => {
    assert.equal(countFilters({ search: "engineer", location: "India", page: 3, limit: 20, source: ["lever", "ashby"], degree: ["btech"], experienceLevel: ["fresher"], jobType: ["internship"], postedWithin: "7d", remote: true, company: "Acme" }), 8);
    assert.equal(countFilters({ search: "engineer", location: "India", page: 1 }), 0);
});

for (const [value, host] of [
    ["https://boards.greenhouse.io/acme/jobs/123?source=NextGoal", "boards.greenhouse.io"],
    ["https://jobs.lever.co/acme/abc", "jobs.lever.co"],
    ["https://www.microsoft.com/en-us/careers", "microsoft.com"],
    ["http://careers.acme.com/roles/1", "careers.acme.com"],
]) {
    test(`keeps a public web destination and exposes its host: ${host}`, () => {
        assert.deepEqual(snapshot(applicationDestination(value)), { href: value, host });
    });
}

for (const value of [
    "", "not a URL", "/apply/1", "//jobs.lever.co/acme/123", "javascript:alert(1)", "data:text/html,hello", "file:///C:/secret", "ftp://careers.acme.com/job",
    "https://user:password@careers.acme.com/job", "https://user@careers.acme.com/job", "https://careers.acme.com:3000/job",
    "http://localhost/job", "https://localhost./job", "https://service.internal/job", "https://service.internal./job", "https://printer.local/job", "https://printer.local./job",
    "http://127.0.0.1/job", "http://192.168.1.10/job", "http://10.0.0.1/job", "http://169.254.169.254/latest/meta-data", "http://172.16.0.1/job",
    "http://2130706433/job", "http://0x7f000001/job", "http://[::1]/job", "http://[fd00::1]/job",
    "https://example.com/job", "https://jobs.example.org/job", "https://job.test/1", "https://job.invalid/1",
    "https://careers.acme.com/\\job", "https://careers.acme.com/\njob",
]) {
    test(`blocks an unsafe or nonpublic application destination: ${JSON.stringify(value)}`, () => assert.equal(applicationDestination(value), null));
}

test("unknown or invalid dates remain unknown", () => {
    assert.equal(displayDate(null), null);
    assert.equal(displayDate(""), null);
    assert.equal(displayDate("not a date"), null);
});
