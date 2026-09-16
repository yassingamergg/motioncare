import { getSupabaseClient, getSupabaseConfig, isSupabaseConfigured } from './supabaseClient.js';

const LOCAL_STORAGE_KEY = 'motioncare_sessions_vault';

/**
 * Universal Repository for Session Storage & Recovery Profiles
 */
export class SessionRepository {
  /**
   * Save completed session and its biomechanical results
   *
   * @param {object} sessionSummary - Output from SessionManager.complete()
   * @returns {Promise<{ success: boolean, destination: 'supabase'|'local', error?: string }>}
   */
  static async saveSession(sessionSummary) {
    if (!sessionSummary || !sessionSummary.id) {
      return { success: false, destination: 'local', error: 'Invalid session payload' };
    }

    // 1. Always save a copy to Local Storage as safe offline vault
    try {
      this.saveToLocalStorage(sessionSummary);
    } catch (localErr) {
      console.warn('[MotionCare] Local storage write failed:', localErr);
    }

    // 2. If Supabase is configured, sync with remote cloud
    const client = getSupabaseClient();
    if (client) {
      try {
        // Insert into sessions table
        const { error: sessionError } = await client.from('sessions').insert([
          {
            id: sessionSummary.id,
            exercise_id: sessionSummary.exerciseId,
            started_at: sessionSummary.startedAt,
            completed_at: sessionSummary.completedAt,
            duration_seconds: sessionSummary.durationSeconds,
            pain_before: sessionSummary.painBefore,
            pain_after: sessionSummary.painAfter,
            pain_delta: sessionSummary.painDelta,
          },
        ]);

        if (sessionError) throw sessionError;

        // Insert into exercise_results table
        const { error: resultsError } = await supabase.from('exercise_results').insert([
          {
            session_id: sessionSummary.id,
            reps: sessionSummary.totalReps,
            form_score: sessionSummary.averageFormScore,
            range_of_motion: sessionSummary.averageDepth,
            average_speed: sessionSummary.averageDuration,
            movement_consistency: sessionSummary.movementConsistency,
            rep_details: sessionSummary.reps || [],
          },
        ]);

        if (resultsError) throw resultsError;

        return { success: true, destination: 'supabase' };
      } catch (err) {
        console.warn('[MotionCare] Cloud sync failed, stored in local vault:', err.message);
        return { success: true, destination: 'local', error: err.message };
      }
    }

    return { success: true, destination: 'local' };
  }

  /**
   * Fetch session history (newest first)
   *
   * @param {number} [limit=20]
   * @returns {Promise<Array<object>>}
   */
  static async getSessionHistory(limit = 20) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('sessions')
          .select(`
            id,
            exercise_id,
            started_at,
            completed_at,
            duration_seconds,
            pain_before,
            pain_after,
            pain_delta,
            exercise_results (
              reps,
              form_score,
              range_of_motion,
              average_speed,
              movement_consistency,
              rep_details
            )
          `)
          .order('started_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          // Normalize Supabase response
          return data.map((s) => ({
            id: s.id,
            exerciseId: s.exercise_id,
            startedAt: s.started_at,
            completedAt: s.completed_at,
            durationSeconds: s.duration_seconds,
            painBefore: s.pain_before,
            painAfter: s.pain_after,
            painDelta: s.pain_delta,
            totalReps: s.exercise_results?.[0]?.reps ?? 0,
            averageFormScore: s.exercise_results?.[0]?.form_score ?? 85,
            averageDepth: s.exercise_results?.[0]?.range_of_motion ?? null,
            averageDuration: s.exercise_results?.[0]?.average_speed ?? null,
            movementConsistency: s.exercise_results?.[0]?.movement_consistency ?? 85,
            reps: s.exercise_results?.[0]?.rep_details ?? [],
          }));
        }
      } catch (err) {
        console.warn('[MotionCare] Remote query failed, reading local vault:', err);
      }
    }

    // Fallback to Local Storage
    return this.getFromLocalStorage(limit);
  }

  /**
   * Internal helper: Save to Local Storage vault
   */
  static saveToLocalStorage(sessionSummary) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const existing = this.getFromLocalStorage(100);
    // Replace if duplicate, else prepend
    const filtered = existing.filter((s) => s.id !== sessionSummary.id);
    filtered.unshift(sessionSummary);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Internal helper: Read from Local Storage vault
   */
  static getFromLocalStorage(limit = 20) {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, limit) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear local storage records
   */
  static clearLocalHistory() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  /**
   * Current active destination mode
   */
  static getStorageMode() {
    return isSupabaseConfigured ? 'supabase' : 'local';
  }
}
