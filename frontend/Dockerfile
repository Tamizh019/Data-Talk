FROM node:20-alpine

WORKDIR /app

# Copy package management files first to cache layer
COPY package.json package-lock.json ./

# Install all dependencies (development dependencies are needed to run 'next dev')
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port (Next.js defaults to 3000)
EXPOSE 3000

# Start server in dev mode using NEXT.js inside the container
CMD ["npm", "run", "dev"]
