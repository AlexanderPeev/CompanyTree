FROM node:10.16.3
ENV NODE_VERSION=10.16.3
ADD server /app/server
RUN cd /app/server && npm install --no-save && npm run build-prod
ENTRYPOINT ["node", "/app/server/src/main.js", "postgres://dbuser:mysecretpassword@db:5432/mydb"]
