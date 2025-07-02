FROM ubuntu:18.04

# Avoid interactive prompts during package install
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary dependencies for vsftpd build & debug
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    wget \
    nano \
    curl \
    netcat \
    xinetd \
    gcc \
    make \
    libpam0g-dev \
    libssl-dev \
    iputils-ping \
    iproute2 \
    tcpdump \
    iptables \
    vim \
    strace \
    lsof

# Create a working directory
WORKDIR /workspace

# Open port 21 for FTP and 6200 - will be used for exploit.
EXPOSE 21 6200

# Default to an interactive shell
CMD ["/bin/bash"]
