import { Request as ExpressRequest, Response, NextFunction } from 'express';
import * as DB from './db';

export interface IRequest extends ExpressRequest {
  user?: DB.IUser;
  body: any;
}

export type IExpressMiddleware = (
  req: IRequest,
  res: Response,
  next: NextFunction
) => void;

export const Request = (
  action: (req: IRequest, res: Response, next: NextFunction) => Promise<any>
): IExpressMiddleware => async (req, res, next) => {
  let response: any = null;
  let failed = false;

  try {
    response = await action(req, res, next);
  } catch (error) {
    console.error(error);
    failed = true;
  } finally {
    if (failed) return res.sendStatus(500);
    if (!isNaN(Number(response)) && !Array.isArray(response)) {
      return res.sendStatus(response);
    }

    if (res.headersSent) return;

    if (response) return res.send(response);

    return res.sendStatus(200);
  }
};

export const authenticate: IExpressMiddleware = async (req, res, next) => {
  const sid = req.cookies['sid'];
  if (!sid) return next();

  const user = DB.findSession(sid);
  if (!user) return next();

  req.user = user;

  return next();
};

export const protect: IExpressMiddleware = (req, res, next) => {
  if (req.user) return next();
  return res.redirect('/login');
};
