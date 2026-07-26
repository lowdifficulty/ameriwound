# AmeriWound

Static mirror of [ameriwound.com](https://ameriwound.com/) with the **AmeriWound AI** clinical documentation portal.

## Features

- Full static mirror of the AmeriWound website
- **AmeriWound AI** portal under Health Records Portal
- Simple login (username: `1`, password: `1`)
- Audio upload → Whisper transcription → GPT wound care notes
- Image upload alongside audio encounters
- Admin knowledge base for improved note generation

## Setup

```bash
npm install
npm run mirror          # fetch all pages from ameriwound.com
npm run postmirror      # rewrite asset paths, inject AI menu link
npm run download-assets # download wp-content assets locally
npm run build
npm run dev             # http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for AI) | OpenAI API key for Whisper transcription and note generation |

## AmeriWound AI

- Login: `/ameriwound-ai/`
- Dashboard: `/ameriwound-ai/dashboard/`
- Admin: `/ameriwound-ai/admin/`

## Deploy

Deployed on Vercel. Set `OPENAI_API_KEY` in Vercel project environment variables.
