import request from 'supertest';
import { BaseTestCase } from '../../helpers/BaseTestCase';
import { UserFactory } from '../../factories/UserFactory';

describe('PUT /api/users/:id', () => {
    const testCase = new BaseTestCase();

    beforeAll(async () => {
        await testCase.setup();
    });

    afterAll(async () => {
        await testCase.teardown();
    });

    it('should seed a user, update them, and verify directly in the database', async () => {
        // GIVEN: Seed the initial data directly into DB
        const User = require('../../../src/models/userModel');
        const initialPayload = UserFactory.buildCreatePayload({
            name: 'Old Name',
            email: 'update-me@domain.com',
            age: 25
        });
        const userId = await User.create(initialPayload);

        // Define the new desired state
        const updatePayload = UserFactory.buildCreatePayload({
            name: 'New Name',
            email: 'updated@domain.com',
            age: 30
        });

        // WHEN: Call the PUT API
        const response = await request(testCase.app)
            .put(`/api/users/${userId}`)
            .send(updatePayload);

        // THEN: Verify the API response
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'User updated successfully');

        // AND THEN: Verify directly in the database that the user is updated
        const updatedUser = await User.findById(userId);
        expect(updatedUser).toBeDefined();

        // Assert the database values match the updatePayload modifications
        expect(updatedUser.name).toBe('New Name');
        expect(updatedUser.email).toBe('updated@domain.com');
        expect(updatedUser.age).toBe(30);
    });

    it('should return 404 if the user does not exist', async () => {
        const updatePayload = UserFactory.buildCreatePayload({ email: 'non-existent@domain.com' });

        // WHEN: Call the PUT API with a dummy ID that does not exist 
        const response = await request(testCase.app)
            .put('/api/users/999999')
            .send(updatePayload);

        // THEN: Verify the API responds with 404 Not Found
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 if the update payload is malformed', async () => {
        // GIVEN: Seed a valid user
        const User = require('../../../src/models/userModel');
        const initialPayload = UserFactory.buildCreatePayload({ email: 'bad-payload@domain.com' });
        const userId = await User.create(initialPayload);

        // WHEN: Call the PUT API with an invalid email format
        const invalidPayload = UserFactory.buildCreatePayload({ email: 'not-an-email' });
        const response = await request(testCase.app)
            .put(`/api/users/${userId}`)
            .send(invalidPayload);

        // THEN: Verify the API Joi validation blocked the update and returned 400
        expect(response.status).toBe(400);
    });
});
