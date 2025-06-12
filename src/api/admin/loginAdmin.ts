import {
  APIAuth,
  APIMethod,
  EncryptJoseType,
  ErrorType,
  ValidatorType,
} from "@enum/index";
import { BusinessError } from "@helper/handleError";
import { Validator } from "@helper/validator";
import { Validation, IApiRouter } from "@interfaces/index";
import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import { Config } from "@config/index";
import { AdminService } from "@serviceInternal/admin.service";
import { AdminUserRoleService } from "@serviceInternal/adminUserRole";
import { AdminRoleEntity } from "@entity/adminRole.entity";
import { EncryptionService } from "@serviceInternal/jose.service";
import { Op } from "sequelize";

const path = "/v1/admin/login";
const method = APIMethod.POST;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "username",
    type: "string",
    required: true,
  },
  {
    name: "password",
    type: "string",
    required: true,
  },
];

const main: RequestHandler = async (req, res) => {
  const body = new Validator(req, res).process<{
    username: string;
    password: string;
  }>(schemaValidation, ValidatorType.BODY);
  const redis = req.redis;
  const adminService = new AdminService();
  const config = new Config();
  const admin = await adminService.model.scope("withPassword").findOne({
    where: {
      username: body.username,
      deleted: {
        [Op.or]: [null, false],
      },
    },
  });

  if (!admin) {
    throw new BusinessError(
      "Username atau Password tidak valid",
      ErrorType.BadRequest
    );
  }

  const comparePassword = bcrypt.compareSync(body.password, admin.password);
  if (!comparePassword) {
    throw new BusinessError(
      "Username atau Password tidak valid",
      ErrorType.Validation
    );
  }

  const adminUserRoleService = new AdminUserRoleService();
  const adminUserRole = await adminUserRoleService.model.findAll({
    where: {
      userId: admin.id,
    },
    include: [
      {
        model: AdminRoleEntity,
        required: true,
      },
    ],
  });

  const encryptService = new EncryptionService(EncryptJoseType.ADMIN);
  const encrypt = await encryptService.encryptData(
    {
      ...admin.dataValues,
      password: undefined,
      roles: adminUserRole.map((role) => role.role.cd),
    },
    7,
    "day"
  );

  res.cookie("session_gasskeun_admin", encrypt, {
    httpOnly: true,
    maxAge: config.maxAgeLogin * 1000,
    // domain: config.domainReseller,
    // path: process.env.NODE_ENV.toLowerCase() === "production" ? "/" : "/v1",
    secure: process.env.NODE_ENV.toLowerCase() === "production",
  });
  res.setHeader("Access-Control-Allow-Credentials", "true");

  return res.send({
    ...admin.dataValues,
    password: undefined,
    roles: adminUserRole.map((role) => role.role.cd),
  });
};

export const loginAdmin: IApiRouter = {
  path,
  method,
  main,
  auth,
};
