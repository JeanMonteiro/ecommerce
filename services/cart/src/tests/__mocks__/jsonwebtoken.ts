const verify = jest.fn().mockImplementation(() => ({
  userId: 1,
  username: 'testuser',
}));

const sign = jest.fn().mockImplementation(() => 'testtoken');

export default { verify, sign };
