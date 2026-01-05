import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Welcome email HTML template
function getWelcomeEmailHTML(email) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">
                Welcome to BLSSM! ✨
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Thanks for subscribing to our newsletter! You're now part of our community.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4b5563;">
                We'll keep you updated with the latest news, updates, and exclusive content delivered straight to your inbox.
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Stay tuned for great things ahead!
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #9ca3af; text-align: center;">
                You're receiving this because you signed up at our website.
              </p>
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
        return res.status(500).json({ error: 'Failed to add subscriber' });
      }
    }

    // Send welcome email
    if (fromEmail) {
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Welcome to BLSSM! 🎉',
        html: getWelcomeEmailHTML(email),
      });

      if (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the whole request if welcome email fails
        // The contact was still added successfully
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed!' 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

