import { Request, Response, NextFunction, Router } from "express";
import {
  authAdmin,
  authWehbookTokovoucher,
  authWebhookMidtrans,
  authWehbookInternal,
} from "../middlewares/sessions";
import responseErrorHandler from "@middleware/responseErrorHandler";
import { IApiRouter } from "src/interfaces";
import { getGameByCategory } from "./GET/getGameByCategory";
// import { postArticle } from "./admin/maintenanceArticle/postArticle";
import { getGameDetailById } from "./GET/getGameDetail";
import { getListPaymentsMethod } from "./GET/getListPaymentMethod";
import { getOrderHistory } from "./GET/getOrderHistory";
import { getAllGamePagination } from "./admin/maintenanceGame/getAllGamePagination";
import { loginAdmin } from "./admin/loginAdmin";
import { getMeAdmin } from "./admin/getMe";
import { getAllOrdersPagination } from "./admin/maintenanceOrders/getAllOrdersPagination";
import { putStatusOrder } from "./admin/maintenanceOrders/putStatusOrder";
import { putGame } from "./admin/maintenanceGame/putGame";
import { cronjobSetExpiredPayment } from "./cronjob/setExpiredPayment";
import { processSuccessOrder } from "./webhook/internal/processSuccessOrder";
import { syncLapakgamingDataDesc } from "./cronjob/syncDescProduct";
import { putProductPrices } from "./admin/maintenanceConfiguration/syncPrices";
import { getOrderAnalyticsV2 } from "./admin/getOrderAnalyticsV2";
import { getRevenue } from "./admin/getRevenue";
import { getOrderDetailV2 } from "./GET/getOrderDetailV2";
import { APIAuth } from "@enum/index";
import { postOrderV3 } from "./POST/postOrderV3";
import { webhookMidtrans } from "./webhook/midtrans";
import { webhookTokoVoucher } from "./webhook/tokovoucher";
import { getOrderStatus } from "./GET/getOrderStatus";
// import { getWhatsappStatus } from "./admin/maintenanceConfiguration/getWhatsappStatus";

let router = Router();

const apis = [
  loginAdmin,
  getOrderAnalyticsV2,
  getMeAdmin,
  getRevenue,

  putProductPrices,

  // Maintenance Order
  getAllOrdersPagination,
  putStatusOrder,

  // Maintenance Game
  putGame,
  getAllGamePagination,

  // POST

  postOrderV3,

  // GET
  getGameByCategory,
  getGameDetailById,
  getListPaymentsMethod,
  getOrderHistory,
  getOrderDetailV2,
  getOrderStatus,

  // CRONJOB
  cronjobSetExpiredPayment,
  syncLapakgamingDataDesc,
];

for (const api of apis) {
  let { path, method, auth, isUploadImage, dataImg } = api as IApiRouter;
  if (!path.startsWith("/api")) {
    path = "/api" + path;
  }

  const authAdmins = [
    APIAuth.ADMIN,
    APIAuth.OWNER,
    APIAuth.WRITER,
    APIAuth.ALL_ADMIN,
  ];

  let authorization;
  if (authAdmins.includes(auth)) {
    const a = (req: Request, res: Response, next: NextFunction) => {
      authAdmin(req, res, next)(auth);
    };
    authorization = a;
  }

  const main = (req: Request, res: Response) => {
    return api.main(req, res).catch((err: Error) => {
      responseErrorHandler(err, res, req);
    });
  };

  if (auth !== APIAuth.GUEST) {
    router[method.toLowerCase()](path, authorization, main);
  } else {
    router[method.toLowerCase()](path, main);
  }
}

let webhook = Router();

const apisWebhook = [
  // INTERNAL
  processSuccessOrder,

  //TOKOVOUCHER
  webhookTokoVoucher,

  // MIDTRANS
  webhookMidtrans,
];

for (const api of apisWebhook) {
  let { path, method, auth, middlewares } = api as IApiRouter;
  if (!path.startsWith("/api")) {
    path = "/api" + path;
  }

  middlewares = middlewares || [];

  let authorization;
  if (auth === APIAuth.WEBHOOK_INTERNAL) {
    //@ts-ignore
    const xApiKey = api.xApiKey;
    const authInternal = (req: Request, res: Response, next: NextFunction) => {
      authWehbookInternal(req, res, next)(xApiKey);
    };
    authorization = authInternal;
  } else if (auth === APIAuth.WEBHOOK_TOKOVOUCHER) {
    authorization = authWehbookTokovoucher;
  } else if (auth === APIAuth.WEBHOOK_MIDTRANS) {
    authorization = authWebhookMidtrans;
  }

  const main = (req: Request, res: Response, next: NextFunction) =>
    api.main(req, res, next).catch((err: Error) => {
      responseErrorHandler(err, res, req);
    });

  if (auth === APIAuth.GUEST) {
    webhook[method.toLowerCase()](path, ...middlewares, main);
  } else {
    if (authorization) {
      webhook[method.toLowerCase()](path, ...middlewares, authorization, main);
    } else {
      webhook[method.toLowerCase()](path, ...middlewares, main);
    }
  }
}

export { webhook, router };
