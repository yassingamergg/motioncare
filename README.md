# 🩺 MotionCare AI — AI-Assisted Rehabilitation Platform

> **MotionCare AI turns an ordinary phone or laptop camera into an AI-assisted rehabilitation coach and gives physiotherapists objective visibility into a patient's recovery between appointments.**

[![Tests](https://img.shields.io/badge/tests-78%20passing-emerald)](https://github.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-BlazePose-orange.svg)](https://developers.google.com/mediapipe)
[![Supabase](https://img.shields.io/badge/Database-Supabase-emerald.svg)](https://supabase.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-purple.svg)](https://ai.google.dev/)

---

## ⚕️ Important Medical Product Rule

MotionCare AI is an assistive biomechanical observation tool designed to assist licensed physiotherapists. It does **NOT** diagnose medical conditions, prescribe treatments, or independently decide what exercises a patient should perform. All AI feedback and progress notes are assistive observations for clinician review.

---

## 🚀 Key Features

### 1. Privacy-Preserving On-Device Computer Vision
* **100% Client-Side BlazePose Inference**: 33 full-body anatomical landmark tracking running locally via WebAssembly and GPU acceleration ($30\text{+ FPS}$).
* **Zero Video Streaming**: Raw video frames and facial imagery **never leave the user's device**.

### 2. Biomechanical Repetition & Finite State Machine
* Real-time kinematic tracking of joint angles (knee flexion, hip extension, torso lean).
* Anti-glitch hysteresis state machine (`STANDING` $\rightarrow$ `DESCENDING` $\rightarrow$ `BOTTOM` $\rightarrow$ `ASCENDING` $\rightarrow$ `STANDING`).
* Exponential Moving Average (EMA) smoothing and rep tempo bounds ($1.0\text{s}-8.0\text{s}$).

### 3. Multi-Dimensional Form Quality Scoring
* Evaluates 4 biomechanical dimensions:
  1. **Squat Depth / ROM Flexion** (Prescribed target $\le 90^\circ$).
  2. **Knee Alignment / Valgus Detection** (Inward tracking vs. ankle base).
  3. **Torso Uprightness** (Trunk forward lean monitoring).
  4. **Tempo & Eccentric Control** (Descent cadence).
* Delivers real-time prioritized clinical cues and a composite **0–100% MotionCare Form Score**.

### 4. Session Lifecycle & Patient Pain Tracking
* Complete clinical workflow: `READY` $\rightarrow$ `ACTIVE` $\rightarrow$ `PAIN_REPORT` $\rightarrow$ `COMPLETED`.
* Standardized **Visual Analog Scale (VAS 0–10)** pre- and post-exercise pain reporting.
* Real-time active chronometer and net discomfort delta ($\Delta \text{Pain}$) tracking.

### 5. Supabase Relational Persistence & Local Vault
* Full PostgreSQL relational schema (`patients`, `exercises`, `rehabilitation_programs`, `sessions`, `exercise_results`).
* **Dual-Mode Persistence**: Automatically syncs with Supabase Cloud when configured, or stores safely in an offline local clinical vault.

### 6. Longitudinal Recovery Analytics & Recharts Trends
* Interactive clinical charts:
  * **Form Quality Evolution** (AreaChart with 85% target benchmark).
  * **Knee Flexion ROM Progression** (LineChart with $90^\circ$ target line).
  * **Pain Trajectory Comparison** (Pre- vs Post-VAS bar chart).
* Chronological session history with rep-by-rep kinematic audit tables.

### 7. Google Gemini AI SOAP Progress Notes
* Automated clinical documentation formatted in standard physical therapy **SOAP format** (Subjective, Objective, Assessment, Plan).
* Powered by **Gemini 2.0 Flash / 1.5 Flash** with an on-device deterministic fallback engine when offline.
* **1-Click "Copy for EHR/EMR"** ready for Epic, Cerner, WebPT, or clinical charting.

---

## 🏗️ Architecture & Technology Stack

```
MotionCare AI
├── UI Layer: React 19, Tailwind CSS v4, Lucide React, Recharts
├── Vision Pipeline: MediaPipe BlazePose (@mediapipe/tasks-vision), WebAssembly
├── Kinematics Engine: Biomechanical vector geometry, EMA filtering, Repetition FSM
├── AI Layer: Google Gemini REST API (2.0 Flash / 1.5 Flash), Clinical SOAP Generator
└── Persistence Layer: Supabase JS Client, PostgreSQL Relational Schema, Local Clinical Vault
```

---

## 📦 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* Webcam or camera-equipped device

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/motioncare.git
cd motioncare

# Install dependencies
npm install
```

### Environment Configuration (Optional)
Copy `.env.example` to `.env` to connect Supabase and Gemini (the app also includes in-app settings via the ⚙️ icon):

```env
# Supabase Cloud Database (optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini API Key (optional)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Run Locally
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Verification

Run the full automated test suite (78 tests across 6 suites):
```bash
npm test
```

Build for production:
```bash
npm run build
```

---

## 🛡️ Privacy & Compliance Guarantee

MotionCare AI is built with privacy-by-design principles:
* No video feeds or images are ever uploaded to cloud servers or LLMs.
* LLMs receive only anonymous, numerical kinematics (e.g. angle degrees, repetition counts, durations, and VAS pain numbers).
* Offline-first local vault ensures zero data loss even in low-connectivity clinical settings.

---

## 📄 License
MIT License.
