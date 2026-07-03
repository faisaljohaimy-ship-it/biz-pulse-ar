/**
 * FaceEngine — resolves brow/mouth/cheek channel values from Emotion.
 */
import type { Emotion } from "./avatar-state-manager";

export interface FaceChannel {
  browLift: number;   // -1..1
  mouthCurve: number; // -1..1 (positive = smile)
  eyeOpenness: number;// 0..1
  cheekLift: number;  // 0..1
  intensity: number;  // 0..1
}

class FaceEngine {
  channelFor(emotion: Emotion): FaceChannel {
    switch (emotion) {
      case "critical":  return { browLift: -0.35, mouthCurve: -0.15, eyeOpenness: 0.95, cheekLift: 0,    intensity: 1    };
      case "concerned": return { browLift: -0.20, mouthCurve: -0.05, eyeOpenness: 0.90, cheekLift: 0,    intensity: 0.75 };
      case "focused":   return { browLift: -0.05, mouthCurve: 0,     eyeOpenness: 0.85, cheekLift: 0,    intensity: 0.55 };
      case "executive": return { browLift: 0.05,  mouthCurve: 0.10,  eyeOpenness: 0.85, cheekLift: 0.1,  intensity: 0.6  };
      case "confident": return { browLift: 0.10,  mouthCurve: 0.20,  eyeOpenness: 0.85, cheekLift: 0.15, intensity: 0.6  };
      case "friendly":  return { browLift: 0.15,  mouthCurve: 0.35,  eyeOpenness: 0.90, cheekLift: 0.30, intensity: 0.7  };
      case "success":   return { browLift: 0.20,  mouthCurve: 0.55,  eyeOpenness: 0.85, cheekLift: 0.45, intensity: 0.8  };
      case "neutral":
      default:          return { browLift: 0,     mouthCurve: 0.10,  eyeOpenness: 0.85, cheekLift: 0.05, intensity: 0.4  };
    }
  }
}

export const faceEngine = new FaceEngine();
