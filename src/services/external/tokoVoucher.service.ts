import { Config } from "@config/index";
import { ProductDto } from "@dto/product.dto";
import { createLogCronjob } from "@helper/logger";

interface IRequest<T> {
  method: "POST" | "GET" | "PATCH" | "DELETE";
  endpoint: string;
  data?: T;
}

interface ResponseApi<T> {
  status: number;
  rc: number;
  message: string;
  data: T;
  ts: number;
}

interface IProdukCategoryTokoVoucher {
  id: number;
  nama_category: string;
  nama: string;
  min_karakter: number;
  max_karakter: number;
  logo: string;
  status: number;
}

export interface IProductTokoVoucher {
  id: number;
  code: string;
  category_name: string;
  operator_produk: string;
  jenis_name: string;
  nama_produk: string;
  deskripsi: string;
  price: number;
  status: number;
}

interface IJenisProdukTokoVoucher {
  id: number;
  operator_nama: string;
  format_form: string;
  status: number;
}

interface FormGameLapakGaming {
  name: string;
  type: string;
  options: {
    value: string;
    name: string;
  }[];
}

interface AdditionalIdLapakGaming {
  value: string;
  name: string;
}

export interface IGameLapakGaming {
  code: string;
  name: string;
  variant: string;
  check_id: string;
  forms: FormGameLapakGaming[];
  servers: AdditionalIdLapakGaming[];
}

export interface IProductLapakGaming {
  code: string;
  name: string;
  provider_code: string;
  price: number;
  process_time: number;
  status: string;
}

interface GetProductBy {
  gameCd: string;
  productCd?: string;
}

interface CreateTrx {
  userId?: string;
  serverId?: string;
  // quantity: number;
  invoiceId: string;
  product: ProductDto;
}

interface ResponseGetListOp extends ResponseApi<IProdukCategoryTokoVoucher[]> {}
interface ResponseGetJenisProduk
  extends ResponseApi<IJenisProdukTokoVoucher[]> {}
interface ResponseGetListProduk extends ResponseApi<IProductTokoVoucher[]> {}
interface ResponseCreateTrx {
  status: "sukses" | "gagal" | "pending" | 0;
  message: string;
  sn: string;
  ref_id: string;
  trx_id: string;
  produk: string;
  sisa_saldo: number;
  price: number;
}

interface OrderData {
  ref_id: string;
  produk: string;
  tujuan: string;
  server_id: string;
  member_code: string;
  signature: string;
}

export class TokoVoucherService {
  protected secret_key: string;
  protected signature: string;
  protected member_code: string;
  protected baseUrl: string;

  constructor(secret_key: string, signature: string, member_code: string) {
    const config = new Config();
    this.baseUrl = config.tokoVoucherUrl;
    this.secret_key = secret_key;
    this.signature = signature;
    this.member_code = member_code;
  }

  // async getProducts(): Promise<ResponseGetGames> {
  //   try {
  //     return await this.request({
  //       method: "GET",
  //       endpoint: `/produk/code?member_code=${this.member_code}&signature=${this.signature}`,
  //     });
  //   } catch (error) {
  //     const message = `An error occurred: ${error.message}`;
  //     throw new Error(message);
  //   }
  // }

  async getListOperator(categoryId: number): Promise<ResponseGetListOp> {
    try {
      return await this.request({
        method: "GET",
        endpoint: `member/produk/operator/list?member_code=${this.member_code}&signature=${this.signature}&id=${categoryId}`,
      });
    } catch (error) {
      const message = `An error occurred: ${error.message}`;
      throw new Error(message);
    }
  }

  async getListJenisProduk(
    operatorId: number
  ): Promise<ResponseGetJenisProduk> {
    try {
      return await this.request({
        method: "GET",
        endpoint: `member/produk/jenis/list?member_code=${this.member_code}&signature=${this.signature}&id=${operatorId}`,
      });
    } catch (error) {
      const message = `An error occurred: ${error.message}`;
      throw new Error(message);
    }
  }

  async getListProdukByJenis(idJenis: string): Promise<ResponseGetListProduk> {
    try {
      return await this.request({
        method: "GET",
        endpoint: `member/produk/list?member_code=${this.member_code}&signature=${this.signature}&id_jenis=${idJenis}`,
      });
    } catch (error) {
      const message = `An error occurred: ${error.message}`;
      throw new Error(message);
    }
  }

  // async getProductByGamesCode(data: GetProductBy): Promise<ResponseGetProduct> {
  //     const param = new URLSearchParams();
  //     data.gameCd && param.append("category_code", data.gameCd);
  //     data.productCd && param.append("product_code", data.productCd);

  //     try {
  //         return await this.request({
  //             method: "GET",
  //             endpoint: "/api/product?" + param,
  //         });
  //     } catch (error) {
  //         const message = `An error occurred: ${error.message}`;
  //         throw new Error(message);
  //     }
  // }

  // async getAllProducts(): Promise<ResponseGetProduct> {
  //     try {
  //         return await this.request({
  //             method: "GET",
  //             endpoint: "/api/all-products?",
  //         });
  //     } catch (error) {
  //         const message = `An error occurred: ${error.message}`;
  //         throw new Error(message);
  //     }
  // }

  async createOrder(data: CreateTrx): Promise<ResponseCreateTrx> {
    const body = {
      ref_id: data.invoiceId,
      produk: data.product.code,
      tujuan: data.userId ? data.userId : "",
      server_id: data.serverId ? data.serverId : "",
      member_code: this.member_code,
      signature: this.signature,
    };

    try {
      return await this.request<OrderData>({
        method: "POST",
        endpoint: "v1/transaksi",
        data: body,
      });
    } catch (error) {
      const message = `An error occurred: ${error.message}`;
      throw new Error(message);
    }
  }

  private async request<IRequestBody>(
    data: IRequest<IRequestBody>
  ): Promise<any> {
    const config: RequestInit = {
      method: data.method,
      headers: {},
    };

    if (data.method === "POST") {
      createLogCronjob().log(
        "Request Body to Toko Voucher : " + JSON.stringify(data.data)
      );
      config["body"] = JSON.stringify(data.data);
      config["headers"]["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(`${this.baseUrl}/${data.endpoint}`, config);
      const res = await response.json();
      createLogCronjob().log(
        "Response Body from Toko Voucher : " + JSON.stringify(res)
      );
      return res;
    } catch (error) {
      createLogCronjob().log(error);
      const message = `An error occurred: ${error.message}`;
      throw new Error(message);
    }
  }
}
