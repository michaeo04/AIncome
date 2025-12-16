// Chat Interface - Main chat UI with messages and input

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { Category, UserPersonalization } from '../../types';
import {
  classifyIntent,
  parseTransactionWithAI,
  parseTransactionFallback,
  chatWithGemini,
  getFinancialAdvice,
} from '../../services/aiService';
import { refreshMyAnalytics } from '../../services/financialAnalyticsService';
import { checkSpendingWarning } from '../../services/goalAllocationService';
import TransactionConfirmationCard from './TransactionConfirmationCard';
import FormattedText from './FormattedText';
import SpendingWarningModal from '../goals/SpendingWarningModal';
import { supabase } from '../../services/supabase';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

interface ChatInterfaceProps {
  onTransactionSaved: () => void;
  onEditTransaction?: (transaction: any) => void;
  onCreateCategory?: (suggestedName: string, type: 'income' | 'expense') => void;
}

const ChatInterface = forwardRef<any, ChatInterfaceProps>((props, ref) => {
  const { onTransactionSaved, onEditTransaction, onCreateCategory } = props;
  const { user } = useAuthStore();
  const {
    messages,
    isProcessing,
    addUserMessage,
    addAssistantMessage,
    setProcessing,
    clearChat,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('VND');
  const [userPersonalization, setUserPersonalization] = useState<UserPersonalization | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false); // Start hidden, toggle with button
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set()); // Track saved transaction cards
  const scrollViewRef = useRef<ScrollView>(null);

  // Spending warning modal state
  const [showSpendingWarning, setShowSpendingWarning] = useState(false);
  const [spendingWarningData, setSpendingWarningData] = useState({
    netBalanceAfter: 0,
    allocatedBalance: 0,
    deficit: 0,
  });
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);

  // Expose method to parent component via ref
  useImperativeHandle(ref, () => ({
    markTransactionAsSaved: (transaction: any) => {
      // Mark the transaction card as saved using its messageId
      if (transaction.messageId) {
        setSavedMessageIds(prev => new Set(prev).add(transaction.messageId));
      }
    },
  }));

  // Fetch categories, currency, and personalization on mount
  useEffect(() => {
    fetchCategories();
    fetchCurrency();
    fetchUserPersonalization();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const fetchCategories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCurrency = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setCurrency(data.currency);
    } catch (error: any) {
      console.error('Error fetching currency:', error);
    }
  };

  const fetchUserPersonalization = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('financial_goals, financial_knowledge, communication_style, age_range, financial_concerns, income_level, family_situation, has_completed_personalization')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data && data.has_completed_personalization) {
        // Only use personalization if user has completed it
        setUserPersonalization({
          financial_goals: data.financial_goals || [],
          financial_knowledge: data.financial_knowledge,
          communication_style: data.communication_style,
          age_range: data.age_range,
          financial_concerns: data.financial_concerns || [],
          income_level: data.income_level,
          family_situation: data.family_situation,
          has_completed_personalization: data.has_completed_personalization,
        });
      }
    } catch (error: any) {
      console.error('Error fetching user personalization:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    const message = inputText.trim();
    setInputText('');

    // Add user message to chat
    addUserMessage(message);

    // Set processing state
    setProcessing(true);

    try {
      // Classify intent
      const intentResult = classifyIntent(message);

      if (intentResult.intent === 'small_talk') {
        // Handle casual conversation with Gemini AI (with personalization)
        const chatResult = await chatWithGemini(message, messages, userPersonalization);

        if (chatResult.success && chatResult.reply) {
          addAssistantMessage(chatResult.reply);
        } else {
          // Fallback if AI fails
          addAssistantMessage(
            'Xin lỗi, mình đang gặp chút vấn đề. Bạn có thể thử lại không? 😊'
          );
        }

        setProcessing(false);
        return;
      }

      if (intentResult.intent === 'financial_advice') {
        // Handle financial advice request
        addAssistantMessage('📊 Để mình phân tích tài chính của bạn...');

        try {
          const advice = await getFinancialAdvice(user!.id, message, userPersonalization);
          addAssistantMessage(advice);
        } catch (error) {
          console.error('Error getting financial advice:', error);
          addAssistantMessage(
            'Xin lỗi, mình đang gặp sự cố khi phân tích tài chính. Vui lòng thử lại sau. 😊'
          );
        }

        setProcessing(false);
        return;
      }

      if (intentResult.intent === 'create_transaction') {
        // Parse transaction(s)
        addAssistantMessage('Đang phân tích...');

        // Try AI parsing first
        const aiResult = await parseTransactionWithAI(message, user!.id, categories);

        let parsedTransactions: any = null;

        if (aiResult.success && aiResult.transactions) {
          parsedTransactions = aiResult.transactions;
        } else if (aiResult.success && aiResult.transaction) {
          // Single transaction from AI
          parsedTransactions = aiResult.transaction;
        } else {
          // Fallback to rule-based parser
          console.log('AI parsing failed, using fallback');
          parsedTransactions = parseTransactionFallback(message, categories);
        }

        if (parsedTransactions) {
          // Check if multiple or single
          const isMultiple = Array.isArray(parsedTransactions);
          const count = isMultiple ? parsedTransactions.length : 1;

          // Show confirmation card(s)
          const confirmMessage = isMultiple
            ? `Mình đã hiểu ${count} giao dịch! Hãy kiểm tra thông tin và xác nhận nhé:`
            : 'Mình đã hiểu! Hãy kiểm tra thông tin và xác nhận nhé:';

          addAssistantMessage(confirmMessage, parsedTransactions);
        } else {
          addAssistantMessage(
            'Xin lỗi, mình không thể hiểu thông tin giao dịch. Bạn có thể thử lại với các thông tin rõ ràng hơn như: "Ăn phở 50k" hoặc "Nhận lương 15 triệu"?\n\nĐể nhập nhiều giao dịch, bạn có thể viết:\n- Ăn phở 30k, cafe 50k\n- Hoặc mỗi giao dịch một dòng'
          );
        }

        setProcessing(false);
        return;
      }

      // Unknown intent - treat as general conversation (with personalization)
      const chatResult = await chatWithGemini(message, messages, userPersonalization);

      if (chatResult.success && chatResult.reply) {
        addAssistantMessage(chatResult.reply);
      } else {
        // Fallback if AI fails
        addAssistantMessage(
          'Mình chưa hiểu rõ ý bạn. Bạn muốn thêm giao dịch hay chỉ đơn giản là trò chuyện? Nếu muốn thêm giao dịch, hãy nói rõ số tiền và loại chi tiêu nhé! 😊'
        );
      }

      setProcessing(false);

    } catch (error: any) {
      console.error('Error processing message:', error);
      addAssistantMessage(
        'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.'
      );
      setProcessing(false);
    }
  };

  const handleConfirmTransaction = async (transactionData: any, messageId: string) => {
    if (!user) return;

    // Validate category_id before saving
    if (!transactionData.category_id || transactionData.category_id === '') {
      addAssistantMessage(
        '❌ Lỗi: Không tìm thấy hạng mục phù hợp. Vui lòng thử lại với thông tin rõ ràng hơn hoặc chuyển sang tab "📝 Form" để chọn hạng mục thủ công.'
      );
      return;
    }

    setIsSaving(true);

    // Check spending warning for expenses
    if (transactionData.type === 'expense') {
      const warning = await checkSpendingWarning(user.id, transactionData.amount);
      if (warning.shouldWarn) {
        setSpendingWarningData({
          netBalanceAfter: warning.netBalanceAfter,
          allocatedBalance: warning.allocatedBalance,
          deficit: warning.deficit,
        });
        setPendingTransaction({ ...transactionData, messageId });
        setShowSpendingWarning(true);
        setIsSaving(false);
        return; // Stop here, let user decide via modal
      }
    }

    // Proceed with saving
    await proceedWithSave(transactionData, messageId);
  };

  const proceedWithSave = async (transactionData: any, messageId?: string) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          type: transactionData.type,
          amount: transactionData.amount,
          category_id: transactionData.category_id,
          note: transactionData.note,
          date: transactionData.date,
        }]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Mark transaction card as saved
      if (messageId) {
        setSavedMessageIds(prev => new Set(prev).add(messageId));
      }

      addAssistantMessage('✅ Đã lưu giao dịch thành công!');
      setIsSaving(false);

      // Refresh analytics after adding transaction (fallback if trigger doesn't work)
      console.log('📊 Refreshing analytics after chatbot transaction...');
      refreshMyAnalytics().then(result => {
        if (result.success) {
          console.log('✓ Analytics refreshed from chatbot:', result.message);
        } else {
          console.warn('⚠️ Failed to refresh analytics from chatbot:', result.message);
        }
      }).catch(err => {
        console.error('❌ Error refreshing analytics from chatbot:', err);
      });

      // Notify parent to refresh
      setTimeout(() => {
        onTransactionSaved();
      }, 1000);

    } catch (error: any) {
      console.error('Error saving transaction:', error);

      // Provide more helpful error messages
      let errorMessage = 'Không thể lưu giao dịch. ';
      if (error.code === '22P02') {
        errorMessage += 'Hạng mục không hợp lệ. Vui lòng thử lại hoặc chuyển sang tab "📝 Form".';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Vui lòng thử lại.';
      }

      addAssistantMessage(`❌ ${errorMessage}`);
      setIsSaving(false);
    }
  };

  const handleEditTransaction = (transaction: any, messageId?: string) => {
    if (onEditTransaction) {
      // Add messageId to transaction for tracking
      const transactionWithId = { ...transaction, messageId };
      // Call parent callback to switch to form tab and pre-fill
      onEditTransaction(transactionWithId);
    } else {
      // Fallback message if callback not provided
      addAssistantMessage(
        'Để chỉnh sửa, bạn có thể chuyển sang tab "📝 Form" hoặc nói lại thông tin giao dịch với chi tiết rõ ràng hơn nhé!'
      );
    }
  };

  const handleCancelTransaction = () => {
    addAssistantMessage(
      'Đã hủy giao dịch này. Bạn có thể nói về giao dịch khác! 😊'
    );
  };

  const handleConfirmSingleTransaction = async (transactionData: any, messageId: string, index: number) => {
    if (!user) return;

    // Validate category_id before saving
    if (!transactionData.category_id || transactionData.category_id === '') {
      addAssistantMessage(
        `❌ Lỗi giao dịch #${index + 1}: Không tìm thấy hạng mục phù hợp. Vui lòng thử lại.`
      );
      return;
    }

    setIsSaving(true);

    // Check spending warning for expenses
    if (transactionData.type === 'expense') {
      const warning = await checkSpendingWarning(user.id, transactionData.amount);
      if (warning.shouldWarn) {
        setSpendingWarningData({
          netBalanceAfter: warning.netBalanceAfter,
          allocatedBalance: warning.allocatedBalance,
          deficit: warning.deficit,
        });
        setPendingTransaction({ ...transactionData, messageId, index });
        setShowSpendingWarning(true);
        setIsSaving(false);
        return; // Stop here, let user decide via modal
      }
    }

    // Proceed with saving
    await proceedWithSaveSingle(transactionData, messageId, index);
  };

  const proceedWithSaveSingle = async (transactionData: any, messageId: string, index: number) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          type: transactionData.type,
          amount: transactionData.amount,
          category_id: transactionData.category_id,
          note: transactionData.note,
          date: transactionData.date,
        }]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Mark transaction card as saved (composite key for multiple transactions)
      setSavedMessageIds(prev => new Set(prev).add(`${messageId}-${index}`));

      addAssistantMessage(`✅ Đã lưu giao dịch #${index + 1} thành công!`);
      setIsSaving(false);

      // Notify parent to refresh
      setTimeout(() => {
        onTransactionSaved();
      }, 500);

    } catch (error: any) {
      console.error('Error saving transaction:', error);
      addAssistantMessage(`❌ Không thể lưu giao dịch #${index + 1}. Vui lòng thử lại.`);
      setIsSaving(false);
    }
  };

  const handleCancelSingleTransaction = (messageId: string, index: number) => {
    addAssistantMessage(
      `Đã hủy giao dịch #${index + 1}. Các giao dịch khác vẫn có thể được lưu! 😊`
    );
  };

  // Spending Warning Modal Handlers
  const handleGoToGoals = () => {
    setShowSpendingWarning(false);
    setPendingTransaction(null);
    addAssistantMessage(
      '💡 Hãy vào tab Savings để quản lý tiền đã phân bổ cho các mục tiêu nhé! Sau đó bạn có thể quay lại để lưu giao dịch.'
    );
  };

  const handleContinueAnyway = async () => {
    setShowSpendingWarning(false);
    if (pendingTransaction) {
      if (pendingTransaction.index !== undefined) {
        // Single transaction from bulk
        await proceedWithSaveSingle(pendingTransaction, pendingTransaction.messageId, pendingTransaction.index);
      } else {
        // Regular transaction
        await proceedWithSave(pendingTransaction, pendingTransaction.messageId);
      }
    }
    setPendingTransaction(null);
  };

  const handleCancelWarning = () => {
    setShowSpendingWarning(false);
    setPendingTransaction(null);
    addAssistantMessage('Đã hủy giao dịch này. Bạn có thể nói về giao dịch khác! 😊');
  };

  const handleQuickAction = async (displayMessage: string, actualPrompt?: string) => {
    // Show short display message to user
    addUserMessage(displayMessage);

    // Set processing state
    setProcessing(true);

    try {
      // Use actualPrompt for processing, or displayMessage if no actualPrompt provided
      const promptToSend = actualPrompt || displayMessage;

      // Financial advice (quick actions always request financial advice)
      addAssistantMessage('📊 Để mình phân tích tài chính của bạn...');

      const advice = await getFinancialAdvice(user!.id, promptToSend, userPersonalization);
      addAssistantMessage(advice);
    } catch (error) {
      console.error('Error getting financial advice:', error);
      addAssistantMessage('Xin lỗi, mình đang gặp chút vấn đề khi phân tích. Bạn có thể thử lại không? 😊');
    }

    setProcessing(false);
  };

  const toggleQuickActions = () => {
    setShowQuickActions(!showQuickActions);
  };

  const handleConfirmAllTransactions = async (transactions: any[]) => {
    if (!user) return;

    // Validate all transactions
    const invalidTransactions = transactions.filter(t => !t.category_id || t.category_id === '');
    if (invalidTransactions.length > 0) {
      addAssistantMessage(
        `❌ Có ${invalidTransactions.length} giao dịch thiếu hạng mục. Vui lòng kiểm tra lại.`
      );
      return;
    }

    setIsSaving(true);

    try {
      const transactionsToInsert = transactions.map(t => ({
        user_id: user.id,
        type: t.type,
        amount: t.amount,
        category_id: t.category_id,
        note: t.note,
        date: t.date,
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      addAssistantMessage(`✅ Đã lưu ${transactions.length} giao dịch thành công!`);
      setIsSaving(false);

      // Refresh analytics after adding transactions (fallback if trigger doesn't work)
      console.log('📊 Refreshing analytics after bulk chatbot transactions...');
      refreshMyAnalytics().then(result => {
        if (result.success) {
          console.log('✓ Analytics refreshed from chatbot bulk save:', result.message);
        } else {
          console.warn('⚠️ Failed to refresh analytics from chatbot bulk save:', result.message);
        }
      }).catch(err => {
        console.error('❌ Error refreshing analytics from chatbot bulk save:', err);
      });

      // Notify parent to refresh
      setTimeout(() => {
        onTransactionSaved();
      }, 1000);

    } catch (error: any) {
      console.error('Error saving transactions:', error);
      addAssistantMessage(`❌ Không thể lưu các giao dịch. Vui lòng thử lại.`);
      setIsSaving(false);
    }
  };

  const renderMessage = (message: any) => {
    const isUser = message.role === 'user';

    // Handle multiple transactions
    if (message.type === 'confirmation' && message.parsedTransactions && Array.isArray(message.parsedTransactions)) {
      return (
        <View key={message.id} style={styles.messageWrapper}>
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <FormattedText text={message.content} style={styles.assistantText} />
          </View>
          {message.parsedTransactions.map((transaction: any, index: number) => (
            <TransactionConfirmationCard
              key={`${message.id}-transaction-${index}`}
              transaction={transaction}
              currency={currency}
              onEdit={() => handleEditTransaction(transaction, `${message.id}-${index}`)}
              onCancel={() => handleCancelSingleTransaction(message.id, index)}
              onConfirm={() => handleConfirmSingleTransaction(transaction, message.id, index)}
              isLoading={isSaving}
              isSaved={savedMessageIds.has(`${message.id}-${index}`)}
              onCreateCategory={onCreateCategory}
            />
          ))}
          {/* Bulk save button for multiple transactions */}
          <TouchableOpacity
            style={styles.bulkSaveButton}
            onPress={() => handleConfirmAllTransactions(message.parsedTransactions)}
            disabled={isSaving}
          >
            <Text style={styles.bulkSaveButtonText}>
              {isSaving ? '⏳ Đang lưu...' : `✅ Lưu tất cả (${message.parsedTransactions.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Handle single transaction
    if (message.type === 'confirmation' && message.parsedTransaction) {
      return (
        <View key={message.id} style={styles.messageWrapper}>
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <FormattedText text={message.content} style={styles.assistantText} />
          </View>
          <TransactionConfirmationCard
            transaction={message.parsedTransaction}
            currency={currency}
            onEdit={() => handleEditTransaction(message.parsedTransaction, message.id)}
            onCancel={handleCancelTransaction}
            onConfirm={() => handleConfirmTransaction(message.parsedTransaction, message.id)}
            isLoading={isSaving}
            isSaved={savedMessageIds.has(message.id)}
            onCreateCategory={onCreateCategory}
          />
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageWrapper,
          isUser ? styles.userMessageWrapper : styles.assistantMessageWrapper,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {isUser ? (
            <Text style={styles.userText}>
              {message.content}
            </Text>
          ) : (
            <FormattedText
              text={message.content}
              style={styles.assistantText}
            />
          )}
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(renderMessage)}

        {isProcessing && (
          <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Action Buttons - Toggleable */}
      {showQuickActions && (
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsHeader}>
            <Text style={styles.quickActionsTitle}>💡 Hỏi nhanh về tài chính:</Text>
            <TouchableOpacity onPress={toggleQuickActions} style={styles.closeQuickActions}>
              <Text style={styles.closeQuickActionsText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(
                '📊 Sức khỏe tài chính của tôi',
                'Phân tích **sức khỏe tài chính tổng quan** từ dữ liệu AIncome của tôi. Đánh giá **điểm sức khỏe tài chính**, số dư hiện tại, tỷ lệ tiết kiệm so với chuẩn mực 15-20%. Cho tôi biết tôi đang làm tốt ở đâu và **hành động cụ thể** nào cần làm trong app (tạo ngân sách, đặt mục tiêu tiết kiệm). Dựa trên mục tiêu và mối quan tâm tài chính mà tôi đã đặt ra.'
              )}
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>Sức khỏe tài chính</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(
                '💸 Tiền tôi đang tiêu vào đâu?',
                'Phân tích **top 5 danh mục chi tiêu** từ giao dịch trong AIncome. Cho tôi biết từng danh mục chiếm bao nhiêu % tổng chi tiêu, so sánh với tháng trước. Chỉ ra danh mục nào đang **vượt ngân sách** hoặc cần kiểm soát. Gợi ý tôi **tạo/điều chỉnh ngân sách** trong app cho những danh mục này. Phù hợp với mối quan tâm tài chính của tôi.'
              )}
            >
              <Text style={styles.quickActionIcon}>💸</Text>
              <Text style={styles.quickActionText}>Phân tích chi tiêu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(
                '🎯 Cần tiết kiệm bao nhiêu?',
                'Dựa vào **tỷ lệ tiết kiệm hiện tại** và **mục tiêu tài chính** tôi đã chọn, tư vấn tôi nên tiết kiệm bao nhiêu/tháng. Phân tích danh mục chi tiêu nào có thể cắt giảm từ dữ liệu app. Gợi ý tôi **tạo mục tiêu tiết kiệm** trong AIncome với số tiền cụ thể. Tính toán xem bao lâu đạt được mục tiêu. Phù hợp với thu nhập và tình trạng gia đình của tôi.'
              )}
            >
              <Text style={styles.quickActionIcon}>🎯</Text>
              <Text style={styles.quickActionText}>Kế hoạch tiết kiệm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(
                '📈 Báo cáo tháng này',
                'Tóm tắt **tài chính tháng này** từ AIncome: tổng thu, tổng chi, tiết kiệm được bao nhiêu. So sánh với **trung bình 3 tháng** và tháng trước - tăng/giảm bao nhiêu %. Đánh giá **tình trạng ngân sách** (bao nhiêu vượt mức, cảnh báo). Phân tích **quỹ dự phòng** hiện tại đủ mấy tháng. Đưa ra **3 hành động** cụ thể cần làm trong app tuần tới.'
              )}
            >
              <Text style={styles.quickActionIcon}>📈</Text>
              <Text style={styles.quickActionText}>Tóm tắt tháng này</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => handleQuickAction(
                '📉 Xu hướng 3 tháng',
                'Phân tích **xu hướng thu chi 3 tháng** gần đây từ lịch sử AIncome. Thu nhập và chi tiêu đang tăng/giảm/ổn định? Danh mục nào tăng mạnh nhất? **Tỷ lệ tiết kiệm** có cải thiện không? Cảnh báo nếu có dấu hiệu chi tiêu vượt kiểm soát hoặc thu nhập giảm. Gợi ý **điều chỉnh ngân sách** dựa trên xu hướng này.'
              )}
            >
              <Text style={styles.quickActionIcon}>📉</Text>
              <Text style={styles.quickActionText}>Xu hướng 3 tháng</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.quickActionsToggle}
          onPress={toggleQuickActions}
        >
          <Text style={styles.quickActionsToggleText}>💡</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            Alert.alert(
              'Xóa cuộc trò chuyện',
              'Bạn có chắc muốn xóa toàn bộ cuộc trò chuyện?',
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', style: 'destructive', onPress: clearChat },
              ]
            );
          }}
        >
          <Text style={styles.clearButtonText}>🗑️</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={COLORS.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={200}
          editable={!isProcessing}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isProcessing) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isProcessing}
        >
          <Text style={styles.sendButtonText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Spending Warning Modal */}
      <SpendingWarningModal
        visible={showSpendingWarning}
        netBalanceAfter={spendingWarningData.netBalanceAfter}
        allocatedBalance={spendingWarningData.allocatedBalance}
        deficit={spendingWarningData.deficit}
        currency={currency}
        onClose={handleCancelWarning}
        onGoToGoals={handleGoToGoals}
        onContinueAnyway={handleContinueAnyway}
      />
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.md,
  },
  messageWrapper: {
    marginBottom: SPACING.md,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
  },
  userText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textWhite,
    lineHeight: 20,
  },
  assistantText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  clearButton: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  clearButtonText: {
    fontSize: FONT_SIZE.xl,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    padding: SPACING.sm,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: FONT_SIZE.xxl,
  },
  bulkSaveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  bulkSaveButtonText: {
    color: COLORS.textWhite,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  quickActionsContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.sm,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  quickActionsTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold as any,
    color: COLORS.textSecondary,
  },
  closeQuickActions: {
    padding: SPACING.xs,
  },
  closeQuickActionsText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textTertiary,
    fontWeight: FONT_WEIGHT.bold as any,
  },
  quickActionsToggle: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  quickActionsToggleText: {
    fontSize: FONT_SIZE.xl,
  },
  quickActionsScroll: {
    flexGrow: 0,
  },
  quickActionButton: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  quickActionIcon: {
    fontSize: FONT_SIZE.xl,
    marginBottom: SPACING.xs,
  },
  quickActionText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium as any,
    textAlign: 'center',
  },
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;
