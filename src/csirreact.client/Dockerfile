# Use the latest LTS version of Node.js
FROM node:20-alpine
ENV APP_API_URL=http://localhost:7106
# Set the working directory inside the container
WORKDIR /app

COPY ["csirreact.client/package*.json", "./"]
# Copy package.json and package-lock.json
COPY package*.json ./
 
# Install dependencies
RUN npm install
 
# Copy the rest of your application files
COPY ["csirreact.client/.", "."]
 
# Expose the port your app runs on
EXPOSE 3000

# add env.sh to docker-entrypoint.d
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Define the command to run your app
CMD ["npm", "run", "dev"]