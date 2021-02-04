import { SpaceSession } from "../database/tables/space_sessions";

export interface SpaceSession {
  /**
   * The underlying space
   */
  space: SpaceSession;

  /**
   * A unique ID for this SpaceSession
   */
  sessionId: string;

  /**
   * Describes how the space should be presented to the attendee
   */
  mode: "3d" | "2d" | "1d";

  /**
   * Whether participants can use spatial audio
   */
  useSpatialAudio: boolean;

  /**
   * A password that outside participants must use to join
   */
  password?: string;
}
