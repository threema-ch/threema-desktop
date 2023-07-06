import {type GuardedStoreHandle} from '~/common/model/types/common';
import {type UpdatedView, type ViewUpdateFn} from '~/common/model/utils/model-store';
import {Delayed} from '~/common/utils/delayed';

/**
 * Glue between view and controller.
 *
 * Ensures that the controller is attached to an active view when accessing it and throws in case
 * the associated view has been removed from underlying storage.
 */
export class ModelLifetimeGuard<TView> {
    private _handle: Delayed<GuardedStoreHandle<TView>> = ModelLifetimeGuard._createDelayed();

    private static _createDelayed<TView>(): Delayed<GuardedStoreHandle<TView>> {
        return Delayed.simple('Controller inactive', 'Controller already activated');
    }

    /**
     * Return whether or not this controller is activated.
     */
    public get active(): boolean {
        return this._handle.isSet();
    }

    /**
     * Activate the controller with the given handle.
     *
     * This will be called by the store during its construction.
     */
    public activate(store: {
        readonly getView: () => TView;
        readonly updateView: (fn: ViewUpdateFn<TView>) => void;
    }): void {
        this._handle.set({
            view: () => store.getView(),
            update: (fn) =>
                store.updateView((view) => {
                    const change = fn(view);
                    return {...view, ...change} as UpdatedView<TView>;
                }),
        });
    }

    /**
     * Deactivate the controller after the executor finished successfully.
     *
     * This should be run when the controller removes the model's underlying data source.
     *
     * @param fn The executor to run prior to deactivation.
     * @returns The result of the executor.
     */
    public deactivate<TReturn>(fn?: (handle: GuardedStoreHandle<TView>) => TReturn): TReturn {
        const result = (fn?.(this._handle.unwrap()) ?? undefined) as TReturn;
        this._handle = ModelLifetimeGuard._createDelayed();
        return result;
    }

    /**
     * Run an executor. Ensures that the controller is attached to an active model.
     *
     * This should be used when accessing or modifying the underlying data source or if the executor
     * just needs to ensure that the controller is still attached to an active model.
     *
     * @param fn The executor to run.
     * @returns The result of the executor.
     */
    public run<TReturn>(fn: (handle: GuardedStoreHandle<TView>) => TReturn): TReturn {
        return fn(this._handle.unwrap());
    }

    /**
     * Commit a delta change of the view by applying it to a copy of the existing view, then push
     * the resulting update to subscribers.
     *
     * Ensures that the controller is attached to an active model.
     *
     * This should be used when modifying the underlying data source and then automatically push it
     * to all subscribers.
     *
     * @param fn The update function to run which returns the delta change to be committed.
     */
    public update(fn: (view: Readonly<TView>) => Partial<TView>): void {
        this._handle.unwrap().update(fn);
    }
}
