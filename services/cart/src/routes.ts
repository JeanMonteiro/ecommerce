import express, { Request, Response } from 'express';
import { authMiddleware } from '@ecommerce/auth-middleware';
import prisma from './libs/prisma';
import {
  CatalogError,
  CatalogUnavailableError,
  getProduct,
} from './libs/catalogClient';
import {
  calculateCartTotals,
  parseProductIdParam,
  serializeCartItem,
  toDecimal,
  validateCartItemInput,
  validateCartQuantityInput,
} from './validation/cart';

const router = express.Router();

function handleCatalogError(error: unknown, res: Response): boolean {
  if (error instanceof CatalogError) {
    if (error.statusCode === 404) {
      res.status(404).json({ message: error.message });
      return true;
    }

    res.status(502).json({ message: error.message });
    return true;
  }

  if (error instanceof CatalogUnavailableError) {
    res.status(503).json({ message: error.message });
    return true;
  }

  return false;
}

router.get('/api/cart', authMiddleware, async function (req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const items = await prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const totals = calculateCartTotals(items);

    return res.status(200).json({
      items: items.map(serializeCartItem),
      ...totals,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.post('/api/cart', authMiddleware, async function (req: Request, res: Response) {
  try {
    const validation = validateCartItemInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const userId = req.user.userId;
    const { productId, quantity } = validation;

    let product;
    try {
      product = await getProduct(productId);
    } catch (error) {
      if (handleCatalogError(error, res)) {
        return;
      }
      throw error;
    }

    const item = await prisma.cartItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: {
        userId,
        productId,
        quantity,
        unitPrice: toDecimal(product.price),
        name: product.name,
      },
      update: {
        quantity: { increment: quantity },
        unitPrice: toDecimal(product.price),
        name: product.name,
      },
    });

    return res.status(200).json(serializeCartItem(item));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.patch(
  '/api/cart/:productId',
  authMiddleware,
  async function (req: Request, res: Response) {
    try {
      const productId = parseProductIdParam(req.params.productId);
      if (productId === null) {
        return res.status(400).json({ message: 'Invalid product id' });
      }

      const validation = validateCartQuantityInput(req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const userId = req.user.userId;

      const existing = await prisma.cartItem.findUnique({
        where: {
          userId_productId: { userId, productId },
        },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      let product;
      try {
        product = await getProduct(productId);
      } catch (error) {
        if (handleCatalogError(error, res)) {
          return;
        }
        throw error;
      }

      const item = await prisma.cartItem.update({
        where: {
          userId_productId: { userId, productId },
        },
        data: {
          quantity: validation.quantity,
          unitPrice: toDecimal(product.price),
          name: product.name,
        },
      });

      return res.status(200).json(serializeCartItem(item));
    } catch (error) {
      console.log(error);
      return res.status(500).send('Something went wrong!');
    }
  },
);

router.delete(
  '/api/cart/:productId',
  authMiddleware,
  async function (req: Request, res: Response) {
    try {
      const productId = parseProductIdParam(req.params.productId);
      if (productId === null) {
        return res.status(400).json({ message: 'Invalid product id' });
      }

      const userId = req.user.userId;

      const existing = await prisma.cartItem.findUnique({
        where: {
          userId_productId: { userId, productId },
        },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      await prisma.cartItem.delete({
        where: {
          userId_productId: { userId, productId },
        },
      });

      return res.status(204).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send('Something went wrong!');
    }
  },
);

router.delete('/api/cart', authMiddleware, async function (req: Request, res: Response) {
  try {
    const userId = req.user.userId;

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return res.status(204).send();
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

export default router;
