// src/themes.js - קובץ ערכות נושא מרכזי עם תמונות אמיתיות

export const THEMES = {
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
    logo: '🔴⚪', // נשאיר אמוג'י כי קשה למצוא לוגו טוב
    logoType: 'emoji',
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
    logo: '🟠🦇', // נשאיר אמוג'י
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
    logo: '🔴⚪', // נשאיר אמוג'י
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
    logo: 'https://cdn.freebiesupply.com/logos/large/2x/maccabi-haifa-logo-png-transparent.png',
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
    logo: 'https://logos-world.net/wp-content/uploads/2020/12/Maccabi-Tel-Aviv-Logo.png',
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
export const getTheme = (themeName = 'default') => {
  return THEMES[themeName] || THEMES.default;
};

// פונקציה לקבלת רשימת ערכות לפי קטגוריה
export const getThemesByCategory = () => {
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

// פונקציה מעודכנת להחלת ערכת נושא - עם debug משופר
export const applyTheme = (user) => {
  const themeName = user?.theme || 'default';
  const theme = getTheme(themeName);
  
  console.log('🎨 מתחיל להחיל ערכת נושא:', themeName, theme.name, theme.logoType);
  
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-background', theme.colors.background);
  root.style.setProperty('--theme-header-bg', theme.colors.headerBg);
  root.style.setProperty('--theme-text', theme.colors.primary === '#ffffff' ? '#000000' : '#333333');
  root.style.setProperty('--theme-text-light', '#666666');
  
  // טיפול בסמל - תמונה או אמוג'י
  const headerElements = document.querySelectorAll('.header');
  console.log('🔍 מצא', headerElements.length, 'אלמנטים של header');
  
  if (theme.logoType === 'image') {
    console.log('🖼️ מחיל תמונה:', theme.logo);
    root.style.setProperty('--theme-icon', '""');
    root.style.setProperty('--theme-icon-image', `url('${theme.logo}')`);
    
    // הוסף קלאס לתמונות
    headerElements.forEach((header, index) => {
      console.log(`🎯 מוסיף has-image-logo לheader ${index}`);
      header.classList.add('has-image-logo');
    });
    
    console.log('✅ הוחל לוגו תמונה:', theme.logo);
  } else {
    console.log('😀 מחיל אמוג\'י:', theme.logo);
    root.style.setProperty('--theme-icon', `"${theme.logo}"`);
    root.style.setProperty('--theme-icon-image', 'none');
    
    // הסר קלאס לתמונות
    headerElements.forEach((header, index) => {
      console.log(`❌ מסיר has-image-logo מheader ${index}`);
      header.classList.remove('has-image-logo');
    });
    
    console.log('✅ הוחל לוגו אמוג\'י:', theme.logo);
  }
  
  // 🔧 debug - בדוק מה בפועל קרה
  setTimeout(() => {
    const updatedHeaders = document.querySelectorAll('.header');
    console.log('🔍 אחרי עדכון - מצא', updatedHeaders.length, 'headers');
    updatedHeaders.forEach((header, index) => {
      const hasImageClass = header.classList.contains('has-image-logo');
      console.log(`📊 Header ${index}: has-image-logo = ${hasImageClass}`);
    });
    
    const iconValue = root.style.getPropertyValue('--theme-icon');
    const iconImageValue = root.style.getPropertyValue('--theme-icon-image');
    console.log('📊 CSS Variables:', {
      '--theme-icon': iconValue,
      '--theme-icon-image': iconImageValue
    });
  }, 50);
  
  console.log('✅ ערכת נושא הוחלה:', theme.name);
};

// 🔧 פונקציות debug - הוסף בסוף קובץ themes.js (לפני הif של module.exports)

// פונקציה לבדיקה מהירה מהקונסול
export const debugTheme = () => {
  const headers = document.querySelectorAll('.header');
  const root = document.documentElement;
  
  console.log('🔍 Theme Debug Info:');
  console.log('Headers found:', headers.length);
  
  headers.forEach((header, i) => {
    console.log(`Header ${i}:`, {
      hasImageLogo: header.classList.contains('has-image-logo'),
      classes: Array.from(header.classList)
    });
  });
  
  console.log('CSS Variables:', {
    '--theme-icon': root.style.getPropertyValue('--theme-icon'),
    '--theme-icon-image': root.style.getPropertyValue('--theme-icon-image'),
    '--theme-primary': root.style.getPropertyValue('--theme-primary')
  });
  
  return 'Debug complete - check console logs above';
};

// פונקציה לרענון כפוי של ערכת נושא מהקונסול
export const forceApplyTheme = () => {
  const savedUser = localStorage.getItem('football_betting_user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    console.log('🔄 Force applying theme for user:', user.name, user.theme);
    applyTheme(user);
    return 'Theme force applied!';
  } else {
    console.log('❌ No user found in localStorage');
    return 'No user found';
  }
};

// הוסף פונקציות לwindow לשימוש מהקונסול
if (typeof window !== 'undefined') {
  window.debugTheme = debugTheme;
  window.forceApplyTheme = forceApplyTheme;
}

// אם זה Node.js (Backend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { THEMES, getTheme, getThemesByCategory };
}