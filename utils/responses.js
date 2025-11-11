export const ok = (res, data = {}, extras = {}) => res.json({ ok: true, data, ...extras });
export const fail = (res, code = 400, message = 'Bad Request') =>
  res.status(code).json({ ok: false, message });
