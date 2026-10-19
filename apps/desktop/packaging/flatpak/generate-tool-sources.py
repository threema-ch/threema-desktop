import argparse
import base64
import hashlib
import json
import tomllib
import urllib.request
from pathlib import Path
from typing import Any

MONOREPO_ROOT = Path(__file__).resolve().parents[4]
LIBTHREEMA_DIR = MONOREPO_ROOT / 'packages' / 'libthreema-wasm' / 'libs' / 'libthreema'

ARCHES = ('aarch64', 'x86_64')

USER_AGENT = 'threema-desktop-flatpak-tool-sources'

Source = dict[str, Any]

def fetch(url: str) -> bytes:
    print(f'Downloading {url}')
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()

def rust_sources() -> list[Source]:
    toolchain = tomllib.loads((LIBTHREEMA_DIR / 'rust-toolchain.toml').read_text())
    channel = toolchain['toolchain']['channel']
    manifest = tomllib.loads(
        fetch(f'https://static.rust-lang.org/dist/channel-rust-{channel}.toml').decode()
    )
    print(f'Rust: {manifest["pkg"]["rust"]["version"]}')

    def archive(package: str, target: str, dest: str) -> Source:
        artifact = manifest['pkg'][package]['target'][target]
        if not artifact['available']:
            raise ValueError(f'Rust package {package} not available for {target}')
        return {
            'type': 'archive',
            'url': artifact['xz_url'],
            'sha256': artifact['xz_hash'],
            'dest': dest,
        }

    sources = []
    for arch in ARCHES:
        target = f'{arch}-unknown-linux-gnu'
        sources.append(
            {
                **archive('rust', target, 'rust-dist'),
                'only-arches': [arch],
            }
        )
        sources.append(
            {
                'type': 'shell',
                'commands': [
                    f'./rust-dist/install.sh --prefix=$PWD/rust --components=rustc,cargo,rust-std-{target} --disable-ldconfig',
                ],
                'only-arches': [arch],
            }
        )
    return [
        *sources,
        archive('rust-std', 'wasm32-unknown-unknown', 'rust-std-wasm32'),
        {
            'type': 'shell',
            'commands': [
                './rust-std-wasm32/install.sh --prefix=$PWD/rust --disable-ldconfig',
                'rm -rf rust-dist rust-std-wasm32',
            ],
        },
    ]

def wasm_bindgen_sources() -> list[Source]:
    lockfile = tomllib.loads((LIBTHREEMA_DIR / 'Cargo.lock').read_text())
    versions = {
        package['version']
        for package in lockfile['package']
        if package['name'] == 'wasm-bindgen'
    }
    if len(versions) != 1:
        raise ValueError(f'Expected exactly one wasm-bindgen version in Cargo.lock, got {versions}')
    (version,) = versions
    print(f'wasm-bindgen: {version}')

    sources = []
    for arch in ARCHES:
        url = (
            f'https://github.com/wasm-bindgen/wasm-bindgen/releases/download/{version}/'
            f'wasm-bindgen-{version}-{arch}-unknown-linux-musl.tar.gz'
        )
        sources.append(
            {
                'type': 'archive',
                'url': url,
                'sha256': hashlib.sha256(fetch(url)).hexdigest(),
                'dest': 'wasm-bindgen',
                'only-arches': [arch],
            }
        )
    return sources

def binaryen_sources() -> list[Source]:
    package_json = MONOREPO_ROOT / 'packages' / 'libthreema-wasm' / 'package.json'
    version = json.loads(package_json.read_text())['pins']['binaryen']
    print(f'binaryen: {version}')

    sources = []
    for arch in ARCHES:
        url = (
            f'https://github.com/WebAssembly/binaryen/releases/download/version_{version}/'
            f'binaryen-version_{version}-{arch}-linux.tar.gz'
        )
        sources.append(
            {
                'type': 'archive',
                'url': url,
                'sha256': hashlib.sha256(fetch(url)).hexdigest(),
                'dest': 'wasm-binaryen',
                'only-arches': [arch],
            }
        )
    return sources

def protoc_sources() -> list[Source]:
    package_json = MONOREPO_ROOT / 'packages' / 'protocol' / 'package.json'
    version = json.loads(package_json.read_text())['pins']['protoc']
    print(f'protoc: {version}')

    protoc_arches = {'aarch64': 'aarch_64', 'x86_64': 'x86_64'}

    sources = []
    for arch in ARCHES:
        url = (
            f'https://github.com/protocolbuffers/protobuf/releases/download/v{version}/'
            f'protoc-{version}-linux-{protoc_arches[arch]}.zip'
        )
        sources.append(
            {
                'type': 'archive',
                'url': url,
                'sha256': hashlib.sha256(fetch(url)).hexdigest(),
                'dest': 'protoc',
                'strip-components': 0,
                'only-arches': [arch],
            }
        )
    return sources

def pnpm_sources() -> list[Source]:
    package_manager = json.loads((MONOREPO_ROOT / 'package.json').read_text())['packageManager']
    # Format: `pnpm@<version>`, optionally followed by `+<hash>`.
    name, _, version = package_manager.partition('+')[0].partition('@')
    if name != 'pnpm' or version == '':
        raise ValueError(f'Unexpected packageManager: {package_manager}')
    print(f'pnpm: {version}')

    dist = json.loads(fetch(f'https://registry.npmjs.org/pnpm/{version}'))['dist']
    algorithm, _, digest = dist['integrity'].partition('-')
    if algorithm != 'sha512':
        raise ValueError(f'Unexpected integrity algorithm for pnpm: {algorithm}')
    return [
        {
            'type': 'archive',
            'url': dist['tarball'],
            'sha512': base64.b64decode(digest).hex(),
            'dest': 'pnpm',
        },
        {
            'type': 'shell',
            'commands': ['chmod +x pnpm.mjs', 'ln -s pnpm.mjs pnpm'],
            'dest': 'pnpm/bin',
        },
    ]

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('-o', '--output', required=True, type=Path, help='output JSON file')
    args = parser.parse_args()

    sources = [
        *rust_sources(),
        *wasm_bindgen_sources(),
        *binaryen_sources(),
        *protoc_sources(),
        *pnpm_sources(),
    ]
    with args.output.open('w') as file:
        json.dump(sources, file, indent=2)
        file.write('\n')
    print(f'Wrote {len(sources)} sources to {args.output}')

if __name__ == '__main__':
    main()
