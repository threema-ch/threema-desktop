/**
 * TypeScript config mixin that require parsing.
 *
 * Some special rules apply for 'svelte' vs. 'ts' files.
 */
function getTypeScriptConfigMixin(extension, override) {
    const namingConvention = [
        'error',

        // Camelcase-ish equivalents
        {
            selector: 'default',
            format: ['strictCamelCase'],
        },
        {
            selector: 'import',
            format: ['camelCase', 'PascalCase'],
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
        },
        {
            selector: 'typeLike',
            format: ['PascalCase'],
        },

        // Require an underscore prefix for private and protected members and properties
        {
            selector: 'memberLike',
            modifiers: ['#private'],
            format: ['strictCamelCase'],
            leadingUnderscore: 'require',
        },
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
            modifiers: ['#private'],
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
            filter: {
                regex: '[- ]',
                match: false,
            },
        },
        // Allow object literal properties to include a dash (for HTTP headers and CLI arguments)
        {
            selector: 'objectLiteralProperty',
            format: null,
            custom: {
                regex: '[- ]',
                match: true,
            },
        },

        // Allow object literal methods to be of type: `on:*` for supporting Svelte-style event
        // listeners.
        {
            selector: 'typeMethod',
            format: ['strictCamelCase'],
            filter: {
                regex: '^on:',
                match: false,
            },
        },
        {
            selector: 'typeMethod',
            format: null,
            custom: {
                regex: '^on:',
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

    const rules = {
        // Overrides
        'camelcase': 'off', // @typescript-eslint/naming-convention
        'dot-notation': 'off', // @typescript-eslint/dot-notation
        'no-implied-eval': 'off', // @typescript-eslint/no-implied-eval
        'no-return-await': 'off', // @typescript-eslint/return-await
        'no-throw-literal': 'off', // @typescript-eslint/no-throw-literal
        'require-await': 'off', // @typescript-eslint/require-await

        // TypeScript rules
        '@typescript-eslint/adjacent-overload-signatures': 'error',
        '@typescript-eslint/consistent-indexed-object-style': 'error',
        '@typescript-eslint/consistent-type-exports': [
            'error',
            {
                fixMixedExportsWithInlineTypeSpecifier: true,
            },
        ],
        '@typescript-eslint/dot-notation': 'error',
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
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@typescript-eslint/no-floating-promises': ['error', {ignoreVoid: false}],
        '@typescript-eslint/no-unnecessary-qualifier': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'off', // Handled by svelte-check
        '@typescript-eslint/no-useless-empty-export': 'error',
        '@typescript-eslint/non-nullable-type-assertion-style': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/promise-function-async': 'error',
        '@typescript-eslint/require-array-sort-compare': 'error',
        // We make heavy use of template expressions in error cases where the type is `unknown` or
        // `never`.
        '@typescript-eslint/restrict-template-expressions': 'off',
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
        'a11y-click-events-have-key-events': 'off', // TODO(DESK-839): Reenable
        'svelte/valid-compile': 'warn', // Until https://github.com/sveltejs/svelte/issues/8558 is added

        // Our custom extensions
        'threema/ban-stateful-regex-flags': 'error',
        'threema/ban-typed-array-length': 'error',
        'threema/ban-typed-array-equality-comparison': 'error',
        'threema/no-todo-comments-without-issue': 'error',

        // Custom syntax rules
        'no-restricted-syntax': [
            'error',
            {
                selector: "BinaryExpression[operator='in']",
                message:
                    "Avoid the 'in' operator. Use 'Object.hasOwn(...)' or our 'hasProperty(...)' helper.",
            },
        ],
    };

    return {
        extends: [
            ...['plugin:@typescript-eslint/strict-type-checked'],
            ...(override?.extends ?? []),
        ],
        rules: {...rules, ...(override?.rules ?? {})},
    };
}

module.exports = {
    // Use this eslint config file as root.
    // https://eslint.org/docs/2.0.0/user-guide/configuring#configuration-cascading-and-hierarchy
    root: true,

    plugins: ['@typescript-eslint', 'import', 'jsdoc', 'threema'],

    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/strict',
        'plugin:import/typescript',
        'plugin:svelte/recommended',
        'plugin:svelte/prettier',
        'plugin:jsdoc/recommended',
        'prettier',
    ],

    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            impliedStrict: true,
        },
        ecmaVersion: 'latest',
        extraFileExtensions: ['.svelte'],
        sourceType: 'module',
        tsconfigRootDir: __dirname,
    },

    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts'],
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                project: true, // \_(ツ)_/¯
            },
        },

        'jsdoc': {},
    },

    env: {
        es2024: true,
    },

    rules: {
        // Possible Problems
        'no-constant-binary-expression': 'error',
        'no-constructor-return': 'error',
        'no-dupe-class-members': 'off', // @typescript-eslint/no-dupe-class-members
        'no-loss-of-precision': 'off', // @typescript-eslint/no-loss-of-precision
        'no-promise-executor-return': ['error', {allowVoid: true}],
        'no-self-compare': 'error',
        'no-template-curly-in-string': 'error',
        'no-unmodified-loop-condition': 'error',
        'no-unreachable-loop': 'error',
        'no-unused-private-class-members': 'error',
        'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars
        'require-atomic-updates': 'error',

        // Suggestions
        'accessor-pairs': 'error',
        'arrow-body-style': ['error', 'as-needed'],
        'block-scoped-var': 'error',
        'camelcase': 'error',
        'capitalized-comments': [
            'error',
            'always',
            {
                ignorePattern: 'prettier-ignore',
                ignoreConsecutiveComments: true,
            },
        ],
        'consistent-return': 'error',
        'curly': ['error', 'all'],
        'default-case': 'error',
        'default-case-last': 'error',
        'default-param-last': 'off', // @typescript-eslint/default-param-last
        'dot-notation': 'error',
        'eqeqeq': ['error', 'always'],
        'func-names': 'error',
        'func-style': ['error', 'declaration', {allowArrowFunctions: false}],
        'grouped-accessor-pairs': ['error', 'getBeforeSet'],
        'guard-for-in': 'error',
        'id-denylist': ['error', 'err', 'e'],
        'logical-assignment-operators': ['error', 'always'],
        'max-depth': ['error', {max: 4}],
        'new-cap': 'error',
        'no-alert': 'error',
        'no-array-constructor': 'off', // @typescript-eslint/no-array-constructor
        'no-bitwise': 'error',
        'no-caller': 'error',
        'no-console': 'error',
        'no-duplicate-imports': 'error',
        'no-else-return': 'error',
        'no-empty-static-block': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-extra-bind': 'error',
        'no-extra-label': 'error',
        'no-floating-decimal': 'error',
        'no-implicit-globals': 'error',
        'no-implied-eval': 'error',
        'no-invalid-this': 'off', // @typescript-eslint/no-invalid-this
        'no-iterator': 'error',
        'no-label-var': 'error',
        'no-labels': 'error',
        'no-lone-blocks': 'error',
        'no-lonely-if': 'error',
        'no-loop-func': 'off', // @typescript-eslint/no-loop-func
        // TODO: https://github.com/prettier/prettier/issues/187
        // 'no-mixed-operators': 'error',
        'no-multi-str': 'error',
        'no-nested-ternary': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-object': 'error',
        'no-new-wrappers': 'error',
        'no-octal-escape': 'error',
        'no-proto': 'error',
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
        'no-return-assign': 'error',
        'no-script-url': 'error',
        'no-sequences': 'error',
        'no-shadow': 'off', // @typescript-eslint/no-shadow
        'no-throw-literal': 'error',
        'no-unneeded-ternary': 'error',
        'no-unused-expressions': 'off', // @typescript-eslint/no-unused-expressions
        'no-useless-call': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-concat': 'error',
        'no-useless-constructor': 'off', // @typescript-eslint/no-useless-constructor
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        'no-var': 'error',
        'no-void': ['error', {allowAsStatement: true}],
        'object-shorthand': 'error',
        'operator-assignment': ['error', 'always'],
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
        'prefer-exponentiation-operator': 'error',
        'prefer-named-capture-group': 'error',
        'prefer-numeric-literals': 'error',
        'prefer-object-has-own': 'error',
        'prefer-object-spread': 'error',
        'prefer-promise-reject-errors': 'error',
        'prefer-regex-literals': ['error', {disallowRedundantWrapping: true}],
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'radix': ['error', 'always'],
        'require-await': 'error',
        'require-unicode-regexp': 'error',
        'spaced-comment': 'error',
        'symbol-description': 'error',
        'yoda': 'error',

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
        '@typescript-eslint/consistent-generic-constructors': 'error',
        '@typescript-eslint/consistent-indexed-object-style': 'error',
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
                    'readonly-signature',
                    'call-signature',
                    'signature',

                    // Static fields
                    'public-static-readonly-field',
                    'public-static-field',
                    'protected-static-readonly-field',
                    'protected-static-field',
                    'private-static-readonly-field',
                    'private-static-field',
                    '#private-static-readonly-field',
                    '#private-static-field',
                    'static-field',

                    // Fields
                    'public-decorated-readonly-field',
                    'public-decorated-field',
                    'protected-decorated-readonly-field',
                    'protected-decorated-field',
                    'private-decorated-readonly-field',
                    'private-decorated-field',
                    'public-instance-readonly-field',
                    'public-instance-field',
                    'protected-instance-readonly-field',
                    'protected-instance-field',
                    'private-instance-readonly-field',
                    'private-instance-field',
                    '#private-instance-readonly-field',
                    '#private-instance-field',
                    'public-abstract-readonly-field',
                    'public-abstract-field',
                    'protected-abstract-readonly-field',
                    'protected-abstract-field',
                    'public-readonly-field',
                    'public-field',
                    'protected-readonly-field',
                    'protected-field',
                    'private-readonly-field',
                    'private-field',
                    '#private-readonly-field',
                    '#private-field',
                    'instance-readonly-field',
                    'instance-field',
                    'abstract-readonly-field',
                    'abstract-field',
                    'decorated-readonly-field',
                    'decorated-field',
                    'readonly-field',
                    'field',

                    // Static initialization
                    'static-initialization',

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
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/parameter-properties': [
            'error',
            {
                allow: [
                    'private',
                    'protected',
                    'public',
                    'private readonly',
                    'protected readonly',
                    'public readonly',
                ],
                prefer: 'parameter-property',
            },
        ],
        '@typescript-eslint/prefer-enum-initializers': 'error',
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-function-type': 'error',

        // TypeScript eslint extensions
        '@typescript-eslint/default-param-last': 'error',
        '@typescript-eslint/no-dupe-class-members': 'error',
        '@typescript-eslint/no-invalid-this': 'error',
        '@typescript-eslint/no-loop-func': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                args: 'none',
            },
        ],

        // Imports
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                prefer: 'type-imports',
                fixStyle: 'inline-type-imports',
            },
        ],
        '@typescript-eslint/no-import-type-side-effects': 'error',
        // TODO: Should replace the two TS rules but import has no
        // @typescript-eslint/no-import-type-side-effects equivalent atm.
        // 'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
        // TODO: Wait for https://github.com/import-js/eslint-plugin-import/issues/2729
        // 'import/extensions': ['error', 'always'],
        'import/newline-after-import': 'error',
        'import/no-absolute-path': 'error',
        'import/no-default-export': 'error',
        // We remove this rule for now and use the standard ES-Lint rule: https://eslint.org/docs/latest/rules/no-duplicate-imports
        // The reason is that svelte imports all modules from one file, which this rules disallows.
        // See https://github.com/import-js/eslint-plugin-import/issues/1479 for the corresponding issue.
        // 'import/no-duplicates': ['error', {'prefer-inline': true}],
        'import/no-empty-named-blocks': 'error',
        // TODO: Currently broken for e.g. 'sinon' and 'chai' which affects tests, see:
        // https://github.com/import-js/eslint-plugin-import/issues/2168
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: ['./{config,packaging,test,tools}/**'],
                peerDependencies: false,
                bundledDependencies: false,
                packageDir: __dirname,
            },
        ],
        'import/no-mutable-exports': 'error',
        'import/no-named-as-default-member': 'error',
        'import/no-named-as-default': 'error',
        'import/no-named-default': 'error',
        'import/no-self-import': 'error',
        'import/no-unassigned-import': 'error',
        // Note: This can be occasionally useful to detect unused exports but use it with caution
        // 'import/no-unused-modules': ['error', {unusedExports: true}],
        'import/no-useless-path-segments': 'error',
        'import/order': [
            'error',
            {
                'newlines-between': 'always',
                'alphabetize': {
                    order: 'asc',
                    orderImportKind: 'asc',
                    caseInsensitive: false,
                },
                'groups': [
                    'builtin',
                    'external',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                    'object',
                ],
            },
        ],

        // TODO(DESK-680): Enable jsdoc rules
        // JSDoc rules
        'jsdoc/check-access': 'off',
        'jsdoc/check-alignment': 'off',
        'jsdoc/check-examples': 'off',
        'jsdoc/check-indentation': 'off',
        'jsdoc/check-line-alignment': ['error', 'never', {wrapIndent: '  '}],
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
        'jsdoc/tag-lines': ['error', 'never', {startLines: 1}],
        'jsdoc/valid-types': 'off',
    },

    overrides: [
        // General JavaScript rules
        {
            files: './**/*.{cjs,js}',
            rules: {
                camelcase: 'error',
            },
        },

        // General TypeScript rules
        {
            files: './**/*.ts',
            parserOptions: {
                project: './tsconfig.json',
            },
            ...getTypeScriptConfigMixin('ts', {
                rules: {
                    // TODO (jsdoc): Remove these rules
                    'jsdoc/require-jsdoc': 'off',
                    'jsdoc/require-throws': 'off',
                },
            }),
        },

        // Utility script rules
        {
            files: [
                './.eslintrc.cjs',
                './config/**/*.{cjs,js,ts}',
                './src/test/**/*.js',
                './tools/**/*.{cjs,js,ts}',
                './svelte.config.js',
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
                'import/no-default-export': 'off',
            },
        },
        {
            files: './packaging/**/*.ts',
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

        {
            files: './tools/emoji/**/*.ts',
            parserOptions: {
                project: './tools/emoji/tsconfig.json',
            },
            env: {
                node: true,
            },
            rules: {
                'no-console': 'off',
            },
        },

        {
            files: './config/**/*.ts',
            parserOptions: {
                project: './config/tsconfig.json',
            },
            env: {
                node: true,
            },
        },

        // Types source rules
        {
            files: './src/@types/**',
            parserOptions: {
                project: './src/@types/tsconfig.json',
            },
        },

        // App source rules
        {
            files: './src/app/**',
            rules: {
                'import/no-unassigned-import': ['error', {allow: ['**/*.scss']}],
            },
            env: {
                browser: true,
            },
        },
        {
            files: './src/app/**/*.ts',
            parser: 'typescript-eslint-parser-for-extra-files',
            parserOptions: {
                project: './src/app/tsconfig.json',
            },
        },
        {
            files: './src/app/**/*.svelte',
            parser: 'svelte-eslint-parser',
            parserOptions: {
                // eslint-disable-next-line import/no-extraneous-dependencies
                parser: require('typescript-eslint-parser-for-extra-files'),
                project: './src/app/tsconfig.json',
            },
            ...getTypeScriptConfigMixin('svelte', {
                extends: ['plugin:svelte/prettier'],
                rules: {
                    'no-labels': 'off',
                    '@typescript-eslint/ban-types': [
                        'error',
                        {
                            extendDefaults: true,
                            types: {
                                // Note: Null often cannot be avoided when dealing with the Svelte lifecycle
                                null: false,
                            },
                        },
                    ],
                    'import/no-mutable-exports': 'off',
                },
            }),
        },

        // CLI source rules
        {
            files: './src/cli/**/*.ts',
            parserOptions: {
                project: './src/cli/tsconfig.json',
            },
            env: {
                node: true,
            },
        },

        // Common source rules
        {
            files: './src/common/**/*.ts',
            parserOptions: {
                project: './src/common/tsconfig.json',
            },
        },
        {
            files: [
                './src/common/network/structbuf/utils.ts',
                './src/common/network/structbuf/{csp,extra,group-call,md-d2d,md-d2d-rendezvous,md-d2m}/**/*.ts',
            ],
            rules: {
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-extraneous-class': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/naming-convention': 'off',
                'prefer-const': 'off',
                'import/newline-after-import': 'off',
                'import/order': 'off',
            },
        },

        // Common DOM source rules
        {
            files: './src/common/dom/**/*.ts',
            parserOptions: {
                project: './src/common/dom/tsconfig.json',
            },
            env: {
                browser: true,
            },
        },

        // Common enum source rules
        {
            files: './src/common/enum.ts',
            rules: {
                '@typescript-eslint/naming-convention': 'off',
                '@typescript-eslint/no-namespace': 'off',
                'jsdoc/require-jsdoc': 'off',
            },
        },

        // Common Node source rules
        {
            files: './src/common/node/**/*.ts',
            parserOptions: {
                project: './src/common/node/tsconfig.json',
            },
            env: {
                node: true,
            },
        },

        // Electron-specific source rules
        {
            files: './src/electron/**/*.ts',
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
            files: './src/enum/**/*.ts',
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
            files: './src/worker/backend/**/*.ts',
            parserOptions: {
                project: './src/worker/backend/tsconfig.json',
            },
            env: {
                worker: true,
            },
        },

        // Backend Worker Electron source rules
        {
            files: './src/worker/backend/electron/**/*.ts',
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
            files: './src/service-worker-*.ts',
            parserOptions: {
                project: './src/service-worker-tsconfig.json',
            },
            env: {
                serviceworker: true,
            },
        },
        {
            files: './src/worker/service/**/*.ts',
            parserOptions: {
                project: './src/worker/service/tsconfig.json',
            },
            env: {
                serviceworker: true,
            },
        },

        // General test source rules
        {
            files: './src/test/**/*.{cjs,js,ts}',
            rules: {
                'no-console': 'off',
                'func-names': 'off',
                'prefer-arrow-callback': 'off',
                'import/no-default-export': 'off',

                // Mocha requires these.
                '@typescript-eslint/no-invalid-this': 'off',
                '@typescript-eslint/no-unused-expressions': 'off',

                // TODO: Currently broken for e.g. 'sinon' and 'chai' which affects tests, see:
                // https://github.com/import-js/eslint-plugin-import/issues/2168
                'import/no-extraneous-dependencies': 'off',
            },
        },
        {
            files: './src/test/common/**/*.ts',
            parserOptions: {
                project: './src/test/common/tsconfig.json',
            },
        },

        // Karma test source rules
        {
            files: './src/test/karma/**/*.ts',
            parserOptions: {
                project: './src/test/karma/tsconfig.json',
            },
        },
        {
            files: './src/test/karma/app/**/*.ts',
            parserOptions: {
                project: './src/test/karma/app/tsconfig.json',
            },
        },
        {
            files: './src/test/karma/common/**/*.ts',
            parserOptions: {
                project: './src/test/karma/common/tsconfig.json',
            },
        },
        {
            files: './src/test/karma/common/dom/**/*.ts',
            parserOptions: {
                project: './src/test/karma/common/dom/tsconfig.json',
            },
            env: {
                browser: true,
            },
        },
        {
            files: './src/test/karma/worker/backend/**/*.ts',
            parserOptions: {
                project: './src/test/karma/worker/backend/tsconfig.json',
            },
            env: {
                worker: true,
            },
        },
        {
            files: './src/test/karma/worker/service/**/*.ts',
            parserOptions: {
                project: './src/test/karma/worker/service/tsconfig.json',
            },
            env: {
                serviceworker: true,
            },
        },

        // Mocha test source rules
        {
            files: './src/test/mocha/**/*.ts',
            parserOptions: {
                project: './src/test/mocha/tsconfig.json',
            },
        },
        {
            files: './src/test/mocha/app/**/*.ts',
            parserOptions: {
                project: './src/test/mocha/app/tsconfig.json',
            },
        },
        {
            files: './src/test/mocha/common/**/*.ts',
            parserOptions: {
                project: './src/test/mocha/common/tsconfig.json',
            },
            env: {
                node: true,
            },
        },
    ],
};
