import type {u53} from '~/common/types';

/**
 * Props accepted by the `FileInfo` component.
 */
export interface FileInfoProps {
    /**
     * Whether clicking on the file should be disabled. Defaults to `false`.
     */
    readonly disabled?: boolean;
    readonly mediaType: string;
    readonly name: {
        /**
         * Default file name used as a fallback if the raw name is empty.
         */
        readonly default: string;
        /**
         * The raw (original) file name.
         *
         * Note: Will be amended to `name.extension` using the `mediaType`, if needed.
         */
        readonly raw?: string;
    };
    /** The reported size of the file in bytes. */
    readonly sizeInBytes: u53;
}
