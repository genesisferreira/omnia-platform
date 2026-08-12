import type { FeaturesIconKey } from '@omnia/shared';

type FeatureIconProps = {
  iconKey?: FeaturesIconKey | null;
  className?: string;
};

/**
 * Ícones SVG inline para as iconKeys do FeaturesBlock.
 * Sem dependência externa; decorativo (aria-hidden).
 */
export function FeatureIcon({ iconKey, className = 'h-6 w-6' }: FeatureIconProps) {
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
    case 'multiempresa':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'cms':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h10M4 18h14" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      );
    case 'design':
      return (
        <svg {...common}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
      );
    case 'education':
      return (
        <svg {...common}>
          <path d="M3 9l9-5 9 5-9 5-9-5z" />
          <path d="M7 11.5v4.5c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />
          <path d="M21 9v6" />
        </svg>
      );
    case 'engineering':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
        </svg>
      );
    case 'technology':
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="12" rx="2" />
          <path d="M9 20h6M12 16v4" />
          <path d="M9 9h6M9 12h4" />
        </svg>
      );
    case 'services':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-1.9-1.9 2-2.1z" />
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
