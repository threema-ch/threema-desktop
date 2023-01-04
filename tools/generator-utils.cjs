const ts = require('typescript');

/**
 * Recursively traverse over a node.
 *
 * @param root The node to traverse over each child from.
 * @param matchers A list of matcher callbacks. Will get a `node` and needs to
 *   return whether to descent recursively.
 * @param transform Transform function to apply in case all matchers are
 *   matching a node.
 */
function traverse(root, matchers, transform) {
    // Run transform function if done
    if (matchers.length === 0) {
        return transform(root);
    }

    // Iterate over each child
    const matcher = matchers.shift();
    root.forEachChild((node) => {
        if (matcher(node)) {
            // Recursive descent
            return traverse(node, matchers.slice(), transform);
        } else {
            // Continue
            return undefined;
        }
    });

    // Continue
    return undefined;
}

/**
 * Create types import (for `WeakOpaque`).
 *
 * Output:
 *
 *     import type * as types from "~/common/types";
 */
function createTypesImportNode() {
    return ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
            true,
            ts.factory.createNamespaceImport(ts.factory.createIdentifier('types')),
            undefined,
        ),
        ts.factory.createStringLiteral('~/common/types'),
    );
}

/**
 * Creates a new-type.
 *
 * @param name Name of the new-type.
 * @param target Target identifier to bew new-typed.
 * @param tags Optional further tag nodes to be added as part of an intersection.
 * @returns a new-type node.
 */
function createNewtypeNode(name, target, tags) {
    return ts.factory.createTypeAliasDeclaration(
        undefined,
        name,
        undefined,
        ts.factory.createTypeReferenceNode(
            ts.factory.createQualifiedName(
                ts.factory.createIdentifier('types'),
                ts.factory.createIdentifier('WeakOpaque'),
            ),
            [
                ts.factory.createTypeReferenceNode(target.name, undefined),
                ts.factory.createIntersectionTypeNode([
                    ts.factory.createTypeLiteralNode([
                        ts.factory.createPropertySignature(
                            [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                            name,
                            undefined,
                            ts.factory.createTypeOperatorNode(
                                ts.SyntaxKind.UniqueKeyword,
                                ts.factory.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword),
                            ),
                            undefined,
                        ),
                    ]),
                    ...tags,
                ]),
            ],
        ),
    );
}

/**
 * Return leading comments of a node.
 *
 * @param node The node with leading comments to be retrieved.
 * @param source The source code text to extract the comments from.
 * @returns all leading comments.
 */
function getLeadingComments(node, source) {
    return (ts.getLeadingCommentRanges(source, node.pos) ?? []).map((range) => ({
        ...range,
        text: source.slice(
            range.pos + 2,
            range.kind === ts.SyntaxKind.MultiLineCommentTrivia ? range.end - 2 : range.end,
        ),
        pos: -1,
        end: -1,
    }));
}

/**
 * Parse source string as virtual TypeScript source file.
 */
function createSource(name, source) {
    return ts.createSourceFile(name, source, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
}

module.exports = {
    traverse,
    createTypesImportNode,
    createNewtypeNode,
    getLeadingComments,
    createSource,
};
