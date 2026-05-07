/**
 * Fetches the estimated time of arrival (ETA) in seconds using the Google Maps Distance Matrix API.
 * 
 * @param patientLat Latitude of the patient's current location.
 * @param patientLng Longitude of the patient's current location.
 * @returns The estimated duration in traffic in seconds, or null if there's an error.
 */
export async function getEtaSeconds(patientLat: number, patientLng: number): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const hospitalLat = process.env.HOSPITAL_LAT;
  const hospitalLng = process.env.HOSPITAL_LNG;

  if (!apiKey || !hospitalLat || !hospitalLng) {
    console.error('Google Maps configuration is missing (API Key or Hospital Coordinates)');
    return null;
  }

  // Handle mock mode for development
  if (apiKey === 'MOCK_MODE') {
    console.log('[ETA MOCK] Calculating mock ETA for:', { patientLat, patientLng });
    // Return a random value between 5 minutes (300s) and 45 minutes (2700s)
    return Math.floor(Math.random() * (2700 - 300 + 1)) + 300;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', `${patientLat},${patientLng}`);
    url.searchParams.append('destinations', `${hospitalLat},${hospitalLng}`);
    url.searchParams.append('departure_time', 'now');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Google Maps API responded with status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Maps Distance Matrix API Error:', data.status, data.error_message || '');
      return null;
    }

    const element = data.rows[0]?.elements[0];

    if (!element || element.status !== 'OK') {
      console.error('Google Maps element error status:', element?.status || 'Missing element');
      return null;
    }

    // Return duration_in_traffic if available, otherwise fallback to standard duration
    // duration_in_traffic is only available if departure_time is set (which it is)
    return element.duration_in_traffic?.value ?? element.duration?.value ?? null;

  } catch (error) {
    console.error('Failed to call Google Maps Distance Matrix API:', error);
    return null;
  }
}
