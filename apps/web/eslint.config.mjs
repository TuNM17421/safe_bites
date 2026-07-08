import base from '../../eslint.config.base.mjs';

export default [
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
  ...base,
];
