import * as jwt from 'jsonwebtoken';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
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

	beforeAll(async () => {
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
		app.setGlobalPrefix('user');
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
});
