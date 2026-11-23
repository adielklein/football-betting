// העתקת הנתונים מהמסד האמיתי למסד של סביבת הניסוי.
//
// רץ רק בשרת הניסוי (APP_ENV=staging), ורק כשהוגדר SEED_FROM_MONGODB_URI.
// מהמקור רק קוראים - שום פעולת כתיבה לא נשלחת אליו. היעד הוא המסד שהשרת
// מחובר אליו (MONGODB_URI).
//
// מתי מעתיקים: כש-STAGING_SEED_VERSION (ברירת מחדל "1") שונה מהגרסה שכבר
// הועתקה. כך פריסה רגילה לא מוחקת את מה שניסית, ומי שרוצה העתקה טרייה
// משנה את המספר ב-Render (2, 3...) ומפעיל מחדש.
//
// מנויי התראות של המכשירים לא מועתקים: הם שייכים לטלפונים של השחקנים
// האמיתיים, והתראה משרת הניסוי לא אמורה להגיע אליהם לעולם.

const META = '_staging_meta';
const BATCH = 500;

// מארח(ים) ושם מסד מתוך כתובת חיבור. בלי שם מסד מונגו משתמש ב-"test"
const parseMongoUri = (uri) => {
  const m = String(uri || '').match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(?:\/([^?]*))?/i);
  if (!m) return null;
  const hosts = m[1].toLowerCase().split(',').map((h) => h.trim()).sort().join(',');
  const db = decodeURIComponent(m[2] || '') || 'test';
  return { hosts, db };
};

// האם שתי כתובות מצביעות על אותו מסד. כשאי אפשר לדעת - מניחים שכן
const sameDatabase = (a, b) => {
  const pa = parseMongoUri(a);
  const pb = parseMongoUri(b);
  if (!pa || !pb) return true;
  return pa.hosts === pb.hosts && pa.db === pb.db;
};

const stripDevices = (doc) => {
  if (!doc.pushSettings) return doc;
  const pushSettings = { ...doc.pushSettings, subscriptions: [], enabled: false };
  delete pushSettings.subscription;
  return { ...doc, pushSettings };
};

const seedStagingFromProduction = async ({ mongoose, sourceUri, targetUri, version }) => {
  if (!sourceUri) return { skipped: 'no SEED_FROM_MONGODB_URI' };
  if (sameDatabase(sourceUri, targetUri)) {
    console.error('🧪 [SEED] המקור והיעד הם אותו מסד - לא מעתיקים. MONGODB_URI של הניסוי חייב שם מסד אחר');
    return { skipped: 'same database' };
  }

  const target = mongoose.connection.db;
  const meta = await target.collection(META).findOne({ _id: 'seed' });
  if (meta?.version === version) return { skipped: `already seeded (version ${version})` };

  console.log(`🧪 [SEED] מעתיק מהמסד האמיתי (גרסה ${version})...`);
  const source = await mongoose.createConnection(sourceUri, { readPreference: 'secondaryPreferred' }).asPromise();
  const counts = {};
  try {
    const collections = (await source.db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.') && n !== META);

    for (const name of collections) {
      const to = target.collection(name);
      await to.deleteMany({});
      let batch = [];
      let n = 0;
      for await (const doc of source.db.collection(name).find({})) {
        batch.push(name === 'users' ? stripDevices(doc) : doc);
        if (batch.length >= BATCH) {
          await to.insertMany(batch, { ordered: false });
          n += batch.length;
          batch = [];
        }
      }
      if (batch.length) {
        await to.insertMany(batch, { ordered: false });
        n += batch.length;
      }
      counts[name] = n;
    }
    await target.collection(META).replaceOne(
      { _id: 'seed' },
      { _id: 'seed', version, at: new Date(), counts },
      { upsert: true }
    );
    console.log('🧪 [SEED] הסתיים:', JSON.stringify(counts));
    return { seeded: true, counts };
  } finally {
    await source.close().catch(() => {});
  }
};

module.exports = { parseMongoUri, sameDatabase, stripDevices, seedStagingFromProduction };
