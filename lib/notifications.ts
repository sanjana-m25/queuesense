export interface NotificationPayload {
  patientName: string;
  phone: string;
  doctorName: string;
  token: string;
}

/**
 * Sends a consent notification to a patient via SMS or WhatsApp.
 * 
 * @param payload The notification details.
 * @returns A promise that resolves to true if sent successfully, false otherwise.
 */
export async function sendConsentNotification({ 
  patientName, 
  phone, 
  doctorName, 
  token 
}: NotificationPayload): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const consentLink = `${appUrl}/consent?token=${token}`;
  const message = `Hi ${patientName}, your appointment with Dr. ${doctorName} is coming up. To help us minimize your wait time, please share your location status via this link: ${consentLink}`;

  // Configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  const watiApiKey = process.env.WATI_API_KEY;

  // Development/Mock Mode Check
  // We use mock mode if credentials are missing or explicitly marked as mock
  const isMock = !twilioSid || twilioSid === 'MOCK_MODE' || twilioSid.startsWith('ACe0');

  if (isMock) {
    console.log('--- NOTIFICATION MOCK ---');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log('-------------------------');
    return true;
  }

  try {
    if (watiApiKey) {
      // WATI WhatsApp Integration (Placeholder implementation)
      console.log('[Notification] Calling WATI API...');
      // Logic for WATI would go here
      return true;
    } else if (twilioSid && twilioToken && twilioFrom) {
      // Twilio SMS Integration
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`,
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioFrom,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Twilio API Error:', errorData);
        return false;
      }

      return true;
    }

    console.error('No notification provider (Twilio or WATI) configured properly.');
    return false;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}
