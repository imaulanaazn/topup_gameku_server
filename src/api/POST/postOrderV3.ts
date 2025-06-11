import { RequestHandler } from "express";
import {
  CustomerService,
  GameService,
  OrderService,
  PaymentMethodService,
  ProductService,
} from "@serviceInternal/index";
import { Config } from "@config/index";
import {
  CustomerStatuses,
  EncryptJoseType,
  ErrorStatusCode,
  ErrorType,
  FeeType,
  InvoiceStatuses,
  OrderStatuses,
  OrderType,
  PaymentsCategory,
  ServerIdType,
  ValidatorType,
} from "@enum/index";
import { v4 as uuid } from "uuid";
import { BusinessError } from "@helper/handleError";
import { Validation, IApiRouter } from "@interfaces/index";
import { Validator } from "@helper/validator";
import { InvoiceService } from "@serviceInternal/invoice.service";
import { OrderDetailService } from "@serviceInternal/orderDetail.service";
import dayjs from "dayjs";
import validator from "validator";
import { SysConfigService } from "@serviceInternal/sysConfig.service";
import { ListServerService } from "@serviceInternal/listServer.service";
import { Op } from "sequelize";
import { getIpAddress } from "@helper/getIpAddress";
import { APIAuth, APIMethod } from "@enum/index";
import { EncryptionService } from "@serviceInternal/jose.service";
import { CustomerDto } from "@dto/customer.dto";
import { MidtransService } from "@serviceExternal/midtrans.service";
import { RedisService } from "@serviceExternal/redis.service";

const path = "/v3/order";
const method = APIMethod.POST;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "userId",
    type: "string",
    required: false,
  },
  {
    name: "serverId",
    type: "string",
    required: false,
  },
  {
    name: "productId",
    type: "string",
    required: true,
  },
  {
    name: "quantity",
    type: "number",
    required: true,
    maxNumber: 100,
  },
  {
    name: "paymentId",
    type: "string",
    required: true,
  },
  {
    name: "telegramId",
    type: "string",
    required: true,
  },
  {
    name: "cashtag",
    type: "string",
    required: false,
  },
  {
    name: "customerId",
    type: "string",
    required: false,
  },
];
const main: RequestHandler = async (req, res) => {
  const ip = req.ip;
  const body = new Validator(req, res).process<{
    userId?: string;
    serverId?: string;
    productId: string;
    quantity: number;
    paymentId: string;
    telegramId: string;
    cashtag?: string;
    customerId?: string;
  }>(schemaValidation, ValidatorType.BODY);
  console.log("REQUEST BODY ORDER");
  console.log(body);
  console.log(req.headers["x-forwarded-for"]);
  const clientIp = getIpAddress(req);
  console.log(clientIp);
  console.log(ip);
  const io = req.io;
  body.userId = body.userId.trimEnd();
  body.serverId = body.serverId?.trimEnd();

  if (body.quantity <= 1) {
    body.quantity = 1;
  }

  const productService = new ProductService();
  const paymentMethodService = new PaymentMethodService();
  const orderService = new OrderService();
  const customerService = new CustomerService();
  const invoiceService = new InvoiceService();
  const orderDetailService = new OrderDetailService();
  const gameService = new GameService();
  const config = new Config();

  console.log("REQUEST ORDER");

  if (!body.telegramId) {
    throw new BusinessError(
      "Telegram ID tidak boleh diisi pada order ini",
      ErrorType.BadRequest
    );
  }

  let customer;

  customer = await customerService.model.findOne({
    where: {
      telegramId: body.telegramId,
      roleId: {
        [Op.in]: [config.roleGuest, config.roleUser],
      },
    },
  });

  if (!customer && body.telegramId) {
    customer = await customerService.create({
      id: uuid(),
      roleId: config.roleGuest,
      telegramId: body.telegramId,
      isActive: true,
      isRegistered: false,
      status: CustomerStatuses.ACTIVE,
      loginAttemps: 0,
      lockUntil: null,
    });
  }

  const payment = await paymentMethodService.model.findOne({
    where: {
      id: body.paymentId,
      deleted: false,
      isActive: true,
    },
  });
  // const payment = await paymentMethodService.findOneBy({
  //     column: "id",
  //     value: body.paymentId,
  // });

  if (!payment) {
    throw new BusinessError(
      "Metode Pembayaran tidak valid",
      ErrorType.NotFound
    );
  }

  if (payment.cd === "ID_JENIUSPAY" && !body.cashtag) {
    throw new BusinessError(
      "Cashtag harus di isi jika memilih pembayaran via Jenius pay",
      ErrorType.Validation
    );
  }

  const product = await productService.findOneBy({
    column: "id",
    value: body.productId,
  });

  if (!product) {
    throw new BusinessError("Produk ID tidak valid", ErrorType.NotFound);
  }

  const game = await gameService.findOneBy({
    column: "id",
    value: product.gameId,
  });

  const gamesNeedClearSeverId = ["mobilelegends", "ML"];
  if (gamesNeedClearSeverId.includes(game.cd)) {
    body.serverId = body.serverId.replace(/[^0-9]/g, "");
  }

  let serverName = body.serverId;
  if (game.typeServerId === ServerIdType.LIST) {
    const serverIdService = new ListServerService();
    const serverId = await serverIdService.findOneBy({
      column: "value",
      value: body.serverId,
    });

    if (serverId) {
      serverName = serverId.label;
    }
  }
  let discount = 0;
  let voucher;

  let fee = 0;
  if (payment.feeType === FeeType.AMOUNT) {
    fee = payment.fee;
  } else if (payment.feeType === FeeType.PERCENTAGE) {
    fee = Math.ceil((product.price * body.quantity * payment.fee) / 100);
  } else {
    throw new BusinessError(
      "Sepertinya ada kesalahan, silahkan coba beberapa saat lagi [FEE]",
      ErrorType.Internal
    );
  }

  let amount = Math.ceil(product.price * body.quantity - discount + fee);

  if (amount < payment.minAmount || amount > payment.maxAmount) {
    throw new BusinessError(
      "Pembayaran tidak dapat diproses karena tidak memenuhi syarat jumlah pembayaran.",
      ErrorType.BadRequest
    );
  }

  if (payment.providerCd === "TOKOPAY" && payment.category === "6") {
    const newAmount = Math.ceil(amount / 1000) * 1000;
    fee = fee + newAmount - amount;
    amount = newAmount;
  }

  let checkUsername;
  if (game.needCheckId) {
    // const checkingGameService = new CheckingGameIdService();
    // const checkGameId = await checkingGameService.checking({
    //     gameCd: game.cd,
    //     userId: body.userId,
    //     ...(body.serverId && { serverId: body.serverId }),
    // });

    // if (!checkGameId) {
    //     throw new BusinessError(
    //         `User ID ${game.needServerId ? "Atau Server ID" : ""} tidak valid`,
    //         ErrorType.BadRequest,
    //     );
    // }
    // if (game.cd === "VALORANT") {
    //     username = body.userId?.split("#")[0] || body.userId;
    // } else {
    //     username = checkGameId;
    // }

    if (checkUsername.status === 0) {
      throw new BusinessError(
        "User ID tidak valid, silahkan check kembali dan coba lagi",
        ErrorType.BadRequest
      );
    }

    if (
      !checkUsername?.data?.is_valid ||
      checkUsername.error_msg === "Wrong Player ID"
    ) {
      throw new BusinessError(
        "User ID tidak valid, silahkan check kembali dan coba lagi",
        ErrorType.BadRequest
      );
    } else if (!checkUsername.data.username) {
      throw new BusinessError(
        "User ID tidak valid, silahkan check kembali dan coba lagi",
        ErrorType.BadRequest
      );
    }
  }

  const invoiceId = `INV${new Date().getTime()}`;
  const expiredAt = dayjs()
    .tz("Asia/Jakarta")
    .add(payment.durationExpired, payment.durationCd)
    .toDate();

  const checkingOrder = await orderService.model.count({
    where: {
      customerId: customer.id,
      type: {
        [Op.in]: [OrderType.TOPUP, null],
      },
    },
  });

  await invoiceService.create({
    id: invoiceId,
    status: InvoiceStatuses.PENDING,
    expiredAt,
  });

  const order = await orderService.create({
    id: uuid(),
    customerId: customer.id,
    invoiceId,
    paymentMethodId: payment.id,
    totalAmt: amount,
    feeAmt: fee,
    discAmt: discount,
    status: OrderStatuses.PENDING_PAYMENT,
    game: game.name,
    productName: product.name,
    paymentMethod: payment.name,
    amtBuy: Math.ceil(product.price * body.quantity),
    type: OrderType.TOPUP,
    ipAddress: clientIp,
    isNew: checkingOrder <= 0,
  });

  const orderDetail = await orderDetailService.create({
    id: uuid(),
    orderId: order.id,
    productId: product.id,
    userId: body.userId || "",
    serverId: serverName || "",
    amount: product.price,
    quantity: body.quantity,
    webhookCount: 0,
    // username: username || null,
    username: checkUsername?.data?.username || null,
  });

  if (payment.providerCd === "MIDTRANS") {
    const midtransService = new MidtransService();
    let charge;
    if (payment.category === PaymentsCategory.VIRTUAL_ACCOUNT) {
      charge = await midtransService.createVirtualAccount({
        order,
        orderDetail,
        paymentMethod: payment,
        customer,
      });
    } else if (payment.category === PaymentsCategory.QRIS) {
      charge = await midtransService.createQris({
        order,
        orderDetail,
        paymentMethod: payment,
        customer,
      });

      const redisService = new RedisService();
      redisService.set(
        `qr:payment:${invoiceId}`,
        charge?.qr_string || "",
        15 * 60
      );
    } else if (payment.category === PaymentsCategory.EWALLET) {
      charge = await midtransService.createEWallet({
        order,
        orderDetail,
        paymentMethod: payment,
        customer,
      });

      const redisService = new RedisService();
      const getLink = charge?.actions?.find(
        (item) => item.name === "deeplink-redirect"
      );
      redisService.set(`qr:payment:${invoiceId}`, getLink?.url || "", 15 * 60);
    }
    if (charge) {
      await invoiceService.updateBy({
        by: "id",
        value: invoiceId,
        data: {
          xenditId: null,
          expiredAt: dayjs(charge.expiry_time).toDate(),
        },
      });
    } else {
      await orderService.updateBy({
        by: "id",
        value: order.id,
        data: {
          status: OrderStatuses.FAILED,
        },
      });

      await invoiceService.updateBy({
        by: "id",
        value: invoiceId,
        data: {
          status: InvoiceStatuses.FAILED,
        },
      });
      throw new BusinessError(
        "Sepertinya ada kesalahan dalam pembayaran, silahkan coba beberapa saat lagi",
        ErrorType.Internal
      );
    }
  }

  return res.send({
    invoice: invoiceId,
    expiredAt,
  });
};

export const postOrderV3: IApiRouter = {
  path,
  method,
  main,
  auth,
};
