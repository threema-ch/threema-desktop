/**
 * Base class all structbuf classes will inherit from.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class Struct {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract snapshot(): Record<string, any>;
}
