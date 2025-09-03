module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import', 'boundaries'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'airbnb-base',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // Import rules
    'import/extensions': ['error', 'ignorePackages', {
      ts: 'never',
      js: 'never',
    }],
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/prefer-default-export': 'off',
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'never',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    
    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'max-len': ['error', {
      code: 120,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true, consistent: true },
      ObjectPattern: { multiline: true, consistent: true },
      ImportDeclaration: { multiline: true, consistent: true },
      ExportDeclaration: { multiline: true, consistent: true },
    }],
    'no-param-reassign': ['error', { props: false }],
    'no-underscore-dangle': ['error', { allow: ['_id', '_custom_json', '_schedule'] }],
    
    // Boundaries rules for modular architecture
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        {
          from: 'routes',
          allow: ['controllers', 'middlewares'],
        },
        {
          from: 'controllers',
          allow: ['services', 'lib', 'middlewares'],
        },
        {
          from: 'services',
          allow: ['lib', 'graphql'],
        },
        {
          from: 'middlewares',
          allow: ['lib'],
        },
        {
          from: 'lib',
          allow: ['lib'],
        },
      ],
    }],
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
    'boundaries/elements': [
      {
        type: 'routes',
        pattern: 'src/routes/**/*',
      },
      {
        type: 'controllers',
        pattern: 'src/controllers/**/*',
      },
      {
        type: 'services',
        pattern: 'src/services/**/*',
      },
      {
        type: 'middlewares',
        pattern: 'src/middlewares/**/*',
      },
      {
        type: 'lib',
        pattern: 'src/lib/**/*',
      },
      {
        type: 'graphql',
        pattern: 'src/graphql/**/*',
      },
    ],
  },
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'public/',
    '*.js',
    'src/types/graphql.ts', // Generated file
  ],
};
