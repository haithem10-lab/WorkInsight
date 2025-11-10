export const palette = {
  background: {
    primary: ['#02081B', '#040B2C', '#071241'],
    card: 'rgba(18, 27, 60, 0.85)',
    pill: 'rgba(64, 72, 133, 0.4)',
    glow: 'rgba(22, 119, 255, 0.35)'
  },
  text: {
    primary: '#E2E8F0',
    secondary: 'rgba(226, 232, 240, 0.7)',
    accent: '#7AB5FF',
    badge: '#94A3B8'
  },
  gradient: {
    accent: ['#7C8FFE', '#9F76FF', '#B45BFF'],
    cta: ['#5C86FF', '#58B1FF']
  },
  chart: ['#4FC2FF', '#64A5FF', '#7782FF', '#8A63FF'],
  borders: {
    subtle: 'rgba(148, 163, 184, 0.15)'
  }
} as const;

export const typography = {
  hero: 36,
  subtitle: 16,
  badge: 12
};
