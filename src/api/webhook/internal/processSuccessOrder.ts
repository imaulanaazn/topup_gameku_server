import { Config } from "@config/index";
import {
  InvoiceStatuses,
  OrderStatuses,
  OrderType,
  ValidatorType,
} from "@enum/index";
import { Validator } from "@helper/validator";
import { IApiRouter, Validation } from "@interfaces/index";
import { GameService } from "@serviceInternal/game.service";
import { InvoiceService } from "@serviceInternal/invoice.service";
import { OrderService } from "@serviceInternal/order.service";
import { OrderDetailService } from "@serviceInternal/orderDetail.service";
import { ProductService } from "@serviceInternal/product.service";
import { SysConfigService } from "@serviceInternal/sysConfig.service";
import { RequestHandler } from "express";
import { config } from "winston";
import { v4 as uuid } from "uuid";
import { ProviderService } from "@serviceInternal/provider.service";
import { OrderPending3rdPartyService } from "@serviceInternal/orderPending3rdParty.service";
import { APIAuth, APIMethod } from "@enum/index";
import { PaymentMethodService } from "@serviceInternal/paymentMethod.service";
import { TokoVoucherService } from "@serviceExternal/tokoVoucher.service";
import * as crypto from "crypto";

const path = "/v1/gameku/process-order-success";
const method = APIMethod.POST;
const auth = APIAuth.WEBHOOK_INTERNAL;

const schemaValidation: Validation[] = [
  {
    name: "orderId",
    required: true,
    type: "string",
  },
  {
    name: "invoiceId",
    required: true,
    type: "string",
  },
  {
    name: "customerId",
    required: true,
    type: "string",
  },
];

const main: RequestHandler = async (req, res) => {
  const io = req.io;
  const body = new Validator(req, res).process<{
    customerId: string;
    orderId: string;
    invoiceId: string;
  }>(schemaValidation, ValidatorType.BODY);

  const config = new Config();
  const invoiceService = new InvoiceService();
  const orderService = new OrderService();
  const paymentMethodService = new PaymentMethodService();
  const sysConfigService = new SysConfigService();
  const configDb = await sysConfigService.findManyBy({
    column: "cd",
    value: [
      "api_games_merchant_id",
      "api_games_secret_key",
      "api_key_digiflazz",
      "username_digiflazz",
      "api_key_lapakgaming",
      "kupon_apikey",
    ],
    operator: "in",
  });

  const order = await orderService.model.scope("withAmtBuy").findOne({
    where: {
      id: body.orderId,
    },
  });

  const paymentMethod = await paymentMethodService.model.findOne({
    where: {
      id: order.paymentMethodId,
    },
  });

  const invoice = await invoiceService.findOneBy({
    column: "id",
    value: body.invoiceId,
  });

  await invoiceService.updateBy({
    by: "id",
    value: invoice.id,
    data: {
      status: InvoiceStatuses.PAID,
    },
  });

  await orderService.updateBy({
    by: "id",
    value: order.id,
    data: {
      status: OrderStatuses.PENDING_ORDER,
    },
  });

  const orderDetailService = new OrderDetailService();
  const orderDetail = await orderDetailService.findOneBy({
    column: "orderId",
    value: order.id,
  });

  res.sendStatus(200);
  if (order.type === OrderType.TOPUP) {
    console.log("@@ Process order Topup");
    const productService = new ProductService();
    const product = await productService.model.scope("withPriceBuy").findOne({
      where: {
        id: orderDetail.productId,
      },
    });

    const gameService = new GameService();
    const game = await gameService.findOneBy({
      column: "id",
      value: product.gameId,
    });

    const providerService = new ProviderService();
    const productProvider = await providerService.findOneBy({
      column: "id",
      value: game.provider,
    });

    // if (
    //   process.env.NODE_ENV.toLowerCase() === "development" ||
    //   !process.env.NODE_ENV
    // ) {
    //   await orderService.updateBy({
    //     by: "id",
    //     value: order.id,
    //     data: {
    //       status: OrderStatuses.SUCCESS,
    //     },
    //   });

    //   return;
    //   const customerService = new CustomerService();
    //   const customer = await customerService.model.findOne({
    //     where: {
    //       id: order.customerId,
    //     },
    //   });
    //   if (customer.isRegistered) {
    //     const fundService = new FundService();
    //     let fund = await fundService.findOneBy({
    //       column: "customerId",
    //       value: customer.id,
    //     });

    //     // await fundService.updateBy({
    //     //     by: "customerId",
    //     //     value: customer.id,
    //     //     data: {
    //     //         value: Math.ceil(fund.value + order.amtBuy),
    //     //     },
    //     // });
    //   }

    //   return;
    // }

    if (product.automatically) {
      await orderService.updateBy({
        by: "id",
        value: order.id,
        data: {
          status: OrderStatuses.PROCESSING,
        },
      });

      if (productProvider.cd === "TOKO_VOUCHER") {
        console.log(
          `@@@ GAME ORDER OTOMATIS TO TOKOVOUCHER ${order.game} ${order.productName} total ${orderDetail.quantity}`
        );

        const secretKey = config.tokoVoucherSecretKey;
        const signature = crypto
          .createHash("md5")
          .update(
            `${config.tokoVoucherMemberCode}:${config.tokoVoucherSecretKey}:${order.invoiceId}`
          )
          .digest("hex");
        const memberCode = config.tokoVoucherMemberCode;

        const tokoVoucherService = new TokoVoucherService(
          secretKey,
          signature,
          memberCode
        );
        const body = {
          product,
          userId: orderDetail.userId || "",
          serverId: orderDetail.serverId || "",
          invoiceId: order.invoiceId,
        };
        console.log("Body Request Create TRX to Toko Voucher");
        console.log(body);
        const createTrx = await tokoVoucherService.createOrder(body);
        console.log(createTrx);

        if (createTrx.status === "sukses" || createTrx.status === "pending") {
          await orderService.updateBy({
            by: "id",
            value: order.id,
            data: {
              extTrxId: createTrx.trx_id,
            },
          });

          const orderPending3rdParty = new OrderPending3rdPartyService();
          await orderPending3rdParty.create({
            id: uuid(),
            providerId: productProvider.id,
            extInvoiceNumber: createTrx.ref_id,
          });
        } else if (createTrx.status === "gagal") {
          await orderService.updateBy({
            by: "id",
            value: order.id,
            data: {
              isError: true,
              isCanResend: false,
              remark: createTrx.message + " (Infokan developer)",
              extTrxId: createTrx.trx_id,
            },
          });
        } else {
          await orderService.updateBy({
            by: "id",
            value: order.id,
            data: {
              isError: true,
              isCanResend: false,
              remark: createTrx.message + " (Infokan developer)",
            },
          });
        }
        return;
      }
    }
  }
};

export const processSuccessOrder: IApiRouter = {
  main,
  method,
  auth,
  path,
  xApiKey: new Config().xApiKeyProcessOrder,
};
