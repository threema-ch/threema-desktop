import {describe, expect, it} from 'vitest';

import {createSveltePlugin} from './svelte.js';

async function load(code: string, path = 'Component.svelte'): Promise<string | undefined> {
    const result = await createSveltePlugin().onLoad?.(code, path);
    return result ?? undefined;
}

describe('createSveltePlugin', () => {
    it('ignores non-Svelte files', async () => {
        expect(await load(`t('key', 'Text');`, 'file.ts')).toBeUndefined();
    });

    it('keeps the contents of module and instance scripts', async () => {
        const code = [
            `<script lang="ts" module>`,
            `    export const label: string = t('module.label', 'Module');`,
            `</script>`,
            `<script lang="ts">`,
            `    const label = $derived($i18n.t('instance.label', 'Instance'));`,
            `</script>`,
        ].join('\n');

        expect(await load(code)).toBe(
            [
                `\n    export const label: string = t('module.label', 'Module');\n`,
                `\n    const label = $derived($i18n.t('instance.label', 'Instance'));\n`,
            ].join('\n'),
        );
    });

    it('collects the outermost call expressions of the template', async () => {
        const code = [
            `<div title={$i18n.t('attribute', 'Attribute')}>`,
            `    {#if visible}`,
            `        {$i18n.t('block', 'Block')}`,
            `    {/if}`,
            `    {#each items as item}`,
            `        {@const label = format($i18n.t('nested', 'Nested'), item)}`,
            `        <button onclick={() => $i18n.t('handler', 'Handler')}>{label}</button>`,
            `    {/each}`,
            `</div>`,
            `{#snippet entry(text = $i18n.t('snippet', 'Snippet'))}{text}{/snippet}`,
        ].join('\n');

        expect(await load(code)).toBe(
            [
                `$i18n.t('attribute', 'Attribute');`,
                `$i18n.t('block', 'Block');`,
                `format($i18n.t('nested', 'Nested'), item);`,
                `$i18n.t('handler', 'Handler');`,
                `$i18n.t('snippet', 'Snippet');`,
            ].join('\n'),
        );
    });

    it('converts HTML comments to JS comments', async () => {
        const code = `<!-- <p>{$i18n.t('commented', 'Commented */ out')}</p> -->`;

        expect(await load(code)).toBe(`/*  <p>{$i18n.t('commented', 'Commented * / out')}</p>  */`);
    });

    it('applies the given preprocessors before parsing', async () => {
        const plugin = createSveltePlugin({
            preprocess: {
                // Strip styles the Svelte parser cannot handle on its own.
                style: () => ({code: ''}),
            },
        });
        const code = [
            `<p>{$i18n.t('text', 'Text')}</p>`,
            `<style lang="scss">`,
            `    @use 'component';`,
            `    p { &:hover { @include component.hover; } }`,
            `</style>`,
        ].join('\n');

        expect(await plugin.onLoad?.(code, 'Component.svelte')).toBe(`$i18n.t('text', 'Text');`);
    });
});
