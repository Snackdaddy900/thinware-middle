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

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      message: "Function is working"
    })
  };
};
