import * as BABYLON from 'babylonjs';
import { Room, Client } from "@colyseus/core";
import { Axie, Bullet, Bunker, Player, RaiderRoomState } from "./schema/RaiderRoomState";
import { cloneToGrid, createBulletMesh, createBunker, createGenericAxieMesh, createPlayFieldGrid, getRotationVectorFromTarget, GRIDIFIED_PLAYFIELD_DEPTH, GRIDIFIED_PLAYFIELD_WIDTH, initDropzone } from "../utils";
import { int } from 'babylonjs';

export class MyRoom extends Room<RaiderRoomState> {
    maxClients = 2;
    private static counter = 0;

    //Game Constants
    private axie_speed = 0.5;
    private reload_time = 0;
    private clone_timer = 0;
    private cloned_counter = 0;

    //Game Objects
    private axiesByAxieIdByPlayerNumber: Map<int, Map<String, Axie>> = new Map<int, Map<String, Axie>>();
    private dropZoneAxiesByPlayerNumber: Map<int, Map<String, Axie>> = new Map<int, Map<String, Axie>>();
    private play_field_grid: Axie[][];
    private bullets: Bullet[] = [];
    private bunkerByPlayerNumber: Map<int, Bunker> = new Map<int, Bunker>();
    private playerIdByPlayerNumber: Map<int, string> = new Map<int, string>();

    // World
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private bullet: BABYLON.Mesh;
    private generic_axie_mesh: BABYLON.Mesh;

    async onCreate(options: any) {
        console.log("MyRoom created.");
        this.setState(new RaiderRoomState());
        this.engine = new BABYLON.NullEngine();

        this.scene = new BABYLON.Scene(this.engine);
        this.generic_axie_mesh = await createGenericAxieMesh(this.scene);
        this.bullet = createBulletMesh(this.scene);
        this.play_field_grid = createPlayFieldGrid();


        this.setSimulationInterval((deltaTime) => this.update(deltaTime));

        this.clock.start();
        this.clock.setInterval(() => this.broadcastPatch(), 5000);

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
            axie.player_number = player.number;
            axie.setMesh(this.generic_axie_mesh);
            axie.setPositionFromStartingPosition();
            // player.axies.set(axie.id, axie); // Niet doen om dubbels in client te voorkomen.
            this.dropZoneAxiesByPlayerNumber.get(player.number).set(axie.id, axie);
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
        const targets_to_dispose: Axie[] = [];

        if (this.clone_timer % 250 == 0 && this.clients.length == 2) {
            this.state.players.forEach(player => {
                const cloned_axies: Axie[] = [];
                this.dropZoneAxiesByPlayerNumber.get(player.number).forEach((axie) => {
                    var cloned_axie = new Axie(axie.skin + player.number + this.cloned_counter, axie.hp, axie.shield, axie.range, axie.damage, axie.level, axie.skin, axie.x, axie.y, axie.z);
                    this.cloned_counter++;
                    cloned_axie.setMesh(axie.mesh);
                    // console.log(cloned_axie.mesh.position);
                    cloned_axie.offsetPositionForSpawn(player.number == 1);
                    // console.log(cloned_axie.mesh.position + ' afterOffset');
                    // console.log(axie.mesh.position + '  -  ' + cloned_axie.mesh.position);
                    if (player.number == 2) {
                        cloned_axie.mesh.rotation = BABYLON.Vector3.RotationFromAxis(new BABYLON.Vector3(-1, 0, 0), new BABYLON.Vector3(0, 1, 0), new BABYLON.Vector3(0, 0,-1));
                    }
                    cloned_axie.player_number = player.number;
                    cloned_axies.push(cloned_axie);
                    cloneToGrid(cloned_axie, this.play_field_grid);
                })
                cloned_axies.forEach(cloned_axie => {
                    player.axies.set(cloned_axie.id, cloned_axie);
                    this.axiesByAxieIdByPlayerNumber.get(player.number).set(cloned_axie.id, cloned_axie);
                });
            })
        }
        this.clone_timer++;

        // MOVE AND ATTACK WITH AXIES
        for (let i = 0; i < GRIDIFIED_PLAYFIELD_DEPTH; i++) {
            for (let j = 0; j <= GRIDIFIED_PLAYFIELD_WIDTH; j++) {
                const axie = this.play_field_grid[i][j];
                if (axie) {
                    if (axie.isInGridPosition(i, j)) {
                        axie.locateTarget(this.play_field_grid, i, j);

                        if (axie.target && axie.reload_time <= 0) {
                            axie.mesh.rotation = getRotationVectorFromTarget(new BABYLON.Vector3(0, 1, 0), axie.mesh as BABYLON.Mesh, axie.target);
                            // const bullet_clone = axie.useCards(this.bullet);
                            // if (bullet_clone) {
                            //     this.bullets.push(bullet_clone);
                            //     this.state.bullets.set(bullet_clone.id, bullet_clone);
                            // }
                            // if (axie.target.hp <= 0) {
                            //     var target = axie.target;
                            //     if (target instanceof Axie) {
                            //         targets_to_dispose.push (target);
                            //     }
                            // }
                            axie.reload_time = 50;
                        } else if (!axie.target) {
                            if (axie.isNextTileOpen(this.play_field_grid, i, j)) {
                                axie.moveToNextTile(this.play_field_grid, i, j);
                                // console.log(Math.pow(-1, axie.player_number) * this.axie_speed);
                                // axie.mesh.movePOV(0, 0, Math.pow(-1, axie.player_number) * this.axie_speed);
                                axie.mesh.movePOV(0, 0, -this.axie_speed);
                                axie.x = axie.mesh.position.x;
                                axie.y = axie.mesh.position.y;
                                axie.z = axie.mesh.position.z;
                            }

                        } else if (axie.reload_time <= 0) {

                        } else {
                            axie.reload_time--;
                        }
                    } else {
                        axie.mesh.movePOV(0, 0, this.axie_speed);
                        axie.x = axie.mesh.position.x;
                        axie.y = axie.mesh.position.y;
                        axie.z = axie.mesh.position.z;
                    }

                }
            }
        }



        if (this.bunkerByPlayerNumber && this.bunkerByPlayerNumber.values()) {
            this.bunkerByPlayerNumber.forEach((bunker, player_number) => {

                // Bunker Shoots
                const enemy_player_number = bunker.player_number == 1 ? 2 : 1;
                // if (this.axiesByAxieIdByPlayerNumber.get(enemy_player_number) && this.axiesByAxieIdByPlayerNumber.get(enemy_player_number).size > 0) {
                //     if (bunker.reload_time == 0) {
                //         let target = bunker.locateTarget(this.axiesByAxieIdByPlayerNumber.get(enemy_player_number));
                //         if (target) {
                //             var bullet = new Bullet('bullet', bunker.damage, Bullet.BULLET_SPEED, this.bullet.clone(), target);
                //             bullet.mesh.position = bunker.mesh.position.clone();
                //             this.bullets.push(bullet);
                //             this.state.bullets.set(bullet.id, bullet);
                //             bunker.reload_time = 25;
                //         }
                //     }else{
                //         bunker.reload_time --;
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
                bullet.x = bullet.mesh.position.x;
                bullet.y = bullet.mesh.position.y;
                bullet.z = bullet.mesh.position.z;
                // if (bullet.mesh.intersectsMesh(bullet.target.mesh)) { // Werkt analoog als bij Axies niet...
                if (BABYLON.Vector3.Distance(bullet.mesh.position, bullet.target.mesh.position) <= 0.5) {
                    bullet.target.inflictDamage(bullet.damage);
                    if (bullet.target.hp <= 0) {
                        var target = bullet.target;
                        if (target instanceof Axie) {
                            targets_to_dispose.push(target);
                        }
                    }
                    this.state.bullets.delete(bullet.id);
                    bullet.dispose();
                } else {
                    // bullet.age++;
                    remaining_bullets.push(bullet);
                }
            })
        }

        targets_to_dispose.forEach(target => {
            target.dispose();
            this.state.players.get(this.playerIdByPlayerNumber.get(target.player_number)).axies.delete(target.id);
            this.axiesByAxieIdByPlayerNumber.get(target.player_number).delete(target.id);
        })

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
        player.bunker = createBunker(player.number);
        this.axiesByAxieIdByPlayerNumber.set(player.number, new Map<String, Axie>());
        this.dropZoneAxiesByPlayerNumber.set(player.number, new Map<String, Axie>());
        this.bunkerByPlayerNumber.set(player.number, player.bunker);
        this.playerIdByPlayerNumber.set(player.number, client.sessionId);

        // (client.sessionId is unique per connection!)
        this.state.players.set(client.sessionId, player);

    }

    onLeave(client: Client, consented: boolean) {
        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!");
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
}
