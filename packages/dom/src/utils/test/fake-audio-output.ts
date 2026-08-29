/**
 * Handle of a faked audio output selection, as installed by {@link installFakeAudioOutput}.
 */
export interface FakeAudioOutput {
    /**
     * Restores the platform's own implementation.
     */
    readonly restore: () => void;
}

/**
 * Replaces the platform's way of directing audio at a chosen device, for tests which need it to
 * behave a certain way.
 *
 * @param setSinkId Called in place of the platform's own implementation. Return a rejected promise,
 *   or raise, to make the platform refuse.
 * @returns The handle of the fake. Note: {@link FakeAudioOutput.restore} must be called at the end
 *   of the test, because the fake is installed on the shared prototype.
 */
export function installFakeAudioOutput(setSinkId: (id: string) => Promise<void>): FakeAudioOutput {
    const platform = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'setSinkId');
    Object.defineProperty(HTMLMediaElement.prototype, 'setSinkId', {
        configurable: true,
        writable: true,
        value: async function fake(this: HTMLMediaElement, id: string): Promise<void> {
            await setSinkId(id);
        },
    });

    return {
        restore: () => {
            if (platform === undefined) {
                Reflect.deleteProperty(HTMLMediaElement.prototype, 'setSinkId');
                return;
            }
            Object.defineProperty(HTMLMediaElement.prototype, 'setSinkId', platform);
        },
    };
}
