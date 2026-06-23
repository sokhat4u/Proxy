const express = require("express");
const axios = require("axios");
const { SocksProxyAgent } = require("socks-proxy-agent");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/check", async (req, res) => {
try {
let proxy = (req.body.proxy || "").trim();

if (!proxy) {
  return res.json({
    success: false,
    error: "Please enter a proxy."
  });
}

// Supports:
// socks5://host:port:username:password
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

const start = Date.now();

const ipRes = await axios.get(
  "https://api.ipify.org?format=json",
  {
    httpAgent: agent,
    httpsAgent: agent,
    timeout: 15000
  }
);

const responseTime =
  Date.now() - start;

const ip = ipRes.data.ip;

const geoRes = await axios.get(
  `http://ip-api.com/json/${ip}`
);

const isp =
  geoRes.data.isp || "Unknown";

let usageType = "Unknown";

if (
  /mobile|telecom|wireless|cell/i.test(
    isp
  )
) {
  usageType = "Mobile ISP";
}

res.json({
  success: true,
  ip,
  type:
    ip.includes(":")
      ? "IPv6"
      : "IPv4",
  country:
    geoRes.data.country ||
    "Unknown",
  city:
    geoRes.data.city ||
    "Unknown",
  isp,
  usageType,
  responseTime
});

} catch (err) {
res.json({
success: false,
error:
err.message ||
"Proxy check failed."
});
}
});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(
"Server running on port ${PORT}"
);
});
