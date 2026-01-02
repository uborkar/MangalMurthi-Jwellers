// src/utils/numberToWords.ts - Convert numbers to words for invoices

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertLessThanThousand(remainder) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  // Handle decimal part
  const parts = num.toFixed(2).split('.');
  const integerPart = parseInt(parts[0]);
  const decimalPart = parseInt(parts[1]);
  
  let result = '';
  
  // Convert integer part
  if (integerPart >= 10000000) { // Crores
    const crores = Math.floor(integerPart / 10000000);
    result += convertLessThanThousand(crores) + ' Crore ';
    const remainder = integerPart % 10000000;
    if (remainder > 0) {
      result += numberToWords(remainder);
    }
  } else if (integerPart >= 100000) { // Lakhs
    const lakhs = Math.floor(integerPart / 100000);
    result += convertLessThanThousand(lakhs) + ' Lakh ';
    const remainder = integerPart % 100000;
    if (remainder > 0) {
      result += numberToWords(remainder);
    }
  } else if (integerPart >= 1000) { // Thousands
    const thousands = Math.floor(integerPart / 1000);
    result += convertLessThanThousand(thousands) + ' Thousand ';
    const remainder = integerPart % 1000;
    if (remainder > 0) {
      result += convertLessThanThousand(remainder);
    }
  } else {
    result = convertLessThanThousand(integerPart);
  }
  
  result += ' Rupees';
  
  // Add decimal part if exists
  if (decimalPart > 0) {
    result += ' and ' + convertLessThanThousand(decimalPart) + ' Paise';
  }
  
  result += ' Only';
  
  return result.trim();
}
