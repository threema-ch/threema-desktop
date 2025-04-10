ARG DEBIAN_VERSION
FROM debian:${DEBIAN_VERSION}

# Update apt cache
RUN apt-get update

# Install general dependencies
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    apt-utils \
    build-essential \
    ca-certificates \
    clang-format \
    curl \
    git \
    less \
    protobuf-compiler \
    python3 \
    python3-setuptools \
    tzdata \
    xz-utils

# Install general packaging dependencies
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    p7zip

# Install flatpak packaging dependencies
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    appstream-util \
    flatpak \
    flatpak-builder \
    python3-aiohttp \
    python3-toml

# Install asset generation dependencies
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    imagemagick \
    optipng

# Add user
ARG USER_UID=1000
ARG USER_GID=1000
ARG USER_NAME=threema
RUN groupadd -g $USER_GID -o $USER_NAME \
 && useradd -l -m -u $USER_UID -g $USER_GID -o -s /bin/bash $USER_NAME \
 && cp /etc/skel/.bashrc /home/$USER_NAME/.bashrc
USER threema

# Install required Node version
ARG NODE_VERSION
RUN mkdir /home/$USER_NAME/.node \
 && _node_arch=$(if [ "$(uname -m)" = "x86_64" ]; then echo "x64"; elif [ "$(uname -m)" = "aarch64" ]; then echo "arm64"; else uname -m; fi) \
 && curl -L https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-${_node_arch}.tar.xz | tar -C /home/$USER_NAME/.node -xJf - \
 && echo "" >> /home/$USER_NAME/.bashrc \
 && echo "# Threema Desktop" >> /home/$USER_NAME/.bashrc \
 && echo "export PATH=/home/$USER_NAME/.node/node-v$NODE_VERSION-linux-${_node_arch}/bin:${PATH}" >> /home/$USER_NAME/.bashrc \
 && echo "update-notifier=false" >> /home/$USER_NAME/.npmrc

# Install Rust
ARG RUST_VERSION
RUN curl --proto '=https' --tlsv1.3 -sSf "https://sh.rustup.rs" \
  | sh -s -- --default-toolchain ${RUST_VERSION} --component rust-src -y
ENV PATH="/home/${USER_NAME}/.cargo/bin:${PATH}"

# Entrypoint
CMD /bin/bash
