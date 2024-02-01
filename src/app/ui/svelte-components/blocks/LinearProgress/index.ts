/**
 * Variant of progress indicator.
 *
 * - determinate: At any time, a concrete value between 0% and 100% can be
 *     determined for an ongoing process.
 * - indeterminate: The duration of the process is unknown.
 */
export type LinearProgressVariant = 'determinate' | 'indeterminate';
