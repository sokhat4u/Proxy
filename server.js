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

const ipRes = await axios.get(
  "https://api.ipify.org?format=json",
  {
    httpAgent: agent,
    httpsAgent: agent,
    timeout: 15000
  }
);

const ip = ipRes.data.ip;

const geoRes = await axios.get(
  `http://ip-api.com/json/${ip}`
);

const isp = geoRes.data.isp || "Unknown";

let usageType = "Unknown";

if (/mobile|telecom|wireless|cell/i.test(isp)) {
  usageType = "Mobile ISP";
}

let fraudScore = 0;

// Estimated score only
fraudScore += 20; // proxy detected

if (usageType === "Mobile ISP") {
  fraudScore += 10;
} else {
  fraudScore += 20;
}

if (/vpn|hosting|cloud|server|digitalocean|amazon|google/i.test(isp)) {
  fraudScore += 30;
}

fraudScore = Math.min(fraudScore, 100);

let riskLevel = "Low 🟢";

if (fraudScore >= 51) {
  riskLevel = "High 🔴";
} else if (fraudScore >= 21) {
  riskLevel = "Medium 🟡";
}

res.json({
  success: true,
  ip,
  type: ip.includes(":") ? "IPv6" : "IPv4",
  country: geoRes.data.country,
  city: geoRes.data.city,
  isp,
  usageType,
  isProxy: true,
  fraudScore,
  riskLevel
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
console.log("Server running on ${PORT}");
});
