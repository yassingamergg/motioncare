import { useState } from 'react';
import { ArrowUpRight, Camera, Search, ShieldCheck, X } from 'lucide-react';
import { exerciseCategories, exerciseRegistry } from '../../lib/exercises/exerciseRegistry.js';

import { readExerciseSessions } from '../../lib/session/localExerciseSessions.js';

const allExercises = Object.values(exerciseRegistry);
const categories = exerciseCategories.filter(category => allExercises.some(e => e.category === category));

export function ExerciseLibrary({ onSelect }) {
  const [recent] = useState(() => { try { return readExerciseSessions().find(s => exerciseRegistry[s.exerciseId]); } catch { return null; } });
  const [guideOpen, setGuideOpen] = useState(() => { try { return !localStorage.getItem('motioncare_guide_seen') && !readExerciseSessions().length; } catch { return true; } });
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const exercises = allExercises.filter(e => (category === 'All' || e.category === category) && `${e.name} ${e.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="exercise-library">
    {recent && <div className="resume-routine"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2>{exerciseRegistry[recent.exerciseId].name}</h2><p className="local-note">Last practiced {new Date(recent.startedAt).toLocaleDateString()} · Review your settings before starting.</p></div><button className="primary-button" onClick={() => onSelect(recent.exerciseId)}>Repeat exercise <ArrowUpRight size={18} /></button></div>}
    <div className="library-welcome">
      <div className="library-intro">
        <p className="eyebrow">MOTIONCARE / GUIDED MOVEMENT</p>
        <h1>Your next movement.</h1>
        <p>Your routine. Your pace. Clear movement feedback.<br />Choose an exercise and make every rep count.</p>
      </div>
      <details className="getting-started" open={guideOpen} onToggle={e => { setGuideOpen(e.currentTarget.open); if (!e.currentTarget.open) { try { localStorage.setItem('motioncare_guide_seen', '1'); } catch { /* Optional preference. */ } } }}><summary>How your session works</summary>
        <ol>
          <li><span>01</span><div><strong>Choose your exercise</strong><p>Follow the routine recommended to you.</p></div></li>
          <li><span>02</span><div><strong>Find your camera angle</strong><p>Each exercise includes positioning guidance.</p></div></li>
          <li><span>03</span><div><strong>Move at your own pace</strong><p>Reps and movement feedback, as you go.</p></div></li>
        </ol>
      </details>
    </div>
    <div className="library-toolbar">
      <div><h2>Choose your movement</h2><p className="local-note" role="status">{exercises.length} of {allExercises.length} exercises</p></div>
      <label className="library-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search exercises" placeholder="Search exercises" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </div>
    <div className="library-filters">
      <div className="category-tabs" role="group" aria-label="Exercise categories">{['All', ...categories].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {(query || category !== 'All') && <button className="text-button clear-filters" onClick={() => { setQuery(''); setCategory('All'); }}><X size={14} aria-hidden="true" /> Clear filters</button>}
    </div>
    <div className="exercise-list">{exercises.map(e => <button className="exercise-row" key={e.id} onClick={() => onSelect(e.id)} aria-label={`Set up ${e.name}`}>
      <span className="exercise-category">{e.category}</span>
      <span className="exercise-name"><strong>{e.name}</strong><span>{e.mode === 'rom' ? 'Range of motion' : 'Repetition practice'}</span></span>
      <span className="exercise-view"><Camera size={16} aria-hidden="true" />
        {['shoulder-abduction', 'hip-external-rotation'].includes(e.id) ? 'Front view' : 'Side view'}
        {['straight-leg-raise', 'heel-slide', 'glute-bridge', 'dead-bug', 'hip-abduction', 'hip-external-rotation'].includes(e.id) ? ' · Floor' : ''}
      </span>
      <span className="exercise-open">Set up <ArrowUpRight size={19} aria-hidden="true" /></span>
    </button>)}</div>
    {!exercises.length && <div className="library-empty"><Search size={28} aria-hidden="true" /><h3>No matching movements</h3><p>Try another exercise name or clear your filters.</p><button className="quiet-button" onClick={() => { setCategory('All'); setQuery(''); }}>Show all exercises</button></div>}
    <div className="library-footnote"><p><ShieldCheck size={17} aria-hidden="true" /> Camera analysis stays on this device. No account needed.</p><p>Use exercises and ranges recommended by your physiotherapist. Example targets are not medical guidance.</p></div>
  </section>;
}
