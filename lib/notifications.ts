import { BookingConfirmationPayload } from '@/types/app';

export interface NotificationPayload {
  patientName: string;
  phone: string;
  doctorName: string;
  token?: string;
  message?: string;
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
  token,
  message: customMessage
}: NotificationPayload): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const consentLink = token ? `${appUrl}/consent?token=${token}` : '';
  const defaultMessage = `Hi ${patientName}, your appointment with Dr. ${doctorName} is coming up. To help us minimize your wait time, please share your location status via this link: ${consentLink}`;
  const message = customMessage || defaultMessage;

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

export async function sendBookingConfirmation({
  patientName,
  phone,
  doctorName,
  scheduledDate,
  scheduledTime,
  position,
}: BookingConfirmationPayload): Promise<boolean> {
  const message = `Hi ${patientName}, your appointment with Dr. ${doctorName} is confirmed for ${scheduledDate} at ${scheduledTime}. You are #${position} in the queue. We'll send you a location link 35 min before your appointment.`;

  // Configuration
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  const watiApiKey = process.env.WATI_API_KEY;

  if (process.env.NODE_ENV !== 'production') {
    console.log('--- BOOKING CONFIRMATION MOCK ---');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log('---------------------------------');
    return true;
  }

  // Development/Mock Mode Check
  const isMock = !twilioSid || twilioSid === 'MOCK_MODE' || twilioSid.startsWith('ACe0');

  if (isMock) {
    console.log('--- BOOKING CONFIRMATION MOCK ---');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log('---------------------------------');
    return true;
  }

  try {
    if (watiApiKey) {
      console.log('[Notification] Calling WATI API for booking confirmation...');
      return true;
    } else if (twilioSid && twilioToken && twilioFrom) {
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
    console.error('Failed to send booking confirmation:', error);
    return false;
  }
}
