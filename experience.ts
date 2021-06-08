import { ArcRotateCamera, Color3, Color4, Engine, Nullable, Scene, SceneLoader, StandardMaterial, Vector3, VideoTexture, WebXRSessionManager } from "@babylonjs/core";
import "@babylonjs/loaders";

//const DEBUG_PC = true;
const DEBUG_PC = false;

const renderCanvas = <HTMLCanvasElement> document.getElementById("renderCanvas");
renderCanvas.hidden = true;
const image = <HTMLImageElement> document.getElementById("image");

const engine = new Engine(renderCanvas);
const scene = new Scene(engine);

scene.createDefaultCamera(true);
scene.createDefaultLight(true);

// Switch between local and cloud file locations
const filePrefix = "https://allotropeijk.blob.core.windows.net/2021summerexhibit/";
// const filePrefix = "/resources/";
const floorMaterialName = "floor.001";
const roomMaterialName = "room.002";

let videoTexture: Nullable<VideoTexture> = null;

async function loadContentAsync(): Promise<void> {
    const meshData = await SceneLoader.ImportMeshAsync(null, filePrefix, "home.07.glb", scene);
    videoTexture = new VideoTexture("videoTexture", `${filePrefix}noise.04.mp4`, scene, false, true);
    const videoMaterial = new StandardMaterial("videoMaterial", scene);
    videoMaterial.diffuseTexture = videoTexture;
    videoMaterial.emissiveTexture = videoTexture;
    videoMaterial.backFaceCulling = false;
    meshData.meshes.forEach((mesh) => {
        if (!!mesh.material &&
            mesh.material.name == roomMaterialName)
        {
            // Apply video material to room meshes
            mesh.material = videoMaterial;
        }
        else if (!!mesh.material &&
            mesh.material.name == floorMaterialName)
        {
            // Convert plain floor plane to wireframe
            mesh.material.wireframe = true;
        }

        console.log(`Mesh Loaded: ${mesh.name}, num vertices: ${mesh.getTotalVertices()} num indices: ${mesh.getTotalIndices()}`);
    });
}

function onXRInit(): void {
    // Convert teleportation tool meshes to wire frames to match installation aesthetic
    scene.meshes.forEach((mesh) => {
        if (mesh.name == "teleportationTarget" ||
            mesh.name == "torusTeleportation" ||
            mesh.name == "rotationCone")
            if (!!mesh.material)
            {
                mesh.material.wireframe = true;
                (<StandardMaterial>mesh.material).diffuseColor = Color3.White();
            }
    });

    // Setup a transparent black clearColor/background
    scene.clearColor = new Color4(0, 0, 0, 0);
}

async function start(): Promise<void> {
    // Check if vr is supported. If not, exit experience
    const supported = await WebXRSessionManager.IsSessionSupportedAsync("immersive-vr")
    if (!supported && !DEBUG_PC)
    {
        image.src = `${filePrefix}23rdAndCherryFailure.png`;
        return;
    }

    // Load scene content before entering xr
    await loadContentAsync();

    // Setup floor meshes that will allow user to move around the scene
    const floorMeshes = scene.meshes.filter((mesh) => { return mesh.material?.name === floorMaterialName ?? false; });

    if (!supported)
    {
        const camera: ArcRotateCamera = new ArcRotateCamera("ArcCamera", Math.PI / 2, Math.PI / 2, 1, Vector3.Zero(), scene);
        scene.setActiveCameraByName("ArcCamera");
        scene.clearColor = new Color4(0, 0, 0);
        camera.attachControl(renderCanvas, true);
        image.onclick = async () => {
            image.hidden = true;
            renderCanvas.hidden = false;
            videoTexture?.video.play();
        };

        scene.meshes.forEach((mesh) => {
            mesh.position.y -= 0.4;
        });

        // Change the html image to state that the xr experience is ready to enter
        image.src = `${filePrefix}23rdAndCherryEnter.png`;
        return;
    }

    // Create the xr experience, declaring the floor meshes
    const xr = await scene.createDefaultXRExperienceAsync({ floorMeshes: floorMeshes });

    // Add an event callback for when the xr session is initialized
    xr.baseExperience.sessionManager.onXRSessionInit.add((session) => {
        onXRInit();
    });

    // Add event callback for button click to enter xr
    image.onclick = async () => {
        await xr.baseExperience.enterXRAsync("immersive-vr", "bounded-floor");
        image.hidden = true;
        renderCanvas.hidden = false;
        videoTexture?.video.play();
    };

    // Change the html image to state that the xr experience is ready to enter
    image.src = `${filePrefix}23rdAndCherryEnter.png`;
}

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});

start();