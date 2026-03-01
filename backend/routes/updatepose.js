const express = require("express");
const router = express.Router();
const {updatePoseScore}  = require("../controllers/session.controller");

router.post("/updatePose", updatePoseScore);

module.exports = router;