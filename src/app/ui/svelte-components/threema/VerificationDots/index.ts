/**
 * The color theme used for the verification level dots.
 *
 * - If colors are "default", then the regular colors (red, orange, green) will
 *   be used.
 * - If colors are set to "shared-work-subscription", then the "server-verified" and
 *   "fully-verified" verification levels will be shown in blue.
 *
 * The color setting "shared-work-subscription" should only be applied, if the user
 * is using Threema Work and if this contact is part of the same Work package as
 * the user. It should _not_ be applied to all contacts that use Threema Work
 * (those will be indicated using the briefcase badge instead).
 */
export type VerificationLevelColors = 'default' | 'shared-work-subscription';

/**
 * The verification level of a contact.
 */
export type VerificationLevel = 'unverified' | 'server-verified' | 'fully-verified';
