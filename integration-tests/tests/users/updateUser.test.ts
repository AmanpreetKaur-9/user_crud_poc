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

    // ─── Edge Cases ───

    it('should return 400 if name is too short in update payload', async () => {
        // GIVEN: Seed a valid user
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({ email: 'update-short-name@domain.com' });
        const userId = await User.create(payload);

        // WHEN: Update with a name shorter than 3 characters
        const response = await request(testCase.app)
            .put(`/api/users/${userId}`)
            .send({ name: 'AB', email: 'valid@domain.com', age: 25 });

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if age is missing in update payload', async () => {
        // GIVEN: Seed a valid user
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({ email: 'update-no-age@domain.com' });
        const userId = await User.create(payload);

        // WHEN: Update without the age field
        const response = await request(testCase.app)
            .put(`/api/users/${userId}`)
            .send({ name: 'Valid Name', email: 'valid@domain.com' });

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if update body is empty', async () => {
        // GIVEN: Seed a valid user
        const User = require('../../../src/models/userModel');
        const payload = UserFactory.buildCreatePayload({ email: 'update-empty@domain.com' });
        const userId = await User.create(payload);

        // WHEN: Send empty body
        const response = await request(testCase.app)
            .put(`/api/users/${userId}`)
            .send({});

        // THEN
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 409 if updating email to one that already exists', async () => {
        // GIVEN: Seed two users
        const User = require('../../../src/models/userModel');
        const user1Payload = UserFactory.buildCreatePayload({ email: 'existing@domain.com' });
        await User.create(user1Payload);

        const user2Payload = UserFactory.buildCreatePayload({ email: 'will-clash@domain.com' });
        const user2Id = await User.create(user2Payload);

        // WHEN: Update user2's email to match user1's email
        const response = await request(testCase.app)
            .put(`/api/users/${user2Id}`)
            .send({ name: 'Clash User', email: 'existing@domain.com', age: 30 });

        // THEN: Should return 409 for duplicate entry
        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Duplicate entry');
    });

    it('should preserve original data when update fails validation', async () => {
        // GIVEN: Seed a user with known data
        const User = require('../../../src/models/userModel');
        const originalPayload = UserFactory.buildCreatePayload({
            name: 'Preserved Name',
            email: 'preserve-check@domain.com',
            age: 45,
        });
        const userId = await User.create(originalPayload);

        // WHEN: Send invalid update (should fail)
        await request(testCase.app)
            .put(`/api/users/${userId}`)
            .send({ name: 'AB', email: 'bad', age: 'not-a-number' });

        // THEN: Verify original data is untouched in DB
        const user = await User.findById(userId);
        expect(user.name).toBe('Preserved Name');
        expect(user.email).toBe('preserve-check@domain.com');
        expect(user.age).toBe(45);
    });
});
