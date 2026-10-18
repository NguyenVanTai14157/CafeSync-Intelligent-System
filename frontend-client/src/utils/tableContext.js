export const MIN_TABLE = 1;
export const MAX_TABLE = 51;

/**
 * Kiểm tra xem tableNumber có phải là số nguyên hợp lệ từ 1 đến 51 không.
 * @param {any} tableNumber
 * @returns {boolean}
 */
export function isValidTableNumber(tableNumber) {
  if (tableNumber === null || tableNumber === undefined || tableNumber === '') {
    return false;
  }
  const num = Number(tableNumber);
  return Number.isInteger(num) && num >= MIN_TABLE && num <= MAX_TABLE;
}

/**
 * Lấy ngữ cảnh bàn hiện tại từ localStorage.
 * @returns {{ tableNumber: number|null, tableToken: string|null, isTableOrder: boolean, hasValidContext: boolean }}
 */
export function getTableContext() {
  const rawTable = localStorage.getItem('tableNumber');
  const rawToken = localStorage.getItem('tableToken');

  const validTable = isValidTableNumber(rawTable) ? Number(rawTable) : null;
  const validToken = (typeof rawToken === 'string' && rawToken.trim().length > 0) ? rawToken.trim() : null;

  return {
    tableNumber: validTable,
    tableToken: validToken,
    isTableOrder: validTable !== null,
    hasValidContext: validTable !== null && validToken !== null
  };
}

/**
 * Lưu ngữ cảnh bàn vào localStorage sau khi xác thực hợp lệ.
 * @param {number|string} tableNumber
 * @param {string} tableToken
 */
export function setTableContext(tableNumber, tableToken) {
  if (!isValidTableNumber(tableNumber)) {
    throw new Error(`Số bàn không hợp lệ: ${tableNumber}. Bàn phải từ ${MIN_TABLE} đến ${MAX_TABLE}.`);
  }
  if (!tableToken || typeof tableToken !== 'string' || tableToken.trim() === '') {
    throw new Error('Mã QR bàn không hợp lệ (tableToken thiếu).');
  }

  localStorage.setItem('tableNumber', String(Number(tableNumber)));
  localStorage.setItem('tableToken', tableToken.trim());

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tableContextUpdated', {
      detail: { tableNumber: Number(tableNumber), tableToken: tableToken.trim() }
    }));
  }
}

/**
 * Xóa thông tin bàn khỏi localStorage.
 */
export function clearTableContext() {
  localStorage.removeItem('tableNumber');
  localStorage.removeItem('tableToken');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tableContextUpdated', {
      detail: { tableNumber: null, tableToken: null }
    }));
  }
}

/**
 * Xử lý tham số bàn từ URL:
 * 1. Đọc ?table=... và &tableToken=...
 * 2. Xác thực cấu trúc cơ bản
 * 3. Nếu đã có bàn trong context, không cho phép đổi sang bàn khác qua URL
 * 4. Xóa query table và tableToken khỏi thanh địa chỉ để tránh lộ token
 * @param {string} [searchString]
 * @returns {{ processed: boolean, tableNumber: number|null, tableToken: string|null, status: string, message?: string }}
 */
export function processUrlTableParams(searchString) {
  if (typeof window === 'undefined') {
    return { processed: false, tableNumber: null, tableToken: null, status: 'NOOP' };
  }

  const search = typeof searchString === 'string' ? searchString : window.location.search;
  if (!search) {
    const current = getTableContext();
    return { processed: false, tableNumber: current.tableNumber, tableToken: current.tableToken, status: 'NO_QUERY' };
  }

  const params = new URLSearchParams(search);
  const tableParam = params.get('table');
  const tokenParam = params.get('tableToken');

  let result = { processed: false, tableNumber: null, tableToken: null, status: 'NO_TABLE_PARAM' };

  if (tableParam !== null && tableParam !== undefined) {
    if (!isValidTableNumber(tableParam)) {
      result = {
        processed: true,
        tableNumber: null,
        tableToken: null,
        status: 'INVALID_TABLE_NUMBER',
        message: `Số bàn không hợp lệ (${tableParam}). Bàn hợp lệ từ ${MIN_TABLE} đến ${MAX_TABLE}.`
      };
    } else {
      const parsedTable = Number(tableParam);
      const current = getTableContext();

      if (tokenParam && tokenParam.trim()) {
        // Có cả table và tableToken
        if (current.hasValidContext && current.tableNumber !== parsedTable) {
          // Đã có context bàn khác: không tự ý đổi bàn bằng URL
          result = {
            processed: true,
            tableNumber: current.tableNumber,
            tableToken: current.tableToken,
            status: 'PREVENTED_SWITCH',
            message: `Bạn đang phục vụ tại Bàn ${current.tableNumber}. Không thể tự động chuyển sang Bàn ${parsedTable}.`
          };
        } else {
          // Lưu context mới hoặc cập nhật token bàn hiện tại
          setTableContext(parsedTable, tokenParam.trim());
          result = {
            processed: true,
            tableNumber: parsedTable,
            tableToken: tokenParam.trim(),
            status: 'CONTEXT_SAVED',
            message: `Đã kết nối thành công Bàn ${parsedTable}.`
          };
        }
      } else {
        // Có table nhưng KHÔNG có tableToken: Không dùng context này để đặt món tại bàn
        result = {
          processed: true,
          tableNumber: null,
          tableToken: null,
          status: 'MISSING_TOKEN',
          message: 'Mã QR bàn không có token hợp lệ. Vui lòng quét lại mã QR tại bàn.'
        };
      }
    }

    // Xóa params khỏi URL để bảo mật và giữ URL sạch
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('table') || url.searchParams.has('tableToken')) {
        url.searchParams.delete('table');
        url.searchParams.delete('tableToken');
        const cleanUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {
      // Ignored in non-browser environments
    }
  }

  return result;
}
