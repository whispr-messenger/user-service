/**
 * Masque un numero de telephone pour affichage public.
 * Garde le prefixe (3 premiers caracteres) et les 4 derniers chiffres.
 * Ex: +33612341234 -> +33***1234
 *
 * Sert de fallback display pour les users sans username/firstName,
 * pour eviter le placeholder "Utilisateur" cote mobile.
 */
export function maskPhone(phone: string | null | undefined): string | null {
	if (!phone || phone.length < 7) return null;
	return `${phone.slice(0, 3)}***${phone.slice(-4)}`;
}
