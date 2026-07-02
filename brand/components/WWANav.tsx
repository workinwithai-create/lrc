'use client';

import { useEffect, useRef, useState } from 'react';

const TOOLS = [
  { name: 'LRC Forge', href: 'https://lrc.workinwithai.com' },
  { name: 'Release Forge', href: 'https://release.workinwithai.com' },
  { name: 'AuraMix', href: 'https://aura.workinwithai.com' },
  { name: 'Mix Forge', href: 'https://mix.workinwithai.com' },
  { name: 'HaulForge', href: 'https://haul.workinwithai.com' },
];

export default function WWANav({ currentApp }: { currentApp: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <nav className="wwa-nav" aria-label="WorkinWithAI">
      <a className="wwa-nav__wordmark" href="https://workinwithai.com">
        WORKINWITHAI
      </a>
      <div className="wwa-nav__right">
        <span className="wwa-nav__app">{currentApp}</span>
        <div className="wwa-nav__tools" ref={rootRef}>
          <button
            type="button"
            className="wwa-nav__tools-btn"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Tools
          </button>
          {open && (
            <div className="wwa-nav__menu" role="menu">
              {TOOLS.map((t) => (
                <a key={t.name} href={t.href} role="menuitem">
                  {t.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
