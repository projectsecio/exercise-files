#!/usr/bin/env bash
# Configure a clone of [project-x-linux-client] as the corporate server or the
# security server. Safe to run more than once: hostnames, addresses, and
# accounts are set to the project overview values, not toggled.
#
# Run on the cloned Ubuntu desktop, as root:
#   sudo ./setup-ubuntu-role.sh corp-svr --join
#   sudo ./setup-ubuntu-role.sh sec-box --join
#
# Lab defaults (override with the environment variables below):
#   account password   LAB_USER_PASSWORD    @password123!
#   domain password    LAB_DOMAIN_PASSWORD  prompt, or pass --domain-password

set -euo pipefail

GATEWAY="10.0.0.1"
DNS="10.0.0.5"
PREFIX="24"
DOMAIN="corp.project-x-dc.com"
REALM="CORP.PROJECT-X-DC.COM"
SOURCE_USER="janed"
CONNECTION="Linux AD"
WORKSTATION_ADDRESS="10.0.0.101/${PREFIX}"
USER_PASSWORD="${LAB_USER_PASSWORD:-@password123!}"

ROLE=""
DO_JOIN=0
REMOVE_SOURCE=0
DOMAIN_PASSWORD="${LAB_DOMAIN_PASSWORD:-}"

usage() {
  cat <<'EOF'
Usage: sudo ./setup-ubuntu-role.sh <corp-svr|sec-box> [options]

Options:
  --join                 Join corp.project-x-dc.com as this hostname
  --domain-password PWD  Administrator password (otherwise prompt)
  --remove-source-user   Delete the cloned janed account
  -h, --help             Show this help

corp-svr  hostname corp-svr   10.0.0.8    user project-x-admin   Docker
sec-box   hostname sec-box    10.0.0.10   user sec-user
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    corp-svr|sec-box)
      ROLE="$1"
      shift
      ;;
    --join)
      DO_JOIN=1
      shift
      ;;
    --domain-password)
      [[ $# -ge 2 ]] || die "--domain-password needs a value"
      DOMAIN_PASSWORD="$2"
      shift 2
      ;;
    --remove-source-user)
      REMOVE_SOURCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
done

[[ -n "$ROLE" ]] || { usage >&2; die "choose corp-svr or sec-box"; }
[[ "$(id -u)" -eq 0 ]] || die "run with sudo"

case "$ROLE" in
  corp-svr)
    HOSTNAME_VALUE="corp-svr"
    ADDRESS="10.0.0.8"
    ROLE_USER="project-x-admin"
    INSTALL_DOCKER=1
    ;;
  sec-box)
    HOSTNAME_VALUE="sec-box"
    ADDRESS="10.0.0.10"
    ROLE_USER="sec-user"
    INSTALL_DOCKER=0
    ;;
esac

log() {
  echo "==> $*"
}

set_hostname() {
  log "hostname ${HOSTNAME_VALUE}"
  hostnamectl set-hostname "$HOSTNAME_VALUE"
  if grep -q '^127\.0\.1\.1[[:space:]]' /etc/hosts; then
    sed -i "s/^127\\.0\\.1\\.1[[:space:]].*/127.0.1.1 ${HOSTNAME_VALUE}/" /etc/hosts
  else
    echo "127.0.1.1 ${HOSTNAME_VALUE}" >> /etc/hosts
  fi
}

ethernet_device() {
  nmcli -t -f DEVICE,TYPE device status | awk -F: '$2=="ethernet" && $1!=""{print $1; exit}'
}

ensure_connection() {
  if nmcli -t -f NAME connection show | grep -qx "$CONNECTION"; then
    return 0
  fi
  local dev
  dev="$(ethernet_device)"
  [[ -n "$dev" ]] || die "no ethernet device for ${CONNECTION}"
  log "creating ${CONNECTION} on ${dev}"
  nmcli connection add type ethernet ifname "$dev" con-name "$CONNECTION" \
    ipv4.method manual \
    ipv4.addresses "${ADDRESS}/${PREFIX}" \
    ipv4.gateway "$GATEWAY" \
    ipv4.dns "$DNS" >/dev/null
}

configure_network() {
  ensure_connection
  log "address ${ADDRESS}/${PREFIX} on ${CONNECTION}"
  # Drop the workstation address this clone inherited.
  nmcli connection modify "$CONNECTION" -ipv4.addresses "$WORKSTATION_ADDRESS" >/dev/null 2>&1 || true
  nmcli connection modify "$CONNECTION" \
    ipv4.method manual \
    ipv4.addresses "${ADDRESS}/${PREFIX}" \
    ipv4.gateway "$GATEWAY" \
    ipv4.dns "$DNS" \
    ipv4.dns-search "$DOMAIN" \
    ipv4.ignore-auto-dns yes \
    connection.autoconnect yes
  # A new clone gets a new MAC. A profile pinned to the workstation MAC stays down
  # and DHCP takes the interface instead.
  nmcli connection modify "$CONNECTION" 802-3-ethernet.mac-address "" >/dev/null 2>&1 || true

  local name type
  while IFS=: read -r name type; do
    [[ "$type" == "802-3-ethernet" ]] || continue
    [[ "$name" == "$CONNECTION" ]] && continue
    nmcli connection modify "$name" connection.autoconnect no >/dev/null
  done < <(nmcli -t -f NAME,TYPE connection show)

  nmcli connection up "$CONNECTION" >/dev/null
  ip -4 -o addr show | grep -q "${ADDRESS}/" || die "address ${ADDRESS} did not come up"
}

ensure_user() {
  if ! id "$ROLE_USER" >/dev/null 2>&1; then
    log "creating ${ROLE_USER}"
    useradd -m -s /bin/bash "$ROLE_USER"
  else
    log "account ${ROLE_USER} already exists"
  fi
  printf '%s:%s\n' "$ROLE_USER" "$USER_PASSWORD" | chpasswd
  usermod -aG sudo "$ROLE_USER"
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker is already installed"
  else
    log "installing Docker"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    # shellcheck disable=SC1091
    . /etc/os-release
    local suite arch
    suite="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
    arch="$(dpkg --print-architecture)"
    cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${suite}
Components: stable
Architectures: ${arch}
Signed-By: /etc/apt/keyrings/docker.asc
EOF
    if ! apt-get update || ! apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin; then
      log "Docker's apt repo has no ${suite} build. Installing Ubuntu's docker.io."
      rm -f /etc/apt/sources.list.d/docker.sources
      apt-get update
      apt-get install -y docker.io
    fi
  fi
  systemctl enable --now docker
  if docker pull hello-world && docker run --rm hello-world >/dev/null; then
    log "hello-world ran"
  else
    echo "warning: Docker is installed, but hello-world did not run. Check outbound internet." >&2
  fi
}

joined_as_this_host() {
  local acct
  acct="$(net ads status -P 2>/dev/null | sed -n 's/^User name:[[:space:]]*//p' | tr -d '[:space:]$' | tr '[:upper:]' '[:lower:]')"
  [[ -n "$acct" && "$acct" == "$(hostname -s | tr '[:upper:]' '[:lower:]')" ]]
}

join_domain() {
  if joined_as_this_host && net ads testjoin >/dev/null 2>&1; then
    log "already joined to ${DOMAIN} as ${HOSTNAME_VALUE}"
    return 0
  fi
  command -v net >/dev/null 2>&1 || die "samba/winbind is not installed. Join the workstation to the domain before cloning."
  if [[ -z "$DOMAIN_PASSWORD" ]]; then
    [[ -t 0 ]] || die "pass --domain-password or set LAB_DOMAIN_PASSWORD"
    read -rsp "Administrator password for ${REALM}: " DOMAIN_PASSWORD
    echo
  fi
  log "joining ${DOMAIN}"
  local err rc
  err="$(mktemp)"
  # Prefer kinit so the password is not visible in the process list.
  # Older kinit builds have no --password-file; fall back to net ads join.
  if printf '%s\n' "$DOMAIN_PASSWORD" | kinit --password-file=STDIN "Administrator@${REALM}" 2>"$err"; then
    rm -f "$err"
    if ! net ads join -k; then
      kdestroy >/dev/null 2>&1 || true
      return 1
    fi
    kdestroy >/dev/null 2>&1 || true
  elif grep -q -- '--password-file' "$err"; then
    rm -f "$err"
    net ads join -U "Administrator%${DOMAIN_PASSWORD}"
    rc=$?
    [[ "$rc" -eq 0 ]] || return "$rc"
  else
    cat "$err" >&2
    rm -f "$err"
    echo "error: domain logon failed. Confirm the Administrator password on the domain controller." >&2
    return 1
  fi
  systemctl restart winbind
  net ads testjoin
}

remove_source_user() {
  if ! id "$SOURCE_USER" >/dev/null 2>&1; then
    return 0
  fi
  if [[ "${SUDO_USER:-}" == "$SOURCE_USER" ]]; then
    echo "Still logged in as ${SOURCE_USER}. Log in as ${ROLE_USER}, then re-run with --remove-source-user."
    return 0
  fi
  log "removing ${SOURCE_USER}"
  userdel -r "$SOURCE_USER" 2>/dev/null || userdel "$SOURCE_USER"
}

set_hostname
configure_network
ensure_user
if [[ "$INSTALL_DOCKER" -eq 1 ]]; then
  install_docker
fi

join_status="skipped"
if [[ "$DO_JOIN" -eq 1 ]]; then
  if join_domain; then
    join_status="joined"
  else
    join_status="failed"
  fi
fi

if [[ "$REMOVE_SOURCE" -eq 1 ]]; then
  remove_source_user
fi

echo
echo "Role:      ${ROLE}"
echo "Hostname:  $(hostnamectl --static)"
echo "Address:   ${ADDRESS}/${PREFIX}"
echo "Account:   ${ROLE_USER}"
echo "Domain:    ${join_status}"

if [[ "$join_status" == "failed" ]]; then
  exit 1
fi
