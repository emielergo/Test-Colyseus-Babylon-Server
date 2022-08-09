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

}

export class Bunker extends Schema {
  @type("string") id: string;
  // @type("string") skin: string;
  @type("number") hp: number;
  @type("number") range: number;
  @type("number") x: number;
  @type("number") y: number;
  @type("number") z: number;
}
export class Player extends Schema {
  @type({ map: Axie }) axies = new MapSchema<Axie>();
  @type(Bunker) bunker = new Bunker();
}


export class RaiderRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}



