#!/bin/sh
set -e

MAIN_DOMAIN="${MAIN_DOMAIN:-_}"
API_DOMAIN_URL="${API_DOMAIN_URL:-}"

# Render main config — replace __MAIN_DOMAIN__ placeholder
sed "s/__MAIN_DOMAIN__/${MAIN_DOMAIN}/g" \
    /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Render API subdomain config if API_DOMAIN_URL is set
if [ -n "$API_DOMAIN_URL" ]; then
    echo "Enabling API subdomain: ${API_DOMAIN_URL}"
    sed "s/__API_DOMAIN__/${API_DOMAIN_URL}/g" \
        /etc/nginx/templates/api-domain.conf.template > /etc/nginx/conf.d/api-domain.conf
fi
