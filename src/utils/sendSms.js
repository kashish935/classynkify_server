// SMS_MODE (set in .env):
//   console (default) -> prints the OTP in the backend terminal, no SMS sent
//   quick             -> Fast2SMS Quick SMS route
//   otp               -> Fast2SMS OTP route (needs website verification on Fast2SMS)
export const sendOtpSms = async (phone, otp) => {
  const key = process.env.FAST2SMS_API_KEY;
  const mode = String(process.env.SMS_MODE || "console").trim().toLowerCase();

  console.log(`[SMS] mode=${mode}`);

  if (mode === "console" || !key) {
    console.log(`\n[DEV] OTP for ${phone}: ${otp}\n`);
    return;
  }

  const body =
    mode === "quick"
      ? {
          route: "q",
          message: `Your Classynkify OTP is ${otp}. It is valid for 5 minutes. Do not share it with anyone.`,
          language: "english",
          flash: 0,
          numbers: phone,
        }
      : { route: "otp", variables_values: otp, numbers: phone };

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: { authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.return) {
    throw new Error(
      Array.isArray(data.message) ? data.message[0] : data.message || "Failed to send SMS"
    );
  }
};