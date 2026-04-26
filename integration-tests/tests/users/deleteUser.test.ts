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

    // ─── Edge Cases ───

    it('should return 404 when deleting the same user twice', async () => {
        // GIVEN: Seed and delete a user
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({ email: 'delete-twice@domain.com' });
        const userId = await User.create(payload);

        // First delete — should succeed
        const firstDelete = await request(testCase.app)
            .delete(`/api/users/${userId}`);
        expect(firstDelete.status).toBe(200);

        // WHEN: Try to delete again
        const secondDelete = await request(testCase.app)
            .delete(`/api/users/${userId}`);

        // THEN: Should return 404 since user no longer exists
        expect(secondDelete.status).toBe(404);
        expect(secondDelete.body).toHaveProperty('message', 'User not found');
    });

    it('should not affect other users when one user is deleted', async () => {
        // GIVEN: Seed two users
        const User = require('../../../src/models/userModel');
        const payload1 = UserFactory.buildCreatePayload({ email: 'keep-me@domain.com' });
        const payload2 = UserFactory.buildCreatePayload({ email: 'remove-me@domain.com' });
        const userId1 = await User.create(payload1);
        const userId2 = await User.create(payload2);

        // WHEN: Delete only user2
        const response = await request(testCase.app)
            .delete(`/api/users/${userId2}`);
        expect(response.status).toBe(200);

        // THEN: User1 should still exist
        const user1 = await User.findById(userId1);
        expect(user1).toBeDefined();
        expect(user1.email).toBe('keep-me@domain.com');

        // AND: User2 should be gone
        const user2 = await User.findById(userId2);
        expect(user2).toBeUndefined();
    });

    it('should return proper response body on successful deletion', async () => {
        // GIVEN: Seed a user
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({ email: 'check-response@domain.com' });
        const userId = await User.create(payload);

        // WHEN: Delete the user
        const response = await request(testCase.app)
            .delete(`/api/users/${userId}`);

        // THEN: Verify the response body structure
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'User deleted successfully');
    });
});
