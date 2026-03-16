import request from 'supertest';
import { BaseTestCase } from '../../helpers/BaseTestCase';
import { UserFactory } from '../../factories/UserFactory';

describe('DELETE /api/users/:id', () => {
    const testCase = new BaseTestCase();

    beforeAll(async () => {
        await testCase.setup();
    });

    afterAll(async () => {
        await testCase.teardown();
    });

    it('should seed a user, delete them, and verify in the database', async () => {
        // GIVEN: Seed the data directly into DB
        const User = require('../../../src/models/userModel');
        const validPayload = UserFactory.buildCreatePayload({ email: 'delete-me@domain.com' });
        const userId = await User.create(validPayload);

        // Verify the user exists initially
        const existingUser = await User.findById(userId);
        expect(existingUser).toBeDefined();

        // WHEN: Call the DELETE API
        const response = await request(testCase.app)
            .delete(`/api/users/${userId}`);

        // THEN: Verify the API response
        expect(response.status).toBe(200);

        // AND THEN: Verify directly in the database that the user is gone
        const deletedUser = await User.findById(userId);
        expect(deletedUser).toBeUndefined(); // Should not exist anymore
    });

    it('should return 404 if the user does not exist', async () => {
        // WHEN: Call the DELETE API with a dummy ID (e.g. 999999)
        const response = await request(testCase.app)
            .delete('/api/users/999999');

        // THEN: Verify the API responds with 404 (assuming your API handles this)
        expect(response.status).toBe(404);
    });
});
