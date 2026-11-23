ARG DEBIAN_VERSION
FROM docker.io/debian:${DEBIAN_VERSION}

# Install development dependencies.
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get -y install --no-install-recommends \
    # General dependencies.
    build-essential \
    ca-certificates \
    curl \
    file \
    git \
    jq \
    less \
    libegl1 \
    libgl1 \
    libwayland-client0 \
    libwayland-cursor0 \
    libwayland-egl1 \
    libxkbcommon0 \
    locales \
    musl-tools \
    net-tools \
    pkg-config \
    procps \
    python3 \
    python3-setuptools \
    ripgrep \
    unzip \
    wget \
    # Claude Code sandboxing.
    bubblewrap \
    socat \
    # Flatpak packaging tools and dependencies.
    elfutils \
    flatpak \
    flatpak-builder \
    librsvg2-common \
    python3-aiohttp \
    python3-tomlkit \
    python3-yaml \
    # Browsers for Karma tests.
    chromium \
    firefox-esr \
    # Dependencies for Playwright (alternative to `npx playwright install-deps`, see
    # https://github.com/microsoft/playwright/issues/12227).
    fonts-freefont-ttf \
    fonts-ipafont-gothic \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-tlwg-loma-otf \
    fonts-unifont \
    fonts-wqy-zenhei \
    libasound2 \
    libasound2t64 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libcairo-gobject2 \
    libcairo2 \
    libcups2t64 \
    libdbus-1-3 \
    libdbus-glib-1-2 \
    libdrm2 \
    libfontconfig1 \
    libfreetype6 \
    libgbm1 \
    libgdk-pixbuf-2.0-0 \
    libglib2.0-0t64 \
    libgtk-3-0t64 \
    libharfbuzz0b \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb-shm0 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    xfonts-scalable \
    xvfb \
    # Headless Wayland VNC for non-Wayland hosts (macOS etc.).
    novnc \
    sway \
    sway-backgrounds \
    swaybg \
    wayvnc \
    websockify \
    # Useful tools.
    shellcheck \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Locale setup.
RUN echo 'en_US.UTF-8 UTF-8' > /etc/locale.gen \
 && locale-gen en_US.UTF-8 \
 && update-locale LANG=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Set browser paths for Karma tests.
ENV CHROMIUM_BIN=/usr/bin/chromium
ENV FIREFOX_BIN=/usr/bin/firefox-esr

# noVNC: Serve `vnc.html` by default.
RUN ln -sf /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# noVNC: Set sensible defaults.
RUN set -eux; \
  cat > /usr/share/novnc/defaults.json <<'JSON'
{
  "autoconnect": true,
  "reconnect": true,
  "resize": "remote"
}
JSON

# Create non-root user.
ARG USER_UID=1000
ARG USER_GID=1000
ARG USER_NAME=node
RUN groupadd --gid $USER_GID $USER_NAME \
  && useradd --uid $USER_UID --gid $USER_NAME --shell /bin/bash --create-home $USER_NAME

# Create directories with user ownership.
#
# Note: VS Code Dev Containers will automatically adjust UID/GID via `updateRemoteUserUID`.
RUN mkdir -p /code && chown node:node /code

# Copy scripts & configs.
COPY --chown=node:node start.sh /home/node/start.sh
RUN chmod +x /home/node/start.sh
COPY --chown=node:node sway.conf /home/node/sway.conf

# Make Flatpak and `flatpak-builder` work without granting the container additional privileges.
COPY flatpak-bwrap /usr/local/libexec/flatpak-bwrap
RUN chmod 755 /usr/local/libexec/flatpak-bwrap
# Wraps bubblewrap to work around the masked `/proc` (see `flatpak-bwrap`).
ENV FLATPAK_BWRAP=/usr/local/libexec/flatpak-bwrap
# Skips Flatpak's parental controls check, which otherwise fails because the container has no D-Bus
# system bus.
ENV FLATPAK_SYSTEM_HELPER_ON_SESSION=1

# Switch to non-root user.
USER node

# Create persistent config directory with default ownership.
RUN mkdir -p ~/.config-persistent/

# Create Claude Code directories with default ownership.
# Note: ~/.config/claude is where CLAUDE_CONFIG_DIR points; creating it here ensures the named
# volume mounted at that path is initialized with node ownership (not root), so Claude Code can
# freely create subdirectories.
RUN mkdir -p ~/.config/claude/

ENTRYPOINT ["/bin/bash"]
