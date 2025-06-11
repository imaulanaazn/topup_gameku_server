export class Config {
  port = process.env.PORT || 3001;
  timezone = process.env.TZ;
  originCors = process.env.ORIGIN_CORS;
  databaseName = process.env.DB_NAME || "topup_gameku";
  databaseUsername = process.env.DB_USERNAME || "root";
  databasePassword = process.env.DB_PASSWORD || "P@ssw0rd";
  databaseHost = process.env.DB_HOST || "127.0.0.1";
  databasePort = parseInt(process.env.DB_PORT) || 3306;

  roleUser = process.env.ROLE_USER || "asdasdadwqfqwfwqafasd";
  roleAdmin = process.env.ROLE_ADMIN || "asdwqdwqdwhjqbsadwijqbd";
  roleSuperAdmin =
    process.env.ROLE_SUPER_ADMIN || "hiewsvdfikweqviwevoufvewauoldfewvo";
  roleGuest = process.env.ROLE_GUEST || "wqbdfpouqwbfpiqbfpndpqn";
  feUrl = process.env.FE_URL || "http://localhost:3000";

  redisHost = process.env.REDIS_HOST || "localhost";
  redisPort = parseInt(process.env.REDIS_PORT) || 6379;
  redisPassword = process.env.REDIS_PASSWORD || "N0P@ss0wrd";

  secretSession = process.env.SECRET_SESSION;
  secretSessionAdmin = process.env.SECRET_SESSION_ADMIN;
  maxAgeGuest = parseInt(process.env.MAX_AGE_GUEST) || 60;
  maxAgeLogin = parseInt(process.env.MAX_AGE_LOGIN) || 60 * 60 * 24 * 3;

  expiredTimeOtp = parseInt(process.env.EXPIRED_TIME_OTP) || 10;

  domainReseller = process.env.RESELLER_DOMAIN || "http://localhost:3000";
  domainAdmin = process.env.ADMIN_DOMAIN || "http://localhost:3000";

  xApiKeyGameVoucher =
    process.env.X_API_KEY_GAME_VOUCHER ||
    "f1302600-092c-4073-b661-e255824be5ae";
  xApiKeyProcessOrder =
    process.env.X_API_KEY_PROCESS_ORDER ||
    "d6eaf008-e595-4ceb-b17e-8fa8e74839f1";

  digiflazzCbUrl =
    process.env.DIGIFLAZZ_CB_URL ||
    "http://localhost:3001/api/v1/webhook/digiflazz";
  digiflazzIp = process.env.DIGIFLAZZ_IP || "52.74.250.133";

  lapakGamingUrl =
    process.env.LAPAK_GAMING_URL || "https://www.lapakgaming.com";
  lapakGamingIP = process.env.LAPAK_GAMING_IP || "188.166.205.40";

  tokoVoucherUrl =
    process.env.TOKO_VOUCHER_URL || "https://api.tokovoucher.net";
  tokoVoucherIP = process.env.TOKO_VOUCHER_IP || "188.166.243.56";
  tokoVoucherMemberCode =
    process.env.TOKO_VOUCHER_MEMBER_CODE || "M250324OOQT5613ZY";
  tokoVoucherSignature =
    process.env.TOKO_VOUCHER_SIGNATURE || "aac9bf15241c0b47182ba472379adb02";
  tokoVoucherSecretKey =
    process.env.TOKO_VOUCHER_SECRET_KEY ||
    "61e2ca6554679d2f8c9e1689fc5debf8cf381331ea882cd0ccadb6fb1060043c";

  minioUrl = process.env.MINIO_URL || "154.26.129.236";
  minioPort = parseInt(process.env.MINIO_PORT) || 9100;
  minioUsername = process.env.MINIO_USERNAME || "topupgameku";
  minioPassword = process.env.MINIO_PASSWORD || "N0P@ssw0rd";

  imageUrl =
    process.env.IMAGE_URL || `http://localhost:${this.port}/api/v1/get-image`;

  midtransUrl =
    process.env.MIDTRANS_URL || "https://api.sandbox.midtrans.com/v2";
  midtransServerKey =
    process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-Ib4NzM_M1zUhIojHB7NvZzcb";
}
