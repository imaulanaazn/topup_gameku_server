import { Config } from "@config/index";
import { CustomerDto } from "@dto/customer.dto";
import { GameDto } from "@dto/game.dto";
import { OrderDto } from "@dto/order.dto";
import { OrderDetailDto } from "@dto/orderDetail.dto";
import { PaymentMethodDto } from "@dto/paymentMethod.dto";
import { ProductDto } from "@dto/product.dto";
import fetch, { RequestInit } from "node-fetch";

interface ICreateTRX {
  paymentMethod: Partial<PaymentMethodDto>;
  customer: Partial<CustomerDto>;
  order: Partial<OrderDto>;
  orderDetail: Partial<OrderDetailDto>;
}

export class MidtransService {
  private readonly baseUrl: string;
  private readonly serverKey: string;
  private readonly config: Config;

  constructor() {
    const config = new Config();
    this.baseUrl = config.midtransUrl;
    this.serverKey = config.midtransServerKey;
    this.config = config;
  }

  private async request(endpoint: string, options: RequestInit): Promise<any> {
    const authHeader = `Basic ${Buffer.from(`${this.serverKey}:`).toString(
      "base64"
    )}`;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.status_message || "Request failed");
      }

      return response.json();
    } catch (error: any) {
      console.error("Error during API request:", error.message);
      throw error;
    }
  }

  async createVirtualAccount(data: ICreateTRX): Promise<any> {
    try {
      const body = {
        payment_type:
          data.paymentMethod.cd === "mandiri" ? "echannel" : "bank_transfer",
        transaction_details: {
          gross_amount: data.order.totalAmt,
          order_id: data.order.invoiceId,
        },
        customer_details: {
          email: data.customer.email || "guess@topupgameku.com",
          first_name: data.customer.name || "guess",
          phone: data.customer.mobileNumber || "08895501350",
        },
        ...(data.paymentMethod.cd === "mandiri"
          ? {
              echannel: {
                bill_info1: "Merchant :",
                bill_info2: "Topup Gameku",
                bill_info3: "Order ID:",
                bill_info4: data.order.invoiceId,
                bill_info5: "Game :",
                bill_info6: data.order.game,
                bill_info7: "Denom :",
                bill_info8: data.order.productName,
              },
            }
          : {}),

        ...(data.paymentMethod.cd !== "mandiri"
          ? {
              bank_transfer: {
                bank: data.paymentMethod.cd,
                ...(data.paymentMethod.cd === "permata"
                  ? {
                      permata: {
                        recipient_name: "Topup Gameku",
                      },
                    }
                  : {}),
              },
            }
          : {}),
      };
      console.log(body);
      return await this.createTransaction(body);
    } catch (error) {
      console.log(error);
    }
  }

  async createQris(data: ICreateTRX): Promise<any> {
    try {
      const body = {
        payment_type: "qris",
        transaction_details: {
          gross_amount: data.order.totalAmt,
          order_id: data.order.invoiceId,
        },
        customer_details: {
          email: data.customer.email || "guess@topupgameku.com",
          first_name: data.customer.name || "guess",
          phone: data.customer.mobileNumber || "08895501350",
        },
        qris: {
          acquirer: "gopay",
        },
      };
      return await this.createTransaction(body);
    } catch (error) {
      console.log(error);
    }
  }

  async createEWallet(data: ICreateTRX): Promise<any> {
    try {
      const body = {
        payment_type: data.paymentMethod.cd,
        transaction_details: {
          gross_amount: data.order.totalAmt,
          order_id: data.order.invoiceId,
        },
        customer_details: {
          email: data.customer.email || "guess@topupgameku.com",
          first_name: data.customer.name || "guess",
          phone: data.customer.mobileNumber || "08895501350",
        },
        ...(data.paymentMethod.cd === "gopay"
          ? {
              gopay: {
                enable_callback: true,
                callback_url:
                  this.config.feUrl + "/payment/" + data.order.invoiceId,
              },
            }
          : {}),
        ...(data.paymentMethod.cd === "shopeepay"
          ? {
              shopeepay: {
                callback_url: "https://t.me/topup_gameku_bot",
              },
            }
          : {}),
      };
      console.log("SHOPEE PAY TRX", body);
      return await this.createTransaction(body);
    } catch (error) {
      console.log(error);
    }
  }

  async createRetail(data: ICreateTRX): Promise<any> {
    try {
      const body = {
        payment_type: "cstore",
        transaction_details: {
          gross_amount: data.order.totalAmt,
          order_id: data.order.invoiceId,
        },
        customer_details: {
          email: data.customer.email || "guess@topupgameku.com",
          first_name: data.customer.name || "guess",
          phone: data.customer.mobileNumber || "08895501350",
        },
        cstore: {
          store: data.paymentMethod.cd,
        },
      };
      return await this.createTransaction(body);
    } catch (error) {
      console.log(error);
    }
  }

  private async createTransaction(params: any): Promise<any> {
    console.log("SHOPEEPAY CREATE TRX : ", params);
    return this.request("/charge", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getTransactionStatus(invoiceId: string): Promise<any> {
    return this.request(`/${invoiceId}/status`, {
      method: "GET",
    });
  }
}
