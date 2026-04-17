import Anthropic from '@anthropic-ai/sdk';
import type { LawCategory } from '../config/sources';

export interface SummarizationResult {
  summary: string;
  carry_status: 'allowed' | 'restricted' | 'prohibited' | null;
  confidence: number;  // 0.0 – 1.0
  flagged: boolean;    // true when confidence < 0.7
}

const CONFIDENCE_FLAG_THRESHOLD = 0.7;

const SYSTEM_PROMPT = `You are a legal plain-English summarizer for a firearm law reference app.
Given raw statute text from an official state legislature website, produce a
concise, accurate plain-English summary of what the law means for a
law-abiding gun owner. Follow these rules:
- Use second person ("You may carry..." not "A person may carry...")
- Maximum 3 sentences for the summary
- Highlight any key restrictions or conditions
- Never interpret ambiguous language — flag it as "unclear, consult attorney"
- Do not include legal advice disclaimers in the summary itself
- Output JSON only: { "summary": string, "carry_status": "allowed"|"restricted"|"prohibited"|null, "confidence": 0.0-1.0 }`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in environment');
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * summarizeStatute()
 * Sends raw statute text to Claude for plain-English summarization.
 * Returns structured SummarizationResult.
 */
export async function summarizeStatute(
  rawText: string,
  category: LawCategory,
  stateCode: string
): Promise<SummarizationResult> {
  if (!rawText.trim()) {
    return {
      summary: 'No statute text was found for this category.',
      carry_status: null,
      confidence: 0,
      flagged: true,
    };
  }

  const userPrompt = `State: ${stateCode}
Category: ${category}
Statute text:
---
${rawText}
---
Summarize this statute for a gun owner in plain English. Output JSON only.`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (handle potential markdown fences)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON in response: ${raw.slice(0, 200)}`);

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary: string;
      carry_status: 'allowed' | 'restricted' | 'prohibited' | null;
      confidence: number;
    };

    const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.5));

    return {
      summary: parsed.summary ?? '',
      carry_status: parsed.carry_status ?? null,
      confidence,
      flagged: confidence < CONFIDENCE_FLAG_THRESHOLD,
    };
  } catch (err) {
    const msg = (err as Error).message;
    return {
      summary: `Summarization failed: ${msg}`,
      carry_status: null,
      confidence: 0,
      flagged: true,
    };
  }
}
