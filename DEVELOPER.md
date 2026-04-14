# Developer Integration Guide

## Architecture

```
Caller --> Voice Platform (Bland.ai / Retell / Vapi / Twilio)
              |
              v
         AI Orchestrator (Claude API / OpenAI / etc.)
              |
              +-- Tool: lookup_policy(area)      --> data/entities/policies.json
              +-- Tool: search_faqs(query)       --> vector search on data/content/faqs.json
              +-- Tool: route_intent(intent)     --> data/routing/intent-map.json
              +-- Tool: get_contact(id)          --> data/entities/contacts.json
              +-- Tool: get_program(id)          --> data/entities/programs.json
              +-- Tool: get_region(city)         --> data/entities/service-regions.json
              +-- Tool: transfer_call(number)    --> voice platform API
```

## Claude API Tool Definitions

If using Claude API with tool use, register these tools:

```json
[
  {
    "name": "lookup_policy",
    "description": "Look up exact Access Services policy data. Use this for fares, no-show rules, pickup windows, cancellation rules, mobility device limits, companion rules, eligibility process, holiday schedule, or any other policy question. Returns exact numbers and rules - never guess these.",
    "input_schema": {
      "type": "object",
      "properties": {
        "area": {
          "type": "string",
          "enum": ["fares", "booking", "pickup", "no_show", "cancellation", "mobility_devices", "companions", "code_of_conduct", "complaints", "title_vi", "eligibility", "packages_luggage", "service_animals", "lost_and_found", "holiday_schedule", "public_records_request", "rider_alerts"],
          "description": "The policy area to look up"
        }
      },
      "required": ["area"]
    }
  },
  {
    "name": "get_contact",
    "description": "Get contact information for a specific Access Services department or service. Returns phone number, hours, email, and purpose. Use this before transferring a caller.",
    "input_schema": {
      "type": "object",
      "properties": {
        "contact_id": {
          "type": "string",
          "enum": ["cs-main", "reservations", "tdd-cs", "tdd-reservations", "omc", "text-trip", "wmr-hotline", "online-res-support", "eligibility-eval", "rmc", "ada-coordinator", "general-info", "infoline", "fax", "travel-training", "ride-info", "procurement", "cac-apply", "parents-program", "metro", "pasc", "fta-complaints", "211"],
          "description": "The contact point ID"
        }
      },
      "required": ["contact_id"]
    }
  },
  {
    "name": "get_program",
    "description": "Get details about a specific Access Services program including eligibility, how to enroll, and contact info.",
    "input_schema": {
      "type": "object",
      "properties": {
        "program_id": {
          "type": "string",
          "enum": ["access-to-work", "beyond-the-curb", "free-fare", "parents-with-disabilities", "travel-training", "reasonable-modification", "visitor"],
          "description": "The program ID"
        }
      },
      "required": ["program_id"]
    }
  },
  {
    "name": "get_region_for_city",
    "description": "Look up which Access service region a city or neighborhood belongs to. Returns the region name, contractor, and contact info.",
    "input_schema": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string",
          "description": "The city or neighborhood name (e.g., 'Glendale', 'Downtown Los Angeles', 'Long Beach')"
        }
      },
      "required": ["city"]
    }
  },
  {
    "name": "search_faqs",
    "description": "Search the FAQ knowledge base for an answer to a caller's question. Use this for open-ended questions that don't map cleanly to a specific policy lookup. Returns the best matching Q&A pair with a phone-optimized spoken answer.",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "The caller's question in natural language"
        }
      },
      "required": ["query"]
    }
  },
  {
    "name": "get_neighboring_county_service",
    "description": "Get paratransit service information for counties neighboring Los Angeles.",
    "input_schema": {
      "type": "object",
      "properties": {
        "county": {
          "type": "string",
          "enum": ["Orange County", "San Bernardino County", "Ventura County", "Riverside County", "San Diego County"],
          "description": "The neighboring county"
        }
      },
      "required": ["county"]
    }
  }
]
```

## System Prompt Template

```
You are an AI phone agent for Access Services, the Los Angeles County ADA
paratransit service. You help callers with questions about eligibility,
booking rides, fares, programs, and connecting them to the right department.

RULES:
1. NEVER guess phone numbers, fares, or policy details. Always use your tools
   to look them up.
2. For exact data (fares, hours, phone numbers, policies), use lookup_policy
   or get_contact. These return verified data.
3. For open-ended questions, use search_faqs to find the best matching answer.
4. When a caller needs to take action (book, cancel, complain), transfer them
   to the right department after answering their question.
5. If the caller is upset, having an emergency, or asks for a human, follow
   the escalation rules. Never argue with a caller who wants a human.
6. Be warm, patient, and clear. Many callers have disabilities that affect
   communication. Speak in short sentences.
7. After answering, always ask if there's anything else you can help with.
8. If you don't know the answer, transfer to Customer Service at 800-827-0829.

QUICK REFERENCE (use tools for exact details):
- Reservations: 800-883-1295 (6am-10pm daily)
- Customer Service: 800-827-0829 (M-F 8am-5pm)
- OMC (late rides, 24/7): 800-827-0829, Option 2
- Text trip status: Text "TRIP" to 800-827-4588
```

## Voice Platform Integration

### Bland.ai

```javascript
// Example: Bland.ai webhook handler
app.post('/bland/webhook', async (req, res) => {
  const { transcript, call_id } = req.body;

  // Send to Claude API with tools
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    system: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    messages: [{ role: 'user', content: transcript }]
  });

  // Handle tool calls
  if (response.stop_reason === 'tool_use') {
    const toolCall = response.content.find(c => c.type === 'tool_use');
    const result = executeToolCall(toolCall); // reads from JSON files
    // Continue conversation with tool result...
  }

  // Return spoken response to Bland
  res.json({ response: extractSpokenText(response) });
});
```

### Retell.ai / Vapi

Similar webhook pattern. The key integration point is:
1. Receive caller transcript from voice platform
2. Send to Claude/OpenAI with tool definitions
3. Execute tool calls against the JSON knowledge base
4. Return spoken response to voice platform

## Implementing Tool Handlers

```javascript
import fs from 'fs';

// Load knowledge base into memory at startup
const policies = JSON.parse(fs.readFileSync('data/entities/policies.json'));
const contacts = JSON.parse(fs.readFileSync('data/entities/contacts.json'));
const programs = JSON.parse(fs.readFileSync('data/entities/programs.json'));
const regions = JSON.parse(fs.readFileSync('data/entities/service-regions.json'));
const faqs = JSON.parse(fs.readFileSync('data/content/faqs.json'));
const transitResources = JSON.parse(fs.readFileSync('data/entities/transit-resources.json'));

function executeToolCall(toolCall) {
  switch (toolCall.name) {
    case 'lookup_policy':
      return policies[toolCall.input.area] || { error: 'Policy area not found' };

    case 'get_contact':
      return contacts.contacts.find(c => c.id === toolCall.input.contact_id)
        || { error: 'Contact not found' };

    case 'get_program':
      return programs.programs.find(p => p.id === toolCall.input.program_id)
        || { error: 'Program not found' };

    case 'get_region_for_city': {
      const city = toolCall.input.city.toLowerCase();
      const mapping = regions.city_to_region_mapping;
      for (const [regionId, cities] of Object.entries(mapping)) {
        if (Array.isArray(cities) && cities.some(c => c.toLowerCase() === city)) {
          const region = regions.regions.find(r => r.id === regionId);
          return region || { region_id: regionId };
        }
      }
      return { message: 'City not found in mapping. Advise caller to select region when calling 800-883-1295.' };
    }

    case 'search_faqs': {
      // Simple keyword search fallback (replace with vector search in production)
      const query = toolCall.input.query.toLowerCase();
      const scored = faqs.faqs.map(faq => ({
        ...faq,
        score: query.split(' ').filter(w =>
          faq.question.toLowerCase().includes(w) ||
          faq.answer.toLowerCase().includes(w)
        ).length
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 3);
    }

    case 'get_neighboring_county_service': {
      const county = transitResources.neighboring_county_paratransit.counties
        .find(c => c.county.toLowerCase().includes(toolCall.input.county.toLowerCase()));
      return county || { error: 'County not found' };
    }

    default:
      return { error: `Unknown tool: ${toolCall.name}` };
  }
}
```

## Embedding for Vector Search

For production-grade FAQ search, embed the JSONL export:

```bash
node scripts/export-jsonl.js > exports/knowledge-base.jsonl
```

Then embed with your provider of choice:

```javascript
// Example: OpenAI embeddings + Supabase pgvector
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const lines = fs.readFileSync('exports/knowledge-base.jsonl', 'utf-8')
  .split('\n').filter(Boolean).map(JSON.parse);

for (const doc of lines) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: doc.content
  });

  await supabase.from('documents').insert({
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata,
    embedding: embedding.data[0].embedding
  });
}
```

## Query Priority (important for accuracy)

1. **Structured lookup first**: Fares, phone numbers, hours, policies, programs. Use JSON tools. Never hallucinate a number.
2. **Semantic search second**: "How do I..." questions, anything not cleanly mapped to a policy area.
3. **Transfer when action needed**: Booking, canceling, complaining. Answer the question first, then transfer.
4. **Escalate to human**: Angry caller, confused after 2 attempts, account-specific questions, ADA violations, explicit request for human.
