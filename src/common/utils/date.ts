import {type u53} from '~/common/types';

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

/**
 * Convert a duration of seconds to hours, minutes, and seconds.
 */
export function durationToUnits(seconds: u53): {
    readonly hours: u53;
    readonly minutes: u53;
    readonly seconds: u53;
} {
    if (seconds < 0) {
        seconds = 0;
    }
    return {
        seconds: Math.floor(seconds % 60),
        minutes: Math.floor((seconds / 60) % 60),
        hours: Math.floor(seconds / (60 * 60)),
    };
}

/**
 * Convert a number to a string and (left-)pad it to a certain length using zeroes.
 *
 * @example
 * ```ts
 * const a = pad(5) // "05"
 * const b = pad(30, 3) // "030"
 * ```
 * @param value The number to convert to a string and pad with zeroes.
 * @param digits Optional total count of digits the resulting string should have. `2` by default.
 */
function pad(value: u53, digits: u53 = 2): string {
    return value.toString().padStart(digits, '0');
}

/**
 * Convert a duration of seconds to a padded string in the form `mm:mm` or `HH:mm:ss`.
 */
export function durationToString(seconds: u53): string {
    const {hours: h, minutes: m, seconds: s} = durationToUnits(seconds);

    if (h > 0) {
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    return `${pad(m)}:${pad(s)}`;
}
