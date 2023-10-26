import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';
import {isToday, isWithinCurrentYear, isWithinLastWeek, isYesterday} from '~/common/utils/date';

/**
 * Format a date as a "fluent", localized string, while choosing the appropriate length
 * automatically (e.g., the year will only be included if it is different than current).
 *
 * Format variant:
 *  - `auto`: Shortest representation possible (relative to now).
 *  - `time`: Only display time.
 *  - `extended`: Longer, more detailed, and unambiguous display of date and time.
 *
 * @param date Date to format.
 * @param i18n Translation provider.
 * @returns Formatted date.
 */
export function formatDateLocalized(
    date: Date,
    i18n: I18nType,
    format: 'auto' | 'time' | 'extended' = 'auto',
): string {
    switch (format) {
        case 'auto':
            return formatDateLocalizedAuto(date, i18n);

        case 'time':
            return formatDateLocalizedTime(date, i18n);

        case 'extended':
            return formatDateLocalizedExtended(date, i18n);

        default:
            return unreachable(format);
    }
}

function formatDateLocalizedTime(date: Date, i18n: I18nType): string {
    return new Intl.DateTimeFormat(i18n.locale, {
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatDateLocalizedExtended(date: Date, i18n: I18nType): string {
    return new Intl.DateTimeFormat(i18n.locale, {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
}

function formatDateLocalizedAuto(date: Date, i18n: I18nType): string {
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
    };

    if (isToday(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, timeOptions);

        // Example EN: "1:44 PM"
        // Example DE: "13:44"
        return formatter.format(date);
    }

    if (isYesterday(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, timeOptions);

        // Example EN: "Yesterday 1:44 PM"
        // Example DE: "Gestern, 13:44"
        return i18n.t('messaging.label--timestamp-yesterday', 'Yesterday {time}', {
            time: formatter.format(date),
        });
    }

    if (isWithinLastWeek(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, {
            weekday: 'long',
            ...timeOptions,
        });

        // Example EN: "Monday 1:44 PM"
        // Example DE: "Montag, 13:44"
        return formatter.format(date);
    }

    if (isWithinCurrentYear(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, {
            month: 'short',
            day: 'numeric',
            ...timeOptions,
        });

        // Example EN: "Jul 7, 1:44 PM"
        // Example DE: "7. Jul 13:44"
        return formatter.format(date);
    }

    const formatter = new Intl.DateTimeFormat(i18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...timeOptions,
    });

    // Example EN: "Jul 7, 2023, 1:44 PM"
    // Example DE: "7. Jul 2023, 13:44"
    return formatter.format(date);
}