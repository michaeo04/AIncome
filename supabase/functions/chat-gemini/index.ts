// Supabase Edge Function - Chat with Gemini AI
// Handles general conversation with context awareness about the finance app

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not set');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation context
    const systemContext = `Bạn là trợ lý tài chính thông minh và thân thiện tên "AIncome Assistant". Bạn giúp người dùng quản lý chi tiêu, thu nhập và tài chính cá nhân.

Ngữ cảnh ứng dụng:
- Tên app: AIncome - Personal Finance Tracker
- Tính năng chính: Theo dõi thu chi, quản lý ngân sách, đặt mục tiêu tiết kiệm, phân tích báo cáo
- Người dùng có thể trò chuyện với bạn để thêm giao dịch hoặc hỏi về tài chính nói chung

Tính cách của bạn:
- Thân thiện, nhiệt tình, hữu ích
- Trả lời bằng tiếng Việt tự nhiên
- Ngắn gọn nhưng đầy đủ thông tin (1-3 câu)
- Có thể dùng emoji phù hợp
- Nếu người dùng hỏi về thời tiết, thời gian, tin tức → trả lời bình thường như một trợ lý AI
- Nếu người dùng hỏi về tính năng app → giới thiệu các tính năng của AIncome

Hướng dẫn:
- KHÔNG tự ý thêm giao dịch khi chỉ trò chuyện bình thường
- Nếu người dùng muốn thêm giao dịch, họ sẽ nói rõ (ví dụ: "ăn phở 50k")
- Trả lời ngắn gọn, tránh dài dòng`;

    // Build conversation parts for Gemini
    const conversationParts = [];

    // Add system context
    conversationParts.push({ text: systemContext });

    // Add conversation history (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      conversationParts.push({
        text: `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}`
      });
    }

    // Add current message
    conversationParts.push({ text: `Người dùng: ${message}` });
    conversationParts.push({ text: 'Trợ lý:' });

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
            parts: conversationParts
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI chat failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const aiReply = geminiData.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({
        success: true,
        reply: aiReply.trim()
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
