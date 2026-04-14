/**
 * Export knowledge base to JSONL format (one JSON document per line).
 * Ready for any embedding/vectorization pipeline.
 *
 * Each line has: { id, category, content, metadata }
 * - content: the text to embed
 * - metadata: structured fields for filtering after retrieval
 *
 * Usage: node scripts/export-jsonl.js > exports/knowledge-base.jsonl
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filePath), 'utf-8'));
}

const docs = [];

// --- FAQs (primary content for embedding) ---
const faqs = loadJson('content/faqs.json');
for (const faq of faqs.faqs) {
  docs.push({
    id: faq.id,
    category: faq.category,
    type: 'faq',
    content: `Q: ${faq.question}\nA: ${faq.answer}`,
    metadata: {
      question: faq.question,
      spoken_answer: faq.spoken_answer,
      category: faq.category
    }
  });
}

// --- Policies (each section as a document) ---
const policies = loadJson('entities/policies.json');
const policyKeys = ['fares', 'booking', 'pickup', 'no_show', 'cancellation',
  'mobility_devices', 'companions', 'code_of_conduct', 'complaints',
  'title_vi', 'eligibility', 'packages_luggage', 'service_animals',
  'lost_and_found', 'holiday_schedule', 'public_records_request', 'rider_alerts'];

for (const key of policyKeys) {
  if (policies[key]) {
    docs.push({
      id: `policy-${key}`,
      category: 'policy',
      type: 'policy',
      content: `Access Services Policy: ${key.replace(/_/g, ' ')}\n${JSON.stringify(policies[key], null, 2)}`,
      metadata: { policy_area: key }
    });
  }
}

// --- Programs ---
const programs = loadJson('entities/programs.json');
for (const program of programs.programs) {
  docs.push({
    id: `program-${program.id}`,
    category: 'program',
    type: 'program',
    content: `Program: ${program.name}\n${program.description}\nEligibility: ${JSON.stringify(program.eligibility)}\nKeywords: ${program.keywords.join(', ')}`,
    metadata: {
      program_id: program.id,
      program_name: program.name,
      keywords: program.keywords
    }
  });
}

// --- Contacts ---
const contacts = loadJson('entities/contacts.json');
for (const contact of contacts.contacts) {
  docs.push({
    id: `contact-${contact.id}`,
    category: 'contact',
    type: 'contact',
    content: `Contact: ${contact.name}\nPhone: ${contact.phone || 'N/A'}\nHours: ${contact.hours || 'N/A'}\nPurpose: ${contact.purpose}`,
    metadata: {
      contact_id: contact.id,
      phone: contact.phone,
      hours: contact.hours,
      email: contact.email
    }
  });
}

// --- Service Regions ---
const regions = loadJson('entities/service-regions.json');
for (const region of regions.regions) {
  const cities = regions.city_to_region_mapping?.[region.id] || [];
  docs.push({
    id: `region-${region.id}`,
    category: 'region',
    type: 'region',
    content: `Service Region: ${region.name}\nBase: ${region.base_city}\nContractor: ${region.contractor.name}\nPhone: ${region.contractor.phone}\nCities served: ${cities.join(', ')}`,
    metadata: {
      region_id: region.id,
      contractor: region.contractor.name,
      cities: cities
    }
  });
}

// --- Organization ---
const org = loadJson('entities/organization.json');
docs.push({
  id: 'organization',
  category: 'organization',
  type: 'organization',
  content: `${org.name} (${org.abbreviation})\n${org.description}\nService area: ${org.stats.service_area_sq_miles} square miles\nRegistered riders: ${org.stats.registered_riders}\nAnnual trips: ${org.stats.annual_trips}\nMember agencies: ${org.stats.member_agencies}\nService regions: ${org.stats.service_regions}`,
  metadata: { name: org.name }
});

// --- Transit Resources ---
const transit = loadJson('entities/transit-resources.json');

// Mobility Management
docs.push({
  id: 'mobility-management',
  category: 'transit-options',
  type: 'service',
  content: `Mobility Management Referral Service\n${transit.mobility_management.description}\nPhone: ${transit.mobility_management.phone}\nHours: ${transit.mobility_management.hours}`,
  metadata: { phone: transit.mobility_management.phone }
});

// Neighboring counties
for (const county of transit.neighboring_county_paratransit.counties) {
  docs.push({
    id: `county-${county.county.toLowerCase().replace(/\s+/g, '-')}`,
    category: 'neighboring-county',
    type: 'neighboring-county',
    content: `Paratransit in ${county.county}:\n${county.services.map(s => `${s.name}: ${s.phone || 'see website'}`).join('\n')}`,
    metadata: { county: county.county }
  });
}

// Designated stands
docs.push({
  id: 'designated-stands',
  category: 'stands',
  type: 'service',
  content: `Access Services Designated Stands\n${transit.designated_stands.description}\nTotal: ${transit.designated_stands.total_count} locations\nCategories: ${Object.keys(transit.designated_stands.categories).join(', ')}`,
  metadata: { total: transit.designated_stands.total_count }
});

// --- Intent Map (for reference, not typically embedded) ---
const intents = loadJson('routing/intent-map.json');
for (const intent of intents.intents) {
  docs.push({
    id: `intent-${intent.id}`,
    category: 'intent',
    type: 'intent',
    content: `Intent: ${intent.id}\nPatterns: ${intent.patterns.join(', ')}\nAction: ${intent.action}\nResponse: ${intent.spoken_response}`,
    metadata: {
      intent_id: intent.id,
      action: intent.action,
      transfer_to: intent.transfer_to
    }
  });
}

// --- Output ---
for (const doc of docs) {
  process.stdout.write(JSON.stringify(doc) + '\n');
}

process.stderr.write(`Exported ${docs.length} documents to JSONL\n`);
