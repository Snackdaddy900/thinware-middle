// @ts-nocheck
//
// Thinware minimal lead handler
// This is the full function file. Replace any existing send-quote-lead.js with this.
//
// Expected payload from the form (index.html):
//   leadName, companyName, leadEmail
// And we also set on the client:
//   notes, product, config, price, configId, sourceUrl
//
// For now we simply:
//   - parse the JSON body
//   - log it to the console
//   - echo it back in the response

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Method Not Allowed. Use POST.",
      }),
    };
  }

  let payload = {};

  // Parse JSON body safely
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("Failed to parse JSON body:", err);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Invalid JSON in request body",
      }),
    };
  }

  // Pull out expected fields (not strictly required, but clearer)
  const {
    leadName = "",
    companyName = "",
    leadEmail = "",
    notes = "",
    product = "",
    config = "",
    price = null,
    configId = "",
    sourceUrl = "",
  } = payload;

  // Basic sanity check on required fields
  if (!leadName || !leadEmail) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Missing required fields: leadName and/or leadEmail",
        received: payload,
      }),
    };
  }

  // Log to Netlify dev console so you can see what’s coming through
  console.log("=== Thinware lead received ===");
  console.log("Name      :", leadName);
  console.log("Company   :", companyName);
  console.log("Email     :", leadEmail);
  console.log("Product   :", product);
  console.log("Config    :", config);
  console.log("Config ID :", configId);
  console.log("Price     :", price);
  console.log("Notes     :", notes);
  console.log("Source URL:", sourceUrl);
  console.log("Full payload:", JSON.stringify(payload, null, 2));
  console.log("================================");

  // Echo a clean response
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      message: "Lead received by send-quote-lead function",
      received: {
        leadName,
        companyName,
        leadEmail,
        notes,
        product,
        config,
        price,
        configId,
        sourceUrl,
      },
      timestamp: Date.now(),
    }),
  };
};

