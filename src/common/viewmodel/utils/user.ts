import type {Nickname} from '~/common/network/types';
import type {ServicesForViewModel} from '~/common/viewmodel';

export function getUserDisplayName(
    services: Pick<ServicesForViewModel, 'device'>,
    nickname: Nickname | undefined,
): string {
    return nickname ?? services.device.identity.string;
}
