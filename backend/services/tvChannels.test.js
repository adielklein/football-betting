const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pickIsraeliChannels } = require('./scores365Api');

test('ערוץ ישראלי מתוך tvNetworks של 365 (countryId=6)', () => {
  const game = {
    tvNetworks: [
      { id: 5272, name: 'ספורט 4', countryId: 6, website: 'https://sport1.maariv.co.il/', bookmakerId: 0 },
      { id: 9, name: 'Sky Sports', countryId: 1, website: 'https://sky.com' },
      { id: 5272, name: 'ספורט 4 ', countryId: 6 }
    ]
  };
  assert.deepEqual(pickIsraeliChannels(game), [{ name: 'ספורט 4', website: 'https://sport1.maariv.co.il/' }]);
});

test('משחק בלי שידור ידוע - רשימה ריקה', () => {
  assert.deepEqual(pickIsraeliChannels({ hasTVNetworks: false }), []);
  assert.deepEqual(pickIsraeliChannels(null), []);
});
