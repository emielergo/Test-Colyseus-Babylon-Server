import * as BABYLON from "babylonjs";
import { Axie, Bunker } from "./rooms/schema/RaiderRoomState";
import "@babylonjs/loaders/glTF";
import 'babylonjs-loaders'

export var getRotationVectorFromTarget = function (xnormal: BABYLON.Vector3, mesh: BABYLON.Mesh, target: Axie | Bunker) {
    let forward = target.mesh.position.subtract(mesh.position);
    let up = xnormal;
    let side = BABYLON.Vector3.Cross(forward, up);

    return BABYLON.Vector3.RotationFromAxis(forward, up, side);
}

export var createBunker = function createBunker(scene: BABYLON.Scene) {
    let bunker_mesh = BABYLON.MeshBuilder.CreateBox("bunker_mesh", { width: 2, height: 2, depth: 2 })
    let bunker_material = new BABYLON.StandardMaterial("bunker_material", scene);

    bunker_material.diffuseColor = BABYLON.Color3.Black();
    bunker_mesh.material = bunker_material;

    return new Bunker(bunker_mesh.id, 200, 30);
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
    let buba : BABYLON.AbstractMesh;
    await BABYLON.SceneLoader.ImportMeshAsync("", "/Meshes/", "buba.glb").then((result) => {
        buba = scene.getMeshByName("buba");
        result.meshes.forEach( mesh => mesh.isPickable = false)
    });
    // buba.position = new BABYLON.Vector3(0, 1, 180);
    // buba.actionManager = new BABYLON.ActionManager(scene);


    return buba;
}
