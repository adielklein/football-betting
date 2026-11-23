import { test } from 'node:test';
import assert from 'node:assert/strict';

// config.js קורא את שם האתר בטעינה, ולכן כל מקרה טוען עותק נפרד שלו
const load = async (hostname) => {
  globalThis.window = { location: { hostname } };
  return import(`./config.js?h=${hostname}`);
};

test('real site goes to the real server', async () => {
  const c = await load('football-betting-frontend.onrender.com');
  assert.equal(c.API_URL, 'https://football-betting-backend.onrender.com/api');
  assert.equal(c.IS_STAGING, false);
});

test('staging site goes to the staging server', async () => {
  const c = await load('football-betting-staging.onrender.com');
  assert.equal(c.API_URL, 'https://football-betting-backend-staging.onrender.com/api');
  assert.equal(c.IS_STAGING, true);
});

test('localhost goes to the local server', async () => {
  const c = await load('localhost');
  assert.equal(c.API_URL, 'http://localhost:5000/api');
});
