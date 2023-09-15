import {handleError} from '~/common/dom/utils/crash-reporting';
import {ConsoleLogger} from '~/common/logging';

class DomConsoleLogger extends ConsoleLogger {
    public override readonly error = (...data: readonly unknown[]): void => {
        // eslint-disable-next-line no-console
        console.error(...data);

        let logTag: string | undefined;
        let message = '';
        let error: Error | undefined;

        let stripTagLoggerStyling = false;
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            if (value instanceof Error) {
                error = value;
                break;
            }
            if (i === 0 && typeof value === 'string' && value.startsWith('%c')) {
                // First value may start with '%c', which indicates console log styling
                stripTagLoggerStyling = true;
                logTag = value.slice(2);
                continue;
            }
            if (i === 1 && stripTagLoggerStyling) {
                // If logger is styled, the second value contains styling and can be skipped
                continue;
            }
            message += `${value} `;
        }

        handleError(message.trimEnd(), logTag, error);
    };
}
export const DOM_CONSOLE_LOGGER = new DomConsoleLogger();
