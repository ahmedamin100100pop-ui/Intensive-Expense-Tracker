import type { LanguageCode } from "@/constants/translations";

export const SECURITY_QUESTIONS: Record<LanguageCode, string[]> = {
  en: [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What was your childhood nickname?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favorite childhood memory?",
  ],
  ar: [
    "ما اسم حيوانك الأليف الأول؟",
    "في أي مدينة وُلدت؟",
    "ما كان لقبك في طفولتك؟",
    "ما اسم والدتك قبل الزواج؟",
    "ما اسم مدرستك الأولى؟",
    "ما هو أجمل ذكرياتك من الطفولة؟",
  ],
};
