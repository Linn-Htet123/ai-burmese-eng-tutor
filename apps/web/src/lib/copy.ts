import type { MayState, StageKind } from "@may/shared";

/** Every screen string in both languages (UI toggle, change note decision 5). Burmese is the default. */
export type Lang = "my" | "en";

export const COPY = {
  my: {
    greeting: (name: string) => `မင်္ဂလာပါ ${name}`,
    mayToday: "ဒီနေ့ ဘောလုံးအကြောင်း ပြောကြမယ်နော်။ မနေ့က စကားစုလေး တစ်ခုကိုလည်း ပြန်ကြည့်မယ်။",
    howLong: "ဒီနေ့ ဘယ်လောက်ကြာကြာ ပြောမလဲ",
    minutes: (n: number) => `${toMyDigits(n)} မိနစ်`,
    start: (n: number) => `May ကို ခေါ်မယ် · ${toMyDigits(n)} မိနစ်`,
    precallTitle: "May အဆင်သင့်ဖြစ်နေပြီ",
    precallBody: "မိုက်ခရိုဖုန်း ခွင့်ပြုချက် တောင်းပါမယ်။ May က သင့်အသံကို နားထောင်ဖို့ပဲ သုံးပါတယ်။",
    call: "ခေါ်မယ်",
    connecting: "ချိတ်ဆက်နေတယ်…",
    state: { listening: "နားထောင်နေတယ်… ပြောပါ", thinking: "စဉ်းစားနေတယ်…", speaking: "May ပြောနေတယ်" } satisfies Record<MayState, string>,
    paused: "ခဏရပ်ထားတယ်။ ၁၀ မိနစ်အတွင်း ပြန်လာပါ။",
    pause: "ခဏရပ်",
    resume: "ဆက်မယ်",
    burmese: "မြန်မာလို",
    end: "ပြီးမယ်",
    upgradeTitle: "ဒီလိုပြောရင် ပိုကောင်းတယ်",
    youSaid: "သင်ပြောခဲ့တာ",
    remaining: (min: number) => `${toMyDigits(min)} မိနစ်ကျန်`,
    endedTitle: "ဒီနေ့အတွက် ကျေးဇူးပါ",
    endedBody: "ပြောခဲ့သမျှ အားလုံး မှတ်ထားပြီးပါပြီ။ မနက်ဖြန် ပြန်တွေ့မယ်နော်။",
    again: "ပြန်စမယ်",
    home: "ပင်မစာမျက်နှာ",
    trouble: "ချိတ်ဆက်မှု အဆင်မပြေဖြစ်သွားတယ်။ ခဏနေ ပြန်ကြိုးစားကြည့်ပါ။",
    stage: { greeting: "နှုတ်ဆက်", review: "ပြန်ကြည့်", phrase: "စကားစု", talk: "စကားပြော", recap: "အနှစ်ချုပ်" } satisfies Record<StageKind, string>,
    langToggle: "English",
  },
  en: {
    greeting: (name: string) => `Hi ${name}`,
    mayToday: "Let's talk football today. We'll also bring back one phrase from yesterday.",
    howLong: "How long today?",
    minutes: (n: number) => `${n} min`,
    start: (n: number) => `Call May · ${n} min`,
    precallTitle: "May is ready",
    precallBody: "We'll ask for your microphone. May only uses it to listen to you.",
    call: "Call",
    connecting: "Connecting…",
    state: { listening: "Listening… go ahead", thinking: "Thinking…", speaking: "May is speaking" } satisfies Record<MayState, string>,
    paused: "Paused. Come back within 10 minutes.",
    pause: "Pause",
    resume: "Resume",
    burmese: "Burmese",
    end: "End",
    upgradeTitle: "A smoother way to say it",
    youSaid: "You said",
    remaining: (min: number) => `${min} min left`,
    endedTitle: "Thanks for today",
    endedBody: "Everything you said is saved. See you tomorrow.",
    again: "Start again",
    home: "Home",
    trouble: "The connection dropped. Try again in a moment.",
    stage: { greeting: "Hello", review: "Review", phrase: "Phrases", talk: "Talk", recap: "Recap" } satisfies Record<StageKind, string>,
    langToggle: "မြန်မာ",
  },
} as const;

export type Copy = (typeof COPY)[Lang];

const MY_DIGITS = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];
export function toMyDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => MY_DIGITS[Number(d)] ?? d);
}
