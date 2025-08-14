# Pull Ubuntu 22.04 Base
FROM ubuntu:22.04

# Install BIND9 and utilities
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y bind9 bind9utils bind9-doc dnsutils net-tools nano iputils-ping openssh-server && \
    apt-get clean

# Create necessary directories for zone files
RUN mkdir -p /etc/bind/zones

# Ensure configuration files are created
RUN test -f /etc/bind/named.conf || cp /usr/share/doc/bind9/examples/named.conf /etc/bind/named.conf && \
    test -f /etc/bind/named.conf.options || cp /usr/share/doc/bind9/examples/named.conf.options /etc/bind/named.conf.options && \
    test -f /etc/bind/named.conf.local || cp /usr/share/doc/bind9/examples/named.conf.local /etc/bind/named.conf.local

# Default command
CMD ["/bin/bash"]
