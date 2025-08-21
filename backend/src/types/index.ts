export * from './api';
export * from './auth';
export * from './express.d';

// Add AuthRequest type for authenticated requests
import { Request } from 'express';
import { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}
