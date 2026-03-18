#!/bin/sh
set -e
if [ -n "$API_BASE_URL" ]; then
    echo "íº€ Injecting API Configuration: $API_BASE_URL"
    sed -i "s|</head>|<script>window.API_BASE_URL = \"$API_BASE_URL\";</script></head>|g" /usr/share/nginx/html/official-dashboard.html
fi
exec nginx -g "daemon off;"
