// Pose templates with reference angles for validation
const poseTemplates = {
  balasana: {
    name: "Child's Pose",
    keyAngles: {
      leftKnee: { angle: 45, tolerance: 15 },
      rightKnee: { angle: 45, tolerance: 15 },
      leftHip: { angle: 50, tolerance: 20 },
      rightHip: { angle: 50, tolerance: 20 },
      spine: { angle: 30, tolerance: 15 }
    },
    keyPoints: {
      forehead: "should be close to ground",
      knees: "should be bent and close together",
      arms: "extended forward or alongside body"
    },
    instructions: [
      "Kneel on the mat with knees hip-width apart",
      "Sit back on your heels",
      "Fold forward, extending arms in front",
      "Rest forehead on the mat",
      "Breathe deeply and relax"
    ]
  },

  sukhasana: {
    name: "Easy Pose",
    keyAngles: {
      leftKnee: { angle: 90, tolerance: 20 },
      rightKnee: { angle: 90, tolerance: 20 },
      spine: { angle: 180, tolerance: 10 },
      leftShoulder: { angle: 170, tolerance: 15 },
      rightShoulder: { angle: 170, tolerance: 15 }
    },
    keyPoints: {
      spine: "should be straight and upright",
      shoulders: "relaxed and down",
      legs: "crossed comfortably"
    },
    instructions: [
      "Sit cross-legged on the mat",
      "Keep your spine straight and tall",
      "Rest hands on knees or in lap",
      "Relax shoulders away from ears",
      "Breathe naturally and deeply"
    ]
  },

  vrikshasana: {
    name: "Tree Pose",
    keyAngles: {
      standingKnee: { angle: 180, tolerance: 5 },
      bentKnee: { angle: 90, tolerance: 15 },
      leftHip: { angle: 170, tolerance: 10 },
      rightHip: { angle: 90, tolerance: 15 },
      spine: { angle: 180, tolerance: 5 }
    },
    keyPoints: {
      balance: "weight on standing leg",
      foot: "placed on inner thigh or calf",
      hips: "level and facing forward",
      arms: "overhead or at heart center"
    },
    instructions: [
      "Stand on one leg with weight centered",
      "Place other foot on inner thigh or calf",
      "Keep hips level and facing forward",
      "Bring hands to heart center or overhead",
      "Find a focal point to maintain balance"
    ]
  },

  tadasana: {
    name: "Mountain Pose",
    keyAngles: {
      leftKnee: { angle: 180, tolerance: 5 },
      rightKnee: { angle: 180, tolerance: 5 },
      leftElbow: { angle: 180, tolerance: 10 },
      rightElbow: { angle: 180, tolerance: 10 },
      spine: { angle: 180, tolerance: 5 }
    },
    keyPoints: {
      feet: "together or hip-width apart",
      weight: "evenly distributed",
      spine: "elongated and straight",
      shoulders: "relaxed and back"
    },
    instructions: [
      "Stand with feet together or hip-width apart",
      "Distribute weight evenly across both feet",
      "Engage thighs and lift kneecaps",
      "Lengthen spine and lift crown of head",
      "Relax shoulders down and back"
    ]
  },

  setu_bandha: {
    name: "Bridge Pose",
    keyAngles: {
      leftKnee: { angle: 90, tolerance: 15 },
      rightKnee: { angle: 90, tolerance: 15 },
      leftHip: { angle: 140, tolerance: 20 },
      rightHip: { angle: 140, tolerance: 20 },
      leftShoulder: { angle: 90, tolerance: 15 },
      rightShoulder: { angle: 90, tolerance: 15 }
    },
    keyPoints: {
      hips: "lifted high",
      knees: "over ankles",
      shoulders: "grounded",
      chest: "lifted toward chin"
    },
    instructions: [
      "Lie on back with knees bent",
      "Place feet close to sitting bones",
      "Press into feet and lift hips up",
      "Interlace fingers under back",
      "Keep knees aligned over ankles"
    ]
  },

  uttanasana: {
    name: "Standing Forward Bend",
    keyAngles: {
      leftKnee: { angle: 175, tolerance: 10 },
      rightKnee: { angle: 175, tolerance: 10 },
      leftHip: { angle: 45, tolerance: 20 },
      rightHip: { angle: 45, tolerance: 20 },
      spine: { angle: 45, tolerance: 15 }
    },
    keyPoints: {
      legs: "straight or slightly bent",
      spine: "lengthened",
      head: "relaxed and heavy",
      weight: "in balls of feet"
    },
    instructions: [
      "Stand in Mountain Pose",
      "Hinge at hips and fold forward",
      "Keep spine long as you fold",
      "Bend knees if needed",
      "Let head hang heavy"
    ]
  },

  pranayama: {
    name: "Breathing Exercise",
    keyAngles: {
      spine: { angle: 180, tolerance: 10 },
      leftShoulder: { angle: 170, tolerance: 15 },
      rightShoulder: { angle: 170, tolerance: 15 }
    },
    keyPoints: {
      posture: "seated comfortably with straight spine",
      breathing: "deep and controlled",
      focus: "on breath awareness"
    },
    instructions: [
      "Sit comfortably with spine straight",
      "Close eyes or soften gaze",
      "Breathe deeply through nose",
      "Inhale for 4 counts, hold for 4",
      "Exhale for 6 counts"
    ]
  },

  legs_up_wall: {
    name: "Legs Up the Wall",
    keyAngles: {
      leftHip: { angle: 90, tolerance: 15 },
      rightHip: { angle: 90, tolerance: 15 },
      leftKnee: { angle: 180, tolerance: 10 },
      rightKnee: { angle: 180, tolerance: 10 },
      spine: { angle: 180, tolerance: 10 }
    },
    keyPoints: {
      hips: "close to wall",
      legs: "straight up against wall",
      back: "flat on floor",
      arms: "relaxed at sides"
    },
    instructions: [
      "Sit sideways next to a wall",
      "Swing legs up the wall as you lie back",
      "Scoot hips close to wall",
      "Keep legs straight and relaxed",
      "Rest arms at sides, palms up"
    ]
  }
};

module.exports = { poseTemplates };

// Made with Bob
