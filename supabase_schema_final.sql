-- Supabase SQL Schema for SOLVIX - Copy and paste this into Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kakao_id VARCHAR(50) UNIQUE NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  profile_image_url TEXT,
  provider VARCHAR(20) DEFAULT 'kakao',
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- User subscriptions (current plan)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('basic','pro','ultra')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','cancelled','expired')),
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User usage (daily usage/bonus questions)
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  daily_count INT DEFAULT 0,
  max_daily_count INT DEFAULT 5,
  bonus_questions INT DEFAULT 0,
  total_questions_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- User conversations (Q&A history)
CREATE TABLE IF NOT EXISTS public.user_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user','assistant')),
  message_content TEXT NOT NULL,
  image_url TEXT,
  model_used VARCHAR(50),
  style_used VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin actions (bonus questions/plan changes log)
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('give_bonus_questions','change_plan','suspend_user','activate_user')),
  action_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_kakao_id ON public.users(kakao_id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_sub_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON public.user_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_conv_user ON public.user_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions(target_user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_usage_updated BEFORE UPDATE ON public.user_usage
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see their own data
CREATE POLICY users_self_select ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY users_self_update ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Admins can see all users
CREATE POLICY users_admin_select ON public.users
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- Usage policies
CREATE POLICY usage_self_all ON public.user_usage
  FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY usage_admin_select ON public.user_usage
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- Subscription policies
CREATE POLICY subs_self_all ON public.user_subscriptions
  FOR ALL USING (auth.uid()::text = user_id::text);
CREATE POLICY subs_admin_select ON public.user_subscriptions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- Conversation policies
CREATE POLICY conv_self_insert ON public.user_conversations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY conv_self_select ON public.user_conversations
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY conv_admin_select ON public.user_conversations
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- Admin actions policies (only admins)
CREATE POLICY admin_actions_admin_only ON public.admin_actions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- System settings policies (only admins)
CREATE POLICY settings_admin_only ON public.system_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- Helper functions
CREATE OR REPLACE FUNCTION create_user_from_kakao(
  p_kakao_id VARCHAR(50),
  p_nickname VARCHAR(100),
  p_email VARCHAR(255),
  p_profile_image_url TEXT,
  p_is_admin BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO public.users (kakao_id, nickname, email, profile_image_url, is_admin, last_login_at)
  VALUES (p_kakao_id, p_nickname, p_email, p_profile_image_url, p_is_admin, now())
  ON CONFLICT (kakao_id) DO UPDATE
    SET nickname = EXCLUDED.nickname,
        email = EXCLUDED.email,
        profile_image_url = EXCLUDED.profile_image_url,
        last_login_at = now(),
        updated_at = now()
  RETURNING id INTO v_user_id;

  -- 최초 가입자에게 basic 플랜 자동 부여
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = v_user_id) THEN
    INSERT INTO public.user_subscriptions (user_id, plan_type, status)
    VALUES (v_user_id, 'basic', 'active');
  END IF;

  RETURN v_user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_current_plan(p_user_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE v_plan VARCHAR(20);
BEGIN
  SELECT plan_type INTO v_plan
  FROM public.user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY started_at DESC LIMIT 1;

  RETURN COALESCE(v_plan, 'basic');
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_usage_today(p_user_id UUID)
RETURNS TABLE(daily_count INT, max_daily_count INT, bonus_questions INT) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(uu.daily_count,0),
         5, -- 기본 상한, 플랜별 차등을 두려면 별도 로직 추가
         COALESCE(uu.bonus_questions,0)
  FROM public.users u
  LEFT JOIN public.user_usage uu
    ON uu.user_id = u.id
   AND uu.usage_date = CURRENT_DATE
  WHERE u.id = p_user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION give_bonus_questions(p_admin_user_id UUID, p_target_user_id UUID, p_bonus_count INT)
RETURNS BOOLEAN AS $$
DECLARE v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.users WHERE id = p_admin_user_id;
  IF NOT v_is_admin THEN RETURN FALSE; END IF;

  INSERT INTO public.user_usage (user_id, usage_date, daily_count, max_daily_count, bonus_questions, total_questions_used)
  VALUES (p_target_user_id, CURRENT_DATE, 0, 5, p_bonus_count, 0)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET bonus_questions = user_usage.bonus_questions + EXCLUDED.bonus_questions,
        updated_at = now();

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action_type, action_details)
  VALUES (p_admin_user_id, p_target_user_id, 'give_bonus_questions', jsonb_build_object('bonus_count', p_bonus_count));

  RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample admin user (optional - for testing)
-- INSERT INTO public.users (kakao_id, nickname, email, provider, is_admin) VALUES
-- ('admin_kakao_123', '관리자', 'admin@solvix.com', 'kakao', true)
-- ON CONFLICT (kakao_id) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
