import React from 'react';
import useTabRoute from '../../services/useTabRoute';

// לשוניות משנה בתוך לשונית ראשית (למשל מערכת ← לוגים). גם הן בכתובת,
// כדי שקישור, רענון וכפתור "חזור" ינחתו בדיוק באותו מקום.
//
// tabs: [{ key, label, icon, badge }]
function SubTabs({ parent, tabs, children }) {
  const keys = tabs.map((t) => t.key);
  const [active, setActive] = useTabRoute(keys, keys[0], { prefix: `admin/${parent}` });

  return (
    <div>
      {tabs.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {tabs.map((t) => {
            const on = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                style={{
                  position: 'relative', flexShrink: 0, padding: '6px 12px', borderRadius: '999px', cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--theme-primary, #007bff)' : 'var(--border-2, #e3e6ea)'}`,
                  background: on ? 'var(--theme-primary, #007bff)' : 'var(--surface, #fff)',
                  color: on ? '#fff' : 'var(--text-2, #555)', fontWeight: on ? 700 : 500, fontSize: 'var(--fs-sm)'
                }}
              >
                {t.icon} {t.label}
                {t.badge > 0 && (
                  <span style={{
                    marginInlineStart: '6px', background: '#ff3b30', color: '#fff', borderRadius: '999px',
                    fontSize: 'var(--fs-xs)', padding: '1px 6px', fontWeight: 700
                  }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {children(active)}
    </div>
  );
}

export default SubTabs;
