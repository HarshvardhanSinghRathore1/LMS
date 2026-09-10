import axios from 'axios';

export class TranslationService {
  /**
   * Common Hinglish / Romanized Hindi keywords
   */
  private static readonly HINGLISH_PATTERNS = [
    /\b(ke\s+liye|aapko|aap|hum|karein|karna|karte|hain|hai|mein|aur|kaise|kya|kyun|hota|hote|hogi|pe|chahiye|rahe|raha|seekhein|dekhein|baaki|milega|milenge|mil\s+jayenge)\b/i,
  ];

  /**
   * Checks if text contains non-Latin scripts (Bengali, Devanagari, etc.) or Romanized Hinglish
   */
  public static containsNonEnglishOrHinglish(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    
    // Check for non-Latin Unicode characters (Devanagari, Bengali, Cyrillic, etc.)
    const nonLatinMatches = text.match(/[^\x00-\x7F\s\.,;:!?\(\)\[\]\{\}'"\-\+\*\/=<>@#\$%\^&_`~]/g);
    if (nonLatinMatches && nonLatinMatches.length > 5) {
      return true;
    }

    // Check for Hinglish keywords
    for (const pattern of this.HINGLISH_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Translates any text into clear, fluent English.
   * Handles large texts by chunking up to 1500 chars.
   */
  public static async translateToEnglish(text: string): Promise<string> {
    if (!text || text.trim().length === 0) return '';

    try {
      const chunks = text.match(/[\s\S]{1,1500}/g)?.slice(0, 6) || [text];
      const translatedParts = await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const res = await axios.get('https://translate.googleapis.com/translate_a/single', {
              params: {
                client: 'gtx',
                sl: 'auto',
                tl: 'en',
                dt: 't',
                q: chunk,
              },
              timeout: 6000,
            });

            if (Array.isArray(res.data) && Array.isArray(res.data[0])) {
              return res.data[0].map((item: any) => item[0]).join('');
            }
            return chunk;
          } catch {
            return chunk;
          }
        })
      );

      return translatedParts.join('').trim() || text;
    } catch (err: any) {
      console.warn('[TranslationService] Translation fallback warning:', err.message);
      return text;
    }
  }

  /**
   * Clean text by removing raw social links and conversational filler
   */
  public static cleanEducationalText(text: string): string[] {
    if (!text) return [];
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => {
        if (!l || l.length < 5) return false;
        if (l.startsWith('---')) return false;
        if (/^(https?:\/\/|join\s+me|whatsapp|discord|instagram|telegram|twitter|coupon\s+code)/i.test(l)) return false;
        return true;
      });
  }
}

