import * as fs from 'node:fs';
import * as path from 'node:path';

import type {Emoji, GroupKey} from 'emojibase';
import emojis from 'emojibase-data/en/data.json' assert {type: 'json'};
import groups from 'emojibase-data/meta/groups.json' assert {type: 'json'};

declare global {
    // Required for emojibase, see https://github.com/milesj/emojibase/issues/151
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface RequestInit {}
}

// Mapping from group name to the material icon representing this group
const GROUP_ICON: Partial<Record<string, string>> = {
    'smileys-emotion': 'emoji_emotions',
    'people-body': 'emoji_people',
    'animals-nature': 'park',
    'food-drink': 'restaurant',
    'travel-places': 'train',
    'activities': 'emoji_events',
    'objects': 'emoji_objects',
    'symbols': 'emoji_symbols',
    'flags': 'flag',
} satisfies Record<Exclude<GroupKey, 'component'>, string>;

// Mapping from group name to the human-readable group title
const GROUP_TITLE: Partial<Record<string, string>> = {
    'smileys-emotion': 'Smileys & Emotion',
    'people-body': 'People & Body',
    'animals-nature': 'Animals & Nature',
    'food-drink': 'Food & Drink',
    'travel-places': 'Travel & Places',
    'activities': 'Activities',
    'objects': 'Objects',
    'symbols': 'Symbols',
    'flags': 'Flags',
} satisfies Record<Exclude<GroupKey, 'component'>, string>;

// Groups to exclude completely
const EXCLUDED_GROUPS: string[] = ['component'] satisfies GroupKey[];

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

function unwrap<T>(value: T | undefined, message?: string): T {
    if (value === undefined || value === null) {
        fail(message ?? 'Unwrap failed');
    }
    return value;
}

function main(): void {
    // Paths
    const emojiPickerDir = path.join(
        process.cwd(),
        '..',
        '..',
        'src',
        'app',
        'ui',
        'svelte-components',
        'generic',
        'EmojiPicker',
    );

    // Filenames
    const filenameGroups = 'groups.html';
    const filenameEmoji = `emoji.html`;

    // Group emoji (key is the group number, value is the list of emoji)
    const groupedEmoji = new Map<number, Emoji[]>();
    for (const emoji of emojis) {
        if (emoji.group === undefined) {
            continue;
        }
        const groupName = unwrap(groups.groups[emoji.group]);
        if (EXCLUDED_GROUPS.includes(groupName)) {
            continue;
        }

        const emojiList = groupedEmoji.get(emoji.group);
        if (emojiList === undefined) {
            groupedEmoji.set(emoji.group, [emoji]);
        } else {
            emojiList.push(emoji);
        }
    }

    // Sort emoji within groups by "order" key
    for (const emojiList of groupedEmoji.values()) {
        emojiList.sort((a, b) => {
            if (a.order === undefined) {
                return -1;
            }
            if (b.order === undefined) {
                return 1;
            }
            return a.order - b.order;
        });
    }

    // Write groups file
    console.info(`Generating ${filenameGroups}...`);
    const fileGroups = fs.openSync(path.join(emojiPickerDir, filenameGroups), 'w');
    fs.writeSync(
        fileGroups,
        `<!-- Note: In order for the svelte components to be processed, copy-paste this content into EmojiPicker.svelte -->\n`,
    );
    for (const [id, name] of Object.entries(groups.groups)) {
        if (EXCLUDED_GROUPS.includes(name)) {
            continue;
        }

        const groupIcon = GROUP_ICON[name];
        const groupTitle = GROUP_TITLE[name];
        if (groupIcon === undefined || groupTitle === undefined) {
            throw new Error(`No mapping found for group ${name}`);
        }
        fs.writeSync(
            fileGroups,
            `<button data-group="${id}" title="${groupTitle}" on:click={handleGroupClick}>\n  <MdIcon theme="Outlined">${groupIcon}</MdIcon>\n</button>\n`,
        );
    }
    fs.closeSync(fileGroups);

    // Write emoji file
    console.info(`Generating ${filenameEmoji}...`);
    const fileEmoji = fs.openSync(path.join(emojiPickerDir, filenameEmoji), 'w');
    for (const [group, emojiList] of groupedEmoji.entries()) {
        const groupName = unwrap(groups.groups[group]);
        fs.writeSync(
            fileEmoji,
            `<p class="group-title" data-group="${group}">${GROUP_TITLE[groupName]}</p>\n`,
        );
        fs.writeSync(fileEmoji, `<div class="group" data-group="${group}">`);
        for (const emoji of emojiList) {
            fs.writeSync(fileEmoji, `<button title="${emoji.label}">${emoji.emoji}</button>`);
        }
        fs.writeSync(fileEmoji, '</div>\n');
    }
    fs.closeSync(fileEmoji);
}

main();
