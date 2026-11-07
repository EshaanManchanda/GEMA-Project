// Jest runs CommonJS, where `import.meta` is a syntax error. Rewrite Vite's env access, then hand off to ts-jest.
const { TsJestTransformer } = require('ts-jest');
const inner = new TsJestTransformer({
  diagnostics: false,
  tsconfig: { module: 'commonjs', jsx: 'react-jsx', esModuleInterop: true },
});
const fix = (src) =>
  src.replace(/import\.meta\.env/g, '(globalThis.__VITE_ENV__ ||= { DEV: false, PROD: false, MODE: "test" })');
module.exports = {
  process: (src, path, opts) => inner.process(fix(src), path, opts),
  getCacheKey: (src, path, opts) => inner.getCacheKey(fix(src), path, opts),
};
