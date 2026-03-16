import { faker } from '@faker-js/faker';

export class UserFactory {
    static buildCreatePayload(overrides: Record<string, any> = {}) {
        return {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            age: faker.number.int({ min: 18, max: 99 }),
            ...overrides
        };
    }
}
