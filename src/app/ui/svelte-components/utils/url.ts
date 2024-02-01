/**
 * Container for loading a resource into an object URL.
 */
export class UrlSource {
    private _url: string | undefined;

    /**
     * Create a url resource container.
     * @param onDestroy A registration function for code to be executed on
     *   destruction of an associated component. This container will register
     *   unloading resources on destruction to prevent memory leaks.
     */
    public constructor(onDestroy: (fn: () => unknown) => void) {
        onDestroy(() => this.unload());
    }

    /**
     * Load a resource and create an object URL from it, if needed.
     * @param data Resource data in form of a normal URL or a Blob.
     * @returns The loaded resource.
     */
    public load(data: string | Blob): string;

    /**
     * Load a promised resource and create an object URL from it, if needed.
     * @param data Promised resource data in form of a normal URL or a Blob.
     * @returns A promise for the loaded resource.
     */
    public load(data: Promise<string | Blob>): Promise<string>;

    /**
     * Load a resource and create an object URL from it, if needed.
     * @param data Resource data in form of a normal URL or a Blob, or a
     *   promise of either.
     * @returns The loaded resource or a promise for the loaded resource.
     */
    public load(data: string | Blob | Promise<string | Blob>): string | Promise<string>;

    public load(data: string | Blob | Promise<string | Blob>): string | Promise<string> {
        // Revoke current object URL
        this.unload();

        // Await promise (if any), create object URL (if needed)
        if (data instanceof Promise) {
            return data.then(this._setObjectUrl.bind(this));
        }
        return this._setObjectUrl(data);
    }

    /**
     * Revoke the current object URL (if any).
     */
    public unload(): undefined {
        if (this._url !== undefined) {
            URL.revokeObjectURL(this._url);
            this._url = undefined;
        }
        return undefined;
    }

    private _setObjectUrl(data: string | Blob): string {
        if (data instanceof Blob) {
            data = URL.createObjectURL(data);
        }
        this._url = data;
        return data;
    }
}
