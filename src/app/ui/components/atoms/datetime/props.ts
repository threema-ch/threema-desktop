export interface DateTimeProps {
    /** The date object to render. */
    readonly date: Date;
    /**
     * Format variant:
     *  - `auto`: Shortest representation possible (relative to now).
     *  - `time`: Only display time.
     *  - `extended`: Longer, more detailed, and unambiguous display of date and time.
     */
    readonly format?: 'auto' | 'time' | 'extended';
}
