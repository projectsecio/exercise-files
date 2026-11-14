# Enterprise 101 role clones

`[project-x-corp-svr]` and `[project-x-sec-box]` are full clones of `[project-x-linux-client]`. These scripts set the hostname, address, and account from the project overview, so each student VM matches.

| Role | VM | Hostname | Address | Account | Extra |
| --- | --- | --- | --- | --- | --- |
| `corp-svr` | `[project-x-corp-svr]` | `corp-svr` | `10.0.0.8/24` | `project-x-admin` | Docker |
| `sec-box` | `[project-x-sec-box]` | `sec-box` | `10.0.0.10/24` | `sec-user` | |

Account password defaults to `@password123!`. Override it with `LAB_USER_PASSWORD`.

The domain controller at `10.0.0.5` has to be running before `--join`. The script asks for the Administrator password. Set `LAB_DOMAIN_PASSWORD` to skip the prompt.

## Host

Power off the workstation, then:

```powershell
.\clone-ubuntu-role.ps1 -Role sec-box
```

From WSL or Linux, `./clone-ubuntu-role.sh --role sec-box` does the same clone. Add `-DryRun` or `--dry-run` to print the plan.

## Guest

Log in as `janed` on the clone and run:

```bash
sudo ./setup-ubuntu-role.sh sec-box --join
```

Use `corp-svr` for the corporate server. Running it again puts the VM back to these values.

After the corporate server joins the domain, log in as `project-x-admin` and remove the cloned workstation account:

```bash
sudo ./setup-ubuntu-role.sh corp-svr --remove-source-user
```
