import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // Domain modules own business rules only; persistence goes through lib/repos
    // so every DB access is wrapped in the withDb seam.
    files: ['lib/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@chokro/db',
              message: 'Domain modules must not import @chokro/db directly. Put persistence in lib/repos and call it through the withDb seam.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'next-env.d.ts', 'tsconfig.tsbuildinfo']),
]);
