#!/usr/bin/env node
const fs = require('fs');
const ts = require('typescript');
const {
    traverse,
    createTypesImportNode,
    createNewtypeNode,
    createSource,
} = require('./generator-utils.cjs');

/**
 * Convert interface name `IFoo` or `Foo` to `FooEncodable`.
 *
 * @param iface Interface name (`IFoo` or `Foo`).
 * @returns Converted interface name (`FooEncodable`).
 */
function getEncodableInterfaceName(iface) {
    const base =
        iface.escapedText.match(/^I[A-Z]/u) !== null
            ? iface.escapedText.slice(1)
            : iface.escapedText;
    return `${base}Encodable`;
}

/**
 * Update message interface:
 *
 * - Make all array properties `readonly`
 * - Tag the interface with `tag.ProtobufMessage`
 */
function updateMessageInterface(iface) {
    // Make all array properties `readonly`
    for (const member of iface.members) {
        if (
            member.type.kind !== ts.SyntaxKind.ParenthesizedType ||
            member.type.type.kind !== ts.SyntaxKind.UnionType
        ) {
            continue;
        }
        const union = member.type.type;
        for (let i = 0; i < union.types.length; ++i) {
            const type = union.types[i];
            if (type.kind !== ts.SyntaxKind.ArrayType) {
                continue;
            }
            union.types[i] = ts.factory.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, type);
        }
    }

    // Tag the interface with `tag.ProtobufMessage`
    return createNewtypeNode(getEncodableInterfaceName(iface.name), iface, [
        ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
                ts.factory.createIdentifier('tag'),
                ts.factory.createIdentifier('ProtobufMessage'),
            ),
            undefined,
        ),
    ]);
}

/**
 * Update message class:
 *
 * - Make all array properties `readonly`
 * - Patch `encode` method interface reference
 *
 * @param class_ The class node.
 */
function updateMessageClass(class_) {
    for (const member of class_.members) {
        // Make all array properties `readonly`
        if (
            member.kind === ts.SyntaxKind.PropertyDeclaration &&
            member.type.kind === ts.SyntaxKind.ArrayType
        ) {
            member.type = ts.factory.createTypeOperatorNode(
                ts.SyntaxKind.ReadonlyKeyword,
                member.type,
            );
        }

        // Update `encode` method interface reference
        if (
            member.kind === ts.SyntaxKind.MethodDeclaration &&
            member.name.escapedText === 'encode'
        ) {
            for (const parameter of member.parameters) {
                if (parameter.name.escapedText !== 'message') {
                    continue;
                }
                parameter.type.typeName.right = ts.factory.createIdentifier(
                    getEncodableInterfaceName(parameter.type.typeName.right),
                );
            }
        }
    }
}

/**
 * Create tag import (for `ProtobufMessage`).
 *
 * Output:
 *
 *     import type * as tag from "../tag";
 */
function createTagImportNode() {
    return ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
            true,
            ts.factory.createNamespaceImport(ts.factory.createIdentifier('tag')),
            undefined,
        ),
        ts.factory.createStringLiteral('../tag'),
    );
}

function updateMessageNamespaces(root, matchers) {
    return traverse(
        root,
        matchers ?? [
            (node) => node.kind === ts.SyntaxKind.ModuleDeclaration,
            (node) => node.kind === ts.SyntaxKind.ModuleBlock,
        ],
        (block) => {
            const statements = [];
            for (const child of block.statements) {
                statements.push(child);
                switch (child.kind) {
                    case ts.SyntaxKind.InterfaceDeclaration: {
                        // Interface: Insert new-type and make all arrays `readonly`.
                        statements.push(updateMessageInterface(child));
                        break;
                    }
                    case ts.SyntaxKind.ClassDeclaration: {
                        // Class: Update 'encode' method parameter interface to
                        // new-type.
                        updateMessageClass(child);
                        break;
                    }
                    case ts.SyntaxKind.ModuleDeclaration: {
                        updateMessageNamespaces(child, [
                            (node) => node.kind === ts.SyntaxKind.ModuleBlock,
                        ]);
                        break;
                    }
                    default:
                        break;
                }
            }
            block.statements = statements;

            // Continue traversing
            return undefined;
        },
    );
}

function main() {
    // Parse source from stdin
    const sourceFromStdin = fs.readFileSync(0, 'utf8');
    const source = createSource('index.d.ts', sourceFromStdin);

    // Insert tag import
    source.statements.unshift(createTagImportNode());

    // Insert types import
    source.statements.unshift(createTypesImportNode());

    // Insert 'Long' import
    // TODO(DESK-48): To be removed once we make use of BigInt
    source.statements.unshift(
        ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(true, ts.factory.createIdentifier('Long'), undefined),
            ts.factory.createStringLiteral('long'),
        ),
    );

    // Update message interfaces and classes declared within namespace blocks.
    updateMessageNamespaces(source);

    // Print modified source to stdout
    const printer = ts.createPrinter();
    process.stdout.write(printer.printFile(source));
}
if (require.main === module) {
    main();
}
