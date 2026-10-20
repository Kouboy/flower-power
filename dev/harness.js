// Banc d'assertions minimal. Utilisé par dev/check.html (navigateur) et dev/run-checks.js (Node).
// Expose : FP.test(name, fn), FP.assert(cond, msg), FP.assertEqual(actual, expected, msg), FP.runTests().
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const tests = [];

  FP.test = (name, fn) => { tests.push({ name, fn }); };
  FP.assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion fausse'); };
  FP.assertEqual = (actual, expected, msg) => {
    if (!Object.is(actual, expected)) {
      throw new Error((msg ? msg + ' — ' : '') + 'attendu ' + String(expected) + ', obtenu ' + String(actual));
    }
  };
  FP.runTests = () => tests.map(({ name, fn }) => {
    try { fn(); return { name, ok: true }; }
    catch (e) { return { name, ok: false, error: e && e.message ? e.message : String(e) }; }
  });
})();
