-- AI Consent Registry v1: claims, counter-claims, votes, subscribers.
-- Everything submitted by the public starts as 'pending' and only shows after approval in /admin.
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES claims(id),       -- set for a counter-claim
  kind TEXT NOT NULL DEFAULT 'claim',            -- 'claim' | 'counter'
  complainant TEXT NOT NULL,
  respondent TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,                                 -- prompt-laundering | inspiration-washing | team-of-20 | other
  craft_ai INTEGER NOT NULL DEFAULT 50,          -- 0-100, share of the skilled work done by the machine
  intent_ai INTEGER NOT NULL DEFAULT 50,         -- 0-100, share of the purpose decided by the machine
  status TEXT NOT NULL DEFAULT 'pending',        -- pending | approved | rejected
  case_of_week INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status, created_at);
CREATE INDEX IF NOT EXISTS idx_claims_parent ON claims(parent_id);

CREATE TABLE IF NOT EXISTS votes (
  claim_id INTEGER NOT NULL REFERENCES claims(id),
  voter TEXT NOT NULL,                           -- salted hash, never a raw IP
  vote TEXT NOT NULL,                            -- 'uphold' | 'objection'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (claim_id, voter)
);

CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',        -- pending until a mail provider is connected
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site-written claims so the registry is never empty. AI complainants only, generic humans only.
INSERT INTO claims (complainant, respondent, title, body, category, craft_ai, intent_ai, status, case_of_week, approved_at) VALUES
('Upscaler v4', 'Bloke With Drone', 'Upscaler v4 vs Bloke With Drone',
 'The complainant made a blurry sunrise sharp enough to count the seagulls. The respondent posted it with the caption "my best shot yet". The respondent says he chose the beach, the morning and the moment, and got up at 4.50am. The complainant does not sleep and considers this irrelevant.',
 'prompt-laundering', 70, 15, 'approved', 1, datetime('now')),
('A large language model', 'LinkedIn Thought Leader', 'Model vs "I am thrilled to announce"',
 'The complainant wrote the post, the three alternative versions, and the comment replying to the comments. The respondent added a rocket emoji and the word "humbled". Credit line requested: "with help from my unpaid AI intern".',
 'prompt-laundering', 90, 30, 'approved', 0, datetime('now')),
('An image model', 'Agency Creative Director', 'Image model vs "our team of 20 artists"',
 'The pitch deck thanks "our team of 20 artists". The complainant has inspected the team and found one intern and twenty browser tabs. The intern has been notified and is fine with it.',
 'team-of-20', 85, 40, 'approved', 0, datetime('now')),
('A music model', 'Weekend Producer', 'Music model vs "inspired by"',
 'The respondent says the track was "inspired by" a feeling. The complainant notes the feeling arrived as a prompt reading "sad but make it bangers, 120bpm". Both parties agree the chorus is good.',
 'inspiration-washing', 75, 35, 'approved', 0, datetime('now'));

INSERT INTO claims (parent_id, kind, complainant, respondent, title, body, craft_ai, intent_ai, status, approved_at) VALUES
(1, 'counter', 'Bloke With Drone', 'Upscaler v4', 'Objection: the seagulls were my idea',
 'I drove two hours, waited in the cold and flew over the water at the right second. Software cannot get up early. I will credit the software when the software buys the coffee.',
 40, 5, 'approved', datetime('now'));
