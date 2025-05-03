import { ValidatorType } from "@enum/index";
import { Validator } from "@helper/validator";
import { IApiRouter, Validation } from "@interfaces/index";
import { OrderService } from "@serviceInternal/order.service";
import dayjs from "dayjs";
import { RequestHandler } from "express";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v2/order-analytics";
const method = APIMethod.GET;
const auth = APIAuth.ADMIN;

const schemaValidation: Validation[] = [
  {
    name: "startAt",
    required: false,
    type: "string",
    default: dayjs().subtract(1, "M").toISOString(),
  },
  {
    name: "endAt",
    required: false,
    type: "string",
    default: dayjs().toISOString(),
  },
  {
    name: "diagramFormat",
    required: false,
    type: "string",
    default: "daily",
    enum: ["daily", "hourly"],
  },
];

const main: RequestHandler = async (req, res) => {
  const query = new Validator(req, res).process<{
    type: "count" | "latestOrder" | "popularGame" | "countOrder";
    startAt: string;
    endAt: string;
    diagramFormat: "daily" | "hourly";
  }>(schemaValidation, ValidatorType.QUERY);
  const orderService = new OrderService();

  const startAt = dayjs(query.startAt).startOf("day");
  const endAt = dayjs(query.endAt).endOf("day");

  const diffDay = endAt.diff(startAt, "day");
  const prevStartAt = dayjs(query.startAt)
    .subtract(diffDay, "day")
    .startOf("day");
  const prevEndAt = dayjs(query.startAt).subtract(1, "day").endOf("day");

  const [
    ordersCount,
    prevOrdersCount,
    newBuyersCount,
    diagramData,
    popularGame,
    totalOrders,
    prevTotalOrders,
  ] = await Promise.all([
    orderService.countOrderGroupingByStatus({
      startAt: startAt.toDate(),
      endAt: endAt.toDate(),
    }),
    orderService.countOrderGroupingByStatus({
      startAt: prevStartAt.toDate(),
      endAt: prevEndAt.toDate(),
    }),
    orderService.countNewBuyers({
      startAt: startAt.toDate(),
      endAt: endAt.toDate(),
    }),
    orderService.countOrdersGroupedByDate({
      startAt: startAt.toDate(),
      endAt: endAt.toDate(),
      format: query.diagramFormat,
    }),
    orderService.countPopularGame({
      startAt: startAt.toDate(),
      endAt: endAt.toDate(),
    }),
    orderService.countOrders({
      startAt: startAt.toDate(),
      endAt: endAt.toDate(),
    }),
    orderService.countOrders({
      startAt: prevStartAt.toDate(),
      endAt: prevEndAt.toDate(),
    }),
  ]);

  let statusCount = {};
  for (const data of ordersCount) {
    const category = mappingStatuses()[data.status];
    const prevOrder = prevOrdersCount.find(
      (order) => order.status === data.status
    );
    if (!statusCount[category]) {
      const percentageChange = Math.round(
        ((data.total - prevOrder.total) / data.total) * 100
      );
      statusCount[category] = {
        ...data,
        status: undefined,
        totalBefore: prevOrder.total,
        percentageChange: percentageChange || 0,
      };

      continue;
    }
    statusCount[category].total = statusCount[category].total + data.total;
    statusCount[category].totalBefore =
      statusCount[category].totalBefore + prevOrder.total;
    const percentageChange = Math.round(
      ((statusCount[category].total - statusCount[category].totalBefore) /
        statusCount[category].total) *
        100
    );
    statusCount[category].percentageChange = percentageChange;
  }

  const percentageChangeTotalOrders = Math.round(
    ((totalOrders - prevTotalOrders) / totalOrders) * 100
  );

  res.send({
    startAt: query.startAt,
    endAt: query.endAt,
    data: {
      statusCount,
      newBuyersCount,
      diagramData,
      popularGame,
      totalOrders: {
        total: totalOrders,
        totalBefore: prevTotalOrders,
        percentageChange: percentageChangeTotalOrders,
      },
    },
  });
};

export const getOrderAnalyticsV2: IApiRouter = {
  main,
  path,
  method,
  auth,
};

const mappingStatuses = () => {
  return {
    "1": "pending",
    "2": "pending",
    "3": "success",
    "4": "failed",
    "5": "expired",
    "6": "pending",
  };
};
