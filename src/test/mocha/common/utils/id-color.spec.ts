import * as chai from 'chai';

import {ReceiverType} from '~/common/enum';
import {
    ensureDistributionListId,
    ensureGroupId,
    ensureIdentityString,
} from '~/common/network/types';
import {idColorIndex, idColorIndexToString} from '~/common/utils/id-color';
import {hexLeToU64} from '~/common/utils/number';
import chaiByteEqual from '~/test/common/plugins/byte-equal';

const {expect} = chai.use(chaiByteEqual);

export function run(): void {
    describe('utils::id-color', function () {
        describe('idColorIndex', function () {
            it('for contact', function () {
                expect(
                    idColorIndex({
                        type: ReceiverType.CONTACT,
                        identity: ensureIdentityString('ECHOECHO'),
                    }),
                ).to.equal(96);
                expect(
                    idColorIndex({
                        type: ReceiverType.CONTACT,
                        identity: ensureIdentityString('ABCD1234'),
                    }),
                ).to.equal(22);
            });

            it('for group', function () {
                expect(
                    idColorIndex({
                        type: ReceiverType.GROUP,
                        creatorIdentity: ensureIdentityString('ECHOECHO'),
                        groupId: ensureGroupId(hexLeToU64('1609b781b01f7285')),
                    }),
                ).to.equal(59);
                expect(
                    idColorIndex({
                        type: ReceiverType.GROUP,
                        creatorIdentity: ensureIdentityString('ECHOECHO'),
                        groupId: ensureGroupId(hexLeToU64('3120359c39a19be7')),
                    }),
                ).to.equal(183);
                expect(
                    idColorIndex({
                        type: ReceiverType.GROUP,
                        creatorIdentity: ensureIdentityString('ABCD0123'),
                        groupId: ensureGroupId(hexLeToU64('1609b781b01f7285')),
                    }),
                ).to.equal(247);
                expect(
                    idColorIndex({
                        type: ReceiverType.GROUP,
                        creatorIdentity: ensureIdentityString('ABCD0123'),
                        groupId: ensureGroupId(hexLeToU64('3120359c39a19be7')),
                    }),
                ).to.equal(196);
            });

            it('for distribution list', function () {
                expect(
                    idColorIndex({
                        type: ReceiverType.DISTRIBUTION_LIST,
                        distributionListId: ensureDistributionListId(
                            hexLeToU64('1609b781b01f7285'),
                        ),
                    }),
                ).to.equal(155);
                expect(
                    idColorIndex({
                        type: ReceiverType.DISTRIBUTION_LIST,
                        distributionListId: ensureDistributionListId(
                            hexLeToU64('3120359c39a19be7'),
                        ),
                    }),
                ).to.equal(241);
            });
        });

        describe('idColorIndexToString', function () {
            it('converts colors correctly', function () {
                expect(idColorIndexToString(0x00)).to.equal('deep-orange');
                expect(idColorIndexToString(0x04)).to.equal('deep-orange');
                expect(idColorIndexToString(0x0f)).to.equal('deep-orange');
                expect(idColorIndexToString(0x10)).to.equal('orange');
                expect(idColorIndexToString(0x44)).to.equal('olive');
                expect(idColorIndexToString(0xce)).to.equal('deep-purple');
                expect(idColorIndexToString(0xff)).to.equal('red');
            });
        });
    });
}
