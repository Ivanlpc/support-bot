#!/usr/bin/env bash
# Run only inside the disposable container specified in docs/DEPLOY.md.
set -Eeuo pipefail
[[ ${DEPLOY_TEST_CONTAINER:-} == yes ]] || { echo 'This test requires a disposable container.' >&2; exit 1; }
[[ ! -e /opt/support-bot ]] || { echo 'Test deployment directory already exists.' >&2; exit 1; }
for file in deploy/*.sh; do bash -n "$file"; done
mkdir -p /tmp/fakebin /opt/support-bot/releases
export PATH="/tmp/fakebin:$PATH"
export FAKE_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
printf '%s' "$FAKE_SHA" > /tmp/good-sha
cat > /tmp/fakebin/git <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$FAKE_SHA"
EOF
cat > /tmp/fakebin/sudo <<'EOF'
#!/usr/bin/env bash
[[ $1 != -n ]] || shift
exec "$@"
EOF
cat > /usr/bin/systemctl <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> /tmp/service-calls
EOF
cat > /tmp/fakebin/docker <<'EOF'
#!/usr/bin/env bash
case "$1" in
  build) [[ ${FAIL_BUILD:-no} != yes ]] ;;
  ps) echo test-container ;;
  inspect)
    if [[ $(basename "$(readlink -f /opt/support-bot/current)") == "$(cat /tmp/good-sha)" ]]; then echo healthy; else echo unhealthy; fi ;;
  logs) echo 'Example container diagnostics' ;;
  run) [[ ${FAIL_DUMP:-no} != yes ]] || exit 1; printf 'CREATE TABLE example (id INT);\n' ;;
esac
EOF
cat > /tmp/fakebin/sleep <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x /tmp/fakebin/* /usr/bin/systemctl
bash deploy/release.sh "$FAKE_SHA"
[[ $(basename "$(readlink -f /opt/support-bot/current)") == "$FAKE_SHA" ]]
previous=$FAKE_SHA
export FAKE_SHA=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
if bash deploy/release.sh "$FAKE_SHA"; then echo 'Unhealthy deployment unexpectedly succeeded' >&2; exit 1; fi
[[ $(basename "$(readlink -f /opt/support-bot/current)") == "$previous" ]]
before=$(wc -l < /tmp/service-calls)
export FAIL_BUILD=yes
if bash deploy/release.sh "$FAKE_SHA"; then echo 'Failed build unexpectedly deployed' >&2; exit 1; fi
[[ $(wc -l < /tmp/service-calls) == "$before" ]]
echo 'Release tests passed: activation, unhealthy rollback, failed build preserves the running release.'

mkdir -p /etc/support-bot
printf 'MYSQL_HOST=db\nMYSQL_USER=backup\nMYSQL_DATABASE=shopy\n' > /etc/support-bot/backup.env
bash deploy/backup.sh
[[ $(find /var/backups/support-bot -name '*.sql.gz' | wc -l) == 1 ]]
export FAIL_DUMP=yes
if bash deploy/backup.sh; then echo 'Failed dump unexpectedly published a backup' >&2; exit 1; fi
[[ $(find /var/backups/support-bot -name '*.sql.gz' | wc -l) == 1 ]]
echo 'Backup tests passed: valid gzip output and failed dumps do not publish a backup.'
