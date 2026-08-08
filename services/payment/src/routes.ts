import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/health', function (_req: Request, res: Response) {
  return res.status(200).send({ status: 'ok' });
});

export default router;
