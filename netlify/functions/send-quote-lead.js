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

  const resendApiKey = process.env.resend_api_key;
  const toEmail = process.env.resend_admin_email;
  const fromEmail = process.env.resend_from_email || process.env.resend_admin_email;

  if (!resendApiKey || !toEmail || !fromEmail) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Missing Resend environment variables",
        expected: [
          "resend_api_key",
          "resend_admin_email",
          "resend_from_email"
        ]
      })
    };
  }

  try {
    const resend = new Resend(resendApiKey);

    const resendResponse = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      reply_to: leadEmail,
      subject: `Quote request from ${leadName}`,
      html: `
        <h2>New Quote Request</h2>
        <p><strong>Name:</strong> ${leadName}</p>
        <p><strong>Email:</strong> ${leadEmail}</p>
        <p><strong>Product:</strong> ${product}</p>
        <p><strong>Colour:</strong> ${color}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
      `,
      text: [
        "New Quote Request",
        `Name: ${leadName}`,
        `Email: ${leadEmail}`,
        `Product: ${product}`,
        `Colour: ${color}`,
        `Quantity: ${quantity}`
      ].join("\n")
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Email send attempted",
        resendResponse
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
