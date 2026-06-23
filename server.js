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

// Proxy Checker API
app.post("/check", async (req, res) => {
  try {
    let proxy = (req.body.proxy || "").trim();

    if (!proxy) {
      return res.json({
        success: false,
        error: "Please enter a proxy."
      });
    }

    // Convert:
    // socks5://host:port:username:password
    // into:
    // socks5://username:password@host:port
    if (
      proxy.startsWith("socks5://") &&
      proxy.replace("socks5://", "").split(":").length >= 4
    ) {
      const p = proxy.replace("socks5://", "").split(":");

      const host = p[0];
      const port = p[1];
      const password = p[p.length - 1];
      const username = p.slice(2, -1).join(":");

      proxy =
        `socks5://${encodeURIComponent(username)}` +
        `:${encodeURIComponent(password)}` +
        `@${host}:${port}`;
    }

    const agent = new SocksProxyAgent(proxy);

    // Get public IP through proxy
    const ipRes = await axios.get(
      "https://api.ipify.org?format=json",
      {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 15000
      }
    );

    const ip = ipRes.data.ip;

    // Get country and ISP
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
