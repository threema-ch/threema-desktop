import {extractErrorTraceback} from '~/common/error';
import {CONSOLE_LOGGER} from '~/common/logging';
import {assertUnreachable, setAssertFailLogger} from '~/common/utils/assert';

import {run} from '.';

// Temporarily set primitive assertion failed logger, then run
setAssertFailLogger((error) => CONSOLE_LOGGER.trace(extractErrorTraceback(error)));
run().catch(assertUnreachable);
