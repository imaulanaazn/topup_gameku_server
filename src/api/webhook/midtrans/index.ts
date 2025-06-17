import { RequestHandler } from "express";
import { IApiRouter } from "src/interfaces";
import { OrderService } from "@serviceInternal/order.service";
import { Config } from "@config/index";
import { APIAuth, APIMethod, ErrorType, InvoiceStatuses } from "@enum/index";
import { InvoiceService } from "@serviceInternal/invoice.service";
import { CustomerEntity, OrderEntity } from "@entity/index";
import { BusinessError } from "@helper/handleError";

const path = "/v1/webhook/midtrans";
const method = APIMethod.POST;
const auth = APIAuth.WEBHOOK_MIDTRANS;

const main: RequestHandler = async (req, res) => {
  const body = req.body;
  console.log(
    `WEBHOOK ${body.payment_type} ${body.transaction_status} diterima [${body.order_id}]`
  );

  const config = new Config();
  const orderService = new OrderService();
  const invoiceService = new InvoiceService();
  const invoice = await invoiceService.model.findOne({
    where: {
      id: body.order_id,
    },
    include: [
      {
        model: OrderEntity,
        required: true,
        include: [
          {
            model: CustomerEntity,
            required: true,
          },
        ],
      },
    ],
  });

  if (!invoice) {
    throw new BusinessError(
      `Invoice tidak ditemukan dengan invoice: ${body.order_id}`,
      ErrorType.Internal
    );
  }

  res.send({ status: true });

  if (
    body.transaction_status === "settlement" &&
    invoice.status !== InvoiceStatuses.PAID
  ) {
    console.log("meow");
    console.log({
      customerId: invoice.order.customer.id,
      orderId: invoice.order.id,
      invoiceId: invoice.id,
    });
    const res = await fetch(
      `http://localhost:${config.port}/api/v1/gameku/process-order-success`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-gameku-key": config.xApiKeyProcessOrder,
        },
        body: JSON.stringify({
          customerId: invoice.order.customer.id,
          orderId: invoice.order.id,
          invoiceId: invoice.id,
        }),
      }
    );

    console.log(await res.text());

    return;
  }
};

export const webhookMidtrans: IApiRouter = {
  path,
  method,
  main,
  auth,
};
