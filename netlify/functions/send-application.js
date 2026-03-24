import nodemailer from 'nodemailer';

const LOCAL_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8888', // netlify dev default
]);

function buildCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
  };
  // If Origin is missing (server-to-server/curl), don't block.
  if (!origin) return headers;

  headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function isOriginAllowed(origin, host) {
  // If a browser calls this, Origin will be present. If it's missing, it's not a browser CORS context.
  if (!origin) return true;

  // Same-origin requests from the current deployed host (covers custom domains + *.netlify.app + deploy previews)
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) return true;

  // Local dev origins
  if (LOCAL_ALLOWED_ORIGINS.has(origin)) return true;

  // Optional allowlist via env var (comma-separated)
  const envAllow = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (envAllow.includes(origin)) return true;

  return false;
}

function toPdfBuffer(pdfBase64) {
  if (!pdfBase64 || typeof pdfBase64 !== 'string') return null;

  // Accept either raw base64 or a full data URI
  const raw = pdfBase64.includes(',') ? pdfBase64.split(',').pop() : pdfBase64;
  const buf = Buffer.from(raw || '', 'base64');

  // Basic PDF signature check: "%PDF-"
  if (buf.length < 5) return null;
  const sig = buf.slice(0, 5).toString('utf8');
  if (sig !== '%PDF-') return null;

  return buf;
}

export const handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const host = event.headers?.host || '';
  const corsHeaders = buildCorsHeaders(origin);

  if (!isOriginAllowed(origin, host)) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden: Invalid Origin' }),
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { pdfBase64, studentEmail, studentName, fileName } = body;

    const pdfBuffer = toPdfBuffer(pdfBase64);
    if (!pdfBuffer) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid or missing PDF data.' }),
      };
    }

    // Env var validation (more helpful than a generic 500)
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const DESTINATION_EMAIL = process.env.DESTINATION_EMAIL;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !DESTINATION_EMAIL) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Server email settings are missing. Check Netlify environment variables.',
        }),
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const safeFilename = (typeof fileName === 'string' && fileName.trim())
      ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      : 'Ameristar_Application.pdf';

    const replyTo = (typeof studentEmail === 'string' && studentEmail.includes('@'))
      ? studentEmail
      : undefined;

    await transporter.sendMail({
      from: GMAIL_USER,
      to: DESTINATION_EMAIL,
      replyTo,
      subject: `New Course Enrollment Application${studentName ? ` — ${studentName}` : ''}`,
      text:
        'A new enrollment application has been submitted from the website. The attached PDF contains the completed enrollment form.',
      attachments: [
        {
          filename: safeFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Application sent successfully.' }),
    };
  } catch (err) {
    console.error('send-application error:', err);
    const debug = (process.env.DEBUG_ERRORS || '').toLowerCase() === 'true';
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: debug ? String(err?.message || err) : 'Internal Server Error',
      }),
    };
  }
};
