import * as crypto from "crypto";
import { NextFunction, Request, Response, RequestHandler } from "express";
import {
  APIAuth,
  EncryptJoseType,
  ErrorStatusCode,
  ErrorType,
} from "@enum/index";
import { Config } from "@config/index";
import moment from "moment";
import { EncryptionService } from "@serviceInternal/jose.service";
import { CustomerDto } from "@dto/customer.dto";

const config = new Config();

export const regenerateSession = (req: Request) => {
  req.session.regenerate((err) => {
    if (err) {
      console.error(err);
    } else {
      req.session.data = {
        roleId: config.roleUser,
        isLogin: false,
        ip: req.clientIp,
      };
    }
  });
};

export const createSessions: RequestHandler = (req, res, next) => {
  const session = req.session?.data;
  if (!session) {
    req.session.data = {
      roleId: config.roleUser,
      isLogin: false,
      ip: req.clientIp,
    };
  } else {
    if (session.isLogin === false) {
      const currentTime = moment();
      const sessionExpiration = moment(req.session.cookie.expires);

      const timeDiffInMinutes = sessionExpiration.diff(currentTime, "minutes");
      if (timeDiffInMinutes <= 5) {
        regenerateSession(req);
      }
    }
  }
  next();
};

export interface DataEncryptAdmin {
  id: string;
  name: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}
export const authAdmin =
  (req: Request, res: Response, next: NextFunction) =>
  async (auth: APIAuth) => {
    const encryptService = new EncryptionService(EncryptJoseType.ADMIN);
    const session = req.cookies.session_gameku_admin;
    try {
      const decode = await encryptService.decryptData<DataEncryptAdmin>(
        session
      );

      const adminRoles = decode.data.roles;
      if (auth === APIAuth.ALL_ADMIN) {
        if (adminRoles.length === 0) {
          res.clearCookie("session_gameku_admin");
          return res.status(ErrorStatusCode.Authorization).send({
            errorCode: ErrorType.Authorization,
            message: "Cannot access to this resource",
          });
        }
        req.admin = decode;
        next();
        return;
      }

      if (adminRoles.includes(auth)) {
        req.admin = decode;
        console.log(req.admin);
        next();
        return;
      } else {
        res.status(ErrorStatusCode.Authorization).send({
          errorCode: ErrorType.Authorization,
          message: "Cannot access to this resource",
        });
        return;
      }
    } catch (error) {
      console.error(error);
      res.clearCookie("session_gameku_admin");
      return res.status(ErrorStatusCode.Authorization).send({
        errorCode: ErrorType.Authorization,
        message: "Cannot access to this resource",
      });
    }
  };

export const authWehbookInternal =
  (req: Request, res: Response, next: NextFunction) => (xApiKey: string) => {
    const headerApiKey = req.headers["x-gameku-key"];
    if (xApiKey === headerApiKey) {
      next();
      return;
    } else {
      res.sendStatus(403);
      return;
    }
  };

export const authWehbookTokovoucher: RequestHandler = async (
  req,
  res,
  next
) => {
  console.log("BODY WEBHOOK TOKOVOUCHER :" + req.body.ref_id);
  console.log("BODY WEBHOOK TOKOVOUCHER :" + req.body.trx_id);
  console.log(
    "HEADER WEBHOOK TOKOVOUCHER :" + req.headers["x-tokovoucher-authorization"]
  );
  const callbackToken = req.headers["x-tokovoucher-authorization"];
  if (callbackToken) {
    const memberCode = config.tokoVoucherMemberCode;
    const secretKey = config.tokoVoucherSecretKey;
    const signature = crypto
      .createHash("md5")
      .update(`${memberCode}:${secretKey}:${req.body.ref_id}`)
      .digest("hex");
    console.log(callbackToken);
    console.log(signature);
    if (callbackToken === signature) {
      next();
    } else {
      return res.sendStatus(403);
    }
  } else {
    return res.sendStatus(403);
  }
};

export const authWebhookMidtrans: RequestHandler = async (req, res, next) => {
  const config = new Config();
  const hash = crypto
    .createHash("sha512")
    .update(
      req.body.order_id +
        req.body.status_code +
        req.body.gross_amount +
        config.midtransServerKey
    )
    .digest("hex");

  if (req.body.signature_key === hash) {
    next();
  } else {
    res.sendStatus(403);
    return;
  }
};
