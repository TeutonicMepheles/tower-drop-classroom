import type { RewardId } from "@/contracts/game";
/** Symbolic effect diagrams, not numerical previews of live tower geometry. */
const drawings: Record<RewardId, string> = {
  repair:
    '<path d="m18 47 21-11 21 11-21 11-21-11Zm0 0v15l21 11 21-11V47"/><path d="M73 53h18m-5-5 5 5-5 5"/><path d="m102 43 24-13 24 13-24 13-24-13Zm0 0v19l24 13 24-13V43"/><path d="M99 25v-8h12m32 0h10v8" stroke-dasharray="3 4"/>',
  slow: '<path d="M12 37h36M22 49h26M32 61h16" opacity=".45"/><circle cx="93" cy="48" r="28"/><path d="M93 31v17l-13 9m6-45h14m-7 0v8M119 23l7-7"/><path d="m64 75-4 6m66-6 4 6"/>',
  precision:
    '<path d="M30 27V15h24m76 12V15h-24M30 69v12h24m76-12v12h-24" opacity=".55"/><path d="M47 30h65v35H47z" stroke-dasharray="4 4"/><path d="M54 36h52v23H54z"/><path d="M80 22v10m0 30v12M38 48h12m60 0h12"/>',
  shield:
    '<path d="m80 12 30 11v25c0 19-30 37-30 37S50 67 50 48V23l30-11Z"/><path d="m65 46 11 11 20-23"/><path d="M28 25l9 8m-17 17h13m-5 24 9-8m95-41-9 8m17 17h-13m5 24-9-8" opacity=".4"/>',
  perfectRepair:
    '<path d="m80 6 5 13 13 5-13 5-5 13-5-13-13-5 13-5 5-13Z"/><path d="m42 58 38-18 38 18-38 19-38-19Zm0 0v16l38 18 38-18V58"/><path d="M27 52v-14h12m94 14V38h-12" opacity=".5"/>',
  steady:
    '<path d="m32 47 34-18 34 18-34 18-34-18Zm0 0v17l34 18 34-18V47"/><path d="m100 47 25-13 17 9-25 13-17-9Zm0 0v17l17 9 25-13V43" stroke-dasharray="4 4" opacity=".65"/><path d="M133 19c-17-10-37-6-43 7m-2-10 2 10 11-1"/>',
};
export const rewardIllustration = (id: RewardId): string =>
  `<svg class="reward-illustration" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[id]}</svg>`;
