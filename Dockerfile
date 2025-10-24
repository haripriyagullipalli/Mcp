# Use official Node.js LTS image

FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript (if needed)
RUN npm run build

# Expose port (change if your server uses a different port)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
