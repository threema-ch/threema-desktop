// Dynamically import all `*.spec.ts` files.
// This is done using the glob import feature in vite:
// https://vitejs.dev/guide/features.html#glob-import
const specs = import.meta.glob<{readonly run: () => void}>('./**/*.spec.ts', {eager: true});
if (Object.values(specs).length === 0) {
    throw new Error('Import glob did not match any spec files!');
}

console.log('\nLoaded specfiles:');
for (const path of Object.keys(specs)) {
    console.log(`- ${path}`);
}
for (const spec of Object.values(specs)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    spec.run();
}

export {};
