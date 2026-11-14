import type React from 'react';
import { templates, type ThemeColors } from '@/data/templates';

/**
 * The look of an event website, resolved from its saved config: the chosen template, with any
 * colour, typography or layout overrides the organizer made in the builder.
 */
export interface ResolvedWebsiteTheme {
  colors: ThemeColors;
  headingFont: string;
  bodyFont: string;
  buttonRadius: string;
  cardRadius: string;
}

function resolveFont(fontName?: string) {
  switch (fontName) {
    case 'Space Grotesk':
      return 'var(--font-space-grotesk), sans-serif';
    case 'Inter':
      return 'var(--font-inter), sans-serif';
    case 'Plus Jakarta Sans':
    default:
      return 'var(--font-plus-jakarta-sans), sans-serif';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveWebsiteTheme(websiteConfig: any): ResolvedWebsiteTheme {
  const template = templates.find((t) => t.id === websiteConfig?.templateId) || templates[0];
  const theme = websiteConfig?.theme || {};
  const colors: ThemeColors = theme.colors || template.colors;
  const typography = theme.typography || template.typography;
  const layout = theme.layout || template.layout;

  return {
    colors,
    headingFont: resolveFont(typography?.headingFont),
    bodyFont: resolveFont(typography?.bodyFont),
    buttonRadius: layout?.buttonStyle === 'pill' ? '9999px' : layout?.buttonStyle === 'sharp' ? '0px' : '8px',
    cardRadius: layout?.cardStyle === 'elevated' ? '16px' : layout?.cardStyle === 'bordered' ? '12px' : '8px',
  };
}

/**
 * Re-points the app's colour tokens at the website's colours for everything inside the element
 * this style is set on, so pages built with the app's classes (bg-primary, text-on-surface, ...)
 * pick up the event's theme. Used by the public registration page.
 */
export function websiteThemeTokens(theme: ResolvedWebsiteTheme): React.CSSProperties {
  const { colors } = theme;
  const surface = colors.surface || '#FFFFFF';
  return {
    '--color-primary': colors.primary,
    '--color-primary-container': colors.primary,
    '--color-ds-accent': colors.primary,
    '--color-surface-container-lowest': colors.background,
    '--color-surface': surface,
    '--color-on-surface': colors.text,
    '--color-on-surface-variant': colors.muted,
    '--color-outline-variant': colors.border,
    '--color-outline': colors.border,
    '--website-heading-font': theme.headingFont,
    '--website-button-radius': theme.buttonRadius,
    '--website-card-radius': theme.cardRadius,
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: theme.bodyFont,
  } as React.CSSProperties;
}
