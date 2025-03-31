FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Create .env file from environment variables at runtime
RUN echo "Creating .env file placeholder (will be populated at runtime)"

# Build the TypeScript code
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Command to run the app
CMD ["node", "dist/index.js"]