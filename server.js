require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();

const port = process.env.PORT || 3000;

let accessToken = null;
let refreshToken = null;
let realmId = null;

app.get("/", (req, res) => {
  res.send("👋 QuickBooks Proxy API is up and running.");
});

app.get("/authorize", (req, res) => {
  const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);
  const clientId = process.env.CLIENT_ID;
  const scope = "com.intuit.quickbooks.accounting";

  const authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=refenelGPT`;
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const authCode = req.query.code;
  realmId = req.query.realmId;

  try {
    const tokenResponse = await axios.post(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
    refreshToken = tokenResponse.data.refresh_token;

    console.log("✅ Access token:", accessToken);
    console.log("🔁 Refresh token:", refreshToken);
    console.log("🏢 Realm ID:", realmId);

    res.send("🎉 Authorized! Tokens received. Ready to hit QuickBooks.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("❌ Token exchange failed.");
  }
});

app.get("/invoices", async (req, res) => {
  if (!accessToken || !realmId) {
    return res.status(401).send("❌ Not authenticated with QuickBooks yet.");
  }

  try {
    const response = await axios.get(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Invoice MAXRESULTS 10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("❌ Failed to fetch invoices.");
  }
});

app.listen(port, () => {
  console.log(`🚀 Server is live at http://localhost:${port}`);
});
