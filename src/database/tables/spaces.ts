import { Cluster } from "cluster";
import { db } from "..";
import getFirst from "../../lib/getFirst";
import prepareStatement from "../../lib/prepareStatement";
import { nextID } from "../../lib/snowflakeID";
import { getConnectionCount } from "../../spaces/server";
import { doesClusterExist } from "./clusters";
import { getPublicUserFromID } from "./users";

export type SpaceVisibility = "discoverable" | "unlisted" | "secret";

export interface Space {
  id: string;
  creator_id?: string;
  cluster_id?: string;
  name: string;
  description: string;
  visibility: SpaceVisibility;
  allows_templating: boolean;
  download_count: number;
}

export async function createSpace(
  creatorOrClusterID: string,
  name: string,
  description: string,
  visibility: SpaceVisibility,
  allowsTemplating: boolean,
  type: "creator" | "cluster"
): Promise<string> {
  if (type == "cluster") {
    const clusterExists = await doesClusterExist(creatorOrClusterID);
    if (!clusterExists) {
      throw new Error("Cluster does not exist: " + creatorOrClusterID);
    }
  }

  const id = nextID();

  await db.query(
    `
    INSERT INTO "spaces" 
    (
      "id",
      "${type === "cluster" ? "cluster_id" : "creator_id"}",
      "name",
      "description",
      "visibility",
      "allows_templating"
    )
    VALUES
    (
      $1, $2, $3, $4, $5)`,
    [id, creatorOrClusterID, name, description, visibility, allowsTemplating]
  );

  return id.toString();
}

/**
 *
 * @param id The space
 * @return The ID of the cluster that has the space
 */
export async function getClusterThatHasSpaceWithID(
  id: string
): Promise<Cluster> {
  let result = await db.query<Cluster>(
    `SELECT "clusters".* FROM "spaces" INNER JOIN "clusters" ON "clusters"."id" = "spaces"."cluster_id" WHERE "id" = $1 LIMIT 1`,
    [id]
  );

  return getFirst(result.rows);
}

export async function getSpacesInCluster(clusterID: string): Promise<Space[]> {
  let results = await db.query<Space>(
    `SELECT * FROM "spaces" WHERE "cluster_id" = $1`,
    [clusterID]
  );

  return results.rows.map((space) => ({
    ...space,
    online_count: getConnectionCount(space.id),
  }));
}

export async function doesSpaceSessionExist(id: string) {
  let result = await db.query(
    `SELECT 1 FROM "spaces" WHERE "id" = $1 LIMIT 1`,
    [id]
  );

  return result.rowCount > 0;
}

export async function getSpaceSessionByID(id: string): Promise<Space> {
  let result = await db.query<Space>(
    `SELECT * FROM "spaces" WHERE "id" = $1 LIMIT 1`,
    [id]
  );

  return getFirst(result.rows);
}

export const setSpaceName = prepareStatement<
  void,
  { name: string; id: string }
>(`UPDATE "spaces" SET "name" = $1 WHERE "id" = $2`, {
  name: 1,
  id: 2,
});

export const deleteSpace = prepareStatement<void, { id: string }>(
  `DELETE FROM "spaces" WHERE "id" = $1`,
  { id: 1 }
);
