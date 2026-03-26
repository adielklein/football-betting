/**
 * Team Logos via Google Favicon Service
 * מיפוי שמות קבוצות לדומיינים + נורמליזציה חכמה
 */

const TEAM_DOMAINS = {
  // ספרד
  'ריאל מדריד': 'realmadrid.com',
  'ברצלונה': 'fcbarcelona.com',
  'אטלטיקו מדריד': 'atleticodemadrid.com',
  'אתלטיק בילבאו': 'athletic-club.eus',
  'ויאריאל': 'villarrealcf.es',
  'בטיס': 'realbetisbalompie.es',
  'סביליה': 'sevillafc.es',
  'ריאל סוסיאדד': 'realsociedad.eus',
  'אספניול': 'rcdespanyol.com',
  'סלטה ויגו': 'rccelta.es',
  'מיורקה': 'rcdmallorca.es',
  'ולנסיה': 'valenciacf.com',
  'אלצ\'ה': 'elchecf.es',
  'ראיו': 'rayovallecano.es',
  'לבאנטה': 'levanteud.com',
  'אוססונה': 'osasuna.es',
  'ג\'ירונה': 'gironafc.cat',

  // אנגליה
  'ליברפול': 'liverpoolfc.com',
  'ארסנל': 'arsenal.com',
  'צ\'לסי': 'chelseafc.com',
  'טוטנהאם': 'tottenhamhotspur.com',
  'מנצ\'סטר סיטי': 'mancity.com',
  'מנצ\'סטר יונייטד': 'manutd.com',
  'ניוקאסל': 'nufc.co.uk',
  'אסטון וילה': 'avfc.co.uk',
  'ווסטהאם': 'whufc.com',
  'קריסטל פאלאס': 'cpfc.co.uk',
  'לידס': 'leedsunited.com',
  'ברנלי': 'burnleyfc.com',
  'סנדרלנד': 'safc.com',
  'נוטינגהאם פורסט': 'nottinghamforest.co.uk',
  'בורנמות\'': 'afcb.co.uk',
  'וולבס': 'wolves.co.uk',
  'ברנטפורד': 'brentfordfc.com',

  // איטליה
  'אינטר': 'inter.it',
  'יובנטוס': 'juventus.com',
  'נאפולי': 'sscnapoli.it',
  'מילאן': 'acmilan.com',
  'אטאלנטה': 'atalanta.it',
  'רומא': 'asroma.com',
  'בולוניה': 'bolognafc.it',
  'קומו': 'comofootball.com',

  // גרמניה
  'באיירן מינכן': 'fcbayern.com',
  'דורטמונד': 'bvb.de',
  'לברקוזן': 'bayer04.de',
  'לייפציג': 'rbleipzig.com',

  // צרפת
  'פריז סן ז\'רמן': 'psg.fr',
  'מרסיי': 'om.fr',
  'מונאקו': 'asmonaco.com',

  // פורטוגל
  'בנפיקה': 'slbenfica.pt',
  'ספורטינג ליסבון': 'sporting.pt',

  // הולנד
  'אייאקס': 'ajax.nl',
  'פ.ס.וו': 'psv.nl',

  // טורקיה
  'גלאטסראיי': 'galatasaray.org',

  // נורבגיה
  'בודה גלימט': 'glimt.no',

  // צ'כיה
  'סלביה פראג': 'slavia.cz',

  // יוון
  'אולימפיאקוס': 'olympiacos.org',

  // בלגיה
  'קלאב ברוז\'': 'clubbrugge.be',

  // אזרבייג'ן
  'קראבג': 'qarabag.com',

  // ישראל
  'מכבי תל אביב': 'maccabi-tlv.co.il',
  'הפועל באר שבע': 'hapoelbs.co.il',
  'בית"ר ירושלים': 'bfrj.co.il',
  'הפועל תל אביב': 'hapoel-tlv.co.il',
  'מכבי חיפה': 'mhaifafc.com',
  'מכבי נתניה': 'maccabi-net.co.il',
  'הפועל ירושלים': 'hapoeljer.co.il',
  'הפועל חיפה': 'hapoelhaifafc.com',
  'עירוני קרית שמונה': 'hmks.co.il',
  'עירוני טבריה': 'itveria.co.il',
  'בני סכנין': 'bneisakhnin.co.il',
  'מ.ס. אשדוד': 'msashdod.co.il',
  'הפועל פתח תקווה': 'hapoelpetachtikva.co.il',
  'מכבי בני ריינה': 'maccabireina.co.il',

  // נבחרות
  'ספרד': 'rfef.es',
  'אנגליה': 'thefa.com',
  'הולנד': 'knvb.nl',
  'איטליה': 'figc.it',
  'פולין': 'pzpn.pl',
  'גאורגיה': 'gff.ge',
  'אלבניה': 'fshf.org',
  'ישראל': 'football.org.il',
  'מולדובה': 'fmf.md',
  'נורווגיה': 'fotball.no',
  'טורקיה': 'tff.org',
};

// אלייאסים - אותו מיפוי כמו בבקאנד
const TEAM_ALIASES = {
  'ריאל מטריד': 'ריאל מדריד',
  'ריאל מנדריל': 'ריאל מדריד',
  'ריאל מגעיל': 'ריאל מדריד',
  'רעל מבחיל': 'ריאל מדריד',
  'אתלטיקו מדריד': 'אטלטיקו מדריד',
  'אטלטיק בילבאו': 'אתלטיק בילבאו',
  'אטלטיק ביבלאו': 'אתלטיק בילבאו',
  'בילבאו': 'אתלטיק בילבאו',
  'ז\'ירונה': 'ג\'ירונה',
  'ארנסל': 'ארסנל',
  'צלס\'י': 'צ\'לסי',
  'מנצסטר סיטי': 'מנצ\'סטר סיטי',
  'מנ\'צסטר סיטי': 'מנצ\'סטר סיטי',
  'מנצסטר יונייטד': 'מנצ\'סטר יונייטד',
  'יובנטוס טורינו': 'יובנטוס',
  'אטלאנטה': 'אטאלנטה',
  'באיירן': 'באיירן מינכן',
  'פריז סן זרמן': 'פריז סן ז\'רמן',
  'פריז סן-ז\'רמן': 'פריז סן ז\'רמן',
  'בנפיקה ליסבון': 'בנפיקה',
  'גאלטסראיי': 'גלאטסראיי',
  'בית"ר "רייטינג על" ירושלים': 'בית"ר ירושלים',
  'עירוני קריית שמונה': 'עירוני קרית שמונה',
  'סכנין': 'בני סכנין',
  'הפועל פתח תקוה': 'הפועל פתח תקווה',
};

/**
 * נרמול שם קבוצה לשם קנוני
 */
function normalizeTeamName(teamName) {
  if (!teamName) return teamName;
  const trimmed = teamName.trim();

  // חיפוש ישיר בדומיינים
  if (TEAM_DOMAINS[trimmed]) return trimmed;

  // חיפוש באלייאסים
  if (TEAM_ALIASES[trimmed]) return TEAM_ALIASES[trimmed];

  // Fuzzy - חיפוש לפי הכלה
  const allCanonical = Object.keys(TEAM_DOMAINS);
  const allAliases = Object.entries(TEAM_ALIASES);

  for (const canonical of allCanonical) {
    if (trimmed.length >= 4 && canonical.length >= 4) {
      if (trimmed.includes(canonical) || canonical.includes(trimmed)) {
        return canonical;
      }
    }
  }

  for (const [alias, canonical] of allAliases) {
    if (trimmed.length >= 4 && alias.length >= 4) {
      if (trimmed.includes(alias) || alias.includes(trimmed)) {
        return canonical;
      }
    }
  }

  return trimmed;
}

/**
 * מחזיר URL ללוגו של קבוצה דרך Google Favicon Service
 * @param {string} teamName - שם הקבוצה (גם עם שגיאות כתיב)
 * @param {number} size - גודל בפיקסלים (16, 32, 64, 128)
 * @returns {string|null} URL ללוגו או null אם לא נמצא
 */
function getTeamLogoUrl(teamName, size = 32) {
  const canonical = normalizeTeamName(teamName);
  const domain = TEAM_DOMAINS[canonical];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

export { getTeamLogoUrl, normalizeTeamName };
