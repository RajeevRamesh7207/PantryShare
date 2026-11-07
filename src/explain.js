// Plain-language reason for every allocation line (FR4.1, NFR2). Requests are shown but never change quantities (FR4.2).

import { STORAGE_LABEL, isPerishable } from './model.js';

const kg = (n) => `${(Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;

/**
 * ctx: {partner, item, category, totalHouseholds, stockKg, fairKg, suggestedKg, adjustedKg, kg,
 *       block ('storage' | 'pickup' | 'no-stock' | null), lots [{lotId,kg,expiry}], itemLots, pickupDate,
 *       pickupWeekday, requestedKg, note}
 */
export function explainLine(ctx) {
  const { partner, item, category } = ctx;
  const share = (partner.households / ctx.totalHouseholds) * 100;
  const parts = [];

  parts.push(
    `Need: ${partner.name} serves ${partner.households} of ${ctx.totalHouseholds} households (${share.toFixed(1)}%), `
    + `so its fair share of ${item} is ${kg(ctx.fairKg)} of ${kg(ctx.stockKg)} in stock.`,
  );

  if (isPerishable(category)) {
    parts.push(ctx.block === 'storage'
      ? `Storage: ${partner.name} has no ${category === 'dairy' ? 'refrigeration' : 'freezer'}, so it cannot receive ${item}.`
      : `Storage: ${partner.name} has ${STORAGE_LABEL[category]}, which ${item} needs.`);
  } else {
    parts.push(`Storage: ${item} is not perishable and needs no special storage.`);
  }

  if (ctx.itemLots.length === 0) {
    parts.push('Expiry: there is no stock of this item on hand.');
  } else {
    const first = ctx.itemLots[0];
    parts.push(`Expiry: the soonest stock expires ${first.expiry}.`);
  }
  if (ctx.block === 'pickup') {
    parts.push(`Pickup: ${ctx.pickupWeekday} ${ctx.pickupDate} is after all ${item} expires, so none is allocated.`);
  } else {
    parts.push(`Pickup: ${ctx.pickupWeekday} ${ctx.pickupDate}.`);
  }

  if (ctx.lots.length > 0) {
    parts.push(`Taken soonest-expiring first: ${ctx.lots.map((l) => `${kg(l.kg)} from lot ${l.lotId} (expires ${l.expiry})`).join(', ')}.`);
  }

  parts.push(`Suggested ${kg(ctx.suggestedKg)}.`);
  if (ctx.adjustedKg !== null) parts.push(`Coordinator adjusted this to ${kg(ctx.adjustedKg)}.`);
  if (ctx.requestedKg > 0) {
    parts.push(`Requested ${kg(ctx.requestedKg)}${ctx.note ? ` ("${ctx.note}")` : ''}; requests are shown only and do not change quantities.`);
  }
  return parts.join(' ');
}
