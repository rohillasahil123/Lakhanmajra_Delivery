declare module "express-mongo-sanitize" {
  import { RequestHandler } from "express";
  const mongoSanitize: (options?: any) => RequestHandler;
  export default mongoSanitize;
}
