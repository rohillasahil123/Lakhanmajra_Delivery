export const success = (res: any, data: any, message = "OK", status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

export const fail = (res: any, message = "Error", status = 500, details?: any) => {
  const payload: any = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
};
