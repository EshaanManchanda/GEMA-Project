import { IUser } from '../models';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
    
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
  }
}

export interface AuthRequest extends Express.Request {
  user?: IUser;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  body: any;
  params: any;
  query: any;
  ip?: string;
  headers: any;
}