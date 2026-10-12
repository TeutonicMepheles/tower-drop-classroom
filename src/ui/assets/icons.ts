/** Original vector assets. 24 × 24, currentColor, no external requests. */
const paths = {
  tower: '<path d="m4 7 8-4 8 4-8 4-8-4Zm0 5 8 4 8-4M4 17l8 4 8-4"/>',
  trophy:
    '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  shield:
    '<path d="m12 3 8 3v6c0 4-8 9-8 9S4 16 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  repair:
    '<path d="M5 8H2V3m0 5 5-5m12 5h3V3m0 5-5-5M5 16H2v5m0-5 5 5m12-5h3v5m0-5-5 5"/><path d="M8 8h8v8H8z"/>',
  slow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l-3 2m0-14h6m-3 0v4m6 1 2-2"/>',
  precision: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8"/>',
  perfectRepair:
    '<path d="m12 2 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5ZM3 17l9 5 9-5m-18-4v4m18-4v4"/>',
  steady: '<path d="M3 20h18M6 16h12M8 5h8v7H8zM4 10l3 4m13-4-3 4"/>',
  gift: '<path d="M3 10h18v4H3zM5 14v7h14v-7M12 10v11"/><path d="M12 10S4 9 5 5c1-4 7 1 7 5Zm0 0s8-1 7-5c-1-4-7 1-7 5Z"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
} as const;
export type IconName = keyof typeof paths;
export const icon = (name: IconName): string =>
  `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
