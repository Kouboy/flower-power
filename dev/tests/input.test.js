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
