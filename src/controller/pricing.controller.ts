import type { Request, Response } from "express";
import path from "node:path";
import { errorHandler, responseHandler } from "../lib/helper";
import {
  getFlatList,
  parseCallingRatesCSV,
  parseGlobalPricingSMS,
  parsePricingCSV,
} from "../../helpers/excelHelper";
import { prisma } from "../lib/prisma";
import fs from "fs";

const BATCH_SIZE = 500;

const getByCountry = async (req: Request, res: Response) => {
  const { type, country, currency } = req.query;

  if (typeof type !== "string") {
    return responseHandler(
      res,
      { message: "Type is required", status: false },
      400,
    );
  }

  if (typeof country !== "string") {
    return responseHandler(
      res,
      { message: "Country is required", status: false },
      400,
    );
  }

  const currencyCode = typeof currency === "string" ? currency : undefined;

  try {
    if (type === "sms") {
      const data = await smsFilter(country);
      return responseHandler(res, data, 200);
    } else if (type === "whatsapp") {
      const data = await whatsappFilter(country, currencyCode);
      return responseHandler(res, data, 200);
    } else if (type === "wpCalling") {
      const data = await wpCallingFilter(country, currencyCode);
      return responseHandler(res, data, 200);
    } else {
      return responseHandler(
        res,
        { message: "Invalid type", status: false },
        400,
      );
    }
  } catch (e: unknown) {
    errorHandler(e instanceof Error ? e.message : "Something went wrong");
  }
};

async function smsFilter(country: string) {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "Global_Pricing_SMS.xlsx",
    );

    await ensureSeeded(filePath);

    const data = await prisma.pricingSMS.findMany({ where: { country } });

    return {
      message: "Data fetched successfully",
      status: true,
      data,
    };
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : "Something went wrong");
  }
}
async function whatsappFilter(country: string, currency?: string) {
  try {
    const csvDir = path.join(process.cwd(), "public", "whatsapp");
    const files = fs.readdirSync(csvDir).filter((f) => f.endsWith(".csv"));

    for (const file of files) {
      const filePath = path.join(csvDir, file);
      await ensureSeeded(filePath, "whatsapp");
    }

    const data = await prisma.whatsappPricing.findMany({
      where: {
        market: { equals: country },
        ...(currency ? { currency: { equals: currency } } : {}),
      },
      select: {
        market: true,
        currency: true,
        service: true,
        marketing: true,
        utility: true,
        authentication: true,
        authentication_intl: true,
      },
    });

    const callingData = await prisma.whatsappCallingRate.findMany({
      where: {
        market: { equals: country },
        ...(currency ? { currency: { equals: currency.toUpperCase() } } : {}),
      },
      select: {
        market: true,
        currency: true,
        from_minutes: true,
        to_minutes: true,
        rate_type: true,
        rate: true,
      },
    });

    const formattedData = callingData?.map((item) => ({
      market: item.market,
      currency: item.currency,
      from_minutes: item.from_minutes,
      to_minutes: item.to_minutes,
      rate_type: item.rate_type,
      rate: parseFloat(item.rate.toString()),
    }));

    return {
      message: "Data fetched successfully",
      status: true,
      data,
      callingData: formattedData,
    };
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : "Something went wrong");
  }
}

async function wpCallingFilter(country: string, currency?: string) {
  try {
    const csvDir = path.join(process.cwd(), "public", "calling_rates");
    const files = fs.readdirSync(csvDir).filter((f) => f.endsWith(".csv"));

    for (const file of files) {
      const filePath = path.join(csvDir, file);
      await ensureSeeded(filePath, "wpCalling");
    }

    const data = await prisma.whatsappCallingRate.findMany({
      where: {
        market: { equals: country },
        ...(currency ? { currency: { equals: currency.toUpperCase() } } : {}),
      },
      select: {
        market: true,
        currency: true,
        from_minutes: true,
        to_minutes: true,
        rate_type: true,
        rate: true,
      },
    });

    const formattedData = data?.map((item) => ({
      market: item.market,
      currency: item.currency,
      from_minutes: item.from_minutes,
      to_minutes: item.to_minutes,
      rate_type: item.rate_type,
      rate: parseFloat(item.rate.toString()),
    }));
    return {
      message: "Data fetched successfully",
      status: true,
      data: formattedData,
    };
  } catch (e: unknown) {
    throw new Error(e instanceof Error ? e.message : "Something went wrong");
  }
}

async function ensureSeeded(
  filePath: string,
  type: string = "sms",
): Promise<void> {
  if (type === "sms") {
    const count = await prisma.pricingSMS.count();
    if (count > 0) return;

    const rows = getFlatList(parseGlobalPricingSMS(filePath));

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await prisma.pricingSMS.createMany({
        data: rows.slice(i, i + BATCH_SIZE),
        skipDuplicates: true,
      });
    }
  } else if (type === "whatsapp") {
    const count = await prisma.whatsappPricing.count({
      where: { source_file: filePath },
    });
    if (count > 0) return;

    const rows = parsePricingCSV(filePath);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await prisma.whatsappPricing.createMany({
        data: rows.slice(i, i + BATCH_SIZE),
        skipDuplicates: true,
      });
    }
  } else if (type === "wpCalling") {
    const count = await prisma.whatsappCallingRate.count({
      where: { source_file: filePath },
    });
    if (count > 0) return;

    const rows = parseCallingRatesCSV(filePath);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await prisma.whatsappCallingRate.createMany({
        data: rows.slice(i, i + BATCH_SIZE),
        skipDuplicates: true,
      });
    }
  }
}

export { getByCountry };
