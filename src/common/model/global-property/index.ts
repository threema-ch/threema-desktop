import type {GlobalPropertyKey} from '~/common/enum';
import {APPLICATION_STATE_CODEC} from '~/common/model/global-property/application-state';
import {LAST_MEDIATOR_CONNECTION_CODEC} from '~/common/model/global-property/last-mediator-connection';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    GlobalPropertyUpdate,
    GlobalPropertyValues,
    GlobalPropertyView,
    IGlobalPropertyController,
    IGlobalPropertyModel,
    IGlobalPropertyRepository,
} from '~/common/model/types/settings';
import {LocalModelStoreCache} from '~/common/model/utils/model-cache';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {ReadonlyUint8Array} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class GlobalPropertyRepository implements IGlobalPropertyRepository {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: ServicesForModel,
        private readonly _cache = new LocalModelStoreCache<
            GlobalPropertyKey,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            GlobalPropertyModelStore<any>
        >(),
    ) {}

    /** @inheritdoc */
    public create<K extends GlobalPropertyKey>(
        key: K,
        value: GlobalPropertyValues[K],
    ): GlobalPropertyModelStore<K> {
        const store = GlobalPropertyModelStore.create(this._services, {key, value});
        this._cache.add(key, () => store);
        return store;
    }

    /** @inheritdoc */
    public createOrUpdate<K extends GlobalPropertyKey>(
        key: K,
        value: GlobalPropertyValues[K],
    ): GlobalPropertyModelStore<K> {
        let store = this.get(key);
        if (store === undefined) {
            store = this.create(key, value);
        } else {
            store.get().controller.update({value});
        }
        return store;
    }

    /** @inheritdoc */
    public get<K extends keyof GlobalPropertyValues>(
        key: K,
    ): LocalModelStore<IGlobalPropertyModel<K>> | undefined {
        const store = this._cache.getOrAdd(key, () =>
            GlobalPropertyModelStore.get(this._services, key),
        );
        return store;
    }

    /** @inheritdoc */
    public getOrCreate<K extends GlobalPropertyKey>(
        key: K,
        defaultValue: GlobalPropertyValues[K],
    ): LocalModelStore<IGlobalPropertyModel<K>> {
        const existingProperty = this.get(key);
        if (existingProperty !== undefined) {
            return existingProperty;
        }

        return this.create(key, defaultValue);
    }
}

/**
 * Map all Properties to a corresponding en- and decoder
 */
export type GlobalPropertyCodecs = {
    [TKey in keyof GlobalPropertyValues]: {
        readonly serialize: (value: GlobalPropertyValues[TKey]) => Uint8Array;
        readonly deserialize: (serializedValue: ReadonlyUint8Array) => GlobalPropertyValues[TKey];
    };
};

/**
 * De- and encoder for all Properties.
 *
 * See {@link GlobalPropertyKey} for property docs.
 */
const GLOBAL_PROPERTY_CODECS: GlobalPropertyCodecs = {
    lastMediatorConnection: LAST_MEDIATOR_CONNECTION_CODEC,
    applicationState: APPLICATION_STATE_CODEC,
};

export class GlobalPropertyController<K extends keyof GlobalPropertyValues>
    implements IGlobalPropertyController<K>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<GlobalPropertyView<K>>();

    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: GlobalPropertyUpdate<K>): void {
        this.meta.update((view) => {
            const {value} = change;
            const serializedValue = GLOBAL_PROPERTY_CODECS[view.key].serialize(value);
            this._services.db.updateGlobalProperty(view.key, serializedValue);
            return {value};
        });
    }
}

export class GlobalPropertyModelStore<K extends keyof GlobalPropertyValues> extends LocalModelStore<
    IGlobalPropertyModel<K>
> {
    private constructor(services: ServicesForModel, key: K, view: GlobalPropertyView<K>) {
        const {logging} = services;
        const tag = `global-property.${key}`;

        super(view, new GlobalPropertyController(services), key, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }

    public static get<K extends keyof GlobalPropertyValues>(
        services: ServicesForModel,
        key: K,
    ): GlobalPropertyModelStore<K> | undefined {
        const dbGlobalProperty = services.db.getGlobalProperty(key);
        if (dbGlobalProperty === undefined) {
            return undefined;
        }

        const value = GLOBAL_PROPERTY_CODECS[key].deserialize(dbGlobalProperty.value);

        return new GlobalPropertyModelStore(services, key, {key, value});
    }

    /**
     * Create a new property. The property must not yet exist.
     *
     * @param services Model Services
     * @param param1 Values of store that should be created.
     * @throws Error if property already exists.
     * @returns The new property store.
     */
    public static create<K extends keyof GlobalPropertyValues>(
        services: ServicesForModel,
        {key, value}: GlobalPropertyView<K>,
    ): GlobalPropertyModelStore<K> {
        const serializedValue = GLOBAL_PROPERTY_CODECS[key].serialize(value);

        services.db.createGlobalProperty(key, serializedValue);

        const store = this.get(services, key);
        return unwrap(
            store,
            'Existance of a just created global property must be available in the database',
        );
    }
}
