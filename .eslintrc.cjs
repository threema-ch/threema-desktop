/**
 * TypeScript rules that require parsing.
 *
 * Some special rules apply for 'svelte' vs. 'ts' files.
 */
function getTypeScriptOnlyRules(extension) {
    const namingConvention = [
        'error',

        // Camelcase-ish equivalents
        {
            selector: 'default',
            format: ['strictCamelCase'],
        },
        {
            selector: 'variable',
            format: ['strictCamelCase', 'UPPER_CASE'],
            trailingUnderscore: 'allow',
        },
        {
            selector: 'parameter',
            format: ['strictCamelCase'],
            trailingUnderscore: 'allow',
        },
        {
            selector: 'memberLike',
            format: ['strictCamelCase'],
        },
        {
            selector: 'property',
            format: ['strictCamelCase'],
            leadingUnderscore: 'allow', // Required for ES2021 private properties
        },
        {
            selector: 'typeLike',
            format: ['PascalCase'],
        },

        // Require an underscore prefix for private and protected members and properties
        {
            selector: 'memberLike',
            modifiers: ['private'],
            format: ['strictCamelCase'],
            leadingUnderscore: 'require',
        },
        {
            selector: 'memberLike',
            modifiers: ['protected'],
            format: ['strictCamelCase'],
            leadingUnderscore: 'require',
        },
        {
            selector: 'property',
            modifiers: ['private'],
            format: ['strictCamelCase'],
            leadingUnderscore: 'require',
        },
        {
            selector: 'property',
            format: ['strictCamelCase'],
            modifiers: ['protected'],
            leadingUnderscore: 'require',
        },

        // Require static properties to be constants
        {
            selector: 'property',
            modifiers: ['static'],
            format: ['UPPER_CASE'],
        },
        {
            selector: 'classProperty',
            modifiers: ['static', 'readonly'],
            format: ['UPPER_CASE'],
        },
        {
            selector: 'classProperty',
            modifiers: ['private', 'static', 'readonly'],
            format: ['UPPER_CASE'],
            leadingUnderscore: 'require',
        },

        // Allow object literal properties to be constants
        {
            selector: 'objectLiteralProperty',
            format: ['strictCamelCase', 'UPPER_CASE'],
        },
        // Allow object literal properties to include a dash (for HTTP headers)
        {
            selector: 'objectLiteralProperty',
            format: ['PascalCase'],
            filter: {
                regex: '[- ]',
                match: true,
            },
        },

        // Allow `readonly` type properties to be pascal case (for `WeakOpaque`) and upper case (for
        // constant properties).
        {
            selector: 'typeProperty',
            modifiers: ['readonly'],
            format: ['strictCamelCase', 'PascalCase', 'UPPER_CASE'],
        },

        // Treat enums as constants (upper-case)
        {
            selector: 'enumMember',
            format: ['UPPER_CASE'],
        },
    ];

    return {
        // Overrides
        'camelcase': 'off', // @typescript-eslint/naming-convention
        'no-return-await': 'off', // @typescript-eslint/return-await
        'require-await': 'off', // @typescript-eslint/require-await

        // TypeScript rules
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/consistent-type-exports': [
            'error',
            {
                fixMixedExportsWithInlineTypeSpecifier: true,
            },
        ],
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/explicit-function-return-type': [
            'error',
            {
                allowExpressions: true,
                allowHigherOrderFunctions: true,
                allowDirectConstAssertionInArrowFunctions: true,
            },
        ],
        '@typescript-eslint/explicit-member-accessibility': 'error',
        '@typescript-eslint/naming-convention': namingConvention,
        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-throw-literal': [
            'error',
            {
                allowThrowingAny: false,
                allowThrowingUnknown: false,
            },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/no-unnecessary-condition': extension === 'svelte' ? 'off' : 'error',
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/no-unsafe-argument': extension === 'svelte' ? 'off' : 'error',
        '@typescript-eslint/non-nullable-type-assertion-style': 'error',
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/prefer-reduce-type-parameter': 'error',
        '@typescript-eslint/prefer-return-this-type': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/promise-function-async': 'error',
        '@typescript-eslint/require-array-sort-compare': 'error',
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/return-await': ['error', 'always'],
        '@typescript-eslint/strict-boolean-expressions': [
            'error',
            {
                allowString: false,
                allowNumber: false,
            },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/unbound-method': [
            'error',
            {
                ignoreStatic: true,
            },
        ],

        // Svelte rules
        'svelte/valid-compile': 'warn', // Until https://github.com/sveltejs/svelte/issues/8558 is added

        // Our custom extensions
        'threema/ban-stateful-regex-flags': 'error',
        'threema/ban-typed-array-length': 'error',
        'threema/ban-typed-array-equality-comparison': 'error',
        'threema/no-todo-comments-without-issue': 'error',
        'threema/prefer-inline-type-imports': 'error',
    };
}

module.exports = {
    // Use this eslint config file as root.
    // https://eslint.org/docs/2.0.0/user-guide/configuring#configuration-cascading-and-hierarchy
    root: true,

    plugins: ['@typescript-eslint', 'jsdoc', 'simple-import-sort', 'threema'],

    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:svelte/recommended',
        'plugin:svelte/prettier',
        'plugin:jsdoc/recommended',
        'prettier',
    ],

    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
        },
        extraFileExtensions: ['.svelte'],
    },

    settings: {
        'jsdoc': {},
    },

    env: {
        es2020: true,
    },

    rules: {
        // Possible errors
        'no-console': 'error',
        'no-loss-of-precision': 'off', // @typescript-eslint/no-loss-of-precision
        'no-promise-executor-return': 'error',
        'no-template-curly-in-string': 'error',
        'no-unreachable-loop': 'error',
        'no-unsafe-optional-chaining': 'error',
        'require-atomic-updates': 'error',

        // Best practices
        'a11y-click-events-have-key-events': 'off', // TODO(DESK-839): Reenable
        'array-callback-return': 'error',
        'block-scoped-var': 'error',
        'consistent-return': 'error',
        'curly': ['error', 'all'],
        'default-case': 'error',
        'default-case-last': 'error',
        'default-param-last': 'off', // @typescript-eslint/default-param-last
        'eqeqeq': ['error', 'always'],
        'grouped-accessor-pairs': ['error', 'getBeforeSet'],
        'guard-for-in': 'error',
        'no-alert': 'error',
        'no-caller': 'error',
        'no-constructor-return': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-invalid-this': 'off', // @typescript-eslint/no-invalid-this
        'no-iterator': 'error',
        'no-labels': 'error',
        'no-lone-blocks': 'error',
        'no-loop-func': 'error',
        'no-multi-str': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-wrappers': 'error',
        'no-nonoctal-decimal-escape': 'error',
        'no-octal-escape': 'error',
        'no-proto': 'error',
        'no-return-assign': 'error',
        'no-script-url': 'error',
        'no-self-compare': 'error',
        'no-sequences': 'error',
        'no-throw-literal': 'error',
        'no-unmodified-loop-condition': 'error',
        'no-unused-expressions': 'off', // @typescript-eslint/no-unused-expressions
        'no-useless-call': 'error',
        'no-useless-concat': 'error',
        'no-void': [
            'error',
            {
                allowAsStatement: true,
            },
        ],
        'prefer-named-capture-group': 'error',
        'prefer-promise-reject-errors': 'error',
        'prefer-regex-literals': [
            'error',
            {
                disallowRedundantWrapping: true,
            },
        ],
        'radix': ['error', 'always'],
        'require-await': 'error',
        'require-unicode-regexp': 'error',

        // Variables
        'no-shadow': 'off', // @typescript-eslint/no-shadow
        'no-unused-private-class-members': 'error',
        'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars

        // Stylistic issues
        'camelcase': 'error',
        'capitalized-comments': [
            'error',
            'always',
            {
                ignorePattern: 'prettier-ignore',
                ignoreConsecutiveComments: true,
            },
        ],
        'dot-notation': 'error',
        'func-names': 'error',
        'func-style': [
            'error',
            'declaration',
            {
                allowArrowFunctions: false,
            },
        ],
        'max-depth': [
            'error',
            {
                max: 4,
            },
        ],
        'new-cap': 'error',
        'no-array-constructor': 'error',
        'no-bitwise': 'error',
        'no-lonely-if': 'error',
        // TODO(DESK-679): Forbid mixed operators (useful braces around math operations)
        // 'no-mixed-operators': 'error',
        'no-nested-ternary': 'error',
        'no-new-object': 'error',
        'no-restricted-syntax': [
            'error',
            {
                selector: 'TSEnumDeclaration',
                message: 'Use union types, const arrays/objects or generated safe-enums instead.',
            },
            {
                selector: 'TSNumberKeyword',
                message: 'Use i8/u8, i16/u16, i32/u32 or i53/u53 instead.',
            },
            {
                selector: 'TSBigIntKeyword',
                message: 'Use i64/u64 or ibig/ubig instead.',
            },
            {
                selector: 'TSTupleType > :not(TSNamedTupleMember)',
                message: 'Use named tuple members.',
            },
        ],
        'no-unneeded-ternary': 'error',
        'operator-assignment': ['error', 'always'],
        'prefer-exponentiation-operator': 'error',
        'prefer-object-spread': 'error',

        // ES6 features
        'arrow-parens': 'error',
        'arrow-body-style': ['error', 'as-needed'],
        'no-dupe-class-members': 'off', // @typescript-eslint/no-dupe-class-members
        'no-duplicate-imports': 'off', // @typescript-eslint/no-duplicate-imports
        'no-useless-constructor': 'off', // @typescript-eslint/no-useless-constructor
        'no-useless-computed-key': 'error',
        'no-useless-rename': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-const': 'error',
        'prefer-destructuring': [
            'error',
            {
                AssignmentExpression: {
                    object: false,
                },
            },
        ],
        'prefer-numeric-literals': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'symbol-description': 'error',

        // TypeScript features also applicable to JavaScript files
        '@typescript-eslint/array-type': [
            'error',
            {
                default: 'array',
            },
        ],
        '@typescript-eslint/ban-ts-comment': [
            'error',
            {
                'ts-expect-error': 'allow-with-description',
            },
        ],
        '@typescript-eslint/ban-types': [
            'error',
            {
                extendDefaults: true,
                types: {
                    null: {
                        message: 'Use undefined instead',
                        fixWith: 'undefined',
                    },
                },
            },
        ],
        '@typescript-eslint/class-literal-property-style': 'error',
        '@typescript-eslint/consistent-type-assertions': [
            'error',
            {
                assertionStyle: 'as',
                // Note: Needed due to heavy usage of new-types
                objectLiteralTypeAssertions: 'allow',
            },
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/member-ordering': [
            'error',
            {
                default: [
                    // Index signature
                    'signature',

                    // Static fields
                    'public-static-field',
                    'protected-static-field',
                    'private-static-field',
                    '#private-static-field',
                    'static-field',

                    // Fields
                    'public-decorated-field',
                    'protected-decorated-field',
                    'private-decorated-field',
                    'public-instance-field',
                    'protected-instance-field',
                    'private-instance-field',
                    '#private-instance-field',
                    'public-abstract-field',
                    'protected-abstract-field',
                    'public-field',
                    'protected-field',
                    'private-field',
                    '#private-field',
                    'instance-field',
                    'abstract-field',
                    'decorated-field',
                    'field',

                    // Constructors
                    'public-constructor',
                    'protected-constructor',
                    'private-constructor',
                    'constructor',

                    // Static methods
                    'public-static-method',
                    'protected-static-method',
                    'private-static-method',
                    '#private-static-method',
                    'static-method',

                    // Getters
                    'public-static-get',
                    'protected-static-get',
                    'private-static-get',
                    '#private-static-get',
                    'public-decorated-get',
                    'protected-decorated-get',
                    'private-decorated-get',
                    'public-instance-get',
                    'protected-instance-get',
                    'private-instance-get',
                    '#private-instance-get',
                    'public-abstract-get',
                    'protected-abstract-get',
                    'public-get',
                    'protected-get',
                    'private-get',
                    '#private-get',
                    'static-get',
                    'instance-get',
                    'abstract-get',
                    'decorated-get',
                    'get',

                    // Setters
                    'public-static-set',
                    'protected-static-set',
                    'private-static-set',
                    '#private-static-set',
                    'public-decorated-set',
                    'protected-decorated-set',
                    'private-decorated-set',
                    'public-instance-set',
                    'protected-instance-set',
                    'private-instance-set',
                    '#private-instance-set',
                    'public-abstract-set',
                    'protected-abstract-set',
                    'public-set',
                    'protected-set',
                    'private-set',
                    '#private-set',
                    'static-set',
                    'instance-set',
                    'abstract-set',
                    'decorated-set',
                    'set',

                    // Methods
                    'public-decorated-method',
                    'protected-decorated-method',
                    'private-decorated-method',
                    'public-instance-method',
                    'protected-instance-method',
                    'private-instance-method',
                    '#private-instance-method',
                    'public-abstract-method',
                    'protected-abstract-method',
                    'public-method',
                    'protected-method',
                    'private-method',
                    '#private-method',
                    'instance-method',
                    'abstract-method',
                    'decorated-method',
                    'method',
                ],
            },
        ],
        '@typescript-eslint/method-signature-style': 'error',
        '@typescript-eslint/no-confusing-non-null-assertion': 'error',
        '@typescript-eslint/no-dynamic-delete': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-extraneous-class': 'error',
        '@typescript-eslint/no-invalid-void-type': 'error',
        '@typescript-eslint/no-parameter-properties': [
            'error',
            {
                allows: [
                    'private',
                    'protected',
                    'public',
                    'private readonly',
                    'protected readonly',
                    'public readonly',
                ],
            },
        ],
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-literal-enum-member': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        '@typescript-eslint/unified-signatures': 'error',

        // TypeScript eslint extensions
        '@typescript-eslint/default-param-last': 'error',
        '@typescript-eslint/no-dupe-class-members': 'error',
        '@typescript-eslint/no-duplicate-imports': 'error',
        '@typescript-eslint/no-invalid-this': 'error',
        '@typescript-eslint/no-loss-of-precision': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                args: 'none',
            },
        ],
        '@typescript-eslint/no-useless-constructor': 'error',

        // TODO(DESK-680): Enable jsdoc rules
        // JSDoc rules
        'jsdoc/check-access': 'off',
        'jsdoc/check-alignment': 'off',
        'jsdoc/check-examples': 'off',
        'jsdoc/check-indentation': 'off',
        'jsdoc/check-line-alignment': 'error',
        'jsdoc/check-param-names': [
            // TODO(DESK-680): Reactivate once we can turn off strict ordering of parameters, so we
            // can omit some parameters.
            'off',
            {
                checkDestructured: false,
            },
        ],
        'jsdoc/check-property-names': 'error',
        'jsdoc/check-syntax': 'off',
        'jsdoc/check-tag-names': [
            'error',
            {
                definedTags: ['generate'],
            },
        ],
        'jsdoc/check-types': 'off',
        'jsdoc/check-values': 'off',
        'jsdoc/empty-tags': 'error',
        'jsdoc/implements-on-classes': 'off',
        'jsdoc/match-description': 'off',
        'jsdoc/multiline-blocks': 'error',
        'jsdoc/newline-after-description': 'error',
        'jsdoc/no-bad-blocks': 'error',
        'jsdoc/no-defaults': 'off',
        'jsdoc/no-missing-syntax': 'off',
        'jsdoc/no-multi-asterisks': 'off',
        'jsdoc/no-restricted-syntax': 'off',
        'jsdoc/no-types': 'error',
        'jsdoc/no-undefined-types': 'off',
        'jsdoc/require-asterisk-prefix': 'error',
        'jsdoc/require-description': 'error',
        'jsdoc/require-example': 'off',
        'jsdoc/require-file-overview': 'off',
        'jsdoc/require-hyphen-before-param-description': 'off',
        'jsdoc/require-jsdoc': [
            'error',
            {
                publicOnly: true,
                require: {
                    ArrowFunctionExpression: true,
                    ClassDeclaration: true,
                    ClassExpression: true,
                    FunctionDeclaration: true,
                    FunctionExpression: true,
                    MethodDefinition: true,
                },
                contexts: ['TSEnumDeclaration', 'TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
                checkConstructors: false,
            },
        ],
        'jsdoc/require-param': 'off',
        'jsdoc/require-param-description': 'error',
        'jsdoc/require-param-name': 'error',
        'jsdoc/require-param-type': 'off',
        'jsdoc/require-property': 'off',
        'jsdoc/require-property-description': 'off',
        'jsdoc/require-property-name': 'off',
        'jsdoc/require-property-type': 'off',
        'jsdoc/require-returns': 'off',
        'jsdoc/require-returns-check': 'error',
        'jsdoc/require-returns-description': 'error',
        'jsdoc/require-returns-type': 'off',
        'jsdoc/require-throws': 'error',
        'jsdoc/require-yields': 'off',
        'jsdoc/require-yields-check': 'error',
        'jsdoc/tag-lines': 'error',
        'jsdoc/valid-types': 'off',

        // Import sorting extension
        'simple-import-sort/imports': 'error',
    },

    overrides: [
        // General JavaScript rules
        {
            files: '*.js',
            rules: {
                camelcase: 'error',
            },
        },

        // General Svelte rules
        {
            files: '*.svelte',
            parser: 'svelte-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser',
                project: './src/app/tsconfig.json',
            },
            rules: {
                'no-labels': 'off',
                ...getTypeScriptOnlyRules('svelte'),
            },
        },

        // General TypeScript rules
        {
            files: '*.ts',
            parserOptions: {
                project: './tsconfig.json',
            },
            rules: {
                ...getTypeScriptOnlyRules('ts'),

                // TODO (jsdoc): Remove these rules
                'jsdoc/require-jsdoc': 'off',
                'jsdoc/newline-after-description': 'off',
                'jsdoc/require-throws': 'off',
            },
        },
        {
            files: 'src/**/*.ts',
            parserOptions: {
                project: './src/tsconfig.base.json',
            },
            rules: getTypeScriptOnlyRules('ts'),
        },

        // Utility script rules
        {
            files: [
                '.eslintrc.cjs',
                'config/**/*.{cjs,js}',
                'src/test/**/*.js',
                'tools/**/*.{cjs,ts}',
                'svelte.config.js',
            ],
            env: {
                node: true,
            },
            rules: {
                'no-console': 'off',
                'prefer-named-capture-group': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/no-require-imports': 'off',
            },
        },
        {
            files: ['config/**/*.ts'],
            env: {
                node: true,
            },
            rules: {
                'no-console': 'off',
            },
        },

        // Packaging script
        {
            files: 'packaging/**/*.ts',
            parserOptions: {
                project: './packaging/tsconfig.json',
            },
            env: {
                node: true,
            },
            rules: {
                'no-console': 'off',
            },
        },

        // Types source rules
        {
            files: 'src/@types/**',
            parserOptions: {
                project: './src/@types/tsconfig.json',
            },
        },

        // App source rules
        {
            files: 'src/app/**',
            parserOptions: {
                project: './src/app/tsconfig.json',
            },
            env: {
                browser: true,
            },
        },

        // Common source rules
        {
            files: 'src/common/**',
            parserOptions: {
                project: './src/common/tsconfig.json',
            },
        },
        {
            files: 'src/common/network/structbuf/{csp,extra,group-call,md-d2d,md-d2d-rendezvous,md-d2m}/**',
            rules: {
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-extraneous-class': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/naming-convention': 'off',
                'prefer-const': 'off',
                'simple-import-sort/imports': 'off',
            },
        },

        // Common DOM source rules
        {
            files: 'src/common/dom/**',
            parserOptions: {
                project: './src/common/dom/tsconfig.json',
            },
            env: {
                browser: true,
            },
        },

        // Common enum source rules
        {
            files: 'src/common/enum.ts',
            rules: {
                '@typescript-eslint/naming-convention': 'off',
                '@typescript-eslint/no-namespace': 'off',
                'jsdoc/require-jsdoc': 'off',
            },
        },

        // Common Node source rules
        {
            files: 'src/common/node/**',
            parserOptions: {
                project: './src/common/node/tsconfig.json',
            },
            env: {
                node: true,
            },
        },

        // Electron-specific source rules
        {
            files: 'src/electron/**',
            parserOptions: {
                project: './src/electron/tsconfig.json',
            },
            env: {
                browser: false,
                node: true,
            },
        },

        // Enum source rules
        {
            files: 'src/enum/**',
            parserOptions: {
                project: './src/enum/tsconfig.json',
            },
            rules: {
                'no-restricted-syntax': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
            },
        },

        // Backend Worker source rules
        {
            files: 'src/worker/backend/**',
            parserOptions: {
                project: './src/worker/backend/tsconfig.json',
            },
            env: {
                worker: true,
            },
        },

        // Backend Worker Electron source rules
        {
            files: 'src/worker/backend/electron/**',
            parserOptions: {
                project: './src/worker/backend/electron/tsconfig.json',
            },
            env: {
                node: true,
                worker: true,
            },
        },

        // Service worker source rules
        {
            files: 'src/service-worker-*.ts',
            parserOptions: {
                project: './src/service-worker-tsconfig.json',
            },
            env: {
                serviceworker: true,
            },
        },
        {
            files: 'src/worker/service/**',
            parserOptions: {
                project: './src/worker/service/tsconfig.json',
            },
            env: {
                serviceworker: true,
            },
        },

        // General test source rules
        {
            files: 'src/test/**',
            rules: {
                'no-console': 'off',
                'func-names': 'off',
                'prefer-arrow-callback': 'off',
                '@typescript-eslint/no-invalid-this': 'off',
                '@typescript-eslint/no-unused-expressions': 'off',
            },
        },
        {
            files: 'src/test/common/**',
            parserOptions: {
                project: './src/test/common/tsconfig.json',
            },
        },

        // Cypress integration test source rules
        // TODO(DESK-35)
        // {
        //     files: 'src/test/cypress/integration/**',
        //     parserOptions: {
        //         project: './src/test/cypress/integration/tsconfig.json',
        //     },
        // },

        // Karma test source rules
        {
            files: 'src/test/karma/**',
            parserOptions: {
                project: './src/test/karma/tsconfig.json',
            },
        },
        {
            files: 'src/test/karma/app/**',
            parserOptions: {
                project: './src/test/karma/app/tsconfig.json',
            },
        },
        {
            files: 'src/test/karma/common/**',
            parserOptions: {
                project: './src/test/karma/common/tsconfig.json',
            },
        },
        {
            files: 'src/test/karma/common/dom/**',
            parserOptions: {
                project: './src/test/karma/common/dom/tsconfig.json',
            },
            env: {
                browser: true,
            },
        },
        {
            files: 'src/test/karma/worker/backend/**',
            parserOptions: {
                project: './src/test/karma/worker/backend/tsconfig.json',
            },
            env: {
                worker: true,
            },
        },
        {
            files: 'src/test/karma/worker/service/**',
            parserOptions: {
                project: './src/test/karma/worker/service/tsconfig.json',
            },
            env: {
                serviceworker: true,
            },
        },

        // Mocha test source rules
        {
            files: 'src/test/mocha/**',
            parserOptions: {
                project: './src/test/mocha/tsconfig.json',
            },
        },
        {
            files: 'src/test/mocha/app/**',
            parserOptions: {
                project: './src/test/mocha/app/tsconfig.json',
            },
        },
        {
            files: 'src/test/mocha/common/**',
            parserOptions: {
                project: './src/test/mocha/common/tsconfig.json',
            },
            env: {
                node: true,
            },
        },
    ],
};
