-- ============================================================
-- STAMPED — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT NOT NULL,
  username    TEXT UNIQUE,
  avatar_initials TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CAFES
CREATE TABLE cafes (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  address             TEXT,
  color               TEXT DEFAULT '#6B3F2A',
  logo_letter         CHAR(1),
  category            TEXT,
  stamp_target        INTEGER DEFAULT 9 CHECK (stamp_target > 0),
  reward_description  TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STAMP CARDS (one per user per cafe)
CREATE TABLE stamp_cards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cafe_id     UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
  stamps      INTEGER DEFAULT 0 CHECK (stamps >= 0),
  last_visit  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cafe_id)
);

-- 4. STAMP EVENTS (audit log — every stamp ever added)
CREATE TABLE stamp_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cafe_id         UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
  stamp_card_id   UUID REFERENCES stamp_cards(id) ON DELETE CASCADE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REWARD CLAIMS
CREATE TABLE reward_claims (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cafe_id         UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
  stamp_card_id   UUID REFERENCES stamp_cards(id) ON DELETE CASCADE NOT NULL,
  claimed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_cards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- cafes (public read)
CREATE POLICY "Anyone can view cafes" ON cafes FOR SELECT USING (true);

-- stamp_cards
CREATE POLICY "Users can view own cards"   ON stamp_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON stamp_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON stamp_cards FOR UPDATE USING (auth.uid() = user_id);

-- stamp_events
CREATE POLICY "Users can view own events"   ON stamp_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON stamp_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- reward_claims
CREATE POLICY "Users can view own claims"   ON reward_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON reward_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: auto-create profile on sign up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, username, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    lower(replace(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), ' ', '')),
    upper(left(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 1) ||
          COALESCE(left(split_part(COALESCE(NEW.raw_user_meta_data->>'name', ''), ' ', 2), 1), ''))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: add_stamp (the core transaction)
-- Called when a cafe scans a customer QR code
-- ============================================================
CREATE OR REPLACE FUNCTION add_stamp(p_user_id UUID, p_cafe_id UUID)
RETURNS stamp_cards AS $$
DECLARE
  v_card      stamp_cards;
  v_target    INTEGER;
BEGIN
  SELECT stamp_target INTO v_target FROM cafes WHERE id = p_cafe_id;

  INSERT INTO stamp_cards (user_id, cafe_id, stamps, last_visit)
  VALUES (p_user_id, p_cafe_id, 1, NOW())
  ON CONFLICT (user_id, cafe_id) DO UPDATE
    SET stamps     = LEAST(stamp_cards.stamps + 1, v_target),
        last_visit = NOW()
  RETURNING * INTO v_card;

  INSERT INTO stamp_events (user_id, cafe_id, stamp_card_id)
  VALUES (p_user_id, p_cafe_id, v_card.id);

  RETURN v_card;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: claim_reward
-- ============================================================
CREATE OR REPLACE FUNCTION claim_reward(p_user_id UUID, p_cafe_id UUID)
RETURNS reward_claims AS $$
DECLARE
  v_card    stamp_cards;
  v_target  INTEGER;
  v_claim   reward_claims;
BEGIN
  SELECT stamp_target INTO v_target FROM cafes WHERE id = p_cafe_id;

  SELECT * INTO v_card FROM stamp_cards
  WHERE user_id = p_user_id AND cafe_id = p_cafe_id;

  IF v_card IS NULL OR v_card.stamps < v_target THEN
    RAISE EXCEPTION 'No reward available';
  END IF;

  UPDATE stamp_cards SET stamps = 0 WHERE id = v_card.id;

  INSERT INTO reward_claims (user_id, cafe_id, stamp_card_id)
  VALUES (p_user_id, p_cafe_id, v_card.id)
  RETURNING * INTO v_claim;

  RETURN v_claim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SEED DATA — Sample cafes
-- ============================================================
INSERT INTO cafes (name, address, color, logo_letter, category, stamp_target, reward_description) VALUES
  ('Monmouth Coffee',  '27 Monmouth St, Covent Garden, WC2H 9EU',  '#6B3F2A', 'M', 'Specialty Coffee', 9, 'Free flat white'),
  ('Workshop Coffee',  '27 Clerkenwell Rd, Clerkenwell, EC1M 5RN', '#2D4A3E', 'W', 'Specialty Coffee', 9, 'Free drink of choice'),
  ('Ozone Coffee',     '11 Leonard St, Shoreditch, EC2A 4AQ',      '#1B3A4B', 'O', 'Roaster & Cafe',   9, 'Free coffee + pastry'),
  ('Notes Coffee',     '31 St Martins Ln, Covent Garden, WC2N 4ER','#5C3A1E', 'N', 'Cafe & Bar',       9, 'Free house coffee');
