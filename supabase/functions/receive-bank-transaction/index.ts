// Supabase Edge Function - Receive Bank Transaction Notification
// ================================================================
// Simulates receiving a bank webhook/SMS notification
// Parses the transaction using existing AI and stores in pending queue

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BankNotificationRequest {
  userId: string; // UUID of user who receives this notification
  smsText: string; // Raw bank SMS text (e.g., "BIDV: -50,000 VND tai Highlands Coffee ngay 11/12/2025")
  bankName?: string; // Bank identifier: 'BIDV', 'VietcomBank', 'Techcombank', 'VPBank'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { userId, smsText, bankName }: BankNotificationRequest = await req.json();

    // Validate required fields
    if (!userId || !smsText) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: userId and smsText are required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Received bank notification for user ${userId} from ${bankName || 'Unknown Bank'}`);
    console.log(`📝 SMS Text: ${smsText}`);

    // Create Supabase client with service role key (bypasses RLS for insertion)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's categories for AI parsing
    console.log('📂 Fetching user categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user categories' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Found ${categories?.length || 0} categories`);

    // Call existing parse-transaction AI function
    console.log('🤖 Calling AI parser...');
    const parseResponse = await fetch(
      `${supabaseUrl}/functions/v1/parse-transaction`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          message: smsText,
          userId: userId,
          categories: categories || [],
        }),
      }
    );

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error('❌ Parse transaction failed:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI parsing failed',
          details: errorText.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = await parseResponse.json();

    if (!parseResult.success || !parseResult.transactions?.[0]) {
      console.error('❌ No transactions parsed from SMS');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse transaction from SMS text'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = parseResult.transactions[0];
    console.log('✅ AI parsed transaction:', {
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category_name,
      confidence: parsed.confidence,
    });

    // Extract merchant name from SMS using common patterns
    const merchant = extractMerchant(smsText);
    console.log(`🏪 Extracted merchant: ${merchant || 'None'}`);

    // Insert into pending_transactions table
    console.log('💾 Inserting into pending_transactions...');
    const { data: pendingTxn, error: insertError } = await supabase
      .from('pending_transactions')
      .insert({
        user_id: userId,
        raw_sms_text: smsText,
        bank_name: bankName,
        parsed_type: parsed.type,
        parsed_amount: parsed.amount,
        parsed_category_id: parsed.category_id,
        parsed_note: parsed.note,
        parsed_date: parsed.date,
        parsed_merchant: merchant,
        confidence: parsed.confidence,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting pending transaction:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database insert failed',
          details: insertError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully created pending transaction:', pendingTxn.id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        pending_transaction: pendingTxn,
        message: 'Transaction queued for user review',
        parsed_details: {
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category_name,
          merchant: merchant,
          confidence: parsed.confidence,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract merchant/vendor name from Vietnamese bank SMS
 * Common patterns:
 * - "tai Highlands Coffee" → "Highlands Coffee"
 * - "mua hang tai Circle K" → "Circle K"
 * - "at Vinmart" → "Vinmart"
 */
function extractMerchant(smsText: string): string | null {
  const patterns = [
    /tai\s+([^0-9\n.]+)/i, // "tai Highlands Coffee"
    /mua\s+hang\s+tai\s+([^0-9\n.]+)/i, // "mua hang tai Circle K"
    /at\s+([^0-9\n.]+)/i, // "at Vinmart"
    /POS\s+([^0-9\n.]+)/i, // "POS Circle K"
  ];

  for (const pattern of patterns) {
    const match = smsText.match(pattern);
    if (match && match[1]) {
      const merchant = match[1].trim();
      // Remove trailing keywords like "ngay", "luc", etc.
      const cleaned = merchant.replace(/\s+(ngay|luc|vao|hom|SD|GD)\s*.*/i, '').trim();
      if (cleaned.length > 2) {
        return cleaned;
      }
    }
  }
  return null;
}

console.log('🚀 receive-bank-transaction Edge Function initialized');
