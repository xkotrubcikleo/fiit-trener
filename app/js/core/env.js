// Režim behu. Lokálna appka (node server.mjs) má STATIC = false.
// tools/build-static.mjs pri zostavení zdieľateľnej verzie prepíše tento súbor na STATIC = true:
// vtedy appka nevolá server (/api), dáta berie zo súborov data/*.json a C kód neprekladá.
export const STATIC = false;
