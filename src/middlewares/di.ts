import { Config } from "@config/index";
import { IDI } from "@interfaces/index";
import { RedisService } from "@serviceExternal/redis.service";
import { AdminService } from "@serviceInternal/admin.service";
import { AdminRoleService } from "@serviceInternal/adminRole.service";
import { AdminUserRoleService } from "@serviceInternal/adminUserRole";
import { Request, Response, NextFunction } from "express";
import requestIp from "request-ip";
import { Server } from "socket.io";

export const setupDI = (io: Server) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const di: IDI = {
      config: new Config(),
      adminService: new AdminService(),
      adminUserRoleService: new AdminUserRoleService(),
      adminRoleService: new AdminRoleService(),
      redisService: RedisService.getInstance(),
    };

    const clientIp = requestIp.getClientIp(req);
    req.clientIp = clientIp;
    req.io = io;
    req.di = di;
    next();
  };
};
