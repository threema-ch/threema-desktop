import {expect} from 'chai';

import {type NonceHash} from '~/common/crypto';
import {bytesToHex} from '~/common/utils/byte';

export function expectSameNonceHashes(actual: NonceHash[], expected: NonceHash[]): Chai.Assertion {
    expect(actual.length).to.equal(expected.length);
    return expect(actual.map((h) => bytesToHex(h))).to.have.same.members(
        expected.map((h) => bytesToHex(h)),
    );
}
