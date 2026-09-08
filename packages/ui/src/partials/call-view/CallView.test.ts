import type {u53} from '@threema/ts-utils/integer/u53';
import {assert} from '@threema/ts-utils/meta/assert';
import {describe, expect, it, vi} from 'vitest';
import {page, userEvent} from 'vitest/browser';
import {render} from 'vitest-browser-svelte';

import {createTestLogger} from '../../utils/test/create-test-logger';
import {createTestVideoStream} from '../../utils/test/create-test-video-stream';

import CallViewFixture from './CallView.fixture.svelte';
import type {FeedPresentation} from './Feed.svelte';

/**
 * A feed as the tests build it.
 */
interface TestFeed {
    readonly alt: string;
    readonly id: string;
    readonly initials: string;
    readonly isMirrored?: boolean;
    readonly isMuted: boolean;
    readonly kind: 'camera' | 'display';
    readonly label: string;
    readonly onchangepresentation?: (presentation: FeedPresentation) => void;
    readonly stream?: MediaStream;
}

/**
 * Build a feed, with the properties a test does not care about filled in.
 */
function feed(
    id: string,
    options: {
        readonly kind?: TestFeed['kind'];
        readonly onchangepresentation?: TestFeed['onchangepresentation'];
        readonly withStream?: boolean;
    } = {},
): TestFeed {
    const {kind = 'camera', onchangepresentation, withStream = false} = options;

    return {
        alt: `Video of ${id}`,
        id,
        initials: id.slice(0, 2).toUpperCase(),
        isMuted: false,
        kind,
        label: id,
        onchangepresentation,
        stream: withStream ? createTestVideoStream() : undefined,
    };
}

/**
 * Render the fixture in a box of the given size, because the layout follows the space available.
 */
function renderCallView(
    props: {
        readonly feeds: readonly TestFeed[];
        readonly hasControls?: boolean;
        readonly onclickcontrol?: () => void;
        readonly onclickfeed?: (event: MouseEvent, feed: TestFeed) => void;
        readonly onclickfeedexpand?: (event: MouseEvent, feed: TestFeed) => void;
    },
    sizePx: {readonly height: u53; readonly width: u53} = {height: 800, width: 1200},
): {
    readonly container: HTMLElement;
    readonly rerender: (props: {readonly feeds: readonly TestFeed[]}) => Promise<void>;
} {
    const {container, rerender} = render(CallViewFixture, {log: createTestLogger(), ...props});
    container.style.height = `${sizePx.height}px`;
    container.style.width = `${sizePx.width}px`;

    return {container, rerender};
}

/**
 * The element which carries the expansion of the feed with the given accessible name.
 */
function getFeedWrapper(container: HTMLElement, alt: string): HTMLElement {
    const element = container.querySelector(`[aria-label="${alt}"]`)?.closest('[data-expanded]');
    assert(element instanceof HTMLElement, `Expected a feed named ${alt}`);

    return element;
}

function getExpandedFeedAlts(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('[data-expanded="true"] [aria-label]'))
        .map((element) => element.getAttribute('aria-label') ?? '')
        .filter((alt) => alt.startsWith('Video of'));
}

describe('CallView.svelte', () => {
    it('forwards extra props to the underlying element', async () => {
        // Arrange
        const {getByTestId} = render(CallViewFixture, {
            'data-testid': 'call-view',
            'feeds': [feed('jane')],
            'log': createTestLogger(),
        });

        // Assert
        await expect.element(getByTestId('call-view')).toBeInTheDocument();
    });

    it('renders one feed per item, in the order they are given', async () => {
        // Arrange
        const {container} = renderCallView({feeds: [feed('jane'), feed('john'), feed('jill')]});

        // Assert
        const alts = Array.from(container.querySelectorAll('[aria-label^="Video of"]')).map(
            (element) => element.getAttribute('aria-label'),
        );
        expect(alts).toStrictEqual(['Video of jane', 'Video of john', 'Video of jill']);
        await expect.element(page.getByText('john', {exact: true})).toBeVisible();
    });

    it('expands a feed when it is clicked, and collapses it when it is clicked again', async () => {
        // Arrange
        const {container} = renderCallView({feeds: [feed('jane'), feed('john')]});

        // Act
        await userEvent.click(page.getByRole('button', {name: 'Video of jane'}));

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of jane']);

        // Act
        await userEvent.click(page.getByRole('button', {name: 'Video of jane'}));

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual([]);
    });

    it('expands a feed when its expand action is clicked', async () => {
        // Arrange
        const {container} = renderCallView({feeds: [feed('jane'), feed('john')]});
        const wrapper = getFeedWrapper(container, 'Video of jane');
        const expand = wrapper.querySelector('button[aria-label="Expand"]');
        assert(expand instanceof HTMLElement, 'Expected an expand action');

        // Act
        await userEvent.click(expand);

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of jane']);
        // The action now offers the opposite.
        await expect
            .element(page.getByRole('button', {name: 'Collapse'}).first())
            .toBeInTheDocument();
    });

    it('reports a click on a feed, and reports an expansion only when it expanded one', async () => {
        // Arrange
        const onclickfeed = vi.fn();
        const onclickfeedexpand = vi.fn();
        renderCallView({feeds: [feed('jane')], onclickfeed, onclickfeedexpand});

        // Act
        await userEvent.click(page.getByRole('button', {name: 'Video of jane'}));

        // Assert
        expect(onclickfeed).toHaveBeenCalledOnce();
        expect(onclickfeedexpand).toHaveBeenCalledOnce();
        expect(onclickfeedexpand.mock.calls[0]?.[1]).toMatchObject({id: 'jane'});

        // Act: Collapse it again.
        await userEvent.click(page.getByRole('button', {name: 'Video of jane'}));

        // Assert: The click is reported, the collapse is not.
        expect(onclickfeed).toHaveBeenCalledTimes(2);
        expect(onclickfeedexpand).toHaveBeenCalledOnce();
    });

    it('expands a screen share when it appears, and the newer one when a second appears', async () => {
        // Arrange
        const {container, rerender} = renderCallView({feeds: [feed('jane'), feed('john')]});
        expect(getExpandedFeedAlts(container)).toStrictEqual([]);

        // Act
        await rerender({
            feeds: [feed('jane'), feed('john'), feed('jane-screen', {kind: 'display'})],
        });

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of jane-screen']);

        // Act
        await rerender({
            feeds: [
                feed('jane'),
                feed('john'),
                feed('jane-screen', {kind: 'display'}),
                feed('john-screen', {kind: 'display'}),
            ],
        });

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of john-screen']);
    });

    // Once the user arranged the layout, the call stops rearranging it behind their back.
    it('leaves the layout alone once the user manipulated it manually at least once', async () => {
        // Arrange
        const {container, rerender} = renderCallView({feeds: [feed('jane'), feed('john')]});
        await userEvent.click(page.getByRole('button', {name: 'Video of john'}));

        // Act
        await rerender({
            feeds: [feed('jane'), feed('john'), feed('jane-screen', {kind: 'display'})],
        });

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of john']);
    });

    it('gives up the expansion when the expanded feed is gone', async () => {
        // Arrange
        const {container, rerender} = renderCallView({feeds: [feed('jane'), feed('john')]});
        await userEvent.click(page.getByRole('button', {name: 'Video of john'}));
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of john']);

        // Act
        await rerender({feeds: [feed('jane')]});

        // Assert
        expect(getExpandedFeedAlts(container)).toStrictEqual([]);
    });

    it('does not expand a feed if the view is too small to display expanded feeds', async () => {
        // Arrange
        const onclickfeedexpand = vi.fn();
        const {container} = renderCallView({
            feeds: [feed('jane'), feed('john')],
            onclickfeedexpand,
        });
        await userEvent.click(page.getByRole('button', {name: 'Video of jane'}));
        expect(getExpandedFeedAlts(container)).toStrictEqual(['Video of jane']);

        // Act
        container.style.width = '308px';

        // Assert
        await vi.waitFor(() => {
            expect(getExpandedFeedAlts(container)).toStrictEqual([]);
        });
        const expand = getFeedWrapper(container, 'Video of jane').querySelector(
            'button[aria-label="Expand"]',
        );
        assert(expand instanceof HTMLElement, 'Expected the action to offer an expansion');

        // Act
        await userEvent.click(expand);

        // Assert: Each expansion request is reported, but no feed is expanded as long as the view
        // stays too small for it.
        expect(onclickfeedexpand).toHaveBeenCalledTimes(2);
        expect(getExpandedFeedAlts(container)).toStrictEqual([]);
    });

    it('reports how each feed is presented to that feed itself', async () => {
        // Arrange
        const onchangepresentationJane = vi.fn();
        const onchangepresentationJohn = vi.fn();
        renderCallView({
            feeds: [
                feed('jane', {onchangepresentation: onchangepresentationJane}),
                feed('john', {onchangepresentation: onchangepresentationJohn}),
            ],
        });

        // Assert
        await vi.waitFor(() => {
            for (const onchangepresentation of [
                onchangepresentationJane,
                onchangepresentationJohn,
            ]) {
                expect(onchangepresentation.mock.calls.at(-1)?.at(0)).toMatchObject({
                    isExpanded: false,
                    isFullscreen: false,
                    isPictureInPicture: false,
                    isVisible: true,
                    size: {
                        height: expect.any(Number) as unknown,
                        width: expect.any(Number) as unknown,
                    },
                });
            }
        });
    });

    it('reports a feed which is scrolled out of the stage as not visible', async () => {
        // Arrange
        const onchangepresentation = vi.fn();
        const feeds = [
            ...Array.from({length: 11}, (_, index): TestFeed => feed(`participant-${index}`)),
            feed('last', {onchangepresentation}),
        ];
        const {container} = renderCallView({feeds}, {height: 300, width: 500});

        const stage = container.querySelector('.stage');
        assert(stage instanceof HTMLElement, 'Expected the stage');

        // Assert: The stage overflows, so the last feed is out of view.
        await vi.waitFor(() => {
            expect(stage.scrollHeight).toBeGreaterThan(stage.clientHeight);
            expect(onchangepresentation.mock.calls.at(-1)?.at(0)).toMatchObject({
                isVisible: false,
            });
        });

        // Act
        stage.scrollTo({top: stage.scrollHeight});

        // Assert
        await vi.waitFor(() => {
            expect(onchangepresentation.mock.calls.at(-1)?.at(0)).toMatchObject({
                isVisible: true,
                size: {
                    height: expect.any(Number) as unknown,
                    width: expect.any(Number) as unknown,
                },
            });
        });
    });

    it('reports a feed which the view expanded as expanded', async () => {
        // Arrange
        const onchangepresentation = vi.fn();
        renderCallView({
            feeds: [feed('jane', {onchangepresentation}), feed('john')],
        });
        await vi.waitFor(() => {
            expect(onchangepresentation.mock.calls.at(-1)?.at(0)).toMatchObject({
                isExpanded: false,
            });
        });

        // Act
        await userEvent.click(page.getByRole('button', {name: 'Video of jane'}));

        // Assert
        await vi.waitFor(() => {
            expect(onchangepresentation.mock.calls.at(-1)?.at(0)).toMatchObject({
                isExpanded: true,
                isVisible: true,
            });
        });
    });

    it('gives every feed a cell of the same size, and leaves a trailing cell empty', async () => {
        // Arrange
        const {container} = renderCallView({
            feeds: [feed('jane'), feed('john'), feed('jill')],
        });
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        // Assert: Three feeds in a two-by-two grid, i.e. two rows with the last cell unused.
        const rects = ['Video of jane', 'Video of john', 'Video of jill'].map((alt) =>
            getFeedWrapper(container, alt).getBoundingClientRect(),
        );
        const [first, second, third] = rects;
        assert(
            first !== undefined && second !== undefined && third !== undefined,
            'Expected three feeds',
        );
        expect(Math.round(second.width)).toBe(Math.round(first.width));
        expect(Math.round(third.width)).toBe(Math.round(first.width));
        expect(Math.round(second.top)).toBe(Math.round(first.top));
        // The third one wraps into the second row, on the leading edge.
        expect(third.top).toBeGreaterThan(first.top);
        expect(Math.round(third.left)).toBe(Math.round(first.left));
    });

    it('renders the controls and keeps them clickable over a feed', async () => {
        // Arrange
        const onclickcontrol = vi.fn();
        const onclickfeed = vi.fn();
        renderCallView({
            feeds: [feed('jane', {withStream: true})],
            hasControls: true,
            onclickcontrol,
            onclickfeed,
        });
        const control = page.getByRole('button', {name: 'Microphone'});

        // Act
        await userEvent.click(control);

        // Assert: The control was clicked, and the feed underneath it was not.
        expect(onclickcontrol).toHaveBeenCalledOnce();
        expect(onclickfeed).not.toHaveBeenCalled();
    });

    it('never overlaps feeds in the grid', async () => {
        for (const [count, width, height] of [
            [2, 1200, 800],
            [3, 1200, 800],
            [6, 1200, 800],
            [8, 1200, 600],
            [13, 1200, 900],
            [4, 400, 700],
            [4, 200, 700],
        ] as const) {
            // Arrange
            const {container} = renderCallView(
                {feeds: Array.from({length: count}, (_, index): TestFeed => feed(`p${index}`))},
                {height, width},
            );
            await new Promise((resolve) => {
                requestAnimationFrame(resolve);
            });

            // Assert: Every cell has a height, and no row starts before the row above it ends.
            const cells = Array.from(container.querySelectorAll('[data-expanded]')).map((element) =>
                element.getBoundingClientRect(),
            );
            expect(cells.every((cell) => cell.height > 20)).toBe(true);

            const bottomByTop = new Map<u53, u53>();
            for (const cell of cells) {
                const top = Math.round(cell.top);
                bottomByTop.set(top, Math.max(bottomByTop.get(top) ?? 0, Math.round(cell.bottom)));
            }
            const tops = [...bottomByTop.keys()].sort((left, right) => left - right);
            for (const [index, top] of tops.entries()) {
                const previousTop = tops[index - 1];
                if (previousTop === undefined) {
                    continue;
                }
                expect(top).toBeGreaterThanOrEqual(bottomByTop.get(previousTop) ?? 0);
            }
        }
    });

    it('shows the video in front of the avatar', async () => {
        // Arrange
        const {container} = renderCallView({
            feeds: [
                {...feed('jane', {withStream: true})},
                {...feed('john', {withStream: true}), isMirrored: true},
            ],
        });
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        // Assert: The topmost element in the middle of a video is that video.
        const videos = Array.from(container.querySelectorAll('video'));
        expect(videos).toHaveLength(2);
        for (const video of videos) {
            const {height, left, top, width} = video.getBoundingClientRect();
            expect(document.elementFromPoint(left + width / 2, top + height / 2)).toBe(video);
        }
    });

    it('lets the feeds outgrow the stage rather than squeezing them', async () => {
        // Arrange: Four feeds in two columns, in a stage too short for two rows of them.
        const {container} = renderCallView(
            {feeds: Array.from({length: 4}, (_, index): TestFeed => feed(`p${index}`))},
            {height: 600, width: 1200},
        );
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        const stage = container.querySelector('.stage');
        assert(stage instanceof HTMLElement, 'Expected the stage');
        const cell = container.querySelector('[data-expanded]');
        assert(cell instanceof HTMLElement, 'Expected a cell');

        // Assert: The cell keeps the shape of a feed, and the stage scrolls.
        const {height, width} = cell.getBoundingClientRect();
        expect(height).toBeCloseTo((width * 3) / 4, 0);
        expect(stage.scrollHeight).toBeGreaterThan(stage.clientHeight);
    });

    it('fills the stage instead where the layout says so', async () => {
        // Arrange: The same four feeds, in a stage tall enough for the rule which makes them fill
        // the entire height.
        const {container} = renderCallView(
            {feeds: Array.from({length: 4}, (_, index): TestFeed => feed(`p${index}`))},
            {height: 800, width: 1200},
        );
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        const stage = container.querySelector('.stage');
        assert(stage instanceof HTMLElement, 'Expected the stage');
        const cell = container.querySelector('[data-expanded]');
        assert(cell instanceof HTMLElement, 'Expected a cell');

        // Assert: The cell is shorter than its shape would be, and nothing scrolls.
        const {height, width} = cell.getBoundingClientRect();
        expect(height).toBeLessThan((width * 3) / 4);
        expect(stage.scrollHeight).toBe(stage.clientHeight);
    });

    it('gives the expanded feed the full visible height and gives every cell of the sidebar the same height', async () => {
        // Arrange
        const {container} = renderCallView({
            feeds: Array.from({length: 5}, (_, index): TestFeed => feed(`p${index}`)),
        });
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        // Act
        await userEvent.click(page.getByRole('button', {name: 'Video of p0'}));
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        // Assert
        const stage = container.querySelector('.stage');
        assert(stage instanceof HTMLElement, 'Expected the stage');
        const expanded = container.querySelector('[data-expanded="true"]');
        assert(expanded instanceof HTMLElement, 'Expected an expanded feed');

        const stageStyle = getComputedStyle(stage);
        const visibleHeightPx = Math.round(
            stage.clientHeight -
                Number.parseFloat(stageStyle.paddingTop) -
                Number.parseFloat(stageStyle.paddingBottom),
        );
        expect(Math.round(expanded.getBoundingClientRect().height)).toBe(visibleHeightPx);
        // It stays in view while the strip beside it is scrolled.
        expect(getComputedStyle(expanded).position).toBe('sticky');

        // Every cell of the strip is the same height, and none of them takes the whole stage.
        const stripHeightsPx = new Set(
            Array.from(container.querySelectorAll('[data-expanded="false"]')).map((element) =>
                Math.round(element.getBoundingClientRect().height),
            ),
        );
        expect(stripHeightsPx.size).toBe(1);
        expect([...stripHeightsPx][0]).toBeLessThan(visibleHeightPx / 2);
    });

    it('keeps the expanded feed in place while the sidebar is scrolled', async () => {
        // Arrange: More feeds than the strip can show at once.
        const {container} = renderCallView(
            {feeds: Array.from({length: 12}, (_, index): TestFeed => feed(`p${index}`))},
            {height: 600, width: 1000},
        );
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
        await userEvent.click(page.getByRole('button', {name: 'Video of p0'}));
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        const stage = container.querySelector('.stage');
        assert(stage instanceof HTMLElement, 'Expected the stage');
        const expanded = container.querySelector('[data-expanded="true"]');
        assert(expanded instanceof HTMLElement, 'Expected an expanded feed');

        const stageTopPx = stage.getBoundingClientRect().top;
        const offsetBeforePx = Math.round(expanded.getBoundingClientRect().top - stageTopPx);

        // Act
        stage.scrollTo({top: stage.scrollHeight});
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        // Assert: The strip scrolled, the expanded feed did not move.
        expect(stage.scrollTop).toBeGreaterThan(100);
        expect(Math.round(expanded.getBoundingClientRect().top - stageTopPx)).toBe(offsetBeforePx);
    });

    // The controls become vertical at the same point at which a feed becomes a circle.
    it('stacks the controls where the feeds become circular', async () => {
        // Arrange
        const {container} = renderCallView(
            {feeds: [feed('jane')], hasControls: true},
            {height: 600, width: 400},
        );
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        const bar = container.querySelector('.controls');
        assert(bar instanceof HTMLElement, 'Expected the controls bar');
        const cell = container.querySelector('[data-expanded]');
        assert(cell instanceof HTMLElement, 'Expected a feed');

        // Assert: Wide enough, so the bar is a row and the feed keeps its shape.
        expect(getComputedStyle(bar).flexDirection).toBe('row');
        const wide = cell.getBoundingClientRect();
        expect(wide.height).toBeCloseTo((wide.width * 3) / 4, 0);

        // Act: Narrow enough for the compact form.
        container.style.width = '150px';
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });

        // Assert: The bar is vertical and the feed is a circle, i.e. both changed together.
        expect(getComputedStyle(bar).flexDirection).toBe('column');
        const narrow = cell.getBoundingClientRect();
        expect(narrow.height).toBeCloseTo(narrow.width, 0);
    });
});
