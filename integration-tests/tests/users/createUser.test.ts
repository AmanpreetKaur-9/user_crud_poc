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
});
