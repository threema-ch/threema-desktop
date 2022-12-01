/**
 * A proxy handler wrapper that automatically binds methods to avoid
 * IllegalInvocation errors.
 */
export class ProxyHandlerWrapper<T extends object> implements ProxyHandler<T> {
    private readonly _handler: ProxyHandler<T>;

    public constructor(handler: ProxyHandler<T>) {
        this._handler = handler;
    }

    public get(target: T, property: string & keyof T, receiver: unknown): unknown {
        const attribute = target[property];

        // Invoke handler
        let result = attribute;
        if (this._handler.get !== undefined) {
            result = this._handler.get(target, property, receiver);
        }

        // Bind if needed (is the base attribute and function)
        if (result === attribute && attribute instanceof Function) {
            result = attribute.bind(target);
        }
        return result;
    }
}
