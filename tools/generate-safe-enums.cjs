#!/usr/bin/env node
/**
 * Generate safe enum wrappers.
 *
 * Note: For editing this script, https://ts-ast-viewer.com/ is very handy.
 */
const fs = require('node:fs');

const ts = require('typescript');

const {getLeadingComments, createSource} = require('./generator-utils.cjs');

const factory = ts.factory;

// Often-used keywords
const u53Keyword = factory.createTypeReferenceNode(factory.createIdentifier('u53'), undefined);
const stringKeyword = factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);

function createEnumConversionAndConstantSet(name, members, initializerType) {
    let functionNameFrom;
    let functionNameContainsTyped;
    let paramType;
    let paramTypeLiteral;
    switch (initializerType) {
        case 'number':
            functionNameFrom = 'fromNumber';
            functionNameContainsTyped = 'containsNumber';
            paramType = u53Keyword;
            paramTypeLiteral = 'number';
            break;
        case 'string':
            functionNameFrom = 'fromString';
            functionNameContainsTyped = 'containsString';
            paramType = stringKeyword;
            paramTypeLiteral = 'string';
            break;
        default:
            throw new Error(`Invalid initializer type: ${initializerType}`);
    }
    return [
        factory.createVariableStatement(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier('ALL'),
                        undefined,
                        factory.createTypeReferenceNode(factory.createIdentifier('ReadonlySet'), [
                            factory.createTypeReferenceNode(
                                factory.createIdentifier(name),
                                undefined,
                            ),
                        ]),
                        factory.createNewExpression(factory.createIdentifier('Set'), undefined, [
                            factory.createAsExpression(
                                factory.createArrayLiteralExpression(
                                    members.map((member) =>
                                        factory.createPropertyAccessExpression(
                                            factory.createIdentifier(name),
                                            factory.createIdentifier(member.identifier),
                                        ),
                                    ),
                                    true,
                                ),
                                factory.createTypeReferenceNode(
                                    factory.createIdentifier('const'),
                                    undefined,
                                ),
                            ),
                        ]),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        ),

        // Function: fromXxx
        factory.createFunctionDeclaration(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            factory.createIdentifier(functionNameFrom),
            undefined,
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('value'),
                    undefined,
                    paramType,
                    undefined,
                ),
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('fallback'),
                    factory.createToken(ts.SyntaxKind.QuestionToken),
                    factory.createTypeReferenceNode(factory.createIdentifier(name), undefined),
                    undefined,
                ),
            ],
            factory.createTypeReferenceNode(factory.createIdentifier(name), undefined),
            factory.createBlock(
                [
                    factory.createIfStatement(
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createParenthesizedExpression(
                                    factory.createAsExpression(
                                        factory.createIdentifier('ALL'),
                                        factory.createTypeReferenceNode(
                                            factory.createIdentifier('ReadonlySet'),
                                            [paramType],
                                        ),
                                    ),
                                ),
                                factory.createIdentifier('has'),
                            ),
                            undefined,
                            [factory.createIdentifier('value')],
                        ),
                        factory.createBlock(
                            [
                                factory.createReturnStatement(
                                    factory.createAsExpression(
                                        factory.createIdentifier('value'),
                                        factory.createTypeReferenceNode(
                                            factory.createIdentifier(name),
                                            undefined,
                                        ),
                                    ),
                                ),
                            ],
                            true,
                        ),
                        undefined,
                    ),
                    factory.createIfStatement(
                        factory.createBinaryExpression(
                            factory.createIdentifier('fallback'),
                            factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
                            factory.createIdentifier('undefined'),
                        ),
                        factory.createBlock(
                            [factory.createReturnStatement(factory.createIdentifier('fallback'))],
                            true,
                        ),
                        undefined,
                    ),
                    factory.createThrowStatement(
                        factory.createNewExpression(factory.createIdentifier('Error'), undefined, [
                            factory.createTemplateExpression(factory.createTemplateHead('', ''), [
                                factory.createTemplateSpan(
                                    factory.createIdentifier('value'),
                                    factory.createTemplateTail(
                                        ` is not a valid ${name}`,
                                        ` is not a valid ${name}`,
                                    ),
                                ),
                            ]),
                        ]),
                    ),
                ],
                true,
            ),
        ),

        // Function: containsXxx
        factory.createFunctionDeclaration(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            factory.createIdentifier(functionNameContainsTyped),
            undefined,
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('value'),
                    undefined,
                    paramType,
                    undefined,
                ),
            ],
            factory.createTypePredicateNode(
                undefined,
                factory.createIdentifier('value'),
                factory.createTypeReferenceNode(factory.createIdentifier(name), undefined),
            ),
            factory.createBlock(
                [
                    factory.createReturnStatement(
                        factory.createCallExpression(
                            factory.createPropertyAccessExpression(
                                factory.createParenthesizedExpression(
                                    factory.createAsExpression(
                                        factory.createIdentifier('ALL'),
                                        factory.createTypeReferenceNode(
                                            factory.createIdentifier('ReadonlySet'),
                                            [paramType],
                                        ),
                                    ),
                                ),
                                factory.createIdentifier('has'),
                            ),
                            undefined,
                            [factory.createIdentifier('value')],
                        ),
                    ),
                ],
                true,
            ),
        ),

        // Function: contains
        factory.createFunctionDeclaration(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            factory.createIdentifier('contains'),
            undefined,
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('value'),
                    undefined,
                    factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
                    undefined,
                ),
            ],
            factory.createTypePredicateNode(
                undefined,
                factory.createIdentifier('value'),
                factory.createTypeReferenceNode(factory.createIdentifier(name), undefined),
            ),
            factory.createBlock(
                [
                    factory.createReturnStatement(
                        factory.createBinaryExpression(
                            factory.createBinaryExpression(
                                factory.createTypeOfExpression(factory.createIdentifier('value')),
                                factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                                factory.createStringLiteral(paramTypeLiteral),
                            ),
                            factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                            factory.createCallExpression(
                                factory.createPropertyAccessExpression(
                                    factory.createParenthesizedExpression(
                                        factory.createAsExpression(
                                            factory.createIdentifier('ALL'),
                                            factory.createTypeReferenceNode(
                                                factory.createIdentifier('ReadonlySet'),
                                                [paramType],
                                            ),
                                        ),
                                    ),
                                    factory.createIdentifier('has'),
                                ),
                                undefined,
                                [factory.createIdentifier('value')],
                            ),
                        ),
                    ),
                ],
                true,
            ),
        ),
    ];
}

function createEnumNameFunction(name, members) {
    return [
        factory.createVariableStatement(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier('NAME_OF'),
                        undefined,
                        undefined,
                        factory.createAsExpression(
                            factory.createObjectLiteralExpression(
                                [
                                    ...members.map((member) =>
                                        factory.createPropertyAssignment(
                                            factory.createComputedPropertyName(
                                                factory.createPropertyAccessExpression(
                                                    factory.createIdentifier(name),
                                                    factory.createIdentifier(member.identifier),
                                                ),
                                            ),
                                            factory.createStringLiteral(member.identifier),
                                        ),
                                    ),
                                ],
                                true,
                            ),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('const'),
                                undefined,
                            ),
                        ),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        ),
        factory.createFunctionDeclaration(
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            factory.createIdentifier('nameOf'),
            [
                factory.createTypeParameterDeclaration(
                    undefined,
                    factory.createIdentifier('T'),
                    u53Keyword,
                    undefined,
                ),
            ],
            [
                factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    factory.createIdentifier('value'),
                    undefined,
                    factory.createTypeReferenceNode(factory.createIdentifier('T'), undefined),
                    undefined,
                ),
            ],
            factory.createUnionTypeNode([
                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ]),
            factory.createBlock(
                [
                    factory.createReturnStatement(
                        factory.createElementAccessExpression(
                            factory.createParenthesizedExpression(
                                factory.createAsExpression(
                                    factory.createIdentifier('NAME_OF'),
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier('Record'),
                                        [
                                            u53Keyword,
                                            factory.createUnionTypeNode([
                                                factory.createKeywordTypeNode(
                                                    ts.SyntaxKind.StringKeyword,
                                                ),
                                                factory.createKeywordTypeNode(
                                                    ts.SyntaxKind.UndefinedKeyword,
                                                ),
                                            ]),
                                        ],
                                    ),
                                ),
                            ),
                            factory.createIdentifier('value'),
                        ),
                    ),
                ],
                true,
            ),
        ),
    ];
}

function createEnumStoreFactoryFunction(name) {
    return factory.createFunctionDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        undefined,
        factory.createIdentifier('createStore'),
        [
            factory.createTypeParameterDeclaration(
                undefined,
                factory.createIdentifier('S'),
                factory.createTypeReferenceNode(factory.createIdentifier('MonotonicEnumStore'), [
                    factory.createTypeReferenceNode(factory.createIdentifier(name), undefined),
                ]),
                undefined,
            ),
        ],
        [
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('constructor'),
                undefined,
                factory.createConstructorTypeNode(
                    undefined,
                    undefined,
                    [
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('initial'),
                            undefined,
                            factory.createTypeReferenceNode(
                                factory.createIdentifier(name),
                                undefined,
                            ),
                            undefined,
                        ),
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('activator'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
                            undefined,
                        ),
                        factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            factory.createIdentifier('debug'),
                            factory.createToken(ts.SyntaxKind.QuestionToken),
                            factory.createTypeReferenceNode(
                                factory.createIdentifier('StoreDebug'),
                                [
                                    factory.createTypeReferenceNode(
                                        factory.createIdentifier(name),
                                        undefined,
                                    ),
                                ],
                            ),
                            undefined,
                        ),
                    ],
                    factory.createTypeReferenceNode(factory.createIdentifier('S'), undefined),
                ),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('initial'),
                undefined,
                factory.createTypeReferenceNode(factory.createIdentifier(name), undefined),
                undefined,
            ),
            factory.createParameterDeclaration(
                undefined,
                undefined,
                factory.createIdentifier('debug'),
                factory.createToken(ts.SyntaxKind.QuestionToken),
                factory.createTypeLiteralNode([
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier('log'),
                        undefined,
                        factory.createTypeReferenceNode(
                            factory.createIdentifier('Logger'),
                            undefined,
                        ),
                        undefined,
                    ),
                    factory.createPropertySignature(
                        undefined,
                        factory.createIdentifier('tag'),
                        undefined,
                        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                        undefined,
                    ),
                ]),
                undefined,
            ),
        ],
        factory.createTypeReferenceNode(factory.createIdentifier('S'), undefined),
        factory.createBlock(
            [
                factory.createReturnStatement(
                    factory.createNewExpression(
                        factory.createIdentifier('constructor'),
                        undefined,
                        [
                            factory.createIdentifier('initial'),
                            factory.createIdentifier('undefined'),
                            factory.createConditionalExpression(
                                factory.createBinaryExpression(
                                    factory.createIdentifier('debug'),
                                    factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                                    factory.createIdentifier('undefined'),
                                ),
                                undefined,
                                factory.createIdentifier('undefined'),
                                undefined,
                                factory.createObjectLiteralExpression(
                                    [
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier('log'),
                                            factory.createPropertyAccessExpression(
                                                factory.createIdentifier('debug'),
                                                factory.createIdentifier('log'),
                                            ),
                                        ),
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier('tag'),
                                            factory.createPropertyAccessExpression(
                                                factory.createIdentifier('debug'),
                                                factory.createIdentifier('tag'),
                                            ),
                                        ),
                                        factory.createPropertyAssignment(
                                            factory.createIdentifier('representation'),
                                            factory.createArrowFunction(
                                                undefined,
                                                undefined,
                                                [
                                                    factory.createParameterDeclaration(
                                                        undefined,
                                                        undefined,
                                                        factory.createIdentifier('name'),
                                                        undefined,
                                                        undefined,
                                                        undefined,
                                                    ),
                                                ],
                                                factory.createKeywordTypeNode(
                                                    ts.SyntaxKind.StringKeyword,
                                                ),
                                                factory.createToken(
                                                    ts.SyntaxKind.EqualsGreaterThanToken,
                                                ),
                                                factory.createElementAccessExpression(
                                                    factory.createIdentifier('NAME_OF'),
                                                    factory.createIdentifier('name'),
                                                ),
                                            ),
                                        ),
                                    ],
                                    true,
                                ),
                            ),
                        ],
                    ),
                ),
            ],
            true,
        ),
    );
}

function createEnumUtilsNamespace(name, members, utils, initializerType) {
    const nodes = [];

    // Add conversion function and constant set of all enum members (if
    // requested)
    if (utils.has('convert')) {
        nodes.push(...createEnumConversionAndConstantSet(name, members, initializerType));
    }

    // Add enum to name mapper function (if requested)
    if (utils.has('name')) {
        nodes.push(...createEnumNameFunction(name, members));
    }

    // Add enum store factory function (if requested)
    if (utils.has('store')) {
        nodes.push(createEnumStoreFactoryFunction(name));
    }

    // Create utils namespace
    return factory.createModuleDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createIdentifier(`${name}Utils`),
        factory.createModuleBlock(nodes),
        ts.NodeFlags.Namespace,
    );
}

function createEnumNamespace(name, members) {
    return factory.createModuleDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        factory.createIdentifier(name),
        factory.createModuleBlock(
            members
                .map((member) => [
                    factory.createVariableStatement(
                        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                        factory.createVariableDeclarationList(
                            [
                                factory.createVariableDeclaration(
                                    factory.createIdentifier(member.identifier),
                                    undefined,
                                    undefined,
                                    member.initializer,
                                ),
                            ],
                            ts.NodeFlags.Const,
                        ),
                    ),
                    ts.setSyntheticLeadingComments(
                        factory.createTypeAliasDeclaration(
                            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                            factory.createIdentifier(member.identifier),
                            undefined,
                            factory.createTypeQueryNode(
                                factory.createIdentifier(member.identifier),
                            ),
                        ),
                        member.comments,
                    ),
                ])
                .flat(2),
        ),
        ts.NodeFlags.Namespace,
    );
}

function getMembers(source, members) {
    let hasInitializers = false;
    const results = [];
    const initializerKinds = new Set();
    for (const [index, member] of Object.entries(members)) {
        if (member?.kind !== ts.SyntaxKind.EnumMember) {
            continue;
        }

        // Validate initialiser
        const identifier = member.name.escapedText;
        let initializer;
        if (member.initializer === undefined && hasInitializers) {
            console.error(member);
            throw new Error('Either all enum members should have initialisers or none of them');
        }
        if (member.initializer !== undefined) {
            hasInitializers = true;
            switch (member.initializer.kind) {
                case ts.SyntaxKind.NumericLiteral:
                    initializer = factory.createNumericLiteral(member.initializer.text);
                    initializerKinds.add('number');
                    break;
                case ts.SyntaxKind.StringLiteral:
                    initializer = factory.createStringLiteral(member.initializer.text);
                    initializerKinds.add('string');
                    break;
                default:
                    console.error(member);
                    throw new Error(
                        'Enum member must have a numeric or string literal as initialiser',
                    );
            }
        }
        const comments = getLeadingComments(member, source);
        results.push({
            identifier,
            initializer: initializer ?? factory.createNumericLiteral(index),
            comments,
        });
    }
    if (initializerKinds.size > 1) {
        throw new Error(
            `Enum members must all have the same initialiser kind, not a mix of [${new Array(
                ...initializerKinds,
            )}]`,
        );
    }
    return [results, initializerKinds.values().next().value];
}

function createSafeEnumNode(source, declaration) {
    const name = declaration.name.escapedText;
    const nodes = [];

    // Get comments of the enum and parse 'generate' annotations (if any) in
    // order to determine which utility functions should be generated.
    const comments = getLeadingComments(declaration, source);
    const utils = new Set(
        [
            ...(comments
                .map((comment) => comment.text)
                .join('\n')
                .matchAll(/@generate (.+)/gmu) ?? []),
        ]
            .map(([_, groups]) => groups.split(' '))
            .flat(2),
    );

    // Extract each enum member and the associated initialiser
    const [members, initializerType] = getMembers(source, declaration.members);

    // Create the namespace that emulates the enum in a safe manner
    nodes.push(createEnumNamespace(name, members));

    // Create type alias for the namespaced enum
    nodes.push(
        ts.setSyntheticLeadingComments(
            factory.createTypeAliasDeclaration(
                [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
                factory.createIdentifier(name),
                undefined,
                factory.createIndexedAccessTypeNode(
                    factory.createTypeQueryNode(factory.createIdentifier(name)),
                    factory.createTypeOperatorNode(
                        ts.SyntaxKind.KeyOfKeyword,
                        factory.createTypeQueryNode(factory.createIdentifier(name)),
                    ),
                ),
            ),
            comments,
        ),
    );

    // Create utils namespace and functions
    if (utils.size > 0) {
        nodes.push(createEnumUtilsNamespace(name, members, utils, initializerType));
    }

    return nodes;
}

if (require.main === module) {
    // Parse source from stdin
    const source = fs.readFileSync(0, 'utf8');
    const input = createSource('input.ts', source);
    const output = createSource('output.ts', '');

    // Create imports and attach generated note
    output.statements.push(
        factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports([
                    factory.createImportSpecifier(
                        true,
                        undefined,
                        factory.createIdentifier('Logger'),
                    ),
                ]),
            ),
            factory.createStringLiteral('./logging'),
            undefined,
        ),
        factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports([
                    factory.createImportSpecifier(true, undefined, factory.createIdentifier('u53')),
                ]),
            ),
            factory.createStringLiteral('./types'),
            undefined,
        ),
        factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports([
                    factory.createImportSpecifier(
                        true,
                        undefined,
                        factory.createIdentifier('MonotonicEnumStore'),
                    ),
                    factory.createImportSpecifier(
                        true,
                        undefined,
                        factory.createIdentifier('StoreDebug'),
                    ),
                ]),
            ),
            factory.createStringLiteral('./utils/store'),
            undefined,
        ),
    );

    // Generate safe enum types for each enum declaration
    for (const node of input.statements) {
        switch (node.kind) {
            case ts.SyntaxKind.ExportDeclaration:
                break;
            case ts.SyntaxKind.EnumDeclaration:
                output.statements.push(...createSafeEnumNode(source, node));
                break;
            default:
                console.error(node);
                throw new Error(`Expected an enum declaration, got ${node.kind}`);
        }
    }

    // Comment indicating that this is a generated file
    const generatedWarningComment =
        '// WARNING: This file has been generated by safe-enums. Do not modify it!';

    // Print modified source to stdout
    const printer = ts.createPrinter();
    process.stdout.write(`${generatedWarningComment}\n\n`);
    process.stdout.write(printer.printFile(output));
    process.stdout.write(`\n${generatedWarningComment}`);
    process.stdout.write(`\n// vim: set readonly :`); // Vim modeline
}
