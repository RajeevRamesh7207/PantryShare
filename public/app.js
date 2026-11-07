import {
  renderTotals, renderMeasures, renderPartners, renderItems, renderPlanFlags, renderExclusions, tipIcon,
} from './view-model.js';

const state = { plan: null, expanded: new Set(), text: '', flaggedOnly: false };
const $ = (id) => document.getElementById(id);

// Tips on the fixed parts of the page.
document.querySelectorAll('[data-tip-slot]').forEach((el) => { el.innerHTML = tipIcon(el.dataset.tipSlot, el.dataset.tipLabel); });

// Tooltips: one floating box, shown on hover, keyboard focus or tap, hidden on Escape, scroll or when the page redraws.
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
tooltip.setAttribute('role', 'tooltip');
tooltip.hidden = true;
document.body.append(tooltip);
let tipOwner = null;

function hideTip() {
  tooltip.hidden = true;
  tipOwner?.removeAttribute('aria-describedby');
  tipOwner = null;
}

function placeTip(el) {
  const r = el.getBoundingClientRect();
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  const below = r.bottom + 6 + h <= window.innerHeight || r.top - 6 - h < 0;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${below ? r.bottom + 6 : r.top - 6 - h}px`;
}

function showTip(el) {
  if (tipOwner === el) return;
  hideTip();
  tooltip.textContent = el.dataset.tipText;
  tooltip.hidden = false;
  placeTip(el);
  el.setAttribute('aria-describedby', 'tooltip');
  tipOwner = el;
}

// Scrolling moves the trigger, so the tip follows it (and closes once the trigger is off screen).
function followTip() {
  if (!tipOwner) return;
  const r = tipOwner.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) hideTip(); else placeTip(tipOwner);
}

const tipTarget = (event) => event.target.closest?.('[data-tip-text]') ?? null;
document.addEventListener('mouseover', (event) => { const el = tipTarget(event); if (el) showTip(el); });
document.addEventListener('mouseout', (event) => { if (tipTarget(event)) hideTip(); });
document.addEventListener('focusin', (event) => { const el = tipTarget(event); if (el) showTip(el); });
document.addEventListener('focusout', (event) => { if (tipTarget(event)) hideTip(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hideTip(); });
document.addEventListener('scroll', followTip, true);
window.addEventListener('resize', hideTip);
// A tap on a phone has no hover, so a click on a tip button toggles it.
document.addEventListener('click', (event) => {
  const el = tipTarget(event);
  if (!el) { hideTip(); return; }
  showTip(el);
});

function showMessage(text, isError = false) {
  const el = $('message');
  el.textContent = text;
  el.className = text ? (isError ? 'error' : 'ok') : '';
}

async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Could not reach the server. Is it still running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

function renderPartnerTable() {
  $('partners').innerHTML = renderPartners(state.plan, state);
}

function render() {
  hideTip();
  const plan = state.plan;
  $('plan-date').textContent = plan.planDate;
  $('totals').innerHTML = renderTotals(plan);
  $('measures').innerHTML = renderMeasures(plan.measures);
  $('stock-flags').innerHTML = renderPlanFlags(plan);
  $('exclusions').innerHTML = renderExclusions(plan);
  $('items').innerHTML = renderItems(plan);
  renderPartnerTable();
}

async function update(method, path, body, okText) {
  try {
    state.plan = await api(method, path, body);
    render();
    showMessage(okText ?? '');
  } catch (err) {
    showMessage(err.message, true);
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, partner, item, record } = button.dataset;
  if (action === 'toggle') {
    if (state.expanded.has(partner)) state.expanded.delete(partner);
    else state.expanded.add(partner);
    renderPartnerTable();
  } else if (action === 'adjust') {
    const value = button.closest('.adjust').querySelector('input').value;
    if (value.trim() === '' || !Number.isFinite(Number(value))) return showMessage('Enter a quantity in kg.', true);
    update('POST', '/api/adjust', { partnerId: partner, item, kg: Number(value) }, `Adjusted ${item} for ${partner}.`);
  } else if (action === 'clear-adjust') {
    update('POST', '/api/adjust', { partnerId: partner, item, kg: null }, `Back to the suggestion for ${item}.`);
  } else if (action === 'set-conversion') {
    const box = button.closest('.fix');
    const factor = Number(box.querySelector('[data-field=factor]').value);
    update('POST', '/api/settings', { type: 'conversion', item, unit: box.querySelector('[data-field=unit]').value, factor }, `Conversion set for ${item}.`);
  } else if (action === 'set-expiry') {
    const date = button.closest('.fix').querySelector('[data-field=date]').value;
    update('POST', '/api/settings', { type: 'expiry', recordId: record, date }, `Expiry set for record ${record}.`);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || !event.target.matches('.adjust input')) return;
  event.target.closest('.adjust').querySelector('[data-action=adjust]').click();
});

$('filter-text').addEventListener('input', (event) => {
  state.text = event.target.value;
  renderPartnerTable();
});
$('filter-flagged').addEventListener('change', (event) => {
  state.flaggedOnly = event.target.checked;
  renderPartnerTable();
});

update('GET', '/api/plan').then(() => { if (!state.plan) $('partners').textContent = 'The plan could not be loaded.'; });
