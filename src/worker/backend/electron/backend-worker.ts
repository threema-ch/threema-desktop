import {assertUnreachable} from '~/common/utils/assert';

import {run} from '.';

run().catch(assertUnreachable);
