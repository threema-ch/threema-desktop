import {type Logger, type LoggerFactory, NOOP_LOGGER} from '~/common/logging';

export class NoopLoggerFactory implements LoggerFactory {
    public logger(tag: string, style?: string): Logger {
        return NOOP_LOGGER;
    }
}
