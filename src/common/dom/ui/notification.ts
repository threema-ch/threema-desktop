import {i18n} from '~/app/ui/i18n';
import {appVisibility} from '~/common/dom/ui/state';
import type {
    CustomNotification,
    DeletedMessageNotification,
    ExtendedNotificationOptions,
    NotificationCreator,
    NotificationHandle,
    NotificationTag,
} from '~/common/notification';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

class ProxyNotification extends Notification {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        title: string,
        options: ExtendedNotificationOptions,
        // This identifier can be used to check which message was last shown in the notification,
        // this allows updating edited message iff the message edited was the message last shown.
        public readonly lastNotificationIdentifier: string,
    ) {
        super(title, options);
    }
}

export class FrontendNotificationCreator implements NotificationCreator {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _notifications = new Map<NotificationTag, ProxyNotification>();

    public constructor() {
        // Clear all notifications on 'focus' event.
        //
        // Note: Only one instance of a `FrontendNotificationCreator` should exist for the lifetime
        //       of the app, so we don't need to unsubscribe from the store.
        //
        // TODO(DESK-1081): Move the subscription out of this constructor, e.g. into `globals` to
        // remove the singleton smell.
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
        notification: Exclude<CustomNotification, DeletedMessageNotification>,
    ): NotificationHandle | undefined {
        const {options, identifier} = notification;
        const {tag} = options;

        // Check if we shouldn't show notifications if the application is focused
        if (options.creator.ignore === 'if-focused' && appVisibility.get() === 'focused') {
            return undefined;
        }

        // Create notification
        let proxyNotification: ProxyNotification;
        switch (notification.type) {
            case 'generic': {
                proxyNotification = new ProxyNotification(notification.title, options, identifier);
                break;
            }
            case 'new-message': {
                const title = this._createNewMessageTitle(
                    notification.unreadCount,
                    notification.receiverConversation,
                    notification.senderName,
                );
                proxyNotification = new ProxyNotification(title, options, identifier);

                break;
            }

            default:
                return unreachable(notification);
        }

        this._notifications.set(tag, proxyNotification);
        proxyNotification.addEventListener('close', () => this._notifications.delete(tag));
        return proxyNotification;
    }

    public update(notification: CustomNotification): NotificationHandle | undefined {
        const {options, identifier} = notification;
        const {tag} = options;

        // Check if we shouldn't show notifications if the application is focused
        if (options.creator.ignore === 'if-focused' && appVisibility.get() === 'focused') {
            return undefined;
        }

        switch (notification.type) {
            case 'generic': {
                const proxyNotification = this._notifications.get(tag);
                if (proxyNotification?.lastNotificationIdentifier === identifier) {
                    this._notifications.set(
                        tag,
                        new ProxyNotification(notification.title, options, identifier),
                    );
                }
                return proxyNotification;
            }
            case 'new-message': {
                const title = this._createNewMessageTitle(
                    notification.unreadCount,
                    notification.receiverConversation,
                    notification.senderName,
                );
                const proxyNotification = this._notifications.get(tag);
                if (proxyNotification?.lastNotificationIdentifier === identifier) {
                    this._notifications.set(tag, new ProxyNotification(title, options, identifier));
                }
                return proxyNotification;
            }

            case 'deleted-message': {
                const title = this._createNewMessageTitle(
                    notification.unreadCount,
                    notification.receiverConversation,
                    notification.senderName,
                );
                const body: string = i18n
                    .get()
                    .t(
                        'messaging.prose--notification-deleted-message',
                        'This message was deleted.',
                    );
                const proxyNotification = new ProxyNotification(
                    title,
                    {...options, body},
                    identifier,
                );
                this._notifications.set(tag, proxyNotification);
                proxyNotification.addEventListener('close', () => this._notifications.delete(tag));
                return proxyNotification;
            }

            default:
                return unreachable(notification);
        }
    }

    private _createNewMessageTitle(
        unreadCount: number,
        recipientName: string,
        senderName: string | undefined,
    ): string {
        if (senderName === undefined) {
            return i18n
                .get()
                .t(
                    'messaging.prose--notification-title-single',
                    '{n, plural, =1 {New message} other {{n} new messages}} from {recipientName}',
                    {
                        n: unreadCount.toString(),
                        recipientName,
                    },
                );
        }

        return i18n
            .get()
            .t(
                'messaging.prose--notification-title-group',
                '{n, plural, =1 {New message from {senderName}} other {{n} new messages}} in group {recipientName}',
                {
                    n: unreadCount.toString(),
                    senderName,
                    recipientName,
                },
            );
    }
}
