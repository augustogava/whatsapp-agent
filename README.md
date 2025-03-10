mkdir wwebjs-bot
cd wwebjs-bot


npm init -y

npm install whatsapp-web.js
npm install qrcode-terminal

##Docker n8n
mkdir ~/n8n-local-files
docker volume create n8n_data

docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
or
docker compose up -d

# Test the command endpoint - this will execute the @ping command
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511954859333",
    "command": "@ping"
  }'

# Test sending a note via command
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511954859333",
    "command": "@note This is a test note from API"
  }'

# Test the help command
curl -X POST http://localhost:3000/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511954859333",
    "command": "@help"
  }'

# Regular message sending (original endpoint)
curl -X POST http://localhost:3000/api/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511954859333",
    "text": "This is a test message from the API"
  }'