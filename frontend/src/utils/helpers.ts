export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("hi-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Network") || error.message.includes("network")) {
      return "नेटवर्क कमज़ोर है। कृपया दोबारा कोशिश करें।";
    }
    if (error.message.includes("401")) {
      return "सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें।";
    }
    if (error.message.includes("500")) {
      return "सर्वर में समस्या है। कृपया बाद में कोशिश करें।";
    }
  }
  return "कुछ गलत हो गया। कृपया दोबारा कोशिश करें।";
}

export const INDIAN_STATES = [
  "आंध्र प्रदेश", "असम", "बिहार", "छत्तीसगढ़", "गुजरात", "हरियाणा",
  "हिमाचल प्रदेश", "झारखंड", "कर्नाटक", "केरल", "मध्य प्रदेश",
  "महाराष्ट्र", "ओडिशा", "पंजाब", "राजस्थान", "तमिल नाडु",
  "तेलंगाना", "उत्तर प्रदेश", "उत्तराखंड", "पश्चिम बंगाल",
];

export const CROPS = [
  "गेहूं", "चावल", "मक्का", "बाजरा", "सोयाबीन", "कपास",
  "गन्ना", "आलू", "प्याज", "टमाटर", "सरसों", "मूंगफली",
];

export const LANGUAGES = [
  { code: "hi", name: "हिंदी" },
  { code: "en", name: "English" },
  { code: "mr", name: "मराठी" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "te", name: "తెలుగు" },
];
