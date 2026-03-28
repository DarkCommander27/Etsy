export interface ColorScheme {
  id: string;
  name: string;
  background: string;
  primary: string;
  secondary: string;
  text: string;
  accent: string;
}

export interface ProductType {
  id: string;
  name: string;
  description: string;
  icon: string;
  pages: number;
}

export interface Niche {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  colorSchemes: ColorScheme[];
  products: ProductType[];
}

export const NICHES: Niche[] = [
  {
    id: 'adhd',
    name: 'ADHD',
    description: 'Tools for focus, organization, and dopamine-friendly planning',
    icon: '🧠',
    color: 'blue',
    colorSchemes: [
      { id: 'calm-blue', name: 'Calm Blue', background: '#F0F7FF', primary: '#2563EB', secondary: '#DBEAFE', text: '#1E3A5F', accent: '#60A5FA' },
      { id: 'focus-green', name: 'Focus Green', background: '#F0FFF4', primary: '#16A34A', secondary: '#DCFCE7', text: '#14532D', accent: '#4ADE80' },
      { id: 'energy-orange', name: 'Energy Orange', background: '#FFF7ED', primary: '#EA580C', secondary: '#FED7AA', text: '#431407', accent: '#FB923C' },
      { id: 'purple-calm', name: 'Purple Calm', background: '#FAF5FF', primary: '#7C3AED', secondary: '#EDE9FE', text: '#2E1065', accent: '#A78BFA' },
    ],
    products: [
      { id: 'daily-planner', name: 'Daily Planner', description: 'Time-blocked daily schedule with priority tasks', icon: '📅', pages: 2 },
      { id: 'brain-dump', name: 'Brain Dump', description: 'Capture all thoughts, then sort by category', icon: '🌀', pages: 2 },
      { id: 'dopamine-menu', name: 'Dopamine Menu', description: 'Categorized list of feel-good activities', icon: '⚡', pages: 1 },
      { id: 'micro-task', name: 'Micro-Task Breaker', description: 'Break big tasks into tiny, doable steps', icon: '🔨', pages: 2 },
      { id: 'habit-streak', name: 'Habit Streak Tracker', description: '30-day habit tracking grid', icon: '🔥', pages: 1 },
      { id: 'morning-ritual', name: 'Morning Ritual', description: 'Structured morning routine checklist', icon: '☀️', pages: 1 },
      { id: 'focus-timer', name: 'Focus Timer Log', description: 'Pomodoro-style focus session tracker', icon: '⏱️', pages: 2 },
      { id: 'weekly-reset', name: 'Weekly Reset', description: 'End-of-week reflection and next week prep', icon: '🔄', pages: 2 },
    ],
  },
  {
    id: 'mdd',
    name: 'MDD Support',
    description: 'Gentle tools for mood tracking, gratitude, and emotional wellness',
    icon: '💙',
    color: 'purple',
    colorSchemes: [
      { id: 'soft-lavender', name: 'Soft Lavender', background: '#FAF5FF', primary: '#7C3AED', secondary: '#EDE9FE', text: '#2E1065', accent: '#C084FC' },
      { id: 'warm-sage', name: 'Warm Sage', background: '#F0FFF4', primary: '#059669', secondary: '#D1FAE5', text: '#064E3B', accent: '#34D399' },
      { id: 'dusty-rose', name: 'Dusty Rose', background: '#FFF1F2', primary: '#E11D48', secondary: '#FFE4E6', text: '#881337', accent: '#FB7185' },
      { id: 'sky-blue', name: 'Sky Blue', background: '#F0F9FF', primary: '#0284C7', secondary: '#E0F2FE', text: '#0C4A6E', accent: '#38BDF8' },
    ],
    products: [
      { id: 'mood-checkin', name: 'Mood Check-In', description: 'Daily emotional weather report', icon: '🌤️', pages: 1 },
      { id: 'gratitude-journal', name: 'Gratitude Journal', description: 'Structured gratitude prompts', icon: '🙏', pages: 2 },
      { id: 'small-win-cards', name: 'Small Win Cards', description: 'Celebrate micro-victories', icon: '🏆', pages: 1 },
      { id: 'self-care-menu', name: 'Self-Care Menu', description: 'Categorized self-care activities', icon: '🌸', pages: 1 },
      { id: 'therapy-prep', name: 'Therapy Prep Sheet', description: 'Pre-session reflection questions', icon: '💬', pages: 2 },
      { id: 'affirmation-deck', name: 'Affirmation Cards', description: 'Printable positive affirmation cards', icon: '✨', pages: 2 },
      { id: 'progress-tracker', name: 'Progress Tracker', description: 'Track recovery and growth milestones', icon: '📈', pages: 2 },
      { id: 'gentle-planner', name: 'Gentle Daily Planner', description: 'Low-pressure, compassionate daily planner', icon: '🌻', pages: 2 },
    ],
  },
  {
    id: 'anxiety',
    name: 'Anxiety Relief',
    description: 'Evidence-based tools for managing anxiety and stress',
    icon: '🌊',
    color: 'teal',
    colorSchemes: [
      { id: 'ocean-calm', name: 'Ocean Calm', background: '#F0FDFA', primary: '#0D9488', secondary: '#CCFBF1', text: '#134E4A', accent: '#2DD4BF' },
      { id: 'misty-grey', name: 'Misty Grey', background: '#F8FAFC', primary: '#475569', secondary: '#E2E8F0', text: '#0F172A', accent: '#94A3B8' },
      { id: 'forest-green', name: 'Forest Green', background: '#F0FDF4', primary: '#15803D', secondary: '#DCFCE7', text: '#14532D', accent: '#4ADE80' },
      { id: 'sunrise-yellow', name: 'Sunrise Yellow', background: '#FEFCE8', primary: '#CA8A04', secondary: '#FEF9C3', text: '#713F12', accent: '#FCD34D' },
    ],
    products: [
      { id: 'cbt-thought-record', name: 'CBT Thought Record', description: 'Cognitive behavioral therapy worksheet', icon: '🧩', pages: 2 },
      { id: 'grounding-5-4-3-2-1', name: '5-4-3-2-1 Grounding', description: 'Sensory grounding exercise card', icon: '🌿', pages: 1 },
      { id: 'box-breathing', name: 'Box Breathing Guide', description: 'Visual breathing exercise', icon: '📦', pages: 1 },
      { id: 'worry-dump', name: 'Worry Dump Journal', description: 'Externalize worries with reality check', icon: '📝', pages: 2 },
      { id: 'safety-plan', name: 'Safety Plan', description: 'Personal crisis safety planning worksheet', icon: '🛡️', pages: 2 },
      { id: 'calm-down-kit', name: 'Calm Down Kit', description: 'Printable coping strategies toolkit', icon: '🎒', pages: 2 },
      { id: 'what-i-can-control', name: 'Control Circle', description: 'Focus on what you can control', icon: '⭕', pages: 1 },
      { id: 'anxiety-tracker', name: 'Anxiety Tracker', description: 'Track triggers, intensity, and coping', icon: '📊', pages: 2 },
    ],
  },
  {
    id: 'social',
    name: 'Social Skills',
    description: 'Tools for navigating social situations with confidence',
    icon: '🤝',
    color: 'amber',
    colorSchemes: [
      { id: 'warm-amber', name: 'Warm Amber', background: '#FFFBEB', primary: '#D97706', secondary: '#FDE68A', text: '#451A03', accent: '#F59E0B' },
      { id: 'peach-soft', name: 'Peach Soft', background: '#FFF7ED', primary: '#EA580C', secondary: '#FFEDD5', text: '#431407', accent: '#FB923C' },
      { id: 'mint-fresh', name: 'Mint Fresh', background: '#F0FDF4', primary: '#16A34A', secondary: '#DCFCE7', text: '#14532D', accent: '#4ADE80' },
      { id: 'coral-pink', name: 'Coral Pink', background: '#FFF1F2', primary: '#E11D48', secondary: '#FFE4E6', text: '#881337', accent: '#FB7185' },
    ],
    products: [
      { id: 'conversation-starters', name: 'Conversation Starters', description: 'Icebreaker questions by setting', icon: '💬', pages: 2 },
      { id: 'social-battery', name: 'Social Battery Tracker', description: 'Monitor energy levels around socializing', icon: '🔋', pages: 1 },
      { id: 'boundary-scripts', name: 'Boundary Scripts', description: 'Pre-written scripts for setting limits', icon: '🚧', pages: 2 },
      { id: 'post-social-recovery', name: 'Post-Social Recovery', description: 'Recharge plan after social events', icon: '🏠', pages: 1 },
      { id: 'email-templates', name: 'Email Templates', description: 'Templates for hard conversations', icon: '✉️', pages: 2 },
      { id: 'meeting-prep', name: 'Meeting Prep', description: 'Prepare talking points and questions', icon: '📋', pages: 1 },
      { id: 'small-talk', name: 'Small Talk Guide', description: 'Topics and responses for small talk', icon: '🗣️', pages: 1 },
      { id: 'social-goals', name: 'Social Goals', description: 'Set and track social skill goals', icon: '🎯', pages: 2 },
    ],
  },
  {
    id: 'human',
    name: 'General Life',
    description: 'Universal productivity and life organization tools',
    icon: '🌟',
    color: 'green',
    colorSchemes: [
      { id: 'clean-white', name: 'Clean White', background: '#FFFFFF', primary: '#1F2937', secondary: '#F3F4F6', text: '#111827', accent: '#6B7280' },
      { id: 'nature-green', name: 'Nature Green', background: '#F0FDF4', primary: '#15803D', secondary: '#DCFCE7', text: '#14532D', accent: '#4ADE80' },
      { id: 'navy-blue', name: 'Navy Blue', background: '#F8FAFC', primary: '#1E40AF', secondary: '#DBEAFE', text: '#1E3A5F', accent: '#60A5FA' },
      { id: 'golden-hour', name: 'Golden Hour', background: '#FFFBEB', primary: '#B45309', secondary: '#FDE68A', text: '#451A03', accent: '#F59E0B' },
    ],
    products: [
      { id: 'weekly-planner', name: 'Weekly Planner', description: 'Full week layout with priorities', icon: '📅', pages: 2 },
      { id: 'monthly-planner', name: 'Monthly Planner', description: 'Calendar view with goals section', icon: '🗓️', pages: 2 },
      { id: 'budget-tracker', name: 'Budget Tracker', description: 'Income, expenses, and savings tracker', icon: '💰', pages: 2 },
      { id: 'meal-planner', name: 'Meal Planner', description: 'Weekly meals with grocery list', icon: '🥗', pages: 2 },
      { id: 'goal-setting', name: 'Goal Setting', description: 'SMART goals with action plans', icon: '🎯', pages: 2 },
      { id: 'cleaning-schedule', name: 'Cleaning Schedule', description: 'Daily/weekly/monthly cleaning tasks', icon: '🧹', pages: 1 },
      { id: 'reading-tracker', name: 'Reading Tracker', description: 'Books read, ratings, and notes', icon: '📚', pages: 2 },
      { id: 'fitness-tracker', name: 'Fitness Tracker', description: 'Workout log and progress tracking', icon: '💪', pages: 2 },
      { id: 'habit-tracker', name: 'Habit Tracker', description: 'Monthly habit tracking grid', icon: '✅', pages: 1 },
      { id: 'vision-board', name: 'Vision Board Template', description: 'Guided vision board with prompts', icon: '🌈', pages: 2 },
    ],
  },
  {
    id: 'techie',
    name: 'Tech & Dev',
    description: 'Tools for developers, engineers, and tech professionals',
    icon: '💻',
    color: 'slate',
    colorSchemes: [
      { id: 'dark-code', name: 'Dark Code', background: '#0F172A', primary: '#38BDF8', secondary: '#1E293B', text: '#F1F5F9', accent: '#7C3AED' },
      { id: 'terminal-green', name: 'Terminal Green', background: '#052E16', primary: '#4ADE80', secondary: '#14532D', text: '#DCFCE7', accent: '#86EFAC' },
      { id: 'github-grey', name: 'GitHub Grey', background: '#F6F8FA', primary: '#24292E', secondary: '#E1E4E8', text: '#24292E', accent: '#0366D6' },
      { id: 'vscode-blue', name: 'VS Code Blue', background: '#1E1E1E', primary: '#007ACC', secondary: '#252526', text: '#D4D4D4', accent: '#569CD6' },
    ],
    products: [
      { id: 'sprint-planner', name: 'Sprint Planner', description: '2-week sprint planning template', icon: '🏃', pages: 2 },
      { id: 'code-review', name: 'Code Review Checklist', description: 'Systematic code review checklist', icon: '🔍', pages: 1 },
      { id: 'side-project-tracker', name: 'Side Project Tracker', description: 'Track multiple side projects', icon: '🚀', pages: 2 },
      { id: 'learning-roadmap', name: 'Learning Roadmap', description: 'Tech skill learning path planner', icon: '🗺️', pages: 2 },
      { id: 'bug-triage', name: 'Bug Triage Sheet', description: 'Systematic bug investigation template', icon: '🐛', pages: 1 },
      { id: 'standup-notes', name: 'Standup Notes', description: 'Daily standup tracker', icon: '📢', pages: 1 },
      { id: 'retro-template', name: 'Retro Template', description: 'Sprint retrospective worksheet', icon: '🔄', pages: 2 },
      { id: 'system-design', name: 'System Design Notes', description: 'Architecture decision template', icon: '🏗️', pages: 2 },
    ],
  },
];

export function getNicheById(id: string): Niche | undefined {
  return NICHES.find((n) => n.id === id);
}

export function getProductById(nicheId: string, productId: string): ProductType | undefined {
  const niche = getNicheById(nicheId);
  return niche?.products.find((p) => p.id === productId);
}

export const NICHE_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  slate: 'bg-slate-500',
};

export const NICHE_LIGHT_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  purple: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  teal: 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
  amber: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  slate: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700',
};

export const NICHE_TEXT_COLORS: Record<string, string> = {
  blue: 'text-blue-700 dark:text-blue-300',
  purple: 'text-purple-700 dark:text-purple-300',
  teal: 'text-teal-700 dark:text-teal-300',
  amber: 'text-amber-700 dark:text-amber-300',
  green: 'text-green-700 dark:text-green-300',
  slate: 'text-slate-700 dark:text-slate-300',
};
