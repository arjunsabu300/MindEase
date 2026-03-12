const express = require("express");
const router = express.Router();
const {updatePoseScore, getPoseHistory}  = require("../controllers/session.controller");

router.post("/updatePose", updatePoseScore);
router.get("/poseHistory/:sessionId", getPoseHistory);

module.exports = router;