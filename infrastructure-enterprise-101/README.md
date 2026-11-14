# Enterprise 101 role clones

`[project-x-corp-svr]` and `[project-x-sec-box]` are full clones of `[project-x-linux-client]`. These scripts set the hostname, address, and account from the project overview, so each student VM matches.

| Role | VM | Hostname | Address | Account | Extra |
| --- | --- | --- | --- | --- | --- |
| `corp-svr` | `[project-x-corp-svr]` | `corp-svr` | `10.0.0.8/24` | `project-x-admin` | Docker |
| `sec-box` | `[project-x-sec-box]` | `sec-box` | `10.0.0.10/24` | `sec-user` | |

Account password defaults to `@password123!`. Override it with `LAB_USER_PASSWORD`.

The domain controller at `10.0.0.5` has to be running before `--join`. The script asks for the Administrator password. Set `LAB_DOMAIN_PASSWORD` to skip the prompt.

## Host

Power off `[project-x-linux-client]`, then name the clone `[project-x-sec-box]`:

```powershell
.\clone-ubuntu-role.ps1 -Role sec-box -Name "[project-x-sec-box]"
```

```bash
./clone-ubuntu-role.sh --role sec-box --name "[project-x-sec-box]"
```

`.\clone-ubuntu-role.ps1 -Help` and `./clone-ubuntu-role.sh --help` print both roles. The clone is placed beside the workstation, so the folder follows whatever machine you are on. Add `-DryRun` or `--dry-run` to print the plan.

## Guest

Log in as `janed` on the clone and run:

```bash
sudo ./setup-ubuntu-role.sh sec-box --join
```

Use `corp-svr` for the corporate server. Running it again puts the VM back to these values.

The script deletes the cloned `janed` account after `sec-user` or `project-x-admin` exists. Log in as that account next. The desktop session you started as `janed` ends when the delete finishes.
