import express, { Request, Response } from 'express';
import { getMockEmails } from './libs/mockEmailStore';

const router = express.Router();

router.get('/health', function (_req: Request, res: Response) {
  return res.status(200).send({ status: 'ok' });
});

router.get('/api/notifications', function (req: Request, res: Response) {
  const rawLimit = req.query.limit;
  const parsedLimit =
    typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : 50;
  const limit =
    Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;

  return res.status(200).send({ notifications: getMockEmails(limit) });
});

export default router;
