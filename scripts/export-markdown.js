/**
 * Export entire knowledge base to a single markdown file.
 * Useful for: pasting into an LLM system prompt, human review,
 * or as a reference document.
 *
 * Usage: node scripts/export-markdown.js > exports/knowledge-base.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filePath), 'utf-8'));
}

const out = [];

// --- Organization ---
const org = loadJson('entities/organization.json');
out.push(`# Access Services Knowledge Base\n`);
out.push(`## Organization\n`);
out.push(`- **Name:** ${org.name} (${org.abbreviation})`);
out.push(`- **Role:** ${org.role}`);
out.push(`- **Service Area:** ${org.stats.service_area_sq_miles} square miles`);
out.push(`- **Registered Riders:** ${org.stats.registered_riders.toLocaleString()}`);
out.push(`- **Annual Trips:** ${org.stats.annual_trips.toLocaleString()}`);
out.push(`- **Member Agencies:** ${org.stats.member_agencies}`);
out.push(`- **Website:** ${org.website}`);
out.push(`- **Mailing Address:** ${org.addresses.mailing.street}, ${org.addresses.mailing.city}, ${org.addresses.mailing.state} ${org.addresses.mailing.zip}`);
out.push(`- **Physical Address:** ${org.addresses.physical.street}, ${org.addresses.physical.city}, ${org.addresses.physical.state} ${org.addresses.physical.zip}\n`);

// --- Contacts ---
const contacts = loadJson('entities/contacts.json');
out.push(`## Contact Directory\n`);
out.push(`| Department | Phone | Hours | Purpose |`);
out.push(`|---|---|---|---|`);
for (const c of contacts.contacts) {
  if (c.phone) {
    const option = c.phone_option ? ` (${c.phone_option})` : '';
    out.push(`| ${c.name} | ${c.phone}${option} | ${c.hours || 'N/A'} | ${c.purpose} |`);
  }
}
out.push('');

// --- Service Regions ---
const regions = loadJson('entities/service-regions.json');
out.push(`## Service Regions\n`);
out.push(`| Region | Base City | Contractor | Phone |`);
out.push(`|---|---|---|---|`);
for (const r of regions.regions) {
  out.push(`| ${r.name} | ${r.base_city} | ${r.contractor.name} | ${r.contractor.phone} |`);
}
out.push('');

// City-to-region mapping
if (regions.city_to_region_mapping) {
  out.push(`### City-to-Region Mapping\n`);
  for (const [regionId, cities] of Object.entries(regions.city_to_region_mapping)) {
    if (Array.isArray(cities)) {
      const region = regions.regions.find(r => r.id === regionId);
      const name = region ? region.name : regionId;
      out.push(`**${name}:** ${cities.join(', ')}\n`);
    }
  }
}

// --- Fares ---
const policies = loadJson('entities/policies.json');
out.push(`## Fares\n`);
out.push(`| Trip Distance | Fare |`);
out.push(`|---|---|`);
out.push(`| Under 20 miles | $${policies.fares.standard.under_20_miles.amount} |`);
out.push(`| 20+ miles | $${policies.fares.standard.over_20_miles.amount} |`);
out.push(`| Santa Clarita / Antelope Valley | $${policies.fares.standard.santa_clarita_antelope_valley.amount} |`);
out.push(`| Personal Care Attendant | Free |`);
out.push(`| Guest | Same as rider |`);
out.push(`| Children under 6 | Free |`);
out.push('');
out.push(`**Payment:** ${policies.fares.payment_methods.map(m => m.method).join(', ')}`);
out.push(`**Note:** Drivers cannot make change. Credit cards not accepted in Santa Clarita.\n`);

// --- Key Policies ---
out.push(`## Key Policies\n`);
out.push(`### Pickup Window`);
out.push(`- Vehicle may arrive within **${policies.pickup.on_time_window.minutes} minutes** of scheduled time`);
out.push(`- Driver waits **${policies.pickup.driver_wait_time.minutes} minutes** after arrival\n`);

out.push(`### No-Show Policy`);
out.push(`- ${policies.no_show.threshold.count}+ no-shows in a month exceeding ${policies.no_show.threshold.percentage}% of trips = suspension`);
out.push(`- First suspension: ${policies.no_show.consequences.first_suspension} days`);
out.push(`- Subsequent: ${policies.no_show.consequences.subsequent_suspensions} days`);
out.push(`- Record clears after 6 months\n`);

out.push(`### Cancellation`);
out.push(`- Cancel at least **${policies.cancellation.advance_required}** before pickup`);
out.push(`- Late cancellation = no-show\n`);

out.push(`### Mobility Devices`);
out.push(`- Max: ${policies.mobility_devices.max_width_inches}" wide x ${policies.mobility_devices.max_length_inches}" long`);
out.push(`- Max weight: ${policies.mobility_devices.max_weight_lbs} lbs (rider + device combined)\n`);

// --- Programs ---
const programs = loadJson('entities/programs.json');
out.push(`## Programs\n`);
for (const p of programs.programs) {
  out.push(`### ${p.name}`);
  out.push(`${p.description}\n`);
  out.push(`- **Eligibility:** ${typeof p.eligibility === 'string' ? p.eligibility : JSON.stringify(p.eligibility)}`);
  if (p.fare !== undefined) out.push(`- **Fare:** ${typeof p.fare === 'number' ? '$' + p.fare.toFixed(2) : p.fare}`);
  out.push('');
}

// --- FAQs ---
const faqs = loadJson('content/faqs.json');
out.push(`## Frequently Asked Questions\n`);
let lastCategory = '';
for (const faq of faqs.faqs) {
  if (faq.category !== lastCategory) {
    out.push(`### ${faq.category.charAt(0).toUpperCase() + faq.category.slice(1).replace(/-/g, ' ')}\n`);
    lastCategory = faq.category;
  }
  out.push(`**Q: ${faq.question}**`);
  out.push(`A: ${faq.answer}\n`);
}

// --- Holiday Schedule ---
if (policies.holiday_schedule) {
  out.push(`## Holiday Schedule\n`);
  out.push(`Access Services observes: ${policies.holiday_schedule.holidays.join(', ')}\n`);
  out.push(`${policies.holiday_schedule.note}\n`);
}

// --- Transit Resources ---
const transit = loadJson('entities/transit-resources.json');
out.push(`## Neighboring County Paratransit\n`);
for (const county of transit.neighboring_county_paratransit.counties) {
  out.push(`### ${county.county}`);
  for (const svc of county.services) {
    out.push(`- **${svc.name}:** ${svc.phone || 'See website'}`);
  }
  out.push('');
}

// Output
process.stdout.write(out.join('\n'));
process.stderr.write(`Exported knowledge base to markdown\n`);
