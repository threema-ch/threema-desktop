// Dynamically import all `*.spec.ts` files.
// This is done using the glob import feature in vite:
// https://vitejs.dev/guide/features.html#glob-import
const specs = import.meta.glob('./**/*.spec.ts', {eager: true});
if (Object.values(specs).length === 0) {
    throw new Error('Import glob did not match any spec files!');
}
