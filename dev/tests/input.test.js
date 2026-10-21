FP.test('input: conversion écran → monde sous zoom', () => {
  FP.assertEqual(FP.input.toWorldX(300, 1, 220), 300);
  FP.assertEqual(FP.input.toWorldX(300, 1.18, 220), 220 + 80 / 1.18);
});
FP.test('input: point focal borné', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  s.plant.tip = { x: 5, y: 500 };
  FP.assertEqual(FP.input.focalX(s), 440 * .22);
});
FP.test('input: front montant une seule frame', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.input._inject({ x: 100, y: 200, down: true });
  FP.input.update(s); FP.assert(s.input.pressed && s.input.down);
  FP.input.update(s); FP.assert(!s.input.pressed && s.input.down);
  FP.input._inject({ down: false }); FP.input.update(s); FP.assert(!s.input.down);
});
FP.test('input: point focal sur la graine quand la pousse n’est pas lancée', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  s.plant.tip = null; s.plant.seed = { x: 120, y: 1700 };
  FP.assertEqual(FP.input.focalX(s), 120);
});
FP.test('input: chaque nouvel appui compte, même si un autre pointeur est déjà enfoncé', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.input._inject({ x: 100, y: 200, down: true }); FP.input.update(s);
  FP.input._inject({ x: 150, y: 220, down: true }); FP.input.update(s);
  FP.assert(s.input.pressed, 'second appui ignoré');
  FP.input._inject({ down: false }); FP.input.update(s);
});
FP.test('input: une touche appuie sans maintenir', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.input._inject({ down: false }); FP.input.update(s);
  FP.input.press(); FP.input.update(s);
  FP.assert(s.input.pressed && !s.input.down);
  FP.input.update(s); FP.assert(!s.input.pressed);
});
FP.test('input: _reset vide le tampon', () => {
  FP.input._inject({ down: true }); FP.input._reset();
  const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.input.update(s);
  FP.assert(!s.input.down && !s.input.pressed && !s.input.active);
});
