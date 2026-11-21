import fs from 'node:fs';
import assert from 'node:assert/strict';

const server = fs.readFileSync('server/src/server.js', 'utf8');
const config = fs.readFileSync('src/config.js', 'utf8');

assert.ok(server.includes('const isValid = isPassCorrect;'), 'login must rely on password hash verification');
assert.ok(!server.includes("password === '123456'"), 'hard-coded customer password bypass must not return');
assert.ok(server.includes("callback(new Error('Origin is not allowed by CORS.'))"), 'unknown and null CORS origins must be rejected');
assert.ok(!server.includes('Unconditionally allow valid cross-origin requests'), 'CORS must not contain allow-all fallback');
assert.ok(!config.includes('http://173.212.223.108:4000/api'), 'production API config must not contain raw HTTP VPS endpoint');
assert.ok(config.includes('VITE_API_FALLBACK_BASE'), 'fallback must be explicitly configurable');
assert.ok(config.includes('import.meta.env.PROD && parsed.protocol !== \'https:\''), 'production API endpoints must require HTTPS');

console.log('Security regression checks passed.');
