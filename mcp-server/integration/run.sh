#!/usr/bin/env bash
# Spins up throwaway MariaDB + WordPress + Contact Form 7 in Docker, then runs
# integration.test.mjs against it. Requires docker. Cleans up on exit.
set -euo pipefail
cd "$(dirname "$0")/.."
NET=cf7-it-net; DB=cf7-it-db; WP=cf7-it-wp; PORT="${CF7_IT_PORT:-8089}"
cleanup() { docker rm -f "$WP" "$DB" >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
[ -z "${CF7_IT_KEEP:-}" ] && trap cleanup EXIT
cleanup
docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" -e MARIADB_ROOT_PASSWORD=root -e MARIADB_DATABASE=wp -e MARIADB_USER=wp -e MARIADB_PASSWORD=wp mariadb:11 >/dev/null
docker run -d --name "$WP" --network "$NET" -p "$PORT":80 \
  -e WORDPRESS_DB_HOST="$DB" -e WORDPRESS_DB_USER=wp -e WORDPRESS_DB_PASSWORD=wp -e WORDPRESS_DB_NAME=wp \
  -e WORDPRESS_CONFIG_EXTRA="define('WP_ENVIRONMENT_TYPE','local');" \
  wordpress:php8.3-apache >/dev/null
WPCLI="docker run --rm --network $NET --volumes-from $WP -u 33 -e WORDPRESS_DB_HOST=$DB -e WORDPRESS_DB_USER=wp -e WORDPRESS_DB_PASSWORD=wp -e WORDPRESS_DB_NAME=wp wordpress:cli --path=/var/www/html"
echo "Waiting for database..."
for i in $(seq 1 60); do docker exec "$DB" mariadb-admin ping -h127.0.0.1 -uwp -pwp --silent >/dev/null 2>&1 && break; sleep 3; done
for i in $(seq 1 30); do docker exec "$WP" test -f /var/www/html/wp-config.php && break; sleep 2; done
$WPCLI core install --url="http://localhost:$PORT" --title=CF7IT --admin_user=admin --admin_password=adminpass --admin_email=a@example.com --skip-email
$WPCLI plugin install contact-form-7 --version="${CF7_VERSION:-6.1.7}" --activate
$WPCLI rewrite structure '/%postname%/' --hard
APP_PW=$($WPCLI user application-password create admin cf7-it --porcelain)
export WORDPRESS_URL="http://localhost:$PORT" WORDPRESS_USERNAME=admin WORDPRESS_APP_PASSWORD="$APP_PW"
if [ -n "${CF7_IT_KEEP:-}" ]; then
  echo "Site kept running at $WORDPRESS_URL (user admin, app password: $APP_PW). Stop with: docker rm -f $WP $DB; docker network rm $NET"
  exit 0
fi
node --test integration/integration.test.mjs
