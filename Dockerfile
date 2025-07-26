# Stage 1: Build the Next.js application
FROM node:20-bullseye AS builder

# Install Python and native/build dependencies (Debian)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    curl \
    bash \
    git \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

# Copy package and requirements files
COPY package*.json ./
COPY requirements*.txt ./

# Install Node.js dependencies
RUN npm ci --legacy-peer-deps

# Install Python dependencies in virtualenv (fast with prebuilt wheels)
RUN python3 -m venv /venv && \
    /venv/bin/pip install --upgrade pip && \
    /venv/bin/pip install --no-cache-dir --prefer-binary -r requirements.txt


# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build


# Stage 2: Create the production image
FROM node:20-bullseye AS runner

# Install Python and runtime dependencies (Debian)
RUN apt-get update && apt-get install -y --fix-missing \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    g++ \
    gcc \
    make \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    bash \
    libc6 \
    && rm -rf /var/lib/apt/lists/*


WORKDIR /app

# Copy venv and node deps
COPY --from=builder /venv /venv
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./


# Copy requirements first
COPY --from=builder /app/requirements*.txt ./

# Recreate virtual environment (don’t copy broken one) )
#RUN python3 -m venv /venv && \
#    /venv/bin/pip install --upgrade pip && \
#    /venv/bin/pip install --no-cache-dir --prefer-binary -r requirements.txt


# Ensure venv takes priority
ENV PATH="/venv/bin:$PATH"


# Copy built app and runtime files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/*.py ./
COPY --from=builder /app/*.sh ./
COPY --from=builder /app/.env.local .env.local  

# Make shell scripts executable
RUN chmod +x ./*.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", ". /venv/bin/activate && npm run start"]
