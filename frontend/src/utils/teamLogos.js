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
  'חטאפה': 'getafecf.com',
  'לאס פלמאס': 'udlaspalmas.es',
  'ויאדוליד': 'realvalladolid.es',
  'אלאבס': 'deportivoalaves.com',
  'לגאנס': 'cdleganes.com',

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

  // איטליה - Serie A
  'אינטר': 'inter.it',
  'יובנטוס': 'juventus.com',
  'נאפולי': 'sscnapoli.it',
  'מילאן': 'acmilan.com',
  'אטאלנטה': 'atalanta.it',
  'רומא': 'asroma.com',
  'בולוניה': 'bolognafc.it',
  'קומו': 'comofootball.com',
  'פיורנטינה': 'acffiorentina.com',
  'לאציו': 'sslazio.it',
  'טורינו': 'torinofc.it',
  'ג\'נואה': 'genoacfc.it',
  'קליארי': 'cagliaricalcio.com',
  'אודינזה': 'udinese.it',
  'פארמה': 'parmacalcio1913.com',
  'אמפולי': 'empolicalcio.it',
  'מונצה': 'acmonza.com',
  'ורונה': 'hellasverona.it',
  'לצ\'ה': 'uslecce.it',
  'ונציה': 'veneziafc.it',
  'סאסואולו': 'sassuolocalcio.it',
  'סמפדוריה': 'sampdoria.it',

  // גרמניה - Bundesliga
  'באיירן מינכן': 'fcbayern.com',
  'דורטמונד': 'bvb.de',
  'לברקוזן': 'bayer04.de',
  'לייפציג': 'rbleipzig.com',
  'שטוטגרט': 'vfb.de',
  'פרנקפורט': 'eintracht.de',
  'וולפסבורג': 'vfl-wolfsburg.de',
  'פרייבורג': 'scfreiburg.com',
  'הופנהיים': 'tsg-hoffenheim.de',
  'מיינץ': 'mainz05.de',
  'מנשנגלדבאך': 'borussia.de',
  'אוניון ברלין': 'fc-union-berlin.de',
  'ורדר ברמן': 'werder.de',
  'אוגסבורג': 'fcaugsburg.de',
  'קלן': 'fc-koeln.de',
  'סנט פאולי': 'fcstpauli.com',
  'היידנהיים': 'fc-heidenheim.de',
  'המבורג': 'hsv.de',

  // צרפת - Ligue 1
  'פריז סן ז\'רמן': 'psg.fr',
  'מרסיי': 'om.fr',
  'מונאקו': 'asmonaco.com',
  'ליון': 'ol.fr',
  'ליל': 'losc.fr',
  'ניס': 'ogcnice.com',
  'רן': 'staderennais.com',
  'לאנס': 'rclens.fr',
  'ברסט': 'sb29.bzh',
  'סטרסבורג': 'rcsa.fr',
  'טולוז': 'toulousefc.com',
  'נאנט': 'fcnantes.com',
  'אנז\'ה': 'angers-sco.fr',
  'אוקסר': 'aja.fr',
  'לה האבר': 'lehavreac.fr',
  'מץ': 'fcmetz.com',
  'לוריאן': 'fclweb.fr',
  'פריז': 'parisfc.fr',

  // פורטוגל - Primeira Liga
  'בנפיקה': 'slbenfica.pt',
  'ספורטינג ליסבון': 'sporting.pt',
  'פורטו': 'fcporto.pt',
  'בראגה': 'scbraga.pt',
  'ויטוריה דה גימאראיש': 'vitoriasc.pt',
  'קאזה פיה': 'casapia.pt',
  'סנטה קלרה': 'cdsantaclara.pt',
  'מוריירנסה': 'moreirensefc.pt',
  'פאמאליקאו': 'fcfamalicao.pt',
  'ז\'יל ויסנטה': 'gilvicentefc.pt',
  'ריו אווה': 'rioavefc.pt',
  'בואוויסטה': 'boavistafc.pt',
  'ארומטיקה': 'fcarouca.eu',
  'נסיונל': 'cdnacional.pt',
  'אסטרלה אמאדורה': 'cfeestrela.pt',
  'אווש': 'cdaves.pt',
  'פארנסה': 'scfarense.pt',
  'אסטוריל': 'estorilpraia.pt',

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
  'בית"ר ירושלים': 'beitar-jerusalem.org.il',
  'הפועל תל אביב': 'hapoel-tlv.co.il',
  'מכבי חיפה': 'mhaifafc.com',
  'מכבי נתניה': 'maccabi-net.co.il',
  'הפועל ירושלים': 'hjfc.co.il',
  'הפועל חיפה': 'hapoelhaifa.co.il',
  'עירוני קרית שמונה': 'iturank8.co.il',
  'עירוני טבריה': 'idtiberias.com',
  'בני סכנין': 'abna-sakhnin.com',
  'מ.ס. אשדוד': 'fcashdod.co.il',
  'הפועל פתח תקווה': 'hapoelpt.com',
  'מכבי בני ריינה': 'maccabireina.co.il',

};

// === דגלים לנבחרות - קוד ISO לדגל אנימטיבי ===
// CDN: https://animated-country-flags.malith.dev/webp/{CODE}.webp
const TEAM_FLAGS = {
  // אירופה - UEFA
  'אנגליה': 'GB',
  'סקוטלנד': 'GB',
  'וויילס': 'GB',
  'צפון אירלנד': 'GB',
  'אירלנד': 'IE',
  'ספרד': 'ES',
  'צרפת': 'FR',
  'גרמניה': 'DE',
  'איטליה': 'IT',
  'פורטוגל': 'PT',
  'הולנד': 'NL',
  'בלגיה': 'BE',
  'קרואטיה': 'HR',
  'דנמרק': 'DK',
  'שוודיה': 'SE',
  'נורווגיה': 'NO',
  'פינלנד': 'FI',
  'שווייץ': 'CH',
  'אוסטריה': 'AT',
  'פולין': 'PL',
  'צ\'כיה': 'CZ',
  'סלובקיה': 'SK',
  'הונגריה': 'HU',
  'רומניה': 'RO',
  'בולגריה': 'BG',
  'סרביה': 'RS',
  'בוסניה': 'BA',
  'מונטנגרו': 'ME',
  'צפון מקדוניה': 'MK',
  'סלובניה': 'SI',
  'אלבניה': 'AL',
  'קוסובו': 'XK',
  'יוון': 'GR',
  'טורקיה': 'TR',
  'אוקראינה': 'UA',
  'רוסיה': 'RU',
  'בלארוס': 'BY',
  'גאורגיה': 'GE',
  'ארמניה': 'AM',
  'אזרבייג\'ן': 'AZ',
  'קזחסטן': 'KZ',
  'מולדובה': 'MD',
  'איסלנד': 'IS',
  'לוקסמבורג': 'LU',
  'קפריסין': 'CY',
  'מלטה': 'MT',
  'אסטוניה': 'EE',
  'לטביה': 'LV',
  'ליטא': 'LT',
  'איי פארו': 'FO',
  'אנדורה': 'AD',
  'סן מרינו': 'SM',
  'ליכטנשטיין': 'LI',
  'גיברלטר': 'GI',
  'ישראל': 'IL',

  // דרום אמריקה - CONMEBOL
  'ברזיל': 'BR',
  'ארגנטינה': 'AR',
  'אורוגוואי': 'UY',
  'קולומביה': 'CO',
  'צ\'ילה': 'CL',
  'פרו': 'PE',
  'אקוודור': 'EC',
  'פרגוואי': 'PY',
  'בוליביה': 'BO',
  'ונצואלה': 'VE',

  // צפון ומרכז אמריקה - CONCACAF
  'ארה"ב': 'US',
  'מקסיקו': 'MX',
  'קנדה': 'CA',
  'קוסטה ריקה': 'CR',
  'פנמה': 'PA',
  'הונדורס': 'HN',
  'אל סלבדור': 'SV',
  'גואטמלה': 'GT',
  'ג\'מייקה': 'JM',
  'טרינידד וטובגו': 'TT',
  'האיטי': 'HT',
  'קוראסאו': 'CW',
  'סורינאם': 'SR',

  // אסיה - AFC
  'יפן': 'JP',
  'דרום קוריאה': 'KR',
  'אוסטרליה': 'AU',
  'סעודיה': 'SA',
  'איראן': 'IR',
  'עיראק': 'IQ',
  'קטאר': 'QA',
  'איחוד האמירויות': 'AE',
  'אוזבקיסטן': 'UZ',
  'סין': 'CN',
  'תאילנד': 'TH',
  'ויאטנם': 'VN',
  'הודו': 'IN',
  'ירדן': 'JO',
  'סוריה': 'SY',
  'לבנון': 'LB',
  'פלסטין': 'PS',
  'עומאן': 'OM',
  'בחריין': 'BH',
  'כווית': 'KW',
  'מלזיה': 'MY',
  'אינדונזיה': 'ID',
  'צפון קוריאה': 'KP',
  'טג\'יקיסטן': 'TJ',
  'קירגיזסטן': 'KG',
  'טורקמניסטן': 'TM',
  'בנגלדש': 'BD',
  'פיליפינים': 'PH',
  'סינגפור': 'SG',
  'הונג קונג': 'HK',

  // אפריקה - CAF
  'מרוקו': 'MA',
  'סנגל': 'SN',
  'ניגריה': 'NG',
  'מצרים': 'EG',
  'קמרון': 'CM',
  'גאנה': 'GH',
  'טוניסיה': 'TN',
  'אלג\'יריה': 'DZ',
  'חוף השנהב': 'CI',
  'דרום אפריקה': 'ZA',
  'מאלי': 'ML',
  'בורקינה פאסו': 'BF',
  'קונגו': 'CG',
  'קונגו הדמוקרטית': 'CD',
  'גינאה': 'GN',
  'זמביה': 'ZM',
  'אוגנדה': 'UG',
  'טנזניה': 'TZ',
  'קניה': 'KE',
  'אתיופיה': 'ET',
  'מוזמביק': 'MZ',
  'אנגולה': 'AO',
  'גבון': 'GA',
  'בנין': 'BJ',
  'טוגו': 'TG',
  'ניז\'ר': 'NE',
  'מדגסקר': 'MG',
  'קייפ ורדה': 'CV',
  'רואנדה': 'RW',
  'לוב': 'LY',
  'סודן': 'SD',
  'גמביה': 'GM',
  'מאוריטניה': 'MR',
  'זימבבואה': 'ZW',
  'נמיביה': 'NA',
  'סיירה לאונה': 'SL',
  'גינאה המשוונית': 'GQ',
  'קומורו': 'KM',
  'בוטסואנה': 'BW',
  'מלאווי': 'MW',
  'בורונדי': 'BI',
  'לסוטו': 'LS',
  'אסוואטיני': 'SZ',
  'ליבריה': 'LR',
  'מאוריציוס': 'MU',
  'צ\'אד': 'TD',
  'הרפובליקה המרכז אפריקאית': 'CF',
  'ג\'יבוטי': 'DJ',
  'סומליה': 'SO',
  'אריתריאה': 'ER',
  'דרום סודן': 'SS',

  // אוקיאניה - OFC
  'ניו זילנד': 'NZ',
  'פיג\'י': 'FJ',
  'פפואה גינאה החדשה': 'PG',
  'טהיטי': 'PF',
  'סמואה': 'WS',
  'טונגה': 'TO',
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
  'חטאפה': 'Getafe',
  'לאס פלמאס': 'Las Palmas',
  'ויאדוליד': 'Real Valladolid',
  'אלאבס': 'Deportivo Alaves',
  'לגאנס': 'Leganes',
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
  'פיורנטינה': 'Fiorentina',
  'לאציו': 'Lazio',
  'טורינו': 'Torino',
  'ג\'נואה': 'Genoa',
  'קליארי': 'Cagliari',
  'אודינזה': 'Udinese',
  'פארמה': 'Parma',
  'אמפולי': 'Empoli',
  'מונצה': 'Monza',
  'ורונה': 'Hellas Verona',
  'לצ\'ה': 'Lecce',
  'ונציה': 'Venezia',
  'סאסואולו': 'Sassuolo',
  'סמפדוריה': 'Sampdoria',
  'באיירן מינכן': 'Bayern Munich',
  'דורטמונד': 'Borussia Dortmund',
  'לברקוזן': 'Bayer Leverkusen',
  'לייפציג': 'RB Leipzig',
  'שטוטגרט': 'Stuttgart',
  'פרנקפורט': 'Eintracht Frankfurt',
  'וולפסבורג': 'Wolfsburg',
  'פרייבורג': 'Freiburg',
  'הופנהיים': 'Hoffenheim',
  'מיינץ': 'Mainz',
  'מנשנגלדבאך': 'Borussia Monchengladbach',
  'אוניון ברלין': 'Union Berlin',
  'ורדר ברמן': 'Werder Bremen',
  'אוגסבורג': 'FC Augsburg',
  'קלן': 'FC Koln',
  'סנט פאולי': 'St Pauli',
  'היידנהיים': 'FC Heidenheim',
  'המבורג': 'Hamburg',
  'פריז סן ז\'רמן': 'Paris Saint-Germain',
  'מרסיי': 'Marseille',
  'מונאקו': 'Monaco',
  'ליון': 'Lyon',
  'ליל': 'Lille',
  'ניס': 'Nice',
  'רן': 'Rennes',
  'לאנס': 'Lens',
  'ברסט': 'Brest',
  'סטרסבורג': 'Strasbourg',
  'טולוז': 'Toulouse',
  'נאנט': 'Nantes',
  'אנז\'ה': 'Angers',
  'אוקסר': 'Auxerre',
  'לה האבר': 'Le Havre',
  'מץ': 'Metz',
  'לוריאן': 'Lorient',
  'פריז': 'Paris FC',
  'בנפיקה': 'Benfica',
  'ספורטינג ליסבון': 'Sporting Lisbon',
  'פורטו': 'FC Porto',
  'בראגה': 'Sporting Braga',
  'ויטוריה דה גימאראיש': 'Vitoria Guimaraes',
  'קאזה פיה': 'Casa Pia',
  'סנטה קלרה': 'Santa Clara',
  'מוריירנסה': 'Moreirense',
  'פאמאליקאו': 'Famalicao',
  'ז\'יל ויסנטה': 'Gil Vicente',
  'ריו אווה': 'Rio Ave',
  'בואוויסטה': 'Boavista',
  'ארומטיקה': 'Arouca',
  'נסיונל': 'Nacional',
  'אסטרלה אמאדורה': 'Estrela Amadora',
  'אווש': 'Desportivo Aves',
  'פארנסה': 'Farense',
  'אסטוריל': 'Estoril',
  'אייאקס': 'Ajax',
  'פ.ס.וו': 'PSV Eindhoven',
  'גלאטסראיי': 'Galatasaray',
  'בודה גלימט': 'Bodo Glimt',
  'סלביה פראג': 'Slavia Prague',
  'אולימפיאקוס': 'Olympiacos',
  'קלאב ברוז\'': 'Club Brugge',
  'קראבג': 'Qarabag',
  'מכבי תל אביב': 'Maccabi Tel Aviv',
  'הפועל באר שבע': "Hapoel Be'er Sheva",
  'בית"ר ירושלים': 'Beitar Jerusalem',
  'הפועל תל אביב': 'Hapoel Tel-Aviv',
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
  // איטליה - אלייאסים
  'פירנטינה': 'פיורנטינה',
  'פיורנטנה': 'פיורנטינה',
  'גנואה': 'ג\'נואה',
  'ג\'נובה': 'ג\'נואה',
  'הלאס ורונה': 'ורונה',
  'לאצ\'ו': 'לאציו',
  'לצה': 'לצ\'ה',
  'סאסולו': 'סאסואולו',
  // פורטוגל - אלייאסים
  'פורטו': 'פורטו',
  'FC פורטו': 'פורטו',
  'ויטוריה גימאראיש': 'ויטוריה דה גימאראיש',
  'גימאראיש': 'ויטוריה דה גימאראיש',
  'ויטוריה SC': 'ויטוריה דה גימאראיש',
  'פמאליקאו': 'פאמאליקאו',
  'ז\'יל ויסנטה': 'ז\'יל ויסנטה',
  'גיל ויסנטה': 'ז\'יל ויסנטה',
  'ספורטינג': 'ספורטינג ליסבון',
  'ספורטינג CP': 'ספורטינג ליסבון',
  'ספורטינג פורטוגל': 'ספורטינג ליסבון',
  'ריו אבה': 'ריו אווה',
  'ריו-אווה': 'ריו אווה',
  'אסטרלה': 'אסטרלה אמאדורה',
  'אסטרלה דה אמאדורה': 'אסטרלה אמאדורה',
  // ספרד - אלייאסים
  'גטאפה': 'חטאפה',
  'חטפה': 'חטאפה',
  'ולאדוליד': 'ויאדוליד',
  'ואיאדוליד': 'ויאדוליד',
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
  'ביתר ירושלים': 'בית"ר ירושלים',
  'בית"ר': 'בית"ר ירושלים',
  'עירוני קריית שמונה': 'עירוני קרית שמונה',
  'קריית שמונה': 'עירוני קרית שמונה',
  'קרית שמונה': 'עירוני קרית שמונה',
  'סכנין': 'בני סכנין',
  'בני סחנין': 'בני סכנין',
  'הפועל פתח תקוה': 'הפועל פתח תקווה',
  'הפועל פ"ת': 'הפועל פתח תקווה',
  'ארוקה': 'ארומטיקה',
  'ארואוקה': 'ארומטיקה',
  'arouca': 'ארומטיקה',
  'טבריה': 'עירוני טבריה',
  'הפועל ב"ש': 'הפועל באר שבע',
  'באר שבע': 'הפועל באר שבע',
  'מכבי ת"א': 'מכבי תל אביב',
  'הפועל ת"א': 'הפועל תל אביב',
  'מכבי חיפה fc': 'מכבי חיפה',
  'ריינה': 'מכבי בני ריינה',
  'בני ריינה': 'מכבי בני ריינה',
  'אשדוד': 'מ.ס. אשדוד',
  'מ.ס אשדוד': 'מ.ס. אשדוד',
  'ms אשדוד': 'מ.ס. אשדוד',

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

// === כתובות ישירות לסמלי קבוצות (TheSportsDB R2 CDN) ===
// לקבוצות שגוגל לא מציג favicon עבורן (בעיקר ישראל)
const TEAM_DIRECT_URLS = {
  'מכבי תל אביב': 'https://r2.thesportsdb.com/images/media/team/badge/lh08ob1625167121.png',
  'הפועל באר שבע': 'https://r2.thesportsdb.com/images/media/team/badge/978vgx1579019997.png',
  'בית"ר ירושלים': 'https://r2.thesportsdb.com/images/media/team/badge/bq7vys1639433460.png',
  'הפועל תל אביב': 'https://r2.thesportsdb.com/images/media/team/badge/viqboc1579020034.png',
  'מכבי חיפה': 'https://r2.thesportsdb.com/images/media/team/badge/t73b501639433206.png',
  'מכבי נתניה': 'https://r2.thesportsdb.com/images/media/team/badge/xqrw8z1639430750.png',
  'הפועל ירושלים': 'https://r2.thesportsdb.com/images/media/team/badge/cvh4ec1639431062.png',
  'הפועל חיפה': 'https://r2.thesportsdb.com/images/media/team/badge/ytmoe71639433126.png',
  'עירוני קרית שמונה': 'https://r2.thesportsdb.com/images/media/team/badge/401ntu1579020023.png',
  'עירוני טבריה': 'https://r2.thesportsdb.com/images/media/team/badge/78q5ez1656067666.png',
  'בני סכנין': 'https://r2.thesportsdb.com/images/media/team/badge/kbgr2l1639433190.png',
  'מ.ס. אשדוד': 'https://r2.thesportsdb.com/images/media/team/badge/ccwrfk1715765767.png',
  'הפועל פתח תקווה': 'https://r2.thesportsdb.com/images/media/team/badge/agaems1617289236.png',
  'מכבי בני ריינה': 'https://r2.thesportsdb.com/images/media/team/badge/b97dj21664188696.png',
};

/**
 * מחזיר URL סטטי - מיידי, ללא async
 * סדר: כתובת ישירה (TheSportsDB R2) → Google Favicon
 */
function getTeamLogoUrl(teamName, size = 64) {
  const canonical = normalizeTeamName(teamName);
  const directUrl = TEAM_DIRECT_URLS[canonical];
  if (directUrl) return directUrl;
  const domain = TEAM_DOMAINS[canonical];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

const LOGO_CACHE_PREFIX = 'team_logo_';

/**
 * חיפוש אסינכרוני של סמל קבוצה
 * סדר: כתובת ישירה (תמיד מנצחת) → cache → Google Favicon
 */
async function fetchTeamLogoUrl(teamName) {
  const canonical = normalizeTeamName(teamName);
  const cacheKey = LOGO_CACHE_PREFIX + canonical;

  // 1. כתובת ישירה - תמיד מנצחת (גם על cache ישן)
  const directUrl = TEAM_DIRECT_URLS[canonical];
  if (directUrl) {
    try { localStorage.setItem(cacheKey, directUrl); } catch (e) {}
    return directUrl;
  }

  // 2. Cache - אם תקין
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) {
      if (cached === '') return null;
      // קאש מה-API הישן של TheSportsDB (לא r2.thesportsdb.com) - לא אמין
      if (cached.includes('thesportsdb.com') && !cached.includes('r2.thesportsdb.com')) {
        localStorage.removeItem(cacheKey);
      } else {
        return cached;
      }
    }
  } catch (e) { /* localStorage לא זמין */ }

  // 3. Google Favicon - לקבוצות אירופאיות
  const domain = TEAM_DOMAINS[canonical];
  if (domain) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    try { localStorage.setItem(cacheKey, faviconUrl); } catch (e) {}
    return faviconUrl;
  }

  // לא נמצא
  try { localStorage.setItem(cacheKey, ''); } catch (e) {}
  return null;
}

/**
 * מחזיר URL לדגל אנימטיבי אם הקבוצה היא נבחרת
 */
function getTeamFlag(teamName) {
  const canonical = normalizeTeamName(teamName);
  const code = TEAM_FLAGS[canonical];
  if (!code) return null;
  return `https://animated-country-flags.malith.dev/webp/${code}.webp`;
}

const normalizeEnglish = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[.\-_']/g, '').trim();

const REVERSE_TEAM_NAMES = (() => {
  const map = {};
  for (const [hebrew, english] of Object.entries(TEAM_ENGLISH)) {
    map[normalizeEnglish(english)] = hebrew;
  }
  return map;
})();

/**
 * חיפוש שם קבוצה בעברית לפי שם באנגלית מ-API חיצוני
 * אם לא נמצא - מחזיר את המקור
 */
function getHebrewNameByEnglish(englishName) {
  if (!englishName) return englishName;
  const normalized = normalizeEnglish(englishName);
  if (REVERSE_TEAM_NAMES[normalized]) return REVERSE_TEAM_NAMES[normalized];
  for (const key of Object.keys(REVERSE_TEAM_NAMES)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return REVERSE_TEAM_NAMES[key];
    }
  }
  return englishName;
}

export { getTeamLogoUrl, fetchTeamLogoUrl, normalizeTeamName, getTeamFlag, getHebrewNameByEnglish, TEAM_ENGLISH };
