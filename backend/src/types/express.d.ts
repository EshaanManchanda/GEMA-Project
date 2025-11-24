import { Request } from 'express';
import { IUser } from '../models/index';

export interface AuthRequest extends Request {
  user?: IUser;
}

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
    
    interface Request {
      user?: import('../models').IUser;
    }
  }
}