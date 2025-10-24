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

CREATE TABLE IF NOT EXISTS public.user_question_balance (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  bonus_balance INT DEFAULT 0,
  unlimited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_daily_engagements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance_claimed_at TIMESTAMPTZ,
  attendance_reward_tier VARCHAR(20),
  attendance_reward_amount INT,
  ad_claimed_at TIMESTAMPTZ,
  ad_reward_tier VARCHAR(20),
  ad_reward_amount INT,
  last_prompted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS public.user_lottery_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('attendance', 'ad', 'manual')),
  reward_tier VARCHAR(20) NOT NULL,
  reward_amount INT NOT NULL,
  bonus_balance_after INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- View to expose usage with bonus total for current plan
CREATE OR REPLACE VIEW public.v_user_usage_today AS
SELECT
  uu.user_id,
  uu.usage_date,
  uu.daily_count,
  uu.max_daily_count,
  uu.bonus_questions,
  uu.total_questions_used
FROM public.user_usage uu;

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
CREATE INDEX IF NOT EXISTS idx_daily_engagement_user_date ON public.user_daily_engagements(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_lottery_history_user ON public.user_lottery_history(user_id, created_at DESC);

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

CREATE TRIGGER trg_question_balance_updated BEFORE UPDATE ON public.user_question_balance
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_daily_engagements_updated BEFORE UPDATE ON public.user_daily_engagements
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
ALTER TABLE public.user_daily_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lottery_history ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY usage_self_select ON public.user_usage
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY usage_self_insert ON public.user_usage
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY usage_self_update ON public.user_usage
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY usage_admin_select ON public.user_usage
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));
CREATE POLICY usage_admin_update ON public.user_usage
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

-- Question balance policies
ALTER TABLE public.user_question_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY question_balance_self_select ON public.user_question_balance
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY question_balance_self_update ON public.user_question_balance
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY question_balance_admin_all ON public.user_question_balance
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

CREATE POLICY daily_engagement_self_select ON public.user_daily_engagements
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY daily_engagement_self_insert ON public.user_daily_engagements
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY daily_engagement_self_update ON public.user_daily_engagements
  FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY daily_engagement_admin_all ON public.user_daily_engagements
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

CREATE POLICY lottery_history_self_select ON public.user_lottery_history
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY lottery_history_admin_select ON public.user_lottery_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.is_admin));

DROP VIEW IF EXISTS public.v_user_usage_today;

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
DROP FUNCTION IF EXISTS create_user_from_kakao(VARCHAR, VARCHAR, VARCHAR, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS get_user_current_plan(UUID);
DROP FUNCTION IF EXISTS get_user_plan_daily_limit(UUID);
DROP FUNCTION IF EXISTS get_user_usage_today(UUID);
DROP FUNCTION IF EXISTS increment_user_usage(UUID, INT);
DROP FUNCTION IF EXISTS increment_user_usage(UUID);
DROP FUNCTION IF EXISTS give_bonus_questions(UUID, UUID, INT);
DROP FUNCTION IF EXISTS ensure_daily_engagement_row(UUID);
DROP FUNCTION IF EXISTS claim_daily_reward(UUID, TEXT);

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

  -- 질문 잔고 레코드 초기화
  INSERT INTO public.user_question_balance (user_id, bonus_balance, unlimited)
  VALUES (v_user_id, 5, false)
  ON CONFLICT (user_id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION get_user_plan_daily_limit(p_user_id UUID)
RETURNS TABLE(free_daily INT, unlimited BOOLEAN) AS $$
DECLARE
  v_plan VARCHAR(20);
BEGIN
  v_plan := get_user_current_plan(p_user_id);

  RETURN QUERY
  SELECT CASE v_plan
           WHEN 'pro' THEN 10
           WHEN 'ultra' THEN 0
           ELSE 1
         END AS free_daily,
         (v_plan = 'ultra') AS unlimited;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_usage_today(p_user_id UUID)
RETURNS TABLE(used_today INT, free_daily INT, bonus_balance INT, unlimited BOOLEAN) AS $$
DECLARE
  v_daily_limit RECORD;
  v_balance INT;
  v_unlimited BOOLEAN;
BEGIN
  PERFORM ensure_today_usage_row(p_user_id);

  SELECT * INTO v_daily_limit FROM get_user_plan_daily_limit(p_user_id);
  SELECT q.bonus_balance, q.unlimited
  INTO v_balance, v_unlimited
  FROM public.user_question_balance AS q
  WHERE q.user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_question_balance (user_id, bonus_balance, unlimited)
    VALUES (p_user_id, 0, v_daily_limit.unlimited)
    ON CONFLICT (user_id) DO NOTHING;
    v_balance := 0;
    v_unlimited := v_daily_limit.unlimited;
  ELSE
    v_unlimited := v_unlimited OR v_daily_limit.unlimited;
    IF FOUND THEN
      UPDATE public.user_question_balance
      SET unlimited = v_unlimited,
          updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN QUERY
  SELECT COALESCE(uu.daily_count, 0) AS used_today,
         v_daily_limit.free_daily,
         v_balance,
         v_unlimited
  FROM (SELECT 1) AS seed
  LEFT JOIN public.user_usage uu
    ON uu.user_id = p_user_id
   AND uu.usage_date = CURRENT_DATE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_user_usage(p_user_id UUID, p_increment INT DEFAULT 1)
RETURNS TABLE(
  used_today INT,
  free_daily INT,
  bonus_balance INT,
  unlimited BOOLEAN,
  limit_reached BOOLEAN,
  increment_applied INT
) AS $$
DECLARE
  v_daily_limit RECORD;
  v_usage public.user_usage%ROWTYPE;
  v_plan_remaining INT;
  v_bonus_balance INT;
  v_unlimited BOOLEAN;
  v_plan_used INT := 0;
  v_bonus_used INT := 0;
  v_total_increment INT := p_increment;
BEGIN
  PERFORM ensure_today_usage_row(p_user_id);

  SELECT * INTO v_daily_limit FROM get_user_plan_daily_limit(p_user_id);

  SELECT * INTO v_usage
  FROM public.user_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  SELECT q.bonus_balance, q.unlimited
  INTO v_bonus_balance, v_unlimited
  FROM public.user_question_balance AS q
  WHERE q.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_question_balance (user_id, bonus_balance, unlimited)
    VALUES (p_user_id, 0, v_daily_limit.unlimited)
    RETURNING bonus_balance, unlimited INTO v_bonus_balance, v_unlimited;
  END IF;

  v_unlimited := v_unlimited OR v_daily_limit.unlimited;

  IF v_unlimited THEN
    UPDATE public.user_usage
    SET daily_count = v_usage.daily_count + p_increment,
        total_questions_used = v_usage.total_questions_used + p_increment,
        updated_at = now()
    WHERE id = v_usage.id;

    UPDATE public.user_question_balance
    SET unlimited = TRUE,
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT
      v_usage.daily_count + p_increment,
      v_daily_limit.free_daily,
      v_bonus_balance,
      TRUE,
      FALSE,
      p_increment;
    RETURN;
  END IF;

  v_plan_remaining := GREATEST(v_daily_limit.free_daily - v_usage.daily_count, 0);
  v_plan_used := LEAST(v_plan_remaining, v_total_increment);
  v_total_increment := v_total_increment - v_plan_used;

  IF v_total_increment > 0 THEN
    v_bonus_used := LEAST(v_total_increment, v_bonus_balance);
    v_total_increment := v_total_increment - v_bonus_used;
  END IF;

  IF v_total_increment > 0 THEN
    RETURN QUERY SELECT
      v_usage.daily_count,
      v_daily_limit.free_daily,
      v_bonus_balance,
      FALSE,
      TRUE,
      0;
    RETURN;
  END IF;

  UPDATE public.user_usage
  SET daily_count = v_usage.daily_count + v_plan_used,
      total_questions_used = v_usage.total_questions_used + v_plan_used + v_bonus_used,
      updated_at = now()
  WHERE id = v_usage.id;

  UPDATE public.user_question_balance
  SET bonus_balance = v_bonus_balance - v_bonus_used,
      unlimited = v_unlimited,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    (v_usage.daily_count + v_plan_used),
    v_daily_limit.free_daily,
    (v_bonus_balance - v_bonus_used),
    FALSE,
    FALSE,
    (v_plan_used + v_bonus_used);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION give_bonus_questions(p_admin_user_id UUID, p_target_user_id UUID, p_bonus_count INT)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_daily_limit RECORD;
  v_balance INT;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.users WHERE id = p_admin_user_id;
  IF NOT v_is_admin THEN RETURN FALSE; END IF;

  SELECT * INTO v_daily_limit FROM get_user_plan_daily_limit(p_target_user_id);

  INSERT INTO public.user_question_balance (user_id, bonus_balance, unlimited)
  VALUES (p_target_user_id, p_bonus_count, v_daily_limit.unlimited)
  ON CONFLICT (user_id) DO UPDATE
    SET bonus_balance = user_question_balance.bonus_balance + EXCLUDED.bonus_balance,
        unlimited = user_question_balance.unlimited OR EXCLUDED.unlimited,
        updated_at = now()
  RETURNING bonus_balance INTO v_balance;

  INSERT INTO public.admin_actions (admin_user_id, target_user_id, action_type, action_details)
  VALUES (p_admin_user_id, p_target_user_id, 'give_bonus_questions', jsonb_build_object('bonus_count', p_bonus_count, 'total_balance', v_balance));

  RETURN TRUE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ensure_today_usage_row(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_row public.user_usage%ROWTYPE;
BEGIN
  INSERT INTO public.user_usage (user_id, usage_date, daily_count, max_daily_count, bonus_questions, total_questions_used)
  VALUES (p_user_id, CURRENT_DATE, 0, 0, 0, 0)
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row.id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ensure_daily_engagement_row(p_user_id UUID)
RETURNS public.user_daily_engagements AS $$
DECLARE
  v_row public.user_daily_engagements%ROWTYPE;
BEGIN
  INSERT INTO public.user_daily_engagements (
    user_id,
    activity_date,
    attendance_reward_amount,
    ad_reward_amount
  ) VALUES (
    p_user_id,
    CURRENT_DATE,
    NULL,
    NULL
  )
  ON CONFLICT (user_id, activity_date) DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID, p_source TEXT)
RETURNS TABLE(
  reward_source VARCHAR,
  reward_tier VARCHAR,
  reward_amount INT,
  claimed_at TIMESTAMPTZ,
  bonus_balance_after INT
) AS $$
DECLARE
  v_source TEXT := LOWER(COALESCE(p_source, 'attendance'));
  v_engagement public.user_daily_engagements%ROWTYPE;
  v_reward INT;
  v_tier TEXT;
  v_now TIMESTAMPTZ := now();
  v_rand NUMERIC;
  v_bonus_balance INT;
BEGIN
  IF v_source NOT IN ('attendance', 'ad') THEN
    RAISE EXCEPTION 'Unsupported reward source %', p_source USING ERRCODE = '22023';
  END IF;

  v_engagement := ensure_daily_engagement_row(p_user_id);

  IF v_source = 'attendance' THEN
    IF v_engagement.attendance_claimed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Attendance reward already claimed' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF v_engagement.attendance_claimed_at IS NULL THEN
      RAISE EXCEPTION 'Attendance reward must be claimed before ad reward' USING ERRCODE = 'P0001';
    END IF;
    IF v_engagement.ad_claimed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Ad reward already claimed' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_rand := random();

  IF v_rand < 0.90 THEN
    v_reward := 1;
    v_tier := 'normal';
  ELSIF v_rand < 0.95 THEN
    v_reward := 3;
    v_tier := 'rare';
  ELSIF v_rand < 0.98 THEN
    v_reward := 5;
    v_tier := 'epic';
  ELSE
    v_reward := 10;
    v_tier := 'legendary';
  END IF;

  INSERT INTO public.user_question_balance (user_id, bonus_balance, unlimited)
  VALUES (p_user_id, v_reward, FALSE)
  ON CONFLICT (user_id) DO UPDATE
    SET bonus_balance = user_question_balance.bonus_balance + EXCLUDED.bonus_balance,
        updated_at = now()
  RETURNING bonus_balance INTO v_bonus_balance;

  IF v_source = 'attendance' THEN
    UPDATE public.user_daily_engagements
    SET attendance_claimed_at = v_now,
        attendance_reward_tier = v_tier,
        attendance_reward_amount = v_reward,
        updated_at = now()
    WHERE id = v_engagement.id;
  ELSE
    UPDATE public.user_daily_engagements
    SET ad_claimed_at = v_now,
        ad_reward_tier = v_tier,
        ad_reward_amount = v_reward,
        updated_at = now()
    WHERE id = v_engagement.id;
  END IF;

  INSERT INTO public.user_lottery_history (user_id, source, reward_tier, reward_amount, bonus_balance_after)
  VALUES (p_user_id, v_source, v_tier, v_reward, v_bonus_balance);

  RETURN QUERY SELECT
    v_source,
    v_tier,
    v_reward,
    v_now,
    v_bonus_balance;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample admin user (optional - for testing)
-- INSERT INTO public.users (kakao_id, nickname, email, provider, is_admin) VALUES
-- ('admin_kakao_123', '관리자', 'admin@solvix.com', 'kakao', true)
-- ON CONFLICT (kakao_id) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
