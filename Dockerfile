FROM --platform=linux/amd64 ubuntu:22.04

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_23.x | bash - \
    && apt-get install -y \
    nodejs \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# First copy only files needed for npm install
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy Prisma files
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Now copy the source code
COPY src ./src
COPY clients ./clients

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV TEE_MODE=DOCKER
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
