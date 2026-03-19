const { Resend } = require("resend");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        error: "Method Not Allowed. Use POST."
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        error: "Invalid JSON body"
      })
    };
  }

  const leadName = payload?.lead?.name?.trim();
  const leadEmail = payload?.lead?.email?.trim();
  const product = payload?.product || "";
  const color = payload?.color || payload?.finish || "";
  const quantity = payload?.quantity || "";

  if (!leadName || !leadEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        error: "Missing required fields",
        missing: [
          !leadName ? "lead.name" : null,
          !leadEmail ? "lead.email" : null
        ].filter(Boolean)
      })
    };
  }

  // Use the variables you already have set in Netlify
  const resendApiKey = process.env.resend_api_key;
  const adminEmail = process.env.resend_admin_email;

  if (!resendApiKey || !adminEmail) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Missing existing Resend environment variables",
        expected: ["resend_api_key", "resend_admin_email"]
      })
    };
  }

  try {
    const resend = new Resend(resendApiKey);

    const subject = `Quote request from ${leadName}`;

    const html = `
      <h2>New Quote Request</h2>
      <p><strong>Name:</strong> ${leadName}</p>
      <p><strong>Email:</strong> ${leadEmail}</p>
      <p><strong>Product:</strong> ${product}</p>
      <p><strong>Colour:</strong> ${color}</p>
      <p><strong>Quantity:</strong> ${quantity}</p>
    `;

    const text = [
      "New Quote Request",
      `Name: ${leadName}`,
      `Email: ${leadEmail}`,
      `Product: ${product}`,
      `Colour: ${color}`,
      `Quantity: ${quantity}`
    ].join("\n");

    const result = await resend.emails.send({
      from: adminEmail,
      to: [adminEmail],
      reply_to: leadEmail,
      subject,
      html,
      text
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Email sent",
        id: result?.data?.id || null
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Email send failed",
        details: err?.message || String(err)
      })
    };
  }
};
