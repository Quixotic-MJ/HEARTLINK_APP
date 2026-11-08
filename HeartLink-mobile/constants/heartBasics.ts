/**
 * HL-100: short heart-health topics. General education only: no diagnosis or treatment advice. The emergency numbers
 * must stay the same as the app's emergency rule (log-symptoms.tsx, companionService.ts).
 * After an expert approves the text, set REVIEWED_BY (for example "Reviewed by our Cardiologist") and the draft line goes.
 */
export const REVIEWED_BY: string | null = null;

export type HeartTopic = {
  id: string;
  title: string;
  paragraphs: string[];
  sources: { label: string; url: string }[];
};

export const HEART_TOPICS: HeartTopic[] = [
  {
    id: "blood-pressure",
    title: "Blood pressure basics",
    paragraphs: [
      "The top number is the pressure when your heart beats. The bottom number is the pressure between beats.",
      "For adults, under 120/80 is normal. A top number of 120 to 129 with a bottom number under 80 is elevated. Higher numbers fall into stage 1 (130 to 139 or 80 to 89) and stage 2 (140 or more, or 90 or more).",
      "One reading doesn't tell the whole story. Sit quietly for 5 minutes first, with your back supported, feet flat and arm at heart level.",
      "Only a health professional can diagnose high blood pressure. Don't change your medicine because of a reading: ask your doctor.",
    ],
    sources: [
      { label: "American Heart Association: blood pressure readings", url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings" },
    ],
  },
  {
    id: "sodium",
    title: "Sodium",
    paragraphs: [
      "Too much sodium can raise blood pressure. Most of it comes from salt, sauces like toyo and patis, and packaged or processed food.",
      "The World Health Organization advises under 2,000 mg a day, about 1 teaspoon of salt. The American Heart Association's ideal limit for most adults is 1,500 mg.",
      "It's about your whole day. No single food is forbidden: a smaller serving or lighter meals later can balance a salty dish.",
      "Taste your food before adding sauce, and check the serving size on the package.",
    ],
    sources: [
      { label: "World Health Organization: salt reduction", url: "https://www.who.int/news-room/fact-sheets/detail/salt-reduction" },
      { label: "American Heart Association: sodium", url: "https://heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day" },
    ],
  },
  {
    id: "activity",
    title: "Staying active",
    paragraphs: [
      "The World Health Organization advises adults to get 150 to 300 minutes of moderate activity a week, plus muscle-strengthening on 2 or more days.",
      "Adults 65 and over are also advised to do balance and strength activities on 3 or more days a week.",
      "Moderate means you can talk but can't sing. Some activity is better than none, so start small and build up.",
      "Stop if you feel chest pain, dizziness or unusual shortness of breath.",
    ],
    sources: [
      { label: "World Health Organization: physical activity", url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity" },
    ],
  },
  {
    id: "sleep",
    title: "Sleep",
    paragraphs: [
      "Sleep is part of heart health. The American Heart Association's ideal for adults is 7 to 9 hours a night.",
      "Going to bed and waking up at regular times can help. If you often feel tired after a full night's sleep, or someone says you snore loudly or stop breathing, talk to a health professional.",
    ],
    sources: [
      { label: "American Heart Association: Life's Essential 8", url: "https://www.heart.org/en/healthy-living/healthy-lifestyle/lifes-essential-8" },
    ],
  },
  {
    id: "get-help",
    title: "When to get help",
    paragraphs: [
      "Call 911 for chest pain or pressure, trouble breathing, fainting, a drooping face, sudden weakness on one side, or trouble speaking. Don't wait to see if it passes.",
      "If your reading is 180/120 or higher, or below 90/60, follow the emergency steps in HeartLink. Call 911 if you also feel unwell.",
      "See a health professional if your readings stay high, or if something feels wrong even when your numbers look fine.",
    ],
    sources: [
      { label: "American Heart Association: heart attack warning signs", url: "https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack" },
      { label: "American Stroke Association: stroke symptoms", url: "https://www.stroke.org/en/about-stroke/stroke-symptoms" },
    ],
  },
];
