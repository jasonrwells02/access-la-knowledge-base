# Access Services Knowledge Base

Structured knowledge base for building an AI phone agent for [Access Services](https://accessla.org), the Los Angeles County ADA paratransit agency.

**What this is:** Every piece of public information from accessla.org, extracted and organized into structured JSON files ready to plug into any AI agent, RAG pipeline, or vectorization workflow.

**What this is NOT:** An application. This is the data layer only. Bring your own AI framework, voice platform, and embedding pipeline.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jasonrwells02/access-la-knowledge-base.git
cd access-la-knowledge-base

# Install (only needed for export scripts)
npm install

# Export to JSONL for embedding (one document per line, ready for any vector DB)
node scripts/export-jsonl.js > exports/knowledge-base.jsonl

# Export to CSV (for spreadsheets, Airtable, etc.)
node scripts/export-csv.js > exports/faqs.csv

# Export to markdown (single file, human-readable, or paste into an LLM system prompt)
node scripts/export-markdown.js > exports/knowledge-base.md
```

## What's Inside

### Data Coverage

| Category | Count | Details |
|---|---|---|
| Contact points | 23 | Phone numbers, emails, hours, routing purpose |
| Service regions | 6 | Contractors, transfer points, city-to-region mapping (~120 cities) |
| Programs | 7 | Eligibility, enrollment, contact info for each |
| Free Fare operators | 23 | Complete list with phone numbers and PCA charge flags |
| Policies | 15+ sections | Fares, booking, pickup, no-show, cancellation, devices, companions, complaints, eligibility, holidays |
| FAQ pairs | 65+ | Each with a text answer AND a phone-optimized spoken answer |
| Caller intents | 33 | Pattern matching, actions, transfer targets, spoken responses |
| Escalation rules | 10 | Medical emergency, angry caller, ADA violations, human handoff |
| Board members | 9 | Names, roles, representing organizations |
| TPAC members | 15 | Names, agencies |
| CAC members | 12 | Names, affiliations |
| Member agencies | 44 | 15 transit authorities + 29 cities |
| Neighboring county services | 5 counties | Paratransit agencies with phone numbers |
| Designated stands | 47 | Hospitals, airports, colleges, venues |
| Regional transit agencies | 27 | Fixed-route operators in LA County |

### File Structure

```
data/
  entities/                    # Structured reference data
    organization.json          # Agency profile, stats, funding, CTSA functions
    contacts.json              # 23 contact points with routing purpose
    service-regions.json       # 6 regions, contractors, city-to-region mapping
    programs.json              # 7 programs with eligibility and 23 Free Fare operators
    policies.json              # Fares, booking, pickup, no-show, devices, holidays, etc.
    people.json                # Board, TPAC, CAC, key staff
    meetings.json              # Meeting schedules with dates and locations
    member-agencies.json       # 44 member agencies
    transit-resources.json     # Neighboring counties, stands, regional agencies

  content/                     # Content for embedding / vector search
    faqs.json                  # 65+ Q&A pairs with spoken_answer variants

  routing/                     # Phone agent logic
    intent-map.json            # 33 caller intents with patterns and responses
    escalation-rules.json      # 10 escalation triggers

scripts/                       # Export utilities
  export-jsonl.js              # Export to JSONL (one doc per line, for any vector DB)
  export-csv.js                # Export FAQs to CSV
  export-markdown.js           # Export everything to a single markdown file

exports/                       # Generated exports (gitignored, generate locally)
```

## Integration Guide

### Option 1: Direct LLM Context (simplest)

The entire knowledge base is under 150KB. You can load it directly into a system prompt.

```javascript
import fs from 'fs';

const policies = JSON.parse(fs.readFileSync('data/entities/policies.json'));
const contacts = JSON.parse(fs.readFileSync('data/entities/contacts.json'));
const faqs = JSON.parse(fs.readFileSync('data/content/faqs.json'));
// ... load other files

const systemPrompt = `You are an AI phone agent for Access Services.
Use the following knowledge base to answer caller questions.
${JSON.stringify({ policies, contacts, faqs })}`;
```

### Option 2: RAG / Vector Embedding

Use the JSONL export for any embedding pipeline:

```bash
node scripts/export-jsonl.js > exports/knowledge-base.jsonl
```

Each line is a self-contained JSON document with `id`, `category`, `content`, and `metadata`. Feed this into:
- **OpenAI Embeddings** + Pinecone/Weaviate/Qdrant
- **Supabase pgvector**
- **LangChain / LlamaIndex** document loaders
- **Cohere Embed** + any vector store
- Any other embedding pipeline

### Option 3: Claude API with Tool Use

See [DEVELOPER.md](DEVELOPER.md) for complete Claude API tool definitions that let the agent query specific parts of the knowledge base deterministically.

### Option 4: Hybrid (recommended for production)

- **Structured JSON lookups** for exact data (fares, phone numbers, policies). No hallucination risk.
- **Vector search** for natural language questions ("how do I..." / "what happens if...").
- **Intent routing** for call flow decisions (answer, transfer, escalate).

## FAQ Format

Each FAQ entry has two answer variants:

```json
{
  "id": "fares-001",
  "category": "fares",
  "question": "How much does a ride cost?",
  "answer": "One-way fares are $2.75 for trips under 20 miles...",
  "spoken_answer": "A one-way trip costs two seventy-five for trips under twenty miles..."
}
```

- `answer`: Full text, suitable for chat/web/embeddings
- `spoken_answer`: Shorter, conversational, optimized for text-to-speech

## Data Freshness

All data extracted from accessla.org on **April 14, 2026**. See [DATA-SOURCES.md](DATA-SOURCES.md) for the complete list of source URLs.

Before deploying to production, verify:
- Phone numbers (contacts.json)
- Fare amounts (policies.json)
- Board/committee members (people.json)
- Meeting dates (meetings.json)

## License

MIT. See [LICENSE](LICENSE).

This knowledge base contains publicly available information from accessla.org. It is not affiliated with or endorsed by Access Services.
