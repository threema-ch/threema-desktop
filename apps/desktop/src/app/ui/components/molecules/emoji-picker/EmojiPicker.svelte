<script lang="ts">
  import type {f64} from '@threema/ts-utils/float/f64';
  import {ensureError} from '@threema/ts-utils/meta/ensure-error';

  import {globals} from '~/app/globals';
  import {intersection} from '~/app/ui/actions/intersection';
  import Emoji from '~/app/ui/components/atoms/emoji/Emoji.svelte';
  import {
    EMOJI_GROUP_ICON,
    getEmojiGroupTitle,
  } from '~/app/ui/components/molecules/emoji-picker/helpers';
  import type {EmojiPickerProps} from '~/app/ui/components/molecules/emoji-picker/props';
  import type {
    EmojiGroupIdOrFavorites,
    RemoteEmojiPickerViewModelStoreValue,
  } from '~/app/ui/components/molecules/emoji-picker/types';
  import SearchBar from '~/app/ui/components/molecules/search-bar/SearchBar.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {
    EMOJI_GROUP_IDS,
    isSingleUnicodeEmoji,
    type EmojiDetails,
    type EmojiGroupId,
    type SingleUnicodeEmoji,
  } from '~/common/utils/emoji';
  import type {Remote} from '~/common/utils/endpoint';
  import {ReadableStore, type IQueryableStore} from '~/common/utils/store';
  import type {EmojiPickerViewModelBundle} from '~/common/viewmodel/emoji-picker';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.emoji-picker');

  const {
    highlighted = [],
    onselectemoji = undefined,
    services,
    visible = false,
  }: EmojiPickerProps = $props();

  const emojisByGroupStore = services.emojis.getEmojisByGroupStore();

  let searchBarComponent = $state<SvelteNullableBinding<SearchBar>>(null);
  let scrollContainerElement = $state<SvelteNullableBinding<HTMLDivElement>>(null);
  // Reference of the `HTMLElement` whose skin tone / variant customizer is currently open.
  let currentlyCustomizingEmojiElement = $state<HTMLElement | undefined>(undefined);
  let searchTerm = $state<string | undefined>();

  // ViewModelBundle of the emoji picker.
  let viewModelStore = $state<IQueryableStore<RemoteEmojiPickerViewModelStoreValue | undefined>>(
    new ReadableStore(undefined),
  );
  let viewModelController: Remote<EmojiPickerViewModelBundle>['viewModelController'] | undefined =
    undefined;

  /**
   * Clear search term from the search bar.
   */
  export function clearSearchTerm(): void {
    searchTerm = '';
  }

  /**
   * Remove focus from the emoji picker's search bar.
   */
  export function blurSearchBar(): void {
    searchBarComponent?.blur();
  }

  /**
   * Focus the emoji picker's search bar.
   */
  export function focusSearchBar(): void {
    searchBarComponent?.focus();
  }

  /**
   * Scroll all the way to the top.
   */
  export function scrollTo(options: ScrollToOptions): void {
    scrollContainerElement?.scrollTo(options);
  }

  function handleClickTab(groupId: EmojiGroupIdOrFavorites): void {
    const element = scrollContainerElement?.querySelector(`[data-group-id='${groupId}']`);

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'start',
    });
  }

  function handleClickEmoji(event: MouseEvent, emoji: SingleUnicodeEmoji): void {
    event.preventDefault();
    event.stopPropagation();

    viewModelController?.updateFavorites(emoji).catch((error) => {
      log.error(`Updating most recent emojis  failed: ${ensureError(error)}`);
    });
    // Close current customizer if it was open, because a variant was selected.
    //
    // Warning: This is also required for `insertText` to work in the compose area, so this should
    // not be removed! Because the customizer uses the top layer, the rest of the document is
    // `inert` while it is open, which prevents inserting text into a `contenteditable`.
    closeCurrentCustomizer();

    onselectemoji?.(emoji);
  }

  function handleClickSkin(
    event: MouseEvent,
    baseEmoji: SingleUnicodeEmoji,
    preferredSkinToneEmoji: SingleUnicodeEmoji,
  ): void {
    viewModelController?.setSkinTonePreference(baseEmoji, preferredSkinToneEmoji).catch((error) => {
      log.error(
        `Setting preferred skin tone emoji "${preferredSkinToneEmoji}" failed: ${ensureError(error)}`,
      );
    });

    handleClickEmoji(event, preferredSkinToneEmoji);
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault();

    const target = event.currentTarget;
    if (!(target instanceof Element)) {
      return;
    }
    const emojiElement = target.parentElement;
    if (!(emojiElement instanceof HTMLElement)) {
      return;
    }

    openCustomizer(emojiElement);
  }

  function handleClickBackdrop(event: MouseEvent): void {
    closeCurrentCustomizer();
  }

  /**
   * Open the customizer UI that belongs to the given `emojiElement`.
   */
  function openCustomizer(emojiElement: HTMLElement): void {
    closeCurrentCustomizer();

    const customizerElement = emojiElement.querySelector('.customizer:not([open])');
    if (customizerElement instanceof HTMLDialogElement) {
      positionCustomizer(emojiElement, customizerElement);

      // Note: `showModal` is kind of slow, because the entire `#document` gets recalculated to
      // render its descendants inert. This is was only partially improved in
      // https://issues.chromium.org/issues/40237638.
      customizerElement.showModal();
      currentlyCustomizingEmojiElement = emojiElement;
    }
  }

  /**
   * Expose the viewport geometry of the given `anchorElement` to `customizerElement`, whose styles
   * position themselves relative to it.
   *
   * Note: The geometry is measured manually instead of using CSS anchor positioning (i.e.
   * `anchor-name` / `anchor()`), because the anchor button lives inside a scrollable container.
   * When that container (or any other scrollable ancestor of the emoji picker) is scrolled,
   * anchor-positioned `position: fixed` elements keep painting in the right place, but their
   * hit-test area does not follow, making them unclickable.
   */
  function positionCustomizer(
    anchorElement: HTMLElement,
    customizerElement: HTMLDialogElement,
  ): void {
    const {top, left, width, height} = anchorElement.getBoundingClientRect();

    customizerElement.style.setProperty('--c-t-customizer-anchor-top', `${top}px`);
    customizerElement.style.setProperty('--c-t-customizer-anchor-left', `${left}px`);
    customizerElement.style.setProperty('--c-t-customizer-anchor-width', `${width}px`);
    customizerElement.style.setProperty('--c-t-customizer-anchor-height', `${height}px`);
  }

  /**
   * Close the customizer UI that belongs to the `currentlyCustomizingEmojiElement`.
   */
  function closeCurrentCustomizer(): void {
    if (currentlyCustomizingEmojiElement === undefined) {
      return;
    }

    const customizerElement = currentlyCustomizingEmojiElement.querySelector('.customizer[open]');
    if (customizerElement instanceof HTMLDialogElement) {
      customizerElement.close();
      currentlyCustomizingEmojiElement = undefined;
    }
  }

  /**
   * Returns the emoji in the (user-configured) preferred skin tone, or the default emoji if no skin
   * tone was configured. Note: The default emoji is also returned in all other cases, e.g. if there
   * was an error in the ViewModel, the returned skin tone emoji does not belong to the same group,
   * or is not valid.
   */
  function getPreferredSkinToneOrBaseEmoji(
    currentViewModel: typeof $viewModelStore,
    baseEmoji: SingleUnicodeEmoji,
    skins?: ReadonlyMap<SingleUnicodeEmoji, Omit<EmojiDetails, 'tags' | 'skins'>>,
  ): SingleUnicodeEmoji {
    if (skins === undefined || currentViewModel === undefined) {
      return baseEmoji;
    }

    return (
      [baseEmoji, ...skins.keys()].find(
        (skin) => skin === currentViewModel.skinTonePreferences.get(baseEmoji),
      ) ?? baseEmoji
    );
  }

  /**
   * Returns the customizer options for the given emoji. Note: If a preference was set, the
   * customizer options will include the default emoji and the rest of the skins, otherwise all the
   * skins.
   */
  function getCustomizerOptions(
    baseEmoji: [SingleUnicodeEmoji, EmojiDetails | undefined],
    preferredSkinToneEmoji: SingleUnicodeEmoji,
  ): ReadonlyMap<SingleUnicodeEmoji, Omit<EmojiDetails, 'tags' | 'skins'>> {
    const [unicode, details] = baseEmoji;
    if (details?.skins === undefined) {
      // If there are no skins, there are no options to customize.
      return new Map();
    }
    if (preferredSkinToneEmoji === unicode) {
      // If the preferred skin is not yet customized, just return `skins` as the options.
      return details.skins;
    }

    // Else, return the default emoji and the rest of the skins as the options.
    return new Map([
      [unicode, details],
      ...[...details.skins.entries()].filter(
        ([skinUnicode]) => skinUnicode !== preferredSkinToneEmoji,
      ),
    ]);
  }

  // The emoji map that is actually shown in the picker includes all emojis and favorites.
  const emojiMap = $derived.by(() => {
    if ($viewModelStore === undefined) {
      return $emojisByGroupStore;
    }

    const favoritesMap = new Map(
      $viewModelStore.sortedMostRecentEmojis.map((emoji) => [emoji, undefined]),
    );

    return new Map<
      EmojiGroupIdOrFavorites,
      ReadonlyMap<SingleUnicodeEmoji, EmojiDetails | undefined>
    >([['favorites', favoritesMap], ...$emojisByGroupStore]);
  });

  services.backend.viewModel
    .emojiPicker()
    .then((viewModelBundle) => {
      viewModelController = viewModelBundle.viewModelController;
      viewModelStore = viewModelBundle.viewModelStore;
    })
    .catch((error: unknown) => {
      log.error(`Failed to load EmojiPickerViewModelBundle: ${ensureError(error)}`);

      toast.addSimpleFailure(
        $i18n.t(
          'emoji-picker.error--emoji-picker-preferences',
          'Emoji picker preferences could not be loaded',
        ),
      );
    });

  let emojiGroupTitles: Record<EmojiGroupId, string> | undefined = $state(undefined);
  function updateEmojiGroupTitles(currentI18n: I18nType): void {
    getEmojiGroupTitle(currentI18n)
      .then((value) => {
        emojiGroupTitles = value;
      })
      .catch((error) => {
        log.error(`Error fetching emoji group titles: ${error}`);
      });
  }

  $effect(() => {
    updateEmojiGroupTitles($i18n);
  });

  const normalizedSearchTerm = $derived(searchTerm?.toLocaleLowerCase().trim() ?? '');

  function emojiMatchesSearch(
    emoji: SingleUnicodeEmoji,
    details: EmojiDetails | undefined,
    currentNormalizedSearchTerm: string,
  ): boolean {
    // No search term.
    if (currentNormalizedSearchTerm === '') {
      return true;
    }

    // This can happen if this is an emoji in the `favorites` categorie. Such emojis should not be
    // shown in the search.
    if (details === undefined) {
      return false;
    }

    // User searched for emoji.
    if (emoji === currentNormalizedSearchTerm) {
      return true;
    }

    // Check if the label or the shortcode contains the search term.
    if (
      details.shortcode?.includes(currentNormalizedSearchTerm) === true ||
      details.label.includes(currentNormalizedSearchTerm) === true ||
      emoji === currentNormalizedSearchTerm ||
      // Check if a `skin-toned` emoji was searched.
      (isSingleUnicodeEmoji(currentNormalizedSearchTerm) &&
        details.skins?.has(currentNormalizedSearchTerm) === true)
    ) {
      return true;
    }

    // If there was no search result so far, check whether a tag matches the search.
    for (const tag of details.tags) {
      if (tag.includes(currentNormalizedSearchTerm)) {
        return true;
      }
    }

    return false;
  }

  let intersectingGroups = $state<
    {readonly groupId: EmojiGroupIdOrFavorites; readonly ratio: f64}[]
  >([]);

  const highestIntersectingGroup = $derived(
    intersectingGroups.reduce((prev, curr) => (curr.ratio > prev.ratio ? curr : prev), {
      groupId: 'favorites',
      ratio: 0,
    }),
  );

  const itemObserverOptions = $derived({
    root: scrollContainerElement,
    threshold: [
      // 5% Steps.
      0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8,
      0.85, 0.9, 0.95, 1,
    ],
  });
</script>

{#if visible}
  <div class="container">
    <SearchBar
      bind:this={searchBarComponent}
      bind:term={searchTerm}
      placeholder={$i18n.t('search.label--search-input-placeholder')}
    />

    <div class="tabs">
      <button
        class="tab"
        class:active={highestIntersectingGroup.groupId === 'favorites'}
        onclick={() => handleClickTab('favorites')}
        title={$i18n.t('emoji-picker.label--most-used', 'Most used')}
      >
        <MdIcon theme="Outlined">schedule</MdIcon>
      </button>
      {#each EMOJI_GROUP_IDS as groupId (groupId)}
        <button
          class="tab"
          class:active={groupId === highestIntersectingGroup.groupId}
          onclick={() => handleClickTab(groupId)}
          title={emojiGroupTitles?.[groupId]}
        >
          <MdIcon theme="Outlined">{EMOJI_GROUP_ICON[groupId]}</MdIcon>
        </button>
      {/each}
    </div>

    <div bind:this={scrollContainerElement} class="groups">
      {#if emojiGroupTitles !== undefined}
        {#each emojiMap as [groupId, emojis] (groupId)}
          <div
            class="group"
            data-group-id={groupId}
            use:intersection={{
              options: itemObserverOptions,
            }}
            onintersectionenter={(event) => {
              intersectingGroups = [
                ...intersectingGroups,
                {groupId, ratio: event.detail.entry.intersectionRatio},
              ];
            }}
            onintersectionexit={() => {
              // Remove this group from `intersectingGroups`.
              intersectingGroups = intersectingGroups.filter(
                ({groupId: intersectingGroupId}) => intersectingGroupId !== groupId,
              );
            }}
          >
            <h2 class="title">
              {groupId === 'favorites'
                ? $i18n.t('emoji-picker.label--most-used', 'Most used')
                : emojiGroupTitles[groupId]}
            </h2>
            <ul class="emojis">
              {#each emojis as [emoji, details] (emoji)}
                {#if emojiMatchesSearch(emoji, details, normalizedSearchTerm)}
                  {@const preferredSkinToneEmoji = getPreferredSkinToneOrBaseEmoji(
                    $viewModelStore,
                    emoji,
                    details?.skins,
                  )}
                  {@const customizerOptions = getCustomizerOptions(
                    [emoji, details],
                    preferredSkinToneEmoji,
                  )}

                  <li class="emoji">
                    <button
                      class="main"
                      class:active={highlighted.includes(preferredSkinToneEmoji) ||
                        [...customizerOptions.keys()].some((optionEmoji) =>
                          highlighted.includes(optionEmoji),
                        )}
                      aria-label={details?.label}
                      onclick={(event) => handleClickEmoji(event, preferredSkinToneEmoji)}
                      oncontextmenu={handleContextMenu}
                    >
                      <Emoji unicode={preferredSkinToneEmoji} />
                    </button>

                    {#if customizerOptions.size > 0}
                      <dialog class="customizer">
                        <!-- A11y is already covered by the dialog semantics (press `esc` to close). -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div class="backdrop" onclick={handleClickBackdrop}></div>
                        <div class="skins">
                          <!-- Key not required because all values are derived from
                        `customizerOptions`. -->
                          <!-- eslint-disable-next-line svelte/require-each-key -->
                          {#each customizerOptions as [skinToneEmoji, { label: skinToneEmojiLabel }]}
                            <button
                              class="skin"
                              class:active={highlighted.includes(skinToneEmoji)}
                              aria-label={skinToneEmojiLabel}
                              onclick={(event) => handleClickSkin(event, emoji, skinToneEmoji)}
                            >
                              <Emoji unicode={skinToneEmoji} />
                            </button>
                          {/each}
                        </div>
                        <div class="handle"></div>
                      </dialog>
                    {/if}
                  </li>
                {/if}
              {/each}
            </ul>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  @use 'component' as *;

  // Viewport geometry of the emoji button a customizer belongs to.
  $-vars: (
    customizer-anchor-top,
    customizer-anchor-left,
    customizer-anchor-width,
    customizer-anchor-height
  );
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;

    width: 100%;
    height: 100%;

    .tabs {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: stretch;

      padding-top: rem(8px);

      .tab {
        @extend %neutral-input;

        flex: 1 1 0;

        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;

        aspect-ratio: 1 / 1;
        border-radius: 50%;
        color: var(--cc-emoji-picker-tab-button-color);
        font-size: rem(19px);

        &:hover {
          cursor: pointer;
          background-color: var(--cc-emoji-picker-tab-button-background-color--hover);
        }

        &.active {
          color: var(--cc-emoji-picker-tab-button-color--active);
        }
      }
    }

    .groups {
      margin-top: rem(12px);
      padding-block: rem(8px);
      overflow-y: scroll;
      scrollbar-width: none;

      .group {
        .title {
          @extend %font-small-400;

          text-transform: capitalize;
          margin-bottom: rem(6px);
          padding-inline: rem(7px);
          color: $grey-600;
        }

        &:first-child {
          .title {
            margin-top: 0;
          }
        }

        .emojis {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: start;
          flex-wrap: wrap;

          margin: 0;
          padding: 0;
          list-style-type: none;

          .emoji {
            .main,
            .skin {
              @extend %neutral-input;

              // Create new stacking context.
              position: relative;
              z-index: 1;

              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: center;

              width: rem(32px);
              height: rem(32px);
              font-size: rem(24px);
              line-height: rem(24px);
              cursor: pointer;

              &::before {
                content: '';
                // Position behind emoji.
                position: absolute;
                z-index: -1;

                width: 100%;
                height: 100%;
                border-radius: 50%;
              }

              &:hover::before {
                background-color: var(--cc-emoji-picker-emoji-button-background-color--hover);
              }

              &:focus-visible::before {
                background-color: var(--cc-emoji-picker-emoji-button-background-color--focus);
                border: solid em(1px) var(--cc-emoji-picker-emoji-button-border-color--focus);
              }

              &.active::before,
              &:active::before {
                background-color: var(--cc-emoji-picker-emoji-button-background-color--active);
              }
            }

            .customizer {
              $-anchor-top: var($-temp-vars, --c-t-customizer-anchor-top);
              $-anchor-left: var($-temp-vars, --c-t-customizer-anchor-left);
              $-anchor-width: var($-temp-vars, --c-t-customizer-anchor-width);
              $-anchor-height: var($-temp-vars, --c-t-customizer-anchor-height);
              // Width the `.skins` row is allowed to grow to before it wraps, and the minimum
              // distance it keeps from the viewport edges.
              $-skins-max-width: rem(32px * 5 + 12px);
              $-viewport-gap: rem(4px);

              // Reset popover user agent styling and fix anchoring quirks in `top-layer` context.
              // See: https://github.com/w3c/csswg-drafts/issues/10258.
              inset: auto;
              place-self: normal;
              padding: 0;
              border: none;
              background: transparent;

              width: 100%;
              height: 100%;
              max-width: 100%;
              max-height: 100%;

              .backdrop,
              &::backdrop {
                width: 100%;
                height: 100%;
                background: transparent;
              }

              .skins {
                position: fixed;
                bottom: calc(100% - #{$-anchor-top});
                left: clamp(
                  calc(#{$-skins-max-width} / 2 + #{$-viewport-gap}),
                  calc(#{$-anchor-left} + #{$-anchor-width} / 2),
                  calc(100% - #{$-skins-max-width} / 2 - #{$-viewport-gap})
                );
                transform: translateX(-50%);

                display: flex;
                flex-direction: row;
                align-items: start;
                justify-content: center;
                flex-wrap: wrap;

                height: auto;
                max-width: $-skins-max-width;
                padding: rem(3px) rem(6px);
                background-color: var(--cc-emoji-picker-customizer-background-color);
                box-shadow: var(--cc-emoji-picker-customizer-box-shadow);
                border-radius: rem(8px);
              }

              .handle {
                $arc-size: 8;
                $arc-size-px: $arc-size + 0px;

                // Covers the anchor exactly, so it visually merges with the `.skins` row above.
                position: fixed;
                bottom: calc(100% - #{$-anchor-top} - #{$-anchor-height});
                left: $-anchor-left;

                width: $-anchor-width;
                height: $-anchor-height;
                background: var(--cc-emoji-picker-customizer-background-color);
                box-shadow: var(--cc-emoji-picker-customizer-handle-box-shadow);
                border-radius: 0 0 rem(6px) rem(6px);

                // Left arc.
                &::before {
                  content: '';
                  position: absolute;
                  width: rem($arc-size-px);
                  height: rem($arc-size-px);
                  top: rem(-0.5px);
                  transform: translateX(-100%);
                  background: var(--cc-emoji-picker-customizer-background-color);
                  // SVG path with quadratic Bézier curve (`Q`) from [$arc-size, $arc-size] to [0,
                  // 0], and control point at [$arc-size, 0].
                  clip-path: path('M 0 0 H #{$arc-size} V #{$arc-size} Q #{$arc-size} 0 0 0');
                }

                // Right arc.
                &::after {
                  content: '';
                  position: absolute;
                  width: rem($arc-size-px);
                  height: rem($arc-size-px);
                  top: rem(-0.5px);
                  right: 0;
                  transform: translateX(100%);
                  background: var(--cc-emoji-picker-customizer-background-color);
                  // SVG path with quadratic Bézier curve (`Q`) from [0, $arc-size] to [$arc-size,
                  // 0], and control point at [0, 0].
                  clip-path: path('M #{$arc-size} 0 H 0 V #{$arc-size} Q 0 0 #{$arc-size} 0');
                }
              }
            }
          }
        }

        // Hide the entire group if it doesn't contain any emojis.
        &:has(:global(.emojis:empty)) {
          display: none;
        }
      }
    }
  }
</style>
