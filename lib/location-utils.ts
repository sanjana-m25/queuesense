/**
 * Detect if patient is considered arrived
 */

export function detectArrival(
    etaMinutes: number
) {

    /*
    If ETA <= 3 mins,
    consider patient arrived
    */

    return etaMinutes <= 3;
}