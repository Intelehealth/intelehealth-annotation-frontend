# Use the official Node.js runtime as the base image
FROM node:20-alpine

# Install libc6-compat for alpine package compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the source code
COPY . .

# Accept build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NODE_ENV
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Set runtime configurations
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

EXPOSE 3000

# Start using the Next.js start command
CMD ["npm", "run", "start"]
