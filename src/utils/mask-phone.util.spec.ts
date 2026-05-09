import { maskPhone } from './mask-phone.util';

describe('maskPhone', () => {
	it('masque un numero francais au format +33***1234', () => {
		expect(maskPhone('+33612341234')).toBe('+33***1234');
	});

	it('masque un numero international en gardant prefixe et 4 derniers chiffres', () => {
		expect(maskPhone('+14155551234')).toBe('+14***1234');
	});

	it('renvoie null si phone est null', () => {
		expect(maskPhone(null)).toBeNull();
	});

	it('renvoie null si phone est undefined', () => {
		expect(maskPhone(undefined)).toBeNull();
	});

	it('renvoie null si phone est trop court (< 7 caracteres)', () => {
		expect(maskPhone('+12345')).toBeNull();
	});

	it('renvoie null si phone est une chaine vide', () => {
		expect(maskPhone('')).toBeNull();
	});
});
