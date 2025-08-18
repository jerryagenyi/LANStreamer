module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Enforce consistent indentation
    'indent': ['error', 2],
    
    // Enforce consistent line endings
    'linebreak-style': ['error', 'unix'],
    
    // Enforce consistent quote style
    'quotes': ['error', 'single'],
    
    // Require semicolons
    'semi': ['error', 'never'],
    
    // Disallow console.log in production
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    
    // Enforce consistent spacing
    'space-before-function-paren': ['error', 'always'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Enforce consistent comma usage
    'comma-dangle': ['error', 'never'],
    'comma-spacing': ['error', { before: false, after: true }],
    
    // Enforce consistent variable declarations
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Enforce consistent function declarations
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    
    // Enforce consistent object property access
    'dot-notation': 'error',
    
    // Enforce consistent equality checks
    'eqeqeq': ['error', 'always'],
    
    // Disallow unused variables
    'no-unused-vars': ['error', { 
      vars: 'all', 
      args: 'after-used', 
      ignoreRestSiblings: false 
    }],
    
    // Enforce consistent error handling
    'handle-callback-err': 'error',
    'no-throw-literal': 'error',
    
    // Enforce consistent async/await usage
    'no-async-promise-executor': 'error',
    'require-await': 'error',
    
    // Enforce consistent class usage
    'no-useless-constructor': 'error',
    'no-dupe-class-members': 'error',
    
    // Enforce consistent import/export
    'no-duplicate-imports': 'error',
    
    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Performance rules
    'no-loop-func': 'error',
    'no-inner-declarations': 'error',
    
    // Code quality rules
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 500],
    'max-params': ['warn', 5],
    
    // Stylistic rules
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'camelcase': ['error', { properties: 'always' }],
    'consistent-this': ['error', 'self'],
    'new-cap': ['error', { newIsCap: true, capIsNew: false }],
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'no-trailing-spaces': 'error',
    'padded-blocks': ['error', 'never'],
    
    // Node.js specific rules
    'no-process-exit': 'error',
    'no-path-concat': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      rules: {
        // Allow longer test files
        'max-lines': 'off',
        // Allow more complex test functions
        'complexity': 'off'
      }
    }
  ]
}
