interface Doctor {
    id: string;
    name: string;
    specialization: string;
    avg_consultation_minutes?: number;
}

interface AssignmentResult {
    specialization: string;
    emergency: boolean;
    priorityLevel: "low" | "medium" | "high";
}

/**
 * Detect medical specialization from symptoms.
 * Advanced multi-keyword matching system.
 */
export function analyzeSymptoms(symptoms: string): AssignmentResult {
    const text = symptoms.toLowerCase();

    // EMERGENCY DETECTION
    const emergencyKeywords = [
        "chest pain",
        "heart attack",
        "stroke",
        "unconscious",
        "severe bleeding",
        "breathing problem",
        "difficulty breathing",
        "accident",
        "seizure",
        "suicide",
        "fainted",
        "blood vomiting",
        "high fever with fits",
        "critical",
        "emergency",
    ];

    const isEmergency = emergencyKeywords.some(keyword =>
        text.includes(keyword)
    );

    // SPECIALIZATION MATCHING
    const specializationMap: Record<string, string[]> = {
        Cardiology: [
            "chest pain",
            "heart",
            "bp",
            "blood pressure",
            "palpitations",
        ],

        Neurology: [
            "headache",
            "migraine",
            "brain",
            "stroke",
            "dizziness",
            "seizure",
        ],

        Orthopedics: [
            "bone",
            "joint",
            "leg pain",
            "back pain",
            "fracture",
            "knee pain",
        ],

        Dermatology: [
            "skin",
            "rash",
            "allergy",
            "itching",
            "acne",
            "eczema",
        ],

        ENT: [
            "ear",
            "nose",
            "throat",
            "sinus",
            "tonsil",
            "hearing",
        ],

        Pediatrics: [
            "child",
            "baby",
            "kid",
            "infant",
            "vaccination",
        ],

        Gynecology: [
            "pregnancy",
            "period",
            "menstrual",
            "pcod",
            "women",
        ],

        Psychiatry: [
            "anxiety",
            "stress",
            "depression",
            "mental",
            "panic",
        ],

        "General Surgery": [
            "appendix",
            "surgery",
            "hernia",
            "operation",
        ],

        "General Medicine": [
            "fever",
            "cold",
            "cough",
            "infection",
            "weakness",
            "vomiting",
        ],
    };


    let bestSpecialization = "General Medicine";
    let bestScore = 0;

    for (const [specialization, keywords] of Object.entries(specializationMap)) {
        let score = 0;

        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                score++;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestSpecialization = specialization;
        }
    }

    let priorityLevel: "low" | "medium" | "high" = "low";

    if (isEmergency) {
        priorityLevel = "high";
    } else if (bestScore >= 2) {
        priorityLevel = "medium";
    }

    return {
        specialization: bestSpecialization,
        emergency: isEmergency,
        priorityLevel,
    };
}

/**
 * Select best doctor from available doctors.
 */
export function assignDoctor(
    doctors: Doctor[],
    specialization: string
): Doctor | null {
    const matchingDoctors = doctors.filter(
        doctor =>
            doctor.specialization?.toLowerCase() ===
            specialization.toLowerCase()
    );

    if (matchingDoctors.length === 0) {
        return doctors[0] || null;
    }

    if (matchingDoctors.length > 0) {
        return matchingDoctors[0];
    }

    // FALLBACK TO ANY AVAILABLE DOCTOR
    return doctors[0] || null;
}