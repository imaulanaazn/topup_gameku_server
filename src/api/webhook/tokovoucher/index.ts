import { RequestHandler } from "express";
import { IApiRouter } from "src/interfaces";
import { OrderService } from "@serviceInternal/order.service";
import {
  OrderStatuses,
  VoucherType,
  ResponseCodeDigiflazzOrder,
} from "@enum/index";
import dayjs from "dayjs";
import { OrderDetailService } from "@serviceInternal/orderDetail.service";
import { CustomerService } from "@serviceInternal/customer.service";
import { Config } from "@config/index";
import { ProductService } from "@serviceInternal/product.service";
import { GameService } from "@serviceInternal/game.service";
import { APIAuth, APIMethod } from "@enum/index";
import { PaymentMethodService } from "@serviceInternal/paymentMethod.service";
import { v4 as uuid } from "uuid";

const path = "/v1/webhook/tokovoucher";
const method = APIMethod.GET;
const auth = APIAuth.WEBHOOK_TOKOVOUCHER;

const main: RequestHandler = async (req, res) => {
  console.log("WEBHOOK BODY" + req.body);
  const io = req.io;
  const body: {
    status: "sukses" | "pending" | "gagal";
    message: string;
    sn: string;
    ref_id: string;
    trx_id: string;
    produk: string;
    sisa_saldo: number;
    price: number;
  } = req.body;
  const extTrxId = body.trx_id;
  const orderService = new OrderService();
  // const orderDetailService = new OrderDetailService();
  // const customerService = new CustomerService();
  // const config = new Config();

  const order = await orderService.model.scope("withAmtBuy").findOne({
    where: {
      invoiceId: body.ref_id,
      extTrxId,
    },
  });

  if (!order) {
    console.log("@@ Error Order tidak valid dengan ID = " + extTrxId);
    return;
  }

  // const orderDetail = await orderDetailService.findOneBy({
  //   column: "orderId",
  //   value: order.id,
  // });

  // const productService = new ProductService();
  // const product = await productService.findOneBy({
  //   column: "id",
  //   value: orderDetail.productId,
  // });

  // const gameService = new GameService();
  // const game = await gameService.findOneBy({
  //   column: "id",
  //   value: product.gameId,
  // });

  // const customer = await customerService.findOneBy({
  //   column: "id",
  //   value: order.customerId,
  // });

  // const paymentMethodService = new PaymentMethodService();
  // const paymentMethod = await paymentMethodService.model.findOne({
  //   where: {
  //     id: order.paymentMethodId,
  //   },
  // });

  if (body.status === "sukses") {
    console.log("SUKSES");
    await orderService.updateBy({
      by: "id",
      value: order.id,
      data: {
        status: OrderStatuses.SUCCESS,
        completedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
    });

    const response = await fetch(
      `http://localhost:3001/api/v2/order-detail/${body.ref_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const orderDetail = await response.json();
    if (Object.keys(orderDetail).includes("order")) {
      return res.status(200).send(orderDetail);
    } else {
      return;
    }
  } else if (body.status === "pending") {
    console.log("PENDING");
    await orderService.updateBy({
      by: "id",
      value: order.id,
      data: {
        status: OrderStatuses.PROCESSING,
      },
    });

    return;
  } else {
    console.log("GAGAL");
    await orderService.updateBy({
      by: "id",
      value: order.id,
      data: {
        status: OrderStatuses.FAILED,
        remark:
          body.message || "Failed to process order due to an unknown error",
      },
    });

    io.emit("order:failed", order.id);
  }
};

export const webhookTokoVoucher: IApiRouter = {
  path,
  method,
  main,
  auth,
};
