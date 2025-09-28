// backend/themes.js - קובץ ערכות נושא לשרת עם תמונות אמיתיות

const THEMES = {
  default: {
    name: 'בסיסי',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d',
      accent: '#28a745',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)'
    },
    logo: '⚽',
    logoType: 'emoji',
    category: 'בסיסי'
  },

  // פרמיירליג - עם לוגואים אמיתיים
  manchester_united: {
    name: 'מנצ\'סטר יונייטד',
    colors: {
      primary: '#DA020E',
      secondary: '#FFE500',
      accent: '#DA020E',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #DA020E 0%, #FFE500 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/manchester-united-logo-png-transparent.png',
    logoType: 'image',
    category: 'פרמיירליג'
  },

  liverpool: {
    name: 'ליברפול',
    colors: {
      primary: '#C8102E',
      secondary: '#F6EB61',
      accent: '#00B2A9',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #C8102E 0%, #F6EB61 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/liverpool-fc-logo-png-transparent.png',
    logoType: 'image',
    category: 'פרמיירליג'
  },

  chelsea: {
    name: 'צ\'לסי',
    colors: {
      primary: '#034694',
      secondary: '#DBA111',
      accent: '#034694',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #034694 0%, #DBA111 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/chelsea-fc-logo-png-transparent.png',
    logoType: 'image',
    category: 'פרמיירליג'
  },

  arsenal: {
    name: 'ארסנל',
    colors: {
      primary: '#EF0107',
      secondary: '#023474',
      accent: '#9C824A',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #EF0107 0%, #023474 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/arsenal-fc-logo-png-transparent.png',
    logoType: 'image',
    category: 'פרמיירליג'
  },

  manchester_city: {
    name: 'מנצ\'סטר סיטי',
    colors: {
      primary: '#6CABDD',
      secondary: '#1C2C5B',
      accent: '#FFCE00',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #6CABDD 0%, #1C2C5B 100%)'
    },
    logo: 'https://football-logos.cc/logos/england/700x700/manchester-city.png',
    logoType: 'image',
    category: 'פרמיירליג'
  },

  tottenham: {
    name: 'טוטנהאם',
    colors: {
      primary: '#132257',
      secondary: '#ffffff',
      accent: '#132257',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #132257 0%, #ffffff 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/tottenham-hotspur-logo-png-transparent.png',
    logoType: 'image',
    category: 'פרמיירליג'
  },

  // לה ליגה - עם לוגואים אמיתיים
  real_madrid: {
    name: 'ריאל מדריד',
    colors: {
      primary: '#ffffff',
      secondary: '#FEBE10',
      accent: '#00529F',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #ffffff 0%, #FEBE10 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/real-madrid-logo-png-transparent.png',
    logoType: 'image',
    category: 'לה ליגה'
  },

  barcelona: {
    name: 'ברצלונה',
    colors: {
      primary: '#A50044',
      secondary: '#004D98',
      accent: '#EDBB00',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #A50044 0%, #004D98 100%)'
    },
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/fc-barcelona-logo-png-transparent.png',
    logoType: 'image',
    category: 'לה ליגה'
  },

  atletico_madrid: {
    name: 'אתלטיקו מדריד',
    colors: {
      primary: '#CE3524',
      secondary: '#ffffff',
      accent: '#1A237E',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #CE3524 0%, #ffffff 100%)'
    },
    logo: 'https://upload.wikimedia.org/wikipedia/he/f/f9/Atletico_Madrid_Logo_2024.svg',
    logoType: 'image',
    category: 'לה ליגה'
  },

  valencia: {
    name: 'ולנסיה',
    colors: {
      primary: '#FF6600',
      secondary: '#000000',
      accent: '#ffffff',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #FF6600 0%, #000000 100%)'
    },
    logo: '🟠🦇',
    logoType: 'emoji',
    category: 'לה ליגה'
  },

  sevilla: {
    name: 'סביליה',
    colors: {
      primary: '#D4001F',
      secondary: '#ffffff',
      accent: '#D4001F',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #D4001F 0%, #ffffff 100%)'
    },
    logo: '🔴⚪',
    logoType: 'emoji',
    category: 'לה ליגה'
  },

  // נבחרות - דגלים
  brazil: {
    name: 'ברזיל',
    colors: {
      primary: '#FEDF00',
      secondary: '#009B3A',
      accent: '#002776',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #FEDF00 0%, #009B3A 100%)'
    },
    logo: '🇧🇷',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  argentina: {
    name: 'ארגנטינה',
    colors: {
      primary: '#74ACDF',
      secondary: '#ffffff',
      accent: '#F6B40E',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #74ACDF 0%, #ffffff 100%)'
    },
    logo: '🇦🇷',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  germany: {
    name: 'גרמניה',
    colors: {
      primary: '#000000',
      secondary: '#DD0000',
      accent: '#FFCE00',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #000000 0%, #DD0000 50%, #FFCE00 100%)'
    },
    logo: '🇩🇪',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  france: {
    name: 'צרפת',
    colors: {
      primary: '#0055A4',
      secondary: '#EF4135',
      accent: '#ffffff',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #0055A4 0%, #EF4135 100%)'
    },
    logo: '🇫🇷',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  italy: {
    name: 'איטליה',
    colors: {
      primary: '#009246',
      secondary: '#ffffff',
      accent: '#CE2B37',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #009246 0%, #CE2B37 100%)'
    },
    logo: '🇮🇹',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  spain: {
    name: 'ספרד',
    colors: {
      primary: '#AA151B',
      secondary: '#F1BF00',
      accent: '#AA151B',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #AA151B 0%, #F1BF00 100%)'
    },
    logo: '🇪🇸',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  england: {
    name: 'אנגליה',
    colors: {
      primary: '#ffffff',
      secondary: '#CE1124',
      accent: '#012169',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #ffffff 0%, #CE1124 100%)'
    },
    logo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  portugal: {
    name: 'פורטוגל',
    colors: {
      primary: '#006600',
      secondary: '#FF0000',
      accent: '#FFD700',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #006600 0%, #FF0000 100%)'
    },
    logo: '🇵🇹',
    logoType: 'emoji',
    category: 'נבחרות'
  },

  // ליגת העל הישראלית 🇮🇱 - עם לוגואים מתוקנים
  maccabi_haifa: {
    name: 'מכבי חיפה',
    colors: {
      primary: '#0F7B0F',
      secondary: '#ffffff',
      accent: '#228B22',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #0F7B0F 0%, #228B22 100%)'
    },
    logo: 'https://logos-world.net/wp-content/uploads/2020/12/Maccabi-Haifa-Logo.png',
    logoType: 'image',
    category: 'ליגת העל הישראלית'
  },

  maccabi_tel_aviv: {
    name: 'מכבי תל אביב',
    colors: {
      primary: '#FFD700',
      secondary: '#0047AB',
      accent: '#FFD700',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #FFD700 0%, #0047AB 100%)'
    },
    logo: 'https://maccabi.co.il/mtpic/logos/maccabi%20logo%20300.png',
    logoType: 'image',
    category: 'ליגת העל הישראלית'
  },

  hapoel_tel_aviv: {
    name: 'הפועל תל אביב',
    colors: {
      primary: '#DC143C',
      secondary: '#ffffff',
      accent: '#B22222',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #DC143C 0%, #B22222 100%)'
    },
    logo: 'https://www.htafc.co.il/wp-content/uploads/2024/07/team-logo-hapoel-01.png',
    logoType: 'image',
    category: 'ליגת העל הישראלית'
  }
};

// פונקציה לקבלת ערכת נושא
const getTheme = (themeName = 'default') => {
  return THEMES[themeName] || THEMES.default;
};

// פונקציה לקבלת רשימת ערכות לפי קטגוריה
const getThemesByCategory = () => {
  const categories = {};
  Object.entries(THEMES).forEach(([key, theme]) => {
    const category = theme.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ key, ...theme });
  });
  return categories;
};

// ייצוא עבור Node.js
module.exports = { THEMES, getTheme, getThemesByCategory };