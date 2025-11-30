// netlify/functions/send-quote-lead.js
const https = require("https");

// Helper: send email via Resend API
function sendEmailWithResend({ apiKey, from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    });

    const options = {
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body });
        } else {
          reject(
            new Error(
              `Resend API error: ${res.statusCode} - ${body || "No body"}`
            )
          );
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(data);
    req.end();
  });
}

exports.handler = async (event, context) => {
  try {
    // Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          ok: false,
          error: "Method Not Allowed. Use POST."
        })
      };
    }

    // Parse JSON body
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (err) {
      console.error("Invalid JSON body:", err);
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid JSON body"
        })
      };
    }

    // Destructure with safe defaults
    const {
      leadName,
      leadEmail,
      companyName = "",
      notes = "",
      product,
      config = {},
      price = 0,
      configId = "",
      sourceUrl = ""
    } = payload;

    // Basic required fields
    const missing = [];
    if (!leadName) missing.push("leadName");
    if (!leadEmail) missing.push("leadEmail");
    if (!product) missing.push("product");

    if (missing.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Missing required fields",
          missing
        })
      };
    }

    // Normalised summary object (what we log & include in email)
    const summary = {
      lead: {
        name: leadName,
        email: leadEmail,
        company: companyName
      },
      product,
      price,
      configId,
      config,
      notes,
      sourceUrl
    };

    console.log("Received lead payload:", JSON.stringify(summary, null, 2));

    // --- Email setup ---
    const RESEND_API_KEY = process.env.resend_api_key;
    const RESEND_FROM_EMAIL =
      process.env.resend_from_email || "Quotes <no-reply@example.com>";
    const RESEND_ADMIN_EMAIL =
      process.env.resend_admin_email || "admin@example.com";

    // Build email HTML
    const html = `
      <h2>New Quote Request</h2>
      <h3>Lead Details</h3>
      <ul>
        <li><strong>Name:</strong> ${leadName}</li>
        <li><strong>Email:</strong> ${leadEmail}</li>
        <li><strong>Company:</strong> ${companyName || "(none)"} </li>
      </ul>

      <h3>Product</h3>
      <ul>
        <li><strong>Product:</strong> ${product}</li>
        <li><strong>Price:</strong> ${price}</li>
        <li><strong>Config ID:</strong> ${configId || "(none)"}</li>
      </ul>

      <h3>Configuration</h3>
      <pre style="background:#f4f4f4;padding:10px;">${JSON.stringify(
        config,
        null,
        2
      )}</pre>

      <h3>Notes</h3>
      <p>${notes || "(none)"} </p>

      <h3>Source</h3>
      <p><a href="${sourceUrl}">${sourceUrl}</a></p>
    `;

    let emailSent = false;
    let emailError = null;

    if (!RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY not set. Skipping email send but returning success."
      );
    } else {
      try {
        // Send to admin + lead
        const recipients = [RESEND_ADMIN_EMAIL, leadEmail].filter(Boolean);

        await sendEmailWithResend({
          apiKey: RESEND_API_KEY,
          from: RESEND_FROM_EMAIL,
          to: recipients,
          subject: `Quote request: ${product} ${
            configId ? `(${configId})` : ""
          }`,
          html
        });

        emailSent = true;
      } catch (err) {
        console.error("Error sending email via Resend:", err);
        emailError = err.message || String(err);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Lead received",
        emailSent,
        emailError,
        data: summary
      })
    };
  } catch (err) {
    console.error("Unexpected error in send-quote-lead:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Internal Server Error"
      })
    };
  }
};
