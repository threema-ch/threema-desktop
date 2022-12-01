/**
 * Base class all structbuf classes will inherit from.
 */
export abstract class Struct {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract snapshot(): Record<string, any>;
}
