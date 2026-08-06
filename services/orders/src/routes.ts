import express, { Request, Response } from 'express';
import { authMiddleware } from '@ecommerce/auth-middleware';
import prisma from './libs/prisma';
import {
  CartError,
  CartUnavailableError,
  getCart,
} from './libs/cartClient';
import { publishEvent } from './libs/messaging';
import {
  parseOrderIdParam,
  serializeOrder,
  toDecimal,
} from './validation/order';

const router = express.Router();

function handleCartError(error: unknown, res: Response): boolean {
  if (error instanceof CartError) {
    if (error.statusCode === 401) {
      res.status(401).json({ message: error.message });
      return true;
    }

    res.status(502).json({ message: error.message });
    return true;
  }

  if (error instanceof CartUnavailableError) {
    res.status(503).json({ message: error.message });
    return true;
  }

  return false;
}

function getAuthorizationHeader(req: Request): string {
  return req.headers.authorization ?? '';
}

router.post('/api/orders', authMiddleware, async function (req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const authorizationHeader = getAuthorizationHeader(req);

    let cart;
    try {
      cart = await getCart(authorizationHeader);
    } catch (error) {
      if (handleCartError(error, res)) {
        return;
      }
      throw error;
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        total: toDecimal(cart.subtotal),
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: toDecimal(item.unitPrice),
            name: item.name,
          })),
        },
      },
      include: { items: true },
    });

    await publishEvent('order.created', {
      orderId: order.id,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });

    return res.status(202).json({
      orderId: order.id,
      status: 'PENDING',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.get('/api/orders', authMiddleware, async function (req: Request, res: Response) {
  try {
    const userId = req.user.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(orders.map(serializeOrder));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.get('/api/orders/:id', authMiddleware, async function (req: Request, res: Response) {
  try {
    const orderId = parseOrderIdParam(req.params.id);
    if (orderId === null) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const userId = req.user.userId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json(serializeOrder(order));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

export default router;
