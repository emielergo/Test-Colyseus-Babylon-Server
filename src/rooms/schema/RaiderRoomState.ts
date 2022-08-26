import { MapSchema, ArraySchema, Schema, type } from "@colyseus/schema";

export class Axie extends Schema {
  @type("string") id: string;
  @type("string") skin: string;
  @type("number") hp: number;
  @type("number") range: number;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
  // @type("Mesh") mesh: Mesh;
  // @type("Target") target: Target;

  constructor(id: string, skin: string, x: number, y: number, z: number) {
    super();
    this.id = id;
    this.skin = skin;
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export class Bunker extends Schema {
  @type("string") id: string;
  // @type("string") skin: string;
  @type("number") hp: number;
  @type("number") range: number;
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
  @type({ map: Axie }) axies = new MapSchema<Axie>();
  @type(Bunker) bunker: Bunker;

  constructor(counter: number) {
    super();
    this.number = counter;
  }
}


export class RaiderRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}



