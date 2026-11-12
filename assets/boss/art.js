// assets/boss/art.js — images des boss (v5.6.0), écrites par dev/tools/import-boss.js : une entrée par milieu habillé.
// { <milieuId>: { matter (motif répété dans les parois), plate, turret (socle), pump (v5.9.0 : pompe ; tête de pompe pour les barres),
//   pumpTank (cuve de la pompe, fractions de son image) } } — tous facultatifs —, chemins depuis la racine du site. Un rôle absent est
// dessiné par le code.
window.FLOWER_POWER_BOSS_ART = {
  friche: { matter: 'assets/boss/art/friche/matiere.png', plate: 'assets/boss/art/friche/plaque.png', turret: 'assets/boss/art/friche/tourelle.png', pump: 'assets/boss/art/friche/pompe.png', pumpTank: [0.34, 0.34, 0.66, 0.66] },
  industrie: { pump: 'assets/boss/art/industrie/pompe.png', pumpTank: [0.32, 0.37, 0.61, 0.63] },
  decharge: { pump: 'assets/boss/art/decharge/pompe.png' },
  nucleaire: { pump: 'assets/boss/art/nucleaire/pompe.png' }
};
