import server from '../../app';
import request from 'supertest';
import { prismaMock } from '../libs/__mocks__/prisma.singleton';

jest.mock('../libs/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn().mockImplementation(() => 'testtoken'),
    verify: jest.fn().mockImplementation(() => ({ userId: 1, username: 'testuser' })),
  },
}));

const publishMock = jest.fn().mockResolvedValue(undefined);

jest.mock('../libs/messaging', () => ({
  __esModule: true,
  initMessaging: jest.fn().mockResolvedValue(undefined),
  closeMessaging: jest.fn().mockResolvedValue(undefined),
  getMessagingClient: jest.fn(),
  publishEvent: (...args: unknown[]) => publishMock(...args),
  resetMessagingClientForTests: jest.fn(),
}));

describe('Authentication Service', () => {
  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    publishMock.mockClear();
  });

  const testUser = {
    id: 1,
    username: 'testuser',
    password: 'testpassword',
  };

  it('should return 400 if the user already exists', () => {
    prismaMock.user.findFirst.mockResolvedValue(testUser);

    return request(server)
      .post('/api/users')
      .send(testUser)
      .expect(400);
  });

  it('should return 400 when username is empty', () => {
    return request(server)
      .post('/api/users')
      .send({ username: '   ', password: 'testpassword' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Username is required');
      });
  });

  it('should return 400 when password is too short', () => {
    return request(server)
      .post('/api/users')
      .send({ username: 'testuser', password: '12345' })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toBe('Password must be at least 6 characters');
      });
  });

  it('should register a new user with a hashed password', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(testUser);

    const response = await request(server)
      .post('/api/users')
      .send(testUser)
      .expect(201);

    expect(response.body).toHaveProperty('message', 'User created successfully!');
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBe('testtoken');
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        username: testUser.username,
        password: 'hashedpassword',
      },
    });
    expect(publishMock).toHaveBeenCalledWith('user.registered', {
      userId: testUser.id,
      username: testUser.username,
    });
  });

  it('should login and get a JWT token', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...testUser,
      password: 'hashedpassword',
    });

    const response = await request(server)
      .post('/api/auth')
      .send(testUser)
      .expect(200);

    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toBe('testtoken');
  });

  it('should return 403 for invalid credentials', async () => {
    const bcrypt = require('bcrypt').default;
    bcrypt.compare.mockResolvedValueOnce(false);
    prismaMock.user.findFirst.mockResolvedValue({
      ...testUser,
      password: 'hashedpassword',
    });

    await request(server)
      .post('/api/auth')
      .send(testUser)
      .expect(403);
  });

  it('should return 401 when listing users without a token', () => {
    return request(server)
      .get('/api/users')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe('Authentication required');
      });
  });

  it('should list users when a valid token is provided', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 1, username: 'testuser' },
    ] as never);

    const response = await request(server)
      .get('/api/users')
      .set('Authorization', 'Bearer testtoken')
      .expect(200);

    expect(response.body).toEqual([{ id: 1, username: 'testuser' }]);
  });
});
