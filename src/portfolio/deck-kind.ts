/** True on deck v2 (portfolio-v2.html marks <html data-deck="v2"> before first paint). v2 shows
 *  the live prototype's three places — Device, Network, Gateway — where v1 and v3 keep the
 *  original five planes, so the shared slides branch on this in a few places. */
export const DECK_V2 = typeof document !== "undefined" && document.documentElement.dataset.deck === "v2";
