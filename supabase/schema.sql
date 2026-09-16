-- ============================================================================
-- MotionCare AI — Database Schema
-- Supabase PostgreSQL Architecture for Biomechanical Rehabilitation
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Exercises Table
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lower Extremity',
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Rehabilitation Programs Table
CREATE TABLE IF NOT EXISTS rehabilitation_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Rehabilitation Protocol',
  prescribed_by TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  pain_before INTEGER CHECK (pain_before >= 0 AND pain_before <= 10),
  pain_after INTEGER CHECK (pain_after >= 0 AND pain_after <= 10),
  pain_delta INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Exercise Results Table
CREATE TABLE IF NOT EXISTS exercise_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  reps INTEGER NOT NULL DEFAULT 0,
  form_score INTEGER NOT NULL DEFAULT 0,
  range_of_motion NUMERIC,
  average_speed NUMERIC,
  movement_consistency INTEGER,
  rep_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes for Fast Clinical Analytics & Retrieval
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_results_session_id ON exercise_results(session_id);
CREATE INDEX IF NOT EXISTS idx_rehabilitation_programs_patient_id ON rehabilitation_programs(patient_id);

-- ============================================================================
-- Row Level Security (RLS) Setup
-- ============================================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehabilitation_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_results ENABLE ROW LEVEL SECURITY;

-- Allow read access to exercises for all authenticated and anonymous clients
CREATE POLICY "Allow public read access on exercises"
  ON exercises FOR SELECT USING (true);

-- Patient / Session policies (Read and Insert)
CREATE POLICY "Allow public read on sessions"
  ON sessions FOR SELECT USING (true);

CREATE POLICY "Allow public insert on sessions"
  ON sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on exercise_results"
  ON exercise_results FOR SELECT USING (true);

CREATE POLICY "Allow public insert on exercise_results"
  ON exercise_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on patients"
  ON patients FOR SELECT USING (true);

CREATE POLICY "Allow public insert on patients"
  ON patients FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on rehabilitation_programs"
  ON rehabilitation_programs FOR SELECT USING (true);

-- ============================================================================
-- Default Exercise Seed Data
-- ============================================================================
INSERT INTO exercises (id, name, category, description, configuration)
VALUES (
  'bodyweight_squat',
  'Bodyweight Squat',
  'Lower Extremity',
  'Functional lower-body rehabilitation movement targeting knee flexion, quadriceps strength, and hip stability.',
  '{
    "targetJoints": ["leftKnee", "rightKnee", "leftHip", "rightHip"],
    "targetRange": { "standingKneeAngle": 155, "targetSquatDepth": 95, "descendingThreshold": 140 },
    "repDetection": { "minRepDurationMs": 1000, "maxRepDurationMs": 8000 }
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  configuration = EXCLUDED.configuration;
