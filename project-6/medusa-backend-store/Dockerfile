# Shared image for both the medusa and storefront services.
# The storefront service overrides the entrypoint in docker-compose.yml
# to run start-storefront.sh instead of the default CMD below.

FROM node:20-alpine

# /server (not /app) is used intentionally — avoids path conflicts with
# Medusa Admin customizations. See:
# https://docs.medusajs.com/resources/troubleshooting/medusa-admin/no-widget-route#errors-in-docker
WORKDIR /server

RUN apk add --no-cache python3 make g++

# Copy workspace root manifest + each app's package.json before installing,
# so npm can resolve the full workspace dependency graph correctly.
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/storefront/package*.json ./apps/storefront/

RUN npm install

# Now copy the rest of the monorepo source
COPY . .

RUN chmod +x start.sh start-storefront.sh

EXPOSE 9000 5173 8000

CMD ["./start.sh"]
