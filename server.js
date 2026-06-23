const express = require("express");
const axios = require("axios");
const { SocksProxyAgent } = require("socks-proxy-agent");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post("/check", async (req, res) => {
  try {
    const proxy = req.body.proxy;

    const agent = new SocksProxyAgent(proxy);

    const ipRes = await axios.get(
      "https://api.ipify.org?format=json",
      {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000
      }
    );

    const ip = ipRes.data.ip;

    const geoRes = await axios.get(
      `http://ip-api.com/json/${ip}`
    );

    res.json({
      success: true,
      ip,
      type: ip.includes(":") ? "IPv6" : "IPv4",
      country: geoRes.data.country
    });

  } catch (e) {
    res.json({
      success: false,
      error: e.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});
