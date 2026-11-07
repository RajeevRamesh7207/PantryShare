// Pure view code: turns the plan JSON into HTML strings. Used by app.js in the browser and by tests in Node.
// Every interactive element carries a data-testid. All text from data is escaped.

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function formatKg(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return `${(Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
}

export function formatPct(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return `${n.toFixed(digits)}%`;
}

// Tooltips: one place for every tip, so wording stays consistent. {category} is filled in where a tip needs it.
export const TIPS = {
  stock: 'All usable stock this week, in kg. Items left out of the plan are not counted.',
  allocated: 'What the plan gives to partners, including any changes you made.',
  unallocated: 'Stock no partner can take within its fair share, storage and pickup time. You decide what to do with it.',
  flagged: 'Partners with a flag to look at: missed pickup, outside the fairness band, or a nutrition gap.',
  spoilage: 'Share of received weight that would expire before it is collected. Target: at least 25% below the baseline.',
  fairness: 'Partners whose share is more than 20% above or below their fair share. Target: none.',
  baseline: 'Average of the last 13 weeks of synthetic history, not real data.',
  meetsTarget: 'Based on the suggested plan, before your changes.',
  surplus: 'This stock is held back so no partner goes over its fair share. Adjust a partner to place it.',
  requestsExceed: 'Partners asked for more than we have. Stock is shared by need (households served), not by request.',
  leftOut: "This item can't be planned yet. Fix it here and the plan updates at once.",
  setFactor: 'How many kg one unit weighs, for example 1 case = 12 kg.',
  setExpiry: 'Date the stock expires. Without one, the item stays out of the plan.',
  households: 'Number of households the partner serves. This sets its fair share.',
  fairShare: "The partner's share of total households, applied to each item's stock.",
  vsFair: 'How far the allocation is from fair share. Over 20% either way is flagged.',
  missedPickup: 'Did not collect last week. Allocation is kept; you decide whether to change it.',
  nutrition: '{category} is more than 10 points below its target share for this partner.',
  showHide: "Open or close this partner's items.",
  suggested: 'What the plan proposes: soonest-expiring stock first, up to fair share.',
  finalKg: 'Type a quantity and press Apply or Enter. Totals and warnings update at once.',
  reset: 'Go back to the suggestion.',
  requested: 'What the partner asked for. It is shown for you only and never changes the suggestion.',
  short: 'Requested minus allocated.',
  why: 'Shows the need, storage, expiry and pickup facts behind this quantity.',
  storage: 'More than this partner can keep cold or frozen. You can still apply it.',
  overStock: 'You allocated more than is in stock.',
  findPartner: 'Search by partner name or ID.',
  flaggedOnly: 'Show only partners with a flag.',
};

const capitalize = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

export function tipText(key, vars = {}) {
  const text = TIPS[key];
  if (text === undefined) throw new Error(`unknown tooltip "${key}"`);
  return text.replace(/\{(\w+)\}/g, (_, name) => capitalize(vars[name] ?? ''));
}

/** A small "i" button that explains a label. The browser shows the text on hover, focus or tap (see app.js). */
export function tipIcon(key, label, vars = {}) {
  const text = tipText(key, vars);
  return `<button type="button" class="tip" data-tip-text="${escapeHtml(text)}" data-testid="tip-${escapeHtml(key)}" aria-label="About ${escapeHtml(label)}: ${escapeHtml(text)}">i</button>`;
}

export const FLAG_LABELS = {
  fairness: 'Fairness',
  'missed-pickup': 'Missed pickup',
  nutrition: 'Nutrition',
  storage: 'Storage',
  expiry: 'Expires soon',
  expired: 'Expired',
  surplus: 'Unallocated',
  'over-allocated': 'Over stock',
  'requests-exceed-stock': 'Requests exceed stock',
  'excluded-item': 'Left out',
  'excluded-record': 'Left out',
  'excluded-partner': 'Left out',
};

// Which tooltip a flag or warning badge carries. The badge itself is the trigger (hover, focus or tap).
const BADGE_TIPS = {
  surplus: 'surplus',
  'requests-exceed-stock': 'requestsExceed',
  'excluded-item': 'leftOut',
  'excluded-record': 'leftOut',
  'excluded-partner': 'leftOut',
  'missed-pickup': 'missedPickup',
  nutrition: 'nutrition',
  storage: 'storage',
  'over-allocated': 'overStock',
};

/** Shared by flag and warning badges. A badge without a tooltip keeps its message as a plain title. */
function tipBadge(type, label, message, extra = {}) {
  const safeType = escapeHtml(type);
  const key = BADGE_TIPS[type];
  if (!key) return `<span class="badge badge-${safeType}" data-flag="${safeType}" title="${escapeHtml(message)}">${escapeHtml(label)}</span>`;
  // Partner-level nutrition and storage flags carry numbers worth keeping next to the explanation.
  const text = tipText(key, extra) + (type === 'nutrition' || (type === 'storage' && extra.scope === 'partner') ? ` ${message}` : '');
  return `<span class="badge badge-${safeType} has-tip" data-flag="${safeType}" tabindex="0" data-tip-text="${escapeHtml(text)}" data-testid="tip-${escapeHtml(key)}">`
    + `${escapeHtml(label)}<span class="sr-only">. ${escapeHtml(text)}</span></span>`;
}

export function renderFlagBadge(flag) {
  const base = FLAG_LABELS[flag.type] ?? flag.type;
  const label = flag.type === 'nutrition' && flag.category ? `${base}: ${flag.category}` : base;
  return tipBadge(flag.type, label, flag.message, { category: flag.category, scope: flag.scope });
}

function renderWarningBadge(w) {
  return `${tipBadge(w.type, w.message, w.message, { scope: 'line' })}`;
}

export function computeTotals(plan) {
  const byType = {};
  for (const f of plan.flags) byType[f.type] = (byType[f.type] ?? 0) + 1;
  return { ...plan.totals, flagsByType: byType, flagCount: plan.flags.length };
}

export function renderTotals(plan) {
  const t = computeTotals(plan);
  const cell = (label, tip, value, testid, cls = '') => `<div class="stat ${cls}"><dt>${label} ${tip}</dt><dd data-testid="${testid}">${value}</dd></div>`;
  // When more is allocated than is in stock, say so plainly instead of showing a negative Unallocated figure.
  const overStock = t.unallocatedKg < -1e-6;
  const third = overStock
    ? cell('Over stock by', tipIcon('overStock', 'Over stock'), formatKg(-t.unallocatedKg), 'total-unallocated', 'over')
    : cell('Unallocated', tipIcon('unallocated', 'Unallocated'), formatKg(t.unallocatedKg), 'total-unallocated');
  return `<dl class="stats">${cell('Stock on hand', tipIcon('stock', 'Stock on hand'), formatKg(t.stockKg), 'total-stock')}`
    + `${cell('Allocated', tipIcon('allocated', 'Allocated'), formatKg(t.allocatedKg), 'total-allocated')}${third}`
    + `${cell('Partners flagged', tipIcon('flagged', 'Partners flagged'), `${t.partnersFlagged} of ${plan.partners.length}`, 'total-flagged')}</dl>`;
}

function passBadge(pass, testid) {
  if (pass === null || pass === undefined) return `<span class="badge" data-testid="${testid}">No baseline</span>`;
  return `<span class="badge ${pass ? 'badge-pass' : 'badge-fail'}" data-testid="${testid}">${pass ? 'Meets target' : 'Misses target'}</span> ${tipIcon('meetsTarget', 'Meets target')}`
    + ' <small class="muted">on synthetic history</small>';
}

export function renderMeasures(m) {
  const s = m.spoilage;
  const f = m.fairness;
  const rows = m.weekly.map((w) => `<tr class="${w.kind === 'plan' ? 'current' : ''}"><td>${escapeHtml(w.weekStart)}${w.kind === 'plan' ? ' (this plan)' : ''}</td>`
    + `<td>${formatPct(w.spoilagePct)}</td><td>${formatPct(w.changeVsBaselinePct, 0)}</td><td>${w.meetsTarget === null ? '-' : w.meetsTarget ? 'yes' : 'no'}</td></tr>`).join('');
  return `<div class="measure"><h3>Spoilage ${tipIcon('spoilage', 'Spoilage')} ${passBadge(s.pass, 'spoilage-status')}</h3>
    <p><strong data-testid="spoilage-pct">${formatPct(s.spoilagePct)}</strong> of received weight (${formatKg(s.spoiledKg)} of ${formatKg(s.receivedKg)}).
    Baseline ${tipIcon('baseline', 'Baseline')} ${formatPct(m.baseline.spoilagePct)}; target at most ${formatPct(m.baseline.targetSpoilagePct)} (25% lower).</p></div>
  <div class="measure"><h3>Fairness ${tipIcon('fairness', 'Fairness')} ${passBadge(f.pass, 'fairness-status')}</h3>
    <p><strong data-testid="fairness-outside">${f.outsideCount}</strong> partner(s) outside the ${f.bandPct}% band
    (baseline average ${tipIcon('baseline', 'Baseline')} ${f.baselineAvgOutside === null ? '-' : f.baselineAvgOutside.toFixed(1)} per week). Measured on the suggested plan.</p></div>
  <details class="weekly"><summary data-testid="toggle-weekly">Weekly spoilage against baseline</summary>
    <table><thead><tr><th>Week</th><th>Spoilage</th><th>Vs baseline</th><th>Meets target</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

export function renderAdjustControl(line) {
  const id = `${line.partnerId}-${slug(line.item)}`;
  const attrs = `data-partner="${escapeHtml(line.partnerId)}" data-item="${escapeHtml(line.item)}"`;
  const value = Math.round(line.kg * 10) / 10;
  return `<span class="adjust"><input type="number" min="0" step="0.1" value="${value}" ${attrs} data-testid="adjust-input-${id}" aria-label="Quantity in kg of ${escapeHtml(line.item)}">`
    + `<button type="button" data-action="adjust" ${attrs} data-testid="adjust-apply-${id}">Apply</button>`
    + (line.adjustedKg !== null ? `<button type="button" data-action="clear-adjust" ${attrs} data-testid="adjust-clear-${id}">Reset</button> ${tipIcon('reset', 'Reset')}` : '')
    + '</span>';
}

function renderLine(line) {
  const id = `${line.partnerId}-${slug(line.item)}`;
  const warnings = line.warnings.map(renderWarningBadge).join(' ');
  const requested = line.requestedKg > 0
    ? `${formatKg(line.requestedKg)}${line.shortfallKg > 0 ? ` (short ${formatKg(line.shortfallKg)} ${tipIcon('short', 'Short')})` : ''}${line.note ? `<br><small>${escapeHtml(line.note)}</small>` : ''}`
    : '';
  return `<tr class="${line.adjustedKg !== null ? 'adjusted' : ''}" data-testid="line-${id}"><td>${escapeHtml(line.item)}</td><td>${formatKg(line.suggestedKg)}</td>`
    + `<td>${renderAdjustControl(line)}</td><td>${requested}</td><td>${warnings}</td>`
    + `<td><details><summary data-testid="explain-${id}">Why</summary><p class="why">${escapeHtml(line.explanation)}</p></details></td></tr>`;
}

export function renderPartner(partner, expanded) {
  const flags = partner.flags.map(renderFlagBadge).join(' ');
  const dev = partner.deviationPct === null ? '-' : `${partner.deviationPct >= 0 ? '+' : ''}${partner.deviationPct.toFixed(1)}%`;
  const id = escapeHtml(partner.id);
  const head = `<tr class="partner ${partner.outsideBand ? 'outside' : ''}" data-testid="partner-${id}"><td><button type="button" class="toggle" data-action="toggle" data-partner="${id}" `
    + `data-testid="toggle-partner-${id}" aria-expanded="${expanded}">${expanded ? 'Hide' : 'Show'}</button> ${escapeHtml(partner.name)} <small>${id}</small></td>`
    + `<td data-label="Pickup">${escapeHtml(partner.pickupWeekday)}</td><td data-label="Households">${partner.households}</td>`
    + `<td data-label="Allocated" data-testid="partner-total-${id}">${formatKg(partner.totalKg)}</td>`
    + `<td data-label="Fair share">${formatKg(partner.fairKg)}</td><td data-label="Vs fair">${dev}</td><td data-label="Flags">${flags}</td></tr>`;
  if (!expanded) return head;
  return `${head}<tr class="lines"><td colspan="7"><table class="inner"><thead><tr><th>Item</th><th>Suggested ${tipIcon('suggested', 'Suggested')}</th>`
    + `<th>Final kg ${tipIcon('finalKg', 'Final kg')}</th><th>Requested ${tipIcon('requested', 'Requested')}</th><th>Warnings</th><th>Reason ${tipIcon('why', 'Why')}</th></tr></thead>`
    + `<tbody>${partner.lines.map(renderLine).join('')}</tbody></table></td></tr>`;
}

export function filterPartners(plan, { text = '', flaggedOnly = false } = {}) {
  const needle = text.trim().toLowerCase();
  return plan.partners.filter((p) => (!needle || p.name.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle)) && (!flaggedOnly || p.flags.length > 0));
}

export function renderPartners(plan, { expanded = new Set(), text = '', flaggedOnly = false } = {}) {
  const shown = filterPartners(plan, { text, flaggedOnly });
  if (shown.length === 0) return '<p data-testid="no-partners">No partners match.</p>';
  return `<table class="partners"><thead><tr><th>Partner ${tipIcon('showHide', 'Show and Hide')}</th><th>Pickup</th><th>Households ${tipIcon('households', 'Households')}</th><th>Allocated</th>`
    + `<th>Fair share ${tipIcon('fairShare', 'Fair share')}</th><th>Vs fair ${tipIcon('vsFair', 'Vs fair')}</th><th>Flags</th></tr></thead>`
    + `<tbody>${shown.map((p) => renderPartner(p, expanded.has(p.id))).join('')}</tbody></table>`;
}

export function renderItems(plan) {
  const rows = plan.items.map((i) => {
    const soonest = i.lots[0];
    return `<tr data-testid="item-${slug(i.item)}"><td>${escapeHtml(i.item)}</td><td>${escapeHtml(i.category)}</td><td>${formatKg(i.stockKg)}</td><td>${formatKg(i.allocatedKg)}</td>`
      + `<td class="${i.unallocatedKg > 1e-6 || i.unallocatedKg < -1e-6 ? 'warn' : ''}">${formatKg(i.unallocatedKg)}</td><td>${soonest ? escapeHtml(soonest.expiry) : '-'}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Allocated</th><th>Unallocated</th><th>Soonest expiry</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderPlanFlags(plan) {
  const itemFlags = plan.flags.filter((f) => f.scope === 'item' || f.type === 'excluded-partner');
  if (itemFlags.length === 0) return '<p>No stock flags.</p>';
  return `<ul class="flags">${itemFlags.map((f) => `<li>${renderFlagBadge(f)} ${escapeHtml(f.message)}</li>`).join('')}</ul>`;
}

/** FR1.2 and FR1.3: fix what keeps an item out of the plan. */
export function renderExclusions(plan) {
  const items = plan.excluded.items.map((i) => {
    const id = slug(i.item);
    return `<li><strong>${escapeHtml(i.item)}</strong>: ${escapeHtml(i.reason)}. <span class="fix">`
      + `<select data-field="unit" data-testid="conversion-unit-${id}" aria-label="Unit for ${escapeHtml(i.item)}">${i.units.map((u) => `<option>${escapeHtml(u)}</option>`).join('')}</select>`
      + ` = <input type="number" min="0" step="any" data-field="factor" data-testid="conversion-factor-${id}" aria-label="Kilograms per unit"> kg `
      + `<button type="button" data-action="set-conversion" data-item="${escapeHtml(i.item)}" data-testid="conversion-apply-${id}">Set factor</button> ${tipIcon('setFactor', 'Set factor')}</span></li>`;
  });
  const records = plan.excluded.records.map((r) => `<li><strong>${escapeHtml(r.item)}</strong> (record ${escapeHtml(r.recordId)}): ${escapeHtml(r.reason)}. <span class="fix">`
    + `<input type="date" data-field="date" data-testid="expiry-date-${escapeHtml(r.recordId)}" aria-label="Expiry date for record ${escapeHtml(r.recordId)}"> `
    + `<button type="button" data-action="set-expiry" data-record="${escapeHtml(r.recordId)}" data-testid="expiry-apply-${escapeHtml(r.recordId)}">Set expiry</button> ${tipIcon('setExpiry', 'Set expiry')}</span></li>`);
  const partners = plan.excluded.partners.map((p) => `<li><strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(p.reason)}.</li>`);
  const all = [...items, ...records, ...partners];
  return all.length ? `<ul class="exclusions">${all.join('')}</ul>` : '<p>Nothing is left out.</p>';
}
