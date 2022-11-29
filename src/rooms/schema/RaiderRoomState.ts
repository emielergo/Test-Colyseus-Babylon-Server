import { MapSchema, ArraySchema, Schema, type } from "@colyseus/schema";
import * as BABYLON from 'babylonjs';
import { int } from "babylonjs";

export class Axie extends Schema {
  @type("string") id: string;
  @type("string") skin: string;
  @type("number") hp: number;
  @type("number") maxHp: number;
  @type("number") shield: number;
  @type("number") maxShield: number;
  @type("number") range: number;
  @type("number") damage: number;
  @type("number") level: number;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
  // @type("Mesh") mesh: Mesh;
  // @type("Target") target: Target;
  public static PLAYER_ONE_OFFSET = 25;
  public static AXIE_VIEW_RANGE = 20;

  public target: (Axie | Bunker);
  public mesh: BABYLON.Mesh;

  public attacking_axies: Axie[] = [];
  public incoming_bullets: Bullet[] = [];

  public player_number: int;
  public reload_time = 10;

  constructor(id: string, hp: number, shield: number, range: number, damage: number, level: number, skin: string, x: int, y: int, z: int) {
    super();
    this.id = id;
    this.hp = hp;
    this.maxHp = hp;
    this.shield = shield;
    this.maxShield = shield;
    this.range = range;
    this.damage = damage;
    this.level = level;
    this.skin = skin;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  setMesh(mesh: BABYLON.Mesh): void {
    this.mesh = mesh.clone();
  }

  setPositionFromStartingPosition(): void {
    if (this.x && this.y && this.z && this.mesh) {
      this.mesh.position = new BABYLON.Vector3(this.x, this.y, this.z);
    }
  }

  offsetPositionForSpawn(isPlayer1: Boolean): void {
    if (this.mesh) {
      if (isPlayer1) {
        this.mesh.position.z = this.mesh.position.z - Axie.PLAYER_ONE_OFFSET;
      } else {
        this.mesh.position.z = this.mesh.position.z + Axie.PLAYER_ONE_OFFSET;
      }
    }
  }

  isInRangeOfTarget(): boolean {
    if (this.range == 0) {
      // TODO: Intersect does not seem to be working on server?
      // return this.target ? this.mesh.intersectsMesh(this.target.mesh) : false;
      return this.target ? BABYLON.Vector3.Distance(this.mesh.position, this.target.mesh.position) <= 0.5 : false;
    } else {
      return this.target && this.mesh ? this.mesh.position.subtract(this.target.mesh.position).length() < this.range ? true : false : false;
    }
  }

  isInViewingRangeOfTarget(potential_target: Axie | Bunker): boolean {
    return this.mesh.position.subtract(potential_target.mesh.position).length() < Axie.AXIE_VIEW_RANGE;
  }

  locateTarget(enemy_axies_by_id: Map<String, Axie>, enemy_bunker: Bunker) {
    // TODO: When a target is found within range -> Break. Any Target within range will do fine!
    if (!this.target || (this.target && !this.isInViewingRangeOfTarget(this.target))) {

      if (enemy_axies_by_id && enemy_axies_by_id.size > 0) {
        let closest_axie: Axie;
        let closest_axie_distance: number
        enemy_axies_by_id.forEach((value, key) => {
          if (this.isInViewingRangeOfTarget(value)) {
            if (!closest_axie) {
              closest_axie = value;
              closest_axie_distance = this.mesh.position.subtract(closest_axie.mesh.position).length();
            } else {
              let iteration_distance = this.mesh.position.subtract(value.mesh.position).length();
              if (iteration_distance < closest_axie_distance) {
                if (Math.random() < 0.9) {
                  closest_axie = value;
                  closest_axie_distance = iteration_distance;
                }
              }
            }
          }
        });

        this.target = closest_axie;
      }

      if (!this.target) {
        this.target = enemy_bunker;
      }
    }
  }

  useCards(bullet: BABYLON.Mesh): Bullet {
    let bullet_clone;
    if (this.damage) {
      if (this.range == 0) {
        this.target.inflictDamage(this.damage);
      } else {
        let bullet_mesh_clone = bullet.clone();
        bullet_mesh_clone.position = this.mesh.position.clone();
        bullet_clone = new Bullet(bullet.id, this.damage, Bullet.BULLET_SPEED, bullet_mesh_clone, this.target);
      }
      this.target.attacking_axies.push(this);
    }
    // if (this.heal) {
    //   this.hp = Math.min(this.maxHp, this.hp + this.heal);
    // }
    // if (this.shielding) {
    //   this.shield = Math.min(this.maxHp, this.hp + this.shielding);
    // }
    this.reload_time = 10;

    return bullet_clone;
  }

  inflictDamage(damage: int): void {
    if (this.shield) {
      if (this.shield - damage <= 0) {
        this.hp -= (this.damage - this.shield)
        this.shield = 0;
      } else {
        this.shield -= this.damage;
      }
    } else {
      this.hp -= damage;
    }
  }

  dispose(): void {
    this.attacking_axies.forEach(axie => {
      axie.target = null;
    });
    this.disposeIncomingBullets();
    this.mesh.dispose();
  }

  disposeIncomingBullets(): void {
    this.incoming_bullets.forEach((bullet) => {

        bullet.mesh.dispose();
    })
}
}

export class Bunker extends Schema {
  @type("string") id: string;
  @type("string") skin: string;
  @type("number") hp: number;
  @type("number") range: number;
  @type("number") damage: number;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;

  public player_number: int;
  public mesh: BABYLON.Mesh;
  public attacking_axies: Axie[] = [];
  public incoming_bullets: Bullet[] = [];

  constructor(id: string, player_number: number, hp: number, range: number, mesh: BABYLON.Mesh) {
    super();
    this.id = id + player_number;
    this.player_number = player_number;
    this.hp = hp;
    this.range = range;
    this.mesh = mesh;
  }

  inflictDamage(damage: int): void {
    this.hp -= damage;
  }

  disposeIncomingBullets(): void {
    this.incoming_bullets.forEach((bullet) => {
        bullet.mesh.dispose();
    })
}
}
export class Bullet extends Schema {
  @type("string") id: string;
  @type("number") damage: number;
  @type("number") speed: number;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;

  public static BULLET_SPEED = -0.5;
  public static BULLET_COUNTER = 1;

  public target: Axie | Bunker;
  public mesh: BABYLON.Mesh;

  constructor(id: string, damage: number, speed: number, mesh: BABYLON.Mesh, target: Axie | Bunker) {
    super();
    this.id = id + Bullet.BULLET_COUNTER;
    this.damage = damage;
    this.speed = speed;
    this.mesh = mesh;
    this.target = target;
    target.incoming_bullets.push(this);
    this.x = this.mesh.position.x;
    this.y = this.mesh.position.y;
    this.z = this.mesh.position.z;

    Bullet.BULLET_COUNTER++;
  }

  clone_bullet(): Bullet {
    return new Bullet(this.id, this.damage, this.speed, this.mesh.clone(), this.target);
  }

  intersectsWithTarget(): boolean {
    return this.target ? this.mesh.intersectsMesh(this.target.mesh) : false;
  }

  dispose() {
    this.mesh.dispose();
  }

}

export class Player extends Schema {
  @type("number") number: number;
  @type("number") energy: number;
  @type("number") energy_multiplier: number = 1;
  @type("number") energy_delay: number = 0;
  @type("number") clone_timer: number = 0;
  @type({ map: Axie }) axies = new MapSchema<Axie>();
  @type(Bunker) bunker: Bunker;

  constructor(counter: number, energy: number) {
    super();
    this.number = counter;
    this.energy = energy;
  }
}


export class RaiderRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
}



