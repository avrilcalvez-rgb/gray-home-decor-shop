exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
  if (!SECRET_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: missing secret key.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { amount, description, remarks } = body;
  if (!amount || !description) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields.' }) };
  }

  try {
    const response = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(SECRET_KEY + ':').toString('base64'),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount),
            description: description.substring(0, 255),
            remarks: (remarks || '').substring(0, 255),
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.errors?.[0]?.detail || 'PayMongo error.';
      return { statusCode: 400, body: JSON.stringify({ error: errMsg }) };
    }

    const checkoutUrl = data?.data?.attributes?.checkout_url;
    return {
      statusCode: 200,
      body: JSON.stringify({ checkout_url: checkoutUrl }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error: ' + err.message }) };
  }
};
