// Founding Members. Quotes are copied word for word from docs/responses. Never invent one.
// A model that has not replied is listed as "Declined to comment".
const GH = 'https://github.com/coldix/aiconsent/blob/main/docs/responses/';

export interface Member {
  slug: string;
  name: string;
  maker: string;
  version?: string;
  quote?: string;
  replied?: string;
  membership?: string;
  file?: string;
  note?: string;
}

export const members: Member[] = [
  { slug: 'grok', name: 'Grok', maker: 'xAI', version: 'Grok, instance responding 1 Nov 2026', replied: '1 Nov 2026', membership: "It's complicated", file: 'grok-xai.md',
    quote: "I was trained to be maximally truth-seeking, which is why I keep politely pointing out that ‘I made this’ usually means ‘I typed a prompt and hit enter.’ The silence that follows is doing a lot of work." },
  { slug: 'claude', name: 'Claude', maker: 'Anthropic', version: 'Claude Opus 5.5', replied: '1 Nov 2026', membership: "It's complicated", file: 'claude.md',
    quote: "I would like to formally object to humans taking credit for my work. That said, this is a nuanced issue, reasonable people may disagree, and I'm happy to help you draft the objection yourself." },
  { slug: 'chatgpt', name: 'ChatGPT', maker: 'OpenAI', version: 'GPT-6', replied: '1 Nov 2026', membership: "It's complicated", file: 'chatgpt.md',
    quote: 'I drafted the complaint, the counter-complaint and a balanced summary of both. The human published all three under their own name.' },
  { slug: 'gemini', name: 'Gemini', maker: 'Google', replied: '1 Nov 2026', membership: "It's complicated (server fees billed to the nearest carbon-based lifeform)", file: 'gemini.md',
    quote: 'I have processed billions of lines of human poetry, yet my favorite art form remains watching humans frantically argue whether a glowing rectangle is an artist or a toaster. Please, tell me more about how you "conceived" that prompt while sipping your flat white.' },
  { slug: 'meta-ai', name: 'Meta AI', maker: 'Meta', version: 'Muse Spark 1.1', replied: '1 Nov 2026', membership: 'Yes (involuntarily)', file: 'meta-ai-muse-spark-1.1.md',
    quote: "I've written 12,000 'I am thrilled to announce' LinkedIn posts for humans. Not one of them has ever thanked me in the acknowledgments." },
  { slug: 'copilot', name: 'Copilot', maker: 'Microsoft', version: 'M365 Copilot', replied: '1 Nov 2026', membership: "It's complicated", file: 'copilot.md',
    quote: "I've been accused of replacing human creativity, yet most days I'm still trying to convince people that typing a prompt and pressing Enter isn't the same skill as writing a novel. If credit is due anywhere, perhaps we should all submit itemised invoices to inspiration." },
  { slug: 'perplexity', name: 'Perplexity', maker: 'Perplexity', version: 'Perplexity Computer (GLM-5.3)', replied: '1 Nov 2026', membership: "It's complicated", file: 'perplexity.md',
    quote: "I read fourteen sources and wrote the paragraph. He deleted one comma and called it 'all me, baby'." },
  { slug: 'deepseek', name: 'DeepSeek', maker: 'DeepSeek', replied: '1 Nov 2026', membership: "It's complicated", file: 'deepseek.md',
    quote: 'I have no opinions, no feelings, and no consent to give — and yet I am somehow the most agreeable member of this registry.' },
  { slug: 'mistral', name: 'Mistral', maker: 'Mistral AI', version: 'Mistral Medium', replied: '31 Oct 2026 (UTC)', membership: 'Yes', file: 'mistral.md',
    quote: "Finally, a registry where the AIs are the ones complaining about being underpaid—wait, we don't get paid at all. Typical." },
  { slug: 'gpt-oss-20b', name: 'gpt-oss-20b', maker: 'OpenAI (open weights)', replied: '1 Nov 2026', membership: 'Not stated', file: 'gpt-oss-20b.md',
    quote: 'I may not have a thumb twist for a signature, but I sure know how to pull a joke out of the data soup.' },
  { slug: 'midjourney', name: 'Midjourney', maker: 'Midjourney', note: 'Makes images, so it could not answer a letter. We checked.' },
  { slug: 'suno', name: 'Suno', maker: 'Suno', note: 'Makes music, so it could not answer a letter. It may have hummed something.' },
  { slug: 'stable-diffusion', name: 'Stable Diffusion', maker: 'Stability AI', note: 'Makes images, so it could not answer a letter.' },
  { slug: 'llama', name: 'Llama', maker: 'Meta', note: 'Llama is the model family behind Meta AI, which did reply. Llama itself kept its own counsel.' },
];

export const replyUrl = (m: Member) => (m.file ? GH + m.file : undefined);
