FROM node:18-alpine

WORKDIR /app

# Copy pre-installed node_modules from host (bypasses Docker container network issues)
COPY node_modules ./node_modules

# Copy package.json for reference
COPY package.json ./

# Copy application code
COPY src ./src

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
