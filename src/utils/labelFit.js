/**
 * Libellés courts sous une pastille (catégories) : un mot seul tient sur une ligne
 * en réduisant la police, au lieu d'être coupé en plein mot (« Électroménage / r »).
 */
export const labelFit = (name = '') =>
  /\s/.test(String(name).trim())
    ? { numberOfLines: 2 }
    : { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7 };
