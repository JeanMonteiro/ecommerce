require('dotenv').config();

// converting imports to typescript
import express from 'express';
import prisma from './libs/prisma';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

const router = express.Router();

router.post('/api/users', async function (req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        username
      }
    })
    if (user) {
      return res.status(400).send({
        message: 'User already exists!'
      })
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        password,
      }
    })

    const token = jwt.sign({ userId: newUser.id, username: newUser.username }, process.env.JWT_HASH);

    return res.status(201).send({
      message: 'User created successfully!',
      token
    });
  } catch (error) {
    console.log(error)
    res.status(500).send('Something went wrong!')
  }
})

router.post('/api/auth', async function (req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        username,
        password
      }
    })

    if (user) {
      return res.status(200).send({
        token: jwt.sign({ userId: user.id, username }, process.env.JWT_HASH)
      })
    }
    return res.status(403).send({
      message: 'Invalid credentials!'
    })
  } catch (error) {
    console.log(error)
    res.status(500).send('Something went wrong!')
  }
})


router.get('/api/users', async function (req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
      }
    })
    res.status(200).send(users)
  } catch (error) {
    console.log(error)
    res.status(500).send('Something went wrong!')
  }
})

export default router;