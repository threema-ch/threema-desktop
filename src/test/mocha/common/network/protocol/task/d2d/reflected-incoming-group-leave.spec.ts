import {ensureIdentityString, type Nickname} from '~/common/network/types';
import {Identity} from '~/common/utils/identity';
import {createClientKey} from '~/test/mocha/common/backend-mocks';
import {groupLeaveTests} from '~/test/mocha/common/network/protocol/task/common/group-leave';

/**
 * Test reflected incoming group leave task.
 */
export function run(): void {
    describe('ReflectedIncomingGroupLeaveTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as Nickname,
            ck: createClientKey(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as Nickname,
            ck: createClientKey(),
        };

        describe('shared tests', function () {
            groupLeaveTests.bind(this)(me, user1, user2, 'd2d');
        });
    });
}
