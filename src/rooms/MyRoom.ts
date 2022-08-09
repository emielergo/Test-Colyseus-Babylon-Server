import { Room, Client } from "@colyseus/core";
import { Axie, AxieMap, MyRoomState } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {
    maxClients = 5;

    onCreate(options: any) {
        console.log("MyRoom created.");
        this.setState(new MyRoomState());

        this.onMessage("updateAxie", (client, data) => {
            const axieMap = this.state.axieMaps.get(client.sessionId);
            const axie = axieMap.axies.get(data["id"]);
            axie.x = data["x"];
            axie.y = data['y'];
            axie.z = data["z"];
        });

        this.onMessage("insertAxie", (client, data) => {
            // console.log("insert received -> ");
            // console.debug(JSON.stringify(data));
            const axieMap = this.state.axieMaps.get(client.sessionId);
            const axie = new Axie();
            axie.id = data["id"];
            axie.skin = data["skin"];
            axie.x = data["x"];
            axie.y = data['y'];
            axie.z = data["z"];
            axieMap.axies.set(axie.id, axie);
        });

        this.onMessage("removeAxie", (client, data) => {
            // console.log("remove received -> ");
            // console.debug(JSON.stringify(data));
            const axieMap = this.state.axieMaps.get(client.sessionId);
            axieMap.axies.delete(data["id"]);
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        // create Player instance
        const axieMap = new AxieMap();

        // place axie in the map of axies by its sessionId
        // (client.sessionId is unique per connection!)
        this.state.axieMaps.set(client.sessionId, axieMap);

        console.log("new player =>", axieMap.toJSON());
    }

    onLeave(client: Client, consented: boolean) {
        this.state.axieMaps.delete(client.sessionId);
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
