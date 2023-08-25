/**
 * Determine whether `a` and `b` {@link Date}s are in the same minute.
 */
export function isSameMinute(a: Date, b: Date): boolean {
    return (
        a.getMinutes() === b.getMinutes() &&
        a.getHours() === b.getHours() &&
        a.getDay() === b.getDay() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
    );
}

/**
 * Determine whether `a` and `b` {@link Date}s are on the same day.
 */
export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/**
 * Determine whether `a` and `b` {@link Date}s are in the same year.
 */
export function isSameYear(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear();
}

/**
 * Determine whether the given {@link Date} lies within the last week (including today).
 */
export function isWithinLastWeek(date: Date): boolean {
    const tomorrowLastWeek = new Date();
    tomorrowLastWeek.setDate(tomorrowLastWeek.getDate() - 6);
    tomorrowLastWeek.setHours(0, 0, 0, 0);

    return date <= new Date() && date > tomorrowLastWeek;
}

/**
 * Determine whether the given {@link Date} lies in the current year.
 */
export function isWithinCurrentYear(date: Date): boolean {
    return isSameYear(date, new Date());
}

/**
 * Determine whether the given {@link Date} is today.
 */
export function isToday(date: Date): boolean {
    return isSameDay(date, new Date());
}

/**
 * Determine whether the given {@link Date} is yesterday.
 */
export function isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return isSameDay(date, yesterday);
}
