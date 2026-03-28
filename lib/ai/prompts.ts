export function getContentPrompt(nicheId: string, productTypeId: string, customTitle?: string): string {
  const title = customTitle || productTypeId.replace(/-/g, ' ');
  const specific: Record<string, Record<string, string>> = {
    adhd: {
      'daily-planner': `Create content for an ADHD-friendly daily planner titled "${title}". Return ONLY valid JSON:\n{"title":"${title}","subtitle":"Make today manageable","date_label":"Date: ___________","top_3_priorities":["Most important task","Second priority","Third priority"],"time_blocks":[{"time":"7:00 AM","task":""},{"time":"8:00 AM","task":""},{"time":"9:00 AM","task":""},{"time":"10:00 AM","task":""},{"time":"11:00 AM","task":""},{"time":"12:00 PM","task":""},{"time":"1:00 PM","task":""},{"time":"2:00 PM","task":""},{"time":"3:00 PM","task":""},{"time":"4:00 PM","task":""},{"time":"5:00 PM","task":""},{"time":"6:00 PM","task":""}],"win_of_day":"Today's Win: ___________","energy_check":"Energy (circle): 🪫 😴 😐 🙂 ⚡","affirmation":"You don't have to do it all. You just have to start."}`,
      'brain-dump': `Create content for an ADHD brain dump worksheet. Return ONLY valid JSON:\n{"title":"Brain Dump","subtitle":"Get everything out of your head","instructions":"Write EVERYTHING on your mind — no filter, no judgment","categories":[{"name":"To Do","icon":"✅","lines":6},{"name":"Worries","icon":"😰","lines":4},{"name":"Ideas","icon":"💡","lines":5},{"name":"People to Contact","icon":"📱","lines":3},{"name":"Random Thoughts","icon":"🌀","lines":5}],"after_dump_prompt":"Now pick ONE thing to do first:","affirmation":"Your brain is not broken — it just works differently. And that's okay."}`,
      'dopamine-menu': `Create a dopamine menu for ADHD. Return ONLY valid JSON:\n{"title":"My Dopamine Menu","subtitle":"Choose based on your energy level","sections":[{"name":"🍎 Snacks (1-5 min)","description":"Quick hits","items":["Dance to one song","Step outside for air","Doodle freely","Drink a glass of water","Pet an animal"]},{"name":"🍽️ Meals (5-20 min)","description":"Medium engagement","items":["Watch a YouTube video","Tidy one small area","Call a friend","Play a mobile game","Go for a short walk"]},{"name":"🎂 Feasts (20+ min)","description":"Deep engagement","items":["Watch a show episode","Play video games","Work on a creative project","Cook a new recipe","Read a book"]},{"name":"🥗 Veggies (productive)","description":"Responsible choices","items":["Answer emails","Pay a bill","Do laundry","Meal prep","Review your calendar"]}],"note":"All activities are valid. Meet yourself where you are today."}`,
    },
    mdd: {
      'mood-checkin': `Create a daily mood check-in sheet. Return ONLY valid JSON:\n{"title":"Daily Mood Check-In","date_label":"Date:","mood_scale":{"label":"Overall Mood (circle):","options":["1 😢 Very Low","2 😔 Low","3 😐 Neutral","4 🙂 Good","5 😊 Great"]},"emotions":{"label":"I feel (check all that apply):","options":["Sad","Anxious","Numb","Hopeful","Grateful","Tired","Irritable","Calm","Lonely","Connected","Overwhelmed","Content","Scared","Safe","Confused","Clear"]},"prompts":["One thing that happened today:","One thing I am grateful for:","One thing I did for myself today:","What do I need right now?"],"affirmation":"You showed up today. That is enough."}`,
      'gratitude-journal': `Create a gratitude journal page. Return ONLY valid JSON:\n{"title":"Gratitude Journal","subtitle":"Small moments matter","date_label":"Date:","sections":[{"name":"3 Things I Am Grateful For","lines":3},{"name":"A Person I Appreciate Today","lines":2},{"name":"Something About My Body I Am Thankful For","lines":2},{"name":"A Challenge That Taught Me Something","lines":3},{"name":"A Small Joy I Noticed","lines":2}],"affirmation":"Gratitude doesn't erase pain. It just reminds you there is also light."}`,
    },
    anxiety: {
      'grounding-5-4-3-2-1': `Create a 5-4-3-2-1 grounding card. Return ONLY valid JSON:\n{"title":"5-4-3-2-1 Grounding","subtitle":"Return to the present moment","steps":[{"number":5,"sense":"SEE","icon":"👁️","instruction":"Name 5 things you can see right now"},{"number":4,"sense":"TOUCH","icon":"✋","instruction":"Name 4 things you can physically feel"},{"number":3,"sense":"HEAR","icon":"👂","instruction":"Name 3 things you can hear"},{"number":2,"sense":"SMELL","icon":"👃","instruction":"Name 2 things you can smell"},{"number":1,"sense":"TASTE","icon":"👅","instruction":"Name 1 thing you can taste"}],"after_instruction":"Take 3 slow deep breaths. You are safe. You are here.","reminder":"This feeling will pass. You have survived 100% of your difficult moments."}`,
      'cbt-thought-record': `Create a CBT thought record worksheet. Return ONLY valid JSON:\n{"title":"CBT Thought Record","subtitle":"Challenge and reframe anxious thoughts","columns":[{"name":"Situation","prompt":"What happened?"},{"name":"Auto Thought","prompt":"What went through your mind?"},{"name":"Emotions","prompt":"What emotions? Rate 0-100"},{"name":"Evidence For","prompt":"Facts supporting this thought"},{"name":"Evidence Against","prompt":"Facts NOT supporting it"},{"name":"Balanced Thought","prompt":"A more balanced view"},{"name":"Outcome","prompt":"How do you feel now?"}],"cognitive_distortions":["All-or-nothing","Catastrophizing","Mind reading","Fortune telling","Overgeneralization","Emotional reasoning","Should statements","Personalization"],"reminder":"Thoughts are not facts. You can question them."}`,
      'box-breathing': `Create a box breathing guide. Return ONLY valid JSON:\n{"title":"Box Breathing","subtitle":"Regulate your nervous system in 4 steps","steps":[{"number":1,"sense":"INHALE","icon":"⬆️","instruction":"Breathe IN slowly for 4 counts"},{"number":2,"sense":"HOLD","icon":"➡️","instruction":"HOLD your breath for 4 counts"},{"number":3,"sense":"EXHALE","icon":"⬇️","instruction":"Breathe OUT slowly for 4 counts"},{"number":4,"sense":"HOLD","icon":"⬅️","instruction":"HOLD empty for 4 counts"}],"after_instruction":"Repeat 4-6 times. This activates your parasympathetic nervous system.","reminder":"Used by Navy SEALs and therapists. It works. Keep practicing."}`,
    },
    social: {
      'conversation-starters': `Create conversation starter cards. Return ONLY valid JSON:\n{"title":"Conversation Starters","subtitle":"Never run out of things to say","sections":[{"name":"🌱 Light & Easy","description":"For new people","items":["What's the best meal you've had recently?","Are you working on anything exciting?","What do you do to unwind?","Any good shows lately?","What's your go-to weekend activity?"]},{"name":"🔥 Getting Deeper","description":"For building connection","items":["What's something you changed your mind about?","What's the best advice you've received?","What skill do you most want to learn?","What are you most proud of?","What's a goal you're working toward?"]},{"name":"😄 Fun & Playful","description":"To lighten the mood","items":["What superpower would you want?","Pineapple on pizza — yes or no?","What's your unpopular opinion?","Best vacation you've ever taken?","What would your ideal Saturday look like?"]}],"reminder":"Good conversations start with curiosity, not performance."}`,
    },
    human: {
      'weekly-planner': `Create a weekly planner. Return ONLY valid JSON:\n{"title":"Weekly Planner","subtitle":"Plan your week with intention","date_label":"Week of:","top_3_priorities":["Top priority this week","Second priority","Third priority"],"time_blocks":[{"time":"Monday","task":""},{"time":"Tuesday","task":""},{"time":"Wednesday","task":""},{"time":"Thursday","task":""},{"time":"Friday","task":""},{"time":"Saturday","task":""},{"time":"Sunday","task":""}],"win_of_day":"Weekly Win:","affirmation":"Progress over perfection. Every small step counts."}`,
      'budget-tracker': `Create a monthly budget tracker. Return ONLY valid JSON:\n{"title":"Monthly Budget Tracker","subtitle":"Know where your money goes","date_label":"Month:","categories":[{"name":"Income","icon":"💵","lines":4},{"name":"Housing","icon":"🏠","lines":3},{"name":"Food & Groceries","icon":"🛒","lines":4},{"name":"Transportation","icon":"🚗","lines":3},{"name":"Utilities","icon":"💡","lines":3},{"name":"Entertainment","icon":"🎬","lines":3},{"name":"Health","icon":"💊","lines":3},{"name":"Savings","icon":"🏦","lines":2}],"affirmation":"Small financial wins add up to big changes over time."}`,
    },
    techie: {
      'sprint-planner': `Create a sprint planning template. Return ONLY valid JSON:\n{"title":"Sprint Planner","subtitle":"2-Week Sprint","date_label":"Sprint dates:","top_3_priorities":["Sprint goal #1","Sprint goal #2","Sprint goal #3"],"categories":[{"name":"Backlog Items","icon":"📋","lines":6},{"name":"In Progress","icon":"🔄","lines":4},{"name":"Blockers","icon":"🚧","lines":3},{"name":"Done","icon":"✅","lines":4}],"affirmation":"Ship it. Learn. Iterate. Repeat."}`,
      'code-review': `Create a code review checklist. Return ONLY valid JSON:\n{"title":"Code Review Checklist","subtitle":"Systematic review for better code","sections":[{"name":"🔍 Functionality","description":"Does it work?","items":["Logic is correct","Edge cases handled","Error handling present","No obvious bugs"]},{"name":"📖 Readability","description":"Is it clear?","items":["Meaningful variable names","Functions do one thing","Comments where needed","No dead code"]},{"name":"🔒 Security","description":"Is it safe?","items":["No hardcoded secrets","Input validated","Auth checks in place","Dependencies audited"]},{"name":"⚡ Performance","description":"Is it fast?","items":["No N+1 queries","Efficient algorithms","Caching considered","No memory leaks"]}],"reminder":"Good code review is a gift to your future self."}`,
      'standup-notes': `Create a daily standup template. Return ONLY valid JSON:\n{"title":"Daily Standup","subtitle":"Keep it short — 15 minutes max","date_label":"Date:","prompts":["What did I complete yesterday?","What am I working on today?","Any blockers or help needed?","Energy level today (1-10):"],"categories":[{"name":"Today's Tasks","icon":"📌","lines":5},{"name":"Notes & Follow-ups","icon":"📝","lines":4}],"affirmation":"Clear communication makes great teams."}`,
    },
  };

  const nicheSpecific = specific[nicheId];
  if (nicheSpecific && nicheSpecific[productTypeId]) {
    return nicheSpecific[productTypeId];
  }

  return `Create content for a "${title}" printable worksheet for the "${nicheId}" niche.
Return ONLY valid JSON with: title, subtitle, and relevant sections.
Include prompts, categories with lines for writing, and an affirmation message.
Make it practical, compassionate, and actionable. No markdown, just raw JSON.`;
}

// SEO keyword banks per niche for stronger Etsy search ranking
const NICHE_SEO_KEYWORDS: Record<string, string> = {
  adhd: 'ADHD planner, ADHD printable, executive function, neurodivergent planner, ADHD tools, focus planner, dopamine, time management ADHD',
  mdd: 'mental health journal, depression journal, mood tracker printable, self care planner, therapy worksheet, mental wellness, gratitude journal',
  anxiety: 'anxiety relief printable, CBT worksheet, mental health printable, grounding exercise, anxiety journal, calm down kit, therapy tools',
  social: 'social skills printable, conversation cards, social anxiety tools, boundary setting, communication printable, social script',
  human: 'printable planner, productivity planner, life planner, goal setting worksheet, habit tracker, organization printable, daily planner',
  techie: 'developer planner, software engineer printable, agile sprint planner, code review checklist, programmer gift, tech productivity',
};

export function getEtsyListingPrompt(nicheId: string, productTypeId: string, productName: string): string {
  const nicheKeywords = NICHE_SEO_KEYWORDS[nicheId] || 'printable, digital download, worksheet';

  return `Create a highly SEO-optimized Etsy listing for a printable digital download product.

Product: ${productName}
Niche: ${nicheId}
Type: ${productTypeId}
High-value niche keywords to incorporate: ${nicheKeywords}

SEO rules:
- Title: exactly under 140 chars, front-load the most searched keywords, include "printable" and "digital download", natural language
- Tags: EXACTLY 13 tags, each tag under 20 characters, use high-search-volume Etsy keywords, mix broad (e.g. "printable planner") and specific (e.g. "ADHD daily planner") terms
- Description: 200-350 words. Opening sentence hooks with main keyword. Explain what it is, who it is for, exactly what is included, how to use it. Mention: instant digital download, PDF format, US Letter + A4 sizes included, print at home or at a print shop. Use natural keyword placement. End with a warm call to action.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "...",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13"],
  "description": "..."
}`;
}
