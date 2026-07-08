import base from '../../eslint.config.base.mjs';

export default [
  {
    // `public/**` holds static + build-generated assets (e.g. the Serwist-minified sw.js).
    ignores: ['.next/**', 'next-env.d.ts', 'public/**'],
  },
  ...base,
];
