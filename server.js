const express = require("express");
const axios = require("axios");
const { SocksProxyAgent } = require("socks-proxy-agent");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Proxy checker API
app.post("/check", async (req, res) => {
  try {
    const proxy = req.body.proxy;

    if (!proxy) {
      return res.json({
        success: false,
        error: "Proxy is required"
      });
    }

    const agent = new SocksProxyAgent(proxy);

    // Proxy ke through public IP nikalo
    const ipRes = await axios.get(
      "https://api.ipify.org?format=json",
      {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000
      }
    );

    const ip = ipRes.data.ip;

    // Country aur IP details
    const geoRes = await axios.get(
      `http://ip-api.com/json/${ip}`
    );

    res.json({
      success: true,
      ip,
      type: ip.includes(":") ? "IPv6" : "IPv4",
      country: geoRes.data.country,
      countryCode: geoRes.data.countryCode,
      isp: geoRes.data.isp
    });

  } catch (err) {
    res.json({
      success: false,
      error: err.message
    });
  }
});

// Local testing ke liye
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
