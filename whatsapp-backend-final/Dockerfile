# Use a Node.js image that includes Chrome for Puppeteer
FROM ghcr.io/puppeteer/puppeteer:22.9.0

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or just package.json)
COPY package.json ./

# Install dependencies
# Using --no-cache to ensure a fresh install
RUN npm install --no-cache

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "index.js"]
