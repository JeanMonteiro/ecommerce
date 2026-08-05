import express, { Request, Response } from 'express';
import prisma from './libs/prisma';
import { publishEvent } from './libs/messaging';
import {
  serializeProduct,
  toDecimal,
  validateProductInput,
  validateProductUpdateInput,
} from './validation/product';

const router = express.Router();

router.get('/api/products', async function (_req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' },
    });

    return res.status(200).send(products.map(serializeProduct));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.get('/api/products/:id', async function (req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send({ message: 'Invalid product id' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).send({ message: 'Product not found' });
    }

    return res.status(200).send(serializeProduct(product));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

router.post('/api/products', async function (req: Request, res: Response) {
  try {
    const validation = validateProductInput(req.body);
    if (!validation.ok) {
      return res.status(400).send({ message: validation.message });
    }

    const { name, price, description } = validation;

    const product = await prisma.product.create({
      data: {
        name,
        price: toDecimal(price),
        description,
      },
    });

    try {
      await publishEvent('product.created', {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
      });
    } catch (publishError) {
      console.error('Failed to publish product.created:', publishError);
    }

    return res.status(201).send(serializeProduct(product));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
});

async function updateProduct(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send({ message: 'Invalid product id' });
    }

    const validation = validateProductUpdateInput(req.body);
    if (!validation.ok) {
      return res.status(400).send({ message: validation.message });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).send({ message: 'Product not found' });
    }

    const data: {
      name?: string;
      price?: ReturnType<typeof toDecimal>;
      description?: string | null;
    } = {};

    if (validation.name !== undefined) {
      data.name = validation.name;
    }

    if (validation.price !== undefined) {
      data.price = toDecimal(validation.price);
    }

    if (validation.description !== undefined) {
      data.description = validation.description;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    try {
      await publishEvent('product.updated', {
        productId: product.id,
        ...(validation.price !== undefined
          ? { price: Number(product.price) }
          : {}),
      });
    } catch (publishError) {
      console.error('Failed to publish product.updated:', publishError);
    }

    return res.status(200).send(serializeProduct(product));
  } catch (error) {
    console.log(error);
    return res.status(500).send('Something went wrong!');
  }
}

router.put('/api/products/:id', updateProduct);
router.patch('/api/products/:id', updateProduct);

export default router;
