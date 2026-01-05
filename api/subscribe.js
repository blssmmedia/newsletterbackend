import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Welcome email HTML template
function getWelcomeEmailHTML(email) {
  // TODO: Replace with your hosted logo URL
  const logoUrl = process.env.LOGO_URL || 'https://newsletterbackend.vercel.app/blssm_logo.png';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link href="https://fonts.cdnfonts.com/css/geist" rel="stylesheet">
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding-left: 24px !important; padding-right: 24px !important; }
      .main-heading { font-size: 52px !important; letter-spacing: -2px !important; }
      .body-text { font-size: 16px !important; }
      .logo { width: 120px !important; }
      .footer-text { font-size: 10px !important; letter-spacing: 1px !important; }
      .outer-padding { padding: 24px 12px !important; }
    }
    @media only screen and (max-width: 400px) {
      .main-heading { font-size: 40px !important; letter-spacing: -1px !important; }
      .body-text { font-size: 15px !important; }
      .content-padding { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6;">
    <tr>
      <td align="center" class="outer-padding" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 600px; background-color: #FAF9F6;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 20px 0 40px;">
              <img src="${logoUrl}" alt="BLSSM" width="180" class="logo" style="display: block; max-width: 100%; height: auto;" />
            </td>
          </tr>
          
          <!-- Main Heading -->
          <tr>
            <td class="content-padding" style="padding: 0 40px;">
              <h1 class="main-heading" style="margin: 0 0 30px 0; font-family: 'Zalando Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 95px; font-weight: 300; line-height: 0.8; color: #630111; text-transform: uppercase; letter-spacing: -3px;">
                WELCOME<br> TO OUR <span style="font-weight: 800; display: inline-block;">NEWSLETTER</span>
              </h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td class="content-padding" style="padding: 0 40px 60px;">
              <p class="body-text" style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 19px; line-height: 1.65; color: #630111;">
                We're so excited to have you as part of our community. You'll be the first to get trend alerts, exclusive UGC opportunities, and everything you need to scale your socials faster than ever.
              </p>
            </td>
          </tr>
          
          <!-- Footer Divider -->
          <tr>
            <td class="content-padding" style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="footer-text" style="font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 500; color: #630111; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 20px; white-space: nowrap;">
                    WELCOME
                  </td>
                  <td style="padding: 0 15px 20px; width: 100%;">
                    <div style="height: 1px; background-color: #630111; width: 100%;"></div>
                  </td>
                  <td class="footer-text" style="font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 500; color: #630111; text-transform: uppercase; letter-spacing: 2px; text-align: right; padding-bottom: 20px; white-space: nowrap;">
                    NEWSLETTER
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    // Framer sends form data with field names as keys
    // Common field names: "email", "Email", "email-address", etc.
    const email = body.email || body.Email || body['email-address'] || body.emailAddress;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        received: Object.keys(body)
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const fromEmail = process.env.FROM_EMAIL;

    if (!audienceId) {
      console.error('RESEND_AUDIENCE_ID not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Add contact to Resend audience
    const { data: contactData, error: contactError } = await resend.contacts.create({
      email: email,
      audienceId: audienceId,
      unsubscribed: false,
    });

    if (contactError) {
      // If contact already exists, that's okay - continue to send welcome email
      if (!contactError.message?.includes('already exists')) {
        console.error('Error adding contact:', contactError);
        return res.status(500).json({ 
          error: 'Failed to add subscriber',
          details: contactError.message || contactError.name || JSON.stringify(contactError)
        });
      }
    }

    // Send welcome email
    let emailStatus = 'skipped';
    let emailErrorDetails = null;
    
    if (fromEmail) {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Welcome to BLSSM! 🎉',
        html: getWelcomeEmailHTML(email),
      });

      if (emailError) {
        console.error('Error sending welcome email:', emailError);
        emailStatus = 'failed';
        emailErrorDetails = emailError.message || JSON.stringify(emailError);
      } else {
        emailStatus = 'sent';
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed!',
      welcomeEmail: emailStatus,
      emailError: emailErrorDetails
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message || String(error)
    });
  }
}

