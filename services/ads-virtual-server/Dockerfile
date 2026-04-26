# ===== Base =====
FROM node:20-alpine

# Set environment
ENV NODE_ENV=production

# App directory
WORKDIR /app

# Install dependencies (cache tốt hơn)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Security: run as non-root
RUN addgroup -S app && adduser -S app -G app
USER app

# Expose port
EXPOSE 4001

# Start app
CMD ["node", "src/app.js"]