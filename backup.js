/**
 * MongoDB Backup Script
 *
 * שימוש: node backup.js
 * יוצר גיבוי של כל הקולקציות בתיקיית backups/
 * כל גיבוי נשמר בתיקייה עם תאריך ושעה
 */

const fs = require('fs');
const path = require('path');

// טעינת מודולים מתיקיית backend (שם יושבים node_modules)
const backendDir = path.join(__dirname, 'backend');
const mongoose = require(path.join(backendDir, 'node_modules', 'mongoose'));
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const BACKUPS_DIR = path.join(__dirname, 'backups');

// הקולקציות לגיבוי
const COLLECTIONS = ['users', 'weeks', 'matches', 'bets', 'scores', 'leagues'];

async function backup() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI לא נמצא ב-.env');
    process.exit(1);
  }

  // יצירת תיקיית גיבוי עם תאריך
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(BACKUPS_DIR, timestamp);

  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('🔗 מתחבר ל-MongoDB...');

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4 // Force IPv4
    });
    console.log('✅ מחובר!');

    const db = mongoose.connection.db;
    let totalDocs = 0;

    for (const collectionName of COLLECTIONS) {
      try {
        const collection = db.collection(collectionName);
        const docs = await collection.find({}).toArray();

        const filePath = path.join(backupDir, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');

        totalDocs += docs.length;
        console.log(`  📄 ${collectionName}: ${docs.length} רשומות`);
      } catch (err) {
        console.log(`  ⚠️ ${collectionName}: קולקציה לא קיימת או ריקה`);
      }
    }

    // שמירת מטא-דאטה
    const meta = {
      timestamp: now.toISOString(),
      collections: COLLECTIONS,
      totalDocuments: totalDocs,
      mongodbUri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // הסתרת credentials
    };
    fs.writeFileSync(path.join(backupDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    console.log(`\n✅ גיבוי הושלם! ${totalDocs} רשומות נשמרו`);
    console.log(`📁 תיקייה: backups/${timestamp}`);

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

backup();
