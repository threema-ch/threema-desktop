import type {u53} from '~/common/types';

const LANGUAGES = ['Deutsch', 'English'] as const;
const MODES = ['Light', 'Dark'] as const;
export const SEARCH_EXPRESSIONS: Record<
    (typeof LANGUAGES)[u53],
    {readonly searchName: string; readonly searchTerm: string}
> = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Deutsch: {
        searchName: 'Suchen...',
        searchTerm: 'er',
    },
    // eslint-disable-next-line @typescript-eslint/naming-convention
    English: {
        searchName: 'Search...',
        searchTerm: 'to',
    },
};

export interface ScreenshotConfiguration {
    readonly language: (typeof LANGUAGES)[u53];
    readonly mode: (typeof MODES)[u53];
}

export function generateCombinations(): ScreenshotConfiguration[] {
    const result: ScreenshotConfiguration[] = [];
    for (const language of LANGUAGES) {
        for (const mode of MODES) {
            result.push({
                language,
                mode,
            });
        }
    }
    return result;
}
