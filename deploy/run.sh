#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
revision=${1:?Usage: bash deploy/run.sh COMMIT_SHA}
[[ $revision =~ ^[a-f0-9]{40}$ && $(git rev-parse HEAD) == "$revision" ]] || { echo 'Invalid deployment SHA' >&2; exit 1; }
[[ $(id -u) != 0 ]] || { echo 'Use a non-root runner user with Docker access.' >&2; exit 1; }
root=/opt/support-bot
[[ ! -L $root && ! -L $root/logs && ! -L $root/source ]] || { echo 'Unexpected installation symlink' >&2; exit 1; }
for variable in DISCORD_TOKEN ENCRYPTION_KEY DB_HOST DB_USER DB_NAME; do
  [[ -n ${!variable:-} ]] || { echo "Missing GitHub secret: $variable" >&2; exit 1; }
done
install -d -m 0750 "$root" "$root/logs" "$root/source" "$root/source/$revision"
[[ -w $root/logs ]] || { echo 'The runner user must own /opt/support-bot/logs.' >&2; exit 1; }
exec 9>"$root/.deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
temporary=$(mktemp "$root/.env-XXXXXXXX")
trap 'rm -f "$temporary"' EXIT
for variable in DISCORD_TOKEN ENCRYPTION_KEY DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME LOG_LEVEL; do
  value=${!variable:-}
  if [[ $value == *$'\n'* || $value == *$'\r'* ]]; then
    echo "Secret $variable must be a single-line value." >&2; exit 1
  fi
  [[ $variable != DB_PORT || -n $value ]] || value=3306
  [[ $variable != LOG_LEVEL || -n $value ]] || value=info
  printf '%s=%s\n' "$variable" "$value" >> "$temporary"
done
chmod 0600 "$temporary"
git archive "$revision" | tar -x -C "$root/source/$revision"
mv -f "$temporary" "$root/.env"
ln -s "$root/source/$revision" "$root/.current-$$"
mv -Tf "$root/.current-$$" "$root/current"
if docker container inspect support-bot >/dev/null 2>&1; then
  docker stop --time 30 support-bot
  docker rm support-bot
fi
docker run --detach --name support-bot --restart unless-stopped --init \
  --user "$(id -u):$(id -g)" --read-only --tmpfs /tmp:size=16m,mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true --memory 512m \
  --network "${DOCKER_NETWORK:-bridge}" --add-host host.docker.internal:host-gateway \
  --env-file "$root/.env" --env LOG_DIR=/app/logs \
  --mount "type=bind,source=$root/logs,target=/app/logs" \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=5 \
  "support-bot:$revision"
echo "Container started: support-bot:$revision"
