// Chat Interface - Main chat UI with messages and input

import React, { useState, useRef, useEffect } from 'react';
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
import { classifyIntent } from '../../utils/intentClassifier';
import { parseTransactionWithAI, parseTransactionFallback, chatWithGemini } from '../../services/aiService';
import TransactionConfirmationCard from './TransactionConfirmationCard';
import { supabase } from '../../services/supabase';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

interface ChatInterfaceProps {
  onTransactionSaved: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onTransactionSaved }) => {
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
  const scrollViewRef = useRef<ScrollView>(null);

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

  const handleConfirmTransaction = async (transactionData: any) => {
    if (!user) return;

    // Validate category_id before saving
    if (!transactionData.category_id || transactionData.category_id === '') {
      addAssistantMessage(
        '❌ Lỗi: Không tìm thấy hạng mục phù hợp. Vui lòng thử lại với thông tin rõ ràng hơn hoặc chuyển sang tab "📝 Form" để chọn hạng mục thủ công.'
      );
      return;
    }

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

      addAssistantMessage('✅ Đã lưu giao dịch thành công!');
      setIsSaving(false);

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

  const handleEditTransaction = () => {
    addAssistantMessage(
      'Để chỉnh sửa, bạn có thể chuyển sang tab "📝 Form" hoặc nói lại thông tin giao dịch với chi tiết rõ ràng hơn nhé!'
    );
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
            <Text style={styles.assistantText}>{message.content}</Text>
          </View>
          {message.parsedTransactions.map((transaction: any, index: number) => (
            <TransactionConfirmationCard
              key={`${message.id}-transaction-${index}`}
              transaction={transaction}
              currency={currency}
              onEdit={handleEditTransaction}
              onCancel={() => handleCancelSingleTransaction(message.id, index)}
              onConfirm={() => handleConfirmSingleTransaction(transaction, message.id, index)}
              isLoading={isSaving}
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
            <Text style={styles.assistantText}>{message.content}</Text>
          </View>
          <TransactionConfirmationCard
            transaction={message.parsedTransaction}
            currency={currency}
            onEdit={handleEditTransaction}
            onCancel={handleCancelTransaction}
            onConfirm={() => handleConfirmTransaction(message.parsedTransaction)}
            isLoading={isSaving}
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
          <Text style={isUser ? styles.userText : styles.assistantText}>
            {message.content}
          </Text>
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
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

      {/* Input */}
      <View style={styles.inputContainer}>
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
    </KeyboardAvoidingView>
  );
};

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
    paddingBottom: SPACING.lg,
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
});

export default ChatInterface;
