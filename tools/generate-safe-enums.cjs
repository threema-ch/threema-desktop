#!/usr/bin/env node
/**
 * Generate safe enum wrappers.
 *
 * Note: For editing this script, https://ts-ast-viewer.com/ is very handy.
 */
const fs = require('fs');
const ts = require('typescript');
const factory = ts.factory;
const {getLeadingComments, createSource} = require('./generator-utils.cjs');

const u53Keyword = ts.createTypeReferenceNode(ts.createIdentifier('u53'), undefined);
const stringKeyword = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
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
        ts.createVariableStatement(
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        ts.createIdentifier('ALL'),
                        ts.createTypeReferenceNode(ts.createIdentifier('ReadonlySet'), [
                            ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
                        ]),
                        ts.createNew(ts.createIdentifier('Set'), undefined, [
                            ts.createAsExpression(
                                ts.createArrayLiteral(
                                    members.map((member) =>
                                        ts.createPropertyAccess(
                                            ts.createIdentifier(name),
                                            ts.createIdentifier(member.identifier),
                                        ),
                                    ),
                                    true,
                                ),
                                ts.createTypeReferenceNode(ts.createIdentifier('const'), undefined),
                            ),
                        ]),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        ),

        // Function: fromXxx
        factory.createFunctionDeclaration(
            undefined,
            [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            factory.createIdentifier(functionNameFrom),
            undefined,
            [
                factory.createParameterDeclaration(
                    undefined,
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
        ts.createFunctionDeclaration(
            undefined,
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            ts.createIdentifier(functionNameContainsTyped),
            undefined,
            [
                ts.createParameter(
                    undefined,
                    undefined,
                    undefined,
                    ts.createIdentifier('value'),
                    undefined,
                    paramType,
                    undefined,
                ),
            ],
            ts.createTypePredicateNodeWithModifier(
                undefined,
                ts.createIdentifier('value'),
                ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
            ),
            ts.createBlock(
                [
                    ts.createReturn(
                        ts.createCall(
                            ts.createPropertyAccess(
                                ts.createParen(
                                    ts.createAsExpression(
                                        ts.createIdentifier('ALL'),
                                        ts.createTypeReferenceNode(
                                            ts.createIdentifier('ReadonlySet'),
                                            [paramType],
                                        ),
                                    ),
                                ),
                                ts.createIdentifier('has'),
                            ),
                            undefined,
                            [ts.createIdentifier('value')],
                        ),
                    ),
                ],
                true,
            ),
        ),

        // Function: contains
        ts.createFunctionDeclaration(
            undefined,
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            ts.createIdentifier('contains'),
            undefined,
            [
                ts.createParameter(
                    undefined,
                    undefined,
                    undefined,
                    ts.createIdentifier('value'),
                    undefined,
                    ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
                    undefined,
                ),
            ],
            ts.createTypePredicateNodeWithModifier(
                undefined,
                ts.createIdentifier('value'),
                ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
            ),
            ts.createBlock(
                [
                    ts.createReturn(
                        ts.createBinary(
                            ts.createBinary(
                                ts.createTypeOf(ts.createIdentifier('value')),
                                ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                                ts.createStringLiteral(paramTypeLiteral),
                            ),
                            ts.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
                            ts.createCall(
                                ts.createPropertyAccess(
                                    ts.createParen(
                                        ts.createAsExpression(
                                            ts.createIdentifier('ALL'),
                                            ts.createTypeReferenceNode(
                                                ts.createIdentifier('ReadonlySet'),
                                                [paramType],
                                            ),
                                        ),
                                    ),
                                    ts.createIdentifier('has'),
                                ),
                                undefined,
                                [ts.createIdentifier('value')],
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
        ts.createVariableStatement(
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            ts.createVariableDeclarationList(
                [
                    ts.createVariableDeclaration(
                        ts.createIdentifier('NAME_OF'),
                        undefined,
                        ts.createAsExpression(
                            ts.createObjectLiteral(
                                [
                                    ...members.map((member) =>
                                        ts.createPropertyAssignment(
                                            ts.createComputedPropertyName(
                                                ts.createPropertyAccess(
                                                    ts.createIdentifier(name),
                                                    ts.createIdentifier(member.identifier),
                                                ),
                                            ),
                                            ts.createStringLiteral(member.identifier),
                                        ),
                                    ),
                                ],
                                true,
                            ),
                            ts.createTypeReferenceNode(ts.createIdentifier('const'), undefined),
                        ),
                    ),
                ],
                ts.NodeFlags.Const,
            ),
        ),
        ts.createFunctionDeclaration(
            undefined,
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            ts.createIdentifier('nameOf'),
            [ts.createTypeParameterDeclaration(ts.createIdentifier('T'), u53Keyword, undefined)],
            [
                ts.createParameter(
                    undefined,
                    undefined,
                    undefined,
                    ts.createIdentifier('value'),
                    undefined,
                    ts.createTypeReferenceNode(ts.createIdentifier('T'), undefined),
                    undefined,
                ),
            ],
            ts.createUnionTypeNode([
                ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
            ]),
            ts.createBlock(
                [
                    ts.createReturn(
                        ts.createElementAccess(
                            ts.createParen(
                                ts.createAsExpression(
                                    ts.createIdentifier('NAME_OF'),
                                    ts.createTypeReferenceNode(ts.createIdentifier('Record'), [
                                        u53Keyword,
                                        ts.createUnionTypeNode([
                                            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                            ts.createKeywordTypeNode(
                                                ts.SyntaxKind.UndefinedKeyword,
                                            ),
                                        ]),
                                    ]),
                                ),
                            ),
                            ts.createIdentifier('value'),
                        ),
                    ),
                ],
                true,
            ),
        ),
    ];
}

function createEnumStoreFactoryFunction(name) {
    return ts.createFunctionDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        undefined,
        ts.createIdentifier('createStore'),
        [
            ts.createTypeParameterDeclaration(
                ts.createIdentifier('S'),
                ts.createTypeReferenceNode(ts.createIdentifier('MonotonicEnumStore'), [
                    ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
                ]),
                undefined,
            ),
        ],
        [
            ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier('constructor'),
                undefined,
                ts.createConstructorTypeNode(
                    undefined,
                    [
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('initial'),
                            undefined,
                            ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
                            undefined,
                        ),
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('activator'),
                            ts.createToken(ts.SyntaxKind.QuestionToken),
                            ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
                            undefined,
                        ),
                        ts.createParameter(
                            undefined,
                            undefined,
                            undefined,
                            ts.createIdentifier('debug'),
                            ts.createToken(ts.SyntaxKind.QuestionToken),
                            ts.createTypeReferenceNode(ts.createIdentifier('StoreDebug'), [
                                ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
                            ]),
                            undefined,
                        ),
                    ],
                    ts.createTypeReferenceNode(ts.createIdentifier('S'), undefined),
                ),
                undefined,
            ),
            ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier('initial'),
                undefined,
                ts.createTypeReferenceNode(ts.createIdentifier(name), undefined),
                undefined,
            ),
            ts.createParameter(
                undefined,
                undefined,
                undefined,
                ts.createIdentifier('debug'),
                ts.createToken(ts.SyntaxKind.QuestionToken),
                ts.createTypeLiteralNode([
                    ts.createPropertySignature(
                        undefined,
                        ts.createIdentifier('log'),
                        undefined,
                        ts.createTypeReferenceNode(ts.createIdentifier('Logger'), undefined),
                        undefined,
                    ),
                    ts.createPropertySignature(
                        undefined,
                        ts.createIdentifier('tag'),
                        undefined,
                        ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                        undefined,
                    ),
                ]),
                undefined,
            ),
        ],
        ts.createTypeReferenceNode(ts.createIdentifier('S'), undefined),
        ts.createBlock(
            [
                ts.createReturn(
                    ts.createNew(ts.createIdentifier('constructor'), undefined, [
                        ts.createIdentifier('initial'),
                        ts.createIdentifier('undefined'),
                        ts.createConditional(
                            ts.createBinary(
                                ts.createIdentifier('debug'),
                                ts.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
                                ts.createIdentifier('undefined'),
                            ),
                            ts.createIdentifier('undefined'),
                            ts.createObjectLiteral(
                                [
                                    ts.createPropertyAssignment(
                                        ts.createIdentifier('log'),
                                        ts.createPropertyAccess(
                                            ts.createIdentifier('debug'),
                                            ts.createIdentifier('log'),
                                        ),
                                    ),
                                    ts.createPropertyAssignment(
                                        ts.createIdentifier('tag'),
                                        ts.createPropertyAccess(
                                            ts.createIdentifier('debug'),
                                            ts.createIdentifier('tag'),
                                        ),
                                    ),
                                    ts.createPropertyAssignment(
                                        ts.createIdentifier('representation'),
                                        ts.createArrowFunction(
                                            undefined,
                                            undefined,
                                            [
                                                ts.createParameter(
                                                    undefined,
                                                    undefined,
                                                    undefined,
                                                    ts.createIdentifier('name'),
                                                    undefined,
                                                    undefined,
                                                    undefined,
                                                ),
                                            ],
                                            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                                            ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                                            ts.createElementAccess(
                                                ts.createIdentifier('NAME_OF'),
                                                ts.createIdentifier('name'),
                                            ),
                                        ),
                                    ),
                                ],
                                true,
                            ),
                        ),
                    ]),
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
    return ts.createModuleDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.createIdentifier(`${name}Utils`),
        ts.createModuleBlock(nodes),
        ts.NodeFlags.Namespace,
    );
}

function createEnumNamespace(name, members) {
    return ts.createModuleDeclaration(
        undefined,
        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
        ts.createIdentifier(name),
        ts.createModuleBlock(
            members
                .map((member) => [
                    ts.createVariableStatement(
                        [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                        ts.createVariableDeclarationList(
                            [
                                ts.createVariableDeclaration(
                                    ts.createIdentifier(member.identifier),
                                    undefined,
                                    member.initializer,
                                ),
                            ],
                            ts.NodeFlags.Const,
                        ),
                    ),
                    ts.setSyntheticLeadingComments(
                        ts.createTypeAliasDeclaration(
                            undefined,
                            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                            ts.createIdentifier(member.identifier),
                            undefined,
                            ts.createTypeQueryNode(ts.createIdentifier(member.identifier)),
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
                    initializer = ts.createNumericLiteral(member.initializer.text);
                    initializerKinds.add('number');
                    break;
                case ts.SyntaxKind.StringLiteral:
                    initializer = ts.createStringLiteral(member.initializer.text);
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
            initializer: initializer ?? ts.createNumericLiteral(index),
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
            ts.createTypeAliasDeclaration(
                undefined,
                [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
                ts.createIdentifier(name),
                undefined,
                ts.createIndexedAccessTypeNode(
                    ts.createTypeQueryNode(ts.createIdentifier(name)),
                    ts.createTypeOperatorNode(ts.createTypeQueryNode(ts.createIdentifier(name))),
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
