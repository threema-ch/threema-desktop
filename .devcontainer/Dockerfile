FROM ubuntu:23.04

# Update apt cache
RUN apt-get update

# Install dependencies
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    apt-utils \
    build-essential \
    ca-certificates \
    curl \
    git \
    less \
    mesa-utils \
    p7zip \
    protobuf-compiler \
    python3 \
    python3-setuptools \
    tzdata \
    x11-xserver-utils \
    xz-utils

# Install Electron dependencies
#
# Extracted from
# https://github.com/electron-userland/electron-installer-debian/blob/main/src/dependencies.js
# https://github.com/electron-userland/electron-installer-common/blob/master/src/dependencies.js
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  libgtk-3-0 \
  libnotify4 \
  libnss3 \
  xdg-utils \
  libatspi2.0-0 \
  libdrm2 \
  libgbm1 \
  libglib2.0-bin \
  libxcb-dri3-0 \
  libasound2
# gvfs-bin \
# kde-cli-tools \
# kde-runtime \
# trash-cli \
# gir1.2-gnomekeyring-1.0 \
# libgnome-keyring0 \
# lsb-release

# Add user
ARG UID=1000
ARG GID=1000
ARG USERNAME=threema
RUN userdel -r ubuntu # Remove default user
RUN groupadd -g $GID -o $USERNAME && \
    useradd -l -m -u $UID -g $GID -o -s /bin/bash $USERNAME && \
    cp /etc/skel/.bashrc /home/$USERNAME/.bashrc

# Install required Node version
ARG NODE_VERSION
RUN mkdir /home/$USERNAME/.node && \
    curl -L https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz | tar -C /home/$USERNAME/.node -xJf - && \
    echo "" >> /home/$USERNAME/.bashrc && \
    echo "# Threema Desktop" >> /home/$USERNAME/.bashrc && \
    echo "export PATH=/home/$USERNAME/.node/node-v$NODE_VERSION-linux-x64/bin:${PATH}" >> /home/$USERNAME/.bashrc
RUN echo "update-notifier=false" >> /home/$USERNAME/.npmrc

# Entrypoint
CMD /bin/bash
