import {i18n} from '~/app/ui/i18n';
import {appVisibility} from '~/common/dom/ui/state';
import {TRANSFER_HANDLER} from '~/common/index';
import type {
    CustomNotification,
    DeletedMessageNotification,
    ExtendedNotificationOptions,
    GroupCallStartNotification,
    NotificationCreator,
    NotificationHandle,
    NotificationTag,
} from '~/common/notification';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';

class ProxyNotification extends Notification {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public aboutToBeReplaced: boolean = false;

    public constructor(
        title: string,
        options: ExtendedNotificationOptions,
        // This identifier can be used to check which message was last shown in the notification,
        // this allows updating edited message iff the message edited was the message last shown.
        public readonly lastNotificationIdentifier: string,
        private readonly _closeHandler: (notification: ProxyNotification) => void,
    ) {
        super(title, options);
    }

    public registerOnCloseHandler(): void {
        this.addEventListener('close', this._onCloseHandler.bind(this));
    }

    private _onCloseHandler(event: Event): void {
        this._closeHandler(this);
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

        // Explicitly close a notification with this tag so it doesn't stick around in notification
        // centers (even after the app is opened).
        this._notifications.get(tag)?.close();

        // Create notification
        let proxyNotification: ProxyNotification;
        switch (notification.type) {
            case 'generic': {
                proxyNotification = new ProxyNotification(
                    notification.title,
                    options,
                    identifier,
                    this._registerOnCloseEventHandler.bind(this),
                );
                break;
            }

            case 'group-call-start':
                proxyNotification = new ProxyNotification(
                    notification.groupName,
                    {
                        ...options,
                        body: this._getGroupCallStartBody(notification.startedByContactName),
                    },
                    identifier,
                    this._registerOnCloseEventHandler.bind(this),
                );
                break;

            case 'new-message': {
                const title = this._getNewMessageTitle(
                    notification.unreadCount,
                    notification.receiverConversation,
                    notification.senderName,
                );
                proxyNotification = new ProxyNotification(
                    title,
                    options,
                    identifier,
                    this._registerOnCloseEventHandler.bind(this),
                );
                break;
            }

            default:
                return unreachable(notification);
        }
        this._notifications.set(tag, proxyNotification);
        proxyNotification.registerOnCloseHandler();
        return proxyNotification;
    }

    public update(
        notification: Exclude<CustomNotification, GroupCallStartNotification>,
    ): NotificationHandle | undefined {
        const {options, identifier} = notification;
        const {tag} = options;

        // Check if we shouldn't show notifications if the application is focused
        if (options.creator.ignore === 'if-focused' && appVisibility.get() === 'focused') {
            return undefined;
        }
        const proxyNotification = this._notifications.get(tag);
        if (proxyNotification?.lastNotificationIdentifier === identifier) {
            // Since we get a new notification with the same (identifier, tag) tuple, we don't want
            // this tag to be deleted from the map. However, we close the notification anyway so
            // that it does not stick around.
            proxyNotification.aboutToBeReplaced = true;
            proxyNotification.close();
            let updatedNotification: ProxyNotification;
            switch (notification.type) {
                case 'generic': {
                    updatedNotification = new ProxyNotification(
                        notification.title,
                        options,
                        identifier,
                        this._registerOnCloseEventHandler.bind(this),
                    );
                    break;
                }

                case 'new-message': {
                    const title = this._getNewMessageTitle(
                        notification.unreadCount,
                        notification.receiverConversation,
                        notification.senderName,
                    );
                    updatedNotification = new ProxyNotification(
                        title,
                        options,
                        identifier,
                        this._registerOnCloseEventHandler.bind(this),
                    );
                    break;
                }

                case 'deleted-message': {
                    const title = this._getNewMessageTitle(
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

                    updatedNotification = new ProxyNotification(
                        title,
                        {...options, body},
                        identifier,
                        this._registerOnCloseEventHandler.bind(this),
                    );

                    break;
                }

                default:
                    return unreachable(notification);
            }
            this._notifications.set(tag, updatedNotification);
            updatedNotification.registerOnCloseHandler();
        }
        return this._notifications.get(tag);
    }

    private _getNewMessageTitle(
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

    private _getGroupCallStartBody(startedByContactName: string | undefined): string {
        if (startedByContactName === undefined) {
            return i18n
                .get()
                .t(
                    'messaging.prose--notification-group-call-start-body-generic',
                    'A group call started',
                );
        }

        return i18n
            .get()
            .t(
                'messaging.prose--notification-group-call-start-body',
                'A group call was started by {name}',
                {
                    name: startedByContactName,
                },
            );
    }

    private _registerOnCloseEventHandler(notification: ProxyNotification): void {
        const tag = notification.tag as NotificationTag;
        if (
            this._notifications.get(tag)?.lastNotificationIdentifier ===
                notification.lastNotificationIdentifier &&
            !notification.aboutToBeReplaced
        ) {
            this._notifications.delete(tag);
        }
    }
}
