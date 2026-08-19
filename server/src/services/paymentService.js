const getConfig = () => {
  const isLive =
    String(process.env.SSLCOMMERZ_IS_LIVE || "false").toLowerCase() ===
    "true";

  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword =
    process.env.SSLCOMMERZ_STORE_PASSWORD;

  if (!storeId || !storePassword) {
    const error = new Error(
      "SSLCOMMERZ is not configured. Add SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD to server/.env"
    );

    error.statusCode = 503;
    throw error;
  }

  const base = isLive
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";

  return {
    storeId,
    storePassword,
    base,
  };
};

export const createPaymentSession = async ({
  transactionId,
  amount,
  currency,
  title,
  customer,
  successUrl,
  failUrl,
  cancelUrl,
  ipnUrl,
  metadata = {},
}) => {
  const {
    storeId,
    storePassword,
    base,
  } = getConfig();

  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,

    total_amount: Number(amount).toFixed(2),

    currency: String(
      currency || "BDT"
    ).toUpperCase(),

    tran_id: transactionId,

    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: ipnUrl,

    product_name: title.slice(0, 255),

    product_category:
      metadata.sourceType === "subscription"
        ? "subscription"
        : "business_expense",

    product_profile: "general",

    cus_name:
      customer.name || "Stackwise User",

    cus_email:
      customer.email ||
      "customer@example.com",

    cus_add1:
      customer.address ||
      process.env.PAYMENT_CUSTOMER_ADDRESS ||
      "Dhaka",

    cus_city:
      customer.city ||
      process.env.PAYMENT_CUSTOMER_CITY ||
      "Dhaka",

    cus_state:
      customer.state ||
      process.env.PAYMENT_CUSTOMER_STATE ||
      "Dhaka",

    cus_postcode:
      customer.postcode ||
      process.env.PAYMENT_CUSTOMER_POSTCODE ||
      "1000",

    cus_country:
      customer.country ||
      process.env.PAYMENT_CUSTOMER_COUNTRY ||
      "Bangladesh",

    cus_phone:
      customer.phone ||
      process.env.PAYMENT_CUSTOMER_PHONE ||
      "01700000000",

    shipping_method: "NO",

    value_a: metadata.sourceType || "",

    value_b: String(
      metadata.sourceId || ""
    ),

    value_c: String(
      metadata.userId || ""
    ),

    value_d: String(
      metadata.teamId || ""
    ),
  });

  const response = await fetch(
    `${base}/gwprocess/v4/api.php`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body,
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (
    !response.ok ||
    !data.GatewayPageURL
  ) {
    const error = new Error(
      data.failedreason ||
        data.status ||
        "SSLCOMMERZ session creation failed"
    );

    error.statusCode = 502;
    error.gatewayResponse = data;

    throw error;
  }

  return {
    gatewayPageUrl:
      data.GatewayPageURL,

    sessionKey:
      data.sessionkey || "",

    raw: data,
  };
};

export const validatePayment = async (
  validationId
) => {
  const {
    storeId,
    storePassword,
    base,
  } = getConfig();

  const query = new URLSearchParams({
    val_id: validationId,

    store_id: storeId,

    store_passwd: storePassword,

    format: "json",

    v: "1",
  });

  const response = await fetch(
    `${base}/validator/api/validationserverAPI.php?${query}`
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      "Could not validate SSLCOMMERZ transaction"
    );

    error.statusCode = 502;

    throw error;
  }

  return data;
};