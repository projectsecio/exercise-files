FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install BIND9 and utilities
RUN apt-get update && \
    apt-get install -y bind9 bind9utils bind9-doc dnsutils net-tools nano iputils-ping openssh-server && \
    apt-get clean

# Create directories for zone files
RUN mkdir -p /etc/bind/zones

# Run named in the foreground so the container stays alive
CMD ["named", "-g", "-c", "/etc/bind/named.conf"]
