import { ServerIdType, VoucherType } from "@enum/index";
import generateSlug from "@helper/generateSlug";
import { sleep } from "@helper/index";
import { IApiRouter } from "@interfaces/index";
import { GameService } from "@serviceInternal/game.service";
import { ListServerService } from "@serviceInternal/listServer.service";
import { ProductService } from "@serviceInternal/product.service";
import { ProviderService } from "@serviceInternal/provider.service";
import { SysConfigService } from "@serviceInternal/sysConfig.service";
import dayjs from "dayjs";
import { RequestHandler } from "express";
import { v4 as uuid } from "uuid";
import { APIAuth, APIMethod } from "@enum/index";
import {
  IProductTokoVoucher,
  TokoVoucherService,
} from "@serviceExternal/tokoVoucher.service";
import { Config } from "@config/index";

const path = "/v1/sync-product-tokovoucher";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const getUserPrices = (
  item: IProductTokoVoucher,
  percentage_prices: string
) => {
  const tokoVoucherPrices = parseInt(item.price.toString());
  const percentage = parseInt(percentage_prices.toString());
  const userPrices = tokoVoucherPrices + (tokoVoucherPrices * percentage) / 100;

  return userPrices;
};

const main: RequestHandler = async (req, res) => {
  const sysConfigService = new SysConfigService();
  const sysConfig = await sysConfigService.findManyBy({
    column: "cd",
    value: ["percentage_prices_reseller", "percentage_prices"],
    operator: "in",
  });

  const config = new Config();
  const tv_member_code = config.tokoVoucherMemberCode;
  const tv_signature = config.tokoVoucherSignature;
  const tv_secret_key = config.tokoVoucherSecretKey;

  const percentageReseller = sysConfig.find(
    (item) => item.cd === "percentage_prices_reseller"
  );
  const percentage_prices = sysConfig.find(
    (item) => item.cd === "percentage_prices"
  );

  const providerService = new ProviderService();
  const provider = await providerService.findOneBy({
    column: "cd",
    value: "TOKO_VOUCHER",
  });

  const gameService = new GameService();
  const games = await gameService.findManyBy({
    column: "provider",
    value: provider.id,
  });

  const tokoVoucherService = new TokoVoucherService(
    tv_secret_key,
    tv_signature,
    tv_member_code
  );

  const tvListOperator = await tokoVoucherService.getListOperator(1);
  const tvGames = [];

  let secondCount = 0;
  for (const operator of tvListOperator.data) {
    secondCount++;
    const tvGamesByOperator = await tokoVoucherService.getListJenisProduk(
      operator.id
    );
    if (tvGamesByOperator.rc === 200) {
      tvGamesByOperator.data.forEach((game) =>
        tvGames.push({ ...game, logoUrl: operator.logo })
      );
    }

    await sleep(500);
  }

  res.sendStatus(200);

  // const allProductsFromLapakGaming = await lapakgamingService.getAllProducts();
  // const dataGamesLapakGaming = lapakgamingGames.data.categories;

  let count = 0;
  for (const tvGame of tvGames) {
    count++;
    const gameDb = games.find((item) => item.cd === tvGame.id.toString());
    const tvGameForm = JSON.parse(tvGame.format_form || "{}");
    const serverId = tvGameForm.find((item) => item.name === "server_id");
    const needServerId =
      serverId.label.trim() === "-" || serverId.label.trim() === ""
        ? false
        : true;
    const gameType = "topup";
    const serverIdtype =
      needServerId && serverId.is_dropdown
        ? ServerIdType.LIST
        : ServerIdType.INPUT;

    const productsTokoVoucher = await tokoVoucherService.getListProdukByJenis(
      tvGame.id
    );

    if (!gameDb) {
      const gameId = uuid();
      await gameService.create({
        id: gameId,
        provider: provider.id,
        categoryId: "c90f7d8c-0e82-11f0-a5c7-c01850804b83",
        name: tvGame.nama,
        automatically: true,
        cd: tvGame.id,
        logoUrl: tvGame.logoUrl,
        isPopular: false,
        slug: generateSlug(tvGame.nama),
        deleted: tvGame.status ? false : true,
        type: gameType,
        description: "",
        needServerId,
        needCheckId: false,
        typeServerId: serverIdtype,
        voucherType: VoucherType.EXTERNAL,
      });

      if (serverIdtype === ServerIdType.LIST) {
        const options = serverId.data.filter((item) => !(item.value === ""));
        const savedData = options.map((item) => {
          return {
            id: uuid(),
            gameId,
            label: item.name,
            value: item.value,
            createdAt: dayjs().toDate(),
          };
        });
        const listServerService = new ListServerService();
        await listServerService.model.bulkCreate(savedData);
      }

      const productService = new ProductService();
      if (productsTokoVoucher.rc === 200) {
        const productData = productsTokoVoucher.data.map((item) => {
          let userPrices = getUserPrices(item, percentage_prices.value);
          return {
            id: uuid(),
            categoryId: "",
            name: item.nama_produk,
            automatically: true,
            code: item.code,
            // price:
            // parseInt(item.price.toString()) +
            // (parseInt(item.price.toString()) * parseInt(percentageUser.value)) / 100,
            price: userPrices,
            resellerPrice:
              parseInt(item.price.toString()) +
              (parseInt(item.price.toString()) *
                parseInt(percentageReseller.value)) /
                100,
            priceBuy: parseInt(item.price.toString()),
            logoDenom: "",
            gameId: gameId,
            deleted: false,
            isActive: item.status ? true : false,
            isDisplayed: item.status ? true : false,
          };
        });
        await productService.model.bulkCreate(productData);
      }
    } else {
      const productService = new ProductService();
      const prodsDb = await productService.findManyBy({
        column: "gameId",
        value: gameDb.id,
      });

      // for(const prodLapak of allProductsFromLapakGaming.data.products) {
      //     const prodDb = prodsDb.find(item => item.code === prodLapak.code)
      //     if(prodDb) {
      //         await productService.updateBy({
      //             by: "id",
      //             value: prodDb.id,
      //             data: {
      //                 price: prodLapak.price + (prodLapak.price * parseInt(percentageUser.value)) / 100,
      //                 resellerPrice:
      //                     prodLapak.price + (prodLapak.price * parseInt(percentageReseller.value)) / 100,
      //                 priceBuy: prodLapak.price,
      //                 isActive: prodLapak.status === "available" ? true : false,
      //             },
      //         });
      //     } else {
      //         await productService.create({
      //             id: uuid(),
      //             categoryId: "",
      //             name: prodLapak.name,
      //             automatically: true,
      //             code: prodLapak.code,
      //             price: prodLapak.price + (prodLapak.price * parseInt(percentageUser.value)) / 100,
      //             resellerPrice: prodLapak.price + (prodLapak.price * parseInt(percentageReseller.value)) / 100,
      //             priceBuy: prodLapak.price,
      //             logoDenom: "",
      //             gameId: gameId,
      //             deleted: true,
      //             isActive: item.status === "available" ? true : false,
      //         })
      //     }
      // }

      for (const prod of prodsDb) {
        if (productsTokoVoucher.rc === 200) {
          const prodTokoVoucher = productsTokoVoucher.data.find(
            (item) => item.code === prod.code
          );
          if (prodTokoVoucher) {
            const userPrices = getUserPrices(
              prodTokoVoucher,
              percentage_prices.value
            );
            await productService.updateBy({
              by: "id",
              value: prod.id,
              data: {
                // price:
                //     parseInt(prodTokoVoucher.price.toString()) +
                //     (parseInt(prodTokoVoucher.price.toString()) * parseInt(percentageUser.value)) / 100,
                price: userPrices,
                resellerPrice:
                  parseInt(prodTokoVoucher.price.toString()) +
                  (parseInt(prodTokoVoucher.price.toString()) *
                    parseInt(percentageReseller.value)) /
                    100,
                priceBuy: parseInt(prodTokoVoucher.price.toString()),
                isActive: prodTokoVoucher.status ? true : false,
              },
            });
          }
        }
      }
    }

    await sleep(500);
  }
  return;
};

export const syncTokoVoucherData: IApiRouter = {
  method,
  path,
  auth,
  main,
};
