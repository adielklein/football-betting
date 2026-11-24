const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isAllowed } = require('./imageProxy');

test('only listed image hosts are proxied', () => {
  assert.equal(isAllowed('https://imagecache.365scores.com/image/upload/v9/Competitors/132'), true);
  assert.equal(isAllowed('https://cdn.freebiesupply.com/logos/large/2x/x.png'), true);
  assert.equal(isAllowed('https://evil.example.com/x.png'), false);
  assert.equal(isAllowed('https://imagecache.365scores.com.evil.com/x.png'), false);
  assert.equal(isAllowed('file:///etc/passwd'), false);
  assert.equal(isAllowed('not a url'), false);
});
