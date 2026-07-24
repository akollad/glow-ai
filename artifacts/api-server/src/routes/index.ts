import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import scansRouter from "./scans";
import paymentsRouter from "./payments";
import youcamRouter from "./youcam";
import tiktokRouter from "./tiktok";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(scansRouter);
router.use(paymentsRouter);
router.use(youcamRouter);
router.use(tiktokRouter);
router.use(statsRouter);

export default router;
