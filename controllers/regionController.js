import Region from "../models/Region.js";
import { ok, fail } from "../utils/responses.js";

// ---------------------
// GET ALL REGIONS
// ---------------------
export const listRegions = async (req, res) => {
  try {
    const docs = await Region.find().sort({ city: 1 });
    return ok(res, docs);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ---------------------
// ADD CITY
// ---------------------
export const addCity = async (req, res) => {
  try {
    const { city } = req.body;
    if (!city) return fail(res, 400, "City name required");

    const exists = await Region.findOne({ city });
    if (exists) return fail(res, 400, "City already exists");

    const doc = await Region.create({ city, areas: [] });

    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ---------------------
// ADD AREA TO CITY
// ---------------------
export const addArea = async (req, res) => {
  try {
    const { city, area } = req.body;
    if (!city || !area) return fail(res, 400, "City & area required");

    const doc = await Region.findOne({ city });
    if (!doc) return fail(res, 404, "City not found");

    if (!doc.areas.includes(area)) doc.areas.push(area);
    await doc.save();

    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ---------------------
// REMOVE AREA FROM CITY
// ---------------------
export const removeArea = async (req, res) => {
  try {
    const { city, area } = req.body;
    if (!city || !area) return fail(res, 400, "City & area required");

    const doc = await Region.findOne({ city });
    if (!doc) return fail(res, 404, "City not found");

    doc.areas = doc.areas.filter((a) => a !== area);
    await doc.save();

    return ok(res, doc);
  } catch (e) {
    return fail(res, 400, e.message);
  }
};

// ---------------------
// DELETE CITY
// ---------------------
export const deleteCity = async (req, res) => {
  try {
    const city = req.params.city;
    if (!city) return fail(res, 400, "City required");

    await Region.deleteOne({ city });

    return ok(res, { message: "Deleted" });
  } catch (e) {
    return fail(res, 400, e.message);
  }
};
