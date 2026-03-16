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
});
