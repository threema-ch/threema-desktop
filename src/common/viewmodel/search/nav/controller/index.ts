import type {u53} from '~/common/types';
import {PROXY_HANDLER, TRANSFER_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';

export interface ISearchViewModelController extends ProxyMarked {
    /**
     * Triggers a refresh of the search results, even if the search params haven't changed.
     */
    readonly refresh: () => void;
    readonly setSearchParams: (params: SearchParams) => void;
    get searchParams(): IQueryableStore<SearchParams | undefined>;
}

export interface SearchParams {
    readonly term: string | undefined;
    readonly limits: {
        /**
         * Limits the maximum amount of conversations to return. If `undefined`, no limit will be
         * applied and all results will be returned.
         */
        readonly conversations: u53 | undefined;
        /**
         * Limits the maximum amount of messages to return. If `undefined`, no limit will be applied
         * and all results will be returned.
         */
        readonly messages: u53 | undefined;
        /**
         * Limits the maximum amount of receivers to return. If `undefined`, no limit will be
         * applied and all results will be returned.
         */
        readonly receivers: u53 | undefined;
    };
}

export class SearchViewModelController implements ISearchViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _currentSearchParamsStore = new WritableStore<SearchParams | undefined>(
        undefined,
    );

    public get searchParams(): IQueryableStore<SearchParams | undefined> {
        return this._currentSearchParamsStore;
    }

    /** @inheritdoc */
    public refresh(): void {
        this._currentSearchParamsStore.update((currentValue) =>
            currentValue === undefined ? undefined : {...currentValue},
        );
    }

    public setSearchParams(params: SearchParams): void {
        this._currentSearchParamsStore.set(params);
    }
}
