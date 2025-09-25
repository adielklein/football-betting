// backend/themes.js - קובץ ערכות נושא לשרת

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
    category: 'בסיסי'
  },

  // פרמיירליג
  manchester_united: {
    name: 'מנצ\'סטר יונייטד',
    colors: {
      primary: '#DA020E',
      secondary: '#FFE500',
      accent: '#DA020E',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #DA020E 0%, #FFE500 100%)'
    },
    logo: '👹',
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
    logo: '🐦',
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
    logo: '🦁',
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
    logo: '🔴',
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
    logo: '💙',
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
    logo: '🐓',
    category: 'פרמיירליג'
  },

  // לה ליגה
  real_madrid: {
    name: 'ריאל מדריד',
    colors: {
      primary: '#ffffff',
      secondary: '#FEBE10',
      accent: '#00529F',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #ffffff 0%, #FEBE10 100%)'
    },
    logo: '👑',
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
    logo: '🔵',
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
    logo: '🔺',
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
    logo: '🦇',
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
    logo: '⚪',
    category: 'לה ליגה'
  },

  // נבחרות
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
    category: 'נבחרות'
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

module.exports = { THEMES, getTheme, getThemesByCategory };