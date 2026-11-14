# Full-clone [project-x-linux-client] into the corporate server or security
# server VM. The clone gets a new MAC, so it does not collide with the
# workstation on project-x-network. The source VM must be powered off.
#
#   .\clone-ubuntu-role.ps1 -Role sec-box
#   .\clone-ubuntu-role.ps1 -Role corp-svr -Source "[project-x-linux-client-test]" -Name "[project-x-corp-svr-test]"
#
# Then, on the clone, run setup-ubuntu-role.sh.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("corp-svr", "sec-box")]
    [string]$Role,

    [string]$Source = "[project-x-linux-client]",

    [string]$Name,

    [string]$BaseFolder,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Fail {
    param([string]$Message)
    [Console]::Error.WriteLine("error: $Message")
    exit 1
}

if (-not $Name) {
    $Name = if ($Role -eq "corp-svr") { "[project-x-corp-svr]" } else { "[project-x-sec-box]" }
}

function Find-VBoxManage {
    $cmd = Get-Command VBoxManage -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidate = Join-Path ${env:ProgramFiles} "Oracle\VirtualBox\VBoxManage.exe"
    if (Test-Path $candidate) { return $candidate }
    throw "VBoxManage is not on PATH"
}

function Get-VBoxField {
    param([string]$Vm, [string]$Key)
    $lines = & $script:VBox showvminfo $Vm --machinereadable
    foreach ($line in $lines) {
        $line = $line.TrimEnd("`r")
        if ($line -match "^$([regex]::Escape($Key))=`"(.*)`"$") {
            return $Matches[1]
        }
    }
    return $null
}

$VBox = Find-VBoxManage
& $VBox showvminfo $Source | Out-Null

$state = Get-VBoxField -Vm $Source -Key "VMState"
if ($state -ne "poweroff" -and $state -ne "aborted") {
    Fail "$Source is $state. Power it off before cloning."
}

# A missing VM writes to stderr. That is the expected case, not a failure.
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $VBox showvminfo $Name 1>$null 2>$null
$alreadyExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $previousErrorAction
if ($alreadyExists) {
    Fail "$Name already exists. Pick another -Name, or delete that VM first."
}

if (-not $BaseFolder) {
    $cfg = Get-VBoxField -Vm $Source -Key "CfgFile"
    if (-not $cfg) { Fail "could not read the source VM folder" }
    $cfg = $cfg -replace '\\\\', '\'
    $BaseFolder = Split-Path -Parent (Split-Path -Parent $cfg)
}

$group = Get-VBoxField -Vm $Source -Key "groups"
if (-not $group) { $group = "/" }

Write-Output "Source:     $Source ($state)"
Write-Output "New VM:     $Name"
Write-Output "Folder:     $BaseFolder"
Write-Output "Group:      $group"
Write-Output "Clone:      full, new MAC address"

if ($DryRun) {
    Write-Output "Dry run. No VM was created."
    exit 0
}

& $VBox clonevm $Source --name $Name --basefolder $BaseFolder --groups $group --register --mode machine
if ($LASTEXITCODE -ne 0) { Fail "clone failed" }

Write-Output ""
Write-Output "Cloned $Name."
Write-Output "Power it on, log in as janed, and run:"
Write-Output "  sudo ./setup-ubuntu-role.sh $Role --join"
