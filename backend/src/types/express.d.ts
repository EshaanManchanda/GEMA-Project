import { Request } from 'express';
import { IUser } from '../models';

export interface AuthRequest extends Request {
  user?: IUser;
}