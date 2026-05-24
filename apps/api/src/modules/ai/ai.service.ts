import { Injectable } from '@nestjs/common';

/**
 * AI Content Generation Service
 * 
 * Currently uses template-based generation.
 * Can be swapped to OpenAI / Gemini / any LLM API by replacing the generate methods.
 * 
 * To integrate with OpenAI:
 *   1. npm install openai
 *   2. Add OPENAI_API_KEY to .env
 *   3. Replace the generate methods with actual API calls
 */

interface GenerateProductContentDto {
  name?: string;
  category?: string;
  keywords?: string;
  language?: string; // 'en' | 'hi' | 'bn' | 'ta' etc.
  tone?: string; // 'professional' | 'casual' | 'luxury'
}

@Injectable()
export class AiService {
  /**
   * Generate a product title suggestion
   */
  async generateTitle(dto: GenerateProductContentDto): Promise<{ titles: string[] }> {
    const { name, category, keywords, language = 'en' } = dto;

    // Template-based generation (replace with LLM API call)
    const baseWords = [name, category, keywords].filter(Boolean).join(' ');

    const templates = this.getTitleTemplates(language);
    const titles = templates.map((tmpl) =>
      tmpl.replace('{product}', name || 'Product')
        .replace('{category}', category || 'Item')
        .replace('{keywords}', keywords || '')
        .trim()
        .replace(/\s+/g, ' ')
    );

    return { titles: titles.slice(0, 5) };
  }

  /**
   * Generate a product description
   */
  async generateDescription(dto: GenerateProductContentDto): Promise<{ descriptions: string[] }> {
    const { name, category, keywords, language = 'en', tone = 'professional' } = dto;

    const templates = this.getDescriptionTemplates(language, tone);
    const descriptions = templates.map((tmpl) =>
      tmpl.replace('{product}', name || 'Product')
        .replace('{category}', category || 'Item')
        .replace('{keywords}', keywords || 'premium quality')
        .trim()
    );

    return { descriptions: descriptions.slice(0, 3) };
  }

  /**
   * Generate SEO-optimized meta content
   */
  async generateSeoContent(dto: GenerateProductContentDto): Promise<{
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
  }> {
    const { name, category, keywords } = dto;

    const product = name || 'Product';
    const cat = category || 'Shop';
    const kw = keywords || '';

    return {
      seoTitle: `Buy ${product} Online | Best ${cat} - HSERAN`,
      seoDescription: `Shop ${product} at the best price. ${kw ? `Features: ${kw}. ` : ''}Free delivery available. ${cat} collection on HSERAN.`,
      seoKeywords: [
        product.toLowerCase(),
        cat.toLowerCase(),
        `buy ${product.toLowerCase()} online`,
        `${product.toLowerCase()} price`,
        `best ${cat.toLowerCase()}`,
        ...(kw ? kw.split(',').map((k: string) => k.trim().toLowerCase()) : []),
      ].filter(Boolean),
    };
  }

  // ── Template Helpers ────────────────────────────

  private getTitleTemplates(language: string): string[] {
    if (language === 'hi') {
      return [
        '{product} - सर्वश्रेष्ठ {category}',
        'प्रीमियम {product} | {category} कलेक्शन',
        '{product} - उच्च गुणवत्ता {keywords}',
        'खरीदें {product} | बेस्ट {category}',
        '{product} ऑनलाइन - {category}',
      ];
    }

    if (language === 'bn') {
      return [
        '{product} - সেরা {category}',
        'প্রিমিয়াম {product} | {category} কালেকশন',
        '{product} - উচ্চ মানের {keywords}',
        'কিনুন {product} | সেরা {category}',
        '{product} অনলাইন - {category}',
      ];
    }

    // English (default)
    return [
      'Premium {product} - Best {category}',
      '{product} | High Quality {category} Collection',
      '{product} - {keywords} | Shop Now',
      'Buy {product} Online - Top {category}',
      '{product} - Premium {category} at Best Price',
    ];
  }

  private getDescriptionTemplates(language: string, tone: string): string[] {
    if (language === 'hi') {
      return [
        'यह {product} हमारे {category} कलेक्शन का हिस्सा है। {keywords} के साथ बनाया गया, यह उत्पाद उच्चतम गुणवत्ता की गारंटी देता है। अभी ऑर्डर करें और मुफ्त डिलीवरी का लाभ उठाएं।',
        '{product} खरीदें - {category} में सर्वोत्तम चयन। विशेषताएं: {keywords}। तेज़ शिपिंग और आसान रिटर्न उपलब्ध है।',
        'हमारे प्रीमियम {product} को खोजें। {keywords} गुणवत्ता के साथ, यह {category} उत्पाद आपकी अपेक्षाओं से अधिक होगा।',
      ];
    }

    if (tone === 'luxury') {
      return [
        'Discover the exquisite {product}, a masterpiece from our {category} collection. Crafted with {keywords}, this piece embodies elegance and sophistication. Indulge in luxury with every detail meticulously designed for the discerning connoisseur.',
        'Elevate your style with our premium {product}. Part of the exclusive {category} line, featuring {keywords}. An investment in quality that speaks volumes about your refined taste.',
        'The {product} represents the pinnacle of {category} craftsmanship. With {keywords}, every element has been perfected to deliver an unparalleled experience of luxury and distinction.',
      ];
    }

    if (tone === 'casual') {
      return [
        'Check out this awesome {product}! It\'s one of the best in our {category} range. With {keywords}, you\'re getting great quality at an amazing price. Grab yours now!',
        'Looking for a great {product}? You\'ve found it! From our {category} collection, this one\'s got {keywords} and is perfect for everyday use. Order today!',
        'Meet your new favorite {product}! Part of our {category} lineup, packed with {keywords}. Super quality, super price. What\'s not to love?',
      ];
    }

    // Professional (default)
    return [
      'Introducing the {product}, a standout addition to our {category} collection. Engineered with {keywords}, this product delivers exceptional quality and performance. Designed to meet the highest standards, it offers outstanding value for discerning customers.',
      'The {product} combines functionality and style in our premium {category} range. Features include {keywords}. Backed by quality assurance and fast delivery across India.',
      'Experience the quality of our {product}. As part of our {category} lineup, it features {keywords}. Built to last, designed to impress. Free shipping available on all orders.',
    ];
  }
}
