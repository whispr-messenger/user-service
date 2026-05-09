import * as jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { setTimeout as delay } from 'node:timers/promises';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppModule } from '../src/modules/app.module';
import { JwksService } from '../src/modules/jwt-auth/jwks.service';
import { JwtStrategy, JwtPayload } from '../src/modules/jwt-auth/jwt.strategy';
import { DataSource } from 'typeorm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

const JWT_SECRET = 'test-e2e-secret';
const JWT_ISSUER = 'test-issuer';
const JWT_AUDIENCE = 'test-audience';
const INTERNAL_TOKEN = 'test-internal-token';
const USER_A_ID = 'a0000000-0000-4000-a000-000000000001';
const USER_B_ID = 'b0000000-0000-4000-b000-000000000002';

function makeToken(userId: string): string {
	return jwt.sign({ sub: userId }, JWT_SECRET, {
		issuer: JWT_ISSUER,
		audience: JWT_AUDIENCE,
		expiresIn: '1h',
	});
}

class TestJwtStrategy extends PassportStrategy(Strategy) {
	constructor() {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: JWT_SECRET,
			issuer: JWT_ISSUER,
			audience: JWT_AUDIENCE,
			algorithms: ['HS256'],
		});
	}

	async validate(payload: JwtPayload): Promise<JwtPayload> {
		return payload;
	}
}

describe('Functional E2E Scenarios', () => {
	let app: INestApplication;
	let dataSource: DataSource;
	let previousInternalToken: string | undefined;

	beforeAll(async () => {
		previousInternalToken = process.env.INTERNAL_API_TOKEN;
		process.env.INTERNAL_API_TOKEN = INTERNAL_TOKEN;
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(JwksService)
			.useValue({
				isReady: true,
				onModuleInit: () => {},
				getSecretProvider:
					() => (_req: unknown, _raw: unknown, done: (err: unknown, secret?: unknown) => void) =>
						done(null, JWT_SECRET),
			})
			.overrideProvider(JwtStrategy)
			.useClass(TestJwtStrategy)
			.compile();

		app = moduleFixture.createNestApplication();
		app.setGlobalPrefix('user', {
			exclude: [{ path: 'internal/(.*)', method: RequestMethod.ALL }],
		});
		app.enableVersioning({
			type: VersioningType.URI,
			defaultVersion: '1',
			prefix: 'v',
		});
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			})
		);
		await app.init();

		dataSource = moduleFixture.get(DataSource);
	});

	afterAll(async () => {
		if (app) await app.close();
		if (previousInternalToken === undefined) {
			delete process.env.INTERNAL_API_TOKEN;
		} else {
			process.env.INTERNAL_API_TOKEN = previousInternalToken;
		}
	});

	beforeEach(async () => {
		// Clean test data
		const queryRunner = dataSource.createQueryRunner();
		await queryRunner.connect();
		try {
			await queryRunner.query(`DELETE FROM "users"."contact_requests"`);
			await queryRunner.query(`DELETE FROM "users"."contacts"`);
			await queryRunner.query(`DELETE FROM "users"."blocked_users"`);
			await queryRunner.query(`DELETE FROM "users"."privacy_settings"`);
			await queryRunner.query(`DELETE FROM "users"."groups"`);
			await queryRunner.query(`DELETE FROM "users"."users"`);
		} finally {
			await queryRunner.release();
		}
	});

	async function createUser(id: string, phone: string, username?: string): Promise<void> {
		const queryRunner = dataSource.createQueryRunner();
		await queryRunner.connect();
		try {
			await queryRunner.query(
				`INSERT INTO "users"."users" ("id", "phoneNumber", "username", "isActive") VALUES ($1, $2, $3, true)`,
				[id, phone, username ?? null]
			);
		} finally {
			await queryRunner.release();
		}
	}

	function asUser(userId: string) {
		return { Authorization: `Bearer ${makeToken(userId)}` };
	}

	// Scenario 1: GET /profile/:id returns user profile
	describe('Scenario 1: Get own profile', () => {
		it('should return 200 with user profile data', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const res = await request(app.getHttpServer())
				.get(`/user/v1/profile/${USER_A_ID}`)
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(res.body.id).toBe(USER_A_ID);
			expect(res.body.username).toBe('alice');
		});
	});

	// Scenario 1b: GET /profile/me returns authenticated profile with phoneNumber
	describe('Scenario 1b: Get own profile via /profile/me', () => {
		it('should return 200 with phoneNumber for the authenticated user', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const res = await request(app.getHttpServer())
				.get('/user/v1/profile/me')
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(res.body.id).toBe(USER_A_ID);
			expect(res.body.phoneNumber).toBe('+33600000001');
			expect(res.body.username).toBe('alice');
		});

		it('should return 401 without a bearer token', async () => {
			await request(app.getHttpServer()).get('/user/v1/profile/me').expect(401);
		});
	});

	// Scenario 2: PATCH /profile/:id of another user returns 403
	describe('Scenario 2: Cannot update another user profile', () => {
		it('should return 403 when updating another user profile', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			const res = await request(app.getHttpServer())
				.patch(`/user/v1/profile/${USER_B_ID}`)
				.set(asUser(USER_A_ID))
				.send({ username: 'hacked' })
				.expect(403);

			expect(res.status).toBe(403);
			expect(res.body.message).toBeDefined();
		});
	});

	// Scenario 3: Contact request flow
	describe('Scenario 3: Contact request flow (send -> accept -> two contacts)', () => {
		it('should complete the full contact request lifecycle', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			// User A sends request to User B
			const sendRes = await request(app.getHttpServer())
				.post('/user/v1/contact-requests')
				.set(asUser(USER_A_ID))
				.send({ contactId: USER_B_ID })
				.expect(201);

			const requestId = sendRes.body.id;
			expect(sendRes.body.requesterId).toBe(USER_A_ID);
			expect(sendRes.body.recipientId).toBe(USER_B_ID);
			expect(sendRes.body.status).toBe('pending');

			// User B accepts the request
			const acceptRes = await request(app.getHttpServer())
				.patch(`/user/v1/contact-requests/${requestId}/accept`)
				.set(asUser(USER_B_ID))
				.expect(200);

			expect(acceptRes.body.status).toBe('accepted');

			// Both users now have each other as contacts
			const contactsA = await request(app.getHttpServer())
				.get('/user/v1/contacts')
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(contactsA.body.data).toBeInstanceOf(Array);
			expect(contactsA.body.data).toHaveLength(1);
			expect(contactsA.body.data[0].contactId).toBe(USER_B_ID);

			const contactsB = await request(app.getHttpServer())
				.get('/user/v1/contacts')
				.set(asUser(USER_B_ID))
				.expect(200);

			expect(contactsB.body.data).toBeInstanceOf(Array);
			expect(contactsB.body.data).toHaveLength(1);
			expect(contactsB.body.data[0].contactId).toBe(USER_A_ID);
		});
	});

	// Scenario 4: Blocking a user and retrieving the blocked users list
	describe('Scenario 4: Blocking a user and retrieving the blocked users list', () => {
		it('should block a user and list them in the blocked users', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			// User A blocks User B
			const blockRes = await request(app.getHttpServer())
				.post('/user/v1/blocked-users')
				.set(asUser(USER_A_ID))
				.send({ blockedId: USER_B_ID })
				.expect(201);

			expect(blockRes.body.blockerId).toBe(USER_A_ID);
			expect(blockRes.body.blockedId).toBe(USER_B_ID);

			// Verify blocked users list
			const blockedList = await request(app.getHttpServer())
				.get('/user/v1/blocked-users')
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(blockedList.body.data).toBeInstanceOf(Array);
			expect(blockedList.body.data).toHaveLength(1);
			expect(blockedList.body.data[0].blockedId).toBe(USER_B_ID);
		});
	});

	// Scenario 5: Privacy settings management
	describe('Scenario 5: Privacy settings CRUD', () => {
		it('should create default privacy settings and allow updates', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			// Get privacy settings (service creates defaults automatically)
			const getRes = await request(app.getHttpServer())
				.get('/user/v1/privacy')
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(getRes.body.userId).toBe(USER_A_ID);
			expect(getRes.body.searchByPhone).toBe(true);

			// Update privacy settings
			const patchRes = await request(app.getHttpServer())
				.patch('/user/v1/privacy')
				.set(asUser(USER_A_ID))
				.send({ searchByPhone: false })
				.expect(200);

			expect(patchRes.body.searchByPhone).toBe(false);

			// Verify persistence with a follow-up GET
			const verifyRes = await request(app.getHttpServer())
				.get('/user/v1/privacy')
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(verifyRes.body.searchByPhone).toBe(false);
		});
	});

	// Scenario 6: Internal contact-check endpoint (machine-to-machine)
	describe('Scenario 6: Internal /internal/v1/contacts/check (M2M)', () => {
		const internalHeader = { 'x-internal-token': INTERNAL_TOKEN };

		it('returns isContact:true and isBlocked:false for an existing contact relationship', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			// Establish the contact relationship through the public flow
			const sendRes = await request(app.getHttpServer())
				.post('/user/v1/contact-requests')
				.set(asUser(USER_A_ID))
				.send({ contactId: USER_B_ID })
				.expect(201);

			await request(app.getHttpServer())
				.patch(`/user/v1/contact-requests/${sendRes.body.id}/accept`)
				.set(asUser(USER_B_ID))
				.expect(200);

			const res = await request(app.getHttpServer())
				.get(`/internal/v1/contacts/check?ownerId=${USER_A_ID}&contactId=${USER_B_ID}`)
				.set(internalHeader)
				.expect(200);

			expect(res.body).toEqual({ isContact: true, isBlocked: false });
		});

		it('returns 200 with isContact:false when no contact row exists', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			const res = await request(app.getHttpServer())
				.get(`/internal/v1/contacts/check?ownerId=${USER_A_ID}&contactId=${USER_B_ID}`)
				.set(internalHeader)
				.expect(200);

			expect(res.body).toEqual({ isContact: false, isBlocked: false });
		});

		it('returns 401 when the internal token header is missing', async () => {
			await request(app.getHttpServer())
				.get(`/internal/v1/contacts/check?ownerId=${USER_A_ID}&contactId=${USER_B_ID}`)
				.expect(401);
		});

		it('returns 400 when ownerId is not a UUID', async () => {
			await request(app.getHttpServer())
				.get(`/internal/v1/contacts/check?ownerId=not-a-uuid&contactId=${USER_B_ID}`)
				.set(internalHeader)
				.expect(400);
		});
	});

	// Scenario 6b: Internal privacy lookup endpoint (machine-to-machine)
	describe('Scenario 6b: Internal /internal/v1/users/:id/privacy (M2M)', () => {
		const internalHeader = { 'x-internal-token': INTERNAL_TOKEN };

		it('returns the privacy DTO with defaults when no settings row was created yet', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const res = await request(app.getHttpServer())
				.get(`/internal/v1/users/${USER_A_ID}/privacy`)
				.set(internalHeader)
				.expect(200);

			expect(res.body).toEqual({
				userId: USER_A_ID,
				readReceipts: true,
				lastSeenPrivacy: 'contacts',
				onlineStatus: 'contacts',
			});
		});

		it('reflects the user-updated privacy settings', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			await request(app.getHttpServer())
				.patch('/user/v1/privacy')
				.set(asUser(USER_A_ID))
				.send({ readReceipts: false, onlineStatus: 'nobody' })
				.expect(200);

			const res = await request(app.getHttpServer())
				.get(`/internal/v1/users/${USER_A_ID}/privacy`)
				.set(internalHeader)
				.expect(200);

			expect(res.body.userId).toBe(USER_A_ID);
			expect(res.body.readReceipts).toBe(false);
			expect(res.body.onlineStatus).toBe('nobody');
		});

		it('returns 401 when the internal token header is missing', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			await request(app.getHttpServer()).get(`/internal/v1/users/${USER_A_ID}/privacy`).expect(401);
		});

		it('returns 404 when the user does not exist', async () => {
			await request(app.getHttpServer())
				.get(`/internal/v1/users/${USER_A_ID}/privacy`)
				.set(internalHeader)
				.expect(404);
		});

		it('returns 400 when the id is not a UUID', async () => {
			await request(app.getHttpServer())
				.get(`/internal/v1/users/not-a-uuid/privacy`)
				.set(internalHeader)
				.expect(400);
		});
	});

	// Scenario 7: Search endpoints return a JSON envelope { user } even when no user matches
	describe('Scenario 7: GET /search/{username,phone} envelope response', () => {
		it('returns { user: null } as valid JSON when no username matches', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const res = await request(app.getHttpServer())
				.get('/user/v1/search/username?username=does-not-exist')
				.set(asUser(USER_A_ID))
				.expect(200)
				.expect('Content-Type', /application\/json/);

			expect(res.body).toEqual({ user: null });
			expect(res.text.length).toBeGreaterThan(0);
		});

		it('returns { user: null } as valid JSON when no phone number matches', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const res = await request(app.getHttpServer())
				.get('/user/v1/search/phone?phoneNumber=%2B33699999999')
				.set(asUser(USER_A_ID))
				.expect(200)
				.expect('Content-Type', /application\/json/);

			expect(res.body).toEqual({ user: null });
			expect(res.text.length).toBeGreaterThan(0);
		});

		it('wraps the matched user in { user } when username search succeeds', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			const res = await request(app.getHttpServer())
				.get('/user/v1/search/username?username=bob')
				.set(asUser(USER_A_ID))
				.expect(200);

			expect(res.body.user).toBeDefined();
			expect(res.body.user.id).toBe(USER_B_ID);
			expect(res.body.user.username).toBe('bob');
		});
	});

	// Scenario 7b (WHISPR-1349) : POST /profiles/batch — endpoint batch pour
	// charger N profils en une seule requete. Suit WHISPR-1343 (concurrency
	// mobile) et WHISPR-1344 (relachement throttle unitaire).
	describe('Scenario 7b: POST /profiles/batch returns multiple profiles in one request', () => {
		it('returns the requested profiles plus the missing ids', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');
			await createUser(USER_B_ID, '+33600000002', 'bob');

			const missingId = 'd0000000-0000-4000-9000-000000000099';

			const res = await request(app.getHttpServer())
				.post('/user/v1/profiles/batch')
				.set(asUser(USER_A_ID))
				.send({ ids: [USER_A_ID, USER_B_ID, missingId] })
				.expect(200);

			expect(res.body.profiles).toHaveLength(2);
			const ids = res.body.profiles.map((p: { id: string }) => p.id).sort();
			expect(ids).toEqual([USER_A_ID, USER_B_ID].sort());
			expect(res.body.missing).toEqual([missingId]);
		});

		it('returns 401 without a bearer token', async () => {
			await request(app.getHttpServer())
				.post('/user/v1/profiles/batch')
				.send({ ids: [USER_A_ID] })
				.expect(401);
		});

		it('returns 400 when ids contains a non-uuid value', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			await request(app.getHttpServer())
				.post('/user/v1/profiles/batch')
				.set(asUser(USER_A_ID))
				.send({ ids: ['not-a-uuid'] })
				.expect(400);
		});

		it('returns 400 when ids exceeds the 100-item cap', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const tooMany: string[] = [];
			for (let i = 0; i < 101; i++) {
				const hex = i.toString(16).padStart(2, '0');
				// Le 4eme groupe doit commencer par 8/9/a/b pour passer @IsUUID,
				// on garde 9000 fixe et on incremente le dernier segment.
				tooMany.push(`e0000000-0000-4000-9000-0000000000${hex.padStart(2, '0')}`);
			}

			await request(app.getHttpServer())
				.post('/user/v1/profiles/batch')
				.set(asUser(USER_A_ID))
				.send({ ids: tooMany })
				.expect(400);
		});

		it('does not leak phoneNumber even when fetching the requesters own profile', async () => {
			await createUser(USER_A_ID, '+33600000001', 'alice');

			const res = await request(app.getHttpServer())
				.post('/user/v1/profiles/batch')
				.set(asUser(USER_A_ID))
				.send({ ids: [USER_A_ID] })
				.expect(200);

			expect(res.body.profiles[0].id).toBe(USER_A_ID);
			expect(res.body.profiles[0].phoneNumber).toBeUndefined();
		});
	});

	// Scenario 8 (WHISPR-1327): POST /contact-requests is throttled at 10/60s
	// per IP. Le 11e POST en moins de 60s doit retourner 429.
	describe('Scenario 8: POST /contact-requests rate limit (10/60s)', () => {
		it('returns 429 after the 11th contact request within 60s', async () => {
			// Vider les compteurs Redis du throttler hérités des scenarios précédents.
			const redis = new Redis({
				host: process.env.REDIS_HOST ?? 'localhost',
				port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
			});
			await redis.flushdb();
			await redis.quit();

			await createUser(USER_A_ID, '+33600000001', 'alice');
			// 11 destinataires distincts pour ne pas declencher 409 CONFLICT
			// (un meme couple requester/recipient ne peut pas avoir 2 demandes pending).
			const recipients: string[] = [];
			for (let i = 0; i < 11; i++) {
				const hex = String(i).padStart(2, '0');
				const id = `c0000000-0000-4000-a000-0000000000${hex}`;
				await createUser(id, `+33610000${hex}`, `recipient${i}`);
				recipients.push(id);
			}

			// Espacer les envois (260 ms) pour passer sous le SHORT (5/1s) global
			// et n'eprouver que la limite specifique 10/60s.
			const statuses: number[] = [];
			for (let i = 0; i < 11; i++) {
				const res = await request(app.getHttpServer())
					.post('/user/v1/contact-requests')
					.set(asUser(USER_A_ID))
					.send({ contactId: recipients[i] });
				statuses.push(res.status);
				if (i < 10) {
					await delay(260);
				}
			}

			expect(statuses.slice(0, 10)).toEqual(Array(10).fill(201));
			expect(statuses[10]).toBe(429);
		}, 30000);
	});
});
