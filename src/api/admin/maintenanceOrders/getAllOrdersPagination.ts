import { ProductDto } from "@dto/product.dto";
import { CustomerEntity } from "@entity/customer.entity";
import { OrderDetailEntity } from "@entity/orderDetail.entity";
import {
  OrderScope,
  OrderStatuses,
  OrderType,
  ValidatorType,
} from "@enum/index";
import { Validator } from "@helper/validator";
import { IApiRouter, Validation } from "@interfaces/index";
import { CustomerService } from "@serviceInternal/customer.service";
import { GameService } from "@serviceInternal/game.service";
import { InvoiceService } from "@serviceInternal/invoice.service";
import { OrderService } from "@serviceInternal/order.service";
import { OrderDetailService } from "@serviceInternal/orderDetail.service";
import { ProductService } from "@serviceInternal/product.service";
import dayjs from "dayjs";
import { RequestHandler } from "express";
import { Op, col, fn, literal } from "sequelize";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v1/orders";
const method = APIMethod.GET;
const auth = APIAuth.ADMIN;

const schemaValidation: Validation[] = [
  {
    name: "status",
    required: false,
    type: "string",
  },
  {
    name: "start",
    required: false,
    type: "string",
  },
  {
    name: "end",
    required: false,
    type: "string",
  },
  {
    name: "mobileNumber",
    required: false,
    type: "string",
    isMobileNo: true,
  },
  {
    name: "custName",
    required: false,
    type: "string",
  },
  {
    name: "invoiceId",
    required: false,
    type: "string",
  },
];

const main: RequestHandler = async (req, res) => {
  const query = new Validator(req, res).process<{
    status?: OrderStatuses;
    start?: string;
    end?: string;
    mobileNumber?: string;
    invoiceId: string;
    custName?: string;
  }>(schemaValidation, ValidatorType.QUERY, true);
  const clearQuery = JSON.parse(JSON.stringify(query));
  delete clearQuery.mobileNumber;
  delete clearQuery.custName;
  delete clearQuery.start;
  delete clearQuery.end;
  delete clearQuery.page;
  delete clearQuery.sort;
  delete clearQuery.order;
  delete clearQuery.limit;

  const orderService = new OrderService();
  const customerService = new CustomerService();
  const column = Object.keys(query);

  let where;
  if (column.length > 4) {
    let whereQuery = {
      ...clearQuery,
      ...(query.start &&
        query.end && {
          createdAt: {
            [Op.and]: [
              { [Op.gte]: dayjs(query.start).toDate() },
              { [Op.lte]: dayjs(query.end).toDate() },
            ],
          },
        }),
    };

    if (query.mobileNumber) {
      const cust = await customerService.findOneBy({
        column: "mobileNumber",
        value: query.mobileNumber,
      });

      if (!cust) {
        return res.send({
          data: [],
          page: query.page,
          total: 0,
          totalPage: Math.ceil(0 / query.limit),
          order: query.order,
          sort: query.sort,
          limit: query.limit,
          analytics: {
            reveneu: 0,
            fee: 0,
            discount: 0,
            orders: 0,
            countPaid: 0,
            countUnpaid: 0,
          },
        });
      }

      whereQuery = {
        ...whereQuery,
        customerId: cust.id,
      };
    }

    if (query.custName && query.custName.toLowerCase() === "guest") {
      const cust = await customerService.findManyBy({
        column: "isRegistered",
        value: false,
      });

      if (cust.length === 0) {
        return res.send({
          data: [],
          page: query.page,
          total: 0,
          totalPage: Math.ceil(0 / query.limit),
          order: query.order,
          sort: query.sort,
          limit: query.limit,
          analytics: {
            reveneu: 0,
            fee: 0,
            discount: 0,
            orders: 0,
            countPaid: 0,
            countUnpaid: 0,
          },
        });
      }

      whereQuery = {
        ...whereQuery,
        customerId: {
          [Op.in]: cust.map((item) => item.id),
        },
      };
    } else if (query.custName) {
      const cust = await customerService.findManyBy({
        column: "name",
        value: `%${query.custName}%`,
        operator: "like",
      });
      if (cust.length === 0) {
        return res.send({
          data: [],
          page: query.page,
          total: 0,
          totalPage: Math.ceil(0 / query.limit),
          order: query.order,
          sort: query.sort,
          limit: query.limit,
          analytics: {
            reveneu: 0,
            fee: 0,
            discount: 0,
            orders: 0,
            countPaid: 0,
            countUnpaid: 0,
          },
        });
      }
      whereQuery = {
        ...whereQuery,
        customerId: {
          [Op.in]: cust.map((item) => item.id),
        },
      };
    }

    where = whereQuery;
  }

  let order: any = [[query.sort, query.order]];

  const data = await orderService.model
    .scope(OrderScope.LOGGING)
    .findAndCountAll({
      where: {
        ...(where && where),
        type: {
          [Op.in]: [OrderType.TOPUP, null],
        },
      },
      order,
      offset: (query.page - 1) * query.limit,
      limit: query.limit,
    });

  if (data.count === 0) {
    return res.send({
      data: [],
      page: query.page,
      total: 0,
      totalPage: Math.ceil(0 / query.limit),
      order: query.order,
      sort: query.sort,
      limit: query.limit,
      analytics: {
        reveneu: 0,
        fee: 0,
        discount: 0,
        orders: data.count,
        countPaid: 0,
        countUnpaid: 0,
      },
    });
  }

  const customers = await customerService.findManyBy({
    column: "id",
    value: data.rows.map((item) => item.customerId),
    operator: "in",
  });

  let analytics = await orderService.model.findOne({
    attributes: [
      [literal("CAST(SUM(total_amt) AS SIGNED)"), "revenue"],
      [literal("CAST(SUM(fee_amt) AS SIGNED)"), "fee"],
      [literal("CAST(SUM(disc_amt) AS SIGNED)"), "discount"],
    ],
    where: {
      ...(query.start &&
        query.end && {
          createdAt: {
            [Op.and]: [
              { [Op.gte]: dayjs(query.start).toDate() },
              { [Op.lte]: dayjs(query.end).toDate() },
            ],
          },
        }),
      type: {
        [Op.in]: [OrderType.TOPUP, null],
      },
      status: OrderStatuses.SUCCESS,
    },
  });

  const countAll = await orderService.model.count({
    where: {
      ...(query.start &&
        query.end && {
          createdAt: {
            [Op.and]: [
              { [Op.gte]: dayjs(query.start).toDate() },
              { [Op.lte]: dayjs(query.end).toDate() },
            ],
          },
        }),
      type: {
        [Op.in]: [OrderType.TOPUP, null],
      },
    },
  });

  const countUnpaid = await orderService.model.count({
    where: {
      ...(query.start &&
        query.end && {
          createdAt: {
            [Op.and]: [
              { [Op.gte]: dayjs(query.start).toDate() },
              { [Op.lte]: dayjs(query.end).toDate() },
            ],
          },
        }),
      status: OrderStatuses.PENDING_PAYMENT,
      type: {
        [Op.in]: [OrderType.TOPUP, null],
      },
    },
  });

  const countPaid = await orderService.model.count({
    where: {
      ...(query.start &&
        query.end && {
          createdAt: {
            [Op.and]: [
              { [Op.gte]: dayjs(query.start).toDate() },
              { [Op.lte]: dayjs(query.end).toDate() },
            ],
          },
        }),
      status: OrderStatuses.SUCCESS,
      type: {
        [Op.in]: [OrderType.TOPUP, null],
      },
    },
  });

  const orderId = data.rows.map((data) => data.id);

  const orderDetailService = new OrderDetailService();
  const orderDetail = await orderDetailService.findManyBy({
    column: "orderId",
    value: orderId,
    operator: "in",
  });

  const productService = new ProductService();
  const products = await productService.findManyBy({
    column: "id",
    value: orderDetail.map((item) => item.productId),
    operator: "in",
    only: ["id", "gameId"],
  });

  const gameService = new GameService();
  const games = await gameService.findManyBy({
    column: "id",
    value: products.map((item) => item.gameId),
    operator: "in",
  });

  const invoiceService = new InvoiceService();
  const invoices = await invoiceService.findManyBy({
    column: "id",
    value: data.rows.map((item) => item.invoiceId),
    operator: "in",
  });

  const newData = data.rows.map((item) => {
    const detail = orderDetail.find((detail) => item.id === detail.orderId);
    const customer = customers.find((cust) => cust.id === item.customerId);
    const product = products.find((prod) => prod.id === detail.productId);
    const game = games.find((game) => game.id === product.gameId);
    const invoice = invoices.find((inv) => inv.id === item.invoiceId);
    let status = item.status;

    if (
      status === OrderStatuses.PENDING_PAYMENT &&
      dayjs().isAfter(dayjs(invoice.expiredAt))
    ) {
      status = OrderStatuses.EXPIRED;
    }
    return {
      ...item.dataValues,
      mobileNumber: customer.mobileNumber,
      custName: customer.isRegistered ? customer.name : "Guest",
      productId: detail.productId,
      logoUrl: game.logoUrl,
      quantity: detail.quantity,
      username: detail.username,
      status,
      detail,
    };
  });

  return res.send({
    data: newData,
    page: query.page,
    total: data.count,
    totalPage: Math.ceil(data.count / query.limit),
    order: query.order,
    sort: query.sort,
    limit: query.limit,
    analytics: {
      ...analytics.dataValues,
      orders: countAll,
      countPaid,
      countUnpaid,
    },
  });
};

export const getAllOrdersPagination: IApiRouter = {
  main,
  path,
  method,
  auth,
};
