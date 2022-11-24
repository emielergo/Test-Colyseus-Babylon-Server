import * as BABYLON from 'babylonjs';
import { Room, Client } from "@colyseus/core";
import { Axie, Bullet, Bunker, Player, RaiderRoomState } from "./schema/RaiderRoomState";
import { createBulletMesh, createGenericAxieMesh, getRotationVectorFromTarget } from "../utils";
import { int } from 'babylonjs';

export class MyRoom extends Room<RaiderRoomState> {
    maxClients = 2;
    private static counter = 0;

    //Game Constants
    private axie_speed = - 0.25;
    private reload_time = 0;
    private clone_timer = 0;
    private cloned_counter = 0;

    //Game Objects
    private axiesByAxieIdByPlayerNumber: Map<int, Map<String, Axie>> = new Map<int, Map<String, Axie>>();
    private dropzoneAxiesByPlayerNumber: Map<int, Axie[][]> = new Map<int, Axie[][]>();
    private play_field_axies: Axie[];
    private bullets: Bullet[];
    private bunkerByPlayerNumber: Map<int, Bunker>;

    // World
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private bullet: BABYLON.Mesh;
    private generic_axie_mesh: BABYLON.AbstractMesh;

    async onCreate(options: any) {
        console.log("MyRoom created.");
        this.setState(new RaiderRoomState());
        this.engine = new BABYLON.NullEngine();
        this.scene = new BABYLON.Scene(this.engine);
        this.generic_axie_mesh = await createGenericAxieMesh(this.scene);
        this.bullet = createBulletMesh(this.scene);
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
            axie.setMesh(this.generic_axie_mesh);
            axie.setPositionFromStartingPosition();

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

        this.onMessage("activatePowerPlant", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            player.energy = player.energy - data["energy_cost"];
            player.energy_multiplier++;
            player.energy_delay = 10;
        });
    }

    //TODO: hier moet de renderloop in komen!
    update(_deltaTime: number) {
        const remaining_bullets: Bullet[] = [];

        if (this.clone_timer % 5 == 0 && this.clients.length == 2) {
            this.clone_timer++;
            this.dropzoneAxiesByPlayerNumber.forEach((axie_grid, player_number) => {
                for (var i = 0; i < axie_grid.length; i++) {
                    var axies = axie_grid[i];
                    for (var j = 0; j < axies.length; j++) {
                        let axie = axies[j];
                        var clonedAxie = new Axie(axie.skin + player_number + this.cloned_counter, axie.hp, axie.shield, axie.range, axie.damage, axie.level, axie.skin, axie.starting_x, axie.starting_y, axie.starting_z);
                        this.cloned_counter++;
                        clonedAxie.offsetPositionForSpawn(player_number == 1);
                        clonedAxie.player_number = player_number;
                    }
                }
            })
        }

        // MOVE AND ATTACK WITH AXIES
        if (this.play_field_axies && this.play_field_axies.length > 0) {
            this.play_field_axies.forEach((axie) => {
                const enemy_player_number = (axie.player_number + 1) % 2;
                axie.locateTarget(this.axiesByAxieIdByPlayerNumber.get(enemy_player_number), this.bunkerByPlayerNumber.get(enemy_player_number));
                if (!axie.isInRangeOfTarget()) {
                    axie.mesh.rotation = getRotationVectorFromTarget(new BABYLON.Vector3(0, 1, 0), axie.mesh as BABYLON.Mesh, axie.target);
                    axie.mesh.movePOV(this.axie_speed, 0, 0);

                } else if (axie.reload_time <= 0) {
                    const bullet_clone = axie.useCards(this.bullet);
                    if (bullet_clone) {
                        this.bullets.push(bullet_clone);
                    }
                    if (axie.target.hp <= 0) {
                        var target = axie.target;
                        if (target instanceof Axie) {
                            this.play_field_axies.splice(this.play_field_axies.indexOf(target));
                            target.dispose();
                        }
                    }
                } else {
                    axie.reload_time--;
                }
            }
            )
            this.play_field_axies = this.play_field_axies.filter(axie => axie.hp > 0);
        }

        if (this.bunkerByPlayerNumber && this.bunkerByPlayerNumber.values()) {
            this.bunkerByPlayerNumber.forEach((bunker, player_number) => {

                //     // Bunker Shoots
                //     if (this.axiesByAxieIdByPlayerNumber.get(this.enemy_session_id).size > 0) {
                //         if (reload_time == 0) {
                //             let target = this.own_bunker.findClosestTarget(this.axiesByAxieIdByPlayerNumber.get(this.enemy_session_id).values());
                //             if (target) {
                //                 var bullet = new Bullet('bullet', this.own_bunker.damage, Bullet.BULLET_SPEED, 'bullet', this.bullet, target);
                //                 bullet.mesh.position = this.own_bunker.mesh.position.clone();
                //                 this.bullets.push(bullet);
                //                 reload_time = 25;
                //             }
                //         }
                //     }
                // }
            })
        }

        // Move Bullets
        if (this.bullets.length > 0) {
            this.bullets.forEach((bullet) => {
                // if (bullet.age > this.maxBulletAge)
                //     bullet.dispose();
                bullet.mesh.rotation = getRotationVectorFromTarget(new BABYLON.Vector3(0, 1, 0), bullet.mesh, bullet.target);
                bullet.mesh.movePOV(bullet.speed, 0, 0);
                if (bullet.mesh.intersectsMesh(bullet.target.mesh)) {
                    bullet.target.inflictDamage(bullet.damage);
                    if (bullet.target.hp <= 0) {
                        var target = bullet.target;
                        if (target instanceof Axie) {
                            this.play_field_axies.splice(this.play_field_axies.indexOf(target));
                            target.dispose();
                        }
                    }
                    bullet.dispose();
                } else {
                    // bullet.age++;
                    remaining_bullets.push(bullet);
                }
            })
        }

        this.bullets = remaining_bullets;

        if (this.reload_time > 0) {
            this.reload_time--;
        }
    }

    //TODO:
    // onAuth(){

    // }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        // create Player instance
        const player = new Player(MyRoom.counter % 2 + 1, 40);
        this.clock.setInterval(() => {
            if (this.clients.length == 2) {
                if (player.energy_delay <= 0) {
                    player.energy += player.energy_multiplier;
                } else {
                    player.energy_delay--;
                }
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
