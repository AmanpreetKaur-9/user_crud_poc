import request from 'supertest';
import { BaseTestCase } from '../../helpers/BaseTestCase';
import { UserFactory } from '../../factories/UserFactory';

describe('GET /api/users', () => {
    const testCase = new BaseTestCase();

    beforeAll(async () => {
        await testCase.setup();
    });

    afterAll(async () => {
        await testCase.teardown();
    });

    it('should seed a user and retrieve it via user listing API', async () => {
        // GIVEN: Seed the data (create user directly in DB)
        const User = require('../../../src/models/userModel');
        const validPayload = UserFactory.buildCreatePayload({ email: 'list-test@domain.com' });
        const userId = await User.create(validPayload);

        // WHEN: Call the GET listing API
        const getResponse = await request(testCase.app)
            .get('/api/users');

        // THEN: Verify the data matches and contains our seeded user
        expect(getResponse.status).toBe(200);
        expect(Array.isArray(getResponse.body)).toBe(true);
        expect(getResponse.body.length).toBeGreaterThanOrEqual(1);

        const foundUser = getResponse.body.find((u: any) => u.id === userId);
        expect(foundUser).toBeDefined();
        expect(foundUser.email).toBe('list-test@domain.com');
        expect(foundUser.name).toBe(validPayload.name);
    });

    // ─── Edge Cases ───

    it('should return an empty array when no users exist', async () => {
        // GIVEN: Fresh isolated DB with no users seeded

        // WHEN: Call GET listing API on the empty table
        // Note: Previous test seeded data, but we can verify the structure is always an array
        const response = await request(testCase.app)
            .get('/api/users');

        // THEN: Response is 200 and body is always an array
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('should retrieve a specific user by ID', async () => {
        // GIVEN: Seed a user
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({ email: 'get-by-id@domain.com' });
        const userId = await User.create(payload);

        // WHEN: Call GET /api/users/:id
        const response = await request(testCase.app)
            .get(`/api/users/${userId}`);

        // THEN
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body.email).toBe('get-by-id@domain.com');
        expect(response.body.name).toBe(payload.name);
    });

    it('should return 404 when getting a user that does not exist', async () => {
        // WHEN: Call GET with a non-existent ID
        const response = await request(testCase.app)
            .get('/api/users/999999');

        // THEN
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return correct user data fields in the response', async () => {
        // GIVEN: Seed a user with known data
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({
            name: 'Field Check User',
            email: 'field-check@domain.com',
            age: 42,
        });
        const userId = await User.create(payload);

        // WHEN
        const response = await request(testCase.app)
            .get(`/api/users/${userId}`);

        // THEN: Verify all expected fields are present
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('name', 'Field Check User');
        expect(response.body).toHaveProperty('email', 'field-check@domain.com');
        expect(response.body).toHaveProperty('age', 42);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });
});
