FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY scripts/requirements-tts.txt ./
RUN pip3 install --break-system-packages -r requirements-tts.txt

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
