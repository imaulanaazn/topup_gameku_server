import { AdminDto } from "@dto/admin.dto";
import { CustomerDto } from "@dto/customer.dto";
import { IDI } from "@interfaces/index";
import { RedisService } from "@serviceExternal/redis.service";
import { Session } from "express-session";
import { Server } from "socket.io";

declare module "express-session" {
  export interface SessionData {
    data: {
      roleId: string;
      isLogin: boolean;
      ip: string;
      userData?: CustomerDto;
    };
  }
}

declare module "express-serve-static-core" {
  interface Request {
    di: IDI;
    redis?: RedisService;
    io?: Server;
    isReseller?: boolean;
    reseller?: {
      isExpired: boolean;
      data: CustomerDto;
      expiredAt: string;
      createdAt: string;
    };
    admin?: {
      isExpired: boolean;
      data: DataEncryptAdmin;
      expiredAt: string;
      createdAt: string;
    };
    user?: {
      isExpired: boolean;
      data: CustomerDto;
      expiredAt: string;
      createdAt: string;
    };
  }
}
