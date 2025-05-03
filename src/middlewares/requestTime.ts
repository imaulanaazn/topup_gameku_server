import {
  createLogCronjob,
  createLogCronjobInternal,
  createLogCronjobKupon,
  createLogWebhook,
} from "@helper/logger";
import { NextFunction, Request, Response } from "express";

const webhookEndpoint = ["/api/v1/webhook/lapakgaming-product"];
const cronjobEndpoint = ["/api/v1/sync-product-tokovoucher"];
const cronjobInternalEndpoint = [
  "/api/v1/set-expired-payment",
  "/api/v1/cron-set-order-review",
];
const cronjobKupon = [
  "/api/v1/toko-kupon-order-statuses",
  "/api/v1/sync-product-tokokupon",
];

const requestTime = (req: Request, res: Response, next: NextFunction) => {
  const messageStart = `${req.method} ${req.originalUrl} -- start`;
  if (webhookEndpoint.includes(req.originalUrl)) {
    createLogWebhook().log(messageStart);
  } else if (cronjobEndpoint.includes(req.originalUrl)) {
    createLogCronjob().log(messageStart);
  } else if (cronjobInternalEndpoint.includes(req.originalUrl)) {
    createLogCronjobInternal().log(messageStart);
  } else if (cronjobKupon.includes(req.originalUrl)) {
    createLogCronjobKupon().log(messageStart);
  } else {
    console.log(messageStart);
  }

  const startTime = new Date().getTime();
  res.on("finish", () => {
    const endTime = new Date().getTime();
    const requestTime = endTime - startTime;
    const messageFinish = `[${res.statusCode}] ${req.method} ${req.originalUrl} - end [${requestTime}ms]`;
    if (webhookEndpoint.includes(req.originalUrl)) {
      createLogWebhook().log(messageFinish);
    } else if (cronjobEndpoint.includes(req.originalUrl)) {
      createLogCronjob().log(messageFinish);
    } else if (cronjobInternalEndpoint.includes(req.originalUrl)) {
      createLogCronjobInternal().log(messageFinish);
    } else if (cronjobKupon.includes(req.originalUrl)) {
      createLogCronjobKupon().log(messageFinish);
    } else {
      console.log(messageFinish);
    }
  });
  next();
};

export default requestTime;
