import request from 'supertest';
import { BaseTestCase } from '../../helpers/BaseTestCase';
import { UserFactory } from '../../factories/UserFactory';

describe('POST /api/users', () => {
    const testCase = new BaseTestCase();

    beforeAll(async () => {
        await testCase.setup();
    });

    afterAll(async () => {
        await testCase.teardown();
    });

    it('should create a new user and return 201', async () => {
        // GIVEN
        const validPayload = UserFactory.buildCreatePayload({ email: 'create-isolated@domain.com' });

        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send(validPayload);

        // THEN: Verify the API response
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe('create-isolated@domain.com');

        // AND THEN: Verify directly in the database to ensure isolation 
        // from other APIs (like getUser) for validation
        const User = require('../../../src/models/userModel');
        const dbUser = await User.findById(response.body.id);

        expect(dbUser).toBeDefined();
        expect(dbUser.email).toBe('create-isolated@domain.com');
        expect(dbUser.name).toBe(validPayload.name);
        expect(dbUser.age).toBe(validPayload.age);
    });

    it('should return 400 if email is malformed', async () => {
        // GIVEN
        const invalidPayload = UserFactory.buildCreatePayload({ email: 'not-an-email' });

        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send(invalidPayload);

        // THEN
        expect(response.status).toBe(400); // 400 error due to validation failure
    });

    // ─── Edge Cases ───

    it('should return 400 if name is missing', async () => {
        // GIVEN: Payload without name
        const payload = { email: 'no-name@domain.com', age: 25 };

        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send(payload);

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if name is too short (less than 3 characters)', async () => {
        // GIVEN: Name with only 2 characters
        const payload = UserFactory.buildCreatePayload({ name: 'AB', email: 'short-name@domain.com' });

        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send(payload);

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if age is missing', async () => {
        // GIVEN: Payload without age
        const payload = { name: 'Test User', email: 'no-age@domain.com' };

        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send(payload);

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if age is not an integer', async () => {
        // GIVEN: Age as a decimal
        const payload = UserFactory.buildCreatePayload({ age: 25.5, email: 'decimal-age@domain.com' });

        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send(payload);

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if request body is empty', async () => {
        // GIVEN: Empty body
        // WHEN
        const response = await request(testCase.app)
            .post('/api/users')
            .send({});

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 409 if email already exists (duplicate entry)', async () => {
        // GIVEN: Create a user first
        const payload = UserFactory.buildCreatePayload({ email: 'duplicate@domain.com' });
        await request(testCase.app).post('/api/users').send(payload);

        // WHEN: Try to create another user with the same email
        const duplicatePayload = UserFactory.buildCreatePayload({ email: 'duplicate@domain.com' });
        const response = await request(testCase.app)
            .post('/api/users')
            .send(duplicatePayload);

        // THEN: Should return 409 for duplicate entry
        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Duplicate entry');
    });
});
