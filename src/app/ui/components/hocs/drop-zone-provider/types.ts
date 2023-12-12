/**
 * Represents the result of handling dropped files by the user.
 *
 * Contains one of the following statuses:
 * - ok: All dropped files were accessible and readable.
 * - partial: Only some of the dropped files were accessible or readable, while others were not.
 * - inaccessible: All dropped files were inaccessible or not readable.
 * - empty: No files were dropped at all.
 */
export type FileDropResult =
    | {readonly status: 'ok'; readonly files: File[]}
    | {readonly status: 'partial'; readonly files: File[]}
    | {readonly status: 'inaccessible'}
    | {readonly status: 'empty'};
