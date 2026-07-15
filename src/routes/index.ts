import { Router, type IRouter } from "express";
import healthRouter from "./health";
import votesRouter from "./votes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(votesRouter);

export default router;
