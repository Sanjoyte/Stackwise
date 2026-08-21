const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const encodeHeader = (value) => value.replace(/[\r\n]+/g, " ").trim();

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const isGmailConfigured = () => {
  console.log("Gmail check:", {
    GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: !!process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: !!process.env.GMAIL_REFRESH_TOKEN,
  });

  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN
  );
};

const getAccessToken = async () => {
  const response = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Unable to authorize Gmail API");
  }

  return payload.access_token;
};

export const sendGmailMessage = async ({ to, subject, text, html }) => {
  if (!isGmailConfigured()) {
    throw new Error("Gmail API is not configured on the server");
  }

  const accessToken = await getAccessToken();
  const fromName = encodeHeader(process.env.GMAIL_FROM_NAME || "Stackwise");
  const message = [
    `To: ${encodeHeader(to)}`,
    `From: ${fromName} <me>`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html || text.replace(/\n/g, "<br />"),
  ].join("\r\n");

  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(message) }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Gmail API rejected the message");
  }

  return payload;
};