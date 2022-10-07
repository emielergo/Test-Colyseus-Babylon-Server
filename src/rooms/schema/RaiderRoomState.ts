import { MapSchema, ArraySchema, Schema, type } from "@colyseus/schema";

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

  constructor(id: string, hp: number, shield: number, range: number, damage: number, level: number, skin: string, x: number, y: number, z: number) {
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

  constructor(id: string, hp: number, range: number) {
    super();
    this.id = id;
    this.hp = hp;
    this.range = range;
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
    this.bunker = new Bunker('bunkerId' + this.number, 200, 5)
  }
}


export class RaiderRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}



