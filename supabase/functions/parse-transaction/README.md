# Parse Transaction Edge Function

This Supabase Edge Function uses Google Gemini 2.0 Flash to parse natural language messages into structured transaction data.

## Setup

### 1. Get Google Gemini API Key (FREE!)

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Select your Google Cloud project (or create a new one)
4. Copy the API key

**Note**: Gemini 2.0 Flash is FREE with generous limits (15 RPM, 1 million TPM)!

### 2. Deploy Using npx (No Installation Needed)

```bash
# Step 1: Login to Supabase
npx supabase login

# Step 2: Link to your project
npx supabase link --project-ref your-project-ref

# Step 3: Set Gemini API key as secret
npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key

# Step 4: Deploy the function
npx supabase functions deploy parse-transaction
```

### Alternative: Install Supabase CLI Globally

```bash
# Install once
npm install -g supabase

# Then use commands without npx:
supabase login
supabase link --project-ref your-project-ref
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
supabase functions deploy parse-transaction
```

### 3. Test the function

```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/parse-transaction' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Ăn phở 50k hôm nay","userId":"user-id","categories":[{"id":"cat1","name":"Ăn uống","type":"expense","icon":"🍔"}]}'
```

## Find Your Project Ref

Your project ref is in your Supabase URL:
- URL: `https://glqaxwyjlkpygbdpmbiy.supabase.co`
- Project Ref: `glqaxwyjlkpygbdpmbiy`

## Cost Considerations - IT'S FREE! 🎉

- **Gemini 2.0 Flash is completely FREE**
- Rate limits: 15 requests per minute (more than enough!)
- 1 million tokens per minute
- **No credit card required**
- Perfect for production use

## Fallback Mode

The app automatically uses a rule-based fallback parser if:
- Edge Function is not deployed
- API fails
- Rate limit exceeded

The fallback works great for Vietnamese and is **100% free**!
