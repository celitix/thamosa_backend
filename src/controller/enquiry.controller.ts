import {
  errorHandler,
  generateOtp,
  generateToken,
  hash,
  responseHandler,
  verifyHash,
} from "../lib/helper";
import { prisma } from "../lib/prisma";
import { Request, Response, NextFunction } from "express";
import {
  saveEnquiry,
  clearEnquiries,
  sendMail,
  sendOtptoSMS,
  sendWhatsapp,
  saveEnquiryBookDemo,
  clearBookDemoEnquiries,
  saveEnquiryBookDemoFb,
  clearBookDemoFBEnquiries,
  sendOtptoWhatsapp,
} from "../lib/sendOtp";
import axios from "axios";

const contact = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      mobile,
      companyName,
      service,
      message,
      source,
      utmData,
    } = req.body;

    await prisma.contactEnquiry.create({
      data: {
        firstName,
        lastName,
        email,
        mobile,
        companyName,
        service,
        message,
        source,
        utmData: utmData || null,
      },
    });

    if (source == "lp-book-demo") {
      await saveEnquiryBookDemo({
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone: mobile,
        message,
        company: companyName,
        service: service,
        source,
        utmData,
      });
    } else if (source == "lp-book-demo-fb") {
      await saveEnquiryBookDemoFb({
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone: mobile,
        message,
        company: companyName,
        service: service,
        source,
        utmData,
      });
    } else {
      await saveEnquiry({
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone: mobile,
        message,
        company: companyName,
        service: service,
        source,
      });
    }

    await sendWhatsapp({
      name: `${firstName} ${lastName}`.trim(),
      service: service,
      mbno: mobile,
    });

    await sendMail({
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone: mobile,
      message,
      company: companyName,
      service: service,
      source,
    });
    return responseHandler(
      res,
      { message: "Enquiry created successfully", status: true },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const career = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      mobile,
      designation,
      expInYears,
      jobTitle,
      message,
    } = req.body;

    const file = req.file;

    if (!file) {
      return responseHandler(
        res,
        { message: "No file uploaded", status: false },
        400,
      );
    }

    await prisma.carreerEnquiry.create({
      data: {
        firstName,
        lastName,
        email,
        mobile,
        designation,
        expInYears,
        jobTitle,
        resumeUrl: file.path,
        message,
      },
    });

    await saveEnquiry({
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone: mobile,
      message,
      designation,
      experience: expInYears,
      resumeUrl: file.path,
      source: "Career",
    });

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
    console.log("otp", otp);
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

const turnstileVerify = async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    const secretKey = process.env.CLOUDFLARE_SECRET_KEY as string;
    const url = process.env.CLOUDFLARE_URL as string;

    const paylaod = {
      secret: secretKey,
      response: token,
    };

    const response = await axios.post(url, paylaod, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response?.data?.success) {
      return responseHandler(
        res,
        { message: "Invalid turnstile", status: false },
        400,
      );
    }

    return responseHandler(
      res,
      { message: "Turnstile verified successfully", status: true },
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
const clearBookDemo = async (req: Request, res: Response) => {
  try {
    await clearBookDemoEnquiries();
    return responseHandler(
      res,
      { message: "Data cleared successfully", status: true },
      200,
    );
  } catch (e: any) {
    return responseHandler(res, { message: e.message, status: false }, 400);
  }
};

const clearBookDemoFb = async (req: Request, res: Response) => {
  try {
    await clearBookDemoFBEnquiries();
    return responseHandler(
      res,
      { message: "Data cleared successfully", status: true },
      200,
    );
  } catch (e: any) {
    return responseHandler(res, { message: e.message, status: false }, 400);
  }
};

export {
  contact,
  career,
  sendOtp,
  verifyOtp,
  turnstileVerify,
  clearData,
  clearBookDemo,
};
