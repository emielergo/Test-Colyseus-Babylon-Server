import { Room, Client } from "@colyseus/core";
import { Axie, Bunker, Player, RaiderRoomState } from "./schema/RaiderRoomState";

export class MyRoom extends Room<RaiderRoomState> {
    maxClients = 2;
    private static counter = 0;

    onCreate(options: any) {
        console.log("MyRoom created.");
        this.setState(new RaiderRoomState());
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));

        this.clock.start();

        this.onMessage("updateAxie", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            let axie = player.axies.get(data["id"]);
            if (axie) {
                axie.x = data["x"];
                axie.y = data['y'];
                axie.z = data["z"];
            }
        });

        this.onMessage("updateAxieHp", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            let axie = player.axies.get(data["id"]);
            if (axie) {
                axie.hp = data["hp"];
            }
        });

        this.onMessage("insertAxie", (client, data) => {

            const player = this.state.players.get(client.sessionId);
            const axie = new Axie(data["id"], data["hp"], data["shield"], data["range"], data["damage"], data["level"], data["skin"], data["x"], data["y"], data["z"]);

            player.axies.set(axie.id, axie);

        });

        this.onMessage("removeAxie", (client, data) => {
            let player = this.state.players.get(data["sessionId"]);
            if (player) {
                player.axies.delete(data["id"]);

            }
        });

        this.onMessage("updateBunker", (client, data) => {
            const player = this.state.players.get(data["enemy_id"]);
            player.bunker.hp = data["hp"];
        });

        this.onMessage("updateEnergy", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            player.energy = player.energy - data["energy_cost"];
        });
    }

    //TODO: hier moet de renderloop in komen!
    update(_deltaTime: number) {
        // implement your physics or world updates here!
        // this is a good place to update the room state
    }

    //TODO:
    // onAuth(){

    // }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        // create Player instance
        const player = new Player(MyRoom.counter % 2 + 1, 20);
        this.clock.setInterval(() => {
            if (this.clients.length == 2) {
                player.energy++
                player.clone_timer++;
            }
        }, 1000);
        MyRoom.counter++;
        player.bunker = new Bunker('bunker ' + player.number, 200, 15);

        // place axie in the map of axies by its sessionId
        // (client.sessionId is unique per connection!)
        this.state.players.set(client.sessionId, player);

        // console.log("new player =>", player.toJSON());
    }

    onLeave(client: Client, consented: boolean) {
        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
