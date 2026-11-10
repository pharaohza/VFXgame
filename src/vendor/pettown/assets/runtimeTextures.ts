// Gallery adapter: use the original source textures without PetTown's KTX2 manifest.
import * as THREE from 'three';
const loader=new THREE.TextureLoader();
export async function loadRuntimeTexture(url:string, options:any={}) {
  const t=await loader.loadAsync(url);t.colorSpace=options.colorSpace??THREE.SRGBColorSpace;t.flipY=options.flipY??true;return t;
}
