import axios from "axios";
import path from "path";
import fs from "fs/promises";
import nodemailer from "nodemailer";
import moment from "moment-timezone";

export async function sendOtptoSMS(
  otp: string,
  ttl = 10,
  mbno: string,
  name = "",
) {
  try {
    const msg = `Dear ${name}, OTP to validate your mobile number on Celitix is: ${otp}. Valid for ${ttl} minutes.
@celitix.com #${otp}`;
    const message = encodeURIComponent(msg);

    // console.log("msg", msg);

    const paylod = {
      listsms: [
        {
          sms: msg,
          mobiles: mbno,
          senderid: process.env.SENDERID,
          tempid: process.env.TEMPLATE_ID,
          entityid: process.env.ENTITY_ID,
          unicode: "0",
        },
      ],
    };

    const headers = {
      key: process.env.API_KEY,
      "Content-Type": "application/json",
    };
    const res = await axios.post(
      "https://api.celitix.com/rest/sms/sendsms",
      paylod,
      { headers },
    );
    // console.log("res", res);
    const isSuccess = res?.data?.smslist?.sms?.status == "success";

    if (!isSuccess) {
      return false;
    }
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function sendOtptoWhatsapp(
  otp: string,
  ttl = 10,
  mbno: string,
  name = "",
) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: `91${mbno}`,
      type: "template",
      template: {
        name: "otp",
        language: {
          code: "en",
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
        ],
      },
    };

    const res = await axios.post(
      "https://api.celitix.com/wrapper/waba/message",
      payload,
      {
        headers: {
          key: process.env.API_KEY,
          wabaNumber: process.env.WHATSAPP_NUMBER,
        },
      },
    );

    if (res?.data?.error?.type === "OAuthException") {
      return false;
    }

    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function sendWhatsapp(data: any) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: `91${data.mbno}`,
      type: "template",
      template: {
        name: "enquiry_response",
        language: {
          code: "en",
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text", //name
                text: data.name,
              },
              {
                type: "text", //service
                text: data.service,
              },
            ],
          },
        ],
      },
    };

    const res = await axios.post(
      "https://api.celitix.com/wrapper/waba/message",
      payload,
      {
        headers: {
          key: process.env.API_KEY,
          "Content-Type": "application/json",
          wabaNumber: process.env.WHATSAPP_NUMBER,
        },
      },
    );

    if (res?.data?.error?.type === "OAuthException") {
      return false;
    }

    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function sendMail(data: any) {
  try {
    const { name, email, phone, message, company, service, source } = data;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_ID,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    var mailOptions = {};

    mailOptions = {
      from: "ads@proactivedigital.in",
      to: "info@proactivedigital.in, sales@proactivesms.in, yogendra@proactivesms.in",
      // to: "dummymail12hai@gmail.com",
      subject: `Celitix ${data.source} Enquiry`,
      html: `Name: ${name}<br>Email: ${email}<br>Phone: ${phone}<br>Message: ${message}<br>Company: ${company}<br>Service: ${service}`,
    };

    transporter.sendMail(mailOptions, function (error: any, info: any) {
      if (error) {
        return false;
      } else {
        return true;
      }
    });
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function saveEnquiry(data: any) {
  try {
    const {
      name,
      email,
      phone,
      company,
      service,
      message,
      source,
      designation,
      experience,
      resumeUrl,
    } = data;

    let fileUrl = "";

    // const projectRoot = path.join(__dirname, "..");
    // const uploadsDir = path.join(projectRoot, "uploads");
    // await fs.mkdir(uploadsDir, { recursive: true });
    // const buffer = await file.toBuffer();

    const dataFilePath = path.join(process.cwd(), "public/data.txt");

    const payload = {
      Name: name,
      Email: email,
      Phone: phone,
      Company: company || "N/A",
      Service: service || "N/A",
      Message: message || "N/A",
      Timestamp: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
      Source: source || "Website",
      Experience: experience || "N/A",
      Designation: designation || "N/A",
      resumeUrl: resumeUrl || "N/A",
    };

    const textContent = `${payload.Name};${payload.Email};${payload.Phone};${payload.Company};${payload.Service};${payload.Message};${payload.Timestamp};${payload.Source};${payload.Experience};${payload.Designation};${payload.resumeUrl}`;

    await fs.appendFile(dataFilePath, textContent + "\n");

    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function saveEnquiryBookDemo(data: any) {
  try {
    const { name, email, phone, company, service, message, source, utmData } =
      data;

    const dataFilePath = path.join(process.cwd(), "public/bookDemo.txt");

    const payload = {
      Name: name,
      Email: email,
      Phone: phone,
      Company: company || "N/A",
      Service: service || "N/A",
      Message: message || "N/A",
      Timestamp: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
      Source: source || "Website",
      utm_source: utmData?.source || "N/A",
      utm_medium: utmData?.medium || "N/A",
      utm_campaign: utmData?.campaign || "N/A",
      gclid: utmData?.gclid || "N/A",
    };

    const textContent = `${payload.Name};${payload.Email};${payload.Phone};${payload.Company};${payload.Service};${payload.Message};${payload.Timestamp};${payload.Source};${payload.utm_source};${payload.utm_medium};${payload.utm_campaign};${payload.gclid}`;
    await fs.appendFile(dataFilePath, textContent + "\n");

    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function saveEnquiryBookDemoFb(data: any) {
  try {
    const { name, email, phone, company, service, message, source, utmData } =
      data;

    const dataFilePath = path.join(process.cwd(), "public/bookDemofb.txt");

    const payload = {
      Name: name,
      Email: email,
      Phone: phone,
      Company: company || "N/A",
      Service: service || "N/A",
      Message: message || "N/A",
      Timestamp: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
      Source: source || "Website",
      utm_source: utmData?.source || "N/A",
      utm_medium: utmData?.medium || "N/A",
      utm_campaign: utmData?.campaign || "N/A",
      gclid: utmData?.gclid || "N/A",
    };

    const textContent = `${payload.Name};${payload.Email};${payload.Phone};${payload.Company};${payload.Service};${payload.Message};${payload.Timestamp};${payload.Source};${payload.utm_source};${payload.utm_medium};${payload.utm_campaign};${payload.gclid}`;
    await fs.appendFile(dataFilePath, textContent + "\n");

    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function clearEnquiries() {
  try {
    const dataFilePath = path.join(process.cwd(), "public/data.txt");
    await fs.writeFile(dataFilePath, "");
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function clearBookDemoEnquiries() {
  try {
    const dataFilePath = path.join(process.cwd(), "public/bookDemo.txt");
    await fs.writeFile(dataFilePath, "");
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function clearBookDemoFBEnquiries() {
  try {
    const dataFilePath = path.join(process.cwd(), "public/bookDemofb.txt");
    await fs.writeFile(dataFilePath, "");
    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}
