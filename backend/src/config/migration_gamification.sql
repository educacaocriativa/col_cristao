-- Gamification: Learning Trails, Coins, Store
-- Run: docker compose exec backend psql -U colegio -d colcrist -f /app/src/config/migration_gamification.sql

CREATE TABLE IF NOT EXISTS learning_trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  class_id UUID REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  bimester INTEGER,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trail_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID NOT NULL REFERENCES learning_trails(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type VARCHAR(20) NOT NULL CHECK (step_type IN ('video', 'pdf', 'activity', 'text')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  vimeo_id VARCHAR(100),
  file_url TEXT,
  content TEXT,
  activity_id UUID REFERENCES activities(id),
  coins_reward INTEGER DEFAULT 10,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trail_id, step_order)
);

CREATE TABLE IF NOT EXISTS trail_step_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID NOT NULL REFERENCES learning_trails(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES trail_steps(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(step_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_coins (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  reason VARCHAR(50) NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_emoji VARCHAR(10) DEFAULT '🎁',
  coin_price INTEGER NOT NULL CHECK (coin_price > 0),
  stock INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES store_products(id),
  student_id UUID NOT NULL REFERENCES users(id),
  coins_spent INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);
