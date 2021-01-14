import * as cors from "cors";
import * as http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getSpaceServer } from "./spaces/server";
import { getSessionMiddleware } from "./session";
import { ParamsDictionary, Request } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { getUserFromId } from "./database/tables/users";

type ResBody = any;
type ReqBody = any;
type ReqQuery = ParsedQs;

export interface CustomSocket extends Socket {
  request: Request<ParamsDictionary, ResBody, ReqBody, ReqQuery>;
}

/**
 * Sets up the callbacks and returns a newly-created Socket.io instance
 * @param server The http server to bind to
 */
export const createIo = (server: http.Server) => {
  const io = new SocketIOServer(server);

  io.use((socket, next) => {
    // @ts-ignore
    getSessionMiddleware()(socket.request, {}, next);
  });

  io.on("connection", (socket: CustomSocket) => {
    socket.on("disconnect", () => {
      socket.broadcast.emit("peer_left");
    });

    socket.on("join_space", async (spaceId: number, displayName?: string) => {
      const spaceServer = await getSpaceServer(spaceId, io);
      if (spaceServer == null) {
        socket.emit("space_not_found");
      } else {
        if (socket.request.session.isLoggedIn) {
          let user = await getUserFromId(socket.request.session.accountId);
          displayName = user.name;
        }

        spaceServer.tryJoin(socket, displayName);
      }
    });
  });

  return io;
};
