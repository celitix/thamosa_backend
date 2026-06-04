import axios from "axios";
import path from "path";
import fs from "fs/promises";
import moment from "moment-timezone";

export async function sendOtptoWhatsapp(otp: string, mbno: string) {
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

export async function sendWhatsapp(data: {
  name: string;
  email: string;
  mobile: string;
  intrestedProperty: string;
  checkInDate: string;
  checkOutDate: string;
  noOfGuests: string;
}) {
  const {
    name,
    checkInDate,
    checkOutDate,
    noOfGuests,
    mobile,
    email,
    intrestedProperty,
  } = data;
  try {
    const payload = {
      template: {
        components: [
          {
            type: "BODY",
            parameters: [
              {
                text: intrestedProperty,
                type: "text",
              },
              {
                text: name,
                type: "text",
              },
              {
                text: email,
                type: "text",
              },
              {
                text: mobile,
                type: "text",
              },

              {
                text: checkInDate,
                type: "text",
              },
              {
                text: checkOutDate,
                type: "text",
              },
              {
                text: noOfGuests,
                type: "text",
              },
            ],
          },
        ],
        name: "websiteinquiry",
        language: {
          code: "en",
          policy: "deterministic",
        },
      },
      to: "919680149911",
      type: "template",
      messaging_product: "whatsapp",
    };

    const customerPayload = {
      template: {
        components: [
          {
            type: "BODY",
            parameters: [
              {
                text: name,
                type: "text",
              },
              {
                text: intrestedProperty,
                type: "text",
              },
              {
                text: checkInDate,
                type: "text",
              },
              {
                text: checkOutDate,
                type: "text",
              },
              {
                text: noOfGuests,
                type: "text",
              },
            ],
          },
        ],
        name: "webinquiryresponse",
        language: {
          code: "en",
          policy: "deterministic",
        },
      },
      to: `91${mobile}`,
      type: "template",
      messaging_product: "whatsapp",
    };

    const config = {
      headers: {
        key: process.env.API_KEY,
        wabaNumber: process.env.WHATSAPP_NUMBER,
      },
    };

    const [customer, admin] = await Promise.all([
      axios.post(
        "https://api.celitix.com/wrapper/waba/message",
        customerPayload,
        config,
      ),
      axios.post(
        "https://api.celitix.com/wrapper/waba/message",
        payload,
        config,
      ),
    ]);

    return true;
  } catch (e: any) {
    throw new Error(e.message);
  }
}

export async function saveEnquiry(data: {
  name: string;
  email: string;
  mobile: string;
  intrestedProperty: string;
  checkInDate: string;
  checkOutDate: string;
  noOfGuests: string;
  message: string;
}) {
  try {
    const {
      name,
      email,
      mobile,
      intrestedProperty,
      checkInDate,
      checkOutDate,
      noOfGuests,
      message,
    } = data;

    const dataFilePath = path.join(process.cwd(), "public/data.txt");

    const payload = {
      Name: name,
      Email: email,
      Phone: mobile,
      IntrestedProperty: intrestedProperty || "N/A",
      checkInDate: moment(new Date(checkInDate))
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss"),
      checkOutDate: moment(new Date(checkOutDate))
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss"),
      Message: message || "N/A",
      noOfGuests: noOfGuests || 0,
      Timestamp: moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
    };

    const textContent = `${payload.Name};${payload.Email};${payload.Phone};${payload.IntrestedProperty};${payload.checkInDate};${payload.checkOutDate};${payload.Message};${payload.noOfGuests};${payload.Timestamp}`;

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
