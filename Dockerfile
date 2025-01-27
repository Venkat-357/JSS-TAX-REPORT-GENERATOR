# Use Node.js LTS (Long Term Support) as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3003

# Start the app
CMD ["node", "index.js"]