// File: netlify/functions/send-quote-lead.js

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        error: "Method Not Allowed. Use POST.",
      }),
    };
  }

  // Parse JSON body
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("Failed to parse JSON body:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        error: "Invalid JSON body",
      }),
    };
  }

  // Log what we received (visible in Netlify function logs)
  console.log("Received lead payload:", payload);

  // Later we can add:
  // - email sending
  // - Quotient integration
  // - anything else you want
  // For now, just acknowledge success.
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
    }),
  };
};
