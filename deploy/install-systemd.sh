#!/usr/bin/env bash
set -Eeuo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run with sudo on the VPS.' >&2; exit 1; }
runner_user=${1:?Usage: sudo bash deploy/install-systemd.sh RUNNER_USER}
[[ $runner_user =~ ^[a-z_][a-z0-9_-]*\$?$ ]] || exit 1
id "$runner_user" >/dev/null
command -v docker >/dev/null
docker compose version
command -v visudo >/dev/null
install -d -m 0755 /opt/support-bot /opt/support-bot/releases
chown "$runner_user" /opt/support-bot /opt/support-bot/releases
install -d -m 0700 /etc/support-bot
if [[ ! -f /etc/support-bot/runtime.env ]]; then
  install -m 0600 .env.example /etc/support-bot/runtime.env
fi
install -m 0644 deploy/support-bot.service /etc/systemd/system/support-bot.service
install -m 0644 deploy/support-bot-backup.service deploy/support-bot-backup.timer /etc/systemd/system/
sudoers=$(mktemp)
trap 'rm -f "$sudoers"' EXIT
printf '%s ALL=(root) NOPASSWD: /usr/bin/systemctl start support-bot.service, /usr/bin/systemctl stop support-bot.service, /usr/bin/systemctl reset-failed support-bot.service\n' "$runner_user" > "$sudoers"
visudo -cf "$sudoers"
install -m 0440 "$sudoers" /etc/sudoers.d/support-bot-runner
usermod -aG docker "$runner_user"
systemctl daemon-reload
systemctl enable support-bot.service
echo 'Installed. Configure /etc/support-bot/runtime.env, then restart the runner session to apply docker group membership.'
