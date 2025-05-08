import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'process';

/**
 * Generate the icons necessary to build the app.
 *
 * @param {string} baseConfigPath The path to the config.
 * @param {unknown} config The parsed config for custom builds.
 * @param {string | undefined} outFolder The toplevel folder where the icons are put into. If
 *   undefined, the icons will be put into the correct location for builds directly.
 */
export function generateAppIcons(baseConfigPath, config, outFolder) {
    const {console} = globalThis;

    console.log('Generating icons for web');
    childProcess.execSync(
        `npm run assets:generate:icons:web:custom -- "${path.join(baseConfigPath, config.assetPaths.web)}" "${outFolder ?? ''}"`,
        {stdio: 'inherit', env: {...process.env}},
    );

    console.log('Generating icons for macos');
    childProcess.execSync(
        `npm run assets:generate:icons:macos:custom -- "${path.join(baseConfigPath, config.assetPaths.macos.icon)}" "${outFolder ?? ''}"`,
        {stdio: 'inherit', env: {...process.env}},
    );

    console.log('Moving installer background image');
    const installerOutPath = `"${path.join(outFolder ?? '', 'packaging/assets/installers')}"`;

    if (!fs.existsSync(installerOutPath)) {
        childProcess.execSync(`mkdir -p ${installerOutPath}`);
    }
    childProcess.execSync(
        `cp "${path.join(baseConfigPath, config.assetPaths.macos.installer)}" ${installerOutPath}/custom.png`,
    );
    childProcess.execSync(
        `cp "${path.join(baseConfigPath, config.assetPaths.macos['installer@2x'])}" ${installerOutPath}/custom@2x.png`,
    );

    console.log('Generating icons for windows');
    childProcess.execSync(
        `npm run assets:generate:icons:windows:custom -- "${path.join(baseConfigPath, config.assetPaths.windows.standard)}" "${path.join(baseConfigPath, config.assetPaths.windows.store ?? config.assetPaths.windows.standard)}" "${outFolder ?? ''}"`,
        {stdio: 'inherit', env: {...process.env}},
    );
}
