import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { authMiddleware } from '@ecommerce/auth-middleware';
import prisma from './libs/prisma';
import { publishEvent } from './libs/messaging';
import { signToken } from './config/jwt';
import { validateAuthInput } from './validation/auth';

const router = express.Router();
const BCRYPT_ROUNDS = 10;

router.post('/api/users', async function (req: Request, res: Response) {
  try {
    const validation = validateAuthInput(req.body);
    if (!validation.ok) {
      return res.status(400).send({ message: validation.message });
    }

    const { username, password } = validation;

    const user = await prisma.user.findFirst({
      where: { username },
    });
    if (user) {
      return res.status(400).send({
        message: 'User already exists!',
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    try {
      await publishEvent('user.registered', {
        userId: newUser.id,
        username: newUser.username,
      });
    } catch (publishError) {
      console.error('Failed to publish user.registered:', publishError);
    }

    const token = signToken({ userId: newUser.id, username: newUser.username });

    return res.status(201).send({
      message: 'User created successfully!',
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong!');
  }
});

router.post('/api/auth', async function (req: Request, res: Response) {
  try {
    const validation = validateAuthInput(req.body);
    if (!validation.ok) {
      return res.status(400).send({ message: validation.message });
    }

    const { username, password } = validation;

    const user = await prisma.user.findFirst({
      where: { username },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(403).send({
        message: 'Invalid credentials!',
      });
    }

    return res.status(200).send({
      token: signToken({ userId: user.id, username: user.username }),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong!');
  }
});

router.get('/api/users', authMiddleware, async function (req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
      },
    });
    res.status(200).send(users);
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong!');
  }
});

export default router;
