#!/usr/bin/env bash
set -Eeuo pipefail
[[ ${DEPLOY_TEST_CONTAINER:-} == yes && ! -e /opt/support-bot ]] || { echo 'Use a disposable test container.' >&2; exit 1; }
mkdir -p /tmp/fakebin /opt/support-bot/logs /opt/support-bot/data
export PATH="/tmp/fakebin:$PATH"
export FAKE_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export DISCORD_TOKEN=runtime-only-test-token ENCRYPTION_KEY=0123456789abcdef DB_HOST=db DB_USER=bot DB_NAME=shopy DB_PASSWORD='test=password#with spaces'
printf 'retained-log' > /opt/support-bot/logs/app.log
printf 'retained-data' > /opt/support-bot/data/sentinel
cat > /tmp/fakebin/id <<'EOF'
#!/usr/bin/env bash
echo 1000
EOF
cat > /tmp/fakebin/git <<'EOF'
#!/usr/bin/env bash
if [[ $1 == archive ]]; then tar -c src Dockerfile package.json deploy; else echo "$FAKE_SHA"; fi
EOF
cat > /tmp/fakebin/docker <<'EOF'
#!/usr/bin/env bash
case "$1" in
  container) [[ ${FAKE_EXISTING:-no} == yes ]] ;;
  stop|rm) echo "$1" >> /tmp/docker-calls ;;
  run)
    echo run >> /tmp/docker-calls
    previous=''
    for argument in "$@"; do
      if [[ $previous == --env-file ]]; then [[ $argument == /opt/support-bot/.env ]]; fi
      [[ $argument != *runtime-only-test-token* ]] || exit 1
      previous=$argument
    done
    grep -q '^DISCORD_TOKEN=runtime-only-test-token$' /opt/support-bot/.env
    grep -q '^DB_PASSWORD=test=password#with spaces$' /opt/support-bot/.env
    ;;
esac
EOF
chmod +x /tmp/fakebin/*
bash -n deploy/run.sh
bash deploy/run.sh "$FAKE_SHA"
[[ $(cat /tmp/docker-calls) == run ]]
[[ -f /opt/support-bot/current/src/index.ts ]]
[[ $(stat -c %a /opt/support-bot/.env) == 600 ]]
[[ $(cat /opt/support-bot/logs/app.log) == retained-log ]]
[[ $(cat /opt/support-bot/data/sentinel) == retained-data ]]
before=$(cksum /opt/support-bot/.env)
if DB_HOST= bash deploy/run.sh "$FAKE_SHA"; then echo 'Missing secret accepted' >&2; exit 1; fi
[[ $(cksum /opt/support-bot/.env) == "$before" ]]
if DISCORD_TOKEN=$'bad\nINJECTED=value' bash deploy/run.sh "$FAKE_SHA"; then echo 'Multiline secret accepted' >&2; exit 1; fi
[[ $(cksum /opt/support-bot/.env) == "$before" ]]
: > /tmp/docker-calls
export FAKE_EXISTING=yes
bash deploy/run.sh "$FAKE_SHA"
[[ $(cat /tmp/docker-calls) == $'stop\nrm\nrun' ]]
echo 'Run workflow tests passed: external private .env, preserved data/logs, secret validation and container replacement.'
