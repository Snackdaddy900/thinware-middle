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

  // Accept flat payload from quote-handoff.html
  const leadName = (payload?.name || "").trim();
  const leadEmail = (payload?.email || "").trim();
  const company = payload?.company || "";
  const product = payload?.product || "";
  const colour = payload?.colour || payload?.color || payload?.finish || "";
  const quantity = payload?.quantity || "";
  const totalPrice = payload?.totalPrice || payload?.total_price || "";

  if (!leadName || !leadEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        error: "Missing required fields",
        missing: [
          !leadName ? "name" : null,
          !leadEmail ? "email" : null
        ].filter(Boolean),
        receivedPayloadKeys: Object.keys(payload)
      })
    };
  }

  const resendApiKey = process.env.resend_api_key;
  const toEmail = process.env.resend_admin_email;
  const fromEmail = "onboarding@resend.dev";

  if (!resendApiKey || !toEmail) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Missing Resend environment variables",
        expected: [
          "resend_api_key",
          "resend_admin_email"
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
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Product:</strong> ${product}</p>
        <p><strong>Colour:</strong> ${colour}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Estimated Price:</strong> ${totalPrice}</p>
      `,
      text: [
        "New Quote Request",
        `Name: ${leadName}`,
        `Email: ${leadEmail}`,
        `Company: ${company}`,
        `Product: ${product}`,
        `Colour: ${colour}`,
        `Quantity: ${quantity}`,
        `Estimated Price: ${totalPrice}`
      ].join("\n")
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Email sent successfully",
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
