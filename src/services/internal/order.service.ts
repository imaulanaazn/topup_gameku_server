import { MainService } from "./main.service";
import { OrderDto } from "src/dtos/index";
import { GameEntity, OrderEntity } from "@entity/index";
import { OrderStatuses, OrderType } from "@enum/index";
import {
  fn,
  literal,
  col,
  Op,
  FindAttributeOptions,
  Order,
  GroupOption,
} from "sequelize";
import dayjs from "dayjs";

interface IPeriode {
  startAt: Date;
  endAt: Date;
}

interface ICountOrdersGroupedByDate extends IPeriode {
  format: "daily" | "hourly";
}

export class OrderService extends MainService<OrderEntity, OrderDto> {
  constructor() {
    super(OrderEntity);
  }
  async countOrderGroupingByStatus(
    data: IPeriode
  ): Promise<{ status: string; total: number }[]> {
    const mappingStatus: { status: string; total: number }[] = [];
    for (let i = 1; i <= 6; i++) {
      mappingStatus.push({
        status: i.toString(),
        total: 0,
      });
    }

    const countOrders: { dataValues: { status: string; total: number } }[] =
      (await this.model.findAll({
        attributes: ["status", [fn("COUNT", col("*")), "total"]],
        group: ["status"],
        where: {
          createdAt: {
            [Op.between]: [data.startAt, data.endAt],
          },
          type: { [Op.in]: [OrderType.TOPUP, null] },
        },
      })) as any;

    for (const statuses of mappingStatus) {
      const check = countOrders.find(
        (item) => item.dataValues.status === statuses.status
      );
      if (check) {
        statuses.total = check.dataValues.total;
      }
    }
    return mappingStatus;
  }

  async countNewBuyers(data: IPeriode) {
    return await this.model.count({
      where: {
        isNew: true,
        createdAt: {
          [Op.between]: [data.startAt, data.endAt],
        },
        type: { [Op.in]: [OrderType.TOPUP, null] },
      },
    });
  }

  async countPopularGame(data: IPeriode) {
    return await this.model.findAll({
      attributes: ["game", [fn("COUNT", col("game")), "total"]],
      group: ["game"],
      where: {
        type: { [Op.in]: [OrderType.TOPUP, null] },
      },
      order: [["total", "DESC"]],
    });
  }

  async countOrders(data: IPeriode) {
    return await this.model.count({
      where: {
        createdAt: {
          [Op.between]: [data.startAt, data.endAt],
        },
        type: { [Op.in]: [OrderType.TOPUP, null] },
      },
    });
  }

  async countOrdersGroupedByDate(data: ICountOrdersGroupedByDate) {
    let attr: {
      attributes: FindAttributeOptions;
      group: GroupOption;
      order: Order;
    } = {
      attributes: [
        [
          fn("DATE", literal("CONVERT_TZ(created_at, '+00:00', '+07:00')")),
          "date",
        ],
        [fn("COUNT", col("*")), "totalOrders"],
      ],
      group: [
        fn("DATE", literal("CONVERT_TZ(created_at, '+00:00', '+07:00')")),
      ],
      order: [
        fn("DATE", literal("CONVERT_TZ(created_at, '+00:00', '+07:00')")),
      ],
    };

    let startAt = data.startAt;
    let endAt = data.endAt;
    let diff = dayjs(endAt).diff(dayjs(startAt), "day");
    if (diff <= 0) {
      startAt = dayjs().subtract(1, "month").startOf("day").toDate();
      endAt = dayjs().endOf("day").toDate();
      diff = dayjs(endAt).diff(dayjs(startAt), "day");
    }

    const dateArray: string[] = [];
    for (let i = 0; i <= diff; i++) {
      dateArray.push(dayjs(startAt).add(i, "day").format("YYYY-MM-DD"));
    }

    const orders = await this.find<
      {
        dataValues: {
          date: string;
          totalOrders: number;
        };
      }[]
    >({
      ...attr,
      where: {
        createdAt: {
          [Op.between]: [startAt, endAt],
        },
        type: { [Op.in]: [OrderType.TOPUP, null] },
      },
    });

    const newData = dateArray.map((date) => {
      const checkData = orders.find((item) => item.dataValues.date === date);
      if (checkData) {
        return {
          date: checkData.dataValues.date,
          totalOrders: checkData.dataValues.totalOrders,
        };
      } else {
        return {
          date,
          totalOrders: 0,
        };
      }
    });

    return {
      startAt,
      endAt,
      data: newData,
    };
  }
}
