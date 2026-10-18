const http = require("node:http");
const https = require("node:https");
const dns = require("node:dns");
const net = require("node:net");
const zlib = require("node:zlib");

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DECODED_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = Number(process.env.URL_FETCH_TIMEOUT_MS) || 10000;
const MAX_REDIRECTS = 3;

const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

const PRIVATE_HOSTNAMES = /^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i;

const ALLOWED_PORTS = new Set(["", "80", "443"]);

// Everything that is not ordinary public unicast: private, loopback, link-local,
// CGNAT, benchmarking, documentation, multicast, reserved, and the IPv6 ranges that
// tunnel to an arbitrary IPv4 address (NAT64, 6to4, IPv4-compatible).
const BLOCKED = new net.BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]) {
  BLOCKED.addSubnet(prefix, bits, "ipv4");
}
for (const [prefix, bits] of [
  ["::", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
]) {
  BLOCKED.addSubnet(prefix, bits, "ipv6");
}

function isBlockedIpv4(ip) {
  return BLOCKED.check(ip, "ipv4");
}

function urlError(message, code, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function blockedAddressError() {
  return urlError("This address is not reachable", "URL_PRIVATE");
}

function isPrivateAddress(address) {
  const ip = String(address).replace(/^\[|\]$/g, "").toLowerCase();

  if (net.isIPv4(ip)) return isBlockedIpv4(ip);

  if (net.isIPv6(ip)) {
    const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isBlockedIpv4(dotted[1]);
    const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const high = parseInt(hex[1], 16);
      const low = parseInt(hex[2], 16);
      return isBlockedIpv4([high >> 8, high & 255, low >> 8, low & 255].join("."));
    }
    return BLOCKED.check(ip, "ipv6");
  }

  return false;
}

function isLoopback(address) {
  const ip = String(address).replace(/^\[|\]$/g, "").toLowerCase();
  if (ip === "localhost") return true;
  if (net.isIPv4(ip)) return /^127\./.test(ip);
  if (ip === "::1") return true;
  const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return /^127\./.test(dotted[1]);
  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const high = parseInt(hex[1], 16);
    return (high >> 8) === 127;
  }
  return false;
}

function isBlockedAddress(address, allowLoopback) {
  if (allowLoopback && isLoopback(address)) return false;
  return isPrivateAddress(address);
}

function isBlockedHost(hostname, allowLoopback) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (allowLoopback && isLoopback(host)) return false;
  if (PRIVATE_HOSTNAMES.test(host)) return true;
  return isPrivateAddress(host);
}

function assertPublicUrl(raw, { allowLoopback = false } = {}) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw urlError("Invalid URL", "URL_INVALID");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw urlError("Only http and https URLs are supported", "URL_INVALID");
  }

  if (isBlockedHost(url.hostname, allowLoopback)) {
    throw blockedAddressError();
  }

  if (!allowLoopback && !ALLOWED_PORTS.has(url.port)) {
    throw blockedAddressError();
  }

  return url;
}

function makeGuardedLookup(allowLoopback) {
  return function guardedLookup(hostname, options, callback) {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err);

      const list = Array.isArray(addresses) ? addresses : [addresses];
      if (!list.length) return callback(blockedAddressError());

      for (const entry of list) {
        if (isBlockedAddress(entry.address, allowLoopback)) {
          return callback(blockedAddressError());
        }
      }

      if (options.all) return callback(null, list);
      return callback(null, list[0].address, list[0].family);
    });
  };
}

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

function requestOnce(url, deadline, allowLoopback) {
  const transport = url.protocol === "https:" ? https : http;
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    return Promise.reject(
      urlError("The page took too long to load", "URL_TIMEOUT", 504),
    );
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: "GET",
        lookup: makeGuardedLookup(allowLoopback),
        headers: {
          "User-Agent": "SmartKitchen/1.0 (recipe import; +https://github.com/KovyD20/receptor)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "hu,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      resolve,
    );

    req.setTimeout(remaining, () => {
      req.destroy(urlError("The page took too long to load", "URL_TIMEOUT", 504));
    });

    req.on("error", (err) => {
      if (err?.code === "URL_PRIVATE" || err?.code === "URL_TIMEOUT") {
        return reject(err);
      }
      reject(urlError("Could not reach the page", "URL_FETCH_FAILED", 502));
    });

    req.end();
  });
}

function decompressStream(response) {
  const encoding = (response.headers["content-encoding"] || "").toLowerCase();
  const options = { maxOutputLength: MAX_DECODED_BYTES };
  if (encoding === "gzip") return response.pipe(zlib.createGunzip(options));
  if (encoding === "deflate") return response.pipe(zlib.createInflate(options));
  if (encoding === "br") return response.pipe(zlib.createBrotliDecompress(options));
  return response;
}

function decodeBody(buffer, contentType) {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType || "")?.[1];
  if (charset && !/^utf-?8$/i.test(charset)) {
    try {
      return new TextDecoder(charset).decode(buffer);
    } catch {
    }
  }
  return buffer.toString("utf8");
}

function readBounded(response, deadline) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let wireBytes = 0;
    let decodedBytes = 0;
    let settled = false;

    const stream = decompressStream(response);

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      response.destroy();
      if (stream !== response) stream.destroy();
      reject(err);
    };

    const timer = setTimeout(
      () => fail(urlError("The page took too long to load", "URL_TIMEOUT", 504)),
      Math.max(deadline - Date.now(), 1),
    );

    response.on("data", (chunk) => {
      wireBytes += chunk.length;
      if (wireBytes > MAX_BYTES) {
        fail(urlError("Page is too large to read", "URL_TOO_LARGE", 413));
      }
    });

    stream.on("data", (chunk) => {
      decodedBytes += chunk.length;
      if (decodedBytes > MAX_DECODED_BYTES) {
        return fail(urlError("Page is too large to read", "URL_TOO_LARGE", 413));
      }
      chunks.push(chunk);
    });

    stream.on("end", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(decodeBody(Buffer.concat(chunks), response.headers["content-type"]));
    });

    const onError = () => fail(urlError("The page could not be read", "URL_FETCH_FAILED", 502));
    stream.on("error", onError);
    response.on("error", onError);
  });
}

async function fetchPageHtml(rawUrl, { allowLoopback = false } = {}) {
  const deadline = Date.now() + FETCH_TIMEOUT_MS;
  let url = assertPublicUrl(rawUrl, { allowLoopback });

  for (let hop = 0; ; hop++) {
    const response = await requestOnce(url, deadline, allowLoopback);
    const status = response.statusCode;

    if (REDIRECT_STATUS.has(status)) {
      response.resume();
      if (hop >= MAX_REDIRECTS) {
        throw urlError(
          "The page redirected too many times",
          "URL_TOO_MANY_REDIRECTS",
          502,
        );
      }
      const location = response.headers.location;
      if (!location) {
        throw urlError("The page could not be loaded", "URL_FETCH_FAILED", 502);
      }
      url = assertPublicUrl(new URL(location, url).href, { allowLoopback });
      continue;
    }

    if (status < 200 || status >= 300) {
      response.resume();
      const blocked = [401, 403, 429].includes(status);
      throw urlError(
        blocked ? "The site refused the request" : "The page could not be loaded",
        blocked ? "URL_BLOCKED" : "URL_FETCH_FAILED",
        502,
      );
    }

    const contentType = (response.headers["content-type"] || "").toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
      response.resume();
      throw urlError("This link is not a web page", "URL_NOT_HTML", 415);
    }

    return readBounded(response, deadline);
  }
}

module.exports = {
  assertPublicUrl,
  isPrivateAddress,
  fetchPageHtml,
  MAX_BYTES,
  MAX_REDIRECTS,
};
