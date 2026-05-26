// Conventional Commits — ADR 0012
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore', 'ci', 'build', 'style'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'ms-auth',
        'ms-crear',
        'ms-modificar',
        'ms-consultar',
        'ms-borrar',
        'ms-log',
        'ms-nlp',
        'gateway',
        'frontend',
        'db',
        'shared',
        'infra',
        'spec',
        'adr',
        'docs',
        'status',
        'deps',
        'release',
      ],
    ],
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [1, 'always', 100],
  },
};
