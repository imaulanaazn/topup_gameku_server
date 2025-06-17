import { createLogCronjob, createLogCronjobInternal } from "@helper/logger";
import { NextFunction, Request, Response } from "express";

const cronjobEndpoint = ["/api/v1/sync-product-tokovoucher"];
const cronjobInternalEndpoint = [
  "/api/v1/set-expired-payment",
  "/api/v1/cron-set-order-review",
];

const requestTime = (req: Request, res: Response, next: NextFunction) => {
  const messageStart = `${req.method} ${req.originalUrl} -- start`;
  if (cronjobEndpoint.includes(req.originalUrl)) {
    createLogCronjob().log(messageStart);
  } else if (cronjobInternalEndpoint.includes(req.originalUrl)) {
    createLogCronjobInternal().log(messageStart);
  } else {
    console.log(messageStart);
  }

  const startTime = new Date().getTime();
  res.on("finish", () => {
    const endTime = new Date().getTime();
    const requestTime = endTime - startTime;
    const messageFinish = `[${res.statusCode}] ${req.method} ${req.originalUrl} - end [${requestTime}ms]`;
    if (cronjobEndpoint.includes(req.originalUrl)) {
      createLogCronjob().log(messageFinish);
    } else if (cronjobInternalEndpoint.includes(req.originalUrl)) {
      createLogCronjobInternal().log(messageFinish);
    } else {
      console.log(messageFinish);
    }
  });
  next();
};

export default requestTime;
