import {ensureIdentityString, type Nickname} from '~/common/network/types';
import {Identity} from '~/common/utils/identity';
import {makeClientKey} from '~/test/mocha/common/backend-mocks';
import {groupSetupTests} from '~/test/mocha/common/network/protocol/task/common/group-setup';

/**
 * Test incoming group setup task.
 */
export function run(): void {
    describe('IncomingGroupSetup', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as Nickname,
            ck: makeClientKey(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as Nickname,
            ck: makeClientKey(),
        };
        const user3 = {
            identity: new Identity(ensureIdentityString('USER0003')),
            nickname: 'user3' as Nickname,
            ck: makeClientKey(),
        };

        describe('shared tests', function () {
            groupSetupTests.bind(this)(me, user1, user2, user3, 'csp');
        });
    });
}
