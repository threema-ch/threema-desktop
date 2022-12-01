import {expect} from 'chai';

import {MessageType} from '~/common/enum';
import {CspMessageFlags} from '~/common/network/protocol/flags';

/**
 * Config tests.
 */
export function run(): void {
    describe('Flags', function () {
        it('can be instantiated from a partial', function () {
            const flags = CspMessageFlags.fromPartial({
                groupMessage: true,
                immediateDeliveryRequired: false,
            });
            expect(flags.sendPushNotification).to.be.false;
            expect(flags.dontQueue).to.be.false;
            expect(flags.dontAck).to.be.false;
            expect(flags.groupMessage).to.be.true;
            expect(flags.immediateDeliveryRequired).to.be.false;
            expect(flags.dontSendDeliveryReceipts).to.be.false;
        });

        describe('can be instantiated from a bitmask', function () {
            it('0x00', function () {
                const flags = CspMessageFlags.fromBitmask(0x00);
                expect(flags.sendPushNotification).to.be.false;
                expect(flags.dontQueue).to.be.false;
                expect(flags.dontAck).to.be.false;
                expect(flags.groupMessage).to.be.false;
                expect(flags.immediateDeliveryRequired).to.be.false;
                expect(flags.dontSendDeliveryReceipts).to.be.false;
            });

            it('0xff', function () {
                const flags = CspMessageFlags.fromBitmask(0xff);
                expect(flags.sendPushNotification).to.be.true;
                expect(flags.dontQueue).to.be.true;
                expect(flags.dontAck).to.be.true;
                expect(flags.groupMessage).to.be.true;
                expect(flags.immediateDeliveryRequired).to.be.true;
                expect(flags.dontSendDeliveryReceipts).to.be.true;
            });

            it('0x01 | 0x04 | 0x10 | 0x80', function () {
                const flags = CspMessageFlags.fromBitmask(0b10010101);
                expect(flags.sendPushNotification).to.be.true;
                expect(flags.dontQueue).to.be.false;
                expect(flags.dontAck).to.be.true;
                expect(flags.groupMessage).to.be.true;
                expect(flags.immediateDeliveryRequired).to.be.false;
                expect(flags.dontSendDeliveryReceipts).to.be.true;
            });
        });

        describe('can be converted to a bitmask', function () {
            it('0x00', function () {
                const mask = CspMessageFlags.fromPartial({}).toBitmask();
                expect(mask).to.equal(0x00);
            });

            it('all flags', function () {
                const mask = CspMessageFlags.fromPartial({
                    sendPushNotification: true,
                    dontQueue: true,
                    dontAck: true,
                    groupMessage: true,
                    immediateDeliveryRequired: true,
                    dontSendDeliveryReceipts: true,
                }).toBitmask();
                expect(mask).to.equal(0xb7);
            });

            it('0x01 | 0x04 | 0x10 | 0x80', function () {
                const mask = CspMessageFlags.fromPartial({
                    sendPushNotification: true,
                    dontAck: true,
                    groupMessage: true,
                    dontSendDeliveryReceipts: true,
                }).toBitmask();
                expect(mask).to.equal(0x95);
            });
        });

        describe('can be instantiated for a specific message type', function () {
            it('text', function () {
                const flags = CspMessageFlags.forMessageType(MessageType.TEXT);
                expect(flags.sendPushNotification).to.be.true;
                expect(flags.dontQueue).to.be.false;
                expect(flags.dontAck).to.be.false;
                expect(flags.groupMessage).to.be.false;
                expect(flags.immediateDeliveryRequired).to.be.false;
                expect(flags.dontSendDeliveryReceipts).to.be.false;
            });

            it('file', function () {
                const flags = CspMessageFlags.forMessageType(MessageType.FILE);
                expect(flags.sendPushNotification).to.be.true;
                expect(flags.dontQueue).to.be.false;
                expect(flags.dontAck).to.be.false;
                expect(flags.groupMessage).to.be.false;
                expect(flags.immediateDeliveryRequired).to.be.false;
                expect(flags.dontSendDeliveryReceipts).to.be.false;
            });
        });
    });
}
