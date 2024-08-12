import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {
    AudioInputDeviceInfo,
    AudioOutputDeviceInfo,
} from '~/app/ui/components/partials/call-activity/internal/control-bar/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {truncate} from '~/common/utils/string';

/**
 * Returns {@link ContextMenuItem}s for the given {@link audioInputDevices} and
 * {@link audioOutputDevices}, which can be used to present a context menu to change the current
 * microphone or speaker.
 */
export function getAudioDeviceContextMenuItems(
    i18n: I18nType,
    audioInputDevices: AudioInputDeviceInfo[],
    audioOutputDevices: AudioOutputDeviceInfo[],
    currentAudioInputDeviceId: string | undefined,
    currentAudioOutputDeviceId: string | undefined,
    onSelectAudioInputDevice: (device: AudioInputDeviceInfo) => void,
    onSelectAudioOutputDevice: (device: AudioOutputDeviceInfo) => void,
): ContextMenuItem[] {
    return [
        {
            type: 'heading',
            icon: {name: 'volume_up'},
            text: i18n.t('messaging.label--call-select-audio-output', 'Speakers'),
        } as const,
        ...audioOutputDevices.map((deviceInfo, index) => {
            const isSelected = deviceInfo.deviceId === currentAudioOutputDeviceId;
            const isFirst = index === 0;

            return {
                type: 'option',
                handler: () => {
                    if (deviceInfo.deviceId !== currentAudioOutputDeviceId) {
                        onSelectAudioOutputDevice(deviceInfo);
                    }
                },
                icon:
                    isSelected || (isFirst && currentAudioOutputDeviceId === undefined)
                        ? {name: 'check'}
                        : undefined,
                label: truncate(deviceInfo.label, 24, 'end'),
            } as const;
        }),
        {type: 'divider'},
        {
            type: 'heading',
            icon: {name: 'mic'},
            text: i18n.t('messaging.label--call-select-audio-input', 'Microphone'),
        } as const,
        ...audioInputDevices.map((deviceInfo, index) => {
            const isSelected = deviceInfo.deviceId === currentAudioInputDeviceId;
            const isFirst = index === 0;

            return {
                type: 'option',
                handler: () => {
                    if (deviceInfo.deviceId !== currentAudioInputDeviceId) {
                        onSelectAudioInputDevice(deviceInfo);
                    }
                },
                icon:
                    isSelected || (isFirst && currentAudioInputDeviceId === undefined)
                        ? {name: 'check'}
                        : undefined,
                label: truncate(deviceInfo.label, 24, 'end'),
            } as const;
        }),
    ];
}
