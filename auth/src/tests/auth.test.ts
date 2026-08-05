import server from '../../app';
import request from 'supertest';
import { prismaMock } from '../libs/__mocks__/prisma.singleton'

jest.mock('../libs/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}))

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn().mockImplementation(() => 'testtoken')
  },
}))

describe('Authentication Service', () => {
  afterAll((done) => {
    server.close(done);
  });

  const testUser = {
    id: 1,
    username: 'testuser',
    password: 'testpassword',
  };
  it('it should return 400 if the user already exists', () => {
    prismaMock.user.findFirst.mockResolvedValue(testUser)

    return request(server)
      .post('/api/users')
      .send(testUser)
      .expect(400);
  });

  it('should register a new user', async () => {

    prismaMock.user.create.mockResolvedValue(testUser)

    const response = await request(server)
      .post('/api/users')
      .send(testUser)
      .expect(201)

    expect(response.body).toHaveProperty('message', 'User created successfully!')
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBe('testtoken');
  });

  it('should login and get a JWT token', async () => {
    prismaMock.user.findFirst.mockResolvedValue(testUser)
    const response = await request(server)
      .post('/api/auth')
      .send(testUser)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBe('testtoken');
  });

});
