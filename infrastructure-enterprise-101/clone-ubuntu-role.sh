#!/usr/bin/env bash
# Full-clone [project-x-linux-client] into the corporate server or security
# server VM. The clone gets a new MAC, so it does not collide with the
# workstation on project-x-network. The source VM must be powered off.
#
#   ./clone-ubuntu-role.sh --role sec-box --name "[project-x-sec-box]"
#   ./clone-ubuntu-role.sh --role corp-svr --name "[project-x-corp-svr]"
#   ./clone-ubuntu-role.sh --help
#
# Then, on the clone, run setup-ubuntu-role.sh.

set -euo pipefail

ROLE=""
SOURCE="[project-x-linux-client]"
NAME=""
BASEFOLDER=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./clone-ubuntu-role.sh --role <corp-svr|sec-box> [options]
       .\clone-ubuntu-role.ps1 -Role <corp-svr|sec-box> [options]

Clone [project-x-linux-client] into a corporate server or security server.
The source virtual machine must be powered off. The clone gets a new MAC
address and is placed beside the source VM, in whatever folder that VM uses.

Security server, named [project-x-sec-box]:
  ./clone-ubuntu-role.sh --role sec-box --name "[project-x-sec-box]"
  .\clone-ubuntu-role.ps1 -Role sec-box -Name "[project-x-sec-box]"

Corporate server, named [project-x-corp-svr]:
  ./clone-ubuntu-role.sh --role corp-svr --name "[project-x-corp-svr]"
  .\clone-ubuntu-role.ps1 -Role corp-svr -Name "[project-x-corp-svr]"

Options:
  --role ROLE        corp-svr or sec-box
  --source NAME      Workstation to clone. Default: [project-x-linux-client]
  --name NAME        New VM name. Default: [project-x-corp-svr] or [project-x-sec-box]
  --basefolder PATH  Directory that will contain the new VM folder
  --dry-run          Print the plan and stop
  -h, --help         Show this help
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role)
      [[ $# -ge 2 ]] || die "--role needs corp-svr or sec-box"
      ROLE="$2"
      shift 2
      ;;
    --source)
      [[ $# -ge 2 ]] || die "--source needs a VM name"
      SOURCE="$2"
      shift 2
      ;;
    --name)
      [[ $# -ge 2 ]] || die "--name needs a VM name"
      NAME="$2"
      shift 2
      ;;
    --basefolder)
      [[ $# -ge 2 ]] || die "--basefolder needs a path"
      BASEFOLDER="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
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

case "$ROLE" in
  corp-svr)
    [[ -n "$NAME" ]] || NAME="[project-x-corp-svr]"
    GUEST_ROLE="corp-svr"
    ;;
  sec-box)
    [[ -n "$NAME" ]] || NAME="[project-x-sec-box]"
    GUEST_ROLE="sec-box"
    ;;
  *)
    usage >&2
    die "choose --role corp-svr or --role sec-box"
    ;;
esac

find_vboxmanage() {
  if command -v VBoxManage >/dev/null 2>&1; then
    command -v VBoxManage
    return
  fi
  local win="/mnt/c/Program Files/Oracle/VirtualBox/VBoxManage.exe"
  if [[ -x "$win" ]]; then
    printf '%s\n' "$win"
    return
  fi
  die "VBoxManage is not on PATH"
}

vbox_field() {
  local vm="$1" key="$2"
  # VBoxManage.exe ends lines with CR. Strip it or the match fails.
  "$VBOX" showvminfo "$vm" --machinereadable | tr -d '\r' | sed -n "s/^${key}=\"\\(.*\\)\"$/\\1/p" | head -n 1
}

parent_of_vm() {
  # CfgFile points at the .vbox. The clone should sit beside that VM folder.
  local cfg="$1"
  cfg="${cfg//\\\\/\\}"
  cfg="${cfg//\\//}"
  local vm_dir base
  vm_dir="$(dirname "$cfg")"
  base="$(dirname "$vm_dir")"
  if [[ "$base" =~ ^[A-Za-z]:/ ]]; then
    base="${base//\//\\}"
  fi
  printf '%s\n' "$base"
}

VBOX="$(find_vboxmanage)"

"$VBOX" showvminfo "$SOURCE" >/dev/null

state="$(vbox_field "$SOURCE" VMState)"
[[ "$state" == "poweroff" || "$state" == "aborted" ]] || die "${SOURCE} is ${state}. Power it off before cloning."

if "$VBOX" showvminfo "$NAME" >/dev/null 2>&1; then
  die "${NAME} already exists. Pick another --name, or delete that VM first."
fi

if [[ -z "$BASEFOLDER" ]]; then
  cfg="$(vbox_field "$SOURCE" CfgFile)"
  [[ -n "$cfg" ]] || die "could not read the source VM folder"
  BASEFOLDER="$(parent_of_vm "$cfg")"
fi

group="$(vbox_field "$SOURCE" groups)"
group="${group:-/}"

echo "Source:     ${SOURCE} (${state})"
echo "New VM:     ${NAME}"
echo "Folder:     ${BASEFOLDER}"
echo "Group:      ${group}"
echo "Clone:      full, new MAC address"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run. No VM was created."
  exit 0
fi

"$VBOX" clonevm "$SOURCE" \
  --name "$NAME" \
  --basefolder "$BASEFOLDER" \
  --groups "$group" \
  --register \
  --mode machine

echo
echo "Cloned ${NAME}."
echo "Power it on, log in as janed, and run:"
echo "  sudo ./setup-ubuntu-role.sh ${GUEST_ROLE} --join"
