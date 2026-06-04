import {
  errorHandler,
  generateOtp,
  generateToken,
  hash,
  responseHandler,
  verifyHash,
} from "../lib/helper";
import { prisma } from "../lib/prisma";
import { Request, Response } from "express";
import {
  saveEnquiry,
  clearEnquiries,
  sendMail,
  sendWhatsapp,
  sendOtptoWhatsapp,
} from "../lib/sendOtp";

const contact = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      mobile,
      intrestedProperty,
      checkInDate,
      checkOutDate,
      noOfGuests,
      message,
    } = req.body;

    await prisma.contactEnquiry.create({
      data: {
        fullName,
        email,
        mobile,
        intrestedProperty,
        checkInDate,
        checkOutDate,
        noOfGuests,
        message,
      },
    });

    await saveEnquiry({
      name: fullName,
      email,
      mobile,
      intrestedProperty,
      checkInDate,
      checkOutDate,
      noOfGuests,
      message,
    });

    // await sendWhatsapp({
    //   name: `${firstName} ${lastName}`.trim(),
    //   service: service,
    //   mbno: mobile,
    // });

    // await sendMail({
    //   name: `${firstName} ${lastName}`.trim(),
    //   email,
    //   phone: mobile,
    //   message,
    //   company: companyName,
    //   service: service,
    //   source,
    // });
    return responseHandler(
      res,
      { message: "Enquiry created successfully", status: true },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const sendOtp = async (req: Request, res: Response) => {
  try {
    const { mobile, name } = req.body;
    const type = req.body.type || "no-auth";

    const isUserExist = await prisma.users.findUnique({
      where: {
        mobile,
      },
    });

    if (type == "auth" && !isUserExist) {
      return responseHandler(
        res,
        { message: "Invalid mobile number.", status: false },
        400,
      );
    }

    const appEnv = process.env.APP_ENV;
    const otp = generateOtp();
    const hashedOtp = appEnv == "dev" ? await hash("123456") : await hash(otp);

    const savedOtp = await prisma.otp.create({
      data: {
        mobile,
        otp: hashedOtp,
        expiry: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const isSend = await sendOtptoWhatsapp(
      appEnv == "dev" ? "123456" : otp,
      5,
      mobile,
      name || "user",
    );

    if (!isSend)
      return responseHandler(
        res,
        { message: "Otp not sent. Please try again", status: false },
        400,
      );

    return responseHandler(
      res,
      { message: "Otp sent successfully", status: true, otpId: savedOtp.id },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};
const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { mobile, otpId, otp } = req.body;
    const type = req.body.type || "no-auth";

    const isOtpExist = await prisma.otp.findUnique({
      where: { id: otpId, mobile },
    });

    if (!isOtpExist) {
      return responseHandler(
        res,
        { message: "Otp not found", status: false },
        400,
      );
    }

    if (isOtpExist.expiry < new Date(Date.now())) {
      await prisma.otp.deleteMany({ where: { id: otpId } });
      return responseHandler(
        res,
        { message: "Otp expired", status: false },
        400,
      );
    }

    const isValid = await verifyHash(otp, isOtpExist.otp);

    if (!isValid) {
      return responseHandler(
        res,
        { message: "Invalid otp", status: false },
        400,
      );
    }
    await prisma.otp.deleteMany({ where: { id: otpId } });
    let token = null;
    if (type == "auth") {
      token = await generateToken({ mobile });
    }
    return responseHandler(
      res,
      { message: "Otp verified successfully", status: true, token },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const clearData = async (req: Request, res: Response) => {
  try {
    await clearEnquiries();
    return responseHandler(
      res,
      { message: "Data cleared successfully", status: true },
      200,
    );
  } catch (e: any) {
    return responseHandler(res, { message: e.message, status: false }, 400);
  }
};

export { contact, sendOtp, verifyOtp, clearData };
