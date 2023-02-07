import {type PublicNickname, ensureIdentityString} from '~/common/network/types';
import {Identity} from '~/common/utils/identity';
import {makeKeypair} from '~/test/mocha/common/backend-mocks';
import {groupLeaveTests} from '~/test/mocha/common/network/protocol/task/common/group-leave';

/**
 * Test incoming group leave task.
 */
export function run(): void {
    describe('IncomingGroupLeaveTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as PublicNickname,
            keypair: makeKeypair(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as PublicNickname,
            keypair: makeKeypair(),
        };

        describe('shared tests', function () {
            groupLeaveTests.bind(this)(me, user1, user2, 'csp');
        });
    });
}
