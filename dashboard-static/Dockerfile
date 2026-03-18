FROM nginx:alpine
COPY official-dashboard.html /usr/share/nginx/html/index.html
RUN chmod -R 755 /usr/share/nginx/html/
EXPOSE 8080
# Create a simple nginx config that serves index.html
RUN echo 'server { listen 8080; location / { root /usr/share/nginx/html; index index.html; } }' > /etc/nginx/conf.d/default.conf
USER root
CMD ["nginx", "-g", "daemon off;"]
