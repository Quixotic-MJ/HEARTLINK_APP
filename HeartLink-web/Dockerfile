# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Development (Hot Reloading)
FROM base AS dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: Builder for Production
FROM base AS builder
RUN npm run build

# Stage 4: Serve static files with Nginx (Production)
FROM nginx:alpine AS prod
# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
# Expose web port
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]