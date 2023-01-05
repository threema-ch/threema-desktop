import {appVisibility} from '~/common/dom/ui/state';
import {
    type ExtendedNotificationOptions,
    type NotificationCreator,
    type NotificationHandle,
    type NotificationTag,
} from '~/common/notification';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

class ProxyNotification extends Notification {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
}

export class FrontendNotificationCreator implements NotificationCreator {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;

    private readonly _notifications = new Map<NotificationTag, ProxyNotification>();

    public constructor() {
        // Clear all notifications on 'focus' event.
        //
        // Note: Only one instance of a `FrontendNotificationCreator` should exist for the lifetime
        //       of the app, so we don't need to unsubscribe from the store.
        appVisibility.subscribe((visibility) => {
            if (visibility === 'focused') {
                for (const notification of this._notifications.values()) {
                    notification.close();
                }
                this._notifications.clear();
            }
        });
    }

    public create(
        title: string,
        options: ExtendedNotificationOptions,
    ): NotificationHandle | undefined {
        const {tag} = options;

        // Check if we shouldn't show notifications if the application is focused
        if (options.creator.ignore === 'if-focused' && appVisibility.get() === 'focused') {
            return undefined;
        }

        // Create notification
        const notification = new ProxyNotification(title, options);
        this._notifications.set(tag, notification);
        notification.addEventListener('close', () => this._notifications.delete(tag));
        return notification;
    }
}
