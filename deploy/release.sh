#!/usr/bin/env bash
set -Eeuo pipefail
revision=${1:?Usage: bash deploy/release.sh COMMIT_SHA}
[[ $revision =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid commit SHA' >&2; exit 1; }
[[ $(git rev-parse HEAD) == "$revision" ]] || { echo 'Checkout differs from deployment SHA' >&2; exit 1; }
root=/opt/support-bot
[[ -d $root/releases && ! -L $root && ! -L $root/releases ]] || { echo 'Run install-systemd.sh first' >&2; exit 1; }
exec 9>"$root/.deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
release="$root/releases/$revision"
previous=''
if [[ -L $root/current ]]; then
  previous=$(readlink -f "$root/current")
  [[ $previous == "$root/releases/"* ]] || { echo 'Invalid previous release path' >&2; exit 1; }
elif [[ -e $root/current ]]; then
  echo 'current must be a release symlink' >&2; exit 1
fi
docker build --pull --build-arg "REVISION=$revision" --tag "support-bot:$revision" .
mkdir -p "$release"
[[ ! -L $release ]] || exit 1
install -m 0644 compose.yml compose.mysql.yml discordbot.sql "$release/"
install -m 0755 deploy/backup.sh "$release/backup.sh"
printf 'SUPPORT_BOT_IMAGE=support-bot:%s\n' "$revision" > "$release/image.env"

activate() {
  local target=$1
  ln -s "$target" "$root/.current-$$"
  mv -Tf "$root/.current-$$" "$root/current"
}
healthy() {
  local container status
  for ((attempt=0;attempt<36;attempt++)); do
    container=$(docker ps -aq --filter label=com.docker.compose.project=support-bot --filter label=com.docker.compose.service=bot | head -n 1)
    if [[ -n $container ]]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container" 2>/dev/null || true)
      if [[ $status == healthy ]]; then return 0; fi
    fi
    sleep 5
  done
  return 1
}
diagnostics() {
  local container
  container=$(docker ps -aq --filter label=com.docker.compose.project=support-bot --filter label=com.docker.compose.service=bot | head -n 1)
  [[ -z $container ]] || docker logs --tail 100 "$container" >&2 || true
  systemctl --no-pager --full status support-bot.service >&2 || true
}
changed=false
rollback() {
  local status=${1:-$?}
  trap - ERR INT TERM
  diagnostics
  if [[ $changed == true ]]; then
    sudo -n /usr/bin/systemctl stop support-bot.service || true
    if [[ -n $previous && $previous != "$release" ]]; then
      activate "$previous"
      sudo -n /usr/bin/systemctl reset-failed support-bot.service || true
      if sudo -n /usr/bin/systemctl start support-bot.service && healthy; then
        echo 'Previous release restored.' >&2
      else
        echo 'Rollback also failed; inspect systemd and Docker logs.' >&2
      fi
    fi
  fi
  exit "${status:-1}"
}
trap rollback ERR
trap 'rollback 130' INT
trap 'rollback 143' TERM
sudo -n /usr/bin/systemctl stop support-bot.service
changed=true
activate "$release"
sudo -n /usr/bin/systemctl reset-failed support-bot.service
sudo -n /usr/bin/systemctl start support-bot.service
healthy
trap - ERR INT TERM
echo "Healthy deployment: $revision"
