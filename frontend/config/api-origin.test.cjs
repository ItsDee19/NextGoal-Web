const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveApiOrigin } = require('./api-origin.cjs');

test('local development retains the local API default', () => {
    assert.equal(resolveApiOrigin(undefined), 'http://localhost:3001');
    assert.equal(resolveApiOrigin('http://127.0.0.1:3101/'), 'http://127.0.0.1:3101');
});

test('normalizes the configured deployed origin', () => {
    assert.equal(resolveApiOrigin(' https://nextgoal-api.onrender.com/ ', { hosted: true }), 'https://nextgoal-api.onrender.com');
});

for (const value of [undefined, '', 'http://nextgoal-api.onrender.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://192.168.1.10', 'https://api.localhost']) {
    test(`refuses a missing or local Vercel API setting: ${value}`, () => {
        assert.throws(() => resolveApiOrigin(value, { hosted: true }), /NEXT_PUBLIC_API_URL/);
    });
}

for (const value of ['/api', 'not a URL', 'ftp://api.example.com', 'https://user:secret@api.example.com', 'https://api.example.com/jobs', 'https://api.example.com?token=secret', 'https://api.example.com/#fragment']) {
    test(`refuses an origin that would misroute requests or expose credentials: ${value}`, () => {
        assert.throws(() => resolveApiOrigin(value), /NEXT_PUBLIC_API_URL/);
    });
}
