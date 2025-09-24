import React, { useEffect } from 'react';
import { getTheme } from '../themes';

function ThemeProvider({ user, children }) {
  
  useEffect(() => {
    // קבל ערכת הנושא של המשתמש
    const userTheme = user?.theme || 'default';
    const theme = getTheme(userTheme);
    
    console.log('🎨 מחיל ערכת נושא:', userTheme, theme);
    
    // החל CSS variables על ה-root
    const root = document.documentElement;
    
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-header-bg', theme.colors.headerBg);
    root.style.setProperty('--theme-icon', `"${theme.icon}"`);
    
    // צבעים נוספים מחושבים
    root.style.setProperty('--theme-text', theme.colors.primary === '#ffffff' ? '#000000' : '#333333');
    root.style.setProperty('--theme-text-light', theme.colors.primary === '#ffffff' ? '#666666' : '#666666');
    
  }, [user?.theme]);

  // אם אין משתמש מחובר, השתמש בערכת נושא בסיסית
  useEffect(() => {
    if (!user) {
      const defaultTheme = getTheme('default');
      const root = document.documentElement;
      
      root.style.setProperty('--theme-primary', defaultTheme.colors.primary);
      root.style.setProperty('--theme-secondary', defaultTheme.colors.secondary);
      root.style.setProperty('--theme-accent', defaultTheme.colors.accent);
      root.style.setProperty('--theme-background', defaultTheme.colors.background);
      root.style.setProperty('--theme-header-bg', defaultTheme.colors.headerBg);
      root.style.setProperty('--theme-icon', `"${defaultTheme.icon}"`);
      root.style.setProperty('--theme-text', '#333333');
      root.style.setProperty('--theme-text-light', '#666666');
      
      console.log('🎨 החיל ערכת נושא בסיסית (אין משתמש מחובר)');
    }
  }, [user]);

  return <>{children}</>;
}

export default ThemeProvider;