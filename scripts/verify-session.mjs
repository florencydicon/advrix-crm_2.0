import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode("advrix_super_secret_key_2026_secure_login");

const payload = {
  sub: "11111111-1111-1111-1111-111111111111",
  email: "pm@advrix.agency",
  name: "Priya Mehta",
  role_key: "PROJECT_MANAGER",
  role_label: "Project Manager",
  dashboard: "pm",
};

const token = await new SignJWT({ ...payload })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("12h")
  .sign(secret);
console.log("signed token:", token.slice(0, 40) + "...");

const { payload: verified } = await jwtVerify(token, secret);
console.log("verify ok:", verified.sub === payload.sub, "| role:", verified.role_key);

try {
  await jwtVerify(token + "tampered", secret);
  console.log("FAIL: tampered token accepted");
} catch {
  console.log("tampered token rejected: OK");
}

try {
  await jwtVerify(await new SignJWT({ ...payload }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("wrong-secret")), secret);
  console.log("FAIL: wrong-secret token accepted");
} catch {
  console.log("wrong-secret token rejected: OK");
}
