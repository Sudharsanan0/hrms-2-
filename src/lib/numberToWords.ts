/**
 * Convert a numeric amount to Indian currency words
 * e.g., 45750 → "Forty-Five Thousand Seven Hundred and Fifty Rupees Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertBelow100(n: number): string {
  if (n < 20) return ones[n];
  const t = tens[Math.floor(n / 10)];
  const o = ones[n % 10];
  return o ? `${t}-${o}` : t;
}

function convertBelow1000(n: number): string {
  if (n < 100) return convertBelow100(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundreds = `${ones[h]} Hundred`;
  return rest ? `${hundreds} and ${convertBelow100(rest)}` : hundreds;
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return `Minus ${numberToWords(-n)}`;

  const crore     = Math.floor(n / 10_000_000);
  const lakh      = Math.floor((n % 10_000_000) / 100_000);
  const thousand  = Math.floor((n % 100_000) / 1_000);
  const rest      = n % 1_000;

  const parts: string[] = [];

  if (crore)    parts.push(`${convertBelow1000(crore)} Crore`);
  if (lakh)     parts.push(`${convertBelow100(lakh)} Lakh`);
  if (thousand) parts.push(`${convertBelow1000(thousand)} Thousand`);
  if (rest)     parts.push(convertBelow1000(rest));

  return parts.join(' ');
}

/**
 * Convert rupee amount to words string for payslip display.
 * e.g., 45750.50 → "Forty-Five Thousand Seven Hundred and Fifty Rupees and Fifty Paise Only"
 */
export const numberToWordsRupees = (amount: number): string => {
  if (!amount || isNaN(amount)) return 'Zero Rupees Only';

  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);

  let result = `${numberToWords(rupees)} Rupees`;
  if (paise > 0) {
    result += ` and ${numberToWords(paise)} Paise`;
  }
  return `${result} Only`;
};
