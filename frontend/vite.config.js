import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // כל קבצי המקור כאן הם .js גם כשיש בהם JSX. Vite קובע איך לפרסר קובץ לפי
  // הסיומת בלבד, ועל .js הוא מריץ loader של JS רגיל שלא יודע לקרוא JSX -
  // ולכן בלי ההגדרה הזו כל קומפוננטה נופלת בבנייה.
  // החלופה היא לשנות סיומת של כ-30 קבצים, וזה לא שווה את זה.
  // שימו לב ל-exclude: ברירת המחדל של Vite היא להחריג .js לגמרי
  // (exclude: /\.js$/), והיא גוברת על include. בלי לאפס אותה במפורש
  // ההגדרה כאן פשוט לא נכנסת לתוקף וה-JSX נשאר כמו שהוא.
  esbuild: {
    include: /src\/.*\.jsx?$/,
    exclude: [],
    loader: 'jsx'
  },

  optimizeDeps: {
    esbuildOptions: { loader: { '.js': 'jsx' } }
  },

  build: {
    // Render מוגדר לפרסם את התיקייה build. שמירה על השם חוסכת שינוי
    // הגדרות בשרת, ובעיקר חוסכת דיפלוי שעולה לתיקייה ריקה.
    outDir: 'build',
    sourcemap: false
  },

  server: {
    port: 3000,
    open: true
  }
});
