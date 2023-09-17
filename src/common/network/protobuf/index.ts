// Re-export Protobuf messages
export * from './js';
import {common} from './js';
import * as utils from './utils';
import * as validate from './validate';

export {utils, validate};

/**
 * Unit message instance.
 */
export const UNIT_MESSAGE = utils.creator(common.Unit, {});
