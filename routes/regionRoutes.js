import express from "express";
import {
  listRegions,
  addCity,
  addArea,
  removeArea,
  deleteCity,
} from "../controllers/regionController.js";

const router = express.Router();

router.get("/", listRegions);
router.post("/", addCity);
router.put("/add-area", addArea);
router.put("/remove-area", removeArea);
router.delete("/:city", deleteCity);

export default router;
