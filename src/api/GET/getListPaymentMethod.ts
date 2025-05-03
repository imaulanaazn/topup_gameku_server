import { APIAuth, APIMethod, ValidatorType } from "@enum/index";
import { PaymentMethodDto } from "@dto/paymentMethod.dto";
import { Validator } from "@helper/validator";
import { PaymentMethodService } from "@serviceInternal/paymentMethod.service";
import { RequestHandler } from "express";
import { Op } from "sequelize";
import { IApiRouter, Validation } from "src/interfaces";

const path = "/api/v1/payments-method";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "query",
    required: false,
    type: "string",
  },
  {
    name: "type",
    required: false,
    type: "string",
    enum: ["payment", "deposit"],
    default: "payment",
  },
];

const main: RequestHandler = async (req, res) => {
  const di = req.di;
  const query = new Validator(req, res).process<{
    query: string;
    type: "payment" | "deposit";
  }>(schemaValidation, ValidatorType.QUERY);
  const paymentMethodService = new PaymentMethodService();
  let redisKey = `payments`;

  if (query?.query && query.query === "9") {
    redisKey += `:9:${query.type}`;
    const paymentFromRedis = await di.redisService.getObject<
      PaymentMethodDto[]
    >(redisKey);
    if (paymentFromRedis && paymentFromRedis.length > 0) {
      res.send(paymentFromRedis);
      return;
    }

    const paymentMethod = await paymentMethodService.model.findAll({
      where: {
        isActive: true,
        deleted: false,
      },
      order: [["sequence", "ASC"]],
    });

    await di.redisService.setObject(redisKey, paymentMethod);
    res.send(paymentMethod);
  } else {
    redisKey += ":all";
    const paymentFromRedis = await di.redisService.getObject<
      PaymentMethodDto[]
    >(redisKey);
    if (paymentFromRedis && paymentFromRedis.length > 0) {
      res.send(paymentFromRedis);
      return;
    }

    const paymentMethod = await paymentMethodService.model.findAll({
      where: {
        isActive: true,
        deleted: false,
      },
      order: [["sequence", "ASC"]],
    });

    await di.redisService.setObject(redisKey, paymentMethod);
    res.send(paymentMethod);
  }
  return;
};

export const getListPaymentsMethod: IApiRouter = {
  main,
  path,
  method,
  auth,
};
