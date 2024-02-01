export type ProfilePictureShape = 'square' | 'circle';

export type ProfilePictureColor =
    | 'yellow'
    | 'amber'
    | 'orange'
    | 'deep-orange'
    | 'red'
    | 'pink'
    | 'purple'
    | 'deep-purple'
    | 'indigo'
    | 'blue'
    | 'light-blue'
    | 'cyan'
    | 'teal'
    | 'green'
    | 'light-green'
    | 'olive';

export interface ProfilePictureData {
    img: string | Blob | Promise<string | Blob>;
    color: ProfilePictureColor;
    initials: string;
}
