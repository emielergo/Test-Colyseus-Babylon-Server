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

export class AxieMap extends Schema {
  @type({ map: Axie }) axies = new MapSchema<Axie>();
}

export class Bunker extends Schema {
  @type("number") hp: number;
}

export class MyRoomState extends Schema {
  @type({ map: AxieMap }) axieMaps = new MapSchema<AxieMap>();
}


