import { Request, Response } from "express";
import { Validation, IApiRouter } from "@interfaces/index";
import { OrderService } from "@serviceInternal/index";
import { ErrorType, OrderStatuses, ValidatorType } from "@enum/index";
import { OrderDetailService } from "@serviceInternal/orderDetail.service";
import dayjs from "dayjs";
import { Config } from "@config/index";
import { APIAuth, APIMethod } from "@enum/index";
import * as crypto from "crypto";
import { BusinessError } from "@helper/handleError";
import { Validator } from "@helper/validator";

const path = "/v1/order-status/:invoice";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "invoice",
    type: "string",
    required: false,
  },
];
const main = async (req: Request, res: Response) => {
  const io = req.io;
  const param = new Validator(req, res).process<{
    invoice: string;
  }>(schemaValidation, ValidatorType.PARAMS);
  const invoiceId = param.invoice;
  const orderService = new OrderService();
  const config = new Config();

  const memberCode = config.tokoVoucherMemberCode;
  const secretKey = config.tokoVoucherSecretKey;
  const signature = crypto
    .createHash("md5")
    .update(`${memberCode}:${secretKey}:${invoiceId}`)
    .digest("hex");

  const response = await fetch(
    `${config.tokoVoucherUrl}/v1/transaksi/status?ref_id=${invoiceId}&member_code=${memberCode}&signature=${signature}`,
    {
      headers: {
        "content-type": "application/json",
      },
      method: "GET",
    }
  );

  const orderFromTokoVoucher = await response.json();

  console.log("Response : " + orderFromTokoVoucher.status);
  if (!orderFromTokoVoucher.status) {
    throw new BusinessError(
      orderFromTokoVoucher.error_msg || "Gagal mendapatkan status order",
      ErrorType.BadRequest
    );
  }

  const order = await orderService.model.scope("withAmtBuy").findOne({
    where: {
      invoiceId: orderFromTokoVoucher.ref_id,
      extTrxId: orderFromTokoVoucher.trx_id,
    },
  });

  if (!order) {
    throw new BusinessError(
      "Tidak ditemukan order dengan trx id : " + orderFromTokoVoucher.trx_id,
      ErrorType.NotFound
    );
  }

  if (orderFromTokoVoucher.status === "sukses") {
    await orderService.updateBy({
      by: "id",
      value: order.id,
      data: {
        status: OrderStatuses.SUCCESS,
        completedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      },
    });
  } else if (orderFromTokoVoucher.status === "pending") {
    await orderService.updateBy({
      by: "id",
      value: order.id,
      data: {
        status: OrderStatuses.PROCESSING,
      },
    });
    return;
  } else {
    await orderService.updateBy({
      by: "id",
      value: order.id,
      data: {
        status: OrderStatuses.FAILED,
        remark:
          orderFromTokoVoucher.message ||
          "Failed to process order due to an unknown error",
      },
    });

    io.emit("order:failed", order.id);
  }

  return res.status(200).send({
    status: "success",
    message: "Berhasil mendapatkan status order",
    data: {
      invoiceId: orderFromTokoVoucher.ref_id,
      trxId: orderFromTokoVoucher.trx_id,
      status: orderFromTokoVoucher.status,
    },
  });
};

export const getOrderStatus: IApiRouter = {
  path,
  method,
  main,
  auth,
};
