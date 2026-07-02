const LINKS = [
  { name: 'Hub', href: 'https://workinwithai.com' },
  { name: 'LRC Forge', href: 'https://lrc.workinwithai.com' },
  { name: 'Release Forge', href: 'https://release.workinwithai.com' },
  { name: 'AuraMix', href: 'https://aura.workinwithai.com' },
  { name: 'Mix Forge', href: 'https://mix.workinwithai.com' },
  { name: 'HaulForge', href: 'https://haul.workinwithai.com' },
  { name: 'From Song to Strategy', href: 'https://workinwithai.com/#course' },
];

export default function WWAFooter() {
  return (
    <footer className="wwa-footer">
      <div className="wwa-footer__inner">
        <div>
          <a className="wwa-footer__wordmark" href="https://workinwithai.com">
            WORKINWITHAI
          </a>
          <p className="wwa-footer__tagline">AI tools for independent hustlers.</p>
        </div>
        <ul className="wwa-footer__links">
          {LINKS.map((l) => (
            <li key={l.name}>
              <a href={l.href}>{l.name}</a>
            </li>
          ))}
        </ul>
        <p className="wwa-footer__legal">
          &copy; {new Date().getFullYear()} WorkinWithAI. Built by a Master Plumber and working musician.
        </p>
      </div>
    </footer>
  );
}
