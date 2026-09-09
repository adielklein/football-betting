// מה רץ עכשיו בפרודקשן, בשני השירותים, מול הקומיט המקומי.
//
// עונה על השאלה "עלה לאוויר?" בלי לנחש ובלי להשוות hash של חבילות -
// שני הצדדים מדווחים את ה-SHA שממנו נבנו, ו-Render מזריק אותו לבד.
//
// הרצה:  node tools/deployed.js

const { execSync } = require('child_process');

const BACKEND = 'https://football-betting-backend.onrender.com';
const FRONTEND = 'https://football-betting-frontend.onrender.com';

const localHead = () => {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

const get = async (url) => {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res;
};

const backendVersion = async () => {
  const json = await (await get(`${BACKEND}/api/version`)).json();
  return { commit: json.commit, extra: `הופעל ${new Date(json.startedAt).toLocaleString('he-IL')}` };
};

const frontendVersion = async () => {
  const html = await (await get(`${FRONTEND}/index.html?t=${Date.now()}`)).text();
  const m = html.match(/<meta name="app-commit" content="([^"]*)"/);
  return { commit: m ? m[1] : null, extra: m ? '' : 'אין חתימה - הדיפלוי קודם לתוספת הזו' };
};

(async () => {
  const head = localHead();
  console.log('מקומי:', head ? head.slice(0, 7) : 'לא ידוע');
  console.log('');

  for (const [name, load] of [['בקאנד ', backendVersion], ['פרונט ', frontendVersion]]) {
    try {
      const { commit, extra } = await load();
      if (!commit || commit === 'dev') {
        console.log(`  ${name} ${commit || '—'}   ${extra}`);
      } else {
        const match = head && commit === head;
        console.log(`  ${name} ${commit.slice(0, 7)}   ${match ? 'זהה למקומי' : 'שונה מהמקומי'}   ${extra}`);
      }
    } catch (e) {
      console.log(`  ${name} לא נענה (${e.message})`);
    }
  }
})();
