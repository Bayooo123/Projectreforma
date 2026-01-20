/**
 * centralize lawyer identity via email-backed profiles
 */

export interface FirmLawyer {
    name: string;
    email: string;
}

export const ASCOLP_LAWYERS: FirmLawyer[] = [
    { name: "Professor Abiola Sanni, SAN", email: "Asanni@abiolasanniandco.com" },
    { name: "Professor Friday Ndubuisi", email: "fndubuisi@abiolasanniandco.com" },
    { name: "Kola Abdulsalam", email: "kabdulsalam@abiolasanniandco.com" },
    { name: "Iniobong Inieke Umoh", email: "iumoh@abiolasanniandco.com" },
    { name: "Josephine Riwo Ogbinaka", email: "jogbinaka@abiolasanniandco.com" },
    { name: "Omowumi Adeoye", email: "oadeoye@abiolasanniandco.com" },
    { name: "Maureen Omaegbu", email: "momaegbu@abiolasanniandco.com" },
    { name: "Adeola Adeoye", email: "aadeoye@abiolasanniandco.com" },
    { name: "Benjamin Adeyanju", email: "badeyanju@abiolasanniandco.com" },
    { name: "Adebayo Gbadebo", email: "agbadebo@abiolasanniandco.com" }
];

export function resolveLawyerByEmail(email: string): FirmLawyer | undefined {
    return ASCOLP_LAWYERS.find(l => l.email.toLowerCase() === email.toLowerCase());
}

export function isFirmLawyer(email: string): boolean {
    return ASCOLP_LAWYERS.some(l => l.email.toLowerCase() === email.toLowerCase());
}
