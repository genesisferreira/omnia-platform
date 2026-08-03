import {
  BENEFITS,
  COMMUNITY_NOTICE,
  CTA_LABEL,
  CTA_SECONDARY_LABEL,
  ECOSYSTEM,
  FOOTER_LINKS,
  WHATSAPP_COMMUNITY_URL,
  WHY_NOW,
} from '@/lib/constants'

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 6.3A7.9 7.9 0 0 0 12 4a7.9 7.9 0 0 0-6.8 11.9L4 20l4.2-1.1A8 8 0 1 0 17.6 6.3ZM12 18.5c-1.2 0-2.4-.3-3.4-.9l-.2-.1-2.5.7.7-2.4-.2-.3A6.5 6.5 0 1 1 12 18.5Zm3.6-4.9c-.2-.1-1.2-.6-1.3-.6-.2-.1-.3-.1-.4.1l-.6.7c-.1.1-.2.1-.4 0a5.3 5.3 0 0 1-2.6-2.3c-.2-.3.2-.3.5-1 .1-.1 0-.3 0-.4l-.6-1.4c-.1-.3-.3-.3-.4-.3h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.2 1.5 2.3 3.6 3.2 1.3.6 1.8.6 2.5.5.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2Z" />
    </svg>
  )
}

export function CommunityCta({
  className = 'btn-cta btn-cta--lg',
  label = CTA_LABEL,
}: {
  className?: string
  label?: string
}) {
  return (
    <a
      className={className}
      href={WHATSAPP_COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon />
      {label}
    </a>
  )
}

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        {/* basePath: path absoluto sob /lancamento (evita 404 no Traefik PathPrefix) */}
        <img
          src="/lancamento/logo-omnia.jpg"
          alt="Logo Omnia Frigo"
          width={44}
          height={44}
          className="site-header__logo"
          decoding="async"
        />
        <div>
          <span className="site-header__brand">Omnia Frigo</span>
          <span className="site-header__holding">Holding</span>
        </div>
      </div>
    </header>
  )
}

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__glow" aria-hidden="true" />
      <div className="container">
        <div className="hero__content">
          <p className="hero__eyebrow">Pré-lançamento</p>
          <h1 id="hero-title">O futuro da refrigeração começa aqui.</h1>
          <p className="hero__lead">
            A Omnia Frigo Holding está desenvolvendo um novo ecossistema para transformar a
            engenharia, a educação técnica e a inteligência artificial aplicada ao setor HVAC-R.
          </p>
          <p className="hero__support">
            Entre para a Comunidade Oficial e acompanhe em primeira mão o desenvolvimento da
            plataforma.
          </p>
          <p className="hero__date">Lançamento oficial previsto para o dia 20.</p>
          <p className="hero__raffle-note">
            🎁 No dia do lançamento acontecerá o sorteio de 20 cursos técnicos reconhecidos pelo
            MEC.
          </p>
          <div className="hero__actions">
            <CommunityCta />
          </div>
          <p className="cta-notice">{COMMUNITY_NOTICE}</p>
        </div>
      </div>
    </section>
  )
}

export function LaunchEvent() {
  return (
    <section className="section section--event" aria-labelledby="evento-title">
      <div className="container event-block">
        <div className="event-block__intro">
          <h2 id="evento-title">🎁 Evento Especial de Lançamento</h2>
          <p className="event-block__lead">
            No dia 20 a Omnia Frigo realizará um sorteio exclusivo para os participantes da
            Comunidade Oficial.
          </p>
          <p className="event-block__highlight">
            🎓 20 Cursos Técnicos reconhecidos pelo MEC
          </p>
        </div>

        <div className="event-block__grid">
          <div>
            <p className="event-block__label">O sorteio será destinado a:</p>
            <ul className="event-block__audience">
              <li>MEIs</li>
              <li>Microempresas</li>
              <li>Pequenas Empresas</li>
            </ul>
          </div>
          <div>
            <p className="event-block__label">Como participar</p>
            <ol className="event-block__steps">
              <li>Entre na Comunidade Oficial.</li>
              <li>Permaneça no grupo até o dia do lançamento.</li>
              <li>Aguarde o sorteio oficial.</li>
            </ol>
          </div>
        </div>

        <CommunityCta className="btn-cta" label={CTA_SECONDARY_LABEL} />
      </div>
    </section>
  )
}

export function Benefits() {
  return (
    <section className="section section--mist" aria-labelledby="beneficios-title">
      <div className="container">
        <div className="section__intro">
          <h2 id="beneficios-title">O que a comunidade oferece</h2>
          <p>Acesso antecipado, conteúdo técnico e proximidade com a construção da plataforma.</p>
        </div>
        <ol className="benefits">
          {BENEFITS.map((text, index) => (
            <li className="benefit" key={text}>
              <span className="benefit__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="benefit__text">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Authority() {
  return (
    <section className="section" aria-labelledby="authority-title">
      <div className="container">
        <div className="section__intro section__intro--wide">
          <h2 id="authority-title">Um ecossistema criado para transformar o setor.</h2>
          <p>
            A Omnia Frigo Holding integra educação técnica, engenharia, inteligência artificial e
            inovação para impulsionar profissionais e empresas do mercado HVAC-R.
          </p>
        </div>
        <ul className="ecosystem-grid">
          {ECOSYSTEM.map((item) => (
            <li className="ecosystem-card" key={item.name}>
              <span className="ecosystem-card__role">{item.role}</span>
              <strong className="ecosystem-card__name">{item.name}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function WhyNow() {
  return (
    <section className="section section--mist" aria-labelledby="why-title">
      <div className="container why-now">
        <div className="section__intro">
          <h2 id="why-title">Por que entrar agora?</h2>
          <p>
            Os participantes da Comunidade Oficial acompanham o pré-lançamento com informação
            direta e privilegiada.
          </p>
        </div>
        <ul className="why-list">
          {WHY_NOW.map((item) => (
            <li key={item}>
              <span className="why-list__mark" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="container">
        <h2 id="final-cta-title">Acompanhe o lançamento de perto</h2>
        <p>
          Garanta seu lugar na Comunidade Oficial e receba as comunicações do ecossistema Omnia
          Frigo em primeira mão.
        </p>
        <CommunityCta />
        <p className="cta-notice cta-notice--on-dark">{COMMUNITY_NOTICE}</p>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="site-footer__copy">© Omnia Frigo Holding</p>
        <nav className="site-footer__nav" aria-label="Institucional">
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href} rel="noopener noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export function FloatWhatsApp() {
  return (
    <a
      className="float-wa"
      href={WHATSAPP_COMMUNITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={CTA_LABEL}
    >
      <WhatsAppIcon size={28} />
    </a>
  )
}
