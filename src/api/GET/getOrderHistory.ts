import { Request, Response } from "express";
import { Validation, IApiRouter } from "@interfaces/index";
import {
  CustomerService,
  GameService,
  OrderService,
  ProductService,
} from "@serviceInternal/index";
import {
  ErrorType,
  OrderStatuses,
  OrderType,
  ValidatorType,
} from "@enum/index";
import { Validator } from "@helper/validator";
import { BusinessError } from "@helper/handleError";
import { CustomerEntity } from "@entity/customer.entity";
import { OrderDetailService } from "@serviceInternal/orderDetail.service";
import { InvoiceService } from "@serviceInternal/invoice.service";
import dayjs from "dayjs";
import { Config } from "@config/index";
import { Op } from "sequelize";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v1/order-history";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "invoice",
    type: "string",
    required: false,
  },
  {
    name: "mobileNumber",
    type: "string",
    required: false,
    isMobileNo: true,
  },
  {
    name: "telegramId",
    type: "string",
    required: false,
    isMobileNo: false,
  },
];
const main = async (req: Request, res: Response) => {
  const query = new Validator(req, res).process<{
    invoice?: string;
    mobileNumber?: string;
    telegramId?: string;
  }>(schemaValidation, ValidatorType.QUERY, true);

  if (!query.mobileNumber && !query.invoice && !query.telegramId) {
    throw new BusinessError(
      "Minimal harus ada nomor invoice, telegram id atau nomor whatsapp",
      ErrorType.BadRequest
    );
  }
  const customerService = new CustomerService();
  const config = new Config();
  let customer: CustomerEntity;
  if (query.mobileNumber) {
    customer = await customerService.model.findOne({
      where: {
        mobileNumber: query.mobileNumber,
        roleId: {
          [Op.in]: [config.roleGuest, config.roleUser],
        },
      },
    });
  } else if (query.telegramId) {
    customer = await customerService.model.findOne({
      where: {
        telegramId: query.telegramId,
        roleId: {
          [Op.in]: [config.roleGuest, config.roleUser],
        },
      },
    });
  }

  if ((query.mobileNumber || query.telegramId) && !customer) {
    return res.send({
      data: [],
      page: 1,
      total: 0,
      totalPage: 1,
      order: query.order,
      sort: query.sort,
      limit: query.limit,
    });
  }

  const orderService = new OrderService();
  const orderDetailService = new OrderDetailService();
  const productService = new ProductService();
  const gameService = new GameService();
  const invoiceService = new InvoiceService();

  const orders = await orderService.findManyByPagination(
    {
      column:
        query.mobileNumber || query.telegramId ? "customerId" : "invoiceId",
      value:
        query.mobileNumber || query.telegramId ? customer.id : query.invoice,
      only: [
        "id",
        "invoiceId",
        "game",
        "paymentMethod",
        "paymentMethodId",
        "productName",
        "totalAmt",
        "feeAmt",
        "discAmt",
        "status",
        "createdAt",
      ],
    },
    {
      page: query.page,
      sort: query.sort,
      order: query.order,
      limit: query.limit,
    },
    {
      column: "type",
      // @ts-ignore
      value: [OrderType.TOPUP, null],
    }
  );
  const invoiceId = orders.rows.map((data) => data.invoiceId);
  const invoices = await invoiceService.findManyBy({
    column: "id",
    value: invoiceId,
    operator: "in",
    only: ["id", "expiredAt"],
  });
  const orderId = orders.rows.map((data) => data.id);
  const ordersDetail = await orderDetailService.findManyBy({
    column: "orderId",
    value: orderId,
    operator: "in",
    only: ["orderId", "quantity", "productId"],
  });

  const productId = ordersDetail.map((data) => data.productId);
  const products = await productService.findManyBy({
    column: "id",
    value: productId,
    operator: "in",
    only: ["id", "name", "gameId"],
  });

  const gameId = products.map((data) => data.gameId);
  const games = await gameService.findManyBy({
    column: "id",
    value: gameId,
    operator: "in",
    only: ["id", "name", "logoUrl", "name"],
  });

  const newData = [];
  for (const order of orders.rows) {
    const invoice = invoices.find((data) => data.id === order.invoiceId);
    const orderDetail = ordersDetail.find((data) => data.orderId === order.id);
    const product = products.find((data) => data.id === orderDetail.productId);
    const game = games.find((data) => data.id === product.gameId);

    const dateNow = dayjs();
    const expiredDate = dayjs(invoice.expiredAt);

    newData.push({
      ...order.dataValues,
      logoUrl: game.logoUrl,
      quantity: orderDetail.quantity,
      status:
        expiredDate.isBefore(dateNow) &&
        order.status === OrderStatuses.PENDING_PAYMENT
          ? OrderStatuses.EXPIRED
          : order.status,
    });
  }

  return res.send({
    data: newData,
    page: query.page,
    total: orders.count,
    totalPage: Math.ceil(orders.count / query.limit),
    order: query.order,
    sort: query.sort,
    limit: query.limit,
  });
};

export const getOrderHistory: IApiRouter = {
  path,
  method,
  main,
  auth,
};
