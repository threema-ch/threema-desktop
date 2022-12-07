type ResetFn = (behavior?: 'smooth') => void;

export class SwipeAreaGroup {
    private _active?: ResetFn;

    /**
     * Replace the currently active swipe area.
     * @param active Reset function of the swipe area to be activated.
     */
    public replace(active: ResetFn): void {
        if (active === this._active) {
            return;
        }
        this._active?.('smooth');
        this._active = active;
    }

    /**
     * Remove the currently active swipe area (if it is still active).
     * @param active Reset function of a presumably active swipe area.
     */
    public remove(active: ResetFn): void {
        if (active === this._active) {
            this._active = undefined;
        }
    }
}
