#!/usr/bin/env bash
set -euo pipefail

# Important: Keep this script idempotent, as it runs on every launch of the devcontainer!

# Set to binaryen version used by `libthreema`.
_BINARYEN_VERSION="124"
_JJ_VERSION="0.44.0"
# Extract from `/code/package.json`.
_NODE_VERSION=$(jq -e -r '.engines.node' /code/package.json) || exit 2
_NVM_VERSION="0.40.3"
# Extract from `/code/package.json`.
_PNPM_VERSION=$(grep -oP '"packageManager":\s*"pnpm@\K[^"]+' /code/package.json) || exit 2
# Extract from `/code/packages/protocol/package.json`.
_PROTOC_VERSION=$(jq -e -r '.pins.protoc' /code/packages/protocol/package.json) || exit 2
# Extract from `/code/apps/desktop/src/launcher/rust-toolchain.toml` and
# `/code/packages/libthreema-wasm/libs/libthreema/rust-toolchain.toml`.
_RUST_VERSION=$(sed -n -E 's/^[[:space:]]*channel[[:space:]]*=[[:space:]]*"([^"]*)".*/\1/p' /code/apps/desktop/src/rust/launcher/rust-toolchain.toml) || exit 2
_RUST_VERSION_LIBTHREEMA=$(sed -n -E 's/^[[:space:]]*channel[[:space:]]*=[[:space:]]*"([^"]*)".*/\1/p' /code/packages/libthreema-wasm/libs/libthreema/rust-toolchain.toml) || exit 2
# Extract from `/code/packages/libthreema-wasm/libs/libthreema/lib/Cargo.toml`.
_WASM_BINDGEN_VERSION=$(sed -n -E 's/^[[:space:]]*wasm-bindgen[[:space:]]*=[^}]*version[[:space:]]*=[[:space:]]*"([^"]*)".*/\1/p' /code/packages/libthreema-wasm/libs/libthreema/lib/Cargo.toml) || exit 2

# Appends or replaces a marked block in the given file.
#
# Usage: `append_to_file_with_marker <path> <identifier> <content>`.
#
# - If a block with the given identifier already exists, its content is replaced.
# - If no such block exists, the block is appended to the end of the file.
append_to_file_with_marker() {
    local file="$1"
    local identifier="$2"
    local content="$3"
    local start_marker="# >>> ${identifier} >>>"
    local end_marker="# <<< ${identifier} <<<"

    local block
    block=$(printf '%s\n%s\n%s' "$start_marker" "$content" "$end_marker")

    if grep -qF "$start_marker" "$file" 2>/dev/null; then
        # Replace existing block (including markers) with the new block.
        local tmpfile
        tmpfile=$(mktemp)
        awk -v start="$start_marker" -v end="$end_marker" -v replacement="$block" '
        $0 == start { skip=1; printed=0 }
        skip && $0 == end { skip=0; if (!printed) { print replacement; printed=1 } next }
        !skip { print }
        ' "$file" > "$tmpfile"
        mv "$tmpfile" "$file"
    else
        # Append new block.
        printf '\n%s\n' "$block" >> "$file"
    fi
}

# Start the D-Bus session and system buses (addresses are set in `devcontainer.json`), unless they
# are already running. The session bus is required by Flatpak apps. The system bus doesn't provide
# any services (see `dbus-system.conf`).
if ! dbus-send --session --dest=org.freedesktop.DBus --print-reply /org/freedesktop/DBus \
    org.freedesktop.DBus.GetId &>/dev/null; then
    echo "Starting D-Bus session bus..."
    dbus-daemon --session --address="${DBUS_SESSION_BUS_ADDRESS}" --fork
fi
if ! dbus-send --system --dest=org.freedesktop.DBus --print-reply /org/freedesktop/DBus \
    org.freedesktop.DBus.GetId &>/dev/null; then
    echo "Starting D-Bus system bus..."
    dbus-daemon --config-file="$HOME/dbus-system.conf" --address="${DBUS_SYSTEM_BUS_ADDRESS}" --fork
fi

# Set up sway + VNC server if the host doesn't support Wayland.
if [ -f "/tmp/no-wayland" ]; then
    echo "Setting up compositor..."

    # Remove stale sway socket from previous session.
    rm -f /tmp/sway-ipc.sock
    export SWAYSOCK=/tmp/sway-ipc.sock

    # Start sway as a headless Wayland compositor (wayvnc is started by sway via config).
    nohup env \
        WAYLAND_DISPLAY="" \
        WLR_BACKENDS=headless \
        WLR_LIBINPUT_NO_DEVICES=1 \
        WLR_RENDERER=pixman \
        sway --config "$HOME/sway.conf" > /tmp/sway.log 2>&1 &

    # Wait for sway IPC socket to become responsive (not just for a file to exist).
    echo "Waiting for sway to be ready..."
    _SWAY_READY=false
    for _ in $(seq 1 60); do
        if swaymsg -t get_version &>/dev/null; then
            _SWAY_READY=true
            break
        fi

        sleep 0.25
    done

    if [ "$_SWAY_READY" != "true" ]; then
        echo "ERROR: sway failed to start. Check /tmp/sway.log"
        exit 1
    fi

    # Discover the Wayland display socket for environment export.
    _WAYLAND_DISPLAY=$(find /tmp -maxdepth 1 -name 'wayland-*' -type s -printf '%f\n' 2>/dev/null | head -1)
    if [ -z "$_WAYLAND_DISPLAY" ]; then
        echo "ERROR: Could not find Wayland display socket"
        exit 1
    fi

    export WAYLAND_DISPLAY=$_WAYLAND_DISPLAY
    export XDG_SESSION_TYPE="wayland"

    append_to_file_with_marker "$HOME/.bashrc" "entrypoint-display-config" "\
export WAYLAND_DISPLAY=\"${WAYLAND_DISPLAY}\"
export XDG_SESSION_TYPE=\"${XDG_SESSION_TYPE}\"
export SWAYSOCK=\"${SWAYSOCK}\""

    echo "Starting VNC server..."
    swaymsg exec "wayvnc --max-fps=24 0.0.0.0 ${VNC_PORT}"

    # Start noVNC (WebSocket proxy for browser access).
    nohup websockify --web /usr/share/novnc/ "${NOVNC_PORT}" "localhost:${VNC_PORT}" > /tmp/novnc.log 2>&1 &

    echo "Sway running on: ${WAYLAND_DISPLAY}"

# Otherwise, use Wayland socket provided by the host.
else
    echo "Using host Wayland socket"

    append_to_file_with_marker "$HOME/.bashrc" "entrypoint-display-config" "\
export XDG_SESSION_TYPE=\"wayland\""
fi

# Make the display available to services started by D-Bus.
dbus-update-activation-environment WAYLAND_DISPLAY XDG_SESSION_TYPE

# NVM
export NVM_DIR="$HOME/.nvm"

mkdir -p "$NVM_DIR"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "Installing NVM v${_NVM_VERSION}..."
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/v${_NVM_VERSION}/install.sh" | bash
fi
. "$NVM_DIR/nvm.sh" || true

# Node.js
nvm install "$_NODE_VERSION"
nvm use "$_NODE_VERSION"
nvm alias default "$_NODE_VERSION"

# Corepack & pnpm
export COREPACK_HOME="$HOME/.corepack"

mkdir -p "$COREPACK_HOME"
corepack enable pnpm
corepack install -g "pnpm@${_PNPM_VERSION}"

# Rust
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"
export PATH="$CARGO_HOME/bin:$PATH"

if ! command -v rustup &>/dev/null; then
  curl --proto '=https' --tlsv1.3 -sSf "https://sh.rustup.rs" \
  | sh -s -- --default-toolchain ${_RUST_VERSION} --component rust-src -y
  rustup toolchain install ${_RUST_VERSION_LIBTHREEMA} --component rust-src
else
  # Ensure the default toolchain is configured on every restart.
  rustup default ${_RUST_VERSION}
fi
rustup set auto-self-update disable
rustup set auto-install disable
rustup target add wasm32-unknown-unknown

# wasm-opt
export PATH="$HOME/.local/bin:$PATH"

_INSTALLED_BINARYEN_VERSION=$(wasm-opt --version 2>/dev/null | grep -oP '\d+' | head -1 || echo "none")
if [ "$_INSTALLED_BINARYEN_VERSION" != "$_BINARYEN_VERSION" ]; then
  echo "Installing wasm-opt ${_BINARYEN_VERSION}..."
  _ARCHIVE="binaryen-version_${_BINARYEN_VERSION}-$(uname -m)-linux.tar.gz"
  _TMPDIR=$(mktemp -d)
  curl --proto '=https' --tlsv1.3 -LSsf \
    "https://github.com/WebAssembly/binaryen/releases/download/version_${_BINARYEN_VERSION}/${_ARCHIVE}" \
    -o "${_TMPDIR}/${_ARCHIVE}"
  tar -zxf "${_TMPDIR}/${_ARCHIVE}" -C "$_TMPDIR"
  mkdir -p "$HOME/.local/bin"
  mv "${_TMPDIR}/binaryen-version_${_BINARYEN_VERSION}/bin/wasm-opt" "$HOME/.local/bin/"
  rm -rf "$_TMPDIR"
fi

# wasm-bindgen
_INSTALLED_WASM_BINDGEN_VERSION=$(wasm-bindgen --version 2>/dev/null | grep -oP '[\d.]+' || echo "none")
if [ "$_INSTALLED_WASM_BINDGEN_VERSION" != "$_WASM_BINDGEN_VERSION" ]; then
  echo "Installing wasm-bindgen-cli ${_WASM_BINDGEN_VERSION}..."
  cargo install --locked wasm-bindgen-cli --version "$_WASM_BINDGEN_VERSION"
fi

# protoc
_INSTALLED_PROTOC_VERSION=$(protoc --version 2>/dev/null | grep -oP '[\d.]+' || echo "none")
if [ "$_INSTALLED_PROTOC_VERSION" != "$_PROTOC_VERSION" ]; then
  echo "Installing protoc ${_PROTOC_VERSION}..."
  # `protoc` uses `aarch_64` (not `aarch64`) in its release asset names.
  case "$(uname -m)" in
    x86_64) _PROTOC_ARCH="x86_64" ;;
    aarch64) _PROTOC_ARCH="aarch_64" ;;
    *) echo "ERROR: unsupported architecture for protoc: $(uname -m)"; exit 1 ;;
  esac
  _ARCHIVE="protoc-${_PROTOC_VERSION}-linux-${_PROTOC_ARCH}.zip"
  _TMPDIR=$(mktemp -d)
  curl --proto '=https' --tlsv1.3 -LSsf \
    "https://github.com/protocolbuffers/protobuf/releases/download/v${_PROTOC_VERSION}/${_ARCHIVE}" \
    -o "${_TMPDIR}/${_ARCHIVE}"
  unzip -q "${_TMPDIR}/${_ARCHIVE}" -d "${_TMPDIR}/protoc"
  mkdir -p "$HOME/.local/bin"
  mv "${_TMPDIR}/protoc/bin/protoc" "$HOME/.local/bin/"
  rm -rf "$_TMPDIR"
fi

# Jujutsu (jj)
_INSTALLED_JJ_VERSION=$(jj --version 2>/dev/null | grep -oP '[\d.]+' | head -1 || echo "none")
if [ "$_INSTALLED_JJ_VERSION" != "$_JJ_VERSION" ]; then
  echo "Installing jj ${_JJ_VERSION}..."
  _ARCHIVE="jj-v${_JJ_VERSION}-$(uname -m)-unknown-linux-musl.tar.gz"
  _TMPDIR=$(mktemp -d)
  curl --proto '=https' --tlsv1.3 -LSsf \
    "https://github.com/jj-vcs/jj/releases/download/v${_JJ_VERSION}/${_ARCHIVE}" \
    -o "${_TMPDIR}/${_ARCHIVE}"
  tar -zxf "${_TMPDIR}/${_ARCHIVE}" -C "$_TMPDIR"
  mkdir -p "$HOME/.local/bin"
  mv "${_TMPDIR}/jj" "$HOME/.local/bin/"
  rm -rf "$_TMPDIR"
fi

# Update `.bashrc`
#
# Note: The NVM and rustup installers already update the `PATH`, so we don't need to add these
# explicitly.
append_to_file_with_marker "$HOME/.bashrc" "entrypoint-environment-config" "\
export COREPACK_HOME=\"${COREPACK_HOME}\"
export CARGO_HOME=\"${CARGO_HOME}\"
export RUSTUP_HOME=\"${RUSTUP_HOME}\"
export PATH=\"\$HOME/.local/bin:\$PATH\"
# Disable telemetry (Turborepo).
export DO_NOT_TRACK=1
# Disable Electron sandbox due to its issues in containers, and because we are running inside a
# container here anyway.
export ELECTRON_DISABLE_SANDBOX=1"

# Print summary
echo "Dev environment ready:"
echo "  Node.js:      $(node --version 2>/dev/null)"
echo "  NVM:          $(nvm --version 2>/dev/null)"
echo "  Jujutsu:      $(jj --version 2>/dev/null)"
echo "  pnpm:         $(pnpm --version 2>/dev/null)"
echo "  protoc:       $(protoc --version 2>/dev/null)"
echo "  Rust:         $(rustc --version 2>/dev/null)"
echo "  wasm-opt:     $(wasm-opt --version 2>/dev/null)"
echo "  wasm-bindgen: $(wasm-bindgen --version 2>/dev/null)"

if [ -f "/tmp/no-wayland" ]; then
    echo ""
    echo "VNC available at: http://localhost:${NOVNC_PORT}"
fi

# Hand off to the requested command
exec "$@"
