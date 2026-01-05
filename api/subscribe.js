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
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Source+Sans+Pro:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FAF9F6;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 20px 0 40px;">
              <img src="${logoUrl}" alt="BLSSM" width="80" style="display: block;" />
            </td>
          </tr>
          
          <!-- Main Heading -->
          <tr>
            <td style="padding: 0 40px;">
              <h1 style="margin: 0; font-family: 'Oswald', 'Arial Narrow', Impact, sans-serif; font-size: 52px; font-weight: 700; line-height: 1.0; color: #630111; text-transform: uppercase; letter-spacing: -1px;">
                WELCOME<br>TO OUR
              </h1>
              <h1 style="margin: 0 0 30px 0; font-family: 'Oswald', 'Arial Narrow', Impact, sans-serif; font-size: 52px; font-weight: 700; line-height: 1.0; color: #630111; text-transform: uppercase; letter-spacing: -1px;">
                NEWSLETTER
              </h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td style="padding: 0 40px 60px;">
              <p style="margin: 0; font-family: 'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 18px; line-height: 1.6; color: #630111;">
                We're so excited to have you<br>
                as part of our community.<br>
                You'll be the first to get trend alerts,<br>
                exclusive UGC opportunities,<br>
                and everything you need to scale<br>
                your socials faster than ever.
              </p>
            </td>
          </tr>
          
          <!-- Footer Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family: 'Oswald', 'Arial Narrow', Impact, sans-serif; font-size: 12px; font-weight: 500; color: #630111; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 20px;">
                    WELCOME
                  </td>
                  <td style="padding: 0 15px 20px;">
                    <div style="height: 1px; background-color: #630111; width: 100%;"></div>
                  </td>
                  <td style="font-family: 'Oswald', 'Arial Narrow', Impact, sans-serif; font-size: 12px; font-weight: 500; color: #630111; text-transform: uppercase; letter-spacing: 1px; text-align: right; padding-bottom: 20px;">
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

