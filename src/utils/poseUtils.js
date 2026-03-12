// Calculate angle between three points (A-B-C where B is the vertex)
export const calculateAngle = (A, B, C) => {
  const radians =
    Math.atan2(C.y - B.y, C.x - B.x) -
    Math.atan2(A.y - B.y, A.x - B.x);

  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180) {
    angle = 360 - angle;
  }

  return angle;
};

// Calculate distance between two points
export const calculateDistance = (point1, point2) => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Calculate pose score based on user angles vs reference angles
export const calculatePoseScore = (userAngles, referenceAngles) => {
  let total = 0;
  let count = 0;

  Object.keys(referenceAngles).forEach((key) => {
    if (userAngles[key] !== undefined) {
      const reference = referenceAngles[key];
      const diff = Math.abs(userAngles[key] - reference.angle);
      const tolerance = reference.tolerance || 15;
      
      // Score based on how close to reference within tolerance
      const score = Math.max(0, 100 - (diff / tolerance) * 100);
      total += score;
      count++;
    }
  });

  return count > 0 ? total / count : 0;
};

// Extract all relevant angles from landmarks
export const extractAnglesFromLandmarks = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }

  const angles = {};

  try {
    // Knee angles
    angles.leftKnee = calculateAngle(
      landmarks[23], // left hip
      landmarks[25], // left knee
      landmarks[27]  // left ankle
    );

    angles.rightKnee = calculateAngle(
      landmarks[24], // right hip
      landmarks[26], // right knee
      landmarks[28]  // right ankle
    );

    // Elbow angles
    angles.leftElbow = calculateAngle(
      landmarks[11], // left shoulder
      landmarks[13], // left elbow
      landmarks[15]  // left wrist
    );

    angles.rightElbow = calculateAngle(
      landmarks[12], // right shoulder
      landmarks[14], // right elbow
      landmarks[16]  // right wrist
    );

    // Hip angles
    angles.leftHip = calculateAngle(
      landmarks[11], // left shoulder
      landmarks[23], // left hip
      landmarks[25]  // left knee
    );

    angles.rightHip = calculateAngle(
      landmarks[12], // right shoulder
      landmarks[24], // right hip
      landmarks[26]  // right knee
    );

    // Shoulder angles
    angles.leftShoulder = calculateAngle(
      landmarks[23], // left hip
      landmarks[11], // left shoulder
      landmarks[13]  // left elbow
    );

    angles.rightShoulder = calculateAngle(
      landmarks[24], // right hip
      landmarks[12], // right shoulder
      landmarks[14]  // right elbow
    );

    // Spine angle (approximation using shoulders and hips)
    const midShoulder = {
      x: (landmarks[11].x + landmarks[12].x) / 2,
      y: (landmarks[11].y + landmarks[12].y) / 2
    };
    const midHip = {
      x: (landmarks[23].x + landmarks[24].x) / 2,
      y: (landmarks[23].y + landmarks[24].y) / 2
    };
    
    // Calculate spine angle relative to vertical
    const spineAngle = Math.atan2(
      midShoulder.x - midHip.x,
      midHip.y - midShoulder.y
    ) * (180 / Math.PI);
    angles.spine = 180 - Math.abs(spineAngle);

  } catch (error) {
    console.error("Error calculating angles:", error);
    return null;
  }

  return angles;
};

// Generate detailed feedback based on pose comparison
export const generatePoseFeedback = (userAngles, poseTemplate) => {
  if (!userAngles || !poseTemplate) {
    return {
      overall: "Position yourself in front of the camera",
      details: [],
      score: 0
    };
  }

  const feedback = {
    overall: "",
    details: [],
    score: 0
  };

  const referenceAngles = poseTemplate.keyAngles;
  let totalScore = 0;
  let angleCount = 0;

  Object.keys(referenceAngles).forEach((angleKey) => {
    const reference = referenceAngles[angleKey];
    const userAngle = userAngles[angleKey];

    if (userAngle !== undefined) {
      const diff = Math.abs(userAngle - reference.angle);
      const tolerance = reference.tolerance || 15;
      const score = Math.max(0, 100 - (diff / tolerance) * 100);
      
      totalScore += score;
      angleCount++;

      // Generate specific feedback for each angle
      if (diff > tolerance) {
        const adjustment = userAngle > reference.angle ? "decrease" : "increase";
        feedback.details.push({
          joint: angleKey,
          message: `${formatAngleName(angleKey)}: ${adjustment} angle by ${Math.round(diff)}°`,
          severity: diff > tolerance * 1.5 ? "high" : "medium"
        });
      } else if (diff > tolerance * 0.5) {
        feedback.details.push({
          joint: angleKey,
          message: `${formatAngleName(angleKey)}: Almost there! Adjust slightly`,
          severity: "low"
        });
      }
    }
  });

  feedback.score = angleCount > 0 ? totalScore / angleCount : 0;

  // Generate overall feedback
  if (feedback.score >= 90) {
    feedback.overall = "Perfect! Hold this position 🔥";
  } else if (feedback.score >= 75) {
    feedback.overall = "Great form! Minor adjustments needed";
  } else if (feedback.score >= 60) {
    feedback.overall = "Good effort! Keep adjusting";
  } else if (feedback.score >= 40) {
    feedback.overall = "Getting there! Follow the corrections";
  } else {
    feedback.overall = "Align your body with the reference pose";
  }

  return feedback;
};

// Format angle name for display
const formatAngleName = (angleKey) => {
  const names = {
    leftKnee: "Left Knee",
    rightKnee: "Right Knee",
    leftElbow: "Left Elbow",
    rightElbow: "Right Elbow",
    leftHip: "Left Hip",
    rightHip: "Right Hip",
    leftShoulder: "Left Shoulder",
    rightShoulder: "Right Shoulder",
    spine: "Spine Alignment"
  };
  return names[angleKey] || angleKey;
};

// Check if pose is held correctly for duration
export const checkPoseHold = (scoreHistory, threshold = 85, duration = 3) => {
  if (scoreHistory.length < duration) {
    return false;
  }

  const recentScores = scoreHistory.slice(-duration);
  return recentScores.every(score => score >= threshold);
};

// Smooth score over time to reduce jitter
export const smoothScore = (currentScore, newScore, smoothingFactor = 0.7) => {
  return currentScore * smoothingFactor + newScore * (1 - smoothingFactor);
};

// Validate landmarks visibility
export const validateLandmarks = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return {
      valid: false,
      message: "Unable to detect body. Please ensure full body is visible."
    };
  }

  // Check if key landmarks are visible (have good visibility score)
  const keyLandmarks = [11, 12, 23, 24, 25, 26]; // shoulders, hips, knees
  const visibleCount = keyLandmarks.filter(idx => 
    landmarks[idx] && landmarks[idx].visibility > 0.5
  ).length;

  if (visibleCount < keyLandmarks.length * 0.7) {
    return {
      valid: false,
      message: "Some body parts are not visible. Adjust camera position."
    };
  }

  return {
    valid: true,
    message: "Body detected successfully"
  };
};

// Calculate body alignment score
export const calculateBodyAlignment = (landmarks) => {
  if (!landmarks || landmarks.length < 33) {
    return 0;
  }

  try {
    // Check shoulder alignment
    const shoulderDiff = Math.abs(landmarks[11].y - landmarks[12].y);
    
    // Check hip alignment
    const hipDiff = Math.abs(landmarks[23].y - landmarks[24].y);
    
    // Check if body is centered
    const centerX = (landmarks[11].x + landmarks[12].x + landmarks[23].x + landmarks[24].x) / 4;
    const centerOffset = Math.abs(centerX - 0.5);
    
    // Calculate alignment score (0-100)
    const shoulderScore = Math.max(0, 100 - shoulderDiff * 500);
    const hipScore = Math.max(0, 100 - hipDiff * 500);
    const centerScore = Math.max(0, 100 - centerOffset * 200);
    
    return (shoulderScore + hipScore + centerScore) / 3;
  } catch (error) {
    console.error("Error calculating body alignment:", error);
    return 0;
  }
};

// Made with Bob
