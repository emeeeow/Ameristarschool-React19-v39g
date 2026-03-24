/**
 * utils/enrollmentPDF.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a professional enrollment application PDF using jsPDF.
 * Design matches the Ameristar School website:
 *   • Navy  #001A35 — headers, section bars, footer strip
 *   • Gold  #D4AF37 — accents, labels, dividers
 *   • White #FFFFFF — body background
 *   • Dark  #1e293b — body text (oxford)
 *
 * Usage:
 *   import { generateEnrollmentPDF } from '../utils/enrollmentPDF';
 *   const doc = generateEnrollmentPDF(formData, totals);
 *   doc.save('Ameristar-Enrollment.pdf');          // auto-download
 *   const blob = doc.output('blob');               // for FormData upload
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';

// ── Brand colour constants (RGB tuples for jsPDF) ─────────────────────────────
const NAVY:  [number,number,number] = [0,   26,  53 ];
const GOLD:  [number,number,number] = [212, 175, 55 ];
const WHITE: [number,number,number] = [255, 255, 255];
const DARK:  [number,number,number] = [30,  41,  59 ];
const LIGHT: [number,number,number] = [248, 248, 248];
const MID:   [number,number,number] = [180, 180, 180];

// ── Human-readable course labels ──────────────────────────────────────────────
export const COURSE_LABELS: Record<string, string> = {
  'ins-ethics':     '12-Hr Ethics & CA Insurance Code (Required)',
  'ins-life-health':'Life & Health Insurance (52 Hrs)',
  'ins-pc':         'Property & Casualty Insurance (52 Hrs)',
  'ins-ce':         'Insurance CE Package (Provider 409s99)',
  're-principles':  'Real Estate Principles (45 Hrs, Required)',
  're-practice':    'Real Estate Practice (45 Hrs, Required)',
  're-finance':     'Real Estate Finance (45 Hrs)',
  're-ce':          '45-Hour Real Estate CE Package',
  'nmls-20':        'NMLS 20-Hr Pre-Licensing (Required)',
  'nmls-8':         'NMLS 8-Hr Annual CE (Renewal)',
};

// ── Human-readable payment labels ────────────────────────────────────────────
export const PAYMENT_LABELS: Record<string, string> = {
  cash:   'Cash',
  check:  'Check (payable to Ameristar School)',
  credit: 'Credit Card',
  zelle:  'Zelle — (626) 308-0150',
};

// ── Input types ───────────────────────────────────────────────────────────────
export interface PDFFormData {
  fullName:        string;
  email:           string;
  phone:           string;
  address:         string;
  caReLicense:     string;
  caInsLicense:    string;
  nmlsId:          string;
  selectedCourses: string[];
  wantsMaterials:  boolean;
  wantsShipping:   boolean;
  paymentMethod:   string;
  signature:       string;
  date:            string;
}

export interface PDFTotals {
  courseSubtotal:    number;
  registrationFee:   number;
  materialsSubtotal: number;
  shippingSubtotal:  number;
  grandTotal:        number;
}

// ── Main generator ────────────────────────────────────────────────────────────
export function generateEnrollmentPDF(data: PDFFormData, totals: PDFTotals): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const PW  = 215.9;  // page width  (letter)
  const PH  = 279.4;  // page height (letter)
  const ML  = 18;     // margin left
  const MR  = 18;     // margin right
  const CW  = PW - ML - MR;  // content width
  let   y   = 0;      // current y cursor

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Draw the branded page header (repeated on every new page). */
  const drawPageHeader = () => {
    // Navy bar
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PW, 22, 'F');

    // School name — left
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text('AMERISTAR', ML, 13);

    // "School" in gold italic — positioned flush after AMERISTAR using measured width
    const ameristarWidth = doc.getTextWidth('AMERISTAR');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(13);
    doc.setTextColor(...GOLD);
    doc.text('School', ML + ameristarWidth + 1.5, 13);

    // Gold divider line below bar
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(0, 22, PW, 22);

    // Document title — right
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('ENROLLMENT APPLICATION', PW - MR, 13, { align: 'right' });

    y = 30;
  };

  /** Draw the branded page footer. */
  const drawPageFooter = (pageNum: number, totalPages: number) => {
    // Thin gold line
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(ML, PH - 14, PW - MR, PH - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID);

    doc.text('Ameristar School  ·  Los Angeles, CA  ·  (310) 377-0337  ·  (626) 308-0150  ·  ameristarschool@yahoo.com', ML, PH - 9);
    doc.text(`Page ${pageNum} of ${totalPages}`, PW - MR, PH - 9, { align: 'right' });
    doc.text('Bureau for Private Postsecondary Education (BPPE) Approved Provider', ML, PH - 5);
  };

  /** Check if we need a new page; if so, add page and reset y. */
  const checkPage = (neededHeight: number, pageNum: { n: number }) => {
    if (y + neededHeight > PH - 20) {
      doc.addPage();
      pageNum.n++;
      drawPageHeader();
    }
  };

  /** Draw a bold navy section header bar. */
  const sectionHeader = (title: string, pageNum: { n: number }) => {
    checkPage(12, pageNum);
    doc.setFillColor(...NAVY);
    doc.rect(ML, y, CW, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text(title.toUpperCase(), ML + 4, y + 6);
    y += 13;
  };

  /** Draw a single label + value field with underline. */
  const field = (label: string, value: string, pageNum: { n: number }) => {
    checkPage(14, pageNum);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(label.toUpperCase(), ML, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    const display = value.trim() !== '' ? value : '—';
    doc.text(display, ML, y);

    doc.setDrawColor(...MID);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 1.5, ML + CW, y + 1.5);
    y += 9;
  };

  /** Draw two fields side by side. */
  const fieldRow2 = (
    l1: string, v1: string,
    l2: string, v2: string,
    pageNum: { n: number }
  ) => {
    checkPage(14, pageNum);
    const half = (CW - 8) / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(l1.toUpperCase(), ML, y);
    doc.text(l2.toUpperCase(), ML + half + 8, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(v1.trim() !== '' ? v1 : '—', ML, y);
    doc.text(v2.trim() !== '' ? v2 : '—', ML + half + 8, y);

    doc.setDrawColor(...MID);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 1.5, ML + half, y + 1.5);
    doc.line(ML + half + 8, y + 1.5, PW - MR, y + 1.5);
    y += 9;
  };

  /** Draw three fields side by side. */
  const fieldRow3 = (
    l1: string, v1: string,
    l2: string, v2: string,
    l3: string, v3: string,
    pageNum: { n: number }
  ) => {
    checkPage(14, pageNum);
    const third = (CW - 12) / 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(l1.toUpperCase(), ML, y);
    doc.text(l2.toUpperCase(), ML + third + 6, y);
    doc.text(l3.toUpperCase(), ML + (third + 6) * 2, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(v1.trim() !== '' ? v1 : '—', ML, y);
    doc.text(v2.trim() !== '' ? v2 : '—', ML + third + 6, y);
    doc.text(v3.trim() !== '' ? v3 : '—', ML + (third + 6) * 2, y);

    doc.setDrawColor(...MID);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 1.5, ML + third, y + 1.5);
    doc.line(ML + third + 6, y + 1.5, ML + (third + 6) + third, y + 1.5);
    doc.line(ML + (third + 6) * 2, y + 1.5, PW - MR, y + 1.5);
    y += 9;
  };

  /** Draw an order-summary line (label + amount, optional bold). */
  const summaryRow = (
    label: string,
    amount: number | null,
    bold: boolean,
    pageNum: { n: number }
  ) => {
    checkPage(8, pageNum);
    const displayAmt = amount !== null ? `$${amount.toFixed(2)}` : '—';

    if (bold) {
      doc.setFillColor(...NAVY);
      doc.rect(ML, y - 4, CW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...WHITE);
      doc.text(label, ML + 4, y + 1);
      doc.text(displayAmt, PW - MR - 4, y + 1, { align: 'right' });
      y += 9;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(label, ML + 4, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(displayAmt, PW - MR - 4, y + 1, { align: 'right' });
      doc.setDrawColor(...LIGHT);
      doc.setLineWidth(0.3);
      doc.line(ML, y + 3, PW - MR, y + 3);
      y += 7.5;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════════════
  const pageNum = { n: 1 };
  drawPageHeader();

  // ── Title block ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text('Course Enrollment Application', PW / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.text(`Date of Application: ${data.date}`, PW / 2, y, { align: 'center' });
  y += 10;

  // Gold accent rule
  doc.setFillColor(...GOLD);
  doc.rect(ML, y, CW, 0.8, 'F');
  y += 8;

  // ── Section 1: Personal Information ───────────────────────────────────────
  sectionHeader('01 · Personal Information', pageNum);

  field('Full Legal Name', data.fullName, pageNum);
  fieldRow2('Email Address', data.email, 'Phone Number', data.phone, pageNum);
  field('Mailing Address', data.address, pageNum);
  y += 2;

  fieldRow3(
    'CA RE License #',  data.caReLicense  || 'N/A',
    'CA Ins License #', data.caInsLicense || 'N/A',
    'NMLS / Bio ID',    data.nmlsId       || 'N/A',
    pageNum
  );
  y += 4;

  // ── Section 2: Course Selection ────────────────────────────────────────────
  sectionHeader('02 · Course Selection', pageNum);

  if (data.selectedCourses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MID);
    doc.text('No courses selected.', ML + 4, y);
    y += 10;
  } else {
    // Group by category
    const groups: Array<{ heading: string; ids: string[] }> = [
      {
        heading: 'Insurance Certification',
        ids: ['ins-ethics', 'ins-life-health', 'ins-pc', 'ins-ce'],
      },
      {
        heading: 'Real Estate Certification',
        ids: ['re-principles', 're-practice', 're-finance', 're-ce'],
      },
      {
        heading: 'NMLS Certification',
        ids: ['nmls-20', 'nmls-8'],
      },
    ];

    groups.forEach(group => {
      const selected = data.selectedCourses.filter(c => group.ids.includes(c));
      if (selected.length === 0) return;

      checkPage(10, pageNum);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GOLD);
      doc.text(group.heading.toUpperCase(), ML + 2, y);
      y += 5;

      selected.forEach(courseId => {
        checkPage(7, pageNum);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...DARK);
        // Bullet
        doc.setFillColor(...GOLD);
        doc.circle(ML + 4, y - 1.2, 1, 'F');
        doc.text(COURSE_LABELS[courseId] || courseId, ML + 8, y);
        y += 6;
      });
      y += 2;
    });
  }

  // ── Section 3: Payment Summary ─────────────────────────────────────────────
  // Force a new page if the entire section (header + summary box) won't fit.
  // Section header = ~13mm, box = 86mm, bottom padding = ~6mm → 105mm total.
  if (y + 105 > PH - 20) {
    doc.addPage();
    pageNum.n++;
    drawPageHeader();
  }
  sectionHeader('03 · Payment Summary', pageNum);

  // Light background box — tall enough to include Payment Method with comfortable spacing
  checkPage(88, pageNum);
  doc.setFillColor(...LIGHT);
  doc.rect(ML, y, CW, 86, 'F');
  doc.setDrawColor(...MID);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, CW, 86, 'S');
  y += 4;

  summaryRow(
    `Courses (${data.selectedCourses.length} × $100.00)`,
    totals.courseSubtotal,
    false,
    pageNum
  );
  summaryRow('Registration Fee (Non-Refundable)', totals.registrationFee, false, pageNum);
  summaryRow(
    `Physical Materials${data.wantsMaterials ? '' : ' (Not Selected)'}`,
    data.wantsMaterials ? totals.materialsSubtotal : null,
    false,
    pageNum
  );
  summaryRow(
    `Shipping${data.wantsShipping && data.wantsMaterials ? '' : ' (Not Selected)'}`,
    data.wantsShipping && data.wantsMaterials ? totals.shippingSubtotal : null,
    false,
    pageNum
  );
  y += 2;
  summaryRow('TOTAL DUE', totals.grandTotal, true, pageNum);

  // Payment Method — drawn inside the box, separated by a light rule
  y += 4;
  doc.setDrawColor(...MID);
  doc.setLineWidth(0.2);
  doc.line(ML + 4, y, PW - MR - 4, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text('PAYMENT METHOD', ML + 4, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod, ML + 4, y);
  y += 12;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Agreement & Signature — always starts on a fresh page
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum.n++;
  drawPageHeader();

  sectionHeader('04 · Student Agreement & Signature', pageNum);

  // Policy summary box — tall enough to contain all sections including Q&G
  checkPage(120, pageNum);
  doc.setFillColor(...LIGHT);
  doc.rect(ML, y, CW, 115, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML, y + 115);   // left gold accent bar
  y += 5;

  const policyLines = [
    'STUDENT\'S RIGHT TO CANCEL',
    'The student has the right to cancel this enrollment agreement and obtain a refund',
    'by providing written notice to Ameristar School, P.O. Box 1143, San Gabriel, CA 91778.',
    '',
    'REFUND POLICY',
    'Cancellation must be made within seven (7) business days of the enrollment date by',
    'certified mail. All course materials must be returned. A $35.00 registration fee is',
    'non-refundable. Once the seven-day period has passed, no refund will be issued.',
    '',
    'TRANSFERABILITY OF CREDITS',
    'Transfer of credits is at the complete discretion of the receiving institution.',
    '',
    'STUDENT TUITION RECOVERY FUND (STRF)',
    'California\'s STRF fund protects students against losses from institutional failure.',
    '',
    'EXAM PASSAGE',
    'Completion does not guarantee exam passage. Passing thresholds are set by state agencies.',
    '',
    'QUESTIONS & GRIEVANCES',
    'Bureau for Private Postsecondary Education (BPPE) · www.bppe.ca.gov · (916) 574-8900',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...DARK);
  policyLines.forEach(line => {
    if (line === '') { y += 2; return; }
    if (
      line.includes('CANCEL') || line.includes('REFUND POLICY') ||
      line.includes('TRANSFER') || line.includes('STRF') ||
      line.includes('EXAM') || line.includes('QUESTIONS')
    ) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...NAVY);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(...DARK);
    }
    doc.text(line, ML + 5, y);
    y += 4.5;
  });
  y += 8;

  // Acknowledgement checkbox — gold fill + manually drawn black checkmark
  checkPage(10, pageNum);
  doc.setFillColor(...GOLD);
  doc.rect(ML, y - 3, 4, 4, 'F');
  // Draw checkmark with two line segments (unicode ✓ doesn't render in helvetica)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7);
  doc.line(ML + 0.8, y - 0.8, ML + 1.8, y + 0.3);   // short left downstroke
  doc.line(ML + 1.8, y + 0.3, ML + 3.4, y - 2.0);   // long right upstroke
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('I have read and agree to all terms, conditions, and refund policies above.', ML + 7, y);
  y += 10;

  // Signature + Date row
  checkPage(22, pageNum);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text('STUDENT SIGNATURE', ML, y);
  doc.text('DATE', ML + CW * 0.65, y);
  y += 4;

  // Signature value in serif-style italic
  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(data.signature || '—', ML, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(data.date, ML + CW * 0.65, y + 3);

  // Underlines
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.4);
  doc.line(ML, y + 7, ML + CW * 0.58, y + 7);
  doc.line(ML + CW * 0.65, y + 7, PW - MR, y + 7);
  y += 16;

  // School acceptance block
  checkPage(20, pageNum);
  doc.setFillColor(...LIGHT);
  doc.rect(ML, y, CW, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text('SCHOOL AUTHORIZED REPRESENTATIVE', ML + 4, y + 5);
  doc.text('DATE ACCEPTED', ML + CW * 0.65, y + 5);
  doc.setDrawColor(...MID);
  doc.setLineWidth(0.3);
  doc.line(ML + 4, y + 13, ML + CW * 0.58, y + 13);
  doc.line(ML + CW * 0.65, y + 13, PW - MR - 4, y + 13);
  y += 20;

  // ── Final page footer(s) ──────────────────────────────────────────────────
  const totalPages = pageNum.n;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(p, totalPages);
  }

  return doc;
}
