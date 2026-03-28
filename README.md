# 🛍️ EtsyGen — Personal Digital Product Generator

A personal tool for generating high-quality printable digital products to sell on Etsy. Completely free to run using free AI APIs.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Add your API key to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Getting Free API Keys

### Google Gemini (Recommended)
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API key" — no credit card needed
3. Add to `.env.local`: `GEMINI_API_KEY=your-key`

### Groq (Fastest)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and create a free API key
3. Add to `.env.local`: `GROQ_API_KEY=your-key`

### Ollama (Local, Unlimited)
1. Install from [ollama.com](https://ollama.com)
2. Run: `ollama pull llama3`
3. No API key needed — select Ollama in Settings

## Configuring AI Provider

Go to **Settings** in the app sidebar and select your provider, or set `DEFAULT_AI_PROVIDER=gemini` in `.env.local`.

## Generating Your First Product

1. Click **Generate** in the sidebar
2. Pick a niche (ADHD, MDD, Anxiety, Social, General, Techie)
3. Pick a product type
4. Customize colors, font, page size
5. Click **Generate Content with AI**
6. Download your PDF
7. Use **Etsy Helper** to generate the listing title, tags, and description

## Niches & Products

| Niche | Products |
|-------|---------|
| 🧠 ADHD | Daily Planner, Brain Dump, Dopamine Menu, Micro-Task Breaker, Habit Streak, Morning Ritual, Focus Timer, Weekly Reset |
| 💙 MDD | Mood Check-In, Gratitude Journal, Small Win Cards, Self-Care Menu, Therapy Prep, Affirmation Deck, Progress Tracker, Gentle Planner |
| 🌊 Anxiety | CBT Thought Record, 5-4-3-2-1 Grounding, Box Breathing, Worry Dump, Safety Plan, Calm Down Kit, Control Circle, Anxiety Tracker |
| 🤝 Social | Conversation Starters, Social Battery Tracker, Boundary Scripts, Post-Social Recovery, Email Templates, Meeting Prep, Small Talk Guide, Social Goals |
| 🌟 General | Weekly/Monthly Planner, Budget Tracker, Meal Planner, Goal Setting, Cleaning Schedule, Reading/Fitness/Habit Tracker, Vision Board |
| 💻 Techie | Sprint Planner, Code Review Checklist, Side Project Tracker, Learning Roadmap, Bug Triage, Standup Notes, Retro Template, System Design |
