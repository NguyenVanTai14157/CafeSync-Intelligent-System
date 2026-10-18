const jwt = require('jsonwebtoken');

const MIN_TABLE = 1;
const MAX_TABLE = 51;

/**
 * Lấy TABLE_QR_SECRET từ biến môi trường.
 * Ở production: bắt buộc phải có TABLE_QR_SECRET, không dùng secret yếu.
 * Ở dev/test: fallback nếu chưa thiết lập, hoặc cho phép override qua tham số/env.
 */
function getTableQrSecret() {
  const secret = process.env.TABLE_QR_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('TABLE_QR_SECRET chưa được cấu hình trên môi trường production.');
      err.code = 'CONFIG_MISSING';
      throw err;
    }
    return 'CAFE_SYNC_DEV_TABLE_QR_SECRET_KEY_2026';
  }
  return secret;
}

/**
 * Kiểm tra xem tableNumber có phải là số nguyên hợp lệ từ 1 đến 51 không.
 */
function isValidTableNumber(tableNumber) {
  if (tableNumber === null || tableNumber === undefined || tableNumber === '') {
    return false;
  }
  const num = Number(tableNumber);
  return Number.isInteger(num) && num >= MIN_TABLE && num <= MAX_TABLE;
}

/**
 * Ký tạo token QR cho số bàn (1-51).
 * @param {number|string} tableNumber
 * @param {object} options { expiresIn, secret }
 */
function createTableQrToken(tableNumber, options = {}) {
  const num = Number(tableNumber);
  if (!isValidTableNumber(num)) {
    throw new Error(`Số bàn không hợp lệ: ${tableNumber}. Bàn phải là số nguyên từ ${MIN_TABLE} đến ${MAX_TABLE}.`);
  }

  const secret = options.secret || getTableQrSecret();
  const payload = {
    tableNumber: num,
    issuedAt: Date.now(),
    type: 'table_qr'
  };

  const signOptions = {};
  if (options.expiresIn !== undefined) {
    if (options.expiresIn) signOptions.expiresIn = options.expiresIn;
  } else {
    signOptions.expiresIn = process.env.TABLE_QR_EXPIRES_IN || '30d';
  }

  return jwt.sign(payload, secret, signOptions);
}

/**
 * Xác thực token QR bàn.
 * @param {string} token
 * @param {object} options { secret }
 * @returns {{ valid: boolean, tableNumber?: number, issuedAt?: number, reason?: string, message: string }}
 */
function verifyTableQrToken(token, options = {}) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return {
      valid: false,
      reason: 'MISSING',
      message: 'Mã QR bàn bị thiếu hoặc không hợp lệ. Vui lòng quét lại mã QR tại bàn.'
    };
  }

  let secret;
  try {
    secret = options.secret || getTableQrSecret();
  } catch (cfgErr) {
    return {
      valid: false,
      reason: 'CONFIG_ERROR',
      message: 'Hệ thống chưa cấu hình TABLE_QR_SECRET.'
    };
  }

  try {
    const decoded = jwt.verify(token.trim(), secret);
    if (!decoded || typeof decoded !== 'object') {
      return {
        valid: false,
        reason: 'INVALID_PAYLOAD',
        message: 'Dữ liệu mã QR bàn không hợp lệ.'
      };
    }

    const tableNumber = Number(decoded.tableNumber);
    if (!isValidTableNumber(tableNumber)) {
      return {
        valid: false,
        reason: 'INVALID_TABLE',
        message: `Số bàn ${decoded.tableNumber} trong mã QR không hợp lệ (${MIN_TABLE}-${MAX_TABLE}).`
      };
    }

    return {
      valid: true,
      tableNumber,
      issuedAt: decoded.issuedAt || decoded.iat,
      expiresAt: decoded.exp,
      message: 'Mã QR bàn hợp lệ.'
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'Phiên QR bàn đã hết hạn hoặc không hợp lệ. Vui lòng quét lại mã QR tại bàn.'
      };
    }
    if (err.name === 'JsonWebTokenError') {
      return {
        valid: false,
        reason: 'INVALID_SIGNATURE',
        message: 'Chữ ký mã QR bàn không hợp lệ.'
      };
    }
    return {
      valid: false,
      reason: 'VERIFICATION_FAILED',
      message: err.message || 'Xác thực mã QR bàn thất bại.'
    };
  }
}

module.exports = {
  MIN_TABLE,
  MAX_TABLE,
  isValidTableNumber,
  getTableQrSecret,
  createTableQrToken,
  verifyTableQrToken
};
