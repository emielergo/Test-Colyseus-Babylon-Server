import * as BABYLON from "babylonjs";
import { Axie, Bunker } from "./rooms/schema/RaiderRoomState";
// import "@babylonjs/loaders/glTF";
import 'babylonjs-loaders'

const DROPZONE_WIDTH = 40;
const DROPZONE_DEPTH = 10;
export const GRIDIFIED_PLAYFIELD_DEPTH = 58;
export const GRIDIFIED_PLAYFIELD_WIDTH = 6;

export var getRotationVectorFromTarget = function (xnormal: BABYLON.Vector3, mesh: BABYLON.Mesh, target: Axie | Bunker) {
    let forward = target.mesh.position.subtract(mesh.position);
    let up = xnormal;
    let side = BABYLON.Vector3.Cross(forward, up);

    return BABYLON.Vector3.RotationFromAxis(forward, up, side);
}

export var createBunker = function createBunker(player_number: number) {
    let bunker_mesh = BABYLON.MeshBuilder.CreateBox("bunker_mesh", { width: 2, height: 2, depth: 2 });

    bunker_mesh.position = new BABYLON.Vector3(0, 1, -(2 * player_number - 3) * 147);

    return new Bunker(bunker_mesh.id, player_number, 200, 30, bunker_mesh);
}

export var createBulletMesh = function createBulletMesh(scene: BABYLON.Scene) {
    const bullet_mesh = BABYLON.MeshBuilder.CreateSphere("bullet_mesh", { diameter: 0.4 });
    bullet_mesh.position = new BABYLON.Vector3(0, 1, -47.8);

    const bullet_material = new BABYLON.StandardMaterial("bullet_material", scene);
    bullet_material.diffuseColor = BABYLON.Color3.White();
    bullet_mesh.material = bullet_material;

    return bullet_mesh;
}

export var createGenericAxieMesh = async function createGenericAxieMesh(scene: BABYLON.Scene) {
    // let buba : BABYLON.AbstractMesh;
    // await BABYLON.SceneLoader.ImportMeshAsync("", "/Meshes/", "buba.glb").then((result) => {
    //     buba = scene.getMeshByName("buba");
    //     result.meshes.forEach( mesh => mesh.isPickable = false)
    // });
    // // buba.position = new BABYLON.Vector3(0, 1, 180);
    // // buba.actionManager = new BABYLON.ActionManager(scene);
    const generic_axie = BABYLON.MeshBuilder.CreateSphere('generic_axie', { diameter: 1 })

    let axie_material = new BABYLON.StandardMaterial("axie_material", scene);

    axie_material.diffuseColor = BABYLON.Color3.Black();
    generic_axie.material = axie_material;


    // return buba;
    return generic_axie;
}

export var initDropzone = function initDropzone(): Axie[][] {
    const dropzone_array = [];
    for (let i = 0; i < DROPZONE_WIDTH; i++) {
        dropzone_array[i] = [];
    }

    return dropzone_array;
}

export var createPlayFieldGrid = function createPlayFieldGrid() : Axie[][]{
    const play_field_grid = [];
    for (let i = 0; i <= GRIDIFIED_PLAYFIELD_DEPTH; i++) {
        play_field_grid[i] = [];
    }

    return play_field_grid;
}


/* player 1 -- > x = -15 - +15
player 1 -- > z = 155 - 170  with offset z = 120 - 145
player 2 -- > x = -15 - +15
player 2 -- > z = -155 - -170 with offset z = -120 - -145 */
export var cloneToGrid = function cloneToGrid(cloned_axie: Axie, grid : Axie[][]): void {
    const x = cloned_axie.mesh.position.x;
    const z = cloned_axie.mesh.position.z;

    const i = (z + 145) / 5;
    const j = (x + 15) / 5;

    if (!grid[i][j]){
        grid[i][j] = cloned_axie;
    }
}
