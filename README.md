This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## DeepSeek API key setup

The chat backend reads the DeepSeek key from a server-side environment variable named `DEEPSEEK_API_KEY`. Do **not** prefix this key with `NEXT_PUBLIC_`, because that would expose it to the browser.

### Local development

Create a `.env.local` file in the repository root and add:

```bash
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

Optional overrides are available if the provider endpoint, model name, or reasoning setting changes:

```bash
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL_ID=deepseek-v4-pro
DEEPSEEK_REASONING_EFFORT=max

# Optional: image-to-LaTeX transcription before DeepSeek
GEMINI_OCR_API_KEY=your-google-ai-studio-api-key
GEMINI_OCR_MODEL_ID=gemini-3.1-flash-lite
```

Restart `npm run dev` after changing environment variables.

### Vercel deployment

In Vercel, open the project and go to **Settings → Environment Variables**. Add `DEEPSEEK_API_KEY` for the environments you use, usually Production, Preview, and Development. If you want image uploads to be transcribed before DeepSeek receives the request, also add `GEMINI_OCR_API_KEY` from Google AI Studio and optionally `GEMINI_OCR_MODEL_ID`. Redeploy the app after saving the variables.
