# Testing Personalization Feature

## Overview

This guide will help you test the chatbot personalization feature to ensure it's working correctly. The chatbot should respond differently based on user preferences set during onboarding.

## Prerequisites

Before testing:
1. Deploy the updated Edge Function to Supabase
2. Ensure you have at least 2 test accounts ready
3. Clear any existing onboarding data for these accounts

## Deploying the Edge Function

Before testing, you MUST deploy the updated Edge Function:

```bash
# Navigate to your project root
cd C:\Users\candl\Projects\khoa_luan\AIncome

# Deploy the chat-gemini function
npx supabase functions deploy chat-gemini

# If you don't have Supabase CLI, install it first:
npm install -g supabase

# Then login to Supabase
npx supabase login
```

After deployment, verify in Supabase Dashboard:
- Go to Edge Functions section
- Check that `chat-gemini` function shows the latest deployment timestamp

## Test Cases

### Test Case 1: Communication Style - Casual vs Professional

**Account 1: Casual Style**
1. Sign up with a new account (e.g., test-casual@example.com)
2. Complete onboarding:
   - Select "Casual & Friendly" communication style
   - Select "Beginner" financial knowledge
   - Select any goals (e.g., "Track spending")
3. Go to Chat tab
4. Ask: "Tôi nên tiết kiệm thế nào?"
5. **Expected**: Response should be friendly, use casual language, may include emojis

**Account 2: Professional Style**
1. Sign up with a new account (e.g., test-professional@example.com)
2. Complete onboarding:
   - Select "Professional" communication style
   - Select "Advanced" financial knowledge
   - Select any goals (e.g., "Investment")
3. Go to Chat tab
4. Ask: "Tôi nên tiết kiệm thế nào?"
5. **Expected**: Response should be formal, professional tone, minimal emojis, may use financial terminology

**Verification**: Compare the two responses. They should have noticeably different tones.

---

### Test Case 2: Financial Knowledge - Beginner vs Advanced

**Account 1: Beginner**
1. Complete onboarding with:
   - Financial knowledge: "Beginner"
   - Any communication style
2. Ask: "Đầu tư là gì?"
3. **Expected**: Simple explanation, avoids complex jargon, step-by-step guidance

**Account 2: Advanced**
1. Complete onboarding with:
   - Financial knowledge: "Advanced"
   - Same communication style as Account 1
2. Ask: "Đầu tư là gì?"
3. **Expected**: More sophisticated explanation, may use technical terms like "asset allocation", "portfolio diversification"

**Verification**: Beginner response should be simpler and more educational. Advanced response should assume more knowledge.

---

### Test Case 3: Financial Goals - Different Advice

**Account 1: Save for House**
1. Complete onboarding with:
   - Financial goals: "Save for house/property"
   - Any other settings
2. Ask: "Tôi nên chi tiêu như thế nào?"
3. **Expected**: Advice should mention long-term savings, reducing unnecessary expenses to accumulate funds

**Account 2: Pay Debt**
1. Complete onboarding with:
   - Financial goals: "Pay off debt"
   - Same other settings as Account 1
2. Ask: "Tôi nên chi tiêu như thế nào?"
3. **Expected**: Advice should prioritize debt reduction, minimizing non-essential spending to pay off debt faster

**Verification**: Responses should be tailored to the specific goal mentioned.

---

### Test Case 4: Financial Concerns - Personalized Support

**Account 1: Overspending Concern**
1. Complete onboarding with:
   - Financial concerns: "Overspending"
2. Ask: "Tôi cảm thấy lo lắng về tài chính"
3. **Expected**: Response should acknowledge overspending concerns, offer budgeting tips, encourage expense tracking

**Account 2: Investment Concern**
1. Complete onboarding with:
   - Financial concerns: "Don't know how to invest"
2. Ask: "Tôi cảm thấy lo lắng về tài chính"
3. **Expected**: Response should address investment concerns, offer basic investment guidance, suggest starting with safe options

**Verification**: Responses should address the specific concern chosen during onboarding.

---

### Test Case 5: Communication Style - Brief vs Detailed

**Account 1: Brief**
1. Complete onboarding with:
   - Communication style: "Brief & Direct"
2. Ask: "Làm sao để tiết kiệm tiền?"
3. **Expected**: Very short response (1-2 sentences), straight to the point

**Account 2: Detailed**
1. Complete onboarding with:
   - Communication style: "Detailed & Explanatory"
2. Ask: "Làm sao để tiết kiệm tiền?"
3. **Expected**: Longer response with comprehensive explanation, may include examples

**Verification**: Brief response should be noticeably shorter than detailed response.

---

### Test Case 6: Age Range Context

**Account 1: 18-25 (Young Adult)**
1. Complete onboarding with:
   - Age range: "18-25"
   - Income level: "Student"
2. Ask: "Tôi nên làm gì với tiền tiết kiệm?"
3. **Expected**: Advice about building good financial habits early, small savings, learning about investments

**Account 2: 46-55 (Pre-retirement)**
1. Complete onboarding with:
   - Age range: "46-55"
   - Income level: "Upper middle"
2. Ask: "Tôi nên làm gì với tiền tiết kiệm?"
3. **Expected**: Advice about retirement preparation, optimizing investments, reducing debt

**Verification**: Responses should be age-appropriate and reflect different life stages.

---

### Test Case 7: No Personalization (Legacy User)

**Account: User who hasn't completed personalization**
1. Sign in with an account that existed before personalization feature
2. OR: Manually set `has_completed_personalization = false` in database
3. Go to Chat tab
4. Ask any question
5. **Expected**: Generic response using default tone (friendly, helpful, moderate length)

**Verification**: This ensures backward compatibility for users who skip personalization.

---

## Quick Verification Checklist

Use this checklist to quickly verify personalization is working:

- [ ] **Edge Function Deployed**: Latest version is live on Supabase
- [ ] **Database Migration Applied**: Check `has_completed_personalization` column exists in profiles table
- [ ] **ChatInterface Fetches Data**: Check browser console for no errors when loading chat
- [ ] **AI Service Passes Data**: Verify `userPersonalization` parameter is included in API calls
- [ ] **Different Responses**: Same question from 2 accounts with different settings produces different responses
- [ ] **Communication Style Works**: Casual vs Professional produces noticeably different tones
- [ ] **Knowledge Level Works**: Beginner vs Advanced produces different complexity levels
- [ ] **Goals Reflected**: Responses mention or align with selected financial goals
- [ ] **Concerns Addressed**: Responses acknowledge and address selected financial concerns
- [ ] **Backward Compatible**: Users without personalization still get working chatbot responses

---

## Debugging Checklist

If personalization isn't working:

### 1. Check Edge Function Deployment

```bash
# Check deployment status
npx supabase functions list

# Check function logs
npx supabase functions logs chat-gemini

# Redeploy if needed
npx supabase functions deploy chat-gemini
```

### 2. Check Database

```sql
-- Verify personalization data exists
SELECT
  id,
  financial_goals,
  financial_knowledge,
  communication_style,
  has_completed_personalization
FROM profiles
WHERE id = 'your-user-id';
```

### 3. Check ChatInterface

Open browser developer console:
- Look for "Error fetching user personalization" messages
- Verify `userPersonalization` object is not undefined in component state

### 4. Check Edge Function Request

In browser console:
- Go to Network tab
- Filter by "chat-gemini"
- Check request payload includes `userPersonalization` object
- Check response includes personalized content

### 5. Check Gemini API

In Supabase Edge Function logs:
- Look for errors from Gemini API
- Verify `systemContext` is being built correctly (add console.log if needed)

---

## Manual Testing Script

For comprehensive testing, run through these steps with 2 different accounts:

**Account A: Casual Beginner**
- Communication: Casual
- Knowledge: Beginner
- Goals: Track spending, Emergency fund
- Concerns: Overspending, Not saving
- Age: 18-25
- Income: Student
- Family: Single

**Account B: Professional Advanced**
- Communication: Professional
- Knowledge: Advanced
- Goals: Investment, Retirement
- Concerns: Investment strategy, Retirement planning
- Age: 36-45
- Income: Upper middle
- Family: Partnered with kids

**Questions to Ask:**
1. "Tôi nên tiết kiệm như thế nào?" (How should I save?)
2. "Đầu tư là gì?" (What is investment?)
3. "Tôi lo lắng về tài chính" (I'm worried about finances)
4. "Làm sao để kiểm soát chi tiêu?" (How to control spending?)
5. "Tôi nên làm gì để có tương lai tốt hơn?" (What should I do for a better future?)

Compare all responses between Account A and Account B. They should be clearly different in:
- **Tone**: Casual vs Professional
- **Complexity**: Simple vs Sophisticated
- **Focus**: Spending control vs Investment strategy
- **Context**: Student life vs Family planning

---

## Success Criteria

The personalization feature is working correctly if:

1. ✅ **Distinct Responses**: Same question produces noticeably different responses across different personalization settings
2. ✅ **Appropriate Tone**: Communication style is reflected in response tone (casual vs professional vs brief vs detailed)
3. ✅ **Knowledge Adaptation**: Beginner gets simpler explanations, Advanced gets more sophisticated content
4. ✅ **Goal Alignment**: Responses mention or support user's selected financial goals
5. ✅ **Concern Acknowledgment**: Responses address user's specific financial concerns
6. ✅ **Contextual Advice**: Age, income, and family situation influence the advice given
7. ✅ **Backward Compatibility**: Users without personalization still get functional responses
8. ✅ **No Errors**: No console errors, no database errors, no API failures

---

## Example Expected Responses

### Example 1: "Tôi nên tiết kiệm như thế nào?"

**Casual Beginner (18-25, Student):**
> "Bạn có thể bắt đầu bằng cách dành ra một ít tiền mỗi tháng, dù chỉ là 50k-100k! 💰 Thử theo dõi chi tiêu hàng ngày để biết mình tiêu nhiều nhất vào đâu, rồi từ đó cắt giảm những khoản không cần thiết nhé. Bạn làm tốt lắm khi bắt đầu suy nghĩ về tiết kiệm từ sớm đấy! 🌟"

**Professional Advanced (36-45, Upper Middle, Partnered with Kids):**
> "Với mục tiêu đầu tư và chuẩn bị hưu trí, tôi khuyên bạn nên xây dựng một kế hoạch tài chính dài hạn. Tối ưu hóa danh mục đầu tư của bạn bằng cách phân bổ tài sản hợp lý, cân nhắc đầu tư vào quỹ hưu trí và quỹ giáo dục cho con. Đồng thời, hãy duy trì quỹ dự phòng ít nhất 6 tháng chi tiêu."

**Note the differences:**
- Tone: Casual with emojis vs Professional without emojis
- Language: "Bạn", "nhé" vs formal Vietnamese
- Complexity: Basic budgeting vs portfolio optimization
- Context: Student savings vs family financial planning

---

## Reporting Issues

If you find issues during testing:

1. Document the issue:
   - Which test case failed
   - User personalization settings used
   - Question asked
   - Expected vs actual response
   - Any console errors

2. Check logs:
   - Browser console logs
   - Edge Function logs in Supabase
   - Network requests/responses

3. Share details for debugging

---

## Next Steps After Testing

Once personalization is verified working:

1. ✅ Test with real users
2. ✅ Collect feedback on response quality
3. ✅ Monitor Edge Function usage and costs
4. ✅ Consider adding more personalization options in future
5. ✅ Document any discovered edge cases

---

**Last Updated**: January 2025
**Feature Version**: 1.0
