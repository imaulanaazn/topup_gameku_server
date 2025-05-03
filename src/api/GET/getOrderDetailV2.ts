import { RequestHandler } from "express";
import { IApiRouter, Validation } from "@interfaces/index";
import { Validator } from "@helper/validator";
import {
  ErrorType,
  InvoiceStatuses,
  OrderStatuses,
  OrderType,
  ValidatorType,
} from "@enum/index";
import { BusinessError } from "@helper/handleError";
import { InvoiceService } from "@serviceInternal/invoice.service";
import dayjs from "dayjs";
import { SysConfigService } from "@serviceInternal/sysConfig.service";
import { Op } from "sequelize";
import { OrderDetailEntity } from "@entity/orderDetail.entity";
import { ProductEntity } from "@entity/product.entity";
import { GameEntity } from "@entity/game.entity";
import { PaymentMethodEntity } from "@entity/paymentMethod.entity";
import { OrderEntity } from "@entity/order.entity";
import { APIAuth, APIMethod } from "@enum/index";
import { MidtransService } from "@serviceExternal/midtrans.service";
import { RedisService } from "@serviceExternal/redis.service";

const path = "/v2/order-detail/:invoice";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "invoice",
    type: "string",
    required: true,
  },
];

const main: RequestHandler = async (req, res) => {
  const param = new Validator(req, res).process<{
    invoice: string;
  }>(schemaValidation, ValidatorType.PARAMS);

  const invoiceService = new InvoiceService();
  const invoice = await invoiceService.model.findOne({
    where: {
      id: param.invoice,
    },
    include: [
      {
        model: OrderEntity,
        required: true,
        where: {
          type: {
            [Op.in]: [OrderType.TOPUP, null, OrderType.BUY],
          },
        },
        attributes: [
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
        include: [
          {
            model: PaymentMethodEntity,
            required: true,
            // where: {
            //     providerCd: {
            //         [Op.notIn]: ["INTERNAL"],
            //     },
            // },
          },
          {
            model: OrderDetailEntity,
            required: true,
            include: [
              {
                model: ProductEntity,
                required: false,
                include: [
                  {
                    model: GameEntity,
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!invoice) {
    throw new BusinessError("Nomor Invoice Tidak Valid", ErrorType.NotFound);
  }

  const sysConfigService = new SysConfigService();
  const sysConfig = await sysConfigService.findManyBy({
    column: "cd",
    value: ["logo"],
    operator: "in",
  });
  const logo = sysConfig.find((item) => item.cd === "logo");

  let paymentData = {
    mobileNumber: undefined,
    checkoutUrl: undefined,
    qrString: undefined,
    paymentCode: undefined,
  };

  if (invoice.order.status === OrderStatuses.PENDING_PAYMENT) {
    if (invoice.order.payment.providerCd === "MIDTRANS") {
      const midtransService = new MidtransService();
      let trx;
      const dataFromRedis = ["qris", "shopeepay", "gopay"];
      if (!dataFromRedis.includes(invoice.order.payment.cd)) {
        trx = await midtransService.getTransactionStatus(invoice.id);
      }

      const paymentCode = [
        "bca",
        "bni",
        "bri",
        "cimb",
        "permata",
        "indomaret",
        "alfamart",
      ];
      const ewalletGroup = ["shopeepay", "gopay"];
      if (paymentCode.includes(invoice.order.payment.cd)) {
        paymentData.paymentCode =
          trx?.payment_code ||
          trx?.permata_va_number ||
          trx.va_numbers[0]?.va_number ||
          "";
      } else if (invoice.order.payment.cd === "mandiri") {
        paymentData.paymentCode = `${trx?.biller_code || ""} ${
          trx?.bill_key || ""
        }`;
      } else if (invoice.order.payment.cd === "qris") {
        const redisService = new RedisService();
        const data = await redisService.get(`qr:payment:${invoice.id}`);
        paymentData.qrString = data || "";
      } else if (ewalletGroup.includes(invoice.order.payment.cd)) {
        const redisService = new RedisService();
        const data = await redisService.get(`qr:payment:${invoice.id}`);
        paymentData.checkoutUrl = data || "";
      }
    }
  }

  res.send({
    order: {
      invoiceId: invoice.id,
      totalAmt: invoice.order.totalAmt,
      feeAmt: invoice.order.feeAmt,
      discAmt: invoice.order.discAmt,
      status:
        dayjs(invoice.expiredAt).isBefore(dayjs()) &&
        invoice.status === InvoiceStatuses.PENDING
          ? OrderStatuses.EXPIRED
          : invoice.order.status,
      userId: invoice.order.orderDetail.userId,
      serverId: invoice.order.orderDetail.serverId,
      amount: invoice.order.orderDetail.amount,
      quantity: invoice.order.orderDetail.quantity,
      username: invoice.order.orderDetail.username,
      createdAt: invoice.order.createdAt,
      completedAt: invoice.order.completedAt,
    },
    payment: {
      name: invoice.order.payment.name,
      cd: invoice.order.payment.cd,
      logo: invoice.order.payment.logo,
      paymentGuide: invoice.order.payment.paymentGuide,
      action: paymentData,
      expiredAt: invoice.expiredAt,
    },
    product: {
      name: invoice.order.orderDetail?.product?.name || "-",
      logoDenom:
        invoice.order.orderDetail?.product?.logoDenom ||
        invoice.order.orderDetail?.product?.game?.logoDenom ||
        invoice.order.orderDetail?.product?.game?.logoUrl ||
        logo.value,
    },
    game: {
      name: invoice.order.orderDetail.product?.game?.name || "-",
      logoUrl: invoice.order.orderDetail.product?.game?.logoUrl || logo.value,
    },
  });
};

export const getOrderDetailV2: IApiRouter = {
  path,
  method,
  main,
  auth,
};
