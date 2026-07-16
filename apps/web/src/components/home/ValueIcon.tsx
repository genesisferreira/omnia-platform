import type { ValuesIconKey } from '@omnia/shared';

type ValueIconProps = {
  iconKey?: ValuesIconKey | null;
  className?: string;
};

/**
 * Ícones SVG para valores institucionais (allowlist VALUES_ICON_KEYS).
 */
export function ValueIcon({ iconKey, className = 'h-5 w-5' }: ValueIconProps) {
  const common = {
    viewBox: '0 0 24 24',
    className,
    'aria-hidden': true as const,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (iconKey) {
    case 'ethics':
      return (
        <svg {...common}>
          <path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'partnership':
      return (
        <svg {...common}>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M12 15v2" />
        </svg>
      );
    case 'excellence':
      return (
        <svg {...common}>
          <path d="M12 2l2.4 5.8L21 9l-4.5 4 1.2 6.2L12 17l-5.7 2.2L7.5 13 3 9l6.6-1.2L12 2z" />
        </svg>
      );
    case 'innovation':
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z" />
        </svg>
      );
    case 'customer':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      );
    case 'results':
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15V9" />
          <path d="M12 17v-6" />
          <path d="M16 13V7" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
  }
}
