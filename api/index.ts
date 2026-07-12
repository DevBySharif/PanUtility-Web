import { bootstrap } from "../server";

const appPromise = bootstrap();

export default async (req: any, res: any) => {
  const app = await appPromise;
  app(req, res);
};
