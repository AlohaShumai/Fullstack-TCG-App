import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLayoutEffect, useRef, useState } from 'react';

const NAV_LINKS = [
  { label: 'Dashboard',    path: '/' },
  { label: 'Browse Cards', path: '/cards' },
  { label: 'Collection',   path: '/collection' },
  { label: 'Decks',        path: '/decks' },
  { label: 'Deck Advisor', path: '/advisor' },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const didMount = useRef(false);

  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [pillVisible, setPillVisible] = useState(false);
  const [pillAnimate, setPillAnimate] = useState(false);

  const activeIndex = NAV_LINKS.findIndex((l) =>
    l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path)
  );

  useLayoutEffect(() => {
    const el = linkRefs.current[activeIndex];
    if (!el) return;

    const pos = { left: el.offsetLeft, width: el.offsetWidth };

    if (!didMount.current) {
      // First render: snap pill to correct position before paint, no animation
      didMount.current = true;
      setPillStyle(pos);
      setPillVisible(true);
      // After the first frame is painted, enable animation for future clicks
      requestAnimationFrame(() => setPillAnimate(true));
    } else {
      // Subsequent route changes: slide to new position
      setPillStyle(pos);
    }
  }, [activeIndex]);

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold text-slate-100 mr-4 flex-shrink-0">
          TCG App
        </Link>

        {/* Nav links with sliding pill */}
        <div className="relative flex items-center">
          {/* Sliding pill */}
          {pillVisible && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-8 rounded-full pointer-events-none"
              style={{
                left: pillStyle.left,
                width: pillStyle.width,
                background: 'rgba(99, 102, 241, 0.25)',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                transition: pillAnimate ? 'left 0.3s ease, width 0.3s ease' : 'none',
              }}
            />
          )}

          {NAV_LINKS.map((link, i) => {
            const isActive = i === activeIndex;
            return (
              <Link
                key={link.path}
                to={link.path}
                ref={(el) => { linkRefs.current[i] = el; }}
                className="relative z-10 px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap"
                style={{
                  color: isActive ? '#f1f5f9' : '#94a3b8',
                  transition: 'color 0.2s ease',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <Link
            to="/profile"
            className="text-slate-400 hover:text-slate-100 text-xs hidden sm:block transition"
          >
            {user?.username}
          </Link>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
