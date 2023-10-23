export type LazyAudioContent =
    | LoadingLazyAudioContent
    | FailedLazyAudioContent
    | LoadedLazyAudioContent;

interface LoadingLazyAudioContent {
    state: 'loading';
}

interface FailedLazyAudioContent {
    state: 'failed';
}

interface LoadedLazyAudioContent {
    state: 'loaded';
    /** Url of the loaded audio. */
    url: string;
}
