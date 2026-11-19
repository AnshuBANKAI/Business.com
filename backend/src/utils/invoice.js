const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeTotals(items, taxMode, gstRate) {
  const subtotal = r2(items.reduce((s, i) => s + r2(i.qty * i.rate), 0));
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (taxMode === 'gst_intra') {
    cgst = r2((subtotal * gstRate) / 200);
    sgst = cgst;
  } else if (taxMode === 'gst_inter') {
    igst = r2((subtotal * gstRate) / 100);
  }
  return { subtotal, cgst, sgst, igst, total: r2(subtotal + cgst + sgst + igst) };
}

/** Indian financial year label for a date, e.g. 2026-11-06 -> "2026-27". */
export function financialYear(d) {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
