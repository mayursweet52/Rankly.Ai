Rankly.ai — Local development

Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment (optional):

Create a `.env` file in the project root with the following keys if needed:

```
PORT=3000
API_KEY=rankly-secret-key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

3. Start the server:

```bash
npm run start
# or for development with auto-reload
npm run dev
```

Notes

- The server serves static frontend files from the `public/` directory.
- Uploads are POSTed to `/api/upload` and require the `x-api-key` header (or `?apiKey=` query) when using the provided protected endpoint.
- The project includes optional Socket.IO integration for real-time upload progress.

If you want, I can run `npm install` for you (needs terminal permission) and start the dev server to verify everything.