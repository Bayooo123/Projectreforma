/**
 * centralize lawyer identity via email-backed profiles
 */

export interface FirmLawyer {
    name: string;
    email: string;
    designation?: string;
}

export const ASCOLP_LAWYERS: FirmLawyer[] = [
    { name: "Professor Abiola Sanni, SAN", email: "Asanni@abiolasanniandco.com", designation: "Managing Partner" },
    { name: "Professor Friday Ndubuisi", email: "fndubuisi@abiolasanniandco.com", designation: "Partner" },
    { name: "Kola Abdulsalam", email: "kola@abiolasanniandco.com", designation: "Head of Chambers" },
    { name: "Iniobong Inieke Umoh", email: "iniobong@abiolasanniandco.com", designation: "Deputy Head of Chambers" },
    { name: "Josephine Riwo Ogbinaka", email: "Riwo@abiolasanniandco.com", designation: "Associate" },
    { name: "Omowumi Adeoye", email: "omowumi@abiolasanniandco.com", designation: "Associate" },
    { name: "Maureen Omaegbu", email: "maureen@abiolasanniandco.com", designation: "Associate" },
    { name: "Adeola Adeoye", email: "ade@abiolasanniandco.com", designation: "Associate" },
    { name: "Benjamin Adeyanju", email: "ben@abiolasanniandco.com", designation: "Associate" },
    { name: "Adebayo Gbadebo", email: "bayo@abiolasanniandco.com", designation: "Associate" },
    { name: "Deji Popoola", email: "deji@abiolasanniandco.com", designation: "Head of IT" }
];

export function resolveLawyerByEmail(email: string): FirmLawyer | undefined {
    return ASCOLP_LAWYERS.find(l => l.email.toLowerCase() === email.toLowerCase());
}

export function isFirmLawyer(email: string): boolean {
    return ASCOLP_LAWYERS.some(l => l.email.toLowerCase() === email.toLowerCase());
}
