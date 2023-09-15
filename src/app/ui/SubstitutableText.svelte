<script lang="ts">
  import {globals} from '~/app/globals';
  import {type u53} from '~/common/types';
  import {assertUnreachable, unreachable, unwrap} from '~/common/utils/assert';

  export let text: string | undefined;

  const log = globals.unwrap().uiLogging.logger('ui.component.substitutable-text');

  // For now there are no instances of needing more than 3 different tags in a text. We can add more
  // if needed.
  const ALLOWED_TAGS = ['1', '2', '3'] as const;
  type AllowedTag = (typeof ALLOWED_TAGS)[u53];

  function isAllowedTag(tag: string | undefined): tag is AllowedTag {
    if (tag === undefined) {
      return false;
    }
    return (ALLOWED_TAGS as readonly string[]).includes(tag);
  }

  const ALLOWED_TAGS_CHAR_SET = `[${ALLOWED_TAGS.join('')}]`;
  const SELF_CLOSING_TAG_PATTERN = `<(?<selfClosingTag>${ALLOWED_TAGS_CHAR_SET}) ?/>` as const;
  const TAG_PATTERN = `<(?<tag>${ALLOWED_TAGS_CHAR_SET})>(?<text>.*?)</\\k<tag>>` as const;
  const PLAIN_TEXT_PATTERN = `(?<plain>(?:.+?(?=<${ALLOWED_TAGS_CHAR_SET}(?: ?/)?>)|.+$))` as const;

  // eslint-disable-next-line threema/ban-stateful-regex-flags
  const TAG_SPLITTER_REGEX = new RegExp(
    [SELF_CLOSING_TAG_PATTERN, TAG_PATTERN, PLAIN_TEXT_PATTERN].join('|'),
    'gum',
  );

  type Fragment =
    | {readonly type: 'plain'; readonly text: string}
    | {readonly type: 'tag'; readonly tag: AllowedTag; readonly text: string}
    | {readonly type: 'selfClosingTag'; readonly tag: AllowedTag; readonly text: undefined};

  function warnMissingSlot(tag: AllowedTag): void {
    log.warn(
      `Text "${text}" expects a child slot with \`name="${tag}"\` but it has not been provided.`,
    );
  }

  function warnUnusedSlots(newFragments: Fragment[]): void {
    const expectedTags = new Set(
      newFragments
        .map((fragment) => (fragment.type === 'plain' ? '' : fragment.tag))
        .filter(isAllowedTag),
    );
    for (const tag of ALLOWED_TAGS) {
      if ($$slots[tag] && !expectedTags.has(tag)) {
        log.warn(`Unused child slot with \`name="${tag}"\` for text "${text}".`);
      }
    }
  }

  $: fragments =
    text === undefined
      ? []
      : [...text.matchAll(TAG_SPLITTER_REGEX)].map<Fragment>((match) => {
          const matchedText = match[0];
          const {groups} = match;

          if (groups === undefined) {
            return assertUnreachable('TAG_SPLITTER_REGEX should have returned a matched group');
          }

          if (groups.plain !== undefined) {
            return {
              type: 'plain',
              text: groups.plain,
            };
          }

          if (isAllowedTag(groups.tag)) {
            const tagText = unwrap(groups.text);
            if ($$slots[groups.tag]) {
              return {
                type: 'tag',
                tag: groups.tag,
                text: tagText,
              };
            }
            warnMissingSlot(groups.tag);
            return {
              type: 'plain',
              text: import.meta.env.DEBUG ? matchedText : tagText,
            };
          }

          if (isAllowedTag(groups.selfClosingTag)) {
            if ($$slots[groups.selfClosingTag]) {
              return {
                type: 'selfClosingTag',
                tag: groups.selfClosingTag,
              };
            }
            warnMissingSlot(groups.selfClosingTag);
            return {
              type: 'plain',
              text: import.meta.env.DEBUG ? matchedText : '',
            };
          }

          return assertUnreachable(`Unexpected matching by TAG_SPLITTER_REGEX on '${matchedText}'`);
        });

  $: warnUnusedSlots(fragments);
</script>

<template>
  {#each fragments as fragment (fragment)}
    {#if fragment.type === 'plain'}
      {fragment.text}
    {:else if fragment.type === 'tag' || fragment.type === 'selfClosingTag'}
      {#if fragment.tag === '1'}
        <slot name="1" text={fragment.text} />
      {:else if fragment.tag === '2'}
        <slot name="2" text={fragment.text} />
      {:else if fragment.tag === '3'}
        <slot name="3" text={fragment.text} />
      {:else}
        {unreachable(fragment.tag)}
      {/if}
    {:else}
      {unreachable(fragment)}
    {/if}
  {/each}
</template>
