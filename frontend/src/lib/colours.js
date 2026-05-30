// Centralised chart colour palette — mirrors Tailwind config tokens.
// Import from here instead of hard-coding hex values in chart components.

export const C = {
  cyan:     '#00D4FF',
  emerald:  '#00C853',
  amber:    '#FFB340',
  red:      '#FF453A',
  redAlt:   '#EF4444',
  grid:     '#191919',
  axis:     '#666',
  surface:  '#1C1C1E',
  bg:       '#0C0C0D',
  border:   '#2C2C2E',
  dim:      '#8E8E93',
  steel:    '#6E6E73',
  purple:   '#BF5AF2',
  blue:     '#0A84FF',
  orange:   '#FF9F0A',
  indigo:   '#5E5CE6',
  mcFill:   'rgba(0,190,220,0.20)',
  emeraldRef: 'rgba(0,200,83,0.2)',
};

export const SECTOR_COLORS = {
  'Financials':             C.amber,
  'Resources':              C.red,
  'Industrials':            C.purple,
  'Consumer Discretionary': C.cyan,
  'Consumer Staples':       '#30D158',
  'Technology':             C.blue,
  'Telecommunications':     C.orange,
  'Real Estate':            C.indigo,
  'Other':                  '#646464',
};

export const CHART_PALETTE = [C.emerald, C.cyan, C.amber, C.purple, C.blue, C.orange];
