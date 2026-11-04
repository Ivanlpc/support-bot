#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
directory=/var/backups/support-bot
[[ ! -L $directory ]] || { echo 'Backup directory must not be a symlink' >&2; exit 1; }
install -d -m 0700 "$directory"
[[ -f /etc/support-bot/backup.env ]] || { echo 'Configure /etc/support-bot/backup.env first' >&2; exit 1; }
temporary=$(mktemp "$directory/.backup-XXXXXXXX")
trap 'rm -f "$temporary"' EXIT
docker run --rm --network support-bot_default --add-host host.docker.internal:host-gateway \
  --env-file /etc/support-bot/backup.env --entrypoint sh mysql:8.4 \
  -c 'exec mysqldump --host="$MYSQL_HOST" --port="${MYSQL_TCP_PORT:-3306}" --user="$MYSQL_USER" --single-transaction --quick --no-tablespaces --column-statistics=0 --set-gtid-purged=OFF "$MYSQL_DATABASE"' \
  | gzip > "$temporary"
gzip --test "$temporary"
destination="$directory/support-bot-$(date -u +%Y%m%dT%H%M%S)-$$.sql.gz"
mv "$temporary" "$destination"
echo "Database backup saved: $destination"
