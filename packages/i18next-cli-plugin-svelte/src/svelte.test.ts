import {describe, expect, it} from 'vitest';

import {sveltePlugin} from './svelte.js';

async function load(code: string, path = 'Component.svelte'): Promise<string | undefined> {
    const result = await sveltePlugin().onLoad?.(code, path);
    return result ?? undefined;
}

describe('sveltePlugin', () => {
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

    it('ignores styles the Svelte parser cannot handle on its own', async () => {
        const code = [
            `<p>{$i18n.t('text', 'Text')}</p>`,
            `<style lang="scss">`,
            `    // SCSS variables and line comments are rejected by the Svelte parser.`,
            `    $color: red;`,
            `    p { color: $color; }`,
            `</style>`,
        ].join('\n');

        expect(await load(code)).toBe(`$i18n.t('text', 'Text');`);
    });
});
