-- ========================================
-- SEED DEFAULT CATEGORIES
-- ========================================

-- Insert default income categories (user_id = NULL means available for all users)
INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
(NULL, 'Lương', 'income', '💰', '#10B981', true),
(NULL, 'Thưởng', 'income', '🎁', '#059669', true),
(NULL, 'Đầu tư', 'income', '📈', '#34D399', true),
(NULL, 'Công việc thêm', 'income', '💼', '#6EE7B7', true),
(NULL, 'Thu nhập khác', 'income', '🎯', '#A7F3D0', true);

-- Insert default expense categories
INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
(NULL, 'Ăn uống', 'expense', '🍔', '#EF4444', true),
(NULL, 'Đi lại', 'expense', '🚗', '#F97316', true),
(NULL, 'Mua sắm', 'expense', '🛒', '#F59E0B', true),
(NULL, 'Giải trí', 'expense', '🎮', '#EC4899', true),
(NULL, 'Sức khỏe', 'expense', '💊', '#DC2626', true),
(NULL, 'Nhà cửa', 'expense', '🏠', '#7C3AED', true),
(NULL, 'Giáo dục', 'expense', '📚', '#2563EB', true),
(NULL, 'Gia đình', 'expense', '👨‍👩‍👧', '#8B5CF6', true),
(NULL, 'Hóa đơn & Dịch vụ', 'expense', '📱', '#0EA5E9', true),
(NULL, 'Chăm sóc cá nhân', 'expense', '💇', '#06B6D4', true),
(NULL, 'Quà tặng', 'expense', '🎁', '#14B8A6', true),
(NULL, 'Chi phí khác', 'expense', '📦', '#64748B', true);
