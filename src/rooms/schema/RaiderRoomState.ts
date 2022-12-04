import { MapSchema, ArraySchema, Schema, type } from "@colyseus/schema";
import * as BABYLON from 'babylonjs';
import { int } from "babylonjs";
import { GRIDIFIED_PLAYFIELD_DEPTH } from "../../utils";

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
  public grid_value_i: number;
  public grid_value_j: number;

  constructor(id: string, hp: number, shield: number, range: number, damage: number, level: number, skin: string, x: int, y: int, z: int) {
    super();
    this.id = id;
    this.hp = hp;
    this.maxHp = hp;
    this.shield = shield;
    this.maxShield = shield;
    this.range = range;
    // this.range = 50;
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

  isInGridPosition(): boolean {
    let in_position = false;

    if (Math.abs(((this.mesh.position.z + 145) / 5) - this.grid_value_i) < 0.2) {
      in_position = true;
    }

    return in_position;
  }

  isNextTileOpen(play_field_grid: Axie[][]) {
    const next_tile_index = this.grid_value_i + Math.pow(-1, this.player_number);
    let next_tile_open = false;

    if (next_tile_index >= 0 && next_tile_index <= GRIDIFIED_PLAYFIELD_DEPTH) {
      if (!play_field_grid[next_tile_index][this.grid_value_j])
        next_tile_open = true;
    }

    return next_tile_open;
  }

  moveToNextTile(play_field_grid: Axie[][]) {
    const next_tile_index = this.grid_value_i + Math.pow(-1, this.player_number);

    if (next_tile_index >= 0 && next_tile_index <= GRIDIFIED_PLAYFIELD_DEPTH) {
      play_field_grid[this.grid_value_i][this.grid_value_j] = null;
      play_field_grid[next_tile_index][this.grid_value_j] = this;
      this.grid_value_i = next_tile_index;
    }
  }

  isInViewingRangeOfTarget(potential_target: Axie | Bunker): boolean {
    return this.mesh.position.subtract(potential_target.mesh.position).length() < Axie.AXIE_VIEW_RANGE;
  }

  locateTarget(play_field_grid: Axie[][]) {
    let direction_indicator = 1;
    const rows_in_range = [];

    if (this.player_number == 2) {
      direction_indicator = -1;
    }

    if (this.range == 0) {
      rows_in_range.push(this.grid_value_i + direction_indicator);
    } else {
      for (let row_in_range = 0; this.grid_value_i <= this.range; this.grid_value_i++) {
        rows_in_range.push(this.grid_value_i + direction_indicator * row_in_range);
      }
    }

    let target;
    rows_in_range.forEach(target_row_index => {
      const target_row = play_field_grid[target_row_index];

      if (target_row) {
        target = target_row[this.grid_value_j];

        if (!target) {
          target = target_row[this.grid_value_j - 1];
        }

        if (!target) {
          target = target_row[this.grid_value_j + 1]
        }
      }
    })

    if (target) {
      this.target = target;
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

  public static BUNKER_VIEW_RANGE = 100;

  public player_number: int;
  public reload_time: number = 25;
  public mesh: BABYLON.Mesh;
  public target: Axie;
  public attacking_axies: Axie[] = [];
  public incoming_bullets: Bullet[] = [];

  constructor(id: string, player_number: number, hp: number, range: number, mesh: BABYLON.Mesh) {
    super();
    this.id = id + player_number;
    this.player_number = player_number;
    this.hp = hp;
    this.range = range;
    this.mesh = mesh;
    this.damage = 100;
  }

  inflictDamage(damage: int): void {
    this.hp -= damage;
  }

  disposeIncomingBullets(): void {
    this.incoming_bullets.forEach((bullet) => {
      bullet.mesh.dispose();
    })
  }

  shootBullet(bullet_mesh: BABYLON.Mesh, target: Axie): Bullet {
    let bullet = new Bullet('bullet', this.damage, Bullet.BULLET_SPEED, bullet_mesh.clone(), target);
    bullet.mesh.position = this.mesh.position.clone();

    bullet.x = this.mesh.position.x;
    bullet.y = this.mesh.position.y;
    bullet.z = this.mesh.position.z;

    return bullet;
  }

  locateTarget(enemy_axies_by_id: Map<String, Axie>): Axie {
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
                closest_axie = value;
                closest_axie_distance = iteration_distance;
              }
            }
          }
        });

        this.target = closest_axie;
      }
    }

    return this.target;
  }

  isInViewingRangeOfTarget(potential_target: Axie): boolean {
    return this.mesh.position.subtract(potential_target.mesh.position).length() < Bunker.BUNKER_VIEW_RANGE;
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



