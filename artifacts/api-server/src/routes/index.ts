import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checksRouter from "./checks";
import contentRouter from "./content";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checksRouter);
router.use(contentRouter);

export default router;
