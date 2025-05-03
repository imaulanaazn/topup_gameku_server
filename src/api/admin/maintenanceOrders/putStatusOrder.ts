import { Config } from "@config/index";
import { ErrorType, ValidatorType } from "@enum/index";
import { BusinessError } from "@helper/handleError";
import { Validator } from "@helper/validator";
import { IApiRouter, Validation } from "@interfaces/index";
import { OrderService } from "@serviceInternal/order.service";
import { RequestHandler } from "express";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v1/order/:id";
const method = APIMethod.PUT;
const auth = APIAuth.ADMIN;

const schemaValidation: Validation[] = [
  {
    name: "id",
    type: "string",
    required: true,
  },
];

const main: RequestHandler = async (req, res) => {
  const io = req.io;
  const params = new Validator(req, res).process<{
    id: string;
  }>(schemaValidation, ValidatorType.PARAMS);

  const config = new Config();
  const orderService = new OrderService();
  const order = await orderService.findOneBy({
    column: "id",
    value: params.id,
  });

  if (!order) {
    throw new BusinessError("Pesanan tidak valid", ErrorType.BadRequest);
  }

  io.emit("order:success", order.id);

  return res.sendStatus(200);
};

export const putStatusOrder: IApiRouter = {
  path,
  method,
  main,
  auth,
};
