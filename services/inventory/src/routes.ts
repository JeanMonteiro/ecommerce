import express, { Request, Response } from 'express';
import prisma from './libs/prisma';
import {
  parseProductId,
  serializeStock,
  validateQuantityInput,
} from './validation/inventory';

const router = express.Router();

router.get('/api/inventory', async function (_req: Request, res: Response) {
  try {
    const stocks = await prisma.stock.findMany({
      orderBy: { productId: 'asc' },
    });

    return res.status(200).send(stocks.map(serializeStock));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.get('/api/inventory/:productId', async function (req: Request, res: Response) {
  try {
    const productId = parseProductId(req.params.productId);
    if (productId === null) {
      return res.status(400).send({ message: 'Invalid product id' });
    }

    const stock = await prisma.stock.findUnique({ where: { productId } });
    if (!stock) {
      return res.status(404).send({ message: 'Stock not found' });
    }

    return res.status(200).send(serializeStock(stock));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.patch('/api/inventory/:productId', async function (req: Request, res: Response) {
  try {
    const productId = parseProductId(req.params.productId);
    if (productId === null) {
      return res.status(400).send({ message: 'Invalid product id' });
    }

    const validation = validateQuantityInput(req.body);
    if (!validation.ok) {
      return res.status(400).send({ message: validation.message });
    }

    const existing = await prisma.stock.findUnique({ where: { productId } });
    if (!existing) {
      return res.status(404).send({ message: 'Stock not found' });
    }

    const stock = await prisma.stock.update({
      where: { productId },
      data: { quantity: validation.quantity },
    });

    return res.status(200).send(serializeStock(stock));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

export default router;
