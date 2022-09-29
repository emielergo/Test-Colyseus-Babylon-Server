import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";
import cors from "cors";

import { MyRoom } from "./rooms/MyRoom";


export default Arena({
    getId: () => "BabylonJS and Colyseus Demo Server",

    initializeGameServer: (gameServer) => {
        gameServer.define('my_room', MyRoom);
    },

    initializeExpress: (app) => {
        app.get("/", (req, res) => {
            res.send("Server ready!");
        });
        app.use(cors({ origin: 'http://localhost:8080', credentials: false }));
        app.use("/colyseus", monitor());
    },

    beforeListen: () => {
    }
});
