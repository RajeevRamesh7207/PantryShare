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

export function renderFlagBadge(flag) {
  const type = escapeHtml(flag.type);
  return `<span class="badge badge-${type}" data-flag="${type}" title="${escapeHtml(flag.message)}">${escapeHtml(FLAG_LABELS[flag.type] ?? flag.type)}</span>`;
}

export function computeTotals(plan) {
  const byType = {};
  for (const f of plan.flags) byType[f.type] = (byType[f.type] ?? 0) + 1;
  return { ...plan.totals, flagsByType: byType, flagCount: plan.flags.length };
}

export function renderTotals(plan) {
  const t = computeTotals(plan);
  const cell = (label, value, testid) => `<div class="stat"><dt>${label}</dt><dd data-testid="${testid}">${value}</dd></div>`;
  return `<dl class="stats">${cell('Stock on hand', formatKg(t.stockKg), 'total-stock')}${cell('Allocated', formatKg(t.allocatedKg), 'total-allocated')}`
    + `${cell('Unallocated', formatKg(t.unallocatedKg), 'total-unallocated')}${cell('Partners flagged', `${t.partnersFlagged} of ${plan.partners.length}`, 'total-flagged')}</dl>`;
}

function passBadge(pass, testid) {
  if (pass === null || pass === undefined) return `<span class="badge" data-testid="${testid}">No baseline</span>`;
  return `<span class="badge ${pass ? 'badge-pass' : 'badge-fail'}" data-testid="${testid}">${pass ? 'Meets target' : 'Misses target'}</span>`;
}

export function renderMeasures(m) {
  const s = m.spoilage;
  const f = m.fairness;
  const rows = m.weekly.map((w) => `<tr class="${w.kind === 'plan' ? 'current' : ''}"><td>${escapeHtml(w.weekStart)}${w.kind === 'plan' ? ' (this plan)' : ''}</td>`
    + `<td>${formatPct(w.spoilagePct)}</td><td>${formatPct(w.changeVsBaselinePct, 0)}</td><td>${w.meetsTarget === null ? '-' : w.meetsTarget ? 'yes' : 'no'}</td></tr>`).join('');
  return `<div class="measure"><h3>Spoilage ${passBadge(s.pass, 'spoilage-status')}</h3>
    <p><strong data-testid="spoilage-pct">${formatPct(s.spoilagePct)}</strong> of received weight (${formatKg(s.spoiledKg)} of ${formatKg(s.receivedKg)}).
    Baseline ${formatPct(m.baseline.spoilagePct)}; target at most ${formatPct(m.baseline.targetSpoilagePct)} (25% lower).</p></div>
  <div class="measure"><h3>Fairness ${passBadge(f.pass, 'fairness-status')}</h3>
    <p><strong data-testid="fairness-outside">${f.outsideCount}</strong> partner(s) outside the ${f.bandPct}% band
    (baseline average ${f.baselineAvgOutside === null ? '-' : f.baselineAvgOutside.toFixed(1)} per week). Measured on the suggested plan.</p></div>
  <details class="weekly"><summary data-testid="toggle-weekly">Weekly spoilage against baseline</summary>
    <table><thead><tr><th>Week</th><th>Spoilage</th><th>Vs baseline</th><th>Meets target</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

export function renderAdjustControl(line) {
  const id = `${line.partnerId}-${slug(line.item)}`;
  const attrs = `data-partner="${escapeHtml(line.partnerId)}" data-item="${escapeHtml(line.item)}"`;
  const value = Math.round(line.kg * 10) / 10;
  return `<span class="adjust"><input type="number" min="0" step="0.1" value="${value}" ${attrs} data-testid="adjust-input-${id}" aria-label="Quantity in kg of ${escapeHtml(line.item)}">`
    + `<button type="button" data-action="adjust" ${attrs} data-testid="adjust-apply-${id}">Apply</button>`
    + (line.adjustedKg !== null ? `<button type="button" data-action="clear-adjust" ${attrs} data-testid="adjust-clear-${id}">Reset</button>` : '')
    + '</span>';
}

function renderLine(line) {
  const id = `${line.partnerId}-${slug(line.item)}`;
  const warnings = line.warnings.map((w) => `<span class="badge badge-${escapeHtml(w.type)}" title="${escapeHtml(w.message)}">${escapeHtml(w.message)}</span>`).join(' ');
  const requested = line.requestedKg > 0
    ? `${formatKg(line.requestedKg)}${line.shortfallKg > 0 ? ` (short ${formatKg(line.shortfallKg)})` : ''}${line.note ? `<br><small>${escapeHtml(line.note)}</small>` : ''}`
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
    + `<td>${escapeHtml(partner.pickupWeekday)}</td><td>${partner.households}</td><td data-testid="partner-total-${id}">${formatKg(partner.totalKg)}</td>`
    + `<td>${formatKg(partner.fairKg)}</td><td>${dev}</td><td>${flags}</td></tr>`;
  if (!expanded) return head;
  return `${head}<tr class="lines"><td colspan="7"><table class="inner"><thead><tr><th>Item</th><th>Suggested</th><th>Final kg</th><th>Requested</th><th>Warnings</th><th>Reason</th></tr></thead>`
    + `<tbody>${partner.lines.map(renderLine).join('')}</tbody></table></td></tr>`;
}

export function filterPartners(plan, { text = '', flaggedOnly = false } = {}) {
  const needle = text.trim().toLowerCase();
  return plan.partners.filter((p) => (!needle || p.name.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle)) && (!flaggedOnly || p.flags.length > 0));
}

export function renderPartners(plan, { expanded = new Set(), text = '', flaggedOnly = false } = {}) {
  const shown = filterPartners(plan, { text, flaggedOnly });
  if (shown.length === 0) return '<p data-testid="no-partners">No partners match.</p>';
  return `<table><thead><tr><th>Partner</th><th>Pickup</th><th>Households</th><th>Allocated</th><th>Fair share</th><th>Vs fair</th><th>Flags</th></tr></thead>`
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
      + `<button type="button" data-action="set-conversion" data-item="${escapeHtml(i.item)}" data-testid="conversion-apply-${id}">Set factor</button></span></li>`;
  });
  const records = plan.excluded.records.map((r) => `<li><strong>${escapeHtml(r.item)}</strong> (record ${escapeHtml(r.recordId)}): ${escapeHtml(r.reason)}. <span class="fix">`
    + `<input type="date" data-field="date" data-testid="expiry-date-${escapeHtml(r.recordId)}" aria-label="Expiry date for record ${escapeHtml(r.recordId)}"> `
    + `<button type="button" data-action="set-expiry" data-record="${escapeHtml(r.recordId)}" data-testid="expiry-apply-${escapeHtml(r.recordId)}">Set expiry</button></span></li>`);
  const partners = plan.excluded.partners.map((p) => `<li><strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(p.reason)}.</li>`);
  const all = [...items, ...records, ...partners];
  return all.length ? `<ul class="exclusions">${all.join('')}</ul>` : '<p>Nothing is left out.</p>';
}
