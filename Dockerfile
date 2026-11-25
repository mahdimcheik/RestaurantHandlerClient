# Image de production : build Angular puis fichiers statiques servis par nginx.
# nginx relaie aussi /api, /hubs et /hangfire vers l'API (nginx/default.conf) : un seul domaine.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

FROM nginx:alpine AS prod-runtime
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/RestaurantHandler/browser /usr/share/nginx/html
EXPOSE 80
