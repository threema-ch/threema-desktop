// Dynamically import all `*.spec.ts` files.
// This is done using the glob import feature in vite:
// https://vitejs.dev/guide/features.html#glob-import
const specs = import.meta.globEager('./**/*.spec.ts');
if (Object.values(specs).length === 0) {
    throw new Error('Import glob did not match any spec files!');
}

console.log('\nLoaded specfiles:');
for (const path of Object.keys(specs)) {
    console.log(`- ${path}`);
}
for (const spec of Object.values(specs)) {
    spec.run();
}

export {};
