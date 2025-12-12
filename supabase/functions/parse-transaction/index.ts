// Supabase Edge Function - Parse Transaction with AI
// Uses Google Gemini 2.0 Flash to parse natural language into structured transaction data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

interface ParseRequest {
  message: string;
  userId: string;
  categories: Category[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId, categories }: ParseRequest = await req.json();

    if (!message || !userId || !categories) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not set');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get default system categories that user hasn't created yet
    const { data: defaultCategories } = await supabase
      .from('categories')
      .select('*')
      .is('user_id', null)
      .eq('is_default', true);

    // Filter out default categories that user already has (by name)
    const userCategoryNames = categories.map(c => c.name.toLowerCase());
    const availableDefaultCategories = defaultCategories?.filter(
      dc => !userCategoryNames.includes(dc.name.toLowerCase())
    ) || [];

    // Prepare user category list for prompt with IDs
    const categoryList = categories
      .map(cat => `- ID: "${cat.id}" | Name: ${cat.name} | Type: ${cat.type === 'income' ? 'Thu' : 'Chi'} | Icon: ${cat.icon}`)
      .join('\n');

    // Prepare suggested categories list (categories user hasn't created yet)
    const suggestedCategoriesList = availableDefaultCategories
      .map(cat => `- Name: ${cat.name} | Type: ${cat.type === 'income' ? 'Thu' : 'Chi'} | Icon: ${cat.icon}`)
      .join('\n');

    // Create prompt for Gemini - now supports multiple transactions
    const prompt = `You are a financial transaction parser. Parse Vietnamese transaction messages and return ONLY a JSON object.

USER'S CATEGORIES (prefer these first):
${categoryList}

${suggestedCategoriesList.length > 0 ? `SUGGESTED CATEGORIES (user hasn't created yet - suggest if better match):
${suggestedCategoriesList}` : ''}

Message to parse: "${message}"

Rules:
- 50k = 50,000 VND | 1tr = 1,000,000 VND | 1.5 triệu = 1,500,000 VND
- If no date mentioned, use today: ${new Date().toISOString().split('T')[0]}
- PREFER user's categories first
- If no good match in user's categories BUT there's a better match in SUGGESTED categories, use a generic category and set "suggestedCategory"
- Match category_id from the "ID" column above (must be valid UUID)
- Note should be brief (max 100 chars)

Return ONLY this JSON format (no markdown, no explanation):
{
  "transactions": [
    {
      "type": "expense",
      "amount": 30000,
      "category_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "category_name": "Ăn uống",
      "note": "Ăn sáng",
      "date": "${new Date().toISOString().split('T')[0]}",
      "confidence": 0.95,
      "suggestedCategory": "Sức khỏe"
    }
  ]
}

Note: Only include "suggestedCategory" if the transaction better matches a SUGGESTED category than user's categories.`;

    // Call Google Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error status:', geminiResponse.status);
      console.error('❌ Gemini API error body:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI parsing failed: ${geminiResponse.status}`,
          details: errorText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    let aiResponse = geminiData.candidates[0].content.parts[0].text;

    // Remove markdown code blocks if present (```json ... ```)
    aiResponse = aiResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

    console.log('AI Response (cleaned):', aiResponse);

    // Parse AI response
    let parsedData;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      console.error('Raw response was:', aiResponse);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid AI response format',
          rawResponse: aiResponse.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle both array format and old single transaction format for backward compatibility
    let transactions = [];
    if (parsedData.transactions && Array.isArray(parsedData.transactions)) {
      transactions = parsedData.transactions;
    } else if (parsedData.type && parsedData.amount) {
      // Old format - single transaction
      transactions = [parsedData];
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'No transactions found in response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and fix category_id for each transaction
    transactions = transactions.map(transaction => {
      const categoryExists = categories.some(cat => cat.id === transaction.category_id);
      if (!categoryExists) {
        // Find "Khác" category as fallback
        const otherCategory = categories.find(cat => cat.name === 'Khác');
        if (otherCategory) {
          transaction.category_id = otherCategory.id;
          transaction.category_name = 'Khác';
          transaction.confidence = Math.min(transaction.confidence, 0.6);
        }
      }
      return transaction;
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactions: transactions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
