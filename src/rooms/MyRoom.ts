import { Room, Client } from "@colyseus/core";
import { Axie, Player, RaiderRoomState } from "./schema/RaiderRoomState";

export class MyRoom extends Room<RaiderRoomState> {
    maxClients = 2;

    onCreate(options: any) {
        console.log("MyRoom created.");
        this.setState(new RaiderRoomState());

        this.onMessage("updateAxie", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            const axie = player.axies.get(data["id"]);
            axie.x = data["x"];
            axie.y = data['y'];
            axie.z = data["z"];
        });

        this.onMessage("insertAxie", (client, data) => {
            // console.log("insert received -> ");
            // console.debug(JSON.stringify(data));
            const player = this.state.players.get(client.sessionId);
            const axie = new Axie();
            axie.id = data["id"];
            axie.skin = data["skin"];
            axie.x = data["x"];
            axie.y = data['y'];
            axie.z = data["z"];
            player.axies.set(axie.id, axie);
        });

        this.onMessage("removeAxie", (client, data) => {
            // console.log("remove received -> ");
            // console.debug(JSON.stringify(data));
            const player = this.state.players.get(client.sessionId);
            player.axies.delete(data["id"]);
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        // create Player instance
        const player = new Player();

        // place axie in the map of axies by its sessionId
        // (client.sessionId is unique per connection!)
        this.state.players.set(client.sessionId, player);

        console.log("new player =>", player.toJSON());
    }

    onLeave(client: Client, consented: boolean) {
        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
