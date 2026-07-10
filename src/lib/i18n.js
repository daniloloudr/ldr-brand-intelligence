// i18n — camada de tradução do LOUDR (decisão 2026-07-10: foco em PT,
// sistema CONFIGURÁVEL para pt/en/es visando expansão).
// Onda 1: rótulos da navegação. A varredura completa das strings do app é
// workstream próprio (BACKLOG) — toda string NOVA deve nascer passando por t().
// Locale: por enquanto client-side (localStorage); config por workspace no futuro.

const DICT = {
  pt: {
    'nav.home': 'Home',
    'nav.strategy': 'Strategy',
    'nav.strategy.verbal': 'Identidade Verbal',
    'nav.strategy.visual': 'Identidade Visual',
    'nav.strategy.design_system': 'Design System',
    'nav.strategy.positioning': 'Brand Positioning',
    'nav.intelligence': 'Intelligence',
    'nav.intelligence.listening': 'Social Listening',
    'nav.intelligence.content': 'Content Hub',
    'nav.intelligence.ia': 'IA LOUDR',
    'nav.studio': 'Studio',
    'nav.studio.image': 'Image Studio',
    'nav.studio.video': 'Video Studio',
    'nav.studio.writing': 'Writing Room',
    'nav.studio.workflow': 'Workflow',
    'nav.studio.library': 'Biblioteca',
    'nav.copilot': 'Copilot',
  },
  en: {
    'nav.home': 'Home',
    'nav.strategy': 'Strategy',
    'nav.strategy.verbal': 'Verbal Identity',
    'nav.strategy.visual': 'Visual Identity',
    'nav.strategy.design_system': 'Design System',
    'nav.strategy.positioning': 'Brand Positioning',
    'nav.intelligence': 'Intelligence',
    'nav.intelligence.listening': 'Social Listening',
    'nav.intelligence.content': 'Content Hub',
    'nav.intelligence.ia': 'LOUDR AI',
    'nav.studio': 'Studio',
    'nav.studio.image': 'Image Studio',
    'nav.studio.video': 'Video Studio',
    'nav.studio.writing': 'Writing Room',
    'nav.studio.workflow': 'Workflow',
    'nav.studio.library': 'Library',
    'nav.copilot': 'Copilot',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.strategy': 'Strategy',
    'nav.strategy.verbal': 'Identidad Verbal',
    'nav.strategy.visual': 'Identidad Visual',
    'nav.strategy.design_system': 'Design System',
    'nav.strategy.positioning': 'Brand Positioning',
    'nav.intelligence': 'Intelligence',
    'nav.intelligence.listening': 'Social Listening',
    'nav.intelligence.content': 'Content Hub',
    'nav.intelligence.ia': 'IA LOUDR',
    'nav.studio': 'Studio',
    'nav.studio.image': 'Image Studio',
    'nav.studio.video': 'Video Studio',
    'nav.studio.writing': 'Writing Room',
    'nav.studio.workflow': 'Workflow',
    'nav.studio.library': 'Biblioteca',
    'nav.copilot': 'Copilot',
  },
}

const STORAGE_KEY = 'loudr-locale'
export const LOCALES = ['pt', 'en', 'es']

export function getLocale() {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return LOCALES.includes(saved) ? saved : 'pt'
}

export function setLocale(locale) {
  if (LOCALES.includes(locale)) localStorage.setItem(STORAGE_KEY, locale)
}

/** Traduz uma chave no locale atual — fallback: pt → a própria chave. */
export function t(key) {
  const locale = getLocale()
  return DICT[locale]?.[key] ?? DICT.pt[key] ?? key
}
