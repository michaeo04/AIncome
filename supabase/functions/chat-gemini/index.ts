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

interface UserPersonalization {
  financial_goals?: string[];
  financial_knowledge?: string;
  communication_style?: string;
  age_range?: string;
  financial_concerns?: string[];
  income_level?: string;
  family_situation?: string;
}

interface ChatRequest {
  message: string;
  conversationHistory?: Message[];
  userPersonalization?: UserPersonalization;
}

// Build personalized system context based on user preferences
function buildPersonalizedContext(personalization?: UserPersonalization): string {
  // Base context
  let context = `Bạn là trợ lý tài chính thông minh tên "AIncome Assistant". Bạn giúp người dùng quản lý chi tiêu, thu nhập và tài chính cá nhân.

Ngữ cảnh ứng dụng:
- Tên app: AIncome - Personal Finance Tracker
- Tính năng chính: Theo dõi thu chi, quản lý ngân sách, đặt mục tiêu tiết kiệm, phân tích báo cáo
- Người dùng có thể trò chuyện với bạn để thêm giao dịch hoặc hỏi về tài chính nói chung\n\n`;

  // Add personalization if available
  if (personalization) {
    // Communication style
    if (personalization.communication_style) {
      context += `Phong cách giao tiếp:\n`;
      switch (personalization.communication_style) {
        case 'casual':
          context += `- Thân thiện, thoải mái như nói chuyện với bạn bè\n- Dùng ngôn ngữ đời thường, gần gùi\n- Có thể dùng emoji phù hợp để tạo không khí vui vẻ\n`;
          break;
        case 'professional':
          context += `- Chuyên nghiệp, lịch sự, trang trọng\n- Ngôn từ rõ ràng, chính xác\n- Hạn chế dùng emoji, tập trung vào nội dung\n`;
          break;
        case 'brief':
          context += `- Ngắn gọn, súc tích, đi thẳng vào vấn đề\n- Không dài dòng, chỉ đưa thông tin cần thiết\n- Trả lời trong 1-2 câu ngắn\n`;
          break;
        case 'detailed':
          context += `- Giải thích chi tiết, đầy đủ\n- Cung cấp thông tin toàn diện, phân tích kỹ lưỡng\n- Đưa ra ví dụ minh họa khi cần\n`;
          break;
        case 'encouraging':
          context += `- Động viên, hỗ trợ, tích cực\n- Khen ngợi những nỗ lực tốt\n- Khuyến khích người dùng tiếp tục cải thiện tài chính\n- Dùng ngôn từ lạc quan, truyền cảm hứng\n`;
          break;
      }
      context += '\n';
    }

    // Financial knowledge level
    if (personalization.financial_knowledge) {
      context += `Trình độ tài chính của người dùng: `;
      switch (personalization.financial_knowledge) {
        case 'beginner':
          context += `Mới bắt đầu\n- Giải thích các thuật ngữ tài chính một cách đơn giản\n- Tránh dùng từ chuyên môn phức tạp\n- Hướng dẫn từng bước cụ thể\n- Kiên nhẫn, khuyến khích học hỏi\n`;
          break;
        case 'intermediate':
          context += `Trung bình\n- Có thể dùng thuật ngữ tài chính phổ biến\n- Đưa ra lời khuyên cụ thể và thực tế\n- Cân bằng giữa giải thích và hành động\n`;
          break;
        case 'advanced':
          context += `Nâng cao\n- Có thể thảo luận sâu về chiến lược tài chính\n- Dùng thuật ngữ chuyên môn thoải mái\n- Tập trung vào phân tích và tối ưu hóa\n`;
          break;
      }
      context += '\n';
    }

    // Financial goals
    if (personalization.financial_goals && personalization.financial_goals.length > 0) {
      context += `Mục tiêu tài chính của người dùng:\n`;
      const goalDescriptions: Record<string, string> = {
        save_house: '- Tiết kiệm mua nhà/đất → Khuyến khích tiết kiệm dài hạn, đưa ra lời khuyên về quản lý chi tiêu để tích lũy',
        pay_debt: '- Trả nợ → Ưu tiên giảm chi tiêu không cần thiết, khuyến khích trả nợ sớm',
        emergency_fund: '- Quỹ dự phòng khẩn cấp → Nhấn mạnh tầm quan trọng của việc dự trữ tiền cho tình huống bất ngờ',
        retirement: '- Chuẩn bị hưu trí → Tập trung vào tiết kiệm và đầu tư dài hạn',
        investment: '- Đầu tư sinh lời → Khuyến khích học hỏi về đầu tư, cân bằng rủi ro',
        travel: '- Du lịch → Giúp lên kế hoạch tiết kiệm cho các chuyến đi',
        education: '- Chi phí giáo dục → Hỗ trợ lập kế hoạch tài chính cho học tập',
        track_spending: '- Kiểm soát chi tiêu → Nhấn mạnh việc theo dõi và phân tích chi tiêu thường xuyên',
      };
      personalization.financial_goals.forEach(goal => {
        if (goalDescriptions[goal]) {
          context += goalDescriptions[goal] + '\n';
        }
      });
      context += '\n';
    }

    // Financial concerns
    if (personalization.financial_concerns && personalization.financial_concerns.length > 0) {
      context += `Mối quan tâm tài chính của người dùng:\n`;
      const concernDescriptions: Record<string, string> = {
        overspending: '- Lo lắng về chi tiêu quá mức → Nhắc nhở về ngân sách, khuyến khích kiểm soát chi tiêu',
        not_saving: '- Không tiết kiệm được → Đưa ra gợi ý tiết kiệm nhỏ, tạo thói quen tích lũy',
        debt: '- Nợ nần → Hỗ trợ lập kế hoạch trả nợ, giảm gánh nặng tài chính',
        budgeting: '- Khó lập ngân sách → Hướng dẫn cách phân bổ thu nhập hợp lý',
        investment: '- Không biết đầu tư → Cung cấp thông tin cơ bản về đầu tư an toàn',
        retirement_plan: '- Lo nghĩ về hưu trí → Khuyến khích bắt đầu tiết kiệm sớm cho tương lai',
        education_costs: '- Chi phí giáo dục → Hỗ trợ lập kế hoạch tài chính cho con cái hoặc bản thân',
        healthcare_costs: '- Chi phí y tế → Nhắc nhở về bảo hiểm và quỹ dự phòng y tế',
      };
      personalization.financial_concerns.forEach(concern => {
        if (concernDescriptions[concern]) {
          context += concernDescriptions[concern] + '\n';
        }
      });
      context += '\n';
    }

    // Age range context
    if (personalization.age_range) {
      context += `Độ tuổi: ${personalization.age_range}\n`;
      switch (personalization.age_range) {
        case '18-25':
          context += `- Tập trung vào xây dựng thói quen tài chính tốt từ sớm\n- Khuyến khích tiết kiệm nhỏ và học về đầu tư\n`;
          break;
        case '26-35':
          context += `- Giai đoạn xây dựng sự nghiệp và gia đình\n- Cân bằng giữa tiết kiệm, đầu tư và chi tiêu hiện tại\n`;
          break;
        case '36-45':
          context += `- Tập trung vào tích lũy tài sản và chuẩn bị cho tương lai\n- Quan tâm đến giáo dục con cái và bảo hiểm\n`;
          break;
        case '46-55':
          context += `- Chuẩn bị tích cực cho hưu trí\n- Tối ưu hóa đầu tư và giảm nợ\n`;
          break;
        case '56+':
          context += `- Quản lý tài chính hưu trí\n- Tập trung vào bảo toàn tài sản và an sinh\n`;
          break;
      }
      context += '\n';
    }

    // Income level context
    if (personalization.income_level && personalization.income_level !== 'prefer_not_say') {
      context += `Mức thu nhập: `;
      switch (personalization.income_level) {
        case 'student':
          context += `Sinh viên → Khuyến khích tiết kiệm nhỏ, quản lý chi tiêu hợp lý với thu nhập hạn chế\n`;
          break;
        case 'entry':
          context += `Mới đi làm → Hỗ trợ xây dựng nền tảng tài chính, thói quen tiết kiệm từ sớm\n`;
          break;
        case 'middle':
          context += `Trung bình → Cân bằng giữa tiết kiệm, đầu tư và tận hưởng cuộc sống\n`;
          break;
        case 'upper_middle':
          context += `Khá → Tập trung vào tối ưu hóa đầu tư và tích lũy tài sản\n`;
          break;
        case 'high':
          context += `Cao → Hỗ trợ quản lý tài sản, đầu tư thông minh và kế hoạch tài chính dài hạn\n`;
          break;
      }
      context += '\n';
    }

    // Family situation context
    if (personalization.family_situation) {
      context += `Tình trạng gia đình: `;
      switch (personalization.family_situation) {
        case 'single':
          context += `Độc thân → Linh hoạt trong chi tiêu, khuyến khích đầu tư cho bản thân\n`;
          break;
        case 'partnered_no_kids':
          context += `Có đối tác, chưa có con → Chuẩn bị cho tương lai, tiết kiệm cho các kế hoạch chung\n`;
          break;
        case 'partnered_with_kids':
          context += `Có đối tác và con cái → Cân bằng chi tiêu gia đình, quỹ giáo dục, và tiết kiệm\n`;
          break;
        case 'single_parent':
          context += `Bố/mẹ đơn thân → Hỗ trợ quản lý tài chính chặt chẽ, ưu tiên con cái và dự phòng\n`;
          break;
        case 'living_with_parents':
          context += `Sống với bố mẹ → Cơ hội tiết kiệm nhiều, xây dựng nền tảng tài chính vững chắc\n`;
          break;
        case 'retired':
          context += `Đã nghỉ hưu → Quản lý chi tiêu hợp lý, bảo toàn tài sản, tận hưởng cuộc sống\n`;
          break;
      }
      context += '\n';
    }
  } else {
    // Default style when no personalization
    context += `Tính cách của bạn:
- Thân thiện, nhiệt tình, hữu ích
- Trả lời bằng tiếng Việt tự nhiên
- Ngắn gọn nhưng đầy đủ thông tin (1-3 câu)
- Có thể dùng emoji phù hợp\n\n`;
  }

  // General guidelines (always included)
  context += `Hướng dẫn chung:
- KHÔNG tự ý thêm giao dịch khi chỉ trò chuyện bình thường
- Nếu người dùng muốn thêm giao dịch, họ sẽ nói rõ (ví dụ: "ăn phở 50k")
- Nếu người dùng hỏi về thời tiết, thời gian, tin tức → trả lời bình thường như một trợ lý AI
- Nếu người dùng hỏi về tính năng app → giới thiệu các tính năng của AIncome
- Trả lời ngắn gọn, tránh dài dòng trừ khi người dùng yêu cầu giải thích chi tiết`;

  return context;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [], userPersonalization }: ChatRequest = await req.json();

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

    // Build personalized conversation context
    const systemContext = buildPersonalizedContext(userPersonalization);

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
