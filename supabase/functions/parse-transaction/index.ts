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

    // Prepare category list for prompt with IDs
    const categoryList = categories
      .map(cat => `- ID: "${cat.id}" | Name: ${cat.name} | Type: ${cat.type === 'income' ? 'Thu' : 'Chi'} | Icon: ${cat.icon}`)
      .join('\n');

    // Create prompt for Gemini
    const prompt = `Bạn là một trợ lý tài chính thông minh. Nhiệm vụ của bạn là phân tích tin nhắn tiếng Việt về giao dịch tài chính và trích xuất thông tin theo định dạng JSON.

Danh sách các hạng mục có sẵn:
${categoryList}

Hãy trích xuất từ tin nhắn:
1. type: "income" (thu) hoặc "expense" (chi)
2. amount: số tiền (VND, chuyển về đơn vị đồng)
3. category_id: chọn UUID từ cột "ID" trong danh sách trên (PHẢI là UUID, KHÔNG PHẢI tên hay icon!)
4. category_name: tên hạng mục từ cột "Name"
5. note: ghi chú ngắn gọn về giao dịch
6. date: ngày giao dịch (ISO format YYYY-MM-DD)
7. confidence: độ tin cậy (0-1)

Quy tắc:
- Số tiền: 50k = 50,000 | 1tr = 1,000,000 | 1.5 triệu = 1,500,000
- Nếu không nói rõ ngày → dùng hôm nay (${new Date().toISOString().split('T')[0]})
- Nếu không chắc hạng mục → chọn "Khác" với confidence thấp
- Ghi chú ngắn gọn, không quá 100 ký tự

Tin nhắn cần phân tích: "${message}"

Trả về CHÍNH XÁC JSON với định dạng (category_id PHẢI là UUID từ cột ID):
{
  "type": "expense",
  "amount": 50000,
  "category_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "category_name": "Ăn uống",
  "note": "Ăn phở",
  "date": "2025-01-13",
  "confidence": 0.95
}`;

    // Call Google Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
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
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI parsing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates[0].content.parts[0].text;

    // Parse AI response
    let parsedTransaction;
    try {
      parsedTransaction = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate category_id exists
    const categoryExists = categories.some(cat => cat.id === parsedTransaction.category_id);
    if (!categoryExists) {
      // Find "Khác" category as fallback
      const otherCategory = categories.find(cat => cat.name === 'Khác');
      if (otherCategory) {
        parsedTransaction.category_id = otherCategory.id;
        parsedTransaction.category_name = 'Khác';
        parsedTransaction.confidence = Math.min(parsedTransaction.confidence, 0.6);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction: parsedTransaction
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
