// File: netlify/functions/send-quote-lead.js

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

  // Extract fields
  const leadName = payload?.lead?.name;
  const leadEmail = payload?.lead?.email;

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

  // Success
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      received: payload
    })
  };
};
