function updateUserProfile(profile, feedback) {
  const total = profile.totalSessions + 1;

  return {
    ...profile,
    totalSessions: total,
    avg_completion:
      (profile.avg_completion * profile.totalSessions +
        feedback.completionRatio) / total,

    avg_rating:
      (profile.avg_rating * profile.totalSessions +
        (feedback.rating || 0)) / total,
  };
}

module.exports = { updateUserProfile };
