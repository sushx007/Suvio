'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Crown, Loader2, Play, Square, Volume2, VolumeX, Sparkles, Info, TrendingUp, Flame, Clock, CheckCircle2, AlertTriangle, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// AI Personal Trainer V3 — Premium only.
// V3 upgrades: multi-exercise (squat / push-up / lunge), animated form
// corrections (red joint glow, green rep flash), live form-score gauge,
// post-session report with form-score history chart + issue breakdown.
// Frames NEVER leave the device. Only aggregate numeric stats are POSTed
// to /api/health/trainer/sessions.

const MP_SCRIPT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

// Angle helper (a-b-c in 2D landmark space).
const angleOf = (a, b, c) => {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  return (Math.acos(Math.min(1, Math.max(-1, dot / (magAB * magCB + 1e-9)))) * 180) / Math.PI;
};

// BlazePose landmark indices used across exercises.
const LM = { LSH: 11, RSH: 12, LEL: 13, REL: 14, LWR: 15, RWR: 16, LHIP: 23, RHIP: 24, LKNEE: 25, RKNEE: 26, LANK: 27, RANK: 28 };

// Per-exercise analyser: returns { newPhase, repCompleted, issues, highlight, depthCue }
function makeSquatAnalyser() {
  return {
    id: 'squat', name: 'Squat', icon: '🏋️',
    tips: ['Feet shoulder-width apart', 'Chest up, back straight', 'Knees track over toes', 'Descend until thighs parallel to floor'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('back leaning forward')) { set.add(LM.LSH); set.add(LM.RSH); set.add(LM.LHIP); set.add(LM.RHIP); }
      if (issues.includes('knees collapsing inward')) { set.add(LM.LKNEE); set.add(LM.RKNEE); }
      if (issues.includes('not deep enough')) { set.add(LM.LKNEE); set.add(LM.RKNEE); }
      return set;
    },
    analyse(pts, phase) {
      const kneeAvg = (angleOf(pts[LM.LHIP], pts[LM.LKNEE], pts[LM.LANK]) + angleOf(pts[LM.RHIP], pts[LM.RKNEE], pts[LM.RANK])) / 2;
      const backLean = angleOf(
        { x: pts[LM.LSH].x, y: pts[LM.LSH].y },
        { x: pts[LM.LHIP].x, y: pts[LM.LHIP].y },
        { x: pts[LM.LHIP].x, y: pts[LM.LHIP].y - 0.5 },
      );
      const issues = [];
      if (kneeAvg < 130 && backLean > 45) issues.push('back leaning forward');
      if (pts[LM.LKNEE].x < pts[LM.LANK].x - 0.02 || pts[LM.RKNEE].x > pts[LM.RANK].x + 0.02) issues.push('knees collapsing inward');
      let newPhase = phase;
      let repCompleted = false;
      let depthCue = null;
      if (kneeAvg < 100 && phase === 'up') { newPhase = 'down'; depthCue = 'Nice depth — drive up.'; }
      else if (kneeAvg > 160 && phase === 'down') { newPhase = 'up'; repCompleted = true; }
      if (kneeAvg > 130 && kneeAvg < 155 && phase === 'up') depthCue = 'Sink a bit deeper.';
      // Half-rep detection: went down but not deep enough
      if (repCompleted && phase === 'down' && !issues.length && kneeAvg > 100 /* means never got very low */) {
        // (already handled through phase transitions)
      }
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}
function makePushupAnalyser() {
  return {
    id: 'pushup', name: 'Push-up', icon: '💪',
    tips: ['Hands shoulder-width, elbows tucked ~45°', 'Body straight from shoulders to ankles', 'Lower chest close to the ground', 'Press up fully — lock elbows at the top'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('hips sagging')) { set.add(LM.LHIP); set.add(LM.RHIP); }
      if (issues.includes('elbows flaring out')) { set.add(LM.LEL); set.add(LM.REL); }
      if (issues.includes('not deep enough')) { set.add(LM.LEL); set.add(LM.REL); }
      return set;
    },
    analyse(pts, phase) {
      const elbowAvg = (angleOf(pts[LM.LSH], pts[LM.LEL], pts[LM.LWR]) + angleOf(pts[LM.RSH], pts[LM.REL], pts[LM.RWR])) / 2;
      // Body line: shoulder-hip-ankle should be ~180°. Lower means hips sag or pike.
      const bodyLine = (angleOf(pts[LM.LSH], pts[LM.LHIP], pts[LM.LANK]) + angleOf(pts[LM.RSH], pts[LM.RHIP], pts[LM.RANK])) / 2;
      const issues = [];
      if (bodyLine < 160) issues.push('hips sagging');
      // Elbow flare heuristic: elbow further from body midline than shoulder.
      const midShX = (pts[LM.LSH].x + pts[LM.RSH].x) / 2;
      const midHipX = (pts[LM.LHIP].x + pts[LM.RHIP].x) / 2;
      const bodyCenter = (midShX + midHipX) / 2;
      const elbowSpread = Math.max(Math.abs(pts[LM.LEL].x - bodyCenter), Math.abs(pts[LM.REL].x - bodyCenter));
      const shoulderSpread = Math.abs(pts[LM.LSH].x - pts[LM.RSH].x) / 2;
      if (elbowSpread > shoulderSpread * 1.6 && elbowAvg < 120) issues.push('elbows flaring out');
      let newPhase = phase;
      let repCompleted = false;
      let depthCue = null;
      if (elbowAvg < 95 && phase === 'up') { newPhase = 'down'; depthCue = 'Nice — now press up.'; }
      else if (elbowAvg > 160 && phase === 'down') { newPhase = 'up'; repCompleted = true; }
      if (elbowAvg > 110 && elbowAvg < 140 && phase === 'up') depthCue = 'Lower a bit more.';
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}
function makeLungeAnalyser() {
  return {
    id: 'lunge', name: 'Lunge', icon: '🦵',
    tips: ['Step forward — front thigh parallel to floor', 'Back knee just above the ground', 'Torso upright, front knee over ankle', 'Alternate legs to balance work'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('front knee past toes')) { set.add(LM.LKNEE); set.add(LM.RKNEE); set.add(LM.LANK); set.add(LM.RANK); }
      if (issues.includes('torso leaning')) { set.add(LM.LSH); set.add(LM.RSH); }
      if (issues.includes('not deep enough')) { set.add(LM.LKNEE); set.add(LM.RKNEE); }
      return set;
    },
    analyse(pts, phase) {
      // Pick the front leg = whichever knee is lower (higher y in image coords).
      const frontIsLeft = pts[LM.LKNEE].y > pts[LM.RKNEE].y;
      const frontKnee = frontIsLeft ? LM.LKNEE : LM.RKNEE;
      const frontHip = frontIsLeft ? LM.LHIP : LM.RHIP;
      const frontAnkle = frontIsLeft ? LM.LANK : LM.RANK;
      const frontAngle = angleOf(pts[frontHip], pts[frontKnee], pts[frontAnkle]);
      const torsoLean = angleOf(
        { x: pts[LM.LSH].x, y: pts[LM.LSH].y },
        { x: pts[LM.LHIP].x, y: pts[LM.LHIP].y },
        { x: pts[LM.LHIP].x, y: pts[LM.LHIP].y - 0.5 },
      );
      const issues = [];
      if (torsoLean > 40) issues.push('torso leaning');
      // Front knee past toes: kneeX significantly beyond ankleX.
      if (pts[frontKnee].x - pts[frontAnkle].x > 0.06) issues.push('front knee past toes');
      let newPhase = phase;
      let repCompleted = false;
      let depthCue = null;
      if (frontAngle < 105 && phase === 'up') { newPhase = 'down'; depthCue = 'Great depth — push back up.'; }
      else if (frontAngle > 165 && phase === 'down') { newPhase = 'up'; repCompleted = true; }
      if (frontAngle > 130 && frontAngle < 155 && phase === 'up') depthCue = 'Bend the front knee more.';
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}

// V2.1: additional exercises — plank (isometric hold), shoulder press, bicep curls,
// jumping jacks and burpees. Analysers return the same shape as the originals.

function makePlankAnalyser() {
  return {
    id: 'plank', name: 'Plank', icon: '🧘', isometric: true,
    tips: ['Forearms directly under shoulders', 'Body forms one straight line — no hip sag or pike', 'Squeeze glutes and brace your core', 'Neutral neck — look at the floor'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('hips sagging')) { set.add(LM.LHIP); set.add(LM.RHIP); }
      if (issues.includes('hips too high')) { set.add(LM.LHIP); set.add(LM.RHIP); }
      return set;
    },
    analyse(pts, phase) {
      const bodyLine = (angleOf(pts[LM.LSH], pts[LM.LHIP], pts[LM.LANK]) + angleOf(pts[LM.RSH], pts[LM.RHIP], pts[LM.RANK])) / 2;
      const issues = [];
      if (bodyLine < 160) issues.push('hips sagging');
      else if (bodyLine > 195) issues.push('hips too high');
      // Plank is a hold: newPhase stays constant, repCompleted = false. The
      // parent loop treats seconds-held as the "score" for isometric moves.
      return { newPhase: phase, repCompleted: false, issues, depthCue: issues.length ? null : 'Solid hold — keep breathing.' };
    },
  };
}
function makeShoulderPressAnalyser() {
  return {
    id: 'shoulder_press', name: 'Shoulder Press', icon: '🏋️',
    tips: ['Start with elbows bent, hands at shoulder height', 'Press straight up — wrists stacked over elbows', 'Lock out overhead without shrugging', 'Lower under control back to shoulders'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('elbows flaring behind')) { set.add(LM.LEL); set.add(LM.REL); }
      if (issues.includes('not locking out')) { set.add(LM.LWR); set.add(LM.RWR); }
      return set;
    },
    analyse(pts, phase) {
      const elbowAvg = (angleOf(pts[LM.LSH], pts[LM.LEL], pts[LM.LWR]) + angleOf(pts[LM.RSH], pts[LM.REL], pts[LM.RWR])) / 2;
      // Wrists above shoulders → arms overhead. y is smaller when higher on screen.
      const wristY = (pts[LM.LWR].y + pts[LM.RWR].y) / 2;
      const shoulderY = (pts[LM.LSH].y + pts[LM.RSH].y) / 2;
      const issues = [];
      // Flare check: if hands drop below shoulders during press motion
      if (pts[LM.LEL].y > pts[LM.LSH].y + 0.06 || pts[LM.REL].y > pts[LM.RSH].y + 0.06) {
        // elbows dropping — only flag if we're mid-press
        if (elbowAvg > 100 && elbowAvg < 160) issues.push('elbows flaring behind');
      }
      let newPhase = phase; let repCompleted = false; let depthCue = null;
      // "up" = arms locked out overhead (wrists well above shoulders, elbows straight-ish)
      // "down" = arms bent at shoulders
      if (wristY < shoulderY - 0.15 && elbowAvg > 155 && phase === 'down') { newPhase = 'up'; repCompleted = true; }
      else if (wristY > shoulderY - 0.02 && elbowAvg < 110 && phase === 'up') { newPhase = 'down'; depthCue = 'Now press up.'; }
      if (phase === 'up' && elbowAvg < 150 && wristY < shoulderY - 0.05) { issues.push('not locking out'); }
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}
function makeBicepCurlAnalyser() {
  return {
    id: 'bicep_curl', name: 'Bicep Curls', icon: '💪',
    tips: ['Elbows pinned to your sides — no swinging', 'Curl until the wrist reaches shoulder height', 'Lower under control to full extension', 'Keep torso upright, no leaning back'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('swinging elbows')) { set.add(LM.LEL); set.add(LM.REL); }
      if (issues.includes('leaning back')) { set.add(LM.LSH); set.add(LM.RSH); }
      return set;
    },
    analyse(pts, phase) {
      const elbowAvg = (angleOf(pts[LM.LSH], pts[LM.LEL], pts[LM.LWR]) + angleOf(pts[LM.RSH], pts[LM.REL], pts[LM.RWR])) / 2;
      // Detect swinging elbows: elbow x much further from shoulder x than expected
      const lElbowSwing = Math.abs(pts[LM.LEL].x - pts[LM.LSH].x);
      const rElbowSwing = Math.abs(pts[LM.REL].x - pts[LM.RSH].x);
      const issues = [];
      if (lElbowSwing > 0.12 || rElbowSwing > 0.12) issues.push('swinging elbows');
      // Leaning back: shoulders behind hips
      const shX = (pts[LM.LSH].x + pts[LM.RSH].x) / 2;
      const hipX = (pts[LM.LHIP].x + pts[LM.RHIP].x) / 2;
      if (Math.abs(shX - hipX) > 0.09) issues.push('leaning back');
      let newPhase = phase; let repCompleted = false; let depthCue = null;
      // "up" (curled) = elbow ~40°; "down" (extended) = elbow >150°
      if (elbowAvg < 50 && phase === 'down') { newPhase = 'up'; depthCue = 'Squeeze — lower slowly.'; }
      else if (elbowAvg > 155 && phase === 'up') { newPhase = 'down'; repCompleted = true; }
      if (phase === 'up' && elbowAvg > 75) depthCue = 'Curl higher.';
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}
function makeJumpingJackAnalyser() {
  return {
    id: 'jumping_jack', name: 'Jumping Jacks', icon: '🤸',
    tips: ['Start with feet together, arms at sides', 'Jump feet wide as arms swing overhead', 'Land softly, then reverse the motion', 'Keep a steady rhythm'],
    highlightJoints: (issues) => new Set(),
    analyse(pts, phase) {
      const ankleSpread = Math.abs(pts[LM.LANK].x - pts[LM.RANK].x);
      const wristAboveHead = ((pts[LM.LWR].y + pts[LM.RWR].y) / 2) < ((pts[LM.LSH].y + pts[LM.RSH].y) / 2 - 0.05);
      const shoulderWidth = Math.abs(pts[LM.LSH].x - pts[LM.RSH].x);
      const isOpen = ankleSpread > shoulderWidth * 1.5 && wristAboveHead;
      const isClosed = ankleSpread < shoulderWidth * 0.9 && !wristAboveHead;
      const issues = [];
      let newPhase = phase; let repCompleted = false; let depthCue = null;
      if (isOpen && phase === 'closed') { newPhase = 'open'; }
      else if (isClosed && phase === 'open') { newPhase = 'closed'; repCompleted = true; }
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}
function makeBurpeeAnalyser() {
  return {
    id: 'burpee', name: 'Burpees', icon: '🔥',
    tips: ['Squat down and place hands on the floor', 'Jump feet back to a plank', 'Push-up (optional), jump feet forward', 'Explode up with a jump and clap overhead'],
    highlightJoints: (issues) => {
      const set = new Set();
      if (issues.includes('hips sagging')) { set.add(LM.LHIP); set.add(LM.RHIP); }
      return set;
    },
    analyse(pts, phase) {
      // Simplified: track three states — 'standing', 'plank', and count a rep on return to standing after a plank.
      // Standing: torso vertical (shoulder-hip line ~ vertical). Plank: shoulder-hip-ankle nearly horizontal.
      const shY = (pts[LM.LSH].y + pts[LM.RSH].y) / 2;
      const hipY = (pts[LM.LHIP].y + pts[LM.RHIP].y) / 2;
      const ankleY = (pts[LM.LANK].y + pts[LM.RANK].y) / 2;
      const torsoVertical = Math.abs(shY - hipY) > 0.15; // shoulders clearly above hips
      const isPlank = Math.abs(shY - ankleY) < 0.15 && Math.abs(hipY - ankleY) < 0.15;
      const issues = [];
      if (isPlank) {
        const bodyLine = (angleOf(pts[LM.LSH], pts[LM.LHIP], pts[LM.LANK]) + angleOf(pts[LM.RSH], pts[LM.RHIP], pts[LM.RANK])) / 2;
        if (bodyLine < 160) issues.push('hips sagging');
      }
      let newPhase = phase; let repCompleted = false; let depthCue = null;
      if (isPlank && phase !== 'plank') { newPhase = 'plank'; depthCue = 'Jump back forward.'; }
      else if (torsoVertical && phase === 'plank') { newPhase = 'standing'; repCompleted = true; }
      else if (torsoVertical && phase !== 'standing' && phase !== 'plank') { newPhase = 'standing'; }
      return { newPhase, repCompleted, issues, depthCue };
    },
  };
}

const ANALYSERS = {
  squat: makeSquatAnalyser(),
  pushup: makePushupAnalyser(),
  lunge: makeLungeAnalyser(),
  plank: makePlankAnalyser(),
  shoulder_press: makeShoulderPressAnalyser(),
  bicep_curl: makeBicepCurlAnalyser(),
  jumping_jack: makeJumpingJackAnalyser(),
  burpee: makeBurpeeAnalyser(),
};
const EXERCISE_LIST = [ANALYSERS.squat, ANALYSERS.pushup, ANALYSERS.lunge, ANALYSERS.plank, ANALYSERS.shoulder_press, ANALYSERS.bicep_curl, ANALYSERS.jumping_jack, ANALYSERS.burpee];

// Plain-language technique guidance shown when a specific form issue is detected.
const CORRECTION_TIPS = {
  'back leaning forward': 'Chest up, shoulders back. Brace your core and keep the spine neutral — imagine a straight line from head to hips.',
  'knees collapsing inward': 'Push your knees OUT, tracking over your toes. Screw your feet into the floor to activate the glutes.',
  'not deep enough': 'Sink lower until your thighs are parallel to the floor. Control the descent — no bouncing.',
  'hips sagging': 'Squeeze your glutes and brace your abs. Body should form one straight line from shoulders to ankles.',
  'elbows flaring out': 'Tuck your elbows closer to your ribs — aim for a 45° angle from the body, not 90°.',
  'torso leaning': 'Stack shoulders directly over hips. Keep the chest lifted and eyes forward.',
  'hips too high': 'Drop your hips slightly so shoulders, hips and ankles form ONE straight line. No pike position.',
  'elbows flaring behind': 'Keep elbows in line with wrists as you press — no falling backward. Squeeze the shoulder blades down.',
  'not locking out': 'Fully straighten your arms at the top — biceps close to ears without shrugging.',
  'swinging elbows': 'Pin elbows against your ribs and stop using body swing. Isolate the biceps.',
  'leaning back': 'Stack shoulders over hips. Brace your core — no leaning back to hoist the weight.',
  'front knee past toes': 'Step further forward so your front shin stays vertical. Knee should track OVER the ankle, never beyond the toes.',
};

// Tiny SVG diagrams (32x40) illustrating the correct alignment for each fix.
function CorrectionDiagram({ issue }) {
  const stroke = '#34d399';
  const wrong = '#f87171';
  if (issue === 'back leaning forward' || issue === 'torso leaning') {
    return (
      <svg viewBox="0 0 60 60" width="80" height="80" aria-hidden>
        <circle cx="30" cy="12" r="4" fill={stroke}/>
        <line x1="30" y1="16" x2="30" y2="34" stroke={stroke} strokeWidth="2.5"/>
        <line x1="30" y1="34" x2="24" y2="52" stroke={stroke} strokeWidth="2.5"/>
        <line x1="30" y1="34" x2="36" y2="52" stroke={stroke} strokeWidth="2.5"/>
        <text x="42" y="20" fill={stroke} fontSize="7">✓ upright</text>
      </svg>
    );
  }
  if (issue === 'knees collapsing inward') {
    return (
      <svg viewBox="0 0 60 60" width="80" height="80" aria-hidden>
        <circle cx="30" cy="10" r="3.5" fill={stroke}/>
        <line x1="30" y1="14" x2="30" y2="30" stroke={stroke} strokeWidth="2.5"/>
        <line x1="30" y1="30" x2="20" y2="42" stroke={stroke} strokeWidth="2.5"/>
        <line x1="30" y1="30" x2="40" y2="42" stroke={stroke} strokeWidth="2.5"/>
        <line x1="20" y1="42" x2="18" y2="54" stroke={stroke} strokeWidth="2.5"/>
        <line x1="40" y1="42" x2="42" y2="54" stroke={stroke} strokeWidth="2.5"/>
        <text x="4" y="58" fill={stroke} fontSize="6">knees OUT</text>
      </svg>
    );
  }
  if (issue === 'hips sagging') {
    return (
      <svg viewBox="0 0 80 40" width="100" height="50" aria-hidden>
        <line x1="10" y1="20" x2="70" y2="20" stroke={stroke} strokeWidth="2.5" strokeDasharray="0"/>
        <circle cx="10" cy="20" r="3" fill={stroke}/>
        <circle cx="70" cy="20" r="3" fill={stroke}/>
        <text x="24" y="14" fill={stroke} fontSize="7">✓ straight line</text>
      </svg>
    );
  }
  if (issue === 'elbows flaring out') {
    return (
      <svg viewBox="0 0 60 60" width="80" height="80" aria-hidden>
        <circle cx="30" cy="12" r="3.5" fill={stroke}/>
        <line x1="30" y1="16" x2="30" y2="40" stroke={stroke} strokeWidth="2.5"/>
        <line x1="30" y1="20" x2="22" y2="32" stroke={stroke} strokeWidth="2.5"/>
        <line x1="30" y1="20" x2="38" y2="32" stroke={stroke} strokeWidth="2.5"/>
        <text x="4" y="58" fill={stroke} fontSize="6">elbows ~45°</text>
      </svg>
    );
  }
  if (issue === 'front knee past toes') {
    return (
      <svg viewBox="0 0 80 60" width="100" height="70" aria-hidden>
        <line x1="20" y1="12" x2="20" y2="34" stroke={stroke} strokeWidth="2.5"/>
        <line x1="20" y1="34" x2="42" y2="46" stroke={stroke} strokeWidth="2.5"/>
        <line x1="42" y1="46" x2="42" y2="56" stroke={stroke} strokeWidth="2.5"/>
        <line x1="42" y1="56" x2="52" y2="56" stroke={stroke} strokeWidth="2.5"/>
        <text x="4" y="10" fill={stroke} fontSize="7">✓ knee over ankle</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" aria-hidden>
      <circle cx="30" cy="30" r="20" stroke={wrong} strokeWidth="2" fill="none"/>
      <text x="15" y="34" fill={wrong} fontSize="10">reset</text>
    </svg>
  );
}

export default function TrainerPage() {
  const [tier, setTier] = useState('loading');
  const [exerciseId, setExerciseId] = useState('squat');
  const initialPhase = (id) => id === 'jumping_jack' ? 'closed' : id === 'burpee' ? 'standing' : id === 'plank' ? 'hold' : 'up';
  const [status, setStatus] = useState('idle'); // idle | loading | ready | running | ending
  const [reps, setReps] = useState(0);
  const [badReps, setBadReps] = useState(0);
  const [formScore, setFormScore] = useState(100);
  const [seconds, setSeconds] = useState(0);
  const [voice, setVoice] = useState(true);
  const [cue, setCue] = useState('');
  const [activeIssue, setActiveIssue] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);

  const exercise = ANALYSERS[exerciseId] || ANALYSERS.squat;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    phase: 'up', lastRepAt: 0, lastCueAt: 0, formSamples: [], issues: {},
    activeIssues: new Set(), lastIssueAt: 0,
    flash: 0, // ms remaining for green rep flash
  });
  const timerRef = useRef(null);

  // Check plan tier.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/plan/status');
        const d = await r.json();
        setTier(d.tier || 'free');
        if (d.tier === 'premium') loadHistory();
      } catch { setTier('free'); }
    })();
  }, []);

  async function loadHistory() {
    try {
      const r = await fetch('/api/health/trainer/sessions');
      if (r.ok) { const d = await r.json(); setHistory(d.items || []); setStreak(d.streak || 0); }
    } catch {}
  }

  async function deleteSession(id) {
    if (!id) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this workout session? This cannot be undone.')) return;
    try {
      const r = await fetch(`/api/health/trainer/sessions/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Delete failed');
      toast.success('Session deleted');
      // Optimistic local update + refetch for streak recompute.
      setHistory((h) => h.filter((s) => s.id !== id));
      loadHistory();
    } catch (e) { toast.error(e.message); }
  }

  // ---- Speech synthesis (voice coaching) ----
  const speak = useCallback((text) => {
    if (!voice || typeof window === 'undefined' || !window.speechSynthesis) return;
    const now = Date.now();
    if (now - stateRef.current.lastCueAt < 2500) return;
    stateRef.current.lastCueAt = now;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch {}
  }, [voice]);

  // ---- Start / stop camera + MediaPipe ----
  async function start() {
    setStatus('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((r) => { videoRef.current.onloadedmetadata = r; });
        await videoRef.current.play();
      }
      const vision = await import(/* webpackIgnore: true */ MP_SCRIPT);
      const { FilesetResolver, PoseLandmarker } = vision;
      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm');
      const lm = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO', numPoses: 1,
      });
      landmarkerRef.current = lm;
      setStatus('running');
      setReps(0); setBadReps(0); setFormScore(100); setSeconds(0); setReport(null); setCue('');
      stateRef.current = { phase: initialPhase(exerciseId), lastRepAt: 0, lastCueAt: 0, formSamples: [], issues: {}, activeIssues: new Set(), lastIssueAt: 0, flash: 0 };
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      loop();
      speak(`Let's go. I'll count your ${exercise.name}s and check your form.`);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Could not start the camera');
      setStatus('idle');
      stopStream();
    }
  }

  function stopStream() {
    cancelAnimationFrame(rafRef.current);
    clearInterval(timerRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    try { landmarkerRef.current?.close(); } catch {}
    landmarkerRef.current = null;
  }

  useEffect(() => () => stopStream(), []);

  // ---- Detection loop ----
  function loop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarkerRef.current;
    if (!video || !canvas || !lm || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.save(); ctx.scale(-1, 1); ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    let out;
    try { out = lm.detectForVideo(video, performance.now()); } catch {}
    if (out?.landmarks?.[0]) {
      const pts = out.landmarks[0];
      const state = stateRef.current;
      const { newPhase, repCompleted, issues, depthCue } = exercise.analyse(pts, state.phase);
      state.phase = newPhase;
      // Track active issues for joint highlight (visible only while the issue is still true).
      state.activeIssues = new Set(issues);
      if (issues.length) { state.lastIssueAt = performance.now(); setActiveIssue(issues[0]); }
      else if (performance.now() - state.lastIssueAt > 1200) setActiveIssue(null);
      if (repCompleted && performance.now() - state.lastRepAt > 800) {
        state.lastRepAt = performance.now();
        if (!issues.length) {
          setReps((r) => r + 1); speak('Good rep.'); state.flash = 350;
        } else {
          setBadReps((r) => r + 1);
          const issue = issues[0]; state.issues[issue] = (state.issues[issue] || 0) + 1;
          speak(`Watch your form — ${issue}.`); setCue(`Correct: ${issue}.`);
        }
        state.formSamples.push(issues.length === 0 ? 100 : 55);
        if (state.formSamples.length > 20) state.formSamples.shift();
        const avg = state.formSamples.reduce((s, v) => s + v, 0) / state.formSamples.length;
        setFormScore(Math.round(avg));
      }
      if (depthCue) setCue(depthCue);
      drawSkeleton(ctx, pts, canvas.width, canvas.height, exercise.highlightJoints(issues), state.flash > 0);
    }
    if (stateRef.current.flash > 0) stateRef.current.flash -= 16;
    rafRef.current = requestAnimationFrame(loop);
  }

  function drawSkeleton(ctx, pts, w, h, highlightSet, greenFlash) {
    // Mirror-adjust: since we drew video mirrored, mirror x for landmarks too.
    const px = (i) => ({ x: (1 - pts[i].x) * w, y: pts[i].y * h });
    const bones = [
      [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 12], [11, 23], [12, 24], [23, 24],
      [23, 25], [25, 27], [24, 26], [26, 28],
    ];
    // Bones — colour red if either endpoint is highlighted (issue active), else default.
    for (const [a, b] of bones) {
      const bad = highlightSet.has(a) || highlightSet.has(b);
      ctx.strokeStyle = bad ? 'rgba(248,113,113,0.95)' : 'rgba(56,189,248,0.9)';
      ctx.lineWidth = bad ? 4.5 : 3;
      const A = px(a), B = px(b);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    // Joints
    for (let i = 11; i <= 28; i++) {
      const P = px(i);
      const bad = highlightSet.has(i);
      const glow = bad ? 'rgba(248,113,113,0.95)' : '#a78bfa';
      if (bad) {
        // Pulsing red glow ring on problematic joints.
        const t = performance.now() / 200;
        const rr = 8 + Math.sin(t) * 2;
        ctx.beginPath(); ctx.fillStyle = 'rgba(248,113,113,0.25)';
        ctx.arc(P.x, P.y, rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(P.x, P.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Green rep-completion flash overlay.
    if (greenFlash) {
      ctx.fillStyle = 'rgba(52,211,153,0.18)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ---- End session + save + AI coaching summary + refresh history ----
  async function end() {
    setStatus('ending');
    stopStream();
    const issuesObj = stateRef.current.issues || {};
    const commonIssues = Object.entries(issuesObj).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    try {
      const r = await fetch('/api/health/trainer/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSec: seconds,
          exercises: [{ name: exercise.id, correctReps: reps, badReps, avgFormScore: formScore, commonIssues, issuesCount: issuesObj }],
          userWeightKg: 70,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setReport(d.item);
      speak('Session saved. Great work.');
      loadHistory();
    } catch (e) {
      toast.error(e.message);
      setReport({ durationSec: seconds, exercises: [{ name: exercise.id, correctReps: reps, badReps, avgFormScore: formScore, commonIssues }], estimatedKcal: 0 });
    } finally { setStatus('idle'); }
  }

  // ---- UI ----
  if (tier === 'loading') return <div className="p-10 text-center text-white/50"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>;
  if (tier !== 'premium') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-purple-500 grid place-items-center mb-4"><Crown className="w-6 h-6 text-black" /></div>
        <h1 className="text-3xl font-semibold">AI Personal Trainer</h1>
        <p className="mt-3 text-white/60 max-w-lg mx-auto">Real-time pose detection, rep counting, form-correction overlays and voice coaching for squats, push-ups &amp; lunges — powered by MediaPipe running entirely on your device. Available on the Premium plan.</p>
        <Link href="/dashboard/upgrade" className="mt-6 inline-flex items-center gap-2 accent-bg rounded-lg px-5 py-2.5 font-semibold hover:opacity-90 transition" data-testid="trainer-upgrade">
          <Crown className="w-4 h-4" /> Upgrade to Premium
        </Link>
        <div className="mt-8 text-xs text-white/40">Learn how it works: <Link href="/dashboard/help/ai-trainer" className="accent-text hover:underline">AI Trainer guide</Link></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href="/dashboard/health" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-4" data-testid="trainer-back">
        <ArrowLeft className="w-4 h-4" /> Health
      </Link>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 grid place-items-center"><Sparkles className="w-5 h-5 text-black" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-3xl font-semibold">AI Personal Trainer</h1>
          <p className="text-sm text-white/50">Pose-guided reps · animated form correction · voice coaching</p>
        </div>
        {streak > 0 && (
          <div className="text-xs px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center gap-1.5" data-testid="trainer-streak">
            <Flame className="w-3.5 h-3.5"/> {streak}-day streak
          </div>
        )}
      </div>

      {/* Exercise selector (disabled during a live session) */}
      <div className="flex flex-wrap gap-2 mb-5">
        {EXERCISE_LIST.map(e => (
          <button
            key={e.id}
            disabled={status === 'running' || status === 'loading'}
            onClick={() => setExerciseId(e.id)}
            className={`text-sm rounded-xl px-4 py-2 border transition disabled:opacity-40 disabled:cursor-not-allowed ${exerciseId === e.id ? 'bg-white/10 border-sky-400/60 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
            data-testid={`trainer-exercise-${e.id}`}
          >
            <span className="mr-1">{e.icon}</span> {e.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Camera pane */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/60 relative aspect-[4/3]">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-0" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
          {status === 'idle' && !report && (
            <div className="absolute inset-0 grid place-items-center text-center p-6">
              <div>
                <Camera className="w-8 h-8 mx-auto mb-3 text-white/40" />
                <div className="text-lg font-semibold">Ready to train?</div>
                <div className="text-sm text-white/50 mt-1 max-w-sm">Stand back so your whole body is visible. We&apos;ll ask for camera permission — video stays on your device.</div>
                <button onClick={start} className="mt-4 inline-flex items-center gap-2 accent-bg rounded-lg px-5 py-2.5 font-semibold hover:opacity-90 transition" data-testid="trainer-start">
                  <Play className="w-4 h-4" /> Start {exercise.name} Session
                </button>
              </div>
            </div>
          )}
          {status === 'loading' && (
            <div className="absolute inset-0 grid place-items-center text-center"><Loader2 className="w-6 h-6 animate-spin text-white/60" /></div>
          )}
          {status === 'running' && (
            <>
              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                <Badge>{exercise.icon} {exercise.name}</Badge>
                <Badge><Clock className="w-3 h-3 inline mr-1 -mt-0.5"/>{fmtTime(seconds)}</Badge>
                <Badge tone="sky">{reps} good</Badge>
                {badReps > 0 && <Badge tone="rose">{badReps} bad</Badge>}
              </div>
              {/* Live form-score gauge (bottom-left ring) */}
              <div className="absolute top-3 right-3">
                <FormGauge score={formScore} />
              </div>
              {cue && (
                <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur rounded-xl px-4 py-2 text-sm text-white flex items-center gap-2" data-testid="trainer-cue">
                  <Info className="w-4 h-4 text-sky-300" /> {cue}
                </div>
              )}
              {/* Live form-correction overlay — appears on the right side when an issue is active. */}
              {activeIssue && (
                <div className="absolute bottom-20 right-3 max-w-[240px] bg-rose-950/80 border border-rose-500/50 backdrop-blur rounded-xl p-3 animate-in fade-in slide-in-from-right-4" data-testid="trainer-correction">
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-rose-300 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5"/> Fix your form
                  </div>
                  <div className="text-sm font-semibold text-white capitalize mb-1">{activeIssue}</div>
                  <p className="text-xs text-white/80 leading-relaxed">{CORRECTION_TIPS[activeIssue] || 'Reset to the starting position and try again slowly.'}</p>
                  {/* Tiny SVG "animation" showing correct alignment. */}
                  <div className="mt-2 flex justify-center">
                    <CorrectionDiagram issue={activeIssue} />
                  </div>
                </div>
              )}
            </>
          )}
          {status === 'ending' && (
            <div className="absolute inset-0 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-white/60" /></div>
          )}
          {status === 'idle' && report && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur p-6 text-center">
              <div>
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2"/>
                <div className="text-xl font-semibold">Session complete!</div>
                <div className="text-sm text-white/60 mt-1">Scroll down for your full report.</div>
                <button onClick={() => { setReport(null); }} className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm hover:bg-white/20 transition" data-testid="trainer-new">
                  Start another set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Voice coaching</div>
            <button onClick={() => setVoice((v) => !v)} className="w-full inline-flex items-center justify-center gap-2 bg-black/40 border border-white/10 rounded-lg py-2 hover:bg-white/5 transition" data-testid="trainer-voice-toggle">
              {voice ? <><Volume2 className="w-4 h-4" /> Voice ON</> : <><VolumeX className="w-4 h-4" /> Voice OFF</>}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 p-4">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Form tips — {exercise.name}</div>
            <ul className="text-sm text-white/70 list-disc ml-4 space-y-1">
              {exercise.tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>

          {status === 'running' && (
            <button onClick={end} className="w-full bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-lg py-2.5 font-semibold hover:bg-rose-500/30 transition flex items-center justify-center gap-2" data-testid="trainer-end">
              <Square className="w-4 h-4" /> End session
            </button>
          )}
        </div>
      </div>

      {/* Full session report */}
      {report && <SessionReport report={report} history={history} exerciseName={exercise.name} />}

      {/* History section */}
      {!report && history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-white/60"/>
            <h2 className="text-lg font-semibold">Recent sessions</h2>
            <span className="text-xs text-white/40 ml-1">({history.length})</span>
          </div>
          <HistoryChart history={history} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {history.slice(0, 6).map(s => (
              <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3 group" data-testid={`trainer-history-${s.id}`}>
                <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center text-xl">{ANALYSERS[s.exercises?.[0]?.name]?.icon || '🏋️'}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{ANALYSERS[s.exercises?.[0]?.name]?.name || 'Session'} · {s.totalCorrectReps} reps</div>
                  <div className="text-xs text-white/40">{new Date(s.createdAt).toLocaleDateString()} · {fmtTime(s.durationSec)} · {s.formScore}% form · {s.estimatedKcal} kcal</div>
                </div>
                <button
                  onClick={() => deleteSession(s.id)}
                  aria-label="Delete session"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-rose-300/80 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                  data-testid={`trainer-history-delete-${s.id}`}
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-white/40">
        Suvio&apos;s AI Trainer is informational and does not replace professional medical advice.
      </div>
    </div>
  );
}

function Badge({ children, tone }) {
  const tones = {
    sky: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
    rose: 'bg-rose-500/20 border-rose-500/40 text-rose-200',
    amber: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
    emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
  };
  return <div className={`text-xs px-2.5 py-1 rounded-full border backdrop-blur ${tones[tone] || 'bg-black/50 border-white/10 text-white'}`}>{children}</div>;
}
function fmtTime(s) { const m = Math.floor((s||0)/60); const r = (s||0)%60; return `${m}:${String(r).padStart(2,'0')}`; }

// Circular form-score gauge shown live during workout.
function FormGauge({ score }) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = (clamped / 100) * 360;
  const color = clamped >= 80 ? '#34d399' : clamped >= 60 ? '#fbbf24' : '#f87171';
  return (
    <div className="w-16 h-16 rounded-full grid place-items-center bg-black/60 border border-white/10 backdrop-blur" style={{ background: `conic-gradient(${color} ${angle}deg, rgba(255,255,255,0.08) ${angle}deg)` }} data-testid="trainer-form-gauge">
      <div className="w-12 h-12 rounded-full bg-black grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-sm font-bold" style={{ color }}>{clamped}%</div>
          <div className="text-[8px] uppercase tracking-wider text-white/40">Form</div>
        </div>
      </div>
    </div>
  );
}

// Full post-session report with metric grid, issues breakdown, AI coach note.
function SessionReport({ report, history, exerciseName }) {
  const ex = report.exercises?.[0] || {};
  const total = (ex.correctReps || 0) + (ex.badReps || 0);
  const goodPct = total ? Math.round((ex.correctReps / total) * 100) : 0;
  const issues = ex.commonIssues || [];

  // Progress comparison vs. previous session of the same exercise.
  const prev = history.find(h => h.exercises?.[0]?.name === ex.name && h.id !== report.id);
  const prevForm = prev?.formScore;
  const formDelta = typeof prevForm === 'number' ? (ex.avgFormScore ?? 0) - prevForm : null;
  const prevReps = prev?.totalCorrectReps;
  const repsDelta = typeof prevReps === 'number' ? (ex.correctReps ?? 0) - prevReps : null;

  // Rest-day recommendation heuristic: 3+ consecutive days OR 2 sessions today.
  const days = new Set(history.map(h => new Date(h.createdAt).toISOString().slice(0, 10)));
  const today = new Date().toISOString().slice(0, 10);
  const sessionsToday = history.filter(h => new Date(h.createdAt).toISOString().slice(0, 10) === today).length;
  const streakLike = days.size >= 3;
  const suggestRest = sessionsToday >= 2 || (streakLike && (ex.avgFormScore ?? 0) < 70);

  return (
    <div className="mt-8 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-purple-500/10 p-6" data-testid="trainer-report">
      <div className="flex items-center gap-3 mb-5">
        <TrendingUp className="w-5 h-5 text-sky-300"/>
        <h2 className="text-xl font-semibold">Workout report — {exerciseName}</h2>
      </div>

      {/* Progress-vs-last-time chips (if history available) */}
      {(formDelta !== null || repsDelta !== null) && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="trainer-progress-vs-last">
          {formDelta !== null && (
            <div className={`text-xs px-2.5 py-1 rounded-full border ${formDelta >= 0 ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' : 'bg-rose-500/15 border-rose-400/40 text-rose-200'}`}>
              Form {formDelta >= 0 ? '↑' : '↓'} {Math.abs(formDelta)}% vs last {exerciseName}
            </div>
          )}
          {repsDelta !== null && (
            <div className={`text-xs px-2.5 py-1 rounded-full border ${repsDelta >= 0 ? 'bg-sky-500/15 border-sky-400/40 text-sky-200' : 'bg-amber-500/15 border-amber-400/40 text-amber-200'}`}>
              Reps {repsDelta >= 0 ? '+' : ''}{repsDelta} vs last session
            </div>
          )}
        </div>
      )}

      {/* Metric grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Clock className="w-4 h-4 text-sky-300"/>} label="Duration" value={fmtTime(report.durationSec)} />
        <MetricCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-300"/>} label="Correct reps" value={ex.correctReps ?? 0} sub={`${goodPct}% of total`} />
        <MetricCard icon={<AlertTriangle className="w-4 h-4 text-rose-300"/>} label="Bad-form reps" value={ex.badReps ?? 0} />
        <MetricCard icon={<Flame className="w-4 h-4 text-amber-300"/>} label="Calories burned" value={`${report.estimatedKcal ?? 0} kcal`} />
      </div>

      {/* Form score + issue breakdown */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 flex items-center gap-4">
          <FormGauge score={ex.avgFormScore ?? 0} />
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">Average form score</div>
            <div className="text-2xl font-semibold mt-0.5">{ex.avgFormScore ?? 0}<span className="text-sm text-white/40">%</span></div>
            <div className="text-xs text-white/50 mt-1">
              {(ex.avgFormScore ?? 0) >= 85 ? 'Excellent technique — keep it steady.' : (ex.avgFormScore ?? 0) >= 65 ? 'Solid — polish the flagged issues below.' : 'Focus on form over count next session.'}
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Top issues to fix</div>
          {issues.length === 0 ? (
            <div className="text-sm text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> No repeated form issues detected — great job!</div>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {issues.map(i => (
                <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"/> {i}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Adaptive next-workout suggestion (rest / harder / same) */}
      <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4" data-testid="trainer-next-suggestion">
        <div className="text-xs uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-300"/> Next session suggestion
        </div>
        {suggestRest ? (
          <p className="text-sm text-white/85">Take a rest day tomorrow. Recovery is when the muscle actually builds — you've earned it.</p>
        ) : (ex.avgFormScore ?? 0) >= 85 && (ex.correctReps ?? 0) >= 12 ? (
          <p className="text-sm text-white/85">Solid technique + volume. Next time try <span className="font-semibold">+2 reps</span> or add a <span className="font-semibold">2-second pause at the bottom</span> to increase difficulty.</p>
        ) : (ex.avgFormScore ?? 0) < 65 ? (
          <p className="text-sm text-white/85">Drop the rep count by 30% next time and slow the movement down — quality over quantity until form scores {'>'}75%.</p>
        ) : (
          <p className="text-sm text-white/85">Keep the same volume tomorrow and focus on the flagged issues above. Small daily reps beat one heavy session.</p>
        )}
      </div>

      {/* AI coach note */}
      {report.coachingSummary && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-purple-300"/> Coach's note</div>
          <p className="text-sm text-white/85 leading-relaxed">{report.coachingSummary}</p>
          <div className="mt-2 text-[10px] text-white/40">Informational only — not medical advice.</div>
        </div>
      )}

      {/* Form-score history */}
      {history.length > 1 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-3">Form-score history · last {Math.min(history.length, 10)} sessions</div>
          <HistoryChart history={history} inset />
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

// Simple SVG bar chart of last N form scores. `history` is newest-first.
function HistoryChart({ history, inset }) {
  const data = [...history].slice(0, 10).reverse(); // oldest → newest
  const w = 100 / Math.max(data.length, 1);
  return (
    <div className={`w-full ${inset ? '' : 'rounded-xl border border-white/10 bg-black/30 p-4'}`}>
      <div className="flex items-end gap-1 h-24">
        {data.map((s, i) => {
          const score = s.formScore || 0;
          const color = score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : 'bg-rose-400';
          return (
            <div key={s.id || i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className={`w-full ${color} rounded-sm transition-all`} style={{ height: `${Math.max(4, score)}%` }} title={`${score}%`} />
              <div className="hidden group-hover:block absolute -top-8 text-[10px] bg-black/80 border border-white/10 rounded px-1.5 py-0.5 whitespace-nowrap">
                {score}% · {ANALYSERS[s.exercises?.[0]?.name]?.name || 'Session'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-white/40 mt-2">
        <span>oldest</span>
        <span>newest</span>
      </div>
    </div>
  );
}
