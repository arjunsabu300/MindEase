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

export const calculatePoseScore = (userAngles, referenceAngles) => {
  let total = 0;
  let count = 0;

  Object.keys(referenceAngles).forEach((key) => {
    const diff = Math.abs(userAngles[key] - referenceAngles[key]);
    const score = Math.max(0, 100 - diff);
    total += score;
    count++;
  });

  return count > 0 ? total / count : 0;
};