FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app/apps/api

COPY apps/api/package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY apps/api/ ./
COPY apps/web/ /app/apps/web/

EXPOSE 3000
CMD ["npm", "start"]
