import express from "express";
import { deliverCamera, getDeliveryHistory } from "../controllers/delivery.controller.js";

const router = express.Router();

router.post("/deliver", deliverCamera);
router.get("/history", getDeliveryHistory);

export default router;
