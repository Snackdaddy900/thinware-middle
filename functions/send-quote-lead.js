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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "(none)";
  }

  if (typeof value === "object") {
    return `<pre style="background:#f4f4f4;padding:10px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(
      JSON.stringify(value, null, 2)
    )}</pre>`;
  }

  return escapeHtml(value);
}

function renderKeyValueList(obj) {
  const entries = Object.entries(obj || {});
  if (entries.length === 0) {
    return "<p>(none)</p>";
  }

  const items = entries
    .map(
      ([key, value]) =>
        `<li><strong>${escapeHtml(key)}:</strong> ${
          typeof value === "object" && value !== null
            ? formatValue(value)
            : formatValue(value)
        }</li>`
    )
    .join("");

  return `<ul>${items}</ul>`;
}

exports.handler = async (event) => {
  try {
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
      console.error("Invalid JSON body:", err);
      return {
        statusCode: 400,
        body: JSON.stringify({
          ok: false,
          error: "Invalid JSON body"
        })
      };
    }

    // Stable identity fields
    const {
      leadName,
      leadEmail,

      // Optional known fields
      companyName = "",
      notes = "",
      product = "",
      price = "",
      configId = "",
      sourceUrl = "",
      routeKey = "",

      // Preferred flexible bucket
      config = {},

      // Everything else from the configurator
      ...extraFields
    } = payload;

    const missing = [];
    if (!leadName) missing.push("leadName");
    if (!leadEmail) missing.push("leadEmail");

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

    // Routing:
    // 1. Per-deployment default recipient from env
    // 2. Optional routeKey mapping via env JSON
    //
    // Example env:
    // LEAD_RECIPIENT_EMAIL=sales@customer.com
    // ROUTE_KEY_MAP={"acme":"sales@acme.com","beta":"quotes@beta.com"}
    let recipientEmail =
      process.env.LEAD_RECIPIENT_EMAIL ||
      process.env.resend_admin_email ||
      "stuart@powercore.nz";

    if (routeKey && process.env.ROUTE_KEY_MAP) {
      try {
        const routeMap = JSON.parse(process.env.ROUTE_KEY_MAP);
        if (routeMap[routeKey]) {
          recipientEmail = routeMap[routeKey];
        }
      } catch (err) {
        console.warn("Invalid ROUTE_KEY_MAP JSON:", err.message);
      }
    }

    const summary = {
      lead: {
        name: leadName,
        email: leadEmail,
        company: companyName
      },
      routeKey,
      recipientEmail,
      product,
      price,
      configId,
      config,
      notes,
      sourceUrl,
      extraFields
    };

    console.log("Received lead payload:", JSON.stringify(summary, null, 2));

    const RESEND_API_KEY = process.env.resend_api_key;
    const RESEND_FROM_EMAIL =
      process.env.RESEND_FROM_EMAIL ||
      "Thinware Quotes <onboarding@resend.dev>";

    const html = `
      <h2>New Quote Request</h2>

      <h3>Lead Details</h3>
      <ul>
        <li><strong>Name:</strong> ${formatValue(leadName)}</li>
        <li><strong>Email:</strong> ${formatValue(leadEmail)}</li>
        <li><strong>Company:</strong> ${formatValue(companyName)}</li>
      </ul>

      <h3>Routing</h3>
      <ul>
        <li><strong>Route Key:</strong> ${formatValue(routeKey)}</li>
        <li><strong>Recipient:</strong> ${formatValue(recipientEmail)}</li>
      </ul>

      <h3>Known Metadata</h3>
      <ul>
        <li><strong>Product:</strong> ${formatValue(product)}</li>
        <li><strong>Price:</strong> ${formatValue(price)}</li>
        <li><strong>Config ID:</strong> ${formatValue(configId)}</li>
        <li><strong>Source URL:</strong> ${
          sourceUrl
            ? `<a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a>`
            : "(none)"
        }</li>
      </ul>

      <h3>Configuration</h3>
      ${renderKeyValueList(config)}

      <h3>Additional Fields</h3>
      ${renderKeyValueList(extraFields)}

      <h3>Notes</h3>
      <p>${formatValue(notes)}</p>
    `;

    let emailSent = false;
    let emailError = null;

    if (!RESEND_API_KEY) {
      console.warn(
        "resend_api_key not set. Skipping email send but returning success."
      );
    } else if (!recipientEmail) {
      console.warn(
        "No recipient email configured. Skipping email send but returning success."
      );
    } else {
      try {
        await sendEmailWithResend({
          apiKey: RESEND_API_KEY,
          from: RESEND_FROM_EMAIL,
          to: [recipientEmail],
          subject: `Quote request${product ? `: ${product}` : ""}${
            configId ? ` (${configId})` : ""
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
