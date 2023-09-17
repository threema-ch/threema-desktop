import type {DbDistributionListUid} from '~/common/db';
import type {ReceiverType} from '~/common/enum';
import type {LocalModel} from '~/common/model/types/common';
import type {ReceiverController} from '~/common/model/types/receiver';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {ProxyMarked} from '~/common/utils/endpoint';

export interface DistributionListView {
    readonly stub: 'TODO(DESK-236)';
}
type DistributionListController = ReceiverController & {
    readonly meta: ModelLifetimeGuard<DistributionListView>;
} & ProxyMarked;
export type DistributionList = LocalModel<
    DistributionListView,
    DistributionListController,
    DbDistributionListUid,
    ReceiverType.DISTRIBUTION_LIST
>;
