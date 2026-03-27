/**
 * Team Logos - Google Favicon + TheSportsDB auto-discovery
 * מיפוי סטטי + חיפוש אוטומטי לקבוצות חדשות
 */

// === מיפוי סטטי: שם קנוני → דומיין ===
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

};

// === דגלים לנבחרות - כל חברות FIFA + טריטוריות ===
const TEAM_FLAGS = {
  // אירופה - UEFA
  'אנגליה': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'סקוטלנד': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'וויילס': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'צפון אירלנד': '🇬🇧',
  'אירלנד': '🇮🇪',
  'ספרד': '🇪🇸',
  'צרפת': '🇫🇷',
  'גרמניה': '🇩🇪',
  'איטליה': '🇮🇹',
  'פורטוגל': '🇵🇹',
  'הולנד': '🇳🇱',
  'בלגיה': '🇧🇪',
  'קרואטיה': '🇭🇷',
  'דנמרק': '🇩🇰',
  'שוודיה': '🇸🇪',
  'נורווגיה': '🇳🇴',
  'פינלנד': '🇫🇮',
  'שווייץ': '🇨🇭',
  'אוסטריה': '🇦🇹',
  'פולין': '🇵🇱',
  'צ\'כיה': '🇨🇿',
  'סלובקיה': '🇸🇰',
  'הונגריה': '🇭🇺',
  'רומניה': '🇷🇴',
  'בולגריה': '🇧🇬',
  'סרביה': '🇷🇸',
  'בוסניה': '🇧🇦',
  'מונטנגרו': '🇲🇪',
  'צפון מקדוניה': '🇲🇰',
  'סלובניה': '🇸🇮',
  'אלבניה': '🇦🇱',
  'קוסובו': '🇽🇰',
  'יוון': '🇬🇷',
  'טורקיה': '🇹🇷',
  'אוקראינה': '🇺🇦',
  'רוסיה': '🇷🇺',
  'בלארוס': '🇧🇾',
  'גאורגיה': '🇬🇪',
  'ארמניה': '🇦🇲',
  'אזרבייג\'ן': '🇦🇿',
  'קזחסטן': '🇰🇿',
  'מולדובה': '🇲🇩',
  'איסלנד': '🇮🇸',
  'לוקסמבורג': '🇱🇺',
  'קפריסין': '🇨🇾',
  'מלטה': '🇲🇹',
  'אסטוניה': '🇪🇪',
  'לטביה': '🇱🇻',
  'ליטא': '🇱🇹',
  'איי פארו': '🇫🇴',
  'אנדורה': '🇦🇩',
  'סן מרינו': '🇸🇲',
  'ליכטנשטיין': '🇱🇮',
  'גיברלטר': '🇬🇮',
  'ישראל': '🇮🇱',

  // דרום אמריקה - CONMEBOL
  'ברזיל': '🇧🇷',
  'ארגנטינה': '🇦🇷',
  'אורוגוואי': '🇺🇾',
  'קולומביה': '🇨🇴',
  'צ\'ילה': '🇨🇱',
  'פרו': '🇵🇪',
  'אקוודור': '🇪🇨',
  'פרגוואי': '🇵🇾',
  'בוליביה': '🇧🇴',
  'ונצואלה': '🇻🇪',

  // צפון ומרכז אמריקה - CONCACAF
  'ארה"ב': '🇺🇸',
  'מקסיקו': '🇲🇽',
  'קנדה': '🇨🇦',
  'קוסטה ריקה': '🇨🇷',
  'פנמה': '🇵🇦',
  'הונדורס': '🇭🇳',
  'אל סלבדור': '🇸🇻',
  'גואטמלה': '🇬🇹',
  'ג\'מייקה': '🇯🇲',
  'טרינידד וטובגו': '🇹🇹',
  'האיטי': '🇭🇹',
  'קוראסאו': '🇨🇼',
  'סורינאם': '🇸🇷',

  // אסיה - AFC
  'יפן': '🇯🇵',
  'דרום קוריאה': '🇰🇷',
  'אוסטרליה': '🇦🇺',
  'סעודיה': '🇸🇦',
  'איראן': '🇮🇷',
  'עיראק': '🇮🇶',
  'קטאר': '🇶🇦',
  'איחוד האמירויות': '🇦🇪',
  'אוזבקיסטן': '🇺🇿',
  'סין': '🇨🇳',
  'תאילנד': '🇹🇭',
  'ויאטנם': '🇻🇳',
  'הודו': '🇮🇳',
  'ירדן': '🇯🇴',
  'סוריה': '🇸🇾',
  'לבנון': '🇱🇧',
  'פלסטין': '🇵🇸',
  'עומאן': '🇴🇲',
  'בחריין': '🇧🇭',
  'כווית': '🇰🇼',
  'מלזיה': '🇲🇾',
  'אינדונזיה': '🇮🇩',
  'צפון קוריאה': '🇰🇵',
  'טג\'יקיסטן': '🇹🇯',
  'קירגיזסטן': '🇰🇬',
  'טורקמניסטן': '🇹🇲',
  'בנגלדש': '🇧🇩',
  'פיליפינים': '🇵🇭',
  'סינגפור': '🇸🇬',
  'הונג קונג': '🇭🇰',

  // אפריקה - CAF
  'מרוקו': '🇲🇦',
  'סנגל': '🇸🇳',
  'ניגריה': '🇳🇬',
  'מצרים': '🇪🇬',
  'קמרון': '🇨🇲',
  'גאנה': '🇬🇭',
  'טוניסיה': '🇹🇳',
  'אלג\'יריה': '🇩🇿',
  'חוף השנהב': '🇨🇮',
  'דרום אפריקה': '🇿🇦',
  'מאלי': '🇲🇱',
  'בורקינה פאסו': '🇧🇫',
  'קונגו': '🇨🇬',
  'קונגו הדמוקרטית': '🇨🇩',
  'גינאה': '🇬🇳',
  'זמביה': '🇿🇲',
  'אוגנדה': '🇺🇬',
  'טנזניה': '🇹🇿',
  'קניה': '🇰🇪',
  'אתיופיה': '🇪🇹',
  'מוזמביק': '🇲🇿',
  'אנגולה': '🇦🇴',
  'גבון': '🇬🇦',
  'בנין': '🇧🇯',
  'טוגו': '🇹🇬',
  'ניז\'ר': '🇳🇪',
  'מדגסקר': '🇲🇬',
  'קייפ ורדה': '🇨🇻',
  'רואנדה': '🇷🇼',
  'לוב': '🇱🇾',
  'סודן': '🇸🇩',
  'גמביה': '🇬🇲',
  'מאוריטניה': '🇲🇷',
  'זימבבואה': '🇿🇼',
  'נמיביה': '🇳🇦',
  'סיירה לאונה': '🇸🇱',
  'גינאה המשוונית': '🇬🇶',
  'קומורו': '🇰🇲',
  'בוטסואנה': '🇧🇼',
  'מלאווי': '🇲🇼',
  'בורונדי': '🇧🇮',
  'לסוטו': '🇱🇸',
  'אסוואטיני': '🇸🇿',
  'ליבריה': '🇱🇷',
  'מאוריציוס': '🇲🇺',
  'צ\'אד': '🇹🇩',
  'הרפובליקה המרכז אפריקאית': '🇨🇫',
  'ג\'יבוטי': '🇩🇯',
  'סומליה': '🇸🇴',
  'אריתריאה': '🇪🇷',
  'דרום סודן': '🇸🇸',

  // אוקיאניה - OFC
  'ניו זילנד': '🇳🇿',
  'פיג\'י': '🇫🇯',
  'פפואה גינאה החדשה': '🇵🇬',
  'טהיטי': '🇵🇫',
  'סמואה': '🇼🇸',
  'טונגה': '🇹🇴',
};

// === שם באנגלית לחיפוש אוטומטי ב-TheSportsDB ===
const TEAM_ENGLISH = {
  'ריאל מדריד': 'Real Madrid',
  'ברצלונה': 'Barcelona',
  'אטלטיקו מדריד': 'Atletico Madrid',
  'אתלטיק בילבאו': 'Athletic Bilbao',
  'ויאריאל': 'Villarreal',
  'בטיס': 'Real Betis',
  'סביליה': 'Sevilla',
  'ריאל סוסיאדד': 'Real Sociedad',
  'אספניול': 'Espanyol',
  'סלטה ויגו': 'Celta Vigo',
  'מיורקה': 'Mallorca',
  'ולנסיה': 'Valencia',
  'אלצ\'ה': 'Elche',
  'ראיו': 'Rayo Vallecano',
  'לבאנטה': 'Levante',
  'אוססונה': 'Osasuna',
  'ג\'ירונה': 'Girona',
  'ליברפול': 'Liverpool',
  'ארסנל': 'Arsenal',
  'צ\'לסי': 'Chelsea',
  'טוטנהאם': 'Tottenham',
  'מנצ\'סטר סיטי': 'Manchester City',
  'מנצ\'סטר יונייטד': 'Manchester United',
  'ניוקאסל': 'Newcastle United',
  'אסטון וילה': 'Aston Villa',
  'ווסטהאם': 'West Ham',
  'קריסטל פאלאס': 'Crystal Palace',
  'לידס': 'Leeds United',
  'ברנלי': 'Burnley',
  'סנדרלנד': 'Sunderland',
  'נוטינגהאם פורסט': 'Nottingham Forest',
  'בורנמות\'': 'Bournemouth',
  'וולבס': 'Wolverhampton',
  'ברנטפורד': 'Brentford',
  'אינטר': 'Inter Milan',
  'יובנטוס': 'Juventus',
  'נאפולי': 'Napoli',
  'מילאן': 'AC Milan',
  'אטאלנטה': 'Atalanta',
  'רומא': 'AS Roma',
  'בולוניה': 'Bologna',
  'קומו': 'Como',
  'באיירן מינכן': 'Bayern Munich',
  'דורטמונד': 'Borussia Dortmund',
  'לברקוזן': 'Bayer Leverkusen',
  'לייפציג': 'RB Leipzig',
  'פריז סן ז\'רמן': 'Paris Saint-Germain',
  'מרסיי': 'Marseille',
  'מונאקו': 'Monaco',
  'בנפיקה': 'Benfica',
  'ספורטינג ליסבון': 'Sporting Lisbon',
  'אייאקס': 'Ajax',
  'פ.ס.וו': 'PSV Eindhoven',
  'גלאטסראיי': 'Galatasaray',
  'בודה גלימט': 'Bodo Glimt',
  'סלביה פראג': 'Slavia Prague',
  'אולימפיאקוס': 'Olympiacos',
  'קלאב ברוז\'': 'Club Brugge',
  'קראבג': 'Qarabag',
  'מכבי תל אביב': 'Maccabi Tel Aviv',
  'הפועל באר שבע': 'Hapoel Beer Sheva',
  'בית"ר ירושלים': 'Beitar Jerusalem',
  'הפועל תל אביב': 'Hapoel Tel Aviv',
  'מכבי חיפה': 'Maccabi Haifa',
  'מכבי נתניה': 'Maccabi Netanya',
  'הפועל ירושלים': 'Hapoel Jerusalem',
  'הפועל חיפה': 'Hapoel Haifa',
  'עירוני קרית שמונה': 'Hapoel Ironi Kiryat Shmona',
  'עירוני טבריה': 'Ironi Tiberias',
  'בני סכנין': 'Bnei Sakhnin',
  'מ.ס. אשדוד': 'MS Ashdod',
  'הפועל פתח תקווה': 'Hapoel Petah Tikva',
  'מכבי בני ריינה': 'Maccabi Bnei Reineh',
  'ספרד': 'Spain',
  'אנגליה': 'England',
  'הולנד': 'Netherlands',
  'איטליה': 'Italy',
  'פולין': 'Poland',
  'גאורגיה': 'Georgia',
  'אלבניה': 'Albania',
  'ישראל': 'Israel',
  'מולדובה': 'Moldova',
  'נורווגיה': 'Norway',
  'טורקיה': 'Turkey',
};

// === אלייאסים (שגיאות כתיב) ===
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

  // אלייאסים נבחרות - שגיאות כתיב נפוצות
  'שבדיה': 'שוודיה',
  'שווידיה': 'שוודיה',
  'נורבגיה': 'נורווגיה',
  'נורבגיה': 'נורווגיה',
  'הולנד': 'הולנד',
  'אירלנד הצפונית': 'צפון אירלנד',
  'צפון אירלנד': 'צפון אירלנד',
  'וילס': 'וויילס',
  'ויילס': 'וויילס',
  'צכיה': 'צ\'כיה',
  'צ\'כיה': 'צ\'כיה',
  'ציכיה': 'צ\'כיה',
  'בוסניה והרצגובינה': 'בוסניה',
  'צפון מקדוניה': 'צפון מקדוניה',
  'מקדוניה': 'צפון מקדוניה',
  'ערב הסעודית': 'סעודיה',
  'סעודית': 'סעודיה',
  'ערב סעודית': 'סעודיה',
  'אמירויות': 'איחוד האמירויות',
  'האמירויות': 'איחוד האמירויות',
  'קוריאה': 'דרום קוריאה',
  'קוריאה הדרומית': 'דרום קוריאה',
  'ארצות הברית': 'ארה"ב',
  'אמריקה': 'ארה"ב',
  'חוף שנהב': 'חוף השנהב',
  'ד"א קוריאה': 'דרום קוריאה',
  'ניו-זילנד': 'ניו זילנד',
  'ניו זלנד': 'ניו זילנד',
  'אלג\'ריה': 'אלג\'יריה',
  'אלגיריה': 'אלג\'יריה',
  'גרוזיה': 'גאורגיה',
  'קוסטה-ריקה': 'קוסטה ריקה',
  'טרינידד': 'טרינידד וטובגו',
  'דרא"פ קוריאה': 'צפון קוריאה',
  'קוריאה הצפונית': 'צפון קוריאה',
  'הונג-קונג': 'הונג קונג',
  'אי הבתולה': 'ארה"ב',
};

/**
 * נרמול שם קבוצה לשם קנוני
 */
function normalizeTeamName(teamName) {
  if (!teamName) return teamName;
  const trimmed = teamName.trim();

  if (TEAM_DOMAINS[trimmed]) return trimmed;
  if (TEAM_ALIASES[trimmed]) return TEAM_ALIASES[trimmed];

  // Fuzzy - חיפוש לפי הכלה
  for (const canonical of Object.keys(TEAM_DOMAINS)) {
    if (trimmed.length >= 4 && canonical.length >= 4) {
      if (trimmed.includes(canonical) || canonical.includes(trimmed)) {
        return canonical;
      }
    }
  }
  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    if (trimmed.length >= 4 && alias.length >= 4) {
      if (trimmed.includes(alias) || alias.includes(trimmed)) {
        return canonical;
      }
    }
  }

  return trimmed;
}

/**
 * מחזיר URL סטטי (Google Favicon) - מיידי, ללא async
 */
function getTeamLogoUrl(teamName, size = 32) {
  const canonical = normalizeTeamName(teamName);
  const domain = TEAM_DOMAINS[canonical];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// === חיפוש אוטומטי דרך TheSportsDB (לקבוצות לא מוכרות) ===

const LOGO_CACHE_PREFIX = 'team_logo_';

/**
 * חיפוש אסינכרוני של לוגו קבוצה
 * 1. בודק מיפוי סטטי (מיידי)
 * 2. בודק localStorage cache
 * 3. מחפש ב-TheSportsDB לפי שם באנגלית
 * 4. שומר ב-cache לשימוש עתידי
 */
async function fetchTeamLogoUrl(teamName) {
  const canonical = normalizeTeamName(teamName);

  // 1. מיפוי סטטי - Google Favicon
  const domain = TEAM_DOMAINS[canonical];
  if (domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  // 2. בדיקת cache
  const cacheKey = LOGO_CACHE_PREFIX + canonical;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) return cached === '' ? null : cached;
  } catch (e) { /* localStorage לא זמין */ }

  // 3. חיפוש ב-TheSportsDB
  const english = TEAM_ENGLISH[canonical];
  if (english) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(english)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.teams && data.teams[0]) {
          const badge = data.teams[0].strBadge || data.teams[0].strLogo;
          if (badge) {
            try { localStorage.setItem(cacheKey, badge); } catch (e) {}
            return badge;
          }
        }
      }
    } catch (e) { /* network error - fail silently */ }
  }

  // 4. לא נמצא - שמור null ב-cache כדי לא לחפש שוב
  try { localStorage.setItem(cacheKey, ''); } catch (e) {}
  return null;
}

/**
 * מחזיר אימוג'י דגל אם הקבוצה היא נבחרת
 */
function getTeamFlag(teamName) {
  const canonical = normalizeTeamName(teamName);
  return TEAM_FLAGS[canonical] || null;
}

export { getTeamLogoUrl, fetchTeamLogoUrl, normalizeTeamName, getTeamFlag, TEAM_ENGLISH };
