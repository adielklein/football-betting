import React from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

// תקלה במסך אחד לא מפילה את כל האפליקציה.
//
// בלי זה, שגיאה בזמן ציור של רכיב כלשהו מוחקת את כל העץ של React, ומה
// שנשאר הוא דף ריק - בלי כפתורים, בלי הסבר, ובלי דרך לדעת מה קרה. כאן רק
// החלק התקול מוחלף בהודעה, והשגיאה נשלחת ללוג של השרת (לשונית "לוגים"),
// כי למכשיר של השחקן אין לנו גישה.

// דיווח לשרת - במאמץ מינימלי, ולעולם לא זורק
const report = (screen, error) => {
  try {
    fetch(`${API_URL}/logs/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screen,
        message: String(error?.message || error).slice(0, 300),
        stack: String(error?.stack || '').split('\n').slice(0, 4).join('\n').slice(0, 600),
        url: window.location.hash
      })
    }).catch(() => {});
  } catch {
    // אין רשת / אין טוקן - ההודעה במסך עדיין מוצגת
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`💥 [UI] ${this.props.name || 'מסך'}:`, error, info?.componentStack);
    report(this.props.name || 'unknown', error);
  }

  // מעבר ללשונית אחרת (resetKey משתנה) מנסה שוב מאפס
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const full = this.props.fullScreen;
    return (
      <div role="alert" style={{
        margin: full ? '0' : '0.5rem 0', padding: full ? '3rem 1.25rem' : '1.25rem',
        minHeight: full ? '100vh' : undefined, boxSizing: 'border-box',
        background: 'var(--surface, #fff)', borderRadius: full ? 0 : '14px',
        border: full ? 'none' : '1px solid var(--border, #e6e9ee)', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: full ? 'center' : 'flex-start'
      }}>
        <div style={{ fontSize: '36px', marginBottom: '0.4rem' }}>😕</div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text, #222)' }}>
          {full ? 'משהו השתבש' : 'משהו השתבש במסך הזה'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-3, #777)', margin: '0.35rem 0 1rem', maxWidth: '320px' }}>
          {full
            ? 'רענון הדף בדרך כלל פותר את זה. ההימורים והניקוד שמורים בשרת.'
            : 'שאר האפליקציה ממשיכה לעבוד. אפשר לנסות שוב או לעבור ללשונית אחרת.'}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {!full && (
            <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
              נסה שוב
            </button>
          )}
          <button type="button" className={full ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => window.location.reload()}>
            רענן את הדף
          </button>
        </div>
        {/* הטקסט הטכני - כדי שצילום מסך של התקלה יגיד מה קרה */}
        <div dir="ltr" style={{
          marginTop: '1rem', fontSize: '10px', color: 'var(--text-4, #aaa)', fontFamily: 'monospace',
          maxWidth: '100%', overflowWrap: 'anywhere'
        }}>
          {String(error?.message || error).slice(0, 160)}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
